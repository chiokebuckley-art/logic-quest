# Curriculum plan: first principles, every idea defined before it is used

*Build spec for the changes in the Logic Quest Curriculum Review and Change Plan (October 11, 2026). Written
against the code at commit 960bc4d (v0.10.0). Status lines at the end of each section say what is built.*

Everything in `docs/CONTENT_GUIDE.md` applies (shape, See → Do → Quiz, teach-first wrong answers, real life,
distinctions, reading level FK ≤ 7.0 and ≤ 25 words, curly quotes, no symbols in kid text, US spelling, "Not yet"
never "Wrong"). The Observatory rules (`docs/OBSERVATORY.md`) apply to stops 14–17.

## 0. Decisions

The review's findings, and what this plan does about each:

| Review item | Decision |
|---|---|
| A. New stop 1.5 "Arguments" | A new stop, id `s18`, lessons `s18.l1`–`s18.l4`, placed in the Journey list right after True or False?. Shown as Stop 2; every later main stop's shown number moves up by one. Ids never change, so every save keeps its progress. |
| D. Renumber or relabel | Relabel: a stop's shown number is its position on the Journey (`stopNumber`), its id is fixed. Observatory stops stay "Ring 1–4". |
| D. Set requires on S14–S17 | s14 needs s1; s15 and s16 need s14; s17 needs s5, s7 and s15. Places inside a ring keep their skill-based opening. |
| D. S17 "followed by S11" | s11 (Proof) requires s10 and s17: it names the methods Proof Lantern uses. |
| D. Workshop events for S12/S13 | S12 and S13 are built in this plan, so Trickster Market and Chance Dock point at real stops. Until a stop is built, the Pattern Lab home already says "Full Journey destination coming later". |
| D. Side track | s12 and s13 are the side track (`sideTrack: true`), opening after s8 (s12 requires s8, s13 requires s12), as `src/content/stops.ts` always said. |
| D. Name transitivity and symmetry | Transitivity is named in Stop 3, lesson 1 (Chains). Symmetry is named in Stop 4, lesson 4 ("Links work both ways", which the review placed in Stop 16). Both get glossary terms. |
| B. Extend Stop 6 | Two lessons, l6 "Only if, and unless" and l7 "Both ways: needed and enough". The Wason card task already exists as l5 Rule checker; l7 links to it. |
| C. Build S8–S13 | §3 briefs, in the review's order of value: s8, s9, s11, s12, s13, s10. |
| E. Glossary | `LessonDef.terms`; a Words tab in the Library listing each term once its lesson is done. |
| E. Closing why item | Every built stop's check ends with an item tagged `why` whose choices are reasons. |
| E. Bridge item | `StopDef.bridge(rng)`: one warm-up item on the stop page reusing the previous stop's idea. |
| E. Trap item pass rule | Kept: every new lesson's pass rule includes its trap tag. |
| Words never taught | premise, conclusion, argument, valid, sound (s18); equivalent (s9); necessary, sufficient (s6); transitive (s3), symmetric (s4); proof, contradiction, counterexample, axiom, definition (s11); fallacy (s12). Each is named once on the card that introduces it, in kid words first. |

## 1. The Journey

Order of `STOPS` (`src/content/stops.ts`), with the shown number:

| Shown | Id | Title | Opens after |
|---|---|---|---|
| 1 | s1 | True or False? | (start) |
| 2 | s18 | Arguments | s1 |
| 3 | s2 | NOT, AND, OR | s18 |
| 4 | s3 | Line Up | s2 |
| 5 | s4 | Grid Detective | s3 |
| 6 | s5 | Knights & Knaves | s4 |
| 7 | s6 | If… then | s5 |
| 8 | s7 | Ways to Think | s6 |
| 9 | s8 | All, Some, None | s7 |
| 10 | s9 | Truth Tables | s8 |
| 11 | s10 | Circuit Lab | s9 |
| 12 | s11 | Proof | s10 and s17 |
| 13 | s12 | Spot the Trick (side track) | s8 |
| 14 | s13 | Clues & Chances (side track) | s12 |
| Ring 1 | s14 | First Lights | s1 |
| Ring 2 | s15 | Rule Rise | s14 |
| Ring 3 | s16 | Deep Sky | s14 |
| Ring 4 | s17 | Proof Lantern | s5, s7, s15 |

- `stopNumber(stop)`: 1 + its index among `STOPS.filter(isMainPath)`. `stopNumberOf(n)`: the same for a stored
  stop number (`Item.stop`, `NoteCard.stop`, a skill's `sN.` prefix). Every place the UI shows a stop number uses
  one of these (the full list is in the code map: Journey rail and rows, Home, Stop page eyebrow and repair row,
  LessonRunner header and last-lesson line, CheckRunner/CheckResult/PracticeRunner headers, Arcade, Progress,
  Players, Library discs and rows, Search metas, Notebook groups and runner, `stopOpening`'s "Opens after"
  label, `NEXT_AFTER_PASS`). The Journey chips read "Main track", "Side track · 13, 14", "Observatory", "Pattern Lab".
- `stopOpening`: "Opens after Stop N" when the one required stop is the one before it in the list; otherwise
  "Opens after Stop N (Title) and Stop M (Title)". Rings: "Opens after Stop 1" / "Opens after Ring 1".
- `StopDef.sideTrack?: true` replaces the `n >= 12` test in JourneyScreen; `isMainPath` stays `!observatory`.
- The Observatory map and ring rows show a locked ring (dimmed, with its "Opens after" line); "Find your level"
  stays open always.

## 2. Shared changes (the core; built first)

Types (`src/engine/types.ts`):
- `StopDef.sideTrack?: true`.
- `StopDef.bridge?(rng: Rng): Item` — a warm-up item reusing the previous stop's idea. Shown on the stop page
  ("Warm up · from Stop N") while the stop is open and `StopProgress.warm` is not set; answering it right sets
  `warm` (parse it in `save.ts`); it never counts toward passing and never goes to the Notebook (`fromWarmUp`).
- `LessonDef.terms?: GlossaryTerm[]`, `GlossaryTerm { term: string; means: string; also?: string }` (`term` is the
  kid word or the grown-up word as the lesson uses it; `also` is the other name: "premise" / "a given").
- Check rule: the last item of every built stop's `check(rng)` carries the tag `why` and asks for the reason
  (its choices are reasons, one right). Contract test in `stops.test.ts`.

Engine and UI:
- `src/content/stops.ts`: `stopNumber`, `stopNumberOf`, `stopByN`, s18 inserted after s1, s12/s13 marked
  `sideTrack`, requires as in §1 (set on the StopDefs: s14 `['s1']`, s15 `['s14']`, s16 `['s14']`, s17
  `['s5','s7','s15']`, s11 `['s10','s17']`, s12 `['s8']`, s13 `['s12']`).
- Every display site in §1 uses the helpers. `progressStats.skillLabel`, `NotebookScreen`, `NotebookRunner`,
  `SearchScreen` (notebook meta) map stored numbers through `stopNumberOf`.
- Library: a `words` tab (label "Words") listing glossary terms grouped by stop in Journey order, each term with
  its meaning and "from Lesson k · title", shown only once that lesson is in `lessonsDone` (any stop); a short
  line when none yet ("Finish a lesson to collect its words."). The `soon` tab shows only while some stop is not
  ready. Search gets a "Words" group.
- Stop page: the warm-up card (bridge item) above the lessons, with `ItemView` in learn mode and no timer.
- `kit.tsx` `STOP_PLACE`: `s18: 'of-rules'`.
- World: `src/content/world/s18.ts` (built by the s18 builder); `SOON_WORLD` keeps a line for each stop until it
  is built. `WORLD` registered per stop as each is built.
- Skill names: new stops use `StopDef.skillNames`.

Tests to update in the core step: `stops.test.ts` Journey-order test (the §1 order; ready = every stop except the
ones still `soon`; Observatory by `observatory`, not `n >= 14`), `observatory-core.test.ts` unlock regression (s18
learning after s1; s2 "Opens after Stop 2"; rings' requires), `play.test.ts` Journey row "1. True or False?" and
any "Stop n" strings, `shell.test.ts` (skill names for s18 when built), `notebook.test.ts` (s8 becomes fixable
when built; keep the test on a stop that is still coming, or on an unknown id), `world.test.ts` (s18 in
`SOON_WORLD` until built), `pages.cjs` and `core.cjs` harness counts.

Status: built. `stopNumber`, `stopNumberOf`, `stopByN`, `stopLabel` and `stopLabelOf` are in `src/content/stops.ts`;
s18 is a placeholder after s1; requires are as in §1; every display site uses the helpers. The Words tab and the
search group use `src/game/glossary.ts`. The warm-up card uses `StopProgress.warm`, `markWarm` and `fromWarmUp`. The
why and bridge contract tests skip the stops in `WHY_PENDING` and `BRIDGE_PENDING` (`stops.test.ts`). A stop the
learner already started or passed stays open, so saves from before s18 keep every stop they had open.

## 3. Content briefs (one builder per stop; the cross-stop builder for existing stops)

Every brief is a floor, not a ceiling. Each stop has: 3–7 lessons, 3–7 cards each, See → Do → Quiz, a trap item in
every pack (in the pass rule's `include`), `check` of 8–10 items with a conflict item and the closing why item
last, `bridge(rng)`, `practice` (Arcade), `fresh` where the default is weak, `skillNames` for every skill, world
file with why/uses/skills, distinctions declared and taught (contrast card + board), `terms` on the lesson that
introduces a word, and a test file that re-derives every answer by a second method.

### s18 Arguments (shown as Stop 2)
Idea: an argument is some givens and a claim; it follows (is valid) when the claim must be true whenever the
givens are; it is solid (sound) when it follows and the givens are true. Kid words first, grown-up word named once:
**given** (premise), **claim** (conclusion), **follows** (valid), **solid** (sound).
- l1 Givens and the claim. Short stories (4–6 sentences) with signpost words (so, because, since, must). Tap every
  given (tapall of sentence cards), then choose the claim. Skills `s18.given`, `s18.claim`. Trap: the claim comes
  first ("Rex must be wet. It rained, and Rex was outside.").
- l2 Does it follow? Must / Might / Can't: if every given were true, must the claim be true? Cases drawn as boxes;
  the givens rule cases out; the claim holds in every case left, or not. Skill `s18.follows`. Trap: a claim that is
  true in the story but not forced by the givens (Might).
- l3 Follows, even when silly. Nonsense words ("All glorps are blue. Zed is a glorp. So Zed is blue."): the shape
  makes it follow. Pair each with a plain-word twin of the same shape. Skill `s18.form`. Trap: believable sentences
  whose claim does not follow ("All cats are animals. Rex is an animal. So Rex is a cat." — say only "does not
  follow"; Stop 12 names the trick).
- l4 True but it does not follow; false but it follows. A true claim reached by a broken shape; a false given in
  an argument whose shape is fine (follows, not solid). Skill `s18.sound`. Trap: a false given, still follows.
- Distinctions: the claim being true vs the claim following from the givens; a given being true vs being given.
- Check: a conflict item (true claim, broken shape); the closing why item ("Why does this follow? Because the shape
  forces the claim, not because the claim is true.").
- Bridge: a Stop 1 true / false / can't-tell item about one sentence of a story.
- Terms: argument, premise (a given), conclusion (the claim), valid (follows), sound (solid).
- Art `of-rules`. World `s18.ts`. Test `arguments.test.ts`.

### Stop 6 extension (l6, l7; keep l1–l5 unchanged)
- l6 Only if, and unless. "P only if Q" means "if P then Q"; "P unless Q" means "if not Q then P". The four-box card
  reused: mark which box breaks. Skills `s6.only-if`, `s6.unless`. Trap: reading "P only if Q" as "if Q then P".
- l7 Both ways: needed and enough. "If and only if" (two boxes break); **enough** (sufficient: the IF part is enough
  for the THEN part) and **needed** (necessary: the THEN part is needed for the IF part), on the four-box card.
  Point back to l5's cards (E, K, 4, 7). Skills `s6.iff`, `s6.need-enough`. Trap: "needed" read as "enough".
- Distinction: needed vs enough (contrast card + board). Terms: only if, unless, if and only if, necessary (needed),
  sufficient (enough); also name converse (Flip only), inverse (NOT only), contrapositive (Flip and NOT) on l4.
- Check stays 8–10: the l6/l7 items take the extras' slots; the closing why item asks why the "4" card need not be
  turned (or why "only if" points the other way). Update `conditionals.test.ts`'s pinned check shape.
- Bridge: a Stop 5 suppose-and-crash item. World lines for l6/l7 and the new skills.

### s8 All, Some, None
Kid words: **all** (every one, no exceptions), **some** (at least one, maybe all), **none** (not even one). Pictures:
rings (Euler pictures) around counted things, never set symbols. Reuse Stop 1's statement engine where it fits.
- l1 In the ring or not. Membership: tap every thing that belongs to the set named by a feature; two rings that
  overlap; a thing in both. Skill `s8.member`.
- l2 All, some, none. The truth of "All / Some / No X are Y" over a picture; some is true when all are. Skill
  `s8.quantify`. Trap and conflict: all cats black → "Some cats are black" is True.
- l3 Not all means some are not. The opposite of "All X are Y" is "Some X are not Y"; the opposite of "Some X are
  Y" is "No X are Y"; one counterexample is enough. Skill `s8.negate`. Trap: "No X are Y" as the opposite of "All".
- l4 When the ring is empty. No dragons in the cave: "All dragons in the cave are blue" has nothing to break it
  (True); "Some dragons in the cave are blue" has no dragon to make it true (False). Skill `s8.empty`.
- Distinctions: everyday "some" (hints not all) vs logic's "some"; "not all" vs "none". Terms: all, some, none,
  not all, counterexample (reuse). Bridge: a Stop 7 "every" claim broken by one case.

### s9 Truth Tables
- l1 Every case in rows. One sentence 2 rows; two 4; three 8. Build the rows on a board (fill T/F patterns; the
  engine computes). Skill `s9.rows`. Trap: a table with a repeated row and a missing one.
- l2 Tables for NOT, AND, OR. Fill the result column by rule (grid board of True/False cells). Skill `s9.fill`.
- l3 The IF table. False only in the row P true, Q false; the two rows where the IF part is false are True (link
  to Stop 6 l1 "When the IF part does not happen"). Skill `s9.if-table`. Trap: marking P false, Q false as False.
- l4 Same meaning. Two sentences mean the same when their columns match in every row: NOT(A AND B) = NOT A OR NOT B,
  the contrapositive; one pair that differs in one row. Skill `s9.same`. Trap: NOT(A AND B) vs NOT A AND NOT B.
- l5 Always true, never true. All-True and all-False columns; "P or not P"; "P and not P". Skill `s9.always`.
- Distinction: agreeing in some rows vs every row. Terms: truth table, row (a case), equivalent (same meaning),
  always true (tautology), never true (contradiction). Bridge: a Stop 2 NOT(A AND B) card case. Reuse Stop 2's
  `rules.ts` meanings and Stop 6's `ROWS`.

### s10 Circuit Lab
A new scene kind `circuit` (plain data, still frame, SVG, read aloud in words): a battery, named switches, a lamp;
switches in a line (series), side by side (parallel), an inverter box. Add it to the Scene union, `SceneView`,
`sceneSpeech`, and the reading contract's scene text.
- l1 In a line: AND. The lamp is on only when both switches are closed; a board of four rows. Skill `s10.series`.
- l2 Side by side: OR. Skill `s10.parallel`. Trap: both closed → still on.
- l3 The flipper: NOT. Skill `s10.not`.
- l4 From table to circuit. Pick the circuit that matches a table; fill a circuit's table. Skill `s10.match`.
  Conflict and trap: two circuits that look different and compute the same table.
- l5 (only if time) XOR; a half-adder picture.
- Terms: circuit, series (in a line), parallel (side by side), inverter. Bridge: a Stop 9 fill-the-column item.

### s11 Proof (requires s10 and s17)
Name the methods the game used: a **chain** (direct: Stop 3's chains, Proof Lantern's reason chain), **cases**
(Stop 4), **suppose and crash** (Stop 5: contradiction), **one counterexample** (Stop 7, Proof Lantern).
- l1 Four ways to prove. Match a worked reasoning to its method. Skill `s11.method`.
- l2 Every step cites. Each step names the given, the definition, or the earlier step it uses; find the step that
  cites nothing (trap; the conflict item has a true claim and a broken chain). Skill `s11.cite`.
- l3 Cover every case. Cases that cover everything; trap: a case left out. Skill `s11.cases`.
- l4 Suppose and crash. Contradiction named. Skill `s11.crash`.
- l5 One is enough. A counterexample disproves an every-claim; examples never prove one. Skill `s11.counter`.
- Distinction: a step that is true vs a step that follows. Terms: proof, direct proof (a chain), proof by cases,
  contradiction (suppose and crash), counterexample, axiom (a starting given everyone accepts), definition (what a
  word means, agreed before the proof). Bridge: a Proof Lantern "proved or a guess" item.

### s12 Spot the Trick (side track, after s8)
- l1 Flip tricks. Affirming the consequent and denying the antecedent, tied to Stop 6's Flip only / NOT only.
  Skill `s12.flip`.
- l2 The middle trick, and the swap. Undistributed middle; the quantifier swap ("Every kid has a favorite game" vs
  "one game every kid likes"). Skills `s12.middle`, `s12.swap`.
- l3 Going in circles, and only two doors. Circular reasoning; false dilemma. Skills `s12.circle`, `s12.dilemma`.
- l4 Too few, and everybody says. Hasty generalization; appeal to popularity. Skills `s12.hasty`, `s12.popular`.
- Trap in every pack: a trick whose claim happens to be true. Distinction: the claim being true vs the reason
  proving it (`taughtIn` s18 cannot cross stops, so declare it here with its own contrast). Terms: fallacy (a
  trick reason), affirming the consequent, denying the antecedent, circular reasoning, false dilemma, hasty
  generalization, appeal to popularity. Bridge: an s18 "does it follow?" item.

### s13 Clues & Chances (side track, after s12)
- l1 Likely, not certain. Counts in a bag: Must / Likely / Unlikely / Can't (Stop 7's words). Skill `s13.likely`.
- l2 Each draw is new. A coin is not "due" (Proof Lantern's sampling idea, named). Skill `s13.due`.
- l3 Out of 100 people. Base rates with counts, never percentages, on a 2-by-2 count picture. Skill `s13.hundred`.
- l4 How often would I see this clue if I were wrong? A clue seen often either way proves little. Skill `s13.clue`.
  Trap: a test right most of the time for a rare condition still names more well kids than sick ones.
- Distinction: how often the test is right vs how often a "bug" answer is right. Terms: likely, independent (each
  draw is new), base rate (how common it is), false alarm. Bridge: a Stop 7 "good guess is not a proof" item.

### Cross-stop builder (existing stops)
- Closing why items for s1–s7 and the ring checks (s14–s16 append their why item last; s17 moves why-continue
  last; s7 makes fair-reason always present and last). One reason-picking item family per stop, with feedback for
  every wrong reason: s1 why a statement is false / can't tell; s2 why an AND or OR sentence is false; s3 why a
  name must come before another (the chain); s4 why a mark must be a check (only one left); s5 why someone must
  be a knave (suppose and crash); s6 why a rule is not broken (the IF part did not happen).
- Bridge items for s2–s7: s2 from s1 (a statement's truth), s3 from s2 (an AND/OR card), s4 from s3 (a chain),
  s5 from s4 (only one left), s6 from s5 (suppose and crash), s7 from s6 (a move).
- Name transitivity (Stop 3 l1, a card: "A chain rule: if A is before B and B before C, then A is before C. Grown-ups
  call this transitive.") and symmetry (Stop 4 l4: "A link works both ways: Gus with apples is apples with Gus.
  Grown-ups call this symmetric."), plus `terms`.
- `terms` on existing lessons: statement, true, false, can't tell (s1.l1–l3); NOT, AND, OR (s2); chain, transitive
  (s3.l1); symmetric (s4.l4); suppose and crash (s5); rule, converse (Flip only), inverse (NOT only), contrapositive
  (Flip and NOT) (s6.l2/l4); good guess, proof, best explanation, cause (s7); unit, position (s14); rule, test
  (s15); reflection, analogy (s16); proved, counterexample (s17).

## 4. Acceptance checks
1. Journey order and shown numbers as in §1; every save keeps its progress (round-trip test with s2–s7 progress).
2. Prerequisites as in §1 (unlock regression test).
3. Every built stop's check ends with a why item; every lesson's pass rule includes its trap tag.
4. Every built main stop after Stop 1 has a bridge item, shown on its page, never graded for passing.
5. Every term in §0's last row is introduced on a card of its lesson and listed in the Words tab only after that
   lesson is done.
6. Stop 6 l6/l7 and stops s8–s13, s18 pass the shared contract (`stops.test.ts`, `world.test.ts`, skill names,
   wrong-answers sweep, notebook).
7. The Pattern Lab's Trickster Market and Chance Dock open their stops once s12/s13 are passed.
8. Browser pass: every lesson of every stop at 320/375/430, pages and core checks, the bridges.

## 6. Status (v0.11.0)

Everything in §0–§4 is built: the core, Arguments (s18), the Stop 6 extension, stops s8–s13, the closing why items and
warm-ups on every main stop, the glossary terms, transitivity named in Line Up and symmetry in Grid Detective. Each new
stop has its test file (answers re-derived by a second method), its world pack and its drill worksheet in
`docs/audit/`. Deviations and open polish, from the reviews:
- `StopDef.bridgeFrom` names the stop a warm-up reuses when it is not the stop before it (NOT, AND, OR from True or
  False?; Truth Tables from NOT, AND, OR; Proof from Proof Lantern; Spot the Trick from Arguments; Clues & Chances from
  Ways to Think).
- Arguments l4 is titled "Solid arguments"; the Stop 6 "needed and enough" board uses a sentence grid beside the rule
  rather than the four-box card; Circuit Lab's optional XOR lesson was not built.
- A ring's "Opens after" line uses its kid title even in plain-label mode. Truth Tables' step-by-step explanations
  can run to four or five short sentences. Stop 4 and Stop 6 boards name their marks with the check and cross signs,
  as those stops always have.
- "Contradiction" is a term in Truth Tables (never true) and in Proof (suppose and crash), each with its own meaning.

## 5. Build order
1. Core (§2). 2. Builders in parallel pairs: s18, Stop 6 extension, s8, s9, s11, s12, s13, s10, cross-stop. 3.
Integration: full tests, browser passes, docs, v0.11.0, commit, push, publish.
