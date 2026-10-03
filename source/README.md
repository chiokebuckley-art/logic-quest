# LOGIC QUEST

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

- **The Journey** has 12 stops, in first-principles order, from "True or False?" to "Clues & Chances". The
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

## For developers

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the engine / content / game split, the item model, the Journey
  rules and the save model.
- [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md): how to write a stop, and the rules the contract test enforces.
- [docs/PUBLISHING.md](docs/PUBLISHING.md): `/logic` on the Command Center, and GitHub Pages.
