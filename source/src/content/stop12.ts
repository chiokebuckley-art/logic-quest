/**
 * Stop 12 · Spot the Trick (id s12; a side-track stop that opens after All, Some, None).
 * A trick (grown-ups say a fallacy) is a reason that sounds good but does not prove its claim. Its claim may still be
 * true: a claim being true is not the reason proving it (the distinction every lesson keeps).
 *
 *  l1 Flip tricks                   Stop 6’s trap moves named: the flip trick (Flip only) and the NOT trick (NOT only)
 *  l2 The middle trick, and the swap two things in one middle group; “each has one” is not “one for all”
 *  l3 Going in circles, and only two doors  the claim said again; an either-or that leaves out a third door
 *  l4 Too few, and everybody says   a few checked, a claim about all; most people say it, so it is true
 *
 * Every lesson is See -> Do -> Quiz, and every pack holds its trap: a trick whose claim happens to be true (tag
 * true-trick, which every pass rule asks for). Every answer, explanation, hint case and board mark comes from
 * ../engine/puzzles/tricks.ts and ../engine/puzzles/trickBoards.ts. The check ends with the why item (why is this a
 * trick, though its claim is true?). The warm-up is an Arguments “does it follow?” item.
 */
import { followsItem } from '../engine/puzzles/arguments';
import {
  APPLES,
  BEE_ONE,
  BEE_TWO,
  EACH_VS_ONE,
  LIGHTNING,
  PUPPIES,
  RAIN_AC,
  RAIN_DA,
  SAY_VS_TRUE,
  SPORTS,
  SUN,
  TRUE_VS_PROVES,
  TWO_VS_ALL,
  W_PUPPIES,
  circleBoard,
  circleWorkedScene,
  doorsBoard,
  doorsContrast,
  doorsWorkedScene,
  eachOneContrast,
  flipBoard,
  flipWorkedScene,
  hastyBoard,
  hastyWorkedScene,
  leakNum,
  middleBoard,
  middleWorkedScene,
  movesScene,
  notWorkedScene,
  popularWorkedScene,
  puppiesScene,
  sayBoard,
  sayTrueContrast,
  sportsTrueScene,
  sunTrueScene,
  swapBoard,
  swapScene,
  trueProvedBoard,
  trueProvedContrast,
  twoWorkedScene,
} from '../engine/puzzles/trickBoards';
import {
  FAMILY_LESSON,
  FAMILY_SKILL,
  SKINS,
  TRICK_KINDS,
  TRUE_TRICK,
  W_FASTEST,
  W_RAIN,
  againItem,
  argOfItem,
  caseItem,
  doorItem,
  enoughItem,
  falseDoors,
  caseFacts,
  mid,
  nameItem,
  proveItem,
  trueItem,
  whyItem,
  type Family,
  type Skin,
  type TrickKind,
  type TrickMade,
} from '../engine/puzzles/tricks';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';

const STOP = 12;

/** A made item as a Stop 12 item: its id, lesson and skill (`s12.<tag>`). */
const finish = (m: TrickMade, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item });

/**
 * Makes the items of one set. No two items in a set look the same: a repeat is thrown away and made again from the
 * same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => TrickMade) => TrickMade {
  const seen = new Set<string>();
  const key = (m: TrickMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}
const practiceOf = (lesson: string, make: (rng: Rng) => TrickMade[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));
const quote = (s: string) => `“${s}”`;
const PASS = { firstTry: 3, include: [TRUE_TRICK] };

// ---------- Lesson 1: flip tricks ----------

const l1: LessonDef = {
  id: 's12.l1',
  title: 'Flip tricks',
  ideas: [
    {
      title: 'A trick reason',
      body: [
        'Some reasons sound good but do not prove anything. We call them trick reasons, or tricks.',
        'A trick can even have a true claim. It just did not prove it.',
        'Grown-ups call a trick reason a fallacy.',
        'The first two tricks come from If… then.',
      ],
    },
    {
      title: 'Good moves with a rule',
      scene: movesScene(),
      body: [
        `Take the rule ${quote(W_RAIN.rule)} Say it is always true here.`,
        'Forward works. It rained, so the grass is wet.',
        'Flip and NOT works too. The grass is dry, so it did not rain.',
        'Both moves prove their claims. Two other moves do not.',
      ],
    },
    {
      // See: the flip trick, every case marked. The board right after it is its twin, flip and NOT.
      title: 'Example: the flip trick',
      scene: flipWorkedScene(),
      body: [
        'Ben says, “The grass is wet. So it rained.” That runs the rule backward.',
        `Look at the cases. Case ${leakNum(RAIN_AC)} breaks no given. It did not rain, but a sprinkler wet the grass.`,
        `The claim is false in case ${leakNum(RAIN_AC)}. So the givens do not force it.`,
        'This is the flip trick. Grown-ups call it affirming the consequent.',
      ],
    },
    {
      title: 'The NOT trick',
      scene: notWorkedScene(),
      body: [
        'Mia says, “It did not rain. So the grass is dry.”',
        'The rule only talks about rainy days. With no rain, a sprinkler can still wet the grass.',
        `That is case ${leakNum(RAIN_DA)} again. So this claim does not follow either.`,
        'This is the NOT trick. Grown-ups call it denying the antecedent.',
        'In If… then, the flip trick was Flip only. The NOT trick was NOT only.',
      ],
    },
    {
      // The contrast, then its board: true is not the same as proved.
      title: 'True is not the same as proved',
      distinction: TRUE_VS_PROVES.id,
      scene: trueProvedContrast(),
      body: [
        'A trick can land on a true claim. That does not make it a good reason.',
        'Both claims here are true. But only one reason forces its claim.',
        'So ask two things. Is the claim true? Did the reason prove it?',
      ],
    },
  ],
  drill: [flipBoard(), trueProvedBoard()],
  distinctions: [TRUE_VS_PROVES],
  terms: [
    { term: 'fallacy', also: 'a trick reason', means: 'A reason that sounds good but does not prove its claim.' },
    { term: 'affirming the consequent', also: 'the flip trick', means: 'Using an if–then rule backward. The THEN part happened, so it says the IF part did too.' },
    { term: 'denying the antecedent', also: 'the NOT trick', means: 'Saying that with no IF part, there is no THEN part. The rule never says that.' },
  ],
  practice: practiceOf('s12.l1', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(SKINS);
    // Name the move (good, flip or NOT), find the case that shows a trick, the trap, then prove it or not.
    return [
      one(() => nameItem(rng, 's12.l1', { skin: a, avoid: used })),
      one(() => caseItem(rng, 'flip', { skin: b, avoid: used })),
      one(() => trueItem(rng, 'flip', { skin: c, avoid: used })),
      one(() => proveItem(rng, 'flip', { skin: rng.pick(SKINS), avoid: used })),
    ];
  }),
  pass: PASS,
};

// ---------- Lesson 2: the middle trick, and the swap ----------

const l2: LessonDef = {
  id: 's12.l2',
  title: 'The middle trick, and the swap',
  ideas: [
    {
      // See: the middle trick, every case marked. The board right after it is its twin, which proves its claim.
      title: 'Example: the middle trick',
      scene: middleWorkedScene(),
      body: [
        'Kim says, “All bees are insects. Buzz is an insect. So Buzz is a bee.”',
        'Bees and Buzz are both in one middle group: insects. That does not put Buzz with the bees.',
        `Case ${leakNum(BEE_ONE)} breaks no given. Buzz is an insect but not a bee. Say Buzz is an ant.`,
        'In Arguments, you saw this shape does not follow. Its name is the middle trick.',
      ],
    },
    {
      title: 'Two groups in the middle',
      scene: twoWorkedScene(),
      body: [
        'The same trick works with two groups: “All bees are insects. All ants are insects. So all bees are ants.”',
        'Both groups sit inside the insect group. That does not put one group inside the other.',
        `Case ${leakNum(BEE_TWO)} shows it. Buzz is an insect, and Buzz is not an ant.`,
        'Grown-ups call this trick the undistributed middle.',
      ],
    },
    {
      title: 'The swap trick',
      scene: swapScene(),
      body: [
        '“Every kid has a favorite game” is not the same as “One game is every kid’s favorite.”',
        'In the first, each kid can pick a different game. In the second, they all pick the same one.',
        'So the first can’t prove the second. Swapping them is the swap trick.',
      ],
    },
    {
      // The contrast, then its board on the swap trick’s cases.
      title: 'Each has one, or one for all?',
      distinction: EACH_VS_ONE.id,
      scene: eachOneContrast(),
      body: ['Look at the same two kids in both panels.', 'Sentence 1 is true. Sentence 2 is false.', 'So sentence 1 can’t prove sentence 2.'],
    },
    {
      // A reminder of Lesson 1, on a middle trick whose claim is really true.
      title: 'A true claim can still be a trick',
      distinction: TRUE_VS_PROVES.id,
      scene: puppiesScene(),
      body: [
        `${quote(`${PUPPIES.givens.map((g) => g.text).join(' ')} So ${PUPPIES.claimMid}.`)} The claim is true!`,
        `But swap one word: ${quote(W_PUPPIES.twin!)} Same shape, and the claim is false.`,
        'So the shape does not force the claim. A true claim can still come from a trick.',
      ],
    },
  ],
  drill: [middleBoard(), swapBoard()],
  distinctions: [EACH_VS_ONE, { ...TRUE_VS_PROVES, taughtIn: 's12.l1' }],
  terms: [
    { term: 'middle trick', also: 'undistributed middle', means: 'Saying two things match because they share a bigger group.' },
    { term: 'swap trick', means: 'Turning “each one has its own” into “one is shared by all,” as if they meant the same.' },
  ],
  practice: practiceOf('s12.l2', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b] = rng.shuffle(SKINS);
    // Prove it or not (middle), the case that shows a swap trick, the trap, then name it.
    return [
      one(() => proveItem(rng, 'middle', { skin: a, avoid: used })),
      one(() => caseItem(rng, 'swap', { skin: b, avoid: used })),
      one(() => trueItem(rng, rng.pick<Family>(['middle', 'swap']), { skin: rng.pick(SKINS), avoid: used })),
      one(() => nameItem(rng, 's12.l2', { skin: rng.pick(SKINS), avoid: used })),
    ];
  }),
  pass: PASS,
};

// ---------- Lesson 3: going in circles, and only two doors ----------

const third = caseFacts(SPORTS, falseDoors(SPORTS)[0])[0];
const l3: LessonDef = {
  id: 's12.l3',
  title: 'Going in circles, and only two doors',
  ideas: [
    {
      title: 'Going in circles',
      body: [
        `Ivy says, ${quote(`${W_FASTEST.claim[0].replace(/\.$/, '')}, because ${mid(W_FASTEST.again[0])}.`)}`,
        'Her reason is her claim again, in new words. If you doubt the claim, you doubt the reason too.',
        'A reason like that goes in a circle. It proves nothing. We call it the circle trick.',
        'Grown-ups call it circular reasoning.',
      ],
    },
    {
      // See: the circle, both cases marked. The board right after it sorts reasons.
      title: 'Example: the claim again',
      scene: circleWorkedScene(),
      body: [
        `Look at the cases. Given 1 crosses out case 2, the only case where the claim is false.`,
        'So given 1 and the claim always match. That is how you know it is the claim again.',
        `A real reason tells you something new: ${quote(W_FASTEST.news[0])} You could check that on its own.`,
      ],
    },
    {
      title: 'Only two doors',
      scene: doorsWorkedScene(),
      body: [
        `Ivy says, ${quote(`${SPORTS.givens[0].text} ${SPORTS.givens[1].text} So ${SPORTS.claimMid}.`)}`,
        'If both givens were true, the claim would follow.',
        `But given 1 shuts out a door: ${third.replace(/\.$/, '')}. Some kids in the class really do ride bikes.`,
        'So given 1 is false, and the reason proves nothing. This is the two-doors trick. Grown-ups call it a false dilemma.',
      ],
    },
    {
      // The contrast, then its board: either-ors with and without a third door.
      title: 'Two doors, or more?',
      distinction: TWO_VS_ALL.id,
      scene: doorsContrast(),
      body: ['An either-or names two doors. It is true only if no other door is there.', 'A coin has just two sides. But kids can do many things.', 'So before you trust an either-or, look for a third door.'],
    },
    {
      // A reminder of Lesson 1, on the doors trick with a claim that is true.
      title: 'A true claim can still be a trick',
      distinction: TRUE_VS_PROVES.id,
      scene: sportsTrueScene(),
      body: ['Say Sam really does swim. The claim is true!', 'But given 1 is still false. Some kids ride bikes.', 'A false given can’t prove anything. So the reason is still a trick, even with a true claim.'],
    },
  ],
  drill: [circleBoard(), doorsBoard()],
  distinctions: [TWO_VS_ALL, { ...TRUE_VS_PROVES, taughtIn: 's12.l1' }],
  terms: [
    { term: 'circular reasoning', also: 'the circle trick', means: 'Giving the claim again, in new words, as its own reason.' },
    { term: 'false dilemma', also: 'the two-doors trick', means: 'An either-or that leaves out a choice that is really there.' },
  ],
  practice: practiceOf('s12.l3', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(SKINS);
    // Which reason says the claim again, prove it or not (doors), the trap, then the shut-out door.
    return [
      one(() => againItem(rng, { skin: a, avoid: used })),
      one(() => proveItem(rng, 'doors', { skin: b, avoid: used })),
      one(() => trueItem(rng, rng.pick<Family>(['circle', 'doors']), { skin: c, avoid: used })),
      one(() => doorItem(rng, { skin: rng.pick(SKINS), avoid: used })),
    ];
  }),
  pass: PASS,
};

// ---------- Lesson 4: too few, and everybody says ----------

const l4: LessonDef = {
  id: 's12.l4',
  title: 'Too few, and everybody says',
  ideas: [
    {
      // See: too few, every case marked. The board right after it asks how many is enough.
      title: 'Example: too few',
      scene: hastyWorkedScene(),
      body: [
        'Ava says, “I tasted 2 of the 6 apples in the bag. Both were sour. So all 6 are sour.”',
        `The other 4 apples were never tasted. Case ${leakNum(APPLES)} breaks no given: one of them is not sour.`,
        'So the claim does not follow. A few can’t prove all.',
        'This is the too-few trick. Grown-ups call it a hasty generalization.',
      ],
    },
    {
      title: 'One is enough for “some”',
      body: ['To show that all 6 apples are sour, Ava must taste all 6.', 'To show that at least one is sour, one sour apple is enough.', 'This is just like All, Some, None. “All” needs every one. “Some” needs just one.'],
    },
    {
      title: 'Everybody says',
      scene: popularWorkedScene(),
      body: [
        `Ivy says, ${quote(`${LIGHTNING.givens[0].text} So ${LIGHTNING.claimMid}.`)}`,
        `Case ${leakNum(LIGHTNING)} breaks no given: most kids say it, and it is false. Lots of people can believe something false.`,
        'In fact, tall towers get hit by lightning many times a year.',
        'This is the everybody-says trick. Grown-ups call it the appeal to popularity.',
      ],
    },
    {
      // The contrast, then its board: votes and claims about the world.
      title: 'A vote, or the facts?',
      distinction: SAY_VS_TRUE.id,
      scene: sayTrueContrast(),
      body: ['Counting people can prove some things. It proves what a group picked.', 'It can’t prove what is true about the world. Only the facts can.'],
    },
    {
      // A reminder of Lesson 1, on the everybody-says trick with a claim that is really true.
      title: 'A true claim can still be a trick',
      distinction: TRUE_VS_PROVES.id,
      scene: sunTrueScene(),
      body: [
        `${quote(`${SUN.givens[0].text} So ${SUN.claimMid}.`)} The claim is true! The sun really is a star.`,
        'But it is true because of what the sun is, not because kids say so.',
        'So the reason did not prove it. It is still a trick.',
      ],
    },
  ],
  drill: [hastyBoard(), sayBoard()],
  distinctions: [SAY_VS_TRUE, { ...TRUE_VS_PROVES, taughtIn: 's12.l1' }],
  terms: [
    { term: 'hasty generalization', also: 'the too-few trick', means: 'Checking a few things, then making a claim about all of them.' },
    { term: 'appeal to popularity', also: 'the everybody-says trick', means: 'Saying something is true because many people believe it.' },
  ],
  practice: practiceOf('s12.l4', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b] = rng.shuffle(SKINS);
    // How many is enough (or prove it, too few), prove it or not (everybody says), the trap, then why it is a trick.
    return [
      one(() => (rng.chance(0.5) ? enoughItem(rng, { skin: a, avoid: used }) : proveItem(rng, 'hasty', { skin: a, avoid: used }))),
      one(() => proveItem(rng, 'popular', { skin: b, avoid: used })),
      one(() => trueItem(rng, rng.pick<Family>(['hasty', 'popular']), { skin: rng.pick(SKINS), avoid: used })),
      one(() => whyItem(rng, { avoid: used })),
    ];
  }),
  pass: PASS,
};

const lessons = [l1, l2, l3, l4];

// ---------- check, Arcade, new examples, warm-up ----------

/** 9 items: two from each lesson, in lesson order, then the why item last (a trick whose claim is true: a conflict item). */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const skin = () => rng.pick(SKINS);
  const plan: [string, TrickMade][] = [
    ['s12.l1', one(() => (rng.chance(0.5) ? nameItem(rng, 's12.l1', { skin: skin(), avoid: used }) : proveItem(rng, 'flip', { skin: skin(), avoid: used })))],
    ['s12.l1', one(() => (rng.chance(0.5) ? caseItem(rng, 'flip', { skin: skin(), avoid: used }) : trueItem(rng, 'flip', { skin: skin(), avoid: used })))],
    ['s12.l2', one(() => proveItem(rng, rng.pick<Family>(['middle', 'swap']), { skin: skin(), avoid: used }))],
    ['s12.l2', one(() => rng.pick([() => caseItem(rng, rng.pick<Family>(['middle', 'swap']), { skin: skin(), avoid: used }), () => nameItem(rng, 's12.l2', { skin: skin(), avoid: used }), () => trueItem(rng, rng.pick<Family>(['middle', 'swap']), { skin: skin(), avoid: used })])())],
    ['s12.l3', one(() => (rng.chance(0.5) ? againItem(rng, { skin: skin(), avoid: used }) : doorItem(rng, { skin: skin(), avoid: used })))],
    ['s12.l3', one(() => (rng.chance(0.5) ? proveItem(rng, rng.pick<Family>(['circle', 'doors']), { skin: skin(), avoid: used }) : nameItem(rng, 's12.l3', { skin: skin(), avoid: used })))],
    ['s12.l4', one(() => (rng.chance(0.5) ? enoughItem(rng, { skin: skin(), avoid: used }) : proveItem(rng, 'hasty', { skin: skin(), avoid: used })))],
    ['s12.l4', one(() => (rng.chance(0.5) ? proveItem(rng, 'popular', { skin: skin(), avoid: used }) : trueItem(rng, rng.pick<Family>(['hasty', 'popular']), { skin: skin(), avoid: used })))],
    ['s12.l4', one(() => whyItem(rng, { avoid: used }))],
  ];
  return plan.map(([lesson, m], i) => finish(m, `s${STOP}-c${i + 1}`, lesson));
}

/** One item for the Arcade, from any lesson. A trap about any trick belongs to the lesson that teaches that trick. */
const ARCADE: [string, (rng: Rng) => TrickMade][] = [
  ['s12.l1', (rng) => nameItem(rng, 's12.l1', { skin: rng.pick(SKINS) })],
  ['s12.l1', (rng) => proveItem(rng, 'flip', { skin: rng.pick(SKINS) })],
  ['s12.l1', (rng) => caseItem(rng, 'flip', { skin: rng.pick(SKINS) })],
  ['s12.l2', (rng) => proveItem(rng, rng.pick<Family>(['middle', 'swap']), { skin: rng.pick(SKINS) })],
  ['s12.l2', (rng) => nameItem(rng, 's12.l2', { skin: rng.pick(SKINS) })],
  ['s12.l3', (rng) => againItem(rng)],
  ['s12.l3', (rng) => proveItem(rng, rng.pick<Family>(['circle', 'doors']), { skin: rng.pick(SKINS) })],
  ['s12.l3', (rng) => doorItem(rng)],
  ['s12.l4', (rng) => enoughItem(rng)],
  ['s12.l4', (rng) => proveItem(rng, rng.pick<Family>(['hasty', 'popular']), { skin: rng.pick(SKINS) })],
  ['trap', (rng) => trueItem(rng, rng.pick<Family>(['flip', 'middle', 'swap', 'circle', 'doors', 'hasty', 'popular']))],
  ['s12.l4', (rng) => whyItem(rng)],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  const m = make(rng);
  return finish(m, `s${STOP}-arcade`, lesson === 'trap' ? FAMILY_LESSON[m.arg.family] : lesson);
}

const SKILL_FAMILY: Record<string, Family> = Object.fromEntries((Object.entries(FAMILY_SKILL) as [Family, string][]).map(([f, tag]) => [`s${STOP}.${tag}`, f]));
const choiceIds = (it: Item) => (it.kind === 'choose' ? it.choices.map((c) => c.id) : []);

/**
 * New examples after a miss, on another topic in the same skin. A missed “does it prove it?”, name, trap or why gets a
 * pair (a trick and a good reason, or two tricks), so repeating one answer never passes the set.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = (m: TrickMade) => finish(m, 'new', missed.lesson);
  const was = argOfItem(missed);
  const avoid = new Set(was ? [was.topic] : []);
  const skin: Skin | undefined = was?.skin;
  const ids = choiceIds(missed);
  const answer = missed.kind === 'choose' ? missed.answer : '';
  if (missed.skill === `s${STOP}.why`) {
    const kinds = rng.shuffle(TRICK_KINDS.filter((k) => k !== answer));
    return [make(whyItem(rng, { kind: answer as TrickKind, avoid })), make(whyItem(rng, { kind: kinds[0], avoid }))];
  }
  const f = SKILL_FAMILY[missed.skill];
  if (!f) return [];
  if (ids.includes('forces')) return [make(trueItem(rng, f, { skin, avoid })), make(trueItem(rng, f, { skin, avoid, good: true }))];
  if (ids.includes('false')) {
    const trick = answer === 'trick';
    return [make(proveItem(rng, f, { skin, avoid, want: trick ? 'trick' : 'good' })), make(proveItem(rng, f, { skin, avoid, want: trick ? 'good' : 'trick' }))];
  }
  if (ids.includes('proves')) return [make(nameItem(rng, missed.lesson, { skin, avoid, family: f, want: 'trick' })), make(nameItem(rng, missed.lesson, { skin, avoid, family: f, want: 'good' }))];
  if (ids.includes('again')) return [make(againItem(rng, { avoid }))];
  if (ids[0]?.startsWith('r')) return [make(enoughItem(rng, { claim: 'all', avoid })), make(enoughItem(rng, { claim: 'some', avoid }))];
  if (missed.prompt.includes('shut out')) return [make(doorItem(rng, { skin, avoid }))];
  return [make(caseItem(rng, f, { skin, avoid }))];
}

/**
 * The warm-up: an Arguments “does it follow?” item (must, might or can’t), made by ../engine/puzzles/arguments.ts. It is
 * finished as a Stop 12 item, because a side-track stop’s warm-up belongs to it or to the stop it opens after.
 */
function bridge(rng: Rng): Item {
  const m = followsItem(rng, { skin: rng.pick(['everyday', 'fantasy'] as const), target: rng.pick(['must', 'might', 'cant'] as const) });
  return { id: `s${STOP}-warm`, stop: STOP, lesson: 's12.l1', skill: `s${STOP}.follows`, ...m.item } as Item;
}

export const stop12: StopDef = {
  n: STOP,
  id: 's12',
  title: 'Spot the Trick',
  idea: 'A reason can sound good and still not prove anything.',
  ready: true,
  sideTrack: true,
  requires: ['s8'],
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  bridgeFrom: 's18',
  skillNames: {
    's12.flip': 'Spot the Trick: the flip and NOT tricks with an if–then rule',
    's12.middle': 'Spot the Trick: the middle trick (sharing a group is not a match)',
    's12.swap': 'Spot the Trick: the swap trick (each has one is not one for all)',
    's12.circle': 'Spot the Trick: a reason that just says the claim again',
    's12.dilemma': 'Spot the Trick: only two doors when there are more',
    's12.hasty': 'Spot the Trick: too few checked to be sure about all',
    's12.popular': 'Spot the Trick: most people saying it does not make it true',
    's12.why': 'Spot the Trick: why a reason is a trick, even with a true claim',
    's12.follows': 'Spot the Trick warm-up: does the claim follow? (from Arguments)',
  },
};
