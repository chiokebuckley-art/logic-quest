/**
 * Stop 3 line-up engine. Every answer is re-derived here by brute force (all orders of the people,
 * checked with clueHolds), independent of the helpers the engine uses to build items.
 */
import { describe, expect, it } from 'vitest';
import { stop3 } from '../../content/stop3';
import { clueHolds, grade } from '../grade';
import {
  CANT,
  ORDERLY,
  SKINS,
  SKIN_IDS,
  buildPuzzle,
  chainPuzzle,
  clueText,
  extraCluePuzzle,
  forceClues,
  spotPuzzle,
  statusPuzzle,
  trueClues,
  type SkinId,
  type Status,
} from '../puzzles/lineup';
import { createRng } from '../rng';
import type { ChooseItem, Item, LineClue } from '../types';

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

function cleanText(item: Item) {
  const whyWrong = item.kind === 'choose' ? Object.values(item.whyWrong ?? {}) : [];
  const labels = item.kind === 'choose' ? item.choices.map((c) => c.label) : [];
  const scene = item.scene?.kind === 'clues' ? item.scene.clues : [];
  const all = [item.prompt, item.explain, item.hint ?? '', ...whyWrong, ...labels, ...scene].join(' ');
  expect(all).not.toMatch(/undefined|NaN|\{list\}|\s\s|\.\./);
  // Curly apostrophes and quotes only.
  expect(all).not.toMatch(/['"]/);
  // The screen already shows a "Not yet" heading, so the message must not repeat it.
  for (const msg of whyWrong) expect(msg).not.toMatch(/^Not yet/);
}

function whyWrongCoversWrongChoices(item: ChooseItem) {
  const wrong = item.choices.map((c) => c.id).filter((id) => id !== item.answer);
  expect(Object.keys(item.whyWrong ?? {}).sort()).toEqual(wrong.sort());
}

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
        // "P could be first, but so could Q (and R). No clue decides between them." holds.
        let couldMsgs = 0;
        for (const msg of Object.values(item.whyWrong!)) {
          const m = msg.match(/^(\w+) could .*, but so could (.+?)\. No clue decides between them\.$/);
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
      for (const e of ends) expect(named(item.whyWrong![e]), `seed ${seed}: ${item.whyWrong![e]}`).toEqual(ends);
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
        // Every order quoted as a witness really fits, and says what the text claims.
        for (const o of quotedOrders([item.explain, ...Object.values(item.whyWrong!)].join(' '))) {
          expect(fits.some((f) => same(f, o)), `seed ${seed}: ${o}`).toBe(true);
        }
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
      const { item, ids, clues, stmt } = statusPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), conflict: true });
      expect(stmt.t).toBe('rightBefore');
      expect(clues.some((c) => c.t === 'before' && c.a === stmt.a && c.b === stmt.b)).toBe(true);
      expect(item.answer).toBe('might');
      expect(item.conflict).toBe(true);
      expect(item.whyWrong!.must).toMatch(/^You read/);
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
          for (const o of quotedOrders([item.explain, ...Object.values(item.whyWrong!)].join(' '))) {
            expect(fits.some((f) => same(f, o))).toBe(true);
          }
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

  it('conflict items leave the tempting answer open', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ends = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), conflict: 'ends' });
      expect(ends.ids.length).toBe(4);
      expect(ends.clues).toContainEqual({ t: 'notFirst', a: ends.target });
      expect(ends.clues).toContainEqual({ t: 'notLast', a: ends.target });
      expect(ends.item.answer).toBe(CANT);
      expect(new Set(fitting(ends.ids, ends.clues).map((o) => o.indexOf(ends.target)))).toEqual(new Set([1, 2]));

      const btw = spotPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed, ORDERLY), conflict: 'between' });
      expect(btw.clues.some((c) => c.t === 'between')).toBe(true);
      expect(btw.item.answer).toBe(CANT);
      expect(btw.item.conflict).toBe(true);
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
      expect(item.answer).toBe(`k${removable.indexOf(true) + 1}`);
      expect(new Set(item.choices.map((c) => c.label)).size).toBe(item.choices.length);
      whyWrongCoversWrongChoices(item);
      cleanText(item);
      // Each "not yet" names an order that fits without that clue and is not the answer.
      for (const [id, msg] of Object.entries(item.whyWrong!)) {
        const i = Number(id.slice(1)) - 1;
        const [alt] = quotedOrders(msg);
        expect(same(alt, order)).toBe(false);
        expect(clues.filter((_, j) => j !== i).every((c) => clueHolds(c, alt))).toBe(true);
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
    expect(fb(['a', 'b', 'd', 'c'])).toBe('This line breaks clues 3 and 4.');
    expect(fb(['b', 'a', 'd', 'c'])).toBe('This line breaks clues 1, 2, 3 and 4.');
    expect(fb(['a', 'c', 'b', 'd'])).toBe('This line breaks clues 2 and 3.');
  });
});

