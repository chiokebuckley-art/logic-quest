/**
 * The Journey's "My grade" track (docs/KID-JOURNEY.md §2): the band's star sky, its worlds as rows of rounds (a star,
 * then Play or a lock), each world's check row, Pip with the stickers earned, the grade badge once earned, and the
 * other grades, folded away, to move up or down. Rounds open from here skip the stop-order and place gates.
 */
import type { SaveData } from '../../engine/save/save';
import { GRADES, gradeById, roundOpen, type GradeId, type WorldDef } from '../../content/grades';
import { hasBadge, roundsToRedo, skippedBands, starsIn, stickersIn, worldCheckState, type WorldCheckState } from '../kid';
import { lessonById } from '../observatory';
import { useStore } from '../store';
import { Icon } from '../components/Icon';
import { Building, GradeBadge, Pip, StarSky } from '../components/KidJourney';
import { sayRoundStart } from '../kidPlay';

const CHECK_SUB: Record<WorldCheckState, string> = {
  locked: 'Get a star on every round first.',
  open: 'Every answer must be right.',
  redo: 'Play the missed rounds first',
  notyet: 'Not yet. Try again!',
  passed: 'Passed. You built it!',
};

function StarMark({ kind }: { kind: 'clean' | 'mended' | undefined }) {
  return (
    <span className={`kid-row-star${kind ? ` is-${kind}` : ''}`}>
      <Icon name="star" size={18} />
      <span className="sr-only">{kind === 'clean' ? 'Bright star.' : kind === 'mended' ? 'Star.' : 'No star yet.'}</span>
    </span>
  );
}

function WorldRows({ save, world }: { save: SaveData; world: WorldDef }) {
  const { actions } = useStore();
  const state = worldCheckState(save, world);
  // The missed rounds still to play again, marked orange until they are.
  const missed = roundsToRedo(save, world);
  return (
    <section className="sl-section kid-world" aria-labelledby={`w-${world.id}`}>
      <div className="sl-section-head">
        <h4 id={`w-${world.id}`} className="sl-label">{world.title}</h4>
        <Building world={world} built={!!save.kid.worlds[world.id]?.passDay} />
      </div>
      <ol className="kid-rounds">
        {world.rounds.map((id, i) => {
          const open = roundOpen(save, id);
          const title = lessonById(id)?.title ?? id;
          return (
            <li key={id}>
              <button
                type="button"
                className={`sl-row kid-round${missed.includes(id) ? ' r-orange' : ''}`}
                disabled={!open}
                onClick={() => {
                  sayRoundStart(save, id);
                  actions.navigate({ name: 'lesson', stopId: id.split('.')[0], lessonId: id, from: 'grades' });
                }}
              >
                <StarMark kind={save.kid.stars[id]} />
                <span className="sl-row-main">
                  <span className="sl-row-title">{i + 1}. {title}</span>
                </span>
                {open ? <span className="sl-row-meta t-gold">Play ▸</span> : <Icon name="lock" size={15} color="var(--muted)" label="Locked" />}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            className={`sl-row kid-round kid-check-row${state === 'notyet' || state === 'redo' ? ' r-orange' : ''}`}
            disabled={state === 'locked' || state === 'redo'}
            onClick={() => actions.navigate({ name: 'worldcheck', worldId: world.id })}
          >
            <span className="kid-row-star"><Icon name="check" size={18} /></span>
            <span className="sl-row-main">
              <span className="sl-row-title">World check</span>
              <span className="sl-row-sub">{CHECK_SUB[state]}</span>
            </span>
            {state === 'locked' || state === 'redo' ? <Icon name="lock" size={15} color="var(--muted)" label="Locked" /> : <span className="sl-row-meta t-gold">{state === 'passed' ? 'Again ▸' : 'Play ▸'}</span>}
          </button>
        </li>
      </ol>
    </section>
  );
}

export function GradeMap() {
  const { save, actions } = useStore();
  if (!save) return null;
  const grade = save.kid.grade;
  if (!grade) {
    return (
      <section className="sl-section" aria-labelledby="gm-none">
        <h3 id="gm-none" className="sl-label">My grade</h3>
        <p className="sl-sub">Pick your grade to see your map.</p>
        <button type="button" className="sl-cta" onClick={() => actions.navigate({ name: 'grade' })}>Pick my grade ▸</button>
      </section>
    );
  }
  const g = gradeById(grade);
  const stars = starsIn(save, grade);
  const stickers = stickersIn(save, grade);
  const badge = hasBadge(save, grade);
  const others = GRADES.filter((x) => x.id !== grade);
  // Grades below the player's with no star yet: still open to play, shown as skipped.
  const skipped = skippedBands(save);
  const move = (id: GradeId) => {
    actions.setGrade(id);
    actions.navigate({ name: 'journey', track: 'grades' });
  };
  return (
    <div className="kid-map">
      <section className="sl-section" aria-labelledby="gm-title">
        <div className="sl-section-head">
          <h3 id="gm-title" className="sl-label">{g.label} · {g.title}</h3>
          <span className="sl-section-meta t-gold">{stars.got} of {stars.of} stars</span>
        </div>
        <StarSky
          save={save}
          band={grade}
          onPick={(lessonId) => {
            sayRoundStart(save, lessonId);
            actions.navigate({ name: 'lesson', stopId: lessonId.split('.')[0], lessonId, from: 'grades' });
          }}
        />
        <div className="kid-pip-row">
          <Pip stickers={stickers} />
          <div className="kid-pip-words">
            <span className="sl-row-title">{stickers.length ? `${stickers.length} ${stickers.length === 1 ? 'sticker' : 'stickers'}` : 'No stickers yet'}</span>
            <span className="sl-row-sub">Three stars give a sticker.</span>
          </div>
          {badge && <GradeBadge band={grade} />}
        </div>
      </section>
      {g.worlds.map((w) => <WorldRows key={w.id} save={save} world={w} />)}
      <details className="kid-others">
        <summary>Other grades</summary>
        <ul className="kid-others-list">
          {others.map((x) => (
            <li key={x.id}>
              <button type="button" className="sl-row" onClick={() => move(x.id)}>
                <span className="sl-row-main">
                  <span className="sl-row-title">{x.label} · {x.title}</span>
                  <span className="sl-row-sub">{skipped.includes(x.id) ? 'Skipped. Open to play.' : `${starsIn(save, x.id).got} of ${starsIn(save, x.id).of} stars`}</span>
                </span>
                <span className="sl-row-meta t-gold">Go ▸</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
