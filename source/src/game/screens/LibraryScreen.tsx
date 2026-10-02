/**
 * Library (1h): the cross-stop index. Ideas (every lesson and key-idea card, to re-read), Practice (passed stops),
 * Pattern Lab (Workshop, events, badges) and Soon. Replaces the old Learn tab.
 */
import { viewAll } from '../../engine/journey/mastery';
import { STOPS } from '../../content/stops';
import { useStore, type LibraryKind, type Route } from '../store';
import { Icon } from '../components/Icon';
import { PageHead, Row, SearchButton, StopArt } from '../components/kit';
import { BridgeProgressCard, PatternBridgeHome } from '../pattern/PatternBridge';

const KINDS: { kind: LibraryKind; label: string; tone: string }[] = [
  { kind: 'all', label: 'All', tone: 'gold' },
  { kind: 'ideas', label: 'Ideas', tone: 'cyan' },
  { kind: 'practice', label: 'Practice', tone: 'lime' },
  { kind: 'lab', label: 'Pattern Lab', tone: 'violet' },
  { kind: 'soon', label: 'Soon', tone: 'muted' },
];

const DISC: Record<string, string> = { mastered: 'mint', lockedIn: 'gold', passed: 'gold', notYet: 'orange', resting: 'orange', learning: 'cyan', ready: 'cyan', locked: 'muted', soon: 'muted' };

export function LibraryScreen({ route }: { route: Extract<Route, { name: 'library' }> }) {
  const { save, today, actions } = useStore();
  if (!save) return null;
  const kind = route.kind ?? 'all';
  const views = viewAll(STOPS, save.stops, today);
  const ready = views.filter(({ stop }) => stop.ready);

  const practiceCards = (all: boolean) => (
    <div className="sl-art-grid">
      {(all ? STOPS : ready.map((v) => v.stop)).map((stop) => {
        const open = !!save.stops[stop.id]?.passDay && !!stop.practice && stop.ready;
        return (
          <button key={stop.id} type="button" className="sl-art-card" disabled={!open} onClick={() => actions.navigate({ name: 'arcade', practice: stop.id })}>
            <StopArt stopId={stop.id} />
            <span className="sl-art-name">{stop.title}</span>
            <span className={`sl-art-sub ${open ? 't-lime' : 't-muted'}`}>{open ? 'open · no clock' : stop.ready ? 'opens at pass' : 'coming soon'}</span>
          </button>
        );
      })}
    </div>
  );

  const ideasByStop = (
    <div className="sl-list">
      {views.filter(({ stop }) => stop.ready).map(({ stop, view }) => {
        const p = save.stops[stop.id];
        const ideas = stop.lessons.reduce((n, l) => n + l.ideas.length, 0);
        const redo = p?.notYet ? p.notYet.missed.filter((id) => !p.notYet!.redone.includes(id)).length : 0;
        const locked = view.status === 'locked';
        const doneN = stop.lessons.filter((l) => p?.lessonsDone.includes(l.id)).length;
        const meta = locked ? <Icon name="lock" size={14} label="Locked" /> : redo ? `${redo} to redo` : view.status === 'learning' ? `${doneN} of ${stop.lessons.length}` : `${ideas} ideas`;
        return (
          <Row
            key={stop.id}
            lead={<span className={`sl-disc d-${DISC[view.status]}`}>{stop.n}</span>}
            title={stop.title}
            sub={<span className="sl-ellipsis">{stop.lessons.map((l) => l.title.toLowerCase()).join(' · ')}</span>}
            meta={meta}
            metaTone={redo ? 'orange' : view.status === 'learning' ? 'cyan' : locked ? 'muted' : 'mint'}
            onClick={() => actions.navigate({ name: 'stop', stopId: stop.id })}
          />
        );
      })}
    </div>
  );

  return (
    <div className="page sl-page">
      <PageHead title="Library" />
      <SearchButton onOpen={() => actions.navigate({ name: 'search' })} placeholder="Find anything" />
      <div className="sl-seg" role="tablist" aria-label="Kind">
        {KINDS.map((k) => (
          <button key={k.kind} type="button" role="tab" aria-selected={kind === k.kind} className={`sl-seg-btn c-${k.tone}`} onClick={() => actions.navigate({ name: 'library', kind: k.kind })}>
            {k.label}
          </button>
        ))}
      </div>

      {kind === 'all' && (
        <>
          <h3 className="sl-label t-lime">Practice · open now</h3>
          {practiceCards(false)}
          <h3 className="sl-label">All ideas · by stop</h3>
          {ideasByStop}
        </>
      )}

      {kind === 'ideas' && (
        <>
          <p className="sl-sub">Read the key ideas again, or try a lesson one more time. More open as you pass stops.</p>
          {views.filter(({ view }) => view.status !== 'locked' && view.status !== 'soon').map(({ stop }) => {
            const done = save.stops[stop.id]?.lessonsDone ?? [];
            return (
              <section key={stop.id} className="sl-section" aria-labelledby={`lib-${stop.id}`}>
                <div className="sl-section-head">
                  <h3 id={`lib-${stop.id}`} className="sl-label t-cyan">Stop {stop.n} · {stop.title}</h3>
                  <button type="button" className="sl-link" onClick={() => actions.navigate({ name: 'stop', stopId: stop.id })}>Stop page</button>
                </div>
                <div className="sl-list">
                  {stop.lessons.map((lesson, k) => (
                    <Row
                      key={lesson.id}
                      lead={<span className={`sl-disc d-${done.includes(lesson.id) ? 'mint' : 'cyan'}`}>{done.includes(lesson.id) ? <Icon name="check" size={14} strokeWidth={3} /> : k + 1}</span>}
                      title={`Lesson ${k + 1} · ${lesson.title}`}
                      sub={<span className="sl-ellipsis">{lesson.ideas.map((c) => c.title).join(' · ')}</span>}
                      meta={done.includes(lesson.id) ? 'Re-read' : 'Open'}
                      metaTone="cyan"
                      onClick={() => actions.navigate({ name: 'lesson', stopId: stop.id, lessonId: lesson.id, from: 'library' })}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {kind === 'practice' && (
        <>
          <p className="sl-sub">No clock. One puzzle at a time, with the reason after every answer. Each stop’s practice opens when you pass it.</p>
          {practiceCards(true)}
          <p className="sl-note">Blitz and Conquer modes are coming in a later version.</p>
        </>
      )}

      {kind === 'lab' && (
        <>
          <BridgeProgressCard />
          <PatternBridgeHome open />
        </>
      )}

      {kind === 'soon' && (
        <div className="sl-list">
          {views.filter(({ view }) => view.status === 'soon').map(({ stop }) => (
            <Row key={stop.id} lead={<span className="sl-disc d-muted">{stop.n}</span>} title={stop.title} sub={stop.idea} meta="soon" metaTone="muted" onClick={() => actions.navigate({ name: 'stop', stopId: stop.id })} />
          ))}
          <Row lead={<span className="sl-disc d-muted">⚡</span>} title="Blitz and Conquer" sub="Faster Arcade modes" meta="later" metaTone="muted" />
          <Row lead={<span className="sl-disc d-muted">☁</span>} title="Sync across devices" sub="Play on more than one device" meta="v0.5" metaTone="muted" />
        </div>
      )}
    </div>
  );
}
