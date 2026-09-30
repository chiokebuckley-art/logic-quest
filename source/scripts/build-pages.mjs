// Builds the GitHub Pages copy straight into dist-pages/: the game built for https://chiokebuckley-art.github.io/logic-quest/,
// plus an empty .nojekyll and a 404.html copy of index.html (the same recipe as WORDRAIDERS and Engineering Quest).
// It never touches dist/, which the Command Center serves at /logic.
// Publish by copying dist-pages/ to the gh-pages branch of chiokebuckley-art/logic-quest (see docs/PUBLISHING.md).
import { execSync } from 'node:child_process';
import { copyFile, writeFile } from 'node:fs/promises';

const base = process.env.LOGIC_BASE ?? '/logic-quest/';
execSync('npx tsc --noEmit && npx vite build --outDir dist-pages --emptyOutDir', { stdio: 'inherit', env: { ...process.env, LOGIC_BASE: base } });
await writeFile('dist-pages/.nojekyll', '');
await copyFile('dist-pages/index.html', 'dist-pages/404.html');
console.log(`dist-pages/ ready for GitHub Pages (base ${base})`);

