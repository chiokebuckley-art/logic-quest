/**
 * Gut feelings (Stop 7, Lesson 5): intuition. A gut feeling is a fast guess. It can help you start, but it is not a
 * proof until you check.
 *
 * The model: a jar (a bag, a tub, a pile) of two kinds of thing, one kind big and one kind small. Every thing has the
 * same chance to be picked, big or small.
 *   gut   the big kind: big things are easy to notice, so the jar “looks mostly” that kind (gutOf)
 *   more  the kind with more things in it, counted one each, big or small (moreOf). A jar is never a tie.
 *   agree the count agrees with the gut (gut === more). A “trick” jar is one where it does not.
 * Every answer, explanation, hint and board mark below is computed from these three.
 *
 * Question kinds (tags): gut-check (what to do with a gut feeling: check it), gut-count (after counting, which is more
 * likely; a conflict item on a trick jar), gut-agree (the count agrees: was the feeling a proof before the count? no,
 * a good start) and gut-proof (the can-fail question, a conflict item: does a strong feeling prove it? no).
 */
import { YES_NO } from '../drill';
import { syncWhyWrong } from '../teach';
import type { ChoiceFeedback, Color, DrillMark, DrillRow, DrillStep, IdeaCard, Rng, Scene, Shape, Teach, TeachCase, Thing } from '../types';
import type { ItemCore, Made } from './statements';

// ---------- skins ----------

export type Frame = 'everyday' | 'fantasy' | 'abstract';
export const FRAMES: readonly Frame[] = ['everyday', 'fantasy', 'abstract'];

export type SkinId = 'sweets' | 'fish' | 'stickers' | 'potions' | 'scales' | 'crystals' | 'cards' | 'shapes';

export interface Skin {
  id: SkinId;
  frame: Frame;
  /** “sweet”, “fish”, “card” */
  noun: string;
  nouns: string;
  /** “the jar”, “the wizard’s box” */
  the: string;
  /** “another jar”: a different one of the same, for hints and examples. */
  another: string;
  /** What tells the two kinds apart: their color, or their shape (the shapes skin). */
  by: 'color' | 'shape';
  /** Color skins: every thing is drawn as this shape. */
  shape: Shape;
  /** “Ava will take one sweet from the jar without looking.” */
  pick: (name: string) => string;
}

export const SKINS: Record<SkinId, Skin> = {
  sweets: { id: 'sweets', another: 'another jar', frame: 'everyday', noun: 'sweet', nouns: 'sweets', the: 'the jar', by: 'color', shape: 'circle', pick: (n) => `${n} will take one sweet from the jar without looking.` },
  fish: { id: 'fish', another: 'another tub', frame: 'everyday', noun: 'fish', nouns: 'fish', the: 'the tub of toy fish', by: 'color', shape: 'triangle', pick: (n) => `${n} will hook one toy fish from the tub without looking.` },
  stickers: { id: 'stickers', another: 'another bag', frame: 'everyday', noun: 'sticker', nouns: 'stickers', the: 'the sticker bag', by: 'color', shape: 'square', pick: (n) => `${n} will pull one sticker from the bag without looking.` },
  potions: { id: 'potions', another: 'another box', frame: 'fantasy', noun: 'potion', nouns: 'potions', the: 'the wizard’s box', by: 'color', shape: 'square', pick: (n) => `${n} will take one potion from the wizard’s box without looking.` },
  scales: { id: 'scales', another: 'another basket', frame: 'fantasy', noun: 'scale', nouns: 'scales', the: 'the basket of dragon scales', by: 'color', shape: 'triangle', pick: (n) => `${n} will pull one dragon scale from the basket without looking.` },
  crystals: { id: 'crystals', another: 'another bowl', frame: 'fantasy', noun: 'crystal', nouns: 'crystals', the: 'the magic bowl', by: 'color', shape: 'circle', pick: (n) => `${n} will take one crystal from the magic bowl without looking.` },
  cards: { id: 'cards', another: 'another pile', frame: 'abstract', noun: 'card', nouns: 'cards', the: 'the pile of cards', by: 'color', shape: 'circle', pick: (n) => `${n} will pick one card from the pile without looking.` },
  shapes: { id: 'shapes', another: 'another pile', frame: 'abstract', noun: 'card', nouns: 'cards', the: 'the pile of shape cards', by: 'shape', shape: 'circle', pick: (n) => `${n} will pick one card from the pile without looking.` },
};
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const skinsOf = (f: Frame): SkinId[] => SKIN_IDS.filter((s) => SKINS[s].frame === f);

/** Names for quiz stories. The cards use Eli, Gus and Hana, so no quiz story repeats a card’s story. */
export const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Fay', 'Ivy', 'Jay', 'Kai', 'Lia', 'Max', 'Nia', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Zoe', 'Leo', 'Mia', 'Ana'] as const;

const COLORS: readonly Color[] = ['red', 'blue', 'yellow'];
const SHAPES: readonly Shape[] = ['circle', 'square', 'triangle'];
const SHAPE_PLURAL: Record<Shape, string> = { circle: 'circles', square: 'squares', triangle: 'triangles' };

/** One kind of thing in a jar: “red sweet”, or “circle” on the shapes skin. */
export interface Kind {
  id: string;
  /** “red sweet”, “circle” */
  one: string;
  /** “red sweets”, “circles” */
  many: string;
  /** “a red sweet”, “a circle” */
  a: string;
  /** After “Most of these are”: “red”, “circles”. */
  most: string;
  /** A board option: “Red”, “Circle”. */
  word: string;
  color: Color;
  shape: Shape;
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const withA = (p: string) => `${/^[aeiou]/i.test(p) ? 'an' : 'a'} ${p}`;

export function colorKind(s: Skin, color: Color): Kind {
  const one = `${color} ${s.noun}`;
  return { id: color, one, many: `${color} ${s.nouns}`, a: withA(one), most: color, word: cap(color), color, shape: s.shape };
}

export function shapeKind(shape: Shape, color: Color): Kind {
  return { id: shape, one: shape, many: SHAPE_PLURAL[shape], a: withA(shape), most: SHAPE_PLURAL[shape], word: cap(shape), color, shape };
}

/** Two different kinds for a skin: two colors, or (shapes skin) two shapes in one color. */
export function pickKinds(rng: Rng, skin: SkinId): [Kind, Kind] {
  const s = SKINS[skin];
  if (s.by === 'shape') {
    const [a, b] = rng.shuffle(SHAPES);
    const color = rng.pick(COLORS);
    return [shapeKind(a, color), shapeKind(b, color)];
  }
  const [a, b] = rng.shuffle(COLORS);
  return [colorKind(s, a), colorKind(s, b)];
}

// ---------- the model ----------

export interface Jar {
  skin: SkinId;
  kinds: [Kind, Kind];
  /** Index of the big kind (the one you notice first). The other kind is small. */
  big: 0 | 1;
  /** How many of each kind. Never a tie. */
  n: [number, number];
  /** The things in the picture, in the order drawn. */
  things: Thing[];
}

/** The kind the gut picks: the big one, because big things are easy to notice. */
export const gutOf = (j: Jar): 0 | 1 => j.big;
/** The kind with more things, each counted once, big or small. That kind is more likely to be picked. */
export function moreOf(j: Jar): 0 | 1 {
  if (j.n[0] === j.n[1]) throw new Error('moreOf: a jar is never a tie');
  return j.n[0] > j.n[1] ? 0 : 1;
}
/** The count agrees with the gut feeling. */
export const agrees = (j: Jar) => gutOf(j) === moreOf(j);
export const totalOf = (j: Jar) => j.n[0] + j.n[1];
const other = (i: 0 | 1): 0 | 1 => (i === 0 ? 1 : 0);
const sizeOf = (j: Jar, i: 0 | 1) => (i === j.big ? 'big' : 'small');

/** The things of a jar, one card per thing, in the order given (a list of kind indexes). */
export function thingsFor(kinds: [Kind, Kind], big: 0 | 1, order: (0 | 1)[]): Thing[] {
  return order.map((i, k) => ({ id: `t${k + 1}`, shape: kinds[i].shape, color: kinds[i].color, size: i === big ? 'big' : 'small' }));
}

/** A jar with these counts, its things in a mixed order from the rng. */
export function jarOf(rng: Rng, skin: SkinId, kinds: [Kind, Kind], big: 0 | 1, n: [number, number]): Jar {
  const order = rng.shuffle([...Array<0>(n[0]).fill(0), ...Array<1>(n[1]).fill(1)] as (0 | 1)[]);
  return { skin, kinds, big, n: [n[0], n[1]], things: thingsFor(kinds, big, order) };
}

/**
 * A jar’s picture as a key: how many cards of each look (size, color, shape), the order left out. Two jars with the
 * same key look the same, whatever their story calls the things.
 */
export const jarKey = (j: Pick<Jar, 'kinds' | 'big' | 'n'>) =>
  ([0, 1] as const).map((i) => `${i === j.big ? 'big' : 'small'} ${j.kinds[i].color} ${j.kinds[i].shape}=${j.n[i]}`).sort().join(',');

/**
 * Counts for a jar. trick: the big kind has fewer (2–5 big, and up to three small ones for each big one, so the jar
 * still looks mostly big). Not a trick: the big kind has more. 5–12 things, never a tie.
 */
export function jarCounts(rng: Rng, trick: boolean): { bigN: number; smallN: number } {
  for (let tries = 0; tries < 200; tries++) {
    if (trick) {
      const bigN = rng.int(2, 5);
      const smallN = rng.int(bigN + 1, Math.min(12 - bigN, 3 * bigN));
      if (smallN > bigN && bigN + smallN >= 5) return { bigN, smallN };
    } else {
      const bigN = rng.int(3, 8);
      const smallN = rng.int(1, Math.min(bigN - 1, 12 - bigN));
      if (smallN < bigN && bigN + smallN >= 5) return { bigN, smallN };
    }
  }
  throw new Error('jarCounts: no counts found');
}

// ---------- the cards’ jars (fixed) ----------

/** Eli’s jar, the worked example: 3 big red sweets and 7 small blue sweets. The gut says red; the count says blue. */
const ELI_ORDER: (0 | 1)[] = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1];
const sweetKinds = (): [Kind, Kind] => [colorKind(SKINS.sweets, 'red'), colorKind(SKINS.sweets, 'blue')];
export function eliJar(): Jar {
  return { skin: 'sweets', kinds: sweetKinds(), big: 0, n: [3, 7], things: thingsFor(sweetKinds(), 0, ELI_ORDER) };
}

/**
 * The twin: Eli’s jar after 2 small blue sweets are taken out (the rest stays in place): 3 big red, 5 small blue. The
 * jar still looks mostly red, and the gut is still wrong, so the learner marks the pack’s main case: the count beats
 * the eye-catching color.
 */
export const TWIN_GONE = 2;
export function twinJar(): Jar {
  const kinds = sweetKinds();
  // Keep the first 5 blue sweets of Eli’s jar and every red one; ids are numbered again in the new order.
  let blue = 0;
  const order = ELI_ORDER.filter((i) => i === 0 || ++blue <= 7 - TWIN_GONE);
  return { skin: 'sweets', kinds, big: 0, n: [3, 7 - TWIN_GONE], things: thingsFor(kinds, 0, order) };
}

/** Hana’s tub, the card where the gut is right: 6 big yellow fish and 3 small blue fish. */
export function hanaJar(): Jar {
  const kinds: [Kind, Kind] = [colorKind(SKINS.fish, 'yellow'), colorKind(SKINS.fish, 'blue')];
  return { skin: 'fish', kinds, big: 0, n: [6, 3], things: thingsFor(kinds, 0, [0, 1, 0, 0, 1, 0, 0, 1, 0]) };
}

/** Jars the cards and boards show. A quiz, check, Arcade or new example never makes one of these. */
export const CARD_JARS: ReadonlySet<string> = new Set([eliJar(), twinJar(), hanaJar()].map(jarKey));

/**
 * A random jar of this skin: a trick jar (the gut is wrong) or one where the count agrees. Never a card’s jar. With
 * `avoid` (another jar of the same kinds), the same kind is big, so the gut says the same thing, and the counts differ.
 */
export function makeJar(rng: Rng, skin: SkinId, trick: boolean, kinds?: [Kind, Kind], avoid?: Jar): Jar {
  for (let tries = 0; tries < 300; tries++) {
    const ks = kinds ?? pickKinds(rng, skin);
    const big: 0 | 1 = avoid ? avoid.big : rng.chance(0.5) ? 0 : 1;
    const { bigN, smallN } = jarCounts(rng, trick);
    const n: [number, number] = big === 0 ? [bigN, smallN] : [smallN, bigN];
    const j = jarOf(rng, skin, ks, big, n);
    if (CARD_JARS.has(jarKey(j))) continue;
    if (avoid && avoid.n[avoid.big] === j.n[j.big] && avoid.n[other(avoid.big)] === j.n[other(j.big)]) continue;
    return j;
  }
  throw new Error('makeJar: no jar found');
}

// ---------- words ----------

/** “3 red sweets”, “1 big circle”. */
export const count = (n: number, k: Kind, size?: 'big' | 'small') => `${n} ${size ? `${size} ` : ''}${n === 1 ? k.one : k.many}`;
/** “3 big red sweets and 7 small blue sweets” (the big kind first). */
export const jarText = (j: Jar) => {
  const b = j.big, s = other(j.big);
  return `${count(j.n[b], j.kinds[b], 'big')} and ${count(j.n[s], j.kinds[s], 'small')}`;
};
/** “3 red sweets and 7 blue sweets” (the big kind first). */
export const countText = (j: Jar) => {
  const b = j.big, s = other(j.big);
  return `${count(j.n[b], j.kinds[b])} and ${count(j.n[s], j.kinds[s])}`;
};
/** “7 is more than 3, so a blue sweet is more likely.” */
export function moreLine(j: Jar): string {
  const m = moreOf(j), f = other(m);
  return `${j.n[m]} is more than ${j.n[f]}, so ${j.kinds[m].a} is more likely.`;
}
const chanceLine = (s: Skin) => `Every ${s.noun} has the same chance, big or small.`;
/** “each color”, “each shape”. */
const eachKind = (s: Skin) => `each ${s.by}`;

/** A jar as a teach case: counted dots, which kind is more likely, and whether the gut was right. */
export function jarCase(j: Jar, label?: string): TeachCase {
  const s = SKINS[j.skin];
  const b = j.big, sm = other(j.big);
  const gut = j.kinds[b];
  const right = agrees(j);
  return {
    label: label ?? `${cap(s.the)} has ${jarText(j)}.`,
    groups: [
      { label: `Big ${j.kinds[b].many}`, n: j.n[b], color: j.kinds[b].color },
      { label: `Small ${j.kinds[sm].many}`, n: j.n[sm], color: j.kinds[sm].color },
    ],
    truths: [
      { who: `${cap(j.kinds[moreOf(j)].a)} is more likely`, value: true },
      { who: `The gut feeling (${gut.a}) was right`, value: right },
    ],
    note: right
      ? `The big ${gut.many} are easy to notice, and they are also the most. The gut was a good start, and the count shows it was right.`
      : `The big ${gut.many} are easy to notice, but there are more ${j.kinds[sm].many}. The gut was wrong this time.`,
  };
}

/** A tie, for the teach cases: then neither kind is more likely. */
function tieCase(j: Jar): TeachCase {
  const [k0, k1] = j.kinds;
  return {
    label: `A tie: 4 ${k0.many} and 4 ${k1.many}.`,
    groups: [{ label: cap(k0.many), n: 4, color: k0.color }, { label: cap(k1.many), n: 4, color: k1.color }],
    truths: [{ who: `${cap(k0.a)} is more likely`, value: false }, { who: `${cap(k1.a)} is more likely`, value: false }],
    note: `Same number of each. Then ${k0.a} and ${k1.a} are just as likely.`,
  };
}

const TERMS = {
  gut: { word: 'A gut feeling', meaning: 'a fast guess you get before you stop to think or count.' },
  proof: { word: 'A proof', meaning: 'a reason that shows something for sure.' },
  check: { word: 'Check', meaning: 'find out with facts, like a count, before you are sure.' },
  likely: (s: Skin) => ({ word: 'More likely', meaning: `it has a bigger chance. When every ${s.noun} has the same chance, the kind with more ${s.nouns} is more likely.` }),
};

/** The teaching every item of this lesson gets: its own jar, the other way a jar can go, and a tie. */
export function gutTeach(j: Jar, rng: Rng): Teach {
  const s = SKINS[j.skin];
  const gut = j.kinds[j.big];
  const twin = makeJar(rng, j.skin, agrees(j), j.kinds, j);
  return {
    rule: 'A gut feeling is a fast guess, not a proof. Check it before you are sure: count each kind, big or small.',
    terms: [TERMS.gut, TERMS.proof, TERMS.check, TERMS.likely(s)],
    meaning: `The big ${gut.many} are easy to notice, so it can look like most are ${gut.most}. But a big ${s.noun} counts as one, just like a small one.`,
    casesTitle: 'A gut feeling and a count: how can they go?',
    cases: [
      jarCase(j, `${cap(s.the)} in the question: ${jarText(j)}.`),
      jarCase(twin, `${cap(s.another)} has ${jarText(twin)}.`),
      tieCase(j),
    ],
    remember: ['A feeling is a guess. A count is a check.', 'Ask: “Did I check, or do I just feel sure?”'],
    simpler: [
      `Look at ${s.the}. Notice your fast guess.`,
      `Count ${eachKind(s)}. A big ${s.noun} and a small one each count as one.`,
      `The ${s.by} with more is more likely.`,
      'Now you know if your guess was right.',
    ],
  };
}

// ---------- items ----------

export type GutKind = 'check' | 'count' | 'agree' | 'proof';
/** Check seconds for the long-reading kinds (gut-agree, gut-proof). Other kinds keep the 90-second default. */
export const GUT_SECONDS = 120;
export const TAGS: Record<GutKind, string> = { check: 'gut-check', count: 'gut-count', agree: 'gut-agree', proof: 'gut-proof' };

/** A made item plus its jar, for tests. */
export interface GutMade extends Made {
  jar: Jar;
  kind: GutKind;
  name: string;
}

export interface GutOptions {
  name?: string;
  /** gut-count only: a trick jar (the gut is wrong, a conflict item) or one where the count agrees. */
  trick?: boolean;
}

const sceneOf = (j: Jar): Scene => ({ kind: 'things', things: j.things });

function made(kind: GutKind, j: Jar, name: string, item: ItemCore): GutMade {
  syncWhyWrong(item);
  return { tag: TAGS[kind], item, jar: j, kind, name };
}

/**
 * The third kind of a skin: the color (or, on the shapes skin, the shape) that is not one of the jar’s two kinds.
 */
function thirdKind(j: Jar): Kind {
  const s = SKINS[j.skin];
  if (s.by === 'shape') return shapeKind(SHAPES.find((x) => j.kinds.every((k) => k.shape !== x))!, j.kinds[0].color);
  return colorKind(s, COLORS.find((c) => j.kinds.every((k) => k.color !== c))!);
}

/**
 * A marked hint case: another jar of the same skin, already counted, with the given outcome (trick: the big kind has
 * fewer). Never the item’s own jar. The kind that is more likely is the skin’s third kind, never one of the item’s own
 * two kinds, so the hint’s “more likely” line never reads as one of the item’s choices. With `lose`, that kind is the
 * other one in the hint jar (the item’s big kind keeps the same gut feeling on a trick jar).
 */
function hintJar(rng: Rng, j: Jar, trick: boolean, lose: Kind = j.kinds[rng.int(0, 1)]): TeachCase {
  const win = thirdKind(j);
  // trick: the winner is small (index 1 big); not a trick: the winner is big (index 0 big).
  const kinds: [Kind, Kind] = [win, lose];
  const big: 0 | 1 = trick ? 1 : 0;
  for (let tries = 0; tries < 200; tries++) {
    const { bigN, smallN } = jarCounts(rng, trick);
    const h = jarOf(rng, j.skin, kinds, big, big === 0 ? [bigN, smallN] : [smallN, bigN]);
    if (CARD_JARS.has(jarKey(h))) continue;
    return jarCase(h, `${cap(SKINS[j.skin].another)}, already counted: ${jarText(h)}.`);
  }
  throw new Error('hintJar: no jar found');
}

/**
 * gut-check: someone’s gut says “Most of these are red!” What should they do with that feeling? Check it: count each
 * kind. The explanation says, from the count, whether the gut was right this time.
 */
export function checkItem(rng: Rng, skin: SkinId, o: GutOptions = {}): GutMade {
  const name = o.name ?? rng.pick(NAMES);
  const s = SKINS[skin];
  const j = makeJar(rng, skin, o.trick ?? rng.chance(0.6));
  const gut = j.kinds[j.big], small = j.kinds[other(j.big)];
  const m = j.kinds[moreOf(j)];
  const right = agrees(j);
  const verdict = right ? `So most are ${gut.most}, and ${name}’s gut was right this time. Only the count showed that.` : `So most are ${m.most}, and ${name}’s gut was wrong this time.`;
  const choices = rng.shuffle([
    { id: 'check', label: `Check it: count ${eachKind(s)}.` },
    { id: 'trust', label: 'Trust it. A strong feeling is enough.' },
    { id: 'flip', label: `Go with the other ${s.by}. Gut feelings are always wrong.` },
    { id: 'big', label: 'Count only the big ones. They matter most.' },
  ]);
  const trickEx = right ? makeJar(rng, skin, true, j.kinds, j) : j;
  const agreeEx = right ? j : makeJar(rng, skin, false, j.kinds, j);
  const feedback: Record<string, ChoiceFeedback> = {
    trust: {
      headline: 'Your answer treats a feeling as a proof, but a feeling is only a fast guess.',
      detail: [
        'Your answer means: feel sure, then stop there.',
        `Here ${s.the} has ${countText(j)}. ${right ? `The feeling happens to be right this time. But you only know that because of the count.` : `So the feeling “Most of these are ${gut.most}” is wrong. Trusting it gives the wrong answer.`}`,
        'A strong feeling can still be wrong. Check it first.',
      ],
      example: jarCase(trickEx, right ? `In ${s.another}, the same kind of feeling is wrong: ${jarText(trickEx)}.` : undefined),
    },
    flip: {
      headline: 'Your answer says a gut feeling is always wrong, but sometimes it is right.',
      detail: [
        'Your answer means: do the opposite of the feeling.',
        'A gut feeling is not always wrong. It is just not checked yet.',
        right
          ? `Here ${s.the} has ${countText(j)}. The gut was right, so going with ${small.many} would be wrong.`
          : `Here the gut was wrong. But in ${s.another} with ${countText(agreeEx)}, the same kind of feeling is right. Only a count tells you which.`,
      ],
      example: jarCase(agreeEx, right ? undefined : `In ${s.another}, the same kind of feeling is right: ${jarText(agreeEx)}.`),
    },
    big: {
      headline: `Your answer counts only the big ones, but every ${s.noun} counts once, big or small.`,
      detail: [
        `Your answer means: the big ${s.nouns} show what most of them are.`,
        `But a small ${s.noun} counts as one, just like a big one.`,
        right
          ? `Here: ${jarText(j)}. Counting only the big ones skips the ${small.many}. It gives the right answer this time, but only by luck.`
          : `Here: ${jarText(j)}. Counting only the big ones skips all ${j.n[other(j.big)]} ${small.many}. Those are the most!`,
      ],
      example: jarCase(trickEx, right ? `In ${s.another}, counting only the big ones goes wrong: ${jarText(trickEx)}.` : undefined),
    },
  };
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${name} glances at ${s.the}. The big ${gut.many} stand out. ${name}’s gut says, “Most of these are ${gut.most}!” What should ${name} do with this gut feeling?`,
    scene: sceneOf(j),
    choices,
    answer: 'check',
    explain: `A gut feeling is a fast guess, so check it. The count is ${countText(j)}. ${verdict}`,
    hint: `Here is ${s.another}, already counted. What showed if the gut feeling was right?`,
    hintCase: hintJar(rng, j, !right),
    teach: gutTeach(j, rng),
    feedback,
  };
  return made('check', j, name, item);
}

/**
 * gut-count: which is more likely to be picked? The kind with more things, counted one each. On a trick jar the big
 * kind has fewer, so the gut points the wrong way (a conflict item).
 */
export function countItem(rng: Rng, skin: SkinId, o: GutOptions = {}): GutMade {
  const name = o.name ?? rng.pick(NAMES);
  const s = SKINS[skin];
  const trick = o.trick ?? true;
  const j = makeJar(rng, skin, trick);
  const m = moreOf(j), f = other(m);
  const km = j.kinds[m], kf = j.kinds[f];
  const choices = [
    ...rng.shuffle([
      { id: j.kinds[0].id, label: cap(j.kinds[0].a) },
      { id: j.kinds[1].id, label: cap(j.kinds[1].a) },
    ]),
    { id: 'same', label: `${cap(j.kinds[0].a)} and ${j.kinds[1].a} are just as likely` },
  ];
  const fewerIsBig = f === j.big;
  const feedback: Record<string, ChoiceFeedback> = {
    [kf.id]: {
      headline: fewerIsBig
        ? `Your answer goes with the big ${kf.many}, but there are fewer of them.`
        : `Your answer goes with the small ${kf.many}, but this time there are fewer of them.`,
      detail: [
        `Your answer means ${kf.a} has the bigger chance.`,
        `Count, big and small: ${countText(j)}. ${chanceLine(s)}`,
        `${cap(kf.many)} are fewer, so ${kf.a} is less likely. ${fewerIsBig ? 'Big ones are easy to notice, but each one counts once.' : ''}`.trim(),
        ...(fewerIsBig ? [] : [`Big ones are not always a trick. Here the big ${km.many} are also the most. Count first, then decide.`]),
      ],
      example: { ...jarCase(j, `${cap(s.the)} in the question: ${jarText(j)}.`), truths: [{ who: `Your answer: “${cap(kf.a)}”`, value: false }, { who: `${cap(km.a)} is more likely`, value: true }] },
    },
    same: {
      headline: 'Your answer says the chances are equal, but the counts are not equal.',
      detail: [
        '“Just as likely” needs a tie: the same number of each.',
        `Here there are ${countText(j)}. ${j.n[m]} is more than ${j.n[f]}, so ${km.a} is more likely.`,
      ],
      example: { ...jarCase(j, `${cap(s.the)} in the question: ${jarText(j)}.`), truths: [{ who: 'Same number of each', value: false }, { who: `${cap(km.a)} is more likely`, value: true }] },
    },
  };
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${s.pick(name)} ${chanceLine(s)} Which is ${name} more likely to get?`,
    scene: sceneOf(j),
    choices,
    answer: km.id,
    explain: `Count each one once: ${countText(j)}. ${moreLine(j)} ${trick ? `The big ${kf.many} are easy to notice, but there are fewer of them.` : `This time the big ${km.many} are also the most.`}`,
    hint: `Here is ${s.another}, already counted. Count each one once, big or small.`,
    hintCase: hintJar(rng, j, !trick),
    teach: gutTeach(j, rng),
    feedback,
    ...(trick ? { conflict: true } : {}),
  };
  return made('count', j, name, item);
}

/** gut-agree: the count agrees with the gut. Was the feeling a proof before the count? No: a good start. */
export function agreeItem(rng: Rng, skin: SkinId, o: GutOptions = {}): GutMade {
  const name = o.name ?? rng.pick(NAMES);
  const s = SKINS[skin];
  const j = makeJar(rng, skin, false);
  const gut = j.kinds[j.big], small = j.kinds[other(j.big)];
  const trickEx = makeJar(rng, skin, true, j.kinds, j);
  const choices = rng.shuffle([
    { id: 'start', label: 'No. It was a good first guess, and the count shows it was right.' },
    { id: 'proof', label: 'Yes. It turned out right, so it was a proof all along.' },
    { id: 'wrong', label: `No. The gut was wrong: most are ${small.most}.` },
    { id: 'never', label: 'No. Gut feelings are never any help.' },
  ]);
  const feedback: Record<string, ChoiceFeedback> = {
    proof: {
      headline: 'Your answer calls the feeling a proof, but nobody knew it was right until the count.',
      detail: [
        'Your answer means a guess that turns out right was a proof all along.',
        'A proof shows something for sure. Before the count, this feeling could have been wrong.',
        `The same look can fool you. ${cap(s.another)} with ${jarText(trickEx)} also looks like most are ${gut.most}. But it has more ${small.many}.`,
      ],
      example: jarCase(trickEx, `${cap(s.another)} that looks the same way: ${jarText(trickEx)}.`),
    },
    wrong: {
      headline: 'Your answer says the gut feeling was wrong, but the count agrees with it.',
      detail: [
        `Your answer means most are ${small.most}.`,
        `The count is ${countText(j)}. ${j.n[j.big]} is more than ${j.n[other(j.big)]}, so most are ${gut.most}, just as the gut said.`,
      ],
      example: jarCase(j, `${cap(s.the)} in the question: ${jarText(j)}.`),
    },
    never: {
      headline: 'Your answer says gut feelings never help, but this one was a good start.',
      detail: [
        'Your answer means you should ignore a gut feeling.',
        'A gut feeling can help you start. It gives you a guess to check.',
        `Here the count shows it was right: ${countText(j)}.`,
      ],
      example: jarCase(j, `${cap(s.the)} in the question: ${jarText(j)}.`),
    },
  };
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${name}’s gut said, “Most of these are ${gut.most}!” Then ${name} counted: ${countText(j)}. Was the gut feeling a proof before ${name} counted?`,
    scene: sceneOf(j),
    choices,
    answer: 'start',
    explain: `Before the count, the feeling was only a guess. Then the count showed most are ${gut.most}. So the guess was a good start, and the count shows it was right.`,
    hint: `Here is ${s.another} with the same kind of feeling, already counted. Could anyone know before counting?`,
    hintCase: hintJar(rng, j, true, gut),
    teach: gutTeach(j, rng),
    feedback,
    // A long read (a quote, a count and four long choices): more time in a check, as grids and islanders get.
    seconds: GUT_SECONDS,
  };
  return made('agree', j, name, item);
}

/** gut-proof, the can-fail question: does a strong feeling prove the answer? No. Check: here the count says otherwise. */
export function proofItem(rng: Rng, skin: SkinId, o: GutOptions = {}): GutMade {
  const name = o.name ?? rng.pick(NAMES);
  const s = SKINS[skin];
  const j = makeJar(rng, skin, true);
  const gut = j.kinds[j.big], m = j.kinds[moreOf(j)];
  const choices = rng.shuffle([
    { id: 'no', label: `No. A strong feeling is still a guess. The count shows ${m.a} is more likely.` },
    { id: 'yes', label: 'Yes. A feeling that strong must be right.' },
    { id: 'big', label: `Yes. The big ${gut.many} show that most are ${gut.most}.` },
    { id: 'cant', label: `No, and ${gut.a} can’t be picked at all.` },
  ]);
  const example = jarCase(j, `${cap(s.the)} in the question: ${jarText(j)}.`);
  const feedback: Record<string, ChoiceFeedback> = {
    yes: {
      headline: 'Your answer treats a strong feeling as a proof, but this feeling is wrong.',
      detail: [
        'Your answer means: the stronger the feeling, the surer the answer.',
        `Count, big and small: ${countText(j)}. ${moreLine(j)}`,
        'A feeling can be strong and still be wrong. Only the check shows which.',
      ],
      example,
    },
    big: {
      headline: `Your answer goes by size, but every ${s.noun} counts once, big or small.`,
      detail: [
        `Your answer means the big ${gut.many} show what most of them are.`,
        `Count each one once: ${countText(j)}. ${moreLine(j)}`,
        `The big ${gut.many} are easy to notice, but there are fewer of them.`,
      ],
      example,
    },
    cant: {
      headline: `Your answer says ${gut.a} can’t be picked, but there ${j.n[j.big] === 1 ? 'is' : 'are'} ${count(j.n[j.big], gut)}.`,
      detail: [
        '“Can’t” means there are none at all.',
        `${cap(s.the)} has ${count(j.n[j.big], gut)}, so ${gut.a} can be picked. It is just less likely than ${m.a}.`,
      ],
      example,
    },
  };
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${s.pick(name)} ${chanceLine(s)} ${name} feels very sure: “Most of these are ${gut.most}. I just know it!” Does this strong feeling prove that ${gut.a} is more likely?`,
    scene: sceneOf(j),
    choices,
    answer: 'no',
    explain: `A strong feeling is still a fast guess, so check the count: ${countText(j)}. ${moreLine(j)} This strong feeling was wrong.`,
    hint: `Here is ${s.another}, already counted. What decides the answer: the feeling or the count?`,
    hintCase: hintJar(rng, j, false),
    teach: gutTeach(j, rng),
    feedback,
    conflict: true,
    tags: ['can-fail'],
    // A long read (a quote and four long choices): more time in a check, as grids and islanders get.
    seconds: GUT_SECONDS,
  };
  return made('proof', j, name, item);
}

export const MAKERS: Record<GutKind, (rng: Rng, skin: SkinId, o?: GutOptions) => GutMade> = {
  check: checkItem,
  count: countItem,
  agree: agreeItem,
  proof: proofItem,
};

// ---------- the cards ----------

export function gutIdeas(): IdeaCard[] {
  const eli = eliJar(), hana = hanaJar();
  return [
    {
      title: 'A fast guess',
      body: [
        'A gut feeling is a fast guess. It comes before you stop to think or count.',
        'Say you look at a jar of sweets. You notice some big red ones first. At once you feel, “Most of these are red!”',
        'That feeling can help you start. It gives you a guess to check.',
      ],
    },
    {
      title: 'Check it',
      body: [
        'A guess is not a proof. A proof shows something for sure.',
        'To check a gut feeling, look at the facts. With a jar, that means you count.',
        'Say you pick one sweet without looking. Every sweet has the same chance, big or small. So the color with more sweets is more likely.',
      ],
    },
    {
      title: 'Check Eli’s gut feeling',
      body: [
        'Eli looks at this jar. The big red sweets stand out. Eli’s gut says, “A red sweet is more likely.”',
        'That is a guess to check, not a proof.',
        `Count each sweet once, big or small: ${countText(eli)}. ${moreLine(eli)}`,
        'Eli’s gut was wrong this time. The big sweets fooled Eli.',
      ],
      scene: sceneOf(eli),
    },
    {
      title: 'Sometimes the gut is right',
      body: [
        'Hana looks at this tub of toy fish. Hana’s gut says, “A yellow fish is more likely.”',
        `Count: ${countText(hana)}. ${moreLine(hana)} Hana’s gut was right!`,
        'But Hana only knew that after the count. Before it, the feeling was a good start, not a proof.',
        'A gut feeling is not always wrong, and not always right. The check tells you which.',
      ],
      scene: sceneOf(hana),
    },
    {
      title: 'Strong is not sure',
      body: [
        'Some gut feelings feel very strong. “I just know it!”',
        'But a strong feeling can still be wrong. How strong it feels does not change the count.',
        'So use your gut to start. Then check before you are sure.',
      ],
    },
  ];
}

// ---------- the boards ----------

const FEEL = [{ id: 'guess', label: 'A guess to check' }, { id: 'proof', label: 'A proof' }];
const FEEL_WHY = { proof: 'A feeling is fast, but it is not a count. Until you check, it is only a guess.' };

/** A jar kind as a board option: “Red”. */
const kindOptions = (j: Jar) => j.kinds.map((k) => ({ id: k.id, label: k.word }));

/** Four count options around the right count: never below 1. */
export function countOptions(n: number) {
  const lo = Math.max(1, n - 1);
  return [lo, lo + 1, lo + 2, lo + 3].map((x) => ({ id: String(x), label: String(x) }));
}

/** “Red sweets: how many?” Every wrong count gets words for too many or too few. */
function countMark(j: Jar, i: 0 | 1, id: string): DrillMark {
  const k = j.kinds[i], n = j.n[i];
  const size = sizeOf(j, i);
  const why: Record<string, string> = {};
  for (const o of countOptions(n)) {
    const x = Number(o.id);
    if (x === n) continue;
    why[o.id] = x > n
      ? `Count again: ${x} is too many. Count each ${k.one} only once.`
      : `Count again: ${x} is too few. Count every ${k.one}, one at a time. ${cap(size)} ones count too.`;
  }
  return { id, label: `${cap(k.many)}: how many?`, options: countOptions(n), answer: String(n), why };
}

/** “Which is more likely?” Red or Blue, from the counts. */
function likelyMark(j: Jar, id: string, given = false): DrillMark {
  const m = moreOf(j), f = other(m);
  const s = SKINS[j.skin];
  return {
    id,
    label: `Which is more likely: ${j.kinds[0].a} or ${j.kinds[1].a}?`,
    options: kindOptions(j),
    answer: j.kinds[m].id,
    ...(given ? { given: true } : {}),
    why: { [j.kinds[f].id]: `There are ${countText(j)}. ${cap(j.kinds[m].many)} are more, so ${j.kinds[m].a} is more likely. ${chanceLine(s)}` },
  };
}

/** “Was Eli’s gut right?” Yes when the gut’s kind is the kind with more. */
function rightMark(j: Jar, who: string, said: 0 | 1, id: string, given = false): DrillMark {
  const right = said === moreOf(j);
  const k = j.kinds[said], m = j.kinds[moreOf(j)];
  return {
    id,
    label: `Was ${who}’s gut right this time?`,
    options: [...YES_NO],
    answer: right ? 'yes' : 'no',
    ...(given ? { given: true } : {}),
    why: right
      ? { no: `${who}’s gut said ${k.a} is more likely. The count agrees: ${countText(j)}. So the gut was right this time.` }
      : { yes: `${who}’s gut said ${k.a} is more likely. But the count is ${countText(j)}, so ${m.a} is more likely. The gut was wrong this time.` },
  };
}

/** “Eli’s gut: ‘A red sweet is more likely.’” Mark the feeling: a guess to check, never a proof. */
function feelMark(id: string, given = false): DrillMark {
  return { id, label: 'Guess or proof?', options: FEEL, answer: 'guess', ...(given ? { given: true } : {}), why: FEEL_WHY };
}

const gutSays = (who: string, k: Kind) => `${who}’s gut: “${cap(k.a)} is more likely.”`;

/**
 * Board 1, on the worked example’s jar: Eli’s case is shown marked (a guess to check; blue is more likely; the gut was
 * wrong). The learner marks a new case on the same jar: Gus’s gut says blue.
 */
export function eliBoard(id: string, afterCard: number): DrillStep {
  const j = eliJar();
  const red = j.big, blue = other(j.big);
  const gusRight = blue === moreOf(j);
  const rows: DrillRow[] = [
    {
      id: 'eli',
      label: gutSays('Eli', j.kinds[red]),
      marks: [feelMark('eli-feel', true), likelyMark(j, 'eli-likely', true), rightMark(j, 'Eli', red, 'eli-right', true)],
      note: `Count: ${countText(j)}. ${moreLine(j)} Eli’s gut was wrong.`,
    },
    {
      id: 'gus',
      label: gutSays('Gus', j.kinds[blue]),
      marks: [feelMark('gus-feel'), rightMark(j, 'Gus', blue, 'gus-right')],
      note: `A guess to check. The count says ${j.kinds[moreOf(j)].a} is more likely, so Gus’s gut was ${gusRight ? 'right' : 'wrong'} this time.`,
    },
  ];
  return {
    id,
    title: 'Check a gut feeling',
    body: [
      'This is Eli’s jar again. Eli’s row is done for you.',
      'Now Gus looks at the same jar. Gus notices all the little blue sweets. Mark Gus’s row.',
    ],
    scene: sceneOf(j),
    rows,
    afterCard,
    done: 'Same jar, two gut feelings. The count showed which one was right.',
  };
}

/**
 * Board 2, a twin: Eli’s jar with 2 small blue sweets gone. The learner marks every step. The gut is still wrong, so
 * the learner taps the count over the look (Blue) and the verdict “No” (board 1’s Gus row supplies the “Yes”).
 */
export function twinBoard(id: string): DrillStep {
  const j = twinJar();
  const red = j.big, blue = other(j.big);
  return {
    id,
    title: 'Check it yourself',
    twin: `${cap(NUM[TWIN_GONE])} small blue sweets are gone. The rest of Eli’s jar is the same.`,
    body: ['Eli’s gut still says, “A red sweet is more likely.” Count the sweets, big and small. Then mark each row.'],
    scene: sceneOf(j),
    rows: [
      { id: 'gut', label: gutSays('Eli', j.kinds[red]), marks: [feelMark('twin-feel')] },
      { id: 'count', label: 'Count the sweets, big and small.', marks: [countMark(j, red, 'twin-red'), countMark(j, blue, 'twin-blue')], note: `${cap(countText(j))}.` },
      { id: 'check', label: 'Check the gut feeling.', marks: [likelyMark(j, 'twin-likely'), rightMark(j, 'Eli', red, 'twin-right')], note: `${moreLine(j)} ${agrees(j) ? 'Eli’s gut was right this time.' : 'Eli’s gut was wrong this time.'}` },
    ],
    done: agrees(j)
      ? 'This time the count agrees with Eli’s gut. The gut was a good start, and the count shows it was right.'
      : `Fewer ${j.kinds[blue].many} now, but still more ${j.kinds[moreOf(j)].most} than ${j.kinds[other(moreOf(j))].most}. Eli’s gut was wrong again. Only the count could tell.`,
  };
}
