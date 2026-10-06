# Logic Quest architecture

Logic Quest follows Engineering Quest's split. Rules and puzzles are plain TypeScript with no DOM, and they are
unit-tested. Screens are React. Content is data plus the generators that make it.

```
src/
  engine/                pure TypeScript, tested with vitest
    types.ts             the Item model (choose, tapall, order, assign, multi), Scene, LessonDef, StopDef
    teach.ts             helpers for the teaching after a wrong answer (Item.teach, ChoiceFeedback)
    drill.ts             the Do step: checkDrill() for guided boards, and the lesson pass rule (passState)
    fresh.ts             new examples on the same skill after a miss
    grade.ts             grade(item, answer); clueHolds() for line-ups, gridClueHolds() for logic grids,
                         claimTrue() / speakerFits() for knights and knaves
    rng.ts               seeded random numbers: the same seed always gives the same items
    readability.ts       Flesch-Kincaid grade check for the 6th-grade reading level
    puzzles/             generators: statements, signs, rules, lineup, grid, knights, conditionals
    notebook.ts          the Wrong-Answer Notebook: misses come back as fresh questions until fixed
    journey/mastery.ts   Journey rules: lessons first, 100% pass, not yet, lock-in, week check, next step
    save/save.ts         players, PINs, saves, answer stats, export/import, CSV
    save/sync.ts         cloud sync: LQ codes, config, gzip packing, pull/push, reconcile (syncLink.ts: the link)
  content/
    stops.ts             the 13-stop Journey registry
    stop1.ts … stop6.ts  lessons (key-idea cards + practice) and the stop checks
    stop7.ts, stop7/     Ways to Think: one module per lesson (LessonModule in stop7/common.ts: the lesson, its two
                         check items, an Arcade item, new examples), put together by stop7.ts
  game/
    store.tsx            React context: players, the active save, screen, autosave, cloud sync
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

## Lessons: See, Do, Quiz

Every lesson teaches each new method in three beats (see "Teach before the quiz" in `CONTENT_GUIDE.md`):

- **See.** The key-idea cards (`IdeaCards`). One card shows a worked case already marked on its board. Tapping
  Next is allowed, and it never passes anything.
- **Do.** The guided boards (`LessonDef.drill`, drawn by `DrillBoard`). The same board stays up. A shown case is
  drawn marked, and the learner marks a new case by taps: true or false, fits or not, a check or a cross, a count,
  keep or reject. "Check my marks" names the first mismatch in plain words (`checkDrill` in `engine/drill.ts`). A
  wrong mark stays until the learner changes it. A board with `columns` is drawn as a grid. A board with
  `layout: 'cases'` is a **case board** (`CaseBoard`, sign puzzles): the boxes are cards; tap one to pick its case,
  tap each sign to stamp True or False, the count is worked out from the stamps (`caseCount`), then Keep (a ring)
  or Reject (a cross). The same picture, with `Scene` kind `cases`, draws the worked example (`CaseScene`), one
  step at a time inside `IdeaCards`.
- **Quiz.** The practice tries (`LearnItem`), only in the rule family the lesson taught. An item can carry its own
  board (`workFirst`), marked before its answer buttons show. A case board stays up, marked, while the question is
  answered, and a wrong mark on it makes that try not a first try (`DrillBoard.onWrong` → `onMiss`, saved at once).
  A sign item also carries an optional thinking board (`scratch`), opened with “Use the case board” and never
  checked. Its Hint shows one marked case (`hintCase`).

`LessonRunner` runs ideas, then boards, then tries, then the recap. The lesson is passed only when the boards are
marked right and the pass rule is met (`LessonDef.pass`; default 3 right on the first try with no hint, optionally
in a row or including tagged items). Until then, extra quiz items come from the lesson's own practice
(`extraQuizItem`). The store refuses `completeLesson` for a lesson with boards that are not in `SaveData.drilled`.

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

- A miss adds a card for that skill: a wrong check answer, a timeout, or a lesson try not passed on its own after
  the explanation.
- The card comes back as a **fresh** question on the same skill. `freshItem` draws it from the lesson's
  practice sets, never the lesson's scaffolded first quiz (`workFirst`). It is ready right away, then 3 days after
  the first fix, then 7 days after the second.
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

A save also keeps `drilled` (lessons whose guided boards were marked right) and `lessonRun` (the lesson in
progress: its seed, the next try, whether the boards are done, and each quiz answer, so a resumed lesson rebuilds the
same extra items).

Every save carries `game: "logic-quest"`, so saves from other family games are refused. Top-level fields that
this version does not know (added by a newer version) are carried through untouched. So an older tab that saves
does not wipe them. A missing or damaged save loads as a fresh one dated 0, so sync never takes it for news.

## Sync across devices

A synced player carries `sync: {code, rev, at}` in the registry: the secret code, the server revision this device
last saw, and that save's time. The server (`wordraiders/sync/worker.mjs`, shared with Engineering Quest) keeps one
save per code and refuses a push whose `baseRev` is not its current revision, handing back the newer save instead.

- **What travels:** `exportSave(player, save)` packed with gzip and base64 (`gz1:`). Never the PIN. A cloud copy is
  read back with `importSave`, so a save from another game, or a damaged one, is refused.
- **When:** the store pulls when the sync server is found (for the player already playing), when a linked player is
  picked, and when the game comes back to the front after 20 seconds or more. A change schedules a push 15 seconds
  later; hiding or closing the game sends it at once (`keepalive` when the body is small enough), and picking another
  player sends a snapshot of the outgoing player's save first. Pushes and pulls run one at a time.
- **Times:** `localChangedAt` is when play last changed the active player's save. It only moves forward, it is the
  time stamped on the save file, and it is the `savedAt` a push sends. So the cloud records when a copy was played,
  not when it was pushed. `link.at` is the time of the copy this device last pushed or took.
- **Which copy wins** (`reconcile`): this device has changed since it last synced when its last change is later than
  `link.at`. Nothing saved here (time 0) → take the cloud copy. Cloud moved on and this device did not → take it.
  This device changed and the cloud did not → push. Both changed → the copy played later wins. A push that meets a
  conflict takes the cloud copy when it is the later one, and otherwise pushes again on top of it. It never pushes
  over a copy it could not read, and it leaves the cloud alone if sync was turned off meanwhile.
- **Not a change:** a save just loaded or just taken from the cloud is not written again (the `baseline` ref).
  Changes the game makes by itself (`quietSaves`: settling a check left open, counting active time) are written
  under the last real change's time and start no push, so a device left open never beats one that was played.
- **Limits:** a cloud copy that unpacks to more than 3 MB is refused, and a save keeps at most 200 KB of fields from
  a newer version. Server errors reach the player as plain words (`sync.MSG`), never as the server's own text.
- **Address:** `localStorage["logic-quest.sync.url"]`, then `sync.json` next to the build, then the built-in default.
  `off` in either place hides sync.
