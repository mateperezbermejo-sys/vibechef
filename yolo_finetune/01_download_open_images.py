"""
Step 1: Download labeled food images from Open Images v7 via FiftyOne.

Usage:
    python 01_download_open_images.py [--samples-per-class N] [--splits train val test]

Output:
    yolo_finetune/dataset/
        images/train/  val/  test/
        labels/train/  val/  test/
        (YOLO .txt label files with class_id cx cy w h per line)

Notes:
- First run downloads ~2–4 GB of images from Open Images CDN.
- Subsequent runs use fiftyone's local cache (~/.fiftyone/).
- Classes not in Open Images (flour, olive oil) are skipped and logged.
- Run script with --help for all options.
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

try:
    import fiftyone as fo
    import fiftyone.zoo as foz
except ImportError:
    sys.exit("fiftyone not installed. Run: pip install fiftyone")

# ─── VibeChef class list (index matches vibechef_classes.json) ────────────────
VIBECHEF_CLASSES = [
    "apple", "banana", "beef", "bread", "broccoli", "butter", "carrot",
    "cheese", "chicken", "corn", "cucumber", "egg", "flour", "garlic",
    "lemon", "lettuce", "milk", "mushroom", "olive oil", "onion", "orange",
    "pasta", "pepper", "potato", "rice", "salmon", "spinach", "tomato",
    "tuna", "zucchini",
]

# Open Images v7 class name → VibeChef ingredient name
# Check available OI classes: fo.zoo.get_zoo_dataset_info("open-images-v7").classes
OI_TO_VIBECHEF = {
    "Apple":          "apple",
    "Banana":         "banana",
    "Meat":           "beef",
    "Bread":          "bread",
    "Broccoli":       "broccoli",
    "Butter":         "butter",
    "Carrot":         "carrot",
    "Cheese":         "cheese",
    "Chicken":        "chicken",     # "Chicken" is a food class in OI
    "Corn":           "corn",
    "Cucumber":       "cucumber",
    "Egg (Food)":     "egg",
    "Garlic":         "garlic",
    "Lemon":          "lemon",
    "Lettuce":        "lettuce",
    "Milk":           "milk",
    "Mushroom":       "mushroom",
    "Onion":          "onion",
    "Orange":         "orange",
    "Pasta":          "pasta",
    "Bell pepper":    "pepper",
    "Potato":         "potato",
    "Rice":           "rice",
    "Salmon":         "salmon",
    "Spinach":        "spinach",
    "Tomato":         "tomato",
    "Tuna":           "tuna",
    "Zucchini":       "zucchini",
}

MISSING_FROM_OI = ["flour", "olive oil"]  # Need manual annotation


def parse_args():
    p = argparse.ArgumentParser(description="Download VibeChef training data from Open Images v7")
    p.add_argument("--samples-per-class", type=int, default=150,
                   help="Max images to download per ingredient class (default: 150)")
    p.add_argument("--splits", nargs="+", default=["train", "validation"],
                   choices=["train", "validation", "test"],
                   help="Open Images splits to download (default: train validation)")
    p.add_argument("--output-dir", default="./dataset",
                   help="Output directory for YOLO-format dataset")
    return p.parse_args()


def download_for_class(oi_class: str, vibechef_name: str, split: str,
                       max_samples: int, dataset_dir: str):
    """Download samples for a single OI class and return a fiftyone dataset."""
    ds_name = f"vc_{vibechef_name}_{split}"
    try:
        existing = fo.load_dataset(ds_name)
        print(f"  [cache] {ds_name} already downloaded ({len(existing)} samples)")
        return existing
    except fo.core.odm.database.DoesNotExistError:
        pass

    print(f"  Downloading '{oi_class}' → '{vibechef_name}' from split '{split}'...")
    try:
        ds = foz.load_zoo_dataset(
            "open-images-v7",
            split=split,
            label_types=["detections"],
            classes=[oi_class],
            max_samples=max_samples,
            seed=42,
            shuffle=True,
            dataset_name=ds_name,
        )
        return ds
    except Exception as e:
        print(f"  WARNING: Could not download '{oi_class}': {e}")
        return None


def remap_labels(dataset, oi_class: str, vibechef_name: str):
    """Rename OI detection labels to VibeChef names in-place, drop others."""
    for sample in dataset.iter_samples(progress=False):
        if sample.ground_truth is None:
            continue
        kept = []
        for det in sample.ground_truth.detections:
            if det.label == oi_class:
                det.label = vibechef_name
                kept.append(det)
            # else: discard detections for other classes in the same image
        sample.ground_truth.detections = kept
        sample.save()


def export_to_yolo(dataset, output_dir: str, split_name: str, classes: list):
    """Export a fiftyone dataset to YOLO v5 format."""
    images_dir = os.path.join(output_dir, "images", split_name)
    labels_dir = os.path.join(output_dir, "labels", split_name)
    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(labels_dir, exist_ok=True)

    dataset.export(
        dataset_type=fo.types.YOLOv5Dataset,
        export_dir=os.path.join(output_dir, "_tmp_export"),
        label_field="ground_truth",
        classes=classes,
        overwrite=True,
    )

    # Move images and labels from temp export to final location
    tmp_images = os.path.join(output_dir, "_tmp_export", "images", "val"
                              if split_name == "validation" else split_name)
    tmp_labels = os.path.join(output_dir, "_tmp_export", "labels", "val"
                              if split_name == "validation" else split_name)
    if not os.path.exists(tmp_images):
        tmp_images = os.path.join(output_dir, "_tmp_export", "images")
        tmp_labels = os.path.join(output_dir, "_tmp_export", "labels")

    if os.path.exists(tmp_images):
        for f in Path(tmp_images).iterdir():
            shutil.copy2(f, images_dir)
    if os.path.exists(tmp_labels):
        for f in Path(tmp_labels).iterdir():
            if f.suffix == ".txt":
                shutil.copy2(f, labels_dir)

    shutil.rmtree(os.path.join(output_dir, "_tmp_export"), ignore_errors=True)


def main():
    args = parse_args()
    output_dir = os.path.abspath(args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    oi_split_map = {"train": "train", "validation": "val", "test": "test"}

    print("=" * 60)
    print("VibeChef Open Images downloader")
    print(f"  Samples per class : {args.samples_per_class}")
    print(f"  Splits            : {args.splits}")
    print(f"  Output            : {output_dir}")
    print("=" * 60)

    if MISSING_FROM_OI:
        print(f"\n⚠️  Classes NOT in Open Images (manual annotation required):")
        for c in MISSING_FROM_OI:
            print(f"     - {c}")
        print()

    # Download + remap each class per split
    for split in args.splits:
        yolo_split = oi_split_map.get(split, split)
        print(f"\n── Split: {split} → YOLO '{yolo_split}' ──")

        all_datasets = []
        for oi_class, vibechef_name in OI_TO_VIBECHEF.items():
            ds = download_for_class(
                oi_class, vibechef_name, split,
                args.samples_per_class, output_dir,
            )
            if ds is None:
                continue
            remap_labels(ds, oi_class, vibechef_name)
            all_datasets.append(ds)

        if not all_datasets:
            print(f"  No data downloaded for split '{split}'.")
            continue

        # Merge all per-class datasets into one
        print(f"\n  Merging {len(all_datasets)} class datasets...")
        merged_name = f"vc_merged_{split}"
        try:
            fo.delete_dataset(merged_name)
        except Exception:
            pass
        merged = fo.Dataset(name=merged_name, persistent=True)
        for ds in all_datasets:
            merged.merge_samples(ds)

        print(f"  Total samples in '{split}': {len(merged)}")
        print(f"  Exporting to YOLO format → {output_dir}/{yolo_split}...")

        export_to_yolo(merged, output_dir, yolo_split, VIBECHEF_CLASSES)

    # Write class names file
    classes_path = os.path.join(output_dir, "classes.txt")
    with open(classes_path, "w") as f:
        f.write("\n".join(VIBECHEF_CLASSES))
    print(f"\nClasses written to {classes_path}")

    # Summary
    print("\n" + "=" * 60)
    print("Download complete. Dataset structure:")
    for split_name in ["train", "val", "test"]:
        img_dir = os.path.join(output_dir, "images", split_name)
        lbl_dir = os.path.join(output_dir, "labels", split_name)
        if os.path.exists(img_dir):
            n_img = len(list(Path(img_dir).glob("*")))
            n_lbl = len(list(Path(lbl_dir).glob("*.txt"))) if os.path.exists(lbl_dir) else 0
            print(f"  {split_name:10s}: {n_img:4d} images, {n_lbl:4d} labels")

    print("\nNext step: python 02_train.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
