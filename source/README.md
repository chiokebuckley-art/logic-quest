# LOGIC QUEST

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

- **True or False?** Statements; true, false or can't tell; the NOT flip; treasure signs.
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
- **Learn first.** Every lesson opens with short key-idea cards, which can be read aloud. Then come 3–5 tries
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
