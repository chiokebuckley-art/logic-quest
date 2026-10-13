# Audit additions (v0.12.0): the logic the Curriculum and Logic Audit found missing

*Build brief for the lessons added after the Logic Quest Curriculum and Logic Audit (October 13, 2026). Every rule in
`docs/CONTENT_GUIDE.md` applies (shape, See → Do → Quiz, teach-first wrong answers, computed answers, real life,
distinctions, reading level FK ≤ 7.0 and ≤ 25 words, curly quotes, no symbols in kid text, US spelling, "Not yet"
never "Wrong", the closing why item last in every check, glossary terms on the lesson that introduces a word). Each
stop stays within seven lessons. Existing lessons keep their ids, titles and text; new lessons take the next ids.
The stop's check still has 8–10 items, covers every lesson (the new ones too), keeps a conflict item, and ends with
the why item. Every new skill gets a plain name (`StopDef.skillNames`) and a real-life line; every new lesson gets
its why and three uses in the stop's world file. The stop's test file grows with the new families (answers re-derived
by a second method).*

Kid words first, grown-up word named once on the card that introduces it and in `terms`.

## s8 All, Some, None: two new lessons
- **l5 Two givens, one picture.** A two-given argument tested on rings: "All A are B. All B are C. So all A are C."
  (follows); "All A are B. Some C are A. So some C are B." (follows); "No B are C. All A are B. So no A are C."
  (follows); "No B are C. Some A are B. So some A are not C." (follows); and the shapes that do not follow: "All A
  are B. All C are B. So all A are C." (the middle trick, already named in Spot the Trick; here only "does not
  follow") and "All A are B. So all B are A." (turning "all" around). The learner draws the givens on the rings
  (mark which ring sits inside which, which things can be where), then says whether the claim must hold; a case
  that breaks it is drawn when it does not. Skill `s8.syllogism`. Trap: a claim that is true in the picture but not
  forced. Term: syllogism (two givens and a claim).
- **l6 Every and some: who comes first.** "Every kid has a friend" (each kid, maybe a different friend) vs "There is
  one friend of every kid" (one person for all). Pictures: kids on one side, friends on the other, lines between
  them; which sentence the picture makes true; which picture a sentence allows. Skill `s8.order`. Trap: reading
  "every kid has a friend" as one shared friend. Distinction: each has one vs one for all (contrast card + board).

## s9 Truth Tables: two new lessons
- **l6 Both ways, and one but not both.** The "if and only if" column (true when both parts match, from Stop 6 l7)
  and the "one but not both" column (exclusive or: true when exactly one part is true; the everyday "or" of Stop 2 as
  its own operator, not a mistake). Fill both columns; prove "one but not both" means the same as "A OR B, and not
  both" by matching columns; show where it differs from plain OR (one row). Skills `s9.iff`, `s9.xor`. Trap: marking
  the row A true, B true as True for "one but not both". Terms: biconditional (if and only if), exclusive or (one
  but not both).
- **l7 Say it with symbols** (optional, for the oldest readers; Grade 8 and up in the Kid Journey). The five words as
  symbols: NOT as ¬, AND as ∧, OR as ∨, IF … THEN as →, IF AND ONLY IF as ↔. Translate both ways (a sentence in
  words to symbols; symbols to words), with the table from l2–l6 beside each. This is the one lesson in the game
  where a kid reads symbols: set `LessonDef.symbols: true` (add the field to `LessonDef` with a doc comment) and make
  every symbol-ban test skip the strings of a lesson that sets it (the stops test and `tables.test.ts`); the reading
  level still applies to the words. Skill `s9.symbols`. Trap: → read as ↔. Terms: the five symbols, one term each
  ("¬ means NOT"), and "symbol".

## s10 Circuit Lab: one new lesson
- **l5 The two-way switch.** A hallway light with a switch at each end: the lamp changes whenever either switch is
  flipped, so it is on when exactly one switch is up (exclusive or), using the `circuit` scene (add the wiring if the
  scene lacks it: two switches whose positions either match or differ). Fill its table; compare with "side by side"
  (OR) in one row; from the table pick the circuit. Skill `s10.xor`. Trap: both up is on (OR) vs off (two-way).
  Term: two-way switch (exclusive or in wires).

## s11 Proof: two new lessons and one card
- **l6 Rules with names.** The moves the game already uses, named: modus ponens ("the IF part happened", Stop 6),
  modus tollens ("the THEN part did not happen"), disjunctive syllogism ("A or B; not A; so B"), the chain rule
  ("if A then B; if B then C; so if A then C"), and proof by Flip and NOT (contrapositive: to prove "if A then B",
  prove "if not B then not A"). Items: name the rule a step uses; give the conclusion a rule allows; spot the move
  that is no rule (affirming the consequent, denying the antecedent, from Stop 6 and Spot the Trick). Skill
  `s11.rules`. Trap: a step that looks like a rule and is not. Terms: modus ponens, modus tollens, disjunctive
  syllogism, chain rule (hypothetical syllogism), proof by contrapositive.
- **l7 Dominoes.** Induction: a line of dominoes all falls when the first falls and each one knocks the next. A claim
  about every step ("every step of this staircase has an odd count", from Rule Rise) is proved by a first case and a
  step ("if step n holds, step n + 1 holds"). Items: which part is missing (no first case; no step); does this
  argument prove every case; a staircase or sequence claim with its two parts. Skill `s11.induction`. Trap: many
  checked cases offered as the "step". Terms: induction (the domino proof), base case (the first domino), step.
- **One card in l4 Suppose and crash:** "This sentence is false." Suppose it is true: then it is false. Suppose it is
  false: then it is true. Both crash, so it is not a statement (Stop 1's word). One card, no item; it may carry a
  short "I'm confused" question.

## s12 Spot the Trick: two new lessons
- **l5 Tricks about people.** Attacking the person ("Don't listen to Mia, she is always late" says nothing about her
  claim), the twisted claim (straw man: answering a claim nobody made), and "because a famous person said so"
  (appeal to authority outside their field). Kid-safe stories; the right answer names what the reason leaves out.
  Skills `s12.person`, `s12.twist`, `s12.authority`. Trap: a claim that is true though the reason is a trick.
  Terms: attacking the person (ad hominem), straw man, appeal to authority.
- **l6 Tricks about time.** The slippery slope ("if we allow one, everything will follow", with no reason for each
  step) and after-therefore-because (post hoc: "it rained after I washed the car, so washing caused rain"; ties to
  Ways to Think's cause lesson). Skills `s12.slope`, `s12.after`. Trap: an after-therefore claim that happens to be
  right. Terms: slippery slope, after-therefore-because (post hoc).

## s13 Clues & Chances: one new lesson
- **l5 And, or, with chances.** Combining chances with counts out of 100 on the count picture: "both" for two
  things that do not affect each other (10 of 100 are red, and of those 1 in 2 are big: 5 of 100 are big and red),
  "either" (red or big: add the two, take away the ones counted twice). Never fractions, never percent. Skill
  `s13.both`, `s13.either`. Trap: adding for "both"; forgetting the overlap for "either". Terms: both (and), either
  (or), overlap.

## Shared
- Glossary: every term above on its lesson. The Kid Journey (next release) places these lessons in Grades 7–8 and
  the high-school band; nothing here depends on it.
- Each builder updates its stop's drill worksheet (`docs/audit/drill-stopN.md`) with the new lessons.

## Status: built (v0.12.0)

Every lesson above is in the game with its test file, world lines, glossary terms and worksheet. Notes from the reviews:
- The symbols lesson is a normal lesson of Truth Tables (the stop check asks one symbols question); the Kid Journey
  places it in the high-school band. Read-aloud says the signs by name.
- "Two-way switch" is the brief's name; in US trade talk it is a three-way switch. The kid text explains it as a switch
  at each end, so the name is a label only.
- The closing why items of All, Some, None and Clues & Chances draw their reasons from the older lessons; the new
  lessons' traps live in the packs and the checks.
- To fit ten items, Proof's check draws lessons 3–5 at random from their kinds, and Spot the Trick's check gives lessons
  1–4 one item each.
- Open polish: the liar card has no "I'm confused" question (cards have no such field); a Lesson 7 board of Truth
  Tables translates without a table beside it.
