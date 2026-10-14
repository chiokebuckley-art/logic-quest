# The Kid Journey: start in Grade 1, win something every round, read only what a young reader can

*Build spec for the changes in "Logic Quest: The Kid Journey" (review of October 13, 2026), written against v0.12.0.
Every rule in `docs/CONTENT_GUIDE.md` still applies to the words a kid reads; this spec adds a stricter word budget
per grade for the kid layer, a grade map over the existing lessons, rewards, and a placement check. Nothing here
removes the stop Journey, the checks, the Observatory or the Pattern Lab.*

## 0. Decisions

| Review item | Decision |
|---|---|
| A journey by grade, Grade 1 to 8, from the 81 lessons (now 91 with the audit additions) | `src/content/grades.ts`: nine bands (g1–g8, hs), each a list of worlds, each world 3–5 rounds, each round one existing lesson id. Every lesson appears in exactly one world (test). |
| A round is a lesson; a world has a short check | Rounds unlock in order inside a world; the next world's first round opens once every round of the world before it is starred. The world check (5 questions for g1–g2, 8–10 for g3 and up, all right) earns the world's building; it never blocks the next world. |
| Word budget per grade | `KidBudget` per band (words per screen, longest sentence, sentences, auto read, timer, strip). Enforced by a test that server-renders every screen of every g1–g3 round in kid mode and counts the words a kid can see, buttons included. For g4 and up the same test reports the worst screens but does not fail (trims are a separate pass). |
| A star every round, stickers, buildings, grade badge | Stars are computed from the lesson pass (clean: every try first-try with no hint; mended: finished after a repair). Stickers (one per 3 stars in a band), buildings (one per world check passed) and badges (every world of a band passed) are derived, never stored, so nothing can be forged. |
| Placement check | Two questions per band from Grade 1 up, untimed, read aloud, stop at two misses in a row (at most 16 items). Places into the highest band with a right answer. Earlier bands are "skipped": open to play, stars still earnable. A grown-up can pick or change the grade in Settings. |
| Grade 1 mode | For a player in g1–g3, a round with a kid layer renders it: one short line per card with a picture first, picture or yes/no answers, three empty stars for the goal, one-line feedback with "Show me" and "Tell me more", read-aloud that starts by itself (g1–g2), no timer, no routine strip, no "why it matters" line. |
| PIN and save options off the first screen | The new-player screen asks only for a name and a color (six words), then the grade. The PIN lives in Settings (already there). |
| Days-in-a-row flame | Replaced everywhere by "days you played this week" (seven dots), never a reset to zero in red. The streak helper stays for the grown-up report. |
| Kept exactly as is | The treasure-sign rule, Knights & Knaves and If… then content, the Pattern Workshop order as it is today (Notice, Describe, Compare, Test, Predict, Explain, adopted in v0.10.0 with the owner's OK; the review's "Revise" order is the old one), Check passes and Next never does, the number pad, strict all-right checks. |
| Teacher view, standards tags | Not built (owner's call). |

### Decisions after the core review

These override anything looser below (§1, §2, §5) and are what the code and tests do.

1. **Budgets, final.** A screen's words are every visible word a kid can see, buttons and the play header included
   (screen-reader-only text, aria labels and the app nav are not). The kid play header reads "Round k of n" (4 words),
   so content gets the rest: Grade 1 12 words a screen (8 of content), at most 2 sentences, longest 8 words; Grade 2
   20 (16), 2 sentences, 10 words; Grade 3 30 (26), 3 sentences, 12 words (`KidBudget` in `src/content/grades.ts`; g1
   `sentences` is 2). Sentences are counted in a screen's prose and in buttons that end like a sentence (a choice that
   is a sentence); a label ("Check", "Try again") is words, not a sentence.
2. **Every screen counts.** `kid-budget.test.ts` renders, under the header, every card, every board page, every quiz
   item of the planned pack for 24 seeds (not only the first), and for each item its compact miss feedback, its
   "Show me" picture, its opened hint and its "Yes!" panel; then the star screen and the "Not yet. Try again?" screen.
   "Tell me more" (the full classic panel) is not budgeted: it is the grown-up depth a kid asks for. The todo list of
   g1–g3 rounds without a kid layer stays.
3. **Kid play header.** In kid mode a round from the map shows only the back button and "Round k of n" (no lesson
   title, no world); classic play keeps "Round k of n · World" over the lesson title.
4. **Kid hint.** `ItemBase.kid.hint`: one line of at most 8 words. The Hint (bulb) button opens it as its own small
   screen in place of the question (bulb, the line, one icon button back); without a line it shows the item's `show`
   case (else its `hintCase`) as a picture only (the case without its note), and only when the item has a classic hint.
   A kid line shows the button even when the classic item has no hint. Opening it counts as help, as before.
5. **Compact miss panel.** The line, "Show me", "Try again", and "Tell me more" as a small icon button (aria-label
   "Tell me more"), so the panel fits Grade 1. On a new example after a miss, "Move on" is a small icon button too
   (aria-label "Move on"); the budget test renders the panel with it.
6. **Star screen.** "You did it!", the big star, the round's line and one "Go"; the "3 of 7" toward the badge is a row
   of small stars (3 lit of 7, named for screen readers), not words. Every round in kid mode ends on it when passed.
7. **Not passed in kid mode** (out of questions, or picked up after it ran out): "Not yet. Try again?" with one big
   "Go" that starts the round again with new questions. Never the classic recap in kid mode.
8. **World checks lock after a miss.** A miss records `notYet: { day, missed, redone: [] }`. Finishing a missed round
   again (starred again, or at least completed) adds it to `redone`, like a stop check's notYet. The retry opens only
   once `redone` covers `missed`, also for a world passed before; until then the check row reads "Play the missed
   rounds first" and stays locked, and the missed rounds are marked. Older saves get `redone: []`.
9. **Ready? Go.** A world check in kid mode opens on a one-tap screen ("Ready?", "Get every one right.", "Go"); the
   "Go" tap starts reading the first question aloud by itself. No note over the first question in kid mode, and no
   "Question k of n" or "No timer" over any question (the dots name the question for screen readers), so a question
   carries only "World check" (2 words) and its one button: less than its round's header, where it was budgeted.
10. **New player.** Six visible words besides the name box ("Hi! What is your name?", "Go"); the color dots carry their
    names as aria labels, with no visible "Pick a color". "Import a save" and "Link a player" wait behind one small
    "Grown-ups" link on that screen; "Back to players" is an icon button.
11. **Buildings.** A world's building is drawn with its own pictogram (lighthouse, bridge, tower, windmill, tent,
    castle, tree, key, lamp, telescope, house), each a distinct drawing; the result screen shows it when built.

## 1. The grade map

Bands and worlds (lesson ids; shown names come from the lessons). Order inside a world is the order of play.

| Band | Worlds (rounds) |
|---|---|
| g1 Starlight Meadow | Sky Path: s1.l1, s1.l2, s1.l3, s14.l1 · Meadow Gate: s2.l2, s4.l1, s14.l2 |
| g2 River of Rules | River Bend: s2.l1, s2.l3, s14.l3, s7.l1 · Stepping Stones: s3.l1, s3.l2, s4.l2, s8.l1 |
| g3 Treasure Hills | Treasure Cave: s1.l4, s2.l4, s8.l2, s15.l1 · Hill Trail: s3.l3, s3.l4, s4.l3, s4.l4 |
| g4 Clue Canyon | Sign Ledge: s1.l5, s1.l6, s1.l7 · Canyon Floor: s2.l5, s3.l5, s4.l5, s15.l2 · Echo Wall: s15.l3, s18.l1, s7.l2 |
| g5 Truth Island | Knight Shore: s5.l1, s5.l2, s5.l3, s18.l2 · Rule Reef: s6.l1, s6.l2, s8.l3, s8.l4 · Mirror Cove: s16.l1, s7.l3, s13.l1 |
| g6 If-Then Bridge | Islander Bay: s5.l4, s5.l5, s18.l3, s18.l4 · Four Moves: s6.l3, s6.l4, s6.l5 · Table Tower: s9.l1, s9.l2, s16.l2, s16.l3 · Fair Harbor: s7.l4, s7.l5, s13.l2, s13.l3 |
| g7 Circuit City | Only-If Lane: s6.l6, s6.l7, s8.l5, s8.l6 · Table Street: s9.l3, s9.l4, s9.l5, s9.l6 · Wire Works: s10.l1, s10.l2, s10.l3, s10.l4, s10.l5 · Lantern Square: s13.l4, s17.l1, s17.l2 |
| g8 Proof Peak | Proof Trail: s11.l1, s11.l2, s11.l3, s11.l4 · Summit Steps: s11.l5, s11.l6, s11.l7, s17.l3 · Trick Market: s12.l1, s12.l2, s12.l3 · Market Square: s12.l4, s12.l5, s12.l6, s13.l5 |
| hs Symbol Summit | Symbols: s9.l7 |

Prerequisites inside the map are the order of play (every lesson-level `requires` of the Observatory places is met by
an earlier round: s15.l2 after s2.l5 and s15.l1; s15.l3 after s14.l1; s16.l2 after s2.l1; s17.l1 after s15.l2; s17.l2
after s17.l1; s17.l3 after s17.l2). A round opened from the map skips the stop-order gate and the place gate
(`from: 'grades'`); completing it records the lesson exactly as today (`lessonsDone`), so the stop Journey shows it too.

Budgets (`KidBudget`): g1 {words 12, sentence 8, sentences 2, autoRead, timer off, strip off}; g2 {20, 10, 2,
autoRead}; g3 {30, 12, 3, read-aloud on tap}; g4 {40, 14, 4}; g5 {50, 16, 4}; g6 {60, 18, 5}; g7–g8 {75, 22, 6};
hs {90, 25}. Timer off and strip hidden for g1–g3.

## 2. Data model and shared pieces (B1, the core)

Types (`src/engine/types.ts`):
- `LessonDef.kid?: KidLesson` and `KidLesson { cards: KidCard[] /* one per idea card, same order */; board?: KidBoard[] /* one per drill step */; star?: string /* the one-line "you did it" */ }`, `KidCard { line: string; art?: Picto | 'scene' /* draw the card's scene */ }`, `KidBoard { line: string }`.
- `ItemBase.kid?: KidItem` and `KidItem { prompt: string; nope: string /* one line after a miss */; show?: TeachCase /* the "Show me" picture */ }`; `Choice.art?: Picto`. Generators of g1–g3 rounds set these; the engine never invents kid text.
- `Picto`: the names of a small vector pictogram set (`src/game/components/Pictogram.tsx`, multi-color SVG, `role="img"` with a words map for speech): calendar, cat, cat-wings, cloud-rain, pizza, sun, moon, star, apple, dog, fish, bird, tree, house, car, ball, cup, book, hat, lamp, telescope, key, flower, umbrella, check, cross, question, and the shape cards already drawn by `ThingCard`. Builders may add names; every name has a drawing.
- `src/content/grades.ts`: `GradeDef { id; label /* "Grade 1" */; title /* "Starlight Meadow" */; worlds: WorldDef[]; budget: KidBudget; check: { items: number } }`, `WorldDef { id /* g1.w1 */; title; rounds: string[]; building: Picto }`, helpers `bandOf(lessonId)`, `roundsOf(band)`, `allRounds()`, `nextRound(save)`, `roundOpen(save, lessonId)`.

Save (`src/engine/save/save.ts`): `SaveData.kid: KidSave` parsed like `evidence` (defaults for old saves; export, import and sync carry it; the PIN never travels):
```
KidSave { grade: GradeId | null;           // null = not chosen (grown-up or classic)
          placed?: { grade: GradeId; day: string; by: 'check' | 'grownup' };
          stars: Record<lessonId, 'clean' | 'mended'>;
          worlds: Record<worldId, { passDay?: string; tries: number; notYet?: { day: string; missed: string[] } }>;
          glow: Record<lessonId, 1 | 2>;    // lock-in and week checks of the lesson's stop make its star glow
        }
```
Derived (pure functions in `src/game/kid.ts`, tested): stars per band, stickers (one per 3 stars in a band, from a fixed sticker list per band), buildings (worlds with `passDay`), badges (every world of a band passed), skipped bands (below the placed grade with no stars), the next round, days played this week (from `save.active`).

Store (`src/game/store.tsx`): `setGrade(grade, by)`, `starRound(lessonId, kind)` (called from LessonScreen when `onComplete` reports the run: `LessonRunner.onComplete(summary: { clean: boolean })`, computed from the run's results before `completeLesson` clears the run), `finishWorldCheck(worldId, records, missed)`, `recordAnswer` gains `fromPlacement` (counts nowhere, like a warm-up). Settings: `timer` and read-aloud follow the band's budget for a player with a grade in g1–g3 (the toggles still exist for grown-ups; the band only sets the default and hides the timer).

Routes and screens:
- New player: name and color only ("Hi! What is your name?", the color dots, "Go"; import and link behind "Grown-ups"). Then `{ name: 'grade' }`: "Which grade are you in?" with nine big buttons (1–8, "High school"), "Not sure? Try a short check" (placement), and "I'm a grown-up" (grade null; the classic Journey; the grown-up area keeps the PIN and sync).
- `{ name: 'journey', track: 'grades' }`: the grade map. The Journey's first chip is "My grade" when a grade is set. The page shows the band's star sky (SVG, positions computed per world and round, like `ObservatoryMap` but laid out, with clean, mended, open and locked states), the worlds as rows of rounds (title, star, "Play ▸" or lock), each world's check row, Pip with the stickers earned, the grade badge once earned, and "Other grades" (collapsed) to move up or down (a grown-up gate for moving down more than one band is not needed; moving is free).
- `{ name: 'lesson', from: 'grades' }` skips the two gates; `back()` returns to the grade map; the header reads "Round k of n · World title" instead of "Stop N · Lesson k of m"; the recap in kid mode is the star screen ("You did it!", the star lighting, "3 of 7" toward the badge, one big button); the pass note becomes three empty stars that fill (kid mode) or stays as the sentence (classic).
- `{ name: 'worldcheck', worldId }` and its result: items drawn from the world's rounds' practice packs (several seeds, no `workFirst`/`fixed`, re-ided per round, deduped by `looks`), `CheckRunner` with a world header and the band's note ("Every answer must be right. A miss sends you back to that round, then new questions."), no timer for g1–g3, all right passes and sets `passDay`; a miss records `notYet` with the missed rounds and `redone: []`, and the retry waits until every missed round is played again; "Learn it again" opens the round with `from: 'worldcheck'` and returns to the result. In kid mode it opens on "Ready? Go".
- `{ name: 'placement' }`: the check described in §0; result screen names the grade and lets a grown-up change it (the existing `GrownUpGate`).
- Home in kid mode (grade g1–g3): Pip, "Play ▸ {next round}", the band's star sky small, days this week, nothing else above the fold; the classic Home stays for grade null and g4+ (with the star sky added under Next up, and the flame replaced).
- Me: "Grade N · change" chips; stars, stickers and badges; "days this week".
- Grade badge ceremony: a full-screen card for ten seconds or a tap (Pip cheers, the badge, "Grade N done!"), respecting reduce motion; "Print a certificate" opens a print view (the browser's print).
- Kid rendering (`kid` prop threaded through LessonRunner, IdeaCards, DrillBoard, LearnItem, ItemView, ExplanationPanel, or a React context `KidModeContext` with the budget): cards show the picture then the line (the h2 keeps focus), no kicker count, no why, no routine line, no dots label text; boards show the kid line and marks drawn as check/cross or yes/no icons; items show the kid prompt, picture choices as big tiles (`Choice.art`) or yes/no tiles, and the three goal stars; feedback is `nope` + "Show me" (the `show` case or the item's example) + "Tell me more" (today's panel) + "Try again"; the right-answer panel is "Yes!" + one line; read-aloud starts by itself on each card and item for g1–g2 (started in the tap handler that opened it, so browsers allow it; the speaker button still works).
- Word-budget test (`src/game/__tests__/kid-budget.test.ts`): for every round of g1–g3 with a kid layer, render every card, every board, the first quiz item and its miss feedback in kid mode (server render) and count words in the visible text (the nav and sr-only text excluded; a button counts); assert the band's budget. A second test lists any g1–g3 round without a kid layer (fails once the band's content is due).

Tests to add: grades (every lesson once; prerequisites in order; budgets), kid save round trip and sync, star derivation (clean vs mended; never from a Next tap), stickers/buildings/badges derived, next round and unlock rules, placement stop rule, world check item drawing and pass rule, the new-player flow copy, kid rendering of a fake round, and the Journey grade tab.

## 3. Content (B2): the g1–g3 kid layer

For every round in g1 (7), g2 (8) and g3 (8), the lesson gets its `kid` layer and its generators give every item a
`kid` block: cards as one line within the band's budget with a picture (a pictogram or the card's own scene when it is
already a picture), boards as one line with icon marks, items with a short prompt and picture or yes/no answers, a
one-line "Not yet" with a "Show me" case. The logic, the ids, the pass rules and the classic text stay unchanged; the
kid layer sits beside them. A new word per round at most in g1–g3, named on a word card (a kid card whose line is the
word and its use: "False: not true. Cats can fly. False!").

Builders by stop: s1 (l1–l4), s2 (l1–l4), s3 (l1–l4), s4 (l1–l4), s7 (l1), s8 (l1, l2), s14 (l1–l3), s15 (l1). Each
adds the pictograms it needs to `Pictogram.tsx` (simple, flat, two or three colors, drawn in code). The treasure-sign
rule (s1.l4) is unchanged: the kid layer shows the chests and signs as the picture and asks "Which chest?" in budget.

## 4. Trims (B3): g4–g8

The budget test reports the worst screens of g4–g8 rounds. A trim pass shortens the wordiest cards (Arguments l2,
Ways to Think l2, the sign lessons, Spot the Trick) toward their band's budget without changing meaning, ids or the
tests' pinned facts; it never touches the treasure-sign rule or the Knights & Knaves and If… then logic.

## 5. Acceptance checks
1. Every g1 screen a kid sees has 12 words or fewer, counted from rendered text; g2 20; g3 30 (test).
2. A star is written only by the lesson pass rule or a finished repair, never by a Next tap (store test).
3. Hints, "I'm confused" and repairs count as supported, never as first tries (existing evidence rule).
4. Every lesson appears in exactly one band; every save loads with the same progress; a v0.12.0 save gets `kid` defaults.
5. No timer shows in g1–g3; read-aloud starts by itself in g1–g2 once the kid has tapped.
6. The treasure-sign, Knights & Knaves and If… then answers are unchanged (existing engine tests pass).
7. The Pattern Workshop keeps today's order.
8. Number answers use the in-app number pad.
9. Browser pass: a Grade 1 player plays Sky Path end to end at 320 px with no screen over budget; the grade map,
   placement, a world check and the badge ceremony at 320/375/430.

## 6. Build order
B1 core (two steps: data, map, placement, world checks, rewards; then kid rendering, pictograms, feedback, auto read,
budget test) → B2 content (eight builders with reviewers) → B3 trims → B4 integration, docs, v0.13.0, publish.

## Status: built (v0.13.0)

The core, the rendering rounds and the Grade 1 to 3 content are in. Every round of Grades 1 to 3 passes the budget
test with no excused screens; the browser pass plays Grade 1 end to end at 320 px, and a Grade 2 and a Grade 3 world
at 375 and 430 px, with every screen within budget. Notes from the reviews:
- Kid-only alternates ask the same skill on the same case; a few have one fixed answer by their shape (an Explain
  alternate that asks whether a wrong block fits is always "no"); the classic items keep their full variety.
- The first two sign puzzles of Treasure signs and the first boards of Grid Detective lessons 2 and 4 drop their
  classic "mark the cases first" board in kid mode; the round's own boards teach the step.
- Some Grade 3 screens sit at exactly their budget (Line Up board 3, Grid Detective board 3 and its two-part prompts),
  so any added word there fails the budget test.
- The Grade 4 to 8 trims (section 4) follow in the next release.

## How to add a kid layer

The pattern for B2, as built for s1.l1 (What is a statement?) in `src/content/stop1.ts` (`L1_KID`, `KID_LINE`,
`KID_SHOW`, `kidIsThis`, `kidWhich`). The kid layer sits beside the classic text: never change a classic string, an
id, an answer or a pass rule to make it fit.

1. **Cards.** Set `LessonDef.kid = { cards, board, star }`. `cards` has one `KidCard` per idea card, in the same
   order: `{ line, art }`. The line is the whole card (the picture, then the line in the title; no body). `art` is a
   pictogram name, or `'scene'` to draw the card's own scene (only when that scene is a picture with few words: its
   words count). Name the round's one new word on a word card ("Statement: it is true or false.").
2. **Boards.** One `KidBoard` per drill step: `{ line, rows }`. A board of rows is marked one row at a time under the
   line, so `rows` (optional, one per row in the board's order, given rows as `{}`) can give a row a shorter `label`
   of the same kind and an `art` picture. Options that are true/false, yes/no, fit/not or keep/reject draw as a check
   tile and a cross tile with no words; other options keep their words. A grid or case board keeps its own board and
   only loses its body, steps and notes.
3. **Items.** Every generator of the round sets `ItemBase.kid = { prompt, nope, yes, show, hint }`: a short prompt;
   `nope`, the one line after a miss (it sits next to "Show me" and "Try again" under the header: at most 4 words in
   Grade 1); `yes`, the line under "Yes!" (optional; at most 6 words in Grade 1); `show`, a small `TeachCase` that
   "Show me" draws in place of the line (a twin of the same kind, never the quiz's own question, label plus a short
   note; label and note together at most 6 words in Grade 1); `hint` (optional), one line of at most 8 words that the
   bulb opens on its own screen (without it the bulb shows `show` as a picture only, its label without the note). For
   picture answers set `Choice.art` on every choice: they draw as big picture tiles with the label under the picture.
   Set the kid block in the generator itself, so lesson items, new examples after a miss, the stop check and the world
   check all get it.
4. **Pictures.** Use names from `src/game/components/Pictogram.tsx`. A new picture needs its name in the `Picto`
   type (`src/engine/types.ts`), its spoken name in `PICTO_WORDS` and its drawing in `DRAW` (flat, two or three
   colors, a 64-unit square, no text); the compiler and `kid-render.test.ts` catch a missing one.
5. **Budget.** Run `npx vitest run src/game/__tests__/kid-budget.test.ts`. Under the header "Round k of n" (4
   words, counted), it renders every kid card, every board row, every quiz item of the planned pack over 24 seeds,
   and for each item the compact miss feedback, the "Show me" picture, the opened hint and the "Yes!" panel, then the
   star screen and the "Not yet" screen, and counts what a young reader sees (buttons count; screen-reader text does
   not): Grade 1 at most 12 words a screen, 2 sentences, 8 words a sentence; Grade 2 20, 2 and 10; Grade 3 30, 3 and
   12. Room left for content in Grade 1, with the fixed words of each screen: a card line 6 (header, "Back", "Next");
   a board line and its row 7 ("Check"); an item's prompt, its sentence and its answer words 7 ("Check"); `nope` 4;
   the `show` case 6 ("Try again"); a hint 8; `yes` 6 ("Yes!", "Next"); the star line 4 ("You did it!", "Go"). Choices
   that are sentences count as sentences. It also checks the kid lines' reading level, curly quotes, no symbols, no
   "wrong", and a kid hint of at most 8 words. Set `KID_BUDGET_ROUNDS=1` to print each round's worst screen. When the
   round's layer is in, its todo line disappears from that test.
6. **Speech.** Nothing to add: read-aloud and the auto read-aloud (Grades 1 and 2, "Read aloud by itself" in
   Settings) read the kid line, the kid prompt with the sentence or picture and the answers ("Yes, or no?", or each
   picture tile by its label, never by its kid word or the picture's name).

Known limits for content builders: a "Which of these" item lists its sentences as choices, so in Grade 1 it runs over
12 words and 2 sentences unless its choices are short (the budget test now checks every quiz item, so such an item
needs a kid form that fits, such as picture tiles or a yes/no about one sentence). The world check's own screens are
checked in `kid-journey.test.ts` ("Ready? Go" fits Grade 1); its questions are the rounds' items, already budgeted
under the round's header, and the check draws them under less ("World check", no kicker, no timer note).
`KidItem.yes`, `KidItem.hint` and `KidBoard.rows` were added to the §2 types for this.

**Round 2 fields for boards** (`src/engine/types.ts`, drawn by `DrillBoard.tsx`, counted by `budget-screens.ts`):
- `KidRow.marks?: KidMark[]` (`{ label?: string; art?: Picto }`, one per mark of the row, given marks as `{}`): a mark's kid label (at most 8 words) or picture; a board of rows in kid mode is marked one mark per page, row by row and mark by mark (line, row label and picture, then the mark), and a mark without a kid label shows its own label when its row has several marks to tap.
- `KidBoard.options?: Record<optionId, { art: Picto; word?: string }>`: word options (must / might / can’t, keep / cross out) drawn as picture tiles with at most one word; a yes/no-like pair keeps its check and cross tiles, an option without an entry prints its label, and every tile is announced by its option's own label.
- `KidBoard.alt?: DrillStep`: a kid-only replacement step (same id) drawn and checked in place of the step in kid mode; `rows`, `options` and `marks` then describe the alt step. Classic play never sees it.
- `KidBoard.scene?: 'scene'`: draws the step's own scene once, above the row to mark.
- `KidRow.label: ''` draws no row label (the picture or the mark carries it).
- Counting: a grid's `th` cells, `caption` and `figcaption` are labels (their words count, they are never sentences); a digit alone is a word. The budget tool names each mark page by its row (`board 2 row 3`, or `board 2` for a board with one row to mark) and renders the alt step for a board with one.
- World check in kid mode: the result is compact ("Not yet." with a row per missed round, its number, title and "Learn it again"; or "You built it!" with the building and one button), and no note shows over the first question.

**Round 2 fields for items** (`src/engine/types.ts`, drawn by `ItemView.tsx` and `KidPlay.tsx`, swapped in by
`kidItemOf` in `src/game/kidPlay.ts`):
- `KidItem.scene?: KidScene`: what kid mode draws in place of the item's scene: `{ kind: 'pictos', rows: { art, word? }[][], keep?: true }` (rows of pictograms with at most one short word under each; `keep` draws them above the classic scene), `{ kind: 'things' }` (the scene's cards as plain faces, no numbers, no names) or `{ kind: 'none' }` (nothing). Without it the classic scene draws.
- `Choice.word?: string`: the word (at most two) printed under a picture tile in kid mode; `''` prints nothing; without it the tile prints its label. The tile is always announced and read aloud by its label.
- `KidItem.alt?: Item`: a kid-only replacement item (same id, tags and skill, its answer from the same case, its own `kid` block, any kind) for an item whose answers are whole sentences. `kidItemOf(item, kid)` swaps it in (keeping the outer `id` and `tags`; the same object when there is none) where a kid-mode pack is built: a lesson's tries and extra tries and the new examples after a miss (LearnItem), a check in kid mode (CheckRunner; the stop check's list in CheckScreen; `worldCheckItems(world, count, seed, kid)`), and young placement items (`placementItem`, drawn in kid mode via `placementKid(band)`). The budget test measures the alternate. Classic play never sees it.
- Kid mode with no field to set: tap and multi items keep their help line and the "k chosen" count for screen readers only and draw plain cards (no position numbers, no "Tap to choose"); a count item's cards draw plain and the number pad's help line is for screen readers only; a logic grid's tap help is for screen readers only; a line-up's help is for screen readers only and an empty spot is a dashed box (spot numbers and end labels stay); a review or transfer item draws no faded frame (a Do item's frame stays).
- `yesNoOf` also pairs Matches/Breaks, Fits/Does not fit, Right/Not right and Same/Different (by id or by their words), so they draw as check and cross tiles. A picture-only hint reads the picture's words, never the case's note.
