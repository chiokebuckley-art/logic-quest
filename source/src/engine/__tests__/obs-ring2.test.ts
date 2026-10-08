/**
 * Ring 2 of the Pattern Observatory, Rule Rise (stop 15): Growing Staircase, Rule Machine, Clock Tower.
 *
 * Every computed answer is checked a second way (tiles built one by one, terms added one jump at a time, a machine
 * brute-forced over the whole numbers, a cycle walked one item at a time), and the ring's acceptance checks are
 * enforced: 1 every sequence item states its rule family; 2 every cycle item says position or elapsed, with exact
 * multiples and the block edges covered; 6 the machine generator knows when two candidates are separable, stated-rule
 * items say "This machine uses one of these two rules.", and reverse tasks state the domain and are one-to-one.
 */
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { stop15 } from '../../content/stop15';
import { S15_WORLD } from '../../content/world/s15';
import { checkDrill, marksToTap } from '../drill';
import { grade } from '../grade';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { feedbackText, teachStrings } from '../teach';
import type { ChooseItem, DrillStep, IdeaCard, Item, NumberItem, Scene } from '../types';
import {
  CONSTRUCTIONS, PAIRS, farItem, growCount, jumpItem, shrinkItem, stairCells, stairCount, termAt,
} from '../puzzles/observatory/growth';
import {
  ADD2_DOUBLE, WHOLE, agreeInputs, apply, backItem, fillItem, fitting, identifyItem, inputsFor, linearPairs, ruleWords, separateItem, separates, separatingInput,
  squarePairs, type Rule,
} from '../puzzles/observatory/machines';
import {
  CHAINS, WEEKDAYS, countIn, countItem, elapsedItem, groupsItem, itemAfter, itemAtPosition, lastDigit, placeOf, positionItem, walkElapsed, walkPosition,
} from '../puzzles/observatory/cycles';
import { ObservatoryScene } from '../../game/components/scenes/ObservatoryScene';
import { observatorySpeech } from '../../game/components/scenes/speech';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const L = { stair: 's15.l1', machine: 's15.l2', clock: 's15.l3' } as const;

/** Every item the ring can show, by where it comes from. */
function everyItem(seed: number): { where: string; item: Item }[] {
  const rng = () => createRng(seed);
  const out: { where: string; item: Item }[] = [];
  for (const l of stop15.lessons) {
    l.practice(rng()).forEach((item) => out.push({ where: `${l.id} practice`, item }));
    for (const lv of [1, 2, 3] as const) l.practiceAt!(rng(), lv).forEach((item) => out.push({ where: `${l.id} L${lv}`, item }));
    for (const st of [1, 2, 3] as const) l.review!(rng(), st).forEach((item) => out.push({ where: `${l.id} review ${st}`, item }));
    l.independent!(rng()).forEach((item) => out.push({ where: `${l.id} independent`, item }));
    (l.primer?.(rng()) ?? []).forEach((item) => out.push({ where: `${l.id} primer`, item }));
  }
  stop15.check!(rng()).forEach((item) => out.push({ where: 'check', item }));
  out.push({ where: 'arcade', item: stop15.practice!(rng()) });
  for (const t of [1, 2, 3, 4] as const) for (const lv of [1, 2, 3, 4] as const) {
    const d = stop15.observatory!.diagnostic!(rng(), t, lv);
    if (d) out.push({ where: `diagnostic ${t}/${lv}`, item: d });
  }
  return out;
}

// ---------- reading the generated items back (for the second methods) ----------

const num = (s: string) => Number(s);
function parseRule(words: string): Rule {
  let m: RegExpMatchArray | null;
  if (words === 'double') return { t: 'times', k: 2 };
  if (words === 'times itself') return { t: 'square' };
  if ((m = words.match(/^add (\d+)$/))) return { t: 'add', k: num(m[1]) };
  if ((m = words.match(/^times (\d+)$/))) return { t: 'times', k: num(m[1]) };
  if ((m = words.match(/^times (\d+), then add (\d+)$/))) return { t: 'timesAdd', a: num(m[1]), b: num(m[2]) };
  if ((m = words.match(/^times (\d+), then take away (\d+)$/))) return { t: 'timesSub', a: num(m[1]), b: num(m[2]) };
  throw new Error(`unknown rule words: ${words}`);
}
const label = (it: ChooseItem, id: string) => it.choices.find((c) => c.id === id)!.label;

/** The answer worked out again, a second way, from what the item shows. Returns null when the skill has no recheck. */
function recheck(item: Item): boolean | null {
  const sc = item.scene;
  const skill = item.skill.replace('s15.', '');
  if (item.kind === 'number' && sc?.kind === 'staircase' && skill === 'stair-far') {
    const c = Object.values(CONSTRUCTIONS).find((x) => x.says === sc.construction)!;
    const n = sc.table![sc.table!.length - 1].step;
    // Tile by tile: build step n's cells and count them.
    return stairCells(c, n).length === item.answer;
  }
  if (item.kind === 'number' && sc?.kind === 'staircase' && (skill === 'constant-jump' || skill === 'stair-shrink')) {
    const t = sc.table!;
    const jump = t[1].count! - t[0].count!;
    const n = t[t.length - 1].step;
    let v = t[0].count!;
    for (let k = 2; k <= n; k++) v += jump; // one jump at a time
    if (item.prompt.includes('What is the next term?')) return item.answer === t[t.length - 2].count! + jump;
    return v === item.answer;
  }
  if (item.kind === 'number' && sc?.kind === 'staircase' && skill === 'grow-transfer') {
    // Walk from the drawn rows: the growth per step is constant; add it step by step.
    const counts = sc.rows.map((r) => r.cells.length);
    const d = counts[1] - counts[0];
    expect(counts[2] - counts[1]).toBe(d);
    let v = counts[0];
    const n = sc.table![sc.table!.length - 1].step;
    for (let k = 2; k <= n; k++) v += d;
    return v === item.answer;
  }
  if (item.kind === 'choose' && skill === 'stair-why') {
    const n = num(item.prompt.match(/step (\d+) have/)![1]);
    return label(item, item.answer).startsWith(`${stairCells(PAIRS, n).length}:`);
  }
  if (item.kind === 'number' && sc?.kind === 'machine' && skill === 'machine-fill') {
    // From two table rows: the slope and the start of a straight-line rule, then the asked input.
    const [r1, r2, ask] = sc.rows;
    const slope = r2.output! - r1.output!;
    return r1.output! + slope * (ask.input! - r1.input!) === item.answer;
  }
  if (item.kind === 'number' && sc?.kind === 'machine' && skill === 'machine-back') {
    const r = parseRule(sc.rule!);
    const ins = inputsFor(r, sc.rows[0].output!);
    return ins.length === 1 && ins[0] === item.answer;
  }
  if (item.kind === 'choose' && sc?.kind === 'machine' && (skill === 'separate' || skill === 'machine-why' || skill === 'machine-which')) {
    const [a, b] = sc.candidates!.map(parseRule);
    if (skill === 'separate') {
      const pick = num(label(item, item.answer));
      if (!separates(a, b, pick)) return false;
      // No other offered input separates them.
      for (const c of item.choices) {
        const m = c.label.match(/^(\d+)( again)?$/);
        if (c.id !== item.answer && m && separates(a, b, num(m[1]))) return false;
      }
      return true;
    }
    if (skill === 'machine-why') return agreeInputs(a, b, [sc.rows[0].input!]).length === 1;
    const rows = sc.rows.map((r) => ({ input: r.input!, output: r.output! }));
    const fits = (['a', 'b'] as const).filter((k) => rows.every((r) => apply(k === 'a' ? a : b, r.input) === r.output));
    return fits.length === 2 ? item.answer === 'cant' : label(item, item.answer) === ruleWords(fits[0] === 'a' ? a : b);
  }
  if (item.kind === 'choose' && skill === 'test-setting' && sc?.kind === 'machine') {
    // The ideas are times m and add k: rebuild them from the prompt and test both settings.
    const m = Number(item.prompt.match(/ (\d+) times /)![1]);
    const k = Number(item.prompt.match(/ plus (\d+) /)![1]);
    const [x0, X] = [sc.rows[0].input!, sc.rows[1].input!];
    const says = item.prompt.match(/idea A says (\d+) and idea B says (\d+)/)!;
    return m * x0 === x0 + k && m * X !== X + k && Number(says[1]) === m * X && Number(says[2]) === X + k && /\d+/.exec(label(item, item.answer))![0] === String(X);
  }
  if (item.kind === 'choose' && sc?.kind === 'clock' && (skill === 'cycle-position' || (skill === 'cycle-transfer' && !item.prompt.startsWith('Start at')))) {
    return walkPosition(sc.cycle, sc.n!).toLowerCase() === label(item, item.answer).toLowerCase();
  }
  if (item.kind === 'choose' && skill === 'cycle-transfer' && item.prompt.startsWith('Start at')) {
    const base = BigInt(item.prompt.match(/^Start at (\d+)/)![1]);
    const n = BigInt(item.prompt.match(/number (\d+)\?$/)![1]);
    return String(base ** n % 10n) === label(item, item.answer);
  }
  if (item.kind === 'choose' && sc?.kind === 'clock' && skill === 'cycle-elapsed') {
    return walkElapsed(sc.cycle, sc.cycle.indexOf(sc.start!), sc.n!) === label(item, item.answer);
  }
  if (item.kind === 'number' && sc?.kind === 'clock' && skill === 'cycle-count') {
    const t = item.prompt.match(/does (?:the )?(\S+) show up/)![1];
    let c = 0;
    for (let p = 1; p <= sc.n!; p++) if (walkPosition(sc.cycle, p) === t) c++;
    return c === item.answer;
  }
  if (item.kind === 'choose' && skill === 'cycle-why') {
    const n = num(item.prompt.match(/^Item (\d+)/)![1]);
    const cycle = (sc as Extract<Scene, { kind: 'clock' }>).cycle;
    return label(item, item.answer).includes(walkPosition(cycle, n));
  }
  if (item.kind === 'choose' && skill === 'rule-test' && sc?.kind === 'things') {
    const rule = item.prompt.match(/Every card is (?:a )?(\w+)\./)![1];
    const card = sc.things[sc.things.length - 1];
    const fits = card.color === rule || card.shape === rule || card.size === rule;
    return item.answer === (fits ? 'keep' : 'out');
  }
  if (item.kind === 'number' && skill === 'groups') {
    const [, N, k] = item.prompt.match(/Put (\d+) counters into groups of (\d+)/)!.map(Number);
    let left = N, groups = 0;
    while (left >= k) { left -= k; groups++; } // repeated taking away
    return item.answer === (item.prompt.includes('whole groups') ? groups : left);
  }
  return null;
}

// ---------- every kid-facing string ----------

function sceneText(s: Scene | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  if ('steps' in s) for (const st of s.steps ?? []) out.push(st.label, st.say);
  if (s.kind === 'staircase') out.push(s.construction, ...(s.head ?? []), ...(s.rowName ?? []), s.jump ?? '', s.tag ?? '');
  if (s.kind === 'machine') out.push(s.stated ?? '', s.rule ?? '', ...(s.candidates ?? []));
  if (s.kind === 'clock') out.push(...s.cycle, ...(s.captions ?? []), s.start ?? '', ...(s.pair ? [...s.pair.cycle, ...(s.pair.captions ?? [])] : []));
  if (s.kind === 'text') out.push(...s.lines);
  return out.filter(Boolean);
}
function itemText(it: Item): string[] {
  const out = [it.prompt, it.explain, ...teachStrings(it), ...(it.hints ?? []), it.frame ?? '', ...sceneText(it.scene)];
  if (it.kind === 'choose') out.push(...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
  if (it.kind === 'number') for (const fb of Object.values(it.feedback ?? {})) out.push(fb.headline, ...fb.detail);
  return out.filter(Boolean);
}
const boardText = (b: DrillStep): string[] => [b.title, ...b.body, b.done, b.twin ?? '', ...(b.steps ?? []), b.stepsLabel ?? '', ...b.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why)])]), ...sceneText(b.scene)].filter(Boolean);
const cardText = (c: IdeaCard): string[] => [c.title, ...c.body, ...sceneText(c.scene)];
const worldText = (): string[] => [S15_WORLD.stop, ...Object.values(S15_WORLD.lessons).flatMap((l) => [l.why, ...l.uses.flatMap((u) => [u.who, u.text])]), ...Object.values(S15_WORLD.skills).flat()];

/** Symbols a kid has not been taught, and straight quotes. Hyphens in words are fine; a minus sign is not (nor a negative number). */
const SYMBOLS = /[=+×÷−→✓<>*]|\s-\s|\d\s*\/\s*\d|(^|[^\w])-\d/;

// =====================================================================================================
// Generators, checked a second way
// =====================================================================================================

describe('Growing Staircase: counts come from the construction', () => {
  it('every construction’s count matches the tiles built one by one, and each step adds exactly one group', () => {
    for (const c of Object.values(CONSTRUCTIONS)) {
      for (let n = 1; n <= 60; n++) {
        const cells = stairCells(c, n);
        expect(cells.length, `${c.id} step ${n}`).toBe(stairCount(c, n));
        expect(cells.filter((x) => x === 'new').length, `${c.id} step ${n} new`).toBe(c.per);
        expect(stairCount(c, n + 1) - stairCount(c, n)).toBe(c.per);
      }
    }
    // The handoff's numbers: step 10 has 21, step 12 has 25, step 15 has 31.
    expect([10, 12, 15].map((n) => stairCount(PAIRS, n))).toEqual([21, 25, 31]);
  });
  it('a constant-addition term is the first term plus n take away 1 jumps, added one at a time', () => {
    for (let a = 0; a <= 9; a++) for (let d = 1; d <= 6; d++) {
      let v = a;
      for (let n = 1; n <= 30; n++) {
        expect(termAt(a, d, n)).toBe(v);
        v += d;
      }
    }
    expect(termAt(5, 3, 10)).toBe(32);
  });
  it('the transfer contexts: a necklace is 1 clasp plus 2 beads a link; joined tables seat 4 plus 2 a table', () => {
    for (let n = 1; n <= 30; n++) {
      expect(growCount('necklace', n)).toBe(1 + n * 2);
      let seats = 4;
      for (let t = 2; t <= n; t++) seats += 2;
      expect(growCount('chairs', n)).toBe(seats);
    }
  });
  it('the faded frame is the handoff’s sentence, and its wrong numbers name the slip (pairs only is off by one)', () => {
    const it12 = farItem(PAIRS, 12, { framed: true });
    expect(it12.frame).toBe('Step 12 has 1 center tile and 12 pairs, so it has ___ tiles.');
    expect(it12.answer).toBe(25);
    expect(it12.digits).toBe(2);
    const it15 = farItem(PAIRS, 15);
    expect(it15.prompt).toContain('How many tiles at step 15?');
    expect(it15.answer).toBe(31);
    expect(it15.errorTags?.['30']).toBe('off-by-one');
    expect(it15.errorTags?.['45']).toBe('add-vs-multiply');
    expect(it15.errorTags?.['9']).toBe('local-only');
    const jump = jumpItem(5, 3, 10);
    expect(jump.prompt).toBe('Under a constant-addition rule, the first term is 5 and the jump is 3. What is term 10?');
    expect(jump.answer).toBe(32);
    expect(jump.errorTags?.['35']).toBe('off-by-one');
    const shrink = shrinkItem(31, 10);
    let v = 31;
    for (let k = 2; k <= 10; k++) v -= 2;
    expect(shrink.answer).toBe(v);
  });
});

describe('Rule Machine: separable candidates (acceptance check 6)', () => {
  const PAIRS_ALL = [...linearPairs(), ...squarePairs(), ADD2_DOUBLE];
  it('every pair’s agreeing inputs are exactly what brute force over the whole numbers 0 to 40 finds', () => {
    for (const p of PAIRS_ALL) expect(agreeInputs(p.a, p.b, WHOLE), `${ruleWords(p.a)} / ${ruleWords(p.b)}`).toEqual(p.agreeAt);
    expect(linearPairs().every((p) => p.agreeAt.length === 1)).toBe(true);
    expect(squarePairs().every((p) => p.agreeAt.length === 2)).toBe(true);
  });
  it('a separating input is never one where the rules agree, and neither rule goes below 0 there (whole numbers)', () => {
    for (const p of PAIRS_ALL) for (const seed of SEEDS) {
      const x = separatingInput(p, createRng(seed), p.agreeAt);
      expect(separates(p.a, p.b, x)).toBe(true);
      expect(p.agreeAt).not.toContain(x);
      expect(apply(p.a, x), `${ruleWords(p.a)} at ${x}`).toBeGreaterThanOrEqual(0);
      expect(apply(p.b, x), `${ruleWords(p.b)} at ${x}`).toBeGreaterThanOrEqual(0);
    }
  });
  it('a separating-input item: the right choice separates, every input choice where the rules agree is wrong, and the agreeing input is tagged first-rule', () => {
    for (const p of PAIRS_ALL) for (const seed of SEEDS.slice(0, 10)) {
      for (const framed of [false, true]) {
        const it = separateItem(p, createRng(seed), { framed });
        expect(it.prompt).toContain('This machine uses one of these two rules.');
        expect(separates(p.a, p.b, Number(label(it, it.answer)))).toBe(true);
        for (const c of it.choices) {
          const m = c.label.match(/^(\d+)( again)?$/);
          if (m && c.id !== it.answer) {
            expect(separates(p.a, p.b, Number(m[1])), c.label).toBe(false);
            expect(it.errorTags?.[c.id], `${c.label} is an agreeing input`).toBe('first-rule');
          }
        }
        expect(it.errorTags?.again).toBe('first-rule');
        // The faded frame reads "Feed ___ next.", so only inputs can fill its blank.
        if (framed) {
          expect(it.frame).toMatch(/___/);
          expect(it.choices.every((c) => /^\d+( again)?$/.test(c.label)), it.choices.map((c) => c.label).join(' / ')).toBe(true);
        }
      }
    }
  });
  it('identify: the answer is the one rule that fits every row, or “Can’t tell yet” when only the agreeing row is shown', () => {
    for (const p of PAIRS_ALL) for (const truth of ['a', 'b'] as const) {
      const xs = separatingInput(p, createRng(3), p.agreeAt);
      const it = identifyItem(p, truth, xs);
      expect(it.prompt).toContain('This machine uses one of these two rules.');
      expect(it.answer).toBe(truth);
      expect(it.errorTags?.[truth === 'a' ? 'b' : 'a']).toBe('first-rule');
      const rows = (it.scene as Extract<Scene, { kind: 'machine' }>).rows.map((r) => ({ input: r.input!, output: r.output! }));
      expect(fitting(p, rows)).toEqual([truth]);
      const cant = identifyItem(p, truth, xs, { decided: false });
      expect(cant.answer).toBe('cant');
    }
  });
  it('reverse tasks state the whole-number domain and use only one-to-one rules: every output has exactly one input', () => {
    for (let a = 2; a <= 5; a++) for (let b = 1; b <= 6; b++) for (let x = 0; x <= 40; x++) {
      const r: Rule & { t: 'timesAdd' } = { t: 'timesAdd', a, b };
      expect(inputsFor(r, apply(r, x))).toEqual([x]);
      if (x < 3 || x > 12) continue;
      const it = backItem(r, x);
      expect(it.prompt).toMatch(/whole numbers/);
      expect(it.answer).toBe(x);
    }
    // The handoff's case: times 2, then add 1, out came 17: 8 went in; 9 is the undo-order slip.
    const it = backItem({ t: 'timesAdd', a: 2, b: 1 }, 8, { framed: true });
    expect(it.answer).toBe(8);
    expect(it.errorTags?.['9']).toBe('undo-order');
    expect(it.frame).toBe('Take away 1 first: 16. Then 2 times ___ makes 16.');
  });
});

describe('Hints: the worked twin is never the question itself', () => {
  it('fill, count and grouping items move their twin off the asked input, count or group', () => {
    for (let a = 2; a <= 5; a++) for (let b = 1; b <= 6; b++) for (let x = 4; x <= 12; x++) {
      const it = fillItem({ t: 'timesAdd', a, b }, x);
      expect(it.hintCase!.label, `fill ${x}`).not.toMatch(new RegExp(`input ${x}\\.`));
    }
    for (const c of CHAINS) for (let j = 0; j < c.items.length; j++) for (let N = 2 * c.items.length; N <= 40; N++) {
      const it = countItem(c, j, N);
      expect(it.hintCase!.label, `count ${N}`).not.toBe(`A worked twin: the first ${N} items.`);
    }
    for (let k = 3; k <= 6; k++) for (let N = 9; N <= 21; N++) for (const ask of ['groups', 'left'] as const) {
      const it = groupsItem(N, k, ask);
      expect(it.hintCase!.label, `groups ${N} by ${k}`).not.toBe(`A worked twin: ${N} counters in groups of ${k}.`);
      const [, n2, g, l] = it.hintCase!.label.match(/(\d+) counters in groups of (\d+)/)!.concat(it.hintCase!.note!.match(/(\d+) left over/)![1]).map(Number);
      expect(n2 - 2 * g, 'the twin’s left-over is worked right').toBe(l);
    }
  });
});

describe('Clock Tower: positions from 1, elapsed steps from 0 (acceptance check 2)', () => {
  it('the place of item n matches a walk through the cycle, for every block size and n up to 120', () => {
    for (let k = 2; k <= 7; k++) {
      const cycle = Array.from({ length: k }, (_, i) => `x${i}`);
      for (let n = 1; n <= 120; n++) {
        expect(itemAtPosition(cycle, n)).toBe(walkPosition(cycle, n));
        expect(placeOf(n, k)).toBe(((n - 1) % k) + 1);
        for (let s = 0; s < k; s++) expect(itemAfter(cycle, s, n)).toBe(walkElapsed(cycle, s, n));
      }
    }
  });
  it('exact multiples and the edges: n = k, k plus 1, 2k and a zero remainder, both ways of counting', () => {
    for (const c of CHAINS) {
      const items = c.items as readonly string[];
      const k = items.length;
      const last = items[k - 1], first = items[0];
      expect(itemAtPosition(items, k)).toBe(last);
      expect(itemAtPosition(items, k + 1)).toBe(first);
      expect(itemAtPosition(items, 2 * k)).toBe(last);
      expect(itemAtPosition(items, 2 * k + 1)).toBe(first);
      for (let m = 1; m <= 30; m++) expect(itemAtPosition(items, m * k), 'zero remainder is the last item').toBe(last);
      // As items: the zero-remainder trap is tagged, and the first item is the tagged wrong pick.
      for (const n of [k, k + 1, 2 * k, 10 * k]) {
        const it = positionItem(c, n, createRng(n));
        expect(label(it, it.answer)).toBe(itemAtPosition(items, n));
        expect(it.prompt).toContain('the first item is position 1');
        if (n % k === 0) {
          expect(it.tags).toContain('zero-remainder');
          expect(it.errorTags?.[first.toLowerCase()]).toBe('zero-remainder');
        }
      }
    }
    for (let s = 0; s < 7; s++) {
      expect(itemAfter(WEEKDAYS, s, 7)).toBe(WEEKDAYS[s]);
      expect(itemAfter(WEEKDAYS, s, 8)).toBe(WEEKDAYS[(s + 1) % 7]);
      expect(itemAfter(WEEKDAYS, s, 14)).toBe(WEEKDAYS[s]);
      expect(itemAfter(WEEKDAYS, s, 21)).toBe(WEEKDAYS[s]);
      const it = elapsedItem('days', s, 21, createRng(s));
      expect(label(it, it.answer)).toBe(WEEKDAYS[s]);
      expect(it.prompt).toMatch(/is day 0/);
      expect(it.errorTags?.[WEEKDAYS[(s + 6) % 7].toLowerCase()]).toBe('elapsed-vs-position');
    }
    // The handoff's pair: item 40 of A, B, C, D is D, but 21 days after Thursday is Thursday.
    expect(itemAtPosition(['A', 'B', 'C', 'D'], 40)).toBe('D');
    expect(itemAfter(WEEKDAYS, 3, 21)).toBe('Thursday');
    // A desk rota A, B, B: slot 15 ends the fifth block, so B.
    expect(itemAtPosition(['A', 'B', 'B'], 15)).toBe('B');
    // The faded frame: 99 is 33 times 3, so position 100 starts a new block.
    const faded = positionItem(CHAINS[0], 100, createRng(1), { framed: true });
    expect(faded.frame).toBe('99 is 33 times 3, so position 100 starts a new cycle: the item is ___.');
    expect(label(faded, faded.answer)).toBe('A');
  });
  it('counts and last digits match brute force', () => {
    for (let k = 2; k <= 5; k++) for (let j = 0; j < k; j++) for (let N = 1; N <= 60; N++) {
      let c = 0;
      for (let p = 1; p <= N; p++) if (placeOf(p, k) === j + 1) c++;
      expect(countIn(k, j, N)).toBe(c);
    }
    for (const b of [2, 3, 7]) for (let n = 1; n <= 60; n++) expect(lastDigit(b, n)).toBe(Number(BigInt(b) ** BigInt(n) % 10n));
    expect([1, 2, 3, 4].map((n) => lastDigit(3, n))).toEqual([3, 9, 7, 1]);
  });
});

// =====================================================================================================
// Every place: cards, boards and items for seeds 1-40
// =====================================================================================================

describe('Rule Rise: the places, their cards and boards', () => {
  it('three places in order, with the routine, track, levels, plain label, requirements and primers the handoff gives', () => {
    expect(stop15.ready).toBe(true);
    expect(stop15.requires).toEqual([]);
    expect(stop15.lessonOrder).toBe('free');
    const [l1, l2, l3] = stop15.lessons;
    expect([l1.id, l2.id, l3.id]).toEqual(['s15.l1', 's15.l2', 's15.l3']);
    expect([l1.title, l2.title, l3.title]).toEqual(['Growing Staircase', 'Rule Machine', 'Clock Tower']);
    expect([l1.track, l2.track, l3.track]).toEqual([2, 2, 1]);
    expect([l1.levels, l2.levels, l3.levels]).toEqual([[1, 3], [2, 3], [3, 3]]);
    expect([l1.requires, l2.requires, l3.requires]).toEqual([[], ['s15.l1', 's2.l5'], ['s14.l1']]);
    expect(l1.primer).toBeUndefined();
    for (const l of stop15.lessons) {
      expect(l.routine).toBe(true);
      expect(['Growth rules', 'Functions', 'Cycles']).toContain(l.plain);
      expect(l.ideas.length).toBeGreaterThanOrEqual(3);
      expect(l.ideas.length).toBeLessThanOrEqual(7);
    }
    for (const seed of SEEDS) {
      const p2 = l2.primer!(createRng(seed));
      expect(p2).toHaveLength(3);
      expect(p2.every((x) => x.kind === 'choose' && x.skill === 's15.rule-test')).toBe(true);
      expect(new Set(p2.map((x) => (x as ChooseItem).answer))).toEqual(new Set(['keep', 'out']));
      const p3 = l3.primer!(createRng(seed));
      expect(p3).toHaveLength(3);
      expect(p3.every((x) => x.kind === 'number' && x.skill === 's15.groups')).toBe(true);
    }
  });

  it('See: every place has a stepped scene that states its rule or construction', () => {
    for (const l of stop15.lessons) {
      const stepped = l.ideas.filter((c) => c.scene && 'steps' in c.scene && (c.scene.steps?.length ?? 0) > 0);
      expect(stepped.length, l.id).toBeGreaterThanOrEqual(3);
      for (const c of stepped) {
        const s = c.scene!;
        if (s.kind === 'staircase') {
          expect(s.construction.length).toBeGreaterThan(10);
          if (s.reveal) expect(s.reveal.length, `${c.title} reveal`).toBe(s.steps!.length + 1);
        }
        if (s.kind === 'machine') expect(Boolean(s.stated || s.rule)).toBe(true);
      }
    }
    // The Growing Staircase opens on steps 1 to 4 with each new pair marked new, and the table filling in.
    const build = stop15.lessons[0].ideas[0].scene as Extract<Scene, { kind: 'staircase' }>;
    expect(build.rows.map((r) => r.step)).toEqual([1, 2, 3, 4]);
    expect(build.rows.every((r) => r.cells.filter((x) => x === 'new').length === 2)).toBe(true);
    expect(build.reveal!.map((r) => r.table)).toEqual([1, 2, 3, 4, 4]);
    // The Rule Machine opens on 2 gives 4 with add 2 and double both lit.
    const two = stop15.lessons[1].ideas[0].scene as Extract<Scene, { kind: 'machine' }>;
    expect(two.rows[0]).toMatchObject({ input: 2, output: 4 });
    expect(two.candidates).toEqual(['add 2', 'double']);
    // The Clock Tower shows both ways of counting side by side.
    expect(stop15.lessons[2].ideas.some((c) => c.scene?.kind === 'clock' && c.scene.pair && c.scene.counting !== c.scene.pair.counting)).toBe(true);
  });

  it('Do: the first board is full scaffold, every wrong option has words, and the right marks pass', () => {
    for (const l of stop15.lessons) {
      expect(l.drill?.[0].scaffold, l.id).toBe('full');
      for (const b of l.drill!) {
        for (const m of marksToTap(b)) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id], `${b.id} ${m.id} ${o.id}`).toBeTruthy();
        expect(checkDrill(b, Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]))).done).toBe(true);
        const seen = l.ideas.map((c) => JSON.stringify(c.scene ?? null));
        expect(seen.includes(JSON.stringify(b.scene)) || !!b.twin, `${b.id} is a card’s board or says what changed`).toBe(true);
      }
    }
  });

  it('the pictures render at every reveal step, and their read-aloud has no symbols', () => {
    const scenes: Scene[] = [];
    for (const l of stop15.lessons) {
      for (const c of l.ideas) if (c.scene) scenes.push(c.scene);
      for (const b of l.drill ?? []) if (b.scene) scenes.push(b.scene);
    }
    for (const seed of SEEDS.slice(0, 5)) for (const { item } of everyItem(seed)) if (item.scene) scenes.push(item.scene);
    for (const s of scenes) {
      if (s.kind !== 'staircase' && s.kind !== 'machine' && s.kind !== 'clock') continue;
      const n = s.steps?.length ?? 0;
      for (let r = 0; r <= n; r++) {
        const html = renderToString(h(ObservatoryScene, { scene: s, revealed: r }));
        expect(html.length).toBeGreaterThan(50);
        for (const line of observatorySpeech(s, r)) {
          expect(line, line).not.toMatch(SYMBOLS);
          expect(line, line).not.toMatch(/['"]/);
          expect(line).not.toMatch(/undefined|null|NaN/);
        }
      }
    }
  });
});

describe('Rule Rise: every item, seeds 1 to 40', () => {
  it('every item has the contract’s shape: meta, phase, level, error tags, twin, hint sequence and a marked hint case', () => {
    for (const seed of SEEDS) {
      for (const { where, item } of everyItem(seed)) {
        const at = `${where} ${item.id} ${item.skill}`;
        expect(item.stop, at).toBe(15);
        expect(stop15.lessons.map((l) => l.id), at).toContain(item.lesson);
        expect(item.skill, at).toMatch(/^s15\.[a-z-]+$/);
        expect(stop15.skillNames?.[item.skill], at).toBeTruthy();
        const meta = item.meta!;
        expect(meta, at).toBeDefined();
        for (const k of ['skill', 'rule', 'task', 'representation', 'twin'] as const) expect(meta[k], `${at} meta.${k}`).toBeTruthy();
        expect(meta.phase, at).toBe(item.phase);
        expect(meta.twin, at).toBe(item.twin);
        expect([1, 2, 3, 4, 5], at).toContain(meta.difficulty);
        expect([1, 2, 3, 4], at).toContain(item.level);
        expect(meta.answerType, at).toBe(item.kind === 'number' ? 'number' : 'categorical');
        expect(new Set(meta.tags), at).toEqual(new Set(Object.values(item.errorTags ?? {})));
        expect(item.hints?.length, at).toBeGreaterThanOrEqual(2);
        expect(item.hint, at).toBe(item.hints![0]);
        expect(item.hintCase?.label, at).toBeTruthy();
        const t = item.teach!;
        expect(t.rule && t.terms?.length && t.cases?.length && t.remember?.length && t.simpler?.length, at).toBeTruthy();
        if (item.phase === 'explain') {
          expect(item.rubric, at).toBeGreaterThanOrEqual(2);
          expect(meta.rubric, at).toBeTruthy();
        }
        if (item.frame) expect(item.frame, at).toMatch(/___/);
        if (item.kind === 'choose') {
          expect(item.choices.length, at).toBeGreaterThanOrEqual(2);
          expect(item.choices.length, at).toBeLessThanOrEqual(5);
          for (const c of item.choices) if (c.id !== item.answer) {
            const fb = item.feedback?.[c.id];
            expect(fb?.headline && fb.detail.length, `${at} ${c.id}`).toBeTruthy();
            expect(item.whyWrong?.[c.id], `${at} ${c.id}`).toBe(feedbackText(fb!));
            expect(fb!.headline, `${at} ${c.id}: never only “try again”`).not.toMatch(/^(try again|wrong)/i);
          }
          for (const k of Object.keys(item.errorTags ?? {})) expect(item.choices.some((c) => c.id === k && c.id !== item.answer), `${at} tag ${k}`).toBe(true);
        }
        if (item.kind === 'number') {
          expect(Number.isInteger(item.answer) && item.answer >= 0, at).toBe(true);
          expect(String(item.answer).length, at).toBeLessThanOrEqual(item.digits ?? 3);
          expect(item.feedback?.[String(item.answer)], `${at}: no feedback for the right answer`).toBeUndefined();
          for (const [k, fb] of Object.entries(item.feedback ?? {})) {
            expect(item.whyWrong?.[k], at).toBe(feedbackText(fb));
            expect(grade(item, { kind: 'number', value: Number(k) }).correct, at).toBe(false);
          }
          for (const k of Object.keys(item.errorTags ?? {})) expect(item.feedback?.[k], `${at} tag ${k}`).toBeDefined();
          expect(grade(item, { kind: 'number', value: item.answer }).correct).toBe(true);
        }
        const again = recheck(item);
        expect(again, `${at}: a second method`).not.toBeNull();
        expect(again, `${at}: the second method disagrees`).toBe(true);
      }
    }
  });

  it('every pack is explain, then do (a faded frame first, then the same task with no frame), then transfer, with the trap item', () => {
    for (const l of stop15.lessons) {
      const trap = l.pass!.include![0].tag;
      for (const seed of SEEDS) {
        const packs = [l.practice(createRng(seed)), ...([1, 2, 3] as const).map((lv) => l.practiceAt!(createRng(seed), lv))];
        for (const pack of packs) {
          expect(pack.length).toBeGreaterThanOrEqual(3);
          expect(pack.length).toBeLessThanOrEqual(5);
          const phases = pack.map((x) => x.phase);
          expect(phases[0], `${l.id} seed ${seed}`).toBe('explain');
          expect(phases[phases.length - 1]).toBe('transfer');
          const order = { explain: 0, do: 1, transfer: 2, review: 3 } as const;
          expect(phases.map((p) => order[p!])).toEqual([...phases.map((p) => order[p!])].sort());
          const dos = pack.filter((x) => x.phase === 'do');
          expect(dos[0].frame, `${l.id} seed ${seed}: the first do item is faded`).toMatch(/___/);
          expect(dos[1].frame, `${l.id} seed ${seed}: then the same task unframed`).toBeUndefined();
          expect(dos[1].skill).toBe(dos[0].skill);
          expect(pack.some((x) => x.tags?.includes(trap)), `${l.id} seed ${seed} has ${trap}`).toBe(true);
          // A transfer item uses new materials or a new context, not only a new colour.
          const tr = pack.find((x) => x.phase === 'transfer')!;
          expect(tr.meta!.representation).not.toBe(dos[0].meta!.representation);
        }
        expect(l.practice(createRng(seed))).toEqual(l.practice(createRng(seed)));
      }
    }
  });

  it('the planned packs keep the handoff’s worked numbers: step 10 explained, add 2 and double at 2, item 40 and 21 days', () => {
    const [l1, l2, l3] = stop15.lessons;
    const why1 = l1.practice(createRng(1))[0] as ChooseItem;
    expect(why1.prompt).toContain('step 10');
    expect(label(why1, why1.answer)).toMatch(/^21: 1 center tile and 10 pairs/);
    expect(why1.errorTags).toMatchObject({ adds: 'local-only', nocenter: 'off-by-one' });
    const why2 = l2.practice(createRng(1))[0] as ChooseItem;
    expect(why2.prompt).toContain('add 2, or double. Feeding 2 gave 4.');
    expect(label(why2, why2.answer)).toBe('Both rules give 4 for 2, so the output can’t pick one.');
    const why3 = l3.practice(createRng(1))[0] as ChooseItem;
    expect(why3.prompt).toMatch(/^Item 40 of A, B, C and D/);
    expect(why3.prompt).toContain('21 days after Thursday is Thursday');
  });

  it('review gives 4 fresh items; the independent check gives 6 with an error-tagged item and an explain item (acceptance check 5)', () => {
    for (const l of stop15.lessons) for (const seed of SEEDS) {
      for (const st of [1, 2, 3] as const) {
        const r = l.review!(createRng(seed), st);
        expect(r).toHaveLength(4);
        expect(r.every((x) => x.phase === 'review' && x.meta?.phase === 'review')).toBe(true);
        expect(new Set(r.map((x) => x.id)).size).toBe(4);
      }
      const ind = l.independent!(createRng(seed));
      expect(ind).toHaveLength(6);
      expect(ind.some((x) => Object.keys(x.errorTags ?? {}).length > 0)).toBe(true);
      expect(ind.some((x) => x.phase === 'explain')).toBe(true);
      expect(ind.some((x) => x.phase === 'transfer')).toBe(true);
      expect(ind.every((x) => !x.frame)).toBe(true);
      expect(new Set(ind.map((x) => JSON.stringify([x.prompt, x.scene]))).size).toBe(6);
    }
  });

  it('acceptance check 1: every sequence item states its rule family in the prompt or scene, and in meta.rule; reasoning items list alternatives', () => {
    const FAMILY = /keeps|adds|constant-addition rule|takes away|brings|each time/i;
    for (const seed of SEEDS) for (const { where, item } of everyItem(seed)) {
      if (item.lesson !== L.stair) continue;
      const s = item.scene;
      expect(s?.kind, `${where} ${item.id}`).toBe('staircase');
      if (s?.kind !== 'staircase') continue;
      expect(FAMILY.test(item.prompt) || FAMILY.test(s.construction), `${where} ${item.prompt}`).toBe(true);
      expect(FAMILY.test(s.construction), s.construction).toBe(true);
      expect(item.meta!.rule.length).toBeGreaterThan(10);
      if (item.phase === 'explain') expect(item.meta!.alternatives?.length, `${where} ${item.id}`).toBeGreaterThan(0);
    }
  });

  it('acceptance check 2: every cycle item says in its prompt whether it counts positions (position 1) or elapsed steps (step or day 0)', () => {
    for (const seed of SEEDS) for (const { where, item } of everyItem(seed)) {
      if (item.scene?.kind !== 'clock') continue;
      const s = item.scene;
      if (s.pair) {
        expect(item.prompt).toMatch(/position 1/);
        expect(item.prompt).toMatch(/day 0/);
        continue;
      }
      if (s.counting === 'position') expect(item.prompt, `${where} ${item.prompt}`).toMatch(/is position 1/);
      else expect(item.prompt, `${where} ${item.prompt}`).toMatch(/is (step|day) 0/);
    }
  });

  it('acceptance check 6 in the packs: stated-rule items say “This machine uses one of these two rules.”, reverse items say whole numbers', () => {
    for (const seed of SEEDS) for (const { where, item } of everyItem(seed)) {
      if (['s15.separate', 's15.machine-which', 's15.machine-why'].includes(item.skill)) expect(item.prompt, where).toContain('This machine uses one of these two rules.');
      if (item.skill === 's15.machine-back') {
        expect(item.prompt, where).toContain('whole numbers');
        const r = parseRule((item.scene as Extract<Scene, { kind: 'machine' }>).rule!);
        const outs = new Set<number>();
        for (let x = 0; x <= 100; x++) outs.add(apply(r, x));
        expect(outs.size, `${where}: one-to-one`).toBe(101);
      }
    }
  });

  it('the ring check: 9 items over all three places, a conflict item, new on most seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop15.check!(createRng(seed));
      expect(items).toHaveLength(9);
      for (const l of stop15.lessons) expect(items.filter((x) => x.lesson === l.id)).toHaveLength(3);
      expect(items.some((x) => x.conflict)).toBe(true);
      seen.add(JSON.stringify(items.map((x) => [x.prompt, x.scene])));
    }
    expect(seen.size).toBeGreaterThanOrEqual(280);
  });

  it('new examples after a miss are matched twins on the same skill; a missed zero remainder gets a block end and a block start', () => {
    for (const seed of SEEDS) for (const l of stop15.lessons) for (const missed of l.practice(createRng(seed))) {
      const set = stop15.fresh!(missed, createRng(seed + 1));
      expect(set.length, missed.skill).toBeGreaterThan(0);
      expect(set[0].skill).toBe(missed.skill);
      if (missed.skill === 's15.cycle-position' && missed.tags?.includes('zero-remainder')) {
        expect(set).toHaveLength(2);
        const [a, b] = set as ChooseItem[];
        const sa = a.scene as Extract<Scene, { kind: 'clock' }>, sb = b.scene as Extract<Scene, { kind: 'clock' }>;
        expect(sa.n! % sa.cycle.length).toBe(0);
        expect(sb.n! % sb.cycle.length).toBe(1);
      }
    }
  });

  it('the diagnostic: Track 2 L1 next term, L2 step 5, L3 a separating input; Track 1 L3 item 10 of a 3-cycle; null otherwise', () => {
    const diag = stop15.observatory!.diagnostic!;
    for (const seed of SEEDS) {
      const t21 = diag(createRng(seed), 2, 1) as NumberItem;
      expect(t21.kind).toBe('number');
      expect(t21.prompt).toMatch(/^Use a constant-addition rule\./);
      expect(t21.lesson).toBe(L.stair);
      expect(recheck(t21)).toBe(true);
      const t22 = diag(createRng(seed), 2, 2) as NumberItem;
      expect(t22.prompt).toMatch(/step 5\?$/);
      expect(t22.answer).toBe(11);
      expect(t22.lesson).toBe(L.stair);
      const t23 = diag(createRng(seed), 2, 3) as ChooseItem;
      expect(t23.kind).toBe('choose');
      expect(t23.skill).toBe('s15.separate');
      expect(t23.lesson).toBe(L.machine);
      expect(recheck(t23)).toBe(true);
      const t13 = diag(createRng(seed), 1, 3) as ChooseItem;
      expect(t13.lesson).toBe(L.clock);
      const s = t13.scene as Extract<Scene, { kind: 'clock' }>;
      expect(s.cycle).toHaveLength(3);
      expect(s.n).toBe(10);
      expect(t13.choices.map((c) => c.label).sort()).toEqual([...s.cycle].sort());
      expect(label(t13, t13.answer)).toBe(s.cycle[0]);
      for (const [t, lv] of [[1, 1], [1, 2], [1, 4], [2, 4], [3, 1], [3, 2], [3, 3], [4, 2], [4, 3], [4, 4]] as const) expect(diag(createRng(seed), t, lv)).toBeNull();
    }
  });
});

// =====================================================================================================
// The words
// =====================================================================================================

describe('Rule Rise: the words', () => {
  const all = () => {
    const out: { where: string; text: string }[] = [];
    for (const l of stop15.lessons) {
      for (const c of l.ideas) for (const t of cardText(c)) out.push({ where: `${l.id} card ${c.title}`, text: t });
      for (const b of l.drill ?? []) for (const t of boardText(b)) out.push({ where: `${b.id}`, text: t });
    }
    for (const seed of SEEDS.slice(0, 10)) for (const { where, item } of everyItem(seed)) for (const t of itemText(item)) out.push({ where: `${where} ${item.id}`, text: t });
    for (const t of worldText()) out.push({ where: 'real life', text: t });
    return out;
  };

  it('curly quotes only, no symbols a kid has not been taught, “Not yet” never “Wrong”, US spelling', () => {
    for (const { where, text } of all()) {
      expect(text, where).not.toMatch(/['"]/);
      expect(text, where).not.toMatch(SYMBOLS);
      expect(text, where).not.toMatch(/\bwrong\b|\bcentre\b|\bcolour/i);
      expect(text, where).not.toMatch(/undefined|NaN|\bnull\b|\[object/);
    }
  });

  it('every wrong-answer explanation (number feedback included) reads at the game’s level', () => {
    for (const seed of SEEDS.slice(0, 10)) for (const { where, item } of everyItem(seed)) {
      const blocks = item.kind === 'number'
        ? Object.values(item.feedback ?? {}).map((fb) => [fb.headline, ...fb.detail].join('\n'))
        : item.kind === 'choose' ? Object.values(item.feedback ?? {}).map((fb) => [fb.headline, ...fb.detail].join('\n')) : [];
      for (const b of blocks) {
        expect(longestSentence(b).words, `${where}: ${longestSentence(b).sentence}`).toBeLessThanOrEqual(READING.maxSentenceWords);
        expect(fkGrade(b), `${where}: ${b}`).toBeLessThanOrEqual(READING.maxGrade);
      }
      const prose = itemText(item).join('\n');
      expect(longestSentence(prose).words, `${where}: ${longestSentence(prose).sentence}`).toBeLessThanOrEqual(READING.maxSentenceWords);
    }
    // Per place, the whole set of words (cards, boards, items) at grade 7 or lower.
    for (const l of stop15.lessons) {
      const text = [
        ...l.ideas.flatMap(cardText),
        ...(l.drill ?? []).flatMap(boardText),
        ...SEEDS.slice(0, 5).flatMap((s) => [...l.practice(createRng(s)), ...l.independent!(createRng(s)), ...(l.primer?.(createRng(s)) ?? [])].flatMap(itemText)),
      ].join('\n');
      expect(fkGrade(text), l.id).toBeLessThanOrEqual(READING.maxGrade);
    }
  });
});
