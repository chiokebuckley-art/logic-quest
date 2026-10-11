/**
 * Library (1h): the cross-stop index. Ideas (every lesson and key-idea card, to re-read), Real life (where each idea
 * is used, and why it matters), Words (the glossary: each word once its lesson is done), Practice (passed stops),
 * Pattern Lab (Workshop, events, badges) and Soon (only while some stop is still coming). Replaces the old Learn tab.
 */
import { useEffect } from 'react';
import { viewAll } from '../../engine/journey/mastery';
import { STOPS, stopLabel, stopNumber } from '../../content/stops';
import type { StopDef } from '../../engine/types';
import { collectedCount, glossaryEntries } from '../glossary';
import { useStore, type LibraryKind, type Route } from '../store';
import { Icon } from '../components/Icon';
import { PageHead, Row, SearchButton, StopArt } from '../components/kit';
import { BridgeProgressCard, PatternBridgeHome } from '../pattern/PatternBridge';
import { lessonWorld, stopWorld } from '../../content/world';

const KINDS: { kind: LibraryKind; label: string; tone: string }[] = [
  { kind: 'all', label: 'All', tone: 'gold' },
  { kind: 'ideas', label: 'Ideas', tone: 'cyan' },
  { kind: 'real', label: 'Real life', tone: 'mint' },
  { kind: 'words', label: 'Words', tone: 'gold' },
  { kind: 'practice', label: 'Practice', tone: 'lime' },
  { kind: 'lab', label: 'Pattern Lab', tone: 'violet' },
  { kind: 'soon', label: 'Soon', tone: 'muted' },
];

/** The tabs to show: Soon only while some stop is still coming. */
export const libraryKinds = (stops: readonly StopDef[] = STOPS) => KINDS.filter((k) => k.kind !== 'soon' || stops.some((s) => !s.ready));

/** A stop's disc: its shown number, or its ring number in the Observatory. */
const discOf = (stop: StopDef) => (stop.observatory ? stop.observatory.ring : stopNumber(stop));

const DISC: Record<string, string> = { mastered: 'mint', lockedIn: 'gold', passed: 'gold', notYet: 'orange', resting: 'orange', learning: 'cyan', ready: 'cyan', locked: 'muted', soon: 'muted' };

export function LibraryScreen({ route }: { route: Extract<Route, { name: 'library' }> }) {
  const { save, today, actions } = useStore();
  // Real life opened for one stop: scroll to it once the page is drawn.
  useEffect(() => {
    if (route.kind !== 'real' || !route.stop) return;
    const f = window.requestAnimationFrame(() => document.getElementById(`real-stop-${route.stop}`)?.scrollIntoView({ block: 'start' }));
    return () => window.cancelAnimationFrame(f);
  }, [route.kind, route.stop]);
  if (!save) return null;
  const kind = route.kind ?? 'all';
  const views = viewAll(STOPS, save.stops, today);
  const ready = views.filter(({ stop }) => stop.ready);
  const words = glossaryEntries(save);
  const wordCount = collectedCount(save);

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
            lead={<span className={`sl-disc d-${DISC[view.status]}`}>{discOf(stop)}</span>}
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
      <div className="sl-seg sl-seg--grid" role="tablist" aria-label="Kind">
        {libraryKinds().map((k) => (
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
          <h3 className="sl-label t-mint">In real life</h3>
          <div className="sl-list">
            <Row
              lead={<span className="sl-disc d-mint" aria-hidden="true">★</span>}
              title="Where each idea is used"
              sub="Real examples from school, games and jobs, and why each idea matters"
              meta="Open"
              metaTone="mint"
              onClick={() => actions.navigate({ name: 'library', kind: 'real' })}
            />
          </div>
          <h3 className="sl-label t-gold">Words</h3>
          <div className="sl-list">
            <Row
              lead={<span className="sl-disc d-gold">{wordCount}</span>}
              title="Words you know"
              sub={wordCount ? `${wordCount} ${wordCount === 1 ? 'word' : 'words'} collected, each with what it means` : 'Finish a lesson to collect its words.'}
              meta="Open"
              metaTone="gold"
              onClick={() => actions.navigate({ name: 'library', kind: 'words' })}
            />
          </div>
        </>
      )}

      {kind === 'words' && (
        <>
          <p className="sl-sub">Each word a lesson teaches shows here once you finish that lesson.</p>
          {words.length === 0 && <p className="sl-note">Finish a lesson to collect its words.</p>}
          {words.map(({ stop, terms }) => (
            <section key={stop.id} className="sl-section" aria-labelledby={`words-${stop.id}`}>
              <div className="sl-section-head">
                <h3 id={`words-${stop.id}`} className="sl-label t-gold">{stopLabel(stop)} · {stop.title}</h3>
              </div>
              <dl className="sl-words">
                {terms.map((t) => (
                  <div key={`${t.lessonId}-${t.term}`} className="sl-word">
                    <dt><strong>{t.term}</strong>{t.also ? <span className="sl-word-also">, also called {t.also}</span> : null}</dt>
                    <dd>
                      <span className="sl-word-means">{t.means}</span>
                      <span className="sl-word-from">from Lesson {t.lessonNumber} · {t.lessonTitle}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </>
      )}

      {kind === 'real' && (
        <>
          <p className="sl-sub">Where each idea is used in real life, and why it matters. Read them again to keep them in mind.</p>
          {STOPS.map((stop) => {
            const line = stopWorld(stop.id);
            if (!line) return null;
            // A coming stop has its one line and no lessons yet: nothing to open.
            if (!stop.lessons.some((l) => lessonWorld(l.id))) {
              return (
                <section key={stop.id} id={`real-stop-${stop.id}`} className="sl-real sl-real-soon" aria-label={`${stopLabel(stop)} · ${stop.title}`}>
                  <span className="sl-label t-mint">{stopLabel(stop)} · {stop.title}{stop.ready ? '' : ' · coming soon'}</span>
                  <span className="sl-real-line">{line}</span>
                </section>
              );
            }
            return (
              <details key={stop.id} id={`real-stop-${stop.id}`} className="sl-real sl-real-stop" open={route.stop === stop.id}>
                <summary>
                  <span className="sl-label t-mint">{stopLabel(stop)} · {stop.title}{stop.ready ? '' : ' · coming soon'}</span>
                  <span className="sl-real-line">{line}</span>
                </summary>
                {stop.lessons.map((lesson, k) => {
                  const w = lessonWorld(lesson.id);
                  if (!w) return null;
                  return (
                    <div key={lesson.id} className="sl-real-lesson">
                      <h4 className="sl-real-title">Lesson {k + 1} · {lesson.title}</h4>
                      <p className="sl-real-why"><span className="sl-real-why-label">Why it matters</span> {w.why}</p>
                      <ul className="sl-real-list">
                        {w.uses.map((u) => (
                          <li key={u.who}><strong>{u.who}.</strong> {u.text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </details>
            );
          })}
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
                  <h3 id={`lib-${stop.id}`} className="sl-label t-cyan">{stopLabel(stop)} · {stop.title}</h3>
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
            <Row key={stop.id} lead={<span className="sl-disc d-muted">{discOf(stop)}</span>} title={stop.title} sub={stop.idea} meta="soon" metaTone="muted" onClick={() => actions.navigate({ name: 'stop', stopId: stop.id })} />
          ))}
          <Row lead={<span className="sl-disc d-muted">⚡</span>} title="Blitz and Conquer" sub="Faster Arcade modes" meta="later" metaTone="muted" />
        </div>
      )}
    </div>
  );
}
