/**
 * A shape card: a red, blue or yellow circle, square or triangle, big or small, or a face-down card.
 * Plain cards are pictures with a name ("big red circle"). With `onToggle` the card is a real
 * toggle button (aria-pressed) for tap-all questions. Also holds the small icon set the play
 * components share (including the knight's shield and the knave's mask).
 */
import type { ReactElement } from 'react';
import type { Color, Thing } from '../../engine/types';
import { thingName } from '../speech';

const FILL: Record<Color, string> = { red: '#ef4444', blue: '#3b82f6', yellow: '#facc15' };

export type IconName = 'back' | 'speaker' | 'stop' | 'check' | 'cross' | 'lock' | 'clock' | 'bulb' | 'shield' | 'mask';

/** Small stroke icons, always hidden from screen readers (the button or text around them names them). */
export function PlayIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: name === 'check' || name === 'cross' ? 3 : 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    className: 'play-icon',
  };
  switch (name) {
    case 'back':
      return <svg {...common}><path d="M15 5l-7 7 7 7" /></svg>;
    case 'speaker':
      return <svg {...common}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></svg>;
    case 'stop':
      return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
    case 'check':
      return <svg {...common}><path d="M5 12l5 5L20 7" /></svg>;
    case 'cross':
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'bulb':
      return <svg {...common}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></svg>;
    case 'shield': // a knight
      return <svg {...common}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>;
    case 'mask': // a knave
      return <svg {...common}><path d="M3 8c3-2 15-2 18 0 0 6-3 10-9 10S3 14 3 8z" /><path d="M7.5 11h3M13.5 11h3" /></svg>;
  }
}

/** The shape itself, in a 60 x 80 card. Big shapes are twice as wide as small ones. */
function Shape({ thing }: { thing: Thing }) {
  const fill = FILL[thing.color];
  const big = thing.size === 'big';
  const stroke = { stroke: 'rgba(11, 16, 32, 0.55)', strokeWidth: 1.5 };
  switch (thing.shape) {
    case 'circle':
      return <circle cx="30" cy="42" r={big ? 23 : 11.5} fill={fill} {...stroke} />;
    case 'square':
      return big
        ? <rect x="9" y="21" width="42" height="42" rx="3" fill={fill} {...stroke} />
        : <rect x="19.5" y="31.5" width="21" height="21" rx="2" fill={fill} {...stroke} />;
    case 'triangle':
      return big
        ? <polygon points="30,17 55,62 5,62" fill={fill} {...stroke} strokeLinejoin="round" />
        : <polygon points="30,32 42.5,54.5 17.5,54.5" fill={fill} {...stroke} strokeLinejoin="round" />;
  }
}

/** A patterned card back with a "?" in the middle. No ids, so any number can share a page. */
function CardBack() {
  const dots: ReactElement[] = [];
  for (let y = 12; y <= 70; y += 9) {
    for (let x = 10; x <= 50; x += 10) {
      const off = ((y - 12) / 9) % 2 === 0 ? 0 : 5;
      if (x + off > 52) continue;
      dots.push(<rect key={`${x}-${y}`} x={x + off - 2} y={y - 2} width="4" height="4" transform={`rotate(45 ${x + off} ${y})`} />);
    }
  }
  return (
    <g>
      <rect x="4" y="4" width="52" height="72" rx="5" fill="#1d2640" stroke="rgba(201, 162, 39, 0.55)" strokeWidth="1.5" />
      <g fill="rgba(201, 162, 39, 0.28)">{dots}</g>
      <circle cx="30" cy="40" r="13" fill="#0b1020" stroke="#c9a227" strokeWidth="1.5" />
      <text x="30" y="46.5" textAnchor="middle" fontFamily="'Exo 2', 'Segoe UI', system-ui, sans-serif" fontWeight="700" fontSize="19" fill="#f5d77a">?</text>
    </g>
  );
}

/** Corner badge for "guess my rule": teal check = yes (let through), amber cross = no (stopped). */
function MarkBadge({ mark }: { mark: 'yes' | 'no' }) {
  return mark === 'yes' ? (
    <g>
      <circle cx="49" cy="11" r="9" fill="#2dd4bf" stroke="#0b1020" strokeWidth="1.5" />
      <path d="M44.5 11.2l3 3 5.5-6" fill="none" stroke="#0b1020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ) : (
    <g>
      <circle cx="49" cy="11" r="9" fill="#ffb347" stroke="#0b1020" strokeWidth="1.5" />
      <path d="M45.5 7.5l7 7M52.5 7.5l-7 7" fill="none" stroke="#0b1020" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function CardFace({ thing }: { thing: Thing }) {
  return (
    <svg className="play-thing-svg" viewBox="0 0 60 80" aria-hidden="true" focusable="false">
      {thing.hidden ? <CardBack /> : <Shape thing={thing} />}
      {thing.mark && <MarkBadge mark={thing.mark} />}
    </svg>
  );
}

export interface ThingCardProps {
  thing: Thing;
  /** Makes the card a toggle button (tap-all questions). */
  onToggle?: () => void;
  /** Toggle state: the player chose this card. */
  pressed?: boolean;
  /** Toggle cannot change right now (feedback is showing). Stays focusable. */
  locked?: boolean;
  /** Teal ring: this card fits (shown when the answer is revealed). */
  fits?: boolean;
}

export function ThingCard({ thing, onToggle, pressed = false, locked = false, fits = false }: ThingCardProps) {
  const name = thingName(thing);
  const cls = ['play-thing', thing.hidden ? 'play-thing--back' : '', fits ? 'play-thing--fits' : ''].filter(Boolean).join(' ');
  if (!onToggle) {
    return (
      <div className={cls} role="img" aria-label={name}>
        <CardFace thing={thing} />
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`${cls} play-thing--pick${pressed ? ' is-pressed' : ''}`}
      aria-pressed={pressed}
      aria-disabled={locked || undefined}
      aria-label={fits ? `${name}, fits` : name}
      onClick={() => {
        if (!locked) onToggle();
      }}
    >
      <CardFace thing={thing} />
      {pressed && (
        <span className="play-thing-tick" aria-hidden="true">
          <PlayIcon name="check" size={14} />
        </span>
      )}
    </button>
  );
}

