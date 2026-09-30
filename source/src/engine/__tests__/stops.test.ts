/**
 * Contract for every built stop. Run one stop with STOP=2 npx vitest run src/engine/__tests__/stops.test.ts
 */
import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { claimTrue, clueHolds, gridClueHolds } from '../grade';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import type { AssignItem, Item, StopDef } from '../types';

const only = process.env.STOP ? Number(process.env.STOP) : null;
const built = STOPS.filter((s) => s.ready && (only === null || s.n === only));

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** Every full assignment of an assign item that fits all its rules (brute force). */
export function assignSolutions(item: AssignItem): Record<string, Record<string, string>>[] {
  const people = item.people.map((p) => p.id);
  // Per category: every way to give the people values (a permutation when oneEach, else any choice each).
  const perCat = item.categories.map((c) => {
    const ids = c.values.map((v) => v.id);
    if (c.oneEach) return permutations(ids).filter((pm) => pm.length === people.length);
    let out: string[][] = [[]];
    for (let i = 0; i < people.length; i++) out = out.flatMap((pre) => ids.map((v) => [...pre, v]));
    return out;
  });
  let combos: string[][][] = [[]];
  for (const opts of perCat) combos = combos.flatMap((pre) => opts.map((o) => [...pre, o]));
  const fits: Record<string, Record<string, string>>[] = [];
  for (const combo of combos) {
    const values: Record<string, Record<string, string>> = {};
    people.forEach((p, i) => { values[p] = {}; item.categories.forEach((c, k) => { values[p][c.id] = combo[k][i]; }); });
    if (item.gridClues && !item.gridClues.every((cl) => gridClueHolds(cl, values))) continue;
    if (item.claims) {
      const kinds: Record<string, 'knight' | 'knave'> = {};
      for (const p of people) kinds[p] = values[p].kind === 'knight' ? 'knight' : 'knave';
      if (!people.every((p) => !item.claims![p] || (kinds[p] === 'knight') === claimTrue(item.claims![p], kinds))) continue;
    }
    fits.push(values);
  }
  return fits;
}

/** Every structural rule an item must follow. Returns a list of problems (empty when valid). */
export function problems(stop: StopDef, item: Item): string[] {
  const out: string[] = [];
  const lessonIds = stop.lessons.map((l) => l.id);
  if (item.stop !== stop.n) out.push(`stop ${item.stop} != ${stop.n}`);
  if (!lessonIds.includes(item.lesson)) out.push(`unknown lesson ${item.lesson}`);
  if (!item.skill.startsWith(`s${stop.n}.`)) out.push(`skill ${item.skill} should start with s${stop.n}.`);
  if (!item.prompt.trim()) out.push('empty prompt');
  if (!item.explain.trim()) out.push('empty explain');
  if (item.scene?.kind === 'things') {
    const ids = item.scene.things.map((t) => t.id);
    if (new Set(ids).size !== ids.length) out.push('duplicate thing ids in scene');
  }
  if (item.kind === 'choose') {
    const ids = item.choices.map((c) => c.id);
    const labels = item.choices.map((c) => c.label.trim().toLowerCase());
    if (item.choices.length < 2 || item.choices.length > 5) out.push(`${item.choices.length} choices`);
    if (new Set(ids).size !== ids.length) out.push('duplicate choice ids');
    if (new Set(labels).size !== labels.length) out.push(`duplicate choice labels: ${labels.join(' | ')}`);
    if (!ids.includes(item.answer)) out.push('answer is not a choice');
    for (const k of Object.keys(item.whyWrong ?? {})) {
      if (!ids.includes(k)) out.push(`whyWrong for unknown choice ${k}`);
      if (k === item.answer) out.push('whyWrong written for the right answer');
    }
  }
  if (item.kind === 'tapall') {
    const ids = item.things.map((t) => t.id);
    if (new Set(ids).size !== ids.length) out.push('duplicate thing ids');
    if (item.things.some((t) => t.hidden)) out.push('tapall things must be face up');
    if (!item.answer.every((id) => ids.includes(id))) out.push('answer id not among things');
    const key = (xs: string[]) => [...xs].sort().join('|');
    for (const d of item.diagnose ?? []) if (key(d.ids) === key(item.answer)) out.push('diagnose set equals the answer');
  }
  if (item.seconds !== undefined && (item.seconds < 60 || item.seconds > 240)) out.push(`seconds ${item.seconds} out of range 60-240`);
  if (item.scene?.kind === 'grid') {
    const rows = new Set(item.scene.rows.map((r) => r.id)), cols = new Set(item.scene.cols.map((c) => c.id));
    for (const [r, m] of Object.entries(item.scene.marks)) for (const c of Object.keys(m)) if (!rows.has(r) || !cols.has(c)) out.push(`grid scene mark ${r}/${c} is not a cell`);
  }
  if (item.scene?.kind === 'speakers') {
    const ids = item.scene.speakers.map((sp) => sp.id);
    if (new Set(ids).size !== ids.length) out.push('duplicate speaker ids');
  }
  if (item.kind === 'assign') {
    const ids = item.people.map((p) => p.id);
    if (ids.length < 2 || ids.length > 5) out.push(`${ids.length} people`);
    if (new Set(ids).size !== ids.length) out.push('duplicate people');
    if (!item.categories.length || item.categories.length > 2) out.push(`${item.categories.length} categories`);
    for (const c of item.categories) {
      if (c.oneEach && c.values.length !== ids.length) out.push(`category ${c.id}: oneEach needs one value per person`);
      if (new Set(c.values.map((v) => v.id)).size !== c.values.length) out.push(`category ${c.id}: duplicate values`);
    }
    for (const p of ids) for (const c of item.categories) {
      if (!c.values.some((v) => v.id === item.answer[p]?.[c.id])) out.push(`answer missing or unknown for ${p}/${c.id}`);
    }
    if (item.layout === 'grid') {
      if (!item.gridClues?.length) out.push('grid item without gridClues');
      if (item.scene?.kind !== 'clues' || item.scene.clues.length !== (item.gridClues?.length ?? -1)) out.push('scene must list one clue text per grid clue');
    }
    if (item.layout === 'toggles') {
      if (!item.claims) out.push('toggles item without claims');
      if (item.categories.length !== 1 || item.categories[0].id !== 'kind' || item.categories[0].values.map((v) => v.id).join() !== 'knight,knave') out.push('knights items use one category "kind" with values knight, knave');
      if (item.scene?.kind !== 'speakers') out.push('knights items need a speakers scene');
    }
    const sols = assignSolutions(item);
    if (sols.length !== 1) out.push(`${sols.length} assignments fit (need exactly 1)`);
    else if (JSON.stringify(sols[0]) !== JSON.stringify(Object.fromEntries(ids.map((p) => [p, Object.fromEntries(item.categories.map((c) => [c.id, item.answer[p][c.id]]))])))) out.push('the only assignment that fits is not the answer');
  }
  if (item.kind === 'multi') {
    const ids = item.choices.map((c) => c.id);
    if (ids.length < 2 || ids.length > 6) out.push(`${ids.length} cards`);
    if (new Set(ids).size !== ids.length) out.push('duplicate card ids');
    if (new Set(item.choices.map((c) => c.label.trim().toLowerCase())).size !== ids.length) out.push('duplicate card labels');
    if (!item.answer.every((id) => ids.includes(id))) out.push('answer id not among cards');
    for (const k of Object.keys(item.pickTips ?? {})) if (!ids.includes(k) || item.answer.includes(k)) out.push(`pickTip for ${k} (must be a card that is not in the answer)`);
    for (const k of Object.keys(item.missTips ?? {})) if (!item.answer.includes(k)) out.push(`missTip for ${k} (must be a card in the answer)`);
  }
  if (item.kind === 'order') {
    const ids = item.names.map((c) => c.id);
    if (ids.length < 3 || ids.length > 6) out.push(`${ids.length} names`);
    if ([...item.answer].sort().join() !== [...ids].sort().join()) out.push('answer is not an order of the names');
    const fits = permutations(ids).filter((p) => item.clues.every((c) => clueHolds(c, p)));
    if (fits.length !== 1) out.push(`${fits.length} orders fit the clues (need exactly 1)`);
    else if (fits[0].join() !== item.answer.join()) out.push('the only order that fits is not the answer');
    if (item.scene?.kind !== 'clues' || item.scene.clues.length !== item.clues.length) out.push('scene must list one clue text per clue');
  }
  return out;
}

/** What a player sees of an item. Two items in one set must never look the same. */
// Speaker names are left out: “Someone” and “An elf” saying the same words is the same question.
const looks = (it: Item) => JSON.stringify([it.prompt, it.scene?.kind === 'speakers' ? it.scene.speakers.map((sp) => sp.says) : it.scene ?? null, it.kind === 'tapall' ? it.things : null, it.kind === 'choose' || it.kind === 'multi' ? it.choices.map((c) => c.label) : null]);

function prose(items: Item[]): string {
  const parts: string[] = [];
  for (const it of items) {
    parts.push(it.prompt, it.explain);
    if (it.hint) parts.push(it.hint);
    if (it.kind === 'choose') parts.push(...Object.values(it.whyWrong ?? {}));
    if (it.kind === 'tapall') parts.push(...(it.diagnose ?? []).map((d) => d.message));
    if (it.kind === 'multi') parts.push(...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {}));
  }
  return parts.join('\n');
}

describe.each(built.map((s) => [s.n, s] as const))('stop %i', (_n, stop) => {
  it('has 3-6 lessons with 3-6 key-idea cards each', () => {
    expect(stop.lessons.length).toBeGreaterThanOrEqual(3);
    expect(stop.lessons.length).toBeLessThanOrEqual(6);
    stop.lessons.forEach((l, i) => {
      expect(l.id).toBe(`s${stop.n}.l${i + 1}`);
      expect(l.ideas.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.ideas.length, l.id).toBeLessThanOrEqual(6);
      for (const c of l.ideas) expect(c.body.join(' ').trim().length, `${l.id} ${c.title}`).toBeGreaterThan(0);
    });
    expect(stop.check).toBeTypeOf('function');
    expect(stop.practice).toBeTypeOf('function');
  });

  it('lesson practice: 3-5 valid items, the same for the same seed', () => {
    for (const l of stop.lessons) {
      for (let seed = 1; seed <= 40; seed++) {
        const items = l.practice(createRng(seed));
        expect(items.length, l.id).toBeGreaterThanOrEqual(3);
        expect(items.length, l.id).toBeLessThanOrEqual(5);
        expect(new Set(items.map((i) => i.id)).size, `${l.id} ids`).toBe(items.length);
        expect(new Set(items.map(looks)).size, `${l.id} seed ${seed}: no repeated item in one set`).toBe(items.length);
        for (const it of items) {
          expect(problems(stop, it), `${l.id} seed ${seed} ${it.id}`).toEqual([]);
          expect(it.lesson, `${it.id} belongs to ${l.id}`).toBe(l.id);
        }
        expect(l.practice(createRng(seed))).toEqual(items);
      }
    }
  });

  it('check: 8-10 valid items covering every lesson, with a conflict item, new on every seed', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop.check!(createRng(seed));
      expect(items.length).toBeGreaterThanOrEqual(8);
      expect(items.length).toBeLessThanOrEqual(10);
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      expect(new Set(items.map(looks)).size, `seed ${seed}: no repeated item in one check`).toBe(items.length);
      for (const it of items) expect(problems(stop, it), `seed ${seed} ${it.id}`).toEqual([]);
      for (const l of stop.lessons) expect(items.some((i) => i.lesson === l.id), `seed ${seed} covers ${l.id}`).toBe(true);
      expect(items.some((i) => i.conflict), `seed ${seed} has a conflict item`).toBe(true);
      expect(stop.check!(createRng(seed))).toEqual(items);
      seen.add(JSON.stringify(items.map((i) => [i.prompt, i.scene])));
    }
    expect(seen.size).toBeGreaterThanOrEqual(280);
  });

  it('arcade practice gives valid items', () => {
    for (let seed = 1; seed <= 100; seed++) expect(problems(stop, stop.practice!(createRng(seed)))).toEqual([]);
  });

  it(`reads at a 6th-grade level (Flesch-Kincaid <= ${READING.maxGrade}, sentences <= ${READING.maxSentenceWords} words)`, () => {
    for (const l of stop.lessons) {
      const ideas = l.ideas.flatMap((c) => c.body).join('\n');
      const practice = prose([1, 2, 3, 4, 5].flatMap((s) => l.practice(createRng(s))));
      for (const [what, text] of [['ideas', ideas], ['practice', practice]] as const) {
        expect(fkGrade(text), `${l.id} ${what} grade`).toBeLessThanOrEqual(READING.maxGrade);
        const long = longestSentence(text);
        expect(long.words, `${l.id} ${what}: "${long.sentence}"`).toBeLessThanOrEqual(READING.maxSentenceWords);
      }
    }
    const check = prose([1, 2, 3].flatMap((s) => stop.check!(createRng(s))));
    expect(fkGrade(check), 'check grade').toBeLessThanOrEqual(READING.maxGrade);
  });
});

it('the Journey lists 12 stops in order', () => {
  expect(STOPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(STOPS.slice(0, 6).every((s) => s.ready) || only !== null || process.env.ALLOW_PLACEHOLDERS === '1').toBe(true);
});

