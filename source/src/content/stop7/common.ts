/**
 * Shared pieces for Stop 7 (Ways to Think). Each lesson lives in its own module next to this file and exports the
 * same four things (see LessonModule), so stop7.ts can put the stop together: the lessons, a two-item share of the
 * stop check, an Arcade item and new examples after a miss.
 */
import type { Made } from '../../engine/puzzles/statements';
import type { ChooseItem, Item, LessonDef, Rng } from '../../engine/types';

export type { Made };

export const STOP = 7;

/** A made item as a Stop 7 item: its id, lesson and skill (`s7.<tag>`). */
export const finish = (m: Made, id: string, lesson: string): ChooseItem => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item });

/** A lesson's practice: the made items in order, with ids `<lesson>-p1`, `<lesson>-p2`, … */
export const practiceOf = (lesson: string, make: (rng: Rng) => Made[]) => (rng: Rng): Item[] =>
  make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));

/**
 * Makes the items of one set. No two items in a set share a prompt and scene: a repeat is thrown away and made
 * again from the same rng, so the same seed still gives the same set.
 */
export function distinctItems(): (make: () => Made) => Made {
  const seen = new Set<string>();
  const key = (m: Made) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

/** The tag every lesson's “can this way of thinking fail?” question carries (LessonDef.pass include). */
export const CAN_FAIL = { tag: 'can-fail', label: 'a question about when this way of thinking can fail' } as const;

/** What every Stop 7 lesson module exports. */
export interface LessonModule {
  lesson: LessonDef;
  /** Exactly two items for the stop check, different from each other. At least one is a conflict item. */
  checkItems(rng: Rng): Made[];
  /** One item for the Arcade. */
  arcadeItem(rng: Rng): Made;
  /** New examples after a miss in this lesson; [] uses the default (one item with the same skill). */
  freshItems(missed: Item, rng: Rng): Made[];
}
