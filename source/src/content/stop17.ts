/**
 * Pattern Observatory, Ring 4: Proof Lantern (Track 4, Evidence and uncertainty). Places:
 *
 *  l1 Proved or a guess?    (L2, needs s15.l2 or the counterexample primer; Stop 7 Lesson 1 is recommended on a card)
 *                           circle regions 1, 2, 4, 8, 16, the guess 32, the drawing's 31, the hexagon's 30; sort a
 *                           claim as proved, a good guess or false; a fair coin has no memory; a few faster days
 *  l2 Break it or test it   (L3, needs l1) counterexamples, a test that tells two rules apart, a finding that rules a
 *                           claim out, a test that tells two reasons apart, and the sampling item (test “tails is due”
 *                           by listing every way the flips can go)
 *  l3 Why it must continue  (L4, needs l2) start at 1 and add 3: odd and even take turns because adding an odd number
 *                           flips them; the reason chain; listed terms alone do not explain it
 *
 * Every place runs See (stepped lantern pictures) → Explain → Do (a faded item, then the same task with no frame) →
 * Transfer → Review. Every answer, verdict and picture comes from ../engine/puzzles/observatory/proof.ts and
 * lantern.ts. A 31-region label appears only on a drawing with no three chords meeting (acceptance check 9).
 */
import { looks } from '../engine/fresh';
import {
  CIRCLE_STATED, COUNTS, FAMILIES, GUESS, HEX, L1, L2, L3, MOST6, STATUSES, STATUS_WORD, STOP, WORKED,
  applyRule, buildScene, chainItem, circleItem, claimLine, claimText, coinItem, counterItem, guessScene, hexScene, jumpsItem,
  list, mustContinueItem, nextAfterStreak, par, parityItem, reasonSteps, reasonsTestItem, roleOf, roleRow, ruleOutItem, ruleText,
  rulesOut, separateItem, seqText, statusFeedback, statusItem, statusOf, statusReason, termOf, termsOf, timesItem, whyContinueItem,
  whyCounterItem, whyGuessItem, type ClaimModel, type FamilyId, type MRule,
} from '../engine/puzzles/observatory/proof';
import type { LanternClaim, LanternRow, LanternScene, LanternStatus } from '../engine/scenes/lantern';
import type { DrillMark, DrillStep, IdeaCard, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ids = (items: Item[], prefix: string): Item[] => items.map((it, i) => ({ ...it, id: `${prefix}${i + 1}` }));

/** Makes a set of items where no two look the same: a repeat is made again from the same rng. */
function distinct(makers: (() => Item)[]): Item[] {
  const seen = new Set<string>();
  return makers.map((make) => {
    let it = make();
    for (let i = 0; i < 60 && seen.has(looks(it)); i++) it = make();
    seen.add(looks(it));
    return it;
  });
}

/** Mark a set's items as a delayed review (the routine strip lights all six moves). */
const asReview = (items: Item[]): Item[] => items.map((it) => ({ ...it, phase: 'review', ...(it.meta ? { meta: { ...it.meta, phase: 'review' as const } } : {}) }));

const fb = (f: { headline: string; detail: string[] }) => [f.headline, ...f.detail].join(' ');
const lanternCard = (s: Omit<LanternScene, 'kind' | 'points' | 'chords'>): LanternScene => ({ kind: 'lantern', points: 0, chords: false, ...s });

// =====================================================================================================================
// l1 · Proved or a guess?
// =====================================================================================================================

const BUILD_SCENE = buildScene();
const GUESS_SCENE = guessScene();
const HEX_SCENE = hexScene();

/** The contrast: the same numbers and the same claim, told by a rule or only seen. */
const ODD_RULE: ClaimModel = { source: 'rule', start: 1, step: 2, shown: termsOf(1, 2, 4), prop: { t: 'odd' }, seen: 0 };
const ODD_SEEN: ClaimModel = { ...ODD_RULE, source: 'seen', start: 0, step: 0 };
const CONTRAST: Scene = {
  kind: 'contrast',
  pairs: [
    {
      world: `Told: ${ruleText(ODD_RULE.start, ODD_RULE.step)}.`,
      who: 'Claim',
      says: 'Every number is odd.',
      truth: statusOf(ODD_RULE) === 'proved',
      because: 'Odd plus 2 is odd, at every step. A reason covers every case.',
      then: 'Proved: it must stay odd.',
    },
    {
      world: `Seen on a scoreboard: ${list(ODD_SEEN.shown)}. No rule was given.`,
      who: 'Claim',
      says: 'Every number is odd.',
      truth: statusOf(ODD_SEEN) === 'proved',
      because: 'Four numbers fit. Nothing says the next one must.',
      then: 'A good guess: it fits so far, but it is not sure.',
    },
  ],
  ask: { q: 'Did the numbers change?', a: 'No. Only what we know about how they were made changed.' },
  words: { worldTag: 'What we know', saysWord: 'says:', truth: STATUS_WORD.proved, untruth: STATUS_WORD.tentative },
};

/** The three kinds of claim, each checked in turn (the worked claims, verdicts from statusOf). */
const SORT_SCENE: LanternScene = (() => {
  const order: LanternStatus[] = ['proved', 'tentative', 'false'];
  const claims = (upTo: number): LanternClaim[] => order.map((s, i) => ({ text: claimLine(WORKED[s]), ...(i < upTo ? { status: statusOf(WORKED[s])! } : {}) }));
  return lanternCard({
    claims: claims(0),
    steps: order.map((s, i) => ({ label: `Check claim ${i + 1}`, say: statusReason(WORKED[s]) })),
    frames: order.map((_, i) => ({ claims: claims(i + 1) })),
  });
})();

const COIN_SCENE: LanternScene = lanternCard({
  stated: 'A fair coin. Each flip is new.',
  rows: [{ label: 'So far', cells: Array.from({ length: 5 }, () => 'heads') }],
  claim: 'Tails is due next.',
  status: 'false',
});

const L1_IDEAS: IdeaCard[] = [
  {
    title: 'Join every pair of points',
    scene: BUILD_SCENE,
    body: [
      'Put points on a circle. Join every pair with a straight line, called a chord.',
      'The chords cut the circle into parts, called regions. Count them.',
      'Tap to add one point at a time.',
    ],
  },
  {
    title: 'The lantern makes a guess',
    scene: GUESS_SCENE,
    body: [
      `The counts so far are ${list(COUNTS.slice(0, 5))}. Each one is double the one before.`,
      `So the lantern guesses ${GUESS} for 6 points. That guess comes from examples, not from a reason.`,
      'Tap to make the guess. Then check it with a drawing.',
    ],
  },
  {
    title: 'The most needs no three chords meeting',
    scene: HEX_SCENE,
    body: [
      `${MOST6} is the most regions 6 points can make. It needs one thing: no three chords meet at one point.`,
      'Now space the same 6 points evenly. Watch the middle.',
    ],
  },
  {
    title: 'Proved, or a good guess?',
    distinction: 'proved-vs-guess',
    scene: CONTRAST,
    body: [
      'The same numbers can be proved in one place and only a good guess in another.',
      'What decides it is what we know. Is there a stated rule with a reason for every case? Or only what was seen?',
    ],
  },
  {
    title: 'Three kinds of claim',
    scene: SORT_SCENE,
    body: [
      'Sort a claim with two checks.',
      'Does a case break it? Then it is false.',
      'If not, does a stated rule give a reason for every case? Then it is proved. If not, it is a good guess.',
    ],
  },
  {
    title: 'Each try is new',
    scene: COIN_SCENE,
    body: [
      'A fair coin has two sides with the same chance: 1 in 2.',
      'After 5 heads in a row, tails is not due. The coin has no memory, so each flip is new.',
      'A few good days work the same way. They are examples, not a proof that things will stay that way.',
      'Want more on good guesses? Visit Stop 7, Pattern guesses.',
    ],
  },
];

/** A verdict mark for a claim: its options, the computed answer, and the words for each wrong option. */
function verdictMark(id: string, m: ClaimModel, options: LanternStatus[], compare = false): DrillMark {
  const answer = statusOf(m)!;
  return {
    id,
    label: 'This claim is',
    options: options.map((s) => ({ id: s, label: STATUS_WORD[s] })),
    answer,
    why: Object.fromEntries(options.filter((s) => s !== answer).map((s) => [s, fb(statusFeedback(m, s))])),
    ...(compare ? { compare: { says: claimText(m), world: m.source === 'rule' ? `Told: ${ruleText(m.start, m.step)}.` : `Seen: ${list(m.shown)}. No rule was given.` } } : {}),
  };
}

const BOARD_A_CLAIMS: ClaimModel[] = [
  { source: 'rule', start: 5, step: 2, shown: termsOf(5, 2, 4), prop: { t: 'odd' }, seen: 0 },
  { source: 'seen', start: 0, step: 0, shown: [5, 7, 9, 11], prop: { t: 'odd' }, seen: 1 },
  { source: 'rule', start: 4, step: 10, shown: termsOf(4, 10, 4), prop: { t: 'even' }, seen: 0 },
  { source: 'seen', start: 0, step: 0, shown: [12, 14, 16, 18], prop: { t: 'even' }, seen: 3 },
];

const L1_BOARD_A: DrillStep = {
  id: `${L1}-do`,
  title: 'Proved, or a good guess?',
  body: ['Each row has a claim and what we know about it.', 'Mark each claim: Proved, or A good guess.', 'Ask: is a rule stated, with a reason for every case?'],
  scene: CONTRAST,
  afterCard: 3,
  distinction: 'proved-vs-guess',
  scaffold: 'full',
  rows: BOARD_A_CLAIMS.map((m, i) => ({ id: `a${i + 1}`, label: claimLine(m), marks: [verdictMark(`a${i + 1}-v`, m, ['proved', 'tentative'], true)] })),
  words: { says: 'Claim', world: 'We know', so: 'Ask', ask: 'Does a reason cover every case?', closing: 'A stated rule with a reason is a proof. Numbers seen are a good guess.' },
  steps: ['Read what we know: a stated rule, or only numbers seen.', 'Look for a reason that covers every case.', 'A reason: proved. Only examples: a good guess.'],
  done: 'Yes. A stated rule with a reason for every case is a proof. Numbers that were only seen make a good guess.',
};

const countMark = (id: string, label: string, opts: number[], answer: number, why: Record<number, string>): DrillMark => ({
  id,
  label,
  options: opts.map((n) => ({ id: String(n), label: String(n) })),
  answer: String(answer),
  why: Object.fromEntries(opts.filter((n) => n !== answer).map((n) => [String(n), why[n]])),
});

const L1_BOARD_B: DrillStep = {
  id: `${L1}-do2`,
  title: 'Count the lantern',
  body: ['The drawing shows 5 points. Use the cards for the rest.', 'Mark each count. Then judge the lantern’s claim.'],
  scene: BUILD_SCENE,
  scaffold: 'light',
  rows: [
    {
      id: 'counts',
      label: 'The counts, with every pair of points joined',
      marks: [
        countMark('c5', '5 points, no three chords meeting', [COUNTS[3], COUNTS[4], 2 * COUNTS[4]], COUNTS[4], {
          [COUNTS[3]]: `${COUNTS[3]} is the count for 4 points. The drawing of 5 points has ${COUNTS[4]} regions.`,
          [2 * COUNTS[4]]: `${2 * COUNTS[4]} is double ${COUNTS[4]}. But the drawing of 5 points has ${COUNTS[4]}.`,
        }),
        countMark('c6', '6 points, no three chords meeting', [MOST6, GUESS], MOST6, {
          [GUESS]: `${GUESS} is only the doubling guess. The drawing of 6 points has ${MOST6}.`,
        }),
        countMark('h6', '6 points, evenly spaced', [HEX, MOST6, GUESS], HEX, {
          [MOST6]: `Evenly spaced, three chords meet in the middle. A region is lost, so it has ${HEX}, not ${MOST6}.`,
          [GUESS]: `${GUESS} is the doubling guess. The evenly spaced drawing has ${HEX}.`,
        }),
      ],
    },
    {
      id: 'claim',
      label: 'The lantern’s claim: the count doubles each time.',
      marks: [
        {
          id: 'v',
          label: 'This claim is',
          options: STATUSES.map((s) => ({ id: s, label: STATUS_WORD[s] })),
          answer: 'false',
          why: {
            proved: `Five counts fit, but 6 points give ${MOST6}, not ${GUESS}. A case breaks the claim, so it is false.`,
            tentative: `It was a good guess before the drawing. But ${MOST6} breaks it, so now it is false.`,
          },
        },
      ],
    },
  ],
  done: `Right. Doubling fit five counts, then broke at 6 points. The most is ${MOST6}, and only with no three chords meeting.`,
};

const BOARD_C_CLAIMS: ClaimModel[] = [
  { source: 'seen', start: 0, step: 0, shown: [4, 6, 9, 10], prop: { t: 'even' }, seen: 2 },
  { source: 'rule', start: 12, step: 3, shown: termsOf(12, 3, 4), prop: { t: 'over', k: 10 }, seen: 0 },
  { source: 'seen', start: 0, step: 0, shown: [20, 25, 30, 35], prop: { t: 'over', k: 15 }, seen: 4 },
];

const L1_BOARD_C: DrillStep = {
  id: `${L1}-do3`,
  title: 'Sort three claims',
  body: ['Sort each claim: Proved, A good guess, or False.', 'First look for a case that breaks it.'],
  scene: SORT_SCENE,
  scaffold: 'light',
  rows: BOARD_C_CLAIMS.map((m, i) => ({ id: `s${i + 1}`, label: claimLine(m), marks: [verdictMark(`s${i + 1}-v`, m, [...STATUSES])] })),
  done: 'Yes. A case that breaks it: false. A reason for every case: proved. Only examples: a good guess.',
};

function l1Pack(rng: Rng): Item[] {
  return ids(
    distinct([
      () => whyGuessItem(rng),
      () => statusItem(rng, { framed: true }),
      () => statusItem(rng),
      () => (rng.chance(0.5) ? circleItem(rng) : coinItem(rng)),
      () => timesItem(rng),
    ]),
    `${L1}-p`,
  );
}

/** The 3-item primer for the counterexample skill the place needs: two sequences and a finding. */
function counterPrimer(rng: Rng): Item[] {
  const other = rng.pick<FamilyId>(['even', 'jump', 'odd']);
  return ids(
    distinct([
      () => counterItem(rng, { family: 'doubles', lesson: L1, level: 2 }),
      () => counterItem(rng, { family: other, lesson: L1, level: 2 }),
      () => ruleOutItem(rng, { lesson: L1, level: 2 }),
    ]),
    `${L1}-primer-`,
  );
}

const proved: LessonDef = {
  id: L1,
  title: 'Proved or a guess?',
  routine: true,
  track: 4,
  levels: [2, 2],
  plain: 'Evidence: proof or good guess',
  requires: ['s15.l2'],
  primer: counterPrimer,
  ideas: L1_IDEAS,
  drill: [L1_BOARD_A, L1_BOARD_B, L1_BOARD_C],
  practice: l1Pack,
  review: (rng) =>
    ids(asReview(distinct([
      () => statusItem(rng),
      () => circleItem(rng),
      () => coinItem(rng),
      () => whyGuessItem(rng),
    ])), `${L1}-review-`),
  independent: (rng) => {
    const [s1, s2] = rng.shuffle(STATUSES);
    return ids(distinct([
      () => whyGuessItem(rng),
      () => statusItem(rng, { status: s1 }),
      () => statusItem(rng, { status: s2 }),
      () => circleItem(rng),
      () => coinItem(rng),
      () => timesItem(rng),
    ]), `${L1}-independent-`);
  },
  pass: { firstTry: 3, include: [{ tag: 'examples-as-proof', label: 'a claim backed only by examples' }] },
  distinctions: [{ id: 'proved-vs-guess', a: 'A claim with a reason that covers every case of a stated rule.', b: 'A claim that only fits the examples seen so far.' }],
};

// =====================================================================================================================
// l2 · Break it or test it
// =====================================================================================================================

const DOUBLES = FAMILIES.doubles;

/** A stepped claim card: test one sequence at a time; the verdict turns false at the first counterexample. */
function testScene(cases: number[][], say: (xs: number[]) => string, stated?: string): LanternScene {
  return lanternCard({
    ...(stated ? { stated } : {}),
    claim: DOUBLES.claim,
    steps: cases.map((xs) => ({ label: `Test ${seqText(xs)}`, say: say(xs) })),
    frames: cases.map((_, i) => {
      const rows = cases.slice(0, i + 1).map((xs) => roleRow(DOUBLES, xs));
      return { rows, ...(cases.slice(0, i + 1).some((xs) => roleOf(DOUBLES, xs) === 'break') ? { status: 'false' as const } : {}) };
    }),
  });
}

const sayCase = (xs: number[], first: boolean): string => {
  const r = roleOf(DOUBLES, xs);
  if (r === 'fit') return first ? `${seqText(xs)} is growing, and it doubles. It fits. One fit does not prove the claim.` : `${seqText(xs)} fits too. Two fits still do not prove it.`;
  if (r === 'none') return `${seqText(xs)} is not growing. The claim is only about growing sequences, so this case says nothing.`;
  const miss = xs.findIndex((x, i) => i > 0 && x !== 2 * xs[i - 1]);
  return `${seqText(xs)} is growing, but ${xs[miss - 1]} doubled is ${2 * xs[miss - 1]}, not ${xs[miss]}. It breaks the claim. The claim is false.`;
};

const TEST_CASES = [[1, 2, 4, 8], [3, 6, 12, 24], [1, 2, 3, 4]];
const NEED_CASES = [[16, 8, 4, 2], [5, 6, 7, 8]];
const ONE_BREAKS = testScene(TEST_CASES, (xs) => sayCase(xs, xs === TEST_CASES[0]), 'Growing means each number is bigger than the one before.');
const NEEDS_SCENE = testScene(NEED_CASES, (xs) => (roleOf(DOUBLES, xs) === 'break' ? `${seqText(xs)} is growing, and it does not double. It breaks the claim.` : sayCase(xs, false)));

const ADD2: MRule = { t: 'add', k: 2 };
const DOUBLE: MRule = { t: 'times', k: 2 };
const outs = (x: number) => [`add 2 gives ${applyRule(ADD2, x)}`, `double gives ${applyRule(DOUBLE, x)}`];
const apart = (x: number) => applyRule(ADD2, x) !== applyRule(DOUBLE, x);
const MACHINE_SCENE: LanternScene = lanternCard({
  stated: 'This machine uses one of these two rules: add 2, or double.',
  rows: [{ label: 'Input 2', cells: outs(2), tag: apart(2) ? 'different' : 'the same' }],
  steps: [
    { label: 'Feed in 2 again', say: `Both rules give ${applyRule(ADD2, 2)} again. Nothing new is learned. This test can’t tell them apart.` },
    { label: 'Feed in 3', say: `Add 2 gives ${applyRule(ADD2, 3)}. Double gives ${applyRule(DOUBLE, 3)}. Now the two rules give different outputs.` },
    { label: 'Read the output', say: `The machine gives ${applyRule(DOUBLE, 3)}. Of these two rules, only double fits. That is all this test shows.` },
  ],
  frames: [
    {},
    { rows: [{ label: 'Input 2', cells: outs(2), tag: apart(2) ? 'different' : 'the same' }, { label: 'Input 3', cells: outs(3), tag: apart(3) ? 'different' : 'the same', lit: true }] },
    { claim: 'Of these two rules, it is double.', status: 'proved' },
  ],
});

const BUS = { claim: 'Every bus on route 4 is yellow.', findings: [
  { label: 'A yellow bus on route 4', inGroup: true, has: true },
  { label: 'A blue bus on route 9', inGroup: false, has: false },
  { label: 'A blue bus on route 4', inGroup: true, has: false },
] };
const findTag = (f: { inGroup: boolean; has: boolean }) => (rulesOut(f) ? 'rules it out' : f.inGroup ? 'fits' : 'says nothing');
const BUS_SCENE: LanternScene = lanternCard({
  claim: BUS.claim,
  steps: BUS.findings.map((f) => ({
    label: `Find ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)}`,
    say: rulesOut(f)
      ? `${f.label} is not yellow, and the claim talks about it. It rules the claim out.`
      : f.inGroup
        ? `${f.label} fits the claim. A fit only supports it.`
        : `${f.label} is not on route 4. The claim is about route 4 only, so this finding says nothing.`,
  })),
  frames: BUS.findings.map((_, i) => ({
    rows: BUS.findings.slice(0, i + 1).map((f) => ({ label: 'Finding', cells: [f.label], tag: findTag(f), ...(rulesOut(f) ? { lit: true } : {}) })),
    ...(BUS.findings.slice(0, i + 1).some(rulesOut) ? { status: 'false' as const } : {}),
  })),
});

const LAMP_SCENE: LanternScene = lanternCard({
  stated: 'A lamp is dark. Maybe the bulb is dead. Maybe the plug is out. Only one is the reason.',
  rows: [
    { label: 'Change nothing', cells: ['dark either way'], tag: 'no help' },
    { label: 'Plug it in, same bulb', cells: ['it lights if the plug was the reason', 'it stays dark if the bulb was'], tag: 'tells them apart', lit: true },
    { label: 'New bulb, and plug it in', cells: ['it lights either way'], tag: 'no help' },
  ],
});

/**
 * The sampling item (handoff: l2 has one): test “after heads, tails is due” by listing every way two fair flips can
 * go. The ways are made by counting, and the split after heads comes from nextAfterStreak (1 and 1), never by hand.
 */
const TWO_FLIPS: string[][] = [0, 1, 2, 3].map((m) => [m & 2 ? 'tails' : 'heads', m & 1 ? 'tails' : 'heads']);
const AFTER_ONE = nextAfterStreak(1);
const AFTER_FIVE = nextAfterStreak(5);
const HEADS_FIRST = TWO_FLIPS.flatMap((w, i) => (w[0] === 'heads' ? [i + 1] : []));
const flipRows = (stage: 0 | 1 | 2): LanternRow[] =>
  TWO_FLIPS.map((w, i) => ({
    label: `Way ${i + 1}`,
    cells: w,
    ...(stage >= 1 && w[0] === 'heads' ? { lit: true, tag: stage === 1 ? 'starts with heads' : `ends ${w[1]}` } : {}),
  }));
const DUE_SCENE: LanternScene = lanternCard({
  stated: 'A fair coin, flipped twice. Each flip is new.',
  claim: 'After heads, tails is due.',
  rows: flipRows(0),
  steps: [
    { label: 'Keep the ways that start with heads', say: `Ways ${list(HEADS_FIRST)} start with heads. Only they show what comes after heads.` },
    {
      label: 'Read the second flip',
      say: `After heads, ${AFTER_ONE.same} way ends heads and ${AFTER_ONE.other} way ends tails. ${AFTER_ONE.same === AFTER_ONE.other ? 'So tails is not more likely. It is still 1 in 2.' : 'The two are not even.'}`,
    },
    {
      label: 'Judge the claim',
      say: `Tails is not due, so the claim is false. ${AFTER_FIVE.same === AFTER_FIVE.other ? 'After 5 heads in a row, it is the same: still 1 in 2.' : ''}`.trim(),
    },
  ],
  frames: [{ rows: flipRows(1) }, { rows: flipRows(2) }, { status: AFTER_ONE.same === AFTER_ONE.other ? 'false' : 'tentative' }],
});

const L2_IDEAS: IdeaCard[] = [
  {
    title: 'One case can break a claim',
    scene: ONE_BREAKS,
    body: [
      'A claim about every case can be tested one case at a time.',
      'Cases that fit only support it. One case that breaks it shows it is false.',
      'That case is called a counterexample.',
    ],
  },
  {
    title: 'What a counterexample needs',
    scene: NEEDS_SCENE,
    body: [
      'To break “every growing sequence doubles,” a case must do two things.',
      'It must be growing. And it must not double.',
      'A case the claim is not about says nothing, even if it does not double.',
    ],
  },
  {
    title: 'A test that tells two rules apart',
    scene: MACHINE_SCENE,
    body: [
      'This machine uses one of two rules: add 2, or double.',
      'Input 2 gives 4 by both rules. So it can’t tell them apart.',
      'A good test is an input where the rules give different outputs. You may know this from the Rule Machine.',
    ],
  },
  {
    title: 'Which finding rules it out?',
    scene: BUS_SCENE,
    body: [
      'A finding rules a claim out when the claim talks about it, and the claim fails for it.',
      'Before you test, ask: what finding would show the claim is false?',
    ],
  },
  {
    title: 'Two reasons, one test',
    scene: LAMP_SCENE,
    body: [
      'The same idea works for reasons, not just rules.',
      'A lamp is dark. Plug it in and keep the same bulb. If it lights, the plug was the reason. If not, it was the bulb.',
      'Change one thing only. Then the two reasons give different results.',
    ],
  },
  {
    title: 'Test a claim about chance',
    scene: DUE_SCENE,
    body: [
      'A claim about chance can be tested too. List every way the flips can go.',
      'Claim: after heads, tails is due. Keep only the ways that start with heads.',
      'One ends heads and one ends tails. So tails is not due, and the claim is false.',
      'A fair coin has no memory. Even after 5 heads, each flip is still 1 in 2.',
    ],
  },
];

/** Breaks it, fits, or says nothing: the words for each wrong mark, from the claim's own words. */
function roleMark(id: string, xs: number[]): DrillMark {
  const f = DOUBLES;
  const r = roleOf(f, xs);
  const s = seqText(xs);
  const why: Record<string, string> = {};
  if (r === 'fit') {
    why.breaks = `${s} ${f.groupIs}, and it ${f.does}. It fits the claim, so it can’t break it.`;
    why.nothing = `${s} ${f.groupIs}, so the claim does talk about it. And it ${f.does}, so it fits.`;
  } else if (r === 'none') {
    why.breaks = `${s} ${f.groupIsNot}. The claim is only about growing sequences, so it says nothing.`;
    why.fits = `${s} ${f.groupIsNot}, so the claim says nothing about it. It can’t fit or break it.`;
  } else {
    why.fits = `${s} ${f.groupIs}, but it ${f.doesNot}. So it breaks the claim.`;
    why.nothing = `${s} ${f.groupIs}, so the claim does talk about it. And it ${f.doesNot}, so it breaks the claim.`;
  }
  const answer = r === 'break' ? 'breaks' : r === 'fit' ? 'fits' : 'nothing';
  return {
    id,
    label: 'This case',
    options: [{ id: 'breaks', label: 'Breaks it' }, { id: 'fits', label: 'Fits' }, { id: 'nothing', label: 'Says nothing' }],
    answer,
    why,
    compare: { says: f.claim, world: `The case: ${s}.` },
  };
}

const L2_BOARD_CASES = [[2, 4, 8, 16], [24, 12, 6, 3], [1, 3, 5, 7]];
const L2_BOARD_A: DrillStep = {
  id: `${L2}-do`,
  title: 'Break it, fit it, or say nothing',
  body: ['Test each case against the claim: every growing sequence doubles.', 'Mark it: Breaks it, Fits, or Says nothing.'],
  scene: NEEDS_SCENE,
  scaffold: 'full',
  rows: L2_BOARD_CASES.map((xs, i) => ({ id: `r${i + 1}`, label: `Test ${seqText(xs)}.`, marks: [roleMark(`r${i + 1}-m`, xs)] })),
  words: { says: 'Claim', world: 'Case', so: 'Ask', ask: 'Is it growing? Does it double each time?', closing: 'Only a growing sequence that does not double breaks the claim.' },
  steps: ['Is the case growing? If not, the claim says nothing about it.', 'If it is growing, does it double each time?', 'Growing but not doubling: it breaks the claim.'],
  done: 'Yes. Only a growing sequence that does not double breaks the claim.',
};

const L2_BOARD_B: DrillStep = {
  id: `${L2}-do2`,
  title: 'Which input is a real test?',
  body: ['The machine uses add 2, or double.', 'For each input, mark if it tells the two rules apart.'],
  scene: MACHINE_SCENE,
  scaffold: 'light',
  rows: [1, 2, 5].map((x) => ({
    id: `in${x}`,
    label: `Input ${x}: add 2 gives ${applyRule(ADD2, x)}, double gives ${applyRule(DOUBLE, x)}.`,
    marks: [
      {
        id: `in${x}-m`,
        label: 'Tells the rules apart?',
        options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
        answer: apart(x) ? 'yes' : 'no',
        why: (apart(x)
          ? { no: `Input ${x}: add 2 gives ${applyRule(ADD2, x)}, and double gives ${applyRule(DOUBLE, x)}. Different outputs tell the rules apart.` }
          : { yes: `Input ${x} gives ${applyRule(ADD2, x)} by both rules. The same output can’t tell them apart.` }) as Record<string, string>,
      },
    ],
  })),
  done: 'Right. Only an input where the two rules give different outputs is a real test.',
};

function l2Pack(rng: Rng): Item[] {
  const [f1, f2] = rng.shuffle<FamilyId>(['doubles', 'even', 'jump', 'odd']);
  return ids(
    distinct([
      () => whyCounterItem(rng),
      () => counterItem(rng, { family: f1, framed: true }),
      () => counterItem(rng, { family: f2 }),
      () => separateItem(rng),
      () => (rng.chance(0.5) ? reasonsTestItem(rng) : ruleOutItem(rng, { phase: 'transfer', work: true })),
    ]),
    `${L2}-p`,
  );
}

const breakIt: LessonDef = {
  id: L2,
  title: 'Break it or test it',
  routine: true,
  track: 4,
  levels: [3, 3],
  plain: 'Evidence: counterexamples and tests',
  requires: [L1],
  ideas: L2_IDEAS,
  drill: [L2_BOARD_A, L2_BOARD_B],
  practice: l2Pack,
  review: (rng) =>
    ids(asReview(distinct([
      () => counterItem(rng),
      () => separateItem(rng),
      () => (rng.chance(0.5) ? ruleOutItem(rng) : coinItem(rng, { lesson: L2, level: 3 })),
      () => whyCounterItem(rng),
    ])), `${L2}-review-`),
  independent: (rng) => {
    const [f1, f2] = rng.shuffle<FamilyId>(['doubles', 'even', 'jump', 'odd']);
    return ids(distinct([
      () => whyCounterItem(rng),
      () => counterItem(rng, { family: f1 }),
      () => counterItem(rng, { family: f2 }),
      () => separateItem(rng),
      () => coinItem(rng, { lesson: L2, level: 3 }),
      () => (rng.chance(0.5) ? reasonsTestItem(rng) : ruleOutItem(rng, { phase: 'transfer', work: true })),
    ]), `${L2}-independent-`);
  },
  pass: { firstTry: 3, include: [{ tag: 'unwarranted-certainty', label: 'a test that must tell two rules apart' }] },
};

// =====================================================================================================================
// l3 · Why it must continue
// =====================================================================================================================

const A0 = 1, D0 = 3;
const FIVE = termsOf(A0, D0, 5);
const parityCells = (upTo: number) => FIVE.map((x, i) => (i < upTo ? par(x) : '?'));
const termsRow = { label: 'Terms', cells: FIVE.map(String) };

const TERMS_SCENE: LanternScene = lanternCard({
  stated: `${cap(ruleText(A0, D0))}.`,
  pattern: 'constructed',
  rows: [termsRow, { label: 'Odd or even', cells: parityCells(0) }],
  steps: [
    { label: 'Check term 1', say: `Term 1 is ${FIVE[0]}, which is ${par(FIVE[0])}.` },
    { label: 'Check term 2', say: `Term 2 is ${FIVE[1]}, which is ${par(FIVE[1])}.` },
    { label: 'Check terms 3 to 5', say: `${FIVE[2]} is ${par(FIVE[2])}, ${FIVE[3]} is ${par(FIVE[3])}, and ${FIVE[4]} is ${par(FIVE[4])}. Odd and even take turns.` },
  ],
  frames: [1, 2, 5].map((k) => ({ rows: [termsRow, { label: 'Odd or even', cells: parityCells(k) }] })),
});

const CHAIN = reasonSteps(A0, D0);
const CHAIN_SCENE: LanternScene = lanternCard({
  stated: `${cap(ruleText(A0, D0))}.`,
  pattern: 'constructed',
  rows: [termsRow],
  chain: CHAIN.map((text) => ({ text })),
  steps: CHAIN.map((text, i) => ({ label: `Light step ${i + 1}`, say: text })),
  frames: CHAIN.map((_, i) => ({
    chain: CHAIN.map((text, k) => ({ text, ...(k <= i ? { lit: true } : {}) })),
    ...(i === CHAIN.length - 1 ? { claim: 'Odd and even take turns at every term.', status: 'proved' as const } : {}),
  })),
});

const SCORES = termsOf(2, 3, 5);
const SEEN_SCENE: LanternScene = lanternCard({
  stated: `Scores on a scoreboard: ${list(SCORES)}. No rule was given.`,
  pattern: 'observed',
  rows: [{ label: 'Seen', cells: SCORES.map(String) }, { label: 'Odd or even', cells: SCORES.map(par) }],
  claim: 'Odd and even will keep taking turns.',
  status: 'tentative',
});

const EVEN_CHAIN = reasonSteps(2, 4);
const KEEP_SCENE: LanternScene = lanternCard({
  stated: `${cap(ruleText(2, 4))}.`,
  pattern: 'constructed',
  rows: [{ label: 'Terms', cells: termsOf(2, 4, 4).map(String) }],
  chain: EVEN_CHAIN.map((text) => ({ text })),
  steps: EVEN_CHAIN.map((text, i) => ({ label: `Light step ${i + 1}`, say: text })),
  frames: EVEN_CHAIN.map((_, i) => ({
    chain: EVEN_CHAIN.map((text, k) => ({ text, ...(k <= i ? { lit: true } : {}) })),
    ...(i === EVEN_CHAIN.length - 1 ? { claim: 'Every term is even.', status: 'proved' as const } : {}),
  })),
});

const FAR_N = 20;
const FAR_T = termOf(A0, D0, FAR_N);
const FAR_SCENE: LanternScene = lanternCard({
  stated: `${cap(ruleText(A0, D0))}.`,
  pattern: 'constructed',
  rows: [{ label: 'Terms', cells: termsOf(A0, D0, 4).map(String) }],
  steps: [
    { label: 'Count the jumps', say: `Term ${FAR_N} is ${FAR_N - 1} jumps after term 1.` },
    { label: 'Count the flips', say: `Each jump of ${D0} flips odd and even. ${FAR_N - 1} flips is an ${par(FAR_N - 1)} number of flips.` },
    { label: 'Decide', say: `From ${par(A0)}, an ${par(FAR_N - 1)} number of flips ends on ${par(FAR_T)}. So term ${FAR_N} is ${par(FAR_T)}. Check: ${A0} plus ${FAR_N - 1} jumps of ${D0} is ${FAR_T}.` },
  ],
  frames: [{}, {}, { claim: `Term ${FAR_N} is ${par(FAR_T)}.`, status: 'proved' }],
});

const L3_IDEAS: IdeaCard[] = [
  {
    title: 'A pattern with a stated rule',
    scene: TERMS_SCENE,
    body: [
      `${cap(ruleText(A0, D0))}. The rule is stated, so this is a constructed pattern.`,
      'Each number in it is called a term. Is each term odd or even?',
    ],
  },
  {
    title: 'Why must it go on?',
    scene: CHAIN_SCENE,
    body: ['Five terms show odd and even taking turns. They do not show why.', 'The reason comes from the rule. Light each step of it.'],
  },
  {
    title: 'Examples are not the reason',
    scene: SEEN_SCENE,
    body: [
      'A list of terms shows what happened so far. It can’t say what must happen at term 100.',
      'With no rule, numbers like these are only a good guess. The next score could be anything.',
    ],
  },
  {
    title: 'An even step keeps it the same',
    scene: KEEP_SCENE,
    body: ['Adding an odd number flips odd and even. Adding an even number keeps them the same.', 'Start at 2 and add 4. Every term stays even.'],
  },
  {
    title: 'Find a far term',
    scene: FAR_SCENE,
    body: ['You can tell a far term without listing them all.', 'Count the jumps from term 1. Each odd jump flips odd and even.'],
  },
];

const parityMark = (id: string, n: number): DrillMark => {
  const t = termOf(A0, D0, n), prev = termOf(A0, D0, n - 1);
  const ans = par(t);
  const wrong = ans === 'odd' ? 'even' : 'odd';
  return {
    id,
    label: `Term ${n}`,
    options: [{ id: 'odd', label: 'Odd' }, { id: 'even', label: 'Even' }],
    answer: ans,
    why: { [wrong]: `Term ${n - 1} is ${prev}, which is ${par(prev)}. Adding ${D0} flips it, so term ${n} is ${t}: ${ans}.` },
    compare: { says: `Term ${n}: odd or even?`, world: `Term ${n - 1} is ${prev}. Each jump adds ${D0}.` },
  };
};

const FAR_100 = termOf(A0, D0, 100);
const L3_BOARD_A: DrillStep = {
  id: `${L3}-do`,
  title: 'Past the end of the list',
  body: [`The rule is stated: ${ruleText(A0, D0)}. Mark terms 6 and 7.`, 'Then say if the five terms alone are a proof.'],
  scene: TERMS_SCENE,
  scaffold: 'full',
  rows: [
    { id: 't6', label: 'Term 6, one jump after term 5', marks: [parityMark('t6-m', 6)] },
    { id: 't7', label: 'Term 7, one jump after term 6', marks: [parityMark('t7-m', 7)] },
    {
      id: 'proof',
      label: `Term 100 is ${par(FAR_100)}. Do the five terms alone prove it?`,
      marks: [
        {
          id: 'proof-m',
          label: 'A proof from five terms?',
          options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
          answer: 'no',
          why: { yes: `Five terms are examples. The rule proves it: each jump of ${D0} flips odd and even, every time.` },
        },
      ],
    },
  ],
  words: { says: 'Find', world: 'We know', so: 'Ask', ask: `Does adding ${D0} flip it?`, closing: 'The rule, not the list, says what comes next.' },
  steps: ['Find the term before.', `Adding ${D0}, an odd number, flips odd and even.`, 'So the term is the other one.'],
  done: 'Yes. The rule decides every term. The five terms are only examples.',
};

/** The reason chain for a new rule, to put in order (a twin of the card's chain). */
const TWIN_A = 4, TWIN_D = 5;
const TWIN_CHAIN = reasonSteps(TWIN_A, TWIN_D);
const PLACES = ['First', 'Second', 'Third', 'Fourth'];
const TWIN_ORDER = [1, 3, 0, 2];
const placeWhy = (at: number, picked: number): string => {
  if (at === 0) return 'Nothing can flip before you know where you start. This step comes first.';
  if (at === TWIN_CHAIN.length - 1) return 'This step says the same step comes every time. It sums up the flips, so it comes last.';
  if (picked === 0) return `The reason starts from term 1, so “${TWIN_CHAIN[0].replace(/\.$/, '')}” comes first.`;
  if (picked === TWIN_CHAIN.length - 1) return 'The last step says it happens every time. It sums up the flips before it.';
  return at === 1 ? 'This is the first flip. The flip back comes after it.' : 'This step flips back, so the first flip must come before it.';
};
const L3_BOARD_B: DrillStep = {
  id: `${L3}-do2`,
  title: 'Light the chain in order',
  body: [`A new rule: ${ruleText(TWIN_A, TWIN_D)}.`, 'Give each step of the reason its place, first to fourth.'],
  scene: lanternCard({ stated: `${cap(ruleText(TWIN_A, TWIN_D))}.`, pattern: 'constructed', rows: [{ label: 'Terms', cells: termsOf(TWIN_A, TWIN_D, 4).map(String) }] }),
  twin: `The same reason, for a new rule: ${ruleText(TWIN_A, TWIN_D)}.`,
  scaffold: 'light',
  rows: TWIN_ORDER.map((at) => ({
    id: `step${at + 1}`,
    label: TWIN_CHAIN[at],
    marks: [
      {
        id: `step${at + 1}-m`,
        label: 'Its place',
        options: PLACES.map((p, k) => ({ id: String(k), label: p })),
        answer: String(at),
        why: Object.fromEntries(PLACES.map((_, k) => k).filter((k) => k !== at).map((k) => [String(k), placeWhy(at, k)])),
      },
    ],
  })),
  done: 'Right. Start, flip, flip back, and the same step every time.',
};

function l3Pack(rng: Rng): Item[] {
  return ids(
    distinct([
      () => whyContinueItem(rng),
      () => parityItem(rng, { framed: true }),
      () => parityItem(rng),
      () => chainItem(rng),
      () => mustContinueItem(rng),
    ]),
    `${L3}-p`,
  );
}

const mustGoOn: LessonDef = {
  id: L3,
  title: 'Why it must continue',
  routine: true,
  track: 4,
  levels: [4, 4],
  plain: 'Evidence: why a rule must continue',
  requires: [L2],
  ideas: L3_IDEAS,
  drill: [L3_BOARD_A, L3_BOARD_B],
  practice: l3Pack,
  review: (rng) =>
    ids(asReview(distinct([
      () => parityItem(rng),
      () => chainItem(rng),
      () => jumpsItem(rng),
      () => whyContinueItem(rng),
    ])), `${L3}-review-`),
  independent: (rng) =>
    ids(distinct([
      () => whyContinueItem(rng),
      () => parityItem(rng, { odd: true }),
      () => parityItem(rng, { odd: false }),
      () => chainItem(rng),
      () => jumpsItem(rng),
      () => mustContinueItem(rng),
    ]), `${L3}-independent-`),
  pass: { firstTry: 3, include: [{ tag: 'examples-as-proof', label: 'listed terms that tempt you to stop at examples' }] },
};

// =====================================================================================================================
// The Ring Check, the Arcade, new examples, the diagnostic
// =====================================================================================================================

/** The Ring Check: 9 fresh items, three per place. The circle, the coin and the listed terms are conflict items. */
function check(rng: Rng): Item[] {
  const made = distinct([
    () => statusItem(rng),
    () => ({ ...circleItem(rng), conflict: true }),
    () => ({ ...coinItem(rng), conflict: true }),
    () => counterItem(rng),
    () => separateItem(rng),
    () => (rng.chance(0.5) ? ruleOutItem(rng) : reasonsTestItem(rng)),
    () => ({ ...whyContinueItem(rng), conflict: true }),
    () => parityItem(rng),
    () => rng.pick([() => jumpsItem(rng), () => chainItem(rng), () => mustContinueItem(rng)])(),
  ]);
  return ids(made, `s${STOP}-c`);
}

/** One Arcade item from any place (never a faded one). */
function arcade(rng: Rng): Item {
  const makers: (() => Item)[] = [
    () => statusItem(rng),
    () => whyGuessItem(rng),
    () => circleItem(rng),
    () => coinItem(rng),
    () => timesItem(rng),
    () => counterItem(rng),
    () => whyCounterItem(rng),
    () => separateItem(rng),
    () => ruleOutItem(rng),
    () => reasonsTestItem(rng),
    () => whyContinueItem(rng),
    () => parityItem(rng),
    () => chainItem(rng),
    () => jumpsItem(rng),
    () => mustContinueItem(rng),
  ];
  return { ...rng.pick(makers)(), id: `s${STOP}-arcade` };
}

/**
 * New examples after a miss. A missed verdict gets the same verdict again and a different one; a missed coin gets two
 * other trials; a missed counterexample gets two other claims; a missed odd-or-even gets an odd jump and an even jump.
 * Everything else: [] (the default: one item with the same skill).
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const set = (xs: (() => Item)[]) => ids(distinct(xs), 'new-');
  // The new examples stay in the missed item's place and level (an l2 coin, a primer counterexample).
  const lesson = missed.lesson;
  const level = missed.level;
  switch (missed.skill) {
    case 's17.proof-status': {
      const right = missed.kind === 'choose' && (STATUSES as readonly string[]).includes(missed.answer) ? (missed.answer as LanternStatus) : 'tentative';
      const other = rng.pick(STATUSES.filter((s) => s !== right));
      return set([() => statusItem(rng, { status: right, lesson, level }), () => statusItem(rng, { status: other, lesson, level })]);
    }
    case 's17.independence': {
      const [d1, d2] = rng.shuffle(['coin', 'spinner', 'cube'] as const);
      return set([() => coinItem(rng, { device: d1, lesson, level }), () => coinItem(rng, { device: d2, lesson, level })]);
    }
    case 's17.counterexample': {
      const [f1, f2] = rng.shuffle<FamilyId>(['doubles', 'even', 'jump', 'odd']);
      return set([() => counterItem(rng, { family: f1, lesson, level }), () => counterItem(rng, { family: f2, lesson, level })]);
    }
    case 's17.parity-step':
      return set([() => parityItem(rng, { odd: true, lesson, level }), () => parityItem(rng, { odd: false, lesson, level })]);
    default:
      return [];
  }
}

/** Track 4 diagnostic items: L2 proved or a good guess for a stated claim; L3 which case breaks "every growing sequence doubles". */
function diagnostic(rng: Rng, track: 1 | 2 | 3 | 4, level: 1 | 2 | 3 | 4): Item | null {
  if (track !== 4) return null;
  if (level === 2) return { ...statusItem(rng, { status: rng.pick<LanternStatus>(['proved', 'tentative']), lesson: L1 }), id: `s${STOP}-diag-2` };
  if (level === 3) return { ...counterItem(rng, { family: 'doubles', lesson: L2 }), id: `s${STOP}-diag-3` };
  return null;
}

export const SKILL_NAMES_S17: Record<string, string> = {
  's17.why-guess': 'Why examples are only a good guess',
  's17.proof-status': 'Proved, a good guess, or false',
  's17.circle-max': 'Circle regions: the most needs no three chords meeting',
  's17.independence': 'A fair try has no memory',
  's17.more-evidence': 'What to check before being sure',
  's17.why-counter': 'Why one counterexample is enough',
  's17.counterexample': 'Find a counterexample',
  's17.separate': 'A test that tells two ideas apart',
  's17.rule-out': 'A finding that rules a claim out',
  's17.why-continue': 'Why a stated rule must continue',
  's17.parity-step': 'Odd or even from a stated rule',
  's17.reason-chain': 'Build the reason chain',
  's17.must-continue': 'A stated rule decides a far case',
  's17.jumps': 'Jumps between terms',
};

/** The fixed worked pictures and models, for the tests: every count, verdict and role must be what the cards say. */
export const S17_EXAMPLES = {
  BUILD_SCENE, GUESS_SCENE, HEX_SCENE, SORT_SCENE, COIN_SCENE, ONE_BREAKS, NEEDS_SCENE, MACHINE_SCENE, BUS_SCENE, LAMP_SCENE,
  DUE_SCENE, TWO_FLIPS, TERMS_SCENE, CHAIN_SCENE, SEEN_SCENE, KEEP_SCENE, FAR_SCENE, CONTRAST, ODD_RULE, ODD_SEEN, BOARD_A_CLAIMS, BOARD_C_CLAIMS,
  TEST_CASES, NEED_CASES, L2_BOARD_CASES, BUS, FAR_N, FAR_T, FAR_100, TWIN_A, TWIN_D, CIRCLE_STATED,
} as const;

export const stop17: StopDef = {
  n: STOP,
  id: 's17',
  title: 'Proof Lantern',
  idea: 'A run of examples supports a guess. A reason that covers every case of a stated construction is a proof.',
  ready: true,
  lessons: [proved, breakIt, mustGoOn],
  check,
  practice: arcade,
  fresh,
  requires: [],
  lessonOrder: 'free',
  skillNames: SKILL_NAMES_S17,
  observatory: { ring: 4, track: 4, plain: 'Evidence', diagnostic },
};
