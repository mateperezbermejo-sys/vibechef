"""
Step 4 (optional): Verify the exported ONNX model on a real food image.

Usage:
    python 04_verify_onnx.py [--image path/to/food.jpg] [--threshold 0.3]

Draws bounding boxes on the image and prints detected ingredients.
Useful to confirm the exported model works before deploying.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import numpy as np
    import onnxruntime as ort
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Missing deps. Run: pip install onnxruntime Pillow numpy")

SCRIPT_DIR    = Path(__file__).parent
ONNX_PATH     = SCRIPT_DIR.parent / "frontend" / "public" / "models" / "yolov8n-vibechef.onnx"
CLASSES_PATH  = SCRIPT_DIR / "vibechef_classes.json"
INPUT_SIZE    = 640


def parse_args():
    p = argparse.ArgumentParser(description="Verify VibeChef ONNX model on a test image")
    p.add_argument("--image",     default=str(SCRIPT_DIR.parent / "test_food.jpg"),
                   help="Path to test image")
    p.add_argument("--threshold", type=float, default=0.30,
                   help="Confidence threshold (default: 0.30)")
    p.add_argument("--output",    default="verify_output.jpg",
                   help="Output image path with bounding boxes")
    return p.parse_args()


def preprocess(img: Image.Image):
    img_resized = img.resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR)
    arr = np.array(img_resized, dtype=np.float32) / 255.0  # HWC → normalize
    arr = arr.transpose(2, 0, 1)  # HWC → CHW
    return arr[np.newaxis, ...]   # → [1, 3, H, W]


def postprocess(output, conf_threshold: float, classes: list, orig_w: int, orig_h: int):
    # output shape: [1, nc+4, 8400]
    N  = output.shape[2]
    nc = output.shape[1] - 4
    sx = orig_w / INPUT_SIZE
    sy = orig_h / INPUT_SIZE

    detections = []
    for i in range(N):
        cx, cy, w, h = output[0, :4, i]
        class_scores = output[0, 4:, i]
        best_class = int(np.argmax(class_scores))
        conf = float(class_scores[best_class])
        if conf < conf_threshold:
            continue
        x1 = (cx - w / 2) * sx
        y1 = (cy - h / 2) * sy
        x2 = (cx + w / 2) * sx
        y2 = (cy + h / 2) * sy
        detections.append({
            "box":        [x1, y1, x2, y2],
            "score":      conf,
            "class_id":   best_class,
            "ingredient": classes[best_class] if best_class < len(classes) else "?",
        })

    # Simple greedy NMS
    detections.sort(key=lambda d: d["score"], reverse=True)
    kept = []
    for det in detections:
        overlap = False
        for k in kept:
            if iou(det["box"], k["box"]) > 0.45:
                overlap = True
                break
        if not overlap:
            kept.append(det)
    return kept


def iou(a, b):
    ix1 = max(a[0], b[0]); iy1 = max(a[1], b[1])
    ix2 = min(a[2], b[2]); iy2 = min(a[3], b[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / max(1e-6, area_a + area_b - inter)


def main():
    args = parse_args()

    if not ONNX_PATH.exists():
        sys.exit(f"ERROR: {ONNX_PATH} not found. Run 03_export_onnx.py first.")

    with open(CLASSES_PATH) as f:
        class_map = json.load(f)
    classes = [class_map[str(i)] for i in range(len(class_map))]

    img_path = Path(args.image)
    if not img_path.exists():
        sys.exit(f"ERROR: Image not found: {img_path}")

    img = Image.open(img_path).convert("RGB")
    orig_w, orig_h = img.size

    print(f"Model   : {ONNX_PATH.name}")
    print(f"Image   : {img_path}  ({orig_w}×{orig_h})")
    print(f"Classes : {len(classes)}")

    sess = ort.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
    tensor = preprocess(img)
    output = sess.run(None, {sess.get_inputs()[0].name: tensor})[0]
    print(f"Output  : {output.shape}")

    dets = postprocess(output, args.threshold, classes, orig_w, orig_h)

    if not dets:
        print(f"\nNo detections above threshold {args.threshold:.2f}")
    else:
        print(f"\nDetections ({len(dets)}):")
        draw = ImageDraw.Draw(img)
        for d in dets:
            x1, y1, x2, y2 = [int(v) for v in d["box"]]
            label = f"{d['ingredient']} {d['score']:.0%}"
            draw.rectangle([x1, y1, x2, y2], outline="#2D7D46", width=3)
            draw.text((x1 + 4, y1 + 2), label, fill="#2D7D46")
            print(f"  {d['ingredient']:15s}  conf={d['score']:.2f}  box=[{x1},{y1},{x2},{y2}]")

        img.save(args.output)
        print(f"\nAnnotated image saved to: {args.output}")


if __name__ == "__main__":
    main()
