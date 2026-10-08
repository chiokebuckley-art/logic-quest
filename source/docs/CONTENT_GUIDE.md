# Writing a stop

Every stop is one file, `src/content/stopN.ts`, exporting a `StopDef` (see `src/engine/types.ts`). Puzzle
generators live in `src/engine/puzzles/`. The contract test checks every rule below:

```bash
STOP=2 npx vitest run src/engine/__tests__/stops.test.ts
```

## Shape

- **3–7 lessons**, ids `sN.l1`, `sN.l2`, … (one method per lesson: a new rule family gets its own lesson)
- Each lesson starts with **3–7 key-idea cards**. They are taught before any question. One card shows a worked
  case already marked on its board (see "Teach before the quiz").
- Then the lesson's **guided boards** (`drill`): the learner marks a new case on that board by taps.
- `practice(rng)` gives **3–5 quiz items** in at least two skins: an everyday story, a fantasy story, and
  abstract letters or shapes. Every one is in the rule family the lesson taught.
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

## Teach before the quiz: See, Do, Quiz

The rule (skill-drill handoff, 2 October 2026): every new method is **See one marked case, Do one with taps, then
Quiz a twin**. Never introduce a new rule family inside a quiz set. A lesson is not passed until the learner has
performed the skill: a learner who only taps Next fails, and a learner who marks the guided case meets a twin quiz
of the same rule. The reference is Stop 1, Lesson 4 (Treasure signs: `L4_DRILL` in `src/content/stop1.ts`, built by
`signDrill` in `src/engine/puzzles/signs.ts`).

- **See** (`ideas`): one card shows one case already marked on its board, with its truths. In Treasure signs the
  worked example is one chest per card on the case board (`signWalk`): Gold, then Silver, then Bronze, then a card
  with every verdict. Each sign gets its stamp one step at a time with a one-line reason (`Scene` kind `cases` with
  `steps`); the card's main button shows the next step and says Next only once the whole case is showing.
- **Do** (`drill`, a list of `DrillStep`s): the same board as the See card (the same scene), or a twin that
  changes one piece (say what changed in `twin`).
  - Show the worked case as a given row where it helps (Silver: False, False, True, Keep).
  - The learner marks a new case (Gold: True, True, False, Reject). No final-answer buttons on the board.
  - Sign puzzles use the **case board** (`layout: 'cases'`, built by `signDrill`): the boxes are drawn as cards.
    Tap a box to pretend the treasure is there; tap each sign to stamp it (empty, then True, then False and back);
    the board counts the True stamps (never typed); then Keep (a ring) or Reject (a cross). Keep and Reject are
    never turned off by the count: the learner applies the rule. "Clear this case" empties one case only. Each row
    has `case` (its box) and each stamp has `on` (the sign it sits on). Board copy uses the board's own words:
    "stamp", "Keep", "cross it out".
  - Build boards with an engine helper, so every answer is computed. Never hand-assert one.
  - Every wrong option of every mark to tap has a `why` that names that exact mismatch in plain words: “If the
    treasure is in the Gold chest, the Silver chest sign is true. It says, “The treasure is not in this chest.”
    The treasure is not in the Silver chest.”
  - Options: `true`/`false`, `fit`/`not` (put the card on each mark with `thing`), `holds`/`crashes`,
    `keep`/`reject`, counts `'0'`–`'3'`, names, `cant`. Grid boards set `columns` and use `YES_NO`.
  - Keep a board phone-sized: about 12 taps or fewer. Use a second board instead of one big one.
- **Quiz** (`practice`): twins of the same rule family only. Move a family no See and Do taught out of the pack,
  and out of the stop check, the Arcade and the new examples too. Treasure signs now uses only “Exactly one sign
  is true.”
  - A first quiz can carry its own board (`workFirst`), marked before its answer buttons show. Treasure signs
    starts with the example's **twin** on the case board (one sign changed and a new answer: Bronze's sign loses
    its “not,” so the answer moves from Silver to Bronze), then the frozen Ice, Fire and Moss caves on the same
    board. A wrong mark on such a board means that try is not a first try (`onWrong`, saved at once); empty marks
    only get a gentle instruction. Lessons 5–7 start with their own twin the same way.
  - Later sign questions offer the same board as an optional thinking tool (`ItemBase.scratch`, “Use the case
    board”). It is never checked and never shown in checks.
  - Every hinted item has `hintCase`: one marked case, not the answer case. A hint models the method; it never
    only restates it.
- **Pass** (`pass`): the boards marked right, then 3 right on the first try with no hint (the default). A lesson
  can ask for them in a row, or include a tagged kind (`include` with `ItemBase.tags`, such as a false statement
  or a Can’t tell). Every include tag must be in every planned practice pack. Extra items come from the lesson’s
  own practice until the rule is met.

The contract test checks the boards (`stop N: See -> Do -> Quiz` in `stops.test.ts`). Each stop's drill worksheet
is in `docs/audit/drill-stopN.md`.

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

## Ways to Think (Stop 7): a good guess is not a proof

Stop 7 teaches ways of thinking that give a good guess, not a proof: pattern guesses, the best explanation, causes,
fair choices and gut feelings. Each lesson is its own module (`src/content/stop7/<name>.ts`, with its puzzles in
`src/engine/puzzles/<name>.ts`) and follows the same rules as every lesson, plus these:

- **Show where it fails.** Every quiz pack holds one question tagged `can-fail` (the pass rule asks for it): a
  streak broken by a new draw, a best guess ruled out by a new clue, a third thing that causes both, a wish that
  pushes against the facts, a strong feeling that the count proves wrong.
- **Same words for the same ideas** across the stop: “a good guess”, “a proof”, “for sure”, “likely”, “check it”.
  Must / Likely / Unlikely / Can’t come from counts (more than half is Likely; never an exact half).
- **Answers come from a model**, as everywhere else: counts in a bag, which idea fits which clue and its extra things,
  a table of tests where only one thing changes, three checks per choice from the story's facts, counts of big and
  small things.
- **Fair choices stay kid-sized:** found things with a name tag, a promise to give something back, a turn, a broken
  cup. The three checks are honest, fair to the person (or keeps the promise) and hurts no one. No grown-up ethics
  words.
- **Gut feelings are not always wrong.** Some items have the count agree with the gut: the feeling was a good start,
  and only the count showed it was right.

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
- `seconds`: a longer check time for big items (150–180 for grids and three islanders; 120–150 for the long
  explanation stories in Stop 7, Lesson 2).

Skill tags (`sN.short-name`) appear on the Grown-ups screen. Add a plain name for each new tag to `SKILL_NAMES` in
`src/game/progressStats.ts`. Every miss becomes a Wrong-Answer Notebook card for its skill, so each skill must
appear in its lesson's practice sets. That is where the fresh repair question comes from.

## Real life: where each idea is used, and why

Every ready stop has a real-life file, `src/content/world/sN.ts` (types in `world/types.ts`), the way Engineering
Quest shows where engineers meet each skill. It holds:

- **`stop`**: one sentence on where the stop's big idea is used (stop page, Library). Coming stops have theirs in
  `world/soon.ts`.
- **`lessons[id].why`**: why the idea matters, the thing to keep in mind (1–2 sentences, ≤ 30 words). It shows on
  the lesson's first card ("Why it matters") and again on its last screen ("Keep in mind").
- **`lessons[id].uses`**: three real uses of exactly that idea, each `{ who, kind, text }`: at least one `life` (a
  kid's everyday life: school, home, games, shops, sports) and one `work` (a job). Three different `who`s (≤ 5 words),
  each text ≤ 3 short sentences and ≤ 40 words. They show on the lesson's last screen ("Where this is used"), in the
  Library's Real life view, in search, and one a day on Home ("Remember why").
- **`skills[skill]`**: 1–2 lines for every skill the stop can ask about, shown under the reason after a right
  answer as "In real life: …" (never start a line with those words). Each shows that skill's exact move.

The rules that matter most are not mechanical:

- **True, today.** No invented numbers, no named people, brands, apps or places: roles only ("Nurses", "Referees",
  "You, at the store").
- **Exactly the lesson's logic.** Not "related to" it. Everyday words can differ from the game's (everyday "or" often
  means one but not both; spoken "if" often means "only if"): pick an example where the logic matches, or say the
  difference out loud. A loose example teaches the wrong idea.
- **Concrete and varied.** Who, the situation, and what the idea lets them do or stops going wrong. A job at most
  twice in a stop; no situation repeated anywhere in the game.
- **Kid-safe and plain.** No alcohol, smoking, gambling, weapons, crime, police, war or dating; doctors, vets and
  firefighters in calm, everyday terms. Curly quotes and apostrophes only.

The contract test checks coverage, shapes, lengths, curly quotes, banned words, repeats and the reading level:

```bash
npx vitest run src/engine/__tests__/world.test.ts -t "stop 2"
```

## The Pattern Observatory

Stops 14–17 are a side constellation of pattern recognition with its own lesson shape: See → Explain → Do → Transfer →
Review, the routine strip (Notice → Describe → Compare → Test → Predict → Explain), items that declare their rule
and their error tags, a number pad for numeric answers, and an evidence profile per place (Practiced · Lesson
complete · Independent · Transferred · Retained). The spec and the content rules for its ten places are in
[`OBSERVATORY.md`](OBSERVATORY.md). Everything in this guide (reading level, curly quotes, teach-first wrong answers,
See → Do → Quiz, real life, distinctions) applies there too.

## Distinctions: two ideas a learner can merge into one

*This is the Logic Quest half of a rule for every educational app here: [`../../docs/design-rule-hidden-distinctions.md`](../../docs/design-rule-hidden-distinctions.md).*

A learner can know every word in a question and still be confused, because two ideas have collapsed into one
mental category. The treasure signs showed it: "the treasure is in this chest" was read as "this chest's sign is
true", and the program only said which mark was wrong. For every lesson, ask: *what must a learner already keep
apart for this instruction to make sense?* Then teach that boundary before the quiz, and build the method so the
reasoning stays visible until it is not needed.

- **Declare it.** `LessonDef.distinctions: [{ id, a, b }]` names the two sides ("Where the treasure is (the test
  world)." / "Whether a sign's words are true in that world."). A later lesson that relies on it adds
  `taughtIn: '<lesson id>'` and still carries a reminder card.
- **Teach it with a contrast.** Where it is first taught, a key-idea card with `distinction: id` and a `contrast`
  scene: two cases side by side that differ in one thing (same test world, different words; or same words, different
  world), each with the comparison that gives its truth, then the question under them ("Did the treasure move? No.
  Only the words changed."). A board with `distinction: id` right after it (`afterCard`) has the learner do the two
  cases themselves. Only then comes the worked example.
- **Show the comparison, in words.** Every truth value comes with its reason as three rows: what it says, what the
  test world says, whether they fit. Never symbols (=, ≠, ✓ alone). A worked step carries `because`; a mark the
  learner sets carries `compare` (the two facts, no verdict), shown under the mark while the method is new; a
  `Truth` on a hint or Teach case carries `because` too. This works on every board layout: case boards, plain row
  boards (`DrillBoard` draws `compare` under a mark to tap, a because row under a shown mark, `DrillRow.needs` over
  a row), and case cards (`CaseCard` in the explanation).
- **Use the lesson's words.** `DrillStep.words` (a `BoardWords`) and `TeachCase.words` rename every label: the three
  rows (`says`, `world`, `so`: "Says / In this case / So"), the verdict lines (`fit`, `unfit`), the compare question
  (`ask`), the test-world tag and note (`worldTag`, `worldNote`), the words before `needs` (`needs`; an empty string
  shows the need on its own), the truth words on a case card (`truth`, `untruth`: "Fits" / "Not") and the closing line
  of "I'm confused" (`closing`). A contrast scene has `words` of its own (`ContrastWords`: `worldTag`, `saysWord`,
  `truth`, `untruth`), and each panel may carry `things` (a picture of cards) and `then` (the need or verdict that
  follows). The defaults are the sign words, so a card, line-up, knight or cause board must set them.
- **Keep the assumption on screen.** The test world is drawn (the treasure in the pretend chest) and named over the
  board, and the rule's need sits next to the count, so nothing has to be held in working memory. A speakers scene
  has a `test` banner ("Test world") beside its `fact` banner ("What is true"), so a guess is never shown as a fact.
  While a case's stamps are blank, the rule banner is tagged "Check this after the stamps".
- **Fade the scaffold.** `DrillStep.scaffold: 'full'` on the Do board and the first quiz (compare facts under every
  mark, the need over each row, the method's steps lit: `DrillStep.steps`, or the case board's own list); later
  boards are `'light'` and show the facts only for a row that had a wrong mark. On a quiz item, use `Item.workFirst`
  (a board before the answer buttons) for the full scaffold and `Item.scratch` (with `scratchLabel`: "the test
  board") for an optional one.
- **Name the belief, not only the mark.** `DrillStep.misconceptions`: patterns of wrong marks that reveal a belief,
  each with words that teach the distinction and end with the concrete case. `checkDrill` shows them before the
  first wrong mark's words. The kinds `diagnose()` knows, on every layout (a row's statements are all its marks but
  the last; the last is its verdict): `fit-rule` (case boards: wrong stamps, the count the rule needs and Keep),
  `own-true` and `own-false` (case boards: the picked box's own sign), `copied` (a row copies another row's right
  marks), `all-one` (every mark of the row the same), `verdict-only` (right marks, wrong verdict) and `picks` (the
  marks the author lists are set to the options listed, and at least one is wrong: "every words mark set to what the
  speaker's kind demands"). List them most specific first. Sign boards get rule-aware texts from
  `signMisconceptions(skin, rule)`.
- **"I'm confused."** `DrillStep.confused` (and `Item.confused`): one to three short questions, one per distinction,
  each with one right option, that find the first merged idea and teach it apart. They never give the board's answer,
  and opening them counts as help, like a hint. Set `words.closing` so the last line fits the lesson.

The contract test checks that every declared distinction has its card (with a contrast picture and a board where it
is first taught), that every case board carries its misconceptions and questions, and that all of it reads at the
game's level. The audit that found the gaps, lesson by lesson, is `docs/audit/hidden-distinctions.md`; its "How to
apply" section maps every P0 and P1 finding to these pieces.

## Reading level

The first players read at a 6th-grade level. Every lesson's cards, prompts and explanations must score a
Flesch-Kincaid grade of **7.0 or lower**, with no sentence over **25 words**. In practice:

- Most sentences under 15 words. Everyday words. Say "you".
- Define a new word the first time it appears.
- No idioms or emoji. US spelling.
- Calm and encouraging, never babyish. Use "Not yet", not "Wrong".
