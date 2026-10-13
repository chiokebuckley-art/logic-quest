/**
 * Stop 12 · Proof (id s11, n 11). The models, the items and their teaching. The cards, contrast pictures and guided
 * boards are in ./proofBoards.ts; the stop file (src/content/stop11.ts) puts the lessons together.
 *
 * The stop names the ways the game has proved things all along:
 *  - a chain (a direct proof): Line Up's chains and Proof Lantern's reason chains. Model: names in a line, givens
 *    that say who comes before whom, a definition for one word, and steps that each name what they use. A step
 *    follows when every line (and every meaning of the defined word) where what it uses is true makes it true too:
 *    the worlds are listed, never assumed (follows).
 *  - cover every case (a proof by cases): Grid Detective's cases. Model: a thing that is one of a few options, givens
 *    that rule some out, a claim that is true or false for each option (from a table of facts, or from the number
 *    itself), and a proof that checks some options. It covers every case when it checks every option the givens
 *    leave (casesLeft).
 *  - suppose and crash (a proof by contradiction): Knights & Knaves. Model: a knights puzzle, its cases listed
 *    (solutions), and Stop 5's explainSolve for the guess and its crash.
 *  - one counterexample: Ways to Think and Proof Lantern. Model: shape cards and a claim about every card in a group
 *    (in the group and failing it breaks it; in the group and holding fits; outside says nothing), and Proof
 *    Lantern's sequence families (roleOf).
 *
 * Kinds (skill tags): method (l1), cite (l2), cases (l3), crash (l4), counter (l5), rules (l6, in ./proofRules.ts),
 * induction (l7, in ./proofInduction.ts), and why (the closing item of the check). Every pass rule asks for its
 * lesson's trap: only examples (l1), a true step that uses nothing (l2), a case left out (l3), a guess that does not
 * crash (l4), examples that fit an every claim (l5), a step that looks like a rule and is not (l6), checked cases
 * offered as the step to the next (l7).
 *
 * Every answer, explanation, wrong-choice feedback, hint case and teach case is computed here from the models. Only
 * the rng passed in is used, so the same seed always gives the same item.
 */
import { speakerFits } from '../grade';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, ChooseItem, Color, Rng, Scene, Shape, Size, Teach, TeachCase, Thing, Truth } from '../types';
import { a as aKind, allKinds, breakers, candidates, flip, kindsCase, kindsText, makeCast, makePuzzle, PUZZLE_RULE, solutions, speakersScene, type Claims, type KindMap, type Namer, type SkinId } from './knights';
import { FAMILIES, FAMILY_IDS, caseFor, par, reasonSteps, roleOf as seqRole, seqText, statusItem, type CaseRole, type FamilyId, type SeqFamily } from './observatory/proof';
import type { ItemCore, Made } from './statements';

export type { CaseRole };

export const STOP = 11;
export const LESSONS = { method: 's11.l1', cite: 's11.l2', cases: 's11.l3', crash: 's11.l4', counter: 's11.l5', rules: 's11.l6', induction: 's11.l7' } as const;

export type ProofSkin = 'everyday' | 'fantasy' | 'abstract';
export const PROOF_SKINS: readonly ProofSkin[] = ['everyday', 'fantasy', 'abstract'];

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const unstop = (s: string) => s.replace(/[.!?]$/, '');
/** "Ava, Ben and Cal" */
export const joinAnd = (xs: readonly string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** "a cat, a dog or a fish" */
export const joinOr = (xs: readonly string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);
const YES_NO_WORDS = { truth: 'yes', untruth: 'no' } as const;

// ---------- the made item ----------

export type ProofKind =
  | 'method'
  | 'cite-pick'
  | 'cite-broken'
  | 'cite-trap'
  | 'cases-must'
  | 'cases-left'
  | 'cases-trap'
  | 'crash-proves'
  | 'crash-breaker'
  | 'crash-trap'
  | 'counter-which'
  | 'counter-trap'
  | 'counter-one'
  | 'rule-name'
  | 'rule-conclude'
  | 'rule-trap'
  | 'ind-parts'
  | 'ind-missing'
  | 'ind-proves'
  | 'why';

export type Method = 'chain' | 'cases' | 'crash' | 'counter' | 'examples';
export const METHODS: readonly Method[] = ['chain', 'cases', 'crash', 'counter', 'examples'];
/** The four ways to prove (and to disprove): every method but the examples trap. */
export const WAYS: readonly Exclude<Method, 'examples'>[] = ['chain', 'cases', 'crash', 'counter'];

/** A made item, plus the model it was made from (for the tests, which work every answer out again). */
export interface ProofMade extends Made {
  kind: ProofKind;
  chain?: ChainProof;
  cases?: CaseProof;
  crash?: CrashCase;
  counter?: CounterCase;
  seq?: SeqCase;
  /** method items: the way the reasoning uses; why items: the family. */
  method?: Method;
  /** A chain from Proof Lantern: the stated rule (start at a, add d) whose odd and even pattern the steps prove. */
  parity?: { a: number; d: number };
}

/** The trap each lesson's pass rule asks for (LessonPass.include). Every planned pack holds one. */
export const TRAPS = {
  method: { tag: 'only-examples', label: 'a reasoning that only gives examples' },
  cite: { tag: 'cites-nothing', label: 'a true step that uses nothing' },
  cases: { tag: 'case-left-out', label: 'a proof that leaves a case out' },
  crash: { tag: 'no-crash', label: 'a guess that does not crash' },
  counter: { tag: 'examples-not-proof', label: 'examples that fit an every claim' },
  rules: { tag: 'looks-like-rule', label: 'a step that looks like a rule and is not' },
  induction: { tag: 'checks-as-step', label: 'checked cases offered as the step to the next' },
} as const;
export const WHY_TAG = 'why';

/** Check time: a proof to read takes longer than a plain question. */
export const PROOF_SECONDS = 120;

function done(tag: string, kind: ProofKind, item: ItemCore, extra: Partial<ProofMade> = {}): ProofMade {
  syncWhyWrong(item);
  return { tag, item, kind, ...extra };
}

/** Shuffle the choices; ids stay fixed, so feedback always matches. */
const shuffled = (rng: Rng, xs: Choice[]) => rng.shuffle(xs);

// =====================================================================================================================
// A chain (a direct proof): names in a line
// =====================================================================================================================

export type OrderSkinId = 'race' | 'born' | 'hatch' | 'letters';

export interface OrderSkin {
  id: OrderSkinId;
  skin: ProofSkin;
  /** Names with different first letters. */
  pool: readonly string[];
  /** "Ava, Ben, Cal and Dee ran a race." */
  setting: (list: string) => string;
  /** "Ava finished before Ben" (no period). */
  before: (a: string, b: string) => string;
  /** The defined word in a sentence: "Ava beat Dee" (no period). */
  defined: (a: string, b: string) => string;
  /** The word the definition gives a meaning: "beat". */
  word: string;
  /** The definition, agreed before the proof. */
  definition: string;
  /** What really happened: "They finished in this order: Ava, Ben, Cal and Dee." */
  order: (list: string) => string;
}

const PEOPLE = ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana', 'Jin', 'Kofi', 'Lena', 'Mo', 'Nia', 'Omar', 'Pia', 'Raj', 'Sol', 'Tia', 'Uma', 'Zoe'];

export const ORDER_SKINS: Readonly<Record<OrderSkinId, OrderSkin>> = {
  race: {
    id: 'race', skin: 'everyday', pool: PEOPLE,
    setting: (l) => `${l} ran a race.`,
    before: (a, b) => `${a} finished before ${b}`,
    defined: (a, b) => `${a} beat ${b}`,
    word: 'beat',
    definition: 'To beat someone in a race means to finish before them.',
    order: (l) => `They finished in this order: ${l}.`,
  },
  born: {
    id: 'born', skin: 'everyday', pool: PEOPLE,
    setting: (l) => `${l} are cousins.`,
    before: (a, b) => `${a} was born before ${b}`,
    defined: (a, b) => `${a} is older than ${b}`,
    word: 'older',
    definition: 'Older means born first. One cousin is older than another when born before them.',
    order: (l) => `They were born in this order: ${l}.`,
  },
  hatch: {
    id: 'hatch', skin: 'fantasy', pool: ['Blaze', 'Ember', 'Flint', 'Jade', 'Moss', 'Pip', 'Rook', 'Spark', 'Tide', 'Wisp'],
    setting: (l) => `The baby dragons ${l} hatched in one nest.`,
    before: (a, b) => `${a} hatched before ${b}`,
    defined: (a, b) => `${a} is older than ${b}`,
    word: 'older',
    definition: 'For dragons, older means hatched first. One dragon is older than another when it hatched before it.',
    order: (l) => `They hatched in this order: ${l}.`,
  },
  letters: {
    id: 'letters', skin: 'abstract', pool: ['A', 'B', 'C', 'D', 'E'],
    setting: (l) => `The letters ${l} stand in a line.`,
    before: (a, b) => `${a} comes before ${b}`,
    defined: (a, b) => `${a} is ahead of ${b}`,
    word: 'ahead of',
    definition: '“Ahead of” means comes before. One letter is ahead of another when it comes before it.',
    order: (l) => `The line is ${l}, in that order.`,
  },
};
export const ORDER_SKIN_IDS = Object.keys(ORDER_SKINS) as OrderSkinId[];
export const ORDER_BY_SKIN: Readonly<Record<ProofSkin, readonly OrderSkinId[]>> = { everyday: ['race', 'born'], fantasy: ['hatch'], abstract: ['letters'] };

/** A fact of a chain: who comes before whom, or the defined word ("beat") about two names. */
export interface OStmt {
  t: 'before' | 'def';
  a: string;
  b: string;
}
/** What a step uses: a given, an earlier step, or the definition (by index from 0). */
export type Src = { t: 'given'; k: number } | { t: 'step'; k: number } | { t: 'def' };

export interface ChainStep {
  stmt: OStmt;
  uses: Src[];
}

export interface ChainProof {
  skin: OrderSkin;
  /** The names as the setting lists them (not the real order). */
  names: string[];
  /** What really happened: the real line, first to last. Every given is true in it. */
  line: string[];
  givens: OStmt[];
  claim: OStmt;
  steps: ChainStep[];
  /** A broken proof: the step that does not follow from what it uses, and how. */
  broken?: { k: number; how: BreakHow };
}
export type BreakHow = 'nothing' | 'wrong' | 'def';

const B = (a: string, b: string): OStmt => ({ t: 'before', a, b });
const D = (a: string, b: string): OStmt => ({ t: 'def', a, b });
const G = (k: number): Src => ({ t: 'given', k });
const S = (k: number): Src => ({ t: 'step', k });
const DEF: Src = { t: 'def' };
/** The pieces of a chain, for the worked examples and boards (./proofBoards.ts). */
export const chainParts = { B, D, G, S, DEF } as const;
const sameStmt = (x: OStmt, y: OStmt) => x.t === y.t && x.a === y.a && x.b === y.b;
const srcKey = (s: Src) => (s.t === 'def' ? 'def' : `${s.t}${s.k}`);
const sameSrcs = (x: readonly Src[], y: readonly Src[]) => [...x.map(srcKey)].sort().join() === [...y.map(srcKey)].sort().join();

export const stmtText = (p: Pick<ChainProof, 'skin'>, s: OStmt) => `${s.t === 'before' ? p.skin.before(s.a, s.b) : p.skin.defined(s.a, s.b)}.`;
export const srcText = (s: Src) => (s.t === 'def' ? 'the definition' : `${s.t} ${s.k + 1}`);
export const usesText = (uses: readonly Src[]) => (uses.length ? `Uses ${joinAnd(uses.map(srcText))}.` : 'Uses nothing.');
/** A set of sources as a choice: "Step 1 and given 3", "Step 2 only", "Nothing. It is true already." */
export const usesLabel = (uses: readonly Src[]) => (uses.length === 0 ? 'Nothing. It is true already.' : uses.length === 1 ? `${cap(srcText(uses[0]))} only` : cap(joinAnd(uses.map(srcText))));

// ---------- worlds: every line, and every meaning the defined word could have without its definition ----------

interface OWorld {
  order: string[];
  def: Record<string, boolean>;
}
const pairKey = (a: string, b: string) => `${a}>${b}`;

function perms<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Every world for these names: every order, and each defined pair true or false. */
export function oWorlds(names: readonly string[], defPairs: readonly string[]): OWorld[] {
  const out: OWorld[] = [];
  const n = defPairs.length;
  for (const order of perms(names)) {
    for (let m = 0; m < 1 << n; m++) out.push({ order, def: Object.fromEntries(defPairs.map((k, i) => [k, !!(m & (1 << i))])) });
  }
  return out;
}

export const beforeIn = (order: readonly string[], a: string, b: string) => order.indexOf(a) < order.indexOf(b);
export const holdsIn = (s: OStmt, w: OWorld) => (s.t === 'before' ? beforeIn(w.order, s.a, s.b) : !!w.def[pairKey(s.a, s.b)]);

/** The statement a source stands for (the definition stands for none: it ties the defined word to "before"). */
const srcStmt = (p: ChainProof, s: Src): OStmt | null => (s.t === 'given' ? p.givens[s.k] : s.t === 'step' ? p.steps[s.k].stmt : null);

function defPairsOf(p: ChainProof, extra: readonly OStmt[] = []): string[] {
  const all = [p.claim, ...p.givens, ...p.steps.map((s) => s.stmt), ...extra];
  return [...new Set(all.filter((s) => s.t === 'def').map((s) => pairKey(s.a, s.b)))];
}

function srcHolds(p: ChainProof, s: Src, w: OWorld): boolean {
  if (s.t === 'def') return Object.entries(w.def).every(([k, v]) => { const [a, b] = k.split('>'); return v === beforeIn(w.order, a, b); });
  return holdsIn(srcStmt(p, s)!, w);
}

/** The worlds where everything a step uses is true, but the step is false. None: the step follows. */
export function counterWorlds(p: ChainProof, stmt: OStmt, uses: readonly Src[]): OWorld[] {
  return oWorlds(p.names, defPairsOf(p, [stmt])).filter((w) => uses.every((s) => srcHolds(p, s, w)) && !holdsIn(stmt, w));
}

/** Does the statement follow from these sources? True when no world makes them all true and it false. */
export const follows = (p: ChainProof, stmt: OStmt, uses: readonly Src[]) => counterWorlds(p, stmt, uses).length === 0;
/** Does step k follow from what it uses? */
export const stepFollows = (p: ChainProof, k: number) => follows(p, p.steps[k].stmt, p.steps[k].uses);
/** The steps that do not follow from what they use. */
export const brokenSteps = (p: ChainProof) => p.steps.map((_, k) => k).filter((k) => !stepFollows(p, k));
/** Is the statement true in what really happened (the real line, with the defined word meaning what it says)? */
export const trueInStory = (p: ChainProof, s: OStmt) => beforeIn(p.line, s.a, s.b);

/** A chain proof that works: four names in a line, three givens, two chain steps, then the definition step. */
export function makeChain(rng: Rng, skinId: OrderSkinId): ChainProof {
  const sk = ORDER_SKINS[skinId];
  const names = skinId === 'letters' ? sk.pool.slice(0, 4) : rng.shuffle(sk.pool).slice(0, 4);
  const line = rng.shuffle(names);
  const [p0, p1, p2, p3] = line;
  const givens = rng.shuffle([B(p0, p1), B(p1, p2), B(p2, p3)]);
  const gi = (s: OStmt) => G(givens.findIndex((g) => sameStmt(g, s)));
  const steps: ChainStep[] = rng.chance(0.5)
    ? [
        { stmt: B(p0, p2), uses: [gi(B(p0, p1)), gi(B(p1, p2))] },
        { stmt: B(p0, p3), uses: [S(0), gi(B(p2, p3))] },
        { stmt: D(p0, p3), uses: [S(1), DEF] },
      ]
    : [
        { stmt: B(p1, p3), uses: [gi(B(p1, p2)), gi(B(p2, p3))] },
        { stmt: B(p0, p3), uses: [gi(B(p0, p1)), S(0)] },
        { stmt: D(p0, p3), uses: [S(1), DEF] },
      ];
  return { skin: sk, names: skinId === 'letters' ? [...names] : names, line, givens, claim: D(p0, p3), steps };
}

/** Every set of one or two sources step k could name (givens, earlier steps, and the definition). */
export function sourceSets(p: ChainProof, k: number): Src[][] {
  const pool: Src[] = [...p.givens.map((_, i) => G(i)), ...p.steps.slice(0, k).map((_, j) => S(j)), DEF];
  const out: Src[][] = pool.map((s) => [s]);
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) out.push([pool[i], pool[j]]);
  return out;
}

/** The same proof with step k broken: it uses nothing, uses facts that do not force it, or drops the definition. */
export function breakChain(rng: Rng, p: ChainProof, how: BreakHow): ChainProof {
  const steps = p.steps.map((s) => ({ ...s, uses: [...s.uses] }));
  let k: number;
  if (how === 'def') {
    k = 2;
    steps[k].uses = steps[k].uses.filter((s) => s.t !== 'def');
  } else if (how === 'nothing') {
    k = rng.int(0, 1);
    steps[k].uses = [];
  } else {
    k = rng.int(0, 1);
    const right = steps[k].uses;
    const near = sourceSets(p, k).filter((set) => set.length === 2 && set.every((s) => s.t !== 'def') && !follows(p, steps[k].stmt, set) && set.some((s) => right.some((r) => srcKey(r) === srcKey(s))));
    steps[k].uses = rng.pick(near);
  }
  const q: ChainProof = { ...p, steps, broken: { k, how } };
  if (brokenSteps(q).join() !== String(k)) throw new Error('breakChain: exactly the broken step must fail');
  return q;
}

/** The proof as lines: the real order (when shown), the givens, the definition, the claim, then each step and its uses. */
export function chainLines(p: ChainProof, o: { real?: boolean; hide?: number } = {}): string[] {
  return [
    ...(o.real ? [p.skin.order(joinAnd(p.line))] : []),
    ...p.givens.map((g, i) => `Given ${i + 1}: ${stmtText(p, g)}`),
    `Definition: ${p.skin.definition}`,
    `Claim: ${stmtText(p, p.claim)}`,
    ...p.steps.map((s, i) => `Step ${i + 1}: ${stmtText(p, s.stmt)} ${i === o.hide ? 'Uses what?' : usesText(s.uses)}`),
  ];
}
export const chainScene = (p: ChainProof, o: { real?: boolean; hide?: number } = {}): Scene => ({ kind: 'text', lines: chainLines(p, o) });

/** "Picture this order: Cal, Dee, Ava, Ben." */
const orderWords = (w: OWorld) => w.order.join(', ');

/**
 * Why a statement does not follow from these sources, in words: an order (or a meaning of the word) where every
 * source is true and the statement is false. The first world found is the one shown, so it is the same every time.
 */
export function whyNot(p: ChainProof, stmt: OStmt, uses: readonly Src[], who: string): string[] {
  const plain = unstop(stmtText(p, { ...stmt, t: 'before' }));
  // A world where the order itself goes the other way (always there when nothing ties the word down).
  const w = counterWorlds(p, stmt, uses).find((x) => !beforeIn(x.order, stmt.a, stmt.b));
  if (stmt.t === 'def' && uses.length && !uses.some((s) => s.t === 'def')) {
    return [`${who} uses only ${joinAnd(uses.map(srcText))}. ${uses.length === 1 ? 'That says' : 'Those say'} who came first. ${uses.length === 1 ? 'It does' : 'They do'} not say what “${p.skin.word}” means.`, 'Only the definition ties the word to the order. So the step must use the definition.'];
  }
  if (!w) throw new Error('whyNot: it follows');
  if (!uses.length) return [`${who} uses nothing, so nothing forces it.`, `It is true in the story, but a proof must show why. Picture this order: ${orderWords(w)}. There, it is not true that ${plain}.`];
  const said = uses.map((s) => (s.t === 'def' ? 'The definition gives the meaning of the word.' : `${cap(srcText(s))} says ${stmtText(p, srcStmt(p, s)!)}`));
  return [...said, `Picture this order: ${orderWords(w)}. ${uses.length === 1 ? `${cap(srcText(uses[0]))} still holds` : 'They both still hold'} there, but it is not true that ${plain}.`];
}

/** Why a step follows from what it uses, in a sentence or two. */
export function whyFollows(p: ChainProof, stmt: OStmt, uses: readonly Src[]): string {
  if (stmt.t === 'def') {
    const from = uses.find((s) => s.t !== 'def')!;
    return `${cap(srcText(from))} says ${stmtText(p, srcStmt(p, from)!)} The definition says that is what “${p.skin.word}” means.`;
  }
  const facts = uses.filter((s) => s.t !== 'def').map((s) => unstop(stmtText(p, srcStmt(p, s)!)));
  return `${cap(joinAnd(uses.map(srcText)))} say ${joinAnd(facts)}. Join them with the chain rule, and ${stmtText(p, stmt)}`;
}

const CHAIN_TERMS = (p: ChainProof) => [
  { word: 'A given', meaning: 'a fact the proof starts from.' },
  { word: 'A step', meaning: 'a new fact in the proof. It names what it uses.' },
  { word: 'Follows', meaning: 'what the step uses forces it. If those are true, the step must be true.' },
  { word: 'The definition', meaning: `what a word means, agreed before the proof. ${p.skin.definition}` },
  { word: 'The chain rule', meaning: 'if a first comes before a second, and the second before a third, the first comes before the third.' },
];

/** One step, checked: does what it uses force it? */
export function stepCase(p: ChainProof, k: number): TeachCase {
  const s = p.steps[k];
  const f = stepFollows(p, k);
  return {
    label: `Step ${k + 1}: ${stmtText(p, s.stmt)} ${usesText(s.uses)}`,
    truths: [{ who: 'Follows from what it uses', value: f }],
    words: YES_NO_WORDS,
    note: f ? whyFollows(p, s.stmt, s.uses) : whyNot(p, s.stmt, s.uses, `Step ${k + 1}`).join(' '),
  };
}

function chainTeach(p: ChainProof, rule: string): Teach {
  const first = p.steps[0];
  return {
    rule,
    terms: CHAIN_TERMS(p),
    meaning: `The proof starts from ${p.givens.length} givens. It wants to show ${stmtText(p, p.claim)}`,
    casesTitle: 'Each step, checked',
    cases: p.steps.map((_, k) => stepCase(p, k)),
    remember: ['Check each step on its own. Does what it uses force it?', 'Ask: if only these were true, must this step be true?'],
    simpler: [
      `Take step 1: ${stmtText(p, first.stmt)}`,
      ...(first.uses.length
        ? [`It uses ${joinAnd(first.uses.map(srcText))}.`, `If those are true, must step 1 be true? ${stepFollows(p, 0) ? 'Yes. So it follows.' : 'No. So it does not follow.'}`]
        : ['It uses nothing, so nothing forces it.']),
      'Do the same for every step. One step that does not follow breaks the whole proof.',
    ],
  };
}

/** A proof where every step follows, with one of its steps used as a hint (never the asked one). */
function chainHint(p: ChainProof, avoid: number): TeachCase {
  const k = p.steps.findIndex((_, i) => i !== avoid && stepFollows(p, i));
  return stepCase(p, k >= 0 ? k : 0);
}

export interface ChainOpts {
  skin: OrderSkinId;
}

/** What does step k use? One set of sources forces it; the others do not (one of them is “nothing”). */
export function citeItem(rng: Rng, o: ChainOpts & { step?: number }): ProofMade {
  const p = makeChain(rng, o.skin);
  const k = o.step ?? rng.int(0, 2);
  const st = p.steps[k];
  const right = st.uses;
  const wrongs = sourceSets(p, k).filter((set) => !follows(p, st.stmt, set) && !sameSrcs(set, right));
  // Near misses first: a set that keeps one source the step needs.
  const near = wrongs.filter((set) => set.some((s) => right.some((r) => srcKey(r) === srcKey(s))));
  const w1 = rng.pick(near.length ? near : wrongs);
  const rest = wrongs.filter((set) => !sameSrcs(set, w1));
  const w2 = rng.pick(rest);
  const who = `Step ${k + 1}`;
  const feedback: Record<string, ChoiceFeedback> = {
    w1: { headline: `${usesLabel(w1).replace(/ only$/, '')} ${w1.length === 1 ? 'does' : 'do'} not force step ${k + 1}.`, detail: whyNot(p, st.stmt, w1, 'That choice') },
    w2: { headline: `${usesLabel(w2).replace(/ only$/, '')} ${w2.length === 1 ? 'does' : 'do'} not force step ${k + 1}.`, detail: whyNot(p, st.stmt, w2, 'That choice') },
    nothing: {
      headline: `Being true is not enough. ${who} must name what makes it follow.`,
      detail: [`${who} is true in the story. But a step that uses nothing does not follow.`, `It follows from ${joinAnd(right.map(srcText))}. ${whyFollows(p, st.stmt, right)}`],
    },
  };
  return done('cite', 'cite-pick', {
    kind: 'choose',
    prompt: `${p.skin.setting(joinAnd(p.names))} Here is a proof that ${stmtText(p, p.claim)} What does step ${k + 1} use?`,
    scene: chainScene(p, { hide: k }),
    choices: shuffled(rng, [
      { id: 'uses', label: usesLabel(right) },
      { id: 'w1', label: usesLabel(w1) },
      { id: 'w2', label: usesLabel(w2) },
      { id: 'nothing', label: usesLabel([]) },
    ]),
    answer: 'uses',
    explain: `${whyFollows(p, st.stmt, right)} So step ${k + 1} uses ${joinAnd(right.map(srcText))}.`,
    feedback,
    hint: 'Here is another step, checked. Test each choice the same way: if only those were true, must the step be true?',
    hintCase: chainHint(p, k),
    teach: chainTeach(p, 'Each step names what it uses: givens, the definition, or earlier steps. Those must force the step.'),
    seconds: PROOF_SECONDS,
  }, { chain: p });
}

/** Which step does not follow from what it uses? One step is broken, or (sometimes) none. */
export function brokenStepItem(rng: Rng, o: ChainOpts & { how?: BreakHow | 'none' }): ProofMade {
  const base = makeChain(rng, o.skin);
  const how = o.how ?? rng.pick<BreakHow | 'none'>(['wrong', 'wrong', 'def', 'nothing', 'none']);
  const p = how === 'none' ? base : breakChain(rng, base, how);
  const bad = brokenSteps(p);
  const answer = bad.length ? `s${bad[0] + 1}` : 'none';
  const feedback: Record<string, ChoiceFeedback> = {};
  p.steps.forEach((s, k) => {
    const id = `s${k + 1}`;
    if (id === answer) return;
    feedback[id] = { headline: `Step ${k + 1} follows from what it uses.`, detail: [whyFollows(p, s.stmt, s.uses), ...(bad.length ? [`Look again at step ${bad[0] + 1}.`] : [])], example: stepCase(p, k) };
  });
  if (answer !== 'none') {
    const k = bad[0];
    feedback.none = { headline: `Step ${k + 1} does not follow from what it uses.`, detail: whyNot(p, p.steps[k].stmt, p.steps[k].uses, `Step ${k + 1}`), example: stepCase(p, k) };
  }
  return done('cite', 'cite-broken', {
    kind: 'choose',
    prompt: `${p.skin.setting(joinAnd(p.names))} Here is a proof that ${stmtText(p, p.claim)} Which step does not follow from what it uses?`,
    scene: chainScene(p),
    choices: [...p.steps.map((_, k) => ({ id: `s${k + 1}`, label: `Step ${k + 1}` })), { id: 'none', label: 'None. Every step follows.' }],
    answer,
    explain: answer === 'none'
      ? 'Every step follows: what each one uses forces it. So the proof works.'
      : `${whyNot(p, p.steps[bad[0]].stmt, p.steps[bad[0]].uses, `Step ${bad[0] + 1}`).join(' ')} So step ${bad[0] + 1} does not follow.`,
    feedback,
    hint: 'Here is one step, checked. Check every step the same way.',
    hintCase: chainHint(p, bad[0] ?? -1),
    teach: chainTeach(p, 'A step follows when what it uses forces it. One step that does not follow breaks the proof, even if the step is true.'),
    seconds: PROOF_SECONDS,
  }, { chain: p });
}

/**
 * The trap, and a conflict item: every step is true in the story and the claim is true, but one step uses nothing.
 * Is it a proof? No: that step does not follow.
 */
export function chainTrapItem(rng: Rng, o: ChainOpts): ProofMade {
  const p = breakChain(rng, makeChain(rng, o.skin), 'nothing');
  const k = p.broken!.k;
  const st = p.steps[k];
  const right = makeRight(p, k);
  const feedback: Record<string, ChoiceFeedback> = {
    true: {
      headline: 'Every step is true, but true is not the same as follows.',
      detail: [`Step ${k + 1} is true in the story. But it uses nothing, so nothing in the proof forces it.`, `A proof must show why each step must be true. Step ${k + 1} needs ${joinAnd(right.map(srcText))}.`],
      example: stepCase(p, k),
    },
    claim: {
      headline: 'The claim is true, but a true claim does not make a proof.',
      detail: [`A proof shows why the claim must be true. Here, step ${k + 1} uses nothing.`, 'So the chain has a gap. It is not a proof yet.'],
      example: stepCase(p, k),
    },
    false: {
      headline: 'The claim is not false. It is true in the story.',
      detail: [`${p.skin.order(joinAnd(p.line))} So ${stmtText(p, p.claim)}`, `The problem is step ${k + 1}: it uses nothing, so it does not follow.`],
    },
  };
  return done('cite', 'cite-trap', {
    kind: 'choose',
    prompt: `${p.skin.setting(joinAnd(p.names))} ${p.skin.order(joinAnd(p.line))} Here is a proof that ${stmtText(p, p.claim)} Every step is true. Is it a proof?`,
    scene: chainScene(p),
    choices: shuffled(rng, [
      { id: 'gap', label: `No. Step ${k + 1} uses nothing, so it does not follow.` },
      { id: 'true', label: 'Yes. Every step is true.' },
      { id: 'claim', label: 'Yes. The claim is true.' },
      { id: 'false', label: 'No. The claim is false.' },
    ]),
    answer: 'gap',
    explain: `${whyNot(p, st.stmt, st.uses, `Step ${k + 1}`).join(' ')} So it is not a proof, even though every step is true.`,
    feedback,
    hint: 'Here is one step that is fine. Check every step the same way: does what it uses force it?',
    hintCase: chainHint(p, k),
    teach: chainTeach(p, 'A step must follow from what it uses. A true step that uses nothing does not follow, so the proof has a gap.'),
    conflict: true,
    tags: [TRAPS.cite.tag],
    seconds: PROOF_SECONDS,
  }, { chain: p });
}

/** The sources step k used before it was broken: the ones that force it. */
function makeRight(p: ChainProof, k: number): Src[] {
  const set = sourceSets(p, k).find((s) => follows(p, p.steps[k].stmt, s) && s.every((x) => x.t !== 'def' || p.steps[k].stmt.t === 'def'));
  return set ?? [];
}

// =====================================================================================================================
// Cover every case (a proof by cases)
// =====================================================================================================================

export interface CaseOpt {
  id: string;
  /** "a cat", "Saturday", "red", "5". */
  a: string;
  /** In a list or a sentence: "the cat", "Saturday", "the red potion", "5". */
  name: string;
  facts: Record<string, boolean>;
}

export interface CaseProp {
  id: string;
  /** The claim: "Leo’s pet has fur." */
  claim: (who: string) => string;
  /** Why the claim holds in a case, or does not: "A cat has fur." / "A fish has no fur." */
  yes: (o: CaseOpt) => string;
  no: (o: CaseOpt) => string;
}

export interface CaseTopic {
  id: string;
  skin: ProofSkin;
  people: readonly string[];
  /** Given 1: "Leo’s pet is a cat, a dog or a fish." */
  one: (who: string, opts: readonly CaseOpt[]) => string;
  /** A given that rules an option out: "Leo’s pet is not a fish." */
  not: (who: string, o: CaseOpt) => string;
  /** A case: "Leo’s pet is a cat." */
  is: (who: string, o: CaseOpt) => string;
  options: readonly CaseOpt[];
  props: readonly CaseProp[];
  /** Made-up facts (a fantasy topic): the given that says which options have the property. */
  world?: (prop: CaseProp, opts: readonly CaseOpt[]) => string;
}

const pet = (id: string, a: string, fur: boolean, legs: boolean): CaseOpt => ({ id, a, name: `the ${a.replace(/^an? /, '')}`, facts: { fur, legs } });
const day = (d: string, school: boolean): CaseOpt => ({ id: d.toLowerCase(), a: d, name: d, facts: { free: !school, school } });
const potion = (c: string, glow: boolean, fizz: boolean): CaseOpt => ({ id: c, a: c, name: `the ${c} potion`, facts: { glow, fizz } });
const num = (k: number): CaseOpt => ({ id: `n${k}`, a: String(k), name: String(k), facts: { even: k % 2 === 0, odd: k % 2 === 1, over3: k > 3, under7: k < 7 } });
const bare = (o: CaseOpt) => o.a.replace(/^an? /, '');

export const CASE_TOPICS: readonly CaseTopic[] = [
  {
    id: 'pets', skin: 'everyday', people: ['Leo', 'Mia', 'Sam', 'Ivy', 'Noah', 'Rosa'],
    one: (w, os) => `${w}’s pet is ${joinOr(os.map((o) => o.a))}.`,
    not: (w, o) => `${w}’s pet is not ${o.a}.`,
    is: (w, o) => `${w}’s pet is ${o.a}.`,
    options: [pet('cat', 'a cat', true, true), pet('dog', 'a dog', true, true), pet('rabbit', 'a rabbit', true, true), pet('hamster', 'a hamster', true, true), pet('fish', 'a fish', false, false), pet('bird', 'a bird', false, true), pet('turtle', 'a turtle', false, true), pet('snake', 'a snake', false, false)],
    props: [
      { id: 'fur', claim: (w) => `${w}’s pet has fur.`, yes: (o) => `${cap(o.a)} has fur.`, no: (o) => `${cap(o.a)} has no fur.` },
      { id: 'legs', claim: (w) => `${w}’s pet has legs.`, yes: (o) => `${cap(o.a)} has legs.`, no: (o) => `${cap(o.a)} has no legs.` },
    ],
  },
  {
    id: 'days', skin: 'everyday', people: ['Kai', 'Ana', 'Ravi', 'June', 'Tom', 'Lily'],
    one: (w, os) => `${w}’s party is on ${joinOr(os.map((o) => o.a))}.`,
    not: (_w, o) => `The party is not on ${o.a}.`,
    is: (_w, o) => `The party is on ${o.a}.`,
    options: [day('Monday', true), day('Tuesday', true), day('Wednesday', true), day('Thursday', true), day('Friday', true), day('Saturday', false), day('Sunday', false)],
    props: [
      { id: 'free', claim: () => 'There is no school on the day of the party.', yes: (o) => `There is no school on ${o.a}.`, no: (o) => `There is school on ${o.a}.` },
      { id: 'school', claim: () => 'There is school on the day of the party.', yes: (o) => `There is school on ${o.a}.`, no: (o) => `There is no school on ${o.a}.` },
    ],
  },
  {
    id: 'potions', skin: 'fantasy', people: ['Zed', 'Nox', 'Juno', 'Kip', 'Rune', 'Vesta'],
    one: (w, os) => `${w}’s potion is ${joinOr(os.map((o) => o.a))}.`,
    not: (w, o) => `${w}’s potion is not ${o.a}.`,
    is: (w, o) => `${w}’s potion is ${o.a}.`,
    options: [potion('red', true, false), potion('blue', true, true), potion('green', false, true), potion('gold', true, true), potion('purple', false, false), potion('silver', false, true)],
    props: [
      { id: 'glow', claim: (w) => `${w}’s potion glows.`, yes: (o) => `${cap(o.a)} potions glow.`, no: (o) => `${cap(o.a)} potions do not glow.` },
      { id: 'fizz', claim: (w) => `${w}’s potion fizzes.`, yes: (o) => `${cap(o.a)} potions fizz.`, no: (o) => `${cap(o.a)} potions do not fizz.` },
    ],
    world: (prop, os) => {
      const yes = os.filter((o) => o.facts[prop.id]).map(bare);
      const no = os.filter((o) => !o.facts[prop.id]).map(bare);
      const verb = prop.id === 'glow' ? 'glow' : 'fizz';
      return [yes.length ? `${cap(joinAnd(yes))} potions ${verb}.` : '', no.length ? `${cap(joinAnd(no))} potions do not ${verb}.` : ''].filter(Boolean).join(' ');
    },
  },
  {
    id: 'numbers', skin: 'abstract', people: ['the card'],
    one: (_w, os) => `The number on the card is ${joinOr(os.map((o) => o.a))}.`,
    not: (_w, o) => `The number is not ${o.a}.`,
    is: (_w, o) => `The number is ${o.a}.`,
    options: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(num),
    props: [
      { id: 'even', claim: () => 'The number is even.', yes: (o) => `${o.a} is even.`, no: (o) => `${o.a} is not even.` },
      { id: 'odd', claim: () => 'The number is odd.', yes: (o) => `${o.a} is odd.`, no: (o) => `${o.a} is not odd.` },
      { id: 'over3', claim: () => 'The number is more than 3.', yes: (o) => `${o.a} is more than 3.`, no: (o) => `${o.a} is not more than 3.` },
      { id: 'under7', claim: () => 'The number is less than 7.', yes: (o) => `${o.a} is less than 7.`, no: (o) => `${o.a} is not less than 7.` },
    ],
  },
];
export const CASE_BY_SKIN: Readonly<Record<ProofSkin, readonly string[]>> = { everyday: ['pets', 'days'], fantasy: ['potions'], abstract: ['numbers'] };
export const caseTopic = (id: string) => CASE_TOPICS.find((t) => t.id === id)!;

/** A claim, a few options the givens name, the ones they rule out, and the cases a proof checks. */
export interface CaseProof {
  topic: CaseTopic;
  who: string;
  prop: CaseProp;
  /** Given 1's options, in order. */
  opts: CaseOpt[];
  /** Options a later given rules out. */
  ruled: CaseOpt[];
  /** The options the proof checks, in order. */
  covered: CaseOpt[];
}

export const caseHolds = (cp: Pick<CaseProof, 'prop'>, o: CaseOpt) => !!o.facts[cp.prop.id];
/** The cases the givens leave. */
export const casesLeft = (cp: CaseProof) => cp.opts.filter((o) => !cp.ruled.includes(o));
/** The cases the givens leave that the proof does not check. */
export const leftOut = (cp: CaseProof) => casesLeft(cp).filter((o) => !cp.covered.includes(o));
/** Does the claim follow from the givens: is it true in every case they leave? */
export const claimForced = (cp: CaseProof) => casesLeft(cp).every((o) => caseHolds(cp, o));
/** Does the proof work: it checks every case the givens leave, and the claim is true in each? */
export const proofCovers = (cp: CaseProof) => leftOut(cp).length === 0 && cp.covered.every((o) => caseHolds(cp, o));

export const caseClaim = (cp: CaseProof) => cp.prop.claim(cp.who);
export const caseWhy = (cp: CaseProof, o: CaseOpt) => (caseHolds(cp, o) ? cp.prop.yes(o) : cp.prop.no(o));
/** The givens in order: given 1, the made-up facts (fantasy), then each option ruled out. */
export function caseGivens(cp: CaseProof): string[] {
  return [cp.topic.one(cp.who, cp.opts), ...(cp.topic.world ? [cp.topic.world(cp.prop, cp.opts)] : []), ...cp.ruled.map((o) => cp.topic.not(cp.who, o))];
}
/** The given (from 1) that rules an option out. */
export const ruledBy = (cp: CaseProof, o: CaseOpt) => caseGivens(cp).length - cp.ruled.length + cp.ruled.indexOf(o) + 1;
export const optList = (os: readonly CaseOpt[]) => cap(joinAnd(os.map((o) => o.name)));

/**
 * The givens, the claim and the proof's cases as a picture: one box for each case the proof checks. `all`: every
 * option as a box, marked (crossed out with the given that rules it out, or left with the claim true or false).
 */
export function caseScene(cp: CaseProof, o: { all?: boolean; caption?: string; blank?: boolean } = {}): Extract<Scene, { kind: 'argument' }> {
  const boxes = o.all
    ? cp.opts.map((x, i) => ({
        name: `Case ${i + 1}`,
        facts: [cp.topic.is(cp.who, x), ...(cp.ruled.includes(x) ? [] : [caseWhy(cp, x)])],
        ...(o.blank ? {} : cp.ruled.includes(x) ? { out: ruledBy(cp, x) } : { claim: caseHolds(cp, x) }),
      }))
    : cp.covered.map((x, i) => ({ name: `Case ${i + 1}`, facts: [cp.topic.is(cp.who, x), caseWhy(cp, x)] }));
  return { kind: 'argument', givens: caseGivens(cp), claim: caseClaim(cp), cases: boxes, ...(o.caption ? { caption: o.caption } : {}) };
}

/** Pick options so the proof has the wanted shape. `left`: no case left out, or one left out where the claim holds or fails. */
export interface CaseWant {
  left: 'none' | 'holds' | 'fails';
  ruled: 0 | 1;
  size?: 3 | 4;
  prop?: string;
}

export function makeCaseProof(rng: Rng, topic: CaseTopic, want: CaseWant): CaseProof {
  const least = want.ruled + (want.left === 'none' ? 2 : 3);
  for (let t = 0; t < 600; t++) {
    const prop = want.prop ? topic.props.find((p) => p.id === want.prop)! : rng.pick(topic.props);
    // The wanted size first; if the topic can't make it (two free days only), the smallest that works.
    const n = t < 300 ? Math.max(want.size ?? least, least) : least;
    const pick = rng.shuffle(topic.options).slice(0, n);
    const ruled = pick.slice(0, want.ruled);
    const left = pick.slice(want.ruled);
    const cp0 = { prop } as Pick<CaseProof, 'prop'>;
    // A case the givens rule out breaks the claim, so ruling it out matters.
    if (ruled.some((o) => caseHolds(cp0, o))) continue;
    const out = want.left === 'none' ? null : left[left.length - 1];
    const covered = out ? left.slice(0, -1) : left;
    if (!covered.every((o) => caseHolds(cp0, o))) continue;
    if (out && caseHolds(cp0, out) !== (want.left === 'holds')) continue;
    // Given 1 lists the options in the topic's own order, so the order never hints at the answer.
    const opts = topic.options.filter((o) => pick.includes(o));
    const who = rng.pick(topic.people);
    return { topic, who, prop, opts, ruled, covered: opts.filter((o) => covered.includes(o)) };
  }
  throw new Error(`makeCaseProof: no ${topic.id} proof for ${JSON.stringify(want)}`);
}

const pickCaseTopic = (rng: Rng, skin: ProofSkin, avoid?: Set<string>) => {
  const ids = CASE_BY_SKIN[skin].filter((id) => !avoid?.has(id));
  const id = rng.pick(ids.length ? ids : CASE_BY_SKIN[skin]);
  avoid?.add(id);
  return caseTopic(id);
};

/** One option as a teach case: do the givens leave it, and is the claim true there? */
export function optCase(cp: CaseProof, o: CaseOpt): TeachCase {
  const isRuled = cp.ruled.includes(o);
  const truths: Truth[] = [{ who: 'The givens leave it', value: !isRuled }];
  if (!isRuled) truths.push({ who: 'The claim is true here', value: caseHolds(cp, o) }, { who: 'The proof checks it', value: cp.covered.includes(o) });
  const note = isRuled
    ? `Given ${ruledBy(cp, o)} rules it out. The proof does not need this case.`
    : !cp.covered.includes(o)
      ? `The proof leaves this case out. ${caseWhy(cp, o)}`
      : caseWhy(cp, o);
  return { label: cp.topic.is(cp.who, o), truths, words: YES_NO_WORDS, note };
}

function casesTeach(cp: CaseProof, rule: string): Teach {
  const left = casesLeft(cp);
  const first = cp.covered[0] ?? left[0];
  return {
    rule,
    terms: [
      { word: 'A case', meaning: 'one way things could be.' },
      { word: 'Rule out', meaning: 'a given says that case can’t happen.' },
      { word: 'A proof by cases', meaning: 'a proof that checks the claim in every case the givens leave.' },
    ],
    meaning: `Given 1 names ${cp.opts.length} cases.${cp.ruled.length ? ` Given ${ruledBy(cp, cp.ruled[0])} rules out ${cp.ruled[0].name}.` : ''} So ${left.length} cases are left: ${joinAnd(left.map((o) => o.name))}.`,
    casesTitle: 'Every case the givens name',
    cases: cp.opts.map((o) => optCase(cp, o)),
    remember: ['List every case the givens leave. Check the claim in each one.', 'Ask: did the proof check every case that can happen?'],
    simpler: [
      `Given 1 says ${cp.topic.one(cp.who, cp.opts).replace(/^The /, 'the ')}`,
      cp.ruled.length ? `Cross out ${cp.ruled.map((o) => o.name).join(' and ')}: a given rules it out.` : 'No given rules a case out.',
      `So the cases left are ${joinAnd(left.map((o) => o.name))}.`,
      `A proof must check each one. ${caseWhy(cp, first)}`,
    ],
  };
}

const caseHint = (cp: CaseProof, avoid?: CaseOpt) => optCase(cp, cp.covered.find((o) => o !== avoid) ?? cp.covered[0]);

/** Which cases must the proof check? The cases the givens leave, no more and no fewer. */
export function mustCoverItem(rng: Rng, o: { skin: ProofSkin; avoid?: Set<string> }): ProofMade {
  const topic = pickCaseTopic(rng, o.skin, o.avoid);
  const cp = makeCaseProof(rng, topic, { left: 'none', ruled: 1, size: rng.pick([3, 4] as const) });
  const left = casesLeft(cp);
  const r = cp.ruled[0];
  const one = rng.pick(left);
  const swap = [...left.filter((x) => x !== one), r];
  const keep = (os: CaseOpt[]) => cp.opts.filter((x) => os.includes(x));
  const choices: Choice[] = [
    { id: 'left', label: optList(left) },
    { id: 'all', label: optList(cp.opts) },
    { id: 'one', label: `Only ${one.name}` },
    { id: 'swap', label: optList(keep(swap)) },
  ];
  const rk = ruledBy(cp, r);
  const missing = left.filter((x) => x !== one);
  const feedback: Record<string, ChoiceFeedback> = {
    all: { headline: `Given ${rk} rules out ${r.name}, so the proof does not need that case.`, detail: [`Given ${rk} says “${caseGivens(cp)[rk - 1]}”`, `A case the givens rule out can’t happen. The proof must check only ${joinAnd(left.map((x) => x.name))}.`], example: optCase(cp, r) },
    one: { headline: `One case is not enough. The givens leave ${left.length} cases.`, detail: [`The proof must also check ${joinAnd(missing.map((x) => x.name))}.`, 'A case left out could break the claim.'], example: optCase(cp, missing[0]) },
    swap: { headline: `This leaves out ${one.name}, and it checks ${r.name}, which is ruled out.`, detail: [`Given ${rk} rules out ${r.name}. Nothing rules out ${one.name}.`, `So the proof must check ${one.name} and need not check ${r.name}.`], example: optCase(cp, one) },
  };
  return done('cases', 'cases-must', {
    kind: 'choose',
    prompt: `Here are the givens and a claim. To prove the claim by cases, which cases must the proof check?`,
    scene: { kind: 'argument', givens: caseGivens(cp), claim: caseClaim(cp) },
    choices: shuffled(rng, choices),
    answer: 'left',
    explain: `Given 1 names ${joinAnd(cp.opts.map((x) => x.name))}. Given ${rk} rules out ${r.name}. So the proof must check ${joinAnd(left.map((x) => x.name))}.`,
    feedback,
    hint: 'Here is one case, checked. Go through every case given 1 names. Does a given rule it out?',
    hintCase: optCase(cp, r),
    teach: casesTeach(cp, 'A proof by cases must check every case the givens leave. A case the givens rule out needs no check.'),
  }, { cases: cp });
}

/** Which case does this proof leave out? One case the givens leave is missing, or none is. */
export function leftOutItem(rng: Rng, o: { skin: ProofSkin; avoid?: Set<string>; left?: CaseWant['left'] }): ProofMade {
  const topic = pickCaseTopic(rng, o.skin, o.avoid);
  const left = o.left ?? rng.pick<CaseWant['left']>(['none', 'holds', 'fails']);
  const cp = makeCaseProof(rng, topic, { left, ruled: rng.pick([0, 1] as const) });
  const out = leftOut(cp)[0];
  const answer = out ? out.id : 'none';
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const x of cp.opts) {
    if (x.id === answer) continue;
    if (cp.ruled.includes(x)) feedback[x.id] = { headline: `Given ${ruledBy(cp, x)} rules out ${x.name}, so the proof does not need it.`, detail: [`A case the givens rule out can’t happen.`, out ? `The case left out is ${out.name}: no given rules it out.` : 'Every case left is checked.'], example: optCase(cp, x) };
    else feedback[x.id] = { headline: `Case ${cp.covered.indexOf(x) + 1} checks ${x.name}.`, detail: [`The proof checks it: ${caseWhy(cp, x)}`, out ? `Look for a case given 1 names that no box checks and no given rules out.` : 'Every case left is checked.'], example: optCase(cp, x) };
  }
  if (out) feedback.none = { headline: `The proof leaves out ${out.name}.`, detail: [`Given 1 names ${out.name}, and no given rules it out. No case checks it.`, caseHolds(cp, out) ? `The claim happens to be true there, but the proof never shows it.` : `And there, the claim is false: ${caseWhy(cp, out)}`], example: optCase(cp, out) };
  return done('cases', 'cases-left', {
    kind: 'choose',
    prompt: `Here is a proof by cases. Each box is one case it checks. Which case does the proof leave out?`,
    scene: caseScene(cp),
    choices: [...cp.opts.map((x) => ({ id: x.id, label: cap(x.name) })), { id: 'none', label: 'None. It checks every case left.' }],
    answer,
    explain: out
      ? `Given 1 names ${out.name}, and no given rules it out. But no case checks it. So the proof leaves out ${out.name}.`
      : `The givens leave ${joinAnd(casesLeft(cp).map((x) => x.name))}. The proof checks each one. So it leaves no case out.`,
    feedback,
    hint: 'Here is one case, checked. Go through every case given 1 names: is it ruled out, or checked?',
    hintCase: caseHint(cp, out),
    teach: casesTeach(cp, 'A proof by cases must check every case the givens leave. A case left out could break the claim.'),
    ...(out ? { tags: [TRAPS.cases.tag] } : {}),
  }, { cases: cp });
}

/** The trap, and a conflict item: the claim is true in every case the proof checks, but it leaves a case out. */
export function casesTrapItem(rng: Rng, o: { skin: ProofSkin; avoid?: Set<string>; left?: 'holds' | 'fails' }): ProofMade {
  const topic = pickCaseTopic(rng, o.skin, o.avoid);
  const left = o.left ?? rng.pick(['holds', 'fails'] as const);
  const cp = makeCaseProof(rng, topic, { left, ruled: rng.pick([0, 1] as const) });
  const out = leftOut(cp)[0];
  const r = cp.ruled[0];
  const feedback: Record<string, ChoiceFeedback> = {
    shown: {
      headline: 'The claim is true in every case the proof checks, but it does not check every case.',
      detail: [`Given 1 names ${out.name}, and no given rules it out. No case checks it.`, caseHolds(cp, out) ? 'The claim happens to be true there too. But the proof never shows it, so it is not a proof.' : `And there, the claim is false: ${caseWhy(cp, out)}`],
      example: optCase(cp, out),
    },
    ...(r
      ? {
          ruled: {
            headline: `Given ${ruledBy(cp, r)} rules out ${r.name}, so the proof does not need it.`,
            detail: [`The case the proof leaves out is ${out.name}.`, 'No given rules that case out.'],
            example: optCase(cp, r),
          },
        }
      : {
          two: {
            headline: 'No set number of cases is enough. The proof must check every case left.',
            detail: [`The givens leave ${casesLeft(cp).length} cases. The proof checks ${cp.covered.length}.`, `It leaves out ${out.name}.`],
            example: optCase(cp, out),
          },
        }),
    claim: left === 'holds'
      ? { headline: 'The claim is true, but the proof does not show it.', detail: [`The proof never checks ${out.name}.`, 'A proof must check every case left, even when the claim is true.'], example: optCase(cp, out) }
      : { headline: 'Nothing shows the claim is false. It might be true or false.', detail: [`It is true in the cases the proof checks. ${caseWhy(cp, out)}`, `So the claim is false only if it is ${out.name}. The proof should have checked that case.`], example: optCase(cp, out) },
  };
  return done('cases', 'cases-trap', {
    kind: 'choose',
    prompt: `Here is a proof by cases. The claim is true in every case it checks. Is it a proof?`,
    scene: caseScene(cp),
    choices: shuffled(rng, [
      { id: 'left', label: `No. It leaves out ${out.name}.` },
      { id: 'shown', label: 'Yes. The claim is true in every case it checks.' },
      r ? { id: 'ruled', label: `No. It must also check ${r.name}.` } : { id: 'two', label: `Yes. ${cap(['', 'one case is', 'two cases are', 'three cases are'][cp.covered.length])} enough.` },
      left === 'holds' ? { id: 'claim', label: 'Yes. The claim is true anyway.' } : { id: 'claim', label: 'No. The claim is false.' },
    ]),
    answer: 'left',
    explain: `Given 1 names ${out.name}, and no given rules it out. The proof never checks it. So it is not a proof yet.`,
    feedback,
    hint: 'Here is one case, checked. Now list every case the givens leave. Is each one checked?',
    hintCase: caseHint(cp, out),
    teach: casesTeach(cp, 'A proof by cases must check every case the givens leave. True in the cases it checks is not enough.'),
    conflict: true,
    tags: [TRAPS.cases.tag],
  }, { cases: cp });
}

// =====================================================================================================================
// Suppose and crash (a proof by contradiction): Knights & Knaves
// =====================================================================================================================

export type Kind = 'knight' | 'knave';
export const KNIGHT_BY_SKIN: Readonly<Record<ProofSkin, readonly SkinId[]>> = { everyday: ['island'], fantasy: ['elves', 'wizards'], abstract: ['letters'] };

/** A two-islander puzzle and one guess about an islander, followed until it crashes (or holds up). */
export interface CrashCase {
  skin: SkinId;
  ids: string[];
  nm: Namer;
  setting: string;
  claims: Claims;
  /** Every case that fits the rule (one for a crash puzzle, two for a guess that holds up). */
  sols: KindMap[];
  /** The guess: who, and what kind. */
  who: string;
  kind: Kind;
  /** Inside the guess, as explainSolve writes it, up to and with the line where someone's words break the rule. */
  lines: string[];
  /** Every islander's kind inside the guess when it crashed (or the case that fits, when it holds up). */
  world: KindMap;
  /** Whose words break the rule inside the guess. Empty when the guess holds up. */
  breakers: string[];
}

/** Does a guess crash: no case with it fits the rule? */
export const guessCrashes = (c: Pick<CrashCase, 'ids' | 'claims'>, who: string, kind: Kind) => solutions(c.ids, c.claims, { [who]: kind }).length === 0;

const wordsOf = (c: Pick<CrashCase, 'ids' | 'claims' | 'nm'>, id: string) => (c.claims[id] ? knightSays(c, id) : '');
function knightSays(c: Pick<CrashCase, 'ids' | 'claims' | 'nm'>, id: string): string {
  // The speaker's own words, as the speech bubble shows them.
  return speakersScene(c.ids, c.claims, c.nm).speakers.find((sp) => sp.id === id)!.says;
}

/** A puzzle with one answer whose explanation starts with one guess that crashes (Stop 5's explainSolve). */
export function crashCase(rng: Rng, skin: SkinId): CrashCase {
  for (let t = 0; t < 300; t++) {
    const cast = makeCast(rng, skin, 2);
    const pz = makePuzzle(rng, cast.ids, cast.nm, { n: 2, pool: 'plain' });
    const sv = pz.solve;
    if (sv.supposes !== 1 || !sv.lines[0].startsWith('Suppose ')) continue;
    const end = sv.lines.findIndex((l) => l.startsWith('That guess crashes'));
    const g = sv.guesses[0];
    if (end < 3 || cast.ids.some((id) => !g.world[id])) continue;
    const world = g.world as KindMap;
    const c: CrashCase = { skin, ids: cast.ids, nm: cast.nm, setting: cast.setting, claims: pz.claims, sols: solutions(cast.ids, pz.claims), who: g.who, kind: g.kind, lines: sv.lines.slice(1, end), world, breakers: [] };
    c.breakers = breakers(c.ids, c.claims, world);
    if (c.breakers.length !== 1 || !guessCrashes(c, g.who, g.kind)) continue;
    return c;
  }
  throw new Error('crashCase: no puzzle found');
}

/** A puzzle where a guess holds up and its opposite does too: two cases fit, and they differ on the guessed islander. */
export function holdsCase(rng: Rng, skin: SkinId): CrashCase {
  for (let t = 0; t < 2000; t++) {
    const cast = makeCast(rng, skin, 2);
    const ids = cast.ids;
    const answer: KindMap = Object.fromEntries(ids.map((id) => [id, rng.pick<Kind>(['knight', 'knave'])]));
    const claims: Claims = {};
    for (const s of ids) claims[s] = rng.pick(candidates(s, ids, 'plain').filter((x) => speakerFits(s, x.c, answer))).c;
    const sols = solutions(ids, claims);
    if (sols.length !== 2) continue;
    const who = ids.find((id) => sols[0][id] !== sols[1][id]);
    if (!who) continue;
    const c0 = { ids, claims, nm: cast.nm };
    const texts = ids.map((id) => wordsOf(c0, id));
    if (new Set(texts).size !== texts.length) continue;
    const k = rng.int(0, 1);
    return { skin, ids, nm: cast.nm, setting: cast.setting, claims, sols: [sols[k], sols[1 - k]], who, kind: sols[k][who], lines: [], world: sols[k], breakers: [] };
  }
  throw new Error('holdsCase: no puzzle found');
}

export const knightScene = (c: CrashCase) => speakersScene(c.ids, c.claims, c.nm, { rule: PUZZLE_RULE, test: `${c.nm(c.who)} is ${aKind(c.kind)}.` });
export const kCase = (c: CrashCase, kinds: KindMap) => kindsCase(c.ids, c.claims, kinds, c.nm);
/** A case with the guess in it that is not the crash's world: someone breaks the rule there too (a hint, never the answer). */
function guessHint(c: CrashCase): TeachCase {
  const other = allKinds(c.ids, { [c.who]: c.kind }).find((k) => JSON.stringify(k) !== JSON.stringify(c.world)) ?? c.world;
  return kCase(c, other);
}

const CRASH_TERMS = [
  { word: 'A guess', meaning: 'what you suppose, just to test it.' },
  { word: 'A crash', meaning: 'the guess leads to something that can’t happen, like a knight with false words.' },
  { word: 'A contradiction', meaning: 'two things that can’t both be true. It is what makes a guess crash.' },
];

function crashTeach(c: CrashCase, rule: string, cases: TeachCase[]): Teach {
  const X = c.nm(c.who);
  return {
    rule,
    terms: CRASH_TERMS,
    meaning: `${PUZZLE_RULE} The guess is “${X} is ${aKind(c.kind)}.”`,
    casesTitle: 'The cases that matter',
    cases,
    remember: ['A guess that crashes is false, so its opposite is true.', 'A guess that holds up only shows it could be true.'],
    simpler: [
      `Suppose ${X} is ${aKind(c.kind)}.`,
      'Follow what must be true. Check each islander’s words against the rule.',
      `If someone breaks the rule, the guess crashes. Then ${X} is ${aKind(flip(c.kind))}.`,
      'If no one breaks it, nothing is proved yet.',
    ],
  };
}

/** A guess crashes. What does the crash prove? Its opposite. */
export function crashProvesItem(rng: Rng, o: { skin: ProofSkin }): ProofMade {
  const c = crashCase(rng, rng.pick(KNIGHT_BY_SKIN[o.skin]));
  const X = c.nm(c.who);
  const yId = c.ids.find((id) => id !== c.who)!;
  const Y = c.nm(yId);
  const ans = c.sols[0];
  const bk = c.nm(c.breakers[0]);
  const feedback: Record<string, ChoiceFeedback> = {
    guess: {
      headline: `The crash shows ${X} can’t be ${aKind(c.kind)}.`,
      detail: [`Inside the guess, ${bk}’s words break the rule. So the guess can’t be true.`, `If ${X} can’t be ${aKind(c.kind)}, ${X} must be ${aKind(flip(c.kind))}.`],
      example: kCase(c, c.world),
    },
    nothing: {
      headline: 'A guess that crashes proves something: its opposite.',
      detail: [`The guess was “${X} is ${aKind(c.kind)}.” It led to ${bk} breaking the rule, so it can’t be true.`, `Every islander is a knight or a knave. So ${X} must be ${aKind(flip(c.kind))}.`],
      example: kCase(c, c.world),
    },
    other: {
      headline: `The crash is about ${X}. And ${Y} is not ${aKind(flip(ans[yId]))}.`,
      detail: [`The crash proves ${X} is ${aKind(ans[c.who])}.`, `The case that fits is: ${kindsText(c.ids, ans, c.nm)}.`],
      example: kCase(c, ans),
    },
  };
  return done('crash', 'crash-proves', {
    kind: 'choose',
    prompt: `${c.setting} Suppose ${X} is ${aKind(c.kind)}. ${c.lines.join(' ')} That guess crashes. What does the crash prove?`,
    scene: knightScene(c),
    choices: shuffled(rng, [
      { id: 'opp', label: `${X} is ${aKind(flip(c.kind))}.` },
      { id: 'guess', label: `${X} is ${aKind(c.kind)}.` },
      { id: 'nothing', label: 'Nothing yet. It was only a guess.' },
      { id: 'other', label: `${Y} is ${aKind(flip(ans[yId]))}.` },
    ]),
    answer: 'opp',
    explain: `Inside the guess, ${bk}’s words break the rule. So the guess “${X} is ${aKind(c.kind)}” can’t be true. ${X} must be ${aKind(flip(c.kind))}.`,
    feedback,
    hint: 'Here is one more case with the same guess, checked. Does the guess ever work?',
    hintCase: guessHint(c),
    teach: crashTeach(c, 'Suppose the opposite of what you want to show. If that guess crashes, it can’t be true. So its opposite must be true.', [kCase(c, c.world), kCase(c, ans)]),
    seconds: PROOF_SECONDS,
  }, { crash: c });
}

/** Inside a guess: whose words break the rule? */
export function breakerItem(rng: Rng, o: { skin: ProofSkin }): ProofMade {
  const c = crashCase(rng, rng.pick(KNIGHT_BY_SKIN[o.skin]));
  const X = c.nm(c.who);
  const shown = c.lines.slice(0, -1);
  const bId = c.breakers[0];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const id of c.ids) {
    if (id === bId) continue;
    const v = c.claims[id] ? speakerFits(id, c.claims[id], c.world) : true;
    feedback[id] = {
      headline: `${c.nm(id)}’s words fit the rule inside the guess.`,
      detail: [`Inside the guess, ${kindsText(c.ids, c.world, c.nm)}.`, v ? `${c.nm(id)} is ${aKind(c.world[id])}, and the words fit that.` : '', `${c.nm(bId)} is the one who breaks the rule.`].filter(Boolean),
      example: kCase(c, c.world),
    };
  }
  feedback.none = {
    headline: `${c.nm(bId)}’s words break the rule, so the guess crashes.`,
    detail: [`Inside the guess, ${kindsText(c.ids, c.world, c.nm)}.`, `${c.nm(bId)} is ${aKind(c.world[bId])}, but ${c.nm(bId)}’s words are ${c.world[bId] === 'knight' ? 'false' : 'true'}.`],
    example: kCase(c, c.world),
  };
  return done('crash', 'crash-breaker', {
    kind: 'choose',
    prompt: `${c.setting} Suppose ${X} is ${aKind(c.kind)}. ${shown.join(' ')} Inside the guess, whose words break the rule?`,
    scene: knightScene(c),
    choices: [...shuffled(rng, c.ids.map((id) => ({ id, label: `${c.nm(id)}’s words` }))), { id: 'none', label: 'No one’s. The guess holds up.' }],
    answer: bId,
    explain: `Inside the guess, ${kindsText(c.ids, c.world, c.nm)}. ${c.nm(bId)} is ${aKind(c.world[bId])}, but ${c.nm(bId)}’s words are ${c.world[bId] === 'knight' ? 'false' : 'true'}. So the guess crashes.`,
    feedback,
    hint: 'Here is another case with the same guess, checked. Now check each islander inside this guess.',
    hintCase: guessHint(c),
    teach: crashTeach(c, 'Inside a guess, check each islander against the rule. Someone who breaks it makes the guess crash.', [kCase(c, c.world), kCase(c, c.sols[0])]),
    seconds: PROOF_SECONDS,
  }, { crash: c });
}

/** The trap: a guess holds up. That proves nothing: the opposite guess holds up too. */
export function holdsUpItem(rng: Rng, o: { skin: ProofSkin }): ProofMade {
  const c = holdsCase(rng, rng.pick(KNIGHT_BY_SKIN[o.skin]));
  const X = c.nm(c.who);
  const [w1, w2] = c.sols;
  const feedback: Record<string, ChoiceFeedback> = {
    must: {
      headline: `${X} could also be ${aKind(flip(c.kind))}. A guess that holds up proves nothing.`,
      detail: [`Here is a case where ${X} is ${aKind(flip(c.kind))}: ${kindsText(c.ids, w2, c.nm)}.`, 'Everyone fits the rule there too. So nothing forces the guess.'],
      example: kCase(c, w2),
    },
    opp: {
      headline: `Nothing shows ${X} is ${aKind(flip(c.kind))}. The guess did not crash.`,
      detail: [`In the guess, ${kindsText(c.ids, w1, c.nm)}. Everyone fits the rule.`, 'Only a crash proves the opposite of a guess.'],
      example: kCase(c, w1),
    },
    none: {
      headline: 'The puzzle has answers. This guess is one of them.',
      detail: [`In the guess, ${kindsText(c.ids, w1, c.nm)}. Everyone fits the rule.`, `Another case fits too: ${kindsText(c.ids, w2, c.nm)}.`],
      example: kCase(c, w1),
    },
  };
  return done('crash', 'crash-trap', {
    kind: 'choose',
    prompt: `${c.setting} Suppose ${X} is ${aKind(c.kind)}. Follow the guess: ${kindsText(c.ids, w1, c.nm)}. Every islander fits the rule, so nothing crashes. What does that show?`,
    scene: knightScene(c),
    choices: shuffled(rng, [
      { id: 'could', label: `Only that ${X} could be ${aKind(c.kind)}. It is not a proof.` },
      { id: 'must', label: `${X} must be ${aKind(c.kind)}.` },
      { id: 'opp', label: `${X} must be ${aKind(flip(c.kind))}.` },
      { id: 'none', label: 'The puzzle has no answer.' },
    ]),
    answer: 'could',
    explain: `The guess holds up, so ${X} could be ${aKind(c.kind)}. But another case fits too: ${kindsText(c.ids, w2, c.nm)}. A guess that holds up proves nothing. Only a crash does.`,
    feedback,
    hint: 'Here is one more case with the same guess, checked. Check every case: which ones fit the rule?',
    hintCase: guessHint(c),
    teach: crashTeach(c, 'Only a crash proves something. A guess that holds up shows it could be true, not that it must be.', [kCase(c, w1), kCase(c, w2)]),
    conflict: true,
    tags: [TRAPS.crash.tag],
    seconds: PROOF_SECONDS,
  }, { crash: c });
}

// =====================================================================================================================
// One is enough: a counterexample breaks an every claim; examples never prove one
// =====================================================================================================================

export type Dim = 'color' | 'shape' | 'size';
export interface Feat {
  dim: Dim;
  val: string;
}
/** “Every red sticker in this box is a circle.”: the group (a color or a size) and what the claim says of it. */
export interface EveryClaim {
  group: Feat;
  prop: Feat;
}
export interface CardSkin {
  skin: ProofSkin;
  noun: string;
  plural: string;
  /** Where the cards are: "in this box". */
  place: string;
  who: string;
}
export const CARD_SKINS: Readonly<Record<ProofSkin, CardSkin>> = {
  everyday: { skin: 'everyday', noun: 'sticker', plural: 'stickers', place: 'in this box', who: 'Mia' },
  fantasy: { skin: 'fantasy', noun: 'tile', plural: 'tiles', place: 'in the wizard’s bag', who: 'Zed' },
  abstract: { skin: 'abstract', noun: 'card', plural: 'cards', place: 'in the deck', who: 'Max' },
};

const COLORS: readonly Color[] = ['red', 'blue', 'yellow'];
const SHAPES: readonly Shape[] = ['circle', 'square', 'triangle'];
const SIZES: readonly Size[] = ['big', 'small'];
const VALUES: Record<Dim, readonly string[]> = { color: COLORS, shape: SHAPES, size: SIZES };

export const inGroup = (c: EveryClaim, t: Thing) => t[c.group.dim] === c.group.val;
export const fitsProp = (c: EveryClaim, t: Thing) => t[c.prop.dim] === c.prop.val;
/** A card breaks the claim (in the group, and the claim fails for it), fits it, or says nothing (not in the group). */
export const cardRole = (c: EveryClaim, t: Thing): CaseRole => (!inGroup(c, t) ? 'none' : fitsProp(c, t) ? 'fit' : 'break');

/** "a circle" / "blue" / "big": what the claim says each card in the group is. */
export const propWord = (f: Feat) => (f.dim === 'shape' ? `a ${f.val}` : f.val);
export const propNot = (f: Feat) => `not ${propWord(f)}`;
export const claimWords = (c: EveryClaim, sk: CardSkin) => `Every ${c.group.val} ${sk.noun} ${sk.place} is ${propWord(c.prop)}.`;
export const cardName = (t: Thing) => `the ${t.size} ${t.color} ${t.shape}`;

/** A random claim: the group is a color or a size; the claim is about another dimension. */
function makeClaim(rng: Rng): EveryClaim {
  const gDim = rng.pick<Dim>(['color', 'size']);
  const pDim = rng.pick<Dim>((['color', 'shape', 'size'] as Dim[]).filter((d) => d !== gDim));
  return { group: { dim: gDim, val: rng.pick(VALUES[gDim]) }, prop: { dim: pDim, val: rng.pick(VALUES[pDim]) } };
}

/** A card that plays this role for the claim, and is not one of `avoid`. */
function cardFor(rng: Rng, c: EveryClaim, role: CaseRole, avoid: readonly Thing[]): Thing | null {
  const all: Thing[] = [];
  for (const color of COLORS) for (const shape of SHAPES) for (const size of SIZES) all.push({ id: '', color, shape, size });
  const ok = all.filter((t) => cardRole(c, t) === role && !avoid.some((a) => a.color === t.color && a.shape === t.shape && a.size === t.size));
  return ok.length ? { ...rng.pick(ok) } : null;
}

export interface CounterCase {
  skin: CardSkin;
  claim: EveryClaim;
  cards: Thing[];
}

/** Cards with these roles, in a random order, ids t1, t2, … in that order. */
function dealCards(rng: Rng, c: EveryClaim, roles: CaseRole[]): Thing[] | null {
  const out: Thing[] = [];
  for (const r of roles) {
    const t = cardFor(rng, c, r, out);
    if (!t) return null;
    out.push(t);
  }
  return rng.shuffle(out).map((t, i) => ({ ...t, id: `t${i + 1}` }));
}

function counterCase(rng: Rng, skin: ProofSkin, roles: (c: EveryClaim) => CaseRole[]): CounterCase {
  for (let t = 0; t < 200; t++) {
    const claim = makeClaim(rng);
    const cards = dealCards(rng, claim, roles(claim));
    if (cards) return { skin: CARD_SKINS[skin], claim, cards };
  }
  throw new Error('counterCase: no cards found');
}

const groupLabel = (c: EveryClaim) => cap(c.group.val);
const propLabel = (c: EveryClaim) => cap(propWord(c.prop));

/** One card as a teach case: is it in the group, and does the claim hold for it? */
export function cardCase(cc: CounterCase, t: Thing): TeachCase {
  const r = cardRole(cc.claim, t);
  const { group, prop } = cc.claim;
  return {
    label: `${cap(cardName(t))}.`,
    things: [{ ...t, id: `x-${t.id}` }],
    truths: [{ who: groupLabel(cc.claim), value: inGroup(cc.claim, t) }, { who: propLabel(cc.claim), value: fitsProp(cc.claim, t) }],
    words: YES_NO_WORDS,
    note: r === 'break'
      ? `It is ${group.val}, but it is ${propNot(prop)}. It breaks the claim.`
      : r === 'fit'
        ? `It is ${group.val} and ${propWord(prop)}. It fits, but that does not prove the claim.`
        : `It is not ${group.val}, so the claim says nothing about it.`,
  };
}

function counterTeach(cc: CounterCase, rule: string, shown: readonly Thing[]): Teach {
  const sk = cc.skin;
  const { group, prop } = cc.claim;
  return {
    rule,
    terms: [
      { word: 'Every', meaning: 'all of them, with no exceptions.' },
      { word: 'A counterexample', meaning: 'one case that breaks an every claim.' },
      { word: 'Fits', meaning: `the ${sk.noun} is in the group, and the claim holds for it.` },
      { word: 'Says nothing', meaning: `the ${sk.noun} is not in the group, so the claim is not about it.` },
    ],
    meaning: `The claim is about every ${group.val} ${sk.noun}, even ones not seen yet. Each one must be ${propWord(prop)}.`,
    casesTitle: `Checking the ${sk.plural}`,
    cases: shown.map((t) => cardCase(cc, t)),
    remember: ['One case that breaks an every claim makes it false.', 'Cases that fit are only examples. They never prove an every claim.'],
    simpler: [
      `Claim: every ${group.val} ${sk.noun} is ${propWord(prop)}.`,
      `A ${group.val} ${sk.noun} that is ${propNot(prop)} breaks it.`,
      `A ${group.val} ${sk.noun} that is ${propWord(prop)} only fits.`,
      `A ${sk.noun} that is not ${group.val} says nothing.`,
    ],
  };
}

/** The first card that would break the claim, not one shown: the case no number of examples can rule out. */
function unseenBreaker(cc: CounterCase): TeachCase {
  const all: Thing[] = [];
  for (const color of COLORS) for (const shape of SHAPES) for (const size of SIZES) all.push({ id: 'x-unseen', color, shape, size });
  const t = all.find((x) => cardRole(cc.claim, x) === 'break')!;
  const { group, prop } = cc.claim;
  return {
    label: `A ${cc.skin.noun} not seen yet: ${cardName(t)}.`,
    things: [t],
    truths: [{ who: groupLabel(cc.claim), value: true }, { who: propLabel(cc.claim), value: false }],
    words: YES_NO_WORDS,
    note: `If it is ${cc.skin.place}, it breaks the claim. It is ${group.val}, but it is ${propNot(prop)}.`,
  };
}

export interface SeqCase {
  family: SeqFamily;
  /** The sequences in the order shown, with their role. */
  rows: { xs: number[]; role: CaseRole }[];
}

/** Which one breaks the claim? Cards (any skin), or Proof Lantern's sequences (abstract, now and then). */
export function whichBreaksItem(rng: Rng, o: { skin: ProofSkin; seq?: boolean }): ProofMade {
  if (o.seq ?? (o.skin === 'abstract' && rng.chance(0.4))) return whichSeqItem(rng);
  const cc = counterCase(rng, o.skin, () => ['break', 'fit', 'none', rng.pick<CaseRole>(['fit', 'none'])]);
  const s = cc.skin;
  const { group, prop } = cc.claim;
  const ids: Record<CaseRole, number> = { break: 0, fit: 0, none: 0 };
  const choices: Choice[] = cc.cards.map((t) => {
    const r = cardRole(cc.claim, t);
    ids[r] += 1;
    return { id: ids[r] === 1 ? r : `${r}${ids[r]}`, label: cap(cardName(t)) };
  });
  const brk = cc.cards.find((t) => cardRole(cc.claim, t) === 'break')!;
  const feedback: Record<string, ChoiceFeedback> = {};
  cc.cards.forEach((t, i) => {
    const id = choices[i].id;
    if (id === 'break') return;
    feedback[id] = cardRole(cc.claim, t) === 'fit'
      ? { headline: `${cap(cardName(t))} fits the claim, so it can’t break it.`, detail: [`It is ${group.val} and ${propWord(prop)}.`, 'A case that fits only supports a claim. It never proves it.', `To break it, a ${s.noun} must be ${group.val} and ${propNot(prop)}.`], example: cardCase(cc, t) }
      : { headline: `The claim says nothing about ${cardName(t)}.`, detail: [`It is not ${group.val}, so the claim is not about it.`, `To break it, a ${s.noun} must be ${group.val} and ${propNot(prop)}.`], example: cardCase(cc, t) };
  });
  const hintT = cc.cards.find((t) => cardRole(cc.claim, t) !== 'break')!;
  return done('counter', 'counter-which', {
    kind: 'choose',
    prompt: `${s.who} says: “${claimWords(cc.claim, s)}” Which ${s.noun} breaks the claim?`,
    scene: { kind: 'things', things: cc.cards },
    choices,
    answer: 'break',
    explain: `${cap(cardName(brk))} is ${group.val}, but it is ${propNot(prop)}. So it breaks the claim. One ${s.noun} like that makes the claim false.`,
    feedback,
    hint: `Here is one ${s.noun}, checked. Check each one: is it ${group.val}? If so, is it ${propWord(prop)}?`,
    hintCase: cardCase(cc, hintT),
    teach: counterTeach(cc, 'A case breaks an every claim when the claim is about it and fails for it. One is enough.', cc.cards),
  }, { counter: cc });
}

/** Proof Lantern's sequences: which one breaks the claim? (one breaks it, one fits, one says nothing) */
function whichSeqItem(rng: Rng): ProofMade {
  const f = FAMILIES[rng.pick<FamilyId>(FAMILY_IDS)];
  const brk = caseFor(rng, f, 'break');
  const fit = caseFor(rng, f, 'fit', [brk]);
  const none = caseFor(rng, f, 'none', [brk, fit]);
  const hint = caseFor(rng, f, 'fit', [brk, fit, none]);
  const rows = rng.shuffle([{ xs: brk, role: 'break' as CaseRole }, { xs: fit, role: 'fit' as CaseRole }, { xs: none, role: 'none' as CaseRole }]);
  const seqCase = (xs: number[]): TeachCase => {
    const r = seqRole(f, xs);
    return {
      label: `${seqText(xs)}.`,
      truths: [{ who: f.groupLabel, value: f.inGroup(xs) }, { who: f.holdsLabel, value: f.holds(xs) }],
      words: YES_NO_WORDS,
      note: r === 'break' ? 'It breaks the claim.' : r === 'fit' ? 'It fits. That supports the claim, but does not prove it.' : 'The claim says nothing about it.',
    };
  };
  return done('counter', 'counter-which', {
    kind: 'choose',
    prompt: `Claim: “${f.claim}” Which number list breaks the claim?`,
    scene: { kind: 'lantern', points: 0, chords: false, claim: f.claim, rows: rows.map((r) => ({ label: 'Test', cells: r.xs.map(String) })) },
    choices: rows.map((r) => ({ id: r.role, label: seqText(r.xs) })),
    answer: 'break',
    explain: `${seqText(brk)} ${f.groupIs}, but it ${f.doesNot}. So it breaks the claim. One case like this makes the claim false.`,
    feedback: {
      fit: { headline: 'This list fits the claim, so it can’t break it.', detail: [`${seqText(fit)} ${f.groupIs}, and it ${f.does}.`, 'A case that fits only supports a claim. It never proves it.', f.need], example: seqCase(fit) },
      none: { headline: 'The claim is not about this list, so it can’t break it.', detail: [`${seqText(none)} ${f.groupIsNot}, so the claim says nothing about it.`, f.need], example: seqCase(none) },
    },
    hint: 'Here is one list, checked. Is each list one the claim talks about? If so, does the claim fail for it?',
    hintCase: seqCase(hint),
    teach: {
      rule: 'One counterexample makes a claim false. It must be a case the claim talks about, and the claim must fail for it.',
      terms: [
        { word: 'A counterexample', meaning: 'one case that breaks a claim.' },
        { word: 'A number list', meaning: 'numbers in order, like 2, 4, 6, 8.' },
        { word: 'Growing', meaning: 'each number is bigger than the one before.' },
      ],
      casesTitle: `Testing “${f.claim}”`,
      cases: [brk, fit, none].map(seqCase),
      remember: ['A case that breaks a claim must be one the claim talks about.', 'Ask: is it in the claim’s group? Does the claim fail for it?'],
      simpler: ['Claim: every dog in this room is brown.', 'A black dog in this room breaks it.', 'A brown dog fits. A black cat says nothing about it.'],
    },
  }, { seq: { family: f, rows } });
}

/** The trap: every card seen fits (or says nothing). Is the claim proved? No: they are only examples. */
export function examplesTrapItem(rng: Rng, o: { skin: ProofSkin }): ProofMade {
  const n = rng.int(3, 5);
  const cc = counterCase(rng, o.skin, () => {
    const fits = rng.int(2, Math.min(n, 3));
    return [...Array(fits).fill('fit'), ...Array(n - fits).fill('none')] as CaseRole[];
  });
  const s = cc.skin;
  const { group, prop } = cc.claim;
  const nFit = cc.cards.filter((t) => cardRole(cc.claim, t) === 'fit').length;
  const feedback: Record<string, ChoiceFeedback> = {
    yes: {
      headline: `${cap(s.plural)} that fit are examples, not a proof.`,
      detail: [`Every ${group.val} ${s.noun} seen so far is ${propWord(prop)}. But the claim is about every ${group.val} ${s.noun} ${s.place}, even ones not seen yet.`, `One unseen ${group.val} ${s.noun} that is ${propNot(prop)} would break it.`],
      example: unseenBreaker(cc),
    },
    more: {
      headline: 'One more example is still only an example.',
      detail: ['No number of cases that fit covers every case.', `A ${group.val} ${s.noun} not seen yet could still be ${propNot(prop)}.`],
      example: unseenBreaker(cc),
    },
    false: {
      headline: `None of these ${s.plural} breaks the claim.`,
      detail: [
        nFit === cc.cards.length
          ? `All ${['', 'one', 'two', 'three'][nFit]} are ${group.val} and ${propWord(prop)}. Each one fits the claim.`
          : `${nFit === 1 ? 'One is' : `${cap(['', 'one', 'two', 'three'][nFit])} are`} ${group.val} and ${propWord(prop)}. The rest are not ${group.val}, so the claim says nothing about them.`,
        'So the claim is not shown false. It is not proved either.',
      ],
      example: cardCase(cc, cc.cards[0]),
    },
  };
  return done('counter', 'counter-trap', {
    kind: 'choose',
    prompt: `${s.who} says: “${claimWords(cc.claim, s)}” ${s.who} has looked at ${n} of the ${s.plural} so far. Here they are. Is the claim proved?`,
    scene: { kind: 'things', things: cc.cards },
    choices: shuffled(rng, [
      { id: 'no', label: `No. They are only examples. A ${s.noun} not seen yet could break it.` },
      { id: 'yes', label: `Yes. Every ${group.val} ${s.noun} seen so far is ${propWord(prop)}.` },
      { id: 'more', label: `Not yet. One more ${group.val} ${s.noun} that fits would prove it.` },
      { id: 'false', label: `No. One of these ${s.plural} breaks it.` },
    ]),
    answer: 'no',
    explain: `Every ${group.val} ${s.noun} seen so far is ${propWord(prop)}. Those are examples. The claim is about every ${group.val} ${s.noun} ${s.place}, so one not seen yet could break it.`,
    feedback,
    hint: `Here is one ${s.noun}, checked. Now think about the ${s.plural} not seen yet.`,
    hintCase: cardCase(cc, cc.cards[0]),
    teach: counterTeach(cc, 'Examples that fit never prove an every claim. The claim is about every case, and one not seen yet could break it.', cc.cards),
    tags: [TRAPS.counter.tag],
  }, { counter: cc });
}

/** A conflict item: most cards fit, one breaks the claim. What do they show? The claim is false. */
export function oneBreaksItem(rng: Rng, o: { skin: ProofSkin }): ProofMade {
  // At most three cards can fit a claim (a color and a shape leave only the sizes), so a few say nothing.
  const fits = rng.int(2, 3);
  const quiet = rng.int(0, 1);
  const n = 1 + fits + quiet;
  const cc = counterCase(rng, o.skin, () => ['break', ...Array(fits).fill('fit'), ...Array(quiet).fill('none')] as CaseRole[]);
  const s = cc.skin;
  const { group, prop } = cc.claim;
  const brk = cc.cards.find((t) => cardRole(cc.claim, t) === 'break')!;
  const fit = cc.cards.find((t) => cardRole(cc.claim, t) === 'fit')!;
  const feedback: Record<string, ChoiceFeedback> = {
    true: { headline: `More ${s.plural} that fit can’t outvote one that breaks it.`, detail: [`${cap(cardName(brk))} is ${group.val}, so the claim is about it. And it is ${propNot(prop)}.`, 'So the claim is false, however many fit.'], example: cardCase(cc, brk) },
    guess: { headline: 'Once a case breaks a claim, it is not a guess anymore. It is false.', detail: [`${cap(cardName(brk))} is ${group.val}, but it is ${propNot(prop)}.`, 'A good guess must fit every case seen. This claim does not.'], example: cardCase(cc, brk) },
    cant: { headline: `One ${s.noun} that breaks the claim is enough. You don’t need to see them all.`, detail: [`${cap(cardName(brk))} is ${group.val}, but it is ${propNot(prop)}.`, 'That one case makes the claim false.'], example: cardCase(cc, brk) },
  };
  return done('counter', 'counter-one', {
    kind: 'choose',
    prompt: `${s.who} says: “${claimWords(cc.claim, s)}” Here are ${n} ${s.plural} from it. What do they show about the claim?`,
    scene: { kind: 'things', things: cc.cards },
    choices: shuffled(rng, [
      { id: 'false', label: `The claim is false. One ${s.noun} breaks it.` },
      { id: 'true', label: 'The claim is true. More of them fit it than break it.' },
      { id: 'guess', label: 'The claim is a good guess.' },
      { id: 'cant', label: `You can’t tell until you see every ${s.noun}.` },
    ]),
    answer: 'false',
    explain: `${cap(cardName(brk))} is ${group.val}, but it is ${propNot(prop)}. One case that breaks an every claim makes it false, however many fit.`,
    feedback,
    hint: `Here is one ${s.noun}, checked. Check each one: is it ${group.val}, and is it ${propWord(prop)}?`,
    hintCase: cardCase(cc, fit),
    teach: counterTeach(cc, 'One case that breaks an every claim makes it false. Cases that fit can’t outvote it.', [brk, fit]),
    conflict: true,
  }, { counter: cc });
}

// =====================================================================================================================
// Four ways to prove (l1): name the way a reasoning uses
// =====================================================================================================================

export interface Reasoning {
  method: Method;
  lines: string[];
  chain?: ChainProof;
  /** A Proof Lantern reason chain: start at a, add d each time. */
  parity?: { a: number; d: number };
  cases?: CaseProof;
  crash?: CrashCase;
  counter?: CounterCase;
}

/** "So the number is even." A claim after "So", its first word small unless it is a name. */
const soLine = (claim: string) => `So ${/^(The|There|Every) /.test(claim) ? low(claim) : claim}`;

/** A short chain: three names, two givens, the chain step and the definition step. Every step follows. */
export function shortChain(rng: Rng, sid: OrderSkinId): ChainProof {
  const sk = ORDER_SKINS[sid];
  const names = sid === 'letters' ? sk.pool.slice(0, 3) : rng.shuffle(sk.pool).slice(0, 3);
  const line = rng.shuffle(names);
  const [p0, p1, p2] = line;
  return { skin: sk, names: [...names], line, givens: [B(p0, p1), B(p1, p2)], claim: D(p0, p2), steps: [{ stmt: B(p0, p2), uses: [G(0), G(1)] }, { stmt: D(p0, p2), uses: [S(0), DEF] }] };
}

export function reasoningFor(rng: Rng, method: Method, skin: ProofSkin): Reasoning {
  switch (method) {
    case 'chain': {
      // Now and then (letters and numbers), Proof Lantern’s reason chain: start, the step, every time.
      if (skin === 'abstract' && rng.chance(0.5)) {
        const a = rng.int(1, 9);
        const d = rng.int(1, 6);
        const claim = d % 2 === 1 ? 'Odd and even take turns.' : `Every term is ${par(a)}.`;
        return { method, parity: { a, d }, lines: [`A pattern is made by a stated rule: start at ${a} and add ${d} each time.`, `Claim: ${claim}`, ...reasonSteps(a, d).map((s, i) => `Step ${i + 1}: ${s}`)] };
      }
      const p = shortChain(rng, rng.pick(ORDER_BY_SKIN[skin]));
      return { method, chain: p, lines: [p.skin.setting(joinAnd(p.names)), ...chainLines(p)] };
    }
    case 'cases': {
      const cp = makeCaseProof(rng, pickCaseTopic(rng, skin), { left: 'none', ruled: rng.pick([0, 1] as const) });
      return {
        method,
        cases: cp,
        lines: [...caseGivens(cp).map((g, i) => `Given ${i + 1}: ${g}`), `Claim: ${caseClaim(cp)}`, ...cp.covered.map((o, i) => `Case ${i + 1}: ${cp.topic.is(cp.who, o)} ${caseWhy(cp, o)}`), `Every case left is checked. ${soLine(caseClaim(cp))}`],
      };
    }
    case 'crash': {
      const c = crashCase(rng, rng.pick(KNIGHT_BY_SKIN[skin]));
      const X = c.nm(c.who);
      return {
        method,
        crash: c,
        lines: [c.setting, PUZZLE_RULE, ...c.ids.map((id) => `${c.nm(id)} says: “${wordsOf(c, id)}”`), `Suppose ${X} is ${aKind(c.kind)}.`, ...c.lines, `That guess crashes. So ${X} is ${aKind(flip(c.kind))}.`],
      };
    }
    case 'counter': {
      const cc = counterCase(rng, skin, () => ['break']);
      const t = cc.cards[0];
      return {
        method,
        counter: cc,
        lines: [`Claim: ${claimWords(cc.claim, cc.skin)}`, `${cc.skin.who} finds ${cardName(t)} there.`, `It is ${cc.claim.group.val}, but it is ${propNot(cc.claim.prop)}.`, 'So the claim is false.'],
      };
    }
    case 'examples': {
      const cc = counterCase(rng, skin, () => Array(rng.int(2, 3)).fill('fit') as CaseRole[]);
      return {
        method,
        counter: cc,
        lines: [`Claim: ${claimWords(cc.claim, cc.skin)}`, `${cc.skin.who} finds ${joinAnd(cc.cards.map(cardName))} there.`, `Each one is ${cc.claim.group.val} and ${propWord(cc.claim.prop)}.`, 'So the claim is true.'],
      };
    }
  }
}

export const METHOD_LABEL: Readonly<Record<Method, string>> = {
  chain: 'A chain of steps',
  cases: 'Cover every case',
  crash: 'Suppose and crash',
  counter: 'One counterexample',
  examples: 'Not a proof. It only gives examples.',
};
const METHOD_NAME: Readonly<Record<Method, string>> = { chain: 'a chain', cases: 'a proof by cases', crash: 'suppose and crash', counter: 'one counterexample', examples: 'a list of examples' };
const METHOD_LOOKS: Readonly<Record<Method, string>> = {
  chain: 'A chain joins facts one step at a time. Each step names what it uses.',
  cases: 'A proof by cases checks the claim in every case the givens leave.',
  crash: 'Suppose and crash starts with a guess. Then it shows the guess breaks a rule.',
  counter: 'One counterexample finds one case that breaks an every claim.',
  examples: 'A list of examples shows a few cases that fit. Then it says the claim is true.',
};

/** What this reasoning does, in a sentence or two (from its model). */
export function methodSpot(r: Reasoning): string {
  switch (r.method) {
    case 'chain': return r.parity ? 'This reasoning goes one step at a time: the start, the step, then every time. Each step follows from the ones before.' : 'This reasoning joins two facts with the chain rule, one step at a time. Then it uses the definition.';
    case 'cases': return `This reasoning checks every case the givens leave: ${joinAnd(r.cases!.covered.map((o) => o.name))}.`;
    case 'crash': {
      const c = r.crash!;
      return `This reasoning supposes ${c.nm(c.who)} is ${aKind(c.kind)}. Then ${c.nm(c.breakers[0])}’s words break the rule.`;
    }
    case 'counter': return `This reasoning finds one ${r.counter!.skin.noun} that breaks the claim: ${cardName(r.counter!.cards[0])}.`;
    case 'examples': return `This reasoning only shows ${r.counter!.cards.length} ${r.counter!.skin.plural} that fit. It never checks the rest.`;
  }
}

/** One small example of each way, for the teaching (each names its way). */
export const METHOD_CASES: Readonly<Record<Method, TeachCase>> = {
  chain: { label: 'Ava finished before Ben. Ben finished before Cal. So Ava finished before Cal.', note: 'A chain: each step joins facts.' },
  cases: { label: 'The pet is a cat or a dog. A cat has fur. A dog has fur. So the pet has fur.', note: 'Cover every case: both cases are checked.' },
  crash: { label: 'Suppose Ava is a knave. Then Ben’s words break the rule. So Ava is a knight.', note: 'Suppose and crash: the guess breaks a rule.' },
  counter: { label: 'Claim: every red card is a circle. Here is a red square. So the claim is false.', note: 'One counterexample: one case breaks it.' },
  examples: { label: 'Claim: every red card is a circle. Here are two red circles. So the claim is true.', note: 'Only examples: not a proof.' },
};

function methodTeach(): Teach {
  return {
    rule: 'Look at what the reasoning does. A chain joins facts. Cases check every case. Suppose and crash tests a guess. A counterexample breaks an every claim.',
    terms: [
      { word: 'A proof', meaning: 'reasoning that shows a claim must be true, so no case can break it.' },
      { word: 'A chain', meaning: 'facts joined one step at a time. Grown-ups call it a direct proof.' },
      { word: 'A case', meaning: 'one way things could be.' },
      { word: 'A counterexample', meaning: 'one case that breaks an every claim.' },
    ],
    casesTitle: 'A small example of each',
    cases: METHODS.map((m) => METHOD_CASES[m]),
    remember: ['Ask: does it join steps, check cases, test a guess, or find a case that breaks a claim?', 'Examples alone never prove an every claim.'],
    simpler: ['Read the reasoning line by line.', 'Does it say “Suppose”? Then look for a crash.', 'Does it say “Case 1”? Then it checks cases.', 'Does it find one case that breaks a claim? That is a counterexample.'],
  };
}

/** Which way to prove does this reasoning use? (The trap: it only gives examples.) */
export function methodItem(rng: Rng, o: { method: Method; skin: ProofSkin }): ProofMade {
  const r = reasoningFor(rng, o.method, o.skin);
  const actual = o.method;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const m of METHODS) {
    if (m === actual) continue;
    feedback[m] = {
      headline: m === 'examples' ? 'This reasoning is a proof, not a list of examples.' : actual === 'examples' ? 'This reasoning only gives examples. It is not a proof.' : `This reasoning is not ${METHOD_NAME[m]}.`,
      detail: [METHOD_LOOKS[m], methodSpot(r), actual === 'examples' ? 'Examples that fit never prove an every claim.' : `So it is ${METHOD_NAME[actual]}.`],
      example: METHOD_CASES[actual],
    };
  }
  const other = METHODS.find((m) => m !== actual && m !== 'examples')!;
  return done('method', 'method', {
    kind: 'choose',
    prompt: 'Read this reasoning. Which way to prove does it use?',
    scene: { kind: 'text', lines: r.lines },
    choices: METHODS.map((m) => ({ id: m, label: METHOD_LABEL[m] })),
    answer: actual,
    explain: `${methodSpot(r)} ${actual === 'examples' ? 'Examples that fit never prove an every claim, so it is not a proof.' : `So it is ${METHOD_NAME[actual]}.`}`,
    feedback,
    hint: 'Here is a small example of one way. Look for the same kind of move in the reasoning.',
    hintCase: METHOD_CASES[other],
    teach: methodTeach(),
    ...(actual === 'examples' ? { tags: [TRAPS.method.tag], conflict: true } : {}),
    ...(actual === 'crash' ? { seconds: PROOF_SECONDS } : {}),
  }, { method: actual, chain: r.chain, cases: r.cases, crash: r.crash, counter: r.counter, parity: r.parity });
}

// =====================================================================================================================
// The closing why item: why a proof works (its choices are reasons)
// =====================================================================================================================

export type WhyFamily = Exclude<Method, 'examples'>;
/** Every family a closing why item can come from: the four ways, named rules (l6) and the domino proof (l7). */
export type WhyAny = WhyFamily | 'rules' | 'induction';
export const WHY_FAMILIES: readonly WhyAny[] = [...WAYS, 'rules', 'induction'];
/** The lesson that teaches each family's reason. */
export const WHY_LESSON: Readonly<Record<WhyAny, string>> = { chain: LESSONS.cite, cases: LESSONS.cases, crash: LESSONS.crash, counter: LESSONS.counter, rules: LESSONS.rules, induction: LESSONS.induction };

export function whyItem(rng: Rng, o: { family?: WhyFamily; skin?: ProofSkin } = {}): ProofMade {
  const family = o.family ?? rng.pick(WAYS);
  const skin = o.skin ?? rng.pick(PROOF_SKINS);
  const why = (core: ItemCore, extra: Partial<ProofMade>) => done('why', 'why', { ...core, tags: [WHY_TAG] }, { method: family, ...extra });
  if (family === 'chain') {
    const p = makeChain(rng, rng.pick(ORDER_BY_SKIN[skin]));
    return why({
      kind: 'choose',
      prompt: `${p.skin.setting(joinAnd(p.names))} This proof shows ${stmtText(p, p.claim)} Why is it a proof?`,
      scene: chainScene(p),
      choices: shuffled(rng, [
        { id: 'follows', label: 'Because every step follows from what it uses.' },
        { id: 'true', label: 'Because the claim is true.' },
        { id: 'steps', label: 'Because it has three steps.' },
        { id: 'sounds', label: 'Because every step sounds right.' },
      ]),
      answer: 'follows',
      explain: 'Each step names what it uses, and those force it. So if the givens are true, the claim must be true.',
      feedback: {
        true: { headline: 'A true claim is not the reason. A proof shows why it must be true.', detail: ['A claim can be true with no proof at all.', 'This one is a proof because each step follows from what it uses.'], example: stepCase(p, 0) },
        steps: { headline: 'The number of steps is not the reason.', detail: ['A proof can have one step or ten.', 'What matters is that every step follows from what it uses.'], example: stepCase(p, 1) },
        sounds: { headline: 'Sounding right is not the same as following.', detail: ['A step can sound right and still use nothing.', 'Here each step names what it uses, and those force it.'], example: stepCase(p, 2) },
      },
      hint: 'Here is one step, checked. What makes a step part of a proof?',
      hintCase: stepCase(p, 0),
      teach: chainTeach(p, 'A chain is a proof when every step follows from what it uses. Then the claim must be true when the givens are.'),
      seconds: PROOF_SECONDS,
    }, { chain: p });
  }
  if (family === 'cases') {
    const cp = makeCaseProof(rng, pickCaseTopic(rng, skin), { left: 'none', ruled: 1 });
    const first = cp.covered[0];
    return why({
      kind: 'choose',
      prompt: `Here is a proof by cases. Why is it a proof?`,
      scene: caseScene(cp, { all: true }),
      choices: shuffled(rng, [
        { id: 'every', label: 'Because the claim is true in every case the givens leave.' },
        { id: 'first', label: 'Because the claim is true in one of the cases.' },
        { id: 'many', label: 'Because it checks more than one case.' },
        { id: 'sounds', label: 'Because the claim sounds true.' },
      ]),
      answer: 'every',
      explain: `The givens leave ${joinAnd(casesLeft(cp).map((x) => x.name))}. The claim is true in each one. So it must be true, whichever case it is.`,
      feedback: {
        first: { headline: 'One case is not enough.', detail: [`The claim is true when it is ${first.name}. But the givens leave ${casesLeft(cp).length} cases.`, 'It is a proof because the claim is true in every one of them.'], example: optCase(cp, first) },
        many: { headline: 'Checking more than one case is not enough.', detail: ['A proof by cases must check every case the givens leave.', `Here it does: ${joinAnd(casesLeft(cp).map((x) => x.name))}.`], example: optCase(cp, first) },
        sounds: { headline: 'Sounding true is not a reason.', detail: ['A proof shows the claim must be true.', 'This one checks every case the givens leave.'], example: optCase(cp, first) },
      },
      hint: 'Here is one case, checked. Which cases does a proof by cases need?',
      hintCase: optCase(cp, cp.ruled[0]),
      teach: casesTeach(cp, 'A proof by cases works when the claim is true in every case the givens leave.'),
    }, { cases: cp });
  }
  if (family === 'crash') {
    const c = crashCase(rng, rng.pick(KNIGHT_BY_SKIN[skin]));
    const X = c.nm(c.who);
    const bk = c.nm(c.breakers[0]);
    return why({
      kind: 'choose',
      prompt: `${c.setting} Suppose ${X} is ${aKind(c.kind)}. ${c.lines.join(' ')} That guess crashes. Why does the crash prove ${X} is ${aKind(flip(c.kind))}?`,
      scene: knightScene(c),
      choices: shuffled(rng, [
        { id: 'opp', label: `Because the guess breaks the rule, so ${X} can’t be ${aKind(c.kind)}.` },
        { id: 'said', label: `Because ${X}’s words sound true.` },
        { id: 'hard', label: 'Because the guess was hard to follow.' },
        { id: 'first', label: 'Because a first guess is always wrong.' },
      ]),
      answer: 'opp',
      explain: `Inside the guess, ${bk}’s words break the rule. So the guess can’t be true. Every islander is a knight or a knave, so ${X} is ${aKind(flip(c.kind))}.`,
      feedback: {
        said: { headline: 'How words sound is not a reason.', detail: [`The crash is the reason: inside the guess, ${bk}’s words break the rule.`, `So ${X} can’t be ${aKind(c.kind)}.`], example: kCase(c, c.world) },
        hard: { headline: 'A hard guess is not a wrong guess.', detail: [`This guess is wrong because it crashes: ${bk}’s words break the rule.`, 'A guess that crashes can’t be true.'], example: kCase(c, c.world) },
        first: { headline: 'A first guess is not always wrong.', detail: ['Sometimes the first guess holds up. Then it proves nothing.', 'Here the guess crashes. That is what proves its opposite.'], example: kCase(c, c.world) },
      },
      hint: 'Here is one more case with the same guess, checked. What happens to the guess every time?',
      hintCase: guessHint(c),
      teach: crashTeach(c, 'A guess that crashes can’t be true. So its opposite must be true.', [kCase(c, c.world), kCase(c, c.sols[0])]),
      seconds: PROOF_SECONDS,
    }, { crash: c });
  }
  const cc = counterCase(rng, skin, () => ['break', 'fit', 'fit']);
  const s = cc.skin;
  const brk = cc.cards.find((t) => cardRole(cc.claim, t) === 'break')!;
  const { group, prop } = cc.claim;
  return why({
    kind: 'choose',
    prompt: `${s.who} says: “${claimWords(cc.claim, s)}” Here are three ${s.plural}. Why does one of them show the claim is false?`,
    scene: { kind: 'things', things: cc.cards },
    choices: shuffled(rng, [
      { id: 'every', label: `Because the claim is about every ${group.val} ${s.noun}, and ${cardName(brk)} is ${propNot(prop)}.` },
      { id: 'most', label: `Because most of the ${s.plural} break it.` },
      { id: 'one', label: 'Because one example proves any claim.' },
      { id: 'looks', label: 'Because it looks different from the others.' },
    ]),
    answer: 'every',
    explain: `The claim says every ${group.val} ${s.noun} is ${propWord(prop)}. ${cap(cardName(brk))} is ${group.val} and ${propNot(prop)}. One case like that makes an every claim false.`,
    feedback: {
      most: { headline: `Most of them fit. Only one breaks it, and one is enough.`, detail: [`${cap(cardName(brk))} breaks the claim. The other two fit it.`, 'An every claim allows no exceptions, so one is enough.'], example: cardCase(cc, brk) },
      one: { headline: 'One example never proves a claim. One counterexample breaks one.', detail: ['A case that fits only supports an every claim.', 'A case that breaks it shows it is false.'], example: cardCase(cc, brk) },
      looks: { headline: 'Looking different is not the reason.', detail: [`${cap(cardName(brk))} is ${group.val}, so the claim is about it. And it is ${propNot(prop)}.`, 'That is why it breaks the claim.'], example: cardCase(cc, brk) },
    },
    hint: `Here is one ${s.noun}, checked. What does a ${s.noun} need to break the claim?`,
    hintCase: cardCase(cc, cc.cards.find((t) => t !== brk)!),
    teach: counterTeach(cc, 'An every claim allows no exceptions. So one case that breaks it makes it false.', cc.cards),
  }, { counter: cc });
}

// =====================================================================================================================
// The warm-up (bridge): a Proof Lantern item, proved, a good guess, or false
// =====================================================================================================================

/**
 * Proof Lantern's “proved, a good guess, or false?” item (statusItem), as a plain Journey item of this stop: the same
 * claim, picture, answer and teaching, without the Observatory's phase and level marks.
 */
export function bridgeItem(rng: Rng): ChooseItem {
  const it = statusItem(rng, {});
  return {
    kind: 'choose',
    id: `s${STOP}-warm`,
    stop: STOP,
    lesson: LESSONS.counter,
    skill: `s${STOP}.counter`,
    prompt: it.prompt,
    ...(it.scene ? { scene: it.scene } : {}),
    choices: it.choices,
    answer: it.answer,
    explain: it.explain,
    ...(it.hint ? { hint: it.hint } : {}),
    ...(it.hintCase ? { hintCase: it.hintCase } : {}),
    ...(it.teach ? { teach: it.teach } : {}),
    ...(it.feedback ? { feedback: it.feedback } : {}),
    ...(it.whyWrong ? { whyWrong: it.whyWrong } : {}),
    ...(it.tags ? { tags: it.tags } : {}),
  };
}
