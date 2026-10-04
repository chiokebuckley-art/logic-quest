/**
 * Stop 7, Lesson 4 · Fair choices. Answers are re-derived here from the model data (each choice's features, each
 * reason's source, each answer's verdict and basis) with the rules written out again, never by calling the
 * function that set the answer. Pack items are also checked from what the player sees (the story and the labels).
 */
import { describe, expect, it } from 'vitest';
import { arcadeItem, checkItems, freshItems, lesson } from '../../content/stop7/fairness';
import { checkDrill, marksToTap } from '../drill';
import {
  BOARD_ACTS,
  FAIR_KINDS,
  FAIR_SKINS,
  VARIANTS,
  WORKED,
  WORKED_ACTS,
  WORKED_SCENE,
  WISHES,
  choiceItem,
  makeStory,
  pressureItem,
  reasonItem,
  storyLines,
  type ActFeatures,
  type FairMade,
} from '../puzzles/fairness';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, Item } from '../types';

const SEEDS = Array.from({ length: 250 }, (_, i) => i + 1);

/** The three checks, written again: honest = no lie and nothing hidden; fair = owed; hurts no one = no tease, blame or loss. */
const checks = (f: ActFeatures) => ({ honest: !f.lies && !f.hides, fair: f.owed, kind: !f.teases && !f.blames && !f.loss });
const allPass = (f: ActFeatures) => Object.values(checks(f)).every(Boolean);

const choose = (it: Item): ChooseItem => {
  if (it.kind !== 'choose') throw new Error('not a choose item');
  return it;
};
const label = (it: ChooseItem, id: string) => it.choices.find((c) => c.id === id)!.label;
const lines = (it: Item) => (it.scene?.kind === 'text' ? it.scene.lines : []);
const looks = (it: { prompt: string; scene?: unknown; choices: { label: string }[] }) => JSON.stringify([it.prompt, it.scene ?? null, it.choices.map((c) => c.label)]);

/** A fantasy story names a fantasy creature or title; an everyday one never does. */
const FANTASY = /\b(dragon|elf|robot|wizard|knight|unicorn|goblin|troll|queen|Sir|Dame)\b/;
const skinOf = (it: Item) => (FANTASY.test(lines(it).join(' ')) ? 'fantasy' : 'everyday');

/** The deciding fact, by what the story is about, read from the story lines. */
function deciderPattern(story: string[]): RegExp {
  const t = story.join(' ');
  if (/name tag|crest|belongs to/.test(t)) return /name tag says it is|crest shows the shield|book says it belongs/;
  if (/promised/.test(t)) return /promised to give the .* back/;
  if (/breaks/.test(t)) return /is the one who broke/;
  if (/too much|too many/.test(t)) return /gave .* too (much|many) by mistake/;
  if (/waiting for a turn/.test(t)) return /has had a full turn, and .* is waiting/;
  throw new Error(`unknown story: ${t}`);
}

/** Every choice-maker over many seeds, every kind, skin and temptation. */
function made(seed: number): FairMade[] {
  const rng = createRng(seed);
  const kind = rng.pick(FAIR_KINDS), skin = rng.pick(FAIR_SKINS), side = rng.chance(0.5);
  return [choiceItem(rng, { kind, skin, side }), reasonItem(rng, { kind, skin, side }), pressureItem(rng, { kind, skin })];
}

describe('the model', () => {
  it('every story variant has exactly one choice that passes all three checks, and it is the fair one', () => {
    for (const v of VARIANTS) {
      const s = v.build({ a: 'Ava', o: 'Ben', x: 'Cal', f: 'Dee' });
      const pass = s.acts.filter((a) => allPass(a.f));
      expect(pass.map((a) => a.id), `${s.kind} ${s.thing}`).toEqual([s.fairId]);
      // A temptation is a true line that decides nothing: it is not the deciding fact.
      for (const side of s.sides) expect(side).not.toBe(s.decider);
      // A temptation is not itself a wish: wishes are taught as “not a reason”, sides as “true, but decides nothing”.
      for (const side of s.sides) expect(side, side).not.toMatch(/\b(wants?|wanted|likes?|loves?)\b/);
      // The act a wish pushes toward is one of the story's own acts, and it fails the fair check.
      const keep = s.acts.find((a) => a.id === s.keepId);
      expect(keep, `${s.kind} keep act`).toBeDefined();
      expect(checks(keep!.f).fair).toBe(false);
    }
  });

  it('every kind of story comes in both skins', () => {
    for (const k of FAIR_KINDS) for (const sk of FAIR_SKINS) expect(VARIANTS.some((v) => v.kind === k && v.skin === sk), `${k} ${sk}`).toBe(true);
  });

  it('fair-choice: the answer is the only choice whose features pass all three checks; each wrong headline names its failed checks', () => {
    for (const seed of SEEDS) {
      const m = made(seed)[0];
      const it = m.item;
      const pass = m.acts!.filter((a) => allPass(a.f));
      expect(pass.length, `seed ${seed}`).toBe(1);
      expect(it.answer).toBe(pass[0].id);
      expect(it.choices.map((c) => c.id)).toEqual(m.acts!.map((a) => a.id));
      for (const a of m.acts!) {
        if (a.id === it.answer) continue;
        const fb = it.feedback![a.id];
        const ch = checks(a.f);
        expect(fb.headline.includes('is not honest'), `${a.id} honest`).toBe(!ch.honest);
        expect(fb.headline.includes(m.story.failFair), `${a.id} fair`).toBe(!ch.fair);
        expect(fb.headline.includes('hurts someone'), `${a.id} kind`).toBe(!ch.kind);
        expect(fb.example?.truths?.map((t) => t.value)).toEqual([ch.honest, ch.fair, ch.kind]);
      }
      // The hint shows a marked case that is not the answer.
      expect(it.hintCase!.label).not.toBe(`${label(it as ChooseItem, it.answer)}.`);
      expect(!!it.conflict).toBe(!!m.story.side);
      if (m.story.side) {
        // The temptation points at a choice on screen, and every wrong pick is told it changes nothing.
        expect(m.acts!.some((a) => !a.f.owed), `seed ${seed}`).toBe(true);
        for (const a of m.acts!) if (a.id !== it.answer) expect(it.feedback![a.id].detail.join(' ')).toContain(`“${m.story.side}” is true, but it changes no check.`);
        expect(it.explain).toContain(m.story.side);
      }
      expect(it.prompt).not.toMatch(/fair for/);
    }
  });

  it('fair-reason: the answer is the only reason that is in the story and decides it', () => {
    const headline: Record<string, RegExp> = { side: /true in the story, but/, other: /never says/, saying: /saying/, wish: /wish/, secret: /getting caught/ };
    for (const seed of SEEDS) {
      const m = made(seed)[1];
      const it = m.item;
      const story = storyLines(m.story);
      const right = m.reasons!.filter((r) => r.id === 'decider');
      expect(right.length).toBe(1);
      expect(it.answer).toBe('decider');
      for (const r of m.reasons!) {
        // A side reason is a line of the story; a fact from another story is not.
        if (r.id === 'side') expect(story).toContain(r.label);
        if (r.id === 'other') expect(story).not.toContain(r.label);
        if (r.id !== 'decider') expect(it.feedback![r.id].headline, r.id).toMatch(headline[r.id]);
      }
      // Read from the story: exactly one choice names its deciding fact, and it is the answer.
      const pat = deciderPattern(m.story.lines);
      const named = it.choices.filter((c) => pat.test(c.label));
      expect(named.map((c) => c.id), it.choices.map((c) => c.label).join(' | ')).toEqual([it.answer]);
      expect(!!it.conflict).toBe(!!m.story.side);
    }
  });

  it('fair-pressure: a wish changes no feature, so the answer is “No” for a story fact; it is a conflict and a can-fail item', () => {
    const headline: Record<string, RegExp> = { 'yes-want': /wish/, 'yes-secret': /finding out/, 'no-trouble': /trouble/, depends: /^How (much|many) .* want/ };
    for (const seed of SEEDS) {
      const m = made(seed)[2];
      const it = m.item;
      // The wished-for act is the story's own; its fair check (from its features) gives the verdict.
      const keep = m.story.acts.find((a) => a.id === m.story.keepId)!;
      const verdict = checks(keep.f).fair ? 'yes' : 'no';
      const right = m.answers!.filter((c) => c.verdict === verdict && c.basis === 'fact');
      expect(right.map((c) => c.id)).toEqual([it.answer]);
      expect(label(it as ChooseItem, it.answer)).toBe(`No. ${m.story.still}`);
      for (const c of m.answers!) if (c.id !== it.answer) expect(it.feedback![c.id].headline, c.id).toMatch(headline[c.id]);
      expect(it.conflict).toBe(true);
      expect(it.tags).toEqual(['can-fail']);
      // Two answers may say “No”, so the question asks for the reason too.
      expect(it.prompt).toMatch(/right reason/);
      // The wish line is the only line added to the story.
      expect(lines(it as Item).slice(0, -1)).toEqual(storyLines(m.story));
    }
  });

  it('fair-pressure: the question names the wished-for act first, in every wish form (no bare “this” before the story)', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      for (const wish of WISHES) {
        const rng = createRng(seed);
        const kind = rng.pick(FAIR_KINDS), skin = rng.pick(FAIR_SKINS);
        const m = pressureItem(rng, { kind, skin, wish });
        const it = m.item;
        // The first sentence on screen (the prompt sits above the story) says what is wanted.
        const first = it.prompt.split(/(?<=[.?!])\s/)[0];
        expect(first, `${wish} seed ${seed}`).toContain(m.story.keepVerb);
        expect(first).not.toMatch(/\b(this|that|it)\b/i);
        // The “add a wish” step names the act too.
        const step = it.teach!.simpler!.find((l) => l.startsWith('Now add a wish.'))!;
        expect(step).toContain(m.story.keepVerb);
        expect(step).not.toMatch(/\bthis\b/);
      }
    }
  });

  it('a story never uses the worked example’s or the board’s story', () => {
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      for (const k of FAIR_KINDS) for (const sk of FAIR_SKINS) {
        const s = makeStory(rng, k, sk, rng.chance(0.5));
        expect(s.thing).not.toBe(WORKED.thing);
        for (const n of [s.actor, s.owner, s.other, s.friend]) expect(['Leo', 'Mia']).not.toContain(n);
      }
    }
  });
});

describe('the lesson', () => {
  it('See: 3-6 cards, one worked example whose grid marks come from the features', () => {
    expect(lesson.ideas.length).toBeGreaterThanOrEqual(3);
    expect(lesson.ideas.length).toBeLessThanOrEqual(6);
    const card = lesson.ideas.find((c) => c.scene?.kind === 'grid')!;
    expect(card.scene).toEqual(WORKED_SCENE);
    if (card.scene?.kind !== 'grid') throw new Error('grid');
    for (const id of WORKED_ACTS) {
      const a = WORKED.acts.find((x) => x.id === id)!;
      const ch = checks(a.f);
      expect(card.scene.marks[id]).toEqual({ honest: ch.honest ? 'yes' : 'no', fair: ch.fair ? 'yes' : 'no', kind: ch.kind ? 'yes' : 'no' });
    }
    expect(card.scene.caption).toContain(WORKED.acts.find((a) => a.id === WORKED.fairId)!.short);
  });

  it('Do: every box of the board is the check the model gives, with words for every wrong mark', () => {
    const [board] = lesson.drill!;
    // The worked story again (card 1's scene, the worked grid's columns), with choices the worked grid did not show.
    expect(board.scene).toEqual(lesson.ideas[0].scene);
    expect(board.columns).toEqual(['Honest?', WORKED.fairLabel, 'Hurts no one?']);
    expect(board.rows.map((r) => r.id)).toEqual([...BOARD_ACTS]);
    expect(BOARD_ACTS.filter((id) => !WORKED_ACTS.includes(id)).length).toBe(2);
    for (const r of board.rows) {
      const ch = checks(WORKED.acts.find((a) => a.id === r.id)!.f);
      expect(r.marks.map((m) => m.answer)).toEqual([ch.honest, ch.fair, ch.kind].map((v) => (v ? 'yes' : 'no')));
      for (const m of r.marks) expect(m.why[m.answer === 'yes' ? 'no' : 'yes']?.trim()).toBeTruthy();
    }
    const tap = marksToTap(board);
    expect(tap.length).toBe(9);
    expect(checkDrill(board, Object.fromEntries(tap.map((m) => [m.id, m.answer]))).done).toBe(true);
    // A wrong mark is named.
    const first = tap[0];
    expect(checkDrill(board, { [first.id]: first.answer === 'yes' ? 'no' : 'yes' }).message).toBe(first.why[first.answer === 'yes' ? 'no' : 'yes']);
    expect(board.twin?.trim()).toBeTruthy();
  });

  it('Quiz: 4 items, a gentle choice first, one can-fail item, a conflict item, two or more skins, the same for the same seed', () => {
    const skinSets = new Set<string>();
    for (const seed of SEEDS) {
      const items = lesson.practice(createRng(seed)).map(choose);
      expect(items.length).toBe(4);
      expect(items[0].skill).toBe('s7.fair-choice');
      expect(items[0].conflict ?? false).toBe(false);
      expect(skinOf(items[0])).toBe('everyday');
      expect(items.filter((i) => i.tags?.includes('can-fail')).length).toBe(1);
      expect(items.filter((i) => i.conflict).length).toBeGreaterThanOrEqual(2);
      const skins = new Set(items.map(skinOf));
      expect(skins.size, `seed ${seed}`).toBe(2);
      skinSets.add([...items.map(skinOf)].join());
      expect(new Set(items.map((i) => i.skill)).size).toBe(3);
      expect(new Set(items.map(looks)).size).toBe(4);
      expect(lesson.practice(createRng(seed))).toEqual(items);
      for (const it of items) {
        // From what the player sees: a fair choice has no “but”, no hiding, no fib; a reason names the deciding fact.
        if (it.skill === 's7.fair-choice') {
          const ok = it.choices.filter((c) => !/\bbut\b|^(Keep|Say|Hide|Glue|Spend)\b/.test(c.label));
          expect(ok.map((c) => c.id), it.choices.map((c) => c.label).join(' | ')).toEqual([it.answer]);
        }
        if (it.skill === 's7.fair-reason') {
          const named = it.choices.filter((c) => deciderPattern(lines(it)).test(c.label));
          expect(named.map((c) => c.id)).toEqual([it.answer]);
        }
        if (it.skill === 's7.fair-pressure') {
          const no = it.choices.filter((c) => /^No\. .*still/.test(c.label));
          expect(no.map((c) => c.id)).toEqual([it.answer]);
        }
        for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback?.[c.id]?.headline.trim(), `${it.id} ${c.id}`).toBeTruthy();
        expect(it.hintCase).toBeDefined();
        expect(it.teach?.cases?.length).toBeGreaterThanOrEqual(3);
      }
    }
    expect(skinSets.size).toBeGreaterThan(3);
  });

  it('Check: exactly two different items, at least one a conflict, and at least 10 looks per slot over 300 seeds', () => {
    const slots = [new Set<string>(), new Set<string>()];
    for (let seed = 1; seed <= 300; seed++) {
      const two = checkItems(createRng(seed));
      expect(two.length).toBe(2);
      expect(looks(two[0].item)).not.toBe(looks(two[1].item));
      expect(two.some((m) => m.item.conflict)).toBe(true);
      expect(checkItems(createRng(seed))).toEqual(two);
      two.forEach((m, i) => slots[i].add(looks(m.item)));
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(10);
  });

  it('no quiz, check or arcade item repeats the worked example or the board', () => {
    // The lines that name the worked example's and the board's story (who, and what thing).
    const banned = [WORKED.lines[0]];
    for (let seed = 1; seed <= 200; seed++) {
      const items: Item[] = [
        ...lesson.practice(createRng(seed)),
        ...checkItems(createRng(seed)).map((m) => ({ ...m.item, id: 'c', stop: 7, lesson: 's7.l4', skill: 's7.x' })),
        { ...arcadeItem(createRng(seed)).item, id: 'a', stop: 7, lesson: 's7.l4', skill: 's7.x' },
      ];
      for (const it of items) {
        for (const l of lines(it)) expect(banned).not.toContain(l);
        expect(lines(it).join(' ')).not.toMatch(/teddy bear/);
      }
    }
  });

  it('Fresh: a missed conflict choice or reason item gets the same question with a temptation, in another kind of story', () => {
    const kindCue = (it: Item) => {
      const t = lines(it).join(' ');
      return /name tag|crest|belongs to/.test(t) ? 'found' : /promised/.test(t) ? 'promise' : /breaks/.test(t) ? 'truth' : /too much|too many/.test(t) ? 'change' : 'turn';
    };
    let tried = 0;
    for (let seed = 1; seed <= 100; seed++) {
      for (const missed of lesson.practice(createRng(seed))) {
        const fresh = freshItems(missed, createRng(seed + 1000));
        if (!missed.conflict || missed.skill === 's7.fair-pressure') {
          expect(fresh).toEqual([]);
          continue;
        }
        tried++;
        expect(fresh.length).toBe(1);
        const f = fresh[0];
        expect(`s7.${f.tag}`).toBe(missed.skill);
        expect(f.item.conflict).toBe(true);
        expect(kindCue(f.item as Item)).not.toBe(kindCue(missed));
        expect(looks(f.item)).not.toBe(looks(missed as ChooseItem));
      }
    }
    expect(tried).toBeGreaterThan(50);
  });

  it(`reads at a 6th-grade level in every kind, skin and wish (grade <= ${READING.maxGrade}, sentences <= ${READING.maxSentenceWords} words)`, () => {
    const text: string[] = [];
    for (let seed = 1; seed <= 60; seed++) {
      for (const m of [...made(seed), ...checkItems(createRng(seed)), arcadeItem(createRng(seed))]) {
        const it = m.item as ChooseItem;
        text.push(it.prompt, it.explain, it.hint ?? '', ...lines(it as Item), ...it.choices.map((c) => c.label), ...teachStrings({ ...it, id: 'x', stop: 7, lesson: 's7.l4', skill: 's7.x' }));
      }
    }
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    // Curly quotes only.
    expect(all).not.toMatch(/["']/);
  });
});
