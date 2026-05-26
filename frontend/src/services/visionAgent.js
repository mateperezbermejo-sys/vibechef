// wasm-only import: avoids JSEP/WebGL/WebGPU backends that fail under Vite COEP
import * as ort from 'onnxruntime-web/wasm';

ort.env.wasm.wasmPaths = '/ort-wasm/';
ort.env.wasm.numThreads = 1; // single-thread: no SharedArrayBuffer required

const MODEL_URL = '/models/yolov8n.onnx';
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.30;
const IOU_THRESHOLD = 0.45;

// All 80 COCO class names in order (index = class id)
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

// COCO class → canonical ingredient name_en (must match ingredients table)
const COCO_TO_INGREDIENT = {
  'banana':    'banana',
  'apple':     'apple',
  'orange':    'orange',
  'broccoli':  'broccoli',
  'carrot':    'carrot',
  'sandwich':  'bread',
  'hot dog':   'beef',
  'pizza':     'tomato',   // tomato-base approximation
  'cake':      'flour',
  'cow':       'beef',
  'sheep':     'beef',
  'bird':      'chicken',
  'bottle':    'milk',
  'bowl':      null,
  'cup':       null,
};

let session = null;

export async function checkModelExists() {
  try {
    const res = await fetch(MODEL_URL, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loadModel(onStatus) {
  if (session) return { success: true };

  const exists = await checkModelExists();
  if (!exists) {
    return {
      success: false,
      notFound: true,
      error: 'Archivo yolov8n.onnx no encontrado en /models/.',
    };
  }

  try {
    onStatus?.('Cargando modelo ONNX (~6 MB)...');
    session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
    onStatus?.('Modelo listo');
    return { success: true };
  } catch (err) {
    session = null;
    return { success: false, error: `Error al cargar modelo: ${err.message}` };
  }
}

export async function detectIngredients(source) {
  if (!session) throw new Error('Modelo no cargado. Llama a loadModel() primero.');

  const { tensor, origW, origH } = preprocessSource(source);

  const feeds = { images: tensor };
  const results = await session.run(feeds);
  // output tensor name varies by export ("predictions" in this model)
  const outputKey = Object.keys(results)[0];
  if (!outputKey) throw new Error('ONNX returned no output tensors');
  const rawOutput = results[outputKey].data; // Float32Array [1, 84, 8400]

  return postprocess(rawOutput, origW, origH);
}

function preprocessSource(source) {
  const origW = source.videoWidth ?? source.naturalWidth ?? source.width;
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
    tensorData[i]            = data[i * 4]     / 255; // R
    tensorData[i + pixels]   = data[i * 4 + 1] / 255; // G
    tensorData[i + pixels*2] = data[i * 4 + 2] / 255; // B
  }

  const tensor = new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  return { tensor, origW, origH };
}

function postprocess(output, origW, origH) {
  // output layout: [1, 84, 8400] → treat as [84, 8400]
  const N = 8400;
  const scaleX = origW / INPUT_SIZE;
  const scaleY = origH / INPUT_SIZE;

  const boxes = [];
  const scores = [];
  const classIds = [];

  for (let i = 0; i < N; i++) {
    // bbox in 640-space
    const cx = output[0 * N + i];
    const cy = output[1 * N + i];
    const w  = output[2 * N + i];
    const h  = output[3 * N + i];

    let maxScore = 0;
    let maxClass = 0;
    for (let c = 0; c < 80; c++) {
      const s = output[(4 + c) * N + i];
      if (s > maxScore) { maxScore = s; maxClass = c; }
    }

    if (maxScore < CONF_THRESHOLD) continue;

    // Convert to corner format and scale to original image space
    boxes.push([
      (cx - w / 2) * scaleX,
      (cy - h / 2) * scaleY,
      (cx + w / 2) * scaleX,
      (cy + h / 2) * scaleY,
    ]);
    scores.push(maxScore);
    classIds.push(maxClass);
  }

  const kept = nms(boxes, scores, IOU_THRESHOLD);

  return kept
    .map((idx) => {
      const className = COCO_CLASSES[classIds[idx]];
      const ingredient = COCO_TO_INGREDIENT[className];
      return {
        box: boxes[idx],
        score: scores[idx],
        classId: classIds[idx],
        className,
        ingredient: ingredient ?? null,
      };
    })
    .filter((d) => d.ingredient !== null);
}

function nms(boxes, scores, iouThreshold) {
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const active = new Uint8Array(order.length).fill(1);
  const selected = [];

  for (let i = 0; i < order.length; i++) {
    if (!active[i]) continue;
    selected.push(order[i]);
    for (let j = i + 1; j < order.length; j++) {
      if (!active[j]) continue;
      if (iou(boxes[order[i]], boxes[order[j]]) > iouThreshold) {
        active[j] = 0;
      }
    }
  }
  return selected;
}

function iou(a, b) {
  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]);
  const iy2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (areaA + areaB - inter);
}
