# Wrong-answer audit: Stop 6 (If… then)

Every Stop 6 item now carries `teach`: the idea in plain words, the IF part and THEN part defined with the rule’s own
words, what the rule says and the one case that breaks it, and the rows of the four-row truth table told in the
story’s words (“Rex is not a dog and has four legs.”), with the IF part, the THEN part and the rule marked true or false
by `litHolds()` and `ruleHolds()`. Every wrong choice of every choose item has its own `ChoiceFeedback`: a headline
naming that answer’s gap, the steps where it fails, a counterexample row, and (where the item-level example is about a
different mistake) its own simpler example. The rule checker’s `missTips` and `pickTips` open with the card the answer
left out or picked and the part its face or back shows, so `grade()` gives a specific title, and every tip names the
backs that keep or break the rule. Positional choice ids (`c1`…`c4` in “Who broke the rule?”, `s1`…`s4` in “Which
sentence means the same?”) are now fixed by the case or the sentence (`if-not-then`, `flip-only`), and `StopDef.fresh`
gives new examples in another story for every skill: the same situation again, then (where a skill has an edge) its
boundary partner.

| Lesson / generator | Skill | Wrong option | Missing definition or reasoning step (before) | Counterexample now shown | Revised headline | Fresh check | Test status |
|---|---|---|---|---|---|---|---|
| L1 `whoBrokeItem` | s6.who-broke | A case where the IF part and the THEN part both happened | Choice id was its place after the shuffle (`c1`…`c4`). No case card. IF part, THEN part and “breaks the rule” not defined at the miss. | The picked case, e.g. “Jay got dessert and ate all the veggies.” IF part: true. THEN part: true. The rule: true. | “Your answer picks a case where the THEN part happened too, so the rule is kept.” | A new who-broke item in another story | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh |
| L1 `whoBrokeItem` | s6.who-broke | A case with the THEN part but not the IF part | Same message as the no-IF, no-THEN case; never said the THEN part can happen without the IF part. Positional id. | The picked case, e.g. “Kai did not get dessert and ate all the veggies.” IF part: false. THEN part: true. The rule: true. | “Your answer picks a case with the THEN part but not the IF part, and that keeps the rule.” | As above | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh |
| L1 `whoBrokeItem` | s6.who-broke | A case where neither part happened | Same message as the THEN-without-IF case. Positional id. | The picked case, e.g. “Eli did not get dessert and left some veggies.” IF part: false. THEN part: false. The rule: true. | “Your answer picks a case where the IF part did not happen, so the rule can’t be broken.” | As above | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh |
| L1 `didBreakItem` | s6.did-break | “No” for IF without THEN | One sentence, no case card, “breaks the rule” not defined. | The case in the question: IF part: true. THEN part: false. The rule: false. Plus all four cases, the asked one marked. | “Your answer misses that the IF part happened without the THEN part.” | Pair: the same case in a new story (Yes), then no IF and no THEN (No) | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh |
| L1 `didBreakItem` | s6.did-break | “Yes” for IF and THEN both happened | `whyWrong` repeated `explain`. No case card. | The case in the question: IF part: true. THEN part: true. The rule: true. | “Your answer says the rule was broken, but the THEN part happened too.” | Pair: the same case in a new story, then IF without THEN | Pass: T-truth, T-proof, T-kind, T-fresh |
| L1 `didBreakItem` | s6.did-break | “Yes” for THEN without IF | `whyWrong` was `explain` word for word, and the same as the no-IF, no-THEN case. | The case in the question: IF part: false. THEN part: true. The rule: true. | “Your answer counts the THEN part without the IF part as breaking the rule.” | Pair: the same case, then IF without THEN | Pass: T-truth, T-proof, T-kind, T-fresh |
| L1 `didBreakItem` (trap) | s6.did-break | “Yes” for no IF and no THEN | `whyWrong` was `explain` word for word. | The case in the question: IF part: false. THEN part: false. The rule: true. Its own simpler example: “Did the IF part happen? No. …” | “Your answer says the rule was broken, but the IF part did not happen.” | Pair: the same trap in a new story, then IF without THEN | Pass: T-truth, T-proof, T-kind, T-fresh |
| L2 `turnItem` (forward) | s6.forward | “Can’t tell” when the IF part is known | “You can tell.” No case showing why the other way is impossible. Prompt “Is it true?” did not match “Must be true / Can’t be true”. “Can’t tell” not defined at the miss. | “Rex is a dog and does not have four legs.” The rule: false. The sentence: (its value). This case breaks the rule, so it can’t happen here. | “Can’t tell” misses that the IF part happened. | Pair: a forward item in a new story (the same sentence: THEN or NOT THEN), then a backward item | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh |
| L2 `turnItem` (forward) | s6.forward | “False for sure” for the THEN part, or “True for sure” for NOT the THEN part | “This sentence says the opposite.” (“the opposite” unexplained). No case. | “Rex is a dog and does not have four legs.” The rule: false. The sentence: (its value). | “Your answer and the fact together break the rule.” | As above | Pass: T-truth, T-proof, T-kind, T-fresh |
| L2 `turnItem` (backward) | s6.backward | Concludes the IF part (“True for sure” for the IF part, or “False for sure” for NOT the IF part) | “The rule does not work backward. Rex could be a cat.” No case; the second form was not explained as the same claim. | “Rex is not a dog and has four legs.” Rex could be a cat. The rule: true. The sentence: (its value). | “Your answer goes backward, from the THEN part to the IF part.” | Pair: a backward item in a new story (the same sentence: IF or NOT IF), then a forward item | Pass: T-truth, T-proof, T-kind, T-fresh, R-words |
| L2 `turnItem` (backward) | s6.backward | Says the IF part did not happen (“False for sure” for the IF part, or “True for sure” for NOT the IF part) | “Rex could be a dog. Nothing in the rule stops that.” No case. | “Rex is a dog and has four legs.” The rule: true. The sentence: (its value). | “Your answer says the IF part did not happen, but it may have.” | As above | Pass: T-truth, T-proof, T-kind, T-fresh, R-words |
| L3 `moveItem` (IF happened) | s6.move-if | NOT the THEN part | “That can’t be true.” No case. | “Rex is a dog and does not have four legs.” The rule: false. Your answer: true. | “Your answer and the fact together break the rule.” | Pair: IF happened in a new story, then THEN happened (the trap it is mistaken for) | Pass: T-truth, T-proof, T-kind, T-fresh |
| L3 `moveItem` (IF happened) | s6.move-if | “Nothing follows for sure” | “Something does follow.” No case. “Nothing follows for sure” not defined at the miss. | The only other case that fits the fact: IF part: true. THEN part: false. The rule: false. | “Nothing follows for sure” misses that the IF part happened. | As above | Pass: T-truth, T-proof, T-kind, T-fresh |
| L3 `moveItem` (THEN did not happen) | s6.move-not-then | The IF part | “That can’t be true. Then the IF part would happen without the THEN part …” No case. | “Rex is a dog and does not have four legs.” The rule: false. Your answer: true. | “Your answer and the fact together break the rule.” | Pair: THEN did not happen in a new story, then IF did not happen | Pass: T-truth, T-proof, T-kind, T-fresh |
| L3 `moveItem` (THEN did not happen) | s6.move-not-then | “Nothing follows for sure” | “Something does follow …” No case. | The case “Imagine Rex is a dog”: IF part: true. THEN part: false. The rule: false. | “Nothing follows for sure” misses that the IF part can’t have happened. | As above | Pass: T-truth, T-proof, T-kind, T-fresh |
| L3 `moveItem` (THEN happened) | s6.trap-then | The IF part | “That might be true, but it does not have to be.” No case. “Backward” was never taught in lesson 3. | “Rex is not a dog and has four legs.” Rex could be a cat. The rule: true. Your answer: false. | “Your answer goes backward, from the THEN part to the IF part.” | Pair: THEN happened in a new story, then IF happened | Pass: T-truth, T-proof, T-kind, T-fresh, R-words |
| L3 `moveItem` (THEN happened) | s6.trap-then | NOT the IF part | “That might be true … Rex could be a dog.” No case. | “Rex is a dog and has four legs.” The rule: true. Your answer: false. | “Your answer says the IF part did not happen, but it may have.” | As above | Pass: T-truth, T-proof, T-kind, T-fresh, R-words |
| L3 `moveItem` (IF did not happen) | s6.trap-not-if | The THEN part | “That might be true … Rex could be a bird with two legs.” No case. | “Rex is not a dog and does not have four legs.” Rex could be a bird with two legs. The rule: true. Your answer: false. | “Your answer says the THEN part happened, but without the IF part it may not have.” | Pair: IF did not happen in a new story, then THEN did not happen | Pass: T-truth, T-proof, T-kind, T-fresh, R-words |
| L3 `moveItem` (IF did not happen) | s6.trap-not-if | NOT the THEN part | Same “might be true” message as the THEN part, with the other animal. | “Rex is not a dog and has four legs.” Rex could be a cat with four legs. The rule: true. Your answer: false. | “Your answer says no IF part means no THEN part.” | As above | Pass: T-truth, T-proof, T-kind, T-fresh |
| L4 `samePickItem` | s6.same-pick | Flip only | Positional ids (`s1`…`s4`). “A cat with four legs breaks that sentence” (“that sentence” vague). “Mean the same” not defined in the prompt. | “A cat with four legs.” The rule: true. Your sentence: false. The flip and NOT sentence: true. The meaning quotes the flip and NOT sentence the cases test. | “Your answer only flips the rule.” | A new same-pick item in another story | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh, R-quote |
| L4 `samePickItem` | s6.same-pick | NOT only | As above. | “A cat with four legs.” The rule: true. Your sentence: false. The flip and NOT sentence: true. | “Your answer only puts NOT in both parts.” | As above | Pass: T-truth, T-proof, T-kind, T-ids, T-fresh |
| L4 `samePickItem` | s6.same-pick | NOT in the THEN part only (“If P, then not Q”) | Positional id; the mistake was not named. | “A dog with four legs.” The rule: true. Your sentence: false. | “Your answer puts NOT in the THEN part only.” | As above | Pass: T-truth, T-proof, T-kind, T-ids |
| L4 `samePickItem` | s6.same-pick | NOT in the IF part only (“If not P, then Q”) | As above. | “A bird with two legs.” The rule: true. Your sentence: false. | “Your answer puts NOT in the IF part only.” | As above | Pass: T-truth, T-proof, T-kind, T-ids |
| L4 `samePickItem` | s6.same-pick | Flip, with NOT in the new THEN part only (“If Q, then not P”) | As above. | “A dog with four legs.” The rule: true. Your sentence: false. | “Your answer flips the rule but puts NOT in its new THEN part only.” | As above | Pass: T-truth, T-proof, T-kind, T-ids |
| L4 `samePickItem` | s6.same-pick | Flip, with NOT in the new IF part only (“If not Q, then P”) | As above. | “A bird with two legs.” The rule: true. Your sentence: false. | “Your answer flips the rule but puts NOT in its new IF part only.” | As above | Pass: T-truth, T-proof, T-kind, T-ids |
| L4 `sameYesNoItem` | s6.same-yesno | “No” for flip and NOT | `whyWrong` repeated `explain`; no case. | “A dog without four legs.” The rule: false. This sentence: false. The only case that breaks either one. | “Your answer says the two sentences do not mean the same, but the same cases break them.” | Pair: flip and NOT in a new story (Yes), then flip only or NOT only (No) | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh |
| L4 `sameYesNoItem` | s6.same-yesno | “Yes” for flip only | `whyWrong` repeated `explain`; “breaks that sentence”. | “A cat with four legs.” The rule: true. This sentence: false. | “Your answer misses that this sentence only flips the rule.” | Pair: flip only again in a new story (No), then flip and NOT (Yes) | Pass: T-truth, T-proof, T-kind, T-fresh |
| L4 `sameYesNoItem` | s6.same-yesno | “Yes” for NOT only | As above. | “A cat with four legs.” The rule: true. This sentence: false. | “Your answer misses that this sentence only puts NOT in both parts.” | Pair: NOT only again in a new story (No), then flip and NOT (Yes) | Pass: T-truth, T-proof, T-kind, T-fresh |
| L5 `checkerItem` (multi) | s6.checker | Leaves out the IF card | `grade()` title was “The card that shows “Dessert” could have …”: it named the card, not that the answer left it out. | In the tip and the teach case for that card: “With “Left some veggies” on the back, the rule is broken.” | “Your answer leaves out the card that shows “Dessert,” but its back could show the THEN part did not happen.” | A new checker item in another story | Pass: T-tips, T-kind, T-truth, T-fresh, R-short |
| L5 `checkerItem` (multi) | s6.checker | Leaves out the NOT THEN card | As above; the same words as leaving out the IF card. | “With “Dessert” on the back, the rule is broken. Many people miss this card.” | “Your answer leaves out the card that shows “Left some veggies,” but its back could show the IF part happened.” | As above | Pass: T-tips, T-kind, T-truth, T-fresh, R-short |
| L5 `checkerItem` (multi) | s6.checker | Turns over the THEN card (the trap) | “Even with “Dessert” on the back, the rule is kept.”: only one of the two backs was checked. | “With “Dessert” or “No dessert” on the back, the rule is kept. This card is the trap.” Explain more simply walks this card back by back. | “Your answer turns over the card that shows “Ate all veggies,” but the THEN part already happened there.” | As above | Pass: T-tips, T-kind, T-truth, R-simple |
| L5 `checkerItem` (multi) | s6.checker | Turns over the NOT IF card | “Can’t break the rule” with no backs named. | “With “Ate all veggies” or “Left some veggies” on the back, the rule is kept.” | “Your answer turns over the card that shows “No dessert,” but the IF part did not happen there.” | As above | Pass: T-tips, T-kind, T-truth |
| L5 `cardItem` | s6.checker-card | “No” for the IF card | `whyWrong` repeated `explain`; no case card. | “A card with “Dessert” on the front and “Left some veggies” on the back.” IF part: true. THEN part: false. The rule: false. | “Your answer skips a card where the IF part happened, but its back could show the THEN part did not happen.” | Pair: the IF card in a new story, then the NOT IF card (a card to skip) | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh, R-card |
| L5 `cardItem` | s6.checker-card | “No” for the NOT THEN card | As above; the same words as skipping the IF card. | “A card with “Left some veggies” on the front and “Dessert” on the back.” IF part: true. THEN part: false. The rule: false. | “Your answer skips a card where the THEN part did not happen, but its back could show the IF part happened.” | Pair: the NOT THEN card in a new story, then the THEN card (the trap) | Pass: T-truth, T-cover, T-proof, T-kind, T-fresh, R-card |
| L5 `cardItem` | s6.checker-card | “Yes” for the THEN card | `whyWrong` repeated `explain`. | “A card with “Ate all veggies” on the front and “Dessert” on the back.” The rule: true. Its own simpler example checks each back. | “Your answer turns over a card where the THEN part already happened.” | Pair: the THEN card in a new story, then the NOT THEN card | Pass: T-truth, T-proof, T-kind, T-fresh |
| L5 `cardItem` | s6.checker-card | “Yes” for the NOT IF card | `whyWrong` repeated `explain`. | “A card with “No dessert” on the front and “Left some veggies” on the back.” The rule: true. | “Your answer turns over a card where the IF part did not happen.” | Pair: the NOT IF card in a new story, then the IF card | Pass: T-truth, T-proof, T-kind, T-fresh |

## Test key

The last column names tests in `src/engine/__tests__/conditionals.test.ts`, blocks “stop 6 wrong answers teach first”
and “stop 6 review fixes”. They run every generator in every skin it takes, every variant (each case, each fact and
sentence, each move, each rewrite, each card face), on 20 seeds (T-read on 8), plus the lesson practice sets for the
new examples.

- **T-teach**: every item has a rule, 1-3 terms (the IF part and the THEN part quoted from this rule, plus “Breaks the
  rule”, “Can’t tell” or “Nothing follows for sure”, or the three lesson 4 words), a meaning that names the one case
  that breaks the rule, 2-4 cases with a title, Remember with an “Ask: …?” question, and a simpler example.
- **T-truth**: every true/false on every worked case and every counterexample is worked out again by a separate brute
  force, from the case’s label read back in the story’s words (the sentence and the answer read from the prompt and
  the choice).
- **T-cover**: the cases cover every way the question can go: all four rows (lessons 1 and 4), exactly the rows where
  the fact is true (lessons 2 and 3), all four cards (rule checker), both backs (one card).
- **T-proof**: every wrong choice has feedback, `whyWrong` is in step, and the example proves the gap (a kept case for
  a “broke it” answer, a case that can happen where the pick goes the other way, or the case the pick forces that
  breaks the rule).
- **T-kind**: each mistake kind, found from what the player sees, has its own headline (32 kinds), and no headline
  serves two kinds. Lessons 2 and 3 share three kinds on purpose (the answer and the fact break the rule, the answer
  goes backward, or it says the IF part did not happen) and use the same words for them. Leaving out (or skipping) the
  IF card and the NOT THEN card are two kinds.
- **T-ids**: ids never look like `c1` or `s1`; the same words in the same story always have the same id; reversing
  the choices keeps each explanation, title and example.
- **T-tips**: every one of the 15 wrong sets of rule-checker cards gets a title that starts with the answer and names
  a card it really left out or picked; the gap after “but” is worked out again from the card’s face; every tip’s
  “With … on the back, the rule is broken / kept” claim is true for that card.
- **T-fresh**: new examples keep the skill first, use another story (and, for the four-label items, other labels), ask
  the same sentence or rewrite again, and pair as in the table.
- **T-read**: each item’s full text (prompt, choices, explanation, hint, all teaching and tips) reads at grade 7 or
  lower, with no sentence over 25 words, curly quotes with the period or comma inside, no “that row”, “the opposite”,
  “Wrong” or “Try again”, and “both” only with what it refers to.
- **R-words**: no headline or detail says “uses the rule backward”, “rules out”, “decides”, “differ” or “describes a case”;
  “backward” always comes with “from the THEN part to the IF part”.
- **R-terms**: every term reads “X means Y”, never “X means when …”.
- **R-card**: skipping a card to turn names the part its face shows and the part its back could show, recomputed from
  the case that breaks the rule.
- **R-simple**: the rule checker’s simpler example walks the NOT THEN card and the THEN card, and each “If its back
  shows …, the rule is kept / broken” is worked out again.
- **R-quote**: the same-pick meaning quotes the flip and NOT sentence, read back as “If not Q, then not P” and checked
  by brute force to mean the same as the rule.
- **R-short**: each rule-checker tip is 40 words or fewer, and the classic miss (the IF card and the THEN card) gives
  80 words or fewer.

The contract test `COVERAGE_ALL=1 STOP=6 npx vitest run src/engine/__tests__/stops.test.ts` passes for all five
lessons. Practice text (20 seeds) reads at grade 1.2 to 2.1 per lesson, and no single item is above grade 2.7 (limit
7.0).

## Prompt and idea-card changes

- Lesson 2 asked “Look at this sentence: “…” Is it true?” with the choices “Must be true / Can’t tell / Can’t be true”.
  It now asks “Is this sentence true for sure, false for sure, or can’t you tell?”, and the choices say the same words:
  “True for sure”, “Can’t tell”, “False for sure”. The lesson 2 card “Going forward works” shows both labels with Max.
- Lesson 4 prompts now define their key words: “Two sentences mean the same when the same cases break them.”
- The rule-checker prompt adds “Choose only the cards you need.”, so “must” cannot be read as “would help”.
- The lesson 3 summary card (“Nothing follows for sure”) now uses the same move rules the teaching uses, worked out by
  `moveRule()`: “When the THEN part happens, nothing follows for sure.”
- The lesson 4 grid caption said “keeps that sentence”; it now says “keeps the sentence at the top”.
- “This sentence says the opposite.” (lesson 2) and “breaks that sentence” (lesson 4) are gone.
- Letter cards now name their cases in words (“a card with a vowel and an odd number”), not the fixed E and 7, so a
  case matches the letters and numbers the cards show.

## Review (branch `wa-stop6-v`)

A second pass read every lesson’s practice on 20 seeds, the check on 10 seeds and the Arcade on 20 seeds, every wrong
choice and every wrong set of rule-checker cards, and recomputed each truth. Answers and uniqueness did not change: the
same seeds give the same items, scenes and right answers as before the migration (6,102 items compared). It fixed:

- Lesson 3 headline “Your answer uses the rule backward.” used a word lesson 3 never teaches. It now says “Your answer
  goes backward, from the THEN part to the IF part.” (lessons 2 and 3).
- “Your answer rules out the IF part, but it may have happened.” (an idiom) is now “Your answer says the IF part did
  not happen, but it may have.”
- “Your answer decides the THEN part, but the IF part did not happen.” did not say what the answer claims. It is now
  “Your answer says the THEN part happened, but without the IF part it may not have.”
- “Your answer describes a case that breaks the rule.” was not true of the answer alone (“Cal walked in the rain.”
  breaks nothing). It is now “Your answer and the fact together break the rule.”
- The one-card item gave skipping the IF card and skipping the NOT THEN card (the card most people miss) the same
  headline; each now names the part its back could show. The rule-checker tips do the same, and are shorter (the
  longest detail paragraph went from 151 to 122 words; the classic miss gives 80 or fewer).
- The rule checker’s “Explain more simply” always walked the NOT THEN card, even after turning over the trap. It now
  walks the NOT THEN card and then the THEN card, back by back.
- “Your answer says the two sentences differ, but no case tells them apart.” used “differ”, a word lesson 4 never
  defines. It now uses the lesson’s own definition: “Your answer says the two sentences do not mean the same, but the
  same cases break them.”
- “A case breaks a sentence means when …” is now a definition: “in that case, the sentence’s IF part happens, but its
  THEN part does not.”
- “Which sentence means the same?” tested “the flip and NOT sentence” without saying which one. The meaning now quotes
  it.
- New examples: “Who broke the rule?” (P and Q), “Which sentence means the same?” and the word-card rule checker could
  come back in the same story with the same labels in a new order. Each now gets a new item in another story. A
  backward miss now asks the same sentence again (IF or NOT IF), and a flip-only or NOT-only miss the same rewrite.
- Shorter case notes and IF/THEN definitions (the explanation averaged 419 words with the simpler example open; now
  394).

## Not changed here (shared files)

Both were made after the migration: the contract test covers every lesson, and a rule-checker miss with two or more
wrong cards gets one paragraph per card, with any repeated sentence dropped. As first written:

- `stops.test.ts`: `MIGRATED` can now list `s6.l1` to `s6.l5`. They pass with `COVERAGE_ALL=1 STOP=6`.
- When a rule-checker answer has two or more wrong cards, `grade()` joins every tip into one paragraph; the title
  names the first card and the detail names the rest. Picking exactly the two wrong cards gives four tips in one
  paragraph (122 words of detail at most). A per-card list in the panel (one paragraph per tip) would need a change to
  `src/engine/grade.ts` or `src/game/explanation.ts`.
