# Drill worksheet: Stop 9 (All, Some, None, id s8)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s8 All, Some, None”). The stop keeps its id `s8` and is shown
as Stop 9 on the Journey, after Ways to Think. It was built under the house rules from the start, so this sheet records
what each lesson does rather than repairs.

The stop is one file, `src/content/stop8.ts`. Every item, ring picture and board comes from
`src/engine/puzzles/quantifiers.ts` (lessons 1-4), `src/engine/puzzles/syllogisms.ts` (lesson 5) and
`src/engine/puzzles/nested.ts` (lesson 6). Its own test file is `src/engine/__tests__/quantifiers.test.ts`, which works
every answer and board mark out again by counting (lessons 1-4), on every set of up to three real cards (lesson 5) and
on the table of who is friends with whom (lesson 6). The contract test (`stops.test.ts`) checks the cards, boards, quiz
packs, reading level, the closing why item and the warm-up like every other stop. Lessons 5 and 6 were added after the
Curriculum and Logic Audit (`docs/AUDIT-ADDITIONS.md`, “s8 All, Some, None: two new lessons”).

**The model (whole stop).** Stop 1’s shape cards (size, color, shape) and groups named by one feature (“circles”, “red
cards”). A group is drawn as a ring (scene `rings`, never set symbols). Two rings overlap, and every card sits in one of
four parts: only in the first ring, in both, only in the second, or outside. The sentences are worked out with Stop 1’s
statement engine (`holds` on every-is, some, none-is and some-is-not):

- “All X are Y”: no X sits only in the X ring; true when there is no X at all (nothing breaks it).
- “Some X are Y”: at least one card in the overlap; still true when every X is Y.
- “No X are Y”: the overlap is empty.
- “Some X are not Y” (and “Not all X are Y”): at least one X sits only in the X ring; the opposite of “All”.

An opposite is checked on every way the four parts can be empty or filled (`isOpposite`). Skins: everyday, fantasy and
abstract.

## s8.l1 · In the ring or not

**Model.** `partOf(card, X, Y)`: which of the four parts a card sits in, from its features.

**See.** A ring around a group (the Red ring; names set) · Two rings can overlap (Circles and Red; the big red circle
goes in both; names the overlap) · In a ring, or only in it? (contrast: the same card, “in the Red ring” and “only in the
Red ring”) · Example: where each card goes (rings Big and Blue, each card checked one ring at a time).

**Do.** `s8.l1-do-in` “In the ring, or only in it?” right after the contrast: three cards, each marked In the Red ring?
and Only in the Red ring? (big red circle: yes, no; small red square: yes, yes; small blue circle: no, no). Catches
`in-vs-only`. `s8.l1-do-place` “Place the cards” after the example: twin “The same rings and cards, with four new cards
to place”; each card goes in both rings, only Big, only Blue, or outside.

**Quiz.** `ringTapItem` (tap every card in a ring), `placeItem` (where one card goes), `countItem` (how many in a ring),
`bothTapItem` (tap every card in both rings). Skill `s8.member`. Trap tag `in-both` (a question with a card in both
rings). Pack: tap a ring, place a card, count a ring, tap the overlap.

**Terms.** set (a group in a ring); overlap. **Distinction.** `in-vs-only`.

## s8.l2 · All, some, none

**Model.** The truth of “All / Some / No X are Y” over the cards (`truth`).

**See.** Three small words · “All” on the rings (no circle sits only in the Circles ring: true) · “Some” and “no” on the
rings (one circle in the overlap) · “Some” can mean all (contrast: everyday “some” hints “not all”; in logic it stays
true when every one fits) · Example: triangles and blue (each sentence worked).

**Do.** `s8.l2-do-some` “Is “some” true?” after the contrast: three rows of three circles (all red; two red and one
blue; none red), each marked for “Some circles are red.” and “All circles are red.” (true and true; true and false;
false and false). `s8.l2-do-mark` “Mark the sentences” after the example: twin “The same rings. Now every triangle is
blue.” All, some and no, each True or False (true, true, false).

**Quiz.** `truthItem` (is an all, some or no sentence true?) and `whichItem` (which sentence is true). Skill
`s8.quantify`. Trap tag `some-all` (a “some” sentence where every one fits: true; a conflict item). Pack: an “all”, a
“no”, the trap, then which sentence is true.

**Terms.** all; some; none (no). **Distinction.** `some-vs-not-all`.

## s8.l3 · Not all means some are not

**Model.** `isOpposite`: two sentences are opposites when one is true just when the other is false, over every way the
four parts can be filled. A card breaks “All X are Y” when it is an X and not a Y (`breaks`).

**See.** The opposite (links to NOT in Stop 1) · Not all (one circle marked with a dashed line breaks “All circles are
red”) · “Not all” is not “none” (contrast: the same three circles) · The opposite of “some” (the overlap is empty) ·
Example: one card breaks it (“All squares are yellow”, the small blue square circled; names counterexample).

**Do.** `s8.l3-do-notall` (title: “Not all” or “none”?) after the contrast: three rows of three circles, each marked for “Not
all circles are red.” and “No circles are red.” (two red, one blue: true, false; none red: true, true; all red: false,
false). Catches `not-all-vs-none`. `s8.l3-do-break` “Find the card that breaks it” after the example: twin “The same
rings, but no card is circled.” For each of four cards, does it break “All squares are yellow”? (only the small blue
square), then the opposite (“Some squares are not yellow.”).

**Quiz.** `oppositeItem` (the opposite of all, some, none or some-not), `counterItem` (which card breaks it),
`enoughItem` (most fit, one does not: is the “all” sentence true? a conflict item). Skill `s8.negate`. Trap tag
`not-all-none` (the opposite of an “all” sentence, with “No X are Y” offered). Pack: the trap, another opposite, the card
that breaks it, one is enough.

**Terms.** opposite; not all; counterexample. **Distinction.** `not-all-vs-none`.

## s8.l4 · When the ring is empty

**Model.** The same truths with an empty X ring: “All” has nothing to break it (true), “Some” has nothing to make it true
(false), “No” is true.

**See.** An empty ring (names empty set) · “All,” with nothing inside · “Some” and “no,” with nothing inside · Break it,
or make it true? (contrast) · Example: the dragon’s cave (gems, no triangle gem).

**Do.** `s8.l4-do-empty` “Break it, or make it true?” after the contrast: three rows (no square; two red squares; one red
and one blue square), each marked for “All squares are red.” and “Some squares are red.” (true, false; true, true;
false, true). `s8.l4-do-mark` “Mark the sentences” after the example: twin “New rings, Circles and Yellow. Again, one ring
is empty.” All true, some false, no true.

**Quiz.** `emptyItem` (a sentence about an empty ring), `filledItem` (a ring with cards in it), `whyItem` (family
`empty`). Skills `s8.empty` and `s8.why`. Trap tag `empty-all` (an “all” sentence about an empty ring; a conflict item).
Pack: the trap, a “some” (or none, or some-not) about an empty ring, a filled ring, then why.

**Terms.** empty set (an empty ring). **Distinction.** `break-vs-make`.

## s8.l5 · Two givens, one picture

**Model.** Three groups on three different features (“circles”, “red cards”, “big cards”) drawn as three rings that
overlap (two rings for an argument with two groups). Every card sits in one of eight parts by its features
(`partOf3`). A placement is a set of parts that hold cards, each shown by one card (`cardAt`). `judgeSyl` checks an
argument on every placement (256 with three rings, 16 with two): a placement is allowed when every given is true there
(`truth`, so Stop 1’s statement engine); the claim follows when it is true in every allowed placement; otherwise the
smallest allowed placement where it is false is the case that breaks it, drawn on the rings. A part no allowed
placement fills is crossed out (gray: an “all” or “no” given rules it out); a part every allowed placement fills gets
a star (a “some” given puts a card there). The shapes, judged by the model, never written down:

- follows: “All A are B. All B are C. So all A are C.”; “All A are B. Some C are A. So some C are B.”; “No B are C. All A
  are B. So no A are C.”; “No B are C. Some A are B. So some A are not C.”
- does not follow: “All A are B. All C are B. So all A are C.” (a card in A and B, not in C) and “All A are B. So all B
  are A.” (turning “all” around: a card in B, not in A). The middle trick is not named here; it is only “does not
  follow”.

The test works every verdict out again on every set of up to three of the 18 real cards (no set fits the givens and
breaks the claim), and checks that the drawn breaking placement fits the givens, breaks the claim and is as small as
the smallest real set.

**See.** Two givens and a claim (the argument picture from Stop 2: “All circles are red. All red cards are big.”, claim
“All circles are big.”; names syllogism) · Draw the givens (three rings Circles, Red and Big, the parts each given rules
out crossed out in gray; a “no” given crosses out its overlap) · Example: it follows (every card that could break the
claim breaks a given; caption: without the gray parts, Circles sits inside Red and Red inside Big) · True here is not
the same as follows (contrast: the same givens “All circles are red. All big cards are red.” and claim “All circles are
big.” on two pictures the givens allow, the claim true in one and false in the other) · Example: a card that breaks it
(the same argument on the rings: a small red circle is not crossed out and breaks the claim) · Turning “all” around (two
rings; a big red square fits “All circles are red.” and breaks “All red cards are circles.”) · A “some” given (“All
circles are red. Some big cards are circles. So some big cards are red.”: a “some” given crosses nothing out and puts a
star; the star lands where Big, Circles and Red meet).

**Do.** `s8.l5-do-here` “True here, or follows?” right after the contrast (scaffold full): three pictures the givens
allow, each marked “Do both givens fit these cards?” (yes, yes, yes) and “Is the claim true here?” (true, false, true),
then “Does it follow?” (does not follow). Catches `here-vs-forced`. `s8.l5-do-draw` “Draw the givens” after the breaking
example: twin “The rings and the claim from the example. Given 2 is new: “No red cards are big.””. One card per part,
“Can it be in the picture?” (yes for the small red circle, small red square, big blue square and small blue square; the
other four are crossed out), then which ring sits inside which for the “all” given (“Circles sits inside Red”: worked
out on the parts left, and a wrong pick is told that the small red square is not crossed out, so Red does not sit
inside Circles), then “Does it follow?” (no) and the card that breaks it (the small red circle). 11 taps.
`s8.l5-do-star` “Where does the star go?” after the “some” example: twin “Given 1 is new: “No circles are red.””. One card
per part, then where the card given 2 needs must be (the big blue circle; the big red circle is crossed out), then
“Does it follow?” (no: the givens allow a picture with only a big circle that is not red). Every mark comes from
`drawBoard`, which reads the model.

**Quiz.** `drawItem` (tap every card that can be in the picture: one card per part; misreadings named: a given read
turned around, a “some” given read as “all”, only one given used), `followsItem` (does the claim follow? the picture
shows cards the givens allow, with the claim true there) and `breakItem` (which card fits the givens and breaks the
claim: one card that does, one that fits the claim, one crossed out, one the claim says nothing about). Skill
`s8.syllogism`. Trap tag `not-forced` (a claim true in the picture but not forced: a “does not follow” shape shown on a
picture where the claim is true; a conflict item). Pack: draw the givens, a claim that follows, the trap, the card that
breaks it. The wrong answer’s explanation draws the card that breaks the claim (fits every given, breaks the claim).

**Terms.** syllogism (two givens and a claim). **Distinction.** `here-vs-forced` (true in this picture vs follows: true
in every picture the givens allow).

## s8.l6 · Every and some: who comes first

**Model.** A picture of two groups as rings side by side (`links` on the rings scene): kids on the left, friends on
the right, a line for each pair of friends (`LinkPic`). “Every kid has a friend” is true when each kid has at least one
line; “There is one friend of every kid” is true when one friend has a line to every kid (`holdsOn`). A picture is
“each” (every kid has a friend, no one friend of all), “shared” (one friend of every kid) or “gap” (a kid with no
line); one friend for all always gives each kid one. Pictures are drawn from random lines and their shape is read off
the lines. The test works every answer out again on the table of who is friends (rows kids, columns friends), and
checks both sentences on every picture of 2-3 kids and 2-3 friends. Skins: kids and friends (everyday), elves and
dragons (fantasy), dots and stars (abstract).

**See.** Every kid has a friend (Ava has Kim, Ben has Lia, Cal has Kim: true; the friends can be different) · One friend
of every kid (Lia has a line to Ava, Ben and Cal: true; one for all gives each one, not the other way) · Who comes first?
(contrast: the same picture, Ava with Kim and Ben with Lia; “Every kid has a friend.” true, “There is one friend of every
kid.” false) · Example: check the picture (check each kid, then each friend).

**Do.** `s8.l6-do-order` “Each has one, or one for all?” right after the contrast (scaffold full): three pictures with
two kids and two friends (each: true, false; shared: true, true; gap: false, false), each marked for both sentences.
Catches `each-vs-shared` both ways. `s8.l6-do-check` “Check each kid, then each friend” after the example: twin “The same
kids and friends. Now Cal’s line goes to Kim, not Lia.” Each kid has a friend (yes, yes, yes), each friend a friend of
every kid (Kim yes, Lia no), then both sentences (true, true).

**Quiz.** `orderTruthItem` (is the sentence true for this picture?), `orderWhichItem` (both, only “every”, only “one”,
or neither; “only one friend of every kid” can’t happen), `orderPictureItem` (three pictures with the same names: in
which one is the sentence true?) and `orderLineItem` (which new line makes “There is one friend of every kid” true).
Skill `s8.order`. Trap tag `each-not-shared` (“Every kid has a friend” on a picture where each kid has a different
friend: true; a conflict item). Pack: “one friend of every kid”, the trap, which picture, which new line.

**Terms.** none (the lesson uses kid words only). **Distinction.** `each-vs-shared` (each has one vs one for all).

## The stop

- **Check:** 10 items, one or two from each lesson in order, then the why item last: tap a ring, place or count (l1);
  an all or no sentence or which is true, and the some-all trap (l2); the opposite of “all” (l3); an “all” about an
  empty ring (l4); a claim that follows, the card that breaks it or draw the givens, and the not-forced trap (l5); the
  each-not-shared trap, and which sentences, which picture or which new line (l6); and `whyItem` (tag `why`; its family
  is some-all, counter or empty, and it is filed under that family’s lesson, `WHY_LESSON`). Conflict items: the
  some-all trap, the empty “all”, the not-forced claim and the different-friend picture. (Before lessons 5 and 6 the
  check had 9 items, two per lesson; the second l1, l3 and l4 items made room for the new lessons.)
- **Warm-up (bridge):** a Stop 7 pattern item (shown as Stop 8): a streak of draws, then one new draw breaks an “every”
  sentence. It is stored as a Stop 7 item (`s7.l1`, skill `s7.pattern-break`).
- **Arcade:** one item from any lesson. **New examples:** a true-or-false miss gets one true and one false; a missed trap
  gets the trap again and its other side; a missed why gets two whys of other families; a missed “does it follow?” gets
  the trap and a claim that follows; a missed picture item gets one for each sentence.
- **Skill names:** `s8.member`, `s8.quantify`, `s8.negate`, `s8.empty`, `s8.why`, `s8.syllogism` (does a claim follow
  from two givens about groups?), `s8.order` (“every kid has a friend” or “one friend of every kid”).
- **World:** `src/content/world/s8.ts` (lessons 5 and 6: a why and three uses each; lines for `s8.syllogism` and
  `s8.order`). **Test:** `src/engine/__tests__/quantifiers.test.ts` (the model; which ring a card goes in; true or false
  by counting; opposites and the card that breaks it; the closing why item; the warm-up; the lessons; the check; the
  cards and boards; reading level, quotes and symbols; lesson 5 on real cards; lesson 6 on the table of friends; the
  new pictures read aloud).
- **Pictures:** the rings scene now also draws three rings (parts `c`, `ac`, `bc`, `abc`), crossed-out parts (gray
  stripes) and starred parts, and a links picture (two groups side by side with lines, one frame or several). The words
  for each are in `ringsSpeech` (`src/game/speech.ts`): one gray or starred part per sentence, and one sentence per name
  on the left of a links picture (“Ava: a line to Kim.”, “Ben has no line.”), so no spoken sentence runs long.

## Plan and code

- The plan names two distinctions (everyday “some” vs logic’s “some”; “not all” vs “none”). The code teaches both and
  two more: `in-vs-only` (l1) and `break-vs-make` (l4), each with a contrast card and a board.
- The plan’s terms are all, some, none, not all and counterexample; the code adds set and overlap (l1), opposite (l3)
  and empty set (l4).
- The plan’s empty-ring example is “No dragons in the cave”; the code’s worked example is a dragon’s cave of gems with no
  triangle gem, and the card sentences use shapes and colors.

## Review

This sheet was written from the code: the stop file, the engine module and a run of every lesson’s cards, boards, packs
(40 seeds), the check and the warm-up through the stop definition. It records no browser pass; the plan’s §6 status
lists the browser passes for the whole curriculum.
