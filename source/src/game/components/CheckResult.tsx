/**
 * The result of a check. Passed: what comes next for this kind of check. Not yet: every missed
 * question with what the player said, the right answer and the reason, grouped by lesson, with
 * "Learn this again" per lesson.
 */
import { useEffect, useRef } from 'react';
import type { CheckKind } from '../../engine/journey/mastery';
import type { Answer, Item, Thing } from '../../engine/types';
import { describeAnswer, describeAssignLines, describeRight, rightAnswer } from '../describe';
import { CHECK_LABEL } from './CheckRunner';
import type { AnswerRecord, CheckResultProps } from './contracts';
import { PlayHeader } from './ItemView';
import { SceneView } from './SceneView';
import { PlayIcon, ThingCard } from './ThingCard';

const NEXT_AFTER_PASS: Record<CheckKind, (n: number) => string> = {
  pass: (n) => `Every answer was right, so Stop ${n} is passed. Next comes the lock-in check. It opens on a later day and uses new questions about the same ideas.`,
  lockin: (n) => `Every answer was right again, so Stop ${n} is locked in. The last step is the week check. It opens about a week after you first passed.`,
  week: (n) => `Every answer was right for the third time. Stop ${n} is mastered. That means you showed you know it on three different days.`,
};

type StepState = 'done' | 'now' | 'later';

function lockSteps(kind: CheckKind, passed: boolean): { title: string; note: string; state: StepState }[] {
  const order: CheckKind[] = ['pass', 'lockin', 'week'];
  const at = order.indexOf(kind);
  const reached = passed ? at + 1 : at; // steps before this index are done
  const info: Record<CheckKind, [string, string]> = {
    pass: ['Pass the check', 'Every answer right'],
    lockin: ['Lock it in', 'New questions on a later day'],
    week: ['Week check', 'New questions about a week later'],
  };
  return order.map((k, i) => ({
    title: info[k][0],
    note: info[k][1],
    state: i < reached ? 'done' : i === reached ? 'now' : 'later',
  }));
}

/** Small shape cards, for tap-all answers. */
function SmallCards({ things, label }: { things: Thing[]; label: string }) {
  return (
    <ul className="play-things play-things--small" aria-label={label}>
      {things.map((t) => (
        <li key={t.id} className="play-things-slot">
          <ThingCard thing={t} />
        </li>
      ))}
    </ul>
  );
}

/** An answer in words. Grid and knights answers go one person per line, so they are easy to compare. */
function AnswerWords({ item, answer }: { item: Item; answer: Answer }) {
  if (item.kind === 'assign' && answer.kind === 'assign') {
    return (
      <ul className="play-said-lines">
        {describeAssignLines(item, answer.values).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    );
  }
  return <span>{describeAnswer(item, answer)}</span>;
}

function RightAnswer({ item }: { item: Item }) {
  if (item.kind === 'tapall') {
    if (!item.answer.length) return <span>No card fits, so the right move was to choose none.</span>;
    return <SmallCards things={item.things.filter((t) => item.answer.includes(t.id))} label="Cards that fit" />;
  }
  if (item.kind === 'multi' && !item.answer.length) return <span>No card was needed, so the right move was to choose none.</span>;
  if (item.kind === 'assign') return <AnswerWords item={item} answer={rightAnswer(item)} />;
  return <span>{describeRight(item)}</span>;
}

/** What the player answered: "Time ran out." on a timeout; nothing when no answer was kept. */
function YouSaid({ item, record }: { item: Item; record?: AnswerRecord }) {
  if (record?.timedOut) return <span>Time ran out.</span>;
  const a = record?.answer;
  if (!a) return null;
  if (item.kind === 'tapall' && a.kind === 'tapall' && a.ids.length) {
    return <SmallCards things={item.things.filter((t) => a.ids.includes(t.id))} label="Cards you chose" />;
  }
  return <AnswerWords item={item} answer={a} />;
}

function MissedItem({ item, record }: { item: Item; record?: AnswerRecord }) {
  const said = record?.timedOut || record?.answer;
  return (
    <li className="play-missed">
      <p className="play-missed-prompt">{item.prompt}</p>
      {(item.scene || item.kind === 'tapall') && (
        <details className="play-details">
          <summary>See the question again</summary>
          <div className="play-details-body">
            {item.scene && <SceneView scene={item.scene} />}
            {item.kind === 'tapall' && (
              <ul className="play-things play-things--small" aria-label="The cards">
                {item.things.map((t) => (
                  <li key={t.id} className="play-things-slot">
                    <ThingCard thing={t} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}
      <div className="play-missed-grid">
        {said && (
          <>
            <span className="play-muted">You said</span>
            <div className="play-missed-said">
              <YouSaid item={item} record={record} />
            </div>
          </>
        )}
        <span className="play-muted">Right answer</span>
        <div>
          <RightAnswer item={item} />
        </div>
        <span className="play-muted">Why</span>
        <span>{item.explain}</span>
      </div>
    </li>
  );
}

export function CheckResult({ stop, kind, items, records, passed, missed, onLearnAgain, onDone }: CheckResultProps) {
  const label = CHECK_LABEL[kind];
  const total = items.length;
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  const recordFor = (item: Item, i: number) => (records[i]?.itemId === item.id ? records[i] : records.find((r) => r.itemId === item.id));
  const right = items.filter((it, i) => recordFor(it, i)?.correct).length;
  const wrong = items.map((it, i) => ({ item: it, record: recordFor(it, i) })).filter((x) => !x.record?.correct);

  // Missed lessons in the order given, then any other lesson that has a missed item.
  const lessonIds = [...missed, ...wrong.map((w) => w.item.lesson).filter((id, k, all) => !missed.includes(id) && all.indexOf(id) === k)];
  const lessonName = (id: string) => {
    const k = stop.lessons.findIndex((l) => l.id === id);
    return k >= 0 ? { n: k + 1, title: stop.lessons[k].title } : { n: 0, title: id };
  };
  const redoList = missed.map((id) => {
    const l = lessonName(id);
    return l.n ? `Lesson ${l.n} · ${l.title}` : l.title;
  });

  return (
    <div className="play-root">
      <PlayHeader over={`Stop ${stop.n} · ${stop.title}`} title={label} onBack={onDone} backLabel="Back to the Journey" />

      <div className="play-score">
        <div className={`play-ring ${passed ? 'play-ring--pass' : 'play-ring--notyet'}`} aria-hidden="true">
          <span className="play-ring-n">{right}</span>
          <span className="play-ring-of">of {total}</span>
        </div>
        <div className="play-score-text">
          <h2 className={`play-score-head ${passed ? 'is-pass' : 'is-notyet'}`} ref={headRef} tabIndex={-1}>
            {passed ? 'Passed' : `Not yet · ${right} of ${total}`}
          </h2>
          <p className="play-body">
            {passed ? `You got all ${total} right.` : 'A stop passes when every answer is right.'}
          </p>
        </div>
      </div>

      {passed && (
        <>
          <div className="play-feedback play-feedback--right">
            <p>{NEXT_AFTER_PASS[kind](stop.n)}</p>
          </div>
          <button type="button" className="play-btn play-btn--teal play-btn--block" onClick={onDone}>
            Back to the Journey
          </button>
        </>
      )}

      {!passed && (
        <>
          {lessonIds.map((id) => {
            const l = lessonName(id);
            const mine = wrong.filter((w) => w.item.lesson === id);
            return (
              <section key={id} className="play-card play-missed-group" aria-labelledby={`play-missed-${id}`}>
                {missed.includes(id) ? (
                  <span className="play-kicker play-kicker--amber">Idea to learn again</span>
                ) : (
                  <span className="play-kicker play-kicker--teal">Learned again ✓</span>
                )}
                <h3 className="play-subhead" id={`play-missed-${id}`}>
                  {l.n ? `Lesson ${l.n} · ${l.title}` : l.title}
                </h3>
                <ul className="play-missed-list">
                  {mine.map((w) => (
                    <MissedItem key={w.item.id} item={w.item} record={w.record} />
                  ))}
                </ul>
                {missed.includes(id) && (
                  <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={() => onLearnAgain(id)}>
                    Learn it again{l.n ? `: Lesson ${l.n}` : ''}
                  </button>
                )}
              </section>
            );
          })}
          {redoList.length > 0 && (
            <div className="play-note play-note--icon">
              <PlayIcon name="lock" size={20} />
              <div>
                The retry uses new questions, not the same ones. It opens after you redo {redoList.length === 1 ? 'this lesson' : 'these lessons'}:
                <ul className="play-redo-list">
                  {redoList.map((r) => (
                    <li key={r}>
                      <strong>{r}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <button type="button" className="play-btn play-btn--ghost play-btn--block" onClick={onDone}>
            Back to the Journey
          </button>
        </>
      )}

      <section className="play-steps" aria-labelledby="play-steps-head">
        <h2 className="play-subhead play-subhead--caps" id="play-steps-head">
          How a stop is locked in
        </h2>
        <ol className="play-step-list">
          {lockSteps(kind, passed).map((s, i) => (
            <li key={s.title} className={`play-step play-step--${s.state}`}>
              <span className="play-step-n" aria-hidden="true">
                {s.state === 'done' ? <PlayIcon name="check" size={16} /> : i + 1}
              </span>
              <span className="play-step-text">
                <span className="play-step-title">
                  {s.title}
                  <span className="play-sr">{s.state === 'done' ? ' (done)' : s.state === 'now' ? ' (next)' : ''}</span>
                </span>
                <span className="play-step-note">{s.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

