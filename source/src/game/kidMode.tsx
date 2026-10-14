/**
 * Kid mode: a player whose grade is in Grades 1 to 3 plays with the band's word budget, no check timer, no
 * thinking-routine strip and no "why it matters" line. Play screens provide this context (LessonScreen, StopScreen,
 * CheckScreen and the world check); play components read it with useKidMode() (null in classic play).
 *
 * The kid rendering of cards, boards, items and feedback draws wherever this context is set and the content has its
 * kid layer (LessonDef.kid for cards and boards, ItemBase.kid for an item). A round without a kid layer plays its
 * classic screens, still with no timer and no strip.
 */
import { createContext, useContext } from 'react';
import type { SaveData, Settings } from '../engine/save/save';
import { gradeById, isYoung, type GradeId, type KidBudget } from '../content/grades';

export interface KidMode {
  grade: GradeId;
  budget: KidBudget;
  /**
   * Read-aloud starts by itself on each new card and item, from the tap that opened it (browsers allow speech only
   * after a tap). On by default for Grades 1 and 2; the "Read aloud by itself" setting changes it.
   */
  autoRead: boolean;
}

export const KidModeContext = createContext<KidMode | null>(null);

export const useKidMode = (): KidMode | null => useContext(KidModeContext);

/** "Read aloud by itself" before a grown-up changes it: on for Grades 1 and 2, off otherwise. */
export function autoReadDefault(grade: GradeId | null | undefined): boolean {
  return isYoung(grade) && gradeById(grade).budget.autoRead;
}

/** Is "Read aloud by itself" on for these settings and this grade? It needs Read aloud on too. */
export function autoReadOn(settings: Settings, grade: GradeId | null | undefined): boolean {
  return settings.readAloud && (settings.autoRead ?? autoReadDefault(grade));
}

/** The kid mode for a save: set for a grade in Grades 1 to 3, null otherwise. */
export function kidModeOf(save: SaveData | null | undefined): KidMode | null {
  const g = save?.kid.grade;
  if (!save || !isYoung(g)) return null;
  return { grade: g, budget: gradeById(g).budget, autoRead: autoReadOn(save.settings, g) };
}

/** The check timer for a save: none for Grades 1 to 3, else the grown-up setting. */
export function checkSeconds(save: SaveData, seconds: number): number | null {
  if (kidModeOf(save)) return null;
  return save.settings.timer ? seconds : null;
}
