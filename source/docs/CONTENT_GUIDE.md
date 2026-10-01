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

## Wrong answers: teach first

A wrong answer in a lesson, in practice or in the notebook opens the explanation at once (`ExplanationPanel`). Then
come "Try this question again" (practice with help), and then **new examples on the same skill**, answered on
their own (`engine/fresh.ts`). The check result shows the same explanation for each miss. The reference is Stop 1,
Lesson 3 (The NOT flip, `notItem` in `src/engine/puzzles/statements.ts`); match its quality. Every item carries:

- **`teach`** (`Teach` in `src/engine/types.ts`):
  - `rule`: the idea in plain words. Example: "NOT means the original statement is false."
  - `terms`: every word the explanation needs, defined in place, before use. Examples: "A tie means the two groups
    have the same number." "“At least as many” means the same number or more."
  - `meaning`: what the statement or clue says, and when it is true.
  - `cases` (with `casesTitle`): worked cases that cover every way the question can go, boundaries included (a tie,
    exactly k, nobody, all of them). Each case is a `TeachCase`: a label in words with numerals ("3 red dragons
    and 3 yellow dragons."), an optional picture (`groups` of counted things, or shape-card `things`), the truth of
    each sentence, and a note ("This is a tie."). The label alone must be enough if the picture cannot load.
  - `remember`: the rule in a few words, and a question to ask yourself.
  - `simpler`: the smallest worked example, step by step ("Explain more simply").
- **`feedback`** on choose items: one `ChoiceFeedback` for **every** wrong choice, keyed by the choice id:
  - `headline`: the gap in one sentence ("Your answer leaves out one possibility: a tie."). It describes the
    answer, never the player's private reasoning, and never only "Wrong" or "Try again".
  - `detail`: what the answer means, and exactly where it fails, with labelled numbers.
  - `example`: the case that proves it fails (a counterexample), with the truths that show the failure.
  - `simpler`: optional, when this mistake needs its own smallest example.
  - Call `syncWhyWrong(item)` after building feedback, so `whyWrong` holds the same words.
- Choice ids stay fixed when choices are shuffled, so feedback, the answer key and the read-aloud always match.
  Never key feedback to a choice's position.
- Other kinds: `grade()` names the exact failure. Its first line is the headline, and each further line is one
  place the answer fails, shown as its own paragraph:
  - a line-up or grid: “This line breaks clue 2.”, then each broken clue quoted, with where the answer breaks it
    (“In your line, Ben comes before Ava.” “Your grid has the ✓ for Gus under “popcorn,” not under “apples.””);
  - knights: who breaks the rule, then each speaker’s words quoted, with whether they must be true or false;
  - tap-all and multi: the cards left out and the cards that do not belong, by name.
  The explanation then draws the player’s own answer as the example card (`exampleFor` in `game/explanation.ts`):
  the line with each clue true or false, each speaker’s words true or false, or just the wrong cards, badged. Keep
  `diagnose`, `missTips` and `pickTips` for known misreadings; each tip should name its card. `teach` carries the
  rest.
- Never write "both", "that row" or "the opposite" without saying what they refer to. Name the sentences
  ("the dragon’s statement", "your answer").
- A stop can give its own set of new examples (`StopDef.fresh`). For example, a missed NOT-flip comparison gets
  two: one where the tie or exactly k belongs to the answer, and one where it does not. A missed “Can’t tell” gets
  another “Can’t tell” and one that the clues decide. Then repeating one answer never passes the set.

All of this is player-facing text, so the reading-level rules below apply to it too. The contract test reads it,
and it requires `teach` on every item and `feedback` on every wrong choice in every lesson of every built stop. Each
stop's audit worksheet (every distractor, what was missing, the counterexample now shown) is in `docs/audit/`.

## Question kinds

- `choose`: one right choice. Give `feedback` (and so `whyWrong`) for each wrong choice.
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
