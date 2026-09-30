# Publishing Logic Quest

Logic Quest plays in two places. Both use the same build with a different base path.

## 1. Behind the Command Center login, at `/logic`

The root `npm run build` in `command-center` runs `build:logic`:

```bash
npm ci --include=dev --prefix logic-quest && LOGIC_BASE=/logic/ npm run build --prefix logic-quest
```

`server/server.mjs` serves `logic-quest/dist` at `/logic`, next to `/quest` and `/wordraiders`. Every Railway
deploy of `main` ships the latest game. The manifest link uses `crossorigin="use-credentials"`, so Add to Home
Screen works with the login switched on.

## 2. GitHub Pages: https://chiokebuckley-art.github.io/logic-quest/

The public repository `chiokebuckley-art/logic-quest` holds the built game only. The source stays here.

```bash
cd logic-quest
npm run pages        # builds with LOGIC_BASE=/logic-quest/ into dist-pages/ (+ .nojekyll and 404.html)
```

Then copy everything in `dist-pages/` to the `gh-pages` branch of `chiokebuckley-art/logic-quest`, commit, push,
and push the same commit to `main`. The first time, turn on Pages in the repository: **Settings → Pages →
Deploy from a branch → `gh-pages` / (root)**.

On a phone, open the link and choose Add to Home Screen. The game then opens full screen like an app, and the
"new version" banner offers each update (it compares `version.json`).

## One offline file

`npm run build:single` writes `dist-single/logic-quest.html`, the whole game in one HTML file.

