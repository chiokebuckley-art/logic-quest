/** Ring 2 (Clock Tower, Track 1): a cycle, counted by item position or by elapsed steps. */
import type { SceneStep } from './common';

/** One cycle face: its items, how this face counts, and what it asks about. */
export interface ClockFace {
  /** The cycle's items in order: ["A", "B", "C"] or the weekdays. */
  cycle: string[];
  /** Which kind of counting this face uses. Always shown as a label on the picture. */
  counting: 'position' | 'elapsed';
  /** Elapsed counting: the start item (step 0). Position counting: the first item is position 1. */
  start?: string;
  /** The n asked about (item n, or n steps after). */
  n?: number;
  /** The cycle index (0-based) to light, once revealed. */
  highlight?: number;
  /** The highlight shows once this many steps are showing (default: all of them). */
  litAt?: number;
  /** One line per cycle item, under the face: "A: positions 1, 5, 9 and so on". */
  captions?: string[];
  /** What one step is called: "days", "seasons", "slots" (default "steps"). */
  unit?: string;
}

export interface ClockScene extends ClockFace {
  kind: 'clock';
  /** A second face drawn beside the first, to compare the two ways of counting. */
  pair?: ClockFace;
  steps?: SceneStep[];
}
