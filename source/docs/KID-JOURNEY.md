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

Budgets (`KidBudget`): g1 {words 12, sentence 8, sentences 1, autoRead, timer off, strip off}; g2 {20, 10, 2,
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
- New player: name and color only ("Hi! What is your name?", "Pick a color", "Go"). Then `{ name: 'grade' }`: "Which grade are you in?" with nine big buttons (1–8, "High school"), "Not sure? Try a short check" (placement), and "I'm a grown-up" (grade null; the classic Journey; the grown-up area keeps the PIN and sync).
- `{ name: 'journey', track: 'grades' }`: the grade map. The Journey's first chip is "My grade" when a grade is set. The page shows the band's star sky (SVG, positions computed per world and round, like `ObservatoryMap` but laid out, with clean, mended, open and locked states), the worlds as rows of rounds (title, star, "Play ▸" or lock), each world's check row, Pip with the stickers earned, the grade badge once earned, and "Other grades" (collapsed) to move up or down (a grown-up gate for moving down more than one band is not needed; moving is free).
- `{ name: 'lesson', from: 'grades' }` skips the two gates; `back()` returns to the grade map; the header reads "Round k of n · World title" instead of "Stop N · Lesson k of m"; the recap in kid mode is the star screen ("You did it!", the star lighting, "3 of 7" toward the badge, one big button); the pass note becomes three empty stars that fill (kid mode) or stays as the sentence (classic).
- `{ name: 'worldcheck', worldId }` and its result: items drawn from the world's rounds' practice packs (several seeds, no `workFirst`/`fixed`, re-ided per round, deduped by `looks`), `CheckRunner` with a world header and the band's note ("Every answer must be right. A miss sends you back to that round, then new questions."), no timer for g1–g3, all right passes and sets `passDay`; a miss records `notYet` with the missed rounds; "Learn it again" opens the round with `from: 'worldcheck'` and returns to the result.
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
