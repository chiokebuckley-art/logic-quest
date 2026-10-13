/**
 * Stop 12 · Proof (id s11), Lesson 6 · Rules with names. The moves the game already uses, named: the IF part happened
 * (modus ponens), the THEN part did not happen (modus tollens), one or the other (disjunctive syllogism), the chain rule
 * (hypothetical syllogism) and Flip and NOT (a proof by contrapositive). Two look-alikes are no rule: the flip trick
 * (affirming the consequent) and the NOT trick (denying the antecedent), from the If… then stop and Spot the Trick.
 *
 * The model of a step: its givens and its claim, each a sentence built from a few facts (an if–then rule, an
 * either-or, NOT, or a fact on its own). Two things are worked out from it, never written by hand:
 *  - which move it is: the givens and the claim matched against each named shape (moveOf), in any order of the givens;
 *  - whether it follows: every case of its facts is listed, and a case where every given is true and the claim is
 *    false breaks it (breakersOf). Each named rule has no such case; each look-alike has one.
 *
 * Every answer, explanation, wrong-choice feedback, hint case and board mark here comes from those two. Only the rng
 * passed in is used, so the same seed always gives the same item.
 */
import { YES_NO } from '../drill';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillRow, DrillStep, Misconception, Rng, Scene, Teach, TeachCase, Truth } from '../types';
import { cap, joinAnd, PROOF_SECONDS, TRAPS, WHY_TAG, type ProofKind, type ProofMade, type ProofSkin } from './proofs';
import type { ItemCore } from './statements';

/** Words for one wrong option of a board mark. */
const whyFor = (wrong: string, text: string): Record<string, string> => ({ [wrong]: text });

// =====================================================================================================================
// The model: sentences made of facts, and every case of those facts
// =====================================================================================================================

/** A sentence of a step: a fact (by index into the step's words), NOT a sentence, an if–then rule, or an either-or. */
export type Prop =
  | { t: 'atom'; i: number }
  | { t: 'not'; p: Prop }
  | { t: 'if'; a: Prop; b: Prop }
  | { t: 'or'; a: Prop; b: Prop };

const at = (i: number): Prop => ({ t: 'atom', i });
const no = (p: Prop): Prop => ({ t: 'not', p });
const ifp = (a: Prop, b: Prop): Prop => ({ t: 'if', a, b });
const orp = (a: Prop, b: Prop): Prop => ({ t: 'or', a, b });
/** The pieces of a sentence, for the worked examples and the tests. */
export const propParts = { at, no, ifp, orp } as const;

export const sameProp = (x: Prop, y: Prop): boolean => JSON.stringify(x) === JSON.stringify(y);

/** Is the sentence true in this case (one true or false for each fact)? */
export function holds(p: Prop, w: readonly boolean[]): boolean {
  switch (p.t) {
    case 'atom': return w[p.i];
    case 'not': return !holds(p.p, w);
    case 'if': return !holds(p.a, w) || holds(p.b, w);
    case 'or': return holds(p.a, w) || holds(p.b, w);
  }
}

/** Every case of n facts, the first fact true first: TT, TF, FT, FF for two. */
export function worldsFor(n: number): boolean[][] {
  let out: boolean[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((w) => [[...w, true], [...w, false]]);
  return out;
}

/** One fact in words, lowercase and with no period: “it rains”, and its NOT: “it does not rain”. */
export interface Sent {
  yes: string;
  no: string;
}

/**
 * A story with three facts in a chain (the first leads to the second, the second to the third) and an either-or pair.
 * The case that breaks a look-alike has a fact of the chain true and the fact before it false, so that must be able to
 * happen: a number that is even but not 8 can, but one that splits into two equal groups and is not even cannot.
 */
export interface RuleTopic {
  id: string;
  skin: ProofSkin;
  chain: readonly [Sent, Sent, Sent];
  /** Two facts that can both be true: “one or the other”. */
  or: readonly [Sent, Sent];
}

/** The named rules, then the two look-alikes. */
export type RuleId = 'mp' | 'mt' | 'ds' | 'chain' | 'contra';
export type LookalikeId = 'ac' | 'da';
export type MoveId = RuleId | LookalikeId;
export const RULES: readonly RuleId[] = ['mp', 'mt', 'ds', 'chain', 'contra'];
export const LOOKALIKES: readonly LookalikeId[] = ['ac', 'da'];
export const MOVES: readonly MoveId[] = [...RULES, ...LOOKALIKES];
/** The rule each look-alike is mistaken for. */
export const LOOKS_LIKE: Readonly<Record<LookalikeId, RuleId>> = { ac: 'mp', da: 'mt' };
export const isLookalike = (m: MoveId): m is LookalikeId => m === 'ac' || m === 'da';

/** A step of a proof: its givens and its claim, the words its facts stand for, and the move it was made as. */
export interface RuleStep {
  topic: RuleTopic;
  words: readonly Sent[];
  givens: Prop[];
  claim: Prop;
  made: MoveId;
}

export const worldsOf = (s: Pick<RuleStep, 'words'>) => worldsFor(s.words.length);
export const givensHold = (s: Pick<RuleStep, 'givens'>, w: readonly boolean[]) => s.givens.every((g) => holds(g, w));
/** The cases where every given is true but this claim is false. Each one breaks the step. */
export const breakersOf = (s: Pick<RuleStep, 'words' | 'givens'>, claim: Prop) => worldsOf(s).filter((w) => givensHold(s, w) && !holds(claim, w));
/** Does the claim follow: no case makes every given true and it false? */
export const claimFollows = (s: Pick<RuleStep, 'words' | 'givens'>, claim: Prop) => breakersOf(s, claim).length === 0;
export const isRule = (s: RuleStep) => claimFollows(s, s.claim);

// ---------- the named shapes ----------

type Pat = { t: 'var'; v: number } | { t: 'not'; p: Pat } | { t: 'if'; a: Pat; b: Pat } | { t: 'or'; a: Pat; b: Pat };
const V = (v: number): Pat => ({ t: 'var', v });
const pNot = (p: Pat): Pat => ({ t: 'not', p });
const pIf = (a: Pat, b: Pat): Pat => ({ t: 'if', a, b });
const pOr = (a: Pat, b: Pat): Pat => ({ t: 'or', a, b });
const PX = V(0);
const PY = V(1);
const PZ = V(2);

/** Each move's shape: its givens (in any order) and its claim. X, Y and Z stand for any three different sentences. */
export const MOVE_SHAPES: Readonly<Record<MoveId, { givens: Pat[]; claim: Pat }[]>> = {
  mp: [{ givens: [pIf(PX, PY), PX], claim: PY }],
  mt: [{ givens: [pIf(PX, PY), pNot(PY)], claim: pNot(PX) }],
  ds: [{ givens: [pOr(PX, PY), pNot(PX)], claim: PY }, { givens: [pOr(PX, PY), pNot(PY)], claim: PX }],
  chain: [{ givens: [pIf(PX, PY), pIf(PY, PZ)], claim: pIf(PX, PZ) }],
  contra: [{ givens: [pIf(pNot(PY), pNot(PX))], claim: pIf(PX, PY) }],
  ac: [{ givens: [pIf(PX, PY), PY], claim: PX }],
  da: [{ givens: [pIf(PX, PY), pNot(PX)], claim: pNot(PY) }],
};

function unify(p: Pat, q: Prop, env: Map<number, Prop>): boolean {
  if (p.t === 'var') {
    const b = env.get(p.v);
    if (b) return sameProp(b, q);
    env.set(p.v, q);
    return true;
  }
  if (p.t === 'not') return q.t === 'not' && unify(p.p, q.p, env);
  if (p.t === 'if') return q.t === 'if' && unify(p.a, q.a, env) && unify(p.b, q.b, env);
  return q.t === 'or' && unify(p.a, q.a, env) && unify(p.b, q.b, env);
}

function orders<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => orders([...xs.slice(0, i), ...xs.slice(i + 1)]).map((o) => [x, ...o]));
}

/** The move a step's givens and claim match, or null. X, Y and Z must stand for different sentences. */
export function moveOf(s: Pick<RuleStep, 'givens' | 'claim'>): MoveId | null {
  for (const m of MOVES) {
    for (const shape of MOVE_SHAPES[m]) {
      if (shape.givens.length !== s.givens.length) continue;
      for (const gs of orders(s.givens)) {
        const env = new Map<number, Prop>();
        if (!shape.givens.every((g, i) => unify(g, gs[i], env)) || !unify(shape.claim, s.claim, env)) continue;
        const bound = [...env.values()].map((p) => JSON.stringify(p));
        if (new Set(bound).size === bound.length) return m;
      }
    }
  }
  return null;
}

// ---------- the stories ----------

const S = (yes: string, no: string): Sent => ({ yes, no });

export const RULE_TOPICS: readonly RuleTopic[] = [
  {
    id: 'rain', skin: 'everyday',
    chain: [S('it rains', 'it does not rain'), S('the field is wet', 'the field is not wet'), S('the game moves to the gym', 'the game does not move to the gym')],
    or: [S('Leo walks the dog', 'Leo does not walk the dog'), S('Ava walks the dog', 'Ava does not walk the dog')],
  },
  {
    id: 'bus', skin: 'everyday',
    chain: [S('the bus is late', 'the bus is not late'), S('Sam misses the bell', 'Sam does not miss the bell'), S('Sam signs in at the office', 'Sam does not sign in at the office')],
    or: [S('Sam has art today', 'Sam does not have art today'), S('Sam has music today', 'Sam does not have music today')],
  },
  {
    id: 'snow', skin: 'everyday',
    chain: [S('it snows a lot', 'it does not snow a lot'), S('school is closed', 'school is not closed'), S('Mia builds a snow fort', 'Mia does not build a snow fort')],
    or: [S('Mia wears her hat', 'Mia does not wear her hat'), S('Mia wears her hood', 'Mia does not wear her hood')],
  },
  {
    id: 'dragon', skin: 'fantasy',
    chain: [S('the dragon sneezes', 'the dragon does not sneeze'), S('the tower gets hot', 'the tower does not get hot'), S('the ice wall melts', 'the ice wall does not melt')],
    or: [S('the gem glows', 'the gem does not glow'), S('the gem hums', 'the gem does not hum')],
  },
  {
    id: 'wand', skin: 'fantasy',
    chain: [S('the wand glows', 'the wand does not glow'), S('the door opens', 'the door does not open'), S('the owl flies out', 'the owl does not fly out')],
    or: [S('the potion fizzes', 'the potion does not fizz'), S('the potion smokes', 'the potion does not smoke')],
  },
  {
    id: 'moon', skin: 'fantasy',
    chain: [S('the moon is full', 'the moon is not full'), S('the elves sing', 'the elves do not sing'), S('the flowers glow', 'the flowers do not glow')],
    or: [S('the fairy sings', 'the fairy does not sing'), S('the fairy dances', 'the fairy does not dance')],
  },
  {
    id: 'number', skin: 'abstract',
    chain: [S('the number is 8', 'the number is not 8'), S('the number is even', 'the number is not even'), S('the number is circled', 'the number is not circled')],
    or: [S('the number is more than 5', 'the number is not more than 5'), S('the number is even', 'the number is not even')],
  },
  {
    id: 'card', skin: 'abstract',
    chain: [S('the card is red', 'the card is not red'), S('the card has a star', 'the card does not have a star'), S('the card goes in box 1', 'the card does not go in box 1')],
    or: [S('the card has a dot', 'the card does not have a dot'), S('the card has a stripe', 'the card does not have a stripe')],
  },
  {
    id: 'tile', skin: 'abstract',
    chain: [S('the tile is blue', 'the tile is not blue'), S('the tile is in row 2', 'the tile is not in row 2'), S('the tile has a dot', 'the tile does not have a dot')],
    or: [S('the tile is shiny', 'the tile is not shiny'), S('the tile is round', 'the tile is not round')],
  },
];
export const ruleTopic = (id: string) => RULE_TOPICS.find((t) => t.id === id)!;

function pickRuleTopic(rng: Rng, skin: ProofSkin, avoid?: Set<string>): RuleTopic {
  const all = RULE_TOPICS.filter((t) => t.skin === skin);
  const ok = all.filter((t) => !avoid?.has(t.id));
  const t = rng.pick(ok.length ? ok : all);
  avoid?.add(t.id);
  return t;
}

/**
 * A step made as one move. `link`: which two facts of the chain a two-fact move uses (the first two, or the last
 * two); `deny`: which side of the either-or “one or the other” rules out. The move is checked against its shape.
 */
export function makeStep(topic: RuleTopic, move: MoveId, o: { link?: 0 | 1; deny?: 0 | 1 } = {}): RuleStep {
  let s: RuleStep;
  if (move === 'ds') {
    const k = o.deny ?? 0;
    s = { topic, words: topic.or, givens: [orp(at(0), at(1)), no(at(k))], claim: at(1 - k), made: move };
  } else if (move === 'chain') {
    s = { topic, words: topic.chain, givens: [ifp(at(0), at(1)), ifp(at(1), at(2))], claim: ifp(at(0), at(2)), made: move };
  } else {
    const x = o.link ?? 0;
    const words = [topic.chain[x], topic.chain[x + 1]];
    const X = at(0);
    const Y = at(1);
    const shape: Record<Exclude<MoveId, 'ds' | 'chain'>, [Prop[], Prop]> = {
      mp: [[ifp(X, Y), X], Y],
      mt: [[ifp(X, Y), no(Y)], no(X)],
      contra: [[ifp(no(Y), no(X))], ifp(X, Y)],
      ac: [[ifp(X, Y), Y], X],
      da: [[ifp(X, Y), no(X)], no(Y)],
    };
    const [givens, claim] = shape[move];
    s = { topic, words, givens, claim, made: move };
  }
  if (moveOf(s) !== move) throw new Error(`makeStep: ${move} does not match its shape`);
  if (isRule(s) === isLookalike(move)) throw new Error(`makeStep: ${move} ${isRule(s) ? 'follows' : 'does not follow'}`);
  return s;
}

export const randomStep = (rng: Rng, topic: RuleTopic, move: MoveId) => makeStep(topic, move, { link: rng.pick([0, 1] as const), deny: rng.pick([0, 1] as const) });

// ---------- words ----------

/** A sentence inside another, lowercase and with no period. */
export function clause(s: Pick<RuleStep, 'words'>, p: Prop): string {
  switch (p.t) {
    case 'atom': return s.words[p.i].yes;
    case 'not':
      if (p.p.t !== 'atom') throw new Error('clause: NOT goes on a fact');
      return s.words[p.p.i].no;
    case 'if': return `if ${clause(s, p.a)}, then ${clause(s, p.b)}`;
    case 'or': return `either ${clause(s, p.a)} or ${clause(s, p.b)}`;
  }
}
/** A sentence on its own: “If it rains, then the field is wet.” */
export const sayProp = (s: Pick<RuleStep, 'words'>, p: Prop) => `${cap(clause(s, p))}.`;
/** The claim after “So”. */
export const sayClaim = (s: Pick<RuleStep, 'words'>, p: Prop) => `So ${clause(s, p)}.`;
/** The whole step in one line: the givens, then the claim. */
export const stepLine = (s: RuleStep) => [...s.givens.map((g) => sayProp(s, g)), sayClaim(s, s.claim)].join(' ');
export const givenLines = (s: RuleStep) => s.givens.map((g, i) => `Given ${i + 1}: ${sayProp(s, g)}`);
/** One case in words: “It does not rain and the field is wet.” */
export const worldText = (s: Pick<RuleStep, 'words'>, w: readonly boolean[]) => `${cap(joinAnd(s.words.map((x, i) => (w[i] ? x.yes : x.no))))}.`;
/** What a case says about the one fact a claim is about: “the field is wet”. */
function factIn(s: Pick<RuleStep, 'words'>, claim: Prop, w: readonly boolean[]): string {
  const i = claim.t === 'atom' ? claim.i : claim.t === 'not' && claim.p.t === 'atom' ? claim.p.i : -1;
  if (i < 0) throw new Error('factIn: a claim about one fact');
  return w[i] ? s.words[i].yes : s.words[i].no;
}
/** Why a given is false in a case: what it says, and the facts of the case that break it. */
function givenFalse(s: RuleStep, k: number, w: readonly boolean[]): string {
  const g = s.givens[k];
  const says = `Given ${k + 1} says “${sayProp(s, g)}”`;
  if (g.t === 'if') return `${says} In this case, ${factIn(s, g.a, w)}, but ${factIn(s, g.b, w)}.`;
  if (g.t === 'or') return `${says} In this case, ${factIn(s, g.a, w)}, and ${factIn(s, g.b, w)}.`;
  return `${says} In this case, ${factIn(s, g, w)}.`;
}
/** One case as facts, one sentence each (a box of the case picture). */
export const worldFacts = (s: Pick<RuleStep, 'words'>, w: readonly boolean[]) => s.words.map((x, i) => `${cap(w[i] ? x.yes : x.no)}.`);

export const MOVE_LABEL: Readonly<Record<MoveId, string>> = {
  mp: 'The IF part happened',
  mt: 'The THEN part did not happen',
  ds: 'One or the other',
  chain: 'The chain rule',
  contra: 'Flip and NOT',
  ac: 'The flip trick',
  da: 'The NOT trick',
};
export const NO_RULE_LABEL = 'No rule. The claim does not follow.';

/** What each move looks like, in words. */
export const MOVE_LOOKS: Readonly<Record<MoveId, string>> = {
  mp: '“The IF part happened” starts from a rule and its IF part. Its claim is the THEN part.',
  mt: '“The THEN part did not happen” starts from a rule and NOT its THEN part. Its claim is NOT the IF part.',
  ds: '“One or the other” starts from an either-or and NOT one side. Its claim is the other side.',
  chain: '“The chain rule” starts from two rules. The THEN part of the first is the IF part of the second.',
  contra: '“Flip and NOT” starts from the rule flipped, with NOT on each part. Its claim is the rule itself.',
  ac: '“The flip trick” starts from a rule and its THEN part. Its claim is the IF part.',
  da: '“The NOT trick” starts from a rule and NOT its IF part. Its claim is NOT the THEN part.',
};

/** What this step does, in a sentence or two (from the move its shape matches). */
export function moveSpot(s: RuleStep): string {
  const m = moveOf(s);
  switch (m) {
    case 'mp': return 'Given 2 is the IF part of given 1. So the claim is the THEN part.';
    case 'mt': return 'Given 2 says the THEN part of given 1 did not happen. So the claim says the IF part did not happen.';
    case 'ds': return 'Given 1 says one or the other. Given 2 rules one side out. So the claim is the other side.';
    case 'chain': return 'The THEN part of given 1 is the IF part of given 2. So the claim joins the first IF part to the last THEN part.';
    case 'contra': return 'Given 1 is a rule flipped, with NOT on each part. So the claim is that rule, the right way round.';
    case 'ac': return 'Given 2 is the THEN part of given 1. The claim goes back to the IF part, and nothing forces that.';
    case 'da': return 'Given 2 says the IF part of given 1 did not happen. The claim says the THEN part did not happen, and nothing forces that.';
    default: throw new Error('moveSpot: no move');
  }
}

const YES_NO_WORDS = { truth: 'yes', untruth: 'no' } as const;

/** One case as a teach card: every given true or false there, the claim too (when there is one), and what that means. */
export function worldCase(s: RuleStep, w: readonly boolean[], claim: Prop | null = s.claim): TeachCase {
  const gs = s.givens.map((g) => holds(g, w));
  const bad = gs.findIndex((v) => !v);
  const truths: Truth[] = [...s.givens.map((_, i) => ({ who: `Given ${i + 1}`, value: gs[i] })), ...(claim ? [{ who: 'The claim', value: holds(claim, w) }] : [])];
  const note = bad >= 0
    ? `Given ${bad + 1} is false here, so this case can’t happen.`
    : !claim
      ? 'Every given is true here.'
      : holds(claim, w)
        ? 'Every given is true here, and so is the claim.'
        : 'Every given is true here, but the claim is false. This case breaks the step.';
  return { label: worldText(s, w), truths, note };
}
/** The first case where every given is true. */
export const leftWorld = (s: RuleStep) => worldsOf(s).find((w) => givensHold(s, w))!;
export const leftCase = (s: RuleStep, claim: Prop = s.claim) => worldCase(s, leftWorld(s), claim);
/** The first case that breaks the claim (every given true, the claim false). */
export const breakWorld = (s: RuleStep, claim: Prop = s.claim) => breakersOf(s, claim)[0];
export const breakCase = (s: RuleStep, claim: Prop = s.claim) => worldCase(s, breakWorld(s, claim), claim);

/** One step, checked: does it follow, and which move is it? */
export function stepCase(s: RuleStep): TeachCase {
  const m = moveOf(s)!;
  const ok = isRule(s);
  return {
    label: stepLine(s),
    truths: [{ who: 'Follows from the givens', value: ok }],
    words: YES_NO_WORDS,
    note: ok ? `It uses “${MOVE_LABEL[m]}.”` : `It is “${MOVE_LABEL[m]}.” A case breaks it: ${worldText(s, breakWorld(s))}`,
  };
}

/** The small worked example of each move, all in one story (the rain and the field). */
export const RULE_EXAMPLES: Readonly<Record<MoveId, RuleStep>> = Object.fromEntries(MOVES.map((m) => [m, makeStep(ruleTopic('rain'), m)])) as Record<MoveId, RuleStep>;
export const RULE_CASES: Readonly<Record<MoveId, TeachCase>> = Object.fromEntries(
  MOVES.map((m) => [m, { label: stepLine(RULE_EXAMPLES[m]), note: isLookalike(m) ? `“${MOVE_LABEL[m]}”: it looks like a rule, but it is not one.` : `“${MOVE_LABEL[m]}”: a rule.` }]),
) as Record<MoveId, TeachCase>;

const RULE_TERMS = [
  { word: 'A rule', meaning: 'a step shape that always works. Whenever its givens are true, its claim is true too.' },
  { word: 'The IF part', meaning: 'the words right after “if” in an if–then sentence.' },
  { word: 'The THEN part', meaning: 'the words right after “then.”' },
  { word: 'A look-alike', meaning: 'a step that sounds like a rule. But a case can make its givens true and its claim false.' },
];

function rulesTeach(s: RuleStep, rule: string, claim: Prop | null = s.claim): Teach {
  const ws = worldsOf(s);
  // Three facts make eight cases: show the ones where every given is true.
  const shown = ws.length > 4 ? ws.filter((w) => givensHold(s, w)) : ws;
  const brk = claim ? breakersOf(s, claim)[0] : undefined;
  return {
    rule,
    terms: RULE_TERMS,
    meaning: claim ? `The step starts from ${s.givens.length === 1 ? 'one given' : `${s.givens.length} givens`}. Its claim: “${sayProp(s, claim)}”` : `The givens: ${s.givens.map((g) => sayProp(s, g)).join(' ')}`,
    casesTitle: ws.length > 4 ? 'Every case where both givens are true' : 'Every case of this step',
    cases: shown.map((w) => worldCase(s, w, claim)),
    remember: ['A rule works in every case where its givens are true.', 'Ask: can the givens be true and the claim false?'],
    simpler: [
      ...s.givens.map((g, i) => `Given ${i + 1}: ${sayProp(s, g)}`),
      claim ? `Claim: ${sayProp(s, claim)}` : 'Look for what is true in every case where the givens are true.',
      'List the cases. Cross out each case where a given is false.',
      claim ? (brk ? `Look at this case: ${worldText(s, brk)} The claim is false there, so it does not follow.` : 'The claim is true in every case left. So it follows.') : 'What is true in every case left follows.',
    ],
  };
}

// =====================================================================================================================
// The items
// =====================================================================================================================

/** A made item and the steps it shows (for the tests, which work every answer out again). */
export interface RuleMade extends ProofMade {
  steps: RuleStep[];
}

function made(tag: string, kind: ProofKind, item: ItemCore, steps: RuleStep[]): RuleMade {
  syncWhyWrong(item);
  return { tag, kind, item, steps };
}

/** A rule's small example as a hint: never the answer's own move, nor the rule a look-alike answer looks like. */
function otherRuleCase(...not: MoveId[]): TeachCase {
  return RULE_CASES[RULES.find((r) => !not.includes(r))!];
}

/** The step as a picture: its givens, numbered, and its claim. */
const stepScene = (s: RuleStep): Scene => ({ kind: 'argument', givens: s.givens.map((g) => sayProp(s, g)), claim: sayProp(s, s.claim) });

export interface RuleOpts {
  skin: ProofSkin;
  move?: MoveId;
  avoid?: Set<string>;
}

/** Which rule does this step use? A named rule, or (the trap) no rule: the step only looks like one. */
export function ruleNameItem(rng: Rng, o: RuleOpts): RuleMade {
  const s = randomStep(rng, pickRuleTopic(rng, o.skin, o.avoid), o.move ?? rng.pick(MOVES));
  const m = moveOf(s)!;
  const rule = isRule(s);
  const near: RuleId = isLookalike(m) ? LOOKS_LIKE[m] : m;
  const others = rng.shuffle(RULES.filter((r) => r !== near)).slice(0, 3);
  const ids = RULES.filter((r) => r === near || others.includes(r));
  const choices: Choice[] = [...ids.map((id) => ({ id, label: MOVE_LABEL[id] })), { id: 'none', label: NO_RULE_LABEL }];
  const answer = rule ? m : 'none';
  const brk = rule ? undefined : breakWorld(s);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const r of ids) {
    if (r === answer) continue;
    feedback[r] = rule
      ? { headline: `This step does not use “${MOVE_LABEL[r]}.”`, detail: [MOVE_LOOKS[r], moveSpot(s), `So it uses “${MOVE_LABEL[m]}.”`], example: leftCase(s) }
      : {
          headline: r === near ? `This step only looks like “${MOVE_LABEL[r]}.”` : `This step does not use “${MOVE_LABEL[r]}.”`,
          detail: [MOVE_LOOKS[r], moveSpot(s), `A case breaks it: ${worldText(s, brk!)} Every given is true there, but the claim is false.`],
          example: breakCase(s),
        };
  }
  if (rule) feedback.none = { headline: 'This step does follow, so it uses a rule.', detail: ['In every case where the givens are true, the claim is true too.', moveSpot(s), `It is “${MOVE_LABEL[m]}.”`], example: leftCase(s) };
  return made('rules', 'rule-name', {
    kind: 'choose',
    prompt: 'Here is one step of a proof. Which rule does it use?',
    scene: stepScene(s),
    choices,
    answer,
    explain: rule
      ? `${moveSpot(s)} So it uses “${MOVE_LABEL[m]}.” No case makes the givens true and the claim false.`
      : `${moveSpot(s)} It is “${MOVE_LABEL[m]}.” A case breaks it: ${worldText(s, brk!)} So it uses no rule.`,
    feedback,
    hint: 'Here is a small example of another rule. Match the givens and the claim to a shape like it.',
    hintCase: otherRuleCase(m, near),
    teach: rulesTeach(s, 'Each rule has its own shape. Match the givens and the claim to a shape. A look-alike has a case that breaks it.'),
    ...(rule ? {} : { tags: [TRAPS.rules.tag], conflict: true }),
    seconds: PROOF_SECONDS,
  }, [s]);
}

/** The claims a conclude item offers: one about the step's fact (or a rule), its opposite, and nothing for sure. */
export function conclusionChoices(s: RuleStep): { id: string; p: Prop | null }[] {
  const c = s.claim;
  if (c.t === 'if') {
    const [x, y] = [c.a, c.b];
    return [{ id: 'rule', p: ifp(x, y) }, { id: 'flip', p: ifp(y, x) }, { id: 'nots', p: ifp(no(x), no(y)) }, { id: 'nothing', p: null }];
  }
  const i = c.t === 'atom' ? c.i : c.t === 'not' && c.p.t === 'atom' ? c.p.i : -1;
  if (i < 0) throw new Error('conclusionChoices: a claim about one fact');
  return [{ id: 'yes', p: at(i) }, { id: 'no', p: no(at(i)) }, { id: 'nothing', p: null }];
}
export const NOTHING_LABEL = 'Nothing for sure. It could go either way.';

/** From these givens, what may you claim for sure? The rule's claim, or (the trap) nothing: a look-alike's givens. */
export function ruleConcludeItem(rng: Rng, o: RuleOpts): RuleMade {
  const s = randomStep(rng, pickRuleTopic(rng, o.skin, o.avoid), o.move ?? rng.pick(MOVES));
  const m = moveOf(s)!;
  const cands = conclusionChoices(s);
  const valid = cands.filter((c) => c.p && claimFollows(s, c.p));
  if (valid.length > 1) throw new Error('ruleConcludeItem: two claims follow');
  const answer = valid[0]?.id ?? 'nothing';
  const right = valid[0]?.p ?? null;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of cands) {
    if (c.id === answer) continue;
    if (!c.p) {
      feedback.nothing = {
        headline: `Something does follow: “${sayProp(s, right!)}”`,
        detail: ['In every case where the givens are true, that claim is true too.', `That is “${MOVE_LABEL[moveOf({ givens: s.givens, claim: right! })!]}.”`],
        example: leftCase(s, right!),
      };
      continue;
    }
    const w = breakWorld(s, c.p);
    const look = moveOf({ givens: s.givens, claim: c.p });
    feedback[c.id] = {
      headline: `“${sayProp(s, c.p)}” does not follow.`,
      detail: [`Here is a case: ${worldText(s, w)}`, 'Every given is true there, but that claim is false.', ...(look && isLookalike(look) ? [`That claim is “${MOVE_LABEL[look]}.” It only looks like a rule.`] : [])],
      example: worldCase(s, w, c.p),
    };
  }
  const ws = worldsOf(s).filter((w) => givensHold(s, w));
  const ruledOut = worldsOf(s).find((w) => !givensHold(s, w))!;
  return made('rules', 'rule-conclude', {
    kind: 'choose',
    prompt: `Here ${s.givens.length === 1 ? 'is the given' : 'are the givens'}. What may you claim for sure?`,
    scene: { kind: 'text', lines: givenLines(s) },
    choices: shuffled(rng, cands.map((c) => ({ id: c.id, label: c.p ? sayProp(s, c.p) : NOTHING_LABEL }))),
    answer,
    explain: right
      ? `In every case where the givens are true, ${clause(s, right)}. That is “${MOVE_LABEL[moveOf({ givens: s.givens, claim: right })!]}.”`
      : `The givens fit more than one case: ${ws.map((w) => worldText(s, w)).join(' ')} So nothing more follows for sure. Claiming “${sayProp(s, s.claim)}” would be “${MOVE_LABEL[m]}.”`,
    feedback,
    hint: 'Here is one case, checked. List every case where the givens are true. What is true in all of them?',
    hintCase: worldCase(s, ruledOut, null),
    teach: rulesTeach(s, 'A claim follows when it is true in every case where the givens are true. If the givens allow both ways, nothing follows.', null),
    ...(right ? {} : { tags: [TRAPS.rules.tag], conflict: true }),
    seconds: PROOF_SECONDS,
  }, [s]);
}

const shuffled = (rng: Rng, xs: Choice[]) => rng.shuffle(xs);

/** The trap, and a conflict item: four steps, three use a rule, one only looks like one. Which one uses no rule? */
export function ruleTrapItem(rng: Rng, o: RuleOpts & { trick?: LookalikeId }): RuleMade {
  const topic = pickRuleTopic(rng, o.skin, o.avoid);
  const trick = o.trick ?? rng.pick(LOOKALIKES);
  const rules = rng.shuffle(RULES).slice(0, 3);
  const steps = rng.shuffle<MoveId>([trick, ...rules]).map((m) => randomStep(rng, topic, m));
  const bad = steps.map((s, k) => (isRule(s) ? -1 : k)).filter((k) => k >= 0);
  if (bad.length !== 1) throw new Error('ruleTrapItem: exactly one step must break');
  const k = bad[0];
  const t = steps[k];
  const brk = breakWorld(t);
  const feedback: Record<string, ChoiceFeedback> = {};
  steps.forEach((s, i) => {
    if (i === k) return;
    feedback[`s${i + 1}`] = {
      headline: `Step ${i + 1} follows. It uses “${MOVE_LABEL[moveOf(s)!]}.”`,
      detail: [moveSpot(s), `Look again at step ${k + 1}. Can its givens be true and its claim false?`],
      example: stepCase(s),
    };
  });
  const firstRule = steps.findIndex((s) => isRule(s));
  return made('rules', 'rule-trap', {
    kind: 'choose',
    prompt: 'Here are four steps. Three use a rule. Which step uses no rule?',
    scene: { kind: 'text', lines: steps.map((s, i) => `Step ${i + 1}: ${stepLine(s)}`) },
    choices: steps.map((_, i) => ({ id: `s${i + 1}`, label: `Step ${i + 1}` })),
    answer: `s${k + 1}`,
    explain: `Step ${k + 1} is “${MOVE_LABEL[trick]}.” ${moveSpot(t)} A case breaks it: ${worldText(t, brk)} So it uses no rule.`,
    feedback,
    hint: 'Here is one step, checked. For each step, ask: can the givens be true and the claim false?',
    hintCase: stepCase(steps[firstRule]),
    teach: rulesTeach(t, 'A look-alike sounds like a rule. But a case makes its givens true and its claim false, so it uses no rule.'),
    tags: [TRAPS.rules.tag],
    conflict: true,
    seconds: PROOF_SECONDS,
  }, steps);
}

/** The closing why item for this lesson: why may a proof use a named rule? */
export function ruleWhyItem(rng: Rng, o: { skin?: ProofSkin } = {}): RuleMade {
  const skin = o.skin ?? rng.pick(['everyday', 'fantasy', 'abstract'] as const);
  const s = randomStep(rng, pickRuleTopic(rng, skin), rng.pick(RULES));
  const m = moveOf(s)!;
  const flip = RULE_EXAMPLES.ac;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `This step uses “${MOVE_LABEL[m]}.” Why may a proof use it?`,
    scene: stepScene(s),
    choices: shuffled(rng, [
      { id: 'every', label: 'Because in every case where the givens are true, the claim is true too.' },
      { id: 'sounds', label: 'Because the claim sounds right.' },
      { id: 'once', label: 'Because the claim was true in one case.' },
      { id: 'words', label: 'Because the claim uses the same words as the givens.' },
    ]),
    answer: 'every',
    explain: 'List every case where the givens are true. The claim is true in each one. So the step always works, and a proof may use it.',
    feedback: {
      sounds: { headline: 'Sounding right is not the reason.', detail: [`A look-alike can sound right too: “${stepLine(flip)}”`, 'This step is a rule because no case makes its givens true and its claim false.'], example: leftCase(s) },
      once: { headline: 'One case is not enough.', detail: ['A step must work in every case where its givens are true.', 'This one does, so a proof may use it.'], example: leftCase(s) },
      words: { headline: 'Using the same words is not the reason.', detail: [`The flip trick uses the same words too: “${stepLine(flip)}” It is no rule.`, 'What matters is that no case makes the givens true and the claim false.'], example: breakCase(flip) },
    },
    hint: 'Here is one case, checked. What must be true of every case like it?',
    hintCase: leftCase(s),
    teach: rulesTeach(s, 'A rule may be used in a proof because it always works: whenever its givens are true, its claim is true too.'),
    tags: [WHY_TAG],
    seconds: PROOF_SECONDS,
  };
  return made('why', 'why', item, [s]);
}

// =====================================================================================================================
// Cards and boards (See -> Do)
// =====================================================================================================================

/** A rule and its look-alike: the same rule, the same words, but only one of them follows. */
export const RULE_VS_LOOKALIKE: Distinction = {
  id: 'rule-vs-lookalike',
  a: 'A rule: whenever its givens are true, its claim is true too.',
  b: 'A look-alike: it sounds like a rule, but a case makes its givens true and its claim false.',
};
/** Where the lesson's cards sit: the contrast, then the worked example. */
export const L6_CARDS = { contrast: 5, example: 6 } as const;

const NUM = ruleTopic('number');
/** The contrast's two steps: the same rule (if the number is 8, it is even); NOT the THEN part, or NOT the IF part. */
export const CONTRAST_STEPS = { rule: makeStep(NUM, 'mt'), look: makeStep(NUM, 'da') } as const;

export function rulesContrast(): Extract<Scene, { kind: 'contrast' }> {
  const panel = (s: RuleStep): ContrastPanel => {
    const ok = isRule(s);
    const m = moveOf(s)!;
    return {
      world: s.givens.map((g) => sayProp(s, g)).join(' '),
      who: 'The step',
      says: sayClaim(s, s.claim),
      truth: ok,
      because: ok
        ? `Only one case makes both givens true: ${worldText(s, leftWorld(s))} The claim is true there.`
        : `A case makes both givens true: ${worldText(s, breakWorld(s))} The claim is false there.`,
      then: ok ? `So it is a rule: “${MOVE_LABEL[m]}.”` : `So it is no rule. It is “${MOVE_LABEL[m]}.”`,
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(CONTRAST_STEPS.rule), panel(CONTRAST_STEPS.look)],
    ask: { q: 'Both steps sound right. Which one is a rule?', a: `Only the first. A case breaks the second: ${worldText(CONTRAST_STEPS.look, breakWorld(CONTRAST_STEPS.look))}` },
    words: { worldTag: 'Givens', saysWord: 'claims:', truth: 'A rule', untruth: 'No rule' },
  };
}

const RL_CLOSING = 'Those two ideas are apart now. Back to the board: for each step, look for a case with the givens true and the claim false.';
const SOUNDS_AS_RULE = `You may be treating “sounds right” and “is a rule” as the same thing. They are two different things. A step is a rule only when no case makes its givens true and its claim false. Try this case: ${worldText(CONTRAST_STEPS.look, breakWorld(CONTRAST_STEPS.look))}`;
export const RULE_Q: ConfusedQuestion = {
  q: 'A step sounds right. Does that make it a rule?',
  options: [{ label: 'No. It is a rule only if no case breaks it', right: true }, { label: 'Yes. A step that sounds right is a rule' }, { label: 'Not sure' }],
  teach: 'No. A look-alike sounds right too. A rule works in every case where its givens are true. A look-alike has a case where its givens are true and its claim is false.',
};
const RULE_OPTIONS = [{ id: 'rule', label: 'A rule' }, { id: 'none', label: 'No rule' }];

/** Do, right after the contrast: four steps from the same rule. Can a case break each one? Is it a rule? */
export function rulesLookBoard(): DrillStep {
  const steps = (['mp', 'da', 'mt', 'ac'] as MoveId[]).map((m) => makeStep(NUM, m));
  const rows: DrillRow[] = steps.map((s, k) => {
    const id = `r${k + 1}`;
    const ok = isRule(s);
    const m = moveOf(s)!;
    const brk = ok ? null : breakWorld(s);
    return {
      id,
      label: stepLine(s),
      marks: [
        {
          id: `${id}-break`,
          label: 'Can the givens be true and the claim false?',
          options: [...YES_NO],
          answer: ok ? 'no' : 'yes',
          why: ok ? whyFor('yes', `No case does that. When the givens are true, the case is this: ${worldText(s, leftWorld(s))} The claim is true there.`) : whyFor('no', `Here is one: ${worldText(s, brk!)} The givens are true there, and the claim is false.`),
          compare: { says: sayClaim(s, s.claim), world: s.givens.map((g) => sayProp(s, g)).join(' ') },
        },
        {
          id: `${id}-rule`,
          label: 'So, is it a rule?',
          options: RULE_OPTIONS,
          answer: ok ? 'rule' : 'none',
          why: ok ? whyFor('none', `It is a rule: “${MOVE_LABEL[m]}.” No case breaks it.`) : whyFor('rule', `It only looks like a rule. It is “${MOVE_LABEL[m]}.”`),
        },
      ],
    };
  });
  const misconceptions: Misconception[] = steps.flatMap((s, k) => (isRule(s) ? [] : [{ id: 'sounds-as-rule', when: 'picks' as const, picks: { [`r${k + 1}-rule`]: 'rule' }, text: SOUNDS_AS_RULE }]));
  return {
    id: 's11.l6-do-look',
    title: 'A rule or a look-alike?',
    body: ['Each step starts from the same rule. Look for a case with the givens true and the claim false.', 'Then: is the step a rule?'],
    scene: rulesContrast(),
    afterCard: L6_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { says: 'Claim', world: 'Givens', so: 'So', ask: 'Can the givens be true and the claim false?', closing: RL_CLOSING },
    misconceptions,
    confused: [RULE_Q],
    distinction: RULE_VS_LOOKALIKE.id,
    done: 'Right. Two steps follow, so they are rules. The other two only sound right: a case breaks each one.',
  };
}

/** The worked example: “The THEN part did not happen” about the rain, every case listed and marked. */
export const WORKED_RULE = RULE_EXAMPLES.mt;
/** Its twin for the board: the same rule, but given 2 says the IF part did not happen (the NOT trick). */
export const RULE_TWIN = RULE_EXAMPLES.da;

/** The step with every case as a box: crossed out where a given is false, else the claim true or false there. */
export function ruleCasesScene(s: RuleStep, o: { blank?: boolean; caption?: string } = {}): Extract<Scene, { kind: 'argument' }> {
  return {
    kind: 'argument',
    givens: s.givens.map((g) => sayProp(s, g)),
    claim: sayProp(s, s.claim),
    cases: worldsOf(s).map((w, i) => {
      const bad = s.givens.findIndex((g) => !holds(g, w));
      return { name: `Case ${i + 1}`, facts: worldFacts(s, w), ...(o.blank ? {} : bad >= 0 ? { out: bad + 1 } : { claim: holds(s.claim, w) }) };
    }),
    ...(o.caption ? { caption: o.caption } : {}),
  };
}
export const ruleWorkedScene = (): Scene =>
  ruleCasesScene(WORKED_RULE, { caption: `Only one case is left, and the claim is true there. So the step follows. It is “${MOVE_LABEL.mt}.”` });

/** Do, right after the example: the twin (the NOT trick). Does a given rule each case out? Is the claim true there? */
export function ruleCasesBoard(): DrillStep {
  const s = RULE_TWIN;
  const rows: DrillRow[] = worldsOf(s).map((w, i) => {
    const id = `c${i + 1}`;
    const bad = s.givens.findIndex((g) => !holds(g, w));
    const marks: DrillMark[] = [
      { id: `${id}-out`, label: 'Does a given rule it out?', options: [...YES_NO], answer: bad >= 0 ? 'yes' : 'no', why: bad >= 0 ? whyFor('no', givenFalse(s, bad, w)) : whyFor('yes', 'Both givens are true here.') },
    ];
    if (bad < 0) {
      const c = holds(s.claim, w);
      marks.push({ id: `${id}-claim`, label: 'Is the claim true here?', options: [...YES_NO], answer: c ? 'yes' : 'no', why: { [c ? 'no' : 'yes']: `The claim says “${sayProp(s, s.claim)}” In this case, ${factIn(s, s.claim, w)}. So the claim is ${c ? 'true' : 'false'} here.` } });
    }
    return { id, label: `Case ${i + 1}: ${worldText(s, w)}`, marks };
  });
  const ok = isRule(s);
  const m = moveOf(s)!;
  rows.push({
    id: 'follows',
    label: `The claim: “${sayProp(s, s.claim)}”`,
    marks: [{ id: 'follows', label: 'Does it follow?', options: [...YES_NO], answer: ok ? 'yes' : 'no', why: ok ? whyFor('no', 'It is true in every case left.') : whyFor('yes', `No. One case left has the claim false: ${worldText(s, breakWorld(s))}`) }],
  });
  const names: MoveId[] = ['mt', 'da', 'mp'];
  rows.push({
    id: 'name',
    label: 'The step',
    marks: [{ id: 'name', label: 'Which move is it?', options: names.map((n) => ({ id: n, label: MOVE_LABEL[n] })), answer: m, why: Object.fromEntries(names.filter((n) => n !== m).map((n) => [n, `${MOVE_LOOKS[n]} ${moveSpot(s)}`])) }],
  });
  return {
    id: 's11.l6-do-cases',
    title: 'Check every case',
    body: ['The same rule, with a new given 2.', 'For each case, does a given rule it out? If not, is the claim true there?', 'Then: does the claim follow? Which move is it?'],
    scene: ruleCasesScene(s, { blank: true }),
    twin: 'The same rule. Now given 2 says it does not rain.',
    afterCard: L6_CARDS.example,
    rows,
    done: `Right. Two cases are left, and the claim is false in one: ${worldText(s, breakWorld(s))} It is the NOT trick, not a rule.`,
  };
}

/** Do: five steps, one for each rule, in another story. Which rule does each step use? */
export function ruleNameBoard(): DrillStep {
  const topic = ruleTopic('wand');
  const order: RuleId[] = ['chain', 'mp', 'contra', 'ds', 'mt'];
  const steps = order.map((m, k) => makeStep(topic, m, { link: (k % 2) as 0 | 1, deny: 1 }));
  const options = [...RULES.map((r) => ({ id: r, label: MOVE_LABEL[r] })), { id: 'none', label: 'No rule' }];
  const rows: DrillRow[] = steps.map((s, k) => {
    const m = moveOf(s)!;
    const why: Record<string, string> = {};
    for (const op of options) if (op.id !== m) why[op.id] = op.id === 'none' ? `It is a rule. ${moveSpot(s)}` : `${MOVE_LOOKS[op.id as RuleId]} ${moveSpot(s)}`;
    return { id: `n${k + 1}`, label: `Step ${k + 1}: ${stepLine(s)}`, marks: [{ id: `n${k + 1}-rule`, label: 'Which rule?', options, answer: m, why }] };
  });
  return {
    id: 's11.l6-do-name',
    title: 'Name the rule',
    body: ['Here are five steps about a magic wand. Each one uses a rule.', 'Pick the rule each step uses.'],
    scene: { kind: 'text', lines: steps.map((s, k) => `Step ${k + 1}: ${stepLine(s)}`) },
    twin: 'New steps, one for each rule.',
    rows,
    done: 'Right. Each rule has its own shape: match the givens and the claim to it.',
  };
}
