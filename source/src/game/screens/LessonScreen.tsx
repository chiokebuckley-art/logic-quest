/** Hosts one lesson: key-idea cards, then guided tries. */
import { useState } from 'react';
import { seedFor } from '../../engine/journey/mastery';
import { stopById } from '../../content/stops';
import { useStore, type Route } from '../store';
import { LessonRunner } from '../components/LessonRunner';

type LessonRoute = Extract<Route, { name: 'lesson' }>;

export function LessonScreen({ route }: { route: LessonRoute }) {
  const { state, player, save, actions } = useStore();
  const stop = stopById(route.stopId);
  const lesson = stop?.lessons.find((l) => l.id === route.lessonId);
  // A lesson left partway (a refresh, a closed app) picks up at the same try with the same questions.
  // Otherwise a new seed on every visit, so a repeated lesson brings new tries.
  const [run] = useState(() => (save?.lessonRun && save.lessonRun.lessonId === route.lessonId && save.lessonRun.stopId === route.stopId ? save.lessonRun : null));
  const [seed] = useState(() =>
    run ? run.seed : seedFor(player?.id ?? 'guest', route.lessonId, save?.stops[route.stopId]?.lessonsDone.length ?? 0, Date.now()),
  );

  const last = state.lastCheck && state.lastCheck.stopId === route.stopId ? state.lastCheck : null;
  const resultRoute: Route | null = route.from === 'check' && last ? { name: 'check', stopId: last.stopId, kind: last.kind, result: true } : null;

  /** Leaving without finishing: back to where the lesson was opened. */
  const back = (): Route => (route.from === 'learn' ? { name: 'learn' } : resultRoute ?? { name: 'journey' });

  /**
   * After finishing. From a check result ("Learn this again"): back to the result while other missed
   * lessons are still to redo; once all are redone, to the Journey, where "Next up" offers the retry.
   */
  const afterDone = (lessonId: string): Route => {
    if (route.from !== 'check') return back();
    const redone = save?.stops[route.stopId]?.notYet?.redone ?? [];
    const left = last && !last.passed ? last.missed.filter((id) => id !== lessonId && !redone.includes(id)) : [];
    return left.length && resultRoute ? resultRoute : { name: 'journey' };
  };

  if (!stop || !lesson || !save) {
    return (
      <div className="page">
        <p className="soft-text">That lesson is not here.</p>
        <button type="button" className="btn primary" onClick={() => actions.navigate({ name: 'journey' })}>Back to the Journey</button>
      </div>
    );
  }

  return (
    <div className="page-play">
      <LessonRunner
        key={seed}
        stop={stop}
        lesson={lesson}
        seed={seed}
        readAloud={save.settings.readAloud}
        onAnswer={(r) => actions.recordAnswer(r)}
        start={run ? { next: run.next, firstTry: run.firstTry } : undefined}
        onProgress={(next, firstTry) => actions.setLessonRun({ stopId: stop.id, lessonId: lesson.id, seed, next, firstTry })}
        onComplete={() => {
          actions.completeLesson(stop.id, lesson.id);
          actions.navigate(afterDone(lesson.id));
        }}
        onExit={() => actions.navigate(back())}
      />
    </div>
  );
}
