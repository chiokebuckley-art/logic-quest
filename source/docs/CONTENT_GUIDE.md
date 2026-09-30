# Writing a stop

Every stop is one file, `src/content/stopN.ts`, exporting a `StopDef` (see `src/engine/types.ts`). Puzzle
generators live in `src/engine/puzzles/`. The contract test checks every rule below:

```bash
STOP=2 npx vitest run src/engine/__tests__/stops.test.ts
```

## Shape

- **3–6 lessons**, ids `sN.l1`, `sN.l2`, …
- Each lesson starts with **3–6 key-idea cards**. They are taught before any question. A card can show a scene
  as a worked example.
- `practice(rng)` gives **3–5 guided items** in at least two skins: an everyday story, a fantasy story, and
  abstract letters or shapes.
- `check(rng)` gives **8–10 items**. It covers every lesson and includes at least one **conflict item**, where
  intuition points the wrong way. Every seed gives a new check: a retry never repeats the last one.
- `practice(rng)` on the stop gives one Arcade item from anywhere in the stop.

## Answers

- Every item has exactly one right answer, **computed by the engine**: enumerate the cases, never hand-assert.
- "Can't tell" is a real answer wherever the clues don't decide it.
- `explain` walks through the reasoning in 1–3 short sentences. `whyWrong` and `diagnose` name the exact mistake
  (for example, reading OR as "one but not both"). Hints nudge; they never give the answer, and checks never
  show them.
- Use only the `rng` you are given, so the same seed always gives the same items.

## Question kinds

- `choose`: one right choice. Use `whyWrong` for each wrong choice.
- `tapall`: shape cards. Use `diagnose` for wrong sets that reveal a misreading.
- `order`: a line-up. Clues are `LineClue`s, shown in a `clues` scene.
- `assign`:
  - layout `'grid'` is a logic grid. Structured `gridClues` go with a `clues` scene.
  - layout `'toggles'` is knights and knaves: one category `kind` with the values `knight` and `knave`, `claims`
    per islander, and a `speakers` scene.
  - The contract test brute-forces every assignment, so exactly one must fit. Grids must also be solvable by
    crossing out and "only one left", without guessing.
- `multi`: text cards; pick every one that must be chosen. Use `missTips` for needed cards that were left out and
  `pickTips` for cards that should not be picked.
- Scenes: `things`, `boxes`, `clues`, `text`, `speakers` (speech bubbles) and `grid` (a half-filled grid, drawn as
  a picture for worked examples).
- `seconds`: a longer check time for big items (150–180 for grids and three islanders).

Skill tags (`sN.short-name`) appear on the Grown-ups screen. Add a plain name for each new tag to `SKILL_NAMES` in
`src/game/progressStats.ts`. Every miss becomes a Wrong-Answer Notebook card for its skill, so each skill must
appear in its lesson's practice sets. That is where the fresh repair question comes from.

## Reading level

The first players read at a 6th-grade level. Every lesson's cards, prompts and explanations must score a
Flesch-Kincaid grade of **7.0 or lower**, with no sentence over **25 words**. In practice:

- Most sentences under 15 words. Everyday words. Say "you".
- Define a new word the first time it appears.
- No idioms or emoji. US spelling.
- Calm and encouraging, never babyish. Use "Not yet", not "Wrong".

