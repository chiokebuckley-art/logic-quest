/**
 * The grade badge ceremony (docs/KID-JOURNEY.md §2): a full-screen card shown once, when a band's last world check
 * passes. Pip cheers, the badge, "Grade N done!". It leaves after ten seconds or a tap. With reduce motion on, nothing
 * moves. "Print a certificate" opens the browser's print view of the card.
 */
import { useEffect, useRef } from 'react';
import { gradeById, gradeNumber, type GradeId } from '../../content/grades';
import { useStore } from '../store';
import { GradeBadge, Pip } from '../components/KidJourney';

/** How long the ceremony stays before it leaves by itself. */
export const CEREMONY_MS = 10_000;

/** "Grade 3 done!", or "High school done!". */
export const badgeLine = (grade: GradeId) => `${gradeNumber(grade) !== null ? `Grade ${gradeNumber(grade)}` : gradeById(grade).label} done!`;

export function BadgeScreen({ grade }: { grade: GradeId }) {
  const { save, player, actions } = useStore();
  const timer = useRef<number | null>(null);
  const leave = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    actions.navigate({ name: 'journey', track: 'grades' });
  };
  useEffect(() => {
    timer.current = window.setTimeout(leave, CEREMONY_MS);
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const still = !!save?.settings.reduceMotion;
  const g = gradeById(grade);
  return (
    <div className={`kid-ceremony${still ? ' is-still' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ceremony-title" onClick={leave}>
      <div className="kid-ceremony-card">
        <Pip cheer size={110} />
        <GradeBadge band={grade} size={96} />
        <h2 id="ceremony-title" className="kid-title">{badgeLine(grade)}</h2>
        <p className="kid-cert-line">{player?.name} · {g.title}</p>
        <button
          type="button"
          className="btn ghost"
          onClick={(e) => {
            e.stopPropagation();
            if (timer.current !== null) window.clearTimeout(timer.current);
            timer.current = null;
            window.print?.();
          }}
        >
          Print a certificate
        </button>
        <button type="button" className="btn primary block big" onClick={(e) => { e.stopPropagation(); leave(); }}>Yay!</button>
      </div>
    </div>
  );
}
