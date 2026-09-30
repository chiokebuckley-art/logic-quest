/**
 * Stop 4 grid engine. Every answer is re-derived here by brute force (every way to hand out the values, checked
 * with gridClueHolds), independent of the helpers the engine uses to build items.
 */
import { describe, expect, it } from 'vitest';
import { CARD_GRIDS, stop4 } from '../../content/stop4';
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
  type Cast,
  type Marks,
  type OnlyMode,
  type SkinId,
  type Sol,
  type Spec,
} from '../puzzles/grid';
import { createRng } from '../rng';
import type { ChooseItem, GridClue, Item, Scene } from '../types';

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
        expect(item.prompt).toMatch(ask === 'yes' ? /gets a ✓\?$/ : /gets a ✗\?$/);
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
          expect(namedIn(cast, item.whyWrong!.yes)).toEqual([...who].sort());
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

