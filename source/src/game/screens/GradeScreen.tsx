/**
 * "Which grade are you in?" (docs/KID-JOURNEY.md §2): nine big buttons, Grade 1 to Grade 8 and high school, a short
 * placement check for a kid who is not sure, and "I'm a grown-up" for the classic Journey (no grade).
 */
import { GRADES, gradeNumber } from '../../content/grades';
import { useStore } from '../store';

export function GradeScreen() {
  const { save, actions } = useStore();
  if (!save) return null;
  const now = save.kid.grade;
  return (
    <div className="page kid-grade">
      <h2 className="kid-title" id="grade-title">Which grade are you in?</h2>
      <div className="kid-grade-grid" role="group" aria-labelledby="grade-title">
        {GRADES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`kid-grade-btn${g.id === 'hs' ? ' is-wide' : ''}`}
            aria-label={g.label}
            aria-pressed={now === g.id}
            onClick={() => {
              actions.setGrade(g.id);
              actions.navigate({ name: 'home' });
            }}
          >
            {gradeNumber(g.id) ?? g.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn primary block big" onClick={() => actions.navigate({ name: 'placement' })}>
        Not sure? Try a short check
      </button>
      <button
        type="button"
        className="btn ghost block"
        onClick={() => {
          actions.setGrade(null);
          actions.navigate({ name: 'home' });
        }}
      >
        I’m a grown-up
      </button>
      {/* Opened from Me to change a grade already set: a way back that keeps it. */}
      {now && (
        <button type="button" className="btn ghost block" onClick={() => actions.navigate({ name: 'me' })}>
          Back
        </button>
      )}
    </div>
  );
}
