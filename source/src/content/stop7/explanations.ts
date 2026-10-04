/**
 * Stop 7, Lesson 2 · The best explanation (abduction).
 * Pick the simplest explanation that fits every clue: a best guess. Then check it, because a new clue can change it.
 *
 * See: four cards build the idea on one story (the wet grass), and the worked example marks it on a grid (ideas by
 * clues, ✓ fits and ✗ does not, the best named). Do: two boards on that grid, right after it: mark a new clue (the dry
 * roof, which rules the rain idea out, so it is a good check), then, on a twin grid with that clue added, pick the best
 * guess from the first two clues (fewest extra things), pick a check that could rule one of the two fitting ideas out,
 * mark which ideas fit all three clues and pick the best guess now. The last card works one check (a clue one idea
 * fits and the other does not, drawn as a "?" column) that then turns up and changes the best guess. Quiz: which
 * explanation is best, which check could rule one of two ideas out, a new clue (conflict: the old best is tempting),
 * and "was the first best guess a proof?" (can-fail). Every answer comes from ../../engine/puzzles/explanations.ts.
 * The wet grass story is never a quiz, check or Arcade item.
 */
import {
  WORKED,
  WORKED_NEW,
  WORKED_PAIR,
  WORKED_SAME,
  WORKED_SHOWN,
  bestBoard,
  bestItem,
  bestOf,
  fitBoard,
  MAKERS,
  newClueItem,
  newClueScene,
  reviseItem,
  ruledBy,
  STORIES,
  testItem,
  workedScene,
  type ExplainKind,
  type ExplainSkin,
} from '../../engine/puzzles/explanations';
import type { Item, Rng } from '../../engine/types';
import { CAN_FAIL, distinctItems, practiceOf, type LessonModule, type Made } from './common';

const LESSON = 's7.l2';

const [RAIN, SPRINKLER, TRUCK] = WORKED.ideas;
const BEST = bestOf(WORKED.ideas, WORKED_SHOWN)!;
const BEST_NOW = bestOf(WORKED.ideas, [...WORKED_SHOWN, WORKED_NEW])!;
/** The worked check on the last card: the two ideas that fit, and what the weather report would do to them. */
const [P1, P2] = WORKED_PAIR;
const CHECK = ruledBy(WORKED_NEW);
const quote = (text: string) => `“${text}”`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The quiz: a gentle "which is best" story first, then a check, a new clue (conflict) and "was it a proof?" (can-fail). */
function practice(rng: Rng): Made[] {
  const one = distinctItems();
  const used = new Set<string>();
  const [a, b, c] = rng.shuffle<ExplainSkin>(['everyday', 'fantasy', 'abstract']);
  return [
    one(() => bestItem(rng, { skin: rng.pick<ExplainSkin>(['everyday', 'fantasy']), avoid: used, clues: 2 })),
    one(() => testItem(rng, { skin: a, avoid: used })),
    one(() => newClueItem(rng, { skin: b, avoid: used })),
    one(() => reviseItem(rng, { skin: c, avoid: used })),
  ];
}

export const lesson: LessonModule['lesson'] = {
  id: LESSON,
  title: 'The best explanation',
  ideas: [
    {
      title: 'Clues need a reason',
      body: [
        `${WORKED.setting} Why is it wet? The wet grass is a clue, and a clue needs a reason.`,
        `An explanation is an idea that makes the clues make sense. One idea is ${quote(`${RAIN.text}.`)} Another is ${quote(`${SPRINKLER.text}.`)}`,
        'Most clues have more than one possible explanation. Your job is to pick the best one.',
      ],
    },
    {
      title: 'Fit every clue',
      body: [
        'An idea fits a clue when the clue makes sense if the idea is true.',
        `Say the street is wet too. ${WORKED_SHOWN[1].why.rain} So ${RAIN.name} fits that clue.`,
        `${WORKED_SHOWN[1].why.sprinkler} So ${SPRINKLER.name} does not fit that clue.`,
        'The best explanation must fit every clue. If an idea misses even one clue, it is out.',
      ],
    },
    {
      title: 'Keep it simple',
      body: [
        'Sometimes two ideas fit every clue. Then look at what else each idea needs.',
        'An extra thing is something more that must be true for the idea to work. No clue shows it.',
        `${quote(TRUCK.text)} needs ${TRUCK.extras.length} extra things. One: ${TRUCK.extras[0]}. Two: ${TRUCK.extras[1]}.`,
        `${quote(RAIN.text)} needs none.`,
        'Pick the idea with the fewest extra things. That is your best guess.',
      ],
    },
    {
      // See: the worked example, every box marked, the best named in the caption. Both boards come right after it.
      title: 'Example: the wet grass',
      scene: workedScene(),
      body: [
        'Here is the wet grass case, marked for you. ✓ means the idea fits the clue. ✗ means it does not.',
        `${cap(SPRINKLER.name)} does not fit the wet street. ${cap(RAIN.name)} and ${TRUCK.name} fit both clues.`,
        `${cap(RAIN.name)} needs nothing extra. ${cap(TRUCK.name)} needs ${TRUCK.extras.length} extra things. So ${BEST.name} is the best guess.`,
      ],
    },
    {
      // A worked check: a clue the two fitting ideas disagree on can rule one out; a clue they both fit can't.
      title: 'A new clue can change it',
      scene: newClueScene(),
      body: [
        `${cap(P1.name)} and ${P2.name} both fit both clues. To test them, look for a clue that one idea fits and the other does not.`,
        `${WORKED_SAME.check.replace(/\.$/, '')} again? Both ideas fit “${WORKED_SAME.short},” so that check can’t tell them apart.`,
        `${WORKED_NEW.check.replace(/\.$/, '')}? If no rain fell, ${CHECK.out.short.toLowerCase()} gets a ✗ and ${CHECK.kept.short.toLowerCase()} gets a ✓. So that check could rule one idea out.`,
        `Say the report comes back: “${WORKED_NEW.text}” ${WORKED_NEW.why[CHECK.out.id]} So ${CHECK.out.name} is out. Only ${BEST_NOW.name} fits every clue now. It is the new best guess.`,
        'A best guess is not a proof. Check it before you are sure, because a new clue can change it.',
      ],
    },
  ],
  drill: [fitBoard(), bestBoard()],
  practice: practiceOf(LESSON, practice),
  pass: { firstTry: 3, include: [CAN_FAIL] },
};

/** Two items for the stop check: a new clue (a conflict item) and one other kind, each in any skin. */
export function checkItems(rng: Rng): Made[] {
  const one = distinctItems();
  const used = new Set<string>();
  const skin = () => rng.pick<ExplainSkin>(['everyday', 'fantasy', 'abstract']);
  const other = rng.pick<ExplainKind>(['best', 'test', 'revise']);
  return [one(() => newClueItem(rng, { skin: skin(), avoid: used })), one(() => MAKERS[other](rng, { skin: skin(), avoid: used }))];
}

/** One Arcade item: any kind, any skin. */
export function arcadeItem(rng: Rng): Made {
  const kind = rng.pick<ExplainKind>(['best', 'test', 'new-clue', 'revise']);
  return MAKERS[kind](rng, { skin: rng.pick<ExplainSkin>(['everyday', 'fantasy', 'abstract']) });
}

const KIND_OF: Record<string, ExplainKind> = {
  's7.explain-best': 'best',
  's7.explain-test': 'test',
  's7.explain-new-clue': 'new-clue',
  's7.explain-revise': 'revise',
};

/**
 * A new example after a miss: one item of the same kind about a different story, so it never repeats the missed
 * question with its choices reshuffled. A missed grid (abstract) item gets a story instead.
 */
export function freshItems(missed: Item, rng: Rng): Made[] {
  const kind = KIND_OF[missed.skill];
  if (!kind) return [];
  const story = STORIES.find((s) => missed.prompt.startsWith(s.setting));
  const skin: ExplainSkin = story ? story.skin : rng.pick<ExplainSkin>(['everyday', 'fantasy']);
  return [MAKERS[kind](rng, { skin, avoid: new Set(story ? [story.id] : []) })];
}
