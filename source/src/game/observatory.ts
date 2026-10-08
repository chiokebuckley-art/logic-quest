/** Small helpers for the Pattern Observatory screens: names (kid or plain), credit for opening places, due work. */
import { placeWaitsFor, type PlaceCredit } from '../engine/drill';
import { profileOf, type Evidence, type Level, type Profile } from '../engine/evidence';
import type { LessonDef, StopDef } from '../engine/types';
import type { SaveData } from '../engine/save/save';
import { OBSERVATORY, STOPS } from '../content/stops';

export { OBSERVATORY };

/** A place's name: its kid title, or its plain label for grown-ups. */
export const placeTitle = (lesson: LessonDef, plain: boolean): string => (plain && lesson.plain ? lesson.plain : lesson.title);
/** A ring's name: its kid title, or its plain label. */
export const ringTitle = (stop: StopDef, plain: boolean): string => (plain && stop.observatory ? stop.observatory.plain : stop.title);

/**
 * The level an Observatory place plays at: the diagnostic's level for the lesson's track (its ring's track unless the
 * lesson names one), kept inside the lesson's own range. Undefined until a diagnostic was taken, or for any other lesson.
 */
export function lessonLevel(stop: StopDef | undefined, lesson: LessonDef | undefined, save: SaveData | null): Level | undefined {
  if (!stop || !lesson || !save || !lesson.routine) return undefined;
  const track = lesson.track ?? stop.observatory?.track;
  if (!track) return undefined;
  const got = save.evidence.diagnostic?.levels[String(track)];
  if (!got) return undefined;
  const [lo, hi] = lesson.levels ?? [1, 4];
  return Math.max(lo, Math.min(hi, got)) as Level;
}

/** What counts toward opening a place: lessons done anywhere, the diagnostic's credit, primers passed. */
export function placeCredit(save: SaveData): PlaceCredit {
  return {
    done: STOPS.flatMap((s) => save.stops[s.id]?.lessonsDone ?? []),
    shown: save.evidence.diagnostic?.shown ?? [],
    primers: save.evidence.primers,
  };
}

/** The required lessons a place still waits for, with their titles, or [] when it is open. */
export function placeNeeds(lesson: LessonDef, save: SaveData): { id: string; title: string }[] {
  return placeWaitsFor(lesson, placeCredit(save)).map((id) => ({ id, title: lessonById(id)?.title ?? id }));
}

export function lessonById(id: string): LessonDef | undefined {
  for (const s of STOPS) for (const l of s.lessons) if (l.id === id) return l;
  return undefined;
}

export function stopOfLesson(id: string): StopDef | undefined {
  return STOPS.find((s) => s.lessons.some((l) => l.id === id));
}

/** Every Observatory place with a check open today: an independent check or a delayed review. */
export function dueEvidence(save: SaveData, today: string): { stop: StopDef; lesson: LessonDef; profile: Profile; kind: 'independent' | 'review' }[] {
  const out: { stop: StopDef; lesson: LessonDef; profile: Profile; kind: 'independent' | 'review' }[] = [];
  for (const stop of OBSERVATORY) {
    for (const lesson of stop.lessons) {
      const profile = profileOf(save.evidence, lesson.id, today);
      if (profile.reviewDue) out.push({ stop, lesson, profile, kind: 'review' });
      else if (profile.independentDue) out.push({ stop, lesson, profile, kind: 'independent' });
    }
  }
  return out;
}

/** A one-line summary of a place's profile for a list row: "Practiced · complete · independent". */
export function profileWords(p: Profile): string {
  const parts: string[] = [];
  if (p.practiced) parts.push('practiced');
  if (p.complete) parts.push('complete');
  if (p.independent) parts.push('independent');
  if (p.transferred) parts.push('transferred');
  if (p.retained) parts.push(`retained ${p.retained} of 3`);
  return parts.length ? parts.join(' · ') : 'not started';
}

export const evidenceOf = (save: SaveData): Evidence => save.evidence;
