# Drill worksheet: Stop 10 (Truth Tables, id s9)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s9 Truth Tables”). The stop keeps its id `s9` and is shown as
Stop 10 on the Journey, after All, Some, None. It was built under the house rules from the start, so this sheet records
what each lesson does rather than repairs.

The stop is one file, `src/content/stop9.ts`. The table model and every quiz item are in `src/engine/puzzles/tables.ts`;
the card tables, contrast cards and boards are in `src/engine/puzzles/tableBoards.ts`. Its own test file is
`src/engine/__tests__/tables.test.ts`, which works every answer, box and board mark out again. The contract test
(`stops.test.ts`) checks the cards, boards, quiz packs, reading level, the closing why item and the warm-up like every
other stop.

**The model (whole stop).** A sentence is built from letters with NOT, AND, OR, IF… THEN, IF AND ONLY IF (`IFF`: Stop
6’s two IF rules, one each way) and BUT NOT BOTH (`XOR`: OR with the row where both are true left out). `rowsFor(n)` lists every
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

## s9.l6 · Both ways, and one but not both

*Added in v0.12.0 from the Curriculum and Logic Audit (`docs/AUDIT-ADDITIONS.md`, “s9 Truth Tables”).*

**Model.** `IFF(A, B)` holds when both IF rules hold (`formHolds('iff', …)` from Stop 6), so it is True where the parts
match (rows 1 and 4). `XOR(A, B)` (“A OR B BUT NOT BOTH”) holds when one part or both are true but not both, so it is
True only in rows 2 and 3. The proof the lesson asks for is computed: `XOR(A, B)` and `(A OR B) AND NOT (A AND B)` have
the same column (`sameColumn`), and `XOR(A, B)` differs from plain OR in one row only, row 1 (`differRows`). New
misreadings for column choices: IF AND ONLY IF read one way (`iff-as-if`) or as AND (`iff-as-and`), and BUT NOT BOTH
read as plain OR (`xor-as-or`), tried only on a sentence that uses those words (older items keep their choices).

**See.** Both ways (two IF rules, one each way; True where the parts match; names biconditional) · One but not both (the
everyday OR of NOT, AND, OR as its own words; True in rows 2 and 3; names exclusive or) · When both parts are true
(contrast: row 1 under A OR B, True, and under A OR B BUT NOT BOTH, False) · OR, and not both (the two columns match in
every row) · Example: a rule both ways (Leo lines up IF AND ONLY IF the bell rings; rows 2 and 3 break it, and a plain IF
rule would allow row 3).

**Do.** `s9.l6-do1` “Both ways”, after the first card: twin “The columns for IF B, THEN A and for A IF AND ONLY IF B are
blank”; IF A, THEN B given; fill IF B, THEN A and the IF AND ONLY IF column (8 boxes). Catches IF AND ONLY IF read one
way (`iff-as-if`: row 3 marked True). `s9.l6-do2` “One, or both?”, right after the contrast (distinction `or-vs-one`,
full scaffold): fill A OR B and A OR B BUT NOT BOTH (8 boxes), then the row where they differ (row 1). Catches `xor-as-or`
(row 1 of BUT NOT BOTH marked True) and `or-one` (row 1 of plain OR marked False). `s9.l6-do3` “OR, and not both”, after
the same-meaning card: A OR B and A OR B BUT NOT BOTH given; fill NOT (A AND B) and (A OR B) AND NOT (A AND B) (8
boxes), then same meaning? (yes).

**Quiz.** `xorCellItem` (one box of BUT NOT BOTH), `iffCellItem`, `bothWaysColumnItem` (which column), `bothWaysSameItem`
(same meaning: OR and not both, only A or only B, NOT both ways; or a look-alike: plain OR, NOT (A AND B), IF, AND),
`lookAlikeRowItem` (the one row where plain OR and BUT NOT BOTH differ, row 1, or IF and IF AND ONLY IF, row 3). Skills
`s9.iff` and `s9.xor` (every pack asks both). Trap tag `xor-both` (BUT NOT BOTH in the row where both parts are true; a
conflict item). Pack: the trap box, the IF AND ONLY IF column, BUT NOT BOTH against OR (same meaning or the row where
they differ), then one more of either word.

**Terms.** biconditional (if and only if); exclusive or (one but not both). **Distinction.** `or-vs-one` (plain OR
includes both vs BUT NOT BOTH leaves out the row where both are true).

## s9.l7 · Say it with symbols

*Added in v0.12.0 from the audit. Optional, for the oldest readers (Grade 8 and up in the Kid Journey).*

**The one lesson where a kid reads symbols.** It sets `LessonDef.symbols: true`. The symbol bans skip its strings: in
`tables.test.ts` its cards, boards, items, feedback and terms are checked for the reading level, curly quotes, US spelling
and “Wrong”, but only for symbols other than the five; every other string of the stop must hold none of ¬ ∧ ∨ → ↔. The
contract test (`stops.test.ts`) adds the same rule for every built stop (logic symbols only in the lesson that sets
`symbols`) and checks that `s9.l7` is the only such lesson in the game. BUT NOT BOTH has no symbol here.

**Model.** `sym(sentence)` prints the symbol form (¬ for NOT, ∧ for AND, ∨ for OR, → for IF … THEN, ↔ for IF AND ONLY IF,
the same brackets as in words, and brackets around a joined part of an arrow). `parseWords` reads the words `say()` prints
back to a sentence, and `parseSymbols` reads the symbols back. A translation is computed through the model: words to
symbols is `sym(parseWords(words))`, symbols to words is `say(parseSymbols(symbols))`, and each item checks that its answer
reads back to the sentence it started from. Wrong translations come from `symMisreads`: → for ↔ (`arrow-both`, the trap),
↔ for → (`arrow-one`), the arrow turned around (`flip`), → as ∧ (`if-as-and`), ∧ and ∨ swapped (`and-or`), the NOT moved
(`not-scope`), a NOT on each part (`not-each`), a NOT left out (`drop-not`), another symbol for the main word
(`wrong-sym`). Each wrong choice means something else: its column differs from the right one, and the feedback shows a
row where they differ.

**See.** Five words, five symbols (names symbol and each of the five) · NOT, AND, OR (the table with ¬A, A ∧ B and A ∨ B
as headings) · The two arrows (A → B and A ↔ B; row 3 marked) · One way is not both ways (contrast: row 3, A false and B
true, under A → B, True, and under A ↔ B, False) · Example: words to symbols (NOT (A AND B) becomes ¬(A ∧ B), IF NOT B,
THEN NOT A becomes ¬B → ¬A; the table shows the words column and the symbols column matching).

**Do.** `s9.l7-do1` “Each symbol’s word”, after the first card (no picture, like the card): the five symbols in a new
order, tap each one’s word (5 taps). Catches → taken for IF AND ONLY IF. `s9.l7-do2` “One way or both ways?”, right after
the contrast (distinction `one-way-vs-both`, full scaffold): twin “The same two arrows, with every box blank”; fill A → B
and A ↔ B (8 boxes), then the row that tells them apart (row 3). Catches `arrow-as-both` (row 3 of A → B marked False).
`s9.l7-do3` “Words and symbols”, after the worked example: twin “New sentences and no table”; three sentences into
symbols (NOT (A OR B), IF A, THEN NOT B, A IF AND ONLY IF B) and two into words (¬A → B, ¬A ∧ B), each with two wrong
translations (5 taps). Catches the trap on both IF sentences.

**Quiz.** `toSymbolsItem` (which is this sentence in symbols? the table of the sentence beside it), `toWordsItem` (which
sentence in words says these symbols? the table headed in symbols beside it), `symCellItem` (one box, read in symbols).
Skill `s9.symbols`. Trap tag `arrow-both` (→ read as ↔: an IF sentence with its both-ways reading among the choices, or a
box where that reading gives the other answer; a conflict item). Pack: words to symbols with an IF sentence (the trap),
symbols to words, one box in symbols, then one more translation either way.

**Terms.** symbol (sign); ¬ (NOT); ∧ (AND); ∨ (OR); → (IF … THEN); ↔ (IF AND ONLY IF). **Distinction.** `one-way-vs-both`.

## The stop

- **Check:** 10 items in lesson order, then the why item last: one from each lesson (the traps of lessons 1 to 4: the
  repeated row, OR when both are true, a row where the IF part is false, and the NOT on each part), a second from lesson
  6 (so both IF AND ONLY IF and BUT NOT BOTH are asked; the BUT NOT BOTH one is the trap box at least half the time), and one more
  from a lesson in 1 to 5 (a kind the plan does not already ask: a count or missing case, a column, the IF column or the
  row that breaks a rule, which means the same or where two differ, which is always true). Lesson 7 is one translation
  or symbol box. The why item (`whyItem`, tag `why`, four reasons with one right) is one of five kinds: same, differ,
  if-row, always, and xor-row (why A OR B BUT NOT BOTH is False in row 1: both parts are true; the wrong reasons are met
  by plain OR True in row 1, by the row where it is True, and by a sentence True in row 1); it is filed under that kind’s
  lesson (`WHY_LESSON`) with that lesson’s skill.
- **Warm-up (bridge):** a Stop 2 card question: does this card fit NOT (A AND B)? It is answered with Stop 2’s rule
  evaluator, and the engine checks that the table row agrees. `bridgeFrom: 's2'`. It is stored as a Stop 9 item in
  lesson 2 (skill `s9.fill`).
- **Arcade:** one item from any lesson. **New examples:** a missed box, same-meaning or kind question gets a pair with
  different answers (a missed BUT NOT BOTH trap box gets the trap again first; a missed symbol box that was the trap gets
  another trap box); a missed table check gets the trap and a whole table; a missed column or look-alike row of lesson 6
  gets the look-alike row and a box; a missed translation gets one each way, the first with the trap; a missed why gets
  two items.
- **Skill names:** `s9.rows`, `s9.fill`, `s9.if-table`, `s9.same`, `s9.always`, `s9.iff`, `s9.xor`, `s9.symbols`.
- **World:** `src/content/world/s9.ts`. **Test:** `src/engine/__tests__/tables.test.ts` (one block per lesson, every kind of
  item, the closing why item, the warm-up, the lessons, the stop).

## Plan and code

- Lessons 6 and 7 follow `docs/AUDIT-ADDITIONS.md`. The brief’s “A OR B, and not both” is written “(A OR B) AND NOT (A AND
  B)”, the words the earlier lessons use; one but not both is written “A OR B BUT NOT BOTH”.
- Lesson 7 is meant to be optional for younger players, but nothing in the game marks a lesson optional yet (the Kid
  Journey will place it); the stop check asks one Lesson 7 question like any other lesson.
- Review (v0.12.0): every wrong box of Lessons 6 and 7 names its mistake in every row, not only in the trap row (the parts
  match or do not match; exactly one part true, or none; the IF part false, or the one row that breaks the arrow; what AND
  or OR needs). The look-alike row’s example says “Both sentences are true,” not a bare “Both are true” beside a row of
  parts (the same generator serves Lesson 4, so its note gained the word too). The xor-row why item says “OR includes
  both” once.
- Read-aloud (`game/speech.ts`) and the truth-table picture read headings as written. A symbol heading is read by the
  device voice as that voice names the sign; turning the five symbols into words for the voice is left to the shared
  speech code.

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
