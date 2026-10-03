# Skill-drill audit: Stop 1 (True or False?)

The handoff is “Logic Quest: teach before the quiz” (2 Oct 2026). Its core rule: every new method is See one marked
case, then Do one with taps, then Quiz a twin. A lesson is not passed until the learner has done the marks. A new
rule family never shows up inside the quiz.

Lesson 4 (Treasure signs) was rebuilt first, in commit 0e1b9d0. It is the reference, and this work leaves it as it
is. This sheet covers lessons 1, 2 and 3.

How the engine keeps every value honest:

- Lesson 1 marks come from each sentence's label, the same label that sets a quiz answer (`sentenceRow`,
  `sortedScene` in `content/stop1.ts`).
- Lesson 2 marks come from `judge()`, which tries every way to fill the face-down cards (`verdictDrillRow` in
  `engine/puzzles/statements.ts`).
- Lesson 3 marks come from `holds()` on the cards, and the right NOT is checked with `isExactOpposite()`
  (`notDrillRow`). Each wrong NOT must agree with its sentence on the board, or the helper throws.
- The tests then work every mark out again with their own evaluator. They read each sentence back from its words.

## Lesson 1 · What is a statement?

**See.** A new last card, “An example,” shows a board with four sentences from the cards, already sorted. Each one
has two boxes: True and A statement.

| Sentence | True | A statement |
|---|---|---|
| “A week has seven days.” | ✓ | ✓ |
| “Cats can fly.” | ✗ | ✓ |
| “Is it raining?” | blank | ✗ |
| “Pizza is the best food.” | blank | ✗ |

A blank True box means the sentence can't be true or false. The old five cards stay as they were. The lesson now
has six cards, the most allowed.

**Do.** One board, “Sort a sentence.” The sorted board stays up above it. The learner taps A statement or Not a
statement for three new sentences. These are the same two buttons the quiz uses.

| Learner's row | Right tap |
|---|---|
| “The moon is made of cheese.” (the handoff's sample) | A statement |
| “Is the moon made of cheese?” (the handoff's sample) | Not a statement |
| “The moon is the prettiest thing in the sky.” | Not a statement |

Example why, for tapping Not a statement on the cheese sentence: “‘The moon is made of cheese’ says something about
the world, but it is wrong. So it is false. A statement does not have to be true. It only has to be true or false.
So a false sentence is still a statement.”

**Quiz.** The rule family is the same: statement or not. What changed:

- New sentences only. Six bank sentences that the cards show used to come back as quiz items, in 549 of 1,000
  practice sets. They are now kept out of practice, the check, the Arcade and new examples (`L1_SHOWN`). So is
  the near twin “Is it raining outside?”
- The sorts come first: not a statement, a false sentence, a true or can't-check one, then an opinion or an
  exclamation. Then one “Which of these” item, which is the same sort done on each choice. Any three sorts in a row
  hold a false sentence and one that is not a statement.
- Nothing moved out of the stop. Every kind of sentence in the quiz is on a card or on the board.

**Pass.** Three right on the first try, in a row, with no hint. One of them must be a false sentence, and one must
be a sentence that is not a statement (tags `false-statement` and `not-statement`). Every planned set has both.

**Hint.** The hint shows one sentence already sorted. It is a teaching sentence of the same kind, never a bank
sentence, so it never shows a quiz sentence. For “Snow is hot.” it shows “Snow is purple.” with “The sentence:
false. It is a statement: true. It is false, but it is still a statement.” A “Which of these” item shows one of
its own choices that is not the answer, already sorted.

**Tests** (in `engine/__tests__/statements.test.ts`):

- The See board's marks match labels written in the test.
- The Do: the handoff's sample taps, every message for a wrong tap, and that no Do sentence is in the bank.
- The quiz order and tags, and the pass rule.
- No shown sentence appears in 300 seeds of practice, check, Arcade and new examples.
- Hint cases are marked, never the asked sentence, and never the answer.

## Lesson 2 · True, false or can't tell

**See.** The cards stay as they were. “Can't tell yet” marks a case on its picture: “There is a yellow card” is
Can't tell, because card 3 is face down. “Sometimes you can tell” marks a true one and a false one.

**Do.** There are two boards.

1. “True, false or can't tell,” on the same cards as “Can't tell yet.” The yellow row is shown already marked
   (Can't tell). The learner marks three new sentences:

   | Sentence | Right tap |
   |---|---|
   | “There is a square.” | True (card 2) |
   | “Every card is big.” | False (card 2 is small) |
   | “There is a triangle.” | Can't tell (card 3 could be one) |

2. “Take one card away.” This is a twin of the “Sometimes you can tell” cards. Card 3, the blue square, is gone.
   That leaves one red card and one face-down card, the handoff's sample. “There is a red card” is shown as True.
   The learner marks “Every card is red”: Can't tell. On the card, the blue card made it false. Now the face-down
   card is why it can't be told.

Example why, for tapping True on “Every card is red”: “If face-down card 2 is not red, the sentence is false. So
‘Every card is red’ might be false. You can't tell yet.”

**Quiz.** This lesson's cards and board mark only “There is …” and “Every card is …” sentences. These kinds left
lesson 2's quiz, its check items, its Arcade items and its new examples:

- “No card is …”
- “Exactly k …”
- “At least k …”
- “There are more … than …”
- “The first card is …”
- “Every big card is …” and “Every red card is a …”

They also left the stop, since no Stop 1 card marks a true, false or can't-tell judgment on them. The engine still
has them, and its own tests still run them. Two kinds the board teaches were added to the engine: “There is a
\<shape\>” and “Every card is \<color\>”. The second gives the quiz more false sentences. Try 1 is still a can't-tell
trap, where the cards you can see point one way.

**Pass.** Three right on the first try with no hint. One of them must be a right Can't tell (tag `cant-tell`).
Try 1 is always one.

**Hint.** The hint shows one way to fill the face-down cards, already checked. It is a case card from the item's
own teaching. For a can't-tell row, it is the filling that goes against what the cards you can see suggest. For a
settled row, it is the easy filling; the explanation after a miss keeps the one that tries hardest to flip it.

**Tests:**

- Every Do answer is the brute-force verdict on the board, read back from the sentence's words.
- Every message for a wrong mark is true on the board. It names a card you can see, or it names the face-down card
  that decides it (checked over every filling).
- Board 2 is card 4's board with one card taken away, and on card 4's board the same sentence is false.
- Practice, check, Arcade and new examples ask only the taught kinds. All five forms show up.
- Each set starts with a Can't tell, and the pass rule needs one.
- Hint cases are real fillings from the item's teaching.

## Lesson 3 · The NOT flip

**See.** “The every trap” marks “Every card is red” on its cards: it is false there, and its NOT, “At least one
card is not red,” is true. “More, a tie, and at least as many” marks the tie. “A quick trick” works the “there is”
case in words: “It is not true that there is a red card” means “No card is red.” Since the review, it ends on the
check (see Review): with a red card the sentence is true and “No card is red” is false; with no red card it is
the other way round, so they never agree. “NOT and counting” works the “exactly” case in words.

**Do.** There are two boards. Each row has three marks: Its NOT (pick a sentence), the sentence True or False on
these cards, and its NOT True or False on these cards. The options are in word order, so where the right one sits
does not give it away.

1. “Mark the NOT,” on the cards of “The every trap.” Shown: “Every card is red.” Its NOT is “At least one card is
   not red.” It is false; its NOT is true. The wrong options are “No card is red.” and “Every card is blue.” This is
   the handoff's sample with cards: not red is not blue. The learner's row is “Every card is big.” Its NOT is “At
   least one card is not big.” It is false; its NOT is true.
2. “A counting trap,” on the tie cards. Shown: “There are more red cards than yellow cards.” Its NOT is “There are
   at least as many yellow cards as red cards.” It is false; its NOT is true. The learner's row is “At least three
   cards are red.” Its NOT is “Fewer than three cards are red.” It is true; its NOT is false. The trap is “At most
   three cards are red.” With exactly 3 red cards, it is true together with the sentence.

Example why, for picking “At most three cards are red.”: “‘At least three cards are red’ is true here: there are 3
red cards. ‘At most three cards are red’ is true here too: there are 3 red cards. A statement and its NOT never
agree.”

**Quiz.** The quiz has five NOTs, all of kinds the cards and the board taught:

1. An every trap
2. “There is a … card”
3. “More … than …”
4. “At least k …” (a twin of the second board)
5. Another every, or “exactly k”

“Every” and “at least” are in every set. These kinds left lesson 3's quiz, check items, Arcade items and new
examples:

- “No card is …” (its NOT)
- “More than k …”
- “The first card is …”
- “Every big card is …” and “Every red card is a …”
- “There is a big red circle”

No card in the stop marks a NOT for them, so they left the stop too. The engine's NOT bank still has them, and its
own tests still check every one. The check now draws its every trap from the two taught every kinds, and its
comparison from more, at least or exactly.

**Pass.** Three right on the first try with no hint. One of them must be a counting trap (tag `counting-trap`): every,
more, exactly or at least, as the handoff names them. Every set has four of them: tries 1, 3, 4 and 5.

**Hint.** The hint shows one row already checked: the row from the item's own teaching where the classic mistake
agrees with the statement. For “Every gem is red,” that is a row with one gem that is not red. The statement is
false there, and the NOT is true.

**Tests:**

- Every Do mark is worked out again from the words. Each option is read back into a sentence. Exactly one option is
  the NOT, by brute force over every row of 1-3 cards and 600 longer rows, and it is the answer.
- Each wrong option agrees with its sentence on the board.
- The quiz uses only the taught kinds across practice, check, Arcade and new examples. All six forms show up.
- Every set has every, at least and a counting trap.
- Hint cases are teaching rows with the statement and its NOT the other way round from each other.

## All three lessons

A learner who only taps Next marks nothing on the board, so the board stays not done, and the pass rule is not met
with no answers. A learner who marks every board right and then gets three twins right on the first try meets the
rule. A hint on one of the three means not yet. The test “a learner who only taps Next does not pass …” covers
this. The contract `DRILL_ALL=1 STOP=1 npx vitest run src/engine/__tests__/stops.test.ts` passes for all four
lessons.

The stop check has 9 or 10 items. It covers every lesson, and it has a conflict item in all 300 seeds. All 300 of
300 seeds give a different check. Its items are only of kinds the lessons teach.

## Review

An independent review of branch `drill-stop1` (commit ab1e014), done on branch `drill-stop1-v`. It assumed there
were mistakes and checked each point with evidence.

### Handoff lines for Stop 1, and where the code meets them

| Handoff line | Where it is met |
|---|---|
| s1.l1 See: “a picture or labeled examples on screen first” | Card 6 “An example”: four card sentences sorted on a board (`sortedScene(L1_EXAMPLE)`). |
| s1.l1 Do: “one new sentence, examples still visible, kid taps Statement or Not a statement” | `L1_DRILL`: the same board object stays up; three new sentences, the quiz's two buttons. |
| s1.l1 Quiz: “new sentences the examples did not use … a false statement and a non-statement” | `L1_SHOWN` keeps card and board sentences out of practice, check, Arcade and new examples. Tries 1 and 2 are a non-statement and a false one. |
| s1.l1 Pass: “Three first-try sorts in a row … one false … one not a statement” | `pass: { firstTry: 3, inARow: true, include: [false-statement, not-statement] }`. See the shared request on `passState`. |
| s1.l1 Sample: moon cheese → Statement; “Is the moon made of cheese?” → Not a statement | Board rows 1 and 2, answers `yes` and `no`. |
| s1.l2 See: “one picture with the decision already marked and the evidence named” | Card 3 “Can't tell yet” (face-down card 3), card 4 (card 1 red, card 3 blue). |
| s1.l2 Do: “same kind of picture, kid taps True, False, or Can't tell” | `L2_DRILL` board 1 on card 3's cards; board 2 is the twin with card 3 gone. |
| s1.l2 Quiz: “new frames … a face-down card and a pair of conflicting clues” | Three frames; every row has face-down cards; try 1 is a can't-tell trap where the cards you can see point one way. |
| s1.l2 Pass: “at least one … the correct tap is Can't tell” | `include: [cant-tell]`; try 1 always has it. |
| s1.l2 Sample: one red card, one face-down, “Both cards are red” → Can't tell | Board 2: “Every card is red.” → Can't tell, and the message names face-down card 2. |
| s1.l3 See: “one statement, its NOT already written, and a picture where one is true and the other is false” | Card 3 “The every trap”; the shown row on board 1 marks both truths. |
| s1.l3 Do: “taps the exact NOT of a shown statement, then taps which of the two is true” | `L3_DRILL`: pick the NOT, then mark the sentence and its NOT True or False. |
| s1.l3 Quiz: “twins, including ‘every’ and ‘at least’” | Try 1 every, try 4 at least, in every set. |
| s1.l3 Pass: “One of them is a counting trap” | `include: [counting-trap]` (every, more, exactly, at least). |
| s1.l3 Stop doing: “no shortcut that skips the both-true / both-false check. ‘Not red’ is not ‘blue.’” | Board 1 offers “Every card is blue” and “Every card is small” as wrong NOTs. Card 2 now ends on the check (fixed in this review). |
| s1.l4 (reference) | Left as it is, apart from the “boxs” spelling fix below. |

### What was checked, and how

- **Every Do mark, worked out again apart from the engine.** A scratch script read each board's words back into
  sentences and judged them with its own evaluator: brute force over all 18 kinds of card for each face-down card
  (lesson 2), every row of up to 3 cards plus rows of 4 to 7 (the exact NOT in lesson 3), and the sign words for
  lesson 4. It also checked every card fact inside every lesson 3 message (“card 2 is small, not big,” “there are 3
  red cards”). 111 checks, 0 mismatches.
- **Families.** Over 400 seeds, practice, the check, the Arcade and new examples were sorted by sentence form. Lesson 2
  asks only “There is …” and “Every card is …”. Lesson 3 asks only every, there is, more, at least and exactly.
  Lesson 4 asks only “Exactly one sign is true.” No idea card names a family that moved out.
- **Words.** All 12,516 player strings of Stop 1 (150 seeds of every item, its teaching and hints, plus cards and
  boards) were searched for straight quotes, “Wrong,” bare “both,” “that row,” “the opposite” and bad plurals. That
  search found “boxs.”
- **Boards.** No board has a “which …?” answer button. Taps per board: 3, 3, 1, 3, 3 (lessons 1 to 3) and 5
  (lesson 4).
- **Browser.** A Playwright run at 320, 375 and 430 px wide opened each lesson from the stop page, paged through the
  cards to “Now you do it,” and on each board: pressed Check with nothing marked (it says the marks are empty), set
  the first and the last mark wrong (the status named the first mismatch, and two chips were flagged), set only
  the last mark wrong (the status was that mark's own words), then marked all right and pressed “Start the
  puzzles.” Every quiz item was answered right through to “Lesson done.” There was no sideways scroll on any card,
  board or try, and no console errors on the built app. On the dev server, the only errors were font files refused
  with 403, because the worktree's `node_modules` is a link outside the served folder.

### Problems found and fixed

1. **“Check the other boxs the same way.”** (medium). The sign engine made a plural by adding “s,” so the box
   board's hint said “boxs.” Every lesson 4 practice set has a box board, so a learner who opened the hint saw it.
   The owner-rule teaching text had the same fault. Fix: each skin now spells out its plural (`nouns`: chests,
   doors, caves, boxes) in `engine/puzzles/signs.ts`. Test: “T-read: plurals are spelled out …” in `signs.test.ts`.
2. **“A quick trick” taught a shortcut with no check** (low). The handoff says not to teach a shortcut that skips
   the both-true / both-false check. The card gave the “It is not true that” trick and stopped. It now ends on the
   check, done on a row with a red card and a row without one. Test: “lesson 3 See: ‘A quick trick’ is not a
   shortcut past the check …” in `statements.test.ts` reads each claim back and checks it on every small row.
3. **Pass groups were only checked on 20 seeds** (low, test gap). A new test checks every include tag in every
   planned pack for 300 seeds, and that a pack answered right meets the rule.

### Looked at and kept

- **Lesson 3 asks “there is” and “exactly,” which no board has the learner tap.** Each has a worked case on a card:
  card 2 (“there is,” now with its check) and card 5 (“exactly”). The handoff's skill for this lesson is one method,
  the exact NOT, “including counting traps (at least, every).” The boards make the learner do that method on
  “every” and on a counting trap. The quiz items are twins of the card cases, worded the same way. So no new rule
  family enters the quiz. Adding two more rows would double the taps.
- **Lesson 1 hints show a teaching sentence of the same kind.** It is a different sentence from the one asked, so
  it models the question to ask. A hinted answer never counts toward the pass.

## Shared changes requested (not made)

- `engine/__tests__/stops.test.ts`: add `s1.l1`, `s1.l2` and `s1.l3` to `DRILLED`. Then the See, Do, Quiz contract
  runs on them without `DRILL_ALL=1`.
- `engine/drill.ts` `passState`: when the rule says “in a row,” count the include groups only inside that last
  streak. Lesson 1's rule is “three in a row, with a false sentence and one that is not a statement.” Today a false
  sentence answered earlier, before a miss, still counts. The practice order keeps the planned set honest, but extra
  items can slip past.
- `engine/drill.ts` `passState` (review): “in a row” counts only the streak at the end. A learner who gets tries 1
  to 4 right and then misses try 5 must get three more in a row, though the handoff's “three first-try sorts in a
  row” was already met. Accept any run of the right length, with the include groups inside that run.
- `engine/drill.ts` `drillSpeech` (review): option labels that end in a period read as “At least one card is not
  red..” and “… not big. or Every card is small. or …” in lesson 3. Drop a label's last period before joining.
- `game/components/DrillBoard.tsx` (review): `step.twin` (what a twin board changed) is never drawn. Lesson 2's
  twin says it in its body, but a drawn line would make every twin say it.
- `game/progressStats.ts` (review): the name of `s1.not-more` still says “(a tie or exactly k).” The “exactly k”
  part came from “More than k …”, which lesson 3 no longer asks. Only new lines may be added there, so it is left.
- `game/components/DrillBoard.tsx`: a shown mark with sentence options (lesson 3's “Its NOT”) shows only the right
  option. Showing the other options crossed out would put “not ‘Every card is blue’” on the shown row itself. Today
  the row's note says it in words.
- `engine/notebook.ts` `freshItem`: old notebook cards for skills no lesson quizzes now (`s1.not-none`,
  `s1.not-first`) fall back to the lesson's first practice item. A small map from a retired skill to a taught one
  would make that choice on purpose.

## Lesson 4, Treasure signs: the reference (built first, commit 0e1b9d0)

> Superseded in part by “The case board (v0.5.0)” below: the example, the Do step and the quiz order changed.

This is the screen the player hit in the handoff: Key idea 4 walked the chest example, then Try 1 jumped to a new
skin and two new rule families. The chest card stays exactly as it was.

- **See.** Key idea 4, “An example”: the Gold, Silver and Bronze chests with the rule “Exactly one sign is true.” It
  still walks the three cases and concludes Silver. “Other rules” (card 5) is gone from the lesson.
- **Do.** “Mark a case” (`L4_DRILL`, built by `signDrill`), on the same board object as the card.
  - The Silver row is shown: False, False, True, 1, Keep.
  - The learner marks the Gold row: True, True, False, 2, Reject.
  - No “which chest?” buttons. Every answer is computed by `signHolds` and `fitsRule`.
  - A wrong mark names the first mismatch: “If the treasure is in the Gold chest, the Silver chest sign is true. It
    says, “The treasure is not in this chest.” The treasure is not in the Silver chest.”
- **Quiz.** Four puzzles, all “Exactly one sign is true.”
  - Try 1 is the frozen Ice, Fire and Moss caves (`L4_FIRST_QUIZ`). Ice: “The dragon egg is not in the Moss cave.”
    Fire: “The dragon egg is in the Moss cave.” Moss: “The dragon egg is not in the Ice cave.” Its answer buttons
    show only after the learner has marked all three cases (`workFirst`). Ice: True, False, False, 1, Keep. Fire:
    True, False, True, 2, Reject. Moss: False, True, True, 2, Reject.
  - Then a door board, a box board and a chest twin (the example with one sign changed, never with the answer
    Silver), in any order. The twin and the cave are fixed items, so they are never reused as extra items, repairs
    or new examples.
- **Moved out.** “Exactly two”, “every sign is false” and the owner’s sign left the lesson, the stop check, the Arcade
  and the new examples. Each needs its own See, Do and Quiz lesson; Stop 1 already has four lessons, so they are out
  of the stop for now.
- **Hint.** One case already marked, never the answer case (`signHintCase`). After a miss, the explanation shows every
  case marked, the kept one included.
- **Pass.** The board marked right, then 3 right on the first try with no hint.
- **Tests.** `signs.test.ts`: “lesson 4 teaches one rule …”, “Do: the same chest board …”, “Quiz try 1 is the frozen
  cave board …”, “Quiz tries 2-4 …”, “the Hint shows one case already marked …”. The board was also driven in a
  browser at 320px: only tapping Next leaves the lesson not done; a wrong Silver mark shows the message above; the
  full run completes the lesson.

## Lessons 5-7: the other sign rules, one lesson each

> Superseded in part by “The case board (v0.5.0)” below: the example, the Do step and the twin changed.

The handoff took “exactly two”, “every sign is false” and the owner’s sign out of Treasure signs: each needs its own
later lesson with the same See → Do → Quiz shape. They are now Stop 1 lessons 5, 6 and 7 (the lesson cap went from 6
to 7). Each is built by `signLesson` in `src/content/stop1.ts`, so every case, count and answer comes from the engine.
The marks below were printed from the built boards.

| lesson | worked example (chests) | shown (kept) | the learner marks |
|---|---|---|---|
| s1.l5 Every sign is false | “The treasure is in this chest.” / “The treasure is in the Gold chest.” / “The treasure is not in this chest.” | Bronze: False, False, False, 0, Keep | Gold: True, True, True, 3, Reject |
| s1.l6 Exactly two signs are true | “The treasure is not in the Silver chest.” / “The treasure is in this chest.” / “The treasure is in the Gold chest.” | Gold: True, False, True, 2, Keep | Silver: False, True, False, 1, Reject |
| s1.l7 The owner’s sign | “The treasure is in the Bronze chest.” / “The treasure is in this chest.” / “The treasure is not in the Silver chest.” | Silver: False, True, False, 1, Keep | Gold: False, False, True, 1, Reject (the Gold chest sign is false) |

- **See.** Two short cards (the new rule; how to check it), then “An example”: the three cases in words and the
  conclusion.
- **Do.** “Mark a case” on the example’s own board: the kept chest shown, a rejected chest marked by the learner.
- **Quiz.** A twin of the example first (one sign changed, a different answer), then a door, a cave and a box, in any
  order. Every one uses only that lesson’s rule.
- **Check.** Ten items cover all seven lessons: two each for lessons 1-3, and one sign puzzle per sign lesson, each
  with its own rule. No quiz, check, Arcade item or new example repeats a worked example or the frozen cave.
- **Tests.** `signs.test.ts`, “the other sign rules: one lesson each”: each example re-solved from its words, each
  board’s marks re-read from the signs, each quiz pack’s rule and answers, the twin, and the check, Arcade and new
  examples keeping each lesson’s rule.

## The case board (v0.5.0, the Claude Code Pack of 3 Oct 2026)

The pack's complaint: the example was paragraphs under the chests, the Do step was a list of marks under the
picture, and nothing was crossed out on the chests. Lessons 4-7 now teach on one picture board, the **case board**
(`CaseBoard` and `CaseScene` in `src/game/components/CaseBoard.tsx`; rows built by `signCaseRow`).

**See: one chest per card** (`signWalk`). Cards 3-6 of Lesson 4 (and 3-6 of Lessons 5-7) are “Example: the Gold
chest”, “… Silver …”, “… Bronze …”, then “Example: only one chest fits”. The card's main button stamps one sign at a
time, each with one line saying why, then counts and decides; it says Next only when the whole case shows. Earlier
verdicts stay on the board.

| case | stamps (Gold, Silver, Bronze signs) | count | verdict | last line |
|---|---|---|---|---|
| Gold | True, True, False | 2 | crossed out | “Two signs are true, so reject the Gold chest.” |
| Silver | False, False, True | 1 | kept (ring) | “Exactly one sign is true, so keep the Silver chest.” |
| Bronze | False, True, True | 2 | crossed out | “Two signs are true, so reject the Bronze chest.” |

**Do: the same board** (`L4_DRILL`). Silver and Bronze are shown; the learner taps Gold, stamps True, True, False,
sees “2 signs are True”, and taps Reject. The count is worked out from the stamps, never typed. Keep and Reject are
never turned off: Keep with a count of 2 is checked and named (“The rule needs exactly 1 true sign. This case has 2
true signs. So reject the Gold chest.”). Empty marks get a gentle line that names the chest (“Not yet: the Gold
chest still needs 3 stamps. Tap the Gold chest, then tap each sign.”). After a check the board shows the case its
message is about. “Clear this case” empties one case only.

**Quiz, in this order.**

1. **The twin** (`L4_TWIN`), the same every time. The pack's own fixture (Gold True, True, True with Silver and
   Bronze unchanged) cannot come from one sign change: a sign's truth changes in every case at once. So Bronze's sign
   loses its “not”: “The treasure is in the Gold chest.” Gold: True, True, True (3, crossed out). Silver: False,
   False, False (0, crossed out). Bronze: False, True, False (1, kept). The answer moves from Silver to Bronze, so
   remembering the example never passes it. The changed sign is tagged “Changed” on the board. The board is
   checked before the answer buttons show (`L4_TWIN_WORK`), and stays up, marked, while the question is answered.
2. **The frozen caves** (`L4_FIRST_QUIZ_WORK`), on the same board in the cave skin. Ice: True, False, False (kept).
   Fire: True, False, True (crossed out). Moss: False, True, True (crossed out).
3. **A door board and a box board**, in either order, with “Use the case board” as a thinking tool that is never
   checked (`ItemBase.scratch`).

A wrong mark on the twin or cave board means that try is not a first try for the pass rule. It is saved at once
(`onWrong` → `onMiss` → `LessonRun.missed`), so leaving or reloading does not give a clean try. The right answer then
says “Right.” with a note that it counts as practice, and the stats save it as right but not first try
(`HelpUse.boardFixed`); no new examples follow, since the board already taught the fix. The pass rule is still 3
right on the first try; extra items come from the door and box kinds. A run saved by v0.4.1 starts the lesson again
(each run now keeps `plan`, a fingerprint of its planned quiz), so nobody resumes past the new twin.

On the board, a box that is not picked shows its own case's count as “If here: 2 true”, so it is never read as the
picked case's count. False stamps carry the word only: the cross means Reject and nothing else.

**Lessons 5-7** use the same walk and board. The Do step shows the kept chest and one more; the learner checks the
third. Each starts its quiz with a fixed twin on the case board (the first twin of the example whose answer moves):

| lesson | Do: learner checks | twin (one sign changed) | twin answer |
|---|---|---|---|
| s1.l5 Every sign is false | Gold: True, True, True, Reject | Bronze: “The treasure is in this chest.” | Silver |
| s1.l6 Exactly two signs are true | Silver: False, True, False, Reject | Gold: “The treasure is not in this chest.” | Silver |
| s1.l7 The owner’s sign | Gold: False, False, True, Reject | Gold: “The treasure is in the Silver chest.” | Bronze |

**Accessibility.** Every chest, stamp, Keep, Reject and Clear control is a real button (stamps at least 68 × 44 px).
Names read like “Gold chest: picked, 2 true signs, crossed out” and “The Silver chest sign: True. Tap to change.”
Keep and Reject are a radio group with arrow keys. A polite live region says each stamp, the new count and each
verdict. True and False are words with a check or a cross; Keep is a ring and the word, Reject a cross and the word.

**Art.** The pack's images are optional; this release uses CSS stamps, rings and crosses (the pack's allowed first
implementation). No interaction state is drawn into a picture.

**Tests.** `signs.test.ts` (the walk, the Do board, the twin, the caves, the thinking board, lessons 5-7),
`stops.test.ts` (case-board shape rules in the board contract), `play.test.ts` (the board, the walk's step button,
the twin item, the thinking board). In a browser at 320, 375 and 430 px: only the main button leads to the Do board
and never to the caves; Keep with a count of 2 stays shut; keyboard picks, stamps and moves the verdict; a wrong
twin board names the Bronze case and saves the miss; after a reload the twin is back; the fixed twin is not a first
try; the caves come after; the thinking board keeps its marks when hidden; no sideways scroll.

### Review (21 agents: four lenses, each finding checked by a skeptic)

Confirmed and fixed: “Right, first try.” after a board fix (and in the stats); a v0.4.1 run resuming past the twin;
counts on unpicked boxes read as the picked case's; copy saying “cross it out” beside a Reject button; focus lost
after “Clear this case”; the worked example's live region hidden until its first line; skin-blind screen-reader
names (“the treasure”, “The Box A sign”); read-aloud order on key-idea cards; the owner-rule lines bringing back
“its own sign”. Also fixed from the browser pass: the saved miss now reaches the resumed question, so it says
“Right.” after a reload too. Refuted: read-aloud punctuation, a verdict miss shown by colour alone (it is named in
words), and gaps the fixes had already closed.
