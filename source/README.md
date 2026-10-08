# LOGIC QUEST

**v0.10.0 — The Pattern Observatory:** a side constellation of pattern recognition, from the owner’s handoff
*Pattern Recognition from First Principles* (v2). Four rings, ten places, one routine. It opens from the start and
never blocks the main track.

- **Four rings, ten places.** Ring 1 First Lights (Star Chain, Repair Bench, Echo Bells: a chain is made by
  repeating a block, and the unit is the shortest block that repeats all the way). Ring 2 Rule Rise (Growing
  Staircase, Rule Machine, Clock Tower: a stated construction gives the far step; two rules that agree on one input
  are told apart by a separating test; item positions and elapsed days are two ways of counting). Ring 3 Deep Sky
  (Mirror Pool, Matrix Gate, Analogy Bridge: a fold keeps every point’s partner; a tile must fit the row rule and
  the column rule; an analogy keeps the relation, not the look). Ring 4 Proof Lantern (proved, a guess, or false;
  counterexamples and separating tests; why a stated construction guarantees its pattern).
- **One routine on every screen.** Notice → Describe → Compare → Test → Predict → Explain, lit for the phase you are
  in. Every place runs See → Explain → Do → Transfer → Review: a worked example with the steps visible, a “why”
  question, a faded example then the same task with no frame, the same structure in new materials, and fresh
  questions on later days.
- **A number pad.** Numeric answers are typed on big keys in the app, so a tablet’s keyboard never opens.
- **Help is not grading.** Hints and retries are welcome. A repaired item counts as supported; a fresh twin counts as
  independent. A first try, once recorded, never changes.
- **An evidence profile per place.** Practiced · Lesson complete · Independent (6 fresh questions, 5 right, no
  hints) · Transferred (2 unfamiliar contexts) · Retained (4 fresh questions at about 2 days, 1 week and 3 weeks).
  Three clean answers complete a lesson; they are a gate, not mastery.
- **Find your level.** A short diagnostic, about five minutes with no timer, suggests a starting level per track
  (L1 Starter to L4 Prover). Each place then picks its quiz at your level on its track. Levels are never ages. A
  grown-up can change them.
- **Places open on skills, not stop numbers.** A place that needs a skill from another lesson opens when that lesson
  is done, when the diagnostic showed the skill, or after a three-question primer.
- **Plain labels for grown-ups.** Settings can name the places Repeating units, Growth rules, Functions, Cycles,
  Spatial rules and Evidence.
- **Pattern Lab bridges.** The repeat bridge now varies its block (AB, ABB, ABC), Twin Isles has content of its own,
  and bridges record first tries. With the owner’s OK, the bridges and the shared chip now use the Observatory’s routine order.

**v0.9.0 — Teach the hidden distinction:** a learner can know every word in a question and still be confused,
because two ideas have collapsed into one. The treasure signs showed it: “the treasure is in this chest” was read as
“this chest’s sign is true”. This release audits every lesson for that kind of gap and fixes every serious one.

- **The audit.** `docs/audit/hidden-distinctions.md` goes through all 37 lessons and lists 114 places where a
  lesson leans on a distinction or a step it never taught, from P0 (a fundamentally wrong idea) to P3 (polish).
  Every P0 and P1 is fixed in this release; the P2 and P3 items are listed with their fix.
- **Before you start.** Each hard distinction now gets a card with two cases side by side that differ in one thing,
  then a tiny board where you do the two cases yourself, before the first real puzzle. For example: where the
  treasure is vs whether a sign is true; the rule vs the stamps; a speaker’s kind (what the words must be) vs
  whether the words are true; a cause that works every time vs the only cause; tests vs records; a case that
  breaks a rule vs a case that can’t happen; a cross in this column vs a cross elsewhere in the kid’s row.
- **The reason, in words.** No stamp or mark shows only True or False any more. Under it sit three rows: what it
  says, what the test world says, whether they fit. The test world itself stays on screen (“Pretend the treasure is
  in the Gold chest”, “Test world: Ava is a knave”), with the rule’s need next to the count.
- **Steps that fade.** The first board and the first quiz show the whole method with the current step lit; later
  boards drop the scaffolding, and it comes back for a case you got wrong.
- **A mix-up, not a mistake.** When a pattern of wrong marks points to two ideas taken as one, the game says so
  first (“You may be treating X and Y as the same thing. They are different, because…”), then shows the concrete
  case. The old “that mark is wrong” message is gone from every board.
- **“I’m confused.”** Every board and every quiz question that rests on a distinction has a button that asks one
  to three short questions to find the mixed-up idea and teach it apart. It never gives the answer, and using it
  counts as help, like a hint.
- **A rule for every app.** The approach is written down as a design rule for Logic Quest, Engineering Quest and
  WORDRAIDERS: `docs/design-rule-hidden-distinctions.md` at the repo root.

**v0.8.0 — Real life:** every idea now comes with where it is used outside the game, and why it matters, the way
Engineering Quest shows where engineers use each skill.

- **Why it matters.** Each lesson's first card says why the idea is worth knowing, in one or two sentences.
- **In real life.** After each right answer, one line shows that exact move in real life: a ride's height rule
  for “at least”, a waiter's “soup or salad” for OR, a red card that might be a diamond for an if–then rule run
  backward.
- **Where this is used.** A finished lesson ends with three real uses, at least one from everyday life (school,
  games, home, shops) and one from a job (doctors, programmers, referees, pilots and many more).
- **Keep it in mind.** Each stop page has an “In real life” section, the Library has a new **Real life** view with
  every example by stop, search finds lessons by where they are used, and Home shows one example a day from the
  lessons you have done (“Remember why”).

**v0.7.0 — Sync across devices:** play the same player on a phone, a tablet and a computer, the way Engineering
Quest does.

- **Turn it on once.** Me → **Sync across devices** → **Turn on sync** (a grown-up answers a times question first).
  The player gets a secret code such as `LQ4K-9TQ2-MHB7`.
- **Link the other device.** On the other device, tap Me → Switch player → **Link a player from another device**
  (on a new device, that button is on the first screen), then type the code. The player arrives with all their
  progress.
- **It keeps itself in step.** A device checks the cloud when the game opens, when the player is picked and when the
  game comes back to the front. It saves to the cloud about 15 seconds after a change, and at once when you leave
  the game or switch player. When both devices changed, the one played later wins.
- **What travels:** the player's name, color and progress. Never the PIN: a PIN stays on each device.

**v0.6.0 — Ways to Think:** a new Stop 7 with five lessons, one for each way of thinking that gives a good guess
but not a proof. Each lesson is See, Do, Quiz, and every quiz has a question on when that way of thinking fails.

- **Pattern guesses.** Count a bag to tell Must, Likely, Unlikely and Can’t. A streak is a good guess, never a
  proof, and nothing is ever “due” when each draw goes back.
- **The best explanation.** Mark which ideas fit each clue, keep the one that fits every clue with the fewest extra
  things, and change your mind when a new clue rules it out.
- **Cause or just together?** A fair test changes one thing at a time. Two things that go together may both come
  from a third thing.
- **Fair choices.** Three checks from the story's facts: honest, fair to the owner or the promise, hurts no one. A
  strong wish does not change the facts.
- **Gut feelings.** A fast guess to start with. Count before you trust it: big, eye-catching things are not
  always the most.
- The stops that are still coming move down one: All, Some, None is now Stop 8, and the side track is Stops 12
  and 13.

**v0.5.0 — The case board:** the treasure sign lessons (Stop 1, Lessons 4–7) now teach on one picture board.

- **See it one chest at a time.** The example shows the Gold chest, then Silver, then Bronze. One tap stamps one sign
  True or False, right on the sign, with one line that says why. Then the count shows, and the chest is crossed out
  or kept with a ring. A last card shows all three: only Silver is kept.
- **Do it on the same board.** Tap the Gold chest to pretend the treasure is there. Tap each sign to stamp it. The
  board counts the True stamps for you. Then tap Keep or Reject. A wrong stamp or a wrong Keep stays until you fix
  it, and the board says which chest and sign to look at. “Clear this case” starts one chest again.
- **Then a twin, on the board.** The first puzzle is the same three chests with one sign changed, so the answer
  moves from Silver to Bronze. You check every chest on the board before you answer. A mistake on that board means
  it does not count as a first try. The caves come next, on the same board. Later puzzles have “Use the case board”
  if it helps.
- Lessons 5–7 (“Every sign is false”, “Exactly two signs are true”, “The owner’s sign”) use the same board.

**v0.4.1 — Teach before the quiz:** every lesson in Stops 1–6 is now See, Do, Quiz.

- **See.** The key ideas end on one case already marked on its board: the Gold, Silver and Bronze chests, a deck of
  cards marked fits or not, Ava, Ben and Cal standing in line, a grid with one row filled, the four boxes of a rule
  with “the break” marked.
- **Do.** Before any quiz, you mark a new case yourself on that same board, by taps: true or false, fits or not, a
  check or a cross, a count, keep or reject. “Check my marks” names the first mark that is off, in plain words. A
  wrong mark stays until you change it.
- **Quiz.** Only puzzles of the kind the lesson just taught. Kinds no card and board taught were moved out (for
  example, Treasure signs now uses only “Exactly one sign is true”, starting with the frozen Ice, Fire and Moss caves).
  Every hint shows one case already marked.
- **Three new sign lessons** in Stop 1, each See, Do, Quiz: “Every sign is false”, “Exactly two signs are true” and
  “The owner’s sign”. Stop 1 now has seven lessons.
- **Passing.** A lesson is done only after its boards are marked right and 3 answers are right on the first try with no
  hint. Tapping Next through the cards never passes. More puzzles come until you get there, and lessons open in
  order.
- Each stop's worksheet is in [`docs/audit/drill-stopN.md`](docs/audit/).

**v0.4.0 — One page per stop, five tabs:** the app is reorganised so each thing lives in one place.

- **Home · Journey · Arcade · Library · Me.** Home says the one next thing: the Next-up card with one gold button,
  repair quests that are ready, today's plan and the Pattern Scout badge. The old Learn and Progress tabs fold in.
- **A Stop page for every stop.** Its lessons in order, its check, practice, Pattern Lab events and the repair cards
  that came from it, with the thing to do now in gold. Four stage tiles show Lessons · Pass · Lock in · Master.
- **Library** is the cross-stop index: every lesson and key idea to re-read, practice, Pattern Lab and what is
  coming. **Find anything** searches key ideas, lessons, stops, puzzles, Pattern Lab events and settings.
- **Me** holds repair quests, My progress, badges, players, play settings, export, and **Grown-ups** (behind a
  grown-up check): minutes, first try by skill, after-a-miss counts and the CSV.
- **One question frame** for lessons, checks, practice and repair quests, a key-idea card with the Pattern Lab
  routine, and a check result with a square per question.
- **Brighter colours, one meaning each:** cyan learn, lime practice, violet Pattern Lab, orange repair and misses,
  gold next and passed, mint mastered, red wrong. Same palette as the Engineering Quest remake.
- Game icons from [game-icons.net](https://game-icons.net) (CC BY 3.0). No save changes: every save carries over.

**v0.3.1 — Wrong answers teach first:** every wrong answer, in every lesson, now gets a full explanation:

- **What your answer means, and exactly where it fails.** Each wrong choice has its own explanation, with a worked
  case that proves it fails (for example, “3 red dragons and 3 yellow dragons” for a NOT that leaves out a tie).
  Line-ups and grids quote each broken clue and say where your answer breaks it. Knights and knaves quote the words
  that do not fit. Card puzzles name the cards left out or wrongly picked, and show them.
- **Why the right answer works,** a short **Remember** with a question to ask yourself, and **Explain more
  simply** with the smallest example, step by step. Everything can be read aloud.
- **Then try again, then new examples.** After the explanation, "Try this question again" is practice with help.
  Then come new examples on the same idea, answered on your own. A NOT comparison gets two: one with the tie or
  exactly k in the answer, and one without. A missed “Can’t tell” gets one more and one that the clues decide.
- **Check results** show the same explanation for each missed question.
- **Grown-ups** see what happened after a miss: explanations shown, right retries with help, and new examples
  passed on their own. These are counted apart from first-try answers, and are in the CSV.
- A lesson left partway (a refresh, a closed app) picks up at the same try.
- Each stop's audit worksheet, distractor by distractor, is in [`docs/audit/`](docs/audit/).

**v0.3.0 — Pattern Lab bridges:** the Pattern Lab artwork, an optional Explorer Pattern Workshop, preparation
events, age paths, reasoning prompts and saved bridge badges. See [docs/PATTERN_BRIDGES.md](docs/PATTERN_BRIDGES.md).

**v0.2.0 — Deduction:** three more Journey stops and the Wrong-Answer Notebook:

- **Grid Detective.** Ticks and crosses, only one left, spreading a tick, linking clues, and proving every mark.
  Every grid can be solved without guessing.
- **Knights & Knaves.** Truth-tellers and liars, what nobody can say, supposing a case and crash-testing it,
  three islanders, and what a knave's "and" and "or" really mean.
- **If… then.** When a rule is broken, turning it around, the four moves, flip and NOT, and the rule-checker
  cards.
- **The Wrong-Answer Notebook.** Every missed idea comes back as a fresh question until it is fixed three
  times: right away, 3 days later, then a week later. The Journey shows "Repair quests: N ready".
- **Check results** now show what you answered next to the right answer. Big grids and three-islander
  puzzles get a longer timer.

**v0.1.0 — Foundation:** the first three Journey stops, all playable:

- **True or False?** Statements; true, false or can't tell; the NOT flip; treasure signs, with one lesson for
  each sign rule.
- **NOT, AND, OR.** Each one on its own, then brackets, and guess the rule.
- **Line Up.** Chains, before vs right before, not first / next to / between, build the line, and which clue
  wasn't needed.

Stops 7–12 are on the Journey as "coming soon". This version also has players with PINs, the Journey rules,
Arcade practice, Progress for kids and grown-ups, read-aloud, export and import, and Add to Home Screen.

*A logic game in the Engineering Quest family, written at a 6th-grade reading level.* It works like Brilliant's
logic courses: you learn by solving a small puzzle first, then see why the answer is right.

## Play it

- **Anywhere:** https://chiokebuckley-art.github.io/logic-quest/. On a phone, choose Add to Home Screen and it
  opens full screen like an app.
- **Command Center:** served at `/logic`, behind the login.

## Run it

```bash
cd logic-quest
npm install
npm run dev        # http://localhost:5192
```

| Command | What it does |
|---|---|
| `npm test` | Engine, content and UI tests (puzzle uniqueness, Journey rules, saves, reading level) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run pages` | Build the GitHub Pages copy into `dist-pages/` (see [docs/PUBLISHING.md](docs/PUBLISHING.md)) |
| `npm run build:single` | One offline file: `dist-single/logic-quest.html` |

## How it plays

- **The Journey** has 13 stops, in first-principles order, from "True or False?" to "Clues & Chances". The
  plan for all of them is in [`../docs/logic-quest-plan.md`](../docs/logic-quest-plan.md).
- **Learn first: See, Do, Quiz.** Every lesson opens with short key-idea cards, which can be read aloud, ending on a
  worked case. Then you mark a case yourself on the same board. Then come 3–5 tries
  with instant feedback. A miss opens the explanation at once: what the answer means, exactly where it fails, and
  why the right answer works. Then "Try this question again", then new examples on the same idea, on your own.
- **Show what you know.** The stop check opens after every lesson is done. It passes only when every answer is
  right. A miss is "not yet": the result lists each missed idea with "Learn this again". The retry opens after
  those lessons are redone, and it uses new questions. Two not-yets in one day rest the stop until tomorrow.
- **Lock it in.** A pass is locked in by a check with new questions on a later day. A week-later check makes the
  stop mastered. The next stop opens as soon as a stop is passed.
- **Calm timer.** Check questions have 90 seconds each, shown as a quiet bar. Grown-ups can turn it off in
  Settings.
- **"Can't tell" is a real answer** whenever the clues don't decide it.
- **Every puzzle is generated fresh** and proven to have exactly one answer before it is shown.
- **Wrong-Answer Notebook:** a wrong check answer, a timeout, or a lesson try not passed on its own after the
  explanation puts that idea in the notebook. It
  comes back as a new question on the same idea: right away, 3 days after the first fix, then a week after the
  second. Three first-try fixes clear it.
- **Arcade:** unlimited practice for every stop you have passed. Blitz, Conquer and more games come later.
- **Progress:** *My Progress* shows counts for the player. *Grown-ups* shows 7, 14 or 30 days: minutes per day,
  first-try accuracy by skill, what needs practice and what is strong, plus a CSV download.
- **Players:** "Who's playing?" holds several players on one device, each with an optional 4-digit PIN. Settings
  can export a player to a file and import it on another device.
- **Real life:** every lesson says why its idea matters and where it is used (three real uses on its last screen),
  each right answer adds an “In real life” line, and the Library's Real life view, the stop pages and Home's
  “Remember why” keep them in view. The content lives in `src/content/world/` (see docs/CONTENT_GUIDE.md).
- **Sync across devices:** see below.

## Sync across devices

Progress normally lives in each device's browser. **Me → Sync across devices → Turn on sync** (behind the
grown-up question) gives the current player a secret 12-character sync code such as `LQ4K-9TQ2-MHB7`. On any
other phone, tablet or computer, tap Me → Switch player → **Link a player from another device** (on a new device it
is on the first screen) and type the code: the player appears with all their progress. From then on every device
pulls when the game opens, when that player is picked (after their PIN, if they have one) and when the game comes
back to the front, and pushes about 15 seconds after a change (at once when the game is hidden or closed, or another
player is picked). The cloud keeps one save per code with a revision counter, so a device holding an older copy is
handed the newer save rather than overwriting it; when both devices changed, the copy that was played later wins.
Only play counts: a device left open, or one that tidies up a check left open, never beats a device that was
played. Linking always adds a new player on that device (a name already in use gets a
number); it never replaces a player who is already there. **Turn off** stops syncing on that device only; the cloud
copy stays.

What travels is the player's export file (name, color and save), gzipped, well under the server's 400 KB cap. The
PIN never leaves the device. Anyone who has the code can load the player, so keep it private. A browser that cannot
unzip (Safari before 16.4) cannot sync, and says so; it can still use save files.

The game shares the family sync service (a small Cloudflare Worker with a database, see `wordraiders/sync/`), the
same one Engineering Quest uses. Logic Quest codes start with `LQ`; every save also carries `game: "logic-quest"`,
so a save from another game is refused. To point the game at a different server, put its address in `sync.json`
next to the build (`{"url":"https://..."}`) or in `localStorage["logic-quest.sync.url"]`; the value `off` hides
sync. Code: `src/engine/save/sync.ts` (codes, packing, server calls, reconcile), wiring in `src/game/store.tsx`.

## For developers

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the engine / content / game split, the item model, the Journey
  rules and the save model.
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): how to write a stop, and the rules the contract test enforces.
- [docs/PUBLISHING.md](docs/PUBLISHING.md): `/logic` on the Command Center, and GitHub Pages.
