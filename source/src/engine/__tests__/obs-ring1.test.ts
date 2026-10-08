/**
 * Ring 1 of the Pattern Observatory, First Lights (s14): Star Chain, Repair Bench, Echo Bells.
 *
 * Every answer, truth and picture is computed in src/engine/puzzles/observatory/chains.ts. These tests check each one
 * by a second method (brute force over the token labels, a cycling pointer instead of the modulo, pairwise matches
 * instead of letter names), plus the shapes the contract asks for, the acceptance checks of docs/OBSERVATORY.md §4
 * that this ring owns, the words (curly quotes, no symbols, reading level) and the Track 1 diagnostic items.
 */
import { describe, expect, it } from 'vitest';
import { S14_EXAMPLES, stop14 } from '../../content/stop14';
import { S14_WORLD } from '../../content/world/s14';
import { chainSpeech } from '../../game/components/scenes/speech';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import * as C from '../puzzles/observatory/chains';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import type { ChainScene } from '../scenes/chain';
import { caseText, teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, LessonDef } from '../types';

// ---------- second methods (never the generator's own code) ----------

/** The shortest p such that every piece equals the piece p before it (brute force over every p). */
function bfShortest<T>(xs: readonly T[]): number {
  for (let p = 1; p <= xs.length; p++) {
    let ok = true;
    for (let i = 0; i < xs.length && ok; i++) if (xs[i] !== xs[i % p]) ok = false;
    if (ok) return p;
  }
  return xs.length;
}
/** The first index where repeating the first L pieces fails (compares with xs[i % L]), or -1. */
function bfMiss<T>(xs: readonly T[], L: number): number {
  for (let i = 0; i < xs.length; i++) if (xs[i] !== xs[i % L]) return i;
  return -1;
}
/** Some block fits every piece at least twice. */
const bfRepeats = <T,>(xs: readonly T[]) => Array.from({ length: Math.floor(xs.length / 2) }, (_, i) => i + 1).some((L) => bfMiss(xs, L) < 0);
/** The piece at position p by walking a pointer round the unit (no modulo). */
function bfAt<T>(unit: readonly T[], p: number): T {
  let k = 0;
  for (let step = 1; step < p; step++) k = k + 1 === unit.length ? 0 : k + 1;
  return unit[k];
}
/** Same structure: the same pairs of positions match. */
function sameStructure<T, U>(a: readonly T[], b: readonly U[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length; j++) if ((a[i] === a[j]) !== (b[i] === b[j])) return false;
  return true;
}
/** Every sequence over `kinds` symbols of length n. */
function allSeqs(kinds: number, n: number): number[][] {
  let out: number[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((s) => Array.from({ length: kinds }, (_, k) => [...s, k]));
  return out;
}

const labelsOf = (it: Item) => (it.scene as ChainScene).tokens.map((t) => t.label);
const chooseOf = (it: Item) => it as ChooseItem;
const answerLabel = (it: ChooseItem) => it.choices.find((c) => c.id === it.answer)!.label;
/** The spot a prompt asks about: the last number before its question mark. */
const askedSpot = (prompt: string) => Number(/(\d+)\?$/.exec(prompt.trim())![1]);
/** "meant to repeat the block triangle, circle, square." -> the block's labels. */
const statedBlock = (stated: string) => /meant to repeat the block (.+)\.$/.exec(stated)![1].split(', ');

const LESSONS = stop14.lessons;
const [STAR, REPAIR, ECHO] = LESSONS;
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

/** Every item the ring can give for a seed: packs, the L1 pack, reviews, independent checks, primers, the check, the Arcade, the diagnostic. */
function everything(seed: number): Item[] {
  const r = () => createRng(seed);
  return [
    ...LESSONS.flatMap((l) => [
      ...l.practice(r()),
      ...(l.practiceAt?.(r(), 1) ?? []),
      ...[1, 2, 3].flatMap((st) => l.review?.(r(), st as 1 | 2 | 3) ?? []),
      ...(l.independent?.(r()) ?? []),
      ...(l.primer?.(r()) ?? []),
    ]),
    ...stop14.check!(r()),
    stop14.practice!(r()),
    ...[1, 2].map((lv) => stop14.observatory!.diagnostic!(r(), 1, lv as 1 | 2)!),
  ];
}
const ALL: Item[] = SEEDS.flatMap(everything);

// ---------- the math ----------

describe('the math, checked by brute force', () => {
  it('the piece at position n is piece ((n − 1) mod k) + 1 of the unit, for k 1 to 5 and n 1 to 60', () => {
    for (let k = 1; k <= 5; k++) {
      const unit = Array.from({ length: k }, (_, i) => i);
      for (let n = 1; n <= 60; n++) {
        expect(C.atPosition(unit, n)).toBe(bfAt(unit, n));
        expect(C.build(unit, n)[n - 1]).toBe(bfAt(unit, n));
        const { q, r, piece } = C.splitPosition(k, n);
        expect(q * k + r).toBe(n - 1);
        expect(r).toBeLessThan(k);
        expect(unit[piece - 1]).toBe(bfAt(unit, n));
        expect(C.countLine(k, n)).toContain(`Take one away from ${n}: ${n - 1}.`);
        expect(C.countLine(k, n)).toContain(`piece ${piece} of the unit`);
      }
    }
  });

  it('the unit, a fitting block, a break and “made by repeating a block” agree with brute force on every short chain', () => {
    const seqs = [...Array.from({ length: 10 }, (_, n) => allSeqs(2, n + 1)).flat(), ...Array.from({ length: 6 }, (_, n) => allSeqs(3, n + 2)).flat()];
    for (const s of seqs) {
      expect(C.shortestBlock(s)).toBe(bfShortest(s));
      expect(C.repeatsBlock(s)).toBe(bfRepeats(s));
      for (let L = 1; L <= s.length; L++) {
        expect(C.firstMiss(s, L)).toBe(bfMiss(s, L));
        expect(C.blockFits(s, L)).toBe(bfMiss(s, L) < 0);
      }
    }
  });

  it('a block fits exactly when its length is a multiple of the unit, for the four patterns at every length up to 12', () => {
    for (const p of C.PATTERN_IDS) {
      const unit = C.PATTERNS[p];
      const k = unit.length;
      for (let n = 2 * k; n <= 12; n++) {
        const s = C.build(unit, n);
        expect(bfShortest(s), `${p} n=${n}`).toBe(k);
        for (let L = 1; L <= n; L++) expect(C.blockFits(s, L), `${p} n=${n} L=${L}`).toBe(L % k === 0 || L === n || bfMiss(s, L) < 0);
        for (let L = 1; L < k; L++) expect(C.blockFits(s, L)).toBe(false);
      }
    }
  });

  it('structures: same letters exactly when the same positions match; every family holds three different primitive blocks', () => {
    for (const a of allSeqs(3, 4)) for (const b of allSeqs(3, 4)) expect(C.structureOf(a) === C.structureOf(b)).toBe(sameStructure(a, b));
    for (const fam of C.FAMILIES) {
      expect(new Set(fam).size).toBe(3);
      for (const f of fam) {
        expect(C.structureOf(C.unitOf(f)), f).toBe(f);
        expect(bfShortest(C.build(C.unitOf(f), 2 * f.length)), `${f}, repeated, has itself as its unit`).toBe(f.length);
        // The words say which positions match, from the pairwise matches.
        const d = C.describeStructure(f);
        for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
          if (f[i] !== f[j]) continue;
          const group = [...f].map((c, x) => (c === f[i] ? x + 1 : 0)).filter(Boolean);
          expect(d, `${f}: ${d}`).toContain(group.length === 2 ? `${group[0]} and ${group[1]} match` : `${group.slice(0, -1).join(', ')} and ${group[group.length - 1]} match`);
        }
      }
    }
    expect(C.describeStructure('ABC')).toBe('All three positions are different.');
  });

  it('a broken chain differs from its stated block in exactly one place; the trap puts it in the last block', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const nearEnd of [true, false]) {
        const m = C.brokenChain(createRng(seed), { nearEnd });
        const k = m.unit.length;
        const diffs = m.seq.map((x, i) => (x !== m.unit[i % k] ? i : -1)).filter((i) => i >= 0);
        expect(diffs).toEqual([m.b]);
        expect(C.breakAgainst(m.seq, m.unit)).toBe(m.b);
        expect(new Set(m.unit).has(m.seq[m.b]), 'the new piece is one of the kinds the chain uses').toBe(true);
        if (nearEnd) expect(m.b).toBeGreaterThanOrEqual(m.seq.length - k);
        else {
          expect(m.b).toBeGreaterThanOrEqual(k);
          expect(m.b).toBeLessThan(m.seq.length - k);
        }
        const blocks = C.blocksOf(m);
        expect(blocks.filter((x) => !x.ok).map((x) => x.j)).toEqual([Math.floor(m.b / k) + 1]);
      }
    }
  });

  it('a chain that is “not repeating” has no block that fits twice, and uses every kind at least twice', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const skin = C.makeSkin(createRng(seed).pick(C.BASE_SKINS), createRng(seed + 1));
      const s = C.notRepeating(createRng(seed), skin);
      expect(bfRepeats(s), s.join('')).toBe(false);
      for (const kind of new Set(s)) expect(s.filter((x) => x === kind).length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ---------- the contract shapes ----------

const PHASE_ORDER = ['explain', 'do', 'transfer'] as const;
/** Each place's new contexts: Star Chain moves to sounds and a rota, Repair Bench to a necklace and a chore chart, Echo Bells (whose See already plays bells and claps) to a dance and a timetable. */
const TRANSFER_REPS: Record<string, Set<string>> = {
  's14.l1': new Set(['sounds with captions', 'a desk rota of names']),
  's14.l2': new Set(['a bead necklace', 'a weekly chore chart of names']),
  's14.l3': new Set(['dance moves with captions', 'a class timetable']),
};
const TRAP: Record<string, string> = { 's14.l1': C.LONGER_BLOCK.tag, 's14.l2': C.NEAR_END.tag, 's14.l3': C.SAME_PIECES.tag };

function shapeProblems(it: Item): string[] {
  const out: string[] = [];
  if (!it.meta) return ['no meta'];
  const m = it.meta;
  for (const k of ['skill', 'rule', 'task', 'representation', 'twin'] as const) if (!m[k]?.trim()) out.push(`meta.${k} empty`);
  if (m.phase !== it.phase) out.push('meta.phase differs from phase');
  if (m.twin !== it.twin) out.push('meta.twin differs from twin');
  if (!it.phase) out.push('no phase');
  if (it.level !== 1 && it.level !== 2) out.push(`level ${it.level}`);
  if (!it.hints?.length || it.hints.length > 3 || it.hint !== it.hints[0]) out.push('hint sequence');
  if (!it.hintCase?.label.trim()) out.push('no hintCase');
  if (!it.teach?.rule.trim() || !it.teach.cases?.length || !it.teach.remember?.length || !it.teach.simpler?.length || !it.teach.terms?.length) out.push('teach incomplete');
  const tags = it.errorTags ?? {};
  if (JSON.stringify([...new Set(Object.values(tags))].sort()) !== JSON.stringify([...m.tags].sort())) out.push('meta.tags is not the set of error tags');
  if (it.kind === 'choose') {
    const ids = it.choices.map((c) => c.id);
    if (it.choices.length < 2 || it.choices.length > 5) out.push('choices');
    for (const k of Object.keys(tags)) if (!ids.includes(k) || k === it.answer) out.push(`error tag on ${k}`);
    for (const c of it.choices) if (c.id !== it.answer && !it.feedback?.[c.id]) out.push(`no feedback for ${c.id}`);
    if (m.answerType !== 'categorical') out.push('answerType');
  } else if (it.kind === 'number') {
    for (const k of [...Object.keys(tags), ...Object.keys(it.feedback ?? {})]) if (!/^\d+$/.test(k) || Number(k) === it.answer) out.push(`number key ${k}`);
    if (m.answerType !== 'number') out.push('answerType');
  } else out.push(`kind ${it.kind}`);
  if (it.phase === 'explain' && (it.rubric !== 2 || !m.rubric)) out.push('explain item without its rubric');
  if (it.frame && !it.frame.includes('___')) out.push('frame without a blank');
  return out;
}

describe('every place generates for seeds 1-40 with the contract’s shapes', () => {
  it.each(LESSONS.map((l) => [l.id, l] as const))('%s: the planned pack in phase order, faded then unframed, the trap in every pack', (_id, l) => {
    for (const seed of SEEDS) {
      const pack = l.practice(createRng(seed));
      expect(pack.length).toBeGreaterThanOrEqual(3);
      expect(pack.length).toBeLessThanOrEqual(5);
      const phases = pack.map((it) => it.phase!);
      expect(phases.map((p) => PHASE_ORDER.indexOf(p as (typeof PHASE_ORDER)[number]))).toEqual([...phases.map((p) => PHASE_ORDER.indexOf(p as (typeof PHASE_ORDER)[number]))].sort((a, b) => a - b));
      for (const p of PHASE_ORDER) expect(phases, `${l.id} seed ${seed} has ${p}`).toContain(p);
      expect(phases[0]).toBe('explain');
      const dos = pack.filter((it) => it.phase === 'do');
      expect(dos[0].frame, `${l.id}: the first Do item is faded`).toMatch(/___/);
      expect(dos[1].frame, `${l.id}: then the task with no frame`).toBeUndefined();
      expect(dos[1].skill === dos[0].skill || l.id === 's14.l2', `${l.id}: the unframed item is the same task`).toBe(true);
      expect(pack.some((it) => it.tags?.includes(TRAP[l.id])), `${l.id} seed ${seed}: the trap`).toBe(true);
      for (const it of pack) expect(shapeProblems(it), `${it.id} seed ${seed}`).toEqual([]);
      const fresh = TRANSFER_REPS[l.id];
      for (const it of pack.filter((x) => x.phase === 'transfer')) expect(fresh.has(it.meta!.representation.split(' to ')[0]), `${it.id}: ${it.meta!.representation} is a new context`).toBe(true);
      for (const it of pack.filter((x) => x.phase !== 'transfer')) expect(fresh.has(it.meta!.representation.split(' to ')[0]), `${it.id}: Do items keep the place’s own materials`).toBe(false);
      expect(l.practice(createRng(seed))).toEqual(pack);
      expect(new Set(pack.map(looks)).size).toBe(pack.length);
    }
  });

  it('every item anywhere in the ring has the shapes (packs, reviews, checks, primers, the Arcade, the diagnostic)', () => {
    for (const it of ALL) expect(shapeProblems(it), it.id).toEqual([]);
  });

  it('places: routine, track 1, levels, plain labels; Star Chain needs nothing, the others need Star Chain or its primer', () => {
    for (const l of LESSONS) {
      expect(l.routine).toBe(true);
      expect(l.track).toBe(1);
      expect(l.plain).toMatch(/^Repeating units/);
      expect(l.ideas.length).toBeGreaterThanOrEqual(3);
      expect(l.ideas.length).toBeLessThanOrEqual(7);
      expect(l.pass).toEqual({ firstTry: 3, include: [expect.objectContaining({ tag: TRAP[l.id] })] });
    }
    expect(STAR.levels).toEqual([1, 2]);
    expect(STAR.requires).toEqual([]);
    expect(STAR.primer).toBeUndefined();
    for (const l of [REPAIR, ECHO]) {
      expect(l.levels).toEqual([2, 2]);
      expect(l.requires).toEqual(['s14.l1']);
      for (const seed of SEEDS.slice(0, 10)) {
        const primer = l.primer!(createRng(seed));
        expect(primer).toHaveLength(3);
        expect(primer.every((it) => it.lesson === 's14.l1' && /^s14\.(unit|extend)$/.test(it.skill))).toBe(true);
        expect(new Set(primer.map((x) => x.id)).size).toBe(3);
      }
    }
    expect(stop14.ready).toBe(true);
    expect(stop14.requires).toEqual([]);
    expect(stop14.lessonOrder).toBe('free');
    expect(stop14.observatory).toMatchObject({ ring: 1, track: 1, plain: 'Repeating units' });
  });

  it('the L1 pack: chains made by repeating two pieces, the same plan, the trap', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const pack = STAR.practiceAt!(createRng(seed), 1);
      expect(pack.map((x) => x.phase)).toEqual(['explain', 'do', 'do', 'do', 'transfer']);
      expect(pack.some((it) => it.tags?.includes(C.LONGER_BLOCK.tag))).toBe(true);
      for (const it of pack) {
        expect(bfShortest(labelsOf(it)), it.id).toBe(2);
        expect(it.level, it.id).toBe(1);
      }
      expect(STAR.practiceAt!(createRng(seed), 2)).toEqual(STAR.practice(createRng(seed)));
    }
  });
});

// ---------- every computed answer, by a second method ----------

describe('every computed answer, by a second method', () => {
  const byTask = (t: string) => ALL.filter((it) => it.meta?.task === t);

  it('box the shortest unit: the shortest block by brute force; a longer block that fits is tagged oversized-unit', () => {
    const items = byTask('box the shortest unit');
    expect(items.length).toBeGreaterThan(100);
    for (const it of items.map(chooseOf)) {
      const xs = labelsOf(it);
      const k = bfShortest(xs);
      expect(it.answer, it.id).toBe(`len${k}`);
      for (const c of it.choices) {
        const L = Number(c.id.slice(3));
        if (L === k) continue;
        expect(it.errorTags?.[c.id] === 'oversized-unit', `${it.id} ${c.id}`).toBe(bfMiss(xs, L) < 0);
      }
      if (it.tags?.includes(C.LONGER_BLOCK.tag)) expect(Object.values(it.errorTags ?? {})).toContain('oversized-unit');
      // A shorter block that breaks is always offered: the shortest choice is never the answer by default.
      expect(it.choices.some((c) => Number(c.id.slice(3)) < k), `${it.id}: a shorter block is a choice`).toBe(true);
    }
  });

  it('the length of the unit (number pad): brute force; every listed near miss says what it gets wrong', () => {
    const items = byTask('find the length of the shortest unit');
    expect(items.length).toBeGreaterThan(40);
    for (const it of items) {
      if (it.kind !== 'number') throw new Error('number item');
      const xs = labelsOf(it);
      expect(it.answer).toBe(bfShortest(xs));
      for (const [k, fb] of Object.entries(it.feedback ?? {})) {
        const L = Number(k);
        expect(fb.headline).toContain(`block of ${L}`);
        expect(fb.headline.includes('breaks')).toBe(bfMiss(xs, L) >= 0);
      }
      expect(it.feedback?.[String(it.answer + 1)], `${it.id}: the off-by-one miss is explained`).toBeDefined();
    }
  });

  it('the piece at a position (faded, next, far): a pointer walked round the brute-force unit', () => {
    const items = ALL.filter((it) => it.skill === 's14.extend').map(chooseOf);
    expect(items.length).toBeGreaterThan(150);
    for (const it of items) {
      const xs = labelsOf(it);
      const unit = xs.slice(0, bfShortest(xs));
      const p = askedSpot(it.prompt);
      expect(answerLabel(it), `${it.id}: ${it.prompt}`).toBe(bfAt(unit, p));
      const sc = it.scene as ChainScene;
      if (it.frame) {
        expect(sc.blanks).toEqual([p - 1]);
        expect(sc.unit).toEqual({ start: 0, len: unit.length });
        expect(xs[p - 1]).toBe(bfAt(unit, p));
      } else expect(p).toBeGreaterThan(xs.length);
      for (const [id, tag] of Object.entries(it.errorTags ?? {})) {
        const w = it.choices.find((c) => c.id === id)!.label;
        if (tag === 'copy-last') expect(w).toBe(xs[xs.length - 1]);
        if (tag === 'off-by-one') expect([bfAt(unit, p - 1), bfAt(unit, p + 1)]).toContain(w);
      }
    }
  });

  it('why a block is not the unit: the right reason names the spot where the block breaks', () => {
    for (const it of byTask('explain why a block is not the unit').map(chooseOf)) {
      const xs = labelsOf(it);
      const block = /Why is “(.+)” not its unit\?$/.exec(it.prompt)![1].split(', ');
      expect(xs.slice(0, block.length)).toEqual(block);
      const miss = bfMiss(xs, block.length);
      expect(miss).toBeGreaterThan(0);
      expect(answerLabel(it)).toMatch(new RegExp(` ${miss + 1}, but `));
      expect(bfShortest(xs)).toBeGreaterThan(block.length);
      // "The chain ends with …" never excuses the block: the block does not end with the chain's last piece.
      expect(block[block.length - 1]).not.toBe(xs[xs.length - 1]);
    }
  });

  it('repair: exactly one piece breaks the stated block; the answer is that spot, its fix is the block’s piece there', () => {
    const repairs = ALL.filter((it) => it.lesson === 's14.l2' && it.skill !== 's14.is-repeat').map(chooseOf);
    expect(repairs.length).toBeGreaterThan(150);
    for (const it of repairs) {
      const xs = labelsOf(it);
      const unit = statedBlock((it.scene as ChainScene).stated);
      expect(it.prompt).toContain('meant to repeat the block');
      const breaks = xs.map((x, i) => (x !== bfAt(unit, i + 1) ? i : -1)).filter((i) => i >= 0);
      expect(breaks, it.id).toHaveLength(1);
      const b = breaks[0];
      if (it.skill === 's14.repair-find') {
        expect(it.answer).toBe(`pos${b + 1}`);
        if (it.tags?.includes(C.NEAR_END.tag)) {
          expect(b).toBeGreaterThanOrEqual(xs.length - unit.length);
          expect(it.errorTags?.none).toBe('error-near-end');
        }
      }
      if (it.skill === 's14.repair-fix') {
        expect(answerLabel(it)).toBe(bfAt(unit, b + 1));
        if (it.frame) expect((it.scene as ChainScene).broken).toBe(b);
      }
      if (it.skill === 's14.repair-why') expect(answerLabel(it)).toContain(` ${b + 1}, but it is`);
    }
  });

  it('repeating or not: Yes exactly when some block fits every piece at least twice', () => {
    const items = ALL.filter((it) => it.skill === 's14.is-repeat').map(chooseOf);
    const answers = new Set<string>();
    for (const it of items) {
      expect(it.answer).toBe(bfRepeats(labelsOf(it)) ? 'yes' : 'no');
      expect((it.scene as ChainScene).stated, 'an observed chain says so').toMatch(/^Nobody says how/);
      if (it.answer === 'no') expect(it.errorTags?.yes).toBe('not-repeating');
      answers.add(it.answer);
    }
    expect([...answers].sort()).toEqual(['no', 'yes']);
  });

  it('echo: the right block or letter chain has the same pairwise matches as the chain; every other choice does not', () => {
    const items = ALL.filter((it) => it.skill === 's14.translate').map(chooseOf);
    expect(items.length).toBeGreaterThan(150);
    for (const it of items) {
      const xs = labelsOf(it);
      const k = bfShortest(xs);
      const block = xs.slice(0, k);
      if (it.frame) {
        // The faded rebuild: the blank is the last letter of the block, named by first appearance.
        const letters = block.map((x) => 'ABC'[[...new Set(block)].indexOf(x)]);
        expect(it.answer).toBe(letters[k - 1]);
        expect(it.frame).toContain(letters.slice(0, -1).join(', '));
        // The blank's piece is new: a letter not used yet is a skipped letter, not “a new kind”.
        const isNew = !letters.slice(0, -1).includes(letters[k - 1]);
        for (const [id, fb] of Object.entries(it.feedback ?? {})) if (isNew && !letters.includes(id)) expect(fb.headline, `${it.id} ${id}`).toMatch(/skips a letter/);
        continue;
      }
      const split = (s: string) => s.split(', ');
      const right = split(answerLabel(it));
      expect(sameStructure(right.slice(0, k), block), `${it.id}: ${answerLabel(it)} vs ${block}`).toBe(true);
      for (const c of it.choices) if (c.id !== it.answer) expect(sameStructure(split(c.label).slice(0, k), block), `${it.id} ${c.label}`).toBe(false);
      if (it.tags?.includes(C.SAME_PIECES.tag)) {
        // The trap: every choice uses the same pieces; only the structure differs.
        const kinds = it.choices.map((c) => [...new Set(split(c.label))].sort().join());
        expect(new Set(kinds.filter((x) => x.split(',').length === 2)).size).toBeLessThanOrEqual(1);
        expect(Object.values(it.errorTags ?? {}).every((t) => t === 'same-objects-different-structure')).toBe(true);
      }
    }
  });

  it('why two blocks match: the right reason states the pairwise matches of the block in the prompt', () => {
    for (const it of ALL.filter((x) => x.skill === 's14.echo-why').map(chooseOf)) {
      const [, block, letters] = /“(.+)” match the letter block “(.+)”\?$/.exec(it.prompt)!;
      expect(sameStructure(block.split(', '), letters.split(', '))).toBe(true);
      expect(labelsOf(it).slice(0, letters.split(', ').length)).toEqual(block.split(', '));
      expect(answerLabel(it)).toBe(`In both, ${C.describeStructure(letters.split(', ').join('')).replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '')}.`);
    }
  });
});

// ---------- acceptance checks (docs/OBSERVATORY.md §4) ----------

describe('acceptance checks this ring owns', () => {
  it('1: every item states its rule (meta.rule), and says which kind of pattern it is', () => {
    for (const it of ALL) {
      expect(it.meta?.rule.length, it.id).toBeGreaterThan(10);
      const stated = (it.scene as ChainScene).stated;
      expect(stated, it.id).toMatch(/is made by repeating a block\.$|is meant to repeat the block .+\.$|^Nobody says how .+ was made\.$/);
      if (/^Nobody says/.test(stated)) expect(it.prompt).toContain('Nobody says');
    }
  });

  it('5: each place has routine, misconception, transfer and delayed-review items: review gives 4, independent gives 6', () => {
    for (const l of LESSONS) {
      for (const seed of SEEDS.slice(0, 15)) {
        const pack = l.practice(createRng(seed));
        expect(pack.some((x) => x.phase === 'explain') && pack.some((x) => x.phase === 'do') && pack.some((x) => x.phase === 'transfer')).toBe(true);
        expect(pack.some((x) => Object.keys(x.errorTags ?? {}).length > 0)).toBe(true);
        for (const stage of [1, 2, 3] as const) {
          const rev = l.review!(createRng(seed), stage);
          expect(rev).toHaveLength(4);
          expect(rev.every((x) => x.phase === 'review' && x.meta?.phase === 'review')).toBe(true);
          expect(new Set(rev.map(looks)).size).toBe(4);
          expect(new Set(rev.map((x) => x.id)).size).toBe(4);
        }
        const ind = l.independent!(createRng(seed));
        expect(ind).toHaveLength(6);
        expect(ind.some((x) => Object.keys(x.errorTags ?? {}).length > 0), `${l.id} independent has an error-tagged item`).toBe(true);
        expect(ind.some((x) => x.phase === 'explain'), `${l.id} independent has an explain item`).toBe(true);
        expect(new Set(ind.map(looks)).size).toBe(6);
        expect(new Set(ind.map((x) => x.id)).size).toBe(6);
        expect(ind.every((x) => !x.frame), 'independent items have no frame').toBe(true);
      }
    }
  });

  it('the Ring Check: 8-10 items, every place, a conflict item on each trap, the same for the same seed, new across seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop14.check!(createRng(seed));
      expect(items.length).toBeGreaterThanOrEqual(8);
      expect(items.length).toBeLessThanOrEqual(10);
      for (const l of LESSONS) expect(items.some((x) => x.lesson === l.id)).toBe(true);
      expect(items.filter((x) => x.conflict)).toHaveLength(3);
      for (const x of items.filter((y) => y.conflict)) expect(Object.values(TRAP).some((t) => x.tags?.includes(t)), x.id).toBe(true);
      expect(items.every((x) => !x.frame)).toBe(true);
      expect(stop14.check!(createRng(seed))).toEqual(items);
      seen.add(JSON.stringify(items.map((x) => [x.prompt, x.scene])));
    }
    expect(seen.size).toBeGreaterThanOrEqual(280);
  });
});

// ---------- the cards and the boards ----------

/** Every board's marks, with their answers. */
const boardsOf = (l: LessonDef) => l.drill ?? [];

describe('cards (See) and boards (Do)', () => {
  it('every stepped card shows one frame per step; the scene states its kind of pattern', () => {
    for (const l of LESSONS) {
      for (const c of l.ideas) {
        const sc = c.scene as ChainScene;
        expect(sc.kind).toBe('chain');
        if (sc.steps) expect(sc.frames?.length, `${l.id} ${c.title}`).toBe(sc.steps.length);
        for (const f of sc.frames ?? []) if (f.tokens) expect(sameStructure(f.tokens.map((t) => t.label), sc.tokens.map((t) => t.label)), `${c.title}: a re-skinned frame keeps the structure`).toBe(true);
      }
    }
  });

  it('Star Chain’s worked example: a long block fits but is not the shortest, a short block breaks where it says, then the unit', () => {
    const card = STAR.ideas.find((c) => c.title === 'Try a block, check every piece')!;
    const sc = card.scene as ChainScene;
    const xs = sc.tokens.map((t) => t.label);
    const k = bfShortest(xs);
    const [long, short, unit] = sc.frames!;
    expect(long.tryUnit!.ok).toBe(bfMiss(xs, long.tryUnit!.len) < 0);
    expect(long.tryUnit!.ok).toBe(true);
    expect(long.tryUnit!.len).toBeGreaterThan(k);
    expect(short.tryUnit!.ok).toBe(false);
    expect(short.miss).toBe(bfMiss(xs, short.tryUnit!.len));
    expect(sc.steps![1].say).toContain(`Position ${short.miss! + 1} would be`);
    expect(unit.unit).toEqual({ start: 0, len: k });
    expect(sc.stated).toBe('This chain is made by repeating a block.');
    // Card 3 counts its two positions with the words "take one away, find the remainder, add one".
    const far = STAR.ideas.find((c) => c.title === 'Find any position')!.scene as ChainScene;
    const fx = far.tokens.map((t) => t.label);
    for (const [i, p] of [7, 14].entries()) expect(far.steps![i].say).toMatch(new RegExp(`${bfAt(fx.slice(0, bfShortest(fx)), p)}\\.$`));
  });

  it('Repair Bench’s worked examples: the walk stops at the computed break; the last card’s chain does not repeat', () => {
    const { REPAIR: rep, LATE, RANDOM } = S14_EXAMPLES;
    for (const [title, m] of [['Meant to repeat a block', rep], ['Check all the way to the end', LATE]] as const) {
      const sc = REPAIR.ideas.find((c) => c.title === title)!.scene as ChainScene;
      const xs = sc.tokens.map((t) => t.label);
      const unit = statedBlock(sc.stated);
      const b = xs.findIndex((x, i) => x !== bfAt(unit, i + 1));
      expect(b).toBe(m.b);
      expect(sc.frames![sc.frames!.length - 1].miss).toBe(b);
      expect(sc.steps![sc.steps!.length - 1].say).toContain(`Position ${b + 1} should be`);
      for (const f of sc.frames!) if (f.checked !== undefined) expect(f.checked).toBeLessThanOrEqual(b);
    }
    expect(bfRepeats(RANDOM)).toBe(false);
    const sc = REPAIR.ideas.find((c) => c.title === 'Is it made by repeating a block?')!.scene as ChainScene;
    const xs = sc.tokens.map((t) => t.label);
    for (const f of sc.frames!) if (f.tryUnit) expect(f.miss).toBe(bfMiss(xs, f.tryUnit.len));
    expect(sc.stated).toMatch(/^Nobody says how/);
  });

  it('boards: the first is the worked example’s board with the full scaffold; every mark is computed and every wrong option has words', () => {
    for (const l of LESSONS) {
      const boards = boardsOf(l);
      expect(boards.length).toBeGreaterThanOrEqual(1);
      const first = boards[0];
      expect(first.scaffold).toBe('full');
      expect(l.ideas.map((c) => JSON.stringify(c.scene))).toContain(JSON.stringify(first.scene));
      for (const st of boards) {
        const tap = marksToTap(st);
        expect(tap.length).toBeGreaterThan(0);
        expect(tap.length).toBeLessThanOrEqual(12);
        expect(checkDrill(st, Object.fromEntries(tap.map((m) => [m.id, m.answer]))).done).toBe(true);
        for (const m of tap) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id], `${st.id} ${m.id} ${o.id}`).toBeTruthy();
        if (st !== first) expect(st.twin?.trim() || l.ideas.some((c) => JSON.stringify(c.scene) === JSON.stringify(st.scene))).toBeTruthy();
      }
    }
  });

  it('board marks match brute force: positions, unit lengths, blocks that match or break, letters', () => {
    const check = (st: DrillStep) => {
      const sc = st.scene as ChainScene;
      const xs = sc.tokens.map((t) => t.label);
      const marks = st.rows.flatMap((r) => r.marks);
      const optLabel = (m: (typeof marks)[number]) => m.options.find((o) => o.id === m.answer)!.label;
      for (const m of marks) {
        if (/^Position \d+$/.test(m.label) && /^p\d+$/.test(m.id)) expect(optLabel(m), `${st.id} ${m.id}`).toBe(bfAt(xs.slice(0, bfShortest(xs)), Number(m.id.slice(1))));
        if (m.id === 'len') expect(m.answer).toBe(String(bfShortest(xs)));
        if (/^b\d+$/.test(m.id)) {
          const unit = statedBlock(sc.stated);
          const j = Number(m.id.slice(1));
          const span = xs.slice((j - 1) * unit.length, j * unit.length);
          expect(m.answer).toBe(span.every((x, i) => x === unit[i]) ? 'matches' : 'breaks');
        }
        if (m.id === 'where') expect(Number(m.answer)).toBe(xs.findIndex((x, i) => x !== bfAt(statedBlock(sc.stated), i + 1)) + 1);
      }
    };
    for (const l of LESSONS) for (const st of boardsOf(l)) check(st);
    // Echo boards: the letters by first appearance; the same-structure marks by pairwise matches.
    const [e1, e2] = boardsOf(ECHO);
    const block = (e1.scene as ChainScene).tokens.slice(0, 3).map((t) => t.label);
    expect(e1.rows.find((r) => r.id === 'blue')!.marks[0].answer).toBe('ABC'[[...new Set(block)].indexOf(block[1])]);
    const dance = (e2.scene as ChainScene).tokens.slice(0, 3).map((t) => t.label);
    expect(e2.rows.find((r) => r.id === 'letters')!.marks.map((m) => m.answer)).toEqual(dance.map((x) => 'ABC'[[...new Set(dance)].indexOf(x)]));
    expect(e2.rows.find((r) => r.id === 'abb')!.marks[0].answer).toBe(sameStructure(['r', 'b', 'b'], dance) ? 'yes' : 'no');
    expect(e2.rows.find((r) => r.id === 'aab')!.marks[0].answer).toBe(sameStructure(['r', 'r', 'b'], dance) ? 'yes' : 'no');
  });
});

// ---------- the words ----------

const STRAIGHT = /['"]/;
const SYMBOLS = /[=+×−→✓]/;

function itemWords(it: Item): string[] {
  const sc = it.scene as ChainScene;
  return [
    it.prompt, it.explain, ...teachStrings(it), ...(it.hints ?? []), it.frame ?? '', sc.stated, ...sc.tokens.map((t) => t.label),
    ...(it.kind === 'choose' ? [...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {})] : []),
    ...(it.kind === 'number' ? [it.unit ?? '', ...Object.values(it.feedback ?? {}).flatMap((f) => [f.headline, ...f.detail, ...(f.example ? caseText(f.example) : [])])] : []),
  ].filter(Boolean);
}
function boardWords(st: DrillStep): string[] {
  return [st.title, ...st.body, st.done, st.twin ?? '', ...(st.steps ?? []), ...st.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]), ...(st.misconceptions ?? []).map((m) => m.text)].filter(Boolean);
}
function cardWords(l: LessonDef): string[] {
  return l.ideas.flatMap((c) => {
    const sc = c.scene as ChainScene;
    return [c.title, ...c.body, sc.stated, ...(sc.steps ?? []).flatMap((s) => [s.label, s.say])];
  });
}
const worldWords = () => [S14_WORLD.stop, ...Object.values(S14_WORLD.lessons).flatMap((w) => [w.why, ...w.uses.flatMap((u) => [u.who, u.text])]), ...Object.values(S14_WORLD.skills).flat()];

describe('the words', () => {
  it('curly quotes only, and no symbols, in everything a kid reads', () => {
    const texts = [...ALL.flatMap(itemWords), ...LESSONS.flatMap(cardWords), ...LESSONS.flatMap((l) => boardsOf(l).flatMap(boardWords)), ...worldWords(), ...Object.values(stop14.skillNames ?? {})];
    for (const t of texts) {
      expect(t, t).not.toMatch(STRAIGHT);
      expect(t, t).not.toMatch(SYMBOLS);
      expect(t, t).not.toMatch(/\bpiece block\b/);
    }
  });

  it('every sentence is 25 words or fewer and the hints, number feedback and boards read at grade 7 or lower', () => {
    for (const t of [...ALL.flatMap(itemWords), ...LESSONS.flatMap(cardWords), ...LESSONS.flatMap((l) => boardsOf(l).flatMap(boardWords))]) {
      expect(longestSentence(t).words, t).toBeLessThanOrEqual(READING.maxSentenceWords);
    }
    for (const l of LESSONS) {
      const items = ALL.filter((x) => x.lesson === l.id);
      const extra = items.flatMap((it) => [...(it.hints ?? []), ...(it.kind === 'number' ? Object.values(it.feedback ?? {}).flatMap((f) => [f.headline, ...f.detail]) : [])]);
      expect(fkGrade(extra.join('\n')), `${l.id} hints`).toBeLessThanOrEqual(READING.maxGrade);
      expect(fkGrade(boardsOf(l).flatMap(boardWords).join('\n')), `${l.id} boards`).toBeLessThanOrEqual(READING.maxGrade);
      expect(fkGrade(cardWords(l).join('\n')), `${l.id} cards`).toBeLessThanOrEqual(READING.maxGrade);
    }
  });

  it('feedback names the gap and shows the repair: never “Wrong”, never only “try again”; levels are never ages', () => {
    for (const it of ALL) {
      const heads = it.kind === 'choose' || it.kind === 'number' ? Object.values(it.feedback ?? {}) : [];
      for (const fb of heads) {
        expect(fb.headline).not.toMatch(/^wrong\b|try again/i);
        expect(fb.detail.length).toBeGreaterThan(0);
      }
      for (const t of itemWords(it)) expect(t).not.toMatch(/\b(years? old|ages? \d)/i);
    }
    for (const l of LESSONS) for (const st of boardsOf(l)) for (const m of marksToTap(st)) for (const w of Object.values(m.why)) expect(w).toMatch(/^Not yet\./);
  });

  it('read-aloud: a chain names every position, a blank, the unit box; a stepped chain reads the frame of the steps on show', () => {
    const blank = ALL.find((x) => x.frame && x.skill === 's14.extend')!;
    const lines = chainSpeech(blank.scene as ChainScene);
    expect(lines[0]).toBe((blank.scene as ChainScene).stated);
    expect(lines.join(' ')).toContain('a blank');
    expect(lines.join(' ')).toMatch(/The unit box goes around positions 1 to \d+/);
    const stepped = STAR.ideas[1].scene as ChainScene;
    // Before any step: the stated rule and the bare chain. Every step showing: the last frame's box or flag as well.
    expect(chainSpeech(stepped, 0)).toHaveLength(2);
    expect(chainSpeech(stepped).length).toBeGreaterThan(2);
  });
});

// ---------- the diagnostic and new examples ----------

describe('the Track 1 diagnostic items and the new examples after a miss', () => {
  it('L1: extend a chain made by repeating two pieces; L2: box the unit of an ABB chain where a longer block is a choice', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const d = stop14.observatory!.diagnostic!;
      const one = d(createRng(seed), 1, 1) as ChooseItem;
      expect(one.lesson).toBe('s14.l1');
      expect(one.meta?.task).toBe('extend a chain');
      const xs = labelsOf(one);
      expect(bfShortest(xs)).toBe(2);
      expect(answerLabel(one)).toBe(bfAt(xs.slice(0, 2), xs.length + 1));
      const two = d(createRng(seed), 1, 2) as ChooseItem;
      expect(two.meta?.task).toBe('box the shortest unit');
      const ys = labelsOf(two);
      expect(C.structureOf(ys.slice(0, 3))).toBe('ABB');
      expect(bfShortest(ys)).toBe(3);
      expect(two.answer).toBe('len3');
      expect(Object.values(two.errorTags ?? {})).toContain('oversized-unit');
      expect(d(createRng(seed), 1, 1)).toEqual(one);
      expect(d(createRng(seed), 1, 3)).toBeNull();
      expect(d(createRng(seed), 1, 4)).toBeNull();
      for (const t of [2, 3, 4] as const) for (const lv of [1, 2, 3, 4] as const) expect(d(createRng(seed), t, lv)).toBeNull();
    }
  });

  it('a missed unit, break or “repeating or not” gets a matched pair; other skills use the default', () => {
    const missed = (skill: string) => ALL.find((x) => x.skill === skill)!;
    for (let seed = 1; seed <= 20; seed++) {
      const u = stop14.fresh!(missed('s14.unit'), createRng(seed));
      expect(u.map((x) => x.skill)).toEqual(['s14.unit', 's14.unit']);
      expect(u.map((x) => !!x.tags?.includes(C.LONGER_BLOCK.tag))).toEqual([true, false]);
      const f = stop14.fresh!(missed('s14.repair-find'), createRng(seed));
      expect(f.map((x) => !!x.tags?.includes(C.NEAR_END.tag))).toEqual([true, false]);
      const r = stop14.fresh!(missed('s14.is-repeat'), createRng(seed)).map(chooseOf);
      expect(r.map((x) => x.answer)).toEqual(['no', 'yes']);
      expect(stop14.fresh!(missed('s14.translate'), createRng(seed))).toEqual([]);
    }
  });

  it('every skill the ring uses has a plain name and a real-life line', () => {
    const skills = new Set(ALL.map((x) => x.skill));
    for (const s of skills) {
      expect(stop14.skillNames?.[s], s).toBeTruthy();
      expect(S14_WORLD.skills[s]?.length, s).toBeGreaterThan(0);
    }
  });
});
