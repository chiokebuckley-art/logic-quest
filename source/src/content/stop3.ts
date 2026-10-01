/**
 * Stop 3 · Line Up.
 *
 * Five lessons: chains ("taller than" carries along), "before" vs "right before", spot clues (not
 * first, not last, next to, between), building a whole line, and spotting a clue that is not
 * needed. Every item comes from ../engine/puzzles/lineup.ts, which finds each answer by listing
 * every order that fits the clues. Skins: everyday (race, heights, lunch line), fantasy (dragons,
 * robot parade, broom race) and abstract (letters in a row).
 */
import {
  CANT,
  ORDERLY,
  SKIN_IDS,
  buildPuzzle,
  chainPuzzle,
  extraCluePuzzle,
  spotPuzzle,
  statusPuzzle,
  type SkinId,
  type Status,
} from '../engine/puzzles/lineup';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';

const EVERYDAY: readonly SkinId[] = ['race', 'height', 'line'];
const FANTASY: readonly SkinId[] = ['dragons', 'robots', 'brooms'];
const ORDERLY_EVERYDAY: readonly SkinId[] = ['race', 'line'];
const ORDERLY_FANTASY: readonly SkinId[] = ['robots', 'brooms'];

/** Skins for a practice set: everyday, fantasy, abstract, then any, in a shuffled order. */
function practiceSkins(rng: Rng, count: number, orderly: boolean): SkinId[] {
  const every = orderly ? ORDERLY_EVERYDAY : EVERYDAY;
  const fant = orderly ? ORDERLY_FANTASY : FANTASY;
  const any = orderly ? ORDERLY : SKIN_IDS;
  const base: SkinId[] = [rng.pick(every), rng.pick(fant), 'letters'];
  while (base.length < count) base.push(rng.pick(any));
  return rng.shuffle(base.slice(0, count));
}

/**
 * Make items in order, drawing again whenever one has the same prompt and scene as an earlier one,
 * so no set shows the same puzzle twice. Sets with no repeat come out exactly as before.
 */
function distinct(makers: readonly (() => Item)[]): Item[] {
  const seen = new Set<string>();
  return makers.map((make) => {
    let item = make();
    // A repeat is rare and a redraw almost never repeats again; the cap only guards against a loop.
    for (let tries = 0; tries < 100 && seen.has(JSON.stringify([item.prompt, item.scene])); tries++) item = make();
    seen.add(JSON.stringify([item.prompt, item.scene]));
    return item;
  });
}

const L1 = 's3.l1';
const L2 = 's3.l2';
const L3 = 's3.l3';
const L4 = 's3.l4';
const L5 = 's3.l5';

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'Chains',
    ideas: [
      {
        title: 'Clues about order',
        body: [
          'Some puzzles ask you to put people in order.',
          'Each clue compares two people. For example: “Ava is taller than Ben.”',
          'Your job is to find what the clues prove. You also need to see what they do not prove.',
        ],
      },
      {
        title: 'Follow the chain',
        scene: { kind: 'clues', clues: ['Ava is taller than Ben.', 'Ben is taller than Cal.'] },
        body: [
          'Ava is taller than Ben. Ben is taller than Cal.',
          'So Ava must be taller than Cal too. No clue says it, but the two clues prove it.',
          'Clues that link up like this make a chain. You can follow a chain from one end to the other.',
        ],
      },
      {
        title: 'Who is first?',
        body: [
          'To find the tallest, cross out anyone who is shorter than someone.',
          'If just one person is left, that person is the tallest.',
          'In a race, cross out anyone who finished after someone. The one left finished first.',
        ],
      },
      {
        title: 'When you can’t tell',
        scene: { kind: 'clues', clues: ['Ava is taller than Ben.', 'Cal is taller than Ben.'] },
        body: [
          'Ava is taller than Ben. Cal is taller than Ben. Who is the tallest?',
          'Ava might be. Cal might be. No clue compares Ava and Cal.',
          'So the right answer is “Can’t tell.” That is a real answer. It is not giving up.',
        ],
      },
      {
        title: 'Trust only the clues',
        body: [
          'The name you read first is not always first in line.',
          'Before you answer, ask: do the clues prove it?',
          'If a different order also fits the clues, you can’t tell.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, false);
      const cant = rng.shuffle([false, true, false, true]);
      return distinct(skins.map((skin, i) => () => chainPuzzle(rng, { id: `l1-${i + 1}`, skin, cantTell: cant[i] }).item));
    },
  },
  {
    id: L2,
    title: 'Before vs right before',
    ideas: [
      {
        title: 'Before',
        body: [
          '“Ava finished before Ben” means Ava crossed the line sooner.',
          'Other runners may have finished between them. “Before” means anywhere earlier.',
        ],
      },
      {
        title: 'Right before',
        body: [
          '“Ava finished right before Ben” means no one finished between them.',
          'Ava is just one place ahead of Ben. “Right before” means directly before.',
        ],
      },
      {
        title: 'One clue, three orders',
        scene: { kind: 'clues', clues: ['Ava finished before Ben.'] },
        body: [
          'Ava, Ben and Cal ran a race. The clue says Ava finished before Ben.',
          'The order Ava, Ben, Cal fits. So do Ava, Cal, Ben and Cal, Ava, Ben.',
          'In the second one, Cal is between them. So Ava may not be right before Ben.',
        ],
      },
      {
        title: 'Must, might, can’t',
        body: [
          'A sentence must be true if it is true in every order that fits the clues.',
          'It might be true if it is true in some of those orders, but not all.',
          'It can’t be true if it is true in none of them.',
        ],
      },
      {
        title: 'Other words, same idea',
        body: [
          'Lines and rows use other words for the same idea.',
          '“Somewhere in front of” and “somewhere to the left of” work like “before.”',
          '“Right in front of” and “directly to the left of” work like “right before.”',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, true);
      const plan: { conflict?: boolean; target?: Status }[] = rng.shuffle([
        { conflict: true },
        { target: 'must' },
        { target: 'cant' },
        { target: rng.pick(['must', 'might', 'cant'] as const) },
      ]);
      return distinct(skins.map((skin, i) => () => statusPuzzle(rng, { id: `l2-${i + 1}`, skin, ...plan[i] }).item));
    },
  },
  {
    id: L3,
    title: 'Not first, not last, next to, between',
    ideas: [
      {
        title: 'Not first, not last',
        body: [
          '“Eli is not first” rules out just one spot. Eli could be in any other spot.',
          'With three people, “not first” and “not last” leave only the middle.',
          'With four people, they leave two spots. Then you can’t tell which one.',
        ],
      },
      {
        title: 'Next to',
        body: [
          '“Ava and Ben are next to each other” means no one stands between them.',
          'It does not say who is in front. Ava could be first, or Ben could.',
          'In a race, the clue might say: “No one finished between Ava and Ben.”',
        ],
      },
      {
        title: 'Between',
        body: [
          '“Cal is somewhere between Ava and Ben” means one of them is ahead of Cal. The other one is behind Cal.',
          'It does not say which one is ahead. It does tell you that Cal is not at either end.',
        ],
      },
      {
        title: 'Try each spot',
        scene: { kind: 'clues', clues: ['Eli did not finish first.', 'Eli did not finish last.'] },
        body: [
          'Eli, Fay and Gus ran a race. Where did Eli finish?',
          'Try Eli first. That makes the first clue false. We say it breaks the clue. Try Eli last. That breaks the second clue.',
          'Only the middle spot is left. If more than one spot were left, you could not tell.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, true);
      const plan: { conflict?: 'ends' | 'between'; cantTell?: boolean; q?: 'where' | 'who'; n?: number }[] = rng.shuffle([
        { q: 'where', cantTell: false, n: 3 },
        { conflict: rng.pick(['ends', 'between'] as const) },
        { q: 'who', cantTell: false },
        { cantTell: rng.chance(0.5) },
      ]);
      return distinct(skins.map((skin, i) => () => spotPuzzle(rng, { id: `l3-${i + 1}`, skin, ...plan[i] }).item));
    },
  },
  {
    id: L4,
    title: 'Build the whole line',
    ideas: [
      {
        title: 'The whole line',
        body: [
          'Now you will put everyone in order. Place each person in a spot.',
          'When you are done, every clue must be true.',
        ],
      },
      {
        title: 'Start with sure things',
        body: [
          'Look for a clue that names a spot, like first or last. Start by putting that person in that spot.',
          'Then use the other clues to fill in the gaps.',
        ],
      },
      {
        title: 'A worked example',
        scene: { kind: 'clues', clues: ['Cal finished last.', 'Ava finished before Ben.'] },
        body: [
          'Ava, Ben and Cal ran a race.',
          'Cal finished last, so Cal goes in the last spot.',
          'Ava finished before Ben, so Ava is first and Ben is second.',
        ],
      },
      {
        title: 'Test and fix',
        body: [
          'Check your line against each clue, one at a time.',
          'A clue breaks when it is false for your line. Then move someone and check again.',
          'Good clues leave just one order that works.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 3, false);
      return distinct(skins.map((skin, i) => () => buildPuzzle(rng, { id: `l4-${i + 1}`, skin, n: i + 3 }).item));
    },
  },
  {
    id: L5,
    title: 'Which clue wasn’t needed?',
    ideas: [
      {
        title: 'Extra clues',
        body: [
          'Sometimes a clue tells you nothing new. The other clues already prove it.',
          'We say that clue is not needed.',
        ],
      },
      {
        title: 'An example',
        scene: { kind: 'clues', clues: ['Ava is taller than Ben.', 'Ben is taller than Cal.', 'Ava is taller than Cal.'] },
        body: [
          'The first two clues make a chain: Ava, then Ben, then Cal.',
          'That chain already proves Ava is taller than Cal. So the third clue is not needed.',
        ],
      },
      {
        title: 'How to test a clue',
        body: [
          'Cover up one clue. Do the other clues still give just one order?',
          'If they do, the clue you covered was not needed.',
          'If more than one order fits now, that clue was needed.',
        ],
      },
      {
        title: 'Why it matters',
        body: [
          'Good thinkers ask what each fact adds.',
          'A fact that repeats the others does not help you. Spotting it shows you how the clues fit together.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 3, false);
      return distinct(skins.map((skin, i) => () => extraCluePuzzle(rng, { id: `l5-${i + 1}`, skin }).item));
    },
  },
];

/**
 * Nine items: two per lesson for lessons 1-4 and one for lesson 5. The first two are conflict items.
 * The "which clue wasn't needed?" item uses three people so it fits the check's timer.
 */
function check(rng: Rng): Item[] {
  const any = () => rng.pick(SKIN_IDS);
  const orderly = () => rng.pick(ORDERLY);
  return distinct([
    () => chainPuzzle(rng, { id: 'c1', skin: any(), cantTell: true }).item,
    () => chainPuzzle(rng, { id: 'c2', skin: any(), cantTell: false }).item,
    // Bare "before" (race skins) is where the misreading bites hardest.
    () => statusPuzzle(rng, { id: 'c3', skin: rng.pick(['race', 'brooms'] as const), conflict: true }).item,
    () => statusPuzzle(rng, { id: 'c4', skin: orderly(), target: rng.pick(['must', 'cant'] as const) }).item,
    () => spotPuzzle(rng, { id: 'c5', skin: orderly(), ...(rng.chance(0.5) ? { conflict: rng.pick(['ends', 'between'] as const) } : { cantTell: false }) }).item,
    () => spotPuzzle(rng, { id: 'c6', skin: orderly(), cantTell: rng.chance(0.4) }).item,
    () => buildPuzzle(rng, { id: 'c7', skin: any(), n: 4 }).item,
    () => buildPuzzle(rng, { id: 'c8', skin: any(), n: 4 }).item,
    () => extraCluePuzzle(rng, { id: 'c9', skin: any(), n: 3 }).item,
  ]);
}

/** One Arcade item from anywhere in the stop. */
function arcade(rng: Rng): Item {
  const id = 'a1';
  switch (rng.int(1, 5)) {
    case 1: return chainPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), cantTell: rng.chance(0.4) }).item;
    case 2: return statusPuzzle(rng, { id, skin: rng.pick(ORDERLY), ...(rng.chance(0.3) ? { conflict: true } : {}) }).item;
    case 3: return spotPuzzle(rng, { id, skin: rng.pick(ORDERLY) }).item;
    case 4: return buildPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), n: rng.pick([3, 4, 5]) }).item;
    default: return extraCluePuzzle(rng, { id, skin: rng.pick(SKIN_IDS) }).item;
  }
}

/**
 * New examples after a miss (engine/fresh.ts). Lessons 1 to 3 give a pair, in random order: one built the same
 * way as the missed item (same skill, same kind of answer), and its partner with the other kind of answer. A
 * missed “Can’t tell” is paired with a chain or spot that does decide, and a missed “must” or “can’t” with a
 * “might”, so repeating one answer never passes. Lessons 4 and 5 give one item of the same shape.
 * Returns [] when no match turns up, and the default (same skill from the lesson's practice) takes over.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const id = 'new';
  /** Draw until the skill matches the missed item's skill. */
  const same = (make: () => Item): Item | null => {
    for (let i = 0; i < 30; i++) {
      const item = make();
      if (item.skill === missed.skill) return item;
    }
    return null;
  };
  const pair = (a: Item | null, b: Item): Item[] => (a ? rng.shuffle([a, b]) : []);
  switch (missed.lesson) {
    case L1: {
      if (missed.kind !== 'choose') return [];
      const cant = missed.answer === CANT;
      return pair(
        same(() => chainPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), cantTell: cant }).item),
        chainPuzzle(rng, { id: `${id}b`, skin: rng.pick(SKIN_IDS), cantTell: !cant }).item,
      );
    }
    case L2: {
      if (missed.kind !== 'choose') return [];
      const was = missed.answer as Status;
      const opts: { conflict?: boolean; target?: Status } = missed.conflict ? { conflict: true } : { target: was };
      // The partner: a “might” for a missed “must” or “can’t”, and a “must” or “can’t” for a missed “might”.
      const other: Status = was === 'might' ? rng.pick(['must', 'cant'] as const) : 'might';
      return pair(
        same(() => statusPuzzle(rng, { id, skin: rng.pick(ORDERLY), ...opts }).item),
        statusPuzzle(rng, { id: `${id}b`, skin: rng.pick(ORDERLY), target: other }).item,
      );
    }
    case L3: {
      if (missed.kind !== 'choose') return [];
      const q: 'where' | 'who' = missed.choices.some((c) => c.id === 'p1') ? 'where' : 'who';
      const cant = missed.answer === CANT;
      const opts: { conflict?: 'ends' | 'between'; cantTell?: boolean; q?: 'where' | 'who' } = missed.conflict
        ? { conflict: missed.skill === 's3.between' ? 'between' : 'ends' }
        : { cantTell: cant, q };
      return pair(
        same(() => spotPuzzle(rng, { id, skin: rng.pick(ORDERLY), ...opts }).item),
        spotPuzzle(rng, { id: `${id}b`, skin: rng.pick(ORDERLY), cantTell: !cant, q }).item,
      );
    }
    case L4:
      return missed.kind === 'order' ? [buildPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), n: missed.names.length }).item] : [];
    case L5:
      return [extraCluePuzzle(rng, { id, skin: rng.pick(SKIN_IDS) }).item];
    default:
      return [];
  }
}

export const stop3: StopDef = {
  n: 3,
  id: 's3',
  title: 'Line Up',
  idea: 'If Ava is taller than Ben, and Ben is taller than Cal, then Ava is taller than Cal.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
};
