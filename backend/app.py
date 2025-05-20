from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
import os
import cv2
import numpy as np
import albumentations as A
from ultralytics import YOLO
import tempfile
import shutil
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import torch
from ultralytics.nn.tasks import SegmentationModel
from torch.nn.modules.container import Sequential
from ultralytics.nn.modules.conv import Conv
from torch.nn.modules.conv import Conv2d
from torch.nn.modules.batchnorm import BatchNorm2d
from torch.nn.modules.activation import SiLU, ReLU, LeakyReLU, Sigmoid
from torch.nn.modules.pooling import MaxPool2d, AdaptiveAvgPool2d, AvgPool2d
from torch.nn.modules.upsampling import Upsample
from torch.nn.modules.linear import Linear
from torch.nn.modules.dropout import Dropout
from torch.nn.modules.flatten import Flatten
from torch.nn.modules.normalization import LayerNorm, GroupNorm
from torch.nn.modules.padding import ZeroPad2d
from torch.nn.modules.conv import ConvTranspose2d
from ultralytics.nn.modules.block import C2f, C3, C3k2
import torch.nn as nn
import csv

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
WEIGHTS = "last-4.pt"
OUTPUT_DIR = "outputs"
IMG_SIZE = 1024
CONF_THRES = 0.05
TILE = 1140
STRIDE = int(TILE * 0.8)

# Маппинг номеров классов на названия дефектов
DEFECT_NAMES = {
    0: "пора",
    1: "включение",
    2: "подрез",
    3: "прожог",
    4: "трещина",
    5: "наплыв",
    6: "эталон1",
    7: "эталон2",
    8: "эталон3",
    9: "пора-скрытая",
    10: "утяжина",
    11: "несплавление",
    12: "непровар корня",
}

# Custom preprocessing classes
class HomomorphicFilter:
    """Enhances contrast by attenuating low-frequency and boosting high-frequency."""
    def __init__(self, a=0.5, b=1.5):
        self.a, self.b = float(a), float(b)
    def __butterworth_filter(self, shape, params):
        P, Q = shape[0]//2, shape[1]//2
        U, V = np.meshgrid(np.arange(shape[0]), np.arange(shape[1]), indexing='ij')
        D = (U-P)**2 + (V-Q)**2
        H = 1.0 / (1.0 + (D/(params[0]**2))**params[1])
        return 1.0 - H
    def __gaussian_filter(self, shape, params):
        P, Q = shape[0]//2, shape[1]//2
        U, V = np.meshgrid(np.arange(shape[0]), np.arange(shape[1]), indexing='ij')
        D = (U-P)**2 + (V-Q)**2
        H = np.exp(-D/(2*(params[0]**2)))
        return 1.0 - H
    def __apply_filter(self, I_fft, H):
        Hs = np.fft.fftshift(H)
        return (self.a + self.b*Hs) * I_fft
    def filter(self, I, filter_params, mode='butterworth', H_ext=None):
        if I.ndim != 2:
            raise ValueError("Input must be single-channel")
        I_log = np.log1p(I.astype(float))
        I_fft = np.fft.fft2(I_log)
        if mode == 'butterworth':
            H = self.__butterworth_filter(I_fft.shape, filter_params)
        elif mode == 'gaussian':
            H = self.__gaussian_filter(I_fft.shape, filter_params)
        elif mode == 'external' and H_ext is not None:
            H = H_ext
        else:
            raise ValueError(f"Unknown filter mode {mode}")
        I_filt = np.fft.ifft2(self.__apply_filter(I_fft, H))
        I_out = np.exp(np.real(I_filt)) - 1
        return np.uint8(np.clip(I_out, 0, 255))

def relief_transform(img: np.ndarray, bias: int = 128) -> np.ndarray:
    """Diagonal-difference relief filter to accentuate gradients."""
    if img.ndim != 2:
        raise ValueError("Expect grayscale")
    h, w = img.shape
    out = np.zeros((h, w), dtype=np.int16)
    out[1:-1,1:-1] = (
        img[:-2,:-2].astype(int)
        - img[2:,2:].astype(int)
        + bias
    )
    out = np.clip(out, 0, 255).astype(np.uint8)
    out[0,:], out[-1,:], out[:,0], out[:,-1] = img[0,:], img[-1,:], img[:,0], img[:,-1]
    return out

class HECRTransform(A.ImageOnlyTransform):
    """BGR → [gray | homo+CLAHE | relief+CLAHE] for weld-defect X-rays."""
    def __init__(self, clip_limit=5.0, bias=128, p=1.0):
        super().__init__(p=p)
        self.clip_limit = clip_limit
        self.bias = bias
        self.homo = HomomorphicFilter(a=0.75, b=1.25)
    def apply(self, img, **kwargs):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        eroded = cv2.erode(img, np.ones((3,3), np.uint8), iterations=1)
        h = self.homo.filter(eroded[:,:,0], filter_params=[30,2])
        clahe = cv2.createCLAHE(clipLimit=self.clip_limit)
        ch1 = clahe.apply(h)
        rel = relief_transform(gray, self.bias)
        ch2 = clahe.apply(rel)
        return np.stack([gray, ch1, ch2], axis=2)

def predict_large_image(image_path: str) -> str:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Load model
    model = YOLO(WEIGHTS)
    model.fuse()

    # Read the large image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image not found: {image_path}")
    h, w = img.shape[:2]

    transformer = A.Compose([HECRTransform(p=1.0)])
    all_preds = []
    y0 = 0
    y1 = y0 + TILE

    # Slide window horizontally (height matches TILE exactly)
    for x0 in range(0, w - TILE + 1, STRIDE):
        x1 = x0 + TILE
        crop = img[y0:y1, x0:x1]
        proc = transformer(image=crop)["image"]

        # Inference on crop
        results = model.predict(
            source=proc,
            imgsz=IMG_SIZE,
            conf=CONF_THRES,
            verbose=False
        )
        res = results[0]

        # Extract detections
        boxes = res.boxes.xyxy.cpu().numpy()    # (N,4)
        confs = res.boxes.conf.cpu().numpy()    # (N,)
        classes = res.boxes.cls.cpu().numpy().astype(int)  # (N,)

        # Offset boxes back to full-image coords
        for (xmin, ymin, xmax, ymax), conf, cls in zip(boxes, confs, classes):
            all_preds.append([
                xmin + x0,
                ymin + y0,
                xmax + x0,
                ymax + y0,
                conf,
                cls
            ])

    # Save all predictions
    pred_arr = np.array(all_preds)
    out_file = os.path.join(OUTPUT_DIR, "predictions.txt")
    np.savetxt(
        out_file,
        pred_arr,
        fmt=['%.2f','%.2f','%.2f','%.2f','%.4f','%d'],
        header='x1 y1 x2 y2 conf cls',
        comments=''
    )

    # --- Новый блок: создание CSV-отчёта ---
    csv_file = os.path.join(OUTPUT_DIR, "report.csv")
    with open(out_file, "r") as fin, open(csv_file, "w", newline="") as fout:
        reader = csv.DictReader(fin, delimiter=' ')
        writer = csv.writer(fout)
        writer.writerow(["тип деффекта", "x1", "y1", "x2", "y2"])
        for row in reader:
            defect_type = DEFECT_NAMES.get(int(row["cls"]), str(row["cls"]))
            x1, y1, x2, y2 = row["x1"], row["y1"], row["x2"], row["y2"]
            writer.writerow([defect_type, x1, y1, x2, y2])
    # --- Конец нового блока ---

    return out_file

@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    # Create a temporary file to store the uploaded image
    with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as temp_file:
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name

    try:
        # Process the image and get predictions
        predictions_file = predict_large_image(temp_path)
        
        # Return the predictions file
        return FileResponse(
            predictions_file,
            media_type='text/plain',
            filename='predictions.txt'
        )
    finally:
        # Clean up the temporary file
        os.unlink(temp_path)

@app.get("/")
def read_root():
    return {"message": "Steel Pipe Defect Detection API"}

# Монтируем папку static для отдачи файлов
app.mount("/static", StaticFiles(directory="static"), name="static")

# Эндпоинт для скачивания CSV-отчёта
@app.get("/download_report")
def download_report():
    csv_path = os.path.join(OUTPUT_DIR, "report.csv")
    # Проверяем существование файла перед отправкой
    if not os.path.exists(csv_path):
        # Если файл не существует, возвращаем 404
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"message": "Report not found. Please run a prediction first."})

    return FileResponse(csv_path, media_type='text/csv', filename='report.csv')


torch.serialization.add_safe_globals([
    SegmentationModel, Sequential, Conv, Conv2d, BatchNorm2d, SiLU,
    MaxPool2d, AdaptiveAvgPool2d, Upsample, Linear, Dropout, Flatten,
    ReLU, LeakyReLU, Sigmoid, LayerNorm, GroupNorm, ZeroPad2d, ConvTranspose2d, AvgPool2d, C2f, C3
])