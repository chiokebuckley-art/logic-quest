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
 *  l5 Two givens, one picture      does the claim follow? Draw the givens on three rings; trap and conflict: a claim
 *                                  true in the picture but not forced
 *  l6 Every and some: who comes first  “every kid has a friend” vs “one friend of every kid”, on pictures of lines;
 *                                  trap and conflict: each kid with a different friend, so “every kid has a friend” is true
 *
 * Every lesson is See -> Do -> Quiz, with a contrast card and its board for the idea that is easy to merge. Every answer,
 * explanation, hint case and board mark comes from the engine: ../engine/puzzles/quantifiers.ts (lessons 1-4),
 * syllogisms.ts (lesson 5: every placement of cards on the rings) and nested.ts (lesson 6: the lines of a picture). The
 * check ends with the why item. The warm-up (bridge) is a Stop 7 idea (shown as Stop 8): one draw breaks an “every”
 * sentence.
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
  type S8Skin,
  type WhyFamily,
} from '../engine/puzzles/quantifiers';
import {
  HERE_VS_FORCED,
  NOT_FORCED,
  breakItem,
  drawItem,
  followsItem,
  hereBoard,
  hereContrast,
  someTwinBoard,
  sylArgScene,
  sylBreakLines,
  sylBreakScene,
  sylDrawnScene,
  sylFollowsLines,
  sylFollowsScene,
  sylSomeLines,
  sylSomeScene,
  sylTurnLines,
  sylTurnScene,
  twinBoard,
} from '../engine/puzzles/syllogisms';
import {
  EACH_NOT_SHARED,
  EACH_VS_SHARED,
  PQS,
  eachCardLine,
  eachCardScene,
  orderBoard,
  orderContrast,
  orderLineItem,
  orderPictureItem,
  orderTruthItem,
  orderTwinBoard,
  orderWhichItem,
  orderWorkedLines,
  orderWorkedScene,
  sharedCardLine,
  sharedCardScene,
} from '../engine/puzzles/nested';
import type { Made } from '../engine/puzzles/statements';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';

const STOP = 8;

/** A made item as a Stop 9 item: its id, lesson and skill (`s8.<tag>`). */
const finish = (m: Made, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set look the same: a repeat is thrown away and made again from the same
 * rng, so the same seed still gives the same set.
 */
function distinctItems(): <M extends Made>(make: () => M) => M {
  const seen = new Set<string>();
  const key = (m: Made) => {
    const it = m.item as unknown as Item;
    return JSON.stringify([it.prompt, it.scene ?? null, it.kind === 'choose' ? it.choices.map((c) => c.label) : it.kind === 'tapall' ? it.things : null]);
  };
  return <M extends Made>(make: () => M): M => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

const practiceOf = (lesson: string, make: (rng: Rng) => Made[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));
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

// ---------- Lesson 5: two givens, one picture ----------

const L5: LessonDef = {
  id: 's8.l5',
  title: 'Two givens, one picture',
  ideas: [
    {
      title: 'Two givens and a claim',
      scene: sylArgScene(),
      body: [
        'Here is an argument about groups. It has two givens and a claim.',
        'The claim follows when it must be true whenever both givens are true. You met that word in Stop 2.',
        'Grown-ups call an argument like this a syllogism: two givens and a claim.',
      ],
    },
    {
      title: 'Draw the givens',
      scene: sylDrawnScene(),
      body: [
        'Draw each group as a ring: Circles, Red and Big. Each kind of card has its own part.',
        'Given 1 says every circle is red. So a circle that is not red can’t be in the picture. Cross out those parts. A crossed-out part is gray.',
        'Given 2 says every red card is big. So cross out the parts of the Red ring outside the Big ring.',
        'A “no” given crosses out the part where its two rings overlap.',
      ],
    },
    {
      title: 'Example: it follows',
      scene: sylFollowsScene(),
      body: [...sylFollowsLines(), 'If a card that is not crossed out could break the claim, the claim would not follow.'],
    },
    {
      // The contrast before the boards: the same givens and claim, on two pictures the givens allow.
      title: 'True here is not the same as follows',
      distinction: HERE_VS_FORCED.id,
      scene: hereContrast(),
      body: ['A claim can be true in one picture and still not follow.', 'Both pictures fit the givens. The claim is true in the first one and false in the second.'],
    },
    {
      title: 'Example: a card that breaks it',
      scene: sylBreakScene(),
      body: sylBreakLines(),
    },
    {
      title: 'Turning “all” around',
      scene: sylTurnScene(),
      body: sylTurnLines(),
    },
    {
      title: 'A “some” given',
      scene: sylSomeScene(),
      body: sylSomeLines(),
    },
  ],
  drill: [hereBoard(3), twinBoard(4), someTwinBoard(6)],
  distinctions: [HERE_VS_FORCED],
  terms: [{ term: 'syllogism', also: 'two givens and a claim', means: 'An argument with two givens and a claim. Each one says how two groups meet.' }],
  practice: practiceOf('s8.l5', (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(S8_SKINS);
    // Draw the givens, a claim that follows, the trap (true in the picture, but not forced), then the card that breaks it.
    return [
      one(() => drawItem(rng, { skin: a })),
      one(() => followsItem(rng, { skin: b })),
      one(() => followsItem(rng, { skin: c, trap: true })),
      one(() => breakItem(rng, { skin: rng.pick(S8_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [NOT_FORCED] },
};

// ---------- Lesson 6: every and some, who comes first ----------

const L6: LessonDef = {
  id: 's8.l6',
  title: 'Every and some: who comes first',
  ideas: [
    {
      title: 'Every kid has a friend',
      scene: eachCardScene(),
      body: [
        'Kids are on the left. Friends are on the right. A line means two of them are friends.',
        '“Every kid has a friend” is true when each kid has at least one line. The friends can be different.',
        eachCardLine(),
      ],
    },
    {
      title: 'One friend of every kid',
      scene: sharedCardScene(),
      body: [
        '“There is one friend of every kid” says more. One friend must have a line to every kid.',
        sharedCardLine(),
        'When one friend is a friend of every kid, every kid has a friend too. It does not work the other way.',
      ],
    },
    {
      // The contrast before the boards: the same picture, the words in a new order.
      title: 'Who comes first?',
      distinction: EACH_VS_SHARED.id,
      scene: orderContrast(),
      body: ['The same words in a new order can change the meaning.', '“Every kid” first: each kid has a friend, maybe a different one. “One friend” first: one friend for all.'],
    },
    {
      title: 'Example: check the picture',
      scene: orderWorkedScene(),
      body: orderWorkedLines(),
    },
  ],
  drill: [orderBoard(2), orderTwinBoard(3)],
  distinctions: [EACH_VS_SHARED],
  practice: practiceOf('s8.l6', (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(S8_SKINS);
    // “One friend of every kid”, the trap (a different friend for each kid), which picture, then the line that makes one for all.
    return [
      one(() => orderTruthItem(rng, { skin: a, q: 'shared' })),
      one(() => orderTruthItem(rng, { skin: b, q: 'each', trap: true })),
      one(() => orderPictureItem(rng, { skin: c })),
      one(() => orderLineItem(rng, { skin: rng.pick(S8_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [EACH_NOT_SHARED] },
};

const lessons = [L1, L2, L3, L4, L5, L6];

// ---------- check, Arcade, new examples, warm-up ----------

const WHY_FAMILIES: readonly WhyFamily[] = ['some-all', 'counter', 'empty'];

/**
 * 10 items, one or two from each lesson in order, then the why item last. Conflict items: the “some” trap (every one
 * fits), an “all” sentence about an empty ring, a claim true in the picture but not forced, and “every kid has a
 * friend” with a different friend for each kid.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const [a, b, c] = rng.shuffle(S8_SKINS);
  const any = () => rng.pick(S8_SKINS);
  const fam = rng.pick(WHY_FAMILIES);
  const plan: [string, Made][] = [
    ['s8.l1', one((): Made => { const k = rng.int(0, 2); return k === 0 ? ringTapItem(rng, { skin: a }) : k === 1 ? placeItem(rng, { skin: a }) : countItem(rng, { skin: a }); })],
    ['s8.l2', one(() => (rng.chance(0.5) ? truthItem(rng, { skin: b, q: rng.pick(['all', 'none'] as const) }) : whichItem(rng, { skin: b, form: 'true' })))],
    ['s8.l2', one(() => truthItem(rng, { skin: any(), q: 'some', trap: true }))],
    ['s8.l3', one(() => oppositeItem(rng, { skin: c, of: 'all' }))],
    ['s8.l4', one(() => emptyItem(rng, { skin: any(), q: 'all' }))],
    ['s8.l5', one((): Made => { const k = rng.int(0, 2); return k === 0 ? followsItem(rng, { skin: any() }) : k === 1 ? breakItem(rng, { skin: any() }) : drawItem(rng, { skin: any() }); })],
    ['s8.l5', one(() => followsItem(rng, { skin: any(), trap: true }))],
    ['s8.l6', one(() => orderTruthItem(rng, { skin: any(), q: 'each', trap: true }))],
    ['s8.l6', one((): Made => { const k = rng.int(0, 2); return k === 0 ? orderWhichItem(rng, { skin: any() }) : k === 1 ? orderPictureItem(rng, { skin: any() }) : orderLineItem(rng, { skin: any() }); })],
    [WHY_LESSON[fam], one(() => whyItem(rng, { skin: any(), family: fam }))],
  ];
  return plan.map(([lesson, m], i) => finish(m, `s${STOP}-c${i + 1}`, lesson));
}

/** One item for the Arcade, from any lesson. */
const ARCADE: [string, (rng: Rng, skin: S8Skin) => Made][] = [
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
  ['s8.l5', (rng, skin) => drawItem(rng, { skin })],
  ['s8.l5', (rng, skin) => followsItem(rng, { skin, trap: rng.chance(0.3) })],
  ['s8.l5', (rng, skin) => breakItem(rng, { skin })],
  ['s8.l6', (rng, skin) => orderTruthItem(rng, { skin, q: rng.pick(PQS), trap: rng.chance(0.25) })],
  ['s8.l6', (rng, skin) => orderWhichItem(rng, { skin })],
  ['s8.l6', (rng, skin) => orderPictureItem(rng, { skin })],
  ['s8.l6', (rng, skin) => orderLineItem(rng, { skin })],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  return finish(make(rng, rng.pick(S8_SKINS)), `s${STOP}-arcade`, lesson);
}

const answerOf = (missed: Item) => (missed.kind === 'choose' ? missed.answer : '');
const has = (missed: Item, tag: string) => !!missed.tags?.includes(tag);

/**
 * New examples after a miss. A true-or-false question gets a pair: one true and one false, so repeating one answer never
 * passes the set. A missed trap gets the trap again, and its other side. A missed why gets another why. A missed “does
 * it follow?” gets one that follows and one that does not.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = (m: Made, lesson = missed.lesson) => finish(m, 'new', lesson);
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
    case 's8.syllogism': {
      if (missed.kind === 'tapall') return [make(drawItem(rng, { skin: skin() }))];
      if (p.includes('Which')) return [make(breakItem(rng, { skin: skin() })), make(followsItem(rng, { skin: skin(), trap: true }))];
      return [make(followsItem(rng, { skin: skin(), trap: true })), make(followsItem(rng, { skin: skin() }))];
    }
    case 's8.order': {
      if (p.includes('new line')) return [make(orderLineItem(rng, { skin: skin() })), make(orderTruthItem(rng, { skin: skin(), q: 'shared' }))];
      if (p.includes('In which picture')) return [make(orderPictureItem(rng, { skin: skin(), q: 'each' })), make(orderPictureItem(rng, { skin: skin(), q: 'shared' }))];
      if (p.includes('Sentence 1')) return [make(orderWhichItem(rng, { skin: skin(), shape: 'each' })), make(orderWhichItem(rng, { skin: skin(), shape: rng.pick(['shared', 'gap'] as const) }))];
      if (has(missed, EACH_NOT_SHARED.tag)) return [make(orderTruthItem(rng, { skin: skin(), q: 'each', trap: true })), make(orderTruthItem(rng, { skin: skin(), q: 'each', shape: 'gap' }))];
      const q = rng.pick(PQS);
      return [make(orderTruthItem(rng, { skin: skin(), q, want: true })), make(orderTruthItem(rng, { skin: skin(), q, want: false }))];
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
    's8.syllogism': 'All, Some, None: does a claim follow from two givens about groups?',
    's8.order': 'All, Some, None: “every kid has a friend” or “one friend of every kid”',
  },
};
