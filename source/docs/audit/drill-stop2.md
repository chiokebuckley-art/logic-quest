# Skill-drill audit: Stop 2 (NOT, AND, OR)

Source: the developer handoff “Logic Quest — teach before the quiz” (2 Oct 2026), Stop 2 section.

The core rule: every new method is **See one marked case → Do one with taps → Quiz a twin**. A new rule family never
appears inside a quiz set. A lesson is not passed until the learner has marked the cards.

What the handoff asks of Stop 2:

- **See.** One row of cards, one rule, every card already marked. The example is NOT red, with a blue circle and a
  yellow square marked in and a red circle marked out, plus the note that NOT red is not “the blue ones.”
- **Do.** The same cards stay. A new rule of the same family. The learner taps Fits or Not on each card. No final
  answer buttons and no abstract sentence yet.
- **Quiz.** A twin rule on a shuffled twin of the same deck, with the pictures still up. Guess the rule comes only after
  picture taps. Brackets are a picture drill first (two groupings, the learner taps who fits), then words.
- **Pass.** Before any words-only item, the learner has marked a deck right for NOT (more than one other color fits),
  for OR (a card that fits both parts still fits) and for a bracket change (who fits is different).
- **Sample.** Big red circle, small red square, big blue circle, small yellow triangle. Rule: big OR red. Fit, Fit,
  Fit, Not.

How it is built. Every board comes from two engine helpers in `src/engine/puzzles/rules.ts`: `deckRow()` (each card
Fits or Not, from `evaluate()`) and `ruleTestRow()` (each card Fits or Not, then Keep or Rule out, from the machine’s
marks). No answer is typed by hand. The words for a wrong tap come from `whyFits()`, the same words the wrong-answer
explanations use. Each board’s picture is the very picture a key idea shows (the same object), so the case already
marked stays on screen. Every row lists the same six cards in the same order, each card drawn beside its two buttons.

Try 1 of every quiz is a **twin**: the worked example’s six cards, dealt in a new order (ids c1 to c6), with a new rule
of the same family, in plain cards. `deckTwins()` lists the twin rules. A twin must mark the deck differently from every
rule the key ideas and the boards already marked, so copying marks never answers it. The rule and the order come from
the lesson’s seed, so the same seed gives the same items.

Every hint now shows one card already worked through (`hintCase`): each part and the rule marked true or false, and a
note. It is never the answer.

---

## Lesson 1 · NOT: everything else (s2.l1)

**See.** Key idea 3, “NOT means everything else.” Six cards, NOT red marked: the big blue circle and the small yellow
square are in (✓), the big red circle is out (✗). A new third paragraph puts the handoff’s note on the marked card:
“So NOT red is not “the blue ones.” NOT red is not one other color. It takes every color but red.”
Key idea 4 was prose only. It is now a marked case too: “NOT on a shape or a size,” the same six cards with NOT a circle
marked (squares and triangles in, circles out), and NOT big in words.

**Do.** Two boards, 6 taps each.

| Board | Picture kept up | The learner marks | Right taps (cards in order) |
|---|---|---|---|
| Mark the cards | Key idea 3 (NOT red) | NOT blue | big red circle Fits, small blue square Not, big yellow triangle Fits, small red triangle Fits, big blue circle Not, small yellow square Fits |
| Now a shape | Key idea 4 (NOT a circle) | NOT a square | Fits, Not, Fits, Fits, Fits, Not |

On the first board the red cards and the yellow cards fit: more than one other color. Example why, for Not on the big
red circle: “The big red circle is not blue, so it fits “NOT blue.””

**Quiz.** Before: notTap, notMeans, notTap, notCount. The words-only item (notMeans: “Which cards fit the rule NOT
red?” with no cards) was Try 2. Now:

1. Twin: NOT yellow or NOT a triangle, on the same six cards in a new order.
2. notTap in a story.
3. notCount (cards on screen).
4. notMeans, last: the only words-only item, after the deck has been marked.

**Moved out.** Nothing. Every item is NOT x. Shapes are now drilled on board 2. NOT big stays (taught in words on key
idea 4); it is the same family, and the twin never uses it.

**Pass.** Both boards marked right, then the default: 3 right on the first try with no hint.

**Hint case.** A card the rule leaves out. Example: “A small yellow square. It is yellow: true. It fits “NOT yellow”:
false. It is yellow, so NOT leaves it out.” The hint ends “Here is one card, checked for you.”

## Lesson 2 · AND needs both parts (s2.l2)

**See.** Key idea 2, “Both parts must fit.” Six cards, red AND a circle marked.

**Do.** One board, 6 taps, on key idea 2’s picture. The learner marks **red AND big**: big red circle Fits, small red
square Not, small blue circle Not, big yellow triangle Not, small red circle Not, big red triangle Fits. The deck has
every kind of card: both parts, red only, big only, no part. Example why, for Fits on the small red square: “The small
red square is red, and it is not big. The part “big” is false. AND needs both parts, so it does not fit.”

**Quiz.** Before: andTap, andPick, andNotTap, andCount. Now:

1. Twin: red AND small, or a circle AND small, on the same six cards in a new order.
2. andPick (which card fits).
3. andTap in a story.
4. andCount.

**Moved out.** andNotTap, the rule family A AND NOT B (“blue AND NOT small”, skill s2.and-not). No key idea named it and
no board drilled it: it was a new rule family inside the quiz set. It is now out of the lesson quiz, out of the stop
check (slot 2 is always andTap), out of the Arcade, out of the new examples and the notebook, and out of Guess the rule
(see Lesson 5). `untaughtItems()` keeps it built, and its tests still run, for the later lesson that will teach it.

**Pass.** The board marked right, then 3 right on the first try with no hint.

**Hint case.** A card that fits one part only (never the answer). Example: “A big red circle. It is a circle: true. It
is small: false. It fits “a circle AND small”: false. The part “small” is false. AND needs both parts, so it does not
fit.”

## Lesson 3 · OR: one part or both parts (s2.l3)

**See.** Key idea 2, “Both parts true counts too.” Six cards, a circle OR blue marked. One card of the deck changed:
the big yellow circle is now a big blue circle. The deck now holds the handoff’s four sample cards. The marks keep the
same pattern (four in, two out), and the deck still has every kind of card.

**Do.** One board, 6 taps, on key idea 2’s picture. The learner marks the handoff’s rule, **big OR red**: small blue
circle Not, big red circle Fits, big blue square Fits, small yellow triangle Not, big blue circle Fits, small red square
Fits. The handoff’s four cards get exactly its taps: Fit, Fit, Fit, Not. Example why, for Not on the big red circle:
“The big red circle is big, and it is red. Both parts of “big OR red” are true. OR takes a card that fits both parts,
so it fits.” Done: “Right. The big red circle fits even though it is big and red.”

**Quiz.** Before: orTap, orYesNo, orNotFit, orTap, orCount. Now:

1. Twin: one of red OR a circle, red OR a square, blue OR a square, red OR small, a square OR small, on the same six
   cards in a new order. A conflict item, like every OR tap.
2. orYesNo, 3. orNotFit, 4. orTap in a story, 5. orCount.

**Moved out.** Nothing: every item was already A OR B.

**Pass.** The board marked right, then 3 right on the first try with no hint.

**Hint case.** Tap and count items: a card with no part true. “Which card does not fit”: a card that fits one part (a
wrong choice). Yes or no: a different card from the one asked about.

## Lesson 4 · Brackets matter (s2.l4)

**See.** Key ideas 2 and 3 as before: NOT (red AND big) and NOT red AND NOT big on the same six cards. Key ideas 4 and 5
were prose only. Both are now marked cases on the same six cards:

- Key idea 4, NOT (red OR big): the small yellow circle and the small blue triangle fit. The text now names them.
- Key idea 5, the switch, NOT red OR NOT big: the same marks as NOT (red AND big). Only the big red circle is left out.

**Do.** Three boards, one for each marked key idea.

| Board | Picture kept up | The learner marks | Right taps (cards in order) |
|---|---|---|---|
| Mark the cards (12 taps) | Key idea 2 | NOT (blue AND small) | Fits, Fits, Fits, Fits, Fits, Not |
| | | NOT blue AND NOT small | Fits, Not, Not, Not, Fits, Not |
| Now OR inside the brackets (6 taps) | Key idea 4 | NOT (blue OR small) | Fits, Not, Not, Not, Fits, Not |
| Now the switch (6 taps, added in review) | Key idea 5 | NOT blue OR NOT small | Fits, Fits, Fits, Fits, Fits, Not |

Board 1 is the handoff’s picture drill: two groupings, and who fits changes on the small red square, the big blue
triangle and the small yellow circle. Board 2 marks the same cards as the second row, and the done line says the two
rules mean the same. Board 3 is the switch done by hand: a NOT on each part and OR. It marks the cards as NOT (blue AND
small) does on board 1. Done: “Right. Only the small blue triangle is left out. “NOT blue OR NOT small” fits the same
cards as “NOT (blue AND small).”” Example why, for Fits on the small red square under NOT blue AND NOT small: “The small red square
is not blue, and it is small. So “NOT blue” is true. The part “NOT small” is false. AND needs both parts, so it does not
fit.”

**Quiz.** Before: notAndTap, bracketYesNo, notOrTap, sameMeaningPick (words only, Try 4), groupTap. Now:

1. Twin: a NOT (A AND B) rule (11 possible, such as NOT (yellow AND big)) on the same six cards in a new order.
2. notOrTap in a story.
3. bracketYesNo.
4. notAndTap.
5. sameMeaningPick, last: the only words-only item, after the boards.

**Moved out.** groupTap, the rule family (A OR B) AND NOT C (“(big OR a circle) AND NOT blue”, skill s2.brackets-first).
No key idea named it. It is now out of the lesson, out of check slot 6, out of the Arcade, the new examples and the
notebook. `untaughtItems()` keeps it built and tested for a later lesson.

Same meaning, changed in review: a wrong choice used to put a NOT on one part only (“NOT a circle AND yellow”). That
is the A AND NOT B family this stop no longer teaches, so it is gone. The two wrong choices are now the two halves of the
switch done alone: the NOT moved inside without switching the joining word (“NOT a circle AND NOT yellow”), and the
joining word switched without moving the NOT (“NOT (a circle OR yellow)”). Both are forms this lesson marks on cards.

**Pass.** All three boards marked right, then 3 right on the first try with no hint.

**Hint case.** Tap items: a card that fits the inside of the brackets, so NOT leaves it out. Yes or no: the card that
fits both parts, never the card asked about. Same meaning: a card that fits only one part, with the question’s rule
marked and no choice marked: “Now test each choice on this card.”

## Lesson 5 · Guess the rule (s2.l5)

**See.** Key idea 4, “A worked example.” The machine’s marks come from blue OR big. Blue is ruled out by the big red
square, and blue OR big matches every mark.

**Do.** One board, “Test a rule,” 7 taps. The machine’s marks stay on the cards, and each card is drawn with its mark
beside its buttons.

- Shown row (given, like the Silver row in Treasure signs): test blue OR big. Fits, Fits, Fits, Not, Not, Fits. Keep.
- The learner’s row: test **big**. Big red square Fits, small blue circle Not, big blue triangle Fits, small yellow circle
  Not, small red triangle Not, big yellow square Fits. Then Rule out.

Example why, for Keep: “The small blue circle got a yes, but it does not fit “big.” One card that does not match is
enough to rule it out.” No “which rule?” buttons on the board.

**Quiz.** Before: guessEasy, guessOr, guessHard. guessHard’s secret rule was A AND NOT B 64% of the time, and rules
with a NOT inside a two-part rule were offered as choices in about half of all items. Now:

1. Twin: a machine on the same six cards in a new order, with a new OR rule (13 possible, such as yellow OR small).
2. guessEasy (one feature, NOT one feature, or A AND B).
3. guessOr.
4. guessHard (any taught rule).

**Moved out.** Every secret rule and every wrong choice now comes from `TAUGHT_POOL`: one feature, NOT one feature, and
two features joined by AND or OR. That is 56 of RULE_POOL’s 116 rules. Rules with a NOT inside a two-part rule (A AND
NOT B, A OR NOT B) are gone from the lesson, the check and the Arcade. `makeRuleGuess()` gained two options: `pool` (where
the wrong rules come from) and `deck` (a fixed deck in a new order). With neither option it works as before.

**Pass.** The board marked right, then 3 right on the first try with no hint.

**Hint case.** A card that rules out one wrong choice, already tested: “The big red square. It got a yes: true. It fits
“a circle OR small”: false. The mark and “a circle OR small” do not match. So “a circle OR small” is ruled out.” It never
names the secret rule.

---

## The check, the Arcade, new examples and the notebook

- **Check** (9 items): slot 2 is always andTap (andNotTap is out), and slot 6 is NOT (A AND B) or NOT (A OR B) (groupTap
  is out). Guess items use the taught pool. Every lesson is still covered, every check has 2 or more conflict items, and
  300 of 300 seeds give a different check (the contract needs 280).
- **Arcade:** its own list per lesson, with the same taught families and never the twin.
- **New examples after a miss** draw from the lesson’s taught families. Since the review, a miss on NOT x, A AND B or
  Guess the rule gets a new random item of that family (`stop2.fresh`), never Try 1’s twin on the same six cards.
- **The notebook** draws from the lesson’s own practice, so it inherits the taught families. It lands on Try 1’s twin
  (see the shared requests). A test runs new examples and the notebook over every skill.

## Tests (src/engine/__tests__/rules.test.ts)

New block “stop 2: See -> Do -> Quiz (skill-drill handoff)”, 14 tests (12 from the build, 2 added in review):

- See: every lesson has a key idea with every card marked; the handoff’s NOT red card (blue circle and yellow square in,
  red circle out, and the note).
- The new key-idea claims are true (NOT a circle, NOT big, NOT (red OR big), the switch); the OR deck holds the
  handoff’s four cards.
- Do: every board uses a key idea’s own picture; one mark per card in the same order, drawn beside its name; only Fits
  or Not (and Keep or Rule out); no “Which” question; tapping nothing never passes; right taps pass; 12 taps or fewer.
- Do: every mark is re-solved from the words in the row label by a small reader written in the test (not the engine),
  and Keep or Rule out from the marks in the picture.
- Do: the handoff’s cases: NOT blue fits red and yellow cards; the handoff’s big OR red taps; the bracket change names the
  three cards; NOT (blue OR small) marks the cards like NOT blue AND NOT small, and NOT blue OR NOT small like NOT (blue AND small); Guess the rule’s shown row keeps, the
  learner’s row rules out with the small blue circle.
- Do: every wrong tap’s words name that card and the rule (or the part that decides it), and every claim in them is
  re-checked on the card.
- Do: board text at grade 7.0 or below, sentences of 25 words or fewer, curly quotes, rules that read back, “both” only
  as “both parts”, no “that row” or “the opposite”.
- Quiz try 1: the worked example’s six cards in a new order (more than 10 orders over 60 seeds), plain cards, the
  lesson’s family, more than one twin rule, and marks that differ from every key idea and board.
- Quiz: practice (200 seeds), the check (200 seeds), the Arcade (400 items), new examples and the notebook use only the
  families each lesson taught; no s2.and-not or s2.brackets-first item anywhere; words-only items come last.
- makeRuleGuess takes its wrong rules from the pool given, and a fixed deck.
- Hints: every item (practice, check and Arcade, 60 seeds) has a marked case, re-checked from its words, and it is never
  the answer.
- Pass: every lesson has boards and the default pass rule.
- Review: a new example after a miss is never Try 1’s twin again (40 seeds, every item of every lesson, with the seed
  the lesson really uses).
- Review: every same-meaning item’s two wrong choices are the switch without the move and the move without the switch.

Two older tests that needed A AND NOT B and (A OR B) AND NOT C items now run on `untaughtItems()` with the same
assertions, and one new test checks those items stay sound.

Checks run at build time: `npx tsc --noEmit -p .`, `DRILL_ALL=1 STOP=2 npx vitest run
src/engine/__tests__/stops.test.ts` (8 passed), `npx vitest run src/engine/__tests__/rules.test.ts` (67 passed), and the
full `npx vitest run` (17 files, 494 tests passed). After the review: 8, 69 and 496 passed (see Review).

## Review

An independent review of the build (branch `drill-stop2-v`, from `drill-stop2` at 693d56e). Each part says what was
checked, what was found, and what changed.

### 1. The handoff, line by line

| Handoff line (Stop 2) | Where the code meets it |
|---|---|
| See: “one row of the same cards, one rule, matching cards already highlighted. Example on screen: NOT red, with a blue circle and a yellow square marked in and a red circle marked out, plus the note that NOT red is not “the blue ones.”” | Lesson 1, key idea 3 (`IDEAS[L1][2]`): the six sample cards with NOT red marked by `evaluate()`, and the note in its third paragraph. Every lesson has a key idea with every card marked. |
| Do: “those same cards stay. A new rule of the same family, kid taps Fit or Not on each card. No abstract sentence yet.” | `DRILLS`: every board’s `scene` is the very object a key idea shows. Rows are `deckRow()` marks, Fits or Not on each card, with the card drawn beside its buttons. No board asks “which” or “how many”. |
| Quiz: “a twin rule on a shuffled twin of the same deck, pictures still up.” | Try 1 of each lesson (`notTwin` to `guessTwin`): the worked example’s six cards in a seeded new order, with a rule from `TWINS` that marks them differently from every key idea and board. |
| “Guess the rule comes only after picture taps: the marks are already on the cards, the kid taps which written rule matches those marks.” | Lesson 5’s board “Test a rule”: the machine’s marks stay on the cards. The learner taps Fits or Not for “big” on each card, then Rule out. Only then does the quiz ask which rule. |
| “Brackets are a picture drill first (two groupings, kid taps who fits), then words.” | Lesson 4, board 1: NOT (blue AND small) and NOT blue AND NOT small on the same six cards. Its done line names the three cards that change. The words-only same-meaning item is the last try. |
| Pass: “Before any abstract-sentence item, the learner has marked a deck correctly once for NOT (more than one other color counts), once for inclusive OR (a card that is both parts still fits), and once for a bracket change (who fits is different).” | Lesson 1’s first board (NOT blue: red and yellow cards fit), lesson 3’s board (big OR red: the big red circle fits), lesson 4’s first board (who fits changes). The runner opens no quiz before a lesson’s boards are right. Across lessons, see shared request 1. |
| Stop doing: “Guess the rule and the bracket checks currently jump to abstract sentences. Do not open on bare wording. Do not quiz “NOT (red AND big)” as a sentence before the cards have been tapped.” | Every lesson’s Try 1 is a picture item. notMeans and sameMeaningPick, the only words-only items, come last in their packs. |
| Sample: “big red circle, small red square, big blue circle, small yellow triangle. Rule: big OR red.” Fit, Fit, Fit, Not. | Lesson 3’s board: those four cards get Fits, Fits, Fits, Not (test “the boards drill the handoff’s cases”). |

Every lesson has a Do board: `DRILL_ALL=1 STOP=2 npx vitest run src/engine/__tests__/stops.test.ts` passes (8 tests).

### 2. Every mark, recomputed another way

A scratch script read every board and solved each mark with its own hand-written rule for each row label (for example
`c.color !== 'blue' || c.size !== 'small'` for “Rule: NOT blue OR NOT small”). It used neither the rule engine nor the
test’s word reader. It also checked that each card in a row is the card in the same place on the picture, and it solved
Keep or Rule out from the machine’s marks. Result: 62 of 62 marks agree (56 of 56 before the switch board was added).
The test “every mark is re-solved from the words on the board” does the same with a word reader, now over 10 rows.

### 3. The words for a wrong tap

Every wrong option of every mark the learner taps has words. Each names that card, what it is, and the part of the rule
that decides it. All 9 learner rows were read one by one. Each sentence is true for its card (the test re-checks every
claim on the card). The order makes sense: cards in reading order, then the Keep or Rule out decision. No change needed.

### 4. Board shape

Every board is a key idea’s own picture, so no `twin` note is needed. No board has final-answer buttons. Taps per board:
lesson 1: 6 and 6; lesson 2: 6; lesson 3: 6; lesson 4: 12, 6 and 6; lesson 5: 7. None is over 12.

### 5. Rule families in the quiz, the check, the Arcade, new examples and the notebook

The build moved A AND NOT B and (A OR B) AND NOT C out of every lesson quiz, the check and the Arcade. Guess the rule
draws only from `TAUGHT_POOL`. The review found three gaps.

- **R1, medium: an untaught family as a same-meaning choice. Fixed.** For NOT (A AND B) and NOT (A OR B), one wrong
  choice put a NOT on one part only (“NOT a circle AND yellow”). That is the A AND NOT B family the build took out of
  everything else (Guess the rule drops it even as a wrong choice). It was in about half of all same-meaning items, in
  Try 5 of lesson 4 and in the check. Now that choice is the joining word switched without moving the NOT (“NOT (a
  circle OR yellow)”), with its own headline: “Your answer switches AND to OR, but the NOT stays outside the brackets.”
  Every choice is now a form lesson 4 marks on cards. Evidence: the family test no longer allows a NOT on one part; the
  new test “same meaning: the wrong choices are the switch without the move, and the move without the switch”; the
  headline test still finds 4 kinds of same-meaning mistake, each with its own headline.
- **R2, medium: the switch had no Do. Fixed.** Key idea 5 marks NOT red OR NOT big, and same-meaning items ask about
  NOT A OR NOT B. But no board had the learner tap a rule with a NOT on each part joined by OR. Lesson 4 now has a third
  board, “Now the switch,” on key idea 5’s picture: NOT blue OR NOT small, 6 taps, answers from `deckRow()`. Its done
  line names the sameness with NOT (blue AND small), which board 1 marked. Evidence: the independent recompute above,
  and the test “the boards drill the handoff’s cases”, which checks its marks equal NOT (blue AND small)’s.
- **R3, medium: a new example after a miss landed on Try 1’s twin. Fixed.** Try 1 is first in every pack. So the
  default new example (the first item with the same skill) was always the twin for NOT x, A AND B and Guess the rule.
  With the seed the lesson really uses, a scratch run over 60 seeds got the twin 60 times in 60. After a missed twin,
  26 of 60 new examples were the same rule on the same six cards in a new order: the question just missed, again. Now
  `stop2.fresh` gives a new random item of the family for `s2.not`, `s2.and` and `s2.guess-rule`. Evidence: the new
  test “a new example after a miss is never Try 1’s twin again”.

Leftovers looked for: no key idea names a moved family. `SKILL_NAMES` keeps the old `s2.and-not` and
`s2.brackets-first` lines, which old saves still need for their stats. A notebook card from an old save with one of
those skills falls back to a taught item of the same lesson.

### 6. Hints

Every hinted item in practice, the check and the Arcade has a `hintCase` (the stops contract, and the stop 2 hint test
over 60 seeds). Each is marked, re-checked from its words, and never the answer. No change needed.

### 7. Pass rule

The handoff’s Stop 2 pass is about the boards, which every lesson has before its quiz. The default pass (3 right on the
first try, no hint) follows. There are no include tags, so there are none to find in the packs. No change needed.

### 8. Words

All new text passed the board text test: grade 7.0 or below, sentences of 25 words or fewer, curly quotes, “both” only
as “both parts”, and no “that row” or “the opposite”.

### 9. In the browser (320 px wide)

The worktree was built (`vite build`) and served on port 5302. Playwright opened each lesson from Journey, then Stop 2,
then “Lesson k · title”, with a save where Stop 1 is passed. It paged the cards with Next to “Now you do it”. On every
board it pressed “Check my marks” with nothing marked, marked one option wrong and checked, then marked everything
right and went on to “Start the puzzles”.

- No horizontal overflow on any card, board, wrong-mark state, done state, Try 1 or hint.
- Each wrong mark showed exactly that mark’s words. For example, on lesson 4’s switch board: “The small yellow circle
  is not blue, and it is small. So “NOT blue” is true. One part is enough for OR, so it fits.” One option was flagged.
- An empty board said “Not yet: 6 marks are still empty. Mark each one, then check.”
- Each done message showed. Try 1 opened as a picture item with “To finish: 3 right on the first try. You have 0.” The
  hint showed a marked card.
- No console errors on the built app. (On the dev server the fonts gave 403s, because `node_modules` is a link outside
  the worktree. That is the test setup, not the app.)

### 10. Checks

`npx tsc --noEmit -p .` is clean. `DRILL_ALL=1 STOP=2 npx vitest run src/engine/__tests__/stops.test.ts`: 8 passed.
`npx vitest run src/engine/__tests__/rules.test.ts`: 69 passed. The full `npx vitest run`: 17 files, 496 tests passed.

### Found and not fixed here (shared code)

- **R4, low: extra quiz items are always Try 1’s twin.** When the pass rule is not met yet, `extraQuizItem()` takes the
  first unseen item of another seed’s pack. That is the twin, so every extra item is the same six cards again (90 of 90
  in a scratch run, in every lesson). Lesson 1 has only two twin rules. See shared request 5.
- **R5, low: a notebook repair is always Try 1’s twin** for NOT x, A AND B and Guess the rule (40 of 40). See shared
  request 5.
- **R6, low: the lesson title breaks inside a word at 320 px** (“BRACKET / S MATTER” in the lesson header), from
  `overflow-wrap: anywhere` on `.play-head-title`. See shared request 6.

## Shared changes requested (not made)

1. **Lesson order.** The stop page lets a learner open any lesson. Then Lesson 4’s same-meaning item or Lesson 5’s
   guesses could come before the NOT and OR decks are marked in Lessons 1 and 3. The handoff’s Stop 2 pass wants all
   three decks marked before any words-only item. Please open lesson k+1 only after lesson k is passed (or at least after
   its boards are marked). Files: `src/game/screens/StopScreen.tsx`, `src/engine/journey/mastery.ts`.
2. **Contract coverage.** Add `s2.l1` to `s2.l5` to `DRILLED` in `src/engine/__tests__/stops.test.ts`, so the See → Do →
   Quiz contract runs on Stop 2 without `DRILL_ALL=1`.
3. **Hint cases in the text checks.** `teachStrings()` (`src/engine/teach.ts`) and the stops contract do not read
   `hintCase`, so its words skip the reading-level and quote checks for every stop. Stop 2 checks its own hint cases in
   rules.test; a shared check would cover every stop.
4. **Wording for deck boards.** Before a Stop 2 board, the last key-idea button note says “Mark a case yourself.” For a
   row of cards, “Mark the cards yourself” would fit better (`LessonRunner.tsx`, `ideaNote`). The stop page says
   “+ you mark a case” the same way (`StopScreen.tsx`).
5. **Twins first in a pack** (from the review, R4 and R5). Stop 2’s Try 1 is a seeded twin on the worked example’s
   cards, with no `workFirst`. `extraQuizItem()` (`src/engine/drill.ts`) and `freshItem()` (`src/engine/notebook.ts`)
   both take the first fitting item of a pack, so they always land on it. Please let a lesson mark its first quiz (for
   example an `ItemBase` flag such as `firstQuiz`, skipped the way `workFirst` is), or have both prefer a later item.
6. **Lesson title wrap** (from the review, R6). `.play-head-title` in `src/styles/play.css` has `overflow-wrap:
   anywhere`, so “Brackets matter” breaks as “BRACKET / S MATTER” at 320 px. `overflow-wrap: break-word` (or less
   letter spacing) would break only a word too long for the line.
