/**
 * Ring 3 of the Pattern Observatory, Deep Sky (stop 16): Mirror Pool, Matrix Gate, Analogy Bridge.
 *
 * Every computed answer is checked a second way, from what the learner sees (the drawn picture, grid or bridge),
 * with code written here and not taken from the generators: a fold is a mirrored grid, a turn a grid spun a half turn;
 * a matrix tile is found by trying every tile in the gap and checking the drawn rows and columns; an analogy answer is
 * found by applying the first pair's change or link to the new word. The ring's acceptance checks are enforced too:
 * every option tile is classified (row, column, both) and its feedback names exactly that, and nothing claims each
 * wrong tile breaks exactly one rule; every analogy has a look-alike option; every mirror trap offers a turn; every
 * pack runs explain, do (faded, then the same task unframed), transfer, with the place's trap; review gives 4 and the
 * independent check 6 with an error-tagged item and an explain item; the diagnostic serves Track 3 at L1 to L3.
 */
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { stop16 } from '../../content/stop16';
import { S16_WORLD } from '../../content/world/s16';
import { ObservatoryScene } from '../../game/components/scenes/ObservatoryScene';
import { observatorySpeech } from '../../game/components/scenes/speech';
import { checkDrill, marksToTap } from '../drill';
import { grade } from '../grade';
import { DIMENSIONS, LINKS } from '../puzzles/observatory/analogy';
import { LETTERS, LETTER_LOOK, type Letter } from '../puzzles/observatory/mirror';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import type { BridgeScene } from '../scenes/bridge';
import type { MatrixScene } from '../scenes/matrix';
import type { MirrorScene } from '../scenes/mirror';
import { feedbackText, teachStrings } from '../teach';
import type { ChooseItem, DrillStep, IdeaCard, Item, MultiItem, Scene } from '../types';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const [MIRROR, MATRIX, BRIDGE] = stop16.lessons;
const L = { mirror: 's16.l1', matrix: 's16.l2', bridge: 's16.l3' } as const;

/** Every item the ring can show, by where it comes from. */
function everyItem(seed: number): { where: string; item: Item }[] {
  const rng = () => createRng(seed);
  const out: { where: string; item: Item }[] = [];
  const add = (where: string, items: Item[]) => items.forEach((item) => out.push({ where: `${where} seed ${seed} ${item.id}`, item }));
  for (const l of stop16.lessons) {
    add(`${l.id} practice`, l.practice(rng()));
    for (let lv = l.levels![0]; lv <= l.levels![1]; lv++) add(`${l.id} L${lv}`, l.practiceAt!(rng(), lv as 1 | 2 | 3));
    for (const st of [1, 2, 3] as const) add(`${l.id} review ${st}`, l.review!(rng(), st));
    add(`${l.id} independent`, l.independent!(rng()));
    if (l.primer) add(`${l.id} primer`, l.primer(rng()));
  }
  add('check', stop16.check!(rng()));
  add('arcade', [stop16.practice!(rng())]);
  for (const lv of [1, 2, 3] as const) add(`diagnostic L${lv}`, [stop16.observatory!.diagnostic!(rng(), 3, lv)!]);
  for (const it of stop16.lessons[seed % 3].practice(rng())) add('fresh', stop16.fresh!(it, rng()));
  return out;
}
const ALL = SEEDS.flatMap(everyItem);
const choose = (it: Item): it is ChooseItem => it.kind === 'choose';
const labelOf = (it: ChooseItem, id: string) => it.choices.find((c) => c.id === id)!.label;
const answerLabel = (it: ChooseItem) => labelOf(it, it.answer);

// =====================================================================================================================
// The second methods (written here, from the drawn scene)
// =====================================================================================================================

const lr = (rows: readonly string[]) => rows.map((r) => [...r].reverse().join(''));
const tb = (rows: readonly string[]) => [...rows].reverse();
/** The two halves of a drawn picture, each as it is drawn. */
function halvesOf(s: MirrorScene): [string[], string[]] {
  const H = s.cells.length;
  const W = s.cells[0].length;
  return s.fold === 'v' ? [s.cells.map((r) => r.slice(0, W / 2)), s.cells.map((r) => r.slice(W / 2))] : [s.cells.slice(0, H / 2), s.cells.slice(H / 2)];
}
/** What each move puts on the second side, drawn: a fold mirrors the first half across the line; a turn spins it. */
function secondBy(s: MirrorScene, move: 'reflect' | 'turn' | 'slide'): string[] {
  const [first] = halvesOf(s);
  if (move === 'slide') return first;
  if (move === 'turn') return tb(lr(first));
  return s.fold === 'v' ? lr(first) : tb(first);
}
const dotsOnly = (rows: readonly string[]) => rows.map((r) => r.replace(/[^#]/g, '.'));
const same = (a: readonly string[], b: readonly string[]) => a.join('/') === b.join('/');
/** The move that made a full picture, if exactly one did. */
function moveOf(s: MirrorScene): string[] {
  const [, second] = halvesOf(s);
  return (['reflect', 'turn', 'slide'] as const).filter((m) => same(second, secondBy(s, m)));
}

type Tile = Record<string, string>;
/** A tile from its words: "2 yellow squares" or "Room 3 at 11 o’clock". */
function parseTile(words: string): Tile {
  const shape = /^(\d) (red|blue|yellow) (circle|square|triangle)s?$/.exec(words);
  if (shape) return { count: shape[1], color: shape[2], shape: shape[3] };
  const room = /^(Room \d) at (\d+ o’clock)$/.exec(words);
  if (room) return { room: room[1], time: room[2] };
  throw new Error(`not a tile: ${words}`);
}
/** The drawn grid as tiles (null is the gap). */
function drawnTiles(s: MatrixScene): (Tile | null)[][] {
  if (s.tiles) return s.tiles.map((row) => row.map((t) => (t === null ? null : parseTile(t))));
  return s.cells.map((row) => row.map((c) => (c ? { count: String(c.count), color: c.color, shape: c.shape } : null)));
}
const FEATURE_VALUES: Record<string, string[]> = {
  count: ['1', '2', '3'], color: ['red', 'blue', 'yellow'], shape: ['circle', 'square', 'triangle'],
  room: ['Room 1', 'Room 2', 'Room 3'], time: ['9 o’clock', '10 o’clock', '11 o’clock'],
};
/** Which feature each stated rule is about, read from its words. */
function ruleFeature(rule: string | undefined): string | undefined {
  if (!rule) return undefined;
  if (/number of shapes/.test(rule)) return 'count';
  for (const f of ['color', 'shape', 'room', 'time']) if (new RegExp(`own ${f}`).test(rule)) return f;
  throw new Error(`unknown rule: ${rule}`);
}
/** Does a grid with this tile in the gap keep every stated rule, row by row and column by column? */
function gridFits(s: MatrixScene, t: Tile): { row: boolean; col: boolean; all: boolean } {
  const g = drawnTiles(s).map((row) => row.map((x) => x ?? t));
  const n = g.length;
  const rowF = ruleFeature(s.rowRule);
  const colF = ruleFeature(s.colRule);
  const lineOk = (f: string | undefined, along: 'row' | 'col') => {
    if (!f) return true;
    const vals = Array.from({ length: n }, (_, a) => new Set(Array.from({ length: n }, (_, b) => (along === 'row' ? g[a][b] : g[b][a])[f])));
    return vals.every((v) => v.size === 1) && new Set(vals.map((v) => [...v][0])).size === n;
  };
  const shared = Object.keys(t).filter((f) => f !== rowF && f !== colF);
  return { row: lineOk(rowF, 'row'), col: lineOk(colF, 'col'), all: shared.every((f) => new Set(g.flat().map((x) => x[f])).size === 1) };
}
function allTilesFor(s: MatrixScene): Tile[] {
  const fs = s.tiles ? ['room', 'time'] : ['count', 'color', 'shape'];
  let out: Tile[] = [{}];
  for (const f of fs) out = out.flatMap((t) => FEATURE_VALUES[f].map((v) => ({ ...t, [f]: v })));
  return out;
}
/** The gap's row and column checked on their own: does the tile match the other tiles of its row (its column)? */
function verdictFromCells(s: MatrixScene, t: Tile): 'none' | 'row' | 'col' | 'both' {
  const g = drawnTiles(s);
  const r = g.findIndex((row) => row.includes(null));
  const c = g[r].indexOf(null);
  const rowF = ruleFeature(s.rowRule);
  const colF = ruleFeature(s.colRule);
  const rowBreaks = !!rowF && g[r].some((x) => x && x[rowF] !== t[rowF]);
  const colBreaks = !!colF && g.some((row) => row[c] && row[c]![colF] !== t[colF]);
  return rowBreaks && colBreaks ? 'both' : rowBreaks ? 'row' : colBreaks ? 'col' : 'none';
}

// =====================================================================================================================
// Shapes
// =====================================================================================================================

describe('Deep Sky: every item has the contract’s shape (seeds 1 to 40)', () => {
  it('declares itself, teaches every wrong answer, and is plain data', () => {
    expect(ALL.length).toBeGreaterThan(1500);
    for (const { where, item: it } of ALL) {
      expect(it.stop, where).toBe(16);
      expect(Object.values(L), where).toContain(it.lesson);
      expect(it.skill, where).toMatch(/^s16\.[a-z-]+$/);
      expect(stop16.skillNames?.[it.skill], `${where} skill name`).toBeTruthy();
      expect(it.prompt.trim() && it.explain.trim(), where).toBeTruthy();
      expect(it.teach?.rule, where).toBeTruthy();
      expect(it.hint, where).toBeTruthy();
      expect(it.hints?.[0], where).toBe(it.hint);
      expect(it.hints!.length, where).toBeGreaterThanOrEqual(2);
      expect(it.hintCase?.label, where).toBeTruthy();
      expect(it.phase, where).toBeTruthy();
      expect([1, 2, 3], where).toContain(it.level);
      expect(it.twin, where).toBeTruthy();
      const m = it.meta!;
      expect(m, where).toBeTruthy();
      expect(m.skill && m.rule && m.task && m.representation, where).toBeTruthy();
      expect(m.phase, where).toBe(it.phase);
      expect(m.twin, where).toBe(it.twin);
      expect(m.difficulty, where).toBeGreaterThanOrEqual(1);
      expect(m.difficulty, where).toBeLessThanOrEqual(5);
      expect(m.answerType, where).toBe(it.kind === 'multi' ? 'set' : 'categorical');
      for (const t of Object.values(it.errorTags ?? {})) expect(m.tags, where).toContain(t);
      if (it.phase === 'explain') {
        expect(it.rubric, where).toBe(2);
        expect(m.rubric, where).toMatch(/^2 = /);
      }
      expect(JSON.parse(JSON.stringify(it)), `${where}: plain data`).toEqual(it);
      if (choose(it)) {
        const ids = it.choices.map((c) => c.id);
        expect(it.choices.length, where).toBeGreaterThanOrEqual(2);
        expect(it.choices.length, where).toBeLessThanOrEqual(5);
        expect(new Set(ids).size, where).toBe(ids.length);
        expect(new Set(it.choices.map((c) => c.label.toLowerCase())).size, where).toBe(ids.length);
        expect(ids, where).toContain(it.answer);
        for (const c of it.choices) {
          if (c.id === it.answer) continue;
          const fb = it.feedback?.[c.id];
          expect(fb?.headline && fb.detail.length, `${where} ${c.id}`).toBeTruthy();
          expect(it.whyWrong?.[c.id], where).toBe(feedbackText(fb!));
          expect(grade(it, { kind: 'choose', id: c.id }).correct, where).toBe(false);
        }
        for (const k of Object.keys(it.errorTags ?? {})) expect(ids.filter((x) => x !== it.answer), where).toContain(k);
        expect(grade(it, { kind: 'choose', id: it.answer }).correct, where).toBe(true);
      } else {
        expect(it.kind, where).toBe('multi');
        const mi = it as MultiItem;
        expect(mi.choices.length, where).toBeLessThanOrEqual(6);
        expect(mi.answer.length, where).toBeGreaterThan(0);
        for (const c of mi.choices) {
          if (mi.answer.includes(c.id)) expect(mi.missTips?.[c.id], where).toBeTruthy();
          else expect(mi.pickTips?.[c.id], where).toBeTruthy();
        }
      }
    }
  });

  it('every pack runs explain, then do (a faded frame, then the same task unframed), then transfer, with the place’s trap', () => {
    for (const seed of SEEDS) {
      for (const l of stop16.lessons) {
        const packs = [l.practice(createRng(seed)), ...Array.from({ length: l.levels![1] - l.levels![0] + 1 }, (_, i) => l.practiceAt!(createRng(seed), (l.levels![0] + i) as 1 | 2 | 3))];
        for (const pack of packs) {
          const where = `${l.id} seed ${seed}`;
          expect(pack.length, where).toBeGreaterThanOrEqual(3);
          expect(pack.length, where).toBeLessThanOrEqual(5);
          const order = { explain: 0, do: 1, transfer: 2, review: 3 } as const;
          const phases = pack.map((x) => order[x.phase!]);
          expect([...phases].sort(), where).toEqual(phases);
          expect(pack[0].phase, where).toBe('explain');
          expect(pack[pack.length - 1].phase, where).toBe('transfer');
          const dos = pack.filter((x) => x.phase === 'do');
          expect(dos.length, where).toBeGreaterThanOrEqual(2);
          expect(dos[0].frame, where).toMatch(/___/);
          expect(dos[1].frame, where).toBeUndefined();
          expect(dos[1].skill, `${where}: the same task, unframed`).toBe(dos[0].skill);
          for (const g of l.pass!.include!) expect(pack.some((x) => x.tags?.includes(g.tag)), `${where} trap ${g.tag}`).toBe(true);
          expect(new Set(pack.map((x) => x.id)).size, where).toBe(pack.length);
        }
      }
    }
  });

  it('every place is a routine place with its track, levels, plain label, review (4) and independent check (6, with an error-tagged item and an explain item)', () => {
    for (const l of stop16.lessons) {
      expect(l.routine, l.id).toBe(true);
      expect(l.track, l.id).toBe(3);
      expect(l.plain, l.id).toBeTruthy();
      expect(l.pass?.firstTry, l.id).toBe(3);
      for (const seed of SEEDS) {
        for (const st of [1, 2, 3] as const) {
          const r = l.review!(createRng(seed), st);
          expect(r.length, l.id).toBe(4);
          expect(r.every((x) => x.phase === 'review' && x.meta?.phase === 'review'), l.id).toBe(true);
          expect(new Set(r.map((x) => x.id)).size, l.id).toBe(4);
        }
        const ind = l.independent!(createRng(seed));
        expect(ind.length, l.id).toBe(6);
        expect(ind.some((x) => Object.keys(x.errorTags ?? {}).length > 0), `${l.id} error-tagged`).toBe(true);
        expect(ind.some((x) => x.phase === 'explain'), `${l.id} explain`).toBe(true);
        expect(ind.some((x) => x.phase === 'transfer'), `${l.id} transfer`).toBe(true);
        expect(new Set(ind.map((x) => x.id)).size, l.id).toBe(6);
      }
    }
    expect(MIRROR.requires).toEqual([]);
    expect(MATRIX.requires).toEqual(['s2.l1']);
    expect(BRIDGE.requires).toEqual([]);
    expect([MIRROR.levels, MATRIX.levels, BRIDGE.levels]).toEqual([[1, 2], [2, 3], [1, 3]]);
  });

  it('a hint shows a marked twin, never the item’s own answer', () => {
    for (const { where, item } of ALL) {
      if (!choose(item)) continue;
      const hint = [item.hintCase!.label, item.hintCase!.note ?? ''].join(' ').toLowerCase();
      expect(hint, where).not.toContain(answerLabel(item).toLowerCase());
    }
  });

  it('the same seed gives the same items', () => {
    for (const seed of [1, 7, 23]) expect(JSON.stringify(everyItem(seed))).toBe(JSON.stringify(everyItem(seed)));
  });
});

// =====================================================================================================================
// Mirror Pool
// =====================================================================================================================

describe('Mirror Pool: every answer from the drawn picture', () => {
  const mirrorItems = ALL.filter((x) => x.item.lesson === L.mirror && x.item.skill !== 's16.sort');

  it('reflection, turn or slide: the drawn picture is made by exactly the answer’s move', () => {
    let n = 0;
    for (const { where, item } of mirrorItems) {
      if (!choose(item) || !['s16.fold-or-turn', 's16.fold-why'].includes(item.skill)) continue;
      const s = item.scene as MirrorScene;
      const moves = moveOf(s);
      expect(moves.length, where).toBe(1);
      if (item.skill === 's16.fold-or-turn') expect(item.answer, where).toBe(moves[0]);
      else expect(item.answer, where).toBe(moves[0] === 'reflect' ? 'partner' : 'swap');
      expect(s.turned, `${where}: the picture never says which move it is`).toBeUndefined();
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it('which half: the answer’s candidate is the first half mirrored across the line; the turn and the slide are offered too', () => {
    let n = 0;
    for (const { where, item } of mirrorItems) {
      if (!choose(item) || item.skill !== 's16.fold-match') continue;
      const s = item.scene as MirrorScene;
      const nameOf = (id: string) => /^Half ([A-C]):/.exec(labelOf(item, id))![1];
      const cand = (id: string) => s.candidates!.find((c) => c.name === nameOf(id))!.cells;
      expect(cand(item.answer), where).toEqual(dotsOnly(secondBy(s, 'reflect')));
      expect(cand('turn'), where).toEqual(dotsOnly(secondBy(s, 'turn')));
      expect(cand('slide'), where).toEqual(dotsOnly(secondBy(s, 'slide')));
      expect(item.errorTags?.turn, where).toBe('reflection-vs-rotation');
      // The three candidates are three different halves, so exactly one is the fold.
      expect(new Set(s.candidates!.map((c) => c.cells.join('/'))).size, where).toBe(3);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it('finish the half: exactly the spots whose partner across the line is a dot', () => {
    let n = 0;
    for (const { where, item } of mirrorItems) {
      if (item.kind !== 'multi') continue;
      const s = item.scene as MirrorScene;
      const H = s.cells.length;
      const W = s.cells[0].length;
      const partner = (r: number, c: number) => (s.fold === 'v' ? s.cells[r][W - 1 - c] : s.cells[H - 1 - r][c]);
      const asks: { r: number; c: number }[] = [];
      s.cells.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '?') asks.push({ r, c }); }));
      const want = asks.map((p, i) => (partner(p.r, p.c) === '#' ? `spot-${'abcdef'[i]}` : null)).filter(Boolean);
      expect([...item.answer].sort(), where).toEqual(want.sort());
      // The drawn dots of the second half are all partners, and every first-half dot has its partner drawn or asked.
      s.cells.forEach((row, r) => [...row].forEach((ch, c) => {
        const second = s.fold === 'v' ? c >= W / 2 : r >= H / 2;
        if (second && ch === '#') expect(partner(r, c), where).toBe('#');
        if (!second && ch === '#') expect(['#', '?'], where).toContain(partner(r, c));
      }));
      // A spot a turn would fill is offered, and tagged as the turn mix-up.
      expect(Object.values(item.errorTags ?? {}), where).toContain('reflection-vs-rotation');
      n++;
    }
    expect(n).toBeGreaterThan(40);
  });

  it('every step a dot-grid item names (prompt, choices, feedback, teaching, hints) exists in its picture', () => {
    let n = 0;
    for (const { where, item } of mirrorItems) {
      const s = item.scene as MirrorScene | undefined;
      if (s?.kind !== 'mirror' || !s.ruler) continue;
      const D = s.fold === 'v' ? s.cells[0].length / 2 : s.cells.length / 2;
      for (const t of itemText(item)) for (const m of t.matchAll(/steps? (\d)(?:(?:, | and )(\d))*/g)) for (const k of m.slice(1).filter(Boolean)) expect(Number(k), `${where}: ${t}`).toBeLessThanOrEqual(D);
      n++;
    }
    expect(n).toBeGreaterThan(300);
  });

  it('letters, arrows and house fronts: the answer is the one flip the mirror makes; a turn is always offered and tagged', () => {
    const letterLook = (l: Letter) => LETTER_LOOK[l];
    // The bitmaps and the stick words agree for every letter and every flip.
    for (const l of Object.keys(LETTERS) as Letter[]) {
      for (const [how, flip] of [['beside', lr], ['below', tb], ['turn', (x: string[]) => tb(lr(x))]] as const) {
        const bits = flip(LETTERS[l]);
        const got = (Object.keys(LETTERS) as Letter[]).find((x) => same(LETTERS[x], bits))!;
        const look = letterLook(l);
        const want = { x: how === 'below' ? look.x : -look.x, y: how === 'beside' ? look.y : -look.y };
        expect(letterLook(got), `${l} ${how}`).toEqual(want);
      }
    }
    let n = 0;
    for (const { where, item } of mirrorItems) {
      if (!choose(item) || item.skill !== 's16.fold-transfer') continue;
      const beside = /mirror stands on its right side|glass wall/.test(item.prompt);
      const below = /pool|lake/.test(item.prompt);
      expect(beside !== below, where).toBe(true);
      const s = item.scene as MirrorScene | undefined;
      if (s?.kind === 'mirror') {
        const [first] = halvesOf(s);
        const bits = beside ? lr(first) : tb(first);
        expect(LETTERS[item.answer as Letter], where).toEqual(bits);
      } else if (/^An arrow/.test(item.prompt)) {
        const m = /points (up|down) and to the (left|right)/.exec(item.prompt)!;
        const y = beside ? m[1] : m[1] === 'up' ? 'down' : 'up';
        const x = below ? m[2] : m[2] === 'left' ? 'right' : 'left';
        expect(answerLabel(item), where).toBe(`It points ${y} and to the ${x}`);
      } else {
        const door = /door on the (left|right)/.exec(item.prompt)![1];
        expect(answerLabel(item), where).toBe(beside ? `Right way up, with the door on the ${door === 'left' ? 'right' : 'left'}` : `Upside down, with the door on the ${door}`);
      }
      expect(Object.values(item.errorTags ?? {}), where).toContain('reflection-vs-rotation');
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });
});

// =====================================================================================================================
// Matrix Gate
// =====================================================================================================================

describe('Matrix Gate: the tile from the two rules, and the option validator', () => {
  const gridItems = ALL.filter((x) => x.item.lesson === L.matrix && x.item.skill !== 's16.sort');

  it('exactly one tile fits the drawn grid, and it is the answer (every tile tried in the gap)', () => {
    let n = 0;
    for (const { where, item } of gridItems) {
      if (!choose(item) || item.skill === 's16.grid-why') continue;
      const s = item.scene as MatrixScene;
      const fits = allTilesFor(s).filter((t) => Object.values(gridFits(s, t)).every(Boolean));
      expect(fits.length, where).toBe(1);
      expect(parseTile(answerLabel(item)), where).toEqual(fits[0]);
      expect(item.prompt, `${where}: the rule is stated, so the pattern is constructed`).toMatch(/built with the rules? shown|made with the two rules shown/);
      n++;
    }
    expect(n).toBeGreaterThan(200);
  });

  it('the validator classifies every option tile, and its feedback names exactly the rule (or rules) the tile breaks', () => {
    for (const { where, item } of gridItems) {
      if (!choose(item) || item.skill === 's16.grid-why' || item.skill === 's16.sort') continue;
      const s = item.scene as MatrixScene;
      for (const c of item.choices) {
        const v = verdictFromCells(s, parseTile(c.label));
        const all = gridFits(s, parseTile(c.label)).all;
        expect(all, `${where}: options never change what every tile shares`).toBe(true);
        if (c.id === item.answer) {
          expect(v, where).toBe('none');
          continue;
        }
        expect(v, where).not.toBe('none');
        const head = item.feedback![c.id].headline;
        if (v === 'both') expect(head, where).toMatch(/breaks both rules/);
        else if (s.rowRule && s.colRule) expect(head, where).toMatch(new RegExp(`fits the ${v === 'row' ? 'column' : 'row'} rule but breaks the ${v === 'row' ? 'row' : 'column'} rule`));
        else {
          // One rule: the headline names that rule, the one the tile breaks, and no other.
          const rule = s.rowRule ? 'row' : 'column';
          expect(head, where).toMatch(new RegExp(`breaks the ${rule} rule`));
          expect(head, where).not.toMatch(new RegExp(`${rule === 'row' ? 'column' : 'row'} rule`));
        }
        // A tile that keeps the row and breaks the column is the row-only mix-up.
        if (v === 'col' && s.rowRule) expect(item.errorTags?.[c.id], where).toBe('row-only');
      }
    }
  });

  it('which rule does this tile break: the answer is the verdict from the drawn grid', () => {
    let n = 0;
    for (const { where, item } of gridItems) {
      if (!choose(item) || item.skill !== 's16.grid-why') continue;
      const tile = /put (.+) in the gap\./.exec(item.prompt)![1];
      expect(item.answer, where).toBe(verdictFromCells(item.scene as MatrixScene, parseTile(tile)));
      n++;
    }
    expect(n).toBeGreaterThan(40);
  });

  it('no text claims that each wrong tile breaks exactly one rule', () => {
    const words = [...gridItems.flatMap((x) => itemText(x.item)), ...MATRIX.ideas.flatMap(cardText), ...(MATRIX.drill ?? []).flatMap(boardText)].join('\n');
    expect(words).not.toMatch(/exactly one rule|only ever one rule|each wrong tile breaks one/i);
  });

  it('the primer (instead of Stop 2, Lesson 1): three sort-by-one-feature items, each answer found by trying every feature', () => {
    for (const seed of SEEDS) {
      const items = MATRIX.primer!(createRng(seed));
      expect(items.length).toBe(3);
      for (const it of items) {
        expect(it.skill).toBe('s16.sort');
        expect(it.lesson).toBe(L.matrix);
        if (!choose(it) || it.scene?.kind !== 'things') throw new Error('a primer item is a choose item on shape cards');
        const cards = it.scene.things;
        if (/Which feature do they share/.test(it.prompt)) {
          const shared = (['color', 'shape', 'size'] as const).filter((f) => new Set(cards.map((t) => t[f])).size === 1);
          expect(shared).toEqual([it.answer]);
        } else if (/does not belong/.test(it.prompt)) {
          const f = /by (color|shape)/.exec(it.prompt)![1] as 'color' | 'shape';
          const odd = cards.filter((t) => cards.filter((u) => u[f] === t[f]).length === 1);
          expect(odd.map((t) => t.id)).toEqual([it.answer]);
        } else {
          const f = /^Sort by (color|shape)/.exec(it.prompt)![1] as 'color' | 'shape';
          const key = cards[0];
          const ok = it.choices.filter((c) => c.label.toLowerCase().split(' ').includes(key[f]));
          expect(ok.map((c) => c.id)).toEqual([it.answer]);
        }
      }
    }
  });
});

// =====================================================================================================================
// Analogy Bridge
// =====================================================================================================================

describe('Analogy Bridge: the answer keeps the link, and a look-alike is always offered', () => {
  const linkItems = ALL.filter((x) => x.item.lesson === L.bridge);

  it('cards: apply the first pair’s one change to the new card; exactly one card of all 18 does it', () => {
    let n = 0;
    for (const { where, item } of linkItems) {
      if (!choose(item) || item.skill !== 's16.link-same') continue;
      const s = item.scene as BridgeScene;
      const { a, b, c } = s.cards!;
      const changed = (['size', 'color', 'shape'] as const).filter((f) => a[f] !== b[f]);
      expect(changed.length, where).toBe(1);
      const f = changed[0];
      const every = ['big', 'small'].flatMap((size) => ['red', 'blue', 'yellow'].flatMap((color) => ['circle', 'square', 'triangle'].map((shape) => ({ size, color, shape }))));
      const keeps = every.filter((o) => c[f] === a[f] && o[f] === b[f] && (['size', 'color', 'shape'] as const).every((g) => g === f || o[g] === c[g]));
      expect(keeps.length, where).toBe(1);
      const d = keeps[0];
      expect(answerLabel(item), where).toBe(`a ${d.size} ${d.color} ${d.shape}`);
      expect(labelOf(item, 'look'), `${where}: the look-alike is the first pair’s answer`).toBe(`a ${b.size} ${b.color} ${b.shape}`);
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it('opposites across kinds of things: exactly one choice is the other end of the new word’s kind', () => {
    const where = (w: string) => DIMENSIONS.flatMap((d) => [0, 1].flatMap((p) => (d.poles[p].includes(w) ? [{ d: d.id, p }] : [])));
    let n = 0;
    for (const { where: at, item } of linkItems) {
      if (!choose(item) || item.skill !== 's16.link-across') continue;
      const s = item.scene as BridgeScene;
      const [pc] = where(s.c);
      const [pa] = where(s.a);
      const [pb] = where(s.b);
      expect(pa.d === pb.d && pa.p !== pb.p, `${at}: the first pair are opposites`).toBe(true);
      expect(pc.d, `${at}: a new kind of thing`).not.toBe(pa.d);
      const ok = item.choices.filter((ch) => where(ch.label).some((x) => x.d === pc.d && x.p !== pc.p));
      expect(ok.map((ch) => ch.id), at).toEqual([item.answer]);
      // No second, arguable opposite: the first pair and every wrong choice come from other families than the new
      // word (tall and small are both about how big a thing is).
      const family = (w: string) => DIMENSIONS.find((d) => d.id === where(w)[0].d)!.family;
      expect(family(s.a), at).not.toBe(family(s.c));
      for (const ch of item.choices) if (ch.id !== item.answer && where(ch.label)[0].d !== pc.d) expect(family(ch.label), `${at} ${ch.label}`).not.toBe(family(s.c));
      n++;
    }
    expect(n).toBeGreaterThan(40);
  });

  it('links in words: the link’s own table gives one answer; no other choice is paired with the new word by that link', () => {
    let n = 0;
    for (const { where, item } of linkItems) {
      if (!choose(item) || !['s16.link-words', 's16.link-transfer', 's16.link-why'].includes(item.skill)) continue;
      const s = item.scene as BridgeScene;
      const link = LINKS.find((l) => l.pairs.some((p) => p.x === s.a && p.y === s.b))!;
      expect(link, where).toBeTruthy();
      expect(link.link, where).toBe(s.relation);
      const d = link.pairs.find((p) => p.x === s.c)!;
      if (item.skill === 's16.link-why') {
        expect(answerLabel(item).toLowerCase(), where).toContain(`${d.ay}, because`);
        expect(answerLabel(item), where).toContain(`${s.c} ${link.link} ${d.ay}`);
      } else {
        expect(answerLabel(item), where).toBe(d.ay);
        for (const ch of item.choices) if (ch.id !== item.answer) expect(link.pairs.some((p) => p.x === s.c && p.ay === ch.label), where).toBe(false);
        expect(labelOf(item, 'look'), where).toBe(link.pairs.find((p) => p.x === s.a)!.ay);
      }
      if (item.skill === 's16.link-transfer') expect(['tools', 'animals', 'jobs'], `${where}: a new domain`).toContain(link.domain);
      if (item.skill === 's16.link-words') expect(link.domain, where).toBe('things');
      n++;
    }
    expect(n).toBeGreaterThan(100);
  });

  it('every analogy item has a look-alike option, tagged appearance-match, and the trap tag', () => {
    for (const { where, item } of linkItems) {
      expect(Object.values(item.errorTags ?? {}), where).toContain('appearance-match');
      expect(item.tags, where).toContain('appearance-match');
    }
  });
});

// =====================================================================================================================
// See and Do
// =====================================================================================================================

/** Every player-facing string of a card: its words, and its picture's stated lines, steps and captions. */
function cardText(c: IdeaCard): string[] {
  const s = c.scene as Scene | undefined;
  const out = [c.title, ...c.body];
  if (s && 'steps' in s) for (const st of s.steps ?? []) out.push(st.label, st.say);
  if (s?.kind === 'mirror') out.push(s.caption ?? '');
  if (s?.kind === 'matrix') out.push(s.rowRule ?? '', s.colRule ?? '', s.allRule ?? '');
  if (s?.kind === 'bridge') out.push(s.a, s.b, s.c, s.relation, s.d ?? '', ...(s.frames ?? []).flatMap((f) => [f.d ?? '', f.look ?? '']));
  return out.filter(Boolean);
}
function boardText(b: DrillStep): string[] {
  return [b.title, ...b.body, b.done, b.twin ?? '', ...(b.steps ?? []), ...b.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])])].filter(Boolean);
}
function itemText(it: Item): string[] {
  const out = [it.prompt, it.explain, ...teachStrings(it), ...(it.hints ?? []), it.frame ?? ''];
  if (it.kind === 'choose') out.push(...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
  if (it.kind === 'multi') out.push(...it.choices.map((c) => c.label), ...Object.values(it.missTips ?? {}), ...Object.values(it.pickTips ?? {}));
  if (it.scene?.kind === 'mirror') out.push(it.scene.caption ?? '');
  if (it.scene?.kind === 'matrix') out.push(it.scene.rowRule ?? '', it.scene.colRule ?? '', it.scene.allRule ?? '');
  return out.filter(Boolean);
}

describe('Deep Sky: See (stepped pictures) and Do (guided boards)', () => {
  it('each place has 3 to 7 cards; a stepped picture has one frame per step; the boards are computed and pass with the right marks', () => {
    for (const l of stop16.lessons) {
      expect(l.ideas.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.ideas.length, l.id).toBeLessThanOrEqual(7);
      for (const c of l.ideas) {
        const s = c.scene as { steps?: unknown[]; frames?: unknown[] } | undefined;
        expect(s?.steps?.length, `${l.id} ${c.title}: a worked example with its steps`).toBeGreaterThan(0);
        expect(s?.frames?.length, `${l.id} ${c.title}`).toBe(s?.steps?.length);
      }
      const boards = l.drill ?? [];
      expect(boards.length, l.id).toBeGreaterThan(0);
      expect(boards[0].scaffold, l.id).toBe('full');
      const sees = l.ideas.map((c) => JSON.stringify(c.scene));
      for (const b of boards) {
        expect(sees, `${b.id}: the board is a card’s picture`).toContain(JSON.stringify(b.scene));
        if (b.afterCard !== undefined) expect(JSON.stringify(l.ideas[b.afterCard].scene), b.id).toBe(JSON.stringify(b.scene));
        const tap = marksToTap(b);
        expect(checkDrill(b, Object.fromEntries(tap.map((m) => [m.id, m.answer]))).done, b.id).toBe(true);
        for (const m of tap) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id], `${b.id} ${m.id} ${o.id}`).toBeTruthy();
      }
    }
  });

  it('the boards’ answers come from the pictures', () => {
    // Mirror board 1: each dot's mark is whether the spot across the line, same row and step, holds a dot.
    const mb = MIRROR.drill![0];
    const ms = mb.scene as MirrorScene;
    const W = ms.cells[0].length;
    for (const r of mb.rows) {
      for (const m of r.marks) {
        const dot = /^p-(\d)-(\d)$/.exec(m.id);
        if (!dot) continue;
        const [j, k] = [Number(dot[1]), Number(dot[2])];
        expect(m.answer, m.id).toBe(ms.cells[j - 1][W / 2 - 1 + k] === '#' ? 'yes' : 'no');
      }
    }
    expect(mb.rows.find((r) => r.id === 'fold')!.marks[0].answer).toBe(moveOf(ms)[0]);
    // Mirror board 2: a spot needs a dot exactly when its partner across the line is a dot.
    const fb = MIRROR.drill![1];
    const fs = fb.scene as MirrorScene;
    const asks: [number, number][] = [];
    fs.cells.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '?') asks.push([r, c]); }));
    for (const m of fb.rows.flatMap((r) => r.marks)) {
      const i = 'abcdef'.indexOf(m.id.slice(-1));
      const [r, c] = asks[i];
      expect(m.answer, m.id).toBe(fs.cells[r][fs.cells[0].length - 1 - c] === '#' ? 'dot' : 'empty');
    }
    // Matrix board 1: the gap's row color, column shape, the count, and the one tile that fits.
    const gb = MATRIX.drill![0];
    const gs = gb.scene as MatrixScene;
    const fit = allTilesFor(gs).filter((t) => Object.values(gridFits(gs, t)).every(Boolean));
    expect(fit.length).toBe(1);
    const marks = Object.fromEntries(gb.rows.flatMap((r) => r.marks).map((m) => [m.id, m]));
    expect(marks['row-color'].answer).toBe(fit[0].color);
    expect(marks['col-shape'].answer).toBe(fit[0].shape);
    expect(marks.count.answer).toBe(fit[0].count);
    expect(parseTile(marks.gap.options.find((o) => o.id === marks.gap.answer)!.label)).toEqual(fit[0]);
    // Matrix board 2: each rule mark is the verdict from the drawn grid.
    const vb = MATRIX.drill![1];
    for (const r of vb.rows) {
      const v = verdictFromCells(vb.scene as MatrixScene, parseTile(r.label));
      expect(r.marks[0].answer, r.id).toBe(v === 'row' || v === 'both' ? 'breaks' : 'fits');
      expect(r.marks[1].answer, r.id).toBe(v === 'col' || v === 'both' ? 'breaks' : 'fits');
    }
    // Bridge board 1: the new card turns into the old card's change; board 2: the link's table decides each test.
    const bb = BRIDGE.drill![0];
    const bs = bb.scene as BridgeScene;
    const turns = bb.rows.find((r) => r.id === 'new')!.marks[0];
    const want = { ...bs.cards!.c, size: bs.cards!.b.size };
    expect(turns.options.find((o) => o.id === turns.answer)!.label).toBe(`a ${want.size} ${want.color} ${want.shape}`);
    const pb = BRIDGE.drill![1];
    const part = LINKS.find((x) => x.id === 'part')!;
    for (const r of pb.rows) expect(r.marks[0].answer, r.id).toBe(part.pairs.some((p) => p.x === 'petal' && p.y === r.id) ? 'yes' : 'no');
  });
});

// =====================================================================================================================
// Words
// =====================================================================================================================

describe('Deep Sky: words a kid reads', () => {
  const texts = [
    ...stop16.lessons.flatMap((l) => [...l.ideas.flatMap(cardText), ...(l.drill ?? []).flatMap(boardText)]),
    ...ALL.flatMap((x) => itemText(x.item)),
    ...Object.values(stop16.skillNames ?? {}),
    S16_WORLD.stop,
    ...Object.values(S16_WORLD.lessons).flatMap((w) => [w.why, ...w.uses.flatMap((u) => [u.who, u.text])]),
    ...Object.values(S16_WORLD.skills).flat(),
  ];

  it('curly quotes only, no symbols, calm wording', () => {
    for (const t of texts) {
      expect(t, t).not.toMatch(/['"]/);
      expect(t, t).not.toMatch(/[=+×−→✓✗]/);
      expect(t, t).not.toMatch(/(^|[.!?:]\s+)Wrong\b|try again/i);
      expect(t, t).not.toMatch(/colour|centre|labelled/);
    }
  });

  it('every item set reads at the game’s level: the primer, reviews, independent checks and the diagnostic', () => {
    const sets: [string, Item[]][] = [];
    for (const l of stop16.lessons) {
      if (l.primer) sets.push([`${l.id} primer`, [1, 2, 3].flatMap((s) => l.primer!(createRng(s)))]);
      sets.push([`${l.id} review`, [1, 2, 3].flatMap((s) => l.review!(createRng(s), 2))]);
      sets.push([`${l.id} independent`, [1, 2, 3].flatMap((s) => l.independent!(createRng(s)))]);
    }
    sets.push(['diagnostic', [1, 2, 3].flatMap((s) => [1, 2, 3].map((lv) => stop16.observatory!.diagnostic!(createRng(s), 3, lv as 1 | 2 | 3)!))]);
    for (const [name, items] of sets) {
      const t = items.flatMap(itemText).join('\n');
      expect(fkGrade(t), name).toBeLessThanOrEqual(READING.maxGrade);
      const long = longestSentence(t);
      expect(long.words, `${name}: ${long.sentence}`).toBeLessThanOrEqual(READING.maxSentenceWords);
    }
  });

  it('every skill the ring asks about has a plain name and a real-life line', () => {
    const skills = new Set(ALL.map((x) => x.item.skill));
    for (const s of skills) {
      expect(stop16.skillNames?.[s], s).toBeTruthy();
      if (s !== 's16.sort') expect(S16_WORLD.skills[s]?.length, s).toBeGreaterThan(0);
    }
  });
});

// =====================================================================================================================
// The diagnostic, the check and the pictures
// =====================================================================================================================

describe('Deep Sky: the diagnostic serves Track 3 at L1 to L3', () => {
  it('L1 a simple fold (which half), L2 an analogy with a look-alike, L3 a one-rule grid; nothing for other tracks or L4', () => {
    for (const seed of SEEDS) {
      const d = (track: 1 | 2 | 3 | 4, level: 1 | 2 | 3 | 4) => stop16.observatory!.diagnostic!(createRng(seed), track, level);
      const l1 = d(3, 1)!;
      const l2 = d(3, 2)!;
      const l3 = d(3, 3)!;
      expect([l1.lesson, l1.skill, l1.level]).toEqual([L.mirror, 's16.fold-match', 1]);
      expect(l1.kind).toBe('choose');
      expect([l2.lesson, l2.level]).toEqual([L.bridge, 2]);
      expect(Object.values(l2.errorTags ?? {})).toContain('appearance-match');
      expect([l3.lesson, l3.skill, l3.level]).toEqual([L.matrix, 's16.grid-one', 3]);
      const s = l3.scene as MatrixScene;
      expect(s.size).toBe(3);
      expect(!!s.rowRule !== !!s.colRule, 'one rule').toBe(true);
      expect(d(3, 4)).toBeNull();
      for (const t of [1, 2, 4] as const) for (const lv of [1, 2, 3, 4] as const) expect(d(t, lv)).toBeNull();
      expect(d(3, 2)).toEqual(l2);
    }
  });

  it('the Ring Check covers every place with a conflict item, and the Arcade and new examples stay in the ring', () => {
    for (const seed of SEEDS) {
      const items = stop16.check!(createRng(seed));
      expect(items.length).toBe(9);
      for (const l of stop16.lessons) expect(items.filter((x) => x.lesson === l.id).length).toBe(3);
      expect(items.some((x) => x.conflict)).toBe(true);
      const a = stop16.practice!(createRng(seed));
      expect(a.stop).toBe(16);
      for (const it of [...items, ...MATRIX.primer!(createRng(seed))]) {
        const f = stop16.fresh!(it, createRng(seed + 1));
        expect(f.length).toBe(1);
        expect(f[0].skill).toBe(it.skill);
        if (it.skill === 's16.sort') expect(f[0].meta?.task, `${it.id}: a primer twin of the same task`).toBe(it.meta?.task);
      }
    }
  });
});

describe('Deep Sky: every picture draws and reads aloud', () => {
  it('every card at every step, every board and every item scene', () => {
    const scenes: { where: string; scene: Scene; revealed?: number }[] = [];
    for (const l of stop16.lessons) {
      for (const c of l.ideas) for (let r = 0; r <= ((c.scene as { steps?: unknown[] }).steps?.length ?? 0); r++) scenes.push({ where: `${l.id} ${c.title} step ${r}`, scene: c.scene!, revealed: r });
      for (const b of l.drill ?? []) scenes.push({ where: b.id, scene: b.scene! });
    }
    for (const { where, item } of ALL.slice(0, 600)) if (item.scene) scenes.push({ where, scene: item.scene });
    for (const { where, scene, revealed } of scenes) {
      if (scene.kind === 'things') continue;
      const html = renderToString(h(ObservatoryScene, { scene: scene as never, revealed }));
      expect(html, where).toContain(`play-ob--${scene.kind}`);
      const lines = observatorySpeech(scene as never, revealed);
      expect(lines.length, where).toBeGreaterThan(0);
      for (const line of lines) expect(line, `${where}: ${line}`).not.toMatch(/[×=→✓'"]/);
    }
  });

  it('a trial tile in a frame shows both verdicts; a hidden link shows a question mark on the plank', () => {
    const both = MATRIX.ideas[2].scene!;
    const html = renderToString(h(ObservatoryScene, { scene: both as never, revealed: 1 })).replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '');
    expect(html).toContain('row rule fits');
    expect(html).toContain('column rule breaks');
    const key = BRIDGE.ideas[0].scene!;
    expect(renderToString(h(ObservatoryScene, { scene: key as never, revealed: 0 }))).toContain('is-ask');
    expect(renderToString(h(ObservatoryScene, { scene: key as never, revealed: 2 }))).toContain('account');
  });
});
