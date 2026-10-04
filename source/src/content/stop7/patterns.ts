/**
 * Stop 7, Lesson 1 · Pattern guesses (induction).
 * Several same examples suggest a pattern: a good guess. A new case can still break it, so a pattern is not a proof.
 *
 * See: a pattern guess, likely is not must, a new case can break it, nothing is ever due, and a worked bag with four
 * shape sentences marked Must / Likely / Unlikely / Can’t. Do: the same bag, the color sentences and a streak to mark;
 * then a twin bag (the squares are gone) to mark again. Quiz: which word fits a bag you can count (pattern-chance),
 * what you know for sure after a streak (pattern-sure), the “due” trap (pattern-due, a conflict item), and the
 * can-fail question: a new case breaks a streak (pattern-break, tag can-fail).
 *
 * Every answer comes from ../../engine/puzzles/patterns.ts.
 */
import {
  FRAMES,
  NAMES,
  breakItem,
  chanceItem,
  colorBoard,
  dueItem,
  patternIdeas,
  skinsOf,
  sureItem,
  twinBoard,
  type Frame,
  type PatternMade,
  type SkinId,
} from '../../engine/puzzles/patterns';
import type { Item, Rng } from '../../engine/types';
import { CAN_FAIL, distinctItems, practiceOf, type LessonModule, type Made } from './common';

const ID = 's7.l1';

const skinIn = (rng: Rng, f: Frame): SkinId => rng.pick(skinsOf(f));
const anySkin = (rng: Rng): SkinId => skinIn(rng, rng.pick(FRAMES));

type Maker = (rng: Rng, skin: SkinId, name?: string) => PatternMade;
const MAKERS: Record<'chance' | 'sure' | 'due' | 'break', Maker> = {
  chance: (rng, skin, name) => chanceItem(rng, skin, { name }),
  sure: (rng, skin, name) => sureItem(rng, skin, { name }),
  due: (rng, skin, name) => dueItem(rng, skin, { name }),
  break: (rng, skin, name) => breakItem(rng, skin, { name }),
};

/**
 * The quiz: 4 items. First a gentle bag you can count (pattern-chance); then, in any order, what you know for sure
 * after a streak, the “due” trap and the can-fail question. The four use at least two skins (every frame once, then
 * one more), so no pack is all marbles or all shapes.
 */
function pack(rng: Rng): Made[] {
  const one = distinctItems();
  const frames = [...rng.shuffle(FRAMES), rng.pick(FRAMES)];
  const kinds = ['chance', ...rng.shuffle(['sure', 'due', 'break'] as const)] as const;
  // A different child in each story of the pack.
  const names = rng.shuffle(NAMES);
  return kinds.map((k, i) => one(() => MAKERS[k](rng, skinIn(rng, frames[i]), names[i])));
}

export const lesson: LessonModule['lesson'] = {
  id: ID,
  title: 'Pattern guesses',
  ideas: patternIdeas(),
  drill: [colorBoard(`${ID}-do`), twinBoard(`${ID}-do2`)],
  practice: practiceOf(ID, pack),
  pass: { firstTry: 3, include: [CAN_FAIL] },
};

/** Two items for the stop check: the “due” trap (a conflict item) and one other kind, in different skins. */
export function checkItems(rng: Rng): Made[] {
  const one = distinctItems();
  const [f1, f2] = rng.shuffle(FRAMES);
  const [n1, n2] = rng.shuffle(NAMES);
  const due = one(() => dueItem(rng, skinIn(rng, f1), { name: n1 }));
  const other = rng.pick(['chance', 'sure', 'break'] as const);
  return [due, one(() => MAKERS[other](rng, skinIn(rng, f2), n2))];
}

/** One Arcade item of any kind. */
export function arcadeItem(rng: Rng): Made {
  const k = rng.pick(['chance', 'sure', 'due', 'break'] as const);
  return MAKERS[k](rng, anySkin(rng));
}

/** The default new examples (another item with the same skill from the practice) fit every kind here. */
export function freshItems(_missed: Item, _rng: Rng): Made[] {
  return [];
}
