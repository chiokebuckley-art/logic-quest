/** Inline stroke icons (24x24, currentColor). Decorative unless a `label` is given. */
import type { ReactNode } from 'react';

export type IconName =
  | 'journey' | 'learn' | 'arcade' | 'progress'
  | 'flame' | 'settings' | 'lock' | 'check' | 'back' | 'chevron'
  | 'plus' | 'download' | 'upload' | 'trash' | 'key' | 'user' | 'refresh' | 'backspace'
  | 'shield' | 'grid' | 'lineup' | 'star' | 'bulb' | 'split' | 'truth' | 'clock';

const PATHS: Record<IconName, ReactNode> = {
  journey: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" /></>,
  learn: <><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" /><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" /></>,
  arcade: <><rect x="2" y="7" width="20" height="11" rx="4" /><path d="M7 11v3M5.5 12.5h3" /><circle cx="16" cy="11.5" r="1" /><circle cx="18" cy="14" r="1" /></>,
  progress: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1.5 1 2 2 2 3 1-2 1-5 1-7z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  check: <path d="M5 12l5 5L20 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 20h16" /></>,
  upload: <><path d="M12 16V5M7 10l5-5 5 5" /><path d="M4 20h16" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3M15 8l2 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-3.9L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.9 3.9L20 15" /><path d="M20 20v-5h-5" /></>,
  backspace: <><path d="M21 5H8l-6 7 6 7h13z" /><path d="M12 9l6 6M18 9l-6 6" /></>,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
  lineup: <><path d="M4 20V14M10 20V8M16 20V11M22 20H2" /><circle cx="4" cy="11" r="1.5" /><circle cx="10" cy="5" r="1.5" /><circle cx="16" cy="8" r="1.5" /></>,
  star: <path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7L2 9.3l7-.8z" />,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" /></>,
  split: <><circle cx="12" cy="5" r="2" /><path d="M12 7v4M12 11l-6 6M12 11l6 6" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
  truth: <><circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** When set, the icon is announced with this name. Otherwise it is hidden from screen readers. */
  label?: string;
  color?: string;
  className?: string;
}

export function Icon({ name, size = 24, strokeWidth = 2, label, color, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0 }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Icon for each stop, used on Arcade cards. */
export const STOP_ICONS: Record<string, IconName> = {
  s1: 'truth',
  s2: 'split',
  s3: 'lineup',
  s4: 'grid',
  s5: 'shield',
  s6: 'bulb',
  s7: 'truth',
  s8: 'grid',
  s9: 'bulb',
  s10: 'star',
  s11: 'shield',
  s12: 'progress',
};
