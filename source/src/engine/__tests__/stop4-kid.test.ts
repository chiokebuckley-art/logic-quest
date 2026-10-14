/**
 * Stop 4's kid forms (docs/KID-JOURNEY.md, "Round 2 fields"), worked out again here from the classic items and boards
 * they sit beside, by brute force wherever an answer is involved: lesson 1's clue pictures (the person's row and the
 * thing's column of the grid, named, and the mark) and the box they point to; lesson 2's tiles and its kid-only copies
 * (caves named by one word, no board before the first question); lesson 3's spread tiles (the right one is the set of
 * boxes the check crosses out) and the whole grid's clue pictures (the clues they say give the grid's one answer);
 * lesson 4's prompts and the two-part grid's kid-only form (one of its own links, on the same answer); and the kid
 * boards: lesson 1's grid without its caption, its boxes drawn as their pets, and lesson 2's mark pictures, each the
 * row's grid with the asked line or box ringed, whose answer can be read off the picture.
 */
import { describe, expect, it } from 'vitest';
import { CARD_GRIDS, L1_GRID, L1_KID, L1_OR, L2_COUNT, L2_CROSS, L2_CROSS_DO, L2_KID, L3_KID, L3_SPREAD, L4_BACK_FORTH, L4_KID, L4_NOT, stop4 } from '../../content/stop4';
import { gradeById } from '../../content/grades';
import { GRID_ASK } from '../../game/components/Pictogram';
import { kidItemOf } from '../../game/kidPlay';
import { practiceFor } from '../drill';
import { gridClueHolds } from '../grade';
import { CANT } from '../puzzles/grid';
import { fkGrade, longestSentence, words } from '../readability';
import { createRng } from '../rng';
import type { AssignItem, ChooseItem, DrillStep, GridClue, Item, KidBoard, KidPicto, MultiItem, Picto, Scene } from '../types';

const SEEDS = Array.from({ length: 40 }, (_, k) => k + 1);
const KID = { grade: 'g3' as const, budget: gradeById('g3').budget, autoRead: false };
const KID_LESSONS = ['s4.l1', 's4.l2', 's4.l3', 's4.l4'];
const lesson = (id: string) => stop4.lessons.find((l) => l.id === id)!;
const ofKid = (it: Item) => KID_LESSONS.includes(it.lesson ?? '') && !!it.kid;
const lessonItems = KID_LESSONS.flatMap((id) => SEEDS.flatMap((seed) => practiceFor(lesson(id), createRng(seed))));
/** The stop check's items of lessons 1 to 4 with a kid block (its closing why item has none), the Arcade's, and new examples after a miss. */
const checks = SEEDS.flatMap((seed) => stop4.check!(createRng(seed))).filter(ofKid);
const arcade = SEEDS.flatMap((seed) => [stop4.practice!(createRng(seed)), stop4.practice!(createRng(seed + 500))]).filter(ofKid);
const fresh = lessonItems.slice(0, 160).flatMap((it, k) => stop4.fresh!(it, createRng(k + 1))).filter(ofKid);
const all = [...lessonItems, ...checks, ...arcade, ...fresh];
const of = (id: string) => all.filter((it) => it.lesson === id);

// ---------- independent brute force ----------

type Way = Record<string, Record<string, string>>;
function perms(xs: readonly string[]): string[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
/** Every way to give each person one value of each part, each value to one person. */
function ways(people: readonly string[], parts: readonly { id: string; values: readonly string[] }[]): Way[] {
  let out: Way[] = [Object.fromEntries(people.map((p) => [p, {}]))];
  for (const part of parts) {
    out = out.flatMap((w) => perms(part.values).map((vs) => Object.fromEntries(people.map((p, i) => [p, { ...w[p], [part.id]: vs[i] }]))));
  }
  return out;
}

type Grid = Extract<Scene, { kind: 'grid' }>;
const gridOf = (scene: Scene | undefined): Grid => {
  if (scene?.kind !== 'grid') throw new Error('a grid scene');
  return scene;
};
/** A grid's column name in one word, as a kid grid and a picture's word say it: a cave by its first word. */
const oneWord = (label: string) => label.replace(/ cave$/, '');
const num = (art: string, re: RegExp): number[] => {
  const m = re.exec(art);
  if (!m) throw new Error(`${art} is not ${re}`);
  return m.slice(1).map(Number);
};
const kidStrings = (k: NonNullable<Item['kid']>) => [k.prompt, k.nope, ...(k.yes ? [k.yes] : []), ...(k.hint ? [k.hint] : []), ...(k.show ? [k.show.label, ...(k.show.note ? [k.show.note] : [])] : [])];

describe('Stop 4 kid forms: lesson 1 (Grade 1)', () => {
  const items = of('s4.l1') as ChooseItem[];

  it('has items to check', () => expect(items.length).toBeGreaterThan(100));

  it('the clue is its picture: the person’s row and the thing’s column, each named as the grid names it, and the mark; “Which box?” asks the box they meet at', () => {
    for (const it of items) {
      const k = it.kid!;
      expect(k.prompt).toBe('Which box?');
      expect(k.scene?.kind).toBe('pictos');
      const rows = (k.scene as { rows: KidPicto[][] }).rows;
      expect(rows).toHaveLength(1);
      const row = rows[0];
      const grid = gridOf(it.scene);
      const [n, r] = num(row[0].art, /^grid-row-(\d)-(\d)$/);
      expect(n).toBe(grid.rows.length);
      expect(row[0].word).toBe(grid.rows[r - 1].label);
      const cols = row.slice(1).filter((p) => /^grid-col-/.test(p.art)).map((p) => {
        const [, c] = num(p.art, /^grid-col-(\d)-(\d)$/);
        expect(p.word).toBe(oneWord(grid.cols[c - 1].label));
        return c;
      });
      const mark = row[row.length - 1].art;
      expect(['check', 'cross', 'grid-or']).toContain(mark);
      expect(cols).toHaveLength(mark === 'grid-or' ? 2 : 1);
      // The classic clue says the same: its person, its thing (or two), and “not” for a cross.
      const clue = /“([^”]+)”/.exec(it.prompt)![1];
      expect(clue.startsWith(grid.rows[r - 1].label)).toBe(true);
      for (const c of cols) expect(clue).toContain(oneWord(grid.cols[c - 1].label));
      expect(/ not /.test(clue)).toBe(mark === 'cross');
      expect(/ or /.test(clue)).toBe(mark === 'grid-or');
      // The box the picture points to: where the row and the column meet, or (an “or”) the column it leaves out.
      const col = mark === 'grid-or' ? [1, 2, 3].find((c) => !cols.includes(c))! : cols[0];
      expect(it.choices.find((c) => c.id === it.answer)!.art).toBe(`grid-box-${r}-${col}`);
      for (const c of it.choices) expect([c.art, c.word]).toEqual([expect.stringMatching(/^grid-box-\d-\d$/), '']);
      expect(kidItemOf(it, KID)).toBe(it);
    }
  });

  it('the Show me twins drop the dash form and keep to six words', () => {
    for (const it of items) {
      const show = it.kid!.show!;
      expect(`${show.label} ${show.note}`).not.toMatch(/–/);
      expect(words(`${show.label} ${show.note ?? ''}`).length).toBeLessThanOrEqual(6);
    }
  });
});

describe('Stop 4 kid forms: lesson 2 (Grade 2)', () => {
  const items = of('s4.l2') as ChooseItem[];

  it('picture tiles with no words, the question in kid words, and the answer the grid’s marks give', () => {
    expect(items.length).toBeGreaterThan(100);
    for (const it of items) {
      for (const c of it.choices) expect([!!c.art, c.word]).toEqual([true, '']);
      const grid = gridOf(it.scene);
      const people = grid.rows.map((r) => r.id);
      const values = grid.cols.map((c) => c.id);
      const question = /[^.]*\?$/.exec(it.prompt)![0].trim();
      const colAsk = it.choices.some((c) => /^grid-row-/.test(c.art!));
      const kidQ = it.kid!.prompt;
      if (colAsk) {
        expect(kidQ).toMatch(/^(Who|Which letter) must /);
        expect(kidQ.replace(/^.* must /, '')).toBe(question.replace(/^.* must /, ''));
      } else expect(kidQ).toBe(question);
      // Brute force over the drawn crosses: who must have the asked thing, or which thing the asked kid must have.
      const fit = ways(people, [{ id: 'x', values }]).filter((w) => people.every((p) => values.every((v) => grid.marks[p]?.[v] !== 'no' || w[p].x !== v)));
      const asked = colAsk
        ? grid.cols.filter((c) => question.includes(` ${c.label}?`)).sort((a, b) => b.label.length - a.label.length)[0]
        : grid.rows.find((r) => question.includes(` ${r.label} `))!;
      const can = colAsk ? people.filter((p) => fit.some((w) => w[p].x === asked.id)) : values.filter((v) => fit.some((w) => w[asked.id].x === v));
      expect(it.answer, it.prompt).toBe(can.length === 1 ? can[0] : CANT);
    }
  });

  it('a grid of caves (and the first question, whose board is in classic words) has a kid-only copy: the same question and answer, caves named by one word, no board', () => {
    let copies = 0;
    for (const it of items) {
      const grid = gridOf(it.scene);
      const caves = grid.cols.some((c) => c.label.includes(' '));
      const alt = it.kid!.alt as ChooseItem | undefined;
      expect(!!alt, it.prompt).toBe(caves || !!it.workFirst);
      if (!alt) continue;
      copies++;
      const kid = kidItemOf(it, KID) as ChooseItem;
      expect([kid.id, kid.tags, kid.skill, kid.answer, kid.kind]).toEqual([it.id, it.tags, it.skill, it.answer, 'choose']);
      expect(kid.choices).toEqual(it.choices);
      expect(kid.workFirst).toBeUndefined();
      expect(kid.kid!.alt).toBeUndefined();
      const g = gridOf(kid.scene);
      expect([g.rows, g.marks]).toEqual([grid.rows, grid.marks]);
      expect(g.cols.map((c) => c.label)).toEqual(grid.cols.map((c) => oneWord(c.label)));
      for (const c of g.cols) expect(c.label).not.toMatch(/ /);
    }
    expect(copies).toBeGreaterThan(20);
  });
});

describe('Stop 4 kid forms: lesson 3 (Grade 3)', () => {
  it('“Which boxes get a cross?” as line tiles: the right one holds exactly the boxes the check crosses out, worked out by brute force', () => {
    const items = of('s4.l3').filter((it): it is MultiItem => it.kind === 'multi');
    expect(items.length).toBeGreaterThan(100);
    for (const it of items) {
      const alt = it.kid!.alt as ChooseItem;
      const kid = kidItemOf(it, KID) as ChooseItem;
      expect([kid.id, kid.kind, kid.skill, alt.kid!.alt]).toEqual([it.id, 'choose', it.skill, undefined]);
      const grid = gridOf(it.scene);
      const g = gridOf(alt.scene);
      expect([g.rows, g.marks, g.cols.map((c) => c.label)]).toEqual([grid.rows, grid.marks, grid.cols.map((c) => oneWord(c.label))]);
      const people = grid.rows.map((r) => r.id);
      const values = grid.cols.map((c) => c.id);
      const n = people.length;
      const r = people.findIndex((p) => values.some((v) => grid.marks[p]?.[v] === 'yes')) + 1;
      const c = values.findIndex((v) => grid.marks[people[r - 1]][v] === 'yes') + 1;
      const rowDone = values.every((v, j) => j === c - 1 || grid.marks[people[r - 1]][v] === 'no');
      // The boxes that must get a ✗ and are still empty, from every way that keeps the marks.
      const fit = ways(people, [{ id: 'x', values }]).filter((w) => people.every((p) => values.every((v) => {
        const m = grid.marks[p]?.[v];
        return m === undefined || (m === 'yes') === (w[p].x === v);
      })));
      const empty = (i: number, j: number) => grid.marks[people[i]]?.[values[j]] === undefined;
      const key = (boxes: [number, number][]) => boxes.filter(([i, j]) => empty(i, j)).map(([i, j]) => `${i}${j}`).sort().join(' ');
      const all = people.flatMap((_, i) => values.map((__, j): [number, number] => [i, j]));
      const needed = key(all.filter(([i, j]) => fit.every((w) => w[people[i]].x !== values[j])));
      const boxesOf = (art: Picto): [number, number][] => {
        let m = /^grid-row-(\d)-(\d)$/.exec(art);
        if (m) return all.filter(([i]) => i === Number(m![2]) - 1);
        m = /^grid-col-(\d)-(\d)$/.exec(art);
        if (m) return all.filter(([, j]) => j === Number(m![2]) - 1);
        m = /^grid-(plus|out)-(\d)-(\d)-(\d)$/.exec(art);
        if (!m) throw new Error(`${art} is not a spread tile`);
        expect([Number(m[2]), Number(m[3]), Number(m[4])]).toEqual([n, r, c]);
        return all.filter(([i, j]) => (i === r - 1 || j === c - 1) === (m![1] === 'plus'));
      };
      const right = alt.choices.filter((t) => key(boxesOf(t.art!)) === needed);
      expect(right.map((t) => t.id), it.prompt).toEqual([alt.answer]);
      expect(alt.choices.map((t) => t.id)).toEqual(rowDone ? ['row', 'col', 'out'] : ['row', 'col', 'both', 'out']);
      for (const t of alt.choices) expect(t.word).toBe('');
      expect(alt.kid!.prompt).toMatch(rowDone ? /\. Which boxes still need a cross\?$/ : /\. Which boxes get a cross\?$/);
      // The classic answer's boxes, picked one by one, are among them.
      for (const id of it.answer) {
        const [i, j] = all.find(([x, y]) => id === `${people[x]}-${values[y]}`)!;
        expect(needed.split(' ')).toContain(`${i}${j}`);
      }
    }
  });

  it('a whole grid’s clues are rows of pictures, one a clue (who, the thing, its mark), and the clues they say give the grid’s one answer', () => {
    const items = of('s4.l3').filter((it): it is AssignItem => it.kind === 'assign');
    expect(items.length).toBeGreaterThan(30);
    for (const it of items) {
      const k = it.kid!;
      expect(k.prompt).toBe('Fill in the grid.');
      const rows = (k.scene as { kind: 'pictos'; rows: KidPicto[][] }).rows;
      expect(rows).toHaveLength(it.gridClues!.length);
      const part = it.categories[0];
      const people = it.people.map((p) => p.id);
      const values = part.values.map((v) => v.id);
      // The clue each row of pictures says, read off its pictures alone.
      const said = rows.map((row): GridClue => {
        const [n, r] = num(row[0].art, /^grid-row-(\d)-(\d)$/);
        expect(n).toBe(people.length);
        expect(row[0].word).toBe(it.people[r - 1].label);
        const vs = row.filter((p) => /^grid-col-/.test(p.art)).map((p) => {
          const [, c] = num(p.art, /^grid-col-(\d)-(\d)$/);
          expect(p.word).toBe(oneWord(part.values[c - 1].label));
          return values[c - 1];
        });
        const mark = row[row.length - 1].art;
        const p = people[r - 1];
        if (mark === 'grid-or') return { t: 'either', p, c: part.id, v1: vs[0], v2: vs[1] };
        return { t: mark === 'check' ? 'is' : 'isnt', p, c: part.id, v: vs[0] };
      });
      expect(said).toEqual(it.gridClues);
      const fit = ways(people, [{ id: part.id, values }]).filter((w) => said.every((cl) => gridClueHolds(cl, w)));
      expect(fit).toEqual([it.answer]);
      expect(kidItemOf(it, KID)).toBe(it);
    }
  });
});

describe('Stop 4 kid forms: lesson 4 (Grade 3)', () => {
  it('a link question quotes its one clue, or puts two “not” clues after the question as “Not …” lines; tiles with no words; caves named by one word in a copy', () => {
    const items = of('s4.l4').filter((it): it is ChooseItem => it.kind === 'choose');
    expect(items.length).toBeGreaterThan(100);
    for (const it of items) {
      const p = it.kid!.prompt;
      const two = (it.prompt.match(/Clue \d:/g) ?? []).length === 2;
      if (two) expect(p).toMatch(/^(Who|Which letter) must [^?]+\? Not [^.]+\. Not [^.]+\.$/);
      else expect(p).toMatch(/^“[^”]+” (Who|Which letter) must [^?]+\?$/);
      for (const c of it.choices) expect([!!c.art, c.word]).toEqual([true, '']);
      const grid = gridOf(it.scene);
      const caves = grid.cols.some((c) => c.label.includes(' '));
      const alt = it.kid!.alt as ChooseItem | undefined;
      expect(!!alt).toBe(caves);
      if (alt) {
        expect([alt.answer, alt.choices, gridOf(alt.scene).marks]).toEqual([it.answer, it.choices, grid.marks]);
        expect(gridOf(alt.scene).cols.map((c) => c.label)).toEqual(grid.cols.map((c) => oneWord(c.label)));
      }
    }
  });

  it('a two-part grid is asked as one of its own links, on the same answer: one part shown filled in from it, and who must have the thing at the other end', () => {
    const items = of('s4.l4').filter((it): it is AssignItem => it.kind === 'assign');
    expect(items.length).toBeGreaterThan(30);
    for (const it of items) {
      const alt = it.kid!.alt as ChooseItem;
      const kid = kidItemOf(it, KID) as ChooseItem;
      expect([kid.id, kid.tags, kid.skill, kid.kind, kid.workFirst, alt.kid!.alt]).toEqual([it.id, it.tags, it.skill, 'choose', undefined, undefined]);
      const people = it.people.map((p) => p.id);
      const g = gridOf(alt.scene);
      expect(g.rows).toEqual(it.people);
      const part = it.categories.find((c) => c.values.some((v) => v.id === g.cols[0].id))!;
      const other = it.categories.find((c) => c !== part)!;
      expect(g.cols.map((c) => c.label)).toEqual(part.values.map((v) => oneWord(v.label)));
      // The part shown is the grid's own answer.
      for (const p of people) for (const v of part.values) expect(g.marks[p][v.id]).toBe(it.answer[p][part.id] === v.id ? 'yes' : 'no');
      // The quoted clue is one of the grid's links from that part (a “has” link when the grid has one).
      const quote = /^“([^”]+)”/.exec(alt.kid!.prompt)![1];
      const label = (c: typeof part, v: string) => oneWord(c.values.find((x) => x.id === v)!.label);
      const links = it.gridClues!.filter((cl): cl is Extract<GridClue, { t: 'link' | 'notLink' }> => (cl.t === 'link' || cl.t === 'notLink') && cl.c1 === part.id);
      const named = links.filter((cl) => quote.includes(label(part, cl.v1)) && quote.includes(label(other, cl.v2)) && / not /.test(quote) === (cl.t === 'notLink'));
      expect(named.length, quote).toBeGreaterThan(0);
      if (it.gridClues!.some((cl) => cl.t === 'link')) expect(quote).not.toMatch(/ not /);
      // Who must have the thing at the link's other end, with the shown part fixed: by brute force.
      for (const cl of named) {
        const fit = ways(people, [{ id: part.id, values: part.values.map((v) => v.id) }, { id: other.id, values: other.values.map((v) => v.id) }])
          .filter((w) => people.every((p) => w[p][part.id] === it.answer[p][part.id]) && gridClueHolds(cl, w));
        const who = people.filter((p) => fit.some((w) => w[p][other.id] === cl.v2));
        expect(alt.answer, quote).toBe(who.length === 1 ? who[0] : CANT);
      }
      for (const c of alt.choices) expect([!!c.art, c.word]).toEqual([true, '']);
    }
  });
});

describe('Stop 4 kid boards', () => {
  it('lesson 1’s grid board is the same board without its caption, and its line is the clue in three words', () => {
    const kb = L1_KID.board![0];
    const { caption, ...rest } = L1_GRID;
    expect(caption).toBe('Snacks');
    expect(kb.alt).toEqual(rest);
    expect(kb.line).toBe('Leo: no apple.');
  });

  it('lesson 1’s one-clue board draws each box as its pet, in the row’s order', () => {
    const kb = L1_KID.board![1];
    L1_OR.rows.forEach((row, i) => {
      const marks = kb.rows![i].marks;
      if (row.marks.every((m) => m.given)) return;
      expect(marks!.map((m) => m.art)).toEqual(row.marks.map((m) => m.label.split(' – ')[1]));
    });
  });

  /** A board row's grid in the kid picture: Mia, Leo and Ava top to bottom, its crosses, and the asked line or box ringed. */
  function picture(step: DrillStep, kb: KidBoard, facts: (row: number) => Record<string, Record<string, string>>, people: string[], values: string[]) {
    step.rows.forEach((row, i) => {
      if (row.marks.every((m) => m.given)) return;
      const crossed = facts(i);
      row.marks.forEach((m, j) => {
        const art = kb.rows![i].marks![j].art as keyof typeof GRID_ASK;
        const count = /^Empty boxes in (?:(\w+)’s row|the (\w+) column)$/.exec(m.label);
        const box = /^(\w+) – (\w+)$/.exec(m.label);
        const ringed = (p: string, v: string) => (count ? (count[1] ? p === count[1].toLowerCase() : v === count[2]) : p === box![1].toLowerCase() && v === box![2]);
        const want = people.map((p) => values.map((v) => (crossed[p]?.[v] === 'no' ? (ringed(p, v) ? 'X' : 'x') : ringed(p, v) ? 'o' : '.')).join(''));
        expect(GRID_ASK[art], `${row.id} ${m.label}`).toEqual(want);
        // The answer read off the picture alone: the empty boxes ringed, a cross, the last box of its row or column.
        const pic = GRID_ASK[art];
        let read: string;
        if (count) read = String([...pic.join('')].filter((ch) => ch === 'o').length);
        else {
          const [r, c] = [people.indexOf(box![1].toLowerCase()), values.indexOf(box![2])];
          const last = pic[r].split('').every((ch, k) => k === c || ch === 'x') || pic.every((line, k) => k === r || line[c] === 'x');
          read = pic[r][c] === 'X' ? 'no' : last ? 'yes' : CANT;
        }
        expect(read, `${row.id} ${m.label}`).toBe(m.answer);
      });
    });
  }

  it('lesson 2’s marks are pictures of the row’s grid with the line to count or the box to mark ringed, and each answer can be read off its picture', () => {
    // The contrast's two grids: Mia's cross under apples, or under grapes, and Leo's under grapes.
    picture(L2_CROSS_DO, L2_KID.board![0], (i) => L2_CROSS.marks[i], ['mia', 'leo', 'ava'], ['apples', 'popcorn', 'grapes']);
    // “Not so fast” (Leo has no cat), and the cross each row adds in its own words.
    picture(L2_COUNT, L2_KID.board![1], (i) => {
      const marks: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(CARD_GRIDS.notSoFast.marks));
      const add = /Add a ✗: (\w+) does not have the (\w+)\./.exec(L2_COUNT.rows[i].label);
      if (add) (marks[add[1].toLowerCase()] ??= {})[add[2]] = 'no';
      return marks;
    }, ['mia', 'leo', 'ava'], ['cat', 'dog', 'fish']);
  });

  it('every kid board with a box to mark draws its answers as the check, cross and question tiles, with no words', () => {
    const boards: [DrillStep, KidBoard][] = [[L1_OR, L1_KID.board![1]], [L2_CROSS_DO, L2_KID.board![0]], [L2_COUNT, L2_KID.board![1]], [L3_SPREAD, L3_KID.board![0]], [L4_NOT, L4_KID.board![1]], [L4_BACK_FORTH, L4_KID.board![3]]];
    for (const [step, kb] of boards) {
      expect(kb.options).toEqual({ yes: { art: 'check' }, no: { art: 'cross' }, [CANT]: { art: 'verdict-cant' } });
      step.rows.forEach((row, i) => {
        if (kb.rows?.[i]?.marks) expect(kb.rows[i].marks).toHaveLength(row.marks.length);
        for (const m of row.marks) {
          if (m.options.some((o) => o.id === 'yes')) expect(m.options.map((o) => o.id).sort()).toEqual([CANT, 'no', 'yes'].sort());
          else expect(m.options.every((o) => /^\d$/.test(o.id))).toBe(true);
        }
      });
    }
  });
});

describe('Stop 4 kid-only copies: their kid words', () => {
  it('keep their band’s longest sentence, grade 7 reading, curly quotes, no symbols, “Not yet” never “Wrong”, and a hint of 8 words at most', () => {
    const bands: Record<string, number> = { 's4.l1': 8, 's4.l2': 10, 's4.l3': 12, 's4.l4': 12 };
    const texts: string[] = [];
    for (const it of all) {
      const alt = it.kid?.alt;
      if (!alt) continue;
      const kidText = kidStrings(alt.kid!);
      texts.push(...kidText);
      for (const s of kidText) {
        expect(longestSentence(s).words, s).toBeLessThanOrEqual(bands[it.lesson!]);
        expect(s, s).not.toMatch(/['"]/);
        expect(s, s).not.toMatch(/[¬∧∨→↔✓✗<>=+*/\\#&%@|~^_]/);
        expect(s, s).not.toMatch(/\bwrong\b/i);
      }
      if (alt.kid!.hint) expect(words(alt.kid!.hint).length).toBeLessThanOrEqual(8);
    }
    expect(texts.length).toBeGreaterThan(100);
    expect(fkGrade(texts.join(' '))).toBeLessThanOrEqual(7);
  });

  it('classic play never sees them', () => {
    for (const it of all) expect(kidItemOf(it, null)).toBe(it);
  });
});
