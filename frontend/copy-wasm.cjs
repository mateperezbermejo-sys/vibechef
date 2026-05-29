const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'node_modules', 'onnxruntime-web', 'dist');
const dst = path.join(__dirname, 'public', 'ort-wasm');

if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });

const files = fs.readdirSync(src).filter(f => f.startsWith('ort-wasm-simd-threaded'));
for (const f of files) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
}
console.log(`Copied ${files.length} WASM files to public/ort-wasm/`);
