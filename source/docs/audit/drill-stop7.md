# Drill worksheet: Stop 7 (Ways to Think)

Source: the owner's handoff “Logic Quest: add missing reasoning methods” (3 Oct 2026). The owner chose a real Stop 7,
one lesson per method, each See → Do → Quiz, with a question in every quiz pack that shows the method failing
(tag `can-fail`, which the pass rule asks for: `pass: { firstTry: 3, include: [CAN_FAIL] }`). Stop 7 was built
under the house rules from the start, so this sheet records what each lesson does rather than repairs.

Each lesson is a module in `src/content/stop7/` with its puzzles in `src/engine/puzzles/`, and its own test file in
`src/engine/__tests__/` that works every answer and board mark out again from the model. The contract test
(`stops.test.ts`) checks the cards, boards, quiz packs, reading level and the stop check like every other stop.

## s7.l1 · Pattern guesses (induction) — `patterns`

**Model.** A bag you can count (draws go back): Must when every one fits, Likely when more fit than not but not
every one, Unlikely when some fit but fewer, Can’t when none fit. Never an exact half. A bag you can’t see: only the
draws you saw are sure; the next draw is a good guess, never a must, and nothing is “due”.

**See.** Seeing a pattern · Likely is not must · A new case can break it · A streak does not make it due · Example:
mark each sentence (a bag of 7 cards with four sentences marked).

**Do.** “Mark the colors”: the same bag, the shape sentences shown, five color sentences to mark (Likely, Unlikely,
Can’t, Must, and Unlikely again after a streak of reds). Twin “One count changed”: the squares are gone; circle is
now Must and square Can’t.

**Quiz.** `pattern-chance` (which word or sentence fits the next draw), `pattern-sure` (what you know for sure after a
streak from a hidden bag), `pattern-due` (conflict: “blue is due!”), `pattern-break` (can-fail: a streak, then a new
color: “A new case can break a pattern.”).

## s7.l2 · The best explanation (abduction) — `explanations`

**Model.** Two or three clues and three ideas. Each idea fits each clue or not, and needs 0–2 extra things. Best =
fits every clue; among those, the fewest extra things. A check is useful when one idea fits it and the other does
not. A new clue can rule the best idea out; then the best is worked out again.

**See.** Clues need a reason · Fit every clue · Keep it simple · Example: the wet grass (a grid of ideas × clues) ·
A new clue can change it (works one check: the grass again can’t tell rain and truck apart; the weather report can).

**Do.** “Mark a new clue”: the wet-grass grid with no best guess named; the learner marks the “Roof dry” column.
“Pick the best guess”: best guess from the first two clues (Rain: the truck fits too but needs 2 extra things), which
check could rule one out (the roof), which ideas fit all three clues, and the best guess now (Truck).

**Quiz.** `explain-best`, `explain-test` (which check could rule one out), `explain-new-clue` (conflict), and
`explain-revise` (can-fail: “Was that first best guess a proof?” → a best guess to test). Check time 120 s, and
150 s for the proof story, which shows both best guesses.

## s7.l3 · Cause or just together? — `causes`

**Model.** A table of tests or days. In these puzzles a cause works every time, unless the table names something
that stops it. A thing is the cause when the effect follows it every time and a fair test changes only it; it is not
the cause when the effect does not follow it on a day with nothing blocking; you can’t tell yet when it never
changes alone. Common cause: two things rise together because a third thing causes both.

**See.** What a cause does · Change one thing at a time · Example: find the cause (the switch and the clock) ·
Together is not enough (hot days, ice cream and sunburns) · Look for a third thing (the closed shop).

**Do.** “Check each thing”: the switch shown; the learner checks the clock (not the cause). “Check two things that go
together”: the heat and the ice cream on the three hot-day records (can’t tell yet).

**Quiz.** `cause-which`, `cause-cant-tell`, `cause-together` (conflict: together is not enough), `cause-third`
(can-fail: “Do the flags make the bread sell out?” → “No. Market days may cause both.”).

## s7.l4 · Fair choices (kid-safe) — `fairness`

**Model.** A story's facts (a name tag, a promise, a turn, a broken thing, extra change) and three choices. Each
choice gets three checks: honest; fair to the person (or keeps the promise); hurts no one (no teasing, no blame, no
one loses what is theirs). The fair choice passes all three; exactly one does. A good reason names the fact that
decides it. A wish (“Pia really wants to keep the extra coin”) changes no check.

**See.** Fair choices in a story · Three checks · Example: three choices for Leo (Mia's teddy bear, a grid of choices
× checks) · Wanting it does not change the facts · Give a reason from the story.

**Do.** “Check three choices”: Leo's story with two new choices (say it is yours; give it back but blame Sam) and the
fair one; nine boxes to mark.

**Quiz.** `fair-choice`, `fair-reason`, `fair-pressure` (can-fail and conflict: a wish pushes against the facts).
Stories stay kid-sized: found things with a name tag, a borrowed thing and a promise, a turn, a broken cup, extra
change; fantasy versions with dragons, elves and wizards. No grown-up ethics words.

## s7.l5 · Gut feelings (intuition) — `gutfeel`

**Model.** A jar of big and small things. The big ones catch the eye; every one has the same chance, so the count
decides which is more likely. Some jars agree with the gut, some do not, so the lesson never says the gut is always
wrong.

**See.** A fast guess · Check it · Check Eli's gut feeling (big red sweets, but more blue) · Sometimes the gut is
right · Strong is not sure.

**Do.** “Check a gut feeling”: Eli's row shown; the learner marks Gus's (a guess to check; right this time). Twin
“Check it yourself”: five small blue sweets gone; the learner counts (3 red, 5 blue) and finds the gut wrong.

**Quiz.** `gut-check` (what to do with a gut feeling), `gut-count` (conflict: count, don't trust the look),
`gut-agree` (the count agrees: was the feeling a proof before? no, a good start), `gut-proof` (can-fail and
conflict: a strong feeling is still a guess). The long items get 120 s in a check.

## The stop

- **Check:** 10 items, two from each lesson, each pair with at least one conflict item (`stop7.ts`).
- **Arcade:** one item from any lesson. **New examples:** each lesson's own, or one item with the same skill.
- **Journey:** Stop 7 opens after Stop 6. The stops still to come moved down one (All, Some, None is Stop 8); the
  side track is Stops 12 and 13, with Trickster Market and Chance Dock pointing there.
- **Plain skill names** for all 19 Stop 7 skills are in `SKILL_NAMES` (`src/game/progressStats.ts`).

## Review

Built by one builder per lesson, each checked by an independent reviewer and fixed. Then a four-lens review of the
whole stop (answers, teaching, integration, the owner's pack), with each finding checked by a skeptic: 18 confirmed
and fixed, 9 refuted. Fixed, among others: “Likely” now excludes the all-fit case everywhere; one rule for a cause,
including what can stop it; the best-explanation lesson teaches “which check tells two ideas apart” before the quiz
asks it, and its boards make the learner use the fewest extra things; the gut-feelings board has the learner find a
gut feeling that the count proves wrong; longer check times for long items; the lesson header keeps long words whole
at 320px; the My Progress strip has 13 dots. In a browser, all 37 lessons of Stops 1–7 pass at 320, 375 and 430px:
tapping only Next never passes, every board is marked (one wrong mark first, named in plain words), every quiz
completes, with no sideways scroll and no errors.
