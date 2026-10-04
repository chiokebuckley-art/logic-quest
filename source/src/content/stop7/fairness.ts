/**
 * Stop 7, Lesson 4 · Fair choices.
 * In a story, the fair choice is honest, fair to the owner (or keeps the promise), and hurts no one, and you can say
 * why from the story's facts. A wish (a friend wants it, everyone says so) does not change the facts.
 *
 * See: fair choices in a story, the three checks, a worked example (Leo finds Mia's teddy bear: three choices on a
 * grid of checks), wanting it does not change the facts, and a reason from the story. Do: Leo's story again with two
 * new choices (say it is yours, say Sam took it) and the fair one, every box to mark. Quiz: which choice is fair (fair-choice), which reason should
 * decide it (fair-reason), and the can-fail question: a wish pushes for the unfair choice (fair-pressure, a conflict
 * item, tag can-fail). A temptation line in the story (“Nobody saw it happen.”) makes a choice or reason item a
 * conflict item too.
 *
 * Every answer comes from ../../engine/puzzles/fairness.ts.
 */
import {
  FAIR_KINDS,
  FAIR_SKINS,
  choiceItem,
  fairBoard,
  fairIdeas,
  pressureItem,
  reasonItem,
  type FairItemOptions,
  type FairKind,
  type FairMade,
  type FairSkin,
} from '../../engine/puzzles/fairness';
import type { Item, Rng } from '../../engine/types';
import { CAN_FAIL, distinctItems, practiceOf, type LessonModule, type Made } from './common';

const ID = 's7.l4';

type Maker = (rng: Rng, o: FairItemOptions) => FairMade;
const MAKERS: Record<'choice' | 'reason' | 'pressure', Maker> = { choice: choiceItem, reason: reasonItem, pressure: pressureItem };

/**
 * The quiz: 4 items, each a different kind of story. First a gentle “which choice is fair?” in an everyday story;
 * then, in any order, a reason item, a choice or reason item with a temptation line (a conflict item), and the
 * can-fail question (a wish). At least one of the last three is a fantasy story.
 */
function pack(rng: Rng): Made[] {
  const one = distinctItems();
  const kinds = rng.shuffle(FAIR_KINDS).slice(0, 4) as FairKind[];
  const skins: FairSkin[] = ['everyday', ...rng.shuffle(['fantasy', rng.pick(FAIR_SKINS), rng.pick(FAIR_SKINS)] as FairSkin[])];
  const plan: [Maker, boolean][] = [
    [MAKERS.choice, false],
    ...rng.shuffle<[Maker, boolean]>([
      [MAKERS.reason, false],
      [rng.chance(0.5) ? MAKERS.choice : MAKERS.reason, true],
      [MAKERS.pressure, false],
    ]),
  ];
  return plan.map(([make, side], i) => one(() => make(rng, { kind: kinds[i], skin: skins[i], side })));
}

export const lesson: LessonModule['lesson'] = {
  id: ID,
  title: 'Fair choices',
  ideas: fairIdeas(),
  drill: [fairBoard()],
  practice: practiceOf(ID, pack),
  pass: { firstTry: 3, include: [CAN_FAIL] },
};

/**
 * Two items for the stop check, in two different stories: a choice or reason item, then the wish question or the
 * other kind with a temptation line. The second one is always a conflict item.
 */
export function checkItems(rng: Rng): Made[] {
  const [k1, k2] = rng.shuffle(FAIR_KINDS);
  const first = rng.chance(0.5) ? MAKERS.choice : MAKERS.reason;
  const other = first === MAKERS.choice ? MAKERS.reason : MAKERS.choice;
  const second = rng.chance(0.5) ? MAKERS.pressure : other;
  return [
    first(rng, { kind: k1, skin: rng.pick(FAIR_SKINS), side: rng.chance(0.3) }),
    second(rng, { kind: k2, skin: rng.pick(FAIR_SKINS), side: second !== MAKERS.pressure }),
  ];
}

/** One item of any kind, story and skin. */
export function arcadeItem(rng: Rng): Made {
  const make = rng.pick([MAKERS.choice, MAKERS.reason, MAKERS.pressure]);
  return make(rng, { kind: rng.pick(FAIR_KINDS), skin: rng.pick(FAIR_SKINS), side: rng.chance(0.3) });
}

/** The kind of story an item tells, read from its story lines. */
const KIND_CUES: readonly [FairKind, RegExp][] = [
  ['found', /name tag|crest|belongs to/],
  ['promise', /promised/],
  ['truth', /breaks/],
  ['change', /too much|too many/],
  ['turn', /waiting for a turn/],
];
const kindOf = (it: Item): FairKind | undefined => {
  const text = it.scene?.kind === 'text' ? it.scene.lines.join(' ') : '';
  return KIND_CUES.find(([, cue]) => cue.test(text))?.[0];
};

/**
 * A new example after a miss on a conflict choice or reason item: the same question with a temptation line again, in a
 * different kind of story, so the temptation is tested again. Anything else gets the default (another item with the
 * same skill).
 */
export function freshItems(missed: Item, rng: Rng): Made[] {
  const make = missed.skill === 's7.fair-choice' ? MAKERS.choice : missed.skill === 's7.fair-reason' ? MAKERS.reason : undefined;
  if (!missed.conflict || !make) return [];
  const was = kindOf(missed);
  const kind = rng.pick(FAIR_KINDS.filter((k) => k !== was));
  return [make(rng, { kind, skin: rng.pick(FAIR_SKINS), side: true })];
}
