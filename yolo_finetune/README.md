# VibeChef — YOLO Fine-Tuning Pipeline

Fine-tune YOLOv8n on the 30 VibeChef ingredient classes and deploy the result
to the browser as a drop-in replacement for the generic COCO model.

---

## Why fine-tune?

The default `yolov8n.onnx` is trained on COCO (80 general classes). Only
~11 of those classes are food, and several cause errors — a raw steak is
detected as "cake", fillets are detected as "hot dog", etc.

After fine-tuning you get **direct recognition** of all 30 ingredient classes:
apple, banana, beef, bread, broccoli, butter, carrot, cheese, chicken, corn,
cucumber, egg, flour, garlic, lemon, lettuce, milk, mushroom, olive oil,
onion, orange, pasta, pepper, potato, rice, salmon, spinach, tomato, tuna,
zucchini.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.10+ | Tested on 3.10 and 3.11 |
| pip | ≥ 23 recommended |
| Disk space | ~5 GB for Open Images download cache |
| RAM | ≥ 8 GB (16 GB recommended for large batches) |
| GPU (optional) | NVIDIA GPU with ≥ 4 GB VRAM speeds up training 10–20× |

---

## Step 0 — Set up the Python environment

```bash
cd yolo_finetune/

# Create a virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Optional: GPU support (if you have CUDA 12.1)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## Step 1 — Download training data

Downloads labeled food images from **Open Images v7** (free, no account needed).

```bash
python 01_download_open_images.py
```

Options:
```
--samples-per-class N   Images per ingredient (default: 150, min recommended: 50)
--splits train val      OI splits to download (default: train validation)
--output-dir ./dataset  Where to write YOLO-format data
```

Example for a quick test run (fewer images, faster download):
```bash
python 01_download_open_images.py --samples-per-class 50
```

### Classes not in Open Images

Two classes have no Open Images coverage and need manual images:
- **flour** — photograph ~50 bags/bowls of flour
- **olive oil** — photograph ~50 bottles/pourings of olive oil

Place images in:
```
dataset/images/train/<filename>.jpg
dataset/labels/train/<filename>.txt   (YOLO format: class_id cx cy w h)
```

Class IDs: flour = 12, olive oil = 18

### Alternative: Roboflow Universe

If you prefer a curated dataset:
1. Create a free account at [roboflow.com](https://roboflow.com)
2. Search "food ingredients detection" in Roboflow Universe
3. Download in YOLOv8 format
4. Place images in `dataset/images/` and labels in `dataset/labels/`
5. Make sure the class IDs match `vibechef_classes.json`

---

## Step 2 — Train

```bash
python 02_train.py
```

Options:
```
--epochs 100     Training epochs (default: 100; try 50 for quick check)
--batch 16       Batch size (reduce to 8 if GPU runs out of memory)
--device ""      Auto-detect (or "cpu", "0" for GPU 0, "0,1" for multi-GPU)
--patience 30    Early stop if no improvement for N epochs
--resume         Resume an interrupted run
```

Training progress and metrics are logged to `runs/train/vibechef/`.
Best weights are saved at `runs/train/vibechef/weights/best.pt`.

### Expected results (with ~150 imgs/class)

| Metric | Expected range |
|---|---|
| mAP50 | 0.55 – 0.75 |
| mAP50-95 | 0.35 – 0.55 |
| Inference time | ~25 ms/frame on GPU |

Results improve significantly with more images per class (300–500 ideal).

---

## Step 3 — Export to ONNX and deploy

```bash
python 03_export_onnx.py
```

This script:
1. Converts `best.pt` → `best.onnx` (opset 12, FP32, static batch=1)
2. Copies `yolov8n-vibechef.onnx` → `frontend/public/models/`
3. Copies `vibechef-classes.json` → `frontend/public/models/`

After the export, **restart the Vite dev server**:
```bash
cd ../frontend && npm run dev
```

The Vision Agent auto-detects the new model and shows:
> ✅ Modelo VibeChef personalizado (30 ingredientes) — listo

---

## Step 4 — Verify (optional)

```bash
python 04_verify_onnx.py --image ../test_food.jpg
```

Draws bounding boxes on the image and prints detected ingredients.
Output saved to `verify_output.jpg`.

---

## File reference

| File | Purpose |
|---|---|
| `vibechef_classes.json` | Class index ↔ ingredient name map (used by JS frontend) |
| `dataset.yaml` | YOLOv8 dataset config (paths + class list) |
| `01_download_open_images.py` | Downloads Open Images v7 data |
| `02_train.py` | Fine-tune YOLOv8n |
| `03_export_onnx.py` | Export + deploy to frontend |
| `04_verify_onnx.py` | Smoke-test the exported model |

---

## Known limitations

| Class | Coverage | Notes |
|---|---|---|
| flour | ❌ | No OI class. Manual annotation required. |
| olive oil | ❌ | Visually ambiguous (clear liquid). Manual annotation required. |
| beef | ⚠️ | OI "Meat" class is broad — includes many cuts. Works for raw cuts. |
| tuna | ⚠️ | Limited OI samples. Canned tuna may need manual images. |
| butter | ⚠️ | Limited OI samples. |

These classes will have lower confidence in the fine-tuned model.
The user correction system in the app compensates for remaining errors.

---

## Upgrading the dataset over time

1. Collect more images (take photos yourself, use Roboflow, etc.)
2. Annotate with [LabelImg](https://github.com/heartexlabs/labelImg) or
   [Roboflow Annotate](https://roboflow.com/annotate) (free tier: 1000 images)
3. Run `02_train.py --resume` to continue from the last checkpoint
4. Re-export with `03_export_onnx.py`

---

## Troubleshooting

**`CUDA out of memory`** → reduce `--batch` (try 8 or 4)

**`fiftyone not installed`** → `pip install fiftyone`

**`No detections above threshold`** in verify → lower `--threshold 0.2`
or check that the ONNX output shape is `[1, 34, 8400]` (34 = 4 + 30 classes)

**Model not detected in browser** → confirm both files exist:
```
frontend/public/models/yolov8n-vibechef.onnx
frontend/public/models/vibechef-classes.json
```
