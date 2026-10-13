/**
 * Clues & Chances (id s13), Lessons 3, 4 and 5: counts out of 100, how often you would see a clue if you were wrong,
 * and both or either of two things.
 *
 * The model is a count picture: 100 things split two ways, by group (a row) and by a clue (a column), so each of the
 * four boxes is a count and every box, row and column adds up. Never a percentage, never a fraction with a slash.
 *
 * Lesson 3 · Out of 100. Two groups, one rare and one common, and a clue that is common in the rare group and rare in
 * the common one (goats are mostly brown, sheep mostly not). The base rate is how common a group is: its row out of
 * 100. Read a box, a row or a column; say which group the clue is more common in (out of each row); and, the trap (tag
 * base-rate), which group a thing with the clue more likely belongs to: compare the two boxes of the clue column, and
 * the common group can win even though the clue is rare in it.
 *
 * Lesson 4 · How often would I see this clue if I were wrong? A test that says yes or no (a detector beeps, a bell
 * rings): the rows are the thing being there or not, the columns the test’s answer. A false alarm is a yes when the
 * thing is not there. How often the test is right (out of a row, or out of all 100) is not how often its yes is right
 * (out of the yes column). The trap (tag false-alarm): when the thing is rare, a test that is right for most of the
 * 100 still gives more false alarms than right yes answers. And two clues, each counted out of 10 times you are right
 * and 10 times you are wrong: the clue that tells you more is the one you would rarely see if you were wrong.
 *
 * Lesson 5 · And, or, with chances. Two things that do not affect each other (size does not depend on color), on the
 * same picture: the rows are the first thing, the columns the second, and the second is k in every m in each row.
 * Both (and) is one box: the first row split into groups of m, with k from each group. Either (or) is the row and the
 * column added, with the overlap (the box they share) taken away once: the three boxes with one thing or both. Never
 * fractions and never percent: counts and groups only. The traps: adding for both (tag add-both), and adding for either
 * without taking the overlap away (tag overlap).
 *
 * The closing why items (tag why) ask for the reason behind the stop’s big ideas: nothing is due, the common group
 * wins, a yes is most likely a false alarm, a clue seen either way proves little.
 *
 * Every answer, explanation, wrong-choice feedback and hint case below is worked out from these pictures.
 */
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, Rng, Scene, TeachCase } from '../types';
import { DEVICES, nextAfterStreak } from './observatory/proof';
import { cap, withA, type ChanceMade } from './chances';

export type CountSkin = 'everyday' | 'fantasy' | 'abstract';
export const COUNT_SKINS: readonly CountSkin[] = ['everyday', 'fantasy', 'abstract'];

/** The whole group of every count picture. */
export const TOTAL = 100;

/** A count picture’s boxes: rows (the group, then the rest) by columns (the clue says yes, then no). */
export type Cells = [[number, number], [number, number]];

export const rowTotal = (c: Cells, r: 0 | 1) => c[r][0] + c[r][1];
export const colTotal = (c: Cells, k: 0 | 1) => c[0][k] + c[1][k];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** “1 false alarm”, “3 false alarms”. */
const alarmsN = (n: number) => plural(n, 'false alarm', 'false alarms');
/** “1 is a false alarm”, “3 are false alarms”. */
const alarmsAre = (n: number) => (n === 1 ? '1 is a false alarm' : `${n} are false alarms`);

// ---------- Lesson 3: two groups and a clue ----------

/** One group in a picture: its row label, a name for one and for many, and what to say after “are” (“goats”, “in the band”). */
export interface Side {
  label: string;
  one: string;
  many: string;
  are: string;
}

/** A clue as a column: its labels and how to say it about one thing or many. */
export interface GroupClue {
  yes: string;
  no: string;
  is: string;
  are: string;
  areNot: string;
  /** All the things with the clue: “brown animals”. */
  with: string;
  /** One thing with the clue: “a brown animal”. */
  see: string;
  /** The clue as a thing that can be common: “brown”, with its verb: “Is”. */
  common: [verb: string, noun: string];
}

export interface GroupTopic {
  id: string;
  skin: CountSkin;
  /** “100 animals live on a farm.” */
  setting: string;
  /** The picture’s title: “100 animals on a farm”. */
  title: string;
  noun: string;
  nouns: string;
  /** The rare group first. */
  a: Side;
  b: Side;
  clue: GroupClue;
}

const side = (label: string, one: string, many: string, are = many): Side => ({ label, one, many, are });

/** The worked example (cards and boards only, never a quiz): goats and sheep on a farm, and brown. */
export const FARM: GroupTopic = {
  id: 'farm', skin: 'everyday', setting: '100 animals live on a farm.', title: '100 animals on a farm', noun: 'animal', nouns: 'animals',
  a: side('Goats', 'goat', 'goats'), b: side('Sheep', 'sheep', 'sheep'),
  clue: { yes: 'Brown', no: 'Not brown', is: 'is brown', are: 'are brown', areNot: 'are not brown', with: 'brown animals', see: 'a brown animal', common: ['Is', 'brown'] },
};

export const GROUP_TOPICS: readonly GroupTopic[] = [
  {
    id: 'band', skin: 'everyday', setting: '100 kids go to a small school.', title: '100 kids at a school', noun: 'kid', nouns: 'kids',
    a: side('In the band', 'band kid', 'band kids', 'in the band'), b: side('Not in the band', 'kid not in the band', 'kids not in the band', 'not in the band'),
    clue: { yes: 'Big case', no: 'No big case', is: 'carries a big case', are: 'carry a big case', areNot: 'do not carry a big case', with: 'kids with a big case', see: 'a kid with a big case', common: ['Is', 'a big case'] },
  },
  {
    id: 'rolls', skin: 'everyday', setting: 'A bakery has 100 rolls.', title: '100 rolls at a bakery', noun: 'roll', nouns: 'rolls',
    a: side('Cheese rolls', 'cheese roll', 'cheese rolls'), b: side('Plain rolls', 'plain roll', 'plain rolls'),
    clue: { yes: 'Yellow top', no: 'No yellow top', is: 'has a yellow top', are: 'have a yellow top', areNot: 'do not have a yellow top', with: 'rolls with a yellow top', see: 'a roll with a yellow top', common: ['Is', 'a yellow top'] },
  },
  {
    id: 'dragons', skin: 'fantasy', setting: '100 dragons live in a valley.', title: '100 dragons in a valley', noun: 'dragon', nouns: 'dragons',
    a: side('Fire dragons', 'fire dragon', 'fire dragons'), b: side('Sky dragons', 'sky dragon', 'sky dragons'),
    clue: { yes: 'Red scales', no: 'No red scales', is: 'has red scales', are: 'have red scales', areNot: 'do not have red scales', with: 'dragons with red scales', see: 'a dragon with red scales', common: ['Are', 'red scales'] },
  },
  {
    id: 'forest', skin: 'fantasy', setting: '100 animals live in a magic forest.', title: '100 animals in a magic forest', noun: 'animal', nouns: 'animals',
    a: side('Unicorns', 'unicorn', 'unicorns'), b: side('Horses', 'horse', 'horses'),
    clue: { yes: 'White', no: 'Not white', is: 'is white', are: 'are white', areNot: 'are not white', with: 'white animals', see: 'a white animal', common: ['Is', 'white'] },
  },
  {
    id: 'cards', skin: 'abstract', setting: 'A deck has 100 cards.', title: '100 cards in a deck', noun: 'card', nouns: 'cards',
    a: side('Star cards', 'star card', 'star cards'), b: side('Moon cards', 'moon card', 'moon cards'),
    clue: { yes: 'Gold edge', no: 'No gold edge', is: 'has a gold edge', are: 'have a gold edge', areNot: 'do not have a gold edge', with: 'cards with a gold edge', see: 'a card with a gold edge', common: ['Is', 'a gold edge'] },
  },
  {
    id: 'tiles', skin: 'abstract', setting: 'A bag holds 100 tiles.', title: '100 tiles in a bag', noun: 'tile', nouns: 'tiles',
    a: side('A tiles', 'A tile', 'A tiles'), b: side('B tiles', 'B tile', 'B tiles'),
    clue: { yes: 'Blue', no: 'Not blue', is: 'is blue', are: 'are blue', areNot: 'are not blue', with: 'blue tiles', see: 'a blue tile', common: ['Is', 'blue'] },
  },
];

export interface GroupPic {
  topic: GroupTopic;
  cells: Cells;
}

/**
 * Which way a group picture goes. 'common': the clue is common in the rare group and rare in the common one, but the
 * common group has more things with the clue (the trap). 'rare': the rare group has more things with the clue too.
 */
export type GroupWant = 'common' | 'rare' | 'any';

/** A group picture: most of the rare group has the clue, fewer than half of the common group does. */
export function makeGroupPic(rng: Rng, topic: GroupTopic, want: GroupWant = 'any'): GroupPic {
  const w = want === 'any' ? rng.pick<GroupWant>(['common', 'rare']) : want;
  for (let t = 0; t < 2000; t++) {
    const r = w === 'common' ? rng.int(5, 20) : rng.int(15, 40);
    const aYes = rng.int(Math.ceil(0.6 * r), r);
    const bTot = TOTAL - r;
    const bYes = rng.int(Math.ceil(0.08 * bTot), Math.floor(0.4 * bTot));
    // The clue is much more common in the rare group (twice the share or more), most of it has the clue, most of the other group does not.
    if (aYes * bTot < 2 * bYes * r || 2 * aYes <= r || 2 * bYes >= bTot) continue;
    if (w === 'common' && bYes < aYes + 3) continue;
    if (w === 'rare' && aYes < bYes + 3) continue;
    const cells: Cells = [[aYes, r - aYes], [bYes, bTot - bYes]];
    // Every box, row and column has its own count, so no number on the picture can stand for two parts.
    const parts = [...cells.flat(), rowTotal(cells, 0), rowTotal(cells, 1), colTotal(cells, 0), colTotal(cells, 1)];
    if (new Set(parts).size !== parts.length) continue;
    return { topic, cells };
  }
  throw new Error(`makeGroupPic: no ${w} picture`);
}

/** The farm picture (the worked example) and its twin with more goats (the board after the trap card). */
export const FARM_PIC: GroupPic = { topic: FARM, cells: [[8, 2], [18, 72]] };
export const FARM_TWIN: GroupPic = { topic: FARM, cells: [[24, 6], [14, 56]] };

/** A group picture as a scene. */
export function groupScene(p: GroupPic, o: { pick?: { row?: 0 | 1; col?: 0 | 1 }; pickLabel?: string; caption?: string } = {}): Extract<Scene, { kind: 'counts' }> {
  const t = p.topic;
  return { kind: 'counts', title: t.title, total: TOTAL, rows: [t.a.label, t.b.label], cols: [t.clue.yes, t.clue.no], cells: [[...p.cells[0]], [...p.cells[1]]], ...o };
}

/** “8 goats are brown”, “1 band kid carries a big case”. */
const withClue = (t: GroupTopic, s: Side, n: number) => `${plural(n, s.one, s.many)} ${n === 1 ? t.clue.is : t.clue.are}`;
/** “8 are brown”, “1 carries a big case”: a count with the clue, the group named elsewhere. */
const yesVerb = (t: GroupTopic, n: number) => `${n} ${n === 1 ? t.clue.is : t.clue.are}`;
/** “2 are not brown”, “1 does not carry a big case”. */
const noVerb = (t: GroupTopic, n: number) => `${n} ${n === 1 ? t.clue.areNot.replace(/^are /, 'is ').replace(/^do /, 'does ').replace(/^have /, 'has ') : t.clue.areNot}`;
/** “8 of the 10 goats are brown”. */
const shareOf = (t: GroupTopic, s: Side, n: number, of: number) => `${n} of the ${of} ${s.many} ${t.clue.are}`;

/** Every part of a group picture a question can ask for: its count, and what it counts. */
type Part = 'aTotal' | 'bTotal' | 'aYes' | 'aNo' | 'bYes' | 'bNo' | 'yesTotal' | 'noTotal';

function partValue(p: GroupPic, part: Part): number {
  const c = p.cells;
  switch (part) {
    case 'aTotal': return rowTotal(c, 0);
    case 'bTotal': return rowTotal(c, 1);
    case 'aYes': return c[0][0];
    case 'aNo': return c[0][1];
    case 'bYes': return c[1][0];
    case 'bNo': return c[1][1];
    case 'yesTotal': return colTotal(c, 0);
    case 'noTotal': return colTotal(c, 1);
  }
}

function partName(t: GroupTopic, part: Part): string {
  switch (part) {
    case 'aTotal': return `all the ${t.a.many}`;
    case 'bTotal': return `all the ${t.b.many}`;
    case 'aYes': return `the ${t.a.many} that ${t.clue.are}`;
    case 'aNo': return `the ${t.a.many} that ${t.clue.areNot}`;
    case 'bYes': return `the ${t.b.many} that ${t.clue.are}`;
    case 'bNo': return `the ${t.b.many} that ${t.clue.areNot}`;
    case 'yesTotal': return `all the ${t.clue.with}`;
    case 'noTotal': return `all the ${t.nouns} that ${t.clue.areNot}`;
  }
}

/** Where a part sits, and how its count is found. */
function partHow(p: GroupPic, part: Part): string {
  const t = p.topic, c = p.cells;
  switch (part) {
    case 'aTotal': return `All the ${t.a.many} make the whole row for ${t.a.many}: ${c[0][0]} and ${c[0][1]} make ${rowTotal(c, 0)}.`;
    case 'bTotal': return `All the ${t.b.many} make the whole row for ${t.b.many}: ${c[1][0]} and ${c[1][1]} make ${rowTotal(c, 1)}.`;
    case 'yesTotal': return `All the ${t.clue.with} make the whole “${t.clue.yes}” column: ${c[0][0]} and ${c[1][0]} make ${colTotal(c, 0)}.`;
    case 'noTotal': return `All the ${t.nouns} that ${t.clue.areNot} make the whole “${t.clue.no}” column: ${c[0][1]} and ${c[1][1]} make ${colTotal(c, 1)}.`;
    default: return `That is one box, where a row and a column meet. It holds ${partValue(p, part)}.`;
  }
}

const GROUP_TERMS = [
  { word: 'A base rate', meaning: 'how common something is in the whole group, as a count out of 100.' },
  { word: 'A count picture', meaning: 'the 100 split two ways. Each box counts the ones in its row and its column.' },
  { word: 'A row', meaning: 'one group, such as all the goats. Its boxes add up to that group.' },
  { word: 'A column', meaning: 'all the ones with the clue, or all without it. Its boxes add up too.' },
];

/** The two rows and the clue column, as cases. */
function groupCases(p: GroupPic): TeachCase[] {
  const t = p.topic, c = p.cells;
  return [
    { label: `The row for ${t.a.many}: ${yesVerb(t, c[0][0])}, and ${noVerb(t, c[0][1])}.`, note: `${cap(t.a.many)} in all: ${rowTotal(c, 0)} of the 100.` },
    { label: `The row for ${t.b.many}: ${yesVerb(t, c[1][0])}, and ${noVerb(t, c[1][1])}.`, note: `${cap(t.b.many)} in all: ${rowTotal(c, 1)} of the 100.` },
    { label: `The “${t.clue.yes}” column: ${plural(c[0][0], t.a.one, t.a.many)} and ${plural(c[1][0], t.b.one, t.b.many)}.`, note: `${cap(t.clue.with)} in all: ${colTotal(c, 0)}.` },
  ];
}

/** The model behind each Lesson 3, 4 and 5 item (for tests). */
export type CountModel =
  | { t: 'read'; pic: GroupPic; ask: Part; parts: Part[] }
  | { t: 'fits'; pic: GroupPic }
  | { t: 'more'; pic: GroupPic }
  | { t: 'of'; pic: GroupPic; group: 0 | 1 }
  | { t: 'alarm'; pic: TestPic }
  | { t: 'answer'; pic: TestPic }
  | { t: 'strong'; pic: CluePic }
  | { t: 'both'; pic: PairPic }
  | { t: 'either'; pic: PairPic; form: EitherForm }
  | { t: 'why'; kind: WhyKind; group?: GroupPic; test?: TestPic; clue?: CluePic; coin?: { device: string; k: number; side: string; other: string } };

export interface CountMade extends Omit<ChanceMade, 'model'> {
  model: CountModel;
}

/** Check time for a count-picture item: a picture of 100 and a story read long. */
export const COUNT_SECONDS = 120;

function done(tag: string, item: CountMade['item'], model: CountModel): CountMade {
  item.seconds = COUNT_SECONDS;
  syncWhyWrong(item);
  return { tag, item, model };
}

/** The trap tags of Lessons 3 and 4, and the closing why tag. */
export const BASE_RATE = { tag: 'base-rate', label: 'a question where the clue fits the rare group better, but the common group is bigger' } as const;
export const FALSE_ALARM = { tag: 'false-alarm', label: 'a question where a test is right for most, yet most of its yes answers are false alarms' } as const;
export const WHY_TAG = 'why';

/** A topic of this skin, not one already used in the set. */
function pickTopic<T extends { id: string; skin: CountSkin }>(rng: Rng, pool: readonly T[], skin: CountSkin, avoid?: Set<string>): T {
  const all = pool.filter((x) => x.skin === skin);
  const fresh = all.filter((x) => !avoid?.has(x.id));
  const t = rng.pick(fresh.length ? fresh : all);
  avoid?.add(t.id);
  return t;
}

export interface CountOptions {
  skin: CountSkin;
  avoid?: Set<string>;
}

const READ_ASKS: Record<'aTotal' | 'bTotal' | 'yesTotal' | 'aYes' | 'bYes', { q: (t: GroupTopic) => string; wrong: Part[] }> = {
  aTotal: { q: (t) => `How many of the 100 ${t.nouns} are ${t.a.are}?`, wrong: ['aYes', 'yesTotal', 'bTotal', 'aNo'] },
  bTotal: { q: (t) => `How many of the 100 ${t.nouns} are ${t.b.are}?`, wrong: ['bYes', 'aTotal', 'bNo', 'yesTotal'] },
  yesTotal: { q: (t) => `How many of the 100 ${t.nouns} ${t.clue.are}?`, wrong: ['aYes', 'bYes', 'aTotal', 'noTotal'] },
  aYes: { q: (t) => `How many ${t.a.many} ${t.clue.are}?`, wrong: ['aTotal', 'yesTotal', 'bYes', 'aNo'] },
  bYes: { q: (t) => `How many ${t.b.many} ${t.clue.are}?`, wrong: ['bTotal', 'yesTotal', 'aYes', 'bNo'] },
};
export type ReadAsk = keyof typeof READ_ASKS;

/** Read one part of a count picture: a whole row (the base rate), a whole column or one box. */
export function readItem(rng: Rng, o: CountOptions & { ask?: ReadAsk; pic?: GroupPic }): CountMade {
  const pic = o.pic ?? makeGroupPic(rng, pickTopic(rng, GROUP_TOPICS, o.skin, o.avoid));
  const t = pic.topic;
  const ask = o.ask ?? rng.pick<ReadAsk>(['aTotal', 'bTotal', 'yesTotal', 'aYes', 'bYes']);
  const right = partValue(pic, ask);
  // Wrong numbers: the confusions this question invites, each a different count from the answer and from each other.
  const seen = new Set([right]);
  const wrongs: Part[] = [];
  for (const w of READ_ASKS[ask].wrong) {
    const v = partValue(pic, w);
    if (seen.has(v) || wrongs.length === 3) continue;
    seen.add(v);
    wrongs.push(w);
  }
  const parts = [ask, ...wrongs];
  const q = READ_ASKS[ask].q(t);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) {
    feedback[w] = {
      headline: `Your answer, ${partValue(pic, w)}, counts ${partName(t, w)}.`,
      detail: [`The question asks for ${partName(t, ask)}.`, partHow(pic, ask), `${cap(partName(t, ask))}: ${right}.`],
      example: { label: partHow(pic, w), note: `That counts ${partName(t, w)}.` },
    };
  }
  // The hint reads another row or column whose numbers do not hold the answer.
  const hintParts: Part[] = (['aTotal', 'bTotal', 'yesTotal', 'noTotal'] as Part[]).filter((x) => x !== ask);
  const nums = (x: Part) => (x === 'aTotal' ? [pic.cells[0][0], pic.cells[0][1]] : x === 'bTotal' ? [pic.cells[1][0], pic.cells[1][1]] : x === 'yesTotal' ? [pic.cells[0][0], pic.cells[1][0]] : [pic.cells[0][1], pic.cells[1][1]]);
  const hint = hintParts.find((x) => ![...nums(x), partValue(pic, x)].includes(right)) ?? hintParts[0];
  return done(
    'hundred',
    {
      kind: 'choose',
      prompt: `${t.setting} The count picture splits them two ways. ${q}`,
      scene: groupScene(pic),
      choices: rng.shuffle(parts.map((x) => ({ id: x, label: String(partValue(pic, x)) }))),
      answer: ask,
      explain: `${partHow(pic, ask)} ${ask === 'aTotal' || ask === 'bTotal' ? `That is the base rate: ${right} of the 100.` : ''}`.trim(),
      feedback,
      hint: 'Find the row or column the question names, then add its boxes. Here is another one, checked for you.',
      hintCase: { label: partHow(pic, hint), note: `That counts ${partName(t, hint)}.` },
      teach: {
        rule: 'Each box counts the ones in its row and its column. A row adds up to its group. A column adds up to all the ones with, or without, the clue.',
        terms: GROUP_TERMS,
        meaning: `The question asks for ${partName(t, ask)}. ${ask === 'aYes' || ask === 'bYes' ? 'That is one box.' : ask === 'yesTotal' ? 'That is a whole column.' : 'That is a whole row.'}`,
        casesTitle: 'The parts of this picture',
        cases: groupCases(pic),
        remember: ['Find the row or the column the question names. Then add its boxes.', 'Ask: “Is this one box, a whole row, or a whole column?”'],
        simpler: [`Look at the row for ${t.a.many}.`, `It has two boxes: ${yesVerb(t, pic.cells[0][0])}, and ${noVerb(t, pic.cells[0][1])}.`, `Together they make all the ${t.a.many}: ${rowTotal(pic.cells, 0)}.`],
      },
    },
    { t: 'read', pic, ask, parts },
  );
}

/** Which way a “more common among” picture goes: the clue more common in the rare group (a), in the common group (b), or just as common in both. */
export type FitsWant = 'a' | 'b' | 'same';

/**
 * A picture for the “more common among” question. 'a': the usual group picture (the clue common in the rare group and
 * rare in the common one). 'b': the other way around (the clue rare in the rare group and common in the common one).
 * 'same': the clue is in the same part of each group, k of every 10 (never half). Every box, row and column has its own
 * count, as in every group picture.
 */
export function makeFitsPic(rng: Rng, topic: GroupTopic, want: FitsWant): GroupPic {
  if (want === 'a') return makeGroupPic(rng, topic, 'any');
  for (let t = 0; t < 2000; t++) {
    let cells: Cells;
    if (want === 'b') {
      const r = rng.int(10, 40);
      const bTot = TOTAL - r;
      const aYes = rng.int(Math.max(1, Math.ceil(0.08 * r)), Math.floor(0.4 * r));
      const bYes = rng.int(Math.ceil(0.6 * bTot), bTot - 1);
      // The clue is much more common in the common group: twice the share or more.
      if (bYes * r < 2 * aYes * bTot) continue;
      cells = [[aYes, r - aYes], [bYes, bTot - bYes]];
    } else {
      const r = rng.pick([10, 20, 30, 40]);
      const per = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
      cells = [[(per * r) / 10, r - (per * r) / 10], [(per * (TOTAL - r)) / 10, TOTAL - r - (per * (TOTAL - r)) / 10]];
    }
    const parts = [...cells.flat(), rowTotal(cells, 0), rowTotal(cells, 1), colTotal(cells, 0), colTotal(cells, 1)];
    if (new Set(parts).size !== parts.length) continue;
    return { topic, cells };
  }
  throw new Error(`makeFitsPic: no ${want} picture`);
}

/** “That is most of them.”, “That is fewer than half of them.”: a part of one row, in words. */
const partWords = (n: number, of: number) => (2 * n > of ? 'That is most of them.' : 2 * n < of ? 'That is fewer than half of them.' : 'That is half of them.');

/**
 * Is the clue more common among the rare group or the common one, each counted out of its own row? The picture decides:
 * the clue can fit the rare group better, the common group better, or both just as well.
 */
export function fitsItem(rng: Rng, o: CountOptions & { pic?: GroupPic; want?: FitsWant }): CountMade {
  const pic = o.pic ?? makeFitsPic(rng, pickTopic(rng, GROUP_TOPICS, o.skin, o.avoid), o.want ?? rng.pick<FitsWant>(['a', 'a', 'a', 'b', 'b', 'b', 'same', 'same']));
  const t = pic.topic, c = pic.cells;
  const aT = rowTotal(c, 0), bT = rowTotal(c, 1);
  // Compare the share in each row by cross-multiplying: aYes out of aT against bYes out of bT.
  const cmp = c[0][0] * bT - c[1][0] * aT;
  const answer = cmp > 0 ? 'a' : cmp < 0 ? 'b' : 'same';
  const [verb, noun] = t.clue.common;
  const is = verb.toLowerCase();
  const shares = [`Out of the ${t.a.many}: ${shareOf(t, t.a, c[0][0], aT)}. ${partWords(c[0][0], aT)}`, `Out of the ${t.b.many}: ${shareOf(t, t.b, c[1][0], bT)}. ${partWords(c[1][0], bT)}`];
  // A tie, said as k of every 10 when both rows are whole tens.
  const per = (c[0][0] * 10) / aT;
  const sameLine = Number.isInteger(per) && (c[1][0] * 10) / bT === per ? `In each group, that is ${per} of every 10.` : 'In each group, that is the same part.';
  const example: TeachCase = {
    label: `${cap(shareOf(t, t.a, c[0][0], aT))}. ${cap(shareOf(t, t.b, c[1][0], bT))}.`,
    truths: [{ who: `More common among ${t.a.many}`, value: cmp > 0 }, { who: `More common among ${t.b.many}`, value: cmp < 0 }, { who: 'Just as common in both', value: cmp === 0 }],
  };
  const counted: ChoiceFeedback = {
    headline: `Your answer counts ${t.clue.with}, but the question asks out of each group.`,
    detail: [`${cap(withClue(t, t.b, c[1][0]))}, and ${withClue(t, t.a, c[0][0])}. But there are many more ${t.b.many} in all.`, ...shares, ...(answer === 'same' ? [sameLine] : [])],
    example,
  };
  const fb: Record<string, ChoiceFeedback> = {
    a:
      answer === 'same'
        ? { headline: `Your answer picks the ${t.a.many}, but ${noun} ${is} just as common among the ${t.b.many}.`, detail: [...shares, sameLine], example }
        : { headline: `Your answer picks the ${t.a.many}, but the clue is more common among the ${t.b.many}.`, detail: shares, example },
    b:
      answer === 'same'
        ? c[1][0] > c[0][0]
          ? counted
          : { headline: `Your answer picks the ${t.b.many}, but ${noun} ${is} just as common among the ${t.a.many}.`, detail: [...shares, sameLine], example }
        : c[1][0] >= c[0][0]
          ? counted
          : { headline: `Your answer picks the ${t.b.many}, but the clue is more common among the ${t.a.many}.`, detail: shares, example },
    same: { headline: `Your answer says it is just as common in both, but the two groups are far apart.`, detail: shares, example },
  };
  const choices: Choice[] = [
    { id: 'a', label: `Among the ${t.a.many}.` },
    { id: 'b', label: `Among the ${t.b.many}.` },
    { id: 'same', label: 'Just as common in both.' },
  ];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = fb[ch.id];
  return done(
    'hundred',
    {
      kind: 'choose',
      prompt: `${t.setting} The count picture splits them two ways. Think about each group on its own. ${verb} ${noun} more common among the ${t.a.many} or among the ${t.b.many}?`,
      scene: groupScene(pic),
      choices: rng.shuffle(choices),
      answer,
      explain: `${shares.join(' ')} ${answer === 'same' ? `${sameLine} So ${noun} ${is} just as common in both.` : `So ${noun} ${is} more common among the ${answer === 'a' ? t.a.many : t.b.many}.`}`,
      feedback,
      hint: 'Count out of each group on its own. Here is a smaller case, checked for you.',
      // A case that comes out the other way from this item, so the hint shows the method, never the answer.
      hintCase: shareCase(answer === 'b' ? 'smaller' : 'bigger'),
      teach: {
        rule: 'To see how common a clue is in one group, count out of that group only: its own row.',
        terms: GROUP_TERMS,
        meaning: `“More common among the ${t.a.many}” means a bigger part of the ${t.a.many} ${t.clue.are}. It does not mean more of them.`,
        casesTitle: 'Each group on its own',
        cases: [
          { label: `The row for ${t.a.many}: ${shareOf(t, t.a, c[0][0], aT)}.`, truths: [{ who: 'Most of them', value: 2 * c[0][0] > aT }] },
          { label: `The row for ${t.b.many}: ${shareOf(t, t.b, c[1][0], bT)}.`, truths: [{ who: 'Most of them', value: 2 * c[1][0] > bT }] },
        ],
        remember: ['Out of each group means one row at a time.', 'Ask: “Out of which group am I counting?”'],
        simpler: [`Look only at the row for ${t.a.many}: ${c[0][0]} of the ${aT} ${t.clue.are}.`, `Then look only at the row for ${t.b.many}: ${c[1][0]} of the ${bT} ${t.clue.are}.`, 'Compare the two parts, not the two counts.'],
      },
    },
    { t: 'fits', pic },
  );
}

/**
 * A small worked case of the column count, with caps and soccer fans, for a hint. `winner`: the group that should win
 * in it, so a hint can model the method on a case that comes out the other way from the item’s answer.
 */
export function capsCase(winner: 'rare' | 'common'): TeachCase {
  const [red, blue, redFans, blueFans] = winner === 'rare' ? [20, 80, 16, 8] : [10, 90, 8, 18];
  const redWins = redFans > blueFans;
  return {
    label: `Say ${red} kids wear red caps and ${blue} wear blue caps. ${redFans} red cap kids like soccer, and ${blueFans} blue cap kids do. You meet a soccer fan.`,
    truths: [{ who: 'More likely a red cap', value: redWins }, { who: 'More likely a blue cap', value: !redWins }],
    note: `Compare the soccer fans in each group: ${redFans} and ${blueFans}.`,
  };
}

/**
 * A small worked case of a share out of each group, for a hint. `winner`: the group the clue is more common in, the
 * bigger one (blue caps) or the smaller one (red caps), so a hint can come out the other way from its item.
 */
export function shareCase(winner: 'bigger' | 'smaller' = 'bigger'): TeachCase {
  const [red, blue, redFans, blueFans] = winner === 'bigger' ? [40, 60, 10, 45] : [20, 80, 12, 16];
  const redMore = redFans * blue > blueFans * red;
  return {
    label: `Say ${red} kids wear red caps and ${blue} wear blue caps. ${redFans} red cap kids like soccer, and ${blueFans} blue cap kids do.`,
    truths: [{ who: 'Soccer is more common among red caps', value: redMore }, { who: 'Soccer is more common among blue caps', value: !redMore }],
    note: `${redFans} of ${red} red caps is ${2 * redFans > red ? 'most of them' : 'fewer than half'}. ${blueFans} of ${blue} blue caps is ${2 * blueFans > blue ? 'most of them' : 'fewer than half'}.`,
  };
}

/** A small worked case of a clue seen often either way, for a hint: a dog that barks at nearly everyone. */
export function dogCase(): TeachCase {
  const [atMail, atOthers] = [9, 8];
  return {
    label: `A dog barks at the mail carrier ${atMail} times out of 10. It barks at other people ${atOthers} times out of 10.`,
    truths: [{ who: 'You would hear it often with no mail', value: 2 * atOthers >= 10 }, { who: 'A bark tells you a lot about the mail', value: atMail > 3 * atOthers }],
    note: 'You would hear the bark often either way, so it tells you little.',
  };
}

/** A small worked case of counting only the yes answers, for a hint: `right` of 10 yes answers are right. */
export function yesCase(right: number): TeachCase {
  return {
    label: `Say a test says yes 10 times. ${right} of those are right, and ${10 - right} are false alarms.`,
    truths: [{ who: 'A yes is more likely right', value: right > 10 - right }],
    note: `Count only the yes answers: ${right} right and ${10 - right} false alarms.`,
  };
}

/** You see one thing with the clue: which group is it more likely in? (The trap when the common group wins: tag base-rate.) */
export function moreItem(rng: Rng, o: CountOptions & { want?: GroupWant; pic?: GroupPic }): CountMade {
  const pic = o.pic ?? makeGroupPic(rng, pickTopic(rng, GROUP_TOPICS, o.skin, o.avoid), o.want ?? 'common');
  const t = pic.topic, c = pic.cells;
  const [aYes, bYes] = [c[0][0], c[1][0]];
  const aT = rowTotal(c, 0), bT = rowTotal(c, 1), yes = colTotal(c, 0);
  const answer = aYes > bYes ? 'a' : bYes > aYes ? 'b' : 'same';
  const trap = answer === 'b' && aYes * bT > bYes * aT;
  const column = `So of the ${yes} ${t.clue.with}, ${bYes} are ${t.b.are} and ${aYes} are ${t.a.are}.`;
  const example: TeachCase = {
    label: `The “${t.clue.yes}” column: ${plural(aYes, t.a.one, t.a.many)} and ${plural(bYes, t.b.one, t.b.many)}.`,
    truths: [{ who: `More are ${t.a.are}`, value: aYes > bYes }, { who: `More are ${t.b.are}`, value: bYes > aYes }],
  };
  const aShare = `${2 * aYes > aT ? 'Most' : 'Some'} ${t.a.many} ${t.clue.are}: ${aYes} of ${aT}.`;
  const fb: Record<string, ChoiceFeedback> = {
    a: {
      headline: 'Your answer leaves out how common each group is.',
      detail: [`${aShare} But ${t.a.many} are rare here: only ${aT} of the 100.`, `Only ${bYes} of the ${bT} ${t.b.many} ${t.clue.are}. But there are so many ${t.b.many} that ${bYes} is more than ${aYes}.`, column],
      example,
    },
    b: {
      headline: `Your answer goes by group size alone, but here more ${t.clue.with} are ${t.a.are}.`,
      detail: [`There are ${bT} ${t.b.many} and ${aT} ${t.a.many}. But only ${bYes} ${t.b.many} ${t.clue.are}.`, `${aYes} ${t.a.many} ${t.clue.are}. That is more than ${bYes}.`, `So of the ${yes} ${t.clue.with}, ${aYes} are ${t.a.are} and ${bYes} are ${t.b.are}.`],
      example,
    },
    same: { headline: `Your answer says both are just as likely, but the counts in the “${t.clue.yes}” column are not the same.`, detail: [`That column has ${plural(aYes, t.a.one, t.a.many)} and ${plural(bYes, t.b.one, t.b.many)}.`, column], example },
    sure: {
      headline: `Your answer says it must be ${withA(t.a.one)}, but ${withClue(t, t.b, bYes)} too.`,
      detail: [`Must means there is no other way. Here, ${bYes} ${t.b.many} ${t.clue.are}.`, ...(answer === 'b' ? [`In fact, ${withA(t.b.one)} is more likely.`, column] : [`${cap(withA(t.a.one))} is more likely, but it is not certain.`])],
      example,
    },
  };
  const choices: Choice[] = [
    { id: 'a', label: `More likely ${withA(t.a.one)}.` },
    { id: 'b', label: `More likely ${withA(t.b.one)}.` },
    { id: 'same', label: 'Just as likely either way.' },
    { id: 'sure', label: `It must be ${withA(t.a.one)}.` },
  ];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = fb[ch.id];
  return done(
    'hundred',
    {
      kind: 'choose',
      prompt: `${t.setting} You see ${t.clue.see}. Is it more likely ${withA(t.a.one)} or ${withA(t.b.one)}?`,
      scene: groupScene(pic),
      choices: rng.shuffle(choices),
      answer,
      explain: `${aShare} But count the “${t.clue.yes}” column: ${plural(aYes, t.a.one, t.a.many)} and ${plural(bYes, t.b.one, t.b.many)}. ${answer === 'b' ? `${cap(t.b.many)} are so common that they win.` : `Here the ${t.a.many} win.`}`,
      feedback,
      hint: 'Count the column for the clue, not one row. Here is a smaller case, checked for you.',
      // A case that comes out the other way from this item, so the hint shows the method, never the answer.
      hintCase: capsCase(answer === 'b' ? 'rare' : 'common'),
      teach: {
        rule: 'To guess the group of something with a clue, count the clue’s column: how many in each group have the clue. A common group can win, even when the clue is rare in it.',
        terms: GROUP_TERMS,
        meaning: `You see ${t.clue.see}. It is one of the ${yes} ${t.clue.with}.`,
        casesTitle: 'How common each group is, and the clue’s column',
        cases: [
          { label: `${cap(t.a.many)}: ${aT} of the 100. ${cap(shareOf(t, t.a, aYes, aT))}.` },
          { label: `${cap(t.b.many)}: ${bT} of the 100. ${cap(shareOf(t, t.b, bYes, bT))}.` },
          example,
        ],
        remember: ['Start with how common each group is.', 'Ask: “Of all the ones with this clue, which group has more?”'],
        simpler: ['Say 2 kids wear red caps and 20 kids wear blue caps.', 'Both red cap kids like soccer, and 6 blue cap kids do.', 'A kid likes soccer. A blue cap is more likely: 6 is more than 2.'],
      },
      ...(trap ? { conflict: true, tags: [BASE_RATE.tag] } : {}),
    },
    { t: 'more', pic },
  );
}

/** Of the things with the clue (a column), how many are in one group? The answer counts out of the column. */
export function ofItem(rng: Rng, o: CountOptions & { group?: 0 | 1; pic?: GroupPic }): CountMade {
  const pic = o.pic ?? makeGroupPic(rng, pickTopic(rng, GROUP_TOPICS, o.skin, o.avoid));
  const t = pic.topic, c = pic.cells;
  const g = o.group ?? (rng.int(0, 1) as 0 | 1);
  const G = g === 0 ? t.a : t.b, O = g === 0 ? t.b : t.a;
  const x = c[g][0], y = c[1 - g][0];
  const yes = colTotal(c, 0), gT = rowTotal(c, g);
  const all: Choice[] = [
    { id: 'col', label: `${x} of ${yes}` },
    { id: 'row', label: `${x} of ${gT}` },
    { id: 'other', label: `${y} of ${yes}` },
    { id: 'all', label: `${x} of 100` },
  ];
  const labels = new Set<string>();
  const choices = all.filter((ch) => !labels.has(ch.label) && labels.add(ch.label));
  const column = `The “${t.clue.yes}” column has ${yes}: ${plural(c[0][0], t.a.one, t.a.many)} and ${plural(c[1][0], t.b.one, t.b.many)}.`;
  const example: TeachCase = { label: column, note: `${x} of the ${yes} are ${G.are}.` };
  const fb: Record<string, ChoiceFeedback> = {
    row: { headline: `Your answer counts out of all the ${G.many}, not out of the ${t.clue.with}.`, detail: [`${x} of ${gT} is the row for ${G.many}: how many of them ${t.clue.are}.`, column, `So the answer is ${x} of ${yes}.`], example },
    other: { headline: `Your answer counts the ${O.many} in the column, not the ${G.many}.`, detail: [column, `The ${O.many} are ${y} of them. The ${G.many} are ${x} of them.`], example },
    all: { headline: `Your answer counts out of all 100 ${t.nouns}, not out of the ${t.clue.with}.`, detail: [column, `So the answer is ${x} of ${yes}.`], example },
  };
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== 'col') feedback[ch.id] = fb[ch.id];
  return done(
    'hundred',
    {
      kind: 'choose',
      prompt: `${t.setting} The count picture splits them two ways. Of the ${yes} ${t.clue.with}, how many are ${G.are}?`,
      scene: groupScene(pic),
      choices: rng.shuffle(choices),
      answer: 'col',
      explain: `${column} ${x} of them are ${G.are}: ${x} of ${yes}.`,
      feedback,
      hint: 'First find the group you count out of. Here is the other column, checked for you.',
      hintCase: { label: `The “${t.clue.no}” column: ${plural(c[0][1], t.a.one, t.a.many)} and ${plural(c[1][1], t.b.one, t.b.many)}.`, note: `${colTotal(c, 1)} ${t.nouns} in all ${t.clue.areNot}.` },
      teach: {
        rule: 'First find the group you count out of: a row or a column. Then count the part of it you want.',
        terms: GROUP_TERMS,
        meaning: `“Of the ${yes} ${t.clue.with}” means you count out of the “${t.clue.yes}” column, not out of a row.`,
        casesTitle: 'The same box, out of different groups',
        cases: [
          { label: `Out of the ${t.clue.with}: ${x} of ${yes} are ${G.are}.`, truths: [{ who: 'This is what the question asks', value: true }] },
          { label: `Out of the ${G.many}: ${x} of ${gT} ${t.clue.are}.`, truths: [{ who: 'This is what the question asks', value: false }] },
        ],
        remember: ['The same box can be part of a row or part of a column.', 'Ask: “Out of which group?”'],
        simpler: [`Find the “${t.clue.yes}” column. It has ${yes} ${t.nouns}.`, `Of those, ${x} are ${G.are}.`, `So it is ${x} of ${yes}.`],
      },
    },
    { t: 'of', pic, group: g },
  );
}

// ---------- Lesson 4: a test that says yes or no ----------

/** A test: what it is called, the word for its yes, and how to say that it says yes for some things. */
export interface TestDef {
  /** “the metal detector” */
  name: string;
  /** “beeps”: what it does when it says yes. */
  yes: string;
  /** The word after the verb: “over”, “for”, “on”, or “” (“flags 5 kids”). */
  prep: string;
  /** The columns: “Beeps”, “No beep”. */
  yesCol: string;
  noCol: string;
  /** A yes answer: “beep”, “beeps”. */
  flag: string;
  flags: string;
}

export interface TestTopic {
  id: string;
  skin: CountSkin;
  /** “A metal detector checks 100 spots on a beach.” */
  setting: string;
  title: string;
  noun: string;
  nouns: string;
  /** The rows: the thing is there (has), or not. `are` is said after a count: “4 spots have a coin”. */
  has: Side;
  not: Side;
  test: TestDef;
  /** One yes, and what it could mean: “The detector beeps over one spot.” “It has a coin.” … */
  event: string;
  hasOne: string;
  notOne: string;
  mustOne: string;
}

const test = (name: string, yes: string, prep: string, yesCol: string, noCol: string, flag: string, flags = `${flag}s`): TestDef => ({ name, yes, prep, yesCol, noCol, flag, flags });

/** The worked example (cards and boards only, never a quiz): an eye check at school. */
export const EYES: TestTopic = {
  id: 'eyes', skin: 'everyday', setting: '100 kids get a quick eye check at school.', title: '100 kids at an eye check', noun: 'kid', nouns: 'kids',
  has: side('Needs glasses', 'kid who needs glasses', 'kids who need glasses', 'need glasses'), not: side('Sees fine', 'kid who sees fine', 'kids who see fine', 'see fine'),
  test: test('the eye check', 'flags', '', 'Flagged', 'Not flagged', 'flag'),
  event: 'The eye check flags one kid.', hasOne: 'The kid needs glasses.', notOne: 'The kid sees fine.', mustOne: 'The kid must need glasses.',
};

export const TEST_TOPICS: readonly TestTopic[] = [
  {
    id: 'beach', skin: 'everyday', setting: 'A metal detector checks 100 spots on a beach.', title: '100 spots on a beach', noun: 'spot', nouns: 'spots',
    has: side('Has a coin', 'spot with a coin', 'spots with a coin', 'have a coin'), not: side('No coin', 'spot with no coin', 'spots with no coin', 'have no coin'),
    test: test('the detector', 'beeps', 'over', 'Beeps', 'No beep', 'beep'),
    event: 'The detector beeps over one spot.', hasOne: 'The spot has a coin.', notOne: 'The spot has no coin.', mustOne: 'The spot must have a coin.',
  },
  {
    id: 'garden', skin: 'everyday', setting: 'A soil sensor checks a garden on 100 days.', title: '100 days in a garden', noun: 'day', nouns: 'days',
    has: side('Soil is dry', 'dry day', 'dry days', 'are dry days'), not: side('Soil is wet', 'wet day', 'wet days', 'are wet days'),
    test: test('the sensor', 'beeps', 'on', 'Beeps', 'No beep', 'beep'),
    event: 'The sensor beeps today.', hasOne: 'The soil is dry today.', notOne: 'The soil is wet today.', mustOne: 'The soil must be dry today.',
  },
  {
    id: 'trolls', skin: 'fantasy', setting: '100 animals cross a bridge, one at a time.', title: '100 animals on a bridge', noun: 'animal', nouns: 'animals',
    has: side('Trolls', 'troll', 'trolls', 'are trolls'), not: side('Goats', 'goat', 'goats', 'are goats'),
    test: test('the troll bell', 'rings', 'for', 'Bell rings', 'No ring', 'ring'),
    event: 'The troll bell rings for one animal.', hasOne: 'It is a troll.', notOne: 'It is a goat.', mustOne: 'It must be a troll.',
  },
  {
    id: 'eggs', skin: 'fantasy', setting: 'A cave holds 100 round stones.', title: '100 stones in a cave', noun: 'stone', nouns: 'stones',
    has: side('Dragon eggs', 'dragon egg', 'dragon eggs', 'are dragon eggs'), not: side('Plain stones', 'plain stone', 'plain stones', 'are plain stones'),
    test: test('the egg wand', 'glows', 'for', 'Glows', 'No glow', 'glow'),
    event: 'The egg wand glows for one stone.', hasOne: 'It is a dragon egg.', notOne: 'It is a plain stone.', mustOne: 'It must be a dragon egg.',
  },
  {
    id: 'lamp', skin: 'abstract', setting: 'A deck has 100 cards.', title: '100 cards in a deck', noun: 'card', nouns: 'cards',
    has: side('Star cards', 'star card', 'star cards', 'are star cards'), not: side('Other cards', 'other card', 'other cards', 'are other cards'),
    test: test('the light', 'blinks', 'for', 'Blinks', 'No blink', 'blink'),
    event: 'The light blinks for one card.', hasOne: 'It is a star card.', notOne: 'It is another card.', mustOne: 'It must be a star card.',
  },
  {
    id: 'scanner', skin: 'abstract', setting: 'A bag holds 100 tiles.', title: '100 tiles in a bag', noun: 'tile', nouns: 'tiles',
    has: side('A tiles', 'A tile', 'A tiles', 'are A tiles'), not: side('Other tiles', 'other tile', 'other tiles', 'are other tiles'),
    test: test('the scanner', 'buzzes', 'for', 'Buzzes', 'No buzz', 'buzz', 'buzzes'),
    event: 'The scanner buzzes for one tile.', hasOne: 'It is an A tile.', notOne: 'It is another tile.', mustOne: 'It must be an A tile.',
  },
];

export interface TestPic {
  topic: TestTopic;
  /** [[caught, missed], [false alarms, quiet]]. */
  cells: Cells;
}

/** The eye check (the worked example) and its twin with more false alarms (the board right after it). */
export const EYES_PIC: TestPic = { topic: EYES, cells: [[5, 0], [10, 85]] };
export const EYES_TWIN: TestPic = { topic: EYES, cells: [[5, 0], [20, 75]] };

/** How many of the 100 the test is right for: the things there that it says yes for, and the things not there it says no for. */
export const rightFor = (c: Cells) => c[0][0] + c[1][1];

/**
 * A test picture. 'rare': the thing is rare (3 to 10 of 100), the test catches all or all but one of them and is right
 * for at least 75 of the 100, yet it has more false alarms than right yes answers (the trap). 'common': the thing is
 * common (30 to 60 of 100), and most yes answers are right.
 */
export function makeTestPic(rng: Rng, topic: TestTopic, want: 'rare' | 'common' = 'rare'): TestPic {
  for (let t = 0; t < 2000; t++) {
    if (want === 'rare') {
      const H = rng.int(3, 10);
      const hit = rng.int(Math.max(1, H - 1), H);
      const alarm = rng.int(hit + 2, 25);
      const cells: Cells = [[hit, H - hit], [alarm, TOTAL - H - alarm]];
      if (rightFor(cells) < 75) continue;
      return { topic, cells };
    }
    const H = rng.int(30, 60);
    const hit = rng.int(Math.ceil(0.8 * H), H);
    const alarm = rng.int(1, Math.min(15, hit - 5));
    const cells: Cells = [[hit, H - hit], [alarm, TOTAL - H - alarm]];
    if (rightFor(cells) < 75 || alarm >= hit) continue;
    return { topic, cells };
  }
  throw new Error(`makeTestPic: no ${want} picture`);
}

export function testScene(p: TestPic, o: { pick?: { row?: 0 | 1; col?: 0 | 1 }; pickLabel?: string; caption?: string } = {}): Extract<Scene, { kind: 'counts' }> {
  const t = p.topic;
  return { kind: 'counts', title: t.title, total: TOTAL, rows: [t.has.label, t.not.label], cols: [t.test.yesCol, t.test.noCol], cells: [[...p.cells[0]], [...p.cells[1]]], ...o };
}

/** “the detector beeps over all 4”, “the eye check flags 10 of the 95”: how many of a row the test says yes for. */
export function yesFor(t: TestTopic, n: number, of: number): string {
  return `${t.test.name} ${t.test.yes}${t.test.prep ? ` ${t.test.prep}` : ''} ${n === of ? `all ${of}` : `${n} of the ${of}`}`;
}

/** The story of a test picture: how many have the thing, how many of them the test catches, and its false alarms. */
export function testStory(p: TestPic): string {
  const t = p.topic, c = p.cells;
  const H = rowTotal(c, 0), N = rowTotal(c, 1);
  const caught = c[0][0] === H ? `all ${H} of them` : `${c[0][0]} of the ${H}`;
  const prep = t.test.prep ? ` ${t.test.prep}` : '';
  return `${t.setting} ${H} of them ${t.has.are}. ${cap(t.test.name)} ${t.test.yes}${prep} ${caught}. It also ${t.test.yes}${prep} ${c[1][0]} of the ${N} ${t.not.many}.`;
}

const TEST_TERMS = [
  { word: 'A false alarm', meaning: 'the test says yes, but the thing is not there.' },
  { word: 'A base rate', meaning: 'how common something is in the whole group, as a count out of 100.' },
  { word: 'Right for most', meaning: 'the test gives the right answer for most of the 100. That is not the same as most of its yes answers being right.' },
];

/** The has row, the not row and the yes column of a test picture, as cases. */
function testCases(p: TestPic): TeachCase[] {
  const t = p.topic, c = p.cells;
  const H = rowTotal(c, 0), N = rowTotal(c, 1), Y = colTotal(c, 0);
  return [
    { label: `The row for ${t.has.many}: ${yesFor(t, c[0][0], H)}.`, truths: [{ who: 'It catches most of them', value: 2 * c[0][0] > H }] },
    { label: `The row for ${t.not.many}: ${yesFor(t, c[1][0], N)}.`, note: c[1][0] === 1 ? 'That 1 is a false alarm.' : `Those ${c[1][0]} are false alarms.` },
    { label: `The “${t.test.yesCol}” column: ${Y} ${t.test.flags}. ${c[0][0]} are right, and ${alarmsAre(c[1][0])}.`, truths: [{ who: 'Most of them are right', value: c[0][0] > c[1][0] }] },
  ];
}

/** A test says yes for one thing. Is the thing more likely there or not? (The trap when it is rare: tag false-alarm.) */
export function alarmItem(rng: Rng, o: CountOptions & { want?: 'rare' | 'common'; pic?: TestPic }): CountMade {
  const pic = o.pic ?? makeTestPic(rng, pickTopic(rng, TEST_TOPICS, o.skin, o.avoid), o.want ?? 'rare');
  const t = pic.topic, c = pic.cells;
  const [hit, alarm] = [c[0][0], c[1][0]];
  const H = rowTotal(c, 0), Y = colTotal(c, 0), R = rightFor(c);
  const answer = hit > alarm ? 'has' : alarm > hit ? 'not' : 'same';
  const trap = answer === 'not' && R > TOTAL / 2;
  const count = `Of those ${Y}, ${hit} ${t.has.are}. The other ${alarmsAre(alarm)}.`;
  const example: TeachCase = { label: `The ${Y} ${t.test.flags}: ${hit} right and ${alarmsN(alarm)}.`, truths: [{ who: 'Most of them are right', value: hit > alarm }] };
  const fb: Record<string, ChoiceFeedback> = {
    has: {
      headline: `Your answer goes by how often ${t.test.name} is right, but most of its ${t.test.flags} are false alarms.`,
      detail: [`${cap(t.test.name)} is right for ${R} of the 100. It gives ${Y} ${t.test.flags} in all.`, count, `${cap(t.has.many)} are rare here: only ${H} of the 100. So the many ${t.not.many} make more ${t.test.flags}.`],
      example,
    },
    not: {
      headline: `Your answer expects a false alarm, but here most ${t.test.flags} are right.`,
      detail: [`${cap(t.test.name)} gives ${Y} ${t.test.flags} in all.`, count, `${cap(t.has.many)} are common here: ${H} of the 100.`],
      example,
    },
    same: { headline: `Your answer says both are just as likely, but of the ${Y} ${t.test.flags}, ${hit} are right and ${alarmsAre(alarm)}.`, detail: [count], example },
    sure: {
      headline: `Your answer says it must be so, but ${t.test.name} makes false alarms.`,
      detail: [`Must means there is no other way. But ${alarm} of the ${Y} ${t.test.flags} ${alarm === 1 ? 'is a false alarm' : 'are false alarms'}.`, count, answer === 'has' ? 'So it is likely, not certain.' : 'In fact, a false alarm is more likely.'],
      example,
    },
  };
  const choices: Choice[] = [
    { id: 'has', label: t.hasOne },
    { id: 'not', label: t.notOne },
    { id: 'same', label: 'Both are just as likely.' },
    { id: 'sure', label: t.mustOne },
  ];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = fb[ch.id];
  return done(
    'clue',
    {
      kind: 'choose',
      prompt: `${testStory(pic)} ${t.event} Which is more likely?`,
      scene: testScene(pic),
      choices: rng.shuffle(choices),
      answer,
      explain: `Count only the ${t.test.flags}: the “${t.test.yesCol}” column. ${cap(t.test.name)} gives ${Y} ${t.test.flags}. ${count} So ${lowerFirst(answer === 'has' ? t.hasOne : answer === 'not' ? t.notOne : 'both are just as likely.')}`,
      feedback,
      hint: `Count only the ${t.test.flags}. Here is a smaller case, checked for you.`,
      // A case that comes out the other way from this item, so the hint shows the method, never the answer.
      hintCase: yesCase(answer === 'not' ? 8 : 3),
      teach: {
        rule: `When a test says yes, count only its yes answers. See how many are right and how many are false alarms.`,
        terms: TEST_TERMS,
        meaning: `${cap(t.test.name)} is right for ${R} of the 100. The question is about one ${t.test.flag}.`,
        casesTitle: 'The rows and the yes column',
        cases: testCases(pic),
        remember: ['A test can be right for most and still give more false alarms than right yes answers.', '“How often would it say yes if the answer were no?”'],
        simpler: ['Say 10 kids get the eye check. 1 kid needs glasses.', 'The check flags that kid, and 2 kids who see fine.', 'So it flags 3 kids, and only 1 of them needs glasses. A flag is more likely a false alarm.'],
      },
      ...(trap ? { conflict: true, tags: [FALSE_ALARM.tag] } : {}),
    },
    { t: 'alarm', pic },
  );
}

/** Of the things the test says yes for, how many have the thing? The yes column, not a row and not all 100. */
export function answerItem(rng: Rng, o: CountOptions & { pic?: TestPic }): CountMade {
  const pic = o.pic ?? makeTestPic(rng, pickTopic(rng, TEST_TOPICS, o.skin, o.avoid), rng.chance(0.7) ? 'rare' : 'common');
  const t = pic.topic, c = pic.cells;
  const [hit, alarm] = [c[0][0], c[1][0]];
  const H = rowTotal(c, 0), Y = colTotal(c, 0), R = rightFor(c);
  const all: Choice[] = [
    { id: 'col', label: `${hit} of ${Y}` },
    { id: 'row', label: `${hit} of ${H}` },
    { id: 'all', label: `${R} of 100` },
    { id: 'alarm', label: `${alarm} of ${Y}` },
  ];
  const labels = new Set<string>();
  const choices = all.filter((ch) => !labels.has(ch.label) && labels.add(ch.label));
  const column = `The ${t.test.flags} make the “${t.test.yesCol}” column: ${Y} in all. ${hit} of them ${t.has.are}, and ${alarmsAre(alarm)}.`;
  const example: TeachCase = { label: column, truths: [{ who: 'Most of them are right', value: hit > alarm }] };
  const fb: Record<string, ChoiceFeedback> = {
    row: { headline: `Your answer is how often ${t.test.name} catches ${t.has.many}, not how often its ${t.test.flag} is right.`, detail: [`${hit} of ${H} counts out of the ${H} ${t.has.many}: their row.`, column, `So the answer is ${hit} of ${Y}.`], example },
    all: { headline: `Your answer is how often ${t.test.name} is right for all 100, not how often its ${t.test.flag} is right.`, detail: [`${R} of 100 counts every right answer: ${t.test.flags} and no ${t.test.flags}.`, column, `So the answer is ${hit} of ${Y}.`], example },
    alarm: { headline: `Your answer counts the false alarms, not the ${t.test.flags} that are right.`, detail: [column, `So the answer is ${hit} of ${Y}.`], example },
  };
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== 'col') feedback[ch.id] = fb[ch.id];
  const prep = t.test.prep ? ` ${t.test.prep}` : '';
  return done(
    'clue',
    {
      kind: 'choose',
      prompt: `${testStory(pic)} Of the ${Y} ${t.nouns} ${t.test.name} ${t.test.yes}${prep}, how many ${t.has.are}?`,
      scene: testScene(pic),
      choices: rng.shuffle(choices),
      answer: 'col',
      explain: `${column} So ${hit} of the ${Y} ${t.test.flags} are right.`,
      feedback,
      hint: 'First find the group you count out of. Here is a row, checked for you. It is not that group.',
      hintCase: { label: `Out of the ${H} ${t.has.many}, ${yesFor(t, hit, H)}.`, truths: [{ who: `This counts out of the ${t.test.flags}`, value: false }], note: 'That is how often it catches them.' },
      teach: {
        rule: `How often a test is right is not how often its yes is right. For its yes, count out of the yes column only.`,
        terms: TEST_TERMS,
        meaning: `The question counts out of the ${Y} ${t.test.flags}. It does not count out of the ${H} ${t.has.many}, or out of all 100.`,
        casesTitle: 'The same test, out of different groups',
        cases: testCases(pic),
        remember: ['A row says how often the test catches the thing. The yes column says how often its yes is right.', 'Ask: “Out of which group?”'],
        simpler: [`Find the “${t.test.yesCol}” column. It has ${Y} ${t.nouns}.`, `Of those, ${hit} ${t.has.are}.`, `So ${hit} of ${Y} ${t.test.flags} are right.`],
      },
    },
    { t: 'answer', pic },
  );
}

// ---------- Lesson 4: which clue tells you more? ----------

/** A clue counted out of 10 times you are right and 10 times you are wrong. */
export interface ClueDef {
  id: string;
  /** The choice label: “The porch light”. */
  name: string;
  /** A short scene line: “Porch light is lit”. */
  short: string;
  /** The clue as a clause: “the porch light is lit”. */
  seen: string;
  /** A full sentence for a count: “The porch light is lit on 9 of 10 days when Grandpa visits.” */
  say(n: number, right: boolean): string;
}

export interface ClueTopic {
  id: string;
  skin: CountSkin;
  question: string;
  /** The scene’s heads: “On 10 days when Grandpa visits:”. */
  yesHead: string;
  noHead: string;
  /** What the clue would be a sign of: “Grandpa is visiting”. */
  guess: string;
  /** Who reads the clue in a why question. */
  who: string;
  /** Its two clues. Either one can be the strong clue: the counts in each story decide. */
  clues: readonly [ClueDef, ClueDef];
}

const dayClue = (id: string, name: string, short: string, seen: string, yes: string, no: string): ClueDef => ({
  id, name, short, seen,
  say: (n, right) => `${cap(seen)} on ${n} of 10 ${right ? yes : no}.`,
});

/** The worked example’s clues (cards only, never a quiz): did it rain last night? */
export const RAIN: ClueTopic = {
  id: 'rain', skin: 'everyday', question: 'Did it rain last night?', yesHead: 'On 10 mornings after rain:', noHead: 'On 10 mornings with no rain:', guess: 'it rained', who: 'Rosa',
  clues: [
    dayClue('grass', 'The wet grass', 'Grass is wet', 'the grass is wet', 'mornings after rain', 'mornings with no rain'),
    dayClue('puddles', 'The puddles', 'Puddles on the road', 'there are puddles on the road', 'mornings after rain', 'mornings with no rain'),
  ],
};
/** The rain clues’ counts, in RAIN’s order (wet grass, puddles): [when it rained, when it did not], out of 10 each. */
export const RAIN_COUNTS: readonly [readonly [number, number], readonly [number, number]] = [[10, 7], [8, 1]];

export const CLUE_TOPICS: readonly ClueTopic[] = [
  {
    id: 'visit', skin: 'everyday', question: 'Is Grandpa visiting today?', yesHead: 'On 10 days when Grandpa visits:', noHead: 'On 10 days when he does not:', guess: 'Grandpa is visiting', who: 'Raj',
    clues: [
      dayClue('light', 'The porch light', 'Porch light is lit', 'the porch light is lit', 'days when Grandpa visits', 'days when he does not'),
      dayClue('truck', 'The red truck', 'Red truck in the drive', 'a red truck is in the drive', 'days when Grandpa visits', 'days when he does not'),
    ],
  },
  {
    id: 'game', skin: 'everyday', question: 'Did the soccer team win today?', yesHead: 'After 10 games the team won:', noHead: 'After 10 games the team lost:', guess: 'the team won', who: 'Mia',
    clues: [
      { id: 'tired', name: 'Tired players', short: 'Players look tired', seen: 'the players look tired', say: (n, w) => `The players look tired after ${n} of 10 games ${w ? 'they won' : 'they lost'}.` },
      { id: 'sing', name: 'Singing players', short: 'Players sing on the bus', seen: 'the players sing on the bus', say: (n, w) => `The players sing on the bus after ${n} of 10 games ${w ? 'they won' : 'they lost'}.` },
    ],
  },
  {
    id: 'bread', skin: 'everyday', question: 'Did Dad bake bread today?', yesHead: 'On 10 days when Dad bakes:', noHead: 'On 10 days when he does not:', guess: 'Dad baked bread', who: 'Gus',
    clues: [
      dayClue('flour', 'Flour on the counter', 'Flour on the counter', 'there is flour on the counter', 'days when Dad bakes', 'days when he does not'),
      dayClue('smell', 'The bread smell', 'House smells like bread', 'the house smells like bread', 'days when Dad bakes', 'days when he does not'),
    ],
  },
  {
    id: 'dragon', skin: 'fantasy', question: 'Is the dragon awake?', yesHead: 'On 10 visits when the dragon is awake:', noHead: 'On 10 visits when it is asleep:', guess: 'the dragon is awake', who: 'Lia',
    clues: [
      dayClue('steam', 'Steam from the cave', 'Steam from the cave', 'steam comes out of the cave', 'visits when the dragon is awake', 'visits when it is asleep'),
      dayClue('roar', 'A loud roar', 'A loud roar', 'you hear a loud roar', 'visits when the dragon is awake', 'visits when it is asleep'),
    ],
  },
  {
    id: 'wizard', skin: 'fantasy', question: 'Is the wizard in the tower?', yesHead: 'On 10 nights when the wizard is in:', noHead: 'On 10 nights when the wizard is out:', guess: 'the wizard is in', who: 'Zed',
    clues: [
      dayClue('window', 'The open window', 'Window is open', 'the tower window is open', 'nights when the wizard is in', 'nights when the wizard is out'),
      dayClue('sparks', 'Purple sparks', 'Purple sparks from the chimney', 'purple sparks fly from the chimney', 'nights when the wizard is in', 'nights when the wizard is out'),
    ],
  },
  {
    id: 'stars', skin: 'abstract', question: 'Is this card a star card?', yesHead: 'Of 10 star cards:', noHead: 'Of 10 other cards:', guess: 'it is a star card', who: 'Max',
    clues: [
      { id: 'blue', name: 'A blue back', short: 'Blue back', seen: 'the card has a blue back', say: (n, s) => `${n} of 10 ${s ? 'star cards' : 'other cards'} ${n === 1 ? 'has' : 'have'} a blue back.` },
      { id: 'gold', name: 'A gold edge', short: 'Gold edge', seen: 'the card has a gold edge', say: (n, s) => `${n} of 10 ${s ? 'star cards' : 'other cards'} ${n === 1 ? 'has' : 'have'} a gold edge.` },
    ],
  },
  {
    id: 'tiles', skin: 'abstract', question: 'Is this tile an A tile?', yesHead: 'Of 10 A tiles:', noHead: 'Of 10 other tiles:', guess: 'it is an A tile', who: 'Ana',
    clues: [
      { id: 'round', name: 'A round corner', short: 'Round corner', seen: 'the tile has a round corner', say: (n, s) => `${n} of 10 ${s ? 'A tiles' : 'other tiles'} ${n === 1 ? 'has' : 'have'} a round corner.` },
      { id: 'dot', name: 'A dot in the middle', short: 'Dot in the middle', seen: 'the tile has a dot in the middle', say: (n, s) => `${n} of 10 ${s ? 'A tiles' : 'other tiles'} ${n === 1 ? 'has' : 'have'} a dot in the middle.` },
    ],
  },
];

/** A clue picture: each clue’s count out of 10 when you are right and out of 10 when you are wrong. */
export interface CluePic {
  topic: ClueTopic;
  /** Each clue’s counts, in the topic’s order: [when right, when wrong], out of 10 each. */
  counts: [[number, number], [number, number]];
  /** The order the clues are shown in (indexes into the topic’s clues). */
  order: [0, 1] | [1, 0];
}

/** One of a topic’s two clues. */
export type ClueIx = 0 | 1;

/**
 * Which clue tells you more: the one whose count when right is the bigger multiple of its count when wrong. Cross-
 * multiplied, so no division: x tells more than y when x.right × y.wrong is bigger than y.right × x.wrong.
 */
export function strongerClue(p: CluePic): ClueIx | 'same' {
  const [x, y] = p.counts;
  const cmp = x[0] * y[1] - y[0] * x[1];
  return cmp > 0 ? 0 : cmp < 0 ? 1 : 'same';
}

/**
 * Counts for a clue picture. Which of the topic’s two clues is the strong one is part of the story (`strong`, else
 * either): the weak clue shows up on 5 or more of the 10 times you are wrong; the strong one on 1 or 2, and at least 3
 * times as often when you are right, so it tells at least twice as much. `conflict`: the weak clue shows up more often
 * when you are right, so the clue seen most is the wrong pick. `tie`: both clues have the same counts (seen often when
 * right, rarely when wrong), so they tell you just as much.
 */
export function makeCluePic(rng: Rng, topic: ClueTopic, o: { conflict?: boolean; strong?: ClueIx; tie?: boolean } = {}): CluePic {
  const order: CluePic['order'] = rng.chance(0.5) ? [0, 1] : [1, 0];
  if (o.tie) {
    const r = rng.int(6, 9), w = rng.int(1, 2);
    return { topic, counts: [[r, w], [r, w]], order };
  }
  const conflict = o.conflict ?? rng.chance(0.6);
  const strong = o.strong ?? (rng.int(0, 1) as ClueIx);
  for (let t = 0; t < 2000; t++) {
    const aW = rng.int(6, 10), bW = rng.int(5, aW - 1);
    const aS = rng.int(4, 9), bS = rng.int(1, 2);
    if (aS < 3 * bS || aS * bW < 2 * aW * bS) continue;
    if (conflict && aW <= aS) continue;
    return { topic, counts: strong === 0 ? [[aS, bS], [aW, bW]] : [[aW, bW], [aS, bS]], order };
  }
  throw new Error('makeCluePic: no counts');
}

export function clueScene(p: CluePic): Scene {
  const t = p.topic;
  const [x, y] = p.order.map((i) => ({ def: t.clues[i], n: p.counts[i] }));
  return { kind: 'text', lines: [t.yesHead, `${x.def.short}: ${x.n[0]} of the 10`, `${y.def.short}: ${y.n[0]} of the 10`, t.noHead, `${x.def.short}: ${x.n[1]} of the 10`, `${y.def.short}: ${y.n[1]} of the 10`] };
}

const CLUE_TERMS = [
  { word: 'A strong clue', meaning: 'one you would rarely see if you were wrong. Seeing it tells you a lot.' },
  { word: 'A weak clue', meaning: 'one you would see often either way. Seeing it tells you little.' },
  { word: 'A false alarm', meaning: 'the clue shows up, but you were wrong.' },
];

function clueCase(p: CluePic, i: ClueIx): TeachCase {
  const d = p.topic.clues[i];
  const [r, w] = p.counts[i];
  return { label: `${d.say(r, true)} ${d.say(w, false)}`, truths: [{ who: 'You would see it often if you were wrong', value: 2 * w >= 10 }], note: `If you were wrong, you would still see it ${plural(w, 'time', 'times')} out of 10.` };
}

/** “just once”, “just 2 times”. */
const justTimes = (n: number) => (n === 1 ? 'just once' : `just ${n} times`);

/**
 * Two clues, each counted when you are right and when you are wrong: which tells you more? The story decides which of
 * the topic’s two clues is the strong one, and sometimes gives both the same counts (`tie`), so the answer can be
 * either clue, or “just as much”.
 */
export function strongItem(rng: Rng, o: CountOptions & { pic?: CluePic; conflict?: boolean; tie?: boolean }): CountMade {
  const pic = o.pic ?? makeCluePic(rng, pickTopic(rng, CLUE_TOPICS, o.skin, o.avoid), { conflict: o.conflict, tie: o.tie ?? rng.chance(0.2) });
  const t = pic.topic;
  const best = strongerClue(pic);
  const both = (i: ClueIx) => `${t.clues[i].say(pic.counts[i][0], true)} ${t.clues[i].say(pic.counts[i][1], false)}`;
  const lines = pic.order.map(both);
  const answer = best === 'same' ? 'same' : t.clues[best].id;
  const fb: Record<string, ChoiceFeedback> = {};
  let explain: string;
  if (best === 'same') {
    // Both clues have the same counts: each tells you just as much as the other.
    const [r, w] = pic.counts[0];
    const each = `Each one shows up ${r} times out of 10 when you are right, and ${justTimes(w)} when you are wrong.`;
    for (const i of [0, 1] as const) {
      fb[t.clues[i].id] = { headline: `Your answer picks ${lowerFirst(t.clues[i].name)}, but the other clue has the same counts.`, detail: [...lines, each, 'So they tell you just as much.'], example: clueCase(pic, i === 0 ? 1 : 0) };
    }
    fb.none = { headline: 'Your answer says neither clue tells you anything, but each one is rare when you are wrong.', detail: [each, 'So each one tells you a lot, and just as much as the other.'], example: clueCase(pic, 0) };
    explain = `${lines.join(' ')} The counts are the same for both clues. So they tell you just as much.`;
  } else {
    const si = best, wi: ClueIx = best === 0 ? 1 : 0;
    const S = t.clues[si], W = t.clues[wi];
    const [, sW] = pic.counts[si];
    const [, wW] = pic.counts[wi];
    fb[W.id] = { headline: `Your answer picks ${lowerFirst(W.name)}, but you would see that clue often even if you were wrong.`, detail: [both(wi), both(si), 'A clue tells you more when you would rarely see it if you were wrong.'], example: clueCase(pic, wi) };
    fb.same = {
      headline: 'Your answer says both tell you the same, but one of them shows up far more often when you are wrong.',
      detail: [`If you were wrong, ${lowerFirst(W.name)} would still show up ${wW} times out of 10. ${S.name} would show up ${justTimes(sW)}.`, 'So they do not tell you the same.'],
      example: clueCase(pic, wi),
    };
    fb.none = { headline: `Your answer says neither clue tells you anything, but ${lowerFirst(S.name)} tells you a lot.`, detail: [both(si), 'You would rarely see it if you were wrong. So seeing it tells you a lot.'], example: clueCase(pic, si) };
    explain = `${both(si)} You would rarely see that clue if you were wrong. You would still see ${lowerFirst(W.name)} ${wW} times out of 10 if you were wrong.`;
  }
  const choices: Choice[] = [
    ...pic.order.map((i) => ({ id: t.clues[i].id, label: `${t.clues[i].name}.` })),
    { id: 'same', label: 'They tell you just as much.' },
    { id: 'none', label: 'Neither one tells you anything.' },
  ];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = fb[ch.id];
  return done(
    'clue',
    {
      kind: 'choose',
      prompt: `${t.question} Two clues can help. The lines show how often each one shows up when the answer is yes, and when it is no. Which clue tells you more?`,
      scene: clueScene(pic),
      choices,
      answer,
      explain,
      feedback,
      hint: 'Ask: how often would I see this clue if I were wrong? Here is a smaller case, checked for you.',
      hintCase: dogCase(),
      teach: {
        rule: 'A clue tells you a lot when you would rarely see it if you were wrong. A clue you see often either way tells you little.',
        terms: CLUE_TERMS,
        meaning: `The question is: ${lowerFirst(t.question)} Each clue is counted on 10 times the answer is yes, and on 10 times it is no.`,
        casesTitle: 'Each clue, when you are right and when you are wrong',
        cases: pic.order.map((i) => clueCase(pic, i)),
        remember: ['Do not only ask how often you see a clue when you are right.', 'Ask: “How often would I see it if I were wrong?”'],
        simpler: ['A dog barks at the mail carrier. It also barks at birds, cars and leaves.', 'So a bark does not tell you much about the mail.', 'A clue that shows up for many reasons tells you little.'],
      },
    },
    { t: 'strong', pic },
  );
}

// ---------- Lesson 5: both and either, for things that do not affect each other ----------

/** One thing a pair picture splits by: its two labels, and how to say it about one thing or many. */
export interface PairSide {
  /** The picture’s labels: “Red”, “Not red”. */
  yes: string;
  no: string;
  /** “is red”, “are red”; “has a dog”, “have a dog”. */
  is: string;
  are: string;
}

export interface PairTopic {
  id: string;
  skin: CountSkin;
  /** “100 balloons are at a fair.” */
  setting: string;
  /** The picture’s title: “100 balloons at a fair”. */
  title: string;
  noun: string;
  nouns: string;
  /** The rows: the first thing (red, or not). */
  a: PairSide;
  /** The columns: the second thing (big, or not). */
  b: PairSide;
  /** Why the two do not affect each other: “Size does not depend on color.” */
  apart: string;
  /** Said after a part of all 100, so it holds in each row: “red or not”. */
  orNot: string;
}

const pairSide = (yes: string, no: string, is: string, are: string): PairSide => ({ yes, no, is, are });

/** The worked example (cards and boards only, never a quiz): balloons at a fair, red and big. */
export const BALLOONS: PairTopic = {
  id: 'balloons', skin: 'everyday', setting: '100 balloons are at a fair.', title: '100 balloons at a fair', noun: 'balloon', nouns: 'balloons',
  a: pairSide('Red', 'Not red', 'is red', 'are red'), b: pairSide('Big', 'Not big', 'is big', 'are big'),
  apart: 'Size does not depend on color.', orNot: 'red or not',
};

export const PAIR_TOPICS: readonly PairTopic[] = [
  {
    id: 'shirts', skin: 'everyday', setting: 'A shop has 100 T-shirts.', title: '100 T-shirts in a shop', noun: 'T-shirt', nouns: 'T-shirts',
    a: pairSide('Blue', 'Not blue', 'is blue', 'are blue'), b: pairSide('Pocket', 'No pocket', 'has a pocket', 'have a pocket'),
    apart: 'Pockets have nothing to do with color.', orNot: 'blue or not',
  },
  {
    id: 'camp', skin: 'everyday', setting: '100 kids go to a summer camp.', title: '100 kids at a camp', noun: 'kid', nouns: 'kids',
    a: pairSide('Has a dog', 'No dog', 'has a dog', 'have a dog'), b: pairSide('Glasses', 'No glasses', 'wears glasses', 'wear glasses'),
    apart: 'Wearing glasses has nothing to do with having a dog.', orNot: 'with a dog or not',
  },
  {
    id: 'owls', skin: 'fantasy', setting: '100 owls live in a magic wood.', title: '100 owls in a magic wood', noun: 'owl', nouns: 'owls',
    a: pairSide('White', 'Not white', 'is white', 'are white'), b: pairSide('Can talk', 'Cannot talk', 'can talk', 'can talk'),
    apart: 'Talking has nothing to do with color.', orNot: 'white or not',
  },
  {
    id: 'potions', skin: 'fantasy', setting: 'A wizard has 100 potions.', title: '100 potions on a shelf', noun: 'potion', nouns: 'potions',
    a: pairSide('Green', 'Not green', 'is green', 'are green'), b: pairSide('Glows', 'No glow', 'glows', 'glow'),
    apart: 'Glowing has nothing to do with color.', orNot: 'green or not',
  },
  {
    id: 'shapes', skin: 'abstract', setting: 'A box holds 100 shapes.', title: '100 shapes in a box', noun: 'shape', nouns: 'shapes',
    a: pairSide('Circle', 'Not a circle', 'is a circle', 'are circles'), b: pairSide('Striped', 'Not striped', 'is striped', 'are striped'),
    apart: 'Stripes have nothing to do with shape.', orNot: 'circle or not',
  },
  {
    id: 'beads', skin: 'abstract', setting: 'A tray holds 100 beads.', title: '100 beads on a tray', noun: 'bead', nouns: 'beads',
    a: pairSide('Square', 'Not square', 'is square', 'are square'), b: pairSide('Shiny', 'Not shiny', 'is shiny', 'are shiny'),
    apart: 'Shine has nothing to do with shape.', orNot: 'square or not',
  },
];

/**
 * A pair picture: 100 things split by two things that do not affect each other. The second thing is `k` in every `m`
 * in each row, so its box in each row is that part of the row: the row split into groups of m, with k from each group.
 */
export interface PairPic {
  topic: PairTopic;
  cells: Cells;
  k: number;
  m: number;
}

/** k in every m of n: n split into groups of m, with k taken from each group. Never a fraction: whole groups only. */
export function partOf(n: number, k: number, m: number): number {
  if (n % m !== 0) throw new Error(`partOf: ${n} is not whole groups of ${m}`);
  return (n / m) * k;
}

/** The picture from its model: `r` of the 100 have the first thing, and the second is k in every m in each row. */
export function pairPic(topic: PairTopic, r: number, k: number, m: number): PairPic {
  const x = partOf(r, k, m), y = partOf(TOTAL - r, k, m);
  return { topic, cells: [[x, r - x], [y, TOTAL - r - y]], k, m };
}

/** The parts a second thing can have, k in every m. */
export const PAIR_SHARES: readonly (readonly [number, number])[] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10]];

/**
 * Every count a Lesson 5 question can use, each read from the picture’s boxes: the first thing (a row), the second
 * (a column), both (the box they share), either (the three boxes with one thing or both), the row and the column added
 * (the overlap twice), just one of the two (one but not both), neither (the last box), and the rest of each.
 */
export function pairCounts(p: PairPic) {
  const c = p.cells;
  return {
    a: rowTotal(c, 0),
    notA: rowTotal(c, 1),
    b: colTotal(c, 0),
    notB: colTotal(c, 1),
    both: c[0][0],
    either: c[0][0] + c[0][1] + c[1][0],
    added: rowTotal(c, 0) + colTotal(c, 0),
    one: c[0][1] + c[1][0],
    neither: c[1][1],
    aOnly: c[0][1],
    bOnly: c[1][0],
  };
}

/**
 * A pair picture for a quiz: the first thing in 10 to 60 of the 100, whole groups of m. Every box holds at least 2,
 * the row and the column added stay under 100 (so the sum looks like a count too), and every box, row, column and
 * count a choice can show is its own number.
 */
export function makePairPic(rng: Rng, topic: PairTopic): PairPic {
  for (let t = 0; t < 2000; t++) {
    const [k, m] = rng.pick(PAIR_SHARES);
    const r = m * rng.int(Math.ceil(10 / m), Math.floor(60 / m));
    const p = pairPic(topic, r, k, m);
    const n = pairCounts(p);
    if (Math.min(...p.cells.flat()) < 2 || n.added > 95) continue;
    const parts = [...p.cells.flat(), n.a, n.notA, n.b, n.notB];
    // The groups (the first row split into groups of m) are a choice only when more than 1 is taken from each group.
    const shown = [n.both, n.added, n.either, n.b, n.aOnly, n.one, n.neither, ...(k > 1 ? [r / m] : [])];
    if (new Set(parts).size !== parts.length || new Set(shown).size !== shown.length) continue;
    return p;
  }
  throw new Error('makePairPic: no picture');
}

/**
 * A pair picture as a scene: every box, or (`rows`) a picture to fill, with each row’s count in all and the boxes
 * blank.
 */
export function pairScene(p: PairPic, o: { show?: 'all' | 'rows'; pick?: { row?: 0 | 1; col?: 0 | 1 }; pickLabel?: string; caption?: string } = {}): Extract<Scene, { kind: 'counts' }> {
  const t = p.topic, c = p.cells;
  const { show = 'all', ...rest } = o;
  const head = { kind: 'counts' as const, title: t.title, total: TOTAL, rows: [t.a.yes, t.a.no] as [string, string], cols: [t.b.yes, t.b.no] as [string, string] };
  if (show === 'rows') return { ...head, cells: [[null, null], [null, null]], rowTotals: [rowTotal(c, 0), rowTotal(c, 1)], ...rest };
  return { ...head, cells: [[c[0][0], c[0][1]], [c[1][0], c[1][1]]], ...rest };
}

/** “1 in every 4”. */
export const shareWords = (p: PairPic) => `${p.k} in every ${p.m}`;
/** The second thing’s verb after a part: “1 in every 4 is big”, “3 in every 4 are big”. */
const partVerb = (p: PairPic) => (p.k === 1 ? p.topic.b.is : p.topic.b.are);
/** “1 in every 4 balloons is big”, “3 in every 10 kids wear glasses”. */
export const pairShareSay = (p: PairPic) => `${shareWords(p)} ${p.topic.nouns} ${partVerb(p)}`;
/** “Of the 20 kids that have a dog, 1 in every 4 wears glasses: 5.” */
const ofTheRow = (p: PairPic) => `Of the ${rowTotal(p.cells, 0)} ${p.topic.nouns} that ${p.topic.a.are}, ${shareWords(p)} ${partVerb(p)}: ${p.cells[0][0]}.`;
/** “Split the 20 into groups of 4: 5 groups. Take 1 from each group: 5.” */
export const groupsLine = (n: number, p: PairPic) => `Split the ${n} into groups of ${p.m}: ${n / p.m} groups. Take ${p.k} from each group: ${partOf(n, p.k, p.m)}.`;
/** “have a dog and wear glasses”, “have a dog or wear glasses”. */
const andSay = (t: PairTopic) => `${t.a.are} and ${t.b.are}`;
const orSay = (t: PairTopic) => `${t.a.are} or ${t.b.are}`;

/** The trap tags of Lesson 5. */
export const ADD_BOTH = { tag: 'add-both', label: 'a question where adding the two counts is the trap, because both is one box' } as const;
export const OVERLAP = { tag: 'overlap', label: 'a question where adding counts the overlap twice, so it must be taken away once' } as const;

const PAIR_TERMS = {
  both: { word: 'Both', meaning: 'the two things at once. Grown-ups also say “and.” It is one box of the count picture.' },
  apart: { word: 'Do not affect each other', meaning: 'one thing does not change how common the other is. The part is the same in each row.' },
  either: { word: 'Either', meaning: 'one thing, the other, or both. Grown-ups also say “or.” It is a row and a column.' },
  overlap: { word: 'The overlap', meaning: 'the ones in the row and in the column at once: the box where they meet.' },
};

/**
 * The small worked case behind every Lesson 5 hint and “Explain more simply”: 10 cards, 4 of them red, and 1 in every
 * 2 cards big, red or not. Every count is worked out from it, never typed.
 */
const SMALL = (() => {
  const all = 10, red = 4, k = 1, m = 2;
  const both = partOf(red, k, m), big = partOf(all, k, m);
  return { all, red, k, m, both, big, added: red + big, either: red + big - both };
})();

/** A small worked case of both, for a hint: 10 cards, 4 of them red, and 1 in every 2 cards big, red or not. */
export function smallBothCase(): TeachCase {
  const { all, red, k, m, both, big, added } = SMALL;
  return {
    label: `Say ${all} cards: ${red} are red, and ${k} in every ${m} cards is big, red or not, so ${big} are big. Of the ${red} red cards, ${k} in every ${m} is big: ${both}.`,
    truths: [{ who: `Red and big: ${both}`, value: true }, { who: `Red and big: ${red} and ${big} added`, value: false }],
    note: `Adding ${red} and ${big} gives ${added}, more than the ${red} red cards.`,
  };
}

/** A small worked case of either, for a hint: the same 10 cards, so 4 red, 5 big, and 2 of them both. */
export function smallEitherCase(): TeachCase {
  const { all, red, big, both, added, either } = SMALL;
  return {
    label: `Say ${all} cards: ${red} are red, ${big} are big, and ${both} are both. ${red} and ${big} make ${added}, but the ${both} red and big cards were counted twice.`,
    truths: [{ who: `Red or big: ${either}`, value: true }, { who: `Red or big: ${added}`, value: false }],
    note: `Take them away once: ${either} cards are red or big, or both.`,
  };
}

/** “Explain more simply” for both, worked out from the small case. */
function smallBothSteps(): string[] {
  const { all, red, k, m, both, big, added } = SMALL;
  return [
    `Say ${all} cards: ${red} are red. ${k} in every ${m} cards is big, red or not, so ${big} are big.`,
    `Of the ${red} red cards, ${k} in every ${m} is big. That is ${both}.`,
    `So ${both} cards are red and big. Adding ${red} and ${big} gives ${added}, more than the ${red} red cards.`,
  ];
}

/** “Explain more simply” for either, worked out from the small case. */
function smallEitherSteps(): string[] {
  const { all, red, big, both, added, either } = SMALL;
  return [
    `Say ${all} cards: ${red} are red, ${big} are big, and ${both} are both.`,
    `${red} and ${big} make ${added}. But the ${both} red and big cards were counted twice.`,
    `Take them away once: ${either} cards are red or big, or both.`,
  ];
}

/** Each row of a pair picture with the same part of it, and the second thing’s column. */
function pairRowCases(p: PairPic): TeachCase[] {
  const t = p.topic, c = p.cells;
  const part = `${cap(shareWords(p))} of them ${partVerb(p)}`;
  return [
    { label: `The “${t.a.yes}” row: ${rowTotal(c, 0)} ${t.nouns}. ${part}: ${c[0][0]}.`, note: `${groupsLine(rowTotal(c, 0), p)}` },
    { label: `The “${t.a.no}” row: ${rowTotal(c, 1)} ${t.nouns}. ${part}: ${c[1][0]}.`, note: 'The same part as in the first row, because the two things do not affect each other.' },
    { label: `The “${t.b.yes}” column: ${c[0][0]} and ${c[1][0]} make ${colTotal(c, 0)}.` },
  ];
}

/** The story of a pair picture told by its rows: how many have the first thing, and the part with the second. */
function pairStory(p: PairPic): string {
  const t = p.topic;
  return `${t.setting} ${rowTotal(p.cells, 0)} of them ${t.a.are}. ${t.apart} ${cap(pairShareSay(p))}, ${t.orNot}.`;
}

/**
 * Two things that do not affect each other: how many have both? One box, found from the first row and the part with
 * the second thing. The picture shows only each row’s count, its boxes blank to fill. (The trap: adding. Tag add-both.)
 */
export function bothItem(rng: Rng, o: CountOptions & { pic?: PairPic }): CountMade {
  const pic = o.pic ?? makePairPic(rng, pickTopic(rng, PAIR_TOPICS, o.skin, o.avoid));
  const t = pic.topic, n = pairCounts(pic);
  const share = shareWords(pic);
  const box = `That is one box, where the “${t.a.yes}” row meets the “${t.b.yes}” column.`;
  const example: TeachCase = { label: `The “${t.a.yes}” row: ${n.a} ${t.nouns}. ${cap(share)} of them ${partVerb(pic)}: ${n.both}.`, note: `So ${n.both} ${t.nouns} ${andSay(t)}.` };
  const fb: Record<string, ChoiceFeedback> = {
    added: {
      headline: 'Your answer adds the two counts, but both means the two things at once.',
      detail: [`${n.a} ${t.nouns} ${t.a.are}, and ${n.b} ${t.b.are}. Added, they make ${n.added}. That is more than all ${n.a} that ${t.a.are}.`, `Both is one box. ${ofTheRow(pic)}`],
      example,
    },
    either: {
      headline: `Your answer counts the ${t.nouns} that ${orSay(t)}, but the question asks for both at once.`,
      detail: [`${n.a} and ${n.b} make ${n.added}. Take away the ${n.both} counted twice: ${n.either}. That is the count for or.`, `Both is only the ${n.both} that ${andSay(t)}.`],
      example,
    },
    b: {
      headline: `Your answer counts every ${t.noun} that ${t.b.is}, not only the ones that ${t.a.are}.`,
      detail: [`${cap(share)} of all 100 ${t.nouns} ${partVerb(pic)}: ${n.b}.`, `But both counts only the ${n.a} that ${t.a.are}. ${ofTheRow(pic)}`],
      example,
    },
    aOnly: {
      headline: `Your answer is the other part of the “${t.a.yes}” row: the ones in the “${t.b.no}” column.`,
      detail: [ofTheRow(pic), `The other ${n.aOnly} of the ${n.a} sit in the “${t.b.no}” column.`],
      example,
    },
    groups: {
      headline: 'Your answer counts the groups, not the ones taken from them.',
      detail: [`Split the ${n.a} into groups of ${pic.m}: ${n.a / pic.m} groups.`, `Then take ${pic.k} from each group: ${n.both}.`],
      example,
    },
  };
  // The fifth choice: when more than 1 is taken from each group, the number of groups (a step left out, smaller than
  // the answer); else the other part of the first row. So the right count is not always the smallest choice.
  const fifth: Choice = pic.k > 1 ? { id: 'groups', label: String(n.a / pic.m) } : { id: 'aOnly', label: String(n.aOnly) };
  const choices: Choice[] = [
    { id: 'both', label: String(n.both) },
    { id: 'added', label: String(n.added) },
    { id: 'either', label: String(n.either) },
    { id: 'b', label: String(n.b) },
    fifth,
  ];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== 'both') feedback[ch.id] = fb[ch.id];
  return done(
    'both',
    {
      kind: 'choose',
      prompt: `${pairStory(pic)} How many ${t.nouns} ${andSay(t)}?`,
      scene: pairScene(pic, { show: 'rows' }),
      choices: rng.shuffle(choices),
      answer: 'both',
      explain: `${ofTheRow(pic)} ${groupsLine(n.a, pic)} ${box}`,
      feedback,
      hint: 'Start with one group. Then take the part of it that has the other thing. Here is a smaller case, checked for you.',
      hintCase: smallBothCase(),
      teach: {
        rule: 'When two things do not affect each other, find both in two steps. Start with the ones that have the first thing. Then take the part of them that has the second.',
        terms: [PAIR_TERMS.both, PAIR_TERMS.apart],
        meaning: `The question asks for the ${t.nouns} that ${andSay(t)}, both at once. ${box}`,
        casesTitle: 'Each row, and the same part of it',
        cases: pairRowCases(pic),
        remember: ['Both is one box. It is never more than the count for one thing alone.', 'Ask: “Of these, how many also have the other thing?”'],
        simpler: smallBothSteps(),
      },
      tags: [ADD_BOTH.tag],
      conflict: true,
    },
    { t: 'both', pic },
  );
}

/** How an either item shows its picture: every box, or only each row’s count (find both first). */
export type EitherForm = 'picture' | 'rows';
export const EITHER_FORMS: readonly EitherForm[] = ['picture', 'rows'];

/**
 * How many have one thing, the other, or both? The row and the column added, with the overlap taken away once: the
 * three boxes with one thing or both. 'picture' shows every box; 'rows' shows only each row’s count, so both is found
 * first. (The trap: adding counts the overlap twice. Tag overlap.)
 */
export function eitherItem(rng: Rng, o: CountOptions & { pic?: PairPic; form?: EitherForm }): CountMade {
  const pic = o.pic ?? makePairPic(rng, pickTopic(rng, PAIR_TOPICS, o.skin, o.avoid));
  const form = o.form ?? rng.pick(EITHER_FORMS);
  const t = pic.topic, c = pic.cells, n = pairCounts(pic);
  const share = shareWords(pic);
  const steps = form === 'rows' ? [`${cap(share)} of all 100 ${t.nouns} ${partVerb(pic)}: ${n.b}.`, ofTheRow(pic)] : [];
  const rowCol = `The “${t.a.yes}” row has ${n.a}, and the “${t.b.yes}” column has ${n.b}.`;
  const twice = `The ${n.both} that ${andSay(t)} sit in both, so adding counts them twice.`;
  const takeAway = `${n.a} and ${n.b} make ${n.added}. Take away the ${n.both} once: ${n.either}.`;
  const overlapCase: TeachCase = { label: `The overlap: the box where the “${t.a.yes}” row meets the “${t.b.yes}” column. It holds ${n.both}.`, note: 'It is part of the row and part of the column, so count it once.' };
  const boxesCase: TeachCase = { label: `The boxes for or: ${c[0][0]} with both, ${c[0][1]} only in the “${t.a.yes}” row, and ${c[1][0]} only in the “${t.b.yes}” column.`, note: `Together they make ${n.either}.` };
  const fb: Record<string, ChoiceFeedback> = {
    added: { headline: 'Your answer adds the row and the column, but that counts the overlap twice.', detail: [...steps, rowCol, twice, takeAway], example: overlapCase },
    one: {
      headline: `Your answer leaves out the ${t.nouns} that ${andSay(t)}, but or counts them too.`,
      detail: ['In this game, or means one thing, the other, or both.', `${n.one} counts only the ones with just one of the two things. Add the ${n.both} with both: ${n.either}.`],
      example: boxesCase,
    },
    both: { headline: `Your answer counts only the ${t.nouns} that ${andSay(t)}, but or counts more.`, detail: [`Or counts the whole “${t.a.yes}” row and the whole “${t.b.yes}” column: ${n.a} and ${n.b}.`, `Take away the ${n.both} counted twice: ${n.either}.`], example: boxesCase },
    neither: { headline: `Your answer counts the ones with neither thing: the box outside the “${t.a.yes}” row and the “${t.b.yes}” column.`, detail: [`Those ${n.neither} sit in the last box.`, `Or counts the other three boxes: ${n.either}.`], example: boxesCase },
  };
  const choices: Choice[] = [
    { id: 'either', label: String(n.either) },
    { id: 'added', label: String(n.added) },
    { id: 'one', label: String(n.one) },
    { id: 'both', label: String(n.both) },
    { id: 'neither', label: String(n.neither) },
  ];
  return done(
    'either',
    {
      kind: 'choose',
      prompt: `${form === 'rows' ? pairStory(pic) : `${t.setting} The count picture splits them two ways.`} How many ${t.nouns} ${orSay(t)}, or both?`,
      scene: pairScene(pic, { show: form === 'rows' ? 'rows' : 'all' }),
      choices: rng.shuffle(choices),
      answer: 'either',
      explain: [...steps, rowCol, twice, takeAway, ...(form === 'picture' ? [`Or count the boxes: ${c[0][0]}, ${c[0][1]} and ${c[1][0]} make ${n.either}.`] : [])].join(' '),
      feedback: fb,
      hint: 'Add the row and the column. Then ask: did I count any of them twice? Here is a smaller case, checked for you.',
      hintCase: smallEitherCase(),
      teach: {
        rule: 'For or, add the row and the column. Then take away the overlap once, because adding counted it twice.',
        terms: [PAIR_TERMS.either, PAIR_TERMS.overlap],
        meaning: `The question asks for the ${t.nouns} that ${orSay(t)}, or both. In this game, or means one thing, the other, or both.`,
        casesTitle: 'The row, the column and the overlap',
        cases: [{ label: `The “${t.a.yes}” row: ${n.a} ${t.nouns}.` }, { label: `The “${t.b.yes}” column: ${n.b} ${t.nouns}.` }, overlapCase, boxesCase],
        remember: ['Or is a row and a column, with the overlap counted once.', 'Ask: “Did I count any of them twice?”'],
        simpler: smallEitherSteps(),
      },
      tags: [OVERLAP.tag],
      conflict: true,
    },
    { t: 'either', pic, form },
  );
}

// ---------- the closing why item: pick the reason ----------

export type WhyKind = 'due' | 'common' | 'alarm' | 'weak';
export const WHY_KINDS: readonly WhyKind[] = ['due', 'common', 'alarm', 'weak'];
/** The lesson each why kind asks about. */
export const WHY_LESSON: Record<WhyKind, string> = { due: 's13.l2', common: 's13.l3', alarm: 's13.l4', weak: 's13.l4' };

/** Why is a fair coin’s other side not due after a streak? Each try is new. */
function whyDue(rng: Rng): CountMade {
  const dev = rng.pick(DEVICES);
  const k = rng.int(4, 7);
  const sideIx = rng.int(0, 1);
  const side = dev.sides[sideIx], oth = dev.sides[1 - sideIx];
  const { same, other } = nextAfterStreak(k);
  if (same !== other) throw new Error('whyDue: a fair try splits evenly');
  const counted = `Of all the ways ${k + 1} ${dev.verb}s can go that start with ${k} ${side}, ${same} ends ${side} and ${other} ends ${oth}.`;
  const example: TeachCase = { label: counted, truths: [{ who: `${cap(oth)} is more likely next`, value: other > same }, { who: `${cap(side)} is more likely next`, value: same > other }] };
  const feedback: Record<string, ChoiceFeedback> = {
    streak: { headline: `Your reason says ${side} is more likely, but a streak does not change a fair ${dev.noun} either way.`, detail: [counted, `So ${side} is not more likely, and neither is ${oth}.`], example },
    soon: { headline: `Your reason says ${oth} will be due soon, but nothing is ever due on a fair ${dev.noun}.`, detail: [`“Due” means more likely because it has not come up for a while.`, counted, `This stays true after any streak, long or short.`], example },
    unfair: { headline: `Your reason says the ${dev.noun} is not fair, but the story says it is fair.`, detail: [`A fair ${dev.noun} gives each side the same chance every time.`, `A fair ${dev.noun} can ${dev.lands(side).replace(/s /, ' ')} ${k} times in a row. Streaks like that happen.`], example },
  };
  const choices: Choice[] = [
    { id: 'new', label: `Each ${dev.verb} is new. The ${dev.noun} does not remember what came before.` },
    { id: 'streak', label: `${cap(side)} is on a streak, so ${side} is more likely now.` },
    { id: 'soon', label: `${cap(oth)} will be due after a few more ${dev.verb}s.` },
    { id: 'unfair', label: `The ${dev.noun} must be unfair, so it only ${dev.lands(side)}.` },
  ];
  return done(
    'why',
    {
      kind: 'choose',
      prompt: `${dev.name} ${dev.lands(side)} ${k} times in a row. ${cap(oth)} is still not more likely on the next ${dev.verb}. Why not?`,
      scene: { kind: 'text', lines: [`${dev.name}.`, `So far: ${Array.from({ length: k }, () => side).join(', ')}`] },
      choices: rng.shuffle(choices),
      answer: 'new',
      explain: `A fair ${dev.noun} has no memory. ${counted} So each ${dev.verb} is new, and nothing is due.`,
      feedback,
      hint: `Ask: does the ${dev.noun} know what came before? Here is a smaller case, checked for you.`,
      hintCase: { label: `Two ${dev.verb}s that start with ${side}: ${side}, ${side}; and ${side}, ${oth}.`, truths: [{ who: `${cap(oth)} is more likely second`, value: false }], note: `1 ends ${side}, and 1 ends ${oth}.` },
      teach: {
        rule: `Each ${dev.verb} of a fair ${dev.noun} is new. Grown-ups call this independent.`,
        terms: [{ word: 'Independent', meaning: 'each try is new. What came before does not change it.' }, { word: 'Due', meaning: 'more likely because it has not come up for a while. A fair try is never due.' }],
        casesTitle: 'Every way the tries can go',
        cases: [example],
        remember: ['A fair try has no memory.', `Ask: “Did anything change the ${dev.noun}?”`],
        simpler: [`${cap(dev.verb)} twice. Of the 2 ways that start with ${side}, 1 ends ${side} and 1 ends ${oth}.`, `So after ${side}, ${oth} is not more likely.`],
      },
      tags: [WHY_TAG],
      conflict: true,
    },
    { t: 'why', kind: 'due', coin: { device: dev.id, k, side, other: oth } },
  );
}

/** Why is a thing with the clue more likely in the common group? There are more of them with the clue. */
function whyCommon(rng: Rng, o: CountOptions): CountMade {
  const pic = makeGroupPic(rng, pickTopic(rng, GROUP_TOPICS, o.skin, o.avoid), 'common');
  const t = pic.topic, c = pic.cells;
  const [aYes, bYes] = [c[0][0], c[1][0]];
  const aT = rowTotal(c, 0), bT = rowTotal(c, 1), yes = colTotal(c, 0);
  if (!(bYes > aYes && aYes * bT > bYes * aT)) throw new Error('whyCommon: the common group must win');
  const column = `The “${t.clue.yes}” column has ${plural(aYes, t.a.one, t.a.many)} and ${plural(bYes, t.b.one, t.b.many)}.`;
  const example: TeachCase = { label: column, truths: [{ who: `More are ${t.b.are}`, value: bYes > aYes }] };
  const feedback: Record<string, ChoiceFeedback> = {
    share: {
      headline: `Your reason says the clue is more common among the ${t.b.many}, but it is the other way.`,
      detail: [`${cap(shareOf(t, t.a, aYes, aT))}. ${cap(shareOf(t, t.b, bYes, bT))}.`, `The ${t.b.many} win only because there are so many of them.`],
      example,
    },
    none: { headline: `Your reason says no ${t.a.one} ${t.clue.is}, but ${withClue(t, t.a, aYes)}.`, detail: [column, `So it could be ${withA(t.a.one)}. It is just less likely.`], example },
    most: { headline: `Your reason says most ${t.clue.with} are ${t.a.are}, but most of them are ${t.b.are}.`, detail: [`Of the ${yes} ${t.clue.with}, ${aYes} are ${t.a.are} and ${bYes} are ${t.b.are}.`], example },
  };
  const choices: Choice[] = [
    { id: 'count', label: `${cap(withClue(t, t.b, bYes))}, and only ${withClue(t, t.a, aYes)}.` },
    { id: 'share', label: `${cap(t.clue.common[1])} ${t.clue.common[0].toLowerCase()} more common among ${t.b.many} than among ${t.a.many}.` },
    { id: 'none', label: `No ${t.a.one} ${t.clue.is}.` },
    { id: 'most', label: `Most ${t.clue.with} are ${t.a.are}.` },
  ];
  return done(
    'why',
    {
      kind: 'choose',
      prompt: `${t.setting} You see ${t.clue.see}. Most ${t.a.many} ${t.clue.are}, but it is still more likely ${withA(t.b.one)}. Why?`,
      scene: groupScene(pic),
      choices: rng.shuffle(choices),
      answer: 'count',
      explain: `${cap(t.b.many)} are so common that more of them ${t.clue.are}: ${bYes}, next to ${aYes} ${t.a.many}.`,
      feedback,
      hint: 'Look at the column for the clue. Here is the other column, checked for you.',
      hintCase: { label: `The “${t.clue.no}” column: ${plural(c[0][1], t.a.one, t.a.many)} and ${plural(c[1][1], t.b.one, t.b.many)}.`, note: `That column counts the ${t.nouns} that ${t.clue.areNot}.` },
      teach: {
        rule: 'A common group can win, even when the clue is rare in it. Count the clue’s column.',
        terms: GROUP_TERMS,
        casesTitle: 'Each group, and the clue’s column',
        cases: [
          { label: `${cap(t.a.many)}: ${aT} of the 100. ${cap(shareOf(t, t.a, aYes, aT))}.` },
          { label: `${cap(t.b.many)}: ${bT} of the 100. ${cap(shareOf(t, t.b, bYes, bT))}.` },
          example,
        ],
        remember: ['Start with how common each group is.', 'Ask: “Of all the ones with this clue, which group has more?”'],
        simpler: ['Say 2 kids wear red caps and 20 kids wear blue caps.', 'Both red cap kids like soccer, and 6 blue cap kids do.', 'A kid likes soccer. A blue cap is more likely: 6 is more than 2.'],
      },
      tags: [WHY_TAG],
      conflict: true,
    },
    { t: 'why', kind: 'common', group: pic },
  );
}

/** Why is a yes from a test for a rare thing most likely a false alarm? Most of its yes answers are false alarms. */
function whyAlarm(rng: Rng, o: CountOptions): CountMade {
  const pic = makeTestPic(rng, pickTopic(rng, TEST_TOPICS, o.skin, o.avoid), 'rare');
  const t = pic.topic, c = pic.cells;
  const [hit, alarm] = [c[0][0], c[1][0]];
  const H = rowTotal(c, 0), Y = colTotal(c, 0), R = rightFor(c);
  if (!(alarm > hit && 2 * R > TOTAL && 2 * hit >= H)) throw new Error('whyAlarm: a good test with more false alarms');
  const column = `Of the ${Y} ${t.test.flags}, ${alarm} are false alarms and ${hit} are right.`;
  const example: TeachCase = { label: column, truths: [{ who: 'Most of them are right', value: hit > alarm }] };
  const feedback: Record<string, ChoiceFeedback> = {
    wrong: { headline: `Your reason says ${t.test.name} is wrong for most, but it is right for ${R} of the 100.`, detail: [column, `The test is good. The thing is just rare: ${H} of the 100.`], example },
    misses: { headline: `Your reason says ${t.test.name} misses most ${t.has.many}, but it catches ${c[0][0] === H ? `all ${H}` : `${hit} of the ${H}`}.`, detail: [column], example },
    never: { headline: `Your reason says a test like this is never right, but ${hit} of its ${t.test.flags} are right.`, detail: [column, `It is right for ${R} of the 100.`], example },
  };
  const choices: Choice[] = [
    { id: 'alarms', label: `Of the ${Y} ${t.test.flags}, ${alarm} are false alarms and only ${hit} are right.` },
    { id: 'wrong', label: `${cap(t.test.name)} is wrong for most of the 100 ${t.nouns}.` },
    { id: 'misses', label: `${cap(t.test.name)} misses most of the ${t.has.many}.` },
    { id: 'never', label: `A test like this is never right.` },
  ];
  return done(
    'why',
    {
      kind: 'choose',
      prompt: `${testStory(pic)} ${t.event} But most likely, ${lowerFirst(t.notOne)} Why?`,
      scene: testScene(pic),
      choices: rng.shuffle(choices),
      answer: 'alarms',
      explain: `${column} ${cap(t.has.many)} are rare, so the many ${t.not.many} make more ${t.test.flags}.`,
      feedback,
      hint: `Count only the ${t.test.flags}. Here is a row, checked for you.`,
      hintCase: testCases(pic)[0],
      teach: {
        rule: 'When the thing is rare, even a good test can give more false alarms than right yes answers.',
        terms: TEST_TERMS,
        casesTitle: 'The rows and the yes column',
        cases: testCases(pic),
        remember: ['A test can be right for most and still give more false alarms than right yes answers.', '“How often would it say yes if the answer were no?”'],
        simpler: ['Say 10 kids get the eye check. 1 kid needs glasses.', 'The check flags that kid, and 2 kids who see fine.', 'So it flags 3 kids, and only 1 of them needs glasses.'],
      },
      tags: [WHY_TAG],
      conflict: true,
    },
    { t: 'why', kind: 'alarm', test: pic },
  );
}

/** Why does a clue seen often either way prove little? You would see it often even if you were wrong. */
function whyWeak(rng: Rng, o: CountOptions): CountMade {
  const pic = makeCluePic(rng, pickTopic(rng, CLUE_TOPICS, o.skin, o.avoid), { conflict: true });
  const best = strongerClue(pic);
  if (best === 'same') throw new Error('whyWeak: one clue must tell more');
  const si = best, wi: ClueIx = best === 0 ? 1 : 0;
  const t = pic.topic, W = t.clues[wi], S = t.clues[si];
  const [aW, bW] = pic.counts[wi];
  const [aS, bS] = pic.counts[si];
  if (!(2 * bW >= 10 && 2 * aW > 10)) throw new Error('whyWeak: a weak clue seen often either way');
  const example = clueCase(pic, wi);
  const feedback: Record<string, ChoiceFeedback> = {
    rare: { headline: `Your reason says you hardly ever see it when ${t.guess}, but you see it ${aW} of 10 times.`, detail: [W.say(aW, true), `The trouble is the other count. ${W.say(bW, false)}`], example },
    never: { headline: `Your reason says no clue can tell you anything, but ${lowerFirst(S.name)} tells you a lot.`, detail: [`${S.say(aS, true)} ${S.say(bS, false)}`, 'You would rarely see that one if you were wrong.'], example: clueCase(pic, si) },
    strong: { headline: `Your reason calls ${lowerFirst(S.name)} weak, but you would rarely see it if you were wrong.`, detail: [`${S.say(aS, true)} ${S.say(bS, false)}`, `The weak clue is ${lowerFirst(W.name)}. ${W.say(bW, false)}`], example },
  };
  const choices: Choice[] = [
    { id: 'often', label: `You would see it often anyway. ${W.say(bW, false)}` },
    { id: 'rare', label: `You hardly ever see it when ${t.guess}.` },
    { id: 'never', label: 'No clue can ever tell you anything.' },
    { id: 'strong', label: `${S.name} is a weak clue too.` },
  ];
  return done(
    'why',
    {
      kind: 'choose',
      prompt: `${t.question} ${t.who} sees that ${W.seen}, so ${t.who} says yes. That clue tells little. Why?`,
      scene: clueScene(pic),
      choices: rng.shuffle(choices),
      answer: 'often',
      explain: `${W.say(aW, true)} But ${lowerFirst(W.say(bW, false))} You would see it often even if the answer were no.`,
      feedback,
      hint: 'Ask: how often would I see this clue if I were wrong? Here is one clue, checked for you.',
      hintCase: clueCase(pic, si),
      teach: {
        rule: 'A clue you would see often either way tells you little. Ask how often you would see it if you were wrong.',
        terms: CLUE_TERMS,
        casesTitle: 'Each clue, when you are right and when you are wrong',
        cases: pic.order.map((i) => clueCase(pic, i)),
        remember: ['Ask: “How often would I see it if I were wrong?”'],
        simpler: ['A dog barks at the mail carrier. It also barks at birds, cars and leaves.', 'So a bark does not tell you much about the mail.'],
      },
      tags: [WHY_TAG],
      conflict: true,
    },
    { t: 'why', kind: 'weak', clue: pic },
  );
}

/** The closing why item: a reason-picking question on one of the stop’s big ideas. */
export function whyItem(rng: Rng, o: Partial<CountOptions> & { kind?: WhyKind } = {}): CountMade {
  const kind = o.kind ?? rng.pick(WHY_KINDS);
  const skin = o.skin ?? rng.pick(COUNT_SKINS);
  switch (kind) {
    case 'due': return whyDue(rng);
    case 'common': return whyCommon(rng, { skin, avoid: o.avoid });
    case 'alarm': return whyAlarm(rng, { skin, avoid: o.avoid });
    case 'weak': return whyWeak(rng, { skin, avoid: o.avoid });
  }
}

