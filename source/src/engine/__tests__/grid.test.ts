/**
 * Stop 4 grid engine. Every answer is re-derived here by brute force (every way to hand out the values, checked
 * with gridClueHolds), independent of the helpers the engine uses to build items.
 */
import { describe, expect, it } from 'vitest';
import { CARD_CLUES, CARD_GRIDS, L1_GRID, L2_COUNT, L2_CROSS, L2_CROSS_CARD, L2_CROSS_DO, L4_BACK_FORTH, L5_LIST, stop4 } from '../../content/stop4';
import { WORLD } from '../../content/world';
import { checkDrill, extraQuizItem, marksToTap } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import { gridClueHolds } from '../grade';
import { freshItem } from '../notebook';
import { READING, fkGrade, longestSentence } from '../readability';
import {
  BACK_FORTH_CONFUSED,
  BOX_VS_KID,
  BOX_VS_KID_CONFUSED,
  CANT,
  LINE_WORDS,
  LINK_WORDS,
  METHOD_STEPS,
  SKINS,
  SKIN_IDS,
  clueText,
  enoughPuzzle,
  forceGridClues,
  gridPuzzle,
  humanSolve,
  joinNames,
  linkPuzzle,
  makeCast,
  markPuzzle,
  onlyOnePuzzle,
  proofPuzzle,
  randomSol,
  settingText,
  spreadPuzzle,
  tickText,
  trueGridClues,
  wordsFor,
  type Basis,
  type Bases,
  type Cast,
  type Marks,
  type OnlyMode,
  type SkinId,
  type Sol,
  type Spec,
} from '../puzzles/grid';
import { createRng } from '../rng';
import type { ChooseItem, DrillMark, DrillStep, GridClue, Item, Scene, TeachCase } from '../types';

const SEEDS = 300;
const skinAt = (seed: number): SkinId => SKIN_IDS[seed % SKIN_IDS.length];

// ---------- independent brute force ----------

function perms(xs: string[]): string[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
function every(spec: Spec): Sol[] {
  let combos: string[][][] = [[]];
  for (const c of spec.cats) combos = combos.flatMap((pre) => perms(c.values).map((pm) => [...pre, pm]));
  return combos.map((combo) => Object.fromEntries(spec.people.map((p, i) => [p, Object.fromEntries(spec.cats.map((c, k) => [c.id, combo[k][i]]))])));
}
const fit = (spec: Spec, clues: readonly GridClue[]) => every(spec).filter((s) => clues.every((c) => gridClueHolds(c, s)));
const fitMarks = (spec: Spec, c: string, marks: Marks) =>
  every(spec).filter((s) => Object.entries(marks).every(([p, m]) => Object.entries(m).every(([v, mk]) => (s[p][c] === v) === (mk === 'yes'))));
const whoCan = (sols: Sol[], c: string, v: string, people: string[]) => people.filter((p) => sols.some((s) => s[p][c] === v));
const status = (sols: Sol[], p: string, c: string, v: string) => {
  const n = sols.filter((s) => s[p][c] === v).length;
  return n === sols.length ? 'yes' : n === 0 ? 'no' : 'open';
};
const same = (a: Sol, b: Sol) => JSON.stringify(a) === JSON.stringify(b);

// ---------- text checks ----------

function cleanText(item: Item) {
  const tips = item.kind === 'choose' ? Object.values(item.whyWrong ?? {}) : item.kind === 'multi' ? [...Object.values(item.missTips ?? {}), ...Object.values(item.pickTips ?? {})] : [];
  const labels = item.kind === 'choose' || item.kind === 'multi' ? item.choices.map((c) => c.label) : [];
  const scene = item.scene?.kind === 'clues' ? item.scene.clues : [];
  const all = [item.prompt, item.explain, item.hint ?? '', ...tips, ...labels, ...scene].join(' ');
  expect(all).not.toMatch(/undefined|NaN|\{\w+\}|\s\s|\.\.|\[object/);
  // Curly apostrophes and quotes only.
  expect(all).not.toMatch(/['"]/);
  // The screen already shows a "Not yet" heading, so a message must not repeat it.
  for (const msg of tips) expect(msg).not.toMatch(/^Not yet/);
  // Clue lines are single sentences with a full stop.
  for (const c of scene) expect(c).toMatch(/^[A-Z][^.?!]*\.$/);
}

function whyWrongCoversWrongChoices(item: ChooseItem) {
  const wrong = item.choices.map((c) => c.id).filter((id) => id !== item.answer);
  expect(Object.keys(item.whyWrong ?? {}).sort()).toEqual(wrong.sort());
}

/** Names of the cast that appear in a text. */
const namedIn = (cast: Cast, text: string) => cast.people.filter((p) => new RegExp(`\\b${p.label}\\b`).test(text)).map((p) => p.id).sort();

// ---------- skins and clue text ----------

describe('skins and clue text', () => {
  it('every skin says every clue type as one clear sentence, and different clues never read the same', () => {
    for (const id of SKIN_IDS) {
      for (const n of [3, 4]) {
        const rng = createRng(n);
        const cast = makeCast(rng, SKINS[id], n, [0, 1]);
        const sol = randomSol(rng, cast);
        const clues = trueGridClues(cast.spec, sol, ['is', 'isnt', 'either', 'link', 'notLink']);
        expect(new Set(clues.map((c) => c.t))).toEqual(new Set(['is', 'isnt', 'either', 'link', 'notLink']));
        const texts = clues.map((c) => clueText(cast, c));
        for (const t of texts) {
          expect(t).toMatch(/^[A-Z][^.]*\.$/);
          expect(t.split(' ').length).toBeLessThanOrEqual(14);
        }
        // Only the two word orders of an "or" clue, or the two directions of a link, may read alike.
        const key = (c: GridClue) => (c.t === 'either' ? `${c.p}${c.c}${[c.v1, c.v2].sort()}` : JSON.stringify(c));
        const byText = new Map<string, string>();
        clues.forEach((c, i) => {
          const k = byText.get(texts[i]);
          if (k !== undefined) expect(k).toBe(key(c));
          byText.set(texts[i], key(c));
        });
        const setting = settingText(cast);
        expect(setting).not.toMatch(/undefined|\{|\s\s/);
        for (const s of setting.split(/(?<=\.)\s/)) expect(s.split(' ').length).toBeLessThanOrEqual(20);
      }
    }
  });

  it('name pools never repeat a first letter, and ids are plain ASCII', () => {
    for (const id of SKIN_IDS) {
      const skin = SKINS[id];
      expect(new Set(skin.pool.map((p) => p[0])).size).toBe(skin.pool.length);
      for (const cat of skin.cats) {
        expect(cat.values.length).toBeGreaterThanOrEqual(4);
        for (const v of cat.values) expect(v.id).toMatch(/^[a-z0-9]+$/);
      }
      expect(skin.cats[0].id).not.toBe(skin.cats[1].id);
    }
  });
});

// ---------- clue drawing and the solver ----------

describe('forceGridClues', () => {
  it('draws true clues that force exactly the hidden answer, every clue is needed, and at most one says "has"', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = createRng(seed);
      const ncat = seed % 2 === 0 ? 2 : 1;
      const cast = makeCast(rng, SKINS[skinAt(seed)], ncat === 2 ? 3 : 3 + (seed % 3 === 0 ? 1 : 0), ncat === 2 ? [0, 1] : [seed % 2]);
      const sol = randomSol(rng, cast);
      const clues = forceGridClues(rng, cast.spec, sol, ncat === 2 ? { is: 1, isnt: 3, either: 2, link: 3, notLink: 2 } : { is: 1.5, isnt: 3, either: 2 });
      if (!clues) continue;
      for (const c of clues) expect(gridClueHolds(c, sol)).toBe(true);
      const fits = fit(cast.spec, clues);
      expect(fits.length).toBe(1);
      expect(same(fits[0], sol)).toBe(true);
      clues.forEach((_, i) => expect(fit(cast.spec, clues.filter((_, j) => j !== i)).length, `seed ${seed} clue ${i}`).toBeGreaterThan(1));
      expect(clues.filter((c) => c.t === 'is').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('humanSolve', () => {
  it('every mark it makes holds in every assignment that fits (it never guesses), even when the clues do not decide everything', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = createRng(seed);
      const ncat = seed % 2 === 0 ? 2 : 1;
      const n = ncat === 2 ? 3 : 3 + (seed % 3 === 0 ? 1 : 0);
      const cast = makeCast(rng, SKINS[skinAt(seed)], n, ncat === 2 ? [0, 1] : [0]);
      const sol = randomSol(rng, cast);
      const pool = trueGridClues(cast.spec, sol, ['is', 'isnt', 'either', 'link', 'notLink']);
      const clues = rng.shuffle(pool).slice(0, rng.int(1, 5));
      const fits = fit(cast.spec, clues);
      const solve = humanSolve(cast.spec, clues);
      for (const s of solve.steps) {
        expect(status(fits, s.p, s.c, s.v), `seed ${seed} ${JSON.stringify(s)}`).toBe(s.mark);
        // The clues a mark cites are enough for it on their own.
        const alone = fit(cast.spec, s.deps.map((i) => clues[i]));
        expect(status(alone, s.p, s.c, s.v), `seed ${seed} deps of ${JSON.stringify(s)}`).toBe(s.mark);
      }
      if (solve.solved) expect(fits.length).toBe(1);
    }
  });

  it('every ✓ it explains in words is backed by the clues it names', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { cast, clues } = gridPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat: seed % 2 === 0 ? 2 : 1 });
      const fits = fit(cast.spec, clues);
      for (const s of humanSolve(cast.spec, clues).steps.filter((x) => x.mark === 'yes')) {
        const text = tickText(cast, clues, s);
        if (s.why.k === 'link') {
          // "Clue k says “…,” and Dot is the driver. So Dot is blue.": the stated fact is true, and it plus clue k prove the ✓.
          const f = s.why.from;
          expect(status(fits, f.p, f.c, f.v)).toBe('yes');
          expect(status(fit(cast.spec, [clues[s.why.i], { t: 'is', p: f.p, c: f.c, v: f.v }]), s.p, s.c, s.v), text).toBe('yes');
          expect(text).toMatch(new RegExp(`^Clue ${s.why.i + 1} says “`));
          continue;
        }
        const cited = [...text.matchAll(/\b(?:Clue|Clues|clue|clues) ((?:\d+(?:, | and )?)+)/g)].flatMap((m) => m[1].split(/, | and /).map((d) => Number(d) - 1));
        expect(cited.length).toBeGreaterThan(0);
        // What the words name is all the clues this ✓ needs.
        expect(status(fit(cast.spec, [...new Set(cited)].map((i) => clues[i])), s.p, s.c, s.v), `seed ${seed}: ${text}`).toBe('yes');
        expect(text).toContain(cast.nm(s.p));
      }
    }
  });
});

// ---------- lesson 1 and lesson 4: whole grids ----------

describe('whole grids (lessons 1 and 4)', () => {
  it('exactly one assignment fits, it is the answer, every clue is needed, and a person can solve it without guessing', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const ncat of [1, 2] as const) {
        const { item, cast, sol, clues } = gridPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat });
        expect(item.people.length).toBe(3);
        expect(item.categories.length).toBe(ncat);
        expect(item.categories.every((c) => c.oneEach && c.values.length === 3)).toBe(true);
        const fits = fit(cast.spec, clues);
        expect(fits.length).toBe(1);
        expect(same(fits[0], sol)).toBe(true);
        expect(same(item.answer, sol)).toBe(true);
        clues.forEach((_, i) => expect(fit(cast.spec, clues.filter((_, j) => j !== i)).length).toBeGreaterThan(1));
        expect(humanSolve(cast.spec, clues).solved).toBe(true);
        expect(item.gridClues).toEqual(clues);
        expect(item.scene).toEqual({ kind: 'clues', clues: clues.map((c) => clueText(cast, c)) });
        expect(clues.filter((c) => c.t === 'is').length).toBeLessThanOrEqual(1);
        if (ncat === 1) {
          expect(clues.length).toBeGreaterThanOrEqual(2);
          expect(clues.length).toBeLessThanOrEqual(3);
          expect(item.seconds).toBe(150);
          expect(item.lesson).toBe('s4.l3');
        } else {
          expect(clues.some((c) => c.t === 'link' || c.t === 'notLink')).toBe(true);
          expect(item.seconds).toBe(180);
          expect(item.lesson).toBe('s4.l4');
        }
        // The explanation ends with the true answer, person by person.
        for (const p of cast.people) for (const c of cast.cats) expect(item.explain).toMatch(new RegExp(`${p.label} (?:\\w+ )*?(?:${c.vals.find((v) => v.id === sol[p.id][c.cat.id])!.obj})\\b`));
        cleanText(item);
      }
    }
  });
});

// ---------- lesson 1: one clue, one box ----------

describe('lesson 1: which box gets the mark', () => {
  it('exactly one choice gets the asked mark from the clue alone, and each other message says what that box really is', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const t of ['is', 'isnt', 'either'] as const) {
        const { item, cast, clue, ask } = markPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), t });
        const c = cast.cats[0].cat.id;
        const sols = fit(cast.spec, [clue]);
        const cells = item.choices.map((ch) => {
          const [p, v] = ch.id.split('-');
          return { id: ch.id, st: status(sols, p, c, v) };
        });
        expect(cells.filter((x) => x.st === ask).map((x) => x.id)).toEqual([item.answer]);
        expect(item.prompt).toContain(`“${clueText(cast, clue)}”`);
        expect(item.prompt).toMatch(ask === 'yes' ? /gets a ✓ from this clue\?$/ : /gets a ✗ from this clue\?$/);
        whyWrongCoversWrongChoices(item);
        for (const x of cells) {
          if (x.id === item.answer) continue;
          const msg = item.whyWrong![x.id];
          if (/gets a ✗, not a ✓/.test(msg)) expect(x.st).toBe('no');
          else expect(x.st, msg).toBe('open');
        }
        expect(item.scene?.kind).toBe('grid');
        cleanText(item);
      }
    }
  });
});

// ---------- lesson 2: only one left ----------

describe('lesson 2: only one left', () => {
  const modes: OnlyMode[] = ['col', 'row', 'cant'];
  it('the answer is forced by every grid that fits the marks, else Can’t tell yet, and messages name everyone who could', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const mode of modes) {
        for (const n of [3, 4]) {
          const r = onlyOnePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode, n, ask: seed % 2 === 0 ? 'col' : 'row' });
          const { item, cast, sol, marks, ask, p, val } = r;
          const c = cast.cats[0].cat.id;
          const ppl = cast.spec.people;
          // The marks are true for the hidden answer.
          expect(fitMarks(cast.spec, c, marks).some((s) => same(s, sol))).toBe(true);
          const sols = fitMarks(cast.spec, c, marks);
          const line = ask === 'col' ? whoCan(sols, c, val, ppl) : cast.spec.cats[0].values.filter((v) => sols.some((s) => s[p][c] === v));
          const right = item.choices.filter((ch) => (ch.id === CANT ? line.length > 1 : line.length === 1 && line[0] === ch.id));
          expect(right.map((ch) => ch.id), `seed ${seed} ${mode}`).toEqual([item.answer]);
          expect(item.answer === CANT).toBe(mode === 'cant');
          expect(!!item.conflict).toBe(mode === 'cant');
          // The line the question is about: one empty box when forced, two when not.
          const empty = ask === 'col' ? ppl.filter((q) => marks[q][val] === undefined) : cast.spec.cats[0].values.filter((v) => marks[p][v] === undefined);
          expect(empty.length).toBe(mode === 'cant' ? 2 : 1);
          if (mode === 'cant') expect([...line].sort()).toEqual([...empty].sort());
          whyWrongCoversWrongChoices(item);
          // "X could …, but so could Y": both really could.
          for (const [id, msg] of Object.entries(item.whyWrong!)) {
            if (!/could/.test(msg) || id === CANT) continue;
            if (ask === 'col') expect(namedIn(cast, msg)).toEqual([...line].sort());
          }
          if (mode === 'cant' && ask === 'col') expect(namedIn(cast, item.explain)).toEqual([...line].sort());
          cleanText(item);
        }
      }
    }
  });

  it('conflict grids have a ✗ in the row of someone who could still be the answer, so it looks closer than it is', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { marks, cast, val } = onlyOnePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode: 'cant', ask: 'col', n: 3 });
      const open = cast.spec.people.filter((q) => marks[q][val] === undefined);
      expect(open.some((q) => Object.values(marks[q]).includes('no'))).toBe(true);
    }
  });
});

// ---------- lesson 3: spread the tick ----------

describe('lesson 3: spread the tick', () => {
  it('the answer is exactly the listed boxes the ✓ forces to ✗: the rest of its row and its column', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const column of [false, true]) {
        for (const n of [3, 4]) {
          const { item, cast, marks, p, val } = spreadPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), column, n });
          const c = cast.cats[0].cat.id;
          const sols = fitMarks(cast.spec, c, marks);
          expect(item.choices.length).toBeGreaterThanOrEqual(4);
          expect(item.choices.length).toBeLessThanOrEqual(6);
          const forced = item.choices.filter((ch) => { const [q, v] = ch.id.split('-'); return status(sols, q, c, v) === 'no'; }).map((ch) => ch.id);
          expect([...item.answer].sort()).toEqual(forced.sort());
          for (const id of item.answer) {
            const [q, v] = id.split('-');
            expect(q === p || v === val).toBe(true);
            expect(marks[q][v]).toBeUndefined();
          }
          for (const ch of item.choices) {
            const [q, v] = ch.id.split('-');
            if (!item.answer.includes(ch.id)) {
              expect(q !== p && v !== val).toBe(true);
              expect(status(sols, q, c, v)).toBe('open');
            }
          }
          expect(Object.keys(item.missTips!).sort()).toEqual([...item.answer].sort());
          expect(Object.keys(item.pickTips!).sort()).toEqual(item.choices.map((ch) => ch.id).filter((id) => !item.answer.includes(id)).sort());
          if (column) {
            expect(item.answer.every((id) => id.split('-')[1] === val)).toBe(true);
            expect(item.answer.length).toBe(n - 1);
            expect(item.conflict).toBe(true);
          } else {
            expect(item.answer.some((id) => id.split('-')[0] === p)).toBe(true);
            expect(item.answer.some((id) => id.split('-')[1] === val)).toBe(true);
            expect(item.conflict).toBeUndefined();
          }
          cleanText(item);
        }
      }
    }
  });
});

// ---------- lesson 4: linking clues ----------

describe('lesson 4: linking clues', () => {
  it('with the first category filled in, the answer is the only person who can hold the value, else Can’t tell yet', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const mode of ['link', 'notLink2', 'notLink'] as const) {
        const { item, cast, sol, clues, c1, c2, val } = linkPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode });
        const ppl = cast.spec.people;
        for (const cl of clues) expect(gridClueHolds(cl, sol)).toBe(true);
        expect(clues.some((cl) => cl.t === 'link' || cl.t === 'notLink')).toBe(true);
        const known = fit(cast.spec, clues).filter((s) => ppl.every((q) => s[q][c1] === sol[q][c1]));
        const who = whoCan(known, c2, val, ppl);
        const right = item.choices.filter((ch) => (ch.id === CANT ? who.length > 1 : who.length === 1 && who[0] === ch.id));
        expect(right.map((ch) => ch.id)).toEqual([item.answer]);
        expect(item.answer === CANT).toBe(mode === 'notLink');
        expect(!!item.conflict).toBe(mode === 'notLink');
        // The grid scene shows the first category exactly.
        const sc = item.scene as Extract<Scene, { kind: 'grid' }>;
        for (const q of ppl) for (const v of cast.spec.cats[0].values) expect(sc.marks[q][v]).toBe(sol[q][c1] === v ? 'yes' : 'no');
        whyWrongCoversWrongChoices(item);
        for (const t of clues.map((cl) => clueText(cast, cl))) expect(item.prompt).toContain(`“${t}”`);
        if (mode === 'notLink') {
          expect(who.length).toBe(2);
          for (const q of who) expect(namedIn(cast, item.whyWrong![q]).filter((x) => who.includes(x)).sort()).toEqual([...who].sort());
        }
        cleanText(item);
      }
    }
  });
});

// ---------- lesson 5: no guessing ----------

describe('lesson 5: no guessing', () => {
  it('exactly one clue proves the ✗ all by itself; it is the answer; the others leave it open', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const ncat = seed % 3 === 0 ? 2 : 1;
      const { item, cast, sol, clues, target } = proofPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat });
      const { p, c, v } = target;
      expect(sol[p][c]).not.toBe(v);
      // The clues are a full puzzle that a person can solve.
      expect(fit(cast.spec, clues).length).toBe(1);
      expect(humanSolve(cast.spec, clues).solved).toBe(true);
      const provers = clues.map((cl, i) => (status(fit(cast.spec, [cl]), p, c, v) === 'no' ? i : -1)).filter((i) => i >= 0);
      expect(provers.length).toBe(1);
      expect(item.answer).toBe(`k${provers[0] + 1}`);
      const pc = clues[provers[0]];
      expect(pc.t === 'isnt' && pc.p === p && pc.c === c && pc.v === v).toBe(false);
      expect(item.choices.map((ch) => ch.label)).toEqual(clues.map((_, i) => `Clue ${i + 1}`));
      whyWrongCoversWrongChoices(item);
      expect(item.explain).toMatch(new RegExp(`^Clue ${provers[0] + 1} says`));
      cleanText(item);
    }
  });

  it('“can you tell yet?” is Yes exactly when clues 1 and 2 leave one person, and the words name who could', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const tell of [true, false]) {
        const ncat = seed % 3 === 0 ? 2 : 1;
        const { item, cast, clues, c, val } = enoughPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), tell, ncat });
        expect(clues.length).toBeGreaterThanOrEqual(3);
        expect(fit(cast.spec, clues).length).toBe(1);
        expect(humanSolve(cast.spec, clues).solved).toBe(true);
        const who = whoCan(fit(cast.spec, clues.slice(0, 2)), c, val, cast.spec.people);
        expect(item.answer).toBe(who.length === 1 ? 'yes' : CANT);
        expect(item.answer === 'yes').toBe(tell);
        expect(!!item.conflict).toBe(!tell);
        whyWrongCoversWrongChoices(item);
        if (tell) {
          // Not handed out by a clue: it takes a step.
          expect(clues.slice(0, 2).some((cl) => cl.t === 'is' && cl.c === c && cl.v === val)).toBe(false);
          expect(item.explain).toContain(`${cast.nm(who[0])} must`);
        } else {
          expect(namedIn(cast, item.explain)).toEqual([...who].sort());
          expect(namedIn(cast, item.feedback!.yes.headline)).toEqual([...who].sort());
          // The detail names who clues 1 and 2 cross out, and no one who could still have it.
          const out = cast.spec.people.filter((q) => !who.includes(q)).sort();
          expect(namedIn(cast, item.feedback!.yes.detail[0])).toEqual(out);
        }
        cleanText(item);
      }
    }
  });
});

// ---------- stop 4 content ----------

describe('stop 4 content', () => {
  const spec: Spec = { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: ['cat', 'dog', 'fish'] }] };
  const grid = (k: keyof typeof CARD_GRIDS) => (CARD_GRIDS[k] as Extract<Scene, { kind: 'grid' }>).marks;
  const card = (title: string) => stop4.lessons.flatMap((l) => l.ideas).find((c) => c.title === title)!;

  it('idea-card worked examples say what the grids and clues really prove', () => {
    // Only one left: Leo’s row, then the fish column.
    expect(whoCan(fitMarks(spec, 'pet', grid('rowLeft')), 'pet', 'fish', spec.people)).toEqual(['leo']);
    expect(fitMarks(spec, 'pet', grid('rowLeft')).every((s) => s.leo.pet === 'fish')).toBe(true);
    expect(whoCan(fitMarks(spec, 'pet', grid('colLeft')), 'pet', 'fish', spec.people)).toEqual(['leo']);
    // Not so fast: one ✗ leaves Leo with the dog or the fish.
    expect(new Set(fitMarks(spec, 'pet', grid('notSoFast')).map((s) => s.leo.pet))).toEqual(new Set(['dog', 'fish']));
    // A ✓ spreads to four ✗s in a 3 × 3 grid, and nothing else is decided yet.
    const both = grid('spreadBoth');
    expect(Object.values(both).flatMap((m) => Object.values(m)).filter((x) => x === 'no').length).toBe(4);
    const afterSpread = fitMarks(spec, 'pet', { mia: { cat: 'yes' } });
    for (const [p, m] of Object.entries(both)) for (const [v, mk] of Object.entries(m)) expect(status(afterSpread, p, 'pet', v)).toBe(mk);
    // Spread, then look again: Leo has the fish and Ava the dog.
    const again = fitMarks(spec, 'pet', grid('spreadAgain'));
    expect(again.length).toBe(1);
    expect(again[0]).toEqual({ mia: { pet: 'cat' }, leo: { pet: 'fish' }, ava: { pet: 'dog' } });
    expect(card('Spread, then look again').scene).toBe(CARD_GRIDS.spreadAgain);
    // "Or" clue: Ava has the dog or the fish, so the Ava – cat box gets a ✗.
    expect(status(fit(spec, [{ t: 'either', p: 'ava', c: 'pet', v1: 'dog', v2: 'fish' }]), 'ava', 'pet', 'cat')).toBe('no');
    // Lesson 5: "Mia has the dog" proves Leo does not; "Mia does not have the fish" leaves Leo or Ava.
    expect(status(fit(spec, [{ t: 'is', p: 'mia', c: 'pet', v: 'dog' }]), 'leo', 'pet', 'dog')).toBe('no');
    expect(whoCan(fit(spec, [{ t: 'isnt', p: 'mia', c: 'pet', v: 'fish' }]), 'pet', 'fish', spec.people).sort()).toEqual(['ava', 'leo']);
  });

  it('linking-clue cards: the link carries from the dog to popcorn and back; a “not” link leaves two kids', () => {
    const two: Spec = { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: ['cat', 'dog', 'fish'] }, { id: 'snack', values: ['apples', 'popcorn', 'grapes'] }] };
    const pets: GridClue[] = [{ t: 'is', p: 'mia', c: 'pet', v: 'cat' }, { t: 'is', p: 'leo', c: 'pet', v: 'dog' }, { t: 'is', p: 'ava', c: 'pet', v: 'fish' }];
    const link: GridClue = { t: 'link', c1: 'pet', v1: 'dog', c2: 'snack', v2: 'popcorn' };
    const notLink: GridClue = { t: 'notLink', c1: 'pet', v1: 'dog', c2: 'snack', v2: 'popcorn' };
    expect(whoCan(fit(two, [...pets, link]), 'snack', 'popcorn', two.people)).toEqual(['leo']);
    expect(whoCan(fit(two, [...pets, notLink]), 'snack', 'popcorn', two.people).sort()).toEqual(['ava', 'mia']);
    // Both ways: if Ava eats popcorn, Ava has the dog.
    expect(fit(two, [link, { t: 'is', p: 'ava', c: 'snack', v: 'popcorn' }]).every((s) => s.ava.pet === 'dog')).toBe(true);
    expect(card('Use what you know').scene).toBe(CARD_GRIDS.petsKnown);
    const known = grid('petsKnown');
    expect(fitMarks(spec, 'pet', known).map((s) => s.leo.pet)).toEqual(['dog']);
  });

  it('the check has a one-category grid (150 s), a two-category grid (180 s) and a Can’t-tell-yet conflict, all with three people', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const items = stop4.check!(createRng(seed));
      const one = items.find((i) => i.id === 'c1')!;
      const two = items.find((i) => i.id === 'c6')!;
      expect(one.kind === 'assign' && one.categories.length === 1 && one.seconds === 150).toBe(true);
      expect(two.kind === 'assign' && two.categories.length === 2 && two.seconds === 180).toBe(true);
      expect(items.find((i) => i.id === 'c4')!.conflict).toBe(true);
      for (const it of items) {
        if (it.kind === 'assign') expect(it.people.length).toBe(3);
        if (it.scene?.kind === 'grid') expect(it.scene.rows.length).toBe(3);
      }
    }
  });

  it('uses only the stop 4 skill tags', () => {
    const skills = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop4.lessons) for (const it of l.practice(createRng(seed))) skills.add(it.skill);
      for (const it of stop4.check!(createRng(seed))) skills.add(it.skill);
      skills.add(stop4.practice!(createRng(seed)).skill);
    }
    expect([...skills].sort()).toEqual([
      's4.enough-clues', 's4.grid-marks', 's4.grid-one', 's4.grid-two', 's4.link', 's4.not-decided', 's4.not-link',
      's4.only-one-left', 's4.proof-clue', 's4.spread-column', 's4.spread-tick',
    ]);
  });

  it('no practice set or check shows the same puzzle twice, and the same seed gives the same items', () => {
    const key = (i: Item) => JSON.stringify([i.prompt, i.scene]);
    for (let seed = 1; seed <= 150; seed++) {
      for (const l of stop4.lessons) {
        const items = l.practice(createRng(seed));
        expect(new Set(items.map(key)).size, `${l.id} seed ${seed}`).toBe(items.length);
        expect(l.practice(createRng(seed))).toEqual(items);
      }
      const check = stop4.check!(createRng(seed));
      expect(new Set(check.map(key)).size).toBe(check.length);
      expect(stop4.practice!(createRng(seed))).toEqual(stop4.practice!(createRng(seed)));
    }
  });

  it('every practice set uses at least two skins', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop4.lessons) {
        const items = l.practice(createRng(seed));
        const skins = new Set(items.map((it) => (it.prompt.startsWith('The dragons') ? 'dragons' : it.prompt.startsWith('The robots') ? 'robots' : it.prompt.startsWith('The letters') ? 'letters' : 'kids')));
        expect(skins.size, `${l.id} seed ${seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

// ---------- teaching after a wrong answer ----------
//
// The handoff "Make wrong answers teachable moments" (v1.0): every item teaches (rule, terms, cases, remember, a
// simpler example), every wrong choice gets its own reason with a counterexample, and every true / false shown is
// computed. Here each truth is recomputed from its words with this file's own brute force.

const marksOk = (c: string, marks: Marks, s: Sol) =>
  Object.entries(marks).every(([p, m]) => Object.entries(m).every(([v, mk]) => (s[p][c] === v) === (mk === 'yes')));

/** Every assignment a case is about, by this file's brute force. */
function worldsOf(spec: Spec, b: Basis): Sol[] {
  if (b.way) return [b.way];
  return every(spec).filter((s) => (b.clues ?? []).every((c) => gridClueHolds(c, s)) && (!b.marks || marksOk(b.marks.c, b.marks.marks, s)));
}

interface Ctx {
  cast: Cast;
  /** The item's clues, in the order the player sees them (for "Clue 2: true"). */
  clues: readonly GridClue[];
  /** The marks in the item's grid (for "Fits every mark in the grid"). */
  marks?: { c: string; marks: Marks };
  /** The filled-in first part of a linking grid (for "Fits the grid"). */
  known?: { c: string; sol: Sol };
}

/** Recompute one truth from its words. Undefined when the words are not a truth this stop uses. */
function recompute(ctx: Ctx, who: string, ws: Sol[]): boolean | undefined {
  const { cast } = ctx;
  const w = wordsFor(cast);
  const one = () => {
    expect(ws.length, who).toBe(1);
    return ws[0];
  };
  for (const p of cast.spec.people) {
    for (const cat of cast.spec.cats) {
      for (const v of cat.values) {
        if (who === `${cast.nm(p)} could ${w.base(cat.id, v)}`) return ws.some((s) => s[p][cat.id] === v);
        if (who === `${cast.nm(p)} must ${w.base(cat.id, v)}`) return ws.length > 0 && ws.every((s) => s[p][cat.id] === v);
        if (who === w.is(p, cat.id, v)) return one()[p][cat.id] === v;
      }
    }
  }
  const k = /^Clue (\d+)$/.exec(who);
  if (k) return gridClueHolds(ctx.clues[Number(k[1]) - 1], one());
  if (who === 'The clue') {
    expect(ctx.clues.length).toBe(1);
    return gridClueHolds(ctx.clues[0], one());
  }
  if (who === 'Fits every mark in the grid') return marksOk(ctx.marks!.c, ctx.marks!.marks, one());
  if (who === 'Fits the grid') return cast.spec.people.every((p) => one()[p][ctx.known!.c] === ctx.known!.sol[p][ctx.known!.c]);
  return undefined;
}

/** A way's label names each person's values: "Fay eats grapes." or "Chip is red and is the cook." */
function wayNamed(cast: Cast, label: string, way: Sol, cats: readonly string[]) {
  const w = wordsFor(cast);
  for (const p of cast.people) {
    const m = new RegExp(`\\b${p.label} ([^.]*)\\.`).exec(label);
    expect(m, `${label} names ${p.label}`).not.toBeNull();
    for (const c of cats) expect(m![1], label).toContain(w.obj(c, way[p.id][c]));
  }
}

/** Every truth on every teaching case and every example matches a fresh computation. Returns how many were checked. */
function checkTruths(ctx: Ctx, item: Item, bases: Bases, wayCats: readonly string[]): number {
  const cases = item.teach?.cases ?? [];
  expect(bases.cases.length).toBe(cases.length);
  const all: [TeachCase, Basis][] = cases.map((c, i) => [c, bases.cases[i]]);
  if (item.kind === 'choose') for (const [id, fb] of Object.entries(item.feedback ?? {})) if (fb.example) all.push([fb.example, bases.examples[id]]);
  let n = 0;
  for (const [c, b] of all) {
    expect(b, c.label).toBeDefined();
    const ws = worldsOf(ctx.cast.spec, b);
    expect(ws.length, c.label).toBeGreaterThan(0);
    for (const t of c.truths ?? []) {
      expect(recompute(ctx, t.who, ws), `${c.label} | ${t.who}`).toBe(t.value);
      n++;
    }
    if (b.way) wayNamed(ctx.cast, c.label, b.way, wayCats);
  }
  return n;
}

/** The parts of Teach the panel shows, kept tight: 1-3 terms, 2-4 cases, the rule in a few words and a question. */
function teachShape(item: Item) {
  const t = item.teach!;
  expect(t, item.skill).toBeDefined();
  expect(t.rule.trim().length).toBeGreaterThan(0);
  expect(t.terms!.length).toBeGreaterThanOrEqual(1);
  expect(t.terms!.length).toBeLessThanOrEqual(3);
  expect(t.meaning!.trim().length).toBeGreaterThan(0);
  expect(t.casesTitle!.trim().length).toBeGreaterThan(0);
  expect(t.cases!.length).toBeGreaterThanOrEqual(2);
  expect(t.cases!.length).toBeLessThanOrEqual(4);
  expect(t.remember!.length).toBe(2);
  expect(t.remember![1]).toMatch(/^Ask: “.+\?”$/);
  expect(t.simpler!.length).toBeGreaterThanOrEqual(3);
  const words = [t.rule, ...t.terms!.map((x) => `${x.word} means ${x.meaning}`), t.meaning!, ...t.remember!, ...t.simpler!, ...t.cases!.flatMap((c) => [c.label, c.note ?? ''])].join(' ');
  expect(words).not.toMatch(/undefined|NaN|\{\w+\}|\s\s|\.\.|\[object|['"]/);
  // Never "both", "that row" or "the opposite" without saying what they refer to.
  expect(words).not.toMatch(/\b(?:that (?:row|column|box)|the opposite)\b/i);
}

/** Every wrong choice has its own explanation: a headline, detail and a counterexample. */
function coversWrong(item: ChooseItem) {
  const wrong = item.choices.map((c) => c.id).filter((id) => id !== item.answer);
  expect(Object.keys(item.feedback ?? {}).sort()).toEqual([...wrong].sort());
  for (const id of wrong) {
    const fb = item.feedback![id];
    expect(fb.headline).not.toMatch(/^(?:Wrong|Try again|Not yet)/);
    expect(fb.detail.length).toBeGreaterThan(0);
    expect(fb.example, `${item.skill} ${id}`).toBeDefined();
    expect(fb.example!.truths!.length).toBeGreaterThan(0);
  }
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Each headline matches the pattern of its own mistake kind and no other, so different kinds never read the same. */
function headlinesByKind<K extends string>(item: ChooseItem, kinds: Record<string, K>, pats: Record<K, RegExp>) {
  expect(Object.keys(kinds).sort()).toEqual(Object.keys(item.feedback!).sort());
  for (const [id, k] of Object.entries(kinds) as [string, K][]) {
    const h = item.feedback![id].headline;
    expect((Object.keys(pats) as K[]).filter((kk) => pats[kk].test(h)), h).toEqual([k]);
  }
  const ids = Object.keys(kinds);
  for (const a of ids) for (const b of ids) if (kinds[a] !== kinds[b]) expect(item.feedback![a].headline).not.toBe(item.feedback![b].headline);
}

describe('teaching after a wrong answer', () => {
  const N = 120;

  it('lesson 1: each case is one box, computed from the clue alone; each wrong box gets the reason for its own place', () => {
    for (let seed = 1; seed <= N; seed++) {
      for (const t of ['is', 'isnt', 'either'] as const) {
        const { item, cast, clue, ask, target, bases, kinds } = markPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), t });
        const c = cast.cats[0].cat.id;
        teachShape(item);
        coversWrong(item);
        for (const b of bases.cases) expect(b).toEqual({ clues: [clue] });
        checkTruths({ cast, clues: [clue] }, item, bases, [c]);
        // The cases show every way a box can go: the clue's box, a ✗ (when the clue gives one) and an empty box.
        const notes = item.teach!.cases!.map((x) => x.note!);
        expect(notes[0]).toMatch(ask === 'yes' ? /gets a ✓\.$/ : /gets a ✗\.$/);
        expect(notes.some((x) => /stays empty/.test(x))).toBe(true);
        if (t === 'is') expect(notes.some((x) => /gets a ✗\.$/.test(x))).toBe(true);
        const P = esc(cast.nm(target.p));
        headlinesByKind(item, kinds, {
          row: new RegExp(`^Your box is in ${P}’s row, but not in the .+ column\\.$`),
          col: new RegExp(`^Your box is in the .+ column, but not in ${P}’s row\\.$`),
          neither: new RegExp(`^Your box is not in ${P}’s row or the .+ column\\.$`),
          named: /^Your box is one of the two \w+ the clue names\.$/,
        });
        for (const [id, fb] of Object.entries(item.feedback!)) {
          const [p, v] = id.split('-');
          // The kind says where the box is.
          const kind = clue.t === 'either' && p === target.p ? 'named' : p === target.p ? 'row' : v === target.v ? 'col' : 'neither';
          expect(kinds[id]).toBe(kind);
          // The example is the picked box, and it does not get the asked mark.
          expect(fb.example!.label).toBe(`${item.choices.find((ch) => ch.id === id)!.label}.`);
          const [could, must] = fb.example!.truths!;
          if (ask === 'yes') expect(must.value).toBe(false);
          else expect(could.value).toBe(true);
        }
      }
    }
  });

  it('lesson 2: the cases are the asked row or column now and with one ✗ more or less; wrong picks are shown false', () => {
    for (let seed = 1; seed <= N; seed++) {
      for (const mode of ['col', 'row', 'cant'] as const) {
        const r = onlyOnePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode, n: seed % 3 === 0 ? 4 : 3, ask: seed % 2 === 0 ? 'col' : 'row' });
        const { item, cast, marks, ask, p, val, bases, kinds, boundary } = r;
        const c = cast.cats[0].cat.id;
        const w = wordsFor(cast);
        teachShape(item);
        coversWrong(item);
        const gridMarks = { c, marks };
        expect(bases.cases).toEqual([{ marks: gridMarks }, { marks: { c, marks: boundary } }]);
        checkTruths({ cast, clues: [], marks: gridMarks }, item, bases, [c]);
        // The boundary grid only marks the asked line, with one ✗ more (when two boxes were empty) or one fewer.
        const line = (m: Marks) => (ask === 'col' ? cast.spec.people.filter((q) => m[q][val] === 'no') : cast.spec.cats[0].values.filter((x) => m[p][x] === 'no'));
        for (const q of cast.spec.people) for (const x of Object.keys(boundary[q])) expect(ask === 'col' ? x === val : q === p).toBe(true);
        expect(line(boundary).length - line(marks).length).toBe(mode === 'cant' ? 1 : -1);
        // Each line case names exactly its crossed-out boxes. One empty box must get the ✓; with two, each one could
        // (over every mark of that grid), and only that makes it “Can’t tell yet”.
        item.teach!.cases!.forEach((cs, i) => {
          const m = i === 0 ? marks : boundary;
          const first = cs.label.split('. ')[0];
          // The boundary grid says it has no other marks: its truths ignore this grid's other ✗s.
          expect(first.startsWith(i === 0 ? 'In this grid, ' : 'In a grid with no other marks, '), first).toBe(true);
          if (ask === 'col') expect(namedIn(cast, first)).toEqual([...line(m)].sort());
          else for (const x of cast.spec.cats[0].values) expect(first.includes(` ${w.obj(c, x)}`), first).toBe(line(m).includes(x));
          const open = cs.truths!.length;
          expect(cs.truths!.every((t) => t.value), cs.label).toBe(true);
          expect(cs.truths!.every((t) => (open === 1 ? / must / : / could /).test(t.who))).toBe(true);
          expect(cs.note).toBe(open === 1 ? 'One empty box is left, so it gets the ✓.' : `${['', '', 'Two', 'Three'][open]} boxes are empty, and each could still get the ✓. So you can’t tell yet.`);
        });
        // Two empty boxes in one line are never taught as “Can’t tell yet” on their own (another line can decide it).
        const t = item.teach!;
        for (const s of [...t.remember!, ...t.simpler!]) expect(s, s).not.toMatch(/(?:Two or more|two or more boxes are left)[:,] you can’t tell yet/);
        expect(t.simpler!.join(' ')).toMatch(/look at the other marks too/);
        const whoName = (id: string) => esc(ask === 'col' ? cast.nm(id) : cast.nm(p));
        for (const [id, k] of Object.entries(kinds)) {
          const box = ask === 'col' ? marks[id]?.[val] : marks[p][id];
          expect(k).toBe(id === CANT ? 'cant' : box === 'no' ? 'crossed' : 'open');
          const ex = item.feedback![id].example!;
          if (k === 'open') {
            // A way that fits every mark where the pick does not get the ✓.
            expect(ex.truths!.map((t) => t.value)).toEqual([true, false]);
            // The other open box has a ✗ off the line (in its kid's row, or in its thing's column): the box-vs-kid mix-up
            // is named first. Otherwise “X could …, but so could Y”.
            const other = (ask === 'col' ? cast.spec.people : cast.spec.cats[0].values).find((s2) => s2 !== id && (ask === 'col' ? marks[s2][val] === undefined : marks[p][s2] === undefined))!;
            const lure = ask === 'col'
              ? cast.spec.cats[0].values.find((y) => y !== val && marks[other][y] === 'no')
              : cast.spec.people.find((q) => q !== p && marks[q][other] === 'no');
            const fb = item.feedback![id];
            if (lure) {
              expect(fb.headline).toBe(ask === 'col'
                ? `You may be treating any cross in ${cast.nm(other)}’s row as a cross for ${w.obj(c, val)}.`
                : `You may be treating ${cast.nm(lure)}’s cross for ${w.obj(c, other)} as a cross in ${cast.nm(p)}’s row.`);
              expect(fb.detail[0]).toBe('A cross means no for its own box only.');
            } else expect(fb.headline).toMatch(new RegExp(`^${whoName(id)} could `));
            // The “different column” (or “different row”) line, for each open box with a ✗ off the line.
            for (const r of [id, other]) {
              const off = ask === 'col' ? cast.spec.cats[0].values.find((y) => y !== val && marks[r][y] === 'no') : cast.spec.people.find((q) => q !== p && marks[q][r] === 'no');
              if (!off) continue;
              expect(fb.detail).toContain(ask === 'col'
                ? `${cast.nm(r)}’s ✗ for ${w.obj(c, off)} is in a different column, so it does not rule ${cast.nm(r)} out for ${w.obj(c, val)}.`
                : `${cast.nm(off)}’s ✗ for ${w.obj(c, r)} is in ${cast.nm(off)}’s row, so it does not rule ${w.obj(c, r)} out for ${cast.nm(p)}.`);
            }
          }
          if (k === 'crossed') {
            // The pick could not; then the line's empty boxes, as in the grid's own case.
            expect(ex.truths![0].value).toBe(false);
            expect(ex.truths!.slice(1)).toEqual(item.teach!.cases![0].truths);
          }
          if (k === 'cant') {
            expect(ex.truths!.every((t) => t.value)).toBe(true);
            // A decided grid whose answer has a ✗ off the line (in the holder's row, or another kid's ✗ under the
            // answer): the note says that ✗ does not rule the answer out.
            const H = item.answer;
            const off = ask === 'col' ? cast.spec.cats[0].values.find((y) => y !== val && marks[H][y] === 'no') : cast.spec.people.find((q) => q !== p && marks[q][H] === 'no');
            const note = !off ? undefined : ask === 'col'
              ? `${cast.nm(H)}’s ✗ for ${w.obj(c, off)} is in a different column, so it does not rule ${cast.nm(H)} out for ${w.obj(c, val)}.`
              : `${cast.nm(off)}’s ✗ for ${w.obj(c, H)} is in ${cast.nm(off)}’s row, so it does not rule ${w.obj(c, H)} out for ${cast.nm(p)}.`;
            if (note) expect(item.feedback![id].detail).toContain(note);
            else expect(item.feedback![id].detail.join(' ')).not.toMatch(/does not rule/);
          }
        }
        headlinesByKind(item, kinds, {
          crossed: /has a ✗\.$/,
          cant: /, so you can tell\.$/,
          open: /^(?:\S+ could .+, but (?:so could \S+|\S+ could .+ too)|You may be treating .+ as a cross (?:for|in) .+)\.$/,
        });
        // Every can’t-tell grid is the tempting kind (a ✗ off the line in an open box's line), tagged for the pass rule.
        if (mode === 'cant') expect(item.tags).toEqual(['cant-tell']);
        else expect(item.tags).toBeUndefined();
        // The Hint's case rules out one box, never the whole kid: “So Tia can’t eat apples.”
        const [hq, hx] = ask === 'col' ? [/^In this grid, (.+?)’s box/.exec(item.hintCase!.label)![1], val] : [cast.nm(p), ''];
        expect(item.hintCase!.note).toMatch(new RegExp(`^A ✗ means no\\. So ${esc(hq)} can’t .+\\.$`));
        if (ask === 'col') expect(item.hintCase!.note).toBe(`A ✗ means no. So ${hq} can’t ${w.base(c, hx)}.`);
      }
    }
  });

  it('lesson 3: the cases are a box in the ✓’s row, one in its column and one outside both; every tip names its box and place', () => {
    for (let seed = 1; seed <= N; seed++) {
      for (const column of [false, true]) {
        const { item, cast, marks, p, val, bases } = spreadPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), column, n: seed % 3 === 0 ? 4 : 3 });
        const c = cast.cats[0].cat.id;
        const w = wordsFor(cast);
        teachShape(item);
        checkTruths({ cast, clues: [], marks: { c, marks } }, item, bases, [c]);
        expect(item.teach!.cases!.map((x) => x.note!.replace(/^So .+ (gets|stays)/, '$1'))).toEqual(['gets a ✗.', 'gets a ✗.', 'stays empty for now.']);
        expect(item.prompt).not.toMatch(/that box/);
        expect(item.prompt).toContain(`so ${w.cell(p, val, c)} gets a ✓. Choose every box that must now get a ✗.`);
        for (const [id, tip] of Object.entries(item.missTips!)) {
          const [q] = id.split('-');
          const label = item.choices.find((ch) => ch.id === id)!.label;
          expect(tip.startsWith(`You left out ${label}, which is in ${q === p ? `${cast.nm(p)}’s row` : `the ${w.val(c, val).label} column`}.`), tip).toBe(true);
        }
        for (const [id, tip] of Object.entries(item.pickTips!)) {
          const label = item.choices.find((ch) => ch.id === id)!.label;
          expect(tip.startsWith(`${label} is not in ${cast.nm(p)}’s row or the ${w.val(c, val).label} column.`), tip).toBe(true);
        }
      }
    }
  });

  it('lesson 4: each case is one person, with who could still have the thing; every wrong pick has its own reason', () => {
    for (let seed = 1; seed <= N; seed++) {
      for (const mode of ['link', 'notLink2', 'notLink'] as const) {
        const { item, cast, sol, clues, c1, c2, val, bases, kinds } = linkPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode });
        teachShape(item);
        coversWrong(item);
        const known: GridClue[] = cast.spec.people.map((q) => ({ t: 'is', p: q, c: c1, v: sol[q][c1] }));
        for (const b of Object.values(bases.examples).concat(bases.cases)) if (!b.way) expect(b).toEqual({ clues: [...known, ...clues] });
        checkTruths({ cast, clues, known: { c: c1, sol } }, item, bases, [c2]);
        expect(item.teach!.cases!.map((x) => x.label)).toEqual(cast.people.map((q) => `${wordsFor(cast).is(q.id, c1, sol[q.id][c1])}.`));
        const sols = fit(cast.spec, [...known, ...clues]);
        for (const [id, k] of Object.entries(kinds)) {
          const could = id !== CANT && status(sols, id, c2, val) !== 'no';
          expect(k).toBe(id === CANT ? 'cant' : !could ? (mode === 'link' ? 'not-holder' : 'crossed') : 'open');
        }
        headlinesByKind(item, kinds, {
          'not-holder': /^\S+ is not .+\.$/,
          crossed: /^(?:The clue|Clue \d) crosses out \S+ for .+\.$/,
          cant: /^You can tell, because .+\.$/,
          open: /^\S+ could .+, but so could \S+\.$/,
        });
      }
    }
  });

  it('lesson 5: each wrong clue gets a way where that clue is true and the ✗ is wrong; its kind says why', () => {
    for (let seed = 1; seed <= N; seed++) {
      const ncat = seed % 3 === 0 ? 2 : 1;
      const { item, cast, clues, target, bases, kinds } = proofPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat });
      const { p, c, v } = target;
      teachShape(item);
      coversWrong(item);
      checkTruths({ cast, clues }, item, bases, cast.spec.cats.map((k) => k.id));
      // Each case is one clue alone, named in its label.
      item.teach!.cases!.forEach((cs, i) => {
        const k = Number(/^Clue (\d+): /.exec(cs.label)![1]) - 1;
        expect(cs.label).toBe(`Clue ${k + 1}: ${clueText(cast, clues[k])}`);
        expect(bases.cases[i]).toEqual({ clues: [clues[k]] });
      });
      expect(item.teach!.cases!.some((cs) => cs.label.startsWith(`Clue ${Number(item.answer.slice(1))}:`))).toBe(true);
      const w = wordsFor(cast);
      const vals = cast.spec.cats.find((k) => k.id === c)!.values;
      for (const [id, fb] of Object.entries(item.feedback!)) {
        const cl = clues[Number(id.slice(1)) - 1];
        // The counterexample: the clue is true there, and the person has the thing.
        expect(fb.example!.truths!.map((t) => t.value)).toEqual([true, true]);
        // What the clue decides all by itself, by this file's brute force: the boxes it crosses out in the person's row
        // or the thing's column, and whether it decides any box at all in this part of the grid.
        const alone = fit(cast.spec, [cl]);
        expect(status(alone, p, c, v)).toBe('open');
        const crossed = [
          ...cast.spec.people.filter((q) => q !== p && status(alone, q, c, v) === 'no').map((q) => w.cell(q, v, c)),
          ...vals.filter((y) => y !== v && status(alone, p, c, y) === 'no').map((y) => w.cell(p, y, c)),
        ];
        const decidesHere = cast.spec.people.some((q) => vals.some((y) => status(alone, q, c, y) !== 'open'));
        const want = cl.t === 'link' || cl.t === 'notLink' ? 'link'
          : cl.c !== c ? 'other-part'
            : cl.p === p ? (cl.t === 'either' && (cl.v1 === v || cl.v2 === v) ? 'or-names-it' : cl.t === 'isnt' ? 'same-person' : 'proves')
              : (cl.t === 'either' ? cl.v1 === v || cl.v2 === v : cl.v === v) ? 'same-thing'
                : crossed.length ? 'other-box' : 'neither';
        expect(kinds[id], fb.headline).toBe(want);
        const words = [fb.headline, ...fb.detail].join(' ');
        // Each kind's claim holds for what the clue decides by itself.
        if (want === 'other-part') expect(decidesHere, words).toBe(false);
        if (want === 'neither') expect(crossed, words).toEqual([]);
        if (want === 'other-box') {
          expect(fb.headline).toBe(`Clue ${id.slice(1)} crosses out ${joinNames(crossed)}, not ${w.cell(p, v, c)}.`);
          expect(fb.detail[0]).toContain(`With only this clue, ${cast.nm(p)} could still `);
        }
        // “Says nothing about” is said only of a clue about the other part of the grid, never of the person or thing.
        if (/says nothing about/.test(words)) expect(want, words).toBe('other-part');
        expect(words).not.toMatch(new RegExp(`says nothing about ${esc(cast.nm(p))}\\b`));
        // Every wrong clue ends its reason on the same question the cases ask.
        if (want !== 'or-names-it' && want !== 'same-person') expect(words).toMatch(/With only this clue, |So by itself, it does not rule out /);
      }
      const P = esc(cast.nm(p));
      const X = esc(w.obj(c, v));
      headlinesByKind(item, kinds, {
        'or-names-it': new RegExp(`^Clue \\d names ${X} as one of two choices for ${P}\\.$`),
        'same-person': new RegExp(`^Clue \\d is about ${P}, but not about ${X}\\.$`),
        'other-part': new RegExp(`^Clue \\d is about \\S+’s \\w+, not ${P}’s \\w+\\.$`),
        'same-thing': new RegExp(`^Clue \\d is about ${X}, but not about ${P}\\.$`),
        'other-box': /^Clue \d crosses out .+ – .+, not .+ – .+\.$/,
        link: new RegExp(`^Clue \\d is a linking clue, and it does not name ${P}\\.$`),
        neither: new RegExp(`^Clue \\d is not about ${P} or ${X}\\.$`),
      });
    }
  });

  it('lesson 5: a clue about another person that crosses out a box beside the asked one is never called “not about” it', () => {
    // Regression (practice seed 2, l5-1, clue 3): “Cal has the cat or the dog.” crosses out Cal – fish, so it is about the
    // fish after all. It was explained as “It says nothing about Kai or the fish.” Now its kind comes from what it
    // decides by itself.
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      for (const ncat of [1, 2] as const) {
        const { item, cast, clues, target, kinds } = proofPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat });
        for (const [id, k] of Object.entries(kinds)) {
          const cl = clues[Number(id.slice(1)) - 1];
          seen.add(`${k}:${cl.t}${cl.t !== 'link' && cl.t !== 'notLink' && cl.p !== target.p ? ':other' : ''}`);
          if (k !== 'neither') continue;
          // A clue left as “not about the person or the thing” decides no box in the person's row or the thing's column.
          const alone = fit(cast.spec, [cl]);
          const vals = cast.spec.cats.find((x) => x.id === target.c)!.values;
          expect(vals.every((y) => status(alone, target.p, target.c, y) === 'open'), item.feedback![id].headline).toBe(true);
          expect(cast.spec.people.every((q) => status(alone, q, target.c, target.v) === 'open')).toBe(true);
        }
      }
    }
    // Both new routes occur: an “or” clue that leaves the thing out, and a clue about another person in the other part.
    expect(seen.has('other-box:either:other')).toBe(true);
    expect(seen.has('other-part:is:other') || seen.has('other-part:isnt:other') || seen.has('other-part:either:other')).toBe(true);
  });

  it('lesson 5: “can you tell yet?” shows who could, using only clues 1 and 2', () => {
    for (let seed = 1; seed <= N; seed++) {
      for (const tell of [true, false]) {
        const ncat = seed % 3 === 0 ? 2 : 1;
        const { item, cast, clues, c, val, bases } = enoughPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), tell, ncat });
        teachShape(item);
        coversWrong(item);
        for (const b of [...bases.cases, ...Object.values(bases.examples)]) expect(b).toEqual({ clues: clues.slice(0, 2) });
        checkTruths({ cast, clues }, item, bases, [c]);
        const who = whoCan(fit(cast.spec, clues.slice(0, 2)), c, val, cast.spec.people);
        const fb = item.feedback![tell ? CANT : 'yes'];
        expect(fb.headline).toMatch(tell ? /^Clues 1 and 2 already leave only \S+\.$/ : /^With only clues 1 and 2, .+ could each .+\.$/);
        expect(fb.example!.truths!.filter((t) => / could /.test(t.who) && t.value).length).toBe(who.length);
      }
    }
  });

  it('whole grids: the steps are the solver’s first ✓ marks with their reasons, and the check shows every clue true', () => {
    for (let seed = 1; seed <= N; seed++) {
      for (const ncat of [1, 2] as const) {
        const { item, cast, sol, clues, bases, steps } = gridPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat });
        const w = wordsFor(cast);
        teachShape(item);
        const cases = item.teach!.cases!;
        expect(cases.length).toBe(steps.length + 1);
        steps.forEach((st, i) => {
          expect(cases[i].label).toBe(`Step ${i + 1}: ${w.is(st.p, st.c, st.v)}.`);
          expect(cases[i].note).toBe(tickText(cast, clues, st));
          expect(sol[st.p][st.c]).toBe(st.v);
        });
        expect(bases.cases[steps.length]).toEqual({ way: sol });
        checkTruths({ cast, clues }, item, bases, cast.spec.cats.map((k) => k.id));
        expect(cases[steps.length].truths!.map((t) => t.who)).toEqual(clues.map((_, i) => `Clue ${i + 1}`));
        // The simpler example agrees with the answer: every "So …" in it is true, every ✓ it puts is in a box the
        // answer gives a ✓, and every ✗ in a box the answer does not.
        const boxes = cast.people.flatMap((p) => cast.spec.cats.flatMap((k) => k.values.map((v) => ({ p: p.id, c: k.id, v }))));
        for (const line of item.teach!.simpler!) {
          for (const m of line.matchAll(/So ([^.]+)\./g)) {
            const f = boxes.find((x) => w.is(x.p, x.c, x.v) === m[1]);
            expect(f, m[1]).toBeDefined();
            expect(sol[f!.p][f!.c]).toBe(f!.v);
          }
          for (const m of line.matchAll(/(?:a ✓ in|a ✗ in) ([^.:]+?)[.:]|([^.:]+?) gets a ✗/g)) {
            const label = (m[1] ?? m[2]).replace(/^.*: /, '').trim();
            const f = boxes.find((x) => w.cell(x.p, x.v, x.c) === label);
            expect(f, `${line} | ${label}`).toBeDefined();
            expect(sol[f!.p][f!.c] === f!.v, line).toBe(/a ✓ in/.test(m[0]));
          }
          // Never “that ✓”: the ✓ it spreads is named first.
          expect(line).not.toMatch(/\bthat ✓/);
        }
      }
    }
  });

  it('every item in every practice set and check teaches, and every wrong choice has its own explanation', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const items = [...stop4.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop4.check!(createRng(seed)), stop4.practice!(createRng(seed))];
      for (const it of items) {
        teachShape(it);
        if (it.kind === 'choose') coversWrong(it);
      }
    }
  });

  it('every special word an explanation uses is defined in its own terms: spreading a ✓, a linking clue, ✗ when a ✗ is proved', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const items = [...stop4.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop4.check!(createRng(seed)), stop4.practice!(createRng(seed))];
      for (const it of items) {
        const t = it.teach!;
        const words = t.terms!.map((x) => x.word);
        // Everything the panel shows except the definitions themselves.
        const text = [t.rule, t.meaning ?? '', ...(t.cases ?? []).flatMap((c) => [c.label, c.note ?? '']), ...t.remember!, ...t.simpler!,
          ...(it.kind === 'choose' ? Object.values(it.feedback ?? {}).flatMap((fb) => [fb.headline, ...fb.detail]) : [])].join(' ');
        if (/\bspread/i.test(text)) expect(words, `${it.skill}: ${text}`).toContain('Spreading a ✓');
        if (/linking clue/i.test(text)) expect(words, it.skill).toContain('A linking clue');
        if (/“Only one left”|only one left/i.test(t.remember!.join(' '))) expect(words, it.skill).toContain('“Only one left”');
        if (it.skill === 's4.proof-clue' && !words.includes('A linking clue')) expect(words).toContain('A ✗ in a box');
      }
    }
  });

  it('lesson 2: the boundary grid has no other marks, because keeping this grid’s other ✗s can decide the line', () => {
    // Regression: the second case was labelled “In another grid” while its truths ignored this grid's other ✗s. Read as
    // “this grid with one ✗ fewer”, some of them were wrong. Find such grids, and check the label rules that reading out.
    let decidedElsewhere = 0;
    for (let seed = 1; seed <= 200; seed++) {
      for (const mode of ['col', 'row', 'cant'] as const) {
        const { item, cast, marks, boundary, ask, p, val } = onlyOnePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode, n: 3, ask: seed % 2 ? 'col' : 'row' });
        const c = cast.cats[0].cat.id;
        const kept: Marks = JSON.parse(JSON.stringify(marks));
        for (const q of cast.spec.people) {
          for (const x of cast.spec.cats[0].values) {
            if (ask === 'col' ? x !== val : q !== p) continue;
            delete kept[q][x];
            if (boundary[q][x]) kept[q][x] = boundary[q][x];
          }
        }
        const line = ask === 'col' ? cast.spec.people.map((q) => [q, val]) : cast.spec.cats[0].values.map((x) => [p, x]);
        const said = line.map(([q, x]) => status(fitMarks(cast.spec, c, boundary), q, c, x)).join();
        const withKept = line.map(([q, x]) => status(fitMarks(cast.spec, c, kept), q, c, x)).join();
        if (said !== withKept) decidedElsewhere++;
        expect(item.teach!.cases![1].label.startsWith('In a grid with no other marks, ')).toBe(true);
      }
    }
    expect(decidedElsewhere).toBeGreaterThan(0);
  });

  it('a miss gets new examples on the same skill; with “Can’t tell yet” as a choice, one decided and one not', () => {
    const boundary = new Set(['s4.only-one-left', 's4.not-decided', 's4.link', 's4.not-link', 's4.enough-clues']);
    const open = (x: Item) => x.kind === 'choose' && x.answer === CANT;
    const markType = (x: Item) => (/gets a ✓/.test(x.prompt) ? 'is' : / or [^“”]*”/.test(x.prompt) ? 'either' : 'isnt');
    for (let seed = 1; seed <= 25; seed++) {
      const items = [...stop4.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop4.check!(createRng(seed))];
      for (const it of items) {
        const set = freshCheckSet(stop4, it, seed * 31, [], 1);
        expect(set.length, it.skill).toBeGreaterThan(0);
        expect(set[0].skill).toBe(it.skill);
        expect(set.every((x) => x.lesson === it.lesson)).toBe(true);
        expect(new Set([it, ...set].map(looks)).size).toBe(set.length + 1);
        if (boundary.has(it.skill)) {
          expect(set.length).toBe(2);
          // One the marks or clues decide and one they do not.
          expect(set.map(open).sort()).toEqual([false, true]);
          expect(open(set[0])).toBe(open(it));
        }
        if (it.skill === 's4.grid-marks') expect(markType(set[0])).toBe(markType(it));
      }
    }
  });
});

// ---------- See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026) ----------
//
// Every guided-board mark is worked out again here from the words on the board alone: the clue sentences (read by
// this file's own reader, not the engine's clueText), the marks the card picture draws, and the question in each
// mark's label. This file's own brute force (every way to hand out the values) then gives the answer.

const KID_PETS = ['cat', 'dog', 'fish'];
const KID_SNACKS = ['apples', 'popcorn', 'grapes'];
const PAIR_SNACKS = ['apple', 'bread'];
const valueCat = (v: string): string => {
  if (KID_PETS.includes(v)) return 'pet';
  if (KID_SNACKS.includes(v)) return 'snack';
  if (PAIR_SNACKS.includes(v)) return 'lunch';
  throw new Error(`unknown value ${v}`);
};
const kid = (name: string) => name.toLowerCase();

/** Reads one clue sentence from a card or a board ("Leo has the cat or the fish."). */
function readClue(text: string): GridClue {
  let m: RegExpExecArray | null;
  if ((m = /^(\w+) has the (\w+) or the (\w+)\.$/.exec(text))) return { t: 'either', p: kid(m[1]), c: valueCat(m[2]), v1: m[2], v2: m[3] };
  if ((m = /^(\w+) has the (\w+)\.$/.exec(text))) return { t: 'is', p: kid(m[1]), c: valueCat(m[2]), v: m[2] };
  if ((m = /^(\w+) does not have the (\w+)\.$/.exec(text))) return { t: 'isnt', p: kid(m[1]), c: valueCat(m[2]), v: m[2] };
  if ((m = /^The kid with the (\w+) eats (\w+)\.$/.exec(text))) return { t: 'link', c1: 'pet', v1: m[1], c2: 'snack', v2: m[2] };
  if ((m = /^The kid with the (\w+) does not eat (\w+)\.$/.exec(text))) return { t: 'notLink', c1: 'pet', v1: m[1], c2: 'snack', v2: m[2] };
  if ((m = /^(\w+) does not eat (\w+)\.$/.exec(text))) return { t: 'isnt', p: kid(m[1]), c: 'snack', v: m[2] };
  if ((m = /^(\w+) eats (\w+)\.$/.exec(text))) return { t: 'is', p: kid(m[1]), c: 'snack', v: m[2] };
  throw new Error(`cannot read clue: ${text}`);
}

/** The marks a card picture draws, as facts: a ✓ says “has”, a ✗ says “does not have”. */
function pictureFacts(scene: Scene | undefined): GridClue[] {
  if (scene?.kind !== 'grid') return [];
  return Object.entries(scene.marks).flatMap(([p, m]) =>
    Object.entries(m).map(([v, mk]): GridClue => (mk === 'yes' ? { t: 'is', p, c: valueCat(v), v } : { t: 'isnt', p, c: valueCat(v), v })));
}

/**
 * The world a board is about, from the values its words name: the pet grid, the snack grid, the pet and snack grid, or
 * the two-kid grid.
 */
function boardSpec(step: DrillStep): Spec {
  // The board's own words: its picture, instructions and rows (its “I’m confused” questions use the card's example).
  const words = JSON.stringify([step.scene ?? null, step.body, step.columns ?? null, step.rows]);
  const names = (vs: string[]) => vs.some((v) => new RegExp(`\\b${v}\\b`).test(words));
  if (names(PAIR_SNACKS)) return { people: ['mia', 'leo'], cats: [{ id: 'lunch', values: PAIR_SNACKS }] };
  if (names(KID_SNACKS) && !names(KID_PETS)) return { people: ['mia', 'leo', 'ava'], cats: [{ id: 'snack', values: KID_SNACKS }] };
  if (names(KID_SNACKS)) return { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: KID_PETS }, { id: 'snack', values: KID_SNACKS }] };
  return { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: KID_PETS }] };
}

/** What each row of a card board knows, read from its label (and the card picture or clue list above it). */
function rowClues(step: DrillStep): GridClue[][] {
  const facts = pictureFacts(step.scene);
  const list = step.scene?.kind === 'clues' ? step.scene.clues : [];
  let prev: GridClue[] = facts;
  return step.rows.map((r) => {
    let m: RegExpExecArray | null;
    let out: GridClue[];
    if ((m = /^Only clue: (.+)$/.exec(r.label))) out = [readClue(m[1])];
    else if (/^Use only clues 1 and 2\./.test(r.label)) out = list.slice(0, 2).map(readClue);
    // A grid of the contrast, drawn in words: its crosses, one sentence each.
    else if ((m = /^(?:First|Second) grid: (.+)$/.exec(r.label))) out = m[1].split(/(?<=\.) /).map(readClue);
    // Back to the card's picture, with one ✗ added.
    else if ((m = /^Back to the card’s grid\. Add a ✗: (.+)$/.exec(r.label))) out = [...facts, readClue(m[1])];
    // The same clues as the row before (a carry back across a link).
    else if (/^Carry back across clue \d+\.$/.test(r.label)) out = [...prev];
    else if ((m = /^Add (?:a ✗|clue \d+): (.+)$/.exec(r.label))) out = [...prev, readClue(m[1])];
    else if ((m = /^(?:Clue \d+|A new clue on its own): (.+)$/.exec(r.label))) out = [...facts, readClue(m[1])];
    else out = [...facts];
    prev = out;
    return out;
  });
}

/** A mark's answer, worked out from the question in its label and the clues its row knows. */
function answerFromWords(spec: Spec, clues: readonly GridClue[], label: string): string {
  const sols = fit(spec, clues);
  expect(sols.length, label).toBeGreaterThan(0);
  let m: RegExpExecArray | null;
  const one = () => {
    expect(spec.cats.length, label).toBe(1);
    return spec.cats[0];
  };
  /** Boxes drawn so far: the picture's marks and every “has” or “does not have” sentence the row adds. */
  const drawn = (p: string, v: string) => clues.some((cl) => (cl.t === 'is' || cl.t === 'isnt') && cl.p === p && cl.v === v);
  if ((m = /^(\w+) – (\w+)$/.exec(label))) {
    const st = status(sols, kid(m[1]), valueCat(m[2]), m[2]);
    return st === 'open' ? CANT : st;
  }
  if ((m = /^Empty boxes in (\w+)’s row$/.exec(label))) return String(one().values.filter((v) => !drawn(kid(m![1]), v)).length);
  if ((m = /^Empty boxes in the (\w+) column$/.exec(label))) return String(spec.people.filter((p) => !drawn(p, m![1])).length);
  if ((m = /^Could (\w+) have the (\w+)\?$/.exec(label))) return status(sols, kid(m[1]), valueCat(m[2]), m[2]) === 'no' ? 'no' : 'yes';
  if ((m = /^How many kids could have the (\w+)\?$/.exec(label))) return String(whoCan(sols, valueCat(m[1]), m[1], spec.people).length);
  throw new Error(`cannot read the question: ${label}`);
}

/** What the words for a wrong tap must name: the box, the line, the person or the thing the mark is about. */
function mustName(st: DrillStep, m: DrillMark, option: string): string[] {
  const row = st.rows.find((r) => r.marks.includes(m))!;
  if (st.columns) return [`${row.label} – ${m.label}`];
  let x: RegExpExecArray | null;
  if (/^\w+ – \w+$/.test(m.label)) return [m.label];
  if ((x = /^Empty boxes in (.+)$/.exec(m.label))) return [x[1]];
  if ((x = /^Could (\w+) have the (\w+)\?$/.exec(m.label))) return [x[1], `the ${x[2]}`];
  // A count of who could: the thing, and the count against the tap.
  if ((x = /^How many kids could have the (\w+)\?$/.exec(m.label))) return [`the ${x[1]}`, `makes ${m.answer}, not ${option}`];
  throw new Error(`cannot read the question: ${m.label}`);
}

const boardText = (st: DrillStep) => [st.title, ...st.body, st.done, ...st.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])])];
const lessonOf = (id: string) => stop4.lessons.find((l) => l.id === id)!;
const cardScenes = (id: string) => lessonOf(id).ideas.map((c) => c.scene).filter((x): x is Scene => !!x);
const gridCard = (id: string, title: string) => lessonOf(id).ideas.find((c) => c.title === title)!.scene as Extract<Scene, { kind: 'grid' }>;
const right = (st: DrillStep) => Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));

/** The quiz families each lesson's See and Do teach (skill tags). */
const TAUGHT: Record<string, string[]> = {
  's4.l1': ['s4.grid-marks'],
  's4.l2': ['s4.only-one-left', 's4.not-decided'],
  's4.l3': ['s4.spread-tick', 's4.spread-column', 's4.grid-one'],
  's4.l4': ['s4.link', 's4.not-link', 's4.grid-two'],
  's4.l5': ['s4.proof-clue', 's4.enough-clues'],
};
/** A puzzle about two parts of a grid says what each person has in a second sentence (“They each eat …”). */
const twoPart = (it: Item) => / They (?:each|are each) /.test(it.prompt);

describe('See -> Do -> Quiz (the skill-drill handoff)', () => {
  it('every lesson has guided boards; every mark is worked out again from the words on the board', () => {
    let marks = 0;
    for (const l of stop4.lessons) {
      expect(l.drill?.length ?? 0, l.id).toBeGreaterThan(0);
      for (const st of l.drill!) {
        const spec = boardSpec(st);
        if (st.columns) {
          // A grid board: the picture above (the other part, if any) and the clues in its words.
          const clues = [...pictureFacts(st.scene), ...st.body.flatMap((b) => {
            const m = /^Clue \d+: (.+)$/.exec(b);
            return m ? [readClue(m[1])] : [];
          })];
          const sols = fit(spec, clues);
          for (const r of st.rows) {
            r.marks.forEach((m, k) => {
              const v = st.columns![k];
              expect(m.label).toBe(v);
              const st_ = status(sols, kid(r.label), valueCat(v), v);
              expect(st_, `${st.id} ${r.label} – ${v}: every grid box is decided`).not.toBe('open');
              expect(m.answer, `${st.id} ${r.label} – ${v}`).toBe(st_);
              marks++;
            });
          }
        } else {
          const rows = rowClues(st);
          st.rows.forEach((r, i) => {
            for (const m of r.marks) {
              expect(m.answer, `${st.id} ${r.label} | ${m.label}`).toBe(answerFromWords(spec, rows[i], m.label));
              marks++;
            }
          });
        }
      }
    }
    expect(marks).toBeGreaterThan(60);
  });

  it('each board is the worked example’s own board: a card’s scene, or the card’s grid with its marks shown', () => {
    for (const l of stop4.lessons) {
      for (const st of l.drill!) {
        if (st.scene) {
          // The same scene object as a key-idea card of this lesson (drawn above the board).
          expect(cardScenes(l.id).some((sc) => sc === st.scene), `${st.id} shows a card’s own scene`).toBe(true);
          continue;
        }
        // A one-part grid board is the card's grid itself: same rows, same columns, and every shown box is a card mark.
        expect(st.columns, st.id).toBeDefined();
        const card = l.ideas.map((c) => c.scene).find((sc) => sc?.kind === 'grid' && sc.rows.map((r) => r.label).join() === st.rows.map((r) => r.label).join() && sc.cols.map((c) => c.label).join() === st.columns!.join()
          && JSON.stringify(Object.fromEntries(st.rows.map((r) => [kid(r.label), Object.fromEntries(r.marks.filter((m) => m.given).map((m) => [m.label, m.answer]))]).filter(([, m]) => Object.keys(m).length))) === JSON.stringify(sc.marks));
        expect(card, `${st.id} shows exactly a card’s grid`).toBeDefined();
      }
    }
    expect(L1_GRID.rows.flatMap((r) => r.marks.filter((m) => m.given))).toHaveLength(2);
  });

  it('Do (the handoff’s sample): Mia’s ✓ and ✗ are shown; the learner taps a ✗ on Leo – apple, then the ✓ on Leo – bread, the last box', () => {
    const l1 = stop4.lessons[0];
    expect(l1.drill![0]).toBe(L1_GRID);
    const see = gridCard('s4.l1', 'One each');
    expect(see).toBe(CARD_GRIDS.oneEach);
    expect(see.caption).toBe('Mia has the apple. A ✓ in a row crosses out the other boxes in its row.');
    expect(L1_GRID.columns).toEqual(['apple', 'bread']);
    const [mia, leo] = L1_GRID.rows;
    expect(mia.label).toBe('Mia');
    expect(mia.marks.map((m) => [m.label, m.answer, !!m.given])).toEqual([['apple', 'yes', true], ['bread', 'no', true]]);
    expect(leo.label).toBe('Leo');
    expect(leo.marks.map((m) => [m.label, m.answer, !!m.given])).toEqual([['apple', 'no', false], ['bread', 'yes', false]]);
    expect(L1_GRID.body).toContain('Clue 2: Leo does not have the apple.');
    // No answer buttons: nothing on the board asks who has what.
    expect(JSON.stringify(L1_GRID)).not.toMatch(/Which snack|Who must/);
    // Only tapping Next does not pass: every mark starts empty.
    expect(checkDrill(L1_GRID, {}).done).toBe(false);
    expect(checkDrill(L1_GRID, { 's4.l1-do-leo-apple': 'no' }).done).toBe(false);
    expect(checkDrill(L1_GRID, { 's4.l1-do-leo-apple': 'no', 's4.l1-do-leo-bread': 'yes' }).done).toBe(true);
    // A wrong tap stays wrong and is named in plain words: what the clue says, and what is on the board.
    expect(checkDrill(L1_GRID, { 's4.l1-do-leo-apple': 'yes', 's4.l1-do-leo-bread': 'yes' }).message).toBe('Clue 2 says Leo does not have the apple. So Leo – apple gets a ✗, not a ✓.');
    expect(checkDrill(L1_GRID, { 's4.l1-do-leo-apple': 'no', 's4.l1-do-leo-bread': 'no' }).message).toBe('Leo – apple gets a ✗. Leo has just one snack. So Leo – bread gets a ✓, not a ✗.');
    // The words never say a box the learner still has to tap “has” a mark: with Leo – apple left blank, the reason
    // for Leo – bread is still true on the board the learner sees.
    expect(checkDrill(L1_GRID, { 's4.l1-do-leo-bread': 'no' }).message).toBe('Leo – apple gets a ✗. Leo has just one snack. So Leo – bread gets a ✓, not a ✗.');
  });

  it('every board: only right taps pass, every wrong option names its own box, person or clue, at the reading level', () => {
    for (const l of stop4.lessons) {
      for (const st of l.drill!) {
        const tap = marksToTap(st);
        expect(tap.length, st.id).toBeGreaterThan(0);
        expect(tap.length, `${st.id}: phone-sized`).toBeLessThanOrEqual(12);
        expect(checkDrill(st, {}).done).toBe(false);
        expect(checkDrill(st, right(st)).done).toBe(true);
        for (const m of tap) {
          for (const o of m.options) {
            if (o.id === m.answer) continue;
            const why = m.why[o.id];
            expect(why, `${st.id} ${m.id}:${o.id}`).toBeTruthy();
            // The words name what the mark is about: its box, its line, its person or its thing.
            for (const name of mustName(st, m, o.id)) expect(why, `${st.id} ${m.id}:${o.id} names “${name}”`).toContain(name);
            expect(why).not.toMatch(/\bWrong\b|['"]|\b(?:that (?:row|column|box)|the opposite)\b/i);
            // One wrong tap at a time is named: the first wrong mark in reading order. A tap that shows a mix-up
            // (DrillStep.misconceptions) names the belief first, then the same words.
            const res = checkDrill(st, { ...right(st), [m.id]: o.id });
            if (res.diagnosis) expect(res.message).toBe(`${st.misconceptions!.find((mc) => mc.id === res.diagnosis)!.text} ${why}`);
            else expect(res.message).toBe(why);
          }
        }
        const text = boardText(st).filter(Boolean).join('\n');
        // Curly quotes only, calm words, and no “that row” or “both” without saying what it means.
        expect(text, st.id).not.toMatch(/['"]|undefined|NaN|\{\w+\}|\s\s|\.\.|\bWrong\b|\bboth\b|\b(?:that (?:row|column|box)|the opposite)\b/i);
        expect(fkGrade(text), st.id).toBeLessThanOrEqual(READING.maxGrade);
        expect(longestSentence(text).words, st.id).toBeLessThanOrEqual(READING.maxSentenceWords);
      }
    }
  });

  it('the boards perform every family the quiz asks: clue marks and the last box, can’t tell, spreads, links both ways, proofs, enough clues', () => {
    const [l1, l2, l3, l4, l5] = stop4.lessons;
    const tapLabels = (st: DrillStep) => st.rows.flatMap((r) => r.marks.filter((m) => !m.given).map((m) => `${r.label} | ${m.label} = ${m.answer}`));
    // Lesson 1: an “isn’t” ✗ and a last box on the grid; a “has” clue and an “or” clue row by row.
    expect(tapLabels(l1.drill![1])).toEqual([
      'Only clue: Leo has the cat. | Leo – cat = yes', 'Only clue: Leo has the cat. | Leo – dog = no', 'Only clue: Leo has the cat. | Leo – fish = no',
      'Only clue: Leo does not have the dog. | Leo – cat = cant', 'Only clue: Leo does not have the dog. | Leo – dog = no', 'Only clue: Leo does not have the dog. | Leo – fish = cant',
      'Only clue: Mia has the cat or the fish. | Mia – cat = cant', 'Only clue: Mia has the cat or the fish. | Mia – dog = no', 'Only clue: Mia has the cat or the fish. | Mia – fish = cant',
    ]);
    // Lesson 2, box-vs-kid: the grapes column in the contrast's two grids. Mia’s cross under apples leaves two boxes
    // (can’t tell); under grapes, Ava – grapes is the last box.
    expect(tapLabels(l2.drill![0])).toEqual([
      'First grid: Mia does not eat apples. Leo does not eat grapes. | Empty boxes in the grapes column = 2',
      'First grid: Mia does not eat apples. Leo does not eat grapes. | Mia – grapes = cant',
      'First grid: Mia does not eat apples. Leo does not eat grapes. | Ava – grapes = cant',
      'Second grid: Mia does not eat grapes. Leo does not eat grapes. | Empty boxes in the grapes column = 1',
      'Second grid: Mia does not eat grapes. Leo does not eat grapes. | Mia – grapes = no',
      'Second grid: Mia does not eat grapes. Leo does not eat grapes. | Ava – grapes = yes',
    ]);
    // Then counting: a ✗ added, then the last box in a row tapped ✓; two empty boxes in a column left empty (can’t
    // tell); a ✗ added, then the last box in a column tapped ✓; a ✗ off the line (under the dog) that leaves the cat
    // column at two; and a row question with Leo’s ✗ in another row (three empty).
    expect(tapLabels(l2.drill![1])).toEqual([
      'Add a ✗: Leo does not have the fish. | Leo – fish = no', 'Add a ✗: Leo does not have the fish. | Empty boxes in Leo’s row = 1', 'Add a ✗: Leo does not have the fish. | Leo – dog = yes',
      'Back to the card’s grid. Look at the cat column. | Empty boxes in the cat column = 2', 'Back to the card’s grid. Look at the cat column. | Mia – cat = cant', 'Back to the card’s grid. Look at the cat column. | Ava – cat = cant',
      'Add a ✗: Ava does not have the cat. | Ava – cat = no', 'Add a ✗: Ava does not have the cat. | Empty boxes in the cat column = 1', 'Add a ✗: Ava does not have the cat. | Mia – cat = yes',
      'Back to the card’s grid. Add a ✗: Mia does not have the dog. | Empty boxes in the cat column = 2', 'Back to the card’s grid. Add a ✗: Mia does not have the dog. | Mia – cat = cant',
      'Back to the card’s grid. Look across Mia’s row. | Empty boxes in Mia’s row = 3',
    ]);
    // Lesson 3: a column spread with two boxes left empty, then a whole grid finished (last box, spread, last box).
    expect(tapLabels(l3.drill![0])).toEqual(['The cat column | Leo – cat = no', 'The cat column | Ava – cat = no', 'Outside Mia’s row and the cat column | Leo – dog = cant', 'Outside Mia’s row and the cat column | Ava – fish = cant']);
    expect(l3.drill![1].rows.flatMap((r) => r.marks.filter((m) => !m.given).map((m) => `${r.label} – ${m.label} ${m.answer}`))).toEqual(['Leo – fish yes', 'Ava – dog yes', 'Ava – fish no']);
    // Lesson 4: a link carried to the snacks, “not” links (one left and can’t tell), and a link read from its snack end.
    expect(l4.drill![0].columns).toEqual(['apples', 'popcorn', 'grapes']);
    // “Not” links: two popcorn boxes stay empty (shown), then Ava – popcorn is the last box, then two grapes boxes stay empty.
    expect(l4.drill![1].rows.map((r) => r.marks.map((m) => `${m.label} ${m.answer}`).join(', '))).toEqual([
      `Leo – popcorn no, Mia – popcorn ${CANT}, Ava – popcorn ${CANT}`,
      'Mia – popcorn no, Ava – popcorn yes',
      `Ava – grapes no, Mia – grapes ${CANT}, Leo – grapes ${CANT}`,
    ]);
    expect(l4.drill![2].columns).toEqual(['cat', 'dog', 'fish']);
    expect(l4.drill![2].scene).toBe(CARD_GRIDS.snacksKnown);
    // Back and forth: neither part known. Shown: an “or” clue’s cross on Mia – fish, carried across clue 2 to Mia –
    // popcorn. The learner: clue 3’s cross, the last box in the popcorn column, and the check mark carried back.
    expect(l4.drill![3].scene).toBe(CARD_CLUES.backForth);
    expect(l4.drill![3].rows.filter((r) => r.marks.every((m) => m.given)).flatMap((r) => r.marks.map((m) => `${m.label} = ${m.answer}`))).toEqual(['Mia – fish = no', 'Mia – popcorn = no']);
    expect(tapLabels(l4.drill![3])).toEqual([
      'Add clue 3: Leo does not eat popcorn. | Leo – popcorn = no', 'Add clue 3: Leo does not eat popcorn. | Ava – popcorn = yes', 'Carry back across clue 2. | Ava – fish = yes',
    ]);
    // Lesson 5: one clue alone proves Leo – dog ✗ (another kid’s ✓, Leo’s own ✓, an “or” that leaves it out) or not
    // (a clue about Leo and another pet, an “or” about Leo that names the dog, an “or” about Ava, another kid’s ✓).
    expect(l5.drill![0].rows.map((r) => `${r.label} ${r.marks[0].answer}`)).toEqual([
      'Only clue: Mia has the dog. no', 'Only clue: Leo has the fish. no', 'Only clue: Leo does not have the cat. yes',
      'Only clue: Leo has the cat or the fish. no', 'Only clue: Leo has the dog or the fish. yes', 'Only clue: Ava has the dog or the fish. yes', 'Only clue: Mia has the cat. yes',
    ]);
    // Clues 1 and 2 of a list of three: one kid could have the fish (shown), two could have the cat, though clue 3 would leave one.
    expect(l5.drill![1].scene).toBe(CARD_CLUES.list);
    expect(l5.drill![1].rows.map((r) => r.marks[r.marks.length - 1].answer)).toEqual(['1', '2']);
    expect(l5.drill![1].rows[1].marks.map((m) => m.answer)).toEqual(['yes', 'yes', 'no', '2']);
    // A tap that uses clue 3 is named as such: Mia – cat would be ruled out, and the count would be 1.
    expect(l5.drill![1].rows[1].marks[0].why.no).toMatch(/Clue 3 says Mia has the dog, but use only clues 1 and 2\.$/);
    expect(l5.drill![1].rows[1].marks[3].why['1']).toMatch(/Clue 3 would make it 1, but use only clues 1 and 2\.$/);
    expect(whoCan(fit({ people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: KID_PETS }] }, L5_LIST), 'pet', 'cat', ['mia', 'leo', 'ava'])).toEqual(['leo']);
  });

  it('a reason says a box “has” a ✗ or ✓ only when the learner can see that mark (a box still to tap “gets” one)', () => {
    let n = 0;
    for (const l of stop4.lessons) {
      for (const st of l.drill!) {
        const pic = st.scene?.kind === 'grid' ? st.scene : null;
        for (const r of st.rows) {
          // What this row shows: a grid board's given boxes; on a card row, the picture's marks and the ✗ its label adds.
          const sees = (cell: string) => {
            const [p, v] = cell.split(' – ');
            if (st.columns) return st.rows.some((rr) => rr.label === p && rr.marks.some((m) => m.given && m.label === v));
            const added = /Add a ✗: (\w+) does not have the (\w+)\.$/.exec(r.label);
            // A grid of the contrast, drawn in words in its row's label: “First grid: Mia does not eat apples. …”
            const said = /^(?:First|Second) grid: /.test(r.label) && r.label.includes(`${p} does not eat ${v}.`);
            return pic?.marks[kid(p)]?.[v] !== undefined || (!!added && added[1] === p && added[2] === v) || said;
          };
          for (const m of r.marks) {
            for (const why of Object.values(m.why)) {
              for (const hit of why.matchAll(/(?:^|\. )([A-Z]\w* – \w+(?:(?:, | and )[A-Z]\w* – \w+)*) (?:has|have) a [✗✓]\./g)) {
                for (const cell of hit[1].split(/, | and /)) {
                  n++;
                  expect(sees(cell), `${st.id} ${m.id}: “${cell}” is not marked where the learner can see it: ${why}`).toBe(true);
                }
              }
            }
          }
        }
      }
    }
    expect(n).toBeGreaterThan(10);
  });

  it('no board asks the quiz’s own question: the learner marks boxes, counts and taps the last box (no “which” or “who” buttons)', () => {
    for (const l of stop4.lessons) {
      for (const st of l.drill!) {
        for (const m of st.rows.flatMap((r) => r.marks)) {
          expect(m.label, `${st.id} ${m.id}`).not.toMatch(/^(?:Which|Who|Can you tell)\b/);
          // Options are marks (✓ / ✗ / Can’t tell yet, Yes / No) or counts, never a list of people or things to pick.
          expect(m.options.every((o) => ['yes', 'no', CANT].includes(o.id) || /^\d$/.test(o.id)), `${st.id} ${m.id}`).toBe(true);
        }
      }
    }
  });

  it('each row’s note agrees with its marks: “can’t tell yet” only when the line it asks about is not decided, else it names the answer', () => {
    let n = 0;
    const boxOf = (label: string) => /^(\w+) – (\w+)$/.exec(label);
    for (const l of stop4.lessons) {
      for (const st of l.drill!) {
        if (st.columns) continue;
        for (const r of st.rows) {
          if (!r.note) continue;
          // What the row decides about one line: from its count of who could, or from its boxes in one column (or in
          // one row, when the row counts that row's empty boxes).
          let decision: { cant: boolean; name?: string } | null = null;
          const many = r.marks.find((m) => /^How many/.test(m.label));
          const boxes = r.marks.filter((m) => boxOf(m.label)).map((m) => ({ m, p: boxOf(m.label)![1], v: boxOf(m.label)![2] }));
          const counted = r.marks.some((m) => /^Empty boxes in/.test(m.label));
          if (many) {
            const n2 = Number(many.answer);
            decision = n2 === 1 ? { cant: false, name: /^Could (\w+)/.exec(r.marks.find((m) => /^Could/.test(m.label) && m.answer === 'yes')!.label)![1] } : { cant: true };
          } else if (boxes.length >= 2 && (new Set(boxes.map((b) => b.v)).size === 1 || (counted && new Set(boxes.map((b) => b.p)).size === 1))) {
            const column = new Set(boxes.map((b) => b.v)).size === 1;
            const yes = boxes.find((b) => b.m.answer === 'yes');
            if (yes) decision = { cant: false, name: column ? yes.p : yes.v };
            else if (boxes.filter((b) => b.m.answer === CANT).length >= 2) decision = { cant: true };
          }
          if (!decision) continue;
          n++;
          if (decision.cant) expect(r.note, `${st.id} ${r.id}`).toMatch(/can’t tell yet/);
          else {
            expect(r.note, `${st.id} ${r.id}`).not.toMatch(/can’t tell yet/);
            // A person's name (“Mia”) or a thing (“the dog”).
            expect(r.note, `${st.id} ${r.id}`).toContain(decision.name!);
          }
        }
        // A box the row marks ✗ by a single clue is named in its note.
        for (const r of st.rows) for (const m of r.marks) if (/^Only clue/.test(r.label) && m.answer === 'no' && /^\w+ – \w+$/.test(m.label) && r.note && !/rest of/.test(r.note)) expect(r.note).toContain(m.label);
      }
    }
    // Lesson 2 (two grids of the contrast, four count rows), lesson 4’s “not” links (three) and back and forth (one), and
    // lesson 5’s clues 1 and 2 (two).
    expect(n).toBe(12);
  });

  it('new and changed idea cards say what their pictures and clues really prove', () => {
    const pair: Spec = { people: ['mia', 'leo'], cats: [{ id: 'lunch', values: PAIR_SNACKS }] };
    const pets: Spec = { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: KID_PETS }] };
    const two: Spec = { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: KID_PETS }, { id: 'snack', values: KID_SNACKS }] };
    // One each: the clue “Mia has the apple” gives exactly the marks the picture draws.
    const apple = fit(pair, [readClue('Mia has the apple.')]);
    expect(status(apple, 'mia', 'lunch', 'apple')).toBe('yes');
    expect(status(apple, 'mia', 'lunch', 'bread')).toBe('no');
    expect(CARD_GRIDS.oneEach.marks).toEqual({ mia: { apple: 'yes', bread: 'no' } });
    // “Or” clues: the picture's ✗ on Ava – cat is what the clue proves, and nothing else.
    const or = fit(pets, [readClue('Ava has the dog or the fish.')]);
    expect(CARD_GRIDS.orClue.marks).toEqual({ ava: { cat: 'no' } });
    expect(['dog', 'fish'].map((v) => status(or, 'ava', 'pet', v))).toEqual(['open', 'open']);
    // Links work both ways: with these snacks and the dog's link, Ava has the dog.
    const snacks = fit(two, pictureFacts(CARD_GRIDS.snacksKnown));
    expect(snacks.every((s) => s.ava.snack === 'popcorn')).toBe(true);
    expect(fit(two, [...pictureFacts(CARD_GRIDS.snacksKnown), readClue('The kid with the dog eats popcorn.')]).every((s) => s.ava.pet === 'dog')).toBe(true);
    // Use only the clues you are told: with clues 1 and 2, only Ava can have the fish; clue 3 is not needed.
    const list = (CARD_CLUES.list.kind === 'clues' ? CARD_CLUES.list.clues : []).map(readClue);
    expect(list).toEqual(L5_LIST);
    expect(whoCan(fit(pets, list.slice(0, 2)), 'pet', 'fish', pets.people)).toEqual(['ava']);
    expect(fit(pets, list).length).toBe(1);
    // The l2 captions say what each picture shows.
    expect(whoCan(fitMarks(pets, 'pet', CARD_GRIDS.rowLeft.marks), 'pet', 'fish', pets.people)).toEqual(['leo']);
    expect(CARD_GRIDS.notSoFast.caption).toMatch(/can’t tell yet/);
  });

  it('the quiz only asks the families its lesson’s See and Do taught: practice, check, Arcade, new examples and the Notebook', () => {
    const ok = (it: Item, where: string) => {
      expect(TAUGHT[it.lesson], `${where} ${it.id}`).toContain(it.skill);
      // Proofs and “enough clues” are taught on one-part grids only.
      if (it.lesson === 's4.l5') expect(twoPart(it), `${where} ${it.id}: ${it.prompt}`).toBe(false);
    };
    for (let seed = 1; seed <= 300; seed++) {
      if (seed <= 60) for (const l of stop4.lessons) for (const it of l.practice(createRng(seed))) { expect(it.lesson).toBe(l.id); ok(it, `${l.id} seed ${seed}`); }
      for (const it of stop4.check!(createRng(seed))) ok(it, `check ${seed}`);
      ok(stop4.practice!(createRng(seed)), `arcade ${seed}`);
    }
    for (let seed = 1; seed <= 20; seed++) {
      for (const it of [...stop4.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop4.check!(createRng(seed))]) {
        for (const x of freshCheckSet(stop4, it, seed * 13, [], 1)) ok(x, `fresh for ${it.id}`);
      }
    }
    for (const [lesson, skills] of Object.entries(TAUGHT)) {
      for (const skill of skills) {
        const it = freshItem(stop4, { skill, stop: 4, lesson, missed: '2026-10-01', fixes: 0, due: '2026-10-01' }, 7);
        expect(it?.skill, skill).toBe(skill);
        ok(it!, `notebook ${skill}`);
      }
    }
    // Lesson 1's first quiz is a “has” clue (a ✓), never “isn’t” or “or”: the handoff keeps those for later tries.
    for (let seed = 1; seed <= 60; seed++) expect(stop4.lessons[0].practice(createRng(seed))[0].prompt).toMatch(/gets a ✓ from this clue\?$/);
    // The default pass rule (3 right on the first try, no hint) after the boards, except where a lesson's trap must be
    // passed too: lesson 2 needs a right “Can’t tell yet” grid, lesson 4 a right two-part grid (LessonPass.include).
    expect(stop4.lessons.map((l) => l.pass ?? null)).toEqual([
      null,
      { firstTry: 3, include: [{ tag: 'cant-tell', label: 'a “Can’t tell yet” grid' }] },
      null,
      { firstTry: 3, include: [{ tag: 'grid-two', label: 'a two-part grid' }] },
      null,
    ]);
  });

  it('every hint shows one marked case with computed truths, and never the answer’s own case', () => {
    let n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const skin = skinAt(seed);
      const rng = () => createRng(seed);
      const marked = (it: Item) => {
        expect(it.hint, it.skill).toMatch(/^Here is /);
        expect(it.hintCase!.truths!.length).toBeGreaterThan(0);
        expect(it.hintCase!.note!.length).toBeGreaterThan(0);
        n++;
        return it.hintCase!;
      };
      const truthsOk = (cast: Cast, c: TeachCase, b: Basis, ctx: Partial<Ctx> = {}) => {
        const ws = worldsOf(cast.spec, b);
        for (const t of c.truths!) expect(recompute({ cast, clues: [], ...ctx }, t.who, ws), `${c.label} | ${t.who}`).toBe(t.value);
      };
      // Lesson 1: a box that is not the clue's box.
      const mk = markPuzzle(rng(), { id: 'x', skin, t: (['is', 'isnt', 'either'] as const)[seed % 3] });
      const mc = marked(mk.item);
      truthsOk(mk.cast, mc, mk.bases.hint!);
      expect(mc.label).not.toContain(mk.item.choices.find((ch) => ch.id === mk.item.answer)!.label);
      // Lesson 2: one box of the asked line on this very grid, a ✗ (could: false), so its truth holds on the grid the
      // learner sees and it is never the answer (a twin grid would show “could: true” for a box this grid crosses out).
      const oo = onlyOnePuzzle(rng(), { id: 'x', skin, mode: (['col', 'row', 'cant'] as const)[seed % 3] });
      const oc = marked(oo.item);
      expect(oo.bases.hint).toEqual({ marks: { c: oo.cast.cats[0].cat.id, marks: oo.marks } });
      truthsOk(oo.cast, oc, oo.bases.hint!);
      expect(oc.label.startsWith('In this grid, ')).toBe(true);
      expect(oc.truths!.map((t) => t.value)).toEqual([false]);
      const hinted = /^In this grid, (.+?)’s box (?:in the .+ column|for (.+)) has a ✗\.$/.exec(oc.label)!;
      expect(hinted, oc.label).not.toBeNull();
      const ansLabel = oo.item.choices.find((ch) => ch.id === oo.item.answer)!.label.toLowerCase();
      const hintedChoice = (oo.ask === 'col' ? hinted[1] : hinted[2].replace(/^(?:the|an?) /, '')).toLowerCase();
      expect(oo.item.choices.some((ch) => ch.label.toLowerCase() === hintedChoice), `${oc.label} names a choice`).toBe(true);
      expect(hintedChoice).not.toBe(ansLabel);
      // Lesson 3: a box outside the ✓'s row and column, which the answer never holds.
      const sp = spreadPuzzle(rng(), { id: 'x', skin, column: seed % 2 === 0 });
      const sc = marked(sp.item);
      truthsOk(sp.cast, sc, sp.bases.hint!);
      const ans = sp.item.kind === 'multi' ? sp.item.choices.filter((ch) => sp.item.answer.includes(ch.id)).map((ch) => ch.label) : [];
      expect(ans.some((a) => sc.label.startsWith(`${a},`))).toBe(false);
      // Whole grids: the first mark one clue gives by itself.
      const gp = gridPuzzle(rng(), { id: 'x', skin, ncat: seed % 2 ? 1 : 2 });
      const gc = marked(gp.item);
      truthsOk(gp.cast, gc, gp.bases.hint!);
      expect(gc.label).toMatch(/^Clue \d+: /);
      // Lesson 4: a person the clues cross out, never the answer.
      const lk = linkPuzzle(rng(), { id: 'x', skin, mode: (['link', 'notLink2', 'notLink'] as const)[seed % 3] });
      const lc = marked(lk.item);
      truthsOk(lk.cast, lc, lk.bases.hint!);
      expect(lc.truths![0].value).toBe(false);
      if (lk.item.answer !== CANT) expect(lc.label.startsWith(lk.cast.nm(lk.item.answer))).toBe(false);
      // Lesson 5: a clue that does not prove the ✗, tested alone; one person checked with only clues 1 and 2.
      const pf = proofPuzzle(rng(), { id: 'x', skin, ncat: 1 });
      const pc = marked(pf.item);
      truthsOk(pf.cast, pc, pf.bases.hint!);
      expect(pc.label.startsWith(`${pf.item.choices.find((ch) => ch.id === pf.item.answer)!.label}:`)).toBe(false);
      const en = enoughPuzzle(rng(), { id: 'x', skin, tell: seed % 2 === 0 });
      const ec = marked(en.item);
      truthsOk(en.cast, ec, en.bases.hint!);
    }
    // Every practice item with a hint has its marked case.
    for (let seed = 1; seed <= 40; seed++) for (const l of stop4.lessons) for (const it of l.practice(createRng(seed))) if (it.hint) expect(it.hintCase, it.id).toBeDefined();
    expect(n).toBe(60 * 7);
  });
});

// ---------- distinctions: box-vs-kid (lesson 2) and back and forth (lesson 4) ----------
//
// The audit (docs/audit/hidden-distinctions.md): s4-l2-cross-in-line-vs-cross-in-row and s4-l4-two-part-back-and-forth.
// Every truth on the new cards and boards is worked out again here by this file's own brute force.

const SNACKS: Spec = { people: ['mia', 'leo', 'ava'], cats: [{ id: 'snack', values: KID_SNACKS }] };
const TWO: Spec = { people: ['mia', 'leo', 'ava'], cats: [{ id: 'pet', values: KID_PETS }, { id: 'snack', values: KID_SNACKS }] };
const sentencesOf = (t: string) => t.split(/(?<=[.?!])\s+/).filter(Boolean);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The shape of a mix-up text: the belief named, the two ideas apart, at most four short sentences, kid-safe words. */
function mixupText(text: string) {
  expect(text).toMatch(/^You may be treating .+ as .+\./);
  expect(text).toContain('They are two different things: ');
  expect(sentencesOf(text).length, text).toBeLessThanOrEqual(5);
  expect(text).not.toMatch(/['"]|[=≠✓→&]|\bWrong\b/);
}

/** Every "I’m confused" question: one right option, a “Not sure” option, and teaching words. */
function confusedShape(qs: readonly { q: string; options: { label: string; right?: boolean }[]; teach: string }[]) {
  expect(qs.length).toBeGreaterThanOrEqual(1);
  expect(qs.length).toBeLessThanOrEqual(3);
  for (const q of qs) {
    expect(q.options.filter((o) => o.right).length, q.q).toBe(1);
    expect(q.options.some((o) => o.label === 'Not sure' && !o.right), q.q).toBe(true);
    expect(q.teach.length).toBeGreaterThan(20);
    expect([q.q, q.teach, ...q.options.map((o) => o.label)].join(' ')).not.toMatch(/['"]|[=≠✓→&]|\bWrong\b/);
  }
}

describe('distinctions: a cross in this line vs a cross elsewhere (lesson 2), back and forth across links (lesson 4)', () => {
  const l2 = lessonOf('s4.l2');
  const l4 = lessonOf('s4.l4');

  it('lesson 2 declares box-vs-kid and teaches it with a contrast card and its board, before the count board', () => {
    expect(l2.distinctions).toEqual([BOX_VS_KID]);
    expect(BOX_VS_KID.id).toBe('box-vs-kid');
    const k = l2.ideas.indexOf(L2_CROSS_CARD);
    expect(k).toBe(4);
    expect(L2_CROSS_CARD.distinction).toBe('box-vs-kid');
    expect(L2_CROSS_CARD.scene).toBe(L2_CROSS.scene);
    // The grid card before it shows the first grid of the contrast, captioned in words.
    expect(l2.ideas[3].title).toBe('A cross is about one box');
    expect(l2.ideas[3].scene).toBe(CARD_GRIDS.crossFor);
    expect(CARD_GRIDS.crossFor.caption).toBe('Mia’s cross is for apples, not grapes.');
    // The board right after the card, then the count board.
    expect(l2.drill).toEqual([L2_CROSS_DO, L2_COUNT]);
    expect(L2_CROSS_DO.afterCard).toBe(k);
    expect(L2_CROSS_DO.distinction).toBe('box-vs-kid');
    expect(L2_CROSS_DO.scene).toBe(L2_CROSS_CARD.scene);
    expect(l2.ideas.length).toBeLessThanOrEqual(7);
  });

  it('the contrast: each panel’s truth, reason and last line match the grid its board row draws, by brute force', () => {
    const scene = L2_CROSS.scene;
    expect(scene.words).toEqual({ worldTag: 'Line', saysWord: 'has:', truth: 'Counts for grapes', untruth: 'Not for grapes' });
    expect(scene.ask!.q).toBe('Did Mia get a cross both times?');
    scene.pairs.forEach((panel, k) => {
      // The grid of this panel, read from the board row that draws it in words.
      const facts = rowClues(L2_CROSS_DO)[k];
      expect(L2_CROSS_DO.rows[k].label.startsWith(k === 0 ? 'First grid: ' : 'Second grid: ')).toBe(true);
      const mias = facts.filter((f) => f.t === 'isnt' && f.p === 'mia');
      expect(mias).toHaveLength(1);
      const under = mias[0].t === 'isnt' ? mias[0].v : '';
      // The line, and Leo’s cross in it that both grids share (so the last line follows from what the panel shows).
      expect(panel.world).toBe('The grapes column. Leo has a cross in it.');
      expect(facts.some((f) => f.t === 'isnt' && f.p === 'leo' && f.v === 'grapes')).toBe(true);
      expect(panel.who).toBe('Mia’s row');
      expect(panel.says).toBe(`a cross under ${under}`);
      const sols = fit(SNACKS, facts);
      // True means: this cross rules Mia out for grapes. Only a cross in the grapes column does.
      expect(panel.truth).toBe(status(sols, 'mia', 'snack', 'grapes') === 'no');
      expect(panel.truth).toBe(under === 'grapes');
      expect(panel.because).toContain(`The cross is in the ${under} column.`);
      const left = whoCan(sols, 'snack', 'grapes', SNACKS.people);
      expect(panel.then).toBe(left.length === 1 ? `Only ${cap(left[0])} is left, so ${cap(left[0])} must eat grapes.` : `${left.map(cap).join(' and ')} could each eat grapes. You can’t tell yet.`);
    });
    expect(scene.pairs.map((p) => p.truth)).toEqual([false, true]);
    // The grid card: Leo out for grapes, Mia’s cross under apples, so Mia and Ava could each eat grapes.
    const card = pictureFacts(CARD_GRIDS.crossFor).map((f) => ({ ...f, c: 'snack' }) as GridClue);
    expect(card).toEqual(rowClues(L2_CROSS_DO)[0].map((f) => f));
    expect(whoCan(fit(SNACKS, card), 'snack', 'grapes', SNACKS.people)).toEqual(['mia', 'ava']);
    expect(l2.ideas[3].body.join(' ')).toContain('So Mia and Ava could each eat grapes. You can’t tell yet.');
  });

  it('the box-vs-kid boards: a full scaffold in the line’s words, the line over the shown row, the line under each count', () => {
    for (const st of [L2_CROSS_DO, L2_COUNT]) {
      expect(st.scaffold).toBe('full');
      expect(st.words).toBe(LINE_WORDS);
      expect(st.confused).toBe(BOX_VS_KID_CONFUSED);
      const rows = rowClues(st);
      st.rows.forEach((r, i) => {
        for (const m of r.marks) {
          const at = /^Empty boxes in (?:(\w+)’s row|the (\w+) column)$/.exec(m.label);
          if (!at) continue;
          // The line and the crosses in it, recounted from the row's words: no count is given away.
          const p = at[1] ? kid(at[1]) : null;
          const v = at[2] ?? null;
          const crossed = rows[i].filter((f) => f.t === 'isnt' && (p ? f.p === p : f.v === v)).map((f) => (f.t === 'isnt' ? (p ? `the ${f.v}`.replace(/^the (apples|popcorn|grapes)$/, '$1') : cap(f.p)) : ''));
          const said = crossed.length ? joinNames(crossed) : 'nothing yet';
          if (m.given) {
            expect(m.compare).toBeUndefined();
            expect(r.needs).toBe(`Line: ${p ? `${cap(p)}’s row` : `the ${v} column`}. Crossed in it: ${said}. Empty: ${joinNames((p ? KID_PETS : ['mia', 'leo', 'ava']).filter((x) => !rows[i].some((f) => f.t === 'isnt' && (p ? f.p === p && f.v === x : f.v === v && f.p === x))).map((x) => (p ? `the ${x}` : cap(x))))}.`);
          } else expect(m.compare).toEqual({ says: p ? `${cap(p)}’s row` : `The ${v} column`, world: cap(said) });
        }
      });
    }
    // The shown row of the count board: “Line: Leo’s row. Crossed in it: the cat. Empty: the dog and the fish.”
    expect(L2_COUNT.rows[0].needs).toBe('Line: Leo’s row. Crossed in it: the cat. Empty: the dog and the fish.');
    // A cross off the line on the count board: Mia’s ✗ under the dog leaves the cat column at two; Leo’s ✗ under the cat
    // is in Leo’s row, so Mia’s row has three empty boxes.
    expect(L2_COUNT.rows.slice(-2).map((r) => r.marks.map((m) => `${m.label} = ${m.answer}`).join(', '))).toEqual([
      `Empty boxes in the cat column = 2, Mia – cat = ${CANT}`,
      'Empty boxes in Mia’s row = 3',
    ]);
  });

  it('the box-vs-kid mix-up is named on the wrong taps the audit describes, and never on right marks', () => {
    const fires = (st: DrillStep, id: string, opt: string) => checkDrill(st, { ...right(st), [id]: opt }).diagnosis;
    // Contrast board, first grid: Mia out for grapes, Ava the last box, or a count of 1 all count Mia’s apples cross.
    expect(fires(L2_CROSS_DO, 'first-mia-grapes', 'no')).toBe('cross-elsewhere');
    expect(fires(L2_CROSS_DO, 'first-ava-grapes', 'yes')).toBe('kid-crossed-out');
    expect(fires(L2_CROSS_DO, 'first-count', '1')).toBe('count-elsewhere');
    // Count board: the cat column after Mia’s ✗ under the dog, and Mia’s row with Leo’s ✗ under the cat.
    expect(fires(L2_COUNT, 'cat-mia-dog-count', '1')).toBe('cross-elsewhere');
    expect(fires(L2_COUNT, 'cat-mia-dog-mia-cat', 'no')).toBe('kid-crossed-out');
    expect(fires(L2_COUNT, 'mia-row-count', '2')).toBe('cross-other-row');
    // Other slips are named by their own mark only, and right marks never diagnose.
    expect(fires(L2_CROSS_DO, 'second-ava-grapes', CANT)).toBeUndefined();
    expect(fires(L2_COUNT, 'leo-fish-leo-dog', 'no')).toBeUndefined();
    expect(fires(L2_COUNT, 'mia-row-count', '1')).toBeUndefined();
    for (const st of [L2_CROSS_DO, L2_COUNT]) {
      const ok = checkDrill(st, right(st));
      expect(ok.done && ok.diagnosis === undefined).toBe(true);
      for (const mc of st.misconceptions!) mixupText(mc.text);
    }
    expect(L2_CROSS_DO.misconceptions![0].text).toBe('You may be treating Mia’s cross under apples as a cross for grapes. They are two different things: a cross is about its own box only. Mia’s cross says Mia does not eat apples. For grapes, look only down the grapes column.');
    expect(L2_COUNT.misconceptions!.find((mc) => mc.id === 'cross-other-row')!.text).toBe('You may be treating Leo’s cross under the cat as a cross in Mia’s row. They are two different things: a cross is about its own box only. Leo’s cross says Leo does not have the cat. For Mia, look only across Mia’s row.');
  });

  it('the first column quiz is marked on its own board: the answer’s cross in another column, then the count and the last box', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const r = onlyOnePuzzle(createRng(seed), { id: 'l2-1', skin: skinAt(seed), mode: 'col', n: 3, work: true });
      const { item, cast, marks, val } = r;
      const c = cast.cats[0].cat.id;
      const ppl = cast.spec.people;
      const sols = fitMarks(cast.spec, c, marks);
      const H = item.kind === 'choose' ? item.answer : '';
      expect(whoCan(sols, c, val, ppl)).toEqual([H]);
      // The grid always has a ✗ in another column of the answer's own row: the cross the board asks about.
      const off = Object.entries(marks[H]).find(([x, mk]) => x !== val && mk === 'no');
      expect(off, `seed ${seed}`).toBeDefined();
      const wf = item.workFirst!;
      expect(wf.id).toBe('l2-1-work');
      expect(wf.scene).toBe(item.scene);
      expect(wf.scaffold).toBe('full');
      expect(wf.words).toBe(LINE_WORDS);
      expect(wf.words!.closing).toMatch(/^Those two ideas are apart now\. Back to the grid/);
      expect(item.confused).toBe(BOX_VS_KID_CONFUSED);
      expect(wf.confused).toBe(BOX_VS_KID_CONFUSED);
      // One step of the strip per mark, in board order: could the answer still have it, the count, the last box.
      const tap = marksToTap(wf);
      expect(wf.steps!.length).toBe(tap.length);
      const w = wordsFor(cast);
      expect(tap.map((m) => `${m.label} = ${m.answer}`)).toEqual([
        `Could ${cast.nm(H)} ${w.base(c, val)}? = yes`,
        `Empty boxes in the ${w.val(c, val).label} column = ${ppl.filter((q) => marks[q][val] === undefined).length}`,
        `${w.cell(H, val, c)} = yes`,
      ]);
      expect(status(sols, H, c, val)).toBe('yes');
      // The board names one of the answer's crosses in another column.
      const named = cast.cats[0].vals.find((y) => wf.rows[0].label === `${cast.nm(H)}’s row has a cross under ${w.obj(c, y.id)}.`)!;
      expect(named, wf.rows[0].label).toBeDefined();
      expect(named.id !== val && marks[H][named.id] === 'no').toBe(true);
      // The mix-up behind “No”: the answer's cross in another column taken as a cross for this thing.
      const res = checkDrill(wf, { ...right(wf), [tap[0].id]: 'no' });
      expect(res.diagnosis).toBe('cross-elsewhere');
      expect(res.message.startsWith(`You may be treating ${cast.nm(H)}’s cross under ${w.obj(c, named.id)} as a cross for ${w.obj(c, val)}.`)).toBe(true);
      expect(checkDrill(wf, { ...right(wf), [tap[1].id]: '0' }).diagnosis).toBe('kid-crossed-out');
      expect(checkDrill(wf, right(wf)).done).toBe(true);
      const text = drillWords(wf).join('\n');
      expect(fkGrade(text), `seed ${seed}`).toBeLessThanOrEqual(READING.maxGrade);
      expect(longestSentence(text).words).toBeLessThanOrEqual(READING.maxSentenceWords);
      expect(text).not.toMatch(/['"]|\bWrong\b/);
    }
    // Only Try 1 has the board; later tries are light (no board).
    for (let seed = 1; seed <= 20; seed++) {
      const items = l2.practice(createRng(seed));
      expect(items.map((it) => !!it.workFirst)).toEqual([true, false, false, false]);
    }
  });

  it('the two-part grid’s first quiz is marked on its own board, one box per step of the loop, and its carry starts from a box worked out on it', () => {
    let n = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const g = gridPuzzle(createRng(seed), { id: 'l4-4', skin: skinAt(seed), ncat: 2, work: true });
      const { item, cast, clues } = g;
      const wf = item.workFirst!;
      expect(wf.scene).toBe(item.scene);
      expect(wf.scaffold).toBe('full');
      expect(wf.words).toBe(LINK_WORDS);
      expect(wf.steps).toEqual(METHOD_STEPS);
      expect(METHOD_STEPS).toEqual(['Clue marks', 'Spread', 'Only one left', 'Carry across links', 'Again']);
      expect(item.confused).toBe(BACK_FORTH_CONFUSED);
      // One box per row, one row per step, so the lit step is always the box being marked.
      expect(wf.rows.map((r) => r.marks.length)).toEqual([1, 1, 1, 1, 1]);
      expect(marksToTap(wf)).toHaveLength(5);
      // Every box is decided by all the clues, and its mark is what this file's brute force gives.
      const sols = fit(cast.spec, clues);
      expect(sols).toHaveLength(1);
      const w = wordsFor(cast);
      const cellOf = (label: string) => {
        const [pn, vl] = label.split(' – ');
        const p = cast.people.find((x) => x.label === pn)!.id;
        const cat = cast.cats.find((x) => x.vals.some((y) => y.label === vl))!;
        return { p, c: cat.cat.id, v: cat.vals.find((y) => y.label === vl)!.id };
      };
      const boxes = wf.rows.map((r) => cellOf(r.marks[0].label));
      wf.rows.forEach((r, i) => expect(r.marks[0].answer, `${seed} ${r.label}`).toBe(status(sols, boxes[i].p, boxes[i].c, boxes[i].v)));
      expect(new Set(boxes.map((b) => `${b.p}|${b.c}|${b.v}`)).size).toBe(5);
      // Step 1 names a clue that gives its box by itself.
      const k1 = Number(/^Clue marks\. Clue (\d+): /.exec(wf.rows[0].label)![1]) - 1;
      expect(status(fit(cast.spec, [clues[k1]]), boxes[0].p, boxes[0].c, boxes[0].v)).not.toBe('open');
      // Step 2 spreads a clue's own check mark: the box is in its row or its column.
      const sp = /^Spread\. Clue (\d+) gives (.+) a check mark\.$/.exec(wf.rows[1].label)!;
      const from = cellOf(sp[2]);
      expect(clues[Number(sp[1]) - 1]).toEqual({ t: 'is', ...from });
      expect(boxes[1].c).toBe(from.c);
      expect(boxes[1].p === from.p || boxes[1].v === from.v).toBe(true);
      // Step 4 carries across a link from a box marked in step 2 or 3, the same kid at the link's other end.
      const k4 = Number(/^Carry across links\. Clue (\d+): /.exec(wf.rows[3].label)![1]) - 1;
      const link = clues[k4];
      expect(link.t === 'link' || link.t === 'notLink').toBe(true);
      if (link.t !== 'link' && link.t !== 'notLink') continue;
      const b4 = boxes[3];
      const end = link.c1 === b4.c && link.v1 === b4.v ? { c: link.c2, v: link.v2 } : { c: link.c1, v: link.v1 };
      expect([boxes[1], boxes[2]].some((b) => b.p === b4.p && b.c === end.c && b.v === end.v), `${seed}: the carry starts on the board`).toBe(true);
      const fromMark = status(sols, b4.p, end.c, end.v);
      expect(wf.rows[3].marks[0].answer).toBe(link.t === 'link' ? fromMark : 'no');
      if (link.t === 'notLink') expect(fromMark).toBe('yes');
      // Under the carry: the clue and the box at its other end, never that box's mark (it is a box the learner marks in
      // step 2 or 3 of this board).
      expect(wf.rows[3].marks[0].compare).toEqual({ says: clueText(cast, link), world: `${w.cell(b4.p, end.v, end.c)}, at the other end of the clue.` });
      // Step 3's line was emptied by clue marks and spreads of a clue’s own ✓ (each other box is crossed by one clue
      // alone), so it never needs a carry the board has not reached.
      const b3 = boxes[2];
      const lineAt = /^Only one left\. Look at (?:(\S+)’s row of .+|the (.+) column)\.$/.exec(wf.rows[2].label)!;
      expect(lineAt, wf.rows[2].label).toBeTruthy();
      const others = lineAt[1] !== undefined
        ? cast.spec.cats.find((x) => x.id === b3.c)!.values.filter((v) => v !== b3.v).map((v) => ({ p: b3.p, v }))
        : cast.spec.people.filter((q) => q !== b3.p).map((q) => ({ p: q, v: b3.v }));
      for (const f of others) expect(clues.some((cl) => status(fit(cast.spec, [cl]), f.p, b3.c, f.v) === 'no'), `${seed}: ${f.p} – ${f.v}`).toBe(true);
      // Step 5 uses the carried mark: in the same row or the same column as it.
      expect(boxes[4].p === b4.p || boxes[4].v === b4.v).toBe(true);
      // Leaving the carry or the next mark empty names the belief: a link used up, or a carry as the end.
      const tap = marksToTap(wf);
      expect(checkDrill(wf, { ...right(wf), [tap[3].id]: CANT }).diagnosis).toBe('link-used-up');
      expect(checkDrill(wf, { ...right(wf), [tap[4].id]: CANT }).diagnosis).toBe('carry-is-the-end');
      expect(checkDrill(wf, { ...right(wf), [tap[0].id]: CANT }).diagnosis).toBeUndefined();
      for (const mc of wf.misconceptions!) mixupText(mc.text);
      const text = drillWords(wf).join('\n');
      expect(fkGrade(text), `seed ${seed}`).toBeLessThanOrEqual(READING.maxGrade);
      expect(longestSentence(text).words).toBeLessThanOrEqual(READING.maxSentenceWords);
      n++;
    }
    expect(n).toBe(80);
    // In the lesson: Try 4 has the board, Try 5 is a two-part grid with none. Both are tagged for the pass rule.
    for (let seed = 1; seed <= 20; seed++) {
      const items = l4.practice(createRng(seed));
      expect(items.map((it) => `${it.id} ${it.skill} ${!!it.workFirst} ${it.tags?.join() ?? ''}`)).toEqual([
        expect.stringMatching(/^l4-1 s4\.(?:not-)?link false $/),
        expect.stringMatching(/^l4-2 s4\.(?:not-)?link false $/),
        expect.stringMatching(/^l4-3 s4\.(?:not-)?link false $/),
        'l4-4 s4.grid-two true grid-two',
        'l4-5 s4.grid-two false grid-two',
      ]);
    }
  });

  it('back and forth on a lesson 4 board: a worked-out cross carried across, the last box, and the check mark carried back', () => {
    expect(l4.ideas.map((c) => c.title)).toEqual(['Two parts to the grid', 'A linking clue', 'Use what you know', 'A “not” link', 'Links work both ways', 'Back and forth']);
    expect(l4.ideas[5].scene).toBe(CARD_CLUES.backForth);
    expect(l4.drill![3]).toBe(L4_BACK_FORTH);
    const clues = (CARD_CLUES.backForth.kind === 'clues' ? CARD_CLUES.backForth.clues : []).map(readClue);
    // Neither part is known: clue 1 (an “or” clue) crosses out Mia – fish; clue 2 carries it to Mia – popcorn; with clue
    // 3, Ava – popcorn is the last box; clue 2 carries her check mark back to Ava – fish.
    expect(status(fit(TWO, clues.slice(0, 1)), 'mia', 'pet', 'fish')).toBe('no');
    expect(status(fit(TWO, clues.slice(0, 2)), 'mia', 'snack', 'popcorn')).toBe('no');
    expect(status(fit(TWO, clues), 'ava', 'snack', 'popcorn')).toBe('yes');
    expect(status(fit(TWO, clues), 'ava', 'pet', 'fish')).toBe('yes');
    expect(l4.ideas[5].body.join(' ')).toContain('Here clue 1 leaves out the fish, so Mia – fish gets a cross. Mia is not the kid with the fish. So clue 2 gives Mia – popcorn a cross.');
    // The carries name their link and the mark they carry, worked out from the clues.
    const carries = L4_BACK_FORTH.rows.flatMap((r) => r.marks.filter((m) => m.compare).map((m) => [r.id, m.label, m.compare!.world]));
    // The shown carry says its other box's mark; the one to tap names the box only (Ava – popcorn is marked in the row
    // above, so its mark is never given away).
    expect(carries).toEqual([['bf-2', 'Mia – popcorn', 'Mia – fish. Mia does not have the fish.'], ['bf-4', 'Ava – fish', 'Ava – popcorn, at the other end of the clue.']]);
    expect(L4_BACK_FORTH.rows[3].marks[0].why[CANT]).toBe('You can tell. Clue 2 says the kid with the fish eats popcorn. Ava eats popcorn. So Ava – fish gets a ✓.');
    expect(L4_BACK_FORTH.scaffold).toBe('full');
    expect(L4_BACK_FORTH.words).toBe(LINK_WORDS);
    expect(L4_BACK_FORTH.steps!.length).toBe(marksToTap(L4_BACK_FORTH).length);
    expect(L4_BACK_FORTH.confused).toBe(BACK_FORTH_CONFUSED);
    // The mix-ups: a carried cross not counted, and a link read once and dropped.
    const fires = (id: string, opt: string) => checkDrill(L4_BACK_FORTH, { ...right(L4_BACK_FORTH), [id]: opt }).diagnosis;
    expect(fires('bf-3-ava-popcorn', CANT)).toBe('carried-not-counted');
    // With clue 3’s cross missed too, the empty Ava – popcorn box is not about the carried cross: no diagnosis.
    expect(checkDrill(L4_BACK_FORTH, { ...right(L4_BACK_FORTH), 'bf-3-leo-popcorn': CANT, 'bf-3-ava-popcorn': CANT }).diagnosis).toBeUndefined();
    expect(fires('bf-4-ava-fish', CANT)).toBe('link-used-up');
    expect(fires('bf-3-leo-popcorn', 'yes')).toBeUndefined();
    expect(fires('bf-4-ava-fish', 'no')).toBeUndefined();
    for (const mc of L4_BACK_FORTH.misconceptions!) mixupText(mc.text);
  });

  it('the “I’m confused” questions: one right option each, and what they claim holds on the card’s own example', () => {
    confusedShape(BOX_VS_KID_CONFUSED);
    confusedShape(BACK_FORTH_CONFUSED);
    expect(BOX_VS_KID_CONFUSED).toHaveLength(2);
    expect(BACK_FORTH_CONFUSED).toHaveLength(2);
    // Box-vs-kid: for “Who must eat grapes?” look down the grapes column; Mia’s cross under apples leaves grapes open.
    expect(BOX_VS_KID_CONFUSED[0].options.find((o) => o.right)!.label).toBe('Down the grapes column');
    expect(BOX_VS_KID_CONFUSED[1].options.find((o) => o.right)!.label).toBe('Yes: that cross is only about apples');
    expect(status(fit(SNACKS, [readClue('Mia does not eat apples.')]), 'mia', 'snack', 'grapes')).toBe('open');
    expect(status(fit(SNACKS, pictureFacts(CARD_GRIDS.crossFor).map((f) => ({ ...f, c: 'snack' }) as GridClue)), 'mia', 'snack', 'grapes')).toBe('open');
    // Back and forth: Mia does not have the fish and “The kid with the fish eats popcorn”: Mia – popcorn gets a cross.
    expect(BACK_FORTH_CONFUSED[0].options.find((o) => o.right)!.label).toBe('Mia – popcorn gets a cross');
    expect(status(fit(TWO, [readClue('Mia does not have the fish.'), readClue('The kid with the fish eats popcorn.')]), 'mia', 'snack', 'popcorn')).toBe('no');
    expect(BACK_FORTH_CONFUSED[1].options.find((o) => o.right)!.label).toBe('Yes: it may carry the new mark across');
    // The panel's last line is set by the board each one sits on (the item takes it from its own board).
    expect(LINE_WORDS.closing).toBeTruthy();
    expect(LINK_WORDS.closing).toBeTruthy();
  });

  it('mastery: lesson 2 needs a right tempting “Can’t tell yet” grid, lesson 4 a right two-part grid, and an extra quiz item can always serve each', () => {
    expect(l2.pass).toEqual({ firstTry: 3, include: [{ tag: 'cant-tell', label: 'a “Can’t tell yet” grid' }] });
    expect(l4.pass).toEqual({ firstTry: 3, include: [{ tag: 'grid-two', label: 'a two-part grid' }] });
    for (let seed = 1; seed <= 30; seed++) {
      // Every can’t-tell grid is tagged, and has a ✗ off the asked line in the line of an open box (the trap).
      for (const it of l2.practice(createRng(seed))) {
        expect(!!it.tags?.includes('cant-tell'), it.id).toBe(it.skill === 's4.not-decided');
        expect(!!it.workFirst && !!it.tags).toBe(false);
      }
      const x2 = extraQuizItem(l2, seed, [], ['cant-tell'], 0)!;
      expect(x2.tags).toEqual(['cant-tell']);
      expect(x2.workFirst).toBeUndefined();
      const x4 = extraQuizItem(l4, seed, [], ['grid-two'], 0)!;
      expect(x4.tags).toEqual(['grid-two']);
      expect(x4.workFirst).toBeUndefined();
    }
    // A row question's can’t-tell grid always has another kid's ✗ under one of the two open things.
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { marks, cast, p } = onlyOnePuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode: 'cant', ask: 'row', n: 3 });
      const open = cast.spec.cats[0].values.filter((v) => marks[p][v] === undefined);
      expect(open.some((v) => cast.spec.people.some((q) => q !== p && marks[q][v] === 'no')), `seed ${seed}`).toBe(true);
    }
  });

  it('lessons 4 and 5 rely on box-vs-kid: they say it was taught in lesson 2, and a card reminds', () => {
    const l5 = lessonOf('s4.l5');
    for (const l of [l4, l5]) {
      expect(l.distinctions).toEqual([{ ...BOX_VS_KID, taughtIn: 's4.l2' }]);
      expect(l.ideas.filter((cd) => cd.distinction === BOX_VS_KID.id)).toHaveLength(1);
      expect(l.ideas.length).toBeLessThanOrEqual(7);
    }
    // Lesson 4, “A ‘not’ link”: if Leo has the dog, the clue crosses Leo out for popcorn only; apples and grapes stay open.
    const notCard = l4.ideas.find((cd) => cd.distinction === BOX_VS_KID.id)!;
    expect(notCard.title).toBe('A “not” link');
    expect(notCard.body.join(' ')).toContain('That ✗ is for popcorn only: Leo could still eat apples or grapes.');
    const ways = fit(TWO, [readClue('Leo has the dog.'), readClue('The kid with the dog does not eat popcorn.')]);
    expect(['apples', 'popcorn', 'grapes'].map((v) => status(ways, 'leo', 'snack', v))).toEqual(['open', 'no', 'open']);
    // Lesson 5, “Use only the clues you are told”: each clue crosses a kid out for the fish, and only Ava is left.
    const listCard = l5.ideas.find((cd) => cd.distinction === BOX_VS_KID.id)!;
    expect(listCard.title).toBe('Use only the clues you are told');
    expect(listCard.body.join(' ')).toMatch(/crosses out Mia for the fish\./);
  });

  it('the reworded texts are in place', () => {
    // Lesson 2: the “Count the empty boxes” card starts by finding the line.
    expect(l2.ideas[5].body[0]).toBe('First find the line the question is about. Who has the fish? Look down the fish column. Which pet does Leo have? Look across Leo’s row.');
    // Lesson 4: the two-part grid's Remember carries each new mark across the links; a one-part grid's does not.
    for (let seed = 1; seed <= 10; seed++) {
      expect(gridPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat: 2 }).item.teach!.remember![0]).toBe('Put in the clue marks. Spread every ✓. Then look for only one left. Carry each new check mark or cross across the linking clues, then read them again.');
      expect(gridPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), ncat: 1 }).item.teach!.remember![0]).toBe('Put in the clue marks. Spread every ✓. Then look for only one left.');
      // A clue crosses a kid out for one thing: the person notes name it.
      const lk = linkPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode: 'notLink2' });
      for (const cs of lk.item.teach!.cases!) if (/crosses? out/.test(cs.note!)) expect(cs.note, cs.note).toMatch(/ for .+\.$/);
      // Every “crosses out <kid>” in a “not” link item's words says what for: explanation, feedback, meaning, Simpler.
      for (const mode of ['notLink2', 'notLink'] as const) {
        const r = linkPuzzle(createRng(seed), { id: 'x', skin: skinAt(seed), mode });
        const nl = r.item;
        const thing = wordsFor(r.cast).obj(r.c2, r.val);
        const said = [nl.explain, nl.teach!.meaning!, ...nl.teach!.simpler!, ...Object.values(nl.feedback!).flatMap((f) => [f.headline, ...f.detail])].join(' ');
        const hits = [...said.matchAll(/cross(?:es)? out (?:only )?([A-Z]\w*)([^.]*)\./g)];
        expect(hits.length, said).toBeGreaterThan(2);
        for (const hit of hits) expect(hit[2], hit[0]).toMatch(new RegExp(`^ for ${esc(thing)}\\b`));
      }
    }
    // The linking-clue line moved from lesson 5's “Stuck? Read again” into lesson 4's “Back and forth”.
    const stuck = lessonOf('s4.l5').ideas.find((c) => c.title === 'Stuck? Read again')!;
    expect(stuck.body.join(' ')).not.toMatch(/linking/);
    expect(l4.ideas[5].body).toContain('Stuck? Read the linking clues again. A linking clue may give you a new cross.');
    // Lesson 4's real-life line no longer says to save a link for later.
    expect(WORLD.s4.lessons['s4.l4'].why).not.toMatch(/later/);
    expect(WORLD.s4.lessons['s4.l4'].why).toMatch(/Read it again each time/);
  });
});

/** Every word a board shows: its text, rows, marks, compare lines, mix-ups and “I’m confused” questions. */
function drillWords(st: DrillStep): string[] {
  return [
    st.title, ...st.body, st.done, ...(st.steps ?? []),
    ...st.rows.flatMap((r) => [r.label, r.note ?? '', r.needs ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
    ...(st.misconceptions ?? []).map((m) => m.text),
    ...(st.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
  ].filter(Boolean);
}
