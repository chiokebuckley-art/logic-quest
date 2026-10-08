/**
 * Stop 7, Lesson 3 · Cause or just together? (causation).
 * A cause makes something happen. In these puzzles one thing makes the effect, so a cause passes two checks: it works
 * every time, and nothing else makes the effect. Two things that happen together are not enough to show that one
 * causes the other: a fair test changes one thing at a time, records can’t show a cause, and a third thing can cause
 * both.
 *
 * Two distinctions are taught apart, each with a contrast card and its board right after it: works every time vs
 * nothing else makes the effect (the two kinds of break), and tests vs records (the same marks, two answers).
 *
 * See: what a cause does (two checks), two kinds of break (contrast), change one thing at a time, a worked lamp table
 * (the switch is the cause), tests or records (contrast), together is not enough (ice cream and sunburns), and a third
 * thing (a hot day with the shop closed). Do: name the break in two tests; the lamp table with the two checks lit, the
 * switch shown checked and the clock to check; Kai’s cap as tests and as records; then the three sunburn days, which
 * are records (can’t tell yet, even with the heat column covered). Quiz: which thing is the cause (cause-which), two
 * things that always change together (cause-cant-tell), records that go together (cause-together, a conflict item,
 * tag records), and the can-fail question: one day breaks a pair that goes together, and a third thing may cause both
 * (cause-third, tag can-fail).
 *
 * Every answer comes from ../../engine/puzzles/causes.ts.
 */
import {
  FRAMES,
  TESTS_VS_RECORDS,
  WORKS_VS_ONLY_CAUSE,
  causeIdeas,
  causeItem,
  lampBoard,
  recordsBoard,
  sunBoard,
  testItem,
  worksBoard,
  type CauseKind,
} from '../../engine/puzzles/causes';
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

/** The pass rule’s second group: a records question right on the first try (tests vs records). */
export const RECORDS_GROUP = { tag: 'records', label: 'a question about records someone wrote down' } as const;

export const lesson: LessonModule['lesson'] = {
  id: ID,
  title: 'Cause or just together?',
  ideas: causeIdeas(),
  // Each distinction’s board sits right after its contrast card; the lamp and sunburn boards after their tables.
  drill: [worksBoard(), lampBoard(), recordsBoard(), sunBoard()],
  distinctions: [WORKS_VS_ONLY_CAUSE, TESTS_VS_RECORDS],
  practice: practiceOf(ID, pack),
  pass: { firstTry: 3, include: [CAN_FAIL, RECORDS_GROUP] },
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
