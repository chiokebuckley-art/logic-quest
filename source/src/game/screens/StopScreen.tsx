/**
 * Stop page (1d): one page per stop. Its lessons in order, its check, practice, Pattern Lab events and the
 * repair cards that came from it. The gold row is the thing to do now. Coming-soon stops show the idea and
 * any Pattern Lab preview events.
 */
import { MAX_NOT_YETS_PER_DAY, stopOpening, viewStop, type CheckKind } from '../../engine/journey/mastery';
import { profileOf } from '../../engine/evidence';
import { EvidenceProfile } from '../components/EvidenceProfile';
import { placeNeeds, placeTitle, profileWords, ringTitle } from '../observatory';
import { lessonWaitsFor } from '../../engine/drill';
import { canFix } from '../../engine/notebook';
import { STOPS, stopById } from '../../content/stops';
import { DESTINATIONS } from '../pattern/bridges';
import { useStore, type Route } from '../store';
import { Icon } from '../components/Icon';
import { Eyebrow, KindTag, Row, stopPlace } from '../components/kit';
import { stopAction } from './JourneyScreen';
import { lessonWorld, stopWorld } from '../../content/world';

const CHECK_NAME: Record<CheckKind, string> = { pass: 'Stop check', lockin: 'Lock-in check', week: 'Week check' };

export function StopScreen({ route }: { route: Extract<Route, { name: 'stop' }> }) {
  const { save, today, actions } = useStore();
  const stop = stopById(route.stopId);
  if (!save) return null;
  if (!stop) {
    return (
      <div className="page sl-page">
        <p className="sl-sub">That stop is not here.</p>
        <button type="button" className="sl-cta" onClick={() => actions.navigate({ name: 'journey' })}>Back to the Journey</button>
      </div>
    );
  }
  const opening = stopOpening(STOPS, save.stops, stop);
  const p = save.stops[stop.id];
  const view = viewStop(stop, p, opening.open, today, opening.after);
  const plain = save.evidence.plain;
  const ob = stop.observatory;
  const open = view.status !== 'locked' && view.status !== 'soon';
  const action = open ? stopAction(stop, view) : null;
  const place = stopPlace(stop.id);
  const done = p?.lessonsDone ?? [];
  const lessonsDone = stop.lessons.filter((l) => done.includes(l.id)).length;
  const toRedo = p?.notYet && !p.notYet.missed.every((id) => p.notYet!.redone.includes(id)) ? p.notYet.missed.filter((id) => !p.notYet!.redone.includes(id)) : [];
  const run = save.lessonRun?.stopId === stop.id ? save.lessonRun : null;
  const events = DESTINATIONS.filter((d) => d.stop === stop.id).flatMap((d) => d.events.map((id, k) => ({ id, name: d.name, k })));
  const labDone = events.filter((e) => save.patternBridge.completed.includes(e.id)).length;
  const cards = Object.values(save.notebook ?? {}).filter((c) => c.stop === stop.n);
  const fixable = cards.filter((c) => c.due <= today && canFix(c, STOPS)).length;

  const stages = [
    { name: 'Lessons', done: lessonsDone === stop.lessons.length && stop.lessons.length > 0, value: `${lessonsDone} of ${stop.lessons.length}`, active: lessonsDone < stop.lessons.length },
    { name: 'Pass', done: !!p?.passDay, value: p?.passDay ? 'passed' : 'opens after', active: false },
    { name: 'Lock in', done: !!p?.lockDay, value: p?.lockDay ? 'locked in' : 'later day', active: false },
    { name: 'Master', done: !!p?.weekDay, value: p?.weekDay ? 'mastered' : 'a week on', active: false },
  ];

  // The check row shows the check that is due, else the next one to come.
  const checkKind: CheckKind = view.due ?? (p?.lockDay ? 'week' : p?.passDay ? 'lockin' : 'pass');
  const checkDue = !!view.due;
  let checkMeta: { text: string; tone: string };
  if (view.status === 'mastered') checkMeta = { text: 'all passed ✓', tone: 'mint' };
  else if (view.status === 'resting') checkMeta = { text: 'Rest today', tone: 'orange' };
  else if (checkDue) checkMeta = { text: view.status === 'notYet' ? 'Try again ▸' : 'Start ▸', tone: 'gold' };
  else if (view.status === 'notYet') checkMeta = { text: 'after redo', tone: 'orange' };
  else if (p?.lockDay || p?.passDay) checkMeta = { text: p.lockDay ? 'in a week' : 'tomorrow', tone: 'muted' };
  else checkMeta = { text: `after L${stop.lessons.length}`, tone: 'muted' };
  const triesLeft = Math.max(0, MAX_NOT_YETS_PER_DAY - (p?.notYetsByDay?.[today] ?? 0));

  return (
    <div className="page sl-page sl-stop-page">
      <div className="sl-hero">
        <img src={place.art} alt="" />
        <button type="button" className="sl-back on-art" onClick={() => actions.navigate(ob ? { name: 'journey', track: 'observatory' } : { name: 'journey' })}>‹ {ob ? 'Observatory' : 'Journey'}</button>
        <div className="sl-hero-text">
          <Eyebrow>{ob ? `Pattern Observatory · Ring ${ob.ring} · Track ${ob.track}` : `Stop ${stop.n}${place.name ? ` · ${place.name}` : ''}`}</Eyebrow>
          <h2 className="sl-title">{ob ? ringTitle(stop, plain) : stop.title}</h2>
          <p className="sl-sub">{stop.idea}</p>
        </div>
      </div>

      {open && (
        <ol className="sl-stages" aria-label="Stages">
          {stages.map((s, k) => (
            <li key={s.name} className={`sl-stage${s.done ? ' done' : ''}${s.active ? ' active' : ''}`}>
              <span className="sl-stage-dot" aria-hidden="true">{s.done ? <Icon name="check" size={14} strokeWidth={3} /> : k === 0 ? lessonsDone : ''}</span>
              <span className="sl-stage-name">{s.name}</span>
              <span className="sl-stage-sub">{s.value}</span>
            </li>
          ))}
        </ol>
      )}

      <RealLifeSection stopId={stop.id} lessons={stop.lessons} onMore={() => actions.navigate({ name: 'library', kind: 'real', stop: stop.id })} />

      {view.status === 'locked' && <p className="sl-note"><Icon name="lock" size={14} /> {view.label}.{events.length ? ' You can still look at the Pattern Lab events below.' : ''}</p>}
      {view.status === 'soon' && <p className="sl-note">This stop is coming in a later version.{events.length ? ' Its Pattern Lab events are open now as a preview.' : ''}</p>}

      <div className="sl-list">
        {open && ob && !save.evidence.diagnostic && (
          <Row
            lead={<KindTag kind="check" />}
            title="Find your level"
            sub="About 5 minutes · no timer · a miss just ends that track"
            meta="Start ▸"
            metaTone="gold"
            onClick={() => actions.navigate({ name: 'diagnostic' })}
          />
        )}
        {open && stop.lessons.map((lesson, k) => {
          const isDone = done.includes(lesson.id);
          const redo = toRedo.includes(lesson.id);
          const isNext = action?.name === 'lesson' && action.lessonId === lesson.id;
          const resuming = isNext && run?.lessonId === lesson.id;
          const tries = lesson.ideas.length;
          const waits = lessonWaitsFor(stop, lesson.id, done, save.drilled ?? []);
          const needs = stop.lessonOrder === 'free' ? placeNeeds(lesson, save) : [];
          const locked = !!waits || needs.length > 0;
          const profile = lesson.routine ? profileOf(save.evidence, lesson.id, today) : null;
          let meta: { text: string; tone: string } = { text: '', tone: 'muted' };
          if (isNext && !locked) meta = { text: resuming ? 'Resume ▸' : redo ? 'Redo ▸' : 'Start ▸', tone: redo ? 'orange' : 'gold' };
          else if (redo) meta = { text: 'redo', tone: 'orange' };
          else if (isDone) meta = { text: 'done', tone: 'mint' };
          else if (!locked && !ob && k === lessonsDone) meta = { text: 'next', tone: 'muted' };
          else if (!locked && ob) meta = { text: 'Start ▸', tone: 'gold' };
          if (waits && !isNext) meta = { text: 'after Lesson ' + k, tone: 'muted' };
          if (needs.length) meta = { text: lesson.primer ? 'primer ▸' : 'needs a skill', tone: 'muted' };
          const title = ob ? `Place ${k + 1} · ${placeTitle(lesson, plain)}` : `Lesson ${k + 1} · ${lesson.title}`;
          const sub = waits
            ? `Opens when you have done Lesson ${k}`
            : needs.length
              ? `Needs ${needs.map((n) => n.title).join(' and ')}${lesson.primer ? ', or the 3-question primer' : ''}`
              : profile
                ? `${lesson.levels ? `L${lesson.levels[0]}–L${lesson.levels[1]} · ` : ''}${profileWords(profile)}${resuming ? ' · partway' : ''}`
                : `${tries} key ${tries === 1 ? 'idea' : 'ideas'}${lesson.drill?.length ? ' + you do it' : ''} + tries${resuming ? ' · partway' : ''}`;
          const go = waits
            ? undefined
            : needs.length
              ? lesson.primer ? () => actions.navigate({ name: 'evidence', stopId: stop.id, lessonId: lesson.id, kind: 'primer' }) : undefined
              : () => actions.navigate({ name: 'lesson', stopId: stop.id, lessonId: lesson.id, from: 'stop' });
          return (
            <div key={lesson.id} className="sl-place">
              <Row
                lead={<KindTag kind="learn" />}
                title={title}
                sub={sub}
                meta={meta.text}
                metaTone={meta.tone}
                tone={isNext && !locked ? (redo ? 'orange' : 'current') : undefined}
                current={isNext && !locked}
                onClick={go}
              />
              {profile && profile.complete && (
                <div className="sl-place-evidence">
                  <EvidenceProfile profile={profile} compact />
                  {profile.reviewDue && (
                    <button type="button" className="sl-link" onClick={() => actions.navigate({ name: 'evidence', stopId: stop.id, lessonId: lesson.id, kind: 'review' })}>
                      Review due today · 4 fresh questions ▸
                    </button>
                  )}
                  {!profile.reviewDue && profile.independentDue && (
                    <button type="button" className="sl-link" onClick={() => actions.navigate({ name: 'evidence', stopId: stop.id, lessonId: lesson.id, kind: 'independent' })}>
                      Independent check · 6 fresh questions, no hints ▸
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {open && (
          <Row
            lead={<KindTag kind="check" />}
            title={`${CHECK_NAME[checkKind]} · new questions`}
            sub={view.status === 'mastered' ? 'Pass, lock-in and week checks all passed' : `passes when every answer is right · ${MAX_NOT_YETS_PER_DAY} tries a day${view.status === 'notYet' ? ` · ${triesLeft} left today` : ''}${save.settings.timer ? ' · calm timer' : ''}`}
            meta={checkMeta.text}
            metaTone={checkMeta.tone}
            tone={checkDue ? 'current' : view.status === 'notYet' || view.status === 'resting' ? 'orange' : undefined}
            current={checkDue}
            onClick={checkDue ? () => actions.navigate({ name: 'check', stopId: stop.id, kind: checkKind }) : undefined}
          />
        )}

        {open && stop.practice && (
          <Row
            lead={<KindTag kind="drill" />}
            title={`Practice ${stop.title}`}
            sub={p?.passDay ? 'no clock · one puzzle at a time' : 'no clock · opens when passed'}
            meta={p?.passDay ? 'Play ▸' : <Icon name="lock" size={14} label="Locked" />}
            metaTone="lime"
            onClick={p?.passDay ? () => actions.navigate({ name: 'arcade', practice: stop.id }) : undefined}
          />
        )}

        {events.map((e) => {
          const did = save.patternBridge.completed.includes(e.id);
          return (
            <Row
              key={e.id}
              lead={<KindTag kind="lab" />}
              title={`${e.name} · ${e.id}`}
              sub={`Pattern Lab event · ${labDone} of ${events.length} done`}
              meta={did ? 'Replay ✓' : view.status === 'soon' ? 'Preview' : 'Try'}
              metaTone="violet"
              onClick={() => actions.navigate({ name: 'pattern', event: e.id })}
            />
          );
        })}

        {cards.length > 0 && (
          <Row
            lead={<KindTag kind="fix" />}
            title={`Repair quests from Stop ${stop.n}`}
            sub={fixable ? `${fixable} ready now` : 'waiting for a later day'}
            meta={`${cards.length}`}
            metaTone="orange"
            tone={fixable ? 'orange' : undefined}
            onClick={() => actions.navigate(fixable ? { name: 'notebook', fix: true } : { name: 'notebook' })}
          />
        )}
      </div>
    </div>
  );
}

/** The stop's real-life line, and each lesson's "why" (content/world). The Library's Real life view has every example. */
function RealLifeSection({ stopId, lessons, onMore }: { stopId: string; lessons: readonly { id: string; title: string }[]; onMore(): void }) {
  const line = stopWorld(stopId);
  if (!line) return null;
  const whys = lessons.map((l, k) => ({ k, title: l.title, why: lessonWorld(l.id)?.why })).filter((x) => x.why);
  return (
    <section className="sl-real" aria-labelledby={`real-${stopId}`}>
      <h3 id={`real-${stopId}`} className="sl-label t-mint">In real life</h3>
      <p className="sl-real-line">{line}</p>
      {whys.length > 0 && (
        <details className="sl-real-more">
          <summary>Why each lesson matters</summary>
          <ul className="sl-real-list">
            {whys.map((x) => (
              <li key={x.k}>
                <strong>Lesson {x.k + 1} · {x.title}.</strong> {x.why}
              </li>
            ))}
          </ul>
        </details>
      )}
      {whys.length > 0 && (
        <button type="button" className="sl-link" onClick={onMore}>
          See where each idea is used
        </button>
      )}
    </section>
  );
}
