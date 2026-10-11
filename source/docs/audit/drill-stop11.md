# Drill worksheet: Stop 12 (Proof, id s11)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s11 Proof”). The stop keeps its id `s11` and is shown as Stop
12 on the Journey. It opens after Circuit Lab and Proof Lantern (`requires: ['s10', 's17']`), because it names the ways
of proving the game has used all along. It was built under the house rules from the start, so this sheet records what
each lesson does rather than repairs.

The stop is one file, `src/content/stop11.ts`. The models and every quiz item are in `src/engine/puzzles/proofs.ts`; the
card pictures, contrast cards and boards are in `src/engine/puzzles/proofBoards.ts`. Its own test file is
`src/engine/__tests__/proofs.test.ts`. The contract test (`stops.test.ts`) checks the cards, boards, quiz packs, reading
level, the closing why item and the warm-up like every other stop.

**The models (whole stop).** One model per way of proving:

- **A chain** (a direct proof; Line Up’s chains and Proof Lantern’s reason chains): names in a line, givens that say who
  comes before whom, a definition for one word, and steps that each name what they use. A step follows when every
  line-up (and every meaning of the defined word) where what it uses is true makes it true too; the line-ups are listed,
  never assumed (`follows`).
- **Cover every case** (a proof by cases; Grid Detective): a thing that is one of a few options, givens that rule some
  out, a claim true or false for each option, and a proof that checks some options. It covers every case when it checks
  every option the givens leave (`casesLeft`).
- **Suppose and crash** (a proof by contradiction; Knights & Knaves): a knights puzzle, its cases listed (`solutions`),
  and Stop 5’s explanation of a guess and its crash.
- **One counterexample** (Ways to Think, Proof Lantern): shape cards and a claim about every card in a group. A card in
  the group that fails the claim breaks it, one that holds fits it, and one outside the group says nothing (`cardRole`);
  Proof Lantern’s sequence families too.

Skins: everyday, fantasy and abstract.

## s11.l1 · Four ways to prove

**Model.** `METHODS`: chain, cases, crash, counter, and examples (not a proof). A reasoning is generated in one method’s
shape and named by it.

**See.** What is a proof? · A chain of steps (a Line Up chain; names direct proof) · Cover every case (Leo’s pet) ·
Suppose and crash (a knights guess) · One counterexample (a card that breaks an every claim) · Examples are not a proof
(two red circles do not prove every red card is a circle).

**Do.** `s11.l1-do` “Name the way”: five short reasonings (a birth-order chain, a card that is 3, 5 or 7, a knight guess
that crashes, a big red triangle against “Every big sticker in this box is blue”, two small red tiles), each marked
chain, cases, crash, counterexample or only examples. No twin; it comes after the cards.

**Quiz.** `methodItem` (which way does this reasoning use). Skill `s11.method`. Trap tag `only-examples` (a reasoning
that only gives examples; a conflict item). Pack: three ways and the trap, in three skins.

**Terms.** proof; direct proof (a chain). **Distinction.** none declared.

## s11.l2 · Every step cites

**Model.** The chain model: each step names the givens, earlier steps or the definition it uses, and `follows` checks
that what it uses forces it. The chain rule is the axiom.

**See.** Every step must follow · Definitions and axioms (names both; the chain rule is an axiom) · True is not the same as
follows (contrast: the same true step, once using step 1 and given 3, once using nothing) · Example: Ava beat Dee (a whole
proof, each step checked).

**Do.** `s11.l2-do-true` “True or follows?”, right after the contrast: four steps about a race, each marked true in the race?
and follows from what it uses? (8 taps; a true step that uses nothing does not follow). `s11.l2-do-check` “Check each
step”, after the example: twin “Step 2 now uses step 1 and given 1”; each step follows or not (step 2 does not), then is it
a proof (no). `s11.l2-do-uses` “Name what each step uses”: twin “What each step uses is hidden”; pick what forces each step.

**Quiz.** `citeItem` (what a step uses), `brokenStepItem` (which step does not follow), `chainTrapItem`, and `whyItem`
(family `chain`). Skills `s11.cite` and `s11.why`. Trap tag `cites-nothing` (a true step that uses nothing; a conflict
item, with a true claim and a broken chain). Pack of five: what a step uses, a step that does not follow, the trap, one
more, then why it is a proof.

**Terms.** axiom; definition. **Distinction.** `step-true-vs-follows`.

## s11.l3 · Cover every case

**Model.** `casesLeft`: the options no given rules out. A proof by cases proves its claim only when it checks every case
left and the claim is true in each.

**See.** Split into cases (names proof by cases) · Every case the givens leave · Ruled out is not left out (contrast: two
proofs check the same two pets; in one, given 2 rules out the fish, in the other nothing does) · Example: Leo’s pet (three
cases, the fish ruled out, the claim true in the two left) · A true claim is not enough (a reminder of lesson 2).

**Do.** `s11.l3-do-left` “Ruled out or left out?”, right after the contrast: twin “A new proof, about a number card”; for
2, 4, 5 and 8, do the givens leave it? does the proof check it? then does it check every case left? (no: 8 is left and
never checked). `s11.l3-do-twin` “Check every case left”, after the example: twin “Given 2 changed. Now it rules out the
dog.” For each pet, can it happen? is the claim true there? then is “Leo’s pet has fur” proved? (no: the fish is left).

**Quiz.** `mustCoverItem` (which cases must be checked), `leftOutItem` (which case is left out, or none), `casesTrapItem`
(true in every case checked, one missing: is it a proof?), `whyItem` (family `cases`). Skills `s11.cases` and `s11.why`.
Trap tag `case-left-out` (a proof that leaves a case out). Pack of five.

**Terms.** proof by cases. **Distinctions.** `ruled-out-vs-left-out`; `step-true-vs-follows` reminded (`taughtIn:
s11.l2`).

## s11.l4 · Suppose and crash

**Model.** The knights puzzle’s solutions: a guess crashes when no solution has it, and then its opposite is proved; a
guess that holds up is in some solution and proves nothing by itself.

**See.** Suppose the opposite · A crash proves the opposite (names contradiction and proof by contradiction) · Crashing is
not holding up (contrast: two guesses about one islander) · Example: suppose the islander is the other kind (the guess
followed to its crash).

**Do.** `s11.l4-do-guess` “Crash or hold up?”, right after the contrast: twin “The same islanders, with no guess yet”;
four guesses (each islander a knight, each a knave), each marked does it crash? and what does it prove? (the opposite, or
nothing). `s11.l4-do-follow` “Follow a guess to its crash”: twin “The same islanders. Now the guess is about Ben.” Four
steps: then Ben’s words must be true; so Ava is a knight; whose words break the rule (Ava’s); so Ben is a knave.

**Quiz.** `crashProvesItem` (what a crash proves), `breakerItem` (whose words break the rule), `holdsUpItem`, `whyItem`
(family `crash`). Skills `s11.crash` and `s11.why`. Trap tag `no-crash` (a guess that does not crash; a conflict item).
Pack of five.

**Terms.** contradiction (suppose and crash). **Distinction.** `crash-vs-holds`.

## s11.l5 · One is enough

**Model.** `cardRole`: fit, break or none (says nothing). One break makes an every claim false; any number of fits proves
nothing.

**See.** Every means no exceptions (names counterexample) · Examples never prove it · Fitting is not breaking (contrast:
a red circle fits, a red square breaks) · Says nothing (a blue triangle and a claim about red cards) · Example: check each
card.

**Do.** `s11.l5-do-role` “Fits, breaks or says nothing?”, right after the contrast: four cards, each fit or says nothing,
then do these cards prove the claim? (no: cards that fit are only examples). `s11.l5-do-twin` “One card is enough”, after
the example: twin “The same cards. A new claim: every big card in the deck is a square.” The big red circle breaks it;
then is the claim false? (yes).

**Quiz.** `whichBreaksItem`, `examplesTrapItem` (what do examples that fit show), `oneBreaksItem` (most fit, one breaks:
a conflict item), `whyItem` (family `counter`). Skills `s11.counter` and `s11.why`. Trap tag `examples-not-proof`
(examples that fit an every claim). Pack of five.

**Terms.** counterexample. **Distinction.** `fits-vs-breaks`.

## The stop

- **Check:** 10 items: one from lesson 1 and two from each other lesson, in order, then the why item last. The conflict
  items are the chain with a true claim and a step that uses nothing, the proof that checks only cases where the claim is
  true, the guess that holds up, and the cards where most fit and one breaks the claim. The why item (`whyItem`, tag
  `why`, skill `s11.why`) is one of the four ways and is filed under that way’s lesson.
- **Warm-up (bridge):** Proof Lantern’s “proved, a good guess, or false?” item, made as a plain Journey item of this stop
  (lesson 5, skill `s11.counter`). `bridgeFrom: 's17'`.
- **Arcade:** one item from any lesson; about one in seven is a why item. **New examples:** a missed trap gets another trap
  and a question with another answer; a missed way gets the same way in a new skin and another way; a missed why gets the
  same reason and one from another lesson.
- **Skill names:** `s11.method`, `s11.cite`, `s11.cases`, `s11.crash`, `s11.counter`, `s11.why`.
- **World:** `src/content/world/s11.ts`. **Test:** `src/engine/__tests__/proofs.test.ts` (the chain model; one block per
  lesson; the closing why item; every item; the lessons; the stop; reading).

## Plan and code

- The plan’s single distinction (a step that is true vs a step that follows) is taught in lesson 2 and reminded in lesson
  3. The code adds one per lesson after it: `ruled-out-vs-left-out`, `crash-vs-holds`, `fits-vs-breaks`. Lesson 1 declares
  none; its last card (“Examples are not a proof”) carries the idea without a distinction id.
- Every term the plan lists is on the lesson that introduces it. “Contradiction” here means suppose and crash; in Truth
  Tables it means never true.
- Lessons 2 to 5 end their packs with a why item, so their packs have five items, not four.
- The warm-up is filed under Proof itself (lesson 5), not under Proof Lantern.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
