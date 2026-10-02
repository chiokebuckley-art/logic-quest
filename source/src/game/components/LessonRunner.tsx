/**
 * A lesson: the key-idea cards first, then the lesson's practice tries one at a time (learn mode),
 * then a short "Lesson done" recap. onComplete() runs when the player leaves the recap.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRng } from '../../engine/rng';
import type { LessonDef, StopDef } from '../../engine/types';
import type { AnswerRecord, LessonRunnerProps } from './contracts';
import { IdeaCards } from './IdeaCards';
import { PlayHeader, type DotState } from './ItemView';
import { LearnItem } from './LearnItem';
import { ROUTINE } from '../pattern/bridges';

/** The thinking routine shared with Pattern Lab, as one line under the key idea. */
function RoutineLine() {
  return (
    <div className="play-routine">
      <img src={`${import.meta.env.BASE_URL}artwork/pl-icon-notice.webp`} alt="" />
      <span><b>{ROUTINE.join(' → ')}</b> · the same routine as Pattern Lab</span>
    </div>
  );
}

type Step = { at: 'ideas' } | { at: 'try'; i: number } | { at: 'recap' };

export interface LessonRecapProps {
  stop: StopDef;
  lesson: LessonDef;
  tries: number;
  firstTry: number;
  onDone(): void;
}

/** The short screen at the end of a lesson. */
export function LessonRecap({ stop, lesson, tries, firstTry, onDone }: LessonRecapProps) {
  const k = stop.lessons.findIndex((l) => l.id === lesson.id);
  const nextLesson = k >= 0 ? stop.lessons[k + 1] : undefined;
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="play-card play-recap">
      <span className="play-kicker">Lesson done</span>
      <h2 className="play-idea-title" ref={headRef} tabIndex={-1}>
        {lesson.title}
      </h2>
      {tries > 0 && (
        <p className="play-body">
          You finished all {tries} questions. You got {firstTry} of {tries} right on the first try.
        </p>
      )}
      {lesson.ideas.length > 0 && (
        <div className="play-recap-ideas">
          <h3 className="play-subhead">What you learned</h3>
          <ul className="play-list">
            {lesson.ideas.filter((c) => !/^(an? )?(worked )?example\b/i.test(c.title)).map((c, i) => (
              <li key={i}>{c.title}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="play-note">
        {nextLesson ? (
          <>
            Next: <strong>Lesson {k + 2} · {nextLesson.title}</strong>
          </>
        ) : (
          <>That was the last lesson in Stop {stop.n}. When every lesson is done, the stop check opens.</>
        )}
      </p>
      <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

export function LessonRunner({ stop, lesson, seed, readAloud, onAnswer, onComplete, onExit, start, onProgress }: LessonRunnerProps) {
  const items = useMemo(() => lesson.practice(createRng(seed)), [lesson, seed]);
  const [step, setStep] = useState<Step>(() => {
    if (start && start.next > 0 && start.next < items.length) return { at: 'try', i: start.next };
    return lesson.ideas.length ? { at: 'ideas' } : items.length ? { at: 'try', i: 0 } : { at: 'recap' };
  });
  const [firstTry, setFirstTry] = useState(start && start.next > 0 && start.next < items.length ? start.firstTry : 0);
  const resumed = !!start && start.next > 0 && start.next < items.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  const stepKey = step.at === 'try' ? `try-${step.i}` : step.at;
  const moved = useRef(false);

  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [stepKey]);

  const k = stop.lessons.findIndex((l) => l.id === lesson.id);
  const over = `Stop ${stop.n} · Lesson ${k >= 0 ? k + 1 : 1} of ${Math.max(1, stop.lessons.length)}`;

  // One dot for the key ideas, one per try.
  const pos = step.at === 'ideas' ? 0 : step.at === 'try' ? step.i + 1 : items.length + 1;
  const dots: DotState[] = [0, ...items.map((_, i) => i + 1)].map((d) => (d < pos ? 'done' : d === pos ? 'now' : 'todo'));
  const dotsLabel = step.at === 'ideas' ? 'Key ideas' : step.at === 'try' ? `Try ${step.i + 1} of ${items.length}` : 'Lesson done';

  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  };

  const answered = (i: number, r: AnswerRecord) => {
    onAnswer(r);
    const wins = firstTry + (r.firstTry ? 1 : 0);
    setFirstTry(wins);
    onProgress?.(i + 1, wins);
    setStep(i + 1 < items.length ? { at: 'try', i: i + 1 } : { at: 'recap' });
  };

  return (
    <div className="play-root" ref={rootRef}>
      <PlayHeader
        over={over}
        title={lesson.title}
        onBack={step.at === 'recap' ? finish : onExit}
        backLabel={step.at === 'recap' ? 'Finish the lesson' : 'Leave the lesson'}
        dots={dots}
        dotsLabel={dotsLabel}
      />
      {step.at === 'ideas' && (
        <IdeaCards
          cards={lesson.ideas}
          readAloud={readAloud}
          doneLabel={items.length ? `Try it ▸ ${items.length} ${items.length === 1 ? 'puzzle' : 'puzzles'}` : 'Try it'}
          doneNote={k === stop.lessons.length - 1 ? 'Then the stop check opens' : `Then Lesson ${k + 2}`}
          after={<RoutineLine />}
          onDone={() => setStep(items.length ? { at: 'try', i: 0 } : { at: 'recap' })}
        />
      )}
      {resumed && step.at === 'try' && step.i === start!.next && (
        <p className="play-fresh-note" role="status">
          Welcome back. You are on try {step.i + 1} of {items.length}. Your earlier answers are saved.
        </p>
      )}
      {step.at === 'try' && items[step.i] && (
        <LearnItem
          key={step.i}
          stop={stop}
          item={items[step.i]}
          seed={seed + (step.i + 1) * 7}
          readAloud={readAloud}
          kicker={`Try ${step.i + 1} of ${items.length}`}
          nextLabel={step.i + 1 < items.length ? 'Next' : 'Finish'}
          onDone={(r) => answered(step.i, r)}
        />
      )}
      {step.at === 'recap' && <LessonRecap stop={stop} lesson={lesson} tries={items.length} firstTry={firstTry} onDone={finish} />}
    </div>
  );
}
