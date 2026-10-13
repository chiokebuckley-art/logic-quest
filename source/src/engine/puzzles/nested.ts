/**
 * Stop 9 · All, Some, None (id s8), Lesson 6: Every and some: who comes first. The engine.
 *
 * The model: a picture of two groups, drawn as rings side by side (Scene 'rings' with `links`): kids on the left,
 * friends on the right, and a line between each kid and friend who are friends (LinkPic). Two sentences are checked
 * on the picture, line by line:
 *
 *   Every kid has a friend.            each kid has at least one line (the friends can be different)
 *   There is one friend of every kid.  one friend has a line to every kid (one person for all)
 *
 * “Every” first lets each kid have a different friend; “one” first needs one friend for all. When there is one friend
 * of every kid, every kid has a friend; not the other way. A picture is one of three shapes: each (every kid has a
 * friend, but no one friend is a friend of all), shared (one friend of every kid) or gap (a kid with no friend). Every
 * answer is worked out on the picture's lines; the test works each one out again from the table of who is friends.
 *
 * Question kinds (skill s8.order): truth (is the sentence true for this picture? The trap, tag each-not-shared:
 * “Every kid has a friend” with a different friend for each kid, which is true), which (which sentences are true),
 * picture (in which picture is a sentence true) and line (which new line makes “one friend of every kid” true).
 * Skins: kids and friends (everyday), elves and dragons (fantasy), dots and stars (abstract).
 */
import { syncWhyWrong } from '../teach';
import type { BoardWords, Choice, ChoiceFeedback, ConfusedQuestion, Distinction, DrillRow, DrillStep, Rng, Scene, Teach, TeachCase } from '../types';
import type { RingsScene, S8Skin } from './quantifiers';
import type { ItemCore, Made, Noun } from './statements';

// ---------- the model: a picture of lines ----------

/** Kids (left), friends (right), and each line as [kid index, friend index]. */
export interface LinkPic {
  left: string[];
  right: string[];
  lines: [number, number][];
}
/** The two sentences: “Every kid has a friend” (each) and “There is one friend of every kid” (shared). */
export type Pq = 'each' | 'shared';
export const PQS: readonly Pq[] = ['each', 'shared'];

export const linked = (p: LinkPic, l: number, r: number) => p.lines.some(([a, b]) => a === l && b === r);
/** The friends of one kid, by index. */
export const friendsOf = (p: LinkPic, l: number) => p.right.map((_, r) => r).filter((r) => linked(p, l, r));
/** The kids of one friend, by index. */
export const kidsOf = (p: LinkPic, r: number) => p.left.map((_, l) => l).filter((l) => linked(p, l, r));
/** The friends who are a friend of every kid, by index. */
export const friendsOfAll = (p: LinkPic) => p.right.map((_, r) => r).filter((r) => kidsOf(p, r).length === p.left.length);

/** Is the sentence true for the picture? Checked line by line. */
export function holdsOn(q: Pq, p: LinkPic): boolean {
  return q === 'each' ? p.left.every((_, l) => friendsOf(p, l).length > 0) : friendsOfAll(p).length > 0;
}

/** The three shapes a picture can take. */
export type PicShape = 'each' | 'shared' | 'gap';
export const shapeOfPic = (p: LinkPic): PicShape => (holdsOn('shared', p) ? 'shared' : holdsOn('each', p) ? 'each' : 'gap');

/** The picture with one more line. */
export const withLine = (p: LinkPic, l: number, r: number): LinkPic => ({ ...p, lines: [...p.lines, [l, r]] });

// ---------- the cast: who is in the picture, and the words ----------

const joinAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const tv = (v: boolean) => (v ? 'true' : 'false');
const noEnd = (s: string) => s.replace(/\.$/, '');
const quote = (s: string) => `“${noEnd(s)}”`;
/** The sentence in quotes, ending a sentence: “Every kid has a friend.” */
const quoteEnd = (s: string) => `“${noEnd(s)}.”`;

/** The people (or things) in a picture, and how to say every fact about it. */
export interface Cast {
  skin: S8Skin;
  left: Noun;
  right: Noun;
  /** The ring names: “Kids”, “Friends”. */
  rings: [string, string];
  leftNames: readonly string[];
  rightNames: readonly string[];
  /** Names stay in their list order (Dot A, Dot B), or are picked at random. */
  ordered: boolean;
  each: string;
  shared: string;
  /** What the picture shows, before a question. */
  lead: string;
  /** “Ava’s friend is Kim.” / “Ava has no friend here.” */
  has: (l: string, rs: string[]) => string;
  /** “Kim is a friend of Ava and Ben.” */
  friendOf: (r: string, ls: string[]) => string;
  /** “Kim is not a friend of Cal.” */
  notOf: (r: string, l: string) => string;
  /** “every kid has a friend”, “no one friend is a friend of every kid”. */
  eachShort: string;
  noOneShort: string;
  /** “a friend of every kid”. */
  ofEvery: string;
}

export const CASTS: Record<S8Skin, Cast> = {
  everyday: {
    skin: 'everyday',
    left: { one: 'kid', many: 'kids' },
    right: { one: 'friend', many: 'friends' },
    rings: ['Kids', 'Friends'],
    leftNames: ['Ava', 'Ben', 'Cal', 'Dee', 'Fay', 'Gus', 'Kai', 'Max'],
    rightNames: ['Kim', 'Lia', 'Nia', 'Omar', 'Pia', 'Raj', 'Tia', 'Zoe'],
    ordered: false,
    each: 'Every kid has a friend.',
    shared: 'There is one friend of every kid.',
    lead: 'Kids are on the left, and friends are on the right. A line means two of them are friends.',
    has: (l, rs) => (!rs.length ? `${l} has no friend here.` : rs.length === 1 ? `${l}’s friend is ${rs[0]}.` : `${l}’s friends are ${joinAnd(rs)}.`),
    friendOf: (r, ls) => `${r} is a friend of ${joinAnd(ls)}.`,
    notOf: (r, l) => `${r} is not a friend of ${l}.`,
    eachShort: 'every kid has a friend',
    noOneShort: 'no one friend is a friend of every kid',
    ofEvery: 'a friend of every kid',
  },
  fantasy: {
    skin: 'fantasy',
    left: { one: 'elf', many: 'elves' },
    right: { one: 'dragon', many: 'dragons' },
    rings: ['Elves', 'Dragons'],
    leftNames: ['Pip', 'Tam', 'Wren', 'Bo', 'Fen', 'Lark'],
    rightNames: ['Ember', 'Flint', 'Mist', 'Ash', 'Glow', 'Moss'],
    ordered: false,
    each: 'Every elf has a dragon friend.',
    shared: 'There is one dragon friend of every elf.',
    lead: 'Elves are on the left, and dragons are on the right. A line means an elf and a dragon are friends.',
    has: (l, rs) => (!rs.length ? `${l} has no dragon friend here.` : rs.length === 1 ? `${l}’s dragon friend is ${rs[0]}.` : `${l}’s dragon friends are ${joinAnd(rs)}.`),
    friendOf: (r, ls) => `${r} is a friend of ${joinAnd(ls)}.`,
    notOf: (r, l) => `${r} is not a friend of ${l}.`,
    eachShort: 'every elf has a dragon friend',
    noOneShort: 'no one dragon is a friend of every elf',
    ofEvery: 'a friend of every elf',
  },
  abstract: {
    skin: 'abstract',
    left: { one: 'dot', many: 'dots' },
    right: { one: 'star', many: 'stars' },
    rings: ['Dots', 'Stars'],
    leftNames: ['Dot A', 'Dot B', 'Dot C', 'Dot D'],
    rightNames: ['Star 1', 'Star 2', 'Star 3'],
    ordered: true,
    each: 'Every dot has a line to a star.',
    shared: 'There is one star with a line to every dot.',
    lead: 'Dots are on the left, and stars are on the right. A line joins a dot and a star.',
    has: (l, rs) => (!rs.length ? `${l} has no line.` : `${l} has a line to ${joinAnd(rs)}.`),
    friendOf: (r, ls) => `${r} has a line to ${joinAnd(ls)}.`,
    notOf: (r, l) => `${r} has no line to ${l}.`,
    eachShort: 'every dot has a line to a star',
    noOneShort: 'no one star has a line to every dot',
    ofEvery: 'joined to every dot',
  },
};

export const sentenceOf = (c: Cast, q: Pq) => (q === 'each' ? c.each : c.shared);

/** The picture in words: each kid and their friends. Enough on its own if the picture cannot load. */
export function picWords(c: Cast, p: LinkPic): string {
  return p.left.map((l, i) => c.has(l, friendsOf(p, i).map((r) => p.right[r]))).join(' ');
}

/** Why the sentence is true or false on the picture: a short clause and the lines that show it. */
export function orderReason(c: Cast, q: Pq, p: LinkPic): { value: boolean; short: string; lines: string[] } {
  const value = holdsOn(q, p);
  const alone = p.left.findIndex((_, l) => !friendsOf(p, l).length);
  if (q === 'each') {
    if (value) {
      const same = friendsOfAll(p).length > 0;
      return {
        value,
        short: c.eachShort,
        lines: [picWords(c, p), ...(same ? [] : [`The ${c.right.many} are not all the same, and they do not need to be.`])],
      };
    }
    return { value, short: noEnd(c.has(p.left[alone], [])), lines: [c.has(p.left[alone], []), `Not every ${c.left.one} has one.`] };
  }
  if (value) {
    const r = friendsOfAll(p)[0];
    return { value, short: `${p.right[r]} is ${c.ofEvery}`, lines: [c.friendOf(p.right[r], p.left), `One ${c.right.one} for all is enough.`] };
  }
  return {
    value,
    short: c.noOneShort,
    lines: p.right.map((r, i) => c.notOf(r, p.left[p.left.findIndex((_, l) => !linked(p, l, i))])),
  };
}

/** What a sentence means, in words. */
function meaningOf(c: Cast, q: Pq): string {
  return q === 'each'
    ? `${quote(c.each)} means each ${c.left.one} has at least one. They can be different ${c.right.many}.`
    : `${quote(c.shared)} means one ${c.right.one} is ${c.ofEvery}.`;
}

// ---------- pictures ----------

/** The rings scene of one picture or several (each named). */
export function linksScene(c: Cast, frames: { name?: string; p: LinkPic }[], caption?: string): RingsScene {
  return {
    kind: 'rings',
    rings: c.rings,
    a: [],
    both: [],
    b: [],
    out: [],
    links: frames.map((f) => ({ ...(f.name ? { name: f.name } : {}), left: [...f.p.left], right: [...f.p.right], lines: f.p.lines.map(([l, r]) => [l, r] as [number, number]) })),
    ...(caption ? { caption } : {}),
  };
}

/** The names for a picture: n kids and m friends. */
function namesFor(rng: Rng, c: Cast, n: number, m: number): { left: string[]; right: string[] } {
  if (c.ordered) return { left: c.leftNames.slice(0, n), right: c.rightNames.slice(0, m) };
  return { left: rng.shuffle(c.leftNames).slice(0, n), right: rng.shuffle(c.rightNames).slice(0, m) };
}

/** Clean pictures: 1-6 lines; a gap has one kid alone; a shared picture has one friend of every kid; no kid has 3 lines. */
function clean(p: LinkPic, shape: PicShape): boolean {
  if (!p.lines.length || p.lines.length > 6) return false;
  if (p.left.some((_, l) => friendsOf(p, l).length > 2)) return false;
  if (shape === 'gap') return p.left.filter((_, l) => !friendsOf(p, l).length).length === 1;
  if (shape === 'shared') return friendsOfAll(p).length === 1;
  return true;
}

/** A picture of the wanted shape, from random lines (the shape is checked on the lines, never assumed). */
export function makePic(rng: Rng, left: string[], right: string[], shape: PicShape): LinkPic {
  for (let t = 0; t < 500; t++) {
    const lines: [number, number][] = [];
    left.forEach((_, l) => right.forEach((_, r) => { if (rng.chance(0.4)) lines.push([l, r]); }));
    const p = { left, right, lines };
    if (shapeOfPic(p) === shape && clean(p, shape)) return p;
  }
  // A plain one, built by hand (rarely needed): each kid a different friend; one friend for all; the last kid alone.
  const lines: [number, number][] =
    shape === 'shared' ? left.map((_, l) => [l, 0] as [number, number]) : shape === 'each' ? left.map((_, l) => [l, l % right.length] as [number, number]) : left.slice(0, -1).map((_, l) => [l, l % right.length] as [number, number]);
  const p = { left, right, lines };
  if (shapeOfPic(p) !== shape) throw new Error(`makePic: no ${shape} picture`);
  return p;
}

// ---------- teaching pieces ----------

/** One picture as a worked case: its lines in words, and both sentences checked. */
export function picCase(c: Cast, p: LinkPic, note?: string, label?: string): TeachCase {
  const v1 = holdsOn('each', p), v2 = holdsOn('shared', p);
  return {
    label: label ?? picWords(c, p),
    truths: [{ who: quote(c.each), value: v1 }, { who: quote(c.shared), value: v2 }],
    note: note ?? (v2 ? `${c.friendOf(p.right[friendsOfAll(p)[0]], p.left)} So both are true.` : v1 ? `Each one has a ${c.right.one}, but not the same one.` : `${orderReason(c, 'each', p).lines[0]} So both are false.`),
  };
}

/** The three small pictures every explanation shows: each has one, one for all, and one left out. */
export function shapeCases(c: Cast): TeachCase[] {
  const [l0, l1] = c.leftNames, [r0, r1] = c.rightNames;
  const pic = (lines: [number, number][]): LinkPic => ({ left: [l0, l1], right: [r0, r1], lines });
  return [
    picCase(c, pic([[0, 0], [1, 1]]), `Each one has a ${c.right.one}, but not the same one. Only the first sentence is true.`),
    picCase(c, pic([[0, 0], [1, 0]])),
    picCase(c, pic([[0, 0]])),
  ];
}

function orderTeach(c: Cast, q: Pq, p: LinkPic): Teach {
  return {
    rule: `${quote(c.each)} is true when each ${c.left.one} has at least one line. ${quote(c.shared)} is true only when one ${c.right.one} is ${c.ofEvery}.`,
    terms: [
      { word: quote(c.each), meaning: `each ${c.left.one} has one, and they can be different.` },
      { word: quote(c.shared), meaning: `one ${c.right.one} for all of them.` },
    ],
    meaning: `To check ${quote(c.each)}, look at each ${c.left.one}. To check ${quote(c.shared)}, look at each ${c.right.one}.`,
    casesTitle: 'Three small pictures, with both sentences checked',
    cases: shapeCases(c),
    remember: [`“Every” first: check each ${c.left.one}. “One” first: look for one ${c.right.one} with a line to every ${c.left.one}.`, 'Ask: “Do they all need the same one?”'],
    simpler: q === 'each'
      ? [`Look at each ${c.left.one}, one at a time.`, `Does each one have a line? ${orderReason(c, 'each', p).lines[0]}`, `So it is ${tv(holdsOn('each', p))}.`]
      : [`Look at each ${c.right.one}, one at a time.`, `Is one of them ${c.ofEvery}?`, ...orderReason(c, 'shared', p).lines, `So it is ${tv(holdsOn('shared', p))}.`],
  };
}

/** A hint that checks one kid (for “every”) or one friend (for “one”) and never decides the answer. */
function hintFor(c: Cast, q: Pq, p: LinkPic): TeachCase {
  if (q === 'shared') {
    const r = p.right.findIndex((_, i) => kidsOf(p, i).length < p.left.length);
    if (r >= 0) {
      const miss = p.left[p.left.findIndex((_, l) => !linked(p, l, r))];
      return { label: `${p.right[r]}.`, truths: [{ who: `${p.right[r]} is ${c.ofEvery}`, value: false }], note: `${c.notOf(p.right[r], miss)} Now check the other ${c.right.many}.` };
    }
  }
  const l = p.left.findIndex((_, i) => friendsOf(p, i).length > 0);
  const k = l >= 0 ? l : 0;
  const has = friendsOf(p, k).length > 0;
  return { label: `${p.left[k]}.`, truths: [{ who: `${p.left[k]} has a line`, value: has }], note: `${c.has(p.left[k], friendsOf(p, k).map((r) => p.right[r]))} Now check every other ${c.left.one}.` };
}

// ---------- made items ----------

export type OrderKind = 'truth' | 'which' | 'picture' | 'line';

/** A made item and its model, for tests. */
export interface OrderMade extends Made {
  kind: OrderKind;
  cast: Cast;
  /** The picture asked about (truth, which, line), or every picture (picture), by choice id. */
  pic?: LinkPic;
  pics?: Record<string, LinkPic>;
  q?: Pq;
}

/** The trap tag (LessonDef.pass include): “every kid has a friend” with a different friend for each kid. */
export const EACH_NOT_SHARED = { tag: 'each-not-shared', label: '“every kid has a friend” with a different friend for each kid' } as const;

const TF: Choice[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];

function done(kind: OrderKind, item: ItemCore, extra: Omit<OrderMade, 'tag' | 'kind' | 'item'>): OrderMade {
  if (item.kind === 'choose') syncWhyWrong(item);
  return { tag: 'order', kind, item, ...extra };
}

/**
 * Is the sentence true for this picture? `trap`: “Every kid has a friend” on a picture where each kid has a different
 * friend (true; a conflict item). `want`: the answer wanted; `shape`: the picture's shape.
 */
export function orderTruthItem(rng: Rng, o: { skin: S8Skin; q: Pq; shape?: PicShape; want?: boolean; trap?: boolean }): OrderMade {
  const c = CASTS[o.skin];
  const q: Pq = o.trap ? 'each' : o.q;
  const shapes: PicShape[] = o.want === undefined ? ['each', 'shared', 'gap'] : (['each', 'shared', 'gap'] as PicShape[]).filter((s) => (s === 'gap' ? false : q === 'each' || s === 'shared') === o.want);
  const shape: PicShape = o.trap ? 'each' : o.shape ?? rng.pick(shapes);
  const { left, right } = namesFor(rng, c, rng.int(3, 4), rng.int(2, 3));
  const p = makePic(rng, left, right, shape);
  const r = orderReason(c, q, p);
  const wrong = tv(!r.value);
  const trapLine = q === 'each' && r.value && shape === 'each' ? [`${quote(c.each)} does not need one ${c.right.one} for all. That would be ${quoteEnd(c.shared)}`] : [];
  const feedback: Record<string, ChoiceFeedback> = {
    [wrong]: { headline: `Your answer says ${wrong}, but ${r.short}.`, detail: [meaningOf(c, q), ...r.lines, ...trapLine], example: picCase(c, p, undefined, `This picture: ${picWords(c, p)}`) },
  };
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${c.lead} Here is a sentence: ${quoteEnd(sentenceOf(c, q))} Is it true for this picture?`,
    scene: linksScene(c, [{ p }]),
    choices: TF,
    answer: tv(r.value),
    feedback,
    explain: `${r.lines.join(' ')} So ${quote(sentenceOf(c, q))} is ${tv(r.value)}.`,
    hint: `Check one at a time. Here is one, checked for you.`,
    hintCase: hintFor(c, q, p),
    teach: orderTeach(c, q, p),
    ...(o.trap ? { tags: [EACH_NOT_SHARED.tag], conflict: true } : {}),
  };
  return done('truth', item, { cast: c, pic: p, q });
}

/** Which sentences are true for this picture? Both, only “every”, only “one”, or neither. */
export function orderWhichItem(rng: Rng, o: { skin: S8Skin; shape?: PicShape }): OrderMade {
  const c = CASTS[o.skin];
  const shape = o.shape ?? rng.pick(['each', 'each', 'shared', 'gap'] as const);
  const { left, right } = namesFor(rng, c, rng.int(3, 4), rng.int(2, 3));
  const p = makePic(rng, left, right, shape);
  const v1 = holdsOn('each', p), v2 = holdsOn('shared', p);
  const claims: Record<string, [boolean, boolean]> = { both: [true, true], each: [true, false], shared: [false, true], neither: [false, false] };
  const right_ = Object.keys(claims).find((k) => claims[k][0] === v1 && claims[k][1] === v2)!;
  const choices: Choice[] = [
    { id: 'both', label: 'Both sentences are true.' },
    { id: 'each', label: `Only ${quote(c.each)} is true.` },
    { id: 'shared', label: `Only ${quote(c.shared)} is true.` },
    { id: 'neither', label: 'Neither sentence is true.' },
  ];
  const r1 = orderReason(c, 'each', p), r2 = orderReason(c, 'shared', p);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) {
    if (ch.id === right_) continue;
    const [c1, c2] = claims[ch.id];
    const misses: string[] = [];
    if (c1 !== v1) misses.push(`Your answer says ${quote(c.each)} is ${tv(c1)}, but ${r1.short}.`);
    if (c2 !== v2) misses.push(`Your answer says ${quote(c.shared)} is ${tv(c2)}, but ${r2.short}.`);
    feedback[ch.id] = {
      headline: misses[0],
      detail: [...misses.slice(1), ...(ch.id === 'shared' ? [`Your answer can’t happen. If one ${c.right.one} is ${c.ofEvery}, then every ${c.left.one} has one.`] : []), ...r1.lines, ...r2.lines.filter((x) => !r1.lines.includes(x))],
      example: picCase(c, p, undefined, `This picture: ${picWords(c, p)}`),
    };
  }
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${c.lead} Sentence 1: ${quoteEnd(c.each)} Sentence 2: ${quoteEnd(c.shared)} Which is true for this picture?`,
    scene: linksScene(c, [{ p }]),
    choices,
    answer: right_,
    feedback,
    explain: `${r1.lines[0]} So sentence 1 is ${tv(v1)}. ${r2.lines.join(' ')} So sentence 2 is ${tv(v2)}.`,
    hint: `Check sentence 1 one ${c.left.one} at a time. Here is one, checked for you.`,
    hintCase: hintFor(c, 'each', p),
    teach: orderTeach(c, 'shared', p),
  };
  return done('which', item, { cast: c, pic: p });
}

/** In which picture is the sentence true? Three pictures with the same names; exactly one fits. */
export function orderPictureItem(rng: Rng, o: { skin: S8Skin; q?: Pq }): OrderMade {
  const c = CASTS[o.skin];
  const q = o.q ?? rng.pick(PQS);
  const shapes: PicShape[] = q === 'shared' ? ['each', 'shared', 'gap'] : [rng.pick(['each', 'each', 'shared'] as const), 'gap', 'gap'];
  const { left, right } = namesFor(rng, c, 3, rng.int(2, 3));
  const pics: LinkPic[] = [];
  for (const s of shapes) {
    let p = makePic(rng, left, right, s);
    for (let t = 0; t < 40 && pics.some((x) => JSON.stringify(x.lines) === JSON.stringify(p.lines)); t++) p = makePic(rng, left, right, s);
    pics.push(p);
  }
  const ids = shapes.map((s, i) => (shapes.indexOf(s) === i ? s : `${s}2`));
  const order = rng.shuffle([0, 1, 2]);
  const named = order.map((k, i) => ({ id: ids[k], p: pics[k], name: `Picture ${i + 1}` }));
  const hits = named.filter((f) => holdsOn(q, f.p));
  if (hits.length !== 1) throw new Error(`orderPictureItem: ${hits.length} pictures fit`);
  const answer = hits[0];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const f of named) {
    if (f === answer) continue;
    const r = orderReason(c, q, f.p);
    feedback[f.id] = {
      headline: `Your picture breaks it: ${r.short}.`,
      detail: [meaningOf(c, q), ...r.lines, `It is true only in ${answer.name}.`],
      example: picCase(c, f.p, undefined, `${f.name}: ${picWords(c, f.p)}`),
    };
  }
  const other = named.find((f) => f !== answer)!;
  const ro = orderReason(c, q, other.p);
  const ra = orderReason(c, q, answer.p);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${c.lead} Here is a sentence: ${quoteEnd(sentenceOf(c, q))} In which picture is it true?`,
    scene: linksScene(c, named.map((f) => ({ name: f.name, p: f.p }))),
    choices: named.map((f) => ({ id: f.id, label: f.name })),
    answer: answer.id,
    feedback,
    explain: `In ${answer.name}, ${ra.short}. ${ra.lines.join(' ')} In the other pictures, it is false.`,
    hint: 'Check one picture at a time. Here is one, checked for you.',
    hintCase: { label: `${other.name}: ${picWords(c, other.p)}`, truths: [{ who: quote(sentenceOf(c, q)), value: false }], note: `${cap(ro.short)}.` },
    teach: orderTeach(c, q, answer.p),
  };
  return done('picture', item, { cast: c, pics: Object.fromEntries(named.map((f) => [f.id, f.p])), q });
}

/** Which one new line makes “There is one friend of every kid” true? One friend has a line to every kid but one. */
export function orderLineItem(rng: Rng, o: { skin: S8Skin }): OrderMade {
  const c = CASTS[o.skin];
  const { left, right } = namesFor(rng, c, 3, rng.int(2, 3));
  let p: LinkPic | undefined;
  let fixes: [number, number][] = [];
  for (let t = 0; t < 400; t++) {
    const star = rng.int(0, right.length - 1), lone = rng.int(0, left.length - 1);
    const lines: [number, number][] = left.map((_, l) => [l, star] as [number, number]).filter(([l]) => l !== lone);
    left.forEach((_, l) => right.forEach((_, r) => { if (r !== star && rng.chance(0.3)) lines.push([l, r]); }));
    const cand = { left, right, lines };
    if (holdsOn('shared', cand) || cand.lines.length > 6) continue;
    const free: [number, number][] = [];
    left.forEach((_, l) => right.forEach((_, r) => { if (!linked(cand, l, r)) free.push([l, r]); }));
    fixes = free.filter(([l, r]) => holdsOn('shared', withLine(cand, l, r)));
    if (fixes.length === 1 && free.length >= 3) { p = cand; break; }
  }
  if (!p) throw new Error('orderLineItem: no picture');
  const pic = p;
  const [fl, fr] = fixes[0];
  const free: [number, number][] = [];
  left.forEach((_, l) => right.forEach((_, r) => { if (!linked(pic, l, r) && !(l === fl && r === fr)) free.push([l, r]); }));
  const wrongs = rng.shuffle(free).slice(0, 2);
  const idOf = ([l, r]: [number, number]) => `l${l}r${r}`;
  const label = ([l, r]: [number, number]) => `A line from ${left[l]} to ${right[r]}`;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const [l, r] of wrongs) {
    const after = withLine(pic, l, r);
    const miss = left[left.findIndex((_, k) => !linked(after, k, r))];
    feedback[idOf([l, r])] = {
      headline: `Your line joins ${left[l]} and ${right[r]}, but ${c.notOf(right[r], miss)}`,
      detail: [`One ${c.right.one} must be ${c.ofEvery}.`, `${right[fr]} already has a line to every ${c.left.one} but ${left[fl]}.`],
      example: picCase(c, after, undefined, `With your line: ${picWords(c, after)}`),
    };
  }
  const choices = rng.shuffle([[fl, fr] as [number, number], ...wrongs]).map((x) => ({ id: idOf(x), label: label(x) }));
  const helperR = right.findIndex((_, r) => r !== fr);
  const after = withLine(pic, fl, fr);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${c.lead} Which new line would make ${quote(c.shared)} true?`,
    scene: linksScene(c, [{ p: pic }]),
    choices,
    answer: idOf([fl, fr]),
    feedback,
    explain: `${right[fr]} has a line to every ${c.left.one} but ${left[fl]}. A line from ${left[fl]} to ${right[fr]} makes ${right[fr]} ${c.ofEvery}.`,
    hint: `Look for a ${c.right.one} with a line to almost every ${c.left.one}. Here is one, checked for you.`,
    hintCase: {
      label: `${right[helperR]}.`,
      truths: [{ who: `${right[helperR]} is ${c.ofEvery}`, value: false }],
      note: `${kidsOf(pic, helperR).length ? c.friendOf(right[helperR], kidsOf(pic, helperR).map((k) => left[k])) : `${right[helperR]} has no line yet.`} Count the lines ${right[helperR]} is missing.`,
    },
    teach: {
      ...orderTeach(c, 'shared', after),
      simpler: [`Look at each ${c.right.one}.`, `Count the ${c.left.many} with no line to that ${c.right.one}.`, `${right[fr]} is missing only ${left[fl]}.`, `So the new line goes from ${left[fl]} to ${right[fr]}.`],
    },
  };
  return done('line', item, { cast: c, pic });
}

// ---------- See and Do: the cards, the contrast and the boards ----------

const E = CASTS.everyday;
const pic = (left: string[], right: string[], lines: [number, number][]): LinkPic => ({ left, right, lines });
/** Card 1: every kid has a friend, with different friends. */
export const L6_EACH = pic(['Ava', 'Ben', 'Cal'], ['Kim', 'Lia'], [[0, 0], [1, 1], [2, 0]]);
/** Card 2: one friend of every kid (Lia). */
export const L6_SHARED = pic(['Ava', 'Ben', 'Cal'], ['Kim', 'Lia'], [[0, 1], [1, 1], [2, 1], [2, 0]]);
/** The contrast: two kids, each with a different friend. */
export const L6_PAIR = pic(['Ava', 'Ben'], ['Kim', 'Lia'], [[0, 0], [1, 1]]);
/** The worked example: every kid has a friend, no one friend of all. */
export const L6_EX = pic(['Ava', 'Ben', 'Cal'], ['Kim', 'Lia'], [[0, 0], [1, 0], [1, 1], [2, 1]]);
/** The board's twin: Cal's line goes to Kim, not Lia. */
export const L6_TWIN = pic(['Ava', 'Ben', 'Cal'], ['Kim', 'Lia'], [[0, 0], [1, 0], [1, 1], [2, 0]]);

export const eachCardScene = () => linksScene(E, [{ p: L6_EACH }]);
export const sharedCardScene = () => linksScene(E, [{ p: L6_SHARED }]);
export const orderWorkedScene = () => linksScene(E, [{ p: L6_EX }]);

/** The worked lines for the cards, from the model. */
export const eachCardLine = () => `Here ${picWords(E, L6_EACH)} So it is ${tv(holdsOn('each', L6_EACH))}.`;
export const sharedCardLine = () => `Here ${E.friendOf('Lia', L6_SHARED.left.filter((_, l) => linked(L6_SHARED, l, 1)))} So it is ${tv(holdsOn('shared', L6_SHARED))}.`;
export function orderWorkedLines(): string[] {
  const r1 = orderReason(E, 'each', L6_EX), r2 = orderReason(E, 'shared', L6_EX);
  return [
    `For “${noEnd(E.each)},” check each kid. ${r1.lines[0]} So it is ${tv(r1.value)}.`,
    `For “${noEnd(E.shared)},” check each friend. ${r2.lines.join(' ')} So it is ${tv(r2.value)}.`,
  ];
}

export const EACH_VS_SHARED: Distinction = {
  id: 'each-vs-shared',
  a: 'Each has one: every kid has a friend, maybe a different one.',
  b: 'One for all: one friend is a friend of every kid.',
};

export function orderContrast(): Extract<Scene, { kind: 'contrast' }> {
  const world = picWords(E, L6_PAIR);
  const r1 = orderReason(E, 'each', L6_PAIR), r2 = orderReason(E, 'shared', L6_PAIR);
  return {
    kind: 'contrast',
    pairs: [
      { world, who: 'The sentence', says: E.each, truth: r1.value, because: 'Ava has Kim, and Ben has Lia. Each kid has a friend.' },
      { world, who: 'The sentence', says: E.shared, truth: r2.value, because: `${r2.lines.join(' ')} No one friend has both.` },
    ],
    ask: { q: 'Did the picture change?', a: 'No. Only the words changed. “Every kid” first: each kid has one. “One friend” first: one friend for all.' },
    words: { worldTag: 'The picture' },
  };
}

const ORDER_WORDS: BoardWords = {
  says: 'Sentence',
  world: 'The picture',
  so: 'So',
  ask: 'Does the picture fit the sentence?',
  closing: 'Those two ideas are apart now. Back to the board: check each kid, then each friend.',
};
const EACH_MIX =
  'You may be treating “every kid has a friend” and “one friend of every kid” as the same thing. They are two different things. In Picture 1, Ava has Kim and Ben has Lia. Each kid has a friend, so the first sentence is true.';
const SHARED_MIX =
  'You may be treating “one friend of every kid” and “every kid has a friend” as the same thing. They are two different things. In Picture 1, Kim is not Ben’s friend, and Lia is not Ava’s friend. No one friend has both.';
const EACH_Q: ConfusedQuestion = {
  q: 'Two kids each have a different friend. Is “Every kid has a friend” true?',
  options: [{ label: 'Yes. Each kid has one', right: true }, { label: 'No. They need the same friend' }, { label: 'Not sure' }],
  teach: 'Yes. “Every kid has a friend” lets each kid have a different friend. One friend for both would be “There is one friend of every kid.”',
};

/** The three pictures of the contrast board: each has one, one for all, one left out. */
export const L6_BOARD_PICS: LinkPic[] = [L6_PAIR, pic(['Ava', 'Ben'], ['Kim', 'Lia'], [[0, 0], [1, 0]]), pic(['Ava', 'Ben'], ['Kim', 'Lia'], [[0, 0]])];

/** Do, board 1: right after the contrast. Three pictures: is each sentence true? */
export function orderBoard(afterCard: number): DrillStep {
  const rows: DrillRow[] = L6_BOARD_PICS.map((p, k) => {
    const id = `r${k + 1}`;
    const words = picWords(E, p);
    return {
      id,
      label: `Picture ${k + 1}. ${words}`,
      marks: PQS.map((q) => {
        const r = orderReason(E, q, p);
        return {
          id: `${id}-${q}`,
          label: sentenceOf(E, q),
          options: TF,
          answer: tv(r.value),
          why: { [tv(!r.value)]: `${r.lines.join(' ')} So it is ${tv(r.value)}.` },
          compare: { says: sentenceOf(E, q), world: words },
        };
      }),
    };
  });
  return {
    id: 's8.l6-do-order',
    title: 'Each has one, or one for all?',
    body: ['Each picture has two kids and two friends. Is “Every kid has a friend” true?', 'Then: is “There is one friend of every kid” true?'],
    scene: linksScene(E, L6_BOARD_PICS.map((p, k) => ({ name: `Picture ${k + 1}`, p }))),
    twin: 'Picture 1 is the picture from the card. Two more pictures change one line each.',
    rows,
    afterCard,
    scaffold: 'full',
    words: ORDER_WORDS,
    misconceptions: [
      { id: EACH_VS_SHARED.id, when: 'picks', picks: { 'r1-each': 'false' }, text: EACH_MIX },
      { id: EACH_VS_SHARED.id, when: 'picks', picks: { 'r1-shared': 'true' }, text: SHARED_MIX },
    ],
    confused: [EACH_Q],
    distinction: EACH_VS_SHARED.id,
    done: 'Right. Picture 1 has a friend for each kid, but no one friend for all. Picture 2 has both.',
  };
}

/** Do, board 2: a twin of the worked example. Check each kid, each friend, then both sentences. */
export function orderTwinBoard(afterCard: number): DrillStep {
  const p = L6_TWIN;
  const kidRows: DrillRow[] = p.left.map((l, i) => {
    const has = friendsOf(p, i).length > 0;
    return { id: `k${i + 1}`, label: l, marks: [{ id: `k${i + 1}-has`, label: 'Has a friend?', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }], answer: has ? 'yes' : 'no', why: { [has ? 'no' : 'yes']: E.has(l, friendsOf(p, i).map((r) => p.right[r])) } }] };
  });
  const friendRows: DrillRow[] = p.right.map((r, i) => {
    const all = kidsOf(p, i).length === p.left.length;
    const miss = p.left.find((_, l) => !linked(p, l, i));
    return { id: `f${i + 1}`, label: r, marks: [{ id: `f${i + 1}-all`, label: 'A friend of every kid?', options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }], answer: all ? 'yes' : 'no', why: { [all ? 'no' : 'yes']: all ? E.friendOf(r, p.left) : E.notOf(r, miss!) } }] };
  });
  const sentRows: DrillRow[] = PQS.map((q) => {
    const r = orderReason(E, q, p);
    return { id: q, label: sentenceOf(E, q), marks: [{ id: q, label: 'True or false?', options: TF, answer: tv(r.value), why: { [tv(!r.value)]: `${r.lines.join(' ')} So it is ${tv(r.value)}.` } }] };
  });
  const kim = p.right.findIndex((_, i) => kidsOf(p, i).length === p.left.length);
  return {
    id: 's8.l6-do-check',
    title: 'Check each kid, then each friend',
    body: ['For each kid: does the kid have a friend?', 'For each friend: is that friend a friend of every kid?', 'Then mark both sentences.'],
    scene: linksScene(E, [{ p }]),
    twin: 'The same kids and friends. Now Cal’s line goes to Kim, not Lia.',
    rows: [...kidRows, ...friendRows, ...sentRows],
    afterCard,
    words: ORDER_WORDS,
    misconceptions: [{ id: EACH_VS_SHARED.id, when: 'picks', picks: { shared: 'false' }, text: `You may be treating “one friend of every kid” and “only one friend in the picture” as the same thing. They are two different things. ${E.friendOf(p.right[kim], p.left)} Other friends can be there too.` }],
    done: `Right. ${E.friendOf(p.right[kim], p.left)} So both sentences are true.`,
  };
}

/** Every key-idea card picture of the lesson, so tests can check that no quiz repeats one. */
export const L6_CARD_SCENES = (): Scene[] => [eachCardScene(), sharedCardScene(), orderWorkedScene()];
