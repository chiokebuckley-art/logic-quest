/**
 * Stop 7, Lesson 5 · Gut feelings (intuition).
 * A gut feeling is a fast guess. It can help you start, but it is not a proof until you check.
 *
 * See: a fast guess, check it, a worked jar (Eli’s gut says red; the count says blue), a jar where the gut is right
 * (Hana’s fish), and “strong is not sure”. Do: Eli’s jar with Eli’s case shown marked and Gus’s new case to mark; then
 * a twin jar (two small blue sweets gone, the gut still wrong) to mark from the count up, so the learner taps both a
 * “Yes” (Gus) and a “No” (Eli’s twin). Quiz: what to do with a gut feeling (gut-check),
 * which is more likely after counting (gut-count, a conflict item in the pack), the count agrees: was the feeling a
 * proof before it? (gut-agree), and the can-fail question: does a strong feeling prove it? (gut-proof, tag can-fail,
 * a conflict item).
 *
 * Every answer comes from ../../engine/puzzles/gutfeel.ts.
 */
import {
  FRAMES,
  MAKERS,
  NAMES,
  eliBoard,
  gutIdeas,
  skinsOf,
  twinBoard,
  type Frame,
  type GutKind,
  type SkinId,
} from '../../engine/puzzles/gutfeel';
import type { Item, Rng } from '../../engine/types';
import { CAN_FAIL, distinctItems, practiceOf, type LessonModule, type Made } from './common';

const ID = 's7.l5';

const skinIn = (rng: Rng, f: Frame): SkinId => rng.pick(skinsOf(f));
const anySkin = (rng: Rng): SkinId => skinIn(rng, rng.pick(FRAMES));

/**
 * The quiz: 4 items. First a gentle one (gut-check: what to do with a gut feeling); then, in any order, the count on a
 * trick jar (gut-count, a conflict item), a gut feeling the count agrees with (gut-agree) and the can-fail question
 * (gut-proof). Every frame once, then one more, so the pack is never all sweets or all shapes.
 */
function pack(rng: Rng): Made[] {
  const one = distinctItems();
  const frames = [...rng.shuffle(FRAMES), rng.pick(FRAMES)];
  const kinds: GutKind[] = ['check', ...rng.shuffle<GutKind>(['count', 'agree', 'proof'])];
  const names = rng.shuffle(NAMES);
  return kinds.map((k, i) => one(() => MAKERS[k](rng, skinIn(rng, frames[i]), { name: names[i], ...(k === 'count' ? { trick: true } : {}) })));
}

const ideas = gutIdeas();

export const lesson: LessonModule['lesson'] = {
  id: ID,
  title: 'Gut feelings',
  ideas,
  // Board 1 opens right after the worked example (card 3); board 2, the twin, after the last card.
  drill: [eliBoard(`${ID}-do`, 2), twinBoard(`${ID}-do2`)],
  practice: practiceOf(ID, pack),
  pass: { firstTry: 3, include: [CAN_FAIL] },
};

/**
 * Two items for the stop check, in different frames: a conflict item (the count on a trick jar, or the strong-feeling
 * question) and one other kind (what to do with a gut feeling, a gut feeling the count agrees with, or a count where the
 * gut is right).
 */
export function checkItems(rng: Rng): Made[] {
  const one = distinctItems();
  const [f1, f2] = rng.shuffle(FRAMES);
  const [n1, n2] = rng.shuffle(NAMES);
  const first = rng.pick(['count', 'proof'] as const);
  const conflict = one(() => MAKERS[first](rng, skinIn(rng, f1), { name: n1, trick: true }));
  const second = rng.pick(['check', 'agree', 'count'] as const);
  const rest = one(() => MAKERS[second](rng, skinIn(rng, f2), { name: n2, trick: second === 'count' ? false : undefined }));
  return [conflict, rest];
}

/** One Arcade item of any kind (a count on either kind of jar). */
export function arcadeItem(rng: Rng): Made {
  const k = rng.pick(['check', 'count', 'agree', 'proof'] as const);
  return MAKERS[k](rng, anySkin(rng), k === 'count' ? { trick: rng.chance(0.6) } : {});
}

/**
 * New examples after a miss. A missed count gets two: a jar where the big ones are fewer and a jar where they are
 * more, in either order, so “always the small ones” never passes the set. Other kinds use the default (another item
 * with the same skill from the practice).
 */
export function freshItems(missed: Item, rng: Rng): Made[] {
  if (missed.skill !== 's7.gut-count') return [];
  const one = distinctItems();
  const [f1, f2] = rng.shuffle(FRAMES);
  const [n1, n2] = rng.shuffle(NAMES);
  const pair = [
    one(() => MAKERS.count(rng, skinIn(rng, f1), { name: n1, trick: true })),
    one(() => MAKERS.count(rng, skinIn(rng, f2), { name: n2, trick: false })),
  ];
  return rng.shuffle(pair);
}
