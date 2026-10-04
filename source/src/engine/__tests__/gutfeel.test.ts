/**
 * Stop 7, Lesson 5 · Gut feelings. Every answer is worked out again here from the picture alone (the shape cards in
 * the item’s scene), not from the engine’s own model: the big cards are the kind the gut picks, and the kind with
 * more cards (each counted once, big or small) is the kind that is more likely.
 */
import { describe, expect, it } from 'vitest';
import { arcadeItem, checkItems, freshItems, lesson } from '../../content/stop7/gutfeel';
import { finish } from '../../content/stop7/common';
import { passState } from '../drill';
import { fkGrade, longestSentence, READING } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, Item, Scene, Thing } from '../types';
import type { Made } from '../puzzles/statements';

const SEEDS = 200;
const asItem = (m: Made, id = 'x'): ChooseItem => finish(m, id, 's7.l5');

/** The two kinds in a picture, read from the cards alone. */
interface Group { color: string; shape: string; size: string; n: number }
function readJar(scene: Scene | undefined) {
  expect(scene?.kind).toBe('things');
  const things = (scene as { things: Thing[] }).things;
  const groups = new Map<string, Group>();
  for (const t of things) {
    const k = `${t.color}|${t.shape}`;
    const g = groups.get(k) ?? { color: t.color, shape: t.shape, size: t.size, n: 0 };
    expect(g.size, 'one kind is all one size').toBe(t.size);
    g.n++;
    groups.set(k, g);
  }
  const gs = [...groups.values()];
  expect(gs.length, 'two kinds in a jar').toBe(2);
  expect(new Set(gs.map((g) => g.size)).size, 'one kind big, one small').toBe(2);
  expect(gs[0].n, 'never a tie').not.toBe(gs[1].n);
  const big = gs.find((g) => g.size === 'big')!;
  const small = gs.find((g) => g.size === 'small')!;
  const more = big.n > small.n ? big : small;
  const fewer = more === big ? small : big;
  // The word that tells the kinds apart: their color, or their shape when both are one color.
  const byShape = big.color === small.color;
  const word = (g: Group) => (byShape ? g.shape : g.color);
  return { big, small, more, fewer, trick: more !== big, word, total: big.n + small.n };
}

const has = (text: string, w: string) => new RegExp(`\\b${w}`, 'i').test(text);

const looks = (it: Item) => JSON.stringify([it.prompt, it.scene ?? null, it.kind === 'choose' ? it.choices.map((c) => c.label) : null]);

/** The card and board pictures, as counts of each look: no quiz item may show one of these. */
const pictureKey = (scene: Scene | undefined) => {
  const things = (scene as { things: Thing[] }).things;
  const counts = new Map<string, number>();
  for (const t of things) counts.set(`${t.size} ${t.color} ${t.shape}`, (counts.get(`${t.size} ${t.color} ${t.shape}`) ?? 0) + 1);
  return [...counts.entries()].map(([k, n]) => `${k}=${n}`).sort().join(',');
};
const SHOWN = new Set([...lesson.ideas.flatMap((c) => (c.scene ? [c.scene] : [])), ...lesson.drill!.flatMap((d) => (d.scene ? [d.scene] : []))].map(pictureKey));
const CARD_NAMES = ['Eli', 'Gus', 'Hana'];

/** Checks one item against the picture. Returns its skill for counting. */
function checkItem(it: ChooseItem): void {
  const jar = readJar(it.scene);
  const ids = it.choices.map((c) => c.id);
  const label = (id: string) => it.choices.find((c) => c.id === id)!.label;
  // Every wrong choice has feedback; the right one has none.
  for (const id of ids) {
    if (id === it.answer) expect(it.feedback?.[id]).toBeUndefined();
    else {
      expect(it.feedback?.[id]?.headline, `${it.skill} ${id}`).toMatch(/^Your answer /);
      expect(it.feedback![id].detail.length).toBeGreaterThan(0);
      expect(it.whyWrong?.[id]).toContain(it.feedback![id].headline);
    }
  }
  expect(it.teach?.cases?.length).toBe(3);
  expect(it.hintCase, 'a marked hint case').toBeDefined();
  expect(it.hintCase!.label).not.toContain('in the question');
  // The second teach case is another jar, named as one, not the question’s own container.
  expect(it.teach!.cases![1].label).toMatch(/^Another /);
  // Never a card’s story: not a card’s picture, not a card’s child.
  expect(SHOWN.has(pictureKey(it.scene)), `${it.skill} repeats a card’s jar`).toBe(false);
  for (const n of CARD_NAMES) expect(has(it.prompt, n), `${it.skill} uses ${n}`).toBe(false);

  const W = jar.word(jar.more), F = jar.word(jar.fewer), B = jar.word(jar.big);
  // The hint’s “more likely” kind is never one of the item’s own kinds, so the hint never backs a wrong choice.
  for (const t of it.hintCase!.truths ?? []) {
    if (!t.value || !/more likely$/.test(t.who)) continue;
    expect(has(t.who, W) || has(t.who, F), `${it.skill} hint: ${t.who}`).toBe(false);
    for (const id of ids) if (id !== it.answer) expect(t.who).not.toBe(`${label(id)} is more likely`);
  }
  switch (it.skill) {
    case 's7.gut-count': {
      // The answer is the kind with more cards; “just as likely” would need a tie; the other kind has fewer.
      expect(ids).toHaveLength(3);
      expect(has(label(it.answer), W)).toBe(true);
      expect(has(label(it.answer), F)).toBe(false);
      const wrongs = ids.filter((id) => id !== it.answer);
      const same = wrongs.find((id) => /just as likely/.test(label(id)))!;
      const fewerChoice = wrongs.find((id) => id !== same)!;
      expect(has(label(fewerChoice), F)).toBe(true);
      // “Just as likely” names both kinds, and stays the last choice.
      expect(has(label(same), W) && has(label(same), F)).toBe(true);
      expect(ids[2]).toBe(same);
      expect(it.feedback![same].headline).toMatch(/not equal/);
      expect(it.feedback![fewerChoice].headline).toMatch(/fewer/);
      if (!jar.trick) {
        // Picking the small kind when the big kind is the most: over-learning “big ones are a trick”.
        expect(it.feedback![fewerChoice].headline).toMatch(/small/);
        expect(it.feedback![fewerChoice].detail.join(' ')).toMatch(/not always a trick/);
      }
      expect(!!it.conflict, 'a conflict item exactly when the big kind has fewer').toBe(jar.trick);
      expect(it.explain).toContain(`${jar.more.n} is more than ${jar.fewer.n}`);
      break;
    }
    case 's7.gut-proof': {
      // Always a trick jar: the strong feeling (the big kind) is wrong. The big kind can still be picked.
      expect(jar.trick).toBe(true);
      expect(it.conflict).toBe(true);
      expect(it.tags).toEqual(['can-fail']);
      expect(has(it.prompt, B)).toBe(true);
      expect(label(it.answer)).toMatch(/^No\. A strong feeling is still a guess/);
      expect(has(label(it.answer), W)).toBe(true);
      expect(label('cant')).toMatch(/can’t be picked/);
      expect(jar.big.n, 'the big kind is there, so “can’t” is wrong').toBeGreaterThan(0);
      expect(it.feedback!.cant.headline).toContain(`${jar.big.n} `);
      expect(it.feedback!.yes.headline).toMatch(/strong feeling as a proof/);
      expect(it.feedback!.big.headline).toMatch(/size/);
      expect(label('yes')).toMatch(/^Yes/);
      expect(label('big')).toMatch(/^Yes/);
      break;
    }
    case 's7.gut-agree': {
      // The count backs up the gut: the big kind has more. The feeling was a good start, not a proof.
      expect(jar.trick).toBe(false);
      expect(it.conflict).toBeFalsy();
      expect(it.prompt).toContain(`${jar.big.n} `);
      expect(it.prompt).toContain(`${jar.small.n} `);
      expect(label(it.answer)).toMatch(/^No\. It was a good first guess/);
      expect(has(label('wrong'), F), '“the gut was wrong” names the kind with fewer').toBe(true);
      expect(it.feedback!.wrong.headline).toMatch(/count agrees/);
      expect(it.feedback!.proof.headline).toMatch(/proof/);
      expect(it.feedback!.never.headline).toMatch(/never/);
      break;
    }
    case 's7.gut-check': {
      // The answer is to check; the explanation says, from the count, whether the gut was right this time.
      expect(it.answer).toBe('check');
      expect(it.explain).toMatch(jar.trick ? /gut was wrong this time/ : /gut was right this time/);
      expect(it.explain).toContain(`${jar.more.n} `);
      expect(it.feedback!.trust.headline).toMatch(/proof/);
      expect(it.feedback!.flip.headline).toMatch(/always wrong/);
      expect(it.feedback!.big.headline).toMatch(/big or small/);
      break;
    }
    default:
      throw new Error(`unknown skill ${it.skill}`);
  }
}

describe('gut feelings: answers from the picture', () => {
  it('every quiz item, on many seeds', () => {
    const skills = new Map<string, number>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const it of lesson.practice(createRng(seed))) {
        expect(it.kind).toBe('choose');
        checkItem(it as ChooseItem);
        skills.set(it.skill, (skills.get(it.skill) ?? 0) + 1);
      }
    }
    expect([...skills.keys()].sort()).toEqual(['s7.gut-agree', 's7.gut-check', 's7.gut-count', 's7.gut-proof']);
  });

  it('check, Arcade and new-example items too', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const m of checkItems(createRng(seed))) checkItem(asItem(m));
      checkItem(asItem(arcadeItem(createRng(seed))));
    }
  });

  it('each tag has many different-looking items', () => {
    const seen = new Map<string, Set<string>>();
    for (let seed = 1; seed <= SEEDS; seed++) for (const it of lesson.practice(createRng(seed))) {
      if (!seen.has(it.skill)) seen.set(it.skill, new Set());
      seen.get(it.skill)!.add(looks(it));
    }
    for (const [skill, set] of seen) expect(set.size, skill).toBeGreaterThanOrEqual(100);
  });
});

describe('gut feelings: the quiz pack', () => {
  it('4 items: a gentle gut-check first, one of each kind, the can-fail item once, a conflict item, two or more skins', () => {
    const skins = ['sweet', 'fish', 'sticker', 'potion', 'scale', 'crystal', 'card'];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const items = lesson.practice(createRng(seed));
      expect(items).toHaveLength(4);
      expect(items[0].skill).toBe('s7.gut-check');
      expect(items.map((i) => i.skill).sort()).toEqual(['s7.gut-agree', 's7.gut-check', 's7.gut-count', 's7.gut-proof']);
      expect(items.filter((i) => i.tags?.includes('can-fail'))).toHaveLength(1);
      expect(items.some((i) => i.conflict)).toBe(true);
      expect(items.find((i) => i.skill === 's7.gut-count')!.conflict, 'the pack’s count is on a trick jar').toBe(true);
      const used = new Set(items.map((i) => skins.find((w) => has(i.prompt, w)) ?? 'none'));
      expect(used.size, `seed ${seed} skins`).toBeGreaterThanOrEqual(2);
      expect(new Set(items.map(looks)).size).toBe(4);
      expect(lesson.practice(createRng(seed))).toEqual(items);
    }
    expect(lesson.pass).toEqual({ firstTry: 3, include: [{ tag: 'can-fail', label: expect.any(String) }] });
  });
});

describe('gut feelings: choice order', () => {
  it('the answer moves around, and always tapping the top choice does not pass', () => {
    const where = new Map<string, Set<number>>();
    let passed = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const items = lesson.practice(createRng(seed)) as ChooseItem[];
      const extra = [...checkItems(createRng(seed)).map((m, i) => asItem(m, `c${i}`)), asItem(arcadeItem(createRng(seed)))];
      for (const it of [...items, ...extra]) {
        if (!where.has(it.skill)) where.set(it.skill, new Set());
        where.get(it.skill)!.add(it.choices.findIndex((c) => c.id === it.answer));
      }
      const top = items.map((it) => ({ clean: it.choices[0].id === it.answer, tags: it.tags ?? [] }));
      if (passState(lesson.pass, top).met) passed++;
    }
    for (const [skill, set] of where) expect(set.size, skill).toBeGreaterThanOrEqual(skill === 's7.gut-count' ? 2 : 3);
    expect(passed, 'a learner who always taps the top choice').toBeLessThan(SEEDS * 0.2);
  });
});

describe('gut feelings: the stop check share', () => {
  it('exactly 2 different items, at least one conflict, the same for the same seed, varied over 300 seeds', () => {
    const slots = [new Set<string>(), new Set<string>()];
    for (let seed = 1; seed <= 300; seed++) {
      const ms = checkItems(createRng(seed));
      expect(ms).toHaveLength(2);
      const items = ms.map((m, i) => asItem(m, `c${i}`));
      expect(looks(items[0])).not.toBe(looks(items[1]));
      expect(items.some((i) => i.conflict)).toBe(true);
      expect(checkItems(createRng(seed))).toEqual(ms);
      items.forEach((it, i) => slots[i].add(looks(it)));
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(10);
  });

  it('Arcade items are deterministic', () => {
    for (let seed = 1; seed <= 50; seed++) expect(arcadeItem(createRng(seed))).toEqual(arcadeItem(createRng(seed)));
  });
});

describe('gut feelings: new examples after a miss', () => {
  it('a missed count gets a pair: one jar where the big kind has fewer, one where it has more', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const missed = lesson.practice(createRng(seed)).find((i) => i.skill === 's7.gut-count')!;
      const set = freshItems(missed, createRng(seed + 1)).map((m, i) => asItem(m, `n${i}`));
      expect(set).toHaveLength(2);
      expect(set.map((i) => readJar(i.scene).trick).sort()).toEqual([false, true]);
      expect(new Set([missed, ...set].map(looks)).size).toBe(3);
      for (const it of set) checkItem(it);
      expect(freshItems(missed, createRng(seed + 1))).toEqual(freshItems(missed, createRng(seed + 1)));
    }
  });

  it('other kinds use the default', () => {
    for (const it of lesson.practice(createRng(3)).filter((i) => i.skill !== 's7.gut-count')) expect(freshItems(it, createRng(1))).toEqual([]);
  });
});

describe('gut feelings: cards and boards', () => {
  it('3–6 cards; the worked example is a jar where the gut is wrong, another card a jar where it is right', () => {
    expect(lesson.ideas.length).toBeGreaterThanOrEqual(3);
    expect(lesson.ideas.length).toBeLessThanOrEqual(6);
    const jars = lesson.ideas.filter((c) => c.scene).map((c) => ({ c, jar: readJar(c.scene) }));
    expect(jars.map((x) => x.jar.trick)).toEqual([true, false]);
    for (const { c, jar } of jars) expect(c.body.join(' ')).toContain(`${jar.more.n} is more than ${jar.fewer.n}`);
  });

  it('every board mark matches the picture', () => {
    const [b1, b2] = lesson.drill!;
    // Board 1: the worked example’s jar, right after its card.
    expect(b1.scene).toEqual(lesson.ideas[b1.afterCard!].scene);
    // Board 2: a twin with a note, made from the same jar by taking out small blue sweets.
    expect(b2.twin).toMatch(/gone/);
    const j1 = readJar(b1.scene), j2 = readJar(b2.scene);
    expect(j2.big).toEqual(j1.big);
    expect(j2.small.color).toBe(j1.small.color);
    expect(j2.small.n).toBeLessThan(j1.small.n);
    for (const [b, jar] of [[b1, j1], [b2, j2]] as const) {
      for (const r of b.rows) {
        // The child whose gut it is, and the color the gut says.
        const said = ['red', 'blue', 'yellow'].find((c) => has(r.label, c));
        for (const m of r.marks) {
          if (!m.given) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim(), `${b.id} ${m.id} ${o.id}`).toBeTruthy();
          if (m.id.endsWith('-feel')) expect(m.answer).toBe('guess');
          if (m.id.endsWith('-likely')) expect(m.answer).toBe(jar.more.color);
          if (m.id === 'twin-red') expect(m.answer).toBe(String([jar.big, jar.small].find((g) => g.color === 'red')!.n));
          if (m.id === 'twin-blue') expect(m.answer).toBe(String([jar.big, jar.small].find((g) => g.color === 'blue')!.n));
          if (m.id.endsWith('-right')) {
            const gut = said ?? (r.id === 'check' ? 'red' : undefined);
            expect(gut, `${m.id}: whose gut`).toBeDefined();
            expect(m.answer).toBe(gut === jar.more.color ? 'yes' : 'no');
          }
        }
      }
    }
    // The pack’s main case is tapped, not only shown: on the twin the jar still looks mostly red, the gut says red and
    // the count says blue. The learner picks the small kind over the big one and marks the gut wrong.
    expect(j2.trick, 'the twin is still a jar where the gut is wrong').toBe(true);
    const learner = (b: typeof b1) => b.rows.flatMap((r) => r.marks.filter((m) => !m.given));
    const twinLikely = learner(b2).find((m) => m.id === 'twin-likely')!;
    expect(twinLikely.answer).toBe(j2.small.color);
    expect(twinLikely.answer).not.toBe(j2.big.color);
    expect(learner(b2).find((m) => m.id === 'twin-right')!.answer).toBe('no');
    // Across the two boards the learner taps a “Yes” and a “No”: tapping Yes on every gut row does not pass.
    const verdicts = [...learner(b1), ...learner(b2)].filter((m) => m.id.endsWith('-right')).map((m) => m.answer);
    expect(new Set(verdicts)).toEqual(new Set(['yes', 'no']));
    // The twin note and the done text say what the count shows: the gut was wrong.
    expect(b2.twin).toMatch(/^Two small blue sweets are gone/);
    expect(b2.done).toMatch(/gut was wrong/);
    expect(b2.rows.find((r) => r.id === 'check')!.note).toMatch(/gut was wrong this time/);
    // The learner marks a new case on board 1 (Gus), and every step on board 2. About 12 taps or fewer.
    const taps = (b: typeof b1) => b.rows.flatMap((r) => r.marks.filter((m) => !m.given)).length;
    expect(taps(b1)).toBeGreaterThan(0);
    expect(taps(b1) + taps(b2)).toBeLessThanOrEqual(12);
  });
});

describe('gut feelings: check time', () => {
  it('the long-reading kinds (gut-agree, gut-proof) get 120 seconds in a check; the short kinds keep the default', () => {
    const items: ChooseItem[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      items.push(...(lesson.practice(createRng(seed)) as ChooseItem[]));
      items.push(...checkItems(createRng(seed)).map((m, i) => asItem(m, `c${i}`)));
      items.push(asItem(arcadeItem(createRng(seed))));
    }
    const seen = new Set<string>();
    for (const it of items) {
      seen.add(it.skill);
      if (it.skill === 's7.gut-agree' || it.skill === 's7.gut-proof') expect(it.seconds, it.skill).toBe(120);
      else expect(it.seconds, it.skill).toBeUndefined();
    }
    expect([...seen].sort()).toEqual(['s7.gut-agree', 's7.gut-check', 's7.gut-count', 's7.gut-proof']);
  });
});

describe('gut feelings: reading level', () => {
  it('every generated item reads at a 6th-grade level', () => {
    const parts: string[] = [];
    const prose = (it: Item) => [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it), ...(it.kind === 'choose' ? it.choices.map((c) => c.label) : [])];
    for (let seed = 1; seed <= 60; seed++) {
      for (const it of lesson.practice(createRng(seed))) {
        const text = prose(it).join('\n');
        const long = longestSentence(text);
        expect(long.words, `${it.skill}: “${long.sentence}”`).toBeLessThanOrEqual(READING.maxSentenceWords);
        parts.push(text);
      }
    }
    expect(fkGrade(parts.join('\n'))).toBeLessThanOrEqual(READING.maxGrade);
  });

  it('no idioms and no bare “both” in player text', () => {
    const text = [lesson.ideas.flatMap((c) => c.body), lesson.drill!.flatMap((d) => [d.title, ...d.body, d.done, d.twin ?? '', ...d.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])])]), ...[1, 2, 3, 4, 5, 6].flatMap((s) => lesson.practice(createRng(s)).flatMap((it) => [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it), ...(it.kind === 'choose' ? it.choices.map((c) => c.label) : [])]))].flat().join('\n');
    expect(text).not.toMatch(/backs? (it )?up|catch(es)? (the|your|\w+’s) eye|\bboth\b/i);
  });

  it('only curly quotes in player text', () => {
    const text = [lesson.ideas.flatMap((c) => c.body), lesson.drill!.flatMap((d) => [d.title, ...d.body, d.done, d.twin ?? '', ...d.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])])]), ...[1, 2, 3].flatMap((s) => lesson.practice(createRng(s)).flatMap((it) => [it.prompt, it.explain, ...teachStrings(it)]))].flat().join('\n');
    expect(text).not.toMatch(/["']/);
  });
});
