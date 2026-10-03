# Skill-drill audit: Stop 3 (Line Up)

The handoff is “Logic Quest: teach before the quiz” (2 Oct 2026). Its core rule: every new method is See one marked
case, then Do one with taps, then Quiz a twin. A lesson is not passed until the learner has done the marks. A new
rule family never shows up inside the quiz.

The Stop 3 section of the handoff speaks to lessons 1 and 2. It says: place one taught chain and one non-chain before
any mixed order quiz, and never ask “right before” as if it were the same tap as “before.” It gives one sample (Cal,
Ava, Ben). Lessons 3 to 5 get no lines of their own (“Do not invent the later line-up topics”). So their boards are
built only from each lesson's own worked example, and their quizzes keep only what the cards already teach.

How the engine keeps every value honest:

- Each board is a small fixed line-up (`LineBoard`: a skin, the names, the clues) in `content/stop3.ts`. The same
  object draws the key-idea card's clue list (`boardScene`) and the guided board, so See and Do show one board.
- Every mark comes from the board helpers in `engine/puzzles/lineup.ts`: `placeRow`, `lineRow`, `trialRow`,
  `whereMark`, `whoMark`, `compareMark`, `statusRow` and `coverRow`. They list every order of the names and keep the
  ones where every clue holds. Nothing on a board is typed in by hand.
- Every message for a wrong tap is built the same way. It quotes the clue or sentence, then says where the people
  stand in that line, or which order shows the answer can go two ways.
- The tests read each clue back from its words (`readBoardClue`, as `signs.test` reads a sign). Then they work out
  every mark again with `holds`, the clue checker written in the test file.

Boards are tap-only (the shared board has no drag), so “drag Ava into the line” is one row of name chips per spot.

## Lesson 1 · Chains

**See.** “Follow the chain” keeps its clues (“Ava is taller than Ben.” “Ben is taller than Cal.”). Its last line now
says the marked case outright: “Tallest first, the line is Ava, Ben, Cal.” “When you can’t tell” is the marked
non-chain: Ava or Cal could be tallest. “Who is first?” is now “Who is first or last?” It adds one sentence on the
shortest end, because the quiz asks for the last end too.

**Do.** One board, “Place the line.” It is a twin of the card's board that changes one clue. “Ben is taller than
Cal” is now “Cal is taller than Ava,” the handoff's chain. The board's own words say so: “One clue changed. ‘Ben is
taller than Cal’ is now ‘Cal is taller than Ava.’” (The twin note is worked out from the two boards. The board does
not draw `DrillStep.twin`, so the body carries it.)

| Row | Marks | Right taps |
|---|---|---|
| Shown: the card's chain | The tallest, the second tallest, the shortest | Ava, Ben, Cal |
| Your turn: the clues above | The tallest, the second tallest, the shortest | Cal, Ava, Ben (the handoff's sample) |
| Your turn: only “Cal is taller than Ava” is left | Who is taller, Cal or Ava? | Cal |
| | Who is taller, Ava or Ben? | Can't tell (the handoff's sample) |
| | Who is the tallest? | Can't tell (Ben or Cal) |

Six taps. The handoff's ask, “Who is first, Ava or Ben?”, would be unclear in a line (Ava is never first). So it is
asked as a pair: “Who is taller, Ava or Ben?”

Example why, for tapping Ava on “Who is taller, Ava or Ben?”: “In Cal, Ava, Ben (tallest first), Ava is taller than
Ben. But in Ben, Cal, Ava (tallest first), Ben is taller than Ava. No clue compares Ava and Ben.”

**Quiz.** Chains and can't-tell only, as before. What changed:

- Try 1 is a new chain in a new skin (never heights): three people, who is first, decided.
- Try 2 is a twin of the board's non-chain: three people, who is first, Can't tell.
- Tries 3 and 4 are one decided and one Can't tell, in any order, at either end, with three or four people.
- The last end (“who is shortest?”) stays in the quiz. The card now teaches it, and the board places the shortest.

Nothing moved out. Every item was already a chain of “before” clues.

**Pass.** Three right on the first try with no hint. One must be a Can't tell (tag `cant-tell`). Every planned set
has two.

**Hint.** One try, already checked: a person the clues cross out at the asked end, with every clue marked true or
false. For “Who has the longest wings?” with “Frost has longer wings than Ember” and “Frost has longer wings than
Jade,” it shows “Longest wings to shortest: Ember, Frost, Jade.” Clue 1 is false, clue 2 is true, and the note says
“So cross out Ember.” It is never the answer's case.

## Lesson 2 · Before vs right before

**See.** “One clue, three orders” stays word for word (a test pins it). It marks “before” with a person in between:
in Ava, Cal, Ben, Cal is between them. “Right before” now has its own board, the clue “Ava finished right before
Ben.” It marks the case with nobody in between: “The order Ava, Ben, Cal fits this clue.”

**Do.** Two boards. “Before” and “right before” are always two separate taps.

1. “Before or right before?” on the card's board (“Ava finished before Ben.”). Ava, Cal, Ben is shown: “before” is
   True, “right before” is False.

   | Row | Right taps |
   |---|---|
   | Ava, Ben, Cal | “before” True, “right before” True |
   | Cal, Ava, Ben | “before” True, “right before” True |
   | Must, might or can't | “right before”: Might. “Ava finished before Ben”: Must. “Ben finished before Ava”: Can't |

2. “A ‘right before’ clue” on the “Right before” card's board. Ava, Ben, Cal is shown: the clue is True, and the
   order fits.

   | Row | Right taps |
   |---|---|
   | Ava, Cal, Ben | Clue False, does not fit |
   | Cal, Ava, Ben | Clue True, fits |
   | Must, might or can't | “Ava finished before Ben”: Must. “Cal finished before Ben”: Might |

Seven taps, then six. Example why, for tapping Must on “Ava finished right before Ben”: “In Ava, Cal, Ben, every clue
is true, but ‘Ava finished right before Ben’ is false. Cal finished between Ava and Ben. So it does not have to be
true.”

**Quiz.** What moved out: clues that name a spot (“Volt is at the back of the parade,” “A is at the right end”). They
were in 222 of 1,200 practice items, and only lesson 4 teaches them. They are gone from lesson 2's practice, its
check items, its Arcade items and its new examples (`L2_TYPES`: before and right before). The “Explain more simply”
for a “must” sentence about “right before” used “first” and “last” clues. It now uses two “before” clues.

- Try 1 is the twin of the first board: a “before” clue and a “right before” sentence (Might), three people, in a
  new skin (never a foot race).
- Then a Must, a Can't and one more, in any order.

**Pass.** Three right on the first try with no hint. One must be the trap: a “before” clue with a “right before”
sentence (tag `before-trap`). Try 1 is always one.

**Hint.** One order, with every clue and the sentence marked. It is never the answer's case:

- Must: the nearest order that makes the sentence false. It breaks a clue, so it does not fit.
- Can't: the nearest order that makes the sentence true. It breaks a clue, so it does not fit.
- Might: an order that fits. For the trap (a “before” clue, a “right before” sentence), it is the order with someone
  in between, as on the first board's shown row.

The hint words are “Here is one order, checked for you. Check other orders the same way. Is the sentence true in
every order that fits, in some, or in none?” They never say that other orders fit, because often only one does.

## Lesson 3 · Not first, not last, next to, between

**See.** “Try each spot” stays (Eli, Fay and Gus; Eli is not first and not last). It is still the first card that
says “break” (a test pins it). “Next to” and “Between” were prose. Each now has its own board and one marked case.

- “Next to”: “No one finished between Ava and Ben.” Ava, Ben, Cal fits, and so does Ben, Ava, Cal. Ava, Cal, Ben does
  not fit, because Cal finished between them.
- “Between”: “Cal finished somewhere between Ava and Ben.” Ava, Cal, Ben fits, and so does Ben, Cal, Ava. Cal is in
  the middle.

**Do.** One board for each kind of clue the quiz uses. Each is its card's own board. Each row tries one name in one
spot: each clue True or False for that line, then Keep or Cross out.

1. “Try each spot.” Shown: Eli second (True, True, Keep). Your turn: Eli first (False, True, Cross out) and Eli last
   (True, False, Cross out). Then “Now Hana runs too”: four runners, with the same two clues. “In what place did Eli
   finish?” Can't tell (second or third). Seven taps.
2. “Next to.” Shown: Cal second (False, Cross out). Your turn: Cal first (True, Keep) and Cal last (True, Keep). Then
   “In what place did Cal finish?” Can't tell. Then “Now add a clue: ‘Cal finished before Ben.’” The same question
   is now First. Six taps.
3. “Between.” Shown: Ava first (True, Keep). Your turn: Cal first (False, Cross out) and Ben first (True, Keep). Then
   “Who finished first?” Can't tell. Then “Now add a clue: ‘Ava finished before Ben.’” “Who finished last?” is now
   Ben. Six taps.

No board asks what its card already said (the “Between” card says Cal must be in the middle, so its board does not
ask where Cal finished). Two of the five questions are decided, so tapping Can't tell on every question never
passes. The added clue is a “before” clue, a kind lesson 3's quiz uses.

Example why, for tapping True on clue 1 with Eli first: “In Eli, Fay, Gus, clue 1 is false. It says, ‘Eli did not
finish first.’ Eli finished first.”

**Quiz.** What moved out:

- “Not next to” (“At least one runner finished between …”, “… are not next to each other”). It was in 254 of 1,200
  practice items, and no card names it. It left the whole stop: no lesson, check item, Arcade item or new example
  uses it now (`TAUGHT_TYPES`). The engine still has it, and its own tests still run it.
- Clues that name a spot (first, last). They were in 88 of 1,200 items, and only lesson 4 teaches them. They are gone
  from lesson 3's practice, check, Arcade and new examples (`L3_TYPES`: not first, not last, next to, between, and
  the earlier “before” and “right before”).

The plan for each set:

- Try 1 is the twin of board 1: “where is someone?”, three people, only “not first” and “not last” clues, decided.
- Then, in any order: a Can't-tell trap (four people with not first and not last, or a “between”), a next-to puzzle,
  and a decided “who” question. Every set has a next-to item and a between item.

**Pass.** Three right on the first try with no hint. One must be a Can't tell (tag `cant-tell`). Every set has one.

**Hint.** One try, already checked, with every clue marked: a spot (or a name) the clues cross out, so never the
answer. When every spot still fits, it shows one that could. The hint words stay as they were (a test pins them).

## Lesson 4 · Build the whole line

**See.** “A worked example” keeps its clues (“Cal finished last.” “Ava finished before Ben.”). It now ends with the
marked case: “Check the line Ava, Ben, Cal. ‘Cal finished last’ is true, and ‘Ava finished before Ben’ is true.”
“Test and fix” stays word for word (a test pins it).

**Do.** Two boards.

1. “Test a line” on the card's board. Shown: Ava, Ben, Cal (True, True, Fits). Your turn: Ben, Ava, Cal (True,
   False, Does not fit) and Ava, Cal, Ben (False, True, Does not fit). Six taps.
2. “Build a line.” A twin: clue 1 changed, “Cal finished last” is now “Cal finished first.” The board's first line
   says so in those words. The learner puts a runner in each spot: Cal, Ava, Ben. Three taps. This is the stop's
   first full line, placed by hand before any quiz asks for one.

Example why, for tapping Ben in the second spot: “Ben finished last, not second. The clues say ‘Cal finished first’
and ‘Ava finished before Ben.’”

**Quiz.** Still three lines to build. What changed:

- Try 1 has three people and only the board's kinds of clue (before, and a clue that names a spot). It is in a new
  skin, never a foot race.
- Tries 2 and 3 have four and five people, with any clue a lesson teaches.
- “Not next to” is gone (it was in 77 of 900 items).

**Pass.** The default: three right on the first try with no hint.

**Hint.** One line, checked clue by clue: the names in the order the pool shows them. That line is never the answer.
Every clue is marked true or false, and the note says the line does not fit.

## Lesson 5 · Which clue wasn't needed?

**See.** “An example” keeps its three clues. It now ends with the marked case: “Cover up clue 3. Clues 1 and 2 still
give just one order: Ava, Ben, Cal.”

**Do.** One board, “Cover a clue,” on the card's board. Each row covers one clue. Then it asks which other order fits
the other clues, and whether the covered clue is needed.

| Row | Which other order fits? | Needed? |
|---|---|---|
| Shown: cover clue 3 | No other order | Not needed |
| Your turn: cover clue 1 | Ben, Ava, Cal | Needed |
| Your turn: cover clue 2 | Ava, Cal, Ben | Needed |

Four taps. Example why, for tapping “No other order” with clue 1 covered: “With clue 1 covered, Ben, Ava, Cal (tallest
first) fits too. Every other clue is true there.”

**Quiz.** Still “which clue is not needed?” What changed:

- Try 1 is the card's case in a new skin (never heights): three people and “before” clues only. So the clue that is
  not needed is the end of a chain.
- Tries 2 and 3 use any clue a lesson teaches. “Not next to” is gone.

**Pass.** The default: three right on the first try with no hint.

**Hint.** One clue, covered for you. It shows the second order that fits once a needed clue is covered, with every
clue marked. The note names that clue as needed, so it is never the answer.

## The check, the Arcade and new examples

The check keeps its nine items, two per lesson for lessons 1 to 4 and one for lesson 5. Each item now uses only the
clue kinds of its lesson's quiz. So the check never tests “not next to,” and it never shows a lesson 2 or 3 item with
a clue that names a spot. The Arcade and the new examples after a miss use the same limits. The check is still new on
every seed: 300 different checks in 300 seeds.

## Tests

In `engine/__tests__/lineup.test.ts`, “stop 3: See -> Do -> Quiz (skill-drill handoff)”:

- Each lesson's boards. Every board is 12 taps or fewer. Only right marks pass, and a wrong mark stays wrong.
- See: each board is its card's own board, or a twin that changes one clue and names the change. Each card's marked
  case is checked against its clues.
- Do: every mark on every board is worked out again from the words on the board (70 marks).
- The handoff's sample: Cal, then Ava, then Ben; then Ava or Ben is Can't tell, and the message says no clue
  compares them.
- Every wrong tap has its own words. They are the first mismatch, they quote only sentences on the board, and they
  read at grade 7 or lower.
- Practice, the check, the Arcade and new examples use only taught clue kinds. This runs over 60 seeds, plus 300
  Arcade seeds.
- Try 1 of each lesson is the board's twin in a new skin, and each set keeps to the lesson's rule family.
- Each pass group is in every planned set, and three first-try answers without it do not pass.
- Every hint shows one marked case. Each clue is re-checked, and the case is never the answer's case.

In the same file, “stop 3: review fixes (skill-drill handoff)”:

- A twin board says in its own body what changed.
- A lesson's board questions are not all Can't tell. On the “Next to” and “Between” boards, an added clue decides
  the question. The “Between” board does not ask where Cal finished.
- “Explain more simply” in lessons 2 and 3 uses only the clue kinds those lessons teach.
- Lesson 2's hint never shows the one order that fits (checked on more than 50 such items).

The shared contract (`DRILL_ALL=1 STOP=3 npx vitest run src/engine/__tests__/stops.test.ts`) passes for all five
lessons.

## Shared changes requested (not made)

1. **Lessons open in order.** The stop page lets any lesson open at any time. The handoff's stop-wide rule says to
   place one chain and one non-chain before any mixed order quiz. Today that holds inside each lesson, because each
   lesson's own boards come before its own quiz. It does not hold across lessons: a learner can open lesson 4 first.
   Request: open lesson k + 1 only after lesson k is passed, or let a lesson name the lessons it needs.
2. **A line picture.** No scene draws people standing on a line. The handoff's See shows “Ava, Ben and Cal already
   standing on a line.” Today the card shows the clues and says the line in words. The line itself is drawn only as
   the shown row of the board. Request: a `line` scene, with names in order and an optional mark per clue.
3. **Slots on a board.** The board has no drag, so a spot is a row of name chips. A name can be picked for two spots.
   It is flagged when the learner checks, but not stopped. Request: a slot layout where each name goes in once.
4. **Clue marks on a card.** A key-idea card draws its clue list with no true or false marks. Request: let a `clues`
   scene carry a mark per clue, so a See card can show its marked case as a picture.
5. **The contract's list.** `stops.test.ts` checks boards only for lessons in `DRILLED` (now just `s1.l4`) unless
   `DRILL_ALL=1` is set. Request: add `s3.l1` to `s3.l5`.
6. **Draw the twin note.** `DrillBoard` never shows `DrillStep.twin`, and `drillSpeech` never reads it. A learner on a
   twin board is not told what changed unless the body says it. Stop 3 now puts the change in the body. Request:
   draw `twin` above the board (and read it aloud), so every stop gets it.
7. **Chips with four or more options.** `.play-drill-options--many` is a fixed 4-column grid with
   `overflow-wrap: anywhere`. It suits the one-character counts of s1.l4 (0 to 3). Stop 3 puts words in it. At 320px,
   with the game's own fonts loaded, “First”, “Second”, “Third”, “Fourth” and “Can't tell” break in the middle of
   the word (“Se/co/nd”, “Ca/n't tell”). At 375px, “Second” and “Fourth” still break. Request: let the columns
   wrap by width (for example `repeat(auto-fit, minmax(5.5rem, 1fr))`) and break only between words.

## Review

An independent review of the build above (branch `drill-stop3-v`, from `drill-stop3` at 607f9a4).

### Handoff lines for Stop 3, and where the code meets them

| Handoff line | Where it is met |
|---|---|
| See: “Ava, Ben, and Cal already standing on a line for one taught chain … Order shown left to right: Ava, Ben, Cal.” | Card “Follow the chain” ends “Tallest first, the line is Ava, Ben, Cal.” The board's shown row places Ava, Ben, Cal. (No scene draws a line: shared request 2.) |
| See: “A second marked picture shows ‘before’ with a person allowed between, and ‘right before’ with nobody between.” | Card “One clue, three orders” (Cal between) and card “Right before” (its own clue board, “The order Ava, Ben, Cal fits this clue”). |
| Do: “empty slots, same three names, the taught chain written above. Kid drags Ava, Ben, and Cal into the line.” | `L1_DRILL` row “chain”: one row of name chips per spot. No drag (shared request 3). |
| Do: “one non-chain on the same screen … Kid places the compared pair and taps Can't tell for the one who was not compared.” | `L1_DRILL` row “nochain”: Cal or Ava is Cal; Ava or Ben is Can't tell. |
| Quiz: “a mixed order quiz only after both of those … Do not open the quiz on a full unseen order.” | The runner opens the quiz only after the boards are right. Lesson 1's quiz asks who is first, never a full order. Lesson 4 builds a full line by hand before its quiz. |
| Pass: “placed one taught chain and marked one non-chain (can't tell) on the guided board before any mixed order quiz.” | `L1_DRILL` gates the quiz; `pass` asks for 3 first-try answers with one Can't tell. |
| Stop doing: “Do not ask right-before as if it were the same tap as before.” | `L2_DRILL[0]`: “before” and “right before” are two marks on every row. |
| Sample: “Cal is before Ava. Ava is before Ben. Kid places Cal, then Ava, then Ben … ‘Cal is before Ava.’ … Kid taps Can't tell.” | `L1_DRILL` exactly, asked as a pair (“Who is taller, Ava or Ben?”), since Ava is never first in line. Pinned by the test “Do (the handoff's Stop 3 sample)”. |

`DRILL_ALL=1 STOP=3 npx vitest run src/engine/__tests__/stops.test.ts` passes: every lesson has a board.

### Independent re-solve

A Python script, apart from the engine and from `lineup.test.ts`, read every board as data. It read each clue back
from its English words with its own parser and tried every order of the names. It worked out all 70 marks again,
and all 70 agree. It also split every wrong-tap message (79 of them) into sentences. It checked each claim against
the board (“In Ava, Cal, Ben, clue 1 is false”, “Eli finished first”, “Cal finished between Ava and Ben”, “The clue …
is false whenever …”, “… could have finished second, as in …”, “Without clue 1, … fits too”). Every claim is true.
Every board has 3 to 7 taps.

### Problems found and fixed

1. **Medium. The twin note never reaches the learner.** `DrillBoard` does not draw `DrillStep.twin`, and
   `drillSpeech` does not read it. Lesson 1's board said only “Now one clue is new.” Lesson 4's second board said
   “Now clue 1 names a different spot,” without the new words. Fix: `changedClue()` in `stop3.ts` works out the
   change from the two boards. It puts the change in the body and in `twin`. Evidence: the test “a twin board says in
   its own words what changed”. Shared request 6.
2. **Medium. A board asked what its card already said.** The “Between” card ends “With three runners, Cal must be
   in the middle.” Its board then asked “In what place did Cal finish?” (Second). The handoff says not to ask the
   card's answer again on the board. Fix: that question is gone. A row adds the clue “Ava finished before Ben,” then
   asks “Who finished last?” (Ben).
3. **Medium. Can't tell was the answer to almost every board question in lesson 3.** Four of five were Can't tell,
   and the fifth was the card's own answer (problem 2). A learner who tapped Can't tell everywhere got nearly every
   question right. Fix: on the “Next to” board, “Who finished second?” was already shown by the card's two orders.
   It became a row that adds “Cal finished before Ben” and asks where Cal finished (First). Lesson 3 now has three
   Can't tell questions and two decided ones. Each decided one comes from one added clue, as the quiz's decided items
   do. Evidence: the test “a lesson's board questions are not all Can't tell …”, and the re-solve above.
4. **Medium. Lesson 2's hint gave the answer away and said something false.** The hint said “Now try other orders
   that fit.” Its case was the first order that fits. Over 1,500 seeds, only one order fits in 68% of the “must”
   items and 43% of the “can't” items. There the hint's case was the answer's case, and no other order fit. For the
   trap item, the case showed “right before” true, the very reading the trap catches. Fix: must shows the nearest
   order that makes the sentence false (it breaks a clue). Can't shows the nearest order that makes it true (it
   breaks a clue). The trap shows the order with someone in between. Every clue and the sentence are marked. The
   words no longer say that other orders fit. Evidence: the hint test (rewritten for this rule), and the test
   “lesson 2's hint never shows the one order that fits”.
5. **Low. “Explain more simply” for a decided next-to item used a “first” clue.** Lesson 3 no longer teaches clues
   that name a spot (the builder moved them to lesson 4). Fix: `spotSimpler` now uses “next to” plus “not first”, so
   the third name must be last. Evidence: the test “‘Explain more simply’ in lessons 2 and 3 uses only the clue kinds
   those lessons teach”.
6. **Low. “Every clue is true” on a board with one clue.** The must, might and can't messages on lesson 2's boards
   said “every clue is true” with one clue. Fix: they say “the clue is true” when there is one clue.

### Checked and left as is

- Every wrong-tap message names its own mismatch and quotes only sentences on its board. The first mismatch is
  named in reading order: clues, then keep or cross out, then the question.
- No board shows a “which …?” button for the card's own answer. Each board is its card's board or a named twin.
  Every board is phone-sized (3 to 7 taps).
- Practice, check, Arcade and new examples: over 2,000 seeds there is no “not next to” clue, no error and no slow set.
  The check covers all five lessons and has a conflict item on every seed. It is different on all 300 of 300 seeds.
- Pass groups: Can't tell (lessons 1 and 3) and the before trap (lesson 2) are in every planned set.
- Hints: every practice item has a `hintCase` with every clue marked. It is not the answer's case.
- Words: no bare “both”, “that row” or “the opposite”; curly quotes; reading level within the contract.
- Lesson 1's twin also moves “Ava is taller than Ben” from clue 1 to clue 2, because the handoff's sample has that
  order. The change is still one clue, and the body names it.
- A placing message such as “Ben finished last, not second” says where Ben goes. It is true, and it is the plain fix
  for that tap, so it stays.

### Browser check

A production build of this branch, served on port 5303, was opened with Playwright at 320px, then at 375px. The
save had stops 1 and 2 passed. Each lesson was opened from Journey, then Line Up, then “Lesson k · title”. The cards
were paged with Next to “Now you do it”. On each of the nine boards, the page never scrolled sideways (`scrollWidth`
320 = `clientWidth` 320). There was one radio per option of every mark to tap. One wrong tap and “Check my marks”
showed that option's own message, with one chip flagged. Fixing it showed the board's done words. “Next board” or
“Start the puzzles” led on, and Try 1 opened with a hint that draws its case. There were no console errors. (With
the dev server, only the font files failed, with 403, because `node_modules` is a link outside the worktree. The
production build loads them.)

One problem cannot be fixed in this stop's files: chips on marks with four or more options break in the middle of a
word. See shared request 7.

### Tests

- `npx tsc --noEmit -p .`: clean.
- `DRILL_ALL=1 STOP=3 npx vitest run src/engine/__tests__/stops.test.ts`: 8 passed.
- `npx vitest run src/engine/__tests__/lineup.test.ts`: 61 passed (4 new review tests).
- `npx vitest run`: 17 files, 495 tests passed.
