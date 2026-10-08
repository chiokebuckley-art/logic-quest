/**
 * Ring 2, place 2 · Rule Machine (s15.l2). A function machine does the same thing to every input. When two candidate
 * rules both fit what we have seen, only a separating input (one where the rules give different outputs) can pick one.
 * Feeding an input where they agree tells you nothing new. The winner wins only among the listed candidates.
 *
 * The generator knows when two candidates are separable on an input (`separates`), and every "separating" answer is
 * checked by it: an input where the rules agree is never offered as the right answer. The pairs are built so their
 * agreeing inputs are known in advance (a line meets a line once; "times itself" meets "times p plus q, then take away
 * p times q" at p and q), and the tests confirm the list by brute force over the whole numbers 0 to 40.
 *
 * Running a machine backwards uses only "times a, then add b" with a of at least 2 on whole numbers: one input per
 * output (one-to-one), so the answer is the only whole number that works (checked by brute force).
 */
import type { ChooseItem, DrillStep, IdeaCard, NumberItem, Phase, Rng, Thing } from '../../types';
import type { MachineScene } from '../../scenes/machine';
import { chooseItem, givenMark, numberItem, numberMark, type Level, type WrongChoice, type WrongNumber } from './growth';

// ======================================================================================================
// Rules
// ======================================================================================================

export type Rule =
  | { t: 'add'; k: number }
  | { t: 'times'; k: number }
  | { t: 'timesAdd'; a: number; b: number }
  | { t: 'timesSub'; a: number; b: number }
  | { t: 'square' };

export function apply(r: Rule, x: number): number {
  switch (r.t) {
    case 'add': return x + r.k;
    case 'times': return x * r.k;
    case 'timesAdd': return r.a * x + r.b;
    case 'timesSub': return r.a * x - r.b;
    case 'square': return x * x;
  }
}

/** The rule in words, as the machine shows it: "add 2", "double", "times 3, then add 1", "times itself". */
export function ruleWords(r: Rule): string {
  switch (r.t) {
    case 'add': return `add ${r.k}`;
    case 'times': return r.k === 2 ? 'double' : `times ${r.k}`;
    case 'timesAdd': return `times ${r.a}, then add ${r.b}`;
    case 'timesSub': return `times ${r.a}, then take away ${r.b}`;
    case 'square': return 'times itself';
  }
}

/** The rule with a capital first letter, to start a sentence. */
export const RuleWords = (r: Rule) => ruleWords(r).replace(/^./, (c) => c.toUpperCase());

/** Two rules agree on x when they give the same output for it. */
export const agree = (a: Rule, b: Rule, x: number) => apply(a, x) === apply(b, x);
/** An input separates two rules when their outputs differ: only then can feeding it pick one. */
export const separates = (a: Rule, b: Rule, x: number) => !agree(a, b, x);
/** Every input in the domain where the two rules agree. */
export const agreeInputs = (a: Rule, b: Rule, domain: readonly number[]) => domain.filter((x) => agree(a, b, x));

/** The whole numbers the machines take in these items. */
export const WHOLE = Array.from({ length: 41 }, (_, i) => i);

/** Two candidate rules and the whole numbers where they agree. */
export interface Pair {
  a: Rule;
  b: Rule;
  /** The inputs (0 to 40) where the rules give the same output, smallest first. */
  agreeAt: number[];
}

/** L2 pairs: "add k" and "times m" meet at exactly one input, k shared out m take away 1 ways (1 to 5). */
export function linearPairs(): Pair[] {
  const out: Pair[] = [];
  for (const m of [2, 3, 4]) {
    for (let k = 1; k <= 9; k++) {
      if (k % (m - 1) !== 0) continue;
      const x0 = k / (m - 1);
      if (x0 < 1 || x0 > 5) continue;
      out.push({ a: { t: 'add', k }, b: { t: 'times', k: m }, agreeAt: [x0] });
    }
  }
  return out;
}

/** L3 pairs: "times itself" and "times p plus q, then take away p times q" agree at p and at q, and nowhere else. */
export function squarePairs(): Pair[] {
  const out: Pair[] = [];
  for (let p = 0; p <= 3; p++) {
    for (let q = Math.max(2, p + 1); q <= 5; q++) {
      const b: Rule = p === 0 ? { t: 'times', k: q } : { t: 'timesSub', a: p + q, b: p * q };
      out.push({ a: { t: 'square' }, b, agreeAt: [p, q] });
    }
  }
  return out;
}

/** The brief's pair: "add 2" and "double", which agree at 2. */
export const ADD2_DOUBLE: Pair = { a: { t: 'add', k: 2 }, b: { t: 'times', k: 2 }, agreeAt: [2] };

/**
 * A separating input for a pair, picked by the rng from 1 to 8, never one where the rules agree, and never one where
 * a rule would go below 0 ("times 8, then take away 15" can't take 15 from 8 in whole numbers).
 */
export function separatingInput(pair: Pair, rng: Rng, avoid: readonly number[] = []): number {
  const ok = [1, 2, 3, 4, 5, 6, 7, 8].filter((x) => separates(pair.a, pair.b, x) && !avoid.includes(x) && apply(pair.a, x) >= 0 && apply(pair.b, x) >= 0);
  return rng.pick(ok);
}

/** The inputs a machine could have been fed to give this output: brute force over the whole numbers 0 to 200. */
export const inputsFor = (r: Rule, y: number) => Array.from({ length: 201 }, (_, i) => i).filter((x) => apply(r, x) === y);

/** Which candidates fit every row; the answer of an identify item is the one that does, or "cant" if both do. */
export function fitting(pair: Pair, rows: { input: number; output: number }[]): ('a' | 'b')[] {
  return (['a', 'b'] as const).filter((k) => rows.every((r) => apply(pair[k], r.input) === r.output));
}

// ======================================================================================================
// Items
// ======================================================================================================

const L2 = 's15.l2';
const STATED = 'This machine uses one of these two rules.';

const pairScene = (pair: Pair, rows: MachineScene['rows']): MachineScene => ({ kind: 'machine', rows, candidates: [ruleWords(pair.a), ruleWords(pair.b)], stated: STATED });

const SEP_TERMS = [
  { word: 'A candidate rule', meaning: 'a rule that might be the one the machine uses.' },
  { word: 'A separating input', meaning: 'an input where the two rules give different outputs.' },
];

/** One input tested in the head against both rules: the case card the teaching and the hints show. */
function testCase(pair: Pair, x: number, prefix = ''): { label: string; note: string } {
  const ya = apply(pair.a, x), yb = apply(pair.b, x);
  return {
    label: `${prefix}Input ${x}: ${ruleWords(pair.a)} gives ${ya}, and ${ruleWords(pair.b)} gives ${yb}.`,
    note: ya === yb ? 'Same output: this test can’t pick a rule.' : 'Different outputs: this test picks one rule.',
  };
}

/**
 * Do: choose a separating input. The input already fed (where the rules agree) is the trap (tag first-rule). On a
 * square pair the other agreeing input is offered too, so the learner must test each choice. `framed`: the faded
 * example, a sentence frame with the separating outputs shown.
 */
export function separateItem(pair: Pair, rng: Rng, o: { framed?: boolean; phase?: Phase; level?: Level } = {}): ChooseItem {
  const fed = pair.agreeAt[pair.agreeAt.length - 1];
  const other = pair.agreeAt.length > 1 ? pair.agreeAt[0] : null;
  const xs = separatingInput(pair, rng, pair.agreeAt);
  if (!separates(pair.a, pair.b, xs) || agree(pair.a, pair.b, fed) === false) throw new Error('separateItem: the pair does not fit');
  const y0 = apply(pair.a, fed);
  const A = ruleWords(pair.a), B = ruleWords(pair.b);
  const ya = apply(pair.a, xs), yb = apply(pair.b, xs);
  const wrong: WrongChoice[] = [
    {
      id: 'again',
      label: `${fed} again`,
      tag: 'first-rule',
      fb: { headline: `Feeding ${fed} again can’t split the rules: both give ${y0} for ${fed}.`, detail: [`${RuleWords(pair.a)} gives ${y0}, and ${B} gives ${y0}. The machine will say ${y0} either way.`, `Try ${xs}: ${A} gives ${ya}, but ${B} gives ${yb}. Those differ, so the output picks one.`] },
    },
  ];
  if (other !== null) {
    const yo = apply(pair.a, other);
    wrong.push({
      id: 'other',
      label: `${other}`,
      tag: 'first-rule',
      fb: { headline: `${other} can’t split them either: both rules give ${yo} for ${other}.`, detail: [`${RuleWords(pair.a)} gives ${yo}, and ${B} gives ${apply(pair.b, other)}. They agree.`, `For ${xs}, ${A} gives ${ya} but ${B} gives ${yb}.`] },
    });
  }
  // The faded frame reads "Feed ___ next.", so only inputs fill its blank there.
  if (!o.framed) {
    wrong.push({
      id: 'none',
      label: 'No input can tell them apart.',
      tag: 'examples-as-proof',
      fb: { headline: `The rules agree on ${fed}, but not on every input.`, detail: [`For ${xs}, ${A} gives ${ya} and ${B} gives ${yb}.`, 'One row where they agree does not make them the same rule.'] },
    });
  }
  const level = o.level ?? (other !== null ? 3 : 2);
  return chooseItem(
    {
      lesson: L2,
      tag: 'separate',
      prompt: `${STATED} The rules are ${A}, or ${B}. Feeding ${fed} gave ${y0}, and both rules fit. Which input should you feed next to tell them apart?`,
      scene: pairScene(pair, [{ input: fed, output: y0 }]),
      frame: o.framed ? `Feed ___ next. There, ${A} gives ${ya} but ${B} gives ${yb}.` : undefined,
      explain: `For ${xs}, ${A} gives ${ya} and ${B} gives ${yb}. The outputs differ, so feeding ${xs} picks one rule. For ${fed}, both give ${y0}, so it can’t.`,
      teach: {
        rule: 'A separating input is one where the two rules give different outputs. Only that kind of test can pick one rule.',
        terms: SEP_TERMS,
        casesTitle: 'Test each input in your head',
        cases: [testCase(pair, fed), ...(other !== null ? [testCase(pair, other)] : []), testCase(pair, xs)],
        remember: ['Feed an input where the rules disagree.', 'Ask: could the output come out two ways?'],
        simpler: [`Put ${fed} into both rules: ${y0} and ${y0}. Same, so no news.`, `Put ${xs} into both rules: ${ya} and ${yb}. Different, so the machine’s output will pick one.`],
      },
      hints: ['Work out each rule’s output in your head for each choice.', `For ${fed}, both rules give ${y0}. Will feeding it again tell you anything new?`, 'Pick the input where the two outputs are different.'],
      hintCase: { ...testCase(pair, 10, 'A worked twin. '), note: `${testCase(pair, 10).note} Input 10 is not one of the choices.` },
      phase: o.phase ?? 'do',
      level,
      tags: o.framed ? undefined : ['first-fit'],
      meta: {
        skill: 'Track 2 · a separating test',
        rule: `one of two candidate rules, ${A} or ${B}; they agree only at ${pair.agreeAt.join(' and ')}`,
        task: o.framed ? 'fill a faded frame for a separating input' : 'choose a separating input',
        representation: 'a function machine',
        difficulty: other !== null ? 4 : 3,
        twin: other !== null ? 'separate-square' : 'separate-linear',
      },
    },
    { id: 'split', label: `${xs}` },
    wrong,
    rng,
  );
}

/**
 * Do: identify the rule when "this machine uses one of these two rules" and the rows are shown. With a separating
 * row the answer is the one rule that fits every row (the rule that fits only the first row is the trap, tag
 * first-rule); with only the agreeing row, the answer is "Can’t tell yet".
 */
export function identifyItem(pair: Pair, truth: 'a' | 'b', xs: number, o: { decided?: boolean; phase?: Phase; level?: Level } = {}): ChooseItem {
  const decided = o.decided ?? true;
  const fed = pair.agreeAt[pair.agreeAt.length - 1];
  const rule = pair[truth];
  const rows = [{ input: fed, output: apply(rule, fed) }, ...(decided ? [{ input: xs, output: apply(rule, xs) }] : [])];
  const fits = fitting(pair, rows);
  const answer = fits.length === 2 ? 'cant' : fits[0];
  if (decided && !separates(pair.a, pair.b, xs)) throw new Error('identifyItem: the second row must separate');
  const A = ruleWords(pair.a), B = ruleWords(pair.b);
  const name = { a: A, b: B } as const;
  const said = rows.map((r) => `Feeding ${r.input} gave ${r.output}.`).join(' ');
  const wrong: WrongChoice[] = [];
  for (const k of ['a', 'b'] as const) {
    if (k === answer) continue;
    if (answer === 'cant') {
      wrong.push({
        id: k,
        label: name[k],
        tag: 'unwarranted-certainty',
        fb: { headline: `${RuleWords(pair[k])} fits, but so does ${name[k === 'a' ? 'b' : 'a']}: one row can’t decide.`, detail: [`For ${fed}, both rules give ${rows[0].output}.`, `Feed an input where they differ, like ${xs}, before you pick.`] },
      });
    } else {
      const y = apply(pair[k], xs);
      wrong.push({
        id: k,
        label: name[k],
        tag: 'first-rule',
        fb: { headline: `${RuleWords(pair[k])} fits the first row, but not the row where ${xs} gave ${rows[1].output}.`, detail: [`${RuleWords(pair[k])} turns ${xs} into ${y}, not ${rows[1].output}.`, `${RuleWords(rule)} fits both rows, so it wins among these two rules.`] },
      });
    }
  }
  if (answer !== 'cant') {
    wrong.push({
      id: 'cant',
      label: 'Can’t tell yet',
      fb: { headline: `You can tell: the row for ${xs} splits the rules.`, detail: [`${RuleWords(pair.a)} gives ${apply(pair.a, xs)} for ${xs}, and ${B} gives ${apply(pair.b, xs)}. The machine gave ${rows[1].output}.`, `Only ${name[answer]} fits every row.`] },
    });
  }
  const right = answer === 'cant' ? { id: 'cant', label: 'Can’t tell yet' } : { id: answer, label: name[answer] };
  return chooseItem(
    {
      lesson: L2,
      tag: 'machine-which',
      prompt: `${STATED} The rules are ${A}, or ${B}. ${said} Which rule does it use?`,
      scene: pairScene(pair, rows),
      explain: answer === 'cant'
        ? `Both rules give ${rows[0].output} for ${fed}, so this row can’t decide. Feed an input where they differ first.`
        : `Both rules fit the row where ${fed} gave ${rows[0].output}. Only ${name[answer]} also fits the row where ${xs} gave ${rows[1].output}, so it wins among these two rules.`,
      teach: {
        rule: 'Check every candidate against every row. The winner fits all of them. If more than one fits, you can’t tell yet.',
        terms: SEP_TERMS,
        casesTitle: 'Check each rule against each row',
        cases: [testCase(pair, fed), ...(decided ? [testCase(pair, xs)] : [])],
        remember: ['A rule that fits the first row is not the winner yet.', 'Ask: does it fit every row?'],
        simpler: [`Row 1: ${fed} gave ${rows[0].output}. Both rules fit.`, ...(decided ? [`Row 2: ${xs} gave ${rows[1].output}. Only ${name[answer as 'a' | 'b']} fits.`] : ['There is no second row, so both rules are still in.'])],
      },
      hints: ['Test the first rule on every row, then the second rule.', `Does each rule fit the row for ${decided ? xs : fed}?`, 'If both rules fit every row, you can’t tell yet.'],
      hintCase: { ...testCase(pair, 10, 'A worked twin. '), note: `${testCase(pair, 10).note} The machine was not fed 10 here.` },
      phase: o.phase ?? 'do',
      level: o.level ?? 2,
      tags: ['first-fit'],
      conflict: true,
      meta: {
        skill: 'Track 2 · test every candidate',
        rule: `the machine uses one of two rules, ${A} or ${B}`,
        task: decided ? 'identify the rule from a separating row' : 'see that one agreeing row can’t decide',
        representation: 'a function machine',
        difficulty: 3,
        twin: decided ? 'identify' : 'identify-cant',
      },
    },
    right,
    wrong,
  );
}

/** Do: fill a table cell when the rule is known. */
export function fillItem(r: Rule & { t: 'timesAdd' }, x: number, o: { phase?: Phase; level?: Level } = {}): NumberItem {
  const ans = apply(r, x);
  const words = ruleWords(r);
  const next = apply(r, 3);
  // The hint's worked twin is never the asked input.
  const tw = x === 4 ? 5 : 4;
  const wrong: WrongNumber[] = [
    { value: r.a * x, fb: { headline: `${r.a * x} is ${r.a} times ${x}, but the rule adds ${r.b} after.`, detail: [`Do both steps in order: times ${r.a}, then add ${r.b}.`, `${r.a * x} plus ${r.b} is ${ans}.`] } },
    { value: x + r.a + r.b, tag: 'add-vs-multiply', fb: { headline: `${x + r.a + r.b} adds ${r.a}, but the rule says times ${r.a}.`, detail: [`${r.a} times ${x} is ${r.a * x}.`, `Then add ${r.b}: ${ans}.`] } },
    { value: r.a * (x + r.b), fb: { headline: `${r.a * (x + r.b)} adds ${r.b} first, but the rule says times first, then add.`, detail: [`${r.a} times ${x} is ${r.a * x}. Then add ${r.b}: ${ans}.`] } },
    { value: next, tag: 'local-only', fb: { headline: `${next} is the output for 3, the input after 2, not for ${x}.`, detail: [`The machine does the same thing to every input. Put ${x} in.`, `${r.a} times ${x} is ${r.a * x}, plus ${r.b} is ${ans}.`] } },
  ];
  return numberItem(
    {
      lesson: L2,
      tag: 'machine-fill',
      prompt: `This machine’s rule is ${words}. What comes out for ${x}?`,
      scene: { kind: 'machine', rule: words, rows: [{ input: 1, output: apply(r, 1) }, { input: 2, output: apply(r, 2) }, { input: x, output: null }] },
      explain: `${r.a} times ${x} is ${r.a * x}. Then add ${r.b}: ${ans}. It fits the table too: ${r.a} times 2 is ${2 * r.a}, plus ${r.b} is ${apply(r, 2)}.`,
      teach: {
        rule: `A function machine does the same steps to every input, in order: times ${r.a}, then add ${r.b}.`,
        terms: [{ word: 'An input', meaning: 'the number that goes in.' }, { word: 'An output', meaning: 'the number that comes out.' }],
        casesTitle: 'Run the rule on each row',
        cases: [1, 2].map((k) => ({ label: `Input ${k}: ${r.a} times ${k} is ${r.a * k}.`, note: `Plus ${r.b} is ${apply(r, k)}. The table says ${apply(r, k)}.` })),
        remember: ['Do the steps in the order the rule says.', 'Ask: did I use the input, or the last row?'],
        simpler: [`Start with ${x}.`, `Times ${r.a}: ${r.a * x}.`, `Add ${r.b}: ${ans}.`],
      },
      hints: [`Start with ${x}. What is ${r.a} times ${x}?`, `Now add ${r.b}.`, 'Check the rule on a row you can see first.'],
      hintCase: { label: `A worked twin: input ${tw}. ${r.a} times ${tw} is ${tw * r.a}.`, note: `Plus ${r.b} is ${apply(r, tw)}.` },
      phase: o.phase ?? 'do',
      level: o.level ?? 2,
      meta: { skill: 'Track 2 · run a stated rule', rule: `${words}, on whole numbers`, task: 'fill a table cell', representation: 'a function machine table', difficulty: 2, twin: 'machine-fill' },
    },
    ans,
    '',
    wrong,
  );
}

/**
 * Do (L3): run "times a, then add b" backwards on whole numbers. The rule is one-to-one, so the input is the only
 * whole number that gives the output. Undo in reverse order: take away b first, then find what times a makes it.
 */
export function backItem(r: Rule & { t: 'timesAdd' }, x: number, o: { framed?: boolean; phase?: Phase; level?: Level } = {}): NumberItem {
  const y = apply(r, x);
  const mid = y - r.b;
  const words = ruleWords(r);
  const wrong: WrongNumber[] = [];
  if ((y + r.b) % r.a === 0) {
    const v = (y + r.b) / r.a;
    wrong.push({ value: v, tag: 'undo-order', fb: { headline: `${v} goes in and comes out as ${apply(r, v)}, not ${y}.`, detail: [`To undo add ${r.b}, take ${r.b} away. Then undo times ${r.a}.`, `${y} take away ${r.b} is ${mid}, and ${r.a} times ${x} is ${mid}. So ${x} went in.`] } });
  }
  if (y % r.a === 0 && y / r.a - r.b >= 0) {
    const v = y / r.a - r.b;
    wrong.push({ value: v, tag: 'undo-order', fb: { headline: `${v} undoes the first step first, but the last step must be undone first.`, detail: [`The machine did times ${r.a} first and add ${r.b} last. Undo the last step first: take away ${r.b}.`, `${mid}, then ${r.a} times ${x} is ${mid}. So ${x} went in.`] } });
  }
  wrong.push(
    { value: apply(r, y), tag: 'undo-order', fb: { headline: `${apply(r, y)} runs the machine forward again, not backwards.`, detail: [`Backwards means undo each step: take away ${r.b}, then find what times ${r.a} makes ${mid}.`, `That gives ${x}.`] } },
    { value: mid, fb: { headline: `${mid} undoes the add ${r.b}, but not the times ${r.a}.`, detail: [`${r.a} times what makes ${mid}? ${r.a} times ${x} is ${mid}.`, `So ${x} went in.`] } },
  );
  // Near misses: one off the input. Running the answer forward shows the slip.
  for (const v of [x - 1, x + 1]) {
    wrong.push({ value: v, fb: { headline: `${v} goes in and comes out as ${apply(r, v)}, not ${y}.`, detail: [`Check forward: ${r.a} times ${v} is ${r.a * v}, plus ${r.b} is ${apply(r, v)}.`, `${y} take away ${r.b} is ${mid}, and ${r.a} times ${x} is ${mid}. So ${x} went in.`] } });
  }
  return numberItem(
    {
      lesson: L2,
      tag: 'machine-back',
      prompt: `This machine does ${words}. It takes whole numbers only. Out came ${y}. What number went in?`,
      scene: { kind: 'machine', rule: words, stated: 'The machine takes whole numbers.', rows: [{ input: null, output: y }] },
      frame: o.framed ? `Take away ${r.b} first: ${mid}. Then ${r.a} times ___ makes ${mid}.` : undefined,
      explain: `Undo the last step first: ${y} take away ${r.b} is ${mid}. Then undo times ${r.a}: ${r.a} times ${x} is ${mid}. Check: ${r.a} times ${x}, plus ${r.b}, is ${y}.`,
      teach: {
        rule: 'To run a machine backwards, undo its steps in reverse order: the last step first.',
        terms: [
          { word: 'Undo add', meaning: 'take the same number away.' },
          { word: 'Undo times', meaning: 'ask what number, times that many, makes it.' },
          { word: 'Whole numbers', meaning: '0, 1, 2, 3 and so on, with no parts.' },
        ],
        meaning: `Each whole number in gives its own output here, so only one input can give ${y}.`,
        casesTitle: 'Undo, then check',
        cases: [
          { label: `Undo add ${r.b}: ${y} take away ${r.b} is ${mid}.`, note: 'The last step is undone first.' },
          { label: `Undo times ${r.a}: ${r.a} times ${x} is ${mid}.`, note: `So ${x} went in.` },
          { label: `Check forward: ${r.a} times ${x} is ${r.a * x}, plus ${r.b} is ${y}.`, note: 'It fits.' },
        ],
        remember: ['Undo the last step first.', 'Ask: if I put my answer in, does the machine give the output?'],
        simpler: [`The machine did two things: times ${r.a}, then add ${r.b}.`, `Go back: take away ${r.b} to get ${mid}.`, `Then ${r.a} times ${x} is ${mid}, so ${x} went in.`],
      },
      hints: ['Which step did the machine do last?', `Undo add ${r.b} first: ${y} take away ${r.b}.`, `Then ask: ${r.a} times what makes ${mid}?`],
      hintCase: { label: `A worked twin: ${words}, and out came ${apply(r, 2)}.`, note: `Take away ${r.b}: ${2 * r.a}. ${r.a} times 2 is ${2 * r.a}, so 2 went in.` },
      phase: o.phase ?? 'do',
      level: o.level ?? 3,
      meta: {
        skill: 'Track 2 · run a machine backwards',
        rule: `${words}, on whole numbers; one input per output, so the input is unique`,
        task: o.framed ? 'fill a faded frame to undo a machine' : 'run a machine backwards',
        representation: 'a function machine',
        difficulty: 4,
        twin: 'machine-back',
      },
    },
    x,
    '',
    wrong,
  );
}

/** Explain: why feeding the agreeing input again tells you nothing. */
export function machineWhyItem(pair: Pair, xs: number, rng?: Rng): ChooseItem {
  const fed = pair.agreeAt[pair.agreeAt.length - 1];
  const y0 = apply(pair.a, fed);
  const A = ruleWords(pair.a), B = ruleWords(pair.b);
  return chooseItem(
    {
      lesson: L2,
      tag: 'machine-why',
      prompt: `${STATED} The rules are ${A}, or ${B}. Feeding ${fed} gave ${y0}. Why does feeding ${fed} again tell you nothing new?`,
      scene: pairScene(pair, [{ input: fed, output: y0 }]),
      explain: `Both rules give ${y0} for ${fed}. So the machine says ${y0} whichever rule it uses, and the output can’t pick one. An input like ${xs} can: ${A} gives ${apply(pair.a, xs)} and ${B} gives ${apply(pair.b, xs)}.`,
      teach: {
        rule: 'A test helps only if its result could come out two ways. Feeding an input where both rules agree can only come out one way.',
        terms: SEP_TERMS,
        casesTitle: 'Test the input in your head',
        cases: [testCase(pair, fed), testCase(pair, xs)],
        remember: ['A test that can’t come out two ways can’t pick a rule.', 'Ask: what would each rule give?'],
        simpler: [`${RuleWords(pair.a)} turns ${fed} into ${y0}.`, `${RuleWords(pair.b)} turns ${fed} into ${y0} too.`, `So a second ${y0} fits both rules. Nothing is decided.`],
      },
      hints: [`What does ${A} give for ${fed}? What does ${B} give?`, 'Could the machine’s answer come out two ways?', 'A good test is one where the two rules give different outputs.'],
      hintCase: testCase(pair, xs, 'A worked twin. '),
      phase: 'explain',
      level: 2,
      rubric: 3,
      meta: {
        skill: 'Track 2 · explain a separating test',
        rule: `one of two candidate rules, ${A} or ${B}; they agree at ${fed}`,
        task: 'choose why a repeated test cannot separate the rules',
        representation: 'a function machine',
        difficulty: 3,
        rubric: '3 = names the competing rule and says the repeated test cannot separate them',
        twin: 'machine-why',
      },
    },
    { id: 'same', label: `Both rules give ${y0} for ${fed}, so the output can’t pick one.` },
    [
      { id: 'random', label: 'The machine might give a different answer this time.', fb: { headline: 'A machine does the same thing to the same input every time.', detail: [`Feed ${fed} again and you get ${y0} again.`, `The real problem: both rules give ${y0} for ${fed}.`] } },
      { id: 'first', label: `${RuleWords(pair.a)} already fits, so it must be the rule.`, tag: 'first-rule', fb: { headline: `${RuleWords(pair.a)} fits, but ${B} fits too.`, detail: [`For ${fed}, ${A} gives ${y0}, and ${B} gives ${y0}.`, `A rule that fits is not the winner yet. Test an input where they differ, like ${xs}.`] } },
      { id: 'proof', label: `A second ${y0} would prove the machine uses ${B}.`, tag: 'examples-as-proof', fb: { headline: `A second ${y0} fits both rules, so it proves nothing.`, detail: [`${RuleWords(pair.a)} and ${B} both turn ${fed} into ${y0}.`, `Only an input where they differ, like ${xs}, can decide.`] } },
    ],
    rng,
  );
}

/** Transfer settings: a real process, two ideas that agree at the current setting. */
export const SETTINGS = [
  { id: 'ramp', intro: 'A toy car rolls off a ramp onto the floor.', at: (x: number) => `height ${x}`, label: (x: number) => `Height ${x}`, ask: 'Which height should you test?', a: (m: number) => `the car rolls ${m} times the ramp height, in floor tiles`, b: (k: number) => `it rolls the ramp height plus ${k} floor tiles` },
  { id: 'fan', intro: 'A fan blows a paper boat across a tub of water.', at: (x: number) => `fan setting ${x}`, label: (x: number) => `Fan setting ${x}`, ask: 'Which fan setting should you test?', a: (m: number) => `the boat goes ${m} times the fan setting, in hand spans`, b: (k: number) => `it goes the fan setting plus ${k} hand spans` },
  { id: 'spring', intro: 'Weights hang on a spring, and it stretches.', at: (x: number) => `${x} weights`, label: (x: number) => `${x} weights`, ask: 'How many weights should you test?', a: (m: number) => `the stretch is ${m} times the number of weights, in marks`, b: (k: number) => `it is the number of weights plus ${k} marks` },
] as const;

/** Transfer: two explanations of a process agree at the current setting; pick the setting that separates them. */
export function settingItem(ctx: (typeof SETTINGS)[number], m: number, k: number, x0: number, X: number, rng?: Rng): ChooseItem {
  const A: Rule = { t: 'times', k: m }, B: Rule = { t: 'add', k };
  if (!agree(A, B, x0) || !separates(A, B, X)) throw new Error('settingItem: the ideas must agree at x0 and differ at X');
  const y0 = apply(A, x0), aX = apply(A, X), bX = apply(B, X);
  return chooseItem(
    {
      lesson: L2,
      tag: 'test-setting',
      prompt: `${ctx.intro} Idea A: ${ctx.a(m)}. Idea B: ${ctx.b(k)}. At ${ctx.at(x0)}, both ideas say ${y0}. At ${ctx.at(X)}, idea A says ${aX} and idea B says ${bX}. ${ctx.ask}`,
      scene: { kind: 'machine', stated: 'Two ideas; one of them may be right.', candidates: ['Idea A', 'Idea B'], rows: [{ input: x0, output: y0 }, { input: X, output: null }] },
      explain: `At ${ctx.at(X)} the ideas disagree: ${aX} or ${bX}. Whatever you see there, it can fit at most one idea. At ${ctx.at(x0)} they both say ${y0}, so that test can’t pick one.`,
      teach: {
        rule: 'To choose between two ideas, test where they predict different results.',
        terms: [{ word: 'A prediction', meaning: 'what an idea says will happen before you test it.' }, { word: 'A separating test', meaning: 'a test where the two ideas predict different results.' }],
        casesTitle: 'What each test can show',
        cases: [
          { label: `Test ${ctx.at(x0)}: both ideas say ${y0}.`, note: 'The result fits both or neither. It can’t pick one.' },
          { label: `Test ${ctx.at(X)}: idea A says ${aX}, idea B says ${bX}.`, note: 'The result can fit only one. It picks a winner.' },
        ],
        remember: ['Test where the ideas disagree.', 'Ask: could this result fit both ideas?'],
        simpler: [`At ${x0}, A says ${y0} and B says ${y0}. Same.`, `At ${X}, A says ${aX} and B says ${bX}. Different.`, `So test ${X}.`],
      },
      hints: ['Where do the two ideas predict the same thing?', `Where do they predict different things?`, 'A test only helps where the predictions differ.'],
      hintCase: { label: `A worked twin: at ${ctx.at(X + 2)}, idea A says ${apply(A, X + 2)} and idea B says ${apply(B, X + 2)}.`, note: 'Different predictions, so that test could pick one too.' },
      phase: 'transfer',
      level: 3,
      tags: ['first-fit'],
      meta: {
        skill: 'Track 2 · choose a separating test in real life',
        rule: `idea A: times ${m}; idea B: add ${k}; they agree only at ${x0}`,
        task: 'choose the setting that separates two explanations',
        representation: `a ${ctx.id} test`,
        difficulty: 4,
        twin: `setting-${ctx.id}`,
      },
    },
    { id: 'x', label: ctx.label(X) },
    [
      { id: 'x0', label: ctx.label(x0), tag: 'first-rule', fb: { headline: `At ${ctx.at(x0)} both ideas predict ${y0}, so the test can’t tell them apart.`, detail: ['Whatever you see, it fits both ideas or neither.', `At ${ctx.at(X)}, idea A says ${aX} and idea B says ${bX}. The result picks one.`] } },
      { id: 'either', label: 'Either one: the ideas agree.', tag: 'examples-as-proof', fb: { headline: `The ideas agree at ${ctx.at(x0)}, but not at ${ctx.at(X)}.`, detail: [`At ${ctx.at(X)}, idea A says ${aX} and idea B says ${bX}.`, 'Agreeing on one setting does not make two ideas the same.'] } },
    ],
    rng,
  );
}

// ---------- the rule-testing primer ----------

export type CardRule = { attr: 'color'; value: Thing['color'] } | { attr: 'shape'; value: Thing['shape'] } | { attr: 'size'; value: Thing['size'] };
const ruleText = (r: CardRule) => (r.attr === 'shape' ? `a ${r.value}` : r.value);
export const fitsRule = (r: CardRule, t: Thing) => t[r.attr] === r.value;
const cardName = (t: Thing) => `${t.size} ${t.color} ${t.shape}`;

/** Primer: does a new card fit the rule? Keep the rule for now, or rule it out. */
export function ruleTestItem(rule: CardRule, seen: Thing[], card: Thing, rng?: Rng): ChooseItem {
  const fits = fitsRule(rule, card);
  if (!seen.every((t) => fitsRule(rule, t))) throw new Error('ruleTestItem: the first cards must fit');
  const said = `“Every card is ${ruleText(rule)}.”`;
  const keep = { id: 'keep', label: 'Keep the rule for now' }, out = { id: 'out', label: 'Rule it out' };
  const actual = card[rule.attr];
  return chooseItem(
    {
      lesson: L2,
      tag: 'rule-test',
      prompt: `Rule to test: ${said} The first cards fit. Then a new card turns up: the ${cardName(card)}. Keep the rule, or rule it out?`,
      scene: { kind: 'things', things: [...seen.map((t) => ({ ...t, mark: 'yes' as const })), card] },
      explain: fits ? `The ${cardName(card)} is ${ruleText(rule)}, so it fits. Keep the rule for now: a later card could still break it.` : `The ${cardName(card)} is not ${ruleText(rule)}. One card that breaks a rule rules it out.`,
      teach: {
        rule: 'A card that fits keeps a rule alive for now. One card that breaks it rules it out.',
        terms: [{ word: 'Rule it out', meaning: 'stop using the rule, because a case breaks it.' }],
        cases: [
          { label: `A card that is ${ruleText(rule)}.`, note: 'It fits. Keep the rule for now.' },
          { label: `A card that is not ${ruleText(rule)}.`, note: 'It breaks the rule. Rule it out.' },
        ],
        remember: ['Fits: keep it for now. Breaks: rule it out.', 'Ask: does this card do what the rule says?'],
        simpler: [`The rule says every card is ${ruleText(rule)}.`, `Look at the new card’s ${rule.attr}.`, fits ? 'It matches, so the rule survives.' : 'It does not match, so the rule is out.'],
      },
      hints: [`What does the rule say about each card’s ${rule.attr}?`, `Look at the new card’s ${rule.attr}.`],
      hintCase: { label: `A worked twin: rule “Every card is ${ruleText(rule)}”, and a card that is ${ruleText(rule)}.`, note: 'It fits, so the rule survives for now.' },
      phase: 'do',
      level: 1,
      meta: { skill: 'Track 2 · test a rule on a case', rule: `every card is ${ruleText(rule)}`, task: 'keep or rule out a rule', representation: 'shape cards', difficulty: 1, twin: 'rule-test' },
    },
    fits ? keep : out,
    [
      fits
        ? { id: 'out', label: out.label, fb: { headline: 'The new card fits the rule, so nothing breaks it.', detail: [`The rule says every card is ${ruleText(rule)}. The ${cardName(card)} is ${ruleText(rule)}.`, 'Keep the rule for now. It is still a guess: a later card could break it.'] } }
        : { id: 'keep', label: keep.label, tag: 'first-rule', fb: { headline: `The new card breaks the rule: it is not ${ruleText(rule)}.`, detail: [`The ${cardName(card)} is ${rule.attr === 'shape' ? `a ${actual}` : actual}.`, 'One card that breaks a rule is enough to rule it out.'] } },
    ],
    rng,
  );
}

// ======================================================================================================
// See (key-idea cards) and Do (guided boards)
// ======================================================================================================

const TWO = ['add 2', 'double'];

/** Card 1: 2 gives 4, and both rules fit. */
export const MACHINE_TWO: MachineScene = {
  kind: 'machine',
  stated: STATED,
  candidates: TWO,
  rows: [{ input: 2, output: 4, outAt: 1 }],
  steps: [
    { label: 'Feed 2', say: '2 goes in, and 4 comes out.' },
    { label: 'Test add 2', say: 'Add 2: 2 plus 2 is 4. It fits.' },
    { label: 'Test double', say: 'Double: 2 times 2 is 4. It fits too.' },
    { label: 'So?', say: 'Both rules fit this row. One row can’t decide between them.' },
  ],
};

/** Card 2: try 3 in the head (5 or 6), feed it, and double wins. */
export const MACHINE_SPLIT: MachineScene = {
  kind: 'machine',
  stated: STATED,
  candidates: TWO,
  tries: [{ input: 3, outs: [5, 6], at: 1 }],
  ruledOut: [{ rule: 'add 2', at: 4 }],
  rows: [{ input: 2, output: 4 }, { input: 3, output: 6, at: 3, outAt: 3 }],
  steps: [
    { label: 'Try 3 in your head', say: 'Add 2 gives 5. Double gives 6.' },
    { label: 'They differ', say: '5 and 6 are different, so input 3 can tell the rules apart.' },
    { label: 'Feed 3', say: '3 goes in, and 6 comes out.' },
    { label: 'Check both rows', say: 'Double fits both rows. Add 2 gives 5 for 3, not 6, so it is out.' },
  ],
};

/** Card 3: feeding 2 again. */
export const MACHINE_AGAIN: MachineScene = {
  kind: 'machine',
  stated: STATED,
  candidates: TWO,
  rows: [{ input: 2, output: 4 }, { input: 2, output: 4, at: 1, outAt: 2 }],
  steps: [
    { label: 'Feed 2 again', say: '2 goes in again.' },
    { label: 'Read the output', say: '4 again. Both rules said 4, so it could not come out any other way.' },
    { label: 'No news', say: 'A test that can’t come out two ways can’t pick a rule.' },
  ],
};

/** Card 4: the winner wins only among the listed candidates. */
export const MACHINE_LIMIT: MachineScene = {
  kind: 'machine',
  stated: STATED,
  candidates: TWO,
  ruledOut: [{ rule: 'add 2', at: 1 }],
  rows: [{ input: 2, output: 4 }, { input: 3, output: 6 }],
  steps: [
    { label: 'Rule out add 2', say: 'Add 2 broke on 3. It is out.' },
    { label: 'Keep double', say: 'Double fits every row. It wins among these two rules.' },
    { label: 'Know the limit', say: 'A rule we did not list might fit too. The test only picks among the listed rules.' },
  ],
};

/** Card 5: run "times 2, then add 1" backwards from 17. */
export const MACHINE_BACK: MachineScene = {
  kind: 'machine',
  rule: 'times 2, then add 1',
  stated: 'The machine takes whole numbers.',
  rows: [{ input: 8, output: 17, inAt: 3 }],
  steps: [
    { label: 'Out came 17', say: 'The last step was add 1. Undo it first: 17 take away 1 is 16.' },
    { label: 'Undo times 2', say: '2 times what is 16? 2 times 8 is 16.' },
    { label: 'Check', say: '8 went in. Check: 2 times 8 is 16, plus 1 is 17. It fits.' },
  ],
};

export function machineIdeas(): IdeaCard[] {
  return [
    {
      title: 'Two rules fit',
      scene: MACHINE_TWO,
      body: [
        'A function machine does the same thing to every input. This one uses one of two rules: add 2, or double.',
        'Notice what happens when 2 goes in. Test each rule against the row.',
      ],
    },
    {
      title: 'Pick an input that splits them',
      scene: MACHINE_SPLIT,
      body: [
        'Before you feed the machine, work out each rule’s output in your head.',
        'A separating input is one where the rules give different outputs. Only that test can pick a rule.',
      ],
    },
    {
      title: 'Feeding 2 again',
      scene: MACHINE_AGAIN,
      body: ['Feeding 2 again tells you nothing new. Both rules give 4 for 2, so the answer can’t pick one.'],
    },
    {
      title: 'The winner, among these rules',
      scene: MACHINE_LIMIT,
      body: [
        'The machine was said to use one of these two rules. So double wins.',
        'That is the limit of the test. If any rule were allowed, other rules could fit both rows too.',
      ],
    },
    {
      title: 'Run it backwards',
      scene: MACHINE_BACK,
      body: [
        'To run a machine backwards, undo its steps in reverse order: the last step first.',
        'This works because each whole number in gives its own output. Only one input can give 17.',
      ],
    },
  ];
}

const yesNo = (id: string, label: string, answer: 'yes' | 'no', why: string) => ({
  id,
  label,
  options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
  answer,
  why: { [answer === 'yes' ? 'no' : 'yes']: why },
});

/** Board 1 (full scaffold): card 1's machine. Input 2 is worked; test inputs 3 and 5 against both rules. */
export function testBoard(id: string): DrillStep {
  const row = (x: number) => {
    const a = x + 2, d = 2 * x;
    return {
      id: `in${x}`,
      label: `Input ${x}`,
      marks: [
        numberMark(`${id}-a${x}`, 'Add 2 gives', a, [{ value: d, why: `${d} is double. Add 2 means ${x} plus 2: ${a}.` }]),
        numberMark(`${id}-d${x}`, 'Double gives', d, [{ value: a, why: `${a} is add 2. Double means 2 times ${x}: ${d}.` }]),
        yesNo(`${id}-s${x}`, 'Splits the rules?', 'yes', `${a} and ${d} are different, so input ${x} splits the rules.`),
      ],
    };
  };
  return {
    id,
    title: 'Test some inputs',
    body: ['This is the machine from the example. Input 2 is worked for you.', 'For each new input, work out both rules. Then mark whether it splits them.'],
    scene: MACHINE_TWO,
    afterCard: 0,
    scaffold: 'full',
    steps: ['Work out add 2.', 'Work out double.', 'Different outputs? Then the input splits them.'],
    stepsLabel: 'Test an input',
    rows: [
      { id: 'in2', label: 'Input 2', marks: [givenMark(`${id}-a2`, 'Add 2 gives', '4', ['3']), givenMark(`${id}-d2`, 'Double gives', '4', ['3']), { ...yesNo(`${id}-s2`, 'Splits the rules?', 'no', ''), given: true, why: {} }], note: 'Both give 4, so input 2 can’t split them.' },
      row(3),
      row(5),
    ],
    done: 'Right. Inputs 3 and 5 give different outputs, so either one can pick the rule. Input 2 can’t.',
  };
}

/** Board 2 (light): a twin of card 5, "times 3, then add 2", run back from 20. */
export function backBoard(id: string): DrillStep {
  const r: Rule & { t: 'timesAdd' } = { t: 'timesAdd', a: 3, b: 2 };
  const y = apply(r, 6);
  return {
    id,
    title: 'Undo the steps',
    body: ['A new machine: times 3, then add 2. It takes whole numbers. Out came 20.', 'Undo the last step first, then the first step. Then check.'],
    scene: { kind: 'machine', rule: ruleWords(r), stated: 'The machine takes whole numbers.', rows: [{ input: null, output: y }] },
    twin: 'A twin of the example: the rule is times 3, then add 2, and out came 20.',
    rows: [
      {
        id: 'undo',
        label: 'Out came 20',
        marks: [
          numberMark(`${id}-u1`, 'Undo add 2 first', 18, [{ value: 22, why: '22 adds 2 more. To undo add 2, take 2 away: 18.' }]),
          numberMark(`${id}-u2`, 'Then 3 times what makes 18?', 6, [
            { value: 54, why: '54 is 3 times 18: that runs the machine forward. 3 times 6 is 18.' },
            { value: 15, why: '15 is 18 take away 3. Ask instead: 3 times what is 18? 6.' },
          ]),
        ],
      },
      { id: 'check', label: 'Check forward', marks: [numberMark(`${id}-c`, 'In goes 6. Out comes', 20, [{ value: 24, why: '3 times 6 is 18, plus 2 is 20, not 24.' }])] },
    ],
    done: 'Right. 6 went in: 3 times 6 is 18, plus 2 is 20.',
  };
}

/**
 * Board 3 (light): build the rule from parts. A hidden "times 3, then add 2" machine shows inputs 1, 2 and 3. The
 * gap between outputs is the times part; the first row then gives the add part; a forward run checks every row.
 */
export function buildBoard(id: string): DrillStep {
  const r: Rule & { t: 'timesAdd' } = { t: 'timesAdd', a: 3, b: 2 };
  const [y1, y2, y3] = [1, 2, 3].map((x) => apply(r, x));
  return {
    id,
    title: 'Build the rule',
    body: ['A new machine does two steps: times a number, then add a number. Its rule is hidden.', 'Build the rule from its two parts. Then check it on every row.'],
    scene: { kind: 'machine', stated: 'This machine does times a number, then adds a number.', rows: [{ input: 1, output: y1 }, { input: 2, output: y2 }, { input: 3, output: y3 }] },
    twin: 'A new machine: its rule is hidden, and you build it from a times part and an add part.',
    afterCard: 3,
    steps: ['Find the gap between outputs.', 'The gap is the times part.', 'Use row 1 to find the add part.', 'Check every row.'],
    stepsLabel: 'Build a rule from parts',
    rows: [
      {
        id: 'gap',
        label: 'From row to row',
        marks: [
          numberMark(`${id}-g`, 'The outputs go up by', 3, [
            { value: 2, why: `2 is not the gap. The outputs go ${y1}, ${y2}, ${y3}: each is 3 more than the one before.` },
            { value: y1, why: `${y1} is the first output, not the gap. ${y1} to ${y2} is 3 more, and ${y2} to ${y3} is 3 more.` },
          ]),
        ],
      },
      {
        id: 'parts',
        label: 'Build the rule',
        marks: [
          numberMark(`${id}-t`, 'Times', 3, [
            { value: 2, why: 'Times 2 grows by 2 each row, but these outputs grow by 3. When the input goes up by 1, the times part is the gap: 3.' },
            { value: y1, why: `Times ${y1} grows by ${y1} each row, but these outputs grow by 3. So the times part is 3.` },
          ]),
          numberMark(`${id}-a`, 'Then add', 2, [
            { value: 3, why: `Times 3, then add 3 turns 1 into 6, but the table says ${y1}. 3 times 1 is 3, and 2 more makes ${y1}.` },
            { value: y1, why: `${y1} is the whole output for 1. 3 times 1 is 3 already, so add only 2.` },
          ]),
        ],
      },
      {
        id: 'check',
        label: 'Check row 3',
        marks: [
          numberMark(`${id}-c`, 'Times 3, then add 2, turns 3 into', y3, [
            { value: 9, why: `9 is 3 times 3, but the rule adds 2 after: ${y3}. The table says ${y3} too.` },
            { value: 15, why: `15 adds 2 first, then times 3. The rule says times first: 3 times 3 is 9, plus 2 is ${y3}.` },
          ]),
        ],
      },
    ],
    done: `Right. The gap of 3 is the times part. 3 times 1 is 3, and add 2 makes ${y1}. Times 3, then add 2 fits every row.`,
  };
}
