/**
 * The Do step (guided boards) and the lesson pass rule, from "Logic Quest — teach before the quiz" (skill-drill
 * fixes, 2 Oct 2026): a wrong mark stays wrong until changed and the first mismatch is named; reading the cards
 * never passes a lesson; the pass needs first-try quiz answers, and extra items come from the same lesson.
 */
import { describe, expect, it } from 'vitest';
import { checkDrill, DEFAULT_PASS, drillSpeech, extraQuizItem, lessonWaitsFor, marksToTap, passGoal, passState, rowDone } from '../drill';
import { STOPS } from '../../content/stops';
import { looks } from '../fresh';
import { createRng } from '../rng';
import type { DrillStep, Item, LessonDef } from '../types';

const TF = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const board: DrillStep = {
  id: 'd',
  title: 'Mark a case',
  body: ['Pretend the treasure is in the Gold chest.'],
  rows: [
    {
      id: 'silver',
      label: 'Pretend the treasure is in the Silver chest.',
      note: '1 true sign. Keep.',
      marks: [{ id: 's-gold', label: 'Gold sign', options: TF, answer: 'false', given: true, why: {} }],
    },
    {
      id: 'gold',
      label: 'Pretend the treasure is in the Gold chest.',
      marks: [
        { id: 'g-gold', label: 'Gold sign', options: TF, answer: 'true', why: { false: 'The Gold sign says the treasure is in this chest. It is.' } },
        { id: 'g-silver', label: 'Silver sign', options: TF, answer: 'true', why: { false: 'Silver’s sign is true if the treasure is in Gold. The treasure is not in Silver.' } },
      ],
    },
  ],
  done: 'Gold makes two signs true. Reject Gold.',
};

describe('guided boards', () => {
  it('only marks that are not given are the learner’s to tap', () => {
    expect(marksToTap(board).map((m) => m.id)).toEqual(['g-gold', 'g-silver']);
  });

  it('nothing marked: not done, and nothing is filled in', () => {
    const r = checkDrill(board, {});
    expect(r.done).toBe(false);
    expect(r.missing).toEqual(['g-gold', 'g-silver']);
    expect(r.message).toMatch(/2 marks are still empty/);
  });

  it('names the first mismatch in plain words, and a wrong mark stays wrong until it is changed', () => {
    const r = checkDrill(board, { 'g-gold': 'true', 'g-silver': 'false' });
    expect(r.done).toBe(false);
    expect(r.wrong).toEqual(['g-silver']);
    expect(r.message).toBe('Silver’s sign is true if the treasure is in Gold. The treasure is not in Silver.');
    // Checking again without changing it gives the same message: no auto-fill.
    expect(checkDrill(board, { 'g-gold': 'true', 'g-silver': 'false' }).message).toBe(r.message);
  });

  it('the first wrong mark in reading order is the one named, even when a later one is empty', () => {
    const r = checkDrill(board, { 'g-gold': 'false' });
    expect(r.wrong).toEqual(['g-gold']);
    expect(r.message).toMatch(/^The Gold sign says/);
  });

  it('every mark right: done', () => {
    const r = checkDrill(board, { 'g-gold': 'true', 'g-silver': 'true' });
    expect(r).toEqual({ done: true, missing: [], wrong: [], message: '' });
    expect(rowDone(board, 'gold', { 'g-gold': 'true', 'g-silver': 'true' })).toBe(true);
    expect(rowDone(board, 'silver', {})).toBe(true);
    expect(rowDone(board, 'gold', { 'g-gold': 'true' })).toBe(false);
  });

  it('read-aloud reads a given mark with its value and asks for each mark to tap', () => {
    const lines = drillSpeech(board);
    expect(lines).toContain('Gold sign: False.');
    expect(lines).toContain('Silver sign: True or False?');
    expect(lines).toContain('1 true sign. Keep.');
  });
});

describe('the lesson pass rule', () => {
  const r = (clean: boolean, ...tags: string[]) => ({ clean, tags });

  it('default: 3 right on the first try with no hint', () => {
    expect(DEFAULT_PASS).toEqual({ firstTry: 3 });
    expect(passGoal(undefined)).toBe('3 right on the first try');
    expect(passState(undefined, []).met).toBe(false);
    expect(passState(undefined, [r(true), r(false), r(true)]).met).toBe(false);
    expect(passState(undefined, [r(true), r(false), r(true), r(true)])).toEqual({ met: true, have: 3, need: 3, missing: [] });
  });

  it('in a row: a miss starts the count again', () => {
    const rule = { firstTry: 3, inARow: true };
    expect(passGoal(rule)).toBe('3 right on the first try in a row');
    expect(passState(rule, [r(true), r(true), r(false), r(true), r(true)]).met).toBe(false);
    expect(passState(rule, [r(true), r(true), r(false), r(true), r(true), r(true)]).met).toBe(true);
  });

  it('in a row: any run of first-try answers counts, not only the last one', () => {
    const rule = { firstTry: 3, inARow: true };
    expect(passState(rule, [r(true), r(true), r(true), r(true), r(false)]).met).toBe(true);
    expect(passState(rule, [r(true), r(true), r(false), r(true), r(true)]).met).toBe(false);
    expect(passState(rule, [r(true), r(true), r(false), r(true), r(true)]).have).toBe(2);
    expect(passState(rule, [r(true), r(true), r(false)]).have).toBe(0);
  });

  it('in a row with include: the groups must be inside the run itself', () => {
    const rule = { firstTry: 3, inARow: true, include: [{ tag: 'false-statement', label: 'a false statement' }] };
    // A false statement right at the start, then a miss: the run after the miss has no false statement yet.
    const s = passState(rule, [r(true, 'false-statement'), r(false, 'x'), r(true, 'x'), r(true, 'x'), r(true, 'x')]);
    expect(s.have).toBe(3);
    expect(s.met).toBe(false);
    expect(s.missing.map((m) => m.tag)).toEqual(['false-statement']);
    expect(passState(rule, [r(true, 'false-statement'), r(false, 'x'), r(true, 'x'), r(true, 'x'), r(true, 'x'), r(true, 'false-statement')]).met).toBe(true);
  });

  it('include: each group needs a first-try answer on an item with its tag', () => {
    const rule = { firstTry: 3, include: [{ tag: 'false-statement', label: 'a false statement' }, { tag: 'not-statement', label: 'a sentence that is not a statement' }] };
    const s = passState(rule, [r(true, 'true-statement'), r(true, 'true-statement'), r(false, 'false-statement'), r(true, 'not-statement')]);
    expect(s.met).toBe(false);
    expect(s.missing.map((m) => m.tag)).toEqual(['false-statement']);
    expect(passState(rule, [r(true, 'true-statement'), r(true, 'false-statement'), r(true, 'not-statement')]).met).toBe(true);
  });
});

describe('extra quiz items', () => {
  const mk = (n: number, tag: string): Item => ({
    kind: 'choose', id: `i${n}`, stop: 9, lesson: 's9.l1', skill: 's9.x', prompt: `Question ${n}?`, explain: '.', choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], answer: 'a', tags: [tag],
  });
  const lesson: LessonDef = {
    id: 's9.l1',
    title: 'Test',
    ideas: [],
    practice: (rng) => [0, 1, 2].map((k) => mk(rng.int(0, 200), k === 2 ? 'trap' : 'plain')),
  };

  it('come from the same lesson, never repeat a shown item, and prefer a tag the rule still needs', () => {
    const shown = lesson.practice(createRng(4));
    const x = extraQuizItem(lesson, 4, shown, ['trap'], 0)!;
    expect(x.lesson).toBe('s9.l1');
    expect(x.tags).toEqual(['trap']);
    expect(shown.map(looks)).not.toContain(looks(x));
    expect(x.id).toBe('s9.l1-x0');
    // Same inputs, same item: a resumed lesson rebuilds the same extras.
    expect(extraQuizItem(lesson, 4, shown, ['trap'], 0)).toEqual(x);
  });

  it('never a fixed item (the same board every time), and extras start at a different place in the pack', () => {
    const fixedFirst: LessonDef = { ...lesson, practice: (rng) => lesson.practice(rng).map((it, i) => (i === 0 ? { ...it, fixed: true } : it)) };
    const got = [0, 1, 2, 3, 4, 5].map((k) => extraQuizItem(fixedFirst, 4, [], [], k)!);
    expect(got.every((x) => !x.fixed)).toBe(true);
    expect(new Set(got.map((x) => x.tags![0])).size).toBeGreaterThan(1);
  });

  it('never a scaffolded item (workFirst)', () => {
    const scaffolded: LessonDef = { ...lesson, practice: (rng) => lesson.practice(rng).map((it) => ({ ...it, workFirst: board })) };
    expect(extraQuizItem(scaffolded, 4, [], [], 0)).toBeNull();
  });
});

describe('lessons open in order', () => {
  const stop = STOPS.find((s) => s.n === 6)!;
  const [l1, l2, l3] = stop.lessons;

  it('the first lesson is always open; a later one waits for the one before (done, or its boards marked)', () => {
    expect(lessonWaitsFor(stop, l1.id, [], [])).toBeNull();
    expect(lessonWaitsFor(stop, l2.id, [], [])).toBe(l1);
    expect(lessonWaitsFor(stop, l2.id, [], [l1.id])).toBeNull();
    expect(lessonWaitsFor(stop, l2.id, [l1.id], [])).toBeNull();
    expect(lessonWaitsFor(stop, l3.id, [], [l1.id])).toBe(l2);
  });

  it('a lesson already done (an older save) stays open', () => {
    expect(lessonWaitsFor(stop, l3.id, [l3.id], [])).toBeNull();
  });
});
