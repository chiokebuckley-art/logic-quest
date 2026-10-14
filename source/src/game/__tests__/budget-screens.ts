/**
 * Helpers for the word-budget test (kid-budget.test.ts) and the trims report (docs/KID-JOURNEY.md §2 and §4). Not a
 * test file: it renders a round's screens on the server and counts the words a reader can see.
 *
 * What counts: every word of visible text, buttons included, and the play header (in kid mode it reads "Round k of
 * n": 4 words). What does not: the app's nav, text only a screen reader hears (.play-sr, .sr-only, aria labels) and
 * anything hidden. Sentences are counted in the prose of a screen (its lines, prompts and sentences) and in buttons
 * whose words end like a sentence (a choice that is a sentence); a label ("Check", "Try again", the header's "Round 1
 * of 4", a grid's row and column names, a caption) is words, not a sentence. A digit alone ("1", "2") is a word.
 */
import { Fragment, createElement as h, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { Answer, Item, LessonDef, StopDef } from '../../engine/types';
import { GRADES, gradeById, roundsOf, worldOf, type GradeId } from '../../content/grades';
import { stopById, stopLabel } from '../../content/stops';
import { KidModeContext, type KidMode } from '../kidMode';
import { kidItemOf } from '../kidPlay';
import { lessonById } from '../observatory';
import { explanationFor } from '../explanation';
import { IdeaCards } from '../components/IdeaCards';
import { DrillBoard, kidBoardPages, kidBoardStep, kidPaged } from '../components/DrillBoard';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { PlayHeader } from '../components/ItemView';
import { KidHint, KidNotYet, KidRight, KidStarScreen, roundTitle } from '../components/KidPlay';
import { PlayIcon } from '../components/ThingCard';
import { LessonRunner, lessonStages } from '../components/LessonRunner';
import { practiceFor } from '../../engine/drill';
import { createRng } from '../../engine/rng';
import { longestSentence, sentences } from '../../engine/readability';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

const decode = (s: string) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

/** Is this opening tag the start of a part nobody sees? */
function unseen(tag: string, attrs: string): boolean {
  if (tag === 'nav' || tag === 'title' || tag === 'style' || tag === 'script' || tag === 'template') return true;
  if (/\shidden(=|\s|$|>)/.test(` ${attrs}`)) return true;
  const cls = /\bclass="([^"]*)"/.exec(attrs)?.[1] ?? '';
  return /(^|\s)(play-sr|sr-only|nav)(\s|$)/.test(cls);
}

/** The text a reader sees in server-rendered HTML, with what nobody sees (see the file note) left out. */
export function visibleText(html: string): string {
  const out: string[] = [];
  const stack: { tag: string; drop: boolean }[] = [];
  const dropping = () => stack.some((x) => x.drop);
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[4] !== undefined) {
      if (!dropping()) out.push(decode(m[4]));
      continue;
    }
    const tag = m[1].toLowerCase();
    if (m[0].startsWith('</')) {
      // Close the nearest open element with this name.
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag === tag) {
          stack.length = k;
          break;
        }
      }
      out.push(' ');
      continue;
    }
    out.push(' ');
    if (m[3] === '/' || VOID.has(tag)) continue;
    stack.push({ tag, drop: unseen(tag, m[2]) });
  }
  return out.join('').replace(/\s+/g, ' ').trim();
}

/** Words: every space-separated piece with a letter or a digit in it ("can’t" is one word, "·" is none). */
export const countWords = (text: string): number => text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

/** Elements that start a new block of text (anything else, like a span or strong, runs inside one). */
const BLOCK = new Set(['p', 'div', 'section', 'header', 'footer', 'article', 'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'blockquote', 'button', 'form', 'label', 'table', 'caption', 'tr', 'td', 'th', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'details', 'summary', 'fieldset', 'legend']);
/**
 * Blocks whose words are labels, not sentences: buttons, the play header's title, a table's header cells (a grid's
 * row and column names) and captions. Any element with a data-label attribute is a label too (a line-up's spot
 * numbers and end words).
 */
const LABEL = new Set(['button', 'h1', 'summary', 'legend', 'th', 'caption', 'figcaption']);

/** The visible text of server-rendered HTML in blocks: each with its text and whether it is a label (a button). */
export function visibleBlocks(html: string): { text: string; label: boolean }[] {
  const blocks: { text: string; label: boolean }[] = [];
  const stack: { tag: string; drop: boolean; id: number; label: boolean }[] = [];
  let ids = 0;
  let cur: { id: number; label: boolean; parts: string[] } | null = null;
  const flush = () => {
    if (cur) {
      const text = cur.parts.join('').replace(/\s+/g, ' ').trim();
      if (text) blocks.push({ text, label: cur.label });
    }
    cur = null;
  };
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[4] !== undefined) {
      if (stack.some((x) => x.drop)) continue;
      // The nearest block around this text, and whether any block around it is a label.
      let blockId = 0;
      let label = false;
      for (let k = stack.length - 1; k >= 0; k--) {
        // An element marked data-label (a line-up's spot numbers and end words) is a label wherever it sits.
        if (stack[k].label) label = true;
        if (!BLOCK.has(stack[k].tag)) continue;
        if (!blockId) blockId = stack[k].id;
        if (LABEL.has(stack[k].tag)) label = true;
      }
      if (!cur || cur.id !== blockId) {
        flush();
        cur = { id: blockId, label, parts: [] };
      }
      cur.parts.push(decode(m[4]));
      continue;
    }
    const tag = m[1].toLowerCase();
    if (BLOCK.has(tag)) flush();
    else cur?.parts.push(' ');
    if (m[0].startsWith('</')) {
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag === tag) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    if (m[3] === '/' || VOID.has(tag)) continue;
    stack.push({ tag, drop: unseen(tag, m[2]), id: ++ids, label: /\sdata-label(?=[\s=>/]|$)/.test(m[2]) });
  }
  flush();
  return blocks;
}

/** One screen: where it is, how many words it shows, its sentences (count and longest), and the text itself. */
export interface Screen {
  lesson: string;
  what: string;
  words: number;
  /** Sentences on the screen: its prose, and buttons that end like a sentence (labels like "Check" are not). */
  sentences: number;
  /** Words in its longest sentence, and that sentence. */
  longest: number;
  longestText: string;
  text: string;
}

/** Count a rendered screen. */
export function measure(lesson: string, what: string, html: string): Screen {
  const text = visibleText(html);
  // Prose counts every sentence; a button or the header only a sentence that ends like one (a choice that is a
  // sentence, "Ten is more than seven."), never a label ("Check", "Try again", "Round 1 of 4").
  const ss = visibleBlocks(html).flatMap((b) => sentences(b.text).filter((x) => !b.label || /[.!?]$/.test(x)));
  const long = ss.map((x) => longestSentence(x)).reduce((a, b) => (b.words > a.words ? b : a), { words: 0, sentence: '' });
  return { lesson, what, words: countWords(text), sentences: ss.length, longest: long.words, longestText: long.sentence, text };
}

const screen = (lesson: string, what: string, el: ReactElement): Screen => measure(lesson, what, renderToString(el));

const noop = () => {};

/** The kid mode of a band, for rendering (no auto read-aloud on a server). */
export const kidModeFor = (band: GradeId): KidMode => ({ grade: band, budget: gradeById(band).budget, autoRead: false });

/** A wrong answer to an item, to open its miss feedback. */
export function wrongAnswer(item: Item): Answer {
  switch (item.kind) {
    case 'choose': return { kind: 'choose', id: item.choices.find((c) => c.id !== item.answer)!.id };
    case 'tapall': return { kind: 'tapall', ids: item.answer.length ? [] : [item.things[0].id] };
    case 'multi': return { kind: 'multi', ids: item.answer.length ? [] : [item.choices[0].id] };
    case 'number': return { kind: 'number', value: item.answer + 1 };
    case 'order': return { kind: 'order', ids: [...item.answer].reverse() };
    case 'assign': {
      const values = JSON.parse(JSON.stringify(item.answer)) as Record<string, Record<string, string>>;
      const p = item.people[0].id;
      const c = item.categories[0];
      values[p][c.id] = c.values.find((v) => v.id !== values[p][c.id])!.id;
      return { kind: 'assign', values };
    }
  }
}

/** The first quiz item of a lesson for a seed (the planned quiz's first try). */
export const firstQuizItem = (lesson: LessonDef, seed: number): Item => practiceFor(lesson, createRng(seed))[0];

/** The round's place in its world on the grade map ("Round k of n"), or null for a lesson the map does not hold. */
export function roundOf(lessonId: string): { k: number; n: number } | null {
  const w = worldOf(lessonId);
  return w ? { k: w.rounds.indexOf(lessonId) + 1, n: w.rounds.length } : null;
}

/** What the Hint button opens for an item in kid mode (as ItemView decides), or null when it shows no hint. */
export function kidHintOf(item: Item): { hint?: string; show?: Item['hintCase'] } | null {
  const k = item.kid;
  if (!k) return null;
  if (k.hint) return { hint: k.hint };
  const show = k.show ?? item.hintCase;
  return item.hint && show ? { show } : null;
}

/** Items that draw the same screens (same kid words, prompt, scene and answers) are rendered once. */
const itemKey = (it: Item): string =>
  JSON.stringify([it.kind, it.kid ?? null, it.kid ? null : it.prompt, it.scene ?? null, it.kind === 'choose' || it.kind === 'multi' ? it.choices.map((c) => [c.id, c.label, c.art, c.word]) : null, it.hint ?? null, it.hintCase ?? null]);

/**
 * Every screen of a round as a reader of `band` sees it, each under its play header: in kid mode for a band in
 * Grades 1 to 3 (header "Round k of n"; its kid cards, kid boards one mark per page (row by row, mark by mark; a
 * board with a kid-only replacement step draws that step), every quiz item of the planned pack for each seed, and
 * for each item its compact miss feedback, the "Show me" picture, the opened hint and the "Yes!" panel; then the star screen and the "Not yet. Try again?" screen), or classic with `kid` null (the classic
 * header; every card, every board, every planned quiz item). `seeds` picks the planned packs to render.
 */
export function roundScreens(lesson: LessonDef, stop: StopDef, kid: KidMode | null, seeds: readonly number[] = [1]): Screen[] {
  const wrap = (el: ReactElement) => (kid ? h(KidModeContext.Provider, { value: kid }, el) : el);
  const round = roundOf(lesson.id) ?? { k: 1, n: 1 };
  const k = stop.lessons.findIndex((l) => l.id === lesson.id);
  const header = kid
    ? h(PlayHeader, { title: roundTitle(round.k, round.n), onBack: noop, backLabel: 'Leave the round' })
    : h(PlayHeader, { over: `${stopLabel(stop)} · Lesson ${k >= 0 ? k + 1 : 1} of ${Math.max(1, stop.lessons.length)}`, title: lesson.title, onBack: noop });
  /** A screen under its play header. */
  const page = (el: ReactElement) => wrap(h('div', { className: 'play-root' }, header, el));
  const out: Screen[] = [];
  const stages = lessonStages(lesson);
  const drill = lesson.drill ?? [];
  for (const st of stages) {
    if (st.kind === 'cards') {
      const cards = lesson.ideas.slice(st.from, st.to + 1);
      const kidCards = kid ? lesson.kid?.cards.slice(st.from, st.to + 1) : undefined;
      cards.forEach((_, c) => {
        out.push(screen(lesson.id, `card ${st.from + c + 1}`, page(h(IdeaCards, { cards, kid: kidCards, startAt: c, readAloud: true, numberFrom: st.from + 1, numberOf: lesson.ideas.length, doneLabel: 'Try it', onDone: noop }))));
      });
    } else {
      const step = drill[st.j];
      const kidBoard = kid ? lesson.kid?.board?.[st.j] : undefined;
      // In kid mode a board draws its kid-only replacement step when it has one, and a board of rows has one page per
      // mark to tap. Pages keep their row's name ("board 2 row 3", or "board 2" for a board with one row to mark), so
      // each mark page of a row is named as that row.
      const drawn = kidBoard ? kidBoardStep(step, kidBoard) : step;
      const paged = !!kidBoard && kidPaged(drawn);
      const pages = paged ? kidBoardPages(drawn) : [];
      const rows = [...new Set(pages.map((p) => p.row))];
      if (!paged) out.push(screen(lesson.id, `board ${st.j + 1}`, page(h(DrillBoard, { step, kid: kidBoard, readAloud: true, doneLabel: 'Next', onDone: noop }))));
      for (const [r, row] of rows.entries()) {
        const marks = pages.filter((p) => p.row === row).length;
        for (let m = 0; m < marks; m++) {
          out.push(screen(lesson.id, `board ${st.j + 1}${rows.length > 1 ? ` row ${r + 1}` : ''}`, page(h(DrillBoard, { step, kid: kidBoard, startRow: r, startMark: m, readAloud: true, doneLabel: 'Next', onDone: noop }))));
        }
      }
    }
  }
  const seen = new Set<string>();
  for (const seed of seeds) {
    const planned = practiceFor(lesson, createRng(seed));
    planned.forEach((given, i) => {
      // In kid mode an item with a kid-only alternate is asked as that alternate (LearnItem swaps it in): its screens
      // are the ones a kid sees and the ones measured.
      const item = kidItemOf(given, kid);
      const key = itemKey(item);
      if (seen.has(key)) return;
      seen.add(key);
      const where = `quiz item ${i + 1} (seed ${seed})`;
      // The lesson's own screen at this try: the header, the goal (stars or sentence) and the item.
      const results = Array.from({ length: i }, () => ({ clean: false, tags: [] as string[] }));
      out.push(screen(lesson.id, where, wrap(h(LessonRunner, { stop, lesson, seed, readAloud: true, round, start: { next: i, firstTry: 0, drilled: true, results }, onAnswer: noop, onComplete: noop, onExit: noop }))));
      if (!kid || !item.kid) return;
      // The compact miss feedback, with the item's own actions under it (as ItemView draws them, at their most: "Try
      // again" and, on a new example after a miss, the "Move on" icon button), then with "Show me" open.
      const model = explanationFor(item, wrongAnswer(item));
      const actions = h(
        Fragment,
        null,
        h('button', { type: 'button', className: 'play-btn play-btn--retry play-btn--grow' }, 'Try again'),
        h('button', { type: 'button', className: 'play-btn play-btn--ghost kid-more-btn', 'aria-label': 'Move on', title: 'Move on' }, h(PlayIcon, { name: 'next', size: 22 })),
      );
      out.push(screen(lesson.id, `miss feedback, ${where}`, page(h(ExplanationPanel, { model, kid: item.kid, readAloud: true, actions }))));
      out.push(screen(lesson.id, `Show me, ${where}`, page(h(ExplanationPanel, { model, kid: item.kid, readAloud: true, actions, kidShowOpen: true }))));
      // The opened hint: its own screen in place of the question.
      const hint = kidHintOf(item);
      if (hint) out.push(screen(lesson.id, `hint, ${where}`, page(h(KidHint, { ...hint, readAloud: true, onClose: noop }))));
      // The right-answer panel: "Yes!", the line and Next.
      out.push(screen(lesson.id, `right answer, ${where}`, page(h(KidRight, { line: item.kid.yes, buttonLabel: 'Next', readAloud: true, onNext: noop }))));
    });
  }
  if (kid) {
    const band = worldOf(lesson.id) ? GRADES.find((g) => g.worlds.some((w) => w.rounds.includes(lesson.id)))!.id : kid.grade;
    out.push(screen(lesson.id, 'star screen', page(h(KidStarScreen, { kind: 'clean', line: lesson.kid?.star, got: 1, of: roundsOf(band).length, readAloud: true, onDone: noop }))));
    out.push(screen(lesson.id, 'not yet screen', page(h(KidNotYet, { readAloud: true, onAgain: noop }))));
  }
  return out;
}

/** Every round of these bands, as [band, lesson, stop]. */
export function roundsIn(bands: readonly GradeId[]): [GradeId, LessonDef, StopDef][] {
  return bands.flatMap((band) =>
    roundsOf(band).map((id) => [band, lessonById(id)!, stopById(id.split('.')[0])!] as [GradeId, LessonDef, StopDef]),
  );
}

/**
 * The trims report (§4): the wordiest screens of Grades 4 to 8, as their players see them (classic), wordiest first.
 * A plain function: the budget test calls it, and anyone can print it with printWordiest().
 */
export function wordiestScreens(limit = 10, bands: readonly GradeId[] = ['g4', 'g5', 'g6', 'g7', 'g8']): (Screen & { band: GradeId; budget: number })[] {
  const all = roundsIn(bands).flatMap(([band, lesson, stop]) =>
    roundScreens(lesson, stop, null).map((s) => ({ ...s, band, budget: gradeById(band).budget.words })),
  );
  return all.sort((a, b) => b.words - a.words || a.lesson.localeCompare(b.lesson)).slice(0, limit);
}

/** Print the trims report: one line per screen (band, lesson, screen, words over the band's budget). */
export function printWordiest(rows = wordiestScreens()): void {
  const lines = rows.map((r) => `${r.band}  ${r.lesson.padEnd(7)} ${r.what.padEnd(28)} ${String(r.words).padStart(4)} words (budget ${r.budget})`);
  console.info(['The wordiest screens of Grades 4 to 8:', ...lines].join('\n'));
}

/** The bands whose rounds draw a kid layer. */
export const YOUNG: readonly GradeId[] = GRADES.filter((g) => !g.budget.strip).map((g) => g.id);
