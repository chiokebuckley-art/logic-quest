/**
 * Stop 12 · Proof (id s11), Lesson 7 · Dominoes. A line of dominoes all falls when the first one falls and each one
 * knocks over the next. A claim about every case (every step of a staircase, every term of a number list, every week
 * of a coin jar) is proved the same way: the first case, and the step to the next (if it holds for one case, it holds
 * for the next). Grown-ups call it induction; the first case is the base case.
 *
 * The model of a claim: the count of case 1 (a), the amount each case adds (d), and what the claim says of each count
 * (odd, even, more than k, fewer than k). Rule Rise's staircases (./observatory/growth.ts) give the staircase claims:
 * case n is step n, its count stairCount. Worked out from the model, never written by hand:
 *  - the first case holds: the claim is true of a (firstHolds);
 *  - the step to the next holds: every count from 0 to 500 where the claim is true stays true with d added
 *    (stepHolds), so no count can pass the claim on and then lose it;
 *  - an argument proves the claim when it shows both parts, each true (argProves). Checked cases are not the step.
 *
 * Every answer, explanation, wrong-choice feedback, hint case and board mark here comes from that model. Only the rng
 * passed in is used, so the same seed always gives the same item.
 */
import { YES_NO } from '../drill';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, ConfusedQuestion, ContrastPanel, Distinction, DrillRow, DrillStep, Misconception, Rng, Scene, Teach, TeachCase } from '../types';
import { CONSTRUCTIONS, PAIRS, stairCount, stairScene, termAt, type Construction } from './observatory/growth';
import { cap, joinAnd, PROOF_SECONDS, TRAPS, WHY_TAG, type ProofKind, type ProofMade, type ProofSkin } from './proofs';
import type { ItemCore } from './statements';

/** Words for one wrong option of a board mark. */
const whyFor = (wrong: string, text: string): Record<string, string> => ({ [wrong]: text });

// =====================================================================================================================
// The model
// =====================================================================================================================

export type IndProp = { kind: 'odd' } | { kind: 'even' } | { kind: 'over'; k: number } | { kind: 'under'; k: number };

/** Is the claim true of this count? */
export function propHolds(p: IndProp, x: number): boolean {
  switch (p.kind) {
    case 'odd': return x % 2 === 1;
    case 'even': return x % 2 === 0;
    case 'over': return x > p.k;
    case 'under': return x < p.k;
  }
}

export type IndSkinId = 'stair' | 'terms' | 'jar' | 'blocks' | 'gems' | 'candles';

/** The words of a claim's story. Every case is numbered from 1. */
export interface IndSkin {
  id: IndSkinId;
  skin: ProofSkin;
  /** One case and many: “step” / “steps”. */
  noun: string;
  plural: string;
  /** What is counted (“tiles”); empty for a number list. */
  unit: string;
  /** The setting, stated, from the count of case 1 and the amount each case adds. */
  setting: (a: number, d: number) => string;
  /** One case and its count, lowercase, no period: “step 3 has 7 tiles”. */
  count: (n: number, v: number) => string;
  /** One case, or the next, with what the claim says: “one step has an odd number of tiles”. */
  holdsAt: (which: 'one' | 'next', pp: string) => string;
  /** What the next case adds, lowercase, no period: “the next step has 2 more tiles”. */
  adds: (d: number) => string;
  /** The claim about every case: “Every step of this staircase has an odd number of tiles.” */
  every: (pp: string) => string;
}

const constructionFor = (a: number, d: number): Construction => Object.values(CONSTRUCTIONS).find((c) => stairCount(c, 1) === a && c.per === d)!;
const oneOrNext = (which: 'one' | 'next', noun: string) => (which === 'one' ? `one ${noun}` : `the next ${noun}`);

export const IND_SKINS: Readonly<Record<IndSkinId, IndSkin>> = {
  stair: {
    id: 'stair', skin: 'abstract', noun: 'step', plural: 'steps', unit: 'tiles',
    setting: (a, d) => `A staircase of tiles grows by a stated rule. ${constructionFor(a, d).says} Step 1 has ${a} tiles.`,
    count: (n, v) => `step ${n} has ${v} tiles`,
    holdsAt: (w, pp) => `${oneOrNext(w, 'step')} has ${pp}`,
    adds: (d) => `the next step has ${d} more tiles`,
    every: (pp) => `Every step of this staircase has ${pp}.`,
  },
  terms: {
    id: 'terms', skin: 'abstract', noun: 'term', plural: 'terms', unit: '',
    setting: (a, d) => `A number list follows a stated rule: start at ${a} and add ${d} each time.`,
    count: (n, v) => `term ${n} is ${v}`,
    holdsAt: (w, pp) => `${oneOrNext(w, 'term')} is ${pp}`,
    adds: (d) => `the next term is ${d} more`,
    every: (pp) => `Every term is ${pp}.`,
  },
  jar: {
    id: 'jar', skin: 'everyday', noun: 'week', plural: 'weeks', unit: 'coins',
    setting: (a, d) => `Leo’s coin jar has ${a} coins in week 1. Each week, Leo adds ${d} coins.`,
    count: (n, v) => `in week ${n}, the jar has ${v} coins`,
    holdsAt: (w, pp) => `${oneOrNext(w, 'week')} has ${pp}`,
    adds: (d) => `the next week has ${d} more coins`,
    every: (pp) => `Every week, the jar has ${pp}.`,
  },
  blocks: {
    id: 'blocks', skin: 'everyday', noun: 'day', plural: 'days', unit: 'blocks',
    setting: (a, d) => `Mia’s block tower has ${a} blocks on day 1. Each day, Mia adds ${d} blocks.`,
    count: (n, v) => `on day ${n}, the tower has ${v} blocks`,
    holdsAt: (w, pp) => `the tower has ${pp} ${w === 'one' ? 'one day' : 'the next day'}`,
    adds: (d) => `it gets ${d} more blocks the next day`,
    every: (pp) => `Every day, the tower has ${pp}.`,
  },
  gems: {
    id: 'gems', skin: 'fantasy', noun: 'day', plural: 'days', unit: 'gems',
    setting: (a, d) => `A dragon has ${a} gems on day 1. Each day, it finds ${d} more gems.`,
    count: (n, v) => `on day ${n}, the dragon has ${v} gems`,
    holdsAt: (w, pp) => `the dragon has ${pp} ${w === 'one' ? 'one day' : 'the next day'}`,
    adds: (d) => `it finds ${d} more gems the next day`,
    every: (pp) => `Every day, the dragon has ${pp}.`,
  },
  candles: {
    id: 'candles', skin: 'fantasy', noun: 'floor', plural: 'floors', unit: 'candles',
    setting: (a, d) => `A wizard’s tower has ${a} candles on floor 1. Each floor up has ${d} more candles.`,
    count: (n, v) => `floor ${n} has ${v} candles`,
    holdsAt: (w, pp) => `${oneOrNext(w, 'floor')} has ${pp}`,
    adds: (d) => `the next floor has ${d} more candles`,
    every: (pp) => `Every floor has ${pp}.`,
  },
};
export const IND_BY_SKIN: Readonly<Record<ProofSkin, readonly IndSkinId[]>> = { everyday: ['jar', 'blocks'], fantasy: ['gems', 'candles'], abstract: ['stair', 'terms'] };

/** A claim about every case: the count of case 1, what each case adds, and what the claim says of each count. */
export interface IndClaim {
  skin: IndSkin;
  a: number;
  d: number;
  prop: IndProp;
}

export const valueAt = (c: Pick<IndClaim, 'a' | 'd'>, n: number) => termAt(c.a, c.d, n);
export const caseHolds = (c: IndClaim, n: number) => propHolds(c.prop, valueAt(c, n));
export const firstHolds = (c: IndClaim) => caseHolds(c, 1);
/** The step to the next: every count from 0 to 500 where the claim is true is still true with d added. */
export function stepHolds(c: Pick<IndClaim, 'd' | 'prop'>): boolean {
  for (let x = 0; x <= 500; x++) if (propHolds(c.prop, x) && !propHolds(c.prop, x + c.d)) return false;
  return true;
}
/** The first case (up to 200) where the claim is false, or null. */
export function firstFail(c: IndClaim): number | null {
  for (let n = 1; n <= 200; n++) if (!caseHolds(c, n)) return n;
  return null;
}

/** An argument for the claim: the first case shown or not, and the step to the next shown, checked cases instead, or nothing. */
export interface IndArg {
  claim: IndClaim;
  first: boolean;
  step: 'shown' | 'checks' | 'none';
}
/** It proves the claim for every case when it shows both parts and both are true. */
export const argProves = (g: IndArg) => g.first && firstHolds(g.claim) && g.step === 'shown' && stepHolds(g.claim);

// ---------- words ----------

/** What the claim says of a count, with its unit: “an odd number of tiles”, “more than 10 coins”, “odd”. */
export function ppOf(c: IndClaim): string {
  const u = c.skin.unit;
  switch (c.prop.kind) {
    case 'odd':
    case 'even': return u ? `an ${c.prop.kind === 'odd' ? 'odd' : 'even'} number of ${u}` : c.prop.kind;
    case 'over': return u ? `more than ${c.prop.k} ${u}` : `more than ${c.prop.k}`;
    case 'under': return u ? `fewer than ${c.prop.k} ${u}` : `less than ${c.prop.k}`;
  }
}
/** What the claim says of a number: “odd”, “more than 10”, “less than 20”. */
export function numWord(c: IndClaim): string {
  switch (c.prop.kind) {
    case 'odd':
    case 'even': return c.prop.kind;
    case 'over': return `more than ${c.prop.k}`;
    case 'under': return `less than ${c.prop.k}`;
  }
}
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export const claimText = (c: IndClaim) => c.skin.every(ppOf(c));
export const settingText = (c: IndClaim) => c.skin.setting(c.a, c.d);
/** Why the step to the next holds, from the claim: “An odd number plus 2 is odd.” */
export function stepReason(c: IndClaim): string {
  if (!stepHolds(c)) throw new Error('stepReason: the step does not hold');
  switch (c.prop.kind) {
    case 'odd':
    case 'even': return `An ${c.prop.kind} number plus ${c.d} is ${c.prop.kind}.`;
    case 'over': return `A number more than ${c.prop.k}, plus ${c.d}, is still more than ${c.prop.k}.`;
    case 'under': throw new Error('stepReason: fewer than never passes on');
  }
}
/** The first case, as a line: “First case: step 1 has 3 tiles, and 3 is odd.” */
export function firstLine(c: IndClaim, label = true): string {
  if (!firstHolds(c)) throw new Error('firstLine: the first case does not hold');
  const body = `${c.skin.count(1, c.a)}, and ${c.a} is ${numWord(c)}.`;
  return label ? `First case: ${body}` : `${cap(body)}`;
}
/** The step to the next, as a line. */
export function stepLine(c: IndClaim, label = true): string {
  const s = `if ${c.skin.holdsAt('one', ppOf(c))}, ${c.skin.adds(c.d)}. ${stepReason(c)}`;
  return label ? `Step to the next: ${s}` : cap(s);
}
/** Checked cases, as a line (labeled as the step to the next in the trap). */
export function checksLine(c: IndClaim, ns: readonly number[], asStep = false): string {
  const vals = ns.map((n) => valueAt(c, n));
  if (!ns.every((n) => caseHolds(c, n))) throw new Error('checksLine: a checked case fails');
  const u = c.skin.unit;
  const body = `${cap(c.skin.plural)} ${joinAnd(ns.map(String))} were checked. They ${u ? 'have' : 'are'} ${joinAnd(vals.map(String))}${u ? ` ${u}` : ''}, and the claim holds for each one.`;
  return asStep ? `Step to the next: ${low(body)}` : body;
}
export const CHECKED = [2, 3, 4, 5] as const;
/** Where the claim breaks, in words: “step 2 has 8 tiles, and 8 is not odd”. */
export const breakText = (c: IndClaim, n: number) => `${c.skin.count(n, valueAt(c, n))}, and ${valueAt(c, n)} is not ${numWord(c)}`;
export const soLine = (c: IndClaim) => `So ${low(claimText(c))}`;

/** The argument's lines: the claim, then the parts it shows, then its conclusion. */
export function argLines(g: IndArg): string[] {
  return [
    `Claim: ${claimText(g.claim)}`,
    ...(g.first ? [firstLine(g.claim)] : []),
    ...(g.step === 'shown' ? [stepLine(g.claim)] : g.step === 'checks' ? [checksLine(g.claim, CHECKED, true)] : []),
    soLine(g.claim),
  ];
}
const argScene = (g: IndArg): Scene => ({ kind: 'text', lines: argLines(g) });

const YES_NO_WORDS = { truth: 'yes', untruth: 'no' } as const;

/** One case as a teach card: its count, and whether the claim holds for it. */
export function caseCase(c: IndClaim, n: number): TeachCase {
  const v = valueAt(c, n);
  const ok = propHolds(c.prop, v);
  return {
    label: `${cap(c.skin.count(n, v))}.`,
    truths: [{ who: cap(numWord(c)), value: ok }],
    words: YES_NO_WORDS,
    note: ok ? `${v} is ${numWord(c)}. The claim holds for ${c.skin.noun} ${n}.` : `${v} is not ${numWord(c)}. The claim breaks at ${c.skin.noun} ${n}.`,
  };
}

const IND_TERMS = [
  { word: 'The first case', meaning: 'the claim holds at the start. It is the first domino.' },
  { word: 'The step to the next', meaning: 'if the claim holds for one case, it holds for the next. Each domino knocks over the next.' },
  { word: 'A domino proof', meaning: 'the first case and the step to the next, together. Grown-ups call it induction.' },
];

function indTeach(c: IndClaim, rule: string): Teach {
  const fail = firstFail(c);
  const shown = [1, 2, 3, 4];
  if (fail && !shown.includes(fail)) shown.push(fail);
  return {
    rule,
    terms: IND_TERMS,
    meaning: `${settingText(c)} The claim is about every ${c.skin.noun}, even ${c.skin.noun} 100.`,
    casesTitle: `Some ${c.skin.plural}, checked`,
    cases: shown.map((n) => caseCase(c, n)),
    remember: ['A domino proof needs the first case and the step to the next.', 'Ask: does it start? Does each case pass the claim on to the next?'],
    simpler: [
      `${cap(c.skin.count(1, c.a))}. Is ${c.a} ${numWord(c)}? ${firstHolds(c) ? 'Yes.' : 'No.'}`,
      `If one ${c.skin.noun} fits, does the next one fit too? ${stepHolds(c) ? 'Yes.' : 'No.'}`,
      firstHolds(c) && stepHolds(c) ? 'Both answers are yes, so every case fits.' : 'One answer is no, so this is not a proof.',
    ],
  };
}

// ---------- making claims ----------

/**
 * A claim in this skin whose first case and step to the next hold or fail as wanted. `under`: allow “fewer than”
 * (its step never holds) and make it hold for the checked cases, then fail soon after.
 */
export function makeClaim(rng: Rng, skinId: IndSkinId, want: { first: boolean; step: boolean; under?: boolean }): IndClaim {
  const sk = IND_SKINS[skinId];
  for (let t = 0; t < 600; t++) {
    let a: number, d: number;
    if (skinId === 'stair') {
      const c = rng.pick(Object.values(CONSTRUCTIONS));
      a = stairCount(c, 1);
      d = c.per;
    } else {
      a = rng.int(1, 9);
      d = rng.int(1, 6);
    }
    const kinds: IndProp['kind'][] = want.under ? ['under'] : ['odd', 'even', 'over'];
    const kind = rng.pick(kinds);
    const prop: IndProp = kind === 'over' ? { kind, k: rng.int(2, 12) } : kind === 'under' ? { kind, k: a + 4 * d + rng.int(1, d) } : { kind };
    const c: IndClaim = { skin: sk, a, d, prop };
    if (firstHolds(c) !== want.first || stepHolds(c) !== want.step) continue;
    if (want.under && !CHECKED.every((n) => caseHolds(c, n))) continue;
    return c;
  }
  throw new Error(`makeClaim: no ${skinId} claim for ${JSON.stringify(want)}`);
}
const pickSkin = (rng: Rng, skin: ProofSkin) => rng.pick(IND_BY_SKIN[skin]);

// =====================================================================================================================
// The items
// =====================================================================================================================

/** A made item and the claim (and argument) it shows (for the tests, which work every answer out again). */
export interface IndMade extends ProofMade {
  claim: IndClaim;
  arg?: IndArg;
}

function made(tag: string, kind: ProofKind, item: ItemCore, claim: IndClaim, arg?: IndArg): IndMade {
  syncWhyWrong(item);
  return { tag, kind, item, claim, ...(arg ? { arg } : {}) };
}

/** A claim with its two parts: which two of four true lines prove it for every case? */
export function twoPartsItem(rng: Rng, o: { skin: ProofSkin }): IndMade {
  const c = makeClaim(rng, pickSkin(rng, o.skin), { first: true, step: true });
  const far = rng.int(8, 12);
  const kinds = rng.shuffle(['first', 'step', 'checks', 'far'] as const);
  const text: Record<(typeof kinds)[number], string> = {
    first: firstLine(c, false),
    step: stepLine(c, false),
    checks: checksLine(c, [2, 3, 4]),
    far: `${cap(c.skin.count(far, valueAt(c, far)))}, and ${valueAt(c, far)} is ${numWord(c)}.`,
  };
  const at = (k: (typeof kinds)[number]) => kinds.indexOf(k) + 1;
  const pair = (x: (typeof kinds)[number], y: (typeof kinds)[number]) => {
    const [i, j] = [at(x), at(y)].sort((p, q) => p - q);
    return `Lines ${i} and ${j}`;
  };
  const N = c.skin.noun;
  const feedback: Record<string, ChoiceFeedback> = {
    checks: {
      headline: 'Checked cases are not the step to the next.',
      detail: [`Line ${at('checks')} only checks ${c.skin.plural} 2, 3 and 4. Nothing in it reaches ${N} 5, or ${N} 50.`, `Line ${at('step')} is the step to the next. It passes the claim from each ${N} to the next one.`],
      example: caseCase(c, 5),
    },
    nofirst: {
      headline: 'These two lines have no first case.',
      detail: [`Line ${at('step')} is the step to the next. But nothing in these lines shows ${N} 1 fits.`, `Line ${at('first')} is the first case. Without it, no domino falls first.`],
      example: caseCase(c, 1),
    },
    far: {
      headline: `Line ${at('far')} is one more case, not the step to the next.`,
      detail: [`It shows only ${N} ${far}. It says nothing about ${N} ${far + 1}.`, `Line ${at('step')} is the step to the next. It reaches every ${N}.`],
      example: caseCase(c, far + 1),
    },
  };
  return made('induction', 'ind-parts', {
    kind: 'choose',
    prompt: `${settingText(c)} Claim: “${claimText(c)}” Here are four true lines. Which two prove the claim for every ${N}?`,
    scene: { kind: 'text', lines: kinds.map((k, i) => `Line ${i + 1}: ${text[k]}`) },
    choices: rng.shuffle<Choice>([
      { id: 'proof', label: pair('first', 'step') },
      { id: 'checks', label: pair('first', 'checks') },
      { id: 'nofirst', label: pair('step', 'checks') },
      { id: 'far', label: pair('first', 'far') },
    ]),
    answer: 'proof',
    explain: `Line ${at('first')} is the first case. Line ${at('step')} is the step to the next. Together they reach every ${N}, like a line of dominoes.`,
    feedback,
    hint: 'Here is one case, checked. Which line starts the dominoes? Which line makes each one knock over the next?',
    hintCase: caseCase(c, 2),
    teach: indTeach(c, 'A domino proof needs two parts: the first case, and the step to the next. Checked cases are only examples.'),
    seconds: PROOF_SECONDS,
  }, c);
}

export const MISSING_LABEL = { first: 'The first case', step: 'The step to the next', none: 'Nothing. It has both parts.', more: 'A few more checked cases' } as const;

/** A try at a proof with one part missing: which part? */
export function missingPartItem(rng: Rng, o: { skin: ProofSkin; shape?: 'nofirst' | 'nostep' }): IndMade {
  const shape = o.shape ?? rng.pick(['nofirst', 'nostep'] as const);
  const sid = pickSkin(rng, o.skin);
  // The part that is shown holds; the missing one holds or fails, and the claim with it.
  const otherHolds = rng.chance(0.5);
  const c = shape === 'nofirst' ? makeClaim(rng, sid, { first: otherHolds, step: true }) : makeClaim(rng, sid, { first: true, step: otherHolds });
  const g: IndArg = { claim: c, first: shape === 'nostep', step: shape === 'nofirst' ? 'shown' : 'none' };
  const answer = g.first ? 'step' : 'first';
  const N = c.skin.noun;
  const fail = firstFail(c);
  const shownPart = g.first ? 'the first case' : 'the step to the next';
  const missing = g.first ? 'the step to the next' : 'the first case';
  const consequence = g.first
    ? fail
      ? `And the claim does break: ${breakText(c, fail)}.`
      : `Nothing shows that each ${N} passes the claim to the next.`
    : !firstHolds(c)
      ? `And the first case is false: ${c.skin.count(1, c.a)}, and ${c.a} is not ${numWord(c)}.`
      : `Nothing shows that ${N} 1 fits, so no domino is pushed.`;
  const example = g.first ? caseCase(c, fail ?? 2) : caseCase(c, 1);
  const feedback: Record<string, ChoiceFeedback> = {
    none: { headline: `It has only one of the two parts: ${shownPart}.`, detail: [`It never shows ${missing}.`, consequence], example },
    more: { headline: 'More checked cases never finish the line.', detail: ['Checked cases are only examples. They stop where the checking stops.', `What is missing is ${missing}.`], example },
    [g.first ? 'first' : 'step']: {
      headline: `It does have ${shownPart}.`,
      detail: [`Look for the line that starts “${g.first ? 'First case' : 'Step to the next'}.”`, `What is missing is ${missing}. ${consequence}`],
      example,
    },
  };
  return made('induction', 'ind-missing', {
    kind: 'choose',
    prompt: `${settingText(c)} Here is a try at a domino proof. Which part is missing?`,
    scene: argScene(g),
    choices: rng.shuffle<Choice>((['first', 'step', 'none', 'more'] as const).map((id) => ({ id, label: MISSING_LABEL[id] }))),
    answer,
    explain: `It shows ${shownPart}, but never ${missing}. ${consequence}`,
    feedback,
    hint: 'Here is one case, checked. A domino proof needs two parts. Look for each one in the lines.',
    hintCase: caseCase(c, 3),
    teach: indTeach(c, 'A domino proof needs both parts. With no first case, no domino falls first. With no step to the next, the line stops.'),
    seconds: PROOF_SECONDS,
  }, c, g);
}

export type ProvesShape = 'both' | 'nofirst' | 'nostep' | 'checks';

/** Does this argument prove the claim for every case? The trap: checked cases offered as the step to the next. */
export function provesEveryItem(rng: Rng, o: { skin: ProofSkin; shape?: ProvesShape }): IndMade {
  const shape = o.shape ?? rng.pick<ProvesShape>(['both', 'nofirst', 'nostep', 'checks']);
  const sid = pickSkin(rng, o.skin);
  const c =
    shape === 'both' ? makeClaim(rng, sid, { first: true, step: true })
    : shape === 'nofirst' ? makeClaim(rng, sid, { first: rng.chance(0.5), step: true })
    : shape === 'nostep' ? makeClaim(rng, sid, { first: true, step: rng.chance(0.5) })
    : rng.chance(0.5) ? makeClaim(rng, sid, { first: true, step: true }) : makeClaim(rng, sid, { first: true, step: false, under: true });
  const g: IndArg = { claim: c, first: shape !== 'nofirst', step: shape === 'both' || shape === 'nofirst' ? 'shown' : shape === 'checks' ? 'checks' : 'none' };
  const answer = argProves(g) ? 'yes' : !g.first ? 'nofirst' : 'nostep';
  const N = c.skin.noun;
  const fail = firstFail(c);
  const choices: Choice[] = [
    { id: 'yes', label: 'Yes. It shows the first case and the step to the next.' },
    { id: 'nofirst', label: 'No. It never shows the first case.' },
    { id: 'nostep', label: 'No. It never shows that each case passes the claim to the next.' },
    { id: 'checked', label: shape === 'checks' ? 'Yes. Every case it checked fits the claim.' : 'Not yet. It must check more cases first.' },
  ];
  const later = fail ? caseCase(c, fail) : caseCase(c, 6);
  const feedback: Record<string, ChoiceFeedback> = {};
  if (answer !== 'yes') {
    feedback.yes = g.step === 'checks'
      ? { headline: 'Its step to the next only checks cases.', detail: [`It checks ${c.skin.plural} 2, 3, 4 and 5. Nothing shows ${N} 6 must fit.`, fail ? `And the claim breaks: ${breakText(c, fail)}.` : 'The claim may be true, but this does not prove it.'], example: later }
      : !g.first
        ? { headline: 'It has no first case.', detail: [`It shows the step to the next, but never that ${N} 1 fits.`, firstHolds(c) ? `${cap(c.skin.count(1, c.a))}. A proof must say so.` : `And ${c.skin.count(1, c.a)}, so the claim is false.`], example: caseCase(c, 1) }
        : { headline: 'It has no step to the next.', detail: [`It shows the first case, but never that each ${N} passes the claim on.`, fail ? `And the claim breaks: ${breakText(c, fail)}.` : 'The claim may be true, but this does not prove it.'], example: later };
  } else {
    feedback.nofirst = { headline: 'It does show the first case.', detail: [`That is this line: “${firstLine(c)}”`, 'Both parts are there, so it proves every case.'], example: caseCase(c, 1) };
    feedback.nostep = { headline: 'It does show the step to the next.', detail: ['Look for the line that starts “Step to the next.”', 'Both parts are there, so it proves every case.'], example: caseCase(c, 2) };
  }
  if (answer !== 'nofirst' && !feedback.nofirst) feedback.nofirst = { headline: 'It does show the first case.', detail: [`That is this line: “${firstLine(c)}”`, answer === 'nostep' ? 'What is missing is the step to the next.' : ''].filter(Boolean), example: caseCase(c, 1) };
  if (answer !== 'nostep' && !feedback.nostep) feedback.nostep = { headline: 'It does show the step to the next.', detail: ['Look for the line that starts “Step to the next.”', 'What is missing is the first case.'], example: caseCase(c, 1) };
  feedback.checked = shape === 'checks'
    ? { headline: 'Checked cases are only examples. They are not the step to the next.', detail: [`It checks ${c.skin.plural} 2, 3, 4 and 5. Nothing shows ${N} 6 must fit.`, fail ? `And it does not: ${breakText(c, fail)}.` : 'Only the step to the next reaches every case.'], example: later }
    : { headline: 'More checked cases never prove every case.', detail: ['Checked cases stop where the checking stops.', answer === 'yes' ? 'This proof needs no more cases: it has both parts.' : `What is missing is ${answer === 'nofirst' ? 'the first case' : 'the step to the next'}.`], example: later };
  const explain = answer === 'yes'
    ? `It shows the first case, and the step to the next. Like dominoes, the claim reaches every ${N}.`
    : g.step === 'checks'
      ? `It checks ${c.skin.plural} 2 to 5, but never shows that each ${N} passes the claim to the next. ${fail ? `In fact, the claim breaks at ${N} ${fail}.` : 'So it is not a proof yet.'}`
      : !g.first
        ? `It never shows the first case. ${firstHolds(c) ? 'Nothing pushes the first domino.' : `In fact, ${c.skin.count(1, c.a)}, so the claim is false.`}`
        : `It never shows the step to the next. ${fail ? `In fact, the claim breaks at ${N} ${fail}.` : 'So the line of dominoes may stop.'}`;
  return made('induction', 'ind-proves', {
    kind: 'choose',
    prompt: `${settingText(c)} Does this argument prove the claim for every ${N}?`,
    scene: argScene(g),
    choices,
    answer,
    explain,
    feedback,
    hint: 'Here is one case, checked. Look for the two parts: the first case, and the step to the next.',
    hintCase: caseCase(c, 2),
    teach: indTeach(c, 'An argument proves every case only with both parts: the first case, and the step to the next. Checked cases are only examples.'),
    ...(shape === 'checks' ? { tags: [TRAPS.induction.tag], conflict: true } : {}),
    seconds: PROOF_SECONDS,
  }, c, g);
}

/** The closing why item for this lesson: why do the two parts prove every case? */
export function inductionWhyItem(rng: Rng, o: { skin?: ProofSkin } = {}): IndMade {
  const skin = o.skin ?? rng.pick(['everyday', 'fantasy', 'abstract'] as const);
  const c = makeClaim(rng, pickSkin(rng, skin), { first: true, step: true });
  const g: IndArg = { claim: c, first: true, step: 'shown' };
  const N = c.skin.noun;
  return made('why', 'why', {
    kind: 'choose',
    prompt: `${settingText(c)} Here is a domino proof. Why does it prove the claim for every ${N}?`,
    scene: argScene(g),
    choices: rng.shuffle<Choice>([
      { id: 'both', label: 'Because the first case holds, and each case passes the claim to the next.' },
      { id: 'checked', label: 'Because it checked the first few cases.' },
      { id: 'first', label: 'Because the claim holds for the first case.' },
      { id: 'adds', label: 'Because each case adds the same amount.' },
    ]),
    answer: 'both',
    explain: `The first case pushes the first domino. The step to the next makes each ${N} knock over the next one. So the claim reaches every ${N}.`,
    feedback: {
      checked: { headline: 'This proof does not check cases one by one.', detail: ['Checked cases stop where the checking stops.', `The step to the next never stops: it passes the claim from any ${N} to the next one.`], example: caseCase(c, 2) },
      first: { headline: 'The first case alone is not enough.', detail: ['It pushes the first domino.', `The step to the next makes each ${N} knock over the next one. A proof needs both.`], example: caseCase(c, 1) },
      adds: { headline: 'Adding the same amount is not the whole reason.', detail: [`Adding ${c.d} matters because of this: ${stepReason(c)}`, 'And the proof still needs the first case.'], example: caseCase(c, 2) },
    },
    hint: 'Here is one case, checked. What makes the claim reach the next case, and the one after that?',
    hintCase: caseCase(c, 3),
    teach: indTeach(c, 'A domino proof works because the first case holds, and the step to the next passes the claim on, case after case.'),
    tags: [WHY_TAG],
    seconds: PROOF_SECONDS,
  }, c, g);
}

// =====================================================================================================================
// Cards and boards (See -> Do)
// =====================================================================================================================

/** Checked cases vs the step to the next: both can start from the first case, but only the step reaches every case. */
export const CHECKS_VS_STEP: Distinction = {
  id: 'checks-vs-step',
  a: 'Checked cases: the claim holds for the cases you looked at.',
  b: 'The step to the next: if the claim holds for one case, it holds for the next.',
};
export const L7_CARDS = { contrast: 2, example: 3 } as const;

/** The worked claim: Rule Rise's center-and-pairs staircase, every step odd. */
export const WORKED_STAIR: IndClaim = { skin: IND_SKINS.stair, a: stairCount(PAIRS, 1), d: PAIRS.per, prop: { kind: 'odd' } };
/** Its twin for the board: the gold-tile staircase, which adds a group of 4. */
export const TWIN_STAIR: IndClaim = { skin: IND_SKINS.stair, a: stairCount(CONSTRUCTIONS.post, 1), d: CONSTRUCTIONS.post.per, prop: { kind: 'odd' } };
/** The parts board's claim: Leo’s coin jar, every week odd. */
export const JAR_CLAIM: IndClaim = { skin: IND_SKINS.jar, a: 5, d: 2, prop: { kind: 'odd' } };

const stairOf = (c: IndClaim) => constructionFor(c.a, c.d);
/** The worked staircase: steps 1 to 3 drawn, with their counts. */
export const inductionWorkedScene = (c: IndClaim = WORKED_STAIR): Scene =>
  stairScene(stairOf(c), [1, 2, 3], [1, 2, 3].map((n) => ({ step: n, count: valueAt(c, n) })));

export function inductionContrast(): Extract<Scene, { kind: 'contrast' }> {
  const c = WORKED_STAIR;
  const panel = (g: IndArg): ContrastPanel => {
    const ok = argProves(g);
    return {
      world: firstLine(c),
      who: 'Then',
      says: g.step === 'shown' ? stepLine(c) : checksLine(c, [2, 3, 4]),
      truth: ok,
      because: ok ? 'This passes the claim from each step to the next. So it reaches every step.' : 'These are only more cases. Nothing says step 5 fits, or step 50.',
      then: ok ? 'Every step is odd. That is proved.' : 'Not proved yet.',
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel({ claim: c, first: true, step: 'shown' }), panel({ claim: c, first: true, step: 'checks' })],
    ask: { q: 'Both start with step 1. Which one proves every step?', a: 'Only the first. The step to the next reaches every step. Checked cases stop where the checking stops.' },
    words: { worldTag: 'First case', saysWord: 'then:', truth: 'Proves every step', untruth: 'Not a proof' },
  };
}

const CS_CLOSING = 'Those two ideas are apart now. Back to the board: look for the first case, then for the step to the next.';
const CHECKS_AS_STEP =
  'You may be treating checked cases and the step to the next as the same thing. They are two different things. Checked cases stop where the checking stops. The step to the next passes the claim from any case to the next one.';
const STEP_AS_PROOF = 'You may be treating the step to the next and a whole proof as the same thing. The step passes the claim on, but something must start it. A proof needs the first case too.';
export const CHECKS_STEP_Q: ConfusedQuestion = {
  q: 'Five cases were checked, and all fit. Is that the step to the next?',
  options: [{ label: 'No. The step shows each case passes the claim to the next', right: true }, { label: 'Yes. Five cases are enough' }, { label: 'Not sure' }],
  teach: 'No. Checked cases are only examples. The next case could still break the claim. The step to the next shows that any case that fits passes it on to the next one.',
};

/** Do, right after the contrast: three tries at a proof about the coin jar. Which parts does each have? Does it prove the claim? */
export function inductionPartsBoard(): DrillStep {
  const c = JAR_CLAIM;
  const args: IndArg[] = [
    { claim: c, first: true, step: 'checks' },
    { claim: c, first: false, step: 'shown' },
    { claim: c, first: true, step: 'shown' },
  ];
  const rows: DrillRow[] = args.map((g, k) => {
    const id = `t${k + 1}`;
    const lines = argLines(g).slice(1);
    const hasStep = g.step === 'shown';
    const ok = argProves(g);
    return {
      id,
      label: `Try ${k + 1}: ${lines.join(' ')}`,
      marks: [
        { id: `${id}-first`, label: 'Has the first case?', options: [...YES_NO], answer: g.first ? 'yes' : 'no', why: g.first ? whyFor('no', `It does: “${firstLine(c)}”`) : whyFor('yes', 'No line shows week 1.') },
        { id: `${id}-step`, label: 'Has the step to the next?', options: [...YES_NO], answer: hasStep ? 'yes' : 'no', why: hasStep ? whyFor('no', `It does: “${stepLine(c)}”`) : whyFor('yes', g.step === 'checks' ? `Its line called “Step to the next” only checks weeks ${CHECKED[0]} to ${CHECKED[CHECKED.length - 1]}. Checked weeks are not the step to the next.` : 'No line passes the claim from one week to the next.') },
        { id: `${id}-proves`, label: 'Proves every week?', options: [...YES_NO], answer: ok ? 'yes' : 'no', why: ok ? whyFor('no', 'It has both parts, so it proves every week.') : whyFor('yes', `It is missing ${g.first ? 'the step to the next' : 'the first case'}.`) },
      ],
    };
  });
  const misconceptions: Misconception[] = [
    { id: 'checks-as-step', when: 'picks', picks: { 't1-step': 'yes' }, text: CHECKS_AS_STEP },
    { id: 'step-as-proof', when: 'picks', picks: { 't2-proves': 'yes' }, text: STEP_AS_PROOF },
  ];
  return {
    id: 's11.l7-do-parts',
    title: 'Which parts are there?',
    body: [`${settingText(c)} Claim: “${claimText(c)}”`, 'For each try, mark the parts it has. Then: does it prove every week?'],
    scene: inductionContrast(),
    afterCard: L7_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { closing: CS_CLOSING },
    misconceptions,
    confused: [CHECKS_STEP_Q],
    distinction: CHECKS_VS_STEP.id,
    done: 'Right. Only try 3 has both parts. Checked cases are not the step, and the step alone has nothing to start it.',
  };
}

/** Do, right after the example: the gold-tile staircase. Find the first case and the step to the next. */
export function inductionTwinBoard(): DrillStep {
  const c = TWIN_STAIR;
  const v1 = c.a;
  const p = c.prop.kind === 'odd' ? 'odd' : 'even';
  // What an odd number plus d is, worked out for every odd number up to 99.
  const plus = [...Array(50)].map((_, i) => 2 * i + 1).every((x) => (x + c.d) % 2 === 1) ? 'odd' : 'even';
  const g: IndArg = { claim: c, first: true, step: 'shown' };
  const ok = argProves(g);
  const rows: DrillRow[] = [
    {
      id: 'count',
      label: 'First case: step 1.',
      marks: [{ id: 'count', label: 'How many tiles?', options: [v1 - 1, v1, v1 + 1].map((v) => ({ id: String(v), label: String(v) })), answer: String(v1), why: { [String(v1 - 1)]: `Step 1 has the gold tile and one group of ${c.d}: ${v1} tiles.`, [String(v1 + 1)]: `Step 1 has the gold tile and one group of ${c.d}: ${v1} tiles.` } }],
    },
    {
      id: 'first',
      label: `Step 1 has ${v1} tiles.`,
      marks: [{ id: 'first', label: `Is ${v1} ${p}?`, options: [...YES_NO], answer: propHolds(c.prop, v1) ? 'yes' : 'no', why: { [propHolds(c.prop, v1) ? 'no' : 'yes']: `${v1} makes ${Math.floor(v1 / 2)} pairs with ${v1 % 2} left over, so ${v1} is ${v1 % 2 ? 'odd' : 'even'}.` } }],
    },
    {
      id: 'step',
      label: `Step to the next: the next step has ${c.d} more tiles.`,
      marks: [{ id: 'step', label: `An odd number plus ${c.d} is`, options: [{ id: 'odd', label: 'Odd' }, { id: 'even', label: 'Even' }], answer: plus, why: { [plus === 'odd' ? 'even' : 'odd']: `Try one: 5 plus ${c.d} is ${5 + c.d}, which is ${plus}.` } }],
    },
    {
      id: 'proved',
      label: `Claim: ${claimText(c)}`,
      marks: [{ id: 'proved', label: 'Is it proved for every step?', options: [...YES_NO], answer: ok ? 'yes' : 'no', why: ok ? whyFor('no', 'Both parts hold: the first case, and the step to the next. So every step is odd.') : whyFor('yes', 'One part fails, so it is not proved.') }],
    },
  ];
  return {
    id: 's11.l7-do-twin',
    title: 'Push the first domino',
    body: [stairOf(c).says, 'Find the first case. Then check the step to the next. Is every step odd?'],
    scene: inductionWorkedScene(c),
    twin: 'A new staircase: each step adds a group of 4.',
    afterCard: L7_CARDS.example,
    rows,
    done: `Right. Step 1 has ${v1} tiles, which is odd. Each step adds ${c.d}, and an odd number plus ${c.d} is odd. So every step is odd.`,
  };
}
