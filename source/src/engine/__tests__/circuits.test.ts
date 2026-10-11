/**
 * Stop 10 · Circuit Lab. Every answer is worked out again here by a second method: the circuit is read from the picture
 * the learner sees (the scene's wiring, switch names and states) and turned into a little graph of wires. A closed
 * switch joins its two ends; a flipper box joins its ends only when its own inside does not; then a search asks whether
 * power can get from the battery to the lamp. Rows are listed by counting in binary. “Same job” is checked with Stop 2's
 * card rules (rules.ts) over all 18 cards. None of it calls the code that set the answer.
 */
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { describe, expect, it } from 'vitest';
import { stop10 } from '../../content/stop10';
import { STOPS } from '../../content/stops';
import { S10_WORLD } from '../../content/world/s10';
import { SOON_WORLD, WORLD } from '../../content/world';
import { CircuitPicture, frameWidth } from '../../game/components/CircuitScene';
import { circuitSpeech } from '../../game/speech';
import { checkDrill, marksToTap } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import { ALL_CARDS, and, colorIs, evaluate, meaning, not, or, shapeIs, sizeIs, type Card, type Formula } from '../puzzles/rules';
import {
  DIFF_PAIRS,
  FLIP_POOL,
  LAB,
  LINE_POOL,
  MATCH_POOL,
  SAME_PAIRS,
  SIDE_POOL,
  TOPICS,
  bridgeItem,
  caseItem,
  columnItem,
  lampItem,
  matchItem,
  sameItem,
  toPart,
  whyItem,
  type CircuitMade,
  type Fam,
  type Skin,
  type WhyKind,
} from '../puzzles/circuits';
import { DIFF_LOOK_SAME, SAME_LOOK_DIFF } from '../puzzles/circuitBoards';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, CircuitPart, DrillStep, Item, Scene } from '../types';

const SEEDS = 150;
const SKINS: Skin[] = ['lab', 'everyday', 'fantasy'];
type CircuitData = Extract<Scene, { kind: 'circuit' }>;
const choose = (m: CircuitMade) => m.item as ChooseItem;
const scene = (it: { scene?: Scene }) => it.scene as CircuitData;

// ---------- the second method: a graph of wires ----------

/** Can power get from the battery to the lamp? Each part is wires between two points; search for a path. */
function conducts(p: CircuitPart, closed: Record<string, boolean>): boolean {
  let next = 2;
  const edges: [number, number][] = [];
  const build = (q: CircuitPart, from: number, to: number) => {
    switch (q.t) {
      case 'switch':
        if (closed[q.name]) edges.push([from, to]);
        break;
      case 'flip':
        // A flipper box is a wire of its own that is there only when its inside, as its own loop, has no path.
        if (!conducts(q.part, closed)) edges.push([from, to]);
        break;
      case 'side':
        for (const x of q.parts) build(x, from, to);
        break;
      case 'line': {
        let at = from;
        q.parts.forEach((x, i) => {
          const end = i === q.parts.length - 1 ? to : next++;
          build(x, at, end);
          at = end;
        });
        break;
      }
    }
  };
  build(p, 0, 1);
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const a = queue.shift()!;
    for (const [x, y] of edges) for (const [u, v] of [[x, y], [y, x]]) if (u === a && !seen.has(v)) { seen.add(v); queue.push(v); }
  }
  return seen.has(1);
}

/** The switch names a part uses, in drawing order. */
function names(p: CircuitPart): string[] {
  if (p.t === 'switch') return [p.name];
  if (p.t === 'flip') return names(p.part);
  return p.parts.flatMap(names);
}

/** Every case of k switches by counting down in binary: all closed first, as Truth Tables lists them. */
function countRows(k: number): boolean[][] {
  return Array.from({ length: 2 ** k }, (_, j) => Array.from({ length: k }, (_, i) => (((2 ** k - 1 - j) >> (k - 1 - i)) & 1) === 1));
}

const closedOf = (heads: readonly string[], r: readonly boolean[]) => Object.fromEntries(r.map((v, i) => [heads[i], v]));
/** A frame's lamp column over the counting rows of these switch names. */
const columnOf = (p: CircuitPart, heads: readonly string[]) => countRows(heads.length).map((r) => conducts(p, closedOf(heads, r)));
const lampWord = (v: boolean) => (v ? 'On' : 'Off');

/** A circuit as a Stop 2 card rule: the first switch name is red, the second big, the third a circle. */
function toRule(p: CircuitPart, heads: readonly string[]): Formula {
  const feat = [colorIs('red'), sizeIs('big'), shapeIs('circle')];
  switch (p.t) {
    case 'switch':
      return feat[heads.indexOf(p.name)];
    case 'flip':
      return not(toRule(p.part, heads));
    case 'line':
      return p.parts.map((x) => toRule(x, heads)).reduce((x, y) => and(x, y));
    case 'side':
      return p.parts.map((x) => toRule(x, heads)).reduce((x, y) => or(x, y));
  }
}
const cardClosed = (c: Card, heads: readonly string[]) => closedOf(heads, [c.color === 'red', c.size === 'big', c.shape === 'circle'].slice(0, heads.length));

/** Which topic an item is about, from its first line. */
const topicOf = (prompt: string) => [LAB, ...TOPICS].find((t) => prompt.startsWith(t.setting))!;

const LAMP_FAMS: Fam[] = ['line', 'side', 'flip'];

describe('the model, worked out again', () => {
  it('every circuit of every pool: the lamp by graph search in every case, and the card rule on every card, agree with the engine', () => {
    for (const n of [...LINE_POOL, ...SIDE_POOL, ...FLIP_POOL, ...MATCH_POOL]) {
      const p = toPart(n, LAB.names);
      const heads = LAB.names.slice(0, Math.max(...names(p).map((x) => LAB.names.indexOf(x))) + 1);
      const rule = toRule(p, heads);
      for (const c of ALL_CARDS) expect(evaluate(rule, c), JSON.stringify(p)).toBe(conducts(p, cardClosed(c, heads)));
    }
  });

  it('the pairs: a “same” pair agrees in every row (and on every card); a “differ” pair differs in a row (and on a card)', () => {
    const heads = ['A', 'B'];
    for (const [pairs, same] of [[SAME_PAIRS, true], [DIFF_PAIRS, false]] as const) {
      for (const [x, y] of pairs) {
        const [p, q] = [toPart(x, heads), toPart(y, heads)];
        expect(JSON.stringify(columnOf(p, heads)) === JSON.stringify(columnOf(q, heads)), JSON.stringify([p, q])).toBe(same);
        expect(meaning(toRule(p, heads)) === meaning(toRule(q, heads))).toBe(same);
        // They are drawn differently.
        expect(JSON.stringify(p)).not.toBe(JSON.stringify(q));
      }
    }
  });

  it('every circuit fits the 320-unit frame, so its labels stay at 12 px or more at phone width', () => {
    for (const n of [...LINE_POOL, ...SIDE_POOL, ...FLIP_POOL, ...MATCH_POOL, ...SAME_PAIRS.flat(), ...DIFF_PAIRS.flat()]) {
      for (const t of [LAB, ...TOPICS]) expect(frameWidth(toPart(n, t.names)), JSON.stringify(n)).toBeLessThanOrEqual(320);
    }
  });
});

describe('every kind, every skin: the answer is the only choice the circuit makes right', () => {
  it('is the lamp on or off: the picture’s switches, searched for a path', () => {
    for (const fam of LAMP_FAMS) for (const skin of SKINS) for (const trap of [false, true]) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(lampItem(createRng(seed), { skin, fam, trap }));
      const f = scene(it).circuits[0];
      expect(f.lamp, 'the lamp is to be worked out').toBeNull();
      const on = conducts(f.part, f.closed!);
      expect(it.answer).toBe(on ? 'on' : 'off');
      // The prompt says each switch's state, as drawn.
      for (const [name, v] of Object.entries(f.closed!)) expect(it.prompt).toMatch(new RegExp(`${name}( switch)? is ${v ? 'closed' : 'open'}\\.`));
      // The trap, worked out from the picture.
      const states = Object.values(f.closed!);
      const flipped = (p: CircuitPart): string[] => (p.t === 'flip' ? (p.part.t === 'switch' ? [p.part.name] : flipped(p.part)) : p.t === 'switch' ? [] : p.parts.flatMap(flipped));
      const isTrap =
        fam === 'line' ? f.part.t === 'line' && states.some(Boolean) && !states.every(Boolean)
          : fam === 'side' ? f.part.t === 'side' && states.every(Boolean)
            : !on && flipped(f.part).some((x) => f.closed![x]);
      expect(isTrap, `${fam} ${skin} ${seed} trap ${trap}`).toBe(trap);
      expect(!!it.conflict).toBe(trap);
      expect((it.tags ?? []).length).toBe(trap ? 1 : 0);
      // The one wrong choice names the gap.
      const wrong = on ? 'off' : 'on';
      expect(it.feedback![wrong].headline.startsWith(`Your answer says ${wrong}, but`)).toBe(true);
    }
  });

  it('fill the lamp column: the right column is the lamp in every counted row; every wrong column is shown failing in a row where it differs', () => {
    for (const fam of [...LAMP_FAMS, 'mixed'] as Fam[]) for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(columnItem(createRng(seed), { skin, fam }));
      const sc = scene(it);
      const tb = sc.table!;
      const heads = tb.heads.slice(0, tb.inputs);
      expect(tb.cells.map((r) => r.slice(0, tb.inputs))).toEqual(countRows(heads.length));
      expect(tb.cells.every((r) => r[tb.inputs] === null), 'the lamp column is blank').toBe(true);
      const col = columnOf(sc.circuits[0].part, heads);
      const label = (c: boolean[]) => c.map(lampWord).join(', ');
      expect(it.choices.find((c) => c.id === it.answer)!.label).toBe(label(col));
      expect(it.choices.length).toBe(4);
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const theirs = c.label.split(', ').map((w) => w === 'On');
        const rows = theirs.flatMap((v, k) => (v !== col[k] ? [k + 1] : []));
        expect(rows.length, c.label).toBeGreaterThan(0);
        const fb = it.feedback![c.id];
        const named = /Look at row (\d+)/.exec(fb.detail[0]);
        expect(named, fb.detail[0]).not.toBeNull();
        expect(rows).toContain(Number(named![1]));
      }
    }
  });

  it('which case: exactly one case gives the lamp asked for, and it is the answer', () => {
    for (const fam of [...LAMP_FAMS, 'mixed'] as Fam[]) for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(caseItem(createRng(seed), { skin, fam }));
      const f = scene(it).circuits[0];
      const want = / turns .* on\?$/.test(it.prompt);
      expect(want || / leaves .* off\?$/.test(it.prompt), it.prompt).toBe(true);
      const heads = names(f.part).length === 1 ? names(f.part) : topicOf(it.prompt).names.slice(0, names(f.part).length);
      const fits = it.choices.filter((c) => {
        const closed = Object.fromEntries(c.label.split(', ').map((x) => { const [n, s] = x.split(' '); return [n, s === 'closed']; }));
        expect(Object.keys(closed).sort()).toEqual([...heads].sort());
        return conducts(f.part, closed) === want;
      });
      expect(fits.map((c) => c.id), `${fam} ${skin} ${seed}`).toEqual([it.answer]);
    }
  });

  it('which circuit has this table: exactly one drawn circuit matches the table in every row, and the others each fail a row the feedback names', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(matchItem(createRng(seed), { skin }));
      const sc = scene(it);
      const tb = sc.table!;
      const heads = tb.heads.slice(0, tb.inputs);
      expect(tb.cells.map((r) => r.slice(0, tb.inputs))).toEqual(countRows(2));
      const target = tb.cells.map((r) => r[tb.inputs]);
      const matching = sc.circuits.filter((f) => JSON.stringify(columnOf(f.part, heads)) === JSON.stringify(target));
      expect(matching.length, `${skin} ${seed}`).toBe(1);
      expect(it.choices.find((c) => c.id === it.answer)!.label).toBe(matching[0].name);
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const f = sc.circuits.find((x) => x.name === c.label)!;
        const k = Number(/row (\d+)/.exec(it.feedback![c.id].headline)![1]) - 1;
        expect(conducts(f.part, closedOf(heads, countRows(2)[k]))).not.toBe(target[k]);
      }
    }
  });

  it('the trap of Lesson 4: a pair that looks different with the same table says yes; a pair that differs says no; the feedback names a differing row', () => {
    for (const skin of SKINS) for (const same of [true, false]) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = sameItem(createRng(seed), { skin, same });
      const it = choose(m);
      const [f1, f2] = scene(it).circuits;
      const heads = m.topic.names.slice(0, 2);
      const c1 = columnOf(f1.part, heads);
      const c2 = columnOf(f2.part, heads);
      const agree = JSON.stringify(c1) === JSON.stringify(c2);
      expect(agree).toBe(same);
      expect(it.answer).toBe(agree ? 'yes' : 'no');
      expect(meaning(toRule(f1.part, heads)) === meaning(toRule(f2.part, heads))).toBe(agree);
      expect(it.tags ?? []).toEqual(agree ? ['looks-differ'] : []);
      if (agree) expect(it.conflict).toBe(true);
      else {
        const k = Number(/row (\d+)/.exec(it.feedback!.yes.headline)![1]) - 1;
        expect(c1[k]).not.toBe(c2[k]);
      }
    }
  });

  it('every item: 2-5 distinct choices, feedback for every wrong choice and none for the right one, whyWrong in step, a hint case and teaching', () => {
    const makers: ((rng: ReturnType<typeof createRng>, skin: Skin) => CircuitMade)[] = [
      ...LAMP_FAMS.flatMap((fam) => [(r, skin) => lampItem(r, { skin, fam }), (r, skin) => lampItem(r, { skin, fam, trap: true }), (r, skin) => columnItem(r, { skin, fam }), (r, skin) => caseItem(r, { skin, fam })] as ((rng: ReturnType<typeof createRng>, skin: Skin) => CircuitMade)[]),
      (r, skin) => matchItem(r, { skin }),
      (r, skin) => sameItem(r, { skin, same: true }),
      (r, skin) => sameItem(r, { skin, same: false }),
      (r, skin) => columnItem(r, { skin, fam: 'mixed' }),
      ...(['line-off', 'side-both', 'flip-closed', 'same', 'differ'] as WhyKind[]).map((kind) => (r: ReturnType<typeof createRng>, skin: Skin) => whyItem(r, { kind, skin })),
    ];
    for (const make of makers) for (const skin of SKINS) for (let seed = 1; seed <= 40; seed++) {
      const it = choose(make(createRng(seed), skin));
      expect(it.choices.length).toBeGreaterThanOrEqual(2);
      expect(it.choices.length).toBeLessThanOrEqual(5);
      expect(new Set(it.choices.map((c) => c.label)).size).toBe(it.choices.length);
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback![c.id]).toBeUndefined();
        else {
          expect(it.feedback![c.id]?.headline.trim(), `${it.prompt} ${c.id}`).toBeTruthy();
          expect(it.whyWrong![c.id]).toContain(it.feedback![c.id].headline);
        }
      }
      expect(it.hintCase).toBeDefined();
      expect(it.teach?.cases?.length).toBeGreaterThanOrEqual(2);
      expect(make(createRng(seed), skin).item).toEqual(it);
    }
  });

  it('a lamp question’s hint works another case of the same circuit, never the case asked', () => {
    for (const fam of LAMP_FAMS) for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(lampItem(createRng(seed), { skin, fam }));
      const f = scene(it).circuits[0];
      const asked = Object.entries(f.closed!).map(([n, v]) => `${n} ${v ? 'closed' : 'open'}`).join(', ');
      expect(it.hintCase!.label).not.toContain(`${asked}.`);
      expect(it.hintCase!.label.startsWith('Another case:')).toBe(true);
    }
  });

  it('the answer is not always in the same place', () => {
    for (const make of [(r: ReturnType<typeof createRng>) => columnItem(r, { skin: 'lab', fam: 'mixed' }), (r: ReturnType<typeof createRng>) => matchItem(r, { skin: 'everyday' }), (r: ReturnType<typeof createRng>) => whyItem(r, {})]) {
      const at = new Set<number>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const it = choose(make(createRng(seed)));
        at.add(it.choices.findIndex((c) => c.id === it.answer));
      }
      expect(at.size).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('the closing why item', () => {
  const RIGHT: Record<WhyKind, string> = { 'line-off': 'gap', 'side-both': 'one-path', 'flip-closed': 'flip', same: 'rows', differ: 'row' };

  it('the right reason is true of the circuit, worked out again; every choice is a reason; every wrong reason has its own feedback', () => {
    for (const kind of Object.keys(RIGHT) as WhyKind[]) for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = whyItem(createRng(seed), { kind, skin });
      const it = choose(m);
      expect(it.tags).toEqual(['why']);
      expect(it.answer).toBe(RIGHT[kind]);
      expect(it.choices.length).toBe(4);
      for (const c of it.choices) expect(c.label.length, c.label).toBeGreaterThan(12);
      const sc = scene(it);
      const heads = m.topic.names.slice(0, 2);
      if (kind === 'line-off' || kind === 'side-both' || kind === 'flip-closed') {
        const f = sc.circuits[0];
        // The lamp drawn is the lamp the switches give.
        expect(f.lamp).toBe(conducts(f.part, f.closed!));
        if (kind === 'line-off') {
          expect(f.part.t).toBe('line');
          const open = Object.keys(f.closed!).filter((n) => !f.closed![n]);
          expect(open.length).toBe(1);
          expect(it.choices.find((c) => c.id === 'gap')!.label).toMatch(new RegExp(`${open[0]}( switch)? is open\\.$`));
        }
        if (kind === 'side-both') expect(f.part.t === 'side' && Object.values(f.closed!).every(Boolean) && f.lamp).toBe(true);
        if (kind === 'flip-closed') {
          const first = names(f.part)[0];
          expect(f.closed![first]).toBe(true);
          expect(f.lamp).toBe(false);
          // On its own, that closed switch would light the lamp: the box is what turns it off.
          expect(conducts({ t: 'switch', name: first }, f.closed!)).toBe(true);
        }
      } else {
        const [c1, c2] = sc.circuits.map((f) => columnOf(f.part, heads));
        const diff = c1.flatMap((v, k) => (v !== c2[k] ? [k + 1] : []));
        expect(diff.length === 0).toBe(kind === 'same');
        const rowIn = (id: string) => Number(/row (\d+)/.exec(it.choices.find((c) => c.id === id)!.label)![1]);
        if (kind === 'differ') {
          expect(diff).toContain(rowIn('row'));
          expect(diff).not.toContain(rowIn('some'));
        } else expect(c1[rowIn('one-row') - 1]).toBe(c2[rowIn('one-row') - 1]);
        // The table shown has both lamps, worked out again.
        expect(sc.table!.cells.map((r) => r.slice(2))).toEqual(c1.map((v, k) => [v, c2[k]]));
      }
    }
  });

  it('the stop check ends with it on every seed', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const items = stop10.check!(createRng(seed));
      expect(items[items.length - 1].tags).toEqual(['why']);
      expect(items.slice(0, -1).some((i) => i.tags?.includes('why'))).toBe(false);
    }
  });
});

describe('the warm-up (bridge): a Stop 9 fill-the-column item', () => {
  /** Read a Stop 9 sentence of the forms used: X AND Y, X OR Y, with NOT before a letter. */
  function evalSentence(text: string, r: readonly boolean[]): boolean {
    const lit = (w: string) => {
      const m = /^(NOT )?([A-Z])$/.exec(w.trim())!;
      const v = r['AB'.indexOf(m[2])];
      return m[1] ? !v : v;
    };
    if (text.includes(' AND ')) return text.split(' AND ').every(lit);
    if (text.includes(' OR ')) return text.split(' OR ').some(lit);
    return lit(text);
  }

  it('is Stop 9’s own item (lesson 2, fill), opens with “Back to Truth Tables,” has a table board, and its answer is the sentence in every counted row', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const it = stop10.bridge!(createRng(seed)) as ChooseItem;
      expect([it.stop, it.lesson, it.skill, it.id]).toEqual([9, 's9.l2', 's9.fill', 's10-warm']);
      expect(it.prompt.startsWith('Back to Truth Tables.')).toBe(true);
      expect(it.scratch?.rows.length).toBe(4);
      const sentence = /Fill the column for “(.+?)[.,]?” Which/.exec(it.prompt)![1];
      const col = countRows(2).map((r) => (evalSentence(sentence, r) ? 'True' : 'False')).join(', ');
      expect(it.choices.find((c) => c.id === it.answer)!.label, it.prompt).toBe(col);
      expect(stop10.bridge!(createRng(seed))).toEqual(it);
      seen.add(looks(it));
    }
    expect(seen.size).toBeGreaterThan(50);
    expect(bridgeItem(createRng(1)).tag).toBe('fill');
  });
});

describe('the lessons', () => {
  const TRAP: Record<string, string> = { 's10.l1': 'one-closed', 's10.l2': 'both-closed', 's10.l3': 'flip-closed', 's10.l4': 'looks-differ' };
  const SKILL: Record<string, string> = { 's10.l1': 's10.series', 's10.l2': 's10.parallel', 's10.l3': 's10.not', 's10.l4': 's10.match' };

  it('every pack: 4 items of the lesson’s skill, the trap at least once, two or more skins, the same for the same seed', () => {
    for (const l of stop10.lessons) for (let seed = 1; seed <= SEEDS; seed++) {
      const items = l.practice(createRng(seed)) as ChooseItem[];
      expect(items.length).toBe(4);
      expect(items.every((i) => i.skill === SKILL[l.id])).toBe(true);
      expect(items.some((i) => i.tags?.includes(TRAP[l.id])), `${l.id} ${seed}`).toBe(true);
      expect(l.pass).toEqual({ firstTry: 3, include: [{ tag: TRAP[l.id], label: expect.any(String) }] });
      const skins = new Set(items.map((i) => topicOf(i.prompt).skin));
      expect(skins.size, `${l.id} ${seed}`).toBeGreaterThanOrEqual(2);
      expect(new Set(items.map(looks)).size).toBe(4);
      expect(l.practice(createRng(seed))).toEqual(items);
    }
  });

  it('each skill has many different-looking items, so a new example after a miss looks new', () => {
    const seen: Record<string, Set<string>> = {};
    for (let seed = 1; seed <= SEEDS; seed++) for (const l of stop10.lessons) for (const it of l.practice(createRng(seed))) (seen[it.skill] ??= new Set()).add(looks(it));
    for (const [skill, s] of Object.entries(seen)) expect(s.size, skill).toBeGreaterThanOrEqual(30);
  });

  /** Read a board row: its frame (by name, or the first) and its switch states from the label. */
  function boardCase(d: DrillStep, label: string) {
    const sc = d.scene as CircuitData;
    const m = /^(?:Case|Row) \d+(?:\. (.+?))?: (.+)$/.exec(label);
    if (!m) return null;
    const closed = Object.fromEntries(m[2].split(', ').map((x) => { const [n, s] = x.split(' '); return [n, s === 'closed']; }));
    const frame = m[1] ? sc.circuits.find((f) => f.name === m[1])! : sc.circuits[0];
    return { closed, frames: sc.circuits, frame };
  }

  it('the boards: every mark worked out again from the board’s own picture; words for every wrong mark; at most 12 taps; the right marks pass', () => {
    for (const l of stop10.lessons) for (const d of l.drill!) {
      const taps = marksToTap(d);
      expect(taps.length, d.id).toBeLessThanOrEqual(12);
      expect(checkDrill(d, Object.fromEntries(taps.map((m) => [m.id, m.answer]))).done).toBe(true);
      const sc = d.scene as CircuitData;
      expect(sc.kind).toBe('circuit');
      for (const r of d.rows) {
        const c = boardCase(d, r.label);
        for (const mk of r.marks) {
          for (const o of mk.options) if (o.id !== mk.answer) expect(mk.why[o.id]?.trim(), `${d.id} ${mk.id} ${o.id}`).toBeTruthy();
          const pass = /^(?:Can|Would) power pass (\w+)\?$/.exec(mk.label);
          const box = /^Does the box on (\w+) let power through\?$/.exec(mk.label);
          if (c && pass) expect(mk.answer, mk.id).toBe(c.closed[pass[1]] ? 'yes' : 'no');
          else if (c && box) expect(mk.answer, mk.id).toBe(c.closed[box[1]] ? 'no' : 'yes');
          else if (c && /^Lamp( \d)?$/.test(mk.label)) {
            const f = mk.label === 'Lamp' ? c.frame : c.frames[Number(mk.label.slice(5)) - 1];
            expect(mk.answer, `${d.id} ${mk.id}`).toBe(conducts(f.part, c.closed) ? 'on' : 'off');
          } else if (/^Which row (lights|leaves)/.test(mk.label)) {
            const want = mk.label.includes('lights');
            const heads = sc.table!.heads.slice(0, sc.table!.inputs);
            const col = columnOf(sc.circuits[0].part, heads);
            expect(col.filter((v) => v === want).length).toBe(1);
            expect(mk.answer).toBe(`r${col.indexOf(want) + 1}`);
          } else if (mk.label === 'Do they have the same table?') {
            const heads = sc.table!.heads.slice(0, sc.table!.inputs);
            const [c1, c2] = sc.circuits.map((f) => columnOf(f.part, heads));
            expect(mk.answer).toBe(JSON.stringify(c1) === JSON.stringify(c2) ? 'yes' : 'no');
          } else if (/^How many switches must be closed/.test(mk.label)) {
            // Count the fewest closed switches that light the lamp.
            const p = sc.circuits[0].part;
            const heads = names(p);
            const fewest = Math.min(...countRows(heads.length).filter((rr) => conducts(p, closedOf(heads, rr))).map((rr) => rr.filter(Boolean).length));
            expect(mk.answer).toBe(String(fewest));
          } else throw new Error(`${d.id}: a mark this test does not know: ${mk.label}`);
        }
      }
    }
  });

  it('the worked tables on the cards are worked out again', () => {
    for (const l of stop10.lessons) for (const c of l.ideas) {
      if (c.scene?.kind !== 'circuit') continue;
      const sc = c.scene;
      for (const f of sc.circuits) if (f.closed && f.lamp !== undefined && f.lamp !== null) expect(f.lamp, c.title).toBe(conducts(f.part, f.closed));
      const tb = sc.table;
      if (!tb) continue;
      const heads = tb.heads.slice(0, tb.inputs);
      expect(tb.cells.map((r) => r.slice(0, tb.inputs))).toEqual(countRows(heads.length));
      sc.circuits.forEach((f, j) => {
        const col = columnOf(f.part, heads);
        tb.cells.forEach((r, k) => {
          if (r[tb.inputs + j] !== null) expect(r[tb.inputs + j], `${c.title} row ${k + 1}`).toBe(col[k]);
        });
      });
    }
  });

  it('distinctions: one per lesson, a contrast card whose truths are worked out again, and a board right after it', () => {
    const want = { 's10.l1': 'one-vs-all', 's10.l2': 'line-vs-side', 's10.l3': 'closed-vs-lit', 's10.l4': 'looks-vs-works' } as Record<string, string>;
    for (const l of stop10.lessons) {
      expect(l.distinctions?.map((d) => d.id)).toEqual([want[l.id]]);
      const k = l.ideas.findIndex((c) => c.distinction === want[l.id]);
      const card = l.ideas[k];
      expect(card.scene?.kind).toBe('contrast');
      const board = l.drill!.find((d) => d.distinction === want[l.id])!;
      expect(board.afterCard).toBe(k);
      expect(board.scaffold).toBe('full');
      expect(board.confused?.length).toBeGreaterThan(0);
      expect(board.misconceptions?.length).toBeGreaterThan(0);
      const s = card.scene as Extract<Scene, { kind: 'contrast' }>;
      if (l.id === 's10.l4') {
        const heads = ['A', 'B'];
        const same = (pair: typeof SAME_LOOK_DIFF) => JSON.stringify(columnOf(toPart(pair[0], heads), heads)) === JSON.stringify(columnOf(toPart(pair[1], heads), heads));
        expect(s.pairs.map((p) => p.truth)).toEqual([same(SAME_LOOK_DIFF), same(DIFF_LOOK_SAME)]);
        expect(s.pairs.map((p) => p.truth)).toEqual([true, false]);
      } else {
        // Each panel's lamp, from its words: which switches are closed, and whether a line, side by side or a flipper box.
        for (const p of s.pairs) {
          const closed = { A: /Switch A (is )?closed|A is closed/.test(p.world), B: /switch B closed/.test(p.world) };
          const part: CircuitPart = /flipper box/.test(p.world)
            ? { t: 'flip', part: { t: 'switch', name: 'A' } }
            : /alone/.test(p.world)
              ? { t: 'switch', name: 'A' }
              : { t: /Side by side/.test(p.world) ? 'side' : 'line', parts: [{ t: 'switch', name: 'A' }, { t: 'switch', name: 'B' }] };
          expect(p.truth, p.world).toBe(conducts(part, closed));
        }
      }
    }
  });

  it('the mix-ups each board names: one switch as the whole path, a closed switch as a shut door, side by side as a line or as one but not both, the switch as the lamp, looks as the job', () => {
    const board = (id: string) => stop10.lessons.flatMap((l) => l.drill!).find((d) => d.id === id)!;
    const diag = (id: string, wrong: Record<string, string>) => {
      const d = board(id);
      const right = Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]));
      return checkDrill(d, { ...right, ...wrong }).diagnosis;
    };
    expect(diag('s10.l1-do1', { 'c1-lamp': 'on' })).toBe('one-as-all');
    expect(diag('s10.l1-do1', { 'c1-a': 'no' })).toBe('closed-as-shut');
    expect(diag('s10.l1-do1', { 'c3-lamp': 'off' })).toBeUndefined();
    expect(diag('s10.l2-do1', { 'c2-lamp': 'off' })).toBe('side-as-line');
    expect(diag('s10.l2-do1', { 'c3-lamp': 'off' })).toBe('or-one');
    expect(diag('s10.l2-do1', { 'c1-lamp': 'on' })).toBe('line-as-side');
    expect(diag('s10.l3-do1', { 'c2-lamp': 'on' })).toBe('switch-as-lamp');
    expect(diag('s10.l3-do1', { 'c2-a': 'no' })).toBe('flip-changes-switch');
    // The open case of the same mix-up ends with the open case, not the closed one.
    expect(diag('s10.l3-do1', { 'c3-lamp': 'off' })).toBe('switch-as-lamp');
    expect(board('s10.l3-do1').misconceptions!.find((m) => m.picks?.['c3-lamp'] === 'off')!.text).toMatch(/An open switch inside it means the box lets power through\.$/);
    expect(board('s10.l3-do2').misconceptions!.find((m) => m.picks?.['r3-box'] === 'no')!.text).toMatch(/An open switch inside it/);
    expect(diag('s10.l4-do1', { same: 'yes' })).toBe('looks-as-works');
    expect(diag('s10.l4-do2', { same: 'no' })).toBe('looks-differ-as-differ');
    for (const l of stop10.lessons) for (const d of l.drill!) for (const m of d.misconceptions ?? []) expect(m.text.startsWith('You may be treating')).toBe(true);
  });

  it('kid words first; each grown-up word is named on a card of the lesson whose terms list it', () => {
    const terms = Object.fromEntries(stop10.lessons.map((l) => [l.id, (l.terms ?? []).map((t) => t.term)]));
    expect(terms).toEqual({ 's10.l1': ['circuit', 'closed switch', 'open switch', 'series'], 's10.l2': ['parallel'], 's10.l3': ['inverter'], 's10.l4': [] });
    for (const l of stop10.lessons) {
      const text = l.ideas.flatMap((c) => c.body).join(' ').toLowerCase();
      for (const t of l.terms ?? []) {
        expect(text, `${l.id} names ${t.term}`).toContain(t.term);
        if (t.also) expect(text, `${l.id} says ${t.also}`).toContain(t.also);
        expect(t.means).toMatch(/^[A-Z].*\.$/);
      }
    }
    // The grown-up words come after the kid words on their cards.
    const l1 = stop10.lessons[0].ideas.map((c) => c.body.join(' ')).join(' ');
    expect(l1.indexOf('in a line')).toBeLessThan(l1.indexOf('series'));
  });
});

describe('the stop', () => {
  it('the check: 9 items, two from each lesson in order, then the why item; a conflict item on every seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const items = stop10.check!(createRng(seed));
      expect(items.length).toBe(9);
      expect(items.slice(0, 8).map((i) => i.lesson)).toEqual(['s10.l1', 's10.l1', 's10.l2', 's10.l2', 's10.l3', 's10.l3', 's10.l4', 's10.l4']);
      expect(items.filter((i) => i.conflict).length).toBeGreaterThanOrEqual(3);
      expect(items.slice(0, 6).filter((_, k) => k % 2 === 0).every((i) => i.conflict && (i.tags ?? []).length === 1)).toBe(true);
      expect(items[8].tags).toEqual(['why']);
    }
  });

  it('the Arcade gives a valid item from every lesson', () => {
    const lessons = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const it = stop10.practice!(createRng(seed)) as ChooseItem;
      lessons.add(it.lesson);
      expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
    }
    expect([...lessons].sort()).toEqual(['s10.l1', 's10.l2', 's10.l3', 's10.l4']);
  });

  it('new examples after a miss: a lamp question gets one of each lamp, a same-job question one of each answer, a why item a why and then the same idea again, on its skill', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop10.lessons) for (const missed of l.practice(createRng(seed)) as ChooseItem[]) {
        const set = freshCheckSet(stop10, missed, seed);
        expect(set.length, `${missed.id} ${seed}`).toBeGreaterThan(0);
        for (const x of set) expect(x.skill).toBe(missed.skill);
        const lamp = missed.choices.every((c) => c.id === 'on' || c.id === 'off');
        const same = missed.choices.every((c) => c.id === 'yes' || c.id === 'no');
        if (lamp || same) {
          expect(set.length).toBe(2);
          expect(new Set(set.map((x) => (x as ChooseItem).answer)).size).toBe(2);
        }
      }
      const why = stop10.check!(createRng(seed)).slice(-1)[0];
      const set = freshCheckSet(stop10, why, seed);
      expect(set.length).toBe(2);
      expect(set[0].tags).toEqual(['why']);
      for (const x of set) expect([x.lesson, x.skill], `${why.skill} ${seed}`).toEqual([why.lesson, why.skill]);
      // Lessons 1 to 3: then the lesson's trap as a question. Lesson 4: the other kind of why.
      if (why.lesson === 's10.l4') expect(set[1].tags).toEqual(['why']);
      else expect(set[1].conflict && (set[1].tags ?? []).length === 1 && !set[1].tags!.includes('why')).toBe(true);
    }
  });

  it('is in the Journey after Truth Tables and before Proof, with its real-life pack, skill names, and no coming-soon line', () => {
    const i = STOPS.findIndex((s) => s.id === 's10');
    expect(STOPS[i - 1].id).toBe('s9');
    expect(STOPS[i + 1].id).toBe('s11');
    expect(stop10).toMatchObject({ n: 10, id: 's10', title: 'Circuit Lab', ready: true });
    expect(stop10.requires).toBeUndefined();
    expect(stop10.sideTrack).toBeUndefined();
    expect(WORLD.s10).toBe(S10_WORLD);
    expect(SOON_WORLD.s10).toBeUndefined();
    expect(Object.keys(S10_WORLD.lessons)).toEqual(stop10.lessons.map((l) => l.id));
    expect(Object.keys(stop10.skillNames!).sort()).toEqual(['s10.match', 's10.not', 's10.parallel', 's10.series']);
  });

  it('the picture: SVG frames 320 units wide with labels of 15 or 16 units, the table in words, and the same words read aloud', () => {
    const scenes: CircuitData[] = [];
    for (const l of stop10.lessons) {
      for (const c of l.ideas) if (c.scene?.kind === 'circuit') scenes.push(c.scene);
      for (const d of l.drill!) scenes.push(d.scene as CircuitData);
    }
    for (let seed = 1; seed <= 10; seed++) for (const it of stop10.check!(createRng(seed))) if (it.scene?.kind === 'circuit') scenes.push(it.scene);
    for (const sc of scenes) {
      const html = renderToString(h(CircuitPicture, { scene: sc }));
      expect(html.match(/viewBox="0 0 (\d+)/g)!.every((v) => v.endsWith(' 320'))).toBe(true);
      expect((html.match(/<svg/g) ?? []).length).toBe(sc.circuits.length);
      for (const fs of html.match(/font-size="(\d+)"/g) ?? []) expect(Number(/\d+/.exec(fs)![0])).toBeGreaterThanOrEqual(15);
      const lines = circuitSpeech(sc);
      for (const f of sc.circuits) for (const n of names(f.part)) expect(lines.join(' ')).toContain(n);
      if (sc.table) {
        expect(lines.filter((x) => /^(Row|Case) \d+/.test(x)).length).toBe(sc.table.cells.length);
        for (const word of ['Closed', 'Open']) if (sc.table.cells.some((r) => r.slice(0, sc.table!.inputs).includes(word === 'Closed'))) expect(html).toContain(`>${word}<`);
      }
    }
  });

  it('every string reads at grade 7 or lower, sentences of 25 words or fewer, curly quotes only, no symbols, US spelling, never “Wrong”', () => {
    const text: string[] = [];
    const items: Item[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      for (const l of stop10.lessons) items.push(...l.practice(createRng(seed)));
      items.push(...stop10.check!(createRng(seed)), stop10.practice!(createRng(seed)));
    }
    for (const it of items) {
      text.push(it.prompt, it.explain, ...teachStrings(it));
      if (it.kind === 'choose') text.push(...it.choices.map((c) => c.label));
      if (it.scene?.kind === 'circuit') text.push(...circuitSpeech(it.scene));
      if (it.scratch) text.push(it.scratch.title, ...it.scratch.body, ...it.scratch.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])]));
    }
    for (const l of stop10.lessons) {
      for (const c of l.ideas) {
        text.push(c.title, ...c.body);
        if (c.scene?.kind === 'circuit') text.push(...circuitSpeech(c.scene));
        if (c.scene?.kind === 'contrast') text.push(...c.scene.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), c.scene.ask?.q ?? '', c.scene.ask?.a ?? '');
      }
      for (const d of l.drill ?? []) {
        text.push(d.title, ...d.body, d.done, d.twin ?? '', ...d.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]));
        text.push(...(d.misconceptions ?? []).map((m) => m.text), ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]), ...Object.values(d.words ?? {}), ...(d.steps ?? []));
        if (d.scene?.kind === 'circuit') text.push(...circuitSpeech(d.scene));
      }
      for (const t of l.terms ?? []) text.push(t.means);
    }
    text.push(...Object.values(stop10.skillNames!));
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/['"]/);
    expect(all).not.toMatch(/[=+<>&*#@^~|\\→←✓✗×≠]/);
    expect(all).not.toMatch(/\bWrong\b/);
    expect(all).not.toMatch(/\b(colour|favourite|behaviour|centre|realise|organise|grey)\b/i);
  });
});
