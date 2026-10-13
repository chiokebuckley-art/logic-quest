# Drill worksheet: Stop 11 (Circuit Lab, id s10)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s10 Circuit Lab”). The stop keeps its id `s10` and is shown as
Stop 11 on the Journey, after Truth Tables. It was built under the house rules from the start, so this sheet records
what each lesson does rather than repairs.

The stop is one file, `src/content/stop10.ts`. The circuit model and every quiz item are in
`src/engine/puzzles/circuits.ts`; the card pictures, contrast cards and boards are in
`src/engine/puzzles/circuitBoards.ts`. Circuits are a scene kind of their own (`circuit` in the `Scene` union in
`src/engine/types.ts`, drawn by `src/game/components/CircuitScene.tsx` and read aloud by `src/game/speech.ts`). Its own
test file is `src/engine/__tests__/circuits.test.ts`. The contract test (`stops.test.ts`) checks the cards, boards, quiz
packs, reading level, the closing why item and the warm-up like every other stop.

**The model (whole stop).** A circuit is one loop from a battery, through switches, to a lamp and back. A switch is closed
(no gap: power passes it) or open (a gap: power stops). The switches are wired as a `Net`: one switch, parts in a line
(`LINE`: power must pass every part), parts side by side (`SIDE`: power needs one path), or a flipper box around a part
(`FLIP`, an inverter: it lets power through only when its inside would not). The lamp is on when power gets all the way
around (`passes`). A row is one case of the switches, in Truth Tables’ order (`rowsFor`), and a circuit’s table is its
lamp in every row. Two circuits do the same job when their lamps agree in every row (`sameJob`). Every table is checked
twice more: against Truth Tables’ columns (a line is AND, side by side is OR, a flipper box is NOT, closed and on are
True) and against Stop 2’s card rules over all 18 cards (`sameMeaning`). Skins: lab, everyday and fantasy.

Lesson 5 adds one more way to wire two switches: a two-way pair (`TWOWAY(i, j)`, drawn as the scene part `twoway`). Each
two-way switch has a lever that touches its top end (up) or its bottom end (down), and two wires join the ends of switch
A to the ends of switch B. The wires cross, so A’s top end reaches B’s bottom end (`twoWayPasses` follows them). Power
gets through when both levers touch the same wire: when the switches differ. In a row, a two-way switch’s true is up,
the way a plain switch’s true is closed; a frame keeps two-way levers in `up` and plain switches in `closed`, and a
table names its switch words (`inputWords`: Up and Down for the pair, True and False when the pair and plain switches
share one table). The pair is Truth Tables’ one but not both, (A AND NOT B) OR (NOT A AND B), and Stop 2’s card rule of
the same shape: both checks still run in `sameJob`. Lesson 5 has its own stories (`TWO_TOPICS`): a long place with a
switch at each end.

## s10.l1 · In a line: AND

**Model.** `passes(LINE(...))`: on only when every switch in the line is closed.

**See.** A loop for power · Closed and open (a closed switch lets power through, like a drawbridge) · In a line (names a
series circuit) · One closed switch is not enough (contrast: two cases with A closed, only one lamp on) · Example: the line
table (rows 1 and 2 worked).

**Do.** `s10.l1-do1` “Check every switch”, right after the contrast: twin “The same two switches in a line. No case is set
yet.” Three cases, each marked: can power pass A? can power pass B? lamp (9 taps). `s10.l1-do2` “Fill the line table”,
after the example: the lamp in rows 3 and 4, then which row lights the lamp (row 1). `s10.l1-do3` “Three in a line”: twin
“A third switch, C, is added to the line”; four cases, then how many switches must be closed (3).

**Quiz.** `lampItem` (is the lamp on or off), `columnItem` (the lamp column), `caseItem` (which case lights the lamp).
Skill `s10.series`. Trap tag `one-closed` (a line with a closed switch and an open one; a conflict item). Pack: a plain
case, the trap, the lamp column, then a case or three in a line.

**Terms.** circuit; closed switch; open switch; series (in a line). **Distinction.** `one-vs-all`.

## s10.l2 · Side by side: OR

**Model.** `passes(SIDE(...))`: on when at least one path is closed; off only when every switch is open.

**See.** Side by side (names a parallel circuit) · Both closed: still on (OR includes both) · A line or side by side
(contrast: the same switches, A closed and B open, in each wiring) · Example: the side-by-side table (rows 1 and 2 worked).

**Do.** `s10.l2-do1` “Same switches, new wiring”, right after the contrast: twin “The two wirings from the card, with no
case set”; four cases, the lamp in each. `s10.l2-do2` “Fill the side-by-side table”: rows 3 and 4, then which row leaves
the lamp off (row 4). `s10.l2-do3` “Three side by side”: twin “A third switch, C, is added side by side”; four cases, then
how many must be closed to light the lamp (1).

**Quiz.** The same three kinds, side by side. Skill `s10.parallel`. Trap tag `both-closed` (side by side with every switch
closed; a conflict item).

**Terms.** parallel (side by side). **Distinction.** `line-vs-side`.

## s10.l3 · The flipper: NOT

**Model.** `passes(FLIP(x))` is the opposite of `passes(x)`.

**See.** The flipper box (names an inverter) · NOT in a circuit (the lamp column is the switch column flipped) · Closed is
not the same as on (contrast: A closed alone, and A closed inside a box) · Example: a flipper in a line (a box on A in a
line with B; work out the box first).

**Do.** `s10.l3-do1` “Switch or lamp?”, right after the contrast: twin “Switch A from the card, alone and in a flipper box,
with no case set”; three cases: the switch, then the box, then the lamp (8 taps). `s10.l3-do2` “Fill the flipper table”:
rows 3 and 4, the box on A and the lamp. `s10.l3-do3` “A flipper box side by side”: twin “The flipper box on A and switch
B are now side by side”; four rows, then which row leaves the lamp off (row 2).

**Quiz.** The same three kinds, with flipper boxes. Skill `s10.not`. Trap tag `flip-closed` (a closed switch inside a
flipper box; a conflict item).

**Terms.** inverter (flipper box). **Distinction.** `closed-vs-lit`.

## s10.l4 · From table to circuit

**Model.** `sameJob` over every row; `differRows` names the rows where two circuits disagree.

**See.** Every circuit has a table (closed is like True, on is like True) · Same table, same job (a line of A then B
against B then A) · Looks do not decide the job (contrast: a pair that looks different with the same table, and a pair
that looks alike with a different one) · Example: two that look different (a box around A and B side by side against a
box on each switch in a line: the lamps agree in every row) · From a table to a circuit (cross a circuit out at the first
row that does not match).

**Do.** `s10.l4-do1` “Alike, but the same job?”, right after the contrast: twin “The second pair from the card, drawn,
with a blank table”: a box around A and B in a line against a box on each switch in a line; both lamps in four rows (they
differ in rows 2 and 3), then same table? (no). `s10.l4-do2` “Different, but the same job?”: twin “A new pair: a box
around a line, and a box on each switch, side by side”; both lamps, then same table? (yes).

**Quiz.** `matchItem` (which circuit has this table), `sameItem` (do two circuits do the same job), `columnItem` (a mixed
circuit’s lamp column). Skill `s10.match`. Trap tag `looks-differ` (two circuits that look different but have the same
table; a conflict item; a look-alike pair that differs is a conflict item too). Pack: which circuit, the trap, a lamp
column, then a look-alike pair or another table.

**Terms.** none. **Distinction.** `looks-vs-works`.

## s10.l5 · The two-way switch (added in v0.12.0, from the logic audit)

**Model.** `passes(TWO)` follows the crossed wires: on exactly when one switch is up (exclusive or). Flip either switch
and the lamp changes. Next to side by side (plain switches with the same names), the two tables differ in one row only:
row 1, both up next to both closed, where side by side is on and the pair is off (`differRows`).

**See.** A switch at each end (a hall lamp; A up, B down, lamp on; names the two-way switch) · Follow the wires (the two
wires cross; both up, the levers touch different wires, lamp off) · Up is not the same as on (contrast: A up in both
panels; B down lights the lamp, B up leaves it off) · Not like side by side (side by side both closed: on; the pair both
up: off; one but not both, named exclusive or and “exclusive or in wires”; up is like True, so the tables differ in row 1
only) · Example: the two-way table (rows 1 and 2 worked, from `explainRow`) · From a table to a circuit (the pair’s
table in True and False beside the three circuits; row 1 crosses out side by side and the line). Every lamp and every
claim on these cards is worked out from the model (the card builders throw if the model disagrees).

**Do.** `s10.l5-do1` “Match or differ?”, right after the contrast: twin “The two-way pair from the card. No case is set
yet.” Four cases, each marked: do A and B match? then the lamp (8 taps, full scaffold, compare facts under each lamp).
`s10.l5-do2` “Two-way or side by side?”, after the side-by-side card: twin “The two circuits from the card, with no case
set, and their table.” Rows 2 and 3 are filled; the learner marks both lamps in rows 1 and 4, then the one row where they
differ (row 1). `s10.l5-do3` “Fill the two-way table”, after the example: the lamp in rows 3 and 4, then the rule (on when
the switches differ). `s10.l5-do4` “Which circuit has this table?”, after the pick card: twin “The same three circuits. The
table is new: it is side by side’s.” Three lamps in row 1 and the line’s lamp in row 2, then the circuit (circuit 1, side
by side).

**Quiz.** `lampItem` with family `two` (is the lamp on or off), `compareItem` (one row on the pair and on side by side:
which lamps are on?), `columnItem` with family `two` (fill its table; the wrong columns are side by side, a line and the
other way round, “on when they match”), `pickItem` (which of the pair, side by side and a line has this table; the table
is the pair’s half the time). Skill `s10.xor`. Trap tag `both-up` (the pair with both switches up, alone or next to side
by side with both closed; a conflict item). Pack: a plain case, the trap (alone or next to side by side), the column,
then which circuit has a table.

**Mix-ups the boards name.** `up-as-on` (both up marked on), `down-as-off` (one down and one up marked off),
`match-as-on` (the rule read as “on when they match”), `two-as-side` (the pair read like side by side in row 1),
`one-row-enough` (a circuit picked because it matches row 1). “I’m confused”: “Switch A of a two-way pair is up. Is the
lamp on?” (it depends on switch B) and “Both switches are up. Is the lamp on, like side by side?” (no).

**Terms.** two-way switch (also: exclusive or in wires). **Distinction.** `up-vs-differ` (one switch up, against the two
switches differing).

## The stop

- **Check:** 10 items, two from each of lessons 1 to 4, one from lesson 5, then the why item last: the trap lamp of
  lessons 1, 2 and 3, each followed by a column, case or lamp item of the same lesson; a same-job pair and a match or
  column item from lesson 4; from lesson 5, a row next to side by side (the trap), the pair with both up, which circuit
  has a table, or the pair’s column. The why item (`whyItem`, tag `why`) is one of line-off, side-both, flip-closed,
  same, differ and two-match (both switches up or both down, and the lamp off: why?); it is filed under that kind’s
  lesson with that lesson’s skill (there is no separate why skill). Until v0.12.0 the check had 9 items.
- **Warm-up (bridge):** a Stop 9 fill-the-column item for AND, OR or NOT (Truth Tables’ own `columnItem`, prompt starting
  “Back to Truth Tables.”), with its table board. It is stored as a Stop 9 item (`s9.l2`, skill `s9.fill`).
- **Arcade:** one item from any lesson. **New examples:** a missed lamp gets the trap again (or the same lamp) and the other
  lamp; a missed same-job pair gets one that agrees and one that does not; a missed row next to side by side gets the
  same kind of row (the trap row, or a row where the lamps agree) and then the other kind; a missed why gets a why of
  the same lesson and that lesson’s trap.
- **Skill names:** `s10.series`, `s10.parallel`, `s10.not`, `s10.match`, `s10.xor`.
- **World:** `src/content/world/s10.ts` (Lesson 5: a stair light with a switch at each end, electricians wiring a
  bedroom’s door and bed switches as a two-way pair, chip designers adding with one-but-not-both circuits; the skill
  line is a garage with a switch by each door). **Test:** `src/engine/__tests__/circuits.test.ts` (the model worked out
  again, the two-way pair as six ends and two crossed wires in the graph search; every kind in every skin; Lesson 5’s
  lamp, column, row next to side by side and which-circuit items; the closing why item; the warm-up; the lessons; the
  stop).

## Plan and code

- The plan’s optional lesson 5 (XOR and a half-adder) was not built in v0.11.0. The logic audit (v0.12.0,
  `docs/AUDIT-ADDITIONS.md`) added Lesson 5 as the two-way switch: exclusive or in wires, with no half-adder.
- The plan’s terms are circuit, series, parallel and inverter; the code adds closed switch and open switch (l1). Lesson 4
  has no terms. Lesson 5 adds two-way switch.
- The plan names one distinction for the stop (two circuits that look different and compute the same table); the code
  teaches one per lesson: `one-vs-all`, `line-vs-side`, `closed-vs-lit`, `looks-vs-works` and `up-vs-differ`.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
