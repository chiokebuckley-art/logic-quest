# Hidden distinctions audit: Stops 1 to 7

This is the audit the owner's brief asks for in section 12 ("Required audit output"). It covers every lesson in Stops 1
to 7 of Logic Quest. For each one it asks what a learner must already keep apart, and which steps they must already be able to run, for an
instruction to make sense. Then it checks whether the program teaches that first.

How to read it:

- A reviewer checked every finding. Each finding keeps its reviewer note. Where a reviewer corrected a fact, the
  finding's fields already carry the correction. Where a reviewer prefers a cheaper or different fix, follow the
  reviewer note.
- The reviewers' own extra findings are listed as findings too, with ids such as `s3-rev-1`.
- Words the learner sees are quoted exactly as the program shows them, check marks and crosses included. Words this
  report proposes for kids are plain words, with no symbols.
- File and line references are under each finding's Evidence. All paths are inside `logic-quest/`.

## Status (v0.9.0)

Every P0 and P1 finding below is fixed in v0.9.0, with the reusable pieces (a contrast card and board, because and
compare rows, the test-world line, the fading scaffold, mix-up patterns, "I'm confused"). One builder per stop made
the fixes and a reviewer per stop recomputed every truth value against the puzzle engine and ran the mix-up patterns
on the sample wrong picks. Two P1s are partly done: `s1-l7-rule-vs-own-sign` (the content is in; the rule banner is
not yet split into Part 1 and Part 2 on the case board) and `s2-l5-kept-vs-proven` (the teaching is in; the extra
mastery items are not built). The P2 and P3 findings stay open; the "How to apply" plans and the shared needs the
builders listed (a per-mark step index for the method strip, a row-scoped mix-up pattern, pictures on contrast
panels, a two-part grid layout, a "can't happen" row state, keeping a question's scene visible over a thinking
board) are the next round.

## Summary

### Counts by priority

P0 means the learner is likely to come away with a fundamentally wrong idea. P1 is a major comprehension barrier. P2
is unnecessary load. P3 is clarity and polish.

| Stop | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| Stop 1, True or False? | 0 | 3 | 10 | 9 | 22 |
| Stop 2, NOT, AND, OR | 0 | 3 | 6 | 5 | 14 |
| Stop 3, Line Up | 0 | 3 | 8 | 7 | 18 |
| Stop 4, Grid Detective | 0 | 2 | 5 | 9 | 16 |
| Stop 5, Knights & Knaves | 1 | 6 | 9 | 2 | 18 |
| Stop 6, If… then | 0 | 2 | 5 | 5 | 12 |
| Stop 7, Ways to Think | 1 | 4 | 6 | 3 | 14 |
| **All stops** | **2** | **23** | **49** | **40** | **114** |

The two P0 findings:

- **s5-kind-vs-words-truth.** In Knights and Knaves, the learner is never taught that a speaker's kind says what the
  words *must be*, while the world decides what the words *are*. With the two merged, no tested case can ever crash,
  so the crash test that Lessons 3 to 5 rest on has nothing to stand on.
- **s7-l3-works-every-time-vs-only-cause.** In Cause or just together?, the program rules out a cause with the reason
  "A cause works every time" on a row where that thing did not even happen. That is the turned-around move Stop 6
  taught learners to reject. The real reason (in these puzzles, only one thing makes the effect) is never stated.

### Distinctions that recur across stops, and the reusable fix for each

1. **A pretend vs a fact.** The pretend can be a test world, a guess, a covered clue, a "one clue alone" row, or an
   "always true here" premise. Found in s1.l4 to l7, s3.l3, s3.l5, s4.l1, s4.l5, s5.l1, s5.l3, s5.l4, s6.l2, s6.l3
   and s7.l2. Fix: put a test-world banner on every board and scene that holds a pretend, so the assumption stays on
   screen. Teach the boundary with a contrast card where the fact stays and the pretend changes. Teach the rule that
   a crash rules out the test, never the fact.
2. **A rule or a need vs the truth worked out in one case.** Stop 1 has the rule vs the stamp. Stop 5 has the
   speaker's kind vs the truth of the words, "would be" vs "must be", and Keep vs True. Stop 2 has the machine's mark
   vs whether the rule fits. Stop 6 has "this case breaks the rule" vs "the rule is false". Found in s1.l4 to l7,
   s2.l5, s5.l1, s5.l2, s5.l5 and s6.l2 to l3. Fix: work out the truth first, in compare rows (what it says, what is
   so in this case, do they fit). Then show the need on its own line (`DrillRow.needs`), always worded as "must be".
   New misconception kinds catch it: `fit-rule`, `words-from-kind`, `need-as-truth`, `keep-is-true`, `copied-mark`.
3. **True in one case, or in the cases I tried, vs true in every case that counts.** Found in s1.l3 (one row of
   cards), s2.l4 (these six cards), s2.l5 (kept vs proved), s3.l2 (orders tried, and orders that fit), s4.l2 (two
   ways fit), s6.l2 to l3 (for sure) and s7.l1 (draws vs bag). Fix: a read-across mark on the board (true in all,
   some or none of the cases left). Teach a two-search method: find a case that makes it false, then one that makes
   it true. Bridge back to s1.l2 "Try every way", which already teaches it.
4. **Can't tell vs false, can't be true, or no truth value at all.** Found in s1.l1, s1.l2, s3.l2, s4.l2, s6.l2 and
   s7.l2. Fix: one bridge line in each stop that maps its own words onto Stop 1's True, False and Can't tell. In
   Stop 3 that is Must, Can't and Might. In Stop 6 it is for sure, and nothing follows. Every lesson that has a
   can't-tell answer should need one right on the first try to pass (`pass.include` with the tag `cant-tell`).
5. **A part vs the whole.** Examples: a feature on one card, the inside of brackets, how far a NOT reaches, one part
   of an "and", a box vs a kid in a grid, and a card counted once. Found in s1.l2, s1.l3, s2.l3, s2.l4, s4.l2 and
   s5.l5. Fix: give each part its own mark, then a mark for the whole. Shade or underline what a word covers.
6. **One way vs both ways.** "If" vs "if and only if"; works every time vs the only cause; a grid link vs an if-then
   rule; the closed world of a puzzle. Found in s4.l4, s6.l1 to l2, s7.l2 and s7.l3. Fix: state the puzzle's
   closed-world rule in words where a lesson relies on it. Bridge to Stop 6 ("THEN without IF is fine").
7. **A truth value shown without the comparison behind it.** Found in Stops 3, 4, 5, 6 and 7. Fix: `BecauseRows`
   under given marks and `CompareRows` under marks to tap, on every board layout (today only the case board shows
   them), each with labels the stop can set.
8. **One word, two meanings.** "can't" (Stop 3), "fair" (Stop 7), "fits" (Stops 2 and 7), "keep" (Stop 5), "given"
   (Stop 5), "opposite" (Stop 1), a check mark that means "yes", "kept", "fits" or "true" (Stops 2, 4, 6 and 7), and
   "box" (Stop 1). Fix: one word per meaning, defined on the card where it first appears.

Three build gaps recur too. Misconception diagnosis and the method strip work only on case boards. The scaffold never
comes back after a wrong quiz answer. And pass rules rarely require a right answer on the trap a lesson exists for.

### Build work that comes first

The pieces made for Treasure signs carry sign words: "Test world", "says", "Do the words fit the test?", "The words
fit the test: True". The closing line of the "I'm confused" panel talks about signs too. `diagnose()` reads only case
boards, and the step-by-step reveal works only for case scenes. The contract test requires a contrast card and a board
for every declared distinction. So declaring any new distinction in Stops 2 to 7 forces label props on these pieces
first (finding `s2-rev-2`). The "How to apply" section at the end starts with that list.

## All findings

| Id | Lesson | Distinction | Priority |
|---|---|---|---|
| s1-l7-rule-vs-own-sign | s1.l7 | What the rule demands of the real chest vs the stamp a sign's words give | P1 |
| s1-l4-l7-rule-vs-stamp | s1.l4 to s1.l7 | The rule (checked last) vs a sign's stamp (from its words) | P1 |
| s1-rev-1 | s1.l4, s1.l5 | Own-sign mix-up in either direction (the diagnosis fires both ways) | P1 |
| s1-l7-count-vs-which | s1.l7 | How many signs are true vs which sign is true | P2 |
| s1-l1-checkable-vs-has-answer | s1.l1 | Checkable by us now vs has a right answer | P2 |
| s1-l1-opinion-vs-fact | s1.l1 | Opinion (nobody is wrong) vs disputed fact (someone is wrong) | P2 |
| s1-l3-here-vs-every-row | s1.l3 | Disagrees on this row vs disagrees on every row | P2 |
| s1-l2-speaker-knows | s1.l2 | Someone says it vs it is true; what the speaker knows vs what you can tell | P2 |
| s1-l3-not-scope | s1.l3 | The NOT of the whole statement vs a "not" inside it | P2 |
| s1-l3-as-many-order | s1.l3 | Which group has "at least as many" | P2 |
| s1-l4-test-vs-real | s1.l4 to s1.l7 | A test (assumption) vs the real place (conclusion) | P2 |
| s1-l4-l7-scaffold-not-returned | s1.l4 to s1.l7 | A stamp error vs a rule-check error (scaffold after a miss) | P2 |
| s1-l1-l3-no-mixup-tools | s1.l1 to s1.l3 | Mix-up tools exist only on sign boards | P2 |
| s1-l2-same-card | s1.l2 | One card with every named feature vs features on different cards | P3 |
| s1-l1-could-be-true | s1.l1 | The sentence makes a claim vs the thing it mentions could be so | P3 |
| s1-l3-not-vs-opposite-words | s1.l3 | The NOT vs the "opposite"; a sentence vs its truth value | P3 |
| s1-l1-grid-blank-vs-cross | s1.l1 | False vs neither true nor false (a cross vs a blank box) | P3 |
| s1-l2-big-card | s1.l2 | The card's size vs the size of the shape on it | P3 |
| s1-l4-l7-steps-words | s1.l4 to s1.l7 | "Box" (engine word) vs the chests on screen | P3 |
| s1-rev-2 | s1.l2 | "There is a" (one or more) vs exactly one | P3 |
| s1-rev-3 | s1.l2 | What you can tell vs the sentence's truth | P3 |
| s1-rev-4 | s1.l1 | Find the one that is vs find the one that is not | P3 |
| s2-l5-mark-vs-fits | s2.l5 | The machine's mark on a card vs whether the tested rule fits it | P1 |
| s2-l5-kept-vs-proven | s2.l5 | A rule kept (still possible) vs proved | P1 |
| s2-l4-inside-vs-whole | s2.l4 | Fits the inside of the brackets vs fits the whole rule | P1 |
| s2-l2-list-and-vs-rule-and | s2.l2 | "and" joining two groups vs AND joining two parts of one card | P2 |
| s2-l4-same-meaning-every-kind | s2.l4 | Agree on these cards vs agree on every kind of card | P2 |
| s2-boards-old-marks-no-diagnosis | s2.l1 to s2.l5 | A card's features vs its mark for one rule | P2 |
| s2-l5-three-rules-load | s2.l5 | Matches the cards I checked vs matches every card; one rule vs every choice | P2 |
| s2-rev-1 | s2.l5 | Says yes to every yes card vs matches every mark | P2 |
| s2-rev-2 | Stops 2 to 7 | The reusable pieces vs their sign-only labels (build prerequisite) | P2 |
| s2-l1-feature-vs-fit | s2.l1 | The card has the feature vs the card fits the rule | P3 |
| s2-l3-or-count-once | s2.l3 | Cards that fit vs part-checks that said yes | P3 |
| s2-l4-not-scope | s2.l4 | A NOT on one word vs a NOT on a bracket | P3 |
| s2-group-size-claims | s2.l2, s2.l3 | "Smaller" vs "never bigger"; "either part" vs "each part" | P3 |
| s2-l4-second-not-flip-missing | s2.l4 | The feature is true vs the NOT part is true | P3 |
| s3-l3-try-vs-one-line | s3.l3 | Trying a spot (others can move) vs one line with that spot | P1 |
| s3-l1-chain-vs-fork | s3.l1 | Linked by a chain vs not linked (a fork) | P1 |
| s3-l4-no-spot-clue-strategy | s3.l4 | A spot a clue gives vs a spot the clues prove together | P1 |
| s3-l2-cant-be-true-vs-cant-tell | s3.l2 | Can't tell vs can't be true | P2 |
| s3-l2-all-orders-vs-orders-that-fit | s3.l2 | Every order vs every order that fits the clues | P2 |
| s3-l2-find-every-order-that-fits | s3.l2 | True in the orders I tried vs true in every order that fits | P2 |
| s3-l5-covered-vs-false | s3.l5 (also s3.l1, s3.l3) | A covered clue vs a false clue | P2 |
| s3-l3-no-one-between-vs-somewhere-between | s3.l3 | "No one finished between A and B" vs "C finished somewhere between A and B" | P2 |
| s3-truth-shown-without-reason | s3.l2 to s3.l4 | A clue's words vs where people stand (the comparison) | P2 |
| s3-l5-implied-by-one-clue | s3.l5 | Proved by a chain vs proved by one stronger clue | P2 |
| s3-rev-1 | s3.l2, s3.l3 | "Right before" (says who is ahead) vs "next to" | P2 |
| s3-l2-clue-vs-sentence | s3.l2 | A clue (given as true) vs the sentence (being tested) | P3 |
| s3-l4-puts-in-spot-vs-rules-out-spot | s3.l4 | A clue that puts someone in a spot vs one that rules a spot out | P3 |
| s3-l1-cross-out-direction | s3.l1 | Asked for the first end vs the last end (which one to cross out) | P3 |
| s3-l3-somewhere-between-vs-middle | s3.l3 | "Somewhere between" vs "right between" | P3 |
| s3-l1-skin-words-before-taught | s3.l1 | The skin's words vs the one idea under them | P3 |
| s3-l4-worked-example-two-spots-left | s3.l4 | "Before" vs "right before" (when only two spots are left) | P3 |
| s3-rev-2 | s3.l5 | A clue that is not needed vs a clue that is not true | P3 |
| s4-l2-cross-in-line-vs-cross-in-row | s4.l2 (also s4.l4, s4.l5) | A cross in this column vs a cross elsewhere in the kid's row | P1 |
| s4-l4-two-part-back-and-forth | s4.l4 | Using a link once vs carrying marks back and forth | P1 |
| s4-truth-icons-vs-grid-marks | s4.l1 to s4.l5 | The truth of a sentence about a box vs the mark in the box | P2 |
| s4-l3-full-grid-method-and-check | s4.l3 | A filled grid vs a right grid | P2 |
| s4-l5-only-these-clues-off-screen | s4.l5 | The clues you may use vs every clue on the list | P2 |
| s4-pass-without-cant-tell | s4.l2, s4.l4, s4.l5 | Decided vs Can't tell yet, each side tested | P2 |
| s4-rev-1 | s4.l2 | A cross in this kid's row vs a cross in another kid's row (row questions) | P2 |
| s4-l1-box-name-notation | s4.l1 | A box (a place) vs the mark in it vs a statement about it | P3 |
| s4-board-rows-fresh-vs-added-world | s4.l1, s4.l5 | A row that starts fresh vs a row that adds to the one above | P3 |
| s4-l2-cant-tell-means-two-ways-fit | s4.l2 | Two empty boxes in a line vs two ways fit every mark | P3 |
| s4-l4-link-carries-x-not-link-does-not | s4.l4 | A link copies both marks vs a "not" link works only from a check mark | P3 |
| s4-l4-links-both-ways-vs-if-then | s4.l4 (and s6.l2) | A link in a one-each grid vs an if-then rule | P3 |
| s4-l5-could-vs-has | s4.l5 | Could (still possible) vs has (a check mark) | P3 |
| s4-l4-link-forms-in-other-skins | s4.l4 | A name vs a description of whoever holds a value | P3 |
| s4-rev-2 | s4.l5 | "Yes, you can tell" vs knowing who | P3 |
| s4-rev-3 | s4.l4 | The asked part on screen vs held in memory | P3 |
| s5-kind-vs-words-truth | s5.l1 (all of Stop 5) | The speaker's kind (what the words must be) vs whether the words are true | P0 |
| s5-l2-would-be-vs-must-be | s5.l2 | What the words would be vs what this kind needs them to be | P1 |
| s5-given-kind-vs-fact | s5.l1 | A fact the puzzle tells you vs a case you are testing | P1 |
| s5-inside-guess-vs-known | s5.l3, s5.l4 | What follows inside a guess vs what you know | P1 |
| s5-truth-shown-without-reason | Stop 5 boards and cards | A truth value vs the comparison that produced it | P1 |
| s5-follow-step-hidden | s5.l3 to s5.l5 | Following a guess (must be) vs checking a case (worked out) | P1 |
| s5-rev-1 | s5.l1 | What a case fixes (every unknown) vs what follows from a kind | P1 |
| s5-speaker-vs-subject | s5.l1 (and s5.l2) | Who speaks vs who the words are about | P2 |
| s5-guess-vs-case | s5.l3, s5.l4 | A guess (one islander) vs a case (everyone) | P2 |
| s5-l5-whole-sentence-vs-part | s5.l5 | The whole sentence vs one part of it | P2 |
| s5-method-steps-no-scaffold | s5.l3, s5.l4 | A guess that crashes vs a guess that holds; the method vs the answer | P2 |
| s5-l3-answer-about-whom | s5.l3 | The supposed islander vs the islander asked about | P2 |
| s5-l5-keep-vs-true | s5.l5 | The words are true vs the case can happen | P2 |
| s5-l5-true-vs-exactly | s5.l5 | A true choice vs the choice that says exactly what is left | P2 |
| s5-l4-count-words | s5.l4 | "Us" and "we" (the speaker too) vs the others; exactly vs at least | P2 |
| s5-rev-2 | s5.l3 | One speaker fits vs the whole case holds | P2 |
| s5-one-idea-many-words | all of Stop 5 | One idea (does this case fit the rule?) in one pair of words | P3 |
| s5-rev-3 | s5.l1 to s5.l3 | Assuming something to test it vs someone saying it | P3 |
| s6-l2-breakable-vs-always-kept | s6.l1 to s6.l5 | A case that breaks the rule vs a case that can't happen here | P1 |
| s6-pq-letters-untaught | s6.l1 to s6.l4 | A letter standing for a sentence vs that sentence's truth | P1 |
| s6-l2-true-in-a-case-vs-for-sure | s6.l2, s6.l3 | True in one case vs true for sure | P2 |
| s6-l4-rule-if-vs-sentence-if | s6.l4 | The rule's IF part vs this sentence's own IF part | P2 |
| s6-l3-your-answer-true-in-impossible-case | s6.l3 | True in one case vs a right answer; broken here vs false | P2 |
| s6-quiz-no-scaffold | s6.l2 to s6.l5 | Doing the method with the cases on screen vs from memory | P2 |
| s6-rev-1 | s6.l1 to s6.l3 | Passing the lesson vs getting its trap right | P2 |
| s6-l1-tick-means-kept-not-yes | s6.l1 (and s6.l2, s6.l4) | A check mark meaning "yes, this pair" vs "this kid keeps the rule" | P3 |
| s6-l4-not-word-vs-not-meaning | s6.l4 | The word "not" vs the NOT of a part | P3 |
| s6-vocab-kept-true-happened | all of Stop 6 | Kept in one case vs the rule is true; happened vs true | P3 |
| s6-rev-2 | s6.l2 | Marking the rule's own boxes before turning it around | P3 |
| s6-rev-3 | s6.l2, s6.l3 | Ask the same questions vs copy the same marks | P3 |
| s7-l3-works-every-time-vs-only-cause | s7.l3 | It works every time vs nothing else makes the effect | P0 |
| s7-l3-tests-vs-records | s7.l3 | Tests someone set up vs records someone wrote down | P1 |
| s7-l2-fits-vs-explains | s7.l2 | The idea's story leaves the clue possible vs the idea explains the clue | P1 |
| s7-rev-1 | s7.l2 | A check that can rule an idea out vs one that cannot | P1 |
| s7-rev-2 | s7.l2, s7.l3 | The idea (or cause) is the whole story vs other things may also have happened | P1 |
| s7-l3-fair-test-pair | s7.l3 | A fair test exists for a thing vs the thing is the cause | P2 |
| s7-l2-check-before-taught | s7.l2 | A clue already found vs a check you could make | P2 |
| s7-l1-draws-vs-bag | s7.l1 | What was drawn vs what is in the bag | P2 |
| s7-l4-fair-check-vs-fair-choice | s7.l4 | One check (gets what is owed) vs the fair choice (all three checks) | P2 |
| s7-l4-in-story-vs-decides | s7.l4 | A line in the story vs the fact that decides it | P2 |
| s7-l2-two-clue-sets-one-board | s7.l2 | The best guess for clues 1 and 2 vs for clues 1 to 3 | P2 |
| s7-l2-cant-tell-vs-best-guess | s7.l2 | Can you be sure? vs which idea is best so far? | P3 |
| s7-fit-and-check-mark-meanings | s7.l1 to s7.l4 | The three senses of "fit" and of a check mark | P3 |
| s7-rev-3 | s7.l4 | "Honest?" vs "Fair to Gran?" (two checks that never differ) | P3 |

## Stop 1: True or False?

### s1-l7-rule-vs-own-sign (P1)

**Location.** s1.l7 The owner's sign: card 3 "Remember: two different things", the Do board "Mark a case" (the Gold
case), the twin board, and the own-true diagnosis and first "I'm confused" question on every L7 board.

**What the learner sees.** Card 1: "Here is a new rule: “The sign on the chest with the treasure is true. The other
signs are false.”" Card 3, the same text L6 gets: "Where the treasure is and whether a sign is true are two different
things." / "The chest with the treasure can have a false sign. Only the words on the sign decide, checked against the
test." On the board, under the rule banner "The sign on the chest with the treasure is true. The other signs are
false.", the test-world line says: "For this test only. Where the treasure is does not say if a sign is true." A wrong
own-sign stamp gets: "You may be treating “the treasure is in this chest” and “this chest’s sign is true” as the same
thing… A chest can have the treasure while its sign is false."

**What the program assumes the learner has been taught.** That the learner keeps three things apart: (1) where we
pretend the treasure is (the test); (2) what each sign's words give in that test (the stamp); (3) what the rule demands
of the real chest, which is a condition the test must pass. It also assumes the learner sees that "the chest with the
treasure" means the real chest in the rule but the pretend chest in the reminder.

**Likely mix-up.** Lessons 4 to 6 teach that where the treasure is and whether its sign is true are independent. L7's
rule ties them: the real treasure chest's sign IS true. So the learner either (a) uses the rule to stamp ("we pretend
it's in Gold, the rule says Gold's sign is true, so True"), which is the original chest-vs-sign mix-up, now apparently
backed by the rule; or (b) sees two lines on screen that say the opposite of each other ("The sign on the chest with
the treasure is true" vs "The chest with the treasure can have a false sign") and decides the rule is not always right,
or that the lesson contradicts itself. In case (a), the own-true remediation repeats the line that seems to contradict
the rule, so it does not help.

**Hidden distinction.** What the rule demands of the real treasure chest (checked after stamping, as pass or fail) vs
what a sign's words give in this test world (the stamp). Also "the chest with the treasure" in the rule (the real one)
vs "the chest we pretend has it" (the test).

**Hidden steps.** 1) Pick a chest (the test). 2) Stamp its own sign from its words only, without the rule. 3) Check
rule part 1 on the stamps: is that own stamp True? 4) If it is False, the test breaks the rule. 5) Reject the chest, so
the treasure is not really there.

**Missing prerequisite.** Nowhere does the program say how L7's rule fits the distinction: the rule does not make a
sign true; it is a test the stamps must pass. The reminder card in `signLesson` has wording only for L5
(`p.rule === 'none'`) and otherwise uses the shared text. L7's "Check two things" card says "First, is that chest’s own
sign true?" without "find out from its words, not from the rule".

**Recommended teaching intervention.** Give L7 its own reminder text in `signLesson` (`p.rule === 'owner'`): "The rule
is about the real treasure chest. It does not make a sign true. First stamp each sign from its words. Then check the
rule: is the pretend chest's own stamp True?" Add an owner contrast card (Scene `contrast`, two panels, same test world
"treasure in Gold"). Panel 1: the Gold sign "The treasure is in this chest." is True, so rule part 1 passes. Panel 2:
the Gold sign "The treasure is in the Bronze chest." is False, so part 1 fails and Gold is rejected. Ask: "Did the rule
change the stamp? No. The words decide the stamp. The rule decides keep or reject." Put a two-case board right after
it (`afterCard`, in the `signDistinctionDrill` pattern). Declare the shared `rule-vs-stamp` distinction on L7 (see
s1-l4-l7-rule-vs-stamp). Make `signMisconceptions` rule-aware, so L7's own-true text drops "A chest can have the
treasure while its sign is false" and says "In a test, stamp from the words. The rule is checked after." Add an
owner-specific "I'm confused" question.

**Recommended UI change.** For the owner rule, change the test-world note to "For this test only. Stamp each sign from
its words. The rule is checked after." Split the rule banner into two labelled parts ("Part 1: the treasure chest's
own sign is true" / "Part 2: the other two are false"), each with a pass or fail mark once the stamps are in. The two
lines that seem to contradict each other must never be on screen at the same time.

**Diagnostic question.** Q1: "We pretend the treasure is in the Gold chest. The rule says the sign on the chest with the
treasure is true. How do you stamp the Gold sign?" Options: "True, because the rule says so" / "Read its words and check
them against the test" (right) / "Not sure". Q2: "The Gold sign says “The treasure is in the Bronze chest.” We pretend
it is in Gold. What happens to the Gold chest?" Options: "Keep it: the rule says its sign is true" / "Reject it: its
own sign is False, so the rule fails" (right) / "Not sure".

**Targeted remediation.** "You may be using the rule to stamp the sign. The rule does not make a sign true. It is a
test the case must pass. Stamp the Gold sign from its words: it says Bronze, the test says Gold, so False. Now check
the rule: the Gold chest's own sign must be True. It is False, so reject the Gold chest. That is how the rule finds the
treasure."

**How to test mastery.** On the L7 Do board's Gold case (own sign "The treasure is in the Bronze chest."), the learner
stamps it False and rejects at the first check, with no diagnosis. Both confused questions are answered right without
the teach line. The owner twin quiz is right on the first try. Then one owner item where a rejected chest's own sign is
True but a second sign is also True (it fails part 2).

**Evidence.** `src/content/stop1.ts`:839-847 (remember card), 925-944 (L7 rule and "Check two things"), 789
(`L7_EXAMPLE`); `src/engine/puzzles/signs.ts`:104 (owner rule text), 436-442 (own-true text), 463-469 (first confused
question and its teach); `src/game/components/CaseBoard.tsx`:21-30 (test-world note), 310-316 (rule banner and test
world together on the board).

**Reviewer note.** The facts are right. Corrections and additions. (1) The test-world line gets no rule today, so the
note change needs the rule passed in (from `scene.rule` or a step flag). The same note is also wrong in spirit under L5
("Every sign is false"). (2) The contrast card cannot show "rule part 1 passes or fails" as built: `ContrastPanel` has
only world, who, says, truth and because. So the pass or fail goes in "because", or a small panel field is added.
`signDistinctionDrill` builds from the treasure-vs-sign contrast scene, so the two-case board needs its own builder.
(3) Do not just drop the sentence from own-true for L7. Make own-true fire only when the learner stamped True and the
truth is False (see s1-rev-1), and give L7 a rule-aware own-true text: "The rule is checked after the stamps. Stamp the
Gold sign from its words: it says Bronze, the test says Gold, so False. Then the rule fails, so reject Gold." (4) The
owner quiz headlines ("Your answer makes the Gold chest sign false, but the rule needs it to be true") read as agreement
to a learner who stamps by the rule. Add "from its words": "In this test the Gold sign's words are false. The rule needs
them to be true, so Gold fails." (5) This finding and s1-l4-l7-rule-vs-stamp share one root. Declare a single
`rule-vs-stamp` distinction, taught in s1.l4 and reminded in L5 and L7 with reminder text for each rule, instead of two
separate fixes.

### s1-l4-l7-rule-vs-stamp (P1)

**Location.** The s1.l4 to l7 case boards (Do "Mark a case", twin "Check each chest", the cave board, the scratch
board): the stamp step. Clearest on the s1.l5 Do board's Gold case and the s1.l4 Do board's Gold case.

**What the learner sees.** The rule banner ("Exactly one sign is true." / "Every sign is false." / "Exactly two signs
are true.") sits above the signs to stamp, with the strip "Stamp each sign: do its words fit the test?". The L5 reminder
card says: "With this rule, the chest with the treasure has a false sign too. Every sign does." On the L5 Do board the
learner marks the Gold case (Gold: “The treasure is in this chest.”, Silver: “The treasure is in the Gold chest.”,
Bronze: “The treasure is not in this chest.”). All three are truly True there. The shown Bronze case beside it has all
three stamped False.

**What the program assumes the learner has been taught.** That the rule is not used while stamping. Stamps come only
from the words and the test; the rule is applied afterwards, to the count.

**Likely mix-up.** The rule (what is true in the real world, a pass test) gets mixed up with the stamp (what the words
give in this test). Under "Every sign is false" the learner stamps every sign False. Under "Exactly one sign is true"
the learner stamps exactly one True so the case fits. On the L5 Gold case, all-False stamps fire the own-true diagnosis
("You may be treating “the treasure is in this chest” and “this chest’s sign is true” as the same thing"), which names
a mix-up the learner did not make. The all-one kind cannot fire there, because it needs the right stamps to differ. On
the L4 Do board's Gold case (truly True, True, False), stamps bent to fit (True, False, False, plus Keep) match no
pattern, so only the first wrong mark's words appear.

**Hidden distinction.** The rule: a test on the whole case, checked after stamping, about the real treasure place. A
stamp: one sign's words against this test world only. A test may break the rule, and breaking it is what rejects the
test.

**Hidden steps.** 1) Stamp every sign without looking at the rule. 2) Only then count. 3) Compare the count with the
rule. 4) A case that does not fit is rejected, never fixed by changing stamps.

**Missing prerequisite.** Not taught. `CASE_STEPS` puts the steps in order, but no card says not to use the rule to
stamp, and no misconception kind detects stamps bent to fit the rule. The L5 reminder line pushes toward all-False
stamps.

**Recommended teaching intervention.** Add a "before you start" card in s1.l4 after the treasure-vs-sign contrast: "The
rule is checked last. Stamp each sign from its words first. If the count does not fit, reject the chest. Never change a
stamp to make it fit." Back it with a two-case board where the words give 2 True under "Exactly one sign is true" (stamp
2, reject). Declare a distinction `rule-vs-stamp` (a: "What the rule says about the real treasure place." b: "What a
sign's words give in this test.") with `taughtIn: 's1.l4'` on L5 to L7. Reword the L5 reminder: "The rule is about the
real place. In a test, a sign can come out True. Stamp from the words. A True stamp just means: reject this chest." Add
a new misconception kind in `diagnose()` (`drill.ts`), for example `fit-rule`: at least one wrong stamp, the learner's
True count equals the rule's need (for the owner rule: only the picked box True), and the verdict is Keep, or the stamps
are all the same and equal to what the rule says. List it before own-true for the rules "none", "one" and "two".

**Recommended UI change.** The count panel already hides the rule's need until every sign is stamped ("Stamp every
sign. The board counts the True stamps."). So point the change at the rule banner, which is always visible: tag it
"Check this after the stamps" while stamps are blank. Then show "Now check the rule" as its own lit step on the
MethodSteps strip, so the rule cannot be read as a stamping instruction.

**Diagnostic question.** "The rule says every sign is false. We pretend the treasure is in the Gold chest. The Gold
sign says “The treasure is in this chest.” How do you stamp it in this test?" Options: "False, because the rule says
every sign is false" / "True: its words fit the test" (right) / "Not sure". Teach: "The rule is about where the
treasure really is. A test can break it. Stamp from the words: True. Then the rule check fails, so reject the Gold
chest."

**Targeted remediation.** "You may be using the rule to stamp the signs. The rule is not a stamp. It is checked after
the stamps, on the count. Here the Gold sign says Gold and the test says Gold: True. All three signs are True, and the
rule needs 0, so reject the Gold chest. Breaking the rule is how a chest gets crossed out."

**How to test mastery.** The first check is right on the L5 Do board's Gold case (all three True, Reject) and on an L4
or L6 case where the words give a count the rule does not want. No `fit-rule` diagnosis on two boards in a row. The quiz
is right on the first try.

**Evidence.** `src/content/stop1.ts`:785 (`L5_EXAMPLE`), 820-836 (the Do board in `signLesson`: a reject case, scaffold
full), 839-847 (L5 reminder wording), 877-899 (L5 cards), 691-708 (L4 Do board; the Gold case has two true signs);
`src/engine/drill.ts`:82-102 (`diagnose`: all-one needs answers that differ; own-true is listed first);
`src/engine/puzzles/signs.ts`:436-461 (misconception order); `src/game/components/CaseBoard.tsx`:19 (`CASE_STEPS`),
340-349 (the need shown next to the count).

**Reviewer note.** (1) The UI recommendation as first written was mostly already built (see the UI field above, now
corrected). (2) Add a text fix: the pointer line in `signFeedback`, "But signs can be false. Only the rule tells you
which signs to trust.", says the rule decides a sign's truth. Reword it: "Signs can be false. In each test, stamp from
the words; the rule then picks the place." (3) The new `fit-rule` kind must come before both own-true and copied. On
the L5 Gold case, all-False stamps also equal the Bronze case's right stamps (False, False, False), so once own-true is
fixed, copied would misfire next. (4) Make own-true fire in one direction only (see s1-rev-1), or the L5 misdiagnosis
stays. (5) Merge the distinction declaration with s1-l7-rule-vs-own-sign: one `rule-vs-stamp` id, taught in s1.l4.

### s1-rev-1 (P1)

**Location.** The own-true diagnosis on every Stop 1 case board (`diagnose()` in `src/engine/drill.ts`). It misfires
on the L4 Do board's Gold case, the L4 twin's Gold case and the L5 Do board's Gold case. The first "I'm confused"
question on sign boards (`signConfused`) has the same one-sided teaching.

**What the learner sees.** On the L4 Do board's Gold case (Gold: “The treasure is in this chest.”, test in Gold, truly
True), a learner who stamps Gold False is told: "You may be treating “the treasure is in this chest” and “this chest’s
sign is true” as the same thing… A chest can have the treasure while its sign is false." The mark's own text then says
the sign is True.

**What the program assumes the learner has been taught.** That an own-sign error always comes from one belief:
"the treasure is here, so this sign is true".

**Likely mix-up.** The opposite merge: "the treasure is here, so this sign is false". It comes from over-correcting
after the contrast card's "A chest can have the treasure while its own sign is false", or from all-False stamps bent to
fit "Every sign is false". The diagnosis then names a mix-up the learner did not make and supports their wrong False.
Because own-true is listed first, it also hides all-one and the needed `fit-rule`.

**Hidden distinction.** Where the treasure is does not decide a sign either way: it does not make the sign true, and
it does not make it false. An own sign stamped True when it is false is a different error from one stamped False when
it is true.

**Hidden steps.** 1) Read the own sign's words. 2) Compare them with the test. 3) Stamp. The treasure's place gives no
default stamp in either direction.

**Missing prerequisite.** `drill.ts`:96-97 matches whenever the picked box's own stamp differs from its truth,
including stamping it False when its words fit. `distinction.test.ts`:137 locks this in ("stamped all False, own sign
wrong, own-true"). `signConfused` Q1 teaches only the "here makes it true" direction.

**Recommended teaching intervention.** Make own-true fire only when the own sign is stamped True and is truly False.
Add an `own-false` kind (stamped False, truly True) with the text below. Order the list: `fit-rule`, own-true,
`own-false`, verdict-only, copied, all-one. Update `distinction.test.ts`. Add a second line to the reminder card in
L5 to L7: "Where the treasure is does not make a sign true, and it does not make it false."

**Recommended UI change.** None. The misconception panel already shows before the first wrong mark's words; only the
match rule and the order change.

**Diagnostic question.** "We pretend the treasure is in the Gold chest. The Gold sign says “The treasure is in this
chest.” Is the Gold sign true in this test?" Options: "False: a chest with the treasure can have a false sign" / "True:
its words fit the test" (right) / "Not sure".

**Targeted remediation.** "Where the treasure is does not decide the sign either way. Read its words: it says “The
treasure is in this chest.” The test puts it here, so the words fit: True."

**How to test mastery.** On the L4 and L5 Do boards' Gold cases, the own sign is stamped True at the first check with
neither own-true nor own-false shown. The updated distinction test covers both directions.

**Evidence.** `src/engine/drill.ts`:96-97; `src/engine/__tests__/distinction.test.ts`:137; `src/engine/puzzles/signs.ts`
`signConfused` (Q1) and `signMisconceptions` (order).

**Reviewer note.** This was a reviewer's extra finding. It is the root of the L5 misdiagnosis in s1-l4-l7-rule-vs-stamp
and must ship with it.

### s1-l7-count-vs-which (P2)

**Location.** The s1.l7 Do board "Mark a case" (the Gold case) and the L7 twin board: the MethodSteps strip, the count
panel and the verdict-only diagnosis.

**What the learner sees.** The full-scaffold strip: "Count the True stamps" then "Compare the count with the rule".
Count panel: "1 sign is True. The rule needs only the Gold chest sign true." If the learner stamps correctly and taps
Keep, the diagnosis reads: "Your stamps are right. Now compare the count with the rule. The rule says how many signs
must be true. If the count is not that number, reject the chest." Card 1 meanwhile says: "Counting is not enough here.
The one true sign has to be on the chest with the treasure."

**What the program assumes the learner has been taught.** That the learner drops the L4 to L6 count method and checks
which sign is true.

**Likely mix-up.** How many signs are true gets mixed up with which sign is true. On the L7 Do board's Gold case exactly
1 sign is true (the Bronze sign, “The treasure is not in the Silver chest.”), but it is not the Gold sign. A learner
using the count method keeps Gold. The program's own diagnosis then says the rule is about how many. The count is 1,
so that advice points the wrong way, and the strip lights "Compare the count with the rule" too.

**Hidden distinction.** The number of true signs vs the position of the true sign (the owner's sign or another).

**Hidden steps.** After stamping: 1) Look at the pretend chest's own stamp (it must be True). 2) Look at the other two
stamps (both must be False). 3) Keep only if both hold.

**Missing prerequisite.** Taught on L7 cards 1 and 2 only. `CASE_STEPS` is the same for every rule.
`signMisconceptions(skin)` takes no rule. No contrast shows a one-true case that fits next to a one-true case that does
not.

**Recommended teaching intervention.** An owner contrast card plus a two-case board. Case A, test Silver: only Silver's
own sign is True, so keep. Case B, test Gold: only the Bronze sign is True, so reject. Ask: "Did the count change? No, 1
both times. What changed? Which sign is true." Give the owner rule its own MethodSteps: "Pretend the treasure is in one
chest" / "Stamp each sign from its words" / "Is this chest's own sign True?" / "Are the other two False?" / "Keep or
reject". Make `signMisconceptions(skin, rule)` rule-aware: for the owner rule, replace the verdict-only text (see the
reviewer note; a new `count-not-owner` kind is not needed).

**Recommended UI change.** For the owner rule, replace "1 sign is True" with two checks: "Gold chest's own sign: False
(needs True)" and "Other signs: Bronze True (needs False)". Outline the picked chest's own sign.

**Diagnostic question.** "In this test one sign is True: the Bronze chest sign. We pretend the treasure is in Gold.
Does this fit the rule?" Options: "Yes, one sign is true" / "No. The true sign must be the Gold chest's own sign"
(right) / "Not sure".

**Targeted remediation.** "You may be counting the true signs, as with the other rules. This rule asks which sign is
true, not how many. Here 1 sign is True, but it is the Bronze sign. The rule needs the Gold chest's own sign to be the
true one. So reject the Gold chest."

**How to test mastery.** The first check is right on the L7 Do board's Gold case. The learner is right on the first
try on owner quiz items that include a rejected chest with exactly one true sign that is not its own (generate at least
one such case per owner set). No owner verdict-only diagnosis on two boards in a row.

**Evidence.** `src/game/components/CaseBoard.tsx`:19 (`CASE_STEPS`), 312 (MethodSteps when scaffold is full), 340-349
(count panel); `src/engine/puzzles/signs.ts`:43 (the owner rule fits only if `ts[0] === treasure`), 436-448
(`signMisconceptions(skin)`; verdict-only text), 507 (`signDrill` uses it); `src/content/stop1.ts`:789 (`L7_EXAMPLE`: in
the Gold test only the Bronze sign is true), 820-836 (Do board, scaffold full), 925-944 (L7 cards).

**Reviewer note.** A new diagnose kind `count-not-owner` is redundant: right stamps with a wrong verdict is exactly
verdict-only. Making `signMisconceptions(skin, rule)` rule-aware and giving the owner rule its own verdict-only text is
enough: "Your stamps are right. This rule asks which sign is true, not how many. Is the Gold chest's own sign the true
one? No, the Bronze sign is. So reject Gold." Make `CASE_STEPS` rule-aware for the owner rule, as the auditor says.
Generating at least one one-true-but-not-own reject case per owner quiz set is a good mastery check; today
`signItem`'s random owner puzzles do not guarantee one.

### s1-l1-checkable-vs-has-answer (P2)

**Location.** s1.l1 What is a statement?: the first key-idea card's "Why it matters" line vs card 5 "You don’t need the
answer"; the sorted example (card 6) and the Do board; the "In real life" line after a right answer.

**What the learner sees.** First card, "Why it matters": "Before you believe a sentence, ask if it can be checked. Only a
statement can be true or false." Card 5: "“The wizard has twelve cats.” You can’t check this. But it must be true or
false. So it is a statement." After a right answer tagged s1.statement (true or can't-check sentences), "In real life":
"“The library closes at 5 pm” is a statement. You can call the library and check it." For s1.not-statement: "It is not
true or false, so nobody can check it."

**What the program assumes the learner has been taught.** That the test is "it has a right answer (true or false)" and
not "someone here can check it".

**Likely mix-up.** Something we can check gets mixed up with something that is true or false. Following the first
card's rule, “The castle has four towers.” or “My aunt has a red car.” is not a statement, because nobody can check it.
Quiz try 3 draws a "true" or "unknown" sentence, and the check draws any kind.

**Hidden distinction.** Checkable by us now vs true or false whether or not anyone can check it.

**Hidden steps.** For a sentence about the world, ask "Is there a right answer, even if nobody here knows it?" and not
"Can I check it?".

**Missing prerequisite.** Only card 5's words teach it. The sorted example (`L1_EXAMPLE`) and the Do board (`L1_DO`)
have no can't-check sentence, so the learner never sorts one before the quiz. The why line and the real-life lines
teach the opposite test.

**Recommended teaching intervention.** Rewrite the s1.l1 why line: "Before you believe a sentence, ask if it is true or
false. You may not be able to check it yet." Change the s1.statement real-life line so it does not depend on checking,
or add a can't-check example. Add a new can't-check sentence (not from the bank) to `L1_DO`, so the board has false,
question, opinion and can't-check. (The auditor also proposed a contrast card and a declared `checkable-vs-answer`
distinction; the reviewer finds card 5 enough, see below.)

**Recommended UI change.** In the sorted grid (`sortedScene`), give a can't-check sentence a visible tag ("Nobody here
can check it") with a check mark under "A statement", so the learner sees a blank True box and still a statement.

**Diagnostic question.** "“The castle has four towers.” Nobody here can count them. Is it true or false?" Options:
"Neither, because nobody can check it" / "One of them. We just don’t know which" (right) / "Not sure". Teach: "The
castle has four towers, or it does not. One of those is right, even if nobody here knows which. So it is a statement."

**Targeted remediation.** "You may be treating “nobody can check it” and “it is not true or false” as the same thing. A
statement only needs a right answer to exist. The castle has four towers, or it does not. So it is a statement."

**How to test mastery.** Right on the first try on two can't-check sentences in a row (fantasy and everyday), and on a
"Which of these is a statement?" whose only statement is a can't-check sentence.

**Evidence.** `src/content/world/s1.ts`:8 (why line), 65 (s1.statement real life), 67 (s1.not-statement);
`src/content/stop1.ts`:981-986 (card 5), 400-412 (`L1_EXAMPLE` and `L1_DO`: no unknown sentence), 497 (quiz try 3 is
"true" or "unknown"), 344 (unknown gets the tag and skill "statement"); `src/game/components/LessonRunner.tsx`:304 and
`IdeaCards.tsx`:63, 100 (why shown on the first card); `ItemView.tsx` `skillWorld` "In real life" line.

**Reviewer note.** Narrow the fix. Card 5 already exists, so no new contrast card or distinction declaration is needed.
(1) Rewrite the why in `world/s1.ts`: "Before you believe a sentence, ask if it is true or false. You may not be able to
check it yet." (2) Reword the uses line ("“Open until 9 pm” is a statement: you can check it…") and the s1.opinion and
s1.statement lines so "can check" is not the test, or give s1.statement a second line for a can't-check sentence
(`skillWorld` picks by item id). (3) Change the s1.not-statement line ("It is not true or false, so nobody can check
it"), whose converse is the error. (4) Add one new can't-check sentence (not from the bank) to `L1_DO` so it is sorted
before the quiz. The ContrastView variant is not needed.

### s1-l1-opinion-vs-fact (P2)

**Location.** s1.l1 card 4 "Opinions", the ask line in every Remember box, the Do board row “The moon is the prettiest
thing in the sky.”, and quiz try 4 (an opinion or exclamation, in every set).

**What the learner sees.** Card 4: "An opinion tells what someone thinks or likes: “Pizza is the best food.”" / "People
can disagree about an opinion, and nobody is wrong. In logic, we do not count an opinion as a statement." Remember box:
"Ask: “Could this sentence be true or false?”"

**What the program assumes the learner has been taught.** That the learner can tell a sentence about taste from a fact
nobody can check yet, and has a test for it.

**Likely mix-up.** An opinion (nobody is wrong) gets mixed up with a fact people disagree about (someone is wrong). The
bank has close pairs: “The elf is older than the troll.” (a statement) vs “Dragons are cooler than elves.” (an
opinion); “Ten is more than seven.” vs “Soccer is more fun than chess.”. The program's only stated test, “Could this
sentence be true or false?”, lets opinions through: a child thinks “Pizza is the best food” could be true (it is, for
me) and answers A statement. Or they answer "not a statement" for “The elf is older than the troll” because people
could disagree.

**Hidden distinction.** People disagree and nobody is wrong (taste) vs people may disagree but one of them is wrong
(fact).

**Hidden steps.** For a sentence that seems to say how things are, ask "If two people disagree, must one of them be
wrong?" Yes: a statement, even if nobody has checked it. No: an opinion. Clue words: best, prettiest, ugly, fun, gross,
great, lucky, cooler.

**Missing prerequisite.** Card 4 states the convention. The working test (Ann says true, Ben says false, nobody is
wrong) appears only in `KIND_SIMPLER`, which is shown only after a miss, under "Explain more simply". No contrast and no
board row pairs an opinion with a can't-check fact (`L1_DO`'s opinion stands alone).

**Recommended teaching intervention.** Declare a distinction `opinion-vs-fact` on s1.l1. A contrast card on the same
topic: “The elf is older than the troll.” with "Ann says yes, Ben says no. One of them is wrong." (a statement), and
“Dragons are cooler than elves.” with "Ann says yes, Ben says no. Nobody is wrong." (not a statement). Ask: "Did the
topic change? No. What changed? Whether someone must be wrong." Follow with a two-row board (`afterCard`). This needs a
small variant of Scene `contrast` whose verdict reads "A statement" / "Not a statement" (the panels now hold a True or
False truth). Add the second question to `L1_ASK` when the sentence is not a question, command or exclamation: "If
people disagree, is someone wrong?" (See the reviewer note for the cheaper fix to try first.)

**Recommended UI change.** In opinion feedback and on the board, show the Ann and Ben line as two speech bubbles (as
`KIND_SIMPLER` does in words) instead of hiding it behind "Explain more simply".

**Diagnostic question.** Q1: "“The elf is older than the troll.” Ann says it is true. Ben says it is false. Is one of
them wrong?" Options: "Yes, one of them is wrong" (right) / "No, they can both be right" / "Not sure". Q2: the same for
“Dragons are cooler than elves.” (right: "No, they can both be right").

**Targeted remediation.** "You may be treating “people can disagree” and “nobody is wrong” as the same thing. People
disagree about facts too, but then one of them is wrong. The elf is older, or it is not. With “Dragons are cooler than
elves,” each person says what they like, and nobody is wrong. Only the first is a statement."

**How to test mastery.** Right on the first try, in one "in a row" run, on an opinion and a can't-check sentence about
the same topic. Also a "Which of these is not a statement?" whose choices are an opinion, a can't-check sentence and a
false sentence.

**Evidence.** `src/content/stop1.ts`:179 (`L1_ASK`), 974-979 (Opinions card), 99, 102, 105 (bank: “Soccer is more fun
than chess.”, “The elf is older than the troll.”, “Dragons are cooler than elves.”), 289 (`KIND_SIMPLER` opinion: Ann
and Ben), 408-412 (`L1_DO`), 498 (quiz try 4).

**Reviewer note.** Cheaper fix first: add the missing half to card 4 ("People can disagree about a fact too, but then
one of them is wrong: the elf is older, or it is not") and move the Ann and Ben line from `KIND_SIMPLER` onto card 4.
Make `L1_ASK` two-part, sharing the fix with s1-l1-could-be-true: "Can you say “That is true” or “That is false” about
it? If two people disagree, must one be wrong?" A contrast card would need a ContrastView variant whose verdict is
statement or not-statement, so do it only if the cheaper fix is not enough. The bank pairs cited are real (“The elf is
older than the troll.” is "unknown"; “Dragons are cooler than elves.” is "opinion").

### s1-l3-here-vs-every-row (P2)

**Location.** s1.l3 The NOT flip: the Do boards "Mark the NOT" and "A counting trap", then the five quiz tries
(`notItem`), which show no cards.

**What the learner sees.** Board: "Pick its NOT. Then mark each sentence True or False on these cards." Marks: "Its
NOT", "This sentence, on these cards", "Its NOT, on these cards". A wrong pick gets: "“Every card is big” is false here:
card 2 is small, not big. “No card is big” is false here too: … A statement and its NOT never agree." Quiz: one
sentence line and "Which sentence is the NOT of this statement? It must be true whenever the statement is false, and
false whenever it is true." There are no cards.

**What the program assumes the learner has been taught.** That "disagrees on these cards" is only a first check, and a
NOT must disagree in every row of cards. Also that the learner can invent the rows to test: all fit, one does not, none
fit, a tie, exactly k.

**Likely mix-up.** Opposite truth value here (needed, but not enough) gets mixed up with opposite truth value in every
row (the definition). `notDrillRow` only accepts wrong options that agree with the statement on the shown cards. So on
both boards the shortcut "pick the choice whose truth is opposite on these cards" always works, and nothing separates it
from the real test. In the quiz there are no cards. The learner either has no method, or imagines one row, where a
wrong option can look right (“No card is red” for “Every card is red” when every card is blue).

**Hidden distinction.** Disagrees on this row vs disagrees on every row; one test row vs all rows.

**Hidden steps.** For each choice: 1) Make test rows (all fit, one does not, none fit; a tie; exactly k, one more, one
fewer). 2) Mark the statement and the choice in each. 3) Reject the choice at the first row where they agree. 4) Keep
the choice that never agrees.

**Missing prerequisite.** Card 6 "Check your NOT" says it ("Think of a few rows of cards… Try the edge cases too").
Neither board makes the learner test a second row or find the row that exposes a wrong NOT. The hint shows one row
already checked.

**Recommended teaching intervention.** Declare a distinction `here-vs-every-row` on s1.l3. Contrast card: the same wrong
NOT (“No card is red” for “Every card is red”) on two rows. Row A, all blue: the statement is False, the choice True, so
it looks right. Row B, one red and one blue: both False, so they agree and it is not the NOT. Ask: "Did the sentences
change? No. The row did. One row where they agree is enough to throw it out." This needs a contrast variant that draws
card rows, since `ContrastPanel` has only text. Add a third Do board: given a choice that disagrees on the shown cards,
the learner picks which of three rows makes it agree.

**Recommended UI change.** For NOT quiz items, show a "Test rows" strip of the item's `teach.cases` (two or three small
rows), each with "Statement: True or False" and "Your pick: True or False" marks the learner can set, so the rows are
on screen and not held in memory.

**Diagnostic question.** Q1: "On these cards “No card is red” is true and “Every card is red” is false. Does that prove
it is the NOT?" Options: "Yes, they disagree here" / "No, they must disagree on every row of cards" (right) / "Not
sure". Q2: "Which row shows that “No card is red” is not the NOT of “Every card is red”?" Options: "All red" / "One red
and one blue" (right) / "All blue".

**Targeted remediation.** "You may be checking only one row. A NOT must disagree with the statement in every row of
cards. Try one red card and one blue card: “Every card is red” is false, and “No card is red” is false too. They agree,
so it is not the NOT."

**How to test mastery.** Right on the first try on quiz items whose wrong option disagrees on the obvious row (none fit)
but agrees on a mixed row, and on the new board where the learner picks the row that exposes a wrong NOT.

**Evidence.** `src/content/stop1.ts`:620-668 (`L3_DRILL` bodies and rows), 1105-1112 (Check your NOT);
`src/engine/puzzles/statements.ts`:1809-1837 (`notDrillRow` throws unless every wrong option agrees with the statement
on the cards), 1612-1700 (`notItem`: scene kind "text" at 1690; the hint shows one row).

**Reviewer note.** Keep the third Do board (given a wrong NOT that disagrees on the shown cards, pick the row where it
agrees). It is the cheapest way to practise the step and needs no new component. The "Test rows" strip on quiz items is
a larger UI build; treat it as optional. A contrast card with card rows would need a ContrastView variant (panels are
text only), so the board alone covers it.

### s1-l2-speaker-knows (P2)

**Location.** s1.l2 quiz tries in the everyday and fantasy frames (`rowPrompt`), and the same items in the stop check.

**What the learner sees.** "Maya set out these cards and turned some face down. Maya says, “Every card is blue.” Is that
true, false, or can’t you tell yet?" and "A wizard used magic to turn some cards face down. The wizard says, “Every
card is red.”"

**What the program assumes the learner has been taught.** That who says a sentence does not change its truth, and that
"can’t you tell" is about what YOU can tell from the cards you see.

**Likely mix-up.** The speaker, who has seen the face-down cards, gets mixed up with the truth of the sentence and with
what you can tell. A learner answers True because Maya set the cards out and knows them, or False because the wizard is
tricky.

**Hidden distinction.** Someone says it vs it is true; what the speaker knows vs what you can tell from what you see.

**Hidden steps.** 1) Ignore who is speaking. 2) Judge the words against the cards you can see.

**Missing prerequisite.** Every L2 card and board uses sentences with no speaker. Speaker frames first appear in the
quiz.

**Recommended teaching intervention.** Add to the "Can’t tell yet" card: "Someone saying a sentence does not make it
true. Maya may know the face-down cards, but you can’t see them. Can’t tell is about what you can tell." Or give one Do
board row a speaker.

**Recommended UI change.** In speaker frames, label the row "What you can see".

**Diagnostic question.** "Maya turned the cards face down, so she knows them. Maya says “Every card is blue.” Does that
make it true?" Options: "Yes, Maya knows" / "No. People can say false things. Check the cards you can see" (right) /
"Not sure".

**Targeted remediation.** "Saying a sentence does not make it true. Look only at the cards you can see. They are blue,
but card 4 is face down. It could be any color, so you can’t tell yet."

**How to test mastery.** Right on the first try on speaker-framed can't-tell items in both frames.

**Evidence.** `src/engine/puzzles/statements.ts`:551-566 (`rowPrompt`); `src/content/stop1.ts`:1010-1050 (L2 cards, no
speaker), 535-566 (L2 Do boards, no speaker).

**Reviewer note.** The one-line card addition is enough and cheap. Also give the can't-tell feedback for speaker frames
a line: "Maya saying it does not make it true. Judge only what you can see." (`rowTeach` gets `whose`, so it can tell a
speaker frame from "the sentence".)

### s1-l3-not-scope (P2)

**Location.** s1.l3 card 2 "A quick trick"; Do board 2 option “At least three cards are not red.”; quiz wrong options
like “At least one card is not yellow” for “There is a yellow card”.

**What the learner sees.** Card 2: "Put “It is not true that” in front of the statement." Board 2 options: “At least
three cards are not red.” / “At most three cards are red.” / “Fewer than three cards are red.” Wrong-pick headlines:
"Your answer puts the “not” in the wrong place." / "Your answer counts a different group."

**What the program assumes the learner has been taught.** That a "not" in front of the whole sentence differs from a
"not" inside it.

**Likely mix-up.** “It is not true that at least three cards are red” gets mixed up with “At least three cards are not
red”: where the NOT goes.

**Hidden distinction.** The NOT of the whole statement vs a "not" on one word inside it.

**Hidden steps.** 1) Put “It is not true that” in front. 2) Rewrite it without moving the "not" inside.

**Missing prerequisite.** Card 2 shows the front-NOT trick only for “There is a red card”, and no card sets it against a
"not" inside. The idea appears only in wrong-pick feedback.

**Recommended teaching intervention.** A contrast card on the tie cards (3 red, 3 yellow): “It is not true that at least
three cards are red” is False (there are 3), while “At least three cards are not red” is True (3 yellow). Ask: "Did the
cards change? No. Where the not went did." (The reviewer prefers a contrast on the someColor item; see below.)

**Recommended UI change.** Underline the word "not" in each NOT option on the board and in the quiz.

**Diagnostic question.** "“At least three cards are not red.” Which cards does it count?" Options: "The red cards" /
"The cards that are not red" (right) / "Not sure".

**Targeted remediation.** "You may be moving the not into the sentence. The NOT goes in front of the whole sentence:
“It is not true that at least three cards are red.” That means fewer than three are red. “At least three cards are not
red” counts other cards: the ones that are not red."

**How to test mastery.** Right on the first try on items whose wrong choices include a not-inside option (not-some,
not-at-least).

**Evidence.** `src/content/stop1.ts`:1069-1077 (A quick trick), 643-668 (board 2 wrong option "count ge 3 not");
`src/engine/puzzles/statements.ts`:1155 and 1445 ("puts the “not” in the wrong place"), 1242-1244 (at-least wrong
options).

**Reviewer note.** The facts are right. A better contrast for the most frequent case: on the same two cards (one red,
one blue), “It is not true that there is a red card” is False and “At least one card is not red” is True. This targets
the someColor item every quiz set has, while the tie-card contrast targets only the at-least item, which only sometimes
offers the inside-not option.

### s1-l3-as-many-order (P2)

**Location.** s1.l3 card 4 "More, a tie, and at least as many", card 5 "NOT and counting", the given "more" row on Do
board 2, and quiz try 3 (`moreColor`) in every set.

**What the learner sees.** Card 4: "“At least as many” means the same number or more. In this tie, yellow has at least
as many as red." Card 5: "It is “There are at least as many yellow cards as red cards.”" Quiz choices can include both
"There are at least as many yellow cars as blue cars." (right) and "There are at least as many blue cars as yellow
cars." (wrong).

**What the program assumes the learner has been taught.** That the learner reads which group must have "at least as
many".

**Likely mix-up.** “At least as many yellow as red” gets mixed up with “at least as many red as yellow”. The only
example of "at least as many" is a tie, where both orders are true, so the order looks unimportant.

**Hidden distinction.** Which group is said to have at least as many (the order of the two groups).

**Hidden steps.** 1) For the NOT of “more A than B”, swap the groups: “B has at least as many as A”. 2) Check it on a
row that is not a tie (3 A, 2 B).

**Missing prerequisite.** Taught only in wrong-pick feedback ("Your answer still allows red to have more.").

**Recommended teaching intervention.** A contrast card on two rows. Row 1, 3 red and 2 yellow: “at least as many yellow
as red” is False, “at least as many red as yellow” is True. Row 2, a tie: both are True. "In a tie both are true. Only a
row where one color has more shows that the order matters."

**Recommended UI change.** Color the group words in the options (the word yellow in yellow).

**Diagnostic question.** "There are 3 red cards and 2 yellow cards. Is “There are at least as many yellow cards as red
cards” true?" Options: "Yes" / "No, yellow has fewer" (right) / "Not sure".

**Targeted remediation.** "Order matters. “At least as many yellow as red” means yellow has the same number or more.
With 3 red and 2 yellow, that is false. The NOT of “more red than yellow” puts yellow first."

**How to test mastery.** Right on the first try on the "more" NOT item when both orders are among the choices, two in a
row with different colors.

**Evidence.** `src/content/stop1.ts`:1088-1103 (cards 4 and 5); `src/engine/puzzles/statements.ts`:1352-1386
(`moreColor`: the wrong options include `asMany c1 c2`).

**Reviewer note.** The facts are right. The two-row contrast can be text plus the existing tie scene. A cheaper
alternative: add a 3-red, 2-yellow line to card 4 ("With 3 red and 2 yellow, red has at least as many as yellow, but
yellow does not have at least as many as red").

### s1-l4-test-vs-real (P2)

**Location.** s1.l4 card 2 "Try each chest" and the last walk card "Example: only one chest fits" (the same pattern in
L5 to L7); the Teach panel term "A true sign".

**What the learner sees.** "Pretend the treasure is in one chest. That is your test… Compare the count with the rule.
Keep the chest if it fits. If not, reject it: cross it out. Then try the next chest." / "Only the Silver chest makes
exactly one sign true. So the treasure is in the Silver chest." Teach term: "A true sign means a sign that says the
right thing about where the treasure is."

**What the program assumes the learner has been taught.** That the learner sees why a test that breaks the rule tells
us where the treasure is NOT: the rule is always right and the treasure is in exactly one chest, so the real place is
the one test that fits.

**Likely mix-up.** A pretend test (an assumption) gets mixed up with a conclusion (a fact). "Reject" is read as "its sign
is false" or as a ritual, and "Keep" as just "where we pretended". In the Teach term, "where the treasure is" does not
say whether it means the test or the real place.

**Hidden distinction.** An assumption we test vs a conclusion we reach; the test world vs the real world.

**Hidden steps.** After a test fails, reason: the rule is always right; this test breaks it; so this pretend can't be
real; so the treasure is not here. The one test left is the real place.

**Missing prerequisite.** Card 1 says "The rule is always right. Use it to find the treasure.", but no line connects
"reject" to "the treasure can't be here". Feedback ends "So the treasure can’t be in the Gold chest" with no reason
given.

**Recommended teaching intervention.** Add to "Try each chest": "The rule is always right. So if a test breaks the rule,
the treasure can’t really be there." Add a third confused question to `signConfused`: "We rejected the Gold chest. What
does that tell us?" Change the term to "A true sign: its words fit the test."

**Recommended UI change.** Show "Not here" under a rejected box's cross (the result) instead of only "Crossed out".
Label the kept box "The real place" on the last walk card.

**Diagnostic question.** "We rejected the Gold chest. What does that tell us?" Options: "The treasure is not in the Gold
chest" (right) / "The Gold sign is false" / "Not sure".

**Targeted remediation.** "A test is a pretend. The rule is always true for the real place. When a test breaks the
rule, that pretend can’t be real, so the treasure is not in that chest. Rejecting is how we find where it is."

**How to test mastery.** The confused question is answered right. After a board, "Which chests can’t have the
treasure?" is answered by naming every rejected chest.

**Evidence.** `src/content/stop1.ts`:1123-1137 (cards 1 and 2); `src/engine/puzzles/signs.ts`:148-151
(`signConclusion`), 281-290 (`signFeedback`: "So the treasure can’t be…"), 317 (the term "A true sign");
`src/game/components/CaseBoard.tsx`:35 (`verdictWord` "Crossed out").

**Reviewer note.** Make the term fix the main fix: "True in this test: its words fit the test." Add the one-line reason
to "Try each chest" as recommended. "Not here" under a rejected cross is good. Labelling the kept box "The real place"
only makes sense on the last walk card, not on the Do or twin boards, where each case is still a pretend.

### s1-l4-l7-scaffold-not-returned (P2)

**Location.** s1.l4 to l7 quiz tries without a board (door, box and cave items) and the new examples after a miss
(`freshL4`).

**What the learner sees.** After a wrong pick: the explanation ("Not yet. Let’s look closer." plus a headline like "Your
answer makes two signs true, but the rule needs exactly one."), then "Try this question again", then a new example with
only the optional button "Use the case board". That board is light and unchecked: "Mark it if it helps. Nothing on it
is checked."

**What the program assumes the learner has been taught.** That a learner who just missed can run the whole chain
(stamp, count, compare) unaided on the next puzzle.

**Likely mix-up.** The step that went wrong (a stamp that mixed up words and test, a count, or the rule check) stays
hidden. The learner repeats the same mix-up because the scaffold that showed it is gone.

**Hidden distinction.** A stamp error (words vs test) vs a rule-check error (count vs need).

**Hidden steps.** For the new example: 1) Mark each case on a full board. 2) See which step was wrong. 3) Then answer.

**Missing prerequisite.** Brief section 8 says to bring the right scaffold back after errors. `freshL4` builds a plain
item. `workFirst` exists only on the fixed first tries. `extraQuizItem` skips `workFirst` items. The scratch board shows
only when there is no `workFirst`, is light, and is never checked.

**Recommended teaching intervention.** In `freshL4`, give the first new example after a miss
`workFirst = signDrill(…, { mark: [0,1,2], scaffold: 'full' })`, and the next one a light board. Optionally make the
missed puzzle's case for the wrong pick the first case to mark.

**Recommended UI change.** After a miss, the new example opens with "First, mark the cases", the steps strip lit and the
compare facts under each sign.

**Diagnostic question.** Use `signConfused` (plus the rule-vs-stamp question in s1-l4-l7-rule-vs-stamp) on that board.

**Targeted remediation.** "Let’s do this one on the board, one test at a time. Stamp each sign from its words, then
compare the count with the rule."

**How to test mastery.** Two new examples right in a row: the first on the full board, the second with no board.

**Evidence.** `src/content/stop1.ts`:1281-1291 (`freshL4`), 759-773 (`lesson4Practice`: `workFirst` only on the twin and
the cave); `src/engine/puzzles/signs.ts`:670-681 (`signScratch`: no scaffold, "Nothing on it is checked.");
`src/engine/drill.ts`:218-225 (`extraQuizItem` skips `workFirst`); `src/game/components/ItemView.tsx`:659 (scratch only
when there is no `workFirst`).

**Reviewer note.** Cheaper option: give `signScratch` a scaffold parameter and, after a miss, open the scratch board by
default with scaffold full on the first new example. Making it a gating `workFirst` also works, but locks the answer
buttons. Either way, `extraQuizItem` skipping `workFirst` does not matter here: new examples come from `StopDef.fresh`,
not `extraQuizItem`.

### s1-l1-l3-no-mixup-tools (P2)

**Location.** The s1.l1 to l3 Do boards (s1.l1-do, s1.l2-do, s1.l2-do2, s1.l3-do, s1.l3-do2) and their quiz items.

**What the learner sees.** Boards with only per-mark "why" messages, for example in L2: "Card 1 is red. … So “There is
a red card” is true." No "I’m confused" button (`DrillStep.confused` and `Item.confused` are unset). No "A mix-up to
untangle" message (`DrillStep.misconceptions` is unset, and `diagnose()` returns nothing unless the board is a case
board).

**What the program assumes the learner has been taught.** That one wrong mark's words are enough to find the mix-up.

**Likely mix-up.** Patterns across rows show beliefs the per-mark text never names. L1: every false sentence marked
"Not a statement" (statement taken to mean true sentence). L2: answering from the visible cards only (False for every
can't-tell “There is…”, True for every can't-tell “Every…”). L3: picking the far opposite (every becomes none) every
time.

**Hidden distinction.** L1: false vs neither true nor false. L2: can't see it vs it isn't there. L3: NOT vs opposite.

**Hidden steps.** For each lesson, see the steps section.

**Missing prerequisite.** The pieces exist only for sign boards. s1.l1 to l3 declare no `LessonDef.distinctions`, so the
contract test does not require a contrast card or board for them.

**Recommended teaching intervention.** Add confused questions to each board and item first. The auditor also proposed
declaring distinctions on s1.l1, s1.l2 and s1.l3 and adding new `diagnose()` kinds for list boards (today only layout
`cases` is read): `false-not-statement` (L1), `visible-only` (L2: every can't-tell row marked the way the visible cards
point) and `far-opposite` (L3: picked every for none). See the reviewer note for which of these to keep.

**Recommended UI change.** The same "I’m confused" button and `ConfusedPanel` on L1 to L3 boards and items.

**Diagnostic question.** L2: "Card 3 is face down. You can’t see a yellow card. Does that mean there is no yellow card?"
Options: "Yes, there is none" / "No. Card 3 could be yellow" (right) / "Not sure".

**Targeted remediation.** L2 `visible-only`: "You may be treating “I can’t see one” and “there isn’t one” as the same
thing. A face-down card could be any color. Ask: could card 3 make it true? Could it make it false?"

**How to test mastery.** Each board is right at the first check; the confused questions are answered right; the
existing pass rules (a false sentence and a non-statement for L1, a right Can't tell for L2, a counting trap for L3) are
met on first tries.

**Evidence.** `src/content/stop1.ts`:473-483, 535-566, 620-668 (boards with no confused or misconceptions), 863 and 1142
(only L4 to L7 declare distinctions); `src/engine/drill.ts`:82-84 (`diagnose` returns undefined unless the layout is
`cases`).

**Reviewer note.** Do the confused questions on L1 to L3 items and boards first. Drop or defer the new diagnose kinds.
Declare only distinctions that are kept here and not already taught (opinion-vs-fact, not-scope, here-vs-every-row).
Checkable-vs-answer already has card 5. Each declared distinction makes the contract test require a contrast card and a
board, and L1's version needs a ContrastView verdict variant.

### s1-l2-same-card (P3)

**Location.** s1.l2 True, false or can't tell: quiz items made from the `hasExact` template (also the stop check and the
Arcade).

**What the learner sees.** For example: "Look at the cards. “There is a small red circle.” Is this true, false, or can’t
you tell yet?" (the curriculum's own s1.cant-tell example). If the learner wrongly picks True on a can't-tell row:
"Your answer says true, but the face-down cards could make it false. “True” would mean the sentence is true for every
way to fill the face-down cards."

**What the program assumes the learner has been taught.** That "a small red circle" means one card that is small, red
and a circle all at once.

**Likely mix-up.** Features on one card get mixed up with features spread over several cards. A learner who sees a small
blue circle and a big red square answers True (small: yes, red: yes, circle: yes). The feedback blames the face-down
cards, not the real mix-up. No line says that no card you can see is small, red AND a circle.

**Hidden distinction.** One card that has every named feature vs the features found on different cards.

**Hidden steps.** 1) For each face-up card, check every named feature on that same card (size, color, shape). 2) A card
with all of them: True. 3) None: are any cards face down? If yes, Can't tell.

**Missing prerequisite.** Not taught. Every L2 card and board sentence names one feature (“There is a blue card.”,
“There is a yellow card.”, “There is a red card.”, “Every card is red.”, “There is a square.”, “Every card is big.”,
“There is a triangle.”). The quiz still draws multi-feature `hasExact` sentences from `L2_TEMPLATES`.

**Recommended teaching intervention.** Teach it before the quiz. A contrast card on two rows: “There is a small red
circle.” with a small blue circle and a big red circle (no card is all three, so not true from these cards), vs the same
sentence with a small red circle (True). Ask: "Did the words change? No. In the first row the three words are on
different cards." Add one multi-feature row to the L2 Do board. The auditor also proposed declaring a distinction
`one-card-all-features` on s1.l2 (see the reviewer note).

**Recommended UI change.** In `hasExact` explanations, show a check row for each card in words: "Card 1: small no, red
yes, circle yes. Card 2: small yes, red no, circle yes." In `rowMeaning` for exact descriptions, add: "All the words
must fit the same card."

**Diagnostic question.** "Card 1 is a big red circle. Card 2 is a small blue circle. Does either card show “a small red
circle”?" Options: "Yes, I can see small, red and circle" / "No, no one card is all three" (right) / "Not sure".

**Targeted remediation.** "You may be finding each word on a different card. “A small red circle” means one card that is
small, red and a circle, all at once. Card 1 is red but big. Card 2 is small but blue. No card you can see is all
three."

**How to test mastery.** Right on the first try on two `hasExact` rows where the features are split across visible
cards: one with a face-down card (Can't tell) and one where a single visible card has all three (True).

**Evidence.** `src/engine/puzzles/statements.ts`:283-286 (`hasExact`), 888-899 (`feedback.true` for a can't-tell row),
597-600 (`rowMeaning` "some"); `src/content/stop1.ts`:519-525 (`L2_TEMPLATES` and its comment), 535-566 (L2 Do boards:
single-feature rows), 1010-1050 (L2 cards); `curriculum.json` s1.l2 s1.cant-tell example "There is a small red circle."

**Reviewer note.** A correction (now applied above): the `L2_TEMPLATES` comment lists the untaught kinds ("No card",
"exactly", "at least", "more", "the first card", "every big card"), and `hasExact` is a "There is …" sentence, so it does
not break the file's own rule. Recommended: add one multi-feature "There is …" row to the L2 Do board (for example on
`L2_EXAMPLES.cant`, "There is a small blue square." is True from card 2) and add "All the words must fit the same card"
to `rowMeaning` for multi-feature descriptions. Removing `hasExact` is not needed.

### s1-l1-could-be-true (P3)

**Location.** The s1.l1 Do board "Sort a sentence" body, and the ask line in every s1.l1 Remember box.

**What the learner sees.** Do board: "For each one, ask: “Could it be true or false?” Then tap “A statement” or “Not a
statement.”" Remember: "Ask: “Could this sentence be true or false?”"

**What the program assumes the learner has been taught.** That "could it be true" is read as "can the sentence itself
be called true or false" and not as "could what it talks about be so".

**Likely mix-up.** The sentence (what kind it is) gets mixed up with the situation it mentions. “Is it raining
outside?”: it could be raining, so it could be true, so a statement. “Can dogs swim?”: dogs can swim, so true, so a
statement. “Put on your shoes.”: it could happen.

**Hidden distinction.** Whether the sentence makes a claim vs whether the thing it mentions could be so.

**Hidden steps.** Ask "Can I reply to this sentence with “That is true” or “That is false”?"

**Missing prerequisite.** The better test already exists in `KIND_SIMPLER` ("Can you say “That is true” or “That is
false” about it?") but appears only after a miss. The Do board has the right pair (“The moon is made of cheese.” / “Is
the moon made of cheese?”) but never names it as a pair.

**Recommended teaching intervention.** Use the `KIND_SIMPLER` wording as `L1_ASK`. The auditor also proposed making the
moon pair a contrast card before the Do board: same topic, one claims and one asks; ask "Did the topic change? No. Only
the kind of sentence did." (The reviewer finds the board pair enough.)

**Recommended UI change.** Show the two moon rows side by side on the Do board with a "Same topic" tag.

**Diagnostic question.** "“Is the moon made of cheese?” Can you reply “That is false”?" Options: "Yes, the moon is not
cheese" / "No. It asks. You answer it with yes or no" (right) / "Not sure".

**Targeted remediation.** "You may be checking the topic, not the sentence. The moon is not cheese, but this sentence
asks. It does not say anything is so. You answer it; you can’t call it true or false. So it is not a statement."

**How to test mastery.** Right on the first try on a question whose answer is obvious (“Can dogs swim?”, “Is seven an
odd number?”) and on its statement twin.

**Evidence.** `src/content/stop1.ts`:179 (`L1_ASK`), 473-483 (`L1_DRILL` body), 283-291 (`KIND_SIMPLER`), 408-412
(`L1_DO` moon pair), 97 and 109 (bank questions “Can dogs swim?”, “Is seven an odd number?”).

**Reviewer note.** Same fix as the ask line in s1-l1-opinion-vs-fact: use `KIND_SIMPLER`'s "Can you say “That is true”
or “That is false” about it?" as `L1_ASK`, and in `L1_DRILL`'s body. A separate contrast card is not needed: the moon
pair is already on the board. A "Same topic" tag on those two rows is enough.

### s1-l3-not-vs-opposite-words (P3)

**Location.** s1.l3 cards 1 "What NOT means" and 3 "The every trap"; the rule line in every Teach panel; quiz prompts in
the everyday and fantasy frames.

**What the learner sees.** Card 1: "People sometimes call it the opposite. But the NOT must cover every way the statement
can be false." Card 3: "What is the opposite of “Every card is red”? Many people say “No card is red.” That is a trap."
… "The real opposite is “At least one card is not red.”" Rule: "NOT means the original statement is false." Quiz: "Ben
says NOT to Omar’s statement."

**What the program assumes the learner has been taught.** That the learner keeps "opposite" (the everyday sense: every
and none) apart from "NOT", even though card 3 calls the NOT "the real opposite". Also that "says NOT to" means "claims
it is false", and that "NOT" names a new sentence, not the value false.

**Likely mix-up.** Opposite (the far end) gets mixed up with the NOT (true exactly when the statement is false). A
sentence also gets mixed up with its truth value: "NOT means the original statement is false" can be read as "the NOT is
the false one".

**Hidden distinction.** The NOT (a new sentence, true exactly when the statement is false) vs the "opposite" (every and
none); a sentence vs its truth value.

**Hidden steps.** Use one name for the operation. Treat "NOT" as a sentence to build and check.

**Missing prerequisite.** The cards themselves mix the words. "Says NOT to" is never defined.

**Recommended teaching intervention.** Card 3: "The NOT is “At least one card is not red.” “No card is red” is the far
opposite, and that is the trap." Card 1, first line: "The NOT of a statement is a new sentence. It says the statement is
false." Define once: "To say NOT to a statement means to say it is false."

**Recommended UI change.** None needed beyond the wording.

**Diagnostic question.** "Is the NOT of “Every card is red” the same as its far opposite, “No card is red”?" Options:
"Yes" / "No. The NOT is true whenever the statement is false" (right) / "Not sure".

**Targeted remediation.** "“Opposite” makes people jump to the other end: every becomes none. The NOT is different. It
is true whenever the statement is false, even when just one card is not red."

**How to test mastery.** Right on the first try on every-trap items in the quiz and in the stop check.

**Evidence.** `src/content/stop1.ts`:1060-1086 (cards 1 to 3); `src/engine/puzzles/statements.ts`:1081 (`NOT_RULE`),
1622-1633 (prompts with "says NOT to").

**Reviewer note.** Keep only the wording changes: card 3 "The NOT is “At least one card is not red.”" (drop "real
opposite"), and `NOT_RULE`: "The NOT of a statement is a new sentence. It is true exactly when the statement is false."
Adding the term "far opposite" is not needed.

### s1-l1-grid-blank-vs-cross (P3)

**Location.** s1.l1 card 6 "An example" and the Do board picture (the `sortedScene` grid).

**What the learner sees.** A grid with the columns "True" and "A statement". “Cats can fly.” has a cross under True and
a check mark under A statement; “Is it raining?” has a blank True box. Caption: "A blank True box means the sentence
can’t be true or false."

**What the program assumes the learner has been taught.** That the learner reads a cross under True as "false" and a
blank as "neither", while a cross under "A statement" means "no".

**Likely mix-up.** False (a cross) vs no truth value (a blank), the core L1 boundary, shown only as a cross vs an empty
box, with the cross meaning "false" in one column and "no" in the other.

**Hidden distinction.** A false sentence vs a sentence that is neither true nor false.

**Hidden steps.** Read three states in one column.

**Missing prerequisite.** Only the caption explains it.

**Recommended teaching intervention.** Rename the column "True or false?" and write the value in each cell.

**Recommended UI change.** In the True column, write True, False or Neither instead of a check mark, a cross or a
blank.

**Diagnostic question.** "In the grid, what does the blank True box next to “Is it raining?” mean?" Options: "It is
false" / "It can’t be true or false" (right) / "Not sure".

**Targeted remediation.** "A cross under True means the sentence is false, like “Cats can fly.” A blank means it is not
true or false at all, like a question."

**How to test mastery.** The Do board's false sentence is marked "A statement" at the first check.

**Evidence.** `src/content/stop1.ts`:429-444 (`sortedScene`), 988-996 (example card).

**Reviewer note.** No component change is needed. The grid Scene already supports per-cell labels (`types.ts`
`grid.labels`, drawn by `GridPicture`), so `sortedScene` can write "False" and "Neither" in the True column.

### s1-l2-big-card (P3)

**Location.** The s1.l2 Do board row “Every card is big.” and quiz sentences that name a size.

**What the learner sees.** Every card is drawn the same size. The shape inside is big (fills the card) or small (half
size). Sentence: “Every card is big.” Feedback: "Card 2 is small, not big."

**What the program assumes the learner has been taught.** That "a big card" means the shape on it is big.

**Likely mix-up.** The card's own size vs the size of the shape on it.

**Hidden distinction.** The card frame vs the shape on it.

**Hidden steps.** Judge size by the shape, not by the card.

**Missing prerequisite.** Card 2 says "It could be any shape, any color and any size.", but no card shows a big and a
small shape side by side with names.

**Recommended teaching intervention.** Add to "Check the picture": "A card is big or small by its shape. Card 1 has a big
circle. Card 2 has a small square."

**Recommended UI change.** None beyond the line on the card.

**Diagnostic question.** "Card 2 has a small square on it. Is card 2 big or small?" Options: "Big: all the cards are the
same size" / "Small: its shape is small" (right) / "Not sure".

**Targeted remediation.** "Every card is the same size. Big and small are about the shape on the card."

**How to test mastery.** Right on the first try on size sentences in the quiz.

**Evidence.** `src/game/components/ThingCard.tsx`:60-75 (shape size; the card frame is fixed); `src/content/stop1.ts`:
1014-1026 (cards 1 and 2), 541-547 (the Do row "big").

**Reviewer note.** None.

### s1-l4-l7-steps-words (P3)

**Location.** The s1.l4 Do board and twin board, and the s1.l5 to l7 Do boards (the full-scaffold steps strip).

**What the learner sees.** "Pretend the treasure is in one box" / "Keep or reject the box" above chests named “Gold
chest”, “Silver chest”, “Bronze chest”.

**What the program assumes the learner has been taught.** That "box" means the chests (in another skin, "Box A" is a
name).

**Likely mix-up.** The generic engine word "box" vs the chests on screen.

**Hidden distinction.** "Box" (the engine word, also the box skin) vs chest.

**Hidden steps.** Translate "box" into "chest".

**Missing prerequisite.** `CASE_STEPS` is a fixed list, not built from the skin's words.

**Recommended teaching intervention.** Build `CASE_STEPS` from `signWords(skin)`: noun, item and prep. Also give the
owner rule its own steps (see s1-l7-count-vs-which).

**Recommended UI change.** Same as the teaching change.

**Diagnostic question.** "In the steps, what is a “box”?" Options: "The chests on this board" (right) / "A new box" /
"Not sure".

**Targeted remediation.** "The steps say box. Here each box is a chest."

**How to test mastery.** No mark errors traced to the step wording.

**Evidence.** `src/game/components/CaseBoard.tsx`:19 (`CASE_STEPS`), 312 (shown when scaffold is full).

**Reviewer note.** CaseBoard gets only the step. Either derive the noun from `scene.boxes` names, or put a steps list on
`DrillStep`, built by `signDrill` from `signWords(skin)`. The second also makes the owner-specific steps possible.

### s1-rev-2 (P3)

**Location.** s1.l2 cards and Do boards; quiz rows whose "There is a …" sentence has two or more matching visible cards.

**What the learner sees.** Every L2 card and Do-board "There is" row has exactly one matching visible card: “There is a
blue card” with one blue card; “There is a square” with one square. The line "One is enough. One or more…" (`rowMeaning`)
appears only in the Teach after a miss.

**What the program assumes the learner has been taught.** That “There is a red card” means one or more red cards.

**Likely mix-up.** A learner who reads “There is a red card” as "exactly one red card" answers False on a quiz row with
two red cards showing, and later misreads "there is" NOTs in L3.

**Hidden distinction.** At least one vs exactly one.

**Hidden steps.** For "There is …": look for one matching card and stop there. More matches still make it true.

**Missing prerequisite.** No card or board shows a "There is" sentence with more than one match before the quiz.

**Recommended teaching intervention.** Add one Do-board row whose "There is …" sentence has two matching cards (True).
Add a line to "Sometimes you can tell": "“There is a red card” is true with one red card or with many."

**Recommended UI change.** None.

**Diagnostic question.** "Two cards are red. Is “There is a red card” true?" Options: "Yes, one or more is enough"
(right) / "No, it says a red card, so just one" / "Not sure".

**Targeted remediation.** "“There is a red card” means one or more cards are red. Two red cards make it true too."

**How to test mastery.** Right on the first try on a quiz row with two or more matching visible cards, and on an L3 NOT
item built on a "There is" sentence.

**Evidence.** `src/content/stop1.ts`:535-566 (L2 Do boards), 1010-1050 (L2 cards); `src/engine/puzzles/statements.ts`
`rowMeaning` (Teach only).

**Reviewer note.** This was a reviewer's extra finding.

### s1-rev-3 (P3)

**Location.** The s1.l2 card "Can’t tell yet".

**What the learner sees.** "That does not mean false. It means you need more clues." The card never says the sentence
still has one right answer.

**What the program assumes the learner has been taught.** That "Can’t tell" is about what you know, and the sentence is
still true or false.

**Likely mix-up.** L1 taught that a statement must be true or false. A learner can take "Can’t tell" as a third value
("neither true nor false"), which mixes what you can tell with the sentence's truth and seems to contradict L1.

**Hidden distinction.** What you can tell vs the truth of the sentence.

**Hidden steps.** When the cards do not settle it, answer "Can’t tell yet", while knowing the sentence is still true or
false.

**Missing prerequisite.** No link from s1.l2 back to s1.l1 card 5 "You don’t need the answer".

**Recommended teaching intervention.** One line on the card: "The sentence is still true or false. The cards just don’t
show which yet, like “The wizard has twelve cats.”"

**Recommended UI change.** None.

**Diagnostic question.** "You can’t tell yet if “Every card is blue” is true. Is the sentence true or false?" Options:
"Neither: it is a can’t-tell sentence" / "One of them. The face-down card decides which" (right) / "Not sure".

**Targeted remediation.** "Can’t tell is about you, not the sentence. The sentence is true or false. The face-down card
decides which, and you can’t see it yet."

**How to test mastery.** The diagnostic answered right after the card, and the next can't-tell quiz item right on the
first try.

**Evidence.** `src/content/stop1.ts`:1010-1050 (L2 cards), 981-986 (L1 card 5).

**Reviewer note.** This was a reviewer's extra finding.

### s1-rev-4 (P3)

**Location.** s1.l1 quiz try 5: "Which of these is not a statement?"

**What the learner sees.** "Which of these is not a statement?" with four sentences. It is a new format, first met at
quiz try 5, with no card or board for it.

**What the program assumes the learner has been taught.** That the learner notices the "not" and flips the task.

**Likely mix-up.** The learner misses the small "not" and picks the one statement.

**Hidden distinction.** Find the one that is a statement vs find the one that is not.

**Hidden steps.** 1) Sort every choice. 2) Read what the question asks for. 3) Pick the odd one out.

**Missing prerequisite.** No card or board uses the format.

**Recommended teaching intervention.** End the L1 Do board with one "Which of these" row.

**Recommended UI change.** Put the "not" in bold or in a tag on the prompt: "Find the one that is NOT a statement".

**Diagnostic question.** "What does this question ask you to find?" Options: "A statement" / "The one that is not a
statement" (right) / "Not sure".

**Targeted remediation.** "Read the question again: it asks for the one that is not a statement. Sort each choice, then
pick the one that is not."

**How to test mastery.** Right on the first try on a "which is not" item and a "which is" item in the same set.

**Evidence.** `src/content/stop1.ts` lesson 1 practice (try 5, `whichItem` with "not").

**Reviewer note.** This was a reviewer's extra finding.

## Stop 2: NOT, AND, OR

### s2-l5-mark-vs-fits (P1)

**Location.** s2.l5 Guess the rule: key idea 4 "A worked example"; Do board s2.l5-do "Test a rule" (the shown row and
the learner's row); the explanation and Teach of every s2.guess-rule item (lesson tries 1 to 4, stop check items 8 and
9, Arcade).

**What the learner sees.** Card 1: "A check mark (✓) means yes, the card got through. A cross (✗) means no, it was
stopped." Card 2: "Every yes card must fit it. Every no card must not fit it." Card 4: "Now try blue OR big. Every yes
card is blue or big. Every no card is not blue and not big. It fits every card." Board: "The machine’s marks stay on
the cards. The shown row tests “blue OR big.” Every card matches its mark, so it is kept." / "Now test the rule “big.”
Tap Fits or Not for each card. Then keep the rule, or rule it out." In the shown row each card carries its machine
badge, and the given mark reads "✓ Fits" under every ✓ card and "✗ Not" under every ✗ card. Quiz explanation: "Only
the rule “red OR small” fits every card." The Teach, shown after a wrong answer, says "Only “…” matches all 6 marks."

**What the program assumes the learner has been taught.** That the learner already keeps two yes-or-no facts about each
card apart. One is the machine's mark: the evidence, which never changes. The other is whether the rule being tested
fits that card, which changes with each rule. It also assumes the learner knows that "match" means the two agree,
including the double-negative case: a ✗ card that the rule does not fit is a match.

**Likely mix-up.** The learner reads "this card got a yes" as "this card fits the rule" and copies each badge into
Fits or Not, so every rule looks kept. Or the learner reads "It fits every card" in the Lesson 1 to 4 sense (every card
fits the rule), so a ✗ card that does not fit seems to count against the right rule. The program's own words merge the
two ideas. Card 4 says blue OR big "fits every card" one sentence after saying the ✗ cards are "not blue and not big".
For four lessons a check mark meant "fits the rule" (s2.l1 card 2: "A check mark (✓) shows a card that is in the
group"). Here the same mark means "got through", and it sits next to "✓ Fits".

**Hidden distinction.** The machine's mark on a card (got through or stopped: data that never changes) vs whether the
tested rule fits that card (Fits or Not: the rule's answer, which changes with the rule). Also "the card fits the rule"
vs "the rule matches the card's mark".

**Hidden steps.** For each card: 1) Read the machine mark. 2) Work out the tested rule on the card (Fits or Not),
ignoring the badge. 3) Compare: yes plus Fits, or no plus Not, is a match; yes plus Not, or no plus Fits, is no match.
4) Any no-match: Rule out. All match: Keep.

**Missing prerequisite.** Step 3 is never shown card by card, and no card defines "match". The case "a no card the rule
does not fit is a match" is only implied by card 2's "Every no card must not fit it." The only worked row on the board
tests the one rule whose Fits or Not equals the machine mark on all six cards, so the two ideas never come apart in an
example before the learner acts. Partly taught: card 4's first sentence ("The big red square got a yes, but it is not
blue. So the rule can’t be blue.") and the quiz hint's checked card (truth rows "It got a yes" / "It fits …"). No board
diagnosis exists: `diagnose()` runs only for case boards, and s2.l5-do has no misconceptions or confused questions.

**Recommended teaching intervention.** Declare a distinction `mark-vs-fits` (a: "The machine’s mark on a card. It never
changes." b: "Whether the rule you test fits that card. It changes with the rule."). Add a contrast card before card 4
(Scene `contrast`). Both panels show the same card, the small blue circle with its yes mark. Panel 1: the rule "blue OR
big" fits it, which matches the yes, so keep testing. Panel 2: the rule "big" does not fit it, which does not match the
yes, so rule it out. Ask: "Did the mark change? No. Only the rule you tested changed." Add a second pair for a stopped
card: the small yellow circle does not fit "big", and that matches its no. Put a board with distinction `mark-vs-fits`
right after it (`afterCard`). Put because rows on the given marks ("Mark: yes. Rule “blue”: not blue. So: no match."),
and give the learner's row scaffold full (compare facts under each card). Change card 4's last sentence to "It matches
every mark." Change the quiz explanation to "Only the rule “…” matches every card’s mark." Board misconceptions need new
deck-row kinds in `diagnose()`: `copied-mark` (each Fits or Not equals that card's machine mark while the rule disagrees
somewhere) and a deck version of verdict-only (every Fits or Not right, Keep or Rule out wrong). Add the confused
questions below to the board, and to guess items as `Item.confused`. See the reviewer note for the board rows to use.

**Recommended UI change.** On each card in the rows, write the machine's mark in words (a chip: "Got through" /
"Stopped"). Draw Fits and Not with a different shape and color from the machine badge, so one check mark never stands
for two things side by side. Add a "Match?" cell to each card on the Do board, in words ("Match" / "No match"), and fade
it later with scaffold light. DrillBoard's `TapMark` must draw `DrillMark.compare` (today only CaseBoard does).
ConfusedPanel's closing line ("read each sign, then check its words against the test") needs its own text for each
board.

**Diagnostic question.** Q1: "The small blue circle got through. You are testing the rule “big.” Does the small blue
circle fit “big”?" Options: "Yes, it got through" / "No, it is not big" (right) / "Not sure". Teach: "Getting through is
the machine’s answer. Fits or Not is what the rule says. Here they do not match, so “big” is ruled out." Q2: "A card was
stopped. The rule you test does not fit it. Is that a match?" Options: "Yes: the machine said no, and the rule says no"
(right) / "No: the rule should fit every card".

**Targeted remediation.** "You may be treating ‘the machine said yes’ and ‘the card fits this rule’ as the same thing.
The machine’s yes never changes. Fits or Not is what the rule you are testing says. Then you compare the two. The small
blue circle got a yes, but it is not big. They do not match, so “big” is ruled out."

**How to test mastery.** Use a fresh rule-machine deck where the tested rule disagrees with the marks on exactly one
yes card and one no card. With the compare facts hidden (scaffold light), every Fits or Not and the Rule out are right at
the first check. Then two guess items right on the first try with no hint, including one where a wrong choice is ruled
out only by a stopped card it fits. Then a "Which card rules out “…”?" item whose answer is a stopped card the rule
fits.

**Evidence.** `src/content/stop2.ts`:1776-1803 (1780, 1787, 1801), 1927-1956 `guessBoard` (1931-1932 keep and rule-out
words, 1942 body, 1947 shown row), 1494 (explanation "Only the rule … fits every …"), 1500-1502 (Teach rule and
meaning), 1628-1633 (L1 card 2: a check mark means in the group); `src/engine/puzzles/rules.ts`:458-473 (`deckRow`
`withMarks`), 493-505 (`ruleTestRow`); `src/game/components/DrillBoard.tsx`:40-73 (`GivenMark` draws a check for "fit"),
86-137 (`TapMark`, no compare); `src/game/components/ThingCard.tsx`:97-110 (`MarkBadge`); `src/engine/drill.ts`:83
(`diagnose` returns unless the layout is `cases`); `src/game/components/Distinction.tsx`:139. A read-only probe of
`DRILLS['s2.l5']` shows the shown row is Fits on exactly the four yes cards. A learner who copies the marks gets one
wrong mark (the small blue circle), and its words name only the card: "The small blue circle is not big, so it does not
fit “big.”"

**Reviewer note.** (1) Cheapest and highest value: on card 4, change "It fits every card" to "It matches every mark."
Change the explanation at `stop2.ts`:1494 to "Of these three rules, only “…” matches every mark." (s2-l5-kept-vs-proven's
wording, so it does not overclaim either). (2) Do not swap the shown "blue OR big" row for "blue". Keep it as the model
of Keep, and add a second given row for "blue" as the model of Rule out (the big red square and the big yellow square
are yes cards that "blue" does not fit). Then change the learner's rule from "big" to "a circle OR big". That rule is in
`TAUGHT_POOL`, and only the small yellow circle (a no card it fits) rules it out. This breaks the copy-the-badges
strategy: a copier marks that card Not and then Keeps. It also drills the no-card-that-fits case, which today appears
nowhere before the quiz (see s2-rev-1). (3) Truth rows: `guessOn`'s `got` shows a stopped card as "It got a yes:
false" (`stop2.ts`:1467, drawn with a cross icon). That is a double negative in exactly the "no plus Not is a match"
case. Use "Its mark: no" / "Its mark: yes" instead. (4) The contrast card with card pictures cannot be built today.
`ContrastPanel` is text-only and `ContrastView` hard-codes "Test world", "<who> says:" and True or False. `CompareRows`
hard-codes "Says / Test / Do the words fit the test?". Both need a card picture and label props first (s2-rev-2). (5) A
banner naming the rule under test already exists: the row title shows "Your turn · Test the rule “big.”". That UI item
was dropped from the field above. (6) The Teach is not on the same screen as the explanation; it shows only after a
wrong answer (corrected above).

### s2-l5-kept-vs-proven (P1)

**Location.** s2.l5 key idea 4 "A worked example"; Do board s2.l5-do (Keep or Rule out); every s2.guess-rule prompt and
explanation; the lesson's "Why it matters" line.

**What the learner sees.** Prompt: "A rule machine lets a card through (yes) if it fits the secret rule. It stops (no)
every other card. Which rule is it using?" Card 4: "Now try blue OR big. … It fits every card." Board keep words: "Each
yes card fits “blue OR big,” and each no card does not. No card rules it out, so keep it." Explanation: "Only the rule
“red OR small” fits every card. The big red square rules out the rule “a circle OR small.” …" Teach: "The secret rule
matches every mark." Why line: "A guess that fits a few examples can still be wrong. Check it against every one,
because a single example that does not match rules it out."

**What the program assumes the learner has been taught.** That a kept rule is only still possible. Also that the quiz
answer comes by elimination: the secret rule is one of the three choices, the other two are ruled out, so it must be
the one left.

**Likely mix-up.** The learner takes "this rule matches every card I can see" to mean "this rule is the secret rule,
proved". On the lesson's own worked deck, the taught rule "blue OR a square" also matches all six marks, and no screen
says so. In a read-only probe of the L5 pack (seeds 0 to 199), 200 of 800 guess items have more than one taught rule
that matches every mark, while the explanation says "Only the rule … fits every card."

**Hidden distinction.** Ruled out (one mismatch proves the rule wrong, for sure) vs kept (no mismatch yet: still
possible, not proved). In the brief's words: evidence vs conclusion, a guess vs a conclusion.

**Hidden steps.** After testing: 1) Note which choices are ruled out. 2) Treat the one left as "still possible". 3)
Conclude it is the secret rule only because the secret rule must be one of the choices.

**Missing prerequisite.** Two ideas are never stated: the asymmetry (one card can rule a rule out, but no number of
matching cards proves it) and the premise that the secret rule is one of these choices. The idea is first taught in
s7.l1 "Seeing a pattern" ("But it is a guess, not a proof."), five stops later. The nearest earlier idea, s1.l2 "Can’t
tell yet", is not linked.

**Recommended teaching intervention.** Declare a distinction `kept-vs-proved` (a: "A rule no card rules out. It is still
possible." b: "The secret rule. Only one rule is."). Add a contrast card after card 4: the same six marks with two kept
rules, "blue OR big" and "blue OR a square", both matching every mark. Ask: "Did the marks change? No. Two rules both
fit. A new card would split them: the big red circle gets a yes from blue OR big and a no from blue OR a square." Then
one sentence: "In a puzzle, the secret rule is one of the choices. When the other choices are ruled out, the one left
must be it." Add a third given row to s2.l5-do that tests "blue OR a square" (also kept), with the done line "Two rules
are kept. Kept means still possible." Change the explanation to "Of these three rules, only “…” matches every mark. The
other two are ruled out, so the machine uses “…”." Link back to s1.l2 "Can’t tell yet" and forward to s7.l1 in the card
text (not in `taughtIn`, which must name a lesson in the same stop).

**Recommended UI change.** Rename the board's "Keep" option "Keep for now". On guess items, let the learner cross out a
choice and name the card that ruled it out, and show "Choices left: 1 of 3" before Check.

**Diagnostic question.** Q1: "A rule matches every card you can see. What do you know?" Options: "It is the secret rule
for sure" / "It is still possible. Another rule might match too." (right). Q2: "One card does not match a rule. What do
you know?" Options: "That rule is ruled out for sure" (right) / "It might still be the rule".

**Targeted remediation.** "You may be treating ‘it matches every card here’ and ‘it must be the rule’ as the same thing.
One card that does not match proves a rule wrong. Matching every card only keeps a rule in the game. Look: blue OR big
and blue OR a square both match all six marks. You can pick one only because the other choices were ruled out."

**How to test mastery.** First, a guess item where two offered rules both match every mark and the choices include
"Can’t tell yet" (right), answered on the first try. Next, a "Which new card would tell these two rules apart?" item.
Then a normal guess item, right on the first try.

**Evidence.** `src/content/stop2.ts`:148 (prompt), 1494 (explanation), 1500-1502 (Teach), 1798-1802 (card 4), 1931 (keep
words); `src/content/world/s2.ts`:40 (why line); `src/engine/puzzles/rules.ts`:354-394 (`makeRuleGuess` checks only the
offered distractors); `curriculum.json` s7.l1 "Seeing a pattern". Read-only probe: the `TAUGHT_POOL` rules that match
every mark on `EXAMPLES.guess` are "blue OR a square" and "blue OR big"; 200 of 800 L5 items have more than one matching
taught rule.

**Reviewer note.** `Distinction.taughtIn` must name a lesson in the same stop (`stops.test.ts`:409-414). The links to
s1.l2 and s7.l1 can only go in card text, not in the field (applied above). The two-kept-rules contrast is correct (the
big red circle gets a yes from blue OR big and a no from blue OR a square). As a picture it needs the card-capable
contrast panel (s2-rev-2), or it can be done as a plain "things" card with two given rows on the board. A "Can’t tell
yet" choice on guess items needs `makeRuleGuess` to build a deck where two offered rules both match. Today it rejects
that, because distractors must miss at least one mark. Prefer "Keep for now" over "Still possible" for the button
(shorter, grade 6; applied above). Also fix the why line in `world/s2.ts`:40, for example "…a single example that does
not match rules it out. Matching every example only keeps a guess alive."

### s2-l4-inside-vs-whole (P1)

**Location.** s2.l4 key ideas 2 "NOT (red AND big)" and 4 "NOT (red OR big)"; Do boards s2.l4-do row 1 and
s2.l4-do-or; quiz items s2.not-both, s2.not-either and s2.bracket-yesno.

**What the learner sees.** Card 2: "First find the cards that are red AND big. NOT then takes every other card. A small
red card fits. A big blue card fits too." Its picture shows only the final NOT marks. Board s2.l4-do-or: "Now the rule
is “NOT (blue OR small).” First find the cards that fit “blue OR small.” NOT takes the rest." It has one row, "Rule:
NOT (blue OR small)", with a Fits or Not pair per card. Wrong-mark words: "The small red square is not blue, and it is
small. So the inside, “blue OR small,” is true. NOT flips true to false, so it does not fit “NOT (blue OR small).”" Quiz
explanation: "The small blue circle is small, but it is not red. So “small AND red” is false, and NOT flips it to true.
It fits."

**What the program assumes the learner has been taught.** That the learner can hold the inside's result for each card
while flipping it. That "the card fits the inside" is a different fact from "the card fits the whole rule". And that
"the inside is false for this card" means "the card is not in the inside group".

**Likely mix-up.** The learner marks or taps the cards that fit the inside ("red AND big") as the cards that fit NOT
(red AND big). This is the quiz's named misreading: "Your answer takes the cards that fit the inside of the brackets…".
Some learners flip twice.

**Hidden distinction.** The card fits the inside (red AND big) vs the card fits the whole rule NOT (red AND big): the
result before the NOT vs the result after it.

**Hidden steps.** For each card: 1) Check part 1 of the inside. 2) Check part 2. 3) Join them with the inside's AND or
OR. 4) Note "inside: fits" or "inside: not". 5) Flip. 6) Mark.

**Missing prerequisite.** The inside's result is never on screen. No picture shows the inside group, no board has an
"Inside" row, and there are no compare facts. The cards teach this step with groups ("First find the cards…"), while
the explanations use a truth flip per card ("the inside … is false. NOT flips false to true"). The link between the two
is never taught (`T_NOT` appears only after a wrong answer). All five L4 cards come before the first board (no
`afterCard`), so when board 1 opens, card 2's method is three cards back. The boards have no misconceptions, so a
learner who marks the inside gets one card's words.

**Recommended teaching intervention.** Declare a distinction `inside-vs-whole` (a: "Does the card fit the inside?" b:
"Does it fit the whole rule, after the NOT?"). Split card 2 into two cards: first the inside group marked
(`exampleScene(EXAMPLES.brackets, innerOf(E.notRedAndBig))`), then the NOT marks. (A step-by-step reveal on one card
works only for case scenes today.) Add one bridge sentence on card 2: "For one card: if it is in the inside group, the
inside is true for it, and NOT leaves it out." On s2.l4-do (scaffold full), add a given first row "Inside: blue AND
small" (`deckRow(innerOf(rule))`) above the learner's row "Rule: NOT (blue AND small)". On s2.l4-do-or, the learner marks
both the inside row and the NOT row. On s2.l4-do-switch and Try 1 the inside row is gone (scaffold light); it comes back
on the new example after a miss. Use `afterCard` so each board sits right after its card: s2.l4-do after card 3,
s2.l4-do-or after card 4, s2.l4-do-switch after card 5. Add a board misconception: the deck kind `misread` with the inner
rule (the picks equal the inside's marks). Add `Item.confused` to the bracket items.

**Recommended UI change.** Under each card on the board, show a small chip, "Inside: fits" or "Inside: not", while the
scaffold is full (this needs label props on `CompareRows`). Highlight the bracketed part of the rule label. Put a banner
over the row: "Do the inside first, then flip."

**Diagnostic question.** Q1: "The rule is NOT (red AND big). Does the small red square fit the inside, red AND big?"
Options: "Yes" / "No, it is not big" (right). Q2: "The card does not fit the inside. What does NOT do?" Options: "Leaves
it out" / "Takes it: NOT flips ‘does not fit’ to ‘fits’" (right).

**Targeted remediation.** "You may be treating ‘fits the inside’ and ‘fits the whole rule’ as the same thing. First check
the inside: the small red square is not big, so it does not fit “red AND big.” Then NOT flips that, so it fits “NOT
(red AND big).”"

**How to test mastery.** A not-both item and a not-either tap item (each with an inside set of 2 or more cards), both
right on the first try with no hint. A bracket yes-or-no pair on the same kind of card (one with AND inside, one with OR
inside), both right. Then a light board with no inside row, right at the first check.

**Evidence.** `src/content/stop2.ts`:1733-1746, 1756-1763 (cards), 1995-2009 (boards), 394-397 (`whyFits` inside),
409-411 (`noteFor`), 1221 and 1244 (inside misreading, quiz only), 453 (`T_NOT`), 1382-1426 (`bracketYesNoAs` words);
`src/game/components/LessonRunner.tsx`:38-59 (`afterCard` support exists); `src/engine/drill.ts`:83. A read-only probe of
`DRILLS` shows no `afterCard`, no inside row and no misconceptions on the L4 boards.

**Reviewer note.** The step reveal works only for case scenes (`IdeaCards.tsx`:36 reads `card.scene.steps` only when the
kind is `cases`). So card 2 cannot be revealed in two steps today: either split it into two cards using the existing
`exampleScene` (applied above), or add steps to "things" scenes. The "Inside: fits / not" chip needs `CompareRows` label
props, because its labels today are "Says / Test / Do the words fit the test?" (s2-rev-2). A given inside row via
`deckRow(innerOf(rule))` and `afterCard` both work today without new components, so do those first. Add the bridge
sentence on card 2 (applied above).

### s2-l2-list-and-vs-rule-and (P2)

**Location.** s2.l2 key ideas 1 to 4 (no everyday-AND card), Do board s2.l2-do, and quiz items s2.and, s2.and-pick and
s2.and-count in story skins. The setup comes from s2.l1 explanations and choices that use "and" to join two groups.

**What the learner sees.** L1 explanation: "“NOT yellow” means every card that is not yellow. The red cards and blue
cards fit. That makes 4." L1 board note: "Red cards and yellow cards fit. Only the blue cards are left out." L1
not-means choices: "Red cards and yellow cards" / "Only red cards". L2 card 1: "Red AND a circle means two things. The
card must be red. It must also be a circle." Story prompt: "The knight takes every shield that is a circle AND blue, and
no other shields. Which of these shields does she take?" The code knows the risk (comment at `groups()`): "'blue cards
and yellow cards' (never 'blue and yellow cards', which reads as both colors)".

**What the program assumes the learner has been taught.** That the learner keeps the list "and" (two groups put
together, so more cards) apart from the rule's AND (two features on one card, so fewer cards).

**Likely mix-up.** The learner reads "red AND a circle" as "the red cards and the circles" and takes every card that is
red or a circle (the engine's `andAsOr` reading). L1 has just used "and" that way for a whole lesson, and the story
sentence puts a list-style "and" right after the rule's AND.

**Hidden distinction.** "and" joining two groups in a list (put together: the red cards and the circles) vs AND joining
two parts of a rule about one card (both at once: red circles only).

**Hidden steps.** Before checking any cards, see that the capital AND is inside the rule, so both parts must be checked
on the same card. The small "and no other shields" belongs to the story, not to the rule.

**Missing prerequisite.** L3 has "Everyday OR can be different", but L2 has no matching card for AND. Partly taught: card
1 ("The card must be red. It must also be a circle."), card 2 ("A red square is red, but it is not a circle. So it does
not fit."), and the quiz's named misreading after a wrong answer ("Your answer takes cards that fit just one part."). The
Do board has no misconception patterns, so a learner who marks it as AND read as OR gets only the first card's words.

**Recommended teaching intervention.** Add a one-card fix in words, mirroring L3 card 3: "Everyday ‘and’ can be
different. ‘Get the red cards and the circles’ means two groups put together. The rule red AND a circle is about one
card: it must be both." Add a deck misconception kind `misread` with the reading `andAsOr` (a new kind in `diagnose()`,
matched against `pickIds(rule, deck, 'andAsOr')`). The auditor also proposed declaring a distinction
`list-and-vs-rule-and` with a contrast card "Everyday and can be different" on the AND deck (panel 1: "Get the red cards
and the circles" takes the small red square and the small blue circle; panel 2: the rule "red AND a circle" leaves both
out; ask "Did the cards change? No. Only the kind of ‘and’ changed."). The given row "The red cards and the big cards"
on the board was dropped by the reviewer (see below).

**Recommended UI change.** In story skins, split the sentence so the only "and" next to the rule is the rule's own: "The
knight takes every shield that is a circle AND blue. She takes no other shields." Show the rule in its own chip above
the story line ("Rule: a circle AND blue").

**Diagnostic question.** Q1: "The rule is red AND a circle. Here is a small red square. Does it fit?" Options: "Yes, it
is red" / "No, it must be red and also a circle" (right). Q2: "Which gives more cards?" Options: "the red cards and the
circles" (right) / "cards that are red AND a circle".

**Targeted remediation.** "You may be treating AND in a rule and ‘and’ in a list as the same thing. ‘The red cards and
the circles’ puts two groups together. ‘red AND a circle’ is about one card: it must be both. The small red square is
red, but it is not a circle, so it does not fit."

**How to test mastery.** An and-tap item in a story skin whose `andAsOr` set differs from the answer by at least two
cards, right on the first try. An and-count item with the "fit at least one part" distractor offered, right on the first
try. The "which gives more cards" contrast item, right.

**Evidence.** `src/content/stop2.ts`:268-269 (the `groups` comment), 743 (L1 explanation), 765 (not-means labels),
1961-1967 (L1 board note via `notNote`), 1663-1668, 1670-1676, 1709-1715 (OR has an everyday card, AND has none), 161
and 218 (skin sentences "…, and no other …"), 897 (`andAsOr` misreading, quiz only); `src/engine/puzzles/rules.ts`:107
(`andAsOr`).

**Reviewer note.** Drop the given row "The red cards and the big cards" (union marks on an AND board). It shows OR's
result before L3 teaches OR, and it puts a union under a Fits or Not row, which can teach the very reading it warns
against. Use the one-card fix in words (applied above). Add the deck-row misconception `misread` with the reading
`andAsOr`, which needs the new `diagnose()` kind from s2-boards-old-marks-no-diagnosis. Splitting the story sentence is
a cheap, sensible change. The comment is at `stop2.ts`:268-269.

### s2-l4-same-meaning-every-kind (P2)

**Location.** s2.l4 key ideas 4 "NOT (red OR big)" and 5 "Watch the switch"; the done lines of Do boards s2.l4-do-or and
s2.l4-do-switch; quiz item s2.same-meaning (try 5, stop check, Arcade).

**What the learner sees.** Card 4: "That is the same as NOT red AND NOT big. The same two cards fit: the small yellow
circle and the small blue triangle." Card 5: "To move a NOT inside the brackets, put a NOT on each part. Then AND turns
into OR, and OR turns into AND." Board done line: "Right. Only the small blue triangle is left out. “NOT blue OR NOT
small” fits the same cards as “NOT (blue AND small).”" Quiz, with no cards on screen: "Which rule means the same as NOT
(a circle AND small)? Two rules mean the same when they fit exactly the same cards." Choices: "NOT a circle OR NOT small
/ NOT (a circle OR small) / NOT a circle AND NOT small". Hint: "Test each choice on a card that fits only one part."

**What the program assumes the learner has been taught.** How to test "mean the same" with no cards in view: picture one
card of every kind (both parts, only the first, only the second, neither) and check both rules on each. Also why the six
cards on the board were enough to show that two rules mean the same.

**Likely mix-up.** The learner takes "the two rules fit the same cards here" to mean "they mean the same", because the
cards and boards show sameness only on the six cards in view. Or the learner does only half the switch (a NOT on each
part, but AND kept), because only the recipe was learned.

**Hidden distinction.** Agreeing on the cards in front of you vs agreeing on every kind of card (meaning the same); the
switch as moving words around vs its meaning (which cards fit).

**Hidden steps.** 1) List the four kinds of card for the two features. 2) Work out the question's rule and each choice on
each kind. 3) Reject any choice that disagrees on even one kind.

**Missing prerequisite.** No card teaches the four-kinds method. It appears only in the Teach after a miss ("Test the
question’s rule and the right answer on every kind of card.") and in the hint. It is first taught on cards in s5.l5
"List the cases" and s6.l4 "How to test". Nothing says that the brackets deck holds all four kinds for red and big (big
red circle, small red square, big blue triangle, small yellow circle), which is why agreeing on it is enough. The reason
AND turns into OR ("So a card fits when at least one part is false.") appears only in the Teach after a miss. No board
asks "same or not?", so the learner first meets that decision in the quiz. Already taught well: NOT (A AND B) vs NOT A
AND NOT B, side by side on s2.l4-do, with the done line "The brackets changed who fits."

**Recommended teaching intervention.** Declare a distinction `same-here-vs-same-always` (a: "Two rules fit the same cards
on this table." b: "Two rules fit the same cards of every kind: they mean the same."). Add a card before "Watch the
switch": "Four kinds of card" on the brackets deck (both red and big; only red; only big; neither), with the sentence: "A
rule about red and big only asks these two things. So if two rules agree on all four kinds, they agree on every card."
Add the reason to card 5: "NOT (red AND big) fits a card when at least one part is false. That is NOT red OR NOT big."
Add a board after it with two rows on just the four kinds (the question's rule and one choice), then a "Same / Not the
same" mark (a new decide mark like `ruleTestRow`'s Keep or Rule out). Give the quiz item a scratch board with the four
kinds and one row per choice (scaffold light).

**Recommended UI change.** Give the same-meaning item a scene showing the four kinds of card for its two features,
unmarked, so the learner tests on pictures instead of imagined cards.

**Diagnostic question.** Q1: "Two rules give the same marks on these six cards. Do they surely mean the same?" Options:
"Yes" / "Not for sure. Check one card of each kind first." (right). Q2: "To test whether two rules mean the same, which
cards do you try?" Options: "Any one card" / "One card of each kind: both parts, only the first, only the second,
neither" (right).

**Targeted remediation.** "You may be treating ‘they agree on these cards’ and ‘they mean the same’ as the same thing.
Try every kind of card. Take a big red circle: it does not fit NOT a circle AND NOT small, but it does fit NOT (a circle
AND small). One card where they disagree is enough. They do not mean the same." (Compute the card for each item with
`differences()`, as the ChoiceFeedback already does.)

**How to test mastery.** Same-meaning items for both NOT (A AND B) and NOT (A OR B), right on the first try with no hint.
A "Which card shows these two rules do not mean the same?" item, right.

**Evidence.** `src/content/stop2.ts`:1756-1771 (cards 4 and 5), 2002-2016 (boards), 1917-1925 (`sameDone`), 1291-1380
(`sameMeaningAs`; prompt 1345, hint 1349, `casesTitle` 1360), 457 (`T_SAME`), 527-529 (`bracketTeach` meaning, after a
miss only), 1995-2001 (`bracketDone` contrast already in place); `curriculum.json` s5.l5 "List the cases", s6.l4 "How to
test".

**Reviewer note.** Keep the "Four kinds of card" card and the reason sentence on card 5. Those are cheap and use existing
"things" scenes, and no contrast scene is needed. A scratch board for the same-meaning item fits the existing
`item.scratch`, but the toggle text says "Use the case board" (`ItemView.tsx`:670). A "Same / Not the same" decide mark
is a new option set next to `KEEP_OR_RULE_OUT`. The first diagnostic's right option was first written as "Only if the six
cards have every kind of card for those features", which is too abstract for ages 8 to 12; it now reads "Not for sure.
Check one card of each kind first."

### s2-boards-old-marks-no-diagnosis (P2)

**Location.** Every Stop 2 Do board: s2.l1-do, s2.l1-do-shape, s2.l2-do, s2.l3-do, s2.l4-do, s2.l4-do-or, s2.l4-do-switch
(and s2.l5-do).

**What the learner sees.** Each board keeps the key idea's picture with the OLD rule's check marks and crosses, then
shows rows of the same six cards for a NEW rule: "These are the six cards from the key idea. The ✓ and ✗ marks show “NOT
red.”" / "Now the rule is “NOT blue.” Tap Fits or Not for each card." A wrong check names only the first wrong card (for
example "The big red circle is not blue, so it fits “NOT blue.”"). No board shows "A mix-up to untangle" or an "I’m
confused" button.

**What the program assumes the learner has been taught.** That a mark belongs to one rule, not to the card, so the
picture's marks are no help for the new rule. Also that a learner whose marks follow a wrong reading will see that
reading named, not just one card.

**Likely mix-up.** The learner copies the picture's marks into the row (on L1 board 1 this gives 4 of 6 marks wrong), or
treats a mark as a property of the card ("the big red circle is a cross card"). A misreading of the whole row (OR as one
or the other, AND as either part, only the inside) is answered one card at a time.

**Hidden distinction.** A card's features (never change) vs its mark for a rule (belongs to that rule, so a new rule can
give a new mark); the marks shown for the key idea's rule vs the marks you make for the new rule.

**Hidden steps.** Ignore the picture's marks and check each card's features against the new rule.

**Missing prerequisite.** The "things" scene has no rule label (box scenes have a rule banner). `diagnose()` returns
early unless the layout is `cases` (`drill.ts`:83), so no deck board can carry misconceptions. None of the eight boards
sets misconceptions, confused, scaffold or `afterCard` (read-only probe of `DRILLS`). `TapMark` does not draw
`DrillMark.compare`. ConfusedPanel's closing line is written for the treasure signs.

**Recommended teaching intervention.** Add deck-row kinds to `diagnose()`: `copied-picture` (the row's picks equal the
scene's marks) and `misread`, with a reading from `rules.ts` `evaluateAs` or `reader`. `misread` matches when the picks
equal `pickIds(rule, deck, reading)` for `andAsOr`, `orExclusive`, `orAsAnd`, `deMorgan` or `dropBrackets`. Add `inside`
(the inner rule) and `feature-only` (is the feature) as further readings. Give each board its misconceptions and one or
two confused questions (the wording for each lesson is in the findings above). Frame L1 cards 2 and 3 (red, then NOT
red, on the same six cards) as the first "same cards, new rule" contrast.

**Recommended UI change.** Keep the picture's marks (the See-then-Do design keeps the worked case up), but label them
"Marks for: NOT red", which needs an optional rule on the "things" scene. Draw compare facts in `TapMark` when the
scaffold is full. Make ConfusedPanel's closing text a prop (today it says: "Back to the board: read each sign, then
check its words against the test."). The learner's row already has a rule banner (its title shows "Your turn · Rule: NOT
blue").

**Diagnostic question.** "The check marks in the picture are for which rule?" Options: "NOT red, the key idea’s rule"
(right) / "NOT blue, my rule".

**Targeted remediation.** "You may be treating the picture’s marks and your marks as the same thing. The picture shows
NOT red. Your row is NOT blue. The cards did not change, but the rule did, so check each card again."

**How to test mastery.** After the change, each board is right at the first check, and Try 1 (the twin: the same six
cards with a third rule) is right on the first try.

**Evidence.** `src/game/components/DrillBoard.tsx`:315 (the scene with the key idea's marks), 348-388 (rows), 86-137
(`TapMark`); `src/content/stop2.ts`:1858-1868 (`deckBoard`: `scene: see.scene`), 1964, 1971, 1980, 1989, 1998, 2005, 2013
(board bodies); `src/game/components/SceneView.tsx`:82-92 vs 96; `src/engine/drill.ts`:82-83;
`src/game/components/Distinction.tsx`:139. A read-only probe shows misconceptions 0, confused 0, and scaffold and
`afterCard` undefined on all 8 boards.

**Reviewer note.** The learner's row already carries a rule banner: the title shows "Your turn · Rule: NOT blue". That
UI item was dropped. Do not remove the picture's badges, because the See-then-Do design keeps the worked case up. Label
the picture instead ("Marks for: NOT red"), which needs an optional rule on the "things" scene (both applied above). A
`copied-picture` kind must map scene marks yes or no to row answers fit or not. `dropBrackets` is a Misreading, not a
Reading, so pass it through `reader()` or `pickIds()`, not `evaluateAs()`. Drawing compare in `TapMark` also needs
`CompareRows` label props (s2-rev-2).

### s2-l5-three-rules-load (P2)

**Location.** s2.l5 quiz: Try 1 (twin) and tries 2 to 4 (`guessEasy`, `guessOr`, `guessHard`); stop check items 8 and 9;
Arcade.

**What the learner sees.** "A sticker sorter keeps each sticker that fits its rule (yes). It puts back every other
sticker (no). Which rule is it using?", with 6 to 9 marked stickers and three rules (for example "small / a triangle OR
small / blue OR a triangle"). Hint: "Test each rule on every sticker. One sticker that does not match rules it out."

**What the program assumes the learner has been taught.** That the learner can run the board's one-rule test three
times on 6 to 9 cards, keeping track of which cards each rule fits and which rules are out, with nothing on screen to
hold it.

**Likely mix-up.** The learner stops at the first rule that matches the first few cards (confirming it instead of
hunting for the card that rules it out), or loses track and tests again.

**Hidden distinction.** "Matches the cards I checked" vs "matches every card"; "tested one rule" vs "tested every
choice".

**Hidden steps.** For each choice: 1) For each card, Fits or Not. 2) Compare with the mark. 3) Stop at the first
no-match and cross the rule out. Then answer the one choice left.

**Missing prerequisite.** The Do board tests one given rule ("big"), so the learner first meets choosing among three
rules in the quiz. Guess items have no `workFirst` board and no scratch board, and the scratch toggle text is written
for case boards ("Use the case board").

**Recommended teaching intervention.** Use progressive disclosure. Try 1 (the twin on the worked deck) gets `workFirst`:
a deck board with one `ruleTestRow` per choice, scaffold full. Tries 2 to 4 get `item.scratch` with the same rows,
scaffold light. The stop check gets none. If a guess item is missed, bring the scratch board back on the new example.

**Recommended UI change.** Let the learner cross out a choice, tagged "Ruled out by …". Rename the scratch toggle for
each stop ("Use the test board").

**Diagnostic question.** "How many cards must you check before you keep a rule?" Options: "Every card" (right) / "Until
one card matches".

**Targeted remediation.** "You may be treating ‘it matches the first cards’ as ‘it matches every card’. Keep checking.
One card that does not match is enough to rule a rule out."

**How to test mastery.** Two `guessHard` items right on the first try with the scratch board closed.

**Evidence.** `src/content/stop2.ts`:1458-1520 (`guessOn`: no `workFirst` or scratch), 2033 (L5 generators), 2066-2080
(check), 1940-1955 (the board tests one rule); `src/game/components/ItemView.tsx`:670-674 (scratch toggle text).

**Reviewer note.** `extraQuizItem` skips `workFirst` items, so a `workFirst` on try 1 is safe. The rows can be built with
`ruleTestRow` per choice. Make the toggle text a prop for each stop. The diagnostic is good.

### s2-rev-1 (P2)

**Location.** s2.l5 card 4 "A worked example", the Do board s2.l5-do (the learner's row tests "big"), and the guess
items.

**What the learner sees.** Every worked or drilled mismatch is a yes card that the tested rule does not fit. Card 4 has
the big red square for "blue". The board's learner row has the small blue circle for "big". The done line names both.
The other half of card 2's "Every yes card must fit it. Every no card must not fit it." appears only in words.

**What the program assumes the learner has been taught.** That a rule is also ruled out by a no card it fits.

**Likely mix-up.** A learner who checks only that every yes card fits (a common confirming-only strategy) is never
caught before the quiz. A read-only probe of 800 L5 practice items (seeds 0 to 199) found that in 272 of them, checking
only the yes cards still leaves two of the three choices standing. Example: "a square OR big / blue OR a square / red OR
a square" leaves both "a square OR big" and "red OR a square" standing.

**Hidden distinction.** The rule says yes to every yes card vs the rule matches every mark, so it also says no to every
no card.

**Hidden steps.** For each stopped card, work out the rule. If the rule fits a stopped card, rule it out.

**Missing prerequisite.** No card or board shows a no card that a rule fits, so the "no plus Fits" case is never seen
before the quiz.

**Recommended teaching intervention.** Make the board's learner rule one that only a no card rules out. "a circle OR big"
on the worked deck fits every yes card and is ruled out only by the small yellow circle (a stopped card it fits). Add a
matching mastery item.

**Recommended UI change.** The same "Match?" cell as in s2-l5-mark-vs-fits, so the no-plus-Fits mismatch is shown in
words on the card.

**Diagnostic question.** "The small yellow circle was stopped. The rule “a circle OR big” fits it. Does the rule match
that card’s mark?" Options: "No. The machine said no, and the rule says yes" (right) / "Yes, the rule fits the card" /
"Not sure".

**Targeted remediation.** "A rule must say no to every card the machine stopped too. The small yellow circle was
stopped, but it is a circle, so it fits “a circle OR big.” They do not match, so that rule is ruled out."

**How to test mastery.** A guess item where a wrong choice is ruled out only by a stopped card it fits, right on the
first try with no hint.

**Evidence.** `src/content/stop2.ts`:1776-1803 (card 4), 1927-1956 (`guessBoard`); read-only probe of 800 L5 practice
items.

**Reviewer note.** This was a reviewer's extra finding. It ships with s2-l5-mark-vs-fits, whose reviewer note gives the
same board change.

### s2-rev-2 (P2, build prerequisite)

**Location.** The reusable distinction pieces: `ContrastPanel` (`types.ts`:73), `ContrastView`, `CompareRows`,
`BecauseRows` and `ConfusedPanel` (`src/game/components/Distinction.tsx`), the step reveal in `IdeaCards.tsx`:36,
`diagnose()` in `src/engine/drill.ts`, and the contract test (`stops.test.ts`:409-418). This blocks most fixes in Stops 2
to 7.

**What the learner sees.** Nothing yet. If the pieces were reused on a card puzzle today, the learner would see a "Test
world" tag, "<who> says:" and True or False on a contrast card; "Says / Test / So: Do the words fit the test?" under a
mark; "The words fit the test: True" in a because row; and ConfusedPanel's closing line about signs.

**What the program assumes the learner has been taught.** That sign words such as "test world" and "the words fit the
test" make sense on any board. They make sense only where there are signs and tests.

**Likely mix-up.** Treasure language on a card, line-up, grid, knight or cause puzzle would itself become a hidden
distinction: the learner would look for a sign or a test world that is not there.

**Hidden distinction.** The reusable pieces vs the sign-only labels baked into them.

**Hidden steps.** For builders: give each piece label props before declaring a distinction in a new stop.

**Missing prerequisite.** `ContrastPanel` is text-only (world, who, says, truth, because) with no card picture.
`ContrastView` prints "Test world", "<who> says:" and True or False. `CompareRows` prints "Says / Test / So: Do the words
fit the test?". `BecauseRows` prints "The words fit the test: True". The step-by-step reveal works only for case scenes.
ConfusedPanel's closing line talks about signs. `diagnose()` handles only case boards. The contract test
(`stops.test.ts`:416-418) requires every first-taught declared distinction to have a contrast card and a board tagged
with it, so declaring any proposed Stop 2 to 7 distinction forces this work first. `Distinction.taughtIn` must name a
lesson in the same stop, so cross-stop links (for example to s1.l2 or s7.l1) can only go in card text.

**Recommended teaching intervention.** Start the fix plan with: an optional picture field (a thing or things) on
`ContrastPanel`, plus label props (the world tag, and verdict words such as Fits and Not in place of True and False);
label props on `CompareRows` and `BecauseRows`; a step reveal (or an optional rule label) on "things" and "speakers"
scenes; a closing-text prop on `ConfusedPanel`; and row, deck and grid kinds in `diagnose()`.

**Recommended UI change.** The same list. No visible change until a stop uses the pieces.

**Diagnostic question.** Not a learner question. Builder check: open each new contrast card, compare row and "I’m
confused" panel in a stop other than Stop 1, and confirm that no sign words ("test world", "sign", "the words fit the
test") appear.

**Targeted remediation.** Not a learner text. If sign words appear on a non-sign board, pass that stop's own labels.

**How to test mastery.** The contract test passes for each declared distinction in Stops 2 to 7, and a reading test
finds no sign words in the rendered text of those stops.

**Evidence.** `src/engine/types.ts`:73; `src/game/components/Distinction.tsx`:28-36, 51-56, 63-92, 139;
`src/game/components/IdeaCards.tsx`:36; `src/engine/drill.ts`:82-83; `src/engine/__tests__/stops.test.ts`:409-418.

**Reviewer note.** This was a reviewer's extra finding. Without these props, the Stop 2 to 7 P1 fixes will either fail
the contract test or put treasure words on card puzzles.

### s2-l1-feature-vs-fit (P3)

**Location.** s2.l1 key ideas 2 to 5 ("Sort by one feature", "NOT means everything else", "Check one card at a time")
and Do boards s2.l1-do and s2.l1-do-shape. The same gap carries into the "true or false for a card" words of every later
Teach.

**What the learner sees.** Card 2: "Now each card is in the red group, or it is out. A check mark (✓) shows a card that
is in the group." Card 3 shows the same six cards with every mark flipped: "NOT red means every card that is not red."
Card 5: "Look at one card. Does it have the feature? If it does, NOT leaves it out. If it does not, NOT takes it." Board:
one row, "Rule: NOT blue", with a Fits or Not pair per card. Only after a wrong answer: "NOT means flip the part after
it. True becomes false, and false becomes true." and "Fits means the rule is true for that card.", with rows "It is
red: true" / "It fits “NOT red”: false".

**What the program assumes the learner has been taught.** That the learner keeps the answer to the feature question (Is
it red? yes) apart from the rule's verdict for that card (NOT red: does not fit). Also that "a part is true for this
card" means "the card has that feature", and "fits" means "the rule is true for this card".

**Likely mix-up.** The learner carries card 2's check mark ("it is red") into NOT red and marks or taps the red cards.
This is the quiz's first named misreading: "Your answer takes the red cards, the cards “NOT red” leaves out. NOT flips
the part." Later, the learner reads "It is red: true" as "it fits".

**Hidden distinction.** The card has the feature (the part's answer: yes, it is red) vs the card fits the rule (NOT
red's answer: no). Also two pictures of NOT that are never joined: "everything else" (a group, s2.l1 card 3) and "flip
true and false" (s1.l3 "NOT means the original statement is false", and `T_NOT`).

**Hidden steps.** 1) Ask the feature question. 2) Hold its answer. 3) Flip it. 4) Mark Fits or Not.

**Missing prerequisite.** Card 5 states ask-then-flip in words, but both boards fold it into one Fits or Not tap. The ask
step appears only in the wrong-mark words, for example "The small blue square is blue, so “NOT blue” leaves it out."
Cards 2 and 3 show the same six cards with every mark flipped, but nothing says "the cards did not change, only the rule
did", and the picture has no rule label. "True for a card" first appears on a card in s2.l3 card 2 ("Both parts are
true."). Its definition (`fitsTerm`) and NOT as a flip (`T_NOT`) appear only after a wrong answer, and Stop 1's NOT flip
is never linked.

**Recommended teaching intervention.** Narrowed by the reviewer to the vocabulary bridge. Add one sentence to L2 card 4
or L3 card 2: "A part is true for a card when the card has that feature. The card fits when the whole rule is true for
it." Optionally add on L1 card 5: "NOT flips the answer, just like in Stop 1." Label each picture with its rule (an
optional rule on the "things" scene) and add "Same cards. Only the rule changed." to card 3. The auditor also proposed a
declared distinction `has-vs-fits`, a contrast card made from cards 2 and 3, scaffold full on s2.l1-do with compare facts
("Rule asks: is it blue? This card: red"), and a new deck kind `feature-only`; the reviewer advises against the contrast
scene (see below).

**Recommended UI change.** Label every key-idea picture with the rule its marks show, like the rule banner on box scenes
("Marks for: NOT red"). On the first board, show a small "Is it blue? Yes or No" line under each card before Fits or
Not: given for two cards, then tapped by the learner. This needs `TapMark` to draw `DrillMark.compare`.

**Diagnostic question.** Q1: "Look at the big red circle. Is it red?" Options: "Yes" (right) / "No". Q2: "Does the big
red circle fit NOT red?" Options: "Yes, it is red" / "No: it is red, so NOT leaves it out" (right).

**Targeted remediation.** "You may be treating ‘the card is red’ and ‘the card fits NOT red’ as the same thing. First ask:
is it red? Yes. Then NOT flips that answer, so it does not fit NOT red. The card stays the same. Only the rule changed."

**How to test mastery.** A not-tap item in a story skin with at least two cards of the named value, right on the first
try. A not-means item, right on the first try. On a light board (no compare facts), every Fits or Not right at the first
check.

**Evidence.** `src/content/stop2.ts`:1628-1658 (cards 2 to 5), 1961-1975 (L1 boards), 453 (`T_NOT`), 460 (`fitsTerm`),
466-483 (`notTeach`), 746 (named misreading), 1701-1706 (first "true" on a card, L3); `curriculum.json` s1.l3 "What NOT
means"; `src/game/components/SceneView.tsx`:82-92 (things scene, no rule label) vs 96 (rule banner on boxes);
`src/game/components/DrillBoard.tsx`:86-137.

**Reviewer note.** Narrow it to the vocabulary bridge (applied above). Do not turn cards 2 and 3 into a contrast scene:
`ContrastView` cannot draw cards and would lose the six-card pictures. Cards 2 and 3 already form a same-cards, new-rule
pair. Label each picture with its rule and add "Same cards. Only the rule changed." to card 3. That belongs with
s2-boards-old-marks-no-diagnosis.

### s2-l3-or-count-once (P3)

**Location.** s2.l3 quiz item s2.or-count (lesson try 5, stop check, Arcade); key ideas 2 "Both parts true counts too"
and 4 "OR makes a bigger group".

**What the learner sees.** Prompt: "A magic door opens for every gem that is a square OR small, and for no other gems.
How many of these gems open it?" Choices: "1 / 3 / 4". Hint: "Did you count the gems that fit both parts? Here is one
gem, checked for you." In another or-count item (choices 1, 2, 4 and 5), the explanation reads: "In all, 5 cards fit “a
square OR red.” That includes 1 card that fits both parts."

**What the program assumes the learner has been taught.** That the learner counts cards, not "yes" answers: a card that
fits both parts is one card and counts once.

**Likely mix-up.** The learner counts the squares, counts the red cards and adds the two, so a red square is counted
twice. The hint "Did you count the … that fit both parts?" can push a learner who already counted those cards to count
them again.

**Hidden distinction.** How many cards fit vs how many part-checks said yes (a card that fits both parts gets two yeses
but is one card).

**Hidden steps.** Go through the cards once and count each fitting card once (or count A, add B, then take away the
cards in both).

**Missing prerequisite.** No card teaches this. The only place is the real-life line "A kid in both clubs gets just one
badge, so she counts once." The distractors are the one-or-the-other count, the both-parts count and the first part's
count. The sum of the two part counts is never offered, so this mix-up is never diagnosed.

**Recommended teaching intervention.** Add a line to card 4 ("OR makes a bigger group") using the OR deck: "big OR red:
3 big cards and 2 red cards. 3 plus 2 is 5, but the big red circle is in both groups. It is one card, so it counts once:
4 cards fit." Add a `CountWrong` candidate equal to the two part counts added, with its own ChoiceFeedback. Headline:
"Your answer counts the big red circle twice." Example card: the big red circle with the truths "It is big: true / It
is red: true / It fits “big OR red”: true" and the note "One card. It counts once." Change the hint to: "Count each card
once. Did you include the ones that fit both parts?"

**Recommended UI change.** On lesson count items, let the learner tap cards to count them, using the tap-all "N chosen"
counter, so each card can only be counted once.

**Diagnostic question.** "The big red circle is big, and it is red. How many times does it count for big OR red?"
Options: "Once: it is one card" (right) / "Twice: it fits two parts".

**Targeted remediation.** "You may be treating ‘parts that fit’ and ‘cards that fit’ as the same thing. The big red
circle fits two parts, but it is one card. It counts once."

**How to test mastery.** Two or-count items that offer the sum as a choice, both right on the first try with no hint.

**Evidence.** `src/content/stop2.ts`:1083-1131 (`orCount`; candidates 1101 xor, 1109 `nBoth`, 1117 `nA`; hint 1126),
1701-1706, 1717-1721; `src/content/world/s2.ts`:87. The read-only probe item shows choices "1 / 3 / 4".

**Reviewer note.** The first draft's "what the learner sees" mixed two items: the quoted explanation came from an item
with choices 1, 2, 4 and 5, not the gem item with 1, 3 and 4 (corrected above). The hint rewrite and the added sum
candidate are the right cheap fixes. `countChoices` can show up to 4 values, so adding the sum may push out another
distractor. List it after `nBoth`.

### s2-l4-not-scope (P3)

**Location.** s2.l4 key ideas 1 "Brackets group parts" and 3 "NOT red AND NOT big"; the wrong-answer words of quiz items
s2.not-both and s2.not-either; the lesson's real-life line.

**What the learner sees.** Card 1: "Brackets, also called parentheses, look like this: ( ). They hold parts of a rule
together. Always work out the part inside the brackets first." Feedback for an answer that skips the brackets: "Your
answer puts the NOT on “red” alone. It takes the cards that fit “NOT red AND big.” But the NOT covers the whole bracket,
“red AND big.”" Real-life line: "Typed without brackets, NOT red OR blue lets blue shirts in too."

**What the program assumes the learner has been taught.** What a NOT covers: with brackets, everything inside them;
without brackets, only the one word right after it.

**Likely mix-up.** The learner thinks a NOT reaches as far as it likes (reads NOT red AND big as NOT (red AND big)), or
reads NOT (red AND big) as a NOT on red only.

**Hidden distinction.** A NOT on one word (NOT red AND big: only "red" is flipped, "big" stays) vs a NOT on a bracket
(NOT (red AND big): the whole inside is flipped).

**Hidden steps.** Before checking a card, find what each NOT covers, then flip only that.

**Missing prerequisite.** No card states this rule; card 3 shows it only by example. The code itself notes that this
rule shape is untaught ("Never a NOT on one part only (“NOT red AND big”): no lesson teaches that rule."), yet the
feedback and the real-life line both use it.

**Recommended teaching intervention.** The smaller fix: rewrite the skipped-bracket feedback without the untaught rule:
"Your answer flipped only “red”. The NOT covers the whole bracket, “red AND big.”" Then add the card's reason for each
card. The auditor's larger option, a sentence on card 1 plus a contrast card with the small red square in both panels
("NOT (red AND big)": the inside is false and NOT flips it, so it fits; "NOT red AND big": NOT red is false, so it does
not fit; ask "Did the card change? No. Only where the brackets are."), is not worth it at this priority.

**Recommended UI change.** In rule labels, underline how far each NOT reaches (from the NOT to the end of what it
covers), so NOT (red AND big) and NOT red AND NOT big look different at a glance.

**Diagnostic question.** "In NOT (red AND big), what does the NOT flip?" Options: "Only red" / "The whole bracket: red
AND big" (right). Teach: "With brackets, NOT flips everything inside. Without brackets, NOT flips just the next word."

**Targeted remediation.** "You may be treating a NOT on one word and a NOT on a bracket as the same thing. In NOT (red
AND big), the NOT covers ‘red AND big’. The small red square is not big, so the inside is false, and NOT makes it fit."

**How to test mastery.** A not-both tap item whose skipped-bracket set differs from the answer, right on the first try.
A choose item, "Which rule leaves out the small red square: NOT (red AND big) or NOT red AND big?", answered right.

**Evidence.** `src/content/stop2.ts`:1194-1197 (`notOnOnePart`), 1220, 1243 (`dropBrackets` misreading), 1310 (comment),
1733-1738, 1748-1754; `src/engine/puzzles/rules.ts`:144-145 (`withoutBrackets`), 204 ("NOT binds tightest");
`src/content/world/s2.ts`:36.

**Reviewer note.** The smaller fix is the right one. Rewrite `notOnOnePart` without naming the untaught rule, then add
the card's reason for each card. Rephrase `world/s2.ts`:36 so it does not rely on reading NOT's scope (for example
"Without brackets, the search reads the NOT on red alone, so blue shirts get in too."). A contrast card is not worth it
at this priority.

### s2-group-size-claims (P3)

**Location.** s2.l2 key idea 3 "AND makes a smaller group"; s2.l3 key idea 4 "OR makes a bigger group".

**What the learner sees.** "AND makes a smaller group" / "Each part of an AND rule leaves some cards out. So the AND group
is never bigger than either part on its own." and "OR makes a bigger group" / "So the OR group is never smaller than
either part on its own."

**What the program assumes the learner has been taught.** That the learner reads the body's "never bigger" (it can be the
same size) over the title's "smaller", and reads "either part" as "each part".

**Likely mix-up.** The learner takes the titles literally: AND always removes cards and OR always adds some. In a lesson
about OR, "either" can be read as "one of the parts".

**Hidden distinction.** "Smaller" vs "never bigger" (the group can be the same size); "either part" (meaning each one) vs
"one part or the other".

**Hidden steps.** Compare the AND (or OR) group with each part's own group on the cards shown.

**Missing prerequisite.** No example shows an AND group equal to one of its parts (for example when every red card on
the table is also a circle). The line "Each part leaves some cards out" is also not always true.

**Recommended teaching intervention.** Retitle the cards "AND can only keep or cut cards" and "OR can only keep or add
cards". Replace "either part" with "each part". Fix the bodies' first sentences too: "An AND rule can only keep cards or
cut them out, never add any." Optionally add one picture where the AND group equals one of its parts.

**Recommended UI change.** No change needed beyond the words.

**Diagnostic question.** "Can red AND a circle fit as many cards as red does?" Options: "Yes, if every red card is also a
circle" (right) / "No, AND always makes it smaller".

**Targeted remediation.** "AND can never add cards, but it does not always take some away. If every red card is a
circle, red AND a circle fits all of them."

**How to test mastery.** A "Which group is bigger, or are they the same?" item on a deck where every red card is a
circle, answered right.

**Evidence.** `src/content/stop2.ts`:1678-1682, 1717-1721; `src/content/world/s2.ts`:71.

**Reviewer note.** Use the retitles and "each part" as given. Fix the bodies' first sentences too (added above). A
picture where the AND group equals one part is optional at P3.

### s2-l4-second-not-flip-missing (P3)

**Location.** The wrong-mark words on the s2.l4 Do board s2.l4-do-switch (rule "NOT blue OR NOT small"). Only this board
is affected.

**What the learner sees.** For the small blue triangle on the switch board: "The small blue triangle is blue, and it is
small. So “NOT blue” is false. No part of “NOT blue OR NOT small” is true, so it does not fit." The flip of the second
part ("So “NOT small” is false.") is never said.

**What the program assumes the learner has been taught.** That the learner does the second flip without help: "it is
small", so "NOT small is false".

**Likely mix-up.** The learner takes "it is small" to mean the part is true (forgetting the NOT on the second part), so
"No part … is true" looks wrong.

**Hidden distinction.** The feature is true (it is small) vs the NOT part is true (NOT small is false).

**Hidden steps.** Flip each NOT part on its own before joining the parts.

**Missing prerequisite.** `whyFits` gives a flip sentence for the first NOT part only (`const neg = [f.a,
f.b].find((p) => p.op === 'not')`). The simpler steps (`ask()`) do both flips.

**Recommended teaching intervention.** Give each NOT part its own flip sentence in `whyFits`, as `ask()` already does
("Is it small? Yes. So “NOT small” is false.").

**Recommended UI change.** No change needed.

**Diagnostic question.** "The card is small. Is the part NOT small true?" Options: "Yes" / "No: it is small, so NOT
small is false" (right).

**Targeted remediation.** "Each NOT flips only its own part. It is small, so “NOT small” is false."

**How to test mastery.** The switch board is right at the first check.

**Evidence.** `src/content/stop2.ts`:388-393 (`whyFits`, first NOT only), 304-309 (`ask()` flips each part). A read-only
probe of `DRILLS` gives the words above for s2.l4-do-switch (small blue triangle).

**Reviewer note.** The first draft's evidence was partly wrong (corrected above). On s2.l4-do-r2 the small blue triangle
reads "Both parts of “NOT blue AND NOT small” are false", which states it. No quiz item uses a rule with two NOT parts:
`TAUGHT_POOL` excludes them, and `sameMeaningAs`'s feedback uses `partsNote` and its own lines, not `whyFits`. So the only
affected text is the s2.l4-do-switch board. The fix stands: a flip sentence for each NOT part, as `ask()` does.

## Stop 3: Line Up

### s3-l3-try-vs-one-line (P1)

**Location.** s3.l3 card "Try each spot"; boards s3.l3-do, s3.l3-do2 and s3.l3-do3 (every trial row); the quiz hint and
Teach for every `spotPuzzle` item; the same inference in the s3.l1 quiz hint.

**What the learner sees.** Card: "Try Eli first. That makes the first clue false. We say it breaks the clue. Try Eli
last. That breaks the second clue." Board rows: "Try Cal second, as in Ava, Cal, Ben.", then "Clue 1 … True / False" and
"Keep or cross out?". Quiz hint: "Try Kofi in each spot. Cross out any spot that breaks a clue." Teach rule: "Try Kofi in
each spot. Cross out any spot that breaks a clue. If one spot is left, that is the answer." Teach cases: "Kofi finished
first here, but clue 2 is false." L1 hint: "Here is one try, checked for you … Frost has the longest wings here, but clue
1 is false. So cross out Frost."

**What the program assumes the learner has been taught.** That a try (one person pinned in one spot) covers many lines,
and a spot is crossed out only when every line with that person there breaks a clue. So you first move the others to
try to keep every clue true.

**Likely mix-up.** The learner takes "the line I wrote with Kofi second breaks a clue" to mean "Kofi can't be second".
Stop 1 trained this: in s1.l4, "Pretend the treasure is in one chest. That is your test." One pretend is one complete
world. Here, "try Kofi second" leaves several worlds. A real quiz item (seed 5, try 3): "Fay, Kofi, Tia and Vic wait in
the lunch line. Counting from the front, where is Kofi in line?" Clues: "Kofi and Tia are next to each other." "Tia is
not last in line." The answer is Can't tell. A learner who writes Fay, Kofi, Vic, Tia for "second" sees both clues false
and crosses out a spot that Fay, Kofi, Tia, Vic keeps. They end with too few spots and pick a single spot.

**Hidden distinction.** Trying a spot (X pinned; the others can still move) vs one line you wrote with X in that spot.
Put another way: one example breaks a clue vs no arrangement can keep every clue true.

**Hidden steps.** 1) Pin X in the spot. 2) Arrange the others to try to keep every clue true. 3) Mark each clue. 4) If
one breaks, move the others (not X) and check again. 5) Cross out only when no arrangement works, or when the broken
clue is about X's spot itself ("not first"). 6) Otherwise keep the spot.

**Missing prerequisite.** "Move the others before you cross out a spot" is taught nowhere in s3.l3. Every line on the
boards is picked by the engine: `trialRow` calls `closest()`, which returns the line that breaks the fewest clues, so
each shown try is already the best line. On s3.l3-do (not first or not last) and s3.l3-do2 (next to, 3 runners) the
spot alone decides. On s3.l3-do3 (between) the arrangement does matter: "Ava first" has a breaking line (Ava, Ben, Cal)
and a fitting one (Ava, Cal, Ben), and "Ben first" too. But `closest()` hides the breaking line, so the boundary is
never met. The right idea ("Every order where Eli finished first makes clue 1 false") appears only as the message for a
wrong Keep. s3.l4 card "Test and fix" ("Then move someone and check again") comes a lesson later and is about building,
not ruling out.

**Recommended teaching intervention.** Declare `LessonDef.distinctions` `{id: 'try-vs-line', a: 'Trying a spot: X is
pinned there; the others can still move.', b: 'One line you wrote with X there.'}`. Add a contrast card (Scene
`contrast`) before the boards. Both panels pin Kofi second. Panel 1: world "Kofi second: Fay, Kofi, Vic, Tia", who
"Clue 1", says "Kofi and Tia are next to each other.", False, because "Vic stands between Kofi and Tia." Panel 2: world
"Kofi second: Tia, Kofi, Fay, Vic", True, because "Tia and Kofi stand side by side." Ask: "Did Kofi move? No. What
changed? Only the others. So one broken line does not cross out the spot." For the board, follow the reviewer note: make
the s3.l3-do3 shown row two steps, and make the learner's row a two-step row too. Change every rule and hint from "Cross
out any spot that breaks a clue" to "Cross out a spot only when no way of placing the others keeps every clue true." Add
confused questions on the board and on `Item.confused` for L3 items. A new misconception kind for line boards,
`cross-too-soon` (Cross out marked while the pinned spot has a fitting line), needs `diagnose()` support for row boards
first.

**Recommended UI change.** A later step: a new "try" row kind for DrillBoard that pins X in spot k on a small line,
reusing the order item's slot picker (`ItemView` `.play-slots`) and the live clue ticks (`liveClueStates`), then asks
Keep or Cross out. Show a test-world banner on the row: "Testing: Kofi is second. The others can move." Give
`spotPuzzle` Teach cases the label "Best try with Kofi second", and on crossed-out cases add "No way of placing the others
fixes clue 2." For the L1 hint, show the clue that crosses the person out instead of a whole line. If ConfusedPanel is
reused, its closing line is sign-specific ("read each sign, then check its words against the test",
`Distinction.tsx`:139) and must take text for each board.

**Diagnostic question.** Q1: "You tried Kofi second, and your line broke a clue. Can you cross out ‘second’ now?"
Options: "Yes, one broken clue is enough." / "Not yet. First try moving the others." (right) / "Not sure." Q2: "Fay,
Kofi, Vic, Tia and Tia, Kofi, Fay, Vic. Did Kofi move?" Options: "Yes." / "No. Only the others moved." (right).

**Targeted remediation.** "You may be treating one line you tried as every line with Kofi second. Those are not the same.
Kofi stays second, but the others can move. Fay, Kofi, Vic, Tia breaks clue 1. Tia, Kofi, Fay, Vic keeps every clue
true. So Kofi could be second. Cross out a spot only when no way of placing the others works."

**How to test mastery.** Two 4-runner items in different skins, scaffold light, right on the first try with no hint. In
each, the first natural line for the tried spot breaks a clue but a rearrangement fits, and the answer is Can't tell or a
spot that a one-line check would cross out. Pair them with one item where the spot really is ruled out, to check the
learner still crosses out when every arrangement fails. On the board, the learner must name the fitting line before Keep
is accepted.

**Evidence.** `src/content/stop3.ts`:513-521 (card "Try each spot"), 234-285 (`L3_DRILL`; 240 "Then keep the try or
cross it out."), 244-246, 260-262, 277-279; `src/engine/puzzles/lineup.ts`:1819-1845 (`trialRow`; 1826 `closest()`;
1837-1838 why "Every order where …"), 462-475 (`closest`), 1309 and 1323 (hints), 1426-1428 (Teach rule), 613-616
(`tryNote`), 918-919 (L1 hint), 1366-1386 (multi-clue explanation only after a miss); `src/content/stop1.ts`:1131-1134
(s1 "Pretend the treasure is in one chest. That is your test."); `src/content/stop3.ts`:571-577 (L4 "Test and fix");
`src/engine/drill.ts`:83 (`diagnose` is case-board only).

**Reviewer note.** The first draft said the spot alone decides on all three boards; that is wrong for s3.l3-do3
(corrected above). With the between clue, "Ava first" has a breaking line (Ava, Ben, Cal) and a fitting one (Ava, Cal,
Ben), and "Ben first" likewise (Ben, Ava, Cal vs Ben, Cal, Ava). `closest()` hides the breaking line. So the boundary
already exists on a 3-runner board, and no new 4-runner twin board or slot-picker row is needed for the first fix. Make
the shown row "ava1" two steps: "Try Ava first, as in Ava, Ben, Cal", clue 1 False, then "Move the others, not Ava. Which
line keeps Ava first and every clue true?" with tap options as `coverRow` does (Ava, Cal, Ben / No line works), then
Keep. Make "ben1" the learner's own two-step row. Change `trialRow`'s note to the `killers()` wording: "Every line with
Eli first makes clue 1 false. So Eli can’t have finished first." Label hint and Teach cases "Best try with Kofi second".
Rewrite the who-hint "Cross out anyone who breaks a clue" (`lineup.ts`:1323, 1428): a person does not break a clue;
putting them in that spot does. Scaffold full and MethodSteps render only in CaseBoard (`CaseBoard.tsx`:238, 312).
DrillBoard's row layout ignores both, and `diagnose()` is case-board only (`drill.ts`:83). So `cross-too-soon` and the
method strip both need engine and UI work first.

### s3-l1-chain-vs-fork (P1)

**Location.** s3.l1 cards "Follow the chain" and "When you can’t tell"; board s3.l1-do row "nochain"; quiz try 2 (always
a fork) and every can't-tell explanation.

**What the learner sees.** Card 2: "Ava is taller than Ben. Ben is taller than Cal." / "So Ava must be taller than Cal
too. No clue says it, but the two clues prove it." Card 4: "Ava is taller than Ben. Cal is taller than Ben. Who is the
tallest?" / "Ava might be. Cal might be. No clue compares Ava and Cal." Board row: "Take away clue 2 … Only clue 1 is
left: “Cal is taller than Ava.”" with the note "No clue names Ben. So no clue compares Ben with anyone." Quiz explanation:
"Cinder and Moss could each have the longest wings. No clue compares them, so you can’t tell."

**What the program assumes the learner has been taught.** That the learner can tell a chain (the middle person is
shorter in one clue and taller in the other) from a fork (two people both taller than the same person). Also that "no
clue compares them" means "not even through a chain".

**Likely mix-up.** In card 2 and in card 4, no clue compares Ava and Cal. Card 2 decides and card 4 can't tell. The
learner takes "no clue names these two" as "nothing links these two". Either they say Can't tell on a chain, or,
reading the clues in order, they join a fork into a chain ("Ava is taller than Ben, Cal is taller than Ben", so "Ava,
Cal, Ben") and answer Ava.

**Hidden distinction.** Linked by a chain (A is taller than B, and B is taller than C) vs not linked: a fork (A and C
are both taller than B) or two separate chains. "No clue compares them directly" is not "nothing links them".

**Hidden steps.** For the people left at the end the question asks about, look for a path. Does one clue put X above
someone whom another clue puts above Y? If yes, they are linked and you can tell. If both are only above the same
person, or in separate chains, they are not linked: Can't tell.

**Missing prerequisite.** The fork is shown only on card 4, as a clue list with no picture of the two lines that fit.
The board's can't-tell row has a different shape: a person who is in no clue ("No clue names Ben"). But quiz try 2 is
always the fork. `chainPuzzle` keeps only clue sets that name every person (`lineup.ts`:801), and with 3 people and 2
clues the only can't-tell for "first" is two people above the same one. So the `stop3.ts` comment "Try 2 is a twin of
the board’s non-chain" is not true of the reasoning. Card 2 and card 4 differ by one flipped clue ("Ben is taller than
Cal" vs "Cal is taller than Ben") but are never shown side by side.

**Recommended teaching intervention.** Declare `{id: 'chain-vs-fork', a: 'A chain: the middle person is shorter in one
clue and taller in the other.', b: 'A fork: two people are both taller than the same person.'}`. Add a contrast card
after card 4: same names, one clue flipped. Panel 1: world "Clues: Ava is taller than Ben. Ben is taller than Cal.",
says "Ava must be the tallest.", True, because "Ben links them: Ava, Ben, Cal." Panel 2: world "Clues: Ava is taller than
Ben. Cal is taller than Ben.", says "Ava must be the tallest.", False, because "Both are taller than Ben. Nothing links
Ava and Cal, so Cal could be the tallest." Ask: "Did the people change? No. What changed? Clue 2 turned around. Now both
clues point down to Ben." Add a fork row to s3.l1-do (both clues name everyone): a compare mark "Who is taller, Ava or
Cal?" (Can't tell) and a who mark (Can't tell). Add a new row-board misconception kind `fork-linked`: on the fork row, a
name chosen where the chain row's same question was decided. Put the mix-up line first in the ChoiceFeedback for a name
picked on a fork item.

**Recommended UI change.** Show the two lines that fit the fork under card 4 (Ava, Cal, Ben and Cal, Ava, Ben). This
needs a scene with two or more lines: `lineScene` draws one line only (a new Scene kind, or reuse contrast). Change the
explanation text in `lineup.ts`:884 and `stop3.ts`:386 from "No clue compares them" to "No clue, and no chain of clues,
links them."

**Diagnostic question.** Q1: "Ava is taller than Ben. Cal is taller than Ben. Is there a chain from Ava to Cal?" Options:
"Yes, through Ben." / "No. Both are taller than Ben, so Ben does not link them." (right). Q2: "Ava is taller than Ben. Ben
is taller than Cal. Who is taller, Ava or Cal?" Options: "Ava." (right) / "Can’t tell: no clue compares them."

**Targeted remediation.** "You may be treating ‘no clue names these two’ as ‘nothing links them.’ Look at Ben. In a
chain, Ben is shorter than one and taller than the other: Ava, Ben, Cal. In a fork, Ben is shorter than both. Ava and Cal
are each taller than Ben, so either one could be the tallest."

**How to test mastery.** A pair with the same names and one flipped clue (a chain and a fork), in two skins, both right on
the first try. Then a 4-person can't-tell with two separate chains, and a 4-person chain where the two ends are named by
no single clue.

**Evidence.** `src/content/stop3.ts`:363-371, 381-389, 127-133, 154-159, 400-403; `src/engine/puzzles/lineup.ts`:801,
806, 882-885, 1917.

**Reviewer note.** Also reword `stop3.ts`:161 ("When no chain of clues links two people, you can’t tell") and
`lineup.ts`:662, not only 884 and `stop3.ts`:386. The contrast card fits `ContrastPanel` as proposed (same names, clue 2
flipped). The fork row on s3.l1-do can reuse `L1_CANT` (compare mark Ava and Cal: Can't tell; who mark 1: Can't tell).
This puts the quiz-try-2 shape on the board, which the "Ben is in no clue" row does not. The `fork-linked` misconception
needs `diagnose()` support for row boards (`drill.ts`:83). Fix the `stop3.ts`:401-402 code comment.

### s3-l4-no-spot-clue-strategy (P1)

**Location.** s3.l4 card "Start with sure things"; boards s3.l4-do and s3.l4-do2; quiz tries 2 and 3 (4 and 5 people).

**What the learner sees.** Card: "Look for a clue that names a spot, like first or last. Start by putting that person in
that spot. Then use the other clues to fill in the gaps." Both boards have 3 runners and a spot clue. Quiz try 3 (seed
5): "Ben, Jin, Kofi, Nia and Wes wait in the lunch line." Clues: "Nia is somewhere in front of Jin." "Ben is somewhere
between Jin and Kofi." "Wes and Ben are next to each other." "Ben is somewhere in front of Nia." "Kofi and Ben are next to
each other." Hint: "Find who must be first in line. Then place the rest one by one."

**What the program assumes the learner has been taught.** That the learner has a way to start when no clue puts anyone in
a spot, can treat "right before" and "next to" pairs as blocks, and can combine two next-to clues on one person, with 4
or 5 people and 3 to 6 mixed clues.

**Likely mix-up.** The learner takes "a sure thing" to mean only "a clue that names a spot". With no such clue, they
think there is no place to start and guess lines at random. Or they apply L1 crossing out to next-to and between clues,
which say nothing about who is ahead.

**Hidden distinction.** A spot a clue gives directly vs a spot the clues prove together (for example, Ben is next to Wes
and next to Kofi, so Ben stands between them; or no one is ahead of Kofi).

**Hidden steps.** If no clue names a spot: 1) Cross out with the "before" clues to find an end. 2) Join right-before and
next-to pairs into blocks. 3) A person next to two people goes in the middle of them. 4) Place the blocks using between
and before. 5) Test each clue (live ticks). 6) Fix.

**Missing prerequisite.** Over 300 seeds, 205 of 300 try-2 and 202 of 300 try-3 items have no clue that names a spot. 151
and 199 of 300 have next-to or right-before clues; 109 and 176 of 300 have between. Even try 1, described as using the
board's clue kinds, has no spot clue in 159 of 300 (a plain chain). The "no spot clue" start, blocks, and combining two
next-to clues are taught nowhere. The remember line "Start with who must be first in line" assumes L1 crossing out, which
works only with "before" clues. L4 has no pass rule of its own, so it uses the default (3 right on the first try), and
`extraQuizItem` keeps adding L4 items until that is met.

**Recommended teaching intervention.** Add a second worked example card, "No clue names a spot": 4 runners, a chain plus a
next-to pair, with each step shown one at a time. (Scene `cases` steps exist only for case boards, so a line-up step scene
is needed.) Add a card "Pairs stick together": right before and next to make a block of two; someone next to two people
stands between them. Add a third board: build a 4-person line with no spot clue, scaffold full with MethodSteps: Sure
spot? Pairs as blocks. Place. Check each clue. Fix. Order the quiz so try 2 is 4 people with a spot clue and try 3 is 4
people without one; leave 5 people to extra items or the Arcade.

**Recommended UI change.** Show the MethodSteps strip above the order builder for L4 tries 1 and 2 in learn mode. For
items with no spot clue, make the hint show the first real deduction (for example "Kofi and Wes are both next to Ben, so
Ben is between them"), not a line made from the pool order. Let a pair be dropped into the slots as a block (a new
interaction).

**Diagnostic question.** Q1: "No clue says who is in a spot. What can you do?" Options: "Guess lines until one works." /
"Use the clues together: find who no one is ahead of, or join pairs that must stand together." (right). Q2: "Wes and Ben
are next to each other. Kofi and Ben are next to each other. Where is Ben?" Options: "At one end." / "Between Wes and
Kofi." (right).

**Targeted remediation.** "You may be waiting for a clue that names a spot. Some lines have none. Then find a sure thing
the clues prove together. Ben is next to Wes and next to Kofi, so Ben stands between them: Kofi, Ben, Wes or Wes, Ben,
Kofi. ‘Ben is somewhere between Jin and Kofi’ puts Kofi ahead of Ben. So start with Kofi, Ben, Wes."

**How to test mastery.** After the new board, 4-person and then 5-person builds with no spot clue, right on the first try
with no hint, in two skins. Then the stop check items c7 and c8.

**Evidence.** `src/content/stop3.ts`:554-560, 296-322, 585-588; `src/engine/puzzles/lineup.ts`:1511-1514 (`forceClues`,
any taught types), 1520 (anchor), 1537-1542 (remember), 1559-1561 (hint); measured with a 300-seed sample of
`stop3.lessons[3].practice`.

**Reviewer note.** The first draft said all three tries must be right on the first try; that is wrong (corrected above).
The default pass is 3 first-try answers, and `extraQuizItem` adds more L4 items until that is met (`drill.ts`:164, 213).
MethodSteps do not render on order items or DrillBoard rows today. Putting a spot clue in try 2 needs a new
`buildPuzzle` option, since `forceClues` cannot require an anchor. Make the no-anchor hint name the first real step (for
example "Kofi and Wes are both next to Ben, so Ben stands between them") instead of "Find who must be first".

### s3-l2-cant-be-true-vs-cant-tell (P2)

**Location.** s3.l2 card "Must, might, can’t"; the status rows on boards s3.l2-do and s3.l2-do2; every L2 quiz item; the
same word in L1 and L3 (the "Can’t tell" choice vs notes such as "So Eli can’t have finished first.").

**What the learner sees.** L2 choices: "Must be true | Might be true | Can’t be true". L1 and L3 choices end with "Can’t
tell", and L1 card 4 says: "So the right answer is “Can’t tell.” That is a real answer. It is not giving up." L2 card:
"It can’t be true if it is true in none of them." L3 board notes: "Clue 1 is false here. So Eli can’t have finished
first."

**What the program assumes the learner has been taught.** That the learner keeps "can't tell" (the clues leave it open)
apart from "can't be true" and "can't have finished" (the clues rule it out). Also that they map s1.l2's True, False and
Can't tell onto Must, Can't and Might.

**Likely mix-up.** The shared word "can't". A learner who has just learned that "Can't tell is a real answer" reads
"Can't be true" as "can't tell if it is true". They pick it for might items, especially the before-trap ("I can't be
sure Volt is right in front of Zap"). Or they pick Might for a can't item ("it might be, I can't tell").

**Hidden distinction.** Can't tell: the orders that fit disagree, so the answer is unknown. Can't be true: every order
that fits makes it false, so it is known to be false. In this lesson, "Might be true" is the can't-tell answer.

**Hidden steps.** After the tally: none true means Can't be true; some true and some false means Might be true (that is,
can't tell); all true means Must be true. Mapping from s1.l2: True to Must, False to Can't, Can't tell to Might.

**Missing prerequisite.** The card defines each label but never sets "Can't be true" against "Can't tell". It never links
Must, Might and Can't to s1.l2, whose card "Try every way" is the same method ("If they could make it true and could also
make it false, you can’t tell yet"). After a miss, the feedback for Can't on a might item says "Your answer says the
sentence is never true…". That explains the label but does not name the mix-up.

**Recommended teaching intervention.** Declare `{id: 'cant-tell-vs-cant-be', a: 'Can’t tell: the orders that fit
disagree.', b: 'Can’t be true: every order that fits makes it false.'}`. Add a bridge card after "Must, might, can’t":
"Words you know: True becomes Must be true. False becomes Can’t be true. Can’t tell becomes Might be true." Add a contrast
on board s3.l2-do's clue: "Cal finished before Ben" is true in Cal, Ava, Ben and false in Ava, Ben, Cal, so Might (the
clues can't tell). "Ben finished before Ava" is false in all three, so Can't be true. The existing two-panel contrast holds
only True or False, so either show rows for each order or extend `ContrastPanel` with a "some / none" result. Add a new
misconception kind for status marks, `cant-for-might`: the learner's own marks show some orders true, but they chose
Can't. Put the mix-up line first in `ChoiceFeedback.cant` on might items.

**Recommended UI change.** Under the status options on L2 boards and on quiz try 1, add a legend: "Must: true in every
order that fits. Might: the orders disagree, so you can’t tell. Can’t: false in every one." Optionally relabel the option
"Can’t be true (false every time)".

**Diagnostic question.** Q1: "In some orders that fit, the sentence is true. In others it is false. Which answer is that?"
Options: "Can’t be true." / "Might be true." (right) / "Must be true." Q2: "‘Can’t be true’ means…" Options: "We can’t tell
if it is true." / "It is false in every order that fits." (right).

**Targeted remediation.** "You may be reading ‘Can’t be true’ as ‘can’t tell.’ They are opposites. ‘Can’t be true’ means
you can tell: it is false in every order that fits. When the orders disagree, the answer is ‘Might be true’. That is this
lesson’s way to say ‘can’t tell.’"

**How to test mastery.** Pairs of items with the same clues, one might and one can't, both right on the first try. Then a
mixed set of three statuses where the learner also matches each to Stop 1's True, False and Can't tell. No Can't and
Might swaps on the board status rows.

**Evidence.** `src/engine/puzzles/lineup.ts`:32 (`CANT_TELL`), 998-1002 (`STATUS_CHOICES`), 1129-1133, 1158-1166,
1841-1843 (note "can’t have finished"); `src/content/stop3.ts`:381-388, 449-456, 189, 205; `src/content/stop1.ts`:1043-1046
(s1.l2 "Try every way").

**Reviewer note.** The s1.l2 mapping is correct: True to Must, False to Can't be true, Can't tell to Might. A one-line
bridge on the "Must, might, can’t" card is the cheapest, highest-value change. Relabelling the option is optional. The
status-row misconception needs `diagnose()` to support row boards first. Optionally change the L3 trial notes from
"can’t have finished first" to "is ruled out of first", so "can't" does not sit beside the Can't tell button with
another meaning.

### s3-l2-all-orders-vs-orders-that-fit (P2)

**Location.** s3.l2 card "Must, might, can’t"; board s3.l2-do2 (the status row after testing fit); L2 quiz must and can't
items.

**What the learner sees.** Card: "A sentence must be true if it is true in every order that fits the clues." Board
s3.l2-do2 has three order rows (Ava, Ben, Cal; Ava, Cal, Ben; Cal, Ava, Ben), each with "Does this order fit?", then "Two
orders fit the clue. Is each sentence true in all of them, in some, or in none?"

**What the program assumes the learner has been taught.** That the sentence is judged only over orders where every clue
is true, and that with several clues "fits" means every clue true at once.

**Likely mix-up.** The learner checks the sentence in every order they can think of, or in every order shown on the
board, including those that break a clue. Then almost every must or can't sentence comes out "Might be true".

**Hidden distinction.** Every possible order of the people (or every order on the board) vs every order that fits the
clues (every clue true).

**Hidden steps.** 1) Before judging the sentence, drop each order that breaks any clue. 2) Judge the sentence only in the
orders left.

**Missing prerequisite.** "Fits" with several clues (every clue true at once) is not on any L2 card. `FITS_TERM` is only in
Teach. "An order fits only when every clue is true" is only the message for a wrong "Fits" mark. And the boundary never
bites on a board. s3.l2-do shows only the three fitting orders. On s3.l2-do2, counting the non-fitting Ava, Cal, Ben
changes neither answer: "Ava finished before Ben" is must either way and "Cal finished before Ben" is might either way.
Only after a miss does the feedback say "But clue 2 is false, so that order does not fit."

**Recommended teaching intervention.** On s3.l2-do2, add the status sentence "Cal finished right before Ben." Over the two
fitting orders it is Can't be true, but it is true in the non-fitting Ava, Cal, Ben, so counting that order flips the
answer to Might. Add a new status-row misconception kind `counted-unfit`: the learner picks the answer that counting the
board's non-fitting rows would give. Show its words first. Add a card line: "An order fits only when every clue is true.
Only orders that fit count." Set scaffold full on s3.l2-do2 with MethodSteps: Test each order. Cross out orders that
break a clue. Check the sentence in the rest. All, some or none?

**Recommended UI change.** Once a row is marked "Does not fit", draw it struck through with a "Not counted" tag. Make the
status row label name the orders that count: "Count only Ava, Ben, Cal and Cal, Ava, Ben."

**Diagnostic question.** Q1: "Ava, Cal, Ben breaks the clue. Do you check the sentence there?" Options: "Yes, check every
order." / "No. It does not fit, so it does not count." (right). Q2: "Which orders count for must, might or can’t?"
Options: "Every order." / "Only orders where every clue is true." (right).

**Targeted remediation.** "You may be checking the sentence in every order, even ones that break a clue. Only orders that
fit count. Ava, Cal, Ben breaks the clue, so leave it out. In the two orders that fit, ‘Cal finished right before Ben’ is
false both times. So it can’t be true."

**How to test mastery.** The new board sentence answered right on the first check. Then a must item and a can't item in
two skins, right on the first try and not answered "Might".

**Evidence.** `src/content/stop3.ts`:449-456, 193-208; `src/engine/puzzles/lineup.ts`:529 (`FITS_TERM`), 1172, 1790-1803
(fit mark), 1996-2003 (`statusRow` label), 1081, 1088-1091.

**Reviewer note.** The proposed extra sentence checks out: "Cal finished right before Ben" is false in both fitting orders
(Ava, Ben, Cal; Cal, Ava, Ben) and true only in the non-fitting Ava, Cal, Ben. `statusMark` computes over `boardFits`, so
it grades Can't be true. Add it. Scaffold full and MethodSteps do nothing on DrillBoard rows today (CaseBoard only), and
`counted-unfit` needs `diagnose()` support for row boards. The struck-through "Not counted" tag on a Does-not-fit row is a
cheap DrillBoard change worth doing.

### s3-l2-find-every-order-that-fits (P2)

**Location.** s3.l2 card "One clue, three orders"; L2 quiz tries 2 to 4 (3 or 4 people); the quiz hint; `Teach.remember`.

**What the learner sees.** Card: "The order Ava, Ben, Cal fits. So do Ava, Cal, Ben and Cal, Ava, Ben." Quiz prompt:
"Think about every order that fits the clues." Hint: "Here is one order, checked for you. Check other orders the same
way." Only after a miss, in `Teach.remember`: "Ask: “Is there an order that fits the clues and makes the sentence true? Is
there one that makes it false?”"

**What the program assumes the learner has been taught.** That the learner can produce every order that fits (6 orders
for 3 people, 24 for 4), or knows the quicker search: one fitting order that makes the sentence false, and one that makes
it true.

**Likely mix-up.** The learner merges "true in the orders I tried" with "true in every order that fits". They stop after
one or two orders, for example answering Must after finding one fitting order where the sentence is true.

**Hidden distinction.** True in the orders I checked (some examples) vs true in every order that fits (all cases).

**Hidden steps.** Search 1: try to build a fitting order that makes the sentence false. None found means Must. Search 2:
try to build one that makes it true. None found means Can't. Both found means Might. Or list systematically: place the
clue's pair, then slot the others into every gap.

**Missing prerequisite.** No card says how to be sure you have all the orders. "One clue, three orders" never shows the
other three orders breaking the clue. Board s3.l2-do gives the orders, and s3.l2-do2 gives three orders and states the
count ("Two orders fit the clue"), so the learner never finds orders themselves. The two-search method is the same as
s1.l2 "Try every way" ("Could the face-down cards make it true? Could they make it false?") but appears only in
`Teach.remember` after a wrong answer. The status puzzle draws 3 or 4 people for tries 2 to 4 (`n = rng.pick([3, 4])`).

**Recommended teaching intervention.** Add a card "Two searches" after "Must, might, can’t", bridged to s1.l2: "Try to
make the sentence false with an order where every clue is true. Then try to make it true." See the reviewer note for a
board row that uses existing tap options. Later: a 4-runner board with two rows, "Find an order that fits and makes the
sentence false" and "… true", which needs the order-builder row from s3-l3-try-vs-one-line, scaffold full on that board
and on quiz try 1 (MethodSteps: Make it false? Make it true? Choose.), and a misconception kind `stopped-at-one` (Must
chosen when the learner's own builder holds no attempt at a false order).

**Recommended UI change.** A later step: a line-up thinking board for L2 quiz items (`Item.scratch` exists, but only as a
case board). Learners place names and see each clue tick and the sentence's truth live. Orders found are kept in a list
headed "Orders that fit so far".

**Diagnostic question.** Q1: "You found one order that fits where the sentence is true. Can you say ‘Must be true’ yet?"
Options: "Yes." / "Not yet. Look for an order that fits where it is false." (right). Q2: "You found one fitting order
where it is true and one where it is false. What is the answer?" Options: "Might be true." (right) / "Must be true." /
"Can’t be true."

**Targeted remediation.** "You may be stopping after the orders you tried. ‘Must’ means every order that fits. Try to make
the sentence false while every clue stays true. Here is one: Volt, Tik, Zap. Every clue is true, and ‘Volt is right in
front of Zap’ is false. So it does not have to be true."

**How to test mastery.** 4-person must, might and can't items right on the first try with no hint. Where the thinking
board exists, it shows that both searches were tried before a Must or Can't answer.

**Evidence.** `src/content/stop3.ts`:440-448, 471-480; `src/engine/puzzles/lineup.ts`:1009 (n is 3 or 4), 1176-1179
(remember), 1195 (prompt), 1202 (hint); `src/content/stop1.ts`:1043-1046.

**Reviewer note.** A new order-builder UI is not needed for the first fix. (1) Add a short card bridged to s1.l2: "Ask two
questions, like with the face-down cards. Can you find an order where every clue is true and the sentence is false? Can
you find one where it is true?" (2) Rewrite the L2 quiz hint (`lineup.ts`:1202) to those two questions instead of "Check
other orders the same way". (3) On s3.l2-do2, add a row using the existing tap options (as `coverRow` does): "Which order
fits the clue and makes ‘Cal finished before Ben’ false?" with options Ava, Ben, Cal / Cal, Ava, Ben / None (answer Ava,
Ben, Cal). For "Ava finished before Ben" the answer is None, so Must. The `stopped-at-one` misconception and a line-up
thinking board are later work.

### s3-l5-covered-vs-false (P2)

**Location.** s3.l5 board s3.l5-do rows cover3, cover1 and cover2, and the L5 quiz hint case. The same hidden change
appears in s3.l1 board row "nochain" (a clue taken away) and s3.l3 boards' rows "add" (a clue added).

**What the learner sees.** L5 board body: "Clue 3 is already covered and checked. Now cover clue 1, then clue 2." The clue
list above keeps all three clues, none covered. Quiz hint: "Here is one clue, covered for you." The hint card lists
"Clue 2, “C is somewhere to the left of B”: false" with the note "With clue 2 covered, this order fits too." L1 row: "Take
away clue 2, “Ava is taller than Ben.” Only clue 1 is left…", while the clue list still shows "2 Ava is taller than Ben."
The message for picking Ava says "No clue compares Ava and Ben."

**What the program assumes the learner has been taught.** That the learner keeps "clue k is covered (ignore it)" in memory
without seeing it, and knows a covered clue that is false in an order does not stop the order fitting the other clues.

**Likely mix-up.** The learner merges "covered" with "false" or with "still there". L4 just taught "A line fits only when
every clue is true." Now the hint shows a false clue and says the order "fits too". They decide the order does not fit,
pick "No other order" or "Not needed", and choose a needed clue. In L1 they see "Ava is taller than Ben" on screen,
answer Ava, and are told "No clue compares Ava and Ben", which contradicts the screen.

**Hidden distinction.** A covered clue (out of the puzzle for this one test) vs a clue that is false for this order (still
in the puzzle, so the order does not fit).

**Hidden steps.** 1) Cover: take the clue out for this test only. 2) Check the remaining clues. 3) Put it back before the
next test.

**Missing prerequisite.** Covering is never drawn. The clue scene has only the states ok and broken (SceneView).
DrillBoard draws the board's scene once, the same for every row. The quiz hint case lists every clue's truth, including
the covered clue as false. Nothing teaches that a covered clue does not count, except the word "cover".

**Recommended teaching intervention.** Declare `{id: 'covered-vs-false', a: 'A covered clue: left out for this test.', b:
'A false clue: still in the puzzle; the order does not fit.'}`. Add a contrast card in L5. Same order, Ben, Ava, Cal.
Panel 1: world "All three clues count", who "Clue 1", says "Ava is taller than Ben.", False, because "so this order does
not fit." Panel 2: world "Clue 1 covered", the same words, because "it is covered, so it does not count: the order fits
clues 2 and 3." Ask: "Did the order change? No. What changed? Clue 1 is covered." Add a misconception kind for cover rows,
`covered-counted`: "No other order" chosen where the only other order breaks just the covered clue. Add confused questions
to s3.l5-do.

**Recommended UI change.** Add a "covered" clue state to the clue scene, drawn greyed and struck with the tag "Covered".
Let a row change the scene above it (for example `DrillRow.covered: number[]` and `added: clue`), so the clue list
follows the row in focus. That gives a test-world banner for each row: "Clue 3 is covered. Only clues 1 and 2 count." In
`lineCase` for L5 hints, show the covered clue as "Clue 2 (covered, not counted)", not as false. Use the same mechanism
for the L1 "Take away clue 2" row and the L3 "Now add a clue" rows (the added clue tagged "Added").

**Diagnostic question.** Q1: "Clue 1 is covered. In Ben, Ava, Cal, clue 1 is false and every other clue is true. Does this
order fit the other clues?" Options: "No, clue 1 is false." / "Yes. A covered clue does not count." (right). Q2: "What
does covering a clue do?" Options: "Makes it false." / "Leaves it out for this test only." (right).

**Targeted remediation.** "You may be treating a covered clue as a false clue. Covering leaves it out for this test. Ben,
Ava, Cal makes clue 1 false, but clue 1 is covered, so it does not count. Every other clue is true. So a second order
fits, and clue 1 is needed."

**How to test mastery.** Board rows with the covered clue struck through, where the second order breaks only the covered
clue, marked right on the first check. Then 4-person quiz items right on the first try with no hint.

**Evidence.** `src/content/stop3.ts`:329-340, 152-159, 264, 281, 311 ("A line fits only when every clue is true.");
`src/engine/puzzles/lineup.ts`:2019-2058 (`coverRow`), 1658-1664 (hint and `hintCase` list every clue), 588-596
(`lineCase`), 1695 (`boardScene`); `src/game/components/SceneView.tsx`:115-137; `src/game/components/DrillBoard.tsx`:315.

**Reviewer note.** The cheapest fix is text-only in `lineup.ts`. Have the L5 `hintCase` and `sideCases` list the covered
clue as "Clue 2 (covered, not counted)", or leave it out via `lineCase`'s `only`. Do not mark it false. For L1, reword
`compareMark`'s close on the take-away row to "Only clue 1 is left, and it does not compare Ava and Ben." The same scene
mismatch also affects the L1 "card" row, whose clues are the card's chain, not those in the scene above. A scene override
for each row (`DrillRow.covered` and `added`) is the right later UI fix, along with a "Covered" clue state in SceneView.

### s3-l3-no-one-between-vs-somewhere-between (P2)

**Location.** s3.l3 cards "Next to" and "Between"; L3 quiz items in the race and brooms skins; L4 and L5 items in those
skins.

**What the learner sees.** Race next-to clue: "No one finished between Ava and Ben." Race between clue: "Cal finished
somewhere between Ava and Ben." Card: "In a race, the clue says: “No one finished between Ava and Ben.”"

**What the program assumes the learner has been taught.** That "No one … between A and B" means "A and B are side by
side", the opposite of "C … somewhere between A and B".

**Likely mix-up.** Both clues say "between Ava and Ben". With three runners they are opposites: Cal at an end vs Cal in
the middle. A learner who skims the key phrase applies the between meaning to the next-to clue and puts Cal in the middle.

**Hidden distinction.** No one finished between A and B (A and B finished one right after the other) vs C finished
somewhere between A and B (C is inside; one of them ahead, one behind).

**Hidden steps.** Read who the clue says is between: "no one" means A and B are next to each other; a name means that
person is inside.

**Missing prerequisite.** The two cards come one after the other but are never put side by side. Boards s3.l3-do2 and
s3.l3-do3 are separate. "No one finished between" appears in about 10 to 16 percent of L3 tries 2 to 4.

**Recommended teaching intervention.** Add a contrast card after "Between". Same line: Ava, Cal, Ben. Panel 1: says "No
one finished between Ava and Ben.", False, because "Cal finished between them." Panel 2: says "Cal finished somewhere
between Ava and Ben.", True, because "Ava is ahead of Cal and Ben is behind." Ask: "Did anyone move? No. What changed? ‘No
one’ became ‘Cal’." This maps one to one onto `ContrastPanel`. Add a twin row with both clues on s3.l3-do3.

**Recommended UI change.** None beyond the contrast card. If wording can change, the race and brooms next-to clue could say
"Ava and Ben finished one right after the other."

**Diagnostic question.** "‘No one finished between Ava and Ben.’ Three runners. Where is Cal?" Options: "In the middle." /
"At one end." (right).

**Targeted remediation.** "You may be reading ‘No one finished between Ava and Ben’ like a between clue. It says the
opposite: nobody is between them. With three runners, Cal is at an end."

**How to test mastery.** Race and brooms items with each clue kind, right on the first try, including one item that has
both.

**Evidence.** `src/engine/puzzles/lineup.ts`:142-144, 152-154; `src/content/stop3.ts`:495-511; 300-seed sample.

**Reviewer note.** The proposed contrast maps one to one onto `ContrastPanel`. Rewording the race and brooms next-to clue
to "Ava and Ben finished one right after the other" would remove the clash at the source (`lineup.ts`:142, 152). Check the
knock-on effect on the L2 "right before" wording (see s3-rev-1).

### s3-truth-shown-without-reason (P2)

**Location.** Given marks on boards s3.l2-do2, s3.l3-do, s3.l3-do2, s3.l3-do3 and s3.l4-do; cards "Right before", "One
clue, three orders", "Next to", "Between", "Try each spot", "A worked example", "An example" (clue lists only).

**What the learner sees.** Shown row: "Clue 1: “No one finished between Ava and Ben.” — False", with the note "Clue 1 is
false here. So Cal can’t have finished second." The reason ("Cal finished between Ava and Ben.") exists only as the
message for a wrong tap, which shown rows never get. Card "One clue, three orders" gives the orders only in words: "The
order Ava, Ben, Cal fits. So do Ava, Cal, Ben and Cal, Ava, Ben."

**What the program assumes the learner has been taught.** That the learner can hold an order in mind and compare each
clue's words with where the people stand, unaided.

**Likely mix-up.** What the clue says vs where people stand in this line. The learner sees "False" with no comparison, and
may copy verdicts instead of comparing.

**Hidden distinction.** The clue's words vs the line's facts, and the verdict that comes from comparing them.

**Hidden steps.** For each mark: 1) Say what the clue says. 2) Look where the named people stand. 3) Compare. 4) True or
False.

**Missing prerequisite.** `truthMark` already builds the facts (`clueFacts`: "Ava finished first and Ben finished last. Cal
finished between Ava and Ben."), but only into the why for a wrong mark. DrillBoard's row layout cannot show
`DrillMark.compare` or because rows; only CaseBoard draws them. `lineScene` draws one line, so cards that talk about two
or three orders have no picture.

**Recommended teaching intervention.** Set `compare` (says, world: the line facts) on every truth mark from `truthMark`.
Show it as because rows under shown marks and as compare rows under the learner's marks on full boards (the first board
of each lesson). Show it on light boards only after a wrong check.

**Recommended UI change.** Draw `DrillMark.compare` in DrillBoard's `GivenMark` and `TapMark` (today only CaseBoard does,
through `BecauseRows` and `CompareRows`). Add a scene with several lines, so the cards can draw each order they name,
with the clue ticks.

**Diagnostic question.** "In Ava, Cal, Ben, who finished between Ava and Ben?" Options: "No one." / "Cal." (right).

**Targeted remediation.** "Look where they stand: Ava first, Cal second, Ben last. Cal is between them. The clue says no
one is. They do not match, so the clue is false."

**How to test mastery.** The learner's rows on a full board marked right on the first check. Then a light board marked
right without the compare rows showing.

**Evidence.** `src/engine/puzzles/lineup.ts`:1733-1752 (`clueFacts`, `truthMark` why), 1697-1703 (`lineScene`: one line);
`src/game/components/DrillBoard.tsx`:46-73, 369-383; `src/game/components/CaseBoard.tsx`:237-246;
`src/content/stop3.ts`:440-448.

**Reviewer note.** A text-only first step needs no UI work. Have the shown rows' notes carry the comparison already in the
why, for example "Clue 1 says Eli did not finish first. Eli finished first here. They do not match, so clue 1 is false."
Drawing `DrillMark.compare` in `GivenMark` and `TapMark` comes second. The card scene with several lines is a separate,
larger change.

### s3-l5-implied-by-one-clue (P2)

**Location.** s3.l5 card "An example"; board s3.l5-do; quiz tries 2 and 3.

**What the learner sees.** The card shows only a chain: "The first two clues make a chain: Ava, then Ben, then Cal. That
chain already proves Ava is taller than Cal." The board offers the candidate orders as buttons: "Ben, Ava, Cal | Ava,
Cal, Ben | No other order". Quiz try 2 (seed 5): clues "Rook finished second." "Odo finished first." "Odo finished before
Wren." "No one finished between Ivo and Rook." The answer is "Odo finished before Wren."

**What the program assumes the learner has been taught.** That the learner can find a second fitting order on their own
(4 people, 4 or 5 clues), and can see a clue made redundant by one stronger clue ("first" proves "before everyone"; a spot
clue proves "not last").

**Likely mix-up.** The learner thinks a clue is unneeded only when a chain proves it, so they miss redundancy from a single
clue. Without the board's ready-made options, they also stop after failing to think of a second order.

**Hidden distinction.** Proved by a chain of clues vs proved by one stronger clue. Both mean "not needed".

**Hidden steps.** For each clue, ask: do the other clues prove it (a chain, or one stronger clue)? If unsure, cover it and
build a second order that fits the rest.

**Missing prerequisite.** Only the chain case appears on the card and the board. Over 300 seeds, about half of tries 2 and
3 have a spare clue that is not the end of a chain (not-first or not-last about 37 percent, next-to about 15 percent). The
board gives the candidate orders, so making one is never practised. "Not needed" means "must be true given the other
clues" (s3.l2), but that link is never made.

**Recommended teaching intervention.** Add a second example card: "‘Odo finished first’ already proves ‘Odo finished
before Wren.’" Add a bridge line: "A clue is not needed when the other clues make it must be true." Add a twin board where
a spot clue makes another clue redundant, where the learner must find the second order (see the reviewer note).

**Recommended UI change.** Later: the same order-builder row as in s3-l3-try-vs-one-line, with the covered clue struck
(s3-l5-covered-vs-false).

**Diagnostic question.** "‘Odo finished first.’ Does that already prove ‘Odo finished before Wren’?" Options: "Yes."
(right) / "No, no clue compares Odo and Wren."

**Targeted remediation.** "A clue can be proved by one other clue, not only by a chain. If Odo finished first, Odo
finished before everyone, Wren too. So ‘Odo finished before Wren’ tells you nothing new."

**How to test mastery.** L5 items whose spare clue is a not-first or not-last clue, or a before clue implied by a spot
clue, right on the first try with no hint.

**Evidence.** `src/content/stop3.ts`:601-616, 329-340, 631-634; `src/engine/puzzles/lineup.ts`:1595 (spare weights), 2027
(ready-made options); 300-seed sample.

**Reviewer note.** Refocus the finding on the unpractised step (find a second order that fits the other clues), not on
chain vs one clue. Add a second example card with one stronger clue ("Odo finished first already proves Odo finished
before Wren"). Before building an order builder, try a board row whose options include an order that breaks a clue that is
not covered, so the learner must check each option rather than spot the only candidate.

### s3-rev-1 (P2)

**Location.** s3.l2 card "Right before" and s3.l3 card "Next to"; board s3.l3-do2 row "cal1"; L3 race and brooms quiz
items (`L3_TYPES` puts both clue kinds in the same items).

**What the learner sees.** s3.l2 card "Right before": "“Ava finished right before Ben” means no one finished between
them." s3.l3 card "Next to": "In a race, the clue says: “No one finished between Ava and Ben.”" The direction ("It does not
say who is ahead") comes only in the card's next sentence. On s3.l3-do2: "Try Cal first, as in Cal, Ben, Ava".

**What the program assumes the learner has been taught.** That "right before" says who is ahead, while "no one finished
between" does not.

**Likely mix-up.** The L2 definition of "right before" is word for word the race next-to clue. The learner reads the race
next-to clue as "Ava finished right before Ben" (the first-named person ahead). Then on s3.l3-do2 row "cal1" they mark
clue 1 False, or on quiz items they cross out lines with Ben ahead of Ava.

**Hidden distinction.** Right before (says who is ahead) vs next to, or "no one finished between A and B" (either one may
be ahead).

**Hidden steps.** For "right before", check order and closeness. For "no one between", check closeness only.

**Missing prerequisite.** The two are never set side by side. The L2 definition leads with "no one finished between", not
with direction.

**Recommended teaching intervention.** Lead the L2 definition with direction: "Ava is just one place ahead of Ben, with no
one between them." Add a contrast to the "Next to" card using the same line, Ben, Ava, Cal: "Ava finished right before
Ben" is False because Ben is ahead of Ava; "No one finished between Ava and Ben" is True because they are side by side.
Ask: "Did anyone move? No. What changed? ‘Right before’ says who is ahead. ‘No one between’ does not." Add a misconception
for s3.l3-do2 (needs `diagnose()` support for row boards): clue 1 marked False on "cal1".

**Recommended UI change.** None beyond the contrast. The rewording proposed in s3-l3-no-one-between-vs-somewhere-between
("Ava and Ben finished one right after the other") would also help here.

**Diagnostic question.** "‘No one finished between Ava and Ben.’ Can Ben be ahead of Ava?" Options: "Yes. It only says
they are side by side." (right) / "No, Ava is first" / "Not sure".

**Targeted remediation.** "‘No one finished between Ava and Ben’ only says they are side by side. Either one can be ahead.
‘Right before’ is different: it says Ava is the one just ahead."

**How to test mastery.** s3.l3-do2 row "cal1" marked right at the first check; L3 race items where Ben is ahead of Ava,
right on the first try.

**Evidence.** `src/content/stop3.ts`:495-511 (L3 cards), L2 card "Right before"; `src/engine/puzzles/lineup.ts`:142-144
(race next-to wording), `L3_TYPES`.

**Reviewer note.** This was a reviewer's extra finding. It is P2 rather than P1 because the "Next to" card does say "It
does not say who is ahead".

### s3-l2-clue-vs-sentence (P3)

**Location.** s3.l2 card "Must, might, can’t" (the first use of "sentence"); boards s3.l2-do and s3.l2-do2; every L2 quiz
prompt.

**What the learner sees.** Card: "A sentence must be true if it is true in every order that fits the clues." Board
s3.l2-do body: "Mark each sentence True or False for the other two orders." Its first sentence, "Ava finished before
Ben.", is word for word the board's only clue ("Clues: 1 Ava finished before Ben."). Quiz: "Look at this sentence: “Volt
is right in front of Zap.” Think about every order that fits the clues." The clues sit in a box titled "Clues" and the
sentence sits in the prompt.

**What the program assumes the learner has been taught.** That the clues are given as true and decide which orders fit,
while the sentence is only a claim to test and must not be used to pick orders.

**Likely mix-up.** The learner adds the sentence to the clues and treats it as a fact. Every order they keep then makes it
true, so "Must be true". Or they drop an order because the sentence is false there. Board s3.l2-do encourages this merge:
its first sentence is identical to its clue.

**Hidden distinction.** A clue (given as true; it decides which orders fit) vs the sentence (a claim you check in each
order that fits; it decides nothing). Evidence vs the conclusion being tested.

**Hidden steps.** 1) Use only the clues to find the orders that fit. 2) Then, separately, check the sentence in each one.

**Missing prerequisite.** "Sentence" is never defined against "clue", and no card says the sentence is not a clue. On
s3.l2-do2 the learner marks clues and fit for each order, but never the sentence for each order. The status row jumps
straight to must, might or can't.

**Recommended teaching intervention.** Add a contrast card. Same order, Ava, Cal, Ben. Panel 1: who "Clue", says "Ava
finished before Ben.", True, because "so this order fits." Panel 2: who "Sentence", says "Ava finished right before
Ben.", False, because "Cal is between them. The order still fits: a false sentence removes nothing." Ask: "Did the order
stop fitting? No. Only a false clue removes an order." On s3.l2-do2, add sentence marks to each order row (`lineRow`
already takes sentences). Add a misconception kind `sentence-decides-fit`: "Does not fit" marked where every clue is true
and only the sentence is false.

**Recommended UI change.** Show the sentence in its own labelled box, "The sentence to test", under the Clues box on L2
boards and quiz items (a new field on the clue scene). Tag clue marks "Clue" and sentence marks "Sentence" in different
colours.

**Diagnostic question.** Q1: "An order fits every clue, but the sentence is false there. Does the order still fit?"
Options: "No, the sentence is false." / "Yes. Only the clues decide which orders fit." (right). Q2: "Which are given as
true?" Options: "The clues." (right) / "The sentence." / "Both."

**Targeted remediation.** "You may be treating the sentence as one more clue. The clues are true, and they pick the
orders. The sentence is only being tested. In Ava, Cal, Ben every clue is true, so the order fits, even though ‘Ava
finished right before Ben’ is false there."

**How to test mastery.** A board where one fitting order makes the sentence false, marked right on the first check. Then
three quiz items in a row with different statuses, right on the first try.

**Evidence.** `src/content/stop3.ts`:181-190, 196-206, 449-456; `src/engine/puzzles/lineup.ts`:1195 (prompt), 1196 (scene:
clues only), 1772-1786 (`lineRow` sentences).

**Reviewer note.** Cheapest change: a labelled "Sentence to test" box under the Clues box on L2 items, plus one card line:
"The clues are true. The sentence is only being tested." The contrast card and `sentence-decides-fit` are optional.

### s3-l4-puts-in-spot-vs-rules-out-spot (P3)

**Location.** s3.l4 card "Start with sure things"; quiz tries 2 and 3 with a not-first or not-last clue.

**What the learner sees.** Card: "Look for a clue that names a spot, like first or last. Start by putting that person in
that spot." Quiz clues such as "Tia is not last in line.", "Eli did not finish first.", "Ava is not the tallest."

**What the program assumes the learner has been taught.** That "names a spot" applies only to clues that put someone in a
spot, and (from s3.l3) that "not last" rules out one spot.

**Likely mix-up.** "Eli did not finish last" contains the word "last", so the learner follows the card literally and puts
Eli last.

**Hidden distinction.** A clue that puts someone in a spot (first, last, second) vs a clue that rules a spot out (not
first, not last).

**Hidden steps.** Pick the spot clue only if it says "is". For a NOT clue, cross that spot off the person's list and look
for another start.

**Missing prerequisite.** s3.l3 card "Not first, not last" teaches "rules out just one spot", but the L4 card's wording
covers both kinds. The quiz hint says "names an exact spot" and the engine's anchor skips not-clues, but the card does
not. Not-clues appear in 46 of 300 try-2 and 25 of 300 try-3 items.

**Recommended teaching intervention.** Reword the card: "Look for a clue that puts someone in a spot, like ‘Cal finished
last.’ A clue like ‘Eli did not finish last’ only rules a spot out." Optionally add a contrast card with the same three
runners (panel 1: "Cal finished last." puts Cal in spot 3; panel 2: "Cal did not finish last." leaves Cal in spot 1 or 2;
ask "What changed? One word: NOT.") and a twin row on s3.l4-do2 with a not-last clue.

**Recommended UI change.** Optional: tag spot clues in the clue list with a small "spot" pill and not-clues with "rules
out" (a new optional tag for each clue on the clue scene).

**Diagnostic question.** "‘Eli did not finish last.’ With three runners, where can Eli be?" Options: "Last." / "First or
second." (right) / "Anywhere."

**Targeted remediation.** "You may be reading ‘did not finish last’ as ‘finished last.’ NOT flips it: Eli is in any spot
but last. Start with a clue that puts someone in a spot."

**How to test mastery.** L4 items containing a not-first or not-last clue, built right on the first try, in two skins.

**Evidence.** `src/content/stop3.ts`:554-559, 487-493; `src/engine/puzzles/lineup.ts`:1520 (anchor is first, last or
place), 1560 ("names an exact spot"), 155-156; 300-seed sample.

**Reviewer note.** Reword the card to "a clue that puts someone in a spot, like ‘Cal finished last’". That is enough. The
contrast card and pill tags are optional.

### s3-l1-cross-out-direction (P3)

**Location.** s3.l1 card "Who is first or last?"; board s3.l1-do; quiz tries 3 and 4 asking for the last end (about 35
percent); the quiz hint.

**What the learner sees.** Card: "To find the tallest, cross out anyone who is shorter than someone… To find the shortest,
cross out anyone who is taller than someone." Hint: "Here is one try, checked for you. Cross out every dragon whose wings
are shorter than another dragon’s. How many are left?" Hint card: "Longest wings to shortest: Frost, Moss, Onyx." …
"Frost has the longest wings here, but clue 1 is false. So cross out Frost."

**What the program assumes the learner has been taught.** That the learner can run crossing out for either end, crossing
the one ahead in each clue when the question asks for the last end.

**Likely mix-up.** The learner crosses out the same side for both ends (the shorter one when asked who is shortest). The
hint also mixes two methods: crossing people out clue by clue, and testing a whole line.

**Hidden distinction.** Asked for the first end: cross out the one behind in each clue. Asked for the last end: cross out
the one ahead.

**Hidden steps.** For each clue "X is ahead of Y": asked for the first end, cross out Y; asked for the last end, cross out
X. Then count who is left.

**Missing prerequisite.** The board's `placeRow` on row "chain" asks both the tallest (Cal) and the shortest (Ben), both
decided, and row "nochain" asks the tallest (Can't tell). But it never practises the crossing-out step itself: no mark
asks which name a clue crosses out, so the flip for the last end is never practised as a step.

**Recommended teaching intervention.** Add a "Which name does clue 1 cross out?" mark for a last-end question on
s3.l1-do, with a shown row first. Set scaffold full with MethodSteps: Which end? Cross out for each clue. Count. (The
scaffold has no effect on DrillBoard rows until MethodSteps is wired there.)

**Recommended UI change.** In L1 learn mode, let the learner tap names to strike them out as scratch marks. Make the hint
card show the clue that crosses each name out ("Clue 1 crosses out Frost") instead of a whole line.

**Diagnostic question.** "Who is the shortest? Clue: ‘Ava is taller than Ben.’ Who does this clue cross out?" Options:
"Ben." / "Ava. She is taller than someone, so she is not the shortest." (right).

**Targeted remediation.** "You may be crossing out the same way for both ends. For the tallest, cross out the shorter one
in each clue. For the shortest, cross out the taller one."

**How to test mastery.** Items asking for the last end, in two skins (one letters: the right end), right on the first try.

**Evidence.** `src/content/stop3.ts`:373-380, 141-162; `src/engine/puzzles/lineup.ts`:794, 828-830, 918-919; 300-seed
sample (ask-last 110 of 300 at try 3, 94 of 300 at try 4).

**Reviewer note.** The first draft said the board never asks a decided first-or-last question and never the last end;
that is wrong (corrected above): `placeRow` on row "chain" asks the tallest (Cal) and the shortest (Ben), both decided,
and row "nochain" asks the tallest (Can't tell). Reframe the finding: add a "Which name does clue 1 cross out?" mark for a
last-end question, and make the hint card list for each clue who it crosses out instead of a line. Scaffold full has no
effect on DrillBoard rows today.

### s3-l3-somewhere-between-vs-middle (P3)

**Location.** s3.l3 card "Between"; board s3.l3-do3 (3 runners only); L3 quiz items with 4 people (about 58 percent of
tries 2 to 4).

**What the learner sees.** Card: "So Cal is not at either end. With three runners, Cal must be in the middle." Term in
Teach: "“Somewhere between” means one of the other two finished earlier, and one finished later."

**What the program assumes the learner has been taught.** That with four runners, "somewhere between" still allows others
between, and does not mean right in the middle or next to both.

**Likely mix-up.** The before and right-before mix-up again: "between" read as "right between", standing next to both.
Lines like Ava, Dee, Cal, Ben are then wrongly ruled out.

**Hidden distinction.** Somewhere between (one ahead, one behind; others may be between too) vs right between (next to
both).

**Hidden steps.** Check only the two sides: is one named person ahead and the other behind? Ignore who else is between.

**Missing prerequisite.** The board has only 3 runners, where the two meanings agree. The "somewhere" link to L2's "before
means anywhere earlier" is never made.

**Recommended teaching intervention.** Add a row to s3.l3-do3: "Dee runs too. Ava, Dee, Cal, Ben." The learner marks the
between clue True. Add a card line: "Somewhere works like before: Cal can be anywhere between them."

**Recommended UI change.** Show the 4-runner line in a picture with the two named people marked.

**Diagnostic question.** "Ava, Dee, Cal, Ben. Is ‘Cal finished somewhere between Ava and Ben’ true?" Options: "No, Dee is
between Ava and Cal." / "Yes. Ava is ahead of Cal and Ben is behind." (right).

**Targeted remediation.** "You may be reading ‘somewhere between’ as ‘right between.’ It only needs one of them ahead of
Cal and the other behind. Others can be between too."

**How to test mastery.** 4-person between items (where-is and who-is), right on the first try.

**Evidence.** `src/content/stop3.ts`:505-511, 268-284; `src/engine/puzzles/lineup.ts`:154, 1246; 300-seed sample (4 people
in 175, 166 and 175 of 300).

**Reviewer note.** The proposed 4-runner row on s3.l3-do3 (Ava, Dee, Cal, Ben: True) plus one card line ("Somewhere works
like before") is enough.

### s3-l1-skin-words-before-taught (P3)

**Location.** s3.l1 quiz (try 1 is always a new skin; letters are always in the set).

**What the learner sees.** L1 quiz clues: "A is somewhere to the left of B.", "Pia is somewhere in front of Eli.", "Moss
has longer wings than Frost." and questions such as "Which letter is at the left end?" The L1 cards use only "taller than"
and one race line.

**What the program assumes the learner has been taught.** That the learner maps each skin's words onto "ahead of", and
knows which end counts as first in each skin.

**Likely mix-up.** "Somewhere to the left of" and "in front of" read as new kinds of clue rather than the same chain idea.
The word "somewhere" has not been explained yet.

**Hidden distinction.** The skin's words vs the one idea underneath them (ahead of, before).

**Hidden steps.** Translate each clue into "X is ahead of Y" before crossing out.

**Missing prerequisite.** The card "Other words, same idea" is in s3.l2. The quiz's skin words come before it.

**Recommended teaching intervention.** Add one line to L1 card 1 or card 3: "Other puzzles use other words for the same
idea: longer wings, somewhere in front of, somewhere to the left of." Or move a short version of the s3.l2 card into L1.

**Recommended UI change.** None.

**Diagnostic question.** "‘A is somewhere to the left of B.’ Which letter is nearer the left end?" Options: "A." (right) /
"B." / "Can’t tell."

**Targeted remediation.** "‘Somewhere to the left of’ works like ‘taller than’: A comes before B in the row."

**How to test mastery.** L1 try 1 in a letters or line skin, right on the first try.

**Evidence.** `src/content/stop3.ts`:355-397, 404-414, 457-464; `src/engine/puzzles/lineup.ts`:216, 264.

**Reviewer note.** One line on L1 card 1 or 3 is enough.

### s3-l4-worked-example-two-spots-left (P3)

**Location.** s3.l4 card "A worked example".

**What the learner sees.** "Cal finished last, so Cal goes in the last spot." / "Ava finished before Ben, so Ava is first
and Ben is second."

**What the program assumes the learner has been taught.** That "before" puts Ava first and Ben second only because those
are the two spots left.

**Likely mix-up.** "Before" read as "right before" (Ava is first and Ben second, so before means next), undoing s3.l2.

**Hidden distinction.** Before (anywhere earlier) vs right before, where being side by side here comes from the spots
left, not from the clue.

**Hidden steps.** After placing Cal, only spots 1 and 2 are left, so "Ava finished before Ben" orders those two.

**Missing prerequisite.** The card skips "only spots 1 and 2 are left". `buildSimpler` says it ("Ava and Ben fill the other
two spots.") but only in "Explain more simply".

**Recommended teaching intervention.** Reword: "Ava and Ben fill the other two spots. ‘Ava finished before Ben’ puts Ava
first and Ben second."

**Recommended UI change.** Show the line filling up step by step on the card (a line scene that grows one spot at a time).

**Diagnostic question.** "Why is Ben second, right after Ava?" Options: "Because ‘before’ means right before." / "Because
only spots 1 and 2 were left." (right).

**Targeted remediation.** "‘Before’ still means anywhere earlier. Ben ends up right after Ava only because Cal already took
the last spot."

**How to test mastery.** A 4-runner build where a before clue leaves a gap, right on the first try.

**Evidence.** `src/content/stop3.ts`:561-570; `src/engine/puzzles/lineup.ts`:744-758.

**Reviewer note.** The proposed rewording is right and enough.

### s3-rev-2 (P3)

**Location.** s3.l5 card "Extra clues", the question "Which clue wasn’t needed?" and the L5 explanation.

**What the learner sees.** "Which clue wasn’t needed?" The card "Extra clues" says only "Sometimes a clue tells you
nothing new." No L5 card says the clue that is not needed is still true.

**What the program assumes the learner has been taught.** That "not needed" means "the other clues already prove it", and
the clue is still true.

**Likely mix-up.** Stop 1 trained learners that signs can lie. "Which clue wasn’t needed?" can be read as "which clue is
the wrong one". A learner may hunt for a clue that is false in some order, or for a "trick" clue, rather than a redundant
one.

**Hidden distinction.** A clue that is not needed vs a clue that is not true.

**Hidden steps.** Keep every clue as true; ask only whether the other clues already prove it.

**Missing prerequisite.** No card states that every clue in this lesson is true, including the one that is not needed.

**Recommended teaching intervention.** Add one sentence to "Extra clues": "A clue that is not needed is still true. It
just tells you nothing new." Repeat it in the L5 explanation.

**Recommended UI change.** None.

**Diagnostic question.** "Is the clue that is not needed true?" Options: "Yes. The other clues already prove it." (right)
/ "No, it is the wrong clue" / "Not sure".

**Targeted remediation.** "Every clue here is true. The one that is not needed is true too. The other clues already prove
it, so it tells you nothing new."

**How to test mastery.** The diagnostic answered right, and the next L5 item right on the first try.

**Evidence.** `src/content/stop3.ts`:601-616 (L5 cards).

**Reviewer note.** This was a reviewer's extra finding.

## Stop 4: Grid Detective

### s4-l2-cross-in-line-vs-cross-in-row (P1)

**Location.** The s4.l2 quiz "Who must have the X?" (`onlyOnePuzzle` "col" and "cant" modes: Try 1 l2-1, Try 3 l2-3, the
check items c3 and c4, the Arcade), and the L2 Hint's case note. The same wording runs through s4.l4 (`L4_NOT`,
`linkPuzzle`) and s4.l5 cards and boards ("crosses out Mia").

**What the learner sees.** Prompt (generated): "Leo, Mia and Nia each eat a different snack: apples, popcorn or grapes.
Look at the grid. Who must eat grapes?" The grid shows Leo – grapes ✗ and Mia – apples ✗. Choices: Leo, Mia, Nia, Can’t
tell yet. Only after a wrong pick of Nia or Mia does the learner read: "Mia’s ✗ for apples is in a different column, so
it does not decide grapes." The L2 Hint's own case note says "A ✗ means no. So Tia is out." Elsewhere the program says a
kid, not a box, is crossed out: "A “not” link crosses out one kid. Then look at who is left." (`L4_NOT`) and "Clue 1
crosses out Mia." (s4.l5 card "Use only the clues you are told").

**What the program assumes the learner has been taught.** That a cross is about one kid AND one thing (a box), so for "Who
must eat grapes?" only crosses in the grapes column count. Also that the learner can turn the question into its line
("Who must have X?" means the X column; "Which X must P have?" means P's row).

**Likely mix-up.** "Mia has a cross" is taken as "Mia is out." Any cross in a kid's row seems to remove that kid, so only
Nia seems left and the learner picks "Nia" instead of "Can’t tell yet". In decided items, where the holder's own row has a
cross in another column, the same belief gives "Can’t tell yet" or no one. The program's own phrases "So Tia is out" and
"crosses out Mia" (with no "for the grapes") feed this belief.

**Hidden distinction.** A cross in this column (this kid can't have this thing) vs a cross somewhere else in the kid's row
(this kid can't have some other thing, which says nothing about this one). Put another way: crossing out a box vs
crossing out a kid.

**Hidden steps.** 1) Translate the question to its line ("Who must eat grapes?" means the grapes column). 2) Find that
line. 3) In that line only, count the empty boxes (crosses in other columns do not count). 4) One empty box: that kid
must have it. 5) Two or more: check whether another row or column rules one out. 6) If none does, Can’t tell yet.

**Missing prerequisite.** This is not taught before the quiz. The four s4.l2 cards (rowLeft, colLeft, notSoFast, count)
and the `L2_COUNT` board only show lines with no cross outside them, and the board names the line for you ("Look at the
cat column"). The question-to-line step appears only in the Hint ("Now count the empty boxes in the grapes column") and in
`Teach.meaning` after a miss. The "different column" warning appears only in the "open" choice feedback after a miss. Yet
the generator puts this trap into every column "Can’t tell yet" item: it requires an extra cross in a pair kid's row.
Check item c4 is always a "cant" item, and asks about a column about 60 percent of the time (179 of 300; the rest are row
questions, see s4-rev-1). Try 3 (l2-3) has the same split.

**Recommended teaching intervention.** Cheap and enough for now: add a card with one existing grid scene, captioned
"Mia’s cross is for apples, not grapes", and an `L2_COUNT` row with a cross outside the line: "Look at the fish column.
Ava has a cross for the dog." It asks for the count and the boxes (answer: 2, Can’t tell yet). Add one line to "Count the
empty boxes": "Who has the fish? Look down the fish column. Which pet does Leo have? Look across Leo’s row." Change the
Hint's case note "So Tia is out." to "So Tia can’t eat apples." Give the "open" ChoiceFeedback a mix-up headline first
("You may be treating any cross in Mia’s row as a cross for grapes"). Later, with a grid contrast panel: declare a
distinction on s4.l2, `{id: 'box-vs-kid', a: 'A cross in this column: this kid can’t have this thing', b: 'A cross
elsewhere in the kid’s row: about another thing'}`, with a contrast card after "The last box in a column" showing two
grids and the same question, "Who has the fish?" Left grid: Mia cross fish, Ava cross fish, so only Leo is left: Leo.
Right grid: Mia cross fish, Ava cross dog; Ava's cross is in the dog column, two kids are left, so Can’t tell yet. Ask:
"Was Ava crossed out for the fish? No. Her cross is in the dog column." Reword "crosses out Mia" to "crosses out Mia for
the fish" in s4.l4 and s4.l5 (cards, notes, done lines, `Teach.remember`, and the generated `personNote` at `grid.ts`:1392
and 1757) last, as reinforcement.

**Recommended UI change.** The existing `ContrastView` is text only (test world, says, True or False panels), so a grid
contrast needs a new scene: two GridPictures side by side with an ask line, or an optional grid on `ContrastPanel`. On
the first column quiz, shade the line the question is about (the grapes column) and dim crosses outside it. Items have no
scaffold field, so do this through `Item.workFirst` (a guided board before the answer buttons) or a new item flag; the
light version drops the shading. Add a because row under the count: "Line: the grapes column. Crossed in it: Leo. Empty:
Mia, Nia."

**Diagnostic question.** Q1: "The question is ‘Who must eat grapes?’ Where do you look?" Options: "Down the grapes column"
(right) / "Across each kid’s row" / "Not sure". Q2: "Mia has a cross for apples. Could Mia still eat grapes?" Options:
"Yes, that cross is only about apples" (right) / "No, Mia is crossed out" / "Not sure".

**Targeted remediation.** "You may be treating any cross in Mia’s row as a cross for grapes. A cross only means no for its
own box. Mia’s cross is in the apples column, so it says Mia does not eat apples. For grapes, look only down the grapes
column. Mia’s box and Nia’s box are both empty, so either one could eat grapes. You can’t tell yet."

**How to test mastery.** Right on the first try, with no hint, on two items: one twin pair on the same grid and one
decided item. The pair: (a) a column question with a cross elsewhere in a pair kid's row (answer Can’t tell yet); (b) the
same grid plus one cross in the asked column (answer: that kid). The decided item: the holder's own row has a cross in
another column. Tag the tempting can't-tell items and require one in `pass.include` for s4.l2.

**Evidence.** `src/content/stop4.ts`:529-563 (L2 cards), 216-256 (`L2_COUNT`), 566-574 (l2 practice), 767 (c4 always
"cant"), 343, 361, 368, 371, 447, 728 ("crosses out <kid>"); `src/engine/puzzles/grid.ts`:991 (`rng.chance(0.6)` for a
column), 1006-1029 (extras; line 1029 requires a cross in a pair kid's row), 1131-1136 (the "different column" line, after
a miss only), 1178-1180 (`Teach.meaning`), 1198 (hint case note "So Tia is out."), 1212-1214 (hint), 1479, 1503, 1802;
`src/game/components/Distinction.tsx`:63-92 (`ContrastView` text-only); probe output: the only sample above with marks
`{leo: {grapes: no}, mia: {apples: no}}`.

**Reviewer note.** Correct the check fact (applied above): c4 is always "cant", but it asks about a column only about 60
percent of the time (179 of 300; `grid.ts`:991), and the rest are row questions. The same split applies to Try 3. Add the
strongest in-lesson evidence, which the auditor missed: the L2 Hint's own case note says "A ✗ means no. So Tia is out."
(`grid.ts`:1198). Change it to "So Tia can't eat apples." The "crosses out Mia" wording in L4 and L5 comes after L2, so it
cannot cause the L2 miss; rewording it is reinforcement only, so do it last. Fix the generated `personNote` too ("Clue 1
crosses out Mia", `grid.ts`:1392 and 1757) by naming the thing. Items have no scaffold field, so "scaffold full on the
first column quiz" needs a new item-level flag or `Item.workFirst`. Declaring the distinction requires a contrast scene,
and ContrastView only has sign panels, so grid panels are new UI. Until then, the cheap and sufficient fixes are the card
with one existing grid scene and the `L2_COUNT` row with a cross outside the line. The row-question mirror is s4-rev-1.

### s4-l4-two-part-back-and-forth (P1)

**Location.** s4.l4 Try 4 (`gridPuzzle` with two categories, l4-4), stop check c6, Arcade; cards "Two parts to the grid",
"Use what you know" and "Links work both ways"; boards `L4_LINK` and `L4_BACK`; the s4.l5 card "Stuck? Read again".

**What the learner sees.** Prompt (generated): "The dragons Blaze, Cinder and Moss each guard a different gem: a ruby, a
pearl or an opal. They each live in a different cave: the sea, ice or sand cave. Use the clues to fill in the grid."
Clues include "The dragon in the sand cave guards the ruby.", "Moss lives in the sea cave or the ice cave." and "The
dragon that guards the opal does not live in the sea cave." Two empty grids sit below, captioned "Gem" and "Cave". Hint:
"A linking clue lets you carry a ✓ or ✗ from one part of the grid to the other." The L4 card has words only: "Some grids
have two parts.… The rules stay the same in each part."

**What the program assumes the learner has been taught.** That the learner can run a two-part loop. Work one part until
it is stuck. Carry marks across each linking clue: from either end, crosses as well as check marks, and marks the learner
worked out, not only marks a clue gave. Then switch parts, and read every linking clue again whenever a new mark appears.

**Likely mix-up.** The learner treats a linking clue as used up once read, or as usable only once one part is fully known,
which is how every L4 card and board shows it. So a worked-out mark (Moss does not live in the sand cave, from an "or"
clue) never gets carried (Moss does not guard the ruby), and the learner is stuck or starts guessing.

**Hidden distinction.** Using a link once, from a finished part, vs carrying marks back and forth across a link while both
parts are still filling in.

**Hidden steps.** 1) Put in the clue marks in both parts. 2) Spread each check mark in its own part. 3) Only one left, in
each part. 4) For each linking clue, look along each kid's row for a mark in either named column. 5) Carry it to the same
kid in the other part (a link carries a check as a check and a cross as a cross; a "not" link turns a check into a cross
only). 6) After every new mark, switch parts and read the links again. 7) Repeat. 8) Check every clue.

**Missing prerequisite.** The one-part loop is listed on the L3 card "Solve a whole grid". The two-part loop is not listed
on any L4 card. Both L4 grid boards start from a fully known part (`CARD_GRIDS.petsKnown`, `CARD_GRIDS.snacksKnown`), so a
link never carries a mark the learner worked out. "Read the clues again… A linking clue… may give you a new ✗" first
appears on the s4.l5 card "Stuck? Read again", which comes after L4's quiz. Running the engine (`humanSolve` on 200
two-part puzzles): in 191 of them a link carries a mark that was itself worked out (spread, only one left, or another
link). In 92 the solve switches parts at least twice. The "Two parts to the grid" card has no picture, so the two grids
with shared rows first appear on a board.

**Recommended teaching intervention.** Add an L4 card "Back and forth" after "Links work both ways": "Fill what you can in
one part. Each time a kid gets a new check mark or cross, read the linking clues again. Carry the mark across. Then go
back." Move the linking-clue line of "Stuck? Read again" into L4. Add a guided board where neither part is known, built
so the first carry starts from a worked-out cross: "Moss lives in the sea cave or the ice cave" plus "The dragon in the
sand cave guards the ruby". Give it scaffold full with a MethodSteps strip: 1 Clue marks. 2 Spread. 3 Only one left. 4
Carry across links. 5 Again. Give l4-4 an `Item.workFirst` guided two-part board with scaffold full (items have no
scaffold field), and later items none. Give "Two parts to the grid" a picture of both parts. Add a link line to the
two-part `Teach.remember`: "Carry each new check mark or cross across the linking clues, then read them again."

**Recommended UI change.** The current `gridBoard` taps only one part, with the other drawn as a fixed scene. A board that
taps both parts with aligned rows is a new board layout (a DrillStep with two column sets). MethodSteps renders only in
CaseBoard today, so wire it into DrillBoard's grid layout and AssignView. On the quiz, light a linking clue in the clue
list when a box in one of its named columns gets a new mark ("Clue 1 can carry this").

**Diagnostic question.** Q1: "Moss does not live in the sand cave. Clue: ‘The dragon in the sand cave guards the ruby.’
What can you mark?" Options: "Moss – ruby gets a cross" (right) / "Nothing: the clue is about the sand cave" / "Moss –
ruby gets a check mark". Q2: "You used a linking clue once. Later a kid gets a new check mark. Should you read the linking
clue again?" Options: "Yes" (right) / "No, it is used up".

**Targeted remediation.** "A linking clue is never used up. Each time a kid gets a new check mark or cross in one of its
columns, it can give that kid a mark in the other part. Moss does not live in the sand cave, and the dragon in the sand
cave guards the ruby. So Moss does not guard the ruby. Now look at the gem part again."

**How to test mastery.** A two-part grid whose first carry starts from a mark the learner worked out, solved on the first
try with no hint and no wrong check. Plus a board row: "A new check mark just appeared. Which clue can you use now?" Tag
two-part grid items and require one in `pass.include` for s4.l4, since today L4 can be passed without a right two-part
grid.

**Evidence.** `src/content/stop4.ts`:637-680 (L4 cards; 638-644 a card without a scene), 318-333 (`L4_LINK` from
`petsKnown`), 375-391 (`L4_BACK` from `snacksKnown`), 612-620 (L3 "Solve a whole grid"), 686-690 (l4-4), 769 (c6),
733-739 (s4.l5 "Stuck? Read again"); `src/engine/puzzles/grid.ts`:518-532 (a link carries a check and a cross; a not link
only from a check), 772 (`needLink`), 799-801 (hint), 753-759 (Teach rule and remember, with no link step);
`src/game/components/CaseBoard.tsx`:238, 312 (MethodSteps only here); an engine probe: total 200, a link used in 200, a
worked-out mark carried in 191, back and forth in 92.

**Reviewer note.** Items have no scaffold field, so "make Try 4 scaffold full" should read: give l4-4 an `Item.workFirst`
guided two-part board with scaffold full (applied above). `gridBoard` taps only one part today (`part`, `grid.ts`:2133),
so a board that taps both parts is new, as stated. MethodSteps renders only in CaseBoard (`CaseBoard.tsx`:312), so it must
be wired into DrillBoard's grid layout and AssignView. Cheapest immediate fixes: (1) add the link line to the two-part
`Teach.remember`; (2) move the linking-clue sentence of "Stuck? Read again" into an L4 card. Keep the `pass.include` idea
(see s4-pass-without-cant-tell), since L4 can be passed today without a right two-part grid.

### s4-truth-icons-vs-grid-marks (P2)

**Location.** The box cases in Stop 4's Hints and after-miss explanations (ExplanationPanel `CaseCard` and `hintCase`):
`markPuzzle`, `spreadPuzzle`, the grid Hint, the person cases (link, enough) and the proof cases. The learner first meets
it at the s4.l1 Try 2 and 3 Hint ("does not have" and "or" clue items) and in the Teach cases of Try 1. The step cases of
the two grid lessons (`gridTeach`) have no truths and are not affected.

**What the learner sees.** Hint: "Here is one box, checked against the clue. A clue with “not” gives a ✗ where the right
row and column meet." Then a case card: "One box, checked against the clue: C – 1.", "✓ C could have 1: true", "✗ C must
have 1: false", "So C – 1 stays empty for now." The check and cross icons are the same glyphs the grid uses for has and
does-not-have.

**What the program assumes the learner has been taught.** That the learner reads a check or cross in a case card as the
truth of a sentence (true or false), not as a grid mark. Also that the learner knows how the two lines decide a box:
"could" false gives a cross; "must" true gives a check mark; "could" true and "must" false leaves it empty.

**Likely mix-up.** The icon next to "must have … false" is taken as the box's mark ("C – 1 gets a cross"), or the check
next to "could have … true" as "C – 1 gets a check mark", for a box that should stay empty. In other words, the truth of
"C must have 1" is merged with the mark in C – 1.

**Hidden distinction.** The truth value of a sentence about a box ("C must have 1" is false) vs the mark in the box (check
for has, cross for does not have, empty). Inside that: "could" (still possible) vs "must" (forced).

**Hidden steps.** 1) Read the case. 2) For each line, read the sentence and its true or false word. 3) Map: "could" false
means the box gets a cross; "must" true means a check mark; "could" true and "must" false means it stays empty. 4) Check
against the note line.

**Missing prerequisite.** No Stop 4 card teaches how the could and must lines map to a mark. Card "✓ means yes, ✗ means
no" defines check, cross and empty only as marks. s3.l2 "Must, might, can’t" taught the words for orders, not for grid
boxes. `CaseCard` draws every truth with the same check or cross icon the grid uses for marks. Every Stop 4 box case is
built from could and must truths (`teachWords.box`).

**Recommended teaching intervention.** The UI change below is the fix. Optionally add to s4.l1 a card "Three kinds of box":
three boxes side by side. Check mark: every way that fits gives it (must). Cross: no way gives it (can't). Empty: could,
but not must. Each box gets a because-style row: "Could C have 1? Yes. Must C have 1? No. So: leave it empty." (Declaring
it as a distinction would need the new non-sign contrast panel.)

**Recommended UI change.** In Stop 4 case cards, show box truths as words without check or cross glyphs ("Could C have 1?
Yes. Must C have 1? No."). End each box case with a small drawn box holding its result (check mark, cross or empty), so
the only check or cross on screen is the mark itself. This needs a `CaseCard` variant: a `TeachCase` flag such as `box:
{p, v, mark}` and a "words" style for truths. That is new, but local to `CaseCard`.

**Diagnostic question.** Q1: "The card says ‘C must have 1: false’. What goes in the C – 1 box?" Options: "A cross" /
"Nothing yet, it stays empty" (right) / "Not sure". Q2 (after a wrong answer): "The card also says ‘C could have 1:
true’. Can the box get a cross?" Options: "No, C could still have 1" (right) / "Yes".

**Targeted remediation.** "You may be reading the cross next to ‘must’ as the box’s mark. That cross means the sentence ‘C
must have 1’ is false: the clue does not force it. A box gets a cross only when ‘C could have 1’ is false. Here C could
have 1, so the box stays empty."

**How to test mastery.** No hint. Three boxes are shown with their could and must lines; the learner marks each check,
cross or empty (one of each), right on the first check. Later, the learner reads a Hint case and says what goes in its
box before answering the item.

**Evidence.** `src/engine/puzzles/grid.ts`:606-631 (could, must, `markNote`, box), 913-927 (L1 Teach cases), 941-948 (L1
hint and `hintCase`), 1323-1325 (spread `hintCase` is an outside box), 1670-1674, 1759-1763;
`src/game/components/ExplanationPanel.tsx`:50-60 (truths drawn with `PlayIcon` check or cross); `src/content/stop4.ts`:
475-482; `src/content/stop3.ts`:450-456; probe sample: the mark `hintCase` {"C could have 1": true, "C must have 1": false,
"stays empty"}.

**Reviewer note.** "Every after-miss explanation" overstated it (corrected above). The two grid lessons' step cases
(`gridTeach`, `grid.ts`:740) have no truths at all. The collision is in the box cases (`markPuzzle`, `spreadPuzzle`, the
grid Hint), the person cases (link, enough) and the proof cases. The UI change alone is the right fix and is local to
`CaseCard`. The "Three kinds of box" contrast card is optional; declaring it as a distinction would need the new non-sign
contrast panel, so it is not cheap.

### s4-l3-full-grid-method-and-check (P2)

**Location.** s4.l3 card "Solve a whole grid"; board `L3_FINISH`; Try 5 (`gridPuzzle` with one category, l3-5); check
c1.

**What the learner sees.** Card: "First, put in the marks the clues give you. Then look for a row or column with one empty
box. Spread each new ✓ along its row and its column. Keep going until every row has one ✓." Quiz: "The robots Bolt, Dot
and Rivet are each a different color: blue, green or silver. Use the clues to fill in the grid." It shows a clue list, an
empty grid and "Tap a box once for ✗ no, twice for ✓ yes, and a third time to clear it."

**What the program assumes the learner has been taught.** That the learner holds the whole loop in memory, knows the grid
does not spread a check mark by itself, turns an "or" clue into its cross inside a full grid, and checks the finished grid
against every clue.

**Likely mix-up.** "Every row has one check mark" is taken as "solved", merging a filled grid with a right grid. A clue's
own mark is also mixed up with marks worked out from it.

**Hidden distinction.** A filled grid (one check mark per row) vs a right grid (every clue is true in it).

**Hidden steps.** 1) Put in clue marks (has gives a check, not gives a cross, "or" gives a cross on the one left out). 2)
Spread each check mark (row, then column). 3) Only one left. 4) Spread. 5) Repeat. 6) Check each clue against the grid.
7) Check.

**Missing prerequisite.** The check step ("Ask: ‘Does my grid make every clue true?’") appears only in `Teach.remember`
after a miss. `L3_FINISH` starts from given marks and uses only "has" and "does not have" clues, so working an "or" clue
inside a full grid happens first in the quiz. The method is not on screen during the quiz, because MethodSteps exists only
on case boards. The spread and row, column and outside distinctions themselves are well taught (cards 1 to 3 and
`L3_SPREAD`).

**Recommended teaching intervention.** Add a last line to "Solve a whole grid": "Then check: read each clue. Is it true in
your grid?" Give l3-5 an `Item.workFirst` guided full-grid board with scaffold full and a MethodSteps strip (Clue marks.
Spread. Only one left. Check every clue.), then nothing after that. Add an `L3_FINISH` twin that starts from the clues
alone, including one "or" clue.

**Recommended UI change.** Wire MethodSteps into AssignView grid items and the DrillBoard grid layout when the scaffold is
full, with the current step lit. The existing broken-clue flags after a wrong Check stay.

**Diagnostic question.** Q1: "Every row has one check mark. Are you done?" Options: "Not yet: check that each clue is
true" (right) / "Yes". Q2: "What mark does ‘Bolt is blue or green’ give?" Options: "Bolt – silver gets a cross" (right) /
"Bolt – blue gets a check mark" / "None".

**Targeted remediation.** "A full grid is not always a right grid. Read each clue and look at your grid: is it true there?
Clue 2 says Dot is not green, but your grid gives Dot the green check mark. Find the mark that broke it."

**How to test mastery.** A one-part grid with an "or" clue, right on the first Check with no hint, in two skins.

**Evidence.** `src/content/stop4.ts`:612-620, 297-312, 629, 764; `src/engine/puzzles/grid.ts`:753-759 (rule, remember),
792-805; `src/game/components/CaseBoard.tsx`:238, 312; `src/game/components/AssignView.tsx`:1-5.

**Reviewer note.** Items have no scaffold field. "Give Try 5 scaffold full" should be `Item.workFirst` (a guided full-grid
board, scaffold full, before l3-5's answer grid), applied above. Separately, MethodSteps must be wired into DrillBoard's
grid layout and AssignView, because only CaseBoard renders it today. The highest-value additions are the `L3_FINISH` twin
that starts from clues (with one "or" clue) and the one-line check sentence on "Solve a whole grid".

### s4-l5-only-these-clues-off-screen (P2)

**Location.** s4.l5 cards "One clue can prove a lot", "Can you tell yet?" and "Use only the clues you are told"; board
`L5_ENOUGH`; quiz `enoughPuzzle` (Try 2, Try 4, check c9) and `proofPuzzle`.

**What the learner sees.** Prompt (generated): "Dee, Mia and Tia each eat a different snack: apples, popcorn or grapes. Use
only clues 1 and 2. Can you tell who eats grapes yet?" Clue list: "Tia eats apples or grapes.", "Mia eats apples or
grapes.", "Mia eats popcorn or grapes." No grid. Choices: Yes / Can’t tell yet.

**What the program assumes the learner has been taught.** That the learner can hold the "clues 1 and 2 only" world and
every worked-out mark in their head, and run chains with no grid (Tia and Mia share apples and grapes, so only Dee can
have popcorn, so Dee can't have grapes).

**Likely mix-up.** The learner uses clue 3 because it is on screen and says "you can tell". Or the learner loses a
worked-out cross (Dee) and counts three kids.

**Hidden distinction.** The clues you may use (1 and 2) vs every clue on the list. And facts you worked out vs facts a
clue states.

**Hidden steps.** 1) Cover clue 3. 2) Put in marks from clues 1 and 2. 3) Spread, and only one left. 4) For each kid, ask:
could they? 5) Count. 6) One: Yes. Two or more: Can’t tell yet.

**Missing prerequisite.** Taught in words on cards 3 and 4 and the `L5_ENOUGH` board. But no L5 card, board or quiz shows
a grid, in a stop built on grids. The clue scene shows all clues with nothing covered (s3.l5's "Cover a clue" also covers
only in words). Stop 4 sets no `Item.scratch` thinking board.

**Recommended teaching intervention.** Put a test-world banner over the clue list, "Using clues 1 and 2 only", and cover or
grey clue 3. Add the thinking-board piece (`Item.scratch`: a one-part grid the learner can mark) to proof and enough
items. Add a grid picture to "One clue can prove a lot" (Mia – dog check mark spreading down the dog column) and to "Use
only the clues you are told".

**Recommended UI change.** A "covered" clue state is new for the clues scene, which today has only ok and broken (the same
new state s3-l5-covered-vs-false needs). Add a scratch-grid button on proof and enough items.

**Diagnostic question.** Q1: "The question says ‘Use only clues 1 and 2.’ Clue 3 would tell you the answer. Can you use
it?" Options: "No, only clues 1 and 2" (right) / "Yes, it is a true clue". Q2: "With only clues 1 and 2, how many kids
could eat grapes?" Options: 1 / 2 (right in the example) / 3.

**Targeted remediation.** "You may be using a clue the question told you to leave out. Cover clue 3 with your finger. With
only clues 1 and 2, Mia and Tia could each eat grapes. Two kids could, so you can’t tell yet."

**How to test mastery.** Two enough items (one Yes, one Can’t tell yet where clue 3 would decide), right on the first try
with no hint.

**Evidence.** `src/content/stop4.ts`:705-731, 430-451, 744-751, 773; `src/engine/puzzles/grid.ts`:1692, 1819-1820;
`src/game/components/SceneView.tsx`:115-140 (clue states ok and broken only); `src/content/stop3.ts`:332-340 (Cover a
clue); `src/engine/types.ts`:263-267 (`Item.scratch`); probe sample (enough).

**Reviewer note.** Correct the comparison (applied above): s3.l5 "Cover a clue" also covers only in words (the row label
"Cover up clue k", `lineup.ts`:2042), with no greyed clue on screen. So a "covered" clue state is new UI for the clues
scene (`types.ts`:47 allows only "ok" or "broken"); it is not borrowed from Stop 3. `Item.scratch` is the existing piece
to reuse: a one-part grid board the learner can mark on proof and enough items.

### s4-pass-without-cant-tell (P2)

**Location.** The pass rule of s4.l2, s4.l4 and s4.l5 (the default: 3 right on the first try).

**What the learner sees.** "To finish: 3 right on the first try…" s4.l2 practice is col, row, cant, then a random mode.
s4.l4 is link, notLink2 and notLink (shuffled), then a two-part grid. s4.l5 is two proof items and two enough items (one
Yes, one Can’t tell yet).

**What the program assumes the learner has been taught.** That passing a lesson shows the learner keeps "you can tell"
apart from "can’t tell yet" (and, in L4, can solve a two-part grid).

**Likely mix-up.** A learner who always names someone passes s4.l2 on three decided items and never gets a "Can’t tell
yet" right. The same holds for L4 and L5.

**Hidden distinction.** Decided (one left) vs not decided (Can’t tell yet), with each side tested.

**Hidden steps.** Mastery design: the pass rule must include at least one right answer on each side.

**Missing prerequisite.** No Stop 4 lesson sets `pass`, and no Stop 4 item carries `tags`. s1.l2 uses `include: [{ tag:
'cant-tell' … }]` for exactly this reason, and Stop 3 does too.

**Recommended teaching intervention.** Tag items in `grid.ts` ("cant-tell" and "decided"; "grid-two" for the L4 two-part
grid). Add `pass.include` to s4.l2, s4.l4 and s4.l5 so each needs a right Can’t tell yet (and L4 a right two-part grid).
`extraQuizItem` already serves a missing tag first.

**Recommended UI change.** None. The pass note already lists missing groups ("including a right ‘Can’t tell yet’").

**Diagnostic question.** "Two kids could still have the fish. Can you tell who has it?" Options: "No: Can’t tell yet"
(right) / "Yes, the first one" / "Not sure".

**Targeted remediation.** On the extra item: "This one checks the other side. When more than one kid could still have it,
the right answer is ‘Can’t tell yet.’"

**How to test mastery.** Pass needs at least one right answer on the first try on each side (decided and Can’t tell yet)
in l2, l4 and l5.

**Evidence.** `src/content/stop4.ts`:459-754 (no pass on any lesson), 566-574, 682-691, 743-751;
`src/engine/puzzles/grid.ts`:1200-1218, 1488-1507, 1813-1831 (items without tags); `src/content/stop1.ts`:1053;
`src/engine/drill.ts`:218-231 (`extraQuizItem` serves wanted tags).

**Reviewer note.** Cite the closer precedent too: Stop 3 already does exactly this with the same kind of tag
(`stop3.ts`:415 and 541 use include "cant-tell", and `lineup.ts`:921 and 1461 tag items "cant-tell" and "decided"). Reuse
those tag names so the labels match across stops.

### s4-rev-1 (P2)

**Location.** s4.l2 "Which snack must Nia eat?": "cant" items that ask about a row, and the row half of c4, Try 3 and the
Arcade.

**What the learner sees.** A row question with crosses in other kids' rows. Example: Nia cross apples, Fay cross pretzels,
Omar cross grapes. Unlike column items, the "open" feedback has no "different row" line (`tempt` is empty when the
question asks about a row, `grid.ts`:1131-1136), so the mix-up is never named, even after a miss.

**What the program assumes the learner has been taught.** That for "Which snack must Nia eat?" only crosses in Nia's row
count.

**Likely mix-up.** The generator puts its extra crosses in other kids' rows (`grid.ts`:1026, `q !== p`), and they often
land in the columns of the asked kid's open values. Probe: in 257 of 300 row can't-tell items, an open value's column has
another kid's cross. In 209 of 300, exactly one open value has a column with no cross at all. So the shortcut "the thing
with no cross in its column is still free" names one snack with confidence, or the wrong one.

**Hidden distinction.** A cross in this kid's row (about this kid) vs a cross in another kid's row (about that kid only).
It is the row mirror of s4-l2-cross-in-line-vs-cross-in-row.

**Hidden steps.** 1) Translate "Which snack must Nia eat?" to Nia's row. 2) Count the empty boxes in that row only. 3)
Check other lines only to see whether one rules a box out.

**Missing prerequisite.** No card or board shows a row question with crosses in other kids' rows.

**Recommended teaching intervention.** Extend the tempt line to rows: "Fay’s cross for pretzels is in Fay’s row, so it does
not decide what Nia eats." Teach it with the same box-vs-kid card as the column case, and add one `L2_COUNT` row with a
cross in another kid's row of an open column.

**Recommended UI change.** The same line shading as the column case: on the first row quiz, shade Nia's row and dim
crosses outside it.

**Diagnostic question.** "The question is ‘Which snack must Nia eat?’ Fay has a cross for pretzels. Does that cross tell
you anything about Nia?" Options: "No, it is in Fay’s row" (right) / "Yes, pretzels is out for Nia" / "Not sure".

**Targeted remediation.** "Fay’s cross for pretzels is in Fay’s row. It says Fay does not eat pretzels. It says nothing
about Nia. For Nia, look only across Nia’s row."

**How to test mastery.** A row can't-tell item where one open value's column has another kid's cross, right on the first
try with no hint.

**Evidence.** `src/engine/puzzles/grid.ts`:1026 (extra crosses in other rows), 1131-1136 (`tempt` empty for rows); probe of
300 row can't-tell items.

**Reviewer note.** This was a reviewer's extra finding.

### s4-l1-box-name-notation (P3)

**Location.** s4.l1 card "One each" (first use) and its picture caption; every L1 quiz choice; every box label and
explanation in Stop 4.

**What the learner sees.** Card: "Here a clue says Mia has the apple. So Mia – apple gets a ✓." Quiz choices, letters skin
(generated): "A – 2", "B – 1", "C – 1", "C – 2" for "A clue says: “C does not have 2.” Which box gets a ✗ from this
clue?"

**What the program assumes the learner has been taught.** That "Mia – apple" is read as the name of a box: the place where
Mia's row meets the apple column, which asks the question "Does Mia have the apple?".

**Likely mix-up.** The dash is read as minus or "without" ("C – 2" as C minus 2; "Mia – apple" as Mia without the apple).
Or a box name is read as a claim ("Mia – apple" means Mia has the apple), so "Mia – bread gets a cross" reads like a
double negative, and "Mia – cat" looks wrong as the answer to a "has" clue.

**Hidden distinction.** A box (a place on the grid, a question) vs the mark in it (the answer) vs a statement about it.

**Hidden steps.** 1) Read "P – thing". 2) Find P's row. 3) Find the thing's column. 4) The box where they meet. 5) Then
read its mark.

**Missing prerequisite.** Cards 1 to 3 say "the box for Mia and the cat". Card 4 switches to "Mia – apple" with no
definition, and no card explains the short name. The letters skin pairs letters with the numbers 1 to 4, which makes the
minus reading likely.

**Recommended teaching intervention.** On card 1, or at the first use on card 4, write "the box for Mia and the apple (Mia
– apple)", and add: "We name a box by its row and its column. It asks: does Mia have the apple? The mark in it gives the
answer." Label that box on the picture (`GridScene.labels` already exists).

**Recommended UI change.** When a quiz choice is focused or picked, outline its box on the scene grid, linking the name to
its place (optional). Keep the dash and define it once; do not switch to a slash.

**Diagnostic question.** "What is ‘Leo – dog’?" Options: "The box where Leo’s row meets the dog column" (right) / "Leo
without the dog" / "Leo has the dog".

**Targeted remediation.** "‘Leo – dog’ is just the name of a box: Leo’s row and the dog column. It does not say yes or no.
The mark in the box says that: a check mark means yes, a cross means no, and empty means not known yet."

**How to test mastery.** Tap-the-box items ("Tap the box C – 2") on a grid, right on the first try in two skins, one of
them letters.

**Evidence.** `src/content/stop4.ts`:466-472, 91, 493-501 (first "Mia – apple" at 497); `src/engine/puzzles/grid.ts`:247
(cell: `${nm(p)} – ${label}`), 958 (choices), 142-147 (numbers 1 to 4), 171-175 (letters skin);
`src/game/components/SceneView.tsx`:196-207 (labels on grid boxes); probe: mark choices "A – 2", "B – 1", "C – 1", "C –
2".

**Reviewer note.** Drop the "C / 2" idea (removed above). A slash reads as division or a fraction at this age, which is
worse than the dash. Keep the dash and define it once, and label that box on the picture. Outlining the focused choice's
box on the scene grid is a good, optional UI change.

### s4-board-rows-fresh-vs-added-world (P3)

**Location.** Card boards whose rows switch worlds: s4.l1 `L1_OR`; s4.l5 `L5_PROOF` and `L5_ENOUGH`.

**What the learner sees.** `L1_OR`: "Each row below has one clue by itself." Then "Only clue: Leo has the cat." followed by
"Only clue: Leo does not have the dog.". `L5_PROOF`: a shown row "Only clue: Mia has the dog." (No), then six more "Only
clue:" rows. `L5_ENOUGH`: both rows say "Use only clues 1 and 2", and the cat row needs the fish row's result (Ava must
have the fish).

**What the program assumes the learner has been taught.** That the learner knows each row's world from its label words:
only this clue (start fresh), this clue added to the row above (keep), the card's grid again, or clues 1 and 2. It also
assumes the learner knows the picture above shows only the worked row's world.

**Likely mix-up.** The learner carries an earlier row's clue into an "Only clue" row. In `L1_OR`, "Leo has the cat"
carried into the next row gives Leo – fish No. In `L5_PROOF`, "Mia has the dog" carried into every row gives No
everywhere.

**Hidden distinction.** A row that starts a new pretend world (one clue alone) vs a row that adds to the world above or
shares it.

**Hidden steps.** 1) Read the row label. 2) Decide its world (fresh, add to above, the card's grid, or clues 1 and 2). 3)
Clear or keep the marks you had. 4) Then mark the boxes.

**Missing prerequisite.** The world is signalled only by the label words. The scene above stays the worked row's picture.
No row shows its own world on screen. `diagnose()` works only for case boards, and its `copied` and `all-one` kinds are
defined for case-board stamps, so a carried clue is reported as single wrong marks.

**Recommended teaching intervention.** In `L5_PROOF`, caption the scene "The worked row’s clue: do not use it in the other
rows", or take the clue list off the board after the given row. Add to the `L1_OR` body: "Start each row fresh. Forget the
clue in the row above." Optional: treat each row as a test world, with a banner such as "World: only this clue", and a
contrast card before `L5_PROOF` on the same box, Leo – dog ("Only clue: Mia has the dog" means Leo can't; "Only clue: Mia
has the cat" means Leo could; ask "Did Leo change? No. Only the clue changed.").

**Recommended UI change.** Tag each row "Starts fresh" or "Adds to the row above" (cheap). Optional extras: a mini grid
for each row that redraws for its world, and new board misconception kinds in `diagnose()`: `carried` (a row's wrong marks
equal what the row above's clue would give) and `all-no` (every could mark set to No, as if the shown clue held in every
row).

**Diagnostic question.** "This row says ‘Only clue: Leo does not have the dog.’ Do you still use ‘Leo has the cat’ from
the row above?" Options: "No, only this row’s clue" (right) / "Yes, it is still true" / "Not sure".

**Targeted remediation.** "You may be keeping a clue from an earlier row. Each ‘Only clue’ row is its own pretend world.
Here the only thing you know is ‘Leo does not have the dog.’ So Leo could have the cat or the fish, and those boxes stay
empty."

**How to test mastery.** A board that alternates "Only clue" and "Add clue" rows, right on the first check with no help.
The six `L5_PROOF` rows right on the first check.

**Evidence.** `src/content/stop4.ts`:167-207, 394-423, 430-451; `src/engine/drill.ts`:82-105 (`diagnose` returns nothing
unless the layout is `cases`); `src/engine/types.ts` (`Misconception.when` kinds own-true, copied, all-one,
verdict-only).

**Reviewer note.** Drop `L2_COUNT` and `L4_NOT` from the location, since a carried clue changes nothing there (removed
above). The targeted fixes are the `L5_PROOF` caption (or removing the clue list after the given row) and "Start each row
fresh" in the `L1_OR` body. Tags for each row are cheap and fine. Mini grids for each row and the new diagnose kinds are
optional extras. `L5_ENOUGH`'s shared world is a working-memory issue, covered by s4-l5-only-these-clues-off-screen.

### s4-l2-cant-tell-means-two-ways-fit (P3)

**Location.** s4.l2 cards "Not so fast" and "Count the empty boxes"; the `L2_COUNT` done line; after-miss Teach and
feedback on `onlyOnePuzzle`.

**What the learner sees.** Board done line: "Right. One empty box left: it gets the ✓. Two or more: you can’t tell yet."
Card: "Are two or more left? Then you can’t tell from the boxes you counted. Look at the other rows and columns too."
After a miss: "One way that fits every mark: Leo eats apples. Mia eats popcorn. Nia eats grapes." with "Fits every mark
in the grid: true", "Mia eats grapes: false", "So Mia does not have to eat grapes."

**What the program assumes the learner has been taught.** That "Can’t tell yet" means more than one full way of filling the
grid fits every mark. Also that "one way that fits" is read as one possibility, not as the answer.

**Likely mix-up.** "Two empty boxes in this line" is taken to mean "can’t tell" (a counting shortcut taken as the
meaning). "One way that fits" is read as the right answer ("so Nia eats grapes").

**Hidden distinction.** What you see in one line (two empty boxes) vs what Can’t tell yet means (two different ways fit
every mark). And one way that fits vs the answer.

**Hidden steps.** 1) Count the empty boxes in the line. 2) If two or more, check the other rows and columns for a cross
that rules one out. 3) If none does, two ways fit (one for each box), so Can’t tell yet.

**Missing prerequisite.** The meaning ("more than one answer still fits") appears only in the Teach term after a miss. The
"one way that fits" counterexample appears only in after-miss feedback. No item has an asked line with two empty boxes
that another line decides, so "Look at the other rows and columns too" is never practised. The board's done line states
the shortcut as the rule. Taught in part earlier: s1.l2 "Try every way" and s3.l1 "Trust only the clues" ("If a different
order also fits the clues, you can’t tell").

**Recommended teaching intervention.** Change the done line to: "Two or more: look at the other marks. If none rules one
out, you can’t tell yet." Add an `L2_COUNT` row where Leo's row has two empty boxes but the fish column has only Leo's box
left (answer: a check mark). Optional, once a grid contrast panel exists: declare `{id: 'count-vs-ways', a: 'Two empty
boxes in this line', b: 'Two ways fit every mark'}` with a contrast card of two full grids that both fit "Leo – cat
cross" (in one Leo has the dog, in the other the fish); ask "Did the marks change? No. Two ways fit, so you can’t tell
yet."

**Recommended UI change.** Label the feedback example "One way that fits (not the answer)". The two-grid contrast needs the
new grid contrast scene (see s4-l2-cross-in-line-vs-cross-in-row).

**Diagnostic question.** Q1: "Leo’s row has two empty boxes. In the fish column, only Leo’s box is empty. Can you tell?"
Options: "Yes: Leo has the fish" (right) / "No, two boxes are empty" / "Not sure". Q2: "The card shows ‘One way that
fits’. Is that the answer?" Options: "No, it is just one way that could be right" (right) / "Yes".

**Targeted remediation.** "Counting empty boxes is a quick check, not the rule. ‘Can’t tell yet’ means two different ways
fit every mark. Here the fish column has one empty box, Leo’s. So Leo must have the fish, even though Leo’s row still has
two empty boxes."

**How to test mastery.** An item where the asked row has two empty boxes but a column decides it (answer: that value), and
a true can't-tell item, both right on the first try with no hint.

**Evidence.** `src/content/stop4.ts`:547-563, 255; `src/engine/puzzles/grid.ts`:650 (`TERMS.cant`), 1001-1023 and
1035-1038 (decided items have exactly one empty box in the asked line), 1072-1083 (`thenCase`), 1144-1148 ("One way that
fits every mark"), 1185 (remember); `src/content/stop1.ts`:1043-1048; `src/content/stop3.ts`:382-397.

**Reviewer note.** The essential fixes are the cheap ones: reword the `L2_COUNT` done line as proposed, and add the
`L2_COUNT` row where Leo's row has two empty boxes but the fish column has one. That row is valid on the notSoFast grid
with Mia cross fish and Ava cross fish (answer: Leo – fish check mark). Labelling the feedback example "One way that fits
(not the answer)" is fine. The two-grid contrast card waits on the new grid contrast panel and is not needed at this
priority.

### s4-l4-link-carries-x-not-link-does-not (P3)

**Location.** s4.l4 cards "Use what you know" and "A “not” link"; board `L4_NOT` row not-1; notLink quiz items; two-part
grids.

**What the learner sees.** "Mia and Ava do not have the dog. So they do not eat popcorn." Then: "If Leo has the dog, Leo’s
popcorn box gets a ✗. But you still don’t know who eats popcorn. It could be Mia or Ava." Board row: "Clue 1: The kid with
the dog does not eat popcorn." with Leo – popcorn ✗ and Mia – popcorn and Ava – popcorn Can’t tell yet.

**What the program assumes the learner has been taught.** That a cross carries across a link but not across a "not" link.
A "not" link works only from the kid who has the named thing.

**Likely mix-up.** The learner applies "no dog, so no popcorn" to the "not" link (Mia has no dog, so Mia does not eat
popcorn), or flips it (Mia has no dog, so Mia eats popcorn).

**Hidden distinction.** A link: a check carries as a check and a cross carries as a cross. A "not" link: a check gives a
cross, and a cross gives nothing.

**Hidden steps.** 1) Read the link kind. 2) Find the kid with the check mark for the named thing. 3) For a link, copy each
kid's mark across. 4) For a "not" link, only that kid gets a cross; the others stay empty. 5) Count who is left.

**Missing prerequisite.** Each case is stated on its own card, and the board practises the kids who do not have the thing,
but the four cases (link or "not" link; has or does not have the thing) are never put side by side. A wrong No on Mia –
popcorn gets "Nothing rules out popcorn for Mia…", which names the box, not the belief. Two-part grids depend on it: the
solver carries crosses only through plain links.

**Recommended teaching intervention.** Narrowed by the reviewer to the hint wording: "A linking clue carries a check mark
or a cross to the same kid in the other part. A “not” link works only from a check mark: that kid gets a cross." Put the
same line in the two-part `Teach.remember`. Optional: declare `{id: 'link-vs-notlink', a: 'A link copies both marks', b:
'A “not” link works only from the kid who has it'}` with a contrast card after "A “not” link" on the same pets grid and the
same kid, Mia (no dog): "The kid with the dog eats popcorn" gives Mia – popcorn a cross; "The kid with the dog does not
eat popcorn" leaves Mia – popcorn empty; ask "Did Mia’s pet change? No. The clue changed."

**Recommended UI change.** Optional: a small four-box carry table on the card (link or "not" link, by has the dog or no
dog) with because rows ("Says: the dog-kid does not eat popcorn. Grid: Mia has no dog. So: nothing for Mia."); a new board
misconception kind `notlink-carry` (both kids who do not have the dog marked No); and, on `linkPuzzle`, the second part's
column (popcorn) as a scratch grid the learner can mark.

**Diagnostic question.** "Clue: ‘The kid with the dog does not eat popcorn.’ Mia does not have the dog. What do you know
about Mia and popcorn?" Options: "Nothing yet" (right) / "Mia does not eat popcorn" / "Mia eats popcorn".

**Targeted remediation.** "You may be using a ‘not’ link like a link. A link copies marks: no dog, so no popcorn. A ‘not’
link only works from the kid who HAS the dog: that kid gets a cross. Mia does not have the dog, so this clue says nothing
about Mia."

**How to test mastery.** A notLink can't-tell item right on the first try, plus a two-part grid with a "not" link solved
with no cross wrongly carried (no broken-clue flag on the "not" link).

**Evidence.** `src/content/stop4.ts`:655-670, 339-372; `src/engine/puzzles/grid.ts`:518-532 (carry rules), 1364, 1440-1463
(notLink feedback).

**Reviewer note.** Narrow the fix to the hint wording (applied above), and put the same line in the two-part
`Teach.remember`. The side-by-side contrast card and the new `notlink-carry` kind are optional, because the cards and board
already teach the boundary.

### s4-l4-links-both-ways-vs-if-then (P3)

**Location.** s4.l4 card "Links work both ways"; board `L4_BACK`.

**What the learner sees.** "Only one kid eats popcorn, so Ava must be the kid with the dog." "You can start from either end
of a link."

**What the program assumes the learner has been taught.** That the learner keeps the reason (each snack goes to just one
kid) attached to the takeaway.

**Likely mix-up.** "Clues and rules work backward too." This plants the converse error that s6.l2 ("going backward can’t
tell") then has to undo.

**Hidden distinction.** A link inside a one-each grid (it works backward because only one kid eats popcorn) vs an if-then
rule in general (forward only).

**Hidden steps.** 1) Start from the snack end. 2) Find the one kid with popcorn. 3) Use "only one kid eats popcorn". 4)
That kid is the dog-kid.

**Missing prerequisite.** The reason is in sentence 2, but the takeaway line drops it. Stop 6 teaches the opposite for
if-then rules and never refers back to Stop 4.

**Recommended teaching intervention.** Rewrite the takeaway: "You can start from either end, because each snack goes to
just one kid." Optionally, in s6.l2, add a reminder line (in card text) that contrasts the Stop 4 link with an if-then
rule.

**Recommended UI change.** Put a because row on `L4_BACK`'s given note: "Says: the dog-kid eats popcorn. Grid: only Ava eats
popcorn. So: Ava is the dog-kid."

**Diagnostic question.** "Why can you go from popcorn back to the dog?" Options: "Only one kid eats popcorn" (right) /
"Clues always work both ways" / "Not sure".

**Targeted remediation.** "It works backward only because each snack goes to just one kid. Only Ava eats popcorn, so the
dog-kid must be Ava. If two kids could eat popcorn, you could not tell."

**How to test mastery.** `L4_BACK` right on the first check. In s6.l2, a backward item answered "can’t tell" right on the
first try.

**Evidence.** `src/content/stop4.ts`:671-679, 374-391; `src/content/stop6.ts`:6, 179-184.

**Reviewer note.** The rewrite of the takeaway line is the whole fix. A reminder in s6.l2 is a nice extra, not required.
(A `taughtIn` pointing at s4.l4 from Stop 6 is not allowed, since `taughtIn` must name a lesson in the same stop, so the
reminder goes in card text.)

### s4-l5-could-vs-has (P3)

**Location.** s4.l5 boards `L5_PROOF` ("Test one clue alone") and `L5_ENOUGH`; quiz `proofPuzzle` (Try 1, Try 3, check
c8).

**What the learner sees.** "Each row below has one clue by itself. With only that clue, could Leo still have the dog? Tap
Yes or No." The mark "Could Leo have the dog?" has the options "Yes" and "No". On the L1 to L3 boards the same buttons
meant marks: "Mark each box Yes (✓), No (✗) or Can’t tell yet." Quiz: "Which clue, all by itself, proves that Leo does not
have the dog?"

**What the program assumes the learner has been taught.** That "Yes" now means "still possible" (a check mark or an empty
box) and "No" means a cross, so the clue that gets "No" is the one that proves the cross.

**Likely mix-up.** "Yes" is read as "Leo has the dog (a check mark)", so open rows get "No" ("we can’t say he has it"). A
clue that leaves Leo – dog open then seems to prove the cross, and the learner picks a "same person" clue such as "Leo does
not have the cat".

**Hidden distinction.** Could (not ruled out: a check mark or empty) vs has or must (a check mark). And a clue proving the
cross (with that clue alone, could is No) vs a clue that only names Leo or the dog.

**Hidden steps.** For each clue: 1) Pretend it is the only clue (the one-each rules stay on). 2) Mark what it gives. 3)
Spread. 4) Look at Leo – dog: a cross means No, this clue proves it; a check mark or empty means Yes, it does not. 5) Pick
the clue that gets No.

**Missing prerequisite.** s3.l2 taught must, might and can't for orders. No Stop 4 card says "could" includes empty boxes,
and the option labels keep the Yes and No used for marks on earlier boards. "Proves the cross when could is No" is only in
the board's done line. The board's tempting row ("Leo has the dog or the fish") does teach "names it, but does not prove
it" well.

**Recommended teaching intervention.** Add to "One clue can prove a lot": "Could Leo have the dog? Say yes if the box would
get a check mark or stay empty. Say no only if it gets a cross. A clue proves the cross when the answer is no. The one-each
rules always stay on." Optionally declare `{id: 'could-vs-has'}` with a contrast on the box Leo – dog: "Only clue: Leo does
not have the cat" leaves it empty, so could is yes; "Only clue: Leo has the fish" gives a cross, so could is no.

**Recommended UI change.** Relabel the L5 could options "Still possible" / "Ruled out" and show the box state (check
mark, cross or empty) beside each row. Optionally add the new board misconception kind `all-no` (every could mark No).

**Diagnostic question.** "Only clue: ‘Leo does not have the cat.’ Leo’s dog box is empty. Could Leo have the dog?" Options:
"Yes, nothing rules it out" (right) / "No, we don’t know he has it" / "Not sure".

**Targeted remediation.** "You may be reading ‘could’ as ‘has’. ‘Could Leo have the dog?’ asks if it is still possible. An
empty box is still possible, so the answer is yes. Only a cross makes it no. That is why this clue does not prove the
cross."

**How to test mastery.** The six `L5_PROOF` rows right on the first check. Two proof items right on the first try, one with
a "same person" distractor and one with an "or names it" distractor.

**Evidence.** `src/content/stop4.ts`:172, 404-423, 430-451, 705-713; `src/engine/puzzles/grid.ts`:656 (`TERMS.alone`), 1531,
1606-1615, 1921 (`BOX_OPTIONS`), 2064-2081 (could mark Yes or No); `src/engine/drill.ts`:16 (`YES_NO`);
`src/content/stop3.ts`:450-456.

**Reviewer note.** Relabelling the options ("Still possible" / "Ruled out") and the one added sentence on "One clue can
prove a lot" are enough. The first draft also claimed learners drop the one-each rule when a clue is alone; that claim was
dropped, because the given row teaches it on the board itself (`stop4.ts`:413).

### s4-l4-link-forms-in-other-skins (P3)

**Location.** s4.l4 card "A linking clue"; `linkPuzzle` and two-part grids in the robots, dragons and letters skins. The
practice skins always include one fantasy skin and letters, and the fourth is random, so at least two of the four L4
tries, and often three, use skins without kids.

**What the learner sees.** Card: "“The kid with the dog eats popcorn” means the dog and the popcorn go to the same kid."
Quiz: "Clue: “The cook is silver.” Which robot must be silver?", "“The blue robot is the driver.”", "“The green letter
does not have 2.”"

**What the program assumes the learner has been taught.** That the learner recognizes "the cook", "the blue robot" and "the
green letter" as "whoever has that value": a linking clue.

**Likely mix-up.** "The cook" is read as a robot's name, or "The cook is silver" as a "has" clue about one robot.

**Hidden distinction.** A name (Bolt) vs a description of whoever holds a value (the cook, the blue robot).

**Hidden steps.** 1) See that no robot is named. 2) Split the clue into its two choices (cook, silver). 3) Find the known
one in the grid.

**Missing prerequisite.** The cards show only the "the kid with the X" form.

**Recommended teaching intervention.** Add to "A linking clue": "Linking clues come in other words too: ‘The cook is
silver.’ ‘The blue robot is the driver.’ Each joins two choices and names no robot."

**Recommended UI change.** None.

**Diagnostic question.** "In ‘The cook is silver’, who is ‘the cook’?" Options: "Whichever robot has the cook job" (right)
/ "A robot named Cook".

**Targeted remediation.** "‘The cook’ is not a name. It means whichever robot is the cook. Find the cook column in the grid:
its check mark shows who that is."

**How to test mastery.** `linkPuzzle` items right on the first try in the robots and letters skins.

**Evidence.** `src/content/stop4.ts`:646-653; `src/engine/puzzles/grid.ts`:134-141 (holder "the {v} robot", "{v}"), 146,
152, 1494; probe: link sample "The blue robot is the driver."

**Reviewer note.** Correct the count (applied above). `practiceSkins` always includes one fantasy skin and letters, and the
fourth is random. So at least two of the four L4 tries, and often three, use skins without kids, not exactly two.

### s4-rev-2 (P3)

**Location.** s4.l5 enough items: Try 2 and Try 4, c9, the Arcade.

**What the learner sees.** "Can you tell who eats grapes yet?" with only two choices: Yes / Can’t tell yet.

**What the program assumes the learner has been taught.** That a right "Yes" shows the learner knows who.

**Likely mix-up.** "Yes, you can tell" and "I know it is Dee" are never separated, and a guess is right half the time on an
item that counts toward the 3-first-try pass rule. The `L5_ENOUGH` board asks for each kid's could mark and the count, but
the quiz never does.

**Hidden distinction.** Saying you can tell vs knowing who.

**Hidden steps.** 1) Work out who could. 2) If one, name that kid.

**Missing prerequisite.** The quiz does not ask for the name.

**Recommended teaching intervention.** Make the choices the people plus "Can’t tell yet", as in `onlyOnePuzzle` and
`linkPuzzle` ("Using only clues 1 and 2, who eats grapes?"). Or follow a "Yes" with "Who?" before it counts.

**Recommended UI change.** The choice list changes as above; no new component.

**Diagnostic question.** "You said you can tell. Who eats grapes?" Options: the three kids (one right) / "Not sure".

**Targeted remediation.** "If you can tell, you can name the kid. Count who could still eat grapes using only clues 1 and
2. If only one could, that kid eats grapes."

**How to test mastery.** Enough items with the people as choices, right on the first try with no hint.

**Evidence.** `src/engine/puzzles/grid.ts`:1821 (Yes / Can't tell yet choices).

**Reviewer note.** This was a reviewer's extra finding.

### s4-rev-3 (P3)

**Location.** s4.l4 `linkPuzzle`: Tries 1 to 3, c7, the Arcade.

**What the learner sees.** The prompt shows only the first part's grid ("The grid shows the pets."). The snack column the
question asks about is not drawn anywhere.

**What the program assumes the learner has been taught.** That the learner can keep in their head who clue 1 crossed out
and who clue 2 crossed out, then count who is left.

**Likely mix-up.** In notLink2 items the learner loses one of the two crosses and counts the wrong number of kids left.
The `L4_NOT` board gives them popcorn boxes to mark, but the quiz takes those away.

**Hidden distinction.** The asked part on screen vs held in memory.

**Hidden steps.** 1) Mark the cross each clue gives in the asked column. 2) Count who is left.

**Missing prerequisite.** No place to mark the asked column in the quiz.

**Recommended teaching intervention.** Use the existing `Item.scratch`: a one-column card board of the asked value (one box
per kid: cross or Can’t tell yet) the learner may mark. It is never checked and counts as no help.

**Recommended UI change.** The scratch column above, opened from the "Use the case board" button (with its text changed for
Stop 4).

**Diagnostic question.** "Clue 1 crosses out one kid for popcorn, and clue 2 crosses out another. How many kids are left
for popcorn?" Options: "One" (right) / "Two" / "Not sure".

**Targeted remediation.** "Mark each clue’s cross in the popcorn column, one at a time. Then count the empty boxes. One left
means that kid eats popcorn."

**How to test mastery.** notLink2 items right on the first try, first with the scratch column and then without.

**Evidence.** `src/engine/puzzles/grid.ts`:1494 ("The grid shows the pets."); `src/content/stop4.ts`:339-372 (`L4_NOT`).

**Reviewer note.** This was a reviewer's extra finding.

## Stop 5: Knights & Knaves

### s5-kind-vs-words-truth (P0)

**Location.** s5.l1 cards 1 to 5 ("Riddle Island", "A knight’s words", "A knave’s words", "Check a case", "When you can’t
tell") and Do boards s5.l1-do1 "Check two given cases", do2 "Check every case" and do3 "Words about others". The same
merge comes back in s5.l2 card 1, s5.l3 card 4 and every puzzle explanation.

**What the learner sees.** Card 1: "A knight always tells the truth. Every sentence a knight says is true." Card 2: "Ada
is a knight. Ada says, “I have a cat.” A knight’s words are true. So Ada has a cat." Card 5: "Say Cal is a knight. Then
the words are true, so Cal can swim. This case holds." Only once, on card 4: "Fay is given as a knight. Fay says, “The
well is not full.” The well is full, so Fay’s words are false." Board do1: "Ada is given as a knight, and Ben is given as
a knave. Mark each one’s words true or false. Then tap Holds or Crashes." The row "Ben is a knave, and the well is full."
has the marks "Ben’s words" True or False and "This case" Holds or Crashes; the right taps are True, Crashes. Every board
shows the banner "Knights always tell the truth. Knaves always lie."

**What the program assumes the learner has been taught.** That the learner already keeps two uses of "true" apart. (1)
What the speaker's kind says the words MUST be: the rule's need. (2) Whether the words ARE true in this case, which comes
only from checking what they say against the world (the well, or who is what). And that marking a case means doing (2)
first without looking at the kind, then comparing it with (1).

**Likely mix-up.** The learner merges "Ben is a knave" (the kind being tested) with "Ben’s words are false". This is the
twin of "the treasure is in Bronze" taken as "Bronze’s sign is true". On do1 they stamp Ben's words False, because a
knave's words are false, then tap Holds. On do2 they stamp "Cal is a knight, and Cal cannot swim" True and Holds. With this
merge every case they mark holds, so nothing can ever crash, and the crash-test method of Lessons 3 to 5 has nothing to
stand on. Cards 1 to 3 state a kind as a fact and reason from it ("Ada is a knight… So Ada has a cat."), which is valid.
The merge is modelled on card 5, where a kind that is only being tried ("Say Cal is a knight") is used to set the words'
truth, so its cases can never crash. Only card 4 shows truth coming from the world, and nothing says which a board wants.

**Hidden distinction.** The speaker's kind in a case, which sets what the words must be (a knight's must be true, a
knave's must be false), vs whether the words are true in that case, which comes only from comparing what the words say
with what is so in that case. "Ben is a knave" vs "Ben’s words are false".

**Hidden steps.** 1) Read the case: who is what, and what is so ("the well is full"). 2) Read the words and translate them
into a claim ("the well is not full"). 3) Compare the claim with what is so in this case, ignoring the speaker's kind. 4)
Label the words True or False. 5) Look up what the kind needs (a knight: must be true; a knave: must be false). 6) Compare
the label with the need. 7) Decide Holds (they match) or Crashes (they don't).

**Missing prerequisite.** The boundary is never named on a card. Card 4 makes the comparison once, in prose, but never
says "the words’ truth comes from the well, not from Fay’s kind; the kind only says what the words must be." No lesson
declares `distinctions` (`stop5.ts` lessons 412 to 732). No card has `distinction`. No board has `misconceptions`,
`confused`, `compare` or `scaffold`. The program uses one phrase for both ideas: the rule cards say "A knight’s words are
true" and the marks say "Ada’s words: True". On every L1 board the boundary does appear, but only after a wrong mark:
`factRow`'s why says "In this case, the well is full. Ben says, “The well is full.” So Ben’s words are true." and the
verdict why says "Ben is a knave, and Ben’s words came out true…". L1's quiz Teach repeats the merged wording ("A knight’s
words are true. A knave’s words are false." and "Ask: Is the speaker a knight or a knave? So are the words true or
false?"). Stop 1 teaches the same idea for chests (treasure-vs-sign), but Stop 5 never links back to it.

**Recommended teaching intervention.** Declare `{id: 'kind-vs-truth', a: 'The kind we test for the speaker (it says what
the words must be).', b: 'Whether the words are true in this case (check them against what is so).'}` on s5.l1. Lessons
l2 to l5 get `taughtIn: 's5.l1'` and a "Remember: two different things" card like Stop 1's. Add one contrast card before
"Check a case" (L1 then has 7 cards, the cap; `knights.test.ts`:1493 pins 6 and must change). Use a pair the current
`ContrastPanel` can show: the same speaker, Ben (a knave), the same words "The well is full." Panel 1: world "Test case:
Ben is a knave. The well is full.", truth true, because "It says the well is full. The well is full. They match: True. A
knave with true words crashes." Panel 2: world "Test case: Ben is a knave. The well is not full.", truth false, because
"It says the well is full. The well is not full. They do not match: False. A knave with false words holds." Ask: "Did Ben
change? No. The well did, and the truth went with it. Ben’s kind says what the words must be, not what they are." Fold
s5-speaker-vs-subject and s5-given-kind-vs-fact into this same card (a second pair, and the "Test case" tag beside the
existing "What is true" banner). Make do1 the distinction board: `distinction`, `afterCard` right after the contrast card,
scaffold full, compare rows on each words mark. Add "must be" to cards 1 to 3 while keeping their reasoning from a known
kind ("Ada is a knight, so Ada’s words must be true. They say Ada has a cat. So Ada has a cat."). Rewrite card 5 (see
s5-rev-1). Change L1's quiz Teach to "must be". Add misconceptions and confused questions to every Stop 5 row board.

**Recommended UI change.** (1) Row boards (DrillBoard without a layout) must draw `DrillMark.compare` under each "X’s
words" mark: "Says: the well is full. / In this case: the well is full. / So: do they fit?". Full scaffold on do1 to do3,
light later. Today `CompareRows`, `BecauseRows` and MethodSteps render only in `CaseBoard.tsx` (240-246, 312). `factRow` and
`caseRow` can fill `compare` from `factText` and `claimWhy`. (2) Show the need beside the verdict, like `DrillRow.needs` on
case boards: "Ben is a knave: his words must be false." (3) On boards, the banner should use `PUZZLE_RULE` ("A knight’s
words must be true. A knave’s words must be false.") instead of `RULE` ("Knights always tell the truth. Knaves always
lie."), which reads like a fact about every case. (4) Add a new misconception kind to `diagnose()` in `drill.ts`, which
today returns early unless the layout is `cases` (`drill.ts`:83), so row boards need their own branch. The kind is
`words-from-kind`: every words mark in the row equals the speaker's need, and the row really crashes. The words DrillMark
needs a field carrying the kind's need (`factRow` and `caseRow` know the kind). (5) ConfusedPanel's closing line is about
signs ("read each sign, then check its words against the test", `Distinction.tsx`:139). It needs a line for each board
before Stop 5 can use it. `ContrastPanel` colours each panel by truth and has no verdict or need slot (`Distinction.tsx`:
68-79), so the crash lives in "because" unless an optional verdict line is added.

**Diagnostic question.** Q1: "We test a case where Ben is a knave. The well is full. Ben says, “The well is full.” Are
Ben’s words true or false?" Options: "False, because Ben is a knave" / "True, because the well is full" (right) / "Not
sure". Q2: "So does this case hold?" Options: "Yes" / "No, a knave with true words crashes" (right) / "Not sure".

**Targeted remediation.** "You may be treating “Ben is a knave” and “Ben’s words are false” as the same thing. They are two
different things. Ben’s kind does not make the words true or false. The well does. Ben says the well is full, and it is
full, so the words are true. Ben’s kind says what the words must be: false. True words from a knave means this case
crashes." Then the tiny example: the two panels (Ben, the same words, the well full and not full).

**How to test mastery.** Use a fresh board where kind and truth disagree in at least half the rows (a knave with true
words, a knight with false words). Every words mark (from the world) and every verdict right on the first check, with no
`words-from-kind` diagnosis, in two skins. Then the quiz "The light is on. B says, “The light is on.” Is B a knight or a
knave?" right on the first try.

**Evidence.** `src/content/stop5.ts`:421 (card 1), 433 (card 2), 438-443 (card 3), 449-452 (card 4), 460-461 (card 5),
153-192 (`L1_DRILL`), 412-732 (no distinctions, misconceptions, confused or scaffold anywhere);
`src/engine/puzzles/knights.ts`:46 (`RULE`), 697 (`PUZZLE_RULE`), 1745-1776 (`factRow`: truth from `factText`, no compare;
1761 and 1771 the after-a-wrong-mark whys), 1660-1715 (`caseRow`), 344 ("Then X’s words are …"), 1177 and 1182 (L1 quiz
Teach); `src/engine/grade.ts`:168-170; `src/game/components/DrillBoard.tsx`:46-73, 348-388;
`src/game/components/CaseBoard.tsx`:240-246, 312; `src/engine/drill.ts`:83; `src/game/components/Distinction.tsx`:68-79,
139; `src/engine/__tests__/knights.test.ts`:1493-1496; `src/engine/__tests__/stops.test.ts`:291.

**Reviewer note.** (1) Cards 2 and 3 are not the merge. There the kind is stated as a fact, so "the kind, so the words must
be true, so the world" is valid; L1 quizzes, card 6 and L5 use the same move. The merge is card 5: a kind that is only
"said" (a test), with the words' truth taken from it, so its cases cannot crash. Add "must be" to cards 1 to 3 and rewrite
card 5, but keep reasoning from a known kind. (2) The boundary already appears after a wrong mark on every L1 board
(`knights.ts`:1761, 1771). `grade.ts`:168-170 and `PUZZLE_RULE` are puzzle feedback for L3 to L5, not L1. (3) L1's quiz
Teach repeats the merged wording (`knights.ts`:1177, 1182); change it to "must be". (4) `ContrastPanel` has no verdict or
need slot and colours each panel by truth. The first proposed pair (Ada a knight and Ben a knave, the same words, the same
well) would show two identical green "True" panels with the crash hidden in "because". Either add an optional need or
verdict line to `ContrastPanel`, or use a pair the panel already supports: the same speaker (Ben, a knave), the same words,
with the well full vs not full (applied above). (5) Card budget: one new card makes L1 7 cards, which is the cap. Fold
s5-given-kind-vs-fact and s5-speaker-vs-subject into this contrast card, not separate declared distinctions with their own
cards. `knights.test.ts` pins the card count (1493) and card 4's text (1494-1496). (6) `diagnose()` returns early unless
the layout is `cases` and `row.case` is set (`drill.ts`:83). Row boards need their own branch. The kind's need can come
from the row (`factRow` and `caseRow` know the kind) as a new DrillMark field.

### s5-l2-would-be-vs-must-be (P1)

**Location.** s5.l2 card 1 "Test each kind" and boards s5.l2-do1 "Test each kind" and s5.l2-do2 "Now Ben is a knight"; quiz
tries 1 to 4.

**What the learner sees.** Card 1: "Could a knight say a sentence? Pretend a knight says it. The words must be true." /
"Could a knave say it? Pretend a knave says it. The words must be false." Board do1: "Now pretend a knave says it. Mark the
words true or false. Then say if a knave could say it." The row "The speaker is a knave, and Ben is a knave." has the marks
"The words" True or False and "Could a knave say it?" Yes or No; the right taps are True, No. The bubble reads "Someone
says: “Ben and I are the same kind.”"

**What the program assumes the learner has been taught.** That the learner keeps apart what the words WOULD BE if this
kind said them (worked out with "I" standing for that pretend speaker) and what this kind NEEDS them to be, and knows that
"could say it" means the two match.

**Likely mix-up.** A learner who follows card 1 word for word ("Pretend a knave says it. The words must be false.") marks
the knave row's words False, then "Could a knave say it?" Yes. They conclude that a knave could say "Ben and I are the same
kind". By the same step, a knave could say "I am a knave", which is the opposite of the lesson's result. A second merge:
reading "could say it" as "the words are true", so the knave row gets No whenever the words are false.

**Hidden distinction.** What the words would be if this kind said them (work it out; "I" now means a knight, or a knave) vs
what this kind needs them to be (a knight: true; a knave: false). "Could say it" means the two match. This is the
kind-vs-truth distinction in pretend form, plus "I" changing with the pretend speaker.

**Hidden steps.** 1) Pretend the speaker is a knight. 2) Replace "I" with that knight. 3) Compare the claim with the
pretend world (the speaker's kind and Ben's given kind): the words would be True or False. 4) Need: a knight needs true.
5) Match? Could a knight say it, Yes or No. 6) Repeat 1 to 5 for a knave, who needs false. 7) Combine the two answers: Yes
and No means Only a knight; No and Yes means Only a knave; Yes and Yes means Either kind; No and No means No one.

**Missing prerequisite.** Card 1 states only the need, in words ("must be") that read like the result. The "would be" step
first appears in card 3 ("The words would be false, and knights never lie") without being named as its own step. Step 2
(replace "I" with the pretend speaker) is never said. Step 7's mapping is spread over card 4 ("fits only a knight … fits
either kind … fits no one"), and the full words are only in Teach terms after a miss. Neither board has a contrast, a
misconception or a confused question.

**Recommended teaching intervention.** Reword card 1 as two named steps, moving the existing Teach lines
(`knights.ts`:1374-1377) onto the card: "Step 1: pretend a knave says it, and work out if the words would be true. (“I” now
means a knave.) Step 2: a knave needs false words. If step 1 gives false, a knave could say it." Add a reminder card for
kind-vs-truth (`taughtIn: 's5.l1'`). Optionally a contrast that keeps the same pretend speaker (a knave) and the same need
(false): panel 1 "I am a knight." would be false, so a knave could say it; panel 2 "I am a knave." would be true, so a
knave can't. Ask: "Did the speaker change? No. Only the words did. So work out the words first, then compare with what a
knave needs." Say once on the board: "I is the speaker. Here we pretend the speaker is a knave." Add misconceptions to do1
and do2.

**Recommended UI change.** Under each `sayRow`, show compare rows ("Would be: Ben is a knave and the speaker is a knave, so
they are the same kind, so … ?") and a need line ("A knave needs: false") in the `needs` slot. Rename the mark "The words"
to "The words would be" (`knights.ts`:1812; this also changes the hint case, which is built from the row). Add new row-board
misconception kinds: `need-as-truth` (the words mark equals the kind's need, the opposite of what the words would be) and
`could-is-true` (Could is Yes exactly when the words mark is True, on knave rows only, since for a knight that pattern is
right).

**Diagnostic question.** Q1: "Pretend a knave says, “Ben and I are the same kind.” Ben is a knave. Would the words be true
or false?" Options: "False, because a knave says it" / "True, because the knave and Ben are the same kind" (right) / "Not
sure". Q2: "A knave needs false words. Could a knave say it?" Options: "Yes" / "No" (right).

**Targeted remediation.** "You may be treating “what the words would be” and “what a knave needs” as the same thing. First
work out the words: the speaker is a knave and Ben is a knave, so they are the same kind, and the words would be true. Then
compare: a knave needs false words. True is not false, so a knave can’t say it."

**How to test mastery.** A fresh L2 twin board (partner kind and words changed) right on the first check, with no
`need-as-truth` diagnosis. Then all four L2 quiz types ("I am a knight", "I am a knave", an always-true sentence, a partner
sentence) right on the first try, including one "No one" answer.

**Evidence.** `src/content/stop5.ts`:505-506 (card 1), 513-514, 519-525 (card 3, "would be"), 528-534 (card 4), 537-544
(card 5), 204-225 (`L2_DRILL`; body 209-210); `src/engine/puzzles/knights.ts`:1798-1826 (`sayRow`: "The words", "Could a
knight say it?", label 1810), 1374-1377 ("Step 1: pretend a knight says it…", shown only after a miss), 207-209 (`TERMS`
couldSay, either, noOne; Teach only).

**Reviewer note.** This is the kind-vs-truth distinction again (`taughtIn: 's5.l1'`, plus a reminder card), not a new one.
Card 1 already says "must be", so rewording to "must be" alone (the P0 fix) does not separate the two: both steps have to
be named. Move the existing Teach Step 1 and Step 2 lines onto card 1. The board calls one person three names: "Someone" in
the bubble, "The speaker" in the row, "I" in the words. Say once: "I is the speaker. Here we pretend the speaker is a
knave." The `could-is-true` pattern can be caught only on knave rows. Renaming the mark to "The words would be" is in
`sayRow` (`knights.ts`:1812), and it also changes the hint case.

### s5-given-kind-vs-fact (P1)

**Location.** s5.l1 card 4 "Check a case" and board s5.l1-do1 "Check two given cases", against cards 2 and 3 and every
s5.l1 quiz.

**What the learner sees.** Card 4: "The well is full. Each islander here is given a kind: knight or knave." … "Fay is given
as a knight." … "this case crashes." Board do1: "Ada is given as a knight, and Ben is given as a knave." Its done line: "A
knight with true words holds. A knave with true words crashes. You checked a given knight and a given knave." The quizzes
then state kinds as facts: "Uma is a knight. Uma says, “I can swim.” Can Uma swim?", explained as "Uma is a knight, so “I
can swim” is true." The banner on do1 reads "What is true · The well is full."

**What the program assumes the learner has been taught.** That a kind stated on a board is a test: pretend, and it can turn
out impossible and crash. Meanwhile "The well is full" on the same card, and "Uma is a knight" in a quiz, are facts to
reason from. And that a crash means "this kind cannot be right".

**Likely mix-up.** "Given" sounds like "known for sure", so the learner treats Ben's kind and the well as equal facts. Then
a crashing "given knave" is a contradiction ("You told me Ben is a knave!"). The learner either forces the words to fit
the kind (the P0 merge) or decides the board is wrong. In the other direction, after a given knight crashes, a learner may
doubt a quiz's stated kind and pick "Can’t tell" on "Uma is a knight…". Nothing says why the well beats Fay's kind on card
4: the well is the fact and Fay's kind is the test.

**Hidden distinction.** A fact the puzzle tells you (always true; reason from it: "Uma is a knight, so her words are true")
vs a case you are testing (pretend; check it against the facts; it may crash: "Test: Ben is a knave").

**Hidden steps.** 1) Sort what you are told into facts (the well is full; in a quiz, "Uma is a knight") and the test (the
kind tried in this row). 2) Keep the facts fixed. 3) Check the test against them (the kind-vs-truth steps). 4) If it
crashes, conclude the tested kind is impossible: Ben is not a knave, so Ben is a knight. 5) In a quiz with a stated kind,
reason from it: the words must be true (a knight), so what they say is so.

**Missing prerequisite.** Never taught. Lesson 1 uses "given" for the test (card 4, the do1 body and done line) and never
says "pretend" or "test". "Suppose" first appears in s5.l3 card 2. The step "a crash tells you the kind is wrong" is not on
any L1 card or done line (do1 ends "You checked a given knight and a given knave."). It first appears as "A guess that
crashes can’t be right" in s5.l3 card 3. Stop 1 taught "Pretend the treasure is in one chest" (s1.l4 "Try each chest"), but
Stop 5 never reuses those words.

**Recommended teaching intervention.** Replace "given" with the test-world words Stop 1 already uses. Card 4: "The well is
full. That is a fact. Now we test a kind for each islander: pretend Fay is a knight." Teach the rule as "a crash rules out
the test, never the fact", and mark the test on each board. Fold this into the kind-vs-truth contrast card (its "Test case"
tag beside the existing "What is true" banner) rather than declaring a third L1 distinction with its own card. Rewrite
do1's done line to state the conclusion: "Ben’s case crashes, so Ben can’t be a knave. True words come from a knight." Give
the verdict a because row: "Test: Ben is a knave. Fact: the well is full. So: crashes, so Ben is not a knave."

**Recommended UI change.** Draw the two kinds of statement differently on every L1 board and quiz. Keep the existing `fact`
banner ("What is true · The well is full.", `SceneView.tsx`:165-169) for facts. Put "Test:" into the Stop 5 row labels
(`factCase` label, `knights.ts`:972), reusing the "Test world" idea from `ContrastView`. In quizzes, put the stated kind or
fact in the fact banner too ("What is true · Uma is a knight"); `wordsItem`'s scene has no `fact` today (`knights.ts`:1017,
1050). Do not rename DrillBoard's "Shown" tag, which every stop uses.

**Diagnostic question.** "On this board the well is full, and we test Ben as a knave. Ben’s case crashes. What does that
tell you?" Options: "The well is not full after all" / "Ben can’t be a knave" (right) / "Not sure".

**Targeted remediation.** "You may be treating “the well is full” and “Ben is a knave” as the same kind of thing. The well
is a fact: it stays. Ben’s kind is a test: we are only trying it. When a test crashes, the fact wins and the test is wrong.
So Ben is not a knave: Ben is a knight."

**How to test mastery.** After do1, the learner answers "Which one can crash: the fact or the test?" correctly. On a new
fact board with two speakers, they mark every row and answer "What kind is each speaker?" correctly (each crashing test
flipped). A quiz with a stated kind ("X is a knave. X says, “… not …”.") right on the first try without picking "Can’t
tell".

**Evidence.** `src/content/stop5.ts`:449 ("Each islander here is given a kind"), 451, 158-159 (do1 body), 165 (do1 done),
432-433 (card 2, reasoning from a stated kind), 575 (first "suppose", s5.l3), 584 ("A guess that crashes can’t be right");
`src/engine/puzzles/knights.ts`:1029-1030 (prompt "X is a knight."), 1099 (explanation "S is a knight, so … is true"),
1017, 1050 (no fact banner in quizzes), 972 (`factCase` label); `src/game/components/SceneView.tsx`:165-169;
`src/game/components/DrillBoard.tsx`:356; `curriculum.json` s1.l4 "Try each chest".

**Reviewer note.** Which side is the fact and which is the test changes from board to board, so "a kind is a test" would be
a new wrong rule. On L1 do1 and do2, the kind is tested against a fact (the well). On card 6 and in L1 quizzes, the
speaker's kind is stated (a fact), and you find out about the other islander or the world. On L2 boards, the speaker's kind
is pretend and the partner's kind is given. On L5 do1 and do2, Cal's kind is the fact and each Ava and Ben row is the test,
so a crossed-out row rules out that Ava and Ben case, never Cal's kind. Teach it as "a crash rules out the test, never the
fact", and mark the test on each board. Fold this into the kind-vs-truth contrast card; do not declare a third L1
distinction with its own card (L1 is at the 7-card cap). Rewriting card 4 breaks `knights.test.ts`:1494-1496, which pins
"Each islander here is given a kind" and "Fay is given as a knight". Do not rename DrillBoard's "Shown" tag. Put "Test:"
into the Stop 5 row labels instead. The do2 and do3 done lines already treat crashed cases as ruled out ("Two cases hold …
so you can’t tell").

### s5-inside-guess-vs-known (P1)

**Location.** s5.l3 card 4 "A worked example", s5.l4 card 4 "A worked example", and every puzzle explanation
(`puzzleItem.explain` in s5.l3 to l5; check c5, c6 and c8).

**What the learner sees.** L3 card 4: "Suppose Ava is a knave. Then Ava’s words are false. So Ben is a knight. … That guess
crashes! So Ava is a knight. Ava’s words are true, so Ben is a knave." L4 card 4: "Suppose Ava is a knight. Then Ben is a
knave. Ben’s words are false, so Cal is a knight. … That guess crashes! So Ava is a knave. Then Ben is a knight, and Cal is
a knave." A puzzle explanation: "Suppose Tia is a knave. Then Tia’s words are false. So Eli is a knave. … That guess
crashes, so Tia is a knight." The card's scene is the plain bubbles with the rule banner. Nothing marks which lines are
pretend.

**What the program assumes the learner has been taught.** That everything found after "Suppose…" is true only inside the
guess and must be thrown away when the guess crashes. Only what comes after the crash is known.

**Likely mix-up.** The learner keeps "Ben is a knight" (found inside the crashed guess) as a fact, then meets "Ben is a
knave" two sentences later. In L4 every kind flips: Ben from knave to knight, Cal from knight to knave. Holding both, the
learner marks a mixture (Ava a knight, Ben a knight) or thinks the puzzle contradicts itself. This is the guess vs
conclusion (assumption vs fact) pair.

**Hidden distinction.** What follows inside a guess (pretend; thrown away if the guess crashes) vs what you know (after the
crash, or from words that settle a kind on their own).

**Hidden steps.** 1) Open the guess (a pretend world). 2) Follow it, noting each new kind as "inside the guess". 3) Check
each speaker. On a crash: 4) Close the guess and throw away everything inside it. 5) Write the one thing learned: the
guessed islander is the other kind (known). 6) Follow again from that known kind; these kinds are known. 7) Check the
final case.

**Missing prerequisite.** Never said. "To suppose means to pretend something is true, just to test it" (card 2) covers the
guess itself, not what follows from it. No card says "forget what you found inside the guess". The worked cards have no
test-world banner. IdeaCards reveal a worked example step by step only for case scenes (sign boxes), so a speakers card
shows all its lines at once. In a puzzle (AssignToggles) there is nowhere to note a pretend kind.

**Recommended teaching intervention.** Declare `guess-vs-known` on s5.l3, with `taughtIn` on s5.l4. First and cheapest:
split each worked card into two cards, "Inside the guess" and "After the crash", with a test banner on the first ("Pretend:
Ava is a knave") and each new kind marked "inside the guess", then "Crash: throw these away", then "Known: Ava is a knight"
over the rest. (L3 and L4 have 5 cards each, so this fits the cap.) Add to card 3: "When a guess crashes, throw away
everything you found inside it. Keep only this: the islander you picked is the other kind." On L4's example, say it
plainly: "Ben and Cal both flip. That is fine: the first ones were only pretend." Ship with s5-follow-step-hidden, since
both rewrite `explainSolve` and the two worked cards.

**Recommended UI change.** Add a `test` banner to speakers scenes: a new optional field next to `fact` (`SceneView.tsx`:
165-169), drawn as "Test world · Ava is a knave", with a dashed "pretend" kind badge on each avatar. Later, speakers cards
need a step-by-step reveal like the case scene's `steps` (`IdeaCards.tsx`:36-39 reveals only case steps). In puzzles, use a
scratch board (`Item.scratch`, the existing thinking board) with rows labelled "Guess" and "Known".

**Diagnostic question.** "Inside the guess “Ava is a knave”, we found Ben is a knight. Then the guess crashed. What do we
know about Ben now?" Options: "Ben is a knight" / "Nothing yet: that was inside the guess" (right) / "Not sure".

**Targeted remediation.** "You may be treating what you found inside a guess and what you know as the same thing. “Ben is a
knight” came from pretending Ava is a knave. That guess crashed, so throw it away, and everything in it. What you know is
only this: Ava is a knight. Start again from that: Ava’s words are true, so Ben is a knave."

**How to test mastery.** On a new three-islander worked puzzle, the learner sorts six given lines into "inside the guess"
and "known" with no error. Then they solve one L4 puzzle where at least two kinds flip after the crash, on the first try
with no hint.

**Evidence.** `src/content/stop5.ts`:575 (card 2), 582-584 (card 3), 591-593 (L3 card 4), 650-652 (L4 card 4);
`src/engine/puzzles/knights.ts`:408-432 (`explainSolve`: the "Suppose …" lines, then "That guess crashes, so …", with no
boundary), 424, 754 (puzzle explanation); `src/game/components/IdeaCards.tsx`:36-39;
`src/game/components/SceneView.tsx`:161-176; `src/game/components/AssignView.tsx`:261-276.

**Reviewer note.** Ship this with s5-follow-step-hidden: both rewrite `explainSolve` (`knights.ts`:408-432) and the two
worked cards. The facts are right: IdeaCards reveals steps one at a time only for case scenes (`IdeaCards.tsx`:36). A
cheaper first step than building a step-by-step reveal for speakers scenes: split each worked card into two cards, with a
`test` banner on the first (applied above). This fits the card cap, since L3 and L4 have 5 cards each.

### s5-truth-shown-without-reason (P1)

**Location.** The worked ("Shown") row of every Stop 5 board (s5.l1-do1 to s5.l5-do3), the worked-example cards of L3 and
L4, every Teach case card and every Hint case.

**What the learner sees.** A shown row on s5.l3-do1: "Ava is a knave and Ben is a knight." with "Ava’s words ✗ False",
"Ben’s words ✗ False", "This case ✗ Crashes" and the note "Ben is a knight with false words. That breaks the rule, so this
case crashes." A hint case: "Uma is a knight, and Uma cannot swim." / "Uma’s words: false" / "A knight said something
false. That breaks the rule, so this case crashes." The card for the same L3 case says: "Suppose Ava is a knave. Then Ava’s
words are false."

**What the program assumes the learner has been taught.** That the learner can rebuild, from a bare True or False, why the
words came out that way: what they say vs who is what in this case.

**Likely mix-up.** On the L3 card, the only reason given for "Ava’s words: False" is "Ava is a knave", the kind. So the
worked example itself teaches the P0 merge. The learner copies "knave, so false" as the way to mark words, instead of "Ava
says Ben is a knave; in this case Ben is a knight; so false".

**Hidden distinction.** A truth value vs the comparison that produced it: what the words say vs what is so in this case,
and whether they match.

**Hidden steps.** For each words mark: 1) Says: the claim, with names, not "I". 2) In this case: the kinds or the fact it is
about. 3) Match? 4) True or False. Only then the kind's need.

**Missing prerequisite.** Brief section 5 (show the comparison behind every true or false) is met only after a wrong mark:
`DrillMark.why` from `claimWhy` or `factRow`, for example "In this case, Ben is a knight. So “Ben is a knave” is false." A
shown row (`GivenMark`) prints only the value. Teach cases (`kindsCase`, `wordsCard`) print "X’s words: true or false" with a
fit note. Hints reuse `rowCase`, which drops the reason. `Because` and `compare` exist (`types.ts` 94-98, 409) but only
`signs.ts` fills them and only CaseBoard draws them.

**Recommended teaching intervention.** Give every shown row and every worked-card line its comparison, in the existing
because-row words: "Says: Ben is a knave. / In this case: Ben is a knight. / So: the words do not fit, so False." Keep the
kind's need as a separate last line ("Ava is a knave: words must be false. Fits."). This is the because-rows and
compare-facts piece. `claimWhy` already writes the sentence, so the engine can fill `compare` (says, world) for every words
mark and `because` for shown ones. The Says line must use names (`whenTrue()`, `knights.ts`:262), never "I". Ship together
with the P0.

**Recommended UI change.** In DrillBoard's row layout, draw `BecauseRows` under a given words mark and `CompareRows` under a
mark to tap (full scaffold), as CaseBoard does. Add a label prop to those components rather than changing their fixed
"Test" and "The words fit the test" labels, which Stop 1 uses. Label the world row "In this case" rather than "Test", so it
reads for kinds as well as facts. Give `TeachCase` and `CaseCard` an optional `because` on each truth (a new optional field
on `Truth`), so a case card can show "Says / In this case / So" under "Uma’s words: false", and have `rowCase` carry it into
the hint.

**Diagnostic question.** "This row says Ava’s words are false. Why?" Options: "Because Ava is a knave" / "Because Ava says
Ben is a knave, and here Ben is a knight" (right) / "Not sure".

**Targeted remediation.** "A True or False always comes from a check: what the words say, and what is so in this case. Ava
says, “Ben is a knave.” In this case Ben is a knight. They don’t match, so the words are false. Ava being a knave does not
make them false. It only says they must be false."

**How to test mastery.** Asked "why" on two shown rows (a knight with false words, a knave with true words), the learner
picks the comparison, not the kind, both times. On the next board the compare rows are hidden (light scaffold), with no
wrong words marks.

**Evidence.** `src/game/components/DrillBoard.tsx`:46-73 (`GivenMark`: label and value only), 384 (note);
`src/engine/puzzles/knights.ts`:1660-1715 (`caseRow`: `why` only for the wrong option; note from `withWords`), 1774
(`factRow` note), 252-259 (`kindsCase`), 953-957 (`wordsCard`), 1833-1839 (`rowCase` drops reasons), 1606-1632 (`claimWhy`
exists), 262 (`whenTrue`); `src/content/stop5.ts`:591 (card: "Then Ava’s words are false"), 255 (L3 do1 rows);
`src/engine/types.ts`:94-98, 409; `src/game/components/CaseBoard.tsx`:240-246; `src/game/components/ExplanationPanel.tsx`:
50-61; `src/game/components/Distinction.tsx`:28-35, 51-56.

**Reviewer note.** This is the UI half of the P0 fix; ship them together. The Says line must use names, not "I": `claimWhy`
and `caseRow` quote the speaker's own words (`claimText`), so a row would read "Says: Ava and I are the same kind", which
brings back the speaker and subject problem. Use `whenTrue()` (`knights.ts`:262) for `says`. `BecauseRows` and
`CompareRows` hard-code "Test" and "The words fit the test" (`Distinction.tsx`:28-35, 51-56), and Stop 1 uses them; add a
label prop rather than changing the label for every stop. `because` exists on `CaseStep` and `ContrastPanel`, and `compare`
on `DrillMark` (`types.ts`:94-104, 409). `TeachCase` and `Truth` have neither, so the hint and Teach part needs a new
optional field on `Truth`.

### s5-follow-step-hidden (P1)

**Location.** s5.l3 card 4 and every follow line written by `explainSolve` (puzzle explanations in s5.l3 to l5); also L1
card 5 ("Say Cal is a knight. Then the words are true") and L4 card 4.

**What the learner sees.** "Suppose Tia is a knave. Then Tia’s words are false. So Eli is a knave." (Tia says "Eli and I are
different kinds.") Two lines later: "Eli is a knave, so Eli’s words must be false. But with Tia a knave, they are true." A
generated L4 explanation: "Suppose Dee is a knave. Then Dee’s words are false. So Pia is a knave and Kofi is a knave." (Dee
says "At least one of us is a knight.") Another: "B is a knave, so B’s words are false. So C is a knight." And L4 card 4:
"Ben’s words are false, so Cal is a knight".

**What the program assumes the learner has been taught.** That the learner can (a) read "Then Tia’s words are false" as "for
this guess to hold, they must be false"; (b) silently turn "false" into what it means ("different kinds" false means the
same kind; "at least one of us is a knight" false means none of us is a knight); and (c) see why the other case (Eli a
knight) was skipped.

**Likely mix-up.** The same sentence shape, "X’s words are false", means "must be false (we assume the rule)" in a follow
line and "are false (worked out)" in a crash line. The learner can't tell when to work it out and when to assume, and copies
"are false" from the kind (the P0 merge). Because the NOT step is hidden, a learner who reads "Tia’s words are false. So Eli
is a knave" may think the words say Eli is a knave.

**Hidden distinction.** Using the rule to follow a guess (the words must be false, so the opposite of what they say is so) vs
checking a case (work out whether the words are true, then compare with the kind). And the words being false vs what that
means about the world (the NOT of what they say).

**Hidden steps.** 1) Guess Tia is a knave. 2) Need: Tia's words must be false. 3) Read them: "Eli and I are different kinds"
("I" is Tia). 4) NOT: false means Eli and Tia are the same kind. 5) So, inside the guess, Eli is a knave. 6) Next speaker:
Eli is a knave, so Eli's words must be false. 7) Work out "Tia is a knave": in this guess Tia is a knave, so the words are
true. 8) Compare: they must be false but are true, so crash.

**Missing prerequisite.** `explainSolve`'s `step()` writes the need with "are" ("X’s words are …", `knights.ts`:344) for the
supposed speaker and for every known or worked-out speaker too, and uses "must be" only at a crash (346-347). The NOT step
(`whenTrue` and its opposite) is never shown in a follow line, and a "when false" wording (the same kind, none of us, both
knaves) does not exist yet. The NOT flip (s1.l3) and "Watch the switch" (s2.l4) are never mentioned. The L3 board teaches
the other method (list both cases), and no card links the two: "So Ben is a knight" means "the case with Ben a knave already
crashes". L3 card 2 says "Suppose that one is a knight", but `explainSolve` always supposes the kind that crashes, which is
a knave about half the time.

**Recommended teaching intervention.** Reword `explainSolve` so every need says "must be", and add the meaning line: "Then
Tia’s words must be false. They say Tia and Eli are different kinds. False means they are the same kind. So, inside the
guess, Eli is a knave." Write the "when false" wording for each sentence kind. Give each follow step on the worked card a
because row (Needs / Says / So). Add one line to L3 card 5 to link the two methods: "Following a guess is a short way to
list the cases: “So Ben is a knight” means the case with Ben as a knave already crashed." Use the "Remember" card pattern to
point back to the NOT flip (s1.l3). Change L3 card 2 to "Suppose one islander is a knight or a knave".

**Recommended UI change.** On the worked-example card, show each follow step as a three-row block (Need / Says / So) instead
of one sentence. On the L3 board, add a chip on the shown row that ties it to the card's line ("This is the card’s case").

**Diagnostic question.** "Tia is a knave in this guess. Tia says, “Eli and I are different kinds.” Tia’s words must be
false. What does that tell you?" Options: "Eli and Tia are different kinds" / "Eli and Tia are the same kind, so Eli is a
knave" (right) / "Not sure".

**Targeted remediation.** "Two things are easy to mix up here: the words being false, and what the words say. Tia’s words
say “different kinds”. False means the opposite is so: the same kind. Tia is a knave in this guess, so Eli is a knave too,
inside the guess."

**How to test mastery.** Given a guess and one speaker's words ("the same kind", "different kinds", "X is a knave", "at
least one of us is a knight"), the learner says what the guess forces about the other islander, right 4 times out of 4.
Then they solve an L3 puzzle by following, on the first try.

**Evidence.** `src/engine/puzzles/knights.ts`:335-377 (`step()`: 344 "Then X’s words are …", 346-347 "must be … But with …,
they are …"), 408-432 (`explainSolve`), 419, 424 (supposes the crashing kind), 262-279 (`whenTrue` exists but is not used
in follow lines); `src/content/stop5.ts`:460 (L1 card 5), 575 (L3 card 2), 591-593 (L3 card 4), 650-652 (L4 card 4);
`curriculum.json` s5.two example; generated practice, s5.l4 seed 1 l4-3.

**Reviewer note.** "Are" isn't used only for the supposed speaker. `step()` writes "X is a knave, so X’s words are false."
for every known or worked-out speaker too (`knights.ts`:344); for example the generated L4 line "B is a knave, so B’s words
are false. So C is a knight." and the hand-written L4 card 4 line "Ben’s words are false, so Cal is a knight". Only crash
lines say "must be" (346-347). `whenTrue` gives what the words mean when true; the NOT line also needs a "when false" wording
(the same kind, none of us, both knaves), which doesn't exist yet. Also, L3 card 2 says "Suppose that one is a knight", but
`explainSolve` always supposes the kind that crashes, which is a knave about half the time, so the explanations never model
the move card 2 tells the learner to make. (All applied above.)

### s5-rev-1 (P1)

**Location.** s5.l1 card 5 "When you can’t tell" and board s5.l1-do2, which opens right after it (`afterCard` 4).

**What the learner sees.** Card 5 checks two cases by kind only and takes the fact from the kind: "Say Cal is a knight.
Then the words are true, so Cal can swim. This case holds." One screen later the board says "No one knows if Cal is a
knight or a knave. So there are four cases." It wants the words marked from the fact, with rows for knight and can swim,
knight and cannot swim, knave and can swim, knave and cannot swim. Two of those rows crash.

**What the program assumes the learner has been taught.** That a case fixes every unknown (here Cal's kind and whether Cal
can swim), and the words' truth is then checked against that case.

**Likely mix-up.** "A case" means two different things on two screens. The reason given for "four" names only the unknown
kind, which gives two; the second unknown (can Cal swim?) is never said. So the card's kind of case can never crash, and the
board's can. A learner who copies the card marks "Cal is a knight, and Cal cannot swim" as True and Holds. This feeds the
P0 merge.

**Hidden distinction.** What a case fixes (every unknown: here the kind and the fact) vs what you work out from a kind (the
follow move that L3 names).

**Hidden steps.** 1) List the unknowns (Cal's kind; can Cal swim?). 2) List every case: 2 times 2 gives 4. 3) In each case,
check the words against the fact, then the kind's need.

**Missing prerequisite.** Card 5 never names the second unknown. The quiz Teach for this item already lists all four cases
(`knights.ts`:1026), so only card 5 is out of line.

**Recommended teaching intervention.** Rewrite card 5 on the board's four cases, two of which crash: "Two things are
unknown: Cal’s kind, and if Cal can swim. So there are four cases." Change the do2 body to "No one knows Cal’s kind or if
Cal can swim, so there are four cases." Keep the follow move for L3. Fix this together with the P0.

**Recommended UI change.** None beyond the card text. With the P0 compare rows, each of the four rows shows "Says: Cal can
swim. In this case: …".

**Diagnostic question.** "Cal says, “I can swim.” We don’t know Cal’s kind or if Cal can swim. How many cases are there?"
Options: 2 / 4 (right) / "Not sure".

**Targeted remediation.** "Two things are unknown here: what kind Cal is, and whether Cal can swim. Each can go two ways, so
there are four cases. In each one, check Cal’s words against whether Cal can swim. Then check Cal’s kind."

**How to test mastery.** The do2 board right on the first check, including both crashing rows, and the matching quiz item
right on the first try.

**Evidence.** `src/content/stop5.ts`:459-462 (card 5), 171-176 (do2); `src/engine/puzzles/knights.ts`:1026 (quiz Teach lists
four cases).

**Reviewer note.** This was a reviewer's extra finding.

### s5-speaker-vs-subject (P2)

**Location.** s5.l1 card 6 "Words about others", board s5.l1-do3 "Words about others", quiz types "other" and
"speakerFromOther" (s5.l1 tries 3 and 4, check c1 and c2). It comes back as "I" in s5.l2 ("Ben and I are the same kind"),
s5.l3 puzzles ("Eli and I are different kinds") and s5.l5 card 5.

**What the learner sees.** Card 6: "Islanders can talk about each other too. Dee is a knave. Dee says, “Eli is a knave.” Try
Eli as a knave. Then Dee’s words are true. A knave never says true words, so this case crashes." Board do3: "Dee says, “Eli
is a knave.” Dee and Eli can each be a knight or a knave, so there are four cases." Only Dee's bubble is drawn. Eli appears
only in row labels such as "Dee is a knave and Eli is a knight." Quiz: "Eli is a knight. Dee says, “Eli is a knave.” Is Dee
a knight or a knave?" The scene shows only Dee's bubble.

**What the program assumes the learner has been taught.** That a sentence brings in two people. The speaker's kind sets what
the words must be. The person the words are about decides, by their kind in this case, whether the words are true. And that
"I" means the speaker.

**Likely mix-up.** The learner checks "Eli is a knave" against Dee's kind, because Dee is the only one drawn. With Dee a
knave, they stamp the words True whatever Eli is. Or, in speakerFromOther, they answer with the kind the prompt gave for
Eli ("Knight"). In s5.l2 they compare Ben with Ben on "Ben and I are the same kind", or forget that "I" changes when the
pretend speaker changes kind.

**Hidden distinction.** Who speaks (their kind decides what the words must be) vs who the words are about (their kind
decides whether the words are true). When the words say "I", the speaker is also the one the words are about.

**Hidden steps.** 1) Find the speaker (the name before "says"). 2) Find who the words are about: a name, "I" (the speaker)
or "us" (everyone). 3) Look up that person's kind in this case. 4) Compare it with what the words claim: True or False. 5)
Look up the speaker's kind: the words must be true or false. 6) Compare: Holds or Crashes.

**Missing prerequisite.** Card 6 works one case in prose but never names the two roles. Nothing says "I means the speaker".
The board and the quizzes draw only the speaker (`onBoard: ['dee']`; `wordsItem` uses `speakersScene([sp])`), so the person
the words are about is never on screen. A wrong mark's why does sort it out ("In this case, Eli is a knight. So “Eli is a
knave” is false."), but no misconception names the belief, and there is no contrast and no confused question.

**Recommended teaching intervention.** Make it the second pair of the kind-vs-truth contrast card (not a second declared L1
distinction with its own card, since L1 is at the card cap). Dee is a knave in both panels, with the same words "Eli is a
knave". Eli is a knave in one and a knight in the other, so True vs False. Ask: "Did Dee change? No. Eli did, and the words
are about Eli. Eli’s kind makes the words true or false. Dee’s kind says what they must be." Put "I means the one speaking"
on L1 card 2, where "I have a cat" first appears, and remind on L2 card 1, where "I" becomes the pretend speaker.

**Recommended UI change.** Tag Dee's bubble "about Eli" on do3 and in the "other" and "speakerFromOther" quizzes, or draw
Eli as a figure with no bubble line. (Drawing Eli with `speakersScene(['dee','eli'])` would print "Eli says nothing.",
which brings in silent islanders before L4.) Each row gets compare rows: "Says: Eli is a knave. / In this case: Eli is a
knight." The Says line must use names, never "I". Add a new row-board misconception kind, `about-speaker`: the words marks
equal what they would be if the words were about the speaker (only for rows whose words name someone else).

**Diagnostic question.** Q1: "Dee says, “Eli is a knave.” Whose kind makes these words true or false?" Options: "Dee’s" /
"Eli’s" (right) / "Not sure". Q2: "Whose kind says if the words must be true or must be false?" Options: "Dee’s" (right) /
"Eli’s" / "Not sure".

**Targeted remediation.** "You may be treating the speaker and the person the words are about as the same person. Dee is
speaking. The words are about Eli. To see if the words are true, look at Eli: in this case Eli is a knight, so “Eli is a
knave” is false. Then look at Dee: Dee is a knave, and a knave’s words must be false. They fit, so this case holds."

**How to test mastery.** On a twin board where the speaker's and the subject's kinds differ in two of four rows, every words
mark right on the first check, with no `about-speaker` diagnosis. Both quiz types ("other" with a known speaker, and
"speakerFromOther") right on the first try in two skins. On the L2 board, "Ben and I are the same kind" marked right for
each pretend kind.

**Evidence.** `src/content/stop5.ts`:466-474 (card 6), 148-150 (`L1_OTHERS`, `onBoard ['dee']`), 180-191 (do3), 396-400;
`src/engine/puzzles/knights.ts`:1047-1077 (other and speakerFromOther; scene 1050, prompt 1076), 1606-1632 (`claimWhy`, shown
only after a wrong mark), 128 ("I am a …" when the subject is the speaker), 262 (`whenTrue`);
`src/game/components/SceneView.tsx`:61; `src/engine/drill.ts`:83.

**Reviewer note.** Don't declare a second L1 distinction with its own card and board: L1 has 6 cards and the P0 contrast
takes the 7th. Make it the second pair of the kind-vs-truth contrast (applied above). Drawing Eli with
`speakersScene(['dee','eli'])` would print "Eli says nothing." (`SceneView.tsx`:61), bringing in silent islanders before L4
teaches them. Tag Dee's bubble "about Eli" instead, or draw Eli as a figure with no bubble line. Put "I means the one
speaking" on L1 card 2 and remind on L2 card 1. In compare rows, the Says line must use names (`whenTrue`, `knights.ts`:262),
never "I". The `about-speaker` pattern applies only to rows whose words name someone else.

### s5-guess-vs-case (P2)

**Location.** s5.l3 cards 2 to 5 and the s5.l3-do1 body; s5.l4 card 2 "Start with a strong clue" and boards s5.l4-do1 and
do2; the suppose-item choice "That guess crashes" (s5.l3 tries 1 and 2, check c4 and c9).

**What the learner sees.** L3 card 2: "Pick one islander. Suppose that one is a knight. That is your guess." Card 3: "Your
guess crashes if there is no way to make it work." Card 4: "Suppose Ava is a knave. Then Ava’s words are false. So Ben is a
knight. … That guess crashes!" do1 body: "Each row is one case. The first row is the guess on the card, already checked." L4
card 2: "Try Ava as a knave. Ava counts too, so the words are true. A knave never says true words, so that case crashes." L4
do2 body: "The first row is the guess on the card, already checked." The suppose choices are "Knight", "Knave", "Can’t tell",
"That guess crashes".

**What the program assumes the learner has been taught.** That the learner keeps a guess (one islander's kind) apart from a
case (every islander's kind), and knows a guess crashes only when every case that keeps it crashes.

**Likely mix-up.** The board calls one full case "the guess", and card 4 says the guess crashed after following one case.
So the learner takes "this case crashes" to mean "this guess crashes". On a suppose question where one case for Y crashes
and the other holds, they pick "That guess crashes". On L4 they read "Ava as a knave … that case crashes" as one case, not
four (Ben and Cal are still free).

**Hidden distinction.** A guess (what you suppose about one islander: "Ava is a knave") vs a case (one full way for
everyone: "Ava is a knave and Ben is a knight"). A case crashes when someone in it breaks the rule. A guess crashes only
when every case with that guess crashes.

**Hidden steps.** 1) Fix the guess. 2) List every case that keeps it: 2 with one other islander, 4 with two. 3) Check each
case (the kind-vs-truth steps for each speaker). 4) Count the cases that hold. 5) 0: the guess crashes. 1: the others'
kinds are fixed. 2: can't tell. On L4's strong clue: see that the words are true in every case with Ava a knave, because
Ava alone makes "at least one knave", so all four of those cases crash.

**Missing prerequisite.** Both terms are defined only in Teach after a miss: `caseTerm`, and `guessTerm` ("If every case with
the guess breaks the rule, the guess crashes."). On the cards the line between them is blurred: the boards say "the first
row is the guess", and L4 says "that case crashes". Card 5 ("If the two cases both break the rule, your guess crashes")
comes after the worked example. L4 do1 shows only 2 of the 4 cases with Ava a knave, but its done line says "Every case with
Ava as a knave crashes." The step "whatever Ben and Cal are" is hidden. There is no contrast, misconception or confused
question.

**Recommended teaching intervention.** Fix the words; no new scene is needed. Board bodies: "The first row is one case of
the card’s guess (Ava is a knave)." L4 card 2: "Try Ava as a knave. Whatever Ben and Cal are, Ava counts, so the words are
true. Every case with Ava as a knave crashes." Move card 5's case and guess lines before the worked example (card 4).
Optionally declare `guess-vs-case` on s5.l3.

**Recommended UI change.** On s5.l3-do1 and s5.l4-do1, group the rows under a guess header ("Guess: Ava is a knave · 2
cases"). For suppose questions, add the named mix-up line to the existing "crash" feedback: "One case crashed, but the guess
crashes only if every case with it crashes." (A guess-level mark and a `case-is-guess` pattern would need a new mark that
does not exist.)

**Diagnostic question.** "We keep Ava as a knave. With Ben a knight, the case crashes. With Ben a knave, the case holds.
Does the guess “Ava is a knave” crash?" Options: "Yes, a case crashed" / "No, one case still holds" (right) / "Not sure".

**Targeted remediation.** "You may be treating one case and the whole guess as the same thing. The guess is only “Ava is a
knave”. It has two cases: Ben a knight and Ben a knave. One crashing case is not enough. The guess crashes only if both
cases crash. Here one holds, so the guess has not crashed, and Ben must be a knave."

**How to test mastery.** Three suppose questions in a row, one for each outcome (one case holds, two hold, none), right on
the first try with no hint, including one where exactly one of the two cases crashes. On L4, before the strong-clue board,
the learner says how many cases a guess about one islander covers (four).

**Evidence.** `src/content/stop5.ts`:576 (card 2), 580-586 (card 3), 588-594 (card 4), 597-602 (card 5), 251 (L3 do1 body),
635 (L4 card 2), 296-307 (L4 do1; done 307), 313 (L4 do2 body); `src/engine/puzzles/knights.ts`:213 (`caseTerm`), 219-222
(`guessTerm`), 766-771 (`SUPPOSE_CHOICES`), 854-858 (crash feedback).

**Reviewer note.** Fix the words; no new UI is needed (applied above). A "Guess: Ava is a knave" header over its rows is
enough. A new side-by-side scene of two guesses is not needed, and `ContrastPanel` can't hold one. Card 5's case and guess
lines could move before the worked example (card 4) at little cost. The `case-is-guess` pattern would need a guess-level
mark, which doesn't exist. For suppose questions, the existing "crash" feedback already covers it, so add the named mix-up
line there instead.

### s5-l5-whole-sentence-vs-part (P2)

**Location.** s5.l5 card 5 "When “I” is one part" and board s5.l5-do3; L5 puzzles (try 4, check c8) that use "I … or …" and
"A and I are both knaves".

**What the learner sees.** Card 5: "Raj says, “I am a knave and Vic is a knight.” … So Raj is a knave. Now the words must be
false. The first part is true, so the second part is false. Vic is a knave." Earlier cards: L1 card 1 "A knave always lies.
Every sentence a knave says is false." and L2 card 3 "So no one on the island can say, “I am a knave.”" Generated L5
puzzles include "Cato: I am a knave or Bram is a knight." (explained "If Cato were a knave, Cato would be a knave saying
something true. So Cato is a knight.") and "B: A and I are both knaves."

**What the program assumes the learner has been taught.** That the rule is about the whole sentence. A knave's whole
sentence must be false, but one part of it can be true. So a knave can say "I am a knave and …" even though no one can say
"I am a knave" on its own.

**Likely mix-up.** The learner has learned that no one can say "I am a knave" and that every sentence a knave says is
false. Now a knave says a sentence with a true part. They decide it is impossible (Raj can't be a knave), or that every part
must be false (so Vic is a knight). For "or" they use the "and" picture, or they don't see that "A and I are both knaves"
has two parts.

**Hidden distinction.** Whether the whole sentence is true (what the knight and knave rule checks) vs whether one part is
true. "I am a knave." alone vs "I am a knave and Vic is a knight."

**Hidden steps.** 1) Split the sentence into parts ("I am a knave" / "Vic is a knight"; "A and I are both knaves" is "A is a
knave" and "I am a knave"). 2) Replace "I" with the speaker. 3) In this case, label each part. 4) Combine: "and" needs every
part true; "or" needs at least one part true. 5) Label the whole. 6) Compare the whole with the speaker's need.

**Missing prerequisite.** L5 card 1 teaches that the rule checks the whole sentence for "and", but no card links it back to
L2's "I am a knave", and nothing says "I am a knave" can be one part of a sentence a knave says. Card 5 and do3 show only
"and" with "I". The "I … or …" form (a knave can never say "I am a knave or …") and the "both" form appear in quizzes from
the "andor" pool, with no card and no board.

**Recommended teaching intervention.** Add one line to card 5: "On its own, “I am a knave” can’t be said. Here it is only one
part, and the rule checks the whole sentence." Add one "I … or …" row to do3 (a knave can never say it). Optionally a
contrast card before card 5 (panel 1: "Test case: Raj is a knave.", says "I am a knave.", True, because "It says Raj is a
knave. Raj is a knave. A knave needs false: crash."; panel 2: "Test case: Raj is a knave. Vic is a knave.", says "I am a
knave and Vic is a knight.", False, because "First part true, second part false. One false part makes an “and” false. That
fits a knave."; ask "Is “I am a knave” still true in the second one? Yes. But now it is only one part. The rule checks the
whole sentence.").

**Recommended UI change.** On do3 and in L5 compare rows, split each "and" or "or" sentence into part marks (Part 1 / Part 2
/ Whole), then the need. `claimWhy` already names the part that decides it. Each part mark is a new DrillMark; an
`every-part-false` misconception (both parts marked False when one part is true, for a knave) can only be caught once those
marks exist.

**Diagnostic question.** "Raj is a knave. Can Raj say, “I am a knave and Vic is a knight”?" Options: "No, no one can say “I
am a knave”" / "Yes, if the whole sentence is false" (right) / "Not sure".

**Targeted remediation.** "You may be treating one part and the whole sentence as the same thing. On its own, “I am a knave”
is true from a knave, so a knave can’t say it. Inside an “and”, it is only one part. The whole sentence is false if the
other part is false. So a knave can say it when Vic is a knave."

**How to test mastery.** Two L5 puzzles in a row, one with "I … and …" and one with "I … or …", right on the first try with
no hint. On a part board, the part and whole marks right with no `every-part-false` diagnosis.

**Evidence.** `src/content/stop5.ts`:421-422 (L1 card 1), 519-525 (L2 card 3; line 524), 709-716 (L5 card 5; line 714),
339-345 (`L5_EXAMPLE`), 376-386 (do3), 74 (`PUZZLE_POOL` L5 "andor"), 728 (L5 try 4); `src/engine/puzzles/knights.ts`:589-603
(`andOrCandidates`: "I … or …", "… and I are both …"), 144-157 (clause); generated practice: s5.l5 seed 3 l5-4 "Cato: I am a
knave or Bram is a knight.", seed 1 l5-4 "B: A and I are both knaves."

**Reviewer note.** The first draft said no card or board says the rule checks the whole sentence; card 1 teaches this for
"and" (corrected above). Add one line to card 5. do3 marks only the whole words, so an `every-part-false` pattern can't be
detected until there is a mark for each part. Each part mark would be a new DrillMark. The cheapest addition to do3 is one
"I … or …" row, which a knave can never say.

### s5-method-steps-no-scaffold (P2)

**Location.** s5.l3 (cards 2 to 5, boards do1 and do2, quiz tries 1 to 4) and the s5.l4 quiz (three three-islander puzzles,
150 seconds each in the check); all Stop 5 quiz items.

**What the learner sees.** Card 2: "Then follow what it means, one step at a time." Card 5 "Four possible answers" is text
only. The quizzes are a choose item ("Suppose Kofi is a knave. What must Lena be? Or does that guess crash?", four buttons,
Hint "Here is one case, checked for you. Keep Kofi as a knave, and check Lena as a knave the same way.") and puzzles ("Each
one is a knight or a knave. Mark each one.", Knight or Knave toggles, Hint "Check other cases the same way. The answer is the
case where everyone fits the rule."). Every model explanation supposes the kind that will crash ("Suppose Tia is a knave…
That guess crashes, so Tia is a knight.").

**What the program assumes the learner has been taught.** That after two boards the learner can run the whole chain alone
and in their head: for L4, a guess, up to two kinds that follow from it, and three speakers' truth values across 8 cases.
And that they know what to do when their first guess does not crash.

**Likely mix-up.** With no steps on screen the learner mixes up following and checking, stops after one case, or holds
inside-guess kinds as facts. When their own first guess holds, they think they did it wrong (every model guess crashes), or
they stop without checking the full case.

**Hidden distinction.** A guess that crashes (proves the other kind) vs a guess that holds (proves nothing until every
islander is placed and checked). Also the method's steps vs the answer.

**Hidden steps.** 1) Pick an islander and suppose a kind. 2) List the cases (or follow). 3) Check each case (words true or
false from the case, compared with each kind). 4) Count the cases that hold. 5a) None: the guess crashes, so the islander is
the other kind; go on from that fact. 5b) One: if it places everyone, check each islander; that is the answer. 5c) Two
(suppose questions only): can't tell from this guess. 6) Final check: each islander fits.

**Missing prerequisite.** No Stop 5 board or quiz uses `scaffold`, MethodSteps, `workFirst` or `scratch`; MethodSteps renders
only on Stop 1's case boards. The method is never shown as a list. Step 5b is never modelled, because `explainSolve` always
supposes the kind that crashes. L4 puzzles give the learner no place to write a guess: the toggles mean "my answer".

**Recommended teaching intervention.** Add MethodSteps (the existing strip) to s5.l3-do1 and do2 with scaffold full, in kid
words: "1 Keep the guess. 2 Pick a case. 3 Mark each speaker’s words. 4 Does each kind fit? 5 Holds or crashes. 6 Count the
cases that hold." Give the first suppose quiz a `workFirst` board (`caseRows` for its two cases, scaffold full) and later ones
a light board. Give L3 and L4 puzzles a `scratch` thinking board of `caseRows` grouped by guess. Give the first L4 quiz a
`workFirst` copy of do2 ("check your answer"). Add one worked example in each lesson where the first guess holds: "Suppose
Ava is a knight. One case holds: Ava a knight, Ben a knave. Check everyone: each fits. That is the answer." Change card 2 to
"Suppose one islander is a knight or a knave".

**Recommended UI change.** Draw MethodSteps on row boards (today only `CaseBoard.tsx`:312) and light up the current step as
marks are set. Put `Item.scratch` on `puzzleItem` (`ItemView.tsx`:659-678 already supports it, in lessons only). Draw a
dashed "pretend" state on AssignToggles separate from the answer. Bring the full scaffold back after a wrong first answer
(new examples with `workFirst`).

**Diagnostic question.** "You supposed Ava is a knight, and one case held. Are you done?" Options: "No, I must also crash the
other kind" / "Yes, if every islander is placed and each one fits" (right) / "Not sure".

**Targeted remediation.** "A guess that crashes tells you the other kind. A guess that holds is fine too. If it gives every
islander a kind and each one fits the rule, that case is the answer. You don’t need it to crash. Write the guess on the
board so you don’t have to hold it in your head."

**How to test mastery.** The scaffold fades. The first suppose quiz right with the full board; the next two with the light
board. Then two L3 and three L4 puzzles with the scratch board closed, right on the first try with no hint, at least one of
them solved from a guess that holds.

**Evidence.** `src/content/stop5.ts`:576, 597-602, 246-267 (`L3_DRILL`: no scaffold or `workFirst`), 608-617 (L3 practice),
664-667 (L4 practice), 758; `src/engine/puzzles/knights.ts`:419, 424 (`explainSolve` supposes the crashing kind), 685
(`PUZZLE_HINT`), 736-761 (`puzzleItem`: no scratch or `workFirst`; 150 seconds), 881-907 (`supposeItem`: no `workFirst`);
`src/game/components/CaseBoard.tsx`:312; `src/game/components/ItemView.tsx`:632-678;
`src/game/components/AssignView.tsx`:261-276.

**Reviewer note.** Step 5c ("two cases hold, so can't tell; suppose about another islander") can't happen in a puzzle.
`makePuzzle` keeps only puzzles with exactly one answer, so any case that holds is the answer. Step 5c applies only to
suppose questions (marked above). The simplest fix for the card mismatch: card 2 says "Suppose one islander is a knight or a
knave". Then show, in each lesson, one worked example where the guess holds and is checked. `Item.scratch` is drawn only in
lessons (`ItemView` `learn && item.scratch`), which is the right place for it.

### s5-l3-answer-about-whom (P2)

**Location.** s5.l3 suppose questions (`supposeItem`, tries 1 and 2; check c4 and c9; Arcade).

**What the learner sees.** Prompt: "Suppose Kofi is a knave. What must Lena be? Or does that guess crash?" The choices have
fixed labels: "Knight", "Knave", "Can’t tell", "That guess crashes". Card 3 says: "A guess that crashes can’t be right. So
the islander you picked must be the other kind."

**What the program assumes the learner has been taught.** That "Knight" and "Knave" are about Lena (the other islander),
while "That guess crashes" is about Kofi (the one supposed).

**Likely mix-up.** A learner who finds the crash and remembers card 3 ("the islander you picked must be the other kind")
picks "Knight", meaning Kofi is a knight. The feedback for that pick explains Lena as a knight ("With Lena as a knight, Lena
breaks the rule.") and never says the answer was about the wrong islander.

**Hidden distinction.** The supposed islander (the guess) vs the other islander (the question).

**Hidden steps.** 1) Note who is supposed (Kofi) and who is asked about (Lena). 2) Work the two cases for Lena. 3) Answer
about Lena (Knight, Knave or Can't tell), or about the guess (crash).

**Missing prerequisite.** Not taught, and the labels carry no names. The ChoiceFeedback detail "“Knight” means this case:
Kofi is a knave and Lena is a knight." appears only after the miss.

**Recommended teaching intervention.** Give each item its own labels, keeping the ids: "Lena is a knight", "Lena is a
knave", "Can’t tell what Lena is", "The guess crashes: Kofi can’t be a knave". Add a line to card 5: "The answer is about the
other islander, unless the guess crashes." Add the confused question below. When the answer is "crash" and the pick is a
kind, add the named mix-up to that feedback: "Knight here is about Lena. Kofi is the one we guessed."

**Recommended UI change.** Name the islander in every choice. Under the prompt, show two tags: "Guess: Kofi is a knave" and
"Question: what is Lena?".

**Diagnostic question.** "In this question, the choice “Knight” is about…" Options: "Kofi, the one we supposed" / "Lena, the
other islander" (right) / "Not sure".

**Targeted remediation.** "You may be mixing up the islander we guessed about and the one the question asks about. The guess
is about Kofi. The question asks about Lena. If the guess crashes, pick “The guess crashes”. Don’t answer with Kofi’s kind."

**How to test mastery.** Two crash items and one item with one case holding, in a row, right on the first try; the named
labels are removed on the last one.

**Evidence.** `src/engine/puzzles/knights.ts`:766-771 (`SUPPOSE_CHOICES`), 887 (prompt), 860-878 (Knight and Knave feedback
"“Knight” means this case: …"); `src/content/stop5.ts`:584 (card 3), 96 (`distinct()` keys).

**Reviewer note.** Labels that change for each item while keeping the same ids work. `distinct()` builds its key from the
labels (`stop5.ts`:96), so labels with names also catch near-duplicate questions. When the answer is "crash" and the pick is a
kind, add the named mix-up to that feedback (applied above).

### s5-l5-keep-vs-true (P2)

**Location.** s5.l5 boards s5.l5-do1 "List the cases for “and”" and s5.l5-do2 "List the cases for “or”".

**What the learner sees.** Body: "Cal is a knave and says, “Ava and Ben are both knights.” … Mark Cal’s words true or false.
Keep a case only if the words fit a knave." Each row has "Cal’s words" True or False and "Keep or cross out?" Keep or Cross
out. Card 4: "Cross out each case where the speaker’s words don’t fit."

**What the program assumes the learner has been taught.** That the learner keeps "the words are true" apart from "keep this
case". For a knave, you keep exactly the cases where the words are false.

**Likely mix-up.** "Keep" reads like "yes" or "true", so the learner keeps the rows where Cal's words are true. That is the
"takes a knave’s words as true" mistake, which on the quiz gives "Ava and Ben are both knights". The board only names the
first wrong mark.

**Hidden distinction.** Whether the words are true in a case vs whether the case can happen (fits the speaker's kind).

**Hidden steps.** 1) Mark the words from the case (parts, then and or or). 2) Need: a knave's words must be false. 3) Keep if
the mark equals the need; cross out if not. 4) Read what is left.

**Missing prerequisite.** The body says it once. There is no misconception, no compare or need slot, no confused question.
The quiz feedback "reverse" ("Your answer takes a knave’s words as true.") exists, but only after a wrong quiz answer.

**Recommended teaching intervention.** Reuse kind-vs-truth (`taughtIn: 's5.l1'`) with a one-line reminder card for L5, tied
to the fact and test framing: "Cal is a knave for sure. Each row tests Ava and Ben. Keep a row only if Cal’s words come out
false there. Keep is not True." Put the need on each row: "Cal is a knave: needs false".

**Recommended UI change.** Show "Needs: false" beside each Keep or Cross out (the `DrillRow.needs` piece, drawn on row
boards). The row labels name only Ava and Ben (`about: ['ava','ben']`), so the need must be on each row, not only in the
body. Add a new misconception kind, `keep-is-true`: for a knave speaker, every Keep sits on a True words mark and every
Cross out on a False one.

**Diagnostic question.** "Cal is a knave. In this case Cal’s words are true. Keep it or cross it out?" Options: "Keep, the
words are true" / "Cross it out, a knave can’t say true words" (right) / "Not sure".

**Targeted remediation.** "You may be treating “the words are true” and “keep this case” as the same thing. For a knave it
is the other way round: true words can’t come from a knave, so that case can’t happen. Cross it out. Keep the cases where
Cal’s words are false."

**How to test mastery.** Both keep boards right on the first check with no `keep-is-true` diagnosis, then L5 tries 1 to 3
right on the first try.

**Evidence.** `src/content/stop5.ts`:353-375 (do1, do2; bodies 359, 370), 700-706 (card 4), 347-349 (`listRow` decide "keep");
`src/engine/puzzles/knights.ts`:1590 (`KEEP_CROSS`), 1676-1690 (keep marks and why), 1528-1529 ("reverse" headline).

**Reviewer note.** Add a reminder card tied to kind-vs-truth (`taughtIn: 's5.l1'`) and to the fact and test framing
(applied above). The row labels name only Ava and Ben (`stop5.ts`:349), so the need, "Cal is a knave: needs false", has to
be on each row (`DrillRow.needs`, drawn on row boards), not only in the body.

### s5-l5-true-vs-exactly (P2)

**Location.** s5.l5 quiz tries 1 to 3 (`andOrItem`), check c7 and c8.

**What the learner sees.** "Kofi is a knave. Kofi says, “Sol is a knight or Mo is a knight.” Which choice says exactly what
you know about Sol and Mo?" Choices: "Sol and Mo are both knights.", "Sol and Mo are both knaves.", "At least one of Sol and
Mo is a knave. It could be just one.", "At least one of Sol and Mo is a knight. It could be just one."

**What the program assumes the learner has been taught.** That the right choice must allow every case left and no case
crossed out ("exactly"), not just be true.

**Likely mix-up.** When only "both knaves" is left, "At least one of Sol and Mo is a knave" is true, so the learner picks it.
But its "It could be just one" allows cases that were crossed out.

**Hidden distinction.** A choice that is true about what is left vs the choice that says exactly what is left (allows every
case left and no other).

**Hidden steps.** 1) List the four cases and keep or cross out each. 2) For each choice, list the cases it allows. 3) Pick
the choice whose cases are exactly the ones left.

**Missing prerequisite.** Never stated on a card. The boards' done lines only model the matching sentence ("Three cases are
left. So at least one of Ava and Ben is a knave. It could be just one."). The "extra" feedback ("Your answer allows a case
that can’t happen.") appears only after a miss.

**Recommended teaching intervention.** Add a line to card 4 "List the cases": "Then pick the choice that allows just the
cases left: not one more, not one less." Give try 1 a `workFirst` board whose last mark is "Which sentence fits the cases
left?", with the four labels as options (`isSentenceMark` already draws long options as sentences).

**Recommended UI change.** After the four cases are marked (on the board, and on the `workFirst` board for try 1), show each
choice with four small case dots, filled for the cases it allows, so the learner matches pictures.

**Diagnostic question.** "Only one case is left: both knaves. Does “At least one is a knave. It could be just one.” say
exactly that?" Options: "Yes, it is true" / "No, it also allows cases we crossed out" (right) / "Not sure".

**Targeted remediation.** "A choice can be true and still say too little. “It could be just one” allows Sol a knight and Mo
a knave, and we crossed that case out. The exact answer allows only what is left: both knaves."

**How to test mastery.** L5 tries 1 to 3 right on the first try, including one knave's "or" with one case left.

**Evidence.** `src/engine/puzzles/knights.ts`:1476-1481 (labels), 1546 (prompt), 1524-1531 ("extra" feedback);
`src/content/stop5.ts`:363, 374 (done lines), 700-706 (card 4).

**Reviewer note.** The first draft proposed a contrast scene in the done lines; it doesn't fit `ContrastPanel`, which holds a
world, words and a truth. Use the case-dots idea instead, or give try 1 a `workFirst` board as above (applied).

### s5-l4-count-words (P2)

**Location.** s5.l4 card 3 "“Us” means everyone", board s5.l4-do1, and L4 puzzles (pool "basic").

**What the learner sees.** Card 3: "“Exactly one of us is a knight” counts every islander in the puzzle. It counts the
speaker too." Board do1 marks only "At least one of us is a knave." Puzzles also say "Exactly one of us is a knight.", "At
least one of us is a knight.", "We are all knaves." and "Exactly two of us are knights."

**What the program assumes the learner has been taught.** That "we" means the same as "us", and that the learner can count
knights or knaves in a case, the speaker included, and compare the count with "exactly" or "at least".

**Likely mix-up.** The learner reads "We are all knaves" as about the others, counts "exactly one … knight" without the
speaker, or merges "at least" and "exactly".

**Hidden distinction.** "Us" and "we" (everyone, the speaker too) vs "the others"; "exactly k" vs "at least k".

**Hidden steps.** 1) Read "us" or "we" as all three. 2) Count the kind in this case, the speaker included. 3) Compare with
"exactly" or "at least". 4) Label the words. 5) Need from the speaker's kind.

**Missing prerequisite.** "We" is defined only in Teach after a miss (`TERMS.we`, `countTerm`). No board marks an "exactly"
sentence, and card 3 has no picture. Stop 1 taught "exactly" and "at least" for signs and NOT, not for counting kinds that
include yourself.

**Recommended teaching intervention.** A twin board, or two extra rows on do1, with "Exactly one of us is a knight" and "We
are all knaves". Add "We means us" to card 3. Optionally give card 3 a contrast picture on one case (Ava a knave, Ben and Cal
knights): "At least one of us is a knave" counted with Ava (true) vs without Ava (false, the wrong count).

**Recommended UI change.** Optional: on count rows, draw the three islanders as counters with the speaker highlighted ("Ava
counts too"), and a "Count: 1 knave · Needs: at least 1" pair like `needs` on case boards.

**Diagnostic question.** "Ava says, “At least one of us is a knave.” Ava is a knave; Ben and Cal are knights. How many
knaves are there among us?" Options: "0" / "1" (right) / "Not sure".

**Targeted remediation.** "“Us” and “we” mean everyone in the puzzle, and the speaker counts too. Ava is one of us, and Ava
is a knave. So there is one knave, and the words are true."

**How to test mastery.** Two L4 puzzles with a counting sentence (one "exactly", one "we") right on the first try.

**Evidence.** `src/content/stop5.ts`:640-645 (card 3; line 642), 292-308 (do1); `src/engine/puzzles/knights.ts`:561-587
(candidates, "basic" pool), 198-210 (`TERMS.we`), 228-235 (`countTerm`), 1616-1619 (`claimWhy` count line).

**Reviewer note.** The cheapest fix is a twin board, or two extra rows, with "Exactly one of us is a knight" and "We are all
knaves". The counters picture is optional. Teach already defines each counting phrase (`countTerm`) after a miss.

### s5-rev-2 (P2)

**Location.** s5.l1 card 4 "Check a case" and board s5.l3-do1 (the first case with two speakers).

**What the learner sees.** L1 card 4: "A case holds when the speaker fits the rule" (in the singular). Every L1 row checks
one speaker, even on the well board, which draws three. On s5.l3-do1, the row "Ava and Ben are both knights" has Ava
breaking the rule (a knight with false words) and Ben fitting, so the case crashes.

**What the program assumes the learner has been taught.** That a case holds only when every speaker fits, so one breaker
crashes the whole case.

**Likely mix-up.** A learner who checks only the last speaker, or takes one fit as enough, taps Holds.

**Hidden distinction.** One speaker fits vs the whole case holds.

**Hidden steps.** 1) Check each speaker in the case. 2) If any one breaks the rule, the case crashes.

**Missing prerequisite.** The rule is on no card before that board. It appears only in Teach after a miss ("A case works
only when everyone fits this rule", `knights.ts`:898), in L3 card 3's "Someone always ends up breaking the rule" (which is
about guesses), and later in L4 card 5 ("If each one fits, you are done").

**Recommended teaching intervention.** One line on L3 card 5: "A case holds only when every islander fits. One breaker
crashes it." Put the same words in the do1 body. Add a row-board misconception on L3 do1: Holds tapped while the learner's
own words marks make someone a breaker.

**Recommended UI change.** None beyond the text; the shown row already models it.

**Diagnostic question.** "In this case Ava breaks the rule and Ben fits. Does the case hold?" Options: "Yes" / "No, one
breaker crashes it" (right) / "Not sure".

**Targeted remediation.** "A case holds only when everyone in it fits the rule. Ava breaks it, so this case crashes, even
though Ben fits."

**How to test mastery.** s5.l3-do1 right on the first check, including a row with one breaker and one fitter.

**Evidence.** `src/content/stop5.ts`:450 (L1 card 4), 251-267 (L3 do1); `src/engine/puzzles/knights.ts`:898.

**Reviewer note.** This was a reviewer's extra finding. It is P2 because do1's shown row already models it (Ava fits, Ben
breaks, crashes), and the wrong-mark why names the breakers.

### s5-one-idea-many-words (P3)

**Location.** The whole stop: boards, cards, Teach, hints.

**What the learner sees.** Boards: "Holds" / "Crashes". Teach case notes: "This case works." / "This case does not work."
Cards: "fits the rule" / "breaks the rule". L2 cards: "That works." L5 boards: "Keep" / "Cross out". L5 feedback: "a case
that can’t happen" / "can still happen". L3 hint: "Keep Kofi as a knave". "Crash" is used for a case (L1 card 4) and for a
guess (L3 card 3).

**What the program assumes the learner has been taught.** That the learner maps five pairs of words onto one idea (a case
fits the rule or not), and keeps "keep" (hold the guess) apart from "Keep" (a case survives).

**Likely mix-up.** The learner thinks "works", "holds", "fits", "keep" and "can happen" are different checks, or reads "Keep
Kofi as a knave" as the Keep mark. Using "crash" for both a case and a guess feeds s5-guess-vs-case.

**Hidden distinction.** One idea (does this case fit the rule?) in one pair of words; a case crashing vs a guess crashing.

**Hidden steps.** Translate each word to Holds or Crashes before acting.

**Missing prerequisite.** There is no single term. `TERMS.fits` defines "fits the rule" but never says "works" and "holds"
mean the same. The `caseRow` note says "This case holds", while `kindsCase` and `fitNote` say "This case works".

**Recommended teaching intervention.** Use one pair for cases everywhere (Holds and Crashes). Change the `fitNote`,
`kindsCase` and and-or card notes, the L2 card wording ("That works" becomes "That fits") and the L5 feedback ("can’t
happen" becomes "crashes"). Say "the guess crashes" only together with "every case crashes". Change the L3 hint to "Hold
Kofi as a knave". Keep "Keep" and "Cross out" on L5 boards (there the speaker's kind is the fact, and a row is ruled out
rather than crashed), but say once that "cross out" means "this case crashes".

**Recommended UI change.** One badge style for Holds and Crashes on boards, case cards and hints.

**Diagnostic question.** "On the board a case “holds”. In the explanation the same case “works”. Are these the same?"
Options: "Yes" (right) / "No" / "Not sure".

**Targeted remediation.** "Holds, works and fits the rule all mean the same thing: everyone in this case fits the rule."

**How to test mastery.** Not tested on its own. Measure it by fewer wrong verdict marks after a miss explanation.

**Evidence.** `src/engine/puzzles/knights.ts`:238-242 (`fitNote` "This case works."), 255-257 (`kindsCase`), 1699 (`caseRow`
note "This case holds."), 1504 (and-or card note), 1527, 1531 ("can still happen" / "can’t happen"), 894 (hint "Keep X as a
…"), 898 ("Keep the guess"), 1590 (`KEEP_CROSS`); `src/content/stop5.ts`:513-514 ("That works."), 450, 582.

**Reviewer note.** Also cover the verbs for assuming something (see s5-rev-3: given, Say, Try, Pretend, Suppose). Keep "Keep"
and "Cross out" on L5 boards: there the speaker's kind is the fact, and a row is ruled out rather than crashed. Just say once
that "cross out" means "this case crashes" (applied above).

### s5-rev-3 (P3)

**Location.** s5.l1 card 4 and do1 ("given"), L1 cards 3 and 5 ("Say …"), L1 card 6 and L4 card 2 ("Try … as a knave"), s5.l2
("Pretend"), s5.l3 card 2 ("Suppose").

**What the learner sees.** Five different verbs for "assume this, just to test it" before L3 defines one of them: "Fay is
given as a knight.", "Say Cal is a knight.", "Say Ben tells you", "Try Eli as a knave.", "Pretend a knave says it.",
"Suppose that one is a knight."

**What the program assumes the learner has been taught.** That all five words mean the same move: assume this, only to test
it.

**Likely mix-up.** In a stop where every bubble reads "X says…", "Say Cal is a knight" can be read as someone saying it,
which mixes up a test with speech. "Given" reads as a fact (see s5-given-kind-vs-fact).

**Hidden distinction.** Assuming something to test it vs someone saying it (or it being a fact).

**Hidden steps.** Translate each verb to "suppose, just to test it".

**Missing prerequisite.** "Suppose" is defined only on L3 card 2. Stop 1's "Pretend" is never linked.

**Recommended teaching intervention.** Use one word from L1 on, "Suppose" or a "Test:" tag, with Stop 1's "Pretend" as its
meaning. Change "Say…" to "Suppose…". Do this together with the fact-vs-test rewording of card 4.

**Recommended UI change.** The "Test:" tag on row labels (from s5-given-kind-vs-fact).

**Diagnostic question.** "“Suppose Cal is a knight.” Did anyone say Cal is a knight?" Options: "No. We are only trying it"
(right) / "Yes, someone said it" / "Not sure".

**Targeted remediation.** "“Suppose” means we try it out to see if it can work. Nobody said it, and it might be wrong. If it
crashes, we know it is wrong."

**How to test mastery.** No separate test; measured by fewer verdict errors on L1 boards after the rewording.

**Evidence.** `src/content/stop5.ts`:449-451 (card 4), 460 (card 5), 466-474 (card 6), 505-506 (L2 card 1), 575 (L3 card 2),
635 (L4 card 2).

**Reviewer note.** This was a reviewer's extra finding.

## Stop 6: If… then

### s6-l2-breakable-vs-always-kept (P1)

**Location.** s6.l2 Do boards: "Mark the four boxes" (s6.l2-do-boxes), then "Mark a case: going forward" (s6.l2-do-fwd),
where "Can this case happen?" is first answered No. The same step comes back in every s6.l2 and s6.l3 quiz scene and in the
stop check. The frame switches back without being named in s6.l4 and s6.l5.

**What the learner sees.** In Lesson 1: "Ben got dessert but left some veggies. … So Ben broke the rule." In Lesson 2, card
"Could it happen another way?": "That case keeps the rule, so it can happen." The pet boxes board (s6.l2-do-boxes) uses the
pet rule with no always-true line and has the learner mark Dog and Not four legs as a case that breaks the rule. Two boards
later, the scene line on s6.l2-do-fwd says: "In this story, the rule is always true." and the board asks "Can this case
happen?" on "Max is a dog and does not have four legs." L2 and L3 quiz scenes add one plain line: "Every kid follows this
rule." or "Every dragon follows this rule." In Lesson 5: "Your job is to check that nobody broke the rule."

**What the program assumes the learner has been taught.** That the learner sees two ways of holding the same if-then rule.
(1) A rule people can break: each case is judged kept or broken, and the break case is a real kid (L1, L5). (2) A rule
that is always true in this story: the one case that would break it can't happen and is crossed out (L2, L3). Also that "a
true rule" means no case in the story breaks it.

**Likely mix-up.** The learner carries Lesson 1's frame into Lessons 2 and 3. In Lesson 1 the break box held a real kid,
and on s6.l2-do-boxes the learner has just marked the dog without four legs as a real case, so "Max is a dog and does not
have four legs" seems able to happen (three-legged dogs are real too). "Cal did not carry an umbrella" then leaves "Cal may
have broken the rule" open, so "Nothing follows for sure" seems right. That answer is correct in Lesson 1's frame and wrong
only because of one unmarked scene line. The opposite slip is possible too: after Lesson 3, the learner thinks a stated rule
is never broken, and the Lesson 5 checker job stops making sense.

**Hidden distinction.** A case that breaks the rule (Lesson 1: a kid broke it) vs a case that can't happen because the rule
is always true here (Lessons 2 and 3). Also "the rule is true" (no case in the story breaks it) vs "this case keeps the
rule".

**Hidden steps.** 1) Notice the premise line ("always true", "Every kid follows this rule"). 2) Switch frame: the break box
is empty. 3) Cross out any case that would break the rule. 4) Reason only with the cases left. In L4, switch again: no
sentence is assumed true, and every case is tested. In L5, switch back: a break may be there.

**Missing prerequisite.** No L2 card says that a case which breaks an always-true rule can't happen. Card 3 gives only the
other half: "That case keeps the rule, so it can happen." (`stop6.ts`:393). The first statement of it is L3 card 2: "That
case breaks the rule. Here the rule is always true, so it can’t happen." (`stop6.ts`:444). That comes after L2's board and
quiz have already asked it. Card "One way only" calls the pet rule "a true rule", but its scene is `L2_RULE`
(`ruleScene('pets')`, `stop6.ts`:163) with no "in this story" line. The mark label "Can this case happen?"
(`conditionals.ts`:1692) says neither "here" nor "in this story". The why text says "so this case can’t happen here" only
after a wrong mark. The premise is one plain line of the text scene (`ruleScene` kept, `conditionals.ts`:571-577; on letters
cards it is the fourth line, after the vowel and odd note). The same everyday skins appear without it in L1 and L5 and with
it in L2 and L3. s5.l1's "crashes" ("Check a case") is the right picture, but Stop 6 does not reuse it.

**Recommended teaching intervention.** Declare an L2 distinction `{id: 'broken-vs-cant-happen', a: 'A rule people can
break: a case can break it (Lesson 1)', b: 'A rule that is always true here: the case that would break it can’t happen'}`.
Put the always-true line on the "One way only" card's scene. Add a contrast card before "Could it happen another way?". Both
panels show the same case, "a kid who got dessert but left some veggies." Panel A: world "The lunchroom rule. Kids can
break it." then "This kid broke the rule." Panel B: world "Every kid follows this rule." then "This case can’t happen here."
Ask: "Did the kid change? No. What changed? Whether the rule is always kept." `ContrastView` prints True or False today, so
it needs an optional truth label ("Can happen" / "Can’t happen"), a small extension of the contrast scene. Then insert a
twin of the four-box board (`distinction: 'broken-vs-cant-happen'`, `afterCard` next to the contrast card) in the drill
array between s6.l2-do-boxes and s6.l2-do-back: the same pet boxes, marked can happen or can't happen, with the box that
breaks the rule crossed out. That is the exact point where the frame flips. Reuse Stop 5's word "crashes" in the L2 and L3
cards ("That case crashes."), never in L1 and L5, where a break is a real kid.

**Recommended UI change.** Over every L2 and L3 board and quiz, replace the plain premise line with a test-world style
banner: "Always true here: nobody breaks this rule. The box that would break it can’t happen." Show a mini four-box picture
with the break box crossed out, in the style of the speakers scene's "What is true" fact banner. Rename the mark "Can this
case happen here?". In L4 show "Here we only compare sentences. Any case can be tested." In L5 show "Here a kid may have
broken the rule. Find out." Before reusing ConfusedPanel in Stop 6, give it a closing line for each board; its "You have
it" text is written for Treasure signs ("read each sign, then check its words against the test", `Distinction.tsx`:139).

**Diagnostic question.** Q1: "In this story the rule is always true. Can there be a dog without four legs here?" Options:
"Yes" / "No" (right) / "Not sure". Teach: "A dog without four legs would break the rule. Here nobody breaks it, so that case
can’t happen. Cross it out." Q2: "In Lesson 1, Ben got dessert and left some veggies. Was Ben a real case there?" Options:
"Yes" (right) / "No". Teach: "The lunchroom rule could be broken, and Ben broke it. Lessons 2 and 3 use rules that are
always kept. Look for the line that says so."

**Targeted remediation.** "You may be treating ‘this case breaks the rule’ and ‘this case can happen’ as the same thing. In
Lesson 1, kids could break the rule, so Ben was real. Here the card says the rule is always true. So the one case that would
break it can’t happen. A dog without four legs is crossed out. Only a dog with four legs is left, so Max has four legs for
sure."

**How to test mastery.** First, mark all four boxes of a new always-true rule as can happen or can't happen with no wrong
mark. Then, in mixed order and in the same skin, answer each right on the first try: an L1 did-break item (no premise line,
the break is real) and an L3 move-not-then item (premise line, the break is crossed out). The stop check should keep at
least one such pair.

**Evidence.** `src/content/stop6.ts`:163 (`L2_RULE` scene), 330, 387-396 (393), 406-413, 192-201, 444, 553, 617-637;
`src/engine/puzzles/conditionals.ts`:233, 264, 326, 386, 571-577, 715-718, 980, 1110, 1597-1605 (`PET_BOXES`), 1667-1675,
1692; `src/game/components/Distinction.tsx`:139; `curriculum.json` s5.l1 card "Check a case" ("It crashes when…").

**Reviewer note.** The switch is sharper than first reported: it happens inside L2 itself. s6.l2-do-boxes uses
`ruleScene('pets')` with no always-true line (`PET_BOXES`, `conditionals.ts`:1597-1605) and has the learner mark Dog and Not
four legs as a case that breaks the rule. Two boards later, s6.l2-do-fwd adds "In this story, the rule is always true" and
asks whether that same case can happen. Card "One way only" also calls the pet rule "a true rule", but its scene is `L2_RULE`
(`ruleScene('pets')`, `stop6.ts`:163) with no "in this story" line, and three-legged dogs are real. Put the always-true line
on that card. Insert the twin board in the drill array between s6.l2-do-boxes and s6.l2-do-back. Use Stop 5's "crashes" only
in L2 and L3. Never use it in L1 and L5, where a break is a real kid, so L5's `KEPT_BROKEN` label stays "Broken" even though
its id is "crashes". On letters cards the premise is the fourth line (after the vowel and odd note), not the third. (All
applied above.)

### s6-pq-letters-untaught (P1)

**Location.** The s6.l1 quiz when the "pq" skin is drawn (for example seed 1, Try 1: "Which case breaks the rule?"). Also
the s6.l2 to l4 practice, the l1 to l4 check slots, the l1 to l4 Arcade and the new examples (`fresh()`): s6.l2 "Q is true.
Is this sentence true for sure, false for sure, or can’t you tell? “P is true.”", s6.l3 "P is true. What follows for
sure?", and s6.l4 choices "If not P, then not Q." / "If not Q, then not P." / "If Q, then P." s6.l5 never uses "pq".

**What the learner sees.** Rule card: "P and Q stand for any two sentences. / If P, then Q." (plus "The rule is always
true." in L2 and L3). Choices: "P is true and Q is false", "P is false and Q is true", "P is false and Q is false", "P is
true and Q is true". Explanation terms: "The IF part means the words right after “if”: “P.”"

**What the program assumes the learner has been taught.** That a capital letter can stand for a whole sentence. That "P is
true" means the IF part happened (the cards only ever say the IF part "happens"). That "not P" is true exactly when P is
false. That a quoted sentence about a sentence ("P is true.") can itself be true for sure, false for sure, or can't tell.

**Likely mix-up.** The learner takes P as a thing or a code, not a stand-in for a sentence, so "P is true" does not connect
to "the IF part happened". In L2, "Is ‘P is true’ true for sure?" stacks one truth inside another, and the learner loses
which truth is being asked. In L4 the learner does not know when the IF part "not P" happens.

**Hidden distinction.** A letter that stands for a sentence (P) vs that sentence's truth in a case (P is true, P is false).
Also "the IF part happened" vs "the IF part is true".

**Hidden steps.** 1) Substitute: P is the IF sentence, Q is the THEN sentence. 2) Translate "P is true" into "the IF part
happened" and "Q is false" into "the THEN part did not happen". 3) (L4) Evaluate "not P" as true when P is false. 4) Then
apply the lesson's method.

**Missing prerequisite.** No card or board in Stop 6, or in Stops 1 to 5, uses or explains P and Q. The only introduction is
the scene line "P and Q stand for any two sentences." (`conditionals.ts`:532). `practiceSkins` puts one abstract skin in
every set (`stop6.ts`:109-118), and `L1_SKINS` includes "pq" (`conditionals.ts`:558), so P and Q can be among the first quiz
items of Lesson 1. NOT of a statement was taught in s1.l3 ("The NOT of a statement is true whenever the statement is
false"), but never with a letter.

**Recommended teaching intervention.** Cheapest interim fix: drop "pq" from the L1 to L4 draws (`L1_SKINS` and `SKIN_IDS`;
"letters" still covers the abstract group) until the card and board exist. Then add a key-idea card to s6.l1 after "Two
parts", titled "Letters for the parts", with a contrast scene. Left panel: the lunchroom rule and "Ben got dessert and left
some veggies" (the IF part happened, the THEN part did not, so broken). Right panel: "If P, then Q" and "P is true and Q is
false" (the same truths, so broken). Ask: "Did the case change? No. Only the words changed: P is the IF part, and ‘P is
true’ means it happened." Then a twin board, `fourBoxDrill` with P and Q `BoxWords` (rows "P is true / P is false", columns
"Q is true / Q is false", twin text "The same four boxes, with letters for the parts."). In L4, add a P and Q twin of the
meaning board before any P and Q quiz.

**Recommended UI change.** On a P and Q item, add a key line to the rule card: "P is the IF part. Q is the THEN part. ‘P is
true’ means the IF part happened." Style it like the speakers scene's "What is true" fact banner. On P and Q case cards,
label the truths "The IF part (P): true".

**Diagnostic question.** Q1: "In ‘If P, then Q,’ which is the IF part?" Options: "P" (right) / "Q" / "Not sure". Teach: "P
comes right after ‘if,’ so P is the IF part." Q2: "P is true. Did the IF part happen?" Options: "Yes" (right) / "No" / "Not
sure". Teach: "P stands for a whole sentence. ‘P is true’ means that sentence is true here, so the IF part happened."

**Targeted remediation.** "P and Q are not things. Each letter stands for a whole sentence, like ‘you get dessert.’ ‘P is
true’ means the IF part happened. ‘Q is false’ means the THEN part did not. In words, the same case is: Ben got dessert (P
is true) and left some veggies (Q is false). That breaks the rule."

**How to test mastery.** After the card and the P and Q board, a P and Q who-broke item and a P and Q did-break item, each
right on the first try with no hint. In L2 to L4, at least one P and Q item per pass (`pass.include` with a "pq" tag set on
items from that skin). No P and Q item appears before the P and Q board is done.

**Evidence.** `src/engine/puzzles/conditionals.ts`:528-553 (532, 535, 550-551), 556-558, 692-698; `src/content/stop6.ts`:
109-118, 352-363, 421, 476, 530, 622-626, 640-643; `curriculum.json` s6.who-broke example "Which case breaks the rule? ||
explain: P is true and Q is false…"; no P or Q in `src/content/stop1.ts` to `stop5.ts` or `stop7`.

**Reviewer note.** The location first overstated the reach (corrected above). s6.l5 quizzes, the stop's checker slots and
the L5 Arcade never use "pq", because it has no cards and is not in `CARD_SKINS`. The reach is the L1 to L4 practice, the L1
to L4 check slots, the L1 to L4 Arcade and `fresh()`. The cheapest interim fix is the one the auditor gives: drop "pq" from
the `L1_SKINS` and `SKIN_IDS` draws ("letters" still covers the abstract group) until the card and board exist.

### s6-l2-true-in-a-case-vs-for-sure (P2)

**Location.** s6.l2 Do boards "Mark a case: going backward" (s6.l2-do-back) and "Mark a case: going forward" (s6.l2-do-fwd),
and the L2 quiz ("True for sure / Can’t tell / False for sure"). The same step is in the s6.l3 boards (s6.l3-do-happened,
s6.l3-do-not) and the L3 quiz.

**What the learner sees.** Board body: "Max is a dog. That is the IF part. Two cases fit it." and "One case is marked. Mark
the other case the same way." On "Max is a dog and does not have four legs." the learner sets "Can this case happen?" No,
"“Max has four legs.”" False, and "“Max does not have four legs.”" True. Then: "Right. Only one case can happen. “Max has
four legs” is true in it, so it is true for sure." In L3 the learner sets "“Pip is a dog.”" True on "Pip is a dog and does
not have four legs.", then reads "“Pip is not a dog” follows for sure." The quiz asks "Is this sentence true for sure,
false for sure, or can’t you tell?" with no board.

**What the program assumes the learner has been taught.** That "true for sure" means true in every case that fits the fact
and can happen. That a case marked "can't happen" no longer counts. That "Can’t tell" and "Nothing follows for sure" mean
true in one case that can happen and false in another.

**Likely mix-up.** The learner has just tapped "“Max has four legs.” False" and is then told it is true for sure. A learner
who takes "true in this case" as "true" is left with two answers that clash. In the backward quiz, the case "Rex is a dog
and has four legs" can happen and "Rex is a dog" is true in it, so "True for sure" seems right. That is exactly the
backward trap the lesson is about.

**Hidden distinction.** True in one case vs true for sure (true in every case that can happen). Also a case that can't
happen (crossed out) vs a case that counts.

**Hidden steps.** 1) List the two cases that fit the fact. 2) Mark can happen or can't happen. 3) Cross out the
can't-happen case and ignore what is true in it. 4) Read the sentence across the cases left: all true means True for sure;
all false means False for sure; mixed means Can’t tell. (In L3: the one sentence true in every case left follows;
otherwise Nothing follows for sure.)

**Missing prerequisite.** The read-across rule is stated only in the boards' done lines (`factConclusion`,
`conditionals.ts`:1702-1719), after every mark is right, and in Teach after a miss. No card states the general rule. L2 card
3 gives it only for the backward case, as a question: "could it happen another way? If it could, then you can’t tell if the
IF part happened." The board deliberately has "No final answer on the board" (`conditionals.ts`:1724), so the learner never
taps the read-across. The idea was taught for other boards earlier, but Stop 6 never links back: s3.l2 "A sentence must be
true if it is true in every order that fits the clues." and s5.l1 "Two cases hold, and they give different answers. So you
can’t tell." The quiz items carry no `workFirst` or scratch board. The backward hint (`hintCase rowAt(true,true)`,
`conditionals.ts`:988) shows exactly the trap's evidence ("The sentence: true", "can happen").

**Recommended teaching intervention.** Declare `{id: 'in-a-case-vs-for-sure', a: 'True in one case', b: 'True for sure: true
in every case that can happen'}`. Add a card before the first fact board, "For sure means every case left", with a contrast
scene. Left panel, the fact "Rex has four legs": two cases can happen, and "Rex is a dog" is true in one and false in the
other, so Can’t tell. Right panel, the fact "Max is a dog": one case is crossed out, and "Max has four legs" is true in the
one left, so True for sure. Ask: "Did the question change? No. What changed? How many cases were left." Bridge to s3.l2's
"Must, might, can’t". On the boards, add a last mark for each pet that the learner sets: "So the sentence is: True for sure /
Can’t tell / False for sure", computed by `statusOf()`. Reading across then becomes a tap, the way the count and Keep or
Reject are taps on the case board. Have the backward hint say "One case is not enough: check the other case before you
answer", or mark both cases.

**Recommended UI change.** When a row's "Can this case happen?" is set to No, strike that row's sentence marks and tag them
"Can’t happen: does not count". DrillBoard has no such row state yet, so this is a small new board feature (the
highest-value fix here; it also serves s6-l2-breakable-vs-always-kept). Under the rows, show the read-across as a strip:
each case left, and the sentence's value in it. Give the first L2 and the first L3 quiz item a `workFirst` board of its own
two cases, as s1.l4 does with the case board. Later items offer the optional "Use the case board" (`ItemBase.scratch`),
which ItemView already supports.

**Diagnostic question.** Q1: "Two cases can happen. ‘Rex is a dog’ is true in one and false in the other. Is it true for
sure?" Options: "Yes" / "No, you can’t tell" (right) / "Not sure". Teach: "True for sure means true in every case that can
happen. One case says no, so you can’t tell." Q2: "This case can’t happen. Does what is true in it count?" Options: "Yes" /
"No" (right). Teach: "Cross out a case that can’t happen. Look only at the cases left."

**Targeted remediation.** "You may be treating ‘true in this case’ and ‘true for sure’ as the same thing. A sentence is true
for sure only when it is true in every case that can happen. Rex could be a dog with four legs, or a cat with four legs.
‘Rex is a dog’ is true in one and false in the other. So you can’t tell."

**How to test mastery.** With the new read-across mark, a fact board in a new skin right on the first check, including one
can't-tell block and one for-sure block. Then a backward item and a forward item in different skins, both right on the first
try. To make the pass rule require it: have `finish()` copy `m.tag` into `item.tags`, then set `pass.include` with the
backward tag in L2 and a trap tag (trap-then or trap-not-if) in L3, because today extra items carry no wanted tag (see
s6-rev-1).

**Evidence.** `src/content/stop6.ts`:80 (`finish()`, no tags), 180-201, 208-238, 387-396, 406-413, 463-470;
`src/engine/puzzles/conditionals.ts`:979, 988 (backward hint case), 989-1003, 1685-1699, 1702-1719, 1724-1739;
`src/engine/drill.ts`:217-229 (`extraQuizItem`); `src/game/components/ItemView.tsx`:632-678; `curriculum.json` s3.l2 "Must,
might, can’t", s5.l1 "When you can’t tell".

**Reviewer note.** The first draft's mastery claim was off (corrected above). With the four planned L3 items (one per move),
3 first-try answers require at least one trap. But `extraQuizItem` (`drill.ts`:217-229) draws extras with no wanted tag, so a
learner who misses both traps can pass on extra forward-move items. The same holds for L2 backward items. Stop 6 items carry
no tags at all (`finish()`, `stop6.ts`:80), so `pass.include` first needs `finish()` to copy `m.tag` into `item.tags`. The
backward hint (`hintCase rowAt(true,true)`, `conditionals.ts`:988) shows exactly the trap's evidence; have it say "One case
is not enough: check the other case before you answer", or mark both cases. Striking the sentence marks in a can't-happen
row is the highest-value fix here and should come first. It also serves s6-l2-breakable-vs-always-kept.

### s6-l4-rule-if-vs-sentence-if (P2)

**Location.** First use: s6.l2 card "One way only" ("But the cat breaks the turned-around sentence."). Then s6.l4 cards "Why
they match", "Flip alone does not work", "NOT alone does not work" and "How to test", the Do boards "Test the flip and NOT
sentence" (s6.l4-do-same) and "Test flip only and NOT only" (s6.l4-do-traps), and the L4 quiz.

**What the learner sees.** Card: "A dog without four legs breaks the rule. It breaks the flip and NOT sentence too. No other
case breaks either one." Card: "A cat with four legs breaks it." Card "How to test": "Try all four cases. IF and THEN both
happen. IF happens but THEN does not. THEN happens but IF does not. Neither one happens. If a case breaks one sentence but
not the other, they do not mean the same." The See grid on "Why they match" already shows every check mark and cross for the
rule and all three rewrites. The board has rows "A dog with four legs … A bird with two legs" and columns "The rule | Flip
and NOT", with the rule's column given.

**What the program assumes the learner has been taught.** That "a case breaks a sentence" uses that sentence's own IF part
and THEN part, not the rule's. That after a flip, the IF part is the old THEN part. That a NOT part ("it does not have four
legs") is true, so it "happens", when the thing does not happen (a bird with two legs). And how to compare two columns.

**Likely mix-up.** In Lessons 1 to 3, "the IF part" always meant the rule's IF part: every case card says "The IF part: true
or false" about the rule. In Lesson 4 the learner keeps testing "is it a dog?" for every sentence. Every column then copies
the rule's column, and flip only seems to mean the same as the rule: the converse error Lesson 2 fought. Or the learner
can't tell when "it does not have four legs" counts as the IF part happening. Because the See grid and cards 2 to 4 already
gave every mark, the board can be filled in from memory without doing either step.

**Hidden distinction.** The rule's IF part ("it is a dog") vs this sentence's own IF part ("it does not have four legs").
Also a NOT part being true (the thing did not happen) vs the thing happening.

**Hidden steps.** For each sentence: 1) Find its IF part and THEN part. 2) For each case, decide if its IF part is true in
the case (a NOT part is true when the thing does not happen). 3) If not, kept. 4) If yes, check its THEN part: kept or
broken. 5) Compare its column with the rule's column: a case that breaks one and not the other means not the same; the same
broken cases means the same.

**Missing prerequisite.** No card models the step. "Why they match" gives results ("It breaks the flip and NOT sentence
too"), and the grid gives every mark with no reasons. "How to test" names the four cases in the rule's IF and THEN words.
The definition "A case breaks a sentence means in that case, the sentence’s IF part happens, but its THEN part does not."
appears only in Teach after a miss (`conditionals.ts`:685, 1224). The box-by-box reasoning ("the IF part, “it does not have
four legs,” is true. The THEN part, “it is not a dog,” is false.") appears only as the why of a wrong box
(`conditionals.ts`:1747-1756). Cards 2 to 4 state in words every mark both boards ask for, and no Stop 6 board has
`afterCard`, so both boards come after all cards and test recall, not the step.

**Recommended teaching intervention.** Declare an L4 distinction `{id: 'rule-if-vs-sentence-if', a: 'The rule’s IF part: “it
is a dog”', b: 'This sentence’s own IF part: “it does not have four legs”'}`. Add a contrast card in the Treasure signs
pattern (same world, different statement). Both panels use the test world "a cat with four legs". Left: who "The rule", says
"If it is a dog, then it has four legs.", truth kept (True), because "Its IF part, ‘it is a dog,’ is false here. It asks
nothing." Right: who "Flip only", says "If it has four legs, then it is a dog.", truth broken (False), because "Its IF part,
‘it has four legs,’ is true. Its THEN part, ‘it is a dog,’ is false." Ask: "Did the animal change? No. What changed? The
sentence, and so its IF part." `ContrastView` fits as it is. Then a board with `distinction: 'rule-if-vs-sentence-if'`
placed by `afterCard`. Turn "Why they match" into a worked reveal, one box at a time with because rows, marking only the
flip-and-NOT column. Put the Do boards on a twin skin (dessert), so they can't be copied from the See grid or the cards; this
is the key fix.

**Recommended UI change.** Above each column, split the sentence into two labelled chips, "IF: it does not have four legs"
and "THEN: it is not a dog", so the parts under test stay on screen; today the sentence sits only in the body text above the
grid. Show `compare` facts under a grid box ("IF says: does not have four legs. Case: a bird with two legs."). No Stop 6
DrillMark sets `compare` today, so `meaningDrill` must add it, and the DrillBoard grid layout must draw it (only CaseBoard
does). Add a grid misconception kind to `diagnose()`, which today returns undefined unless the layout is `cases`:
`copied-column`, a rewrite's column marked exactly like the rule's column. Text: "You may be testing the rule, not this
sentence. Find this sentence’s own IF part first."

**Diagnostic question.** Q1: "In ‘If it does not have four legs, then it is not a dog,’ what is the IF part?" Options: "it
is a dog" / "it does not have four legs" (right) / "Not sure". Teach: "The IF part is the words right after ‘if’ in this
sentence, not in the rule." Q2: "A bird with two legs. Is ‘it does not have four legs’ true for it?" Options: "Yes" (right)
/ "No". Teach: "The bird does not have four legs, so this NOT part is true. This sentence’s IF part happened."

**Targeted remediation.** "You may be treating the rule’s IF part and this sentence’s IF part as the same thing. After a
flip, the IF part is the old THEN part. In ‘If it has four legs, then it is a dog,’ the IF part is ‘it has four legs.’ A cat
has four legs, so the IF part happens. But a cat is not a dog. So the cat breaks this sentence, and it keeps the rule."

**How to test mastery.** Both meaning boards marked right on the first check, in a skin not used in the See grid. Then a
same-yesno item each for flip only, NOT only, and flip and NOT, all right on the first try, with at least one in letters or
a fantasy skin.

**Evidence.** `src/content/stop6.ts`:370-379, 486-523, 241-268; `src/engine/puzzles/conditionals.ts`:606-622, 685, 1146-1156,
1220-1231, 1747-1813; `src/game/components/DrillBoard.tsx`:152-234 (no compare on grid boards);
`src/game/components/CaseBoard.tsx`:237-246; `src/engine/drill.ts`:82-83.

**Reviewer note.** The copy-from-memory point is stronger than first stated. Besides the grid, cards 2 to 4 state in words
every mark both boards ask for ("No other case breaks either one"; "A cat with four legs breaks it" twice). No Stop 6 board
has `afterCard`, so both boards come after all cards. The Do boards therefore test recall, not the step. A twin skin for the
Do boards is the key fix, not optional. No Stop 6 DrillMark sets `compare`, so `meaningDrill` must add it as well as
DrillBoard's grid layout drawing it. `CompareRows`' fixed "Says / Test / Do the words fit the test?" wording fits the IF-part
check. The `ContrastView` design fits the current panel shape.

### s6-l3-your-answer-true-in-impossible-case (P2)

**Location.** The s6.l3 quiz explanation after a wrong sentence pick on "The IF part happened" and "The THEN part did not
happen" items, also shown on the stop check result. Similar truth lines appear on the s6.l2 and l3 hint cards.

**What the learner sees.** Under "Why your answer does not work", a marked case card: "P is true and Q is false." with "The
IF part: true ✓", "The THEN part: false ✗", "The rule: false ✗", "Your answer: true ✓", and the note "This case breaks the
rule, so it can’t happen here." The rule card above still says "The rule is always true." In the dragons skin the case is
"Ash landed in town and did not pay a gold coin." with the same marks.

**What the program assumes the learner has been taught.** That the learner reads "Your answer: true" as "your sentence is
true in this one case", not "your answer is right". That "The rule: false" means "this case breaks the rule", not "the rule
is false". And that, from the note, the only case where the answer is true can't happen.

**Likely mix-up.** The learner sees a green check mark by "Your answer" inside the explanation of a wrong answer, and "The
rule: false" under a card that says the rule is always true. They read the case card's truth as a verdict on their answer
("it says I was true"), or decide the rule is false after all.

**Hidden distinction.** A sentence true in one case vs an answer that is right (follows for sure). Also "the rule is broken
in this case" vs "the rule is false".

**Hidden steps.** 1) Read the case. 2) Notice it breaks the rule. 3) The rule is always true here, so the case can't happen.
4) So the answer is true only in a case that can't happen. 5) So it does not follow.

**Missing prerequisite.** `CaseCard` draws each truth as "who: true or false" with a check or cross icon and no reason rows
(`ExplanationPanel.tsx`:50-61). `moveItem` adds the answer's truth to the counterexample (`conditionals.ts`:1065-1069, 1085).
No card shows how to read "The rule: false" in an always-true story. The because rows (`Distinction.tsx`) are not used
anywhere in Stop 6.

**Recommended teaching intervention.** The direct one-line fix: in `kase()`, leave out the "Your answer" truth (or draw it
without the green check mark) when the case breaks the rule in an always-true story. Then teach the reading once, on an L2
card titled "How to read a case card". Later, put reason rows on Stop 6 case cards. For "The rule": says "It breaks only when
the IF part happens and the THEN part does not." / test "P is true and Q is false." / so "Broken here. Here the rule is never
broken, so this case can’t happen." For "Your answer": "Your answer is true only here, and this case can’t happen." This is
not a drop-in: `TeachCase` has no `because` field and `BecauseRows` hard-codes the sign verdict, so it needs a
`TeachCase.because` field and a verdict label option.

**Recommended UI change.** In an always-true story, draw a can't-happen case card crossed out with the tag "Can’t happen
here". Label its truths "Kept in this case" / "Broken in this case" instead of "The rule: true or false". Never put a green
check mark on "Your answer" in a crossed-out case; write "Your answer: true only in this case, which can’t happen." (This
merges with s6-vocab-kept-true-happened.)

**Diagnostic question.** Q1: "This case breaks the rule. The rule is always true here. Can this case happen?" Options:
"Yes" / "No" (right). Teach: "It can’t happen, so nothing true in it counts." Q2: "Your answer is true only in a case that
can’t happen. Does your answer follow for sure?" Options: "Yes" / "No" (right). Teach: "To follow for sure, it must be true
in the cases that can happen."

**Targeted remediation.** "The check mark by your answer only means it is true in this one case. This case breaks the rule,
and here the rule is never broken. So this case can’t happen, and your answer does not follow."

**How to test mastery.** After the explanation, the new-example pair (the move and its trap partner, from `StopDef.fresh`)
right with no hint. On the trap partner, the learner picks the conclusion that holds in the case left, not the one true only
in the crossed-out case.

**Evidence.** `src/engine/puzzles/conditionals.ts`:651-666, 1065-1069, 1075-1086, 1116; `src/game/components/ExplanationPanel.tsx`:
23-65, 158-170; `src/engine/types.ts`:173-182 (`TeachCase`); `src/game/components/Distinction.tsx`:31-36 (`BecauseRows`
verdict); a dump of s6-l3-1 (seed 1) feedback example truths: The rule false, Your answer true.

**Reviewer note.** "Put the existing because rows on Stop 6 case cards" is not a drop-in. `TeachCase` has no `because` field
(`types.ts`:173-182), and `BecauseRows` hard-codes the Treasure signs verdict "The words fit the test: True or False"
(`Distinction.tsx`:31-36). It needs a `TeachCase.because` field and a verdict label option. The direct one-line fix: in
`kase()`, omit the answer truth (or draw it without the green check mark) when the case breaks the rule in an always-true
story (applied above). Merge with s6-vocab-kept-true-happened, which concerns the same widget.

### s6-quiz-no-scaffold (P2)

**Location.** The first quiz item of s6.l2, s6.l3, s6.l4 and s6.l5, and every item after it.

**What the learner sees.** After boards with one case shown, a bare question, for example "Lucky does not have four legs.
What follows for sure?", with three choices, Hint and Check. No board, no list of cases, no steps.

**What the program assumes the learner has been taught.** That after one board the learner can list the cases, cross out the
break, mark the sentence and read across in their head (L2 and L3); split a new sentence into its own IF and THEN parts and
test four cases (L4); and test two backs for each of four cards (L5).

**Likely mix-up.** Not a merged pair but a load gap. The learner skips a step, for example never lists the second case that
fits the fact, and lands on the trap answer. A merged idea (true in a case vs for sure; the rule's IF vs the sentence's IF)
can then hide behind a lucky right answer.

**Hidden distinction.** Doing the method with the cases on screen vs from memory (progressive disclosure).

**Hidden steps.** The whole chain of each lesson (see the steps section): L2 and L3: list, cross out, mark, read across. L4:
find the parts, test four cases, compare. L5: list the backs, could it break?, turn or skip.

**Missing prerequisite.** No Stop 6 item sets `workFirst` or `scratch`, though ItemView supports both (`ItemView.tsx`:
632-678). No Stop 6 board sets `scaffold`. MethodSteps and `compare` render only on case boards (`CaseBoard.tsx`:237-246,
312), and Stop 6 boards are grid and row-card boards.

**Recommended teaching intervention.** Follow the s1.l4 pattern. The first quiz of each lesson carries its own board
(`workFirst`) in a new skin; later items offer "Use the case board" (`scratch`). Add a MethodSteps strip to Stop 6 boards:
"1 Which part? 2 List the cases. 3 Cross out the break. 4 Read across." (L2 and L3); "1 Its own IF part 2 Each case 3
Compare columns" (L4); "1 Each back 2 Could it break? 3 Turn or skip" (L5).

**Recommended UI change.** Draw MethodSteps and `compare` on grid and row-card boards when the scaffold is full (today only
CaseBoard does; this is new rendering work). After a miss, bring the item's board back for the retry instead of only the
explanation (which needs the `workFirst` board to exist first).

**Diagnostic question.** "Before you answer: how many cases fit the fact?" Options: "One" / "Two" (right) / "Not sure".
Teach: "A fact fixes one part. The other part can happen or not, so two cases fit. Check each one."

**Targeted remediation.** "Let’s put the cases on the board. List the two cases that fit the fact, cross out the one that
breaks the rule, then read what is left."

**How to test mastery.** The scaffold fades: full on the first quiz item, light on the second, none on the third, and the
third answered right on the first try with no hint.

**Evidence.** `src/game/components/ItemView.tsx`:632-678; `src/game/components/CaseBoard.tsx`:237-246, 312;
`src/content/stop6.ts`:141-298 (no scaffold, `workFirst` or scratch set); `docs/CONTENT_GUIDE.md` "Fade the scaffold".

**Reviewer note.** MethodSteps and the compare rows render only inside CaseBoard (`CaseBoard.tsx`:237-246, 312). Showing them
on grid and row boards is new rendering work, as the auditor says. "Bring the item's board back for the retry" needs the
`workFirst` board to exist first.

### s6-rev-1 (P2)

**Location.** The pass rules of s6.l1, s6.l2 and s6.l3, and `extraQuizItem`.

**What the learner sees.** The default pass: 3 right on the first try. Extra items keep coming until that is met.

**What the program assumes the learner has been taught.** That passing a lesson shows the learner got its trap right.

**Likely mix-up.** s6.l1 to l3 use the default pass with no `include`, and no Stop 6 item carries tags (`finish()`,
`stop6.ts`:80). `extraQuizItem` (`drill.ts`:217-229) then draws extras with no wanted tag. A learner who misses both
backward items in s6.l2 can pass on extra forward items without ever answering "Can’t tell" right. The same holds in s6.l3
with no right trap move, and in s6.l1 with no right IF-missing or THEN-missing ("neither") case.

**Hidden distinction.** Passing the lesson vs getting the lesson's trap right.

**Hidden steps.** Mastery design: the pass rule must include at least one right first-try answer on the trap.

**Missing prerequisite.** Stops 1 and 3 already require a right "Can’t tell" (`stop1.ts`:1053, `stop3.ts`:415, 541). Stop 6
does not.

**Recommended teaching intervention.** Have `finish()` copy `m.tag` into `item.tags` (plus a finer tag such as "no-if" for
did-break items on the no-dessert rows). Then set `pass.include`: L1, a right no-IF case; L2, `{tag: 'backward', label: 'a
right “Can’t tell”'}`; L3, a right trap-then or trap-not-if.

**Recommended UI change.** None. The pass note already lists missing groups.

**Diagnostic question.** Not a learner question; the extra item served by the missing tag is the check.

**Targeted remediation.** On the extra item: "This one checks the trap. Look for the case that could happen another way."

**How to test mastery.** The lesson cannot finish without at least one first-try trap answer.

**Evidence.** `src/content/stop6.ts`:80 (`finish()`); `src/engine/drill.ts`:164, 217-229; `src/content/stop1.ts`:1053;
`src/content/stop3.ts`:415, 541.

**Reviewer note.** This was a reviewer's extra finding.

### s6-l1-tick-means-kept-not-yes (P3)

**Location.** s6.l1 card "Four kinds of kids" and boards "Mark the four boxes" and "A new rule, the same four boxes". The same
grid widget is reused in the s6.l2 board "Mark the four boxes" and the s6.l4 meaning boards.

**What the learner sees.** The Stop 4 grid widget, with its help line "Tap a box once for ✗ no, twice for ✓ yes, and a third
time to clear it." Rows "Dessert / No dessert", columns "Ate all veggies / Left some veggies". The right "No dessert" row has
two check marks.

**What the program assumes the learner has been taught.** That a check mark here means "a kid in this box keeps the rule",
that each box is one kind of kid (both facts at once), and that a row can hold two check marks.

**Likely mix-up.** Stop 4 taught "A check mark (✓) in a box means yes. The ✓ in the box for Mia and the cat means Mia has the
cat." and "each row gets just one ✓." The learner reads "Dessert × Ate all veggies" with a check as "dessert kids ate their
veggies: yes", keeps one check per row, and marks one of the two "No dessert" boxes with a cross.

**Hidden distinction.** A check mark meaning "yes, this pair is true" (the Stop 4 logic grid) vs a check mark meaning "this
kind of kid keeps the rule" (the Stop 6 four boxes). Also a box as a pairing vs a box as a case.

**Hidden steps.** Read each box as one kind of kid (row fact AND column fact), judge that kid against the rule, then mark
check or cross.

**Missing prerequisite.** The board caption says "✓ keeps the rule. ✗ breaks it.", but the shared help line under it still
says "✗ no … ✓ yes" (`DrillBoard.tsx`:204-207). No card names the change from the Grid Detective grids.

**Recommended teaching intervention.** Add one sentence to "Four kinds of kids": "This is not a Grid Detective grid. Each box
is one kind of kid. A check mark means that kid keeps the rule. A row can have two check marks."

**Recommended UI change.** Let a grid board set its own help line (a new optional `DrillStep` text), so the Stop 6 boxes
read "Tap a box once for a cross (breaks), twice for a check mark (keeps)." Optionally write the kind of kid faintly inside
each empty box ("dessert + left veggies").

**Diagnostic question.** "The check mark in ‘No dessert’ and ‘Ate all veggies’ means:" Options: "Kids with no dessert ate
their veggies" / "A kid like that keeps the rule" (right) / "Not sure". Teach: "Each box is one kind of kid. A check mark
means that kid keeps the rule."

**Targeted remediation.** "Here a check mark does not mean ‘yes, this pair.’ It means a kid in this box keeps the rule. Both
no-dessert boxes keep it, so that row has two check marks."

**How to test mastery.** The hat twin right on the first check, including both check marks in the "Blue card" row.

**Evidence.** `src/game/components/DrillBoard.tsx`:204-207; `src/engine/puzzles/conditionals.ts`:580-603, 1622-1647;
`src/content/stop6.ts`:316-325, 142-157; `src/content/stop4.ts`:475, 493 (`curriculum.json` s4.l1 "✓ means yes, ✗ means
no", "One each").

**Reviewer note.** Keep only the per-board help-line field (a new optional `DrillStep` text). The contrast card with a Stop 4
grid is more than this needs.

### s6-l4-not-word-vs-not-meaning (P3)

**Location.** The s6.l4 quiz in the letters skin (and lunchbox, where NOT is "no cookie"); also the s6.l3 letters fact "This
card has an odd number." and the s6.l5 letter cards.

**What the learner sees.** Letters rule: "If a card has a vowel, then it has an even number." Choices: "If a card has an odd
number, then it does not have a vowel." / "If a card does not have a vowel, then it has an odd number." / "If a card has an
even number, then it has a vowel." Feedback: "It flips the rule and puts NOT in both parts." Lesson card: "Now flip it and
put NOT in both parts." The Teach term: "to add “not” to the IF part and to the THEN part".

**What the program assumes the learner has been taught.** That NOT is a meaning, not a word: "has an odd number" is the NOT of
"has an even number", and "has no cookie" is the NOT of "has a cookie".

**Likely mix-up.** Looking for the word "not" in both parts, the learner finds one "not" in flip and NOT, one in NOT only,
and none in flip only. So "put NOT in both parts" seems to fit no choice, or flip and NOT looks like an odd rewrite with NOT
in one part only.

**Hidden distinction.** The word "not" vs the NOT of a part (odd means not even; no cookie means not a cookie).

**Hidden steps.** For each part of the new sentence, translate it back to a rule part: the same part, or its NOT? (odd is
NOT even). Then decide: flipped? NOT in both parts?

**Missing prerequisite.** The letters note says "An odd number is a number that is not even." (`conditionals.ts`:493), but
no L4 card shows a NOT written without the word "not". Every L4 card uses the pets skin, whose NOT parts all contain "not".
The letters skin's NOT-THEN part is "a card has an odd number" (`conditionals.ts`:499). Stop 6's own `NOT_BOTH_TERM` defines
the move as "to add “not” to the IF part and to the THEN part" (`conditionals.ts`:684), which is literally false for the
letters skin.

**Recommended teaching intervention.** Reword `NOT_BOTH_TERM` to "to change each part to its NOT (for cards, “odd” is the NOT
of “even”)", and add the gloss in `rewriteKind` and `matches` text for letters. Optionally add a short L4 card, "NOT without
the word ‘not’", with a contrast: the same letters rule, and the flip and NOT sentence written two ways ("If a card does not
have an even number, then it does not have a vowel." and "If a card has an odd number, then it does not have a vowel.");
ask: "Did the meaning change? No. ‘Odd’ means ‘not even.’"

**Recommended UI change.** Under a letters sentence that uses "odd", show a gloss chip "odd means NOT even". In the rewrite
feedback for letters, name it: "It adds NOT to each part (‘odd’ is NOT ‘even’)."

**Diagnostic question.** "‘This card has an odd number.’ Is that the NOT of ‘it has an even number’?" Options: "Yes" (right)
/ "No, it has no ‘not’" / "Not sure". Teach: "An odd number is a number that is not even. So ‘odd’ is the NOT of ‘even,’
even without the word."

**Targeted remediation.** "Look at the meaning, not only the word. ‘Has an odd number’ means ‘does not have an even number.’
So this sentence does put NOT in both parts."

**How to test mastery.** A letters same-pick item and a letters move-not-then item, each right on the first try.

**Evidence.** `src/engine/puzzles/conditionals.ts`:488-527 (493, 499), 564-567, 684 (`NOT_BOTH_TERM`), 1146-1156,
1179-1183; `src/content/stop6.ts`:486-516; `curriculum.json` s6.same-yesno example "If a card has an even number, then it has
a vowel."

**Reviewer note.** Add the root cause: Stop 6's own `NOT_BOTH_TERM` defines the move as "to add “not” to the IF part and to
the THEN part" (`conditionals.ts`:684). That is literally false for the letters skin. Reword it to "to change each part to
its NOT (for cards, “odd” is the NOT of “even”)", and add the gloss in `rewriteKind` and `matches` text for letters (applied
above). A letters twin board is not needed.

### s6-vocab-kept-true-happened (P3)

**Location.** All Stop 6 explanations and hint cards (`CaseCard` truth lines), the s6.l5 board options, the s6.l4 board whys,
and the s6.l2 and l3 board marks.

**What the learner sees.** Cards and boards say "keeps the rule / breaks it", check marks and crosses, "Can this case happen?
Yes or No", and in L5 the options "Kept / Broken". Case cards say "The rule: true", "The IF part: true". The L4 whys say
"the IF part, “it does not have four legs,” is true". Cards say "the IF part happened".

**What the program assumes the learner has been taught.** That kept means true in this case, broken means false in this
case, happened means true, and (in an always-true story) can happen means kept.

**Likely mix-up.** "The rule: false" is read as "the rule is false". "The IF part is true" and "the IF part happened" feel
like two different ideas, so the learner wonders which one a question asks.

**Hidden distinction.** The rule kept in one case vs the rule being true. Also an event happening vs a sentence being true.

**Hidden steps.** Translate between the five ways of saying it before each step.

**Missing prerequisite.** No card says "kept in a case means true in that case". The truth labels come from `partTruths`
(`conditionals.ts`:662-666), the L5 options are `KEPT_BROKEN` (`conditionals.ts`:1548), and the L4 whys use "is true / is
false" (`conditionals.ts`:1747-1756).

**Recommended teaching intervention.** State the bridge once, in L1: "When a case keeps the rule, we also say the rule is
true in that case. ‘The IF part happened’ means the IF words are true for that kid." Use one pair of words per lesson after
that.

**Recommended UI change.** Case cards: "The rule: kept here / broken here" and "The IF part: happened / did not happen", so
they match the cards and boards. `Truth` has only who and value and `CaseCard` hard-codes "true" and "false"
(`ExplanationPanel.tsx`:56), so these labels need an optional word pair on `Truth`.

**Diagnostic question.** "‘The rule: false’ on a case card means:" Options: "The rule is wrong" / "This case breaks the rule"
(right). Teach: "A case card talks about one case only. ‘False’ means this one case breaks the rule."

**Targeted remediation.** "On a case card, ‘The rule: false’ means only that this one case breaks the rule. It does not mean
the rule is wrong."

**How to test mastery.** Read three mixed case cards and say kept or broken for each, with no miss.

**Evidence.** `src/engine/puzzles/conditionals.ts`:651-666, 1547-1553, 1747-1756; `src/game/components/ExplanationPanel.tsx`:
50-61.

**Reviewer note.** Merge into s6-l3-your-answer-true-in-impossible-case. `Truth` has only who and value and `CaseCard`
hard-codes "true" and "false" (`ExplanationPanel.tsx`:56), so "kept here / broken here" labels need an optional word pair on
`Truth`.

### s6-rev-2 (P3)

**Location.** s6.l2: the card "One way only" and the board s6.l2-do-boxes.

**What the learner sees.** Card "One way only" flips the rule and says "the cat breaks the turned-around sentence" (the first
use of "breaks a sentence", which L4 relies on) before the learner has marked a single pet box. All three L2 boards come
after all five cards.

**What the program assumes the learner has been taught.** That the learner has marked the rule's own four boxes before the
rule is turned around. The file says so: the `stop6.ts` header (lines 18-20) and the L2 drill comment (line 415) say L2
"marks its own rule's four boxes by hand before anything is turned around".

**Likely mix-up.** The turned-around sentence is met before the rule's own boxes are solid, so "breaks the rule" and "breaks
the turned-around sentence" blur (feeding s6-l4-rule-if-vs-sentence-if).

**Hidden distinction.** The rule's own cases vs the turned-around sentence's cases.

**Hidden steps.** 1) Mark the rule's four boxes. 2) Only then turn the rule around and test it.

**Missing prerequisite.** No Stop 6 board sets `afterCard`, so `lessonStages` (`LessonRunner.tsx`:38-59) puts all L2 boards
after all L2 cards.

**Recommended teaching intervention.** Open L2 with a short card that shows the pet rule (with the always-true line named,
see s6-l2-breakable-vs-always-kept). Give s6.l2-do-boxes `afterCard: 0`, then place "One way only".

**Recommended UI change.** None.

**Diagnostic question.** "Before turning it around: which pet box breaks the rule ‘If it is a dog, then it has four legs’?"
Options: "A dog without four legs" (right) / "A cat with four legs" / "Not sure".

**Targeted remediation.** "First find the box that breaks the rule itself: a dog without four legs. The cat breaks only the
turned-around sentence."

**How to test mastery.** s6.l2-do-boxes right on the first check before the "One way only" card is shown.

**Evidence.** `src/content/stop6.ts`:18-20, 415; `src/game/components/LessonRunner.tsx`:38-59.

**Reviewer note.** This was a reviewer's extra finding. The same all-boards-last ordering is why L4's Do boards can be
answered from cards 2 to 4 (see s6-l4-rule-if-vs-sentence-if).

### s6-rev-3 (P3)

**Location.** The s6.l2-do-fwd body (`stop6.ts`:197) and the s6.l3-do-not body (`stop6.ts`:231).

**What the learner sees.** "Mark the other case the same way."

**What the program assumes the learner has been taught.** That "the same way" means "with the same questions", not "with the
same marks".

**Likely mix-up.** On both boards, every mark in the learner's row is the opposite of the shown row: "Can this case happen?"
No vs Yes, and each sentence False vs True or the reverse. So "the same way" can be read as "copy the shown marks".

**Hidden distinction.** Ask the same questions vs copy the same marks (method vs result).

**Hidden steps.** For the other case, ask: can it happen, and is each sentence true in it?

**Missing prerequisite.** The two bodies use the ambiguous phrase; s6.l2-do-back and s6.l3-do-happened already spell the
questions out.

**Recommended teaching intervention.** Reword: "Ask the same questions about the other case: can it happen, and is each
sentence true in it?"

**Recommended UI change.** None.

**Diagnostic question.** "‘Mark the other case the same way’ means:" Options: "Copy the shown marks" / "Ask the same
questions about the other case" (right) / "Not sure".

**Targeted remediation.** "The other case can come out the other way. Ask the same questions about it, then mark what you
find."

**How to test mastery.** Both boards right on the first check.

**Evidence.** `src/content/stop6.ts`:197, 231.

**Reviewer note.** This was a reviewer's extra finding.

## Stop 7: Ways to Think

### s7-l3-works-every-time-vs-only-cause (P0)

**Location.** s7.l3 Cause or just together?: card 1 "What a cause does" (the rule), Do 1 "Check each thing" (the clock
row's note and why lines), card 5 "Look for a third thing" (caption), and every quiz explanation or feedback where the row
that breaks a thing is "the effect happened without it": cause-which, cause-cant-tell claim items, cause-together (answer
No) and cause-third (always this kind of row).

**What the learner sees.** Card 1: "A cause helps make something happen... In these puzzles, a cause works every time,
unless the table names something that stops it. When the switch is flipped, the lamp is on. When it is not, the lamp is
off. We say the lamp follows the switch." Do 1, the clock row note (shown once the board is done): "In test 3, the clock
does not show 7:00, but the lamp is on. A cause works every time. So the clock is not the cause." Quiz cause-together
(generated): "On day 1, Gus carried a different backpack, but the class had a surprise quiz. A cause works every time. So
the green backpack is not the cause." Cause-third feedback: "Your answer means scarves make people buy hot cocoa. Then lots
of hot cocoa was sold only when lots of kids wore scarves."

**What the program assumes the learner has been taught.** That "a cause" in these puzzles is the only thing that makes the
effect happen, so the effect happening WITHOUT a thing rules that thing out. Also that "follows" is a match both ways (yes
with yes AND no with no), and that a "stopped it" note excuses only one kind of break row. Of this, only "follows both
ways" is taught (card 1's example, the `TEST_TERMS` "Follows" term, the board mark). Why a cause must be followed both ways
(in these puzzles only one thing makes the effect) is never stated, and the reason line given is wrong.

**Likely mix-up.** The learner hears "a cause works every time" (if it happens, the effect happens) and is then told it
also rules out a row where the thing did NOT happen and the effect did. Stop 6 trained exactly the opposite: s6.l1 "THEN
without IF is fine"; s6.l2 "Wet grass": "a sprinkler could have made the grass wet... So you can’t tell if it rained." One
of two things happens. (a) A careful learner rejects the reason ("the clock never showed 7:00 in test 3, so it never got a
chance to work") and marks Can’t tell yet, or picks "Not yet" for records. (b) A learner who accepts the reason learns that
"if X then Y" is broken by "Y without X". That is the turned-around move Stop 6 taught them to reject. s7.l2 adds a
contradiction one lesson earlier: rain and a sprinkler are both possible makers of wet grass.

**Hidden distinction.** "It works every time" (when the thing happens, the effect happens; sufficiency, the IF-to-THEN
half) vs "Nothing else makes the effect" (when the effect happens, the thing happened; the only-cause or necessity half).
In the brief's terms: "if" vs "if and only if", necessary vs sufficient.

**Hidden steps.** For each thing, on the row that breaks it, classify the break. Type 1: the thing happened and the effect
did not. The thing did not work, so it is out unless a note names something that stopped it. Type 2: the thing did not
happen and the effect did. Something else made the effect happen. The thing is out only because, in these puzzles, one
thing makes the effect, and no note can excuse this type. Then decide.

**Missing prerequisite.** No card states that, in these puzzles, one thing makes the effect happen, so a cause needs two
checks. Card 1 states only "works every time" and gives the off-with-off half as a fact about the lamp. Card 1's first
sentence, "A cause helps make something happen", describes a partial cause, which clashes with "works every time". No card
names the two kinds of break row. No card says the stopper note excuses only type 1. The `worksEvery()` helper prints "A
cause works every time." for both types (`causes.ts`:89-93). Stop 6 (s6.l1, s6.l2) teaches that THEN-without-IF does not
break an if-then rule. Nothing in s7.l3 links to Stop 6 or says why "follows" is stronger than "if… then".

**Recommended teaching intervention.** Cheapest core fix first: rewrite `CAUSE_RULE` and `CAUSE_TERM` to state the
one-cause rule and both checks, and change card 1: "A cause makes something happen. In these puzzles, one thing makes the
effect happen. So a cause passes two checks: (1) When it happens, the effect happens. (2) When it does not happen, the
effect does not happen." Make `worksEvery()` print a type-2 reason: "The lamp came on without the clock. In these puzzles
only one thing turns the lamp on, so the clock is not it." Add one line tying it to Stop 6: "In Stop 6, THEN without IF did
not break an if-then rule. ‘Follows’ needs both checks." Give the clock the reason that holds even outside the one-cause
world, its fair test: "From test 1 to test 3, only the clock changes, and the lamp stays on. So changing the clock did
nothing." Then declare `LessonDef.distinctions` `[{id: 'works-vs-only-cause', a: 'It works every time: when it happens, the
effect happens.', b: 'Nothing else makes the effect: when it does not happen, the effect does not happen.'}]` and add a
contrast card (Scene `contrast`; text panels are enough). Left: world "Test A: the clock shows 7:00", says "The clock turns
the lamp on", truth false, because "The clock happened. The lamp stayed off. Check 1 breaks: it did not work." Right: world
"Test B: the clock does not show 7:00", the same says, truth false, because "The lamp came on without the clock. Check 2
breaks: something else did it." Ask: "Are these the same kind of break? No. One says it did not work. One says something
else turned the lamp on." On the lamp board, either split "Does the lamp follow it every time?" into two marks with because
rows ("When it happens, is the lamp on?" and "When it does not happen, is the lamp off?"), or keep one mark and add because
rows that name the break type. Add a misconception (a new kind in `diagnose()`, which today handles only case boards):
`one-way-follow`. With today's single follows mark, detect a verdict of "Can’t tell yet" or "The cause" on a row whose
follows answer is No and whose only break is type 2. Words: "You may be treating ‘it works every time’ and ‘nothing else
makes it happen’ as one check." Add the confused questions below to the board and to cause-together and cause-third items
(`Item.confused`).

**Recommended UI change.** In the table picture, outline the row that breaks a thing and tag it in words: "It happened, the
effect did not" or "The effect came without it". If the two checks are split, show them as two separate marks. Draw
`DrillMark.compare` (says, world) on tap-row boards; today only CaseBoard draws compare rows. Put a small "Two checks" strip
(MethodSteps) over the lamp board with scaffold full (MethodSteps also needs wiring into DrillBoard).

**Diagnostic question.** Q1: "Test 3: the clock does not show 7:00, but the lamp is on. In test 3, did the clock even
happen?" Options: "No, the clock did not show 7:00" (right) / "Yes" / "Not sure". Q2: "So why is the clock out?" Options:
"The lamp came on without it, and in these puzzles one thing turns the lamp on" (right) / "Because a cause works every time"
/ "Not sure".

**Targeted remediation.** "You may be treating ‘it works every time’ and ‘nothing else makes it happen’ as one check. They
are two. ‘Works every time’ is about tests where the clock DID happen. Test 3 is a test where the clock did not happen, and
the lamp still came on. So something else turned the lamp on. In these puzzles only one thing turns the lamp on, so the
clock is not it. Remember Stop 6: THEN without IF does not break an if-then rule. ‘Follows’ is stronger. It needs both
checks." Then a tiny two-row example: the clock on and the lamp off (check 1 breaks) next to the clock off and the lamp on
(check 2 breaks).

**How to test mastery.** A short set of new tables. In each, the learner labels the breaking row "did not work" or "came
without it" and gives the verdict. The set includes: a records item whose only break is the effect without the thing
(answer No); a test table where a row with the thing on and the effect off carries a stopper note (excused); and a table
whose only type-1 row has no note (out). Add one Stop 6 transfer item (THEN without IF keeps the rule) in the same session,
to show Stop 6 still holds. Pass: every break type right on the first try with no hint, in two different frames.

**Evidence.** `src/engine/puzzles/causes.ts`:82-93 (`CAUSE_RULE`; `worksEvery` returns "A cause works every time." for the
thing-off, effect-on row), 155-160 (`breakWhy`), 183-190 (`verdictNote`), 273-290 (`verdictWhy`), 293-327 (`candRow` note),
330-343 (`lampBoard`), 362-371 (card 1), 400-409 (card 5), 699-724 (`TEST_TERMS`), 760-784 (`whichFeedback` "Then … every
time … And … when …"), 1043-1057 (`togetherItem` "no" feedback and explanation), 1152-1160 (`thirdItem` `blockLine` and
"only when"); `src/content/stop7/causes.ts`:34-41; `curriculum.json` s6.l1 card "THEN without IF is fine", s6.l2 card "Wet
grass"; `src/engine/puzzles/explanations.ts`:270-300 (rain and sprinkler both wet the grass). Verified by running the
board: the clock row note reads "In test 3, the clock does not show 7:00, but the lamp is on. A cause works every time. So
the clock is not the cause."

**Reviewer note.** (1) Narrow "missing" (applied above). "Follows" both ways is taught: card 1's example, `TEST_TERMS`
"Follows", the board mark. What is missing is why a cause must be followed both ways (in these puzzles only one thing makes
the effect) and a correct reason line. (2) Card 1's first sentence, "A cause helps make something happen", describes a
partial cause. That clashes with "works every time", so make it "makes something happen". (3) Cheapest core fix: rewrite
`CAUSE_RULE` and `CAUSE_TERM` to state the one-cause rule and both checks. Make `worksEvery()` print a reason for this kind
of row. Add the Stop 6 bridge line. (4) Give the clock the reason that holds even outside the one-cause world: its fair
test. From test 1 to test 3 only the clock changes and the lamp stays on, so changing the clock did nothing. In sampled
quiz tables, 420 of 517 non-cause things have such a pair, and in every one the effect stays the same, so this reason can
lead wherever it exists. (5) The `one-way-follow` misconception as first written assumed two separate follow marks. With
today's single mark, detect a verdict of Can't tell yet or The cause on a row whose follows answer is No and whose only
break is the effect-without-the-thing kind. See also s7-rev-2, the same closed-world rule in L2.

### s7-l3-tests-vs-records (P1)

**Location.** s7.l3. Card 4 "Together is not enough", Do 2 "Check two things that go together", card 5 "Look for a third
thing", and the quiz switch between cause-which and cause-cant-tell (test tables) and cause-together (records).

**What the learner sees.** Card 4: "These days are records: someone just wrote them down. Records are not a fair test. Lots
of things nobody wrote down change from day to day." Do 2 then asks of those same days "Does a fair test change only it?",
and its why is "The heat and the ice cream always change together. So no fair test changes only the heat." Card 5: "Heat
still causes ice cream sales when the shop is open." Test-table caption: "Each row is one test. ✓ means yes. ✗ means no."
Records caption: "Each row is one day. ✓ means it happened. ✗ means it did not." Together item: "Gus wrote down what
happened at school each day. Does the green backpack make a surprise quiz happen?" It shows a one-column table, with
choices "Yes. They go together, so…" / "Not yet. Going together is not enough. Test it." / "No. On one day, they did not go
together."

**What the program assumes the learner has been taught.** That the learner picks a procedure by who made the rows, not by
what the grid looks like. Tests someone set up: only the listed things changed, so run follows plus the fair test. Records
someone wrote down: unlisted things changed too, so going together only gives "Not yet". It also assumes the learner knows
records can rule a cause OUT but never IN.

**Likely mix-up.** The learner applies the Do-board method to a records table. With one thing column, every change is "only
it changes". So the thing follows and has a fair test, and the learner picks "Yes… makes a surprise quiz happen". The Do
board taught "can’t tell means another column always changes with it", a reason the learner can see. Records need "things
nobody wrote down changed too", a reason the learner cannot see. The reverse error also happens: after card 4 the learner
says "Can’t tell yet" for a real test table, or "Not yet" when one record already breaks it. Card 5 concludes a cause from
records, which models the mix-up.

**Hidden distinction.** "A test you set up: you changed only this, on purpose" vs "records someone wrote down: other things
nobody wrote down changed too". Also "going together" vs "being the cause", and "records can rule a cause out" vs "records
can rule a cause in".

**Hidden steps.** Before checking columns, ask who made these rows. If someone set up tests, run follows (both ways) and
the fair-test pair. If someone wrote down days (records), check row by row: a row where they do not go together means No.
If they go together every row, the answer is Not yet. Never run the fair-test step on records.

**Missing prerequisite.** No board has a records table with one thing column. Do 2 is records, but it applies the fair-test
question to them and its reason is the twin column, not "records". The grid shows no marker of tests vs records: only the
row word (test, day, game, week, night) and the intro verb differ. Card 5 asserts a cause from records ("Heat still causes
ice cream sales"), which contradicts card 4. Three phrasings name one verdict: "Can’t tell yet", "Not yet", "Can’t tell from
these days".

**Recommended teaching intervention.** Minimal fix first: on `sunBoard`, replace the fair-test mark with "Did someone change
only it, on purpose?" (No: these are records), and add one one-column records row ("Do they go together every day?" Yes /
"So…" Not yet). Rewrite card 5's line as "The heat may cause both. A fair test could check it." Then declare distinction
`{id: 'tests-vs-records'}` and add a contrast card after card 4: two panels, the same two columns ("Red cap on" / "Team
won"), the same pattern of marks. Left: world "TESTS: Kai put the cap on or off on purpose and kept everything else the
same", because "Only the cap changed, and the win followed it", verdict "You can tell". Right: world "RECORDS: Kai wrote down
each game", because "Many things nobody wrote down changed too", verdict "Not yet". Ask: "Did the marks change? No. What
changed? Who made the rows." The current `ContrastPanel` is text only, so drawing a small table in each panel needs a new
panel field; text rows ("Game 1: cap on, team won") work meanwhile. Add a misconception (a new tap-row kind in
`diagnose()`, for example `records-as-test`): the verdict "The cause" on a records row. Words: "You may be treating ‘they
went together in records’ as ‘a fair test’." Add `Item.confused` on cause-together.

**Recommended UI change.** Put a source banner over every table, in the same style as the test-world banner: "TESTS ·
someone changed things on purpose" or "RECORDS · someone wrote down what happened", each with its own icon. Repeat the
source word in the records caption ("Records: each row is one day…"). Use one phrase for the verdict ("Can’t tell yet")
everywhere. ("Can’t tell from these days" is correctly a wrong choice in cause-third, because a day breaks the pair.)

**Diagnostic question.** Q1: "Who made these rows?" Options: "Someone who changed one thing on purpose" / "Someone who wrote
down what happened each day" (right for a records item) / "Not sure". Q2: "Could something that is not in the table have
changed from day to day?" Options: "Yes" (right) / "No" / "Not sure".

**Targeted remediation.** "You may be treating records like a fair test. In a test, the tester changes one thing and keeps
the rest the same, so the table shows everything that changed. In records, someone just wrote down two things each day. The
weather, the day of the week and lots more changed too, and nobody wrote them down. So going together in records is a clue
to test, not a cause. One day where they do NOT go together still rules it out." Then show the cap example both ways.

**How to test mastery.** Paired items with the same pattern of marks, once labelled tests and once labelled records. The
answers must be "the cause" and "Not yet". Add one records item with a break (answer No). Pass: both items of a pair right
on the first try with no hint, in two frames.

**Evidence.** `src/engine/puzzles/causes.ts`:192-201 (`tableScene` caption), 243-264 (SUN tables and captions), 346-359
(`sunBoard`), 389-409 (cards 4 and 5, "Heat still causes ice cream sales"), 932-1075 (`togetherItem`: prompt, captions,
choices), 1141-1146 (third choices "Can’t tell from these days"); `src/content/stop7/causes.ts`:25-41.

**Reviewer note.** Do 2 does use records. The problem is that it applies the fair-test question to them. Minimal fix: on
`sunBoard`, replace the fair-test mark with "Did someone change only it, on purpose?" (No: these are records), and add one
one-column records row. Rewrite card 5's line as "The heat may cause both. A fair test could check it." Records can rule a
cause out: card 5 already shows that with ice cream on day 4, so the contrast only needs the "not in" half. Using one
verdict phrase everywhere is fine. "Can’t tell from these days" is correctly wrong in cause-third, because a day breaks the
pair.

### s7-l2-fits-vs-explains (P1)

**Location.** s7.l2 The best explanation. Card 2 "Fit every clue", and the quiz explain-best, explain-new-clue and
explain-test story items, which list clues as text with no grid.

**What the learner sees.** Card 2: "An idea fits a clue when the clue makes sense if the idea is true." Quiz (plant story):
"Clue 1: The plant’s leaves are droopy. / Clue 2: The soil in the pot is still wet. / Clue 3: The plant sits in the sunny
window." The right answer is "The room got too cold over the weekend", explained as "is the only idea that fits all three
clues". Generic reason line: "The pond idea fits it." One story has a special line: "An emptied pond tells you nothing about
the rain." In the worked example, the sprinkler idea gets a cross under "Street wet".

**What the program assumes the learner has been taught.** The program's real rule: each idea is the whole story of what
happened. An idea fits a clue when the clue could still be true if that story were all that happened, and it misses when
the story would make the clue different. So a clue about something else can still fit (the cold-room story says nothing
about the soil), while a clue the story would change does not (if the sprinkler was all that happened, the street would be
dry).

**Likely mix-up.** The learner reads "fits" or "makes sense" as "the idea explains the clue". Every clue about something
else then gets a cross. "Too cold" is crossed out for "soil still wet" and "sunny window", so no idea is left. Or the
learner picks the idea that "explains the most clues". A neutral check ("Look in Rex’s bed") looks like it supports one
idea. A learner who instead reads "fits" as "both can be true at the same time" keeps the sprinkler for "Street wet" (a
sprinkler and a wet street can both be true), against the worked example.

**Hidden distinction.** The idea's story leaves the clue possible (fits, whether or not the idea explains it) vs the idea's
story would make the clue different (misses). Inside "fits": the story says nothing against the clue vs the idea explains
the clue.

**Hidden steps.** For each idea and each clue: 1) Picture the idea as all that happened. 2) Ask "could this clue still be
true then?", not "does the idea cause it?". 3) Mark a miss only when the story would make the clue different. Do this for 3
ideas and 2 or 3 clues, held in mind in story items.

**Missing prerequisite.** Every fit shown on the cards (rain, sprinkler and truck, by grass and street) is an "explains"
fit. The "says nothing, still fits" case appears only on Do 1's roof column ("A sprinkler does not reach the roof, so the
roof stays dry.") and in one story's feedback. No card names it. The whole-story rule itself is never stated (see s7-rev-2).
In stories that give no reason line, the feedback says only "… fits it."

**Recommended teaching intervention.** Rewrite card 2 and the "Fits a clue" term with the whole-story rule: "Picture the idea
as the whole story of what happened. It fits a clue if the clue could still be true in that story. It misses a clue if the
story would make the clue different." Declare distinction `{id: 'fits-vs-explains', a: 'The idea’s story would make the
clue different.', b: 'The idea’s story leaves the clue possible, even if it does not explain it.'}`. Add a contrast card
with this pair: the sprinkler idea and "Street wet" (misses: if the sprinkler was all that happened, the street would be
dry) next to the cold-room idea and "Soil still wet" (fits: the cold-room story says nothing about the soil, so it can still
be wet). Ask: "Does a clue have to be about an idea to fit it? No. It only must not be changed by the idea’s story." Add a
grid board (a DrillGrid like `fitBoard`) on a story with at least one clue the idea does not explain. Add a misconception: a
new grid kind in `diagnose()`, for example `fits-as-explains`, for a miss marked on a cell whose answer is a fit and whose
clue has no reason for that idea. Words: "You may be treating ‘fits’ as ‘explains’." Add `Item.confused` on explain-best and
explain-test.

**Recommended UI change.** Give story items an optional scratch grid (`Item.scratch`, "Use the case board"): ideas by clues
with tap marks, and each idea's extra-thing count beside its row. In feedback and Teach cases, word a fit either as "its
story leaves this possible" or "explains it", not a bare "fits it".

**Diagnostic question.** Q1: "If ‘Nobody watered it’ is the whole story, could the plant still sit in the sunny window?"
Options: "Yes" (right) / "No" / "Not sure". Q2: "So does the idea fit the clue?" Options: "Yes" (right) / "No, it does not
explain it" / "Not sure".

**Targeted remediation.** "You may be treating ‘fits’ as ‘explains’. Picture the idea as the whole story of what happened.
An idea fits a clue when the clue could still be true in that story. ‘Nobody watered it’ does not explain why the plant sits
in the sunny window, but in that story the plant can still sit there. So the idea fits. An idea misses a clue only when its
story would make the clue different: if the sprinkler was all that happened, the street would be dry."

**How to test mastery.** Explain-best items where the best idea fits one or two clues only because its story says nothing
against them, mixed with cells where the story changes the clue. The scratch-grid marks and the answer right on the first
try in two story skins. Then repeat without the scratch grid.

**Evidence.** `src/content/stop7/explanations.ts`:75-83 (card 2); `src/engine/puzzles/explanations.ts`:98-101 (`ruleOut`: why
only for the idea ruled out), 143-151 (pond "others"), 181-194 (plant), 295 (sprinkler misses "Street wet"), 350-354
(`clueWhy` generic "fits it"), 379-409 (`sceneOf`: text lines only for stories), 466-492 (`notBestFeedback`). Generated
item: the plant story, answer "The room got too cold over the weekend".

**Reviewer note.** The auditor's first rule ("fits means both can be true; only a clash gives a cross") contradicts the
worked example. The sprinkler gets a cross under "Street wet" (`explanations.ts`:295), yet a wet street and a sprinkler that
ran can both be true. The program's real rule treats each idea as the whole story of what happened: an idea fits a clue when
the clue could still be true if that story were all that happened, and it misses when the story would make the clue
different. Card 2, the "Fits a clue" term, the contrast card and the remediation should say this (all applied above). The
contrast pair is now sprinkler and "Street wet" (miss: its story leaves the street dry) next to cold and "Soil still wet"
(fit: its story says nothing about the soil). Diagnostic Q1 was reworded, because as first written ("Can both be true at the
same time?") it also says Yes to the sprinkler and a wet street. See s7-rev-2 on the whole-story assumption.

### s7-rev-1 (P1)

**Location.** s7.l2 explain-test items in the mud story (`explanations.ts`:141, 721-738), in the lesson quiz, the check and
the Arcade.

**What the learner sees.** Among the checks: "Look in Rex’s bed." (the program says it can only show "Rex is asleep in his
bed.") and the right choice "Go and see if Rex is wet." Picking the bed gets: "Whatever it shows, both ideas stay in."

**What the program assumes the learner has been taught.** That looking in Rex's bed cannot split the two ideas still in.

**Likely mix-up.** All three mud explain-test pairs were generated. In two of them, paint plus pond and paint plus rain,
looking in Rex's bed would show whether Rex is wet, and that splits paint from the other idea exactly as the "right" choice
does. A learner who imagines what a check could find, as card 5 teaches, picks it and is told "Whatever it shows, both ideas
stay in." That marks good reasoning wrong and teaches that a check has one fixed result.

**Hidden distinction.** A check that could rule an idea out vs one that could not, judged by what the check could find, not
by one result the program fixed in advance.

**Hidden steps.** 1) Imagine each thing the check could find. 2) Ask whether the two ideas still in disagree on any of them.

**Missing prerequisite.** No test checks that a "same" check's action could not reveal any idea's ruling-out clue.

**Recommended teaching intervention.** Replace the neutral clue with one that cannot touch any idea (for example "Omar got
home at four." with the check "Ask when Omar got home."). Add a test that a "same" check's action could not reveal any idea's
ruling-out clue, for every story.

**Recommended UI change.** None needed. The "It could show: …" line proposed in s7-l2-check-before-taught would make each
check's possible finding visible.

**Diagnostic question.** "A check could show something that fits the paint idea but not the pond idea. Could this check rule
one out?" Options: "Yes" (right) / "No" / "Not sure".

**Targeted remediation.** (For a true "same" check after the fix.) "Whatever time Omar got home, both ideas still fit. This
check can’t rule either one out. Pick a check that one idea fits and the other does not."

**How to test mastery.** Mud-story explain-test items right on the first try after the fix, and the new test passing for
every story.

**Evidence.** `src/engine/puzzles/explanations.ts`:141 (the neutral mud clue), 721-738 (`sameLabel` and the "same" check
feedback).

**Reviewer note.** This was a reviewer's extra finding.

### s7-rev-2 (P1)

**Location.** s7.l2 fit marks in every story (for example the sprinkler and "Street wet", paint and "Rex is soaking wet",
the cold-room idea and "Crumbs are all over the table"), and s7.l3 rows where the effect happened without a thing.

**What the learner sees.** The sprinkler gets a cross under "Street wet" (`explanations.ts`:295). "Painted prints on the
floor would not make Rex wet." In L3: "In test 3, the clock does not show 7:00, but the lamp is on. A cause works every time.
So the clock is not the cause."

**What the program assumes the learner has been taught.** That each idea, or cause, is the only thing at work: nothing else
happened that the idea does not say.

**Likely mix-up.** Stop 6's "Could it happen another way?" (s6.l2) trains the opposite. This decides answers. In the
explain-best case with the clues "prints", "It did not rain today" and "Rex is soaking wet", the answer is pond (2 extra
things) only because paint's story leaves Rex dry. A learner using Stop 6's question ("Rex could be wet another way") keeps
paint (1 extra thing) and picks it. In L3, the same learner keeps the clock.

**Hidden distinction.** The idea (or cause) is the whole story vs other things may also have happened (the open world of
Stop 6).

**Hidden steps.** Picture the idea as all that happened. Ask whether each clue could still be true then.

**Missing prerequisite.** The rule is never stated in L2 or L3. It also means the fits-vs-explains fix must use this rule:
"fits means both can be true" would break the worked example.

**Recommended teaching intervention.** Teach the rule once and name it in both lessons. L2: "In these puzzles each idea is
the whole story: nothing else happened that it does not say." L3: "In these puzzles, one thing makes the effect." Bridge both
to Stop 6: "In Stop 6 you asked whether it could happen another way. Here each idea tells you: only what it says happened."
Add the misconception and the `Item.confused` question on explain-best and explain-new-clue.

**Recommended UI change.** Put the rule on the board scene as a banner: "Each idea is the whole story."

**Diagnostic question.** "In this puzzle, could something not in the paint idea have made Rex wet?" Options: "No. Each idea
is the whole story" (right) / "Yes, Rex could have got wet another way" / "Not sure".

**Targeted remediation.** "In Stop 6, you asked if something could happen another way. In these puzzles, each idea is the
whole story: only what it says happened. If paint is all that happened, nothing made Rex wet. Rex is soaking wet, so the
paint idea misses that clue."

**How to test mastery.** The explain-best case above (prints, no rain, Rex soaking wet) right on the first try, and a Stop 6
backward item in the same session still answered "can’t tell".

**Evidence.** `src/engine/puzzles/explanations.ts`:295 (sprinkler and "Street wet"); `src/engine/puzzles/causes.ts`:89-93
(`worksEvery`); `curriculum.json` s6.l2 "Could it happen another way?".

**Reviewer note.** This was a reviewer's extra finding. It underlies both s7-l2-fits-vs-explains and
s7-l3-works-every-time-vs-only-cause.

### s7-l3-fair-test-pair (P2)

**Location.** s7.l3. Do 1 "Check each thing" (the clock row), card 3 "Example: find the cause", and quiz cause-which and
cause-cant-tell tables (2 or 3 things by 3 or 4 tests, no scratch board).

**What the learner sees.** The mark label reads "Does a fair test change only it?". For the clock the answer is Yes, and the
why says "From test 1 to test 3, only the clock changes. Everything else stays the same." Then "So it is…" is Not the cause.
In the given switch row just above, the same mark is Yes and the verdict is The cause. Card 3: "From test 2 to test 3, only
the switch changes. That is a fair test." The lamp column changes in that pair too. Quiz: "Nia tests a new toy car. What
makes the lights flash?" with four tests by three things.

**What the program assumes the learner has been taught.** That a "fair test" in a table is a PAIR of rows. That "only it
changes" skips the effect column. That the verdict follows a fixed table: does not follow means Not the cause, whatever the
fair test says; follows plus a fair test means The cause; follows with no fair test means Can’t tell yet.

**Likely mix-up.** The learner reads "a fair test changes only the clock: Yes" as "the clock is the cause", copying the
switch row's Yes, Yes, The cause. Or the learner rejects "only the switch changes" because the lamp changed too. In
three-thing quiz tables the learner checks one pair and stops.

**Hidden distinction.** "A fair test exists for X" vs "X is the cause": what the effect did in that fair test decides it.
Also "the things you change" (thing columns) vs "the thing you watch" (the effect column).

**Hidden steps.** 1) Scan every pair of rows (3 rows give 3 pairs, 4 rows give 6). 2) For each pair, list which thing
columns differ, skipping the effect. 3) If exactly one differs and it is X, that pair is a fair test for X. 4) Look at the
effect in that pair: it changed, so X did it; it stayed the same, so changing X did nothing. 5) Combine with follows by the
decision table.

**Missing prerequisite.** The decision table is never shown as a rule. The effect column is drawn exactly like the thing
columns (only `TEST_TERMS` in the after-a-miss panel says "The last column shows if…"). "A test" (one row) vs "a fair test"
(two rows compared) appears once, on card 3. Card 2 says "If the lamp changes too, that one thing is the cause" but not the
other half. Quiz items have no `Item.scratch` board to carry the board's three marks.

**Recommended teaching intervention.** Add the other half to card 2: "If the lamp stays the same, that thing did nothing."
Make card 3 say what the lamp did from test 2 to test 3. Add a because line on the clock's fair-test mark: "Test 1 to test 3:
only the clock changes. The lamp stays on. So changing the clock did nothing." (This doubles as the corrected reason for the
P0.) Optionally use scaffold full on the lamp board with a MethodSteps strip ("1 Follows both ways? 2 Two tests where only it
changes? 3 Decide"; MethodSteps needs wiring into DrillBoard), give cause-which and cause-cant-tell items a light
`Item.scratch` board built from `candRow` for each thing, and add a misconception (a new tap-row kind, for example
`alone-as-cause`): the verdict The cause while the follows mark is No. Words: "You may be treating ‘a fair test changes only
it’ as ‘it is the cause’. Look at what the lamp did in that fair test."

**Recommended UI change.** Set the effect column apart: a divider, a different header colour and the label "What we watch".
Rename the mark "Can you find two tests where only it changes?" When the learner taps two rows, highlight the pair and the
one thing column that differs.

**Diagnostic question.** Q1: "From test 1 to test 3 only the clock changes. What did the lamp do?" Options: "It stayed on"
(right) / "It turned on" / "Not sure". Q2: "So did changing the clock change the lamp?" Options: "No" (right) / "Yes" / "Not
sure".

**Targeted remediation.** "A fair test is two tests where only one thing changes. It does not tell you the thing is the
cause. Look at the effect in those two tests. If it changed too, the thing did it. If it stayed the same, the thing did
nothing. The clock changed and the lamp stayed on, so the clock is not the cause."

**How to test mastery.** Cause-which items where a thing that is not the cause still has a fair-test pair (the effect stays
the same in it), right on the first try. If the scratch board is added, fade it after two clean answers, then require one
clean answer without it.

**Evidence.** `src/engine/puzzles/causes.ts`:97-106 (`alonePair`), 168-172 (`aloneWhy`), 292-327 (`candRow` marks), 330-343
(`lampBoard`), 380-388 (card 3), 699-724 (`TEST_TERMS` and `testTeach` "The last column shows…"), 859-903 (`testItem`
"which"); `src/game/components/CaseBoard.tsx`:18, 312 (MethodSteps only on case boards). Verified board: the clock's "Does a
fair test change only it?" is yes, and its verdict is "not".

**Reviewer note.** Card 2 already says "If the lamp changes too, that one thing is the cause". Add the other half: "If the
lamp stays the same, that thing did nothing." The because line for the clock's fair-test mark ("Test 1 to test 3: only the
clock changes. The lamp stays on.") doubles as the corrected reason for the P0. Also make card 3 say what the lamp did from
test 2 to test 3. Wiring MethodSteps into DrillBoard and giving quiz items scratch boards are optional extras.

### s7-l2-check-before-taught (P2)

**Location.** s7.l2. Do 2 "Pick the best guess", the row "A check for rain and truck · Which check could rule one out?".
Card 5 "A new clue can change it", which defines a check, is shown AFTER both boards. Also the quiz explain-test.

**What the learner sees.** Board 2 body: "First use only the first two clues. Pick the best guess. Then pick a check that
could rule one idea out." Options: "Look at the grass again." / "Look at the roof." / "No check is needed." Card 5 comes after
the boards: "To test them, look for a clue that one idea fits and the other does not… Read the weather report? If no rain
fell, rain gets a ✗ and truck gets a ✓. So that check could rule one idea out." Story quiz choices give only the action, for
example "Find out if it rained last night.", never what it could find.

**What the program assumes the learner has been taught.** What a check is (something you could look at next, with its
result not known yet), that its result must be imagined ("if it shows…"), and that a good check is one the two ideas still
in disagree on.

**Likely mix-up.** "A clue" (found, marked on the grid) vs "a check" (could be looked at; result unknown). "Could rule one
out" is read as "look again to be sure" ("Look at the grass again") or as "no check is needed" because the simpler idea
wins.

**Hidden distinction.** A clue already found vs a check you could make. Also "could rule one out" (some possible finding
splits the two ideas) vs "both ideas fit whatever it finds".

**Hidden steps.** 1) Find the two ideas still in. 2) For each check, imagine what it could find. 3) Test each of the two
ideas against that finding. 4) Pick the check where they differ. 5) Reject a check both fit, re-looking at a found clue, and
skipping the check.

**Missing prerequisite.** `lessonStages()` puts both boards (`afterCard: 3`) before card 5, so the idea is first taught only
after the board that asks for it. The only earlier mention is board 1's done line: "So the roof is a good check, because it
tells rain and truck apart." Story quiz checks never show the possible finding; that text ("It could show: …") exists only
inside feedback (`sameLabel`).

**Recommended teaching intervention.** Set `bestBoard`'s `afterCard` to 4, so card 5 comes before board 2. There is no need
to split card 5: it uses the weather report and board 2 uses the roof, so board 2 becomes a twin. In story explain-test
items, add "It could show: …" under each check while the scaffold is full, and fade it later. Add `Item.confused` on
explain-test. Optionally declare `{id: 'clue-vs-check'}`; a new contrast card is optional, because card 5 already contrasts
two checks in words.

**Recommended UI change.** On board 2, draw the roof column as a dashed "Roof dry?" check column (the form card 5's
`newClueScene` already uses) while the learner picks the check. Show it solid only once the row "Now add the third clue"
starts. This also fixes s7-l2-two-clue-sets-one-board.

**Diagnostic question.** Q1: "When you pick the check, has anyone looked at the roof yet?" Options: "No. It is something we
could look at" (right) / "Yes" / "Not sure". Q2: "If you look at the grass again, could rain or truck be knocked out?"
Options: "No, both fit it" (right) / "Yes" / "Not sure".

**Targeted remediation.** "A clue is something you have found. A check is something you could look at next. A check helps
only if the two ideas still in would disagree about what it finds. Both ideas fit ‘Grass wet’, so looking again can’t tell
them apart. If the roof is dry, rain is out and truck still fits. That check could rule one out."

**How to test mastery.** Explain-test items in story skins, first with the "It could show" line and then without it. Two
right on the first try with no hint, one in the grid skin with "Clue C?" columns.

**Evidence.** `src/content/stop7/explanations.ts`:104-117 (card 5 last; drill `[fitBoard(), bestBoard()]`);
`src/engine/puzzles/explanations.ts`:1002-1020 (`fitBoard` `afterCard` 3, done line), 1052-1074 (`checkRow`), 1105-1114
(`bestBoard` `afterCard` 3), 685-697 (test choices: action labels only), 721 (`sameLabel` only in feedback), 961-975
(`newClueScene` "?" column); `src/game/components/LessonRunner.tsx`:38-59 (`lessonStages`).

**Reviewer note.** Simplest fix: set `bestBoard`'s `afterCard` to 4, so card 5 comes before board 2. There is no need to
split card 5: it uses the weather report and board 2 uses the roof, so board 2 becomes a twin. Keep the "It could show: …"
line under story check choices. The dashed "Roof dry?" column also fixes s7-l2-two-clue-sets-one-board. A new contrast card
is optional, because card 5 already contrasts two checks in words. (Applied above.)

### s7-l1-draws-vs-bag (P2)

**Location.** s7.l1 Pattern guesses. Cards 1 to 4, and the quiz items pattern-sure, pattern-break (can fail, needed to pass)
and pattern-due (hidden form). Both Do boards use only a bag you can see.

**What the learner sees.** Hidden-bag scene: "Zoe’s draws, in order: / red, red, red". Prompt: "Zoe can’t see inside the
bag… All 3 were red. What does Zoe know for sure?" Choices: "Every marble in the bag is red." / "The 3 marbles Zoe saw were
red." / "The next marble must be red." Open-bag scene (same skin): "In the bag: / 6 red marbles / 1 blue marble". The
counting rule the learner just practised on two boards: "All fit: Must." The right sure-item answer uses a new word:
"Probably red, but a new draw could break the pattern."

**What the program assumes the learner has been taught.** That the learner keeps the list of DRAWS (what came out and went
back) apart from what is IN the bag, and knows the Must, Likely, Unlikely and Can't counting rule works only on a bag you can
see and count.

**Likely mix-up.** The learner counts the draws as if they were the bag: "3 of 3 are red, all fit, so Must". They pick "The
next marble must be red" or "Every marble in the bag is red". "Not seen" becomes "not there" ("The bag has no blue
marbles"). "Probably" is an undefined fifth word next to the four counted words.

**Hidden distinction.** "What was seen" (the draws) vs "what is in the bag". Also "a bag you can see (count it, get the
word)" vs "a bag you can't see (only a guess: probably)".

**Hidden steps.** Ask first: can I see inside the bag? If yes, count the bag and map the count to a word. If no, only the
draws are sure. Anything about the bag or the next draw is a guess: say "probably", never "must", "every" or "none".

**Missing prerequisite.** Both boards ("Mark the colors", "One count changed") use the open bag. No board ever marks a
hidden-bag streak, yet three of the four quiz kinds need it. The draws scene and the open-bag scene are both plain text lists
for skins without shapes (`bagScene` vs `drawsScene`), so they look alike. "Probably" is defined only in the Teach after a
miss ("“Probably” is a good guess. “Must” needs a proof.").

**Recommended teaching intervention.** Cards 1 and 2 already form the contrast, so turn them into one contrast scene instead
of adding a fifth card (distinction `{id: 'seen-vs-bag', a: 'What came out: the draws you saw.', b: 'What is in the
bag.'}`): the same draws "red, red, red, red". Left: world "Open bag: 6 red, 1 blue", says "The next marble is red", word
"Likely", because "You can count the bag." Right: world "Hidden bag", the same says, "Probably, not Must", because "Only the 4
draws are sure." Ask: "Did the draws change? No. What changed? Whether you can see the bag." Add a short board after card 3
on Hana's hidden bag, with "Sure or guess?" rows for "The 6 cards Hana saw were circles." (Sure) / "The bag has only circles."
(Guess) / "The next card must be a circle." (Guess, not allowed) / "The bag has no squares." (Guess). Copy the Teach line onto
card 1: "“Probably” is a good guess. “Must” needs a proof." Optionally add a misconception (a new tap-row kind, for example
`draws-as-bag`: marking any sentence about the bag "Sure"; words: "You may be treating the draws as the whole bag.") and
`Item.confused` on pattern-sure, pattern-break and pattern-due.

**Recommended UI change.** Draw the hidden bag as a closed bag with a banner "Hidden: you can’t count it", and the open bag
as counted cards with a banner "Open: count it" (the test-world banner idea). Label the draws strip "Came out, then went
back".

**Diagnostic question.** Q1: "Can Zoe see inside the bag?" Options: "Yes" / "No" (right) / "Not sure". Q2: "So can Zoe count
the bag to get Must or Likely?" Options: "No, only the 3 draws are known" (right) / "Yes, 3 of 3 are red" / "Not sure".

**Targeted remediation.** "You may be treating the draws as the whole bag. The draws are only what came out. Zoe saw 3
marbles. The bag can hold more, and some may be another color. ‘All 3 were red’ is about the draws, not the bag. So say
‘probably red’, not ‘must’, and not ‘no blue’."

**How to test mastery.** A mixed set of open-bag and hidden-bag items with the same draws or counts, each answered by its
kind of bag, right on the first try with no hint. Include one pattern-break and one pattern-sure "know" item.

**Evidence.** `src/engine/puzzles/patterns.ts`:217-233 (`bagScene` vs `drawsScene`, both text), 489-490 (`hiddenLine`),
510-537 (`proofTerms` and `sureTeach` "Probably"), 555-637 (`sureItem`), 859-951 (`breakItem`), 1030-1066 (`colorBoard` and
`twinBoard`: open bag only), 1069-1108 (cards 1 to 4); `src/content/stop7/patterns.ts`:58-65. Generated item: "Zoe can’t see
inside the bag… What does Zoe know for sure?".

**Reviewer note.** Cards 1 and 2 already form the contrast, so turn them into one contrast scene instead of adding a fifth
card. Add a short hidden-bag board after card 3 (Sure or Guess rows on Hana's bag). "Probably" is defined in the Teach
(remember: "“Probably” is a good guess. “Must” needs a proof."); copy that line onto card 1. The bag banner is a good UI
change. (Applied above.)

### s7-l4-fair-check-vs-fair-choice (P2)

**Location.** s7.l4 Fair choices. Card 2 "Three checks", card 3 "Example: three choices for Leo", Do "Check three choices",
the quiz fair-choice items, and the fair-pressure question "Does that make … fair?".

**What the learner sees.** Card 2: "Fair? The other person gets what they are owed… In each story, this check names the
person, like “Fair to Mia?”… The fair choice passes all three checks." Card 3 grid: "Give back, but laugh" has a check mark
under "Fair to Mia?", and the text "passes two checks. Laughing at Mia hurts Mia’s feelings. So it is not the fair choice."
Quiz feedback on the teasing choice: "It is honest… It is fair to Nia. Nia gets the pencil case back. It hurts someone.
Laughing at Nia hurts Nia’s feelings." Board: "Give back, but blame Sam" expects a check mark under "Fair to Mia?".

**What the program assumes the learner has been taught.** That the learner holds two meanings of "fair" in one lesson: the
middle check (the owner gets what is owed) and the verdict (passes all three checks).

**Likely mix-up.** Either way the learner gets it wrong. (a) "Fair to Mia" with a check mark is read as "the fair choice", so
they pick "Give it back, but laugh at Nia for losing it" ("she got it back, so it’s fair"). (b) Using the everyday sense,
"laughing at Mia is not fair to Mia", they mark a cross under "Fair to Mia?" and are told it is wrong. That teaches that
teasing someone can be "fair to" them.

**Hidden distinction.** "Gets what they are owed" (one check) vs "the fair choice" (all three checks pass).

**Hidden steps.** Keep three separate questions for each choice, and ask the middle one by its test ("Does Mia get back what
is hers?"). Only then combine: all three pass means the fair choice.

**Missing prerequisite.** The two meanings of the word are never named. Card 3 shows a check mark under "Fair to Mia?" for
the laughing choice without comment. The feedback text says outright "It is fair to Nia" about laughing at Nia.

**Recommended teaching intervention.** Rename the middle check by its test, and keep "fair" for the verdict only. Column
labels: "Gets it back?" / "Keeps the promise?" / "Hears the truth?" / "Gets a turn?". This changes the `fairTo()` labels
(`fairLabel`, `fairWho`, `passFair`). Card 3 already works as a contrast once the label changes, so no new card is needed.
Optionally declare `{id: 'owed-check-vs-fair-choice'}`, add a misconception (a new grid kind in `diagnose()`, for example
`check-as-verdict`: a cross under the middle check on a row whose answer is a check mark while the row fails another check;
words: "You may be treating ‘Mia gets it back’ and ‘the fair choice’ as one thing."), and add `Item.confused` on
fair-choice.

**Recommended UI change.** Add a fourth, verdict column "All three?" to the board and the worked grid, so the marks for each
check and the verdict sit side by side. Write the check's test in the column header, not "Fair to X?".

**Diagnostic question.** Q1: "In ‘Give it back, but laugh at Mia’, does Mia get the bear back?" Options: "Yes" (right) / "No"
/ "Not sure". Q2: "Is it the fair choice?" Options: "No, it hurts Mia" (right) / "Yes, she got it back" / "Not sure".

**Targeted remediation.** "Two different questions use the word ‘fair’ here. ‘Fair to Mia?’ only asks one thing: does Mia get
back what is hers? The fair choice must also be honest and hurt no one. Laughing at Mia hurts her, so it is not the fair
choice, even though she gets the bear back."

**How to test mastery.** Fair-choice items where the wrong choices are near misses (owed passes, with a tease, blame or rude
line), right on the first try. Plus board marks on such a row right on the first check.

**Evidence.** `src/engine/puzzles/fairness.ts`:62-69 (`checksOf`), 142-153 (`fairTo` labels), 192-198 (tease and blame acts
`owed: true`), 526-529, 583-595 (`choiceFeedback` "It is fair to …"), 884-944 (`rowSays`, cards 2 and 3), 949-985 (board).
Generated feedback: "It is fair to Nia. Nia gets the pencil case back. It hurts someone. Laughing at Nia hurts Nia’s
feelings."

**Reviewer note.** Renaming the middle check by its test in `fairTo()` ("Gets it back?", "Hears the truth?", "Gets a turn?")
removes the overload on its own. No new contrast card is needed, because card 3 already is one. A fourth "All three?" column
is a fine addition. In truth stories the middle check also duplicates "Honest?" exactly (see s7-rev-3).

### s7-l4-in-story-vs-decides (P2)

**Location.** s7.l4. Card 5 "Give a reason from the story", and quiz fair-reason, especially the conflict items whose story
ends with a temptation line.

**What the learner sees.** Card 5: "A reason tells why. A good reason names the fact that decides it: “The name tag says it
is Mia’s.” “Finders keepers” is a saying, not a fact. “Nobody would know” is about getting caught, not about what is fair."
Quiz: "Ava bumps Kai’s clay bowl by accident. / The clay bowl falls and breaks. / Nobody saw it happen." Choices: "Ava is
the one who broke the clay bowl." / "Ava does not want to get in trouble." / "Kai gave the clay bowl to Ava as a gift." /
"Nobody saw it happen." Hint: "Ask two things about each reason. Is it in the story? Does it decide what is fair?"

**What the program assumes the learner has been taught.** That each reason gets two separate tests (in the story? decides
it?), and that the learner knows how to tell whether a fact "decides".

**Likely mix-up.** The learner takes "a true line from the story" for "the fact that decides it" and picks "Nobody saw it
happen." Or they take a fact that sounds decisive (a promise, a gift) for one the story gives.

**Hidden distinction.** "In the story" vs "decides what is fair". A true but irrelevant fact vs the key fact. A fact the story
gives vs one it never gives.

**Hidden steps.** For each reason: 1) Scan the story lines; if it is not there, it is out. 2) If it is a wish, a saying or
about getting caught, it is out. 3) Otherwise imagine it changed (somebody saw it; Sam broke the bowl): would the fair choice
change? Only the deciding fact changes it.

**Missing prerequisite.** Card 5 never shows a true story line that does not decide, or a fact the story never gives. It
never says what "decides" means: there is no change-it-and-see test. The Do board has no reason rows; it marks only the three
checks. The hint asks the second question with no way to answer it.

**Recommended teaching intervention.** Declare distinction `{id: 'in-story-vs-decides'}`. Add a contrast card, "Change it
and see". Left: change "Nobody saw it happen" to "Everybody saw it"; the fair choice is still "Tell Kai, say sorry", so it
does not decide. Right: change "Ava broke the bowl" to "Sam broke the bowl"; the fair choice changes, so it decides. Ask:
"Did the fair choice change? Only when the key fact changed." Include one other kind of temptation line on the card ("has
not come to look for it yet", "is too shy to ask"), since those map less clearly onto card 5. Add reason rows to the Do board
on Leo's story: "The name tag says Mia." / "Nobody saw Leo pick it up." / "Leo promised to give it back on Friday." /
"Finders keepers." Each gets two Yes or No marks, "In the story?" and "Decides it?". `reasonCase()` already computes both
truths. Add `Item.confused` on fair-reason.

**Recommended UI change.** Number the story lines. When a reason is picked or checked, highlight its matching line, or show
"not in the story". Show the two questions as two small chips next to each reason in the explanation (already in the
`reasonCase` truths).

**Diagnostic question.** Q1: "If somebody HAD seen it happen, would the fair choice be different?" Options: "No" (right) /
"Yes" / "Not sure". Q2: "Then does ‘Nobody saw it happen’ decide what is fair?" Options: "No" (right) / "Yes, it is in the
story" / "Not sure".

**Targeted remediation.** "A true line from the story is not always the reason. Test it: change the line in your head. If the
fair choice stays the same, that line does not decide it. If Ava had not broken the bowl, the fair choice would change. That
is the fact that decides it."

**How to test mastery.** Conflict fair-reason items (a temptation line plus a never-given fact among the choices), right on
the first try in two kinds of story. Plus the new board rows right on the first check.

**Evidence.** `src/engine/puzzles/fairness.ts`:660-712 (`ReasonBasis`, `reasonNote`, `reasonFeedback`), 714-757
(`reasonItem`: the side line as a choice, hint), 936-943 (card 5), 961-985 (board: checks only);
`src/content/stop7/fairness.ts`:36-54. Generated item: the clay bowl story with "Nobody saw it happen." as a choice.

**Reviewer note.** Reason rows on the Do board, with `reasonCase`'s two truths, are the right fix. The "change it and see"
contrast makes "decides" something the learner can do. Other temptation lines ("has not come to look for it yet", "is too
shy to ask") map less clearly onto card 5, so include one of them on the card.

### s7-l2-two-clue-sets-one-board (P2)

**Location.** s7.l2. Do 2 "Pick the best guess", rows "Only the first two clues" and "Best guess now". Also the story quiz
items (explain-best, new-clue, revise), where every idea-and-clue judgment is held in mind.

**What the learner sees.** Board 2's picture shows all three columns, "Grass wet, Street wet, Roof dry", fully marked: rain
has a cross under Roof dry. The first row asks "Only the first two clues · Best guess?", and the answer is Rain. Story scenes
are text only: "Clue 1: … / Clue 2: … / New clue 3: … / “Nobody watered it” needs no extra things."

**What the program assumes the learner has been taught.** That the learner can mask a column they can see (work in the
two-clue world while the three-clue world is drawn), and can hold 3 ideas by 2 or 3 clues of fit judgments without a grid.

**Likely mix-up.** The learner uses the roof cross in the first row and picks Truck. That mixes "the clue set then" with "the
clue set now", the same mix the new-clue quiz item tests.

**Hidden distinction.** "The best guess for clues 1 and 2" vs "the best guess for clues 1 to 3": two test worlds on one
screen.

**Hidden steps.** 1) Cover column 3 and judge the best guess. 2) Then uncover it, test every idea again and judge again. In
story items, build the ideas-by-clues grid in your head.

**Missing prerequisite.** No banner names which clues are in play for each row. Story items have no scratch grid. The hint
shows one idea's truths, but the other two must be held in mind.

**Recommended teaching intervention.** One UI change fixes both this and s7-l2-check-before-taught: draw the roof column
dashed or grey, as "Roof dry?", during rows 1 and 2, and solid from row 3. Optionally split board 2 into two stages, each
under a test-world banner (stage 1 "Using clues: Grass wet, Street wet", with the roof column greyed and labelled "not found
yet"; stage 2 "Now also: Roof dry"), and give story items an `Item.scratch` grid (ideas by clues, extras beside each row);
DrillGrid already exists, but it needs a scratch-step generator from the case.

**Recommended UI change.** Show a test-world banner over each stage. Grey out clue columns that are not in play. On new-clue
and revise items, draw a "Then" / "Now" tag on the clue list.

**Diagnostic question.** "Which clues count for the first best guess?" Options: "Grass wet and Street wet" (right) / "All
three" / "Not sure".

**Targeted remediation.** "The first question is about the time before the roof was checked. Cover the roof column. With
only two clues, rain fits both and needs nothing extra, so rain is the best guess then. Now uncover it: rain does not fit
‘Roof dry’, so it is out now."

**How to test mastery.** Explain-new-clue items right on the first try, first with the scratch grid and then without it.

**Evidence.** `src/engine/puzzles/explanations.ts`:980-981 (`plainScene`), 1029-1119 (`bestBoard`: scene `plainScene(clues)`
with all three columns; first row "Only the first two clues"), 379-409 (`sceneOf` text for stories), 815-817 (hint shows one
idea).

**Reviewer note.** One UI change fixes both this and s7-l2-check-before-taught: draw the roof column dashed or grey, as "Roof
dry?", during rows 1 and 2, and solid from row 3. A scratch grid for story items is optional.

### s7-l2-cant-tell-vs-best-guess (P3)

**Location.** s7.l2. Card 1 "Clues need a reason" and card 4 "Example: the wet grass", set against Stop 6's s6.l2 card "Wet
grass". Also the quiz explain-best, which offers no "can’t tell" choice.

**What the learner sees.** s6.l2 "Wet grass": "The grass is wet. Did it rain? It might have. But a sprinkler could have made
the grass wet. So could a hose. So you can’t tell if it rained." s7.l2 card 1: "Ava wakes up. The grass outside is wet… Your
job is to pick the best one." Card 4: "The rain idea needs nothing extra… So the rain idea is the best guess."

**What the program assumes the learner has been taught.** That the learner keeps "what follows for sure" (Stop 6: can't
tell) apart from "which idea is the best guess so far" (this lesson), even on the very same story.

**Likely mix-up.** "Stop 6 said you can’t tell if it rained, and now rain is the answer." The learner either decides Stop 6
was wrong, or reads "best guess" as "for sure". The second makes the revise and "no check is needed" traps more tempting.

**Hidden distinction.** "Can you be sure?" (can't tell) vs "Which idea is best so far?" (best guess).

**Hidden steps.** Before answering, notice which question is asked: for sure, or best guess.

**Missing prerequisite.** No card links the two lessons. Card 5's "A best guess is not a proof" comes at the end and does not
mention Stop 6's answer.

**Recommended teaching intervention.** One sentence on card 1 is enough: "In Stop 6 you asked ‘Can you be sure it rained?’
and could not tell. Here the question is ‘Which idea is the best guess so far?’"

**Recommended UI change.** Optionally tag each prompt with its question type: "FOR SURE?" vs "BEST GUESS?".

**Diagnostic question.** "This question asks for…" Options: "what must be true" / "the best guess so far" (right) / "Not
sure".

**Targeted remediation.** "A best guess is not a ‘for sure’ answer. In Stop 6 the question was ‘Can you be sure it rained?’,
and the answer was no. Here the question is ‘Which idea is best so far?’ Rain is best for now, and a new clue can still
change it."

**How to test mastery.** A paired item: the same clues asked both ways ("Can you be sure?" / "Which is the best guess?"). Both
right on the first try.

**Evidence.** `curriculum.json` s6.l2 card "Wet grass"; `src/content/stop7/explanations.ts`:66-103 (cards 1 to 4);
`src/engine/puzzles/explanations.ts`:270-308 (`WORKED` wet grass), 631 and 648-668 (`bestItem` choices: ideas only).

**Reviewer note.** One sentence on card 1 is enough. No contrast card or declared distinction is needed, and the first
draft's "taughtIn: none" is not a valid value.

### s7-fit-and-check-mark-meanings (P3)

**Location.** s7.l1 Do 1 and 2 and its quiz ("Which word fits?", "cards that fit"), s7.l2 ("an idea fits a clue"), and the
check-mark grids of s7.l2, s7.l3 and s7.l4 with their after-a-miss case cards.

**What the learner sees.** L1 board mark label: "Which word fits?". Body: "Count the cards that fit and the ones that do not."
L1 quiz: "Read the sentence: … Which word fits it?" L2 card 2: "An idea fits a clue when the clue makes sense if the idea is
true." Grid captions: L2 "✓ means the idea fits the clue", L3 "✓ means yes. ✗ means no.", L4 "✓ passes the check." The
explanation case cards then show the L3 cells as "Switch flipped: true".

**What the program assumes the learner has been taught.** That the learner re-reads "fit" and a check mark from context each
time.

**Likely mix-up.** In L1, "a word fits the sentence" (says how sure it is) vs "a card fits the sentence" (would make it
true). Across lessons, "a card fits a sentence" vs "an idea fits a clue". In L3, a check mark ("yes, it happened") turns into
"true" in the explanation.

**Hidden distinction.** A word fits a sentence vs a card fits a sentence vs an idea fits a clue. Also a check mark meaning
happened, fits or passes vs true.

**Hidden steps.** Decode each use from context.

**Missing prerequisite.** L1 never defines "a card fits a sentence" ("Must: every one fits" on card 2 does not say fits
what). Three senses of "fit" appear within two lessons.

**Recommended teaching intervention.** L1 card 2: add "A card fits a sentence when the sentence would be true if that card
came out." Rename the board mark "How sure?" instead of "Which word fits?". For L3 Teach cases, use yes or no wording for
table cells instead of true or false.

**Recommended UI change.** Use one label per meaning. Make `CaseCard` truths say "yes" or "no" when they come from a yes-or-no
table (a wording flag on `Truth`, which would help every stop).

**Diagnostic question.** "Does the blue circle fit ‘The next card is red’?" Options: "No" (right) / "Yes" / "Not sure".

**Targeted remediation.** "Here ‘fits’ means: if this card came out, the sentence would be true. A blue card does not make
‘The next card is red’ true, so it does not fit."

**How to test mastery.** No separate check. The Do 1 color rows right on the first check is enough.

**Evidence.** `src/engine/puzzles/patterns.ts`:1008-1015 (mark label "Which word fits?"), 1040-1045 (board body), 1082-1088
(card 2); `src/content/stop7/explanations.ts`:78; `src/engine/puzzles/causes.ts`:192-209 (caption, `rowCase` truths);
`src/game/components/ExplanationPanel.tsx`:50-60 (truths drawn as true or false).

**Reviewer note.** No factual fixes. One line on L1 card 2 defining "a card fits" is enough. A wording flag on `Truth` for
yes and no would also help every stop.

### s7-rev-3 (P3)

**Location.** s7.l4 truth stories (`fairness.ts`:260-288): the Gran stories, on the Do board and in fair-choice items.

**What the learner sees.** The columns "Honest?" and "Fair to Gran?" give the same answer for every choice. "Tell" passes
both. "Hide the pieces", "Glue it" and "Blame" fail both, because hiding the truth both fails "nothing is hidden" and means
Gran does not "hear the truth".

**What the program assumes the learner has been taught.** That the three checks are three different questions.

**Likely mix-up.** The learner cannot see what the middle check adds in these stories, which blurs "fair" further (see
s7-l4-fair-check-vs-fair-choice).

**Hidden distinction.** Honest (no lie and nothing hidden) vs the middle check (the other person gets what they are owed).

**Hidden steps.** Ask each check by its own test.

**Missing prerequisite.** No truth-story choice passes one of the two checks and fails the other.

**Recommended teaching intervention.** Give the middle check a different test in truth stories, for example "Gets a sorry and
help to fix it?", so that "Glue it, tell no one" fails Honest while passing a repair-based middle check, or the reverse. Or
add one truth-story choice where the two checks differ.

**Recommended UI change.** Name the middle column by its test (see s7-l4-fair-check-vs-fair-choice).

**Diagnostic question.** "‘Glue it back together and tell no one.’ Is that honest?" Options: "No, something is hidden"
(right) / "Yes, it is fixed" / "Not sure".

**Targeted remediation.** "Each check asks its own question. Honest asks: is anything hidden? The middle check asks: does Gran
get what she is owed? A choice can pass one and fail the other."

**How to test mastery.** A truth-story choice where the two checks differ, marked right on the first check.

**Evidence.** `src/engine/puzzles/fairness.ts`:260-288 (truth stories), 142-153 (`fairTo` labels).

**Reviewer note.** This was a reviewer's extra finding.

## The steps for each lesson

For each lesson (or each kind of quiz item where a lesson has several), this is the full chain of steps a learner has to
carry out, and where the program teaches each step. "Nowhere" means the step is assumed.

### Stop 1: True or False?

#### s1.l1 What is a statement?

**Steps.**
1. Read the sentence.
2. Sort its kind: does it ask (question), tell someone to do something (command), show a feeling (exclamation), say what
   someone likes (opinion), or say something about the world?
3. If it is about the world, ask "Is there a right answer, even if nobody here can check it?" True, false or can't check
   all mean a statement.
4. If it may be taste, ask "If two people disagree, must one of them be wrong?" No means an opinion, so not a statement.
5. Decide: A statement or Not a statement.
6. For "Which of these…": do steps 1 to 5 for every choice, then pick the odd one; for "…is not a statement?", flip it.

**Where each step is taught.** Step 2: card 3 "Not statements", card 4 "Opinions", and the Do board (false, question,
opinion). Step 3: only card 5 "You don’t need the answer", in words. No can't-check sentence appears on the sorted example
or the Do board, and the first card's why line ("ask if it can be checked") and the s1.statement real-life line teach the
opposite. Step 4: not taught as a test. Card 4 states the convention; the Ann and Ben test is only in "Explain more simply"
after a miss. The one stated test, "Could this sentence be true or false?", does not separate opinions or questions. Step 6:
no card or board; first met at quiz try 5.

#### s1.l2 True, false or can’t tell

**Steps.**
1. Read the sentence; find its kind ("There is …" or "Every card is …") and every feature it names (color, shape, size; "a
   small red circle" means one card with all three).
2. Number the cards from the left; note which are face down.
3. "There is": look for a face-up card with every named feature. Found: True.
4. "Every": look for a face-up card missing a feature. Found: False.
5. Otherwise, imagine the face-down card or cards one way that makes it true and one way that makes it false.
6. Both ways possible: Can't tell. Only one: that answer.
7. Ignore who says it (Maya, the wizard): judge only what you can see. (Size means the size of the shape on the card.)

**Where each step is taught.** Steps 2 to 6: cards 1 to 5 ("Check the picture", "Face-down cards", "Can’t tell yet",
"Sometimes you can tell", "Try every way") and both Do boards. The second board is a twin showing that "every" includes the
face-down card. All sentences there name one feature. Step 1's "same card" part: nowhere, though the quiz asks multi-feature
sentences. That "There is" means one or more: only in the Teach after a miss. Step 7: nowhere, since speaker frames first
appear in the quiz. Big and small as the size of the shape: never shown.

#### s1.l3 The NOT flip

**Steps.**
1. Read the statement.
2. List every way it can be false (one card that is not …; a tie; exactly k; more or fewer).
3. Form the sentence true in exactly those ways (put "It is not true that" in front, then rewrite it without moving the not
   inside; mind the group order in "at least as many").
4. For each choice, picture test rows (all fit, some fit, none fit; a tie; exactly k, one more, one fewer).
5. In each row, mark the statement and the choice True or False.
6. Reject the choice at the first row where they agree.
7. Pick the choice that disagrees in every row.

**Where each step is taught.** Steps 2 and 3: cards 1 to 5. The "not inside" and the group order appear only in wrong-pick
feedback, and card 3 calls the NOT "the real opposite" after card 1 warns against "opposite". Steps 4 to 6: card 6 "Check
your NOT" states them, but both Do boards check one given row only. Every wrong option there agrees on that row, so
"opposite truth value here" also solves them. Making up test rows is never practised, and the quiz shows no cards.

#### s1.l4 Treasure signs

**Steps.**
1. Read the rule and turn it into a need (exactly 1 true sign).
2. Pick a chest and pretend the treasure is there (the test).
3. For each sign, resolve "this chest" to the chest it is on.
4. Translate the sign into a claim (in, or not in, which chest).
5. Compare the claim with the test only (not with the rule, not with a guess about the real place).
6. Stamp True or False.
7. Count the True stamps.
8. Compare the count with the rule's need.
9. Keep or reject (a test that breaks the always-right rule can't be the real place).
10. Repeat for every chest.
11. Conclude: the one kept chest has the treasure, and answer.

**Where each step is taught.** Steps 1 to 8 and 10: cards 1 and 2, the contrast card "Two different things" with the "Stamp
the two signs" board, the walk cards (because rows), the Do board and twin board (full scaffold: steps strip, compare facts,
the need by the count) and the cave board (light). The fix covers treasure vs sign. Step 5's "not with the rule" is never
named, and no pattern catches stamps bent to fit the rule. Step 9's reason is never stated. Step 11 is stated on the last
walk card. After a quiz miss the full board does not come back.

#### s1.l5 Every sign is false

**Steps.** As s1.l4, with: step 1, translate "Every sign is false" into "0 true signs"; steps 5 and 6, stamp from the words
even though the rule says every sign is false (a True stamp is allowed in a test and just means reject); step 8, keep only a
count of 0.

**Where each step is taught.** Cards "A new rule" ("The number of true signs is 0") and "The same check", the reminder card,
the walk and the Do board (full). Not stamping False because the rule says so is not taught. The reminder ("the chest with
the treasure has a false sign too. Every sign does") pushes toward it. On the Do board's Gold case all three signs are truly
True, and all-False stamps get the treasure-vs-sign (own-true) diagnosis instead.

#### s1.l6 Exactly two signs are true

**Steps.** As s1.l4, with the need "exactly 2 true signs": stamp all three signs and count to the end (3 does not fit; 1
does not fit).

**Where each step is taught.** Cards "A new rule" ("“Exactly two” means 2, no more and no fewer. Three true signs do not
fit.") and "The same check", the reminder, the walk and the Do board (full). Taught. Only the shared rule-vs-stamp and
scaffold-after-a-miss gaps from s1.l4 apply.

#### s1.l7 The owner’s sign

**Steps.**
1. Read the rule as two parts: the treasure chest's own sign is true; the other two are false.
2. Pick a chest (the test).
3. Stamp every sign from its words, not from the rule.
4. Check part 1: is the picked chest's OWN stamp True?
5. Check part 2: are BOTH other stamps False? (Which signs are true, not how many.)
6. Keep only if both parts hold; otherwise reject.
7. Repeat for every chest; conclude.

**Where each step is taught.** Steps 1 and 4 to 6: cards "A new rule" ("Counting is not enough here") and "Check two
things". Step 3 is contradicted on screen: the reminder card says "The chest with the treasure can have a false sign", and
the board's test-world note says "Where the treasure is does not say if a sign is true", right under a rule saying the
treasure chest's sign is true. Step 5 is undercut by the board's steps strip ("Count the True stamps", then "Compare the
count with the rule") and the verdict-only diagnosis ("The rule says how many signs must be true").

### Stop 2: NOT, AND, OR

#### s2.l1 NOT: everything else

**Steps.**
1. Read the rule and find the word after NOT (for example "blue").
2. Name its kind (color, shape or size) and recall every value of that kind (red, blue, yellow).
3. For one card, ask the feature question "Is it blue?" (look only at that kind; shape and size do not matter).
4. Flip: yes means NOT leaves it out; no means NOT takes it.
5. Mark it (Fits or Not, tap, or count).
6. Repeat for every card.
7. Check that every other value got in, not just one other color.
8. By item: count items count the cards taken (or count the blue ones and take them away from the total); "which cards"
   items name the values left over as groups, with no cards to look at; story items first translate "Jo packs every cookie
   that is NOT blue, and no other cookies" into "which cards fit NOT blue".

**Where each step is taught.** Features and values: card 1 "Every card has three features". In and out marks: card 2 "Sort
by one feature". Everything else, not one other color: card 3, board s2.l1-do and its done line ("NOT is everything else,
not one other color"). Shape and size: card 4 and board s2.l1-do-shape. Ask-then-flip for each card: card 5 "Check one card
at a time", in words only; on both boards the ask step is folded into one Fits or Not tap and appears only in the wrong-mark
words. NOT as a truth flip ("flip the part after it. True becomes false"): Stop 1 s1.l3, and `T_NOT` shown only after a
wrong answer. "Fits" means true for this card: only `fitsTerm`, after a wrong answer. Counting by taking away: hint and
explanation only. Story translation ("and no other cookies"): not taught.

#### s2.l2 AND needs both parts

**Steps.**
1. Read the rule.
2. Split it at the capital AND into two parts (two features of one card).
3. Tell the rule's AND apart from a list's "and" (the story sentence has both: "…a circle AND blue, and no other shields").
4. For one card, check part 1 (yes or no).
5. Check part 2 on the same card.
6. Combine: the card fits only if both are yes.
7. Mark or tap.
8. Repeat for every card.
9. Count items: count only the cards with two yeses. Pick items: compare the four kinds of card (both, first only, second
   only, neither) and choose the card with both.

**Where each step is taught.** Two parts: card 1 "AND joins two parts". Both must fit, with a marked deck: card 2, and board
s2.l2-do. Smaller group: card 3 (a claim only). Check each part: card 4, in words; the board hides the two checks inside one
Fits or Not tap. Rule AND vs list "and": not taught (L1 feedback already uses "The red cards and blue cards fit" to mean two
groups). Four kinds of card: only as Teach cases after a wrong answer; taught on cards later, in s5.l5 "List the cases" and
s6.l4 "How to test".

#### s2.l3 OR: one part or both parts

**Steps.**
1. Read the rule.
2. Split it at OR.
3. For one card, check part 1.
4. Check part 2.
5. Combine: the card fits if at least one is yes, and a card with two yeses fits too (logic OR, not everyday "pick one").
6. Mark, tap, or answer yes or no.
7. "Which does not fit" items: find the card with no yes (the question's small "not" is about the answer, not the rule).
8. Count items: count each fitting card once (a card that fits both parts is one card, not two).

**Where each step is taught.** OR joins two parts: card 1. A card that fits both parts fits: card 2 (marked deck), the done
line of board s2.l3-do, and card 3 "Everyday OR can be different". Bigger group: card 4. At least one: card 5. The question's
"not" vs the rule's NOT: ChoiceFeedback only ("The question asks for the card that does not fit"). Count each card once: not
taught (only the or-count real-life line).

#### s2.l4 Brackets matter

**Steps.**
1. Read the rule.
2. Find what each NOT covers (with a bracket, everything inside; with no bracket, only the next word).
3. Inside first: for one card, check each part inside.
4. Combine the inside parts with their own AND or OR: the card fits the inside or not.
5. Flip with NOT (fits the inside means does not fit the rule; does not fit the inside means fits).
6. Mark or tap.
7. For NOT red AND NOT big: flip each part on its own, then AND them; for NOT red OR NOT big: flip each part, then OR them.
8. Same-meaning items (no cards shown): imagine one card of every kind (both parts, only the first, only the second,
   neither), work out the question's rule and each choice on each kind, and reject any choice that disagrees on even one
   kind. Or apply the switch: a NOT on each part AND swap AND and OR, both at once.

**Where each step is taught.** Brackets first: card 1. NOT (A AND B) as "every card but the inside group": card 2 and board
s2.l4-do row 1. A NOT on each part: card 3 and row 2 (the two rows form a real contrast, and the done line names the cards
that changed). NOT (A OR B): card 4 and board s2.l4-do-or. The switch: card 5 and board s2.l4-do-switch. What a NOT covers:
never stated (shown only by card 3's example). The inside's result as its own step: in words only ("First find the cards
that…"), never drawn or marked. For each card, "the inside is false, NOT flips it to true": explanations only. Every kind of
card, and why six cards are enough: in the Teach after a miss only (s5.l5 and s6.l4 teach it later). Why AND turns into OR:
only in the `bracketTeach` meaning after a miss.

#### s2.l5 Guess the rule

**Steps.**
1. Read each card's machine mark (got through, or stopped).
2. Pick one rule to test.
3. For one card, work out the rule (Fits or Not: the whole Lesson 1 to 4 chain).
4. Compare that with the card's mark: yes plus Fits, or no plus Not, is a match; yes plus Not, or no plus Fits, is no
   match.
5. If any card does not match, rule it out (one card is enough).
6. If every card matches, keep it (still possible, not proved).
7. Repeat for each of the three choices, keeping track of which are ruled out.
8. Answer the one choice left, because the secret rule is one of the choices.

**Where each step is taught.** Machine marks: card 1. Testing a rule (every yes card must fit, every no card must not): card
2. One card rules a rule out: card 3. Worked example: card 4 and board s2.l5-do (one rule: Fits or Not, then Keep or Rule
out). Step 4, the comparison for each card, and the "no plus Not is a match" case: in words only on card 2, never shown card
by card. The only shown row tests the one rule whose Fits or Not equals every mark, and card 4 and the quiz explanation call
matching "fits every card". A stopped card that the rule fits: never modelled. Kept vs proved: not taught (s7.l1 "A good
guess is not a proof"). Tracking three rules: not drilled (the board tests one).

### Stop 3: Line Up

#### s3.l1 Chains (quiz: "Who is the tallest or shortest?", "Which letter is at the left end?"; a name or Can’t tell)

**Steps.**
1. Read the question and decide which end it asks about: first (tallest, longest wings, front, left end, finished first)
   or last.
2. Translate each clue in the skin's words into "X is ahead of Y" (taller than, has longer wings than, is somewhere in
   front of, is somewhere to the left of, finished before).
3. For each clue, cross out the person on the wrong side: asked first, the one behind; asked last, the one ahead (the
   direction flips).
4. Count who is left.
5. One left: that person. A chain proves it even when no clue names that pair.
6. Two or more left: check that no chain links them (a fork, where both are taller than the same person, or two separate
   chains).
7. Answer Can't tell.

(Board only: place a whole chain in spots, compare two people, notice a person no clue names.)

**Where each step is taught.** Step 2: only "taller than" and races are on L1 cards. "Somewhere in front of" and "to the left
of" first appear in s3.l2 card "Other words, same idea", but the L1 quiz uses them. Steps 3 and 4: card "Who is first or
last?" (words only, no picture). The board asks decided first and last questions (the tallest and the shortest on row
"chain"), but never practises the crossing-out step itself, and the flip for the last end is never practised as a step
before quiz tries 3 and 4 (about 35 percent ask for the last end). Step 5: card "Follow the chain" (line picture), board
rows "card" and "chain". Steps 6 and 7: card "When you can’t tell" (the fork, a clue list only). The board's can't-tell row
is a different shape (Ben is in no clue). The fork and the chain are never put side by side. "Can’t tell" is from s1.l2.

#### s3.l2 Before vs right before (quiz: must, might or can't be true)

**Steps.**
1. Keep the sentence apart from the clues: the clues are given as true, and the sentence is only tested.
2. Translate words: before means anywhere earlier; right before means one place earlier, with no one between, and the
   direction matters. Use the skin's other words too.
3. List every order of the 3 or 4 people (6 or 24), or build the possible orders from the clues.
4. Test each order against every clue. Keep only orders where every clue is true (orders that fit).
5. Check the sentence in each kept order.
6. Tally: true in all, some or none.
7. Map: all means Must be true; some but not all means Might be true (this lesson's "can't tell"); none means Can't be
   true. Shortcut: search for one fitting order that makes the sentence false and one that makes it true.

**Where each step is taught.** Step 2: cards "Before" (line picture), "Right before", "Other words, same idea". Board
s3.l2-do marks both sentences in three orders. Step 1: nowhere. "Sentence" first appears on card "Must, might, can’t" with no
definition. Step 3: nowhere. Card "One clue, three orders" lists the three orders but not why they are all of them. Board
s3.l2-do gives the orders. s3.l2-do2 states the count ("Two orders fit the clue"). Step 4: board s3.l2-do2 ("Does this order
fit?"). "Fits means every clue true" is only in a wrong-mark message and in Teach. Steps 5 to 7: card "Must, might, can’t"
and both boards' status rows. On both boards, leaving out the order that does not fit never changes an answer. The bridge to
s1.l2 True, False and Can't tell is missing. The search shortcut is only in `Teach.remember`, after a miss.

#### s3.l3 Not first, not last, next to, between (quiz: "Where is X?" gives a spot or Can’t tell; "Who is in spot k?" gives a name or Can’t tell)

**Steps.**
1. Read the question shape: where is X means try X in each spot; who is in spot k means try each person in spot k.
2. Translate each clue. Not first and not last rule out one spot. Next to, or in a race "No one finished between A and B",
   means side by side, in either order. "C somewhere between A and B" means one of them is ahead of C and the other behind,
   and others may also be between.
3. For one spot, pin X there.
4. Arrange the others to try to keep every clue true.
5. Mark each clue true or false for that line.
6. If a clue breaks, move the others (not X) and check again.
7. Cross out the spot only when no arrangement keeps every clue true. Otherwise keep it.
8. Count the spots (or people) kept: one is the answer; more means Can't tell.

**Where each step is taught.** Step 2: cards "Not first, not last", "Next to", "Between" and their boards, all with 3
runners. "Somewhere between" with 4 runners is never shown. "No one finished between" and "somewhere between" are never
contrasted. Steps 3, 5, 7 and 8: card "Try each spot" and boards s3.l3-do, do2 and do3, where the engine always supplies one
line for each try (`trialRow` uses `closest()`). Steps 4 and 6 (arrange, then move the others before crossing out) are taught
nowhere. On s3.l3-do and do2 the spot alone decides; on s3.l3-do3 the arrangement matters, but `closest()` hides the line
that breaks the clue. s3.l4 card "Test and fix" ("move someone and check again") comes a lesson later and is about building.

#### s3.l4 Build the whole line (quiz: place 3, then 4, then 5 people)

**Steps.**
1. Read all the clues.
2. Find a sure placement: a clue that puts someone in a spot (first, last, second), not a "not first" or "not last" clue.
   If there is none, find who no one is ahead of (L1 crossing out, which works only for "before" clues), or a deduction such
   as: someone next to two people stands between them.
3. Place that person.
4. Join pairs that must stand together (right before, next to) into blocks.
5. Use before and between clues to order the rest.
6. Fill the line.
7. Test every clue (live ticks in learn mode).
8. Fix: move someone named in a broken clue and test again.
9. Check.

**Where each step is taught.** Step 2 (spot clue only): card "Start with sure things". Its wording ("names a spot, like
first or last") also matches "not last" clues. Steps 3 and 6 to 8: cards "A worked example" and "Test and fix", boards
s3.l4-do (test a line) and s3.l4-do2 (3 runners with a spot clue). A strategy with no spot clue (about 68 percent of tries 2
and 3), blocks of pairs, and combining two next-to clues: taught nowhere. The boards never use 4 or 5 people or mixed clue
kinds.

#### s3.l5 Which clue wasn’t needed? (quiz: pick the clue that is not needed)

**Steps.**
1. Find the one order the clues give (the L4 skill).
2. For each clue, cover it: it does not count for this test (it is not false).
3. Search for a second order that fits all the other clues.
4. Found: the clue is needed. None: not needed.
5. Put the clue back and test the next one. Shortcut: ask whether the other clues prove this clue, through a chain or one
   stronger clue (for example "Odo finished first" proves "Odo finished before Wren"). That is s3.l2's "must be true".
6. Choose the clue that is not needed.

**Where each step is taught.** Steps 2 to 4: cards "How to test a clue" and "An example" (a chain only), board s3.l5-do. The
board offers the candidate second orders as options, so the learner never has to come up with one. Covering is never drawn:
the clue list stays the same. The quiz hint lists the covered clue as "false". The shortcut: card "Extra clues" ("The other
clues already prove it"), shown only with a chain. A clue made redundant by one stronger clue (about half of tries 2 and 3)
is never shown. The link to "must be true" is never made. That the clue not needed is still true is never said.

### Stop 4: Grid Detective

#### s4.l1 quiz: "A clue says: … Which box gets a ✓ (or ✗) from this clue?" (`markPuzzle`)

**Steps.**
1. Read the setting ("each have a different pet": one check mark per row and per column).
2. Read the clue.
3. Sort it: has, does not have, or "or".
4. For has or not: find the named person's row, then the named thing's column.
5. Meet: the box where they cross, named "P – thing".
6. Mark a check (has) or a cross (not).
7. For "or": list every thing in the setting, find the one the clue leaves out; that box in the person's row gets the cross,
   and the two named stay empty.
8. Match the box to its name among the choices.

**Where each step is taught.** Row, column and box: card "What a logic grid is". Check, cross and empty: card "✓ means yes,
✗ means no". Clue to mark where row meets column: card "Turn clues into marks". One each: card "One each". The left-out
choice: card "“Or” clues". Practised on `L1_GRID` and `L1_OR`. Not taught: the box name "P – thing" (first used on "One each"
with no definition); how the Hint's could and must lines map to a mark; that every clue is true.

#### s4.l1 boards: `L1_GRID` "Mark Leo’s row" and `L1_OR` "One clue at a time"

**Steps.**
1. Read the row label ("Only clue: …").
2. Forget the other rows' clues and the picture's marks.
3. Sort the clue.
4. For each of the three boxes: a check if the clue says has; a cross if the clue says not, if an "or" leaves it out, or if
   the row already has a check (one pet each); otherwise Can't tell yet (it stays empty).
5. Start the next row fresh.

(`L1_GRID`: mark clue 2's cross, count what is left in Leo's row, and the last box gets the check.)

**Where each step is taught.** Board bodies ("Each row below has one clue by itself… Can’t tell yet means the box stays
empty") and cards 2, 4 and 5. The row's world is signalled only by label words. Empty vs a cross is one line on card 2 and is
never contrasted.

#### s4.l2 quiz: "Who must have the X?" or "Which X must P have?" (`onlyOnePuzzle`: decided and Can’t tell yet)

**Steps.**
1. Read the question.
2. Translate it to a line (who means the thing's column; which X must P have means P's row).
3. Look only at that line (a cross in another column of a kid's row, or in another kid's row, does not count).
4. Count the empty boxes.
5. One: that box gets the check, so name its kid or thing.
6. Two or more: check the other rows and columns for a cross that rules one out.
7. None: Can't tell yet.

**Where each step is taught.** Cards "The last box in a row", "The last box in a column", "Not so fast" and "Count the empty
boxes". The `L2_COUNT` board counts lines it names for you. Not taught before the quiz: question to line (only Hint and
`Teach.meaning`); crosses outside the line (only after-miss feedback for columns, and not at all for rows, though every
can't-tell item contains one); "check the other marks" (stated, never practised; the board's done line says "Two or more:
you can’t tell yet"). Can't tell as "more than one way fits" is partly in s1.l2 "Try every way" and s3.l1 "Trust only the
clues".

#### s4.l3 quiz: "P has X, so P – X gets a ✓. Choose every box that must now get a ✗." (`spreadPuzzle`; column items have the row already crossed out)

**Steps.**
1. Read the given check mark.
2. Row: every other box in P's row gets a cross (P has just one).
3. Column: every other box in X's column gets a cross (only one kid can have X).
4. Outside: boxes in neither stay empty.
5. Pick every row and column box among the choices (column items: only the column is left).

**Where each step is taught.** Fully taught: cards "A ✓ fills its row", "A ✓ fills its column too" and "Don’t forget the
column", plus the `L3_SPREAD` board (row shown, then the column, then the outside boxes).

#### s4.l3 quiz: "Use the clues to fill in the grid." (`gridPuzzle`, one part; also check c1)

**Steps.**
1. Read the setting.
2. Put in each clue's mark (has gives a check, not gives a cross, "or" gives a cross on the one left out).
3. Spread every check along its row and down its column.
4. Scan every row and column for one empty box; give it a check.
5. Spread it.
6. Repeat until every row has one check.
7. Check that every clue is true in the grid.
8. Check.

**Where each step is taught.** Cards "Spread, then look again" and "Solve a whole grid". `L3_FINISH` (from given marks, with
has and not clues only). Step 7 is only in `Teach.remember` after a miss. The method is not on screen in the quiz. "Or"
clues inside a full grid are first met in the quiz.

#### s4.l4 quiz: "The grid shows the pets. Clue: … Who must eat popcorn?" (`linkPuzzle`: a link, two "not" clues, one "not" link)

**Steps.**
1. Read the setting (two categories; one is shown).
2. Read the clue.
3. Split it into its two choices.
4. Find which one the grid shows.
5. Follow that column to its check: that kid is "the kid with the dog".
6. A link: that kid gets the other choice, and the others can't (one each). A "not" link: that kid can't, and the others are
   still possible.
7. Two clues: cross each kid out for this thing.
8. Count who could still: one is that kid; two means Can't tell yet.

**Where each step is taught.** Cards "A linking clue", "Use what you know" and "A “not” link"; boards `L4_LINK` and `L4_NOT`.
That a cross carries through a link but not through a "not" link is never contrasted. The link forms of other skins ("The
cook is silver") are never shown on a card. The asked column is not drawn in the quiz, so step 7 is held in memory.

#### s4.l4 quiz: "Use the clues to fill in the grid." (`gridPuzzle`, two parts; also check c6)

**Steps.**
1. Read the setting (each kid gets one of each; the same rows run through both parts).
2. Put in clue marks in both parts.
3. Spread, and only one left, in each part.
4. For each linking clue: look for a check or cross in either named column.
5. Carry it to the same kid in the other part (a link carries a check as a check and a cross as a cross; a "not" link turns
   a check into a cross only), reading from either end.
6. After every new mark: switch parts and read the links again.
7. Repeat.
8. Check every clue.

**Where each step is taught.** Cards "Two parts to the grid" (no picture), "Use what you know" and "Links work both ways".
Boards `L4_LINK` and `L4_BACK` always start from a fully known part. The back-and-forth loop and reading the links again first
appear in s4.l5 "Stuck? Read again", after L4's quiz. The Hint mentions carrying.

#### s4.l5 quiz: "Which clue, all by itself, proves that P does not have X?" (`proofPuzzle`; also check c8)

**Steps.**
1. Read the target (a cross in P – X).
2. For each clue: pretend it is the only clue (cover the others; the one-each rules stay on).
3. Mark what it gives.
4. Spread.
5. Look at P – X: a cross means this clue proves it; a check or empty means it does not.
6. Pick the one clue that proves it (a clue that only names P or X is not enough).

**Where each step is taught.** Cards "Every mark needs a reason" and "One clue can prove a lot"; `L5_PROOF` ("With only that
clue, could Leo still have the dog?", with the tempting "Leo has the dog or the fish" row). Only implied: that "could" covers
a check or an empty box, and that No means the clue proves the cross. That the rules stay on is shown by the given row on
the board.

#### s4.l5 quiz: "Use only clues 1 and 2. Can you tell who has the X yet?" (`enoughPuzzle`; also check c9)

**Steps.**
1. Read "Use only clues 1 and 2".
2. Cover clue 3 and any later clues.
3. Put in marks from clues 1 and 2 (in your head: no grid is shown).
4. Spread, and only one left, chaining as needed.
5. For each kid: could they have X?
6. Count who could: one means Yes; two or more means Can't tell yet.

**Where each step is taught.** Cards "Can you tell yet?" and "Use only the clues you are told"; the `L5_ENOUGH` board (could
for each kid, then how many); cover-a-clue in s3.l5 (in words). The "clues 1 and 2 only" world and the marks worked out are
never on screen: no covered clue, no grid, no thinking board. A bare "Yes" is accepted without naming who.

### Stop 5: Knights & Knaves

#### s5.l1 Truth-tellers and liars

**Steps, board do1 (a fact is known, a kind is tested).**
1. Read what is so (the banner "What is true · The well is full") and the kind tested in this row.
2. Read the speaker's words.
3. Translate them into a claim about the world (watch NOT: "The well is not full" claims it is not full).
4. Compare the claim with what is so, not with the kind.
5. Label the words True or False.
6. Look up what the kind needs (a knight: true; a knave: false).
7. Compare the label with the need.
8. Decide Holds or Crashes.
9. Conclude (never said): a crash means that kind is impossible, so the speaker is the other kind.

**Steps, board do2 (nothing known, Cal swims).** 1) List the 4 cases (kind by fact). 2) Steps 2 to 8 above for each case.
3) Collect the cases that hold. 4) Compare their answers: the same means that answer; different means Can't tell.

**Steps, board do3 (words about others).** 1) Find the speaker (Dee) and who the words are about (Eli). 2) In each case
look up Eli's kind. 3) Compare with "Eli is a knave". 4) Label. 5) Need from Dee's kind. 6) Holds or Crashes. 7) Collect the
cases that hold. 8) Answer the question asked.

**Steps, quiz (`wordsItem`).** 1) Sort the facts (a stated kind, a stated fact, another's stated kind) from the unknowns.
2) Find what is asked (the fact, the other's kind, the speaker's kind). 3) Either reason from a known kind (the words must be
true or false, then the NOT flip, then the fact), or list the cases for the unknowns and run do1's steps 2 to 8 on each.
4) Keep the cases that hold. 5) They agree: answer; they disagree: Can't tell.

**Where each step is taught.** Kind, rule and fits: card 1. Reasoning from a stated kind: cards 2 and 3 (as facts). NOT:
card 3 and s1.l3. Case, holds and crashes: card 4, once, in prose, with "given". Step 4 (compare with the world, not the
kind): card 4 prose and the wrong-mark why on the boards only. The split between step 4 (truth from the world) and step 6
(the need from the kind): taught nowhere; card 5 models taking the truth from a tested kind. Step 9: not in L1; first in
s5.l3 card 3. Can't tell: card 5 and s1.l2, but card 5 names only one of the two unknowns behind do2's four cases. Speaker
vs the one spoken about: card 6 prose only; the board draws only Dee. Facts vs tests (quiz step 1): taught nowhere; "given"
is used for tests. No distinctions, contrast, misconceptions, confused questions, compare rows or scaffold anywhere in the
lesson.

#### s5.l2 What nobody can say

**Steps (boards do1 and do2, and the quiz: who could say it).**
1. Read the words and any given partner kind ("Ben is a knave").
2. Pretend a knight says them.
3. Replace "I" with that knight.
4. Compare the claim with the pretend world: the words would be True or False.
5. Need: a knight needs true.
6. Match: could a knight say it? Yes or No.
7. Repeat steps 2 to 6 for a knave (needs false).
8. Combine: Yes and No means Only a knight; No and Yes means Only a knave; Yes and Yes means Either kind; No and No means No
   one.

For an always-true or always-false sentence ("Two plus two is four"), step 4 does not depend on the speaker.

**Where each step is taught.** Pretend each kind: card 1, but it states only the need, as "The words must be true or
false", which reads like the result. Would-be truth: cards 2, 3 and 5, in prose. Step 3: never said. Steps 4 to 6 as
separate steps (would be vs needs): never named; the Teach "Step 1: pretend a knight says it…" appears only after a miss.
Step 8: card 4 and Teach terms ("Either kind", "No one") after a miss. The boards drill steps 2 to 7 for partner sentences
only; "I am a knight" and "I am a knave" are shown only on cards 2 and 3. Kind vs truth is not reminded.

#### s5.l3 Suppose it, then crash-test it

**Steps, suppose question.**
1. Note who is supposed (X) and who is asked about (Y).
2. Fix the guess as a test world.
3. List the two cases for Y.
4. For each case and each speaker: translate the words ("I" is the speaker), compare with who is what in this case, label
   True or False, take the need from that speaker's kind, and match: fits or breaks.
5. A case holds only if every speaker fits.
6. Count the cases that hold.
7. One: Y is that kind. Two: Can't tell. None: the guess crashes (X is the other kind).
8. Answer about Y, or about the guess.

**Steps, puzzle (follow method).**
1. Pick an islander and a kind.
2. Need: that islander's words must be true or false.
3. Translate what that forces (the NOT flip when false): a kind inside the guess.
4. Next speaker: the need from the derived kind vs the words worked out in the guess world.
5. A mismatch: crash. Throw away everything inside the guess. The picked islander is the other kind (known).
6. Follow again from known kinds.
7. If the guess holds instead: place everyone and check.
8. Final check: each islander fits.
9. Mark the toggles.

**Where each step is taught.** Suppose: card 2. Crash: card 3. A worked follow: card 4. List the two cases and the three
outcomes: card 5 (text only, after the example). Board do1 lists all four cases with the card's guess shown; do2 is a guess
where two cases hold. Not taught: guess vs case kept apart (the board says "the first row is the guess"); throwing away
inside-guess findings (step 5); must be vs worked out (steps 2 and 4; explanations use "are" for both); the NOT step when
following; what to do when a guess holds (step 7; every model guess crashes); answering about Y, not X (suppose step 8);
"every speaker must fit" before the first two-speaker board (suppose step 5). No list of steps, MethodSteps, scaffold,
`workFirst` or scratch on any quiz.

#### s5.l4 Three islanders

**Steps, strong-clue board.**
1. Read "us" as Ava, Ben and Cal.
2. In each case count the knaves, Ava included.
3. Compare with "at least one".
4. Label.
5. Need from Ava's kind.
6. Holds or Crashes.
7. Generalize: with Ava a knave the words are true whatever Ben and Cal are, so every case with Ava a knave crashes.
8. Conclude Ava is a knight, and translate her true words: at least one of Ben and Cal is a knave. Silent islanders fit
   either way.

**Steps, check-your-answer board.** For each islander: the words true or false in this case, the need, the match. One
breaker means a crash.

**Steps, puzzle.** The L3 follow chain with three islanders (up to two derived kinds), counting words ("exactly one of us",
"we are all knaves"), throwing away on a crash (every kind may flip), and a final check of all three.

**Where each step is taught.** "Us": cards 2 and 3, board do1 and its wrong-mark why ("Ava counts too"). Silent islanders:
the do1 body. Check your answer: card 5 and do2. A worked follow: card 4 (Ben and Cal both flip, never pointed out). Not
taught: "we" on a card (Teach only); "exactly k" counts on a board; step 7's generalization (do1 shows 2 of the 4 cases with
Ava a knave, but the done line says every one crashes); card 2 calls a guess about one islander "that case"; no scratch space
or test-world banner for 8 cases.

#### s5.l5 When a knave says “and” or “or”

**Steps, and-or question.**
1. Read the speaker's stated kind.
2. Need (a knave: false).
3. List the four cases for the two others.
4. In each case split the sentence into parts, label each part, combine ("and": every part true; "or": at least one part
   true), label the whole.
5. Compare with the need: Keep or Cross out.
6. Read what is left.
7. Pick the choice that allows exactly those cases.

**Steps, puzzle with "I".** 1) Split. 2) Replace "I" with the speaker. 3) In each case label each part from the right
person's kind. 4) Combine into the whole. 5) Need from the speaker's kind. 6) Holds or Crashes. 7) The one case that holds (a
knave may say a true part).

**Where each step is taught.** And and or under a knave: cards 1 and 2 (and s2.l2 to l4); card 1 says the rule checks the
whole "and" sentence. Inclusive "or": card 3 and s2.l3. List the cases: card 4. Keep or cross boards: do1 and do2. "I" in an
"and": card 5 and do3. Not taught: that "I am a knave" can be one part of a knave's sentence (against L2's "no one can say I
am a knave" and L1's "Every sentence a knave says is false"); the "I … or …" and "A and I are both knaves" forms that the
quiz pool uses; Keep is not True for a knave (step 5); what "says exactly what you know" means (step 7, only modelled in
done lines).

### Stop 6: If… then

#### s6.l1 When is a rule broken?

**Steps.**
1. Read the rule; find its IF part (the words after "if") and THEN part (the words after "then").
2. For one case, translate its words into two facts about those parts ("left some veggies" means the THEN part did not
   happen; "B" means no vowel; "7" means odd, which is not even; "P is true" means the IF part happened).
3. Ask: did the IF part happen? If no, the rule asks nothing: kept, whatever the THEN part.
4. If yes, ask: did the THEN part happen? Yes means kept; no means broken.
5. Who-broke: repeat for all four choices and pick the one broken case. Did-break: answer yes or no.
6. On the grid: read each box as one kind of kid (row fact plus column fact) and mark a check for kept, a cross for broken;
   a row may hold two checks.

**Where each step is taught.** Step 1: card "Two parts". Step 2: dessert words on cards 2 to 5, and the letters note on the
rule card ("An odd number is a number that is not even."). P and Q are never taught on any card or board in Stops 1 to 6.
Step 3: card "When the IF part does not happen". Step 4: card "The one way to break it". Step 5: quiz only; the hint shows
one checked case. Step 6: card "Four kinds of kids" (grid shown) and boards s6.l1-do and s6.l1-do-hat; the change from Stop
4's "a check mark means yes, one per row" is not named. The one-way vs both-ways ("deal") contrast is given only in words
(card "THEN without IF is fine").

#### s6.l2 Turning it around

**Steps.**
1. Read the rule and notice the premise: it is always true in this story.
2. Read the fact; name its part (IF or THEN) and that it happened.
3. List the two cases that fit the fact (that part fixed; the other part happened or not).
4. For each case, apply the Lesson 1 test: kept or broken.
5. Cross out a case that breaks the rule: it can't happen here.
6. For each case left, mark the asked sentence true or false in it.
7. Read across: true in every case left means True for sure; false in every case left means False for sure; true in one and
   false in another means Can't tell.
8. Answer.

**Where each step is taught.** Step 1: only the scene line "In this story, the rule is always true." or "Every kid follows
this rule.", and it is missing on the first L2 board and on the "One way only" card. Step 2: the board body ("That is the
THEN part."). Step 3: the board body "Two cases fit it." The cases are given, never generated by the learner. Step 4: Lesson
1, and board s6.l2-do-boxes. Step 5: card "Could it happen another way?" gives only "keeps the rule, so can happen". "Breaks
it, so can't happen" is first stated on s6.l3 card 2, but board s6.l2-do-fwd asks it before then. Step 6: boards
s6.l2-do-back and s6.l2-do-fwd (sentence truth is marked even in the can't-happen case). Step 7: only in the boards' done
lines and in Teach after a miss; taught for line-ups in s3.l2 "Must, might, can’t" and for knights in s5.l1, but Stop 6
never links back. Step 8: quiz, with no board or scratch.

#### s6.l3 The four moves

**Steps.**
1. Read the rule; notice it is always true.
2. Classify the fact: IF or THEN part, happened or did not (translate "has an odd number", "has no cookie", "is not a
   dog").
3. List the two cases that fit the fact.
4. Cross out the case that breaks the rule (one exists only when the fact is "the IF part happened" or "the THEN part did
   not happen").
5. One case left: read what is true in it about the other part; that follows for sure. Two cases left that disagree:
   nothing follows for sure.
6. Match the result to the three choices (the other part happened, did not, or Nothing follows for sure).

**Where each step is taught.** Step 1: the scene line, and card "The IF part happened" ("Here the rule is always true, so it
can’t happen."). Step 2: card "Four kinds of facts", and the letters note for odd meaning not even. Steps 3 and 4: cards "The
IF part happened", "The THEN part did not happen" (suppose and crash, from s5.l3) and "Two traps"; boards s6.l3-do-happened
and s6.l3-do-not. Step 5: the boards' done lines and card "Nothing follows for sure" ("Pick it when more than one thing could
be true."). It is never linked to Lesson 2's "Can’t tell". Step 6: quiz only. The summary card lists the four moves as
slogans (`movesScene`). Wrong-answer case cards show "Your answer: true" with a green check mark in the crossed-out case,
with no reason rows.

#### s6.l4 Flip and NOT

**Steps.**
1. Read the rule; find its IF and THEN parts.
2. Read the new sentence; find its own IF part and THEN part (after a flip they swap; with NOT each is the NOT of a rule
   part; "odd" is NOT "even").
3. Name what was done: flip only, NOT only, or flip and NOT.
4. List the four cases.
5. For each case, decide if this sentence's IF part is true in it (a NOT part is true when the thing does not happen). If
   not, kept; if yes, check its THEN part: kept or broken.
6. Compare its column with the rule's column.
7. The same broken cases means the same; a case that breaks one but not the other means not the same.
8. Answer (pick one, or yes or no).

**Where each step is taught.** Step 1: Lesson 1. Step 2: card "Flip and NOT" defines flip and NOT. Finding the sentence's
own IF part and judging a NOT part appear only in a wrong box's why text and in Teach after a miss ("A case breaks a
sentence means … the sentence’s IF part happens…"). The first use is earlier, on s6.l2 card "One way only" ("the cat breaks
the turned-around sentence"). Step 3: cards "Flip and NOT", "Flip alone does not work", "NOT alone does not work"; NOT
without the word "not" (letters "odd") is never shown, and the Teach term says to "add “not”". Step 4: card "How to test",
worded in the rule's IF and THEN. Step 5: never modelled on a card; the See grid on "Why they match" gives every mark with no
reason. Steps 6 and 7: card "Why they match" ("Two sentences mean the same when the same cases break them.") and boards
s6.l4-do-same and s6.l4-do-traps, which can be copied from the See grid and cards 2 to 4. Step 8: quiz, with no grid.

#### s6.l5 Rule checker

**Steps.**
1. Read the rule; find IF and THEN.
2. Read the card setup: one side shows the IF topic, the other the THEN topic; you see one side.
3. Classify each face: the IF part happened, the IF part did not, the THEN part happened, the THEN part did not ("7" is
   odd, so the THEN part did not happen).
4. List its two possible backs.
5. Combine the face with each back into one case and apply the break test.
6. If any back breaks the rule, turn it; if none can, skip it.
7. Select exactly the cards to turn (or answer yes or no for one card).

**Where each step is taught.** Steps 1 and 2: card "Checking a rule" (the skin's intro line). Step 3: cards "The IF card",
"The NOT THEN card", "The trap", "Letters and numbers", by example, not as a named step. Steps 4 to 6: card "The IF card" goes
back by back; boards s6.l5-do and s6.l5-do-letters mark each back Kept or Broken, then "Turn it over?". Step 7: quiz with no
board for each card. The E-and-4 pick is named only on a card ("Many grown-ups pick E and 4.") and card by card in
`pickTips`; the multi kind has no diagnosis for the set.

### Stop 7: Ways to Think

#### s7.l1 Pattern guesses: pattern-chance (a bag you can see; Do 1 and Do 2)

**Steps.**
1. Read the bag (counts in a text list, or shape cards to count).
2. Read the sentence and name what it is about (a shape, a color, or an "or" of two).
3. For each card or kind, decide whether it fits (the sentence would be true if it came out).
4. Count the ones that fit.
5. Count the ones that do not (the total minus the ones that fit, adding up the other kinds).
6. Compare.
7. Map: all fit means Must; more fit than not means Likely; fewer means Unlikely; none means Can't.
8. Sentence form: repeat for every choice sentence, each about its own kind, and keep the one whose word matches its count.
9. Streak row: ignore the streak; each card went back, so the counts did not change.

**Where each step is taught.** Card 2 "Likely is not must" (the four words), card 5 "Example: mark each sentence" (worked,
by shape), Do 1 "Mark the colors" (color sentences across shapes, an "or" sentence, the streak row), Do 2 "One count
changed" (twin). "Fit" itself is never defined. "Or" (both parts count) comes from s2.l3.

#### s7.l1 Pattern guesses: pattern-sure, pattern-break, pattern-due (a bag you can't see)

**Steps.**
1. Notice "can’t see inside".
2. Separate the draws list (what came out and went back) from the bag (hidden).
3. Say only the draws are sure.
4. Name what could still be hiding (another kind).
5. Guess with "probably", never "must", "every" or "none".
6. Due: each draw went back, so the bag is the same and nothing is due; if the bag is open, the words are the same as
   before the streak.
7. Break: the new kind is a real draw; drop the old guess and do not make a new "must".

**Where each step is taught.** Card 1 "Seeing a pattern" (only the draws are sure), card 3 "A new case can break it", card 4
"A streak does not make it due" (open bag), and Do 1's streak row (open bag only). No board uses a hidden bag. The draws
scene and the open-bag scene are both plain text lists. "Probably" is defined only in Teach. See s7-l1-draws-vs-bag.

#### s7.l2 The best explanation: explain-best

**Steps.**
1. Read the clues and the three ideas (each with its extra things).
2. For each idea and each clue: picture the idea as the whole story of what happened, and ask whether the clue could still
   be true then (a clue the idea does not explain can still fit; a clue the story would change does not).
3. Hold the 6 to 9 marks (no grid in story items).
4. Cross out every idea that misses a clue.
5. Count the extra things of the ideas left (given in the scene).
6. Pick the fewest.

**Where each step is taught.** Card 2 "Fit every clue", card 3 "Keep it simple", card 4 "Example: the wet grass" (grid), Do
1 "Mark a new clue", Do 2 "Pick the best guess" (fit comes before extras). The "says nothing, still fits" case is only on Do
1's roof column, and the whole-story rule is never stated. See s7-l2-fits-vs-explains and s7-rev-2.

#### s7.l2 The best explanation: explain-test

**Steps.**
1. Find the two ideas that fit every clue so far (the third is already out).
2. For each check, imagine what it could find (story items show only the action).
3. Test both ideas against that finding.
4. Keep the check where one fits and the other does not.
5. Reject "look again" at a found clue, a check both ideas fit, and "no check is needed" (a best guess is not a proof).

**Where each step is taught.** Card 5 "A new clue can change it", which is shown after both boards. Do 2's row "Which check
could rule one out?" comes first. Do 1's done line names "a good check". See s7-l2-check-before-taught; in the mud story one
"wrong" check can in fact rule an idea out (s7-rev-1).

#### s7.l2 The best explanation: explain-new-clue and explain-revise

**Steps.**
1. Add the new clue to the list.
2. Test every idea again, including the old best guess.
3. Cross out any idea that misses the new clue.
4. Pick the best of the rest (fewest extra things).
5. Revise: keep "the best guess for the clues then" apart from "proved": it fit and was simplest, which made it the best
   guess, not a proof and not a bad guess.
6. Note that the new clue ruled it out.

**Where each step is taught.** Card 5, Do 2 rows 3 to 6 (two clue sets on one board; see s7-l2-two-clue-sets-one-board), L1
card 3 (a good guess is still not a proof). Stop 6's wet grass "can’t tell" is never linked (s7-l2-cant-tell-vs-best-guess).

#### s7.l3 Cause or just together?: cause-which and cause-cant-tell (test tables)

**Steps.**
1. Tell the effect column (last) from the thing columns.
2. For each thing, compare its column with the effect, row by row, both ways (yes with yes, no with no).
3. A row where the thing happened and the effect did not: out, unless a note names something that stopped it.
4. A row where the effect happened without the thing: out (the unstated puzzle rule: one thing makes the effect).
5. If it follows, scan every pair of rows for two tests where only this thing changes (ignore the effect column), and look
   at the effect in that pair.
6. Found: The cause. It always changes with a twin: Can't tell yet.
7. Pick the choice (or judge a named claim).

**Where each step is taught.** Card 1 "What a cause does" (follows; the stated rule covers only "works every time"), card 2
"Change one thing at a time", card 3 "Example: find the cause", Do 1 "Check each thing" (the clock), Do 2 "Check two things
that go together" (twins). The two kinds of break row and the decision table are never named. See
s7-l3-works-every-time-vs-only-cause (P0) and s7-l3-fair-test-pair.

#### s7.l3 Cause or just together?: cause-together (records)

**Steps.**
1. Notice the rows are records someone wrote down, not tests someone set up.
2. Compare the two columns row by row.
3. A row where they do not go together: No.
4. They go together every row: Not yet (things nobody wrote down changed too).
5. Do not run the fair-test step on records.

**Where each step is taught.** Card 4 "Together is not enough", in words only. Do 2 uses records but asks the fair-test
question and teaches the twin-column reason. No board has a one-thing records table. Card 5 concludes a cause from records.
See s7-l3-tests-vs-records.

#### s7.l3 Cause or just together?: cause-third (can fail)

**Steps.**
1. Find the row with a note.
2. See b happen there without a, so a is not what makes b.
3. Look at the first column (the third thing).
4. Check that it goes with b in every row, and with a in every row except the noted one (the note excuses it).
5. Choose "may cause both" (a guess from records, not a proof) over "nothing else goes with it" and "can’t tell".

**Where each step is taught.** Card 5 "Look for a third thing" (worked, with the "shop closed" note). No board practises a
noted row. The reason given for "b without a" is the P0 issue.

#### s7.l4 Fair choices: fair-choice

**Steps.**
1. Read the story.
2. Find the key fact (a name tag, a promise, who broke it, whose turn).
3. For each choice, check honest (no lie AND nothing hidden).
4. Check fair to X, or keeps the promise (X gets what is owed).
5. Check hurts no one (no tease, no blame, no loss).
6. Keep only a choice that passes all three.
7. Ignore a temptation line ("Nobody saw it happen.").

**Where each step is taught.** Card 2 "Three checks", card 3 "Example: three choices for Leo" (grid), Do "Check three
choices" (9 boxes). "Fair" names both one check and the verdict, and in truth stories the middle check never differs from
"Honest?". See s7-l4-fair-check-vs-fair-choice and s7-rev-3.

#### s7.l4 Fair choices: fair-reason

**Steps.**
1. For each reason, scan the story lines to see whether it is there.
2. Decide whether it is a fact, or a saying, a wish, or "nobody would know".
3. Imagine it changed: would the fair choice change?
4. Pick the story fact that decides.

**Where each step is taught.** Card 5 "Give a reason from the story" (the deciding fact, a saying, "nobody would know"). No
board. A true story line that does not decide and a fact the story never gives are never shown on a card, and "decides" is
never defined. See s7-l4-in-story-vs-decides.

#### s7.l4 Fair choices: fair-pressure (can fail)

**Steps.**
1. Check the wished-for choice without the wish (it fails "fair to X").
2. Add the wish.
3. Ask whether any fact changed (no).
4. The verdict stays No.
5. Pick the "No" whose reason is the story fact, not "might get in trouble".

**Where each step is taught.** Card 4 "Wanting it does not change the facts", card 5 (getting caught is not a reason).
Taught before the quiz. The word "fair" in "Does that make … fair?" shares the ambiguity in s7-l4-fair-check-vs-fair-choice.

#### s7.l5 Gut feelings: gut-check, gut-count, gut-agree, gut-proof

**Steps.**
1. Notice the gut guess (the big ones stand out: "Most of these are red", "A red sweet is more likely").
2. Label it a guess, not a proof.
3. Count each kind, one each, big or small.
4. Compare the counts.
5. The kind with more is more likely (every thing has the same chance, as stated).
6. Judge whether the gut was right.
7. Keep "right after the count" apart from "proved before it".
8. A strong feeling changes no count.

**Where each step is taught.** Card 1 "A fast guess", card 2 "Check it" (most means more likely), card 3 "Check Eli’s gut
feeling" (size vs count), card 4 "Sometimes the gut is right" (right is not proof), card 5 "Strong is not sure", Do 1 "Check
a gut feeling" (Gus: a guess AND right), Do 2 "Check it yourself" (count, big and small). Every distinction is taught and
practised before the quiz: no finding.

## What is already fixed (the treasure signs)

The original failure, "Bronze is the correct chest" read as "Bronze’s sign is true", is fixed in Treasure signs (s1.l4 to
l7). These pieces exist now and are the models the rest of this report reuses:

- **The distinction is declared.** `TREASURE_VS_SIGN` (`treasure-vs-sign`; a: "Where the treasure is (the test world).", b:
  "Whether a sign’s words are true in that world.") is declared on s1.l4. Lessons s1.l5 to l7 declare it again with
  `taughtIn: 's1.l4'`.
- **A contrast card before any case is marked.** Card 3 of s1.l4, "Two different things" (`signContrastCard`): the same test
  world and the same chest, one sign whose words fit ("The treasure is in this chest.") and one whose words do not, each with
  its reason ("It says … The test says … The words fit the test, so True."). The question under them: "Did the treasure
  move?" / "No. Only the words on the sign changed."
- **A board right after it.** "Stamp the two signs" (`signDistinctionDrill`, `afterCard` 2): the learner stamps the two signs
  from the picture, and the done line says "The words decide, not the treasure."
- **A worked example with reasons.** The walk cards (`signWalk`) reveal one case at a time, each stamp with its because row
  (what the sign says, what the test says, so True or False).
- **The case board.** A test-world line over each case ("Test world · … For this test only. Where the treasure is does not
  say if a sign is true."), the rule banner, the method strip (`CASE_STEPS`) while the scaffold is full, compare facts under
  each sign, and a count panel that shows the rule's need only after every sign is stamped (`DrillRow.needs`), then Keep or
  Reject.
- **Mix-up detection.** Four misconception kinds (`own-true`, `verdict-only`, `copied`, `all-one`) in `diagnose()`, each with
  words that name the merged ideas, shown before the first wrong mark's words.
- **"I’m confused".** Two questions (`signConfused`) on every sign board and as `Item.confused` on sign quiz items.
- **A reminder in each later lesson.** "Remember: two different things" on s1.l5 to l7.
- **Progressive disclosure.** The first quiz is the example's twin, checked on a full board before the answer buttons show
  (`workFirst`); the second is a frozen cave board; the rest offer an optional light board.

What is still open in these same lessons is listed in Stop 1: the rule used as a stamp (s1-l4-l7-rule-vs-stamp), the owner
rule that seems to contradict the reminder (s1-l7-rule-vs-own-sign), the own-true diagnosis firing in both directions
(s1-rev-1), count vs which sign (s1-l7-count-vs-which), why a rejected test rules a chest out (s1-l4-test-vs-real), the
scaffold not coming back after a miss (s1-l4-l7-scaffold-not-returned), and "box" in the steps strip (s1-l4-l7-steps-words).

## How to apply

This section maps every P0 and P1 finding to the pieces that already exist, lesson by lesson, so a builder can act on it.
Where a reviewer chose a cheaper fix, this section uses the cheaper fix.

### Order of work

1. **Text-only fixes first.** Many P0 and P1 fixes are wording changes that need no new component: rewriting `CAUSE_RULE`
   and `worksEvery()` (s7.l3), "must be" on Stop 5 cards and in `explainSolve`, card 2 of s7.l2, the always-true line on
   s6.l2's first board and card, dropping "pq" from the s6.l1 to l4 draws, "Mia’s cross is for apples" (s4.l2), the rule-aware
   reminder and misconception texts in Stop 1.
2. **Then the build prerequisites below.** They unblock every contrast card, compare row and diagnosis outside Stop 1.
3. **Then contrast cards and their boards**, then misconception kinds and confused questions, then mastery tags in
   `pass.include`.

### Build prerequisites (shared by Stops 2 to 7)

From s2-rev-2, with the needs of the other stops added:

- **`ContrastPanel` and `ContrastView`:** label props for the world tag, the "who says" line and the verdict words (Fits /
  Not, Can happen / Can’t happen, A statement / Not a statement), an optional need or verdict line, and an optional picture
  (a card, a row of cards, or a small grid).
- **`CompareRows` and `BecauseRows`:** label props ("In this case" instead of "Test"; a verdict line the stop sets).
- **DrillBoard row, deck and grid layouts:** draw `DrillMark.compare` (under marks to tap), because rows (under given marks),
  `DrillRow.needs` and the `MethodSteps` strip when the scaffold is full. Today only CaseBoard draws them.
- **`ConfusedPanel`:** a closing-text prop (today it says "read each sign, then check its words against the test").
- **Test-world banners outside Stop 1:** a rule-aware note on CaseBoard's test-world line; a `test` banner field on speakers
  scenes (beside the existing `fact` banner); a "covered" state on the clues scene; a source banner on cause tables.
- **`diagnose()`:** branches for row, deck and grid boards, with the new kinds listed below.
- **Case cards:** an optional reason and an optional word pair on `Truth` and `TeachCase` (for Stop 4 box cases, Stop 5
  words cases and Stop 6 case cards).
- **Scaffold on items:** use `Item.workFirst` (a guided board before the answer buttons) and `Item.scratch` (optional
  board); give the scratch toggle text for each stop ("Use the test board").
- **Mastery tags:** copy generator tags onto items where they are missing (Stop 6 `finish()`, Stop 4 grid items) so
  `pass.include` can require the trap.

### New misconception kinds needed for the P0 and P1 findings

| Kind | Board layout | Finding | Pattern |
|---|---|---|---|
| `fit-rule` | case | s1-l4-l7-rule-vs-stamp | Wrong stamps whose True count equals the rule's need, with Keep. List before own-true and copied. |
| `own-true` (one direction) and `own-false` | case | s1-rev-1 | Own sign stamped True when false; stamped False when true. |
| rule-aware texts for `own-true` and `verdict-only` | case | s1-l7-rule-vs-own-sign, s1-l7-count-vs-which | `signMisconceptions(skin, rule)`; owner texts say "which sign", not "how many". |
| `copied-mark` and a deck `verdict-only` | deck | s2-l5-mark-vs-fits | Fits or Not equals each card's machine mark; or every mark right with the verdict wrong. |
| `misread` (with the inner rule) | deck | s2-l4-inside-vs-whole | The picks equal the inside's marks. |
| `fork-linked` | row | s3-l1-chain-vs-fork | A name chosen on the fork row where the chain row decided. |
| `cross-too-soon` | row | s3-l3-try-vs-one-line | Cross out on a pinned spot that has a fitting line. |
| `words-from-kind` | row | s5-kind-vs-words-truth | Every words mark equals the speaker's need, on a row that crashes. |
| `need-as-truth` and `could-is-true` (knave rows only) | row | s5-l2-would-be-vs-must-be | Words marked as the need; Could set from the words alone. |
| `one-way-follow` | row | s7-l3-works-every-time-vs-only-cause | Can't tell yet or The cause on a thing whose only break is the effect without it. |
| `records-as-test` | row | s7-l3-tests-vs-records | The verdict The cause on a records row. |
| `fits-as-explains` | grid | s7-l2-fits-vs-explains | A miss marked on a cell where the idea's story leaves the clue possible. |

### Lesson by lesson

#### s1.l4 Treasure signs (s1-l4-l7-rule-vs-stamp, s1-rev-1)

- **Contrast card and board:** declare one `rule-vs-stamp` distinction here (a: "What the rule says about the real treasure
  place." b: "What a sign's words give in this test."). Add the "before you start" card after the treasure-vs-sign contrast
  ("The rule is checked last. Stamp each sign from its words first… Never change a stamp to make it fit.") and a two-case
  board where the words give 2 True under "Exactly one sign is true".
- **Because and compare rows:** already in place.
- **Test-world banner:** tag the rule banner "Check this after the stamps" while stamps are blank.
- **Scaffold:** light the "Now check the rule" step on the method strip as its own step.
- **Misconception kinds:** add `fit-rule` before own-true and copied; make own-true fire only for stamped True and truly
  False; add `own-false`; update `distinction.test.ts`.
- **Confused questions:** add the rule-vs-stamp question ("The rule says every sign is false… How do you stamp it in this
  test?") to `signConfused`; add the other direction of Q1.
- **Text:** reword `signFeedback`'s line "Only the rule tells you which signs to trust."

#### s1.l5 Every sign is false (s1-l4-l7-rule-vs-stamp, s1-rev-1)

- **Reminder card:** `taughtIn: 's1.l4'` for `rule-vs-stamp`; reword the L5 reminder: "The rule is about the real place. In
  a test, a sign can come out True. Stamp from the words. A True stamp just means: reject this chest."
- **Misconception kinds:** the same list as s1.l4; check that the Do board's Gold case (all three truly True) now gets
  `fit-rule`, not own-true or copied.

#### s1.l7 The owner’s sign (s1-l7-rule-vs-own-sign)

- **Contrast card and board:** an owner contrast with the same test world (Gold): the Gold sign True, so part 1 passes; the
  Gold sign False, so part 1 fails. Put the pass or fail in "because" (or use the new verdict line). Give the two-case board
  its own builder, since `signDistinctionDrill` builds from the treasure-vs-sign scene.
- **Reminder:** L7's own text in `signLesson` for `p.rule === 'owner'`, so the two lines that seem to contradict each other
  are never on screen together.
- **Test-world banner:** pass the rule to the test-world line: "Stamp each sign from its words. The rule is checked after."
  Split the rule banner into Part 1 and Part 2 with pass or fail marks.
- **Scaffold:** owner-specific steps on the method strip (from s1-l7-count-vs-which).
- **Misconception kinds:** rule-aware own-true and verdict-only texts; owner quiz headlines with "from its words".
- **Confused questions:** the two owner questions from s1-l7-rule-vs-own-sign.

#### s2.l4 Brackets matter (s2-l4-inside-vs-whole)

- **Contrast card and board:** split card 2 into two cards (the inside group, then the NOT marks) with the bridge sentence;
  declare `inside-vs-whole`.
- **Because and compare rows:** a given "Inside: blue AND small" row (`deckRow(innerOf(rule))`) above the learner's row on
  s2.l4-do; later an "Inside: fits / not" chip under each card (needs `CompareRows` label props).
- **Test-world banner:** the row banner "Do the inside first, then flip."
- **Scaffold:** full on s2.l4-do, both rows marked on s2.l4-do-or, light on s2.l4-do-switch and Try 1; `afterCard` to put each
  board right after its card; the inside row back on the new example after a miss.
- **Misconception kinds:** deck `misread` with the inner rule.
- **Confused questions:** the two inside-vs-whole questions, on the boards and as `Item.confused` on bracket items.

#### s2.l5 Guess the rule (s2-l5-mark-vs-fits, s2-l5-kept-vs-proven)

- **Text first:** card 4 "It matches every mark."; the explanation "Of these three rules, only “…” matches every mark. The
  other two are ruled out…"; truth rows "Its mark: yes / no"; the why line in `world/s2.ts`.
- **Contrast card and board:** declare `mark-vs-fits` (and `kept-vs-proved`). The board keeps the "blue OR big" row as the
  model of Keep, adds a given "blue" row as the model of Rule out, and changes the learner's rule to "a circle OR big" (ruled
  out only by a stopped card it fits). Add a given "blue OR a square" row ("Two rules are kept. Kept means still possible.").
  A card-picture contrast waits on the `ContrastPanel` picture field; a "things" card with two given rows works meanwhile.
- **Because and compare rows:** because rows on given marks ("Mark: yes. Rule “blue”: not blue. So: no match."); a "Match?"
  cell under each card in words.
- **Test-world banner:** already there (the row title names the rule under test).
- **Scaffold:** full on the learner's row, light later; "Keep for now" as the button.
- **Misconception kinds:** `copied-mark` and a deck `verdict-only`.
- **Confused questions:** the mark-vs-fits pair and the kept-vs-proved pair, on the board and as `Item.confused` on guess
  items.

#### s3.l1 Chains (s3-l1-chain-vs-fork)

- **Contrast card and board:** declare `chain-vs-fork`; the contrast card after card 4 (same names, clue 2 flipped) fits
  `ContrastPanel` as it is. Add a fork row to s3.l1-do (reuse `L1_CANT`: compare Ava and Cal, Can't tell; who is first,
  Can't tell).
- **Because and compare rows:** reword "No clue compares them" to "No clue, and no chain of clues, links them" in every place
  it appears (`lineup.ts`:662, 884; `stop3.ts`:161, 386).
- **Test-world banner:** not needed.
- **Scaffold:** later, a picture of the two lines that fit the fork (a scene with two lines).
- **Misconception kinds:** `fork-linked` (needs the row branch in `diagnose()`); put the mix-up line first in the
  ChoiceFeedback for a name picked on a fork item.
- **Confused questions:** the two chain-vs-fork questions.

#### s3.l3 Not first, not last, next to, between (s3-l3-try-vs-one-line)

- **Contrast card and board:** declare `try-vs-line`; the Kofi-second contrast card. On s3.l3-do3 (between, 3 runners, where
  the arrangement already matters), make the shown row two steps ("Try Ava first, as in Ava, Ben, Cal", clue 1 False, then
  "Move the others, not Ava. Which line keeps Ava first and every clue true?" with the options Ava, Cal, Ben / No line works,
  then Keep) and make the next row the learner's own two-step row.
- **Because and compare rows:** `trialRow`'s note in the `killers()` wording ("Every line with Eli first makes clue 1 false").
  Hint and Teach cases labelled "Best try with Kofi second".
- **Test-world banner:** "Testing: Kofi is second. The others can move." (later, with the try row).
- **Scaffold:** the method strip needs wiring into DrillBoard first.
- **Misconception kinds:** `cross-too-soon` (needs the row branch).
- **Confused questions:** the two try-vs-line questions, on the boards and as `Item.confused` on L3 items.
- **Text:** every rule and hint becomes "Cross out a spot only when no way of placing the others keeps every clue true."; the
  who-hint stops saying a person "breaks a clue".

#### s3.l4 Build the whole line (s3-l4-no-spot-clue-strategy)

- **Contrast card and board:** a second worked example card, "No clue names a spot", and a card "Pairs stick together"; a
  third board that builds a 4-person line with no spot clue.
- **Because and compare rows:** the no-anchor hint names the first real step ("Kofi and Wes are both next to Ben, so Ben
  stands between them").
- **Test-world banner:** not needed.
- **Scaffold:** the method strip (Sure spot? Pairs as blocks. Place. Check each clue. Fix.) once it renders on order items;
  try 2 with a spot clue and try 3 without (needs a new `buildPuzzle` option).
- **Misconception kinds:** none needed.
- **Confused questions:** the two no-spot-clue questions.

#### s4.l2 Who must have it? (s4-l2-cross-in-line-vs-cross-in-row, and s4-rev-1 for rows)

- **Contrast card and board:** cheap now: a card with one existing grid scene captioned "Mia’s cross is for apples, not
  grapes", and an `L2_COUNT` row with a cross outside the line (column) plus one for a row question. Later, with the grid
  picture on `ContrastPanel`: declare `box-vs-kid` and the two-grid contrast.
- **Because and compare rows:** a because row under the count ("Line: the grapes column. Crossed in it: Leo. Empty: Mia,
  Nia."); the Hint's case note "So Tia can’t eat apples."; the "different column" and "different row" lines in the "open"
  feedback, with a mix-up headline first.
- **Test-world banner:** shade the asked line and dim crosses outside it on the first column and row quizzes (through
  `Item.workFirst`).
- **Scaffold:** `workFirst` on the first column quiz; light later.
- **Misconception kinds:** none required; the ChoiceFeedback headline names the mix-up.
- **Confused questions:** the two box-vs-kid questions as `Item.confused`.
- **Mastery:** tag the tempting can't-tell items and require one in `pass.include` (with s4-pass-without-cant-tell).

#### s4.l4 Two-part grids (s4-l4-two-part-back-and-forth)

- **Contrast card and board:** a card "Back and forth"; the linking-clue line of "Stuck? Read again" moved into L4; a picture
  on "Two parts to the grid"; a guided board where neither part is known and the first carry starts from a worked-out cross
  (a board that taps both parts is a new layout).
- **Because and compare rows:** the link line in the two-part `Teach.remember`.
- **Test-world banner:** light a linking clue when a box in one of its columns gets a new mark ("Clue 1 can carry this").
- **Scaffold:** `Item.workFirst` on l4-4 with the method strip (Clue marks. Spread. Only one left. Carry across links. Again.).
- **Misconception kinds:** none needed.
- **Confused questions:** the two back-and-forth questions.
- **Mastery:** tag two-part grid items and require one in `pass.include`.

#### s5.l1 Truth-tellers and liars (s5-kind-vs-words-truth, s5-given-kind-vs-fact, s5-truth-shown-without-reason, s5-rev-1)

- **Text first:** "must be" on cards 1 to 3 and in L1's quiz Teach; card 5 rewritten on the four cases (two unknowns);
  "Test:" in row labels; "given" replaced by "a fact" and "we test"; do1's done line states the conclusion; the board banner
  uses `PUZZLE_RULE`. Update `knights.test.ts` (card count and card 4 text).
- **Contrast card and board:** one contrast card, the 7th and last L1 card, declaring `kind-vs-truth`: Ben a knave, the same
  words, the well full vs not full (True vs False, crash vs hold), with a second pair for speaker vs subject (Dee a knave,
  "Eli is a knave", Eli a knave vs a knight). do1 becomes the distinction board (`afterCard` right after it).
- **Because and compare rows:** compare rows under every words mark ("Says … / In this case … / So …"), using names, never
  "I"; the need on its own line ("Ben is a knave: his words must be false"); because rows on every shown row.
- **Test-world banner:** the "Test case" tag beside the existing "What is true" fact banner; the fact banner on quiz scenes
  too.
- **Scaffold:** full on do1 to do3, light later.
- **Misconception kinds:** `words-from-kind` (later `about-speaker`).
- **Confused questions:** the two kind-vs-truth questions and the fact-vs-test question, with a Stop 5 closing line.

#### s5.l2 What nobody can say (s5-l2-would-be-vs-must-be)

- **Reminder card:** `kind-vs-truth` with `taughtIn: 's5.l1'`.
- **Text:** card 1 as two named steps (move the Teach "Step 1 / Step 2" lines onto it); "I is the speaker. Here we pretend the
  speaker is a knave."; the mark renamed "The words would be".
- **Because and compare rows:** compare rows ("Would be: …") and the need line ("A knave needs: false") on each `sayRow`.
- **Scaffold:** full on do1, light on do2.
- **Misconception kinds:** `need-as-truth`, and `could-is-true` on knave rows only.
- **Confused questions:** the two would-be-vs-must-be questions.

#### s5.l3 and s5.l4 Suppose it, then crash-test it; Three islanders (s5-inside-guess-vs-known, s5-follow-step-hidden, s5-truth-shown-without-reason)

- **Text first:** `explainSolve` and the worked cards say "must be" for every need, add the "when false" meaning line, and
  model a guess that holds as well as one that crashes; L3 card 2 says "a knight or a knave".
- **Contrast card and board:** declare `guess-vs-known` on s5.l3 (`taughtIn` on s5.l4); split each worked card into "Inside
  the guess" and "After the crash" (fits the card cap).
- **Because and compare rows:** each follow step as Need / Says / So; because rows on shown rows.
- **Test-world banner:** the new `test` banner on speakers scenes ("Test world · Ava is a knave"), with dashed badges for
  pretend kinds.
- **Scaffold:** a scratch board with "Guess" and "Known" rows on puzzles (`Item.scratch`).
- **Misconception kinds:** none required for these P1s.
- **Confused questions:** the inside-guess question and the follow-step question.

#### s6.l1 to s6.l4 Letters for the parts (s6-pq-letters-untaught)

- **Text first:** drop "pq" from the L1 to L4 draws (`L1_SKINS`, `SKIN_IDS`) until the card and board exist.
- **Contrast card and board:** a card "Letters for the parts" in s6.l1 (the lunchroom case and the P and Q case, the same
  truths), then a P and Q twin of the four-box board; a P and Q twin of the L4 meaning board.
- **Because and compare rows:** P and Q case cards labelled "The IF part (P): true".
- **Test-world banner:** a key line on the rule card ("P is the IF part. Q is the THEN part. ‘P is true’ means the IF part
  happened.").
- **Scaffold:** not needed beyond the boards.
- **Misconception kinds:** none needed.
- **Confused questions:** the two P and Q questions.
- **Mastery:** a "pq" tag and one P and Q item in `pass.include` for L2 to L4.

#### s6.l2 and s6.l3 Turning it around; The four moves (s6-l2-breakable-vs-always-kept)

- **Text first:** the always-true line on the "One way only" card and on s6.l2-do-boxes; the mark "Can this case happen here?";
  "crashes" only in L2 and L3.
- **Contrast card and board:** declare `broken-vs-cant-happen`; the contrast card (the same kid, a rule that can be broken vs
  an always-true rule) needs the "Can happen / Can’t happen" verdict words; a twin four-box board between s6.l2-do-boxes and
  s6.l2-do-back, marked can happen or can't happen.
- **Because and compare rows:** strike the sentence marks in a can't-happen row ("Can’t happen: does not count"), a small new
  DrillBoard row state; this also serves s6-l2-true-in-a-case-vs-for-sure.
- **Test-world banner:** "Always true here: nobody breaks this rule." with a mini four-box picture on every L2 and L3 board and
  quiz; matching banners in L4 and L5.
- **Scaffold:** `workFirst` on the first L2 and L3 quiz items (from s6-quiz-no-scaffold).
- **Misconception kinds:** none required.
- **Confused questions:** the two broken-vs-can't-happen questions, with a Stop 6 closing line.

#### s7.l2 The best explanation (s7-l2-fits-vs-explains, s7-rev-1, s7-rev-2)

- **Text first:** card 2 and the "Fits a clue" term state the whole-story rule ("Picture the idea as the whole story of what
  happened…"); the bridge to Stop 6's "Could it happen another way?"; replace the mud story's neutral clue and add a test that
  a "same" check's action cannot reveal any idea's ruling-out clue.
- **Contrast card and board:** declare `fits-vs-explains`; the contrast pair is the sprinkler and "Street wet" (its story
  would make the clue different) next to the cold room and "Soil still wet" (its story leaves the clue possible); a grid board
  on a story with a clue the idea does not explain.
- **Because and compare rows:** feedback words a fit as "its story leaves this possible" or "explains it", never a bare "fits
  it".
- **Test-world banner:** "Each idea is the whole story" on the board scene.
- **Scaffold:** an optional scratch grid on story items (`Item.scratch`).
- **Misconception kinds:** `fits-as-explains` (needs the grid branch).
- **Confused questions:** the reworded fits question ("If ‘Nobody watered it’ is the whole story, could the plant still sit
  in the sunny window?") and the whole-story question, as `Item.confused` on explain-best, explain-new-clue and explain-test.

#### s7.l3 Cause or just together? (s7-l3-works-every-time-vs-only-cause, s7-l3-tests-vs-records, s7-rev-2)

- **Text first:** card 1 "A cause makes something happen. In these puzzles, one thing makes the effect happen. So a cause
  passes two checks…"; `CAUSE_RULE`, `CAUSE_TERM` and `worksEvery()` give a type-2 reason; the clock's fair-test reason; the
  Stop 6 bridge line; card 5's line "The heat may cause both. A fair test could check it."; `sunBoard`'s fair-test mark
  replaced by "Did someone change only it, on purpose?" plus a one-column records row.
- **Contrast card and board:** declare `works-vs-only-cause` (text panels: the clock on and the lamp off, vs the clock off
  and the lamp on) and `tests-vs-records` (the same cap pattern labelled tests and labelled records; text rows until panels
  can draw a table).
- **Because and compare rows:** because rows on the follows mark that name the break type; tag the breaking row in the table
  ("It happened, the effect did not" / "The effect came without it").
- **Test-world banner:** a source banner on every table ("TESTS · someone changed things on purpose" / "RECORDS · someone
  wrote down what happened").
- **Scaffold:** a "Two checks" method strip over the lamp board (once MethodSteps renders on DrillBoard).
- **Misconception kinds:** `one-way-follow` (with today's single follows mark) and `records-as-test`.
- **Confused questions:** the two works-vs-only-cause questions and the two tests-vs-records questions, on the boards and as
  `Item.confused` on cause-together and cause-third.
