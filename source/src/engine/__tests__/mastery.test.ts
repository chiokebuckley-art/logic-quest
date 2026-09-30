import { describe, expect, it } from 'vitest';
import { addDays, completeLesson, daysBetween, journeyDay, nextStep, recordCheck, recordLeft, seedFor, viewStop, weekDue } from '../journey/mastery';
import type { StopDef } from '../types';

const stop = (n: number, lessons = 2): StopDef => ({
  n, id: `s${n}`, title: `Stop ${n}`, idea: '', ready: true,
  lessons: Array.from({ length: lessons }, (_, i) => ({ id: `s${n}.l${i + 1}`, title: `L${i + 1}`, ideas: [], practice: () => [] })),
});
const S1 = stop(1), S2 = stop(2);
const all = (s: StopDef) => s.lessons.reduce((p, l) => completeLesson(p, l.id), undefined as ReturnType<typeof completeLesson> | undefined)!;

describe('days', () => {
  it('rolls over at 3 am local time', () => {
    const t = new Date(2026, 8, 30, 2, 59).getTime();
    expect(journeyDay(t)).toBe('2026-09-29');
    expect(journeyDay(new Date(2026, 8, 30, 3, 0).getTime())).toBe('2026-09-30');
  });
  it('adds and counts days across months', () => {
    expect(addDays('2026-09-28', 7)).toBe('2026-10-05');
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7);
  });
});

describe('journey rules', () => {
  const today = '2026-09-30';
  it('locks a stop until the previous one is passed, and shows unbuilt stops as soon', () => {
    expect(viewStop(S2, undefined, false, today).status).toBe('locked');
    expect(viewStop({ ...S2, ready: false }, undefined, true, today).status).toBe('soon');
  });
  it('teaches first: the check opens only when every lesson is done', () => {
    const one = completeLesson(undefined, 's1.l1');
    expect(viewStop(S1, one, true, today)).toMatchObject({ status: 'learning', due: null, nextLesson: 's1.l2' });
    expect(viewStop(S1, all(S1), true, today)).toMatchObject({ status: 'ready', due: 'pass' });
  });
  it('passes only at 100%', () => {
    const out = recordCheck(S1, all(S1), 'pass', [{ lesson: 's1.l1', correct: true }, { lesson: 's1.l2', correct: false }], today);
    expect(out.passed).toBe(false);
    expect(out.missed).toEqual(['s1.l2']);
    expect(out.progress.passDay).toBeUndefined();
  });
  it('a not-yet asks for the missed lesson again before a retry', () => {
    const miss = recordCheck(S1, all(S1), 'pass', [{ lesson: 's1.l2', correct: false }], today).progress;
    expect(viewStop(S1, miss, true, today)).toMatchObject({ status: 'notYet', due: null, nextLesson: 's1.l2' });
    const redone = completeLesson(miss, 's1.l2');
    expect(viewStop(S1, redone, true, today)).toMatchObject({ status: 'notYet', due: 'pass' });
  });
  it('two not-yets in one day rest the stop until tomorrow', () => {
    let p = all(S1);
    for (let i = 0; i < 2; i++) p = completeLesson(recordCheck(S1, p, 'pass', [{ lesson: 's1.l1', correct: false }], today).progress, 's1.l1');
    expect(viewStop(S1, p, true, today).status).toBe('resting');
    expect(viewStop(S1, p, true, addDays(today, 1))).toMatchObject({ status: 'notYet', due: 'pass' });
  });
  it('pass, then lock-in on a later day, then the week check', () => {
    const ok = [{ lesson: 's1.l1', correct: true }, { lesson: 's1.l2', correct: true }];
    let p = recordCheck(S1, all(S1), 'pass', ok, today).progress;
    expect(viewStop(S1, p, true, today)).toMatchObject({ status: 'passed', due: null });
    expect(viewStop(S2, undefined, !!p.passDay, today).status).toBe('learning');
    const d1 = addDays(today, 1);
    expect(viewStop(S1, p, true, d1)).toMatchObject({ status: 'passed', due: 'lockin' });
    p = recordCheck(S1, p, 'lockin', ok, d1).progress;
    expect(weekDue(p)).toBe(addDays(today, 7));
    expect(viewStop(S1, p, true, addDays(today, 6)).due).toBeNull();
    expect(viewStop(S1, p, true, addDays(today, 7)).due).toBe('week');
    p = recordCheck(S1, p, 'week', ok, addDays(today, 7)).progress;
    expect(viewStop(S1, p, true, addDays(today, 7)).status).toBe('mastered');
  });
  it('the next step puts a due lock-in check before new lessons', () => {
    const ok = [{ lesson: 's1.l1', correct: true }];
    const p1 = recordCheck(S1, all(S1), 'pass', ok, today).progress;
    const next = nextStep([S1, S2], { s1: p1 }, addDays(today, 1));
    expect(next).toMatchObject({ stopId: 's1', action: 'check', kind: 'lockin' });
    expect(nextStep([S1, S2], { s1: p1 }, today)).toMatchObject({ stopId: 's2', action: 'lesson', lessonId: 's2.l1' });
  });
  it('seeds are stable and differ by attempt', () => {
    expect(seedFor('p1', 's1', 'pass', 1)).toBe(seedFor('p1', 's1', 'pass', 1));
    expect(seedFor('p1', 's1', 'pass', 1)).not.toBe(seedFor('p1', 's1', 'pass', 2));
  });
});

describe('review fixes', () => {
  const today = '2026-09-30';
  const ok = [{ lesson: 's1.l1', correct: true }, { lesson: 's1.l2', correct: true }];
  it('a resting stop does not hide open lessons on a later stop', () => {
    let p1 = recordCheck(S1, all(S1), 'pass', ok, today).progress;
    const d2 = addDays(today, 1);
    for (let i = 0; i < 2; i++) p1 = recordCheck(S1, p1, 'lockin', [{ lesson: 's1.l1', correct: false }], d2).progress;
    expect(viewStop(S1, p1, true, d2).status).toBe('resting');
    expect(nextStep([S1, S2], { s1: p1 }, d2)).toMatchObject({ stopId: 's2', action: 'lesson' });
  });
  it('an unknown lesson id in a not-yet never blocks the retry', () => {
    const p = { ...all(S1), notYet: { kind: 'pass' as const, day: today, missed: ['s1.old'], redone: [] } };
    expect(viewStop(S1, p, true, today)).toMatchObject({ status: 'notYet', due: 'pass' });
  });
  it('rolls over at 3 am local time on daylight-saving days too', () => {
    const d = new Date(2026, 2, 8, 3, 30); // may be a DST day in the test machine's zone
    expect(journeyDay(d.getTime())).toBe('2026-03-08');
    expect(journeyDay(new Date(2026, 10, 1, 2, 30).getTime())).toBe('2026-10-31');
  });
});

describe('leaving a check early', () => {
  const today = '2026-09-30';
  it('costs nothing before the first answer', () => {
    expect(recordLeft(S1, all(S1), 'pass', [], today)).toEqual(all(S1));
  });
  it('counts as a try after an answer, so leaving cannot be used to draw new questions forever', () => {
    let p = recordLeft(S1, all(S1), 'pass', [{ lesson: 's1.l2', correct: false }], today);
    expect(p.attempts).toBe(1);
    expect(viewStop(S1, p, true, today)).toMatchObject({ status: 'notYet', nextLesson: 's1.l2' });
    p = completeLesson(p, 's1.l2');
    p = recordLeft(S1, p, 'pass', [{ lesson: 's1.l1', correct: true }], today);
    expect(viewStop(S1, p, true, today).status).toBe('resting');
  });
});

describe('a check left open by a reload or a closed app', () => {
  it('settles like pressing Leave, and clears the marker', async () => {
    const { settleOpenCheck } = await import('../journey/mastery');
    const today = '2026-09-30';
    const open = { ...all(S1), openCheck: { kind: 'pass' as const, day: today, answered: [{ lesson: 's1.l1', correct: false }] } };
    const p = settleOpenCheck(S1, open, today);
    expect(p.openCheck).toBeUndefined();
    expect(p.attempts).toBe(1);
    expect(viewStop(S1, p, true, today)).toMatchObject({ status: 'notYet', nextLesson: 's1.l1' });
    const none = settleOpenCheck(S1, { ...all(S1), openCheck: { kind: 'pass' as const, day: today, answered: [] } }, today);
    expect(none).toEqual(all(S1));
  });
});

