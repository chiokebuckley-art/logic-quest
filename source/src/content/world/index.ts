/** All the real-life content, by stop, with lookups for the screens. See types.ts. */
import type { LessonWorld, RealUse, StopWorld } from './types';
import { SOON_WORLD } from './soon';
import { S1_WORLD } from './s1';
import { S2_WORLD } from './s2';
import { S3_WORLD } from './s3';
import { S4_WORLD } from './s4';
import { S5_WORLD } from './s5';
import { S6_WORLD } from './s6';
import { S7_WORLD } from './s7';
import { S14_WORLD } from './s14';
import { S15_WORLD } from './s15';
import { S16_WORLD } from './s16';
import { S17_WORLD } from './s17';

export type { LessonWorld, RealUse, StopWorld } from './types';

/** The ready stops' content, by stop id. */
export const WORLD: Record<string, StopWorld> = { s1: S1_WORLD, s2: S2_WORLD, s3: S3_WORLD, s4: S4_WORLD, s5: S5_WORLD, s6: S6_WORLD, s7: S7_WORLD, s14: S14_WORLD, s15: S15_WORLD, s16: S16_WORLD, s17: S17_WORLD };
export { SOON_WORLD };

const LESSONS: Record<string, LessonWorld> = Object.assign({}, ...Object.values(WORLD).map((w) => w.lessons));
const SKILLS: Record<string, string[]> = Object.assign({}, ...Object.values(WORLD).map((w) => w.skills));

/** The stop's one real-life line. */
export const stopWorld = (stopId: string): string | undefined => WORLD[stopId]?.stop ?? SOON_WORLD[stopId];

/** A lesson's why and its three uses. */
export const lessonWorld = (lessonId: string): LessonWorld | undefined => LESSONS[lessonId];

/** A small stable number for a key, so the same item always shows the same line. */
function pick(key: string, n: number): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  return h % n;
}

/** The "In real life" line for a skill: one of its lines, the same one every time for the same key (an item id). */
export function skillWorld(skill: string, key = ''): string | undefined {
  const lines = SKILLS[skill];
  return lines?.length ? lines[pick(`${skill}|${key}`, lines.length)] : undefined;
}

/** Every lesson's uses, flattened, for Home's "Remember why" (one a day, from lessons the player has done). */
export function usesFor(lessonIds: readonly string[]): { lessonId: string; use: RealUse }[] {
  return lessonIds.flatMap((id) => (LESSONS[id]?.uses ?? []).map((use) => ({ lessonId: id, use })));
}

/** Today's reminder: one use from the done lessons, the same all day, a different one tomorrow. */
export function useOfTheDay(lessonIds: readonly string[], day: string): { lessonId: string; use: RealUse } | undefined {
  const all = usesFor(lessonIds);
  return all.length ? all[pick(day, all.length)] : undefined;
}
