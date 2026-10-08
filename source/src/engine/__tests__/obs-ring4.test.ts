/**
 * Ring 4 of the Pattern Observatory, Proof Lantern (stop 17): Proved or a guess?, Break it or test it, Why it must
 * continue.
 *
 * Every computed answer is checked a second way: circle regions by adding chords one at a time (1 plus the chords
 * plus, at each crossing point, the chords through it take away 1), claims by walking 300 terms of the stated rule,
 * the coin by listing every way the flips can go, machine and sequence rules re-read from their words and run step by
 * step, odd and even by adding one jump at a time, a lamp or a ferry flipped one step at a time. Acceptance check 9:
 * no picture ever shows a 31 where three chords meet, at any step, and the renderer refuses one.
 */
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { S17_EXAMPLES, SKILL_NAMES_S17, stop17 } from '../../content/stop17';
import { S17_WORLD } from '../../content/world/s17';
import { LanternView } from '../../game/components/scenes/LanternScene';
import { ObservatoryScene } from '../../game/components/scenes/ObservatoryScene';
import { lanternSpeech, observatorySpeech } from '../../game/components/scenes/speech';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { grade } from '../grade';
import { lanternAt, lanternPoints, lanternProblems, maxRegions, mayLabel31, shownRegions, type Pt } from '../puzzles/observatory/lantern';
import * as P from '../puzzles/observatory/proof';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import type { LanternScene } from '../scenes/lantern';
import { feedbackText, teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, MultiItem, NumberItem, Scene } from '../types';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);
const [L1, L2, L3] = stop17.lessons;

// ---------- every item the ring can show ----------

function everyItem(seed: number): { where: string; item: Item }[] {
  const rng = () => createRng(seed);
  const out: { where: string; item: Item }[] = [];
  for (const l of stop17.lessons) {
    l.practice(rng()).forEach((item) => out.push({ where: `${l.id} practice`, item }));
    for (const st of [1, 2, 3] as const) l.review!(rng(), st).forEach((item) => out.push({ where: `${l.id} review ${st}`, item }));
    l.independent!(rng()).forEach((item) => out.push({ where: `${l.id} independent`, item }));
    (l.primer?.(rng()) ?? []).forEach((item) => out.push({ where: `${l.id} primer`, item }));
  }
  stop17.check!(rng()).forEach((item) => out.push({ where: 'check', item }));
  out.push({ where: 'arcade', item: stop17.practice!(rng()) });
  for (const t of [1, 2, 3, 4] as const) for (const lv of [1, 2, 3, 4] as const) {
    const d = stop17.observatory!.diagnostic!(rng(), t, lv);
    if (d) out.push({ where: `diagnostic ${t}/${lv}`, item: d });
  }
  for (const it of L1.practice(rng())) stop17.fresh!(it, rng()).forEach((item) => out.push({ where: `fresh ${it.skill}`, item }));
  for (const it of L2.practice(rng())) stop17.fresh!(it, rng()).forEach((item) => out.push({ where: `fresh ${it.skill}`, item }));
  for (const it of L3.practice(rng())) stop17.fresh!(it, rng()).forEach((item) => out.push({ where: `fresh ${it.skill}`, item }));
  return out;
}

// ---------- the contract's shapes, item by item ----------

function shapeProblems(it: Item): string[] {
  const out: string[] = [];
  if (it.stop !== 17) out.push('stop');
  if (!['s17.l1', 's17.l2', 's17.l3'].includes(it.lesson)) out.push(`lesson ${it.lesson}`);
  if (!(it.skill in SKILL_NAMES_S17)) out.push(`skill ${it.skill} has no plain name`);
  if (!it.prompt.trim() || !it.explain.trim()) out.push('empty prompt or explain');
  if (!it.phase || !it.level) out.push('no phase or level');
  if (!it.twin) out.push('no twin');
  const m = it.meta;
  if (!m) out.push('no meta');
  else {
    if (!m.skill || !m.rule || !m.task || !m.representation) out.push('meta words missing');
    if (m.difficulty < 1 || m.difficulty > 5) out.push('meta difficulty');
    if (m.answerType !== { choose: 'categorical', number: 'number', multi: 'set', order: 'order', tapall: 'set', assign: 'set' }[it.kind]) out.push(`meta answerType ${m.answerType} for ${it.kind}`);
    if (JSON.stringify([...m.tags].sort()) !== JSON.stringify([...new Set(Object.values(it.errorTags ?? {}))].sort())) out.push('meta tags are not the error tags');
    if (m.twin !== it.twin) out.push('meta twin');
    if (m.phase !== it.phase && !(it.phase === 'review')) out.push('meta phase');
  }
  if (it.phase === 'explain' && (it.rubric === undefined || !m?.rubric)) out.push('an explain item without a rubric');
  if (!it.teach?.rule || !it.teach.cases?.length || !it.teach.remember?.length || !it.teach.simpler?.length) out.push('teach incomplete');
  if (!it.hint || it.hint !== it.hints?.[0] || (it.hints?.length ?? 0) < 2) out.push('hints');
  if (!it.hintCase?.label) out.push('no hint case');
  if (it.frame !== undefined && (it.frame.match(/___/g) ?? []).length !== 1) out.push('a frame needs one blank');
  if (JSON.stringify(JSON.parse(JSON.stringify(it))) !== JSON.stringify(it)) out.push('not plain data');
  if (it.kind === 'choose') {
    const ids = it.choices.map((c) => c.id);
    if (ids.length < 2 || ids.length > 5) out.push('choices');
    if (new Set(ids).size !== ids.length || new Set(it.choices.map((c) => c.label.toLowerCase())).size !== ids.length) out.push('repeated choices');
    if (!ids.includes(it.answer)) out.push('answer');
    for (const c of it.choices) {
      if (c.id === it.answer) continue;
      const f = it.feedback?.[c.id];
      if (!f?.headline || !f.detail.length) out.push(`no feedback for ${c.id}`);
      else if (it.whyWrong?.[c.id] !== feedbackText(f)) out.push(`whyWrong ${c.id} out of step`);
    }
    for (const k of Object.keys(it.errorTags ?? {})) if (k === it.answer || !ids.includes(k)) out.push(`error tag on ${k}`);
  }
  if (it.kind === 'number') {
    if (!Number.isInteger(it.answer) || it.answer < 0) out.push('number answer');
    for (const [k, f] of Object.entries(it.feedback ?? {})) {
      if (Number(k) === it.answer || !Number.isInteger(Number(k))) out.push(`number feedback ${k}`);
      if (it.whyWrong?.[k] !== feedbackText(f)) out.push(`number whyWrong ${k}`);
    }
  }
  if (it.kind === 'multi') {
    const ids = it.choices.map((c) => c.id);
    if (!it.answer.every((a) => ids.includes(a))) out.push('multi answer');
    if (JSON.stringify(Object.keys(it.missTips ?? {}).sort()) !== JSON.stringify([...it.answer].sort())) out.push('a miss tip for every needed card');
    if (JSON.stringify(Object.keys(it.pickTips ?? {}).sort()) !== JSON.stringify(ids.filter((i) => !it.answer.includes(i)).sort())) out.push('a pick tip for every other card');
  }
  if (it.scene?.kind === 'lantern') out.push(...lanternProblems(it.scene));
  return out;
}

// ---------- every word a learner reads ----------

function lanternText(s: LanternScene): string[] {
  const frames = [s, ...(s.frames ?? [])];
  return [
    s.stated ?? '',
    ...(s.steps ?? []).flatMap((st) => [st.label, st.say]),
    ...frames.flatMap((f) => [f.claim ?? '', ...(f.rows ?? []).flatMap((r) => [r.label, ...r.cells, r.tag ?? '']), ...(f.claims ?? []).map((c) => c.text), ...(f.chain ?? []).map((l) => l.text)]),
  ].filter(Boolean);
}
function sceneText(s: Scene | undefined): string[] {
  if (!s) return [];
  if (s.kind === 'lantern') return lanternText(s);
  if (s.kind === 'contrast') return [...s.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), s.ask?.q ?? '', s.ask?.a ?? ''].filter(Boolean);
  return [];
}
function itemText(it: Item): string[] {
  const out = [it.prompt, it.explain, it.frame ?? '', ...teachStrings(it), ...(it.hints ?? []), ...sceneText(it.scene)];
  if (it.kind === 'choose') out.push(...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
  if (it.kind === 'number') out.push(...Object.values(it.feedback ?? {}).flatMap((f) => [f.headline, ...f.detail]), it.unit ?? '');
  if (it.kind === 'multi') out.push(...it.choices.map((c) => c.label), ...Object.values(it.missTips ?? {}), ...Object.values(it.pickTips ?? {}));
  return out.filter(Boolean);
}
const boardText = (st: DrillStep): string[] => [
  st.title, ...st.body, st.done, st.twin ?? '', ...(st.steps ?? []), ...Object.values(st.words ?? {}),
  ...st.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
  ...sceneText(st.scene),
].filter(Boolean);
const cardText = (c: { title: string; body: string[]; scene?: Scene }) => [c.title, ...c.body, ...sceneText(c.scene)];

const SYMBOLS = /[=+×−→✓<>%]/;
function styleProblems(text: string): string[] {
  const out: string[] = [];
  if (/['"]/.test(text)) out.push(`straight quote: ${text}`);
  if (SYMBOLS.test(text)) out.push(`symbol: ${text}`);
  if (/\bwrong\b/i.test(text) && /^wrong/i.test(text)) out.push(`says Wrong: ${text}`);
  if (/\btry again\b/i.test(text)) out.push(`only says try again: ${text}`);
  if (longestSentence(text).words > READING.maxSentenceWords) out.push(`long sentence: ${longestSentence(text).sentence}`);
  return out;
}

// ---------- second methods ----------

/** Regions by adding chords one at a time: 1, plus 1 per chord, plus (chords through it take away 1) at each crossing point. */
function regionsByChords(pts: Pt[]): { regions: number; triple: boolean } {
  const n = pts.length;
  const chords: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) chords.push([i, j]);
  const found: { x: number; y: number; ch: Set<number> }[] = [];
  chords.forEach(([a, b], i) => chords.forEach(([c, d], j) => {
    if (j <= i || a === c || a === d || b === c || b === d) return;
    const p = pts[a], q = pts[b], r = pts[c], s = pts[d];
    const den = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (Math.abs(den) < 1e-12) return;
    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / den;
    const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / den;
    if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return;
    const x = p.x + t * (q.x - p.x), y = p.y + t * (q.y - p.y);
    const near = found.find((f) => Math.hypot(f.x - x, f.y - y) < 1e-7);
    if (near) { near.ch.add(i); near.ch.add(j); } else found.push({ x, y, ch: new Set([i, j]) });
  }));
  return { regions: 1 + chords.length + found.reduce((k, f) => k + f.ch.size - 1, 0), triple: found.some((f) => f.ch.size >= 3) };
}
const realCount = (points: number, regular: boolean, chords = true) => (points <= 1 || !chords ? 1 : regionsByChords(lanternPoints(points, regular)).regions);

/** Terms of "start at a, add d", one addition at a time. */
function walk(a: number, d: number, n: number): number[] {
  const out = [a];
  while (out.length < n) out.push(out[out.length - 1] + d);
  return out;
}
const isOdd = (x: number) => x % 2 === 1;
const parityWord = (x: number) => (isOdd(x) ? 'odd' : 'even');
const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);

/** A machine rule read back from its words. */
function machineRule(w: string): (x: number) => number {
  let m: RegExpMatchArray | null;
  if (w === 'double') return (x) => x + x;
  if ((m = w.match(/^add (\d+)$/))) return (x) => x + Number(m![1]);
  if ((m = w.match(/^times (\d+)$/))) return (x) => Array.from({ length: Number(m![1]) }, () => x).reduce((s, v) => s + v, 0);
  if ((m = w.match(/^times (\d+), then add (\d+)$/))) return (x) => Array.from({ length: Number(m![1]) }, () => x).reduce((s, v) => s + v, 0) + Number(m![2]);
  throw new Error(`rule words: ${w}`);
}
/** A sequence rule read back from its words, its terms made one step at a time. */
function seqTerms(w: string, n: number): number[] {
  let m: RegExpMatchArray | null;
  const out: number[] = [];
  if ((m = w.match(/^start at (\d+) and add (\d+) each time$/))) { const d = Number(m[2]); out.push(Number(m[1])); while (out.length < n) out.push(out[out.length - 1] + d); return out; }
  if ((m = w.match(/^start at (\d+) and double each time$/))) { out.push(Number(m[1])); while (out.length < n) out.push(out[out.length - 1] * 2); return out; }
  if ((m = w.match(/^start at (\d+) and multiply by (\d+) each time$/))) { const k = Number(m[2]); out.push(Number(m[1])); while (out.length < n) out.push(out[out.length - 1] * k); return out; }
  if ((m = w.match(/^start at (\d+), then add (\d+), then (\d+), then (\d+), and so on$/))) { const d = Number(m[2]); out.push(Number(m[1])); while (out.length < n) out.push(out[out.length - 1] + d * out.length); return out; }
  throw new Error(`sequence words: ${w}`);
}

/** What the claim says about a sequence, re-read from the claim: [in the group, holds]. */
function claimTest(claim: string): (xs: number[]) => [boolean, boolean] {
  const grows = (xs: number[]) => xs.slice(1).every((x, i) => x > xs[i]);
  const steps = (xs: number[]) => xs.slice(1).map((x, i) => x - xs[i]);
  if (claim === 'Every growing number sequence doubles.') return (xs) => [grows(xs), xs.slice(1).every((x, i) => x === xs[i] + xs[i])];
  if (claim === 'Every sequence that adds 2 each time has only even numbers.') return (xs) => [steps(xs).every((s) => s === 2), xs.every((x) => !isOdd(x))];
  if (claim === 'Every growing number sequence adds the same number each time.') return (xs) => [grows(xs), new Set(steps(xs)).size === 1];
  if (claim === 'Every number sequence that starts with an odd number has only odd numbers.') return (xs) => [isOdd(xs[0]), xs.every(isOdd)];
  throw new Error(`claim: ${claim}`);
}
const seqOf = (label: string) => label.split(', ').map(Number);

/** The answer worked out again from what the item shows. null: no second method for this skill. */
function recheck(it: Item): boolean | null {
  const sc = it.scene?.kind === 'lantern' ? it.scene : undefined;
  const label = (c: ChooseItem, id: string) => c.choices.find((x) => x.id === id)!.label;
  switch (it.skill) {
    case 's17.proof-status': {
      if (it.kind !== 'choose' || !sc) return false;
      const shown = sc.rows![0].cells.map(Number);
      const claim = sc.claim!;
      const over = claim.match(/more than (\d+)/);
      const holds = (x: number) => (over ? x > Number(over[1]) : /odd/.test(claim) ? isOdd(x) : !isOdd(x));
      let want: string;
      if (shown.some((x) => !holds(x))) want = 'false';
      else if (sc.pattern === 'observed') want = 'tentative';
      else {
        const [a, d] = nums(sc.stated!);
        const terms = walk(a, d, 300);
        if (JSON.stringify(terms.slice(0, shown.length)) !== JSON.stringify(shown)) return false;
        want = terms.every(holds) ? 'proved' : 'unsettled';
      }
      return it.answer === want;
    }
    case 's17.circle-max': {
      if (it.kind !== 'choose' || !sc) return false;
      const real = regionsByChords(lanternPoints(sc.points, !!sc.regular));
      if (sc.regions !== undefined && sc.regions !== real.regions) return false;
      const a = label(it, it.answer);
      if (it.answer === 'breaks') return !sc.regular && real.regions === maxRegions(6) && real.regions !== 2 * realCount(5, false) && a.includes(String(real.regions));
      if (it.answer === 'meet' || it.answer === 'no') return !!sc.regular && real.triple && real.regions === maxRegions(6) - 1;
      return false;
    }
    case 's17.independence': {
      if (it.kind !== 'choose') return false;
      const k = Number(it.prompt.match(/(\d+) times in a row/)![1]);
      let same = 0, other = 0;
      for (let mask = 0; mask < 2 ** (k + 1); mask++) {
        const s = mask.toString(2).padStart(k + 1, '0');
        if (s.slice(0, k) !== '1'.repeat(k)) continue;
        if (s[k] === '1') same++; else other++;
      }
      return same === other && it.answer === 'same';
    }
    case 's17.more-evidence': {
      if (it.kind !== 'choose') return false;
      const v = nums(it.prompt.split('.')[1]);
      return v.length === 3 && v[0] > v[1] && v[1] > v[2] && it.answer === 'no';
    }
    case 's17.counterexample': {
      if (it.kind !== 'choose') return false;
      const claim = it.prompt.match(/“(.+)”/)![1];
      const test = claimTest(claim);
      const breaks = it.choices.filter((c) => { const [g, h2] = test(seqOf(c.label)); return g && !h2; });
      return breaks.length === 1 && breaks[0].id === it.answer;
    }
    case 's17.why-counter': {
      if (it.kind !== 'choose') return false;
      const claim = it.prompt.match(/claim “(.+?)”/)![1];
      const test = claimTest(claim);
      const fit = seqOf(it.prompt.match(/like ([\d, ]+)\./)![1]);
      const brk = seqOf(it.prompt.match(/finds ([\d, ]+), which/)![1]);
      const [g1, h1] = test(fit), [g2, h2] = test(brk);
      return g1 && h1 && g2 && !h2 && it.answer === 'false';
    }
    case 's17.separate': {
      if (it.kind !== 'choose') return false;
      let m: RegExpMatchArray | null;
      if ((m = it.prompt.match(/two rules: “(.+)” or “(.+)”\. Input (\d+) gave (\d+)\./))) {
        const A = machineRule(m[1]), B = machineRule(m[2]);
        const x0 = Number(m[3]), y0 = Number(m[4]);
        if (A(x0) !== y0 || B(x0) !== y0) return false;
        const s = Number(label(it, it.answer).match(/Feed in (\d+)\./)![1]);
        const again = it.choices.find((c) => c.id === 'again');
        const bigger = it.choices.find((c) => c.id === 'bigger');
        return A(s) !== B(s) && (!again || nums(again.label)[0] === x0) && (!bigger || (A(s) > s && B(s) > s));
      }
      if ((m = it.prompt.match(/Rule A: (.+)\. Rule B: (.+)\. So far it shows (.+)\. Which/))) {
        const shown = (m[3].match(/\d+/g) ?? []).map(Number);
        const tA = seqTerms(m[1], 8), tB = seqTerms(m[2], 8);
        if (!shown.every((x, i) => tA[i] === x && tB[i] === x)) return false;
        const j = Number(label(it, it.answer).match(/term (\d+)/)![1]);
        const again = it.choices.find((c) => c.id === 'again');
        const bigger = it.choices.find((c) => c.id === 'bigger');
        const k = shown.length;
        return tA[j - 1] !== tB[j - 1] && (!again || tA[nums(again.label)[0] - 1] === tB[nums(again.label)[0] - 1]) && (!bigger || (tA[k] > tA[k - 1] && tB[k] > tB[k - 1]));
      }
      const c = P.CAUSES.find((x) => it.prompt.startsWith(x.problem))!;
      const differ = (l: string) => l.toLowerCase().includes(c.a.fix) !== l.toLowerCase().includes(c.b.fix);
      const apart = it.choices.filter((x) => differ(x.label));
      return apart.length === 1 && apart[0].id === it.answer;
    }
    case 's17.rule-out': {
      if (it.kind !== 'choose') return false;
      const g = P.GROUPS.find((x) => it.prompt.includes(`Every ${x.noun} ${x.here} is ${x.yes}.`))!;
      const out = it.choices.filter((x) => x.label.endsWith(g.here) && !x.label.includes(` ${g.yes} `));
      return out.length === 1 && out[0].id === it.answer;
    }
    case 's17.why-guess': {
      if (it.kind !== 'choose') return false;
      if (sc?.points) return realCount(6, false) !== 2 * realCount(5, false) && it.answer === 'reason';
      if (sc?.pattern === 'observed') {
        const v = sc.rows![0].cells.map(Number);
        const d = v[1] - v[0];
        const [day, pred] = [Number(it.prompt.match(/on \w+ (\d+)\./)![1]), Number(it.prompt.match(/be (\d+)/)![1])];
        return v.every((x, i) => i === 0 || x - v[i - 1] === d) && walk(v[0], d, day)[day - 1] === pred && it.answer === 'reason';
      }
      const [a, d] = nums(sc!.stated!);
      const p = /an odd/.test(it.prompt) ? 1 : 0;
      return walk(a, d, 200).every((x) => x % 2 === p) && it.answer === 'reason';
    }
    case 's17.why-continue': {
      if (it.kind !== 'choose') return false;
      const [a, d] = nums(it.prompt.match(/start at \d+ and add \d+/)![0]);
      const listed = nums(it.prompt.match(/terms are ([\d, and]+)\./)![1]);
      const t = walk(a, d, 200);
      const alternate = t.every((x, i) => i === 0 || isOdd(x) !== isOdd(t[i - 1]));
      const same = t.every((x) => isOdd(x) === isOdd(a));
      return JSON.stringify(t.slice(0, listed.length)) === JSON.stringify(listed) && (isOdd(d) ? alternate : same) && it.answer === 'no';
    }
    case 's17.parity-step': {
      if (it.kind !== 'choose') return false;
      const [a, d, n] = nums(it.prompt);
      return it.answer === parityWord(walk(a, d, n)[n - 1]);
    }
    case 's17.reason-chain': {
      if (it.kind !== 'multi') return false;
      const [a, d] = nums(it.prompt);
      const [t1, t2] = walk(a, d, 2);
      const needed = it.choices.filter((c) => it.answer.includes(c.id)).map((c) => c.label);
      return isOdd(d) && it.answer.length === 4 &&
        needed.includes(`Start at ${a}, which is ${parityWord(t1)}.`) &&
        needed.includes(`Adding ${d}, an odd number, turns ${parityWord(t1)} into ${parityWord(t2)}.`) &&
        needed.includes(`Adding ${d} again turns ${parityWord(t2)} back into ${parityWord(t1)}.`);
    }
    case 's17.jumps': {
      if (it.kind !== 'number') return false;
      const n = Number(it.prompt.match(/to term (\d+)/)![1]);
      let gaps = 0;
      for (let t = 1; t < n; t++) gaps++;
      return it.answer === gaps;
    }
    case 's17.must-continue': {
      if (it.kind !== 'choose') return false;
      let m: RegExpMatchArray | null;
      if ((m = it.prompt.match(/After (\d+) claps/))) { let on = false; for (let i = 0; i < Number(m[1]); i++) on = !on; return it.answer === (on ? 'on' : 'off'); }
      if ((m = it.prompt.match(/After (\d+) trips/))) { let north = true; for (let i = 0; i < Number(m[1]); i++) north = !north; return it.answer === (north ? 'north' : 'south'); }
      if ((m = it.prompt.match(/Row 1 of a hall has (\d+) seats\. Each row has (\d+) more seats .* Does row (\d+)/))) {
        const [a, d, n] = m.slice(1).map(Number);
        return it.answer === parityWord(walk(a, d, n)[n - 1]);
      }
      if ((m = it.prompt.match(/stone (\d+)\. Each hop takes it (\d+) stones ahead\. .* After (\d+) hops/))) {
        const [a, d, hops] = m.slice(1).map(Number);
        let stone = a;
        for (let i = 0; i < hops; i++) stone += d;
        return it.answer === parityWord(stone);
      }
      return false;
    }
  }
  return null;
}

// =====================================================================================================================

describe('the circle regions (acceptance check 9)', () => {
  it('the counts are 1, 2, 4, 8, 16, 31 by a second method; the doubling guess is 32; the regular hexagon has 30', () => {
    for (let n = 1; n <= 6; n++) {
      const general = regionsByChords(lanternPoints(n, false));
      expect(general.triple, `n=${n}`).toBe(false);
      expect(P.COUNTS[n - 1], `n=${n}`).toBe(n === 1 ? 1 : general.regions);
      expect(P.COUNTS[n - 1]).toBe(maxRegions(n));
    }
    expect(P.GUESS).toBe(32);
    expect(P.MOST6).toBe(31);
    const hex = regionsByChords(lanternPoints(6, true));
    expect(hex.triple).toBe(true);
    expect(P.HEX).toBe(hex.regions);
    expect(P.HEX).toBe(30);
    expect(regionsByChords(lanternPoints(5, true)).triple).toBe(false);
    expect(P.PENTA).toBe(16);
  });

  it('no picture anywhere (cards, boards, items, at every step) shows a 31 on a drawing where three chords meet', () => {
    const scenes: LanternScene[] = [];
    for (const l of stop17.lessons) {
      for (const c of l.ideas) if (c.scene?.kind === 'lantern') scenes.push(c.scene);
      for (const b of l.drill ?? []) if (b.scene?.kind === 'lantern') scenes.push(b.scene);
    }
    for (const seed of SEEDS) for (const { item } of everyItem(seed)) if (item.scene?.kind === 'lantern') scenes.push(item.scene);
    let thirtyOnes = 0;
    for (const s of scenes) {
      expect(lanternProblems(s), JSON.stringify(s)).toEqual([]);
      for (let shown = 0; shown <= (s.steps?.length ?? 0); shown++) {
        const v = lanternAt(s, shown);
        if (v.points === 0) continue;
        const real = regionsByChords(lanternPoints(v.points, !!v.regular));
        if (v.regions !== undefined) expect(v.regions, JSON.stringify(v)).toBe(v.chords ? (v.points === 1 ? 1 : real.regions) : 1);
        if (v.regions === 31) {
          thirtyOnes++;
          expect(v.regular, 'a 31 label on evenly spaced points').toBeFalsy();
          expect(real.triple).toBe(false);
          expect(mayLabel31(lanternPoints(v.points, !!v.regular))).toBe(true);
        }
        const shownCount = shownRegions(v);
        if (shownCount === 31) expect(real.triple).toBe(false);
      }
    }
    expect(thirtyOnes).toBeGreaterThan(0);
  });

  it('the renderer and the read-aloud refuse a 31 where three chords meet', () => {
    const bad: LanternScene = { kind: 'lantern', points: 6, chords: true, regular: true, regions: 31 };
    const html = renderToString(h(LanternView, { scene: bad, shown: 0 }));
    expect(html).not.toMatch(/<strong>31<\/strong>/);
    expect(html).toMatch(/<strong>30<\/strong>/);
    expect(lanternSpeech(bad).join(' ')).not.toMatch(/Regions: 31/);
    const good: LanternScene = { kind: 'lantern', points: 6, chords: true, regions: 31 };
    expect(renderToString(h(LanternView, { scene: good, shown: 0 }))).toMatch(/<strong>31<\/strong>/);
    // The worked guess: 16 before the drawing, 31 and False after it.
    const g = S17_EXAMPLES.GUESS_SCENE;
    expect(renderToString(h(LanternView, { scene: g, shown: 0 }))).toMatch(/<strong>16<\/strong>/);
    const after = renderToString(h(LanternView, { scene: g, shown: 2 }));
    expect(after).toMatch(/<strong>31<\/strong>/);
    expect(after).toMatch(/False/);
    const hexAfter = renderToString(h(LanternView, { scene: S17_EXAMPLES.HEX_SCENE, shown: 1 }));
    expect(hexAfter).toMatch(/<strong>30<\/strong>/);
    expect(hexAfter).toMatch(/three chords meet/);
  });
});

describe('every place generates its contract shapes (seeds 1-40)', () => {
  it('every item from every set has its meta, phase, level, teach, hints, feedback for every wrong answer and plain data', () => {
    for (const seed of SEEDS) for (const { where, item } of everyItem(seed)) expect(shapeProblems(item), `${where} seed ${seed} ${item.id}`).toEqual([]);
  });

  it('every answer is right by a second method', () => {
    const covered = new Set<string>();
    for (const seed of SEEDS) {
      for (const { where, item } of everyItem(seed)) {
        const ok = recheck(item);
        expect(ok, `${where} seed ${seed} ${item.skill}: ${item.prompt}`).not.toBe(false);
        if (ok) covered.add(item.skill);
      }
    }
    expect([...covered].sort()).toEqual(Object.keys(SKILL_NAMES_S17).sort());
  });

  it('grading agrees: the right answer passes, every wrong choice gets its own words', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      for (const { item } of everyItem(seed)) {
        if (item.kind === 'choose') {
          expect(grade(item, { kind: 'choose', id: item.answer }).correct).toBe(true);
          for (const c of item.choices) if (c.id !== item.answer) expect(grade(item, { kind: 'choose', id: c.id }).feedback).toBe(feedbackText(item.feedback![c.id]));
        }
        if (item.kind === 'number') {
          expect(grade(item, { kind: 'number', value: item.answer }).correct).toBe(true);
          expect(grade(item, { kind: 'number', value: item.answer + 1 }).feedback).toBe(feedbackText(item.feedback![String(item.answer + 1)]));
          expect(grade(item, { kind: 'number', value: item.answer - 1 }).feedback).toBe(feedbackText(item.feedback![String(item.answer - 1)]));
        }
        if (item.kind === 'multi') {
          expect(grade(item, { kind: 'multi', ids: item.answer }).correct).toBe(true);
          const g = grade(item, { kind: 'multi', ids: item.answer.slice(1) });
          expect(g.feedback).toBe((item as MultiItem).missTips![item.answer[0]]);
        }
      }
    }
  });

  it('each pack runs in phase order: explain first, a faded do with one blank, the same task with no frame, then transfer; the trap is in every pack', () => {
    for (const l of stop17.lessons) {
      for (const seed of SEEDS) {
        const pack = l.practice(createRng(seed));
        expect(pack.length).toBeGreaterThanOrEqual(3);
        expect(pack.length).toBeLessThanOrEqual(5);
        const phases = pack.map((x) => x.phase);
        expect(phases[0], `${l.id} seed ${seed}`).toBe('explain');
        expect(phases[phases.length - 1], `${l.id} seed ${seed}`).toBe('transfer');
        expect(phases.slice(1, -1).every((p) => p === 'do')).toBe(true);
        expect(pack[1].frame, `${l.id}: the first do item is faded`).toMatch(/___/);
        expect(pack[2].frame, `${l.id}: then the same task with no frame`).toBeUndefined();
        expect(pack[2].skill).toBe(pack[1].skill);
        for (const it of pack) expect(it.lesson).toBe(l.id);
        for (const g of l.pass!.include!) expect(pack.some((x) => x.tags?.includes(g.tag)), `${l.id} seed ${seed} trap ${g.tag}`).toBe(true);
        expect(new Set(pack.map(looks)).size).toBe(pack.length);
      }
    }
  });

  it('review gives 4 fresh review items; independent gives 6 with an error-tagged item and an explain item; the primer gives 3', () => {
    for (const l of stop17.lessons) {
      for (const seed of SEEDS) {
        for (const st of [1, 2, 3] as const) {
          const r = l.review!(createRng(seed), st);
          expect(r).toHaveLength(4);
          expect(r.every((x) => x.phase === 'review' && x.meta?.phase === 'review')).toBe(true);
          expect(new Set(r.map(looks)).size).toBe(4);
        }
        const ind = l.independent!(createRng(seed));
        expect(ind).toHaveLength(6);
        expect(new Set(ind.map(looks)).size).toBe(6);
        expect(ind.some((x) => Object.keys(x.errorTags ?? {}).length > 0)).toBe(true);
        expect(ind.some((x) => x.phase === 'explain')).toBe(true);
        expect(ind.some((x) => x.phase === 'transfer')).toBe(true);
      }
    }
    for (const seed of SEEDS) {
      const pr = L1.primer!(createRng(seed));
      expect(pr).toHaveLength(3);
      expect(pr.every((x) => x.skill === 's17.counterexample' || x.skill === 's17.rule-out')).toBe(true);
      expect(new Set(pr.map(looks)).size).toBe(3);
    }
  });

  it('Break it has the sampling item (the handoff’s l2): a card that tests “tails is due”, and a coin item in its checks', () => {
    expect(L2.ideas.some((c) => c.scene === S17_EXAMPLES.DUE_SCENE)).toBe(true);
    for (const seed of SEEDS) {
      expect(L2.independent!(createRng(seed)).some((x) => x.skill === 's17.independence' && x.lesson === 's17.l2' && x.level === 3), `seed ${seed}`).toBe(true);
    }
    const reviews = SEEDS.flatMap((seed) => L2.review!(createRng(seed), 1));
    expect(reviews.some((x) => x.skill === 's17.independence' && x.lesson === 's17.l2')).toBe(true);
    // A missed coin on Break it gets two new coin items on Break it, at its level.
    const coin = L2.independent!(createRng(1)).find((x) => x.skill === 's17.independence')!;
    const again = stop17.fresh!(coin, createRng(2));
    expect(again.map((x) => [x.skill, x.lesson, x.level])).toEqual([['s17.independence', 's17.l2', 3], ['s17.independence', 's17.l2', 3]]);
  });

  it('places open on skills: l1 needs the Rule Machine (s15.l2) or its counterexample primer; l2 needs l1; l3 needs l2', () => {
    expect(stop17.lessons.map((l) => [l.id, l.requires, l.levels, l.track, l.routine])).toEqual([
      ['s17.l1', ['s15.l2'], [2, 2], 4, true],
      ['s17.l2', ['s17.l1'], [3, 3], 4, true],
      ['s17.l3', ['s17.l2'], [4, 4], 4, true],
    ]);
    expect(L1.primer).toBeTypeOf('function');
    expect(stop17.ready).toBe(true);
    expect(stop17.requires).toEqual([]);
    expect(stop17.lessonOrder).toBe('free');
    // The card line recommends Stop 7, Lesson 1 (Pattern guesses), never a lock.
    expect(L1.ideas.some((c) => c.body.some((b) => /Stop 7, Pattern guesses/.test(b)))).toBe(true);
    expect(L1.requires).not.toContain('s7.l1');
  });
});

describe('cards and boards', () => {
  it('every lantern card is stepped with a frame per step, and its counts, verdicts and roles are computed', () => {
    const E = S17_EXAMPLES;
    // Card 1: one point at a time.
    expect(E.BUILD_SCENE.frames!.map((f) => f.regions)).toEqual([2, 3, 4, 5].map((n) => realCount(n, false)));
    // The contrast: the same numbers, told by a rule (proved) or only seen (a good guess).
    expect(E.CONTRAST.kind === 'contrast' && E.CONTRAST.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(walk(1, 2, 4)).toEqual(E.ODD_RULE.shown);
    expect(walk(1, 2, 300).every(isOdd)).toBe(true);
    // The tests on Break it: 1, 2, 4, 8 and 3, 6, 12, 24 fit; 1, 2, 3, 4 breaks it; 16, 8, 4, 2 says nothing.
    const doubles = claimTest(P.FAMILIES.doubles.claim);
    expect(E.TEST_CASES.map(doubles)).toEqual([[true, true], [true, true], [true, false]]);
    expect(E.NEED_CASES.map(doubles)).toEqual([[false, false], [true, false]]);
    expect(E.BUS.findings.map(P.rulesOut)).toEqual([false, false, true]);
    // The sampling card on Break it: every way two fair flips can go; after heads, one ends heads and one ends tails.
    expect(E.DUE_SCENE.rows!.map((r) => r.cells.join(' '))).toEqual(['heads heads', 'heads tails', 'tails heads', 'tails tails']);
    const dueEnd = lanternAt(E.DUE_SCENE, E.DUE_SCENE.steps!.length);
    const afterHeads = dueEnd.rows!.filter((r) => r.cells[0] === 'heads').map((r) => r.cells[1]);
    expect(afterHeads.filter((x) => x === 'heads').length).toBe(afterHeads.filter((x) => x === 'tails').length);
    expect(dueEnd.rows!.filter((r) => r.lit).map((r) => r.tag)).toEqual(afterHeads.map((x) => `ends ${x}`));
    expect(dueEnd.status).toBe('false');
    let same5 = 0, other5 = 0;
    for (let m = 0; m < 64; m++) { const w = m.toString(2).padStart(6, '0'); if (w.startsWith('11111')) { if (w[5] === '1') same5++; else other5++; } }
    expect(same5).toBe(other5);
    // Why it must continue: term 20 of start at 1, add 3 is 58, even; term 100 is even too.
    expect(walk(1, 3, 20)[19]).toBe(E.FAR_T);
    expect(parityWord(E.FAR_T)).toBe('even');
    expect(parityWord(walk(1, 3, 100)[99])).toBe(parityWord(E.FAR_100));
    // Every stepped lantern has one frame per step at most, and the chain lights in order.
    for (const l of stop17.lessons) for (const c of l.ideas) {
      if (c.scene?.kind !== 'lantern' || !c.scene.steps?.length) continue;
      expect((c.scene.frames ?? []).length).toBeLessThanOrEqual(c.scene.steps.length);
      const s = c.scene;
      if (s.chain) for (let k = 0; k <= s.steps!.length; k++) expect((lanternAt(s, k).chain ?? []).filter((x) => x.lit).length).toBe(Math.min(k, s.chain.length));
    }
    expect(E.CHAIN_SCENE.chain!.map((x) => x.text)).toEqual([
      'Start at 1, which is odd.',
      'Adding 3, an odd number, turns odd into even.',
      'Adding 3 again turns even back into odd.',
      'The same step happens every time, so odd and even keep taking turns.',
    ]);
  });

  it('every board: the first is fully scaffolded, its scene is a card’s scene (or a stated twin), every wrong option has words, the right marks pass', () => {
    for (const l of stop17.lessons) {
      const boards = l.drill!;
      expect(boards.length).toBeGreaterThan(0);
      expect(boards[0].scaffold, l.id).toBe('full');
      const cards = l.ideas.map((c) => JSON.stringify(c.scene));
      for (const b of boards) {
        expect(cards.includes(JSON.stringify(b.scene)) || !!b.twin, b.id).toBe(true);
        const tap = marksToTap(b);
        expect(checkDrill(b, Object.fromEntries(tap.map((m) => [m.id, m.answer]))).done, b.id).toBe(true);
        for (const m of tap) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id], `${b.id} ${m.id} ${o.id}`).toBeTruthy();
        expect(tap.length, `${b.id}: phone-sized`).toBeLessThanOrEqual(12);
      }
    }
  });

  it('every board answer is right by a second method', () => {
    const answers = (b: DrillStep) => b.rows.map((r) => r.marks.map((m) => m.answer));
    const E = S17_EXAMPLES;
    const verdict = (m: (typeof E.BOARD_A_CLAIMS)[number]) => {
      const holds = (x: number) => (m.prop.t === 'over' ? x > m.prop.k : m.prop.t === 'odd' ? isOdd(x) : !isOdd(x));
      if (m.shown.some((x) => !holds(x))) return 'false';
      if (m.source === 'seen') return 'tentative';
      return walk(m.start, m.step, 300).every(holds) ? 'proved' : 'unsettled';
    };
    const [a, b, c] = L1.drill!;
    expect(answers(a)).toEqual(E.BOARD_A_CLAIMS.map((m) => [verdict(m)]));
    expect(answers(b)).toEqual([[String(realCount(5, false)), String(realCount(6, false)), String(realCount(6, true))], ['false']]);
    expect(answers(c)).toEqual(E.BOARD_C_CLAIMS.map((m) => [verdict(m)]));
    const [d, e] = L2.drill!;
    const doubles = claimTest(P.FAMILIES.doubles.claim);
    expect(answers(d)).toEqual(E.L2_BOARD_CASES.map((xs) => { const [g, h2] = doubles(xs); return [!g ? 'nothing' : h2 ? 'fits' : 'breaks']; }));
    expect(answers(e)).toEqual([1, 2, 5].map((x) => [x + 2 !== x + x ? 'yes' : 'no']));
    const [f, g] = L3.drill!;
    const t = walk(1, 3, 7);
    expect(answers(f)).toEqual([[parityWord(t[5])], [parityWord(t[6])], ['no']]);
    // The twin chain: each step's place in the reason for start at 4, add 5.
    const [t1, t2] = walk(E.TWIN_A, E.TWIN_D, 2);
    const chain = [`Start at ${t1}, which is ${parityWord(t1)}.`, `Adding ${E.TWIN_D}, an odd number, turns ${parityWord(t1)} into ${parityWord(t2)}.`, `Adding ${E.TWIN_D} again turns ${parityWord(t2)} back into ${parityWord(t1)}.`];
    for (const r of g.rows) {
      const at = chain.indexOf(r.label);
      expect(r.marks[0].answer, r.label).toBe(String(at >= 0 ? at : 3));
    }
  });
});

describe('words: curly quotes, no symbols, short sentences, the reading level', () => {
  it('cards, boards, every item, every scene step and the real-life pack follow the style rules', () => {
    const texts: string[] = [];
    for (const l of stop17.lessons) {
      texts.push(l.title, ...l.ideas.flatMap(cardText), ...(l.drill ?? []).flatMap(boardText));
      for (const d of l.distinctions ?? []) texts.push(d.a, d.b);
    }
    for (const seed of SEEDS.slice(0, 15)) for (const { item } of everyItem(seed)) texts.push(...itemText(item));
    texts.push(S17_WORLD.stop, ...Object.values(S17_WORLD.lessons).flatMap((w) => [w.why, ...w.uses.flatMap((u) => [u.who, u.text])]), ...Object.values(S17_WORLD.skills).flat());
    for (const name of Object.values(SKILL_NAMES_S17)) texts.push(name);
    const problems = [...new Set(texts.flatMap(styleProblems))];
    expect(problems).toEqual([]);
    for (const t of texts) expect(t).not.toMatch(/['"]/);
  });

  it('each place reads at a 6th-grade level: its cards with every scene line, its boards, and its items with every feedback', () => {
    for (const l of stop17.lessons) {
      const cards = l.ideas.flatMap(cardText).join('\n');
      const boards = (l.drill ?? []).flatMap(boardText).join('\n');
      const items = [1, 2, 3, 4, 5].flatMap((s) => [...l.practice(createRng(s)), ...l.independent!(createRng(s))]).flatMap(itemText).join('\n');
      for (const [what, text] of [['cards', cards], ['boards', boards], ['items', items]] as const) {
        expect(fkGrade(text), `${l.id} ${what}`).toBeLessThanOrEqual(READING.maxGrade);
        expect(longestSentence(text).words, `${l.id} ${what}: ${longestSentence(text).sentence}`).toBeLessThanOrEqual(READING.maxSentenceWords);
      }
    }
  });

  it('every prompt says which kind of pattern it is where it matters: a stated rule, or only what was seen', () => {
    for (const seed of SEEDS) {
      for (const { item } of everyItem(seed)) {
        if (['s17.proof-status', 's17.parity-step', 's17.why-continue', 's17.reason-chain', 's17.jumps', 's17.must-continue'].includes(item.skill)) {
          expect(item.prompt, item.prompt).toMatch(/stated rule|rule is stated|No rule was given/);
        }
        if (item.skill === 's17.more-evidence') expect(item.prompt).toMatch(/only the times seen/);
      }
    }
  });

  it('every picture reads aloud and draws at every step without symbols or straight quotes', () => {
    for (const l of stop17.lessons) {
      for (const c of l.ideas) {
        if (!c.scene || c.scene.kind !== 'lantern') continue;
        for (let k = 0; k <= (c.scene.steps?.length ?? 0); k++) {
          const lines = observatorySpeech(c.scene, k);
          expect(lines.length).toBeGreaterThan(0);
          for (const line of lines) expect(styleProblems(line), line).toEqual([]);
          expect(() => renderToString(h(ObservatoryScene, { scene: c.scene as LanternScene, revealed: k }))).not.toThrow();
        }
      }
    }
  });
});

describe('the Ring Check, the Arcade, new examples and the diagnostic', () => {
  it('the check has 9 items, every place, conflict items, and is new on almost every seed', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop17.check!(createRng(seed));
      expect(items).toHaveLength(9);
      for (const l of stop17.lessons) expect(items.some((x) => x.lesson === l.id)).toBe(true);
      expect(items.filter((x) => x.conflict).length).toBeGreaterThanOrEqual(1);
      expect(new Set(items.map(looks)).size).toBe(9);
      seen.add(JSON.stringify(items.map((x) => [x.prompt, x.scene])));
    }
    expect(seen.size).toBeGreaterThanOrEqual(280);
  });

  it('new examples after a miss: the same skill twice, different from each other; a missed verdict gets the same verdict and another', () => {
    for (const seed of SEEDS) {
      for (const l of stop17.lessons) {
        for (const it of l.practice(createRng(seed))) {
          const set = stop17.fresh!(it, createRng(seed + 1));
          if (!set.length) continue;
          expect(set).toHaveLength(2);
          expect(set.every((x) => x.skill === it.skill && x.lesson === it.lesson && x.level === it.level)).toBe(true);
          expect(set.every((x) => !x.frame)).toBe(true);
          expect(new Set(set.map(looks)).size).toBe(2);
          if (it.skill === 's17.proof-status' && it.kind === 'choose') {
            const answers = set.map((x) => (x as ChooseItem).answer);
            expect(answers[0]).toBe(it.answer);
            expect(answers[1]).not.toBe(it.answer);
          }
        }
      }
    }
  });

  it('the diagnostic: Track 4 only, “proved or a good guess?” at L2 and a counterexample at L3', () => {
    for (const seed of SEEDS) {
      const d = stop17.observatory!.diagnostic!;
      for (const t of [1, 2, 3] as const) for (const lv of [1, 2, 3, 4] as const) expect(d(createRng(seed), t, lv)).toBeNull();
      expect(d(createRng(seed), 4, 1)).toBeNull();
      expect(d(createRng(seed), 4, 4)).toBeNull();
      const l2 = d(createRng(seed), 4, 2) as ChooseItem;
      expect(l2.lesson).toBe('s17.l1');
      expect(l2.skill).toBe('s17.proof-status');
      expect(['proved', 'tentative']).toContain(l2.answer);
      expect(l2.frame).toBeUndefined();
      expect(recheck(l2)).toBe(true);
      const l3 = d(createRng(seed), 4, 3) as ChooseItem;
      expect(l3.lesson).toBe('s17.l2');
      expect(l3.skill).toBe('s17.counterexample');
      expect(l3.prompt).toContain('Every growing number sequence doubles.');
      expect(recheck(l3)).toBe(true);
      expect(shapeProblems(l2)).toEqual([]);
      expect(shapeProblems(l3)).toEqual([]);
    }
  });

  it('the Arcade gives one valid item from any place', () => {
    const skills = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const it = stop17.practice!(createRng(seed));
      expect(shapeProblems(it)).toEqual([]);
      expect(it.frame).toBeUndefined();
      skills.add(it.skill);
    }
    expect(skills.size).toBeGreaterThanOrEqual(12);
  });

  it('the models behind the items: machine pairs agree on exactly one input; sequence pairs share 2 or 3 terms, then part', () => {
    expect(P.MACHINE_PAIRS.length).toBeGreaterThan(10);
    for (const { A, B, x0 } of P.MACHINE_PAIRS) {
      const fa = machineRule(P.ruleWords(A)), fb = machineRule(P.ruleWords(B));
      const agree = P.INPUTS.filter((x) => fa(x) === fb(x));
      expect(agree).toEqual([x0]);
    }
    expect(P.SEQ_PAIRS.length).toBeGreaterThan(10);
    for (const { A, B, k } of P.SEQ_PAIRS) {
      const ta = seqTerms(P.sWords(A), k + 1), tb = seqTerms(P.sWords(B), k + 1);
      expect(ta.slice(0, k)).toEqual(tb.slice(0, k));
      expect(ta[k]).not.toBe(tb[k]);
    }
    for (const c of P.CAUSES) {
      expect(P.tellsApart(false, false)).toBe(false);
      expect(P.tellsApart(true, true)).toBe(false);
      expect(P.tellsApart(true, false) && P.tellsApart(false, true)).toBe(true);
      expect(c.a.fix).not.toBe(c.b.fix);
    }
    for (const f of P.FAMILY_IDS.map((id) => P.FAMILIES[id])) {
      const test = claimTest(f.claim);
      for (const seed of SEEDS) for (const role of ['break', 'fit', 'none'] as const) {
        const xs = P.caseFor(createRng(seed), f, role);
        const [g, h2] = test(xs);
        expect(role === 'none' ? !g : role === 'fit' ? g && h2 : g && !h2, `${f.id} ${role} ${xs}`).toBe(true);
      }
    }
  });
});

describe('items are plain data the screens can draw', () => {
  it('a number item answers on the pad within its digits', () => {
    for (const seed of SEEDS) {
      const it = P.jumpsItem(createRng(seed)) as NumberItem;
      expect(String(it.answer).length).toBeLessThanOrEqual(it.digits ?? 3);
    }
  });
});
