/**
 * One learn-mode question, from the first answer to the end of its teaching:
 *
 *   1. The item. Right on the first try: done.
 *   2. A miss: the explanation at once, then "Try this question again". A right retry is practice with help.
 *   3. New examples on the same skill (engine/fresh.ts), answered on their own. A stop can ask for a set
 *      (two NOT-flip comparisons, one with a tie and one without); all of them must be right, with no hint.
 *   4. A miss on a new example shows its explanation and its simpler example, then another new set.
 *      From the second miss on, "Move on for now" is offered too; the skill then waits in the notebook.
 *
 * The host gets one record for the item: right on the first try, or right on a new set without help.
 * Anything else is a miss for the notebook. `help` keeps the first try, the retry and the new examples apart.
 */
import { useMemo, useRef, useState } from 'react';
import { freshCheckSet } from '../../engine/fresh';
import type { Item, StopDef } from '../../engine/types';
import type { AnswerRecord, ItemMode } from './contracts';
import { ItemView } from './ItemView';

export interface LearnItemProps {
  stop: StopDef;
  item: Item;
  /** Seed for the new examples. */
  seed: number;
  readAloud: boolean;
  kicker?: string;
  nextLabel?: string;
  autoFocus?: boolean;
  onDone(record: AnswerRecord): void;
  /** The item's first answer was wrong (it is not finished yet). */
  onMiss?(): void;
  /** This try already had a miss before it was left: it never counts as a first try. */
  priorMiss?: boolean;
  /** For tests: the new examples to use instead of the engine's. */
  freshFor?(round: number, avoid: readonly Item[]): Item[];
}

type Step = { at: 'first' } | { at: 'fresh'; round: number; set: Item[]; i: number };

/** The only help was fixing a mark on the question's own board (no wrong answer, no explanation). */
const boardOnly = (r: AnswerRecord) => !!r.help?.boardFixed && !r.help.explained;

const MODE: ItemMode = 'learn';

export function LearnItem({ stop, item, seed, readAloud, kicker, nextLabel = 'Next', autoFocus = true, onDone, onMiss, priorMiss = false, freshFor }: LearnItemProps) {
  const [step, setStep] = useState<Step>({ at: 'first' });
  const first = useRef<AnswerRecord | null>(null);
  const shown = useRef<Item[]>([]);
  const tally = useRef({ fresh: 0, misses: 0, hint: false, simpler: false });
  /** A hint was used in the current round of new examples. */
  const roundHint = useRef(false);
  const done = useRef(false);

  const newSet = (round: number): Item[] => {
    const set = freshFor ? freshFor(round, shown.current) : freshCheckSet(stop, item, seed + round * 15485863, shown.current, round);
    shown.current = [...shown.current, ...set];
    return set;
  };

  const finish = (passed: boolean, moveOn = false) => {
    if (done.current || !first.current) return;
    done.current = true;
    const r = first.current;
    const t = tally.current;
    onDone({
      ...r,
      // Right on the first answer after fixing the question's own board: right, but not a first try.
      correct: r.firstTry || passed || (boardOnly(r) && r.correct),
      help: {
        explained: r.help?.explained ?? false,
        simpler: (r.help?.simpler ?? false) || t.simpler,
        hint: (r.help?.hint ?? false) || t.hint,
        retried: r.help?.retried ?? false,
        fresh: t.fresh,
        freshPassed: passed,
        ...(moveOn ? { moveOn: true } : {}),
        ...(r.help?.boardFixed ? { boardFixed: true } : {}),
        ...(r.help?.gap ? { gap: r.help.gap } : {}),
      },
    });
  };

  const afterFirst = (r: AnswerRecord) => {
    first.current = r;
    // The board already taught its fix: an answer right at once after it needs no new examples.
    if (r.firstTry || (boardOnly(r) && r.correct)) return finish(false);
    const set = newSet(1);
    if (!set.length) return finish(false);
    setStep({ at: 'fresh', round: 1, set, i: 0 });
  };

  const afterFresh = (s: Extract<Step, { at: 'fresh' }>, r: AnswerRecord) => {
    const t = tally.current;
    t.fresh += 1;
    t.hint ||= !!r.help?.hint;
    t.simpler ||= !!r.help?.simpler;
    if (r.correct) {
      if (s.i + 1 < s.set.length) return setStep({ ...s, i: s.i + 1 });
      // The whole set is right. It counts only without a hint in this round.
      return finish(!roundHint.current);
    }
    t.misses += 1;
    if (r.help?.moveOn) return finish(false, true);
    const set = newSet(s.round + 1);
    if (!set.length) return finish(false);
    roundHint.current = false;
    setStep({ at: 'fresh', round: s.round + 1, set, i: 0 });
  };

  const firstView = useMemo(
    () => (
      <ItemView
        item={item}
        mode={MODE}
        readAloud={readAloud}
        kicker={kicker}
        nextLabel={nextLabel}
        afterHelpLabel="Try a new example"
        autoFocus={autoFocus}
        onMiss={onMiss}
        priorMiss={priorMiss}
        onDone={afterFirst}
      />
    ),
    // The first view lives until the new examples start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item],
  );

  if (step.at === 'first') return firstView;

  const s = step;
  const current = s.set[s.i];
  const many = s.set.length > 1;
  return (
    <div className="play-stack-sm">
      {s.i === 0 && (
        <p className="play-fresh-note" role="status">
          {s.round === 1
            ? many
              ? `Now try ${s.set.length} new examples on your own.`
              : 'Now try a new example on your own.'
            : 'Here is another new example. Take your time.'}
        </p>
      )}
      <ItemView
        key={current.id}
        item={current}
        mode={MODE}
        stage="fresh"
        readAloud={readAloud}
        kicker={many ? `New example ${s.i + 1} of ${s.set.length}` : 'New example'}
        nextLabel={s.i + 1 < s.set.length ? 'Next example' : nextLabel}
        canMoveOn={tally.current.misses >= 1}
        onDone={(r) => {
          if (r.help?.hint) roundHint.current = true;
          afterFresh(s, r);
        }}
      />
    </div>
  );
}
