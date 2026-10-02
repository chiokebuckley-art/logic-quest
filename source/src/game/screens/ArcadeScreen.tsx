/** Arcade: practice any passed stop, one puzzle at a time. Blitz and Conquer come later. */
import { useState } from 'react';
import { seedFor } from '../../engine/journey/mastery';
import { STOPS, stopById } from '../../content/stops';
import { PageHead, StopArt } from '../components/kit';
import { useStore, type Route } from '../store';
import { PracticeRunner } from '../components/PracticeRunner';

type ArcadeRoute = Extract<Route, { name: 'arcade' }>;

const MODES = ['Practice', 'Blitz', 'Conquer'] as const;

export function ArcadeScreen({ route }: { route: ArcadeRoute }) {
  if (route.practice) return <PracticeView stopId={route.practice} />;
  return <ArcadeHome />;
}

function ArcadeHome() {
  const { save, actions } = useStore();
  if (!save) return null;
  const openCount = STOPS.filter((stop) => !!save.stops[stop.id]?.passDay && !!stop.practice && stop.ready).length;
  return (
    <div className="page sl-page">
      <PageHead title="Arcade" right={<span className="sl-section-meta t-lime">{openCount} open</span>} sub="No clock. One puzzle at a time, with the reason after every answer. Stop when you like." />
      <div className="sl-seg" role="radiogroup" aria-label="Mode">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            className="sl-seg-btn c-lime"
            aria-checked={m === 'Practice'}
            aria-selected={m === 'Practice'}
            disabled={m !== 'Practice'}
            aria-describedby={m === 'Practice' ? undefined : 'modes-later'}
          >
            {m}
          </button>
        ))}
      </div>
      <p id="modes-later" className="sl-note">Blitz and Conquer: coming in a later version.</p>

      <div className="sl-art-grid">
        {STOPS.map((stop) => {
          const open = !!save.stops[stop.id]?.passDay && !!stop.practice && stop.ready;
          const sub = open ? 'tap to practice' : !stop.ready ? 'coming soon' : `opens at Stop ${stop.n} pass`;
          return (
            <button
              key={stop.id}
              type="button"
              className="sl-art-card"
              disabled={!open}
              onClick={() => actions.navigate({ name: 'arcade', practice: stop.id })}
            >
              <StopArt stopId={stop.id} />
              <span className="sl-art-name">{stop.n}. {stop.title}</span>
              <span className={`sl-art-sub ${open ? 't-lime' : 't-muted'}`}>{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PracticeView({ stopId }: { stopId: string }) {
  const { player, save, actions } = useStore();
  const stop = stopById(stopId);
  const [seed] = useState(() => seedFor(player?.id ?? 'guest', 'arcade', stopId, Date.now()));
  const back = () => actions.navigate({ name: 'arcade' });

  if (!stop || !save || !stop.practice || !save.stops[stop.id]?.passDay) {
    return (
      <div className="page">
        <p className="soft-text">This practice opens when you pass the stop.</p>
        <button type="button" className="btn primary" onClick={back}>Back to the Arcade</button>
      </div>
    );
  }

  return (
    <div className="page-play">
      <PracticeRunner
        key={seed}
        stop={stop}
        seed={seed}
        readAloud={save.settings.readAloud}
        onAnswer={(r) => actions.recordAnswer(r)}
        onExit={back}
      />
    </div>
  );
}
