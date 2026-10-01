/**
 * The Journey: 12 stops in first-principles order. Stops 1-3 are built in v0.1.0 and stops 4-6 in v0.2.0; the rest show as
 * "coming soon" with their key idea. Stops 11 and 12 will open on a side track after stop 7.
 */
import type { StopDef } from '../engine/types';
import { stop1 } from './stop1';
import { stop2 } from './stop2';
import { stop3 } from './stop3';
import { stop4 } from './stop4';
import { stop5 } from './stop5';
import { stop6 } from './stop6';

const soon = (n: number, title: string, idea: string): StopDef => ({ n, id: `s${n}`, title, idea, ready: false, lessons: [] });

export const STOPS: readonly StopDef[] = [
  stop1,
  stop2,
  stop3,
  stop4,
  stop5,
  stop6,
  soon(7, 'All, Some, None', '“Some” means at least one, and maybe all.'),
  soon(8, 'Truth Tables', 'Two sentences mean the same when they agree in every case.'),
  soon(9, 'Circuit Lab', 'Computers are built from tiny AND, OR and NOT switches.'),
  soon(10, 'Proof', 'A proof is a chain where every step must follow.'),
  soon(11, 'Spot the Trick', 'A reason can sound good and still not prove anything.'),
  soon(12, 'Clues & Chances', 'Ask how often you would see a clue if you were wrong.'),
];

export const stopById = (id: string) => STOPS.find((s) => s.id === id);
