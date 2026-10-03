/**
 * Stop 3 line-up engine. Every answer is re-derived here by brute force (all orders of the people,
 * checked with clueHolds), independent of the helpers the engine uses to build items.
 *
 * The teaching after a wrong answer (Item.teach, ChooseItem.feedback) is re-checked with a second clue
 * evaluator written here (`holds`): every truth a case card shows, every note under it, every order a
 * message quotes and every smallest example is checked against its own computation.
 */
import { describe, expect, it } from 'vitest';
import { L1_DRILL, L2_DRILL, L2_TYPES, L3_DRILL, L3_FIRST_TYPES, L3_TYPES, L4_DRILL, L4_FIRST_TYPES, L5_DRILL, stop3 } from '../../content/stop3';
import { checkDrill, drillSpeech, marksToTap, passState } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import { clueHolds, grade } from '../grade';
import {
  CANT,
  ORDERLY,
  ORDINALS,
  SKINS,
  SKIN_IDS,
  TAUGHT_TYPES,
  type ClueType,
  buildPuzzle,
  buildSimpler,
  chainPuzzle,
  chainSimpler,
  clueId,
  clueText,
  extraCluePuzzle,
  extraSimpler,
  forceClues,
  spotPuzzle,
  spotSimpler,
  statusPuzzle,
  statusSimpler,
  trueClues,
  type SkinId,
  type SpotFocus,
  type Status,
} from '../puzzles/lineup';
import { READING, fkGrade, longestSentence, sentences, words } from '../readability';
import { createRng } from '../rng';
import { caseText, feedbackText, teachStrings } from '../teach';
import { explanationFor, explanationSpeech } from '../../game/explanation';
import type { ChooseItem, DrillMark, DrillRow, DrillStep, Item, LineClue, TeachCase } from '../types';

const SEEDS = 300;

function perms(xs: string[]): string[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
const fitting = (ids: string[], clues: readonly LineClue[]) => perms(ids).filter((p) => clues.every((c) => clueHolds(c, p)));
const same = (a: readonly string[], b: readonly string[]) => a.join('|') === b.join('|');
/** Everyone named in a puzzle has a different first letter. */
const distinctInitials = (ids: string[]) => new Set(ids.map((id) => id[0])).size === ids.length;
const skinAt = (seed: number, pool: readonly SkinId[] = SKIN_IDS) => pool[seed % pool.length];

/** Orders quoted in a message ("the order Ava, Ben, Cal"), as ids. */
function quotedOrders(text: string): string[][] {
  return [...text.matchAll(/[Tt]he order ((?:[A-Z][a-z]*, )+[A-Z][a-z]*)/g)].map((m) => m[1].split(', ').map((s) => s.toLowerCase()));
}

/** Every string a player can read for an item: prompt, explain, hint, labels, clues, why-wrong and all teaching. */
function playerText(item: Item): string[] {
  const whyWrong = item.kind === 'choose' ? Object.values(item.whyWrong ?? {}) : [];
  const labels = item.kind === 'choose' ? item.choices.map((c) => c.label) : [];
  const scene = item.scene?.kind === 'clues' ? item.scene.clues : [];
  return [item.prompt, item.explain, item.hint ?? '', ...whyWrong, ...labels, ...scene, ...teachStrings(item)];
}

function cleanText(item: Item) {
  const all = playerText(item).join(' ');
  expect(all).not.toMatch(/undefined|NaN|\{list\}|\s\s|\.\./);
  // Curly apostrophes and quotes only.
  expect(all).not.toMatch(/['"]/);
  // The screen already shows a "Not yet" heading, so the message must not repeat it.
  if (item.kind === 'choose') for (const msg of Object.values(item.whyWrong ?? {})) expect(msg).not.toMatch(/^Not yet/);
}

function whyWrongCoversWrongChoices(item: ChooseItem) {
  const wrong = item.choices.map((c) => c.id).filter((id) => id !== item.answer);
  expect(Object.keys(item.whyWrong ?? {}).sort()).toEqual(wrong.sort());
  expect(Object.keys(item.feedback ?? {}).sort()).toEqual(wrong.sort());
  for (const id of wrong) expect(item.whyWrong![id]).toBe(feedbackText(item.feedback![id]));
}

// ---------- a second clue evaluator, and checks for case cards ----------

/** Written apart from clueHolds: 1-based spots and signed gaps. Full orders only. */
function holds(c: LineClue, order: readonly string[]): boolean {
  const at = new Map(order.map((id, i) => [id, i + 1]));
  const A = at.get(c.a)!;
  const n = order.length;
  const gap = (x: string) => at.get(x)! - A;
  switch (c.t) {
    case 'before': return gap(c.b) > 0;
    case 'rightBefore': return gap(c.b) === 1;
    case 'nextTo': return Math.abs(gap(c.b)) === 1;
    case 'notNextTo': return Math.abs(gap(c.b)) > 1;
    case 'between': return gap(c.b) * gap(c.c) < 0;
    case 'first': return A === 1;
    case 'last': return A === n;
    case 'notFirst': return A > 1;
    case 'notLast': return A < n;
    case 'place': return A === c.k;
  }
}
const fitHolds = (ids: string[], clues: readonly LineClue[]) => perms(ids).filter((p) => clues.every((c) => holds(c, p)));
const brokenHolds = (clues: readonly LineClue[], order: readonly string[]) => clues.flatMap((c, i) => (holds(c, order) ? [] : [i]));
const sceneClues = (item: Item) => (item.scene?.kind === 'clues' ? item.scene.clues : []);
const LINE_LABELS = new Set(SKIN_IDS.map((s) => SKINS[s].lineLabel));
/** "clue 2", "clues 1 and 3" -> [1], [0, 2]. */
const nums = (s: string) => [...s.matchAll(/\d+/g)].map((m) => Number(m[0]) - 1);
const CLUES_FALSE = /[Cc]lues? (\d+(?:(?:, | and )\d+)*) (?:is|are) false/;

interface Ctx {
  ids: string[];
  clues: readonly LineClue[];
  texts: readonly string[];
  stmt?: LineClue;
  stmtText?: string;
  /** The picked answer as a placement, for "Your answer" truths. */
  claim?: LineClue;
  /** The right line, for "This is the right line with … swapped." */
  answer?: readonly string[];
}

interface Checked {
  order: string[];
  broken: number[];
  shown: number[];
  your?: boolean;
  sentence?: boolean;
}

/**
 * Re-check one case card: the line in its label, every truth it shows (against `holds`), and every claim its
 * note makes. Returns what it found so the caller can check what the card is meant to show.
 */
function checkCase(c: TeachCase, ctx: Ctx): Checked {
  const m = /^([A-Z][a-z ]+): ((?:[A-Za-z]+, )+[A-Za-z]+)\.$/.exec(c.label);
  expect(m, c.label).not.toBeNull();
  expect(LINE_LABELS.has(m![1]), c.label).toBe(true);
  const order = m![2].split(', ').map((s) => s.toLowerCase());
  expect([...order].sort(), c.label).toEqual([...ctx.ids].sort());
  const broken = brokenHolds(ctx.clues, order);
  const out: Checked = { order, broken, shown: [] };
  for (const t of c.truths ?? []) {
    let x: RegExpExecArray | null;
    if ((x = /^Clue (\d+), “(.+)”$/.exec(t.who))) {
      const i = Number(x[1]) - 1;
      expect(`${x[2]}.`).toBe(ctx.texts[i]);
      expect(t.value, `${c.label} ${t.who}`).toBe(holds(ctx.clues[i], order));
      out.shown.push(i);
    } else if ((x = /^The sentence, “(.+)”$/.exec(t.who))) {
      expect(`${x[1]}.`).toBe(ctx.stmtText);
      expect(t.value, `${c.label} ${t.who}`).toBe(holds(ctx.stmt!, order));
      out.sentence = t.value;
    } else if (/^Your answer, “.+”$/.test(t.who)) {
      expect(ctx.claim, 'a Your answer truth needs a picked answer').toBeDefined();
      expect(t.value, `${c.label} ${t.who}`).toBe(holds(ctx.claim!, order));
      out.your = t.value;
    } else {
      throw new Error(`unknown truth: ${t.who}`);
    }
  }
  // Clue truths are listed in clue order, without repeats.
  expect(out.shown).toEqual([...new Set(out.shown)].sort((a, b) => a - b));
  // A card lists every clue (a line that fits), or exactly the clues the line breaks: never a mix.
  const all = ctx.clues.map((_, i) => i);
  expect(out.shown.length === all.length && !broken.length ? true : same(out.shown.map(String), broken.map(String)), `${c.label} shows ${out.shown}, breaks ${broken}`).toBe(true);
  const note = c.note ?? '';
  if (/Every clue is true here|This order fits every clue|This is the only line that fits/.test(note)) expect(broken, note).toEqual([]);
  const f = CLUES_FALSE.exec(note);
  if (f) expect(nums(f[1]), `${c.label} ${note}`).toEqual(broken);
  if (/does not fit/.test(note)) expect(broken.length).toBeGreaterThan(0);
  const sw = /This is the right line with (\w+) and (\w+) swapped\. That breaks (clues? [\d, and]+)\./.exec(note);
  if (sw) {
    expect(nums(sw[3])).toEqual(broken);
    expect(ctx.answer, 'a swap note needs the right line').toBeDefined();
    const right = [...ctx.answer!];
    const [i, j] = [right.indexOf(sw[1].toLowerCase()), right.indexOf(sw[2].toLowerCase())];
    [right[i], right[j]] = [right[j], right[i]];
    expect(order).toEqual(right);
  }
  if (/The other clues are still true/.test(note)) expect(broken).toEqual(out.shown);
  const cov = /With clue (\d+) covered, this order fits too/.exec(note);
  if (cov) expect(broken).toEqual([Number(cov[1]) - 1]);
  const still = /With clue (\d+) covered, this is still the only order that fits/.exec(note);
  if (still) {
    const k = Number(still[1]) - 1;
    expect(fitHolds(ctx.ids, ctx.clues.filter((_, j) => j !== k))).toEqual([order]);
  }
  if (/Every clue but yours is true here/.test(note)) expect(broken.length).toBe(1);
  // "Zap is between Tik and Rivet." names exactly who stands between the two.
  const btw = /([A-Z]\w*(?:, [A-Z]\w*)*(?: and [A-Z]\w*)?) (?:is|are) between ([A-Z]\w*) and ([A-Z]\w*)\./.exec(note);
  if (btw) {
    const [i, j] = [order.indexOf(btw[2].toLowerCase()), order.indexOf(btw[3].toLowerCase())].sort((a, b) => a - b);
    expect(btw[1].split(/, | and /).map((s) => s.toLowerCase()).sort()).toEqual(order.slice(i + 1, j).sort());
  }
  return out;
}

/** The orders a message quotes, re-checked against what the sentence around them claims. */
function checkDetail(lines: readonly string[], ctx: Ctx) {
  for (const line of lines) {
    for (const sentenceText of line.split(/(?<=\.)\s+(?=[A-Z])/)) {
      const fits = /[Tt]he order ((?:[A-Z][a-z]*, )+[A-Z][a-z]*)(?: \([a-z ]+\))? fits every clue\b/.exec(sentenceText);
      if (fits) expect(brokenHolds(ctx.clues, fits[1].toLowerCase().split(', ')), sentenceText).toEqual([]);
    }
    const think = /[Tt]hink of the order ((?:[A-Z][a-z]*, )+[A-Z][a-z]*)(?: \([a-z ]+\))?\. (.*)$/.exec(line);
    if (think) {
      const order = think[1].toLowerCase().split(', ');
      const rest = think[2];
      if (/^Every clue is true there/.test(rest)) expect(brokenHolds(ctx.clues, order), line).toEqual([]);
      const f = CLUES_FALSE.exec(rest);
      if (f) expect(nums(f[1]), line).toEqual(brokenHolds(ctx.clues, order));
    }
  }
}

/** Every item carries the whole teaching: a rule, 1-3 terms, a meaning, 2-4 cases, a remember line and a question, a simpler example. */
function checkTeachShape(item: Item) {
  const t = item.teach!;
  expect(t, item.id).toBeDefined();
  expect(t.rule.length).toBeGreaterThan(10);
  expect(t.terms!.length).toBeGreaterThanOrEqual(1);
  expect(t.terms!.length).toBeLessThanOrEqual(4);
  // Any panel text that says a clue "breaks" defines the word first.
  const panel = [item.explain, ...teachStrings(item)].join(' ');
  if (/\bbreak/i.test(panel)) expect(t.terms!.map((x) => x.word), `${item.id} uses “break”`).toContain('To break a clue');
  expect(new Set(t.terms!.map((x) => x.word)).size).toBe(t.terms!.length);
  expect(t.meaning!.length).toBeGreaterThan(10);
  expect(t.casesTitle!.length).toBeGreaterThan(5);
  expect(t.cases!.length).toBeGreaterThanOrEqual(2);
  expect(t.cases!.length).toBeLessThanOrEqual(4);
  expect(t.remember!.length).toBe(2);
  expect(t.remember![1]).toMatch(/^Ask: “.+\?”$/);
  expect(t.simpler!.length).toBeGreaterThanOrEqual(3);
}

/** Headline -> mistake kind, across many items: no headline may stand for two different mistakes. */
function headlinesDifferByKind(byKind: Map<string, Set<string>>) {
  const owner = new Map<string, string>();
  for (const [kind, heads] of byKind) {
    for (const h of heads) {
      expect(owner.get(h) ?? kind, `“${h}” is used for ${owner.get(h)} and ${kind}`).toBe(kind);
      owner.set(h, kind);
    }
  }
}
const note = (byKind: Map<string, Set<string>>, kind: string, headline: string) => {
  if (!byKind.has(kind)) byKind.set(kind, new Set());
  byKind.get(kind)!.add(headline);
};

describe('clue text', () => {
  it('every skin says every clue type it allows as one clear sentence', () => {
    for (const id of SKIN_IDS) {
      const skin = SKINS[id];
      const order = skin.pool.slice(0, 5).map((s) => s.toLowerCase());
      const nm = (x: string) => skin.pool.find((p) => p.toLowerCase() === x)!;
      const clues = trueClues(order, skin.types);
      expect(new Set(clues.map((c) => c.t))).toEqual(new Set(skin.types));
      const texts = clues.map((c) => clueText(skin, c, 5, nm));
      for (const t of texts) {
        expect(t).toMatch(/^[A-Z][^.]*[A-Za-z]\.$/);
        expect(t).not.toMatch(/undefined|NaN/);
      }
      // Different clues never read the same.
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('name pools never repeat a first letter', () => {
    for (const id of SKIN_IDS) {
      const pool = SKINS[id].pool;
      expect(new Set(pool.map((p) => p[0])).size).toBe(pool.length);
    }
  });

  it('heights and dragons never use "right before", "next to" or "between"', () => {
    for (const id of ['height', 'dragons'] as const) {
      expect(SKINS[id].types).not.toContain('rightBefore');
      expect(SKINS[id].types).not.toContain('nextTo');
      expect(SKINS[id].types).not.toContain('between');
    }
  });

  it('the test’s own clue checker agrees with clueHolds on every order of five', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    for (const order of perms(ids)) {
      for (const c of trueClues(['a', 'b', 'c', 'd', 'e'], SKINS.race.types)) expect(holds(c, order)).toBe(clueHolds(c, order));
    }
  });

  it('every skin defines, in its own words, each clue type it can say that needs defining', () => {
    for (const id of SKIN_IDS) {
      const skin = SKINS[id];
      for (const t of skin.types) {
        if (t === 'first' || t === 'last' || t === 'place') continue;
        const term = skin.terms[t];
        expect(term, `${id} ${t}`).toBeDefined();
        expect(term![0]).toMatch(/^“[A-Z].*”$|^To /);
        expect(term![1]).toMatch(/^[a-z].*\.$/);
      }
    }
  });
});

describe('forceClues', () => {
  it('draws true clues that force exactly the hidden order, and every clue is needed', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = createRng(seed);
      const skin = SKINS[skinAt(seed)];
      const n = 3 + (seed % 3);
      const order = rng.shuffle(skin.pool.slice(0, n).map((s) => s.toLowerCase()));
      const clues = forceClues(rng, order, skin.types);
      for (const c of clues) {
        expect(clueHolds(c, order)).toBe(true);
        expect(skin.types).toContain(c.t);
      }
      const fits = fitting(order, clues);
      expect(fits.length).toBe(1);
      expect(fits[0]).toEqual(order);
      clues.forEach((_, i) => expect(fitting(order, clues.filter((_, j) => j !== i)).length, `seed ${seed} clue ${i}`).toBeGreaterThan(1));
    }
  });
});

describe('lesson 1: chains', () => {
  it('the answer is a name only when that person is first (or last) in every order that fits', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const cantTell of [false, true]) {
        const p = chainPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), cantTell });
        const { item, ids, clues, ask } = p;
        expect(distinctInitials(ids)).toBe(true);
        expect(clues.every((c) => c.t === 'before')).toBe(true);
        expect(clues.length).toBeGreaterThanOrEqual(2);
        expect(clues.length).toBeLessThanOrEqual(3);
        const fits = fitting(ids, clues);
        const at = (o: string[]) => (ask === 'first' ? o[0] : o[o.length - 1]);
        // Exactly one choice is right.
        const right = item.choices.filter((c) => (c.id === CANT ? new Set(fits.map(at)).size > 1 : fits.every((o) => at(o) === c.id)));
        expect(right.map((c) => c.id)).toEqual([item.answer]);
        expect(item.answer === CANT).toBe(cantTell);
        expect(!!item.conflict).toBe(cantTell);
        whyWrongCoversWrongChoices(item);
        cleanText(item);
        // "P could be first, but so could Q (and R)." holds, and no clue compares the people it names.
        let couldMsgs = 0;
        for (const fb of Object.values(item.feedback!)) {
          const m = fb.headline.match(/^(\w+) could .*, but so could (.+?)\.$/);
          if (!m) continue;
          couldMsgs++;
          const named = [m[1], ...m[2].split(/, | and /)].map((s) => s.toLowerCase());
          for (const a of named) expect(fits.some((o) => at(o) === a)).toBe(true);
          for (const a of named) for (const b of named) expect(clues.some((c) => c.t === 'before' && c.a === a && c.b === b)).toBe(false);
        }
        expect(couldMsgs).toBe(cantTell ? new Set(fits.map(at)).size : 0);
      }
    }
  });

  it('can-not-tell conflicts include someone who looks like the answer', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { item, ids, clues, ask } = chainPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), cantTell: true });
      const fits = fitting(ids, clues);
      const at = (o: string[]) => (ask === 'first' ? o[0] : o[o.length - 1]);
      // At least two people are never beaten on that side, so each looks like the answer.
      expect(new Set(fits.map(at)).size).toBeGreaterThanOrEqual(2);
      expect(item.conflict).toBe(true);
    }
  });

  it('can-not-tell feedback names everyone who could be at that end, even when three could', () => {
    let three = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const { item, ids, clues, ask } = chainPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), cantTell: true });
      const fits = fitting(ids, clues);
      const at = (o: string[]) => (ask === 'first' ? o[0] : o[o.length - 1]);
      const ends = [...new Set(fits.map(at))].sort();
      if (ends.length > 2) three++;
      const label = (id: string) => item.choices.find((c) => c.id === id)!.label;
      const named = (text: string) => ids.filter((id) => new RegExp(`\\b${label(id)}\\b`).test(text)).sort();
      expect(named(item.explain), `seed ${seed}: ${item.explain}`).toEqual(ends);
      for (const e of ends) expect(named(item.feedback![e].headline), `seed ${seed}: ${item.feedback![e].headline}`).toEqual(ends);
      // "No clue rules out A or D." in the meaning names exactly them too.
      const rule = /No clue rules out (.+)\.$/.exec(item.teach!.meaning!)!;
      expect(named(rule[1])).toEqual(ends);
    }
    expect(three).toBeGreaterThan(0);
  });
});

describe('lesson 2: before vs right before', () => {
  it('must / might / can\'t is computed over every order that fits', () => {
    const targets: Status[] = ['must', 'might', 'cant'];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const skin = skinAt(seed, ORDERLY);
      for (const target of targets) {
        const { item, ids, clues, stmt } = statusPuzzle(createRng(seed), { id: 'x', skin, target });
        const fits = fitting(ids, clues);
        const t = fits.filter((o) => clueHolds(stmt, o)).length;
        const status: Status = t === fits.length ? 'must' : t === 0 ? 'cant' : 'might';
        expect(status).toBe(target);
        expect(item.answer).toBe(status);
        expect(item.choices.map((c) => c.id)).toEqual(['must', 'might', 'cant']);
        expect(clues.map((c) => `${c.t}${c.a}${'b' in c ? c.b : ''}`)).not.toContain(`${stmt.t}${stmt.a}${stmt.b}`);
        whyWrongCoversWrongChoices(item);
        cleanText(item);
        // Every order the explanation quotes really fits, and says what the text claims.
        for (const o of quotedOrders(item.explain)) expect(fits.some((f) => same(f, o)), `seed ${seed}: ${o}`).toBe(true);
        if (status === 'might') {
          const [tOrder, fOrder] = quotedOrders(item.explain).slice(-2);
          expect(clueHolds(stmt, tOrder)).toBe(true);
          expect(clueHolds(stmt, fOrder)).toBe(false);
        }
      }
    }
  });

  it('conflict items: the clue says "before", the sentence says "right before", and it only might be true', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const skin = skinAt(seed, ORDERLY);
      const { item, ids, clues, stmt } = statusPuzzle(createRng(seed), { id: 'x', skin, conflict: true });
      expect(stmt.t).toBe('rightBefore');
      expect(clues.some((c) => c.t === 'before' && c.a === stmt.a && c.b === stmt.b)).toBe(true);
      expect(item.answer).toBe('might');
      expect(item.conflict).toBe(true);
      // The headline names the answer's gap, not the player's thinking.
      expect(item.feedback!.must.headline).toBe(`Your answer treats “${SKINS[skin].beforeWord}” as “${SKINS[skin].rightWord}.”`);
      // Misreading "before" as "right before" would make it a must.
      const misread = clues.map((c) => (c.t === 'before' && c.a === stmt.a && c.b === stmt.b ? stmt : c));
      expect(fitting(ids, misread).every((o) => clueHolds(stmt, o))).toBe(true);
    }
  });
});

describe('lesson 3: not first, not last, next to, between', () => {
  it('where / who answers are forced by every order that fits, else Can\'t tell', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const cantTell of [false, true]) {
        for (const q of ['where', 'who'] as const) {
          const p = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), cantTell, q });
          const { item, ids, clues, target, k } = p;
          expect(distinctInitials(ids)).toBe(true);
          expect(clues.some((c) => ['notFirst', 'notLast', 'nextTo', 'notNextTo', 'between'].includes(c.t))).toBe(true);
          const fits = fitting(ids, clues);
          const options = q === 'where' ? new Set(fits.map((o) => `p${o.indexOf(target) + 1}`)) : new Set(fits.map((o) => o[k - 1]));
          const right = item.choices.filter((c) => (c.id === CANT ? options.size > 1 : options.size === 1 && options.has(c.id)));
          expect(right.map((c) => c.id), `seed ${seed} ${q}`).toEqual([item.answer]);
          expect(item.answer === CANT).toBe(cantTell);
          whyWrongCoversWrongChoices(item);
          cleanText(item);
          for (const o of quotedOrders(item.explain)) expect(fits.some((f) => same(f, o))).toBe(true);
          // "Two orders fit" only when exactly two do.
          if (cantTell) expect(item.explain.startsWith('Two orders fit the clues:')).toBe(fits.length === 2);
          // Forced answers take more than one clue to see.
          if (!cantTell) {
            for (const c of clues) {
              const alone = fitting(ids, [c]);
              const opts = q === 'where' ? new Set(alone.map((o) => o.indexOf(target))) : new Set(alone.map((o) => o[k - 1]));
              expect(opts.size).toBeGreaterThan(1);
            }
          }
        }
      }
    }
  });

  it('conflict items leave the tempting answer open, and their skill is the conflict’s own clue', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ends = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), conflict: 'ends' });
      expect(ends.ids.length).toBe(4);
      expect(ends.clues).toContainEqual({ t: 'notFirst', a: ends.target });
      expect(ends.clues).toContainEqual({ t: 'notLast', a: ends.target });
      expect(ends.item.answer).toBe(CANT);
      expect(new Set(fitting(ends.ids, ends.clues).map((o) => o.indexOf(ends.target)))).toEqual(new Set([1, 2]));
      expect(ends.item.skill).toBe('s3.not-first-last');

      const btw = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), conflict: 'between' });
      expect(btw.clues.some((c) => c.t === 'between')).toBe(true);
      expect(btw.item.answer).toBe(CANT);
      expect(btw.item.conflict).toBe(true);
      expect(btw.item.skill).toBe('s3.between');
    }
  });

  it('“where” questions say where counting starts', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const skin = skinAt(seed, ORDERLY);
      const { item } = spotPuzzle(createRng(seed), { id: 'x', skin, q: 'where' });
      if (skin === 'line' || skin === 'robots') expect(item.prompt).toMatch(/Counting from the front, where is \w+ in (line|the parade)\?$/);
      if (skin === 'letters') expect(item.prompt).toMatch(/Counting from the left, where is \w+\?$/);
      if (skin === 'race' || skin === 'brooms') expect(item.prompt).toMatch(/In what place did \w+ finish\?$/);
    }
  });
});

describe('lesson 4: build the whole line', () => {
  it('exactly one order fits, it is the answer, and every clue is needed', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const n = 3 + (seed % 3);
      const { item, ids } = buildPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), n });
      expect(distinctInitials(ids)).toBe(true);
      expect(item.names.length).toBe(n);
      const fits = fitting(ids, item.clues);
      expect(fits.length).toBe(1);
      expect(fits[0]).toEqual(item.answer);
      item.clues.forEach((_, i) => expect(fitting(ids, item.clues.filter((_, j) => j !== i)).length).toBeGreaterThan(1));
      expect(item.scene?.kind === 'clues' && item.scene.clues.length).toBe(item.clues.length);
      expect(same(item.names.map((c) => c.id), item.answer)).toBe(false);
      expect(item.clues.some((c) => ['before', 'rightBefore', 'nextTo', 'notNextTo', 'between'].includes(c.t))).toBe(true);
      cleanText(item);
    }
  });
});

describe('lesson 5: which clue was not needed', () => {
  it('exactly one clue can go and the order is still forced; it is the answer', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { item, ids, order, clues } = extraCluePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed) });
      expect(distinctInitials(ids)).toBe(true);
      expect(clues.length).toBeGreaterThanOrEqual(3);
      expect(clues.length).toBeLessThanOrEqual(5);
      const all = fitting(ids, clues);
      expect(all.length).toBe(1);
      expect(all[0]).toEqual(order);
      const removable = clues.map((_, i) => fitting(ids, clues.filter((_, j) => j !== i)).length === 1);
      expect(removable.filter(Boolean).length).toBe(1);
      expect(item.answer).toBe(clueId(clues[removable.indexOf(true)]));
      expect(new Set(item.choices.map((c) => c.label)).size).toBe(item.choices.length);
      whyWrongCoversWrongChoices(item);
      cleanText(item);
      // Each "not yet" names an order that fits without that clue and is not the answer.
      for (const [id, msg] of Object.entries(item.whyWrong!)) {
        const i = clues.findIndex((c) => clueId(c) === id);
        const [alt] = quotedOrders(msg);
        expect(same(alt, order)).toBe(false);
        expect(clues.filter((_, j) => j !== i).every((c) => clueHolds(c, alt))).toBe(true);
        expect(clueHolds(clues[i], alt)).toBe(false);
      }
    }
  });

  it('choice ids come from what each clue says, so they never depend on where the clue sits', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { item, clues } = extraCluePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed) });
      const texts = sceneClues(item);
      expect(item.choices.map((c) => c.id)).toEqual(clues.map(clueId));
      expect(item.choices.map((c) => c.label)).toEqual(texts);
      expect(item.choices.every((c) => !/^k\d$/.test(c.id))).toBe(true);
      // Reordering the choices keeps each id on its own clue and each explanation on its own choice.
      for (const c of [...item.choices].reverse()) {
        if (c.id === item.answer) continue;
        expect(item.feedback![c.id].detail.join(' ')).toContain(`Cover up “${c.label.replace(/\.$/, '')}.”`);
      }
    }
  });
});

// ---------- the teaching after a wrong answer ----------

describe('teaching after a wrong answer: lesson 1 (chains)', () => {
  it('cases try each name at that end, and every truth, note and example is computed right', () => {
    const byKind = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 150; seed++) {
      for (const cantTell of [false, true]) {
        const { item, ids, clues, ask } = chainPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), cantTell });
        const texts = sceneClues(item);
        const end = ask === 'first' ? 0 : ids.length - 1;
        const ends = new Set(fitHolds(ids, clues).map((o) => o[end]));
        checkTeachShape(item);
        item.teach!.cases!.forEach((c, i) => {
          const r = checkCase(c, { ids, clues, texts });
          expect(r.order[end]).toBe(ids[i]);
          expect(r.broken.length === 0).toBe(ends.has(ids[i]));
        });
        for (const ch of item.choices) {
          if (ch.id === item.answer) continue;
          const fb = item.feedback![ch.id];
          const claim: LineClue | undefined = ch.id === CANT ? undefined : { t: 'place', a: ch.id, k: end + 1 };
          const ctx: Ctx = { ids, clues, texts, claim };
          const ex = checkCase(fb.example!, ctx);
          checkDetail(fb.detail, ctx);
          if (ch.id === CANT) {
            // The chain decides it: the example puts someone else at that end and breaks a clue.
            note(byKind, 'decided', fb.headline);
            expect(fb.headline).toBe(`The clues rule out everyone but ${item.choices.find((c) => c.id === item.answer)!.label}.`);
            expect(ex.broken.length).toBeGreaterThan(0);
            expect(ex.order[end]).not.toBe(item.answer);
          } else if (ends.has(ch.id)) {
            // Could be there, but not for sure: two orders that fit disagree.
            note(byKind, 'not-sure', fb.headline);
            expect(ex.broken).toEqual([]);
            expect(ex.your).toBe(false);
            const two = quotedOrders(fb.detail.join(' '));
            expect(two.length).toBe(2);
            for (const o of two) expect(brokenHolds(clues, o)).toEqual([]);
            expect(two[0][end]).toBe(ch.id);
            expect(two[1][end]).not.toBe(ch.id);
          } else {
            // A clue rules it out: the headline names that clue, and the example shows it break.
            note(byKind, 'breaks', fb.headline.replace(/“.+”/, '“…”'));
            const m = /^Your answer makes the clue “(.+)” false\.$/.exec(fb.headline)!;
            const i = texts.indexOf(`${m[1]}.`);
            expect(i).toBeGreaterThanOrEqual(0);
            const c = clues[i];
            expect(c.t === 'before' && (end === 0 ? c.b : c.a)).toBe(ch.id);
            expect(ex.your).toBe(true);
            expect(ex.broken).toContain(i);
          }
        }
      }
    }
    headlinesDifferByKind(byKind);
    expect([...byKind.keys()].sort()).toEqual(['breaks', 'decided', 'not-sure']);
  });

  it('for a can’t-tell answer, the cases show two orders that fit the clues but disagree', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { item, ids, clues, ask } = chainPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), cantTell: true });
      const end = ask === 'first' ? 0 : ids.length - 1;
      const fitsShown = item.teach!.cases!.map((c) => checkCase(c, { ids, clues, texts: sceneClues(item) })).filter((r) => !r.broken.length);
      expect(new Set(fitsShown.map((r) => r.order[end])).size).toBeGreaterThanOrEqual(2);
    }
  });

  it('“Explain more simply” is a three-name chain whose answer is worked out the same way', () => {
    for (const s of SKIN_IDS) {
      for (const ask of ['first', 'last'] as const) {
        for (const cant of [false, true]) {
          const mini = chainSimpler(SKINS[s], [], ask, cant);
          const end = ask === 'first' ? 0 : 2;
          const left = [...new Set(fitHolds(mini.ids, mini.clues).map((o) => o[end]))];
          expect(left.length > 1).toBe(cant);
          const last = mini.text[mini.text.length - 1];
          if (cant) expect(last).toMatch(/are left\. No clue compares them, so you can’t tell\.$/);
          else expect(last).toMatch(new RegExp(`^Only ${SKINS[s].pool.find((p) => p.toLowerCase() === left[0])} is left\\.`));
        }
      }
    }
  });
});

describe('teaching after a wrong answer: lesson 2 (before vs right before)', () => {
  it('cases and every wrong choice’s example show the right orders, with computed truths', () => {
    const byKind = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 150; seed++) {
      const skin = skinAt(seed, ORDERLY);
      for (const opts of [{ target: 'must' as const }, { target: 'might' as const }, { target: 'cant' as const }, { conflict: true }]) {
        const { item, ids, clues, stmt, status } = statusPuzzle(createRng(seed), { id: 'x', skin, ...opts });
        const texts = sceneClues(item);
        const stmtText = /Look at this sentence: “(.+?)” Think about every order that fits the clues\./.exec(item.prompt)![1];
        const ctx: Ctx = { ids, clues, texts, stmt, stmtText };
        checkTeachShape(item);
        const cases = item.teach!.cases!.map((c) => checkCase(c, ctx));
        const fitT = cases.filter((r) => !r.broken.length && r.sentence);
        const fitF = cases.filter((r) => !r.broken.length && !r.sentence);
        if (status === 'might') {
          expect(fitT.length).toBeGreaterThan(0);
          expect(fitF.length).toBeGreaterThan(0);
        } else {
          // Every order that fits agrees, and one more line shows the other value only by breaking a clue.
          expect((status === 'must' ? fitF : fitT).length).toBe(0);
          expect(cases.some((r) => r.broken.length > 0 && r.sentence === (status === 'cant'))).toBe(true);
        }
        for (const pick of ['must', 'might', 'cant'] as const) {
          if (pick === status) continue;
          const fb = item.feedback![pick];
          const ex = checkCase(fb.example!, ctx);
          checkDetail(fb.detail, ctx);
          const misread = status === 'might' && pick === 'must' && !!item.conflict;
          note(byKind, misread ? 'misread' : `${status}<-${pick}`, misread ? fb.headline.replace(/“.+”/, '“…”') : fb.headline);
          if (status === 'might') {
            // Picked must: an order fits and the sentence is false. Picked can't: an order fits and it is true.
            expect(ex.broken).toEqual([]);
            expect(ex.sentence).toBe(pick === 'cant');
          } else if (pick === 'might' || (status === 'cant' && pick === 'must')) {
            // No order that fits gives the other value: the best try breaks a clue.
            expect(ex.broken.length).toBeGreaterThan(0);
            expect(ex.sentence).toBe(status === 'cant');
          } else {
            // Must, picked can't: an order fits and the sentence is true there.
            expect(ex.broken).toEqual([]);
            expect(ex.sentence).toBe(true);
          }
          if (misread) expect(fb.example!.note).toMatch(/ (is|are) between /);
        }
      }
    }
    headlinesDifferByKind(byKind);
    expect(byKind.size).toBe(7);
  });

  it('the question says what must, might and can’t are about: every order that fits the clues', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { item } = statusPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY) });
      expect(item.prompt).toMatch(/Think about every order that fits the clues\. Must the sentence be true, might it be true, or can’t it be true\?$/);
      const words = item.teach!.terms!.map((t) => t.word);
      expect(words).toContain(SKINS[skinAt(seed, ORDERLY)].terms.before![0]);
      expect(words).toContain(SKINS[skinAt(seed, ORDERLY)].terms.rightBefore![0]);
    }
  });

  it('“Explain more simply” gets its answer by checking every order that fits', () => {
    for (const s of ORDERLY) {
      for (const status of ['must', 'might', 'cant'] as const) {
        for (const t of ['before', 'rightBefore'] as const) {
          const mini = statusSimpler(SKINS[s], [], status, t);
          const fit = fitHolds(mini.ids, mini.clues);
          const yes = fit.filter((o) => holds(mini.stmt, o)).length;
          expect(yes === fit.length ? 'must' : yes === 0 ? 'cant' : 'might', `${s} ${status} ${t}`).toBe(status);
          expect(mini.text.filter((x) => x.startsWith('In the order ')).length).toBe(fit.length);
          for (const line of mini.text.filter((x) => x.startsWith('In the order '))) {
            const m = /^In the order (.+), it is (true|false)\.$/.exec(line)!;
            const order = m[1].split(', ').map((x) => x.toLowerCase());
            expect(holds(mini.stmt, order)).toBe(m[2] === 'true');
          }
        }
      }
    }
  });
});

describe('teaching after a wrong answer: lesson 3 (not first, not last, next to, between)', () => {
  it('cases try every spot (or every name), and every wrong choice’s example is computed right', () => {
    const byKind = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 120; seed++) {
      const skin = skinAt(seed, ORDERLY);
      const plans = [
        { cantTell: false, q: 'where' as const }, { cantTell: true, q: 'where' as const },
        { cantTell: false, q: 'who' as const }, { cantTell: true, q: 'who' as const },
        { conflict: 'ends' as const }, { conflict: 'between' as const },
      ];
      for (const plan of plans) {
        const { item, ids, clues, q, target, k } = spotPuzzle(createRng(seed), { id: 'x', skin, ...plan });
        const texts = sceneClues(item);
        const n = ids.length;
        const valueOf = (o: string[]) => (q === 'where' ? String(o.indexOf(target) + 1) : o[k - 1]);
        const options = new Set(fitHolds(ids, clues).map(valueOf));
        const cands = q === 'where' ? Array.from({ length: n }, (_, i) => String(i + 1)) : ids;
        const claimOf = (v: string): LineClue => (q === 'where' ? { t: 'place', a: target, k: Number(v) } : { t: 'place', a: v, k });
        checkTeachShape(item);
        item.teach!.cases!.forEach((c, i) => {
          const r = checkCase(c, { ids, clues, texts });
          expect(valueOf(r.order)).toBe(cands[i]);
          expect(r.broken.length === 0).toBe(options.has(cands[i]));
        });
        if (item.answer === CANT) {
          const fitsShown = item.teach!.cases!.map((c) => checkCase(c, { ids, clues, texts })).filter((r) => !r.broken.length);
          expect(new Set(fitsShown.map((r) => valueOf(r.order))).size).toBeGreaterThanOrEqual(2);
        }
        for (const ch of item.choices) {
          if (ch.id === item.answer) continue;
          const fb = item.feedback![ch.id];
          const v = q === 'where' && ch.id !== CANT ? ch.id.slice(1) : ch.id;
          const ctx: Ctx = { ids, clues, texts, claim: ch.id === CANT ? undefined : claimOf(v) };
          const ex = checkCase(fb.example!, ctx);
          checkDetail(fb.detail, ctx);
          if (ch.id === CANT) {
            note(byKind, 'decided', fb.headline.replace(/^Only (the \w+ spot|\w+) /, 'Only X ').replace(/for \w+\.$/, 'for Y.'));
            // The headline names the one answer left: the spot, or the person (never "that spot").
            const label = (id: string) => item.choices.find((c) => c.id === id)!.label;
            const name = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
            if (q === 'where') expect(fb.headline).toBe(`Only the ${label(item.answer).toLowerCase()} spot keeps every clue true for ${name(target)}.`);
            else expect(fb.headline).toMatch(new RegExp(`^Only ${label(item.answer)} could .+ without breaking a clue\\.$`));
            expect(ex.broken.length).toBeGreaterThan(0);
          } else if (options.has(v)) {
            note(byKind, 'not-sure', fb.headline.replace(/^.+, but/, '…, but'));
            expect(fb.headline).toMatch(/, but not for sure\.$/);
            expect(ex.broken).toEqual([]);
            expect(ex.your).toBe(false);
            const two = quotedOrders(fb.detail.join(' '));
            expect(two.length).toBe(2);
            for (const o of two) expect(brokenHolds(clues, o)).toEqual([]);
            expect(valueOf(two[0])).toBe(v);
            expect(valueOf(two[1])).not.toBe(v);
          } else {
            note(byKind, 'breaks', fb.headline.replace(/^.+ without/, '… without').replace(/\d+/g, 'k'));
            const m = /without breaking (clue (\d+)|clue (\d+) or clue (\d+)|a clue)\.$/.exec(fb.headline)!;
            expect(m).not.toBeNull();
            // Every order with that answer breaks one of the named clues.
            const named = nums(m[1]);
            for (const o of perms(ids).filter((x) => valueOf(x) === v)) {
              const br = brokenHolds(clues, o);
              expect(br.length).toBeGreaterThan(0);
              if (named.length) expect(br.some((i) => named.includes(i)), `${fb.headline} ${o}`).toBe(true);
            }
            expect(ex.your).toBe(true);
            expect(ex.broken.length).toBeGreaterThan(0);
          }
        }
      }
    }
    headlinesDifferByKind(byKind);
    expect([...byKind.keys()].sort()).toEqual(['breaks', 'decided', 'not-sure']);
  });

  it('“Explain more simply” is a three- or four-name puzzle solved by trying each spot', () => {
    for (const s of ORDERLY) {
      for (const focus of ['ends', 'nextTo', 'notNextTo', 'between'] as SpotFocus[]) {
        for (const forced of [true, false]) {
          const mini = spotSimpler(SKINS[s], [], focus, forced);
          const fit = fitHolds(mini.ids, mini.clues);
          const values = 'where' in mini.q
            ? new Set(fit.map((o) => o.indexOf((mini.q as { where: string }).where)))
            : new Set(fit.map((o) => o[(mini.q as { who: number }).who - 1]));
          expect(values.size === 1, `${s} ${focus} ${forced}`).toBe(forced);
          expect(mini.text[mini.text.length - 1]).toMatch(forced ? /^Only one (spot )?works\. So / : /^More than one (spot )?works\. So you can’t tell\.$/);
          for (const m of mini.text.join(' ').matchAll(/as in the order ((?:[A-Za-z]+, )+[A-Za-z]+)/g)) {
            expect(brokenHolds(mini.clues, m[1].toLowerCase().split(', '))).toEqual([]);
          }
          const bad = /^The (.+) spots? breaks? a clue\.$/.exec(mini.text.find((x) => / breaks? a clue\.$/.test(x) && x.startsWith('The ')) ?? '');
          if (bad && 'where' in mini.q) {
            const x = mini.q.where;
            for (const word of bad[1].split(/, | and /)) {
              const j = ORDINALS.indexOf(word as (typeof ORDINALS)[number]);
              expect(fit.some((o) => o.indexOf(x) === j)).toBe(false);
            }
          }
        }
      }
    }
  });
});

describe('teaching after a wrong answer: lesson 4 (build the line)', () => {
  it('the cases show the right line with every clue true, then near misses that break one named clue each', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const n = 3 + (seed % 3);
      const { item, ids, order, clues } = buildPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), n });
      const texts = sceneClues(item);
      checkTeachShape(item);
      const [first, ...near] = item.teach!.cases!.map((c) => checkCase(c, { ids, clues, texts, answer: order }));
      expect(first.order).toEqual(order);
      expect(first.shown).toEqual(clues.map((_, i) => i));
      expect(first.broken).toEqual([]);
      expect(item.teach!.cases![0].note).toBe('Every clue is true here. This is the only line that fits.');
      expect(near.length).toBeGreaterThanOrEqual(1);
      for (const r of near) {
        // One swap away from the answer, and only its broken clues are listed (all false).
        expect(r.order.filter((x, i) => x !== order[i]).length).toBe(2);
        expect(r.shown).toEqual(r.broken);
        expect(r.broken.length).toBeGreaterThan(0);
      }
      expect(item.teach!.terms!.map((t) => t.word)).toContain('To break a clue');
      // grade() names the broken clues for any wrong line; they match the second checker.
      const wrong = [...order].reverse();
      const g = grade(item, { kind: 'order', ids: wrong });
      expect(g.broken).toEqual(brokenHolds(clues, wrong));
    }
  });

  it('“Explain more simply” is a three-name line with one answer', () => {
    for (const s of SKIN_IDS) {
      const mini = buildSimpler(SKINS[s], []);
      const fit = fitHolds(mini.ids, mini.clues);
      expect(fit.length).toBe(1);
      const m = /The only line that fits is ((?:[A-Za-z]+, )+[A-Za-z]+)/.exec(mini.text.join(' '))!;
      expect(m[1].toLowerCase().split(', ')).toEqual(fit[0]);
    }
  });
});

describe('teaching after a wrong answer: lesson 5 (which clue was not needed)', () => {
  it('each needed clue’s example is an order that breaks only that clue; the cases cover each clue', () => {
    const byKind = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 150; seed++) {
      const { item, ids, order, clues, extra } = extraCluePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed) });
      const texts = sceneClues(item);
      checkTeachShape(item);
      const [first, ...side] = item.teach!.cases!.map((c) => checkCase(c, { ids, clues, texts }));
      expect(first.order).toEqual(order);
      expect(item.teach!.cases![0].note).toBe(`Every clue is true here. With clue ${extra + 1} covered, this is still the only order that fits. So clue ${extra + 1} is not needed.`);
      for (const r of side) expect(r.broken.length).toBe(1);
      for (const ch of item.choices) {
        if (ch.id === item.answer) continue;
        const fb = item.feedback![ch.id];
        const i = clues.findIndex((c) => clueId(c) === ch.id);
        const ex = checkCase(fb.example!, { ids, clues, texts });
        expect(ex.broken).toEqual([i]);
        note(byKind, 'needed', fb.headline);
      }
    }
    headlinesDifferByKind(byKind);
  });

  it('“Explain more simply” shows one clue that is not needed and one that is', () => {
    for (const s of SKIN_IDS) {
      const mini = extraSimpler(SKINS[s], []);
      expect(fitHolds(mini.ids, mini.clues.slice(0, 2)).length).toBe(1);
      expect(fitHolds(mini.ids, mini.clues.slice(1)).length).toBeGreaterThan(1);
    }
  });
});

describe('teaching after a wrong answer: the whole stop', () => {
  const all = (seed: number) => [...stop3.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop3.check!(createRng(seed)), stop3.practice!(createRng(seed))];

  it('every item teaches, every wrong choice has its own explanation, and no right answer gets one', () => {
    for (let seed = 1; seed <= 80; seed++) {
      for (const item of all(seed)) {
        checkTeachShape(item);
        cleanText(item);
        if (item.kind === 'choose') whyWrongCoversWrongChoices(item);
      }
    }
  });

  it('teaching text: sentences of 25 words or fewer, and no vague “both”, “that row” or “the opposite”', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const item of all(seed)) {
        for (const s of [item.explain, ...teachStrings(item)]) {
          // "That spot" and "like that" leave the reader to work out which spot or which order.
          expect(s).not.toMatch(/\bboth\b|that row|the opposite|that spot|that end|like that/i);
          for (const x of sentences(s)) expect(words(x).length, x).toBeLessThanOrEqual(25);
        }
        if (item.kind === 'choose') for (const fb of Object.values(item.feedback ?? {})) expect(fb.headline).not.toMatch(/^(Wrong|Try again)\b/);
      }
    }
  });

  it('a miss gets a new example built the same way (same lesson, skill and kind of answer), and in lessons 1 to 3 a partner with the other kind', () => {
    const sameKind = (missed: Item, x: Item) =>
      x.skill === missed.skill && !!x.conflict === !!missed.conflict &&
      (missed.kind !== 'choose' || x.kind !== 'choose' ||
        ((x.answer === CANT) === (missed.answer === CANT) &&
          (missed.lesson !== 's3.l2' || x.answer === missed.answer) &&
          (missed.lesson !== 's3.l3' || x.choices.some((c) => c.id === 'p1') === missed.choices.some((c) => c.id === 'p1'))));
    for (let seed = 1; seed <= 40; seed++) {
      for (const missed of all(seed)) {
        const set = freshCheckSet(stop3, missed, seed, [], 1);
        const paired = missed.kind === 'choose' && ['s3.l1', 's3.l2', 's3.l3'].includes(missed.lesson);
        expect(set.length, missed.id).toBe(paired ? 2 : 1);
        for (const x of set) {
          expect(x.lesson).toBe(missed.lesson);
          expect(looks(x)).not.toBe(looks(missed));
        }
        const twin = set.find((x) => sameKind(missed, x));
        expect(twin, missed.id).toBeDefined();
        if (missed.kind === 'order' && twin!.kind === 'order') expect(twin!.names.length).toBe(missed.names.length);
        if (paired) {
          const partner = set.find((x) => x !== twin)!;
          if (partner.kind !== 'choose' || missed.kind !== 'choose') throw new Error('not a choose item');
          expect(partner.answer, missed.id).not.toBe(missed.answer);
          if (missed.lesson === 's3.l2') expect(partner.answer === 'might').toBe(missed.answer !== 'might');
          else expect(partner.answer === CANT).toBe(missed.answer !== CANT);
          if (missed.lesson === 's3.l3') expect(partner.choices.some((c) => c.id === 'p1')).toBe(missed.choices.some((c) => c.id === 'p1'));
        }
      }
    }
  });
});

describe('stop 3 content', () => {
  it('“One clue, three orders”: the orders it names are exactly the ones that fit its clue', () => {
    const card = stop3.lessons.flatMap((l) => l.ideas).find((c) => c.title === 'One clue, three orders');
    expect(card).toBeDefined();
    const clue: LineClue = { t: 'before', a: 'ava', b: 'ben' };
    const nm = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
    expect(card!.scene).toEqual({ kind: 'clues', clues: [clueText(SKINS.race, clue, 3, nm)] });
    const fits = fitting(['ava', 'ben', 'cal'], [clue]);
    expect(fits.length).toBe(3);
    const named = [...card!.body.join(' ').matchAll(/\b(Ava|Ben|Cal), (Ava|Ben|Cal), (Ava|Ben|Cal)\b/g)].map((m) => m.slice(1).map((s) => s.toLowerCase()));
    expect(named.map((o) => o.join()).sort()).toEqual(fits.map((o) => o.join()).sort());
    // "In the second one, Cal is between them. So Ava may not be right before Ben."
    expect(clueHolds({ t: 'between', a: 'cal', b: 'ava', c: 'ben' }, named[1])).toBe(true);
    expect(clueHolds({ t: 'rightBefore', a: 'ava', b: 'ben' }, named[1])).toBe(false);
  });

  it('no practice set or check shows the same puzzle twice', () => {
    const key = (i: Item) => JSON.stringify([i.prompt, i.scene]);
    const noRepeats = (items: Item[], what: string) => expect(new Set(items.map(key)).size, what).toBe(items.length);
    // Seed 1780396 once gave lesson 1 practice the same item twice.
    for (const seed of [1780396, ...Array.from({ length: 150 }, (_, i) => i + 1)]) {
      for (const l of stop3.lessons) noRepeats(l.practice(createRng(seed)), `${l.id} seed ${seed}`);
      noRepeats(stop3.check!(createRng(seed)), `check seed ${seed}`);
    }
  });

  it('the check’s “which clue wasn’t needed?” item uses three people', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const item = stop3.check!(createRng(seed)).find((i) => i.id === 'c9')!;
      expect(item.lesson).toBe('s3.l5');
      expect(item.kind).toBe('choose');
      if (item.kind !== 'choose') continue;
      const orders = Object.values(item.whyWrong!).flatMap(quotedOrders);
      expect(orders.length).toBeGreaterThan(0);
      for (const o of orders) expect(o.length).toBe(3);
      expect(item.choices.length).toBeLessThanOrEqual(4);
    }
  });

  it('lesson 4 defines “breaks” before the build questions use it', () => {
    const card = stop3.lessons[3].ideas.find((c) => c.title === 'Test and fix')!;
    expect(card.body.join(' ')).toContain('A clue breaks when it is false for your line.');
  });

  it('lesson 3 says what “breaks a clue” means the first time a card uses it', () => {
    const bodies = stop3.lessons[2].ideas.flatMap((c) => c.body);
    const first = bodies.find((b) => /\bbreak/.test(b))!;
    expect(first).toContain('That makes the first clue false. We say it breaks the clue.');
  });
});

// ---------- regressions for the review of the migrated teaching ----------

describe('review fixes: stop 3 wrong-answer teaching', () => {
  const all = (seed: number) => [...stop3.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop3.check!(createRng(seed)), stop3.practice!(createRng(seed))];
  const name = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

  it('teaching cases that try many lines list only the clues each line breaks; an example that fits lists every clue', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const item of all(seed)) {
        const lines = (c: TeachCase) => (c.truths ?? []).filter((t) => t.who.startsWith('Clue ')).length;
        for (const c of item.teach!.cases!) {
          // The note says in words what the card leaves out.
          const clueTruths = (c.truths ?? []).filter((t) => t.who.startsWith('Clue '));
          if (!lines(c)) expect(c.note, c.label).toMatch(/Every clue is true here|This order fits every clue/);
          // Otherwise the card lists the broken clues (all false), or, for the right line in lesson 4, every clue.
          else if (!clueTruths.every((t) => !t.value)) expect(item.lesson === 's3.l4' && clueTruths.every((t) => t.value)).toBe(true);
        }
        if (item.kind !== 'choose' || !item.scene || item.scene.kind !== 'clues') continue;
        for (const fb of Object.values(item.feedback ?? {})) {
          const ex = fb.example!;
          const shown = lines(ex);
          const clueTruths = (ex.truths ?? []).filter((t) => t.who.startsWith('Clue '));
          if (clueTruths.every((t) => t.value)) expect(shown, ex.label).toBe(item.scene.clues.length);
        }
      }
    }
  });

  it('lesson 1: “Can’t tell” on a chain that decides says each other name is ruled out by a clue of its own', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const { item, ids, clues, ask } = chainPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), cantTell: false });
      const detail = item.feedback![CANT].detail.join(' ');
      expect(detail).not.toMatch(/A clue rules out every/);
      expect(detail).toMatch(/but \w+ is ruled out by at least one clue\./);
      for (const id of ids) {
        if (id === item.answer) continue;
        // A clue on its own puts someone on the far side of this name.
        expect(clues.some((c) => c.t === 'before' && (ask === 'first' ? c.b : c.a) === id), `seed ${seed} ${id}`).toBe(true);
      }
      // The name the chain rules out gets "makes the clue … false", and that clue really is false with it there.
      for (const ch of item.choices) {
        if (ch.id === item.answer || ch.id === CANT) continue;
        const m = /^Your answer makes the clue “(.+)” false\.$/.exec(item.feedback![ch.id].headline)!;
        const c = clues[sceneClues(item).indexOf(`${m[1]}.`)];
        const end = ask === 'first' ? 0 : ids.length - 1;
        for (const o of perms(ids).filter((x) => x[end] === ch.id)) expect(holds(c, o)).toBe(false);
      }
    }
  });

  it('lesson 2: “might” is “true in some, but not all” in the rule and the Remember line', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { item } = statusPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY) });
      expect(item.teach!.rule).toContain('True in some but not all: it might be true.');
      expect(item.teach!.remember![0]).toContain('Might: true in some, but not all.');
    }
  });

  it('lesson 3: when clues rule out an answer together, the detail shows that fixing one clue breaks another', () => {
    let seen = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (const cantTell of [false, true]) {
        for (const q of ['where', 'who'] as const) {
          const { item, ids, clues, target, k } = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), cantTell, q });
          const valueOf = (o: string[]) => (q === 'where' ? `p${o.indexOf(target) + 1}` : o[k - 1]);
          for (const [id, fb] of Object.entries(item.feedback!)) {
            if (id === CANT) continue;
            const any = /without breaking a clue\.$/.test(fb.headline);
            const m = /without breaking clue (\d+) or clue (\d+)\.$/.exec(fb.headline);
            if (!m && !any) continue;
            seen++;
            const now = fb.detail.find((x) => x.startsWith('Now think of the order '))!;
            const g = /^Now think of the order ((?:[A-Z]\w*, )+[A-Z]\w*)(?: \([a-z ]+\))?\. Clue (\d+) is true there, but (clues? [\d, and]+) (?:is|are) false\.$/.exec(now)!;
            expect(g, now).not.toBeNull();
            const order = g[1].toLowerCase().split(', ');
            const kept = Number(g[2]) - 1;
            expect(valueOf(order)).toBe(id);
            expect(holds(clues[kept], order)).toBe(true);
            expect(nums(g[3])).toEqual(brokenHolds(clues, order));
            // The clue kept true was broken by the first try.
            const first = /^Think of the order ((?:[A-Z]\w*, )+[A-Z]\w*)/.exec(fb.detail.find((x) => x.startsWith('Think of the order '))!)!;
            expect(holds(clues[kept], first[1].toLowerCase().split(', '))).toBe(false);
            const last = fb.detail[fb.detail.length - 1];
            if (m) {
              const [a, b] = [Number(m[1]) - 1, Number(m[2]) - 1];
              expect([a, b]).toContain(kept);
              // "No order where … keeps clue a and clue b true together." Checked over every order.
              expect(last).toMatch(new RegExp(`^No order where .+ keeps clue ${a + 1} and clue ${b + 1} true together\\.$`));
              for (const o of perms(ids).filter((x) => valueOf(x) === id)) expect(holds(clues[a], o) && holds(clues[b], o)).toBe(false);
            } else {
              expect(last).toMatch(/^Every order where .+ breaks at least one clue\.$/);
              for (const o of perms(ids).filter((x) => valueOf(x) === id)) expect(brokenHolds(clues, o).length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('lesson 3: “not first” and “not last” on one name leave n − 2 spots, counted from those two clues only', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const { item, ids, clues, target } = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), conflict: 'ends' });
      const m = /With (\w+) spots, these two clues leave (\w+)\.$/.exec(item.teach!.meaning!)!;
      expect(m).not.toBeNull();
      const two = clues.filter((c) => (c.t === 'notFirst' || c.t === 'notLast') && c.a === target);
      const left = new Set(fitHolds(ids, two).map((o) => o.indexOf(target))).size;
      expect(m[2]).toBe(['zero', 'one', 'two', 'three', 'four'][left]);
      expect(m[1]).toBe(['zero', 'one', 'two', 'three', 'four', 'five'][ids.length]);
    }
  });

  it('lesson 3: a “who” question never says “that spot”; a can’t-tell answer names who each order puts there', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const { item, ids, clues, k } = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), cantTell: true, q: 'who' });
      const m = /: ((?:[A-Z]\w*, )+[A-Z]\w*)\. Or ((?:[A-Z]\w*, )+[A-Z]\w*)\. One puts (\w+) .+, and the other puts (\w+) there\. So you can’t tell\.$/.exec(item.explain)!;
      expect(m, item.explain).not.toBeNull();
      const [o1, o2] = [m[1], m[2]].map((x) => x.toLowerCase().split(', '));
      for (const o of [o1, o2]) expect(brokenHolds(clues, o)).toEqual([]);
      expect(name(o1[k - 1])).toBe(m[3]);
      expect(name(o2[k - 1])).toBe(m[4]);
      expect(m[3]).not.toBe(m[4]);
      expect(ids.length).toBe(o1.length);
      expect(item.teach!.remember![1]).toMatch(/^Ask: “Could anyone else .+\?”$/);
      expect(item.hint).toMatch(/^Ask: “.+\?” Try each \w+\. Cross out anyone who breaks a clue\.$/);
    }
  });

  it('heights and wings: what a “taller than” clue means says when it is true', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const skin of ['height', 'dragons'] as const) {
        const { item, clues } = buildPuzzle(createRng(seed), { id: 'x', skin, n: 4 });
        if (!clues.some((c) => c.t === 'before') || clues.some((c) => c.t === 'notFirst' || c.t === 'notLast')) continue;
        expect(item.teach!.meaning).toMatch(/^“\w+ (is taller than|has longer wings than) \w+” is true when \w+ comes anywhere before \w+ in the order (tallest to shortest|longest wings to shortest)\. Others may be in between\.$/);
      }
    }
  });

  it('a chain of clues is told one step per sentence, never as one long run-on sentence', () => {
    // Seed 17, lesson 1 practice l1-1 once read: "C is somewhere to the left of B, B is somewhere to the left of D,
    // and D is somewhere to the left of A." (25 words).
    for (let seed = 1; seed <= 100; seed++) {
      for (const l of [0, 1]) {
        for (const item of stop3.lessons[l].practice(createRng(seed))) {
          for (const x of sentences(item.explain)) expect(words(x).length, x).toBeLessThanOrEqual(20);
        }
      }
    }
  });

  it('every explanation after a wrong answer fits the panel: at most 480 words, about 400 at the median', () => {
    const counts: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      for (const item of all(seed)) {
        const picks = item.kind === 'choose'
          ? item.choices.filter((c) => c.id !== item.answer).map((c) => ({ kind: 'choose' as const, id: c.id }))
          : item.kind === 'order' ? [{ kind: 'order' as const, ids: [...item.answer].reverse() }] : [];
        for (const a of picks) {
          const n = words(explanationSpeech(explanationFor(item, a), false).join(' ')).length;
          expect(n, `seed ${seed} ${item.id}`).toBeLessThanOrEqual(480);
          counts.push(n);
        }
      }
    }
    counts.sort((x, y) => x - y);
    expect(counts[counts.length >> 1]).toBeLessThanOrEqual(400);
  });
});

describe('seeded generation', () => {
  it('the same seed gives the same puzzle; different seeds vary', () => {
    const make = (seed: number) => [
      chainPuzzle(createRng(seed), { id: 'a', skin: 'race', cantTell: seed % 2 === 0 }).item,
      statusPuzzle(createRng(seed), { id: 'b', skin: 'line' }).item,
      spotPuzzle(createRng(seed), { id: 'c', skin: 'letters' }).item,
      buildPuzzle(createRng(seed), { id: 'd', skin: 'dragons', n: 4 }).item,
      extraCluePuzzle(createRng(seed), { id: 'e', skin: 'robots' }).item,
    ];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) {
      const a = make(seed);
      expect(make(seed)).toEqual(a);
      seen.add(JSON.stringify(a));
    }
    expect(seen.size).toBe(50);
  });
});

describe('broken-clue feedback', () => {
  it('lists broken clues as “clue 2”, “clues 1 and 3” or “clues 1, 3 and 4”', () => {
    const names = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id.toUpperCase() }));
    const item: Item = {
      kind: 'order', id: 'x', stop: 3, lesson: 's3.l1', skill: 's3.x', prompt: 'Line them up.', explain: 'A, B, C, D.',
      names, answer: ['a', 'b', 'c', 'd'], firstLabel: 'First', lastLabel: 'Last',
      clues: [{ t: 'first', a: 'a' }, { t: 'place', a: 'b', k: 2 }, { t: 'place', a: 'c', k: 3 }, { t: 'last', a: 'd' }],
    };
    const fb = (ids: string[]) => grade(item, { kind: 'order', ids }).feedback;
    const head = (ids: string[]) => fb(ids).split('\n')[0];
    expect(head(['a', 'b', 'd', 'c'])).toBe('This line breaks clues 3 and 4.');
    expect(head(['b', 'a', 'd', 'c'])).toBe('This line breaks clues 1, 2, 3 and 4.');
    expect(head(['a', 'c', 'b', 'd'])).toBe('This line breaks clues 2 and 3.');
    // Then one line per broken clue, saying where the line breaks it.
    expect(fb(['a', 'b', 'd', 'c']).split('\n').slice(1)).toEqual([
      'Clue 3: In your line, C is fourth, not third.',
      'Clue 4: In your line, D is third, not last.',
    ]);
    expect(fb(['b', 'a', 'd', 'c']).split('\n')[1]).toBe('Clue 1: In your line, A is second, not first.');
  });
});

// ---------- See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026) ----------
//
// The guided boards are re-solved here from the words on them: each clue is read back from its sentence
// (readBoardClue, as signs.test reads a sign), and every mark is worked out again with `holds`, the evaluator
// written in this file, apart from the engine's clueHolds.

/** Reads a board clue (race or heights) back from its words. */
function readBoardClue(text: string): LineClue {
  const id = (s: string) => s.toLowerCase();
  let m: RegExpExecArray | null;
  if ((m = /^(\w+) finished right before (\w+)\.$/.exec(text))) return { t: 'rightBefore', a: id(m[1]), b: id(m[2]) };
  if ((m = /^(\w+) finished somewhere between (\w+) and (\w+)\.$/.exec(text))) return { t: 'between', a: id(m[1]), b: id(m[2]), c: id(m[3]) };
  if ((m = /^(\w+) finished before (\w+)\.$/.exec(text))) return { t: 'before', a: id(m[1]), b: id(m[2]) };
  if ((m = /^(\w+) is taller than (\w+)\.$/.exec(text))) return { t: 'before', a: id(m[1]), b: id(m[2]) };
  if ((m = /^No one finished between (\w+) and (\w+)\.$/.exec(text))) return { t: 'nextTo', a: id(m[1]), b: id(m[2]) };
  if ((m = /^(\w+) did not finish (first|last)\.$/.exec(text))) return m[2] === 'first' ? { t: 'notFirst', a: id(m[1]) } : { t: 'notLast', a: id(m[1]) };
  if ((m = /^(\w+) finished (first|last)\.$/.exec(text))) return m[2] === 'first' ? { t: 'first', a: id(m[1]) } : { t: 'last', a: id(m[1]) };
  throw new Error(`cannot read board clue: ${text}`);
}

/** Every quoted sentence in a text, with its full stop. */
const quotesIn = (s: string) => [...s.matchAll(/“([^”]+)”/g)].map((m) => (/[.?]$/.test(m[1]) ? m[1] : `${m[1]}.`));
const capName = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
/** The line a row label ends on: "Finish order: Ava, Cal, Ben." or "Try Eli first, as in Eli, Fay, Gus." */
function lineIn(label: string): string[] | null {
  const m = /((?:[A-Z][a-z]*, )+[A-Z][a-z]*)(?: \([a-z ]+\))?\.$/.exec(label);
  return m ? m[1].split(', ').map((s) => s.toLowerCase()) : null;
}
/** "The tallest", "Second", "last" -> the spot number. */
function spotK(word: string, n: number): number {
  const w = word.toLowerCase().replace(/^the /, '');
  if (w === 'tallest' || w === 'first') return 1;
  if (w === 'shortest' || w === 'last') return n;
  const m = /^(second|third|fourth)(?: tallest)?$/.exec(w);
  if (!m) throw new Error(`unknown spot: ${word}`);
  return ['second', 'third', 'fourth'].indexOf(m[1]) + 2;
}

interface BoardCtx {
  ids: string[];
  clues: LineClue[];
}

/** The people and clues a row is about: the board's, unless its label quotes other clues or adds a runner. */
function rowCtx(board: BoardCtx, row: DrillRow, more: Record<string, string[]>): BoardCtx {
  const card = /^On the card: (.+)$/.exec(row.label);
  if (card) return { ids: board.ids, clues: quotesIn(card[1]).map(readBoardClue) };
  const left = /Only clue \d+ is left: (.+)$/.exec(row.label);
  if (left) return { ids: board.ids, clues: quotesIn(left[1]).map(readBoardClue) };
  const added = /^Now add a clue: “(.+)”$/.exec(row.label);
  if (added) return { ids: board.ids, clues: [...board.clues, readBoardClue(added[1])] };
  return { ids: more[row.id] ?? board.ids, clues: board.clues };
}

/** The right mark, worked out from the words alone. */
function expectedMark(ctx: BoardCtx, row: DrillRow, m: DrillMark): string {
  const { ids, clues } = ctx;
  const fit = fitHolds(ids, clues);
  const line = lineIn(row.label);
  let x: RegExpExecArray | null;
  if ((x = /^Clue (\d+): “(.+)”$/.exec(m.label))) {
    const c = readBoardClue(x[2]);
    expect(c, 'the label quotes the board’s own clue').toEqual(clues[Number(x[1]) - 1]);
    return String(holds(c, line!));
  }
  if (m.label === 'Keep or cross out?') {
    const t = /^Try (\w+) (\w+),/.exec(row.label)!;
    const who = t[1].toLowerCase();
    const k = spotK(t[2], ids.length);
    expect(line![k - 1], row.label).toBe(who);
    return fit.some((p) => p[k - 1] === who) ? 'keep' : 'reject';
  }
  if (/^Does this (line|order) fit\?$/.test(m.label)) return brokenHolds(clues, line!).length ? 'not' : 'fit';
  if ((x = /^“(.+)”$/.exec(m.label))) {
    const s = readBoardClue(x[1]);
    if (line) return String(holds(s, line));
    const yes = fit.filter((p) => holds(s, p)).length;
    return yes === fit.length ? 'must' : yes === 0 ? 'cant' : 'might';
  }
  if ((x = /^Who is taller, (\w+) or (\w+)\?$/.exec(m.label))) {
    const [a, b] = [x[1].toLowerCase(), x[2].toLowerCase()];
    const aFirst = fit.filter((p) => p.indexOf(a) < p.indexOf(b)).length;
    return aFirst === fit.length ? a : aFirst === 0 ? b : CANT;
  }
  if ((x = /^Who (?:is|finished) (?:the )?(\w+)\?$/.exec(m.label))) {
    const k = spotK(x[1], ids.length);
    const at = [...new Set(fit.map((p) => p[k - 1]))];
    return at.length === 1 ? at[0] : CANT;
  }
  if ((x = /^In what place did (\w+) finish\?$/.exec(m.label))) {
    const who = x[1].toLowerCase();
    const at = [...new Set(fit.map((p) => p.indexOf(who) + 1))];
    return at.length === 1 ? `p${at[0]}` : CANT;
  }
  const cover = /^Cover up clue (\d+): “(.+)”$/.exec(row.label);
  if (cover) {
    const k = Number(cover[1]) - 1;
    expect(readBoardClue(cover[2])).toEqual(clues[k]);
    expect(fit.length).toBe(1);
    const alts = fitHolds(ids, clues.filter((_, j) => j !== k)).filter((p) => !same(p, fit[0]));
    expect(alts.length).toBeLessThanOrEqual(1);
    if (m.label === 'Which other order fits the other clues?') {
      return alts.length ? m.options.find((o) => o.label === alts[0].map(capName).join(', '))!.id : 'none';
    }
    expect(m.label).toBe(`Is clue ${k + 1} needed?`);
    return alts.length ? 'yes' : 'no';
  }
  // A spot to fill: the one order that fits puts someone there.
  expect(fit.length, `${row.label}: one order fits`).toBe(1);
  return fit[0][spotK(m.label, ids.length) - 1];
}

const ABC_IDS = ['ava', 'ben', 'cal'];
const EFG_IDS = ['eli', 'fay', 'gus'];
/** Every guided board of Stop 3, with the runners its card names (the clues alone do not name everyone). */
const DRILLS: { lesson: number; step: DrillStep; ids: string[]; more?: Record<string, string[]> }[] = [
  { lesson: 0, step: L1_DRILL, ids: ABC_IDS },
  { lesson: 1, step: L2_DRILL[0], ids: ABC_IDS },
  { lesson: 1, step: L2_DRILL[1], ids: ABC_IDS },
  { lesson: 2, step: L3_DRILL[0], ids: EFG_IDS, more: { four: [...EFG_IDS, 'hana'] } },
  { lesson: 2, step: L3_DRILL[1], ids: ABC_IDS },
  { lesson: 2, step: L3_DRILL[2], ids: ABC_IDS },
  { lesson: 3, step: L4_DRILL[0], ids: ABC_IDS },
  { lesson: 3, step: L4_DRILL[1], ids: ABC_IDS },
  { lesson: 4, step: L5_DRILL, ids: ABC_IDS },
];
const boardClueTexts = (st: DrillStep) => (st.scene?.kind === 'clues' ? st.scene.clues : []);
const rightPicks = (st: DrillStep) => Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
const drillWords = (st: DrillStep) => [st.title, ...st.body, st.done, st.twin ?? '', ...st.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])])].filter(Boolean);

/** Clue sentences in every skin, made into patterns with the names left open: classifies any quiz clue by its words. */
const PATTERNS = SKIN_IDS.flatMap((s) => {
  const skin = SKINS[s];
  const out: { re: RegExp; slots: string[]; clue: LineClue }[] = [];
  for (const n of [3, 4, 5, 6]) {
    const cs: LineClue[] = [
      { t: 'before', a: 'xa', b: 'xb' }, { t: 'rightBefore', a: 'xa', b: 'xb' }, { t: 'nextTo', a: 'xa', b: 'xb' }, { t: 'notNextTo', a: 'xa', b: 'xb' },
      { t: 'between', a: 'xa', b: 'xb', c: 'xc' }, { t: 'first', a: 'xa' }, { t: 'last', a: 'xa' }, { t: 'notFirst', a: 'xa' }, { t: 'notLast', a: 'xa' },
      ...Array.from({ length: n - 2 }, (_, i): LineClue => ({ t: 'place', a: 'xa', k: i + 2 })),
    ];
    for (const c of cs) {
      let text: string;
      try {
        text = clueText(skin, c, n, (id) => `@${id}@`);
      } catch {
        continue;
      }
      const slots: string[] = [];
      const src = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/@(x[abc])@/g, (_, id: string) => {
        slots.push(id);
        return '([A-Z][a-z]*)';
      });
      out.push({ re: new RegExp(`^${src}$`), slots, clue: c });
    }
  }
  return out;
});
function classify(text: string): LineClue {
  for (const p of PATTERNS) {
    const m = p.re.exec(text);
    if (!m) continue;
    const map: Record<string, string> = Object.fromEntries(p.slots.map((id, i) => [id, m[i + 1].toLowerCase()]));
    const f = (v: string) => map[v] ?? v;
    const c = p.clue;
    return { ...c, a: f(c.a), ...('b' in c ? { b: f(c.b) } : {}), ...('c' in c ? { c: f(c.c) } : {}) } as LineClue;
  }
  throw new Error(`cannot classify clue: ${text}`);
}
const itemClues = (it: Item): LineClue[] => (it.kind === 'order' ? it.clues : it.scene?.kind === 'clues' ? it.scene.clues.map(classify) : []);
/** The names a prompt's opening sentence lists: "Raj, Sol and Uma compared their heights." */
function settingNames(prompt: string): string[] {
  const m = /^(?:The (?:young wizards|dragons|robots|letters) )?((?:[A-Z][a-z]*, )*[A-Z][a-z]* and [A-Z][a-z]*) /.exec(prompt);
  if (!m) throw new Error(`no names in: ${prompt}`);
  return m[1].split(/, | and /).map((s) => s.toLowerCase());
}
const namesOf = (it: Item) => (it.kind === 'order' ? it.names.map((c) => c.id) : settingNames(it.prompt));
/** The clue kinds each lesson's quiz, check items, Arcade items and new examples may use: the kinds its lessons teach. */
const ALLOWED: Record<string, readonly ClueType[]> = { 's3.l1': ['before'], 's3.l2': L2_TYPES, 's3.l3': L3_TYPES, 's3.l4': TAUGHT_TYPES, 's3.l5': TAUGHT_TYPES };

describe('stop 3: See -> Do -> Quiz (skill-drill handoff)', () => {
  it('each lesson’s boards are the ones listed here, phone-sized, and only right marks pass (tapping Next alone does not)', () => {
    stop3.lessons.forEach((l, i) => expect(l.drill, l.id).toEqual(DRILLS.filter((d) => d.lesson === i).map((d) => d.step)));
    for (const d of DRILLS) {
      const tap = marksToTap(d.step);
      expect(tap.length, d.step.id).toBeGreaterThan(0);
      expect(tap.length, `${d.step.id}: about 12 taps or fewer`).toBeLessThanOrEqual(12);
      expect(checkDrill(d.step, {}).done).toBe(false);
      expect(checkDrill(d.step, rightPicks(d.step)).done).toBe(true);
      // Nothing is filled in for the learner: a wrong mark stays wrong until it is changed.
      const [first] = tap;
      const bad = first.options.find((o) => o.id !== first.answer)!.id;
      expect(checkDrill(d.step, { ...rightPicks(d.step), [first.id]: bad }).wrong).toEqual([first.id]);
    }
  });

  it('See: each board is a card’s own board, or a twin that changes one clue and says so; each card marks its case in words that check out', () => {
    for (const d of DRILLS) {
      const cards = stop3.lessons[d.lesson].ideas.filter((c) => c.scene?.kind === 'clues');
      const mine = boardClueTexts(d.step);
      const sameBoard = cards.some((c) => JSON.stringify(c.scene) === JSON.stringify(d.step.scene));
      if (!sameBoard) {
        const twinOf = cards.find((c) => c.scene?.kind === 'clues' && c.scene.clues.length === mine.length && c.scene.clues.filter((t) => !mine.includes(t)).length === 1);
        expect(twinOf, `${d.step.id} is a twin of a card’s board`).toBeDefined();
        const old = twinOf!.scene!.kind === 'clues' ? twinOf!.scene!.clues.find((t) => !mine.includes(t))! : '';
        const now = mine.find((t) => !(twinOf!.scene!.kind === 'clues' && twinOf!.scene!.clues.includes(t)))!;
        // The twin note names the clue that changed, and what it is now.
        expect(quotesIn(d.step.twin!)).toEqual([old, now]);
      } else {
        expect(d.step.twin).toBeUndefined();
      }
    }
    const [l1, l2, l3, l4, l5] = stop3.lessons;
    const clues = (title: string, l: typeof l1) => {
      const c = l.ideas.find((x) => x.title === title)!;
      return c.scene!.kind === 'clues' ? c.scene!.clues.map(readBoardClue) : [];
    };
    const body = (title: string, l: typeof l1) => l.ideas.find((x) => x.title === title)!.body.join(' ');
    // Lesson 1: the chain stands in one line, Ava, Ben, Cal; with no clue on Ava and Cal, either can be tallest.
    expect(fitHolds(ABC_IDS, clues('Follow the chain', l1))).toEqual([['ava', 'ben', 'cal']]);
    expect(body('Follow the chain', l1)).toContain('Tallest first, the line is Ava, Ben, Cal.');
    expect([...new Set(fitHolds(ABC_IDS, clues('When you can’t tell', l1)).map((p) => p[0]))].sort()).toEqual(['ava', 'cal']);
    // Lesson 2: Ava, Ben, Cal fits “right before” (no one between).
    expect(body('Right before', l2)).toContain('The order Ava, Ben, Cal fits this clue.');
    expect(brokenHolds(clues('Right before', l2), ['ava', 'ben', 'cal'])).toEqual([]);
    // Lesson 3: the orders each card names fit, or do not, as it says.
    const next = clues('Next to', l3);
    expect(body('Next to', l3)).toContain('The order Ava, Ben, Cal fits. So does Ben, Ava, Cal.');
    expect([['ava', 'ben', 'cal'], ['ben', 'ava', 'cal']].every((p) => !brokenHolds(next, p).length)).toBe(true);
    expect(body('Next to', l3)).toContain('The order Ava, Cal, Ben does not fit.');
    expect(brokenHolds(next, ['ava', 'cal', 'ben'])).toEqual([0]);
    expect(fitHolds(ABC_IDS, clues('Between', l3)).map((p) => p.join())).toEqual(['ava,cal,ben', 'ben,cal,ava']);
    expect(fitHolds(EFG_IDS, clues('Try each spot', l3)).every((p) => p[1] === 'eli')).toBe(true);
    // Lesson 4: the worked line is the only one, and each clue is true for it.
    expect(fitHolds(ABC_IDS, clues('A worked example', l4))).toEqual([['ava', 'ben', 'cal']]);
    // Lesson 5: with clue 3 covered, clues 1 and 2 still give just Ava, Ben, Cal.
    expect(fitHolds(ABC_IDS, clues('An example', l5).slice(0, 2))).toEqual([['ava', 'ben', 'cal']]);
  });

  it('Do: every mark on every board is worked out again from the words on the board', () => {
    let checked = 0;
    for (const d of DRILLS) {
      const board: BoardCtx = { ids: d.ids, clues: boardClueTexts(d.step).map(readBoardClue) };
      for (const row of d.step.rows) {
        const ctx = rowCtx(board, row, d.more ?? {});
        for (const m of row.marks) {
          expect(m.answer, `${d.step.id} ${m.id} (${m.label})`).toBe(expectedMark(ctx, row, m));
          checked++;
        }
      }
    }
    expect(checked).toBe(70);
    // The shown case is the one its card already finished; the learner's rows are new cases.
    expect(L2_DRILL[0].rows[0].label).toBe('Finish order: Ava, Cal, Ben.');
    expect(L3_DRILL.map((st) => st.rows[0].label)).toEqual(['Try Eli second, as in Fay, Eli, Gus.', 'Try Cal second, as in Ava, Cal, Ben.', 'Try Ava first, as in Ava, Cal, Ben.']);
    expect(L4_DRILL[0].rows[0].label).toBe('Finish order: Ava, Ben, Cal.');
    expect(L5_DRILL.rows[0].label).toBe('Cover up clue 3: “Ava is taller than Cal.”');
    for (const d of DRILLS) {
      for (const row of d.step.rows) {
        const given = row.marks.filter((m) => m.given).length;
        expect(given === 0 || given === row.marks.length, `${d.step.id} ${row.id}: a row is shown or the learner’s`).toBe(true);
      }
    }
  });

  it('Do (the handoff’s Stop 3 sample): place Cal, then Ava, then Ben; then with only “Cal is taller than Ava,” Ava or Ben is Can’t tell', () => {
    const [card, chain, nochain] = L1_DRILL.rows;
    expect(L1_DRILL.scene).toEqual({ kind: 'clues', clues: ['Cal is taller than Ava.', 'Ava is taller than Ben.'] });
    expect(card.marks.every((m) => m.given)).toBe(true);
    expect(card.marks.map((m) => m.answer)).toEqual(['ava', 'ben', 'cal']);
    expect(chain.marks.some((m) => m.given)).toBe(false);
    expect(chain.marks.map((m) => [m.label, m.answer])).toEqual([['The tallest', 'cal'], ['The second tallest', 'ava'], ['The shortest', 'ben']]);
    expect(nochain.label).toBe('Take away clue 2, “Ava is taller than Ben.” Only clue 1 is left: “Cal is taller than Ava.”');
    const ask = (label: string) => nochain.marks.find((m) => m.label === label)!;
    // The compared pair is placed; the pair no clue compares is Can't tell.
    expect(ask('Who is taller, Cal or Ava?').answer).toBe('cal');
    expect(ask('Who is taller, Ava or Ben?').answer).toBe(CANT);
    expect(ask('Who is taller, Ava or Ben?').why.ava).toMatch(/No clue compares Ava and Ben\.$/);
    expect(ask('Who is the tallest?').answer).toBe(CANT);
    // A wrong tap is named in plain words, and nothing else is filled in.
    const wrong = checkDrill(L1_DRILL, { ...rightPicks(L1_DRILL), 'chain-1': 'ava' });
    expect(wrong.done).toBe(false);
    expect(wrong.message).toBe('The clue “Cal is taller than Ava” is false whenever Ava is the tallest. So Ava can’t be the tallest.');
    // No question asks for the card's answer again: the board has no "Which order?" button.
    expect(JSON.stringify(L1_DRILL)).not.toMatch(/Which order/);
  });

  it('Do: every wrong tap gets its own words: the first mismatch, about this board, at the reading level', () => {
    for (const d of DRILLS) {
      const right = rightPicks(d.step);
      const onBoard = new Set([...boardClueTexts(d.step), ...d.step.rows.flatMap((r) => [...quotesIn(r.label), ...r.marks.flatMap((m) => quotesIn(m.label))])]);
      for (const m of marksToTap(d.step)) {
        for (const o of m.options) {
          if (o.id === m.answer) continue;
          const w = m.why[o.id];
          expect(w, `${d.step.id} ${m.id}: words for “${o.label}”`).toBeTruthy();
          expect(checkDrill(d.step, { ...right, [m.id]: o.id }).message).toBe(w);
          expect(w).not.toMatch(/Look at the board again|\bWrong\b|['"]/);
          // It is about this board: it names someone on it, or a clue by its number.
          expect(/\b(Ava|Ben|Cal|Eli|Fay|Gus|Hana)\b|\b[Cc]lue \d/.test(w), w).toBe(true);
          // Every sentence it quotes is on the board.
          for (const q of quotesIn(w)) expect(onBoard.has(q), `${d.step.id} ${m.id}: “${q}”`).toBe(true);
          for (const s of sentences(w)) expect(words(s).length, s).toBeLessThanOrEqual(READING.maxSentenceWords);
          // No vague words without naming what they point at.
          expect(w).not.toMatch(/\bboth\b|that row|the opposite/i);
        }
      }
    }
    stop3.lessons.forEach((l) => {
      const text = (l.drill ?? []).flatMap(drillWords).join('\n');
      expect(fkGrade(text), l.id).toBeLessThanOrEqual(READING.maxGrade);
      expect(longestSentence(text).words, longestSentence(text).sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
      expect(text).not.toMatch(/['"]/);
    });
  });

  it('Quiz: practice, the check, the Arcade and new examples use only the clue kinds the lessons teach (never “not next to”)', () => {
    const seen = new Set<string>();
    const ok = (it: Item, where: string) => {
      for (const c of itemClues(it)) {
        expect(ALLOWED[it.lesson], `${where} ${it.id} (${it.lesson}) uses a ${c.t} clue`).toContain(c.t);
        seen.add(`${it.lesson}:${c.t}`);
      }
    };
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop3.lessons) {
        for (const it of l.practice(createRng(seed))) {
          ok(it, `practice seed ${seed}`);
          if (seed <= 15) for (const x of freshCheckSet(stop3, it, seed, [], 1)) ok(x, `new example seed ${seed}`);
        }
      }
      for (const it of stop3.check!(createRng(seed))) ok(it, `check seed ${seed}`);
    }
    for (let seed = 1; seed <= 300; seed++) ok(stop3.practice!(createRng(seed)), `arcade seed ${seed}`);
    // The kinds that are taught still come up.
    for (const k of ['s3.l2:rightBefore', 's3.l3:nextTo', 's3.l3:between', 's3.l3:notFirst', 's3.l4:first', 's3.l4:between', 's3.l5:before']) expect(seen.has(k), k).toBe(true);
  });

  it('Quiz try 1 is a twin of the board in a new skin, and every set keeps to the lesson’s rule family', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const [p1, p2, p3, p4, p5] = stop3.lessons.map((l) => l.practice(createRng(seed)));
      const tags = (xs: Item[]) => xs.flatMap((x) => x.tags ?? []);
      // Lesson 1: a new chain that decides who is first, three people, not heights; then a non-chain (Can't tell).
      expect(p1[0].tags).toEqual(['decided', 'ask-first']);
      expect(namesOf(p1[0]).length).toBe(3);
      expect(p1[0].prompt).not.toMatch(/compared their heights/);
      expect(p1[1].tags).toEqual(['cant-tell', 'ask-first']);
      expect(namesOf(p1[1]).length).toBe(3);
      expect(tags(p1).filter((t) => t === 'cant-tell').length).toBe(2);
      // Lesson 2: a “before” clue and a “right before” sentence, three people, not a race.
      expect(p2[0].tags).toContain('before-trap');
      expect(p2[0].conflict).toBe(true);
      expect(namesOf(p2[0]).length).toBe(3);
      expect(p2[0].prompt).not.toMatch(/ran a race/);
      expect(p2.slice(1).map((x) => (x.kind === 'choose' ? x.answer : '')).sort()).toEqual(expect.arrayContaining(['cant', 'must']));
      // Lesson 3: where is someone, three people, decided, only "not first" and "not last" clues; then next to and between.
      expect(p3[0].tags).toEqual(['decided', 'ends', 'where']);
      expect(namesOf(p3[0]).length).toBe(3);
      for (const c of itemClues(p3[0])) expect(L3_FIRST_TYPES).toContain(c.t);
      for (const t of ['cant-tell', 'nextTo', 'between']) expect(tags(p3), `seed ${seed} ${t}`).toContain(t);
      // Lesson 4: three people with the board's kinds of clue, then four and five.
      expect(p4.map((x) => (x.kind === 'order' ? x.names.length : 0))).toEqual([3, 4, 5]);
      for (const c of itemClues(p4[0])) expect(L4_FIRST_TYPES).toContain(c.t);
      expect(p4[0].prompt).not.toMatch(/ran a race/);
      // Lesson 5: the card's case in a new skin: three people, "before" clues only.
      expect(namesOf(p5[0]).length).toBe(3);
      expect(itemClues(p5[0]).every((c) => c.t === 'before')).toBe(true);
      expect(p5[0].prompt).not.toMatch(/compared their heights/);
      for (const xs of [p1, p2, p3, p4, p5]) for (const x of xs) expect(x.workFirst).toBeUndefined();
    }
  });

  it('Pass: each lesson’s include group is in every planned set, and three first-try answers without it do not pass', () => {
    const [l1, l2, l3] = stop3.lessons;
    expect(l1.pass).toEqual({ firstTry: 3, include: [{ tag: 'cant-tell', label: 'a can’t-tell puzzle' }] });
    expect(l2.pass?.include?.map((g) => g.tag)).toEqual(['before-trap']);
    expect(l3.pass?.include?.map((g) => g.tag)).toEqual(['cant-tell']);
    expect(stop3.lessons[3].pass).toBeUndefined();
    expect(stop3.lessons[4].pass).toBeUndefined();
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop3.lessons) for (const g of l.pass?.include ?? []) expect(l.practice(createRng(seed)).some((x) => x.tags?.includes(g.tag)), `${l.id} seed ${seed}`).toBe(true);
    }
    const decided = { clean: true, tags: ['decided'] };
    expect(passState(l1.pass, [decided, decided, decided]).met).toBe(false);
    expect(passState(l1.pass, [decided, decided, { clean: true, tags: ['cant-tell'] }]).met).toBe(true);
    expect(passState(l2.pass, [{ clean: true, tags: ['must'] }, { clean: true, tags: ['cant'] }, { clean: true, tags: ['might'] }]).met).toBe(false);
    expect(passState(l2.pass, [{ clean: true, tags: ['might', 'before-trap'] }, { clean: true, tags: ['cant'] }, { clean: true, tags: ['must'] }]).met).toBe(true);
  });

  it('Hint: every quiz hint shows one try already checked, every clue marked, and never the answer’s case', () => {
    for (const l of stop3.lessons) {
      const text = [1, 2, 3, 4, 5].flatMap((s) => l.practice(createRng(s))).flatMap((it) => [it.hint ?? '', ...(it.hintCase ? caseText(it.hintCase) : [])]).join('\n');
      expect(fkGrade(text), `${l.id} hints`).toBeLessThanOrEqual(READING.maxGrade);
      expect(text).not.toMatch(/['"]|\bboth\b|that row|the opposite/i);
    }
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of stop3.lessons) {
        for (const it of l.practice(createRng(seed))) {
          expect(it.hint, it.id).toBeTruthy();
          const c = it.hintCase!;
          expect(c, `${l.id} ${it.id}`).toBeDefined();
          const m = /^([A-Z][a-z ]+): ((?:[A-Za-z]+, )+[A-Za-z]+)\.$/.exec(c.label)!;
          expect(m, c.label).not.toBeNull();
          const line = m[2].split(', ').map((s) => s.toLowerCase());
          expect([...line].sort()).toEqual([...namesOf(it)].sort());
          const clues = itemClues(it);
          const texts = it.scene?.kind === 'clues' ? it.scene.clues : [];
          // Every clue is listed, in order, marked as it is for that line.
          const clueTruths = c.truths!.filter((t) => t.who.startsWith('Clue '));
          expect(clueTruths.map((t) => t.who)).toEqual(texts.map((x, i) => `Clue ${i + 1}, “${x.replace(/\.$/, '')}”`));
          clueTruths.forEach((t, i) => expect(t.value, `${it.id} ${t.who}`).toBe(holds(clues[i], line)));
          const broken = brokenHolds(clues, line);
          expect(c.note).toBeTruthy();
          for (const s of [it.hint!, ...caseText(c)]) for (const x of sentences(s)) expect(words(x).length, x).toBeLessThanOrEqual(READING.maxSentenceWords);
          if (it.kind === 'order') {
            // Lesson 4: a line that is not the answer, tested clue by clue.
            expect(same(line, it.answer)).toBe(false);
            expect(broken.length).toBeGreaterThan(0);
            continue;
          }
          if (it.kind !== 'choose') continue;
          if (l.id === 's3.l2') {
            // One order with every clue and the sentence marked, never the answer's case (often only one order
            // fits). Must: an order that makes the sentence false, and it breaks a clue. Can't: one that makes it
            // true, and it breaks a clue. Might: an order that fits; for the "before" trap, one with someone in
            // between, so the sentence is false there.
            const stmt = classify(/“(.+?)”/.exec(it.prompt)![1]);
            const said = c.truths!.find((t) => t.who.startsWith('The sentence'))!.value;
            expect(said).toBe(holds(stmt, line));
            if (it.answer === 'must' || it.answer === 'cant') {
              expect(said, `${it.id} ${c.label}`).toBe(it.answer === 'cant');
              expect(broken.length, `${it.id} ${c.label}`).toBeGreaterThan(0);
            } else {
              expect(broken).toEqual([]);
              if (it.tags!.includes('before-trap')) expect(said, `${it.id} ${c.label}`).toBe(false);
            }
            // The hint never says that other orders fit: often none does.
            expect(it.hint).not.toMatch(/other orders that fit/);
          } else if (l.id === 's3.l5') {
            // A needed clue covered: the line breaks only that clue, and it is not the clue that is not needed.
            const k = Number(/With clue (\d+) covered/.exec(c.note!)![1]) - 1;
            expect(broken).toEqual([k]);
            expect(it.choices[k].id).not.toBe(it.answer);
          } else if (it.answer !== CANT) {
            // Lessons 1 and 3, decided: a try the clues cross out, so never the answer's case.
            expect(broken.length, `${it.id} ${c.label}`).toBeGreaterThan(0);
            if (l.id === 's3.l1') {
              const who = /So cross out (\w+)\.$/.exec(c.note!)![1].toLowerCase();
              expect(who).not.toBe(it.answer);
              expect(line[it.tags!.includes('ask-first') ? 0 : line.length - 1]).toBe(who);
            }
          }
        }
      }
    }
  });
});

describe('stop 3: review fixes (skill-drill handoff)', () => {
  it('a twin board says what changed once: in its twin note, which the board draws and reads aloud', () => {
    const twins = DRILLS.filter((d) => d.step.twin);
    expect(twins.map((d) => d.step.id)).toEqual(['s3.l1-do', 's3.l4-do2']);
    for (const d of twins) {
      expect(d.step.twin, d.step.id).toMatch(/changed\. “.+” is now “.+”$/);
      expect(d.step.body.join(' '), d.step.id).not.toContain(d.step.twin);
      expect(drillSpeech(d.step), d.step.id).toContain(d.step.twin);
    }
  });

  it('a lesson’s board questions are not all Can’t tell, and no board asks what its card already said', () => {
    // A learner who taps Can't tell on every question must not get every question right.
    for (const l of stop3.lessons) {
      const asks = (l.drill ?? []).flatMap(marksToTap).filter((m) => m.options.some((o) => o.id === CANT));
      if (asks.length) expect(asks.some((m) => m.answer !== CANT), `${l.id}: every question is Can’t tell`).toBe(true);
    }
    // Lesson 3: on the “Next to” and “Between” boards the question is open until one clue is added, and the added
    // clue decides it. The added clue is a kind lesson 3 uses (“before”).
    for (const st of [L3_DRILL[1], L3_DRILL[2]]) {
      const ask = st.rows.find((r) => r.id === 'ask')!;
      const add = st.rows.find((r) => r.id === 'add')!;
      expect(ask.marks.map((m) => m.answer)).toEqual([CANT]);
      expect(add.marks.length).toBe(1);
      expect(add.marks[0].answer).not.toBe(CANT);
      expect(L3_TYPES).toContain(readBoardClue(/^Now add a clue: “(.+)”$/.exec(add.label)![1]).t);
    }
    // The “Between” card says Cal must be in the middle, so its board never asks where Cal finished.
    expect(stop3.lessons[2].ideas.find((c) => c.title === 'Between')!.body.join(' ')).toContain('Cal must be in the middle');
    expect(L3_DRILL[2].rows.flatMap((r) => r.marks).map((m) => m.label)).not.toContain('In what place did Cal finish?');
  });

  it('“Explain more simply” in lessons 2 and 3 uses only the clue kinds those lessons teach', () => {
    for (const s of ORDERLY) {
      for (const focus of ['ends', 'nextTo', 'between'] as SpotFocus[]) {
        for (const forced of [true, false]) {
          for (const c of spotSimpler(SKINS[s], [], focus, forced).clues) expect(L3_TYPES, `${s} ${focus} ${forced}`).toContain(c.t);
        }
      }
      for (const status of ['must', 'might', 'cant'] as Status[]) {
        for (const t of ['before', 'rightBefore'] as const) {
          for (const c of statusSimpler(SKINS[s], [], status, t).clues) expect(L2_TYPES, `${s} ${status} ${t}`).toContain(c.t);
        }
      }
    }
  });

  it('lesson 2’s hint never shows the one order that fits (that would give the answer away)', () => {
    let single = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (const it of stop3.lessons[1].practice(createRng(seed))) {
        if (it.kind !== 'choose') continue;
        const ids = namesOf(it);
        const fit = fitHolds(ids, itemClues(it));
        if (fit.length !== 1) continue;
        single++;
        const line = /: ((?:[A-Za-z]+, )+[A-Za-z]+)\.$/.exec(it.hintCase!.label)![1].toLowerCase().split(', ');
        expect(same(fit[0], line), `${it.id}: the hint shows the only order that fits`).toBe(false);
      }
    }
    expect(single, 'items where only one order fits').toBeGreaterThan(50);
  });
});
