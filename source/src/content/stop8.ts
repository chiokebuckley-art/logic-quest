/**
 * Stop 9 · All, Some, None (id s8, n 8; shown as Stop 9 on the Journey).
 * Rings around shape cards show groups. “All” means every one, with no exceptions; “some” means at least one, and maybe
 * all; “no” means not even one. The opposite of “all” is “some are not”, and one card is enough to break “all”. With
 * nothing in a ring, nothing breaks “all” (true) and nothing makes “some” true (false).
 *
 *  l1 In the ring or not          which ring a card goes in; trap: a card in both rings
 *  l2 All, some, none             is the sentence true for the rings; trap and conflict: every one fits, so “some” is true
 *  l3 Not all means some are not  the opposite; the card that breaks it; trap: “no” offered as the opposite of “all”
 *  l4 When the ring is empty      “all” is true, “some” is false; trap and conflict: an “all” sentence about an empty ring
 *
 * Every lesson is See -> Do -> Quiz, with a contrast card and its board for the idea that is easy to merge. Every answer,
 * explanation, hint case and board mark comes from ../engine/puzzles/quantifiers.ts. The check ends with the why item.
 * The warm-up (bridge) is a Stop 7 idea (shown as Stop 8): one draw breaks an “every” sentence.
 */
import {
  BREAK_VS_MAKE,
  EMPTY_ALL,
  IN_BOTH,
  IN_VS_ONLY,
  L1_BOTH,
  L1_X,
  L1_Y,
  L2_ALL,
  L2_SOME,
  L3_BREAKER,
  L3_NOT_ALL,
  L3_SOME_OPP,
  L4_EMPTY,
  NOT_ALL_NONE,
  NOT_ALL_VS_NONE,
  S8_SKINS,
  SOME_ALL,
  SOME_VS_NOT_ALL,
  WHY_LESSON,
  allCardScene,
  bothTapItem,
  breaks,
  breakMakeContrast,
  bridgeItem,
  cardName,
  counterBoard,
  counterItem,
  counterWorkedScene,
  countItem,
  emptyBoard,
  emptyCardScene,
  emptyItem,
  emptyMarkBoard,
  emptyWorkedLines,
  emptyWorkedScene,
  enoughItem,
  filledItem,
  inOnlyBoard,
  inOnlyContrast,
  memberWorkedLines,
  memberWorkedScene,
  notAllBoard,
  notAllCardScene,
  notAllContrast,
  oneRingCardScene,
  oppositeItem,
  placeBoard,
  placeItem,
  quantBoard,
  quantWorkedLines,
  quantWorkedScene,
  ringTapItem,
  sen,
  someBoard,
  someCardScene,
  someContrast,
  someOppCardScene,
  truth,
  truthItem,
  twoRingsCardScene,
  whichItem,
  whyItem,
  type S8Made,
  type S8Skin,
  type WhyFamily,
} from '../engine/puzzles/quantifiers';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';

const STOP = 8;

/** A made item as a Stop 9 item: its id, lesson and skill (`s8.<tag>`). */
const finish = (m: S8Made, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set look the same: a repeat is thrown away and made again from the same
 * rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => S8Made) => S8Made {
  const seen = new Set<string>();
  const key = (m: S8Made) => {
    const it = m.item as unknown as Item;
    return JSON.stringify([it.prompt, it.scene ?? null, it.kind === 'choose' ? it.choices.map((c) => c.label) : it.kind === 'tapall' ? it.things : null]);
  };
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

const practiceOf = (lesson: string, make: (rng: Rng) => S8Made[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));
const tf = (v: boolean) => (v ? 'true' : 'false');

// ---------- Lesson 1: in the ring or not ----------

const L1: LessonDef = {
  id: 's8.l1',
  title: 'In the ring or not',
  ideas: [
    {
      title: 'A ring around a group',
      scene: oneRingCardScene(),
      body: [
        'A ring is a fence around a group of things.',
        'The Red ring holds every red card. Each card that is not red stays outside.',
        'Grown-ups call a group like this a set.',
      ],
    },
    {
      title: 'Two rings can overlap',
      scene: twoRingsCardScene(),
      body: [
        'Here are two rings: Circles and Red.',
        `The ${cardName(L1_BOTH)} is a circle. It is red too. So it goes in both rings.`,
        'The rings overlap to make room for it. The part they share is called the overlap.',
      ],
    },
    {
      // The contrast before any board: the same card, “in the Red ring” and “only in the Red ring”.
      title: 'In a ring, or only in it?',
      distinction: IN_VS_ONLY.id,
      scene: inOnlyContrast(),
      body: [
        'A card in the overlap is in both rings.',
        `So the ${cardName(L1_BOTH)} is in the Red ring. But it is not only in the Red ring.`,
      ],
    },
    {
      title: 'Example: where each card goes',
      scene: memberWorkedScene(),
      body: ['These rings are Big and Blue. Check each card’s features, one ring at a time.', ...memberWorkedLines()],
    },
  ],
  drill: [inOnlyBoard(2), placeBoard(3)],
  distinctions: [IN_VS_ONLY],
  terms: [
    { term: 'set', also: 'a group in a ring', means: 'A group of things that share a feature. A ring shows a set.' },
    { term: 'overlap', means: 'The part two rings share. A thing there is in both rings.' },
  ],
  practice: practiceOf('s8.l1', (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(S8_SKINS);
    // Tap a ring (the trap: a card in both), place one card, count a ring, then tap the overlap.
    return [
      one(() => ringTapItem(rng, { skin: a })),
      one(() => placeItem(rng, { skin: b, part: rng.pick(['both', 'both', 'a', 'b', 'out'] as const) })),
      one(() => countItem(rng, { skin: c })),
      one(() => bothTapItem(rng, { skin: rng.pick(S8_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [IN_BOTH] },
};

// ---------- Lesson 2: all, some, none ----------

const SOME_RED = sen('some', L1_X, L1_Y);
const ALL_RED = sen('all', L1_X, L1_Y);
const NO_RED = sen('none', L1_X, L1_Y);

const L2: LessonDef = {
  id: 's8.l2',
  title: 'All, some, none',
  ideas: [
    {
      title: 'Three small words',
      body: [
        '“All” means every one, with no exceptions.',
        '“Some” means at least one. It might be all of them.',
        '“No” means not even one. You can also say “none.”',
      ],
    },
    {
      title: '“All” on the rings',
      scene: allCardScene(),
      body: [
        '“All circles are red” is true when every circle is in the Red ring.',
        `So no circle sits only in the Circles ring. Here, none does. It is ${tf(truth(ALL_RED, L2_ALL.things))}.`,
        'Just one circle out there would break it.',
      ],
    },
    {
      title: '“Some” and “no” on the rings',
      scene: someCardScene(),
      body: [
        `“Some circles are red” is true when the overlap holds at least one card. Here it holds one. It is ${tf(truth(SOME_RED, L2_SOME.things))}.`,
        `“No circles are red” is true when the overlap is empty. Here it is not. It is ${tf(truth(NO_RED, L2_SOME.things))}.`,
      ],
    },
    {
      // The contrast before the boards: the same words in two pictures, one where every circle is red.
      title: '“Some” can mean all',
      distinction: SOME_VS_NOT_ALL.id,
      scene: someContrast(),
      body: [
        'In everyday talk, “some” often hints “not all.”',
        'In logic, “some” only means at least one. So it stays true when every one fits.',
      ],
    },
    {
      title: 'Example: triangles and blue',
      scene: quantWorkedScene(),
      body: ['Look in the Triangles ring. Then check each sentence.', ...quantWorkedLines()],
    },
  ],
  drill: [someBoard(3), quantBoard(4)],
  distinctions: [SOME_VS_NOT_ALL],
  terms: [
    { term: 'all', means: 'Every one, with no exceptions.' },
    { term: 'some', means: 'At least one, and maybe all.' },
    { term: 'none', also: 'no', means: 'Not even one.' },
  ],
  practice: practiceOf('s8.l2', (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(S8_SKINS);
    // An “all” sentence, a “no” sentence, the trap (every one fits, so “some” is true), then which sentence is true.
    return [
      one(() => truthItem(rng, { skin: a, q: 'all' })),
      one(() => truthItem(rng, { skin: b, q: 'none' })),
      one(() => truthItem(rng, { skin: c, q: 'some', trap: true })),
      one(() => whichItem(rng, { skin: rng.pick(S8_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [SOME_ALL] },
};

// ---------- Lesson 3: not all means some are not ----------

const L3: LessonDef = {
  id: 's8.l3',
  title: 'Not all means some are not',
  ideas: [
    {
      title: 'The opposite',
      body: [
        'The opposite of a sentence is true when the sentence is false. It is false when the sentence is true.',
        'You met this idea as NOT in Stop 1.',
      ],
    },
    {
      title: 'Not all',
      scene: notAllCardScene(),
      body: [
        'When is “All circles are red” false? When at least one circle is not red.',
        `Here the ${cardName(L3_NOT_ALL.things.find((t) => breaks(ALL_RED, t))!)} is marked with a dashed line. It is not red, and one is enough.`,
        'So the opposite of “All circles are red” is “Some circles are not red.” You can also say “Not all circles are red.”',
      ],
    },
    {
      // The contrast before the boards: the same three circles, “not all” and “none”.
      title: '“Not all” is not “none”',
      distinction: NOT_ALL_VS_NONE.id,
      scene: notAllContrast(),
      body: ['“Not all” and “none” sound alike, but they are not the same.', '“Not all” needs just one that is not. “None” needs every one to be not.'],
    },
    {
      title: 'The opposite of “some”',
      scene: someOppCardScene(),
      body: [
        'When is “Some circles are red” false? Only when not even one circle is red.',
        `So its opposite is “No circles are red.” Here the overlap is empty, so that one is ${tf(truth(NO_RED, L3_SOME_OPP.things))}.`,
      ],
    },
    {
      title: 'Example: one card breaks it',
      scene: counterWorkedScene(),
      body: [
        'Sam says, “All squares are yellow.” Look in the Squares ring.',
        `The ${cardName(L3_BREAKER)} is a square, but it is not yellow. It is marked with a dashed line.`,
        'That one card breaks the sentence. A case that breaks an “all” sentence is called a counterexample.',
      ],
    },
  ],
  drill: [notAllBoard(2), counterBoard(4)],
  distinctions: [NOT_ALL_VS_NONE],
  terms: [
    { term: 'opposite', means: 'A sentence that is true just when the first one is false.' },
    { term: 'not all', means: 'At least one is not. It means the opposite of an “all” sentence.' },
    { term: 'counterexample', means: 'One case that breaks an “all” sentence. One is enough.' },
  ],
  practice: practiceOf('s8.l3', (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(S8_SKINS);
    // The trap (the opposite of “all”, with “no” offered), another opposite, the card that breaks it, one is enough.
    return [
      one(() => oppositeItem(rng, { skin: a, of: 'all' })),
      one(() => oppositeItem(rng, { skin: b, of: rng.pick(['some', 'none', 'someNot'] as const) })),
      one(() => counterItem(rng, { skin: c })),
      one(() => enoughItem(rng, { skin: rng.pick(S8_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [NOT_ALL_NONE] },
};

// ---------- Lesson 4: when the ring is empty ----------

const ALL_SQUARES = sen('all', L4_EMPTY.x, L4_EMPTY.y);
const SOME_SQUARES = sen('some', L4_EMPTY.x, L4_EMPTY.y);
const NO_SQUARES = sen('none', L4_EMPTY.x, L4_EMPTY.y);

const L4: LessonDef = {
  id: 's8.l4',
  title: 'When the ring is empty',
  ideas: [
    {
      title: 'An empty ring',
      scene: emptyCardScene(),
      body: ['Sometimes a ring has nothing inside.', 'Here there is no square at all, so the Squares ring is empty.', 'Grown-ups call it an empty set.'],
    },
    {
      title: '“All,” with nothing inside',
      scene: emptyCardScene(),
      body: [
        'Is “All squares are red” true here?',
        'Ask what would break it: a square that is not red. There is no square at all.',
        `So nothing breaks it. It is ${tf(truth(ALL_SQUARES, L4_EMPTY.things))}.`,
      ],
    },
    {
      title: '“Some” and “no,” with nothing inside',
      scene: emptyCardScene(),
      body: [
        `“Some squares are red” needs at least one red square. There is none, so it is ${tf(truth(SOME_SQUARES, L4_EMPTY.things))}.`,
        `“No squares are red” is ${tf(truth(NO_SQUARES, L4_EMPTY.things))}. Not even one square is red.`,
      ],
    },
    {
      // The contrast before the boards: the same cards with no square, “all” and “some”.
      title: 'Break it, or make it true?',
      distinction: BREAK_VS_MAKE.id,
      scene: breakMakeContrast(),
      body: ['An “all” sentence is true unless a card breaks it.', 'A “some” sentence is true only if a card makes it true.', 'With nothing in the ring, “all” is true and “some” is false.'],
    },
    {
      title: 'Example: the dragon’s cave',
      scene: emptyWorkedScene(),
      body: ['A dragon keeps these gems in its cave. There is no triangle gem.', ...emptyWorkedLines()],
    },
  ],
  drill: [emptyBoard(3), emptyMarkBoard(4)],
  distinctions: [BREAK_VS_MAKE],
  terms: [{ term: 'empty set', also: 'an empty ring', means: 'A set with nothing in it. An empty ring shows one.' }],
  practice: practiceOf('s8.l4', (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(S8_SKINS);
    // The trap (an “all” sentence about an empty ring), a “some” one, a ring with cards in it, then why.
    return [
      one(() => emptyItem(rng, { skin: a, q: 'all' })),
      one(() => emptyItem(rng, { skin: b, q: rng.pick(['some', 'some', 'none', 'someNot'] as const) })),
      one(() => filledItem(rng, { skin: c })),
      one(() => whyItem(rng, { skin: rng.pick(S8_SKINS), family: 'empty' })),
    ];
  }),
  pass: { firstTry: 3, include: [EMPTY_ALL] },
};

const lessons = [L1, L2, L3, L4];

// ---------- check, Arcade, new examples, warm-up ----------

const WHY_FAMILIES: readonly WhyFamily[] = ['some-all', 'counter', 'empty'];

/**
 * 9 items: two from each lesson, in lesson order, then the why item last. The second Lesson 2 item (every one fits, so
 * “some” is true) and the first Lesson 4 item (an “all” sentence about an empty ring) are conflict items.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const [a, b, c] = rng.shuffle(S8_SKINS);
  const any = () => rng.pick(S8_SKINS);
  const fam = rng.pick(WHY_FAMILIES);
  const plan: [string, S8Made][] = [
    ['s8.l1', one(() => ringTapItem(rng, { skin: a }))],
    ['s8.l1', one(() => (rng.chance(0.5) ? placeItem(rng, { skin: b }) : countItem(rng, { skin: b })))],
    ['s8.l2', one(() => (rng.chance(0.5) ? truthItem(rng, { skin: c, q: rng.pick(['all', 'none'] as const) }) : whichItem(rng, { skin: c, form: 'true' })))],
    ['s8.l2', one(() => truthItem(rng, { skin: any(), q: 'some', trap: true }))],
    ['s8.l3', one(() => oppositeItem(rng, { skin: any(), of: 'all' }))],
    ['s8.l3', one(() => (rng.chance(0.5) ? counterItem(rng, { skin: any() }) : enoughItem(rng, { skin: any() })))],
    ['s8.l4', one(() => emptyItem(rng, { skin: any(), q: 'all' }))],
    ['s8.l4', one(() => (rng.chance(0.6) ? emptyItem(rng, { skin: any(), q: rng.pick(['some', 'none', 'someNot'] as const) }) : filledItem(rng, { skin: any() })))],
    [WHY_LESSON[fam], one(() => whyItem(rng, { skin: any(), family: fam }))],
  ];
  return plan.map(([lesson, m], i) => finish(m, `s${STOP}-c${i + 1}`, lesson));
}

/** One item for the Arcade, from any lesson. */
const ARCADE: [string, (rng: Rng, skin: S8Skin) => S8Made][] = [
  ['s8.l1', (rng, skin) => ringTapItem(rng, { skin })],
  ['s8.l1', (rng, skin) => placeItem(rng, { skin })],
  ['s8.l1', (rng, skin) => countItem(rng, { skin })],
  ['s8.l1', (rng, skin) => bothTapItem(rng, { skin })],
  ['s8.l2', (rng, skin) => truthItem(rng, { skin, q: rng.pick(['all', 'some', 'none'] as const), trap: rng.chance(0.25) })],
  ['s8.l2', (rng, skin) => whichItem(rng, { skin })],
  ['s8.l3', (rng, skin) => oppositeItem(rng, { skin, of: rng.pick(['all', 'some', 'none', 'someNot'] as const) })],
  ['s8.l3', (rng, skin) => counterItem(rng, { skin })],
  ['s8.l3', (rng, skin) => enoughItem(rng, { skin })],
  ['s8.l4', (rng, skin) => emptyItem(rng, { skin, q: rng.pick(['all', 'some', 'none', 'someNot'] as const) })],
  ['s8.l4', (rng, skin) => whyItem(rng, { skin, family: 'empty' })],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  return finish(make(rng, rng.pick(S8_SKINS)), `s${STOP}-arcade`, lesson);
}

const answerOf = (missed: Item) => (missed.kind === 'choose' ? missed.answer : '');
const has = (missed: Item, tag: string) => !!missed.tags?.includes(tag);

/**
 * New examples after a miss. A true-or-false question gets a pair: one true and one false, so repeating one answer never
 * passes the set. A missed trap gets the trap again, and its other side. A missed why gets another why.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = (m: S8Made, lesson = missed.lesson) => finish(m, 'new', lesson);
  const skin = () => rng.pick(S8_SKINS);
  const p = missed.prompt;
  switch (missed.skill) {
    case 's8.member': {
      if (missed.kind === 'tapall') return [make(p.includes('in both rings') ? bothTapItem(rng, { skin: skin() }) : ringTapItem(rng, { skin: skin() }))];
      if (p.includes('How many')) return [make(countItem(rng, { skin: skin() }))];
      return [make(placeItem(rng, { skin: skin(), part: 'both' })), make(placeItem(rng, { skin: skin(), part: rng.pick(['a', 'b', 'out'] as const) }))];
    }
    case 's8.quantify': {
      if (has(missed, SOME_ALL.tag)) return [make(truthItem(rng, { skin: skin(), q: 'some', trap: true })), make(truthItem(rng, { skin: skin(), q: 'some', want: false }))];
      if (p.includes('Which sentence')) return [make(whichItem(rng, { skin: skin(), form: 'true' })), make(whichItem(rng, { skin: skin(), form: 'false' }))];
      const q = rng.pick(['all', 'some', 'none'] as const);
      const was = answerOf(missed) === 'true';
      return [make(truthItem(rng, { skin: skin(), q, want: was })), make(truthItem(rng, { skin: skin(), q, want: !was }))];
    }
    case 's8.negate': {
      if (p.includes('opposite')) return [make(oppositeItem(rng, { skin: skin(), of: 'all' })), make(oppositeItem(rng, { skin: skin(), of: rng.pick(['some', 'none', 'someNot'] as const) }))];
      if (p.includes('breaks')) return [make(counterItem(rng, { skin: skin(), q: 'all' })), make(counterItem(rng, { skin: skin(), q: 'none' }))];
      return [make(enoughItem(rng, { skin: skin() })), make(truthItem(rng, { skin: skin(), q: 'all', want: true }), 's8.l2')];
    }
    case 's8.empty':
      return [make(emptyItem(rng, { skin: skin(), q: 'all' })), make(emptyItem(rng, { skin: skin(), q: 'some' })), make(filledItem(rng, { skin: skin(), q: 'all', want: false }))];
    case 's8.why': {
      const fams = rng.shuffle(WHY_FAMILIES);
      return fams.slice(0, 2).map((f) => make(whyItem(rng, { skin: skin(), family: f }), WHY_LESSON[f]));
    }
  }
  return [];
}

/** The warm-up: a Stop 7 idea (shown as Stop 8): one draw breaks an “every” sentence. It never counts for this stop. */
function bridge(rng: Rng): Item {
  const m = bridgeItem(rng);
  return { id: `s${STOP}-warm`, stop: 7, lesson: 's7.l1', skill: `s7.${m.tag}`, ...m.item } as Item;
}

export const stop8: StopDef = {
  n: STOP,
  id: 's8',
  title: 'All, Some, None',
  idea: '“Some” means at least one, and maybe all.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  skillNames: {
    's8.member': 'All, Some, None: which ring a thing goes in, the overlap too',
    's8.quantify': 'All, Some, None: is an “all,” “some” or “no” sentence true?',
    's8.negate': 'All, Some, None: the opposite of “all,” and one case that breaks it',
    's8.empty': 'All, Some, None: sentences about an empty ring',
    's8.why': 'All, Some, None: why a sentence is true or false',
  },
};
