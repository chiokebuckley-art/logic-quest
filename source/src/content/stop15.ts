/**
 * Pattern Observatory, Ring 2: Rule Rise (Track 2, Change and functions; Clock Tower counts on Track 1).
 *
 *  l1 Growing Staircase (L1–L3)  a stated construction gives any far step; "it adds 2" only gives the next one
 *  l2 Rule Machine (L2–L3)       two rules can agree on one input: feed one where they differ; run a machine backwards
 *  l3 Clock Tower (L3, Track 1)  item positions start at 1, elapsed steps start at 0; whole blocks land differently
 *
 * Each place runs See → Explain → Do → Transfer → Review. Its practice pack is explain first, then a faded example
 * (one blank in a sentence frame), the same task with no frame, then a transfer item; the trap item is in every pack.
 * Every answer comes from ../engine/puzzles/observatory/{growth,machines,cycles}.ts and is checked a second way in
 * src/engine/__tests__/obs-ring2.test.ts.
 */
import {
  CONSTRUCTIONS, PAIRS, asReview, farItem, growTransferItem, growthIdeas, jumpBoard, jumpItem, nextTermItem, shrinkItem, stairBoard, stairWhyItem,
  type GrowContext,
} from '../engine/puzzles/observatory/growth';
import {
  ADD2_DOUBLE, SETTINGS, backBoard, backItem, buildBoard, fillItem, identifyItem, linearPairs, machineIdeas, machineWhyItem, ruleTestItem, separateItem,
  separatingInput, settingItem, squarePairs, testBoard, type CardRule, type Pair,
} from '../engine/puzzles/observatory/machines';
import {
  CHAINS, ROTAS, clockIdeas, countItem, cycleWhyItem, daysBoard, deskItem, digitsItem, elapsedItem, groupsItem, positionBoard, positionItem,
  type Chain, type ElapsedKind,
} from '../engine/puzzles/observatory/cycles';
import { looks } from '../engine/fresh';
import type { ChooseItem, Item, LessonDef, NumberItem, Rng, StopDef, Thing } from '../engine/types';

type Made = ChooseItem | NumberItem;
type Level = 1 | 2 | 3 | 4;

/** Makes items for one set with no two alike: a repeat is made again from the same rng (still deterministic). */
function distinct(): (make: () => Made) => Made {
  const seen = new Set<string>();
  return (make) => {
    let m = make();
    for (let i = 0; i < 60 && seen.has(looks(m)); i++) m = make();
    seen.add(looks(m));
    return m;
  };
}

const ids = (items: Made[], prefix: string): Item[] => items.map((it, i) => ({ ...it, id: `${prefix}${i + 1}` }));

// ======================================================================================================
// Makers (one fresh item each, from the rng)
// ======================================================================================================

const pickOther = <T,>(rng: Rng, xs: readonly T[], not: T): T => rng.pick(xs.filter((x) => x !== not));

/** l1 */
const farAt = (rng: Rng, lo: number, hi: number, c = PAIRS) => farItem(c, rng.int(lo, hi));
const anyConstruction = (rng: Rng) => rng.pick(Object.values(CONSTRUCTIONS));
function jumpAt(rng: Rng, phase?: 'do' | 'review') {
  const first = rng.int(2, 9);
  const jump = pickOther(rng, [2, 3, 4, 5, 6], first);
  return jumpItem(first, jump, rng.int(7, 15), { phase });
}
const shrinkAt = (rng: Rng) => {
  const s = rng.pick([25, 27, 29, 31, 33, 35, 37, 39, 41]);
  return shrinkItem(s, rng.int(6, (s - 1) / 2 - 1));
};
const growAt = (rng: Rng, ctx?: GrowContext) => growTransferItem(ctx ?? rng.pick(['necklace', 'chairs'] as const), rng.int(6, 25));
const stairWhyAt = (rng: Rng) => stairWhyItem(rng.int(6, 14), rng);

/** l2 */
const LINEAR = linearPairs();
const SQUARE = squarePairs();
const separateAt = (rng: Rng, square = false, framed = false) => separateItem(rng.pick(square ? SQUARE : LINEAR), rng, { framed });
function identifyAt(rng: Rng, decided = true) {
  const pair: Pair = rng.pick([...LINEAR, ...SQUARE]);
  return identifyItem(pair, rng.pick(['a', 'b'] as const), separatingInput(pair, rng, pair.agreeAt), { decided });
}
const timesAddAt = (rng: Rng) => ({ t: 'timesAdd' as const, a: rng.int(2, 5), b: rng.int(1, 6) });
const fillAt = (rng: Rng) => fillItem(timesAddAt(rng), rng.int(4, 12));
const backAt = (rng: Rng, framed = false) => backItem(timesAddAt(rng), rng.int(3, 12), { framed });
function settingAt(rng: Rng) {
  // Linear pairs "times m" and "add k" that agree at x0 of 2 or more, tested at a setting further on.
  const pair = rng.pick(LINEAR.filter((p) => p.agreeAt[0] >= 2));
  const m = pair.b.t === 'times' ? pair.b.k : 2;
  const k = pair.a.t === 'add' ? pair.a.k : 2;
  const x0 = pair.agreeAt[0];
  return settingItem(rng.pick(SETTINGS), m, k, x0, x0 + rng.int(2, 4), rng);
}
const machineWhyAt = (rng: Rng) => {
  const pair = rng.pick(LINEAR);
  return machineWhyItem(pair, separatingInput(pair, rng, pair.agreeAt), rng);
};

/** l3 */
const anyChain = (rng: Rng): Chain => rng.pick(CHAINS);
/** A position on an edge or a far exact multiple: n = k, k plus 1, 2k, 2k plus 1, a far multiple, or a far n. */
function edgeN(rng: Rng, k: number): number {
  const m = rng.int(5, 30);
  return rng.pick([k, k + 1, 2 * k, 2 * k + 1, m * k, m * k + rng.int(1, k - 1)]);
}
const positionAt = (rng: Rng, chain = anyChain(rng)) => positionItem(chain, edgeN(rng, chain.items.length), rng);
const zeroPositionAt = (rng: Rng, chain = anyChain(rng)) => positionItem(chain, chain.items.length * rng.int(5, 30), rng);
const fadedPositionAt = (rng: Rng, chain = anyChain(rng)) => positionItem(chain, chain.items.length * rng.int(10, 33) + 1, rng, { framed: true });
function elapsedAt(rng: Rng, kind?: ElapsedKind) {
  const kd = kind ?? rng.pick(['days', 'days', 'seasons'] as const);
  const k = kd === 'days' ? 7 : 4;
  const n = rng.pick([k, k + 1, 2 * k, 2 * k + 1, 3 * k, k * rng.int(3, 9) + rng.int(1, k - 1), k * rng.int(3, 9)]);
  return elapsedItem(kd, rng.int(0, k - 1), n, rng);
}
function countAt(rng: Rng) {
  const chain = anyChain(rng);
  const k = chain.items.length;
  return countItem(chain, rng.int(0, k - 1), rng.int(2 * k, 40));
}
const deskAt = (rng: Rng) => {
  const rota = rng.pick(ROTAS);
  return deskItem(rota, rng.pick([rota.length * rng.int(3, 8), rota.length * rng.int(3, 8) + rng.int(1, rota.length - 1)]), rng);
};
const digitsAt = (rng: Rng) => digitsItem(rng.pick([2, 3, 7] as const), rng.int(9, 40), rng);
const cycleTransferAt = (rng: Rng) => (rng.chance(0.5) ? deskAt(rng) : digitsAt(rng));
const cycleWhyAt = (rng: Rng) => cycleWhyItem(anyChain(rng), rng.int(5, 15), rng.int(0, 6), rng.int(2, 5), rng);

// ======================================================================================================
// The planned packs (See → Explain → Do → Transfer)
// ======================================================================================================

/** Growing Staircase. L1: explain, faded, unframed, transfer. L2 adds the constant-addition contrast; L3 a shrinking one. */
function stairPack(rng: Rng, level: Level): Made[] {
  const one = distinct();
  const lvl = Math.min(3, Math.max(1, level));
  const n1 = lvl === 1 ? rng.int(7, 9) : rng.int(11, 14);
  const n2 = lvl === 1 ? rng.int(10, 12) : lvl === 2 ? rng.int(15, 19) : rng.int(20, 30);
  const items: Made[] = [
    stairWhyItem(10, rng),
    one(() => farItem(PAIRS, n1, { framed: true })),
    one(() => farItem(PAIRS, n2)),
  ];
  if (lvl === 2) items.push(one(() => jumpAt(rng)));
  if (lvl === 3) items.push(one(() => shrinkAt(rng)));
  items.push(one(() => growAt(rng, lvl === 1 ? 'necklace' : undefined)));
  return items;
}

/** Rule Machine. L2: explain, faded separating input, unframed, identify or fill, transfer. L3: run it backwards too. */
function machinePack(rng: Rng, level: Level): Made[] {
  const one = distinct();
  if (level >= 3) {
    return [
      one(() => machineWhyAt(rng)),
      one(() => backAt(rng, true)),
      one(() => backAt(rng)),
      one(() => separateAt(rng, true)),
      one(() => settingAt(rng)),
    ];
  }
  return [
    machineWhyItem(ADD2_DOUBLE, 3, rng),
    one(() => separateAt(rng, false, true)),
    // The unframed one uses a pair that agrees on two inputs, so every offered input has to be tested.
    one(() => separateAt(rng, true)),
    one(() => (rng.chance(0.5) ? identifyAt(rng) : fillAt(rng))),
    one(() => settingAt(rng)),
  ];
}

/** Clock Tower (L3): explain, faded position, a zero-remainder position, elapsed days, transfer. */
function clockPack(rng: Rng): Made[] {
  const one = distinct();
  return [
    cycleWhyItem(CHAINS[1], 10, 3, 3, rng),
    one(() => fadedPositionAt(rng)),
    one(() => zeroPositionAt(rng)),
    one(() => elapsedAt(rng)),
    one(() => cycleTransferAt(rng)),
  ];
}

/** Four fresh items for a delayed review (later stages use bigger numbers), all phase 'review'. */
function review(make: (rng: Rng, stage: 1 | 2 | 3) => Made[], lesson: string) {
  return (rng: Rng, stage: 1 | 2 | 3): Item[] => ids(make(rng, stage).map(asReview), `${lesson}-r${stage}-`);
}

const stairReview = (rng: Rng, stage: 1 | 2 | 3): Made[] => {
  const one = distinct();
  return [one(() => stairWhyAt(rng)), one(() => farAt(rng, 10 + 5 * stage, 20 + 10 * stage, anyConstruction(rng))), one(() => jumpAt(rng)), one(() => growAt(rng))];
};
const machineReview = (rng: Rng, stage: 1 | 2 | 3): Made[] => {
  const one = distinct();
  return [one(() => machineWhyAt(rng)), one(() => separateAt(rng, stage > 1)), one(() => (stage > 1 ? backAt(rng) : identifyAt(rng))), one(() => settingAt(rng))];
};
const clockReview = (rng: Rng, stage: 1 | 2 | 3): Made[] => {
  const one = distinct();
  return [one(() => cycleWhyAt(rng)), one(() => zeroPositionAt(rng)), one(() => (stage > 1 ? elapsedAt(rng) : positionAt(rng))), one(() => cycleTransferAt(rng))];
};

/** Six fresh items for the independent check: an explain item, an error-tagged trap item, and a transfer item. */
const stairIndependent = (rng: Rng): Item[] => {
  const one = distinct();
  return ids([one(() => stairWhyAt(rng)), one(() => farAt(rng, 10, 20)), one(() => farAt(rng, 15, 40, anyConstruction(rng))), one(() => jumpAt(rng)), one(() => shrinkAt(rng)), one(() => growAt(rng))], 's15.l1-i');
};
const machineIndependent = (rng: Rng): Item[] => {
  const one = distinct();
  return ids([one(() => machineWhyAt(rng)), one(() => separateAt(rng)), one(() => identifyAt(rng)), one(() => fillAt(rng)), one(() => backAt(rng)), one(() => settingAt(rng))], 's15.l2-i');
};
const clockIndependent = (rng: Rng): Item[] => {
  const one = distinct();
  return ids([one(() => cycleWhyAt(rng)), one(() => zeroPositionAt(rng)), one(() => positionAt(rng)), one(() => elapsedAt(rng, 'days')), one(() => countAt(rng)), one(() => cycleTransferAt(rng))], 's15.l3-i');
};

// ---------- primers ----------

const CARD_RULES: CardRule[] = [
  { attr: 'color', value: 'red' }, { attr: 'color', value: 'blue' }, { attr: 'shape', value: 'circle' }, { attr: 'shape', value: 'square' }, { attr: 'size', value: 'big' },
];
const SHAPES = ['circle', 'square', 'triangle'] as const, COLORS = ['red', 'blue', 'yellow'] as const, SIZES = ['big', 'small'] as const;
function cardFor(rng: Rng, rule: CardRule, fits: boolean, id: string): Thing {
  for (;;) {
    const t: Thing = { id, shape: rng.pick(SHAPES), color: rng.pick(COLORS), size: rng.pick(SIZES) };
    if ((t[rule.attr] === rule.value) === fits) return t;
  }
}
/** Rule testing primer (Rule Machine): one card that fits, one that breaks, then one more of either kind. */
function rulePrimer(rng: Rng): Item[] {
  const rules = rng.shuffle(CARD_RULES);
  const make = (rule: CardRule, fits: boolean) => {
    const seen = [cardFor(rng, rule, true, 'k1'), cardFor(rng, rule, true, 'k2')];
    return ruleTestItem(rule, seen, cardFor(rng, rule, fits, 'k3'), rng);
  };
  return ids([make(rules[0], true), make(rules[1], false), make(rules[2], rng.chance(0.5))], 's15.l2-pr');
}
/** Grouping by k primer (Clock Tower): whole groups of k in N, the left-over, then one more left-over (new numbers each time). */
function groupPrimer(rng: Rng): Item[] {
  const N = rng.int(10, 20), k = rng.pick([3, 4, 5]);
  const k2 = rng.pick([3, 4, 5, 6]);
  const N2 = rng.chance(0.3) ? k2 * rng.int(2, 4) : rng.int(9, 20);
  return ids([groupsItem(N, k, 'groups'), groupsItem(N, k, 'left'), groupsItem(N2 === N ? N2 + 1 : N2, k2, 'left')], 's15.l3-pr');
}

// ======================================================================================================
// The places
// ======================================================================================================

const growing: LessonDef = {
  id: 's15.l1',
  title: 'Growing Staircase',
  plain: 'Growth rules',
  routine: true,
  track: 2,
  levels: [1, 3],
  requires: [],
  ideas: growthIdeas(),
  drill: [stairBoard('s15.l1-do'), { ...jumpBoard('s15.l1-do2'), afterCard: 3 }],
  practice: (rng) => ids(stairPack(rng, 2), 's15.l1-p'),
  practiceAt: (rng, level) => ids(stairPack(rng, level), 's15.l1-p'),
  pass: { firstTry: 3, include: [{ tag: 'far-step', label: 'a far step worked out from its position, not the next one' }] },
  review: review(stairReview, 's15.l1'),
  independent: stairIndependent,
};

const machine: LessonDef = {
  id: 's15.l2',
  title: 'Rule Machine',
  plain: 'Functions',
  routine: true,
  track: 2,
  levels: [2, 3],
  requires: ['s15.l1', 's2.l5'],
  primer: rulePrimer,
  ideas: machineIdeas(),
  drill: [testBoard('s15.l2-do'), buildBoard('s15.l2-do3'), { ...backBoard('s15.l2-do2'), afterCard: 4 }],
  practice: (rng) => ids(machinePack(rng, 2), 's15.l2-p'),
  practiceAt: (rng, level) => ids(machinePack(rng, level), 's15.l2-p'),
  pass: { firstTry: 3, include: [{ tag: 'first-fit', label: 'a test that splits two rules that both fit' }] },
  review: review(machineReview, 's15.l2'),
  independent: machineIndependent,
};

const clock: LessonDef = {
  id: 's15.l3',
  title: 'Clock Tower',
  plain: 'Cycles',
  routine: true,
  track: 1,
  levels: [3, 3],
  requires: ['s14.l1'],
  primer: groupPrimer,
  ideas: clockIdeas(),
  drill: [positionBoard('s15.l3-do'), daysBoard('s15.l3-do2')],
  practice: (rng) => ids(clockPack(rng), 's15.l3-p'),
  practiceAt: (rng) => ids(clockPack(rng), 's15.l3-p'),
  pass: { firstTry: 3, include: [{ tag: 'zero-remainder', label: 'a count that ends exactly on a whole block' }] },
  review: review(clockReview, 's15.l3'),
  independent: clockIndependent,
};

// ======================================================================================================
// The ring check, the Arcade, new examples, the diagnostic
// ======================================================================================================

/** The Ring Check: 9 fresh items, three per place; the identify item is always a conflict item. */
function check(rng: Rng): Item[] {
  const one = distinct();
  const items: Made[] = [
    one(() => farAt(rng, 8, 40, anyConstruction(rng))),
    one(() => jumpAt(rng)),
    one(() => (rng.chance(0.5) ? shrinkAt(rng) : growAt(rng))),
    one(() => separateAt(rng, rng.chance(0.4))),
    one(() => identifyAt(rng, rng.chance(0.75))),
    one(() => rng.pick([backAt, fillAt, settingAt])(rng)),
    one(() => positionAt(rng)),
    one(() => elapsedAt(rng)),
    one(() => (rng.chance(0.5) ? countAt(rng) : cycleTransferAt(rng))),
  ];
  return ids(items, 's15-c');
}

/** Every maker by skill, for the Arcade and for new examples after a miss. */
const BY_SKILL: Record<string, (rng: Rng) => Made> = {
  's15.stair-why': stairWhyAt,
  's15.stair-far': (rng) => farAt(rng, 8, 30, anyConstruction(rng)),
  's15.constant-jump': (rng) => jumpAt(rng),
  's15.stair-shrink': shrinkAt,
  's15.grow-transfer': (rng) => growAt(rng),
  's15.machine-why': machineWhyAt,
  's15.separate': (rng) => separateAt(rng, rng.chance(0.4)),
  's15.machine-which': (rng) => identifyAt(rng, rng.chance(0.8)),
  's15.machine-fill': fillAt,
  's15.machine-back': (rng) => backAt(rng),
  's15.test-setting': settingAt,
  's15.cycle-why': cycleWhyAt,
  's15.cycle-position': (rng) => positionAt(rng),
  's15.cycle-elapsed': (rng) => elapsedAt(rng),
  's15.cycle-count': countAt,
  's15.cycle-transfer': cycleTransferAt,
};

function arcade(rng: Rng): Item {
  const skill = rng.pick(Object.keys(BY_SKILL));
  return { ...BY_SKILL[skill](rng), id: 's15-arcade' };
}

/**
 * New examples after a miss: a matched twin with new numbers or materials. A missed zero-remainder position gets a
 * pair: another exact multiple, and the item right after a block ends (k plus 1), so one answer can't pass both.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  if (missed.skill === 's15.cycle-position' && missed.tags?.includes('zero-remainder')) {
    const chain = anyChain(rng);
    const k = chain.items.length;
    return [{ ...zeroPositionAt(rng, chain), id: 'new' }, { ...positionItem(chain, k * rng.int(4, 20) + 1, rng), id: 'new' }];
  }
  const make = BY_SKILL[missed.skill];
  return make ? [{ ...make(rng), id: 'new' }] : [];
}

/**
 * The diagnostic items this ring serves: Track 2 L1 the next term under a stated constant-addition rule, L2 step 5
 * from a stated construction, L3 a separating input; Track 1 L3 item 10 of a 3-cycle. Null otherwise.
 */
function diagnostic(rng: Rng, track: 1 | 2 | 3 | 4, level: 1 | 2 | 3 | 4): Item | null {
  let it: Made | null = null;
  if (track === 2 && level === 1) it = nextTermItem(rng.int(2, 9), rng.int(2, 6));
  else if (track === 2 && level === 2) it = farItem(PAIRS, 5, { level: 2 });
  else if (track === 2 && level === 3) it = separateItem(rng.pick(LINEAR), rng, { level: 3 });
  else if (track === 1 && level === 3) it = positionItem(rng.pick(CHAINS.filter((c) => c.items.length === 3)), 10, rng, { level: 3, conflict: false });
  return it ? { ...it, id: 's15-diag' } : null;
}

export const stop15: StopDef = {
  n: 15,
  id: 's15',
  title: 'Rule Rise',
  idea: 'A stated construction tells you the far step. Two rules can agree on one input: find the one that tells them apart.',
  ready: true,
  lessons: [growing, machine, clock],
  check,
  practice: arcade,
  fresh,
  requires: [],
  lessonOrder: 'free',
  observatory: { ring: 2, track: 2, plain: 'Growth rules, functions and cycles', diagnostic },
  skillNames: {
    's15.stair-why': 'Rule Rise: explain a far step of a growing pattern',
    's15.stair-far': 'Rule Rise: a far step from a stated construction',
    's15.constant-jump': 'Rule Rise: a far term under a constant-addition rule',
    's15.stair-shrink': 'Rule Rise: a far step of a shrinking pattern',
    's15.grow-transfer': 'Rule Rise: a growth rule in a new setting',
    's15.machine-why': 'Rule Rise: why a repeated test can’t pick a rule',
    's15.separate': 'Rule Rise: choose a separating input',
    's15.machine-which': 'Rule Rise: test every candidate rule',
    's15.machine-fill': 'Rule Rise: run a stated machine rule',
    's15.machine-back': 'Rule Rise: run a machine backwards',
    's15.test-setting': 'Rule Rise: choose a test that splits two ideas',
    's15.rule-test': 'Rule Rise: keep or rule out a rule (primer)',
    's15.cycle-why': 'Rule Rise: positions from 1, elapsed steps from 0',
    's15.cycle-position': 'Rule Rise: a far position in a cycle',
    's15.cycle-elapsed': 'Rule Rise: elapsed steps in a cycle',
    's15.cycle-count': 'Rule Rise: count an item in a cycle',
    's15.cycle-transfer': 'Rule Rise: a cycle in a new setting',
    's15.groups': 'Rule Rise: whole groups and the left-over (primer)',
  },
};
