/**
 * Small shared pieces for the streamlined pages (Home, Journey, Stop, Library, Me, Search):
 * game-icons drawn with a CSS mask, stop artwork, page headers, list rows and kind tags.
 * Colour = kind: cyan Learn, lime Practice, violet Pattern Lab, orange Repair, gold next/passed, mint mastered.
 */
import type { ReactNode } from 'react';
import { DESTINATIONS } from '../pattern/bridges';

/** game-icons.net (CC BY 3.0) files in public/icons. */
export type GameIcon =
  | 'star' | 'map' | 'book' | 'dashboard' | 'compass' | 'brain' | 'medal' | 'home' | 'lab' | 'settings' | 'scroll'
  | 'gauge' | 'repair' | 'hourglass' | 'cloud-sync' | 'target' | 'lock' | 'trophy' | 'calendar' | 'lantern' | 'cog'
  | 'energy' | 'heart' | 'sword' | 'telescope' | 'backpack' | 'bridge' | 'level-up' | 'skill-tree' | 'gear' | 'reactor' | 'factory';

export const iconUrl = (name: GameIcon) => `${import.meta.env.BASE_URL}icons/${name}.svg`;

/** A single-colour game icon in the current text colour (or `color`). Decorative. */
export function GIcon({ name, size = 22, color }: { name: GameIcon; size?: number; color?: string }) {
  const url = `url("${iconUrl(name)}")`;
  return (
    <span
      className="gicon"
      aria-hidden="true"
      style={{ width: size, height: size, background: color ?? 'currentColor', WebkitMaskImage: url, maskImage: url }}
    />
  );
}

/** Artwork and place name for each stop (the Pattern Lab destinations, reused for stops without their own). */
const STOP_PLACE: Record<string, string> = {
  s1: 'signal-camp', s2: 'switch-caverns', s3: 'ladder-cliffs', s4: 'fog-marsh', s5: 'trickster-market', s6: 'of-rules',
  s7: 'twin-isles', s8: 'switch-caverns', s9: 'signal-camp', s10: 'of-rules', s11: 'trickster-market', s12: 'chance-dock',
};

export function stopPlace(stopId: string): { art: string; name: string } {
  const key = STOP_PLACE[stopId] ?? 'signal-camp';
  const d = DESTINATIONS.find((x) => x.art === key);
  return { art: `${import.meta.env.BASE_URL}artwork/pl-bridge-${key}.webp`, name: d?.name ?? '' };
}

export function StopArt({ stopId, className }: { stopId: string; className?: string }) {
  return <img className={className ?? 'sl-art'} src={stopPlace(stopId).art} alt="" loading="lazy" />;
}

export type Kind = 'learn' | 'check' | 'drill' | 'lab' | 'fix';
const KIND_WORD: Record<Kind, string> = { learn: 'Learn', check: 'Check', drill: 'Drill', lab: 'Lab', fix: 'Fix' };

export function KindTag({ kind }: { kind: Kind }) {
  return <span className={`sl-tag k-${kind}`}>{KIND_WORD[kind]}</span>;
}

export function Eyebrow({ children, tone = 'cyan', id }: { children: ReactNode; tone?: string; id?: string }) {
  return <div id={id} className={`sl-eyebrow t-${tone}`}>{children}</div>;
}

/** Page title with an optional back link above it ("‹ Me"). */
export function PageHead({ title, sub, back, onBack, right }: { title: string; sub?: ReactNode; back?: string; onBack?(): void; right?: ReactNode }) {
  return (
    <div className="sl-head">
      {back && onBack && (
        <button type="button" className="sl-back" onClick={onBack}>‹ {back}</button>
      )}
      <div className="sl-head-row">
        <h2 className="sl-title">{title}</h2>
        {right}
      </div>
      {sub && <p className="sl-sub">{sub}</p>}
    </div>
  );
}

/** A tappable 48–52px list row. `tone` colours the border (current = gold, notyet = orange, ready = orange). */
export function Row({ lead, title, sub, meta, metaTone, tone, onClick, disabled, label, current }: {
  lead?: ReactNode; title: ReactNode; sub?: ReactNode; meta?: ReactNode; metaTone?: string; tone?: string;
  onClick?(): void; disabled?: boolean; label?: string; current?: boolean;
}) {
  const body = (
    <>
      {lead}
      <span className="sl-row-main">
        <span className="sl-row-title">{title}</span>
        {sub && <span className="sl-row-sub">{sub}</span>}
      </span>
      {meta !== undefined && <span className={`sl-row-meta${metaTone ? ` t-${metaTone}` : ''}`}>{meta}</span>}
    </>
  );
  const cls = `sl-row${tone ? ` r-${tone}` : ''}`;
  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={label} aria-current={current ? 'step' : undefined}>
      {body}
    </button>
  );
}

/** The "Find anything" field on every tab. It opens the search page. */
export function SearchButton({ onOpen, placeholder = 'Find anything — an idea, a stop, a puzzle' }: { onOpen(): void; placeholder?: string }) {
  return (
    <button type="button" className="sl-search" onClick={onOpen}>
      <GIcon name="compass" size={16} />
      <span>{placeholder}</span>
    </button>
  );
}
