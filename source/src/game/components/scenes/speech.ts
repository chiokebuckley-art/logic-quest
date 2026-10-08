/**
 * Read-aloud lines for the Pattern Observatory scenes, one function per kind (each ring's builder owns its
 * kind's function, in the same file section). Every symbol is written as words; a stepped scene reads only the
 * steps that are showing.
 */
import type { ObservatoryScene } from '../../../engine/scenes';
import type { SceneStep } from '../../../engine/scenes/common';
import type { ChainFrame, ChainScene } from '../../../engine/scenes/chain';
import type { StaircaseScene } from '../../../engine/scenes/staircase';
import type { MachineScene } from '../../../engine/scenes/machine';
import type { ClockScene } from '../../../engine/scenes/clock';
import type { MirrorScene } from '../../../engine/scenes/mirror';
import type { MatrixScene } from '../../../engine/scenes/matrix';
import type { BridgeScene } from '../../../engine/scenes/bridge';
import type { LanternScene } from '../../../engine/scenes/lantern';

/** How many steps of a stepped scene are showing: all of them when the caller does not say. */
const shownSteps = (scene: { steps?: SceneStep[] }, revealed?: number): number => {
  const n = scene.steps?.length ?? 0;
  return Math.min(revealed ?? n, n);
};
/** A Deep Sky scene's frame on show: the frame of the last revealed step, if the scene has frames. */
function frameOf<F>(scene: { steps?: SceneStep[]; frames?: F[] }, revealed?: number): F | undefined {
  const shown = shownSteps(scene, revealed);
  return shown > 0 ? scene.frames?.[shown - 1] : undefined;
}
const stepLines = (scene: ObservatoryScene, revealed?: number): string[] => (scene.steps ?? []).slice(0, shownSteps(scene, revealed)).map((s) => s.say);

// ---- Ring 1: chain ----
export function chainSpeech(s: ChainScene, revealed?: number): string[] {
  // A stepped chain shows the frame of its last revealed step (the bare chain before any). Without frames, the try box
  // shows throughout and the unit and the break once every step is showing, as the picture draws it.
  const steps = s.steps?.length ?? 0;
  const shown = shownSteps(s, revealed);
  const f: ChainFrame = !steps ? s : s.frames ? (shown > 0 ? s.frames[shown - 1] ?? {} : {}) : shown >= steps ? s : { tryUnit: s.tryUnit };
  const tokens = f.tokens ?? s.tokens;
  const names = tokens.map((t, i) => (s.blanks?.includes(i) ? `position ${i + 1}: a blank` : `position ${i + 1}: ${t.label}`));
  const lines = [s.stated, `The chain: ${names.join(', ')}.`];
  const span = (b: { start: number; len: number }) => (b.len === 1 ? `position ${b.start + 1}` : `positions ${b.start + 1} to ${b.start + b.len}`);
  if (f.unit) lines.push(`The unit box goes around ${span(f.unit)}: ${tokens.slice(f.unit.start, f.unit.start + f.unit.len).map((t) => t.label).join(', ')}.`);
  if (f.tryUnit) lines.push(`Trying a block of ${f.tryUnit.len}: it ${f.tryUnit.ok ? 'fits every piece' : 'does not fit the whole chain'}.`);
  if (f.checked) lines.push(`Positions 1 to ${f.checked} are checked and fit.`);
  if (f.miss !== undefined && f.miss >= 0) lines.push(`Position ${f.miss + 1} breaks the block.`);
  if (f.broken !== undefined) lines.push(`Position ${f.broken + 1} is flagged: look again.`);
  if (s.tray?.length) lines.push(`Spare pieces: ${s.tray.map((t) => t.label).join(', ')}.`);
  return lines;
}

// ---- Ring 2: staircase, machine, clock ----
// A stepped Ring 2 scene reads what shows before its first step; the steps' own lines (stepLines) say the rest.
export function staircaseSpeech(s: StaircaseScene, revealed?: number): string[] {
  // A stepped staircase reads the rows and table entries drawn so far (reveal[k] for k steps showing).
  const at = s.steps?.length && s.reveal ? s.reveal[Math.max(0, Math.min(shownSteps(s, revealed), s.reveal.length - 1))] : undefined;
  const rows = at ? s.rows.slice(0, at.rows) : s.rows;
  const table = at ? (s.table ?? []).slice(0, at.table) : s.table ?? [];
  const [hs, hc] = s.head ?? ['Step', 'Tiles'];
  const name = (n: number) => (s.rowName ? `${n} ${n === 1 ? s.rowName[0] : s.rowName[1]}` : `Step ${n}`);
  const lines = [s.construction, ...rows.map((r) => {
    const added = r.cells.filter((c) => c === 'new').length;
    return `${name(r.step)}: ${r.cells.length} ${hc.toLowerCase()}${added ? `, ${added} of them new` : ''}.`;
  })];
  if (s.jump && table.length) lines.push(`Each jump: ${s.jump}.`);
  if (table.length) lines.push(`The table: ${table.map((t) => `${hs.toLowerCase()} ${t.step}, ${t.count === null ? 'a blank to find' : `${t.count}`}`).join('; ')}.`);
  return lines;
}
export function machineSpeech(s: MachineScene, revealed?: number): string[] {
  // A row, an output or a try reads once the step it belongs to is showing.
  const shown = shownSteps(s, revealed);
  const first = (at?: number) => !s.steps?.length || (at ?? 0) <= shown;
  const lines = [...(s.stated ? [s.stated] : [])];
  if (s.rule) lines.push(`The machine’s rule: ${s.rule}.`);
  if (s.candidates?.length) lines.push(`The rules to test: ${s.candidates.join(', or ')}.`);
  for (const r of s.rows.filter((x) => first(x.at))) {
    const input = r.input !== null && first(r.inAt ?? r.at) ? `${r.input}` : null;
    const output = r.output !== null && first(r.outAt ?? r.at) ? `${r.output}` : null;
    lines.push(input === null ? `An unknown input gave ${output ?? 'a blank'}.` : output === null ? `Input ${input}: the output is a blank.` : `Input ${input} gives ${output}.`);
  }
  for (const t of (s.tries ?? []).filter((x) => first(x.at))) lines.push(`Try ${t.input}: ${(s.candidates ?? []).map((c, i) => `${c} gives ${t.outs[i]}`).join(', ')}.`);
  for (const r of (s.ruledOut ?? []).filter((x) => first(x.at))) lines.push(`${r.rule} is crossed out.`);
  return lines;
}
export function clockSpeech(s: ClockScene): string[] {
  const face = (f: ClockScene | NonNullable<ClockScene['pair']>): string[] => {
    const unit = f.unit ?? 'steps';
    const one = unit.replace(/s$/, '');
    const out = [`A cycle of ${f.cycle.length}: ${f.cycle.join(', ')}, then again.`];
    out.push(f.counting === 'position' ? 'Counting item positions: the first item is position 1.' : `Counting elapsed ${unit}: ${f.start ?? 'the start'} is ${one} 0.`);
    out.push(...(f.captions ?? []).map((c) => `${c}.`));
    if (f.n !== undefined) out.push(f.counting === 'position' ? `The question is about ${unit === 'slots' ? 'slot' : 'position'} ${f.n}.` : `The question is about ${f.n} ${f.n === 1 ? one : unit} after ${f.start ?? 'the start'}.`);
    return out;
  };
  return [...face(s), ...(s.pair ? ['Beside it:', ...face(s.pair)] : [])];
}

// ---- Ring 3: mirror, matrix, bridge ----
export function mirrorSpeech(scene: MirrorScene, revealed?: number): string[] {
  // The picture on show: the frame of the last revealed step over the base picture. Spots are named by their line (row
  // or column) and their step from the fold, the words the lesson uses.
  const frame = frameOf(scene, revealed);
  const s: MirrorScene = frame ? { ...scene, ...frame } : scene;
  const rows = s.cells.length;
  const cols = s.cells[0]?.length ?? 0;
  const and = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  const lineName = (i: number, n: number, kind: 'row' | 'column') => {
    const names = kind === 'row' ? ['top', 'middle', 'bottom'] : ['left', 'middle', 'right'];
    return n === 3 ? `the ${names[i]} ${kind}` : `${kind} ${i + 1}`;
  };
  if (!s.fold || !s.ruler) {
    const filled = s.cells.flatMap((row, r) => [...row].flatMap((c, k) => (c === '#' ? [`row ${r + 1} column ${k + 1}`] : [])));
    const lines = s.caption ? [s.caption] : [`A dot grid, ${rows} rows by ${cols}. Filled dots at ${filled.join('; ') || 'none'}.`];
    if (s.fold) lines.push(s.fold === 'v' ? 'A fold line runs down the middle.' : 'A fold line runs across the middle.');
    if (s.cells.some((row) => row.includes('-'))) lines.push(`The ${s.fold === 'h' ? 'bottom' : 'right'} half is not drawn yet.`);
    if (s.turned) lines.push('The second picture is turned, not folded.');
    return lines;
  }
  const v = s.fold === 'v';
  const half = v ? cols / 2 : rows / 2;
  const side = (r: number, c: number) => ((v ? c : r) < half ? 0 : 1);
  const step = (r: number, c: number) => { const i = v ? c : r; return i < half ? half - i : i - half + 1; };
  const line = (r: number, c: number) => (v ? lineName(r, rows, 'row') : lineName(c, cols, 'column'));
  const sideName = (k: 0 | 1) => (v ? ['left half', 'right half'] : ['top half', 'bottom half'])[k];
  let ask = 0;
  const found: { k: 0 | 1; what: string; r: number; c: number }[] = [];
  s.cells.forEach((row, r) => [...row].forEach((ch, c) => {
    const what = ch === '#' ? 'dot' : ch === '?' ? `spot ${'abcdefghij'[ask++]}` : ch === '-' ? 'hidden' : '';
    if (what) found.push({ k: side(r, c), what, r, c });
  }));
  // Dots are read line by line, nearest step first; spots to decide keep their letters' (reading) order.
  const lineIndex = (x: { r: number; c: number }) => (v ? x.r : x.c);
  const isSpot = (x: { what: string }) => x.what.startsWith('spot');
  const read = [...found.filter((x) => !isSpot(x)).sort((x, y) => lineIndex(x) - lineIndex(y) || step(x.r, x.c) - step(y.r, y.c)), ...found.filter(isSpot)];
  const spots: Record<string, string[]>[] = [{}, {}];
  for (const x of read) {
    const key = x.what === 'dot' ? 'dot' : x.what === 'hidden' ? 'hidden' : 'ask';
    (spots[x.k][key] ??= []).push(key === 'ask' ? `${x.what}, ${line(x.r, x.c)} at step ${step(x.r, x.c)}` : `${line(x.r, x.c)} at step ${step(x.r, x.c)}`);
  }
  const lines = [v ? 'A dot grid with a fold line down the middle. Steps count out from the line: step 1 is next to it.' : 'A dot grid with a fold line across the middle, like the edge of a pool. Steps count out from the line.'];
  ([0, 1] as const).forEach((k) => {
    const sp = spots[k];
    if (sp.hidden?.length && !sp.dot?.length && !sp.ask?.length) { lines.push(`The ${sideName(k)} is not drawn yet.`); return; }
    lines.push(sp.dot?.length ? `The ${sideName(k)} has dots in ${and(sp.dot)}.` : `The ${sideName(k)} has no dots yet.`);
    if (sp.ask?.length) lines.push(`Spots to decide: ${sp.ask.join('; ')}.`);
  });
  if (s.turned) lines.push('The second picture is turned, not folded.');
  for (const cand of s.candidates ?? []) {
    const dots: string[] = [];
    cand.cells.forEach((row, i) => [...row].forEach((ch, k) => {
      if (ch !== '#') return;
      dots.push(v ? `${lineName(i, cand.cells.length, 'row')} at step ${k + 1}` : `${lineName(k, row.length, 'column')} at step ${i + 1}`);
    }));
    lines.push(`Half ${cand.name}: dots in ${and(dots) || 'no spots'}.`);
  }
  if (s.caption) lines.push(s.caption);
  return lines;
}
export function matrixSpeech(s: MatrixScene, revealed?: number): string[] {
  // The stated rules, then the tiles row by row (a word grid by its headings), then what the step on show adds: the
  // lit lines, a tile tried in the gap, the gap filled.
  const f = frameOf(s, revealed);
  const tile = (c: { count: number; color: string; shape: string }) => `${c.count} ${c.color} ${c.shape}${c.count === 1 ? '' : 's'}`;
  const lines: string[] = [];
  if (s.rowRule) lines.push(`Row rule: ${s.rowRule}`);
  if (s.colRule) lines.push(`Column rule: ${s.colRule}`);
  if (s.allRule) lines.push(s.allRule);
  if (s.tiles && s.heads) {
    s.tiles.forEach((row, r) => lines.push(`${s.heads!.rows[r]}: ${row.map((t, c) => `${s.heads!.cols[c]}, ${t ?? 'the missing class'}`).join('; ')}.`));
  } else {
    s.cells.forEach((row, r) => lines.push(`Row ${r + 1}: ${row.map((c) => (c ? tile(c) : 'the missing tile')).join('; ')}.`));
  }
  const glow = s.steps?.length ? f?.glow : s.glow;
  if (glow && glow !== 'none') lines.push(glow === 'rows' ? 'The rows are lit.' : 'The columns are lit.');
  if (f?.trial) {
    const what = f.trial.text ?? (f.trial.cell ? tile(f.trial.cell) : 'a tile');
    lines.push(`Trying ${what} in the gap: it ${f.trial.row === 'fits' ? 'fits' : 'breaks'} the row rule and ${f.trial.col === 'fits' ? 'fits' : 'breaks'} the column rule.`);
  }
  if (f?.filledText || f?.filled) lines.push(`The gap is filled: ${f.filledText ?? tile(f.filled!)}.`);
  return lines;
}
export function bridgeSpeech(s: BridgeScene, revealed?: number): string[] {
  // The first pair, the new word, the link once it shows, and the fourth term once its step is on show.
  const f = frameOf(s, revealed);
  const d = s.steps?.length ? f?.d : s.d;
  const hidden = s.hidden && !f?.link;
  const capA = `${s.a.charAt(0).toUpperCase()}${s.a.slice(1)}`;
  // "Opposites" names the pair, not what one does to the other: "Big and small are opposites."
  const shown = s.relation === 'opposites'
    ? `${capA} and ${s.b} are opposites. So ${s.c} and ${d ?? 'what'} are opposites${d ? '.' : '?'}`
    : `${capA} ${s.relation} ${s.b}. So ${s.c} ${s.relation} ${d ?? 'what'}?`;
  const lines = hidden ? [`${capA} is to ${s.b} as ${s.c} is to ${d ?? 'what'}? The link is not shown yet: name it first.`] : [shown];
  if (f?.look) lines.push(`Beside the bridge, crossed out: ${f.look}.`);
  if (s.options?.length) lines.push(`The choices: ${s.options.join(', ')}.`);
  return lines;
}

// ---- Ring 4: lantern ----
export function lanternSpeech(scene: LanternScene, revealed?: number): string[] {
  // The lantern on show: the frames of the steps that are showing, merged in order over the scene (as the picture draws it).
  const s: LanternScene = (scene.frames ?? []).slice(0, shownSteps(scene, revealed)).reduce<LanternScene>((acc, f) => ({ ...acc, ...f }), scene);
  const verdict = { proved: 'Proved', tentative: 'A good guess', false: 'False' } as const;
  const end = (x: string) => (/[.!?]$/.test(x) ? x : `${x}.`);
  const lines: string[] = [];
  if (s.stated) lines.push(end(s.stated));
  if (s.pattern) lines.push(s.pattern === 'constructed' ? 'Constructed: it comes with its rule.' : 'Observed: only what was seen.');
  if (s.points > 0) {
    const joined = s.chords && s.points > 1;
    // Only 6 evenly placed points have three chords through one point (the regular hexagon).
    const meet = joined && !!s.regular && s.points === 6;
    lines.push(`A circle with ${s.points} point${s.points === 1 ? '' : 's'}${joined ? ', every pair joined by a chord' : ''}${s.regular ? ', placed evenly' : ''}.`);
    if (meet) lines.push('Three chords meet at one point in the middle.');
    if (s.hideCount) lines.push('The number of regions is hidden.');
    else if (s.regions !== undefined && !(s.regions === 31 && meet)) lines.push(`Regions: ${s.regions}.`);
  }
  if (s.sequence?.length) lines.push(`So far: ${s.sequence.join(', ')}.`);
  // A cell still to check ("?") is read as a blank.
  for (const r of s.rows ?? []) lines.push(`${r.label}: ${r.cells.map((c) => (c === '?' ? 'a blank' : c)).join(', ')}${r.tag ? `, ${r.tag}` : ''}.`);
  (s.claims ?? []).forEach((c, i) => lines.push(`Claim ${i + 1}: ${end(c.text)}${c.status ? ` ${verdict[c.status]}.` : ''}`));
  (s.chain ?? []).forEach((l, i) => lines.push(l.lit ? `Step ${i + 1}: ${end(l.text)}` : `Step ${i + 1}: not lit yet.`));
  if (s.claim) lines.push(`The claim: ${end(s.claim)}`);
  if (s.status) lines.push(`${verdict[s.status]}.`);
  return lines;
}

export function observatorySpeech(scene: ObservatoryScene, revealed?: number): string[] {
  let lines: string[];
  switch (scene.kind) {
    case 'chain': lines = chainSpeech(scene, revealed); break;
    case 'staircase': lines = staircaseSpeech(scene, revealed); break;
    case 'machine': lines = machineSpeech(scene, revealed); break;
    case 'clock': lines = clockSpeech(scene); break;
    case 'mirror': lines = mirrorSpeech(scene, revealed); break;
    case 'matrix': lines = matrixSpeech(scene, revealed); break;
    case 'bridge': lines = bridgeSpeech(scene, revealed); break;
    case 'lantern': lines = lanternSpeech(scene, revealed); break;
  }
  return [...lines, ...stepLines(scene, revealed)];
}
