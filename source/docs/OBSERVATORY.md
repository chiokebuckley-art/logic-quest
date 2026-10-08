# Pattern Observatory

*The side constellation of pattern recognition: four rings (stops s14–s17), ten places, one learner routine. This is
the build spec written from the owner's v2 handoff (2026-10-07) and kept as the reference for the content and the
code. Status (v0.10.0): the core (types, save key, unlocks, number pad, routine strip, evidence screens, diagnostic)
and all four rings (ten places, their checks, primers, reviews, independent sets and diagnostic items) are built and
played through in the browser at 320, 375 and 430 px. §7 lists what is still open.*

Everything lives in `/home/user/command-center/logic-quest`. Kids 8–12 at a 6th-grade reading level (FK ≤ 7.0,
no sentence over 25 words, curly quotes, no symbols in anything a kid reads; the only exception is the formula
`((n − 1) mod k) + 1`, which is written in words on screen: "take one away, find the remainder, add one").
Adults use the same screens with plain labels. Levels L1–L4 are shown, never ages.

## 0. The handoff in one page

- Pattern recognition = notice regularities → describe a rule or model → test alternatives → predict → tell
  structure from an unsupported guess. Two kinds of pattern: a **constructed** pattern comes with its rule (a
  prediction can be proved); an **observed** pattern is only what we have seen (a prediction is a guess to test).
  Every puzzle says which kind it is.
- The learner routine, on every screen as a chip strip: **Notice → Describe → Compare → Test → Predict → Explain**.
- Every lesson (place) runs **See → Explain → Do → Transfer → Review**:
  - See: a short worked example with the decision steps visible (the guide says what it notices, states the rule,
    checks it against every item). Replayable, still frames with Reduce motion. Routine: Notice, Describe.
  - Explain: why the rule works or why a tempting wrong answer fails (choose a reason, or build one from parts).
    Routine: Compare, Explain.
  - Do: a faded example first (one blank in a sentence frame), then the same task with no frame. Routine: Describe,
    Predict.
  - Transfer: same structure, new materials or context (sounds instead of shapes; a desk rota instead of a chain). A
    new colour alone is not transfer. Routine: Test, Predict.
  - Review: fresh items on later days, mixed with other skills (about 2 days, 1 week, 3–4 weeks). Routine: all six.
- Help is not grading: hints and retries are welcome. After a mistake: name the exact mismatch, let the learner
  **repair the same item** (supported), then give a **fresh matched twin** (independent). Next never passes; a
  first try, once recorded, is never overwritten.
- Three clean answers = **Lesson complete** (a gate, not mastery). The evidence profile per place: Practiced
  (worked + faded examples, hinted answers) → Lesson complete (3 clean first tries incl. the trap) → Independent
  (fresh 6-item check, 5 of 6 right, no hints, with a reasoning item) → Transferred (2+ unfamiliar contexts right,
  with a rule explanation) → Retained (fresh 4-item delayed check, 3 of 4, at about 2 days, 1 week, 3–4 weeks).
  Item counts and dates are product rules to pilot, not research cutoffs: keep them as constants in one file.
- Explanation rubric 0–3: 0 no relevant rule; 1 a local change not tested against every case; 2 a rule that fits
  every case, applied right; 3 compares an alternative, picks a separating test, or says when the prediction is
  guaranteed. A preschool item never requires 3.
- Error tags: oversized repeat unit; off-by-one index; additive/multiplicative confusion; first-rule fixation;
  row-only reasoning; appearance-match analogy; examples-as-proof; elapsed-time vs item-position confusion;
  unwarranted certainty. Feedback names the violated condition and shows a repair, never "try again".
- Confidence, not a grade: before feedback an optional tap unsure / fairly sure / very sure. Never penalised.
- Wording rules A–F: A repeating chain is "made by repeating a block" (a finite row only suggests repetition; the
  unit is the shortest repeating block). B sequences: beginner items state the rule family ("use a constant-addition
  rule"); reasoning items accept any precisely stated rule that fits every shown term; "simple" makes a rule
  convenient, not forced. C circle regions: 1, 2, 4, 8, 16, 31 is the MAXIMUM (no three chords through one inside
  point); the regular hexagon gives 30 and is never labelled 31. D cycles: item n of a k-cycle (first item =
  position 1) sits at place ((n − 1) mod k) + 1; for elapsed time (n days after) remainder 0 = same day; each item
  says which kind it is. F the design-priority ranking is not an educational claim.
- Scope that does not change: browser HTML/JS on GitHub Pages; treasure signs and Stops 4–5 untouched; no mastery
  transfer across apps (an Observatory pass never unlocks Proof or the Junior Badge); EQ's Pattern Lab keeps the
  number drills; no outside links, chat, free text, ads, leaderboards; no timer during Do; iPad keyboard never
  opens for numbers.
- Done with the owner's OK (v0.10.0): the bridges' routine and the shared "the same routine as Pattern Lab" chip now
  use this order too (they were Notice, Compare, Describe, Predict, Test, Revise). `ROUTINE` in
  `src/game/pattern/bridges.ts` is the one list; the Observatory strip reads it.

## 1. The map: four stops, ten places

| Stop | Title (kid) | Plain label | Places (lessons) | Track | Levels |
|---|---|---|---|---|---|
| s14 | First Lights | Repeating Units | l1 Star Chain · l2 Repair Bench · l3 Echo Bells | 1 Repetition and structure | L1–L2 |
| s15 | Rule Rise | Growth Rules, Functions, Cycles | l1 Growing Staircase · l2 Rule Machine · l3 Clock Tower | 2 Change and functions (Clock Tower: 1) | L1–L3 |
| s16 | Deep Sky | Spatial Rules | l1 Mirror Pool · l2 Matrix Gate · l3 Analogy Bridge | 3 Relations and space | L1–L3 |
| s17 | Proof Lantern | Evidence | l1 Proved or a guess? · l2 Break it or test it · l3 Why it must continue | 4 Evidence and uncertainty | L2–L4 |

(The handoff's single Proof Lantern place is three lessons here because a stop needs 3–7 lessons; the three
lessons are its three levels: L2 proved vs tentative vs false, with circle regions and the hexagon; L3 counterexamples,
separating tests and a sampling item; L4 why a stated construction guarantees its pattern, the reason chain.)

Unlocks (skills, never stop numbers):
- s14–s17 all have `requires: []` at the stop level: the Observatory is reachable from the start and never blocks
  the main path. The Journey gets a third chip, "Observatory", listing these four stops (and a small star map).
- Places open on skills: `LessonDef.requires` lists lesson ids anywhere in the game (e.g. `['s14.l1']`,
  `['s2.l5']`), plus an optional 3-item `primer` the learner can take instead. A place opens when every required
  lesson is done, OR the diagnostic showed the skill, OR the primer was passed.
  - Star Chain: nothing. Repair Bench: shortest unit (`s14.l1`). Echo Bells: `s14.l1`.
  - Growing Staircase: nothing (counting to 30 is assumed). Rule Machine: compare terms (`s15.l1`) and rule testing
    (`s2.l5` or the rule-testing primer). Clock Tower: shortest unit (`s14.l1`) and grouping by k (primer).
  - Mirror Pool: nothing. Matrix Gate: sort by attribute (`s2.l1` or primer); one-rule grid before two is inside
    the lesson. Analogy Bridge: nothing for L1; sort by attribute for L2 items.
  - Proof Lantern l1: separating test (`s15.l2`) and counterexample (primer; the TM-01 bridge also counts);
    `s7.l1` recommended (a line, not a lock). l2 requires l1; l3 requires l2.
- Each ring ends with a mixed Ring Check of fresh items (= `StopDef.check`, 8–10 items covering every place, one
  `conflict` item), then the lock-in and week-later checks every stop already has.

## 2. Data model (shared core, built first)

### 2.1 Stops and lessons (`src/engine/types.ts`)
- `StopDef.requires?: string[]` stop ids that must be passed (`[]` = open from the start; `undefined` = the stop
  before it in the list, today's rule). `StopDef.lessonOrder?: 'sequence' | 'free'` (default sequence; Observatory
  'free': places open on `requires`, not on the previous lesson). `StopDef.observatory?: { track: 1|2|3|4;
  plain: string }`. `StopDef.skillNames?: Record<string, string>` (merged into SKILL_NAMES).
- `LessonDef.requires?: string[]`, `LessonDef.primer?: (rng) => Item[]` (3 items), `LessonDef.routine?: true`
  (the strip and the phases), `LessonDef.track?: 1|2|3|4`, `LessonDef.levels?: [min, max]`,
  `LessonDef.plain?: string` (adult label), `LessonDef.practiceAt?(rng, level): Item[]` (a pack for a level;
  `practice(rng)` stays the default pack and the contract pack), `LessonDef.review?(rng, stage): Item[]` (4 fresh
  items for a delayed review; default: `practice`), `LessonDef.independent?(rng): Item[]` (6 fresh items incl. a
  misconception item and an explain item; default: from `practice` + `check`).
- `ItemBase.phase?: 'explain' | 'do' | 'transfer' | 'review'`; `ItemBase.frame?: string` (a faded sentence frame
  with `___` for the blank; the screen fills the blank with the picked answer); `ItemBase.meta?: ItemMeta`;
  `ItemBase.level?: 1|2|3|4`; `ItemBase.rubric?: 0|1|2|3` (the explanation level an explain item needs);
  `ItemBase.errorTags?: Record<choiceOrValue, ErrorTag>` (misconception tag per wrong answer);
  `ItemBase.hints?: string[]` (hint sequence; `hint` stays the first); `ItemBase.twin?: string` (twin family id).
- `ItemMeta { skill: string; rule: string /* generating rule or assumptions, stated */; task: string; representation:
  string; difficulty: 1|2|3|4|5; answerType: 'categorical' | 'number' | 'order' | 'set'; alternatives?: string[]
  /* accepted alternative rules */; rubric?: string; tags: ErrorTag[]; twin: string; phase: Phase }`.
- `ErrorTag` union: 'oversized-unit' | 'copy-last' | 'off-by-one' | 'add-vs-multiply' | 'first-rule' | 'undo-order' |
  'row-only' | 'appearance-match' | 'examples-as-proof' | 'elapsed-vs-position' | 'zero-remainder' | 'unwarranted-certainty' |
  'reflection-vs-rotation' | 'same-objects-different-structure' | 'local-only' | 'error-near-end' | 'not-repeating'.
- New item kind `NumberItem { kind: 'number'; answer: number; min?: number; max?: number; unit?: string;
  feedback?: Record<string, ChoiceFeedback> /* keyed by the wrong number as a string */; whyWrong?: Record<string,
  string> }`. `Answer` gains `{ kind: 'number'; value: number }`. Graded by equality. Explanation for an unlisted
  wrong number: headline "Your answer was N. The rule gives M." + teach.
- Scenes (each in its own file under `src/engine/scenes/`, re-exported into the `Scene` union; every one has
  optional `steps?: { label: string; say: string }[]` for the stepped reveal and draws still frames):
  - `chain`: `{ kind: 'chain'; tokens: ChainToken[]; unit?: { start: number; len: number }; tryUnit?: { start; len;
    ok: boolean } ; blanks?: number[]; broken?: number; tray?: ChainToken[]; stated: string /* "made by repeating a
    block" */ }`; `ChainToken = { shape?: Shape; color?: Color; letter?: string; sound?: 'clap' | 'tap' | 'stomp' |
    'high' | 'low'; label: string }` (label is the caption read aloud).
  - `staircase`: `{ kind: 'staircase'; construction: string; rows: { step: number; cells: ('centre'|'end'|'old'|'new')[] }[];
    table?: { step: number; count: number | null }[] }`.
  - `machine`: `{ kind: 'machine'; rows: { input: number; output: number | null }[]; candidates?: string[];
    stated?: string /* "this machine uses one of these two rules" */ }`.
  - `clock`: `{ kind: 'clock'; cycle: string[]; counting: 'position' | 'elapsed'; start?: string; n?: number;
    highlight?: number }`.
  - `mirror`: `{ kind: 'mirror'; cells: string[] /* rows of '.' '#' */; fold?: 'v' | 'h'; turned?: boolean;
    pairs?: [number, number][] }`.
  - `matrix`: `{ kind: 'matrix'; size: 2 | 3; cells: (MatrixCell | null)[][]; rowRule?: string; colRule?: string;
    missing: [number, number]; glow?: 'rows' | 'cols' }`; `MatrixCell = { count: number; shape: Shape; color: Color }`.
  - `bridge`: `{ kind: 'bridge'; a: string; b: string; relation: string; c: string; d?: string; pictures?: boolean }`.
  - `lantern`: `{ kind: 'lantern'; points: number; chords: boolean; regions?: number; concurrent?: boolean /* three
    chords meet */; claim?: string; status?: 'proved' | 'tentative' | 'false' }`.

  The shapes above are the core's starting point; the files under `src/engine/scenes/` are the reference, with a doc
  comment per field. What the rings added while building (all still frames, all plain data):
  - `chain`: `frames?: ChainFrame[]` (one still per step: `tokens`, `unit`, `tryUnit`, `checked`, `miss`, `broken`),
    so a worked example can try a long block, then a short one, box the unit, or walk to a break.
  - `staircase`: `tag` ("Construction" or "Rule"), `head` (table headings), `rowName` ("2 links"), `jump` ("add 3"),
    `skin` (tiles, beads, seats), `reveal[k]` (rows and table entries drawn once k steps show).
  - `machine`: per-row `at` / `outAt` / `inAt` (when a row, its output or its input shows), `ruledOut` (a candidate
    crossed out at a step), `tries` (a separating test worked in the head), `rule` (the rule once known).
  - `clock`: `pair` (a second face beside the first), `captions`, `litAt`, `unit` ("days", "seasons", "slots").
  - `mirror`: `caption`, `ruler` (the step numbers), `candidates` (halves A, B, C), `frames` (cells, pairs, turned,
    candidates per step).
  - `matrix`: `tiles` + `heads` (a word grid, for a timetable), `allRule`, `frames` (glow, a trial tile with its
    fits/breaks verdicts, the gap filled).
  - `bridge`: `options`, `hidden` (the link not shown yet), cards for picture analogies, `frames` (link, d, a
    crossed-out look-alike).
  - `lantern`: `stated`, `pattern` (constructed or observed), `sequence`, `rows`, `claims`, `chain` (a lit reason
    chain), `regular`, `hideCount`, `frames` (merged in order over the scene).
  Read-aloud (`src/game/components/scenes/speech.ts`) follows the same reveal: it says what the picture shows at the
  steps on show, then the steps' own lines.

### 2.2 Save (`src/engine/save/save.ts`)
One new top-level key, parsed explicitly, carried through by older tabs:
```
evidence: {
  v: 1;
  lessons: Record<lessonId, { practiced?: day; complete?: day; independent?: { right; of; day };
            transferred: number /* unfamiliar contexts right first try */; retained: { stage: 0|1|2|3; day?: day };
            reviewDue?: day }>;
  log: EvidenceEntry[];   // newest last, capped at 300
  diagnostic?: { day; levels: Record<'1'|'2'|'3'|'4', 1|2|3|4>; shown: string[] /* skill ids shown */; overridden?: true };
  primers: string[];       // lesson ids whose primer was passed
  plain: boolean;          // plain labels for grown-ups (lives here so older tabs keep it)
  bridgeFirst: Record<eventId, boolean>;  // first tries on the Pattern Lab bridges
}
EvidenceEntry { item: string; lesson: string; skill: string; phase: Phase | 'check' | 'primer' | 'diagnostic';
  day: string; right: boolean; first: boolean; hints: number; supported: boolean; score?: 0|1|2|3; conf?: 0|1|2;
  tags?: ErrorTag[]; version: string /* content version, e.g. '0.10.0' */ }
```
Rules: first-try evidence is immutable after retries (a repair writes a new entry with `supported: true`, never
edits the first). Old saves start with empty evidence. Hard cap: the key is dropped from the log oldest-first above
300 entries; parse clamps everything.

### 2.3 Unlock and journey
- `viewAll`: a stop with `requires` opens when every listed stop has a `passDay` (empty list: always). Label:
  `Opens after Stop N` → built from the requirement (`Opens after ${titles}`); `StopScreen` uses the same helper
  (remove the duplicated inline rule). `frontierStop`, the Progress path strip and "out of N" count only stops
  with `n <= 13`; the Observatory gets its own line ("Observatory · k of 4 rings lit").
- `lessonWaitsFor(stop, lesson, save)`: for `lessonOrder: 'free'`, waits while a `requires` lesson is not done
  and no primer pass and no diagnostic credit; label "Needs: Star Chain (or take the 3-question primer)".
- Journey: route `track: 'main' | 'side' | 'observatory'`; chip "Observatory"; the observatory view shows the four
  stops as rows plus `ObservatoryMap` (an SVG of ten nodes in four rings, status-coloured, tappable).
- Regression test: `viewAll(STOPS, {}, today)` gives exactly today's statuses for s1–s13 and 'learning' for s14,
  s15, s16, s17 (ready stops with `requires: []`).

### 2.4 Screens and components (shared core)
- `NumberPad` (`src/game/components/NumberPad.tsx`): 0–9, backspace, OK; keys ≥ 44 px; aria labels; `role="group"`;
  a live display of the digits; hardware digits/Backspace/Enter accepted via a window listener while mounted (not
  when the focus is in an input); never a native input. Max 4 digits (`max` sets it). OK = Check.
- `RoutineStrip({ at: Phase | 'see' })` (`src/game/components/RoutineStrip.tsx`): the six moves, lit per phase
  (see: Notice, Describe; explain: Compare, Explain; do: Describe, Predict; transfer: Test, Predict; review: all).
- `LessonRunner`: for `lesson.routine`, show the strip above cards, boards and items; label tries by phase ("Explain
  1 of 2", "Do 2 of 3", "Transfer 1 of 1"); hide the old RoutineLine; order items by phase as the pack gives them.
- `ItemView`: 'number' controls (pad + frame); `frame` rendering for any kind; the confidence tap (three pills,
  optional, before Check, only when `item.phase` is set); evidence hook `onEvidence(entry)` through `AnswerRecord`
  (`conf`, `phase`, `supported`).
- `EvidenceCheckScreen` (route `{ name: 'evidence'; lessonId; kind: 'independent' | 'review' | 'primer' }`): runs
  `CheckRunner`-style items (no hints, no feedback until the end, no timer), then records to evidence and shows
  the profile change. Entry points: the stop page's place row ("Independent check", "Review due") and Home's plan.
- `DiagnosticScreen` (route `{ name: 'diagnostic' }`): 8–10 items, about 5 minutes, no timer, no hints. Per track,
  start at L1; two right in a row → up a level; the first miss ends that track. Items come from
  `StopDef.observatory.diagnostic(rng, level): Item | null` on each Observatory stop (the ring builder supplies
  them). Result: a level per track and the skills shown; "A grown-up can change this" behind the grown-up gate.
- Settings: "Plain labels for grown-ups" toggle (writes `evidence.plain`); Observatory screens use `plain` names.
- `EvidenceProfile` component: the five chevrons (Practiced · Lesson complete · Independent · Transferred · Retained)
  per place, with the item counts and dates as constants in `src/engine/evidence.ts`.

## 3. Content modules (one builder per ring)

Files per ring R (builders edit only these):
- `src/engine/scenes/<kind>.ts` (scene types, already stubbed by core; extend freely)
- `src/game/components/scenes/<Kind>Scene.tsx` + `src/game/components/scenes/<kind>Speech.ts` (renderer and
  read-aloud; core wires the switch cases)
- `src/styles/observatory-ring<R>.css` (classes prefixed `play-ob-`; imported by core)
- `src/engine/puzzles/observatory/<module>.ts` (generators, validators, tests `src/engine/__tests__/obs-<module>.test.ts`)
- `src/content/stop1<R+3>.ts` (the StopDef: lessons, check, practice, fresh, skillNames, observatory.diagnostic)
- `src/content/world/s1<R+3>.ts` (real life: stop line, per lesson `why` + 3 uses, per skill 1–2 lines)

Every item declares `meta` (§2.1) and `phase`; every wrong answer has feedback that names the violated condition and
shows the repair (`ChoiceFeedback` / number `feedback`); hints are a sequence (`hints`); a twin family; error tags.
Every lesson: 3–7 idea cards (See, with a stepped scene), at least one `drill` board (the faded example may be a
board), `practice(rng)` = the planned pack: explain items first, then do (faded, then unframed), then transfer,
3–5 items; `pass: { firstTry: 3, include: [trap tag] }`; `requires`/`primer`; `review(rng, stage)`;
`independent(rng)`; `routine: true`; `track`; `levels`; `plain`.

### Ring 1, s14 First Lights (Track 1)
- **Star Chain** (L1–L2, needs nothing). See: "this chain is made by repeating a block"; the glow box tries a too-long
  block, then the shortest, checking each against the whole chain (steps). Explain: why triangle-circle is not the
  unit (position 3 would be a triangle). Do: faded (the box drawn, one star blank) then extend with no help (tap a
  tray star into the slot) and box the shortest unit; AB, ABB, ABC, AABB. Transfer: the same unit as captioned
  sounds or a desk rota. Trap: unit-not-shortest (a longer block also repeats); tag oversized-unit; also copy-last.
- **Repair Bench** (L2, needs shortest unit). See: the intended rule stated ("this chain is meant to repeat ABC");
  the box walks unit by unit and stops at the mismatch. Explain: which position breaks the rule and how you know.
  Do: tap the broken star and swap it; then create: pick a unit, build 6–8 stars, box the unit. Transfer: a bead
  necklace or a weekly chore rota. Trap: error-near-end; also "can this chain be made by repeating a block?" (No
  for a random chain; tag not-repeating).
- **Echo Bells** (L2, needs shortest unit). See: a colour chain as high and low bells, then claps, then letters, with
  captions for every sound. Explain: why clap-tap-tap matches ABB (position 1 differs; 2 and 3 match). Do: faded
  rebuild with one slot open, then rebuild in a new set. Transfer: movements or a timetable. Trap:
  same-objects-different-structure.
- Ring check, diagnostic items (extend AB at L1; box the unit of ABB at L2), review and independent packs.

### Ring 2, s15 Rule Rise (Track 2; Clock Tower is Track 1)
- **Growing Staircase** (L1–L3). See: "each step keeps the centre stone and adds one pair"; new stones glow; a
  step/stones table fills. Explain: why step 10 has 21 (1 centre + 10 pairs, not just "it adds 2"). Do: faded "step
  12 = 1 + 2 × ?" on the pad, then step 15 unframed; a contrast item: a constant-addition sequence (nine jumps from
  term 1 to term 10); a shrinking version later. Transfer: necklace 1 clasp + 2 beads per link; chairs around joined
  tables. Trap: position-not-just-next; tag off-by-one (jumps), local-only, add-vs-multiply.
- **Rule Machine** (L2–L3; needs compare terms + rule testing). See: 4 for 2; "add 2" and "double" both light; the
  guide picks input 3 (5 vs 6), then the limit: the winner survives among these candidates. Identify-the-rule items
  state "this machine uses one of these two rules". Explain: why feeding 2 again tells you nothing. Do: choose a
  separating input; fill table cells on the pad; build the rule from parts; run output = 2 × input + 1 backwards on
  whole numbers (state the domain; one-to-one only). Transfer: two explanations of a process, which setting to test.
  Trap: first-fit; tags first-rule, undo-order. Generators must know when candidates are separable.
- **Clock Tower** (L3; needs shortest unit + grouping by k primer). See: two ways of counting side by side; each item
  labelled position or elapsed. Explain: why item 40 of ABCD is D but 21 days after Thursday is Thursday. Do:
  faded "99 = 33 × 3, so position 100 starts a new cycle: ___", then fresh items incl. exact multiples and
  boundaries (n = k, k + 1, 2k); shape/letter/weekday answers use choice cards; only numbers use the pad.
  Transfer: desk schedule slot 15; units-digit cycles at L3. Trap: zero-remainder; tag elapsed-vs-position.
- Diagnostic items: next term under a stated constant-addition rule (L1); step 5 from a stated construction (L2);
  pick a separating input (L3); item 10 of a 3-cycle (Track 1 L3).

### Ring 3, s16 Deep Sky (Track 3)
- **Mirror Pool** (L1–L2). See: a picture folds; matching points pair across the fold line; then a turn, to compare.
  Explain: reflection or turn, and why (each point's partner is the same distance across the line). Do: L1 tap the
  half that matches; L2 finish the half on a dot grid by tapping dots, or place the fold line. Transfer: letters,
  house fronts, arrows. Trap: rotation-lookalike; tag reflection-vs-rotation.
- **Matrix Gate** (L2–L3). See: rows glow for rule 1, columns for rule 2, both stated in words; colours carry text
  labels. Explain: which rule does this wrong tile break? Do: a 2×2 one-rule grid, then 3×3 two-rule; a validator
  classifies every option as breaking the row rule, the column rule or both, and feedback names which (never promise
  "each wrong tile breaks exactly one rule"). Transfer: a timetable grid (day × subject). Trap: row-only.
- **Analogy Bridge** (L1–L3). See: a plank between key and lock with the word "opens"; the word must carry across.
  Explain: name the relation before choosing. Do: same dimension first (big:small), then across dimensions, then
  words. Transfer: pairs from a new domain (tools, animals, jobs). Trap: appearance-match (one option is a look-alike).
- Diagnostic items: match a simple flip (L1); a relational analogy (L2); a one-rule grid (L3).

### Ring 4, s17 Proof Lantern (Track 4)
- **l1 Proved or a guess?** (L2). See: "join every pair of points, with no three chords meeting: what is the most
  regions?" 1, 2, 4, 8, 16; the lantern guesses 32; the drawing shows 31; then the regular hexagon: 30. A
  `lantern` scene must pass a validator that counts chord crossings and refuses a 31 label if three chords meet.
  Explain: proved, tentative or inconclusive, and why. Do: sort fresh claims (proved because / tentative / false
  with a counterexample). Transfer: completion times improve for three days: is the process proved faster? (No;
  say what more to check.) Trap: examples-as-proof; tag unwarranted-certainty.
- **l2 Break it or test it** (L3). Counterexamples ("every growing sequence doubles" → 1, 2, 3, 4), the separating
  test as evidence (links Rule Machine), a sampling item (fair coin, five heads: tails not due; independence).
- **l3 Why it must continue** (L4). A true pattern from a stated construction: start at 1, add 3; odd and even
  alternate because adding an odd number flips parity (4.OA.C.5). Light each step of a reason chain (order item);
  five listed terms alone do not explain it.
- Diagnostic item: "proved or good guess?" (L2). `s7.l1` is recommended in a card line (never a lock).

### Also in this round (bridges, by the Ring 1 builder)
- LC-01 gets ABB/ABC variety (not only AB); TI-01 gets its own content (one relation in two settings); bridges
  record first tries (`evidence.bridgeFirst`) so they count as practice. The routine order of the bridges is NOT
  changed (owner's OK needed).

## 4. Acceptance checks (automated where possible; `src/engine/__tests__/observatory-core.test.ts` and the ring tests `obs-ring1..4.test.ts`)
1. Every sequence item states its rule family (`meta.rule`) or lists `meta.alternatives`.
2. Every cycle item says position or elapsed (`clock.counting`, in the prompt), and the generator's tests cover
   exact multiples and boundaries (n = k, k + 1, 2k).
3. A hinted response cannot become an independent pass by retrying (evidence: `supported: true` entries never
   set `independent`); the learner still gets full feedback.
4. A supported repair and a fresh twin are distinguishable in the log (`supported`) and on screen (kicker
   "Repair this one" vs "A fresh one").
5. Each skill has routine, misconception, transfer and delayed-review items (every lesson's pack has an `explain`,
   a `do`, a `transfer`; `review()` returns 4; `independent()` returns 6 with an error-tagged item and an explain item).
6. Machine generators know when candidates are separable (test); reverse tasks state a domain and avoid
   many-to-one inverses (test).
7. Reload keeps supported, independent, transfer and retention states (save round-trip test); legacy saves work
   (a v0.9.0 save parses with empty evidence).
8. Protected lessons (treasure signs, Stops 4–5) are unchanged (their test files pass untouched); the new unlocks
   never create an unreachable stop or block the main route (regression test on `viewAll`).
9. A circle diagram meets the maximum-region condition before any 31-region claim (validator test).
10. Pilot: out of scope for code; the thresholds live in one constants file with a comment.

## 5. Where the core lives

- Types: `src/engine/types.ts` (ItemBase phase/frame/meta/level/rubric/errorTags/hints/twin, NumberItem, LessonDef
  routine/track/levels/plain/requires/primer/practiceAt/review/independent, StopDef requires/lessonOrder/skillNames/
  observatory) and `src/engine/scenes/*` (one file per scene kind).
- Evidence: `src/engine/evidence.ts` (the profile, the log, the diagnostic rule, the thresholds in `EVIDENCE`);
  saved under `SaveData.evidence` (`src/engine/save/save.ts`).
- Unlocks: `requiredStops` / `stopOpening` / `viewAll` in `src/engine/journey/mastery.ts`; `placeWaitsFor` in
  `src/engine/drill.ts`; helpers in `src/game/observatory.ts`.
- Screens: `JourneyScreen` (Observatory tab, `ObservatoryMap`), `StopScreen` (places with their `EvidenceProfile`,
  primer and evidence rows, the diagnostic row), `EvidenceScreen` (independent check, review, primer),
  `DiagnosticScreen`, `LessonRunner` (`RoutineStrip`, phase labels), `ItemView` (`NumberPad`, the faded frame, the
  confidence tap), `SettingsScreen` (plain labels).
- Pictures: `src/game/components/scenes/*` (one component file per ring, `speech.ts` for read-aloud),
  `src/styles/observatory.css`; the circle-regions safeguard in `src/engine/puzzles/observatory/lantern.ts`.
- Tests: `src/engine/__tests__/observatory-core.test.ts` (acceptance checks 3, 4, 7, 8, 9), plus each ring's tests.

## 6. Build order
1. Core (shared): §2 types, save key, unlock rules, Journey track + map, NumberPad + number item, RoutineStrip,
   phases in the runner, evidence logging and screens, diagnostic shell, settings toggle, scene switch stubs, four
   placeholder stops (ready: false until built) and world files, tests updated.
2. Rings 1–4 in parallel (builder + reviewer each), filling the stubs.
3. Integration: diagnostic wiring, full tests, browser pass at 320/375/430 incl. Stops 1–7 regression, docs,
   v0.10.0, commit/push; ask the owner about publishing and about the bridge routine order.

All three are done (v0.10.0). The integration pass also added: a place's quiz picks its items at the learner's level on
its track once a diagnostic was taken (`practiceFor` in `src/engine/drill.ts`; the saved run's plan key includes the
level); a choice label inside a sentence frame reads in lower case; read-aloud follows the revealed steps; the
reading-contract test reads every scene's words (rules, captions, claims, headings, options, frames).

## 7. Known limitations and follow-ups

Raised by the ring reviewers; none blocks play. In rough order of value:
- **A build-a-chain item kind.** Repair Bench's "create" task (make a chain from a stated unit) is asked as a choose
  item today; a tray-to-slot kind would let the learner build it. Needs an item kind, grading and a board.
- **Boards on stepped scenes.** A `DrillStep` on a stepped scene shows the worked result (the picture's last frame).
  A `revealed` or frame option on `DrillStep` would let the board start from the bare picture.
- **Multi-blank frames.** `ItemBase.frame` takes one blank; a two-blank frame ("___ then ___") needs a frame per
  choice or an ordered pair.
- **Primers waive everything.** A passed primer or a diagnostic credit opens a place whatever it requires; a place
  with two requirements should ask for the one not shown (`placeWaitsFor` in `src/engine/drill.ts`).
- **Per-level requirements.** Analogy Bridge at L2 could require Mirror Pool only at L1; requirements are per
  lesson, not per level.
- **Error tags.** 'row-only' has no 'column-only' twin; Matrix Gate tags a column-only pick as 'row-only'.
- **Wording.** Ring 2 says "step 0" for the start of an elapsed count and the handoff says "day 0" for calendars;
  both are kept where each reads best (the clock says what one step is called: days, seasons, slots).
- **Number items with a narrow pad.** A `digits: 2` item cannot take a 3-digit wrong value, so its 3-digit
  `feedback` entries are unreachable (Rule Machine's backward run).
- **Diagnostic credit.** Track 3 at L3 (a one-rule grid) credits Matrix Gate (`s16.l2`), its home lesson.
- **Bridges.** Re-ordered to the Observatory's routine with the owner's OK (v0.10.0). The bridge questions kept their
  content: Describe asks, Compare is a line, Test asks how to check, Predict commits before the test result shows,
  Explain states what the evidence supports. The Explain chip reuses the pencil icon.
- **ContrastWords icon.** The contrast card's neutral icon is the same for both sides; a per-side icon is a polish item.
