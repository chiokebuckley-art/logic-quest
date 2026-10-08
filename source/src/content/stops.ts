/**
 * The Journey: 13 stops in first-principles order, then the Pattern Observatory (stops 14-17, a side constellation
 * that opens from the start and never blocks the main path). Stops 1-3 are built in v0.1.0, stops 4-6 in v0.2.0 and
 * stop 7 (Ways to Think) in v0.6.0; stops 8-13 show as "coming soon" with their key idea. Stops 12 and 13 will open
 * on a side track after stop 8.
 */
import type { StopDef } from '../engine/types';
import { stop1 } from './stop1';
import { stop2 } from './stop2';
import { stop3 } from './stop3';
import { stop4 } from './stop4';
import { stop5 } from './stop5';
import { stop6 } from './stop6';
import { stop7 } from './stop7';
import { stop14 } from './stop14';
import { stop15 } from './stop15';
import { stop16 } from './stop16';
import { stop17 } from './stop17';

const soon = (n: number, title: string, idea: string): StopDef => ({ n, id: `s${n}`, title, idea, ready: false, lessons: [] });

export const STOPS: readonly StopDef[] = [
  stop1,
  stop2,
  stop3,
  stop4,
  stop5,
  stop6,
  stop7,
  soon(8, 'All, Some, None', '“Some” means at least one, and maybe all.'),
  soon(9, 'Truth Tables', 'Two sentences mean the same when they agree in every case.'),
  soon(10, 'Circuit Lab', 'Computers are built from tiny AND, OR and NOT switches.'),
  soon(11, 'Proof', 'A proof is a chain where every step must follow.'),
  soon(12, 'Spot the Trick', 'A reason can sound good and still not prove anything.'),
  soon(13, 'Clues & Chances', 'Ask how often you would see a clue if you were wrong.'),
  stop14,
  stop15,
  stop16,
  stop17,
];

/** The Pattern Observatory's rings, in order. */
export const OBSERVATORY = STOPS.filter((s) => s.observatory);
/** A main-path or side-track stop (not the Observatory). */
export const isMainPath = (s: StopDef) => !s.observatory;

export const stopById = (id: string) => STOPS.find((s) => s.id === id);
