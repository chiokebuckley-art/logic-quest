import { PatternBridgeHome, DestinationArt } from '../pattern/PatternBridge';
/** Arcade: practice any passed stop, one puzzle at a time. Blitz and Conquer come later. */
import { useState } from 'react';
import { seedFor } from '../../engine/journey/mastery';
import { STOPS, stopById } from '../../content/stops';
import { useStore, type Route } from '../store';
import { Icon, STOP_ICONS } from '../components/Icon';
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
  return (
    <div className="page">
      <div className="row between wrap" style={{ gap: 6 }}>
        <h2 className="page-title">ARCADE</h2>
        <span className="small muted">More games are coming later</span>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <div className="seg" role="radiogroup" aria-label="Mode">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={m === 'Practice'}
              disabled={m !== 'Practice'}
              aria-describedby={m === 'Practice' ? undefined : 'modes-later'}
            >
              {m}
            </button>
          ))}
        </div>
        <p id="modes-later" className="small muted">Blitz and Conquer: coming in a later version.</p>
        <p className="soft-text" style={{ fontSize: 14 }}>
          No clock. One puzzle at a time, with the reason after every answer. Stop when you like.
        </p>
      </div>

      <PatternBridgeHome />
      <div className="arcade-grid">
        {STOPS.map((stop) => {
          const open = !!save.stops[stop.id]?.passDay && !!stop.practice && stop.ready;
          const sub = open ? `Stop ${stop.n} · tap to practice` : !stop.ready ? `Stop ${stop.n} · coming soon` : `Opens when you pass Stop ${stop.n}`;
          return (
            <button
              key={stop.id}
              type="button"
              className="arcade-card"
              disabled={!open}
              onClick={() => actions.navigate({ name: 'arcade', practice: stop.id })}
            >
              <DestinationArt stopId={stop.id} />
              <Icon name={open ? STOP_ICONS[stop.id] ?? 'star' : 'lock'} size={26} color={open ? 'var(--teal)' : 'var(--muted)'} />
              <span className="arcade-name">{stop.title}</span>
              <span className="arcade-sub">{sub}</span>
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
