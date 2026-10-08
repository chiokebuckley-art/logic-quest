/**
 * The Pattern Observatory's diagnostic: 8 to 10 items, about 5 minutes, no timer, no hints. Each track starts at L1;
 * two right in a row moves it up a level; the first miss ends that track. The result is an entry level per track and
 * the places whose skill was shown (they open without their prerequisite). A grown-up can change the levels. Levels
 * are never ages, and no ability label is drawn from a few answers.
 */
import { useRef, useState } from 'react';
import { EVIDENCE, LEVEL_NAMES, TRACK_NAMES, entryLevel, startTrack, stepTrack, type Level, type Track, type TrackState } from '../../engine/evidence';
import { createRng } from '../../engine/rng';
import type { Item } from '../../engine/types';
import { useStore } from '../store';
import { Dots, ItemView, PlayHeader, type DotState } from '../components/ItemView';
import type { AnswerRecord } from '../components/contracts';
import { OBSERVATORY } from '../observatory';
import { GrownUpGate } from './SettingsScreen';

const TRACKS: Track[] = [1, 2, 3, 4];

/** One diagnostic item for a track at a level, from whichever ring serves it. */
export function diagnosticItem(track: Track, level: Level, seed: number): Item | null {
  for (const stop of OBSERVATORY) {
    const it = stop.observatory?.diagnostic?.(createRng(seed), track, level);
    if (it) return { ...it, id: `diag-${track}-${level}-${seed % 1000}` };
  }
  return null;
}

export function DiagnosticScreen() {
  const { save, today, actions } = useStore();
  const back = () => actions.navigate({ name: 'journey', track: 'observatory' });
  const [seed] = useState(() => Math.floor(Date.now() % 1_000_000));
  const [tracks, setTracks] = useState<Record<Track, TrackState>>(() => ({ 1: startTrack(), 2: startTrack(), 3: startTrack(), 4: { ...startTrack(), level: 2 } }));
  const [count, setCount] = useState(0);
  const [turn, setTurn] = useState(0);
  const [item, setItem] = useState<{ track: Track; item: Item } | null>(() => nextItem({ 1: startTrack(), 2: startTrack(), 3: startTrack(), 4: { ...startTrack(), level: 2 } }, 0, seed));
  const [finished, setFinished] = useState(false);
  const shown = useRef<Set<string>>(new Set());
  const [gateOpen, setGateOpen] = useState(false);
  const [levels, setLevels] = useState<Record<string, Level> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!save) return null;

  const finish = (ts: Record<Track, TrackState>) => {
    const lv: Record<string, Level> = {};
    for (const t of TRACKS) lv[String(t)] = entryLevel(ts[t]);
    setLevels(lv);
    setFinished(true);
    actions.setDiagnostic({ day: today, levels: lv, shown: [...shown.current] });
  };

  const answered = (r: AnswerRecord) => {
    if (!item) return;
    actions.recordEvidence(r, 'diagnostic');
    if (r.correct) shown.current.add(item.item.lesson);
    const ts = { ...tracks, [item.track]: stepTrack(tracks[item.track], r.correct, 4) };
    const n = count + 1;
    setTracks(ts);
    setCount(n);
    if (n >= EVIDENCE.diagnostic.maxItems) { finish(ts); return; }
    const next = nextItem(ts, turn + 1, seed + n * 7);
    setTurn(turn + 1);
    if (!next) { finish(ts); return; }
    setItem(next);
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  };

  if (!item && !finished) {
    return (
      <div className="page">
        <p className="soft-text">The diagnostic has no questions yet. The Observatory’s rings are still being built.</p>
        <button type="button" className="btn primary" onClick={back}>Back to the Observatory</button>
      </div>
    );
  }

  if (finished && levels) {
    return (
      <div className="page-play">
        <div className="play-root">
          <PlayHeader over="Pattern Observatory" title="Your starting levels" onBack={back} backLabel="Back to the Observatory" />
          <section className="play-card" aria-labelledby="diag-done">
            <span className="play-kicker">Done · {count} questions</span>
            <h2 id="diag-done" className="play-idea-title">Where to start on each track</h2>
            <ul className="play-list">
              {TRACKS.map((t) => (
                <li key={t}><strong>Track {t} · {TRACK_NAMES[t]}:</strong> L{levels[String(t)]} {LEVEL_NAMES[levels[String(t)]]}</li>
              ))}
            </ul>
            <p className="play-body">Levels are places to start, not labels. Every place still starts at its first idea; a higher level just skips the easiest tries. A grown-up can change these.</p>
            {!gateOpen ? (
              <details className="play-details">
                <summary>Grown-ups: change the levels</summary>
                <div className="play-details-body"><GrownUpGate onOpen={() => setGateOpen(true)} /></div>
              </details>
            ) : (
              <div className="play-stack-sm">
                {TRACKS.map((t) => (
                  <label key={t} className="play-body" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>Track {t}</span>
                    <select className="input" value={levels[String(t)]} onChange={(e) => { const lv = { ...levels, [String(t)]: Number(e.target.value) as Level }; setLevels(lv); actions.setDiagnostic({ day: today, levels: lv, shown: [...shown.current], overridden: true }); }}>
                      {([1, 2, 3, 4] as Level[]).map((l) => <option key={l} value={l}>L{l} {LEVEL_NAMES[l]}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={back}>Back to the Observatory</button>
          </section>
        </div>
      </div>
    );
  }

  const dots: DotState[] = Array.from({ length: EVIDENCE.diagnostic.maxItems }, (_, k) => (k < count ? 'done' : k === count ? 'now' : 'todo'));
  return (
    <div className="page-play">
      <div className="play-root" ref={rootRef}>
        <PlayHeader over="Pattern Observatory" title="Find your level" onBack={back} backLabel="Leave (nothing is saved)" />
        <div className="play-progress">
          <Dots states={dots} label={`Question ${count + 1} of up to ${EVIDENCE.diagnostic.maxItems}`} />
          <span className="play-muted">No timer · no hints</span>
        </div>
        {count === 0 && <p className="play-note">About five minutes. A miss just ends that track; it never counts against you.</p>}
        {item && <ItemView key={item.item.id} item={item.item} mode="check" readAloud={save.settings.readAloud} timeLimit={null} kicker={`Track ${item.track} · ${TRACK_NAMES[item.track]}`} nextLabel="Next" onDone={answered} />}
      </div>
    </div>
  );
}

/** The next item: the tracks take turns; an ended track is skipped; a track with no item at its level ends. */
function nextItem(ts: Record<Track, TrackState>, turn: number, seed: number): { track: Track; item: Item } | null {
  for (let k = 0; k < TRACKS.length; k++) {
    const track = TRACKS[(turn + k) % TRACKS.length];
    const t = ts[track];
    if (t.ended) continue;
    const it = diagnosticItem(track, t.level, seed + track * 31);
    if (it) return { track, item: it };
    ts[track] = { ...t, ended: true };
  }
  return null;
}
