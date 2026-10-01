/**
 * The Wrong-Answer Notebook (Engineering Quest's model, WORDRAIDERS' "repair quests"). A miss (a wrong check
 * answer, a timeout, or a lesson or practice item not passed on its own after the explanation) adds a card for
 * that skill. The card comes back as a FRESH question on the same skill: right away, then three days after the
 * first fix, then a week after the second. Three clean fixes clear it; a miss while fixing starts it over from
 * tomorrow.
 */
import { addDays } from './journey/mastery';
import { createRng } from './rng';
import type { Item, StopDef } from './types';

export interface NoteCard {
  skill: string;
  stop: number;
  lesson: string;
  /** Journey day of the latest miss. */
  missed: string;
  /** Clean fixes since the latest miss (0-2; the third clears the card). */
  fixes: number;
  /** First Journey day the next fix can be done. */
  due: string;
}

/** skill -> card. One card per skill: a new miss on the same skill restarts that card. */
export type Notebook = Record<string, NoteCard>;

/** Days after a miss (0) or after fix 1 (3) or fix 2 (7) before the next fix opens. */
export const FIX_GAPS = [0, 3, 7] as const;
export const FIXES_TO_CLEAR = 3;

export function addMiss(nb: Notebook, miss: { skill: string; stop: number; lesson: string }, day: string): Notebook {
  return { ...nb, [miss.skill]: { skill: miss.skill, stop: miss.stop, lesson: miss.lesson, missed: day, fixes: 0, due: addDays(day, FIX_GAPS[0]) } };
}

/** Record one fix attempt. Returns the new notebook and whether the card was cleared. */
export function recordFix(nb: Notebook, skill: string, correct: boolean, day: string): { notebook: Notebook; cleared: boolean } {
  const card = nb[skill];
  if (!card) return { notebook: nb, cleared: false };
  if (!correct) return { notebook: { ...nb, [skill]: { ...card, missed: day, fixes: 0, due: addDays(day, 1) } }, cleared: false };
  const fixes = card.fixes + 1;
  if (fixes >= FIXES_TO_CLEAR) {
    const rest = { ...nb };
    delete rest[skill];
    return { notebook: rest, cleared: true };
  }
  return { notebook: { ...nb, [skill]: { ...card, fixes, due: addDays(day, FIX_GAPS[fixes]) } }, cleared: false };
}

/** Cards that can be fixed today, oldest miss first. */
export function dueCards(nb: Notebook, day: string): NoteCard[] {
  return Object.values(nb)
    .filter((c) => c.due <= day)
    .sort((a, b) => (a.missed === b.missed ? a.skill.localeCompare(b.skill) : a.missed < b.missed ? -1 : 1));
}

/** Can this version ask a question for the card? False for a card from a newer version whose stop is not ready. */
export function canFix(card: NoteCard, stops: readonly StopDef[]): boolean {
  const stop = stops.find((s) => s.n === card.stop);
  return !!stop && stop.ready && stop.lessons.length > 0;
}

/** Due cards this version can ask about (see canFix), oldest miss first. */
export function fixableCards(nb: Notebook, day: string, stops: readonly StopDef[]): NoteCard[] {
  return dueCards(nb, day).filter((c) => canFix(c, stops));
}

/**
 * A fresh question on the card's skill: drawn from that lesson's practice sets (trying new seeds until the
 * skill matches), else any item from that lesson, else any item from the stop.
 */
export function freshItem(stop: StopDef, card: NoteCard, seed: number): Item | null {
  const lesson = stop.lessons.find((l) => l.id === card.lesson);
  let fallback: Item | null = null;
  if (lesson) {
    for (let i = 0; i < 60; i++) {
      const items = lesson.practice(createRng(seed + i * 7919));
      const hit = items.find((it) => it.skill === card.skill);
      if (hit) return hit;
      fallback ??= items[0] ?? null;
    }
  }
  if (fallback) return fallback;
  if (stop.practice) {
    for (let i = 0; i < 60; i++) {
      const it = stop.practice(createRng(seed + i * 104729));
      if (it.skill === card.skill) return it;
      fallback ??= it;
    }
  }
  return fallback;
}
