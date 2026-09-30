/**
 * The body of a multi item: text cards in two columns, each a toggle button (aria-pressed). Any set may be
 * right, including none, so Check is always on. Short faces (E, K, 4, 7) are drawn big like playing cards.
 */
import type { MultiItem } from '../../engine/types';

/** Rule-checker questions ("Which cards must you turn over?") label a chosen card "Turn over"; others "Chosen". */
export function chosenNote(item: MultiItem): string {
  return /\bturn(?:ed)?\b[^.?!]*\bover\b/i.test(item.prompt) ? 'Turn over' : 'Chosen';
}

export interface MultiViewProps {
  item: MultiItem;
  chosen: readonly string[];
  /** Feedback is showing (learn) or the answer is in (check). Cards stay focusable. */
  locked: boolean;
  /** Learn mode, right or shown: ring the cards in the answer. */
  revealed: boolean;
  onToggle(id: string): void;
}

export function MultiView({ item, chosen, locked, revealed, onToggle }: MultiViewProps) {
  const big = item.choices.every((c) => c.label.trim().length <= 3);
  const note = chosenNote(item);
  return (
    <div className="play-stack-sm">
      <p className="play-help">Tap one to choose it. Tap it again to undo.</p>
      <ul className={`play-tcards${big ? ' play-tcards--big' : ''}`} aria-label="Cards to choose from">
        {item.choices.map((c) => {
          const on = chosen.includes(c.id);
          const fits = revealed && item.answer.includes(c.id);
          const cls = ['play-tcard', on ? 'is-pressed' : '', fits ? 'play-tcard--fits' : ''].filter(Boolean).join(' ');
          return (
            <li key={c.id}>
              <button
                type="button"
                className={cls}
                aria-pressed={on}
                aria-disabled={locked || undefined}
                onClick={() => { if (!locked) onToggle(c.id); }}
              >
                <span className="play-tcard-face">{c.label}</span>
                <span className="play-tcard-note" aria-hidden="true">{on ? note : locked ? '' : 'Tap to choose'}</span>
                {fits && (
                  // A word, not a ✓: on "Which boxes get a ✗?" a ✓ badge would read as "this box gets a ✓".
                  <span className="play-tcard-fits">
                    <span aria-hidden="true">Answer</span>
                    <span className="play-sr"> (part of the right answer)</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {revealed && item.answer.length === 0 && <p className="play-help">No card is needed here, so the right move is to choose none.</p>}
    </div>
  );
}

