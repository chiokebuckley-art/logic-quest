/**
 * Pattern Observatory, Ring 3 (Deep Sky): the Analogy Bridge's model and items. An analogy keeps the link of the
 * first pair, not its look: A is to B as C is to D.
 *
 *  same dimension (L1)   shape cards: one feature changes (big turns small), so D is C with the same change
 *  across dimensions (L2) opposites: big and small are opposites in size, so loud goes with quiet (sound)
 *  words (L3)            a link stated as a sentence: a key opens a lock, so a password opens an account
 *  transfer              the same kinds of link in a new domain: tools, animals, jobs
 *
 * One wrong option is always a look-alike (error tag appearance-match): the first pair's answer, or a word that sounds
 * or looks like it. Every answer comes from the model: the change on the cards, the opposite poles of a dimension, or
 * the link's table of pairs; `keepsCard`, `opposite` and `holds` are the validators the tests brute-force.
 */
import type { BridgeCard, BridgeScene } from '../../scenes/bridge';
import type { Choice, ChoiceFeedback, ChooseItem, Phase, Rng, Teach, TeachCase } from '../../types';
import { L3, YES_NO, cap, chooseOf, type ItemSpec } from './mirror';

// =====================================================================================================================
// Cards: one feature changes
// =====================================================================================================================

export type Card = BridgeCard;
export type Feature = 'size' | 'color' | 'shape';
export const FEATURES: readonly Feature[] = ['size', 'color', 'shape'];
export const VALUES: { size: readonly Card['size'][]; color: readonly Card['color'][]; shape: readonly Card['shape'][] } = {
  size: ['big', 'small'],
  color: ['red', 'blue', 'yellow'],
  shape: ['circle', 'square', 'triangle'],
};
export const allCards = (): Card[] => VALUES.size.flatMap((size) => VALUES.color.flatMap((color) => VALUES.shape.map((shape) => ({ size, color, shape }))));
export const sameCard = (a: Card, b: Card) => a.size === b.size && a.color === b.color && a.shape === b.shape;
export const cardWords = (c: Card) => `${c.size} ${c.color} ${c.shape}`;
/** "a small blue square". */
export const aCard = (c: Card) => `a ${cardWords(c)}`;
const setF = (c: Card, f: Feature, v: string): Card => ({ ...c, [f]: v }) as Card;

/** A change of one feature: from one value to another; nothing else changes. */
export interface Change { f: Feature; from: string; to: string }
/** The validator: does o come from c by exactly this change? */
export const keepsCard = (ch: Change, c: Card, o: Card) => c[ch.f] === ch.from && o[ch.f] === ch.to && FEATURES.every((f) => f === ch.f || c[f] === o[f]);
/** The plank's words for a change: "turns small", "turns blue", "turns into a square". */
export const changeWords = (ch: Change) => (ch.f === 'shape' ? `turns into a ${ch.to}` : `turns ${ch.to}`);

export interface CardAnalogy { ch: Change; a: Card; b: Card; c: Card; d: Card; same: Card; extra: Card; extraF: Feature }

export function makeCardAnalogy(rng: Rng): CardAnalogy {
  for (;;) {
    const f = rng.pick(FEATURES);
    const [from, to] = rng.shuffle(VALUES[f] as readonly string[]);
    const ch: Change = { f, from, to };
    const a = setF(rng.pick(allCards()), f, from);
    const c = setF(rng.pick(allCards()), f, from);
    if (sameCard(a, c)) continue;
    const b = setF(a, f, to);
    const d = setF(c, f, to);
    const extraF = rng.pick(FEATURES.filter((x) => x !== f));
    const extra = setF(d, extraF, rng.pick((VALUES[extraF] as readonly string[]).filter((v) => v !== c[extraF])));
    if ([b, c, d].some((x) => sameCard(x, extra))) continue;
    return { ch, a, b, c, d, same: c, extra, extraF };
  }
}

// =====================================================================================================================
// Opposites across dimensions
// =====================================================================================================================

/**
 * A dimension with its two poles: the first word of each pole is its main word, the rest mean the same. `family`
 * groups the dimensions a child may hear as one kind of thing: size, height, width and depth are all how big something
 * is, so tall and small (or big and short) can sound like opposites. An item never puts two of one family together.
 */
export interface Dimension { id: string; noun: string; family: string; poles: [readonly string[], readonly string[]] }
export const DIMENSIONS: readonly Dimension[] = [
  { id: 'size', noun: 'size', family: 'how big', poles: [['big', 'large', 'huge'], ['small', 'little', 'tiny']] },
  { id: 'height', noun: 'height', family: 'how big', poles: [['tall'], ['short']] },
  { id: 'sound', noun: 'sound', family: 'sound', poles: [['loud', 'noisy'], ['quiet', 'silent']] },
  { id: 'speed', noun: 'speed', family: 'speed', poles: [['fast', 'quick'], ['slow']] },
  { id: 'heat', noun: 'heat', family: 'heat', poles: [['hot'], ['cold', 'chilly']] },
  { id: 'depth', noun: 'depth', family: 'how big', poles: [['deep'], ['shallow']] },
  { id: 'wetness', noun: 'wetness', family: 'wetness', poles: [['wet'], ['dry']] },
  { id: 'width', noun: 'width', family: 'how big', poles: [['wide'], ['narrow']] },
];
/** Where a word sits: its dimension and pole. */
export function placeOf(word: string): { dim: Dimension; pole: 0 | 1 } | undefined {
  for (const dim of DIMENSIONS) for (const pole of [0, 1] as const) if (dim.poles[pole].includes(word)) return { dim, pole };
  return undefined;
}
/** The validator: are two words opposites (the same dimension, the other pole)? */
export function opposite(x: string, y: string): boolean {
  const a = placeOf(x);
  const b = placeOf(y);
  return !!a && !!b && a.dim.id === b.dim.id && a.pole !== b.pole;
}

export interface OppositeAnalogy { d1: Dimension; d2: Dimension; d3: Dimension; d4: Dimension; a: string; b: string; c: string; d: string; look: string; same: string; far: string }

export function makeOpposites(rng: Rng): OppositeAnalogy {
  // One dimension from each of four families, so no choice is a second, arguable opposite of c.
  const families = rng.shuffle([...new Set(DIMENSIONS.map((d) => d.family))]).slice(0, 4);
  const [d1, d2, d3, d4] = families.map((f) => rng.pick(DIMENSIONS.filter((d) => d.family === f)));
  const p = rng.pick([0, 1] as const);
  const q = rng.pick([0, 1] as const);
  const a = d1.poles[p][0];
  const b = d1.poles[1 - p][0];
  const c = d2.poles[q][0];
  const d = d2.poles[1 - q][0];
  // The look-alike means what b means (or is b); "same" means what c means (else a word from a fourth kind); "far" is
  // from a third kind of thing.
  const look = d1.poles[1 - p].length > 1 ? rng.pick(d1.poles[1 - p].slice(1)) : b;
  const same = d2.poles[q].length > 1 ? rng.pick(d2.poles[q].slice(1)) : d4.poles[rng.int(0, 1)][0];
  const far = d3.poles[rng.int(0, 1)][0];
  return { d1, d2, d3, d4, a, b, c, d, look, same, far };
}

// =====================================================================================================================
// Links in words
// =====================================================================================================================

export interface LinkPair {
  x: string;
  y: string;
  /** With its article, as a sentence uses it: "a key", "an account", "hair". */
  ax: string;
  ay: string;
  /** A word that goes with x, or sounds like it, but does not keep the link: the look-alike from x's side. */
  near: string;
  aNear: string;
}
export interface Link {
  id: string;
  /** The words on the plank: "opens". */
  link: string;
  domain: 'things' | 'tools' | 'animals' | 'jobs';
  pairs: LinkPair[];
  /** Answers no x of this link ever takes (checked by hand to be plainly false), with their articles. */
  wrong: readonly string[];
}

const art = (w: string) => (/^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`);
const P = (x: string, y: string, near: string, o: { bareY?: boolean; bareNear?: boolean } = {}): LinkPair => ({ x, y, ax: art(x), ay: o.bareY ? y : art(y), near, aNear: o.bareNear ? near : art(near) });

export const LINKS: readonly Link[] = [
  { id: 'opens', link: 'opens', domain: 'things', wrong: ['a cloud', 'a spoon', 'a song'], pairs: [P('key', 'lock', 'ring'), P('password', 'account', 'keyboard'), P('can opener', 'can', 'kitchen')] },
  { id: 'part', link: 'is part of', domain: 'things', wrong: ['a cloud', 'a spoon', 'a song'], pairs: [P('page', 'book', 'pen'), P('petal', 'flower', 'bee'), P('wheel', 'bike', 'road'), P('finger', 'hand', 'ring')] },
  { id: 'used-on', link: 'is used on', domain: 'tools', wrong: ['a cloud', 'a song', 'a puddle'], pairs: [P('hammer', 'nail', 'toolbox'), P('screwdriver', 'screw', 'toolbox'), P('comb', 'hair', 'mirror', { bareY: true }), P('toothbrush', 'teeth', 'toothpaste', { bareY: true, bareNear: true })] },
  { id: 'measures', link: 'measures', domain: 'tools', wrong: ['color', 'taste', 'smell'], pairs: [P('ruler', 'length', 'math', { bareY: true, bareNear: true }), P('clock', 'time', 'wall', { bareY: true }), P('scale', 'weight', 'kitchen', { bareY: true }), P('thermometer', 'temperature', 'nurse', { bareY: true })] },
  { id: 'lives-in', link: 'lives in', domain: 'animals', wrong: ['a cloud', 'a spoon', 'a song'], pairs: [P('spider', 'web', 'fly'), P('bee', 'hive', 'honey', { bareNear: true }), P('fish', 'pond', 'fin')] },
  { id: 'grows', link: 'grows into', domain: 'animals', wrong: ['a rock', 'a tree', 'a cloud'], pairs: [P('puppy', 'dog', 'bone'), P('kitten', 'cat', 'mitten'), P('tadpole', 'frog', 'pond'), P('caterpillar', 'butterfly', 'leaf'), P('calf', 'cow', 'milk', { bareNear: true }), P('chick', 'hen', 'egg')] },
  { id: 'works-in', link: 'works in', domain: 'jobs', wrong: ['a nest', 'a pond', 'a puddle'], pairs: [P('chef', 'kitchen', 'pot'), P('teacher', 'classroom', 'chalk', { bareNear: true }), P('librarian', 'library', 'book'), P('pilot', 'cockpit', 'suitcase'), P('farmer', 'field', 'cow')] },
];
export const linkById = (id: string) => LINKS.find((l) => l.id === id)!;
/** The validator: does x stand in this link to y (by the link's table)? */
export const holds = (l: Link, x: string, y: string) => l.pairs.some((p) => p.x === x && p.y === y);
/** "A key opens a lock." */
export const sentence = (l: Link, x: string, ay: string) => `${cap(art(x))} ${l.link} ${ay}.`;

export interface WordAnalogy { l: Link; ab: LinkPair; cd: LinkPair; other: { word: string; a: string } }

export function makeWords(rng: Rng, domains: readonly Link['domain'][]): WordAnalogy {
  const l = rng.pick(LINKS.filter((x) => domains.includes(x.domain)));
  const [ab, cd] = rng.shuffle(l.pairs);
  // A fourth option: an answer this link never gives (a plainly false one), not already on the list.
  const taken = new Set([cd.ay, ab.ay, cd.aNear].map((w) => w.toLowerCase()));
  const o = rng.pick(l.wrong.filter((w) => !taken.has(w.toLowerCase())));
  return { l, ab, cd, other: { word: o.replace(/^an? /, ''), a: o } };
}

// =====================================================================================================================
// Items
// =====================================================================================================================

const linkSpec = (o: Partial<ItemSpec> & Pick<ItemSpec, 'skill' | 'phase' | 'task'>): ItemSpec => ({
  lesson: L3,
  level: 1,
  twin: `${L3}.${o.skill.split('.')[1]}`,
  metaSkill: 'Track 3 · analogies keep the link',
  rule: 'A is to B as C is to D: the link from A to B also takes C to D',
  rep: 'words on a bridge',
  difficulty: 2,
  tags: ['appearance-match'],
  conflict: true,
  ...o,
});

const KEEPS = { truth: 'yes', untruth: 'no' } as const;

function linkTeach(cases: TeachCase[], firstPair: string, test: string, right: string): Teach {
  return {
    rule: 'An analogy keeps the link of the first pair. Name the link, then use the same link on the new pair.',
    terms: [
      { word: 'A link', meaning: 'what joins two things: what one does to the other, or how one changes into the other.' },
      { word: 'A look-alike', meaning: 'an answer that looks or sounds like a word in the puzzle, but does not keep the link.' },
    ],
    casesTitle: 'Each choice, tested with the link',
    cases,
    remember: ['Keep the link, not the look.', 'Ask: “Does my answer make the same sentence true?”'],
    simpler: [`Say the first pair as a sentence: ${firstPair}`, `Put the new word in the same sentence: ${test}`, `Pick the answer that makes it true: ${right}.`],
  };
}

const LINK_HINTS = [
  'Say the link as a short sentence about the first pair.',
  'Put the new word into the same sentence.',
  'Pick the answer that makes the sentence true. Skip answers that only look alike.',
];

/** A marked twin for the hint, with words no link here uses, so it never shows an answer. */
const wordsHint: TeachCase = { label: 'A twin: a sock goes on a foot. The link is “goes on.” So a hat goes on a head.', truths: [{ who: 'Keeps the link', value: true }], words: KEEPS, note: 'Same sentence, new words.' };
/**
 * A marked twin for the hint: a change of a different feature from this item's, on cards that appear nowhere in the
 * item, so it never shows the answer.
 */
function cardsHint(x: CardAnalogy): TeachCase {
  const g = FEATURES.find((f) => f !== x.ch.f)!;
  const used = [x.a, x.b, x.c, x.d, x.same, x.extra];
  for (const t of allCards()) {
    const to = (VALUES[g] as readonly string[]).find((v) => v !== t[g])!;
    const t2 = setF(t, g, to);
    if (used.some((u) => sameCard(u, t) || sameCard(u, t2))) continue;
    const kept = FEATURES.filter((f) => f !== g).map((f) => ({ who: `${cap(f)} kept`, value: true }));
    return { label: `A twin: ${aCard(t)} turns into ${aCard(t2)}. Only the ${g} changed.`, truths: kept, words: YES_NO, note: 'The other features stay the same.' };
  }
  throw new Error('no twin card');
}

const oppHint: TeachCase = { label: 'A twin: up and down are opposites in direction. In and out are opposites too, in a new way.', truths: [{ who: 'Keeps the link', value: true }], words: KEEPS, note: 'The link is “opposites,” whatever the words are about.' };

/** Do (L1): one feature changes on the cards; keep the change, not the look. */
export function cardLinkItem(rng: Rng, o: { framed?: boolean; phase?: Phase; level?: 1 | 2 | 3 } = {}): ChooseItem {
  const x = makeCardAnalogy(rng);
  const { ch, a, b, c, d, same, extra, extraF } = x;
  const framed = !!o.framed;
  const choices: Choice[] = rng.shuffle([
    { id: 'keep', label: aCard(d) },
    { id: 'look', label: aCard(b) },
    { id: 'same', label: aCard(same) },
    { id: 'extra', label: aCard(extra) },
  ]);
  const what = `its ${ch.f}: ${ch.from} became ${ch.to}`;
  const feedback: Record<string, ChoiceFeedback> = {
    look: {
      headline: `${cap(aCard(b))} looks like the first answer, but it did not come from the ${cardWords(c)}.`,
      detail: [`The first card changed only ${what}.`, `Make the same change to the ${cardWords(c)}, and keep the rest: ${aCard(d)}.`],
      example: { label: `The ${cardWords(c)} turns into ${aCard(b)}?`, truths: [{ who: `Only the ${ch.f} changed`, value: false }], words: YES_NO, note: `${cap(aCard(d))} keeps the link.` },
    },
    same: {
      headline: `${cap(aCard(same))} has not changed at all.`,
      detail: [`The first card changed ${what}.`, `Do the same to the ${cardWords(c)}: it becomes ${aCard(d)}.`],
      example: { label: `The ${cardWords(c)} stays the ${cardWords(c)}?`, truths: [{ who: `The ${ch.f} changed`, value: false }], words: YES_NO },
    },
    extra: {
      headline: `${cap(aCard(extra))} changed its ${extraF} too.`,
      detail: [`In the first pair, only the ${ch.f} changes. The ${extraF} stays the same.`, `So the ${cardWords(c)} becomes ${aCard(d)}.`],
      example: { label: `The ${cardWords(c)} turns into ${aCard(extra)}?`, truths: [{ who: `Only the ${ch.f} changed`, value: false }], words: YES_NO },
    },
  };
  const cases: TeachCase[] = [d, b, same, extra].map((o2) => ({ label: `${cap(aCard(o2))}.`, truths: [{ who: 'Keeps the link', value: keepsCard(ch, c, o2) }], words: KEEPS }));
  const scene: BridgeScene = { kind: 'bridge', a: cardWords(a), b: cardWords(b), relation: changeWords(ch), hidden: !framed, c: cardWords(c), cards: { a, b, c } };
  return chooseOf(
    linkSpec({
      skill: 's16.link-same', phase: o.phase ?? 'do', task: 'carry a one-feature change to a new card', rep: 'shape cards on a bridge', level: o.level ?? 1, difficulty: framed ? 1 : 2,
      rule: `one feature changes (${ch.f}: ${ch.from} to ${ch.to}); every other feature stays the same`,
    }),
    {
      prompt: `The ${cardWords(a)} turns into the ${cardWords(b)}. By the same change, what does the ${cardWords(c)} turn into?`,
      scene,
      explain: `Only the ${ch.f} changed: ${ch.from} became ${ch.to}. Do the same to the ${cardWords(c)}, and keep its other features. It becomes ${aCard(d)}.`,
      teach: linkTeach(cases, `the ${cardWords(a)} ${changeWords(ch)}.`, `the ${cardWords(c)} ${changeWords(ch)}…`, aCard(d)),
      hints: ['What changed from the first card to the second? Name just that.', `Make that same change to the ${cardWords(c)}.`, 'Keep every other feature. Skip a card that only looks like the first answer.'],
      hintCase: cardsHint(x),
      ...(framed ? { frame: `Change only what changed in the first pair. So the ${cardWords(c)} turns into ___.` } : {}),
    },
    choices,
    'keep',
    feedback,
    { look: 'appearance-match' },
  );
}

/** Do (L2): opposites across dimensions. Big and small are opposites in size; loud goes with quiet, in sound. */
export function oppositeItem(rng: Rng, o: { phase?: Phase; level?: 1 | 2 | 3 } = {}): ChooseItem {
  const x = makeOpposites(rng);
  const { d1, d2, d3, a, b, c, d, look, same, far } = x;
  const choices: Choice[] = rng.shuffle([
    { id: 'keep', label: d },
    { id: 'look', label: look },
    { id: 'same', label: same },
    { id: 'far', label: far },
  ]);
  const feedback: Record<string, ChoiceFeedback> = {
    look: {
      headline: look === b ? `${cap(b)} is the first pair’s answer, and it is about ${d1.noun}, not ${d2.noun}.` : `${cap(look)} means the same as ${b}, so it is about ${d1.noun}, not ${d2.noun}.`,
      detail: [`${cap(a)} and ${b} are opposites in ${d1.noun}.`, `${cap(c)} is about ${d2.noun}. Its opposite in ${d2.noun} is ${d}.`],
      example: { label: `${cap(c)} and ${look}: opposites?`, truths: [{ who: 'Same kind of thing', value: false }], words: YES_NO, note: `${cap(c)} and ${d} keep the link.` },
    },
    same: placeOf(same)!.dim.id === d2.id
      ? {
          headline: `${cap(same)} means the same as ${c}, not its opposite.`,
          detail: [`${cap(a)} and ${b} are opposites. So the answer must be the opposite of ${c}: ${d}.`],
          example: { label: `${cap(c)} and ${same}: opposites?`, truths: [{ who: 'Opposite ends', value: false }], words: YES_NO },
        }
      : {
          headline: `${cap(same)} is about ${placeOf(same)!.dim.noun}, not ${d2.noun}.`,
          detail: [`The opposite of ${c} must be about ${d2.noun} too. That is ${d}.`],
          example: { label: `${cap(c)} and ${same}: opposites?`, truths: [{ who: 'Same kind of thing', value: false }], words: YES_NO },
        },
    far: {
      headline: `${cap(far)} is about ${d3.noun}, not ${d2.noun}.`,
      detail: [`The opposite of ${c} must be about ${d2.noun} too. That is ${d}.`],
      example: { label: `${cap(c)} and ${far}: opposites?`, truths: [{ who: 'Same kind of thing', value: false }], words: YES_NO },
    },
  };
  const cases: TeachCase[] = [d, look, same, far].map((w) => ({ label: `${cap(c)} and ${w}.`, truths: [{ who: 'Opposites', value: opposite(c, w) }], words: KEEPS }));
  return chooseOf(
    linkSpec({ skill: 's16.link-across', phase: o.phase ?? 'do', task: 'carry “opposites” to a new kind of thing', level: o.level ?? 2, difficulty: 3, rule: 'A and B are opposite ends of one kind of thing; D is the opposite end of C’s kind' }),
    {
      prompt: `${cap(a)} is to ${b} as ${c} is to what? Name the link first.`,
      scene: { kind: 'bridge', a, b, relation: 'opposites', hidden: true, c },
      explain: `${cap(a)} and ${b} are opposites in ${d1.noun}. ${cap(c)} is about ${d2.noun}, so the link takes it to its opposite in ${d2.noun}: ${d}.`,
      teach: linkTeach(cases, `${a} and ${b} are opposites.`, `${c} and … are opposites.`, d),
      hints: [`How are ${a} and ${b} linked? Say it in a short sentence.`, `What kind of thing is ${c} about?`, `Find its opposite of the same kind. Skip words that only look like ${b}.`],
      hintCase: oppHint,
    },
    choices,
    'keep',
    feedback,
    { look: 'appearance-match' },
  );
}

/** Do (L3) or transfer: a link in words. Transfer draws from a new domain (tools, animals, jobs). */
export function wordLinkItem(rng: Rng, o: { framed?: boolean; phase?: Phase; transfer?: boolean; level?: 1 | 2 | 3 } = {}): ChooseItem {
  const transfer = o.transfer ?? false;
  const x = makeWords(rng, transfer ? ['tools', 'animals', 'jobs'] : ['things']);
  const { l, ab, cd, other } = x;
  const framed = !!o.framed;
  const choices: Choice[] = rng.shuffle([
    { id: 'keep', label: cd.ay },
    { id: 'look', label: ab.ay },
    { id: 'near', label: cd.aNear },
    { id: 'other', label: other.a },
  ]);
  const rightSentence = sentence(l, cd.x, cd.ay);
  const test = (ay: string) => `${cap(art(cd.x))} ${l.link} ${ay}?`;
  const feedback: Record<string, ChoiceFeedback> = {
    look: {
      headline: `${cap(ab.ay)} copies the first pair’s answer, but it does not keep the link.`,
      detail: [`The link is: ${sentence(l, ab.x, ab.ay)}`, `Test it: ${test(ab.ay)} No. ${rightSentence}`],
      example: { label: test(ab.ay), truths: [{ who: 'Keeps the link', value: false }], words: KEEPS, note: rightSentence },
    },
    near: {
      headline: `${cap(cd.aNear)} goes with ${art(cd.x)}, but not by this link.`,
      detail: [`The link is: ${sentence(l, ab.x, ab.ay)}`, `Test it: ${test(cd.aNear)} No. ${rightSentence}`],
      example: { label: test(cd.aNear), truths: [{ who: 'Keeps the link', value: false }], words: KEEPS, note: rightSentence },
    },
    other: {
      headline: `${cap(other.a)} does not keep the link.`,
      detail: [`The link is: ${sentence(l, ab.x, ab.ay)}`, `Test it: ${test(other.a)} No. ${rightSentence}`],
      example: { label: test(other.a), truths: [{ who: 'Keeps the link', value: false }], words: KEEPS, note: rightSentence },
    },
  };
  const cases: TeachCase[] = [cd.ay, ab.ay, cd.aNear, other.a].map((w, i) => ({ label: `${test(w)}`, truths: [{ who: 'Keeps the link', value: i === 0 }], words: KEEPS }));
  const domain = l.domain === 'things' ? 'everyday things' : l.domain;
  return chooseOf(
    linkSpec({
      skill: transfer ? 's16.link-transfer' : 's16.link-words', phase: o.phase ?? (transfer ? 'transfer' : 'do'), task: 'carry a link stated in words to a new pair',
      rep: `words about ${domain}`, level: o.level ?? 3, difficulty: framed ? 2 : 3, rule: `the link “${l.link}” holds for both pairs`,
    }),
    {
      prompt: `${cap(ab.x)} is to ${ab.y} as ${cd.x} is to what? Name the link first, then carry it across.`,
      scene: { kind: 'bridge', a: ab.x, b: ab.y, relation: l.link, hidden: !framed, c: cd.x },
      explain: `The link is: ${sentence(l, ab.x, ab.ay)} The same link gives: ${rightSentence}`,
      teach: linkTeach(cases, sentence(l, ab.x, ab.ay), `${cap(art(cd.x))} ${l.link} …`, cd.ay),
      hints: LINK_HINTS,
      hintCase: wordsHint,
      ...(framed ? { frame: `${sentence(l, ab.x, ab.ay)} So ${art(cd.x)} ${l.link} ___.` } : {}),
    },
    choices,
    'keep',
    feedback,
    { look: 'appearance-match', near: 'appearance-match' },
  );
}

/** Explain: name the link before choosing. Each choice pairs an answer with a reason; one reason names the link. */
export function linkWhyItem(rng: Rng, o: { phase?: Phase } = {}): ChooseItem {
  const { l, ab, cd } = makeWords(rng, ['things']);
  const right = sentence(l, cd.x, cd.ay);
  const choices: Choice[] = rng.shuffle([
    { id: 'link', label: `${cap(cd.ay)}, because ${art(ab.x)} ${l.link} ${ab.ay}, and ${art(cd.x)} ${l.link} ${cd.ay}.` },
    { id: 'copy', label: `${cap(ab.ay)}, because the first pair ends with ${ab.ay}.` },
    { id: 'near', label: `${cap(cd.aNear)}, because it goes with ${art(cd.x)}.` },
    { id: 'feel', label: `${cap(cd.ay)}, because it sounds right next to ${cd.x}.` },
  ]);
  const feedback: Record<string, ChoiceFeedback> = {
    copy: {
      headline: 'That reason copies the look of the first pair, not its link.',
      detail: [`The link is: ${sentence(l, ab.x, ab.ay)}`, `Test the copy: ${cap(art(cd.x))} ${l.link} ${ab.ay}? No. ${right}`],
      example: { label: `${cap(art(cd.x))} ${l.link} ${ab.ay}?`, truths: [{ who: 'Keeps the link', value: false }], words: KEEPS },
    },
    near: {
      headline: `${cap(cd.aNear)} goes with ${art(cd.x)}, but the reason never tests the link.`,
      detail: [`The link is: ${sentence(l, ab.x, ab.ay)}`, `Test it: ${cap(art(cd.x))} ${l.link} ${cd.aNear}? No. ${right}`],
      example: { label: `${cap(art(cd.x))} ${l.link} ${cd.aNear}?`, truths: [{ who: 'Keeps the link', value: false }], words: KEEPS },
    },
    feel: {
      headline: `${cap(cd.ay)} is the right answer, but that reason does not name the link.`,
      detail: ['“It sounds right” is a feeling, not a link you can test.', `The reason that shows it: ${sentence(l, ab.x, ab.ay)} And ${right.charAt(0).toLowerCase()}${right.slice(1)}`],
      example: { label: `Link: ${l.link}.`, truths: [{ who: 'Fits the first pair', value: true }, { who: 'Fits the new pair', value: true }], words: KEEPS },
    },
  };
  const cases: TeachCase[] = [
    { label: right, truths: [{ who: 'Keeps the link', value: true }], words: KEEPS },
    { label: `${cap(art(cd.x))} ${l.link} ${ab.ay}?`, truths: [{ who: 'Keeps the link', value: false }], words: KEEPS },
    { label: `${cap(art(cd.x))} ${l.link} ${cd.aNear}?`, truths: [{ who: 'Keeps the link', value: false }], words: KEEPS },
  ];
  return chooseOf(
    linkSpec({
      skill: 's16.link-why', phase: o.phase ?? 'explain', task: 'name the link before choosing', level: 2, difficulty: 3,
      rule: `the link “${l.link}” holds for both pairs`,
      rubric: { need: 2, words: '2 = names the link and tests it on both pairs; 1 = the right word with no link named; 0 = a look-alike or a copy' },
    }),
    {
      prompt: `${cap(ab.x)} is to ${ab.y} as ${cd.x} is to what? Before you choose, name the link. Which answer has a reason that names the link?`,
      scene: { kind: 'bridge', a: ab.x, b: ab.y, relation: l.link, hidden: true, c: cd.x },
      explain: `The link is “${l.link}.” ${sentence(l, ab.x, ab.ay)} ${right} The link holds for both pairs.`,
      teach: linkTeach(cases, sentence(l, ab.x, ab.ay), `${cap(art(cd.x))} ${l.link} …`, cd.ay),
      hints: LINK_HINTS,
      hintCase: wordsHint,
    },
    choices,
    'link',
    feedback,
    { copy: 'appearance-match', near: 'appearance-match' },
  );
}

/** Transfer: a link in a new domain. */
export const linkTransferItem = (rng: Rng, o: { phase?: Phase } = {}) => wordLinkItem(rng, { ...o, transfer: true, phase: o.phase ?? 'transfer' });
