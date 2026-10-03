# Stop 4 · Grid Detective: wrong-answer audit

> Since the skill-drill handoff (see `drill-stop4.md`), every lesson has guided boards before its quiz, and every hint
> shows one marked case (`hintCase`). Lesson 5's proofs are one-part grids only: the two-part rows below
> (`proofPuzzle (two-part grids)`) still describe feedback the engine builds and tests, but no quiz, check, Arcade item
> or new example asks them, because no card or board tests a linking clue alone yet.

Every Stop 4 item now carries `teach` (rule, terms, cases, remember, a simpler example), and every wrong choice of
every choose item has its own `ChoiceFeedback` that names its gap and shows a counterexample, following the handoff
"Make wrong answers teachable moments" (v1.0). The cases are boxes, rows or columns described in words, or whole ways
to fill the grid; every true / false on them is computed by brute force from the case's own clues or marks, and
`grid.test.ts` recomputes each one from its words. The multi item's `missTips` and `pickTips` now open by naming the
box and where it sits, so grade() gives a specific headline. Prompts that leaned on vague words were reworded ("Which
box gets a ✓ from this clue?", "so Frost – pearl gets a ✓. Choose every box that must now get a ✗.", "Which dragon
must live in the sea cave?"), and idea cards no longer say "that box", "that row" or "do both". `StopDef.fresh` gives
two new examples wherever “Can’t tell yet” is a choice (one decided, one not), and the same kind of clue again after
a lesson 1 miss.

A second, adversarial review (below) recomputed every case and claim on 20 practice seeds per lesson, 10 checks and 20
arcade items. It fixed five problems: false “says nothing about” reasons on lesson 5 proof clues, a lesson 2 rule that
taught “two empty boxes means Can’t tell yet” on its own, an ambiguous lesson 2 boundary grid, a “Spread that ✓” with
no ✓ named, and words used without a definition. It also made three vague lines concrete.

Terms defined in place: ✓ in a box (yes), ✗ in a box (no), an empty box, “Only one left”, “Can’t tell yet”, spreading
a ✓, a linking clue, “All by itself”, and a clue that “proves” a mark.

## Distractors

All rows: test status is **Pass** in `src/engine/__tests__/grid.test.ts` › "teaching after a wrong answer" (120 seeds
per generator, every skin). The contract (`COVERAGE_ALL=1 STOP=4`) also passes. "Before" is what the old `whyWrong`
or tip said, and what it left out.

| Lesson / generator | Skill | Wrong option | Missing definition or reasoning step (before) | Counterexample now shown | Revised headline | Fresh check | Test status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 `markPuzzle`, “has” clue | s4.grid-marks | A box in the named person’s row, other column | “Storm guards just one gem, so Storm – ruby gets a ✗”: no meaning of ✓ / ✗ / empty box, and no case showing which box the clue names | Box case “Storm – ruby.”: could false, must false; it gets a ✗ | “Your box is in Storm’s row, but not in the diamond column.” | Same clue type, new grid | Pass |
| L1 `markPuzzle`, “has” clue | s4.grid-marks | A box in the named column, other row | Gave the one-each reason, but not where the clue’s box is | “Frost – diamond.”: could false; gets a ✗ | “Your box is in the diamond column, but not in Storm’s row.” | Same clue type | Pass |
| L1 `markPuzzle`, any clue | s4.grid-marks | A box in neither the named row nor column | “It does not decide Onyx – opal yet”: did not show that the box stays empty, or why | “Onyx – opal.”: could true, must false; stays empty | “Your box is not in Storm’s row or the diamond column.” | Same clue type | Pass |
| L1 `markPuzzle`, “not” clue | s4.grid-marks | Same row, other column; same column, other row | Did not show that a “not” clue decides only one box, and did not define an empty box | Box case of the pick: could true, must false | Row / column headlines as above | Same clue type | Pass |
| L1 `markPuzzle`, “or” clue | s4.grid-marks | One of the two things the clue names | Did not say where the ✗ really goes: the thing the clue leaves out | “C – blue.”: could true; stays empty | “Your box is one of the two colors the clue names.” | Same clue type (“or”) | Pass |
| L2 `onlyOnePuzzle` | s4.only-one-left, s4.not-decided | A person or thing whose box in the line has a ✗ | “has a ✗ … can’t”: no definition of ✗, and no count of the empty boxes left | The line in words (“In this grid, Ember and Moss have a ✗ …”): pick could false; the answer must true (or, for “Can’t tell yet”, each empty box could true) | “Ember’s box in the pearl column has a ✗.” | 2 items: one decided, one “Can’t tell yet” | Pass |
| L2 `onlyOnePuzzle` | s4.only-one-left | “Can’t tell yet” when one box is left | Did not define “Only one left” or show the boundary between one box and two | This line, with must true; plus “In a grid with no other marks” with one ✗ fewer, where each of the two empty boxes could true | “Only one box in the pearl column is empty, so you can tell.” | 2: decided first, then “Can’t tell yet” | Pass |
| L2 `onlyOnePuzzle` (conflict) | s4.not-decided | One of the two people or things whose box is still empty | Said “so could Y” but gave no proof, and did not say why a ✗ elsewhere in that person’s row does not count | One full way that fits every mark where the other one gets the ✓: “Fits every mark: true. Fay eats apples: false.” Detail names the tempting ✗ | “Fay could eat apples, but so could Gus.” / “D could have 2, but D could have 3 too.” | 2: “Can’t tell yet” first, then decided | Pass |
| L3 `spreadPuzzle` (multi) | s4.spread-tick | Left out a box in the ✓’s row | “needs a ✗ too”: did not say where the box sits | Cases: a box in the row (✗), one in the column (✗), one outside both (empty), with could / must | “You left out Frost – ruby, which is in Frost’s row.” | Default: same skill, same lesson | Pass |
| L3 `spreadPuzzle` (multi) | s4.spread-tick, s4.spread-column | Left out a box in the ✓’s column (the classic “forgot the column”) | Same, and spreading was not defined | Same cases; the column case is a ✗ | “You left out Ember – pearl, which is in the pearl column.” | Default | Pass |
| L3 `spreadPuzzle` (multi) | s4.spread-tick, s4.spread-column | Picked a box outside the row and the column | Did not say the ✓ leaves the box undecided | Outside case: could true, must false | “Ember – opal is not in Frost’s row or the pearl column.” | Default | Pass |
| L3 / L4 `gridPuzzle` (assign) | s4.grid-one, s4.grid-two | Any grid that breaks a clue (title from grade(): “This answer breaks clue 2.”) | No rule, terms, steps or check; only the first ✓ in `explain` | Steps: the solver’s first ✓ marks, each with its reason; a check case of the answer with every clue computed true. Terms: ✓, “Only one left” and spreading (one part), or “Only one left”, spreading and a linking clue (two parts) | (from grade) “This answer breaks clue 2.” | Default | Pass |
| L3 / L4 `gridPuzzle` (assign) | s4.grid-one, s4.grid-two | Two ✓ in one column; a row left empty | grade() names it; nothing taught the one-each rule after the miss | Same steps and check | (from grade) “Mia and Leo both have a ✓ for “cat.” …” | Default | Pass |
| L4 `linkPuzzle`, link | s4.link | A person who does not have the first thing | Gave the reason, but did not define a linking clue | Person case “Dusk lives in the sea cave.”: could false; Ember must true | “Dusk is not the dragon in the sand cave.” | 2: a link, then a “not” link (“Can’t tell yet”) | Pass |
| L4 `linkPuzzle`, link / two “not” clues | s4.link, s4.not-link | “Can’t tell yet” when the clues decide it | “You can tell”, but did not say which fact decides it | The answer’s person case: must true | “You can tell, because the grid shows the dragon in the sand cave.” / “… the two clues leave only C.” | 2 | Pass |
| L4 `linkPuzzle`, “not” link | s4.not-link | A person a clue crosses out | The reason was there; “not” link and “Can’t tell yet” were not defined | Person case: could false (and the answer: must true) | “Clue 1 crosses out A.” / “The clue crosses out Moss.” | 2: same mode first, then the other | Pass |
| L4 `linkPuzzle`, one “not” link (conflict) | s4.not-link | One of the two people left | No proof that the other one could | One way that fits the grid and the clue where the other has it: “Fits the grid: true. The clue: true. Frost lives in the sea cave: false.” | “Frost could live in the sea cave, but so could Onyx.” | 2: “Can’t tell yet” first | Pass |
| L5 `proofPuzzle` | s4.proof-clue | An “or” clue that names the thing for the person | Had a reason, but no counterexample | One way where that clue is true and the person has the thing: “Clue 3: true. Onyx lives in the ice cave: true.” | “Clue 3 names the ice cave as one of two choices for Onyx.” | Default | Pass |
| L5 `proofPuzzle` | s4.proof-clue | A “not” clue about the same person, another thing | “Clue 3 alone still lets Onyx …”: one sentence for every kind; “all by itself” and “proves” not defined | Same kind of way | “Clue 3 is about Onyx, but not about the ice cave.” | Default | Pass |
| L5 `proofPuzzle` | s4.proof-clue | A clue about the same thing, another person | Same one sentence for every kind | Same kind of way | “Clue 1 is about 2, but not about C.” | Default | Pass |
| L5 `proofPuzzle` (two-part grids) | s4.proof-clue | Any clue about the other part of the grid, about the person or someone else (by itself it decides nothing in this part) | Same one sentence for every kind | Same kind of way; detail “It is about the jobs, so it says nothing about the colors.” | “Clue 2 is about Rivet’s job, not Rivet’s color.” / “Clue 5 is about Onyx’s cave, not Frost’s gem.” | Default | Pass |
| L5 `proofPuzzle` (two-part grids) | s4.proof-clue | A linking clue | Same one sentence for every kind | Same kind of way | “Clue 3 is a linking clue, and it does not name Rivet.” | Default | Pass |
| L5 `proofPuzzle` | s4.proof-clue | A clue about another person that, by itself, crosses out a box in the person’s row or the thing’s column (an “or” clue that leaves the thing out; a “has” clue) | Was called “not about” the person or thing: “It says nothing about Kai or the fish” for “Cal has the cat or the dog”, which crosses out Cal – fish | Same kind of way; detail “So Cal does not have the fish. With only this clue, Kai could still have the fish.” | “Clue 3 crosses out Cal – fish, not Kai – fish.” | Default | Pass |
| L5 `proofPuzzle` | s4.proof-clue | A clue that, by itself, decides no box in the person’s row or the thing’s column (computed) | Same one sentence for every kind | Same kind of way; detail “By itself, it does not cross out any box in Ember’s row or the ruby column.” | “Clue 3 is not about Ember or the ruby.” | Default | Pass |
| L5 `enoughPuzzle` | s4.enough-clues | “Can’t tell yet” when clues 1 and 2 decide it | Reason given, but “Can’t tell yet” not defined; no per-person cases | Person case for the one left: could true, must true; cases for everyone with who crosses them out | “Clues 1 and 2 already leave only Ava.” | 2: decided first, then not | Pass |
| L5 `enoughPuzzle` (conflict) | s4.enough-clues | “Yes” when two or more could still have it | Named who could, but not who the clues cross out | “Who could guard the pearl, using only clues 1 and 2.”: each person’s could, computed | “With only clues 1 and 2, Cinder and Frost could each guard the pearl.” | 2: “Can’t tell yet” first | Pass |

## Shared change suggested

Both were made after the migration. A grid miss now quotes each broken clue and names the box: “Clue 1 says “Gus eats
apples.” Your grid has the ✓ for Gus under “popcorn,” not under “apples.”” A multi answer gets one paragraph per
card, and a sentence already given is not repeated. As first written:

- `grade()` for grid assign items says only “This answer breaks clue 2.” It could add the clue and the box that
  breaks it, for example: “Clue 2 says Blaze lives in the ice cave. Your grid gives Blaze the sand cave.” Then the
  panel’s “Why your answer does not work” would have detail for grids too. The grid teaching (steps and the check
  case) already covers the rest.
- `grade()` for multi items joins every tip. When two boxes in one column are left out, the reason sentence appears
  twice. Dropping a repeated sentence would shorten the panel.

## Second review: problems found and fixed

Each was found by generating every lesson's practice (20 seeds), the check (10 seeds) and the arcade (20 seeds) and
recomputing the claim with brute force. The first five rows each have a regression test in `grid.test.ts`, and each of
those tests fails when run against the first version of `grid.ts`. The last three rows are wording fixes.

| Where | Problem (evidence) | Fix | Regression test |
| --- | --- | --- | --- |
| L5 `proofPuzzle`, “neither” kind | 97 of 540 “neither” reasons were false (300 seeds, both grid sizes). Practice seed 2, l5-1, k3, “Cal has the cat or the dog.”: “Clue 3 is not about Kai or the fish. … It says nothing about Kai or the fish.” By itself it crosses out Cal – fish. Check seed 1, c8, k3, “Ember lives in the sea cave or the ice cave.”: “It says nothing about Ash or the hill cave.” It crosses out Ember – hill cave. Practice seed 2, l5-3, k5, “Onyx lives in the hill cave.”: “It says nothing about Frost or the diamond.” It crosses out Frost – hill cave. | The kind of a clue about another person now comes from what it decides by itself: new kind `other-box` (“Clue 3 crosses out Cal – fish, not Kai – fish.”); `other-part` covers any clue about the other part (“Clue 5 is about Onyx’s cave, not Frost’s gem.” … “It is about the caves, so it says nothing about the gems.”); “neither” only when it crosses out nothing in the row or column. | “lesson 5: each wrong clue …” recomputes every kind and claim; “lesson 5: a clue about another person that crosses out a box beside the asked one is never called ‘not about’ it” |
| L2 `onlyOnePuzzle`, Remember and simpler | Every lesson 2 item (practice seed 1, l2-1): “One empty box left: it gets the ✓. Two or more: you can’t tell yet.” and “If two or more boxes are left, you can’t tell yet.” This is false in general: another row or column can still decide the line, and the lesson’s own card says “Look at the other rows and columns too.” | “Two or more: check the other marks before you say “Can’t tell yet.”” The simpler says to look at the other marks, and “If they do not rule out one of the two, you can’t tell yet.” The two-box cases show each empty box could true, computed over all the grid's marks. | “lesson 2: the cases are …” |
| L2 `onlyOnePuzzle`, boundary case | Labelled “In another grid, …” while its truths ignore this grid's other ✗s. Read as this grid with one ✗ fewer, 78 of 2,400 were wrong. Check seed 9, c3 (“Which robot must be silver?”; ✗s: Bolt – silver, Chip – silver, Chip – blue, Dot – blue): “In another grid, Chip has a ✗ in the silver column. The boxes for Bolt and Dot are empty. … you can’t tell yet.” With this grid's ✗s on blue kept, Bolt must be blue, so Dot must be silver. Also practice seeds 17 (l2-2) and 20 (l2-1). | Label: “In a grid with no other marks, …”. | “lesson 2: the boundary grid has no other marks, …” |
| L3 / L4 `gridPuzzle`, simpler | “Spread that ✓ down its column” with no ✓ named before it (“So Bolt is silver.”). | “Put a ✓ in Bolt – silver. Spread it down its column: Rivet – silver gets a ✗.” Then “Now Rivet’s row has one empty box left: blue. So Rivet is blue.” | “whole grids: …” checks every ✓ and ✗ the simpler example puts against the answer, and that it never says “that ✓” |
| Terms | Two-part grids said “Spread every ✓” without defining spreading. One-part grids used ✓ without a definition. Proof items asked about a ✗ without defining it, and with a linking clue among the wrong picks they never defined a linking clue. | Two-part grids get spreading. One-part grids get ✓. Proof items get ✗, or a linking clue when one is a pick. | “every special word an explanation uses is defined in its own terms” |
| L4 `linkPuzzle`, Remember | “Find who has the first thing in the grid. The same dragon has the second thing too.”: unclear what “first thing” and “second thing” refer to. | “Find who guards the pearl in the grid. The same dragon lives in the hill cave.” | Wording only (contract test) |
| L5 link reason | “So by itself, it can’t rule out Frost.” did not say what it rules out. | “So by itself, it does not rule out the diamond for Frost.” | Wording only; “lesson 5: each wrong clue …” checks every reason ends on what is still possible |
| Whole two-part grid `explain` | “Keep going … until every row has one ✓.” In a two-part grid, each row gets one ✓ in each part. | “… one ✓ in each part of the grid.” | Wording only (contract test) |

Checked and correct: every case and example truth (recomputed from its words), every L1 and L2 headline kind, the L4
person notes, the L5 “can you tell yet” counts, answers and uniqueness (the first pass only made lesson 1's box check
stricter; this pass changes no answer logic), choice ids (content-derived, stable under shuffling), and `fresh` (a new example on the same skill, and a decided
and an undecided one wherever “Can’t tell yet” is a choice).
