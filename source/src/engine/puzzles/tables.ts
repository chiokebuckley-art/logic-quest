/**
 * Stop 9 (shown as Stop 10) · Truth Tables.
 *
 * The model: a sentence (Sen) is built from parts named by letters (A, B, C; P and Q for an IF sentence; for cards,
 * the card words of Stop 2, such as red and big) with NOT, AND, OR and IF … THEN. A row is one case: a true or false
 * value for each part. rowsFor(n) lists every case of n parts in the usual order (two parts: Stop 6's four boxes,
 * conditionals.ts ROWS; each new part doubles the rows, True in the top half and False in the bottom half), and holds()
 * works out a sentence in one row. IF … THEN goes through conditionals.ts condHolds: false only when the IF part is
 * true and the THEN part is false. A column is a sentence's value in every row. Two sentences mean the same when their
 * columns match in every row. A card rule (rules.ts) is the same check over the 18 cards, so card questions are
 * answered with rules.ts sameMeaning and differences, and the table must agree. A sentence is always true when its
 * column is all True and never true when it is all False.
 *
 * Question kinds (skill tags): rows (how many rows, which case is missing, a table with a row twice), fill (a column
 * or one box for NOT, AND, OR), if-table (the IF column, one row, the row that breaks it), same (do two sentences mean
 * the same, which one does, where two differ, card rules) and always (always, sometimes or never true). The closing
 * why items and the warm-up (a Stop 2 NOT (A AND B) card) are here too. Every answer, explanation, wrong-choice
 * feedback and hint case is worked out from the table, never written by hand. The boards are in tableBoards.ts.
 */
import { ROWS, RULE, condHolds } from './conditionals';
import { ALL_CARDS, FEATURE_PAIRS, and as cardAnd, cardId, cardName, differences, evaluate, featureText, is as cardIs, not as cardNot, or as cardOr, render as cardRender, sameMeaning as sameOnCards, type Card, type Feature, type Formula } from './rules';
import type { ItemCore, Made } from './statements';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, Rng, Scene, Teach, TeachCase, Thing, Truth } from '../types';

export type { Made };

// ---------- the model ----------

export type Sen = { op: 'atom'; i: number } | { op: 'not'; a: Sen } | { op: 'and' | 'or' | 'if'; a: Sen; b: Sen };

export const atom = (i: number): Sen => ({ op: 'atom', i });
export const A = atom(0);
export const B = atom(1);
export const C = atom(2);
export const NOT = (a: Sen): Sen => ({ op: 'not', a });
export const AND = (a: Sen, b: Sen): Sen => ({ op: 'and', a, b });
export const OR = (a: Sen, b: Sen): Sen => ({ op: 'or', a, b });
export const IF = (a: Sen, b: Sen): Sen => ({ op: 'if', a, b });

/** One case: a value for each part, in order (A, B, C). */
export type Row = readonly boolean[];

/**
 * Every case of n parts, in the usual order. Two parts: the rows of Stop 6's four boxes (conditionals.ts ROWS). Each new
 * part doubles the rows: the first part is True in the top half and False in the bottom half, and each half repeats
 * the smaller table.
 */
export function rowsFor(n: number): Row[] {
  if (n < 1 || n > 4) throw new Error(`rowsFor: ${n} parts`);
  if (n === 1) return [[true], [false]];
  if (n === 2) return ROWS.map((r) => [r.p, r.q]);
  const smaller = rowsFor(n - 1);
  return [true, false].flatMap((v) => smaller.map((r) => [v, ...r]));
}

/** A sentence in one row. IF … THEN is the if–then rule of Stop 6: broken only when the IF part is true and the THEN part false. */
export function holds(s: Sen, r: Row): boolean {
  switch (s.op) {
    case 'atom':
      return r[s.i];
    case 'not':
      return !holds(s.a, r);
    case 'and':
      return holds(s.a, r) && holds(s.b, r);
    case 'or':
      return holds(s.a, r) || holds(s.b, r);
    case 'if':
      return condHolds(RULE, { p: holds(s.a, r), q: holds(s.b, r) });
  }
}

/** How many parts a sentence needs (its highest letter). */
export const partsIn = (s: Sen): number => (s.op === 'atom' ? s.i + 1 : s.op === 'not' ? partsIn(s.a) : Math.max(partsIn(s.a), partsIn(s.b)));
export const column = (s: Sen, n: number): boolean[] => rowsFor(n).map((r) => holds(s, r));
export const sameColumn = (s: Sen, t: Sen, n: number): boolean => rowsFor(n).every((r) => holds(s, r) === holds(t, r));
/** The rows (0-based) where two sentences differ. */
export const differRows = (s: Sen, t: Sen, n: number): number[] => rowsFor(n).flatMap((r, k) => (holds(s, r) !== holds(t, r) ? [k] : []));
export const sameRow = (x: Row, y: Row): boolean => x.length === y.length && x.every((v, i) => v === y[i]);

export type Kind = 'always' | 'sometimes' | 'never';
/** Always true (True in every row), never true (False in every row), or sometimes true. */
export function kindOf(s: Sen, n = partsIn(s)): Kind {
  const c = column(s, n);
  return c.every(Boolean) ? 'always' : c.some(Boolean) ? 'sometimes' : 'never';
}

// ---------- misreadings (the wrong columns a learner may fill) ----------

/**
 * How a learner may misread a sentence:
 *  xor            OR read as “one but not both”
 *  or-as-and      OR read as AND
 *  and-as-or      AND read as OR
 *  drop-not       every NOT left out
 *  not-each       NOT (X AND Y) read as NOT X AND NOT Y (the NOT put on each part, the joining word kept)
 *  if-as-and      IF read as AND: false whenever the IF part is false
 *  if-both        IF read both ways: true only when the two parts match
 *  if-flip        IF P, THEN Q read as IF Q, THEN P
 *  if-copies-then the IF column copied from the THEN part
 */
export type Misread = 'xor' | 'or-as-and' | 'and-as-or' | 'drop-not' | 'not-each' | 'if-as-and' | 'if-both' | 'if-flip' | 'if-copies-then';
export const MISREADS: readonly Misread[] = ['xor', 'or-as-and', 'and-as-or', 'drop-not', 'not-each', 'if-as-and', 'if-both', 'if-flip', 'if-copies-then'];

export function holdsAs(s: Sen, r: Row, m: Misread): boolean {
  const h = (x: Sen) => holdsAs(x, r, m);
  switch (s.op) {
    case 'atom':
      return r[s.i];
    case 'not':
      if (m === 'drop-not') return h(s.a);
      if (m === 'not-each' && (s.a.op === 'and' || s.a.op === 'or')) {
        const x = !h(s.a.a), y = !h(s.a.b);
        return s.a.op === 'and' ? x && y : x || y;
      }
      return !h(s.a);
    case 'and':
      return m === 'and-as-or' ? h(s.a) || h(s.b) : h(s.a) && h(s.b);
    case 'or': {
      const x = h(s.a), y = h(s.b);
      return m === 'xor' ? x !== y : m === 'or-as-and' ? x && y : x || y;
    }
    case 'if': {
      const p = h(s.a), q = h(s.b);
      if (m === 'if-as-and') return p && q;
      if (m === 'if-both') return p === q;
      if (m === 'if-flip') return condHolds(RULE, { p: q, q: p });
      if (m === 'if-copies-then') return q;
      return condHolds(RULE, { p, q });
    }
  }
}
export const columnAs = (s: Sen, n: number, m: Misread): boolean[] => rowsFor(n).map((r) => holdsAs(s, r, m));

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** “True” / “False”, as a table box shows it. */
export const TF = (v: boolean) => (v ? 'True' : 'False');
/** “true” / “false”, inside a sentence. */
export const tf = (v: boolean) => (v ? 'true' : 'false');
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
/** “A, B and C”. */
export const listAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** “row 2”, “rows 2 and 3”, “rows 1, 3 and 4” (1-based). */
export const rowsWord = (ks: readonly number[]) => `${plural(ks.length, 'row')} ${listAnd(ks.map((k) => String(k + 1)))}`;

/**
 * A sentence in words: “A AND B”, “NOT (A AND B)”, “NOT A OR NOT B”, “IF A, THEN B”, “(A OR B) AND C”. NOT covers only
 * the part right after it; brackets show where a NOT or a joining word covers more.
 */
export function say(s: Sen, names: readonly string[]): string {
  switch (s.op) {
    case 'atom':
      return names[s.i];
    case 'not':
      return s.a.op === 'atom' ? `NOT ${names[s.a.i]}` : `NOT (${say(s.a, names)})`;
    case 'and':
    case 'or': {
      const part = (g: Sen) => ((g.op === 'and' || g.op === 'or' || g.op === 'if') && g.op !== s.op ? `(${say(g, names)})` : say(g, names));
      return `${part(s.a)} ${s.op === 'and' ? 'AND' : 'OR'} ${part(s.b)}`;
    }
    case 'if': {
      const part = (g: Sen) => (g.op === 'if' ? `(${say(g, names)})` : say(g, names));
      return `IF ${part(s.a)}, THEN ${part(s.b)}`;
    }
  }
}

/** A sentence named inside running words: “A AND B” in curly quotes, so it never runs into the words around it. A single part stays bare. */
export const quote = (s: Sen, names: readonly string[], end = '') => (s.op === 'atom' ? `${names[s.i]}${end}` : `“${say(s, names)}${end}”`);

/** A fixed id for a sentence, from its words: “NOT (A AND B)” -> “not-[a-and-b]”. Never a position. */
export const senId = (s: Sen, names: readonly string[]) =>
  say(s, names).toLowerCase().replace(/,/g, '').replace(/\(/g, '[').replace(/\)/g, ']').replace(/\s+/g, '-');

// ---------- topics: what the letters stand for ----------

/** abstract letters, an everyday story, a fantasy story, or the shape cards of Stop 2. */
export type Skin = 'letters' | 'everyday' | 'fantasy' | 'cards';
export const STORY_SKINS: readonly Skin[] = ['everyday', 'fantasy'];

/** One part: what it says when it is true and when it is false (no capital unless a name starts it, no period). */
export interface Part {
  yes: string;
  no: string;
}

export interface Topic {
  id: string;
  skin: Skin;
  parts: Part[];
  /** Cards: the two card words the parts are about (rules.ts features). */
  feats?: Feature[];
}

const topic = (id: string, skin: Skin, ...parts: [string, string][]): Topic => ({ id, skin, parts: parts.map(([yes, no]) => ({ yes, no })) });

/**
 * Story topics. Each has three parts, and its first two make a sensible rule “IF A, THEN B”, so the same topic serves
 * an IF table (the first part is the IF part).
 */
export const TOPICS: readonly Topic[] = [
  topic('rain', 'everyday', ['it rains', 'it does not rain'], ['Mia takes her coat', 'Mia does not take her coat'], ['the bus is late', 'the bus is on time']),
  topic('bell', 'everyday', ['the bell rings', 'the bell does not ring'], ['Leo lines up', 'Leo does not line up'], ['the sun is out', 'the sun is not out']),
  topic('mud', 'everyday', ['Rex is muddy', 'Rex is not muddy'], ['Rex gets a bath', 'Rex does not get a bath'], ['Rex is hungry', 'Rex is not hungry']),
  topic('soup', 'everyday', ['Ava has soup', 'Ava has no soup'], ['Ava has a spoon', 'Ava has no spoon'], ['Ava has milk', 'Ava has no milk']),
  topic('game', 'everyday', ['Zoe wins the game', 'Zoe does not win the game'], ['Zoe gets a sticker', 'Zoe does not get a sticker'], ['the game is long', 'the game is short']),
  topic('chores', 'everyday', ['Tom does his chores', 'Tom skips his chores'], ['Tom gets a snack', 'Tom does not get a snack'], ['it is Friday', 'it is not Friday']),
  topic('dragon', 'fantasy', ['the dragon sleeps', 'the dragon is awake'], ['the cave is quiet', 'the cave is noisy'], ['the moon is out', 'the moon is not out']),
  topic('wand', 'fantasy', ['Zed waves his wand', 'Zed does not wave his wand'], ['the lamp lights up', 'the lamp stays dark'], ['the cat wakes up', 'the cat stays asleep']),
  topic('potion', 'fantasy', ['Pip drinks the potion', 'Pip does not drink the potion'], ['Pip turns green', 'Pip does not turn green'], ['Pip can fly', 'Pip can’t fly']),
  topic('gate', 'fantasy', ['the troll hears the password', 'the troll does not hear the password'], ['the gate opens', 'the gate stays shut'], ['it is night', 'it is day']),
  topic('egg', 'fantasy', ['the egg is warm', 'the egg is cold'], ['the egg hatches', 'the egg does not hatch'], ['the nest is high', 'the nest is low']),
];

export const LETTERS: Topic = { id: 'letters', skin: 'letters', parts: [] };

/** A card topic: two card words of different kinds (red and big), as in Stop 2. Each row is one kind of card. */
export function cardTopic(f: Feature, g: Feature): Topic {
  const part = (x: Feature): Part => ({ yes: `the card is ${featureText(x)}`, no: `the card is not ${featureText(x)}` });
  return { id: `cards-${f.value}-${g.value}`, skin: 'cards', parts: [part(f), part(g)], feats: [f, g] };
}

/** A topic of this skin, not one already used in the set when another is left. */
export function pickTopic(rng: Rng, skin: Skin, avoid?: Set<string>): Topic {
  if (skin === 'letters') return LETTERS;
  if (skin === 'cards') {
    const [f, g] = rng.pick(FEATURE_PAIRS);
    return cardTopic(f, g);
  }
  const pool = TOPICS.filter((t) => t.skin === skin);
  const fresh = pool.filter((t) => !avoid?.has(t.id));
  const t = rng.pick(fresh.length ? fresh : pool);
  avoid?.add(t.id);
  return t;
}

export const ABC: readonly string[] = ['A', 'B', 'C', 'D'];
export const PQ: readonly string[] = ['P', 'Q'];
/** The names of a topic's parts: letters, or the card words (“red”, “big”). `pq`: P and Q, for an IF sentence. */
export const namesFor = (t: Topic, pq = false): string[] => (t.feats ? t.feats.map(featureText) : [...(pq ? PQ : ABC)]);

/** What the letters stand for, one line each: “A: It rains.” Letters and cards have none. */
export function keyLines(t: Topic, names: readonly string[], n: number): string[] {
  if (t.skin === 'letters' || t.skin === 'cards') return [];
  return t.parts.slice(0, n).map((p, i) => `${names[i]}: ${cap(p.yes)}.`);
}

/** A case in plain words: “A is true and B is false”, or for a card, “red and not big”. */
export function rowSentence(r: Row, names: readonly string[], t?: Topic): string {
  if (t?.feats) return r.map((v, i) => (v ? names[i] : `not ${names[i]}`)).join(' and ');
  return listAnd(r.map((v, i) => `${names[i]} is ${tf(v)}`));
}
/** A case, short: “A true, B false”, or “red, not big”. */
export function rowShort(r: Row, names: readonly string[], t?: Topic): string {
  if (t?.feats) return r.map((v, i) => (v ? names[i] : `not ${names[i]}`)).join(', ');
  return r.map((v, i) => `${names[i]} ${tf(v)}`).join(', ');
}
/** A case in the story's words: “it rains, and Mia does not take her coat” (no capital, no period). Letters: rowSentence. */
export function rowWords(r: Row, names: readonly string[], t: Topic): string {
  if (t.skin === 'letters') return rowSentence(r, names);
  const bits = r.map((v, i) => (v ? t.parts[i].yes : t.parts[i].no));
  return bits.length <= 2 ? bits.join(', and ') : `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}`;
}

// ---------- the table picture ----------

export type TableScene = Extract<Scene, { kind: 'table' }>;

export interface TableOpts {
  names: readonly string[];
  /** How many parts (the input columns). */
  n: number;
  /** The sentence columns, after the parts. */
  cols?: readonly Sen[];
  /** The rows, in order (default: every case, rowsFor(n)). */
  rows?: readonly Row[];
  topic?: Topic;
  /** A sentence box left blank, by row and sentence column (0-based). */
  blank?: (k: number, j: number) => boolean;
  /** A part box left blank, by row and part. */
  blankPart?: (k: number, i: number) => boolean;
  marked?: number[];
  markLabel?: string;
  caption?: string;
}

/** A truth table as a picture: the parts, then the sentences, one row for each case, True or False in each box. */
export function tableScene(o: TableOpts): TableScene {
  const rows = o.rows ?? rowsFor(o.n);
  const cols = o.cols ?? [];
  const key = o.topic ? keyLines(o.topic, o.names, o.n) : [];
  return {
    kind: 'table',
    heads: [...o.names.slice(0, o.n), ...cols.map((c) => say(c, o.names))],
    inputs: o.n,
    cells: rows.map((r, k) => [
      ...r.slice(0, o.n).map((v, i) => (o.blankPart?.(k, i) ? null : v)),
      ...cols.map((c, j) => (o.blank?.(k, j) ? null : holds(c, r))),
    ]),
    ...(key.length ? { key } : {}),
    ...(o.marked?.length ? { marked: [...o.marked] } : {}),
    ...(o.markLabel ? { markLabel: o.markLabel } : {}),
    ...(o.caption ? { caption: o.caption } : {}),
  };
}

// ---------- why a box is True or False ----------

/** Why one sentence has its value in one row, from its parts: one or two short sentences. */
export function reason(s: Sen, r: Row, names: readonly string[]): string {
  return cap(reasonRaw(s, r, names));
}

function reasonRaw(s: Sen, r: Row, names: readonly string[]): string {
  const w = (x: Sen) => quote(x, names);
  const v = (x: Sen) => tf(holds(x, r));
  switch (s.op) {
    case 'atom':
      return `${w(s)} is ${v(s)} in this row.`;
    case 'not':
      return s.a.op === 'atom' ? `${w(s.a)} is ${v(s.a)}, so ${w(s)} is ${v(s)}.` : `${w(s.a)} is ${v(s.a)} here. NOT flips it, so ${w(s)} is ${v(s)}.`;
    case 'and': {
      const x = holds(s.a, r), y = holds(s.b, r);
      if (x && y) return `${w(s.a)} is true and ${w(s.b)} is true. AND needs both, so ${w(s)} is true.`;
      if (!x && !y) return `${w(s.a)} is false and ${w(s.b)} is false. AND needs both, so ${w(s)} is false.`;
      return `${w(x ? s.b : s.a)} is false. AND needs both parts, so ${w(s)} is false.`;
    }
    case 'or': {
      const x = holds(s.a, r), y = holds(s.b, r);
      if (x && y) return `${w(s.a)} is true and ${w(s.b)} is true. OR includes both, so ${w(s)} is true.`;
      if (x || y) return `${w(x ? s.a : s.b)} is true. OR needs just one part, so ${w(s)} is true.`;
      return `${w(s.a)} is false and ${w(s.b)} is false. OR needs at least one, so ${w(s)} is false.`;
    }
    case 'if': {
      const p = holds(s.a, r), q = holds(s.b, r);
      if (!p) return `The IF part, ${quote(s.a, names, ',')} is false. Then the sentence asks for nothing, so nothing breaks it. ${w(s)} is true.`;
      if (q) return `The IF part, ${quote(s.a, names, ',')} is true, and the THEN part, ${quote(s.b, names, ',')} is true too. So ${w(s)} is true.`;
      return `The IF part, ${quote(s.a, names, ',')} is true, but the THEN part, ${quote(s.b, names, ',')} is false. That breaks it, so ${w(s)} is false.`;
    }
  }
}

/** The smaller sentences inside s that are not single parts, smallest first, then s itself (the helper columns). */
export function stepsOf(s: Sen): Sen[] {
  if (s.op === 'atom') return [];
  const inner = s.op === 'not' ? stepsOf(s.a) : [...stepsOf(s.a), ...stepsOf(s.b)];
  return [...inner, s];
}

/** Every step of one row, part by part: “A is true, so NOT A is false.” Then the whole sentence. */
export const chain = (s: Sen, r: Row, names: readonly string[]): string[] => stepsOf(s).map((x) => reason(x, r, names));

/** The worked case for one row: the parts, each helper column and the sentences, with a note that works out the last. */
export function rowCase(sens: readonly Sen[], r: Row, k: number, names: readonly string[], o: { topic?: Topic; note?: string } = {}): TeachCase {
  const helpers: Sen[] = [];
  for (const s of sens) for (const x of stepsOf(s).slice(0, -1)) if (!helpers.some((h) => say(h, names) === say(x, names)) && !sens.some((y) => say(y, names) === say(x, names))) helpers.push(x);
  const truths: Truth[] = [
    ...r.map((v, i) => ({ who: names[i], value: v })),
    ...helpers.map((x) => ({ who: say(x, names), value: holds(x, r) })),
    ...sens.map((x) => ({ who: say(x, names), value: holds(x, r) })),
  ];
  const story = o.topic && o.topic.skin !== 'letters' && o.topic.skin !== 'cards' ? ` ${cap(rowWords(r, names, o.topic))}.` : '';
  const last = sens[sens.length - 1];
  return { label: `Row ${k + 1}: ${rowSentence(r, names, o.topic)}.${story}`, truths, note: o.note ?? chain(last, r, names).join(' ') };
}

// ---------- teaching words ----------

type Term = { word: string; meaning: string };
export const T_TABLE: Term = { word: 'A truth table', meaning: 'a list of every case. Each row is one case.' };
export const T_ROW: Term = { word: 'A row', meaning: 'one case: one way the sentences can be true or false.' };
export const T_COLUMN: Term = { word: 'A column', meaning: 'one sentence, with its value in every row.' };
export const T_NOT: Term = { word: 'NOT', meaning: 'flips the part after it. True becomes false, and false becomes true.' };
export const T_AND: Term = { word: 'AND', meaning: 'both parts must be true.' };
export const T_OR: Term = { word: 'OR', meaning: 'one part or both parts must be true.' };
export const T_IF: Term = { word: 'IF … THEN', meaning: 'false only when the IF part is true and the THEN part is false.' };
export const T_SAME: Term = { word: 'Mean the same', meaning: 'match in every row. Matching in some rows is not enough.' };
export const T_ALWAYS: Term = { word: 'Always true', meaning: 'True in every row.' };
export const T_NEVER: Term = { word: 'Never true', meaning: 'False in every row.' };
export const T_SOMETIMES: Term = { word: 'Sometimes true', meaning: 'True in some rows and False in others.' };

/** The words a sentence uses, defined. */
export function opTerms(s: Sen): Term[] {
  const ops = new Set<string>();
  const walk = (x: Sen) => {
    if (x.op === 'atom') return;
    ops.add(x.op);
    if (x.op === 'not') walk(x.a);
    else {
      walk(x.a);
      walk(x.b);
    }
  };
  walk(s);
  return [...(ops.has('not') ? [T_NOT] : []), ...(ops.has('and') ? [T_AND] : []), ...(ops.has('or') ? [T_OR] : []), ...(ops.has('if') ? [T_IF] : [])];
}

/** The rule of a sentence's last step, in plain words. */
export function ruleLine(s: Sen): string {
  const parts = stepsOf(s).length > 1 ? 'Fill the small parts first, one column each. ' : '';
  switch (s.op) {
    case 'atom':
      return 'A part is true or false in each row, as the row says.';
    case 'not':
      return `${parts}NOT flips each row: True becomes False, and False becomes True.`;
    case 'and':
      return `${parts}AND is true only when both parts are true. If either part is false, it is false.`;
    case 'or':
      return `${parts}OR is true when one part or both parts are true. It is false only when both parts are false.`;
    case 'if':
      return `${parts}IF … THEN is false only when the IF part is true and the THEN part is false. In every other row it is true.`;
  }
}

/** “A AND B is True in row 1 and False in rows 2, 3 and 4.” */
export function columnWords(s: Sen, n: number, names: readonly string[]): string {
  const c = column(s, n);
  const yes = c.flatMap((v, k) => (v ? [k] : []));
  const no = c.flatMap((v, k) => (v ? [] : [k]));
  if (!no.length) return `${quote(s, names)} is True in every row.`;
  if (!yes.length) return `${quote(s, names)} is False in every row.`;
  return `${quote(s, names)} is True in ${rowsWord(yes)} and False in ${rowsWord(no)}.`;
}

/** The smallest worked example: one row, step by step. */
function simplerRow(s: Sen, r: Row, k: number, names: readonly string[]): string[] {
  return [`Take row ${k + 1}: ${rowSentence(r, names)}.`, ...chain(s, r, names), 'Do the same for each row. Look only at the row you are on.'];
}

/** A column in words, top to bottom: “True, False, False, False”. */
export const colLabel = (c: readonly boolean[]) => c.map(TF).join(', ');
/** A fixed id for a column: “col-TFFF”. */
export const colId = (c: readonly boolean[]) => `col-${c.map((v) => (v ? 'T' : 'F')).join('')}`;
const bits = (r: Row) => r.map((v) => (v ? 'T' : 'F')).join('');

// ---------- items ----------

/** A made item, with what it was built from, so a test can work the answer out again. */
export interface TableMade extends Made {
  /** The sentences asked about. */
  sens?: Sen[];
  names?: string[];
  n?: number;
  /** The rows shown, when they are not every case in order (rows items). */
  rows?: Row[];
  topic?: Topic;
  /** A rows item: the case left out, and the case shown twice. */
  missing?: Row;
  twice?: Row;
  /** A cell item: the row asked about (0-based). */
  row?: number;
  /** A card item: the two card rules (rules.ts). */
  rules?: [Formula, Formula];
  card?: Card;
}

export interface TableOptions {
  skin: Skin;
  /** Topic ids already used in this set: a new topic is picked when one is left. */
  avoid?: Set<string>;
}

const SECONDS = 120;

function done(tag: string, item: ItemCore, extra: Omit<TableMade, 'tag' | 'item'> = {}): TableMade {
  syncWhyWrong(item);
  return { tag, item, ...extra };
}

export const TF_CHOICES: Choice[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const opening = (t: Topic, n: number, names: readonly string[]) =>
  t.skin === 'letters' ? `Here are the sentences ${listAnd(names.slice(0, n))}.` : t.skin === 'cards' ? 'Each row is one kind of card.' : n === 1 ? 'Here is a sentence, named by a letter.' : `Here are ${n} sentences, named by letters.`;

// ----- Lesson 1: every case in rows -----

const ROWS_RULE = 'Each sentence can be true or false. Each new sentence doubles the rows: 1 sentence has 2, 2 have 4, 3 have 8.';
const ROWS_REMEMBER = ['A truth table has one row for each case, and each case only once.', 'Ask: “Is every case here? Is any case here twice?”'];

/** How many rows does a table need for n sentences? */
export function countItem(rng: Rng, o: TableOptions & { n?: number }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const n = o.n ?? (skin === 'letters' ? rng.pick([2, 3, 4]) : rng.pick([2, 3]));
  const t = pickTopic(rng, skin, o.avoid);
  const names = ABC.slice(0, n);
  const right = 2 ** n;
  const wrongs: { v: number; head: string; detail: string }[] = [
    { v: n, head: 'Your answer gives one row for each sentence.', detail: 'But a row is a case, not a sentence. Each sentence can be true or false in every case.' },
    { v: 2 * n, head: 'Your answer adds two rows for each sentence.', detail: 'But a new sentence does not add two rows. It splits every row in two, so the rows double.' },
    { v: 2 ** (n - 1), head: 'Your answer leaves out one sentence.', detail: `That is the count for ${n - 1} ${plural(n - 1, 'sentence')}. The last sentence doubles the rows once more.` },
    { v: 2 ** (n + 1), head: 'Your answer doubles one time too many.', detail: `That is the count for ${n + 1} sentences. Double once for each sentence, and no more.` },
    { v: n + 1, head: 'Your answer gives one row for each sentence, and one more.', detail: 'But each new sentence doubles the rows. It does not add one.' },
  ];
  const picked: typeof wrongs = [];
  for (const w of wrongs) if (w.v !== right && w.v > 0 && !picked.some((p) => p.v === w.v) && picked.length < 3) picked.push(w);
  const values = [right, ...picked.map((w) => w.v)].sort((x, y) => x - y);
  const counted = Array.from({ length: n }, (_, m) => `${m === 0 ? `${names[0]} alone` : `Add ${names[m]}`}: ${2 ** (m + 1)} rows.`).join(' ');
  const doubling: TeachCase = { label: `${n} sentences: ${listAnd(names)}.`, note: counted };
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of picked) {
    feedback[`n${w.v}`] = {
      headline: w.head,
      detail: [w.detail, `Count it: ${counted} So ${n} sentences need ${right} rows.`],
      example: doubling,
    };
  }
  const key = keyLines(t, names, n);
  return done('rows', {
    kind: 'choose',
    prompt: `A truth table needs one row for each case. How many rows does it need for ${n} sentences, ${listAnd(names)}?`,
    scene: { kind: 'text', lines: key.length ? key : [`The sentences: ${listAnd(names)}.`] },
    choices: values.map((v) => ({ id: `n${v}`, label: `${v} rows` })),
    answer: `n${right}`,
    explain: `Each sentence can be true or false, so each one doubles the rows. ${counted}`,
    feedback,
    hint: 'Here is the smallest table, counted. Each new sentence splits every row in two.',
    hintCase: { label: 'One sentence: 2 rows.', note: 'It can be true or false. Add a sentence, and each row splits into two rows.' },
    teach: {
      rule: ROWS_RULE,
      terms: [T_TABLE, T_ROW],
      meaning: `There ${n === 1 ? 'is 1 sentence' : `are ${n} sentences`}. Count the ways they can be true or false together.`,
      casesTitle: 'Add one sentence at a time',
      cases: Array.from({ length: n }, (_, m) => ({
        label: `${m + 1} ${plural(m + 1, 'sentence')}: ${2 ** (m + 1)} rows.`,
        note: m === 0 ? `${names[0]} is true in one row and false in the other.` : `Each of the ${2 ** m} rows splits in two: one with ${names[m]} true, one with ${names[m]} false.`,
      })),
      remember: ROWS_REMEMBER,
      simpler: ['One sentence: true or false. That is 2 rows.', 'Two sentences: for each of those 2 rows, the new one is true or false. That is 4 rows.', 'Keep doubling, once for each sentence.'],
    },
  }, { n, names, topic: t });
}

/** A choice label for a case: the story's words, or the letters. */
const caseLabel = (r: Row, names: readonly string[], t: Topic) => (t.skin === 'letters' ? rowShort(r, names) : cap(rowWords(r, names, t)));

/** One case is missing from the table. Which? */
export function missingItem(rng: Rng, o: TableOptions & { n?: 2 | 3 }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const n = o.n ?? rng.pick([2, 3] as const);
  const t = pickTopic(rng, skin, o.avoid);
  const names = ABC.slice(0, n);
  const all = rowsFor(n);
  const gone = rng.int(0, all.length - 1);
  const missing = all[gone];
  const shown = rng.shuffle(all.filter((_, k) => k !== gone));
  const others = rng.shuffle(shown).slice(0, 3);
  const choices = rng.shuffle([missing, ...others]).map((r) => ({ id: `case-${bits(r)}`, label: caseLabel(r, names, t) }));
  const at = (r: Row) => shown.findIndex((x) => sameRow(x, r));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const r of others) {
    const k = at(r);
    feedback[`case-${bits(r)}`] = {
      headline: `That case is already in the table, in row ${k + 1}.`,
      detail: [`Row ${k + 1} shows ${rowSentence(r, names)}.`, 'The missing case is the one no row shows. Go through every case, and look for each one in the table.'],
      example: { label: `Row ${k + 1}: ${rowSentence(r, names)}.`, truths: [{ who: 'In the table', value: true }], note: 'This case is there, so it is not the missing one.' },
    };
  }
  const hintRow = others[0];
  return done('rows', {
    kind: 'choose',
    prompt: `This table should list every case for ${listAnd(names)}. It has ${shown.length} rows, so one case is missing. Which case is it?`,
    scene: tableScene({ names, n, rows: shown, topic: t, caption: `${shown.length} rows, in no special order.` }),
    choices,
    answer: `case-${bits(missing)}`,
    explain: `${n} sentences make ${all.length} cases. Every case is in a row but one: ${rowSentence(missing, names)}.`,
    feedback,
    hint: 'Here is one case, found in the table. Look for each case the same way.',
    hintCase: { label: `${rowSentence(hintRow, names)}.`, truths: [{ who: 'In the table', value: true }], note: `Row ${at(hintRow) + 1} shows it.` },
    teach: {
      rule: 'A truth table lists every case once. To find a missing case, go through all the cases and look for each one.',
      terms: [T_TABLE, T_ROW],
      meaning: `${n} sentences make ${all.length} cases. This table has ${shown.length} rows, so one case is not there.`,
      casesTitle: 'Every case: is it in the table?',
      cases: all.map((r) => ({ label: `${cap(rowSentence(r, names))}.`, truths: [{ who: 'In the table', value: at(r) >= 0 }], note: at(r) >= 0 ? `Row ${at(r) + 1} shows it.` : 'No row shows it. This is the missing case.' })),
      remember: ROWS_REMEMBER,
      simpler: [`List the cases in the usual order. Start with ${rowSentence(all[0], names)}.`, 'Find each case in the table. Check it off when you find it.', 'The case you can’t find is the missing one.'],
    },
  }, { n, names, topic: t, rows: shown, missing });
}

/**
 * Does this table list every case, each once? The trap: a table with the right number of rows, one case twice and
 * one missing. `complete`: a table with every case once, in a new order.
 */
export function repeatItem(rng: Rng, o: TableOptions & { n?: 2 | 3; complete?: boolean }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const n = o.n ?? rng.pick([2, 2, 3] as const);
  const t = pickTopic(rng, skin, o.avoid);
  const names = ABC.slice(0, n);
  const all = rowsFor(n);
  const allFalse = all[all.length - 1];
  let rows: Row[];
  let missing: Row | undefined;
  let twice: Row | undefined;
  if (o.complete) rows = rng.shuffle(all);
  else {
    // Never the all-false case missing or twice: then “a row with every sentence false should not be there” would read
    // like a fact about the table (one of two all-false rows really should go).
    const gone = rng.int(0, all.length - 2);
    missing = all[gone];
    twice = rng.pick(all.filter((_, k) => k !== gone && k !== all.length - 1));
    rows = rng.shuffle([...all.filter((_, k) => k !== gone), twice]);
  }
  const where = (r: Row) => rows.flatMap((x, k) => (sameRow(x, r) ? [k] : []));
  const choices: Choice[] = [
    { id: 'once', label: 'Yes. Each case is there, once.' },
    { id: 'twice', label: 'No. A case is there twice, and one is missing.' },
    { id: 'more', label: `No. ${n} sentences need more than ${all.length} rows.` },
    { id: 'allfalse', label: 'No. A row with every sentence false should not be there.' },
  ];
  const answer = o.complete ? 'once' : 'twice';
  // Named by its row in the table on screen (the rows are in no special order), never by its place in the usual order.
  const allFalseCase = rowCase([], allFalse, where(allFalse)[0], names, { note: 'Every sentence is false here. That can happen, so it is a case.' });
  const feedback: Record<string, ChoiceFeedback> = {
    more: {
      headline: `Your answer asks for more rows, but ${n} sentences make just ${all.length} cases.`,
      detail: [`Each sentence doubles the rows. ${n} sentences make ${all.length}, and this table has ${rows.length}.`, 'The count is right. The question is whether each row is a different case.'],
      example: { label: `${n} sentences: ${listAnd(names)}.`, note: `${all.length} cases in all. The table needs one row for each.` },
    },
    allfalse: {
      headline: 'Your answer says a row with every sentence false is not a case, but it is.',
      detail: [`${cap(rowSentence(allFalse, names))}: that can happen too. It is one of the ${all.length} cases.`, 'A table that leaves it out misses a case.'],
      example: allFalseCase,
    },
  };
  if (o.complete) {
    feedback.twice = {
      headline: 'Your answer says a case is there twice, but every row is a different case.',
      detail: [`All ${all.length} cases are there, one in each row.`, 'The rows are in a new order. The order does not matter.'],
      example: { label: `${cap(rowSentence(rows[0], names))}.`, truths: [{ who: 'In more than one row', value: false }], note: `Only row 1 shows this case. Each row is like that.` },
    };
  } else {
    const [a, b] = where(twice!);
    feedback.once = {
      headline: `Your answer says each case is there once, but row ${a + 1} and row ${b + 1} show the same case.`,
      detail: [`Both rows show ${rowSentence(twice!, names)}.`, `So one case is missing: ${rowSentence(missing!, names)}. The count of ${rows.length} rows is right, but that is not enough.`],
      example: { label: `Rows ${a + 1} and ${b + 1}: ${rowSentence(twice!, names)}.`, truths: [{ who: 'In more than one row', value: true }], note: 'The same case, twice. So another case has no row.' },
    };
  }
  const single = rows.find((r) => where(r).length === 1)!;
  const k1 = where(single)[0];
  return done('rows', {
    kind: 'choose',
    prompt: `This table has ${rows.length} rows for ${listAnd(names)}. Does it list every case, each one once?`,
    scene: tableScene({ names, n, rows, topic: t, caption: `${rows.length} rows, in no special order.` }),
    choices,
    answer,
    explain: o.complete
      ? `Each row is a different case, and there are ${all.length} of them. So every case is there once. The order does not matter.`
      : `Rows ${where(twice!).map((k) => k + 1).join(' and ')} both show ${rowSentence(twice!, names)}. So ${rowSentence(missing!, names)} is missing, even though the count looks right.`,
    feedback,
    hint: 'Here is one row, checked against the others. Check every row the same way.',
    hintCase: { label: `Row ${k1 + 1}: ${rowSentence(single, names)}.`, truths: [{ who: 'In more than one row', value: false }], note: 'No other row shows this case.' },
    teach: {
      rule: 'A truth table lists every case, each one once. The right number of rows is not enough: a row can repeat a case and leave another out.',
      terms: [T_TABLE, T_ROW],
      meaning: `${n} sentences make ${all.length} cases. The table has ${rows.length} rows. Is each row a new case?`,
      casesTitle: 'Every case: how many rows show it?',
      cases: all.map((r) => {
        const ks = where(r);
        return {
          label: `${cap(rowSentence(r, names))}.`,
          truths: [{ who: 'In the table', value: ks.length > 0 }],
          note: ks.length === 0 ? 'No row shows it. It is missing.' : ks.length === 1 ? `Row ${ks[0] + 1} shows it.` : `Rows ${ks.map((k) => k + 1).join(' and ')} both show it.`,
        };
      }),
      remember: ROWS_REMEMBER,
      simpler: ['Count the cases first. Then take the cases one at a time.', 'For each case, find the rows that show it. Each case needs exactly one row.', 'A case with two rows means another case has none.'],
    },
    ...(o.complete ? {} : { conflict: true, tags: [REPEAT_ROW.tag] }),
  }, { n, names, topic: t, rows, missing, twice });
}

/** The pass tag of Lesson 1: a table with the right count, one case twice and one missing. */
export const REPEAT_ROW = { tag: 'repeat-row', label: 'a table with a row twice and a case missing' } as const;

// ----- Lesson 2: tables for NOT, AND, OR -----

/** One joining word or NOT, on two parts. */
export const SINGLE_POOL: readonly Sen[] = [AND(A, B), OR(A, B), NOT(A), NOT(B)];
/** Two steps: a NOT on one part, then AND or OR (a helper column first). */
export const HELPER_POOL: readonly Sen[] = [AND(A, NOT(B)), AND(NOT(A), B), OR(NOT(A), B), OR(A, NOT(B))];

const MISREAD_HEAD = (m: Misread | 'flip-all', s: Sen, names: readonly string[]): string => {
  const [p, q] = names;
  switch (m) {
    case 'xor':
      return 'Your column reads OR as “one but not both.” OR includes both.';
    case 'or-as-and':
      return 'Your column reads OR like AND.';
    case 'and-as-or':
      return 'Your column reads AND like OR.';
    case 'drop-not':
      return 'Your column leaves out the NOT.';
    case 'not-each':
      return 'Your column puts a NOT on each part, but keeps the joining word.';
    case 'if-as-and':
      return 'Your column marks the sentence False whenever the IF part is false.';
    case 'if-both':
      return `Your column reads the sentence both ways, as if ${q} also needed ${p}.`;
    case 'if-flip':
      return `Your column is the table for the flipped sentence, “IF ${q}, THEN ${p}.”`;
    case 'if-copies-then':
      return `Your column just copies ${q}, the THEN part.`;
    case 'flip-all':
      return `Your column is the right column flipped in every row.`;
  }
  return say(s, names);
};

/** Wrong columns for a sentence: its misreadings first, then the right column flipped, then any other. */
function wrongColumns(rng: Rng, s: Sen, n: number, max = 3): { col: boolean[]; m?: Misread | 'flip-all' }[] {
  const right = column(s, n);
  const key = (c: readonly boolean[]) => c.map((v) => (v ? 1 : 0)).join('');
  const seen = new Set([key(right)]);
  const out: { col: boolean[]; m?: Misread | 'flip-all' }[] = [];
  const add = (col: boolean[], m?: Misread | 'flip-all') => {
    if (seen.has(key(col)) || out.length >= max) return;
    seen.add(key(col));
    out.push({ col, ...(m ? { m } : {}) });
  };
  for (const m of rng.shuffle(MISREADS)) add(columnAs(s, n, m), m);
  add(right.map((v) => !v), 'flip-all');
  for (let i = 0; out.length < max && i < 200; i++) add(Array.from({ length: right.length }, () => rng.chance(0.5)));
  return out;
}

/** The feedback for a wrong column: its misreading (when known) or the first row where it is wrong, worked out. */
function columnFeedback(s: Sen, n: number, names: readonly string[], wrong: { col: boolean[]; m?: Misread | 'flip-all' }, t?: Topic): ChoiceFeedback {
  const right = column(s, n);
  const rows = rowsFor(n);
  const k = wrong.col.findIndex((v, i) => v !== right[i]);
  const r = rows[k];
  const head = wrong.m ? MISREAD_HEAD(wrong.m, s, names) : `Your column says ${TF(wrong.col[k])} in row ${k + 1}, but ${quote(s, names)} is ${tf(right[k])} there.`;
  return {
    headline: head,
    detail: [
      ...(wrong.m ? [`Look at row ${k + 1}. Your column says ${TF(wrong.col[k])} there.`] : [`Look at row ${k + 1}.`]),
      ...chain(s, r, names),
    ],
    example: rowCase([s], r, k, names, { topic: t }),
  };
}

/** Teaching for one sentence on its table: the rule, the words, and every row worked out. */
export function sentenceTeach(s: Sen, n: number, names: readonly string[], t?: Topic, extra: Partial<Teach> = {}): Teach {
  const rows = rowsFor(n);
  return {
    rule: ruleLine(s),
    terms: [T_ROW, T_COLUMN, ...opTerms(s)],
    meaning: `${quote(s, names)} is one sentence. Its column gives its value in each of the ${rows.length} rows.`,
    casesTitle: `${say(s, names)}, row by row`,
    cases: rows.map((r, k) => rowCase([s], r, k, names, { topic: t })),
    remember: ['Fill one row at a time. Look only at the row you are on.', 'Ask: “Which parts are true in this row?”'],
    simpler: simplerRow(s, rows[0], 0, names),
    ...extra,
  };
}

/** The row a hint shows: the one where the right column agrees with the most wrong choices, so it gives away the least. */
function quietRow(right: readonly boolean[], wrongs: readonly (readonly boolean[])[]): number {
  let best = 0, score = -1;
  right.forEach((v, k) => {
    const n = wrongs.filter((w) => w[k] === v).length;
    if (n > score) [best, score] = [k, n];
  });
  return best;
}

/** Which column is right for this sentence? */
export function columnItem(rng: Rng, o: TableOptions & { family?: 'single' | 'helper'; sen?: Sen }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t);
  const s = o.sen ?? rng.pick((o.family ?? rng.pick(['single', 'helper'] as const)) === 'single' ? SINGLE_POOL.slice(0, 2) : HELPER_POOL);
  const n = 2;
  const right = column(s, n);
  const wrongs = wrongColumns(rng, s, n);
  const choices = rng.shuffle([right, ...wrongs.map((w) => w.col)]).map((c) => ({ id: colId(c), label: colLabel(c) }));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) feedback[colId(w.col)] = columnFeedback(s, n, names, w, t);
  const hk = quietRow(right, wrongs.map((w) => w.col));
  return done('fill', {
    kind: 'choose',
    prompt: `${opening(t, n, names)} Fill the column for ${quote(s, names, '.')} Which column is right, from row 1 down?`,
    scene: tableScene({ names, n, cols: [s], topic: t, blank: () => true, caption: 'The last column is blank. Fill it row by row.' }),
    choices,
    answer: colId(right),
    explain: `${columnWords(s, n, names)} ${ruleLine(s)}`,
    feedback,
    hint: 'Here is one row, worked out. Do each other row the same way.',
    hintCase: rowCase([s], rowsFor(n)[hk], hk, names, { topic: t }),
    teach: sentenceTeach(s, n, names, t),
    seconds: SECONDS,
  }, { sens: [s], names, n, topic: t });
}

/** The pass tag of Lesson 2: OR in the row where both parts are true. */
export const OR_BOTH = { tag: 'or-both', label: 'OR in the row where both parts are true' } as const;

/** One box: is this sentence true or false in this row? */
export function cellItem(rng: Rng, o: TableOptions & { sen?: Sen; row?: number; want?: boolean; pq?: boolean; tag: 'fill' | 'if-table'; trap?: { tag: string } }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t, o.pq);
  const n = 2;
  const rows = rowsFor(n);
  // A box with a given answer (`want`): a sentence and a row where it has that value.
  const boxes = (o.sen ? [o.sen] : [...SINGLE_POOL, ...HELPER_POOL]).flatMap((x) => rows.map((_r, j) => [x, j] as const)).filter(([x, j]) => (o.row === undefined || j === o.row) && (o.want === undefined || holds(x, rows[j]) === o.want));
  const [s, k] = o.sen && o.row !== undefined && o.want === undefined ? [o.sen, o.row] : o.sen && o.want === undefined ? [o.sen, rng.int(0, rows.length - 1)] : rng.pick(boxes);
  const r = rows[k];
  const v = holds(s, r);
  const wrong = v ? 'false' : 'true';
  const sw = quote(s, names);
  const words = t.skin === 'letters' ? `${cap(rowSentence(r, names))}.` : `${cap(rowSentence(r, names))}: ${rowWords(r, names, t)}.`;
  let headline = `Your answer says ${sw} is ${tf(!v)} in row ${k + 1}, but it is ${tf(v)} there.`;
  if (s.op === 'or' && r.every(Boolean) && !v === false) headline = 'Your answer reads OR as “one but not both.” OR includes both, so it is true here.';
  if (s.op === 'if' && !holds(s.a, r)) headline = 'Your answer marks the row False, but the IF part did not happen here. Nothing breaks the sentence.';
  if (s.op === 'if' && holds(s.a, r) && !holds(s.b, r)) headline = 'Your answer marks the row True, but this is the one row that breaks the sentence.';
  const other = rows.findIndex((x, j) => j !== k && holds(s, x) !== v);
  const hk = other >= 0 ? other : (k + 1) % rows.length;
  const extraTerms = s.op === 'if' ? { terms: [T_ROW, T_COLUMN, T_IF, { word: 'The IF part', meaning: `the part right after IF: ${names[0]}.` }, { word: 'The THEN part', meaning: `the part right after THEN: ${names[1]}.` }] } : {};
  return done(o.tag, {
    kind: 'choose',
    prompt: `${opening(t, n, names)} Look at row ${k + 1}. ${words} Is ${sw} true or false in that row?`,
    scene: tableScene({ names, n, cols: [s], topic: t, blank: () => true, marked: [k], markLabel: 'This row' }),
    choices: TF_CHOICES,
    answer: tf(v),
    explain: chain(s, r, names).join(' '),
    feedback: {
      [wrong]: {
        headline,
        detail: [`Look at row ${k + 1}.`, ...chain(s, r, names)],
        example: rowCase([s], r, k, names, { topic: t }),
      },
    },
    hint: `Here is another row, worked out. Do row ${k + 1} the same way.`,
    hintCase: rowCase([s], rows[hk], hk, names, { topic: t }),
    teach: sentenceTeach(s, n, names, t, extraTerms),
    ...(o.trap ? { conflict: true, tags: [o.trap.tag] } : {}),
  }, { sens: [s], names, n, topic: t, row: k });
}

/** OR in the row where both parts are true: the trap of Lesson 2. */
export const orBothItem = (rng: Rng, o: TableOptions) => cellItem(rng, { ...o, sen: OR(A, B), row: 0, tag: 'fill', trap: OR_BOTH });

// ----- Lesson 3: the IF table -----

export const IF_PQ = IF(A, B);
/** The pass tag of Lesson 3: a row where the IF part is false. */
export const IF_FALSE = { tag: 'if-false', label: 'a row where the IF part is false' } as const;

/** One row of IF P, THEN Q. A row with P false is the trap (it is True). */
export function ifCellItem(rng: Rng, o: TableOptions & { row?: number }): TableMade {
  const k = o.row ?? rng.int(0, 3);
  const pFalse = !rowsFor(2)[k][0];
  return cellItem(rng, { ...o, sen: IF_PQ, row: k, pq: true, tag: 'if-table', ...(pFalse ? { trap: IF_FALSE } : {}) });
}

/** Which column is the table for IF P, THEN Q? */
export function ifColumnItem(rng: Rng, o: TableOptions): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t, true);
  const s = IF_PQ;
  const n = 2;
  const right = column(s, n);
  const pool = (['if-as-and', 'if-both', 'if-flip', 'if-copies-then'] as const).map((m) => ({ col: columnAs(s, n, m), m }));
  const wrongs = rng.shuffle(pool).slice(0, 3);
  const choices = rng.shuffle([right, ...wrongs.map((w) => w.col)]).map((c) => ({ id: colId(c), label: colLabel(c) }));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) feedback[colId(w.col)] = columnFeedback(s, n, names, w, t);
  const hk = quietRow(right, wrongs.map((w) => w.col));
  const rule = t.skin === 'letters' ? '' : ` The rule: IF ${t.parts[0].yes}, THEN ${t.parts[1].yes}.`;
  return done('if-table', {
    kind: 'choose',
    prompt: `${opening(t, n, names)}${rule} Which column is the table for ${quote(s, names, ',')} from row 1 down?`,
    scene: tableScene({ names, n, cols: [s], topic: t, blank: () => true, caption: `${names[0]} is the IF part. ${names[1]} is the THEN part.` }),
    choices,
    answer: colId(right),
    explain: `${columnWords(s, n, names)} It is broken only when the IF part is true and the THEN part is false.`,
    feedback,
    hint: 'Here is one row, worked out. Do each other row the same way.',
    hintCase: rowCase([s], rowsFor(n)[hk], hk, names, { topic: t }),
    teach: sentenceTeach(s, n, names, t, { remember: ['IF … THEN is False in one row only: the IF part true and the THEN part false.', 'Ask: “Did the IF part happen? If it did, did the THEN part happen?”'] }),
    seconds: SECONDS,
  }, { sens: [s], names, n, topic: t });
}

/** A story rule: which row makes it false? */
export function breakRowItem(rng: Rng, o: TableOptions): TableMade {
  const skin: Skin = o.skin === 'letters' || o.skin === 'cards' ? rng.pick(STORY_SKINS) : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t, true);
  const s = IF_PQ;
  const rows = rowsFor(2);
  const k = rows.findIndex((r) => !holds(s, r));
  const order = rng.shuffle(rows.map((_, j) => j));
  const choices = order.map((j) => ({ id: `row-${bits(rows[j])}`, label: `${cap(rowWords(rows[j], names, t))}.` }));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const j of order) {
    if (j === k) continue;
    const r = rows[j];
    feedback[`row-${bits(r)}`] = {
      headline: !r[0] ? 'In your answer the IF part does not happen, so the rule asks for nothing. Nothing breaks it.' : 'In your answer the IF part happens, and the THEN part happens too. That keeps the rule.',
      detail: [`Your answer: ${rowWords(r, names, t)}.`, reason(s, r, names)],
      example: rowCase([s], r, j, names, { topic: t }),
    };
  }
  const hk = rows.findIndex((r, j) => j !== k && !r[0]);
  return done('if-table', {
    kind: 'choose',
    prompt: `The rule is: IF ${t.parts[0].yes}, THEN ${t.parts[1].yes}. Which case makes the rule false?`,
    scene: tableScene({ names, n: 2, cols: [s], topic: t, blank: () => true, caption: `${names[0]} is the IF part. ${names[1]} is the THEN part.` }),
    choices,
    answer: `row-${bits(rows[k])}`,
    explain: `Only one case breaks the rule: ${rowWords(rows[k], names, t)}. The IF part happens, but the THEN part does not.`,
    feedback,
    hint: 'Here is one case, worked out. Check each case the same way.',
    hintCase: rowCase([s], rows[hk], hk, names, { topic: t }),
    teach: sentenceTeach(s, 2, names, t, {
      rule: 'An IF rule is false only when the IF part happens and the THEN part does not. Every other case keeps it.',
      remember: ['Only IF without THEN breaks the rule.', 'Ask: “Did the IF part happen? If it did, did the THEN part happen?”'],
    }),
  }, { sens: [s], names, n: 2, topic: t, row: k });
}

// ----- Lesson 4: same meaning -----

/** Pairs that mean the same (their columns match in every row). */
export const SAME_PAIRS: readonly [Sen, Sen][] = [
  [NOT(AND(A, B)), OR(NOT(A), NOT(B))],
  [NOT(OR(A, B)), AND(NOT(A), NOT(B))],
  [IF(A, B), IF(NOT(B), NOT(A))],
  [IF(A, B), OR(NOT(A), B)],
];
/** The trap pairs: the NOT put on each part with the joining word kept. They agree in two rows and differ in two. */
export const TRAP_PAIRS: readonly [Sen, Sen][] = [
  [NOT(AND(A, B)), AND(NOT(A), NOT(B))],
  [NOT(OR(A, B)), OR(NOT(A), NOT(B))],
];
/** Other pairs that do not mean the same: flip only, NOT only, AND and OR swapped. */
export const OTHER_PAIRS: readonly [Sen, Sen][] = [
  [IF(A, B), IF(B, A)],
  [IF(A, B), IF(NOT(A), NOT(B))],
  [AND(A, B), OR(A, B)],
];
/** The pass tag of Lesson 4: NOT (A AND B) and NOT A AND NOT B, which agree in some rows only. */
export const NOT_EACH = { tag: 'not-each', label: 'a NOT put on each part, with the joining word kept' } as const;

/** Sentences a “which means the same” or “where do they differ” question may use (two parts). */
export const POOL_2: readonly Sen[] = [
  A, B, NOT(A), NOT(B), AND(A, B), OR(A, B), IF(A, B), IF(B, A), AND(A, NOT(B)), OR(A, NOT(B)), OR(NOT(A), B),
  OR(NOT(A), NOT(B)), AND(NOT(A), NOT(B)), NOT(AND(A, B)), NOT(OR(A, B)), IF(NOT(B), NOT(A)), IF(NOT(A), NOT(B)),
];

const SAME_CHOICES: Choice[] = [{ id: 'yes', label: 'Yes. They match in every row.' }, { id: 'no', label: 'No. They differ in at least one row.' }];

/** Teaching for two sentences side by side. */
function pairTeach(s: Sen, u: Sen, names: readonly string[], t?: Topic): Teach {
  const rows = rowsFor(2);
  return {
    rule: 'Two sentences mean the same when their columns match in every row. One row that differs is enough to say no.',
    terms: [T_ROW, T_COLUMN, T_SAME, ...opTerms(AND(s, u)).filter((x) => x !== T_AND || s.op === 'and' || u.op === 'and' || JSON.stringify([s, u]).includes('"and"'))],
    meaning: `Fill both columns, ${quote(s, names)} and ${quote(u, names, '.')} Then compare them row by row.`,
    casesTitle: 'Both sentences, row by row',
    cases: rows.map((r, k) => {
      const same = holds(s, r) === holds(u, r);
      return rowCase([s, u], r, k, names, { topic: t, note: `${reason(s, r, names)} ${reason(u, r, names)} ${same ? 'They agree here.' : 'They differ here.'}` });
    }),
    remember: ['Same meaning means the same value in every row.', 'Ask: “Is there a row where one is true and the other is false?”'],
    simpler: [`Take row 1: ${rowSentence(rows[0], names)}.`, reason(s, rows[0], names), reason(u, rows[0], names), 'Do the same for each row. Stop at the first row where they differ.'],
  };
}

/** Do these two sentences mean the same? */
export function sameItem(rng: Rng, o: TableOptions & { pair?: [Sen, Sen]; trap?: boolean; want?: boolean }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t);
  const pool = o.trap ? TRAP_PAIRS : o.want === true ? SAME_PAIRS : o.want === false ? OTHER_PAIRS : [...SAME_PAIRS, ...OTHER_PAIRS];
  const pair = o.pair ?? rng.pick(pool);
  const [s, u] = rng.chance(0.5) ? pair : [pair[1], pair[0]];
  const rows = rowsFor(2);
  const diff = differRows(s, u, 2);
  const same = diff.length === 0;
  const feedback: Record<string, ChoiceFeedback> = {};
  if (same) {
    feedback.no = {
      headline: 'Your answer says they differ, but they match in all four rows.',
      detail: [`${columnWords(s, 2, names)}`, `${columnWords(u, 2, names)}`, 'The two columns are the same in every row.'],
      example: rowCase([s, u], rows[1], 1, names, { topic: t, note: `${reason(s, rows[1], names)} ${reason(u, rows[1], names)} They agree here, as in every row.` }),
    };
  } else {
    const k = diff[0];
    const agree = rows.flatMap((_, j) => (diff.includes(j) ? [] : [j]));
    feedback.yes = {
      headline: `Your answer says they match, but they differ in ${rowsWord(diff)}.`,
      detail: [
        ...(agree.length ? [`They agree in ${rowsWord(agree)}. That is not enough.`] : []),
        `Look at row ${k + 1}: ${rowSentence(rows[k], names)}.`,
        reason(s, rows[k], names),
        reason(u, rows[k], names),
      ],
      example: rowCase([s, u], rows[k], k, names, { topic: t, note: `${quote(s, names)} is ${tf(holds(s, rows[k]))}, but ${quote(u, names)} is ${tf(holds(u, rows[k]))}. They differ here.` }),
    };
  }
  const hk = same ? 0 : rows.findIndex((_, j) => !diff.includes(j));
  const isTrap = TRAP_PAIRS.some(([x, y]) => (sameColumn(x, s, 2) && sameColumn(y, u, 2)) || (sameColumn(x, u, 2) && sameColumn(y, s, 2)));
  return done('same', {
    kind: 'choose',
    prompt: `${opening(t, 2, names)} Do ${quote(s, names)} and ${quote(u, names)} mean the same? Check every row.`,
    scene: tableScene({ names, n: 2, cols: [s, u], topic: t, blank: () => true, caption: 'Fill both columns. Then compare them row by row.' }),
    choices: SAME_CHOICES,
    answer: same ? 'yes' : 'no',
    explain: same
      ? `${columnWords(s, 2, names)} ${columnWords(u, 2, names)} The columns match in every row, so they mean the same.`
      : `They differ in ${rowsWord(diff)}. In row ${diff[0] + 1}, ${quote(s, names)} is ${tf(holds(s, rows[diff[0]]))} and ${quote(u, names)} is ${tf(holds(u, rows[diff[0]]))}.`,
    feedback,
    hint: 'Here is one row, with both sentences worked out. Check the other rows the same way.',
    hintCase: rowCase([s, u], rows[hk], hk, names, { topic: t }),
    teach: pairTeach(s, u, names, t),
    seconds: SECONDS,
    ...(isTrap ? { conflict: true, tags: [NOT_EACH.tag] } : {}),
  }, { sens: [s, u], names, n: 2, topic: t });
}

/** Which sentence means the same as this one? */
export function pickSameItem(rng: Rng, o: TableOptions): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t);
  const [target, right] = rng.pick(SAME_PAIRS);
  // The tempting wrong ones first: the NOT put on each part, flip only, NOT only. Then others, never another sentence with the same column.
  const tempting = [...TRAP_PAIRS, ...OTHER_PAIRS].filter(([x]) => sameColumn(x, target, 2)).map(([, y]) => y);
  const others = rng.shuffle(POOL_2.filter((x) => !sameColumn(x, target, 2) && !tempting.some((y) => sameColumn(x, y, 2))));
  const wrongs: Sen[] = [];
  for (const x of [...rng.shuffle(tempting), ...others]) if (wrongs.length < 3 && !wrongs.some((y) => sameColumn(x, y, 2)) && say(x, names) !== say(target, names)) wrongs.push(x);
  const choices = rng.shuffle([right, ...wrongs]).map((x) => ({ id: senId(x, names), label: say(x, names) }));
  const rows = rowsFor(2);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) {
    const d = differRows(target, w, 2);
    const k = d[0];
    const agree = rows.flatMap((_, j) => (d.includes(j) ? [] : [j]));
    feedback[senId(w, names)] = {
      headline: `Your answer differs from ${quote(target, names)} in ${rowsWord(d)}.`,
      detail: [...(agree.length ? [`It agrees in ${rowsWord(agree)}, but that is not enough.`] : []), `Look at row ${k + 1}: ${rowSentence(rows[k], names)}.`, reason(target, rows[k], names), reason(w, rows[k], names)],
      example: rowCase([target, w], rows[k], k, names, { topic: t, note: `${quote(target, names)} is ${tf(holds(target, rows[k]))}, but your answer is ${tf(holds(w, rows[k]))}. They differ here.` }),
    };
  }
  const hk = 0;
  return done('same', {
    kind: 'choose',
    prompt: `${opening(t, 2, names)} Which sentence means the same as ${quote(target, names)}?`,
    scene: tableScene({ names, n: 2, cols: [target], topic: t, caption: `The column for ${quote(target, names)} is filled in.` }),
    choices,
    answer: senId(right, names),
    explain: `${columnWords(target, 2, names)} ${columnWords(right, 2, names)} The columns match in every row.`,
    feedback,
    hint: 'Here is one row, with the sentence and one choice worked out. Check each choice in every row.',
    hintCase: rowCase([target, wrongs[0]], rows[hk], hk, names, { topic: t }),
    teach: pairTeach(target, right, names, t),
    seconds: SECONDS,
  }, { sens: [target, right, ...wrongs], names, n: 2, topic: t });
}

/** Two sentences that differ in exactly one row (the rest agree). Never a bare part, which would repeat a part's column. */
export const ONE_ROW_PAIRS: readonly [Sen, Sen][] = (() => {
  const out: [Sen, Sen][] = [];
  const pool = POOL_2.filter((x) => x.op !== 'atom');
  pool.forEach((x, i) => pool.slice(i + 1).forEach((y) => {
    if (differRows(x, y, 2).length === 1) out.push([x, y]);
  }));
  return out;
})();

/** These two sentences agree in three rows. In which row do they differ? */
export function diffRowItem(rng: Rng, o: TableOptions): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t);
  const pair = rng.pick(ONE_ROW_PAIRS);
  const [s, u] = rng.chance(0.5) ? pair : [pair[1], pair[0]];
  const rows = rowsFor(2);
  const k = differRows(s, u, 2)[0];
  const feedback: Record<string, ChoiceFeedback> = {};
  rows.forEach((r, j) => {
    if (j === k) return;
    const v = holds(s, r);
    feedback[`row${j + 1}`] = {
      headline: `In row ${j + 1}, both sentences are ${tf(v)}. They agree there.`,
      detail: [`Row ${j + 1}: ${rowSentence(r, names)}.`, reason(s, r, names), reason(u, r, names)],
      example: rowCase([s, u], r, j, names, { topic: t, note: `Both are ${tf(v)}. They agree here.` }),
    };
  });
  const hk = (k + 1) % 4;
  return done('same', {
    kind: 'choose',
    prompt: `${opening(t, 2, names)} ${quote(s, names)} and ${quote(u, names)} agree in three rows. In which row do they differ?`,
    scene: tableScene({ names, n: 2, cols: [s, u], topic: t, blank: () => true, caption: 'Fill both columns. Find the row where they differ.' }),
    choices: rows.map((r, j) => ({ id: `row${j + 1}`, label: `Row ${j + 1}: ${rowShort(r, names)}` })),
    answer: `row${k + 1}`,
    explain: `In row ${k + 1}, ${quote(s, names)} is ${tf(holds(s, rows[k]))} and ${quote(u, names)} is ${tf(holds(u, rows[k]))}. In every other row they agree. So they do not mean the same.`,
    feedback,
    hint: 'Here is one row, with both sentences worked out. Check the other rows the same way.',
    hintCase: rowCase([s, u], rows[hk], hk, names, { topic: t }),
    teach: pairTeach(s, u, names, t),
    seconds: SECONDS,
  }, { sens: [s, u], names, n: 2, topic: t, row: k });
}

/** A sentence over two card words as a Stop 2 card rule (rules.ts). */
export function toFormula(s: Sen, feats: readonly Feature[]): Formula {
  switch (s.op) {
    case 'atom':
      return cardIs(feats[s.i]);
    case 'not':
      return cardNot(toFormula(s.a, feats));
    case 'and':
      return cardAnd(toFormula(s.a, feats), toFormula(s.b, feats));
    case 'or':
      return cardOr(toFormula(s.a, feats), toFormula(s.b, feats));
    case 'if':
      return cardOr(cardNot(toFormula(s.a, feats)), toFormula(s.b, feats));
  }
}

/** The row of a card: is it each card word? */
export const cardRow = (c: Card, feats: readonly Feature[]): Row => feats.map((f) => c[f.kind] === f.value);
const thingOf = (c: Card): Thing => ({ id: cardId(c), shape: c.shape, color: c.color, size: c.size });

/**
 * Card rules (Stop 2): do they fit the same cards? Answered with rules.ts sameMeaning over all 18 cards; the table must
 * agree, because each row is one kind of card. A “no” names a card from rules.ts differences.
 */
export function cardsSameItem(rng: Rng, o: { pair?: [Sen, Sen]; trap?: boolean } = {}): TableMade {
  const [f, g] = rng.pick(FEATURE_PAIRS);
  const t = cardTopic(f, g);
  const names = namesFor(t);
  const pair = o.pair ?? rng.pick(o.trap ? TRAP_PAIRS : [...SAME_PAIRS.slice(0, 2), ...TRAP_PAIRS]);
  const [s, u] = rng.chance(0.5) ? pair : [pair[1], pair[0]];
  const F = toFormula(s, t.feats!), G = toFormula(u, t.feats!);
  const same = sameOnCards(F, G);
  if (same !== sameColumn(s, u, 2)) throw new Error('cardsSameItem: the cards and the table disagree');
  const rows = rowsFor(2);
  const R = (x: Formula) => `“${cardRender(x)}”`;
  const feedback: Record<string, ChoiceFeedback> = {};
  let card: Card | undefined;
  if (same) {
    feedback.no = {
      headline: 'Your answer says they differ, but every card fits both rules or neither.',
      detail: [`Each row is one kind of card. ${R(F)} and ${R(G)} have the same column.`, 'So no card fits one rule and not the other.'],
      example: rowCase([s, u], rows[1], 1, names, { topic: t, note: `${reason(s, rows[1], names)} ${reason(u, rows[1], names)} They agree here, as in every row.` }),
    };
  } else {
    card = rng.pick(differences(F, G));
    const r = cardRow(card, t.feats!);
    const k = rows.findIndex((x) => sameRow(x, r));
    feedback.yes = {
      headline: `Your answer says they fit the same cards, but the ${cardName(card)} fits one and not the other.`,
      detail: [`The ${cardName(card)} is ${rowSentence(r, names, t)}. That is row ${k + 1}.`, reason(s, r, names), reason(u, r, names)],
      example: { ...rowCase([s, u], r, k, names, { topic: t }), things: [thingOf(card)] },
    };
  }
  const isTrap = TRAP_PAIRS.some(([x, y]) => (sameColumn(x, s, 2) && sameColumn(y, u, 2)) || (sameColumn(x, u, 2) && sameColumn(y, s, 2)));
  const diff = differRows(s, u, 2);
  const hk = same ? 0 : rows.findIndex((_, j) => !diff.includes(j));
  return done('same', {
    kind: 'choose',
    prompt: `Back to the cards. Do the rules ${R(F)} and ${R(G)} fit the same cards? Each row of the table is one kind of card.`,
    scene: tableScene({ names, n: 2, cols: [s, u], topic: t, blank: () => true, caption: 'Each row is one kind of card. Fill both columns.' }),
    choices: [{ id: 'yes', label: 'Yes. They match in every row.' }, { id: 'no', label: 'No. Some card fits just one of them.' }],
    answer: same ? 'yes' : 'no',
    explain: same
      ? `The columns match in every row, so every kind of card fits both rules or neither. They mean the same.`
      : `They differ in ${rowsWord(diff)}. For example, the ${cardName(card!)} fits ${holds(s, cardRow(card!, t.feats!)) ? R(F) : R(G)} but not the other rule.`,
    feedback,
    hint: 'Here is one kind of card, with both rules worked out. Check the other rows the same way.',
    hintCase: rowCase([s, u], rows[hk], hk, names, { topic: t }),
    teach: pairTeach(s, u, names, t),
    seconds: SECONDS,
    ...(isTrap ? { conflict: true, tags: [NOT_EACH.tag] } : {}),
  }, { sens: [s, u], names, n: 2, topic: t, rules: [F, G], ...(card ? { card } : {}) });
}

// ----- Lesson 5: always true, never true -----

/** Always true, never true, and sometimes true sentences. `most`: true in three rows of four (the trap). */
export const ALWAYS_POOL: readonly Sen[] = [OR(A, NOT(A)), OR(NOT(B), B), IF(A, A), IF(A, OR(A, B)), IF(AND(A, B), B), NOT(AND(A, NOT(A)))];
export const NEVER_POOL: readonly Sen[] = [AND(A, NOT(A)), AND(NOT(B), B), NOT(OR(A, NOT(A))), AND(AND(A, B), NOT(A)), AND(B, AND(A, NOT(B)))];
export const MOST_POOL: readonly Sen[] = [OR(A, B), OR(NOT(A), B), IF(A, B), NOT(AND(A, B)), OR(A, NOT(B))];
export const SOME_POOL: readonly Sen[] = [AND(A, B), AND(NOT(A), NOT(B)), AND(A, NOT(B)), IF(A, NOT(A))];
/** The pass tag of Lesson 5: a sentence true in most rows, not all. */
export const MOST_ROWS = { tag: 'most-rows', label: 'a sentence true in most rows, but not every row' } as const;

export const KIND_CHOICES: Choice[] = [{ id: 'always', label: 'Always true' }, { id: 'sometimes', label: 'Sometimes true' }, { id: 'never', label: 'Never true' }];
const KIND_WORD: Record<Kind, string> = { always: 'always true', sometimes: 'sometimes true', never: 'never true' };

function kindTeach(s: Sen, n: number, names: readonly string[], t?: Topic): Teach {
  return sentenceTeach(s, n, names, t, {
    rule: 'Always true means True in every row. Never true means False in every row. Anything else is sometimes true.',
    terms: [T_ROW, T_ALWAYS, T_NEVER, T_SOMETIMES, ...opTerms(s)],
    remember: ['One False row is enough to say “not always true.” One True row is enough to say “not never true.”', 'Ask: “Is there a row where it is True? A row where it is False?”'],
  });
}

/** Is this sentence always, sometimes or never true? */
export function kindItem(rng: Rng, o: TableOptions & { want?: Kind | 'most' }): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t);
  const want = o.want ?? rng.pick(['always', 'never', 'most', 'sometimes'] as const);
  const s = rng.pick(want === 'always' ? ALWAYS_POOL : want === 'never' ? NEVER_POOL : want === 'most' ? MOST_POOL : SOME_POOL);
  const n = partsIn(s);
  const rows = rowsFor(n);
  const c = column(s, n);
  const kind = kindOf(s, n);
  const trueRows = c.flatMap((v, k) => (v ? [k] : []));
  const falseRows = c.flatMap((v, k) => (v ? [] : [k]));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of KIND_CHOICES) {
    if (ch.id === kind) continue;
    if (ch.id === 'always') {
      const k = falseRows[0];
      feedback.always = {
        headline: trueRows.length ? `Your answer says always true, but ${quote(s, names)} is False in ${rowsWord(falseRows)}.` : `Your answer says always true, but ${quote(s, names)} is False in every row.`,
        detail: [...(trueRows.length ? [`It is True in ${rowsWord(trueRows)}. ${trueRows.length > falseRows.length ? 'Most rows is not every row.' : 'That is not every row.'}`] : []), `Look at row ${k + 1}.`, ...chain(s, rows[k], names)],
        example: rowCase([s], rows[k], k, names, { topic: t }),
      };
    } else if (ch.id === 'never') {
      const k = trueRows[0];
      feedback.never = {
        headline: `Your answer says never true, but ${quote(s, names)} is True in ${rowsWord(trueRows)}.`,
        detail: [`Look at row ${k + 1}.`, ...chain(s, rows[k], names)],
        example: rowCase([s], rows[k], k, names, { topic: t }),
      };
    } else {
      const k = 0;
      feedback.sometimes = {
        headline: `Your answer says sometimes true, but ${quote(s, names)} is ${kind === 'always' ? 'True' : 'False'} in every row.`,
        detail: [`${columnWords(s, n, names)}`, `There is no row where it is ${kind === 'always' ? 'False' : 'True'}.`],
        example: rowCase([s], rows[k], k, names, { topic: t }),
      };
    }
  }
  const hk = kind === 'sometimes' ? (c[0] === c[1] ? 0 : 0) : rows.length - 1;
  return done('always', {
    kind: 'choose',
    prompt: `${opening(t, n, names)} Is ${quote(s, names)} always true, sometimes true, or never true?`,
    scene: tableScene({ names, n, cols: [s], topic: t, blank: () => true, caption: 'Fill the column. Then look at every row.' }),
    choices: KIND_CHOICES,
    answer: kind,
    explain: `${columnWords(s, n, names)} So it is ${KIND_WORD[kind]}.`,
    feedback,
    hint: 'Here is one row, worked out. Fill the other rows the same way.',
    hintCase: rowCase([s], rows[hk], hk, names, { topic: t }),
    teach: kindTeach(s, n, names, t),
    ...(want === 'most' ? { conflict: true, tags: [MOST_ROWS.tag] } : {}),
  }, { sens: [s], names, n, topic: t });
}

/** Which sentence is always true? One always true, one never true, and two sometimes true (one in most rows). */
export function pickAlwaysItem(rng: Rng, o: TableOptions): TableMade {
  const skin: Skin = o.skin === 'cards' ? 'letters' : o.skin;
  const t = pickTopic(rng, skin, o.avoid);
  const names = namesFor(t);
  const right = rng.pick(ALWAYS_POOL);
  const wrongs = [rng.pick(NEVER_POOL), rng.pick(MOST_POOL), rng.pick(SOME_POOL)];
  const n = Math.max(...[right, ...wrongs].map(partsIn));
  const rows = rowsFor(n);
  const choices = rng.shuffle([right, ...wrongs]).map((x) => ({ id: senId(x, names), label: say(x, names) }));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) {
    const c = column(w, n);
    const k = c.findIndex((v) => !v);
    const trueRows = c.flatMap((v, j) => (v ? [j] : []));
    feedback[senId(w, names)] = {
      headline: trueRows.length ? `Your answer is False in ${rowsWord(c.flatMap((v, j) => (v ? [] : [j])))}, so it is not always true.` : 'Your answer is False in every row, so it is not always true.',
      detail: [...(trueRows.length ? [`It is True in ${rowsWord(trueRows)}, but not in every row.`] : ['It is never true.']), `Look at row ${k + 1}.`, ...chain(w, rows[k], names)],
      example: rowCase([w], rows[k], k, names, { topic: t }),
    };
  }
  return done('always', {
    kind: 'choose',
    prompt: `${opening(t, n, names)} Which sentence is always true?`,
    scene: tableScene({ names, n, topic: t, caption: 'Every case, one row each. Try each sentence in every row.' }),
    choices,
    answer: senId(right, names),
    explain: `${columnWords(right, n, names)} Each other choice is False in at least one row.`,
    feedback,
    hint: 'Here is one choice, worked out in one row. Look for a False row in each choice.',
    hintCase: rowCase([wrongs[1]], rows[column(wrongs[1], n).findIndex((v) => v)], column(wrongs[1], n).findIndex((v) => v), names, { topic: t }),
    teach: kindTeach(right, n, names, t),
    seconds: SECONDS,
  }, { sens: [right, ...wrongs], names, n, topic: t });
}

// ---------- the closing why item: a reason, picked from reasons ----------

/** Two sentences each true in three rows of four that still differ: the why item's “most rows” counterexample. */
const MOST_A = OR(A, B);
const MOST_B = OR(NOT(A), B);

export type WhyKind = 'same' | 'differ' | 'if-row' | 'always';
export const WHY_KINDS: readonly WhyKind[] = ['same', 'differ', 'if-row', 'always'];
/** The lesson each why item is about. */
export const WHY_LESSON: Record<WhyKind, string> = { same: 's9.l4', differ: 's9.l4', 'if-row': 's9.l3', always: 's9.l5' };
const WHY_TAG: Record<WhyKind, string> = { same: 'same', differ: 'same', 'if-row': 'if-table', always: 'always' };

/** Why does it hold? Four reasons, one right, each wrong one with the case that shows it fails. Tagged why. */
export function whyItem(rng: Rng, o: { kind?: WhyKind; skin?: Skin } = {}): TableMade & { why: WhyKind } {
  const kind = o.kind ?? rng.pick(WHY_KINDS);
  const skin: Skin = o.skin && o.skin !== 'cards' ? o.skin : rng.pick(['letters', 'letters', 'everyday', 'fantasy'] as const);
  const t = pickTopic(rng, skin);
  const rows = rowsFor(2);
  let made: TableMade;
  if (kind === 'same' || kind === 'differ') {
    const names = namesFor(t);
    const [s, u] = kind === 'same' ? rng.pick(SAME_PAIRS) : rng.pick(TRAP_PAIRS);
    const S = quote(s, names), U = quote(u, names);
    const diff = differRows(s, u, 2);
    const agree = rows.flatMap((_, j) => (diff.includes(j) ? [] : [j]));
    const lookAlike = TRAP_PAIRS.find(([x]) => sameColumn(x, s, 2))?.[1] ?? OTHER_PAIRS.find(([x]) => sameColumn(x, s, 2))?.[1] ?? AND(NOT(A), NOT(B));
    const la = differRows(s, lookAlike, 2);
    const laAgree = rows.flatMap((_, j) => (la.includes(j) ? [] : [j]));
    let choices: Choice[];
    let answer: string;
    const feedback: Record<string, ChoiceFeedback> = {};
    if (kind === 'same') {
      choices = [
        { id: 'every', label: 'Their columns match in every row of the table.' },
        { id: 'first', label: 'They agree in the first row of the table.' },
        { id: 'look', label: 'They use the same letters and the same words.' },
        { id: 'most', label: 'Both of them are true in most rows.' },
      ];
      answer = 'every';
      feedback.first = {
        headline: 'Your reason looks at one row, but agreeing in one row is not enough.',
        detail: [`${quote(s, names)} and ${quote(lookAlike, names)} agree in ${rowsWord(laAgree)} too, and they do not mean the same.`, 'Two sentences mean the same only when they agree in every row.'],
        example: rowCase([s, lookAlike], rows[la[0]], la[0], names, { topic: t, note: `They differ here, so agreeing in row 1 proved nothing.` }),
      };
      feedback.look = {
        headline: 'Your reason looks at the words, but sentences that look alike can still differ.',
        detail: [`${quote(lookAlike, names)} uses the same letters and words as ${quote(s, names, '.')} Yet it differs in ${rowsWord(la)}.`, 'Only the columns tell you. Check every row.'],
        example: rowCase([s, lookAlike], rows[la[0]], la[0], names, { topic: t, note: 'They look alike, but they differ in this row.' }),
      };
      feedback.most = {
        headline: 'Your reason counts True rows, but two sentences can both be true in most rows and still differ.',
        detail: [`${quote(MOST_A, names)} and ${quote(MOST_B, names)} are each True in three rows. Yet they differ in ${rowsWord(differRows(MOST_A, MOST_B, 2))}.`, 'What matters is that they agree in every row, True or False.'],
        example: rowCase([MOST_A, MOST_B], rows[differRows(MOST_A, MOST_B, 2)[0]], differRows(MOST_A, MOST_B, 2)[0], names, { topic: t, note: 'Both are true in most rows, yet they differ here.' }),
      };
    } else {
      const k = diff[0];
      choices = [
        { id: 'row', label: `In row ${k + 1}, one of them is true and the other is false.` },
        { id: 'all', label: 'They differ in every row of the table.' },
        { id: 'brackets', label: 'One has brackets, so they can’t mean the same.' },
        { id: 'first', label: 'They differ in the first row of the table.' },
      ];
      answer = 'row';
      feedback.all = {
        headline: `Your reason says they differ in every row, but they agree in ${rowsWord(agree)}.`,
        detail: [`In row ${agree[0] + 1}, ${reason(s, rows[agree[0]], names)} ${reason(u, rows[agree[0]], names)}`, `They differ in ${rowsWord(diff)}. One such row is enough.`],
        example: rowCase([s, u], rows[agree[0]], agree[0], names, { topic: t, note: 'They agree here.' }),
      };
      const bracketTwin = SAME_PAIRS.find(([x]) => sameColumn(x, s, 2) || sameColumn(x, u, 2)) ?? SAME_PAIRS[0];
      feedback.brackets = {
        headline: 'Your reason looks at the brackets, but brackets alone do not decide it.',
        detail: [`${quote(bracketTwin[0], names)} has brackets and ${quote(bracketTwin[1], names)} does not. Yet they mean the same.`, 'Only the columns tell you. Here they differ in a row.'],
        example: rowCase([s, u], rows[k], k, names, { topic: t, note: 'This row is what shows they differ.' }),
      };
      feedback.first = {
        headline: 'Your reason names row 1, but in row 1 they agree.',
        detail: [`${reason(s, rows[0], names)} ${reason(u, rows[0], names)}`, `They differ in ${rowsWord(diff)}.`],
        example: rowCase([s, u], rows[0], 0, names, { topic: t, note: 'Both have the same value here.' }),
      };
    }
    const prompt = kind === 'same' ? `${S} means the same as ${quote(u, names, '.')} Why?` : `${S} does not mean the same as ${quote(u, names, '.')} Why not?`;
    made = done(WHY_TAG[kind], {
      kind: 'choose',
      prompt: `${opening(t, 2, names)} ${prompt}`,
      scene: tableScene({ names, n: 2, cols: [s, u], topic: t, caption: 'Both columns, filled in.' }),
      choices: rng.shuffle(choices),
      answer,
      explain: kind === 'same' ? `Two sentences mean the same when their columns match in every row. ${S} and ${U} do.` : `They differ in ${rowsWord(diff)}. One row where they differ is enough to say they do not mean the same.`,
      feedback,
      hint: 'Here is one row, worked out. Ask what it takes for two sentences to mean the same.',
      hintCase: rowCase([s, u], rows[agree[0] ?? 0], agree[0] ?? 0, names, { topic: t }),
      teach: pairTeach(s, u, names, t),
      seconds: SECONDS,
      tags: ['why'],
    }, { sens: [s, u], names, n: 2, topic: t });
  } else if (kind === 'if-row') {
    const names = namesFor(t, true);
    const s = IF_PQ;
    // A row where the IF part is false (the same pick as before: two rows, in table order).
    const k = rng.pick(rows.flatMap((x, j) => (!x[0] ? [j] : [])));
    const r = rows[k];
    const choices: Choice[] = [
      { id: 'asks', label: 'The IF part is false, so the sentence asks for nothing and nothing breaks it.' },
      { id: 'then', label: 'Q is false, and a false THEN part always makes it true.' },
      { id: 'always', label: 'An IF sentence is true in every row of its table.' },
      { id: 'match', label: 'P and Q have the same value in this row.' },
    ];
    // Worked out from the table: the one row that breaks it, and a row where the IF part is false and the parts differ.
    const kb = rows.findIndex((x) => !holds(s, x));
    const tf2 = rows[kb];
    const km = rows.findIndex((x) => !x[0] && x[0] !== x[1] && holds(s, x));
    const feedback: Record<string, ChoiceFeedback> = {
      then: {
        headline: `Your reason says a false THEN part makes it true, but row ${kb + 1} has a false THEN part and is False.`,
        detail: [reason(s, tf2, names), 'What makes this row True is the IF part being false.'],
        example: rowCase([s], tf2, kb, names, { topic: t }),
      },
      always: {
        headline: `Your reason says an IF sentence is always true, but row ${kb + 1} is False.`,
        detail: [reason(s, tf2, names), 'IF … THEN is False in one row only.'],
        example: rowCase([s], tf2, kb, names, { topic: t }),
      },
      match: {
        headline: `Your reason says P and Q match, but row ${km + 1} has them different and is still True.`,
        detail: [reason(s, rows[km], names), 'Matching parts is not the test. The IF part being false is.'],
        example: rowCase([s], rows[km], km, names, { topic: t }),
      },
    };
    const story = t.skin === 'letters' ? '' : ` That is: ${rowWords(r, names, t)}.`;
    made = done('if-table', {
      kind: 'choose',
      prompt: `${opening(t, 2, names)} In row ${k + 1}, ${rowSentence(r, names)}.${story} ${quote(s, names)} is ${TF(holds(s, r))} there. Why?`,
      scene: tableScene({ names, n: 2, cols: [s], topic: t, marked: [k], markLabel: 'This row' }),
      choices: rng.shuffle(choices),
      answer: 'asks',
      explain: reason(s, r, names),
      feedback,
      hint: 'Here is the row that breaks the sentence. Compare it with this row.',
      hintCase: rowCase([s], tf2, kb, names, { topic: t }),
      teach: sentenceTeach(s, 2, names, t),
      tags: ['why'],
    }, { sens: [s], names, n: 2, topic: t, row: k });
  } else {
    const names = namesFor(t);
    const s = rng.pick([OR(A, NOT(A)), OR(NOT(A), A)]);
    const r1 = rowsFor(1);
    const choices: Choice[] = [
      { id: 'every', label: `It is true in every row: when ${names[0]} is false, NOT ${names[0]} is true.` },
      { id: 'or', label: 'It has OR in it, and an OR sentence is always true.' },
      { id: 'first', label: 'It is true in the first row of its table.' },
      { id: 'part', label: `${names[0]} is always true, so the sentence is too.` },
    ];
    const four = rowsFor(2);
    const feedback: Record<string, ChoiceFeedback> = {
      or: {
        headline: `Your reason says OR makes it always true, but ${quote(OR(A, B), names)} is False in row 4.`,
        detail: [reason(OR(A, B), four[3], names), `${quote(s, names)} is always true because one of its parts is true in every row.`],
        example: rowCase([OR(A, B)], four[3], 3, names, { topic: t }),
      },
      first: {
        headline: 'Your reason looks at one row, but always true means every row.',
        detail: [`${names[0]} alone is true in the first row too, but it is false in row 2.`, `${quote(s, names)} is true in row 2 as well. That is what makes it always true.`],
        example: rowCase([s], r1[1], 1, names, { topic: t }),
      },
      part: {
        headline: `Your reason says ${names[0]} is always true, but ${names[0]} is false in row 2.`,
        detail: [reason(s, r1[1], names), `Even when ${names[0]} is false, the sentence is true.`],
        example: rowCase([s], r1[1], 1, names, { topic: t }),
      },
    };
    made = done('always', {
      kind: 'choose',
      prompt: `${opening(t, 1, names)} ${quote(s, names)} is always true. Why?`,
      scene: tableScene({ names, n: 1, cols: [s], topic: t }),
      choices: rng.shuffle(choices),
      answer: 'every',
      explain: `${columnWords(s, 1, names)} When ${names[0]} is true, the first part makes it true. When ${names[0]} is false, NOT ${names[0]} does.`,
      feedback,
      hint: 'Here is row 2, worked out. Ask why the sentence is true even there.',
      hintCase: rowCase([s], r1[1], 1, names, { topic: t }),
      teach: kindTeach(s, 1, names, t),
      tags: ['why'],
    }, { sens: [s], names, n: 1, topic: t });
  }
  return { ...made, why: kind };
}

// ---------- the warm-up: a Stop 2 card and NOT (A AND B) ----------

/**
 * Back to NOT, AND, OR: does this card fit NOT (A AND B)? One card is one row of the table. Answered with rules.ts
 * evaluate; the table's row must agree.
 */
export function bridgeItem(rng: Rng): TableMade {
  const [f, g] = rng.pick(FEATURE_PAIRS);
  const t = cardTopic(f, g);
  const names = namesFor(t);
  const s = NOT(AND(A, B));
  const rule = toFormula(s, t.feats!);
  const card = rng.pick(ALL_CARDS);
  const fits = evaluate(rule, card);
  const r = cardRow(card, t.feats!);
  if (fits !== holds(s, r)) throw new Error('bridgeItem: the card and the table disagree');
  const rows = rowsFor(2);
  const k = rows.findIndex((x) => sameRow(x, r));
  const R = `“${cardRender(rule)}”`;
  const steps = chain(s, r, names);
  // The warm-up comes before Lesson 1, so a case is named by its card, never by a table row.
  const caseOf = (c: Card): TeachCase => {
    const cr = cardRow(c, t.feats!);
    const j = rows.findIndex((x) => sameRow(x, cr));
    return { ...rowCase([s], cr, j, names, { topic: t }), label: `The ${cardName(c)}: ${rowSentence(cr, names, t)}.`, things: [thingOf(c)] };
  };
  // One card of each kind, for the teaching (the card asked about stands for its own kind).
  const kinds = rows.map((x) => (sameRow(x, r) ? card : ALL_CARDS.find((c) => sameRow(cardRow(c, t.feats!), x))!));
  const other = kinds.find((_c, j) => j !== k && holds(s, rows[j]) !== fits) ?? kinds[(k + 1) % 4];
  return done('fill', {
    kind: 'choose',
    prompt: `Back to NOT, AND, OR. Does the ${cardName(card)} fit the rule ${R}?`,
    scene: { kind: 'things', things: [thingOf(card)] },
    choices: [{ id: 'yes', label: 'Yes, it fits' }, { id: 'no', label: 'No, it does not fit' }],
    answer: fits ? 'yes' : 'no',
    explain: steps.join(' '),
    feedback: {
      [fits ? 'no' : 'yes']: {
        headline: fits
          ? `Your answer says it does not fit, but ${quote(AND(A, B), names)} is false for this card, so NOT makes it true.`
          : `Your answer says it fits, but this card is ${listAnd(names)}, so ${quote(NOT(AND(A, B)), names)} is false.`,
        detail: [`Do the brackets first. The ${cardName(card)} is ${rowSentence(r, names, t)}.`, ...steps],
        example: caseOf(card),
      },
    },
    hint: 'Here is a different card, worked out. Do the brackets first, then the NOT.',
    hintCase: caseOf(other),
    teach: {
      rule: 'Do the brackets first. Find out if the card fits the inside. Then NOT flips it.',
      terms: [T_NOT, T_AND, { word: 'A kind of card', meaning: `the cards that match on each word in the rule. Every card that is ${rowSentence(r, names, t)} is one kind.` }],
      meaning: `${R} fits every card that is not both ${listAnd(names)}.`,
      casesTitle: 'One card of each kind',
      cases: kinds.map(caseOf),
      remember: ['Brackets first, then NOT.', 'Ask: “Is the card both of these? If so, NOT makes it not fit.”'],
      simpler: [`Look at the ${cardName(card)}.`, ...steps],
    },
  }, { sens: [s], names, n: 2, topic: t, card, rules: [rule, rule] });
}
