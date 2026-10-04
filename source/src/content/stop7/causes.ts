/**
 * Stop 7, Lesson 3 · Cause or just together? (causation).
 * A cause helps make something happen. Two things that happen together are not enough to show that one causes the
 * other: a fair test changes one thing at a time, and a third thing can cause both.
 *
 * See: what a cause does, change one thing at a time, a worked lamp table (the switch is the cause), together is not
 * enough (ice cream and sunburns), and a third thing (a hot day with the shop closed). Do: the lamp table, the switch
 * shown checked and the clock to check; then the three sunburn days, where the heat and the ice cream always change
 * together (can’t tell yet). Quiz: which thing is the cause (cause-which), two things that always change together
 * (cause-cant-tell), records that go together (cause-together, a conflict item), and the can-fail question: one day
 * breaks a pair that goes together, and a third thing may cause both (cause-third, tag can-fail).
 *
 * Every answer comes from ../../engine/puzzles/causes.ts.
 */
import { FRAMES, causeIdeas, causeItem, lampBoard, sunBoard, testItem, type CauseKind } from '../../engine/puzzles/causes';
import type { Item, Rng } from '../../engine/types';
import { CAN_FAIL, distinctItems, practiceOf, type LessonModule, type Made } from './common';

const ID = 's7.l3';

/**
 * A quiz pack: a gentle “which is the cause?” first, then (in any order) two things that always change together,
 * records that go together (a conflict item), and the can-fail question. Frames vary across the four.
 */
function pack(rng: Rng): Made[] {
  const one = distinctItems();
  const frames = [...rng.shuffle(FRAMES), rng.pick(FRAMES)];
  const first = one(() => testItem(rng, { kind: 'which', form: 'which', frame: frames[0] }));
  const kinds: CauseKind[] = ['cant', 'together', 'third'];
  const rest = kinds.map((k, i) => one(() => causeItem(rng, k, frames[i + 1])));
  return [first, ...rng.shuffle(rest)];
}

export const lesson: LessonModule['lesson'] = {
  id: ID,
  title: 'Cause or just together?',
  ideas: causeIdeas(),
  drill: [lampBoard(), sunBoard()],
  practice: practiceOf(ID, pack),
  pass: { firstTry: 3, include: [CAN_FAIL] },
};

/** Two items for the stop check: a test table (which, or can’t tell) and a conflict item (together, or a third thing). */
export const checkItems = (rng: Rng): Made[] => {
  const a = causeItem(rng, rng.pick<CauseKind>(['which', 'cant']), rng.pick(FRAMES));
  const b = causeItem(rng, rng.pick<CauseKind>(['together', 'third']), rng.pick(FRAMES));
  return [a, b];
};

/** One Arcade item of any kind. */
export const arcadeItem = (rng: Rng): Made => causeItem(rng, rng.pick<CauseKind>(['which', 'cant', 'together', 'third']), rng.pick(FRAMES));

/** The default new example (another item with the same skill) is enough for this lesson. */
export const freshItems = (_missed: Item, _rng: Rng): Made[] => [];
