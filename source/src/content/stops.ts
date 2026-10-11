/**
 * The Journey: the main path in first-principles order (True or False?, then Arguments, then NOT, AND, OR and on),
 * a side track of two stops that opens after All, Some, None, and the Pattern Observatory (four rings, a side
 * constellation whose rings open after the stops they build on). Every stop is built.
 *
 * A stop's id and its `n` field never change, so every save keeps its progress. What the learner sees is the shown
 * number: its place on the Journey (stopNumber). Arguments has id s18 and n 18 but is shown as Stop 2.
 */
import type { StopDef } from '../engine/types';
import { stop1 } from './stop1';
import { stop2 } from './stop2';
import { stop3 } from './stop3';
import { stop4 } from './stop4';
import { stop5 } from './stop5';
import { stop6 } from './stop6';
import { stop7 } from './stop7';
import { stop8 } from './stop8';
import { stop9 } from './stop9';
import { stop10 } from './stop10';
import { stop12 } from './stop12';
import { stop13 } from './stop13';
import { stop11 } from './stop11';
import { stop14 } from './stop14';
import { stop15 } from './stop15';
import { stop16 } from './stop16';
import { stop17 } from './stop17';
import { stop18 } from './stop18';

export const STOPS: readonly StopDef[] = [
  stop1,
  stop18,
  stop2,
  stop3,
  stop4,
  stop5,
  stop6,
  stop7,
  stop8,
  stop9,
  stop10,
  stop11,
  stop12,
  stop13,
  stop14,
  stop15,
  stop16,
  stop17,
];

/** The Pattern Observatory's rings, in order. */
export const OBSERVATORY = STOPS.filter((s) => s.observatory);
/** A main-path or side-track stop (not the Observatory). */
export const isMainPath = (s: StopDef) => !s.observatory;
/** The main path and the side track, in Journey order: the stops that get a shown number. */
const NUMBERED = STOPS.filter(isMainPath);

export const stopById = (id: string) => STOPS.find((s) => s.id === id);
/** The stop with this stored number (Item.stop, NoteCard.stop, a skill's "sN." prefix). */
export const stopByN = (n: number) => STOPS.find((s) => s.n === n);

/**
 * The number the learner sees for a stop: its place on the Journey, counting the main path and the side track
 * (Arguments, id s18, is Stop 2). An Observatory ring has no stop number of its own; it gets the places after the
 * last numbered stop, in ring order, so numbers stay unique and sort in Journey order. Show a ring as "Ring k"
 * (see stopLabel), never by this number.
 */
export function stopNumber(stop: StopDef): number {
  const i = NUMBERED.findIndex((s) => s.id === stop.id);
  if (i >= 0) return i + 1;
  if (stop.observatory) return NUMBERED.length + stop.observatory.ring;
  return stop.n;
}

/** The shown number for a stored stop number. An unknown number is shown as it is. */
export function stopNumberOf(n: number): number {
  const stop = stopByN(n);
  return stop ? stopNumber(stop) : n;
}

/** How the learner sees a stop's place: "Stop 3", or "Ring 2" for an Observatory ring. */
export function stopLabel(stop: StopDef): string {
  return stop.observatory ? `Ring ${stop.observatory.ring}` : `Stop ${stopNumber(stop)}`;
}

/** stopLabel for a stored stop number. An unknown number reads "Stop n". */
export function stopLabelOf(n: number): string {
  const stop = stopByN(n);
  return stop ? stopLabel(stop) : `Stop ${n}`;
}
