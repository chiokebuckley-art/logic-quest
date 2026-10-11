# Drill worksheet: Stop 10 (Truth Tables, id s9)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s9 Truth Tables”). The stop keeps its id `s9` and is shown as
Stop 10 on the Journey, after All, Some, None. It was built under the house rules from the start, so this sheet records
what each lesson does rather than repairs.

The stop is one file, `src/content/stop9.ts`. The table model and every quiz item are in `src/engine/puzzles/tables.ts`;
the card tables, contrast cards and boards are in `src/engine/puzzles/tableBoards.ts`. Its own test file is
`src/engine/__tests__/tables.test.ts`, which works every answer, box and board mark out again. The contract test
(`stops.test.ts`) checks the cards, boards, quiz packs, reading level, the closing why item and the warm-up like every
other stop.

**The model (whole stop).** A sentence is built from letters with NOT, AND, OR and IF… THEN. `rowsFor(n)` lists every
case once, in the usual order (the first letter True in the top half, False in the bottom half; the next takes turns in
pairs; the last one at a time). `holds(sentence, row)` gives each box, and `column` a whole column. Two sentences mean
the same when their columns match in every row; a sentence is always true, sometimes true or never true by its column
(`kindOf`). The IF table uses Stop 6’s rows, and card rules use Stop 2’s `rules.ts`. Skins: letters, everyday and fantasy.
An item with blank boxes in its table also carries the table board, an optional thinking board that is never checked
(`tableScratch`, “the table board”).

## s9.l1 · Every case in rows

**Model.** `rowsFor(1)`, `rowsFor(2)`, `rowsFor(3)`: 2, 4 and 8 rows, each case once. A table is complete when it has
every case once; a repeated row means a missing case.

**See.** A table of cases · One sentence, two rows (A is a sentence about rain) · Two sentences, four rows (B is about a coat;
each row splits in two) · Three sentences, eight rows (the pattern: A top half, B in pairs, C one at a time) · Four rows is not
enough (contrast: a complete table vs one with a row twice and a case missing).

**Do.** `s9.l1-do1` “Build the four rows”: twin “New sentences, and rows 2 to 4 are blank”; row 1 is given (both true);
the learner fills A and B in rows 2 to 4 (6 boxes). Catches a row copied from the row above. `s9.l1-do2` “Build the
bottom half”: rows 1 to 4 filled, A given False in rows 5 to 8; the learner fills B and C (8 boxes). `s9.l1-do3` “Find
the repeat”, right after the contrast: four rows in no special order, each marked a new case or a repeat (row 3
repeats row 1), then the missing case (A false, B false), then a second table in a new order (does it list every case
once? yes).

**Quiz.** `countItem` (how many rows), `missingItem` (which case is missing, two or three letters), `repeatItem` (does a
table list each case once). Skill `s9.rows`. Trap tag `repeat-row` (a table with a row twice and a case missing; a
conflict item). Pack: a count, a missing case of two, the trap, then a missing case of three or a whole table.

**Terms.** truth table; row (a case). **Distinction.** `count-vs-cases` (the right number of rows vs every case once).

## s9.l2 · Tables for NOT, AND, OR

**Model.** NOT flips each row; AND is True only in row 1; OR is False only in row 4 (OR includes both). A longer sentence
is filled small parts first, in helper columns.

**See.** NOT flips each row · AND needs both · OR needs one or both · Example: a helper column (A AND NOT B: fill NOT B,
then the sentence; True only in row 2).

**Do.** `s9.l2-do1` “Fill AND and OR”: twin “Both columns, A AND B and A OR B, with every box blank” (8 boxes).
`s9.l2-do2` “Fill a helper column first”: twin “A new sentence, NOT A OR B, with its helper column NOT A”; fill NOT A,
then NOT A OR B (False only in row 2).

**Quiz.** `columnItem` (which column is right, from row 1 down; plain or with a helper), `orBothItem`, `cellItem` (one
box). Skill `s9.fill`. Trap tag `or-both` (OR in the row where both parts are true; a conflict item). Pack: a column, the
trap, a helper column, one more box.

**Terms.** none. **Distinction.** none declared.

## s9.l3 · The IF table

**Model.** IF P, THEN Q is False only in the row P true, Q false (row 2). The rows where P is false are True: the rule asks
for nothing there.

**See.** The IF table (each of Stop 6’s four boxes is a row here) · False in one row only · When the IF part is false
(contrast) · Example: the coat rule (row 2 breaks it; rows 3 and 4 are True).

**Do.** `s9.l3-do1` “Asks for nothing, or broken?” right after the contrast: for each of four rows, did the IF part happen?
then IF P, THEN Q True or False (only row 2 False). `s9.l3-do2` “Fill the IF column”: twin “A new rule, and the IF column
is blank”; fill four boxes, then which row breaks the rule (row 2).

**Quiz.** `ifColumnItem` (the IF column), `ifCellItem` (one row), `breakRowItem` (which row breaks a story rule). Skill
`s9.if-table`. Trap tag `if-false` (a row where the IF part is false; a conflict item). Pack: the IF column, the trap (row
3 or 4), the row that breaks a story rule, a row where P is true.

**Terms.** none. **Distinction.** `if-false-vs-broken`.

## s9.l4 · Same meaning

**Model.** Same meaning: the columns match in every row. The pairs taught are NOT (A AND B) with NOT A OR NOT B, and IF A,
THEN B with flip and NOT (IF NOT B, THEN NOT A). The look-alike pairs differ in some rows: NOT A AND NOT B, and flip only
(IF B, THEN A).

**See.** Same meaning (names equivalent) · NOT (A AND B) (brackets first; matches NOT A OR NOT B in every row) · Some
rows are not enough (contrast: NOT A AND NOT B agrees in rows 1 and 4, differs in rows 2 and 3) · Flip and NOT (false
only in row 2, like the rule) · Back to the cards (each row is one kind of card from Stop 2).

**Do.** `s9.l4-do1` “Agree in every row?” right after the contrast: NOT (A AND B) given; the learner fills NOT A AND NOT B,
marks agree or differ in each row, then decides (they do not mean the same). `s9.l4-do2` “Test flip only”: twin “The flip
and NOT column is gone. In its place is flip only, “IF B, THEN A,” with its boxes blank”; fill it, then same meaning as
“IF A, THEN B”? (no).

**Quiz.** `sameItem` (do two sentences mean the same?), `pickSameItem` (which one means the same), `diffRowItem` (the row
where a pair differs), `cardsSameItem` (two card rules). Skill `s9.same`. Trap tag `not-each` (a NOT put on each part, with
the joining word kept; a conflict item). Pack: a pair that means the same, the trap, which one means the same, then a
pair that differs in one row or two card rules.

**Terms.** equivalent (same meaning). **Distinction.** `some-vs-every` (agree in some rows vs every row).

## s9.l5 · Always true, never true

**Model.** `kindOf`: always true (all True), never true (all False), sometimes true (some of each).

**See.** Always true (A OR NOT A; names tautology) · Never true (A AND NOT A; names contradiction) · Most rows is not every
row (A OR B: three rows of four) · Example: always true (IF A AND B, THEN A: True in every row).

**Do.** `s9.l5-do1` “Always or never?”: twin “The letter is B, and both sentences sit in one table”; fill NOT B, B OR NOT
B and B AND NOT B, then the kind of each (always, never). `s9.l5-do2` “Most rows, or every row?”: twin “Two new sentences:
“A OR B” and “IF B, THEN A OR B.””; fill both columns, then the kind (sometimes, always).

**Quiz.** `kindItem` (always, sometimes or never) and `pickAlwaysItem` (which one is always true). Skill `s9.always`. Trap
tag `most-rows` (true in most rows, but not every row; a conflict item). Pack: always true, the trap, which is always
true, then never or sometimes.

**Terms.** tautology (always true); contradiction (never true). **Distinction.** `some-vs-every`, reminded (`taughtIn:
s9.l4`).

## The stop

- **Check:** 10 items: two from each of lessons 1 to 4 and one from lesson 5, then the why item last. The conflict items
  are the repeated row, OR when both are true, a row where the IF part is false, and the NOT on each part. The why item
  (`whyItem`, tag `why`, four reasons with one right) is one of four kinds: same, differ, if-row, always; it is filed
  under that kind’s lesson (`WHY_LESSON`) with that lesson’s skill.
- **Warm-up (bridge):** a Stop 2 card question: does this card fit NOT (A AND B)? It is answered with Stop 2’s rule
  evaluator, and the engine checks that the table row agrees. `bridgeFrom: 's2'`. It is stored as a Stop 9 item in
  lesson 2 (skill `s9.fill`).
- **Arcade:** one item from any lesson. **New examples:** a missed box, same-meaning or kind question gets a pair with
  different answers; a missed table check gets the trap and a whole table; a missed why gets two items.
- **Skill names:** `s9.rows`, `s9.fill`, `s9.if-table`, `s9.same`, `s9.always`.
- **World:** `src/content/world/s9.ts`. **Test:** `src/engine/__tests__/tables.test.ts` (one block per lesson, every kind of
  item, the closing why item, the warm-up, the lessons, the stop).

## Plan and code

- Lessons 2 and 3 declare no glossary terms and lesson 2 no distinction; the plan’s five terms all sit on lessons 1, 4
  and 5.
- The plan’s bridge is “a Stop 2 NOT(A AND B) card case”; the code does that, but files the warm-up under Truth Tables
  lesson 2 (skill `s9.fill`), where the Arguments and All, Some, None warm-ups are filed under the stop they come from.
- The plan status notes that some step-by-step explanations run to four or five short sentences.
- “Contradiction” is a term here (never true) and in Proof (suppose and crash), each with its own meaning, as the plan’s
  status says.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
