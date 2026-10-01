/**
 * Stop 4 grid engine. Every answer is re-derived here by brute force (every way to hand out the values, checked
 * with gridClueHolds), independent of the helpers the engine uses to build items.
 */
import { describe, expect, it } from 'vitest';
import { CARD_GRIDS, stop4 } from '../../content/stop4';
import { freshCheckSet, looks } from '../fresh';
import { gridClueHolds } from '../grade';
import {
  CANT,
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
import type { ChooseItem, GridClue, Item, Scene, TeachCase } from '../types';

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
            expect(item.feedback![id].headline).toMatch(new RegExp(`^${whoName(id)} could `));
          }
          if (k === 'crossed') {
            // The pick could not; then the line's empty boxes, as in the grid's own case.
            expect(ex.truths![0].value).toBe(false);
            expect(ex.truths!.slice(1)).toEqual(item.teach!.cases![0].truths);
          }
          if (k === 'cant') expect(ex.truths!.every((t) => t.value)).toBe(true);
        }
        headlinesByKind(item, kinds, {
          crossed: /has a ✗\.$/,
          cant: /, so you can tell\.$/,
          open: /^\S+ could .+, but (?:so could \S+|\S+ could .+ too)\.$/,
        });
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
          crossed: /^(?:The clue|Clue \d) crosses out \S+\.$/,
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
