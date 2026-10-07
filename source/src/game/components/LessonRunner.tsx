/**
 * A lesson, See -> Do -> Quiz: the key-idea cards (ending on a worked example with one case marked), then the
 * guided boards the learner marks by taps, then the quiz tries one at a time (learn mode), then a short recap.
 * The lesson is passed only when the boards are marked right and the pass rule is met (default: 3 right on the
 * first try with no hint); extra quiz items from the same lesson come until it is. onComplete() runs when the
 * player leaves the recap of a passed lesson. Tapping Next through the cards never passes it.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { extraQuizItem, passGoal, passState, type QuizResult } from '../../engine/drill';
import { createRng } from '../../engine/rng';
import { MAX_RUN } from '../../engine/save/save';
import type { Item, LessonDef, StopDef } from '../../engine/types';
import type { AnswerRecord, LessonRunnerProps } from './contracts';
import { DrillBoard } from './DrillBoard';
import { IdeaCards } from './IdeaCards';
import { PlayHeader, type DotState } from './ItemView';
import { LearnItem } from './LearnItem';
import { ROUTINE } from '../pattern/bridges';
import { lessonWorld } from '../../content/world';

/** The thinking routine shared with Pattern Lab, as one line under the key idea. */
function RoutineLine() {
  return (
    <div className="play-routine">
      <img src={`${import.meta.env.BASE_URL}artwork/pl-icon-notice.webp`} alt="" />
      <span><b>{ROUTINE.join(' → ')}</b> · the same routine as Pattern Lab</span>
    </div>
  );
}

/** One stretch of key-idea cards (from..to, inclusive), or one guided board. */
export type Stage = { kind: 'cards'; from: number; to: number } | { kind: 'board'; j: number };

/**
 * The key ideas and guided boards in order. A board comes after the last card, or right after the card its
 * afterCard names, so the Do can sit next to its See. Boards keep their order.
 */
export function lessonStages(lesson: LessonDef): Stage[] {
  const n = lesson.ideas.length;
  const drill = lesson.drill ?? [];
  let floor = 0;
  const after = drill.map((st) => {
    const a = Math.max(floor, Math.min(n - 1, st.afterCard ?? n - 1));
    floor = a;
    return a;
  });
  const stages: Stage[] = [];
  let from = 0;
  for (let c = 0; c < n; c++) {
    const here = after.flatMap((a, j) => (a === c ? [j] : []));
    if (!here.length) continue;
    stages.push({ kind: 'cards', from, to: c });
    from = c + 1;
    for (const j of here) stages.push({ kind: 'board', j });
  }
  if (from < n) stages.push({ kind: 'cards', from, to: n - 1 });
  if (n === 0) drill.forEach((_, j) => stages.push({ kind: 'board', j }));
  return stages;
}

type Step = { at: 'stage'; s: number } | { at: 'try'; i: number } | { at: 'recap' };

/**
 * The lesson's quiz items: the planned practice, then one extra item each time the planned ones are all answered
 * and the pass rule is not met yet. Rebuilt the same way from the same answers, so a resumed lesson gets the same
 * items. `count` is how many items are needed so far.
 */
export function lessonItems(lesson: LessonDef, seed: number, results: readonly QuizResult[], count: number): Item[] {
  const items = [...lesson.practice(createRng(seed))];
  for (let k = 0; items.length < Math.min(count, MAX_RUN) && k < MAX_RUN; k++) {
    const st = passState(lesson.pass, results.slice(0, items.length));
    const x = extraQuizItem(lesson, seed, items, st.missing.map((m) => m.tag), k);
    if (!x) break;
    items.push(x);
  }
  return items;
}

export interface LessonRecapProps {
  stop: StopDef;
  lesson: LessonDef;
  tries: number;
  firstTry: number;
  /** The pass rule is met (and the boards are done). Otherwise the recap says what is still needed. */
  passed?: boolean;
  onDone(): void;
  /** Not passed, and no more quiz items in this run: offer to start the lesson again. */
  onRestart?(): void;
}

/** The short screen at the end of a lesson. */
export function LessonRecap({ stop, lesson, tries, firstTry, passed = true, onDone, onRestart }: LessonRecapProps) {
  const k = stop.lessons.findIndex((l) => l.id === lesson.id);
  const world = lessonWorld(lesson.id);
  const nextLesson = k >= 0 ? stop.lessons[k + 1] : undefined;
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="play-card play-recap">
      <span className="play-kicker">{passed ? 'Lesson done' : 'Not done yet'}</span>
      <h2 className="play-idea-title" ref={headRef} tabIndex={-1}>
        {lesson.title}
      </h2>
      {tries > 0 && (
        <p className="play-body">
          You finished {tries} {tries === 1 ? 'question' : 'questions'}. You got {firstTry} of {tries} right on the first try.
        </p>
      )}
      {!passed && (
        <p className="play-body">
          {onRestart
            ? `To finish this lesson, get ${passGoal(lesson.pass)}. Start it again with new puzzles. The key ideas and the board come first.`
            : `To finish this lesson, get ${passGoal(lesson.pass)}. Come back to try again. Your place is saved.`}
        </p>
      )}
      {passed && lesson.ideas.length > 0 && (
        <div className="play-recap-ideas">
          <h3 className="play-subhead">What you learned</h3>
          <ul className="play-list">
            {lesson.ideas.filter((c) => !/^(an? )?(worked )?example\b/i.test(c.title)).map((c, i) => (
              <li key={i}>{c.title}</li>
            ))}
          </ul>
        </div>
      )}
      {passed && world && <RealLife world={world} />}
      {passed && (
        <p className="play-note">
          {nextLesson ? (
            <>
              Next: <strong>Lesson {k + 2} · {nextLesson.title}</strong>
            </>
          ) : (
            <>That was the last lesson in Stop {stop.n}. When every lesson is done, the stop check opens.</>
          )}
        </p>
      )}
      <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={!passed && onRestart ? onRestart : onDone}>
        {passed ? 'Done' : onRestart ? 'Start the lesson again' : 'Leave for now'}
      </button>
    </div>
  );
}

/** Where the lesson's idea is used, and why it matters: the last screen of a passed lesson. */
export function RealLife({ world }: { world: NonNullable<ReturnType<typeof lessonWorld>> }) {
  return (
    <section className="play-real" aria-labelledby="real-title">
      <h3 id="real-title" className="play-subhead">Where this is used</h3>
      <ul className="play-real-list">
        {world.uses.map((u) => (
          <li key={u.who}>
            <strong>{u.who}.</strong> {u.text}
          </li>
        ))}
      </ul>
      <p className="play-why">
        <span className="play-why-label">Keep in mind</span> {world.why}
      </p>
    </section>
  );
}

export function LessonRunner({ stop, lesson, seed, readAloud, onAnswer, onComplete, onExit, onDrilled, start, onProgress, onRestart }: LessonRunnerProps) {
  const drill = lesson.drill ?? [];
  const planned = useMemo(() => lesson.practice(createRng(seed)).length, [lesson, seed]);
  const resumed = !!start && (start.next > 0 || !!start.drilled);
  const [results, setResults] = useState<QuizResult[]>(() => (resumed ? (start!.results ?? []).slice(0, start!.next) : []));
  const [items, setItems] = useState<Item[]>(() => {
    if (!resumed || start!.next < planned) return lessonItems(lesson, seed, [], planned);
    const met = passState(lesson.pass, start!.results ?? []).met;
    return lessonItems(lesson, seed, start!.results ?? [], start!.next + (met ? 0 : 1));
  });
  /** The guided boards are marked right in this run (or the lesson has none). */
  const [drilled, setDrilled] = useState(() => drill.length === 0 || (resumed && !!start!.drilled));
  /** Where the quiz starts once the boards are done: try 0, or the try a resumed lesson was on. */
  const resumeAt = resumed ? Math.min(start!.next, items.length) : 0;
  const stages = useMemo(() => lessonStages(lesson), [lesson]);
  const lastBoard = stages.reduce((at, st, s) => (st.kind === 'board' ? s : at), -1);
  const [step, setStep] = useState<Step>(() => {
    if (resumed) {
      // A lesson left before its boards were marked (or an older save) starts again at its first board.
      if (drill.length && !start!.drilled) return { at: 'stage', s: stages.findIndex((st) => st.kind === 'board') };
      return resumeAt < items.length ? { at: 'try', i: resumeAt } : { at: 'recap' };
    }
    if (stages.length) return { at: 'stage', s: 0 };
    return items.length ? { at: 'try', i: 0 } : { at: 'recap' };
  });
  const [firstTry, setFirstTry] = useState(resumed ? start!.firstTry : 0);
  /** Tries whose first answer was already wrong (also before a reload): they never count as first tries. */
  const lost = useRef(new Set<number>(resumed && start!.missed !== undefined && start!.missed === start!.next ? [start!.missed] : []));
  /** No more quiz items can come in this run, and the pass rule is not met. */
  const [outOfItems, setOutOfItems] = useState(() => resumed && resumeAt >= items.length && !passState(lesson.pass, start!.results ?? []).met);
  const rootRef = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  const stepKey = step.at === 'try' ? `try-${step.i}` : step.at === 'stage' ? `stage-${step.s}` : step.at;
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
  const pass = passState(lesson.pass, results);
  const passed = drilled && pass.met;

  // One dot per stretch of key ideas, one per guided board, one per try.
  const pos = step.at === 'stage' ? step.s : step.at === 'try' ? stages.length + step.i : stages.length + items.length;
  const dots: DotState[] = Array.from({ length: stages.length + items.length }, (_, d) => (d < pos ? 'done' : d === pos ? 'now' : 'todo'));
  const tryLabel = (i: number) => (i < planned ? `Try ${i + 1} of ${planned}` : `Extra try ${i - planned + 1}`);
  const boardNo = (s: number) => stages.slice(0, s + 1).filter((st) => st.kind === 'board').length;
  const here = step.at === 'stage' ? stages[step.s] : null;
  const dotsLabel = here ? (here.kind === 'cards' ? 'Key ideas' : `Do it ${boardNo(step.at === 'stage' ? step.s : 0)} of ${drill.length}`) : step.at === 'try' ? tryLabel(step.i) : passed ? 'Lesson done' : 'Not done yet';

  /** After stage s: the next stage, or the quiz. Leaving the last board records the boards as done. */
  const nextStage = (s: number) => {
    if (s === lastBoard && !drilled) {
      setDrilled(true);
      onDrilled?.();
      onProgress?.({ next: resumeAt, firstTry, drilled: true, results });
    }
    if (s + 1 < stages.length) setStep({ at: 'stage', s: s + 1 });
    else setStep(resumeAt < items.length ? { at: 'try', i: resumeAt } : { at: 'recap' });
  };

  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    if (passed) onComplete();
    else onExit();
  };

  const answered = (i: number, r: AnswerRecord) => {
    onAnswer(r);
    const wins = firstTry + (r.firstTry ? 1 : 0);
    const now = [...results.slice(0, i), { clean: r.firstTry && !r.help?.hint && !lost.current.has(i), tags: items[i]?.tags ?? [] }];
    setFirstTry(wins);
    setResults(now);
    onProgress?.({ next: i + 1, firstTry: wins, drilled: true, results: now });
    if (i + 1 < items.length) {
      setStep({ at: 'try', i: i + 1 });
      return;
    }
    if (passState(lesson.pass, now).met) {
      setStep({ at: 'recap' });
      return;
    }
    // Not passed yet: one more quiz item from the same lesson (a tag the rule still needs comes first).
    const more = lessonItems(lesson, seed, now, items.length + 1);
    if (more.length > items.length) {
      setItems(more);
      setStep({ at: 'try', i: i + 1 });
    } else {
      setOutOfItems(true);
      setStep({ at: 'recap' });
    }
  };

  /** The last card's button and note in a stretch of key ideas: what comes next. */
  const cardsDone = (s: number) => {
    const next = stages[s + 1];
    if (next?.kind === 'board') {
      const title = drill[next.j].title.replace(/[.!?]$/, '').toLowerCase();
      const more = stages.slice(s + 2).filter((st) => st.kind === 'board').length;
      return {
        label: 'Now you do it',
        note: `Next you do it: ${title}${more ? `, then ${more} more ${more === 1 ? 'board' : 'boards'}` : ''}. Then ${planned} ${planned === 1 ? 'puzzle' : 'puzzles'}.`,
      };
    }
    if (next) return { label: 'Next', note: undefined };
    return {
      label: items.length ? `Try it ▸ ${planned} ${planned === 1 ? 'puzzle' : 'puzzles'}` : 'Try it',
      note: k === stop.lessons.length - 1 ? 'Then the stop check opens' : `Then Lesson ${k + 2}`,
    };
  };

  return (
    <div className="play-root" ref={rootRef}>
      <PlayHeader
        over={over}
        title={lesson.title}
        onBack={step.at === 'recap' ? finish : onExit}
        backLabel={step.at === 'recap' ? (passed ? 'Finish the lesson' : 'Leave the lesson') : 'Leave the lesson'}
        dots={dots}
        dotsLabel={dotsLabel}
      />
      {here?.kind === 'cards' && step.at === 'stage' && (
        <IdeaCards
          key={`cards-${step.s}`}
          cards={lesson.ideas.slice(here.from, here.to + 1)}
          numberFrom={here.from + 1}
          numberOf={lesson.ideas.length}
          readAloud={readAloud}
          doneLabel={cardsDone(step.s).label}
          doneNote={cardsDone(step.s).note}
          after={<RoutineLine />}
          why={here.from === 0 ? lessonWorld(lesson.id)?.why : undefined}
          onDone={() => nextStage(step.s)}
        />
      )}
      {here?.kind === 'board' && step.at === 'stage' && drill[here.j] && (
        <DrillBoard
          key={`board-${here.j}`}
          step={drill[here.j]}
          readAloud={readAloud}
          kicker={drill.length > 1 ? `Do it · ${here.j + 1} of ${drill.length}` : 'Do it'}
          doneLabel={step.s + 1 < stages.length ? (stages[step.s + 1].kind === 'board' ? 'Next board' : 'Next') : items.length ? 'Start the puzzles' : 'Finish'}
          onDone={() => nextStage(step.s)}
        />
      )}
      {resumed && step.at === 'try' && step.i === resumeAt && resumeAt > 0 && (
        <p className="play-fresh-note" role="status">
          Welcome back. You are on {tryLabel(step.i).toLowerCase()}. Your earlier answers are saved.
        </p>
      )}
      {step.at === 'try' && (
        <p className="play-pass-note">
          To finish: {passGoal(lesson.pass)}
          {pass.missing.length > 0 && pass.have >= pass.need ? `, including ${pass.missing.map((m) => m.label).join(' and ')}` : ''}. You have {pass.have}.
        </p>
      )}
      {step.at === 'try' && items[step.i] && (
        <LearnItem
          key={items[step.i].id}
          stop={stop}
          item={items[step.i]}
          seed={seed + (step.i + 1) * 7}
          readAloud={readAloud}
          kicker={tryLabel(step.i)}
          nextLabel={step.i + 1 < items.length ? 'Next' : 'Finish'}
          priorMiss={lost.current.has(step.i)}
          onMiss={() => {
            lost.current.add(step.i);
            onProgress?.({ next: step.i, firstTry, drilled: true, results, missed: step.i });
          }}
          onDone={(r) => answered(step.i, r)}
        />
      )}
      {step.at === 'recap' && (
        <LessonRecap
          stop={stop}
          lesson={lesson}
          tries={results.length}
          firstTry={results.filter((r) => r.clean).length}
          passed={passed}
          onDone={finish}
          onRestart={!passed && (outOfItems || items.length >= MAX_RUN) ? onRestart : undefined}
        />
      )}
    </div>
  );
}
