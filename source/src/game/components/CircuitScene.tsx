/**
 * Circuits as still pictures (Circuit Lab, id s10). Each frame is one loop drawn in SVG, 320 units wide: a battery on
 * the left, the switches in the middle, a lamp on the right, and the wire back along the bottom. A switch is two
 * contacts and a lever: flat across the gap when closed, raised when open, dashed when the case is not set. Switches in
 * a line follow each other on one wire; side by side, they sit on branches between two rails; a flipper box is a dashed
 * box around its inside, tagged “Flipper”. Every label is 15 or 16 units, so it stays at 12 px or more at phone width.
 * Words carry the meaning (closed, open, on, off), never colour alone. Under the frames, a table of cases is a real
 * table with the words Closed, Open, On and Off. The same picture is read in words by circuitSpeech.
 */
import type { ReactNode } from 'react';
import type { CircuitFrame, CircuitPart, Scene } from '../../engine/types';
import { circuitSpeech } from '../speech';
import '../../styles/circuit.css';

type CircuitData = Extract<Scene, { kind: 'circuit' }>;

const W = 320;
/** A switch: 48 wide, 60 high, its wire at 30 (name above it, state under it). */
const SW_W = 48;
const SW_H = 60;
const SW_MID = 30;
/** Space between parts in a line; the rails of side-by-side branches; the gap between branches. */
const GAP = 10;
const RAIL = 12;
const VGAP = 4;
/** A flipper box: padding around its inside, and the tag line on top. */
const PAD = 12;
const TAG = 20;
const LABEL = 16;
const SMALL = 15;
const CLOSED = '#7dffbf';
const OPEN = '#ff8fa3';
const FLIPPER = '#c4a8ff';
const LAMP_ON = '#ffd84d';

interface Box {
  w: number;
  h: number;
  /** The wire's height inside the box: power comes in at (0, mid) and goes out at (w, mid). */
  mid: number;
  draw(x: number, y: number, key: string): ReactNode;
}

const wire = (x1: number, y1: number, x2: number, y2: number, key: string) => <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} className="play-circ-wire" />;

/** One switch: its name, two contacts, the lever, and its state in words. */
function switchBox(name: string, closed: boolean | undefined): Box {
  return {
    w: SW_W,
    h: SW_H,
    mid: SW_MID,
    draw: (x, y, key) => {
      const m = y + SW_MID;
      const l = x + 9;
      const r = x + SW_W - 9;
      const lever =
        closed === true ? <line x1={l} y1={m} x2={r} y2={m} stroke={CLOSED} strokeWidth={4} strokeLinecap="round" />
          : closed === false ? <line x1={l} y1={m} x2={r - 4} y2={m - 12} stroke={OPEN} strokeWidth={4} strokeLinecap="round" />
            : <line x1={l} y1={m} x2={r - 2} y2={m - 9} className="play-circ-lever" strokeDasharray="4 3" />;
      return (
        <g key={key}>
          {wire(x, m, l, m, 'a')}
          {wire(r, m, x + SW_W, m, 'b')}
          <text x={x + SW_W / 2} y={y + 12} fontSize={LABEL} fontWeight={800} textAnchor="middle" className="play-circ-text">{name}</text>
          {lever}
          <circle cx={l} cy={m} r={4} className="play-circ-dot" />
          <circle cx={r} cy={m} r={4} className="play-circ-dot" />
          {closed !== undefined && (
            <text x={x + SW_W / 2} y={y + SW_H - 4} fontSize={SMALL} fontWeight={700} textAnchor="middle" fill={closed ? CLOSED : OPEN}>{closed ? 'closed' : 'open'}</text>
          )}
        </g>
      );
    },
  };
}

/** Lay out a part: its size, where its wire runs, and how to draw it at a place. */
function layout(p: CircuitPart, closed: Record<string, boolean> | undefined): Box {
  switch (p.t) {
    case 'switch':
      return switchBox(p.name, closed?.[p.name]);
    case 'flip': {
      const inner = layout(p.part, closed);
      const w = inner.w + 2 * PAD;
      const h = inner.h + TAG + PAD;
      const mid = TAG + inner.mid;
      return {
        w,
        h,
        mid,
        draw: (x, y, key) => (
          <g key={key}>
            <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={8} fill="rgba(196, 168, 255, 0.08)" stroke={FLIPPER} strokeWidth={2} strokeDasharray="6 4" />
            <text x={x + 6} y={y + 15} fontSize={SMALL} fontWeight={800} fill={FLIPPER}>Flipper</text>
            {wire(x, y + mid, x + PAD, y + mid, 'in')}
            {wire(x + PAD + inner.w, y + mid, x + w, y + mid, 'out')}
            {inner.draw(x + PAD, y + TAG, 'inner')}
          </g>
        ),
      };
    }
    case 'line': {
      const parts = p.parts.map((x) => layout(x, closed));
      const mid = Math.max(...parts.map((b) => b.mid));
      const h = Math.max(...parts.map((b) => mid - b.mid + b.h));
      const w = parts.reduce((s, b) => s + b.w, 0) + GAP * (parts.length - 1);
      return {
        w,
        h,
        mid,
        draw: (x, y, key) => {
          let at = x;
          const out: ReactNode[] = [];
          parts.forEach((b, i) => {
            if (i > 0) {
              out.push(wire(at, y + mid, at + GAP, y + mid, `w${i}`));
              at += GAP;
            }
            out.push(b.draw(at, y + mid - b.mid, `p${i}`));
            at += b.w;
          });
          return <g key={key}>{out}</g>;
        },
      };
    }
    case 'side': {
      const parts = p.parts.map((x) => layout(x, closed));
      const inner = Math.max(...parts.map((b) => b.w));
      const w = inner + 2 * RAIL;
      const tops: number[] = [];
      let h = 0;
      parts.forEach((b, i) => {
        if (i > 0) h += VGAP;
        tops.push(h);
        h += b.h;
      });
      const mids = parts.map((b, i) => tops[i] + b.mid);
      const mid = (mids[0] + mids[mids.length - 1]) / 2;
      return {
        w,
        h,
        mid,
        draw: (x, y, key) => (
          <g key={key}>
            {wire(x, y + mids[0], x, y + mids[mids.length - 1], 'l')}
            {wire(x + w, y + mids[0], x + w, y + mids[mids.length - 1], 'r')}
            {parts.map((b, i) => (
              <g key={i}>
                {wire(x, y + mids[i], x + RAIL, y + mids[i], 'in')}
                {wire(x + RAIL + b.w, y + mids[i], x + w, y + mids[i], 'out')}
                {b.draw(x + RAIL, y + tops[i], 'part')}
              </g>
            ))}
          </g>
        ),
      };
    }
  }
}

/** The battery: a cell with a nub, and its name under it. */
function Battery({ x, m }: { x: number; m: number }) {
  return (
    <g>
      <rect x={x} y={m - 12} width={34} height={24} rx={4} className="play-circ-cell" />
      <rect x={x + 34} y={m - 6} width={5} height={12} rx={1} className="play-circ-cell" />
      <rect x={x + 3} y={m - 9} width={12} height={18} rx={2} fill={CLOSED} opacity={0.5} />
      <text x={x + 20} y={m + 32} fontSize={SMALL} fontWeight={700} textAnchor="middle" className="play-circ-text">Battery</text>
    </g>
  );
}

/** The lamp: lit with rays when on, dark when off, a question mark when it is to be worked out. Its state in words under it. */
function Lamp({ x, m, lamp }: { x: number; m: number; lamp: boolean | null | undefined }) {
  const cx = x + 20;
  const word = lamp === true ? 'Lamp on' : lamp === false ? 'Lamp off' : lamp === null ? 'Lamp ?' : 'Lamp';
  return (
    <g>
      {lamp === true && (
        <g stroke={LAMP_ON} strokeWidth={2.5} strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={cx + Math.cos(r) * 19} y1={m + Math.sin(r) * 19} x2={cx + Math.cos(r) * 25} y2={m + Math.sin(r) * 25} />;
          })}
        </g>
      )}
      <circle cx={cx} cy={m} r={15} fill={lamp === true ? LAMP_ON : 'rgba(11, 16, 32, 0.5)'} className="play-circ-bulb" />
      {lamp === null && <text x={cx} y={m + 6} fontSize={LABEL} fontWeight={800} textAnchor="middle" className="play-circ-text">?</text>}
      {lamp !== true && lamp !== null && <path d={`M ${cx - 7} ${m + 4} q 3.5 -10 7 0 q 3.5 10 7 0`} fill="none" className="play-circ-filament" />}
      <text x={cx} y={m + 32} fontSize={SMALL} fontWeight={700} textAnchor="middle" className="play-circ-text">{word}</text>
    </g>
  );
}

/** One frame: its name, the loop, and the parts on it. */
function Frame({ f, speech }: { f: CircuitFrame; speech: string }) {
  const net = layout(f.part, f.closed);
  const top = f.name ? 26 : 6;
  const m = top + Math.max(net.mid, 24);
  const netY = m - net.mid;
  // Battery 40 wide, lamp 40 wide, 14 of wire on each side of the switches; all of it centered.
  const content = 40 + 14 + net.w + 14 + 40;
  const x0 = Math.max(18, (W - content) / 2);
  const netX = x0 + 40 + 14;
  const lampX = netX + net.w + 14;
  const bottom = Math.max(netY + net.h, m + 38) + 8;
  const left = x0 - 10;
  const right = lampX + 56;
  return (
    <svg className="play-circ-svg" viewBox={`0 0 ${W} ${bottom + 4}`} role="img" aria-label={speech}>
      {f.name && <text x={8} y={18} fontSize={LABEL} fontWeight={800} className="play-circ-name">{f.name}</text>}
      <path d={`M ${lampX + 35} ${m} H ${right} V ${bottom} H ${left} V ${m} H ${x0}`} className="play-circ-wire" fill="none" />
      {wire(x0 + 39, m, netX, m, 'to-net')}
      {wire(netX + net.w, m, lampX + 5, m, 'to-lamp')}
      <Battery x={x0} m={m} />
      {net.draw(netX, netY, 'net')}
      <Lamp x={lampX} m={m} lamp={f.lamp} />
    </svg>
  );
}

export function CircuitPicture({ scene, labelId }: { scene: CircuitData; labelId?: string }) {
  const tb = scene.table;
  const marked = new Set(tb?.marked ?? []);
  // Each frame's own lines, for its label: the speech of a scene with just that frame.
  const frameSpeech = (f: CircuitFrame) => circuitSpeech({ kind: 'circuit', circuits: [f] }).join(' ');
  return (
    <figure className="play-scene play-circ" id={labelId}>
      {scene.circuits.map((f, i) => (
        <Frame key={i} f={f} speech={frameSpeech(f)} />
      ))}
      {tb && (
        <table className="play-circ-table">
          <caption className="play-sr">The cases, one row each</caption>
          <thead>
            <tr>
              <th scope="col" className="play-circ-rowhead">{tb.rowWord ?? 'Row'}</th>
              {tb.heads.map((h, j) => (
                <th key={j} scope="col" className={j < tb.inputs ? 'is-switch' : j === tb.inputs ? 'is-lamp is-first' : 'is-lamp'}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tb.cells.map((row, k) => (
              <tr key={k} className={marked.has(k) ? 'is-marked' : undefined}>
                <th scope="row" className="play-circ-rowhead">
                  {k + 1}
                  {marked.has(k) && tb.markLabel && <span className="play-circ-mark">{tb.markLabel}</span>}
                </th>
                {row.map((v, j) => {
                  const lamp = j >= tb.inputs;
                  return (
                    <td key={j} className={lamp ? (j === tb.inputs ? 'is-lamp is-first' : 'is-lamp') : 'is-switch'}>
                      {v === null ? (
                        <span className="play-circ-blank"><span className="play-sr">blank</span></span>
                      ) : (
                        <span className={`play-circ-v is-${v ? 'yes' : 'no'}`}>{lamp ? (v ? 'On' : 'Off') : v ? 'Closed' : 'Open'}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {scene.caption && <figcaption className="play-circ-cap">{scene.caption}</figcaption>}
    </figure>
  );
}

/** The widest frame a part makes, in SVG units (for tests: every circuit must fit the 320-unit frame). */
export function frameWidth(p: CircuitPart): number {
  return 18 + 40 + 14 + layout(p, undefined).w + 14 + 56;
}
