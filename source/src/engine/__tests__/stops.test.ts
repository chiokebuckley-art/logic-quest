/**
 * Contract for every built stop. Run one stop with STOP=2 npx vitest run src/engine/__tests__/stops.test.ts
 */
import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { checkDrill, marksToTap } from '../drill';
import { claimTrue, clueHolds, gridClueHolds } from '../grade';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { feedbackText, teachStrings } from '../teach';
import type { AssignItem, DrillStep, Item, LessonDef, Scene, StopDef, TeachCase } from '../types';

/**
 * Every wrong-answer route meets the wrong-answer handoff (v1.0): each item has Item.teach, and each wrong choice of
 * a choose item has its own ChoiceFeedback. This holds for every lesson of every built stop.
 */
const coverageFor = (_lessonId: string) => true;

/**
 * Every lesson of every built stop is See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026): guided boards
 * (LessonDef.drill) the learner marks by taps before any quiz, a marked case in every practice hint, and Do text
 * at the reading level.
 */
const drillFor = (_lessonId: string) => true;

/** Shape rules for a guided board. `board`: the scenes it may show as the same board (the worked examples). */
function drillProblems(step: DrillStep, boards: readonly string[], where: string): string[] {
  const out: string[] = [];
  if (!step.title.trim()) out.push(`${where}: no title`);
  if (!step.body.length || !step.body.join('').trim()) out.push(`${where}: no instructions`);
  if (!step.done.trim()) out.push(`${where}: nothing said when the marks are right`);
  if (!step.rows.length) out.push(`${where}: no rows`);
  const tap = marksToTap(step);
  if (!tap.length) out.push(`${where}: nothing for the learner to mark`);
  const ids = new Set<string>();
  for (const r of step.rows) {
    if (!r.label.trim()) out.push(`${where}: a row without a label`);
    if (!r.marks.length) out.push(`${where} ${r.id}: a row without marks`);
    for (const m of r.marks) {
      if (ids.has(m.id)) out.push(`${where}: mark id ${m.id} twice`);
      ids.add(m.id);
      if (!m.label.trim()) out.push(`${where} ${m.id}: no label`);
      if (m.options.length < 2) out.push(`${where} ${m.id}: fewer than two options`);
      if (new Set(m.options.map((o) => o.id)).size !== m.options.length) out.push(`${where} ${m.id}: repeated option ids`);
      if (!m.options.some((o) => o.id === m.answer)) out.push(`${where} ${m.id}: the answer is not an option`);
      if (!m.given) for (const o of m.options) if (o.id !== m.answer && !m.why[o.id]?.trim()) out.push(`${where} ${m.id}: no words for a wrong “${o.label}”`);
    }
  }
  // A case board: one row per case (a box), a stamp on every sign of the board, then one Keep or Reject mark.
  if (step.layout === 'cases') {
    const boxes = step.scene?.kind === 'boxes' ? step.scene.boxes : [];
    if (!boxes.length) out.push(`${where}: a case board needs a boxes scene`);
    const cases = step.rows.map((r) => r.case?.box);
    if (cases.some((b) => b === undefined || !boxes[b])) out.push(`${where}: a case board row without its box`);
    if (new Set(cases).size !== cases.length) out.push(`${where}: a box with two cases`);
    for (const r of step.rows) {
      const on = r.marks.filter((m) => m.on !== undefined).map((m) => m.on);
      if (JSON.stringify(on) !== JSON.stringify(boxes.map((_, i) => i))) out.push(`${where} ${r.id}: one stamp per sign, in box order`);
      for (const m of r.marks.filter((x) => x.on !== undefined)) if (JSON.stringify(m.options.map((o) => o.id)) !== '["true","false"]') out.push(`${where} ${m.id}: a stamp is True or False`);
      const verdicts = r.marks.filter((m) => m.on === undefined);
      if (verdicts.length !== 1 || JSON.stringify(verdicts[0].options.map((o) => o.id)) !== '["keep","reject"]') out.push(`${where} ${r.id}: one Keep or Reject mark`);
      if (r.marks.some((m) => m.given) && !r.marks.every((m) => m.given)) out.push(`${where} ${r.id}: a case is shown whole or marked whole`);
    }
  }
  if (step.columns) {
    for (const r of step.rows) if (r.marks.length !== step.columns.length) out.push(`${where} ${r.id}: ${r.marks.length} boxes for ${step.columns.length} columns`);
    for (const m of step.rows.flatMap((r) => r.marks)) if (!m.options.every((o) => o.id === 'yes' || o.id === 'no')) out.push(`${where} ${m.id}: a grid box takes only yes and no`);
  }
  // The same board as a worked example, or a twin that says what it changed.
  if (step.scene && !boards.includes(JSON.stringify(step.scene)) && !step.twin?.trim()) out.push(`${where}: not a worked example's board, and no twin note`);
  // A grid board drawn only as its tap grid: its columns, rows and shown boxes are a card's grid picture.
  if (step.columns && !step.scene && !step.twin?.trim()) {
    const grids = boards.map((b) => JSON.parse(b) as Scene).filter((s): s is Extract<Scene, { kind: 'grid' }> => s.kind === 'grid');
    const same = grids.some((g) =>
      JSON.stringify(g.cols.map((c) => c.label)) === JSON.stringify(step.columns) &&
      step.rows.every((r) => {
        const gr = g.rows.find((x) => x.label === r.label);
        return !!gr && r.marks.every((m, k) => !m.given || g.marks[gr.id]?.[g.cols[k].id] === m.answer);
      }));
    if (!same) out.push(`${where}: a grid board whose rows, columns and shown boxes match no card's grid, and no twin note`);
  }
  if (!checkDrill(step, Object.fromEntries(tap.map((m) => [m.id, m.answer]))).done) out.push(`${where}: the right marks do not pass`);
  return out;
}

/** Every player-facing string of a guided board. */
const drillText = (step: DrillStep): string[] => [
  step.title,
  ...step.body,
  step.done,
  step.twin ?? '',
  ...step.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])]),
];

/**
 * The See boards of a lesson: every key-idea card's scene. A worked case on the case board counts as the boxes and
 * rule it is drawn on, so a case board on the same boxes is the same board.
 */
const seeBoards = (l: LessonDef) =>
  l.ideas.flatMap((c) => (c.scene ? [JSON.stringify(c.scene), ...(c.scene.kind === 'cases' ? [JSON.stringify({ kind: 'boxes', boxes: c.scene.boxes, rule: c.scene.rule })] : [])] : []));

/** Every player-facing string of a key-idea card: its body, and a worked case's lines and buttons. */
const cardText = (c: LessonDef['ideas'][number]): string[] => [...c.body, ...(c.scene?.kind === 'cases' ? (c.scene.steps ?? []).flatMap((st) => [st.say, st.label]) : [])];

/** Shape rules for a worked case card. */
function caseProblems(c: TeachCase, where: string): string[] {
  const out: string[] = [];
  if (!c.label.trim()) out.push(`${where}: case without a label`);
  for (const g of c.groups ?? []) if (!g.label.trim() || !Number.isInteger(g.n) || g.n < 0 || g.n > 12) out.push(`${where}: bad group ${JSON.stringify(g)}`);
  for (const t of c.truths ?? []) if (!t.who.trim()) out.push(`${where}: truth without a name`);
  return out;
}

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
  if (item.teach) {
    if (!item.teach.rule.trim()) out.push('teach without a rule');
    for (const c of item.teach.cases ?? []) out.push(...caseProblems(c, 'teach case'));
    for (const t of item.teach.terms ?? []) if (!t.word.trim() || !t.meaning.trim()) out.push('empty term');
  }
  if (item.kind === 'choose' && item.feedback) {
    const ids = item.choices.map((c) => c.id);
    for (const [k, fb] of Object.entries(item.feedback)) {
      if (!ids.includes(k)) out.push(`feedback for unknown choice ${k}`);
      if (k === item.answer) out.push('feedback written for the right answer');
      if (!fb.headline.trim() || !fb.detail.length) out.push(`feedback ${k} needs a headline and detail`);
      if (item.whyWrong?.[k] !== feedbackText(fb)) out.push(`whyWrong ${k} is out of step with its feedback (call syncWhyWrong)`);
      if (fb.example) out.push(...caseProblems(fb.example, `feedback ${k}`));
    }
  }
  if (coverageFor(item.lesson)) {
    if (!item.teach) out.push('no teach (rule, terms, cases, remember, simpler) for the wrong-answer explanation');
    if (item.kind === 'choose') for (const c of item.choices) if (c.id !== item.answer && !item.feedback?.[c.id]) out.push(`wrong choice ${c.id} has no ChoiceFeedback`);
  }
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
    parts.push(it.prompt, it.explain, ...teachStrings(it));
    if (it.hint) parts.push(it.hint);
    if (it.kind === 'choose') parts.push(...Object.values(it.whyWrong ?? {}));
    if (it.kind === 'tapall') parts.push(...(it.diagnose ?? []).map((d) => d.message));
    if (it.kind === 'multi') parts.push(...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {}));
  }
  return parts.join('\n');
}

describe.each(built.map((s) => [s.n, s] as const))('stop %i', (_n, stop) => {
  it('has 3-7 lessons with 3-6 key-idea cards each', () => {
    expect(stop.lessons.length).toBeGreaterThanOrEqual(3);
    expect(stop.lessons.length).toBeLessThanOrEqual(7);
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
      const ideas = l.ideas.flatMap(cardText).join('\n');
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

describe.each(built.map((s) => [s.n, s] as const))('stop %i: See -> Do -> Quiz', (_n, stop) => {
  it('guided boards come before the quiz: computed marks, words for every wrong mark, the worked example’s board', () => {
    for (const l of stop.lessons) {
      if (!drillFor(l.id)) continue;
      expect(l.drill?.length ?? 0, `${l.id} has guided boards`).toBeGreaterThan(0);
      l.drill!.forEach((st, j) => expect(drillProblems(st, seeBoards(l), `${l.id} board ${j + 1}`)).toEqual([]));
      // A board placed right after a card (afterCard) is that card's board, so the Do sits next to its See.
      for (const st of l.drill!) {
        if (st.afterCard === undefined || st.twin) continue;
        expect(JSON.stringify(l.ideas[st.afterCard]?.scene), `${st.id} after card ${st.afterCard + 1}`).toBe(JSON.stringify(st.scene));
      }
      const text = l.drill!.flatMap(drillText).filter(Boolean).join('\n');
      expect(fkGrade(text), `${l.id} boards grade`).toBeLessThanOrEqual(READING.maxGrade);
      const long = longestSentence(text);
      expect(long.words, `${l.id} boards: "${long.sentence}"`).toBeLessThanOrEqual(READING.maxSentenceWords);
    }
  });

  it('every hint shows a marked case; a scaffolded first quiz is marked on its own board; each pass group is in every pack', () => {
    for (const l of stop.lessons) {
      if (!drillFor(l.id)) continue;
      for (let seed = 1; seed <= 20; seed++) {
        const items = l.practice(createRng(seed));
        for (const it of items) {
          if (it.hint) expect(it.hintCase, `${it.id}: the hint shows a marked case`).toBeDefined();
          if (it.workFirst) {
            expect(drillProblems(it.workFirst, it.scene ? [JSON.stringify(it.scene)] : [], `${it.id} work`)).toEqual([]);
            const long = longestSentence(drillText(it.workFirst).join('\n'));
            expect(long.words, `${it.id} work: "${long.sentence}"`).toBeLessThanOrEqual(READING.maxSentenceWords);
          }
        }
        for (const g of l.pass?.include ?? []) expect(items.some((it) => it.tags?.includes(g.tag)), `${l.id} seed ${seed} has ${g.tag}`).toBe(true);
      }
    }
  });
});

it('the Journey lists 12 stops in order', () => {
  expect(STOPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(STOPS.slice(0, 6).every((s) => s.ready) || only !== null || process.env.ALLOW_PLACEHOLDERS === '1').toBe(true);
});
