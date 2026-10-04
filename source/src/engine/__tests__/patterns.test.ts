/**
 * Stop 7, Lesson 1 · Pattern guesses. Answers are re-derived here from what the player sees (the bag in the scene,
 * the sentence in the prompt, the draws in the list), never by calling the function that set the answer.
 */
import { describe, expect, it } from 'vitest';
import { arcadeItem, checkItems, freshItems, lesson } from '../../content/stop7/patterns';
import { checkDrill, marksToTap } from '../drill';
import { EXAMPLE_SCENE, SKINS, TWIN_SCENE, breakItem, chanceItem, dueItem, sureItem, wordFor, wordWhy, type Skin, type SkinId } from '../puzzles/patterns';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { feedbackText, teachStrings } from '../teach';
import type { ChooseItem, Item, Scene, Thing } from '../types';

const SEEDS = Array.from({ length: 250 }, (_, i) => i + 1);

type W = 'must' | 'likely' | 'unlikely' | 'cant';
/** The rule, written again: every one fits, more than half, some but fewer than half, none. Half never happens. */
function word(n: number, total: number): W {
  expect(2 * n, `${n} of ${total} is exactly half`).not.toBe(total);
  if (n === total) return 'must';
  if (n === 0) return 'cant';
  return n > total - n ? 'likely' : 'unlikely';
}
const LABEL: Record<string, W> = { Must: 'must', Likely: 'likely', Unlikely: 'unlikely', 'Can’t': 'cant' };

const choose = (it: Item): ChooseItem => {
  if (it.kind !== 'choose') throw new Error('not a choose item');
  return it;
};
const label = (it: ChooseItem, id: string) => it.choices.find((c) => c.id === id)!.label;

/** Which skin a story is in: its place and its noun both show in the prompt. */
function skinOf(it: Item): Skin {
  const hits = Object.values(SKINS).filter((s) => it.prompt.toLowerCase().includes(s.the) && [s.noun, ...s.kinds.map((k) => k.one)].some((w) => new RegExp(`\\b${w}s?\\b`).test(it.prompt)));
  expect(hits.length, `one skin for: ${it.prompt}`).toBe(1);
  return hits[0];
}

/** The bag as the player sees it: kind index -> count. */
function bagOf(s: Skin, scene: Scene | undefined): number[] {
  const c = [0, 0, 0];
  if (scene?.kind === 'things') {
    for (const t of scene.things) c[s.kinds.findIndex((k) => k.shape === t.shape)]++;
    return c;
  }
  if (scene?.kind !== 'text') throw new Error('a bag needs a text or things scene');
  expect(scene.lines[0]).toBe(`In ${s.the}:`);
  for (const line of scene.lines.slice(1)) {
    const m = line.match(/^(\d+) (.+)$/)!;
    const i = s.kinds.findIndex((k) => k.one === m[2] || k.many === m[2]);
    expect(i, line).toBeGreaterThanOrEqual(0);
    c[i] = Number(m[1]);
  }
  return c;
}

/** “It is likely to be red.” -> the kind and the word. */
function readSentence(s: Skin, text: string): { kind: number; w: W } {
  const forms: [RegExp, W][] = [[/^It must be (.+)\.$/, 'must'], [/^It is likely to be (.+)\.$/, 'likely'], [/^It is unlikely to be (.+)\.$/, 'unlikely'], [/^It can’t be (.+)\.$/, 'cant']];
  for (const [re, w] of forms) {
    const m = text.match(re);
    if (m) return { kind: s.kinds.findIndex((k) => k.is === m[1]), w };
  }
  throw new Error(`cannot read: ${text}`);
}

/** The draws list of a scene: “red, red, red, then blue!” -> ['red','red','red'] and 'blue'. */
function drawsOf(scene: Scene | undefined): { draws: string[]; then?: string } {
  if (scene?.kind !== 'text') throw new Error('draws need a text scene');
  const m = scene.lines[1].match(/^(.*?)(?:, then (.+)!)?$/)!;
  return { draws: m[1].split(', '), then: m[2] };
}

/** Re-derives the right choice of any lesson item from what the player sees, and returns its id. */
function derive(it: ChooseItem): string {
  const s = skinOf(it);
  switch (it.skill) {
    case 's7.pattern-chance': {
      const bag = bagOf(s, it.scene);
      const total = bag.reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThanOrEqual(3);
      expect(total).toBeLessThanOrEqual(12);
      const q = it.prompt.match(/Read the sentence: “The next (\w+) is (.+)\.” Which word fits it\?$/);
      if (q) {
        expect(q[1]).toBe(s.noun);
        const ki = s.kinds.findIndex((k) => k.is === q[2]);
        const w = word(bag[ki], total);
        return it.choices.find((c) => LABEL[c.label] === w)!.id;
      }
      expect(it.prompt).toMatch(/Which sentence about the next \w+ is right\?$/);
      const right = it.choices.filter((c) => {
        const r = readSentence(s, c.label);
        return word(bag[r.kind], total) === r.w;
      });
      expect(right.length, `exactly one true sentence: ${it.prompt}`).toBe(1);
      return right[0].id;
    }
    case 's7.pattern-sure': {
      const { draws, then } = drawsOf(it.scene);
      expect(then).toBeUndefined();
      expect(new Set(draws).size, 'a streak is all one kind').toBe(1);
      const k = s.kinds.find((x) => x.word === draws[0])!;
      // Only the draws seen are sure; “probably” is the good guess.
      const sure = it.choices.filter((c) => c.label === `The ${draws.length} ${s.nouns} ${it.prompt.split(' ')[0]} saw were ${k.are}.` || c.label === `Probably ${k.is}, but a new draw could break the pattern.`);
      expect(sure.length).toBe(1);
      return sure[0].id;
    }
    case 's7.pattern-due': {
      expect(it.conflict).toBe(true);
      const claim = it.prompt.match(/says, “(.+) is due next!”/)!;
      if (it.scene?.kind === 'things' || (it.scene?.kind === 'text' && it.scene.lines[0].startsWith('In '))) {
        const bag = bagOf(s, it.scene);
        const total = bag.reduce((a, b) => a + b, 0);
        const streak = it.prompt.match(/The last (\d+) were all (.+?)\./)!;
        const ki = s.kinds.findIndex((k) => k.are === streak[2]);
        const oi = s.kinds.findIndex((k) => k.is.toLowerCase() === claim[1].toLowerCase());
        expect(oi).not.toBe(ki);
        // The bag is the same after the streak: the streak kind keeps its word.
        const w = word(bag[ki], total);
        const words = { must: 'a must', likely: 'likely', unlikely: 'unlikely', cant: 'impossible' } as const;
        return it.choices.find((c) => c.label.toLowerCase().startsWith(`${s.kinds[ki].is} is still ${words[w]}`.toLowerCase()))!.id;
      }
      return it.choices.find((c) => c.label === `No. Past draws do not change what is in ${s.the}.`)!.id;
    }
    case 's7.pattern-break': {
      const { draws, then } = drawsOf(it.scene);
      expect(new Set(draws).size).toBe(1);
      expect(then, 'a new case came out').toBeDefined();
      expect(then).not.toBe(draws[0]);
      return it.choices.find((c) => c.label === 'No. A streak is a good guess, not a proof.' || c.label === 'A new case can break a pattern.')!.id;
    }
  }
  throw new Error(`unknown skill ${it.skill}`);
}

/** What each wrong pick’s headline must name. */
const GAP: Record<string, RegExp> = {
  all: /saw only/, must: /must/, none: /no /, due: /due/, noguess: /pattern/, cant: /can’t/, more: /chance/,
  proof: /proof/, trick: /throws out/, never: /always wrong/, only: /only/, next: /“must”/, useless: /never help/,
};

function checkFeedback(it: ChooseItem) {
  const s = skinOf(it);
  for (const c of it.choices) {
    if (c.id === it.answer) {
      expect(it.feedback?.[c.id]).toBeUndefined();
      continue;
    }
    const fb = it.feedback?.[c.id];
    expect(fb, `${it.id} ${c.id} has feedback`).toBeDefined();
    expect(fb!.headline).toMatch(/^Your answer /);
    expect(fb!.detail.length).toBeGreaterThan(0);
    expect(it.whyWrong?.[c.id]).toBe(feedbackText(fb!));
    if (it.skill === 's7.pattern-chance') {
      // The headline names the kind the pick is about, and the count that breaks it.
      const r = LABEL[c.label] ? { kind: s.kinds.findIndex((k) => it.prompt.includes(`“The next ${s.noun} is ${k.is}.”`)) } : readSentence(s, c.label);
      const k = s.kinds[r.kind];
      expect(fb!.headline.includes(k.is) || fb!.headline.includes(k.many), fb!.headline).toBe(true);
      expect(fb!.headline).toMatch(/, but (all \d+|\d+ of the \d+|only \d+|.+ has (no|\d+) )/);
    } else expect(fb!.headline, `${it.skill} ${c.id}`).toMatch(GAP[c.id]);
  }
}

const looks = (it: Item) => JSON.stringify([it.prompt, it.scene ?? null, it.kind === 'choose' ? it.choices.map((c) => c.label) : null]);
const pack = (seed: number) => lesson.practice(createRng(seed)).map(choose);

describe('the model', () => {
  it('gives the four words from the counts, and refuses exactly half', () => {
    expect(wordFor(7, 7)).toBe('must');
    expect(wordFor(5, 7)).toBe('likely');
    expect(wordFor(1, 7)).toBe('unlikely');
    expect(wordFor(0, 7)).toBe('cant');
    expect(() => wordFor(2, 4)).toThrow();
    for (let total = 1; total <= 12; total++) for (let n = 0; n <= total; n++) if (2 * n !== total) expect(wordFor(n, total)).toBe(word(n, total));
  });
});

describe('s7.l1 quiz packs', () => {
  it('4 items: a gentle bag first, then sure, due and the can-fail question, each answer re-derived', () => {
    for (const seed of SEEDS) {
      const items = pack(seed);
      expect(items).toHaveLength(4);
      expect(items[0].skill).toBe('s7.pattern-chance');
      expect(new Set(items.map((i) => i.skill))).toEqual(new Set(['s7.pattern-chance', 's7.pattern-sure', 's7.pattern-due', 's7.pattern-break']));
      expect(items.filter((i) => i.tags?.includes('can-fail')).map((i) => i.skill)).toEqual(['s7.pattern-break']);
      expect(items.filter((i) => i.conflict).map((i) => i.skill)).toEqual(['s7.pattern-due']);
      expect(new Set(items.map(looks)).size).toBe(4);
      for (const it of items) {
        expect(derive(it), `${seed} ${it.id}: ${it.prompt}`).toBe(it.answer);
        checkFeedback(it);
        expect(it.teach?.cases?.length).toBeGreaterThanOrEqual(2);
        expect(it.hintCase).toBeDefined();
      }
      expect(lesson.practice(createRng(seed))).toEqual(items);
    }
  });

  it('every pack uses at least two skins, and a different child in each story', () => {
    const frames = new Set<string>();
    for (const seed of SEEDS) {
      const items = pack(seed);
      const skins = items.map((i) => skinOf(i));
      expect(new Set(skins.map((s) => s.frame)).size, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      skins.forEach((s) => frames.add(s.id));
      const names = items.map((i) => i.prompt.split(' ').find((w) => /^[A-Z][a-z]+$/.test(w) && w !== 'The'));
      expect(new Set(names).size, `seed ${seed}: ${names}`).toBe(4);
    }
    expect(frames.size).toBe(Object.keys(SKINS).length);
  });

  it('each skill has many different-looking items for new examples after a miss', () => {
    const bySkill = new Map<string, Set<string>>();
    for (const seed of SEEDS) for (const it of pack(seed)) {
      if (!bySkill.has(it.skill)) bySkill.set(it.skill, new Set());
      bySkill.get(it.skill)!.add(looks(it));
    }
    for (const [skill, set] of bySkill) expect(set.size, skill).toBeGreaterThanOrEqual(150);
    expect(freshItems(pack(1)[0], createRng(1))).toEqual([]);
  });

  it('the chance question covers all four words, and both question forms', () => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const it = pack(seed)[0];
      const ans = label(it, it.answer);
      seen.add(LABEL[ans] ?? readSentence(skinOf(it), ans).w);
      seen.add(LABEL[ans] ? 'word-form' : 'sentence-form');
    }
    expect(seen).toEqual(new Set(['must', 'likely', 'unlikely', 'cant', 'word-form', 'sentence-form']));
  });

  it('every form of every maker re-derives, in every skin', () => {
    for (const skin of Object.keys(SKINS) as SkinId[]) {
      for (let seed = 1; seed <= 30; seed++) {
        const rng = createRng(seed);
        const made = [
          chanceItem(rng, skin, { form: 'word' }), chanceItem(rng, skin, { form: 'sentence' }),
          sureItem(rng, skin, { form: 'know' }), sureItem(rng, skin, { form: 'best' }),
          dueItem(rng, skin, { form: 'known' }), dueItem(rng, skin, { form: 'hidden' }),
          breakItem(rng, skin, { form: 'proof' }), breakItem(rng, skin, { form: 'show' }),
        ];
        for (const m of made) {
          const it = choose({ id: 'x', stop: 7, lesson: 's7.l1', skill: `s7.${m.tag}`, ...m.item });
          expect(derive(it), `${skin} ${seed}: ${it.prompt}`).toBe(it.answer);
          checkFeedback(it);
          expect(it.choices.length).toBeGreaterThanOrEqual(3);
          expect(new Set(it.choices.map((c) => c.label)).size).toBe(it.choices.length);
        }
      }
    }
  });

  it('the sentence form’s explain quotes the right sentence; “due” always keeps the put-back condition', () => {
    for (const skin of Object.keys(SKINS) as SkinId[]) {
      for (let seed = 1; seed <= 30; seed++) {
        const rng = createRng(seed);
        const c = chanceItem(rng, skin, { form: 'sentence' });
        const ci = choose({ id: 'x', stop: 7, lesson: 's7.l1', skill: 's7.x', ...c.item });
        expect(ci.explain, ci.prompt).toContain(`“${label(ci, ci.answer)}”`);
        for (const m of [dueItem(rng, skin, { form: 'known' }), dueItem(rng, skin, { form: 'hidden' })]) {
          const it = choose({ id: 'x', stop: 7, lesson: 's7.l1', skill: 's7.x', ...m.item });
          const texts = [...teachStrings(it), ...Object.values(it.feedback ?? {}).map(feedbackText)];
          for (const t of texts) expect(t).not.toMatch(/Nothing in a bag is ever due/);
          // A wrong “No.” choice must overclaim plainly, not just state a fact the hidden bag might make true.
          for (const ch of it.choices) if (ch.id !== it.answer && ch.label.startsWith('No.')) expect(ch.label, it.prompt).toMatch(/knows|always/);
        }
      }
    }
  });
});

describe('s7.l1 check, Arcade', () => {
  it('check: exactly 2 different items, at least one conflict, each slot varied', () => {
    const slots = [new Set<string>(), new Set<string>()];
    for (let seed = 1; seed <= 300; seed++) {
      const made = checkItems(createRng(seed));
      expect(made).toHaveLength(2);
      const items = made.map((m, i) => choose({ id: `c${i}`, stop: 7, lesson: 's7.l1', skill: `s7.${m.tag}`, ...m.item }));
      expect(looks(items[0])).not.toBe(looks(items[1]));
      expect(items.some((i) => i.conflict)).toBe(true);
      items.forEach((it, i) => {
        slots[i].add(looks(it));
        expect(derive(it)).toBe(it.answer);
      });
      expect(checkItems(createRng(seed))).toEqual(made);
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(10);
    expect(slots[0].size).toBeGreaterThanOrEqual(250);
    expect(slots[1].size).toBeGreaterThanOrEqual(250);
  });

  it('Arcade: one valid item, the same for the same seed', () => {
    const skills = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const m = arcadeItem(createRng(seed));
      const it = choose({ id: 'a', stop: 7, lesson: 's7.l1', skill: `s7.${m.tag}`, ...m.item });
      expect(derive(it)).toBe(it.answer);
      expect(arcadeItem(createRng(seed))).toEqual(m);
      skills.add(it.skill);
    }
    expect(skills.size).toBe(4);
  });
});

/** “The next card is red or blue.” -> which cards fit, read from the words. */
function cardTest(text: string): (t: Thing) => boolean {
  const m = text.match(/“The next card is (.+)\.”$/)!;
  const parts = m[1].split(' or ').map((p) => p.replace(/^an? /, ''));
  return (t) => parts.some((p) => p === t.shape || p === t.color);
}

describe('s7.l1 See and Do', () => {
  const ideas = lesson.ideas;
  const boards = lesson.drill!;

  it('the worked example card marks one sentence of each word, counted from its bag', () => {
    const card = ideas[ideas.length - 1];
    expect(card.scene).toEqual(EXAMPLE_SCENE);
    const things = EXAMPLE_SCENE.things;
    const lines = card.body.slice(1);
    expect(lines).toHaveLength(4);
    const ws = lines.map((l) => {
      const fit = cardTest(l.match(/^(“[^”]+”)/)![1]);
      const w = word(things.filter(fit).length, things.length);
      expect(l.endsWith(`so: ${Object.keys(LABEL).find((k) => LABEL[k] === w)}.`), l).toBe(true);
      return w;
    });
    expect(new Set(ws)).toEqual(new Set(['must', 'likely', 'unlikely', 'cant']));
  });

  it('every board mark is counted from the board’s own bag, and the right marks pass', () => {
    expect(boards).toHaveLength(2);
    expect(boards[0].scene).toEqual(EXAMPLE_SCENE);
    expect(boards[1].scene).toEqual(TWIN_SCENE);
    expect(boards[1].twin).toBeTruthy();
    // The twin changes one count: the squares are gone, everything else is the same.
    expect(TWIN_SCENE.things.map((t) => [t.shape, t.color])).toEqual(EXAMPLE_SCENE.things.filter((t) => t.shape !== 'square').map((t) => [t.shape, t.color]));
    for (const b of boards) {
      const things = (b.scene as Extract<Scene, { kind: 'things' }>).things;
      for (const r of b.rows) {
        const fit = cardTest(r.label.match(/(“[^”]+”)$/)![1]);
        const w = word(things.filter(fit).length, things.length);
        for (const m of r.marks) {
          expect(m.answer, `${b.id} ${r.label}`).toBe(w);
          if (!m.given) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.length, `${r.label} ${o.id}`).toBeGreaterThan(10);
        }
      }
      const tap = marksToTap(b);
      expect(tap.length).toBeGreaterThanOrEqual(4);
      expect(tap.length).toBeLessThanOrEqual(12);
      expect(checkDrill(b, Object.fromEntries(tap.map((m) => [m.id, m.answer]))).done).toBe(true);
      // Every learner mark on a board asks for a word the learner has to count; the boards use all four words.
      expect(new Set(tap.map((m) => m.answer))).toEqual(new Set(['must', 'likely', 'unlikely', 'cant']));
    }
    // Board 1 shows the worked case (the shape sentences) and asks for new sentences.
    const given = boards[0].rows.filter((r) => r.marks.every((m) => m.given)).map((r) => r.label);
    const asked = boards[0].rows.filter((r) => r.marks.some((m) => !m.given)).map((r) => r.label);
    expect(given).toHaveLength(4);
    for (const a of asked) expect(given).not.toContain(a);
  });

  it('no quiz, check or Arcade item repeats a card’s or board’s story', () => {
    const scenes = new Set([...ideas.flatMap((c) => (c.scene ? [JSON.stringify(c.scene)] : [])), ...boards.map((b) => JSON.stringify(b.scene))]);
    const items: Item[] = [];
    for (const seed of SEEDS) {
      items.push(...pack(seed));
      checkItems(createRng(seed)).forEach((m) => items.push({ id: 'c', stop: 7, lesson: 's7.l1', skill: `s7.${m.tag}`, ...m.item }));
      const a = arcadeItem(createRng(seed));
      items.push({ id: 'a', stop: 7, lesson: 's7.l1', skill: `s7.${a.tag}`, ...a.item });
    }
    for (const it of items) {
      expect(scenes.has(JSON.stringify(it.scene)), it.prompt).toBe(false);
      for (const name of ['Eli', 'Hana', 'Uma', 'Ivy']) expect(it.prompt.includes(name), it.prompt).toBe(false);
      expect(it.prompt.startsWith('The bag has 6 red marbles and 1 blue marble.'), it.prompt).toBe(false);
    }
  });
});

describe('s7.l1 Likely means more fit, but not every one', () => {
  // When every one fits, Must is the word. Likely is stated so it is not also true then, the way Unlikely needs some.
  const LIKELY_TERM = 'more things fit than do not, but not every one.';

  it('every place that defines Likely says “but not every one”', () => {
    const card = lesson.ideas.find((c) => c.title === 'Likely is not must')!;
    expect(card.body.join(' ')).toContain('Likely: more fit than not, but not every one.');
    for (const skin of Object.keys(SKINS) as SkinId[]) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const form of ['word', 'sentence'] as const) {
          const m = chanceItem(createRng(seed), skin, { form });
          const t = m.item.teach!;
          expect(t.terms?.find((x) => x.word === 'Likely')?.meaning).toBe(LIKELY_TERM);
          expect(t.remember?.[0]).toContain('More fit than not, but not all: Likely.');
        }
      }
    }
  });

  it('when every one fits, the Likely pick’s detail names the real gap: not every one would fit', () => {
    let seen = 0;
    for (const skin of Object.keys(SKINS) as SkinId[]) {
      for (let seed = 1; seed <= 20; seed++) {
        const m = chanceItem(createRng(seed), skin, { form: 'word', want: 'must' });
        const it = choose({ id: 'x', stop: 7, lesson: 's7.l1', skill: 's7.pattern-chance', ...m.item });
        expect(it.answer).toBe('must');
        const s = skinOf(it);
        const k = s.kinds.find((x) => it.prompt.includes(`“The next ${s.noun} is ${x.is}.”`))!;
        const fb = it.feedback!.likely;
        expect(fb.detail[0]).toBe(`Your answer means more of the ${s.nouns} are ${k.are} than not, but not every one is.`);
        expect(fb.headline).toMatch(/, but all \d+ /);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('a Likely pick on an all-fit count says Likely needs some that do not fit, and never “not just Likely”', () => {
    for (let total = 3; total <= 9; total++) {
      expect(wordWhy(total, total, 'likely', 'card', 'cards')).toBe(`All ${total} cards fit. Likely means some do not fit. When every one fits, the word is Must.`);
    }
    let allFitRows = 0;
    for (const b of lesson.drill!) {
      const things = (b.scene as Extract<Scene, { kind: 'things' }>).things;
      for (const r of b.rows) {
        const fit = cardTest(r.label.match(/(“[^”]+”)$/)![1]);
        if (things.filter(fit).length !== things.length) continue;
        for (const mk of r.marks) {
          if (mk.given) continue;
          allFitRows++;
          expect(mk.why.likely).toContain('Likely means some do not fit.');
        }
      }
      const text = JSON.stringify(b);
      expect(text).not.toMatch(/not just Likely/);
    }
    expect(allFitRows).toBeGreaterThanOrEqual(2);
  });
});

describe('s7.l1 reading level', () => {
  it(`every item reads at grade ${READING.maxGrade} or lower with no sentence over ${READING.maxSentenceWords} words`, () => {
    for (const seed of SEEDS) {
      const items: Item[] = [...pack(seed)];
      checkItems(createRng(seed)).forEach((m) => items.push({ id: 'c', stop: 7, lesson: 's7.l1', skill: `s7.${m.tag}`, ...m.item }));
      for (const it of items) {
        const text = [it.prompt, it.explain, ...teachStrings(it), ...(it.kind === 'choose' ? it.choices.map((c) => c.label) : [])].join('\n');
        expect(fkGrade(text), `${seed} ${it.skill}`).toBeLessThanOrEqual(READING.maxGrade);
        const long = longestSentence(text);
        expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
        expect(text, 'curly quotes only').not.toMatch(/["']/);
      }
    }
  });

  it('cards and boards use curly quotes only', () => {
    const text = [...lesson.ideas.flatMap((c) => [c.title, ...c.body]), ...lesson.drill!.flatMap((b) => [b.title, ...b.body, b.done, b.twin ?? '', ...b.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])])])].join('\n');
    expect(text).not.toMatch(/["']/);
    expect(longestSentence(text).words).toBeLessThanOrEqual(READING.maxSentenceWords);
  });
});
