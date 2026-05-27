"""
Step 2: Fine-tune YOLOv8n on the VibeChef ingredient dataset.

Usage:
    python 02_train.py [--epochs N] [--batch N] [--device cpu|0|0,1]

The script starts from the official YOLOv8n COCO weights (downloaded
automatically by ultralytics on first run) and fine-tunes them on the
VibeChef 30-class food dataset.

Requirements:
    - dataset/ directory populated by 01_download_open_images.py
    - At least ~1 image per class (ideally 100+)
    - GPU: 4–8 GB VRAM recommended (NVIDIA). Runs on CPU too, much slower.

Typical training time:
    - 100 epochs on GPU (RTX 3060): ~30–60 min
    - 100 epochs on CPU only: 4–8 hours
"""

import argparse
import os
import sys
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    sys.exit("ultralytics not installed. Run: pip install ultralytics")


def parse_args():
    p = argparse.ArgumentParser(description="Fine-tune YOLOv8n for VibeChef ingredients")
    p.add_argument("--epochs",   type=int,   default=100,
                   help="Training epochs (default: 100). Use 50 for quick test.")
    p.add_argument("--batch",    type=int,   default=16,
                   help="Batch size (default: 16). Reduce to 8 if OOM on GPU.")
    p.add_argument("--device",   type=str,   default="",
                   help="Device: '' (auto), 'cpu', '0' (first GPU), '0,1' (multi-GPU).")
    p.add_argument("--imgsz",    type=int,   default=640,
                   help="Input image size (default: 640). Must match ONNX export size.")
    p.add_argument("--patience", type=int,   default=30,
                   help="Early-stop patience in epochs (default: 30).")
    p.add_argument("--resume",   action="store_true",
                   help="Resume interrupted training run.")
    return p.parse_args()


def validate_dataset():
    """Sanity-check the dataset before training starts."""
    dataset_yaml = Path(__file__).parent / "dataset.yaml"
    if not dataset_yaml.exists():
        sys.exit(f"ERROR: dataset.yaml not found at {dataset_yaml}")

    train_images = Path(__file__).parent / "dataset" / "images" / "train"
    val_images   = Path(__file__).parent / "dataset" / "images" / "val"

    if not train_images.exists():
        sys.exit(
            "ERROR: dataset/images/train/ not found.\n"
            "Run 01_download_open_images.py first."
        )

    n_train = len(list(train_images.glob("*")))
    n_val   = len(list(val_images.glob("*"))) if val_images.exists() else 0

    if n_train == 0:
        sys.exit("ERROR: No training images found in dataset/images/train/")

    if n_val == 0:
        print("WARNING: No validation images. Metrics won't be available during training.")

    print(f"Dataset OK — {n_train} train images, {n_val} val images")
    return str(dataset_yaml)


def main():
    args = parse_args()
    dataset_yaml = validate_dataset()

    # Start from pretrained YOLOv8n (COCO weights, downloaded automatically)
    model = YOLO("yolov8n.pt")

    print("=" * 60)
    print("VibeChef YOLO fine-tuning")
    print(f"  Base model  : yolov8n.pt (COCO pretrained)")
    print(f"  Dataset     : {dataset_yaml}")
    print(f"  Epochs      : {args.epochs}")
    print(f"  Batch size  : {args.batch}")
    print(f"  Image size  : {args.imgsz}")
    print(f"  Device      : {args.device or 'auto'}")
    print("=" * 60)

    results = model.train(
        data=dataset_yaml,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        patience=args.patience,
        resume=args.resume,

        # Optimizer
        optimizer="SGD",
        lr0=0.01,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3,
        warmup_momentum=0.8,

        # Loss weights (YOLOv8 defaults are good for fine-tuning)
        box=7.5,
        cls=0.5,
        dfl=1.5,

        # Augmentation — helpful when dataset is small
        hsv_h=0.015,     # hue shift
        hsv_s=0.7,       # saturation
        hsv_v=0.4,       # brightness
        degrees=10.0,    # rotation ±10°
        translate=0.1,
        scale=0.5,
        flipud=0.0,      # no vertical flip (food is usually right-side up)
        fliplr=0.5,
        mosaic=1.0,      # mosaic augmentation
        mixup=0.1,
        copy_paste=0.0,

        # Project settings
        project="runs/train",
        name="vibechef",
        exist_ok=True,
        pretrained=True,
        cache=True,      # cache images to RAM for faster training
        verbose=True,
        save=True,
        save_period=10,  # save checkpoint every 10 epochs
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    print("\n" + "=" * 60)
    print(f"Training complete!")
    print(f"  Best weights : {best_weights}")
    print(f"  mAP50        : {results.results_dict.get('metrics/mAP50(B)', 'n/a'):.3f}")
    print(f"  mAP50-95     : {results.results_dict.get('metrics/mAP50-95(B)', 'n/a'):.3f}")
    print("\nNext step: python 03_export_onnx.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
