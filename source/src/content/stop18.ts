/**
 * Stop 2 · Arguments (id s18, n 18; shown as Stop 2 on the Journey).
 * An argument is some givens and a claim. The claim follows (valid) when the givens force it: it is true in every
 * case the givens leave. The argument is solid (sound) when it follows and every given is really true.
 *
 *  l1 Givens and the claim       tap every given, find the claim; trap: the claim comes first (“must”)
 *  l2 Does it follow?            must, might or can’t, from the cases; trap: a true claim the givens do not force
 *  l3 Follows, even when silly   made-up words follow by their shape; same shape with plain words; trap: it sounds right
 *  l4 Solid arguments            follows but a given is false; true but it does not follow; why it follows
 *
 * Kid words first (given, claim, follows, solid); each grown-up word (argument, premise, conclusion, valid, sound) is
 * named once, on the card that introduces it, and in the lesson’s terms. Every lesson is See -> Do -> Quiz, and every
 * answer, explanation, hint case and board mark comes from ../engine/puzzles/arguments.ts. The check ends with the why
 * item. The warm-up (bridge) is a Stop 1 card question: true, false or can’t tell.
 *
 * Every rule family a quiz can ask (given 1’s “All” or “No”, what given 2 says, and the verdict) is seen on a card and
 * done on a board in its lesson first. Lessons 2 and 3 each end their cards with two family cards: given 2 says “not”,
 * and given 1 says “No”. Each shows its argument marked case by case, then works its flipped claim (Lesson 2: must turns
 * into can’t) and its swap (given 2 and the claim swapped: might be true or false) in words. A board after each card has
 * the learner mark the same arguments in new words (Juno the hen; Nox and the daxes).
 */
import {
  CASES,
  CLAIM_FIRST,
  DOT,
  FALSE_GIVEN,
  GIVEN_VS_TRUE,
  GLORP,
  GLORP_TWIN,
  PIP,
  PIP_FLIP,
  PIP_NO,
  PIP_NO_FLIP,
  PIP_NO_SWAP,
  PIP_NOT,
  PIP_NOT_FLIP,
  PIP_NOT_SWAP,
  GLORP_NO,
  GLORP_NO_SWAP,
  GLORP_NOT,
  GLORP_NOT_SWAP,
  PLACE_VS_JOB,
  RAIN,
  RAIN_STORY,
  REX_ANIMAL,
  SOUNDS_RIGHT,
  SUN_BROKEN,
  TRUE_NOT_FORCED,
  TRUE_VS_FOLLOWS,
  argScene,
  argText,
  believableItem,
  breakLines,
  breaks,
  casesLeft,
  casesScene,
  claimIn,
  claimText,
  claimItem,
  daxNoBoard,
  daxNotBoard,
  flipBoard,
  followSay,
  followsBoard,
  followsItem,
  followsWorkedScene,
  formItem,
  fourCases,
  givenTexts,
  givenTrueBoard,
  givenTrueContrast,
  givensItem,
  glorpBoard,
  glorpNoScene,
  glorpNotScene,
  glorpScene,
  glorpWorkedScene,
  noBoard,
  noBroken,
  notBoard,
  pipNoScene,
  pipNotScene,
  placeBoard,
  placeContrast,
  rexScene,
  rolesBoard,
  shapeBoard,
  solidItem,
  statusReason,
  statusSay,
  storyScene,
  sunBoard,
  sunWorkedScene,
  topicOfItem,
  trueFollowsBoard,
  trueFollowsContrast,
  twinItem,
  whyItem,
  type Arg,
  type ArgMade,
  type SolidWant,
  type Status,
  type Story,
} from '../engine/puzzles/arguments';
import { rowItem } from '../engine/puzzles/statements';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';
import { L2_TEMPLATES } from './stop1';

const STOP = 18;
type StorySkin = 'everyday' | 'fantasy';
const SKINS: readonly StorySkin[] = ['everyday', 'fantasy'];

/** A made item as a Stop 2 item: its id, lesson and skill (`s18.<tag>`). */
const finish = (m: ArgMade, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set look the same: a repeat is thrown away and made again from the
 * same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => ArgMade) => ArgMade {
  const seen = new Set<string>();
  const key = (m: ArgMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

const practiceOf = (lesson: string, make: (rng: Rng) => ArgMade[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));
const quote = (s: string) => `“${s}”`;
const outCases = (arg: Arg) => CASES.filter((c) => breaks(arg, c) >= 0).map((c) => String(CASES.indexOf(c) + 1));
const listAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// ---------- Lesson 1: givens and the claim ----------

const storyLine = (s: Story, role: 'given' | 'claim' | 'other', k = 0) => s.lines.filter((l) => l.role === role)[k].text;

const l1: LessonDef = {
  id: 's18.l1',
  title: 'Givens and the claim',
  ideas: [
    {
      title: 'An argument: givens and a claim',
      scene: argScene(RAIN),
      body: [
        'In logic, an argument is not a fight. It is some givens and a claim.',
        `The claim is what the argument wants to show. Here it is ${quote(claimText(RAIN))} Grown-ups call the claim the conclusion.`,
        'The givens are the reasons for it. You take them as true for now. Grown-ups call a given a premise.',
      ],
    },
    {
      title: 'Signpost words',
      body: [
        'Some words show a sentence’s job. We call them signpost words.',
        '“So,” “that means” and “must” point to the claim.',
        '“Because” and “since” point to a given.',
        'A given must be a statement: true or false. A question, a command or an opinion is never a given.',
      ],
    },
    {
      // The contrast before any story to mark: the same claim, last in one story and first in the other.
      title: 'The claim can come first',
      distinction: PLACE_VS_JOB.id,
      scene: placeContrast(),
      body: [
        'The claim is not always the last sentence.',
        'These two stories have the same givens and the same claim, in a new order.',
        'In the second story, “must” points to the claim. It comes first.',
      ],
    },
    {
      title: 'Example: find the jobs',
      scene: storyScene(RAIN_STORY),
      body: [
        `${quote(storyLine(RAIN_STORY, 'given', 0))} and ${quote(storyLine(RAIN_STORY, 'given', 1))} are givens. They are the reasons.`,
        `“So” points to the claim: ${quote(storyLine(RAIN_STORY, 'claim'))}`,
        `${quote(storyLine(RAIN_STORY, 'other'))} is a command. It is not true or false, so it is not a given.`,
      ],
    },
  ],
  drill: [placeBoard(), rolesBoard()],
  distinctions: [PLACE_VS_JOB],
  terms: [
    { term: 'argument', means: 'Some givens and a claim. The givens are the reasons for the claim.' },
    { term: 'premise', also: 'a given', means: 'A statement an argument starts from. You take it as true for now.' },
    { term: 'conclusion', also: 'the claim', means: 'The sentence the givens are meant to show.' },
  ],
  practice: practiceOf('s18.l1', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b] = rng.shuffle(SKINS);
    // Tap the givens, find the claim, then the trap (the claim comes first), then the givens again in the other skin.
    return [
      one(() => givensItem(rng, { skin: a, avoid: used })),
      one(() => claimItem(rng, { skin: b, avoid: used })),
      one(() => (rng.chance(0.5) ? claimItem : givensItem)(rng, { skin: rng.pick(SKINS), avoid: used, claimFirst: true })),
      one(() => givensItem(rng, { skin: b, avoid: used })),
    ];
  }),
  pass: { firstTry: 3, include: [CLAIM_FIRST] },
};

// ---------- Lesson 2: does it follow? ----------

const l2: LessonDef = {
  id: 's18.l2',
  title: 'Does it follow?',
  ideas: [
    {
      title: 'Does the claim follow?',
      body: [
        'Say every given is true. Does the claim have to be true too?',
        'If it does, the claim follows from the givens. The givens force it.',
        'Grown-ups call an argument like that valid.',
      ],
    },
    {
      title: 'Every case',
      scene: casesScene(),
      body: ['A case is one way things could be.', fourCases(PIP), 'Each box is one case.'],
    },
    {
      title: 'Cross out, then look',
      body: [
        'Cross out each case that breaks a given. It can’t happen if the givens are true.',
        'Then look at the claim in the cases left.',
        'True in every case left: the claim must be true. It follows.',
        'True in some cases left, and false in others: it might be true or false. You can’t tell, so it does not follow.',
        'False in every case left: the claim can’t be true.',
      ],
    },
    {
      title: 'True is not the same as follows',
      distinction: TRUE_VS_FOLLOWS.id,
      scene: trueFollowsContrast(),
      body: [
        'A claim can be true and still not follow.',
        'Pip really is a bird. In the first argument, the givens force it.',
        'In the second, they don’t. Pip could be a toy with feathers.',
      ],
    },
    {
      title: 'Example: Pip has feathers',
      scene: followsWorkedScene(),
      body: [
        `Given 1 is ${quote(givenTexts(PIP)[0])} Given 2 is ${quote(givenTexts(PIP)[1])}`,
        `Cases ${listAnd(outCases(PIP))} each break a given, so cross them out.`,
        `${statusReason(PIP, false)} So the claim must be true. It follows.`,
      ],
    },
    {
      // A family card: given 2 says “not”. Its claim flipped (can’t be true), the first Pip claim flipped, and its swap.
      title: 'Given 2 can say “not”',
      scene: pipNotScene(),
      body: [
        `Here given 2 says “not.” ${breakLines(PIP_NOT)}`,
        `${statusReason(PIP_NOT, false)} ${statusSay(PIP_NOT)}`,
        `Flip the claim to its opposite: ${quote(claimText(PIP_NOT_FLIP))} ${statusReason(PIP_NOT_FLIP, false)} ${statusSay(PIP_NOT_FLIP)}`,
        `Flip the first Pip example too: ${quote(argText(PIP_FLIP))} ${statusReason(PIP_FLIP, false)} ${statusSay(PIP_FLIP)}`,
        `Swap given 2 and the claim: ${quote(argText(PIP_NOT_SWAP))} ${statusReason(PIP_NOT_SWAP, false)} ${statusSay(PIP_NOT_SWAP)}`,
      ],
    },
    {
      // A family card: given 1 says “No”. Its claim flipped (can’t be true), and its swap.
      title: 'Given 1 can say “No”',
      scene: pipNoScene(),
      body: [
        `A given can start with “No.” ${noBroken(PIP_NO)}`,
        `${breakLines(PIP_NO)} ${statusReason(PIP_NO, false)} ${statusSay(PIP_NO)}`,
        `Flip the claim to its opposite: ${quote(claimText(PIP_NO_FLIP))} ${statusReason(PIP_NO_FLIP, false)} ${statusSay(PIP_NO_FLIP)}`,
        `Swap given 2 and the claim: ${quote(argText(PIP_NO_SWAP))} ${statusReason(PIP_NO_SWAP, false)} ${statusSay(PIP_NO_SWAP)}`,
      ],
    },
  ],
  drill: [trueFollowsBoard(), followsBoard(), notBoard(), flipBoard(), noBoard()],
  distinctions: [TRUE_VS_FOLLOWS],
  terms: [
    { term: 'valid', also: 'follows', means: 'An argument is valid when the givens force the claim. If every given is true, the claim must be true.' },
    { term: 'case', means: 'One way things could be. To check an argument, you look at every case.' },
  ],
  practice: practiceOf('s18.l2', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b] = rng.shuffle(SKINS);
    // A must, a can’t, then the trap (true in the story, but not forced), then one more must or might.
    return [
      one(() => followsItem(rng, { skin: a, target: 'must', avoid: used })),
      one(() => followsItem(rng, { skin: b, target: 'cant', avoid: used })),
      one(() => followsItem(rng, { skin: rng.pick(SKINS), trap: true, avoid: used })),
      one(() => followsItem(rng, { skin: rng.pick(SKINS), target: rng.pick(['must', 'might'] as const), avoid: used })),
    ];
  }),
  pass: { firstTry: 3, include: [TRUE_NOT_FORCED] },
};

// ---------- Lesson 3: follows, even when silly ----------

const rexLeak = casesLeft(REX_ANIMAL).find((c) => !claimIn(REX_ANIMAL, c))!;

const l3: LessonDef = {
  id: 's18.l3',
  title: 'Follows, even when silly',
  ideas: [
    {
      title: 'Made-up words',
      scene: glorpScene(),
      body: [
        'Look at this argument. Nobody knows what a glorp is!',
        'But say both givens are true. Then Zed is a glorp, and every glorp is blue. So Zed must be blue.',
        'The claim follows. The shape of the argument does the work, not the words. Grown-ups call the shape the form.',
      ],
    },
    {
      title: 'Example: check the cases',
      scene: glorpWorkedScene(),
      body: [
        'Check the cases, just like before. You don’t need to know what a glorp is.',
        `Cases ${listAnd(outCases(GLORP))} each break a given. ${statusReason(GLORP, false)}`,
        'So it follows.',
      ],
    },
    {
      title: 'Same shape, plain words',
      scene: argScene(DOT),
      body: [
        'Now swap the words. Put “ladybug” where “glorp” is. Put “has spots” where “is blue” is.',
        `You get ${quote(argText(DOT))}`,
        'It has the same shape, so it follows too. Same shape, same answer.',
      ],
    },
    {
      // A reminder of Lesson 2: a claim that sounds true is not a claim that follows.
      title: 'Sounding right is not following',
      distinction: TRUE_VS_FOLLOWS.id,
      scene: rexScene(),
      body: [
        `Now look at this one: ${quote(argText(REX_ANIMAL))}`,
        'Every sentence sounds fine. Rex may even be a cat! But Rex could be a dog. A dog is an animal too.',
        `That is case ${CASES.indexOf(rexLeak) + 1}. The givens do not force the claim, so it does not follow.`,
      ],
    },
    {
      title: 'Swap the words back',
      scene: glorpScene(),
      body: [
        'To check a shape, swap the words back to the made-up ones.',
        `The Rex argument becomes ${quote(argText(GLORP_TWIN))}`,
        'That is not the glorp argument. Given 2 and the claim swapped places. So it has a different shape.',
      ],
    },
    {
      // A family card: given 2 says “not”, with made-up words, and its swap.
      title: 'Glorps with “not”',
      scene: glorpNotScene(),
      body: [
        'Given 2 can say “not” with made-up words too. You still don’t need to know what a glorp is.',
        `${breakLines(GLORP_NOT)} ${statusReason(GLORP_NOT, false)} ${followSay(GLORP_NOT)}`,
        `Swap given 2 and the claim: ${quote(argText(GLORP_NOT_SWAP))} ${statusReason(GLORP_NOT_SWAP, false)} ${followSay(GLORP_NOT_SWAP)}`,
      ],
    },
    {
      // A family card: given 1 says “No”, with made-up words, and its swap.
      title: 'Glorps with “No”',
      scene: glorpNoScene(),
      body: [
        `Given 1 can start with “No.” ${noBroken(GLORP_NO)}`,
        `${breakLines(GLORP_NO)} ${statusReason(GLORP_NO, false)} ${followSay(GLORP_NO)}`,
        `Swap given 2 and the claim: ${quote(argText(GLORP_NO_SWAP))} ${statusReason(GLORP_NO_SWAP, false)} ${followSay(GLORP_NO_SWAP)}`,
      ],
    },
  ],
  drill: [glorpBoard(), shapeBoard(), daxNotBoard(), daxNoBoard()],
  distinctions: [{ ...TRUE_VS_FOLLOWS, taughtIn: 's18.l2' }],
  terms: [{ term: 'shape', also: 'form', means: 'The pattern of an argument. Swap its words, and the shape stays the same.' }],
  practice: practiceOf('s18.l3', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const first = rng.chance(0.5);
    // Made-up words that follow (or not), the same-shape question, the trap (it sounds right), then the other answer.
    return [
      one(() => formItem(rng, { follows: first })),
      one(() => twinItem(rng, { avoid: used })),
      one(() => believableItem(rng, { avoid: used })),
      one(() => formItem(rng, { follows: !first })),
    ];
  }),
  pass: { firstTry: 3, include: [SOUNDS_RIGHT] },
};

// ---------- Lesson 4: solid arguments ----------

const sunLeak = casesLeft(SUN_BROKEN).find((c) => !claimIn(SUN_BROKEN, c))!;

const l4: LessonDef = {
  id: 's18.l4',
  title: 'Solid arguments',
  ideas: [
    {
      title: 'Two checks',
      body: [
        'An argument can follow and still have a false claim. How? One of its givens can be false.',
        'An argument is solid when it follows and every given is really true.',
        'Grown-ups call a solid argument sound.',
        'The claim of a solid argument is always true.',
      ],
    },
    {
      title: 'Given is not the same as true',
      distinction: GIVEN_VS_TRUE.id,
      scene: givenTrueContrast(),
      body: [
        'Being given does not make a sentence true.',
        'Both arguments have the same shape, so both follow.',
        'But a penguin can’t fly. So given 1 of the second one is false. It is not solid.',
      ],
    },
    {
      // A reminder of Lesson 2 on a real argument: every sentence is true, and still it does not follow.
      title: 'Example: true, but it does not follow',
      distinction: TRUE_VS_FOLLOWS.id,
      scene: sunWorkedScene(),
      body: [
        'Every sentence here is true. The sun really is a star.',
        `But case ${CASES.indexOf(sunLeak) + 1} is left, and the claim is false there. The givens do not force the claim.`,
        'So it does not follow. And if it does not follow, it is not solid.',
      ],
    },
    {
      title: 'Why does it follow?',
      body: [
        'Why does an argument follow? Because its givens force the claim.',
        'It is never because the claim is true, or because it sounds right.',
        'To check an argument, ask two questions. Does it follow? Is every given really true?',
      ],
    },
  ],
  drill: [givenTrueBoard(), sunBoard()],
  distinctions: [GIVEN_VS_TRUE, { ...TRUE_VS_FOLLOWS, taughtIn: 's18.l2' }],
  terms: [{ term: 'sound', also: 'solid', means: 'An argument is sound when it is valid and every given is really true.' }],
  practice: practiceOf('s18.l4', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    // Solid, the trap (a false given, still follows), the conflict (every sentence true, but it does not follow), then
    // both whys: why one follows (made-up or story words) and why a true one does not.
    return [
      one(() => solidItem(rng, { want: 'solid', avoid: used })),
      one(() => solidItem(rng, { want: 'false-given', avoid: used })),
      one(() => solidItem(rng, { want: 'true-claim', avoid: used })),
      one(() => whyItem(rng, { follows: true, avoid: used })),
      one(() => whyItem(rng, { follows: false, avoid: used })),
    ];
  }),
  pass: { firstTry: 3, include: [FALSE_GIVEN] },
};

const lessons = [l1, l2, l3, l4];

// ---------- check, Arcade, new examples, warm-up ----------

/**
 * 9 items: two from each lesson, in lesson order, then the why item last. The second Lesson 2 item (a true claim the
 * givens do not force) and the first Lesson 4 item (every sentence true, but it does not follow) are conflict items.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const [a, b] = rng.shuffle(SKINS);
  const plan: [string, ArgMade][] = [
    ['s18.l1', one(() => givensItem(rng, { skin: a, avoid: used }))],
    ['s18.l1', one(() => claimItem(rng, { skin: b, avoid: used, claimFirst: rng.chance(0.5) }))],
    ['s18.l2', one(() => followsItem(rng, { skin: rng.pick(SKINS), target: rng.pick(['must', 'cant'] as const), avoid: used }))],
    ['s18.l2', one(() => followsItem(rng, { skin: rng.pick(SKINS), trap: true, avoid: used }))],
    ['s18.l3', one(() => formItem(rng))],
    ['s18.l3', one(() => (rng.chance(0.5) ? twinItem(rng, { avoid: used }) : believableItem(rng, { avoid: used })))],
    ['s18.l4', one(() => solidItem(rng, { want: 'true-claim', avoid: used }))],
    ['s18.l4', one(() => solidItem(rng, { want: rng.pick(['false-given', 'solid'] as const), avoid: used }))],
    ['s18.l4', one(() => whyItem(rng, { avoid: used }))],
  ];
  return plan.map(([lesson, m], i) => finish(m, `s${STOP}-c${i + 1}`, lesson));
}

/** One item for the Arcade, from any lesson. */
const ARCADE: [string, (rng: Rng) => ArgMade][] = [
  ['s18.l1', (rng) => givensItem(rng, { skin: rng.pick(SKINS), claimFirst: rng.chance(0.3) })],
  ['s18.l1', (rng) => claimItem(rng, { skin: rng.pick(SKINS), claimFirst: rng.chance(0.4) })],
  ['s18.l2', (rng) => followsItem(rng, { skin: rng.pick(SKINS), trap: rng.chance(0.3) })],
  ['s18.l3', (rng) => formItem(rng)],
  ['s18.l3', (rng) => twinItem(rng)],
  ['s18.l3', (rng) => believableItem(rng, { follows: rng.chance(0.3) })],
  ['s18.l4', (rng) => solidItem(rng, { want: rng.pick(['solid', 'false-given', 'true-claim', 'not'] as const) })],
  ['s18.l4', (rng) => whyItem(rng)],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  return finish(make(rng), `s${STOP}-arcade`, lesson);
}

/** The topic the missed item is about, so a new example uses another one. */
const avoidOf = (missed: Item) => new Set([topicOfItem(missed)?.id ?? '']);
const answerOf = (missed: Item) => (missed.kind === 'choose' ? missed.answer : '');
const skinOf = (missed: Item): StorySkin => (topicOfItem(missed)?.skin === 'fantasy' ? 'fantasy' : 'everyday');

/**
 * New examples after a miss. A missed claim, status, follows or solid question gets a pair: one with the same answer
 * and one with another, so repeating one answer never passes the set. A missed why gets both kinds of why.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = (m: ArgMade) => finish(m, 'new', missed.lesson);
  const avoid = avoidOf(missed);
  const skin = skinOf(missed);
  switch (missed.skill) {
    case 's18.given':
      return [make(givensItem(rng, { skin, avoid, claimFirst: !!missed.tags?.includes(CLAIM_FIRST.tag) }))];
    case 's18.claim':
      return [make(claimItem(rng, { skin, avoid, claimFirst: true })), make(claimItem(rng, { skin, avoid }))];
    case 's18.follows': {
      const was = answerOf(missed) as Status;
      const other: Status = was === 'might' ? rng.pick(['must', 'cant'] as const) : 'might';
      const same = followsItem(rng, { skin, avoid, target: was, trap: was === 'might' && !!missed.conflict });
      return [make(same), make(followsItem(rng, { skin, avoid, target: other }))];
    }
    case 's18.form': {
      if (missed.prompt.includes('same shape')) return [make(twinItem(rng, { avoid }))];
      const f = answerOf(missed) === 'follows';
      if (missed.prompt.startsWith('Every sentence here sounds right')) return [make(believableItem(rng, { follows: f, avoid })), make(believableItem(rng, { follows: !f, avoid }))];
      return [make(formItem(rng, { follows: f })), make(formItem(rng, { follows: !f }))];
    }
    case 's18.sound': {
      const want: Record<string, SolidWant> = { solid: 'solid', unsound: 'false-given', not: 'not' };
      const was = answerOf(missed);
      const other = was === 'unsound' ? rng.pick(['solid', 'not'] as const) : 'unsound';
      return [make(solidItem(rng, { want: want[was] ?? 'not', avoid })), make(solidItem(rng, { want: want[other], avoid }))];
    }
    case 's18.why': {
      const f = answerOf(missed) === 'force';
      return [make(whyItem(rng, { follows: f, avoid })), make(whyItem(rng, { follows: !f, avoid }))];
    }
  }
  return [];
}

/** The warm-up: a Stop 1 card question about one sentence (true, false or can’t tell). It never counts for this stop. */
function bridge(rng: Rng): Item {
  const m = rowItem(rng, { frame: rng.pick(['everyday', 'fantasy'] as const), target: rng.pick(['true', 'false', 'cant'] as const), templates: L2_TEMPLATES });
  return { id: `s${STOP}-warm`, stop: 1, lesson: 's1.l2', skill: `s1.${m.tag}`, ...m.item };
}

export const stop18: StopDef = {
  n: STOP,
  id: 's18',
  title: 'Arguments',
  idea: 'A claim follows from its givens when they force it, true or not.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  skillNames: {
    's18.given': 'Arguments: find the givens',
    's18.claim': 'Arguments: find the claim, wherever it sits',
    's18.follows': 'Arguments: must, might or can’t (does the claim follow?)',
    's18.form': 'Arguments: the shape decides, even with made-up words',
    's18.sound': 'Arguments: solid means it follows and every given is true',
    's18.why': 'Arguments: why an argument follows, or does not',
  },
};
