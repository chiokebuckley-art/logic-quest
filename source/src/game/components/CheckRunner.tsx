/**
 * A check (stop check, lock-in check or week check): the items one at a time in check mode, with no
 * feedback and no hints, then onFinish(records) with one record per item, in order. With the timer on,
 * each item gets its own time (item.seconds, else the timeLimit prop): big grids get longer.
 * In kid mode (a world check, Grades 1 to 3) an item with a kid layer draws in kid words, and with read-aloud by
 * itself on, Next starts reading the next question and any tap stops it. A world check in kid mode (`ready`) opens on
 * a one-tap "Ready?" screen whose "Go" starts reading the first question. In kid mode each item is drawn as its
 * kid-only alternate when it has one (kidItemOf); the records keep the item's id.
 */
import { useEffect, useRef, useState } from 'react';
import type { CheckKind } from '../../engine/journey/mastery';
import type { Item } from '../../engine/types';
import { stopLabel } from '../../content/stops';
import type { AnswerRecord, CheckRunnerProps } from './contracts';
import { Dots, ItemView, PlayHeader, type DotState } from './ItemView';
import { useKidMode } from '../kidMode';
import { autoSay, kidItemOf, kidItemSpeech } from '../kidPlay';
import { stopSpeaking } from '../speech';

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

export function CheckRunner({ stop, kind, items, timeLimit, readAloud, onFinish, onExit, onProgress, header, note, ready = false }: CheckRunnerProps) {
  const [i, setI] = useState(0);
  const kidMode = useKidMode();
  /** The "Ready?" screen is up (kid mode, a world check): the first question waits for the "Go" tap. */
  const [waiting, setWaiting] = useState(ready && items.length > 0);
  /** A world check in kid mode: its questions are drawn under the same chrome budget as a round's. */
  const kidPlay = ready && !!kidMode;
  const readyRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (waiting) readyRef.current?.focus({ preventScroll: true });
  }, []);
  const [leaving, setLeaving] = useState(false);
  const records = useRef<AnswerRecord[]>([]);
  const done = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);
  const n = items.length;
  const label = header?.title ?? CHECK_LABEL[kind];

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
      autoSay(kidMode, kidItemSpeech(kidItemOf(items[i + 1], kidMode)));
      onProgress?.(records.current);
    } else {
      done.current = true;
      onFinish(records.current);
    }
  };

  const dots: DotState[] = items.map((_, k) => (k < i ? 'done' : k === i ? 'now' : 'todo'));
  /** The question on screen: in kid mode its kid-only alternate when it has one. */
  const item = items[i] ? kidItemOf(items[i], kidMode) : undefined;
  const limit = itemSeconds(item, timeLimit);

  return (
    <div className="play-root" ref={rootRef} onPointerDownCapture={kidMode?.autoRead ? () => stopSpeaking() : undefined}>
      <PlayHeader
        over={ready && kidMode ? undefined : header?.over ?? `${stopLabel(stop)} · ${stop.title}`}
        title={label}
        onBack={n && !waiting ? () => setLeaving(true) : () => onExit([])}
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

      {item && waiting && (
        <section className="play-card kid-star-screen kid-ready" aria-labelledby="kid-ready-title">
          <h2 className="play-idea-title kid-star-title" id="kid-ready-title" ref={readyRef} tabIndex={-1}>
            Ready?
          </h2>
          {note && <p className="kid-line-small">{note}</p>}
          <button
            type="button"
            className="play-btn play-btn--primary play-btn--block kid-big-btn"
            onClick={() => {
              setWaiting(false);
              // The first question is read aloud by itself from this tap (Grades 1 and 2).
              autoSay(kidMode, kidItemSpeech(kidItemOf(items[0], kidMode)));
            }}
          >
            Go
          </button>
        </section>
      )}

      {item && !waiting && (
        <>
          <div className="play-progress">
            <Dots states={dots} label={`Question ${i + 1} of ${n}`} />
            {/* A kid world check has no timer and says nothing about it: its header and the dots are the only chrome. */}
            {!(kidPlay && !(limit && timeLimit)) && <span className="play-muted">{timeNote(limit, timeLimit)}</span>}
          </div>
          {/* Kid mode: no note over the first question (a world check's "Ready?" screen says it). */}
          {i === 0 && !ready && !kidMode && <p className="play-note">{note ?? 'Every answer must be right to pass. There are no hints in a check, so read each question with care.'}</p>}

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
            // Kid mode: no "Question k of n" over the question (the dots say it to screen readers), so a world check
            // question carries less chrome than the round it comes from ("World check" vs "Round k of n").
            kicker={kidPlay ? '' : `Question ${i + 1} of ${n}`}
            nextLabel={i + 1 < n ? 'Next' : 'Finish'}
            autoFocus={!leaving}
            onDone={answered}
          />
        </>
      )}
    </div>
  );
}
