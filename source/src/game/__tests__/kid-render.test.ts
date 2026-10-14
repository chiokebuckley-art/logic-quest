/**
 * The Kid Journey's rendering (docs/KID-JOURNEY.md §2, second half): the pictogram set, kid mode and its auto
 * read-aloud setting, and the kid screens of s1.l1 (What is a statement?), the first round with a kid layer: its
 * cards, its board, a quiz item, the compact feedback after a miss, the "Yes!" panel and the star screen. Rendered on
 * the server (no DOM), like the other screen tests.
 */
import { describe, expect, it } from 'vitest';
import { createElement as h, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as saves from '../../engine/save/save';
import type { ChooseItem, Item, Picto } from '../../engine/types';
import { createRng } from '../../engine/rng';
import { practiceFor } from '../../engine/drill';
import { STOPS } from '../../content/stops';
import { GRADES } from '../../content/grades';
import { L1_KID } from '../../content/stop1';
import { PICTO_NAMES, PICTO_WORDS, Pictogram, isPicto } from '../components/Pictogram';
import { KidModeContext, autoReadDefault, autoReadOn, kidModeOf, type KidMode } from '../kidMode';
import { kidItemSpeech, roundStartSpeech, yesNoOf } from '../kidPlay';
import { explanationFor } from '../explanation';
import { lessonById } from '../observatory';
import { IdeaCards } from '../components/IdeaCards';
import { DrillBoard } from '../components/DrillBoard';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { LessonRunner } from '../components/LessonRunner';
import { CheckRunner } from '../components/CheckRunner';
import { ItemView } from '../components/ItemView';
import { KidHint, KidRight, KidStarScreen, kidHintSpeech } from '../components/KidPlay';
import { MAX_RUN } from '../../engine/save/save';
import { StoreProvider } from '../store';
import { LessonScreen } from '../screens/LessonScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { kidModeFor, visibleText, wrongAnswer } from './budget-screens';
// Round 2, items (kid scenes, tile words, plain cards, quiet help, line-ups, alternate items).
import type * as T from '../../engine/types';
import * as kidPlay2 from '../kidPlay';
import * as kid2 from '../kid';
import * as learn2 from '../components/LearnItem';
import * as budget2 from './budget-screens';

const noop = () => {};
const G1: KidMode = kidModeFor('g1');
const kidWrap = (el: ReactElement, mode: KidMode | null = G1) => h(KidModeContext.Provider, { value: mode }, el);
const html = (el: ReactElement) => renderToString(el);
const seen = (el: ReactElement) => visibleText(renderToString(el));

const stop1 = STOPS.find((s) => s.id === 's1')!;
const l1 = stop1.lessons.find((l) => l.id === 's1.l1')!;
const firstItem = (seed = 1) => practiceFor(l1, createRng(seed))[0] as ChooseItem;

/** A device with one player whose save has the given changes. */
function store(change: (d: saves.SaveData) => void = () => {}) {
  const mem = new Map<string, string>();
  const kv: saves.KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); }, removeItem: (k) => { mem.delete(k); } };
  const { reg, player } = saves.addPlayer({ players: [] }, 'Sam', saves.COLORS[0], 1, 0.5);
  const data = saves.newSave();
  change(data);
  saves.saveRegistry(kv, reg);
  saves.writeSave(kv, player.id, data);
  return kv;
}
const inStore = (kv: saves.KV, child: ReactElement) => h(StoreProvider, { kv, children: child });
const lessonRoute = { name: 'lesson' as const, stopId: 's1', lessonId: 's1.l1', from: 'grades' as const };

// ---------- the pictograms ----------

describe('the pictograms', () => {
  const REQUIRED: Picto[] = ['calendar', 'cat', 'cat-wings', 'cloud-rain', 'pizza', 'sun', 'moon', 'star', 'apple', 'dog', 'fish', 'bird', 'tree', 'house', 'car', 'ball', 'cup', 'book', 'hat', 'lamp', 'telescope', 'key', 'flower', 'umbrella', 'check', 'cross', 'question', 'chest'];

  it('the starter set has at least 28 names, the spec’s list among them', () => {
    expect(PICTO_NAMES.length).toBeGreaterThanOrEqual(28);
    for (const n of REQUIRED) expect(PICTO_NAMES).toContain(n);
  });

  it('every Picto name has a drawing and a spoken name: an image on a 64-unit square, shapes only, no text', () => {
    for (const name of PICTO_NAMES) {
      expect(PICTO_WORDS[name], name).toMatch(/^[a-z][a-z ]+$/);
      const out = html(h(Pictogram, { name }));
      expect(out, name).toContain('role="img"');
      expect(out, name).toContain(`aria-label="${PICTO_WORDS[name]}"`);
      expect(out, name).toContain('viewBox="0 0 64 64"');
      expect(out, name).toMatch(/<(path|circle|rect|ellipse|polygon)\b/);
      expect(out, name).not.toMatch(/<text\b/);
      expect(visibleText(out), name).toBe('');
      // Flat: two or three colors (a single shape card has one).
      const colors = new Set([...out.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase()));
      expect(colors.size, name).toBeGreaterThanOrEqual(1);
      expect(colors.size, name).toBeLessThanOrEqual(3);
    }
  });

  it('legible at 44 px; a decorative picture inside a labelled control is hidden from screen readers', () => {
    expect(html(h(Pictogram, { name: 'cat', size: 44 }))).toContain('width="44"');
    const dec = html(h(Pictogram, { name: 'cat', decorative: true }));
    expect(dec).toContain('aria-hidden="true"');
    expect(dec).not.toContain('role="img"');
  });

  it('every picture the content names is in the set (kid cards, board rows, answer tiles, world buildings)', () => {
    const names: string[] = [];
    for (const s of STOPS) for (const l of s.lessons) {
      for (const c of l.kid?.cards ?? []) if (c.art && c.art !== 'scene') names.push(c.art);
      for (const b of l.kid?.board ?? []) for (const r of b.rows ?? []) if (r.art) names.push(r.art);
      for (const it of practiceFor(l, createRng(3)) as Item[]) if (it.kind === 'choose') for (const c of it.choices) if (c.art) names.push(c.art);
    }
    for (const g of GRADES) for (const w of g.worlds) names.push(w.building);
    for (const n of names) expect(isPicto(n), n).toBe(true);
  });
});

// ---------- kid mode and read-aloud by itself ----------

describe('kid mode and “Read aloud by itself”', () => {
  it('the setting is parsed from a save: a boolean is kept, anything else falls back to the grade', () => {
    const base = saves.newSave(0);
    expect(saves.parseSave({ ...base, settings: { ...base.settings, autoRead: false } })!.settings.autoRead).toBe(false);
    expect(saves.parseSave({ ...base, settings: { ...base.settings, autoRead: true } })!.settings.autoRead).toBe(true);
    expect(saves.parseSave({ ...base, settings: { ...base.settings, autoRead: 'yes' } })!.settings.autoRead).toBeUndefined();
    expect('autoRead' in saves.parseSave(base)!.settings).toBe(false);
    // It travels in the export file.
    const back = saves.importSave(saves.exportSave({ name: 'Sam', color: saves.COLORS[0] }, { ...base, settings: { ...base.settings, autoRead: false } }));
    expect('data' in back && back.data.settings.autoRead).toBe(false);
  });

  it('on by default for Grades 1 and 2, off for Grade 3 and up; a grown-up’s choice wins; it needs Read aloud on', () => {
    expect(autoReadDefault('g1')).toBe(true);
    expect(autoReadDefault('g2')).toBe(true);
    expect(autoReadDefault('g3')).toBe(false);
    expect(autoReadDefault('g4')).toBe(false);
    expect(autoReadDefault(null)).toBe(false);
    const st = saves.DEFAULT_SETTINGS;
    expect(autoReadOn(st, 'g1')).toBe(true);
    expect(autoReadOn({ ...st, autoRead: false }, 'g1')).toBe(false);
    expect(autoReadOn({ ...st, autoRead: true }, 'g3')).toBe(true);
    expect(autoReadOn({ ...st, readAloud: false }, 'g1')).toBe(false);
    const save = (grade: saves.SaveData['kid']['grade'], autoRead?: boolean) => {
      const d = saves.newSave(0);
      d.kid.grade = grade;
      if (autoRead !== undefined) d.settings.autoRead = autoRead;
      return d;
    };
    expect(kidModeOf(save('g1'))?.autoRead).toBe(true);
    expect(kidModeOf(save('g3'))?.autoRead).toBe(false);
    expect(kidModeOf(save('g2', false))?.autoRead).toBe(false);
    expect(kidModeOf(save('g4'))).toBeNull();
    expect(kidModeOf(save(null))).toBeNull();
  });

  it('Settings’ play panel has “Read aloud by itself”, on for a Grade 1 player and off for a classic one', () => {
    const state = (kv: saves.KV) => /id="sw-read-aloud-by-itself"[\s\S]*?aria-checked="(true|false)"/.exec(html(inStore(kv, h(SettingsScreen))))?.[1];
    expect(state(store((d) => { d.kid.grade = 'g1'; }))).toBe('true');
    expect(state(store())).toBe('false');
    expect(state(store((d) => { d.kid.grade = 'g1'; d.settings.autoRead = false; }))).toBe('false');
  });

  it('what auto read-aloud says: the kid line, or the kid prompt, the sentence and the answers', () => {
    expect(roundStartSpeech(l1)).toEqual(['Statement: it is true or false.']);
    expect(roundStartSpeech(lessonById('s1.l2'))).toEqual(['There is a blue card. True!']);
    // A round with no kid layer (Grade 5) starts silent.
    expect(roundStartSpeech(lessonById('s5.l1'))).toEqual([]);
    const it1 = firstItem();
    const said = kidItemSpeech(it1);
    expect(said[0]).toBe('A statement?');
    expect(said).toContain(it1.scene!.kind === 'text' ? it1.scene!.lines[0] : '');
    expect(said[said.length - 1]).toBe('Yes, or no?');
    expect(yesNoOf([{ id: 'true' }, { id: 'false' }])).toEqual({ yes: 'true', no: 'false' });
    expect(yesNoOf([{ id: 'fit' }, { id: 'not' }])).toEqual({ yes: 'fit', no: 'not' });
    expect(yesNoOf([{ id: 'reject' }, { id: 'keep' }])).toEqual({ yes: 'keep', no: 'reject' });
    expect(yesNoOf([{ id: 'yes' }, { id: 'no' }, { id: 'maybe' }])).toBeNull();
    expect(yesNoOf([{ id: 'red' }, { id: 'blue' }])).toBeNull();
  });
});

// ---------- s1.l1 in kid mode ----------

describe('s1.l1 in kid mode: cards, a board, an item, the compact feedback, the star screen', () => {
  it('keeps its classic text and ids: the kid layer sits beside them', () => {
    expect(l1.ideas.map((c) => c.title)).toEqual(['A statement', 'False still counts', 'Not statements', 'Opinions', 'You don’t need the answer', 'An example']);
    expect(l1.drill!.map((d) => d.id)).toEqual(['s1.l1-do']);
    expect(practiceFor(l1, createRng(1)).map((it) => it.id)).toEqual(['s1.l1-p1', 's1.l1-p2', 's1.l1-p3', 's1.l1-p4', 's1.l1-p5']);
    expect(l1.kid).toBe(L1_KID);
    expect(L1_KID.cards).toHaveLength(l1.ideas.length);
  });

  it('a Grade 1 round opens on the picture first, then the one line in the h2; no kicker count, no body, no why', () => {
    const out = html(inStore(store((d) => { d.kid.grade = 'g1'; }), h(LessonScreen, { route: lessonRoute })));
    const t = visibleText(out);
    expect(out).toMatch(/data-picto="calendar"[\s\S]*<h2 class="play-idea-title kid-line"[^>]*>Statement: it is true or false\.<\/h2>/);
    expect(t).not.toContain('Key idea');
    expect(t).not.toContain('1 of 6');
    expect(t).not.toContain('A statement is a sentence that is either true or false.');
    expect(t).not.toContain('Why it matters');
    expect(out).not.toContain('aria-label="Card 1 of 6"');
    expect(t).toMatch(/Next$/);
    // A classic player (and a Grade 4 player) still gets the classic card.
    for (const kv of [store(), store((d) => { d.kid.grade = 'g4'; })]) {
      const classic = seen(inStore(kv, h(LessonScreen, { route: lessonRoute })));
      expect(classic).toContain('A statement is a sentence that is either true or false.');
      expect(classic).not.toContain('Statement: it is true or false.');
    }
  });

  it('cards say “Next”, and the last one says “Go”', () => {
    const cards = (k: number) => seen(kidWrap(h(IdeaCards, { cards: l1.ideas, kid: L1_KID.cards, startAt: k, readAloud: true, onDone: noop })));
    expect(cards(1)).toBe('Cats can fly. False still counts! Back Next');
    expect(cards(5)).toBe('Ask: true or false? Back Go');
    expect(html(kidWrap(h(IdeaCards, { cards: l1.ideas, kid: L1_KID.cards, startAt: 3, readAloud: true, onDone: noop })))).toContain('data-picto="pizza"');
  });

  it('the board: the kid line, one row at a time with its picture, a check tile and a cross tile, no body or steps', () => {
    const board = (row: number) => html(kidWrap(h(DrillBoard, { step: l1.drill![0], kid: L1_KID.board![0], startRow: row, readAloud: true, onDone: noop })));
    const first = board(0);
    expect(visibleText(first)).toBe('A statement? “The moon is cheese.” Check');
    expect(first).toContain('data-picto="moon"');
    expect(first).toMatch(/data-tile="yes"/);
    expect(first).toMatch(/aria-label="A statement"[^>]*data-tile="yes"|data-tile="yes"[^>]*aria-label="A statement"/);
    expect(first).toMatch(/aria-label="Not a statement"/);
    expect(first).toContain('data-picto="check"');
    expect(first).toContain('data-picto="cross"');
    expect(visibleText(board(2))).toBe('A statement? “The moon is the prettiest.” Check');
    // The classic board keeps its body and its words.
    const classic = seen(h(DrillBoard, { step: l1.drill![0], kid: L1_KID.board![0], readAloud: true, onDone: noop }));
    expect(classic).toContain('Now sort three new ones.');
    expect(classic).toContain('Check my marks');
  });

  it('an item: the kid prompt, the sentence, yes/no tiles, three empty goal stars instead of “To finish”', () => {
    const runner = (mode: KidMode | null) => html(kidWrap(h(LessonRunner, { stop: stop1, lesson: l1, seed: 1, readAloud: true, start: { next: 0, firstTry: 0, drilled: true, results: [] }, onAnswer: noop, onComplete: noop, onExit: noop }), mode));
    const out = runner(G1);
    const t = visibleText(out);
    const it1 = firstItem();
    expect(t).toContain('A statement?');
    expect(t).toContain(it1.scene!.kind === 'text' ? it1.scene!.lines[0] : '');
    expect(t).not.toContain('Is this sentence a statement?');
    expect(t).not.toContain('To finish');
    expect(t).not.toContain('Try 1 of 5');
    expect(t).not.toContain('Pick an answer to go on.');
    expect(out).toContain('aria-label="0 of 3 stars"');
    expect(out.match(/kid-goal-star/g)).toHaveLength(3);
    expect(out).toContain('data-tile="yes"');
    expect(out).toContain('data-tile="no"');
    expect(out).toMatch(/aria-label="Hint"/);
    // The classic runner keeps the sentence goal and the classic prompt.
    const classic = visibleText(runner(null));
    expect(classic).toContain('To finish');
    expect(classic).toContain('Is this sentence a statement?');
  });

  it('after a miss: one line, “Show me”, “Tell me more” (a small icon button), “Try again”; classic play keeps the full panel', () => {
    const it1 = firstItem();
    const model = explanationFor(it1, wrongAnswer(it1));
    const actions = h('button', { type: 'button' }, 'Try again');
    const compactHtml = html(kidWrap(h(ExplanationPanel, { model, kid: it1.kid, readAloud: true, actions })));
    const compact = visibleText(compactHtml);
    expect(compact).toBe(`${it1.kid!.nope} Show me Try again`);
    expect(compactHtml).toContain('aria-label="Tell me more"');
    // "Show me" open: the picture case in place of the line.
    const shown = visibleText(html(kidWrap(h(ExplanationPanel, { model, kid: it1.kid, readAloud: true, actions, kidShowOpen: true }))));
    expect(shown).toBe(`${it1.kid!.show!.label} ${it1.kid!.show!.note} Try again`);
    expect(compact).not.toContain('Not yet. Let’s look closer.');
    const full = visibleText(html(h(ExplanationPanel, { model, kid: it1.kid, readAloud: true, actions })));
    expect(full).toContain('Not yet. Let’s look closer.');
    expect(full).toContain(model.title);
    // "Show me" shows a short sentence of the same kind, never the quiz's own.
    expect(it1.kid!.show!.label).not.toBe(`“${it1.scene!.kind === 'text' ? it1.scene!.lines[0] : ''}”`);
  });

  it('a right answer: “Yes!”, one line and one button', () => {
    const it1 = firstItem();
    expect(seen(h(KidRight, { line: it1.kid!.yes, buttonLabel: 'Next', readAloud: true, onNext: noop }))).toBe(`Yes! ${it1.kid!.yes} Next`);
  });

  it('the star screen: “You did it!”, the star (clean or mended), “k of n” toward the badge, one big “Go”', () => {
    const clean = html(h(KidStarScreen, { kind: 'clean', line: L1_KID.star, got: 3, of: 7, readAloud: true, onDone: noop }));
    // "3 of 7" toward the badge is a row of seven small stars, three lit: a picture with words for screen readers.
    expect(visibleText(clean)).toBe(`You did it! ${L1_KID.star} Go`);
    expect(clean).toContain('aria-label="3 of 7 stars toward the grade badge"');
    expect(clean.match(/kid-goal-star is-on/g)).toHaveLength(3);
    expect(clean.match(/kid-goal-star/g)).toHaveLength(7);
    expect(clean).toContain('kid-big-star is-clean');
    expect(clean).toContain('aria-label="A gold star"');
    expect(html(h(KidStarScreen, { kind: 'mended', got: 1, of: 7, readAloud: true, onDone: noop }))).toContain('kid-big-star is-mended');
    // A passed round's recap in kid mode is the star screen (a resumed run that already met the pass rule).
    const results = [
      { clean: true, tags: ['not-statement'] },
      { clean: true, tags: ['false-statement'] },
      { clean: true, tags: ['statement'] },
      { clean: true, tags: ['not-statement'] },
      { clean: true, tags: ['which'] },
    ];
    const recap = (mode: KidMode | null) => seen(kidWrap(h(LessonRunner, { stop: stop1, lesson: l1, seed: 1, readAloud: true, kidTally: { got: 1, of: 7 }, start: { next: 5, firstTry: 5, drilled: true, results }, onAnswer: noop, onComplete: noop, onExit: noop }), mode));
    expect(recap(G1)).toContain(`You did it! ${L1_KID.star} Go`);
    expect(recap(null)).toContain('What you learned');
  });

  it('a round not passed in kid mode ends on “Not yet. Try again?” with one big button, never the classic recap', () => {
    const results = Array.from({ length: MAX_RUN }, () => ({ clean: false, tags: [] as string[] }));
    const runner = (mode: KidMode | null) => kidWrap(h(LessonRunner, { stop: stop1, lesson: l1, seed: 1, readAloud: true, round: { k: 1, n: 4 }, start: { next: MAX_RUN, firstTry: 0, drilled: true, results }, onAnswer: noop, onComplete: noop, onExit: noop, onRestart: noop }), mode);
    const kidHtml = html(runner(G1));
    expect(visibleText(kidHtml)).toBe('Round 1 of 4 Not yet. Try again? Go');
    expect(kidHtml.match(/<button[^>]*kid-big-btn/g)).toHaveLength(1);
    // A Grade 1 round without its kid layer ends the same way.
    const bare = { ...l1, kid: undefined };
    expect(seen(kidWrap(h(LessonRunner, { stop: stop1, lesson: bare, seed: 1, readAloud: true, round: { k: 1, n: 4 }, start: { next: MAX_RUN, firstTry: 0, drilled: true, results }, onAnswer: noop, onComplete: noop, onExit: noop, onRestart: noop })))).toBe('Round 1 of 4 Not yet. Try again? Go');
    // Classic play keeps its recap.
    const classic = seen(runner(null));
    expect(classic).toContain('Not done yet');
    expect(classic).toContain('Start the lesson again');
  });

  it('the kid hint: the kid line (at most 8 words), or the show case as a picture only, on its own screen', () => {
    const it1 = firstItem();
    // A kid hint line: the bulb, the line, one icon button back to the question; no case, no classic hint sentence.
    const line = html(h(KidHint, { hint: 'Can it be true or false?', readAloud: true, onClose: noop }));
    expect(visibleText(line)).toBe('Can it be true or false?');
    expect(line).toContain('aria-label="Back to the question"');
    expect(line).not.toContain('play-case');
    // No line: the show case as a picture only (the case without its note).
    const pic = html(h(KidHint, { show: it1.kid!.show, readAloud: true, onClose: noop }));
    expect(visibleText(pic)).toBe(it1.kid!.show!.label);
    expect(visibleText(pic)).not.toContain(it1.kid!.show!.note!);
    expect(kidHintSpeech('Look at the end.', it1.kid!.show)).toEqual(['Look at the end.']);
    // The Hint button: in kid mode for a kid line (even with no classic hint) or a picture (when the item has a hint).
    const withLine: Item = { ...it1, id: 'h1', hint: undefined, kid: { ...it1.kid!, hint: 'Can it be true or false?' } };
    const noHint: Item = { ...it1, id: 'h2', hint: undefined, kid: { ...it1.kid!, hint: undefined } };
    const hintBtn = (item: Item, mode: KidMode | null = G1) => /aria-label="Hint"|>Hint</.test(html(kidWrap(h(ItemView, { item, mode: 'learn', readAloud: true, onDone: noop }), mode)));
    expect(hintBtn(withLine)).toBe(true);
    expect(hintBtn(noHint)).toBe(false);
    expect(hintBtn(it1)).toBe(!!it1.hint);
    // Classic play keeps the classic hint rule: the item's own hint.
    expect(hintBtn(withLine, null)).toBe(false);
  });

  it('a world check in kid mode draws the same kid item, with its question count and Next', () => {
    const items: Item[] = [{ ...firstItem(), id: 'wc-1' }];
    const t = seen(kidWrap(h(CheckRunner, { stop: stop1, kind: 'pass', items, timeLimit: null, readAloud: true, header: { over: 'Grade 1 · Sky Path', title: 'World check' }, onFinish: noop, onExit: noop })));
    expect(t).toContain('Question 1 of 1');
    expect(t).toContain('A statement?');
    expect(t).toContain('Finish');
    const out = html(kidWrap(h(ItemView, { item: items[0], mode: 'check', readAloud: true, onDone: noop })));
    expect(out).toContain('data-tile="yes"');
  });
});

// ---------- round 2: boards, label counting and the world check result (docs/KID-JOURNEY.md, "How to add a kid layer") ----------

import type { DrillMark, DrillStep, KidBoard } from '../../engine/types';
import { kidBoardPages, kidPageSpeech } from '../components/DrillBoard';
import { WorldCheckResult } from '../screens/WorldCheckScreen';
import { measure, roundScreens } from './budget-screens';

describe('round 2 in kid mode: one mark per page, option tiles, alt boards, label counting, the world check result', () => {
  const LABELS: Record<string, string> = { must: 'Must be true', might: 'Might be true', cant: 'Can’t be true', yes: 'Yes', no: 'No' };
  const mark = (id: string, label: string, ids: string[], answer: string, given = false): DrillMark => ({ id, label, options: ids.map((o) => ({ id: o, label: LABELS[o] })), answer, given, why: {} });
  /** A board of rows: a shown row, a row with two marks to tap (word options, then a yes/no pair), a row with one. */
  const STEP: DrillStep = {
    id: 'kb',
    title: 'Mark the clues',
    body: ['Mark each clue.'],
    done: 'All marked.',
    scene: { kind: 'text', lines: ['Mo is taller than Pia.'] },
    rows: [
      { id: 'r0', label: 'The shown case', marks: [mark('g', 'Given', ['yes', 'no'], 'yes', true)] },
      { id: 'r1', label: 'Mo and Pia', marks: [mark('a', 'Is Mo first?', ['must', 'might', 'cant'], 'might'), mark('b', 'Is Pia last?', ['yes', 'no'], 'no')] },
      { id: 'r2', label: 'Gus', marks: [mark('c', 'Is Gus first?', ['must', 'might', 'cant'], 'cant')] },
    ],
  };
  const KB: KidBoard = {
    line: 'Look at each one.',
    rows: [{}, { label: 'Mo and Pia', art: 'line-compare', marks: [{ label: 'Mo first?' }, {}] }, { label: '', marks: [{ art: 'line-front' }] }],
    options: { must: { art: 'line-must', word: 'Must' }, might: { art: 'line-might', word: 'Might' } },
  };
  const board = (kid: KidBoard, startRow = 0, startMark = 0, mode: KidMode | null = G1) => html(kidWrap(h(DrillBoard, { step: STEP, kid, startRow, startMark, readAloud: true, onDone: noop }), mode));

  it('a board marks one mark per page, row by row and mark by mark: the line, the row label and picture, the mark’s label', () => {
    expect(kidBoardPages(STEP)).toEqual([{ row: 1, mark: 0 }, { row: 1, mark: 1 }, { row: 2, mark: 0 }]);
    const first = board(KB);
    expect(visibleText(first)).toBe('Look at each one. Mo and Pia Mo first? Must Might Can’t be true Check');
    expect(first).toContain('data-picto="line-compare"');
    expect(first).not.toContain('Is Pia last?');
    // The row's second mark has no kid label: it shows its own label, with the check and cross tiles of its pair.
    const second = board(KB, 0, 1);
    expect(visibleText(second)).toBe('Look at each one. Mo and Pia Is Pia last? Check');
    expect(second).toContain('data-tile="yes"');
    expect(second).toMatch(/aria-label="No"[^>]*data-tile="no"|data-tile="no"[^>]*aria-label="No"/);
    // A row label of '' draws nothing; a mark with only a picture is named by its picture.
    const third = board(KB, 1);
    expect(visibleText(third)).toBe('Look at each one. Must Might Can’t be true Check');
    expect(third).not.toContain('kid-row-label');
    expect(third).toContain(`aria-label="${PICTO_WORDS['line-front']}"`);
    // With no words on the page, the tiles are named by the mark's own label (for screen readers only).
    const srId = /<span class="play-sr" id="([^"]+)">Is Gus first\?<\/span>/.exec(third)?.[1];
    expect(srId).toBeTruthy();
    expect(third).toContain(`aria-labelledby="${srId}"`);
    // Read aloud: the board's line, the row's label and the mark's label of the page.
    const pages = kidBoardPages(STEP);
    expect(kidPageSpeech(KB, STEP, pages[0])).toEqual(['Look at each one.', 'Mo and Pia.', 'Mo first?']);
    expect(kidPageSpeech(KB, STEP, pages[1])).toEqual(['Look at each one.', 'Mo and Pia.', 'Is Pia last?']);
    expect(kidPageSpeech(KB, STEP, pages[2])).toEqual(['Look at each one.']);
    // Classic play keeps the whole board: the body, every row and every mark with its words.
    const classic = visibleText(board(KB, 0, 0, null));
    for (const t of ['Mark each clue.', 'Is Mo first?', 'Is Pia last?', 'Is Gus first?', 'Must be true', 'Check my marks']) expect(classic).toContain(t);
    expect(classic).not.toContain('Look at each one.');
  });

  it('option tiles draw a picture with at most one word, are announced by the option’s label, and an option without a picture prints its label', () => {
    const out = board(KB);
    expect(out).toMatch(/aria-label="Must be true"[^>]*data-tile="must"/);
    expect(out).toMatch(/aria-label="Might be true"[^>]*data-tile="might"/);
    expect(out).toContain('data-picto="line-must"');
    expect(out).toContain('data-picto="line-might"');
    expect(out).toMatch(/data-tile="cant"[^>]*><span class="kid-tile-word">Can’t be true<\/span>/);
    // Without kid pictures, word options keep their word buttons.
    expect(visibleText(board({ ...KB, options: undefined }))).toBe('Look at each one. Mo and Pia Mo first? Must be true Might be true Can’t be true Check');
  });

  it('a kid board can draw the step’s own scene above the row', () => {
    expect(visibleText(board({ ...KB, scene: 'scene' }))).toContain('Look at each one. Mo is taller than Pia. Mo and Pia');
    expect(visibleText(board(KB))).not.toContain('Mo is taller than Pia.');
  });

  it('an alt board renders in place of its step in kid mode (and in the budget tool); classic play never sees it', () => {
    const alt: KidBoard = { line: 'Tap yes or no.', alt: { ...STEP, rows: [{ id: 'x1', label: 'Is it a cat?', marks: [mark('x', 'Cat?', ['yes', 'no'], 'yes')] }] } };
    expect(visibleText(board(alt))).toBe('Tap yes or no. Is it a cat? Check');
    const classic = visibleText(board(alt, 0, 0, null));
    expect(classic).toContain('Is Mo first?');
    expect(classic).not.toContain('Is it a cat?');
    // The budget tool: one page per mark to tap, named by its row; an alt board's own pages.
    const lesson = (b: KidBoard) => ({ ...l1, drill: [STEP], kid: { ...L1_KID, board: [b] } });
    const boards = (b: KidBoard) => roundScreens(lesson(b), stop1, G1).filter((s) => s.what.startsWith('board'));
    expect(boards(KB).map((s) => s.what)).toEqual(['board 1 row 1', 'board 1 row 1', 'board 1 row 2']);
    expect(boards(KB)[1].text).toContain('Is Pia last?');
    const altPages = boards(alt);
    expect(altPages.map((s) => s.what)).toEqual(['board 1']);
    expect(altPages[0].text).toContain('Is it a cat?');
  });

  it('a grid’s names and caption count as labels: a 3 by 3 grid adds no sentences, and a digit alone is a word', () => {
    const yn = (id: string) => mark(id, id, ['yes', 'no'], 'yes');
    const grid: DrillStep = {
      id: 'g', title: 'Fill the grid', body: ['Use the clues.'], done: 'Done.', columns: ['Apple', 'Pear', 'Plum'], caption: 'Snacks',
      rows: ['Mia', 'Leo', 'Ava'].map((name, r) => ({ id: `g${r}`, label: name, marks: [0, 1, 2].map((c) => yn(`g${r}${c}`)) })),
    };
    const s = measure('grid', 'board', html(kidWrap(h(DrillBoard, { step: grid, kid: { line: 'Fill the grid.' }, readAloud: true, onDone: noop }))));
    expect(s.text).toBe('Fill the grid. Snacks Apple Pear Plum Mia Leo Ava Check');
    expect(s.sentences).toBe(1);
    const digits = measure('t', 'digits', '<table><tr><th>1</th><th>2</th></tr></table>');
    expect(digits.words).toBe(2);
    expect(digits.sentences).toBe(0);
  });

  it('the world check result in kid mode: “Not yet.”, “Play these again.” and a number tile per missed round, in the band’s budget even with every round missed; a pass: “You built it!”', () => {
    for (const g of GRADES.filter((x) => ['g1', 'g2', 'g3'].includes(x.id))) {
      const mode = kidModeFor(g.id);
      for (const w of g.worlds) {
        for (const missed of [[w.rounds[0]], [...w.rounds]]) {
          const out = html(kidWrap(h(WorldCheckResult, { world: w, result: { worldId: w.id, items: [], records: [], passed: false, missed }, readAloud: true, onLearnAgain: noop, onDone: noop }), mode));
          const s = measure(w.id, 'world check result', out);
          expect(s.text).toBe(`Not yet. Play these again. ${missed.map((id) => w.rounds.indexOf(id) + 1).join(' ')}`);
          expect(s.words, s.text).toBeLessThanOrEqual(g.budget.words);
          expect(s.sentences, s.text).toBeLessThanOrEqual(g.budget.sentences ?? Infinity);
          expect(s.longest, s.text).toBeLessThanOrEqual(g.budget.sentence);
          expect(out).toContain('data-picto="question"');
          expect(out).toContain('aria-label="Back to the map"');
          // Each tile is announced with the round's title and what a tap does.
          for (const id of missed) expect(out).toContain(`aria-label="Round ${w.rounds.indexOf(id) + 1}: ${lessonById(id)!.title}. Learn it again."`);
          // No list of missed questions.
          expect(out).not.toContain('play-missed-list');
        }
        const passed = html(kidWrap(h(WorldCheckResult, { world: w, result: { worldId: w.id, items: [], records: [], passed: true, missed: [] }, readAloud: true, onLearnAgain: noop, onDone: noop }), mode));
        expect(visibleText(passed)).toBe('You built it! Back to the map');
        expect(passed).toContain(`aria-label="${w.title} ${PICTO_WORDS[w.building]}, built"`);
        expect(passed.match(/<button[^>]*kid-big-btn/g)).toHaveLength(1);
      }
    }
    // Classic play keeps the full result.
    const w = GRADES[0].worlds[0];
    const classic = visibleText(html(h(WorldCheckResult, { world: w, result: { worldId: w.id, items: [], records: [], passed: false, missed: [w.rounds[0]] }, readAloud: true, onLearnAgain: noop, onDone: noop })));
    expect(classic).toContain('Not yet · 0 of 0');
    expect(classic).toContain('Round to play again');
  });

  it('an element marked data-label counts as words, never as a sentence (a line-up’s spot numbers and end words)', () => {
    const s = measure('x', 'spots', '<ol><li><span class="play-slot-label" data-label=""><span>1</span><span>Tallest</span></span><button>Mo</button></li><li><span data-label=""><span>2</span></span></li></ol>');
    expect(s.words).toBe(4);
    expect(s.sentences).toBe(0);
    const t = measure('x', 'plain', '<ol><li><span><span>1</span><span>Tallest</span></span></li></ol>');
    expect(t.sentences).toBe(1);
  });

  it('a check in kid mode shows no note over its first question; classic play keeps it', () => {
    const items: Item[] = [{ ...firstItem(), id: 'wc-1' }];
    const check = (mode: KidMode | null) => seen(kidWrap(h(CheckRunner, { stop: stop1, kind: 'pass', items, timeLimit: null, readAloud: true, note: 'Every answer must be right.', onFinish: noop, onExit: noop }), mode));
    expect(check(G1)).not.toContain('Every answer must be right.');
    expect(check(null)).toContain('Every answer must be right.');
  });
});

// ---------- round 2: items in kid mode ----------

describe('round 2 in kid mode: kid scenes, picture tile words, plain cards, quiet help, line-ups, alternate items', () => {
  const card = (id: string, shape: 'circle' | 'square' | 'triangle', color: 'red' | 'blue' | 'yellow'): T.Thing => ({ id, shape, color, size: 'big' });
  const CARDS = [card('c1', 'circle', 'red'), card('c2', 'square', 'blue'), card('c3', 'triangle', 'yellow')];
  const BASE = { stop: 2, lesson: 's2.l2', skill: 's2.r2-test', explain: 'The red one is the circle.' };
  const KID = { prompt: 'Which is red?', nope: 'Look again.' };
  /** A picture-tile item over a row of three shape cards. */
  const pick = (over: Partial<T.ChooseItem> = {}): T.ChooseItem => ({
    ...BASE,
    id: 'r2-choose',
    kind: 'choose',
    prompt: 'Which card in this row of cards is the red one?',
    scene: { kind: 'things', things: CARDS },
    choices: [
      { id: 'a', label: 'Big red circle', art: 'card-big-red-circle' },
      { id: 'b', label: 'Big blue square', art: 'card-big-blue-square' },
    ],
    answer: 'a',
    kid: KID,
    ...over,
  });
  const learnHtml = (it: Item, mode: KidMode | null = G1) => html(kidWrap(h(ItemView, { item: it, mode: 'learn', readAloud: true, onDone: noop }), mode));

  it('a kid scene of each kind draws in place of the classic scene; classic play keeps the classic scene', () => {
    const pictos = pick({ kid: { ...KID, scene: { kind: 'pictos', rows: [[{ art: 'cat', word: 'Cat' }, { art: 'line-next' }, { art: 'dog', word: 'Dog' }]] } } });
    const p = learnHtml(pictos);
    expect(p).toContain('kid-pictos');
    expect(p).toContain('data-picto="cat"');
    expect(p).toContain('data-picto="line-next"');
    expect(p).toContain('aria-label="Cat"');
    expect(visibleText(p)).toBe('Which is red? Cat Dog Big red circle Big blue square Check');
    expect(p).not.toContain('play-things-pos');
    expect(p).not.toContain('Cards, from first to last');
    // With `keep`, the pictograms draw above the classic scene.
    const kept = learnHtml(pick({ kid: { ...KID, scene: { kind: 'pictos', keep: true, rows: [[{ art: 'cat', word: 'Cat' }]] } } }));
    expect(kept).toContain('kid-pictos');
    expect(kept).toContain('Cards, from first to last');
    expect(kept.indexOf('kid-pictos')).toBeLessThan(kept.indexOf('Cards, from first to last'));
    // 'things': the item's cards as plain faces, no position numbers and no names to read.
    const things = learnHtml(pick({ kid: { ...KID, scene: { kind: 'things' } } }));
    expect(things).toContain('kid-things');
    expect(things.match(/class="play-thing"/g)).toHaveLength(3);
    expect(things).not.toContain('play-things-pos');
    expect(visibleText(things)).toBe('Which is red? Big red circle Big blue square Check');
    // 'none': no picture at all.
    const none = learnHtml(pick({ kid: { ...KID, scene: { kind: 'none' } } }));
    expect(none).not.toContain('play-scene');
    expect(none).not.toContain('class="play-thing"');
    // Without a kid scene, kid mode draws the classic scene as before.
    expect(learnHtml(pick())).toContain('Cards, from first to last');
    // Classic play ignores the kid scene.
    const classic = learnHtml(pictos, null);
    expect(classic).not.toContain('kid-pictos');
    expect(classic).toContain('Cards, from first to last');
    expect(visibleText(classic)).toContain('Which card in this row of cards is the red one?');
    // Read aloud: the kid prompt, the pictures by their words (or names), then the answers by their labels.
    expect(kidPlay2.kidItemSpeech(pictos)).toEqual(['Which is red?', `Cat, ${PICTO_WORDS['line-next']}, Dog.`, 'Big red circle, Big blue square.']);
    expect(kidPlay2.kidItemSpeech(pick({ kid: { ...KID, scene: { kind: 'none' } } }))).toEqual(['Which is red?', 'Big red circle, Big blue square.']);
    expect(kidPlay2.kidThingsOf(pick())).toEqual(CARDS);
  });

  it('a picture tile prints its kid word (or nothing for an empty word) and is announced and read by its label', () => {
    const worded = pick({ scene: undefined, choices: [{ id: 'a', label: 'Big red circle', art: 'card-big-red-circle', word: 'Red' }, { id: 'b', label: 'Big blue square', art: 'card-big-blue-square', word: '' }] });
    const out = learnHtml(worded);
    expect(visibleText(out)).toBe('Which is red? Red Check');
    expect(out).toMatch(/aria-label="Big red circle"[^>]*data-tile="a"/);
    expect(out).toMatch(/aria-label="Big blue square"[^>]*data-tile="b"/);
    expect(out).toContain('<span class="kid-tile-word" aria-hidden="true">Red</span>');
    // Without a word the tile prints its label, and is still named by it.
    const plain = learnHtml(pick({ scene: undefined }));
    expect(visibleText(plain)).toBe('Which is red? Big red circle Big blue square Check');
    expect(plain).toMatch(/aria-label="Big red circle"[^>]*data-tile="a"/);
    // Read aloud by the labels, never by the word or the picture's name.
    expect(kidPlay2.kidItemSpeech(worded)).toEqual(['Which is red?', 'Big red circle, Big blue square.']);
    // Classic play ignores the word: word buttons with the labels.
    const classic = visibleText(learnHtml(worded, null));
    expect(classic).toContain('Big red circle');
    expect(classic).toContain('Big blue square');
    expect(classic).not.toContain('Which is red?');
  });

  it('tap, multi and count items in kid mode: no help line and no count on screen, plain cards; classic play keeps them', () => {
    const tap: T.TapAllItem = { ...BASE, id: 'r2-tap', kind: 'tapall', prompt: 'Tap every red card.', scene: { kind: 'things', things: CARDS }, things: CARDS, answer: ['c1'], kid: { prompt: 'Tap the red ones.', nope: 'Look again.' } };
    const kidTap = learnHtml(tap);
    const t = visibleText(kidTap);
    expect(t).not.toContain('Tap every card that fits.');
    expect(t).not.toContain('chosen');
    expect(t).not.toMatch(/\b[123]\b/);
    expect(kidTap).toContain('<p class="play-sr">Tap every card that fits. Tap a card again to undo.</p>');
    expect(kidTap).toContain('<p class="play-sr">0<!-- --> chosen</p>');
    expect(t).toBe('Tap the red ones. Check');
    const classicTap = visibleText(learnHtml(tap, null));
    expect(classicTap).toContain('Tap every card that fits. Tap a card again to undo.');
    expect(classicTap).toContain('0 chosen');
    expect(classicTap).toMatch(/\b1 2 3\b/);

    const multi: T.MultiItem = { ...BASE, id: 'r2-multi', kind: 'multi', prompt: 'Which cards must you turn over?', choices: [{ id: 'e', label: 'E' }, { id: 'k', label: 'K' }], answer: ['e'], kid: { prompt: 'Which ones?', nope: 'Look again.' } };
    const m = visibleText(learnHtml(multi));
    expect(m).toBe('Which ones? E K Check');
    const classicMulti = visibleText(learnHtml(multi, null));
    expect(classicMulti).toContain('Tap one to choose it. Tap it again to undo.');
    expect(classicMulti).toContain('Tap to choose');

    const count: T.NumberItem = { ...BASE, id: 'r2-count', kind: 'number', prompt: 'How many cards are in the row?', scene: { kind: 'things', things: CARDS }, answer: 3, digits: 1, kid: { prompt: 'How many?', nope: 'Count again.' } };
    const kidCount = learnHtml(count);
    const c = visibleText(kidCount);
    expect(kidCount).toContain('kid-things');
    expect(kidCount).not.toContain('play-things-pos');
    expect(c).not.toContain('Tap the keys');
    expect(kidCount).toContain('<p class="play-sr">Tap the keys, or type on a keyboard. Then tap OK or Check.</p>');
    expect(c).toMatch(/^How many\? – 1 2 3 4 5 6 7 8 9 0 OK Check$/);
    const classicCount = visibleText(learnHtml(count, null));
    expect(classicCount).toContain('Tap the keys, or type on a keyboard. Then tap OK or Check.');
    expect(learnHtml(count, null)).toContain('play-things-pos');
  });

  it('a logic grid in kid mode keeps its tap help for screen readers only; a review item draws no faded frame', () => {
    const grid: T.AssignItem = {
      ...BASE,
      id: 'r2-grid',
      kind: 'assign',
      layout: 'grid',
      prompt: 'Who has which pet?',
      people: [{ id: 'p1', label: 'Mia' }, { id: 'p2', label: 'Leo' }],
      categories: [{ id: 'pet', label: 'Pet', values: [{ id: 'cat', label: 'Cat' }, { id: 'dog', label: 'Dog' }], oneEach: true }],
      answer: { p1: { pet: 'cat' }, p2: { pet: 'dog' } },
      kid: { prompt: 'Who has the cat?', nope: 'Look again.' },
    };
    const kidGrid = learnHtml(grid);
    expect(visibleText(kidGrid)).not.toContain('Tap a box once');
    expect(kidGrid).toMatch(/<p class="play-sr">Tap a box once for/);
    expect(visibleText(learnHtml(grid, null))).toContain('Tap a box once');
    // The faded frame: kept on the faded example itself (a Do item), not drawn on a review or transfer item in kid mode.
    const framed = (phase: T.Phase) => pick({ id: `r2-frame-${phase}`, phase, frame: 'The red card is the ___.' });
    expect(learnHtml(framed('review'))).not.toContain('play-frame');
    expect(learnHtml(framed('transfer'))).not.toContain('play-frame');
    expect(learnHtml(framed('do'))).toContain('play-frame');
    expect(learnHtml(framed('review'), null)).toContain('play-frame');
  });

  it('a line-up in kid mode: no tap help on screen, an empty spot is a dashed box with no “Empty”, spot numbers and end labels stay', () => {
    const line: T.OrderItem = {
      ...BASE,
      id: 'r2-order',
      kind: 'order',
      prompt: 'Put them in order, tallest first.',
      names: [{ id: 'mo', label: 'Mo' }, { id: 'pia', label: 'Pia' }, { id: 'gus', label: 'Gus' }],
      clues: [{ t: 'first', a: 'mo' }, { t: 'before', a: 'pia', b: 'gus' }],
      answer: ['mo', 'pia', 'gus'],
      firstLabel: 'Tallest',
      lastLabel: 'Shortest',
      kid: { prompt: 'Line them up.', nope: 'Look again.' },
    };
    const out = learnHtml(line);
    const t = visibleText(out);
    expect(t).toBe('Line them up. Mo Pia Gus 1 Tallest 2 3 Shortest Check');
    expect(t).not.toContain('Empty');
    expect(t).not.toContain('Tap a name');
    expect(out.match(/kid-slot-empty/g)).toHaveLength(3);
    expect(out).toContain('<span class="play-sr">Empty</span>');
    expect(out).toContain('<p class="play-sr">Tap a name to put it in the next open spot. Tap it again to take it out.</p>');
    const classic = visibleText(learnHtml(line, null));
    expect(classic).toContain('Tap a name to put it in the next open spot.');
    expect(classic).toContain('1 Tallest Empty 2 Empty 3 Shortest Empty');
  });

  it('kidItemOf swaps in the kid-only alternate in kid mode, keeping the outer id and tags; otherwise the same object', () => {
    const alt: T.ChooseItem = {
      ...BASE,
      id: 'alt-id',
      kind: 'choose',
      prompt: 'Is “Cats can fly.” a statement?',
      tags: ['alt-tag'],
      choices: [{ id: 'yes', label: 'A statement' }, { id: 'no', label: 'Not a statement' }],
      answer: 'yes',
      kid: { prompt: 'A statement?', nope: 'It can be false.', yes: 'False still counts.' },
    };
    const outer = pick({ id: 'outer-1', tags: ['which'], scene: undefined, kid: { ...KID, alt } });
    const swapped = kidPlay2.kidItemOf(outer, G1);
    expect(swapped).not.toBe(outer);
    expect(swapped.id).toBe('outer-1');
    expect(swapped.tags).toEqual(['which']);
    expect(swapped.kind).toBe('choose');
    expect(swapped.kid!.prompt).toBe('A statement?');
    expect(swapped.prompt).toBe(alt.prompt);
    // The same object every time (no re-render churn), and nothing changes in classic play or without an alternate.
    expect(kidPlay2.kidItemOf(outer, G1)).toBe(swapped);
    expect(kidPlay2.kidItemOf(outer, null)).toBe(outer);
    const bare = pick();
    expect(kidPlay2.kidItemOf(bare, G1)).toBe(bare);
    const list = [bare];
    expect(kidPlay2.kidItemsOf(list, G1)).toBe(list);
    expect(kidPlay2.kidItemsOf([bare, outer], G1)[1]).toBe(swapped);
    // An outer item without tags gives an alternate without tags.
    expect('tags' in kidPlay2.kidItemOf(pick({ id: 'outer-2', kid: { ...KID, alt } }), G1)).toBe(false);
    // Read aloud: the alternate's kid prompt and its answers.
    expect(kidPlay2.kidItemSpeech(outer)).toEqual(['A statement?', 'Yes, or no?']);
    expect(kidPlay2.kidItemSpeech(swapped)).toEqual(['A statement?', 'Yes, or no?']);
    // A lesson's try (LearnItem) and a check (CheckRunner) draw the alternate in kid mode, the classic item otherwise.
    const tryIt = (mode: KidMode | null) => seen(kidWrap(h(learn2.LearnItem, { stop: stop1, item: outer, seed: 1, readAloud: true, onDone: noop }), mode));
    expect(tryIt(G1)).toBe('A statement? Check');
    expect(html(kidWrap(h(learn2.LearnItem, { stop: stop1, item: outer, seed: 1, readAloud: true, onDone: noop })))).toContain('data-tile="yes"');
    expect(tryIt(null)).toContain('Which card in this row of cards is the red one?');
    const check = (mode: KidMode | null) => seen(kidWrap(h(CheckRunner, { stop: stop1, kind: 'pass', items: [outer], timeLimit: null, readAloud: true, onFinish: noop, onExit: noop }), mode));
    expect(check(G1)).toContain('A statement?');
    expect(check(G1)).not.toContain('Which is red?');
    expect(check(null)).toContain('Which card in this row of cards is the red one?');
    // Placement questions of Grades 1 to 3 are drawn in kid mode; from Grade 4 up they stay classic.
    expect(kid2.placementKid('g1')?.grade).toBe('g1');
    expect(kid2.placementKid('g3')?.budget).toEqual(GRADES.find((g) => g.id === 'g3')!.budget);
    expect(kid2.placementKid('g4')).toBeNull();
  });

  it('the word budget measures the alternate: its quiz screen, its miss line, its Show me and its Yes! panel', () => {
    const alt: T.ChooseItem = {
      ...BASE,
      id: 'alt-id',
      kind: 'choose',
      prompt: 'Is “Cats can fly.” a statement?',
      choices: [{ id: 'yes', label: 'A statement' }, { id: 'no', label: 'Not a statement' }],
      answer: 'yes',
      kid: { prompt: 'A statement?', nope: 'It can be false.', yes: 'False still counts.', show: { label: '“Dogs can sing.”', note: 'False, still a statement.' } },
    };
    const outer = pick({ id: 'outer-1', kid: { ...KID, nope: 'Look at the red one.', alt } });
    const lesson = { ...l1, practice: () => [outer] };
    const screens = budget2.roundScreens(lesson, stop1, G1, [1]);
    const at = (what: string) => screens.find((x) => x.what.startsWith(what))!.text;
    expect(at('quiz item 1')).toBe('Round 1 of 4 A statement? Check');
    expect(at('miss feedback')).toContain('It can be false.');
    expect(at('Show me')).toContain('“Dogs can sing.”');
    expect(at('right answer')).toContain('False still counts.');
    expect(screens.map((x) => x.text).join(' ')).not.toContain('Which is red?');
    // Classic screens never see it.
    expect(budget2.roundScreens(lesson, stop1, null, [1]).find((x) => x.what.startsWith('quiz item 1'))!.text).toContain('Which card in this row of cards is the red one?');
  });

  it('more yes/no pairs: Matches or Breaks, Fits or Does not fit, Right or Not right, Same or Different', () => {
    expect(yesNoOf([{ id: 'breaks' }, { id: 'matches' }])).toEqual({ yes: 'matches', no: 'breaks' });
    expect(yesNoOf([{ id: 'same' }, { id: 'different' }])).toEqual({ yes: 'same', no: 'different' });
    const fits = [{ id: 'f', label: 'Fits' }, { id: 'n', label: 'Does not fit' }];
    expect(yesNoOf(fits)).toEqual({ yes: 'f', no: 'n' });
    expect(kidPlay2.yesNoSpeech({ yes: 'f', no: 'n' }, fits)).toBe('Fits, or does not fit?');
    expect(yesNoOf([{ id: 'x', label: 'Not right' }, { id: 'y', label: 'Right' }])).toEqual({ yes: 'y', no: 'x' });
    expect(yesNoOf([{ id: 'x', label: 'Same' }, { id: 'y', label: 'Different' }])).toEqual({ yes: 'x', no: 'y' });
    expect(kidPlay2.yesNoSpeech({ yes: 'matches', no: 'breaks' })).toBe('Matches, or breaks?');
    // Anything else keeps its word buttons.
    expect(yesNoOf([{ id: 'a', label: 'Fits' }, { id: 'b', label: 'Breaks it' }])).toBeNull();
    expect(yesNoOf([{ id: 'a', label: 'Same' }, { id: 'b', label: 'Different' }, { id: 'c', label: 'Both' }])).toBeNull();
  });

  it('a picture-only hint reads the picture’s own words, never the case’s note', () => {
    expect(kidHintSpeech(undefined, { label: 'The gap?', note: 'Yellow: red, yellow repeats.' })).toEqual(['The gap?']);
    expect(kidHintSpeech('Look at the box.', { label: 'The gap?', note: 'Yellow.' })).toEqual(['Look at the box.']);
  });
});
