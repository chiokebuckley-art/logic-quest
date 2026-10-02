# Logic Quest architecture

Logic Quest follows Engineering Quest's split. Rules and puzzles are plain TypeScript with no DOM, and they are
unit-tested. Screens are React. Content is data plus the generators that make it.

```
src/
  engine/                pure TypeScript, tested with vitest
    types.ts             the Item model (choose, tapall, order, assign, multi), Scene, LessonDef, StopDef
    teach.ts             helpers for the teaching after a wrong answer (Item.teach, ChoiceFeedback)
    fresh.ts             new examples on the same skill after a miss
    grade.ts             grade(item, answer); clueHolds() for line-ups, gridClueHolds() for logic grids,
                         claimTrue() / speakerFits() for knights and knaves
    rng.ts               seeded random numbers: the same seed always gives the same items
    readability.ts       Flesch-Kincaid grade check for the 6th-grade reading level
    puzzles/             generators: statements, signs, rules, lineup, grid, knights, conditionals
    notebook.ts          the Wrong-Answer Notebook: misses come back as fresh questions until fixed
    journey/mastery.ts   Journey rules: lessons first, 100% pass, not yet, lock-in, week check, next step
    save/save.ts         players, PINs, saves, answer stats, export/import, CSV
  content/
    stops.ts             the 12-stop Journey registry
    stop1.ts … stop6.ts  lessons (key-idea cards + practice) and the stop checks
  game/
    store.tsx            React context: players, the active save, screen, autosave
    components/          play components (ItemView, LessonRunner, CheckRunner, …) and chrome (Hud, Nav)
    screens/             Home, Journey, Stop, Library, Me, Search, Lesson, Check, Arcade, Progress/Grown-ups, Notebook, Players, Settings
    hooks/               active-time clock, update check
  styles/                global.css (tokens and base classes), play.css (items and lessons)
```

## Items

Every question is an `Item`, which is plain data:

- `choose`: pick one choice.
- `tapall`: tap every shape card that fits.
- `order`: build a line from clues.
- `assign`: give every person a value in each category. Stop 4 uses it as a ✓/✗ logic grid with `gridClues`.
  Stop 5 uses it as Knight / Knave toggles, with each islander's `claims`.
- `multi`: pick every text card that must be turned over (the stop 6 rule checker).

Each item names the lesson that teaches its idea. That is where "Learn this again" sends the player after a
not-yet. Items carry their own explanation and the reasons a wrong pick is wrong. `grade()` marks any answer, and
the contract test (`src/engine/__tests__/stops.test.ts`) proves each item is well formed. For line-ups, grids and
islands, it brute-forces every possible answer and checks that exactly one fits. An item can set `seconds` for a
longer check timer: grids and three-islander puzzles get 150–180 seconds instead of 90.

## Wrong answers

A wrong answer is a teaching moment (see "Wrong answers: teach first" in `CONTENT_GUIDE.md`):

- `game/explanation.ts` turns an item and the chosen answer into one model. The screen (`ExplanationPanel`), the
  read-aloud and the check result all use it, so the words always match.
- `ItemView` (learn mode) shows the explanation at once. "Try this question again" clears only the chosen answer
  and keeps "Review the explanation".
- `LearnItem` then brings new examples on the same skill (`engine/fresh.ts`): one, or a set from `StopDef.fresh`.
  A miss there shows its explanation and its simpler example, then another new set. "Move on for now" appears
  from the second miss.
- One `AnswerRecord` per item. It is right only on the first try, or when a new set is passed with no hint.
  Otherwise the skill goes to the notebook. `help` keeps the explanation, the retry and the new examples apart.
  The save tallies them per skill and day in `SaveData.help` (also in the CSV). Choices with no explanation of
  their own are listed in `SaveData.gaps` for repair.

## The Journey

`journey/mastery.ts` holds the WORDRAIDERS mastery model:

- A stop's check opens only after every lesson is done.
- The check passes only with every answer right. A miss is "not yet": the missed lessons must be redone, and the
  retry uses new questions. The seed includes the attempt number.
- Two not-yets in one day rest the stop until tomorrow.
- A pass is locked in by a check on a later day, then a week-later check makes the stop mastered.
- The next stop opens as soon as a stop is passed.
- Journey days roll over at 3 am.

## The Wrong-Answer Notebook

`notebook.ts` follows Engineering Quest's notebook:

- A miss adds a card for that skill: a wrong check answer, a timeout, or "Show me".
- The card comes back as a **fresh** question on the same skill. `freshItem` draws it from the lesson's
  practice sets. It is ready right away, then 3 days after the first fix, then 7 days after the second.
- Three clean fixes, each right on the first try, clear the card.
- A miss while fixing starts the card over from tomorrow.
- A card for a stop this version does not have (from a newer version's save) waits as "In a later version". It
  is not counted as ready.
- Check answers count as soon as they are given. So a check closed partway still puts its misses in the notebook.

The Journey shows "Repair quests: N ready", and Progress shows how many cards are open and fixed.

## Saves

Players and saves live in `localStorage`:

- `logic-quest.players.v1` holds the registry.
- `logic-quest.save.<id>` holds each player's save.

Every save carries `game: "logic-quest"`, so saves from other family games are refused. Top-level fields that
this version does not know (added by a newer version) are carried through untouched. So an older tab that saves
does not wipe them. Sync across devices will
use the shared Cloudflare worker with `LQ` codes (planned for v0.5.0).
