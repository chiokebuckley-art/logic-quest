/**
 * Home (1b): the one next thing. Who is playing and today's minutes, Find anything, the Next-up card with one gold
 * button, repair quests that are ready, today's plan, and the Pattern Lab badge row.
 */
import { nextStep, viewAll, type CheckKind, type NextStep } from '../../engine/journey/mastery';
import { fixableCards } from '../../engine/notebook';
import { STOPS, stopById } from '../../content/stops';
import { DAILY_GOAL_MINUTES, minutesOn, streakDays } from '../progressStats';
import { useStore, type Route } from '../store';
import { Icon } from '../components/Icon';
import { initial } from '../components/Hud';
import { Eyebrow, SearchButton, StopArt } from '../components/kit';
import { art } from '../pattern/PatternBridge';
import { EVENT_IDS } from '../pattern/bridges';
import { RepairCard, TodayMeter } from './JourneyScreen';

const CHECK_NAME: Record<CheckKind, string> = { pass: 'Stop check', lockin: 'Lock-in check', week: 'Week check' };

export interface NextUpInfo {
  stopId: string | null;
  kicker: string;
  title: string;
  text: string;
  button: { label: string; route: Route } | null;
}

/** What the Next-up card says. Same rules as before the redesign (lesson / check / rest / done). */
export function nextUpInfo(next: NextStep, views: ReturnType<typeof viewAll>, anyPractice: boolean): NextUpInfo {
  const stop = stopById(next.stopId);
  const view = views.find((v) => v.stop.id === next.stopId)?.view;
  const redo = view?.status === 'notYet' || view?.status === 'resting';

  if (stop && next.action === 'lesson' && next.lessonId) {
    const k = stop.lessons.findIndex((l) => l.id === next.lessonId) + 1;
    const lesson = stop.lessons[k - 1];
    return {
      stopId: stop.id,
      kicker: `Next up · Stop ${stop.n} · ${stop.title}`,
      title: `Lesson ${k} · ${lesson?.title ?? ''}`,
      text: redo ? 'Learn this idea again. Then you can try the check again, with new questions.' : k === stop.lessons.length ? 'Then the stop check opens.' : `${lesson?.ideas.length ?? 1} key ${lesson?.ideas.length === 1 ? 'idea' : 'ideas'}, then a few tries.`,
      button: {
        label: redo ? `Learn it again: Lesson ${k}` : `Start Lesson ${k} of ${stop.lessons.length}`,
        route: { name: 'lesson', stopId: stop.id, lessonId: next.lessonId, from: 'home' },
      },
    };
  }
  if (stop && next.action === 'check' && next.kind) {
    const retry = view?.status === 'notYet';
    return {
      stopId: stop.id,
      kicker: `Next up · Stop ${stop.n} · ${stop.title}`,
      title: retry ? 'Try the check again' : CHECK_NAME[next.kind],
      text: retry
        ? 'You redid the lessons you missed. The questions are new.'
        : next.kind === 'pass'
          ? 'Show what you know. The stop passes when every answer is right.'
          : next.kind === 'lockin'
            ? 'New questions, same ideas. Pass it to lock in this stop.'
            : 'One more check, a week later. Pass it to master this stop.',
      button: { label: retry ? 'Try again' : 'Start the check', route: { name: 'check', stopId: stop.id, kind: next.kind } },
    };
  }
  if (stop && next.action === 'rest') {
    let button: NextUpInfo['button'] = { label: 'Open the stop', route: { name: 'stop', stopId: stop.id } };
    if (view?.nextLesson) {
      const k = stop.lessons.findIndex((l) => l.id === view.nextLesson) + 1;
      button = { label: `Learn it again: Lesson ${k}`, route: { name: 'lesson', stopId: stop.id, lessonId: view.nextLesson, from: 'home' } };
    }
    return {
      stopId: stop.id,
      kicker: `Stop ${stop.n} · ${stop.title}`,
      title: 'Rest for today',
      text: 'You tried this check twice today. Rest now and try again tomorrow. Rest helps your brain keep what you learned.',
      button,
    };
  }
  const waiting = views.some((v) => v.view.status === 'passed' || v.view.status === 'lockedIn');
  return {
    stopId: null,
    kicker: 'Next up',
    title: 'All done for now',
    text: waiting ? 'You did everything that is open today. Your next check opens on a later day.' : 'New stops are coming soon.',
    button: anyPractice ? { label: 'Practice in the Arcade', route: { name: 'arcade' } } : null,
  };
}

interface PlanRow { key: string; title: string; meta: string; state: 'done' | 'current' | 'later'; route?: Route }

export function HomeScreen() {
  const { save, player, today, actions } = useStore();
  if (!save || !player) return null;
  const views = viewAll(STOPS, save.stops, today);
  const next = nextStep(STOPS, save.stops, today);
  const anyPractice = views.some(({ stop }) => !!save.stops[stop.id]?.passDay && !!stop.practice);
  const info = nextUpInfo(next, views, anyPractice);
  const repairs = fixableCards(save.notebook ?? {}, today, STOPS).length;
  const streak = streakDays(save.active, today);
  const minutes = minutesOn(save.active, today);
  const bridge = save.patternBridge;

  // Today's plan: repairs, then the next step, then any other check due today; checks finished today show as done.
  const plan: PlanRow[] = [];
  if (repairs) plan.push({ key: 'fix', title: `Fix ${repairs} repair ${repairs === 1 ? 'quest' : 'quests'}`, meta: `${Math.max(1, repairs)} min`, state: 'later', route: { name: 'notebook', fix: true } });
  if (info.button && info.stopId) plan.push({ key: 'next', title: info.title, meta: 'next', state: 'current', route: info.button.route });
  for (const { stop, view } of views) {
    const p = save.stops[stop.id];
    if (view.due && !(next.stopId === stop.id && next.action === 'check')) {
      plan.push({ key: `due-${stop.id}`, title: `${CHECK_NAME[view.due]} · Stop ${stop.n}`, meta: 'today', state: 'later', route: { name: 'check', stopId: stop.id, kind: view.due } });
    }
    const doneToday = p?.weekDay === today ? 'week' : p?.lockDay === today ? 'lockin' : p?.passDay === today ? 'pass' : null;
    if (doneToday) plan.push({ key: `done-${stop.id}`, title: `${CHECK_NAME[doneToday]} · Stop ${stop.n}`, meta: 'done', state: 'done' });
  }
  const doneCount = plan.filter((r) => r.state === 'done').length;

  return (
    <div className="page sl-page">
      <header className="sl-home-head">
        <button type="button" className="sl-avatar" style={{ background: player.color }} aria-label={`Switch player (${player.name})`} onClick={() => actions.navigate({ name: 'players', mode: 'list' })}>
          {initial(player.name)}
        </button>
        <div className="sl-home-who">
          <div className="sl-home-name">{player.name} · {bridge.path}</div>
          <div className="sl-home-today">Today · {minutes} of {DAILY_GOAL_MINUTES} minutes</div>
          <TodayMeter seconds={save.active[today] ?? 0} />
        </div>
        <div className="sl-streak" title="Days in a row with at least one minute of play">
          <Icon name="flame" size={15} /> {streak}<span className="sr-only"> {streak === 1 ? 'day' : 'days'} in a row</span>
        </div>
      </header>

      <SearchButton onOpen={() => actions.navigate({ name: 'search' })} />

      <section className="sl-next" aria-labelledby="next-title">
        {info.stopId ? <StopArt stopId={info.stopId} className="sl-next-art" /> : <img className="sl-next-art" src={art('calm-check')} alt="" />}
        <div className="sl-next-body">
          <Eyebrow>{info.kicker}</Eyebrow>
          <h2 id="next-title" className="sl-next-title">{info.title}</h2>
          {info.text && <p className="sl-next-meta">{info.text}</p>}
          {info.button && (
            <button type="button" className="sl-cta" onClick={() => actions.navigate(info.button!.route)}>
              {info.button.label} ▸
            </button>
          )}
          {info.stopId && (
            <button type="button" className="sl-link" onClick={() => actions.navigate({ name: 'stop', stopId: info.stopId! })}>
              Open the stop page
            </button>
          )}
        </div>
      </section>

      {repairs > 0 && <RepairCard ready={repairs} onOpen={() => actions.navigate({ name: 'notebook', fix: true })} />}

      {plan.length > 0 && (
        <section className="sl-section" aria-labelledby="plan-title">
          <div className="sl-section-head">
            <h3 id="plan-title" className="sl-label">Today’s plan</h3>
            <span className="sl-section-meta t-mint">{doneCount} of {plan.length} done</span>
          </div>
          <ul className="sl-plan">
            {plan.map((r) => (
              <li key={r.key}>
                <button type="button" className={`sl-plan-row s-${r.state}`} disabled={!r.route} onClick={() => r.route && actions.navigate(r.route)}>
                  <span className="sl-plan-ring" aria-hidden="true">{r.state === 'done' && <Icon name="check" size={16} strokeWidth={3} />}</span>
                  <span className="sl-plan-title">{r.title}</span>
                  <span className={`sl-plan-meta${r.key === 'fix' ? ' t-orange' : r.state === 'done' ? ' t-mint' : ' t-gold'}`}>{r.meta}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="sl-row sl-lab-row" onClick={() => actions.navigate(bridge.workshop ? { name: 'library', kind: 'lab' } : { name: 'pattern', workshop: true })}>
        <img src={art('badge-pattern-scout')} alt="" className={`sl-badge${bridge.workshop ? '' : ' dim'}`} />
        <span className="sl-row-main">
          <span className="sl-row-title"><strong>Pattern Scout</strong> badge · {bridge.workshop ? 'earned' : 'Workshop · about 5 minutes'}</span>
          <span className="sl-row-sub">Pattern Lab · {bridge.completed.length} of {EVENT_IDS.length} events done</span>
        </span>
        <span className="sl-row-meta t-violet">Open</span>
      </button>
    </div>
  );
}
