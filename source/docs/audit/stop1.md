# Wrong-answer audit: Stop 1, lessons 1, 2 and 4 (True or False?)

Every item in lessons 1, 2 and 4 now carries `teach`: a plain rule, its hard words defined in place, what the sentence
or rule means, two to four worked cases, a Remember line with a question to ask, and a smaller worked example. Every
wrong choice of every item has its own `ChoiceFeedback` (a headline that names that answer's gap, a detail that says
where it fails, and an example card), synced into `whyWrong`. Every truth on a card is computed: lesson 1 reads it from
the sentence's label in the bank, lesson 2 from `judge()` on the drawn row (the cards with the face-down ones filled one
way), and lesson 4 from `signHolds()` and `fitsRule()` for each place the treasure could be. “Which of these” choice ids were letters given after the
shuffle; they now come from the sentence's own words. `StopDef.fresh` gives each lesson its own new examples: the same
kind of sentence plus one from the other side of the line (lesson 1), a can't-tell row plus a settled row (lesson 2),
and a new puzzle with the same rule (lesson 4). Lesson 3 (The NOT flip) is the reference and is unchanged.

| Lesson / generator | Skill | Wrong option | Missing definition or reasoning step (before) | Counterexample now shown | Revised headline | Fresh check | Test status |
|---|---|---|---|---|---|---|---|
| L1 `isThisItem` | s1.statement | “Not a statement” for a true sentence | One line: “… is true. Anything true or false is a statement.” “Statement” was not defined in the explanation, and no case set it against a false sentence or a question. | The sentence as a card: “The sentence: true. It is a statement: true.” The cases add “Snow is purple.” (false, still a statement) and “Is the door open?” (not a statement). | “Your answer says a true sentence is not a statement.” | A new sentence of the same kind (true, or can't-check), then a question or command | Pass: T-teach, T-truth, T-cover, T-proof, T-kind, T-fresh, T-read |
| L1 `isThisItem` | s1.statement | “Not a statement” for a sentence nobody can check | “You don’t need to know the answer.” Nothing showed the line between a sentence you can't check and an opinion. | The sentence as a card: “It is a statement: true. Nobody here can check it. But it must be true or false.” The cases add a false sentence and the opinion “Red is the best color.” | “Your answer says a sentence nobody can check is not a statement.” | Same kind, then an opinion | Pass: T-teach, T-truth, T-cover, T-proof, T-kind, T-fresh |
| L1 `isThisItem` | s1.false-is-statement | “Not a statement” for a false sentence | Said “a false sentence is still a statement” but never showed that “true or false?” and “a statement?” are two questions. | The sentence as a card with two answers: “The sentence: false. It is a statement: true.” The cases add a true sentence and an opinion. | “Your answer says a false sentence is not a statement.” | Same kind, then an opinion | Pass: T-teach, T-truth, T-cover, T-proof, T-kind, T-fresh |
| L1 `isThisItem` | s1.not-statement | “A statement” for a question | “A question can’t be true or false.” No contrast case. | The question as a card: “It is a statement: false. It asks something.” The cases add a false sentence and a command. | “Your answer calls a question a statement.” The item now defines “A question” (its own kind's word was left out when two other words came first), and Remember says “A question asks something …” instead of naming undefined “commands and exclamations”. | Same kind, then a false or can't-check statement | Pass: T-teach, T-truth, T-cover, T-proof, T-kind, T-fresh, T-words |
| L1 `isThisItem` | s1.not-statement | “A statement” for a command | As above. | The command as a card; the cases add a false sentence and a question. The detail: “Doing it or not doing it does not make the sentence true or false.” | “Your answer calls a command a statement.” “A command” is now always one of its words. | Same kind, then a false or can't-check statement | Pass: T-teach, T-truth, T-proof, T-kind, T-fresh, T-words |
| L1 `isThisItem` | s1.not-statement | “A statement” for an exclamation (“Wow!”) | “Shows a feeling.” The idea card's word “exclamation” was never defined in the explanation. | The exclamation as a card; term “An exclamation means a short cry that shows a strong feeling.” | “Your answer calls an exclamation a statement.” | Same kind, then a true or false sentence | Pass: T-teach, T-truth, T-proof, T-kind, T-fresh |
| L1 `isThisItem` | s1.opinion | “A statement” for an opinion | “People can disagree, and nobody is wrong.” “Opinion” was not defined, and nothing set it against a false fact or a sentence you can't check. | The opinion as a card: “It is a statement: false.” The cases add “Snow is purple.” and “The giant has a pet goat.” Simpler: two people, “That is true” and “That is false,” and nobody is wrong. | “Your answer calls an opinion a statement.” | Same kind, then a false sentence | Pass: T-teach, T-truth, T-cover, T-proof, T-kind, T-fresh |
| L1 `whichItem` (is a statement?) | s1.which-statement | A question, a command, an opinion or an exclamation | Choice id was a letter (a–d) given after the shuffle. One line per choice. No cases. | The picked sentence as a card (“It is a statement: false.”), then every choice as a case. The detail names the real statement. Each kind has its own simpler example. | “Your answer is a question, not a statement.” / “… a command, …” / “… an opinion, …” / “… an exclamation, not a statement.” | A new “Which of these is a statement?” with new sentences | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh |
| L1 `whichItem` (is not a statement?) | s1.which-not-statement | A true sentence | Letter id after the shuffle; one line. | The picked sentence: “The sentence: true. It is a statement: true.” Every choice as a case. | “Your answer is a true sentence, so it is a statement.” | A new “Which of these is not a statement?” | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh |
| L1 `whichItem` (is not a statement?) | s1.which-not-statement | A false sentence | As above. | The picked sentence: “The sentence: false. It is a statement: true.” | “Your answer is a false sentence, and a false sentence is still a statement.” (It said “Your answer is false”, which reads as “you are wrong”.) | As above | Pass: T-truth, T-proof, T-kind, T-ids, T-words |
| L1 `whichItem` (is not a statement?) | s1.which-not-statement | A sentence nobody can check | As above. | The picked sentence: “It is a statement: true. Nobody here can check it.” | “Your answer is a statement, even though nobody here can check it.” | As above | Pass: T-truth, T-proof, T-kind, T-ids |
| L2 `rowItem` | s1.cant-tell | “True” on a can't-tell row | “It could still be false. If …” No row was drawn. “Face down” and “Can’t tell” were not defined in the explanation. The step “true means true for every way to fill the face-down cards” was missing. | The filling that makes it false, drawn: the deciding face-down card turned up, the others left face down. “Nora’s sentence: false. Whatever card 5 is, Nora’s sentence is false.” | “Your answer says true, but the face-down cards could make it false.” | A new can't-tell row (a trap after a trap), then a settled row. Neither repeats the missed sentence or cards. | Pass: T-teach, T-truth, T-cover, T-proof, T-kind, T-fresh, T-read |
| L2 `rowItem` | s1.cant-tell | “False” on a can't-tell row (a card you can't see read as missing) | “It could still be true. If …” No drawn row. | The filling that makes it true, drawn, with a count: “Now there are 2 yellow cards and 1 blue card.” | “Your answer says false, but the face-down cards could make it true.” | As above | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh |
| L2 `rowItem` (conflict items) | s1.cant-tell | The answer the cards you can see point to (the can't-tell trap) | Nothing said why the visible cards mislead. | As in the two rows above, plus “The cards you can see make it look true. But the face-down cards count too.” | As in the two rows above | As above | Pass: T-proof (trap) |
| L2 `rowItem` (“Explain more simply”) | s1.cant-tell | Any wrong pick on a can't-tell row | The simpler example was always “Is there a red card?” on one face-down card, whatever the sentence was. For “Every big card is red” (practice seed 4, item 1) it asked “Is there a big card?”, a different idea. | The item's own sentence on the smallest row where one face-down card decides it, judged by the engine: “Imagine 3 cards. Card 1 is yellow. Card 2 is blue. Card 3 is face down. … If card 3 is yellow, the sentence is true. If card 3 is red, there is 1 yellow card and 1 blue card. That is a tie, so it is false.” | (unchanged) | As above | Pass: simpler test |
| L2 `rowItem` | s1.check-cards | “False” on a row that is already true | “Card 1 is yellow. So the sentence is true.” No filling showed that nothing can undo it. | Every face-down card filled the way that hurts the sentence most, still true: “Face-down card 2 is a circle. … true. Now 2 cards are squares.” | “Your answer says false, but the cards you can see already make it true.” | A new settled row with the same answer, then a can't-tell trap | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh |
| L2 `rowItem` | s1.check-cards | “True” on a row that is already false | As above. | Every face-down card filled the way that helps most, still false: “Face-down cards 2, 5 and 6 are all squares. … false. Now 4 of the 6 cards are squares.” | “Your answer says true, but the cards you can see already make it false.” | As above | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh |
| L2 `rowItem` | s1.check-cards | “Can’t tell” on a row that is already true | “The face-down cards can’t change this.” No case proved it. | The hardest filling, still true, and “Even if face-down card 2 is a circle, the sentence is still true.” | “Your answer says “Can’t tell,” but the face-down cards can’t make it false, whatever they are.” | As above | Pass: T-truth, T-proof, T-kind |
| L2 `rowItem` | s1.check-cards | “Can’t tell” on a row that is already false | As above. For “Exactly k” the hardest filling (closest to k) was not considered. | The filling nearest the other answer, still false: for “Exactly three cards are yellow,” “Face-down card 5 is yellow. Now 1 card is yellow.” | “Your answer says “Can’t tell,” but the face-down cards can’t make it true, whatever they are.” | As above | Pass: T-truth, T-proof, T-kind |
| L4 `signItem` (Exactly one / Exactly two) | s1.signs-count | A box with too few true signs (0 for one; 0 or 1 for two) | “That makes zero true signs, not one.” No case for each box. “Exactly” and “this chest” were not defined. | A card for all three boxes with each sign's truth and “Fits the rule.” The pick's card: “Pretend the prize is in Box B. The sign on Box A: true. The sign on Box B: false. …” | “Your answer makes no sign true, but the rule needs exactly one.” / “… one sign true, but the rule needs exactly two.” | A new puzzle with the same rule, on a different kind of box, with different signs (never the missed puzzle renamed) | Pass: T-teach, T-truth, T-cover, T-kind, T-fresh, T-read |
| L4 `signItem` (Exactly one / Exactly two) | s1.signs-count | A box with too many true signs (2 or 3 for one; 3 for two) | As above. | As above, with the count: “That makes 3 true signs. The rule needs exactly 2 true signs.” | “Your answer makes two signs true, but the rule needs exactly one.” / “… all three signs true …” | As above | Pass: T-truth, T-cover, T-kind, T-fresh |
| L4 `signItem` (Every sign is false) | s1.signs-count | Any box that makes a sign true | “But the rule says every sign is false.” No cases. | The three boxes; the pick's card names the true signs. | “Your answer makes the Gold and Silver chest signs true, but the rule says every sign is false.” | As above | Pass: T-truth, T-cover, T-kind, T-fresh |
| L4 `signItem` (owner rule) | s1.signs-owner | A box whose own sign is false | “… would be false. But the rule says …” “The other signs” was not defined. | The three boxes; the pick's card shows its own sign false. | “Your answer makes the Bronze chest sign false, but the rule needs it to be true.” | A new owner-rule puzzle | Pass: T-truth, T-cover, T-kind, T-fresh |
| L4 `signItem` (owner rule) | s1.signs-owner | A box where another sign is true too | As above. | The pick's card shows the other true sign. | “Your answer makes the Silver chest sign true too, but the rule needs it to be false.” | As above | Pass: T-truth, T-cover, T-kind, T-fresh |
| L4 `signItem` (any rule) | s1.signs-count, s1.signs-owner | A box that a sign points to (“The treasure is in this chest.” on it, or “… is in the Silver chest.”) | Trusting a sign was never addressed. | The headline for its count or owner gap, plus “The Silver chest sign says the treasure is in the Silver chest. But signs can be false. Only the rule tells you which signs to trust.” | The count or owner headline above | As above | Pass: items (trust line) |

## Test key

The last column names tests in `src/engine/__tests__/statements.test.ts` (blocks “lesson 1 wrong answers teach first”
and “lesson 2 wrong answers teach first”) and `src/engine/__tests__/signs.test.ts` (block “treasure signs”). They run
over 40 to 300 seeds of practice, the check, the Arcade and the new examples after a miss.

- **T-teach**: every item has its rule, the words it needs (Statement; Face down and Can’t tell; A true sign and the
  rule's own words), its meaning, two to four cases, Remember ending in an “Ask: …?” question, and a simpler example.
- **T-truth**: every truth on every case and example card is recomputed in the test. Lesson 1 maps each sentence's bank
  label through a table written in the test. Lesson 2 turns the drawn row back into cards and brute-forces every way to
  fill the cards still face down. The label must name exactly the cards turned up, and each “Now …” count is recounted.
  Lesson 4 reads every sign and the rule from the words on the page.
- **T-cover**: lesson 1 cases have a statement and a non-statement; lesson 2 can't-tell items show a true filling and
  a false one, and settled items fill every face-down card; lesson 4 shows all three boxes, and only the answer fits.
- **T-proof**: every wrong choice has feedback, `whyWrong` is in step, and the example card shows the gap (the picked
  sentence on the other side of the line; a filling the other way from the pick; the pick's box failing the rule).
- **T-kind**: one headline per kind of mistake (14 in lesson 1, 6 in lesson 2, 9 in lesson 4), and no headline serves
  two kinds.
- **T-ids**: lesson 1 ids come from the sentence's words (`sentenceId`), and reversing the choices keeps every
  explanation. Lesson 2 ids are `true`, `false`, `cant`. Lesson 4 ids are the box ids of the scene, and the boxes are
  never shuffled.
- **T-fresh**: the new examples keep the skill first and check the other side of the edge (see the Fresh check column).
- **T-read**: each item's full text reads at grade 7 or lower with no sentence over 25 words, curly quotes with the
  period inside, “Can’t tell” spelled one way, and no “that row”, “the opposite” or unexplained “both”.
- **T-words**: words are defined before use. An “Is this a statement?” item defines its own kind's word (“A question”,
  “A command”, …), and Remember names only defined words. Statements “say something about the world”; a false pick
  is “a false sentence”. In lesson 2 the card-number word names a card the explanation uses (“Card 4 means the
  fourth card, counting from the left.”), and “There is a red card” is told as “one or more cards are red”, not with
  an undefined “at least one”.
- The simpler example of every lesson 2 item is itself checked: its tiny row is read back from the words, built and
  judged, and must give the item's answer. A can't-tell item's simpler example uses the item's own sentence, and both
  of its “If card N is …” fillings are recomputed (a “more” sentence shows the tie). The engine also judges every
  tiny row when it writes it, so a wrong one throws instead of reaching a player.

Commands, all passing: `npx tsc --noEmit -p .`; `COVERAGE_ALL=1 STOP=1 npx vitest run src/engine/__tests__/stops.test.ts`
(6 of 6); `npx vitest run src/engine/__tests__/statements.test.ts src/engine/__tests__/signs.test.ts` (40 and 12);
`npx vitest run` (16 files, 353 tests).

## Directions, boundaries and words

- **Ambiguous directions.** The three prompts already ask one clear question. The gaps were in the words around them:
  the lesson 4 signs say “this chest” and nothing defined it (a new line on the “Three chests” card and a term). The
  lesson 2 card “If they could do both” now says what both are. “can’t tell” in lower case is now “Can’t tell”
  everywhere, matching the choice.
- **Boundary cases.** Lesson 2 “more” sentences now say a tie makes them false, in the meaning, the term and the case
  counts (“That is a tie”). Settled rows show the filling that tries hardest to flip the answer, and for “exactly k”
  the filling nearest k. Lesson 4 shows zero and three true signs as cases.
- **Vocabulary defined in place.** Statement, opinion, exclamation, false, question, command, face down, Can’t tell,
  exactly, at least, more (and tie), “Every red card”, the card number the explanation names (“Card 4”), a true sign,
  this chest, the other signs.
- **Teaching sentences.** Lesson 1 explanations use seven fixed sentences that are not in the bank, so an explanation
  never answers a later question.

## Not changed here (shared files)

- Done after the migration: `stops.test.ts` now requires `teach` and `feedback` on every lesson of every built
  stop, so `MIGRATED` and `COVERAGE_ALL` are gone.
- Still open: the two picture notes below.
- Lesson 4 cases are words only, because `TeachCase` has no picture for boxes. A `boxes` picture would need
  `types.ts` and `ExplanationPanel.tsx`. The words are complete without it.
- In lesson 2 cases, a card that was face down and is now turned up looks like any other card. The label names it.
  Marking it in the picture would need a flag on `Thing` and a change to `ThingCard`.
- No new skill tags, so `SKILL_NAMES` in `progressStats.ts` needs nothing.

## Review (branch `wa-stop1-v`)

A second reader generated every lesson's practice (20 seeds), the check (10 seeds), the Arcade (20 seeds) and the new
examples after a miss, recomputed every truth, and read each explanation as a 6th grader would. Answers and
uniqueness are unchanged: on 300 seeds the practice, check and Arcade items have the same prompts, scenes, choices and
right answers as before the migration (8,553 items). What was found and fixed:

| Where | Problem (evidence) | Fix | Guard |
|---|---|---|---|
| L2 can't-tell rows, “Explain more simply” | Always “Imagine just one card … Is there a red card?”, whatever the sentence. Practice seed 4, item 1, “Every big card is red”, got “Is there a big card?”. | The item's own sentence on the smallest row where one face-down card decides it; each truth from `holds()`, the row judged “can’t tell” by the engine. | simpler test |
| L2 settled “at least k” simpler | “At least three cards are triangles … only 1 card is a triangle. That is not 3.” “Not 3” lets “at least” read as “exactly”. | “That is fewer than 3.” | simpler test |
| L2 fresh examples | With the practice seed, practice seed 1 item 2 (“At least one card is a square”, row square/?/triangle/triangle/square) got itself back as its new example, with only the speaker changed. | A new example never repeats the missed sentence or cards. | T-fresh (any seed) |
| L4 fresh examples | 45 of 3,200 new puzzles (app seeds) were the missed puzzle with new names: same signs, same winning position. | The new puzzle's signs must differ from the missed one's, read back from the page. | T-fresh (signs differ) |
| L1 “Is this a statement?” words | “Write the letter Q.” (seed 1, item 1) defined False and A command but its Remember line said “Questions, commands and exclamations”. “How many sides does a square have?” (seed 6, item 1) defined False and A command, but not “A question”, the word in its own headline. | The item's own kind's word is always defined; each Remember line names only that kind. | T-words |
| L1 statement wording | ““Dogs have six legs” says how things are, but it is wrong.” Saying how things are is being right, so the line contradicts itself. | “… says something about the world, but it is wrong.” | T-words |
| L1 “Which is not a statement?” headline | “Your answer is false, but a false sentence is still a statement.” “Your answer is false” reads as “you are wrong”. | “Your answer is a false sentence, and a false sentence is still a statement.” | T-words |
| L2 card-number word | Every sentence without a hard word defined “Card 1”, even when the explanation was about card 4 (“Card 4 is yellow.”, seed 1 item 4). | The term names the card the explanation uses first: “Card 4 means the fourth card, counting from the left.” | T-words |
| L2 “There is …” meaning | ““There is a yellow card” is true when at least one card is yellow.” “At least one” was not defined in those items. | “… is true when one or more cards are yellow. One is enough.” | T-words |
| L2 settled “Can’t tell” headline | “… but no face-down card can make it false.” With two or three face-down cards, it is the cards together that matter. | “… but the face-down cards can’t make it false, whatever they are.” | T-kind |
| L2 “Every red card” counts | “Now there are 3 big cards. 3 of them are red.” (practice seed 4, item 1) | “All 3 of them are red.” | T-truth (tally) |
| Audit | The commands' counts and a few fresh-check cells did not match the code. | Updated here. | |

