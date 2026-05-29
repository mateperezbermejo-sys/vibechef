#!/usr/bin/env node
/**
 * Compute SHA-256 hashes for all files in frontend/public/demo-images/
 * and print the 16-char prefix used by the demo detection system.
 *
 * Usage (from project root):
 *   node scripts/compute-demo-hashes.js
 *
 * Then paste each hash into the matching `hashes` array in:
 *   frontend/src/data/demoDetections.js
 */

import { createHash } from 'crypto';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, '..', 'frontend', 'public', 'demo-images');

if (!existsSync(dir)) {
  console.error(`Directory not found: ${dir}`);
  console.error('Create it and add your demo images first.');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));

if (files.length === 0) {
  console.log('No image files found in demo-images/. Add images first.');
  process.exit(0);
}

console.log('Demo image hashes (paste into demoDetections.js):\n');
for (const f of files) {
  const buf  = readFileSync(join(dir, f));
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16);
  console.log(`  "${f}": "${hash}",`);
}
