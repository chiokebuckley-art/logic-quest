/**
 * Treasure signs (Smullyan-style). Three boxes, the treasure is in exactly one, each box has a sign,
 * and a rule says which signs tell the truth. The engine tries the treasure in each box, keeps only
 * puzzles where exactly one box fits the rule, and writes the explanation from that case check.
 */
import { syncWhyWrong } from '../teach';
import type { Because, CaseStep, CaseVerdict, ChoiceFeedback, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillRow, DrillStep, IdeaCard, Misconception, Rng, Scene, SignBox, Teach, TeachCase, Truth } from '../types';
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
  // The owner's rule: the truth comes from the sign's words in that test, never from the rule (a learner who stamps by
  // the rule would read "makes it false, but the rule needs it true" as agreement).
  if (p.rule === 'owner') {
    if (!ts.includes(b)) return `Your answer makes ${w.signOf(b)} false, from its words, but the rule needs it to be true.`;
    const others = ts.filter((i) => i !== b);
    const one = others.length === 1;
    return `Your answer makes ${w.signList(others)} true too, from ${one ? 'its' : 'their'} words, but the rule needs ${one ? 'it' : 'them'} to be false.`;
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
  // A sign that points to this box can make it look right. A sign's truth comes from its words in a test; the rule
  // only says which test to keep.
  const pointer = p.signs.findIndex((s, i) => (s.t === 'here' && i === b) || (s.t === 'in' && s.x === b));
  if (pointer >= 0) detail.push(`${cap(w.signOf(pointer))} says the ${w.item} is ${w.prep} ${w.the(b)}. But a sign can be false. Stamp it from its words in each test. Then the rule says which test to keep.`);
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

/**
 * The distinction every sign puzzle rests on: where the treasure is (the test world) is one thing; whether a sign's
 * words are true in that world is another. A box can hold the treasure while its own sign is false.
 */
/** The sign boards' "I’m confused" closing line (BoardWords.closing); other boards set their own. */
export const SIGN_CLOSING = 'Those two ideas are apart now. Back to the board: read each sign, then check its words against the test.';

export const TREASURE_VS_SIGN: Distinction = { id: 'treasure-vs-sign', a: 'Where the treasure is (the test world).', b: 'Whether a sign’s words are true in that world.' };

/**
 * The distinction every rule rests on: the rule is about the real treasure place and is checked after the stamps; a
 * stamp is what one sign's words give in this test. A test may break the rule, and breaking it is what rejects the box.
 * Taught in Treasure signs (signRuleContrastCard, signRuleStampDrill), with the owner's rule (signOwnerContrastCard).
 */
export const RULE_VS_STAMP: Distinction = { id: 'rule-vs-stamp', a: 'What the rule says about the real treasure place.', b: 'What a sign’s words give in this test.' };

/** A sign's claim with "this box" resolved: "the treasure is not in the Silver chest". */
function claimOf(p: SignPuzzle, w: ReturnType<typeof signWords>, i: number): string {
  return claimOfSign(w, p.signs[i], i);
}

/** The claim of sign `s` on box i, with "this box" resolved. */
function claimOfSign(w: ReturnType<typeof signWords>, s: Sign, i: number): string {
  return `the ${w.item} is ${s.t === 'notHere' || s.t === 'notIn' ? 'not ' : ''}${w.prep} ${w.the(signTarget(s, i))}`;
}

/** The comparison behind sign i's stamp with the treasure in box b: what it says, what the test says, and whether they agree. */
export function signBecause(p: SignPuzzle, skin: SignSkin, i: number, b: number): Because {
  const w = signWords(skin);
  return { says: cap(claimOf(p, w, i)) + '.', world: `The ${w.item} is ${w.prep} ${w.the(b)}.`, match: signHolds(p.signs[i], i, b) };
}

/** The two facts to compare before stamping sign i in box b's case, with no verdict (DrillMark.compare). */
export function signCompare(p: SignPuzzle, skin: SignSkin, i: number, b: number): { says: string; world: string } {
  const w = signWords(skin);
  return { says: cap(claimOf(p, w, i)) + '.', world: `The ${w.item} is ${w.prep} ${w.the(b)}.` };
}

/** What the rule needs, next to a case's count: "exactly 1 true sign", "no true sign", "only the Gold chest sign true". */
export function signNeeds(p: SignPuzzle, skin: SignSkin, b: number): string {
  const w = signWords(skin);
  if (p.rule === 'owner') return `only ${w.signOf(b)} true`;
  if (p.rule === 'none') return 'no true sign';
  return `exactly ${needCount[p.rule]} true sign${needCount[p.rule] === 1 ? '' : 's'}`;
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
      compare: signCompare(p, skin, i, b),
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
  return { id, label: `Pretend the ${w.item} is ${w.prep} ${w.the(b)}.`, marks, note: signDecision(p, skin, b), case: { box: b, name: w.the(b) }, needs: signNeeds(p, skin, b), needTrue: p.rule === 'owner' ? 1 : needCount[p.rule], ...(p.rule === 'owner' ? { needOn: b } : {}) };
}

/**
 * The mix-ups a wrong case board can show, with the words that teach the distinction (Misconception), in the order
 * they are checked. First the rule bent into a stamping instruction (fit-rule), then the one the chests are known to
 * cause: "the treasure is here" taken to mean "this sign is true" (own-true), and its mirror (own-false). The texts
 * follow the rule: under "every sign is false" or the owner's rule, a True stamp is not a reason to keep the box.
 */
export function signMisconceptions(skin: SignSkin, rule: SignRule = 'one'): Misconception[] {
  const w = signWords(skin);
  const check = `Read the sign’s words. Then check them against the test: where are we pretending the ${w.item} is?`;
  const ruleIs =
    rule === 'owner'
      ? `The rule is about the real ${w.item} place: that ${w.noun}’s own sign is true, and the other two are false.`
      : rule === 'none'
        ? `The rule is about the real ${w.item} place: there, every sign is false.`
        : `The rule is about the real ${w.item} place: there, exactly ${NUM[needCount[rule]]} sign${needCount[rule] === 1 ? ' is' : 's are'} true.`;
  const compare =
    rule === 'owner'
      ? `Look at which sign is True, not only how many. Part 1: is this ${w.noun}’s own sign True? Part 2: are the other two False? If either part fails, reject the ${w.noun}.`
      : rule === 'none'
        ? `The rule needs no True stamp at all. If even one sign is True in this test, reject the ${w.noun}.`
        : `The rule says how many signs must be true. If the count is not that number, reject the ${w.noun}.`;
  return [
    {
      id: 'fit-rule',
      when: 'fit-rule',
      text: `You may be using the rule to set the stamps. A stamp comes from the sign’s words only: do they fit this test? ${ruleIs} It is checked after the stamps, never used to change them. If the stamps do not fit the rule, that is the answer: reject this ${w.noun}.`,
    },
    {
      id: 'own-true',
      when: 'own-true',
      // Under the owner's rule the real treasure box's sign IS true, so "a box can have the treasure while its sign is
      // false" would contradict the rule banner over the board. There the belief is the rule used as a stamp.
      text:
        rule === 'owner'
          ? `You may be treating the rule and this ${w.noun}’s stamp as the same thing. They are two different things: the rule is about the real ${w.item} ${w.noun}, and it is checked after the stamps. Stamp this ${w.noun}’s sign from its words only. If they do not fit the test, it is False, and part 1 of the rule fails.`
          : `You may be treating “the ${w.item} is ${w.prep} this ${w.noun}” and “this ${w.noun}’s sign is true” as the same thing. They are two different things. A ${w.noun} can have the ${w.item} while its sign is false. ${check}`,
    },
    {
      id: 'own-false',
      when: 'own-false',
      // The mirror of own-true: the treasure here taken to make its own sign false (after "a chest can have the
      // treasure while its sign is false", or a rule bent into stamps).
      text: `You may be treating “the ${w.item} is ${w.prep} this ${w.noun}” and “this ${w.noun}’s sign is false” as the same thing. They are two different things. Where the ${w.item} is does not make a sign false. In this test the ${w.item} is here, and this sign’s words fit that, so the sign is true, whatever the rule says. ${check}`,
    },
    {
      id: 'verdict-only',
      when: 'verdict-only',
      text: `Your stamps are right. Now compare them with the rule. ${compare}`,
    },
    {
      id: 'copied',
      when: 'copied',
      text: `These stamps match a different test. A sign can be true in one test and false in the next, because the ${w.item} moved. Check each sign again against this test: where is the ${w.item} now?`,
    },
    {
      id: 'all-one',
      when: 'all-one',
      text: `A stamp is about one sign’s words, not about the ${w.noun}. Pretending the ${w.item} is here does not make every sign true, or every sign false. Read each sign on its own and check its words against the test.`,
    },
  ];
}

/**
 * The "I’m confused" questions for a sign board, one per distinction: the treasure's place vs a sign's truth, the rule
 * vs the stamps, and a sign's truth in one test vs the next. Each finds one merged idea and teaches it apart.
 */
export function signConfused(skin: SignSkin, rule: SignRule = 'one'): ConfusedQuestion[] {
  const w = signWords(skin);
  const ruleQ: ConfusedQuestion =
    rule === 'none'
      ? {
          q: `The rule says every sign is false. In this test, the words on one sign fit the test. How do you stamp that sign?`,
          options: [{ label: 'False, so it fits the rule' }, { label: `True. Then the rule says: reject this ${w.noun}`, right: true }, { label: 'Not sure' }],
          teach: `Stamp from the words only. A stamp says whether a sign’s words fit this test. The rule is about the real ${w.item} place, and it is checked after the stamps. A True stamp under this rule just means: reject this ${w.noun}.`,
        }
      : rule === 'owner'
        ? {
            q: `The rule says the sign on the ${w.noun} with the ${w.item} is true. In this test, the picked ${w.noun}’s own sign does not fit the test. How do you stamp it?`,
            options: [{ label: 'True, because the rule says so' }, { label: `False. Then part 1 of the rule fails: reject this ${w.noun}`, right: true }, { label: 'Not sure' }],
            teach: `Stamp from the words only. The rule does not make the own sign true; it asks whether it is. If the own sign comes out False in this test, this ${w.noun} fails the rule, so reject it.`,
          }
        : {
            q: `The rule says exactly ${NUM[needCount[rule]]} sign${needCount[rule] === 1 ? ' is' : 's are'} true. In this test, the words on ${needCount[rule] === 1 ? 'two signs' : 'all three signs'} fit the test. How do you stamp them?`,
            options: [{ label: `Only ${NUM[needCount[rule]]} True, so it fits the rule` }, { label: `All of them True. Then the rule says: reject this ${w.noun}`, right: true }, { label: 'Not sure' }],
            teach: `Stamp from the words only. A stamp says whether a sign’s words fit this test. The rule is about the real ${w.item} place, and it is checked after the stamps. Too many True stamps just means: reject this ${w.noun}.`,
          };
  // Where the treasure is decides a sign neither way: it does not make the sign true, and it does not make it false.
  // Under the owner's rule a false own sign in a test means that test fails, not that the treasure moved.
  const owner = rule === 'owner';
  const after = owner ? `Then part 1 of the rule fails, so you reject that ${w.noun}.` : `And a false sign does not move the ${w.item}: it can still be here.`;
  return [
    {
      q: `We pretend the ${w.item} is ${w.prep} one ${w.noun}. Does that decide if that ${w.noun}’s sign is true or false?`,
      options: [{ label: 'Yes: the sign must be true' }, { label: 'Yes: the sign must be false' }, { label: 'No: only its words decide, checked against the test', right: true }, { label: 'Not sure' }],
      teach: `No. Where the ${w.item} is does not make a sign true, and it does not make it false. A sign is true only when its words fit the test. ${owner ? 'In a test, a' : 'A'} ${w.noun} can have the ${w.item} while its sign says “The ${w.item} is not ${w.prep} this ${w.noun}.” That sign is false. ${after}`,
    },
    ruleQ,
    {
      q: 'Can the same sign be true in one test and false in the next test?',
      options: [{ label: 'Yes', right: true }, { label: 'No, a sign is true or false for good' }, { label: 'Not sure' }],
      teach: `Yes. Each test pretends the ${w.item} is somewhere new. The sign’s words stay the same, but the ${w.item} moved, so the words can fit one test and not the next. Stamp every sign again in every test.`,
    },
  ];
}

/** The note on the test-world line, by rule: under "every sign is false" or the owner's rule, a True stamp is still a stamp. */
export function signWorldNote(skin: SignSkin, rule: SignRule): string {
  const w = signWords(skin);
  if (rule === 'none') return `For this test only. Stamp from the words: a sign can come out True here. The rule is checked after.`;
  if (rule === 'owner') return `For this test only. Stamp each sign from its words. The rule is checked after the stamps.`;
  return `For this test only. Where the ${w.item} is does not say if a sign is true.`;
}

/** The method's steps on a full-scaffold board. The owner's rule has two parts, so its compare step names them. */
export function signSteps(skin: SignSkin, rule: SignRule): string[] {
  const w = signWords(skin);
  const pretend = `Pretend the ${w.item} is ${w.prep} one ${w.noun}`;
  if (rule === 'owner') return [pretend, 'Stamp each sign from its words', `Part 1: is this ${w.noun}’s own sign True?`, 'Part 2: are the other two signs False?', `Keep or reject the ${w.noun}`];
  if (rule === 'none') return [pretend, 'Stamp each sign: do its words fit the test?', 'Count the True stamps', 'The rule needs none. Is the count 0?', `Keep or reject the ${w.noun}`];
  return [pretend, 'Stamp each sign: do its words fit the test?', 'Count the True stamps', 'Compare the count with the rule', `Keep or reject the ${w.noun}`];
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
  /** How much of the reasoning stays on screen (DrillStep.scaffold). Default 'light'. */
  scaffold?: 'full' | 'light';
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
    ...(o.scaffold ? { scaffold: o.scaffold } : {}),
    misconceptions: signMisconceptions(skin, p.rule),
    confused: signConfused(skin, p.rule),
    distinction: TREASURE_VS_SIGN.id,
    words: { worldNote: signWorldNote(skin, p.rule), closing: SIGN_CLOSING },
    steps: signSteps(skin, p.rule),
  };
}

// ---------- the distinction: where the treasure is vs whether a sign is true ----------

/** The two panels of the contrast: the same test world, the same box, a sign that fits and one that does not. */
function contrastScene(skin: SignSkin, b: number, real: Sign): Extract<Scene, { kind: 'contrast' }> {
  const w = signWords(skin);
  const [fits, miss] = contrastSigns(b, real);
  return {
    kind: 'contrast',
    pairs: [signPanel(skin, b, fits, b), signPanel(skin, b, miss, b)],
    ask: { q: `Did the ${w.item} move?`, a: `No. Only the words on the sign changed. So where the ${w.item} is and whether a sign is true are two different things.` },
  };
}

/**
 * The key-idea card that teaches the distinction, before any case is marked: two signs on the same box, in the same
 * test world, one true and one false. The treasure never moved; the words did.
 */
export function signContrastCard(p: SignPuzzle, skin: SignSkin): IdeaCard {
  const w = signWords(skin);
  const b = p.answer;
  return {
    title: 'Two different things',
    distinction: TREASURE_VS_SIGN.id,
    body: [
      'Two things are being tested, and they are not the same.',
      `One: where we pretend the ${w.item} is. Two: whether the words on a sign fit that pretend place.`,
      `A ${w.noun} can have the ${w.item} while its own sign is false. Look at the two signs below. Same test, same ${w.noun}, different words.`,
    ],
    scene: contrastScene(skin, b, p.signs[b]),
  };
}

/**
 * The small board right after the contrast card: stamp the two signs from the picture yourself. It is the Do for the
 * distinction, so the first case board is not the first time the learner separates the two ideas.
 */
export function signDistinctionDrill(p: SignPuzzle, skin: SignSkin, id: string, afterCard: number): DrillStep {
  const w = signWords(skin);
  const b = p.answer;
  const scene = contrastScene(skin, b, p.signs[b]);
  const row = (k: 0 | 1): DrillRow => {
    const panel = scene.pairs[k];
    const value = panel.truth;
    const wrongWhy = value
      ? `${panel.who} says, “${panel.says}” The test says the ${w.item} is ${w.prep} ${w.the(b)}. The words fit the test, so this sign is true.`
      : `${panel.who} says, “${panel.says}” The test says the ${w.item} is ${w.prep} ${w.the(b)}. The words do not fit the test, so this sign is false, even though the ${w.item} is here.`;
    return {
      id: `pair${k}`,
      label: `${panel.world} ${panel.who} says, “${panel.says}”`,
      marks: [{ id: `pair${k}-stamp`, label: `${panel.who}: true or false in this test?`, options: [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }], answer: tv(value), why: { [tv(!value)]: wrongWhy } }],
    };
  };
  return {
    id,
    title: 'Stamp the two signs',
    body: [`The ${w.item} is ${w.prep} ${w.the(b)} in both tests. Read each sign’s words. Do they fit the test?`],
    scene,
    rows: [row(0), row(1)],
    afterCard,
    distinction: TREASURE_VS_SIGN.id,
    done: `Right. The ${w.item} is ${w.prep} ${w.the(b)} both times, but one sign is true and one is false. The words decide, not the ${w.item}.`,
  };
}

// ---------- the distinction: the rule vs the stamps ----------
//
// A stamp comes from one sign's words in one test. The rule is about the real treasure place: it is checked after the
// stamps, on the whole case, and a case that breaks it is rejected. Never the other way round: the rule never sets or
// changes a stamp. Every truth below comes from signHolds(), every count from trueSigns() and every verdict from
// fitsRule().

/** One contrast panel: sign `s` on box i, in the test where the treasure is in box b, with the comparison in words. */
function signPanel(skin: SignSkin, i: number, s: Sign, b: number): ContrastPanel {
  const w = signWords(skin);
  const truth = signHolds(s, i, b);
  const not = s.t === 'notHere' || s.t === 'notIn';
  return {
    world: `Test: the ${w.item} is ${w.prep} ${w.the(b)}.`,
    who: cap(w.signOf(i)),
    says: w.signText(s),
    truth,
    because: `It says ${not ? 'not ' : ''}${w.the(signTarget(s, i))}. The test says ${w.the(b)}. ${truth ? 'The words fit the test, so True.' : 'The words do not fit the test, so False.'}`,
  };
}

/** What a count rule needs, as stamps: "exactly 1 True stamp", "no True stamp". */
const needStamps = (rule: Exclude<SignRule, 'owner'>) =>
  rule === 'none' ? 'no True stamp' : `exactly ${needCount[rule]} True stamp${needCount[rule] === 1 ? '' : 's'}`;

/** The two true signs of a test that a count rule rejects (the contrast's panels), and the sign left out of them. */
function ruleCase(p: SignPuzzle, b: number): { pair: [number, number]; rest: number; rule: Exclude<SignRule, 'owner'> } {
  const ts = trueSigns(p.signs, b);
  if (p.rule === 'owner' || ts.length !== 2 || fitsRule(p.signs, p.rule, b)) throw new Error('the rule contrast needs a count rule and a test with exactly two true signs that breaks it');
  return { pair: [ts[0], ts[1]], rest: [0, 1, 2].find((k) => !ts.includes(k))!, rule: p.rule };
}

/**
 * The rule vs the stamps, for a count rule: one test (the treasure in box b) where the words make two signs true and
 * the rule wants a different count. Both are stamped True from their words; only then is the rule checked, and it
 * rejects the box. Each panel's last line says what happens next.
 */
function ruleContrastScene(p: SignPuzzle, skin: SignSkin, b: number): Extract<Scene, { kind: 'contrast' }> {
  const w = signWords(skin);
  const { pair: [i, j], rule } = ruleCase(p, b);
  const n = trueSigns(p.signs, b).length;
  return {
    kind: 'contrast',
    pairs: [
      { ...signPanel(skin, i, p.signs[i], b), then: 'Stamp it True. The rule waits until every sign is stamped.' },
      { ...signPanel(skin, j, p.signs[j], b), then: `Stamp it True too, even with the rule. That makes ${n} True stamps.` },
    ],
    ask: {
      q: 'Did the rule change a stamp?',
      a: `No. The words decide each stamp. Then the rule is checked: ${n} True stamps, but it needs ${needStamps(rule)}. So reject ${w.the(b)}.`,
    },
  };
}

/**
 * The "before you start" card: the rule is checked last. In one test the words give two True stamps under a rule that
 * wants another count; the stamps stay, and the rule rejects the box. Shown after the treasure-vs-sign contrast.
 */
export function signRuleContrastCard(p: SignPuzzle, skin: SignSkin, b: number): IdeaCard {
  const w = signWords(skin);
  const { rest } = ruleCase(p, b);
  const restFits = signHolds(p.signs[rest], rest, b);
  return {
    title: 'Before you start: stamps first, rule last',
    distinction: RULE_VS_STAMP.id,
    body: [
      `The rule says, “${w.ruleText(p.rule)}” It is checked last. First stamp each sign from its words.`,
      `If the count does not fit the rule, reject the ${w.noun}. Never change a stamp to make it fit.`,
      `Below, we pretend the ${w.item} is ${w.prep} ${w.the(b)}. The words on two signs fit that test. ${cap(w.signOf(rest))} ${restFits ? 'fits too, so it is True' : 'does not fit, so it is False'}.`,
    ],
    scene: ruleContrastScene(p, skin, b),
  };
}

/**
 * The board right after the rule card: stamp the two signs from their words, then check the rule and keep or reject
 * the box. Its misconceptions catch stamps bent to fit the rule, and a kept box with the right stamps.
 */
export function signRuleStampDrill(p: SignPuzzle, skin: SignSkin, id: string, afterCard: number, b: number): DrillStep {
  const w = signWords(skin);
  const scene = ruleContrastScene(p, skin, b);
  const { pair, rest, rule } = ruleCase(p, b);
  const ts = trueSigns(p.signs, b);
  const fit = fitsRule(p.signs, p.rule, b);
  const need = signNeeds(p, skin, b);
  const stampRow = (k: 0 | 1): DrillRow => {
    const panel = scene.pairs[k];
    const value = panel.truth;
    const test = `The test says the ${w.item} is ${w.prep} ${w.the(b)}.`;
    return {
      id: `pair${k}`,
      label: `${panel.world} ${panel.who} says, “${panel.says}”`,
      marks: [
        {
          id: `pair${k}-stamp`,
          label: `${panel.who}: True or False in this test?`,
          options: TF,
          answer: tv(value),
          why: {
            [tv(!value)]: value
              ? `${panel.who} says, “${panel.says}” ${test} The words fit the test, so this sign is True. The rule does not change a stamp.`
              : `${panel.who} says, “${panel.says}” ${test} The words do not fit the test, so this sign is False.`,
          },
          compare: signCompare(p, skin, pair[k], b),
        },
      ],
    };
  };
  const decide: DrillRow = {
    id: 'rule',
    label: `Last, check the rule: “${w.ruleText(p.rule)}” ${cap(w.signOf(rest))} is ${cap(tv(signHolds(p.signs[rest], rest, b)))} in this test.`,
    needs: need,
    marks: [
      {
        id: 'rule-decide',
        label: `Keep or reject ${w.the(b)}?`,
        options: DECIDE,
        answer: fit ? 'keep' : 'reject',
        why: fit
          ? { reject: `The rule needs ${need}. This test has that. So keep ${w.the(b)}.` }
          : { keep: `The rule needs ${need}. This test has ${signCount(ts.length)}: ${w.signList(ts)}. So reject ${w.the(b)}.` },
      },
    ],
  };
  const rows = [stampRow(0), stampRow(1), decide];
  const right = (r: DrillRow) => r.marks[0].answer;
  const flip = (v: string) => (v === 'true' ? 'false' : 'true');
  const bent = `You may be treating the rule and the stamps as the same thing. They are two different things: a stamp comes from a sign’s words, and the rule is checked after.`;
  return {
    id,
    title: 'Stamp first, then check the rule',
    body: [`The ${w.item} is ${w.prep} ${w.the(b)} in both panels. Stamp each sign from its words. Then check the rule last.`],
    scene,
    rows,
    afterCard,
    distinction: RULE_VS_STAMP.id,
    scaffold: 'full',
    steps: [`Stamp ${w.signOf(pair[0])} from its words`, `Stamp ${w.signOf(pair[1])} from its words`, 'Count the True stamps, then check the rule'],
    // A stamp bent so the count fits, with Keep; right stamps with Keep. A wrong stamp with Reject, or with no verdict
    // yet, shows no belief (the count then fits, so a learner who bent it would keep): it gets the mark's own words, which
    // already say the rule does not change a stamp.
    // The bent stamps are every way of changing the two True stamps so the count is what the rule needs (the third
    // sign is False here): one of them under “Exactly one”, both under “Every sign is false”.
    misconceptions: [
      ...([
        ['fit-rule', [right(rows[0]), flip(right(rows[1]))]],
        ['fit-rule-first', [flip(right(rows[0])), right(rows[1])]],
        ['fit-rule-both', [flip(right(rows[0])), flip(right(rows[1]))]],
      ] as const)
        .filter(([, v]) => v.filter((x) => x === 'true').length === needCount[rule])
        .map(([mid, [v0, v1]]): Misconception => ({
          id: mid,
          when: 'picks',
          picks: { 'pair0-stamp': v0, 'pair1-stamp': v1, 'rule-decide': 'keep' },
          text: `${bent} Never change a stamp to make it fit. If the True stamps break the rule, reject the ${w.noun}.`,
        })),
      {
        id: 'verdict-only',
        when: 'picks',
        picks: { 'pair0-stamp': right(rows[0]), 'pair1-stamp': right(rows[1]), 'rule-decide': fit ? 'reject' : 'keep' },
        text: `You may be treating right stamps and a kept ${w.noun} as the same thing. They are two different things: right stamps can still break the rule. Count the True stamps, then compare the count with the rule.`,
      },
    ],
    done: `Right. The words gave ${NUM[ts.length]} True stamps, and the rule did not change them. The rule needs ${need}, so ${w.the(b)} is crossed out.`,
  };
}

// ---------- the owner's rule: the rule checks the own stamp, it does not set it ----------

/**
 * The two signs of a contrast on box b, in the test where the treasure is in box b: one that fits the test ("in this
 * box"), and the sign the puzzle really has on box b when it is false there, otherwise one that names another box.
 */
function contrastSigns(b: number, real: Sign): [Sign, Sign] {
  const other = [0, 1, 2].find((k) => k !== b)!;
  return [{ t: 'here' }, signHolds(real, b, b) ? { t: 'in', x: other } : real];
}

/**
 * The owner's rule vs the stamp: the same test (the treasure in box b) twice, with two different signs on box b. One
 * fits the test, so it is True and part 1 of the rule passes; one does not, so it is False and part 1 fails. The rule
 * did not change either stamp: it checks them.
 */
function ownerContrastScene(p: SignPuzzle, skin: SignSkin, b: number): Extract<Scene, { kind: 'contrast' }> {
  if (p.rule !== 'owner') throw new Error('the owner contrast needs the owner’s rule');
  const w = signWords(skin);
  const then = (truth: boolean) =>
    truth ? `Part 1 passes: ${w.signOf(b)} is True. Next, check part 2.` : `Part 1 fails: ${w.signOf(b)} is False. Reject ${w.the(b)}.`;
  const pairs = contrastSigns(b, p.signs[b]).map((s) => {
    const panel = signPanel(skin, b, s, b);
    return { ...panel, then: then(panel.truth) };
  }) as [ContrastPanel, ContrastPanel];
  return {
    kind: 'contrast',
    pairs,
    ask: { q: 'Did the rule change the stamp?', a: 'No. The words decide the stamp. The rule decides keep or reject, after the stamps.' },
  };
}

/**
 * The owner's contrast card: the rule does not make a sign true; it checks the stamp the words give. Same test, two
 * signs on the pretend box: True passes part 1, False fails it.
 */
export function signOwnerContrastCard(p: SignPuzzle, skin: SignSkin, b: number): IdeaCard {
  const w = signWords(skin);
  return {
    title: 'The rule checks the stamp',
    distinction: RULE_VS_STAMP.id,
    body: [
      `Here is one test, two times: we pretend the ${w.item} is ${w.prep} ${w.the(b)}. Only the words on ${w.signOf(b)} change.`,
      `Stamp the sign from its words. Then part 1 of the rule checks the stamp. True passes. False fails, so you reject the ${w.noun}.`,
    ],
    scene: ownerContrastScene(p, skin, b),
  };
}

/**
 * The board right after the owner's contrast: in each test, stamp the sign on box b from its words, then say whether
 * part 1 of the rule passes. Its misconceptions catch the rule used as a stamp, and the treasure taken to make a sign false.
 */
export function signOwnerDrill(p: SignPuzzle, skin: SignSkin, id: string, afterCard: number, b: number): DrillStep {
  const w = signWords(skin);
  const scene = ownerContrastScene(p, skin, b);
  const signs = contrastSigns(b, p.signs[b]);
  const PART1 = [{ id: 'holds', label: 'Passes' }, { id: 'crashes', label: 'Fails' }];
  const test = `The test says the ${w.item} is ${w.prep} ${w.the(b)}.`;
  const row = (k: 0 | 1): DrillRow => {
    const panel = scene.pairs[k];
    const value = panel.truth;
    return {
      id: `own${k}`,
      label: `${panel.world} ${panel.who} says, “${panel.says}”`,
      marks: [
        {
          id: `own${k}-stamp`,
          label: `${panel.who}: True or False in this test?`,
          options: TF,
          answer: tv(value),
          why: {
            [tv(!value)]: value
              ? `${panel.who} says, “${panel.says}” ${test} The words fit the test, so this sign is True.`
              : `${panel.who} says, “${panel.says}” ${test} The words do not fit the test, so this sign is False, even with the rule.`,
          },
          compare: { says: cap(claimOfSign(w, signs[k], b)) + '.', world: `The ${w.item} is ${w.prep} ${w.the(b)}.` },
        },
        {
          id: `own${k}-part1`,
          label: 'Part 1 of the rule: does it pass?',
          options: PART1,
          answer: value ? 'holds' : 'crashes',
          why: value
            ? { crashes: `${panel.who} is True in this test. Part 1 needs that sign to be True, so part 1 passes.` }
            : { holds: `${panel.who} is False in this test. Part 1 needs it to be True, so part 1 fails. Reject ${w.the(b)}.` },
        },
      ],
    };
  };
  const rows = [row(0), row(1)];
  const right = (r: DrillRow) => r.marks[0].answer;
  const flip = (v: string) => (v === 'true' ? 'false' : 'true');
  /** The panel whose sign does not fit the test (part 1 fails there). */
  const failing = scene.pairs.findIndex((pp) => !pp.truth);
  return {
    id,
    title: 'Stamp it, then check part 1',
    body: [`The ${w.item} is ${w.prep} ${w.the(b)} in both tests. Stamp ${w.signOf(b)} from its words. Then check part 1 of the rule.`],
    scene,
    rows,
    afterCard,
    distinction: RULE_VS_STAMP.id,
    scaffold: 'full',
    steps: ['Stamp the first sign from its words', 'Check part 1 for the first sign', 'Stamp the second sign from its words', 'Check part 1 for the second sign'],
    misconceptions: [
      {
        // The false sign stamped True (the true one right): the rule read as "the treasure box's sign is True".
        id: 'rule-stamp',
        when: 'picks',
        picks: { 'own0-stamp': right(rows[0]), 'own1-stamp': flip(right(rows[1])) },
        text: `You may be treating the rule and the stamp as the same thing. They are two different things: the rule is about the real ${w.item} ${w.noun}, and it is checked after the stamps. Stamp from the words only. A False stamp here means part 1 fails, so reject ${w.the(b)}.`,
      },
      {
        // The true sign stamped False (the false one right): the treasure taken to make its sign false.
        id: 'here-false',
        when: 'picks',
        picks: { 'own0-stamp': flip(right(rows[0])), 'own1-stamp': right(rows[1]) },
        text: `You may be treating where the ${w.item} is and whether its sign is true as the same thing. They are two different things: only the words decide the stamp. A ${w.noun}’s own sign can be True in a test, and then part 1 passes.`,
      },
      {
        // The False sign stamped right, but part 1 passed anyway: the rule taken as already true in the test. Only on the
        // failing panel: on the passing one, Fails after a True stamp is not that belief, so the mark's own words follow.
        id: 'verdict-only',
        when: 'picks',
        picks: { [`own${failing}-stamp`]: 'false', [`own${failing}-part1`]: 'holds' },
        text: `You may be treating “the rule says it” and “this test passes” as the same thing. They are two different things: in a test, the rule is a check, and it can fail. Part 1 passes only when ${w.signOf(b)} is stamped True.`,
      },
    ],
    done: `Right. The test never moved. When ${w.signOf(b)} came out True, part 1 passed. When it came out False, part 1 failed, so you reject ${w.the(b)}. The words set the stamp. The rule checks it after.`,
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
      ...p.signs.map((_, i) => ({ label: `Check ${w.signOf(i)}`, say: stampWhy(p, skin, i, b), because: signBecause(p, skin, i, b) })),
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
    confused: signConfused(opts.skin, p.rule),
    confusedClosing: SIGN_CLOSING,
  };
  syncWhyWrong(item);
  if (signDeniesAnswer(p)) item.conflict = true;
  return { tag: p.rule === 'owner' ? 'signs-owner' : 'signs-count', item, puzzle: p, skin: opts.skin };
}
