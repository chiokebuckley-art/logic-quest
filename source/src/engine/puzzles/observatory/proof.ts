/**
 * Ring 4 of the Pattern Observatory, Proof Lantern (stop 17, Track 4: Evidence and uncertainty). The generators and
 * their models; the stop file (src/content/stop17.ts) puts the places together.
 *
 *  l1 Proved or a guess?   circle regions (1, 2, 4, 8, 16, then 31 and the hexagon's 30); sort a claim as proved (a
 *                          reason covers every case of a stated rule), a good guess (only examples) or false (a case
 *                          breaks it); a fair coin has no memory; a few faster days do not prove a lasting change.
 *  l2 Break it or test it  counterexamples (in the claim's group, and the claim fails); a test that tells two rules
 *                          apart; which finding would rule a claim out; which test tells two reasons apart.
 *  l3 Why it must continue a stated rule (start at a, add d) and why odd and even take turns: the reason chain, far
 *                          terms, jumps between terms, and the same reason in new settings.
 *
 * Every answer is computed from a model here (claims checked term by term, the region count from the drawing, a coin
 * enumerated, two rules applied, odd and even from the rule), and the tests check each one a second way.
 */
import { syncWhyWrong } from '../../teach';
import type { Choice, ChoiceFeedback, ChooseItem, ErrorTag, ItemMeta, MultiItem, NumberItem, Phase, Rng, Scene, Teach, TeachCase } from '../../types';
import type { LanternRow, LanternScene, LanternStatus } from '../../scenes/lantern';
import { lanternPoints, maxRegions, regionsOf } from './lantern';

export const STOP = 17;
export const L1 = 's17.l1';
export const L2 = 's17.l2';
export const L3 = 's17.l3';

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "1, 2, 4 and 8": a list in a sentence. */
export const list = (xs: readonly (number | string)[]): string =>
  xs.length <= 1 ? String(xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
/** "1, 2, 4, 8": a sequence as a label. */
export const seqText = (xs: readonly number[]) => xs.join(', ');
export type Parity = 'odd' | 'even';
export const par = (x: number): Parity => (Math.abs(x) % 2 === 1 ? 'odd' : 'even');
export const otherPar = (p: Parity): Parity => (p === 'odd' ? 'even' : 'odd');
const anArticle = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const STATUS_WORD: Record<LanternStatus, string> = { proved: 'Proved', tentative: 'A good guess', false: 'False' };
const STATUS_LOW: Record<LanternStatus, string> = { proved: 'proved', tentative: 'a good guess', false: 'false' };
export const STATUSES: readonly LanternStatus[] = ['proved', 'tentative', 'false'];

const YES_WORDS = { truth: 'yes', untruth: 'no' } as const;

// ---------- the item builder ----------

export interface Spec {
  lesson: string;
  skill: string;
  phase: Phase;
  level: 1 | 2 | 3 | 4;
  twin: string;
  metaSkill: string;
  rule: string;
  task: string;
  rep: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  rubric?: { level: 0 | 1 | 2 | 3; text: string };
  alternatives?: string[];
}

export interface Parts {
  prompt: string;
  scene?: Scene;
  explain: string;
  teach: Teach;
  hints: string[];
  hintCase: TeachCase;
  errorTags?: Record<string, ErrorTag>;
  frame?: string;
  tags?: string[];
}

/** Where an item goes and how it is pitched: every generator takes these. */
export interface Place {
  lesson?: string;
  phase?: Phase;
  level?: 1 | 2 | 3 | 4;
}

function metaOf(spec: Spec, answerType: ItemMeta['answerType'], errorTags: Record<string, ErrorTag>): ItemMeta {
  return {
    skill: spec.metaSkill,
    rule: spec.rule,
    task: spec.task,
    representation: spec.rep,
    difficulty: spec.difficulty,
    answerType,
    ...(spec.alternatives?.length ? { alternatives: spec.alternatives } : {}),
    ...(spec.rubric ? { rubric: spec.rubric.text } : {}),
    tags: [...new Set(Object.values(errorTags))],
    twin: spec.twin,
    phase: spec.phase,
  };
}

function common(spec: Spec, p: Parts, answerType: ItemMeta['answerType']) {
  const errorTags = p.errorTags ?? {};
  return {
    id: '',
    stop: STOP,
    lesson: spec.lesson,
    skill: spec.skill,
    prompt: p.prompt,
    ...(p.scene ? { scene: p.scene } : {}),
    explain: p.explain,
    teach: p.teach,
    hint: p.hints[0],
    hints: p.hints,
    hintCase: p.hintCase,
    phase: spec.phase,
    level: spec.level,
    twin: spec.twin,
    errorTags,
    meta: metaOf(spec, answerType, errorTags),
    ...(p.frame ? { frame: p.frame } : {}),
    ...(p.tags?.length ? { tags: p.tags } : {}),
    ...(spec.rubric ? { rubric: spec.rubric.level } : {}),
  };
}

/** A choose item. Choices are shuffled when an rng is given; ids stay fixed, so feedback always matches. */
function choose(rng: Rng | null, spec: Spec, p: Parts, choices: Choice[], answer: string, feedback: Record<string, ChoiceFeedback>): ChooseItem {
  const fb: Record<string, ChoiceFeedback> = {};
  for (const c of choices) if (c.id !== answer && feedback[c.id]) fb[c.id] = feedback[c.id];
  const errorTags = Object.fromEntries(Object.entries(p.errorTags ?? {}).filter(([k]) => k !== answer && choices.some((c) => c.id === k)));
  const item: ChooseItem = { kind: 'choose', ...common(spec, { ...p, errorTags }, 'categorical'), choices: rng ? rng.shuffle(choices) : choices, answer, feedback: fb };
  return syncWhyWrong(item);
}

const lanternCard = (s: Omit<LanternScene, 'kind' | 'points' | 'chords'>): LanternScene => ({ kind: 'lantern', points: 0, chords: false, ...s });

// =====================================================================================================================
// l1 · Proved or a guess?
// =====================================================================================================================

// ---------- circle regions ----------

/** The counts for 1 to 6 points with no three chords meeting, from the drawing itself: 1, 2, 4, 8, 16, 31. */
export const COUNTS: readonly number[] = range(1, 6).map((n) => regionsOf(lanternPoints(n, false)));
/** The doubling guess for 6 points (double the count for 5). */
export const GUESS = 2 * COUNTS[4];
/** The most regions for 6 points (no three chords meet), and the regular hexagon's count (three chords meet). */
export const MOST6 = COUNTS[5];
export const HEX = regionsOf(lanternPoints(6, true));
/** 5 evenly spaced points: no three chords meet, so they still make the most. */
export const PENTA = regionsOf(lanternPoints(5, true));

export const CIRCLE_STATED = 'Join every pair of points on a circle. No three chords meet at one point.';

/** Card: add one point at a time and count (1 to 5 points). */
export function buildScene(): LanternScene {
  return {
    kind: 'lantern',
    points: 1,
    chords: true,
    regions: COUNTS[0],
    stated: CIRCLE_STATED,
    sequence: [COUNTS[0]],
    steps: range(2, 5).map((n) => ({
      label: `Add point ${n}`,
      say: n < 5
        ? `${n} points: ${COUNTS[n - 1]} regions.`
        : `${n} points: ${COUNTS[n - 1]} regions. So far, each count is double the one before.`,
    })),
    frames: range(2, 5).map((n) => ({ points: n, regions: COUNTS[n - 1], sequence: COUNTS.slice(0, n) })),
  };
}

/** Card: the lantern guesses 32; the drawing of 6 points shows 31. */
export function guessScene(): LanternScene {
  return {
    kind: 'lantern',
    points: 5,
    chords: true,
    regions: COUNTS[4],
    stated: CIRCLE_STATED,
    sequence: COUNTS.slice(0, 5),
    claim: `6 points will give ${GUESS} regions.`,
    steps: [
      { label: 'Make the guess', say: `The counts double, so the lantern guesses ${GUESS}. Five counts fit, but no reason says the next must double.` },
      { label: 'Draw 6 points', say: `Draw 6 points with no three chords meeting. Count: ${MOST6} regions, not ${GUESS}. The guess was false.` },
    ],
    frames: [
      { status: 'tentative' },
      { points: 6, regions: MOST6, sequence: COUNTS.slice(0, 6), status: 'false' },
    ],
  };
}

/** Card: the most for 6 points is 31, and it needs no three chords meeting; the regular hexagon has 30. */
export function hexScene(): LanternScene {
  return {
    kind: 'lantern',
    points: 6,
    chords: true,
    regions: MOST6,
    stated: 'Join every pair of 6 points. Where do the chords meet?',
    steps: [
      { label: 'Space the points evenly', say: `Now three long chords meet at one point in the middle. A small region there is lost. This drawing has ${HEX}.` },
      { label: 'Compare the two', say: `The same 6 points give ${MOST6} or ${HEX}. Only a drawing with no three chords meeting shows ${MOST6}, the most.` },
    ],
    frames: [{ regular: true, regions: HEX }],
  };
}

// ---------- claims: proved, a good guess, or false ----------

/** What a claim says about every number: odd, even, or more than k. */
export type Prop = { t: 'odd' } | { t: 'even' } | { t: 'over'; k: number };
export const holds = (p: Prop, x: number): boolean => (p.t === 'over' ? x > p.k : par(x) === p.t);
export const propWords = (p: Prop): string => (p.t === 'over' ? `more than ${p.k}` : p.t);
const notWords = (p: Prop, x: number) => `${x} is not ${propWords(p)}`;

/** Where seen numbers come from (an observed pattern: no rule is given). */
export const SEEN = [
  { intro: 'A scoreboard showed', noun: 'scores', where: 'Scores on a scoreboard.' },
  { intro: 'Kim counted birds at a feeder each day:', noun: 'counts', where: 'Birds at a feeder, one count a day.' },
  { intro: 'A class counted cars going by each minute:', noun: 'counts', where: 'Cars going by, one count a minute.' },
  { intro: 'Ben wrote down the pages he read each night:', noun: 'page counts', where: 'Pages read, one count a night.' },
  { intro: 'A shop wrote down the hats it sold each day:', noun: 'counts', where: 'Hats sold, one count a day.' },
] as const;

/** A claim and what we know: a stated rule (start, step) and its first terms, or only numbers seen. */
export interface ClaimModel {
  source: 'rule' | 'seen';
  start: number;
  step: number;
  shown: number[];
  prop: Prop;
  /** Which SEEN context (source 'seen'). */
  seen: number;
}

export const termOf = (a: number, d: number, n: number) => a + (n - 1) * d;
export const termsOf = (a: number, d: number, count: number) => range(1, count).map((n) => termOf(a, d, n));

/** A reason that covers every term of the stated rule (the claim then holds for every term, not just these). */
export function provedByReason(m: ClaimModel): boolean {
  if (m.source !== 'rule') return false;
  if (m.prop.t === 'over') return m.start > m.prop.k && m.step >= 0;
  return m.step % 2 === 0 && holds(m.prop, m.start);
}

/** The verdict, computed: a shown case breaks it (false); a reason for every term of a stated rule (proved); only seen numbers that fit (a good guess). */
export function statusOf(m: ClaimModel): LanternStatus | null {
  if (m.shown.some((x) => !holds(m.prop, x))) return 'false';
  if (m.source === 'seen') return 'tentative';
  return provedByReason(m) ? 'proved' : null;
}

export const breakerOf = (m: ClaimModel) => m.shown.find((x) => !holds(m.prop, x));

export function claimText(m: ClaimModel): string {
  return m.source === 'rule' ? `Every term is ${propWords(m.prop)}.` : `The ${SEEN[m.seen].noun} are always ${propWords(m.prop)}.`;
}
export const ruleText = (a: number, d: number) => `start at ${a} and add ${d} each time`;

/** The reason in words, for a proved claim. */
export function reasonText(m: ClaimModel): string {
  if (m.prop.t === 'over') return `Start at ${m.start}, which is more than ${m.prop.k}. Each step adds ${m.step}, so the terms only grow. So every term is more than ${m.prop.k}.`;
  const p = m.prop.t;
  return `Start at ${m.start}, which is ${p}. Adding ${m.step}, an even number, keeps a number ${p}. That happens at every step, so every term is ${p}.`;
}

function pickProp(rng: Rng): Prop {
  return rng.pick<Prop>([{ t: 'odd' }, { t: 'even' }, { t: 'over', k: rng.pick([5, 10, 20]) }]);
}
const oddIn = (rng: Rng, lo: number, hi: number) => rng.pick(range(lo, hi).filter((x) => x % 2 === 1));
const evenIn = (rng: Rng, lo: number, hi: number) => rng.pick(range(lo, hi).filter((x) => x % 2 === 0));

/** A claim model with the wanted verdict (checked with statusOf before it is returned). */
export function makeClaim(rng: Rng, status: LanternStatus, o: { source?: 'rule' | 'seen' } = {}): ClaimModel {
  for (let tries = 0; tries < 200; tries++) {
    const prop = pickProp(rng);
    const count = rng.int(4, 5);
    const seen = rng.int(0, SEEN.length - 1);
    let m: ClaimModel;
    if (status === 'proved') {
      if (prop.t === 'over') {
        const a = rng.int(prop.k + 1, prop.k + 9);
        const d = rng.int(2, 6);
        m = { source: 'rule', start: a, step: d, shown: termsOf(a, d, count), prop, seen };
      } else {
        const a = prop.t === 'odd' ? oddIn(rng, 1, 15) : evenIn(rng, 2, 16);
        const d = rng.pick([2, 4, 6, 8, 10]);
        m = { source: 'rule', start: a, step: d, shown: termsOf(a, d, count), prop, seen };
      }
    } else if (status === 'tentative') {
      if (prop.t === 'over') {
        let x = rng.int(prop.k + 1, prop.k + 8);
        const shown = [x];
        while (shown.length < count) shown.push((x += rng.int(1, 4)));
        m = { source: 'seen', start: 0, step: 0, shown, prop, seen };
      } else {
        const a = prop.t === 'odd' ? oddIn(rng, 1, 15) : evenIn(rng, 2, 16);
        m = { source: 'seen', start: 0, step: 0, shown: termsOf(a, rng.pick([2, 4]), count), prop, seen };
      }
    } else {
      const source = o.source ?? (rng.chance(0.5) ? 'rule' : 'seen');
      if (source === 'rule') {
        // A stated rule that flips odd and even: its own term 2 breaks "every term is odd" (or even).
        const p: Prop = rng.chance(0.5) ? { t: 'odd' } : { t: 'even' };
        const a = p.t === 'odd' ? oddIn(rng, 1, 15) : evenIn(rng, 2, 16);
        const d = rng.pick([1, 3, 5]);
        m = { source: 'rule', start: a, step: d, shown: termsOf(a, d, count), prop: p, seen };
      } else {
        const base = prop.t === 'over'
          ? (() => { let x = rng.int(prop.k + 1, prop.k + 6); const s = [x]; while (s.length < count) s.push((x += rng.int(1, 4))); return s; })()
          : termsOf(prop.t === 'odd' ? oddIn(rng, 1, 15) : evenIn(rng, 2, 16), 2, count);
        const at = rng.int(1, count - 1);
        const shown = [...base];
        // One number that breaks it, still between its neighbours where it can be.
        shown[at] = prop.t === 'over' ? rng.int(Math.max(1, prop.k - 3), prop.k) : shown[at] + 1;
        m = { source: 'seen', start: 0, step: 0, shown, prop, seen };
      }
    }
    if (statusOf(m) === status && new Set(m.shown).size === m.shown.length) return m;
  }
  throw new Error(`no claim for ${status}`);
}

/** The claim card for a claim model (no verdict: the question asks for it). */
export function claimScene(m: ClaimModel): LanternScene {
  return lanternCard({
    stated: m.source === 'rule' ? `${cap(ruleText(m.start, m.step))}.` : `${SEEN[m.seen].where} No rule was given.`,
    pattern: m.source === 'rule' ? 'constructed' : 'observed',
    rows: [{ label: m.source === 'rule' ? 'Terms' : 'Seen', cells: m.shown.map(String) }],
    claim: claimText(m),
  });
}

/** How a claim model reads in a sentence: what we know, then the claim. */
export function claimSetup(m: ClaimModel): string {
  return m.source === 'rule'
    ? `A pattern is made by a stated rule: ${ruleText(m.start, m.step)}. Its first terms are ${list(m.shown)}.`
    : `${SEEN[m.seen].intro} ${list(m.shown)}. No rule was given, so this is an observed pattern.`;
}

/** A one-line label for a claim on a board row or a teach case. */
export function claimLine(m: ClaimModel): string {
  return m.source === 'rule'
    ? `Told: ${ruleText(m.start, m.step)}. Claim: ${claimText(m).toLowerCase()}`
    : `Seen: ${list(m.shown)}. No rule. Claim: ${claimText(m).toLowerCase()}`;
}

/** Why a verdict is right, in one or two sentences. */
export function statusReason(m: ClaimModel): string {
  const s = statusOf(m);
  if (s === 'false') return `${cap(notWords(m.prop, breakerOf(m)!))}, so one case breaks the claim. It is false.`;
  if (s === 'proved') return `${reasonText(m)} A reason for every term is a proof.`;
  return `Every number seen is ${propWords(m.prop)}. But no rule was given, so the next one might not be. It is a good guess.`;
}

/** What a wrong verdict gets wrong (answer `right`, picked `wrong`). */
export function statusFeedback(m: ClaimModel, wrong: LanternStatus): ChoiceFeedback {
  const right = statusOf(m)!;
  const p = propWords(m.prop);
  const x = breakerOf(m);
  if (right === 'proved' && wrong === 'tentative') {
    return {
      headline: 'The rule is stated, and a reason covers every term, so this is more than a guess.',
      detail: [reasonText(m), 'A good guess has only examples. This claim has a reason for every term, so it is proved.'],
    };
  }
  if (right === 'proved' && wrong === 'false') {
    return {
      headline: 'No term breaks this claim, so it is not false.',
      detail: [`Check each term: ${list(m.shown)}. Each one is ${p}.`, reasonText(m)],
    };
  }
  if (right === 'tentative' && wrong === 'proved') {
    const next = m.prop.t === 'over' ? m.prop.k : m.shown[m.shown.length - 1] + 1;
    return {
      headline: 'Numbers that fit are examples, not a proof.',
      detail: [`Every number seen is ${p}. But no rule was given, so nothing makes the next one ${p}.`, 'A proof needs a reason that covers every case. Only a stated rule can give one.'],
      example: {
        label: `Seen: ${list(m.shown)}. The next one could be ${next}.`,
        truths: [{ who: 'Every number seen fits', value: true }, { who: `${next} fits`, value: false }],
        words: YES_WORDS,
        note: `${cap(notWords(m.prop, next))}. Nothing seen rules that out.`,
      },
    };
  }
  if (right === 'tentative' && wrong === 'false') {
    return {
      headline: 'No number seen breaks this claim, so it is not false yet.',
      detail: [`Each number seen is ${p}: ${list(m.shown)}.`, 'It fits so far, but no rule says it must go on. That makes it a good guess.'],
    };
  }
  if (right === 'false' && wrong === 'proved') {
    return {
      headline: `${x} breaks the claim, so it cannot be proved.`,
      detail: [`The claim says every one is ${p}. But ${notWords(m.prop, x!)}.`, 'One case that breaks a claim makes it false, even when a rule is stated.'],
    };
  }
  return {
    headline: `${x} breaks the claim, so it is false, not a guess.`,
    detail: [`${cap(notWords(m.prop, x!))}.`, 'A good guess must fit every case seen. One case that breaks it makes the claim false.'],
  };
}

/** Three fixed worked claims, one of each verdict, for teach cards and hints (computed, never hand-marked). */
export const WORKED: Record<LanternStatus, ClaimModel> = {
  proved: { source: 'rule', start: 2, step: 2, shown: termsOf(2, 2, 4), prop: { t: 'even' }, seen: 0 },
  tentative: { source: 'seen', start: 0, step: 0, shown: [3, 5, 7, 9], prop: { t: 'odd' }, seen: 0 },
  false: { source: 'seen', start: 0, step: 0, shown: [3, 5, 8, 9], prop: { t: 'odd' }, seen: 0 },
};

export function statusCase(m: ClaimModel): TeachCase {
  const s = statusOf(m)!;
  return {
    label: claimLine(m),
    truths: [{ who: 'A case breaks it', value: s === 'false' }, { who: 'A reason covers every case', value: s === 'proved' }],
    words: YES_WORDS,
    note: `So it is ${STATUS_LOW[s]}.`,
  };
}

export function teachStatus(): Teach {
  return {
    rule: 'Check a claim in two steps. If a case breaks it, it is false. If a stated rule gives a reason for every case, it is proved. If not, it is a good guess.',
    terms: [
      { word: 'A claim', meaning: 'a sentence that says something is true every time.' },
      { word: 'A good guess', meaning: 'a claim that fits every case seen, with no reason that covers every case.' },
      { word: 'A proof', meaning: 'a reason that covers every case of a stated rule.' },
      { word: 'An observed pattern', meaning: 'numbers we only saw, with no rule given.' },
    ],
    casesTitle: 'One claim of each kind',
    cases: STATUSES.map((s) => statusCase(WORKED[s])),
    remember: ['A fit is not a proof. A reason for every case is.', 'Ask: does a case break it? Is there a reason for every case?'],
    simpler: [
      'Claim: every number is odd.',
      'Told: start at 1 and add 2. Odd plus 2 is odd, every time. Proved.',
      'Seen: 1, 3 and 5, with no rule. A good guess.',
      'Seen: 1, 3 and 4. 4 is even. False.',
    ],
  };
}

const STATUS_HINTS = [
  'First, look for a case that breaks the claim.',
  'No case breaks it? Then ask: is a rule stated, with a reason for every term?',
  'Only seen numbers, with no rule, make a good guess.',
];

export interface StatusOpts extends Place {
  status?: LanternStatus;
  /** The faded item: a sentence frame with the two checks done and the verdict blank. */
  framed?: boolean;
  source?: 'rule' | 'seen';
}

/** Sort a claim: proved, a good guess, or false. */
export function statusItem(rng: Rng, o: StatusOpts = {}): ChooseItem {
  const status = o.status ?? rng.pick(STATUSES);
  const m = makeClaim(rng, status, { source: o.source });
  return statusItemOf(rng, m, o);
}

export function statusItemOf(rng: Rng, m: ClaimModel, o: StatusOpts = {}): ChooseItem {
  const status = statusOf(m)!;
  const framed = !!o.framed;
  const x = breakerOf(m);
  const label = (s: LanternStatus) => (framed ? STATUS_LOW[s] : STATUS_WORD[s]);
  const frame = !framed
    ? undefined
    : status === 'false'
      ? `${cap(notWords(m.prop, x!))}, so a case breaks it. The claim is ___.`
      : status === 'proved'
        ? 'No term breaks it. A stated rule gives a reason for every term. So the claim is ___.'
        : 'No number seen breaks it. But no rule was given. So the claim is ___.';
  const hintModel = WORKED[status === 'tentative' ? 'proved' : 'tentative'];
  return choose(
    rng,
    {
      lesson: o.lesson ?? L1, skill: 's17.proof-status', phase: o.phase ?? 'do', level: o.level ?? 2, twin: 's17.l1.status',
      metaSkill: 'Track 4 · proved, a good guess, or false',
      rule: m.source === 'rule' ? `stated rule: ${ruleText(m.start, m.step)}; claim: every term is ${propWords(m.prop)}` : `observed only: ${seqText(m.shown)}; no rule given; claim: always ${propWords(m.prop)}`,
      task: 'sort a claim as proved, a good guess or false', rep: m.source === 'rule' ? 'a stated rule and its terms' : 'numbers seen', difficulty: framed ? 2 : 3,
    },
    {
      prompt: `${claimSetup(m)} Claim: “${claimText(m)}” Is the claim proved, a good guess, or false?`,
      scene: claimScene(m),
      explain: statusReason(m),
      teach: teachStatus(),
      hints: [...STATUS_HINTS],
      hintCase: statusCase(hintModel),
      errorTags: status === 'tentative' ? { proved: 'examples-as-proof' } : status === 'false' ? { proved: 'unwarranted-certainty', tentative: 'examples-as-proof' } : {},
      frame,
      tags: status === 'tentative' ? ['examples-as-proof'] : undefined,
    },
    STATUSES.map((s) => ({ id: s, label: label(s) })),
    status,
    Object.fromEntries(STATUSES.filter((s) => s !== status).map((s) => [s, statusFeedback(m, s)])),
  );
}

// ---------- explain: why a run of examples is only a good guess (and why a reason is a proof) ----------

const GROWERS = [
  { who: 'Ana’s sunflower', verb: 'was', unit: 'inches tall', span: 'day' },
  { who: 'A puppy', verb: 'weighed', unit: 'pounds', span: 'week' },
  { who: 'The class garden’s bean vine', verb: 'was', unit: 'inches long', span: 'day' },
] as const;

const BUILDS = [
  { thing: 'A tile path', unit: 'tiles', step: 'step' },
  { thing: 'A tower of blocks', unit: 'blocks', step: 'level' },
  { thing: 'A stack of cups', unit: 'cups', step: 'row' },
] as const;

const WHY_RUBRIC = { level: 2 as const, text: '2 = a reason that covers every case, or why examples are not enough; 1 = points only at the examples; 0 = no relevant rule' };

export interface WhyGuessOpts extends Place {
  kind?: 'circle' | 'seen' | 'rule';
}

/** Explain: why a run of examples is only a good guess, or why a stated rule's reason is a proof. */
export function whyGuessItem(rng: Rng, o: WhyGuessOpts = {}): ChooseItem {
  const kind = o.kind ?? rng.pick(['circle', 'seen', 'rule'] as const);
  const spec = (rule: string, rep: string): Spec => ({
    lesson: o.lesson ?? L1, skill: 's17.why-guess', phase: o.phase ?? 'explain', level: o.level ?? 2, twin: 's17.l1.why-guess',
    metaSkill: 'Track 4 · why examples are not a proof', rule, task: 'explain why a claim is a guess or a proof', rep, difficulty: 3, rubric: WHY_RUBRIC,
  });
  const teach = teachStatus();
  const hintCase = statusCase(WORKED.tentative);
  if (kind === 'circle') {
    const five = COUNTS.slice(0, 5);
    return choose(
      rng,
      spec('join every pair of n points on a circle, no three chords meeting; counts seen for 1 to 5 points', 'a circle with chords'),
      {
        prompt: `Join every pair of points on a circle, with no three chords meeting. The lantern counted ${list(five)} regions for 1 to 5 points. It says 6 points will give ${GUESS}. Why is that only a good guess?`,
        scene: { kind: 'lantern', points: 5, chords: true, regions: COUNTS[4], stated: CIRCLE_STATED, sequence: five, claim: `6 points will give ${GUESS} regions.` },
        explain: `Five counts fit doubling, so ${GUESS} is a fair guess. But nothing shows why each new point must double the count. The drawing for 6 points has ${MOST6}, not ${GUESS}.`,
        teach,
        hints: ['Is there a reason the count must double, or only five counts that do?', 'Five examples can fit a pattern that still breaks later.', 'A good guess fits every case seen. A proof has a reason for every case.'],
        hintCase,
        errorTags: { proof: 'examples-as-proof', more: 'examples-as-proof' },
      },
      [
        { id: 'reason', label: 'Five counts fit doubling, but no reason shows the count must double.' },
        { id: 'proof', label: 'It is not a guess: five counts in a row prove it.' },
        { id: 'big', label: `${GUESS} regions are too many to fit in a circle.` },
        { id: 'more', label: 'One more count that fits would make it a proof.' },
      ],
      'reason',
      {
        proof: { headline: 'Five counts that fit are examples, not a proof.', detail: ['Nothing says why each new point must double the count.', `In fact, 6 points give ${MOST6}, not ${GUESS}. The pattern broke.`] },
        big: { headline: 'The size of the number is not the reason.', detail: [`A circle can have ${GUESS} regions with more points.`, 'It is a guess because only examples back it, with no reason for every case.'] },
        more: { headline: 'One more count that fits is still only an example.', detail: ['Examples never cover every case. A proof needs a reason that does.', `Here, 6 points give ${MOST6}, so doubling breaks anyway.`] },
      },
    );
  }
  if (kind === 'seen') {
    const g = rng.pick(GROWERS);
    const a = rng.int(3, 12);
    const d = rng.int(1, 3);
    const vals = termsOf(a, d, 4);
    const n = rng.int(8, 12);
    const pred = termOf(a, d, n);
    return choose(
      rng,
      spec(`observed only: ${seqText(vals)} on four ${g.span}s; no rule given`, 'measures over time'),
      {
        prompt: `${g.who} ${g.verb} ${list(vals)} ${g.unit} on four ${g.span}s in a row. These are only what was seen. Sam says it will be ${pred} ${g.unit} on ${g.span} ${n}. Why is that only a good guess?`,
        scene: lanternCard({ stated: `${g.who}, one measure a ${g.span}. No rule was given.`, pattern: 'observed', rows: [{ label: 'Seen', cells: vals.map(String) }], claim: `On ${g.span} ${n} it will be ${pred}.` }),
        explain: `Four ${g.span}s fit adding ${d}, so ${pred} is a fair guess. But no rule was given, and nothing makes it keep growing the same way. It could slow down or stop.`,
        teach,
        hints: ['Was a rule given, or only four numbers seen?', 'Could something change after the four you saw?', 'A good guess fits every case seen. A proof has a reason for every case.'],
        hintCase,
        errorTags: { proof: 'examples-as-proof', more: 'examples-as-proof' },
      },
      [
        { id: 'reason', label: `Four ${g.span}s fit adding ${d}, but nothing makes it keep growing that way.` },
        { id: 'proof', label: `It is not a guess: four ${g.span}s in a row prove it adds ${d} each ${g.span}.` },
        { id: 'odd', label: `It is a guess because ${pred} is ${anArticle(par(pred))} ${par(pred)} number.` },
        { id: 'more', label: `It would be proved if ${g.span} 5 fits too.` },
      ],
      'reason',
      {
        proof: { headline: 'Four numbers that fit are examples, not a proof.', detail: ['No rule was given. Something living can grow fast, then slow down.', 'A proof needs a reason that covers every case.'] },
        odd: { headline: `Whether ${pred} is odd or even is not the reason.`, detail: ['It is a guess because only four seen numbers back it.', 'No rule says it must keep growing the same way.'] },
        more: { headline: `${cap(g.span)} 5 would be one more example, and still not a proof.`, detail: ['Examples never cover every case.', 'Only a stated rule, with a reason, can make it sure.'] },
      },
    );
  }
  // A stated rule: why the claim is proved.
  const b = rng.pick(BUILDS);
  const p: Parity = rng.chance(0.7) ? 'odd' : 'even';
  // From 3 up, so the count is always plural ("3 tiles", never "1 tiles").
  const a = p === 'odd' ? oddIn(rng, 3, 9) : evenIn(rng, 2, 10);
  const d = rng.pick([2, 4, 6]);
  const first = termsOf(a, d, 4);
  return choose(
    rng,
    spec(`stated rule: start with ${a} ${b.unit}, add ${d} each ${b.step}; claim: every ${b.step} has ${anArticle(p)} ${p} number`, 'a stated building rule'),
    {
      prompt: `${b.thing} starts with ${a} ${b.unit}, and each ${b.step} adds ${d} ${b.unit}. That rule is stated. Ava says every ${b.step} has ${anArticle(p)} ${p} number of ${b.unit}. Why is that proved, not just a good guess?`,
      scene: lanternCard({ stated: `Start with ${a} ${b.unit}. Each ${b.step} adds ${d}.`, pattern: 'constructed', rows: [{ label: cap(`${b.step}s 1 to 4`), cells: first.map(String) }], claim: `Every ${b.step} has ${anArticle(p)} ${p} number of ${b.unit}.` }),
      explain: `The rule is stated. It starts with ${a}, which is ${p}, and adding ${d}, an even number, keeps a number ${p}. That happens at every ${b.step}, so it covers every case.`,
      teach,
      hints: ['What does one step of the rule do to odd and even?', `Does that same step happen at every ${b.step}?`, 'A reason for every case is a proof.'],
      hintCase: statusCase(WORKED.proved),
      errorTags: { examples: 'examples-as-proof' },
    },
    [
      { id: 'reason', label: `The rule starts ${p}, and adding ${d} keeps a number ${p} at every ${b.step}.` },
      { id: 'examples', label: `${cap(b.step)}s 1 to 4 have ${list(first)} ${b.unit}, all ${p}.` },
      { id: 'common', label: `${cap(p)} numbers come up more often than ${otherPar(p)} ones.` },
      { id: 'grow', label: `Each ${b.step} has more ${b.unit} than the one before.` },
    ],
    'reason',
    {
      examples: { headline: `Four ${b.step}s that fit are examples. They cover only those ${b.step}s.`, detail: [`The proof is the reason: adding ${d}, an even number, never changes odd or even.`, `That reason works at every ${b.step}, even ones you never build.`] },
      common: { headline: 'How often numbers come up is not a reason about this rule.', detail: [`Look at the rule: start with ${a}, then add ${d} each ${b.step}.`, `Adding an even number keeps a number ${p}, every time.`] },
      grow: { headline: 'Growing is true, but it says nothing about odd and even.', detail: [`The reason is about the step: adding ${d} keeps a number ${p}.`, `That is why every ${b.step} is ${p}.`] },
    },
  );
}

// ---------- circle items ----------

export interface CircleOpts extends Place {
  variant?: 'broken' | 'hexagon' | 'label';
}

export function teachCircle(): Teach {
  return {
    rule: `The most regions 6 points can make is ${MOST6}. It needs no three chords meeting at one point. Evenly spaced points have three chords meeting in the middle, so they make ${HEX}.`,
    terms: [
      { word: 'A chord', meaning: 'a straight line that joins two points on the circle.' },
      { word: 'A region', meaning: 'one of the parts the chords cut the circle into.' },
    ],
    casesTitle: 'What the drawings show',
    cases: [
      { label: `1 to 5 points, no three chords meeting: ${list(COUNTS.slice(0, 5))} regions.`, note: 'Each count is double the one before. So far.' },
      { label: `6 points, no three chords meeting: ${MOST6} regions.`, note: `Doubling would give ${GUESS}. The pattern breaks.` },
      { label: `6 points, evenly spaced: ${HEX} regions.`, note: 'Three chords meet in the middle, so one small region is lost.' },
    ],
    remember: ['A run of counts is a guess until a reason covers every case.', 'Ask: do three chords meet at one point?'],
    simpler: [`Count 1, 2, 4, 8 and 16. Doubling says ${GUESS} next.`, `Draw 6 points and count: ${MOST6}.`, 'One case that breaks a pattern makes the claim false.'],
  };
}

const CIRCLE_HINT: TeachCase = {
  label: `5 evenly spaced points: ${PENTA} regions.`,
  truths: [{ who: 'Three chords meet at one point', value: false }],
  words: YES_WORDS,
  note: `No three chords meet, so 5 evenly spaced points still make the most: ${maxRegions(5)}.`,
};

/** Circle regions: what 31 does to the doubling claim; why the hexagon has 30; can the hexagon be labelled 31? */
export function circleItem(rng: Rng, o: CircleOpts = {}): ChooseItem {
  const variant = o.variant ?? rng.pick(['broken', 'hexagon', 'label'] as const);
  const spec: Spec = {
    lesson: o.lesson ?? L1, skill: 's17.circle-max', phase: o.phase ?? 'do', level: o.level ?? 2, twin: 's17.l1.circle',
    metaSkill: 'Track 4 · circle regions: the most needs no three chords meeting',
    rule: 'join every pair of n points on a circle; the most regions needs no three chords through one inside point',
    task: variant === 'broken' ? 'judge a claim after a counterexample' : variant === 'hexagon' ? 'explain a smaller count' : 'decide if a label is allowed',
    rep: 'a circle with chords', difficulty: variant === 'broken' ? 3 : 4,
  };
  const teach = teachCircle();
  const hints = ['Look at where the chords meet.', 'The most regions needs no three chords meeting at one point.', 'Count what is lost when three chords meet at one point.'];
  if (variant === 'broken') {
    return choose(
      rng,
      spec,
      {
        prompt: `Join every pair of 6 points on a circle, with no three chords meeting. The counts for 1 to 5 points were ${list(COUNTS.slice(0, 5))}. This drawing has ${MOST6} regions. What does that do to the claim “the count doubles each time”?`,
        scene: { kind: 'lantern', points: 6, chords: true, regions: MOST6, stated: CIRCLE_STATED, sequence: COUNTS.slice(0, 6), claim: 'The count doubles each time.' },
        explain: `Doubling ${COUNTS[4]} gives ${GUESS}, but the drawing has ${MOST6}. One case that breaks a claim makes it false. Five counts that fit could never prove it.`,
        teach,
        hints: [`What does doubling ${COUNTS[4]} give?`, 'Does the drawing match the doubling claim?', 'One case that breaks a claim makes it false.'],
        hintCase: {
          label: 'Claim: every count doubles. The counts are 1, 2, 4, then 7.',
          truths: [{ who: 'Every count doubles', value: false }],
          words: YES_WORDS,
          note: 'Doubling 4 gives 8, not 7. One count breaks the claim.',
        },
        errorTags: { still: 'examples-as-proof', guess: 'unwarranted-certainty' },
        tags: ['examples-as-proof'],
      },
      [
        { id: 'breaks', label: `It breaks the claim: doubling ${COUNTS[4]} gives ${GUESS}, not ${MOST6}.` },
        { id: 'still', label: 'Nothing: five counts that fit still prove the claim.' },
        { id: 'guess', label: 'The claim is still a good guess, just not for 6 points.' },
      ],
      'breaks',
      {
        still: { headline: 'Counts that fit can’t outvote one that breaks the claim.', detail: [`The claim says every count doubles. ${MOST6} is not double ${COUNTS[4]}.`, 'One case that breaks a claim makes it false, however many fit.'] },
        guess: { headline: 'A claim about every count is false once one count breaks it.', detail: [`At 6 points the count is ${MOST6}, not ${GUESS}.`, 'A good guess must fit every case seen. This one no longer does.'] },
      },
    );
  }
  if (variant === 'hexagon') {
    return choose(
      rng,
      spec,
      {
        prompt: `These 6 points are evenly spaced. Every pair is joined, and three long chords meet at one point in the middle. Why does this drawing have ${HEX} regions, not ${MOST6}?`,
        scene: { kind: 'lantern', points: 6, chords: true, regular: true, regions: HEX, stated: 'Join every pair of 6 evenly spaced points.' },
        explain: `With no three chords meeting, the three long chords would make a small region in the middle. Here they meet at one point, so that region is gone. ${MOST6} take away 1 is ${HEX}.`,
        teach,
        hints,
        hintCase: CIRCLE_HINT,
        errorTags: { wrong: 'unwarranted-certainty' },
      },
      [
        { id: 'meet', label: 'Three chords meet at one point, so a small middle region is lost.' },
        { id: 'even', label: 'Evenly spaced points always make fewer regions.' },
        { id: 'wrong', label: `It was counted wrong: 6 points always make ${MOST6}.` },
      ],
      'meet',
      {
        even: { headline: 'Evenly spaced points do not always make fewer.', detail: [`5 evenly spaced points make ${PENTA}, the most for 5.`, 'What matters is whether three chords meet at one point. Here they do.'] },
        wrong: { headline: `${MOST6} is the most, not what every drawing makes.`, detail: [`Only a drawing with no three chords meeting makes ${MOST6}.`, `Here three chords meet in the middle, so it has ${HEX}.`] },
      },
    );
  }
  return choose(
    rng,
    spec,
    {
      prompt: `These 6 points are evenly spaced, and three long chords meet in the middle. Can this drawing be labelled “${MOST6} regions, the most for 6 points”?`,
      scene: { kind: 'lantern', points: 6, chords: true, regular: true, hideCount: true, stated: 'Join every pair of 6 evenly spaced points.' },
      explain: `No. ${MOST6} needs no three chords meeting at one point. Here three chords meet in the middle, so a region is lost and the drawing has ${HEX}.`,
      teach,
      hints,
      hintCase: CIRCLE_HINT,
      errorTags: { yes: 'unwarranted-certainty', next: 'examples-as-proof' },
    },
    [
      { id: 'no', label: `No: three chords meet at one point, so it has only ${HEX}.` },
      { id: 'yes', label: `Yes: 6 points always make ${MOST6} regions.` },
      { id: 'next', label: `Yes: ${MOST6} comes after ${COUNTS[4]} in the counts.` },
    ],
    'no',
    {
      yes: { headline: `6 points do not always make ${MOST6}.`, detail: [`${MOST6} is the most, and it needs no three chords meeting.`, `This drawing has three chords meeting in the middle, so it has ${HEX}.`] },
      next: { headline: 'The counts so far can’t label a new drawing.', detail: [`${MOST6} is the count for a drawing with no three chords meeting.`, `Count this one: three chords meet, so it has ${HEX}.`] },
    },
  );
}

// ---------- a fair coin has no memory ----------

/** Every way k + 1 fair trials can go, kept when the first k all match: how often the next one matches, and how often not. */
export function nextAfterStreak(k: number): { same: number; other: number } {
  let same = 0, other = 0;
  for (let mask = 0; mask < 2 ** (k + 1); mask++) {
    const bits = range(0, k).map((i) => (mask >> i) & 1);
    if (!bits.slice(0, k).every((b) => b === 1)) continue;
    if (bits[k] === 1) same++;
    else other++;
  }
  return { same, other };
}

export const DEVICES = [
  { id: 'coin', name: 'A fair coin', sides: ['heads', 'tails'], lands: (s: string) => `lands ${s}`, verb: 'flip', noun: 'coin' },
  { id: 'spinner', name: 'A fair spinner with a red half and a blue half', sides: ['red', 'blue'], lands: (s: string) => `stops on ${s}`, verb: 'spin', noun: 'spinner' },
  { id: 'cube', name: 'A fair cube with 3 green faces and 3 yellow faces', sides: ['green', 'yellow'], lands: (s: string) => `lands with ${s} on top`, verb: 'roll', noun: 'cube' },
] as const;

export interface CoinOpts extends Place {
  device?: (typeof DEVICES)[number]['id'];
}

export function coinItem(rng: Rng, o: CoinOpts = {}): ChooseItem {
  const dev = DEVICES.find((d) => d.id === o.device) ?? rng.pick(DEVICES);
  const k = rng.int(4, 7);
  const sideIx = rng.int(0, 1);
  const side = dev.sides[sideIx];
  const oth = dev.sides[1 - sideIx];
  const { same, other } = nextAfterStreak(k);
  // Computed: after the streak, the next trial matches as often as not, so neither is more likely.
  const equal = same === other;
  const right = equal ? 'same' : same > other ? 'streak' : 'due';
  const [A, B] = dev.sides;
  return choose(
    rng,
    {
      lesson: o.lesson ?? L1, skill: 's17.independence', phase: o.phase ?? 'do', level: o.level ?? 2, twin: 's17.l1.coin',
      metaSkill: 'Track 4 · a fair trial has no memory',
      rule: `a fair ${dev.noun}: each ${dev.verb} is ${A} or ${B} with the same chance, whatever came before`,
      task: 'judge the next trial after a streak', rep: `${dev.noun} ${dev.verb}s`, difficulty: 2,
    },
    {
      prompt: `${dev.name} ${dev.lands(side)} ${k} times in a row. What is true about the next ${dev.verb}?`,
      scene: lanternCard({ stated: `${dev.name}. Each ${dev.verb} is new.`, rows: [{ label: 'So far', cells: Array.from({ length: k }, () => side) }], claim: `${cap(oth)} is due next.` }),
      explain: `A fair ${dev.noun} has no memory. Each ${dev.verb} is new, so ${A} and ${B} each still have a 1 in 2 chance. A streak does not make anything due.`,
      teach: {
        rule: 'Each fair try is new. What came before does not change the chances.',
        terms: [
          { word: 'Fair', meaning: 'each side has the same chance every time.' },
          { word: 'Due', meaning: 'more likely because it has not come up for a while. A fair try is never due.' },
        ],
        casesTitle: 'The chances, try by try',
        cases: [
          { label: `The first ${dev.verb}: ${A} 1 in 2, ${B} 1 in 2.`, note: 'Each side has the same chance.' },
          { label: `After ${k} ${side} in a row: ${A} 1 in 2, ${B} 1 in 2.`, note: `Of all the ways ${k + 1} ${dev.verb}s can go, after ${k} ${side}, ${same} way ends ${side} and ${other} way ends ${oth}.` },
        ],
        remember: ['A fair try has no memory.', `Ask: did anything change the ${dev.noun}?`],
        simpler: [
          `${cap(dev.verb)} twice. The 4 ways are ${A} ${A}, ${A} ${B}, ${B} ${A} and ${B} ${B}.`,
          `Of the 2 ways that start with ${side}, 1 ends ${side} and 1 ends ${oth}.`,
          `So after ${side}, ${oth} is not more likely. It is still 1 in 2.`,
        ],
      },
      hints: [`Does the ${dev.noun} know what came before?`, `What are the chances on any one fair ${dev.verb}?`, 'A streak changes nothing about a fair try.'],
      hintCase: { label: `A fair ${dev.noun} after 2 ${side} in a row.`, truths: [{ who: `${cap(oth)} is more likely next`, value: false }], words: YES_WORDS, note: 'Still 1 in 2 each.' },
      errorTags: { due: 'unwarranted-certainty', must: 'unwarranted-certainty', streak: 'examples-as-proof' },
      tags: ['unwarranted-certainty'],
    },
    [
      { id: 'same', label: `${cap(A)} and ${B} are still equally likely.` },
      { id: 'due', label: `${cap(oth)} is more likely now, because it is due.` },
      { id: 'streak', label: `${cap(side)} is more likely, because it is on a streak.` },
      { id: 'must', label: `${cap(oth)} must come next.` },
    ],
    right,
    {
      due: { headline: `Nothing is ever due on a fair ${dev.noun}.`, detail: [`The ${dev.noun} has no memory of the last ${k} ${dev.verb}s.`, `On the next ${dev.verb}, ${A} and ${B} each have a 1 in 2 chance.`] },
      streak: { headline: 'A streak does not make a side more likely.', detail: [`The ${dev.noun} is fair, so each side has a 1 in 2 chance every time.`, `${k} ${side} in a row is just how these ${dev.verb}s went.`] },
      must: { headline: `No side must come next on a fair ${dev.noun}.`, detail: [`${cap(side)} can come again: it has a 1 in 2 chance.`, 'Being sure here is more than the facts allow.'] },
    },
  );
}

// ---------- transfer: a few faster days ----------

export const TIMES = [
  { line: (v: number[]) => `A class tried a new way to line up for lunch. It took ${v[0]}, ${v[1]}, then ${v[2]} minutes on three days.`, unit: 'minutes', lo: 8, hi: 12, what: 'line up' },
  { line: (v: number[]) => `A baker tried a new oven. Bread took ${v[0]}, ${v[1]}, then ${v[2]} minutes to bake on three days.`, unit: 'minutes', lo: 38, hi: 45, what: 'bake' },
  { line: (v: number[]) => `A team tried a new way to pack lunch boxes. It took ${v[0]}, ${v[1]}, then ${v[2]} minutes on three days.`, unit: 'minutes', lo: 12, hi: 18, what: 'pack' },
  { line: (v: number[]) => `A swim coach tried a new warm up. One swimmer’s lap took ${v[0]}, ${v[1]}, then ${v[2]} seconds on three days.`, unit: 'seconds', lo: 48, hi: 56, what: 'swim' },
  { line: (v: number[]) => `A print shop tried a new printer. A big job took ${v[0]}, ${v[1]}, then ${v[2]} minutes on three days.`, unit: 'minutes', lo: 20, hi: 28, what: 'print' },
] as const;

/** Three times that drop each day (a run that fits "faster"). */
export function timesOf(rng: Rng, lo: number, hi: number): number[] {
  const b = rng.int(lo, hi);
  const d1 = rng.int(1, 3);
  const d2 = rng.int(1, 3);
  return [b, b - d1, b - d1 - d2];
}

export function timesItem(rng: Rng, o: Place = {}): ChooseItem {
  const c = rng.pick(TIMES);
  const v = timesOf(rng, c.lo, c.hi);
  return choose(
    rng,
    {
      lesson: o.lesson ?? L1, skill: 's17.more-evidence', phase: o.phase ?? 'transfer', level: o.level ?? 2, twin: 's17.l1.times',
      metaSkill: 'Track 4 · a few good days are not a proof',
      rule: `observed only: three times ${seqText(v)} ${c.unit}, each lower than the one before; no rule given`,
      task: 'decide if a short run proves a lasting change, and what to check', rep: `times in ${c.unit}`, difficulty: 3,
    },
    {
      prompt: `${c.line(v)} These are only the times seen. Is the new way proved to be faster for good?`,
      scene: lanternCard({ stated: 'Times seen on three days. No rule was given.', pattern: 'observed', rows: [{ label: 'Times', cells: v.map((x) => `${x} ${c.unit}`) }], claim: 'The new way is faster for good.' }),
      explain: 'Three faster days fit the claim, but three days are only a few examples. An easy day or an extra helper could explain them. To be surer, check more days in the same conditions, and look for other reasons.',
      teach: {
        rule: 'A few good results are a good guess, not a proof. To be surer, get more results in the same conditions, and rule out other reasons.',
        terms: [
          { word: 'The same conditions', meaning: 'the same kind of day, the same people and the same job, so only the new way changed.' },
          { word: 'Another reason', meaning: 'something else that could explain the result, like an easy day.' },
        ],
        casesTitle: 'What three faster days can and can’t show',
        cases: [
          { label: `Times: ${list(v)} ${c.unit}.`, truths: [{ who: 'Each day was faster', value: true }], words: YES_WORDS, note: 'This fits the claim.' },
          { label: 'Day 4 is slow again.', truths: [{ who: 'Ruled out by three days', value: false }], words: YES_WORDS, note: 'Three days can’t rule this out.' },
        ],
        remember: ['A short run is a good guess.', 'Ask: more results? The same conditions? Another reason?'],
        simpler: ['Three sunny days do not prove it will never rain.', 'Three faster days do not prove it will always be faster.', 'Check more days, the same way, and look for other reasons.'],
      },
      hints: ['How many days were seen?', 'Could something else explain the faster times?', 'What more would you check before being sure?'],
      hintCase: { label: 'A plant grew on three sunny days.', truths: [{ who: 'Proved to grow every day', value: false }], words: YES_WORDS, note: 'Three days are a few examples. Check more days.' },
      errorTags: { yes: 'examples-as-proof', one: 'examples-as-proof' },
      tags: ['examples-as-proof'],
    },
    [
      { id: 'no', label: 'No. Check more days, in the same conditions, and look for other reasons it was faster.' },
      { id: 'yes', label: 'Yes. It got faster every day, so it will stay faster.' },
      { id: 'one', label: 'Yes, if day 4 is faster too.' },
      { id: 'slow', label: 'No. The times went down, so it got slower.' },
    ],
    'no',
    {
      yes: { headline: 'Three faster days are examples, not a proof.', detail: ['Something else could explain them, like an easy day or a helper.', 'To be surer, check more days in the same conditions.'] },
      one: { headline: 'One more fast day is still only an example.', detail: ['Four days are still a small sample.', 'Check more days in the same conditions, and look for other reasons.'] },
      slow: { headline: 'A lower time means the job got done faster.', detail: [`${list(v)} ${c.unit}: each time is lower, so each day was faster.`, 'The real question is whether three days prove it will stay faster. They do not.'] },
    },
  );
}

// =====================================================================================================================
// l2 · Break it or test it
// =====================================================================================================================

// ---------- counterexamples ----------

const growing = (xs: readonly number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
const doubles = (xs: readonly number[]) => xs.every((x, i) => i === 0 || x === 2 * xs[i - 1]);
const sameJump = (xs: readonly number[]) => xs.every((x, i) => i < 2 || x - xs[i - 1] === xs[1] - xs[0]);
const addsTwo = (xs: readonly number[]) => xs.every((x, i) => i === 0 || x - xs[i - 1] === 2);
const allEven = (xs: readonly number[]) => xs.every((x) => par(x) === 'even');
const allOdd = (xs: readonly number[]) => xs.every((x) => par(x) === 'odd');

export type FamilyId = 'doubles' | 'even' | 'jump' | 'odd';
export type CaseRole = 'break' | 'fit' | 'none';

/** A claim about every sequence in a group: a counterexample is in the group and fails the claim. */
export interface SeqFamily {
  id: FamilyId;
  claim: string;
  inGroup(xs: readonly number[]): boolean;
  holds(xs: readonly number[]): boolean;
  /** "is growing" / "is not growing"; "doubles each time" / "does not double each time". */
  groupIs: string;
  groupIsNot: string;
  does: string;
  doesNot: string;
  /** Short labels for teach truths: "Growing", "Doubles each time". */
  groupLabel: string;
  holdsLabel: string;
  need: string;
  make(rng: Rng, role: CaseRole): number[];
}

const arith = (a: number, d: number, n = 4) => range(0, n - 1).map((i) => a + i * d);
const geo = (a: number, m: number, n = 4) => range(0, n - 1).map((i) => a * m ** i);

export const FAMILIES: Record<FamilyId, SeqFamily> = {
  doubles: {
    id: 'doubles',
    claim: 'Every growing number sequence doubles.',
    inGroup: growing,
    holds: doubles,
    groupIs: 'is growing', groupIsNot: 'is not growing', does: 'doubles each time', doesNot: 'does not double each time',
    groupLabel: 'Growing', holdsLabel: 'Doubles each time',
    need: 'To break it, a sequence must be growing and still not double each time.',
    make: (rng, role) => (role === 'break' ? (rng.chance(0.6) ? arith(rng.int(1, 6), rng.int(1, 4)) : [1, 2, 4, 7].map((x) => x * rng.int(1, 3))) : role === 'fit' ? geo(rng.int(1, 6), 2) : geo(rng.int(1, 3) * 8, 1).map((x, i) => x / 2 ** i)),
  },
  even: {
    id: 'even',
    claim: 'Every sequence that adds 2 each time has only even numbers.',
    inGroup: addsTwo,
    holds: allEven,
    groupIs: 'adds 2 each time', groupIsNot: 'does not add 2 each time', does: 'has only even numbers', doesNot: 'has odd numbers in it',
    groupLabel: 'Adds 2 each time', holdsLabel: 'Only even numbers',
    need: 'To break it, a sequence must add 2 each time and still have an odd number.',
    make: (rng, role) => (role === 'break' ? arith(oddIn(rng, 1, 15), 2) : role === 'fit' ? arith(evenIn(rng, 2, 16), 2) : arith(rng.int(1, 9), rng.pick([3, 5]))),
  },
  jump: {
    id: 'jump',
    claim: 'Every growing number sequence adds the same number each time.',
    inGroup: growing,
    holds: sameJump,
    groupIs: 'is growing', groupIsNot: 'is not growing', does: 'adds the same number each time', doesNot: 'does not add the same number each time',
    groupLabel: 'Growing', holdsLabel: 'Adds the same each time',
    need: 'To break it, a sequence must be growing and still not add the same number each time.',
    make: (rng, role) => {
      if (role === 'break') { const a = rng.int(1, 6); return rng.chance(0.5) ? [a, a + 1, a + 3, a + 6] : geo(rng.int(1, 3), 2); }
      if (role === 'fit') return arith(rng.int(1, 9), rng.int(2, 5));
      const a = rng.int(1, 5), d = rng.int(2, 4);
      return arith(a + 3 * d, -d);
    },
  },
  odd: {
    id: 'odd',
    claim: 'Every number sequence that starts with an odd number has only odd numbers.',
    inGroup: (xs) => par(xs[0]) === 'odd',
    holds: allOdd,
    groupIs: 'starts with an odd number', groupIsNot: 'starts with an even number', does: 'has only odd numbers', doesNot: 'has an even number in it',
    groupLabel: 'Starts odd', holdsLabel: 'Only odd numbers',
    need: 'To break it, a sequence must start with an odd number and still have an even number.',
    make: (rng, role) => (role === 'break' ? arith(oddIn(rng, 1, 11), rng.pick([1, 3, 5])) : role === 'fit' ? arith(oddIn(rng, 1, 11), rng.pick([2, 4])) : arith(evenIn(rng, 2, 12), rng.pick([1, 3, 5]))),
  },
};
export const FAMILY_IDS: readonly FamilyId[] = ['doubles', 'even', 'jump', 'odd'];

/** The role a sequence plays for a claim, computed: breaks it (in the group, fails), fits (in the group, holds), or says nothing. */
export function roleOf(f: SeqFamily, xs: readonly number[]): CaseRole {
  if (!f.inGroup(xs)) return 'none';
  return f.holds(xs) ? 'fit' : 'break';
}

/** A sequence that plays this role, checked with roleOf, and not one of `avoid`. */
export function caseFor(rng: Rng, f: SeqFamily, role: CaseRole, avoid: readonly number[][] = []): number[] {
  for (let i = 0; i < 100; i++) {
    const xs = f.make(rng, role);
    if (roleOf(f, xs) === role && xs.every((x) => Number.isInteger(x) && x > 0) && !avoid.some((a) => seqText(a) === seqText(xs))) return xs;
  }
  throw new Error(`no ${role} case for ${f.id}`);
}

export function teachCounter(f: SeqFamily, cases: { xs: number[] }[]): Teach {
  return {
    rule: 'One counterexample makes a claim false. It must be a case the claim talks about, and the claim must fail for it.',
    terms: [
      { word: 'A counterexample', meaning: 'one case that breaks a claim.' },
      { word: 'A sequence', meaning: 'a list of numbers in order.' },
      { word: 'Growing', meaning: 'each number is bigger than the one before.' },
    ],
    casesTitle: `Testing “${f.claim}”`,
    cases: cases.map(({ xs }) => {
      const r = roleOf(f, xs);
      return {
        label: `${seqText(xs)}.`,
        truths: [{ who: f.groupLabel, value: f.inGroup(xs) }, { who: f.holdsLabel, value: f.holds(xs) }],
        words: YES_WORDS,
        note: r === 'break' ? 'It breaks the claim.' : r === 'fit' ? 'It fits. That supports the claim, but does not prove it.' : 'The claim says nothing about it.',
      };
    }),
    remember: ['A case that breaks a claim must be one the claim talks about.', 'Ask: is it in the claim’s group? Does the claim fail for it?'],
    simpler: ['Claim: every dog in this room is brown.', 'A black dog in this room breaks it.', 'A brown dog fits. A black cat says nothing about it.'],
  };
}

export interface CounterOpts extends Place {
  family?: FamilyId;
  framed?: boolean;
}

/** Which sequence breaks the claim? (one breaks it, one fits, one is outside the claim's group) */
export function counterItem(rng: Rng, o: CounterOpts = {}): ChooseItem {
  const f = FAMILIES[o.family ?? rng.pick(FAMILY_IDS)];
  const brk = caseFor(rng, f, 'break');
  const fit = caseFor(rng, f, 'fit', [brk]);
  const none = caseFor(rng, f, 'none', [brk, fit]);
  const hint = caseFor(rng, f, 'break', [brk, fit, none]);
  return choose(
    rng,
    {
      lesson: o.lesson ?? L2, skill: 's17.counterexample', phase: o.phase ?? 'do', level: o.level ?? 3, twin: `s17.l2.counter.${f.id}`,
      metaSkill: 'Track 4 · find a counterexample',
      rule: `claim: ${f.claim} A counterexample is in the group and fails the claim.`,
      task: 'choose the case that breaks a claim', rep: 'number sequences', difficulty: o.framed ? 2 : 3,
    },
    {
      prompt: `Claim: “${f.claim}” Which sequence breaks the claim?`,
      scene: lanternCard({ claim: f.claim, rows: [brk, fit, none].map((xs) => ({ label: 'Test', cells: xs.map(String) })) }),
      explain: `${seqText(brk)} ${f.groupIs}, but it ${f.doesNot}. So it breaks the claim. One case like this makes the claim false.`,
      teach: teachCounter(f, [{ xs: brk }, { xs: fit }, { xs: none }]),
      hints: ['Is the sequence one the claim talks about?', 'If it is, does the claim fail for it?', 'A case that fits can’t break a claim.'],
      hintCase: {
        label: `Test ${seqText(hint)}.`,
        truths: [{ who: f.groupLabel, value: true }, { who: f.holdsLabel, value: false }],
        words: YES_WORDS,
        note: 'It is in the claim’s group, and the claim fails for it. So it breaks the claim.',
      },
      errorTags: { fit: 'examples-as-proof' },
      frame: o.framed ? `___ ${f.groupIs}, but it ${f.doesNot}. So it breaks the claim.` : undefined,
    },
    [
      { id: 'break', label: seqText(brk) },
      { id: 'fit', label: seqText(fit) },
      { id: 'none', label: seqText(none) },
    ],
    'break',
    {
      fit: { headline: 'This sequence fits the claim, so it can’t break it.', detail: [`${seqText(fit)} ${f.groupIs}, and it ${f.does}.`, 'A case that fits only supports a claim. It never proves it.', f.need] },
      none: { headline: 'The claim is not about this sequence, so it can’t break it.', detail: [`${seqText(none)} ${f.groupIsNot}, so the claim says nothing about it.`, f.need] },
    },
  );
}

const PAIRS = [['Lee', 'Ava'], ['Max', 'Zoe'], ['Sam', 'Mia'], ['Raj', 'Kim']] as const;

/** Explain: three cases fit, one breaks it. What do the finds show? */
export function whyCounterItem(rng: Rng, o: Place & { family?: FamilyId } = {}): ChooseItem {
  const f = FAMILIES[o.family ?? rng.pick(FAMILY_IDS)];
  const [x, y] = rng.pick(PAIRS);
  const k = rng.int(3, 5);
  const brk = caseFor(rng, f, 'break');
  const fit = caseFor(rng, f, 'fit', [brk]);
  return choose(
    rng,
    {
      lesson: o.lesson ?? L2, skill: 's17.why-counter', phase: o.phase ?? 'explain', level: o.level ?? 3, twin: 's17.l2.why-counter',
      metaSkill: 'Track 4 · why one counterexample is enough',
      rule: `claim: ${f.claim} Cases that fit support it; one case that breaks it makes it false.`,
      task: 'explain what fitting cases and one breaking case show', rep: 'number sequences', difficulty: 3,
      rubric: { level: 2, text: '2 = one case that breaks a claim makes it false, however many fit; 1 = counts cases; 0 = no relevant rule' },
    },
    {
      prompt: `Two kids test the claim “${f.claim}” ${x} finds ${k} sequences that fit it, like ${seqText(fit)}. ${y} finds ${seqText(brk)}, which ${f.groupIs} but ${f.doesNot}. What do their finds show?`,
      scene: lanternCard({ claim: f.claim, rows: [{ label: `${x}: fits`, cells: fit.map(String) }, { label: `${y}: breaks it`, cells: brk.map(String), lit: true }] }),
      explain: `${y}’s sequence ${f.groupIs} and ${f.doesNot}, so the claim fails for it. One case that breaks a claim makes it false. ${x}’s cases only fit, and fitting cases never prove a claim.`,
      teach: teachCounter(f, [{ xs: fit }, { xs: brk }]),
      hints: [`Does ${y}’s sequence belong to the claim’s group?`, 'Does the claim fail for it?', 'How many breaking cases does it take to make a claim false?'],
      hintCase: { label: 'Claim: every cat in the shelter is black. Ten black cats are found, then one gray cat.', truths: [{ who: 'The claim is false', value: true }], words: YES_WORDS, note: 'The one gray cat breaks it.' },
      errorTags: { true: 'examples-as-proof', guess: 'examples-as-proof' },
    },
    [
      { id: 'false', label: `The claim is false: ${y}’s one case breaks it.` },
      { id: 'true', label: `The claim is true: ${x} found more cases.` },
      { id: 'guess', label: 'The claim is a good guess: most cases fit.' },
      { id: 'wait', label: 'No one can tell until they find the same number of cases.' },
    ],
    'false',
    {
      true: { headline: 'More cases that fit can’t outvote one that breaks it.', detail: [`${y}’s sequence ${f.groupIs}, so the claim talks about it. And the claim fails for it.`, 'So the claim is false, however many cases fit.'] },
      guess: { headline: 'Once a case breaks a claim, it is not a guess anymore. It is false.', detail: [`${seqText(brk)} ${f.groupIs}, but it ${f.doesNot}.`, 'A good guess must fit every case seen. This claim does not.'] },
      wait: { headline: 'One case that breaks a claim is enough. No count is needed.', detail: [`${seqText(brk)} ${f.groupIs}, but it ${f.doesNot}.`, 'That one case makes the claim false.'] },
    },
  );
}

// ---------- a test that tells two rules apart ----------

export type MRule = { t: 'add'; k: number } | { t: 'times'; k: number } | { t: 'timesAdd'; a: number; b: number };
export const applyRule = (r: MRule, x: number) => (r.t === 'add' ? x + r.k : r.t === 'times' ? x * r.k : r.a * x + r.b);
export const ruleWords = (r: MRule) => (r.t === 'add' ? `add ${r.k}` : r.t === 'times' ? (r.k === 2 ? 'double' : `times ${r.k}`) : `times ${r.a}, then add ${r.b}`);

const MRULES: MRule[] = [
  ...range(1, 6).map((k) => ({ t: 'add', k }) as MRule),
  ...range(2, 4).map((k) => ({ t: 'times', k }) as MRule),
  ...[2, 3].flatMap((a) => range(1, 3).map((b) => ({ t: 'timesAdd', a, b }) as MRule)),
];
export const INPUTS = range(1, 12);

/** Inputs (1 to 12) where two rules give the same output. */
export const agreeOn = (A: MRule, B: MRule) => INPUTS.filter((x) => applyRule(A, x) === applyRule(B, x));

/** Machine pairs that agree on exactly one input from 1 to 12 (the one seen), so every other input tells them apart. */
export const MACHINE_PAIRS: { A: MRule; B: MRule; x0: number }[] = MRULES.flatMap((A, i) =>
  MRULES.slice(i + 1).flatMap((B) => {
    const ag = agreeOn(A, B);
    return ag.length === 1 && ag[0] <= 6 ? [{ A, B, x0: ag[0] }] : [];
  }),
);

/** Sequence rules for two rules that agree so far. */
export type SRule = { t: 'add'; a: number; d: number } | { t: 'times'; a: number; m: number } | { t: 'grow'; a: number; d: number };
export const sTerm = (r: SRule, n: number) => (r.t === 'add' ? r.a + (n - 1) * r.d : r.t === 'times' ? r.a * r.m ** (n - 1) : r.a + (r.d * (n - 1) * n) / 2);
export const sWords = (r: SRule) =>
  r.t === 'add'
    ? `start at ${r.a} and add ${r.d} each time`
    : r.t === 'times'
      ? `start at ${r.a} and ${r.m === 2 ? 'double' : `multiply by ${r.m}`} each time`
      : `start at ${r.a}, then add ${r.d}, then ${2 * r.d}, then ${3 * r.d}, and so on`;

/** Two sequence rules, how many first terms they share (k), and the first term that tells them apart (k + 1). */
export const SEQ_PAIRS: { A: SRule; B: SRule; k: number }[] = range(1, 4).flatMap((a) => {
  const rules: SRule[] = [{ t: 'times', a, m: 2 }, { t: 'times', a, m: 3 }, ...range(1, 4).map((d) => ({ t: 'add', a, d }) as SRule), ...range(1, 2).map((d) => ({ t: 'grow', a, d }) as SRule)];
  return rules.flatMap((A, i) =>
    rules.slice(i + 1).flatMap((B) => {
      let k = 0;
      while (k < 6 && sTerm(A, k + 1) === sTerm(B, k + 1)) k++;
      return k >= 2 && k <= 3 ? [{ A, B, k }] : [];
    }),
  );
});

export interface SeparateOpts extends Place {
  mode?: 'machine' | 'sequence';
}

const SEP_TEACH = (): Teach => ({
  rule: 'A good test is one where the two rules give different results. A test both rules pass can’t tell them apart.',
  terms: [
    { word: 'A test that tells two rules apart', meaning: 'a case where the two rules give different results.' },
    { word: 'Rule', meaning: 'how the output or the next number is made.' },
  ],
  casesTitle: 'Add 2, or double?',
  cases: [
    { label: `Input 2: add 2 gives ${applyRule({ t: 'add', k: 2 }, 2)}, double gives ${applyRule({ t: 'times', k: 2 }, 2)}.`, truths: [{ who: 'Tells them apart', value: false }], words: YES_WORDS },
    { label: `Input 3: add 2 gives ${applyRule({ t: 'add', k: 2 }, 3)}, double gives ${applyRule({ t: 'times', k: 2 }, 3)}.`, truths: [{ who: 'Tells them apart', value: true }], words: YES_WORDS },
  ],
  remember: ['Pick a test where the rules give different results.', 'Ask: would both rules give the same answer here?'],
  simpler: ['Two keys might open a lock. Both fit the keyhole.', 'Fitting the keyhole can’t tell which one opens it.', 'Turning each key does.'],
});

/** Which test tells two rules apart? (a machine with two candidate rules, or a sequence with two rules that agree so far) */
export function separateItem(rng: Rng, o: SeparateOpts = {}): ChooseItem {
  const mode = o.mode ?? (rng.chance(0.6) ? 'machine' : 'sequence');
  const spec = (rule: string, rep: string, task: string): Spec => ({
    lesson: o.lesson ?? L2, skill: 's17.separate', phase: o.phase ?? 'do', level: o.level ?? 3, twin: `s17.l2.separate.${mode}`,
    metaSkill: 'Track 4 · choose a test that tells two rules apart', rule, task, rep, difficulty: 3,
  });
  if (mode === 'machine') {
    const pair = rng.pick(MACHINE_PAIRS);
    const [A, B] = rng.chance(0.5) ? [pair.A, pair.B] : [pair.B, pair.A];
    const x0 = pair.x0;
    const y0 = applyRule(A, x0);
    const s = rng.pick(INPUTS.filter((x) => x !== x0 && applyRule(A, x) !== applyRule(B, x)));
    const [wA, wB] = [ruleWords(A), ruleWords(B)];
    // Quoted, so a two-part rule ("times 2, then add 3") reads as one rule.
    const [qA, qB] = [`“${wA}”`, `“${wB}”`];
    const [oA, oB] = [applyRule(A, s), applyRule(B, s)];
    return choose(
      rng,
      spec(`this machine uses one of these two rules: ${wA}, or ${wB}; input ${x0} gave ${y0}`, 'a machine table', 'choose a separating input'),
      {
        prompt: `This machine uses one of these two rules: ${qA} or ${qB}. Input ${x0} gave ${y0}. Which test tells you which rule it uses?`,
        scene: lanternCard({ stated: `This machine uses one of these two rules: ${qA} or ${qB}.`, rows: [{ label: 'Rule A', cells: [wA] }, { label: 'Rule B', cells: [wB] }, { label: `Input ${x0}`, cells: [`output ${y0}`] }] }),
        explain: `Feed in ${s}: ${qA} gives ${oA}, but ${qB} gives ${oB}. The output tells the two rules apart. Input ${x0} gives ${y0} for both, so feeding it again tells you nothing new.`,
        teach: SEP_TEACH(),
        hints: [`What does each rule give for input ${x0}?`, 'Find an input where the two rules give different outputs.', 'A test both rules pass can’t pick one.'],
        hintCase: { label: `Add 2 or double? Input 2 gives 4 for both. Input 3 gives 5 or 6.`, truths: [{ who: 'Input 3 tells them apart', value: true }], words: YES_WORDS, note: 'Different outputs: a real test.' },
        errorTags: { again: 'examples-as-proof', bigger: 'examples-as-proof', pick: 'unwarranted-certainty' },
        tags: ['unwarranted-certainty'],
      },
      [
        { id: 'sep', label: `Feed in ${s}.` },
        { id: 'again', label: `Feed in ${x0} again.` },
        // Only offered when it really can't separate them: both outputs are bigger than the input.
        ...(oA > s && oB > s ? [{ id: 'bigger', label: `Feed in ${s}, and only check that the output is bigger than ${s}.` }] : []),
        { id: 'pick', label: `No test: ${qA} fits, so it must be the rule.` },
      ],
      'sep',
      {
        again: { headline: `Input ${x0} gives ${y0} for both rules, so it can’t tell them apart.`, detail: [`With ${qA}, ${x0} gives ${y0}. With ${qB}, ${x0} gives ${applyRule(B, x0)} too.`, `A test helps only if the rules give different outputs. Try ${s}: ${oA} or ${oB}.`] },
        bigger: { headline: 'Both rules give a bigger output, so that check can’t tell them apart.', detail: [`With ${s}, ${qA} gives ${oA} and ${qB} gives ${oB}. Both are bigger than ${s}.`, `Look at the output itself: ${oA} means ${qA}, and ${oB} means ${qB}.`] },
        pick: { headline: `${qB} fits input ${x0} too, so one fit can’t pick the rule.`, detail: [`Both rules give ${y0} for ${x0}.`, `Feed in ${s} to find out: ${oA} means ${qA}, and ${oB} means ${qB}.`] },
      },
    );
  }
  const pair = rng.pick(SEQ_PAIRS);
  const [A, B] = rng.chance(0.5) ? [pair.A, pair.B] : [pair.B, pair.A];
  const k = pair.k;
  const shown = range(1, k).map((n) => sTerm(A, n));
  const j = rng.int(1, k);
  const [tA, tB] = [sTerm(A, k + 1), sTerm(B, k + 1)];
  return choose(
    rng,
    spec(`a sequence follows one of these two rules: ${sWords(A)}, or ${sWords(B)}; first ${k} terms seen`, 'number sequences', 'choose a term that separates two rules'),
    {
      prompt: `A sequence follows one of two rules. Rule A: ${sWords(A)}. Rule B: ${sWords(B)}. So far it shows ${list(shown)}. Which check tells you which rule it follows?`,
      scene: lanternCard({ stated: 'This sequence follows one of two rules.', rows: [{ label: 'Rule A', cells: [sWords(A)] }, { label: 'Rule B', cells: [sWords(B)] }, { label: 'So far', cells: shown.map(String) }] }),
      explain: `Term ${k + 1} is ${tA} by rule A but ${tB} by rule B, so it tells the rules apart. The terms seen so far fit both rules.`,
      teach: SEP_TEACH(),
      hints: ['Work out the next term with each rule.', 'Do the two rules give different numbers there?', 'A check both rules pass can’t pick one.'],
      hintCase: { label: 'Double, or add 1, then 2, then 3, from 1? Both give 1, 2, 4. Term 4 is 8 or 7.', truths: [{ who: 'Term 4 tells them apart', value: true }], words: YES_WORDS },
      errorTags: { again: 'examples-as-proof', bigger: 'examples-as-proof', pick: 'unwarranted-certainty' },
      tags: ['unwarranted-certainty'],
    },
    [
      { id: 'sep', label: `Look at term ${k + 1}.` },
      { id: 'again', label: `Look at term ${j} again.` },
      ...(tA > shown[k - 1] && tB > shown[k - 1] ? [{ id: 'bigger', label: `Only check that term ${k + 1} is bigger than term ${k}.` }] : []),
      { id: 'pick', label: 'No check: rule A fits, so it must be the rule.' },
    ],
    'sep',
    {
      again: { headline: `Term ${j} is ${shown[j - 1]} by both rules, so it can’t tell them apart.`, detail: ['The terms seen so far fit both rules.', `Term ${k + 1} is ${tA} by rule A and ${tB} by rule B.`] },
      bigger: { headline: `Both rules make term ${k + 1} bigger than term ${k}, so that check can’t tell them apart.`, detail: [`Rule A gives ${tA}. Rule B gives ${tB}. Both are bigger than ${shown[k - 1]}.`, `Look at the number itself: ${tA} or ${tB}.`] },
      pick: { headline: 'Rule B fits the terms so far too, so one fit can’t pick the rule.', detail: [`Both rules give ${list(shown)}.`, `Look at term ${k + 1}: ${tA} means rule A, and ${tB} means rule B.`] },
    },
  );
}

// ---------- transfer: which test tells two reasons apart? ----------

export const CAUSES = [
  {
    problem: 'Kai’s bread did not rise.', stays: 'the bread stays flat', fixed: 'the bread rises',
    a: { maybe: 'Maybe the yeast was old.', reason: 'the old yeast', fix: 'use new yeast', keep: 'use the same old yeast' },
    b: { maybe: 'Maybe the kitchen was too cold.', reason: 'the cold kitchen', fix: 'bake in a warm kitchen', keep: 'bake in the same cold kitchen' },
  },
  {
    problem: 'A bean plant drooped.', stays: 'the plant still droops', fixed: 'the plant perks up',
    a: { maybe: 'Maybe it got too little water.', reason: 'too little water', fix: 'give it more water', keep: 'give it the same water' },
    b: { maybe: 'Maybe it got too little light.', reason: 'too little light', fix: 'move it to a sunny window', keep: 'keep it in the same dim spot' },
  },
  {
    problem: 'Rosa’s bike squeaks.', stays: 'the squeak stays', fixed: 'the squeak stops',
    a: { maybe: 'Maybe the chain is dry.', reason: 'the dry chain', fix: 'oil the chain', keep: 'leave the chain dry' },
    b: { maybe: 'Maybe the seat is loose.', reason: 'the loose seat', fix: 'tighten the seat', keep: 'leave the seat loose' },
  },
  {
    problem: 'A paper plane dives to the ground.', stays: 'the plane still dives', fixed: 'the plane glides',
    a: { maybe: 'Maybe its nose is too heavy.', reason: 'the heavy nose', fix: 'take the clip off its nose', keep: 'keep the clip on its nose' },
    b: { maybe: 'Maybe its wings bend down.', reason: 'the bent wings', fix: 'flatten the wings', keep: 'leave the wings bent' },
  },
] as const;

/** What each reason predicts for a test that fixes factor a, factor b, both or neither: the problem goes away iff its reason is fixed. */
export const predicts = (reason: 'a' | 'b', fixA: boolean, fixB: boolean) => (reason === 'a' ? fixA : fixB);
export const tellsApart = (fixA: boolean, fixB: boolean) => predicts('a', fixA, fixB) !== predicts('b', fixA, fixB);

export function reasonsTestItem(rng: Rng, o: Place = {}): ChooseItem {
  const ci = rng.int(0, CAUSES.length - 1);
  const c = CAUSES[ci];
  const which: 'a' | 'b' = rng.chance(0.5) ? 'a' : 'b';
  const opt = (fa: boolean, fb: boolean) => `${cap(fa ? c.a.fix : c.a.keep)}, and ${fb ? c.b.fix : c.b.keep}.`;
  const tests: Record<'sep' | 'none' | 'both', [boolean, boolean]> = { sep: [which === 'a', which === 'b'], none: [false, false], both: [true, true] };
  const right = (Object.keys(tests) as ('sep' | 'none' | 'both')[]).find((id) => tellsApart(...tests[id]))!;
  const fixedReason = which === 'a' ? c.a.reason : c.b.reason;
  const otherReason = which === 'a' ? c.b.reason : c.a.reason;
  return choose(
    rng,
    {
      lesson: o.lesson ?? L2, skill: 's17.separate', phase: o.phase ?? 'transfer', level: o.level ?? 3, twin: 's17.l2.reasons',
      metaSkill: 'Track 4 · choose a test that tells two reasons apart',
      rule: `exactly one of two stated reasons causes the problem; a test tells them apart when the two reasons predict different results`,
      task: 'choose a test that separates two explanations', rep: 'an everyday problem', difficulty: 3,
    },
    {
      prompt: `${c.problem} ${c.a.maybe} ${c.b.maybe} Only one of these is the reason. Which test can tell them apart?`,
      scene: lanternCard({ stated: `${c.problem} Only one reason is true.`, rows: [{ label: 'Reason A', cells: [c.a.reason] }, { label: 'Reason B', cells: [c.b.reason] }] }),
      explain: `${cap(which === 'a' ? c.a.fix : c.a.keep)}, and ${which === 'a' ? c.b.keep : c.b.fix}. If ${fixedReason} was the reason, ${c.fixed}. If ${otherReason} was the reason, ${c.stays}. The two reasons predict different results, so this test tells them apart.`,
      teach: {
        rule: 'To tell two reasons apart, change one thing only. Then the two reasons predict different results.',
        terms: [{ word: 'A reason', meaning: 'what might have caused the problem.' }, { word: 'Predict', meaning: 'say what will happen before you test.' }],
        casesTitle: 'What each reason predicts',
        cases: [
          { label: 'Change nothing.', note: 'Both reasons say the problem stays. No help.' },
          { label: 'Change one thing only.', note: 'One reason says it is fixed, the other says it is not. A real test.' },
          { label: 'Change both things.', note: 'Both reasons say it is fixed. No help.' },
        ],
        remember: ['Change one thing at a time.', 'Ask: would the two reasons predict different results?'],
        simpler: ['Two reasons a lamp is dark: the bulb, or the plug.', 'Plug it in with the same bulb. If it lights, the plug was the reason.', 'Change both at once, and you can’t tell which one it was.'],
      },
      hints: ['For each test, what does reason A predict? What does reason B predict?', 'A test helps only if the two predictions differ.', 'Change one thing only.'],
      hintCase: { label: 'A lamp is dark: the bulb, or the plug? Plug it in with the same bulb.', truths: [{ who: 'The two reasons predict different results', value: true }], words: YES_WORDS, note: 'So this test tells them apart.' },
      errorTags: { none: 'examples-as-proof', both: 'unwarranted-certainty' },
    },
    [
      { id: 'sep', label: opt(...tests.sep) },
      { id: 'none', label: opt(...tests.none) },
      { id: 'both', label: opt(...tests.both) },
    ],
    right,
    {
      none: { headline: 'Change nothing, and both reasons say the problem stays.', detail: [`If ${c.a.reason} was the reason, ${c.stays}. If ${c.b.reason} was the reason, ${c.stays} too.`, 'The same result either way can’t tell the reasons apart. Change one thing only.'] },
      both: { headline: 'Change both things, and both reasons say the problem goes away.', detail: [`If ${c.a.reason} was the reason, ${c.fixed}. If ${c.b.reason} was the reason, ${c.fixed} too.`, 'So the result can’t tell you which one it was. Change one thing only.'] },
    },
  );
}

// ---------- which finding would rule the claim out? ----------

export const GROUPS = [
  { noun: 'apple', here: 'in this basket', there: 'at the store', yes: 'red', no: 'green', work: false },
  { noun: 'bus', here: 'on route 4', there: 'on route 9', yes: 'yellow', no: 'blue', work: false },
  { noun: 'pencil', here: 'in the red cup', there: 'in the blue cup', yes: 'sharp', no: 'dull', work: false },
  { noun: 'stone', here: 'in this jar', there: 'on the beach', yes: 'smooth', no: 'rough', work: false },
  { noun: 'egg', here: 'in this carton', there: 'in the next carton', yes: 'white', no: 'brown', work: false },
  { noun: 'crate', here: 'on this truck', there: 'on the next truck', yes: 'sealed', no: 'open', work: true },
  { noun: 'seedling', here: 'in tray 1', there: 'in tray 2', yes: 'green', no: 'yellow', work: true },
  { noun: 'bolt', here: 'in box A', there: 'in box B', yes: 'shiny', no: 'rusty', work: true },
  { noun: 'jar of jam', here: 'on shelf 1', there: 'on shelf 2', yes: 'sealed', no: 'open', work: true },
] as const;

export type Finding = { inGroup: boolean; has: boolean };
/** A finding rules a claim out when it is in the claim's group and lacks what the claim says. */
export const rulesOut = (f: Finding) => f.inGroup && !f.has;

export function ruleOutItem(rng: Rng, o: Place & { work?: boolean } = {}): ChooseItem {
  const pool = GROUPS.filter((g) => (o.work === undefined ? true : g.work === o.work));
  const g = rng.pick(pool);
  const thing = (adj: string, where: string) => `${cap(anArticle(adj))} ${adj} ${g.noun} ${where}`;
  const findings: Record<string, Finding & { label: string }> = {
    out: { inGroup: true, has: false, label: thing(g.no, g.here) },
    fit: { inGroup: true, has: true, label: thing(g.yes, g.here) },
    away: { inGroup: false, has: false, label: thing(g.no, g.there) },
  };
  const right = Object.keys(findings).find((id) => rulesOut(findings[id]))!;
  const claim = `Every ${g.noun} ${g.here} is ${g.yes}.`;
  return choose(
    rng,
    {
      lesson: o.lesson ?? L2, skill: 's17.rule-out', phase: o.phase ?? 'do', level: o.level ?? 3, twin: 's17.l2.rule-out',
      metaSkill: 'Track 4 · which finding rules a claim out',
      rule: `claim: ${claim} A finding rules it out when it is ${g.here} and not ${g.yes}.`,
      task: 'choose the finding that rules a claim out', rep: g.work ? 'findings at work' : 'everyday findings', difficulty: 2,
    },
    {
      prompt: `Claim: “${claim}” Which finding would rule the claim out?`,
      scene: lanternCard({ claim, rows: Object.values(findings).map((f) => ({ label: 'Finding', cells: [f.label] })) }),
      explain: `The ${g.no} ${g.noun} is ${g.here}, so the claim talks about it. But it is not ${g.yes}, so the claim fails for it. One finding like this rules the claim out.`,
      teach: {
        rule: 'A finding rules a claim out when the claim talks about it and the claim fails for it.',
        terms: [{ word: 'Rule out', meaning: 'show that a claim is false.' }, { word: 'A finding', meaning: 'something you saw or found when you checked.' }],
        casesTitle: `Testing “${claim}”`,
        cases: Object.values(findings).map((f) => ({
          label: `${f.label}.`,
          truths: [{ who: cap(g.here), value: f.inGroup }, { who: cap(g.yes), value: f.has }],
          words: YES_WORDS,
          note: rulesOut(f) ? 'It rules the claim out.' : f.inGroup ? 'It fits the claim.' : 'The claim says nothing about it.',
        })),
        remember: ['Look for a case the claim talks about, where the claim fails.', 'Ask: is it in the group? Is the claim false for it?'],
        simpler: ['Claim: every sock in this drawer is white.', 'A blue sock in this drawer rules it out.', 'A white sock fits. A blue sock in another drawer says nothing.'],
      },
      hints: [`Is the finding ${g.here}?`, `If it is, is it ${g.yes}?`, 'A finding that fits can’t rule a claim out.'],
      hintCase: { label: 'Claim: every sock in this drawer is white. A blue sock in this drawer.', truths: [{ who: 'In the drawer', value: true }, { who: 'White', value: false }], words: YES_WORDS, note: 'It rules the claim out.' },
      errorTags: { fit: 'examples-as-proof' },
    },
    Object.entries(findings).map(([id, f]) => ({ id, label: f.label })),
    right,
    {
      fit: { headline: 'This finding fits the claim, so it can’t rule it out.', detail: [`${findings.fit.label} is just what the claim says.`, 'Findings that fit only support a claim. A finding that breaks it is what rules it out.'] },
      away: { headline: `This finding is not ${g.here}, so the claim says nothing about it.`, detail: [`The claim is only about each ${g.noun} ${g.here}.`, `To rule it out, you need ${anArticle(g.no)} ${g.no} ${g.noun} ${g.here}.`] },
    },
  );
}

// =====================================================================================================================
// l3 · Why it must continue
// =====================================================================================================================

/** The steps of the reason why a stated rule (start at a, add d) gives its odd and even pattern. */
export function reasonSteps(a: number, d: number): string[] {
  const p = par(a), q = otherPar(p);
  if (d % 2 === 1) {
    return [
      `Start at ${a}, which is ${p}.`,
      `Adding ${d}, an odd number, turns ${p} into ${q}.`,
      `Adding ${d} again turns ${q} back into ${p}.`,
      'The same step happens every time, so odd and even keep taking turns.',
    ];
  }
  return [`Start at ${a}, which is ${p}.`, `Adding ${d}, an even number, keeps ${p} as ${p}.`, `The same step happens every time, so every term stays ${p}.`];
}

export function teachParity(): Teach {
  return {
    rule: 'Adding an odd number flips odd and even. Adding an even number keeps them the same. A stated rule does the same step every time, so it decides every term.',
    terms: [
      { word: 'Odd', meaning: 'a whole number that can’t be split into 2 equal whole groups, like 1, 3 and 5.' },
      { word: 'Even', meaning: 'a whole number that splits into 2 equal groups, like 2, 4 and 6.' },
      { word: 'Flip', meaning: 'odd turns into even, or even turns into odd.' },
      { word: 'A term', meaning: 'one number in the pattern. Term 1 is the first.' },
    ],
    casesTitle: 'Two stated rules',
    cases: [
      { label: `Start at 1 and add 3: ${list(termsOf(1, 3, 4))}.`, note: 'Odd, even, odd, even. Each jump of 3 flips it.' },
      { label: `Start at 2 and add 4: ${list(termsOf(2, 4, 4))}.`, note: 'Even every time. Each jump of 4 keeps it even.' },
    ],
    remember: ['An odd jump flips odd and even. An even jump keeps them.', 'Ask: what does one step do, and does it happen every time?'],
    simpler: ['1 is odd. 1 plus 3 is 4, which is even.', '4 plus 3 is 7, which is odd again.', 'Each jump of 3 flips it, so they keep taking turns.'],
  };
}

const constructedCard = (a: number, d: number, count: number, extra: Partial<LanternScene> = {}): LanternScene =>
  lanternCard({
    stated: `${cap(ruleText(a, d))}.`,
    pattern: 'constructed',
    rows: [{ label: 'Terms', cells: termsOf(a, d, count).map(String) }],
    ...extra,
  });

/** Explain (the trap): do the listed terms alone explain why the pattern must go on? (No: the rule does.) */
export function whyContinueItem(rng: Rng, o: Place = {}): ChooseItem {
  const d = rng.chance(0.7) ? rng.pick([1, 3, 5, 7]) : rng.pick([2, 4, 6]);
  const a = rng.int(1, 9);
  const m = rng.int(4, 6);
  const terms = termsOf(a, d, m);
  const flips = d % 2 === 1;
  const p = par(a);
  const what = flips ? 'Odd and even take turns.' : `Every term is ${p}.`;
  const must = flips ? 'why they must keep taking turns' : `why every term must be ${p}`;
  const step = flips ? `adding ${d}, an odd number, flips odd and even every time` : `adding ${d}, an even number, keeps every term ${p}`;
  const M = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][m];
  return choose(
    rng,
    {
      lesson: o.lesson ?? L3, skill: 's17.why-continue', phase: o.phase ?? 'explain', level: o.level ?? 4, twin: 's17.l3.why-continue',
      metaSkill: 'Track 4 · why a constructed pattern must continue',
      rule: `stated rule: ${ruleText(a, d)}; ${flips ? 'odd and even alternate' : `every term is ${p}`}`,
      task: 'explain whether listed terms alone explain the pattern', rep: 'a stated rule and its terms', difficulty: 4,
      rubric: { level: 3, text: '3 = says the stated rule guarantees every term, and why; 2 = says the examples are not enough; 1 = asks for more examples; 0 = no relevant rule' },
    },
    {
      prompt: `A pattern is made by a stated rule: ${ruleText(a, d)}. Its first ${m} terms are ${list(terms)}. ${what} Do these ${m} terms alone explain ${must}?`,
      scene: constructedCard(a, d, m, { rows: [{ label: 'Terms', cells: terms.map(String) }, { label: 'Odd or even', cells: terms.map(par) }], claim: flips ? 'Odd and even keep taking turns.' : `Every term is ${p}.` }),
      explain: `The ${m} terms are examples. They show the pattern so far, but not why it must go on. The reason is the rule: ${step}. That step comes at every term, so the pattern can never stop.`,
      teach: teachParity(),
      hints: ['Do the terms say anything about term 100?', 'What does one step of the rule do to odd and even?', 'Does that step happen every time?'],
      hintCase: { label: 'Start at 2 and add 2: 2, 4, 6, 8.', truths: [{ who: 'Four terms explain why it stays even', value: false }, { who: 'The rule explains it', value: true }], words: YES_WORDS, note: 'Adding 2 keeps even numbers even, every time.' },
      errorTags: { yes: 'examples-as-proof', more: 'examples-as-proof' },
      tags: ['examples-as-proof'],
    },
    [
      { id: 'no', label: `No. The rule explains it: ${step}.` },
      { id: 'yes', label: `Yes. ${M} terms in a row are enough to be sure.` },
      { id: 'more', label: `Not yet, but ${m + 5} terms would be enough.` },
      { id: 'stop', label: 'No, and the pattern may stop later.' },
    ],
    'no',
    {
      yes: { headline: `${M} terms are examples. They can’t explain why it must go on.`, detail: ['Examples show what happened so far, not what must happen next.', `The rule explains it: ${step}.`] },
      more: { headline: 'More terms are still only examples.', detail: ['No list of terms covers every term.', `The rule does: ${step}.`] },
      stop: { headline: 'The rule makes the pattern go on, so it can’t stop.', detail: [`The rule is stated: ${step}.`, 'That step comes at every term, so the pattern is sure to continue.'] },
    },
  );
}

export interface ParityOpts extends Place {
  framed?: boolean;
  /** Force an odd or an even jump. */
  odd?: boolean;
}

/** Odd or even at term n, from the stated rule. Faded: the term before and what the jump does are given. */
export function parityItem(rng: Rng, o: ParityOpts = {}): ChooseItem {
  const oddJump = o.odd ?? rng.chance(0.7);
  const d = oddJump ? rng.pick([1, 3, 5, 7]) : rng.pick([2, 4, 6]);
  const a = rng.int(1, 12);
  const n = o.framed ? rng.int(5, 8) : rng.int(15, 60);
  const t = termOf(a, d, n);
  const ans = par(t);
  const prev = termOf(a, d, n - 1);
  const framed = !!o.framed;
  const jumpWord = oddJump ? 'flips odd and even' : 'keeps odd and even the same';
  // A small worked twin for the hint: another rule with the same kind of jump, term 4.
  const ha = a === 2 ? 3 : 2;
  const hd = oddJump ? (d === 3 ? 5 : 3) : (d === 4 ? 2 : 4);
  const ht = termOf(ha, hd, 4);
  const explain = oddJump
    ? `Term ${n} is ${n - 1} jumps after term 1. Each jump of ${d} flips odd and even. ${n - 1} flips is ${anArticle(par(n - 1))} ${par(n - 1)} number of flips, so term ${n} is ${ans}. Check: ${a} plus ${n - 1} jumps of ${d} is ${t}.`
    : `Adding ${d}, an even number, never changes odd or even. Term 1 is ${a}, which is ${par(a)}, so every term is ${par(a)}. Check: term ${n} is ${t}.`;
  const wrongFb: ChoiceFeedback = oddJump
    ? {
        headline: `Term ${n} comes after ${n - 1} jumps of ${d}, and that makes it ${ans}.`,
        detail: [`Each jump flips odd and even. Term 1 is ${a}, which is ${par(a)}. After ${n - 1} flips, it is ${ans}.`, `Check: ${a} plus ${n - 1} jumps of ${d} is ${t}, which is ${ans}.`],
      }
    : {
        headline: `Adding ${d}, an even number, never flips odd and even.`,
        detail: [`Term 1 is ${a}, which is ${par(a)}. Every jump keeps it ${par(a)}.`, `Check: term ${n} is ${t}.`],
      };
  const wrong = otherPar(ans);
  const choices: Choice[] = [
    { id: 'odd', label: framed ? 'odd' : 'Odd' },
    { id: 'even', label: framed ? 'even' : 'Even' },
    ...(framed ? [] : [{ id: 'cant', label: 'Can’t tell without listing every term' }]),
  ];
  return choose(
    framed ? null : rng,
    {
      lesson: o.lesson ?? L3, skill: 's17.parity-step', phase: o.phase ?? 'do', level: o.level ?? 4, twin: oddJump ? 's17.l3.parity.flip' : 's17.l3.parity.keep',
      metaSkill: 'Track 4 · odd or even from a stated rule',
      rule: `stated rule: ${ruleText(a, d)}; term n is ${a} plus (n take away 1) jumps of ${d}`,
      task: 'decide if a far term is odd or even', rep: 'a stated rule', difficulty: framed ? 2 : 4,
    },
    {
      prompt: `A pattern is made by a stated rule: ${ruleText(a, d)}. Is term ${n} odd or even?`,
      scene: constructedCard(a, d, framed ? n - 1 : 4),
      explain,
      teach: teachParity(),
      hints: ['What does one jump do to odd and even?', `How many jumps come between term 1 and term ${n}?`, `A smaller case: start at ${ha} and add ${hd}. Term 4 is 3 jumps on: ${ht}, which is ${par(ht)}.`],
      hintCase: { label: `Start at ${ha} and add ${hd}. Term 4 is 3 jumps after term 1.`, note: `Term 4 is ${ht}, which is ${par(ht)}.` },
      errorTags: { ...(oddJump ? { [wrong]: 'off-by-one' as ErrorTag } : {}), cant: 'examples-as-proof' },
      frame: framed ? `Term ${n - 1} is ${prev}, which is ${par(prev)}. Adding ${d} ${jumpWord}. So term ${n} is ___.` : undefined,
    },
    choices,
    ans,
    {
      [wrong]: wrongFb,
      cant: { headline: 'The stated rule decides every term, so you can tell without listing them.', detail: [oddJump ? `Each jump of ${d} flips odd and even, and term ${n} is ${n - 1} jumps after term 1.` : `Each jump of ${d} keeps odd and even the same.`, `So term ${n} is ${ans}.`] },
    },
  );
}

/** Pick every step that belongs in the reason (the four steps, and two that do not belong). */
export function chainItem(rng: Rng, o: Place = {}): MultiItem {
  const a = rng.int(1, 10);
  const d = rng.pick([1, 3, 5, 7]);
  const steps = reasonSteps(a, d);
  const p = par(a), q = otherPar(p);
  const five = termsOf(a, d, 5);
  const k = rng.int(6, 9);
  const tk = termOf(a, d, k);
  const pool = [
    { id: 'list', label: `The first 5 terms are ${list(five)}.`, tip: 'A list of terms is an example, not a step of the reason. It shows what happened, not why.', tag: 'examples-as-proof' as ErrorTag },
    { id: 'bigger', label: `Adding ${d} makes each term bigger than the one before.`, tip: 'Each term is bigger, but that says nothing about odd and even.' },
    { id: 'first', label: 'Odd numbers always come before even numbers.', tip: 'That is not true: 2 comes before 3. It is not about this rule.' },
    { id: 'one', label: `Term ${k} is ${tk}, so it is ${par(tk)}.`, tip: 'One term is an example, not a step of the reason.', tag: 'examples-as-proof' as ErrorTag },
  ];
  const extra = rng.shuffle(pool).slice(0, 2);
  const ids = ['s1', 's2', 's3', 's4'];
  const missTips: Record<string, string> = {
    s1: `The reason needs its start: term 1 is ${a}, which is ${p}. Without it, you can’t say which comes first.`,
    s2: `The reason needs the flip: adding ${d}, an odd number, turns ${p} into ${q}.`,
    s3: `The reason needs the flip back: adding ${d} again turns ${q} back into ${p}.`,
    s4: 'The reason needs “every time”: the same step comes at every term, so the turns never stop.',
  };
  const errorTags = Object.fromEntries(extra.filter((x) => x.tag).map((x) => [x.id, x.tag!]));
  const spec: Spec = {
    lesson: o.lesson ?? L3, skill: 's17.reason-chain', phase: o.phase ?? 'do', level: o.level ?? 4, twin: 's17.l3.chain',
    metaSkill: 'Track 4 · build the reason chain',
    rule: `stated rule: ${ruleText(a, d)}; the reason: start, flip, flip back, every time`,
    task: 'pick the steps that belong in the reason', rep: 'reason steps in words', difficulty: 4,
  };
  const item: MultiItem = {
    kind: 'multi',
    ...common(spec, {
      prompt: `A pattern is made by a stated rule: ${ruleText(a, d)}. Odd and even take turns. Pick every step that belongs in the reason why they must keep taking turns.`,
      scene: constructedCard(a, d, 4),
      explain: `The reason starts at term 1, flips with each jump of ${d}, flips back, and says the same step comes every time. Lists of terms are examples, not steps of the reason.`,
      teach: teachParity(),
      hints: ['Where does the reason start?', `What does one jump of ${d} do to odd and even?`, 'Why can the turns never stop?'],
      hintCase: { label: 'Start at 2 and add 4. The reason: start at 2, which is even. Adding 4 keeps even as even. The same step comes every time.', note: 'Start, step, every time. No list of terms is needed.' },
      errorTags,
    }, 'set'),
    choices: rng.shuffle([...steps.map((s, i) => ({ id: ids[i], label: s })), ...extra.map((x) => ({ id: x.id, label: x.label }))]),
    answer: ids,
    missTips,
    pickTips: Object.fromEntries(extra.map((x) => [x.id, x.tip])),
  };
  return item;
}

/** How many jumps from term 1 to term n? (n take away 1; the near miss is n) */
export function jumpsItem(rng: Rng, o: Place = {}): NumberItem {
  const a = rng.int(1, 9);
  const d = rng.int(2, 7);
  const n = rng.int(12, 40);
  const spec: Spec = {
    lesson: o.lesson ?? L3, skill: 's17.jumps', phase: o.phase ?? 'do', level: o.level ?? 4, twin: 's17.l3.jumps',
    metaSkill: 'Track 4 · count the jumps between terms',
    rule: `stated rule: ${ruleText(a, d)}; term n is n take away 1 jumps after term 1`,
    task: 'count the jumps to a far term', rep: 'a stated rule', difficulty: 3,
  };
  const feedback: Record<string, ChoiceFeedback> = {
    [String(n)]: { headline: `${n} counts the terms, not the jumps between them.`, detail: [`From term 1 to term 2 is 1 jump. From term 1 to term ${n} is ${n - 1} jumps.`] },
    [String(n + 1)]: { headline: `${n + 1} is two more than the jumps.`, detail: [`Count the gaps between terms. From term 1 to term ${n}, there are ${n - 1}.`] },
    [String(n - 2)]: { headline: `${n - 2} is one jump short.`, detail: [`Term 2 is 1 jump after term 1, so term ${n} is ${n - 1} jumps after it.`] },
  };
  const item: NumberItem = {
    kind: 'number',
    ...common(spec, {
      prompt: `A pattern is made by a stated rule: ${ruleText(a, d)}. How many jumps of ${d} take you from term 1 to term ${n}?`,
      scene: constructedCard(a, d, 4),
      explain: `Term 2 is 1 jump after term 1, and term 3 is 2 jumps after it. So term ${n} is ${n - 1} jumps after term 1.`,
      teach: teachParity(),
      hints: ['Count the gaps between terms, not the terms.', 'From term 1 to term 3, how many jumps?', `So from term 1 to term ${n}?`],
      hintCase: { label: 'Terms 1, 2, 3 and 4 have 3 gaps between them.', note: 'From term 1 to term 4 is 3 jumps.' },
      errorTags: { [String(n)]: 'off-by-one', [String(n + 1)]: 'off-by-one', [String(n - 2)]: 'off-by-one' },
    }, 'number'),
    answer: n - 1,
    digits: 2,
    unit: 'jumps',
    feedback,
  };
  return syncWhyWrong(item);
}

export const CONTEXTS = ['lamp', 'ferry', 'seats', 'frog'] as const;
export type ContextId = (typeof CONTEXTS)[number];

/** The state after n flips from a start: true when an odd number of flips (the other state). Walked one flip at a time in the tests. */
export const flippedAfter = (n: number) => n % 2 === 1;

/** Transfer: a stated rule in a new setting (a lamp, a ferry, seats in rows, a frog on stones). */
export function mustContinueItem(rng: Rng, o: Place & { context?: ContextId } = {}): ChooseItem {
  const ctx = o.context ?? rng.pick(CONTEXTS);
  const spec = (rule: string, rep: string): Spec => ({
    lesson: o.lesson ?? L3, skill: 's17.must-continue', phase: o.phase ?? 'transfer', level: o.level ?? 4, twin: 's17.l3.transfer',
    metaSkill: 'Track 4 · a stated rule decides a far case', rule, task: 'decide a far case from a stated rule', rep, difficulty: 4,
  });
  const cantFb = (what: string): ChoiceFeedback => ({ headline: 'The stated rule tells you, so you don’t need to try it out.', detail: [`The same step comes every time, so it decides ${what}.`] });
  const hintCase: TeachCase = { label: 'A light starts off. 3 flips: on, off, on.', note: 'An odd number of flips ends on the other side.' };
  const hints = ['What does one step do?', 'Does the same step happen every time?', 'Count the steps: an odd number of flips ends on the other side.'];
  if (ctx === 'lamp' || ctx === 'ferry') {
    const n = rng.int(7, 30);
    const flipped = flippedAfter(n);
    const lamp = ctx === 'lamp';
    const [s0, s1] = lamp ? ['off', 'on'] : ['north', 'south'];
    const ans = flipped ? s1 : s0;
    const label = (s: string) => (lamp ? cap(s) : `At the ${s} dock`);
    return choose(
      rng,
      spec(lamp ? 'a lamp starts off; each clap flips it' : 'a ferry starts at the north dock; each trip crosses to the other dock', lamp ? 'a lamp and claps' : 'a ferry and trips'),
      {
        prompt: lamp
          ? `A lamp starts off. Each clap flips it: off to on, or on to off. That rule is stated. After ${n} claps, is the lamp on or off?`
          : `A ferry starts at the north dock. Each trip takes it across the river to the other dock. That rule is stated. After ${n} trips, where is it?`,
        scene: lanternCard({ stated: lamp ? 'Start off. Each clap flips the lamp.' : 'Start at the north dock. Each trip crosses the river.', pattern: 'constructed', rows: [{ label: lamp ? 'Claps' : 'Trips', cells: range(0, 3).map(String) }, { label: lamp ? 'Lamp' : 'Dock', cells: range(0, 3).map((i) => (flippedAfter(i) ? s1 : s0)) }] }),
        explain: `Each ${lamp ? 'clap' : 'trip'} flips it. ${n} is ${anArticle(par(n))} ${par(n)} number of flips. From ${lamp ? 'off' : 'the north dock'}, an odd number of flips ends on the other side, and an even number ends where it started. So it is ${lamp ? ans : `at the ${ans} dock`}.`,
        teach: teachParity(),
        hints,
        hintCase,
        errorTags: { cant: 'examples-as-proof' },
      },
      [
        { id: s0, label: label(s0) },
        { id: s1, label: label(s1) },
        { id: 'cant', label: lamp ? 'Can’t tell without clapping it out' : 'Can’t tell without riding along' },
      ],
      ans,
      {
        [flipped ? s0 : s1]: { headline: `${n} ${lamp ? 'claps' : 'trips'} from ${lamp ? 'off' : 'the north dock'} end ${flipped ? 'on the other side' : 'where it started'}.`, detail: [`${n} is ${par(n)}. An odd number of flips ends on the other side. An even number ends where it started.`, `So it is ${lamp ? ans : `at the ${ans} dock`}.`] },
        cant: cantFb(lamp ? `if the lamp is on or off after ${n} claps` : `where the ferry is after ${n} trips`),
      },
    );
  }
  const a = rng.int(2, 9);
  const d = rng.int(2, 7);
  if (ctx === 'seats') {
    const n = rng.int(8, 25);
    const t = termOf(a, d, n);
    const ans = par(t);
    return choose(
      rng,
      spec(`row 1 has ${a} seats; each row has ${d} more than the row before`, 'seats in rows'),
      {
        prompt: `Row 1 of a hall has ${a} seats. Each row has ${d} more seats than the row before. That rule is stated. Does row ${n} have an odd or an even number of seats?`,
        scene: lanternCard({ stated: `Row 1 has ${a} seats. Each row adds ${d}.`, pattern: 'constructed', rows: [{ label: 'Rows 1 to 4', cells: termsOf(a, d, 4).map(String) }] }),
        explain: d % 2 === 1
          ? `Each row adds ${d}, an odd number, so odd and even flip from row to row. Row ${n} is ${n - 1} rows after row 1, an ${par(n - 1)} number of flips. So it is ${ans}: ${a} plus ${n - 1} times ${d} is ${t}.`
          : `Each row adds ${d}, an even number, so every row stays ${par(a)}. Row ${n} has ${t} seats, which is ${ans}.`,
        teach: teachParity(),
        hints,
        hintCase,
        errorTags: { cant: 'examples-as-proof', ...(d % 2 === 1 ? { [otherPar(ans)]: 'off-by-one' as ErrorTag } : {}) },
      },
      [
        { id: 'odd', label: 'Odd' },
        { id: 'even', label: 'Even' },
        { id: 'cant', label: 'Can’t tell without counting every row' },
      ],
      ans,
      {
        [otherPar(ans)]: d % 2 === 1
          ? { headline: `Row ${n} comes ${n - 1} rows after row 1, and that makes it ${ans}.`, detail: [`Each row adds ${d}, which flips odd and even. Row 1 has ${a}, which is ${par(a)}.`, `${a} plus ${n - 1} times ${d} is ${t}, which is ${ans}.`] }
          : { headline: `Adding ${d}, an even number, never flips odd and even.`, detail: [`Row 1 has ${a}, which is ${par(a)}, so every row is ${par(a)}.`, `Row ${n} has ${t} seats.`] },
        cant: cantFb(`row ${n}`),
      },
    );
  }
  const h = rng.int(8, 25);
  const stone = a + h * d;
  const ans = par(stone);
  return choose(
    rng,
    spec(`a frog starts on stone ${a}; each hop moves it ${d} stones ahead`, 'a frog on numbered stones'),
    {
      prompt: `A frog sits on stone ${a}. Each hop takes it ${d} stones ahead. That rule is stated. After ${h} hops, is it on an odd or an even stone?`,
      scene: lanternCard({ stated: `Start on stone ${a}. Each hop goes ${d} stones ahead.`, pattern: 'constructed', rows: [{ label: 'Hops 0 to 3', cells: range(0, 3).map((i) => String(a + i * d)) }] }),
      explain: d % 2 === 1
        ? `Each hop of ${d}, an odd number, flips odd and even. ${h} hops is ${anArticle(par(h))} ${par(h)} number of flips from stone ${a}. So it lands on stone ${stone}, which is ${ans}.`
        : `Each hop of ${d}, an even number, keeps odd and even the same. Stone ${a} is ${par(a)}, so every stone it lands on is ${par(a)}. After ${h} hops it is on stone ${stone}.`,
      teach: teachParity(),
      hints,
      hintCase,
      errorTags: { cant: 'examples-as-proof', ...(d % 2 === 1 ? { [otherPar(ans)]: 'off-by-one' as ErrorTag } : {}) },
    },
    [
      { id: 'odd', label: 'An odd stone' },
      { id: 'even', label: 'An even stone' },
      { id: 'cant', label: 'Can’t tell without watching every hop' },
    ],
    ans,
    {
      [otherPar(ans)]: d % 2 === 1
        ? { headline: `${h} hops are ${h} flips, and that lands on ${anArticle(ans)} ${ans} stone.`, detail: [`Stone ${a} is ${par(a)}. Each hop of ${d} flips odd and even.`, `${a} plus ${h} hops of ${d} is ${stone}, which is ${ans}.`] }
        : { headline: `Hops of ${d}, an even number, never flip odd and even.`, detail: [`Stone ${a} is ${par(a)}, so every stone it lands on is ${par(a)}.`, `After ${h} hops it is on stone ${stone}.`] },
      cant: cantFb(`the stone after ${h} hops`),
    },
  );
}

// ---------- shared: the row of a lantern card for a sequence, with its role ----------

export const ROLE_TAG: Record<CaseRole, string> = { break: 'breaks it', fit: 'fits', none: 'says nothing' };

export function roleRow(f: SeqFamily, xs: number[]): LanternRow {
  const r = roleOf(f, xs);
  return { label: 'Test', cells: xs.map(String), tag: ROLE_TAG[r], ...(r === 'break' ? { lit: true } : {}) };
}
