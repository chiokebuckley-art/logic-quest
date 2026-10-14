/**
 * The Kid Journey's shared pictures, drawn in code: the band's star sky (one star per round, laid out world by world,
 * clean, mended, open or locked), Pip the companion with sticker slots, the seven dots of "days this week", the
 * grade badge and a world's building. Every picture has words for screen readers; a tappable star is a button.
 */
import type { KeyboardEvent } from 'react';
import type { SaveData } from '../../engine/save/save';
import type { GradeId } from '../../engine/types';
import { gradeById, gradeNumber, roundOpen, type WorldDef } from '../../content/grades';
import { glowOf, type Sticker, type WeekDay } from '../kid';
import { lessonById } from '../observatory';
import { PICTO_WORDS, Pictogram } from './Pictogram';

export type StarState = 'clean' | 'mended' | 'open' | 'locked';

export interface SkyStar {
  lessonId: string;
  world: WorldDef;
  /** 1-based place in its world. */
  k: number;
  x: number;
  y: number;
  state: StarState;
  glow: 0 | 1 | 2;
}

const W = 200;

/** Star positions for a band: one column per world, rounds climbing left and right in the order of play. */
export function skyLayout(save: SaveData, band: GradeId, height = 120): SkyStar[] {
  const worlds = gradeById(band).worlds;
  const most = Math.max(...worlds.map((w) => w.rounds.length));
  const top = 16;
  const bottom = height - 22;
  const step = most > 1 ? (bottom - top) / (most - 1) : 0;
  const swing = worlds.length > 3 ? 9 : 14;
  return worlds.flatMap((world, wi) => {
    const cx = ((wi + 0.5) * W) / worlds.length;
    return world.rounds.map((lessonId, r) => {
      const star = save.kid.stars[lessonId];
      const state: StarState = star ?? (roundOpen(save, lessonId) ? 'open' : 'locked');
      return { lessonId, world, k: r + 1, x: cx + (r % 2 ? swing : -swing), y: bottom - r * step, state, glow: glowOf(save, lessonId) };
    });
  });
}

/** A five-point star around (x, y). */
function starPath(x: number, y: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

const STATE_WORDS: Record<StarState, string> = { clean: 'a bright star', mended: 'a star', open: 'open to play', locked: 'locked' };

/** The band's star sky. `small` draws it short for Home; `onPick` makes open and starred rounds tappable. */
export function StarSky({ save, band, small = false, onPick }: { save: SaveData; band: GradeId; small?: boolean; onPick?(lessonId: string): void }) {
  const g = gradeById(band);
  const height = small ? 90 : 120;
  const stars = skyLayout(save, band, height);
  const got = stars.filter((s) => s.state === 'clean' || s.state === 'mended').length;
  return (
    <svg className={`kid-sky${small ? ' is-small' : ''}`} viewBox={`0 0 ${W} ${height}`} role="group" aria-label={`Star sky, ${g.label}: ${got} of ${stars.length} stars`}>
      {[[12, 10], [44, 6], [96, 8], [150, 12], [188, 6], [24, 50], [176, 48]].map(([x, y], i) => (
        <circle key={i} className="kid-sky-dot" cx={x} cy={y} r={i % 2 ? 0.7 : 1} />
      ))}
      {g.worlds.map((world) => {
        const mine = stars.filter((s) => s.world.id === world.id);
        const first = mine[0];
        return (
          <g key={world.id} role="group" aria-label={world.title}>
            <path className="kid-sky-line" d={mine.map((s, i) => `${i ? 'L' : 'M'}${s.x.toFixed(1)},${s.y.toFixed(1)}`).join('')} />
            {first && <text className="kid-sky-label" x={((g.worlds.indexOf(world) + 0.5) * W) / g.worlds.length} y={height - 6} textAnchor="middle" aria-hidden="true">{world.title}</text>}
            {mine.map((s) => {
              const title = lessonById(s.lessonId)?.title ?? s.lessonId;
              const can = !!onPick && s.state !== 'locked';
              const pick = () => onPick?.(s.lessonId);
              const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
              return (
                <g
                  key={s.lessonId}
                  className={`kid-star is-${s.state}${s.glow ? ` glow-${s.glow}` : ''}`}
                  role={can ? 'button' : 'img'}
                  tabIndex={can ? 0 : undefined}
                  aria-label={`Round ${s.k}, ${title}: ${STATE_WORDS[s.state]}`}
                  onClick={can ? pick : undefined}
                  onKeyDown={can ? onKey : undefined}
                >
                  <path d={starPath(s.x, s.y, s.state === 'locked' ? 4 : 7)} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Pip's body color and the color of its face and belt: two colors, so it reads at a glance. */
const PIP_BODY = '#2dd4bf';
const PIP_INK = '#0a0d2a';

/**
 * Pip, the friendly companion: a round body with two eyes, a smile, little ears and a belt of sticker slots. A slot
 * fills with each sticker earned. `cheer` raises its arms.
 */
export function Pip({ stickers = [], slots = 6, cheer = false, size = 120 }: { stickers?: readonly Sticker[]; slots?: number; cheer?: boolean; size?: number }) {
  const n = Math.max(slots, stickers.length);
  const label = stickers.length ? `Pip, with ${stickers.length} ${stickers.length === 1 ? 'sticker' : 'stickers'}: ${stickers.map((s) => s.name).join(', ')}` : 'Pip, with empty sticker spots';
  return (
    <svg className={`kid-pip${cheer ? ' is-cheer' : ''}`} viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label}>
      <path d="M38 22 L30 6 L48 16 Z M82 22 L90 6 L72 16 Z" fill={PIP_BODY} />
      {cheer ? (
        <path d="M22 62 L6 34 M98 62 L114 34" stroke={PIP_BODY} strokeWidth="9" strokeLinecap="round" />
      ) : (
        <path d="M22 66 L10 82 M98 66 L110 82" stroke={PIP_BODY} strokeWidth="9" strokeLinecap="round" />
      )}
      <ellipse cx="60" cy="62" rx="40" ry="44" fill={PIP_BODY} />
      <circle cx="46" cy="48" r="6" fill={PIP_INK} />
      <circle cx="74" cy="48" r="6" fill={PIP_INK} />
      <circle cx="48" cy="46" r="2" fill={PIP_BODY} />
      <circle cx="76" cy="46" r="2" fill={PIP_BODY} />
      <path d={cheer ? 'M46 62 Q60 78 74 62 Z' : 'M48 62 Q60 72 72 62'} fill={cheer ? PIP_INK : 'none'} stroke={PIP_INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="22" y="80" width="76" height="16" rx="8" fill={PIP_INK} />
      {Array.from({ length: n }, (_, i) => {
        const cx = 22 + (76 * (i + 0.5)) / n;
        const s = stickers[i];
        return s ? (
          <g key={i}>
            <circle cx={cx} cy="88" r="5.5" fill={s.color} />
            <path d={starPath(cx, 88, 3)} fill={PIP_INK} />
          </g>
        ) : (
          <circle key={i} cx={cx} cy="88" r="5" fill="none" stroke={PIP_BODY} strokeWidth="1.2" strokeDasharray="2 2" />
        );
      })}
    </svg>
  );
}

/** Seven dots, Monday to Sunday: a filled dot for each day played this week. Never a count that drops to zero in red. */
export function WeekDots({ days, count, label = 'Days this week' }: { days: readonly WeekDay[]; count: number; label?: string }) {
  return (
    <div className="kid-week">
      <span className="kid-week-label">{label}</span>
      <span className="kid-week-dots" role="img" aria-label={`${count} of 7 days played this week`}>
        {days.map((d) => (
          <span key={d.day} className={`kid-week-dot${d.played ? ' is-on' : ''}${d.ahead ? ' is-ahead' : ''}`} aria-hidden="true">
            {d.letter}
          </span>
        ))}
      </span>
    </div>
  );
}

/** The grade badge: a medal with the grade's number (or a star for high school). Dim until earned. */
export function GradeBadge({ band, earned = true, size = 72 }: { band: GradeId; earned?: boolean; size?: number }) {
  const n = gradeNumber(band);
  const g = gradeById(band);
  return (
    <svg className={`kid-badge${earned ? '' : ' is-dim'}`} viewBox="0 0 80 96" width={size} height={(size * 96) / 80} role="img" aria-label={`${g.label} badge${earned ? '' : ', not earned yet'}`}>
      <path d="M24 4 L40 34 L56 4 Z" fill="#9d6bff" />
      <circle cx="40" cy="58" r="32" fill="#ffc93c" />
      <circle cx="40" cy="58" r="25" fill="none" stroke="#0a0d2a" strokeWidth="3" />
      {n !== null ? (
        <text x="40" y="70" textAnchor="middle" fontSize="32" fontWeight="700" fill="#0a0d2a" aria-hidden="true">{n}</text>
      ) : (
        <path d={starPath(40, 58, 16)} fill="#0a0d2a" />
      )}
    </svg>
  );
}

/**
 * A world's building, earned by passing its check: the world's own pictogram (lighthouse, bridge, tower, mill, tent,
 * castle, …; every building name has its own drawing in Pictogram). Dim until built.
 */
export function Building({ world, built, size = 36 }: { world: WorldDef; built: boolean; size?: number }) {
  return (
    <Pictogram
      name={world.building}
      size={size}
      className={`kid-building${built ? '' : ' is-dim'}`}
      label={`${world.title} ${PICTO_WORDS[world.building]}${built ? ', built' : ', not built yet'}`}
    />
  );
}
