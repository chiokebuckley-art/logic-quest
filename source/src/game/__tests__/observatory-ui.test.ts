/**
 * The Pattern Observatory's shared screens, rendered on the server: the number pad and its item, the faded frame, the
 * confidence tap, the routine strip lit per phase, the evidence profile, the sky map, and an Observatory lesson's
 * phase labels. Content-free: every item here is a small fake.
 */
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newEvidence, profileOf, markComplete } from '../../engine/evidence';
import type { LessonDef, NumberItem, Scene, StopDef } from '../../engine/types';
import { EvidenceProfile } from '../components/EvidenceProfile';
import { ItemView, answerFor, canSubmitFor, waitNoteFor } from '../components/ItemView';
import { LessonRunner } from '../components/LessonRunner';
import { NumberPad } from '../components/NumberPad';
import { ObservatoryMap } from '../components/ObservatoryMap';
import { PHASE_MOVES, RoutineStrip } from '../components/RoutineStrip';
import { SceneView } from '../components/SceneView';
import { sceneSpeech, itemSpeech } from '../speech';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const render = (el: ReturnType<typeof h>) => { const html = renderToString(el); return { html, text: text(html) }; };
const noop = () => {};

const stairs: Scene = { kind: 'staircase', construction: 'Each step keeps the centre stone and adds one pair.', rows: [{ step: 1, cells: ['old', 'centre', 'old'] }, { step: 2, cells: ['new', 'old', 'centre', 'old', 'new'] }], table: [{ step: 1, count: 3 }, { step: 2, count: 5 }, { step: 3, count: null }], steps: [{ label: 'Add a pair', say: 'Step 2 keeps the centre and adds one pair.' }] };
const num: NumberItem = { kind: 'number', id: 'n1', stop: 15, lesson: 's15.l1', skill: 's15.grow', prompt: 'How many tiles at step 12?', scene: stairs, explain: 'One centre tile and twelve pairs: 25.', answer: 25, digits: 2, unit: 'tiles', phase: 'do', frame: 'Step 12 has 1 centre tile and 12 pairs, so it has ___ tiles.', teach: { rule: 'Count the centre tile and every pair.' }, hint: 'Count the pairs first.', hintCase: { label: 'Step 3: one centre and three pairs.', truths: [{ who: 'Tiles', value: true }] } };

describe('the number item', () => {
  it('answers only once a digit is typed, waits with the right note, and reads aloud in words', () => {
    expect(answerFor(num, null, [], [], {}, '')).toBeNull();
    expect(answerFor(num, null, [], [], {}, '25')).toEqual({ kind: 'number', value: 25 });
    expect(canSubmitFor(num, null, [], {}, '')).toBe(false);
    expect(canSubmitFor(num, null, [], {}, '2')).toBe(true);
    expect(waitNoteFor(num, false)).toBe('Type a number to go on.');
    expect(itemSpeech(num).at(-1)).toBe('Fill the blank: Step 12 has 1 centre tile and 12 pairs, so it has blank tiles.');
  });
  it('draws the pad with large keys, OK and delete, the frame with its blank, and the confidence tap', () => {
    const r = render(h(ItemView, { item: num, mode: 'learn', readAloud: false, onDone: noop }));
    expect(r.text).toContain('How many tiles at step 12?');
    expect(r.text).toContain('Step 12 has 1 centre tile and 12 pairs, so it has ___ tiles.');
    expect(r.html).toContain('play-frame-blank');
    expect(r.html).toContain('class="play-pad"');
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) expect(r.html).toContain(`>${k}</button>`);
    expect(r.html).toContain('aria-label="OK, check this number"');
    expect(r.html).toContain('aria-label="Delete the last digit"');
    expect(r.html).not.toContain('<input');
    expect(r.text).toContain('How sure?');
    expect(r.text).toContain('Unsure');
    expect(r.text).toContain('Very sure');
    // The staircase scene draws its construction and table.
    expect(r.text).toContain('Each step keeps the centre stone and adds one pair.');
    expect(r.html).toContain('play-ob-tile is-new');
  });
  it('the pad alone: 44px keys, a live display, and no native field', () => {
    const r = render(h(NumberPad, { value: '7', onChange: noop, onSubmit: noop, unit: 'days' }));
    expect(r.text).toContain('7');
    expect(r.text).toContain('days');
    expect(r.text).toContain('Typed: 7 days');
    expect(r.html).not.toContain('<input');
  });
});

describe('the routine strip and the phase labels', () => {
  it('lights the moves of each phase', () => {
    expect(PHASE_MOVES.see).toEqual(['Notice', 'Describe']);
    expect(PHASE_MOVES.explain).toEqual(['Compare', 'Explain']);
    expect(PHASE_MOVES.do).toEqual(['Describe', 'Predict']);
    expect(PHASE_MOVES.transfer).toEqual(['Test', 'Predict']);
    expect(PHASE_MOVES.review).toHaveLength(6);
    const r = render(h(RoutineStrip, { at: 'transfer' }));
    expect(r.html.match(/is-lit/g)?.length).toBe(2);
    expect(r.html).toContain('aria-current="step"');
    expect(r.text).toMatch(/Notice.*Describe.*Compare.*Test.*Predict.*Explain/);
  });
  it('an Observatory lesson shows the strip and labels its tries by phase', () => {
    const items = [
      { ...num, id: 'e1', kind: 'choose' as const, phase: 'explain' as const, choices: [{ id: 'a', label: 'One centre and ten pairs.' }, { id: 'b', label: 'It adds 2.' }], answer: 'a', frame: undefined, feedback: { b: { headline: 'That is only the local change.', detail: ['Say where every tile comes from.'] } }, whyWrong: { b: 'That is only the local change. Say where every tile comes from.' } },
      { ...num, id: 'd1' },
      { ...num, id: 'd2', frame: undefined, prompt: 'How many tiles at step 15?', answer: 31 },
      { ...num, id: 't1', phase: 'transfer' as const, frame: undefined, prompt: 'A necklace has 1 clasp and 2 beads per link. How many pieces with 9 links?', answer: 19 },
    ];
    const lesson: LessonDef = { id: 's15.l1', title: 'Growing Staircase', routine: true, track: 2, ideas: [{ title: 'A stated construction', body: ['Each step keeps the centre stone and adds one pair.'], scene: stairs }], drill: [{ id: 's15.l1-do', title: 'Count step 3', body: ['Mark the count.'], scene: stairs, rows: [{ id: 'r', label: 'Step 3', marks: [{ id: 'm', label: 'Tiles', options: [{ id: '5', label: '5' }, { id: '7', label: '7' }], answer: '7', why: { '5': 'Step 3 has one more pair than step 2.' } }] }], done: 'Right: 7.' }], practice: () => items };
    const stop: StopDef = { n: 15, id: 's15', title: 'Rule Rise', idea: '', ready: true, lessons: [lesson], requires: [], lessonOrder: 'free', observatory: { ring: 2, track: 2, plain: 'Growth rules' } };
    const cards = render(h(LessonRunner, { stop, lesson, seed: 1, readAloud: false, onAnswer: noop, onComplete: noop, onExit: noop }));
    expect(cards.html).toContain('play-routine-strip');
    expect(cards.text).not.toContain('the same routine as Pattern Lab');
    // Resume at the first try: the label names the phase.
    const atTry = render(h(LessonRunner, { stop, lesson, seed: 1, readAloud: false, onAnswer: noop, onComplete: noop, onExit: noop, start: { next: 0, firstTry: 0, drilled: true, results: [] } }));
    expect(atTry.text).toContain('Explain 1 of 1');
    const atDo = render(h(LessonRunner, { stop, lesson, seed: 1, readAloud: false, onAnswer: noop, onComplete: noop, onExit: noop, start: { next: 2, firstTry: 1, drilled: true, results: [{ clean: true, tags: [] }, { clean: true, tags: [] }] } }));
    expect(atDo.text).toContain('Do 2 of 2');
  });
});

describe('the evidence profile and the sky map', () => {
  it('lights the chevrons as evidence comes in', () => {
    const e = markComplete(newEvidence(), 's14.l1', '2026-10-01');
    const p = profileOf(e, 's14.l1', '2026-10-03');
    const r = render(h(EvidenceProfile, { profile: p }));
    expect(r.html.match(/is-on/g)?.length).toBe(2);
    expect(r.html.match(/is-due/g)?.length).toBe(2);
    expect(r.text).toContain('Lesson complete is a gate, not mastery.');
  });
  it('the map names every place and its state', () => {
    const lesson: LessonDef = { id: 's14.l1', title: 'Star Chain', ideas: [], practice: () => [] };
    const stop: StopDef = { n: 14, id: 's14', title: 'First Lights', idea: '', ready: true, lessons: [lesson] };
    const r = render(h(ObservatoryMap, { places: [{ stop, lesson, state: 'open', title: 'Star Chain' }, { stop, lesson: { ...lesson, id: 's14.l2' }, state: 'locked', title: 'Repair Bench' }], onPick: noop }));
    expect(r.html).toContain('aria-label="Star Chain: open"');
    expect(r.html).toContain('aria-label="Repair Bench: waits on a skill"');
  });
  it('every Observatory scene kind draws and reads aloud', () => {
    const scenes: Scene[] = [
      { kind: 'chain', stated: 'This chain is made by repeating a block.', tokens: [{ label: 'triangle', shape: 'triangle', color: 'red' }, { label: 'circle', shape: 'circle', color: 'blue' }, { label: 'circle', shape: 'circle', color: 'blue' }], unit: { start: 0, len: 3 }, blanks: [], tray: [{ label: 'clap', sound: 'clap' }] },
      stairs,
      { kind: 'machine', rows: [{ input: 2, output: 4 }, { input: 3, output: null }], candidates: ['add 2', 'double'], stated: 'This machine uses one of these two rules.' },
      { kind: 'clock', cycle: ['A', 'B', 'C'], counting: 'position', n: 10, highlight: 0 },
      { kind: 'mirror', cells: ['#..#', '.##.'], fold: 'v', caption: 'Fold down the middle.' },
      { kind: 'matrix', size: 2, cells: [[{ count: 1, shape: 'circle', color: 'red' }, { count: 2, shape: 'circle', color: 'red' }], [{ count: 1, shape: 'circle', color: 'blue' }, null]], rowRule: 'Each row adds one dot.', colRule: 'Each column keeps its count.' },
      { kind: 'bridge', a: 'key', b: 'lock', relation: 'opens', c: 'password', options: ['account', 'door'] },
      { kind: 'lantern', points: 6, chords: true, regular: true, regions: 31, claim: 'The next one is 32.' },
    ];
    for (const s of scenes) {
      const r = render(h(SceneView, { scene: s }));
      expect(r.html, s.kind).toContain(`play-ob--${s.kind}`);
      const lines = sceneSpeech(s);
      expect(lines.length, s.kind).toBeGreaterThan(0);
      for (const l of lines) expect(l, `${s.kind}: ${l}`).not.toMatch(/[×=→✓]/);
    }
    // The hexagon's 31 label is refused: it shows 30.
    const hex = render(h(SceneView, { scene: scenes[7] }));
    expect(hex.text).toContain('30 regions');
    expect(hex.text).not.toContain('31 regions');
  });
});
