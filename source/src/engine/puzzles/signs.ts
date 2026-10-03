/**
 * Treasure signs (Smullyan-style). Three boxes, the treasure is in exactly one, each box has a sign,
 * and a rule says which signs tell the truth. The engine tries the treasure in each box, keeps only
 * puzzles where exactly one box fits the rule, and writes the explanation from that case check.
 */
import { syncWhyWrong } from '../teach';
import type { CaseStep, CaseVerdict, ChoiceFeedback, DrillMark, DrillRow, DrillStep, IdeaCard, Rng, Scene, SignBox, Teach, TeachCase, Truth } from '../types';
import type { ItemCore, Made } from './statements';

export type SignRule = 'one' | 'two' | 'none' | 'owner';
export const SIGN_RULES: readonly SignRule[] = ['one', 'two', 'none', 'owner'];

/** here: "is in this box". in/notIn: "is (not) in box x" (x is never the sign's own box). */
export type Sign = { t: 'here' } | { t: 'notHere' } | { t: 'in'; x: number } | { t: 'notIn'; x: number };

export interface SignPuzzle {
  signs: Sign[];
  rule: SignRule;
  /** Index of the one box that fits. */
  answer: number;
}

export function signHolds(sign: Sign, owner: number, treasure: number): boolean {
  switch (sign.t) {
    case 'here': return treasure === owner;
    case 'notHere': return treasure !== owner;
    case 'in': return treasure === sign.x;
    case 'notIn': return treasure !== sign.x;
  }
}

/** Indexes of the signs that are true when the treasure is in box `treasure`. */
export function trueSigns(signs: readonly Sign[], treasure: number): number[] {
  return signs.flatMap((s, i) => (signHolds(s, i, treasure) ? [i] : []));
}

export function fitsRule(signs: readonly Sign[], rule: SignRule, treasure: number): boolean {
  const ts = trueSigns(signs, treasure);
  switch (rule) {
    case 'one': return ts.length === 1;
    case 'two': return ts.length === 2;
    case 'none': return ts.length === 0;
    case 'owner': return ts.length === 1 && ts[0] === treasure;
  }
}

/** Every box the treasure could be in. A good puzzle has exactly one. */
export function solutions(signs: readonly Sign[], rule: SignRule): number[] {
  return signs.map((_, t) => t).filter((t) => fitsRule(signs, rule, t));
}

function randomSign(rng: Rng, owner: number, boxes: number): Sign {
  const others = Array.from({ length: boxes }, (_, i) => i).filter((i) => i !== owner);
  switch (rng.int(0, 3)) {
    case 0: return { t: 'here' };
    case 1: return { t: 'notHere' };
    case 2: return { t: 'in', x: rng.pick(others) };
    default: return { t: 'notIn', x: rng.pick(others) };
  }
}

/** A random puzzle with exactly one answer. */
export function makeSignPuzzle(rng: Rng, rule?: SignRule): SignPuzzle {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const r = rule ?? rng.pick(SIGN_RULES);
    const signs = [0, 1, 2].map((i) => randomSign(rng, i, 3));
    const sol = solutions(signs, r);
    if (sol.length === 1) return { signs, rule: r, answer: sol[0] };
  }
  throw new Error('makeSignPuzzle: no puzzle found');
}

// ---------- words ----------

export type SignSkin = 'chest' | 'door' | 'cave' | 'box';
export const SIGN_SKINS: readonly SignSkin[] = ['chest', 'door', 'cave', 'box'];

interface SkinWords {
  noun: string;
  /** "chests", "boxes": the plural, written out (not noun + "s"). */
  nouns: string;
  item: string;
  prep: 'in' | 'behind';
  short: [string, string, string];
  ask: string;
}

const SKINS: Record<SignSkin, SkinWords> = {
  chest: { noun: 'chest', nouns: 'chests', item: 'treasure', prep: 'in', short: ['Gold', 'Silver', 'Bronze'], ask: 'Which chest has the treasure?' },
  door: { noun: 'door', nouns: 'doors', item: 'prize', prep: 'behind', short: ['Red', 'Blue', 'Green'], ask: 'Which door has the prize behind it?' },
  cave: { noun: 'cave', nouns: 'caves', item: 'dragon egg', prep: 'in', short: ['Ice', 'Fire', 'Moss'], ask: 'Which cave has the dragon egg?' },
  box: { noun: 'box', nouns: 'boxes', item: 'prize', prep: 'in', short: ['A', 'B', 'C'], ask: 'Which box has the prize?' },
};

const NUM = ['no', 'one', 'two', 'three'];

/** Everything a puzzle says, in one skin. */
export function signWords(skin: SignSkin) {
  const w = SKINS[skin];
  const isBox = skin === 'box';
  /** "Gold chest", "Box A". */
  const name = (i: number) => (isBox ? `Box ${w.short[i]}` : `${w.short[i]} ${w.noun}`);
  /** "the Gold chest", "Box A". */
  const the = (i: number) => (isBox ? name(i) : `the ${name(i)}`);
  /** "the Gold chest sign", "the sign on Box A". */
  const signOf = (i: number) => (isBox ? `the sign on ${name(i)}` : `the ${name(i)} sign`);
  /** "the Gold and Silver chest signs", "the signs on Box A and Box B". */
  const signList = (ids: number[]): string => {
    if (ids.length === 1) return signOf(ids[0]);
    if (ids.length === 3) return 'all three signs';
    const [a, b] = ids;
    return isBox ? `the signs on ${name(a)} and ${name(b)}` : `the ${w.short[a]} and ${w.short[b]} ${w.noun} signs`;
  };
  const signText = (s: Sign): string => {
    switch (s.t) {
      case 'here': return `The ${w.item} is ${w.prep} this ${w.noun}.`;
      case 'notHere': return `The ${w.item} is not ${w.prep} this ${w.noun}.`;
      case 'in': return `The ${w.item} is ${w.prep} ${the(s.x)}.`;
      case 'notIn': return `The ${w.item} is not ${w.prep} ${the(s.x)}.`;
    }
  };
  const ruleText = (r: SignRule): string => {
    switch (r) {
      case 'one': return 'Exactly one sign is true.';
      case 'two': return 'Exactly two signs are true.';
      case 'none': return 'Every sign is false.';
      case 'owner': return `The sign on the ${w.noun} with the ${w.item} is true. The other signs are false.`;
    }
  };
  return { ...w, name, the, signOf, signList, signText, ruleText };
}

const needCount: Record<Exclude<SignRule, 'owner'>, number> = { one: 1, two: 2, none: 0 };

/** "one sign true", "all three signs true". */
const madeTrue = (n: number) => (n === 3 ? 'all three signs true' : `${NUM[n]} sign${n === 1 ? '' : 's'} true`);
/** "no sign would be true", "two signs would be true". */
const wouldBeTrue = (n: number) => (n === 3 ? 'all three signs would be true' : `${NUM[n]} sign${n === 1 || n === 0 ? '' : 's'} would be true`);

/** "Only the Silver chest makes exactly one sign true" (no final period). */
function onlyFits(p: SignPuzzle, w: ReturnType<typeof signWords>): string {
  if (p.rule === 'owner') return `Only ${w.the(p.answer)} fits the rule`;
  const need = p.rule === 'none' ? 'every sign false' : `exactly ${madeTrue(needCount[p.rule])}`;
  return `Only ${w.the(p.answer)} makes ${need}`;
}

/** "Only the Silver chest makes exactly one sign true. So the treasure is in the Silver chest." */
export function signConclusion(p: SignPuzzle, skin: SignSkin): string {
  const w = signWords(skin);
  return `${onlyFits(p, w)}. So the ${w.item} is ${w.prep} ${w.the(p.answer)}.`;
}

/** The case check as a short explanation (3 sentences at most). */
export function explainSigns(p: SignPuzzle, skin: SignSkin): string {
  const w = signWords(skin);
  const [b1, b2] = [0, 1, 2].filter((b) => b !== p.answer);
  const end = `${onlyFits(p, w)}, so the ${w.item} is ${w.prep} it.`;
  if (p.rule === 'owner') {
    const why = [b1, b2].map((b, i) => {
      const where = i === 0 ? `If the ${w.item} were ${w.prep} ${w.the(b)}` : `If it were ${w.prep} ${w.the(b)}`;
      if (!signHolds(p.signs[b], b, b)) return `${where}, ${w.signOf(b)} would be false.`;
      const others = trueSigns(p.signs, b).filter((i) => i !== b);
      return `${where}, ${w.signList(others)} would be true too.`;
    });
    return `${why.join(' ')} ${end}`;
  }
  const n1 = trueSigns(p.signs, b1).length, n2 = trueSigns(p.signs, b2).length;
  return `With the ${w.item} ${w.prep} ${w.the(b1)}, ${wouldBeTrue(n1)}. With it ${w.prep} ${w.the(b2)}, ${wouldBeTrue(n2)}. ${end}`;
}

/** What goes wrong if the treasure were in box b (b is not the answer). */
export function whyNotBox(p: SignPuzzle, skin: SignSkin, b: number): string {
  const w = signWords(skin);
  const where = `If the ${w.item} were ${w.prep} ${w.the(b)}`;
  const ts = trueSigns(p.signs, b);
  if (p.rule === 'owner') {
    if (!signHolds(p.signs[b], b, b)) return `${where}, ${w.signOf(b)} would be false. But the rule says the sign on the ${w.noun} with the ${w.item} is true.`;
    const others = ts.filter((i) => i !== b);
    return `${where}, ${w.signList(others)} would be true too. But the rule says the other signs are false.`;
  }
  const first = ts.length === 0 ? `${where}, no sign would be true.` : `${where}, ${ts.length === 1 ? 'only ' : ''}${w.signList(ts)} would be true.`;
  if (p.rule === 'none') return `${first} But the rule says every sign is false.`;
  const n = needCount[p.rule];
  const count = ['zero', 'one', 'two', 'three'][ts.length];
  return `${first} That makes ${count} true sign${ts.length === 1 ? '' : 's'}, not ${NUM[n]}.`;
}

export function signBoxes(p: SignPuzzle, skin: SignSkin): SignBox[] {
  const w = signWords(skin);
  return p.signs.map((s, i) => ({ id: `b${i + 1}`, name: w.name(i), sign: w.signText(s) }));
}

/**
 * A sign that says the treasure is NOT in the box that has it. Trusting that sign points away from the
 * answer, so the item counts as a conflict item.
 */
export function signDeniesAnswer(p: SignPuzzle): boolean {
  return p.signs.some((s, i) => (s.t === 'notHere' && i === p.answer) || (s.t === 'notIn' && s.x === p.answer));
}

/** A made sign item, plus the puzzle behind it (for tests). */
export interface SignMade extends Made {
  puzzle: SignPuzzle;
  skin: SignSkin;
}

export interface SignItemOptions {
  skin: SignSkin;
  rule?: SignRule;
  /** A fixed puzzle (a frozen first quiz, or a twin of the worked example) instead of a random one. */
  puzzle?: SignPuzzle;
}

// ---------- teaching after a wrong answer ----------
//
// The cases are the three places the treasure could be. For each one, every sign's truth comes from signHolds()
// and the rule's from fitsRule(), so the cards show exactly what the engine checked.

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const tv = (v: boolean) => (v ? 'true' : 'false');
const signCount = (n: number) => `${n} true sign${n === 1 ? '' : 's'}`;

/** What the rule says about the right box, in plain words. */
function ruleMeaning(rule: SignRule, w: ReturnType<typeof signWords>): string {
  switch (rule) {
    case 'one': return `The rule says exactly one sign is true. So with the ${w.item} ${w.prep} the right ${w.noun}, 1 sign is true and 2 signs are false.`;
    case 'two': return `The rule says exactly two signs are true. So with the ${w.item} ${w.prep} the right ${w.noun}, 2 signs are true and 1 sign is false.`;
    case 'none': return `The rule says every sign is false. So with the ${w.item} ${w.prep} the right ${w.noun}, no sign is true.`;
    case 'owner': return `The rule says the sign on the ${w.noun} with the ${w.item} is true. The signs on the other two ${w.nouns} are false.`;
  }
}

function ruleTerm(rule: SignRule, w: ReturnType<typeof signWords>): { word: string; meaning: string } {
  switch (rule) {
    case 'one': return { word: '“Exactly one”', meaning: '1, no more and no fewer.' };
    case 'two': return { word: '“Exactly two”', meaning: '2, no more and no fewer.' };
    case 'none': return { word: '“Every sign is false”', meaning: 'no sign is true. The number of true signs is 0.' };
    case 'owner': return { word: '“The other signs”', meaning: `the signs on the two ${w.nouns} without the ${w.item}.` };
  }
}

/** Why the rule fits, or does not fit, with the treasure in box b. Numbers are counted from signHolds(). */
export function signCaseNote(p: SignPuzzle, skin: SignSkin, b: number): string {
  const w = signWords(skin);
  const ts = trueSigns(p.signs, b);
  const fit = fitsRule(p.signs, p.rule, b);
  if (p.rule === 'owner') {
    const own = ts.includes(b);
    const others = ts.filter((i) => i !== b);
    if (fit) return `${cap(w.signOf(b))} is true, and the other two signs are false. This fits the rule.`;
    if (!own) return `${cap(w.signOf(b))} is false. The rule needs it to be true.`;
    return `${cap(w.signList(others))} ${others.length === 1 ? 'is' : 'are'} true too. The rule needs the other signs to be false.`;
  }
  const need = p.rule === 'none' ? 'every sign to be false' : `exactly ${signCount(needCount[p.rule])}`;
  return `That makes ${signCount(ts.length)}. ${fit ? 'This fits the rule.' : `The rule needs ${need}.`}`;
}

/** One case: the treasure in box b, each sign true or false, and whether that fits the rule. */
export function signCase(p: SignPuzzle, skin: SignSkin, b: number): TeachCase {
  const w = signWords(skin);
  const truths: Truth[] = p.signs.map((s, i) => ({ who: cap(w.signOf(i)), value: signHolds(s, i, b) }));
  truths.push({ who: 'Fits the rule', value: fitsRule(p.signs, p.rule, b) });
  return { label: `Pretend the ${w.item} is ${w.prep} ${w.the(b)}.`, truths, note: signCaseNote(p, skin, b) };
}

/** The headline for picking box b: the gap it leaves against the rule. */
export function signHeadline(p: SignPuzzle, skin: SignSkin, b: number): string {
  const w = signWords(skin);
  const ts = trueSigns(p.signs, b);
  if (p.rule === 'owner') {
    if (!ts.includes(b)) return `Your answer makes ${w.signOf(b)} false, but the rule needs it to be true.`;
    const others = ts.filter((i) => i !== b);
    return `Your answer makes ${w.signList(others)} true too, but the rule needs ${others.length === 1 ? 'it' : 'them'} to be false.`;
  }
  if (p.rule === 'none') return `Your answer makes ${w.signList(ts)} true, but the rule says every sign is false.`;
  const many = ts.length === 0 ? 'no sign' : ts.length === 3 ? 'all three signs' : `${NUM[ts.length]} sign${ts.length === 1 ? '' : 's'}`;
  return `Your answer makes ${many} true, but the rule needs exactly ${NUM[needCount[p.rule]]}.`;
}

/** Every wrong box's explanation: what the pick means, each sign's truth there, and where the rule breaks. */
function signFeedback(p: SignPuzzle, skin: SignSkin, b: number): ChoiceFeedback {
  const w = signWords(skin);
  const each = p.signs.map((s, i) => `${w.signOf(i)} is ${tv(signHolds(s, i, b))}`);
  const detail = [
    `Your answer means the ${w.item} is ${w.prep} ${w.the(b)}.`,
    `Then ${each[0]}, ${each[1]}, and ${each[2]}.`,
    `${signCaseNote(p, skin, b)} So the ${w.item} can’t be ${w.prep} ${w.the(b)}.`,
  ];
  // A sign that points to this box can make it look right. Only the rule says which signs to trust.
  const pointer = p.signs.findIndex((s, i) => (s.t === 'here' && i === b) || (s.t === 'in' && s.x === b));
  if (pointer >= 0) detail.push(`${cap(w.signOf(pointer))} says the ${w.item} is ${w.prep} ${w.the(b)}. But signs can be false. Only the rule tells you which signs to trust.`);
  // The example card shows each sign's truth; the detail above already gives the count, so the card has no note.
  const { note: _note, ...example } = signCase(p, skin, b);
  return { headline: signHeadline(p, skin, b), detail, example };
}

/** "Explain more simply": how to check one sign, for two places the treasure could be. */
function signSimpler(p: SignPuzzle, skin: SignSkin): string[] {
  const w = signWords(skin);
  // Start with a "this chest" sign when there is one: it is the one to read with care.
  const own = p.signs.findIndex((s) => s.t === 'here' || s.t === 'notHere');
  const i = own >= 0 ? own : 0;
  const s = p.signs[i];
  const x = s.t === 'in' || s.t === 'notIn' ? s.x : i;
  const y = [0, 1, 2].find((k) => k !== x)!;
  return [
    `Look at one sign. ${cap(w.signOf(i))} says, “${w.signText(s)}”`,
    `If the ${w.item} is ${w.prep} ${w.the(x)}, this sign is ${tv(signHolds(s, i, x))}.`,
    `If the ${w.item} is ${w.prep} ${w.the(y)}, this sign is ${tv(signHolds(s, i, y))}.`,
    `Check every sign this way for each ${w.noun}. Then see which ${w.noun} fits the rule.`,
  ];
}

export function signTeach(p: SignPuzzle, skin: SignSkin): Teach {
  const w = signWords(skin);
  const terms = [
    { word: 'A true sign', meaning: `a sign that says the right thing about where the ${w.item} is.` },
    ruleTerm(p.rule, w),
  ];
  if (p.signs.some((s) => s.t === 'here' || s.t === 'notHere')) terms.push({ word: `“This ${w.noun}”`, meaning: `the ${w.noun} the sign is on.` });
  return {
    rule: `Pretend the ${w.item} is ${w.prep} each ${w.noun}, one at a time. Check which signs are true. Keep the ${w.noun} that fits the rule.`,
    terms,
    meaning: ruleMeaning(p.rule, w),
    casesTitle: `If the ${w.item} were ${w.prep} each ${w.noun}, which signs would be true?`,
    cases: [0, 1, 2].map((b) => signCase(p, skin, b)),
    remember: [
      p.rule === 'owner'
        ? `The sign on the ${w.noun} with the ${w.item} must be true. Every other sign must be false.`
        : `Try each ${w.noun}. Count the true signs. Keep the ${w.noun} that matches the rule.`,
      `Ask: “If the ${w.item} were here, which signs would be true?”`,
    ],
    simpler: signSimpler(p, skin),
  };
}

// ---------- the Do step: mark a case on the case board ----------
//
// A case is one place the treasure could be. Marking it on the case board means: tap the box (pretend the treasure
// is there), stamp each sign True or False, and Keep or Reject the box. The board counts the True stamps itself, so
// the count is never typed. Every right mark comes from signHolds() and fitsRule(), and every message for a wrong
// mark says what the sign claims and where the treasure is in that case.

const TF = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const DECIDE = [{ id: 'keep', label: 'Keep' }, { id: 'reject', label: 'Reject' }];

/** The box a sign talks about: its own box for "this box" signs, otherwise the box it names. */
const signTarget = (s: Sign, owner: number) => (s.t === 'here' || s.t === 'notHere' ? owner : s.x);

/** Why sign i is true or false with the treasure in box b: "If the treasure is in the Gold chest, the Silver chest sign is true. The treasure is not in the Silver chest." */
export function signMarkWhy(p: SignPuzzle, skin: SignSkin, i: number, b: number): string {
  const w = signWords(skin);
  const target = signTarget(p.signs[i], i);
  return `If the ${w.item} is ${w.prep} ${w.the(b)}, ${w.signOf(i)} is ${tv(signHolds(p.signs[i], i, b))}. It says, “${w.signText(p.signs[i])}” The ${w.item} ${b === target ? 'is' : 'is not'} ${w.prep} ${w.the(target)}.`;
}

/** The note for a marked case: the count, what the rule needs, and the decision. */
export function signDecision(p: SignPuzzle, skin: SignSkin, b: number): string {
  const w = signWords(skin);
  const fit = fitsRule(p.signs, p.rule, b);
  return `${signCaseNote(p, skin, b)} ${fit ? 'Keep' : 'Reject'} ${w.the(b)}.`;
}

/**
 * One case as a row of the case board: a True or False stamp on each sign (in box order), then Keep or Reject.
 * given: shown already marked (the worked case); otherwise the learner marks it.
 */
export function signCaseRow(p: SignPuzzle, skin: SignSkin, b: number, given: boolean): DrillRow {
  const w = signWords(skin);
  const n = trueSigns(p.signs, b).length;
  const fit = fitsRule(p.signs, p.rule, b);
  const id = `case${b}`;
  const marks: DrillMark[] = p.signs.map((s, i) => {
    const value = signHolds(s, i, b);
    return {
      id: `${id}-sign${i}`,
      label: cap(w.signOf(i)),
      options: TF,
      answer: tv(value),
      on: i,
      ...(given ? { given: true } : {}),
      why: { [tv(!value)]: signMarkWhy(p, skin, i, b) },
    };
  });
  const need = p.rule === 'owner' ? `${w.signOf(b)} to be the only true sign` : p.rule === 'none' ? 'every sign to be false' : `exactly ${needCount[p.rule]} true sign${needCount[p.rule] === 1 ? '' : 's'}`;
  marks.push({
    id: `${id}-decide`,
    label: `Keep or reject ${w.the(b)}?`,
    options: DECIDE,
    answer: fit ? 'keep' : 'reject',
    ...(given ? { given: true } : {}),
    why: fit
      ? { reject: `The rule needs ${need}. This case has that. So keep ${w.the(b)}.` }
      : { keep: `The rule needs ${need}. This case has ${n} true sign${n === 1 ? '' : 's'}${p.rule === 'owner' && n === 1 ? `, but it is not ${w.signOf(b)}` : ''}. So reject ${w.the(b)}.` },
  });
  return { id, label: `Pretend the ${w.item} is ${w.prep} ${w.the(b)}.`, marks, note: signDecision(p, skin, b), case: { box: b, name: w.the(b) } };
}

export interface SignDrillOptions {
  id: string;
  title: string;
  body: string[];
  /** Cases shown already marked. */
  shown: number[];
  /** Cases the learner marks, in order. */
  mark: number[];
  done: string;
  /** A twin board: what changed, in words, and the sign it changed. */
  twin?: { note: string; sign: number };
}

/** A case board on a sign puzzle: the same boxes and rule as the scene, some cases shown, some to mark. */
export function signDrill(p: SignPuzzle, skin: SignSkin, o: SignDrillOptions): DrillStep {
  const w = signWords(skin);
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: { kind: 'boxes', boxes: signBoxes(p, skin), rule: w.ruleText(p.rule) },
    ...(o.twin ? { twin: o.twin.note, changed: o.twin.sign } : {}),
    layout: 'cases',
    rows: [...o.shown.map((b) => signCaseRow(p, skin, b, true)), ...o.mark.map((b) => signCaseRow(p, skin, b, false))],
    done: o.done,
  };
}

// ---------- See: a worked example on the case board, one case per screen ----------

/** One stamp of a worked case, in one short line: "The Silver chest sign says, “…” The treasure is not in the Silver chest. So it is True." */
export function stampWhy(p: SignPuzzle, skin: SignSkin, i: number, b: number): string {
  const w = signWords(skin);
  const target = signTarget(p.signs[i], i);
  return `${cap(w.signOf(i))} says, “${w.signText(p.signs[i])}” The ${w.item} ${b === target ? 'is' : 'is not'} ${w.prep} ${w.the(target)}. So it is ${cap(tv(signHolds(p.signs[i], i, b)))}.`;
}

/** "Two signs are true", "No sign is true", "All three signs are true". */
const countSays = (n: number) => (n === 0 ? 'No sign is true' : n === 3 ? 'All three signs are true' : `${cap(NUM[n])} sign${n === 1 ? ' is' : 's are'} true`);

/** The last line of a worked case: the count, then Keep or Reject. "Two signs are true, so reject the Gold chest." */
export function caseVerdictLine(p: SignPuzzle, skin: SignSkin, b: number): string {
  const w = signWords(skin);
  const ts = trueSigns(p.signs, b);
  const fit = fitsRule(p.signs, p.rule, b);
  if (p.rule === 'owner') {
    if (fit) return `Only ${w.signOf(b)} is true, so keep ${w.the(b)}.`;
    if (!ts.includes(b)) return `${cap(w.signOf(b))} is false, so reject ${w.the(b)}.`;
    return `${cap(w.signOf(b))} is true, but so ${ts.length === 2 ? 'is another sign' : 'are the other two'}. So reject ${w.the(b)}.`;
  }
  const says = fit && p.rule !== 'none' ? `Exactly ${NUM[ts.length]} sign${ts.length === 1 ? ' is' : 's are'} true` : countSays(ts.length);
  return `${says}, so ${fit ? 'keep' : 'reject'} ${w.the(b)}.`;
}

/** The verdict a rule gives each box. */
export const caseVerdicts = (p: SignPuzzle): CaseVerdict[] => [0, 1, 2].map((b) => (fitsRule(p.signs, p.rule, b) ? 'keep' : 'reject'));

/** The case board picture of a puzzle (no case picked): its boxes and rule. */
export function caseScene(p: SignPuzzle, skin: SignSkin): Extract<Scene, { kind: 'cases' }> {
  return { kind: 'cases', rule: signWords(skin).ruleText(p.rule), boxes: signBoxes(p, skin) };
}

/**
 * The worked example as key-idea cards, one case per card on the same board: pretend the treasure is in each box in
 * turn, stamp each sign (one step at a time, each with its reason), count, then keep or cross out the box. Earlier
 * verdicts stay on the board. A last card shows every verdict: only one box is kept.
 */
export function signWalk(p: SignPuzzle, skin: SignSkin): IdeaCard[] {
  const w = signWords(skin);
  const counts = [0, 1, 2].map((b) => trueSigns(p.signs, b).length);
  const verdicts = caseVerdicts(p);
  const cases = [0, 1, 2].map((b): IdeaCard => {
    const steps: CaseStep[] = [
      ...p.signs.map((_, i) => ({ label: `Check ${w.signOf(i)}`, say: stampWhy(p, skin, i, b) })),
      { label: 'Count and decide', say: caseVerdictLine(p, skin, b) },
    ];
    return {
      title: `Example: ${w.the(b)}`,
      body: [`Pretend the ${w.item} is ${w.prep} ${w.the(b)}. Check each sign.`],
      scene: {
        ...caseScene(p, skin),
        pretend: b,
        stamps: p.signs.map((s, i) => signHolds(s, i, b)),
        counts: counts.map((n, k) => (k <= b ? n : null)),
        verdicts: verdicts.map((v, k) => (k <= b ? v : null)),
        steps,
      },
    };
  });
  return [
    ...cases,
    {
      title: `Example: only one ${w.noun} fits`,
      body: [signConclusion(p, skin)],
      scene: { ...caseScene(p, skin), counts, verdicts },
    },
  ];
}

/** The sign a twin changed (by index), and the twin note: "One sign changed. The Bronze chest sign now says, “…”" */
export function twinOf(p: SignPuzzle, twin: SignPuzzle, skin: SignSkin): { note: string; sign: number } {
  const w = signWords(skin);
  const changed = p.signs.flatMap((s, i) => (JSON.stringify(s) === JSON.stringify(twin.signs[i]) ? [] : [i]));
  if (changed.length !== 1 || p.rule !== twin.rule) throw new Error('a twin changes exactly one sign');
  const i = changed[0];
  return { note: `One sign changed. ${cap(w.signOf(i))} now says, “${w.signText(twin.signs[i])}”`, sign: i };
}

/** A thinking board for a sign question: every case blank, to mark if it helps. It is never checked. */
export function signScratch(p: SignPuzzle, skin: SignSkin): DrillStep {
  const w = signWords(skin);
  return signDrill(p, skin, {
    id: 'scratch',
    title: 'Your case board',
    body: [`Mark it if it helps. Nothing on it is checked.`, `Tap a ${w.noun}. Tap each sign to stamp True or False. Then tap Keep, or Reject to cross it out.`],
    shown: [],
    mark: [0, 1, 2],
    done: '',
  });
}

/** A marked case for the Hint: the first place the treasure is not, with every sign's truth shown. */
export function signHintCase(p: SignPuzzle, skin: SignSkin): TeachCase {
  const b = [0, 1, 2].find((x) => x !== p.answer)!;
  const c = signCase(p, skin, b);
  return { ...c, note: signDecision(p, skin, b) };
}

/**
 * Twins of a puzzle: the same boxes and rule with one sign changed, still with exactly one answer. A twin keeps
 * the board the learner marked and changes one piece, so it is a fair first quiz on the same rule.
 */
export function signTwins(p: SignPuzzle): SignPuzzle[] {
  const out: SignPuzzle[] = [];
  p.signs.forEach((_, i) => {
    const others = [0, 1, 2].filter((x) => x !== i);
    const alts: Sign[] = [{ t: 'here' }, { t: 'notHere' }, ...others.flatMap((x): Sign[] => [{ t: 'in', x }, { t: 'notIn', x }])];
    for (const alt of alts) {
      if (JSON.stringify(alt) === JSON.stringify(p.signs[i])) continue;
      const signs = p.signs.map((s, k) => (k === i ? alt : s));
      const sol = solutions(signs, p.rule);
      if (sol.length === 1) out.push({ signs, rule: p.rule, answer: sol[0] });
    }
  });
  return out;
}

/** "Which chest has the treasure?" Choices are the three boxes, in order; a choice's id is its box's id. */
export function signItem(rng: Rng, opts: SignItemOptions): SignMade {
  const p = opts.puzzle ?? makeSignPuzzle(rng, opts.rule);
  const w = signWords(opts.skin);
  const boxes = signBoxes(p, opts.skin);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const b of [0, 1, 2]) if (b !== p.answer) feedback[boxes[b].id] = signFeedback(p, opts.skin, b);
  // The hint shows one case already marked (one that is not the answer), not only the method.
  const hint = `Here is one ${w.noun}, checked for you. Check the other ${w.nouns} the same way.`;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `Read the signs and the rule. ${w.ask}`,
    scene: { kind: 'boxes', boxes, rule: w.ruleText(p.rule) },
    choices: boxes.map((b) => ({ id: b.id, label: b.name })),
    answer: boxes[p.answer].id,
    explain: explainSigns(p, opts.skin),
    feedback,
    hint,
    hintCase: signHintCase(p, opts.skin),
    teach: signTeach(p, opts.skin),
    scratch: signScratch(p, opts.skin),
  };
  syncWhyWrong(item);
  if (signDeniesAnswer(p)) item.conflict = true;
  return { tag: p.rule === 'owner' ? 'signs-owner' : 'signs-count', item, puzzle: p, skin: opts.skin };
}
