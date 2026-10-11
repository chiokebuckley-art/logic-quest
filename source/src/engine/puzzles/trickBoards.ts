/**
 * Stop 12 · Spot the Trick: the See and Do pieces. The worked examples’ pictures, the contrast pictures that teach each
 * distinction, and the guided boards. Every mark is worked out from the cases in ./tricks.ts; none is written by hand.
 *
 *  - Lesson 1: the flip trick worked on the rain and the grass; its board is the flip-and-NOT twin (a good move). Then
 *    true is not the same as proved (contrast and board: three claims, true or not, proved or not).
 *  - Lesson 2: the middle trick worked on Buzz the bug; its board is the twin that proves. Then each has one vs one for
 *    all (contrast, and a board on the swap trick’s cases).
 *  - Lesson 3: going in circles worked on Max; its board sorts reasons (the claim again, or something new). Then two
 *    doors vs every door (contrast, and a board of either-ors: a third door? true?).
 *  - Lesson 4: too few worked on Ava’s apples; its board asks which reasons prove all, or some. Then what most people
 *    say vs what is true (contrast, and a board of votes and claims about the world).
 */
import type { BoardWords, ConfusedQuestion, ContrastPanel, Distinction, DrillOption, DrillRow, DrillStep, Misconception, Scene } from '../types';
import {
  CASE_CLOSING,
  CASES_LEFT_Q,
  FAMILY_Q,
  TRUE_PROVED_Q,
  W_APPLES,
  W_BEE,
  W_BEE_ANT,
  W_COIN,
  W_FASTEST,
  W_RAIN,
  W_SPORTS,
  W_SUN,
  W_SWAP,
  W_VOTE,
  allCases,
  argScene,
  breaks,
  caseFacts,
  caseIndex,
  caseMid,
  caseName,
  caseRow,
  caseRowId,
  circleArg,
  claimIn,
  doorArg,
  enoughProves,
  falseDoors,
  flipArg,
  hastyArg,
  leakCase,
  mid,
  oneArg,
  popularArg,
  provesOf,
  reasonsOf,
  saysAgain,
  statusReason,
  swapArg,
  twoArg,
  voteArg,
  type Arg,
  type Case,
  type DoorTopic,
  type MiddleTwoTopic,
  type PopularTopic,
  type VoteTopic,
} from './tricks';

// ---------- distinctions ----------

/** Every lesson: a claim being true is not the reason proving it. Taught in Lesson 1, reminded in 2 to 4. */
export const TRUE_VS_PROVES: Distinction = { id: 'true-vs-proves', a: 'The claim is true.', b: 'The reason proves the claim: it forces it.' };
/** Lesson 2: each one has its own vs one shared by all (the swap trick). */
export const EACH_VS_ONE: Distinction = { id: 'each-vs-one', a: 'Each one has its own: every kid has a favorite game.', b: 'One for all: one game is every kid’s favorite.' };
/** Lesson 3: the two doors an either-or names vs every door that is really there. */
export const TWO_VS_ALL: Distinction = { id: 'two-vs-all', a: 'The two doors an either-or names.', b: 'Every door that is really there.' };
/** Lesson 4: what most people say or pick vs what is really true. */
export const SAY_VS_TRUE: Distinction = { id: 'say-vs-true', a: 'What most people say or pick.', b: 'What is really true.' };

/** Where each lesson’s cards sit (0-based): the worked example and the contrast. Boards open after them. */
export const L1_CARDS = { example: 2, not: 3, contrast: 4 } as const;
export const L2_CARDS = { example: 0, two: 1, swap: 2, contrast: 3, reminder: 4 } as const;
export const L3_CARDS = { circle: 0, example: 1, doors: 2, contrast: 3, reminder: 4 } as const;
export const L4_CARDS = { example: 0, some: 1, popular: 2, contrast: 3, reminder: 4 } as const;

// ---------- more worked topics (cards and boards only, never a quiz) ----------

/** Lesson 2’s reminder: the middle trick with a claim that is really true. */
export const W_PUPPIES: MiddleTwoTopic = {
  id: 'w-puppies',
  skin: 'everyday',
  speaker: 'Kim',
  setting: 'Kim talks about her new puppy.',
  allA: 'All puppies are animals.',
  allB: 'All dogs are animals.',
  claim: 'All puppies are dogs.',
  picture: 'Each case is about one puppy, called Pip.',
  m: ['Pip is an animal.', 'Pip is not an animal.'],
  b: ['Pip is a dog.', 'Pip is not a dog.'],
  other: 'The givens alone allow it.',
  twin: 'All puppies are animals. All cats are animals. So all puppies are cats.',
  truth: true,
};
/** Lesson 4: everybody says, and it is false. */
export const W_LIGHTNING: PopularTopic = {
  id: 'w-lightning',
  skin: 'everyday',
  speaker: 'Ivy',
  setting: 'Ivy’s camp group sees a storm far away.',
  crowd: 'Most kids at camp',
  x: ['Lightning never strikes the same place twice.', 'Lightning can strike the same place twice.'],
  check: 'Tall towers get hit by lightning many times a year.',
  truth: false,
};
/** Lesson 4’s board: a second vote. */
export const W_SHIRTS: VoteTopic = { id: 'w-shirts', skin: 'everyday', speaker: 'Gus', setting: 'Gus’s team picks a shirt color.', voted: ['Most of the team picked blue.', 'Most of the team did not pick blue.'], rule: 'The team wears the color with the most picks.', go: ['The team wears blue.', 'The team does not wear blue.'] };

// ---------- board pieces ----------

const YES_NO: DrillOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const yn = (v: boolean) => (v ? 'yes' : 'no');
export const VERDICT_OPTIONS: DrillOption[] = [{ id: 'proves', label: 'Proves it' }, { id: 'trick', label: 'A trick' }];
export const CASE_STEPS = ['Picture every case.', 'Cross out each case that breaks a given.', 'Look at the claim in each case left.', 'Proves it, or a trick?'];
const CASE_WORDS: BoardWords = { closing: CASE_CLOSING };
const caseId = caseRowId;

/** The last row of a case board: proves it, or a trick? */
export function verdictRow(arg: Arg): DrillRow {
  const proves = provesOf(arg);
  const leak = leakCase(arg);
  const why: Record<string, string> = proves
    ? { trick: 'The claim is true in every case left. So the givens force it. It is proved.' }
    : { proves: `${caseName(arg, leak!)} is left, and the claim is false there. So the givens do not force the claim.` };
  return { id: 'verdict', label: 'So, does the reason prove the claim?', marks: [{ id: 'verdict', label: 'Proves it, or a trick?', options: VERDICT_OPTIONS, answer: proves ? 'proves' : 'trick', why }] };
}

const OUT_STILL_COUNTS =
  'You may be treating every case and the cases left as the same thing. They are two different things. A case that breaks a given is crossed out. It can’t happen if the givens are true, so it does not count.';
const SOME_AS_EVERY =
  'You may be treating “true in one case left” and “true in every case left” as the same thing. They are two different things. A reason proves a claim only if the claim is true in every case left.';

/** The mix-ups a case board can catch, most specific first. */
export function caseMisconceptions(arg: Arg): Misconception[] {
  const out: Misconception[] = [];
  for (const c of allCases(arg)) if (breaks(arg, c) >= 0) out.push({ id: 'out-counts', when: 'picks', picks: { [caseId(arg, c)]: claimIn(arg, c) ? 'yes' : 'no' }, text: OUT_STILL_COUNTS });
  if (!provesOf(arg)) out.push({ id: 'some-as-every', when: 'picks', picks: { verdict: 'proves' }, text: SOME_AS_EVERY });
  return out;
}

/** A case board: every case, then proves it or a trick. */
function caseBoard(arg: Arg, o: { id: string; title: string; body: string[]; scene: Scene; twin?: string; afterCard: number; done: string; confused: ConfusedQuestion[]; distinction?: string }): DrillStep {
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: o.scene,
    ...(o.twin ? { twin: o.twin } : {}),
    afterCard: o.afterCard,
    rows: [...allCases(arg).map((c) => caseRow(arg, c)), verdictRow(arg)],
    scaffold: 'full',
    steps: CASE_STEPS,
    misconceptions: caseMisconceptions(arg),
    confused: o.confused,
    words: CASE_WORDS,
    ...(o.distinction ? { distinction: o.distinction } : {}),
    done: o.done,
  };
}

// ---------- Lesson 1: flip tricks ----------

export const RAIN_AC = flipArg(W_RAIN, 'ac');
export const RAIN_DA = flipArg(W_RAIN, 'da');
export const RAIN_MP = flipArg(W_RAIN, 'mp');
export const RAIN_MT = flipArg(W_RAIN, 'mt');
const leakNum = (arg: Arg) => caseIndex(arg, leakCase(arg)!) + 1;

/** Card 2: the flip trick, every case marked. */
export const flipWorkedScene = () => argScene(RAIN_AC, { cases: 'marked', caption: `${statusReason(RAIN_AC, false)} So it is a trick.` });
/** Card 3: the NOT trick, every case marked. */
export const notWorkedScene = () => argScene(RAIN_DA, { cases: 'marked', caption: `${statusReason(RAIN_DA, false)} So it is a trick too.` });
/** Card 1: the two good moves, as lines. */
export const movesScene = (): Scene => ({
  kind: 'text',
  lines: [`Rule: ${W_RAIN.rule}`, `Forward: ${RAIN_MP.givens[1].text} So ${RAIN_MP.claimMid}.`, `Flip and NOT: ${RAIN_MT.givens[1].text} So ${RAIN_MT.claimMid}.`],
});

/** Do, right after the worked flip trick: its twin, flip and NOT (a good move). Mark every case, then the verdict. */
export function flipBoard(): DrillStep {
  const arg = RAIN_MT;
  return caseBoard(arg, {
    id: 's12.l1-do',
    title: 'Check each case',
    body: ['The same rule, but a new fact and a new claim: the grass is dry, so it did not rain.', 'Cross out each case that breaks a given. For each case left, is the claim true?', 'Then say: does the reason prove the claim, or is it a trick?'],
    scene: argScene(arg, { cases: 'blank' }),
    twin: 'Given 2 and the claim changed. Now the grass is dry.',
    afterCard: L1_CARDS.example,
    confused: [CASES_LEFT_Q, FAMILY_Q.flip],
    done: `Right. ${statusReason(arg, false)} So flip and NOT proves the claim. It is not a trick.`,
  });
}

/** The three claims of the true-or-proved board: an argument and the case its story ends on. */
export const TP_ROWS: readonly { arg: Arg; real: Case }[] = [
  { arg: RAIN_MP, real: { p: 'yes', q: 'yes' } },
  { arg: RAIN_AC, real: { p: 'yes', q: 'yes' } },
  { arg: RAIN_AC, real: { p: 'no', q: 'yes' } },
];

/** Card 4: the same rule, two claims that are both true; only one is proved. */
export function trueProvedContrast(): Extract<Scene, { kind: 'contrast' }> {
  const [good, trick] = [TP_ROWS[0], TP_ROWS[1]];
  const panel = (who: string, row: { arg: Arg; real: Case }, because: string, then: string): ContrastPanel => ({
    world: row.arg.givens.map((g) => g.text).join(' '),
    who,
    says: row.arg.claim.text,
    truth: provesOf(row.arg),
    because,
    then,
  });
  if (!claimIn(good.arg, good.real) || !claimIn(trick.arg, trick.real)) throw new Error('trueProvedContrast: both claims are true');
  return {
    kind: 'contrast',
    pairs: [
      panel('Ava', good, `${statusReason(good.arg, false)} The givens force the claim.`, 'The grass really is wet. True, and proved.'),
      panel('Ben', trick, `${caseName(trick.arg, leakCase(trick.arg)!)} is left, and the claim is false there. A sprinkler could have wet the grass.`, 'It really did rain. True, but not proved.'),
    ],
    ask: { q: 'Both claims are true. Did both reasons prove them?', a: 'No. Only Ava’s reason forces her claim. Ben’s claim just happens to be true.' },
    words: { worldTag: 'The reason', saysWord: 'claims:', truth: 'Proved', untruth: 'Not proved' },
  };
}

const TRUE_AS_PROVED =
  'You may be treating “the claim is true” and “the reason proved it” as the same thing. They are two different things. A trick can land on a true claim. Ask: is there a case left where the claim is false?';
const TP_CLOSING = 'Those two ideas are apart now. First ask if the claim is true. Then, on its own, ask if the reason forces it.';

/** Do, right after the contrast: for each claim, is it true in the story, and did the reason prove it? */
export function trueProvedBoard(): DrillStep {
  const rows: DrillRow[] = TP_ROWS.map(({ arg, real }, k): DrillRow => {
    const id = `r${k + 1}`;
    const t = claimIn(arg, real);
    const proves = provesOf(arg);
    const leak = leakCase(arg);
    return {
      id,
      label: `${arg.givens[1].text} So ${arg.claimMid}. Later you see: ${caseMid(arg, real)}.`,
      marks: [
        { id: `${id}-true`, label: 'Is the claim true?', options: YES_NO, answer: yn(t), why: { [yn(!t)]: `The claim says “${arg.claim.text}” Later you see: ${caseMid(arg, real)}. So the claim is ${t ? 'true' : 'false'}.` } },
        {
          id: `${id}-proves`,
          label: 'Did the reason prove it?',
          options: YES_NO,
          answer: yn(proves),
          why: proves
            ? { no: `${statusReason(arg)} So the reason forces the claim.` }
            : { yes: `Picture ${caseName(arg, leak!).toLowerCase()}: ${caseMid(arg, leak!)}. Both givens are true there, and the claim is false. So the reason does not force it.` },
          compare: { says: arg.claim.text, world: arg.givens.map((g) => g.text).join(' ') },
        },
      ],
    };
  });
  const misconceptions: Misconception[] = TP_ROWS.flatMap(({ arg, real }, k) =>
    claimIn(arg, real) && !provesOf(arg) ? [{ id: 'true-as-proved', when: 'picks' as const, picks: { [`r${k + 1}-true`]: 'yes', [`r${k + 1}-proves`]: 'yes' }, text: TRUE_AS_PROVED }] : [],
  );
  return {
    id: 's12.l1-do-true',
    title: 'True, or proved?',
    body: ['Each claim uses the rain rule. First, say if the claim turned out true.', 'Then say if the reason proved it. Picture the cases to check.'],
    scene: trueProvedContrast(),
    afterCard: L1_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { says: 'Claim', world: 'Reason', so: 'So', ask: 'Does the reason force the claim?', closing: TP_CLOSING },
    misconceptions,
    confused: [TRUE_PROVED_Q, CASES_LEFT_Q],
    distinction: TRUE_VS_PROVES.id,
    done: 'Right. The last two claims have the same reason. One turned out true and one false, but neither was proved.',
  };
}

// ---------- Lesson 2: the middle trick, and the swap ----------

export const BEE_ONE = oneArg(W_BEE);
export const BEE_GOOD = oneArg(W_BEE, true);
export const BEE_TWO = twoArg(W_BEE_ANT);
export const SWAP = swapArg(W_SWAP);
export const PUPPIES = twoArg(W_PUPPIES);

export const middleWorkedScene = () => argScene(BEE_ONE, { cases: 'marked', caption: `${statusReason(BEE_ONE, false)} So it is a trick.` });
export const twoWorkedScene = () => argScene(BEE_TWO, { cases: 'marked', caption: `${statusReason(BEE_TWO, false)} So it is a trick.` });
export const swapScene = () => argScene(SWAP, { cases: 'blank' });
export const puppiesScene = () => argScene(PUPPIES, { real: true });

/** Do, right after the worked middle trick: its twin (given 2 and the claim swapped), which proves its claim. */
export function middleBoard(): DrillStep {
  const arg = BEE_GOOD;
  return caseBoard(arg, {
    id: 's12.l2-do',
    title: 'Check each case',
    body: ['Given 2 and the claim swapped places. Now it says Buzz is a bee.', 'Cross out each case that breaks a given. For each case left, is the claim true?', 'Then say: does the reason prove the claim, or is it a trick?'],
    scene: argScene(arg, { cases: 'blank' }),
    twin: 'Given 2 and the claim swapped places.',
    afterCard: L2_CARDS.example,
    confused: [CASES_LEFT_Q, FAMILY_Q.middle],
    done: `Right. ${statusReason(arg, false)} So this one proves its claim. Every bee is an insect, and Buzz is a bee.`,
  });
}

/** Card 3: the same two kids, Ava with tag and Ben with chess. “Every kid has a favorite” is true; “one game for all” is false. */
export function eachOneContrast(): Extract<Scene, { kind: 'contrast' }> {
  const world: Case = { s0: 'i0', s1: 'i1' };
  const each = SWAP.givens[0], one = SWAP.claim;
  const facts = caseFacts(SWAP, world).join(' ');
  return {
    kind: 'contrast',
    pairs: [
      { world: facts, who: 'Sentence 1', says: each.text, truth: each.holds(world), because: 'Ava has a favorite, and so does Ben. So every kid has one.' },
      { world: facts, who: 'Sentence 2', says: one.text, truth: one.holds(world), because: 'Tag is only Ava’s favorite. Chess is only Ben’s. No one game is both kids’ favorite.' },
    ],
    ask: { q: 'Same kids, same games. Why is one sentence true and one false?', a: 'Each kid has a favorite, but not the same one. “Each has one” is not “one for all.”' },
    words: { worldTag: 'The kids', truth: 'True', untruth: 'False' },
  };
}

const EACH_AS_ONE =
  'You may be treating “every kid has a favorite” and “one game is every kid’s favorite” as the same thing. They are two different things. When the kids pick different games, every kid still has one, but no game is shared.';

/** Do, right after the contrast: the swap trick’s cases. Is “one game for all” true in each? Then the verdict. */
export function swapBoard(): DrillStep {
  const arg = SWAP;
  const board = caseBoard(arg, {
    id: 's12.l2-do-swap',
    title: 'Each has one, or one for all?',
    body: ['Given 1 is true in every case: each kid always has a favorite.', 'For each case, is the claim true? Is one game every kid’s favorite?', 'Then say: does given 1 prove the claim, or is it a trick?'],
    scene: swapScene(),
    afterCard: L2_CARDS.contrast,
    confused: [FAMILY_Q.swap, TRUE_PROVED_Q],
    distinction: EACH_VS_ONE.id,
    done: `Right. ${statusReason(arg, false)} Each kid has a favorite in every case. But one game for all only in some. So it is a trick.`,
  });
  // Marking “one for all” true where the kids picked different games.
  const mixed = allCases(arg).filter((c) => !claimIn(arg, c));
  board.misconceptions = [...mixed.map((c) => ({ id: 'each-as-one', when: 'picks' as const, picks: { [caseId(arg, c)]: 'yes' }, text: EACH_AS_ONE })), ...(board.misconceptions ?? [])];
  board.words = { ...CASE_WORDS, closing: 'Those two ideas are apart now. Each kid having a favorite is not one game for all.' };
  return board;
}

// ---------- Lesson 3: going in circles, and only two doors ----------

export const FASTEST = circleArg(W_FASTEST);
export const SPORTS = doorArg(W_SPORTS);
export const COIN = doorArg(W_COIN);

export const circleWorkedScene = () => argScene(FASTEST, { cases: 'marked', caption: 'Given 1 is true in just the case where the claim is true. They mean the same thing.' });
export const doorsWorkedScene = () => {
  const third = falseDoors(SPORTS)[0];
  return argScene(SPORTS, { cases: 'marked', caption: `${caseName(SPORTS, third)} can really happen: some kids ride bikes. So given 1 is false.` });
};
export const sportsTrueScene = () => argScene(SPORTS, { real: true });

const AGAIN_OPTIONS: DrillOption[] = [{ id: 'again', label: 'The claim again' }, { id: 'new', label: 'Something new' }];
const CIRCLE_CLOSING = 'Those two ideas are apart now. A reason must tell you something new, not the claim again.';
const NEW_AS_AGAIN =
  'You may be treating “about the same thing” and “the claim again” as the same thing. They are two different things. A reason can be about Max and still tell you something new that you could check.';

/** Do, right after the worked circle: sort four reasons for “Max is the fastest”: the claim again, or something new? */
export function circleBoard(): DrillStep {
  const reasons = reasonsOf(W_FASTEST);
  const order = [reasons[0], reasons[2], reasons[1], reasons[3]];
  const rows: DrillRow[] = order.map((r, k): DrillRow => {
    const id = `reason${k + 1}`;
    const again = saysAgain(r);
    return {
      id,
      label: `Reason: ${r.text}`,
      marks: [
        {
          id,
          label: 'The claim again, or something new?',
          options: AGAIN_OPTIONS,
          answer: again ? 'again' : 'new',
          why: again
            ? { new: `It means the same as “${W_FASTEST.claim[0]}” It is the claim in new words. If you doubt the claim, you doubt this too.` }
            : { again: 'It says something new. You could check it without knowing who is fastest. It is about Max, but it is not the claim again.' },
          compare: { says: r.text, world: W_FASTEST.claim[0] },
        },
      ],
    };
  });
  return {
    id: 's12.l3-do',
    title: 'The claim again, or something new?',
    body: [`The claim is “${W_FASTEST.claim[0]}”`, 'For each reason, ask: does it say the claim again, in new words? Or does it tell you something new?'],
    scene: circleWorkedScene(),
    afterCard: L3_CARDS.example,
    rows,
    scaffold: 'full',
    words: { says: 'Reason', world: 'Claim', so: 'So', ask: 'Does the reason mean the same as the claim?', closing: CIRCLE_CLOSING },
    misconceptions: rows.filter((_, k) => !saysAgain(order[k])).map((r) => ({ id: 'new-as-again', when: 'picks' as const, picks: { [r.id]: 'again' }, text: NEW_AS_AGAIN })),
    confused: [FAMILY_Q.circle, TRUE_PROVED_Q],
    done: 'Right. Two reasons just say the claim again. The other two tell you something new.',
  };
}

/** The either-ors of the doors board: what is really there, the either-or, and its doors. */
export interface DoorRow {
  id: string;
  /** What is really there, in one sentence. */
  there: string;
  topic: DoorTopic;
}
export const DOOR_ROWS: readonly DoorRow[] = [
  { id: 'coin', there: 'A coin has two sides: heads and tails.', topic: W_COIN },
  { id: 'sports', there: 'Kids in the class play soccer, swim or ride bikes.', topic: W_SPORTS },
  { id: 'cafe', there: 'The café sells sandwiches, soup and salad.', topic: { id: 'w-cafe', skin: 'everyday', speaker: 'Leo', setting: 'Leo eats at the café.', doors: ['Leo has a sandwich.', 'Leo has soup.', 'Leo has a salad.'], either: 'Every lunch at the café is a sandwich or soup.', notA: 'Leo does not have a sandwich.' } },
  { id: 'hall', there: 'Each light in the hall has just two states: on and off.', topic: { id: 'w-hall', skin: 'everyday', speaker: 'Ana', setting: 'Ana walks down the hall.', doors: ['The hall light is on.', 'The hall light is off.'], either: 'Each light in the hall is on or off.', notA: 'The hall light is not on.' } },
];

/** Card 3: an either-or with only two doors (the coin) next to one that leaves a door out (the sports). */
export function doorsContrast(): Extract<Scene, { kind: 'contrast' }> {
  const [coin, sports] = [DOOR_ROWS[0], DOOR_ROWS[1]];
  const truth = (r: DoorRow) => falseDoors(doorArg(r.topic)).length === 0;
  return {
    kind: 'contrast',
    pairs: [
      { world: coin.there, who: 'The either-or', says: coin.topic.either, truth: truth(coin), because: 'There are only two doors. The either-or leaves none out.' },
      { world: sports.there, who: 'The either-or', says: sports.topic.either, truth: truth(sports), because: 'Riding bikes is a third door. The either-or leaves it out.' },
    ],
    ask: { q: 'Both are either-or sentences. Are both true?', a: 'No. Only the coin has just two doors. Before you trust an either-or, look for a third door.' },
    words: { worldTag: 'What is there', truth: 'True', untruth: 'False' },
  };
}

const NAMED_AS_ALL =
  'You may be treating “the two doors it names” and “every door there is” as the same thing. They are two different things. An either-or is true only when no other door is there. Look at what is really there.';
const DOORS_CLOSING = 'Those two ideas are apart now. Read what is really there, then check if the either-or leaves a door out.';

/** Do, right after the contrast: for each either-or, is there a third door? So, is the either-or true? */
export function doorsBoard(): DrillStep {
  const rows: DrillRow[] = DOOR_ROWS.map((r): DrillRow => {
    const arg = doorArg(r.topic);
    const third = falseDoors(arg);
    const has = third.length > 0;
    return {
      id: r.id,
      label: `${r.there} Either-or: ${r.topic.either}`,
      marks: [
        {
          id: `${r.id}-third`,
          label: 'Is there a third door?',
          options: YES_NO,
          answer: yn(has),
          why: has ? { no: `This can happen too: ${mid(caseFacts(arg, third[0])[0])}. That is a third door.` } : { yes: 'What is there has just these two doors. There is no third one.' },
        },
        {
          id: `${r.id}-true`,
          label: 'So, is the either-or true?',
          options: YES_NO,
          answer: yn(!has),
          why: has ? { yes: 'It leaves out a door that is really there. So it is false.' } : { no: 'It names every door there is. So it is true.' },
          compare: { says: r.topic.either, world: r.there },
        },
      ],
    };
  });
  return {
    id: 's12.l3-do-doors',
    title: 'Two doors, or more?',
    body: ['Each row says what is really there, then gives an either-or.', 'Is there a third door? Then say if the either-or is true.'],
    scene: doorsContrast(),
    afterCard: L3_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { says: 'Either-or', world: 'What is there', so: 'So', ask: 'Does the either-or leave a door out?', closing: DOORS_CLOSING },
    misconceptions: rows.filter((r) => r.marks[0].answer === 'yes').map((r) => ({ id: 'named-as-all', when: 'picks' as const, picks: { [`${r.id}-true`]: 'yes' }, text: NAMED_AS_ALL })),
    confused: [FAMILY_Q.doors, TRUE_PROVED_Q],
    distinction: TWO_VS_ALL.id,
    done: 'Right. An either-or is true only when it names every door there is.',
  };
}

// ---------- Lesson 4: too few, and everybody says ----------

export const APPLES = hastyArg(W_APPLES);
export const LIGHTNING = popularArg(W_LIGHTNING);
export const SUN = popularArg(W_SUN);
export const FARM = voteArg(W_VOTE);
export const SHIRTS = voteArg(W_SHIRTS);

export const hastyWorkedScene = () => argScene(APPLES, { cases: 'marked', caption: `${statusReason(APPLES, false)} So it is a trick.` });
export const popularWorkedScene = () => argScene(LIGHTNING, { cases: 'marked', caption: `${statusReason(LIGHTNING, false)} So it is a trick.` });
export const sunTrueScene = () => argScene(SUN, { real: true });

/** The reasons on the too-few board: how many Ava tasted, and the claim (all, or at least one). */
export const ENOUGH_ROWS: readonly { m: number; claim: 'all' | 'some' }[] = [
  { m: W_APPLES.k, claim: 'all' },
  { m: W_APPLES.n - 1, claim: 'all' },
  { m: W_APPLES.n, claim: 'all' },
  { m: 1, claim: 'some' },
];
const FEW_AS_ALL =
  'You may be treating “almost all” and “all” as the same thing. They are two different things. One apple not tasted could still be sweet. To be sure about all of them, check all of them.';

/** Do, right after the worked example: does each reason prove its claim? A few, almost all, all; and one for “some”. */
export function hastyBoard(): DrillStep {
  const t = W_APPLES;
  const rows: DrillRow[] = ENOUGH_ROWS.map(({ m, claim }, k): DrillRow => {
    const id = `r${k + 1}`;
    const proves = enoughProves(t.n, { m, fits: true }, claim);
    const claimText = claim === 'all' ? `all ${t.n} are sour` : 'at least one is sour';
    const tasted = m === t.n ? `Ava tasted all ${t.n}, and all were sour.` : m === 1 ? 'Ava tasted 1, and it was sour.' : m === 2 ? 'Ava tasted 2, and both were sour.' : `Ava tasted ${m}, and all ${m} were sour.`;
    return {
      id,
      label: `${tasted} Claim: ${claimText}.`,
      marks: [
        {
          id,
          label: 'Does it prove the claim?',
          options: YES_NO,
          answer: yn(proves),
          why: proves
            ? { no: claim === 'all' ? 'Every apple was tasted, and every one was sour. None is left to be different.' : 'One sour apple is enough to show that at least one is sour.' }
            : { yes: `${t.n - m === 1 ? 'One apple was' : `${t.n - m} apples were`} never tasted. One could be sweet. So the claim is not forced.` },
        },
      ],
    };
  });
  return {
    id: 's12.l4-do',
    title: 'How many is enough?',
    body: ['Same bag of 6 apples. Now Ava tastes a different number.', 'For each reason, does it prove its claim?'],
    scene: hastyWorkedScene(),
    twin: 'The same bag of apples, but Ava tastes a different number.',
    afterCard: L4_CARDS.example,
    rows,
    scaffold: 'full',
    misconceptions: rows.filter((r) => r.marks[0].answer === 'no' && r.id !== 'r1').map((r) => ({ id: 'few-as-all', when: 'picks' as const, picks: { [r.id]: 'yes' }, text: FEW_AS_ALL })),
    confused: [FAMILY_Q.hasty, TRUE_PROVED_Q],
    words: { closing: 'Those two ideas are apart now. To be sure about all of them, check all of them.' },
    done: 'Right. Only tasting all 6 proves all 6 are sour. But one sour apple is enough for “at least one.”',
  };
}

/** Card 3: a vote that proves what the class picked, next to a crowd that can’t prove a fact. */
export function sayTrueContrast(): Extract<Scene, { kind: 'contrast' }> {
  return {
    kind: 'contrast',
    pairs: [
      { world: FARM.givens.map((g) => g.text).join(' '), who: 'The claim', says: FARM.claim.text, truth: provesOf(FARM), because: 'The vote decides the trip. So the claim must be true.' },
      { world: LIGHTNING.givens[0].text, who: 'The claim', says: LIGHTNING.claim.text, truth: provesOf(LIGHTNING), because: `Saying it does not make it so. ${W_LIGHTNING.check}` },
    ],
    ask: { q: 'Both reasons count what most people say. Why does only one prove its claim?', a: 'A vote proves what people picked. It can’t prove what is true about the world.' },
    words: { worldTag: 'The reason', truth: 'Proved', untruth: 'Not proved' },
  };
}

/**
 * The rows of the say-or-true board: each argument, and whether its claim is about what people picked. That comes from
 * the argument's shape: a vote (with its rule) decides a pick; a crowd saying something is a claim about the world.
 */
export const SAY_ROWS: readonly { id: string; arg: Arg; aboutPick: boolean }[] = (
  [
    ['farm', FARM],
    ['lightning', LIGHTNING],
    ['sun', SUN],
    ['shirts', SHIRTS],
  ] as const
).map(([id, arg]) => ({ id, arg, aboutPick: arg.shape === 'vote' }));
const SAY_AS_TRUE =
  'You may be treating “most people say it” and “it is true” as the same thing. They are two different things. A crowd can be right or wrong. To know a fact, you check the facts.';

/** Do, right after the contrast: is the claim about what people picked? Does the reason prove it? */
export function sayBoard(): DrillStep {
  const rows: DrillRow[] = SAY_ROWS.map(({ id, arg, aboutPick }): DrillRow => {
    const proves = provesOf(arg);
    const leak = leakCase(arg);
    return {
      id,
      label: `${arg.givens.map((g) => g.text).join(' ')} So ${arg.claimMid}.`,
      marks: [
        { id: `${id}-about`, label: 'Is the claim about what people picked?', options: YES_NO, answer: yn(aboutPick), why: { [yn(!aboutPick)]: aboutPick ? 'The claim is about what the group picked. The rule says the vote decides it.' : 'The claim is about the world, not about a vote. People can’t vote a fact true.' } },
        {
          id: `${id}-proves`,
          label: 'Does the reason prove it?',
          options: YES_NO,
          answer: yn(proves),
          why: proves
            ? { no: `${statusReason(arg)} So the reason forces the claim.` }
            : { yes: `Picture ${caseName(arg, leak!).toLowerCase()}: ${caseMid(arg, leak!)}. The given is true there, and the claim is false.` },
          compare: { says: arg.claim.text, world: arg.givens.map((g) => g.text).join(' ') },
        },
      ],
    };
  });
  return {
    id: 's12.l4-do-say',
    title: 'A vote, or the facts?',
    body: ['Each reason counts what most people say or pick.', 'Is the claim about what people picked? Then say if the reason proves it.'],
    scene: sayTrueContrast(),
    afterCard: L4_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { says: 'Claim', world: 'Reason', so: 'So', ask: 'Does the reason force the claim?', closing: 'Those two ideas are apart now. A vote proves what people picked, not what is true.' },
    misconceptions: SAY_ROWS.filter((r) => !r.aboutPick).map((r) => ({ id: 'say-as-true', when: 'picks' as const, picks: { [`${r.id}-proves`]: 'yes' }, text: SAY_AS_TRUE })),
    confused: [FAMILY_Q.popular, TRUE_PROVED_Q],
    distinction: SAY_VS_TRUE.id,
    done: 'Right. Both votes prove what the group picked. The other two are tricks, even though the sun really is a star.',
  };
}

export { leakNum };
