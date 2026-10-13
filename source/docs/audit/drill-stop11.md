# Drill worksheet: Stop 12 (Proof, id s11)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s11 Proof”). The stop keeps its id `s11` and is shown as Stop
12 on the Journey. It opens after Circuit Lab and Proof Lantern (`requires: ['s10', 's17']`), because it names the ways
of proving the game has used all along. It was built under the house rules from the start, so this sheet records what
each lesson does rather than repairs.

The stop is one file, `src/content/stop11.ts`. The models and every quiz item of lessons 1 to 5 are in
`src/engine/puzzles/proofs.ts`; their card pictures, contrast cards and boards are in `src/engine/puzzles/proofBoards.ts`.
Lesson 6 (rules with names) has its model, items, cards and boards in `src/engine/puzzles/proofRules.ts`, and lesson 7
(dominoes) in `src/engine/puzzles/proofInduction.ts`; both were added after the Curriculum and Logic Audit
(`docs/AUDIT-ADDITIONS.md`, v0.12.0). Its own test file is `src/engine/__tests__/proofs.test.ts`. The contract test (`stops.test.ts`) checks the cards, boards, quiz packs, reading
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
- **Named rules** (lesson 6; the If… then stop and Spot the Trick): a step is its givens and its claim, each a sentence
  built from a few facts (an if–then rule, an either-or, NOT, or a fact on its own). Its move comes from matching it
  against each named shape, in any order of the givens (`moveOf`); whether it follows comes from listing every case of
  its facts, and a case with every given true and the claim false breaks it (`breakersOf`). The five rules have no such
  case; the two look-alikes have one.
- **Dominoes** (lesson 7; Rule Rise’s staircases): a claim about every case is the count of case 1, the amount each case
  adds, and what the claim says of a count (odd, even, more than k, fewer than k). The first case holds when the claim
  is true of case 1 (`firstHolds`); the step to the next holds when every count from 0 to 500 that fits still fits with
  the amount added (`stepHolds`). An argument proves the claim only when it shows both parts, each true (`argProves`).
  The staircase claims reuse Rule Rise’s constructions and counts (`CONSTRUCTIONS`, `stairCount`, `stairScene`).

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

**The liar card (v0.12.0).** A fifth card, after the example: “This sentence is false.” Suppose it is true: then it is
false. Suppose it is false: then it is true. Both guesses crash, so it is not a statement (Stop 1’s word). One card, no
item, no board; the existing cards keep their places, so the boards still open after cards 3 and 4. The brief allows a
short “I’m confused” question on it, but a key-idea card has no place for one (`IdeaCard` carries none, and only boards
and items do), so the card goes without it.

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

## s11.l6 · Rules with names

**Model.** `RuleStep`: the givens and the claim, and the sentences their facts stand for. `MOVE_SHAPES` names seven
shapes: the IF part happened (modus ponens), the THEN part did not happen (modus tollens), one or the other
(disjunctive syllogism), the chain rule (hypothetical syllogism), Flip and NOT (a proof by contrapositive), and the two
look-alikes, the flip trick (affirming the consequent) and the NOT trick (denying the antecedent), with the names Spot
the Trick uses. Every story (`RULE_TOPICS`: rain and a field, a late bus, a snow day, a dragon, a wand, the full moon, a
number, a card, a tile) has three facts in a chain and an either-or pair that can both be true. Each fact of a chain can
be true while the one before it is false, so the case that breaks a look-alike can really happen.

**See.** Rules with names · The IF part, and the THEN part (names modus ponens and modus tollens) · One or the other
(names disjunctive syllogism) · The chain rule (names it, and hypothetical syllogism; the same idea as the chain rule
for who came first) · Proof by Flip and NOT (names a proof by contrapositive) · Rules and look-alikes (contrast: the same
rule, “if the number is 8, it is even”; NOT the THEN part follows, NOT the IF part does not, and a number that is not 8
but even breaks it) · Example: is it a rule? (the THEN part did not happen about the rain, every case drawn and marked).

**Do.** `s11.l6-do-look` “A rule or a look-alike?”, right after the contrast: four steps from the number rule (the IF
part happened, the NOT trick, the THEN part did not happen, the flip trick), each marked can the givens be true and the
claim false? and so, is it a rule? (8 taps; misconception `sounds-as-rule`; one “I’m confused” question).
`s11.l6-do-cases` “Check every case”, after the example: twin “The same rule. Now given 2 says it does not rain.” For
each of the four cases, does a given rule it out? and, if not, is the claim true there? Then does the claim follow? (no)
and which move is it? (the NOT trick). `s11.l6-do-name` “Name the rule”: twin “New steps, one for each rule.” Five steps
about a magic wand, one per rule, each named.

**Quiz.** `ruleNameItem` (which rule does this step use, or no rule), `ruleConcludeItem` (from the givens, what may you
claim for sure: the rule’s claim, its opposite, or nothing for sure), `ruleTrapItem` (four steps, three rules and one
look-alike: which uses no rule?), and `ruleWhyItem` (why may a proof use a rule: in every case where the givens are
true, the claim is true too). Skills `s11.rules` and `s11.why`. Trap tag `looks-like-rule` (a step that looks like a
rule and is not; a conflict item): always the third item, and also on a name or claim question about a look-alike.
Pack of five: name a rule, give the claim a rule allows, the trap, one more (any move), then why.

**Terms.** modus ponens (the IF part happened); modus tollens (the THEN part did not happen); disjunctive syllogism (one
or the other); chain rule (hypothetical syllogism); proof by contrapositive (proof by Flip and NOT).
**Distinction.** `rule-vs-lookalike`.

## s11.l7 · Dominoes

**Model.** `IndClaim`: the count of case 1, the amount added, what the claim says. `IND_SKINS`: Leo’s coin jar and Mia’s
block tower (everyday), a dragon’s gems and a wizard’s tower of candles (fantasy), Rule Rise’s staircases and a number
list under a stated rule (abstract). `IndArg`: an argument that shows the first case or not, and the step to the next,
checked cases instead (the trap), or nothing.

**See.** A line of dominoes · Two parts prove every case (names base case, step, and induction) · Checked cases are not
the step (contrast: the center-and-pairs staircase from step 1; one try shows the step to the next and proves every
step, the other checks steps 2 to 4 and proves nothing) · Example: an odd staircase (Rule Rise’s staircase drawn, its
two parts written out) · Both parts are needed (start at 4 and add 2: the step holds but no term is odd; start at 3 and
add 3: term 1 is odd but term 2 is 6).

**Do.** `s11.l7-do-parts` “Which parts are there?”, right after the contrast: three tries at proving that Leo’s jar has
an odd number of coins every week (the first case with checked weeks; the step alone; both parts), each marked has the
first case? has the step to the next? proves every week? (9 taps; misconceptions `checks-as-step` and `step-as-proof`;
one “I’m confused” question). `s11.l7-do-twin` “Push the first domino”, after the example: twin “A new staircase: each
step adds a group of 4.” How many tiles at step 1 (5), is it odd, an odd number plus 4 is odd, so is every step proved
(yes).

**Quiz.** `twoPartsItem` (four true lines: which two prove the claim for every case?), `missingPartItem` (a try with one
part: which part is missing?), `provesEveryItem` (does this argument prove the claim for every case? with both parts,
with no first case, with no step, or with checked cases offered as the step), and `inductionWhyItem` (why do the two
parts prove every case?). Skills `s11.induction` and `s11.why`. Trap tag `checks-as-step` (checked cases offered as the
step to the next; a conflict item): in half of them the claim holds for every case and is still not proved, in the
other half (“fewer than”) it breaks soon after the checking stops. Pack of five: two parts, the missing part, the trap,
one more argument, then why.

**Terms.** induction (the domino proof); base case (the first domino); step (the step to the next).
**Distinction.** `checks-vs-step`.

## The stop

- **Check:** 10 items: one from each of lessons 1 to 5 (lesson 2’s is its trap, the chain with a true claim and a step
  that uses nothing; lessons 3 to 5 draw any of their three kinds), two from lesson 6 (a name or claim question about a
  rule, then the four-step trap) and two from lesson 7 (two parts or the missing part, then the checked-cases trap), in
  order, then the why item last. Three conflict items are always there: the lesson 2, 6 and 7 traps. The why item (tag
  `why`, skill `s11.why`) comes from any of six families (the four ways, named rules, dominoes) and is filed under the
  lesson that teaches its reason. Before v0.12.0 the check had two items from each of lessons 2 to 5; it now has one from
  each, to make room for the new lessons within ten.
- **Warm-up (bridge):** Proof Lantern’s “proved, a good guess, or false?” item, made as a plain Journey item of this stop
  (lesson 5, skill `s11.counter`). `bridgeFrom: 's17'`.
- **Arcade:** one item from any lesson; about one in seven is a why item. **New examples:** a missed trap gets another trap
  and a question with another answer; a missed way gets the same way in a new skin and another way; a missed rule name
  gets the same rule and another rule; a missed claim gets a rule’s claim and a look-alike’s “nothing for sure”; a missed
  “does it prove every case?” gets the same kind of argument and one with another answer; a missed why gets the same
  reason and one from another lesson.
- **Skill names:** `s11.method`, `s11.cite`, `s11.cases`, `s11.crash`, `s11.counter`, `s11.rules`, `s11.induction`,
  `s11.why`.
- **World:** `src/content/world/s11.ts`. **Test:** `src/engine/__tests__/proofs.test.ts` (the chain model; one block per
  lesson; the closing why item; every item; the lessons; the stop; reading).

## Plan and code

- The plan’s single distinction (a step that is true vs a step that follows) is taught in lesson 2 and reminded in lesson
  3. The code adds one per lesson after it: `ruled-out-vs-left-out`, `crash-vs-holds`, `fits-vs-breaks`. Lesson 1 declares
  none; its last card (“Examples are not a proof”) carries the idea without a distinction id.
- Every term the plan lists is on the lesson that introduces it. “Contradiction” here means suppose and crash; in Truth
  Tables it means never true.
- Lessons 2 to 7 end their packs with a why item, so their packs have five items, not four.
- Lesson 6’s “chain rule” joins if–then rules; lesson 2’s chain rule (the axiom) joins “before” facts. The card says they
  are the same idea, and the glossary term goes on lesson 6, as the audit brief asks.
- Lesson 7 calls the induction step “the step to the next” in kid words, because the staircase’s own steps are also
  called steps (Rule Rise draws “Step 1”, “Step 2”). The glossary term is “step”, with “the step to the next” as its
  other name.
- The warm-up is filed under Proof itself (lesson 5), not under Proof Lantern.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum. Lessons 6 and 7, the liar card and the new check (v0.12.0) were added
the same way, from the code and a run of their cards, boards and packs.

**Independent review of lessons 6 and 7 (v0.12.0).** Read against the brief and the house rules, with 40 seeds of every
new item maker scanned for quotes, symbols, spelling and sentence length. Fixed:
- The number story’s third fact was “the number splits into two equal groups”, which means the same as “even”. A
  look-alike made from those two facts (about one abstract trap in five) showed a breaking case that cannot happen (“The
  number is not even and the number splits into two equal groups”), for a claim that is in fact true. The fact is now
  “the number is circled”; a test checks that every case the givens leave in the number story fits a real number.
- Board `s11.l7-do-parts`: a wrong mark on try 2’s step said “its second line”, but try 2’s step is its first line. The
  words now quote the step line itself; try 1’s words name its “Step to the next” line that only checks weeks.
- Board `s11.l6-do-cases`: a case a given rules out now says what that given says and the facts that break it (“Given 1
  says “If it rains, then the field is wet.” In this case, it rains, but the field is not wet.”), not only “Given 1 is
  false here”. Board `s11.l7-do-twin`: “Is 5 odd?” now gives its reason (2 pairs with 1 left over).
- New examples after a missed “does it prove every case?” that is not the trap: the same kind of argument, and one with
  another answer (before, both could have the answer “no step”).
- Real life: the coin-jar use repeated Rule Rise’s jar of the same amount each week, and a skill line named a person.
  Lesson 7’s life use is now counting (a start, and a way to get from any number to the next); the coach line says “a
  player”.
