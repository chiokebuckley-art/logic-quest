/**
 * Stop 9 · Truth Tables. Every answer is worked out again here by a second method: the sentence is read back from the
 * words the learner sees (a small parser of NOT, AND, OR and IF … THEN), every case is listed by counting in binary,
 * and IF … THEN is “not the IF part, or the THEN part”. None of it calls the code that set the answer. Card rules are
 * checked over all 18 cards with Stop 2's rules.ts.
 */
import { describe, expect, it } from 'vitest';
import { stop9 } from '../../content/stop9';
import { STOPS } from '../../content/stops';
import { S9_WORLD } from '../../content/world/s9';
import { SOON_WORLD, WORLD } from '../../content/world';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { ALL_CARDS, evaluate, meaning } from '../puzzles/rules';
import {
  ALWAYS_POOL,
  MOST_POOL,
  NEVER_POOL,
  SOME_POOL,
  ONE_ROW_PAIRS,
  TOPICS,
  breakRowItem,
  bridgeItem,
  cardsSameItem,
  cellItem,
  columnItem,
  countItem,
  diffRowItem,
  ifCellItem,
  ifColumnItem,
  kindItem,
  missingItem,
  pickAlwaysItem,
  pickSameItem,
  repeatItem,
  rowsFor,
  sameItem,
  say,
  whyItem,
  type Skin,
  type TableMade,
  type WhyKind,
} from '../puzzles/tables';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import { tableSpeech } from '../../game/speech';
import type { ChooseItem, DrillStep, Item, Scene } from '../types';

const SEEDS = 200;
const SKINS: Skin[] = ['letters', 'everyday', 'fantasy'];
const choose = (m: TableMade) => m.item as ChooseItem;
type TableScene = Extract<Scene, { kind: 'table' }>;

// ---------- the second method ----------

type Ast = { t: 'v'; name: string } | { t: 'not'; a: Ast } | { t: 'and' | 'or' | 'if'; a: Ast; b: Ast };

/** Read a sentence back from its words: “NOT (A AND B)”, “IF NOT B, THEN NOT A”, “(A OR B) AND C”, card words too. */
function parse(text: string): Ast {
  const toks = text.trim().replace(/^“|”$/g, '').replace(/[.]$/, '').match(/\(|\)|,|a circle|a square|a triangle|[A-Za-z]+/g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const eat = (t?: string) => {
    const x = toks[i++];
    if (t && x !== t) throw new Error(`expected ${t}, got ${x} in “${text}”`);
    return x;
  };
  const sentence = (): Ast => {
    if (peek() === 'IF') {
      eat('IF');
      const a = expr();
      eat(',');
      eat('THEN');
      return { t: 'if', a, b: expr() };
    }
    return expr();
  };
  const expr = (): Ast => {
    let x = term();
    while (peek() === 'OR') { eat(); x = { t: 'or', a: x, b: term() }; }
    return x;
  };
  const term = (): Ast => {
    let x = factor();
    while (peek() === 'AND') { eat(); x = { t: 'and', a: x, b: factor() }; }
    return x;
  };
  const factor = (): Ast => {
    const x = eat();
    if (x === 'NOT') return { t: 'not', a: factor() };
    if (x === '(') {
      const s = sentence();
      eat(')');
      return s;
    }
    if (!x || ['AND', 'OR', 'THEN', ',', ')'].includes(x)) throw new Error(`bad word ${x} in “${text}”`);
    return { t: 'v', name: x };
  };
  const out = sentence();
  if (i !== toks.length) throw new Error(`extra words in “${text}”`);
  return out;
}

/** IF … THEN as “not the IF part, or the THEN part”, written here, not taken from the engine. */
function val(a: Ast, env: Record<string, boolean>): boolean {
  switch (a.t) {
    case 'v':
      if (!(a.name in env)) throw new Error(`no value for ${a.name}`);
      return env[a.name];
    case 'not': return !val(a.a, env);
    case 'and': return val(a.a, env) && val(a.b, env);
    case 'or': return val(a.a, env) || val(a.b, env);
    case 'if': return !val(a.a, env) || val(a.b, env);
  }
}

/** Every case of these names, by counting: row k has name j true when bit (n-1-j) of k is 0. True first, as the tables list them. */
function cases(names: readonly string[]): Record<string, boolean>[] {
  const n = names.length;
  return Array.from({ length: 2 ** n }, (_, k) => Object.fromEntries(names.map((nm, j) => [nm, ((k >> (n - 1 - j)) & 1) === 0])));
}
const colOf = (text: string, names: readonly string[]) => cases(names).map((e) => val(parse(text), e));
const word = (v: boolean) => (v ? 'True' : 'False');

/** The parts of a table scene, and each row as a case. */
function tableOf(scene: Scene | undefined): { names: string[]; rows: boolean[][]; t: TableScene } {
  expect(scene?.kind).toBe('table');
  const t = scene as TableScene;
  return { names: t.heads.slice(0, t.inputs), rows: t.cells.map((r) => r.slice(0, t.inputs).map((v) => v === true)), t };
}
/** A sentence named in running words, from a prompt: the first quoted sentence after `after`, or a bare letter. */
const quoted = (text: string) => [...text.matchAll(/“([^”]+)”/g)].map((m) => m[1].replace(/[.,]$/, ''));

const maker = (f: (rng: ReturnType<typeof createRng>, o: { skin: Skin }) => TableMade) => (skin: Skin, seed: number) => f(createRng(seed), { skin });

// ---------- Lesson 1: every case in rows ----------

describe('Lesson 1: every case, each one once', () => {
  it('the usual order is the counting order, and the two-part rows are Stop 6’s four boxes', () => {
    for (const n of [1, 2, 3, 4]) {
      const names = ['A', 'B', 'C', 'D'].slice(0, n);
      expect(rowsFor(n).map((r) => r.map(Boolean))).toEqual(cases(names).map((e) => names.map((x) => e[x])));
    }
  });

  it('how many rows: the count of every case, by counting', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(countItem)(skin, seed));
      const n = Number(/for (\d) sentences/.exec(it.prompt)![1]);
      const names = ['A', 'B', 'C', 'D'].slice(0, n);
      expect(it.answer, it.prompt).toBe(`n${cases(names).length}`);
      expect(new Set(it.choices.map((c) => c.id)).size).toBe(4);
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id].headline.trim().length).toBeGreaterThan(0);
    }
  });

  it('which case is missing: the one case no row shows', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = missingItem(createRng(seed), { skin });
      const it = choose(m);
      const { names, rows } = tableOf(it.scene);
      const all = cases(names).map((e) => names.map((x) => e[x]));
      const gone = all.filter((r) => !rows.some((x) => JSON.stringify(x) === JSON.stringify(r)));
      expect(gone.length).toBe(1);
      expect(rows.length).toBe(all.length - 1);
      expect(it.answer).toBe(`case-${gone[0].map((v) => (v ? 'T' : 'F')).join('')}`);
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id].headline).toMatch(/already in the table, in row \d/);
    }
  });

  it('a table with a row twice (the trap): the right count, one case twice and one missing; a whole table says yes', () => {
    let traps = 0, whole = 0;
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = repeatItem(createRng(seed), { skin, complete: seed % 3 === 0 });
      const it = choose(m);
      const { names, rows } = tableOf(it.scene);
      const distinct = new Set(rows.map((r) => r.join())).size;
      expect(rows.length, 'the count is always right').toBe(cases(names).length);
      const complete = distinct === cases(names).length;
      expect(it.answer).toBe(complete ? 'once' : 'twice');
      expect(!!it.conflict).toBe(!complete);
      expect(it.tags ?? []).toEqual(complete ? [] : ['repeat-row']);
      if (complete) whole++;
      else traps++;
      // The all-false case is never the missing one, so “a row with every sentence false should not be there” is only a misreading.
      expect(rows.some((r) => r.every((v) => !v))).toBe(true);
      // Nor is it the case shown twice: one of two all-false rows really should go, so that choice would be half right.
      expect(rows.filter((r) => r.every((v) => !v)).length, `seed ${seed}`).toBe(1);
      // Every row the feedback names by number is that row of the table on screen (its rows are in no special order).
      const caseIn = (text: string) => Object.fromEntries([...text.matchAll(/\b([A-C]) is (true|false)/g)].map((x) => [x[1], x[2] === 'true']));
      for (const fb of Object.values(it.feedback ?? {})) {
        const ex = fb.example;
        const at = ex ? /^Rows? (\d+)(?: and (\d+))?: (.+)$/.exec(ex.label) : null;
        if (!ex || !at) continue;
        const want = caseIn(at[3]);
        for (const k of [at[1], at[2]].filter(Boolean).map(Number)) names.forEach((nm, j) => expect(rows[k - 1][j], `seed ${seed} ${ex.label}`).toBe(want[nm]));
      }
    }
    expect(traps).toBeGreaterThan(100);
    expect(whole).toBeGreaterThan(50);
  });
});

// ---------- Lesson 2: NOT, AND, OR ----------

describe('Lesson 2: a column by its rule', () => {
  it('which column: the right column is the sentence worked out in every case; every wrong column differs and is explained', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(columnItem)(skin, seed));
      const [text] = quoted(it.prompt);
      const { names } = tableOf(it.scene);
      const right = colOf(text, names).map(word).join(', ');
      expect(it.choices.find((c) => c.id === it.answer)!.label, it.prompt).toBe(right);
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        expect(c.label).not.toBe(right);
        expect(it.feedback![c.id].example).toBeDefined();
      }
      expect(it.choices.length).toBe(4);
    }
  });

  it('one box: the value in that row, worked out again; OR when both are true is the trap', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = cellItem(createRng(seed), { skin, tag: 'fill' });
      const it = choose(m);
      const [text] = quoted(it.prompt);
      const k = Number(/Look at row (\d)/.exec(it.prompt)![1]) - 1;
      const { names, t } = tableOf(it.scene);
      expect(t.marked).toEqual([k]);
      expect(it.answer).toBe(String(colOf(text, names)[k]));
    }
    for (let seed = 1; seed <= 60; seed++) {
      const it = choose(cellItem(createRng(seed), { skin: 'letters', tag: 'fill', sen: parseSen('A OR B'), row: 0, trap: { tag: 'or-both' } }));
      expect(it.answer).toBe('true');
      expect(it.tags).toEqual(['or-both']);
      expect(it.feedback!.false.headline).toContain('one but not both');
    }
  });
});

/** A sentence from its words, as the engine builds it (only for a test that needs a fixed sentence). */
function parseSen(text: string) {
  const toSen = (a: Ast): import('../puzzles/tables').Sen =>
    a.t === 'v' ? { op: 'atom', i: ['A', 'B', 'C'].indexOf(a.name) } : a.t === 'not' ? { op: 'not', a: toSen(a.a) } : { op: a.t, a: toSen(a.a), b: toSen(a.b) };
  return toSen(parse(text));
}

// ---------- Lesson 3: the IF table ----------

describe('Lesson 3: the IF table', () => {
  it('the IF column is False in one row only, worked out as “not the IF part, or the THEN part”', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(ifColumnItem)(skin, seed));
      const [text] = quoted(it.prompt.replace(/^[^“]*The rule:[^.]*\./, ''));
      expect(text).toBe('IF P, THEN Q');
      const right = colOf(text, ['P', 'Q']);
      expect(right.filter((v) => !v).length).toBe(1);
      expect(it.choices.find((c) => c.id === it.answer)!.label).toBe(right.map(word).join(', '));
    }
  });

  it('one row: a row with P false is True (the trap), and only P true with Q false is False', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(ifCellItem(createRng(seed), { skin }));
      const k = Number(/Look at row (\d)/.exec(it.prompt)![1]) - 1;
      const row = cases(['P', 'Q'])[k];
      expect(it.answer).toBe(String(val(parse('IF P, THEN Q'), row)));
      expect(!!it.tags?.includes('if-false')).toBe(!row.P);
      expect(!!it.conflict).toBe(!row.P);
    }
  });

  it('the row that breaks a story rule: the IF part happens and the THEN part does not', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = breakRowItem(createRng(seed), { skin });
      const it = choose(m);
      const t = m.topic!;
      const breaks = cases(['P', 'Q']).filter((e) => !val(parse('IF P, THEN Q'), e));
      expect(breaks.length).toBe(1);
      const want = `${t.parts[0].yes}, and ${t.parts[1].no}.`;
      expect(it.choices.find((c) => c.id === it.answer)!.label.toLowerCase()).toBe(want.toLowerCase());
      expect(it.prompt).toContain(`IF ${t.parts[0].yes}, THEN ${t.parts[1].yes}`);
    }
  });
});

// ---------- Lesson 4: same meaning ----------

describe('Lesson 4: same meaning, every row', () => {
  it('do they mean the same: yes exactly when the columns match in every case; the NOT on each part is the trap', () => {
    let yes = 0, no = 0, traps = 0;
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      for (const o of [{}, { trap: true }, { want: true }, { want: false }]) {
        const it = choose(sameItem(createRng(seed), { skin, ...o }));
        const [s, u] = quoted(it.prompt);
        const same = JSON.stringify(colOf(s, ['A', 'B'])) === JSON.stringify(colOf(u, ['A', 'B']));
        expect(it.answer, it.prompt).toBe(same ? 'yes' : 'no');
        if (same) yes++;
        else no++;
        // The trap: NOT (X op Y) beside NOT X op NOT Y. They agree in some rows and differ in others.
        const agree = cases(['A', 'B']).filter((e) => val(parse(s), e) === val(parse(u), e)).length;
        if (it.tags?.includes('not-each')) {
          traps++;
          expect(agree).toBe(2);
          expect(it.conflict).toBe(true);
          expect([s, u].some((x) => x.startsWith('NOT (')) && [s, u].some((x) => /^NOT [AB] (AND|OR) NOT [AB]$/.test(x))).toBe(true);
        }
        if ('trap' in o) expect(it.tags).toEqual(['not-each']);
      }
    }
    expect(yes).toBeGreaterThan(100);
    expect(no).toBeGreaterThan(100);
    expect(traps).toBeGreaterThan(100);
  });

  it('which sentence means the same: exactly one choice matches in every row, and it is the answer', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(pickSameItem)(skin, seed));
      const [target] = quoted(it.prompt);
      const want = JSON.stringify(colOf(target, ['A', 'B']));
      const matches = it.choices.filter((c) => JSON.stringify(colOf(c.label, ['A', 'B'])) === want);
      expect(matches.map((c) => c.id), it.prompt).toEqual([it.answer]);
      // The scene shows the target's column, worked out the same way.
      const { t } = tableOf(it.scene);
      expect(t.cells.map((r) => r[2])).toEqual(colOf(target, ['A', 'B']));
    }
  });

  it('where two sentences differ: they agree in three rows, and the answer is the fourth', () => {
    expect(ONE_ROW_PAIRS.length).toBeGreaterThanOrEqual(6);
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(diffRowItem)(skin, seed));
      const m = /^(?:.*?\. )?(“[^”]+”) and (“[^”]+”) agree in three rows/.exec(it.prompt)!;
      const [s, u] = [m[1], m[2]].map((x) => x.replace(/[“”]/g, ''));
      const d = cases(['A', 'B']).flatMap((e, k) => (val(parse(s), e) !== val(parse(u), e) ? [k] : []));
      expect(d.length, it.prompt).toBe(1);
      expect(it.answer).toBe(`row${d[0] + 1}`);
    }
  });

  it('card rules (Stop 2): the answer is rules.ts over all 18 cards, the table agrees, and a “no” names a card that fits just one', () => {
    let no = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = cardsSameItem(createRng(seed), { trap: seed % 2 === 0 });
      const it = choose(m);
      const [F, G] = m.rules!;
      const same = meaning(F) === meaning(G);
      expect(it.answer).toBe(same ? 'yes' : 'no');
      // The table: each row is a kind of card, worked out from the rule words in the prompt.
      const [rf, rg] = quoted(it.prompt);
      const { names } = tableOf(it.scene);
      expect(JSON.stringify(colOf(rf, names)) === JSON.stringify(colOf(rg, names))).toBe(same);
      if (!same) {
        no++;
        const c = m.card!;
        expect(evaluate(F, c)).not.toBe(evaluate(G, c));
        expect(it.feedback!.yes.example?.things?.length).toBe(1);
      }
    }
    expect(no).toBeGreaterThan(50);
  });
});

// ---------- Lesson 5: always, sometimes, never ----------

describe('Lesson 5: always true, never true', () => {
  const kindByRows = (text: string, names: readonly string[]) => {
    const c = colOf(text, names);
    return c.every(Boolean) ? 'always' : c.some(Boolean) ? 'sometimes' : 'never';
  };

  it('the pools are what they say, worked out again', () => {
    const names = ['A', 'B'];
    for (const s of ALWAYS_POOL) expect(kindByRows(say(s, names), names), say(s, names)).toBe('always');
    for (const s of NEVER_POOL) expect(kindByRows(say(s, names), names), say(s, names)).toBe('never');
    for (const s of [...MOST_POOL, ...SOME_POOL]) expect(kindByRows(say(s, names), names), say(s, names)).toBe('sometimes');
    for (const s of MOST_POOL) expect(colOf(say(s, names), names).filter(Boolean).length).toBe(3);
  });

  it('always, sometimes or never: the answer by every row; true in most rows is the trap', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(kindItem)(skin, seed));
      const [text] = quoted(it.prompt);
      const { names } = tableOf(it.scene);
      expect(it.answer, it.prompt).toBe(kindByRows(text, names));
      // “Most rows” is said only of a sentence that is True in more rows than it is False.
      const most = colOf(text, names).filter(Boolean).length > colOf(text, names).length / 2;
      for (const fb of Object.values(it.feedback ?? {})) if (fb.detail.join(' ').includes('Most rows')) expect(most, `${it.prompt} ${fb.detail.join(' ')}`).toBe(true);
      if (it.tags?.includes('most-rows')) {
        const c = colOf(text, names);
        expect(c.filter(Boolean).length).toBeGreaterThan(c.length / 2);
        expect(c.every(Boolean)).toBe(false);
        expect(it.conflict).toBe(true);
      }
    }
  });

  it('which is always true: exactly one choice is True in every row', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(maker(pickAlwaysItem)(skin, seed));
      const { names } = tableOf(it.scene);
      const always = it.choices.filter((c) => kindByRows(c.label, names) === 'always');
      expect(always.map((c) => c.id)).toEqual([it.answer]);
    }
  });
});

// ---------- every kind: shape, feedback, hints, the same seed ----------

const MAKERS: [string, (skin: Skin, seed: number) => TableMade][] = [
  ['count', maker(countItem)],
  ['missing', maker(missingItem)],
  ['repeat', maker(repeatItem)],
  ['column', maker(columnItem)],
  ['cell', (skin, seed) => cellItem(createRng(seed), { skin, tag: 'fill' })],
  ['if-cell', maker(ifCellItem)],
  ['if-column', maker(ifColumnItem)],
  ['break', maker(breakRowItem)],
  ['same', maker(sameItem)],
  ['pick-same', maker(pickSameItem)],
  ['diff-row', maker(diffRowItem)],
  ['cards', (_skin, seed) => cardsSameItem(createRng(seed))],
  ['kind', maker(kindItem)],
  ['pick-always', maker(pickAlwaysItem)],
  ['why', (skin, seed) => whyItem(createRng(seed), { skin })],
];

describe('every kind of item', () => {
  it('2-5 distinct choices, feedback for every wrong choice and none for the right one, whyWrong in step, a hint case and teaching', () => {
    for (const [name, make] of MAKERS) for (const skin of SKINS) for (let seed = 1; seed <= 40; seed++) {
      const it = choose(make(skin, seed));
      const where = `${name} ${skin} ${seed}`;
      expect(it.choices.length, where).toBeGreaterThanOrEqual(2);
      expect(it.choices.length, where).toBeLessThanOrEqual(5);
      expect(new Set(it.choices.map((c) => c.label)).size, where).toBe(it.choices.length);
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback?.[c.id], where).toBeUndefined();
        else {
          expect(it.feedback![c.id]?.headline.trim(), `${where} ${c.id}`).toBeTruthy();
          expect(it.whyWrong![c.id]).toContain(it.feedback![c.id].headline);
        }
      }
      expect(it.hintCase, where).toBeDefined();
      expect(it.teach?.cases?.length, where).toBeGreaterThanOrEqual(2);
      expect(make(skin, seed).item, `${where}: the same seed gives the same item`).toEqual(it);
    }
  });

  it('a hint for one box never shows that box: it works another row', () => {
    for (const [name, make] of MAKERS.filter(([n]) => n === 'cell' || n === 'if-cell')) for (const skin of SKINS) for (let seed = 1; seed <= 60; seed++) {
      const it = choose(make(skin, seed));
      const k = Number(/Look at row (\d)/.exec(it.prompt)![1]);
      expect(it.hintCase!.label.startsWith(`Row ${k}:`), `${name} ${seed}`).toBe(false);
    }
  });

  it('the answer is not always in the same place', () => {
    for (const [name, make] of MAKERS.filter(([n]) => ['column', 'if-column', 'pick-same', 'pick-always', 'break', 'missing', 'why'].includes(n))) {
      const at = new Set<number>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const it = choose(make(SKINS[seed % 3], seed));
        at.add(it.choices.findIndex((c) => c.id === it.answer));
      }
      expect(at.size, name).toBeGreaterThanOrEqual(3);
    }
  });

  it('every table picture is whole: one value or blank per box, rows in range, read in words box by box', () => {
    for (const [name, make] of MAKERS) for (const skin of SKINS) for (let seed = 1; seed <= 20; seed++) {
      const it = make(skin, seed).item;
      if (it.scene?.kind !== 'table') continue;
      const t = it.scene;
      expect(t.inputs, name).toBeGreaterThanOrEqual(1);
      expect(t.inputs).toBeLessThanOrEqual(t.heads.length);
      for (const r of t.cells) expect(r.length, name).toBe(t.heads.length);
      for (const k of t.marked ?? []) expect(k).toBeLessThan(t.cells.length);
      const lines = tableSpeech(t);
      expect(lines.filter((l) => /^Row \d/.test(l)).length).toBe(t.cells.length);
    }
  });
});

// ---------- the why item and the warm-up ----------

describe('the closing why item', () => {
  it('a reason item: four reasons, the right one true of the table, each wrong one with the case that breaks it', () => {
    for (const kind of ['same', 'differ', 'if-row', 'always'] as WhyKind[]) for (let seed = 1; seed <= 80; seed++) {
      const m = whyItem(createRng(seed), { kind });
      const it = choose(m);
      expect(it.tags).toEqual(['why']);
      expect(m.why).toBe(kind);
      for (const c of it.choices) expect(c.label.length, c.label).toBeGreaterThan(12);
      const { names, t } = tableOf(it.scene);
      if (kind === 'same' || kind === 'differ') {
        const [s, u] = quoted(it.prompt);
        const d = cases(names).flatMap((e, k) => (val(parse(s), e) !== val(parse(u), e) ? [k] : []));
        expect(d.length === 0, it.prompt).toBe(kind === 'same');
        if (kind === 'differ') expect(it.choices.find((c) => c.id === it.answer)!.label).toContain(`In row ${d[0] + 1}, one of them is true and the other is false.`);
      } else if (kind === 'if-row') {
        const k = t.marked![0];
        const row = cases(['P', 'Q'])[k];
        expect(row.P).toBe(false);
        expect(val(parse('IF P, THEN Q'), row)).toBe(true);
        expect(it.answer).toBe('asks');
        // The rows the wrong reasons name, worked out again: the row that breaks it, and a True row where P and Q differ.
        const all = cases(['P', 'Q']);
        const broken = all.findIndex((e) => !val(parse('IF P, THEN Q'), e));
        expect(it.feedback!.then.headline).toContain(`row ${broken + 1} has a false THEN part and is False`);
        expect(it.feedback!.always.headline).toContain(`row ${broken + 1} is False`);
        const km = Number(/row (\d+) has them different/.exec(it.feedback!.match.headline)![1]) - 1;
        expect(all[km].P !== all[km].Q && val(parse('IF P, THEN Q'), all[km])).toBe(true);
      } else {
        const [s] = quoted(it.prompt);
        expect(colOf(s, names).every(Boolean)).toBe(true);
      }
    }
  });
});

describe('the warm-up (bridge): a Stop 2 card and NOT (A AND B)', () => {
  const feat = (c: (typeof ALL_CARDS)[number], w: string) => (w.startsWith('a ') ? c.shape === w.slice(2) : c.color === w || c.size === w);
  it('the answer is the card checked against the rule words: it fits unless it is both', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const it = stop9.bridge!(createRng(seed)) as ChooseItem;
      expect(it.stop).toBe(9);
      expect(it.lesson).toBe('s9.l2');
      const [rule] = quoted(it.prompt);
      const m = /^NOT \((.+) AND (.+)\)$/.exec(rule)!;
      expect(m, rule).toBeTruthy();
      const name = /Does the (.+) fit the rule/.exec(it.prompt)![1];
      const card = ALL_CARDS.find((c) => `${c.size} ${c.color} ${c.shape}` === name)!;
      expect(it.answer).toBe(feat(card, m[1]) && feat(card, m[2]) ? 'no' : 'yes');
      expect(it.scene?.kind).toBe('things');
      seen.add(looks(it));
      expect(bridgeItem(createRng(seed)).item).toEqual(bridgeItem(createRng(seed)).item);
    }
    expect(seen.size).toBeGreaterThan(80);
  });

  it('comes before Lesson 1, so every word of it names cards, never rows or truth tables', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const it = stop9.bridge!(createRng(seed)) as ChooseItem;
      const text = [it.prompt, it.explain, ...teachStrings(it), ...it.choices.map((c) => c.label)].join('\n');
      expect(text, `seed ${seed}`).not.toMatch(/\b(rows?|truth table|column)\b/i);
      for (const c of [...(it.teach?.cases ?? []), it.hintCase!]) expect(c.label, `seed ${seed}`).toMatch(/^The (big|small) \w+ \w+: /);
    }
  });
});

// ---------- the lessons: packs, boards, words ----------

describe('the lessons', () => {
  const PACK_SKILLS = ['s9.rows', 's9.fill', 's9.if-table', 's9.same', 's9.always'];
  const TRAPS = ['repeat-row', 'or-both', 'if-false', 'not-each', 'most-rows'];

  it('every pack: 4 items of the lesson’s skill, the trap once at least, two or more skins, the same for the same seed', () => {
    stop9.lessons.forEach((l, li) => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const items = l.practice(createRng(seed)) as ChooseItem[];
        expect(items.length).toBe(4);
        for (const it of items) expect(it.skill, l.id).toBe(PACK_SKILLS[li]);
        expect(items.some((it) => it.tags?.includes(TRAPS[li])), `${l.id} ${seed}`).toBe(true);
        expect(l.pass).toEqual({ firstTry: 3, include: [{ tag: TRAPS[li], label: expect.any(String) }] });
        // Skins: the key lines (a story), the card words, or letters alone.
        const skins = new Set(items.map((it) => {
          const sc = it.scene;
          const key = sc?.kind === 'table' ? sc.key : sc?.kind === 'text' ? sc.lines.filter((x) => /^[A-DPQ]: /.test(x)) : undefined;
          if (key?.length) return TOPICS.find((t) => key[0].slice(3).toLowerCase() === `${t.parts[0].yes.toLowerCase()}.`)!.skin;
          if (sc?.kind === 'table') return sc.heads.some((h) => /red|blue|yellow|big|small|circle|square|triangle/.test(h)) ? 'cards' : 'letters';
          if (sc?.kind === 'text') return 'letters';
          return 'other';
        }));
        expect(skins.size, `${l.id} ${seed}: skins vary`).toBeGreaterThanOrEqual(2);
        expect(new Set(items.map(looks)).size).toBe(items.length);
        expect(l.practice(createRng(seed))).toEqual(items);
      }
    });
  });

  it('each skill has many different-looking items, so a new example after a miss looks new', () => {
    const seen: Record<string, Set<string>> = {};
    for (let seed = 1; seed <= SEEDS; seed++) for (const l of stop9.lessons) for (const it of l.practice(createRng(seed))) (seen[it.skill] ??= new Set()).add(looks(it));
    for (const [skill, s] of Object.entries(seen)) expect(s.size, skill).toBeGreaterThanOrEqual(30);
  });

  it('the boards: every mark on a sentence is that sentence worked out in its row; at most 12 taps; the right marks pass', () => {
    for (const l of stop9.lessons) for (const d of l.drill!) {
      let checked = 0;
      for (const r of d.rows) {
        const rm = /^Row \d+: (.+)$/.exec(r.label);
        if (!rm) continue;
        const env: Record<string, boolean> = Object.fromEntries(rm[1].split(', ').map((p) => {
          const [nm, v] = p.split(' ');
          return [nm, v === 'true'];
        }));
        for (const mk of r.marks) {
          let ast: Ast | null = null;
          try { ast = parse(mk.label); } catch { ast = null; }
          if (!ast || !mk.options.some((o) => o.id === 'true')) continue;
          expect(mk.answer, `${d.id} ${r.label} ${mk.label}`).toBe(String(val(ast, env)));
          checked++;
        }
      }
      expect(marksToTap(d).length, d.id).toBeLessThanOrEqual(12);
      expect(checkDrill(d, Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]))).done, d.id).toBe(true);
      if (!['s9.l1-do1', 's9.l1-do2', 's9.l1-do3'].includes(d.id)) expect(checked, `${d.id} checks its sentence marks`).toBeGreaterThan(0);
    }
  });

  it('the table board (a thinking board) on every question with blank boxes: each blank column, small parts first, worked out again', () => {
    let boards = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const items = [...stop9.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop9.check!(createRng(seed))];
      for (const it of items) {
        const sc = it.scene;
        const blank = sc?.kind === 'table' && sc.cells.some((r) => r.slice(sc.inputs).some((v) => v === null));
        if (!blank) {
          expect(it.scratch, it.prompt).toBeUndefined();
          continue;
        }
        boards++;
        expect(it.scratchLabel).toBe('the table board');
        const b = it.scratch!;
        const heads = sc.heads.slice(sc.inputs);
        for (const h of heads) expect(b.rows[0].marks.some((m) => m.label === h), `${it.prompt}: ${h}`).toBe(true);
        for (const r of b.rows) {
          const env = Object.fromEntries(/^Row \d+: (.+)$/.exec(r.label)![1].split(', ').map((p) => {
            const [nm, v] = p.split(/ (?=true$|false$)/);
            return [nm, v === 'true'];
          }));
          // Each small part comes before the sentence that uses it.
          const labels = r.marks.map((m) => m.label);
          for (const m of r.marks) {
            expect(m.answer, `${r.label} ${m.label}`).toBe(String(val(parse(m.label), env)));
            const inner = /^NOT \((.+)\)$/.exec(m.label)?.[1];
            if (inner && labels.includes(inner)) expect(labels.indexOf(inner)).toBeLessThan(labels.indexOf(m.label));
          }
        }
        expect(checkDrill(b, Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]))).done).toBe(true);
      }
    }
    expect(boards).toBeGreaterThan(300);
  });

  it('Lesson 1 boards: the rows follow the counting order, and the repeat board finds the repeat and the missing case', () => {
    const [b1, b2, b3] = stop9.lessons[0].drill!;
    const four = cases(['A', 'B']), eight = cases(['A', 'B', 'C']);
    for (const r of b1.rows) {
      const k = Number(r.label.replace('Row ', '')) - 1;
      for (const m of r.marks) expect(m.answer).toBe(String(four[k][m.label]));
    }
    for (const r of b2.rows) {
      const k = Number(r.label.replace('Row ', '')) - 1;
      for (const m of r.marks) expect(m.answer).toBe(String(eight[k][m.label]));
    }
    const rows = b3.rows.filter((r) => r.label.startsWith('Row ')).map((r) => r.label.replace(/^Row \d+: /, ''));
    rows.forEach((x, k) => expect(b3.rows[k].marks[0].answer).toBe(rows.indexOf(x) < k ? 'repeat' : 'new'));
    const missing = four.map((e) => `A ${e.A}, B ${e.B}`).find((x) => !rows.includes(x))!;
    const mm = b3.rows.find((r) => r.id === 'missing')!.marks[0];
    expect(mm.options.find((o) => o.id === mm.answer)!.label.toLowerCase()).toBe(missing.toLowerCase());
    const rep = rows.findIndex((x, k) => rows.indexOf(x) < k);
    const named = `Row ${rep + 1} repeats row ${rows.indexOf(rows[rep]) + 1}`;
    expect(mm.why.none).toContain(named);
    expect(b3.done).toContain(named);
    expect(b3.distinction).toBe('count-vs-cases');
  });

  it('the mix-ups each board names: OR as one but not both, the IF part false as broken, some rows as every row, most rows as always, the count as every case', () => {
    const diag = (d: DrillStep, wrong: Record<string, string>) => checkDrill(d, { ...Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer])), ...wrong }).diagnosis;
    const board = (id: string) => stop9.lessons.flatMap((l) => l.drill!).find((d) => d.id === id)!;
    expect(diag(board('s9.l1-do3'), { 't3-new': 'new' })).toBe('count-as-cases');
    expect(diag(board('s9.l1-do3'), { missing: 'none' })).toBe('count-as-cases');
    expect(diag(board('s9.l1-do1'), { 'r3-A': 'true', 'r3-B': 'false' })).toBe('copied-row');
    expect(diag(board('s9.l2-do1'), { 'r1-c1': 'false' })).toBe('or-one');
    expect(diag(board('s9.l2-do1'), { 'r2-c0': 'true' })).toBe('and-as-or');
    expect(diag(board('s9.l3-do1'), { 'r4-val': 'false' })).toBe('if-false-as-broken');
    expect(diag(board('s9.l3-do1'), { 'r2-val': 'true' })).toBeUndefined();
    expect(diag(board('s9.l4-do1'), { verdict: 'yes' })).toBe('some-as-every');
    expect(diag(board('s9.l5-do2'), { 'kind-0': 'always' })).toBe('most-as-always');
    for (const d of stop9.lessons.flatMap((l) => l.drill!)) {
      for (const mc of d.misconceptions ?? []) expect(mc.text.startsWith('You may be treating'), d.id).toBe(true);
      for (const q of d.confused ?? []) {
        expect(q.options.filter((o) => o.right).length).toBe(1);
        expect(q.options.some((o) => o.label === 'Not sure')).toBe(true);
      }
    }
  });

  it('distinctions: count vs cases (Lesson 1), the IF part false vs broken (Lesson 3), some rows vs every row (Lesson 4, reminded in Lesson 5)', () => {
    const [l1, , l3, l4, l5] = stop9.lessons;
    expect(l1.distinctions!.map((d) => d.id)).toEqual(['count-vs-cases']);
    expect(l3.distinctions!.map((d) => d.id)).toEqual(['if-false-vs-broken']);
    expect(l4.distinctions!.map((d) => d.id)).toEqual(['some-vs-every']);
    expect(l5.distinctions).toEqual([{ ...l4.distinctions![0], taughtIn: 's9.l4' }]);
    // The contrast in Lesson 4: one row where they agree, one where they differ, worked out again.
    const card = l4.ideas.find((c) => c.distinction === 'some-vs-every')!;
    const sc = card.scene as Extract<Scene, { kind: 'contrast' }>;
    sc.pairs.forEach((p) => {
      const [, a, b] = /A (true|false), B (true|false)/.exec(p.world)!;
      const env = { A: a === 'true', B: b === 'true' };
      expect(p.truth).toBe(val(parse('NOT (A AND B)'), env) === val(parse('NOT A AND NOT B'), env));
    });
    expect(sc.pairs.map((p) => p.truth)).toEqual([true, false]);
    // Lesson 3: Q false in both rows; only P true breaks it.
    const c3 = l3.ideas.find((c) => c.distinction === 'if-false-vs-broken')!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c3.pairs.map((p) => p.truth)).toEqual([true, false]);
  });

  it('the worked tables on the cards are worked out again', () => {
    for (const l of stop9.lessons) for (const c of l.ideas) {
      if (c.scene?.kind !== 'table') continue;
      const t = c.scene;
      const names = t.heads.slice(0, t.inputs);
      t.cells.forEach((row, k) => {
        const env = Object.fromEntries(names.map((nm, j) => [nm, row[j] === true]));
        t.heads.slice(t.inputs).forEach((h, j) => {
          const v = row[t.inputs + j];
          if (v !== null) expect(v, `${l.id} ${c.title} row ${k + 1} ${h}`).toBe(val(parse(h), env));
        });
      });
    }
  });

  it('kid words first; each grown-up word is named once, on a card of the lesson whose terms list it', () => {
    const terms = stop9.lessons.map((l) => (l.terms ?? []).map((t) => [t.term, t.also ?? '']));
    expect(terms).toEqual([[['truth table', ''], ['row', 'a case']], [], [], [['equivalent', 'same meaning']], [['tautology', 'always true'], ['contradiction', 'never true']]]);
    for (const [w, lesson] of [['equivalent', 3], ['tautology', 4], ['contradiction', 4]] as const) {
      const cards = stop9.lessons.flatMap((l, k) => l.ideas.filter((c) => new RegExp(`\\b${w}\\b`).test(c.body.join(' '))).map((c) => [k, c.body.join(' ')] as const));
      expect(cards.length, w).toBe(1);
      expect(cards[0][0], w).toBe(lesson);
      expect(cards[0][1]).toMatch(new RegExp(`Grown-ups call [^.]*\\b${w}\\b`));
    }
    for (const t of stop9.lessons.flatMap((l) => l.terms ?? [])) expect(t.means).toMatch(/^[A-Z].*[.!?]$/);
  });
});

// ---------- the stop: check, Arcade, new examples, world ----------

describe('the stop', () => {
  it('the check: 10 items, lessons 1-4 twice and lesson 5 once, four conflict items, the why item last', () => {
    const order = ['s9.l1', 's9.l1', 's9.l2', 's9.l2', 's9.l3', 's9.l3', 's9.l4', 's9.l4', 's9.l5'];
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop9.check!(createRng(seed));
      expect(items.length).toBe(10);
      expect(items.slice(0, 9).map((i) => i.lesson)).toEqual(order);
      const last = items[9] as ChooseItem;
      expect(last.tags).toEqual(['why']);
      expect(['s9.l3', 's9.l4', 's9.l5']).toContain(last.lesson);
      expect(items.filter((i) => i.conflict).length).toBeGreaterThanOrEqual(4);
      for (const t of ['repeat-row', 'or-both', 'if-false']) expect(items.some((i) => i.tags?.includes(t)), `${seed} ${t}`).toBe(true);
      expect(items.slice(0, 9).some((i) => i.tags?.includes('why'))).toBe(false);
    }
  });

  it('the Arcade gives a valid item from every lesson', () => {
    const lessons = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const it = stop9.practice!(createRng(seed)) as ChooseItem;
      lessons.add(it.lesson);
      expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
    }
    expect([...lessons].sort()).toEqual(stop9.lessons.map((l) => l.id));
  });

  it('new examples after a miss: a box, a same-meaning, a kind or a whole-table question gets one of each answer', () => {
    for (let seed = 1; seed <= 60; seed++) for (const l of stop9.lessons) for (const missed of l.practice(createRng(seed))) {
      const out = stop9.fresh!(missed, createRng(seed + 1000));
      for (const it of out) {
        expect(it.skill).toBe(missed.skill);
        expect(it.stop).toBe(9);
      }
      if (out.length === 2) expect((out[0] as ChooseItem).answer === (out[1] as ChooseItem).answer && (out[0] as ChooseItem).choices.length === 2).toBe(false);
      const isBox = missed.kind === 'choose' && missed.choices.every((c) => c.id === 'true' || c.id === 'false');
      if (isBox || /mean the same\?/.test(missed.prompt) || /always true, sometimes true/.test(missed.prompt) || missed.prompt.includes('each one once')) expect(out.length, missed.prompt).toBe(2);
    }
    for (const kind of ['same', 'if-row', 'always'] as WhyKind[]) {
      const missed = { id: 'x', stop: 9, lesson: 's9.l4', skill: '', ...whyItem(createRng(3), { kind }).item } as Item;
      missed.skill = kind === 'same' ? 's9.same' : kind === 'if-row' ? 's9.if-table' : 's9.always';
      expect(stop9.fresh!(missed, createRng(5)).length).toBe(2);
    }
  });

  it('is in the Journey after All, Some, None, with its real-life pack, skill names, and no coming-soon line', () => {
    const k = STOPS.findIndex((s) => s.id === 's9');
    expect(STOPS[k - 1].id).toBe('s8');
    expect(stop9.ready).toBe(true);
    expect(stop9.requires).toBeUndefined();
    expect(stop9.sideTrack).toBeUndefined();
    expect(WORLD.s9).toBe(S9_WORLD);
    expect(SOON_WORLD.s9).toBeUndefined();
    expect(Object.keys(S9_WORLD.lessons)).toEqual(stop9.lessons.map((l) => l.id));
    expect(Object.keys(stop9.skillNames!).sort()).toEqual(['s9.always', 's9.fill', 's9.if-table', 's9.rows', 's9.same']);
  });

  it('every string reads at grade 7 or lower, sentences of 25 words or fewer, curly quotes only, no symbols, US spelling, never “Wrong”', () => {
    const text: string[] = [];
    const items: Item[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      for (const l of stop9.lessons) items.push(...l.practice(createRng(seed)));
      items.push(...stop9.check!(createRng(seed)), stop9.practice!(createRng(seed)), stop9.bridge!(createRng(seed)));
    }
    for (const it of items) {
      text.push(it.prompt, it.explain, ...teachStrings(it));
      if (it.kind === 'choose') text.push(...it.choices.map((c) => c.label));
      if (it.scene?.kind === 'table') text.push(...tableSpeech(it.scene));
      if (it.scene?.kind === 'text') text.push(...it.scene.lines);
      if (it.scratch) text.push(it.scratch.title, ...it.scratch.body, ...it.scratch.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])]));
    }
    for (const l of stop9.lessons) {
      for (const c of l.ideas) {
        text.push(c.title, ...c.body);
        if (c.scene?.kind === 'table') text.push(...tableSpeech(c.scene));
        if (c.scene?.kind === 'contrast') text.push(...c.scene.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), c.scene.ask?.q ?? '', c.scene.ask?.a ?? '');
      }
      for (const d of l.drill ?? []) {
        text.push(d.title, ...d.body, d.done, d.twin ?? '', ...d.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]));
        text.push(...(d.misconceptions ?? []).map((m) => m.text), ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]), ...Object.values(d.words ?? {}));
      }
      for (const t of l.terms ?? []) text.push(t.means);
    }
    text.push(...Object.values(stop9.skillNames!));
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/['"]/);
    // US style: a period or comma goes inside the closing quote.
    expect(all).not.toMatch(/”[.,]/);
    expect(all).not.toMatch(/[=+<>&*#@^~|\\→←✓✗×≠]/);
    expect(all).not.toMatch(/\bWrong\b/);
    expect(all).not.toMatch(/\b(colour|favourite|behaviour|centre|realise|organise|grey)\b/i);
  });
});
