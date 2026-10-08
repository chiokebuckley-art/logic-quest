/**
 * The in-app number pad (Pattern Observatory): 0–9, backspace and OK, keys at least 44 px, so a tablet's keyboard
 * never opens for a numeric answer. A hardware keyboard still types (digits, Backspace, Enter) while the pad is on
 * screen and the focus is not in a text field. The typed number shows above the keys and is announced.
 */
import { useEffect, useRef } from 'react';
import { PlayIcon } from './ThingCard';

export interface NumberPadProps {
  value: string;
  onChange(next: string): void;
  /** Enter / OK: the host checks the answer. */
  onSubmit(): void;
  /** Max digits (default 3). */
  digits?: number;
  locked?: boolean;
  /** A unit word after the number: "tiles". */
  unit?: string;
  /** Id of the element that labels the pad (the question). */
  labelledBy?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;

export function NumberPad({ value, onChange, onSubmit, digits = 3, locked = false, unit, labelledBy }: NumberPadProps) {
  const latest = useRef({ value, onChange, onSubmit, digits, locked });
  latest.current = { value, onChange, onSubmit, digits, locked };
  const press = (d: string) => {
    const { value, onChange, digits, locked } = latest.current;
    if (locked) return;
    if (value.length >= digits) return;
    // No leading zeros: "0" alone is fine, "07" becomes "7".
    onChange(value === '0' ? d : value + d);
  };
  const back = () => {
    const { value, onChange, locked } = latest.current;
    if (!locked) onChange(value.slice(0, -1));
  };
  const ok = () => {
    const { value, onSubmit, locked } = latest.current;
    if (!locked && value.length) onSubmit();
  };
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); back(); }
      else if (e.key === 'Enter' && latest.current.value.length) { e.preventDefault(); ok(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="play-pad" role="group" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Number pad'}>
      <div className="play-pad-show" role="status" aria-live="polite" aria-atomic="true">
        <span className="play-pad-value">{value || <span className="play-pad-empty" aria-hidden="true">–</span>}</span>
        {unit && value && <span className="play-pad-unit">{unit}</span>}
        <span className="play-sr">{value ? `Typed: ${value}${unit ? ` ${unit}` : ''}` : 'Nothing typed yet'}</span>
      </div>
      <div className="play-pad-keys">
        {KEYS.map((k) => {
          if (k === 'del') {
            return (
              <button key={k} type="button" className="play-pad-key play-pad-key--del" aria-label="Delete the last digit" disabled={locked || !value} onClick={back}>
                <PlayIcon name="back" size={20} />
              </button>
            );
          }
          if (k === 'ok') {
            return (
              <button key={k} type="button" className="play-pad-key play-pad-key--ok" aria-label="OK, check this number" disabled={locked || !value} onClick={ok}>
                OK
              </button>
            );
          }
          return (
            <button key={k} type="button" className="play-pad-key" aria-disabled={locked || undefined} disabled={locked || value.length >= digits} onClick={() => press(k)}>
              {k}
            </button>
          );
        })}
      </div>
      <p className="play-help play-pad-help">Tap the keys, or type on a keyboard. Then tap OK or Check.</p>
    </div>
  );
}
