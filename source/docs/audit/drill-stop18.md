# Drill worksheet: Stop 2 (Arguments, id s18)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s18 Arguments”). Arguments is a new stop with the id `s18`,
placed on the Journey right after True or False? and shown as Stop 2. It was built under the house rules from the start,
so this sheet records what each lesson does rather than repairs.

The stop is one file, `src/content/stop18.ts`. Every item, card picture and board is built in
`src/engine/puzzles/arguments.ts`, and its own test file is `src/engine/__tests__/arguments.test.ts`, which reads every
argument back from its words and solves it again by a second method. The contract test (`stops.test.ts`) checks the
cards, boards, quiz packs, reading level, the closing why item and the warm-up like every other stop.

**The model (whole stop).** An argument is about one thing (“Pip”, “Zed”, “a penguin”) and two facts about it: `a`, a kind
of thing (“Pip is a bird”), and `b`, something every `a` has (or, in a “No …” argument, something no `a` has). That makes
four cases, always in the same order (Case 1: a and b; Case 2: a, not b; Case 3: not a, b; Case 4: neither). Given 1 is
“All a are b” or “No a is n”, given 2 is a fact, and the claim is a fact. A case that breaks a given is crossed out
(`breaks`); “All a are b” is broken only by an `a` that is not `b`. The claim must be true when it is true in every case
left, can’t be true when it is false in every case left, and might be true or false otherwise (`statusOf`). Nine shapes
cover every argument the stop asks: `mp`, `mt` and `no` follow; `conv`, `inv` and `no-conv` might be true or false; the
three `-cant` shapes have a claim the givens make false. Real topics also say what is really true, with a reason, so
solid is computed too (`solidOf`: it follows and every given is really true). The worked examples use their own topics
(Rex and the rain, Pip, the glorp, Goldie, Juno, the daxes, the penguin, the sun), never a quiz topic.

## s18.l1 · Givens and the claim

**Model.** A short story (four or five sentences) built from an argument: two givens, the claim, and one or two other
sentences (a question, a command, an opinion or a feeling). Signpost words mark the jobs: “so”, “that means” and “must”
point to the claim; “because” and “since” point to a given. Only a statement can be a given.

**See.** An argument: givens and a claim (the rain argument, naming conclusion and premise) · Signpost words · The claim
can come first (contrast: the same givens and claim, last in one story and first in the other) · Example: find the jobs
(the rain story: two givens, “So” points to the claim, “Get him a towel!” is a command and neither).

**Do.** `s18.l1-do-place` “The claim comes first”, right after the contrast card: the second story with one more sentence.
The learner marks each of four sentences Given, Claim or Neither (“Rex must have gotten wet.” is the claim, “Get him a
towel!” is neither). It catches marking the last statement as the claim (`place-as-job`) and a non-statement as a
given. `s18.l1-do` “Mark each sentence”, after the example: the twin, “The same argument in a new order, with two new
sentences”: an opinion and a question are Neither, and “That means Rex got wet.” is the claim.

**Quiz.** `givensItem` (tap every given) and `claimItem` (which sentence is the claim), in everyday and fantasy stories.
Skills `s18.given` and `s18.claim`. Trap tag `claim-first` (a story where the claim comes first; a conflict item).
Pack: givens, claim, the trap (a claim or givens item with the claim first), givens again in the other skin.

**Terms.** argument; premise (a given); conclusion (the claim). **Distinction.** `place-vs-job` (where a sentence sits vs
what job it does), on the contrast card and its board.

## s18.l2 · Does it follow?

**Model.** The four cases and `statusOf`: cross out each case that breaks a given, then look at the claim in the cases
left. Must, might or can’t.

**See.** Does the claim follow? (names valid) · Every case (Pip’s four cases, blank) · Cross out, then look · True is not
the same as follows (contrast: “Pip is a bird” forced by robin givens, not by feather givens) · Example: Pip has
feathers (every case marked: cases 2, 3 and 4 each break a given, and the claim is true in case 1, so it must be true) · Given 2 can
say “not” (the `mt` shape marked, its claim flipped, the first Pip claim flipped, and its swap) · Given 1 can say “No”
(the `no` shape marked, its flip and its swap).

**Do.** Five boards.
- `s18.l2-do-true` “True or follows?” after the contrast card: three Pip arguments, each with two marks (is the claim
  true in the story? do the givens force it?). Robin: true, follows. Feathers turned around: true, does not follow.
  Singing: false, does not follow. Catches `true-as-follows`.
- `s18.l2-do` “Check each case” after the example: the twin, “Given 2 and the claim swapped places” (the `conv` shape).
  Each case is Crossed out, Left: claim true, or Left: claim false; then must, might or can’t (might).
- `s18.l2-do-not` “Given 2 says “not””: Juno the hen, two arguments on one case grid (the card’s shape and its swap),
  must and might, then the first claim flipped (can’t). 11 taps.
- `s18.l2-do-flip` “Flip the claim”: the first Pip example with its claim flipped, about Juno (can’t), then flipped
  back (must).
- `s18.l2-do-no` “Given 1 says “No””: Juno with “No hen has fur” and its swap (must, might), then the flip (can’t).

**Quiz.** `followsItem` with the choices “Must be true”, “Might be true or false: can’t tell”, “Can’t be true”. Skill
`s18.follows`. Trap tag `true-not-forced` (a claim true in the story that the givens do not force; a conflict item).
Pack: a must, a can’t, the trap, then a must or might.

**Terms.** valid (follows); case. **Distinction.** `true-vs-follows`, taught here.

## s18.l3 · Follows, even when silly

**Model.** The same cases on a made-up topic (Zed and the glorps, Nox and the daxes): the shape decides, not the words.
A plain-word twin is the same shape on a story topic (`plainTwin`); two arguments have the same shape when their parts
match after the words are swapped back (`partsMatch`, `swappedBack`).

**See.** Made-up words (the glorp argument, names form) · Example: check the cases (glorp, every case marked: it
follows) · Same shape, plain words (the ladybug Dot) · Sounding right is not following (Rex the cat-or-dog, the leak case
named) · Swap the words back (the Rex argument becomes the glorp argument with given 2 and the claim swapped) · Glorps
with “not” · Glorps with “No”.

**Do.** `s18.l3-do` “Check the made-up words”: twin “Given 2 and the claim swapped places”; four cases, then Follows or
not (does not follow). `s18.l3-do-shape` “Same shape?”: three Goldie arguments; for each, same shape as the glorp one,
and does it follow (only the `mp` one: yes, follows). Catches `words-as-shape`. `s18.l3-do-not` “Daxes with “not”” and
`s18.l3-do-no` “Daxes with “No””: new made-up words, two arguments on one grid, then follows or not for each (10 taps
each).

**Quiz.** `formItem` (made-up words; choices: it follows, it does not follow, and “Can’t tell if it follows: nobody knows
what a … is”), `twinItem` (which plain argument has the same shape), `believableItem` (believable words). Skill
`s18.form`. Trap tag `sounds-right` (an argument that sounds right but does not follow; a conflict item). Pack: made-up
words one way, same shape, the trap, made-up words the other way.

**Terms.** shape (form). **Distinction.** `true-vs-follows`, reminded (`taughtIn: s18.l2`).

## s18.l4 · Solid arguments

**Model.** `solidOf` on real topics: solid when it follows and every given is really true (`realTruth`, with its
reason). `solidAnswer` is solid, follows but a given is false (`unsound`), or does not follow. A conflict item is one
where every given and the claim are really true and it still does not follow (`trueButBroken`).

**See.** Two checks (names sound) · Given is not the same as true (contrast: penguins have feathers vs penguins can fly;
both follow, only one is solid) · Example: true, but it does not follow (the sun, `conv`: every sentence true, a case
left where the claim is false) · Why does it follow?

**Do.** `s18.l4-do-given` “Follows, true, solid” after the contrast: duck (follows, givens true, solid), cow with “All
animals can fly” (follows, a given false, not solid), owl turned around (does not follow, givens true, not solid); 9
taps; catches `false-as-not` and `true-givens-as-solid`. `s18.l4-do` “Three checks” after the example: the twin “Given 2
and the claim swapped places” (the sun, `mp`): four cases, then follows, every given true, solid.

**Quiz.** `solidItem` (choices: solid; it follows, but a given is false; it does not follow) and `whyItem` (pick the
reason: “The givens force the claim: it is true in every case left.” or “A case left makes the claim false, so the givens
do not force it.”, against reasons about the claim being true, a given being true, sounding right, or too few givens).
Skills `s18.sound` and `s18.why`. Trap tag `false-given` (follows, but a given is false). Pack of five: solid, the trap,
the conflict (every sentence true, does not follow), a why that follows, a why that does not.

**Terms.** sound (solid). **Distinctions.** `given-vs-true` (taught here); `true-vs-follows` reminded.

## The stop

- **Check:** 9 items, two from each lesson in order, then the why item last: givens, claim (the claim first half the
  time), must or can’t, the true-not-forced trap, made-up words, same shape or believable, the true-claim conflict, false
  given or solid, and `whyItem` (tag `why`, a conflict item).
- **Warm-up (bridge):** a Stop 1 card question (true, false or can’t tell), made by Stop 1’s `rowItem` with its lesson 2
  templates; it is stored as a Stop 1 item (`s1.l2`), so it never counts for Arguments.
- **Arcade:** one item from any lesson. **New examples:** a missed claim, follows, form, solid or why item gets a pair, one
  with the same answer and one with another, on another topic.
- **Skill names:** `s18.given`, `s18.claim`, `s18.follows`, `s18.form`, `s18.sound`, `s18.why` (`StopDef.skillNames`).
- **World:** `src/content/world/s18.ts`. **Test:** `src/engine/__tests__/arguments.test.ts` (the model read back from its
  words; every kind solved again; packs; the check; new examples, Arcade and warm-up; every board mark worked out again;
  rule families seen on a card and done on a board first; the words; the argument picture).

## Plan and code

- Lesson 4 is titled “Solid arguments”, not the plan’s “True but it does not follow; false but it follows”. Both halves
  of the plan’s idea are there (the false-given trap and the true-claim conflict).
- Lessons 2 and 3 each add two family cards and boards the plan does not name (given 2 says “not”, given 1 says “No”),
  so every rule family a quiz can ask is seen and done first.
- The terms add case (l2) and shape, also called form (l3), to the plan’s five.
- The plan’s why item asks “Why does this follow?”; the code’s why item asks why an argument follows or why it does not,
  picked at random.
- The plan’s bridge is “a Stop 1 true / false / can’t-tell item about one sentence of a story”; the code uses Stop 1
  lesson 2’s card sentences.

## Review

This sheet was written from the code: the stop file, the engine module and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.

## Added after the review (v0.11.0)

Lessons 2 and 3 gained two cards each ("Given 2 can say “not”", "Given 1 can say “No”", and their glorp twins) and five
boards (Juno the hen, Nox and the daxes), so every argument shape a quiz can draw (the “All” and “No” givens, a second
given that says yes or no to the IF part or the THEN part, and the Must / Might / Can’t verdicts) is seen on a card and
done on a board before the quiz. `arguments.test.ts` reads each practice item's family back from its words and checks
that its lesson has a card and a board for it.
