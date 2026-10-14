/**
 * The Kid Journey's grade map (docs/KID-JOURNEY.md §1): nine bands, Grade 1 to Grade 8 and high school, each a list
 * of worlds, each world a few rounds, each round one existing lesson. Every lesson appears in exactly one world (a
 * test checks). The order inside a world is the order of play, and every lesson-level `requires` of an Observatory
 * place is met by an earlier round.
 *
 * A round opened from the map skips the stop-order gate and the place gate; finishing it records the lesson exactly
 * as the stop Journey does, so both show it.
 */
import type { SaveData } from '../engine/save/save';
import { GRADE_IDS, type GradeId, type Picto } from '../engine/types';

export { GRADE_IDS };
export type { GradeId };

/**
 * How much a young reader is asked to read, per band: words a screen shows (buttons included), the longest
 * sentence, sentences on a screen, whether read-aloud starts by itself, whether checks have a timer, and whether the
 * thinking-routine strip shows.
 */
export interface KidBudget {
  /**
   * Every visible word on one screen, buttons and the play header included. In kid mode the header reads "Round k of
   * n" (4 words), so a round's content has `words - 4`: 8 in Grade 1, 16 in Grade 2, 26 in Grade 3.
   */
  words: number;
  /** The longest sentence on a screen, in words. */
  sentence: number;
  /** Sentences on one screen. No limit when missing. */
  sentences?: number;
  /** Read-aloud starts by itself on each card and item (after the first tap). */
  autoRead: boolean;
  /** A calm timer on check questions (when the grown-up setting is on). */
  timer: boolean;
  /** The thinking-routine strip and line. */
  strip: boolean;
}

export interface WorldDef {
  /** 'g1.w1' */
  id: string;
  title: string;
  /** Lesson ids, in the order of play. */
  rounds: string[];
  /** What passing the world check builds. */
  building: Picto;
}

export interface GradeDef {
  id: GradeId;
  /** "Grade 1", or "High school". */
  label: string;
  /** "Starlight Meadow" */
  title: string;
  worlds: WorldDef[];
  budget: KidBudget;
  /** How many questions a world check of this band asks. */
  check: { items: number };
}

const young = (words: number, sentence: number, sentences: number, autoRead: boolean): KidBudget => ({ words, sentence, sentences, autoRead, timer: false, strip: false });
const older = (words: number, sentence: number, sentences?: number): KidBudget => ({ words, sentence, ...(sentences ? { sentences } : {}), autoRead: false, timer: true, strip: true });

const world = (id: string, title: string, building: Picto, rounds: string[]): WorldDef => ({ id, title, rounds, building });

export const GRADES: readonly GradeDef[] = [
  {
    id: 'g1', label: 'Grade 1', title: 'Starlight Meadow', budget: young(12, 8, 2, true), check: { items: 5 },
    worlds: [
      world('g1.w1', 'Sky Path', 'house', ['s1.l1', 's1.l2', 's1.l3', 's14.l1']),
      world('g1.w2', 'Meadow Gate', 'tree', ['s2.l2', 's4.l1', 's14.l2']),
    ],
  },
  {
    id: 'g2', label: 'Grade 2', title: 'River of Rules', budget: young(20, 10, 2, true), check: { items: 5 },
    worlds: [
      world('g2.w1', 'River Bend', 'bridge', ['s2.l1', 's2.l3', 's14.l3', 's7.l1']),
      world('g2.w2', 'Stepping Stones', 'mill', ['s3.l1', 's3.l2', 's4.l2', 's8.l1']),
    ],
  },
  {
    id: 'g3', label: 'Grade 3', title: 'Treasure Hills', budget: young(30, 12, 3, false), check: { items: 8 },
    worlds: [
      world('g3.w1', 'Treasure Cave', 'key', ['s1.l4', 's2.l4', 's8.l2', 's15.l1']),
      world('g3.w2', 'Hill Trail', 'tent', ['s3.l3', 's3.l4', 's4.l3', 's4.l4']),
    ],
  },
  {
    id: 'g4', label: 'Grade 4', title: 'Clue Canyon', budget: older(40, 14, 4), check: { items: 8 },
    worlds: [
      world('g4.w1', 'Sign Ledge', 'lamp', ['s1.l5', 's1.l6', 's1.l7']),
      world('g4.w2', 'Canyon Floor', 'tower', ['s2.l5', 's3.l5', 's4.l5', 's15.l2']),
      world('g4.w3', 'Echo Wall', 'bridge', ['s15.l3', 's18.l1', 's7.l2']),
    ],
  },
  {
    id: 'g5', label: 'Grade 5', title: 'Truth Island', budget: older(50, 16, 4), check: { items: 8 },
    worlds: [
      world('g5.w1', 'Knight Shore', 'castle', ['s5.l1', 's5.l2', 's5.l3', 's18.l2']),
      world('g5.w2', 'Rule Reef', 'lighthouse', ['s6.l1', 's6.l2', 's8.l3', 's8.l4']),
      world('g5.w3', 'Mirror Cove', 'house', ['s16.l1', 's7.l3', 's13.l1']),
    ],
  },
  {
    id: 'g6', label: 'Grade 6', title: 'If-Then Bridge', budget: older(60, 18, 5), check: { items: 10 },
    worlds: [
      world('g6.w1', 'Islander Bay', 'lighthouse', ['s5.l4', 's5.l5', 's18.l3', 's18.l4']),
      world('g6.w2', 'Four Moves', 'bridge', ['s6.l3', 's6.l4', 's6.l5']),
      world('g6.w3', 'Table Tower', 'tower', ['s9.l1', 's9.l2', 's16.l2', 's16.l3']),
      world('g6.w4', 'Fair Harbor', 'mill', ['s7.l4', 's7.l5', 's13.l2', 's13.l3']),
    ],
  },
  {
    id: 'g7', label: 'Grade 7', title: 'Circuit City', budget: older(75, 22, 6), check: { items: 10 },
    worlds: [
      world('g7.w1', 'Only-If Lane', 'house', ['s6.l6', 's6.l7', 's8.l5', 's8.l6']),
      world('g7.w2', 'Table Street', 'tower', ['s9.l3', 's9.l4', 's9.l5', 's9.l6']),
      world('g7.w3', 'Wire Works', 'lamp', ['s10.l1', 's10.l2', 's10.l3', 's10.l4', 's10.l5']),
      world('g7.w4', 'Lantern Square', 'lighthouse', ['s13.l4', 's17.l1', 's17.l2']),
    ],
  },
  {
    id: 'g8', label: 'Grade 8', title: 'Proof Peak', budget: older(75, 22, 6), check: { items: 10 },
    worlds: [
      world('g8.w1', 'Proof Trail', 'tent', ['s11.l1', 's11.l2', 's11.l3', 's11.l4']),
      world('g8.w2', 'Summit Steps', 'castle', ['s11.l5', 's11.l6', 's11.l7', 's17.l3']),
      world('g8.w3', 'Trick Market', 'mill', ['s12.l1', 's12.l2', 's12.l3']),
      world('g8.w4', 'Market Square', 'tower', ['s12.l4', 's12.l5', 's12.l6', 's13.l5']),
    ],
  },
  {
    id: 'hs', label: 'High school', title: 'Symbol Summit', budget: older(90, 25), check: { items: 10 },
    worlds: [world('hs.w1', 'Symbols', 'telescope', ['s9.l7'])],
  },
];

/** The bands whose players get the kid layer: no timer, no routine strip, read-aloud on. */
export const YOUNG_BANDS: readonly GradeId[] = ['g1', 'g2', 'g3'];
export const isYoung = (g: GradeId | null | undefined): g is GradeId => !!g && YOUNG_BANDS.includes(g);

export const gradeById = (id: GradeId): GradeDef => GRADES.find((g) => g.id === id)!;
/** "Grade 3" as a number for the screens ("Grade 3 done!"); high school reads as its label. */
export const gradeNumber = (id: GradeId): number | null => (id === 'hs' ? null : Number(id.slice(1)));

/** Every round of a band, in the order of play. */
export function roundsOf(band: GradeId): string[] {
  return gradeById(band).worlds.flatMap((w) => w.rounds);
}

/** Every round of every band, Grade 1 first. */
export function allRounds(): string[] {
  return GRADES.flatMap((g) => g.worlds.flatMap((w) => w.rounds));
}

/** The band a lesson belongs to, or null for a lesson the map does not hold. */
export function bandOf(lessonId: string): GradeId | null {
  return GRADES.find((g) => g.worlds.some((w) => w.rounds.includes(lessonId)))?.id ?? null;
}

/** The world a lesson is a round of, or null. */
export function worldOf(lessonId: string): WorldDef | null {
  for (const g of GRADES) for (const w of g.worlds) if (w.rounds.includes(lessonId)) return w;
  return null;
}

export function worldById(id: string): WorldDef | null {
  for (const g of GRADES) for (const w of g.worlds) if (w.id === id) return w;
  return null;
}

/** The band of a world id ('g2.w1' is Grade 2). */
export const bandOfWorld = (worldId: string): GradeId | null => GRADES.find((g) => g.worlds.some((w) => w.id === worldId))?.id ?? null;

/** A round counts as played when it has a star, or the lesson was done on the stop Journey (an older save). */
export function roundDone(save: SaveData, lessonId: string): boolean {
  if (save.kid.stars[lessonId]) return true;
  const stopId = lessonId.split('.')[0];
  return (save.stops[stopId]?.lessonsDone ?? []).includes(lessonId);
}

/**
 * Is this round open to play? Rounds open in order inside a world; the first round of a world opens once every round
 * of the world before it (in the same band) is played. The first world of every band is open, so moving between
 * grades is free, and a round already played never locks.
 */
export function roundOpen(save: SaveData, lessonId: string): boolean {
  const band = bandOf(lessonId);
  const w = worldOf(lessonId);
  if (!band || !w) return false;
  if (roundDone(save, lessonId)) return true;
  const k = w.rounds.indexOf(lessonId);
  if (k > 0) return roundDone(save, w.rounds[k - 1]);
  const worlds = gradeById(band).worlds;
  const wi = worlds.indexOf(w);
  return wi <= 0 || worlds[wi - 1].rounds.every((id) => roundDone(save, id));
}

export interface NextRound {
  lessonId: string;
  band: GradeId;
  world: WorldDef;
  /** 1-based place in its world. */
  k: number;
}

/**
 * The round to play next: the first open round without a star in the player's grade, then in the grades above it.
 * Null when no grade is chosen, or every round from the grade up is starred.
 */
export function nextRound(save: SaveData): NextRound | null {
  const grade = save.kid.grade;
  if (!grade) return null;
  for (const g of GRADES.slice(GRADE_IDS.indexOf(grade))) {
    for (const w of g.worlds) {
      for (const [i, id] of w.rounds.entries()) {
        if (!save.kid.stars[id] && roundOpen(save, id)) return { lessonId: id, band: g.id, world: w, k: i + 1 };
      }
    }
  }
  return null;
}
