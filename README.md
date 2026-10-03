# Logic Quest

Play: https://chiokebuckley-art.github.io/logic-quest/

v0.4.1 teaches before the quiz (the skill-drill handoff). Every lesson in Stops 1–6 is See, Do, Quiz: the key ideas end on one case already marked; before any quiz the learner marks a new case on that same board by taps (true or false, fits or not, a check or a cross, a count, keep or reject), and "Check my marks" names the first wrong mark; the quiz then uses only the rule the lesson taught. Treasure signs keeps the chest example (it still concludes Silver), adds Mark a case (Silver shown, Gold marked by the learner), and starts its quiz with the frozen Ice, Fire and Moss caves, all "Exactly one sign is true". The other sign rules now have their own lessons in Stop 1: "Every sign is false", "Exactly two signs are true" and "The owner's sign". A lesson passes only when its boards are marked right and 3 answers are right on the first try with no hint; tapping Next through the cards never passes, and lessons open in order. Each stop's drill worksheet is in `source/docs/audit/drill-stopN.md`. Built from `command-center` branch `ccr-4bce2062-2v9qj3`, commit `77bd33e`, which includes all of v0.4.0.

v0.4.0 reorganises the app around one page per stop. The tabs are Home · Journey · Arcade · Library · Me. Home shows the one next thing; each stop's lessons, checks, practice, Pattern Lab events and repair cards live on its own Stop page; the Library indexes every idea and puzzle; Find anything searches all of it; and the colours are brighter, one meaning each (the same palette as the Engineering Quest remake). Saves carry over unchanged.

v0.3.1 makes every wrong answer teach first. After a miss, the explanation shows what the answer means, exactly where it fails (with a worked counterexample), why the right answer works, and a short Remember. Then comes "Try this question again", then new examples on the same idea, answered without help. Grown-ups see this help counted apart from first-try answers. The reference is Stop 1, Lesson 3 (The NOT flip). Each stop's audit worksheet is in `source/docs/audit/`. Built from `command-center` branch `ccr-4bce2062-2v9qj3`, commit `c7899b49651d060ac7e2b9c0eabd3905e64ae06a`, which includes all of v0.3.0.

v0.3.0 adds the supplied Pattern Lab artwork, an optional Explorer Pattern Workshop, thirteen preparation events, age paths, six-step reasoning prompts, and separate saved bridge badges. Existing stop checks and mastery are preserved.

The editable source for this release is now in `source/` in this repository. The previous source snapshot was in `command-center` branch `ccr-4bce2062-2v9qj3`, commit `464242e6c299df9fe49b29609babf3ff54bc5144`.

To build: `cd source`, `npm ci`, `npm test`, and `npm run pages`. Copy `source/dist-pages/` over the root deployment files, preserving the root PWA icons, then publish the same commit to `gh-pages` and `main`. The root `.nojekyll` is preserved.

See `source/docs/PATTERN_BRIDGES.md` for integration scope, progress boundaries, and validation. The full Pattern Lab curriculum remains hosted in Engineering Quest; this release implements its Logic Quest bridges.
