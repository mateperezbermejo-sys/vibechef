"""
Step 3: Export fine-tuned YOLOv8n weights to ONNX and deploy to the frontend.

Usage:
    python 03_export_onnx.py [--weights path/to/best.pt]

Actions:
  1. Exports best.pt → best.onnx using Ultralytics
  2. Copies the ONNX file to frontend/public/models/yolov8n-vibechef.onnx
  3. Copies vibechef_classes.json to frontend/public/models/vibechef-classes.json
  4. Runs a quick smoke test via onnxruntime to verify the output shape

After running this script:
  - Restart the frontend dev server
  - The Vision Agent will automatically detect and load the new model
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    sys.exit("ultralytics not installed. Run: pip install ultralytics")

try:
    import onnxruntime as ort
    import numpy as np
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False
    print("onnxruntime not installed — skipping smoke test. Run: pip install onnxruntime")

SCRIPT_DIR   = Path(__file__).parent
FRONTEND_MODELS_DIR = SCRIPT_DIR.parent / "frontend" / "public" / "models"
CLASSES_SRC  = SCRIPT_DIR / "vibechef_classes.json"


def parse_args():
    p = argparse.ArgumentParser(description="Export VibeChef YOLO weights to ONNX")
    p.add_argument("--weights", type=str, default="",
                   help="Path to .pt weights (default: latest runs/train/vibechef/weights/best.pt)")
    p.add_argument("--imgsz",   type=int, default=640,
                   help="Input image size, must match training size (default: 640)")
    p.add_argument("--no-copy", action="store_true",
                   help="Don't copy files to frontend/public/models/")
    return p.parse_args()


def find_best_weights() -> Path:
    candidates = sorted(
        (SCRIPT_DIR / "runs" / "train").glob("vibechef*/weights/best.pt"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        sys.exit(
            "ERROR: No trained weights found.\n"
            "Run 02_train.py first, or pass --weights path/to/best.pt"
        )
    best = candidates[0]
    print(f"Found weights: {best}")
    return best


def export_onnx(weights_path: Path, imgsz: int) -> Path:
    model = YOLO(str(weights_path))
    print(f"\nExporting to ONNX (opset 12, FP32, static batch=1, imgsz={imgsz})...")
    exported_path = model.export(
        format="onnx",
        imgsz=imgsz,
        simplify=True,        # run onnx-simplifier (reduces graph complexity)
        opset=12,             # opset 12 = max compatibility with onnxruntime-web 1.x
        half=False,           # FP32 — WASM backend doesn't support FP16
        dynamic=False,        # fixed batch=1 for onnxruntime-web
        nms=False,            # we handle NMS in JavaScript (for browser performance)
    )
    onnx_path = Path(str(exported_path))
    print(f"ONNX saved to: {onnx_path}")
    return onnx_path


def smoke_test(onnx_path: Path, imgsz: int, nc: int) -> bool:
    """Run a single forward pass to verify the ONNX output shape is correct."""
    if not ORT_AVAILABLE:
        return True
    print("\nRunning smoke test...")
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    dummy = np.zeros((1, 3, imgsz, imgsz), dtype=np.float32)
    outputs = sess.run(None, {sess.get_inputs()[0].name: dummy})
    shape = outputs[0].shape  # expected: (1, nc+4, 8400)
    expected_nc_row = nc + 4
    ok = shape[1] == expected_nc_row and shape[2] == 8400
    if ok:
        print(f"  Output shape: {shape} ✅  (expected [1, {expected_nc_row}, 8400])")
    else:
        print(f"  ⚠️  Unexpected shape: {shape} (expected [1, {expected_nc_row}, 8400])")
    return ok


def copy_to_frontend(onnx_path: Path, no_copy: bool):
    if no_copy:
        print("\n--no-copy flag set, skipping frontend deployment.")
        return

    os.makedirs(FRONTEND_MODELS_DIR, exist_ok=True)

    # ONNX model
    dest_onnx = FRONTEND_MODELS_DIR / "yolov8n-vibechef.onnx"
    shutil.copy2(onnx_path, dest_onnx)
    size_mb = dest_onnx.stat().st_size / 1_048_576
    print(f"\nCopied ONNX → {dest_onnx}  ({size_mb:.1f} MB)")

    # Classes JSON
    dest_classes = FRONTEND_MODELS_DIR / "vibechef-classes.json"
    shutil.copy2(CLASSES_SRC, dest_classes)
    print(f"Copied classes → {dest_classes}")


def main():
    args = parse_args()

    weights_path = Path(args.weights) if args.weights else find_best_weights()
    if not weights_path.exists():
        sys.exit(f"ERROR: Weights file not found: {weights_path}")

    # Load class count from vibechef_classes.json
    with open(CLASSES_SRC) as f:
        nc = len(json.load(f))

    onnx_path = export_onnx(weights_path, args.imgsz)
    ok = smoke_test(onnx_path, args.imgsz, nc)
    copy_to_frontend(onnx_path, args.no_copy)

    print("\n" + "=" * 60)
    if ok:
        print("Export complete ✅")
    else:
        print("Export finished with shape warning ⚠️  — check output above")
    print()
    print("To activate the new model in the browser:")
    print("  1. Ensure frontend/public/models/yolov8n-vibechef.onnx exists")
    print("  2. Ensure frontend/public/models/vibechef-classes.json exists")
    print("  3. Restart the Vite dev server (npm run dev in frontend/)")
    print("  4. The Vision Agent will auto-detect and load the VibeChef model")
    print("=" * 60)


if __name__ == "__main__":
    main()
