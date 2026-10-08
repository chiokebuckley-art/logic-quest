/**
 * The evidence profile of the Pattern Observatory (docs/OBSERVATORY.md). Three clean answers only complete a lesson;
 * the profile adds what else the learner has shown, per place:
 *
 *   Practiced        worked and faded examples, hinted answers: any answer at all
 *   Lesson complete  the pass rule (3 clean first tries including the trap), the gate the Journey already uses
 *   Independent      a fresh 6-item check: 5 of 6 right, no hints, with a reasoning item
 *   Transferred      2 or more unfamiliar contexts right on the first try (a new colour alone is not transfer)
 *   Retained         a fresh 4-item delayed check, 3 of 4, at about 2 days, then 1 week, then 3 to 4 weeks
 *
 * Help is not grading: a repair of the same item is logged as supported, a fresh twin as independent, and a first try,
 * once recorded, is never overwritten. The counts and days below are product rules to pilot, not research cutoffs.
 *
 * It all lives under one top-level save key, `evidence`, so an older copy of the app carries it through untouched.
 */
import { addDays } from './journey/mastery';
import type { ErrorTag, Phase } from './types';

/** The thresholds, in one place. Pilot them before claiming anything about outcomes. */
export const EVIDENCE = {
  /** The independent check: items, and how many must be right (no hints). */
  independent: { items: 6, need: 5 },
  /** Transferred: unfamiliar contexts right on the first try. */
  transfers: 2,
  /** The delayed review: items and how many must be right; the days after completion each stage opens. */
  review: { items: 4, need: 3, days: [2, 7, 21] as const },
  /** The primer: 3 items, all right. */
  primer: { items: 3, need: 3 },
  /** The diagnostic: items in all, and the no-timer promise. */
  diagnostic: { maxItems: 10, upAfter: 2 },
  /** The log keeps this many answers (newest last). */
  maxLog: 300,
} as const;

/** The content version written into each log entry. */
export const CONTENT_VERSION = '0.10.0';

export type Track = 1 | 2 | 3 | 4;
export type Level = 1 | 2 | 3 | 4;
export const LEVEL_NAMES: Record<Level, string> = { 1: 'Starter', 2: 'Builder', 3: 'Reasoner', 4: 'Prover' };
export const TRACK_NAMES: Record<Track, string> = { 1: 'Repetition and structure', 2: 'Change and functions', 3: 'Relations and space', 4: 'Evidence and uncertainty' };

export type EvidencePhase = Phase | 'check' | 'primer' | 'diagnostic';

/** One answered item, by meaning. */
export interface EvidenceEntry {
  item: string;
  lesson: string;
  skill: string;
  phase: EvidencePhase;
  day: string;
  right: boolean;
  /** The first attempt was right (never rewritten by a retry). */
  first: boolean;
  hints: number;
  /** A repair of the same item, or a hinted answer: practice with help, never independent evidence. */
  supported: boolean;
  /** The explanation rubric level this answer showed, 0-3 (Explain items). */
  score?: 0 | 1 | 2 | 3;
  /** The optional confidence tap before feedback: 0 unsure, 1 fairly sure, 2 very sure. */
  conf?: 0 | 1 | 2;
  tags?: ErrorTag[];
  version: string;
}

export interface LessonEvidence {
  practiced?: string;
  complete?: string;
  independent?: { right: number; of: number; day: string };
  /** Unfamiliar contexts right on the first try with no hint. */
  transferred: number;
  retained: { stage: 0 | 1 | 2 | 3; day?: string };
  /** The next delayed review opens on this day. */
  reviewDue?: string;
}

export interface Diagnostic {
  day: string;
  /** The entry level per track. */
  levels: Record<string, Level>;
  /** Lesson ids whose skill the diagnostic showed (they open without their prerequisite). */
  shown: string[];
  /** A grown-up changed the levels. */
  overridden?: true;
}

export interface Evidence {
  v: 1;
  lessons: Record<string, LessonEvidence>;
  log: EvidenceEntry[];
  diagnostic?: Diagnostic;
  /** Lesson ids whose primer was passed. */
  primers: string[];
  /** Plain labels for grown-ups (lives here so an older tab keeps it). */
  plain: boolean;
  /** First tries on the Pattern Lab bridges, by event id, so bridges count as practice. */
  bridgeFirst: Record<string, boolean>;
}

export const newEvidence = (): Evidence => ({ v: 1, lessons: {}, log: [], primers: [], plain: false, bridgeFirst: {} });

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const LESSON_RE = /^s\d{1,2}\.l\d{1,2}$/;
const SKILL_RE = /^s\d{1,2}\.[a-z0-9._-]{1,60}$/i;
const PHASES: readonly string[] = ['explain', 'do', 'transfer', 'review', 'check', 'primer', 'diagnostic'];
const int = (x: unknown, min: number, max: number): number | null => (typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.floor(x))) : null);
const level = (x: unknown): Level | null => (x === 1 || x === 2 || x === 3 || x === 4 ? x : null);

/** Whitelist and clamp. Anything that is not evidence becomes empty evidence; bad entries are dropped one at a time. */
export function parseEvidence(raw: unknown): Evidence {
  const e = newEvidence();
  if (!isObj(raw)) return e;
  if (isObj(raw.lessons)) {
    for (const [id, v] of Object.entries(raw.lessons).slice(0, 200)) {
      if (!LESSON_RE.test(id) || !isObj(v)) continue;
      const le: LessonEvidence = { transferred: int(v.transferred, 0, 999) ?? 0, retained: { stage: 0 } };
      if (isDay(v.practiced)) le.practiced = v.practiced;
      if (isDay(v.complete)) le.complete = v.complete;
      if (isObj(v.independent) && isDay(v.independent.day)) {
        const of = int(v.independent.of, 1, 20) ?? EVIDENCE.independent.items;
        le.independent = { right: Math.min(of, int(v.independent.right, 0, 20) ?? 0), of, day: v.independent.day };
      }
      if (isObj(v.retained)) {
        const st = int(v.retained.stage, 0, 3) as 0 | 1 | 2 | 3 | null;
        le.retained = { stage: st ?? 0, ...(isDay(v.retained.day) ? { day: v.retained.day } : {}) };
      }
      if (isDay(v.reviewDue)) le.reviewDue = v.reviewDue;
      e.lessons[id] = le;
    }
  }
  if (Array.isArray(raw.log)) {
    for (const x of raw.log.slice(-EVIDENCE.maxLog)) {
      if (!isObj(x) || typeof x.item !== 'string' || typeof x.lesson !== 'string' || !LESSON_RE.test(x.lesson) || typeof x.skill !== 'string' || !SKILL_RE.test(x.skill)) continue;
      if (typeof x.phase !== 'string' || !PHASES.includes(x.phase) || !isDay(x.day) || typeof x.right !== 'boolean' || typeof x.first !== 'boolean') continue;
      const entry: EvidenceEntry = {
        item: x.item.slice(0, 80),
        lesson: x.lesson,
        skill: x.skill,
        phase: x.phase as EvidencePhase,
        day: x.day,
        right: x.right,
        first: x.first,
        hints: int(x.hints, 0, 9) ?? 0,
        supported: x.supported === true,
        version: typeof x.version === 'string' ? x.version.slice(0, 16) : '',
      };
      const score = int(x.score, 0, 3);
      if (score !== null && typeof x.score === 'number') entry.score = score as 0 | 1 | 2 | 3;
      const conf = int(x.conf, 0, 2);
      if (conf !== null && typeof x.conf === 'number') entry.conf = conf as 0 | 1 | 2;
      if (Array.isArray(x.tags)) {
        const tags = x.tags.filter((t): t is ErrorTag => typeof t === 'string' && t.length <= 40).slice(0, 4);
        if (tags.length) entry.tags = tags;
      }
      e.log.push(entry);
    }
  }
  if (isObj(raw.diagnostic) && isDay(raw.diagnostic.day)) {
    const levels: Record<string, Level> = {};
    if (isObj(raw.diagnostic.levels)) for (const [t, l] of Object.entries(raw.diagnostic.levels)) if (/^[1-4]$/.test(t) && level(l)) levels[t] = level(l)!;
    const shown = Array.isArray(raw.diagnostic.shown) ? raw.diagnostic.shown.filter((s): s is string => typeof s === 'string' && LESSON_RE.test(s)).slice(0, 40) : [];
    e.diagnostic = { day: raw.diagnostic.day, levels, shown, ...(raw.diagnostic.overridden === true ? { overridden: true as const } : {}) };
  }
  if (Array.isArray(raw.primers)) e.primers = [...new Set(raw.primers.filter((s): s is string => typeof s === 'string' && LESSON_RE.test(s)))].slice(0, 40);
  e.plain = raw.plain === true;
  if (isObj(raw.bridgeFirst)) for (const [id, v] of Object.entries(raw.bridgeFirst).slice(0, 40)) if (/^[A-Z]{2}-\d{2}$/.test(id) && typeof v === 'boolean') e.bridgeFirst[id] = v;
  return e;
}

const lessonOf = (e: Evidence, id: string): LessonEvidence => e.lessons[id] ?? { transferred: 0, retained: { stage: 0 } };

/** Add one answer to the log (oldest dropped past the cap) and mark the lesson practiced. */
export function logAnswer(e: Evidence, entry: EvidenceEntry): Evidence {
  const log = [...e.log, entry].slice(-EVIDENCE.maxLog);
  const le = lessonOf(e, entry.lesson);
  const next: LessonEvidence = { ...le, practiced: le.practiced ?? entry.day };
  // Transfer: an unfamiliar context right on the first try, with no hint and no help.
  if (entry.phase === 'transfer' && entry.right && entry.first && !entry.supported) next.transferred = le.transferred + 1;
  return { ...e, log, lessons: { ...e.lessons, [entry.lesson]: next } };
}

/** The lesson passed: Lesson complete, and the first delayed review opens in about two days. */
export function markComplete(e: Evidence, lessonId: string, day: string): Evidence {
  const le = lessonOf(e, lessonId);
  if (le.complete) return e;
  return { ...e, lessons: { ...e.lessons, [lessonId]: { ...le, practiced: le.practiced ?? day, complete: day, reviewDue: addDays(day, EVIDENCE.review.days[0]) } } };
}

/** An independent check finished: it counts only when enough were right with no hints (the runner gives no hints). */
export function recordIndependent(e: Evidence, lessonId: string, right: number, of: number, day: string): Evidence {
  const le = lessonOf(e, lessonId);
  // A later try can only improve the record: the best run is kept.
  const best = le.independent && le.independent.right >= right ? le.independent : { right, of, day };
  return { ...e, lessons: { ...e.lessons, [lessonId]: { ...le, independent: best } } };
}

/** A delayed review finished: enough right moves the stage up and sets the next due day; otherwise the same stage waits a day. */
export function recordReview(e: Evidence, lessonId: string, right: number, day: string): Evidence {
  const le = lessonOf(e, lessonId);
  const passed = right >= EVIDENCE.review.need;
  const stage = passed ? (Math.min(3, le.retained.stage + 1) as 0 | 1 | 2 | 3) : le.retained.stage;
  const base = le.complete ?? day;
  const nextDays = (EVIDENCE.review.days as readonly number[])[stage] as number | undefined;
  const due = passed ? (nextDays !== undefined ? addDays(base, nextDays) : undefined) : addDays(day, 1);
  // The next review never opens before tomorrow.
  const reviewDue = due && due > day ? due : stage < 3 ? addDays(day, 1) : undefined;
  return { ...e, lessons: { ...e.lessons, [lessonId]: { ...le, retained: { stage, ...(passed ? { day } : le.retained.day ? { day: le.retained.day } : {}) }, ...(reviewDue ? { reviewDue } : { reviewDue: undefined }) } } };
}

export function passPrimer(e: Evidence, lessonId: string): Evidence {
  return e.primers.includes(lessonId) ? e : { ...e, primers: [...e.primers, lessonId] };
}

export function setPlain(e: Evidence, plain: boolean): Evidence {
  return { ...e, plain };
}

export function recordBridgeFirst(e: Evidence, eventId: string, first: boolean): Evidence {
  if (eventId in e.bridgeFirst) return e;
  return { ...e, bridgeFirst: { ...e.bridgeFirst, [eventId]: first } };
}

export function setDiagnostic(e: Evidence, d: Diagnostic): Evidence {
  return { ...e, diagnostic: d };
}

/** The five states of one place, for the profile chevrons. */
export interface Profile {
  practiced: boolean;
  complete: boolean;
  independent: boolean;
  transferred: boolean;
  /** 0 none, 1 about 2 days, 2 a week, 3 three to four weeks. */
  retained: 0 | 1 | 2 | 3;
  /** A delayed review is open today. */
  reviewDue: boolean;
  /** The independent check is open: the lesson is complete and not yet independent. */
  independentDue: boolean;
}

export function profileOf(e: Evidence, lessonId: string, today: string): Profile {
  const le = lessonOf(e, lessonId);
  const independent = !!le.independent && le.independent.right >= EVIDENCE.independent.need;
  const complete = !!le.complete;
  return {
    practiced: !!le.practiced || complete,
    complete,
    independent,
    transferred: le.transferred >= EVIDENCE.transfers,
    retained: le.retained.stage,
    reviewDue: complete && !!le.reviewDue && le.reviewDue <= today && le.retained.stage < 3,
    independentDue: complete && !independent,
  };
}

export const PROFILE_LABELS: readonly { key: keyof Pick<Profile, 'practiced' | 'complete' | 'independent' | 'transferred'> | 'retained'; label: string; means: string }[] = [
  { key: 'practiced', label: 'Practiced', means: 'Worked and faded examples. Hinted answers live here.' },
  { key: 'complete', label: 'Lesson complete', means: `${3} clean first tries, including the trap item. A gate, not mastery.` },
  { key: 'independent', label: 'Independent', means: `Fresh ${EVIDENCE.independent.items}-item check: ${EVIDENCE.independent.need} of ${EVIDENCE.independent.items} right, no hints, with a reasoning item.` },
  { key: 'transferred', label: 'Transferred', means: `${EVIDENCE.transfers} or more unfamiliar contexts solved, with a rule explanation.` },
  { key: 'retained', label: 'Retained', means: `Fresh ${EVIDENCE.review.items}-item delayed check: ${EVIDENCE.review.need} of ${EVIDENCE.review.items}, at about 2 days, 1 week and 3 to 4 weeks.` },
];

// ---------- the diagnostic ----------

/** Where one track is in the diagnostic: its level, the run of right answers at that level, and whether it has ended. */
export interface TrackState {
  level: Level;
  streak: number;
  ended: boolean;
  /** The highest level with a right answer, or 0. */
  shown: Level | 0;
}

export const startTrack = (): TrackState => ({ level: 1, streak: 0, ended: false, shown: 0 });

/** Each track starts at L1; two right in a row moves it up a level; the first miss ends that track. */
export function stepTrack(t: TrackState, correct: boolean, max: Level = 4): TrackState {
  if (t.ended) return t;
  if (!correct) return { ...t, ended: true };
  const shown = Math.max(t.shown, t.level) as Level;
  const streak = t.streak + 1;
  if (streak >= EVIDENCE.diagnostic.upAfter) {
    if (t.level >= max) return { ...t, streak: 0, ended: true, shown };
    return { level: (t.level + 1) as Level, streak: 0, ended: false, shown };
  }
  return { ...t, streak, shown };
}

/** The entry level a finished track recommends: the highest level shown, else L1. */
export const entryLevel = (t: TrackState): Level => (t.shown || 1) as Level;
