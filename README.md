# Logic Quest

Play: https://chiokebuckley-art.github.io/logic-quest/

v0.3.0 adds the supplied Pattern Lab artwork, an optional Explorer Pattern Workshop, thirteen preparation events, age paths, six-step reasoning prompts, and separate saved bridge badges. Existing stop checks and mastery are preserved.

The editable source for this release is now in `source/` in this repository. The previous source snapshot was in `command-center` branch `ccr-4bce2062-2v9qj3`, commit `464242e6c299df9fe49b29609babf3ff54bc5144`.

To build: `cd source`, `npm ci`, `npm test`, and `npm run pages`. Copy `source/dist-pages/` over the root deployment files, preserving the root PWA icons, then publish the same commit to `gh-pages` and `main`. The root `.nojekyll` is preserved.

See `source/docs/PATTERN_BRIDGES.md` for integration scope, progress boundaries, and validation. The full Pattern Lab curriculum remains hosted in Engineering Quest; this release implements its Logic Quest bridges.
