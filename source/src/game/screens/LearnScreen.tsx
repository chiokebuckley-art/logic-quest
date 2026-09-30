/** Every lesson of every open stop. Any lesson can be opened again for review. */
import { viewAll } from '../../engine/journey/mastery';
import { STOPS } from '../../content/stops';
import { useStore } from '../store';
import { Icon } from '../components/Icon';

export function LearnScreen() {
  const { save, today, actions } = useStore();
  if (!save) return null;
  const open = viewAll(STOPS, save.stops, today).filter(({ view }) => view.status !== 'locked' && view.status !== 'soon');

  return (
    <div className="page">
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="page-title">LEARN</h2>
        <p className="soft-text">Read the key ideas again, or try a lesson one more time.</p>
      </div>

      {open.length === 0 && <p className="muted">No lessons are open yet.</p>}

      {open.map(({ stop }) => {
        const done = save.stops[stop.id]?.lessonsDone ?? [];
        const count = stop.lessons.filter((l) => done.includes(l.id)).length;
        return (
          <section key={stop.id} className="stack" aria-labelledby={`learn-${stop.id}`}>
            <div className="row between">
              <h3 id={`learn-${stop.id}`} className="section-title">STOP {stop.n} · {stop.title.toUpperCase()}</h3>
              <span className={`chip${count === stop.lessons.length ? ' teal' : ''}`}>{count} of {stop.lessons.length} done</span>
            </div>
            <ul className="lesson-list">
              {stop.lessons.map((lesson, i) => {
                const isDone = done.includes(lesson.id);
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className="lesson-btn"
                      onClick={() => actions.navigate({ name: 'lesson', stopId: stop.id, lessonId: lesson.id, from: 'learn' })}
                    >
                      <span className={`tick${isDone ? ' done' : ''}`} aria-hidden="true">
                        {isDone ? <Icon name="check" size={16} strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="grow stack" style={{ gap: 0 }}>
                        <span className="small muted">Lesson {i + 1}{isDone ? ' · done' : ''}</span>
                        <span style={{ fontWeight: 700 }}>{lesson.title}</span>
                      </span>
                      <Icon name="chevron" size={18} color="var(--muted)" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="small muted">More lessons open as you pass stops on the Journey.</p>
    </div>
  );
}

