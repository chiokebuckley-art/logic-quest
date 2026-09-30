/**
 * Arcade practice: endless items from one stop in learn mode (feedback, hints, "Show me"),
 * item i drawn with createRng(seed + i), and a running count of first-try wins.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRng } from '../../engine/rng';
import type { PracticeRunnerProps } from './contracts';
import { ItemView, PlayHeader } from './ItemView';

export function PracticeRunner({ stop, seed, readAloud, onAnswer, onExit }: PracticeRunnerProps) {
  const [i, setI] = useState(0);
  const [tally, setTally] = useState({ done: 0, firstTry: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const item = useMemo(() => (stop.practice ? stop.practice(createRng(seed + i)) : null), [stop, seed, i]);

  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [i]);

  return (
    <div className="play-root" ref={rootRef}>
      <PlayHeader over="Arcade · Practice" title={`Stop ${stop.n} · ${stop.title}`} onBack={onExit} backLabel="Back to the Arcade" />

      <div className="play-progress">
        <div className="play-progress-text">
          {tally.done === 0 ? (
            <span className="play-muted">Solve as many puzzles as you like. Use the back button when you are done.</span>
          ) : (
            <strong>
              Right on the first try: {tally.firstTry} of {tally.done}
            </strong>
          )}
        </div>
      </div>

      {!item && (
        <div className="play-card">
          <p className="play-body">Practice for this stop is not ready yet.</p>
        </div>
      )}

      {item && (
        <ItemView
          key={i}
          item={item}
          mode="learn"
          readAloud={readAloud}
          kicker={`Puzzle ${i + 1}`}
          onDone={(r) => {
            onAnswer(r);
            setTally((t) => ({ done: t.done + 1, firstTry: t.firstTry + (r.firstTry ? 1 : 0) }));
            setI((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

