/**
 * Stop 12 · Proof (id s11): the key-idea cards' pictures, the contrast pictures and the guided boards (See -> Do).
 * Every worked example is a fixed model from ./proofs.ts, and every mark on every board is computed from it: a chain
 * step follows when no line makes what it uses true and it false (follows), a case is left when no given rules it out
 * (casesLeft), a guess crashes when no case with it fits the rule (solutions), a card breaks a claim when the claim is
 * about it and fails for it (cardRole). Nothing here is hand-marked.
 *
 * Distinctions (docs/CONTENT_GUIDE.md, "Distinctions"):
 *  - a step that is true vs a step that follows (l2, taught; l3 reminds);
 *  - a case the givens rule out vs a case the proof leaves out (l3);
 *  - a guess that crashes vs a guess that holds up (l4);
 *  - a case that fits an every claim vs a case that breaks it (l5).
 */
import { YES_NO } from '../drill';
import { claimTrue } from '../grade';
import { a as aKind, allKinds, breakers, claimSays, explainSolve, flip, kindsText, PUZZLE_RULE, solutions, speakersScene, type Claims, type KindMap, type Namer } from './knights';
import {
  cardName,
  cardRole,
  caseClaim,
  caseGivens,
  caseHolds,
  caseScene,
  casesLeft,
  caseTopic,
  caseWhy,
  chainLines,
  chainParts,
  claimWords,
  CARD_SKINS,
  follows,
  joinAnd,
  leftOut,
  METHODS,
  methodSpot,
  ORDER_SKINS,
  propNot,
  propWord,
  ruledBy,
  sourceSets,
  stepFollows,
  stmtText,
  usesLabel,
  usesText,
  whyFollows,
  whyNot,
  type CaseProof,
  type CaseRole,
  type ChainProof,
  type CounterCase,
  type CrashCase,
  type EveryClaim,
  type Kind,
  type Method,
  type OStmt,
  type Reasoning,
  type Src,
} from './proofs';
import type { ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillRow, DrillStep, Misconception, Scene, Thing } from '../types';

const { B, D, G, S, DEF } = chainParts;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const yn = (v: boolean) => (v ? 'yes' : 'no');
const FOLLOW_OPTIONS = [{ id: 'follows', label: 'Follows' }, { id: 'not', label: 'Does not follow' }];

// =====================================================================================================================
// The worked models (fixed, so a card and its board always show the same thing)
// =====================================================================================================================

const RACE = ORDER_SKINS.race;

/** Lesson 2's worked proof: Ava, Ben, Cal and Dee ran a race, in that order. Every step follows. */
export const WORKED_CHAIN: ChainProof = {
  skin: RACE,
  names: ['Ava', 'Ben', 'Cal', 'Dee'],
  line: ['Ava', 'Ben', 'Cal', 'Dee'],
  givens: [B('Ava', 'Ben'), B('Ben', 'Cal'), B('Cal', 'Dee')],
  claim: D('Ava', 'Dee'),
  steps: [
    { stmt: B('Ava', 'Cal'), uses: [G(0), G(1)] },
    { stmt: B('Ava', 'Dee'), uses: [S(0), G(2)] },
    { stmt: D('Ava', 'Dee'), uses: [S(1), DEF] },
  ],
};
/** Board 2's twin: step 2 uses given 1 instead of given 3, so it no longer follows. */
export const CHAIN_TWIN: ChainProof = { ...WORKED_CHAIN, steps: WORKED_CHAIN.steps.map((s, k) => (k === 1 ? { ...s, uses: [S(0), G(0)] } : s)) };

/** Lesson 1's chain: three names, two givens, the chain step and the definition step. */
export const SHORT_CHAIN: ChainProof = {
  skin: RACE,
  names: ['Ava', 'Ben', 'Cal'],
  line: ['Ava', 'Ben', 'Cal'],
  givens: [B('Ava', 'Ben'), B('Ben', 'Cal')],
  claim: D('Ava', 'Cal'),
  steps: [{ stmt: B('Ava', 'Cal'), uses: [G(0), G(1)] }, { stmt: D('Ava', 'Cal'), uses: [S(0), DEF] }],
};
/** The board's chain (Lesson 1): cousins Uma, Raj and Tia. */
const BOARD_CHAIN: ChainProof = {
  skin: ORDER_SKINS.born,
  names: ['Uma', 'Raj', 'Tia'],
  line: ['Uma', 'Raj', 'Tia'],
  givens: [B('Uma', 'Raj'), B('Raj', 'Tia')],
  claim: D('Uma', 'Tia'),
  steps: [{ stmt: B('Uma', 'Tia'), uses: [G(0), G(1)] }, { stmt: D('Uma', 'Tia'), uses: [S(0), DEF] }],
};

const optsOf = (topic: string, ids: readonly string[]) => caseTopic(topic).options.filter((o) => ids.includes(o.id));
function caseProof(topic: string, who: string, prop: string, opts: string[], ruled: string[], covered: string[]): CaseProof {
  const t = caseTopic(topic);
  return { topic: t, who, prop: t.props.find((p) => p.id === prop)!, opts: optsOf(topic, opts), ruled: optsOf(topic, ruled), covered: optsOf(topic, covered) };
}
/** Lesson 3's worked proof: Leo’s pet is a cat, a dog or a fish; not a fish; so it has fur. */
export const WORKED_CASES = caseProof('pets', 'Leo', 'fur', ['cat', 'dog', 'fish'], ['fish'], ['cat', 'dog']);
/** The contrast's second panel: the same proof, but nothing rules out the fish. */
export const CASES_NO_RULE = caseProof('pets', 'Leo', 'fur', ['cat', 'dog', 'fish'], [], ['cat', 'dog']);
/** Board 2's twin: given 2 rules out the dog instead, so the fish is left (and a fish has no fur). */
export const CASES_TWIN = caseProof('pets', 'Leo', 'fur', ['cat', 'dog', 'fish'], ['dog'], ['cat', 'fish']);
/** Board 1: a number card, 2, 4, 5 or 8, not 5. The proof checks 2 and 4 and leaves out 8. */
export const CASES_BOARD = caseProof('numbers', 'the card', 'even', ['n2', 'n4', 'n5', 'n8'], ['n5'], ['n2', 'n4']);
/** Lesson 1's board: the number is 3, 5 or 7, so it is odd. */
const ODD_CASES = caseProof('numbers', 'the card', 'odd', ['n3', 'n5', 'n7'], [], ['n3', 'n5', 'n7']);

/** A fixed knights puzzle, with the guess its explanation makes (explainSolve) and the world where it crashes. */
function knightsCase(names: [string, string], claims: (ids: string[]) => Claims, setting: string): CrashCase {
  const ids = names.map((n) => n.toLowerCase());
  const nm: Namer = (id) => names[ids.indexOf(id)] ?? id;
  const cl = claims(ids);
  const sols = solutions(ids, cl);
  const sv = explainSolve(ids, cl, sols[0], nm)!;
  const g = sv.guesses[0];
  const end = sv.lines.findIndex((l) => l.startsWith('That guess crashes'));
  const world = g.world as KindMap;
  return { skin: 'island', ids, nm, setting, claims: cl, sols, who: g.who, kind: g.kind, lines: sv.lines.slice(1, end), world, breakers: breakers(ids, cl, world) };
}
/** Lesson 4's worked puzzle: Ava says “Ben is a knave.” Ben says “Ava and I are the same kind.” */
export const WORKED_KNIGHTS = knightsCase(['Ava', 'Ben'], ([a, b]) => ({ [a]: { t: 'is', who: b, kind: 'knave' }, [b]: { t: 'same', a: b, b: a } }), 'Ava and Ben live on Riddle Island.');
/** Lesson 1's board puzzle: A says “B is a knight.” B says “A and I are different kinds.” */
const BOARD_KNIGHTS = knightsCase(['A', 'B'], ([a, b]) => ({ [a]: { t: 'is', who: b, kind: 'knight' }, [b]: { t: 'diff', a: b, b: a } }), 'A and B are islanders.');

const card = (id: string, size: Thing['size'], color: Thing['color'], shape: Thing['shape']): Thing => ({ id, size, color, shape });
/** Lesson 5's worked claim and cards: every red card in the deck is a circle. */
export const WORKED_CLAIM: EveryClaim = { group: { dim: 'color', val: 'red' }, prop: { dim: 'shape', val: 'circle' } };
export const WORKED_COUNTER: CounterCase = {
  skin: CARD_SKINS.abstract,
  claim: WORKED_CLAIM,
  cards: [card('t1', 'small', 'red', 'circle'), card('t2', 'big', 'red', 'square'), card('t3', 'small', 'blue', 'triangle'), card('t4', 'big', 'red', 'circle')],
};
/** Board 2's twin: the same cards, a new claim: every big card is a square. */
export const COUNTER_TWIN: CounterCase = { ...WORKED_COUNTER, claim: { group: { dim: 'size', val: 'big' }, prop: { dim: 'shape', val: 'square' } } };
/** Board 1: cards that fit or say nothing. None breaks the claim, and still they do not prove it. */
export const COUNTER_BOARD: CounterCase = {
  skin: CARD_SKINS.abstract,
  claim: WORKED_CLAIM,
  cards: [card('b1', 'small', 'red', 'circle'), card('b2', 'big', 'blue', 'square'), card('b3', 'big', 'red', 'circle'), card('b4', 'small', 'yellow', 'triangle')],
};

// =====================================================================================================================
// Lesson 1 · Four ways to prove
// =====================================================================================================================

/** The short reasonings of the board, one for each way (and the examples trap), from fixed models. */
function boardReasonings(): { r: Reasoning; text: string }[] {
  const chain: Reasoning = { method: 'chain', chain: BOARD_CHAIN, lines: [] };
  const cases: Reasoning = { method: 'cases', cases: ODD_CASES, lines: [] };
  const crash: Reasoning = { method: 'crash', crash: BOARD_KNIGHTS, lines: [] };
  const brk: CounterCase = { skin: CARD_SKINS.everyday, claim: { group: { dim: 'size', val: 'big' }, prop: { dim: 'color', val: 'blue' } }, cards: [card('c1', 'big', 'red', 'triangle')] };
  const fits: CounterCase = { skin: CARD_SKINS.fantasy, claim: { group: { dim: 'size', val: 'small' }, prop: { dim: 'color', val: 'red' } }, cards: [card('c1', 'small', 'red', 'circle'), card('c2', 'small', 'red', 'square')] };
  const counter: Reasoning = { method: 'counter', counter: brk, lines: [] };
  const examples: Reasoning = { method: 'examples', counter: fits, lines: [] };
  const k = BOARD_KNIGHTS;
  const X = k.nm(k.who);
  return [
    { r: chain, text: `${stmtText(BOARD_CHAIN, BOARD_CHAIN.givens[0])} ${stmtText(BOARD_CHAIN, BOARD_CHAIN.givens[1])} So ${stmtText(BOARD_CHAIN, BOARD_CHAIN.steps[0].stmt)} So ${stmtText(BOARD_CHAIN, BOARD_CHAIN.claim)}` },
    { r: cases, text: `${caseGivens(ODD_CASES)[0]} ${ODD_CASES.covered.map((o, i) => `Case ${i + 1}: ${caseWhy(ODD_CASES, o)}`).join(' ')} So the number is odd.` },
    { r: crash, text: `Suppose ${X} is ${aKind(k.kind)}. Then ${k.nm(k.breakers[0])}’s words break the rule. So ${X} is ${aKind(flip(k.kind))}.` },
    { r: counter, text: `Claim: ${claimWords(brk.claim, brk.skin)} Mia finds ${cardName(brk.cards[0])}. It is big, but it is ${propNot(brk.claim.prop)}. So the claim is false.` },
    { r: examples, text: `Claim: ${claimWords(fits.claim, fits.skin)} Zed finds ${joinAnd(fits.cards.map(cardName))}. Each one is small and red. So the claim is true.` },
  ];
}

const WAY_SHORT: Readonly<Record<Method, string>> = { chain: 'Chain', cases: 'Cases', crash: 'Crash', counter: 'Counterexample', examples: 'Only examples' };
const WAY_NAME: Readonly<Record<Method, string>> = { chain: 'a chain', cases: 'a proof by cases', crash: 'suppose and crash', counter: 'one counterexample', examples: 'only examples' };

/** The cards' small worked reasonings, one per way. */
export const L1_SCENES = {
  chain: (): Scene => ({ kind: 'text', lines: chainLines(SHORT_CHAIN) }),
  cases: (): Scene => caseScene(WORKED_CASES),
  crash: (): Scene => speakersScene(WORKED_KNIGHTS.ids, WORKED_KNIGHTS.claims, WORKED_KNIGHTS.nm, { rule: PUZZLE_RULE, test: `${WORKED_KNIGHTS.nm(WORKED_KNIGHTS.who)} is ${aKind(WORKED_KNIGHTS.kind)}.` }),
  counter: (): Scene => ({ kind: 'things', things: WORKED_COUNTER.cards.filter((t) => cardRole(WORKED_CLAIM, t) === 'break') }),
};

/** The crash in a few words: “Suppose Ava is a knave. Then Ben must be a knight. But then Ben’s words break the rule.” */
export function crashWords(k: CrashCase): string[] {
  const X = k.nm(k.who);
  const others = k.ids.filter((id) => id !== k.who);
  return [
    `Suppose ${X} is ${aKind(k.kind)}.`,
    `Then ${others.map((id) => `${k.nm(id)} must be ${aKind(k.world[id])}`).join(', and ')}.`,
    `But then ${k.nm(k.breakers[0])}’s words break the rule. The guess crashes.`,
    `So ${X} is ${aKind(flip(k.kind))}.`,
  ];
}

/** The break in the counterexample card: one card that is in the group and fails the claim. */
export const L1_COUNTER = (): string => {
  const t = WORKED_COUNTER.cards.find((x) => cardRole(WORKED_CLAIM, x) === 'break')!;
  return `${cap(cardName(t))} is red, but it is ${propNot(WORKED_CLAIM.prop)}.`;
};

/** Do: name the way each short reasoning uses (and spot the one that only gives examples). */
export function methodBoard(): DrillStep {
  const rows: DrillRow[] = boardReasonings().map(({ r, text }, k) => {
    const id = `r${k + 1}`;
    const why: Record<string, string> = {};
    for (const m of METHODS) {
      if (m === r.method) continue;
      why[m] = `${m === 'examples' ? 'It is a proof, not a list of examples.' : r.method === 'examples' ? 'It is not a proof at all.' : `It is not ${WAY_NAME[m]}.`} ${methodSpot(r)}`;
    }
    const mark: DrillMark = { id: `${id}-way`, label: 'Which way?', options: METHODS.map((m) => ({ id: m, label: WAY_SHORT[m] })), answer: r.method, why };
    return { id, label: text, marks: [mark] };
  });
  return {
    id: 's11.l1-do',
    title: 'Name the way',
    body: ['Here are five short reasonings. Read each one.', 'Pick the way it uses: a chain, cases, a crash, or a counterexample. One only gives examples.'],
    rows,
    done: 'Right. Each way has its own shape. Examples alone are never a proof.',
  };
}

// =====================================================================================================================
// Lesson 2 · Every step cites (a step that is true vs a step that follows)
// =====================================================================================================================

export const STEP_TRUE_VS_FOLLOWS: Distinction = {
  id: 'step-true-vs-follows',
  a: 'A step is true: it really happened.',
  b: 'A step follows: what it uses forces it.',
};

/** Where the lesson's cards sit: the contrast, then the worked proof. Boards open after them. */
export const L2_CARDS = { contrast: 2, example: 3 } as const;

/** The contrast: the same true step, once using what forces it and once using nothing. */
export function citeContrast(): Extract<Scene, { kind: 'contrast' }> {
  const p = WORKED_CHAIN;
  const st = p.steps[1];
  const panel = (uses: Src[]): ContrastPanel => {
    const f = follows(p, st.stmt, uses);
    return {
      world: usesText(uses),
      who: 'Step 2',
      says: stmtText(p, st.stmt),
      truth: f,
      because: f ? whyFollows(p, st.stmt, uses) : whyNot(p, st.stmt, uses, 'This step').join(' '),
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(st.uses), panel([])],
    ask: { q: 'The step is true in both. Does it follow in both?', a: 'No. Only the first uses facts that force it. True is not the same as follows.' },
    words: { worldTag: 'What it uses', saysWord: 'says:', truth: 'Follows', untruth: 'Does not follow' },
  };
}

const TF_CLOSING = 'Those two ideas are apart now. Back to the board: for each step, ask what it uses, and if those force it.';
const TRUE_AS_FOLLOWS =
  'You may be treating “true” and “follows” as the same thing. They are two different things. A step is true when it really happened. It follows only when what it uses forces it. Ask: if only these were true, must the step be true?';
export const TRUE_FOLLOWS_Q: ConfusedQuestion = {
  q: 'A step is true. Does that mean it follows?',
  options: [{ label: 'No. It follows only if what it uses forces it', right: true }, { label: 'Yes. A true step always follows' }, { label: 'Not sure' }],
  teach: 'No. A step follows when what it uses forces it. A true step that uses nothing does not follow. A proof must show why each step is true.',
};

/** Do, right after the contrast: for each step, is it true in the race, and does it follow from what it uses? */
export function citeTrueBoard(): DrillStep {
  const p = WORKED_CHAIN;
  const rows: { stmt: OStmt; uses: Src[] }[] = [
    { stmt: B('Ava', 'Cal'), uses: [G(0), G(1)] },
    { stmt: B('Ava', 'Dee'), uses: [] },
    { stmt: B('Ben', 'Dee'), uses: [G(0), G(2)] },
    { stmt: B('Dee', 'Ben'), uses: [] },
  ];
  const real = p.skin.order(joinAnd(p.line));
  const drill: DrillRow[] = rows.map(({ stmt, uses }, k) => {
    const id = `r${k + 1}`;
    const t = p.line.indexOf(stmt.a) < p.line.indexOf(stmt.b);
    const f = follows(p, stmt, uses);
    return {
      id,
      label: `${stmtText(p, stmt)} ${usesText(uses)}`,
      marks: [
        { id: `${id}-true`, label: 'True in the race?', options: [...YES_NO], answer: yn(t), why: { [yn(!t)]: `${real} So it is ${t ? '' : 'not '}true that ${stmtText(p, stmt).replace(/\.$/, '')}.` } },
        { id: `${id}-follows`, label: 'Follows from what it uses?', options: FOLLOW_OPTIONS, answer: f ? 'follows' : 'not', why: { [f ? 'not' : 'follows']: f ? whyFollows(p, stmt, uses) : whyNot(p, stmt, uses, 'This step').join(' ') }, compare: { says: stmtText(p, stmt), world: usesText(uses) } },
      ],
    };
  });
  const misconceptions: Misconception[] = rows.flatMap(({ stmt, uses }, k) =>
    p.line.indexOf(stmt.a) < p.line.indexOf(stmt.b) && !follows(p, stmt, uses)
      ? [{ id: 'true-as-follows', when: 'picks' as const, picks: { [`r${k + 1}-true`]: 'yes', [`r${k + 1}-follows`]: 'follows' }, text: TRUE_AS_FOLLOWS }]
      : [],
  );
  return {
    id: 's11.l2-do-true',
    title: 'True or follows?',
    body: [real, ...p.givens.map((g, i) => `Given ${i + 1}: ${stmtText(p, g)}`), 'For each step, is it true in the race? Then: does it follow from what it uses?'],
    scene: citeContrast(),
    afterCard: L2_CARDS.contrast,
    rows: drill,
    scaffold: 'full',
    words: { says: 'Step', world: 'What it uses', so: 'So', ask: 'Do these force the step?', closing: TF_CLOSING },
    misconceptions,
    confused: [TRUE_FOLLOWS_Q],
    distinction: STEP_TRUE_VS_FOLLOWS.id,
    done: 'Right. A true step does not always follow. It follows only when what it uses forces it.',
  };
}

/** The worked proof (card 4). */
export const chainWorkedScene = (): Scene => ({ kind: 'text', lines: chainLines(WORKED_CHAIN) });

/** Do, right after the worked proof: the twin (step 2 changed). Does each step follow? Is it a proof? */
export function citeCheckBoard(): DrillStep {
  const p = CHAIN_TWIN;
  const rows: DrillRow[] = p.steps.map((s, k) => {
    const f = stepFollows(p, k);
    return {
      id: `s${k + 1}`,
      label: `Step ${k + 1}: ${stmtText(p, s.stmt)} ${usesText(s.uses)}`,
      marks: [{ id: `s${k + 1}-follows`, label: 'Follows from what it uses?', options: FOLLOW_OPTIONS, answer: f ? 'follows' : 'not', why: { [f ? 'not' : 'follows']: f ? whyFollows(p, s.stmt, s.uses) : whyNot(p, s.stmt, s.uses, `Step ${k + 1}`).join(' ') }, compare: { says: stmtText(p, s.stmt), world: usesText(s.uses) } }],
    };
  });
  const ok = p.steps.every((_, k) => stepFollows(p, k));
  const bad = p.steps.findIndex((_, k) => !stepFollows(p, k));
  rows.push({
    id: 'proof',
    label: 'The whole proof',
    marks: [{ id: 'proof', label: 'Is it a proof?', options: [...YES_NO], answer: yn(ok), why: { [yn(!ok)]: ok ? 'Every step follows, so it is a proof.' : `Step ${bad + 1} does not follow. One step that does not follow breaks the proof.` } }],
  });
  return {
    id: 's11.l2-do-check',
    title: 'Check each step',
    body: ['This is the proof from the example, with one change.', 'For each step, does it follow from what it uses? Then: is it still a proof?'],
    scene: { kind: 'text', lines: chainLines(p) },
    twin: 'Step 2 now uses step 1 and given 1.',
    afterCard: L2_CARDS.example,
    rows,
    words: { says: 'Step', world: 'What it uses', so: 'So', ask: 'Do these force the step?', closing: TF_CLOSING },
    done: 'Right. Step 2 uses given 1, which does not reach Dee. So that step does not follow, and the proof breaks.',
  };
}

/** Do: name what each step of the worked proof uses (its uses hidden). One set of sources forces it; two do not. */
export function citeUsesBoard(): DrillStep {
  const p = WORKED_CHAIN;
  const rows: DrillRow[] = p.steps.map((s, k) => {
    const wrong = sourceSets(p, k).filter((set) => !follows(p, s.stmt, set) && set.some((x) => s.uses.some((u) => JSON.stringify(u) === JSON.stringify(x))));
    const picks = [wrong[0], wrong.find((w) => usesLabel(w) !== usesLabel(wrong[0]))!];
    const why: Record<string, string> = {};
    picks.forEach((w, i) => { why[`w${i + 1}`] = whyNot(p, s.stmt, w, 'That choice').join(' '); });
    // The right set sits in a different place on each row, so it is never just the first button.
    const options = [{ id: 'right', label: usesLabel(s.uses) }, { id: 'w1', label: usesLabel(picks[0]) }, { id: 'w2', label: usesLabel(picks[1]) }];
    const turn = (k + 1) % options.length;
    return {
      id: `u${k + 1}`,
      label: `Step ${k + 1}: ${stmtText(p, s.stmt)}`,
      marks: [{ id: `u${k + 1}-uses`, label: 'What does it use?', options: [...options.slice(turn), ...options.slice(0, turn)], answer: 'right', why }],
    };
  });
  return {
    id: 's11.l2-do-uses',
    title: 'Name what each step uses',
    body: ['The same proof, but what each step uses is hidden.', 'For each step, pick what forces it.'],
    scene: { kind: 'text', lines: [...chainLines(p).slice(0, p.givens.length + 2), ...p.steps.map((s, k) => `Step ${k + 1}: ${stmtText(p, s.stmt)} Uses what?`)] },
    twin: 'What each step uses is hidden.',
    afterCard: L2_CARDS.example,
    rows,
    done: 'Right. Each step names what forces it: givens, earlier steps, or the definition.',
  };
}

// =====================================================================================================================
// Lesson 3 · Cover every case (a case the givens rule out vs a case the proof leaves out)
// =====================================================================================================================

export const RULED_VS_LEFT: Distinction = {
  id: 'ruled-out-vs-left-out',
  a: 'A case a given rules out: it can’t happen, so it needs no check.',
  b: 'A case the proof leaves out: it can happen, so the proof has a gap.',
};
export const L3_CARDS = { contrast: 2, example: 3 } as const;

/** The proof as one line: “Case 1: a cat has fur. Case 2: a dog has fur.” */
const proofLine = (cp: CaseProof) => cp.covered.map((o, i) => `Case ${i + 1}: ${caseWhy(cp, o)}`).join(' ');

export function casesContrast(): Extract<Scene, { kind: 'contrast' }> {
  const panel = (cp: CaseProof): ContrastPanel => {
    const out = leftOut(cp);
    const fish = cp.opts.find((o) => !cp.covered.includes(o))!;
    return {
      world: caseGivens(cp).join(' '),
      who: 'The proof',
      says: proofLine(cp),
      truth: out.length === 0,
      because: out.length === 0
        ? `Given ${ruledBy(cp, fish)} rules out ${fish.name}. So ${joinAnd(cp.covered.map((o) => o.name))} are every case left.`
        : `Nothing rules out ${fish.name}. The proof leaves that case out. ${caseWhy(cp, fish)}`,
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(WORKED_CASES), panel(CASES_NO_RULE)],
    ask: { q: 'The proof is the same. Why does only the first check every case?', a: 'Only the first givens rule out the fish. A case the givens rule out needs no check. A case left out does.' },
    words: { worldTag: 'Givens', saysWord: 'checks:', truth: 'Checks every case', untruth: 'Leaves a case out' },
  };
}

const RL_CLOSING = 'Those two ideas are apart now. Back to the board: cross out what the givens rule out, then check every case left.';
const RULED_AS_LEFT = 'You may be treating a case the givens rule out and a case the proof leaves out as the same thing. A case a given rules out can’t happen, so it needs no check. A case left out can still happen.';
const LEFT_AS_DONE = 'You may be treating the cases the proof checks as every case. They are two different things. List every case given 1 names. Cross out the ones a given rules out. Is each case left checked?';
export const RULED_LEFT_Q: ConfusedQuestion = {
  q: 'A given rules a case out. Must the proof check that case?',
  options: [{ label: 'No. It can’t happen, so it needs no check', right: true }, { label: 'Yes. Every case given 1 names needs a check' }, { label: 'Not sure' }],
  teach: 'No. A case the givens rule out can’t happen. A case the proof just leaves out still can. Only that one is a gap.',
};

/** Do, right after the contrast: for each case of a number card, do the givens leave it, and does the proof check it? */
export function casesLeftBoard(): DrillStep {
  const cp = CASES_BOARD;
  const left = casesLeft(cp);
  const rows: DrillRow[] = cp.opts.map((o) => {
    const isLeft = left.includes(o);
    const checked = cp.covered.includes(o);
    return {
      id: o.id,
      label: cp.topic.is(cp.who, o),
      marks: [
        { id: `${o.id}-left`, label: 'Do the givens leave it?', options: [...YES_NO], answer: yn(isLeft), why: { [yn(!isLeft)]: isLeft ? `Given 1 names ${o.name}, and no given rules it out.` : `Given ${ruledBy(cp, o)} rules out ${o.name}.` } },
        { id: `${o.id}-checked`, label: 'Does the proof check it?', options: [...YES_NO], answer: yn(checked), why: { [yn(!checked)]: checked ? `Case ${cp.covered.indexOf(o) + 1} checks ${o.name}.` : `No box checks ${o.name}.` } },
      ],
    };
  });
  const all = leftOut(cp).length === 0;
  const gap = leftOut(cp)[0];
  rows.push({
    id: 'all',
    label: 'The whole proof',
    marks: [{ id: 'all', label: 'Does it check every case left?', options: [...YES_NO], answer: yn(all), why: { [yn(!all)]: all ? 'Every case left is checked.' : `No. The givens leave ${gap.name}, and the proof never checks it.` } }],
  });
  const ruled = cp.ruled[0];
  const misconceptions: Misconception[] = [
    { id: 'ruled-as-left', when: 'picks', picks: { [`${ruled.id}-left`]: 'yes' }, text: RULED_AS_LEFT },
    ...(all ? [] : [{ id: 'left-as-done', when: 'picks' as const, picks: { all: 'yes' }, text: LEFT_AS_DONE }]),
  ];
  return {
    id: 's11.l3-do-left',
    title: 'Ruled out or left out?',
    body: [`The claim: “${caseClaim(cp)}”`, 'For each case, do the givens leave it? Does the proof check it?', 'Then: does the proof check every case left?'],
    scene: caseScene(cp),
    twin: 'A new proof, about a number card.',
    afterCard: L3_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { closing: RL_CLOSING },
    misconceptions,
    confused: [RULED_LEFT_Q],
    distinction: RULED_VS_LEFT.id,
    done: `Right. Given ${ruledBy(cp, ruled)} rules out ${ruled.name}, so it needs no check. But ${gap.name} is left, and the proof never checks it.`,
  };
}

/** The worked example: every case of Leo’s pet, marked. */
export function casesWorkedScene(): Scene {
  const cp = WORKED_CASES;
  return caseScene(cp, { all: true, caption: `Given ${ruledBy(cp, cp.ruled[0])} rules out ${cp.ruled[0].name}, so it is crossed out. The claim is true in every case left. So it is proved.` });
}

/** Do, right after the example: the twin (given 2 rules out the dog). Can each case happen? Is the claim true there? */
export function casesTwinBoard(): DrillStep {
  const cp = CASES_TWIN;
  const left = casesLeft(cp);
  const rows: DrillRow[] = cp.opts.map((o) => {
    const can = left.includes(o);
    const marks: DrillMark[] = [{ id: `${o.id}-can`, label: 'Can it happen?', options: [...YES_NO], answer: yn(can), why: { [yn(!can)]: can ? 'No given rules it out.' : `Given ${ruledBy(cp, o)} rules out ${o.name}.` } }];
    if (can) {
      const h = caseHolds(cp, o);
      marks.push({ id: `${o.id}-claim`, label: 'Is the claim true here?', options: [...YES_NO], answer: yn(h), why: { [yn(!h)]: caseWhy(cp, o) } });
    }
    return { id: o.id, label: cp.topic.is(cp.who, o), marks };
  });
  const proved = left.every((o) => caseHolds(cp, o));
  const breaker = left.find((o) => !caseHolds(cp, o));
  rows.push({
    id: 'proved',
    label: `The claim: “${caseClaim(cp)}”`,
    marks: [{ id: 'proved', label: 'Is the claim proved?', options: [...YES_NO], answer: yn(proved), why: { [yn(!proved)]: proved ? 'It is true in every case left.' : `No. ${breaker ? caseWhy(cp, breaker) : ''} That case is left, so the claim is not proved.` } }],
  });
  return {
    id: 's11.l3-do-twin',
    title: 'Check every case left',
    body: ['The same pet, but given 2 changed.', 'For each case, can it happen? If it can, is the claim true there?', 'Then: is the claim proved?'],
    scene: caseScene(cp, { all: true, blank: true }),
    twin: 'Given 2 changed. Now it rules out the dog.',
    afterCard: L3_CARDS.example,
    rows,
    done: `Right. Now the fish is left, and a fish has no fur. One case left where the claim fails, and it is not proved.`,
  };
}

// =====================================================================================================================
// Lesson 4 · Suppose and crash (a guess that crashes vs a guess that holds up)
// =====================================================================================================================

export const CRASH_VS_HOLDS: Distinction = {
  id: 'crash-vs-holds',
  a: 'A guess crashes: it can’t be true, so its opposite is proved.',
  b: 'A guess holds up: it could be true, and nothing is proved yet.',
};
export const L4_CARDS = { contrast: 2, example: 3 } as const;

const k0 = WORKED_KNIGHTS;
const nm0 = k0.nm;
/** The world inside a guess: the guess, and every islander its words then fix (or the first case with the guess). */
function guessWorld(k: CrashCase, who: string, kind: Kind): KindMap {
  const ok = allKinds(k.ids, { [who]: kind }).filter((w) => !k.claims[who] || (kind === 'knight') === claimTrue(k.claims[who], w));
  return ok[0] ?? allKinds(k.ids, { [who]: kind })[0];
}
const crashes = (k: CrashCase, who: string, kind: Kind) => solutions(k.ids, k.claims, { [who]: kind }).length === 0;

export function crashContrast(): Extract<Scene, { kind: 'contrast' }> {
  const X = nm0(k0.who);
  const panel = (kind: Kind): ContrastPanel => {
    const c = crashes(k0, k0.who, kind);
    const w = c ? guessWorld(k0, k0.who, kind) : solutions(k0.ids, k0.claims, { [k0.who]: kind })[0];
    const b = breakers(k0.ids, k0.claims, w);
    return {
      world: `Suppose ${X} is ${aKind(kind)}.`,
      who: 'The guess',
      says: `${cap(kindsText(k0.ids, w, nm0))}.`,
      truth: c,
      because: c ? `${nm0(b[0])}’s words break the rule. The guess can’t be true.` : 'Everyone fits the rule. The guess could be true.',
      then: c ? `So ${X} is ${aKind(flip(kind))}. That is proved.` : 'That proves nothing yet.',
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(k0.kind), panel(flip(k0.kind))],
    ask: { q: 'Which guess proves something?', a: `Only the one that crashes. It proves its opposite: ${X} is ${aKind(flip(k0.kind))}. A guess that holds up only shows it could be true.` },
    words: { worldTag: 'The guess', saysWord: 'leads to:', truth: 'Crashes', untruth: 'Holds up' },
  };
}

const CR_CLOSING = 'Those two ideas are apart now. Back to the board: follow each guess, and ask if it crashes.';
const HOLDS_AS_PROOF = 'You may be treating “the guess holds up” and “the guess is proved” as the same thing. They are two different things. A guess that holds up could be true. Only a crash proves something: the opposite of the guess.';
const CRASH_AS_GUESS = 'You may be treating what you guessed and what the crash proves as the same thing. A crash shows the guess is false. So the crash proves the opposite of the guess.';
export const CRASH_Q: ConfusedQuestion = {
  q: 'A guess holds up. Does that prove it?',
  options: [{ label: 'No. Only a crash proves something', right: true }, { label: 'Yes. It fits, so it must be true' }, { label: 'Not sure' }],
  teach: 'No. A guess that holds up shows it could be true. The other guess might hold up too. Only a guess that crashes proves something: its opposite.',
};

const PROVES_OPTIONS = [{ id: 'opp', label: 'Its opposite' }, { id: 'nothing', label: 'Nothing yet' }, { id: 'itself', label: 'The guess itself' }];

/** Do, right after the contrast: for each guess, does it crash, and what does it prove? */
export function crashGuessBoard(): DrillStep {
  const guesses: [string, Kind][] = k0.ids.flatMap((id) => (['knight', 'knave'] as Kind[]).map((kind) => [id, kind] as [string, Kind]));
  const rows: DrillRow[] = guesses.map(([who, kind], i) => {
    const id = `g${i + 1}`;
    const c = crashes(k0, who, kind);
    const w = c ? guessWorld(k0, who, kind) : solutions(k0.ids, k0.claims, { [who]: kind })[0];
    const b = breakers(k0.ids, k0.claims, w);
    const inWords = `${cap(kindsText(k0.ids, w, nm0))}.`;
    return {
      id,
      label: `Guess: ${nm0(who)} is ${aKind(kind)}.`,
      marks: [
        { id: `${id}-crash`, label: 'Does it crash?', options: [...YES_NO], answer: yn(c), why: { [yn(!c)]: c ? `Follow it: ${inWords} ${nm0(b[0])}’s words break the rule.` : `Follow it: ${inWords} Everyone fits the rule.` } },
        {
          id: `${id}-proves`,
          label: 'What does it prove?',
          options: PROVES_OPTIONS,
          answer: c ? 'opp' : 'nothing',
          why: (c
            ? { nothing: `The guess crashes, so it can’t be true. That proves its opposite: ${nm0(who)} is ${aKind(flip(kind))}.`, itself: `The guess crashes, so it is false. It proves the opposite: ${nm0(who)} is ${aKind(flip(kind))}.` }
            : { opp: 'The guess holds up. Nothing crashed, so nothing is proved about its opposite.', itself: 'The guess holds up. That shows it could be true, not that it must be.' }) as Record<string, string>,
        },
      ],
    };
  });
  const misconceptions: Misconception[] = guesses.flatMap(([who, kind], i) =>
    crashes(k0, who, kind)
      ? [{ id: 'crash-as-guess', when: 'picks' as const, picks: { [`g${i + 1}-proves`]: 'itself' }, text: CRASH_AS_GUESS }]
      : [{ id: 'holds-as-proof', when: 'picks' as const, picks: { [`g${i + 1}-proves`]: 'itself' }, text: HOLDS_AS_PROOF }],
  );
  return {
    id: 's11.l4-do-guess',
    title: 'Crash or hold up?',
    body: [PUZZLE_RULE, 'Try each guess. Does it crash? Then: what does it prove?'],
    scene: speakersScene(k0.ids, k0.claims, nm0, { rule: PUZZLE_RULE }),
    twin: 'The same islanders, with no guess yet.',
    afterCard: L4_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { closing: CR_CLOSING },
    misconceptions,
    confused: [CRASH_Q],
    distinction: CRASH_VS_HOLDS.id,
    done: 'Right. Each guess that crashes proves its opposite. A guess that holds up proves nothing by itself.',
  };
}

/** The worked example: the guess its explanation makes, on the speakers, with the guess as the test banner. */
export const crashWorkedScene = (): Scene => L1_SCENES.crash();
/** The worked example's lines (explainSolve), up to the crash. */
export const crashWorkedLines = (): string[] => [`Suppose ${nm0(k0.who)} is ${aKind(k0.kind)}.`, ...k0.lines];

/** Do, right after the example: the same islanders, a guess about the other islander, followed to its crash. */
export function crashFollowBoard(): DrillStep {
  const who = k0.ids.find((id) => id !== k0.who)!;
  const other = k0.who;
  const ans = k0.sols[0];
  const kind = flip(ans[who]);
  const W = nm0(who);
  const O = nm0(other);
  const w = guessWorld(k0, who, kind);
  const b = breakers(k0.ids, k0.claims, w);
  const need = kind === 'knight';
  const rows: DrillRow[] = [
    { id: 'need', label: `Suppose ${W} is ${aKind(kind)}.`, marks: [{ id: 'need', label: `Then ${W}’s words must be`, options: [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }], answer: need ? 'true' : 'false', why: { [need ? 'false' : 'true']: `${cap(aKind(kind))}’s words must be ${need ? 'true' : 'false'}.` } }] },
    { id: 'inside', label: `Inside the guess, ${W}’s words say ${claimSays(k0.claims[who], nm0, k0.ids)}`, marks: [{ id: 'inside', label: `So ${O} is`, options: [{ id: 'knight', label: 'A knight' }, { id: 'knave', label: 'A knave' }], answer: w[other], why: { [flip(w[other])]: `Only with ${O} as ${aKind(w[other])} are ${W}’s words ${need ? 'true' : 'false'}.` } }] },
    { id: 'break', label: `Inside the guess, ${kindsText(k0.ids, w, nm0)}.`, marks: [{ id: 'break', label: 'Whose words break the rule?', options: [...k0.ids.map((id) => ({ id, label: nm0(id) })), { id: 'none', label: 'No one' }], answer: b[0], why: Object.fromEntries([...k0.ids, 'none'].filter((x) => x !== b[0]).map((x) => [x, `${nm0(b[0])} is ${aKind(w[b[0]])}, but ${nm0(b[0])}’s words are ${w[b[0]] === 'knight' ? 'false' : 'true'}. That breaks the rule.`])) }] },
    { id: 'so', label: 'The guess crashes.', marks: [{ id: 'so', label: `So ${W} is`, options: [{ id: 'knight', label: 'A knight' }, { id: 'knave', label: 'A knave' }], answer: flip(kind), why: { [kind]: `That was the guess, and it crashed. So ${W} is ${aKind(flip(kind))}.` } }] },
  ];
  return {
    id: 's11.l4-do-follow',
    title: 'Follow a guess to its crash',
    body: [`Now the guess is about ${W}.`, 'Follow it one step at a time.'],
    scene: speakersScene(k0.ids, k0.claims, nm0, { rule: PUZZLE_RULE, test: `${W} is ${aKind(kind)}.` }),
    twin: `The same islanders. Now the guess is about ${W}.`,
    afterCard: L4_CARDS.example,
    rows,
    done: `Right. The guess crashed, so ${W} is ${aKind(flip(kind))}. That is a proof by contradiction.`,
  };
}

// =====================================================================================================================
// Lesson 5 · One is enough (a case that fits vs a case that breaks)
// =====================================================================================================================

export const FITS_VS_BREAKS: Distinction = {
  id: 'fits-vs-breaks',
  a: 'A case fits an every claim: it is one example, and proves nothing.',
  b: 'A case breaks an every claim: one is enough to make it false.',
};
export const L5_CARDS = { contrast: 2, example: 4 } as const;

export function counterContrast(): Extract<Scene, { kind: 'contrast' }> {
  const cc = WORKED_COUNTER;
  const fit = cc.cards.find((t) => cardRole(cc.claim, t) === 'fit')!;
  const brk = cc.cards.find((t) => cardRole(cc.claim, t) === 'break')!;
  const claim = claimWords(cc.claim, cc.skin);
  const panel = (t: Thing): ContrastPanel => {
    const r = cardRole(cc.claim, t);
    return {
      world: `The card: ${cardName(t)}.`,
      who: 'The claim',
      says: claim,
      truth: r === 'break',
      because: r === 'break' ? `It is red, but it is ${propNot(cc.claim.prop)}. The claim fails for it.` : `It is red and ${propWord(cc.claim.prop)}. The claim holds for it.`,
      things: [{ ...t, id: `k-${t.id}` }],
      then: r === 'break' ? 'So the claim is false. One card is enough.' : 'That is one example. It does not prove the claim.',
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(fit), panel(brk)],
    ask: { q: 'Both cards are red. Which one tells you something for sure?', a: 'The square. It breaks the claim, so the claim is false. The circle only fits. It does not prove the claim.' },
    words: { worldTag: 'Card', saysWord: 'says:', truth: 'Breaks it', untruth: 'Fits it' },
  };
}

const FB_CLOSING = 'Those two ideas are apart now. Back to the board: for each card, is the claim about it, and does it fail?';
const EXAMPLES_AS_PROOF = 'You may be treating “fits” and “proves” as the same thing. They are two different things. A card that fits is one example. The claim is about every card, even ones not shown.';
const NONE_AS_BREAK = 'You may be treating “not about this card” and “breaks the claim” as the same thing. A card breaks the claim only if the claim is about it and it fails. A card outside the group says nothing.';
export const FITS_BREAKS_Q: ConfusedQuestion = {
  q: 'A card fits an every claim. Does it prove the claim?',
  options: [{ label: 'No. It is one example. Another card could break it', right: true }, { label: 'Yes. A card that fits proves it' }, { label: 'Not sure' }],
  teach: 'No. A card that fits is an example. The claim is about every card, so one you have not seen could break it. One card that breaks it does prove it false.',
};

const ROLE_OPTIONS = [{ id: 'fit', label: 'Fits' }, { id: 'break', label: 'Breaks it' }, { id: 'none', label: 'Says nothing' }];

function roleMark(cc: CounterCase, t: Thing, id: string): DrillMark {
  const r = cardRole(cc.claim, t);
  const { group, prop } = cc.claim;
  const said: Record<CaseRole, string> = {
    break: `It is ${group.val}, but it is ${propNot(prop)}. So it breaks the claim.`,
    fit: `It is ${group.val} and ${propWord(prop)}. So it fits the claim.`,
    none: `It is not ${group.val}. So the claim says nothing about it.`,
  };
  return { id, label: cap(cardName(t)), thing: t, options: ROLE_OPTIONS, answer: r, why: Object.fromEntries(ROLE_OPTIONS.filter((o) => o.id !== r).map((o) => [o.id, said[r]])) };
}

/** Do, right after the contrast: for each card, fits, breaks or says nothing? Then: do these cards prove the claim? */
export function counterRoleBoard(): DrillStep {
  const cc = COUNTER_BOARD;
  const rows: DrillRow[] = cc.cards.map((t, i) => ({ id: t.id, label: `Card ${i + 1}`, marks: [roleMark(cc, t, `${t.id}-role`)] }));
  rows.push({
    id: 'proved',
    label: 'All four cards',
    marks: [{ id: 'proved', label: 'Do these cards prove the claim?', options: [...YES_NO], answer: 'no', why: { yes: 'No card breaks it, but the ones that fit are only examples. A red card not shown could be a square.' } }],
  });
  const none = cc.cards.find((t) => cardRole(cc.claim, t) === 'none')!;
  return {
    id: 's11.l5-do-role',
    title: 'Fits, breaks or says nothing?',
    body: [`The claim: “${claimWords(cc.claim, cc.skin)}”`, 'For each card, does it fit the claim, break it, or say nothing?', 'Then: do these cards prove the claim?'],
    scene: counterContrast(),
    afterCard: L5_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { closing: FB_CLOSING },
    misconceptions: [
      { id: 'examples-as-proof', when: 'picks', picks: { proved: 'yes' }, text: EXAMPLES_AS_PROOF },
      { id: 'none-as-break', when: 'picks', picks: { [`${none.id}-role`]: 'break' }, text: NONE_AS_BREAK },
    ],
    confused: [FITS_BREAKS_Q],
    distinction: FITS_VS_BREAKS.id,
    done: 'Right. No card breaks the claim, and still it is not proved. Cards that fit are only examples.',
  };
}

/** The worked example: four cards for “every red card in the deck is a circle”. */
export const counterWorkedScene = (): Scene => ({ kind: 'things', things: WORKED_COUNTER.cards });

/** Do, right after the example: the same cards, a new claim. Then: is the claim false? */
export function counterTwinBoard(): DrillStep {
  const cc = COUNTER_TWIN;
  const rows: DrillRow[] = cc.cards.map((t, i) => ({ id: t.id, label: `Card ${i + 1}`, marks: [roleMark(cc, t, `${t.id}-role`)] }));
  const brk = cc.cards.find((t) => cardRole(cc.claim, t) === 'break');
  rows.push({
    id: 'false',
    label: `The claim: “${claimWords(cc.claim, cc.skin)}”`,
    marks: [{ id: 'false', label: 'Is the claim false?', options: [...YES_NO], answer: yn(!!brk), why: brk ? { no: `${cap(cardName(brk))} breaks it. One card that breaks an every claim makes it false.` } : { yes: 'No card breaks it.' } }],
  });
  return {
    id: 's11.l5-do-twin',
    title: 'One card is enough',
    body: [`The same cards, with a new claim: “${claimWords(cc.claim, cc.skin)}”`, 'For each card, does it fit, break it, or say nothing? Then: is the claim false?'],
    scene: counterWorkedScene(),
    twin: 'The same cards. A new claim: every big card in the deck is a square.',
    afterCard: L5_CARDS.example,
    rows,
    done: `Right. ${brk ? `${cap(cardName(brk))} is ${cc.claim.group.val}, but it is ${propNot(cc.claim.prop)}. That one card makes the claim false.` : 'No card breaks it.'}`,
  };
}
