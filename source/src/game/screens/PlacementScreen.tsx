/**
 * The placement check (docs/KID-JOURNEY.md §0): two questions per grade from Grade 1 up, no timer, read aloud, and it
 * stops at two misses in a row (16 questions at most). It places into the highest grade with a right answer; the
 * grades below stay open to play. Answers count nowhere. A grown-up can change the grade on the result. A question of
 * Grades 1 to 3 is drawn in kid mode (its kid words, or its kid-only alternate: placementKid and placementItem).
 */
import { useRef, useState } from 'react';
import { GRADES, gradeById, type GradeId } from '../../content/grades';
import { PLACEMENT_MAX, placementBand, placementGrade, placementItem, placementKid, placementStep, startPlacement, type PlacementState } from '../kid';
import { KidModeContext } from '../kidMode';
import { useStore } from '../store';
import { Dots, ItemView, PlayHeader, type DotState } from '../components/ItemView';
import type { AnswerRecord } from '../components/contracts';
import { GrownUpGate } from './SettingsScreen';
import { Pip } from '../components/KidJourney';

export function PlacementScreen() {
  const { save, actions } = useStore();
  const [seed] = useState(() => Math.floor(Date.now() % 1_000_000));
  const [st, setSt] = useState<PlacementState>(startPlacement);
  const [placed, setPlaced] = useState<GradeId | null>(null);
  const [gate, setGate] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!save) return null;
  const back = () => actions.navigate({ name: 'grade' });

  const band = placementBand(st);
  const k = st.answers.length % 2;
  const item = band ? placementItem(band, k, seed + st.answers.length * 131) : null;

  const finish = (end: PlacementState) => {
    const g = placementGrade(end);
    setPlaced(g);
    actions.setGrade(g, 'check');
  };

  const answered = (r: AnswerRecord) => {
    actions.recordAnswer(r, { fromPlacement: true });
    const next = placementStep(st, r.correct);
    setSt(next);
    if (next.done || !placementBand(next)) finish(next);
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  };

  if (placed || (!item && st.answers.length)) {
    const g = gradeById(placed ?? placementGrade(st));
    return (
      <div className="page-play">
        <div className="play-root">
          <PlayHeader over="Short check" title="All done" onBack={() => actions.navigate({ name: 'home' })} backLabel="Go home" />
          <section className="play-card kid-placed" aria-labelledby="placed-title">
            <Pip cheer />
            <h2 id="placed-title" className="play-idea-title">Start in {g.label}!</h2>
            <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={() => actions.navigate({ name: 'home' })}>Go</button>
            {!gate ? (
              <details className="play-details">
                <summary>Grown-ups: change the grade</summary>
                <div className="play-details-body"><GrownUpGate onOpen={() => setGate(true)} /></div>
              </details>
            ) : (
              <label className="play-body kid-placed-pick">
                <span>Grade</span>
                <select className="input" value={g.id} onChange={(e) => { const id = e.target.value as GradeId; setPlaced(id); actions.setGrade(id, 'grownup'); }}>
                  {GRADES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
              </label>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page">
        <p className="soft-text">The short check has no questions yet.</p>
        <button type="button" className="btn primary" onClick={back}>Back</button>
      </div>
    );
  }

  const n = st.answers.length;
  const dots: DotState[] = Array.from({ length: Math.min(PLACEMENT_MAX, n + 2) }, (_, i) => (i < n ? 'done' : i === n ? 'now' : 'todo'));
  return (
    <div className="page-play">
      <div className="play-root" ref={rootRef}>
        <PlayHeader over="Short check" title="Let’s see!" onBack={back} backLabel="Leave the check" />
        <div className="play-progress">
          <Dots states={dots} label={`Question ${n + 1}`} />
          <span className="play-muted">No timer</span>
        </div>
        {n === 0 && <p className="play-note">Just try. A miss is fine.</p>}
        <KidModeContext.Provider value={band ? placementKid(band) : null}>
          <ItemView key={item.id} item={item} mode="check" readAloud timeLimit={null} kicker={`Question ${n + 1}`} nextLabel="Next" onDone={answered} />
        </KidModeContext.Provider>
      </div>
    </div>
  );
}
