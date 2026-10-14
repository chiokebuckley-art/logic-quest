/**
 * The Kid Journey's pure helpers (docs/KID-JOURNEY.md §2): what a save shows (stars per band, stickers, buildings,
 * badges, skipped bands, days played this week), how play changes the kid save (a grade, a star, a world check, the
 * glow), the world check's questions and pass rule, and the placement check's stop rule. No clock and no DOM: every
 * function takes the day it should treat as today. Stickers, buildings and badges are derived, never stored, so
 * nothing can be forged.
 */
import { addDays } from '../engine/journey/mastery';
import type { CheckKind } from '../engine/journey/mastery';
import { practiceFor } from '../engine/drill';
import { looks } from '../engine/fresh';
import { createRng } from '../engine/rng';
import type { KidSave, SaveData, StarKind } from '../engine/save/save';
import type { GradeId, Item, StopDef } from '../engine/types';
import { GRADES, GRADE_IDS, bandOfWorld, gradeById, isYoung, roundsOf, worldById, type GradeDef, type WorldDef } from '../content/grades';
import { STREAK_MIN_SECONDS } from './progressStats';
import { lessonById } from './observatory';
import type { KidMode } from './kidMode';
import { kidItemOf, kidItemsOf } from './kidPlay';

export { nextRound, roundOpen, roundDone } from '../content/grades';

// ---------- stars, stickers, buildings, badges ----------

export interface BandStars {
  clean: number;
  mended: number;
  /** Stars earned (clean and mended). */
  got: number;
  /** Rounds in the band. */
  of: number;
}

export function starsIn(save: SaveData, band: GradeId): BandStars {
  const rounds = roundsOf(band);
  const kinds = rounds.map((id) => save.kid.stars[id]);
  const clean = kinds.filter((k) => k === 'clean').length;
  const mended = kinds.filter((k) => k === 'mended').length;
  return { clean, mended, got: clean + mended, of: rounds.length };
}

/** One sticker: its name (read aloud and shown on Me) and its color. */
export interface Sticker {
  name: string;
  color: string;
}

/** The fixed sticker list of each band, earned in order: one for every three stars in the band. */
export const STICKERS: Record<GradeId, readonly Sticker[]> = {
  g1: [{ name: 'Moon', color: '#ffc93c' }, { name: 'Comet', color: '#22e6ff' }, { name: 'Owl', color: '#a78bfa' }, { name: 'Rocket', color: '#f472b6' }, { name: 'Rainbow', color: '#2dd4bf' }, { name: 'Planet', color: '#ffb347' }],
  g2: [{ name: 'Frog', color: '#2dd4bf' }, { name: 'Boat', color: '#22e6ff' }, { name: 'Duck', color: '#ffc93c' }, { name: 'Shell', color: '#f472b6' }, { name: 'Fish', color: '#ffb347' }, { name: 'Wave', color: '#a78bfa' }],
  g3: [{ name: 'Gem', color: '#22e6ff' }, { name: 'Map', color: '#ffb347' }, { name: 'Crown', color: '#ffc93c' }, { name: 'Coin', color: '#f472b6' }, { name: 'Torch', color: '#2dd4bf' }, { name: 'Shovel', color: '#a78bfa' }],
  g4: [{ name: 'Cactus', color: '#2dd4bf' }, { name: 'Eagle', color: '#ffb347' }, { name: 'Lizard', color: '#22e6ff' }, { name: 'Rock', color: '#a78bfa' }, { name: 'Boot', color: '#f472b6' }, { name: 'Hat', color: '#ffc93c' }],
  g5: [{ name: 'Palm', color: '#2dd4bf' }, { name: 'Crab', color: '#f472b6' }, { name: 'Shield', color: '#ffc93c' }, { name: 'Parrot', color: '#22e6ff' }, { name: 'Pearl', color: '#a78bfa' }, { name: 'Flag', color: '#ffb347' }],
  g6: [{ name: 'Arch', color: '#ffb347' }, { name: 'Gull', color: '#22e6ff' }, { name: 'Rope', color: '#a78bfa' }, { name: 'Lamp', color: '#ffc93c' }, { name: 'Kite', color: '#f472b6' }, { name: 'Wheel', color: '#2dd4bf' }],
  g7: [{ name: 'Bulb', color: '#ffc93c' }, { name: 'Gear', color: '#a78bfa' }, { name: 'Robot', color: '#22e6ff' }, { name: 'Bolt', color: '#ffb347' }, { name: 'Train', color: '#f472b6' }, { name: 'Clock', color: '#2dd4bf' }],
  g8: [{ name: 'Peak', color: '#22e6ff' }, { name: 'Goat', color: '#ffb347' }, { name: 'Pick', color: '#a78bfa' }, { name: 'Snow', color: '#2dd4bf' }, { name: 'Tent', color: '#f472b6' }, { name: 'Flag', color: '#ffc93c' }],
  hs: [{ name: 'Scroll', color: '#a78bfa' }, { name: 'Quill', color: '#22e6ff' }, { name: 'Owl', color: '#ffc93c' }],
};

/** The stickers earned in a band: one per three stars, from the band's list, in order. */
export function stickersIn(save: SaveData, band: GradeId): Sticker[] {
  return STICKERS[band].slice(0, Math.floor(starsIn(save, band).got / 3));
}

/** Every sticker earned, band by band. */
export function allStickers(save: SaveData): Sticker[] {
  return GRADE_IDS.flatMap((g) => stickersIn(save, g));
}

/** The worlds whose check was passed (each built its building), optionally in one band. */
export function buildings(save: SaveData, band?: GradeId): WorldDef[] {
  const grades = band ? [gradeById(band)] : GRADES;
  return grades.flatMap((g) => g.worlds.filter((w) => !!save.kid.worlds[w.id]?.passDay));
}

/** A band's badge is earned when every world check of the band is passed. */
export function hasBadge(save: SaveData, band: GradeId): boolean {
  return gradeById(band).worlds.every((w) => !!save.kid.worlds[w.id]?.passDay);
}

/** The grade badges earned, in grade order. */
export function badges(save: SaveData): GradeId[] {
  return GRADE_IDS.filter((g) => hasBadge(save, g));
}

/** Bands below the player's grade with no star yet: open to play, shown as skipped. */
export function skippedBands(save: SaveData): GradeId[] {
  const grade = save.kid.grade;
  if (!grade) return [];
  return GRADE_IDS.slice(0, GRADE_IDS.indexOf(grade)).filter((g) => starsIn(save, g).got === 0);
}

/** Every round of a world is starred (or done): the world check is open. */
export function worldReady(save: SaveData, world: WorldDef): boolean {
  return world.rounds.every((id) => !!save.kid.stars[id] || (save.stops[id.split('.')[0]]?.lessonsDone ?? []).includes(id));
}

/** How bright a round's star is: 0 none, 1 after its stop's lock-in check, 2 after the week check. */
export const glowOf = (save: SaveData, lessonId: string): 0 | 1 | 2 => save.kid.glow[lessonId] ?? 0;

// ---------- days played this week ----------

export interface WeekDay {
  day: string;
  /** One letter for the dot: M T W T F S S. */
  letter: string;
  played: boolean;
  /** Later this week (not played yet, never counted as missed). */
  ahead: boolean;
}

/**
 * The seven days of this week, Monday first, each marked played when it had at least a minute of play. It starts
 * again each Monday with empty dots, never a count that drops to zero in red.
 */
export function daysThisWeek(active: Readonly<Record<string, number>>, today: string, minSeconds = STREAK_MIN_SECONDS): { days: WeekDay[]; count: number } {
  const [y, m, d] = today.split('-').map(Number);
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  const monday = addDays(today, -dow);
  const days = 'MTWTFSS'.split('').map((letter, i) => {
    const day = addDays(monday, i);
    return { day, letter, played: (active[day] ?? 0) >= minSeconds, ahead: i > dow };
  });
  return { days, count: days.filter((x) => x.played).length };
}

// ---------- what play does to the kid save ----------

const withKid = (save: SaveData, kid: KidSave): SaveData => ({ ...save, kid });

/**
 * Choose (or clear, with null) the player's grade. `by` records a placement (the check, or a grown-up). A grade in
 * Grades 1 to 3 sets the band's defaults: read-aloud on and the check timer off (the toggles stay for grown-ups).
 */
export function setGradeInto(save: SaveData, grade: GradeId | null, by: 'check' | 'grownup' | undefined, day: string): SaveData {
  const kid: KidSave = { ...save.kid, grade };
  if (grade && by) kid.placed = { grade, day, by };
  const next = withKid(save, kid);
  return isYoung(grade) ? { ...next, settings: { ...next.settings, readAloud: true, timer: false } } : next;
}

/**
 * Star a round. Only a passed lesson calls this (LessonRunner reports the run to its host, which stars it before it
 * records the lesson done): a lesson with guided boards gets no star until they are marked, and a clean star is never
 * turned into a mended one by a later run.
 */
export function starInto(save: SaveData, lessonId: string, kind: StarKind): SaveData {
  const lesson = lessonById(lessonId);
  if (!lesson) return save;
  if (lesson.drill?.length && !save.drilled.includes(lessonId)) return save;
  const had = save.kid.stars[lessonId];
  if (had === 'clean' || had === kind) return save;
  return withKid(save, { ...save.kid, stars: { ...save.kid.stars, [lessonId]: kind } });
}

/**
 * A world check finished: one more try; all right sets the pass day (the first one is kept) and clears the "not
 * yet"; a miss records the rounds to learn again, none played again yet (`redone: []`), so the retry waits for them.
 * `badge` is the band whose badge this pass has just earned.
 */
export function worldCheckInto(save: SaveData, worldId: string, passed: boolean, missed: readonly string[], day: string): { save: SaveData; badge: GradeId | null } {
  const band = bandOfWorld(worldId);
  if (!band) return { save, badge: null };
  const before = hasBadge(save, band);
  const was = save.kid.worlds[worldId] ?? { tries: 0 };
  const w = { ...was, tries: was.tries + 1 };
  if (passed) {
    w.passDay = was.passDay ?? day;
    delete w.notYet;
  } else {
    w.notYet = { day, missed: [...missed], redone: [] };
  }
  const next = withKid(save, { ...save.kid, worlds: { ...save.kid.worlds, [worldId]: w } });
  return { save: next, badge: passed && !before && hasBadge(next, band) ? band : null };
}

/**
 * A round was played again to the end (starred again, or at least completed): it counts as redone for every world
 * check whose "not yet" missed it, the way a stop check's notYet counts a redone lesson.
 */
export function redoInto(save: SaveData, lessonId: string): SaveData {
  let worlds: KidSave['worlds'] | null = null;
  for (const [id, w] of Object.entries(save.kid.worlds)) {
    const ny = w.notYet;
    if (!ny || !ny.missed.includes(lessonId) || ny.redone.includes(lessonId)) continue;
    worlds = worlds ?? { ...save.kid.worlds };
    worlds[id] = { ...w, notYet: { ...ny, redone: [...ny.redone, lessonId] } };
  }
  return worlds ? withKid(save, { ...save.kid, worlds }) : save;
}

/** The missed rounds of a world's last "not yet" that are still to play again, in the world's order. */
export function roundsToRedo(save: SaveData, world: WorldDef): string[] {
  const ny = save.kid.worlds[world.id]?.notYet;
  if (!ny) return [];
  return world.rounds.filter((id) => ny.missed.includes(id) && !ny.redone.includes(id));
}

/** A stop's lock-in check (1) or week check (2) was passed: its lessons' stars glow. */
export function glowInto(save: SaveData, stop: StopDef, kind: CheckKind): SaveData {
  if (kind === 'pass') return save;
  const level: 1 | 2 = kind === 'week' ? 2 : 1;
  const glow = { ...save.kid.glow };
  for (const l of stop.lessons) glow[l.id] = Math.max(glow[l.id] ?? 0, level) as 1 | 2;
  return withKid(save, { ...save.kid, glow });
}

// ---------- the world check ----------

/**
 * The world check's questions: drawn from the world's rounds' practice packs over several seeds, never a scaffolded
 * or fixed item, no two that look the same, taken round by round so every round is asked (when there are enough
 * questions). Each is given a new id per round, and an item from a lesson outside the world counts for its round.
 * With a kid mode (the check drawn in kid mode), each item with a kid-only alternate is swapped for it (kidItemOf),
 * keeping its id, so the result screen shows what was asked.
 */
export function worldCheckItems(world: WorldDef, count: number, seed: number, kid: KidMode | null = null): Item[] {
  const seen = new Set<string>();
  const pools = world.rounds.map((roundId, r) => {
    const lesson = lessonById(roundId);
    const pool: Item[] = [];
    if (!lesson) return pool;
    for (let s = 0; s < 6 && pool.length < count; s++) {
      for (const it of practiceFor(lesson, createRng(seed + r * 7919 + s * 104729))) {
        if (it.workFirst || it.fixed) continue;
        const key = looks(it);
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(world.rounds.includes(it.lesson) ? it : { ...it, lesson: roundId });
      }
    }
    return pool;
  });
  const out: Item[] = [];
  for (let i = 0; out.length < count && i < count * world.rounds.length; i++) {
    const r = i % world.rounds.length;
    const it = pools[r].shift();
    if (it) out.push({ ...it, id: `${world.id}-${world.rounds[r]}-${out.length + 1}` });
    else if (pools.every((p) => !p.length)) break;
  }
  return kidItemsOf(out, kid);
}

/** The pass rule: every answer right. Missed rounds come in the world's order. */
export function worldCheckOutcome(world: WorldDef, items: readonly Item[], records: readonly { correct: boolean }[]): { passed: boolean; missed: string[] } {
  const wrong = items.filter((_, i) => !records[i]?.correct).map((it) => it.lesson);
  return { passed: items.length > 0 && wrong.length === 0, missed: world.rounds.filter((id) => wrong.includes(id)) };
}

/**
 * Where a world check stands: 'locked' until every round has a star; 'redo' after a miss, until every missed round
 * is played again (the retry is locked, also for a world passed before); 'notyet' when the retry is open; 'open' for
 * a first try; 'passed' once passed (it can be taken again).
 */
export type WorldCheckState = 'locked' | 'open' | 'redo' | 'notyet' | 'passed';

export function worldCheckState(save: SaveData, world: WorldDef): WorldCheckState {
  const w = save.kid.worlds[world.id];
  if (!worldReady(save, world)) return w?.passDay ? 'passed' : 'locked';
  if (roundsToRedo(save, world).length) return 'redo';
  if (w?.passDay) return 'passed';
  return w?.notYet ? 'notyet' : 'open';
}

/** The world check can be started: every round has a star and no missed round is still to play again. */
export const worldCheckOpen = (save: SaveData, world: WorldDef): boolean => {
  const st = worldCheckState(save, world);
  return st !== 'locked' && st !== 'redo';
};

export { worldById };

// ---------- the placement check ----------

/** The bands the placement check asks about, two questions each: Grade 1 to Grade 8. */
export const PLACEMENT_BANDS: readonly GradeId[] = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
export const PLACEMENT_PER_BAND = 2;
export const PLACEMENT_MAX = PLACEMENT_BANDS.length * PLACEMENT_PER_BAND;

export interface PlacementState {
  answers: { band: GradeId; correct: boolean }[];
  /** Misses in a row at the end. */
  missRun: number;
  done: boolean;
}

export const startPlacement = (): PlacementState => ({ answers: [], missRun: 0, done: false });

/** The band the next question comes from (two per band, Grade 1 up), or null when the check is over. */
export function placementBand(st: PlacementState): GradeId | null {
  if (st.done) return null;
  return PLACEMENT_BANDS[Math.floor(st.answers.length / PLACEMENT_PER_BAND)] ?? null;
}

/** One answer: the check stops at two misses in a row, or after the last question (16 at most). */
export function placementStep(st: PlacementState, correct: boolean): PlacementState {
  const band = placementBand(st);
  if (!band) return st;
  const answers = [...st.answers, { band, correct }];
  const missRun = correct ? 0 : st.missRun + 1;
  return { answers, missRun, done: missRun >= 2 || answers.length >= PLACEMENT_MAX };
}

/** Where the check places: the highest band with a right answer, else Grade 1. */
export function placementGrade(st: PlacementState): GradeId {
  let best: GradeId = 'g1';
  for (const a of st.answers) if (a.correct && GRADE_IDS.indexOf(a.band) > GRADE_IDS.indexOf(best)) best = a.band;
  return best;
}

/**
 * The kid mode a placement question of Grades 1 to 3 is drawn in (its kid words; no auto read-aloud), or null from
 * Grade 4 up (classic).
 */
export const placementKid = (band: GradeId): KidMode | null => (isYoung(band) ? { grade: band, budget: gradeById(band).budget, autoRead: false } : null);

/**
 * One placement question for a band: the k-th (0 or 1) comes from a different world when the band has two. For
 * Grades 1 to 3 it is the item's kid-only alternate when it has one (kidItemOf), drawn in kid mode (placementKid).
 */
export function placementItem(band: GradeId, k: number, seed: number): Item | null {
  const g: GradeDef = gradeById(band);
  const w = g.worlds[k % g.worlds.length];
  const rng = createRng(seed);
  const start = rng.int(0, w.rounds.length - 1);
  for (let j = 0; j < w.rounds.length; j++) {
    const lesson = lessonById(w.rounds[(start + j) % w.rounds.length]);
    if (!lesson) continue;
    const it = practiceFor(lesson, createRng(seed + j * 7919)).find((x) => !x.workFirst && !x.fixed);
    if (it) return kidItemOf({ ...it, id: `place-${band}-${k}` }, placementKid(band));
  }
  return null;
}
