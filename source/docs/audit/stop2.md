# Wrong-answer audit: Stop 2 (NOT, AND, OR)

Every Stop 2 item now carries `teach`: the operator’s meaning, the words it needs defined in place, and two to four
worked cards whose part and rule truths are computed by `evaluate()`. Every wrong choice of every choose item has its
own `ChoiceFeedback`, with a headline naming that answer’s gap, a detail that says where it fails, and a
counterexample card. Tap-all items name the classic misreadings and every one-card slip, so `grade()` names the exact
card and why it fits or not. Choice ids that came from a position after a shuffle (`c1`…`c4`, `r1`…`r3`) now come
from the card or the rule, and `StopDef.fresh` gives a pair of new examples where a skill has two edges (OR with a
both-parts card and a one-part card; NOT ( … ) with AND inside and with OR inside). Ambiguous prompts and idea cards
were reworded: the question’s “not” is lowercase so it cannot be read as part of a rule, “mean the same” is defined in
its prompt, and every “both” now says “both parts”.

Two passes: the migration, then a second review that read every lesson’s practice (20 seeds), the check (10 seeds),
the Arcade (20 seeds) and the new examples after a miss, and recomputed every claim. The second review’s findings
(R1–R15) are listed after the table; rows it changed say so in the Reviewer column.

Option ids: count choices are `n<count>` (`n4`), card choices are the card (`big-red-circle`), rule choices are the
rule (`not-[red-and-big]`, `circle-or-blue`), NOT x groups are `v-<values>` (`v-blue`, `v-blue-yellow`), and yes/no
choices are `yes` and `no`. Tap-all answers have no choice ids: a wrong answer is the set of tapped cards.

| Lesson / generator | Skill | Wrong option (id) | Missing definition or reasoning step (before) | Counterexample now shown | Revised headline | Fresh check | Reviewer | Test status |
|---|---|---|---|---|---|---|---|---|
| All tap-all generators (L1 `notTap`, L2 `andTap` `andNotTap`, L3 `orTap`, L4 `notAndTap` `notOrTap` `groupTap`) | s2.not, s2.and, s2.and-not, s2.or-both, s2.not-both, s2.not-either, s2.brackets-first | One card left out, one card too many, every card, or no card | `grade()` fell back to “You left out 1 card that fits.” No card named, no reason. | The slipped card, worked step by step: “It is red, and it is not big. So the inside, “red AND big,” is false. NOT flips false to true, so it fits …” | “Your answer leaves out the small blue square.” / “Your answer takes the big red circle, but it does not fit.” / “Your answer takes every card, but not every card fits.” / “Your answer has no cards, but 4 cards fit “NOT red.”” | Per skill (rows below) | Migration; review R6 (no-card title names the gap) | Pass: T-tap, T-read, T-empty |
| L1 `notTap` | s2.not | The NOT x group (all red cards for “NOT red”) | Said “NOT red means every card that is not red” but not that NOT flips the part, and showed no card. | A red card: “It is red, so “NOT red” leaves it out.” | “Your answer takes the red cards, the cards “NOT red” leaves out.” | Default: a new s2.not item | Migration, reviewed | Pass: T-tap |
| L1 `notTap` | s2.not | One other value only (NOT red read as “blue”) | Said yellow cards fit too, not why (they are not red either). | A card of the missing value: “the small yellow square is not red, so it fits.” | “Your answer leaves out the yellow cards.” | Default | Migration, reviewed | Pass: T-tap |
| L1 `notMeans` | s2.not-means | `v-blue` “Only blue cards” (one other value) | Same as above; no card, “every other” not explained. | A yellow card. It is red: false. It fits “NOT red”: true. Your answer includes it: false. | “Your answer leaves out the yellow cards.” | Default | Migration, reviewed | Pass: T-truth, T-proof, T-kind |
| L1 `notMeans` | s2.not-means | `v-red` “Only red cards” (the left-out group) | No card; NOT not defined as a flip. Then (R4) “A square is a square, so it does not fit …”. | A red card: fits “NOT red”: false, your answer includes it: true. Detail: “A card that is red does not fit “NOT red.”” | “Your answer is the red cards, the cards “NOT red” leaves out.” | Default | Review R4: detail reworded | Pass: T-truth, T-proof, T-kind, T-terms |
| L1 `notMeans` | s2.not-means | `v-big-small` “Big cards and small cards” (for NOT big) | Got the left-out-group message. Then (R4) “Small shields and big shields make up every shield. But a small shield is small …”. | A big card: fits “NOT big”: false, your answer includes it: true. Detail: “Every card is big or small, so your answer takes every card. But a card that is big does not fit “NOT big.”” | “Your answer takes every card, even the big cards.” | Default | Review R4: detail reworded | Pass: T-truth, T-proof, T-kind, T-terms |
| L1 `notCount` | s2.not-count | `n<count of x>` The count of the NOT x group | “You counted the red cards” claimed the player’s reasoning; no card. Then (R1) in 42 of 258 items this count was the right answer. | A shown red card, with “It is one of the 2 red cards. It does not count.” | “2 is the number of red cards, the cards “NOT red” leaves out.” | Default | Review R1: cards redrawn until this count is wrong | Pass: T-proof, T-kind, T-notcount |
| L1 `notCount` | s2.not-count | `n<count of one other value>` | Said the other color fits, not why. | A shown card of the missing value: “It is not red, so it counts.” | “Your answer leaves out the yellow cards.” | Default | Migration, reviewed | Pass: T-proof, T-kind |
| L1 `notCount` | s2.not-count | `n<all>` The count of every card | No card. | A shown red card: “It is red. It does not count.” | “Your answer, 7, counts every card, even the red cards.” | Default | Migration, reviewed | Pass: T-proof, T-kind |
| L2 `andTap`, `andNotTap` | s2.and, s2.and-not | Cards that fit just one part (AND read as OR) | “AND needs both parts” with no card. Then (R7) a NOT part was judged without its flip. | A one-part card: “It is not red, and it is not small. So “NOT small” is true. The part “red” is false. AND needs both parts, so it does not fit.” | “Your answer takes cards that fit just one part.” | Default | Review R7: NOT part flipped in words | Pass: T-tap, T-claims, T-flip |
| L2 `andTap`, `andNotTap` | s2.and, s2.and-not | Every card with the first (or second) feature | “Each one must also be a circle”; no card. | A card with that feature that fails the other part. | “Your answer takes all the red cards, but some of them are not circles.” | Default | Migration, reviewed | Pass: T-tap |
| L2 `andNotTap` | s2.and-not | Drops the NOT (takes red circles for “red AND NOT a circle”) | “You missed the NOT”; no card. Then (R7) “The part “NOT small” is false” without the flip. | A red circle: “It is red, and it is a circle. So “NOT a circle” is false. AND needs both parts, so it does not fit.” | “Your answer leaves out the NOT in “NOT a circle.”” | Default | Review R7 | Pass: T-tap, T-flip |
| L2 `andPick` | s2.and-pick | `<card id>` A card that fits one part | Choice id was its position (`c1`…`c4`). No rule-level reason. | The chosen card. It is red: true. It is a circle: false. It fits “red AND a circle”: false. | “Your card fits only one part: it is red, but it is not a circle.” | Default | Migration, reviewed | Pass: T-proof, T-kind, T-ids |
| L2 `andPick` | s2.and-pick | `<card id>` A card that fits no part | Positional id; listed the features only. | The chosen card, both parts false; its own simpler example. | “Your card fits no part of the rule.” | Default | Migration, reviewed | Pass: T-proof, T-kind, T-ids |
| L2 `andCount` | s2.and-count | `n<at least one part>` | “You counted cards that fit either part” (reasoning claim); no card. | A shown one-part card: “It fits one part, so it does not count.” | “5 is the number of cards that fit at least one part.” | Default | Migration, reviewed | Pass: T-proof, T-kind |
| L2 `andCount` | s2.and-count | `n<count of one feature>` | No card. | A shown card with that feature that fails the other part. | “3 is the number of circles, but some of them are not small.” | Default | Migration, reviewed | Pass: T-proof, T-kind |
| L3 `orTap`, L4 `groupTap` | s2.or-both, s2.brackets-first | Leaves out cards that fit both parts (OR read as “one but not both”) | “In logic, OR includes both”: “both” never said what it refers to. Then (R12) plural with one such card. | A card that fits both parts: “Both parts of “a circle OR blue” are true. OR takes a card that fits both parts, so it fits.” | “Your answer leaves out the cards that fit both parts.” (one card: “the card that fits both parts”; in brackets: “… both parts of “a circle OR blue.””) | OR: the same skill, then a yes/no card that fits both parts | Review R12 | Pass: T-tap, T-fresh, T-sound |
| L3 `orTap`, L4 `groupTap` | s2.or-both, s2.brackets-first | Takes only cards that fit both parts (OR read as AND) | “With OR, one part is enough”; no card. | A one-part card that fits. | “Your answer takes only the cards that fit both parts.” (one card: “the card that fits both parts”) | As above | Review R12 | Pass: T-tap, T-fresh |
| L3 `orTap` | s2.or-both | Takes one feature only | Named the other group, no card. | A card with the other feature only. | “Your answer takes only the circles.” | As above | Migration, reviewed | Pass: T-tap |
| L3 `orYesNo` | s2.or-yesno | `no` for a card that fits both parts | “OR includes both”: unexplained “both”. | The card; both parts true; the rule true. | “Your answer leaves out a card that fits both parts.” | Pair: a both-parts card and a one-part card | Migration, reviewed | Pass: T-proof, T-kind, T-fresh |
| L3 `orYesNo` | s2.or-yesno | `yes` for a card that fits no part | Reason without a worked card. | The card; both parts false; its own simpler example. | “This card fits no part of the rule.” | Pair: a no-part card, then a both-parts card | Migration, reviewed | Pass: T-proof, T-kind, T-fresh |
| L3 `orYesNo` (new examples only) | s2.or-yesno | `no` for a card that fits one part | Not offered before. | The card; one part true. | “This card fits one part, and one part is enough for OR.” | Pair: a one-part card and a both-parts card | Migration, reviewed | Pass: T-proof, T-kind, T-fresh |
| L3 `orNotFit` | s2.or-pick | `<card id>` The card that fits both parts | Positional id; “OR includes both”. Prompt’s capital NOT (“does NOT fit the rule …”) could be read as part of the rule. | The chosen card, fits the rule: true; a line that the question asks for the card that does not fit. | “Your card fits both parts, so it fits the rule.” | The same skill, then a both-parts yes/no card | Migration, reviewed | Pass: T-proof, T-kind, T-ids, T-fresh |
| L3 `orNotFit` | s2.or-pick | `<card id>` A card that fits one part | Positional id; no rule-level reason. | The chosen card; its own simpler example. | “Your card fits one part, and one part is enough for OR.” | As above | Migration, reviewed | Pass: T-proof, T-kind, T-ids |
| L3 `orCount` | s2.or-count | `n<without the both-parts cards>` | “You left out the cards that are both.” Then (R12) plural with one such card. | A shown both-parts card: “It fits both parts, so it counts.” | “Your answer, 4, leaves out the card that fits both parts.” | The same skill, then a both-parts yes/no card | Review R12 | Pass: T-proof, T-kind, T-fresh |
| L3 `orCount` | s2.or-count | `n<both-parts cards only>` | Reasoning claim; no card. Then (R12) “counts only the tiles that fit both parts” for 1 tile. | A shown one-part card: “It fits one part, so it counts.” | “Your answer, 1, counts only the card that fits both parts.” | As above | Review R12 | Pass: T-proof, T-kind |
| L3 `orCount` | s2.or-count | `n<count of one feature>` | No card. | A shown card with the other feature only. | “Your answer, 2, counts only the yellow cards.” | As above | Migration, reviewed | Pass: T-proof, T-kind |
| L4 `notAndTap` | s2.not-both | Only cards that are not red and not big (De Morgan error) | “Keeps every card that is not both”: “not both” undefined. | A one-part card: “So the inside, “red AND big,” is false. NOT flips false to true, so it fits.” | “Your answer takes only the cards that are not red and not big.” | Pair: NOT (A AND B), then NOT (A OR B) | Migration, reviewed | Pass: T-tap, T-fresh |
| L4 `notOrTap` | s2.not-either | Cards that fit one part of the inside (De Morgan error) | “Means the card is neither one”: “neither” undefined there. | A one-part card: inside true, NOT flips to false. | “Your answer takes cards that fit one part of “red OR big.”” | Pair: NOT (A OR B), then NOT (A AND B) | Migration, reviewed | Pass: T-tap, T-fresh |
| L4 `notAndTap`, `notOrTap` | s2.not-both, s2.not-either | NOT on the first part only (brackets skipped) | “The NOT covers the whole bracket”; no card. Then (R5) the rule the answer fits was never named. | “It takes the cards that fit “NOT red AND big.” But the NOT covers the whole bracket, “red AND big.”” Then a card where the two readings disagree, worked through the brackets. | “Your answer puts the NOT on “red” alone.” | As above | Review R5 | Pass: T-tap, T-skip |
| L4 `notAndTap`, `notOrTap` | s2.not-both, s2.not-either | The cards that fit the inside of the brackets | “NOT takes every other card”; no card. | A card outside the inside group that fits. | “Your answer takes the cards that fit the inside of the brackets, “red AND big.”” | As above | Migration, reviewed | Pass: T-tap |
| L4 `groupTap` | s2.brackets-first | Last part left out (“NOT yellow”): exactly the cards that fit the brackets | “You forgot the last part” (reasoning claim); no card. Then (R2) hidden behind “skips the brackets” in 175 of 265 items, where the two sets are the same. | A card that fits the brackets but not the last part: “It takes every card that fits “red OR a circle,” even one that is yellow.” | “Your answer leaves out the last part, “NOT yellow.”” | Default | Review R2: named first | Pass: T-tap, T-inside |
| L4 `groupTap` | s2.brackets-first | Brackets skipped (only when it differs from the row above) | “Do the brackets first”; no card. Then (R2) “Do “red OR a circle” first, then check …” did not say what the brackets require. | “A card must fit “red OR a circle,” and it must also fit “NOT yellow.”” Then a card that fits the first part but not the last part. | “Your answer skips the brackets.” | Default | Review R2 | Pass: T-tap |
| L4 `bracketYesNo` | s2.bracket-yesno | `no` for a one-part card against NOT (A AND B) | “It is not both”: “both” undefined. Then (R3) “Your answer misses that …”, and “So “red AND big” is false” without “AND needs both parts”. | The card: It is red: true. It is big: false. It fits “red AND big”: false. It fits “NOT (red AND big)”: true. | “This card fits, because the inside of the brackets is false for it.” | Pair: the same card type against NOT (A AND B) and NOT (A OR B), one yes and one no | Review R3 | Pass: T-proof, T-kind, T-fresh, T-yesno |
| L4 `bracketYesNo` | s2.bracket-yesno | `yes` for a one-part card against NOT (A OR B) | No worked card. Then (R3) “So “red OR big” is true” without “one part is enough for OR”. | The card: inside true, whole rule false. | “This card does not fit, because the inside of the brackets is true for it.” | As above | Review R3 | Pass: T-proof, T-kind, T-fresh, T-yesno |
| L4 `sameMeaningPick` | s2.same-meaning | `not-red-and-not-big` Keeps the joining word when the NOT moves inside (for NOT (red AND big)) | Positional ids (`r1`…`r3`). Only “Think of a card …”: the switch rule was not stated. “Mean the same” undefined in the prompt. Then (R9, R10) no smallest example of its own; “the joining word” defined but never used. | A card where the two rules disagree, with the question’s rule, your answer and the right answer each marked true or false; its own simpler example on that card. | “Your answer keeps AND when the NOT moves inside the brackets.” | Pair: one NOT (A AND B) and one NOT (A OR B), the missed kind first | Review R9, R10, R11 | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh, T-same |
| L4 `sameMeaningPick` | s2.same-meaning | `not-red-and-big` A NOT on only one part | As above. | As above. | “Your answer puts a NOT on only one part.” | As above | Review R9 | Pass: T-truth, T-proof, T-kind, T-ids, T-same |
| L4 `sameMeaningPick` | s2.same-meaning | `not-[red-and-big]` Keeps the joining word when the NOT moves outside (for NOT red AND NOT big) | As above. Then (R15) “When one NOT moves outside …”. | As above. Detail: “When the two NOTs become one NOT outside the brackets, AND must switch to OR.” | “Your answer keeps AND when the NOT moves outside the brackets.” | As above | Review R9, R15 | Pass: T-truth, T-proof, T-kind, T-ids, T-same |
| L4 `sameMeaningPick` | s2.same-meaning | `not-red-or-not-big` Switches the joining word but keeps the NOTs (for NOT red AND NOT big) | As above. | As above. | “Your answer switches AND to OR, but it keeps a NOT on each part.” | As above | Review R9 | Pass: T-truth, T-proof, T-kind, T-ids, T-same |
| L5 `guess` (easy, OR, hard) | s2.guess-rule | `<rule id>` A rule that says no to a card with a yes | Positional ids (`r1`…`r3`). One sentence, no worked steps; “rule out” defined only on an idea card. Then (R8) the secret rule’s truth was unlabelled (“It fits “red AND big”: true”). | The ruling card with its mark: It got a yes: true. It fits your answer: false. It fits the right answer: true. Its own simpler example. | “Your rule says no to the small blue triangle, but it got a yes.” | Default: a new guess-the-rule item | Review R7, R8 | Pass: T-truth, T-proof, T-kind, T-ids, T-guess |
| L5 `guess` (easy, OR, hard) | s2.guess-rule | `<rule id>` A rule that says yes to a card with a no | As above. | As above, with the mark no. | “Your rule says yes to the big blue triangle, but it got a no.” | Default | Review R7, R8 | Pass: T-truth, T-proof, T-kind, T-ids, T-guess |

## Second review: findings and fixes

Each finding names the seed, the item and the words that were shown at commit `5efcab0`. All are fixed in
`src/content/stop2.ts`, with a regression test in `src/engine/__tests__/rules.test.ts` (block “stop 2 review: the
fixes stay fixed”) that fails on `5efcab0` and passes now.

- **R1, item validity (not-count).** When exactly half the cards had the feature, counting those cards (the NOT read the
  wrong way round) gave the right answer, so the item rewarded the mistake. Seed 2, `s2.l1-p4`: “How many cards fit the
  rule NOT big?” with 4 big and 4 small cards, choices 4 and 8, and “There are 4 big cards. Every other card fits “NOT
  big,” so the answer is 4.” 42 of 258 not-count items (lessons and checks, seeds 1–200). Fix: the cards are drawn
  again until the two counts differ, so the classic mistake is always a wrong choice with its own feedback. Answers are
  still computed; only the card draw changes. Test: T-notcount.
- **R2, headline (brackets first).** An answer that is exactly every card fitting the brackets was named “Your answer
  skips the brackets. Do “big OR a circle” first, then check “NOT blue.”” (seed 1, `s2.l4-p5`, set
  {c1,c3,c5,c6,c7,c8,c9}). In 175 of 265 items the skipped-brackets set is the same set, and “leaves out the last part”
  was never shown. Fix: the last-part message comes first and says what the answer takes (“It takes every tile that
  fits “big OR a circle,” even one that is blue.”); the skipped-brackets message now says what the brackets require.
  Test: T-inside.
- **R3, headline and skipped step (bracket yes/no).** “Your answer misses that the inside of the brackets is true for
  this tile.” describes reasoning, not the answer, and the detail “The small yellow square is yellow. So “yellow OR a
  circle” is true.” skipped “one part is enough for OR” (seed 2, `s2.l4-p2`); the AND case skipped “AND needs both
  parts” (seed 1, `s2.l4-p2`). Fix: “This tile does not fit, because the inside of the brackets is true for it.” and
  the step named in the detail. Test: T-yesno.
- **R4, wording (not-means).** “A square is a square, so it does not fit “NOT a square.”” (seed 1, `s2.l1-p2`, `v-square`)
  and “Small shields and big shields make up every shield. But a small shield is small …” (seed 7, `s2.l1-p2`,
  `v-small-big`). Fix: “A tile that is a square does not fit “NOT a square.”” and “Every shield is small or big, so your
  answer takes every shield.” Test: T-terms (no “A square is a square”).
- **R5, vague direction (NOT ( … ) taps).** “Your answer puts the NOT on “a square” alone. The NOT covers the whole
  bracket …” never said which cards that reading takes (seed 1, `s2.l4-p1`, set {c4}). Fix: “It takes the cards that fit
  “NOT a square AND big.”” computed with `withoutBrackets()`. Test: T-skip.
- **R6, headline (tap-all, no card).** The title was “Your answer has no cards.” (seed 1, `s2.l1-p1`), which names no
  gap. Fix: “Your answer has no cards, but 4 cards fit “NOT a triangle.”” Test: T-empty.
- **R7, skipped step (a NOT part).** “The small blue triangle is blue, and it is small. The part “NOT small” is false.”
  (seed 1, `s2.l2-p3`, set {c5}) asked the reader to flip in their head, in the lesson about AND NOT. Fix: “… and it is
  small. So “NOT small” is false. AND needs both parts, so it does not fit.” The same in guess-the-rule details. Test:
  T-flip, T-claims.
- **R8, unlabelled truth (guess the rule).** The example card said “It fits “yellow AND big”: false.” without saying
  that rule is the right answer (seed 1, `s2.l5-p1`, `yellow`); the worksheet claimed “It fits the secret rule”. Fix:
  “It fits the right answer, “yellow AND big”: false.” Test: T-guess.
- **R9, wrong title and no example of its own (same meaning).** The cases title “Check every kind of card with each
  rule.” showed only two of the three rules, and a wrong choice’s “Explain more simply” showed a card where the
  question’s rule and the right answer both say no, which says nothing about the pick (seed 1, `s2.l4-p4`). Fix: “Test
  the question’s rule and the right answer on every kind of card.”, and each wrong choice gets its own simpler example
  on the card that tells it apart (“Does it fit your answer, “NOT (a circle AND yellow)”? Yes.”). Test: T-same.
- **R10, defined but unused word (same meaning).** “The joining word means the AND or the OR between two parts.” was
  defined on every same-meaning item and never used. Fix: the rule says “put a NOT on each part and switch the joining
  word”, and Remember asks “When the NOT moved, did the joining word switch?” Test: T-terms (every defined word is used).
- **R11, fresh check order (same meaning).** After a miss on an OR pair, the first new example was an AND pair (seed 1:
  missed “NOT a circle AND NOT yellow”, first new example “NOT (small AND a triangle)”). Fix: the missed kind first, then
  the other kind. Test: T-fresh.
- **R12, “both parts” with one card.** “Your answer, 1, counts only the tiles that fit both parts.” and “Your answer
  leaves out the cards that fit both parts.” when one card fits both parts (seed 1, `s2.l3-p5` `n1`; seed 1, `s2.l3-p1`
  set {c3,c4}). Fix: “the tile that fits both parts”. Test: T-sound.
- **R13, “neither” without a referent (idea cards).** “So the card is neither one. Neither means not one and not the
  other.” (Lesson 4, “NOT (red OR big)”) and “Every no card is neither.” (Lesson 5). Fix: “So a card fits only when it is
  not red, and it is not big.” and “Every no card is not blue and not big.” Test: T-ideas.
- **R14, worksheet accuracy.** This worksheet had no Reviewer column and no option ids, said the guess-the-rule card
  showed “the secret rule”, and listed “last part left out” without noting R2. Fixed here.
- **R15, wording (same meaning, the other way round).** “When one NOT moves outside, AND must switch to OR.” (seed 1,
  `s2.l4-p4`) leaves “one NOT” unclear. Fix: “When the two NOTs become one NOT outside the brackets, AND must switch to
  OR.”

Checked and sound, no change needed: every answer (re-solved from the visible text over 200 lesson seeds, 400 check
seeds and 500 Arcade seeds); uniqueness (exactly one right choice; the migration changed no answer: comparing commit
`d8ce9c6` with `5efcab0` on 200 seeds, the only differences are the lowercase “not” in prompts and the item after the
same-meaning item, whose card draw moved because the same-meaning item no longer uses the rng for its feedback card);
choice ids under shuffling; reading level. A separate checker recomputed about 30,000 claims about cards, parts,
counts and sets in 830 items and found none false.

## Test key

The last column names tests in `src/engine/__tests__/rules.test.ts`, blocks “stop 2 wrong answers teach first” and
“stop 2 review: the fixes stay fixed”. Each runs over 40 seeds of every lesson, the check and the Arcade, plus the new
examples after a miss (T-notcount runs 300 seeds).

- **T-teach**: every item has a rule, 1-3 terms (the item’s operator among them), its meaning, 2-4 worked cards,
  Remember with an “Ask: …?” question, and a simpler example.
- **T-truth**: every truth on every worked card and example card is recomputed from the card the label names (its
  features, a rule parsed from the quote, its mark, or the chosen answer’s groups).
- **T-cover**: the worked cards cover every way the rule can go (all four part combinations; every value for NOT x;
  a yes card, a no card and a card that rules out each wrong rule for guess-the-rule).
- **T-proof**: every wrong choice has feedback, `whyWrong` is in step, and the example card proves the gap.
- **T-kind**: each mistake kind, found from what the player sees, has its own headline (26 kinds), and no headline
  serves two kinds.
- **T-ids**: a label always has the same id, ids are not positions, and reversing the choices keeps each explanation.
- **T-tap**: every one-card slip, every card, no card, and each named misreading has a diagnose; `grade()` returns it;
  its first sentence is the explanation’s title; every “so it fits” or “does not fit” claim is true for its card.
- **T-fresh**: new examples keep the skill first, and the pairs above have one item of each edge (same meaning: the
  missed kind first).
- **T-read**: each item’s full text reads at grade 7 or lower, with no sentence over 25 words.
- **T-quote**: curly quotes with the period inside, every quote a rule, a defined word or a question, “both” only as
  “both parts”, and no “the opposite” or “that row”.
- **T-sound**: every item re-solved from what the player sees; OR read as “one but not both” is named by the cards that
  fit both parts, singular when there is one.
- **T-claims**: every claim about a card in an explanation (its features, a part, the inside of the brackets, “both
  parts”, “no part”) is recomputed on that card.
- **T-flip**: in AND NOT taps, the NOT part is flipped in words (“So “NOT small” is false.”) and not named twice.
- **T-notcount**: counting the x cards is never the right count for NOT x, and that count is offered with its feedback.
- **T-inside**: an answer that is exactly the brackets’ cards is named “leaves out the last part”, with a card the last
  part leaves out.
- **T-skip**: NOT ( … ) read without brackets names the rule the answer fits, and that rule takes exactly the tapped
  cards.
- **T-empty**: the no-card title says how many cards fit.
- **T-yesno**: bracket yes/no headlines say what the card does and why; the detail names “AND needs both parts” or
  “one part is enough for OR”.
- **T-terms**: every defined word is used in the explanation; no “A square is a square”.
- **T-guess**: the example card labels the right answer.
- **T-same**: each wrong same-meaning choice has its own simpler example on the card that tells it apart.
- **T-ideas**: idea cards never say “neither”, or “both” without “parts” or “checks”.

The contract test `COVERAGE_ALL=1 STOP=2 npx vitest run src/engine/__tests__/stops.test.ts` passes for all five
lessons.

## Prompt and idea-card changes

- “Which card does NOT fit the rule a circle OR blue?” could be read as the rule “NOT a circle”. Every “which does
  not fit” prompt now uses a lowercase “not”.
- “Which rule means the same as NOT (red AND big)?” now adds: “Two rules mean the same when they fit exactly the same
  cards.”
- Idea cards: “NOT is not the opposite color” is now “NOT red is not one other color”. “In logic, OR includes both”
  is now “OR includes a card that fits both parts”. “a circle OR blue (or both)” is now “takes circles, it takes blue
  cards, and it takes blue circles too”. “So the card is neither one. Neither means not one and not the other.” is now
  “So a card fits only when it is not red, and it is not big.” “Every no card is neither.” is now “Every no card is not
  blue and not big.”
- Titles: “OR: either one, or both” is now “OR: one part or both parts”; “AND needs both” is now “AND needs both
  parts”; the Journey line “OR is happy with either, or both” is now “OR needs one part or both parts”.

## Not changed here (shared files)

Done after the migration:

- `stops.test.ts` now requires the contract on every lesson of every built stop.
- `grade()` for tap-all answers now describes the answer and names each card: “Your answer leaves out 1 card that
  fits, and it has 1 card that does not fit.” Then “This card fits but is not in your answer: the big red triangle.”
  The explanation also shows just those cards as a picture, badged ✓ (fits) and ✗ (does not fit).

Still open: the read-aloud list below. The notes as first written:

- `stops.test.ts`: `MIGRATED` can now list `s2.l1` to `s2.l5`. They pass with `COVERAGE_ALL=1 STOP=2`.
- `grade()` for tap-all answers with two or more wrong cards still says “You left out 2 cards that fit. You tapped 1
  card that does not fit.” That title also says “You left out”, which claims what the player did. The teach cards
  follow, so the route is complete, but naming each card would need a per-card tip on `TapAllItem` (like
  `MultiItem.missTips` and `pickTips`) in `types.ts` and `grade.ts`, and the fallback should read “Your answer leaves
  out 2 cards that fit.”
- `describeAnswer()` reads a tap-all answer of 8 to 10 cards as one list (“Your answer: big red circle, …”) of up to
  33 words in the read-aloud. Splitting it into shorter lines is a change to `src/game/describe.ts`.
