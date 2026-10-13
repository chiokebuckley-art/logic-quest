# Drill worksheet: Stop 13 (Spot the Trick, id s12, side track)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s12 Spot the Trick”), and for Lessons 5 and 6 the audit
additions brief (`docs/AUDIT-ADDITIONS.md`, “s12 Spot the Trick: two new lessons”). The stop keeps its id `s12` and is
shown as Stop 13, the first side-track stop (`sideTrack: true`). It opens after All, Some, None (`requires: ['s8']`), and
the Pattern Lab’s Trickster Market points to it. It was built under the house rules from the start, so this sheet
records what each lesson does rather than repairs.

The stop is one file, `src/content/stop12.ts`. The model and every quiz item are in `src/engine/puzzles/tricks.ts`; the
card pictures, contrast cards and boards are in `src/engine/puzzles/trickBoards.ts`. Its own test file is
`src/engine/__tests__/tricks.test.ts`. The contract test (`stops.test.ts`) checks the cards, boards, quiz packs, reading
level, the closing why item and the warm-up like every other stop.

**The model (whole stop).** Every trick is an argument (givens and a claim, as in Arguments) over a small set of cases. A
case is one value for each variable (did it rain? is the grass wet?). A case that breaks a given is crossed out; the claim
follows when it is true in every case left. A reason proves its claim when the claim follows, no given is the claim said
again in new words (`means`), and no either-or given shuts out a case that can really happen (a `door` given).
`verdictOf` works the verdict out from the cases. Every family has good reasons too (twins that prove their claim), so no
answer can be guessed from the family. Families: flip (Stop 6’s four moves: forward and flip and NOT prove; the flip trick
and the NOT trick do not), middle, swap, circle, doors, hasty, popular, and (Lessons 5 and 6) person, twist, authority,
slope and after. Skins: everyday, fantasy and abstract (the slope stories are everyday and fantasy).

**What a reason leaves out (Lessons 5 and 6).** Each new trick is a shape with what its reason leaves out
(`Arg.leaves`, and `LEAVES_OUT` by trick). The reason of a trick about people, or the order in after-therefore-because,
is true in the story in every case, so it crosses out no case and the claim stays free. The slippery slope gives the
first step and no rule for any step. Adding what is left out turns each trick into its good twin, and then the givens
force the claim: a fact about the claim with its rule “If <fact>, <claim>.” (people), the rule for each step (a chain:
“If <first>, <next>.” and “If <next>, <end>.”), or a rule that nothing else can cause it (after). The rules are built from
the story’s own sentences, so their words always match their logic. The right answer names what the reason leaves out:
each new trick’s choice in a name item (“Attacking the person. It talks about who made the claim. It leaves out the claim
itself.”) and in the why item, and every explanation and wrong-answer detail (“It leaves out anything about the pool.”).

Every pack’s trap is the same kind: a trick whose claim happens to be true (tag `true-trick`, a conflict item). Every
lesson’s pass rule asks for it: `{ firstTry: 3, include: [TRUE_TRICK] }`.

## s12.l1 · Flip tricks

**Model.** The flip family: an if–then rule (“If it rains, the grass is wet”, always true here) and one fact. Forward
and flip and NOT force their claims; the flip trick (affirming the consequent) and the NOT trick (denying the antecedent)
leave a case where the claim is false (`leakNum`).

**See.** A trick reason (names fallacy) · Good moves with a rule · Example: the flip trick (every case marked: case 3, no
rain and a sprinkler, breaks no given) · The NOT trick (the same case again; links to Flip only and NOT only in If… then)
· True is not the same as proved (contrast: two true claims, one forced).

**Do.** `s12.l1-do` “Check each case”, after the flip-trick example: twin “Given 2 and the claim changed. Now the grass is
dry.” Four cases crossed out or left (only case 4 is left), then proves it, or a trick? (proves: flip and NOT).
`s12.l1-do-true` “True, or proved?”, right after the contrast: three reasons with the rain rule, each marked is the claim
true? and did the reason prove it? (forward: yes, yes; the flip trick, true later: yes, no; the flip trick, false later:
no, no).

**Quiz.** `nameItem` (name the move: good, flip or NOT), `caseItem` (the case that shows a trick), `trueItem` (the trap),
`proveItem` (does the reason prove it?). Skill `s12.flip`. Pack: name it, the case, the trap, prove it or not.

**Terms.** fallacy (a trick reason); affirming the consequent (the flip trick); denying the antecedent (the NOT trick).
**Distinction.** `true-vs-proves`, taught here.

## s12.l2 · The middle trick, and the swap

**Model.** Middle: “All A are M. x is M. So x is A.” and “All A are M. All B are M. So all A are B.” Swap: “Every kid has a
favorite game. So one game is every kid’s favorite.”

**See.** Example: the middle trick (bees, insects and Buzz; case 3 breaks no given) · Two groups in the middle (names the
undistributed middle) · The swap trick · Each has one, or one for all? (contrast: the same two kids; sentence 1 true,
sentence 2 false) · A true claim can still be a trick (puppies and animals, and its same-shape twin with a false claim).

**Do.** `s12.l2-do` “Check each case”, right after the middle-trick example: twin “Given 2 and the claim swapped places.”
Four cases (only case 1 is left), then proves it (it does: Buzz is a bee). `s12.l2-do-swap` “Each has one, or one for
all?”, right after the contrast: four cases of Ava’s and Ben’s favorite games, each left with the claim true or false,
then a trick.

**Quiz.** `proveItem` (middle), `caseItem` (swap), `trueItem` (middle or swap), `nameItem`. Skills `s12.middle` and
`s12.swap`.

**Terms.** middle trick (undistributed middle); swap trick. **Distinctions.** `each-vs-one`; `true-vs-proves` reminded
(`taughtIn: s12.l1`).

## s12.l3 · Going in circles, and only two doors

**Model.** Circle: a given that means the same as the claim (it crosses out exactly the cases where the claim is false).
Doors: an either-or given that shuts out a door that is really there, so a given is false and nothing is proved.

**See.** Going in circles (Ivy and Max the fastest; names circular reasoning) · Example: the claim again (both cases
marked) · Only two doors (soccer or swimming, when some kids ride bikes; names false dilemma) · Two doors, or more?
(contrast) · A true claim can still be a trick (Sam really does swim).

**Do.** `s12.l3-do` “The claim again, or something new?”, after the example: four reasons for “Max is the fastest”, each
the claim again or something new (two of each). `s12.l3-do-doors` “Two doors, or more?”, right after the contrast: four
either-ors (a coin, the class’s sports, the café’s lunch, the hall lights), each marked is there a third door? and is
the either-or true? Neither board has a twin note.

**Quiz.** `againItem` (which reason says the claim again), `proveItem` (doors), `trueItem` (circle or doors), `doorItem`
(the door it shuts out). Skills `s12.circle` and `s12.dilemma`.

**Terms.** circular reasoning (the circle trick); false dilemma (the two-doors trick). **Distinctions.** `two-vs-all`;
`true-vs-proves` reminded.

## s12.l4 · Too few, and everybody says

**Model.** Hasty: a few checked, a claim about all (a case where an unchecked one fails). Popular: most people say it, so
it is true (a case where most say it and it is false). A count of votes does prove what a group picked.

**See.** Example: too few (Ava tasted 2 of 6 apples; names hasty generalization) · One is enough for “some” (links to All,
Some, None) · Everybody says (lightning; names the appeal to popularity) · A vote, or the facts? (contrast) · A true claim
can still be a trick (most kids say the sun is a star).

**Do.** `s12.l4-do` “How many is enough?”, right after the example: twin “The same bag of apples, but Ava tastes a different
number.” Four reasons (2 tasted, 5 tasted, all 6 tasted, 1 tasted for “at least one”), each proves its claim or not (only
the last two). `s12.l4-do-say` “A vote, or the facts?”, right after the contrast: four reasons that count what most people
say or pick, each marked is the claim about what people picked? and does the reason prove it? (the two votes do; the
lightning and sun reasons do not).

**Quiz.** `enoughItem` or `proveItem` (hasty), `proveItem` (popular), `trueItem` (hasty or popular), `whyItem`. Skills
`s12.hasty`, `s12.popular` and `s12.why`.

**Terms.** hasty generalization (the too-few trick); appeal to popularity (the everybody-says trick). **Distinctions.**
`say-vs-true`; `true-vs-proves` reminded.

## s12.l5 · Tricks about people

**Model.** Families person, twist and authority (`PeopleTopic`, `peopleArg`). One given, true in every case (the
reason), and the claim with its NOT as the cases: both cases are left, so the reason proves nothing. Attacking the person:
the reason is about the one who made the claim (“Mia is late for everything.”). The twisted claim (straw man): the
speaker retells the claim bigger (`retell`, said in the question before the reason) and knocks that down (“The lake is not
as hot as a bath.”). The famous name (appeal to authority): a famous person’s word on a subject they do not know (“The
famous singer says this cereal is the healthiest one.”). Good twins (`<family>-good`): a fact about the claim and the rule
“If <fact>, <claim>.”; only one case is left. A topic whose claim is really false has no twin.

**See.** Attacking the person (Mia and the pool, both cases marked; case 2: Mia is late and the pool does open at noon;
names ad hominem) · Who says it, or the facts? (contrast: Mia and Kim say the same words about the library; the sign
decides, true for both) · The twisted claim (Leo, the lake and a bath; case 2: warm enough for a swim; names straw man) ·
A famous name (a singer on a cereal box; case 2: not the healthiest; names appeal to authority) · A true claim can still
be a trick (a singer says an octopus has eight arms).

**Do.** `s12.l5-do` “Check each case”, after the attacking-the-person example: twin “Leo’s reason changed. Now it is
about the pool sign, not about Mia.” Four cases (only case 1 is left), then proves it. `s12.l5-do-who` “Who says it, or
the facts?”, right after the contrast: Mia (late for everything) and Kim (never late) each make two claims about the
library; each marked true or not from the facts (Mia right twice, Kim wrong twice; misconception `who-as-what`).
`s12.l5-do-leaves` “What does it leave out?”, after the famous-name card: the three worked tricks, each marked with what
its reason leaves out (the claim itself; the claim that was really made; whether the person knows this subject).

**Quiz.** `proveItem` (person), `nameItem` (good reason, attacking the person, the twisted-claim trick or the famous-name
trick; on the twisted claim), `proveItem` (authority), `trueItem` (the trap: a trick about people whose claim turns out
true), `nameItem` (any of the three). Skills `s12.person`, `s12.twist`, `s12.authority`. Five items, three skins.

**Terms.** attacking the person (ad hominem); straw man (the twisted-claim trick); appeal to authority (the famous-name
trick). **Distinctions.** `who-vs-what` (who says the claim vs whether it is true), taught here; `true-vs-proves`
reminded.

## s12.l6 · Tricks about time

**Model.** Family slope (`StepTopic`, `stepArg`): the first step happens (given 1, true in every case); the cases are the
next step and the end (the claim). A slippery slope gives no rule for any step, so all four cases are left and the end can
fail (case 2: the next step happens, the end does not). A chain gives the rule for each step and leaves only case 1.
Family after (`AfterTopic`, `afterArg`): the order (given 1, true in every case) and the claim that the first thing caused
the second; the cases are what caused it, the first thing or something else. An only-rule (“Nothing but the button can
ring this doorbell.”) crosses out something else and proves it.

**See.** The slippery slope (Ana’s fish, then more pets, then a zoo; every case marked; case 2: other kids ask, and the
class does not turn into a zoo) · It came first, so it caused it? (rain right after a car wash; case 2: clouds made it
rain; names after-therefore-because and post hoc; ties to Ways to Think’s “Cause or just together?”) · After, or a
cause? (contrast: the doorbell with its only-rule, proved; the car wash, not proved) · A true claim can still be a trick
(Kim did not get a sunburn after she put on sunscreen).

**Do.** `s12.l6-do` “Check each case”, after the slippery-slope example: twin “A new chain of steps. This time, each step
comes with a rule.” A snow day: four cases (only case 1 is left), then proves it. `s12.l6-do-after` “After, or a cause?”,
right after the contrast: four stories (the doorbell, the car wash, the desk fan, the sunscreen), each marked did one
thing come right after the other? (yes, every time) and does the reason prove the first thing caused it? (only the two
with an only-rule; misconception `after-as-cause`, whose words end with that story’s own order and the case where
something else caused it).

**Quiz.** `proveItem` (slope or chain), `caseItem` (slope: the case where the next step happens and the end does not),
`proveItem` (after, or an only-rule), `trueItem` (the trap: an after-therefore claim that happens to be right), `nameItem`
(good reason, the slippery slope or after-therefore-because). Skills `s12.slope` and `s12.after`. The two slope items take
one skin each (everyday and fantasy), so every pack has two skins.

**Terms.** slippery slope; after-therefore-because (post hoc). **Distinctions.** `after-vs-cause` (one thing came right
after another vs the first thing made it happen), taught here; `true-vs-proves` reminded.

## The stop

- **Check:** 9 items: one from each of lessons 1 to 4, two from each of lessons 5 and 6 (two of the three tricks about
  people; the slippery slope, then after-therefore-because, which is the lesson 6 trap about half the time), then the why
  item last: “Why is this a trick, though its claim is true?” (`whyItem`, tag `why`, a conflict item, filed under lesson
  4, which asks it). The why item can be about any of the thirteen tricks; its right reason names what the reason leaves
  out for the lesson 5 and 6 tricks.
- **Warm-up (bridge):** an Arguments “does it follow?” item (must, might or can’t), made by Arguments’ `followsItem`.
  `bridgeFrom: 's18'`. It is finished as a Spot the Trick item (`s12.l1`, skill `s12.follows`, named “Spot the Trick
  warm-up: does the claim follow? (from Arguments)”), because a side-track stop’s warm-up belongs to it or to the stop it
  opens after.
- **Arcade:** one item from any lesson; a trap item is filed under the lesson that teaches its trick. **New examples:** on
  another topic in the same skin; a missed prove, name, trap or why item gets a pair (a trick and a good reason, or two
  tricks).
- **Skill names:** `s12.flip`, `s12.middle`, `s12.swap`, `s12.circle`, `s12.dilemma`, `s12.hasty`, `s12.popular`,
  `s12.person`, `s12.twist`, `s12.authority`, `s12.slope`, `s12.after`, `s12.why`, `s12.follows`.
- **World:** `src/content/world/s12.ts` (lesson 5: a class debate, debate coaches, news reporters; lesson 6: bedtime,
  medicine testers, car mechanics; a line for each new skill). **Test:** `src/engine/__tests__/tricks.test.ts` (every
  verdict worked out again; every item solved by a second method; the two-doors trick’s own doors; crowd counts; lessons 5
  and 6 from each story’s own sentences: a truth table for the tricks about people, a walk along the chain of steps, the
  list of possible causes, and what each reason leaves out, added, turning the trick into a proof; the lessons; the check,
  Arcade, new examples and warm-up; every board mark; every word a kid reads).

## Plan and code

- The lessons, skills and trap follow the plan. The distinction the plan asks for (the claim being true vs the reason
  proving it) is declared here as `true-vs-proves`, taught in lesson 1 and reminded in each later lesson; each later
  lesson also teaches its own (`each-vs-one`, `two-vs-all`, `say-vs-true`).
- The plan’s terms are all there; the code adds middle trick and swap trick as their own words. Lessons 5 and 6 add the
  brief’s terms: attacking the person, straw man, appeal to authority, slippery slope, after-therefore-because.
- Lessons 5 and 6 follow the audit additions brief: the five skills, the traps (a trick about people whose claim is true;
  an after-therefore claim that happens to be right), and a declared distinction each, with a contrast card and a board.
- The check carries a `true-trick` item only by chance (the slots that may pick `trueItem`); its closing why item is
  always about a trick whose claim is true.

## Review

This sheet was written from the code: the stop file, the engine modules and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. Lessons 5 and 6 (audit additions, v0.12.0) were
read the same way: their cards, boards and packs on several seeds. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
