/**
 * Stop 10 · Circuit Lab (id s10, n 10; shown as Stop 11 on the Journey).
 * A circuit is one loop from a battery, through switches, to a lamp and back. A closed switch lets power pass; an open
 * one leaves a gap. Wiring turns the AND, OR and NOT of NOT, AND, OR and Truth Tables into a lamp you can see.
 *
 *  l1 In a line: AND          the lamp is on only when every switch in the line is closed; trap: one closed, one open
 *  l2 Side by side: OR        one closed path is enough; trap: both closed, and the lamp is still on
 *  l3 The flipper: NOT        a flipper box (an inverter) does the opposite of its inside; trap: a closed switch inside one
 *  l4 From table to circuit   which circuit has this table, fill a circuit's table, do two circuits do the same job;
 *                             trap and conflict: two circuits that look different and have the same table
 *  l5 The two-way switch      a hall lamp with a switch at each end: on when exactly one switch is up (exclusive or);
 *                             fill its table, one row next to side by side, which circuit has a table; trap: both up
 *
 * Every lesson is See -> Do -> Quiz. Every answer, explanation, hint case and board mark comes from the circuit model in
 * ../engine/puzzles/circuits.ts (the same table is checked with Stop 9's truth tables and Stop 2's card rules); the
 * pictures, contrast cards and boards are in ../engine/puzzles/circuitBoards.ts. The check ends with a why item. The
 * warm-up (bridge) is a Stop 9 fill-the-column item: a line works like AND, and side by side like OR.
 */
import {
  CLOSED_VS_LIT,
  LINE_VS_SIDE,
  LOOKS_VS_WORKS,
  ONE_VS_ALL,
  UP_VS_DIFFER,
  bothScene,
  closedOpenScene,
  closedVsLitBoard,
  closedVsLitCard,
  flipExampleScene,
  flipScene,
  flipSideBoard,
  flipTableBoard,
  flipTableScene,
  hallCard,
  lineExampleScene,
  lineScene,
  lineTableBoard,
  lineVsSideBoard,
  lineVsSideCard,
  looksVsWorksBoard,
  looksVsWorksCard,
  loopScene,
  oneVsAllBoard,
  oneVsAllCard,
  orderScene,
  pickBoard,
  pickCard,
  sameBoard,
  sameExampleScene,
  sideExampleScene,
  sideScene,
  sideTableBoard,
  sideVsTwoBoard,
  sideVsTwoCard,
  tableScene,
  threeLineBoard,
  threeSideBoard,
  twoExampleCard,
  twoTableBoard,
  upVsDifferBoard,
  upVsDifferCard,
  wiresCard,
} from '../engine/puzzles/circuitBoards';
import {
  A,
  B,
  BOTH_CLOSED,
  BOTH_UP,
  C,
  FLIP_CLOSED,
  LINE,
  LOOKS_DIFFER,
  ONE_CLOSED,
  SIDE,
  SKINS,
  WHY_KINDS,
  WHY_LESSON,
  bridgeItem,
  caseItem,
  columnItem,
  compareItem,
  lampItem,
  matchItem,
  pickItem,
  sameItem,
  whyItem,
  type CircuitMade,
  type Fam,
  type Net,
  type Skin,
  type WhyKind,
} from '../engine/puzzles/circuits';
import { tableScratch } from '../engine/puzzles/tableBoards';
import type { ChooseItem, Item, LessonDef, Rng, StopDef } from '../engine/types';

const STOP = 10;
const L1 = 's10.l1', L2 = 's10.l2', L3 = 's10.l3', L4 = 's10.l4', L5 = 's10.l5';

/** A made item as a Stop 10 item: its id, lesson and skill (`s10.<tag>`). */
const finish = (m: CircuitMade, id: string, lesson: string): ChooseItem => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item });

/**
 * Makes the items of one set. No two items in a set share a prompt, scene and choices: a repeat is thrown away and made
 * again from the same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => CircuitMade) => CircuitMade {
  const seen = new Set<string>();
  const key = (m: CircuitMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

/** k skins for a pack: the three in a new order, repeated as needed, so a pack always has two or more. */
function packSkins(rng: Rng, k: number): Skin[] {
  const order = rng.shuffle(SKINS);
  return Array.from({ length: k }, (_, i) => order[i % order.length]);
}

const practiceOf = (lesson: string, make: (rng: Rng) => CircuitMade[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));

/** A lamp, column and case pack for one family: a plain case, the trap, the column, then a case or another lamp. */
function familyPack(fam: Fam, three: Net | null, caseWant: boolean | undefined) {
  return (rng: Rng): CircuitMade[] => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => lampItem(rng, { skin: s[0], avoid: used, fam })),
      one(() => lampItem(rng, { skin: s[1], avoid: used, fam, trap: true })),
      one(() => columnItem(rng, { skin: s[2], avoid: used, fam })),
      one(() => (rng.chance(0.5) || !three ? caseItem(rng, { skin: s[3], avoid: used, fam, want: caseWant }) : lampItem(rng, { skin: s[3], avoid: used, fam, net: three, trap: rng.chance(0.5) }))),
    ];
  };
}
const LINE3_NET = LINE(A, B, C);
const SIDE3_NET = SIDE(A, B, C);

// ---------- the lessons ----------

const l1: LessonDef = {
  id: L1,
  title: 'In a line: AND',
  ideas: [
    {
      title: 'A loop for power',
      scene: loopScene(),
      body: [
        'A circuit is a loop. Power leaves the battery, runs along the wire, through the lamp, and back.',
        'If the loop has a gap anywhere, power stops. Then the lamp is off.',
        'A switch is a part that can close a gap or open one.',
      ],
    },
    {
      title: 'Closed and open',
      scene: closedOpenScene(),
      body: [
        'A closed switch has no gap. Power can pass it, so the lamp is on.',
        'An open switch has a gap. Power stops there, so the lamp is off.',
        'Careful: a closed door stops you, but a closed switch lets power through. Think of a drawbridge. When it is closed, cars can cross.',
      ],
    },
    {
      title: 'In a line',
      scene: lineScene(),
      body: [
        'Now put two switches in a line, one after the other.',
        'Power must pass switch A and then switch B. So the lamp is on only when A is closed and B is closed.',
        'This is AND from NOT, AND, OR. Grown-ups call parts in a line a series circuit.',
      ],
    },
    oneVsAllCard(),
    {
      title: 'Example: the line table',
      scene: lineExampleScene(),
      body: [
        'A table lists every case of the switches, one row each. The lamp column says on or off.',
        'Row 1: A and B are both closed. Power passes both, so the lamp is on.',
        'Row 2: B is open. Its gap stops the power, so the lamp is off.',
      ],
    },
  ],
  drill: [oneVsAllBoard(), lineTableBoard(), threeLineBoard()],
  distinctions: [ONE_VS_ALL],
  terms: [
    { term: 'circuit', means: 'A loop of wire from a battery, through switches and a lamp, and back.' },
    { term: 'closed switch', means: 'A switch with no gap, so power can pass it.' },
    { term: 'open switch', means: 'A switch with a gap, so power stops there.' },
    { term: 'series', means: 'Parts wired in a line, one after the other. Power must pass every part.', also: 'in a line' },
  ],
  // The quiz: a plain case, the trap (one switch closed and one open), the lamp column, then a case or three in a line.
  practice: practiceOf(L1, familyPack('line', LINE3_NET, true)),
  pass: { firstTry: 3, include: [ONE_CLOSED] },
};

const l2: LessonDef = {
  id: L2,
  title: 'Side by side: OR',
  ideas: [
    {
      title: 'Side by side',
      scene: sideScene(),
      body: [
        'Now put the two switches side by side. Power has two paths: one through A and one through B.',
        'Power needs just one path. Here A is closed and B is open, and the lamp is on.',
        'Grown-ups call this a parallel circuit.',
      ],
    },
    {
      title: 'Both closed: still on',
      scene: bothScene(),
      body: [
        'What if both switches are closed? Then power has two paths it can take.',
        'The lamp is still on. This is OR from NOT, AND, OR: OR includes both.',
        'Side by side, the lamp is off only when every switch is open.',
      ],
    },
    lineVsSideCard(),
    {
      title: 'Example: the side-by-side table',
      scene: sideExampleScene(),
      body: [
        'Row 1: both closed. Power has two paths, so the lamp is on.',
        'Row 2: A closed, B open. Power takes the path through A, so the lamp is on.',
        'Now you fill rows 3 and 4.',
      ],
    },
  ],
  drill: [lineVsSideBoard(), sideTableBoard(), threeSideBoard()],
  distinctions: [LINE_VS_SIDE],
  terms: [{ term: 'parallel', means: 'Parts wired side by side, each on its own path. Power needs just one path.', also: 'side by side' }],
  // The quiz: a plain case, the trap (both closed), the lamp column, then a case or three side by side.
  practice: practiceOf(L2, familyPack('side', SIDE3_NET, false)),
  pass: { firstTry: 3, include: [BOTH_CLOSED] },
};

const l3: LessonDef = {
  id: L3,
  title: 'The flipper: NOT',
  ideas: [
    {
      title: 'The flipper box',
      scene: flipScene(),
      body: [
        'A flipper box sits around a part and does the opposite.',
        'If its inside would let power through, the box stops it. If its inside would stop power, the box lets it through.',
        'Here switch A is open, so the box lets power through. Grown-ups call a flipper box an inverter.',
      ],
    },
    {
      title: 'NOT in a circuit',
      scene: flipTableScene(),
      body: [
        'Switch A in a flipper box works like NOT A.',
        'When A is closed, the lamp is off. When A is open, the lamp is on.',
        'The lamp column is the switch column flipped, just like NOT in Truth Tables.',
      ],
    },
    closedVsLitCard(),
    {
      title: 'Example: a flipper in a line',
      scene: flipExampleScene(),
      body: [
        'Here a flipper box on A is in a line with switch B. Work out the box first, then the line.',
        'Row 1: A is closed, so its box stops power. The lamp is off.',
        'Row 2: A is closed again, so the box stops power. The lamp is off, whatever B does.',
      ],
    },
  ],
  drill: [closedVsLitBoard(), flipTableBoard(), flipSideBoard()],
  distinctions: [CLOSED_VS_LIT],
  terms: [{ term: 'inverter', means: 'A part that does the opposite of its inside. It lets power through only when its inside would stop it.', also: 'flipper box' }],
  // The quiz: a plain case, the trap (a closed switch inside a flipper box), the lamp column, then a case.
  practice: practiceOf(L3, familyPack('flip', null, undefined)),
  pass: { firstTry: 3, include: [FLIP_CLOSED] },
};

const l4: LessonDef = {
  id: L4,
  title: 'From table to circuit',
  ideas: [
    {
      title: 'Every circuit has a table',
      scene: tableScene(),
      body: [
        'List every case of the switches, one row each. Then write the lamp for each case. That is the circuit’s table.',
        'It works like a truth table. Closed is like True, and on is like True.',
        'A line is AND, side by side is OR, and a flipper box is NOT.',
      ],
    },
    {
      title: 'Same table, same job',
      scene: orderScene(),
      body: [
        'Two circuits do the same job when their lamps agree in every row. Then no case can tell them apart.',
        'Here circuit 2 has B first. Its lamp still agrees with circuit 1 in all four rows.',
        'Agreeing in some rows is not enough. It must be every row.',
      ],
    },
    looksVsWorksCard(),
    {
      title: 'Example: two that look different',
      scene: sameExampleScene(),
      body: [
        'Circuit 1 has one flipper box around A and B side by side. Circuit 2 has a flipper box on each switch, in a line.',
        'Circuit 1: the box does the opposite of the pair. Its lamp is on only when A and B are both open.',
        'Circuit 2: power must pass both boxes. That also needs A and B both open. The lamps agree in every row, so they do the same job.',
      ],
    },
    {
      title: 'From a table to a circuit',
      body: [
        'To find the circuit for a table, check each circuit row by row.',
        'Cross a circuit out as soon as one row does not match.',
        'One row that matches is not enough. The right circuit matches every row.',
      ],
    },
  ],
  drill: [looksVsWorksBoard(), sameBoard()],
  distinctions: [LOOKS_VS_WORKS],
  // The quiz: which circuit has this table, the trap (two that look different with the same table), a lamp column, then
  // a pair that looks alike or another table.
  practice: practiceOf(L4, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => matchItem(rng, { skin: s[0], avoid: used })),
      one(() => sameItem(rng, { skin: s[1], avoid: used, same: true })),
      one(() => columnItem(rng, { skin: s[2], avoid: used, fam: 'mixed' })),
      one(() => (rng.chance(0.5) ? sameItem(rng, { skin: s[3], avoid: used, same: false }) : matchItem(rng, { skin: s[3], avoid: used }))),
    ];
  }),
  pass: { firstTry: 3, include: [LOOKS_DIFFER] },
};

const l5: LessonDef = {
  id: L5,
  title: 'The two-way switch',
  ideas: [hallCard(), wiresCard(), upVsDifferCard(), sideVsTwoCard(), twoExampleCard(), pickCard()],
  drill: [upVsDifferBoard(), sideVsTwoBoard(), twoTableBoard(), pickBoard()],
  distinctions: [UP_VS_DIFFER],
  terms: [
    {
      term: 'two-way switch',
      means: 'A switch whose lever is up or down. A pair of them, one at each end, lights the lamp when exactly one is up.',
      also: 'exclusive or in wires',
    },
  ],
  // The quiz: a plain case, the trap (both up: alone, or next to side by side), the lamp column, then which circuit has
  // a table.
  practice: practiceOf(L5, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => lampItem(rng, { skin: s[0], avoid: used, fam: 'two' })),
      one(() => (rng.chance(0.5) ? compareItem(rng, { skin: s[1], avoid: used, trap: true }) : lampItem(rng, { skin: s[1], avoid: used, fam: 'two', trap: true }))),
      one(() => columnItem(rng, { skin: s[2], avoid: used, fam: 'two' })),
      one(() => pickItem(rng, { skin: s[3], avoid: used })),
    ];
  }),
  pass: { firstTry: 3, include: [BOTH_UP] },
};

const lessons = [l1, l2, l3, l4, l5];

// ---------- check, Arcade, new examples, warm-up ----------

/**
 * 10 items: two from each of lessons 1 to 4, one from lesson 5, then the why item last. The conflict items: one switch
 * closed in a line, both closed side by side, a closed switch in a flipper box, two circuits whose looks point the wrong
 * way, and (most of the time) a two-way pair with both switches up, alone or next to side by side.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const skin = () => rng.pick(SKINS);
  const why = rng.pick(WHY_KINDS);
  const other = (fam: Fam, three: Net | null, want: boolean | undefined) => () =>
    rng.pick([
      () => columnItem(rng, { skin: skin(), avoid: used, fam }),
      () => caseItem(rng, { skin: skin(), avoid: used, fam, want }),
      () => lampItem(rng, { skin: skin(), avoid: used, fam, ...(three ? { net: three } : {}) }),
    ])();
  const plan: [string, () => CircuitMade][] = [
    [L1, () => lampItem(rng, { skin: skin(), avoid: used, fam: 'line', trap: true })],
    [L1, other('line', LINE3_NET, true)],
    [L2, () => lampItem(rng, { skin: skin(), avoid: used, fam: 'side', trap: true })],
    [L2, other('side', SIDE3_NET, false)],
    [L3, () => lampItem(rng, { skin: skin(), avoid: used, fam: 'flip', trap: true })],
    [L3, other('flip', null, undefined)],
    [L4, () => sameItem(rng, { skin: skin(), avoid: used, same: rng.chance(0.6) })],
    [L4, () => (rng.chance(0.7) ? matchItem(rng, { skin: skin(), avoid: used }) : columnItem(rng, { skin: skin(), avoid: used, fam: 'mixed' }))],
    [
      L5,
      () =>
        rng.pick([
          () => compareItem(rng, { skin: skin(), avoid: used, trap: true }),
          () => lampItem(rng, { skin: skin(), avoid: used, fam: 'two', trap: true }),
          () => pickItem(rng, { skin: skin(), avoid: used }),
          () => columnItem(rng, { skin: skin(), avoid: used, fam: 'two' }),
        ])(),
    ],
    [WHY_LESSON[why], () => whyItem(rng, { kind: why })],
  ];
  return plan.map(([lesson, make], i) => finish(one(make), `s${STOP}-c${i + 1}`, lesson));
}

/** One Arcade item from any lesson. */
const ARCADE: [string, (rng: Rng) => CircuitMade][] = [
  [L1, (rng) => lampItem(rng, { skin: rng.pick(SKINS), fam: 'line', trap: rng.chance(0.5) })],
  [L1, (rng) => columnItem(rng, { skin: rng.pick(SKINS), fam: 'line' })],
  [L1, (rng) => caseItem(rng, { skin: rng.pick(SKINS), fam: 'line', want: true })],
  [L2, (rng) => lampItem(rng, { skin: rng.pick(SKINS), fam: 'side', trap: rng.chance(0.5) })],
  [L2, (rng) => columnItem(rng, { skin: rng.pick(SKINS), fam: 'side' })],
  [L2, (rng) => caseItem(rng, { skin: rng.pick(SKINS), fam: 'side', want: false })],
  [L3, (rng) => lampItem(rng, { skin: rng.pick(SKINS), fam: 'flip', trap: rng.chance(0.5) })],
  [L3, (rng) => columnItem(rng, { skin: rng.pick(SKINS), fam: 'flip' })],
  [L3, (rng) => caseItem(rng, { skin: rng.pick(SKINS), fam: 'flip' })],
  [L4, (rng) => matchItem(rng, { skin: rng.pick(SKINS) })],
  [L4, (rng) => sameItem(rng, { skin: rng.pick(SKINS), same: rng.chance(0.5) })],
  [L4, (rng) => columnItem(rng, { skin: rng.pick(SKINS), fam: 'mixed' })],
  [L5, (rng) => lampItem(rng, { skin: rng.pick(SKINS), fam: 'two', trap: rng.chance(0.5) })],
  [L5, (rng) => columnItem(rng, { skin: rng.pick(SKINS), fam: 'two' })],
  [L5, (rng) => compareItem(rng, { skin: rng.pick(SKINS), trap: rng.chance(0.5) })],
  [L5, (rng) => pickItem(rng, { skin: rng.pick(SKINS) })],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  return finish(make(rng), `s${STOP}-arcade`, lesson);
}

const FAM_OF: Record<string, Fam> = { 's10.series': 'line', 's10.parallel': 'side', 's10.not': 'flip', 's10.xor': 'two' };
const TRAP_TAGS: readonly string[] = [ONE_CLOSED.tag, BOTH_CLOSED.tag, FLIP_CLOSED.tag, BOTH_UP.tag];
const answerOf = (it: Item) => (it.kind === 'choose' ? it.answer : '');
const isLamp = (it: Item) => it.kind === 'choose' && it.choices.length === 2 && it.choices.every((c) => c.id === 'on' || c.id === 'off');
const isSame = (it: Item) => it.kind === 'choose' && it.choices.length === 2 && it.choices.every((c) => c.id === 'yes' || c.id === 'no');
/** A Lesson 5 row next to side by side: which lamps are on. */
const isCompare = (it: Item) => it.kind === 'choose' && it.choices.some((c) => c.id === 'only-side');

/**
 * New examples after a miss. A missed lamp question gets a pair: the trap again (or the same lamp) and one with the
 * other lamp, so repeating one answer never passes the set. A missed "same job" question gets one pair that agrees and
 * one that does not, the missed kind first. A missed row next to side by side (Lesson 5) gets the same kind of row
 * first (the trap row, or a row where the lamps agree) and then the other kind, so the answers differ. A missed why
 * gets a why item of the same lesson, then the lesson's trap (Lesson 4: the other kind of why), both on the missed
 * skill. Everything else uses the default (one item with the same skill).
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const skin = () => rng.pick(SKINS);
  if (missed.tags?.includes('why')) {
    // Both stay on the missed skill: a reason again in a new story, then the same idea as a question (the lesson's
    // trap), or in Lesson 4 the other kind of pair.
    const mine = WHY_KINDS.filter((k) => WHY_LESSON[k] === missed.lesson);
    if (!mine.length) return [];
    const first = rng.pick(mine);
    const a = finish(whyItem(rng, { kind: first, skin: skin() }), 'new', missed.lesson);
    const fam = FAM_OF[missed.skill];
    const others = mine.filter((k: WhyKind) => k !== first);
    const b = fam ? lampItem(rng, { skin: skin(), fam, trap: true }) : others.length ? whyItem(rng, { kind: rng.pick(others), skin: skin() }) : sameItem(rng, { skin: skin(), same: true });
    return [a, finish(b, 'new', missed.lesson)];
  }
  const fam = FAM_OF[missed.skill];
  if (fam && isLamp(missed)) {
    const was = answerOf(missed) === 'on';
    const trap = missed.tags?.some((t) => TRAP_TAGS.includes(t));
    const a = trap ? lampItem(rng, { skin: skin(), fam, trap: true }) : lampItem(rng, { skin: skin(), fam, want: was });
    const aOn = a.item.answer === 'on';
    const b = lampItem(rng, { skin: skin(), fam, want: !aOn });
    return [a, b].map((m) => finish(m, 'new', missed.lesson));
  }
  if (isCompare(missed)) {
    const trap = !!missed.tags?.includes(BOTH_UP.tag);
    const a = compareItem(rng, { skin: skin(), trap });
    const b = compareItem(rng, { skin: skin(), trap: !trap });
    return [a, b].map((m) => finish(m, 'new', missed.lesson));
  }
  if (missed.skill === 's10.match' && isSame(missed)) {
    const was = answerOf(missed) === 'yes';
    const a = sameItem(rng, { skin: skin(), same: was });
    const b = sameItem(rng, { skin: skin(), same: !was });
    return [a, b].map((m) => finish(m, 'new', missed.lesson));
  }
  return [];
}

/**
 * The warm-up: a Stop 9 fill-the-column item for AND, OR or NOT (with its table board). It is Stop 9's own item, so it
 * never counts for this stop.
 */
function bridge(rng: Rng): Item {
  const m = bridgeItem(rng);
  const board = tableScratch(m);
  return { id: `s${STOP}-warm`, stop: 9, lesson: 's9.l2', skill: 's9.fill', ...m.item, ...(board ? { scratch: board, scratchLabel: 'the table board' } : {}) };
}

export const stop10: StopDef = {
  n: STOP,
  id: 's10',
  title: 'Circuit Lab',
  idea: 'Computers are built from tiny AND, OR and NOT switches.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  skillNames: {
    's10.series': 'Circuit Lab: switches in a line light the lamp only when all are closed',
    's10.parallel': 'Circuit Lab: switches side by side need just one closed path',
    's10.not': 'Circuit Lab: a flipper box does the opposite of its inside',
    's10.match': 'Circuit Lab: match a circuit to its table, and spot the same job',
    's10.xor': 'Circuit Lab: a two-way switch pair lights the lamp when its switches differ',
  },
};
