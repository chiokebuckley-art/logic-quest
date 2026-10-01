/**
 * The explanation after a wrong answer. One layout for every kind of question, in a single column:
 *
 *   1. the title: the gap in the chosen answer (or "Let’s work through this.")
 *   2. the rule and the words it needs, defined in place
 *   3. what the statement or clue says, and the cases that cover every way it can go (as cards, not a table)
 *   4. the chosen answer, where it fails, and the case that shows it
 *   5. the right answer and why it works
 *   6. "Remember", then "Explain more simply" and the actions
 *
 * Everything essential is always open; only the simpler example waits for its button. The words come from
 * explanationFor(), the same model the read-aloud uses.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Color, TeachCase } from '../../engine/types';
import { explanationSpeech, type ExplanationModel } from '../explanation';
import { ReadAloudButton } from './ReadAloud';
import { PlayIcon, ThingCard } from './ThingCard';

const DOT: Record<Color, string> = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15' };

/** One worked case as a card: the label in words, a picture, each sentence's truth (icon and word), a note. */
export function CaseCard({ c, mark }: { c: TeachCase; mark?: boolean }) {
  return (
    <div className={`play-case${mark ? ' play-case--mark' : ''}`}>
      <p className="play-case-label">{c.label}</p>
      {c.groups && c.groups.length > 0 && (
        <div className="play-case-groups" aria-hidden="true">
          {c.groups.map((g, i) => (
            <div key={i} className="play-case-group">
              <span className="play-case-group-name">
                {g.label} <strong>{g.n}</strong>
              </span>
              <span className="play-dots">
                {Array.from({ length: g.n }, (_, k) => (
                  <span key={k} className="play-dot" style={g.color ? { background: DOT[g.color] } : undefined} />
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
      {c.things && c.things.length > 0 && (
        <div className="play-case-things" aria-hidden="true">
          {c.things.map((t) => (
            <ThingCard key={t.id} thing={t} />
          ))}
        </div>
      )}
      {c.truths && c.truths.length > 0 && (
        <ul className="play-truths">
          {c.truths.map((t, i) => (
            <li key={i} className={t.value ? 'is-true' : 'is-false'}>
              <PlayIcon name={t.value ? 'check' : 'cross'} size={16} />
              <span>
                {t.who}: <strong>{t.value ? 'true' : 'false'}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
      {c.note && <p className="play-case-note">{c.note}</p>}
    </div>
  );
}

/** A sentence in curly quotes with its period inside, or the words as they are. */
const quote = (s: string, on: boolean) => (on ? `“${s.replace(/[.]$/, '')}.”` : s);

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="play-explain-section">
      {title && <h4 className="play-explain-sub">{title}</h4>}
      {children}
    </div>
  );
}

export interface ExplanationPanelProps {
  model: ExplanationModel;
  readAloud: boolean;
  /** Show the simpler example from the start (after a second miss). */
  simplerOpen?: boolean;
  onSimpler?(): void;
  /** The actions under the explanation ("Try this question again", …). None on the check result. */
  actions?: ReactNode;
  /** Move focus to the title when the panel appears. Default true. */
  autoFocus?: boolean;
  /** 'learn' after a wrong answer in a lesson; 'review' on the check result (no "Not yet" framing). */
  tone?: 'learn' | 'review';
  /** Show the player's answer and the right answer in words. False where the host already shows them. Default true. */
  showAnswers?: boolean;
}

export function ExplanationPanel({ model: m, readAloud, simplerOpen = false, onSimpler, actions, autoFocus = true, tone = 'learn', showAnswers = true }: ExplanationPanelProps) {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const [simpler, setSimpler] = useState(simplerOpen);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const simplerRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: false });
  }, []);
  useEffect(() => {
    if (simpler && opened.current) simplerRef.current?.focus();
  }, [simpler]);

  const openSimpler = () => {
    opened.current = true;
    setSimpler(true);
    onSimpler?.();
  };

  return (
    <section className={`play-explain play-explain--${tone}`} aria-labelledby={`${id}-title`}>
      <div className="play-explain-head">
        <div className="play-explain-titles">
          {tone === 'learn' && <span className="play-explain-kicker">Not yet. Let’s look closer.</span>}
          <h3 className="play-explain-title" id={`${id}-title`} ref={titleRef} tabIndex={-1}>
            {m.title}
          </h3>
        </div>
        {readAloud && <ReadAloudButton label="Read the explanation aloud" text={() => explanationSpeech(m, simpler)} />}
      </div>

      {(m.rule || m.terms.length > 0) && (
        <Section>
          {m.rule && <p className="play-explain-rule">{m.rule}</p>}
          {m.terms.length > 0 && (
            <dl className="play-terms">
              {m.terms.map((t, i) => (
                <div key={i} className="play-term">
                  <dt>{t.word}</dt>
                  <dd>means {t.meaning}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>
      )}

      {(m.meaning || m.cases.length > 0) && (
        <Section title={m.cases.length ? m.casesTitle ?? 'Every case' : undefined}>
          {m.meaning && <p>{m.meaning}</p>}
          {m.cases.length > 0 && (
            <ul className="play-cases">
              {m.cases.map((c, i) => (
                <li key={i}>
                  <CaseCard c={c} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {(showAnswers || m.detail.length > 0 || m.example) && (
        <Section title={m.specific ? 'Why your answer does not work' : 'Your answer'}>
          {showAnswers && (
            <p>
              {m.saidLabel}: <strong>{quote(m.said, m.quoted)}</strong>
            </p>
          )}
          {m.detail.map((d, i) => (
            <p key={i}>{d}</p>
          ))}
          {m.example && <CaseCard c={m.example} mark />}
        </Section>
      )}

      <Section title={showAnswers ? 'The right answer' : 'Why the right answer works'}>
        {showAnswers && (
          <p className="play-explain-right">
            <PlayIcon name="check" size={18} />
            <strong>{quote(m.right, m.quoted)}</strong>
          </p>
        )}
        <p>{m.why}</p>
      </Section>

      {m.remember.length > 0 && (
        <div className="play-remember">
          <span className="play-remember-title">Remember</span>
          {m.remember.map((r, i) => (
            <p key={i}>{r}</p>
          ))}
        </div>
      )}

      {simpler && m.simpler.length > 0 && (
        <div className="play-simpler" ref={simplerRef} tabIndex={-1} aria-labelledby={`${id}-simpler`}>
          <h4 className="play-explain-sub" id={`${id}-simpler`}>
            A simpler way to see it
          </h4>
          {m.simpler.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      )}

      {(actions || (!simpler && m.simpler.length > 0)) && (
        <div className="play-actions play-actions--wrap">
          {actions}
          {!simpler && m.simpler.length > 0 && (
            <button type="button" className="play-btn play-btn--ghost play-btn--grow" onClick={openSimpler}>
              Explain more simply
            </button>
          )}
        </div>
      )}
    </section>
  );
}
