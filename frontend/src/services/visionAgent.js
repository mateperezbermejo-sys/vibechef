// wasm-only import: avoids JSEP/WebGL/WebGPU backends that fail under Vite COEP
import * as ort from 'onnxruntime-web/wasm';

ort.env.wasm.wasmPaths = '/ort-wasm/';
ort.env.wasm.numThreads = 1;

const INPUT_SIZE = 640;

// Model file paths — VibeChef custom model is tried first; COCO is the fallback.
const VIBECHEF_MODEL_URL   = '/models/yolov8n-vibechef.onnx';
const VIBECHEF_CLASSES_URL = '/models/vibechef-classes.json';
const COCO_MODEL_URL       = '/models/yolov8n.onnx';

// Detection confidence tiers:
//   < CONF_LOW   → ignored entirely
//   CONF_LOW–CONF_HIGH → shown, flagged needsReview (user must confirm/correct)
//   ≥ CONF_HIGH  → auto-accepted (still correctable)
const CONF_LOW  = 0.30;
const CONF_HIGH = 0.60;
const IOU_THRESHOLD  = 0.45;
const MAX_CANDIDATES = 3;

// ── COCO fallback data ────────────────────────────────────────────────────────

const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train',
  'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign',
  'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag',
  'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
  'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl',
  'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog',
  'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
  'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
  'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

// COCO class → canonical VibeChef ingredient.  null = no useful food mapping.
const COCO_TO_INGREDIENT = {
  'banana': 'banana', 'apple': 'apple', 'orange': 'orange',
  'broccoli': 'broccoli', 'carrot': 'carrot',
  'sandwich': 'bread', 'hot dog': 'beef', 'pizza': 'tomato',
  'cake': 'flour', 'donut': 'flour',
  'cow': 'beef', 'sheep': 'beef', 'bird': 'chicken', 'bottle': 'milk',
  'bowl': null, 'cup': null, 'wine glass': null,
  'fork': null, 'knife': null, 'spoon': null,
};

/*
 * YOLO MODEL COVERAGE NOTE
 * ────────────────────────
 * COCO model (default): 80 classes, only ~11 food-relevant.
 *   Causes misclassifications: steak → "cake", salmon → "hot dog", etc.
 *
 * VibeChef model (after fine-tuning): 30 ingredient classes, 1-to-1 mapping.
 *   Build it: cd yolo_finetune && python 01_download_open_images.py &&
 *             python 02_train.py && python 03_export_onnx.py
 *   Place the resulting files in frontend/public/models/:
 *     yolov8n-vibechef.onnx
 *     vibechef-classes.json
 *   The Vision Agent detects the new model automatically on next load.
 *
 * Ingredients not well-covered even after fine-tuning (need manual annotation):
 *   flour, olive oil — see yolo_finetune/README.md
 */

// ── Module-level model state ──────────────────────────────────────────────────

let session        = null;
let modelMode      = 'coco';       // 'coco' | 'vibechef'
let activeClasses  = COCO_CLASSES; // overridden when VibeChef model is loaded
let numClasses     = 80;

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns { success, mode, numClasses, notFound?, error? } */
export async function loadModel(onStatus) {
  if (session) return { success: true, mode: modelMode, numClasses };

  // 1. Try the VibeChef fine-tuned model first
  const vibechefAvailable = await fileExists(VIBECHEF_MODEL_URL);
  if (vibechefAvailable) {
    const classesOk = await tryLoadVibeChefModel(onStatus);
    if (classesOk) return { success: true, mode: 'vibechef', numClasses };
    // Fall through to COCO on any error
  }

  // 2. Fall back to COCO model
  return tryLoadCocoModel(onStatus);
}

export async function detectIngredients(source) {
  if (!session) throw new Error('Modelo no cargado. Llama a loadModel() primero.');

  const { tensor, origW, origH } = preprocessSource(source);
  const feeds   = { images: tensor };
  const results = await session.run(feeds);
  const key     = Object.keys(results)[0];
  if (!key) throw new Error('ONNX returned no output tensors');

  return postprocess(results[key].data, origW, origH);
}

/**
 * Apply saved user corrections to a detections array.
 * @param {Array}  detections  - output of detectIngredients()
 * @param {Object} corrections - { yolo_class: corrected_ingredient }
 */
export function applyUserCorrections(detections, corrections) {
  if (!corrections || Object.keys(corrections).length === 0) return detections;
  return detections.map((d) => {
    const corrected = corrections[d.className];
    if (!corrected) return d;
    return { ...d, ingredient: corrected, correctedByHistory: true };
  });
}

/** Currently active model mode: 'coco' | 'vibechef' */
export function getModelMode() { return modelMode; }

// ── Private helpers ───────────────────────────────────────────────────────────

async function fileExists(url) {
  try {
    return (await fetch(url, { method: 'HEAD' })).ok;
  } catch {
    return false;
  }
}

async function tryLoadVibeChefModel(onStatus) {
  try {
    onStatus?.('Cargando modelo VibeChef personalizado...');

    // Load class map: { "0": "apple", "1": "banana", ... }
    const classesRes = await fetch(VIBECHEF_CLASSES_URL);
    if (!classesRes.ok) throw new Error('vibechef-classes.json not found');
    const classMap = await classesRes.json();

    // Build ordered array: index 0 → "apple", etc.
    const count = Object.keys(classMap).length;
    const classes = Array.from({ length: count }, (_, i) => classMap[String(i)]);

    session = await ort.InferenceSession.create(VIBECHEF_MODEL_URL, {
      executionProviders: ['wasm'],
    });

    // Commit state only on full success
    modelMode     = 'vibechef';
    activeClasses = classes;
    numClasses    = count;

    onStatus?.(`Modelo VibeChef listo (${count} ingredientes)`);
    return true;
  } catch (err) {
    console.warn('VibeChef model load failed, falling back to COCO:', err.message);
    session       = null;
    modelMode     = 'coco';
    activeClasses = COCO_CLASSES;
    numClasses    = 80;
    return false;
  }
}

async function tryLoadCocoModel(onStatus) {
  const exists = await fileExists(COCO_MODEL_URL);
  if (!exists) {
    return {
      success: false, notFound: true,
      error: 'Archivo yolov8n.onnx no encontrado en /models/.',
    };
  }
  try {
    onStatus?.('Cargando modelo YOLOv8n COCO (~6 MB)...');
    session = await ort.InferenceSession.create(COCO_MODEL_URL, {
      executionProviders: ['wasm'],
    });
    modelMode     = 'coco';
    activeClasses = COCO_CLASSES;
    numClasses    = 80;
    onStatus?.('Modelo COCO listo (cobertura limitada)');
    return { success: true, mode: 'coco', numClasses: 80 };
  } catch (err) {
    session = null;
    return { success: false, error: `Error al cargar modelo: ${err.message}` };
  }
}

function preprocessSource(source) {
  const origW = source.videoWidth  ?? source.naturalWidth  ?? source.width;
  const origH = source.videoHeight ?? source.naturalHeight ?? source.height;

  const offscreen = document.createElement('canvas');
  offscreen.width = INPUT_SIZE;
  offscreen.height = INPUT_SIZE;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(source, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const pixels = INPUT_SIZE * INPUT_SIZE;
  const tensorData = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    tensorData[i]             = data[i * 4]     / 255; // R
    tensorData[i + pixels]    = data[i * 4 + 1] / 255; // G
    tensorData[i + pixels * 2] = data[i * 4 + 2] / 255; // B
  }
  return {
    tensor: new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    origW, origH,
  };
}

function postprocess(output, origW, origH) {
  // Dynamically detect nc from output tensor:
  //   output.length = (nc + 4) × 8400
  //   nc = output.length/8400 - 4
  const N  = 8400;
  const nc = Math.round(output.length / N) - 4;  // works for any model size
  const scaleX = origW / INPUT_SIZE;
  const scaleY = origH / INPUT_SIZE;

  const boxes = [], scores = [], classIds = [], candidateSets = [];

  for (let i = 0; i < N; i++) {
    const cx = output[0 * N + i];
    const cy = output[1 * N + i];
    const w  = output[2 * N + i];
    const h  = output[3 * N + i];

    const classScores = [];
    for (let c = 0; c < nc; c++) {
      const s = output[(4 + c) * N + i];
      if (s >= CONF_LOW) classScores.push({ classId: c, score: s });
    }
    if (classScores.length === 0) continue;
    classScores.sort((a, b) => b.score - a.score);
    const top = classScores[0];

    boxes.push([
      (cx - w / 2) * scaleX, (cy - h / 2) * scaleY,
      (cx + w / 2) * scaleX, (cy + h / 2) * scaleY,
    ]);
    scores.push(top.score);
    classIds.push(top.classId);
    candidateSets.push(classScores.slice(0, MAX_CANDIDATES));
  }

  const kept = nms(boxes, scores, IOU_THRESHOLD);

  return kept.map((idx) => {
    const classId   = classIds[idx];
    const score     = scores[idx];
    const className = activeClasses[classId] ?? `class_${classId}`;

    // Ingredient resolution:
    //   VibeChef model → className IS the ingredient name (direct 1:1)
    //   COCO model     → look up in COCO_TO_INGREDIENT
    const ingredient = modelMode === 'vibechef'
      ? className
      : (COCO_TO_INGREDIENT[className] ?? null);

    const candidates = candidateSets[idx].map((c) => {
      const cn = activeClasses[c.classId] ?? `class_${c.classId}`;
      return {
        className:  cn,
        score:      c.score,
        ingredient: modelMode === 'vibechef' ? cn : (COCO_TO_INGREDIENT[cn] ?? null),
      };
    });

    return {
      box: boxes[idx],
      score,
      classId,
      className,
      ingredient,
      needsReview: score < CONF_HIGH || ingredient === null,
      candidates,
    };
  });
}

function nms(boxes, scores, iouThreshold) {
  const order  = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const active = new Uint8Array(order.length).fill(1);
  const selected = [];
  for (let i = 0; i < order.length; i++) {
    if (!active[i]) continue;
    selected.push(order[i]);
    for (let j = i + 1; j < order.length; j++) {
      if (!active[j]) continue;
      if (iou(boxes[order[i]], boxes[order[j]]) > iouThreshold) active[j] = 0;
    }
  }
  return selected;
}

function iou(a, b) {
  const ix1 = Math.max(a[0], b[0]), iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]), iy2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const aA = (a[2]-a[0]) * (a[3]-a[1]), aB = (b[2]-b[0]) * (b[3]-b[1]);
  return inter / (aA + aB - inter);
}
