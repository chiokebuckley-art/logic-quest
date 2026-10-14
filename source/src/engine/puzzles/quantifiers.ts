/**
 * Stop 9 · All, Some, None (id s8, n 8): the engine.
 *
 * The model: Stop 1's shape cards, and groups named by one feature ("circles", "red cards", "big cards"). A group is
 * drawn as a ring (Scene 'rings'). Two rings overlap, and every card sits in one of four parts: only in the first ring
 * (`a`), in both (`both`), only in the second (`b`), or outside (`out`). A sentence says how two groups meet:
 *
 *   All X are Y          no X sits only in the X ring; true when there is no X at all (nothing breaks it)
 *   Some X are Y         at least one card in the overlap; still true when every X is Y
 *   No X are Y           the overlap is empty
 *   Some X are not Y     at least one X sits only in the X ring (the opposite of "All")
 *   Not all X are Y      the same as "Some X are not Y"
 *
 * Every truth comes from Stop 1's statement engine (holds() on everyIs, some, noneIs and someIsNot). An opposite is
 * checked on every way the four parts can be empty or filled (isOpposite). Every answer, explanation, wrong-choice
 * feedback, hint case and board mark below is worked out from these; the test works each one out again by counting.
 *
 * Question kinds (skill tags): member (which ring a card goes in), quantify (is an all, some or no sentence true),
 * negate (the opposite; the card that breaks a sentence; one is enough), empty (sentences about an empty ring) and why
 * (the check's closing item: the reason a sentence is true or false). The warm-up (bridge) is a Stop 7 pattern item
 * (shown as Stop 8): one new draw breaks an "every" sentence.
 */
import { syncWhyWrong } from '../teach';
import type {
  BoardWords,
  Choice,
  ChoiceFeedback,
  Color,
  ConfusedQuestion,
  CountGroup,
  Distinction,
  DrillRow,
  DrillStep,
  Item,
  KidItem,
  Misconception,
  Picto,
  Rng,
  Scene,
  Shape,
  Size,
  Teach,
  TeachCase,
  Thing,
  Truth,
} from '../types';
import { drawsScene, NAMES as BAG_NAMES, SKIN_IDS as BAG_SKIN_IDS, SKINS as BAG_SKINS } from './patterns';
import { CARD, COLORS, SHAPES, SIZES, fits, holds, withA, type Card, type Desc, type Feature, type ItemCore, type Made, type Noun } from './statements';

// ---------- the model: groups, parts and sentences ----------

export type S8Skin = 'everyday' | 'fantasy' | 'abstract';
export const S8_SKINS: readonly S8Skin[] = ['everyday', 'fantasy', 'abstract'];

/** A group named by one feature: { f: 'shape', v: 'circle' } is “circles”, drawn as the Circles ring. */
export interface Group {
  f: Feature;
  v: string;
}
export const grp = (f: Feature, v: string): Group => ({ f, v });
export const descOf = (x: Group): Desc => ({ [x.f]: x.v }) as Desc;
export const inGroup = (c: Card, x: Group) => fits(c, descOf(x));

/** The four parts of two rings. */
export type Part = 'a' | 'both' | 'b' | 'out';
export const PARTS: readonly Part[] = ['a', 'both', 'b', 'out'];
export type Counts = Record<Part, number>;
/** The most cards a picture draws in each part (RingsScene has a place for each). */
export const RING_CAP: Counts = { a: 4, both: 3, b: 4, out: 7 };
export const LOOSE_CAP = 7;
export const ONE_RING_CAP = { in: 5, out: 6 } as const;

export const partOf = (c: Card, x: Group, y: Group): Part => (inGroup(c, x) ? (inGroup(c, y) ? 'both' : 'a') : inGroup(c, y) ? 'b' : 'out');

export function partsOf(things: readonly Thing[], x: Group, y: Group): Record<Part, Thing[]> {
  const out: Record<Part, Thing[]> = { a: [], both: [], b: [], out: [] };
  for (const t of things) out[partOf(t, x, y)].push(t);
  return out;
}

/** Cards in rings: the two groups and the cards. */
export interface RingWorld {
  x: Group;
  y: Group;
  things: Thing[];
}

export type Q = 'all' | 'some' | 'none' | 'someNot' | 'notAll';
/** “All circles are red”: q all, x circles, y red. */
export interface Sentence {
  q: Q;
  x: Group;
  y: Group;
}
export const sen = (q: Q, x: Group, y: Group): Sentence => ({ q, x, y });

/** Is the sentence true for these cards? Worked out by Stop 1's statement engine. */
export function truth(s: Sentence, cards: readonly Card[]): boolean {
  const a = descOf(s.x), b = descOf(s.y);
  switch (s.q) {
    case 'all': return holds({ t: 'everyIs', a, b }, cards);
    case 'some': return holds({ t: 'some', d: { ...a, ...b } }, cards);
    case 'none': return holds({ t: 'noneIs', a, b }, cards);
    case 'someNot': return holds({ t: 'someIsNot', a, b }, cards);
    case 'notAll': return !holds({ t: 'everyIs', a, b }, cards);
  }
}

/** One card does not fit the sentence on its own: it breaks an “all” or a “no” sentence. */
export const breaks = (s: Sentence, c: Card) => !truth(s, [c]);

// ---------- making cards ----------

const VALUES: Record<Feature, readonly string[]> = { shape: SHAPES, color: COLORS, size: SIZES };
const FEATURES: readonly Feature[] = ['shape', 'color', 'size'];
const keyOf = (c: Card) => `${c.size} ${c.color} ${c.shape}`;

/** A card in one part. Without an rng it is always the same card (for teaching cases). */
export function cardIn(part: Part, x: Group, y: Group, rng?: Rng): Card {
  const inX = part === 'a' || part === 'both';
  const inY = part === 'both' || part === 'b';
  const pick = (vals: readonly string[]) => (rng ? rng.pick(vals) : vals[0]);
  const out = {} as Record<Feature, string>;
  for (const f of FEATURES) {
    if (f === x.f) out[f] = inX ? x.v : pick(VALUES[f].filter((v) => v !== x.v));
    else if (f === y.f) out[f] = inY ? y.v : pick(VALUES[f].filter((v) => v !== y.v));
    else out[f] = pick(VALUES[f]);
  }
  return out as unknown as Card;
}

/** A world with these many cards in each part, in a shuffled order, ids t1, t2, … Repeated cards are avoided when it can. */
export function makeWorld(rng: Rng, x: Group, y: Group, counts: Counts): RingWorld {
  for (const p of PARTS) if (counts[p] > RING_CAP[p] || counts[p] < 0) throw new Error(`makeWorld: ${counts[p]} cards in part ${p}`);
  const cards: Card[] = [];
  const seen = new Set<string>();
  for (const p of PARTS) {
    for (let i = 0; i < counts[p]; i++) {
      let c = cardIn(p, x, y, rng);
      for (let k = 0; k < 12 && seen.has(keyOf(c)); k++) c = cardIn(p, x, y, rng);
      seen.add(keyOf(c));
      cards.push(c);
    }
  }
  return { x, y, things: rng.shuffle(cards).map((c, i) => ({ id: `t${i + 1}`, shape: c.shape, color: c.color, size: c.size })) };
}

/** Two groups on different features. Shape and color most often. */
const PAIRS: readonly [Feature, Feature][] = [['shape', 'color'], ['shape', 'color'], ['color', 'shape'], ['shape', 'size'], ['size', 'color'], ['color', 'size'], ['size', 'shape']];
export function pickPair(rng: Rng): [Group, Group] {
  const [fx, fy] = rng.pick(PAIRS);
  return [grp(fx, rng.pick(VALUES[fx])), grp(fy, rng.pick(VALUES[fy]))];
}

/** Counts for the other parts: 0-2 in b and out, at least one card in all. */
function restCounts(rng: Rng): Pick<Counts, 'b' | 'out'> {
  const b = rng.int(0, 2);
  const out = b === 0 ? rng.int(1, 2) : rng.int(0, 2);
  return { b, out };
}

// ---------- words ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const joinAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const isAre = (n: number) => (n === 1 ? 'is' : 'are');

/** A ring's name: “Circles”, “Red”, “Big”. */
export const ringName = (x: Group) => (x.f === 'shape' ? `${cap(x.v)}s` : cap(x.v));
/** “the Circles ring”. */
export const theRing = (x: Group) => `the ${ringName(x)} ring`;
/** The group as a subject: “circles”, “red cards”, “circle stickers”, “red gems”. */
export function subj(x: Group, n: Noun = CARD, many = true): string {
  if (n.one === CARD.one && x.f === 'shape') return many ? `${x.v}s` : x.v;
  return `${x.v} ${many ? n.many : n.one}`;
}
/** The group after “is” or “are”: “red”, “big”, “circles” or “a circle”. */
export function pred(y: Group, many = true): string {
  if (y.f === 'shape') return many ? `${y.v}s` : withA(y.v);
  return y.v;
}
/** “big red circle”. */
export const cardName = (t: Card) => `${t.size} ${t.color} ${t.shape}`;
const theCard = (t: Card) => `the ${cardName(t)}`;
const theCards = (ts: readonly Card[]) => joinAnd(ts.map(theCard));
/** “It is red.” / “It is not a circle.” */
const featLine = (c: Card, g: Group) => `It is ${inGroup(c, g) ? '' : 'not '}${pred(g, false)}.`;
/** “is red” / “is not a circle”. */
const isOrNot = (c: Card, g: Group) => `is ${inGroup(c, g) ? '' : 'not '}${pred(g, false)}`;

/** The sentence, ending in a period. */
export function say(s: Sentence, n: Noun = CARD): string {
  const x = subj(s.x, n), y = pred(s.y);
  switch (s.q) {
    case 'all': return `All ${x} are ${y}.`;
    case 'some': return `Some ${x} are ${y}.`;
    case 'none': return `No ${x} are ${y}.`;
    case 'someNot': return `Some ${x} are not ${y}.`;
    case 'notAll': return `Not all ${x} are ${y}.`;
  }
}
/** “All circles are red.” in quotes, ending a sentence. */
export const quoteEnd = (s: Sentence, n: Noun = CARD) => `“${say(s, n)}”`;
/** “All circles are red” in quotes, inside a sentence. */
export const quoteMid = (s: Sentence, n: Noun = CARD) => `“${say(s, n).replace(/\.$/, '')}”`;

/** Where a part is, in words: “only in the Circles ring”, “in both rings”, “outside both rings”. */
export function partText(p: Part, x: Group, y: Group): string {
  switch (p) {
    case 'a': return `only in ${theRing(x)}`;
    case 'both': return 'in both rings';
    case 'b': return `only in ${theRing(y)}`;
    case 'out': return 'outside both rings';
  }
}

// ---------- stories ----------

/** Who sorts the cards, and what they are called: stickers or buttons (everyday), gems or shields (fantasy), cards. */
export interface Frame {
  skin: S8Skin;
  noun: Noun;
  /** “Ava”, “wizard”, or '' for plain cards. */
  who: string;
}
const KIDS = ['Ava', 'Ben', 'Cal', 'Dee', 'Fay', 'Gus', 'Kai', 'Lia', 'Max', 'Nia', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Zoe'] as const;
const MAGIC = ['wizard', 'dragon', 'troll', 'fairy', 'giant', 'elf'] as const;
const EVERYDAY: readonly Noun[] = [{ one: 'sticker', many: 'stickers' }, { one: 'button', many: 'buttons' }];
const FANTASY: readonly Noun[] = [{ one: 'gem', many: 'gems' }, { one: 'shield', many: 'shields' }];

export function frameFor(rng: Rng, skin: S8Skin): Frame {
  if (skin === 'abstract') return { skin, noun: CARD, who: '' };
  if (skin === 'everyday') return { skin, noun: rng.pick(EVERYDAY), who: rng.pick(KIDS) };
  return { skin, noun: rng.pick(FANTASY), who: rng.pick(MAGIC) };
}

/** “Ava sorts stickers into two rings, Circles and Red.” */
export function intro(fr: Frame, w: RingWorld): string {
  const rings = `two rings, ${ringName(w.x)} and ${ringName(w.y)}`;
  switch (fr.skin) {
    case 'abstract': return `These cards are sorted into ${rings}.`;
    case 'everyday': return `${fr.who} sorts ${fr.noun.many} into ${rings}.`;
    case 'fantasy': return `${cap(withA(fr.who))} sorts magic ${fr.noun.many} into ${rings}.`;
  }
}

/** “Ava says, “All circle stickers are red.”” */
function says(fr: Frame, s: Sentence): string {
  switch (fr.skin) {
    case 'abstract': return `Here is a sentence: ${quoteEnd(s, fr.noun)}`;
    case 'everyday': return `${fr.who} says, ${quoteEnd(s, fr.noun)}`;
    case 'fantasy': return `The ${fr.who} says, ${quoteEnd(s, fr.noun)}`;
  }
}
/** “Ava’s sentence”, “the wizard’s sentence”, “the sentence”. */
const whose = (fr: Frame) => (fr.skin === 'everyday' ? `${fr.who}’s sentence` : fr.skin === 'fantasy' ? `the ${fr.who}’s sentence` : 'the sentence');

// ---------- pictures ----------

export type RingsScene = Extract<Scene, { kind: 'rings' }>;

/** Two rings with every card in its part. `empty`: the rings only (the cards are shown elsewhere, to tap). */
export function ringsScene(w: RingWorld, o: { empty?: boolean; marked?: string[]; loose?: Thing[]; caption?: string } = {}): RingsScene {
  const p = o.empty ? { a: [], both: [], b: [], out: [] } : partsOf(w.things, w.x, w.y);
  return {
    kind: 'rings',
    rings: [ringName(w.x), ringName(w.y)],
    a: p.a,
    both: p.both,
    b: p.b,
    out: p.out,
    ...(o.marked?.length ? { marked: o.marked } : {}),
    ...(o.loose?.length ? { loose: o.loose } : {}),
    ...(o.caption ? { caption: o.caption } : {}),
  };
}

/** One ring: the cards with its feature inside, the rest outside. */
export function oneRingScene(things: readonly Thing[], g: Group, caption?: string): RingsScene {
  return { kind: 'rings', rings: [ringName(g)], a: things.filter((t) => inGroup(t, g)), both: [], b: [], out: things.filter((t) => !inGroup(t, g)), ...(caption ? { caption } : {}) };
}

// ---------- teaching pieces ----------

export const TERM_RING = { word: 'A ring', meaning: 'a fence around a group. Each thing with the ring’s feature goes inside it.' };
export const TERM_OVERLAP = { word: 'The overlap', meaning: 'the part two rings share. A thing there is in both rings.' };
export const TERM_ALL = { word: '“All”', meaning: 'every one, with no exceptions.' };
export const TERM_SOME = { word: '“Some”', meaning: 'at least one. It might be all of them.' };
export const TERM_NO = { word: '“No”', meaning: 'not even one.' };
export const TERM_OPPOSITE = { word: 'The opposite', meaning: 'a sentence that is true just when the first one is false.' };
export const TERM_NOT_ALL = { word: '“Not all”', meaning: 'at least one is not. It is not the same as none.' };
export const TERM_COUNTER = { word: 'A counterexample', meaning: 'one case that breaks an “all” sentence.' };
export const TERM_EMPTY = { word: 'An empty ring', meaning: 'a ring with nothing inside it.' };

const YES_WORDS: BoardWords = { truth: 'Yes', untruth: 'No' };

/** One card checked against both rings. */
function cardCase(c: Thing, x: Group, y: Group, note?: string): TeachCase {
  const p = partOf(c, x, y);
  return {
    label: `${cap(theCard(c))}. ${featLine(c, x)} ${featLine(c, y)}`,
    things: [c],
    truths: [{ who: `In ${theRing(x)}`, value: inGroup(c, x) }, { who: `In ${theRing(y)}`, value: inGroup(c, y) }],
    note: note ?? `It goes ${partText(p, x, y)}.`,
    words: YES_WORDS,
  };
}

/** A card for each part: from the world when it has one, else a made one. */
function partCards(w: RingWorld): Record<Part, Thing> {
  const p = partsOf(w.things, w.x, w.y);
  const out = {} as Record<Part, Thing>;
  for (const k of PARTS) out[k] = p[k][0] ?? { id: `case-${k}`, ...cardIn(k, w.x, w.y) };
  return out;
}

const groupColor = (g: Group): Color | undefined => (g.f === 'color' ? (g.v as Color) : undefined);

/** The world as counted dots, one group per part. */
function worldGroups(w: RingWorld): CountGroup[] {
  const p = partsOf(w.things, w.x, w.y);
  return [
    { label: `Only ${ringName(w.x)}`, n: p.a.length },
    { label: 'Both rings', n: p.both.length, color: groupColor(w.y) },
    { label: `Only ${ringName(w.y)}`, n: p.b.length, color: groupColor(w.y) },
    { label: 'Outside', n: p.out.length },
  ];
}

// ---------- why a sentence is true or false ----------

/** The reason a sentence is true or false for these cards: a short clause, the lines, and the card that shows it. */
export function reasonOf(s: Sentence, w: RingWorld, n: Noun = CARD): { value: boolean; short: string; lines: string[]; witness?: Thing } {
  const value = truth(s, w.things);
  const P = partsOf(w.things, s.x, s.y);
  const one = subj(s.x, n, false), p1 = pred(s.y, false), px = pred(s.x, false);
  const xs = P.a.length + P.both.length;
  const check = (want: boolean, r: { short: string; lines: string[]; witness?: Thing }) => {
    if (want !== value) throw new Error(`reasonOf: ${say(s)} is ${value}, but the reason says ${want}`);
    return { value, ...r };
  };
  switch (s.q) {
    case 'all':
      if (P.a.length) {
        const t = P.a[0];
        return check(false, { witness: t, short: `${theCard(t)} is ${px} and not ${p1}`, lines: [`${cap(theCard(t))} is ${px}, but it is not ${p1}.`, `One ${n.one} like that is enough to break “all.”`] });
      }
      if (!xs) return check(true, { short: `there is no ${one} at all, so nothing breaks it`, lines: [`There is no ${one} at all.`, `To break it, you would need ${withA(one)} that is not ${p1}. There is none, so nothing breaks it.`] });
      return check(true, { short: `every ${one} here is ${p1}`, lines: [`Every ${one} here is ${p1}. ${xs === 1 ? 'It sits' : 'They all sit'} in the overlap.`, `No ${one} sits only in ${theRing(s.x)}, so nothing breaks it.`] });
    case 'some':
      if (P.both.length) {
        const t = P.both[0];
        const all = !P.a.length && P.both.length > 1;
        return check(true, {
          witness: t,
          short: all ? `every ${one} here is ${p1}, and that is at least one` : `${theCard(t)} is ${px}, and it is ${p1}`,
          lines: [`${cap(theCard(t))} is ${px}, and it is ${p1}.`, `One ${n.one} like that is enough for “some.”`, ...(all ? [`In fact, every ${one} here is ${p1}. That is still at least one, so “some” is true.`] : [])],
        });
      }
      if (!xs) return check(false, { short: `there is no ${one} at all, so none can be ${p1}`, lines: [`There is no ${one} at all.`, `“Some” needs at least one ${one} that is ${p1}. There is none.`] });
      return check(false, { short: `no ${one} here is ${p1}`, lines: [`No ${one} here is ${p1}. The overlap is empty.`, '“Some” needs at least one.'] });
    case 'none':
      if (P.both.length) {
        const t = P.both[0];
        return check(false, { witness: t, short: `${theCard(t)} is ${px}, and it is ${p1}`, lines: [`${cap(theCard(t))} is ${px}, and it is ${p1}.`, `One ${n.one} like that is enough to break “no.”`] });
      }
      if (!xs) return check(true, { short: `there is no ${one} at all, so not even one is ${p1}`, lines: [`There is no ${one} at all, so not even one is ${p1}.`] });
      return check(true, { short: `no ${one} here is ${p1}`, lines: [`No ${one} here is ${p1}. The overlap is empty.`] });
    case 'someNot':
    case 'notAll':
      if (P.a.length) {
        const t = P.a[0];
        return check(true, { witness: t, short: `${theCard(t)} is ${px} and not ${p1}`, lines: [`${cap(theCard(t))} is ${px}, but it is not ${p1}.`, `One ${n.one} like that is enough.`] });
      }
      if (!xs) return check(false, { short: `there is no ${one} at all`, lines: [`There is no ${one} at all, not even one that is not ${p1}.`] });
      return check(false, { short: `every ${one} here is ${p1}`, lines: [`Every ${one} here is ${p1}. There is no ${one} that is not ${p1}.`] });
  }
}

/** What the sentence's little word asks for. */
function qMeaning(s: Sentence, n: Noun = CARD): string {
  const one = subj(s.x, n, false), p1 = pred(s.y, false);
  switch (s.q) {
    case 'all': return `“All” means every one, with no exceptions. So every ${one} must be ${p1}.`;
    case 'some': return `“Some” means at least one. So one ${one} that is ${p1} is enough.`;
    case 'none': return `“No” means not even one. So no ${one} can be ${p1}.`;
    case 'someNot': return `“Some are not” means at least one is not. So one ${one} that is not ${p1} is enough.`;
    case 'notAll': return `“Not all” means at least one is not. So one ${one} that is not ${p1} is enough.`;
  }
}

/** The rule for a kind of sentence, in a few words. */
function qRule(q: Q): string {
  switch (q) {
    case 'all': return 'An “all” sentence is true when every one fits, with no exceptions. One that does not fit makes it false.';
    case 'some': return 'A “some” sentence is true when at least one fits. It is still true when every one fits.';
    case 'none': return 'A “no” sentence is true when not even one fits.';
    case 'someNot': return 'A “some are not” sentence is true when at least one does not fit.';
    case 'notAll': return 'A “not all” sentence is true when at least one does not fit.';
  }
}

/** The four shapes a group can take: every one fits, some do and some do not, none fits, or there is none at all. */
type Shape4 = 'every' | 'mixed' | 'nofit' | 'empty';
const SHAPE_COUNTS: Record<Shape4, { a: number; both: number }> = { every: { a: 0, both: 2 }, mixed: { a: 1, both: 1 }, nofit: { a: 2, both: 0 }, empty: { a: 0, both: 0 } };

/** A small row of cards for a shape (one per card, in the x group only). */
function shapeCards(s: Sentence, k: Shape4): Card[] {
  const c = SHAPE_COUNTS[k];
  return [...Array.from({ length: c.both }, () => cardIn('both', s.x, s.y)), ...Array.from({ length: c.a }, () => cardIn('a', s.x, s.y))];
}

/** A worked case for a shape: its counts in words and dots, the sentence's truth there, and why. */
export function shapeCase(s: Sentence, k: Shape4, n: Noun = CARD, also: { who: string; s: Sentence }[] = []): TeachCase {
  const c = SHAPE_COUNTS[k];
  const many = subj(s.x, n), one = subj(s.x, n, false), py = pred(s.y), p1 = pred(s.y, false);
  const cards = shapeCards(s, k);
  const value = truth(s, cards);
  const label =
    k === 'every' ? `${c.both} ${many}, and every one is ${p1}.`
      : k === 'mixed' ? `${c.both + c.a} ${many}: ${c.both} is ${p1}, and ${c.a} is not.`
        : k === 'nofit' ? `${c.a} ${many}, and none of them is ${p1}.`
          : `No ${many} at all.`;
  const notes: Record<Q, Record<Shape4, string>> = {
    all: { every: 'No exceptions, so it is true.', mixed: `One is not ${p1}, so it is false.`, nofit: `They are not ${py}, so it is false.`, empty: `No ${one} is there to break it, so it is true.` },
    some: { every: `At least one is ${p1}, so it is true.`, mixed: `At least one is ${p1}, so it is true.`, nofit: `Not even one is ${p1}, so it is false.`, empty: `No ${one} is there to make it true, so it is false.` },
    none: { every: `At least one is ${p1}, so it is false.`, mixed: `One is ${p1}, so it is false.`, nofit: `Not even one is ${p1}, so it is true.`, empty: `No ${one} is there, so not even one is ${p1}. It is true.` },
    someNot: { every: `Every one is ${p1}, so it is false.`, mixed: `One is not ${p1}, so it is true.`, nofit: `They are not ${py}, so it is true.`, empty: `No ${one} is there at all, so it is false.` },
    notAll: { every: `Every one is ${p1}, so it is false.`, mixed: `One is not ${p1}, so it is true.`, nofit: `They are not ${py}, so it is true.`, empty: `No ${one} is there at all, so it is false.` },
  };
  const note = notes[s.q][k];
  if (!note.endsWith(value ? 'true.' : 'false.')) throw new Error(`shapeCase: ${say(s)} on ${k} is ${value}`);
  const truths: Truth[] = [{ who: quoteMid(s, n), value }, ...also.map((x) => ({ who: x.who, value: truth(x.s, cards) }))];
  return {
    label,
    groups: [
      { label: `${cap(many)}, ${py}`, n: c.both, color: groupColor(s.y) },
      { label: `${cap(many)}, not ${py}`, n: c.a },
    ],
    truths,
    note,
  };
}

/** The cases that cover every way a sentence can go (an empty group too, where the lesson teaches it). */
const shapeCases = (s: Sentence, n: Noun, empty: boolean, also: { who: string; s: Sentence }[] = []) =>
  (['every', 'mixed', 'nofit', ...(empty ? ['empty' as const] : [])] as Shape4[]).map((k) => shapeCase(s, k, n, also));

/** The world of a question as a case: its counts, the sentence's truth and why. */
function worldCase(s: Sentence, w: RingWorld, n: Noun, who?: string): TeachCase {
  const r = reasonOf(s, w, n);
  const P = partsOf(w.things, s.x, s.y);
  const xs = P.a.length + P.both.length;
  const many = subj(s.x, n), one = subj(s.x, n, false), p1 = pred(s.y, false);
  const label =
    xs === 0 ? `This picture: no ${many} at all.`
      : xs === 1 ? `This picture: 1 ${one}, and it ${P.both.length ? 'is' : 'is not'} ${p1}.`
        : !P.a.length ? `This picture: ${xs} ${many}, and every one is ${p1}.`
          : !P.both.length ? `This picture: ${xs} ${many}, and none of them is ${p1}.`
            : `This picture: ${xs} ${many}. ${P.both.length} ${isAre(P.both.length)} ${P.both.length === 1 ? p1 : pred(s.y)}, and ${P.a.length} ${isAre(P.a.length)} not.`;
  return { label, groups: worldGroups(w), truths: [{ who: who ?? quoteMid(s, n), value: r.value }], note: r.lines.join(' ') };
}

/** A hint card: one outside the group the sentence talks about, checked. It never gives the answer. */
function skipCase(s: Sentence, w: RingWorld, n: Noun): TeachCase | undefined {
  const t = w.things.find((c) => !inGroup(c, s.x));
  if (!t) return undefined;
  return {
    label: `${cap(theCard(t))}.`,
    things: [t],
    truths: [{ who: `It is ${pred(s.x, false)}`, value: false }],
    note: `The sentence talks only about ${subj(s.x, n)}. So skip this one, and check the ${n.many} in ${theRing(s.x)}.`,
    words: YES_WORDS,
  };
}

// ---------- made items ----------

export type S8Kind = 'ring-tap' | 'place' | 'count' | 'both-tap' | 'truth' | 'which' | 'opposite' | 'counter' | 'enough' | 'empty' | 'why';

/** A made item and its model, for tests. */
export interface S8Made extends Made {
  kind: S8Kind;
  world?: RingWorld;
  sentence?: Sentence;
  frame: Frame;
  /** ring-tap / count: the ring asked about. place: the card to place. */
  ring?: Group;
  card?: Thing;
  /** why: each reason and whether its fact is true here. */
  reasons?: { id: string; label: string; fact: boolean; right: boolean }[];
}

const TF: Choice[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const tv = (v: boolean) => (v ? 'true' : 'false');

function done(tag: string, kind: S8Kind, item: ItemCore, extra: Omit<S8Made, 'tag' | 'kind' | 'item'>): S8Made {
  if (item.kind === 'choose') syncWhyWrong(item);
  return { tag, kind, item, ...extra };
}

/** The trap tags (LessonDef.pass include). */
export const IN_BOTH = { tag: 'in-both', label: 'a question with a card in both rings' } as const;
export const SOME_ALL = { tag: 'some-all', label: 'a “some” sentence where every one fits' } as const;
export const NOT_ALL_NONE = { tag: 'not-all-none', label: 'the opposite of an “all” sentence' } as const;
export const EMPTY_ALL = { tag: 'empty-all', label: 'an “all” sentence about an empty ring' } as const;

// ---------- the kid layer of lessons 1 and 2 (Grades 2 and 3, docs/KID-JOURNEY.md) ----------
//
// Beside the classic text, never instead of it: the same picture, the same answer, shorter words. A kid prompt names
// plain cards (the picture is the same whatever the story calls them). A "Show me" case is a twin drawn on other rings
// (the same features, other values: Circles and Red become Squares and Blue), so it never answers the question on
// screen. Grade 2 (lesson 1): at most 20 words a screen with the header, 2 sentences, 10 words a sentence; Grade 3
// (lesson 2): 30 words, 3 sentences, 12 words a sentence.

/** The twin rings: each group's feature with its next value. */
function twinPair(x: Group, y: Group): [Group, Group] {
  const other = (g: Group) => grp(g.f, VALUES[g.f].find((v) => v !== g.v)!);
  return [other(x), other(y)];
}

/** One card of a twin case, in a part of the twin rings. */
const kidThing = (part: Part, x: Group, y: Group, id = 'kid-c1'): Thing => ({ id, ...cardIn(part, x, y) });

/** “Big blue square.”: a twin card's name, as the label over its picture. */
const kidName = (t: Card) => `${cap(cardName(t))}.`;

/** The four parts of two rings as answer tiles (the place item, in kid mode): the part each answer names, lit. */
export const PART_ART: Readonly<Record<Part, Picto>> = { a: 'ring-part-a', both: 'ring-part-both', b: 'ring-part-b', out: 'ring-part-out' };

/** Lesson 1, tap every card in one ring: the overlap's cards belong too. */
export function ringTapKid(g: Group, x: Group, y: Group): KidItem {
  const [x2, y2] = twinPair(x, y);
  const t = kidThing('both', x2, y2);
  return {
    prompt: `Tap each card in the ${ringName(g)} ring.`,
    nope: `The overlap is inside the ${ringName(g)} ring too.`,
    yes: 'The overlap counts for each ring.',
    show: { label: kidName(t), things: [t], note: `It goes in the ${ringName(x2)} ring and the ${ringName(y2)} ring.` },
    hint: `Is it ${pred(g, false)}? Then tap it.`,
  };
}

/** Lesson 1, where does one card go: the line after a miss names its two features. */
export function placeKid(card: Card, x: Group, y: Group): KidItem {
  const right = partOf(card, x, y);
  const px = pred(x, false), py = pred(y, false);
  const why: Record<Part, string> = {
    a: `It is ${px}, but it is not ${py}.`,
    both: `It is ${px}, and it is ${py}.`,
    b: `It is ${py}, but it is not ${px}.`,
    out: `It is not ${px}, and it is not ${py}.`,
  };
  const yes: Record<Part, string> = {
    a: `It goes only in the ${ringName(x)} ring.`,
    both: 'It fits both rings, so it sits in the overlap.',
    b: `It goes only in the ${ringName(y)} ring.`,
    out: 'It fits no ring, so it stays outside.',
  };
  const [x2, y2] = twinPair(x, y);
  const t = kidThing(right, x2, y2);
  // The twin's rings are named in its note: they are not the rings on screen.
  const [X2, Y2] = [ringName(x2), ringName(y2)];
  const where: Record<Part, string> = {
    a: `It goes in the ${X2} ring, not the ${Y2} ring.`,
    both: `It goes in the ${X2} ring and the ${Y2} ring.`,
    b: `It goes in the ${Y2} ring, not the ${X2} ring.`,
    out: `It stays out of the ${X2} and ${Y2} rings.`,
  };
  return {
    prompt: 'Where does this card go?',
    nope: why[right],
    yes: yes[right],
    show: { label: kidName(t), things: [t], note: where[right] },
    hint: `Is it ${px}? Is it ${py}?`,
  };
}

/** Lesson 1, how many cards are in one ring: the overlap counts. */
export function countKid(g: Group, x: Group, y: Group): KidItem {
  const [x2, y2] = twinPair(x, y);
  const g2 = g === x ? x2 : y2;
  const things = [kidThing(g === x ? 'a' : 'b', x2, y2, 'kid-c1'), kidThing('both', x2, y2, 'kid-c2')];
  return {
    prompt: `How many in the ${ringName(g)} ring?`,
    nope: 'Count the cards in the overlap too.',
    yes: 'You counted the overlap too.',
    show: { label: `The ${ringName(g2)} ring holds 2 cards.`, things, note: 'The one in the overlap counts too.' },
    hint: `Count every card inside the ${ringName(g)} ring.`,
  };
}

/** Lesson 1, tap every card in both rings: it has both features. */
export function bothTapKid(x: Group, y: Group): KidItem {
  const [x2, y2] = twinPair(x, y);
  const t = kidThing('both', x2, y2);
  return {
    prompt: 'Tap each card in both rings.',
    nope: `It must be ${pred(x, false)} and ${pred(y, false)}.`,
    yes: 'Those cards fit both rings.',
    show: { label: kidName(t), things: [t], note: `It is ${pred(x2, false)} and ${pred(y2, false)}, so both rings.` },
    hint: `Is it ${pred(x, false)} and ${pred(y, false)}?`,
  };
}

/** How the cards of the group a sentence talks about look: every one fits, some do, none does, or there is none. */
function shapeOf(s: Sentence, cards: readonly Thing[]): Shape4 {
  const P = partsOf(cards, s.x, s.y);
  if (!P.a.length && !P.both.length) return 'empty';
  if (!P.a.length) return 'every';
  return P.both.length ? 'mixed' : 'nofit';
}

/** The truth of each kind of sentence on each shape (the same as truth(); kid lines are checked against it). */
const SHAPE_TRUTH: Record<Q, Record<Shape4, boolean>> = {
  all: { every: true, mixed: false, nofit: false, empty: true },
  some: { every: true, mixed: true, nofit: false, empty: false },
  none: { every: false, mixed: false, nofit: true, empty: true },
  someNot: { every: false, mixed: true, nofit: true, empty: false },
  notAll: { every: false, mixed: true, nofit: true, empty: false },
};

/** Why a sentence is true or false on these cards, in kid words: one or two short sentences. */
export function kidReason(s: Sentence, cards: readonly Thing[]): string {
  const k = shapeOf(s, cards);
  if (SHAPE_TRUTH[s.q][k] !== truth(s, cards)) throw new Error(`kidReason: ${say(s)} on ${k}`);
  const one = subj(s.x, CARD, false), p1 = pred(s.y, false);
  const noOne = `There is no ${one} at all.`;
  switch (s.q) {
    case 'all':
      return k === 'every' ? `Every ${one} here is ${p1}.` : k === 'empty' ? `There is no ${one}, so nothing breaks it.` : `One ${one} is not ${p1}. That breaks “all.”`;
    case 'some':
      return k === 'every' ? `Every ${one} here is ${p1}, so at least one is.` : k === 'mixed' ? `One ${one} is ${p1}. That is enough for “some.”` : k === 'empty' ? noOne : `Not even one ${one} is ${p1}.`;
    case 'none':
      return k === 'every' || k === 'mixed' ? `One ${one} is ${p1}. That breaks “no.”` : k === 'empty' ? noOne : `Not even one ${one} is ${p1}.`;
    case 'someNot':
    case 'notAll':
      return k === 'every' ? `Every ${one} here is ${p1}.` : k === 'empty' ? noOne : `One ${one} is not ${p1}. That is enough.`;
  }
}

/** The “Show me” twin of a sentence: the same kind of sentence on the twin rings, with cards of the same shape. */
function kidTwinCase(s: Sentence, k: Shape4): TeachCase {
  const [x2, y2] = twinPair(s.x, s.y);
  const s2 = sen(s.q, x2, y2);
  const things = shapeCards(s2, k).map((c, i) => ({ id: `kid-c${i + 1}`, ...c }));
  const value = truth(s2, things);
  if (value !== SHAPE_TRUTH[s.q][k]) throw new Error(`kidTwinCase: ${say(s2)} on ${k}`);
  const one = subj(x2, CARD, false), p1 = pred(y2, false);
  const so = `so it is ${tv(value)}.`;
  const notes: Record<Q, Record<Shape4, string>> = {
    all: { every: `Every ${one} is ${p1}, ${so}`, mixed: `One ${one} is not ${p1}, ${so}`, nofit: `No ${one} is ${p1}, ${so}`, empty: `No ${one} is there to break it, ${so}` },
    some: { every: `Every ${one} is ${p1}. That is at least one, ${so}`, mixed: `One ${one} is ${p1}, ${so}`, nofit: `Not even one is ${p1}, ${so}`, empty: `No ${one} is there, ${so}` },
    none: { every: `One ${one} is ${p1}, ${so}`, mixed: `One ${one} is ${p1}, ${so}`, nofit: `Not even one is ${p1}, ${so}`, empty: `No ${one} is there, ${so}` },
    someNot: { every: `Every ${one} is ${p1}, ${so}`, mixed: `One ${one} is not ${p1}, ${so}`, nofit: `No ${one} is ${p1}, ${so}`, empty: `No ${one} is there, ${so}` },
    notAll: { every: `Every ${one} is ${p1}, ${so}`, mixed: `One ${one} is not ${p1}, ${so}`, nofit: `No ${one} is ${p1}, ${so}`, empty: `No ${one} is there, ${so}` },
  };
  return { label: quoteEnd(s2), ...(things.length ? { things } : {}), note: notes[s.q][k] };
}

/** Is the sentence true or false for the cards in the rings? (lesson 2, and every item made by tfItem) */
export function truthKid(s: Sentence, w: RingWorld): KidItem {
  const line = kidReason(s, w.things);
  return {
    prompt: `${quoteEnd(s)} True or false?`,
    nope: line,
    yes: line,
    show: kidTwinCase(s, shapeOf(s, w.things)),
    hint: `Look only in the ${ringName(s.x)} ring.`,
  };
}

/** Which sentence is true (or false)? (lesson 2) The answers stay the three sentences. */
export function whichKid(form: 'true' | 'false', right: Sentence, w: RingWorld): KidItem {
  return {
    prompt: `Which one is ${form}?`,
    nope: `Look in the ${ringName(right.x)} ring. Then check each one.`,
    yes: kidReason(right, w.things),
    show: kidTwinCase(right, shapeOf(right, w.things)),
    hint: 'Try each sentence on the picture.',
  };
}

// ---------- lesson 1: in the ring or not ----------

function memberTeach(w: RingWorld, n: Noun, meaning: string, ask: Group, focus: Thing): Teach {
  const cards = partCards(w);
  return {
    rule: `${cap(withA(n.one))} goes in a ring when it has that ring’s feature. ${cap(withA(n.one))} with both features goes in both rings. It sits where they overlap.`,
    terms: [TERM_RING, TERM_OVERLAP],
    meaning,
    casesTitle: `Where can ${withA(n.one)} go?`,
    cases: PARTS.map((p) => cardCase(cards[p], w.x, w.y)),
    remember: [`Check the features of each ${n.one}. One in the overlap is in both rings.`, `Ask: “Is this one ${pred(ask, false)}?” If yes, it goes in ${theRing(ask)}.`],
    simpler: [
      `Take ${theCard(focus)}.`,
      `Is it ${pred(w.x, false)}? ${inGroup(focus, w.x) ? 'Yes' : 'No'}. Is it ${pred(w.y, false)}? ${inGroup(focus, w.y) ? 'Yes' : 'No'}.`,
      'If both answers are yes, it goes in both rings, where they overlap.',
      `Do this for every ${n.one}.`,
    ],
  };
}

/** A small world for a lesson 1 question: 1-2 cards in each part, so there is always a card in the overlap. */
function memberWorld(rng: Rng): RingWorld {
  const [x, y] = pickPair(rng);
  return makeWorld(rng, x, y, { a: rng.int(1, 2), both: rng.int(1, 2), b: rng.int(1, 2), out: rng.int(1, 2) });
}

/** Tap every card that goes in one ring. The overlap's cards belong too (the trap). */
export function ringTapItem(rng: Rng, o: { skin: S8Skin; ring?: 'x' | 'y' }): S8Made {
  const fr = frameFor(rng, o.skin);
  const w = memberWorld(rng);
  const g = (o.ring ?? rng.pick(['x', 'y'] as const)) === 'x' ? w.x : w.y;
  const other = g === w.x ? w.y : w.x;
  const P = partsOf(w.things, w.x, w.y);
  const only = g === w.x ? P.a : P.b;
  const otherOnly = g === w.x ? P.b : P.a;
  const answer = w.things.filter((t) => inGroup(t, g));
  const ids = (ts: readonly Thing[]) => ts.map((t) => t.id);
  const both = P.both;
  const it = (ts: readonly Thing[], one: string, many: string) => (ts.length === 1 ? one : many);
  const diagnose = [
    {
      ids: ids(only),
      message: `Your answer leaves out ${theCards(both)}. ${it(both, 'It is', 'They are')} ${pred(g, false)}, so ${it(both, 'it goes', 'they go')} in ${theRing(g)}. ${it(both, 'It is', 'They are')} ${pred(other, false)} too, so ${it(both, 'it sits', 'they sit')} where the rings overlap.`,
    },
    {
      ids: ids([...only, ...both, ...otherOnly]),
      message: `Your answer also has ${theCards(otherOnly)}. ${it(otherOnly, 'It is', 'They are')} only in ${theRing(other)}. ${it(otherOnly, 'It is', 'They are')} not ${pred(g, false)}, so ${it(otherOnly, 'it stays', 'they stay')} out of ${theRing(g)}.`,
    },
    {
      ids: ids(both),
      message: `Your answer has only the ${fr.noun.many} in the overlap. ${cap(theCards(only))} ${isAre(only.length)} ${pred(g, false)} too, so ${it(only, 'it goes', 'they go')} in ${theRing(g)}.`,
    },
  ];
  const skip = w.things.find((t) => !inGroup(t, g))!;
  const item: ItemCore = {
    kind: 'tapall',
    prompt: `${intro(fr, w)} Tap every ${fr.noun.one} that goes in ${theRing(g)}.`,
    scene: ringsScene(w, { empty: true }),
    things: w.things,
    answer: ids(answer),
    diagnose,
    explain: `${cap(theRing(g))} holds every ${fr.noun.one} that is ${pred(g, false)}. That makes ${answer.length} ${fr.noun.many}. ${cap(theCards(both))} ${isAre(both.length)} in both rings, so ${it(both, 'it is', 'they are')} in ${theRing(g)} too.`,
    hint: `Here is one ${fr.noun.one}, checked for you. Check each one the same way.`,
    hintCase: cardCase(skip, w.x, w.y, `It is not ${pred(g, false)}, so it does not go in ${theRing(g)}.`),
    teach: memberTeach(w, fr.noun, `${cap(theRing(g))} holds every ${fr.noun.one} that is ${pred(g, false)}. It does not matter what else it is.`, g, both[0]),
    tags: [IN_BOTH.tag],
    kid: ringTapKid(g, w.x, w.y),
  } as unknown as ItemCore;
  return done('member', 'ring-tap', item, { world: w, frame: fr, ring: g });
}

/** Where does one card go? Only in one ring, in both, or outside. */
export function placeItem(rng: Rng, o: { skin: S8Skin; part?: Part }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const part = o.part ?? rng.pick(PARTS);
  // The placed cards: at least one in a part other than the asked card's, for the hint.
  let w = makeWorld(rng, x, y, { a: rng.int(0, 2), both: rng.int(0, 1), b: rng.int(0, 2), out: rng.int(1, 2) });
  for (let i = 0; i < 50 && !w.things.some((t) => partOf(t, x, y) !== part); i++) w = makeWorld(rng, x, y, { a: rng.int(0, 2), both: rng.int(0, 1), b: rng.int(0, 2), out: rng.int(1, 2) });
  const c = cardIn(part, x, y, rng);
  const card: Thing = { id: 'p1', ...c };
  const choices: Choice[] = [
    // Kid mode: the four part pictures alone (word ''); each tile is still announced by its label.
    { id: 'a', label: `Only in ${theRing(x)}`, art: PART_ART.a, word: '' },
    { id: 'both', label: 'In both rings', art: PART_ART.both, word: '' },
    { id: 'b', label: `Only in ${theRing(y)}`, art: PART_ART.b, word: '' },
    { id: 'out', label: 'Outside both rings', art: PART_ART.out, word: '' },
  ];
  const right = partOf(card, x, y);
  const inX = (p: Part) => p === 'a' || p === 'both';
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const p of PARTS) {
    if (p === right) continue;
    // The first ring the answer gets wrong: it puts the card in a ring whose feature it lacks, or keeps it out of one it has.
    const g = inX(p) !== inGroup(card, x) ? x : y;
    const headline = `Your answer puts it ${partText(p, x, y)}, but it ${inGroup(card, g) ? 'is' : 'is not'} ${pred(g, false)}.`;
    feedback[p] = {
      headline,
      detail: [`${cap(theCard(card))} ${isOrNot(card, x)}. It ${isOrNot(card, y)}.`, ...(right === 'both' ? [`${cap(withA(fr.noun.one))} can be in two rings at once.`] : []), `So it goes ${partText(right, x, y)}.`],
      example: cardCase(card, x, y),
    };
  }
  const other = w.things.find((t) => partOf(t, x, y) !== right)!;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro(fr, w)} Where does ${theCard(card)} go?`,
    scene: ringsScene(w, { loose: [card] }),
    choices,
    answer: right,
    feedback,
    explain: `${cap(theCard(card))} ${isOrNot(card, x)}, and it ${isOrNot(card, y)}. So it goes ${partText(right, x, y)}.`,
    hint: `Check one ring at a time. Here is another ${fr.noun.one}, checked for you.`,
    hintCase: cardCase(other, x, y),
    teach: memberTeach(w, fr.noun, `${cap(withA(fr.noun.one))} goes in ${theRing(x)} if it is ${pred(x, false)}. It goes in ${theRing(y)} if it is ${pred(y, false)}.`, x, card),
    ...(right === 'both' ? { tags: [IN_BOTH.tag] } : {}),
    kid: placeKid(card, x, y),
  };
  return done('member', 'place', item, { world: w, frame: fr, card });
}

/** How many cards are in one ring? The overlap counts (the trap). */
export function countItem(rng: Rng, o: { skin: S8Skin; ring?: 'x' | 'y' }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const w = makeWorld(rng, x, y, { a: rng.int(1, 3), both: rng.int(1, 2), b: rng.int(1, 3), out: rng.int(0, 2) });
  const g = (o.ring ?? rng.pick(['x', 'y'] as const)) === 'x' ? x : y;
  const other = g === x ? y : x;
  const P = partsOf(w.things, x, y);
  const gOnly = (g === x ? P.a : P.b).length;
  const oOnly = (g === x ? P.b : P.a).length;
  const both = P.both.length;
  const right = w.things.filter((t) => inGroup(t, g)).length;
  const nn = (k: number) => (k === 1 ? fr.noun.one : fr.noun.many);
  const options: { id: string; n: number }[] = [{ id: 'right', n: right }, { id: 'only', n: gOnly }, { id: 'rings', n: gOnly + both + oOnly }, { id: 'both', n: both }];
  const kept: { id: string; n: number }[] = [];
  for (const op of options) if (!kept.some((k) => k.n === op.n)) kept.push(op);
  const groups: CountGroup[] = [
    { label: `Only ${ringName(g)}`, n: gOnly },
    { label: 'Both rings', n: both },
    { label: `Only ${ringName(other)}`, n: oOnly },
  ];
  const example: TeachCase = { label: `${cap(theRing(g))}: ${gOnly} only in it, and ${both} in the overlap.`, groups, note: `${gOnly} and ${both} make ${right}.` };
  const all: Record<string, ChoiceFeedback> = {
    only: {
      headline: `Your answer leaves out the ${both === 1 ? fr.noun.one : `${both} ${fr.noun.many}`} in the overlap.`,
      detail: [`${gOnly} ${nn(gOnly)} ${isAre(gOnly)} only in ${theRing(g)}. ${both} more ${isAre(both)} in the overlap.`, `The overlap is inside ${theRing(g)} too. So ${theRing(g)} holds ${right}.`],
      example,
    },
    rings: {
      headline: `Your answer also counts the ${fr.noun.many} only in ${theRing(other)}.`,
      detail: [`${oOnly} ${nn(oOnly)} ${isAre(oOnly)} only in ${theRing(other)}. ${oOnly === 1 ? 'It is' : 'They are'} not ${pred(g, false)}.`, `${cap(theRing(g))} holds ${right}: ${gOnly} only in it, and ${both} in the overlap.`],
      example,
    },
    both: {
      headline: 'Your answer counts only the overlap.',
      detail: [`${gOnly === 1 ? `1 ${fr.noun.one} is only in ${theRing(g)}. It counts too.` : `${gOnly} ${fr.noun.many} are only in ${theRing(g)}. They count too.`}`, `So ${theRing(g)} holds ${right} in all.`],
      example,
    },
  };
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const k of kept) if (k.id !== 'right') feedback[k.id] = all[k.id];
  const sorted = [...kept].sort((p, q) => p.n - q.n);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro(fr, w)} How many ${fr.noun.many} are in ${theRing(g)}?`,
    scene: ringsScene(w),
    choices: sorted.map((k) => ({ id: k.id, label: String(k.n) })),
    answer: 'right',
    feedback,
    explain: `${cap(theRing(g))} holds ${gOnly} ${nn(gOnly)} only in it, and ${both} in the overlap. That makes ${right}.`,
    hint: 'Count one part at a time. Here is the other ring, counted for you.',
    hintCase: {
      label: `${cap(theRing(other))}: ${oOnly} only in it, and ${both} in the overlap.`,
      groups: [{ label: `Only ${ringName(other)}`, n: oOnly }, { label: 'Both rings', n: both }],
      note: `So ${theRing(other)} holds ${oOnly + both}.`,
    },
    teach: {
      rule: `To count the ${fr.noun.many} in a ring, count each one inside it. The overlap is inside both rings, so it counts for each ring.`,
      terms: [TERM_RING, TERM_OVERLAP],
      meaning: `${cap(theRing(g))} has two parts: the part only in it, and the overlap.`,
      casesTitle: 'Each part of the picture',
      cases: [example, { label: `${cap(theRing(other))}: ${oOnly} only in it, and ${both} in the overlap.`, groups: [{ label: `Only ${ringName(other)}`, n: oOnly }, { label: 'Both rings', n: both }], note: `${oOnly} and ${both} make ${oOnly + both}.` }],
      remember: [`A ring holds the ${fr.noun.many} only in it, and the ${fr.noun.many} in the overlap.`, 'Ask: “Did I count the overlap?”'],
      simpler: [`Count the ${fr.noun.many} only in ${theRing(g)}: ${gOnly}.`, `Count the ${fr.noun.many} in the overlap: ${both}.`, `Put them together: ${right}.`],
    },
    tags: [IN_BOTH.tag],
    kid: countKid(g, x, y),
  };
  return done('member', 'count', item, { world: w, frame: fr, ring: g });
}

/** Tap every card in both rings: it has both features. */
export function bothTapItem(rng: Rng, o: { skin: S8Skin }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const w = makeWorld(rng, x, y, { a: rng.int(1, 2), both: rng.int(1, 2), b: rng.int(1, 2), out: rng.int(0, 2) });
  const P = partsOf(w.things, x, y);
  const ids = (ts: readonly Thing[]) => ts.map((t) => t.id);
  const they = (ts: readonly Thing[]) => (ts.length === 1 ? 'It is' : 'They are');
  const item = {
    kind: 'tapall',
    prompt: `${intro(fr, w)} Tap every ${fr.noun.one} that goes in both rings.`,
    scene: ringsScene(w, { empty: true }),
    things: w.things,
    answer: ids(P.both),
    diagnose: [
      { ids: ids([...P.a, ...P.both]), message: `Your answer has every ${fr.noun.one} in ${theRing(x)}. To be in both rings, it must be ${pred(y, false)} too. ${they(P.a)} not: ${theCards(P.a)}.` },
      { ids: ids([...P.both, ...P.b]), message: `Your answer has every ${fr.noun.one} in ${theRing(y)}. To be in both rings, it must be ${pred(x, false)} too. ${they(P.b)} not: ${theCards(P.b)}.` },
      { ids: ids([...P.a, ...P.both, ...P.b]), message: `Your answer has every ${fr.noun.one} in either ring. In both rings means ${pred(x, false)} and ${pred(y, false)} at once.` },
    ],
    explain: `${cap(withA(fr.noun.one))} in both rings is ${pred(x, false)}, and it is ${pred(y, false)}. That is ${theCards(P.both)}.`,
    hint: `Check both features of each ${fr.noun.one}. Here is one, checked for you.`,
    hintCase: cardCase(P.a[0], x, y),
    teach: memberTeach(w, fr.noun, `In both rings means the overlap. ${cap(withA(fr.noun.one))} there is ${pred(x, false)}, and it is ${pred(y, false)}.`, y, P.both[0]),
    tags: [IN_BOTH.tag],
    kid: bothTapKid(x, y),
  } as unknown as ItemCore;
  return done('member', 'both-tap', item, { world: w, frame: fr });
}

// ---------- lessons 2-4: true or false ----------

const tfHint = (n: Noun) => `Look only at the ${n.many} the sentence talks about. Here is one ${n.one}, checked for you.`;

interface TfOptions {
  tag: string;
  kind: S8Kind;
  lead?: string;
  tags?: string[];
  conflict?: boolean;
  /** Teach the empty ring too. */
  empty?: boolean;
}

/** Is the sentence true or false for the cards in the rings? */
function tfItem(fr: Frame, w: RingWorld, s: Sentence, o: TfOptions): S8Made {
  const r = reasonOf(s, w, fr.noun);
  const wrong = tv(!r.value);
  const P = partsOf(w.things, s.x, s.y);
  const someAll = s.q === 'some' && r.value && !P.a.length && P.both.length > 1;
  const emptyAll = s.q === 'all' && r.value && !P.a.length && !P.both.length;
  const extra = someAll
    ? ['In everyday talk, “some” can hint “not all.” In logic, “some” means at least one. It stays true when all of them are.']
    : emptyAll
      ? [`An “all” sentence is false only when ${withA(fr.noun.one)} breaks it. With nothing in the ring, nothing can.`]
      : [];
  const feedback: Record<string, ChoiceFeedback> = {
    [wrong]: {
      headline: `Your answer says ${wrong}, but ${r.short}.`,
      detail: [qMeaning(s, fr.noun), ...r.lines, ...extra],
      example: worldCase(s, w, fr.noun),
    },
  };
  const hint = skipCase(s, w, fr.noun);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro(fr, w)}${o.lead ? ` ${o.lead}` : ''} ${says(fr, s)} Is that true or false?`,
    scene: ringsScene(w),
    choices: TF,
    answer: tv(r.value),
    feedback,
    explain: `${r.lines.join(' ')} So ${whose(fr)} is ${tv(r.value)}.`,
    ...(hint ? { hint: tfHint(fr.noun), hintCase: hint } : {}),
    teach: {
      rule: `${qRule(s.q)}${o.empty ? ' With nothing in the ring, nothing breaks an “all” sentence, and nothing makes a “some” sentence true.' : ''}`,
      terms: [TERM_ALL, TERM_SOME, TERM_NO, ...(o.empty ? [TERM_EMPTY] : [])],
      meaning: `${quoteMid(s, fr.noun)} talks only about ${subj(s.x, fr.noun)}. Look in ${theRing(s.x)}.`,
      casesTitle: `When is ${quoteMid(s, fr.noun)} true?`,
      cases: shapeCases(s, fr.noun, !!o.empty),
      remember: ['All: no exceptions. Some: at least one, maybe all. No: not even one.', `Ask: “Which ${fr.noun.many} does it talk about? Do they fit?”`],
      simpler: [`Find ${theRing(s.x)}. The sentence talks only about the ${fr.noun.many} in it.`, `Look at those ${fr.noun.many}. ${qMeaning(s, fr.noun)}`, `${cap(r.short)}. So it is ${tv(r.value)}.`],
    },
    ...(o.tags?.length ? { tags: o.tags } : {}),
    ...(o.conflict ? { conflict: true } : {}),
    kid: truthKid(s, w),
  };
  return done(o.tag, o.kind, item, { world: w, sentence: s, frame: fr });
}

/** Counts for the x group so a sentence comes out as wanted. */
function countsFor(rng: Rng, q: 'all' | 'some' | 'none', want: boolean, trap = false): Pick<Counts, 'a' | 'both'> {
  if (trap) return { a: 0, both: rng.int(2, 3) };
  switch (q) {
    case 'all': return want ? { a: 0, both: rng.int(1, 3) } : { a: rng.int(1, 2), both: rng.int(0, 2) };
    case 'some': return want ? { a: rng.int(1, 2), both: rng.int(1, 2) } : { a: rng.int(1, 3), both: 0 };
    case 'none': return want ? { a: rng.int(1, 3), both: 0 } : { a: rng.int(0, 2), both: rng.int(1, 2) };
  }
}

/** Is an all, some or no sentence true? `trap`: a “some” sentence where every one fits (true; a conflict item). */
export function truthItem(rng: Rng, o: { skin: S8Skin; q: 'all' | 'some' | 'none'; want?: boolean; trap?: boolean }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const trap = !!o.trap && o.q === 'some';
  const want = o.want ?? rng.chance(0.5);
  const w = makeWorld(rng, x, y, { ...countsFor(rng, o.q, want, trap), ...restCounts(rng) });
  return tfItem(fr, w, sen(o.q, x, y), { tag: 'quantify', kind: 'truth', ...(trap ? { tags: [SOME_ALL.tag], conflict: true } : {}) });
}

/**
 * The kid-only alternate of “Which sentence is true (or false)?” (KidItem.alt): one of its three sentences on the same
 * rings, true or false, with its answer worked out by tfItem (the trap form asks its “some” sentence, true when every
 * one fits; else the first sentence the item lists). No rng is drawn, so the classic item and the pack stay the same.
 * The caller (the lesson's finish) gives it the outer item's id, lesson and skill.
 */
function whichAlt(fr: Frame, w: RingWorld, q: 'all' | 'some' | 'none'): Item {
  return tfItem(fr, w, sen(q, w.x, w.y), { tag: 'quantify', kind: 'truth' }).item as unknown as Item;
}

/** Which sentence is true (or false)? Exactly one of all, some and no is. The false form has every one fitting. */
export function whichItem(rng: Rng, o: { skin: S8Skin; form?: 'true' | 'false' }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const form = o.form ?? rng.pick(['true', 'true', 'false'] as const);
  const xc = form === 'false' ? { a: 0, both: rng.int(1, 3) } : rng.chance(0.5) ? { a: rng.int(1, 2), both: rng.int(1, 2) } : { a: rng.int(1, 3), both: 0 };
  const w = makeWorld(rng, x, y, { ...xc, ...restCounts(rng) });
  const qs: ('all' | 'some' | 'none')[] = ['all', 'some', 'none'];
  const want = form === 'true';
  const hits = qs.filter((q) => truth(sen(q, x, y), w.things) === want);
  if (hits.length !== 1) throw new Error(`whichItem: ${hits.length} sentences are ${form}`);
  const right = hits[0];
  const n = fr.noun;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const q of qs) {
    if (q === right) continue;
    const s = sen(q, x, y);
    const r = reasonOf(s, w, n);
    const someAll = q === 'some' && r.value && !partsOf(w.things, x, y).a.length;
    feedback[q] = {
      headline: `Your answer is ${tv(r.value)}: ${r.short}.`,
      detail: [`Your answer is ${quoteEnd(s, n)}`, qMeaning(s, n), ...r.lines, ...(someAll ? ['In logic, “some” means at least one. It stays true when all of them are.'] : [])],
      example: worldCase(s, w, n),
    };
  }
  const shown = rng.shuffle(qs);
  const wrongs = qs.filter((q) => q !== right);
  const hintS = sen(rng.pick(wrongs), x, y);
  const allFit = !partsOf(w.things, x, y).a.length;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro(fr, w)} Which sentence is ${form}?`,
    scene: ringsScene(w),
    choices: shown.map((q) => ({ id: q, label: say(sen(q, x, y), n) })),
    answer: right,
    feedback,
    explain: `${reasonOf(sen(right, x, y), w, n).lines.join(' ')} So ${quoteMid(sen(right, x, y), n)} is ${form}.`,
    hint: 'Here is one sentence, checked for you. Check the others the same way.',
    hintCase: worldCase(hintS, w, n),
    teach: {
      rule: `Check each sentence on the picture. Look only at the ${n.many} it talks about.`,
      terms: [TERM_ALL, TERM_SOME, TERM_NO],
      meaning: `All three sentences talk about ${subj(x, n)}. Look in ${theRing(x)}.`,
      casesTitle: 'Each sentence on this picture',
      cases: qs.map((q) => worldCase(sen(q, x, y), w, n)),
      remember: ['All: no exceptions. Some: at least one, maybe all. No: not even one.', `Ask: “Which ${n.many} does it talk about? Do they fit?”`],
      simpler: [`Look in ${theRing(x)}.`, 'Check the sentences one at a time.', `Only ${quoteMid(sen(right, x, y), n)} is ${form}.`],
    },
    ...(form === 'false' && allFit ? { tags: [SOME_ALL.tag], conflict: true } : {}),
    kid: { ...whichKid(form, sen(right, x, y), w), alt: whichAlt(fr, w, form === 'false' && allFit ? 'some' : shown[0]) },
  };
  return done('quantify', 'which', item, { world: w, frame: fr });
}

// ---------- lesson 3: not all means some are not ----------

/** The 4 ways the x group can be: every one fits, some do and some do not, none fits, none at all. */
const SHAPES4: readonly Shape4[] = ['every', 'mixed', 'nofit', 'empty'];

/** Opposites: on every way the cards can be, one sentence is true just when the other is false. */
export function isOpposite(s1: Sentence, s2: Sentence): boolean {
  // The four parts can each be empty or not: 16 ways. One card per filled part is enough to decide every sentence here.
  for (let mask = 0; mask < 16; mask++) {
    const cards = PARTS.filter((_, i) => mask & (1 << i)).map((p) => cardIn(p, s1.x, s1.y));
    if (truth(s1, cards) === truth(s2, cards)) return false;
  }
  return true;
}

/** When the sentence is false, in words: “at least one circle is not red”. */
function falseWhen(s: Sentence, n: Noun): string {
  const one = subj(s.x, n, false), p1 = pred(s.y, false);
  switch (s.q) {
    case 'all': return `at least one ${one} is not ${p1}`;
    case 'some': return `not even one ${one} is ${p1}`;
    case 'none': return `at least one ${one} is ${p1}`;
    case 'someNot':
    case 'notAll': return `every ${one} is ${p1}`;
  }
}

/** What is the opposite of a sentence? The opposite of “all” is “some are not”, not “no” (the trap). */
export function oppositeItem(rng: Rng, o: { skin: S8Skin; of: 'all' | 'some' | 'none' | 'someNot' }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const n = fr.noun;
  const S = sen(o.of, x, y);
  const forms = (['all', 'some', 'none', 'someNot'] as const).filter((q) => q !== o.of);
  const rights = forms.filter((q) => isOpposite(S, sen(q, x, y)));
  if (rights.length !== 1) throw new Error(`oppositeItem: ${rights.length} opposites of ${say(S)}`);
  const right = sen(rights[0], x, y);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const q of forms) {
    if (q === right.q) continue;
    const wS = sen(q, x, y);
    // A case where the two agree: both true or both false. Every other case is drawn in the teaching.
    const k = SHAPES4.find((sh) => truth(S, shapeCards(S, sh)) === truth(wS, shapeCards(S, sh)))!;
    const v = truth(S, shapeCards(S, k));
    const trap = o.of === 'all' && q === 'none';
    feedback[q] = {
      headline: `Your answer can be ${tv(v)} at the same time as ${whose(fr)}.`,
      detail: [
        'An opposite is true just when the first sentence is false. So the two are never both true, and never both false.',
        ...(trap ? [`“No” needs every ${subj(x, n, false)} to be not ${pred(y, false)}. To break “all,” just one is enough.`] : []),
        `In the case below, ${quoteMid(S, n)} is ${tv(v)}, and your answer is ${tv(v)} too.`,
      ],
      example: shapeCase(S, k, n, [{ who: 'Your answer', s: wS }]),
    };
  }
  const hintK = SHAPES4.find((sh) => truth(S, shapeCards(S, sh)))!;
  const hc = shapeCase(S, hintK, n);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${says(fr, S)} What is the opposite of ${whose(fr)}?`,
    scene: ringsScene({ x, y, things: [] }, { empty: true }),
    choices: rng.shuffle(forms).map((q) => ({ id: q, label: say(sen(q, x, y), n) })),
    answer: right.q,
    feedback,
    explain: `${quoteMid(S, n)} is false just when ${falseWhen(S, n)}. That is just what ${quoteMid(right, n)} says.`,
    hint: 'Ask what would make the sentence false. Here is one case, checked for you.',
    hintCase: { ...hc, note: `${hc.note} So its opposite must be false here.` },
    teach: {
      rule: 'The opposite of a sentence is true just when the sentence is false.',
      terms: [TERM_OPPOSITE, TERM_NOT_ALL],
      meaning: `${quoteMid(S, n)} is false when ${falseWhen(S, n)}.`,
      casesTitle: `${quoteMid(S, n)} and its opposite`,
      cases: SHAPES4.map((k) => shapeCase(S, k, n, [{ who: quoteMid(right, n), s: right }])),
      remember: ['The opposite of “all” is “some are not.” The opposite of “some” is “no.”', 'Ask: “What would make the sentence false?”'],
      simpler: [`Say ${quoteMid(S, n)} is false.`, `Then ${falseWhen(S, n)}.`, `The sentence that says just that is ${quoteEnd(right, n)}`],
    },
    ...(o.of === 'all' ? { tags: [NOT_ALL_NONE.tag] } : {}),
  };
  return done('negate', 'opposite', item, { sentence: S, frame: fr });
}

/** Which card breaks an “all” (or a “no”) sentence? One card is enough: a counterexample. */
export function counterItem(rng: Rng, o: { skin: S8Skin; q?: 'all' | 'none' }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const q = o.q ?? rng.pick(['all', 'all', 'none'] as const);
  const n = fr.noun;
  const S = sen(q, x, y);
  const breaker: Part = q === 'all' ? 'a' : 'both';
  const counts: Counts = { a: rng.int(1, 2), both: rng.int(1, 2), b: rng.int(1, 2), out: rng.int(1, 2) };
  counts[breaker] = 1;
  const w = makeWorld(rng, x, y, counts);
  const P = partsOf(w.things, x, y);
  const pickOf = (p: Part) => (p === breaker ? P[p][0] : rng.pick(P[p]));
  const shown = PARTS.map(pickOf);
  const hits = shown.filter((t) => breaks(S, t));
  if (hits.length !== 1) throw new Error('counterItem: one card must break the sentence');
  const answer = hits[0];
  const one = subj(x, n, false), px = pred(x, false), p1 = pred(y, false);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const t of shown) {
    if (t === answer) continue;
    const ex: TeachCase = { label: `${cap(theCard(t))}. ${featLine(t, x)} ${featLine(t, y)}`, things: [t], truths: [{ who: `It breaks ${quoteMid(S, n)}`, value: false }], words: YES_WORDS };
    if (!inGroup(t, x)) {
      feedback[t.id] = {
        headline: `Your answer is not ${px}, so the sentence says nothing about it.`,
        detail: [`${quoteMid(S, n)} talks only about ${subj(x, n)}. ${cap(theCard(t))} ${isOrNot(t, x)}.`, `To break it, look in ${theRing(x)}.`],
        example: ex,
      };
    } else {
      feedback[t.id] = {
        headline: `Your answer fits the sentence, so it can’t break it.`,
        detail: [`${cap(theCard(t))} is ${px}, and it ${isOrNot(t, y)}. That fits ${quoteEnd(S, n)}`, q === 'all' ? `To break it, you need ${withA(one)} that is not ${p1}.` : `To break it, you need ${withA(one)} that is ${p1}.`],
        example: ex,
      };
    }
  }
  const fitter = shown.find((t) => t !== answer && inGroup(t, x))!;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro(fr, w)} ${says(fr, S)} Which ${n.one} breaks ${whose(fr)}?`,
    scene: ringsScene(w),
    choices: rng.shuffle(shown).map((t) => ({ id: t.id, label: cap(theCard(t)) })),
    answer: answer.id,
    feedback,
    explain: `${cap(theCard(answer))} is ${px}, and it ${isOrNot(answer, y)}. One ${n.one} like that breaks ${quoteEnd(S, n)}${q === 'all' ? ' It is a counterexample.' : ''}`,
    hint: tfHint(n),
    hintCase: { label: `${cap(theCard(fitter))}. ${featLine(fitter, x)} ${featLine(fitter, y)}`, things: [fitter], truths: [{ who: `It is ${px}`, value: true }], note: `The sentence talks about this ${n.one}. Does it fit, or go against it?`, words: YES_WORDS },
    teach: {
      rule: q === 'all' ? `To break an “all” sentence, find one ${n.one} it talks about that does not fit. One is enough.` : `To break a “no” sentence, find one ${n.one} it talks about that does fit. One is enough.`,
      terms: [TERM_COUNTER, TERM_ALL, TERM_NO],
      meaning: `${quoteMid(S, n)} talks only about ${subj(x, n)}. Look in ${theRing(x)}.`,
      casesTitle: `Which ${n.many} can break it?`,
      cases: PARTS.map((p) => {
        const c = partCards(w)[p];
        return { label: `${cap(theCard(c))}. ${featLine(c, x)} ${featLine(c, y)}`, things: [c], truths: [{ who: 'It breaks it', value: breaks(S, c) }], note: `It is ${partText(p, x, y)}.`, words: YES_WORDS };
      }),
      remember: [q === 'all' ? `One ${n.one} that does not fit breaks “all.”` : `One ${n.one} that fits breaks “no.”`, `Ask: “Is there one ${n.one} that goes against it?”`],
      simpler: [`Look in ${theRing(x)}.`, q === 'all' ? `Find ${withA(one)} that is not ${p1}.` : `Find ${withA(one)} that is ${p1}.`, `That one ${n.one} breaks the sentence.`],
    },
  };
  return done('negate', 'counter', item, { world: w, sentence: S, frame: fr });
}

/** Most of the group fits, but one does not: is the “all” sentence true? One is enough to break it (a conflict item). */
export function enoughItem(rng: Rng, o: { skin: S8Skin }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const both = rng.int(2, 3);
  const w = makeWorld(rng, x, y, { a: 1, both, ...restCounts(rng) });
  const lead = `${both} of the ${both + 1} ${subj(x, fr.noun)} are ${pred(y)}.`;
  return tfItem(fr, w, sen('all', x, y), { tag: 'negate', kind: 'enough', lead, conflict: true });
}

// ---------- lesson 4: when the ring is empty ----------

/** A sentence about an empty ring: “all” is true (nothing breaks it; the trap), “some” is false. */
export function emptyItem(rng: Rng, o: { skin: S8Skin; q: 'all' | 'some' | 'none' | 'someNot' }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const w = makeWorld(rng, x, y, { a: 0, both: 0, b: rng.int(1, 3), out: rng.int(1, 3) });
  const lead = `There is no ${subj(x, fr.noun, false)} at all.`;
  const trap = o.q === 'all';
  return tfItem(fr, w, sen(o.q, x, y), { tag: 'empty', kind: 'empty', lead, empty: true, ...(trap ? { tags: [EMPTY_ALL.tag], conflict: true } : {}) });
}

/** The same question with cards in the ring, so an “all” sentence is not always true. */
export function filledItem(rng: Rng, o: { skin: S8Skin; q?: 'all' | 'some'; want?: boolean }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const q = o.q ?? rng.pick(['all', 'some'] as const);
  const want = o.want ?? (q === 'all' ? false : rng.chance(0.5));
  const w = makeWorld(rng, x, y, { ...countsFor(rng, q, want), ...restCounts(rng) });
  return tfItem(fr, w, sen(q, x, y), { tag: 'empty', kind: 'empty', empty: true });
}

// ---------- the closing why item ----------

export type WhyFamily = 'some-all' | 'counter' | 'empty';
export const WHY_LESSON: Record<WhyFamily, string> = { 'some-all': 's8.l2', counter: 's8.l3', empty: 's8.l4' };

interface Reason {
  id: string;
  label: string;
  /** Is the reason's fact true for these cards? */
  fact: boolean;
  right?: boolean;
  fb?: ChoiceFeedback;
}

/** Why is the sentence true (or false) here? The choices are reasons; one is the real reason. Tag `why`. */
export function whyItem(rng: Rng, o: { skin: S8Skin; family: WhyFamily }): S8Made {
  const fr = frameFor(rng, o.skin);
  const [x, y] = pickPair(rng);
  const n = fr.noun;
  const fam = o.family;
  const counts: Counts =
    fam === 'some-all' ? { a: 0, both: rng.int(2, 3), b: rng.int(0, 2), out: rng.int(1, 2) }
      : fam === 'counter' ? { a: 1, both: rng.int(2, 3), b: rng.int(0, 2), out: rng.int(1, 2) }
        : { a: 0, both: 0, b: rng.int(1, 3), out: rng.int(1, 2) };
  const w = makeWorld(rng, x, y, counts);
  const S = sen(fam === 'some-all' ? 'some' : 'all', x, y);
  const value = truth(S, w.things);
  const P = partsOf(w.things, x, y);
  const one = subj(x, n, false), many = subj(x, n), p1 = pred(y, false), py = pred(y);
  const notY = w.things.find((t) => !inGroup(t, y))!;
  const every = w.things.every((t) => inGroup(t, y));
  const reasons: Reason[] = [];
  if (fam === 'some-all') {
    reasons.push(
      { id: 'least', label: `At least one ${one} is ${p1}, and “some” needs only one.`, fact: truth(sen('some', x, y), w.things), right: true },
      {
        id: 'not-all', label: `“Some” means not all, and not every ${one} is ${p1}.`, fact: truth(sen('notAll', x, y), w.things),
        fb: { headline: 'Your reason says “some” means “not all,” but in logic it does not.', detail: ['In logic, “some” means at least one, and maybe all.', `Here every ${one} is ${p1}. So “not every ${one} is ${p1}” is false too.`] },
      },
      {
        id: 'every-card', label: `Every ${n.one} in the picture is ${p1}.`, fact: every,
        fb: { headline: `Your reason is false: ${theCard(notY)} is not ${p1}.`, detail: [`And the sentence talks only about ${many}. The other ${n.many} do not matter.`, `The real reason: at least one ${one} is ${p1}.`] },
      },
      {
        id: 'none', label: `No ${one} is ${p1}, so some must be.`, fact: truth(sen('none', x, y), w.things),
        fb: { headline: `Your reason is false: ${P.both.length} ${many} are ${py}.`, detail: [`If no ${one} were ${p1}, “some” would be false, not true.`, `The real reason: at least one ${one} is ${p1}.`] },
      },
    );
  } else if (fam === 'counter') {
    const t = P.a[0];
    reasons.push(
      { id: 'one', label: `One ${one} is not ${p1}, and one is enough to break “all.”`, fact: P.a.length === 1, right: true },
      {
        id: 'most', label: `Most ${many} are not ${py}.`, fact: P.a.length > P.both.length,
        fb: { headline: `Your reason is false: most ${many} here are ${py}.`, detail: [`${P.both.length} ${many} are ${py}, and only ${P.a.length} is not.`, `You do not need most. One ${one} that is not ${p1} is enough.`] },
      },
      {
        id: 'none', label: `No ${one} is ${p1}.`, fact: truth(sen('none', x, y), w.things),
        fb: { headline: `Your reason is false: ${P.both.length} ${many} are ${py}.`, detail: [`The real reason is ${theCard(t)}. It is ${pred(x, false)}, but it is not ${p1}.`] },
      },
      {
        id: 'some', label: `Some ${many} are ${py}.`, fact: truth(sen('some', x, y), w.things),
        fb: { headline: 'Your reason is true, but it does not break “all.”', detail: [`${cap(many)} that are ${py} fit ${quoteEnd(S, n)} They can’t make it false.`, `Only ${withA(one)} that is not ${p1} can break it, like ${theCard(t)}.`] },
      },
    );
  } else {
    const someS = sen('some', x, y);
    reasons.push(
      { id: 'nothing', label: `There is no ${one}, so nothing can break it.`, fact: P.a.length + P.both.length === 0, right: true },
      {
        id: 'one-is', label: `At least one ${one} is ${p1}.`, fact: truth(someS, w.things),
        fb: { headline: `Your reason is false: there is no ${one} at all.`, detail: [`So not even one ${one} is ${p1}.`, 'The sentence is true because nothing breaks it.'] },
      },
      {
        id: 'every-card', label: `Every ${n.one} in the picture is ${p1}.`, fact: every,
        fb: { headline: `Your reason is false: ${theCard(notY)} is not ${p1}.`, detail: [`And the sentence talks only about ${many}. The other ${n.many} do not matter.`, 'The real reason: nothing breaks it.'] },
      },
      {
        id: 'empty-all', label: 'An empty ring makes every sentence true.', fact: false,
        fb: { headline: 'Your reason is not right: an empty ring does not make every sentence true.', detail: [`${quoteMid(someS, n)} is false here. There is no ${one} to make it true.`, '“All” is true here only because nothing breaks it.'] },
      },
    );
  }
  const right = reasons.find((r) => r.right)!;
  if (!right.fact) throw new Error(`whyItem ${fam}: the right reason is not true here`);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const r of reasons) if (!r.right) feedback[r.id] = { ...r.fb!, example: worldCase(S, w, n) };
  const hint = skipCase(S, w, n);
  const rule =
    fam === 'some-all' ? '“Some” means at least one, and maybe all. So it is true whenever one or more fit.'
      : fam === 'counter' ? `One ${n.one} that does not fit breaks an “all” sentence. One is enough.`
        : 'An “all” sentence is true unless something breaks it. With nothing in the ring, nothing can.';
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${intro(fr, w)} ${says(fr, S)} That is ${tv(value)}. Why?`,
    scene: ringsScene(w),
    choices: rng.shuffle(reasons).map((r) => ({ id: r.id, label: r.label })),
    answer: right.id,
    feedback,
    explain: `${right.label} ${reasonOf(S, w, n).lines.join(' ')}`,
    ...(hint ? { hint: `Check each reason: is it true here, and does it explain the answer? Here is one ${n.one}, checked for you.`, hintCase: hint } : {}),
    teach: {
      rule,
      terms: [TERM_ALL, TERM_SOME, ...(fam === 'counter' ? [TERM_COUNTER] : []), ...(fam === 'empty' ? [TERM_EMPTY] : [])],
      meaning: `${quoteMid(S, n)} talks only about ${many}. Look in ${theRing(x)}.`,
      casesTitle: `When is ${quoteMid(S, n)} true?`,
      cases: shapeCases(S, n, fam === 'empty'),
      remember: ['A good reason is true here, and it explains the answer.', 'Ask: “Is this reason true? Would it make the sentence come out this way?”'],
      simpler: [`Look in ${theRing(x)}.`, ...reasonOf(S, w, n).lines, `So the reason is: ${right.label.charAt(0).toLowerCase()}${right.label.slice(1)}`],
    },
    tags: ['why'],
  };
  return done('why', 'why', item, { world: w, sentence: S, frame: fr, reasons: reasons.map((r) => ({ id: r.id, label: r.label, fact: r.fact, right: !!r.right })) });
}

// ---------- the warm-up: a Stop 7 “every” sentence broken by one draw ----------

const NUMS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** A bridge model, for tests: the draws (kind ids, in order) and the sentence's kind. */
export interface BridgeMade extends Made {
  draws: string[];
  every: string;
}

/**
 * Stop 7's idea, as a warm-up: many draws all fit, so someone says every one in the bag is that kind; then a draw that
 * does not fit comes out. One case breaks “every.” The answer is worked out from the draws.
 */
export function bridgeItem(rng: Rng): BridgeMade {
  const s = BAG_SKINS[rng.pick(BAG_SKIN_IDS)];
  const [ki, oi] = rng.shuffle([0, 1, 2]);
  const k = s.kinds[ki], other = s.kinds[oi];
  const n = rng.int(3, 7);
  const name = rng.pick(BAG_NAMES);
  const draws = [...Array.from({ length: n }, () => k.id), other.id];
  const holdsNow = draws.every((d) => d === k.id);
  const answer = holdsNow ? 'most' : 'broken';
  const N = cap(NUMS[n]);
  const claim = `“Every ${s.noun} in ${s.the} is ${k.is}.”`;
  const broke: TeachCase = {
    label: `${N} ${k.many} in a row, then ${withA(other.one)}.`,
    truths: [{ who: `Every draw was ${k.is}`, value: false }],
    note: 'One draw that does not fit breaks “every.”',
  };
  const feedback: Record<string, ChoiceFeedback> = {
    most: {
      headline: `Your answer goes with the many ${k.many}, but one ${other.one} breaks “every.”`,
      detail: [`${name}’s sentence says every ${s.noun} is ${k.is}.`, `The ${other.one} came out of ${s.the}, and it is not ${k.is}. One case like that is enough.`],
      example: broke,
    },
    mistake: {
      headline: `Your answer throws out the ${other.one}, but it really came out of ${s.the}.`,
      detail: [`A case that breaks a sentence still counts.`, `The ${other.one} shows ${s.the} has more than ${k.many}. So the sentence is false.`],
      example: broke,
    },
    proof: {
      headline: 'Your answer calls the streak a proof, but the next draw broke it.',
      detail: ['Many draws that fit make a good guess, not a proof.', `The ${other.one} came out, so not every ${s.noun} is ${k.is}.`],
      example: broke,
    },
  };
  const choices: Choice[] = [
    { id: 'broken', label: `No. One ${other.one} is enough to break it.` },
    { id: 'most', label: `Yes. ${N} ${k.many} beat one ${other.one}.` },
    { id: 'mistake', label: `Yes. The ${other.one} must be a mistake.` },
    { id: 'proof', label: `Yes. ${N} in a row proved it.` },
  ];
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${name} took ${n} ${s.nouns} from ${s.the}, putting each one back. All ${n} were ${k.are}. ${name} said, ${claim} Then ${withA(other.one)} came out! Is ${name}’s sentence true?`,
    scene: drawsScene(name, k, n, other),
    choices: rng.shuffle(choices),
    answer,
    feedback,
    explain: `${name}’s sentence says every ${s.noun} is ${k.is}. The ${other.one} is not, so the sentence is false. One case is enough to break it. The ${n} ${k.many} were a good guess, not a proof.`,
    hint: 'Ask: does every draw fit the sentence? Here is a smaller case, checked for you.',
    hintCase: { label: `Two ${k.many} in a row, and nothing else yet.`, truths: [{ who: `Every draw so far was ${k.is}`, value: true }], note: 'So far the sentence fits. It is a good guess, not a proof.' },
    teach: {
      rule: 'A sentence about every one is broken by one case that does not fit. A streak of examples is a good guess, not a proof.',
      terms: [{ word: 'A streak', meaning: 'many of the same, one after another.' }, { word: 'A proof', meaning: 'a reason that shows something must be true, with no other way.' }],
      meaning: `${name}’s sentence says every ${s.noun} in ${s.the} is ${k.is}. One that is not breaks it.`,
      casesTitle: 'Before and after the new draw',
      cases: [
        { label: `${N} ${k.many} in a row.`, truths: [{ who: `Every draw was ${k.is}`, value: true }], note: 'A good guess, not a proof.' },
        broke,
      ],
      remember: ['One case that does not fit breaks “every.”', 'Ask: “Is there one that does not fit?”'],
      simpler: [`${name} saw only ${k.many} at first.`, `Then ${withA(other.one)} came out.`, `So not every ${s.noun} is ${k.is}. The sentence is false.`],
    },
  };
  syncWhyWrong(item);
  return { tag: 'pattern-break', item, draws, every: k.id };
}

// ---------- See and Do: the worked examples, contrast cards and boards ----------

const mk = (id: string, size: Size, color: Color, shape: Shape): Thing => ({ id, size, color, shape });
const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const yn = (v: boolean) => (v ? 'yes' : 'no');

/** Board words: a card checked on a ring. */
const CARD_WORDS: BoardWords = {
  says: 'Needs',
  world: 'The card',
  so: 'So',
  ask: 'Does the card have it?',
  closing: 'Those two ideas are apart now. Back to the board: check each card’s features.',
};
/** Board words: a sentence checked on some cards. */
const SENTENCE_WORDS: BoardWords = {
  says: 'Sentence',
  world: 'The cards',
  so: 'So',
  ask: 'Do the cards fit the sentence?',
  closing: 'Those two ideas are apart now. Back to the board: look at the cards the sentence talks about.',
};

/** “The cards: a big red circle, a small red circle and a small blue circle.” */
const cardsText = (ts: readonly Thing[]) => `The cards: ${joinAnd(ts.map((t) => withA(cardName(t))))}.`;

/** A board row: some cards, and a True or False mark for each sentence about them. */
function sentenceRow(id: string, label: string, things: Thing[], ss: { id: string; s: Sentence }[], x: Group, y: Group): DrillRow {
  const w: RingWorld = { x, y, things };
  return {
    id,
    label,
    things,
    marks: ss.map(({ id: sid, s }) => {
      const r = reasonOf(s, w);
      return {
        id: `${id}-${sid}`,
        label: say(s),
        options: TF,
        answer: tv(r.value),
        why: { [tv(!r.value)]: `${r.lines.join(' ')} So it is ${tv(r.value)}.` },
        compare: { says: say(s), world: cardsText(things) },
      };
    }),
  };
}

// ---- lesson 1 ----

export const L1_X = grp('shape', 'circle');
export const L1_Y = grp('color', 'red');
export const L1_CARDS: Thing[] = [
  mk('t1', 'big', 'red', 'circle'),
  mk('t2', 'small', 'blue', 'circle'),
  mk('t3', 'small', 'red', 'square'),
  mk('t4', 'big', 'yellow', 'circle'),
  mk('t5', 'big', 'red', 'triangle'),
  mk('t6', 'big', 'blue', 'square'),
  mk('t7', 'small', 'yellow', 'triangle'),
];
export const L1_WORLD: RingWorld = { x: L1_X, y: L1_Y, things: L1_CARDS };
/** The card in both rings, on the contrast card. */
export const L1_BOTH = L1_CARDS[0];

export const oneRingCardScene = () => oneRingScene(L1_CARDS, L1_Y);
export const twoRingsCardScene = () => ringsScene(L1_WORLD);

/** The worked example: two new rings (Big and Blue), every card placed. */
export const L1_EX: RingWorld = {
  x: grp('size', 'big'),
  y: grp('color', 'blue'),
  things: [mk('u1', 'big', 'blue', 'square'), mk('u2', 'small', 'blue', 'circle'), mk('u3', 'big', 'yellow', 'triangle'), mk('u4', 'small', 'red', 'circle'), mk('u5', 'small', 'blue', 'triangle')],
};
export const L1_LOOSE: Thing[] = [mk('v1', 'big', 'blue', 'circle'), mk('v2', 'small', 'yellow', 'square'), mk('v3', 'big', 'red', 'triangle'), mk('v4', 'small', 'blue', 'square')];
export const memberWorkedScene = () => ringsScene(L1_EX);
/** The worked example's lines: each card, its features and its part. */
export function memberWorkedLines(): string[] {
  return L1_EX.things.slice(0, 4).map((t) => `${cap(theCard(t))} ${isOrNot(t, L1_EX.x)}, and it ${isOrNot(t, L1_EX.y)}. It goes ${partText(partOf(t, L1_EX.x, L1_EX.y), L1_EX.x, L1_EX.y)}.`);
}

export const IN_VS_ONLY: Distinction = {
  id: 'in-vs-only',
  a: 'A card in a ring: the overlap counts too.',
  b: 'A card only in that ring: it is not in the other ring.',
};

const inRed = (t: Thing) => inGroup(t, L1_Y);
const onlyRed = (t: Thing) => inGroup(t, L1_Y) && !inGroup(t, L1_X);

export function inOnlyContrast(): Extract<Scene, { kind: 'contrast' }> {
  const t = L1_BOTH;
  if (!inRed(t) || onlyRed(t)) throw new Error('inOnlyContrast: the card must be in both rings');
  const world = `The card: ${theCard(t)}.`;
  return {
    kind: 'contrast',
    pairs: [
      { world, who: 'The sentence', says: `It is in ${theRing(L1_Y)}.`, truth: inRed(t), because: `It is red. ${cap(theRing(L1_Y))} holds every red card, so it is in.`, things: [t] },
      { world, who: 'The sentence', says: `It is only in ${theRing(L1_Y)}.`, truth: onlyRed(t), because: `It is a circle too. So it is also in ${theRing(L1_X)}, not only in ${theRing(L1_Y)}.`, things: [t] },
    ],
    ask: { q: 'Did the card move?', a: 'No. Only the words changed. A card in the overlap is in both rings.' },
    words: { worldTag: 'The card' },
  };
}

const IN_ONLY_MIX =
  'You may be treating “in the Red ring” and “only in the Red ring” as the same thing. They are two different things. A card in the overlap is in the Red ring. It is in the Circles ring too, so it is not only in the Red ring.';
const IN_ONLY_Q: ConfusedQuestion = {
  q: 'A card sits where two rings overlap. Is it in each ring?',
  options: [{ label: 'Yes. The overlap is part of both rings', right: true }, { label: 'No. It is only in the overlap' }, { label: 'Not sure' }],
  teach: 'Yes. The overlap is part of each ring. A card there is in one ring, and in the other ring too.',
};

/** Do, board 1: right after the contrast. For three cards: in the Red ring? Only in the Red ring? */
export function inOnlyBoard(afterCard: number): DrillStep {
  const cards = [L1_CARDS[0], L1_CARDS[2], L1_CARDS[1]];
  const facts = (t: Thing) => `${cap(theCard(t))}: ${featLine(t, L1_Y).toLowerCase()} ${featLine(t, L1_X)}`;
  const rows: DrillRow[] = cards.map((t, k) => {
    const id = `c${k + 1}`;
    const v1 = inRed(t), v2 = onlyRed(t);
    return {
      id,
      label: cap(theCard(t)),
      things: [t],
      marks: [
        {
          id: `${id}-in`,
          label: `In ${theRing(L1_Y)}?`,
          options: YES_NO,
          answer: yn(v1),
          why: { [yn(!v1)]: v1 ? `It is red, so it is in ${theRing(L1_Y)}. The overlap is part of that ring.` : `It is not red, so it is not in ${theRing(L1_Y)}.` },
          compare: { says: `In ${theRing(L1_Y)}: the card is red.`, world: facts(t) },
        },
        {
          id: `${id}-only`,
          label: `Only in ${theRing(L1_Y)}?`,
          options: YES_NO,
          answer: yn(v2),
          why: { [yn(!v2)]: v2 ? `It is red, and it is not a circle. So it is in ${theRing(L1_Y)}, and in no other ring.` : !v1 ? `It is not red, so it is not in ${theRing(L1_Y)} at all.` : `It is a circle too. So it is in ${theRing(L1_X)} as well, not only in ${theRing(L1_Y)}.` },
          compare: { says: `Only in ${theRing(L1_Y)}: red, and not a circle.`, world: facts(t) },
        },
      ],
    };
  });
  const both = rows[0].id;
  const misconceptions: Misconception[] = [
    { id: 'in-vs-only', when: 'picks', picks: { [`${both}-in`]: 'no' }, text: IN_ONLY_MIX },
    { id: 'in-vs-only', when: 'picks', picks: { [`${both}-only`]: 'yes' }, text: IN_ONLY_MIX },
  ];
  return {
    id: 's8.l1-do-in',
    title: 'In the ring, or only in it?',
    body: ['Look at the two rings. For each card: is it in the Red ring?', 'Then: is it only in the Red ring?'],
    scene: twoRingsCardScene(),
    rows,
    afterCard,
    scaffold: 'full',
    words: CARD_WORDS,
    misconceptions,
    confused: [IN_ONLY_Q],
    distinction: IN_VS_ONLY.id,
    done: 'Right. A card in the overlap is in both rings. So it is in the Red ring, but not only in it.',
  };
}

/** The four parts as options on a board: “Only Big”, “Both rings”, “Only Blue”, “Outside”. */
const partOptions = (x: Group, y: Group) => [
  { id: 'a', label: `Only ${ringName(x)}` },
  { id: 'both', label: 'Both rings' },
  { id: 'b', label: `Only ${ringName(y)}` },
  { id: 'out', label: 'Outside' },
];

/** Do, board 2: the worked example's rings with four new cards to place. */
export function placeBoard(afterCard: number): DrillStep {
  const { x, y } = L1_EX;
  const rows: DrillRow[] = L1_LOOSE.map((t) => {
    const p = partOf(t, x, y);
    const why: Record<string, string> = {};
    for (const q of PARTS) if (q !== p) why[q] = `${cap(theCard(t))} ${isOrNot(t, x)}, and it ${isOrNot(t, y)}. So it goes ${partText(p, x, y)}.`;
    return { id: t.id, label: cap(theCard(t)), things: [t], marks: [{ id: `${t.id}-where`, label: 'Where does it go?', options: partOptions(x, y), answer: p, why }] };
  });
  const bothCard = L1_LOOSE.find((t) => partOf(t, x, y) === 'both')!;
  const oneRing =
    `You may be treating “in a ring” and “only in that ring” as the same thing. They are two different things. ${cap(theCard(bothCard))} is big, and it is blue. So it goes in both rings, where they overlap.`;
  return {
    id: 's8.l1-do-place',
    title: 'Place the cards',
    body: [`These are the rings from the example: ${ringName(x)} and ${ringName(y)}. Four new cards wait under them.`, 'For each card, pick where it goes.'],
    scene: ringsScene(L1_EX, { loose: L1_LOOSE }),
    twin: 'The same rings and cards, with four new cards to place.',
    rows,
    afterCard,
    words: CARD_WORDS,
    misconceptions: [
      { id: 'in-vs-only', when: 'picks', picks: { [`${bothCard.id}-where`]: 'a' }, text: oneRing },
      { id: 'in-vs-only', when: 'picks', picks: { [`${bothCard.id}-where`]: 'b' }, text: oneRing },
    ],
    done: 'Right. Each card goes in every ring whose feature it has. A card with both features sits in the overlap.',
  };
}

// ---- lesson 2 ----

export const SOME_VS_NOT_ALL: Distinction = {
  id: 'some-vs-not-all',
  a: 'Everyday “some”: it often hints “not all.”',
  b: 'Logic’s “some”: at least one, and maybe all.',
};

/** Card scenes: every circle is red; then some are and some are not. */
export const L2_ALL: RingWorld = {
  x: L1_X,
  y: L1_Y,
  things: [mk('w1', 'big', 'red', 'circle'), mk('w2', 'small', 'red', 'circle'), mk('w3', 'small', 'red', 'square'), mk('w4', 'big', 'blue', 'triangle'), mk('w5', 'small', 'yellow', 'square')],
};
export const L2_SOME: RingWorld = {
  x: L1_X,
  y: L1_Y,
  things: [mk('w1', 'big', 'red', 'circle'), mk('w2', 'small', 'blue', 'circle'), mk('w3', 'big', 'red', 'square'), mk('w4', 'small', 'yellow', 'triangle')],
};
/** The worked example: triangles and blue. */
export const L2_EX: RingWorld = {
  x: grp('shape', 'triangle'),
  y: grp('color', 'blue'),
  things: [mk('w1', 'big', 'blue', 'triangle'), mk('w2', 'small', 'blue', 'triangle'), mk('w3', 'small', 'yellow', 'triangle'), mk('w4', 'big', 'blue', 'circle'), mk('w5', 'small', 'red', 'square')],
};
/** The board's twin: now every triangle is blue. */
export const L2_TWIN: RingWorld = {
  x: L2_EX.x,
  y: L2_EX.y,
  things: [mk('w1', 'big', 'blue', 'triangle'), mk('w2', 'small', 'blue', 'triangle'), mk('w3', 'small', 'blue', 'square'), mk('w4', 'big', 'red', 'circle'), mk('w5', 'small', 'yellow', 'square')],
};

export const allCardScene = () => ringsScene(L2_ALL, { caption: 'No circle sits only in the Circles ring.' });
export const someCardScene = () => ringsScene(L2_SOME, { caption: 'One circle sits in the overlap.' });
export const quantWorkedScene = () => ringsScene(L2_EX);

/** “All triangles are blue.”, then some and no, with their truth on the worked example. */
export function quantWorkedLines(): string[] {
  return (['all', 'some', 'none'] as const).map((q) => {
    const s = sen(q, L2_EX.x, L2_EX.y);
    const r = reasonOf(s, L2_EX);
    return `${quoteEnd(s)} ${cap(tv(r.value))}. ${r.lines[0]}`;
  });
}

const SOME_CONTRAST_A = [mk('k1', 'big', 'red', 'circle'), mk('k2', 'small', 'red', 'circle'), mk('k3', 'small', 'blue', 'circle')];
const SOME_CONTRAST_B = [mk('k1', 'big', 'red', 'circle'), mk('k2', 'small', 'red', 'circle'), mk('k3', 'big', 'red', 'circle')];

export function someContrast(): Extract<Scene, { kind: 'contrast' }> {
  const s = sen('some', L1_X, L1_Y);
  return {
    kind: 'contrast',
    pairs: [
      { world: 'Three circles: two red, one blue.', who: 'The sentence', says: say(s), truth: truth(s, SOME_CONTRAST_A), because: 'Two circles are red. “Some” needs at least one, so it is true.', things: SOME_CONTRAST_A },
      { world: 'Three circles, all red.', who: 'The sentence', says: say(s), truth: truth(s, SOME_CONTRAST_B), because: 'All three are red. That is at least one, so it is still true.', things: SOME_CONTRAST_B, then: 'In logic, “some” never means “not all.”' },
    ],
    ask: { q: 'Does “some” mean “not all”?', a: 'No. In logic, “some” means at least one. It is still true when all of them are.' },
    words: { worldTag: 'The cards' },
  };
}

const SOME_MIX =
  'You may be treating everyday “some” and logic’s “some” as the same thing. They are two different things. In everyday talk, “some” can hint “not all.” In logic, “some” means at least one, and maybe all.';
const SOME_Q: ConfusedQuestion = {
  q: 'Every cookie on a plate is round. Is “Some cookies are round” true?',
  options: [{ label: 'Yes. Some means at least one', right: true }, { label: 'No. Some means not all' }, { label: 'Not sure' }],
  teach: 'Yes. In logic, “some” means at least one. It stays true when all of them are.',
};

/** Do, board 1: right after the contrast. Three rows of circles: is “some” true? Is “all” true? */
export function someBoard(afterCard: number): DrillStep {
  const ss = [{ id: 'some', s: sen('some', L1_X, L1_Y) }, { id: 'all', s: sen('all', L1_X, L1_Y) }];
  const rows = [
    sentenceRow('r1', 'Three circles, all red.', [mk('a1', 'small', 'red', 'circle'), mk('a2', 'big', 'red', 'circle'), mk('a3', 'big', 'red', 'circle')], ss, L1_X, L1_Y),
    sentenceRow('r2', 'Three circles: two red, one blue.', [mk('b1', 'big', 'red', 'circle'), mk('b2', 'big', 'blue', 'circle'), mk('b3', 'small', 'red', 'circle')], ss, L1_X, L1_Y),
    sentenceRow('r3', 'Three circles, none red.', [mk('c1', 'small', 'blue', 'circle'), mk('c2', 'big', 'yellow', 'circle'), mk('c3', 'small', 'blue', 'circle')], ss, L1_X, L1_Y),
  ];
  return {
    id: 's8.l2-do-some',
    title: 'Is “some” true?',
    body: ['Each row has three circles. Is “Some circles are red” true for them?', 'Then: is “All circles are red” true?'],
    rows,
    afterCard,
    scaffold: 'full',
    words: SENTENCE_WORDS,
    misconceptions: [{ id: 'some-vs-not-all', when: 'picks', picks: { 'r1-some': 'false' }, text: SOME_MIX }],
    confused: [SOME_Q],
    distinction: SOME_VS_NOT_ALL.id,
    done: 'Right. “Some” is true when one or more fit, even when all of them do.',
  };
}

/** Do, board 2: the worked example's rings, now with every triangle blue. Mark all, some and no. */
export function quantBoard(afterCard: number): DrillStep {
  const { x, y } = L2_TWIN;
  const rows: DrillRow[] = (['all', 'some', 'none'] as const).map((q) => {
    const s = sen(q, x, y);
    const r = reasonOf(s, L2_TWIN);
    return { id: q, label: say(s), marks: [{ id: q, label: 'True or false?', options: TF, answer: tv(r.value), why: { [tv(!r.value)]: `${r.lines.join(' ')} So it is ${tv(r.value)}.` } }] };
  });
  return {
    id: 's8.l2-do-mark',
    title: 'Mark the sentences',
    body: ['These are the rings from the example, but now every triangle is blue.', 'Mark each sentence True or False.'],
    scene: ringsScene(L2_TWIN),
    twin: 'The same rings. Now every triangle is blue.',
    rows,
    afterCard,
    words: SENTENCE_WORDS,
    misconceptions: [{ id: 'some-vs-not-all', when: 'picks', picks: { some: 'false' }, text: SOME_MIX }],
    done: 'Right. Every triangle is blue, so “all” is true. That is at least one, so “some” is true too.',
  };
}

// ---- lesson 3 ----

export const NOT_ALL_VS_NONE: Distinction = {
  id: 'not-all-vs-none',
  a: '“Not all”: at least one is not.',
  b: '“None”: not even one is.',
};

export const L3_NOT_ALL: RingWorld = {
  x: L1_X,
  y: L1_Y,
  things: [mk('n1', 'big', 'red', 'circle'), mk('n2', 'small', 'red', 'circle'), mk('n3', 'small', 'blue', 'circle'), mk('n4', 'big', 'yellow', 'square')],
};
export const L3_SOME_OPP: RingWorld = {
  x: L1_X,
  y: L1_Y,
  things: [mk('n1', 'small', 'blue', 'circle'), mk('n2', 'big', 'yellow', 'circle'), mk('n3', 'small', 'red', 'square'), mk('n4', 'big', 'blue', 'triangle')],
};
/** The worked example: squares and yellow, one blue square circled. */
export const L3_EX: RingWorld = {
  x: grp('shape', 'square'),
  y: grp('color', 'yellow'),
  things: [mk('n1', 'big', 'yellow', 'square'), mk('n2', 'small', 'blue', 'square'), mk('n3', 'small', 'yellow', 'circle'), mk('n4', 'big', 'red', 'triangle')],
};
const L3_EX_S = sen('all', L3_EX.x, L3_EX.y);
/** The card that breaks “All squares are yellow.” */
export const L3_BREAKER = L3_EX.things.find((t) => breaks(L3_EX_S, t))!;

export const notAllCardScene = () => ringsScene(L3_NOT_ALL, { marked: L3_NOT_ALL.things.filter((t) => breaks(sen('all', L1_X, L1_Y), t)).map((t) => t.id) });
export const someOppCardScene = () => ringsScene(L3_SOME_OPP, { caption: 'The overlap is empty. No circle is red.' });
export const counterWorkedScene = () => ringsScene(L3_EX, { marked: [L3_BREAKER.id] });

const NOT_ALL_CARDS = [mk('m1', 'big', 'red', 'circle'), mk('m2', 'small', 'red', 'circle'), mk('m3', 'small', 'blue', 'circle')];

export function notAllContrast(): Extract<Scene, { kind: 'contrast' }> {
  const a = sen('notAll', L1_X, L1_Y), b = sen('none', L1_X, L1_Y);
  const world = 'Three circles: two red, one blue.';
  return {
    kind: 'contrast',
    pairs: [
      { world, who: 'The sentence', says: say(a), truth: truth(a, NOT_ALL_CARDS), because: 'One circle is blue. It is not red, so not all circles are red.', things: NOT_ALL_CARDS },
      { world, who: 'The sentence', says: say(b), truth: truth(b, NOT_ALL_CARDS), because: 'Two circles are red. “No” means not even one, so it is false.', things: NOT_ALL_CARDS },
    ],
    ask: { q: 'Does “not all” mean “none”?', a: 'No. “Not all” needs just one that is not red. “None” needs every one to be not red.' },
    words: { worldTag: 'The cards' },
  };
}

const NOT_ALL_MIX =
  'You may be treating “not all” and “none” as the same thing. They are two different things. “Not all circles are red” needs just one circle that is not red. “No circles are red” needs every circle to be not red.';
const NOT_ALL_Q: ConfusedQuestion = {
  q: 'One kid out of five has a cat. Is “No kids have a cat” true?',
  options: [{ label: 'No. One kid has a cat', right: true }, { label: 'Yes. Not all kids have a cat' }, { label: 'Not sure' }],
  teach: 'No. “No kids have a cat” needs every kid to have no cat. “Not all kids have a cat” is true, but it is a different sentence.',
};

/** Do, board 1: right after the contrast. Three rows of circles: “not all” and “no”. */
export function notAllBoard(afterCard: number): DrillStep {
  const ss = [{ id: 'notall', s: sen('notAll', L1_X, L1_Y) }, { id: 'none', s: sen('none', L1_X, L1_Y) }];
  const rows = [
    sentenceRow('r1', 'Three circles: two red, one blue.', [mk('a1', 'small', 'red', 'circle'), mk('a2', 'big', 'blue', 'circle'), mk('a3', 'big', 'red', 'circle')], ss, L1_X, L1_Y),
    sentenceRow('r2', 'Three circles, none red.', [mk('b1', 'big', 'blue', 'circle'), mk('b2', 'small', 'yellow', 'circle'), mk('b3', 'small', 'blue', 'circle')], ss, L1_X, L1_Y),
    sentenceRow('r3', 'Three circles, all red.', [mk('c1', 'big', 'red', 'circle'), mk('c2', 'small', 'red', 'circle'), mk('c3', 'small', 'red', 'circle')], ss, L1_X, L1_Y),
  ];
  return {
    id: 's8.l3-do-notall',
    title: '“Not all” or “none”?',
    body: ['Each row has three circles. Is “Not all circles are red” true for them?', 'Then: is “No circles are red” true?'],
    rows,
    afterCard,
    scaffold: 'full',
    words: SENTENCE_WORDS,
    misconceptions: [{ id: 'not-all-vs-none', when: 'picks', picks: { 'r1-none': 'true' }, text: NOT_ALL_MIX }],
    confused: [NOT_ALL_Q],
    distinction: NOT_ALL_VS_NONE.id,
    done: 'Right. One circle that is not red makes “not all” true. “None” needs every circle to be not red.',
  };
}

/** Do, board 2: the worked example without the circle. Which card breaks “All squares are yellow”? And its opposite. */
export function counterBoard(afterCard: number): DrillStep {
  const { x, y } = L3_EX;
  const S = L3_EX_S;
  const rows: DrillRow[] = L3_EX.things.map((t) => {
    const v = breaks(S, t);
    const why = v
      ? `${cap(theCard(t))} is a square, but it is not yellow. One card like that breaks it.`
      : inGroup(t, x)
        ? `${cap(theCard(t))} is a square, and it is yellow. It fits the sentence.`
        : `${cap(theCard(t))} is not a square. The sentence talks only about squares.`;
    return { id: t.id, label: cap(theCard(t)), things: [t], marks: [{ id: `${t.id}-breaks`, label: `Does it break ${quoteMid(S)}?`, options: YES_NO, answer: yn(v), why: { [yn(!v)]: why } }] };
  });
  const forms = (['someNot', 'none', 'some'] as const).map((q) => sen(q, x, y));
  const opp = forms.find((f) => isOpposite(S, f))!;
  const oppWhy: Record<string, string> = {};
  for (const f of forms) {
    if (f === opp) continue;
    const k = SHAPES4.find((sh) => truth(S, shapeCards(S, sh)) === truth(f, shapeCards(S, sh)))!;
    oppWhy[f.q] = `${quoteMid(f)} can be ${tv(truth(S, shapeCards(S, k)))} at the same time as ${quoteMid(S)}. An opposite never can.`;
  }
  rows.push({ id: 'opp', label: `The opposite of ${quoteEnd(S)}`, marks: [{ id: 'opp', label: 'Which sentence?', options: forms.map((f) => ({ id: f.q, label: say(f) })), answer: opp.q, why: oppWhy }] });
  return {
    id: 's8.l3-do-break',
    title: 'Find the card that breaks it',
    body: [`Sam says, ${quoteEnd(S)} For each card, does it break the sentence?`, 'Then pick the opposite of the sentence.'],
    scene: ringsScene(L3_EX),
    twin: 'The same rings, but no card is circled.',
    rows,
    afterCard,
    words: SENTENCE_WORDS,
    misconceptions: [{ id: 'not-all-vs-none', when: 'picks', picks: { opp: 'none' }, text: NOT_ALL_MIX.replace(/circles?/g, (m) => (m === 'circle' ? 'square' : 'squares')).replace(/red/g, 'yellow') }],
    done: 'Right. One square that is not yellow breaks it. So its opposite is “Some squares are not yellow.”',
  };
}

// ---- lesson 4 ----

export const BREAK_VS_MAKE: Distinction = {
  id: 'break-vs-make',
  a: '“All”: true unless a card breaks it.',
  b: '“Some”: true only if a card makes it true.',
};

export const L4_EMPTY: RingWorld = {
  x: grp('shape', 'square'),
  y: grp('color', 'red'),
  things: [mk('e1', 'big', 'red', 'circle'), mk('e2', 'small', 'red', 'triangle'), mk('e3', 'small', 'blue', 'circle'), mk('e4', 'big', 'yellow', 'triangle')],
};
/** The worked example (a dragon's cave): triangles and blue, and no triangle at all. */
export const L4_EX: RingWorld = {
  x: grp('shape', 'triangle'),
  y: grp('color', 'blue'),
  things: [mk('e1', 'big', 'blue', 'circle'), mk('e2', 'small', 'blue', 'square'), mk('e3', 'big', 'red', 'square'), mk('e4', 'small', 'yellow', 'circle')],
};
/** The board's twin: circles and yellow, and no circle at all. */
export const L4_TWIN: RingWorld = {
  x: grp('shape', 'circle'),
  y: grp('color', 'yellow'),
  things: [mk('e1', 'big', 'yellow', 'square'), mk('e2', 'small', 'yellow', 'triangle'), mk('e3', 'small', 'red', 'square'), mk('e4', 'big', 'blue', 'triangle')],
};

export const emptyCardScene = () => ringsScene(L4_EMPTY, { caption: 'The Squares ring is empty.' });
export const emptyWorkedScene = () => ringsScene(L4_EX);

export function emptyWorkedLines(): string[] {
  return (['all', 'some', 'none'] as const).map((q) => {
    const s = sen(q, L4_EX.x, L4_EX.y);
    const r = reasonOf(s, L4_EX, { one: 'gem', many: 'gems' });
    return `${quoteEnd(s, { one: 'gem', many: 'gems' })} ${cap(tv(r.value))}. ${r.lines[r.lines.length - 1]}`;
  });
}

const EMPTY_CARDS = [mk('q1', 'big', 'red', 'circle'), mk('q2', 'small', 'red', 'triangle'), mk('q3', 'small', 'blue', 'circle')];

export function breakMakeContrast(): Extract<Scene, { kind: 'contrast' }> {
  const a = sen('all', L4_EMPTY.x, L4_EMPTY.y), b = sen('some', L4_EMPTY.x, L4_EMPTY.y);
  const world = 'Three cards, and not one square.';
  return {
    kind: 'contrast',
    pairs: [
      { world, who: 'The sentence', says: say(a), truth: truth(a, EMPTY_CARDS), because: 'No square is here, so no square breaks it. It is true.', things: EMPTY_CARDS },
      { world, who: 'The sentence', says: say(b), truth: truth(b, EMPTY_CARDS), because: 'No square is here, so no square makes it true. It is false.', things: EMPTY_CARDS },
    ],
    ask: { q: 'Why do they come out different?', a: '“All” is true unless a card breaks it. “Some” is true only if a card makes it true.' },
    words: { worldTag: 'The cards' },
  };
}

const EMPTY_ALL_MIX =
  'You may be treating “nothing makes it true” and “something breaks it” as the same thing. They are two different things. An “all” sentence is false only if a card breaks it. With no squares, no square can break “All squares are red.”';
const EMPTY_SOME_MIX =
  'You may be treating “nothing breaks it” and “something makes it true” as the same thing. They are two different things. “Some squares are red” needs one red square to make it true. With no squares, nothing does.';
const EMPTY_Q: ConfusedQuestion = {
  q: 'A shelf has no books at all. Is “All the books on the shelf are blue” true?',
  options: [{ label: 'Yes. No book breaks it', right: true }, { label: 'No. There are no books to be blue' }, { label: 'Not sure' }],
  teach: 'Yes. To break it, you need a book on the shelf that is not blue. There is no book, so nothing breaks it.',
};

/** Do, board 1: right after the contrast. Three rows of cards: “all” and “some” about squares. */
export function emptyBoard(afterCard: number): DrillStep {
  const { x, y } = L4_EMPTY;
  const ss = [{ id: 'all', s: sen('all', x, y) }, { id: 'some', s: sen('some', x, y) }];
  const rows = [
    sentenceRow('r1', 'Two cards, and no square.', [mk('a1', 'big', 'red', 'circle'), mk('a2', 'small', 'blue', 'triangle')], ss, x, y),
    sentenceRow('r2', 'Two squares, both red.', [mk('b1', 'big', 'red', 'square'), mk('b2', 'small', 'red', 'square')], ss, x, y),
    sentenceRow('r3', 'Two squares: one red, one blue.', [mk('c1', 'small', 'red', 'square'), mk('c2', 'big', 'blue', 'square')], ss, x, y),
  ];
  return {
    id: 's8.l4-do-empty',
    title: 'Break it, or make it true?',
    body: ['For each row: is “All squares are red” true?', 'Then: is “Some squares are red” true?'],
    rows,
    afterCard,
    scaffold: 'full',
    words: SENTENCE_WORDS,
    misconceptions: [
      { id: 'break-vs-make', when: 'picks', picks: { 'r1-all': 'false' }, text: EMPTY_ALL_MIX },
      { id: 'break-vs-make', when: 'picks', picks: { 'r1-some': 'true' }, text: EMPTY_SOME_MIX },
    ],
    confused: [EMPTY_Q],
    distinction: BREAK_VS_MAKE.id,
    done: 'Right. With no squares, nothing breaks “all,” so it is true. Nothing makes “some” true, so it is false.',
  };
}

/** Do, board 2: a twin of the worked example (no circle at all). Mark all, some and no. */
export function emptyMarkBoard(afterCard: number): DrillStep {
  const { x, y } = L4_TWIN;
  const rows: DrillRow[] = (['all', 'some', 'none'] as const).map((q) => {
    const s = sen(q, x, y);
    const r = reasonOf(s, L4_TWIN);
    return { id: q, label: say(s), marks: [{ id: q, label: 'True or false?', options: TF, answer: tv(r.value), why: { [tv(!r.value)]: `${r.lines.join(' ')} So it is ${tv(r.value)}.` } }] };
  });
  return {
    id: 's8.l4-do-mark',
    title: 'Mark the sentences',
    body: ['Now the rings are Circles and Yellow. There is no circle at all.', 'Mark each sentence True or False.'],
    scene: ringsScene(L4_TWIN, { caption: 'The Circles ring is empty.' }),
    twin: 'New rings, Circles and Yellow. Again, one ring is empty.',
    rows,
    afterCard,
    words: SENTENCE_WORDS,
    misconceptions: [
      { id: 'break-vs-make', when: 'picks', picks: { all: 'false' }, text: EMPTY_ALL_MIX.replace(/squares?/g, (m) => (m === 'square' ? 'circle' : 'circles')).replace(/red/g, 'yellow') },
      { id: 'break-vs-make', when: 'picks', picks: { some: 'true' }, text: EMPTY_SOME_MIX.replace(/squares?/g, (m) => (m === 'square' ? 'circle' : 'circles')).replace(/red/g, 'yellow') },
    ],
    done: 'Right. Nothing breaks “all” or “no,” so both are true. Nothing makes “some” true, so it is false.',
  };
}

/** Every key-idea card scene, so tests can check that no quiz repeats one. */
export const CARD_SCENES = (): Scene[] => [oneRingCardScene(), twoRingsCardScene(), memberWorkedScene(), allCardScene(), someCardScene(), quantWorkedScene(), notAllCardScene(), someOppCardScene(), counterWorkedScene(), emptyCardScene(), emptyWorkedScene()];

