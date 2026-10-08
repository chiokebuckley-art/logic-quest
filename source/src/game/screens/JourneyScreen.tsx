/**
 * Journey (1c): the 13 stops on one rail. Main track (1–11), side track (12–13) and a Pattern Lab chip.
 * Tapping a stop opens its Stop page, which holds everything about that stop.
 */
import { nextStep, viewAll, type StopView } from '../../engine/journey/mastery';
import type { StopDef } from '../../engine/types';
import { STOPS } from '../../content/stops';
import { DESTINATIONS } from '../pattern/bridges';
import { ObservatoryMap, type MapPlace } from '../components/ObservatoryMap';
import { OBSERVATORY, placeNeeds, placeTitle, ringTitle } from '../observatory';
import { LEVEL_NAMES, TRACK_NAMES, type Level } from '../../engine/evidence';
import { DAILY_GOAL_MINUTES, goalPercent, stopCounts } from '../progressStats';
import { useStore, type Route } from '../store';
import { Icon } from '../components/Icon';
import { SearchButton } from '../components/kit';

/** Where an open stop leads: its Stop page (the page's gold row is the current action). */
export function stopRoute(stop: StopDef, _view?: StopView): Route {
  return { name: 'stop', stopId: stop.id };
}

/** The action a stop offers right now: its due check, else its next lesson. */
export function stopAction(stop: StopDef, view: StopView, from: 'stop' | 'journey' = 'stop'): Route | null {
  if (view.due) return { name: 'check', stopId: stop.id, kind: view.due };
  if (view.nextLesson) return { name: 'lesson', stopId: stop.id, lessonId: view.nextLesson, from };
  return null;
}

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

/** The orange→gold repair banner: notebook cards that can be fixed today. */
export function RepairCard({ ready, onOpen }: { ready: number; onOpen(): void }) {
  return (
    <button type="button" className="sl-repair" onClick={onOpen}>
      <span className="sl-repair-n" aria-hidden="true">{ready}</span>
      <span className="sl-repair-text">
        <span className="sl-repair-title"><span className="sr-only">Repair quests: {ready} ready. </span><span aria-hidden="true">Repair quests ready</span></span>
        <span className="sl-repair-sub">New tries at ideas you missed · {Math.max(1, ready)} min</span>
      </span>
      <span className="sl-repair-go" aria-hidden="true">FIX ▸</span>
    </button>
  );
}

type Node = 'mastered' | 'done' | 'notyet' | 'current' | 'open' | 'locked';

function nodeOf(view: StopView, current: boolean): Node {
  switch (view.status) {
    case 'mastered': return 'mastered';
    case 'lockedIn': case 'passed': return 'done';
    case 'notYet': case 'resting': return 'notyet';
    case 'learning': case 'ready': return current ? 'current' : 'open';
    default: return 'locked';
  }
}

export function JourneyScreen({ route }: { route?: Extract<Route, { name: 'journey' }> }) {
  const { save, today, actions } = useStore();
  if (!save) return null;
  const track = route?.track ?? 'main';
  const all = viewAll(STOPS, save.stops, today);
  const views = all.filter(({ stop }) => (track === 'side' ? stop.n >= 12 && !stop.observatory : track === 'observatory' ? !!stop.observatory : stop.n <= 11 && !stop.observatory));
  const plain = save.evidence.plain;
  const diag = save.evidence.diagnostic;
  const places: MapPlace[] = OBSERVATORY.flatMap((stop) =>
    stop.lessons.map((lesson) => {
      const done = (save.stops[stop.id]?.lessonsDone ?? []).includes(lesson.id);
      const state: MapPlace['state'] = done ? (save.stops[stop.id]?.weekDay ? 'mastered' : 'done') : placeNeeds(lesson, save).length ? 'locked' : 'open';
      return { stop, lesson, state, title: placeTitle(lesson, plain) };
    }),
  );
  const next = nextStep(STOPS, save.stops, today);
  const counts = stopCounts(save.stops);

  return (
    <div className="page sl-page">
      <div className="sl-head">
        <div className="sl-head-row">
          <h2 className="sl-title">The Journey</h2>
          <span className="sl-section-meta t-gold">{counts.passed} passed · {counts.mastered} mastered</span>
        </div>
      </div>
      <div className="sl-chips" role="tablist" aria-label="Track">
        <button type="button" role="tab" aria-selected={track === 'main'} className="sl-chip c-gold" onClick={() => actions.navigate({ name: 'journey' })}>Main track</button>
        <button type="button" role="tab" aria-selected={track === 'side'} className="sl-chip c-gold" onClick={() => actions.navigate({ name: 'journey', track: 'side' })}>Side track · 12, 13</button>
        <button type="button" role="tab" aria-selected={track === 'observatory'} className="sl-chip c-gold" onClick={() => actions.navigate({ name: 'journey', track: 'observatory' })}>Observatory</button>
        <button type="button" className="sl-chip c-violet" onClick={() => actions.navigate({ name: 'library', kind: 'lab' })}>Pattern Lab</button>
      </div>

      {track === 'observatory' && (
        <section className="sl-section" aria-labelledby="ob-title">
          <div className="sl-section-head">
            <h3 id="ob-title" className="sl-label">Pattern Observatory</h3>
            <span className="sl-section-meta t-gold">{places.filter((p) => p.state === 'done' || p.state === 'mastered').length} of {places.length} places lit</span>
          </div>
          <p className="sl-sub">Ten places in four rings. Notice, describe, compare, test, predict, explain. It never blocks the main track.</p>
          {places.length > 0 && <ObservatoryMap places={places} onPick={(stopId, lessonId) => actions.navigate({ name: 'lesson', stopId, lessonId, from: 'journey' })} />}
          <button type="button" className="sl-row" onClick={() => actions.navigate({ name: 'diagnostic' })}>
            <span className="sl-row-main">
              <span className="sl-row-title">{diag ? 'Your starting levels' : 'Find your level'}</span>
              <span className="sl-row-sub">{diag ? ([1, 2, 3, 4] as const).map((t) => `T${t} L${diag.levels[String(t)] ?? 1}`).join(' · ') : 'About 5 minutes. No timer. A miss just ends that track.'}</span>
            </span>
            <span className="sl-row-meta t-gold">{diag ? 'Again ▸' : 'Start ▸'}</span>
          </button>
          {diag && (
            <p className="sl-note">
              {([1, 2, 3, 4] as const).map((t) => `${TRACK_NAMES[t]}: L${diag.levels[String(t)] ?? 1} ${LEVEL_NAMES[(diag.levels[String(t)] ?? 1) as Level]}`).join('. ')}.
            </p>
          )}
        </section>
      )}

      <ol className="sl-rail">
        {views.map(({ stop, view }, i) => {
          const current = next.stopId === stop.id && next.action !== 'done';
          const node = nodeOf(view, current);
          const closed = view.status === 'locked' || view.status === 'soon';
          const hasLab = DESTINATIONS.some((d) => d.stop === stop.id);
          const done = node === 'mastered' || node === 'done';
          let cta: { text: string; tone: string } | null;
          if (done) cta = stop.practice ? { text: 'Practice', tone: node === 'mastered' ? 'mint' : 'gold' } : { text: 'Open', tone: 'gold' };
          else if (node === 'notyet') cta = { text: view.status === 'resting' ? 'Rest today' : 'Learn again ▸', tone: 'orange' };
          else if (node === 'current' || node === 'open') cta = { text: 'Continue ▸', tone: 'gold' };
          else if (view.status === 'soon') cta = hasLab ? { text: 'Preview', tone: 'violet' } : { text: 'soon', tone: 'muted' };
          else cta = null;
          const fade = closed ? Math.max(0.45, 0.8 - i * 0.05) : 1;
          return (
            <li key={stop.id} className={`sl-stop n-${node}`} style={closed ? { opacity: fade } : undefined}>
              <div className="sl-stop-rail" aria-hidden="true">
                <span className="sl-node">{done ? <Icon name="check" size={16} strokeWidth={3} /> : stop.n}</span>
                {i < views.length - 1 && <span className="sl-link-line" />}
              </div>
              <button
                type="button"
                className="sl-stop-row"
                disabled={view.status === 'locked'}
                aria-current={current ? 'step' : undefined}
                onClick={() => actions.navigate({ name: 'stop', stopId: stop.id })}
              >
                <span className="sl-row-main">
                  <span className="sl-row-title">{stop.observatory ? `Ring ${stop.observatory.ring}. ${ringTitle(stop, plain)}` : `${stop.n}. ${stop.title}`}</span>
                  <span className="sl-row-sub">{view.label}</span>
                </span>
                {view.status === 'locked' ? <Icon name="lock" size={15} color="var(--muted)" label="Locked" /> : cta && <span className={`sl-row-meta t-${cta.tone}`}>{cta.text}</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <SearchButton onOpen={() => actions.navigate({ name: 'search' })} placeholder="Find a stop or an idea" />
    </div>
  );
}
