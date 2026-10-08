/**
 * The pieces that keep a distinction visible (two ideas a learner can merge into one, see LessonDef.distinctions):
 *
 *  - BecauseRows: the comparison behind a truth value, as three rows in words (what it says, what the test world
 *    says, whether they fit), never as symbols. A worked case shows one per stamp; a wrong check shows the learner's.
 *  - CompareRows: the same two facts with no verdict, under a sign the learner still has to stamp: the test world
 *    stays on screen, so the learner compares instead of remembering.
 *  - ContrastView: two cases side by side that differ in one thing (Scene 'contrast'), with the question under them.
 *  - MethodSteps: the steps of the method with the current one lit, so the whole chain is visible while it is new.
 *  - ConfusedPanel: "I'm confused": one or two short questions that find the first merged idea and teach it apart,
 *    instead of giving the answer. Opening it counts as help, like a hint.
 *
 * Every label is a prop (BoardWords / ContrastWords), so a card, line-up, knight or cause board never speaks of
 * signs and tests. The defaults are the sign words.
 */
import { useEffect, useRef, useState } from 'react';
import type { Because, BoardWords, ConfusedQuestion, Scene } from '../../engine/types';
import { PlayIcon, ThingCard } from './ThingCard';

type ContrastScene = Extract<Scene, { kind: 'contrast' }>;

/** The default labels: the sign words. */
export const SIGN_WORDS: Required<Omit<BoardWords, 'needs' | 'truth' | 'untruth'>> = {
  says: 'Says',
  world: 'Test',
  so: 'So',
  fit: 'The words fit the test: True.',
  unfit: 'The words do not fit the test: False.',
  ask: 'Do the words fit the test?',
  worldTag: 'Test world',
  worldNote: 'For this test only. Where the treasure is does not say if a sign is true.',
  closing: 'Those two ideas are apart now. Back to the board: take it one mark at a time.',
};


/** The board's words over the defaults. */
export const wordsOf = (words?: BoardWords) => ({ ...SIGN_WORDS, ...(words ?? {}) });

/** "Says: … / Test: … / The words fit the test, so True." */
export function BecauseRows({ because, compact = false, words }: { because: Because; compact?: boolean; words?: BoardWords }) {
  const w = wordsOf(words);
  return (
    <dl className={`play-because${compact ? ' play-because--compact' : ''}`}>
      <div className="play-because-row">
        <dt>{w.says}</dt>
        <dd>{because.says}</dd>
      </div>
      <div className="play-because-row">
        <dt>{w.world}</dt>
        <dd>{because.world}</dd>
      </div>
      <div className={`play-because-row play-because-verdict is-${because.match ? 'true' : 'false'}`}>
        <dt>{w.so}</dt>
        <dd>
          <PlayIcon name={because.match ? 'check' : 'cross'} size={14} />
          {because.match ? w.fit : w.unfit}
        </dd>
      </div>
    </dl>
  );
}

/** The two facts to compare, with no verdict: the learner decides. */
export function CompareRows({ says, world, words }: { says: string; world: string; words?: BoardWords }) {
  const w = wordsOf(words);
  return (
    <dl className="play-because play-because--compact play-because--open">
      <div className="play-because-row">
        <dt>{w.says}</dt>
        <dd>{says}</dd>
      </div>
      <div className="play-because-row">
        <dt>{w.world}</dt>
        <dd>{world}</dd>
      </div>
      <div className="play-because-row play-because-ask">
        <dt>{w.so}</dt>
        <dd>{w.ask}</dd>
      </div>
    </dl>
  );
}

/** Two cases that differ in one thing, side by side, then the question that names what changed. */
export function ContrastView({ scene, labelId }: { scene: ContrastScene; labelId?: string }) {
  const cw = scene.words ?? {};
  const worldTag = cw.worldTag ?? 'Test world';
  const saysWord = cw.saysWord ?? 'says:';
  return (
    <div className="play-scene play-contrast" id={labelId}>
      <ol className="play-contrast-pairs" aria-label="Two cases, side by side">
        {scene.pairs.map((p, k) => (
          <li key={k} className={`play-contrast-panel is-${p.truth ? 'true' : 'false'}`}>
            <p className="play-contrast-world">
              <span className="play-drill-tag">{worldTag}</span> {p.world.replace(/^Test:\s*/i, '')}
            </p>
            {p.things && p.things.length > 0 && (
              <ul className="play-things play-contrast-things" aria-label="The cards">
                {p.things.map((t) => (
                  <li key={t.id} className="play-things-slot">
                    <ThingCard thing={t} locked />
                  </li>
                ))}
              </ul>
            )}
            <p className="play-contrast-sign">
              <span className="play-contrast-who">{p.who} {saysWord}</span> <q>{p.says}</q>
            </p>
            <p className={`play-contrast-truth is-${p.truth ? 'true' : 'false'}`}>
              <PlayIcon name={p.truth ? 'check' : 'cross'} size={16} />
              {p.truth ? cw.truth ?? 'True' : cw.untruth ?? 'False'}
            </p>
            <p className="play-contrast-because">{p.because}</p>
            {p.then && <p className="play-contrast-then">{p.then}</p>}
          </li>
        ))}
      </ol>
      {scene.ask && (
        <p className="play-contrast-ask">
          <strong>{scene.ask.q}</strong> {scene.ask.a}
        </p>
      )}
    </div>
  );
}

/** The steps of a method, with the current one lit. `at` is the index of the step the learner is on. */
export function MethodSteps({ steps, at, label = 'The steps' }: { steps: readonly string[]; at: number; label?: string }) {
  return (
    <ol className="play-steps" aria-label={label}>
      {steps.map((s, i) => (
        <li key={i} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}>
          <span className="play-steps-n" aria-hidden="true">{i < at ? <PlayIcon name="check" size={12} /> : i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export interface ConfusedPanelProps {
  questions: readonly ConfusedQuestion[];
  /** The panel is closed (its button stays). */
  onClose(): void;
  /** The line once every question is answered. Default: a plain line (BoardWords.closing). */
  closing?: string;
  /** The button once every question is answered. Default "Back to the board"; an item passes "Back to the question". */
  backLabel?: string;
}

/**
 * "I'm confused": the questions one at a time. A right answer moves on; a wrong or "Not sure" one shows the
 * teaching for that distinction, and the learner reads it before going on. It never shows the board's answer.
 */
export function ConfusedPanel({ questions, onClose, closing, backLabel = 'Back to the board' }: ConfusedPanelProps) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  const q = questions[i];
  const done = !q;
  const right = picked !== null && !!q?.options[picked]?.right;
  const wrong = picked !== null && !right;
  const next = () => {
    setPicked(null);
    setI((k) => k + 1);
    requestAnimationFrame(() => headRef.current?.focus({ preventScroll: true }));
  };
  return (
    <section className="play-confused" aria-labelledby="confused-title">
      <h3 id="confused-title" className="play-subhead" ref={headRef} tabIndex={-1}>
        {done ? 'You have it' : `Let’s find the mix-up · ${i + 1} of ${questions.length}`}
      </h3>
      {done ? (
        <>
          <p className="play-body">{closing ?? SIGN_WORDS.closing}</p>
          <button type="button" className="play-btn play-btn--teal play-btn--block" onClick={onClose}>
            {backLabel}
          </button>
        </>
      ) : (
        <>
          <p className="play-body">{q.q}</p>
          <div className="play-confused-options" role="radiogroup" aria-label="Your answer">
            {q.options.map((o, k) => {
              const on = picked === k;
              return (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={picked !== null || undefined}
                  className={`play-kind play-confused-option${on ? ' is-on' : ''}${on && o.right ? ' is-right' : ''}${on && !o.right ? ' is-miss' : ''}`}
                  onClick={() => { if (picked === null) setPicked(k); }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {right && (
            <p className="play-confused-teach is-right" role="status">
              <PlayIcon name="check" size={16} /> Right. {q.teach}
            </p>
          )}
          {wrong && (
            <p className="play-confused-teach" role="status">
              {q.teach}
            </p>
          )}
          {picked !== null && (
            <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={next}>
              {i + 1 < questions.length ? 'Next question' : 'Got it'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
