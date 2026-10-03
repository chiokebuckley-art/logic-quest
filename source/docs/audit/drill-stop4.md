# Skill-drill audit: Stop 4 (Grid Detective)

The handoff is “Logic Quest: teach before the quiz” (2 Oct 2026). Its core rule: every new method is See one marked
case, then Do one with taps, then Quiz a twin. A lesson is not passed until the learner has done the marks. A new
rule family never shows up inside the quiz.

For Stop 4 the handoff says: the learner turns a clue into a ✓ or a ✗, and fills a row or column when one box is left.
See a small grid with Mia’s clue marked. Do the same grid: place Leo’s marks, then tap the last box. “Isn’t” and “or”
come later in the quiz, never as the opening ask. Lessons 2 to 5 follow the same pattern from their own cards.

How the engine keeps every value honest:

- The boards are built by two helpers in `engine/puzzles/grid.ts`. `gridBoard` makes a logic grid to tap.
  `cardBoard` makes rows of labelled choices. Each row says what it knows: the marks a card picture draws, and the
  clues it names.
- Every answer comes from `fitting`, which lists every way to fill the grid and keeps the ones that fit. A grid board
  throws if any box is not decided, or if a shown box is not what the clues give.
- The words for a wrong tap come from `humanSolve`, the pencil solver. So each reason is the clue that says it, the
  ✓ that spreads to it, the last box left in its line, or the link that carries it. Nothing is written by hand.
- The tests in `engine/__tests__/grid.test.ts` work every mark out again from the words alone. They read each clue
  sentence with their own reader, read the card picture’s marks, read the question in each mark’s label, and solve
  by their own brute force.

A board shows a grid in one of two ways. A logic grid board (`columns`) is the card’s grid itself: same rows, same
columns, and its shown boxes are the card’s marks. It does not draw the card’s picture above it, since that would
show the same grid twice. A two-part board draws the known part as the picture and the other part as the grid to
tap. A board of rows draws the card’s own picture or clue list above the rows.

## Lesson 1 · Check marks and crosses

**See.** A new picture on the card “One each” is the handoff’s small grid. Rows Mia and Leo. Columns apple and bread.
Mia’s clue is already marked: ✓ on Mia – apple, ✗ on Mia – bread. The caption says “Mia has the apple. A ✓ in a row
crosses out the other boxes in its row.” The card also says that when one box in a row is left, it gets the ✓. The
“Or” clues card now shows its pet grid with Ava – cat already ✗. The cards keep their order, except “Turn clues into
marks” now comes before “One each”.

**Do.** Two boards.

1. “Mark Leo’s row,” the handoff’s sample, on the “One each” grid. Mia’s row is shown. Clue 2: “Leo does not have the
   apple.”

   | Box | Right tap |
   |---|---|
   | Leo – apple | ✗ (from clue 2) |
   | Leo – bread | ✓ (the last box in Leo’s row) |

   Example why, for a ✓ on Leo – apple: “Clue 2 says Leo does not have the apple. So Leo – apple gets a ✗, not a ✓.”
   For a ✗ on Leo – bread: “Leo – apple gets a ✗. Leo has just one snack. So Leo – bread gets a ✓, not a ✗.” (It
   says “gets”, not “has”, because the learner may not have tapped Leo – apple yet.)

2. “One clue at a time,” on the “Or” clues grid. Each row is one clue by itself. Each box is Yes, No or Can’t tell
   yet (it stays empty). Ava’s “or” clue is shown: Ava – cat No, Ava – dog and Ava – fish Can’t tell yet.

   | Row | Right taps |
   |---|---|
   | Only clue: Leo has the cat. | cat Yes, dog No, fish No |
   | Only clue: Leo does not have the dog. | cat Can’t tell yet, dog No, fish Can’t tell yet |
   | Only clue: Mia has the cat or the fish. | cat Can’t tell yet, dog No, fish Can’t tell yet |

   Example why, for No on Mia – cat: “The clue names the cat as one choice for Mia. So Mia could have the cat, and Mia
   – cat stays empty for now.”

**Quiz.** Nothing moved. The quiz asks which box a clue marks: “has,” “not” and “or” clues. All three are now marked
on a card and done on a board. Try 1 is always a “has” clue. Tries 2 and 3 are one “not” and one “or”, in either
order, and try 4 is any of the three. The practice opens only after both boards, so “isn’t” and “or” never come first.

**Pass.** The default: both boards right, then 3 right on the first try with no hint. The handoff asks only that the
guided grid is the learner’s own taps, which the runner already requires.

**Hint.** One box, checked against the clue, that is not the clue’s own box. For “Storm guards the pearl,” it shows
“Storm – ruby”: could guard the ruby, false; must, false; “So Storm – ruby gets a ✗.”

## Lesson 2 · Only one left

**See.** The three grid cards now carry captions that say what each picture shows. “The last box in a row”: “Two ✗s
in Leo’s row. The last box, Leo – fish, gets the ✓.” “The last box in a column” says the same for the fish column.
“Not so fast”: “One ✗ in Leo’s row. Two boxes are still empty, so you can’t tell yet.”

**Do.** One board, “Count the empty boxes,” on the “Not so fast” grid. Leo’s row is shown: 2 empty boxes, and Leo –
dog and Leo – fish both stay empty (Can’t tell yet). The learner marks boxes and counts. There is no “Which pet must
Leo have?” or “Who must have the cat?” button: the learner taps the last box itself, as the handoff asks.

| Row | Right taps |
|---|---|
| Add a ✗: Leo does not have the fish. | Leo – fish No; 1 empty box; Leo – dog Yes (the last box) |
| Back to the card’s grid. Look at the cat column. | 2 empty boxes; Mia – cat and Ava – cat Can’t tell yet |
| Add a ✗: Ava does not have the cat. | Ava – cat No; 1 empty box; Mia – cat Yes (the last box) |

Example why, for a count of 2 in the first learner row: “Count the empty boxes in Leo’s row. Leo – cat and Leo – fish
have a ✗. Only Leo – dog is empty. That makes 1, not 2.”

**Quiz.** Nothing moved. The last box in a row, the last box in a column, and Can’t tell yet are all on the board.
The quiz uses the same rule in other skins, and sometimes 4 × 4 grids.

**Pass.** The default.

**Hint.** One box of the asked row or column, on this very grid, that has a ✗: “In this grid, Ember’s box in the
pearl column has a ✗.” with “Ember could guard the pearl: false” and “A ✗ means no. So Ember is out.” It is never the
answer, and its truth holds on the grid the learner is looking at. (The builder’s hint showed a twin grid instead; see
the Review.)

## Lesson 3 · Spread the check mark

**See.** The cards stay as they were. “A ✓ fills its column too” is the marked case: one ✓ and four ✗s.

**Do.** Two boards.

1. “Spread a ✓,” on the “A ✓ fills its row” grid. Mia’s row is shown. The learner spreads her ✓ down the cat column,
   then checks two boxes outside both lines.

   | Box | Right tap |
   |---|---|
   | Leo – cat | No |
   | Ava – cat | No |
   | Leo – dog | Can’t tell yet |
   | Ava – fish | Can’t tell yet |

   Example why, for Yes on Leo – cat: “Mia – cat has a ✓. Only one kid can have the cat. So Leo – cat gets a ✗, not a
   ✓.”

2. “Finish the grid,” the “Spread, then look again” grid itself. Clue 1: Mia has the cat. Clue 2: Leo does not have
   the dog. Their marks are shown. The learner taps Leo – fish ✓ (last box in Leo’s row), Ava – dog ✓ (last box in
   the dog column) and Ava – fish ✗ (Leo’s ✓ spreads down the fish column). Example why, for a ✓ on Ava – fish: “Leo
   must have the fish. Only one kid can have the fish. So Ava – fish gets a ✗, not a ✓.”

**Quiz.** Nothing moved. Spreading a ✓ (row and column), the column-only spread, and the whole one-part grid are each
on a board. The second board is a whole grid finished by taps, so the one-part grid in the quiz is a twin.

**Pass.** The default.

**Hint.** A box outside the ✓’s row and column, checked: could, true; must, false; “stays empty for now.” The answer
never holds that box. A whole grid’s hint shows the first mark one clue gives by itself, such as “Clue 1: Frost does
not live in the hill cave.” with “So Frost – hill cave gets a ✗.”

## Lesson 4 · Linking clues

**See.** “Links work both ways” now has a picture: the snack part of the grid, with Ava eating popcorn. The card
says the kid with the dog eats popcorn, so Ava has the dog. “Use what you know” keeps its pet grid.

**Do.** Three boards.

1. “Carry a link across.” The “Use what you know” pets stay up as the picture. The grid to tap is the snack part.
   Clue 1, the dog and popcorn, is shown in the popcorn column. Clue 2: the kid with the fish eats apples. The
   learner taps the apples and grapes columns: Ava – apples ✓, the rest of apples ✗, Mia – grapes ✓ (last box),
   the rest of grapes ✗. Example why, for a ✓ on Mia – apples: “Clue 2 says the kid with the fish eats apples. Mia
   does not have the fish. So Mia – apples gets a ✗, not a ✓.”

2. “A ‘not’ link,” on the same pets. Shown: the dog does not eat popcorn, so Leo – popcorn No, and Mia – popcorn and
   Ava – popcorn stay empty (Can’t tell yet). The learner marks boxes; there is no “Who must eat popcorn?” button.

   | Row | Right taps |
   |---|---|
   | Add clue 2: The kid with the cat does not eat popcorn. | Mia – popcorn No; Ava – popcorn Yes (the last box) |
   | A new clue on its own: The kid with the fish does not eat grapes. | Ava – grapes No; Mia – grapes and Leo – grapes Can’t tell yet |

   Example why, for Yes on Mia – popcorn: “Clue 2 says the kid with the cat does not eat popcorn. Mia has the cat. So
   Mia – popcorn gets a ✗, not a ✓.”

3. “Use a link the other way,” on the new snack picture. The grid to tap is the pet part. Ava’s row is shown: the
   dog. Clue 2: the kid with the cat eats grapes. The learner taps Mia’s and Leo’s rows: Mia – cat ✓, Leo – fish ✓,
   the rest ✗. Example why, for a ✗ on Mia – cat: “Clue 2 says the kid with the cat eats grapes. Mia eats grapes. So
   Mia – cat gets a ✓, not a ✗.”

**Quiz.** Nothing moved. A link, one “not” link (Can’t tell yet), two “not” clues (one left), and the whole two-part
grid are each on a board. The two-part grid needs links used from either end, which boards 1 and 3 do.

**Pass.** The default.

**Hint.** One person the clues cross out, never the answer, such as “Moss guards the pearl.” with “Moss could live in
the sea cave: false. The clue crosses out Moss.”

## Lesson 5 · No guessing

**See.** A new card, “Use only the clues you are told,” shows a list of three clues and works one case: with only
clues 1 and 2, only Ava can have the fish, and clue 3 is not needed. The clue cards now share their scenes with the
boards.

**Do.** Two boards.

1. “Test one clue alone,” on the “One clue can prove a lot” clue. Each row is one clue by itself, and asks: could Leo
   still have the dog? Shown: Mia has the dog. No.

   | Only clue | Could Leo have the dog? |
   |---|---|
   | Leo has the fish. | No (Leo has just one pet) |
   | Leo does not have the cat. | Yes |
   | Leo has the cat or the fish. | No (it leaves out the dog) |
   | Leo has the dog or the fish. | Yes (it names the dog as one choice: the quiz’s most tempting wrong clue) |
   | Ava has the dog or the fish. | Yes |
   | Mia has the cat. | Yes |

   Example why, for No on “Mia has the cat”: “The clue says Mia has the cat. With only this clue, Leo could have the
   dog or the fish. So Leo could still have the dog.”

2. “Use only clues 1 and 2,” on the new list card. The fish is shown: Mia No, Leo No, Ava Yes, and 1 kid could have
   it, so you can tell. The learner checks the cat: Mia Yes, Leo Yes, Ava No, and 2 kids could have it. The note says
   what that means (you can’t tell yet). There is no “Can you tell yet?” button: that is the quiz’s own question.
   Example why, for No on “Could Mia have the cat?”: “With only clues 1 and 2, Mia could have the cat or the dog. So
   Mia could still have the cat. Clue 3 says Mia has the dog, but use only clues 1 and 2.” For a count of 1: “… That
   makes 2, not 1. Clue 3 would make it 1, but use only clues 1 and 2.”

**Quiz.** One family moved out. Proofs in two-part grids, with linking clues and clues about the other part as wrong
choices, came in 40% of try 3. No card or board tests a linking clue alone, so try 3 is now a one-part proof, like
try 1. The check and the Arcade already asked one-part proofs only; they now say so (`ncat: 1`). The engine still
builds two-part proofs, and its own tests still run them, for a later lesson.

**Pass.** The default.

**Hint.** One clue that does not prove the ✗, tested by itself, such as “Clue 2: Moss lives in the hill cave or the
sand cave.” with “Onyx could live in the ice cave: true. So clue 2 alone does not prove the ✗.” An “enough clues”
item shows one person checked with only clues 1 and 2.

## Families moved out, and where

| Family | Was in | Now |
|---|---|---|
| Proof in a two-part grid (link and other-part wrong choices) | Lesson 5 practice, try 3 (40%) | Out of the stop. Practice, check, Arcade, new examples and the Notebook ask one-part proofs only. |

Every other family stays, because a card now marks it and a board has the learner do it.

## Tests

In `engine/__tests__/grid.test.ts`, “See -> Do -> Quiz (the skill-drill handoff)”:

- Every mark on every board, worked out again from the words: clue sentences, the picture’s marks, and the question
  in the label. Every grid box is decided.
- Each board is a card’s own board: the same scene object, or (for a logic grid) the card’s rows, columns and marks.
- The handoff’s sample: Mia’s ✓ and ✗ shown, Leo – apple ✗ and Leo – bread ✓ tapped, the exact words for each
  wrong tap, and no pass with nothing tapped.
- Every board: right taps pass, a board with no taps fails, at most 12 taps, every wrong option has words that name
  its box, line, person or thing, and the text reads at the level.
- Each family the quiz asks has a board row that does it, with the right answers listed.
- Each row’s note agrees with its marks.
- No board asks the quiz’s own question: no “Which”, “Who” or “Can you tell” mark, and every option is a mark
  (Yes, No, Can’t tell yet) or a count.
- A reason says a box “has” a mark only when the learner can see that mark; a box still to tap “gets” one.
- New and changed cards say what their pictures and clues prove.
- Practice, check, Arcade, new examples and the Notebook ask only taught families. Lesson 5 never asks a two-part
  puzzle. Lesson 1 always opens on a “has” clue. Every lesson keeps the default pass rule.
- Every hint is a marked case whose truths are recomputed, and never the answer’s own case.

The contract (`DRILL_ALL=1 STOP=4 npx vitest run src/engine/__tests__/stops.test.ts`) passes: boards, words for every
wrong option, the same board as a card, reading level, and a marked case for every hint.

## Shared changes requested (not made)

1. Add `s4.l1` to `s4.l5` to `DRILLED` in `engine/__tests__/stops.test.ts`, so the plain run checks Stop 4’s boards
   (today only `DRILL_ALL=1` does).
2. In `stops.test.ts`, let a logic grid board count as “the same board” when its rows, columns and shown boxes equal a
   card’s grid. Today the check only compares `scene`, so a grid board with no picture above it passes without being
   compared. `grid.test.ts` checks this for Stop 4 instead.
3. `DrillBoard` draws a board’s picture as it is. On a board of rows (lessons 2, 3, 4 and 5), the learner’s right
   marks are not drawn on that picture, so the row labels carry them. Drawing the right marks on the picture as they
   are made would help.
4. A grid scene shows one part only. A two-part grid picture would let “Two parts to the grid” show a marked case,
   and let the lesson 4 boards show both parts together.
5. At 320px, the snack headers of a guided grid wrap inside the word (“popco / rn”, “grape / s”) on lesson 4’s
   “Carry a link across” board. The headers use `overflow-wrap: break-word` in `play.css`. A smaller header font for
   long labels at narrow widths (as `.play-grid--many` does), or no break inside a word, would keep each word whole.
   The board still fits (no sideways scroll).

## Review (independent reviewer, branch `drill-stop4-v`)

I read the whole handoff, the Stop 4 map and the builder’s work, then checked every item below myself.

### Handoff lines for Stop 4, and where the code meets them

| Handoff line | Where it is met |
|---|---|
| “See: a small grid. Mia’s clue is already marked with a check and a cross. One caption says a check in a row crosses the other boxes in that row.” | Card “One each” (`CARD_GRIDS.oneEach`): Mia – apple ✓, Mia – bread ✗, caption “Mia has the apple. A ✓ in a row crosses out the other boxes in its row.” |
| “Do: same grid. Kid places the marks for the taught Leo clue. Then one row (or column) has a single empty box. Kid taps that last box.” | Board `s4.l1-do` is that grid with Mia’s row shown. The learner taps Leo – apple ✗ (clue 2), then Leo – bread ✓ (the last box). |
| “Quiz: ‘isn’t / or’ items only after those marks. Not before.” | The runner opens practice only after both lesson 1 boards are right. Try 1 is always a “has” clue (test: 60 seeds). |
| “Pass. The guided grid is complete … Reading ‘a check fills the row’ does not pass.” | The runner requires the boards; `checkDrill(L1_GRID, {})` is not done. Then the default 3 first-try answers. |
| “Stop doing. Do not open practice on ‘isn’t’ or ‘or’ before the learner has placed the taught Mia/Leo marks and completed one last-box row.” | Same as the Quiz line: boards first, then try 1 is a “has” clue. |
| “Sample. Columns: apple, bread. Rows: Mia, Leo … Kid taps a cross on Leo–apple … Kid taps a check on Leo–bread.” | `L1_GRID` exactly; the test pins the columns, rows, shown marks and the two taps. |
| Core rule: no final-answer buttons on the Do board. | Fixed in this review (problem 1 below). |

Every lesson has a Do board: `DRILL_ALL=1 STOP=4 npx vitest run src/engine/__tests__/stops.test.ts` passes.

### Problems found and fixed

1. **Final-answer buttons on three boards (medium).** Lesson 2’s board asked “Which pet must Leo have?” (Cat, Dog,
   Fish, Can’t tell yet) and “Who must have the cat?”. Lesson 4’s “not” link board asked “Who must eat popcorn?”.
   Lesson 5’s board asked “Can you tell who has the cat yet?”. Each is the lesson’s own quiz question, which the
   handoff keeps off the Do board (“No final-answer buttons yet”; for Stop 4: “Kid taps that last box”).
   *Fix:* the engine’s board asks are now only a box (Yes, No, Can’t tell yet), a count of empty boxes, “Could Leo
   have the dog?”, and a new count “How many kids could have the cat?”. Lesson 2’s rows: tap the added ✗, count, tap
   the last box ✓ (or leave two boxes empty). Lesson 4: Ava – popcorn is tapped ✓ as the last box; two grapes boxes
   stay empty. Lesson 5: each kid is checked, then counted. The note under each row says what that decides.
   *Evidence:* new test “no board asks the quiz’s own question”; the boards are 9, 5 and 4 taps.
2. **Lesson 2 hints showed truths that are false on the learner’s grid (medium).** The hint’s marked case was the
   asked line in a *different* grid (one ✗ more or less). For “Which cave must Onyx live in?” with Onyx – sea cave ✗
   on screen, the hint said “Onyx could live in the sea cave: true … So you can’t tell yet”. For a can’t-tell item it
   said “D must have 2: true”, and 2 is one of that item’s wrong choices.
   *Fix:* the hint now marks one box of the asked line on this very grid that has a ✗ (could: false), never the
   answer. *Evidence:* the hint test recomputes its truth against the item’s own grid, checks it is false, and checks
   the box names a choice that is not the answer (60 seeds, every mode).
3. **The most tempting wrong clue in lesson 5 was never tried on the board (low).** The proof quiz’s “or names it”
   wrong choice (an “or” clue about the same kid that names the thing) had no board row.
   *Fix:* lesson 5 board 1 adds “Only clue: Leo has the dog or the fish.” (Yes, Leo could still have the dog).
4. **A reason could say a box “has a ✗” before the learner had tapped it (low).** On the handoff’s grid, tapping only
   Leo – bread ✗ and checking said “Leo – apple has a ✗”, while Leo – apple was still blank.
   *Fix:* a box the learner still has to tap now “gets a ✗”; “has” is kept for marks the learner can see (shown boxes,
   the picture, a ✗ the row’s label adds). *Evidence:* new test “a reason says a box ‘has’ a mark only when the learner
   can see that mark”, plus the exact message for that case.
5. **Lesson 5 “clue 3” reasons.** With the “Can you tell yet?” mark gone, the board still names the clue-3 mistake
   where it happens: “Clue 3 says Mia has the dog, but use only clues 1 and 2.” and “Clue 3 would make it 1, but use
   only clues 1 and 2.” Both are computed from the list, and the test pins them.

### Checked and found right (no change)

- **Every Do mark, recomputed independently.** I wrote each board’s meaning down by hand as rules on a full way to
  fill the grid, solved by my own brute force (every permutation), and compared: 85 marks on 10 boards, 0 mismatches.
  Lesson 2’s rows give the same answers whether or not the learner keeps an earlier row’s ✗.
- **Every wrong option’s words.** I read all of them. Each names the box, line or kid, says what the clue or picture
  says, and is true on that board. The first mismatch follows reading order: the added ✗, then the count, then the
  last box; each kid, then the count.
- **Same board as See.** Each board uses its card’s scene object, or (grid boards) is the card’s grid with its marks
  shown. No board is a twin, so none needs a twin note.
- **Phone size.** 2 to 9 taps per board (at most 12).
- **Quiz families.** Practice, check, Arcade, new examples and the Notebook ask only families a card marks and a
  board performs. The only family that left is the two-part proof (lesson 5), and it is gone from every route. For
  300 seeds, check, Arcade and new examples are the same items as before the builder’s change (hints aside).
- **Hints.** Every hinted practice item has a marked case with computed truths that is not the answer’s case.
- **Pass.** The handoff gives no Stop 4 rule beyond the guided grid, so every lesson keeps the default.
- **Words.** All card, board and hint text reads below grade 1 (limit 7), longest sentence 20 words, curly quotes
  only, no “Wrong”. Each “both” names its two things.

### Browser check (320px wide)

A save with stops 1 to 3 passed. For each lesson: Journey, Grid Detective, “Lesson k · title”, Next through the
cards to “Now you do it”, then on each board one wrong mark and “Check my marks”, then every mark right.

| Board | Taps | Sideways scroll | Wrong mark named | Right marks pass |
|---|---|---|---|---|
| s4.l1-do | 2 | none | yes | yes, then “Next board” |
| s4.l1-do-or | 9 | none | yes | yes, then “Start the puzzles” |
| s4.l2-do | 9 | none | yes | yes, then “Start the puzzles” |
| s4.l3-do | 4 | none | yes | yes, then “Next board” |
| s4.l3-do-2 | 3 | none | yes | yes, then “Start the puzzles” |
| s4.l4-do | 6 | none | yes | yes, then “Next board” |
| s4.l4-do-not | 5 | none | yes | yes, then “Next board” |
| s4.l4-do-back | 6 | none | yes | yes, then “Start the puzzles” |
| s4.l5-do | 6 | none | yes | yes, then “Next board” |
| s4.l5-do-2 | 4 | none | yes | yes, then “Start the puzzles” |

Each lesson then opened “Try 1”, and its Hint showed the marked case (for lesson 2: “In this grid, Cinder’s box in
the sand cave column has a ✗.”). No page errors. The console showed only 403s for the font files, which the dev
server will not serve from the linked `node_modules` outside the worktree; that is the test setup, not the game.

### Tests

`npx tsc --noEmit -p .` clean. `DRILL_ALL=1 STOP=4 npx vitest run src/engine/__tests__/stops.test.ts`: 8 passed.
`npx vitest run src/engine/__tests__/grid.test.ts`: 42 passed. Full `npx vitest run`: 17 files, 493 tests passed.
