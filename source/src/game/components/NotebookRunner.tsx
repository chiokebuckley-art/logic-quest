/**
 * Fixing Wrong-Answer Notebook cards ("repair quests"): for each card, a fresh question on its skill in learn
 * mode (after a miss: the explanation, a retry with help, then new examples on its own). After each one,
 * onFix(card, record) reports the try and says whether the card is now cleared, and a short note says what
 * happens next. Ends with a summary.
 * Like the other play components, it never touches the store: the screen passes data in and gets results back.
 */
import { useEffect, useRef, useState } from 'react';
import { seedFor } from '../../engine/journey/mastery';
import { FIX_GAPS, FIXES_TO_CLEAR, freshItem, type NoteCard } from '../../engine/notebook';
import type { Item, StopDef } from '../../engine/types';
import { skillName } from '../progressStats';
import type { AnswerRecord } from './contracts';
import { PlayHeader, type DotState } from './ItemView';
import { LearnItem } from './LearnItem';
import { PlayIcon } from './ThingCard';

export interface NotebookRunnerProps {
  /** The cards to fix, in order (the ready ones, oldest miss first). */
  cards: readonly NoteCard[];
  /** The stops to draw fresh questions from. */
  stops: readonly StopDef[];
  seed: number;
  readAloud: boolean;
  /** One fix try is finished. Returns true when that card is now cleared. */
  onFix(card: NoteCard, record: AnswerRecord): boolean;
  onExit(): void;
}

/** A clean fix is right on the first try. */
export const cleanFix = (r: Pick<AnswerRecord, 'correct' | 'firstTry'>) => r.correct && r.firstTry;

/** What happens to a card after one fix try. */
export function fixMessage(card: Pick<NoteCard, 'fixes'>, clean: boolean, cleared: boolean): string {
  if (cleared) return 'Fixed! This one is cleared.';
  if (!clean) return 'It comes back tomorrow.';
  const gap: number = FIX_GAPS[Math.min(card.fixes + 1, FIX_GAPS.length - 1)];
  return gap <= 1 ? 'Nice. It comes back tomorrow.' : `Nice. It comes back in ${gap} days.`;
}

type Step = { at: 'try'; i: number } | { at: 'after'; i: number; clean: boolean; cleared: boolean } | { at: 'done' };

const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function NotebookRunner({ cards, stops, seed, readAloud, onFix, onExit }: NotebookRunnerProps) {
  // One fresh question per card, fixed when the run starts (fixing a card moves its day, but not this list).
  // A card whose stop has no questions is left out.
  const [tries] = useState(() => {
    const out: { card: NoteCard; item: Item; stop: StopDef }[] = [];
    for (const card of cards) {
      const stop = stops.find((s) => s.n === card.stop);
      const item = stop ? freshItem(stop, card, seedFor(seed, card.skill)) : null;
      if (stop && item) out.push({ card, item, stop });
    }
    return out;
  });

  const [step, setStep] = useState<Step>(() => (tries.length ? { at: 'try', i: 0 } : { at: 'done' }));
  const [tally, setTally] = useState({ clean: 0, cleared: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const n = tries.length;
  const stepKey = step.at === 'done' ? 'done' : `${step.at}-${step.i}`;

  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    rootRef.current?.scrollIntoView?.({ block: 'start' });
    if (step.at !== 'try') headRef.current?.focus({ preventScroll: true });
  }, [stepKey]);

  const at = step.at === 'done' ? n : step.i;
  const dots: DotState[] = tries.map((_, k) => (k < at || (k === at && step.at === 'after') ? 'done' : k === at ? 'now' : 'todo'));

  const answered = (i: number, r: AnswerRecord) => {
    const clean = cleanFix(r);
    const cleared = onFix(tries[i].card, r);
    setTally((t) => ({ clean: t.clean + (clean ? 1 : 0), cleared: t.cleared + (cleared ? 1 : 0) }));
    setStep({ at: 'after', i, clean, cleared });
  };

  return (
    <div className="play-root" ref={rootRef}>
      <PlayHeader
        over="Notebook"
        title="Repair quests"
        onBack={onExit}
        backLabel="Back to the notebook"
        dots={n > 1 ? dots : undefined}
        dotsLabel={step.at === 'done' ? 'All done' : `Repair ${Math.min(at + 1, n)} of ${n}`}
      />

      {step.at === 'try' && tries[step.i] && (
        <LearnItem
          key={step.i}
          stop={tries[step.i].stop}
          item={tries[step.i].item}
          seed={seed + step.i * 13 + 5}
          readAloud={readAloud}
          kicker={`Repair ${step.i + 1} of ${n}`}
          onDone={(r) => answered(step.i, r)}
        />
      )}

      {step.at === 'after' && tries[step.i] && (
        <div className={`play-feedback ${step.cleared ? 'play-feedback--right' : step.clean ? 'play-feedback--shown' : 'play-feedback--wrong'} play-fixed`}>
          <span className="play-kicker">Repair {step.i + 1} of {n}</span>
          <h2 className="play-fixed-title" ref={headRef} tabIndex={-1}>
            {step.cleared && <PlayIcon name="check" size={22} />}
            <span>{fixMessage(tries[step.i].card, step.clean, step.cleared)}</span>
          </h2>
          <p>
            <strong>{upperFirst(skillName(tries[step.i].card.skill))}</strong>
            {' · '}Stop {tries[step.i].card.stop}
          </p>
          {!step.cleared && step.clean && (
            <p>
              Fixes done: {tries[step.i].card.fixes + 1} of {FIXES_TO_CLEAR}. Get it right on the first try {FIXES_TO_CLEAR} times to clear it.
            </p>
          )}
          {!step.clean && <p>A fix counts when you get it right on the first try. This card starts again from 0 fixes, with a new question tomorrow.</p>}
          <button
            type="button"
            className="play-btn play-btn--primary play-btn--block"
            onClick={() => setStep(step.i + 1 < n ? { at: 'try', i: step.i + 1 } : { at: 'done' })}
          >
            {step.i + 1 < n ? 'Next repair' : 'See how you did'}
          </button>
        </div>
      )}

      {step.at === 'done' && (
        <div className="play-card play-recap">
          <span className="play-kicker">Notebook</span>
          <h2 className="play-idea-title" ref={headRef} tabIndex={-1}>
            {n ? 'Repairs done' : 'Nothing to fix right now'}
          </h2>
          {n > 0 ? (
            <>
              <p className="play-body">
                You got {tally.clean} of {n} right on the first try.
              </p>
              {tally.cleared > 0 && (
                <p className="play-body">
                  {tally.cleared === 1 ? 'One card is' : `${tally.cleared} cards are`} now cleared from your notebook.
                </p>
              )}
              <p className="play-note">Cards that are not cleared yet come back on a later day, each time with a new question.</p>
            </>
          ) : (
            <p className="play-body">No card is ready yet. Each card shows the day it will be ready.</p>
          )}
          <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={onExit}>
            Back to the notebook
          </button>
        </div>
      )}
    </div>
  );
}
