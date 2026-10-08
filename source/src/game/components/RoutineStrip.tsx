/**
 * The learner routine of the Pattern Observatory, as a chip strip on every screen of an Observatory lesson:
 * Notice → Describe → Compare → Test → Predict → Explain, with the moves of the current phase lit.
 * See: Notice, Describe. Explain: Compare, Explain. Do: Describe, Predict. Transfer: Test, Predict. Review: all six.
 */
import type { Phase } from '../../engine/types';
import { ROUTINE } from '../pattern/bridges';

/** The one routine, shared with the Pattern Lab bridges and the Workshop (src/game/pattern/bridges.ts). */
export const OBSERVATORY_ROUTINE = ROUTINE;
export type RoutineMove = (typeof OBSERVATORY_ROUTINE)[number];

export const PHASE_MOVES: Record<Phase | 'see', readonly RoutineMove[]> = {
  see: ['Notice', 'Describe'],
  explain: ['Compare', 'Explain'],
  do: ['Describe', 'Predict'],
  transfer: ['Test', 'Predict'],
  review: [...OBSERVATORY_ROUTINE],
};

export const PHASE_NAMES: Record<Phase | 'see', string> = { see: 'See', explain: 'Explain', do: 'Do', transfer: 'Transfer', review: 'Review' };

/** One line of what each move asks, for the strip's title and the read-aloud. */
export const MOVE_ASKS: Record<RoutineMove, string> = {
  Notice: 'What repeats? What changes? Which features matter?',
  Describe: 'State the rule precisely.',
  Compare: 'Name a second rule, or a near miss, that fits the same data.',
  Test: 'Pick the observation that separates the rules.',
  Predict: 'Predict before the reveal: from a stated rule, or only plausible?',
  Explain: 'Why it fits, what would break it: proof, tentative, or unclear?',
};

export function RoutineStrip({ at }: { at: Phase | 'see' }) {
  const lit = PHASE_MOVES[at];
  return (
    <ol className="play-routine-strip" aria-label={`The routine. Now: ${PHASE_NAMES[at]}: ${lit.join(' and ')}.`}>
      {OBSERVATORY_ROUTINE.map((m, i) => (
        <li key={m} className={`play-routine-chip${lit.includes(m) ? ' is-lit' : ''}`} title={MOVE_ASKS[m]} aria-current={lit.includes(m) ? 'step' : undefined}>
          <span className="play-routine-n" aria-hidden="true">{i + 1}</span>
          {m}
        </li>
      ))}
    </ol>
  );
}
