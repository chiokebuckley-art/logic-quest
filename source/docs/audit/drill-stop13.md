# Drill worksheet: Stop 14 (Clues & Chances, id s13, side track)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s13 Clues & Chances”). The stop keeps its id `s13` and is
shown as Stop 14, the second side-track stop (`sideTrack: true`). It opens after Spot the Trick (`requires: ['s12']`), and
the Pattern Lab’s Chance Dock points to it. It was built under the house rules from the start, so this sheet records
what each lesson does rather than repairs.

The stop is one file, `src/content/stop13.ts`. Bag and coin items are in `src/engine/puzzles/chances.ts`; count
pictures, clue and test items, and the why item are in `src/engine/puzzles/counts.ts`; the cards, contrast cards and boards
are in `src/engine/puzzles/chanceBoards.ts`, which reuses Ways to Think’s bag sentences and words from `patterns.ts`. Its
own test file is `src/engine/__tests__/chances.test.ts`. The contract test (`stops.test.ts`) checks the cards, boards,
quiz packs, reading level, the closing why item and the warm-up like every other stop.

**The models (whole stop).**

- **A bag** (draws go back): Ways to Think’s four words from the counts (`wordFor`): Must when every one fits, Likely when
  more fit than not but not every one, Unlikely when some fit but fewer, Can’t when none fit. A word is right or not by
  the counts, never by what one draw shows.
- **Each draw is new:** a fair coin is 1 in 2 every flip; a draw put back leaves the bag the same; a draw kept out changes
  it, and the word is worked out again from the new counts. Every way a few flips can go is listed, never assumed.
- **A count picture** (scene `counts`): 100 things in a 2-by-2 grid of counts, never percentages. A row counts one group,
  a column one side of a clue, a box both (`rowTotal`, `colTotal`). The base rate is a row’s total out of 100.
- **A clue or a test:** a clue is strong when you would rarely see it if you were wrong (`strongerClue`). A test is right
  for the yes box plus the no box (`rightFor`); a flag is right only in its own column, so a good test for a rare thing can
  have mostly false alarms.
- **A pair picture** (Lesson 5, the same `counts` scene): 100 things split by two things that do not affect each other.
  The rows are the first thing, the columns the second, and the second is k in every m in each row (`pairPic`, `partOf`:
  the row split into groups of m, with k from each group). Every count is read from its boxes (`pairCounts`): both is
  the box the row and the column share; either is the three boxes with one thing or both; adding the row and the column
  counts that shared box (the overlap) twice. Never fractions and never percent: counts and groups only. A picture to
  fill shows each row’s count in all beside blank boxes (the scene’s `rowTotals`; `colTotals` too), read aloud as blank.

Skins: everyday, fantasy and abstract.

## s13.l1 · Likely, not certain

**Model.** `wordFor(fits, total)` on a bag; a draw never changes a word that was judged by the counts.

**See.** Four words for how sure (Ways to Think’s words) · Likely is not certain (a jar of 9 lemon drops and 1 cherry
drop) · The word comes from the counts (contrast: the same jar, one draw) · Example: mark each sentence (a bag of 10 cards:
4 red circles, 3 blue circles, 3 blue squares; each shape sentence with its count and word) · A lucky draw is not a right
word (Ned says “It must be lemon” and gets lemon).

**Do.** `s13.l1-do2` “Right word, or not?”, right after the contrast: four cases of Rosa’s word and a draw from the jar,
each marked was the word right? (“Lemon is likely” then a cherry: right; “It must be lemon” then a lemon: not right; and
two more). `s13.l1-do1` “Mark the colors”, after the example: the shape sentences are given; the learner marks the four
color sentences (Unlikely, Likely, Can’t, Must) and “The next card is red” after a red draw went back (still Unlikely).
Neither board has a twin note; the second is the example’s own bag.

**Quiz.** `wordItem` (which word fits), `pickItem` (which of four bags), `drawItem` (a word and a draw: surprise, rare,
lucky or never). Skill `s13.likely`. Trap tag `one-draw` (one draw seems to make the word right or wrong; a conflict item).
Pack: a word, a bag to pick, then the trap twice (a word right against the draw, and a word wrong with it).

**Terms.** likely; certain (must). **Distinction.** `counts-vs-draw`.

## s13.l2 · Each draw is new

**Model.** A coin streak leaves tails at 1 in 2; listing every way three flips can go shows that after heads, heads, one
way ends heads and one ends tails. A bag with draws kept out is counted again.

**See.** A coin has no memory · Each draw is new (names independent) · Back in, or kept out? (contrast: the same bag and
the same two red draws, put back or kept out) · Example: every way two flips can go · A streak does not change the bag
(Wes: 5 red, 2 blue, four reds put back; blue is still unlikely, not due).

**Do.** `s13.l2-do2` “Put back, or kept out?”, right after the contrast: four cases (one red put back, one blue kept out, two
reds kept out, three reds put back), each marked same bag as at the start? and the word for “The next marble is red.”
`s13.l2-do1` “Three flips”, after the example: twin “One more flip: three flips, so 8 ways instead of 4.” How many ways start
heads, heads (2), how many end heads (1), how many end tails (1), so tails is the same, not due.

**Quiz.** `coinItem` (is tails due after a streak?), `keptItem` (a bag that changes: the word, or which of two kids keeps
the bag the same), `bagDueItem` (Ways to Think’s streak trap). Skill `s13.due`. Trap tag `due` (a streak seems to make
something due; a conflict item). Pack: the coin trap, a bag that changes, the bag streak, then two kids.

**Terms.** independent (each draw is new). **Distinction.** `back-vs-kept`.

## s13.l3 · Out of 100

**Model.** The farm picture: 100 animals, goats and sheep by brown or not (8 brown goats, 2 not; 18 brown sheep, 72 not).
The twin farm has 30 goats and 70 sheep (24 brown goats, 14 brown sheep). Which group a brown animal more likely is in
comes from the brown column, not the rows.

**See.** How common is it? (names base rate) · The count picture · Out of which group? (contrast: the same 8 brown goats,
out of the goat row and out of the brown column) · Example: read the picture · The bigger group can win (most goats are
brown, but more brown animals are sheep).

**Do.** `s13.l3-do2` “Out of which group?”, right after the contrast: four sentences, each marked row or column, then true
or false. `s13.l3-do1` “Read the picture”, after the example: how many sheep (90), how many not brown (74), of the 26 brown
animals how many are sheep (18). `s13.l3-do3` “More goats”, after the trap card: twin “One thing changed: now 30 of the 100
animals are goats, and 70 are sheep. Most goats are still brown, and few sheep are.” Brown goats (24), brown sheep (14),
then a brown animal is more likely a goat.

**Quiz.** `readItem` (a row, a column or a box), `fitsItem` (which group the clue is more common in), `moreItem` (which
group a thing with the clue more likely is in), `ofItem` (out of the column). Skill `s13.hundred`. Trap tag `base-rate`
(the clue fits the rare group better, but the common group is bigger; a conflict item). Pack: read a part, which group
the clue is more common in, the trap, then out of the column.

**Terms.** base rate (how common it is). **Distinction.** `row-vs-column`.

## s13.l4 · Would I see this clue if I were wrong?

**Model.** The rain clues (10 mornings after rain and 10 without: wet grass 10 and 7, puddles 8 and 1). The eye check: 100
kids, 5 need glasses and all 5 are flagged; 10 of the 95 who see fine are flagged too. The twin flags 20 of the 95.

**See.** A clue you would see anyway (Otto and Bea’s bike) · Strong clue, weak clue (the rain clues) · Right for most, or
right when it flags? (contrast) · Example: the eye check (right for 90 of the 100 kids, but only 5 of its 15 flags are
right) · Rare things and false alarms.

**Do.** `s13.l4-do0` “Strong or weak?”, right after the rain card: for each clue, do you see it often with no rain? strong
or weak? then which clue tells you more (the puddles). `s13.l4-do2` “Which group?”, right after the contrast: four
sentences about the eye check, each marked out of which group (needs glasses, all 100, or flagged), then true or false.
`s13.l4-do1` “More false alarms”, after the example: twin “One count changed: the check now flags 20 of the 95 kids who see
fine, not 10.” Flags in all (25), false alarms (20), kids the check is right for (80), then a flagged kid more likely sees
fine.

**Quiz.** `strongItem` (which clue tells more), `answerItem` (out of the yes column), `alarmItem` (a flag from a good test
for a rare thing), `whyItem` (a weak clue, or a false alarm). Skills `s13.clue` and `s13.why`. Trap tag `false-alarm` (a
test right for most, yet most of its yes answers are false alarms; a conflict item).

**Terms.** false alarm; strong clue. **Distinction.** `right-vs-flag`.

## s13.l5 · And, or, with chances

**Model.** The balloons: 100 balloons at a fair, 10 red, and size does not depend on color: 1 in every 2 balloons is big
(`BALLOONS_PIC`: 5 red and big, 5 red and not big, 45 big and not red, 45 neither). Both (red and big) is one box: 5.
Either (red or big, or both) is the red row and the big column, 10 and 50 make 60, with the 5 counted twice taken away:
55, the same as counting the three boxes (5, 5 and 45). The twin (`BALLOONS_TWIN`) has 40 red and 1 in every 4 big (10
red and big, 30 red and not big, 15 big and not red, 45 neither): big in all 25, both 10, either 55.

**See.** Both at once (the balloon picture; names both, and) · Things that do not affect each other (big is the same
part of each row, so both is the red row split into groups of 2, 1 from each; if the two did affect each other, you would
count the box itself) · Both, or either? (contrast: the same balloons, two questions: red and big gives 5, one box; red or
big gives 55, the row and the column with their shared box once; names either, or, and overlap) · Example: both, then
either (the picture with the red row and the big column picked out; step 1 the counts in all, step 2 both, step 3 either,
then a check by counting boxes, and the counts as chances: one balloon picked without looking is red and big 5 in 100,
red or big 55 in 100) · Two adding traps (never add for both; for either, take the overlap away once).

**Do.** `s13.l5-do1` “Both, or either?”, right after the contrast, on the balloon picture: three questions (red and big;
red or big, or both; big and not red), each marked both or either, then its count (5, 55, 45). Misconceptions: the row and
the column added for both (`add-both`), the same for either (`counted-twice`), and and read as or (`and-as-or`); two “I’m
confused” questions (where a red and big balloon sits; does or count it). `s13.l5-do2` “More red balloons”, after the
example: twin “One thing changed: now 40 of the 100 balloons are red, and 1 in every 4 balloons is big.” The picture shows
only each row’s count (40, 60), the boxes blank, and the caption gives the part. Big in all (25), red and big (10), red or
big, or both (55). Misconceptions: `add-both`, `counted-twice`, and one but not both (`or-one-only`).

**Quiz.** `bothItem` (a picture to fill: each row’s count, the part with the second thing; how many have both? Choices:
the box; the row and the column added, the trap; the count for either; every thing with the second thing; and the number
of groups when more than 1 is taken from each group, else the rest of the first row, so the right count is not always the
smallest), `eitherItem` (how many have one, the other, or both? on a whole picture, or from the rows so both is found
first; choices: the three boxes; the row and the column added, the trap; one but not both; both only; neither). Skills
`s13.both` and `s13.either`. Trap tags `add-both` (adding for both) and `overlap` (adding for either without taking the
overlap away); every one is a conflict item, and the pass rule asks for one of each. Pack: both, either on a whole
picture, both in another skin, then either from the rows. Every hint and “Explain more simply” is one small case of 10 cards (4 red, and 1 in every 2 big, red or not: 5 big, 2
both, 7 red or big), each count worked out from it.

**Terms.** both (and); either (or); overlap. **Distinction.** `both-vs-either`.

## The stop

- **Check:** 10 items, two from each of Lessons 1 to 4 in order, a trap first in each pair (every trap is a conflict item),
  one from Lesson 5 (both or either, a trap), then the why item last (`whyItem`, tag `why`, pick the reason). Its kind is
  due, common, alarm or weak, and it is filed under that kind’s lesson (`WHY_LESSON`).
- **Warm-up (bridge):** a Ways to Think item on a good guess that is not a proof (a streak broken, what you know for sure,
  or a best guess ruled out). `bridgeFrom: 's7'`. It is finished as a Clues & Chances item (`s13.l1`, skill `s13.guess`,
  named “Clues & Chances warm-up: a good guess is not a proof (from Ways to Think)”).
- **Arcade:** one item from any lesson. **New examples:** a missed trap gets a pair whose answers differ; other kinds get
  one new item of the same kind about another topic; a missed why gets the same kind and another; a missed both or
  either gets one of each about another topic, so adding never passes the set.
- **Skill names:** `s13.likely`, `s13.due`, `s13.hundred`, `s13.clue`, `s13.why`, `s13.both`, `s13.either`, `s13.guess`.
- **World:** `src/content/world/s13.ts`. **Test:** `src/engine/__tests__/chances.test.ts` (one block per lesson; answer
  balance; the closing why item; the lessons’ packs, traps, pass rules and terms; every board mark; the stop; words).
  Lesson 5’s answers are counted again one thing at a time (in the row and in the column; in the row or in the column),
  “do not affect each other” is checked as the same share (by division) in each row, and the right count’s place by size
  and on screen is checked to move.

## Plan and code

- The plan’s lesson 2 names Proof Lantern’s sampling idea; the cards teach the coin and the bag (independent) without
  naming Proof Lantern.
- The plan’s lesson 4 title is “How often would I see this clue if I were wrong?”; the code’s is “Would I see this clue if
  I were wrong?”.
- The plan’s terms are likely, independent, base rate and false alarm; the code adds certain (must) and strong clue.
- The plan names one distinction (how often the test is right vs how often its yes is right: `right-vs-flag`); the code
  teaches one per lesson: `counts-vs-draw`, `back-vs-kept`, `row-vs-column`, `right-vs-flag` and `both-vs-either`.
- Lesson 5 comes from the audit additions brief (`docs/AUDIT-ADDITIONS.md`, “s13 Clues & Chances: one new lesson”). Its
  example is the brief’s own (10 of 100 red, 1 in 2 of those big, 5 of 100 red and big); “either” is said as “or both”
  everywhere, so it never reads as one but not both. The closing why item keeps its four kinds; Lesson 5 is in the check
  through its own slot.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
