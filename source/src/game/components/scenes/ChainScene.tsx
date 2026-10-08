/**
 * Ring 1 (First Lights): a chain made by repeating a block. Owned by the Ring 1 builder.
 *
 * Every picture is a still frame. A stepped chain (scene.steps with scene.frames) starts from the bare chain and shows
 * the frame of the last revealed step: a dashed box trying a block, the gold unit box with its repeats tinted, a teal
 * bar under each piece checked so far, a "Breaks" flag where a block or the stated rule fails. Labels stay short and
 * the row wraps, so it draws at 320 px wide.
 */
import type { ChainFrame, ChainScene } from '../../../engine/scenes/chain';
import type { ChainToken } from '../../../engine/scenes/common';
import { ThingCard } from '../ThingCard';

/** One token: a shape card, a letter tile, or a sound, move or name tile (its face is its caption; a bell shows "high" over "high bell"). */
export function ChainTokenView({ token, small = false }: { token: ChainToken; small?: boolean }) {
  if (token.shape && token.color) {
    return (
      <span className={`play-ob-token play-ob-token--shape${small ? ' is-small' : ''}`} role="img" aria-label={token.label}>
        <span aria-hidden="true">
          <ThingCard thing={{ id: token.label, shape: token.shape, color: token.color, size: 'small' }} locked />
        </span>
        <span className="play-ob-caption" aria-hidden="true">{token.label}</span>
      </span>
    );
  }
  const face = token.letter ?? token.label;
  // A word (a sound, a move, a name) gets a smaller face so it fits the tile; a letter stays big.
  const word = face.length > 2;
  return (
    <span className={`play-ob-token play-ob-token--${token.sound ? 'sound' : 'letter'}${small ? ' is-small' : ''}`} role="img" aria-label={token.label}>
      <span className={`play-ob-token-face${word ? ' play-ob-word' : ''}`} aria-hidden="true">{face}</span>
      {face !== token.label && <span className="play-ob-caption" aria-hidden="true">{token.label}</span>}
    </span>
  );
}

/** The first index where repeating the first `len` pieces fails, by caption, or -1. */
function missOf(tokens: readonly ChainToken[], len: number): number {
  for (let i = len; i < tokens.length; i++) if (tokens[i].label !== tokens[i - len].label) return i;
  return -1;
}

/** What shows now: a stepped scene's frame for the last revealed step (the bare chain before any), else the scene. */
function frameOf(scene: ChainScene, shown: number): ChainFrame {
  const steps = scene.steps?.length ?? 0;
  if (!steps) return scene;
  if (scene.frames) return shown > 0 ? scene.frames[shown - 1] ?? {} : {};
  // A stepped scene without frames: the try box shows throughout, the unit and the break once every step is showing.
  const all = shown >= steps;
  return { tryUnit: scene.tryUnit, unit: all ? scene.unit : undefined, broken: all ? scene.broken : undefined, miss: all ? scene.miss : undefined, checked: all ? scene.checked : undefined };
}

export function ChainView({ scene, shown }: { scene: ChainScene; shown: number }) {
  const f = frameOf(scene, shown);
  const tokens = f.tokens ?? scene.tokens;
  const numbered = scene.numbered ?? true;
  const box = f.unit ?? (f.tryUnit && f.tryUnit.ok ? f.tryUnit : undefined);
  const miss = f.miss ?? (f.tryUnit && !f.tryUnit.ok ? missOf(tokens, f.tryUnit.len) : undefined);
  const inBox = (i: number, b?: { start: number; len: number }) => !!b && i >= b.start && i < b.start + b.len;
  /** Which repeat of the box a piece is in, after the box itself (0 = not a later copy). Only a box on the first block
   *  has copies: a box walking block by block (Repair Bench) marks one block at a time. In a frame that is still
   *  checking (`checked`), only the pieces checked so far are tinted, so an unchecked break never looks like a copy. */
  const copyOf = (i: number) =>
    box && box.start === 0 && i >= box.len && (miss === undefined || miss < 0 || i < miss) && (f.checked === undefined || i < f.checked) ? Math.floor(i / box.len) : 0;
  const long = tokens.length > 8;
  return (
    <div className="play-ob-chain">
      <p className="play-ob-stated"><span className="play-drill-tag">Stated</span> {scene.stated}</p>
      <ol className={`play-ob-chain-row${long ? ' is-long' : ''}`} aria-label="The chain">
        {tokens.map((t, i) => {
          const blank = scene.blanks?.includes(i);
          const copy = copyOf(i);
          const cls = [
            'play-ob-slot',
            blank ? 'is-blank' : '',
            inBox(i, f.unit) ? 'in-unit' : '',
            inBox(i, f.tryUnit) ? (f.tryUnit!.ok ? 'in-try is-ok' : 'in-try is-off') : '',
            copy ? `in-copy ${copy % 2 ? 'copy-odd' : 'copy-even'}` : '',
            f.checked !== undefined && i < f.checked ? 'is-checked' : '',
            miss === i ? 'is-miss' : '',
            f.broken === i ? 'is-broken' : '',
          ].filter(Boolean).join(' ');
          return (
            <li key={i} className={cls}>
              {blank ? <span className="play-ob-blank" role="img" aria-label={`position ${i + 1}, blank`}>?</span> : <ChainTokenView token={t} small={long} />}
              {numbered && <span className="play-ob-pos" aria-hidden="true">{i + 1}</span>}
              {miss === i && <span className="play-ob-flag">Breaks</span>}
              {f.broken === i && miss !== i && <span className="play-ob-flag">Look again</span>}
            </li>
          );
        })}
      </ol>
      {f.tryUnit && (
        <p className={`play-ob-note ${f.tryUnit.ok ? 'is-ok' : 'is-off'}`}>
          Block of {f.tryUnit.len}: {f.tryUnit.ok ? 'it fits every piece.' : miss !== undefined && miss >= 0 ? `it breaks at position ${miss + 1}.` : 'it does not fit.'}
        </p>
      )}
      {f.unit && !f.tryUnit && (
        <p className="play-ob-note is-ok">
          {f.unit.start === 0 ? 'The unit' : `Block ${Math.floor(f.unit.start / f.unit.len) + 1}`}: {tokens.slice(f.unit.start, f.unit.start + f.unit.len).map((t) => t.label).join(', ')}.
        </p>
      )}
      {scene.tray && scene.tray.length > 0 && (
        <div className="play-ob-tray" aria-label="Spare pieces">
          {scene.tray.map((t, k) => <ChainTokenView key={k} token={t} small />)}
        </div>
      )}
    </div>
  );
}
