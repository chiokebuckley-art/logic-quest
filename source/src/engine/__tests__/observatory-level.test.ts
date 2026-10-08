/** A place's quiz follows the learner's level on its track (from the diagnostic), and its saved plan agrees. */
import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { planKey, practiceFor } from '../drill';
import { newSave } from '../save/save';
import { setDiagnostic } from '../evidence';
import { stopById, STOPS } from '../../content/stops';
import { lessonLevel } from '../../game/observatory';

const places = STOPS.filter((s) => s.observatory).flatMap((s) => s.lessons.filter((l) => l.practiceAt).map((l) => [s, l] as const));

describe('quiz by level', () => {
  it('every graded place gives 3-5 items at each level, the same for the same seed', () => {
    expect(places.length).toBeGreaterThan(5);
    for (const [, l] of places) {
      for (const level of [1, 2, 3, 4] as const) {
        const a = practiceFor(l, createRng(7), level);
        const b = practiceFor(l, createRng(7), level);
        expect(a.length, `${l.id} L${level}`).toBeGreaterThanOrEqual(3);
        expect(a.length, `${l.id} L${level}`).toBeLessThanOrEqual(5);
        expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
      }
    }
  });

  it('without a level the default pack is used, and the plan key changes with the level only when the pack does', () => {
    for (const [, l] of places) {
      expect(practiceFor(l, createRng(3)).map((x) => x.id)).toEqual(l.practice(createRng(3)).map((x) => x.id));
      const k0 = planKey(l, 3);
      for (const level of [1, 2, 3, 4] as const) {
        const same = JSON.stringify(practiceFor(l, createRng(3), level).map((x) => [x.id, x.prompt])) === JSON.stringify(l.practice(createRng(3)).map((x) => [x.id, x.prompt]));
        expect(planKey(l, 3, level) === k0, `${l.id} L${level}`).toBe(same);
      }
    }
  });

  it('lessonLevel: undefined before a diagnostic, the track level after, clamped to the lesson range', () => {
    const stop = stopById('s14')!;
    const lesson = stop.lessons[0];
    const save = newSave();
    expect(lessonLevel(stop, lesson, save)).toBeUndefined();
    save.evidence = setDiagnostic(save.evidence, { day: '2026-10-08', levels: { '1': 3, '2': 1, '3': 2, '4': 2 }, shown: [] });
    const got = lessonLevel(stop, lesson, save)!;
    const [lo, hi] = lesson.levels ?? [1, 4];
    expect(got).toBe(Math.max(lo, Math.min(hi, 3)));
    // Clock Tower sits in Ring 2 but is a Track 1 place: it takes Track 1's level.
    const s15 = stopById('s15')!;
    const clock = s15.lessons.find((l) => l.track === 1);
    if (clock) expect(lessonLevel(s15, clock, save)).toBe(Math.max(...[clock.levels?.[0] ?? 1]) <= 3 ? Math.min(clock.levels?.[1] ?? 4, 3) : clock.levels![0]);
    // A main-path lesson never has a level.
    const s1 = stopById('s1')!;
    expect(lessonLevel(s1, s1.lessons[0], save)).toBeUndefined();
  });
});
