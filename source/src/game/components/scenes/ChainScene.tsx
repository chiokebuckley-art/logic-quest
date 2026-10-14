/**
 * Ring 1 (First Lights): a chain made by repeating a block. Owned by the Ring 1 builder.
 *
 * Every picture is a still frame. A stepped chain (scene.steps with scene.frames) starts from the bare chain and shows
 * the frame of the last revealed step: a dashed box trying a block, the gold unit box with its repeats tinted, a teal
 * bar under each piece checked so far, a "Breaks" flag where a block or the stated rule fails. Labels stay short and
 * the row wraps, so it draws at 320 px wide.
 *
 * Kid mode (Grades 1 to 3, docs/KID-JOURNEY.md) draws the chain as a picture only: no "Stated" line (screen readers
 * still hear it; the kid prompt says what it needs), no captions and no position numbers, no notes; a sound, a bell, a
 * move, a class or a kid of a rota is its pictogram (tokenArt), and the flags are icons named for screen readers.
 * Letters stay letters: they are the pieces themselves.
 */
import type { ChainFrame, ChainScene } from '../../../engine/scenes/chain';
import type { ChainToken } from '../../../engine/scenes/common';
import { tokenArt } from '../../../engine/puzzles/observatory/chains';
import { useKidMode } from '../../kidMode';
import { Pictogram } from '../Pictogram';
import { PlayIcon, ThingCard } from '../ThingCard';

/** One token: a shape card, a letter tile, or a sound, move or name tile (its face is its caption; a bell shows "high" over "high bell"). */
export function ChainTokenView({ token, small = false, kid = false }: { token: ChainToken; small?: boolean; kid?: boolean }) {
  if (token.shape && token.color) {
    return (
      <span className={`play-ob-token play-ob-token--shape${small ? ' is-small' : ''}`} role="img" aria-label={token.label}>
        <span aria-hidden="true">
          <ThingCard thing={{ id: token.label, shape: token.shape, color: token.color, size: 'small' }} locked />
        </span>
        {!kid && <span className="play-ob-caption" aria-hidden="true">{token.label}</span>}
      </span>
    );
  }
  // Kid mode: a sound, a bell, a move, a class or a name is drawn as its picture (named by its caption for screen readers).
  const art = kid ? tokenArt(token) : undefined;
  if (art) {
    return (
      <span className={`play-ob-token play-ob-token--picto${small ? ' is-small' : ''}`}>
        <Pictogram name={art} label={token.label} size={small ? 34 : 44} />
      </span>
    );
  }
  const face = token.letter ?? token.label;
  // A word (a sound, a move, a name) gets a smaller face so it fits the tile; a letter stays big.
  const word = face.length > 2;
  return (
    <span className={`play-ob-token play-ob-token--${token.sound ? 'sound' : 'letter'}${small ? ' is-small' : ''}`} role="img" aria-label={token.label}>
      <span className={`play-ob-token-face${word ? ' play-ob-word' : ''}`} aria-hidden="true">{face}</span>
      {face !== token.label && !kid && <span className="play-ob-caption" aria-hidden="true">{token.label}</span>}
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
  /** Kid mode: the chain as a picture only (see the file note). */
  const kid = !!useKidMode();
  const f = frameOf(scene, shown);
  const tokens = f.tokens ?? scene.tokens;
  const numbered = (scene.numbered ?? true) && !kid;
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
      {kid ? <p className="play-sr">{scene.stated}</p> : <p className="play-ob-stated"><span className="play-drill-tag">Stated</span> {scene.stated}</p>}
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
              {blank ? <span className="play-ob-blank" role="img" aria-label={`position ${i + 1}, blank`}>?</span> : <ChainTokenView token={t} small={long} kid={kid} />}
              {numbered && <span className="play-ob-pos" aria-hidden="true">{i + 1}</span>}
              {miss === i && (kid ? <span className="play-ob-flag play-ob-flag--icon" role="img" aria-label="Breaks"><PlayIcon name="cross" size={12} /></span> : <span className="play-ob-flag">Breaks</span>)}
              {f.broken === i && miss !== i && (kid ? <span className="play-ob-flag play-ob-flag--icon" role="img" aria-label="Look again"><PlayIcon name="help" size={12} /></span> : <span className="play-ob-flag">Look again</span>)}
            </li>
          );
        })}
      </ol>
      {f.tryUnit && !kid && (
        <p className={`play-ob-note ${f.tryUnit.ok ? 'is-ok' : 'is-off'}`}>
          Block of {f.tryUnit.len}: {f.tryUnit.ok ? 'it fits every piece.' : miss !== undefined && miss >= 0 ? `it breaks at position ${miss + 1}.` : 'it does not fit.'}
        </p>
      )}
      {f.unit && !f.tryUnit && !kid && (
        <p className="play-ob-note is-ok">
          {f.unit.start === 0 ? 'The unit' : `Block ${Math.floor(f.unit.start / f.unit.len) + 1}`}: {tokens.slice(f.unit.start, f.unit.start + f.unit.len).map((t) => t.label).join(', ')}.
        </p>
      )}
      {scene.tray && scene.tray.length > 0 && (
        <div className="play-ob-tray" aria-label="Spare pieces">
          {scene.tray.map((t, k) => <ChainTokenView key={k} token={t} small kid={kid} />)}
        </div>
      )}
    </div>
  );
}
