# Drill worksheet: Stop 9 (All, Some, None, id s8)

Source: the curriculum plan (`docs/CURRICULUM-PLAN.md`, §3 “s8 All, Some, None”). The stop keeps its id `s8` and is shown
as Stop 9 on the Journey, after Ways to Think. It was built under the house rules from the start, so this sheet records
what each lesson does rather than repairs.

The stop is one file, `src/content/stop8.ts`. Every item, ring picture and board comes from
`src/engine/puzzles/quantifiers.ts`, and its own test file is `src/engine/__tests__/quantifiers.test.ts`, which works
every answer and board mark out again by counting. The contract test (`stops.test.ts`) checks the cards, boards, quiz
packs, reading level, the closing why item and the warm-up like every other stop.

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

## The stop

- **Check:** 9 items, two from each lesson in order, then the why item last: tap a ring, place or count, an all or no
  sentence (or which is true), the some-all trap, the opposite of “all”, the card that breaks it or one is enough, an
  “all” about an empty ring, another empty or filled ring, and `whyItem` (tag `why`; its family is some-all, counter or
  empty, and it is filed under that family’s lesson, `WHY_LESSON`).
- **Warm-up (bridge):** a Stop 7 pattern item (shown as Stop 8): a streak of draws, then one new draw breaks an “every”
  sentence. It is stored as a Stop 7 item (`s7.l1`, skill `s7.pattern-break`).
- **Arcade:** one item from any lesson. **New examples:** a true-or-false miss gets one true and one false; a missed trap
  gets the trap again and its other side; a missed why gets two whys of other families.
- **Skill names:** `s8.member`, `s8.quantify`, `s8.negate`, `s8.empty`, `s8.why`.
- **World:** `src/content/world/s8.ts`. **Test:** `src/engine/__tests__/quantifiers.test.ts` (the model; which ring a card
  goes in; true or false by counting; opposites and the card that breaks it; the closing why item; the warm-up; the
  lessons; the check; the cards and boards; reading level, quotes and symbols).

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
