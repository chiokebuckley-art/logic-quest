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

## The stop

- **Check:** 9 items, two from each lesson in order, a trap first in each pair (every trap is a conflict item), then the
  why item last (`whyItem`, tag `why`, pick the reason). Its kind is due, common, alarm or weak, and it is filed under that
  kind’s lesson (`WHY_LESSON`).
- **Warm-up (bridge):** a Ways to Think item on a good guess that is not a proof (a streak broken, what you know for sure,
  or a best guess ruled out). `bridgeFrom: 's7'`. It is finished as a Clues & Chances item (`s13.l1`, skill `s13.guess`,
  named “Clues & Chances warm-up: a good guess is not a proof (from Ways to Think)”).
- **Arcade:** one item from any lesson. **New examples:** a missed trap gets a pair whose answers differ; other kinds get
  one new item of the same kind about another topic; a missed why gets the same kind and another.
- **Skill names:** `s13.likely`, `s13.due`, `s13.hundred`, `s13.clue`, `s13.why`, `s13.guess`.
- **World:** `src/content/world/s13.ts`. **Test:** `src/engine/__tests__/chances.test.ts` (one block per lesson; answer
  balance; the closing why item; the lessons’ packs, traps, pass rules and terms; every board mark; the stop; words).

## Plan and code

- The plan’s lesson 2 names Proof Lantern’s sampling idea; the cards teach the coin and the bag (independent) without
  naming Proof Lantern.
- The plan’s lesson 4 title is “How often would I see this clue if I were wrong?”; the code’s is “Would I see this clue if
  I were wrong?”.
- The plan’s terms are likely, independent, base rate and false alarm; the code adds certain (must) and strong clue.
- The plan names one distinction (how often the test is right vs how often its yes is right: `right-vs-flag`); the code
  teaches one per lesson: `counts-vs-draw`, `back-vs-kept`, `row-vs-column` and `right-vs-flag`.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
