/**
 * The glossary (the Library's Words tab): the words each lesson names for the first time (LessonDef.terms). A word
 * is collected once its lesson is done, in any stop, and listed by stop in Journey order.
 */
import type { GlossaryTerm, StopDef } from '../engine/types';
import type { SaveData } from '../engine/save/save';
import { STOPS } from '../content/stops';

/** One glossary word with the lesson that introduces it. */
export interface GlossaryEntry extends GlossaryTerm {
  stop: StopDef;
  lessonId: string;
  /** The lesson's place in its stop, from 1. */
  lessonNumber: number;
  lessonTitle: string;
}

/** Every word in the game, collected or not, in Journey order (stop, then lesson, then as the lesson lists them). */
export function allTerms(): GlossaryEntry[] {
  return STOPS.flatMap((stop) =>
    stop.lessons.flatMap((lesson, k) =>
      (lesson.terms ?? []).map((t) => ({ ...t, stop, lessonId: lesson.id, lessonNumber: k + 1, lessonTitle: lesson.title })),
    ),
  );
}

/** The lesson ids done anywhere in this save. */
function doneLessons(save: SaveData): Set<string> {
  return new Set(Object.values(save.stops).flatMap((p) => p?.lessonsDone ?? []));
}

/** The collected words: those whose lesson is done, grouped by stop in Journey order. Stops with none are left out. */
export function glossaryEntries(save: SaveData): { stop: StopDef; terms: GlossaryEntry[] }[] {
  const done = doneLessons(save);
  const out: { stop: StopDef; terms: GlossaryEntry[] }[] = [];
  for (const e of allTerms()) {
    if (!done.has(e.lessonId)) continue;
    const last = out[out.length - 1];
    if (last && last.stop.id === e.stop.id) last.terms.push(e);
    else out.push({ stop: e.stop, terms: [e] });
  }
  return out;
}

/** How many words this save has collected. */
export function collectedCount(save: SaveData): number {
  return glossaryEntries(save).reduce((n, g) => n + g.terms.length, 0);
}
