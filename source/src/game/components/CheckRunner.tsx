/**
 * A check (stop check, lock-in check or week check): the items one at a time in check mode, with no
 * feedback and no hints, then onFinish(records) with one record per item, in order. With the timer on,
 * each item gets its own time (item.seconds, else the timeLimit prop): big grids get longer.
 */
import { useEffect, useRef, useState } from 'react';
import type { CheckKind } from '../../engine/journey/mastery';
import type { Item } from '../../engine/types';
import type { AnswerRecord, CheckRunnerProps } from './contracts';
import { Dots, ItemView, PlayHeader, type DotState } from './ItemView';

export const CHECK_LABEL: Record<CheckKind, string> = {
  pass: 'Stop check',
  lockin: 'Lock-in check',
  week: 'Week check',
};

/** Seconds for one check item: its own `seconds` when it has them, else the check's. null = no timer. */
export function itemSeconds(item: Item | undefined, timeLimit: number | null): number | null {
  if (timeLimit === null || !item) return timeLimit;
  return item.seconds ?? timeLimit;
}

/** "90 seconds for this question" (big puzzles get more), or "No timer". */
export function timeNote(limit: number | null, timeLimit: number | null): string {
  if (!limit || !timeLimit) return 'No timer';
  return `${limit} seconds for this question`;
}

export function CheckRunner({ stop, kind, items, timeLimit, readAloud, onFinish, onExit, onProgress }: CheckRunnerProps) {
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const records = useRef<AnswerRecord[]>([]);
  const done = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  const n = items.length;
  const label = CHECK_LABEL[kind];

  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [i]);
  useEffect(() => {
    if (leaving) stayRef.current?.focus();
  }, [leaving]);

  const answered = (r: AnswerRecord) => {
    if (done.current) return;
    records.current = [...records.current.slice(0, i), r];
    setLeaving(false);
    if (i + 1 < n) {
      setI(i + 1);
      onProgress?.(records.current);
    } else {
      done.current = true;
      onFinish(records.current);
    }
  };

  const dots: DotState[] = items.map((_, k) => (k < i ? 'done' : k === i ? 'now' : 'todo'));
  const item = items[i];
  const limit = itemSeconds(item, timeLimit);

  return (
    <div className="play-root" ref={rootRef}>
      <PlayHeader
        over={`Stop ${stop.n} · ${stop.title}`}
        title={label}
        onBack={n ? () => setLeaving(true) : () => onExit([])}
        backLabel={`Leave the ${label.toLowerCase()}`}
        backRef={backRef}
      />

      {!item && (
        <div className="play-card">
          <p className="play-body">There are no questions in this check yet.</p>
          <button type="button" className="play-btn play-btn--ghost play-btn--block" onClick={() => onExit([])}>
            Go back
          </button>
        </div>
      )}

      {item && (
        <>
          <div className="play-progress">
            <Dots states={dots} label={`Question ${i + 1} of ${n}`} />
            <span className="play-muted">{timeNote(limit, timeLimit)}</span>
          </div>
          {i === 0 && <p className="play-note">Every answer must be right to pass. There are no hints in a check, so read each question with care.</p>}

          {leaving && (
            <div className="play-card play-confirm" role="alertdialog" aria-labelledby="play-leave-title" aria-describedby="play-leave-text">
              <h2 className="play-subhead" id="play-leave-title">
                Leave the {label.toLowerCase()}?
              </h2>
              <p className="play-body" id="play-leave-text">
                {i > 0
                  ? 'Leaving now counts as a try, the same as a “not yet.” Next time you will get new questions.'
                  : 'You have not answered anything yet, so leaving is fine.'}
              </p>
              <div className="play-actions">
                <button
                  ref={stayRef}
                  type="button"
                  className="play-btn play-btn--primary play-btn--grow"
                  onClick={() => {
                    setLeaving(false);
                    backRef.current?.focus();
                  }}
                >
                  Keep going
                </button>
                <button type="button" className="play-btn play-btn--ghost play-btn--grow" onClick={() => onExit(records.current.slice(0, i))}>
                  Leave
                </button>
              </div>
            </div>
          )}

          <ItemView
            key={i}
            item={item}
            mode="check"
            readAloud={readAloud}
            timeLimit={limit}
            kicker={`Question ${i + 1} of ${n}`}
            nextLabel={i + 1 < n ? 'Next' : 'Finish'}
            autoFocus={!leaving}
            onDone={answered}
          />
        </>
      )}
    </div>
  );
}

