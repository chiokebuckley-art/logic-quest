# LOGIC QUEST

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
  with instant feedback. A miss names the exact mistake, and after two misses "Show me" gives the answer.
- **Show what you know.** The stop check opens after every lesson is done. It passes only when every answer is
  right. A miss is "not yet": the result lists each missed idea with "Learn this again". The retry opens after
  those lessons are redone, and it uses new questions. Two not-yets in one day rest the stop until tomorrow.
- **Lock it in.** A pass is locked in by a check with new questions on a later day. A week-later check makes the
  stop mastered. The next stop opens as soon as a stop is passed.
- **Calm timer.** Check questions have 90 seconds each, shown as a quiet bar. Grown-ups can turn it off in
  Settings.
- **"Can't tell" is a real answer** whenever the clues don't decide it.
- **Every puzzle is generated fresh** and proven to have exactly one answer before it is shown.
- **Wrong-Answer Notebook:** a wrong check answer, a timeout, or "Show me" puts that idea in the notebook. It
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

