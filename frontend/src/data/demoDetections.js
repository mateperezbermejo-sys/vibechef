/**
 * Demo image detection overrides.
 *
 * Each entry has:
 *   label     — human-readable name shown in the UI badge
 *   hashes    — 16-char SHA-256 prefix (first 8 bytes as hex).
 *               Fill these in using the "Copiar hash" button that appears
 *               in dev mode after loading an image in the scanner.
 *   filenames — substrings to match against the filename (case-insensitive,
 *               extension stripped). Used as fallback when hash is unknown.
 *   detections — predefined ingredient boxes in normalised coords:
 *               boxNorm: [x1, y1, x2, y2]  where 0,0 = top-left, 1,1 = bottom-right.
 *
 * SAVE DEMO IMAGES TO:  frontend/public/demo-images/
 * RECOMMENDED NAMES:    nevera-demo-1.jpg  /  nevera-demo-2.jpg  /  nevera-demo-3.jpg
 *
 * To capture real hashes + refine box positions:
 *   1. Run the frontend in dev mode (`npm run dev`).
 *   2. Open the Scanner, click "Subir imagen", select a demo image.
 *   3. Click "Detectar alimentos".
 *   4. A 🛠 DEV panel appears — click "Copiar hash" and paste it into `hashes` below.
 *   5. Use "✏️ Añadir manualmente" to draw accurate boxes on screen.
 *   6. Click "Exportar detecciones JSON" to copy the refined boxNorm values.
 *   7. Replace the `detections` array below with the exported JSON.
 */

export const DEMO_IMAGES = {

  /* ── Nevera 1: white fridge — salmon, eggs, chicken, beef, cheese, apple ── */
  'demo-1': {
    label: 'Nevera de demo 1',
    hashes: [],
    filenames: ['demo1', 'demo-1', 'nevera1', 'nevera-1', 'nevera-demo-1', 'fridge1'],
    detections: [
      { ingredient: 'egg',     className: 'demo', source: 'demo', score: 1, boxNorm: [0.02, 0.04, 0.32, 0.23] },
      { ingredient: 'milk',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.44, 0.04, 0.63, 0.23] },
      { ingredient: 'salmon',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.54, 0.04, 0.95, 0.23] },
      { ingredient: 'chicken', className: 'demo', source: 'demo', score: 1, boxNorm: [0.04, 0.27, 0.47, 0.46] },
      { ingredient: 'beef',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.46, 0.27, 0.93, 0.46] },
      { ingredient: 'tomato',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.04, 0.47, 0.33, 0.64] },
      { ingredient: 'pepper',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.31, 0.46, 0.54, 0.64] },
      { ingredient: 'cheese',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.50, 0.46, 0.94, 0.64] },
      { ingredient: 'apple',   className: 'demo', source: 'demo', score: 1, boxNorm: [0.04, 0.65, 0.58, 0.84] },
      { ingredient: 'cabbage', className: 'demo', source: 'demo', score: 1, boxNorm: [0.54, 0.63, 0.90, 0.84] },
    ],
  },

  /* ── Nevera 2: bright white fridge — fruits, OJ, peppers, yogurt ── */
  'demo-2': {
    label: 'Nevera de demo 2',
    hashes: [],
    filenames: ['demo2', 'demo-2', 'nevera2', 'nevera-2', 'nevera-demo-2', 'fridge2'],
    detections: [
      { ingredient: 'cake',      className: 'demo', source: 'demo', score: 1, boxNorm: [0.04, 0.02, 0.32, 0.19] },
      { ingredient: 'peach',     className: 'demo', source: 'demo', score: 1, boxNorm: [0.32, 0.02, 0.58, 0.18] },
      { ingredient: 'peach',     className: 'demo', source: 'demo', score: 1, boxNorm: [0.01, 0.29, 0.26, 0.52] },
      { ingredient: 'blueberry', className: 'demo', source: 'demo', score: 1, boxNorm: [0.26, 0.29, 0.48, 0.52] },
      { ingredient: 'banana',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.38, 0.24, 0.70, 0.48] },
      { ingredient: 'grape',     className: 'demo', source: 'demo', score: 1, boxNorm: [0.44, 0.33, 0.70, 0.55] },
      { ingredient: 'orange',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.73, 0.07, 0.99, 0.77] },
      { ingredient: 'pepper',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.00, 0.59, 0.21, 0.88] },
      { ingredient: 'pepper',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.18, 0.57, 0.47, 0.88] },
      { ingredient: 'yogurt',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.46, 0.59, 0.67, 0.86] },
    ],
  },

  /* ── Nevera 3: close-up shelves — eggs, corn, peach, peppers, tomato ── */
  'demo-3': {
    label: 'Nevera de demo 3',
    hashes: [],
    filenames: ['demo3', 'demo-3', 'nevera3', 'nevera-3', 'nevera-demo-3', 'fridge3'],
    detections: [
      { ingredient: 'chicken', className: 'demo', source: 'demo', score: 1, boxNorm: [0.00, 0.01, 0.43, 0.22] },
      { ingredient: 'cheese',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.58, 0.01, 0.99, 0.23] },
      { ingredient: 'egg',     className: 'demo', source: 'demo', score: 1, boxNorm: [0.00, 0.28, 0.39, 0.58] },
      { ingredient: 'corn',    className: 'demo', source: 'demo', score: 1, boxNorm: [0.34, 0.28, 0.64, 0.60] },
      { ingredient: 'peach',   className: 'demo', source: 'demo', score: 1, boxNorm: [0.54, 0.25, 0.97, 0.62] },
      { ingredient: 'pepper',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.00, 0.63, 0.30, 0.99] },
      { ingredient: 'pepper',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.27, 0.61, 0.57, 0.99] },
      { ingredient: 'pepper',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.52, 0.63, 0.81, 0.99] },
      { ingredient: 'tomato',  className: 'demo', source: 'demo', score: 1, boxNorm: [0.65, 0.68, 0.99, 0.99] },
    ],
  },
};

/**
 * Returns the demo config matching a hash or filename, or null if no match.
 * Hash takes priority over filename when both are available.
 *
 * @param {string|null} hash     - 16-char hex SHA-256 prefix
 * @param {string|null} filename - original file.name (with or without extension)
 */
export function findDemoImage(hash, filename) {
  for (const config of Object.values(DEMO_IMAGES)) {
    if (hash && config.hashes.length > 0 && config.hashes.includes(hash)) {
      return config;
    }
    if (filename) {
      const base = filename.toLowerCase().replace(/\.[^.]+$/, '');
      if (config.filenames.some((pat) => base.includes(pat))) {
        return config;
      }
    }
  }
  return null;
}

/**
 * Convert a demo detection with normalised boxNorm to absolute pixel coordinates.
 *
 * @param {Object} det - detection object with boxNorm: [x1n, y1n, x2n, y2n]
 * @param {number} W   - image natural width in pixels
 * @param {number} H   - image natural height in pixels
 * @returns detection with box: [x1, y1, x2, y2] in pixels
 */
export function denormDetection(det, W, H) {
  const [x1n, y1n, x2n, y2n] = det.boxNorm;
  return {
    ...det,
    box: [x1n * W, y1n * H, x2n * W, y2n * H],
    needsReview: false,
    candidates: [],
    correctedByHistory: false,
  };
}
