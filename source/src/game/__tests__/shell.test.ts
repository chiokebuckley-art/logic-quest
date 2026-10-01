import { describe, expect, it } from 'vitest';
import { recordCheck, completeLesson, viewAll, type StopProgress } from '../../engine/journey/mastery';
import type { StopDef } from '../../engine/types';
import { createRng } from '../../engine/rng';
import { STOPS as GAME_STOPS } from '../../content/stops';
import {
  dayRange, fileSlug, firstTryWinsThisWeek, frontierStop, goalPercent, minutesByDay, minutesOn, needsPractice, pathDot,
  helpTotals, percent, readyLabel, shortDay, SKILL_NAMES, skillLabel, skillName, skillRows, stopCounts, streakDays, strongSkills, totalMinutes, totals,
} from '../progressStats';

describe('streakDays', () => {
  it('is 0 with no play', () => {
    expect(streakDays({}, '2026-09-30')).toBe(0);
  });
  it('counts today once it reaches 60 s', () => {
    expect(streakDays({ '2026-09-30': 59 }, '2026-09-30')).toBe(0);
    expect(streakDays({ '2026-09-30': 60 }, '2026-09-30')).toBe(1);
  });
  it('keeps yesterday’s streak while today is still under 60 s', () => {
    const active = { '2026-09-28': 300, '2026-09-29': 60, '2026-09-30': 20 };
    expect(streakDays(active, '2026-09-30')).toBe(2);
  });
  it('adds today on top of the chain', () => {
    const active = { '2026-09-28': 300, '2026-09-29': 60, '2026-09-30': 61 };
    expect(streakDays(active, '2026-09-30')).toBe(3);
  });
  it('stops at a gap or a short day', () => {
    expect(streakDays({ '2026-09-27': 900, '2026-09-29': 900, '2026-09-30': 900 }, '2026-09-30')).toBe(2);
    expect(streakDays({ '2026-09-28': 900, '2026-09-29': 30, '2026-09-30': 900 }, '2026-09-30')).toBe(1);
  });
  it('is 0 when the last play was two days ago', () => {
    expect(streakDays({ '2026-09-28': 900 }, '2026-09-30')).toBe(0);
  });
  it('crosses month and year boundaries', () => {
    expect(streakDays({ '2026-09-30': 90, '2026-10-01': 90 }, '2026-10-01')).toBe(2);
    expect(streakDays({ '2025-12-31': 90, '2026-01-01': 90 }, '2026-01-01')).toBe(2);
  });
});

describe('minutes', () => {
  it('floors seconds to whole minutes', () => {
    expect(minutesOn({ '2026-09-30': 119 }, '2026-09-30')).toBe(1);
    expect(minutesOn({}, '2026-09-30')).toBe(0);
  });
  it('fills the 30-minute goal bar and clamps it', () => {
    expect(goalPercent(0)).toBe(0);
    expect(goalPercent(900)).toBe(50);
    expect(goalPercent(1800)).toBe(100);
    expect(goalPercent(5000)).toBe(100);
    expect(goalPercent(-5)).toBe(0);
  });
  it('lists the last n days oldest first, across a month end', () => {
    expect(dayRange('2026-10-02', 4)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(dayRange('2026-10-02', 7)).toHaveLength(7);
  });
  it('zero-fills minutes per day', () => {
    const rows = minutesByDay({ '2026-09-29': 600, '2026-09-20': 6000 }, '2026-09-30', 3);
    expect(rows).toEqual([
      { day: '2026-09-28', minutes: 0 },
      { day: '2026-09-29', minutes: 10 },
      { day: '2026-09-30', minutes: 0 },
    ]);
  });
  it('sums seconds before flooring the total', () => {
    expect(totalMinutes({ '2026-09-29': 30, '2026-09-30': 30 }, '2026-09-30', 7)).toBe(1);
    expect(totalMinutes({ '2026-09-01': 6000 }, '2026-09-30', 7)).toBe(0);
    expect(totalMinutes({ '2026-09-01': 6000 }, '2026-09-30', 30)).toBe(100);
  });
});

describe('skills', () => {
  const stats = {
    '2026-09-30': { 's1.tf': [4, 4] as [number, number], 's2.or-both': [3, 1] as [number, number] },
    '2026-09-25': { 's2.or-both': [4, 2] as [number, number], 's3.chain': [5, 3] as [number, number] },
    '2026-09-23': { 's1.tf': [10, 0] as [number, number] }, // 7 days before today: outside a 7-day window
  };

  it('sums tallies inside the window only, sorted by skill', () => {
    expect(skillRows(stats, '2026-09-30', 7)).toEqual([
      { skill: 's1.tf', answered: 4, firstTry: 4, rate: 1 },
      { skill: 's2.or-both', answered: 7, firstTry: 3, rate: 3 / 7 },
      { skill: 's3.chain', answered: 5, firstTry: 3, rate: 0.6 },
    ]);
    expect(skillRows(stats, '2026-09-30', 14).find((r) => r.skill === 's1.tf')).toEqual({ skill: 's1.tf', answered: 14, firstTry: 4, rate: 4 / 14 });
  });

  it('first-try wins this week covers today and the six days before', () => {
    expect(firstTryWinsThisWeek(stats, '2026-09-30')).toBe(4 + 1 + 2 + 3);
    expect(firstTryWinsThisWeek({ '2026-09-24': { a: [1, 1] } }, '2026-09-30')).toBe(1);
    expect(firstTryWinsThisWeek({ '2026-09-23': { a: [1, 1] } }, '2026-09-30')).toBe(0);
    expect(totals(stats, '2026-09-30', 7)).toEqual({ answered: 16, firstTry: 10 });
  });

  it('needs practice: at least 5 answers and under 70%, weakest first', () => {
    const rows = [
      { skill: 'a', answered: 4, firstTry: 0, rate: 0 }, // too few answers
      { skill: 'b', answered: 5, firstTry: 3, rate: 0.6 },
      { skill: 'c', answered: 10, firstTry: 7, rate: 0.7 }, // exactly 70%: not below
      { skill: 'd', answered: 9, firstTry: 2, rate: 2 / 9 },
      { skill: 'e', answered: 20, firstTry: 20, rate: 1 },
    ];
    expect(needsPractice(rows).map((r) => r.skill)).toEqual(['d', 'b']);
  });

  it('strong: at least 5 answers and 80% or more, strongest first', () => {
    const rows = [
      { skill: 'a', answered: 4, firstTry: 4, rate: 1 }, // too few answers
      { skill: 'b', answered: 5, firstTry: 4, rate: 0.8 }, // exactly 80%: strong
      { skill: 'c', answered: 10, firstTry: 7, rate: 0.7 },
      { skill: 'd', answered: 20, firstTry: 19, rate: 0.95 },
    ];
    expect(strongSkills(rows).map((r) => r.skill)).toEqual(['d', 'b']);
  });

  it('a skill is never both strong and needing practice', () => {
    const rows = skillRows(stats, '2026-09-30', 30);
    const weak = new Set(needsPractice(rows).map((r) => r.skill));
    for (const r of strongSkills(rows)) expect(weak.has(r.skill)).toBe(false);
  });

  it('percent is null when nothing was answered', () => {
    expect(percent(0, 0)).toBeNull();
    expect(percent(2, 3)).toBe(67);
  });

  it('labels skills for grown-ups', () => {
    expect(skillLabel('s2.or-both')).toBe('Stop 2 · OR includes both');
    expect(skillLabel('s12.base_rate')).toBe('Stop 12 · base rate');
    expect(skillLabel('s1.l2.cant-tell')).toBe('Stop 1 · cant tell');
    expect(skillLabel('mystery')).toBe('mystery');
  });

  it('names a skill without its stop, for the notebook', () => {
    expect(skillName('s2.or-both')).toBe('OR includes both');
    expect(skillName('s12.base_rate')).toBe('base rate');
    expect(skillName('mystery')).toBe('mystery');
  });

  it('says when a notebook card is ready', () => {
    expect(readyLabel('2026-09-30', '2026-09-30')).toBe('Ready now');
    expect(readyLabel('2026-09-28', '2026-09-30')).toBe('Ready now');
    expect(readyLabel('2026-10-01', '2026-09-30')).toBe('Ready tomorrow');
    expect(readyLabel('2026-10-03', '2026-09-30')).toBe('Ready in 3 days');
  });
});

// ---------- stops ----------

const lesson = (id: string) => ({ id, title: id, ideas: [], practice: () => [] });
const fakeStop = (n: number, ready = true): StopDef => ({
  n, id: `s${n}`, title: `Stop ${n}`, idea: '', ready, lessons: ready ? [lesson(`s${n}.l1`), lesson(`s${n}.l2`)] : [],
});
const STOPS = [fakeStop(1), fakeStop(2), fakeStop(3), fakeStop(4, false)];
const all = (stop: StopDef, ok: boolean) => stop.lessons.map((l) => ({ lesson: l.id, correct: ok }));

function learnAll(p: StopProgress | undefined, stop: StopDef): StopProgress {
  return stop.lessons.reduce((acc, l) => completeLesson(acc, l.id), p ?? { lessonsDone: [], attempts: 0 });
}

describe('stop counts and the path strip', () => {
  const s1 = recordCheck(STOPS[0], learnAll(undefined, STOPS[0]), 'pass', all(STOPS[0], true), '2026-09-20').progress;
  const s1Locked = recordCheck(STOPS[0], s1, 'lockin', all(STOPS[0], true), '2026-09-21').progress;
  const s2 = recordCheck(STOPS[1], learnAll(undefined, STOPS[1]), 'pass', all(STOPS[1], true), '2026-09-29').progress;
  const progress: Record<string, StopProgress> = { s1: s1Locked, s2, s3: completeLesson(undefined, 's3.l1') };

  it('counts passed, locked in and mastered', () => {
    expect(stopCounts(progress)).toEqual({ passed: 2, lockedIn: 1, mastered: 0 });
    expect(stopCounts({})).toEqual({ passed: 0, lockedIn: 0, mastered: 0 });
  });

  it('maps every stop status to a dot', () => {
    const dots = viewAll(STOPS, progress, '2026-09-30').map(({ view }) => pathDot(view.status));
    expect(dots).toEqual(['gold', 'passed', 'current', 'soon']);
    expect(viewAll(STOPS, {}, '2026-09-30').map(({ view }) => pathDot(view.status))).toEqual(['current', 'locked', 'locked', 'soon']);
  });

  it('a not-yet stop still shows as the current one', () => {
    const miss = recordCheck(STOPS[0], learnAll(undefined, STOPS[0]), 'pass', all(STOPS[0], false), '2026-09-30').progress;
    expect(pathDot(viewAll(STOPS, { s1: miss }, '2026-09-30')[0].view.status)).toBe('current');
  });

  it('player cards show one past the run of passed stops', () => {
    const ids = STOPS.map((s) => s.id);
    expect(frontierStop(ids, {})).toBe(1);
    expect(frontierStop(ids, progress)).toBe(3);
    expect(frontierStop(ids, { s2 })).toBe(1); // stop 1 not passed yet
    const every = Object.fromEntries(ids.map((id) => [id, { lessonsDone: [], attempts: 1, passDay: '2026-09-01' }]));
    expect(frontierStop(ids, every)).toBe(4);
  });
});

describe('small formatters', () => {
  it('short day labels', () => {
    expect(shortDay('2026-09-30')).toBe('Sep 30');
    expect(shortDay('2027-01-02')).toBe('Jan 2');
  });
  it('file names from player names', () => {
    expect(fileSlug('Sam Lee')).toBe('sam-lee');
    expect(fileSlug('  Zoë!! ')).toBe('zo');
    expect(fileSlug('***')).toBe('player');
  });
});

describe('skill names', () => {
  it('every skill a ready stop can ask about has a plain name (the notebook shows them to players)', () => {
    const skills = new Set<string>();
    for (const stop of GAME_STOPS.filter((s) => s.ready)) {
      for (let seed = 1; seed <= 40; seed++) {
        for (const l of stop.lessons) for (const it of l.practice(createRng(seed))) skills.add(it.skill);
        for (const it of stop.check?.(createRng(seed)) ?? []) skills.add(it.skill);
        if (stop.practice) skills.add(stop.practice(createRng(seed)).skill);
      }
    }
    const missing = [...skills].filter((s) => !(s in SKILL_NAMES)).sort();
    expect(missing).toEqual([]);
  });
});

describe('help after a miss', () => {
  it('adds up the help tallies over the chosen days only', () => {
    const help = { '2026-09-30': { 's1.not-more': [1, 1, 2, 1, 0] }, '2026-09-20': { 's1.not-more': [5, 5, 5, 5, 5] } };
    expect(helpTotals(help, '2026-09-30', 7)).toEqual({ explained: 1, retried: 1, fresh: 2, freshPassed: 1, simpler: 0 });
    expect(helpTotals(help, '2026-09-30', 30).explained).toBe(6);
    expect(helpTotals(undefined, '2026-09-30', 7).explained).toBe(0);
  });
});
