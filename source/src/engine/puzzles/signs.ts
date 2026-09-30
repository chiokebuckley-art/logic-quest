/**
 * Treasure signs (Smullyan-style). Three boxes, the treasure is in exactly one, each box has a sign,
 * and a rule says which signs tell the truth. The engine tries the treasure in each box, keeps only
 * puzzles where exactly one box fits the rule, and writes the explanation from that case check.
 */
import type { Rng, SignBox } from '../types';
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
  item: string;
  prep: 'in' | 'behind';
  short: [string, string, string];
  ask: string;
}

const SKINS: Record<SignSkin, SkinWords> = {
  chest: { noun: 'chest', item: 'treasure', prep: 'in', short: ['Gold', 'Silver', 'Bronze'], ask: 'Which chest has the treasure?' },
  door: { noun: 'door', item: 'prize', prep: 'behind', short: ['Red', 'Blue', 'Green'], ask: 'Which door has the prize behind it?' },
  cave: { noun: 'cave', item: 'dragon egg', prep: 'in', short: ['Ice', 'Fire', 'Moss'], ask: 'Which cave has the dragon egg?' },
  box: { noun: 'box', item: 'prize', prep: 'in', short: ['A', 'B', 'C'], ask: 'Which box has the prize?' },
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
}

/** "Which chest has the treasure?" Choices are the three boxes, in order. */
export function signItem(rng: Rng, opts: SignItemOptions): SignMade {
  const p = makeSignPuzzle(rng, opts.rule);
  const w = signWords(opts.skin);
  const boxes = signBoxes(p, opts.skin);
  const whyWrong: Record<string, string> = {};
  for (const b of [0, 1, 2]) if (b !== p.answer) whyWrong[boxes[b].id] = whyNotBox(p, opts.skin, b);
  const hint =
    p.rule === 'owner'
      ? `Pretend the ${w.item} is ${w.prep} one ${w.noun}. Is its sign true? Are the other signs false?`
      : `Pretend the ${w.item} is ${w.prep} one ${w.noun}. Count the true signs. Then try the next ${w.noun}.`;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `Read the signs and the rule. ${w.ask}`,
    scene: { kind: 'boxes', boxes, rule: w.ruleText(p.rule) },
    choices: boxes.map((b) => ({ id: b.id, label: b.name })),
    answer: boxes[p.answer].id,
    explain: explainSigns(p, opts.skin),
    whyWrong,
    hint,
  };
  if (signDeniesAnswer(p)) item.conflict = true;
  return { tag: p.rule === 'owner' ? 'signs-owner' : 'signs-count', item, puzzle: p, skin: opts.skin };
}

