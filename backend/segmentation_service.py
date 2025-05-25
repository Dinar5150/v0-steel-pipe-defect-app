import albumentations as A
import cv2
import numpy as np
import pandas as pd
from ultralytics import YOLO

# ──────────────────────────────────────────────────────────────────────────────
# 1. Custom preprocessing classes and transforms
# ──────────────────────────────────────────────────────────────────────────────


class HomomorphicFilter:
    """Enhances contrast by attenuating low-frequency and boosting high-frequency."""

    def __init__(self, a: float = 0.5, b: float = 1.5):
        self.a, self.b = float(a), float(b)

    def __butterworth_filter(self, shape, params):
        P, Q = shape[0] // 2, shape[1] // 2
        U, V = np.meshgrid(np.arange(shape[0]), np.arange(shape[1]), indexing="ij")
        D = (U - P) ** 2 + (V - Q) ** 2
        H = 1.0 / (1.0 + (D / (params[0] ** 2)) ** params[1])
        return 1.0 - H

    def __gaussian_filter(self, shape, params):
        P, Q = shape[0] // 2, shape[1] // 2
        U, V = np.meshgrid(np.arange(shape[0]), np.arange(shape[1]), indexing="ij")
        D = (U - P) ** 2 + (V - Q) ** 2
        H = np.exp(-D / (2 * (params[0] ** 2)))
        return 1.0 - H

    def __apply_filter(self, I_fft, H):
        Hs = np.fft.fftshift(H)
        return (self.a + self.b * Hs) * I_fft

    def filter(
        self, I: np.ndarray, filter_params, mode: str = "butterworth", H_ext=None
    ) -> np.ndarray:
        if I.ndim != 2:
            raise ValueError("Input must be single-channel")
        I_log = np.log1p(I.astype(float))
        I_fft = np.fft.fft2(I_log)
        if mode == "butterworth":
            H = self.__butterworth_filter(I_fft.shape, filter_params)
        elif mode == "gaussian":
            H = self.__gaussian_filter(I_fft.shape, filter_params)
        elif mode == "external" and H_ext is not None:
            H = H_ext
        else:
            raise ValueError(f"Unknown filter mode {mode}")
        I_filt = np.fft.ifft2(self.__apply_filter(I_fft, H))
        I_out = np.exp(np.real(I_filt)) - 1
        return np.uint8(np.clip(I_out, 0, 255))


def relief_transform(img: np.ndarray, bias: int = 128) -> np.ndarray:
    """Diagonal-difference relief filter to accentuate gradients."""
    if img.ndim != 2:
        raise ValueError("Expect grayscale image")
    h, w = img.shape
    out = np.zeros((h, w), dtype=np.int16)
    out[1:-1, 1:-1] = img[:-2, :-2].astype(int) - img[2:, 2:].astype(int) + bias
    out = np.clip(out, 0, 255).astype(np.uint8)
    out[0, :], out[-1, :], out[:, 0], out[:, -1] = (
        img[0, :],
        img[-1, :],
        img[:, 0],
        img[:, -1],
    )
    return out


class HECRTransform(A.ImageOnlyTransform):
    """BGR → [gray | homo+CLAHE | relief+CLAHE] for defect images."""

    def __init__(self, clip_limit: float = 5.0, bias: int = 128, p: float = 1.0):
        super().__init__(p=p)
        self.clip_limit = clip_limit
        self.bias = bias
        self.homo = HomomorphicFilter(a=0.75, b=1.25)

    def apply(self, img: np.ndarray, **kwargs) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        eroded = cv2.erode(img, np.ones((3, 3), np.uint8), iterations=1)
        h = self.homo.filter(eroded[:, :, 0], filter_params=[30, 2])
        clahe = cv2.createCLAHE(clipLimit=self.clip_limit)
        ch1 = clahe.apply(h)
        rel = relief_transform(gray, self.bias)
        ch2 = clahe.apply(rel)
        return np.stack([gray, ch1, ch2], axis=2)


# ──────────────────────────────────────────────────────────────────────────────
# 2. Model & constants
# ──────────────────────────────────────────────────────────────────────────────
WEIGHTS = "last-4.pt"
IMG_SIZE = 1024
CONF_THR = 0.05
TILE = 1140
STRIDE = int(TILE * 0.8)
REGIONS = 30
CLASS_NAMES = {
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

# load model and transformer once
_model = YOLO(WEIGHTS)
_transform = A.Compose([HECRTransform(p=1.0)])


# ──────────────────────────────────────────────────────────────────────────────
# 3. Inference function
# ──────────────────────────────────────────────────────────────────────────────
def predict_masks_and_report(image_bytes: bytes):
    """
    Run segmentation on image bytes. Returns:
      - predictions_txt: str, each line "<class> x1 y1 x2 y2 ..."
      - report_csv: str, CSV text with columns [region,defect]
    """
    # Decode image from bytes
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes")
    H, W = img.shape[:2]
    region_w = W / REGIONS

    pred_lines = []
    region_rows = []

    # Sliding window (single row)
    y0, y1 = 0, TILE
    for x0 in range(0, W - TILE + 1, STRIDE):
        crop = img[y0:y1, x0 : x0 + TILE]
        proc = _transform(image=crop)["image"]
        res = _model.predict(
            proc, imgsz=IMG_SIZE, conf=CONF_THR, task="segment", verbose=False
        )[0]
        if res.masks is None:
            continue
        masks = res.masks.data.cpu().numpy()
        classes = res.boxes.cls.cpu().numpy().astype(int)

        for m, cls in zip(masks, classes):
            # upsample mask
            m_big = cv2.resize(m, (TILE, TILE), interpolation=cv2.INTER_NEAREST)
            # contours
            cnts, _ = cv2.findContours(
                m_big.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            if not cnts:
                continue
            cnt = max(cnts, key=cv2.contourArea).reshape(-1, 2)
            cnt[:, 0] += x0
            cnt[:, 1] += y0
            # format polygon
            poly = " ".join(f"{float(x):.2f} {float(y):.2f}" for x, y in cnt)
            pred_lines.append(f"{cls} {poly}")
            # region assignment
            regs = set((cnt[:, 0] // region_w).astype(int))
            for r in regs:
                defect = CLASS_NAMES.get(int(cls), str(cls))
                region_rows.append({"region": int(r), "defect": defect})

    # assemble outputs
    predictions_txt = "\n".join(pred_lines)
    # CSV report
    df = pd.DataFrame(region_rows)
    if not df.empty:
        agg = (
            df.groupby("region")["defect"]
            .apply(lambda s: ",".join(sorted(set(s))))
            .reset_index()
        )
        full = pd.DataFrame({"region": range(REGIONS)}).merge(agg, how="left")
    else:
        full = pd.DataFrame({"region": range(REGIONS), "defect": [None] * REGIONS})
    report_csv = full.to_csv(index=False)
    return predictions_txt, report_csv
