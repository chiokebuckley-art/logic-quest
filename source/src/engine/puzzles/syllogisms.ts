/**
 * Stop 9 · All, Some, None (id s8), Lesson 5: Two givens, one picture. The engine.
 *
 * The model: three groups named by three different features of Stop 1's shape cards ("circles", "red cards", "big
 * cards"), drawn as three rings that overlap (two rings when the argument has only two groups). Every card sits in one
 * part of the rings, by its features (RingPart: a, both, b, c, ac, bc, abc, out). A placement is a set of parts that
 * hold cards, each shown by one card that sits there. An argument with givens and a claim about the groups (two givens:
 * a syllogism) is checked on every placement (256 with three rings, 16 with two): a placement is allowed when every
 * given is true there (truth() from the quantifiers engine, which uses Stop 1's statement engine, on the placement's
 * cards). The claim follows when it is true in every allowed placement. Otherwise the smallest allowed placement where
 * it is false is the case that breaks it, drawn on the rings. A part no allowed placement fills is crossed out (an
 * "all" or a "no" given rules it out); a part every allowed placement fills gets a star (a "some" given puts a card
 * there).
 *
 * The shapes (A, B and C are the first, second and third ring):
 *   chain       All A are B. All B are C. So all A are C.          follows
 *   some-chain  All A are B. Some C are A. So some C are B.        follows
 *   no-chain    No B are C. All A are B. So no A are C.            follows
 *   no-some     No B are C. Some A are B. So some A are not C.     follows
 *   middle      All A are B. All C are B. So all A are C.          does not follow (a card in A and B, not in C)
 *   turn        All A are B. So all B are A.                       does not follow (a card in B, not in A); two rings
 * Whether each one follows is worked out on the placements, never written down; the test works it out again by
 * trying every small set of real cards.
 *
 * Question kinds (skill s8.syllogism): draw (tap every card the givens allow), follows (does the claim follow? The
 * trap, tag not-forced: a claim that is true in the picture but not forced by the givens) and break (which card fits
 * the givens and breaks the claim). The See and Do pieces (cards, the contrast and the boards) are at the end.
 */
import { syncWhyWrong } from '../teach';
import type {
  BoardWords,
  Choice,
  ChoiceFeedback,
  ConfusedQuestion,
  Distinction,
  DrillRow,
  DrillStep,
  RingPart,
  Rng,
  Scene,
  Teach,
  TeachCase,
  Thing,
  Truth,
} from '../types';
import { cardName, frameFor, grp, inGroup, pred, ringName, say, sen, subj, truth, type Frame, type Group, type Q, type RingsScene, type S8Skin, type Sentence } from './quantifiers';
import { CARD, COLORS, SHAPES, SIZES, withA, type Card, type Feature, type ItemCore, type Made, type Noun } from './statements';

// ---------- the model: parts, placements and arguments ----------

/** Which rings each part is inside: the first (A), the second (B) and the third (C). */
const INSIDE: Record<RingPart, [boolean, boolean, boolean]> = {
  a: [true, false, false],
  both: [true, true, false],
  b: [false, true, false],
  ac: [true, false, true],
  abc: [true, true, true],
  bc: [false, true, true],
  c: [false, false, true],
  out: [false, false, false],
};
export const PARTS3: readonly RingPart[] = ['a', 'both', 'b', 'ac', 'abc', 'bc', 'c', 'out'];
export const PARTS2: readonly RingPart[] = ['a', 'both', 'b', 'out'];
/** The parts of a picture with this many rings. */
export const partsFor = (rings: number): readonly RingPart[] => (rings === 3 ? PARTS3 : PARTS2);
/** Is the part inside ring i (0, 1 or 2)? */
export const inRing = (p: RingPart, i: number) => INSIDE[p][i];
/** The most cards a three-ring picture draws in a part (RingsScene has a place for each). */
export const RING3_CAP: Record<RingPart, number> = { a: 2, both: 1, b: 2, ac: 1, abc: 1, bc: 1, c: 2, out: 7 };

const VALUES: Record<Feature, readonly string[]> = { shape: SHAPES, color: COLORS, size: SIZES };
const FEATURES: readonly Feature[] = ['shape', 'color', 'size'];
const keyOf = (c: Card) => `${c.size} ${c.color} ${c.shape}`;

/** The part a card sits in, by its features. */
export function partOf3(c: Card, groups: readonly Group[]): RingPart {
  const ins = groups.map((g) => inGroup(c, g));
  return partsFor(groups.length).find((p) => ins.every((v, i) => INSIDE[p][i] === v))!;
}

/** A card in one part. Without an rng it is always the same card (for teaching and for the model). */
export function cardAt(p: RingPart, groups: readonly Group[], rng?: Rng): Card {
  const pick = (vals: readonly string[]) => (rng ? rng.pick(vals) : vals[0]);
  const out = {} as Record<Feature, string>;
  for (const f of FEATURES) {
    const i = groups.findIndex((g) => g.f === f);
    if (i < 0) out[f] = pick(VALUES[f]);
    else out[f] = INSIDE[p][i] ? groups[i].v : pick(VALUES[f].filter((v) => v !== groups[i].v));
  }
  return out as unknown as Card;
}

export type SylShape = 'chain' | 'some-chain' | 'no-chain' | 'no-some' | 'middle' | 'turn';
export const SYL_SHAPES: readonly SylShape[] = ['chain', 'some-chain', 'no-chain', 'no-some', 'middle', 'turn'];
type Ring = 0 | 1 | 2;
const SHAPE_DEF: Record<SylShape, { givens: [Q, Ring, Ring][]; claim: [Q, Ring, Ring] }> = {
  chain: { givens: [['all', 0, 1], ['all', 1, 2]], claim: ['all', 0, 2] },
  'some-chain': { givens: [['all', 0, 1], ['some', 2, 0]], claim: ['some', 2, 1] },
  'no-chain': { givens: [['none', 1, 2], ['all', 0, 1]], claim: ['none', 0, 2] },
  'no-some': { givens: [['none', 1, 2], ['some', 0, 1]], claim: ['someNot', 0, 2] },
  middle: { givens: [['all', 0, 1], ['all', 2, 1]], claim: ['all', 0, 2] },
  turn: { givens: [['all', 0, 1]], claim: ['all', 1, 0] },
};
/** The shapes the lesson's quiz uses for “it follows” and for “it does not follow” (checked by the model in the test). */
export const FOLLOW_SHAPES: readonly SylShape[] = ['chain', 'some-chain', 'no-chain', 'no-some'];
export const BREAK_SHAPES: readonly SylShape[] = ['middle', 'turn'];

/** An argument about groups: the rings (two or three groups), its givens and its claim. */
export interface Syllogism {
  shape: SylShape;
  groups: Group[];
  givens: Sentence[];
  claim: Sentence;
}

export function makeSyl(shape: SylShape, groups: readonly Group[]): Syllogism {
  const d = SHAPE_DEF[shape];
  const rings = shape === 'turn' ? 2 : 3;
  const gs = groups.slice(0, rings);
  const s = ([q, x, y]: [Q, Ring, Ring]) => sen(q, gs[x], gs[y]);
  return { shape, groups: gs, givens: d.givens.map(s), claim: s(d.claim) };
}

/** Three groups on three different features, in a random order. */
export function pickGroups(rng: Rng): Group[] {
  return rng.shuffle(FEATURES).map((f) => grp(f, rng.pick(VALUES[f])));
}

/** What the model finds for an argument. */
export interface SylJudge {
  follows: boolean;
  /** Every placement the givens allow (sets of parts that hold cards). */
  allowed: RingPart[][];
  /** Parts no allowed placement fills: a given rules them out. */
  crossed: RingPart[];
  /** Parts every allowed placement fills: a "some" given puts a card there. */
  starred: RingPart[];
  /** When it does not follow: the smallest allowed placement where the claim is false. */
  breaks?: RingPart[];
}

/** The cards of a placement: one card for each part that holds cards. */
export const placementCards = (ps: readonly RingPart[], groups: readonly Group[]): Card[] => ps.map((p) => cardAt(p, groups));

/** Worked-out placements and verdicts, by argument: the same givens always give the same answer, so it is kept. */
const allowedMemo = new Map<string, RingPart[][]>();
const judgeMemo = new Map<string, SylJudge>();

/** The placements these givens allow. */
export function allowedPlacements(givens: readonly Sentence[], groups: readonly Group[]): RingPart[][] {
  const key = JSON.stringify([givens, groups]);
  let out = allowedMemo.get(key);
  if (!out) {
    const parts = partsFor(groups.length);
    const cardOf = new Map(parts.map((p) => [p, cardAt(p, groups)] as const));
    out = [];
    for (let mask = 0; mask < 1 << parts.length; mask++) {
      const ps = parts.filter((_, i) => mask & (1 << i));
      const cards = ps.map((p) => cardOf.get(p)!);
      if (givens.every((g) => truth(g, cards))) out.push(ps);
    }
    allowedMemo.set(key, out);
  }
  return out.map((ps) => [...ps]);
}

/** Does the claim follow? Checked on every placement the givens allow. */
export function judgeSyl(sy: Syllogism): SylJudge {
  const key = JSON.stringify([sy.groups, sy.givens, sy.claim]);
  let j = judgeMemo.get(key);
  if (!j) {
    const parts = partsFor(sy.groups.length);
    const allowed = allowedPlacements(sy.givens, sy.groups);
    const failing = allowed.filter((ps) => !truth(sy.claim, placementCards(ps, sy.groups)));
    const breaks = [...failing].sort((p, q) => p.length - q.length)[0];
    j = {
      follows: failing.length === 0,
      allowed,
      crossed: parts.filter((p) => !allowed.some((ps) => ps.includes(p))),
      starred: parts.filter((p) => allowed.length > 0 && allowed.every((ps) => ps.includes(p))),
      ...(breaks ? { breaks } : {}),
    };
    judgeMemo.set(key, j);
  }
  // A copy, so no caller can change what is kept.
  return { follows: j.follows, allowed: j.allowed.map((ps) => [...ps]), crossed: [...j.crossed], starred: [...j.starred], ...(j.breaks ? { breaks: [...j.breaks] } : {}) };
}

/** The ring index of a group in the argument. */
const ringOf = (sy: Syllogism, g: Group) => sy.groups.findIndex((x) => x.f === g.f && x.v === g.v);

/** The parts a sentence is about: where one card breaks it (“all”, “no”) or where one card makes it true (“some”). */
export function regionOf(sy: Syllogism, s: Sentence): RingPart[] {
  const x = ringOf(sy, s.x), y = ringOf(sy, s.y);
  const wantY = s.q === 'none' || s.q === 'some';
  return partsFor(sy.groups.length).filter((p) => inRing(p, x) && inRing(p, y) === wantY);
}

/** Does the sentence say “all” or “no” (one card can break it)? */
const isUniversal = (s: Sentence) => s.q === 'all' || s.q === 'none';

// ---------- words ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const joinAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const theCard = (t: Card) => `the ${cardName(t)}`;
const theCards = (ts: readonly Card[]) => joinAnd(ts.map(theCard));
const isOrNot = (c: Card, g: Group) => `is ${inGroup(c, g) ? '' : 'not '}${pred(g, false)}`;
const tv = (v: boolean) => (v ? 'true' : 'false');

/** A part in words, ring by ring: “a big red circle”, “a red circle that is not big”, “a big card that is not red”. */
export function partPhrase(p: RingPart, groups: readonly Group[], n: Noun = CARD): string {
  const g = (f: Feature) => groups.findIndex((x) => x.f === f);
  const ins = (f: Feature) => g(f) >= 0 && inRing(p, g(f));
  const shape = groups[g('shape')];
  const head = ins('shape') ? (n.one === CARD.one ? shape.v : `${shape.v} ${n.one}`) : n.one;
  const words = [ins('size') ? groups[g('size')].v : '', ins('color') ? groups[g('color')].v : '', head].filter(Boolean).join(' ');
  const nots = groups.filter((_, i) => !inRing(p, i)).map((x) => `not ${pred(x, false)}`);
  return `${withA(words)}${nots.length ? ` that is ${joinAnd(nots)}` : ''}`;
}

/** “given 1”, or “the given” when there is only one. */
export const givenName = (sy: Syllogism, i: number) => (sy.givens.length === 1 ? 'the given' : `given ${i + 1}`);
/** “both givens”, or “the given”. */
const allGivens = (sy: Syllogism) => (sy.givens.length === 1 ? 'the given' : 'both givens');

/** What one card would need to be to break an “all” or “no” sentence, or to make a “some” sentence true. */
function needOf(s: Sentence, n: Noun): string {
  const x = withA(subj(s.x, n, false)), y = pred(s.y, false);
  return s.q === 'all' || s.q === 'someNot' ? `${x} that is not ${y}` : `${x} that is ${y}`;
}

/** The first given (all or no) one card breaks, or -1. */
export function brokenGiven(sy: Syllogism, c: Card): number {
  return sy.givens.findIndex((g) => isUniversal(g) && !truth(g, [c]));
}

/** One card checked against one given, in words. `n`: the item's noun (“card”, “sticker”). */
function givenCheck(sy: Syllogism, i: number, c: Card, n: Noun = CARD): string {
  const g = sy.givens[i];
  const name = givenName(sy, i);
  if (!inGroup(c, g.x)) return `It is not ${pred(g.x, false)}, so ${name} says nothing about it.`;
  if (g.q === 'all') return inGroup(c, g.y) ? `It is ${pred(g.x, false)}, and it is ${pred(g.y, false)}. It fits ${name}.` : `It is ${pred(g.x, false)}, but it is not ${pred(g.y, false)}. It breaks ${name}.`;
  if (g.q === 'none') return inGroup(c, g.y) ? `It is ${pred(g.x, false)}, and it is ${pred(g.y, false)}. It breaks ${name}.` : `It is ${pred(g.x, false)}, and it is not ${pred(g.y, false)}. It fits ${name}.`;
  const kind = g.q === 'some' ? inGroup(c, g.y) : !inGroup(c, g.y);
  return kind
    ? `It is ${pred(g.x, false)}, and it ${isOrNot(c, g.y)}. It is the kind of ${n.one} ${name} needs.`
    : `It is ${pred(g.x, false)}, and it ${isOrNot(c, g.y)}. ${cap(name)} needs another kind of ${n.one}, but this one does not break it.`;
}

/** The argument as the prompt says it: “Given 1: “…” Given 2: “…” Ava’s claim: “…”” */
export function argText(sy: Syllogism, fr: Frame): string {
  const n = fr.noun;
  const gs = sy.givens.length === 1 ? [`The given: “${say(sy.givens[0], n)}”`] : sy.givens.map((g, i) => `Given ${i + 1}: “${say(g, n)}”`);
  const whose = fr.skin === 'everyday' ? `${fr.who}’s claim` : fr.skin === 'fantasy' ? `The ${fr.who}’s claim` : 'The claim';
  return `${gs.join(' ')} ${whose}: “${say(sy.claim, n)}”`;
}

/** “Ava sorts stickers into three rings: Circles, Red and Big.” */
export function intro3(fr: Frame, groups: readonly Group[]): string {
  const rings = `${groups.length === 3 ? 'three' : 'two'} rings: ${joinAnd(groups.map(ringName))}`;
  switch (fr.skin) {
    case 'abstract': return `These cards are sorted into ${rings}.`;
    case 'everyday': return `${fr.who} sorts ${fr.noun.many} into ${rings}.`;
    case 'fantasy': return `${cap(withA(fr.who))} sorts magic ${fr.noun.many} into ${rings}.`;
  }
}

/** The reason the claim follows or does not, in short lines, from the model. */
export function sylReason(sy: Syllogism, j: SylJudge, n: Noun = CARD): { short: string; lines: string[]; breaker?: RingPart; star?: RingPart } {
  const c = sy.claim;
  const phrase = (p: RingPart) => partPhrase(p, sy.groups, n);
  if (isUniversal(c)) {
    const need = `To break the claim, you need ${needOf(c, n)}.`;
    if (j.follows) {
      const lines = regionOf(sy, c).map((p) => `${cap(phrase(p))} would break it, but it breaks ${givenName(sy, brokenGiven(sy, cardAt(p, sy.groups)))}.`);
      return { short: `every ${n.one} that could break the claim breaks a given`, lines: [need, ...lines, `So no ${n.one} can break the claim. It follows.`] };
    }
    const bp = j.breaks!.find((p) => regionOf(sy, c).includes(p))!;
    return {
      short: `${phrase(bp)} fits ${allGivens(sy)} and breaks the claim`,
      breaker: bp,
      lines: [need, `${cap(phrase(bp))} is not crossed out. It fits ${allGivens(sy)}, and it breaks the claim.`, 'So the claim does not follow.'],
    };
  }
  // A “some” claim: true only if a card must sit in its region. A “some” given forces one card (a star).
  const region = regionOf(sy, c);
  if (j.follows) {
    const star = j.starred.find((p) => region.includes(p))!;
    const k = sy.givens.findIndex((g) => !isUniversal(g) && regionOf(sy, g).includes(star));
    const g = sy.givens[k];
    const others = regionOf(sy, g).filter((p) => p !== star);
    return {
      short: `${givenName(sy, k)} puts a ${n.one} where the claim needs one`,
      star,
      lines: [
        `${cap(givenName(sy, k))} needs ${needOf(g, n)}.`,
        ...others.map((p) => `It can’t be ${phrase(p)}, because that breaks ${givenName(sy, brokenGiven(sy, cardAt(p, sy.groups)))}.`),
        `So it is ${phrase(star)}. That makes the claim true. It follows.`,
      ],
    };
  }
  const left = j.breaks!;
  return {
    short: `the givens allow a picture with no ${n.one} the claim needs`,
    lines: [`The claim needs ${needOf(c, n)}.`, `The givens allow a picture with only ${joinAnd(left.map(phrase))}.`, 'There the claim is false. So it does not follow.'],
  };
}

// ---------- pictures ----------

/** The rings of an argument with these cards placed. Options: parts crossed out or starred, cards circled, cards to place. */
export function sylScene(groups: readonly Group[], things: readonly Thing[], o: { crossed?: RingPart[]; starred?: RingPart[]; marked?: string[]; loose?: Thing[]; caption?: string } = {}): RingsScene {
  const parts: Record<RingPart, Thing[]> = { a: [], both: [], b: [], ac: [], abc: [], bc: [], c: [], out: [] };
  for (const t of things) parts[partOf3(t, groups)].push(t);
  const three = groups.length === 3;
  return {
    kind: 'rings',
    rings: three ? [ringName(groups[0]), ringName(groups[1]), ringName(groups[2])] : [ringName(groups[0]), ringName(groups[1])],
    a: parts.a,
    both: parts.both,
    b: parts.b,
    out: parts.out,
    ...(three ? { c: parts.c, ac: parts.ac, bc: parts.bc, abc: parts.abc } : {}),
    ...(o.crossed?.length ? { crossed: o.crossed } : {}),
    ...(o.starred?.length ? { starred: o.starred } : {}),
    ...(o.marked?.length ? { marked: o.marked } : {}),
    ...(o.loose?.length ? { loose: o.loose } : {}),
    ...(o.caption ? { caption: o.caption } : {}),
  };
}

/** One card for each part of a placement, with ids t1, t2, … in a shuffled order. */
function pictureCards(rng: Rng, ps: readonly RingPart[], groups: readonly Group[]): Thing[] {
  const cards = ps.map((p) => cardAt(p, groups, rng));
  return rng.shuffle(cards).map((c, i) => ({ id: `t${i + 1}`, shape: c.shape, color: c.color, size: c.size }));
}

/** A picture the givens allow: 2-5 parts with cards, at least one inside the claim's first ring. */
function pickPicture(rng: Rng, sy: Syllogism, j: SylJudge, want: (ps: RingPart[]) => boolean = () => true): RingPart[] {
  const x = ringOf(sy, sy.claim.x);
  const pool = j.allowed.filter((ps) => ps.length >= 2 && ps.length <= 5 && ps.some((p) => inRing(p, x)) && want(ps));
  if (!pool.length) throw new Error(`pickPicture: no picture for ${sy.shape}`);
  return rng.pick(pool);
}

// ---------- teaching pieces ----------

export const TERM_SYLLOGISM = { word: 'A syllogism', meaning: 'an argument with two givens and a claim.' };
export const TERM_FOLLOWS = { word: 'Follows', meaning: 'must be true whenever the givens are true.' };
/** “Crossed out”, in the item's own noun. */
export const termCrossed = (n: Noun = CARD) => ({ word: 'Crossed out', meaning: `a part of the rings where no ${n.one} can be, because a given rules it out.` });
const CASE_WORDS: BoardWords = { truth: 'Yes', untruth: 'No' };

/**
 * One card checked against the givens and the claim: does it fit each “all” or “no” given, is it the kind a “some”
 * given needs, and does it break the claim (or make a “some” claim true)?
 */
function checkCase(sy: Syllogism, c: Card, note?: string, label?: string): TeachCase {
  const truths: Truth[] = [
    ...sy.givens.map((g, i) => (isUniversal(g) ? { who: `Fits ${givenName(sy, i)}`, value: truth(g, [c]) } : { who: `Is the kind ${givenName(sy, i)} needs`, value: truth(g, [c]) })),
    isUniversal(sy.claim) ? { who: 'Breaks the claim', value: !truth(sy.claim, [c]) } : { who: 'Makes the claim true', value: truth(sy.claim, [c]) },
  ];
  const k = brokenGiven(sy, c);
  return {
    label: label ?? `${cap(withA(cardName(c)))}.`,
    things: [{ id: 'case', shape: c.shape, color: c.color, size: c.size }],
    truths,
    note: note ?? (k >= 0 ? `It breaks ${givenName(sy, k)}, so it is crossed out.` : `It fits ${allGivens(sy)}, so it can be in the picture.`),
    words: CASE_WORDS,
  };
}

/** The cases that show why it follows or not: each card that could break the claim (or the card a “some” given needs). */
function reasonCases(sy: Syllogism, j: SylJudge, n: Noun): TeachCase[] {
  const c = sy.claim;
  const parts = isUniversal(c) ? regionOf(sy, c) : regionOf(sy, sy.givens.find((g) => !isUniversal(g))!);
  const cases = parts.map((p) => {
    const card = cardAt(p, sy.groups);
    const k = brokenGiven(sy, card);
    const label = `${cap(partPhrase(p, sy.groups, n))}.`;
    if (k >= 0) return checkCase(sy, card, `It breaks ${givenName(sy, k)}, so it is crossed out.`, label);
    if (isUniversal(c)) return checkCase(sy, card, `It fits ${allGivens(sy)}, and it breaks the claim. So the claim does not follow.`, label);
    const k2 = sy.givens.findIndex((g) => !isUniversal(g));
    return checkCase(sy, card, j.follows ? `${cap(givenName(sy, k2))} needs one like this, and nothing crosses it out. It makes the claim true.` : 'Nothing crosses it out.', label);
  });
  if (cases.length < 2) {
    const fit = partsFor(sy.groups.length).find((p) => !j.crossed.includes(p) && truth(c, [cardAt(p, sy.groups)]) && inRing(p, ringOf(sy, c.x)));
    if (fit) cases.push(checkCase(sy, cardAt(fit, sy.groups), `It fits ${allGivens(sy)} and the claim. One ${n.one} that fits is not enough to make the claim follow.`, `${cap(partPhrase(fit, sy.groups, n))}.`));
  }
  return cases;
}

function sylTeach(sy: Syllogism, j: SylJudge, n: Noun, r: { short: string; lines: string[] }): Teach {
  return {
    rule: `A claim follows when it is true in every picture the givens allow. Cross out each ${n.one} a given rules out. If ${withA(n.one)} left can break the claim, it does not follow.`,
    terms: [TERM_SYLLOGISM, TERM_FOLLOWS, termCrossed(n)],
    meaning: `${sy.givens.map((g, i) => `${cap(givenName(sy, i))} says ${quote(say(g, n))}`).join(' ')} The claim says ${quote(say(sy.claim, n))}`,
    casesTitle: isUniversal(sy.claim) ? `Every kind of ${n.one} that could break the claim` : `Where the ${n.one} ${givenName(sy, sy.givens.findIndex((g) => !isUniversal(g)))} needs can be`,
    cases: reasonCases(sy, j, n),
    remember: ['True in this picture is not enough. The claim must be true in every picture the givens allow.', `Ask: “Could ${withA(n.one)} fit the givens and break the claim?”`],
    simpler: [`Cross out each ${n.one} that breaks a given.`, ...r.lines],
  };
}

/** “All circles are red.” in quotes, ending a sentence. */
const quote = (s: string) => `“${s}”`;

// ---------- made items ----------

export type SylKind = 'draw' | 'follows' | 'break';

/** A made item and its model, for tests. */
export interface SylMade extends Made {
  kind: SylKind;
  syl: Syllogism;
  judge: SylJudge;
  frame: Frame;
  /** The cards in the picture (follows), or the cards offered (draw, break). */
  cards: Thing[];
}

/** The trap tag (LessonDef.pass include): a claim true in the picture but not forced by the givens. */
export const NOT_FORCED = { tag: 'not-forced', label: 'a claim that is true in the picture but does not follow' } as const;

function done(kind: SylKind, item: ItemCore, extra: Omit<SylMade, 'tag' | 'kind' | 'item'>): SylMade {
  if (item.kind === 'choose') syncWhyWrong(item);
  return { tag: 'syllogism', kind, item, ...extra };
}

/** A crossed-out card for a hint that does not decide the answer: outside the claim's region when it can be. */
function hintCard(sy: Syllogism, j: SylJudge): Card | undefined {
  const region = regionOf(sy, sy.claim);
  const p = j.crossed.find((q) => !region.includes(q)) ?? j.crossed[0];
  return p ? cardAt(p, sy.groups) : undefined;
}

/** Pick a shape and groups, and judge it. */
function argFor(rng: Rng, shape: SylShape): { sy: Syllogism; j: SylJudge } {
  const sy = makeSyl(shape, pickGroups(rng));
  return { sy, j: judgeSyl(sy) };
}

/**
 * Does the claim follow? The picture shows cards the givens allow, with the claim true in it. `trap`: a shape that does
 * not follow, so the claim is true in the picture but not forced (a conflict item). Otherwise a shape that follows,
 * unless `shape` says another.
 */
export function followsItem(rng: Rng, o: { skin: S8Skin; shape?: SylShape; trap?: boolean }): SylMade {
  const fr = frameFor(rng, o.skin);
  const n = fr.noun;
  const shape = o.shape ?? rng.pick(o.trap ? BREAK_SHAPES : FOLLOW_SHAPES);
  const { sy, j } = argFor(rng, shape);
  const claimTrue = (ps: RingPart[]) => truth(sy.claim, placementCards(ps, sy.groups));
  // The trap and every shape that follows show the claim true here; another shape may show it broken.
  const ps = pickPicture(rng, sy, j, o.trap || j.follows ? claimTrue : () => true);
  const cards = pictureCards(rng, ps, sy.groups);
  const r = sylReason(sy, j, n);
  const here = truth(sy.claim, cards);
  const right = j.follows ? 'follows' : 'not';
  const choices: Choice[] = [
    { id: 'follows', label: `It follows. It must be true when ${sy.givens.length === 1 ? 'the given is' : 'the givens are'}.` },
    { id: 'not', label: `It does not follow. A ${n.one} could fit ${allGivens(sy)} and break it.` },
  ];
  const example: TeachCase = r.breaker
    ? checkCase(sy, cardAt(r.breaker, sy.groups), 'It fits every given, and it breaks the claim.', `${cap(partPhrase(r.breaker, sy.groups, n))}.`)
    : reasonCases(sy, j, n)[0];
  const feedback: Record<string, ChoiceFeedback> = j.follows
    ? {
        not: {
          headline: `Your answer says a ${n.one} could break the claim, but ${r.short}.`,
          detail: r.lines,
          example,
        },
      }
    : {
        follows: {
          headline: `Your answer says it follows, but ${r.short}.`,
          detail: [...r.lines, ...(here ? ['The claim is true in this picture. That is not enough. It must be true in every picture the givens allow.'] : [])],
          example,
        },
      };
  const hc = hintCard(sy, j);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro3(fr, sy.groups)} ${argText(sy, fr)} Does the claim follow from ${sy.givens.length === 1 ? 'the given' : 'the two givens'}?`,
    scene: sylScene(sy.groups, cards),
    choices: rng.shuffle(choices),
    answer: right,
    feedback,
    explain: `${r.lines.join(' ')}${!j.follows && here ? ' It is true in this picture, but the givens do not force it.' : ''}`,
    ...(hc ? { hint: `Cross out the ${n.many} a given rules out. Here is one ${n.one}, checked for you.`, hintCase: checkCase(sy, hc) } : {}),
    teach: sylTeach(sy, j, n, r),
    ...(o.trap ? { tags: [NOT_FORCED.tag], conflict: true } : {}),
  };
  return done('follows', item, { syl: sy, judge: j, frame: fr, cards });
}

/** Which card fits the givens and breaks the claim? One card from each kind: the breaker, one that fits the claim, a crossed one, one the claim says nothing about. */
export function breakItem(rng: Rng, o: { skin: S8Skin; shape?: SylShape }): SylMade {
  const fr = frameFor(rng, o.skin);
  const n = fr.noun;
  const { sy, j } = argFor(rng, o.shape ?? rng.pick(BREAK_SHAPES));
  if (j.follows) throw new Error(`breakItem: ${sy.shape} follows`);
  const parts = partsFor(sy.groups.length);
  const x = ringOf(sy, sy.claim.x);
  const region = regionOf(sy, sy.claim);
  const fits = (p: RingPart) => !j.crossed.includes(p);
  const breaker = rng.pick(parts.filter((p) => fits(p) && region.includes(p)));
  const fitClaim = rng.pick(parts.filter((p) => fits(p) && inRing(p, x) && !region.includes(p)));
  const crossedPick = rng.pick(j.crossed);
  const outside = rng.pick(parts.filter((p) => fits(p) && !inRing(p, x)));
  const picked = [breaker, fitClaim, crossedPick, outside];
  const offered = picked.map((p, i) => ({ id: `c${i + 1}`, ...cardAt(p, sy.groups, rng) }));
  const hits = offered.filter((t) => brokenGiven(sy, t) < 0 && !truth(sy.claim, [t]));
  if (hits.length !== 1) throw new Error('breakItem: one card must fit the givens and break the claim');
  const answer = hits[0];
  const px = pred(sy.claim.x, false), py = pred(sy.claim.y, false);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const t of offered) {
    if (t === answer) continue;
    const k = brokenGiven(sy, t);
    const ex = checkCase(sy, t);
    if (k >= 0) feedback[t.id] = { headline: `Your ${n.one} breaks ${givenName(sy, k)}, so it can’t be in the picture.`, detail: [`${cap(theCard(t))}. ${givenCheck(sy, k, t, n)}`, `${cap(withA(n.one))} that breaks a given is crossed out. It can’t show the claim is not forced.`], example: ex };
    else if (!inGroup(t, sy.claim.x)) feedback[t.id] = { headline: `Your ${n.one} is not ${px}, so the claim says nothing about it.`, detail: [`The claim talks only about ${subj(sy.claim.x, n)}. ${cap(theCard(t))} ${isOrNot(t, sy.claim.x)}.`, `To break it, you need ${needOf(sy.claim, n)}.`], example: ex };
    else feedback[t.id] = { headline: `Your ${n.one} fits the claim, so it can’t break it.`, detail: [`${cap(theCard(t))} is ${px}, and it ${isOrNot(t, sy.claim.y)}. That fits the claim.`, `To break it, you need ${needOf(sy.claim, n)}.`], example: ex };
  }
  const helper = offered.find((t) => t !== answer && !inGroup(t, sy.claim.x)) ?? offered.find((t) => t !== answer)!;
  const r = sylReason(sy, j, n);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro3(fr, sy.groups)} ${argText(sy, fr)} The claim does not follow. Which ${n.one} fits ${allGivens(sy)} and breaks the claim?`,
    scene: sylScene(sy.groups, [], { loose: offered }),
    choices: rng.shuffle(offered).map((t) => ({ id: t.id, label: cap(theCard(t)) })),
    answer: answer.id,
    feedback,
    explain: `${cap(theCard(answer))} fits ${allGivens(sy)}. It is ${px}, but it ${sy.claim.q === 'all' ? `is not ${py}` : `is ${py}`}. So it breaks the claim, and the claim does not follow.`,
    hint: `Check each ${n.one} against ${sy.givens.length === 1 ? 'the given' : 'the givens'}, then the claim. Here is one, checked for you.`,
    hintCase: checkCase(sy, helper, brokenGiven(sy, helper) >= 0 ? undefined : `It fits ${allGivens(sy)}. Does it break the claim? Check the claim next.`),
    teach: sylTeach(sy, j, n, r),
  };
  return done('break', item, { syl: sy, judge: j, frame: fr, cards: offered });
}

/** Tap every card that can be in the picture when the givens are true. One card from each part of the rings. */
export function drawItem(rng: Rng, o: { skin: S8Skin; shape?: SylShape }): SylMade {
  const fr = frameFor(rng, o.skin);
  const n = fr.noun;
  const { sy, j } = argFor(rng, o.shape ?? rng.pick(SYL_SHAPES));
  const parts = partsFor(sy.groups.length);
  const seen = new Set<string>();
  const things: Thing[] = rng.shuffle(parts).map((p, i) => {
    let c = cardAt(p, sy.groups, rng);
    for (let k = 0; k < 12 && seen.has(keyOf(c)); k++) c = cardAt(p, sy.groups, rng);
    seen.add(keyOf(c));
    return { id: `t${i + 1}`, shape: c.shape, color: c.color, size: c.size };
  });
  const crossedUnder = (givens: Sentence[]) => {
    const allowed = allowedPlacements(givens, sy.groups);
    return parts.filter((p) => !allowed.some((ps) => ps.includes(p)));
  };
  const keep = (crossed: RingPart[]) => things.filter((t) => !crossed.includes(partOf3(t, sy.groups))).map((t) => t.id);
  const answer = keep(j.crossed);
  const crossedThings = things.filter((t) => j.crossed.includes(partOf3(t, sy.groups)));
  const they = (ts: readonly Card[]) => (ts.length === 1 ? 'It breaks' : 'They break');
  // Misreadings: a given read turned around, a “some” given read as “all”, or only one given used.
  const tries: { ids: string[]; message: string }[] = [];
  sy.givens.forEach((g, i) => {
    if (g.q === 'all') {
      const turned = sy.givens.map((h, k) => (k === i ? sen('all', g.y, g.x) : h));
      tries.push({ ids: keep(crossedUnder(turned)), message: `Your answer reads ${givenName(sy, i)} turned around. ${quote(say(g, n).replace(/\.$/, ''))} rules out ${needOf(g, n)}. It says nothing about ${withA(subj(g.y, n, false))} that is not ${pred(g.x, false)}.` });
    }
    if (g.q === 'some') {
      const asAll = sy.givens.map((h, k) => (k === i ? sen('all', g.x, g.y) : h));
      tries.push({ ids: keep(crossedUnder(asAll)), message: `Your answer reads ${givenName(sy, i)} as “all.” A “some” given crosses nothing out. It only says at least one ${n.one} is there.` });
    }
    if (sy.givens.length > 1) {
      const onlyThis = crossedUnder([g]);
      const extra = things.filter((t) => j.crossed.includes(partOf3(t, sy.groups)) && !onlyThis.includes(partOf3(t, sy.groups)));
      const other = sy.givens.findIndex((_, k) => k !== i);
      if (extra.length) tries.push({ ids: keep(onlyThis), message: `Your answer uses only ${givenName(sy, i)}. ${cap(theCards(extra))}: ${they(extra).toLowerCase()} ${givenName(sy, other)}, ${quote(say(sy.givens[other], n))}` });
    }
  });
  const key = (ids: readonly string[]) => [...ids].sort().join();
  const diagnose: { ids: string[]; message: string }[] = [];
  for (const t of tries) if (key(t.ids) !== key(answer) && !diagnose.some((d) => key(d.ids) === key(t.ids))) diagnose.push(t);
  const helper = crossedThings[0] ?? things[0];
  const cases = sy.givens.flatMap((g, i) => {
    if (!isUniversal(g)) return [];
    const p = regionOf(sy, g)[0];
    return [checkCase(sy, cardAt(p, sy.groups), `It breaks ${givenName(sy, i)}, so it is crossed out.`, `${cap(partPhrase(p, sy.groups, n))}.`)];
  });
  const okPart = parts.find((p) => !j.crossed.includes(p) && p !== 'out') ?? 'out';
  cases.push(checkCase(sy, cardAt(okPart, sy.groups), `It fits ${allGivens(sy)}, so it can be in the picture.`, `${cap(partPhrase(okPart, sy.groups, n))}.`));
  const item = {
    kind: 'tapall',
    prompt: `${intro3(fr, sy.groups)} ${argText(sy, fr)} Tap every ${n.one} that can be in the picture when ${sy.givens.length === 1 ? 'the given is' : 'both givens are'} true.`,
    scene: sylScene(sy.groups, []),
    things,
    answer,
    diagnose,
    explain: crossedThings.length
      ? `${cap(theCards(crossedThings))} ${crossedThings.length === 1 ? 'breaks a given, so it is' : 'break a given, so they are'} crossed out. Every other ${n.one} fits ${allGivens(sy)}.`
      : `No ${n.one} here breaks a given, so every one can be in the picture.`,
    hint: `Check each ${n.one} against each given. Here is one, checked for you.`,
    hintCase: checkCase(sy, helper),
    teach: {
      rule: `${cap(withA(n.one))} can be in the picture only if it fits every given. An “all” or a “no” given crosses out each ${n.one} that breaks it. A “some” given crosses nothing out.`,
      terms: [termCrossed(n), TERM_SYLLOGISM],
      meaning: sy.givens.map((g, i) => (isUniversal(g) ? `${cap(givenName(sy, i))} crosses out ${needOf(g, n)}.` : `${cap(givenName(sy, i))} crosses nothing out. It needs ${needOf(g, n)} somewhere.`)).join(' '),
      casesTitle: `${cap(n.many)} checked against ${sy.givens.length === 1 ? 'the given' : 'the givens'}`,
      cases,
      remember: [`Check one ${n.one} at a time, one given at a time.`, `Ask: “Does this ${n.one} break a given?”`],
      simpler: [`Take ${theCard(helper)}.`, ...sy.givens.map((_, i) => givenCheck(sy, i, helper, n)), `Do this for every ${n.one}. Keep each one that breaks no given.`],
    },
  } as unknown as ItemCore;
  return done('draw', item, { syl: sy, judge: j, frame: fr, cards: things });
}

// ---------- See and Do: the cards, the contrast and the boards ----------

const mk = (id: string, size: Card['size'], color: Card['color'], shape: Card['shape']): Thing => ({ id, size, color, shape });
const CIRCLES = grp('shape', 'circle');
const RED = grp('color', 'red');
const BIG = grp('size', 'big');
/** The example rings: Circles, Red and Big. */
export const L5_GROUPS: Group[] = [CIRCLES, RED, BIG];
/** “All circles are red. All red cards are big. So all circles are big.” */
export const L5_CHAIN = makeSyl('chain', L5_GROUPS);
/** “All circles are red. All big cards are red. So all circles are big.” */
export const L5_MIDDLE = makeSyl('middle', L5_GROUPS);
/** “All circles are red. So all red cards are circles.” */
export const L5_TURN = makeSyl('turn', L5_GROUPS);
/** “All circles are red. Some big cards are circles. So some big cards are red.” */
export const L5_SOME = makeSyl('some-chain', L5_GROUPS);
/** The board's twin of the chain: given 2 is “No red cards are big.” The claim stays “All circles are big.” */
export const L5_TWIN: Syllogism = { shape: 'chain', groups: L5_GROUPS, givens: [sen('all', CIRCLES, RED), sen('none', RED, BIG)], claim: sen('all', CIRCLES, BIG) };

const givensText = (sy: Syllogism) => sy.givens.map((g) => quote(say(g))).join(' ');

/** Card 1: the argument, as Stop 2 draws one. */
export function sylArgScene(): Extract<Scene, { kind: 'argument' }> {
  return { kind: 'argument', givens: L5_CHAIN.givens.map((g) => say(g)), claim: say(L5_CHAIN.claim) };
}
/** Card 2 and 3: the chain's givens drawn on the rings. */
export const sylDrawnScene = () => sylScene(L5_GROUPS, [], { crossed: judgeSyl(L5_CHAIN).crossed });
export const sylFollowsScene = () => sylScene(L5_GROUPS, [], { crossed: judgeSyl(L5_CHAIN).crossed, caption: 'Leave out the gray parts. Then Circles sits inside Red, and Red sits inside Big.' });
/** The breaker of the middle shape, as one card. */
const breakerOf = (sy: Syllogism, id: string): Thing => {
  const j = judgeSyl(sy);
  const p = j.breaks!.find((q) => regionOf(sy, sy.claim).includes(q))!;
  return { id, ...cardAt(p, sy.groups) };
};
export const L5_MIDDLE_BREAKER = breakerOf(L5_MIDDLE, 'x1');
export const L5_TURN_BREAKER = breakerOf(L5_TURN, 'x2');
export const sylBreakScene = () => sylScene(L5_GROUPS, [L5_MIDDLE_BREAKER], { crossed: judgeSyl(L5_MIDDLE).crossed, marked: [L5_MIDDLE_BREAKER.id] });
export const sylTurnScene = () => sylScene(L5_TURN.groups, [L5_TURN_BREAKER], { crossed: judgeSyl(L5_TURN).crossed, marked: [L5_TURN_BREAKER.id] });
export const sylSomeScene = () => {
  const j = judgeSyl(L5_SOME);
  return sylScene(L5_GROUPS, [], { crossed: j.crossed, starred: j.starred });
};

/** The lines of the worked examples, from the model. */
export function sylFollowsLines(): string[] {
  const r = sylReason(L5_CHAIN, judgeSyl(L5_CHAIN));
  return [`Claim: ${quote(say(L5_CHAIN.claim))} ${r.lines[0]}`, ...r.lines.slice(1)];
}
export function sylBreakLines(): string[] {
  const sy = L5_MIDDLE;
  const j = judgeSyl(sy);
  const b = L5_MIDDLE_BREAKER;
  return [
    `Givens: ${givensText(sy)} Claim: ${quote(say(sy.claim))}`,
    `Cross out the cards the givens rule out. ${cap(withA(cardName(b)))} is not crossed out. It fits both givens.`,
    `But it is ${pred(sy.claim.x, false)} that is not ${pred(sy.claim.y, false)}, so it breaks the claim. The claim does ${j.follows ? '' : 'not '}follow.`,
  ];
}
export function sylTurnLines(): string[] {
  const sy = L5_TURN;
  const j = judgeSyl(sy);
  const b = L5_TURN_BREAKER;
  return [
    `Given: ${quote(say(sy.givens[0]))} Claim: ${quote(say(sy.claim))}`,
    `The given crosses out ${needOf(sy.givens[0], CARD)}. It says nothing about ${withA(subj(sy.givens[0].y, CARD, false))} that is not ${pred(sy.givens[0].x, false)}.`,
    `${cap(withA(cardName(b)))} fits the given and breaks the claim. So turning “all” around does ${j.follows ? '' : 'not '}follow.`,
  ];
}
export function sylSomeLines(): string[] {
  const sy = L5_SOME;
  const j = judgeSyl(sy);
  const r = sylReason(sy, j);
  return [`Givens: ${givensText(sy)} Claim: ${quote(say(sy.claim))}`, 'A “some” given crosses nothing out. It puts a star where at least one card must be.', ...r.lines];
}

/** The contrast and its board: true in this picture is not the same as follows. */
export const HERE_VS_FORCED: Distinction = {
  id: 'here-vs-forced',
  a: 'True in this picture: the cards shown fit the claim.',
  b: 'Follows: the claim is true in every picture the givens allow.',
};
const HERE_A = [mk('h1', 'big', 'red', 'circle'), mk('h2', 'big', 'red', 'square')];
const HERE_B = [mk('h1', 'small', 'red', 'circle'), mk('h2', 'big', 'red', 'square')];
const cardsText = (ts: readonly Card[]) => `The cards: ${joinAnd(ts.map((t) => withA(cardName(t))))}.`;

export function hereContrast(): Extract<Scene, { kind: 'contrast' }> {
  const sy = L5_MIDDLE;
  const fitsAll = (ts: Card[]) => sy.givens.every((g) => truth(g, ts));
  if (!fitsAll(HERE_A) || !fitsAll(HERE_B)) throw new Error('hereContrast: both pictures must fit the givens');
  const claim = say(sy.claim);
  return {
    kind: 'contrast',
    pairs: [
      { world: cardsText(HERE_A), who: 'The claim', says: claim, truth: truth(sy.claim, HERE_A), because: 'Both givens fit these cards. The one circle is big, so the claim is true here.', things: HERE_A },
      { world: cardsText(HERE_B), who: 'The claim', says: claim, truth: truth(sy.claim, HERE_B), because: 'Both givens fit these cards too. But the small red circle is not big.', things: HERE_B, then: 'The givens allow it, so the claim does not follow.' },
    ],
    ask: { q: 'Did the givens change?', a: 'No. Only the cards changed. A claim follows only if it is true in every picture the givens allow.' },
    words: { worldTag: 'The cards' },
  };
}

const HERE_WORDS: BoardWords = {
  says: 'Givens',
  world: 'The cards',
  so: 'So',
  ask: 'Do the cards fit?',
  closing: 'Those two ideas are apart now. Back to the board: look for a picture the givens allow where the claim breaks.',
};
const HERE_MIX =
  'You may be treating “true in this picture” and “follows” as the same thing. They are two different things. The claim is true in some pictures. But a small red circle fits both givens and breaks it.';
const HERE_Q: ConfusedQuestion = {
  q: 'Given: “All circles are red.” A picture shows two big red circles. Must “All circles are big” be true?',
  options: [{ label: 'No. A small red circle would fit the given', right: true }, { label: 'Yes. Every circle here is big' }, { label: 'Not sure' }],
  teach: 'No. The claim is true in this picture, but the given also allows a small red circle. That card breaks the claim, so it does not follow.',
};
const FOLLOWS_OPTIONS = [{ id: 'follows', label: 'It follows' }, { id: 'not', label: 'It does not follow' }];
const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const TF = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];

/** Do, board 1: right after the contrast. Three pictures the givens allow: do the givens fit, is the claim true? Then: does it follow? */
export function hereBoard(afterCard: number): DrillStep {
  const sy = L5_MIDDLE;
  const pics: Thing[][] = [
    [mk('a1', 'big', 'red', 'circle'), mk('a2', 'small', 'red', 'square')],
    [mk('b1', 'small', 'red', 'circle'), mk('b2', 'big', 'red', 'triangle')],
    [mk('c1', 'big', 'red', 'circle'), mk('c2', 'big', 'red', 'square'), mk('c3', 'small', 'blue', 'triangle')],
  ];
  const givensSay = sy.givens.map((g, i) => `Given ${i + 1}: ${say(g)}`).join(' ');
  const rows: DrillRow[] = pics.map((ts, k) => {
    const id = `r${k + 1}`;
    const fit = sy.givens.every((g) => truth(g, ts));
    const cl = truth(sy.claim, ts);
    const breaker = ts.find((t) => inGroup(t, sy.claim.x) && !inGroup(t, sy.claim.y));
    return {
      id,
      label: `Picture ${k + 1}. ${cardsText(ts)}`,
      things: ts,
      marks: [
        {
          id: `${id}-givens`,
          label: 'Do both givens fit these cards?',
          options: YES_NO,
          answer: fit ? 'yes' : 'no',
          why: { [fit ? 'no' : 'yes']: fit ? 'Every circle here is red, and every big card here is red. So both givens fit.' : 'A card here breaks a given.' },
          compare: { says: givensSay, world: cardsText(ts) },
        },
        {
          id: `${id}-claim`,
          label: `Is ${quote(say(sy.claim).replace(/\.$/, ''))} true here?`,
          options: TF,
          answer: tv(cl),
          why: { [tv(!cl)]: cl ? 'Every circle here is big. So the claim is true in this picture.' : `${cap(theCard(breaker!))} is a circle, but it is not big. So the claim is false here.` },
          compare: { says: say(sy.claim), world: cardsText(ts) },
        },
      ],
    };
  });
  const j = judgeSyl(sy);
  rows.push({
    id: 'verdict',
    label: `Does ${quote(say(sy.claim).replace(/\.$/, ''))} follow from the givens?`,
    marks: [{ id: 'verdict', label: 'Follows or not?', options: FOLLOWS_OPTIONS, answer: j.follows ? 'follows' : 'not', why: { follows: 'Picture 2 fits both givens, and the claim is false there. So the givens do not force the claim.' } }],
  });
  return {
    id: 's8.l5-do-here',
    title: 'True here, or follows?',
    body: [`Givens: ${givensText(sy)} Claim: ${quote(say(sy.claim))}`, 'For each picture: do both givens fit? Is the claim true there?', 'Then: does the claim follow?'],
    rows,
    afterCard,
    scaffold: 'full',
    words: HERE_WORDS,
    misconceptions: [{ id: HERE_VS_FORCED.id, when: 'picks', picks: { verdict: 'follows' }, text: HERE_MIX }],
    confused: [HERE_Q],
    distinction: HERE_VS_FORCED.id,
    done: 'Right. The claim is true in two pictures, but Picture 2 breaks it. So it does not follow.',
  };
}

const DRAW_WORDS: BoardWords = {
  says: 'Givens',
  world: 'The card',
  so: 'So',
  ask: 'Does the card fit every given?',
  closing: 'Those two ideas are apart now. Back to the board: cross out each card that breaks a given.',
};

/**
 * Do, board 2: draw the givens of an argument by taps. One card for each part of the rings: can it be in the picture?
 * Then: does the claim follow? When it does not, which card breaks it?
 */
export function drawBoard(sy: Syllogism, o: { id: string; title: string; body: string[]; afterCard: number; twin?: string; scaffold?: 'full' | 'light' }): DrillStep {
  const j = judgeSyl(sy);
  const parts = partsFor(sy.groups.length);
  const givensSay = sy.givens.map((g, i) => `Given ${i + 1}: ${say(g)}`).join(' ');
  const rows: DrillRow[] = parts.map((p, k) => {
    const c: Thing = { id: `p${k + 1}`, ...cardAt(p, sy.groups) };
    const gi = brokenGiven(sy, c);
    const ok = gi < 0;
    return {
      id: c.id,
      label: cap(cardName(c)),
      things: [c],
      marks: [
        {
          id: `${c.id}-can`,
          label: 'Can it be in the picture?',
          options: [{ id: 'yes', label: 'Yes, it fits' }, { id: 'no', label: 'No, cross it out' }],
          answer: ok ? 'yes' : 'no',
          why: { [ok ? 'no' : 'yes']: ok ? `It fits every given. ${sy.givens.map((_, i) => givenCheck(sy, i, c)).join(' ')}` : `${givenCheck(sy, gi, c)} So cross it out.` },
          compare: { says: givensSay, world: `The card: ${withA(cardName(c))}.` },
        },
      ],
    };
  });
  const r = sylReason(sy, j);
  // An “all” given puts one ring inside another: leave out the crossed-out cards, and every card left in the first ring
  // is in the second. Worked out on the parts that are not crossed out, never assumed from the words.
  const left = parts.filter((p) => !j.crossed.includes(p));
  const inside = (a: number, b: number) => left.every((p) => !inRing(p, a) || inRing(p, b));
  sy.givens.forEach((g, i) => {
    if (g.q !== 'all') return;
    const x = ringOf(sy, g.x), y = ringOf(sy, g.y);
    const xy = inside(x, y), yx = inside(y, x);
    if (xy === yx) return;
    const [nx, ny] = [ringName(g.x), ringName(g.y)];
    const [wrongIn, wrongOut] = xy ? [y, x] : [x, y];
    const witness = left.find((p) => inRing(p, wrongIn) && !inRing(p, wrongOut))!;
    const card = withA(cardName(cardAt(witness, sy.groups)));
    const id = `inside${i + 1}`;
    rows.push({
      id,
      label: `${cap(givenName(sy, i))}: ${quote(say(g))}`,
      marks: [
        {
          id,
          label: 'Leave out the cards you crossed out. Which ring sits inside which?',
          options: [{ id: 'xy', label: `${nx} sits inside ${ny}` }, { id: 'yx', label: `${ny} sits inside ${nx}` }],
          answer: xy ? 'xy' : 'yx',
          why: { [xy ? 'yx' : 'xy']: `${cap(card)} is not crossed out. It is ${pred(sy.groups[wrongIn], false)}, but it is not ${pred(sy.groups[wrongOut], false)}. So ${ringName(sy.groups[wrongIn])} does not sit inside ${ringName(sy.groups[wrongOut])}.` },
        },
      ],
    });
  });
  // A “some” given: where must its card be? Only one part of its region is not crossed out.
  const someAt = sy.givens.findIndex((g) => !isUniversal(g));
  if (someAt >= 0) {
    const region = regionOf(sy, sy.givens[someAt]);
    const star = region.find((p) => j.starred.includes(p));
    if (star) {
      const cards = rows.slice(0, parts.length).map((row) => row.things![0]);
      const opts = cards.filter((t) => region.includes(partOf3(t, sy.groups)));
      const starCard = opts.find((t) => partOf3(t, sy.groups) === star)!;
      const why: Record<string, string> = {};
      for (const t of opts) if (t !== starCard) why[t.id] = `${cap(theCard(t))} breaks ${givenName(sy, brokenGiven(sy, t))}, so it is crossed out. The card ${givenName(sy, someAt)} needs must go where nothing is crossed out.`;
      rows.push({ id: 'star', label: `The card ${givenName(sy, someAt)} needs`, marks: [{ id: 'star', label: 'Where must it be?', options: opts.map((t) => ({ id: t.id, label: cap(cardName(t)) })), answer: starCard.id, why }] });
    }
  }
  rows.push({
    id: 'claim',
    label: `The claim: ${quote(say(sy.claim))}`,
    marks: [{ id: 'claim', label: 'Does it follow?', options: FOLLOWS_OPTIONS, answer: j.follows ? 'follows' : 'not', why: { [j.follows ? 'not' : 'follows']: r.lines.join(' ') } }],
  });
  if (!j.follows && r.breaker) {
    const cards = rows.slice(0, parts.length).map((row) => row.things![0]);
    const breaker = cards.find((t) => partOf3(t, sy.groups) === r.breaker)!;
    const others = cards.filter((t) => t !== breaker && inGroup(t, sy.claim.x)).slice(0, 2);
    const offered = [breaker, ...others];
    const why: Record<string, string> = {};
    for (const t of others) {
      const k = brokenGiven(sy, t);
      why[t.id] = k >= 0 ? `${cap(theCard(t))} breaks ${givenName(sy, k)}, so it is crossed out.` : `${cap(theCard(t))} fits the claim, so it can’t break it.`;
    }
    rows.push({ id: 'break', label: 'The card that breaks the claim', marks: [{ id: 'break', label: 'Which card fits the givens and breaks the claim?', options: offered.map((t) => ({ id: t.id, label: cap(cardName(t)) })), answer: breaker.id, why }] });
  }
  const breakCard = r.breaker ? withA(cardName(cardAt(r.breaker, sy.groups))) : '';
  const mix = j.follows
    ? 'You may be treating “a card could break it” and “a card that is not crossed out breaks it” as the same thing. They are two different things. Every card that could break this claim is crossed out, so it follows.'
    : `You may be treating “true in some pictures” and “follows” as the same thing. They are two different things. ${r.breaker ? `${cap(breakCard)} is not crossed out, and it breaks the claim.` : r.lines[1]}`;
  const done = j.follows
    ? 'Right. Every card that could break the claim is crossed out. So it follows.'
    : r.breaker
      ? `Right. ${cap(breakCard)} fits ${allGivens(sy)} and breaks the claim. So it does not follow.`
      : `Right. ${r.lines.slice(1).join(' ')}`;
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: sylScene(sy.groups, []),
    ...(o.twin ? { twin: o.twin } : {}),
    rows,
    afterCard: o.afterCard,
    ...(o.scaffold ? { scaffold: o.scaffold } : {}),
    words: DRAW_WORDS,
    misconceptions: [{ id: HERE_VS_FORCED.id, when: 'picks', picks: { claim: j.follows ? 'not' : 'follows' }, text: mix }],
    done,
  };
}

/** Do, board 2 of the lesson: the example's rings, with given 2 changed to “No red cards are big.” */
export function twinBoard(afterCard: number): DrillStep {
  return drawBoard(L5_TWIN, {
    id: 's8.l5-do-draw',
    title: 'Draw the givens',
    body: [`Givens: ${givensText(L5_TWIN)} Claim: ${quote(say(L5_TWIN.claim))}`, 'For each card: can it be in the picture, or does a given cross it out?', 'Then: which ring sits inside which? Does the claim follow?'],
    afterCard,
    twin: `The rings and the claim from the example. Given 2 is new: ${quote(say(L5_TWIN.givens[1]))}`,
  });
}

/** The board's twin of the “some” example: given 1 is “No circles are red.” */
export const L5_SOME_TWIN: Syllogism = { shape: 'some-chain', groups: L5_GROUPS, givens: [sen('none', CIRCLES, RED), sen('some', BIG, CIRCLES)], claim: sen('some', BIG, RED) };

/** Do, board 3: the “some” example's rings, with given 1 changed to “No circles are red.” */
export function someTwinBoard(afterCard: number): DrillStep {
  return drawBoard(L5_SOME_TWIN, {
    id: 's8.l5-do-star',
    title: 'Where does the star go?',
    body: [`Givens: ${givensText(L5_SOME_TWIN)} Claim: ${quote(say(L5_SOME_TWIN.claim))}`, 'For each card: can it be in the picture? Then find where the card given 2 needs must be.', 'Then: does the claim follow?'],
    afterCard,
    twin: `The rings and the claim from the example. Given 1 is new: ${quote(say(L5_SOME_TWIN.givens[0]))}`,
  });
}

/** Every key-idea card picture of the lesson, so tests can check that no quiz repeats one. */
export const L5_CARD_SCENES = (): Scene[] => [sylDrawnScene(), sylFollowsScene(), sylBreakScene(), sylTurnScene(), sylSomeScene()];
