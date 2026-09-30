import { PatternBridgeHome, DestinationArt } from '../pattern/PatternBridge';
/** Home: today's minutes, the "Next up" card, repair quests that are ready, and the 12 stops of the Journey. */
import { nextStep, viewAll, type CheckKind, type StopView } from '../../engine/journey/mastery';
import { fixableCards } from '../../engine/notebook';
import type { StopDef } from '../../engine/types';
import { STOPS, stopById } from '../../content/stops';
import { DAILY_GOAL_MINUTES, goalPercent, minutesOn, stopCounts } from '../progressStats';
import { useStore, type Route } from '../store';
import { Icon } from '../components/Icon';

/** Where tapping an open stop goes: its due check, else its next lesson. */
export function stopRoute(stop: StopDef, view: StopView): Route | null {
  if (view.due) return { name: 'check', stopId: stop.id, kind: view.due };
  if (view.nextLesson) return { name: 'lesson', stopId: stop.id, lessonId: view.nextLesson, from: 'journey' };
  return null;
}

type Tone = 'gold' | 'teal' | 'amber' | 'plain';

function toneOf(view: StopView): Tone {
  switch (view.status) {
    case 'mastered': case 'lockedIn': return 'gold';
    case 'passed': return 'teal';
    case 'learning': case 'ready': case 'notYet': case 'resting': return 'amber';
    default: return 'plain';
  }
}

const CHECK_NAME: Record<CheckKind, string> = { pass: 'Stop check', lockin: 'Lock-in check', week: 'Week check' };

export function TodayMeter({ seconds }: { seconds: number }) {
  const min = Math.floor(seconds / 60);
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label="Minutes played today"
      aria-valuemin={0}
      aria-valuemax={DAILY_GOAL_MINUTES}
      aria-valuenow={Math.min(min, DAILY_GOAL_MINUTES)}
      aria-valuetext={`${min} of ${DAILY_GOAL_MINUTES} minutes`}
    >
      <i style={{ width: `${goalPercent(seconds)}%` }} />
    </div>
  );
}

export function JourneyScreen() {
  const { save, today, actions } = useStore();
  if (!save) return null;
  const views = viewAll(STOPS, save.stops, today);
  const next = nextStep(STOPS, save.stops, today);
  const seconds = save.active[today] ?? 0;
  const passed = stopCounts(save.stops).passed;
  const anyPractice = views.some(({ stop }) => !!save.stops[stop.id]?.passDay && !!stop.practice);
  const repairs = fixableCards(save.notebook ?? {}, today, STOPS).length;

  return (
    <div className="page">
      <section className="panel" aria-labelledby="next-title">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <div className="kicker" style={{ color: 'var(--muted)' }}>Today</div>
          <div className="small soft-text" style={{ fontSize: 14 }}>{minutesOn(save.active, today)} of {DAILY_GOAL_MINUTES} minutes</div>
        </div>
        <TodayMeter seconds={seconds} />
        <NextUp next={next} views={views} anyPractice={anyPractice} onGo={actions.navigate} />
      </section>

      {repairs > 0 && <RepairCard ready={repairs} onOpen={() => actions.navigate({ name: 'notebook' })} />}

      <PatternBridgeHome />
      <div className="row between">
        <h2 className="section-title" style={{ fontSize: 15, letterSpacing: '0.08em' }}>THE JOURNEY</h2>
        <div className="small muted">{passed} of {STOPS.length} passed</div>
      </div>

      <ol className="stop-list">
        {views.map(({ stop, view }, i) => {
          const tone = toneOf(view);
          const done = tone === 'gold' || tone === 'teal';
          const closed = view.status === 'locked' || view.status === 'soon';
          const go = closed ? null : stopRoute(stop, view);
          const nodeClass = tone === 'gold' ? 'gold' : tone === 'teal' ? 'passed' : tone === 'amber' ? 'current' : 'locked';
          return (
            <li key={stop.id} className={`stop-row${closed ? ' is-locked' : ''}`}>
              <div className="stop-rail">
                <div className={`stop-node ${nodeClass}`} aria-hidden="true">
                  {done ? <Icon name="check" size={18} strokeWidth={3} /> : stop.n}
                </div>
                {i < views.length - 1 && <div className={`stop-line${done ? ' done' : ''}`} />}
              </div>
              <div className="stop-body">
                <DestinationArt stopId={stop.id} />
                <h3 className="stop-title" style={{ fontFamily: 'var(--font-body)', letterSpacing: 0 }}>
                  <span className="sr-only">Stop {stop.n}: </span>
                  {stop.title}
                  {closed && <Icon name="lock" size={14} color="var(--muted)" label="Locked" />}
                </h3>
                <div className="stop-idea">{stop.idea}</div>
                {go ? (
                  <button
                    type="button"
                    className={`stop-go${tone === 'teal' ? ' teal' : tone === 'gold' ? ' gold' : ''}`}
                    aria-current={next.stopId === stop.id && next.action !== 'done' ? 'step' : undefined}
                    aria-label={`${view.label}. Stop ${stop.n}, ${stop.title}`}
                    onClick={() => actions.navigate(go)}
                  >
                    {view.label} <Icon name="chevron" size={14} strokeWidth={2.5} />
                  </button>
                ) : (
                  <span className={`chip${tone === 'plain' ? '' : ` ${tone}`}`}>{view.label}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A small card under Next up: notebook cards that can be fixed today. */
export function RepairCard({ ready, onOpen }: { ready: number; onOpen(): void }) {
  return (
    <button type="button" className="repair-card" onClick={onOpen}>
      <span className="repair-icon" aria-hidden="true">
        <Icon name="refresh" size={20} />
      </span>
      <span className="grow stack" style={{ gap: 0 }}>
        <span className="repair-title">Repair quests: {ready} ready</span>
        <span className="small soft-text">New tries at questions you missed</span>
      </span>
      <Icon name="chevron" size={18} color="var(--muted)" />
    </button>
  );
}

function NextUp({ next, views, anyPractice, onGo }: {
  next: ReturnType<typeof nextStep>;
  views: ReturnType<typeof viewAll>;
  anyPractice: boolean;
  onGo(route: Route): void;
}) {
  const stop = stopById(next.stopId);
  const view = views.find((v) => v.stop.id === next.stopId)?.view;
  const redo = view?.status === 'notYet' || view?.status === 'resting';

  let kicker = '';
  let title = '';
  let text = '';
  let button: { label: string; route: Route } | null = null;

  if (stop && next.action === 'lesson' && next.lessonId) {
    const k = stop.lessons.findIndex((l) => l.id === next.lessonId) + 1;
    const lesson = stop.lessons[k - 1];
    kicker = `Next up · Stop ${stop.n} · ${stop.title}`;
    title = lesson?.title ?? `Lesson ${k}`;
    text = redo ? 'Learn this idea again. Then you can try the check again, with new questions.' : '';
    button = {
      label: redo ? `Learn it again: Lesson ${k}` : `Start Lesson ${k} of ${stop.lessons.length}`,
      route: { name: 'lesson', stopId: stop.id, lessonId: next.lessonId, from: 'journey' },
    };
  } else if (stop && next.action === 'check' && next.kind) {
    const retry = view?.status === 'notYet';
    kicker = `Next up · Stop ${stop.n} · ${stop.title}`;
    title = retry ? 'Try the check again' : CHECK_NAME[next.kind];
    text = retry
      ? 'You redid the lessons you missed. The questions are new.'
      : next.kind === 'pass'
        ? 'Show what you know. The stop passes when every answer is right.'
        : next.kind === 'lockin'
          ? 'New questions, same ideas. Pass it to lock in this stop.'
          : 'One more check, a week later. Pass it to master this stop.';
    button = { label: retry ? 'Try again' : 'Start the check', route: { name: 'check', stopId: stop.id, kind: next.kind } };
  } else if (stop && next.action === 'rest') {
    kicker = `Stop ${stop.n} · ${stop.title}`;
    title = 'Rest for today';
    text = 'You tried this check twice today. Rest now and try again tomorrow. Rest helps your brain keep what you learned.';
    if (view?.nextLesson) {
      const k = stop.lessons.findIndex((l) => l.id === view.nextLesson) + 1;
      button = { label: `Learn it again: Lesson ${k}`, route: { name: 'lesson', stopId: stop.id, lessonId: view.nextLesson, from: 'journey' } };
    } else {
      button = { label: 'Review in Learn', route: { name: 'learn' } };
    }
  } else {
    const waiting = views.some((v) => v.view.status === 'passed' || v.view.status === 'lockedIn');
    kicker = 'Next up';
    title = 'All done for now';
    text = waiting ? 'You did everything that is open today. Your next check opens on a later day.' : 'New stops are coming soon.';
    button = anyPractice ? { label: 'Practice in the Arcade', route: { name: 'arcade' } } : null;
  }

  const action = button;
  return (
    <>
      <div className="stack" style={{ gap: 2 }}>
        <div className="small muted">{kicker}</div>
        <h2 id="next-title" className="next-title">{title}</h2>
        {text && <p className="soft-text" style={{ marginTop: 4 }}>{text}</p>}
      </div>
      {action && (
        <button type="button" className="btn primary block big" onClick={() => onGo(action.route)}>
          {action.label}
        </button>
      )}
    </>
  );
}

