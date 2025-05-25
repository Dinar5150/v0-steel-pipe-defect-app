from PIL import Image
import os

def check_images_readable(images_dir):
    broken = []
    for img_name in os.listdir(images_dir):
        try:
            img_path = os.path.join(images_dir, img_name)
            with Image.open(img_path) as img:
                img.verify()
        except Exception:
            broken.append(img_name)
    return broken

broken_images = check_images_readable('dataset_0_100/images')
print(f"Broken images: {broken_images}")

