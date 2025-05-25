import os
from pathlib import Path

def check_image_label_consistency(dataset_path):
    images_path = Path(dataset_path) / 'images'
    labels_path = Path(dataset_path) / 'labels'

    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
    label_extensions = {'.txt'}

    image_files = [f for f in images_path.iterdir() if f.suffix.lower() in image_extensions]
    label_files = [f for f in labels_path.iterdir() if f.suffix.lower() in label_extensions]

    image_basenames = {f.stem for f in image_files}
    label_basenames = {f.stem for f in label_files}

    images_without_labels = image_basenames - label_basenames
    labels_without_images = label_basenames - image_basenames

    if images_without_labels:
        print("Images without corresponding labels:")
        for name in sorted(images_without_labels):
            print(f"  {name}")
    else:
        print("All images have corresponding labels.")

    if labels_without_images:
        print("\nLabels without corresponding images:")
        for name in sorted(labels_without_images):
            print(f"  {name}")
    else:
        print("All labels have corresponding images.")

if __name__ == "__main__":
    dataset_directory = 'dataset_0_100'  
    check_image_label_consistency(dataset_directory)

