# Skill-drill audit: Stop 6 (If… then)

The handoff is “Logic Quest: teach before the quiz” (2 Oct 2026). Its core rule: every new method is See one marked
case, then Do one with taps, then Quiz a twin. A lesson is not passed until the learner has done the marks. A new
rule family never shows up inside the quiz.

For Stop 6 the handoff says: a rule breaks only when the IF part happens and the THEN part does not. The other three
boxes are not breaks. See four boxes already drawn for one rule: three ✓, and one ✗ on the break. Do the same four
boxes, empty: the learner taps a ✓ or a ✗ on each box, and the only ✗ goes on the break. No “who broke it?” buttons
on that screen. “Who broke it” and any rule turned around come only after the four boxes are marked. Lessons 2 to 5
follow the same pattern from their own cards.

How the engine keeps every value honest:

- Every board is built by a helper in `engine/puzzles/conditionals.ts` (“the Do step: guided boards”).
  `fourBoxDrill` makes the four boxes. `factCasesDrill` makes the cases that fit a fact. `meaningDrill` makes the
  four cases for a rewritten rule. `cardDrill` makes rule-checker cards.
- Every mark comes from the truth table. A box is ✓ when `ruleHolds()` keeps its case. A case can happen when it
  keeps the rule. A sentence is true when `litHolds()` says so. A rewrite’s box is ✓ when `condHolds()` keeps it. A
  card must be turned when some back breaks the rule (`mustTurn`). What a board settles comes from `statusOf()` and
  `follows()`. Nothing is written by hand.
- Every message for a wrong tap names the box, case, sentence or card, and says what is true there.
- The tests in `engine/__tests__/conditionals.test.ts` (block “stop 6: See -> Do -> Quiz”) work every mark out again
  from the words on the board. They read the row and column names, the case sentences, the quoted sentences, and the
  card faces and backs. Then they solve each one by the file’s own brute force over the four cases.

Lessons are not locked in order: a learner can open any lesson. So each lesson’s own boards teach its method. Lesson
2 and lesson 3 ask “Can this case happen?” on each case, which is the four-box judgement again. Lesson 2 is the
converse trap, which the handoff puts only after the four boxes are marked. So lesson 2 starts with its own rule’s
four boxes, all marked by hand (added in review, see below).

## Lesson 1 · When is a rule broken?

**See.** The card “Four kinds of kids” shows the lunchroom grid. Rows: Dessert, No dessert. Columns: Ate all
veggies, Left some veggies. Three boxes have a ✓. The one ✗ is on Dessert – Left some veggies. The caption now names
it: “✓ means the rule is kept. The one ✗ is the break: “Dessert” with “Left some veggies.”” The card’s last line
says the same in words.

**Do.** Two grid boards.

1. “Mark the four boxes.” The same rule card, and the same four boxes, now empty. Nothing is shown: all four boxes
   are the learner’s.

   | Box | Right tap |
   |---|---|
   | Dessert – Ate all veggies | ✓ |
   | Dessert – Left some veggies | ✗ (the break) |
   | No dessert – Ate all veggies | ✓ |
   | No dessert – Left some veggies | ✓ |

   Example why, for a ✓ on Dessert – Left some veggies: “This box is for a kid who gets dessert but has not eaten all
   the veggies. The IF part happened, but the THEN part did not. That is the break, so this box gets the ✗, not a ✓.”

2. “A new rule, the same four boxes.” This is the handoff’s sample. The twin note says what changed: “The same four
   boxes, with a new rule: a red card and a hat.” Rule card: “Each kid in the game holds a red card or a blue card.
   If a kid is holding a red card, then they are wearing a hat.”

   | Box | Right tap |
   |---|---|
   | Red card – Hat | ✓ |
   | Red card – No hat | ✗ (the only break) |
   | Blue card – Hat | ✓ |
   | Blue card – No hat | ✓ |

   Example why, for a ✗ on Blue card – No hat: “This box is for a kid with a blue card and no hat. The IF part did
   not happen. The rule only talks about kids holding a red card. So this box keeps the rule. It gets a ✓, not a ✗.”

   The red card and hat words live only on this board (`HAT_BOXES`). They are not a quiz skin.

**Quiz.** Nothing moved. The pack is the four boxes in other stories: “Who broke the rule?” twice, “Did this break
the rule?” on the box with no IF part and no THEN part (the conflict), and “Did this break the rule?” on one box at
random. None of these turns a rule around.

A reading note. The handoff says “Do not mix trap rows into lesson 1 practice.” Its next lines name them: converse
rows, the rule turned around. Lesson 1 has none, and a test checks that no lesson 1 item says its rule turned around.
The code used to call the no-IF, no-THEN item “trap”. That item is box 4 of the board the learner just marked, so it
stays. Its plan key is now “neither”, so the two are not confused.

**Pass.** The default: both boards right, then 3 right on the first try with no hint. The handoff’s pass (all four
boxes are the learner’s marks, and the only ✗ is the break) is the first board, which the runner requires.

**Hint.** One case already marked, never the break. “Who broke the rule?” shows the first case that keeps the rule,
with the IF part, the THEN part and the rule marked. “Did Cal break the rule?” shows another kid in the same story,
with the same IF part and the other THEN part. For “Ash did not land in town and paid a gold coin,” it shows “Scorch
did not land in town and did not pay a gold coin.” The IF part: false. The THEN part: false. The rule: true.

## Lesson 2 · Turning it around

**See.** The first card, “One way only”, is on the pet rule card. It now marks the cat’s box in words: “A cat has four
legs, but a cat is not a dog. The cat keeps the rule. The rule only talks about dogs. But the cat breaks the
turned-around sentence.” The card “Could it happen another way?” now has the pet rule card, always true here. It
marks one case in words: “Rex has four legs. Is Rex a dog? Maybe. But Rex could be a cat with four legs. That case
keeps the rule, so it can happen. In it, “Rex is a dog” is false.”

**Do.** Three boards. The first is a grid of the four boxes, on the first card’s rule card. The other two are boards
of case rows, on the “always true” rule card. Each case row is one case that fits the fact. The learner marks “Can
this case happen?” (Yes or No) and each sentence (True or False).

1. “Mark the four boxes.” The pet rule, before it is turned around. Nothing is shown: all four boxes are the
   learner’s. Built by `fourBoxDrill(PET_BOXES, …)`, so each box is `ruleHolds()` of its case.

   | Box | Right tap |
   |---|---|
   | Dog – Four legs | ✓ |
   | Dog – Not four legs | ✗ (the break) |
   | Not a dog – Four legs | ✓ |
   | Not a dog – Not four legs | ✓ |

   Example why, for a ✗ on Not a dog – Four legs: “This box is for a cat with four legs. The IF part did not happen.
   The rule only talks about dogs. So this box keeps the rule. It gets a ✓, not a ✗.”

2. “Mark a case: going backward.” Rex has four legs.

   | Case | Can it happen? | “Rex is a dog.” | “Rex is not a dog.” |
   |---|---|---|---|
   | Shown: Rex is not a dog and has four legs. | Yes | False | True |
   | Rex is a dog and has four legs. | Yes | True | False |

   Example why, for No on “Can this case happen?”: “Rex is a dog and has four legs. The IF part and the THEN part
   both happened. That keeps the rule, so this case can happen.”

3. “Mark a case: going forward.” Max is a dog.

   | Case | Can it happen? | “Max has four legs.” | “Max does not have four legs.” |
   |---|---|---|---|
   | Shown: Max is a dog and has four legs. | Yes | True | False |
   | Max is a dog and does not have four legs. | No | False | True |

   Example why, for Yes on “Can this case happen?”: “Max is a dog and does not have four legs. The IF part happened,
   but the THEN part did not. That breaks the rule, so this case can’t happen here.”

No status buttons are on the boards. The board’s last words say what the marks settle: “Two cases can happen. “Rex
is a dog” is true in one and false in the other, so you can’t tell.” And: “Only one case can happen. “Max has four
legs” is true in it, so it is true for sure.”

**Quiz.** Nothing moved. Two backward items and two forward items, in other stories. Every sentence the quiz can ask
is one the boards mark: the IF part or NOT the IF part when the THEN part is known, and the THEN part or NOT the THEN
part when the IF part is known. The cards’ “turned-around sentence” (“If it has four legs, then it is a dog.”) is not
asked here. Lesson 4 asks it, after its own boards.

**Pass.** The default.

**Hint.** One case that fits the fact, marked: the IF part, the THEN part, the rule and the sentence. Going forward it
is the case that breaks the rule (“This case breaks the rule, so it can’t happen here.”). Going backward it is the
case where the IF part happened too. The learner checks the other case.

## Lesson 3 · The four moves

**See.** The card “The IF part happened” is on the same pet rule card. It now marks both of Rex’s cases: “A dog with
four legs keeps the rule, so that case can happen.” And: “Could Rex be a dog without four legs? That case breaks the
rule. Here the rule is always true, so it can’t happen.” The cards “The THEN part did not happen” (Pip) and “Two
traps” (Max, Coco) walk the other moves in words, as before.

**Do.** Two boards of case rows on that rule card, one fact of each kind. Each pet’s case that can happen is shown.
The learner marks the case that decides it.

1. “Mark the cases: a part happened.” Rex is a dog. Max has four legs.

   | Case | Can it happen? | Sentence |
   |---|---|---|
   | Shown: Rex is a dog and has four legs. | Yes | “Rex has four legs.” True |
   | Rex is a dog and does not have four legs. | No | “Rex has four legs.” False |
   | Shown: Max is a dog and has four legs. | Yes | “Max is a dog.” True |
   | Max is not a dog and has four legs. | Yes | “Max is a dog.” False |

2. “Mark the cases: a part did not happen.” Pip does not have four legs. Coco is not a dog.

   | Case | Can it happen? | Sentence |
   |---|---|---|
   | Shown: Pip is not a dog and does not have four legs. | Yes | “Pip is a dog.” False |
   | Pip is a dog and does not have four legs. | No | “Pip is a dog.” True |
   | Shown: Coco is not a dog and does not have four legs. | Yes | “Coco has four legs.” False |
   | Coco is not a dog and has four legs. | Yes | “Coco has four legs.” True |

Example why, for False on “Coco has four legs.” in the last row: “In this case, Coco has four legs. So “Coco has four
legs” is true here, not false.” Last words of board 2: “For Pip, only one case can happen, so “Pip is not a dog”
follows for sure. For Coco, two cases can happen, so nothing follows for sure.”

The learner taps No on two rows and Yes on two, so tapping Yes everywhere does not pass.

**Quiz.** Nothing moved. One item for each move, each in another story.

**Pass.** The default.

**Hint.** One case that fits the fact, marked. When something follows, it is the case that breaks the rule, never the
case the answer stands on. When nothing follows, it is the case that tempts: the IF part happened too, or the THEN part
did not happen either. For “Rosa got dessert. What follows for sure?” it shows “Rosa got dessert and left some
veggies.” The IF part: true. The THEN part: false. The rule: false. “This case breaks the rule, so it can’t happen
here.”

## Lesson 4 · Flip and NOT

**See.** The card “Why they match” keeps its grid: four cases down the side, and the rule, flip and NOT, flip only and
NOT only across the top. Every box is marked.

**Do.** Two grid boards on the first card’s rule card. The rows are the four cases of the See grid. The rule’s column
is shown marked (the worked case). The learner marks the sentence columns.

1. “Test the flip and NOT sentence.” The board quotes it: “If it does not have four legs, then it is not a dog.”

   | Case | The rule (shown) | Flip and NOT |
   |---|---|---|
   | A dog with four legs | ✓ | ✓ |
   | A dog without four legs | ✗ | ✗ |
   | A cat with four legs | ✓ | ✓ |
   | A bird with two legs | ✓ | ✓ |

2. “Test flip only and NOT only.” The board quotes each sentence.

   | Case | The rule (shown) | Flip only | NOT only |
   |---|---|---|---|
   | A dog with four legs | ✓ | ✓ | ✓ |
   | A dog without four legs | ✗ | ✓ | ✓ |
   | A cat with four legs | ✓ | ✗ | ✗ |
   | A bird with two legs | ✓ | ✓ | ✓ |

Example why, for a ✓ on A cat with four legs – Flip only: “A cat with four legs: the IF part, “it has four legs,” is
true. The THEN part, “it is a dog,” is false. That breaks the flip only sentence, so this box gets a ✗, not a ✓.”

No “same or not?” buttons are on the boards. The last words say it: “So neither one means the same as the rule.”

**Quiz.** One family moved out. “Which sentence means the same?” used to add an odd rewrite half the time (NOT in one
part only, or flipped with NOT in one part). No card or board marks those sentences. They are gone from lesson 4
practice, the stop check, the Arcade and the new examples after a miss (`extra: false` at each call site). The
engine’s default still makes them, so its own tests of that feedback still run. Every pick item now offers flip and
NOT, flip only and NOT only.

**Pass.** The default.

**Hint.** “Which sentence means the same?” checks one wrong choice for the learner, in the case that tells it apart:
“Here is one sentence, checked for you: “If it does not rain, then the grass does not get wet.” Check the others the
same way.” The case card: “A day with no rain when a sprinkler wets the grass.” The rule: true. This sentence: false.
“Does this sentence mean the same?” shows the case that keeps both sentences (“A dog with four legs.” The rule: true.
This sentence: true.), so the hint shows how to mark a case without giving the answer.

## Lesson 5 · Rule checker

**See.** The card “The IF card” now has the lunchroom rule card. It marks the “Dessert” card back by back: “With
“Ate all veggies,” the rule is kept. With “Left some veggies,” that kid broke the rule. One back could break the rule.
So you must turn this card over.” The letters card now also says why K is skipped.

**Do.** Two boards of card rows. Each row marks each possible back (Kept or Broken), then “Turn it over?”

1. “Check each card,” on the lunchroom rule card. The “Dessert” card is shown.

   | Card | One back | Other back | Turn it over? |
   |---|---|---|---|
   | Shown: “Dessert” | “Ate all veggies”: Kept | “Left some veggies”: Broken | Yes |
   | “Left some veggies” | “Dessert”: Broken | “No dessert”: Kept | Yes |
   | “Ate all veggies” | “Dessert”: Kept | “No dessert”: Kept | No |
   | “No dessert” | “Ate all veggies”: Kept | “Left some veggies”: Kept | No |

   Example why, for Yes on “Ate all veggies”: “With “Dessert” or “No dessert” on the back, the rule is kept. No back
   can break it, so you do not need to turn this card over.”

2. “Check the letter cards,” on the letters rule card from the last card. E is shown. The learner marks 7 (a vowel:
   Broken; a letter that is not a vowel: Kept; turn: Yes) and 4 (both backs Kept; turn: No).

**Quiz.** Nothing moved. Four cards in an everyday story, one card in a concrete story, four cards in a fantasy
story, then letters and numbers last.

**Pass.** The default.

**Hint.** One card checked back by back, never a card in the answer. For four cards it is the card where the IF part
did not happen: “The card that shows “No broom.”” The rule with “Helmet” on the back: true. The rule with “No helmet”
on the back: true. You must turn it over: false. For one card it is another card: the IF card, or the NOT IF card
when the IF card is asked.

## Tests

In `engine/__tests__/conditionals.test.ts`, block “stop 6: See -> Do -> Quiz (skill-drill handoff)”:

- **D-boards.** Each lesson’s boards are the ones listed. Each has 12 taps or fewer. Tapping nothing, or one option
  everywhere, does not pass. Marks are only true or false, yes or no, kept or broken. No board asks “Which…?”, “broke
  the rule?” or “What follows?”. The pass rule is the default.
- **D-see.** Each board’s scene is a key-idea card’s scene, except the hat board, which carries its twin note. The
  lesson 1 grid has three ✓ and one ✗, and its caption names the break. The Do grid is that grid, emptied. The lesson
  2, 3 and 5 cards mark their case in words. The lesson 4 See grid’s marks equal both Do boards’ right marks.
- **D-l1.** Each box is worked out again from the row and column names and the rule’s words. This covers lesson 1’s
  two boards and lesson 2’s pet boxes. The only ✗ is IF yes, THEN no. The handoff’s red card and hat sample is checked
  as written: ✓ ✗ ✓ ✓.
- **D-l2 and D-l3.** Each case is read back from its sentence. Each fits the fact read from the board’s first line.
  Can it happen, and each sentence, are worked out again. Each pet has its two cases, one shown. The last words match
  the brute force (true for sure, false for sure, can’t tell, or what follows). The boards cover every sentence the
  lesson 2 quiz asks, and all four moves.
- **D-l4.** Each column’s sentence is read from the board’s quote. Each box is worked out again. Only the rule’s
  boxes are shown.
- **D-l5.** Each back is read from its label, and each card from its face. Kept or broken and the turn are worked out
  again. The turned cards are the IF card and the NOT THEN card.
- **D-why.** Every wrong tap has words. They name that box, case, sentence or card. They say the right mark, not the
  one tapped. All board text reads at grade 7 or lower, with no sentence over 25 words, curly quotes, no “Wrong”, and
  “both” only as “the IF part and the THEN part both”.
- **D-quiz.** Over 60 seeds of practice, the check and new examples, and 300 Arcade seeds, every item’s skill is one
  its lesson teaches. Every “Which sentence means the same?” item offers only the three marked sentences. No lesson 1
  item says its rule turned around. Every lesson 1 pack has the no-IF, no-THEN box. Lesson 2 asks only sentences its
  boards mark.
- **D-hint.** Every practice hint has a marked case. Its truths are worked out again from its label. It is never the
  answer’s case: a kept case for “who broke it”, another case for “did this break it”, the case that breaks the rule
  when something follows, a wrong choice for “which means the same”, and a card not in the answer.

In the same file, block “stop 6 review: the skill-drill build”:

- **R-order.** Lesson 2’s first board is its rule’s four boxes. It has two rows, two columns and four boxes, all the
  learner’s, with one ✗. It is checked as written (Dog – Four legs ✓, Dog – Not four legs ✗, Not a dog ✓ ✓). Nothing
  marked, or a ✓ everywhere, does not pass. Its scene is the “One way only” card’s scene, and that card marks the cat’s
  box in words. Every lesson 2 pack has a backward item, so the four boxes really do come before a rule turned around.

The contract test (`stops.test.ts`) passes for Stop 6 with `DRILL_ALL=1`: guided boards, hint cases, reading level.
A mutation check (flipping one engine answer on the four boxes and on a sentence mark) fails four of these tests.
In review, swapping the pet board’s “Four legs” and “Not four legs” names fails D-l1 and R-order.

Results after the review fixes: `npx tsc --noEmit -p .` clean. `DRILL_ALL=1 STOP=6 npx vitest run
src/engine/__tests__/stops.test.ts`: 8 of 8. `npx vitest run src/engine/__tests__/conditionals.test.ts`: 45 of 45.
Full `npx vitest run`: 17 files, 492 tests. The check still gives 300 different checks in 300 seeds (the check is
unchanged).

## Shared changes requested (not made)

1. `src/engine/__tests__/stops.test.ts`: add `'s6.l1'` to `'s6.l5'` to `DRILLED`, so the contract test checks Stop 6’s
   boards and hint cases without `DRILL_ALL=1`.
2. Lesson order (`StopScreen`, or `LessonRunner`): the handoff wants “who broke it” and any rule turned around only
   after the four boxes are marked. Lesson 1 and lesson 2 now mark four boxes by hand before their own quiz. Lesson 3
   (“Max has four legs”: the THEN part happened) and lesson 4 (flip only) also quiz a rule turned around. Lesson 3
   marks the IF-without-THEN case and the THEN-without-IF case by hand, and lesson 4 shows the rule’s boxes. Neither
   marks all four boxes by hand, and a learner can open either one first. Request: open lesson k + 1 only after
   lesson k is passed, or let a lesson name the lessons it needs (as Stop 3’s review asks too).
3. `Scene` grid (`src/engine/types.ts`, `SceneView`): an optional label for one cell, so the See grid can write “the
   break” inside the ✗ box. Today the caption names it.
4. Draw the twin note. `DrillBoard` never shows `DrillStep.twin`, and `drillSpeech` never reads it. The hat board’s
   body says what changed (“Here is a new rule: …”), so nothing is lost here. Request: draw `twin` above the board and
   read it aloud, for every stop (as Stop 3’s review asks too).

## Review

An independent review of the build above (branch `drill-stop6-v`, from `drill-stop6` at 3163325).

### Handoff lines for Stop 6, and where the code meets them

| Handoff line | Where it is met |
|---|---|
| Skill: “A rule breaks only when the IF part happens and the THEN part does not. The other three boxes are not breaks.” | `ruleHolds()` in the engine. `fourBoxDrill` throws unless exactly one box breaks the rule. D-l1 checks each four-box board’s only ✗ is IF yes, THEN no. |
| See: “four boxes already drawn for one rule. Three are marked with a check. The single cross is on IF-yes / THEN-no, and that cell is labeled ‘the break.’” | Card “Four kinds of kids” (`L1_SEE`): three ✓, and the ✗ on Dessert – Left some veggies. The caption and the card’s words call it “the break”. The box itself has no label (shared request 3). |
| Do: “the same four boxes, empty. Kid taps check or cross on each box and must place the single cross on the break cell.” | `L1_DRILL`: the See grid’s rows and columns, no box shown, four taps. The only ✗ is Dessert – Left some veggies. |
| “No ‘who broke it?’ buttons on this screen.” | Every board has only ✓ or ✗ boxes, Yes or No, True or False, Kept or Broken. D-boards checks that no board asks “Which…?” or “broke the rule?”. |
| Quiz: “‘who broke it,’ and any converse trap (‘turning it around’), only after the four boxes are marked.” | Lesson 1’s quiz opens only after `L1_DRILL` and the hat board are right. Lesson 2’s quiz now opens only after `L2_BOXES` (fixed in this review). The order across lessons is shared request 2. |
| “Do not mix trap rows into lesson 1 practice.” | Lesson 1’s pack: “Who broke the rule?” twice, the no-IF, no-THEN box, and one random box. D-quiz checks that no lesson 1 item turns its rule around. |
| Pass: “all four boxes are the learner’s marks, and the only cross is the break cell. That board is required before any quiz.” | No box of `L1_DRILL` (or `L2_BOXES`) is shown. The runner opens the quiz only after the boards are right. In the browser, leaving after only Next keeps the lesson not done. |
| Stop doing: “Do not ask who broke a rule, and do not put converse rows in the first practice set, until the four boxes have been marked by hand.” | As above. |
| Sample: red card and hat, ✓ ✗ ✓ ✓. “‘If they are wearing a hat, then they have a red card’ is a later quiz, not this screen.” | `L1_TWIN` (`HAT_BOXES`), checked as written in D-l1. The hat board marks only the rule. Nothing is turned around on it. |
| Build order: “mark the four boxes and find the single cross before any ‘who broke it’ item or any converse-trap row.” | Lessons 1 and 2, as above. |
| “A learner who only taps Next on the marked example does not pass.” “The Do screen uses the same board as See.” “The quiz does not use a new rule.” “The hint shows one marked case.” | The browser run (below). Every board’s scene equals a card’s scene, and the hat board has a twin note. Odd rewrites are out of every quiz path. Every practice item has a `hintCase`. |

### Every Do mark, worked out again

I printed every board (title, body, rows, marks, answers, words for wrong taps). Then I solved each mark by hand from
the words on the board. “If a, then b” breaks only when a is true and b is false. A case can happen when it keeps the
rule. A card is turned when one of its backs breaks the rule. All 53 marks the learner taps, and all 28 shown marks,
match the engine. The tables in each lesson above are those answers. The builder’s tests (D-l1 to D-l5) re-read the
same words with their own brute force. The new pet board is in D-l1 and R-order.

### Words for a wrong tap

Each one names the box, case, sentence or card, and what is true there. For example: “This box is for a cat with four
legs. The IF part did not happen. The rule only talks about dogs.” None is generic, and none is about another card.
The order of the first mismatch: a grid is read row by row. A card row marks its backs before “Turn it over?”, which
depends on them. A case row marks “Can this case happen?” before its sentences. These two do not depend on each other,
so either order is fair. In the browser, a wrong last mark on each of the 11 boards showed its own words exactly.

### Same board, no answer buttons, phone size

Taps per board: lesson 1: 4 and 4. Lesson 2: 4, 3 and 3. Lesson 3: 4 and 4. Lesson 4: 4 and 8. Lesson 5: 9 and 6.
None is over 12. No board asks the quiz’s question. “Turn it over?” is decided card by card, as s1.l4 decides “Keep or
reject?” case by case.

### Quiz families

- Odd rewrites are out of practice, the check, the Arcade and new examples. All four `samePickItem` calls in
  `stop6.ts` pass `extra: false`, and nothing else in `src` calls it.
- The notebook builds from lesson practice and `stop6.fresh`, so it gets no odd rewrite either.
- No idea card ever named an odd rewrite. `SKILL_NAMES` still has all 12 Stop 6 skills, and every one is in practice.
- The check is unchanged: 8 to 10 items, every lesson, a conflict item, 300 different checks in 300 seeds.

### Hints

Every practice item has a hint and a marked `hintCase`, never the answer’s case (D-hint and the contract). Over 30
seeds, the hint and its case read at grade 0.2 (lesson 2) to 1.4 (lesson 5). The longest sentence is 23 words.

### Pass rule

The handoff gives no first-try rule for Stop 6. Its lesson 1 pass is the board itself, which the runner requires. So
every lesson uses the default: the boards, then 3 right on the first try with no hint. There are no include tags.

### Reading level and words

The contract’s reading test passes. Board text reads at grade 7 or lower, with no sentence over 25 words (D-why). Each
“both” names what it means (“the IF part and the THEN part both”, “IF and THEN both”, “both parts”). There is no “that
row”, “the opposite” or “Wrong”, and every quote is curly. There is no regex lookbehind in `stop6.ts` or
`conditionals.ts`.

### Browser check at 320px

I built the worktree and served it with `vite preview` on port 5306. The dev server could not serve the font files
through the worktree’s `node_modules` link, so its console showed 403s. Those are not app errors, and the built bundle
loads every file. The save had stops 1 to 5 passed. I opened each lesson from the stop page and paged through the
cards with Next until “Now you do it”.

| Lesson | Cards | Boards (taps) | Wrong mark named | Done words | Overflow | Quiz | Hint case |
|---|---|---|---|---|---|---|---|
| s6.l1 | 5 | four boxes (4), hat (4) | yes, yes | yes, yes | none | Try 1 of 4 | 3 truths |
| s6.l2 | 5 | four boxes (4), backward (3), forward (3) | yes ×3 | yes ×3 | none | Try 1 of 4 | 4 truths |
| s6.l3 | 5 | a part happened (4), did not (4) | yes, yes | yes, yes | none | Try 1 of 4 | 3 truths |
| s6.l4 | 5 | flip and NOT (4), flip only and NOT only (8) | yes, yes | yes, yes | none | Try 1 of 4 | 2 truths |
| s6.l5 | 5 | lunchroom cards (9), letter cards (6) | yes, yes | yes, yes | none | Try 1 of 4 | 3 truths |

- “Overflow: none” means no page overflow on any card, board, quiz or hint. It also means no board element passed
  the right edge, checked before marking, after a wrong check and after the right one.
- A wrong check flagged exactly one box or chip. The last board’s button says “Start the puzzles”.
- With only Next on lesson 2’s cards, then leaving at its first board, Stop 6’s done lessons stayed empty.
- Console errors: none.

### Problems found, and what was done

1. **Lesson 2 could quiz a rule turned around before the four boxes were marked by hand (medium, fixed).** The
   handoff puts the converse trap (“turning it around”) only after the four boxes are marked. Lessons open in any
   order, and lesson 2’s boards marked only two cases by hand. Fix: lesson 2 now starts with `L2_BOXES`, the pet
   rule’s four boxes. It is built by `fourBoxDrill(PET_BOXES, …)`, so every box is computed, and all four are the
   learner’s. Its scene is the “One way only” card’s rule card, and that card now marks the cat’s box in words.
   Evidence: R-order, D-l1, the contract test, and the browser run (lesson 2’s first board).
2. **Lessons 3 and 4 also quiz a rule turned around, without all four boxes by hand (low, not fixed: shared).**
   Lesson 3’s “Max has four legs” and lesson 4’s flip only are the converse trap. Their boards mark some boxes by hand
   (lesson 3) or show the rule’s boxes (lesson 4). Locking the lesson order fixes this for every stop: shared request 2.
3. **The hat board’s twin note is not drawn (low, not fixed: shared).** The body names the change. Shared request 4.
4. **Pip’s shown case (checked, no change).** Board “a part did not happen” shows Pip as not a dog without four legs,
   and the learner marks Pip as a dog. This matches s1.l4: the shown row is the case the card concludes (“So Pip is not
   a dog”), and the learner marks the case that is rejected.
5. **The engine’s `samePickItem` still adds an odd rewrite when `extra` is left out (info, no change).** Every Stop 6
   call passes `extra: false`, and D-quiz covers practice, the check, the Arcade and new examples. The default stays so
   the engine’s own feedback tests keep running.
6. **The 320px check of the 3-column board (done).** The builder listed it as a request. It fits: see the table above.
