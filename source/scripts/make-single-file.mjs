// Post-processes the single-file build into dist-single/logic-quest.html: one HTML file that runs offline.
// Links to the manifest and icons are dropped because they would 404 from a lone file.
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

let html = await readFile(path.resolve('dist-single/index.html'), 'utf8');
html = html.replace(/<link[^>]*rel="(icon|manifest|apple-touch-icon)"[^>]*>/g, '');
await writeFile(path.resolve('dist-single/logic-quest.html'), html);
const sz = (await stat(path.resolve('dist-single/logic-quest.html'))).size;
console.log(`single file: ${(sz / 1024 / 1024).toFixed(2)} MB`);

