import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { addDays } from '../journey/mastery';
import { addMiss, canFix, dueCards, fixableCards, freshItem, recordFix } from '../notebook';
import { createRng } from '../rng';

const miss = { skill: 's2.or-both', stop: 2, lesson: 's2.l3' };

describe('the Wrong-Answer Notebook', () => {
  const day = '2026-09-30';
  it('a miss can be fixed right away, then after 3 days, then after a week, and 3 clean fixes clear it', () => {
    let nb = addMiss({}, miss, day);
    expect(dueCards(nb, day).map((c) => c.skill)).toEqual(['s2.or-both']);
    let r = recordFix(nb, miss.skill, true, day);
    nb = r.notebook;
    expect(dueCards(nb, addDays(day, 2))).toEqual([]);
    expect(dueCards(nb, addDays(day, 3))).toHaveLength(1);
    r = recordFix(nb, miss.skill, true, addDays(day, 3));
    nb = r.notebook;
    expect(dueCards(nb, addDays(day, 9))).toEqual([]);
    expect(dueCards(nb, addDays(day, 10))).toHaveLength(1);
    r = recordFix(nb, miss.skill, true, addDays(day, 10));
    expect(r.cleared).toBe(true);
    expect(r.notebook).toEqual({});
  });
  it('a miss while fixing starts the card over from tomorrow', () => {
    let nb = recordFix(addMiss({}, miss, day), miss.skill, true, day).notebook;
    nb = recordFix(nb, miss.skill, false, addDays(day, 3)).notebook;
    expect(nb[miss.skill]).toMatchObject({ fixes: 0, due: addDays(day, 4) });
  });
  it('lists due cards oldest first', () => {
    let nb = addMiss({}, { skill: 's1.cant-tell', stop: 1, lesson: 's1.l2' }, '2026-09-29');
    nb = addMiss(nb, miss, day);
    expect(dueCards(nb, day).map((c) => c.skill)).toEqual(['s1.cant-tell', 's2.or-both']);
  });
  it('finds a fresh question on the same skill for every skill the built stops use', () => {
    for (const stop of STOPS.filter((s) => s.ready)) {
      const skills = new Set<string>();
      for (const l of stop.lessons) for (let seed = 1; seed <= 30; seed++) for (const it of l.practice(createRng(seed))) skills.add(`${l.id}|${it.skill}`);
      for (const key of skills) {
        const [lesson, skill] = key.split('|');
        const item = freshItem(stop, { skill, stop: stop.n, lesson, missed: day, fixes: 0, due: day }, 11);
        expect(item?.skill, `${stop.id} ${skill}`).toBe(skill);
      }
    }
  });
});

describe('cards this version cannot ask about', () => {
  it('a due card for a stop that is not ready is not counted as fixable', () => {
    const day = '2026-09-30';
    let nb = addMiss({}, { skill: 's1.cant-tell', stop: 1, lesson: 's1.l1' }, day);
    nb = addMiss(nb, { skill: 's7.some', stop: 7, lesson: 's7.l1' }, day);
    expect(dueCards(nb, day)).toHaveLength(2);
    expect(fixableCards(nb, day, STOPS).map((c) => c.skill)).toEqual(['s1.cant-tell']);
    expect(canFix(nb['s7.some'], STOPS)).toBe(false);
  });
});

