/** Hosts one lesson: key-idea cards, then guided tries. */
import { useState } from 'react';
import { lessonWaitsFor, planKey } from '../../engine/drill';
import { seedFor } from '../../engine/journey/mastery';
import { MAX_RUN } from '../../engine/save/save';
import { stopById } from '../../content/stops';
import { useStore, type Route } from '../store';
import { LessonRunner } from '../components/LessonRunner';
import { lessonLevel, placeNeeds } from '../observatory';

type LessonRoute = Extract<Route, { name: 'lesson' }>;

export function LessonScreen({ route }: { route: LessonRoute }) {
  const { state, player, save, actions } = useStore();
  const stop = stopById(route.stopId);
  const lesson = stop?.lessons.find((l) => l.id === route.lessonId);
  // An Observatory place plays at the learner's level on its track (from the diagnostic), so its quiz and its saved plan agree.
  const level = lessonLevel(stop, lesson, save);
  // A lesson left partway (a refresh, a closed app) picks up at the same try with the same questions.
  // Otherwise a new seed on every visit, so a repeated lesson brings new tries.
  // Not resumed: "Learn this again" after a check (a fresh redo, with its key ideas and boards), a run saved before
  // the lesson's quiz last changed (its plan differs, or it has none: the try it was on now holds another question),
  // or a run that has used up its quiz items.
  const [run, setRun] = useState(() => {
    const r = save?.lessonRun;
    if (!r || !lesson || r.lessonId !== route.lessonId || r.stopId !== route.stopId || route.from === 'check') return null;
    if (r.next > 0 && !r.results) return null;
    if (r.next >= MAX_RUN) return null;
    if (r.plan !== planKey(lesson, r.seed, level)) return null;
    return r;
  });
  const newSeed = () => seedFor(player?.id ?? 'guest', route.lessonId, save?.stops[route.stopId]?.lessonsDone.length ?? 0, Date.now());
  const [seed, setSeed] = useState(() => (run ? run.seed : newSeed()));

  const last = state.lastCheck && state.lastCheck.stopId === route.stopId ? state.lastCheck : null;
  const resultRoute: Route | null = route.from === 'check' && last ? { name: 'check', stopId: last.stopId, kind: last.kind, result: true } : null;

  /** Leaving without finishing: back to where the lesson was opened. */
  const back = (): Route => {
    switch (route.from) {
      case 'learn': case 'library': return { name: 'library', kind: 'ideas' };
      case 'home': return { name: 'home' };
      case 'journey': return { name: 'journey' };
      case 'stop': return { name: 'stop', stopId: route.stopId };
      case 'check': return resultRoute ?? { name: 'stop', stopId: route.stopId };
    }
  };

  /**
   * After finishing. From a check result ("Learn this again"): back to the result while other missed
   * lessons are still to redo; once all are redone, to the Journey, where "Next up" offers the retry.
   */
  const afterDone = (lessonId: string): Route => {
    if (route.from !== 'check') return back();
    const redone = save?.stops[route.stopId]?.notYet?.redone ?? [];
    const left = last && !last.passed ? last.missed.filter((id) => id !== lessonId && !redone.includes(id)) : [];
    return left.length && resultRoute ? resultRoute : { name: 'stop', stopId: route.stopId };
  };

  if (!stop || !lesson || !save) {
    return (
      <div className="page">
        <p className="soft-text">That lesson is not here.</p>
        <button type="button" className="btn primary" onClick={() => actions.navigate({ name: 'journey' })}>Back to the Journey</button>
      </div>
    );
  }

  // An Observatory place opens on skills: the lessons it requires (anywhere), the diagnostic's credit, or its primer.
  const needs = stop.lessonOrder === 'free' ? placeNeeds(lesson, save) : [];
  if (needs.length) {
    return (
      <div className="page">
        <p className="soft-text">
          {lesson.title} needs {needs.map((n) => n.title).join(' and ')} first.{lesson.primer ? ' Or take its three-question primer to show you have the skill.' : ''}
        </p>
        {lesson.primer && (
          <button type="button" className="btn primary" onClick={() => actions.navigate({ name: 'evidence', stopId: stop.id, lessonId: lesson.id, kind: 'primer' })}>
            Take the primer
          </button>
        )}
        <button type="button" className="btn ghost" onClick={() => actions.navigate(back())}>Back</button>
      </div>
    );
  }

  // Lessons open in teaching order (from the Library or a search too): the lesson before must be done, or its
  // guided boards marked, first.
  const waits = lessonWaitsFor(stop, lesson.id, save.stops[stop.id]?.lessonsDone ?? [], save.drilled ?? []);
  if (waits) {
    const n = stop.lessons.indexOf(waits) + 1;
    return (
      <div className="page">
        <p className="soft-text">
          {lesson.title} opens when you have done Lesson {n}, {waits.title}. Its key ideas and the board you mark come first.
        </p>
        <button type="button" className="btn primary" onClick={() => actions.navigate({ name: 'lesson', stopId: stop.id, lessonId: waits.id, from: route.from })}>
          Go to Lesson {n}
        </button>
        <button type="button" className="btn ghost" onClick={() => actions.navigate(back())}>Back</button>
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
        level={level}
        readAloud={save.settings.readAloud}
        onAnswer={(r) => {
          actions.recordAnswer(r);
          // An Observatory place logs every answer by meaning: first try, hints, supported or not, the phase.
          if (lesson.routine) actions.recordEvidence(r, r.phase ?? 'do');
        }}
        start={run ? { next: run.next, firstTry: run.firstTry, drilled: run.drilled, results: run.results, missed: run.missed } : undefined}
        onRestart={() => {
          actions.setLessonRun(null);
          setRun(null);
          setSeed(newSeed() + 1);
        }}
        onProgress={(p) => actions.setLessonRun({ stopId: stop.id, lessonId: lesson.id, seed, plan: planKey(lesson, seed, level), ...p })}
        onDrilled={() => actions.markDrilled(lesson.id)}
        onComplete={() => {
          actions.completeLesson(stop.id, lesson.id);
          actions.navigate(afterDone(lesson.id));
        }}
        onExit={() => actions.navigate(back())}
      />
    </div>
  );
}
