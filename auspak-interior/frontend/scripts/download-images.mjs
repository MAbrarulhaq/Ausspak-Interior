// Downloads the Stitch demonstration images into public/images (replacing the generated placeholders).
// Usage: npm run images
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'images');
const manifest = JSON.parse(await readFile(path.join(here, 'image-manifest.json'), 'utf8'));

let ok = 0;
const failed = [];
for (const { file, url } of manifest) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    await writeFile(path.join(outDir, file), Buffer.from(await res.arrayBuffer()));
    ok++;
    console.log('downloaded', file);
  } catch (err) {
    failed.push(file);
    console.warn('FAILED', file, '-', err.message);
  }
}
console.log(`\n${ok}/${manifest.length} images downloaded.`);
if (failed.length) console.log('Kept placeholders for:', failed.join(', '));
