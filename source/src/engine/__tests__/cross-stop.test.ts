/**
 * The cross-stop builder's work on the stops that were already built (docs/CURRICULUM-PLAN.md §3, "Cross-stop builder"):
 * the closing why item of s1-s5, s7 and s14-s17, the warm-up (bridge) items of s2-s5 and s7, the cards that name
 * transitive (Stop 3, lesson 1) and symmetric (Stop 4, lesson 4), and the glossary terms on the existing lessons.
 *
 * Every why answer is worked out again here by a second method, from what the learner sees or from the puzzle's data
 * with this file's own brute force: the cards read back from the sentence and every way to fill the face-down cards;
 * the AND or OR rule read back from the prompt and every one of the 18 cards; every order of the people; every way to
 * hand out the grid's things; every case of the islanders.
 */
import { describe, expect, it } from 'vitest';
import { stop1 } from '../../content/stop1';
import { stop2 } from '../../content/stop2';
import { stop3 } from '../../content/stop3';
import { stop4 } from '../../content/stop4';
import { stop5 } from '../../content/stop5';
import { stop7 } from '../../content/stop7';
import { stop14 } from '../../content/stop14';
import { stop15 } from '../../content/stop15';
import { stop16 } from '../../content/stop16';
import { stop17 } from '../../content/stop17';
import { WORLD } from '../../content/world';
import { freshCheckSet, looks } from '../fresh';
import { claimTrue } from '../grade';
import { whyOnlyOneItem } from '../puzzles/grid';
import { whyCrashItem, type Kind } from '../puzzles/knights';
import { whyChainItem } from '../puzzles/lineup';
import { whyRowItem } from '../puzzles/statements';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import type { ChooseItem, Color, Item, LineClue, Shape, Size, StopDef, Thing } from '../types';

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const choose = (it: Item): ChooseItem => {
  if (it.kind !== 'choose') throw new Error(`${it.id} is not a choose item`);
  return it;
};
const labelOf = (it: ChooseItem, id: string) => it.choices.find((c) => c.id === id)!.label;
const rightLabel = (it: ChooseItem) => labelOf(it, it.answer);
const last = (items: Item[]) => items[items.length - 1];

// ---------- this file's own card world (Stop 1 and Stop 2) ----------

const COLORS: Color[] = ['red', 'blue', 'yellow'];
const SHAPES: Shape[] = ['circle', 'square', 'triangle'];
const SIZES: Size[] = ['big', 'small'];
type Card = { color: Color; shape: Shape; size: Size };
const EVERY_CARD: Card[] = COLORS.flatMap((color) => SHAPES.flatMap((shape) => SIZES.map((size) => ({ color, shape, size }))));

/** One feature in words ("red", "big", "a circle", "circle") as a test on a card. */
function featureTest(words: string): (c: Card) => boolean {
  const w = words.replace(/^an? /, '');
  if ((COLORS as string[]).includes(w)) return (c) => c.color === w;
  if ((SHAPES as string[]).includes(w)) return (c) => c.shape === w;
  if ((SIZES as string[]).includes(w)) return (c) => c.size === w;
  throw new Error(`unknown feature “${words}”`);
}

/** “Every card is red.” / “There is a circle.”: the sentence read back as a test on a whole row. */
function readRowSentence(text: string): (row: Card[]) => boolean {
  const every = /^Every card is (.+)\.$/.exec(text);
  if (every) {
    const f = featureTest(every[1]);
    return (row) => row.every(f);
  }
  const some = /^There is an? (.+)\.$/.exec(text);
  if (some) {
    // “a red card” names one feature; “a big red circle” names three (the shape is the noun).
    const words = some[1].split(' ').filter((w) => w !== 'card');
    const tests = words.map((w) => featureTest(w));
    return (row) => row.some((c) => tests.every((t) => t(c)));
  }
  throw new Error(`unknown sentence “${text}”`);
}

/** Every way the cards at `free` could be (the others as shown): the sentence's truth in each. */
function truths(row: readonly Thing[], free: readonly number[], holds: (r: Card[]) => boolean): boolean[] {
  const out: boolean[] = [];
  const cards: Card[] = row.map((t) => ({ color: t.color, shape: t.shape, size: t.size }));
  const go = (k: number) => {
    if (k === free.length) return void out.push(holds(cards));
    for (const c of EVERY_CARD) {
      cards[free[k]] = c;
      go(k + 1);
    }
  };
  go(0);
  return out;
}
const verdictOf = (ts: boolean[]) => (ts.every(Boolean) ? 'true' : ts.every((v) => !v) ? 'false' : 'cant');
const hiddenOf = (row: readonly Thing[]) => row.flatMap((t, i) => (t.hidden ? [i] : []));
/** Card i's verdict on its own: every other card could be any card. */
const aloneVerdict = (row: readonly Thing[], i: number, holds: (r: Card[]) => boolean) => verdictOf(truths(row, row.map((_, j) => j).filter((j) => j !== i), holds));

// ---------- the closing why item: every stop this builder owns ends its check with one ----------

const OWN: [StopDef, string[]][] = [
  [stop1, ['s1.check-cards', 's1.cant-tell']],
  [stop2, ['s2.why-not']],
  [stop3, ['s3.why-chain']],
  [stop4, ['s4.why-only-one']],
  [stop5, ['s5.why-crash']],
  [stop7, ['s7.fair-reason']],
  [stop14, ['s14.unit-why', 's14.repair-why', 's14.echo-why']],
  [stop15, ['s15.stair-why', 's15.machine-why', 's15.cycle-why']],
  [stop16, ['s16.fold-why', 's16.link-why']],
  [stop17, ['s17.why-continue']],
];

describe('the closing why item', () => {
  it.each(OWN.map(([s, skills]) => [s.id, s, skills] as const))('%s: the check ends with its why item, a reason-picking choose item, and only there', (_id, stop, skills) => {
    for (const seed of SEEDS.slice(0, 30)) {
      const items = stop.check!(createRng(seed));
      expect(items.length).toBeGreaterThanOrEqual(8);
      expect(items.length).toBeLessThanOrEqual(10);
      const why = choose(last(items));
      expect(why.tags).toContain('why');
      expect(skills).toContain(why.skill);
      // Teach first: the teaching, and its own words for every wrong reason.
      expect(why.teach).toBeDefined();
      for (const c of why.choices) {
        if (c.id === why.answer) continue;
        expect(why.feedback?.[c.id]?.headline, `${stop.id} ${c.id}`).toBeTruthy();
      }
      expect(items.slice(0, -1).filter((x) => x.tags?.includes('why'))).toEqual([]);
    }
  });

  it('Stop 1: the verdict the prompt gives and the right reason come out of every way to fill the cards', () => {
    const kinds = new Set<string>();
    for (const seed of SEEDS) {
      for (const target of ['false', 'cant'] as const) {
        const it = choose(whyRowItem(createRng(seed), { frame: (['abstract', 'everyday', 'fantasy'] as const)[seed % 3], target }).item as ChooseItem);
        const row = (it.scene as { things: Thing[] }).things;
        const text = /“(.+?)”/.exec(it.prompt)![1];
        const holds = readRowSentence(text);
        const verdict = verdictOf(truths(row, hiddenOf(row), holds));
        expect(verdict, it.prompt).toBe(target);
        expect(it.prompt).toContain(target === 'false' ? 'This sentence is false.' : 'You can’t tell yet if this sentence is true.');
        const card = (label: string) => Number(/^Card (\d)/.exec(label)?.[1] ?? 0) - 1;
        for (const c of it.choices) {
          kinds.add(`${target}:${c.id}`);
          const i = card(c.label);
          let holdsHere: boolean;
          switch (c.id) {
            // A card you can see that settles it on its own, whatever every other card is.
            case 'breaks': holdsHere = !row[i].hidden && aloneVerdict(row, i, holds) === 'false'; break;
            case 'fits': holdsHere = !row[i].hidden && aloneVerdict(row, i, holds) === 'false'; break;
            case 'seen': holdsHere = !row[i].hidden && aloneVerdict(row, i, holds) !== 'cant'; break;
            // A face-down card: it could be any card, so on its own it never makes a sentence like these false.
            case 'hidden': holdsHere = row[i].hidden === true && verdictOf(truths([row[i]], [0], holds)) === 'false'; break;
            case 'cant': case 'either': holdsHere = row[i].hidden === true && verdict === 'cant'; break;
            case 'looks': holdsHere = verdict === (holds(row.filter((t) => !t.hidden)) ? 'true' : 'false'); break;
            // Every way to fill the cards makes it true or false: it is a statement either way.
            case 'not-statement': holdsHere = false; break;
            default: throw new Error(`unknown reason ${c.id}`);
          }
          expect(holdsHere, `${it.prompt} ${c.label}`).toBe(c.id === it.answer);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['cant:either', 'cant:looks', 'cant:not-statement', 'cant:seen', 'false:breaks', 'false:cant', 'false:fits', 'false:hidden']);
  });

  it('Stop 2: the card does not fit the AND or OR rule, and only the right reason is true on it (all 18 cards checked)', () => {
    const ops = new Set<string>();
    for (const seed of SEEDS) {
      const it = choose(last(stop2.check!(createRng(seed))));
      const rule = /(?:the rule|that is) (.+?) (AND|OR) (.+?)[.,]/.exec(it.prompt)!;
      const [a, op, b] = [featureTest(rule[1]), rule[2], featureTest(rule[3])];
      const fitsRule = (c: Card) => (op === 'AND' ? a(c) && b(c) : a(c) || b(c));
      const card = (it.scene as { things: Thing[] }).things[0];
      expect(fitsRule(card), it.prompt).toBe(false);
      ops.add(op);
      const part = (label: string) => featureTest(/“(.+?)”/.exec(label)![1]);
      for (const c of it.choices) {
        const l = c.label;
        let holds: boolean;
        if (/^The part “.+?” is false, and AND needs both parts/.test(l)) holds = !part(l)(card);
        else if (/^Both parts are false\./.test(l)) holds = !a(card) && !b(card);
        else if (/one true part makes AND false\.$/.test(l)) holds = part(l)(card) && EVERY_CARD.every((k) => !part(l)(k) || !fitsRule(k));
        else if (/^No part is true\./.test(l)) holds = !a(card) && !b(card);
        else if (/and OR needs both parts to be true\.$/.test(l)) holds = !part(l)(card) && EVERY_CARD.every((k) => part(l)(k) || !fitsRule(k));
        else if (/^Both parts are true, and OR/.test(l)) holds = a(card) && b(card);
        else if (/but OR needs its first part\.$/.test(l)) holds = part(l)(card);
        else throw new Error(`unknown reason “${l}”`);
        expect(holds, `${it.prompt} ${l}`).toBe(c.id === it.answer);
      }
    }
    expect([...ops].sort()).toEqual(['AND', 'OR']);
  });

  it('Stop 2: a missed why item gets new why items on its skill, first with the same word (AND or OR), then the other', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const why = last(stop2.check!(createRng(seed)));
      const set = freshCheckSet(stop2, why, seed);
      expect(set.map((x) => x.skill)).toEqual(['s2.why-not', 's2.why-not']);
      expect(set[0].lesson).toBe(why.lesson);
      expect(set.map((x) => x.lesson).sort()).toEqual(['s2.l2', 's2.l3']);
      for (const x of set) expect(x.tags).toContain('why');
      expect(new Set([why, ...set].map(looks)).size).toBe(3);
    }
  });

  it('Stop 3: every order of the four people that fits the clues has the first before the last; only the chain proves it', () => {
    const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    const before = (c: LineClue, p: string[]) => c.t === 'before' && p.indexOf(c.a) < p.indexOf(c.b);
    for (const seed of SEEDS) {
      const built = whyChainItem(createRng(seed), { id: 'x', skin: (['race', 'height', 'dragons', 'line', 'robots', 'brooms', 'letters'] as const)[seed % 7] });
      const it = built.item;
      const fit = permutations(built.ids).filter((p) => built.clues.every((c) => before(c, p)));
      expect(fit.every((p) => p.indexOf(built.a) < p.indexOf(built.c)), it.prompt).toBe(true);
      // No clue names the two together, and the chain's clue numbers are where the two links sit in the list.
      expect(built.clues.some((c) => c.t === 'before' && ((c.a === built.a && c.b === built.c) || (c.a === built.c && c.b === built.a)))).toBe(false);
      const at = (a: string, b: string) => built.clues.findIndex((c) => c.t === 'before' && c.a === a && c.b === b) + 1;
      expect(rightLabel(it)).toMatch(new RegExp(`^Clue ${at(built.a, built.mid)} says .*Clue ${at(built.mid, built.c)} says `));
      // The front is not proved for the first of the two, and the fork's second link is not a clue.
      expect(new Set(fit.map((p) => p[0])).size === 1 && fit[0][0] === built.a).toBe(false);
      expect(at(built.c, built.mid)).toBe(0);
      expect(it.answer).toBe('chain');
      expect(it.choices.map((c) => c.id).sort()).toEqual(['chain', 'direct', 'first', 'fork']);
    }
  });

  it('Stop 4: every way to hand out the things that keeps the marks gives the asked box; one box is left in its line', () => {
    const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    const asks = new Set<string>();
    for (const seed of SEEDS) {
      const built = whyOnlyOneItem(createRng(seed), { id: 'x', skin: (['kids', 'dragons', 'robots', 'letters'] as const)[seed % 4] });
      const people = built.cast.spec.people;
      const vals = built.cast.spec.cats[0].values;
      const keeps = (way: string[], marks: typeof built.marks) => people.every((p, i) => Object.entries(marks[p] ?? {}).every(([v, m]) => (way[i] === v) === (m === 'yes')));
      const ways = permutations(vals).filter((w) => keeps(w, built.marks));
      const pi = people.indexOf(built.p);
      expect(ways.length).toBeGreaterThan(0);
      expect(ways.every((w) => w[pi] === built.val), built.item.prompt).toBe(true);
      // The asked line: one empty box, and it is the asked one.
      const empty = built.ask === 'col' ? people.filter((q) => built.marks[q][built.val] !== 'no') : vals.filter((v) => built.marks[built.p][v] !== 'no');
      expect(empty).toEqual([built.ask === 'col' ? built.p : built.val]);
      // The cross off the line does not decide it on its own.
      const crosses = people.flatMap((q) => Object.keys(built.marks[q]).map((v) => ({ q, v })));
      const off = crosses.find(({ q, v }) => (built.ask === 'col' ? v !== built.val : q !== built.p))!;
      const alone = permutations(vals).filter((w) => keeps(w, { [off.q]: { [off.v]: 'no' } }));
      expect(alone.every((w) => w[pi] === built.val)).toBe(false);
      expect(built.item.answer).toBe('only-one');
      asks.add(built.ask);
      // No check mark or cross is drawn in the words.
      expect([built.item.prompt, ...built.item.choices.map((c) => c.label), built.item.explain].join(' ')).not.toMatch(/[✓✗]/);
    }
    expect([...asks].sort()).toEqual(['col', 'row']);
  });

  it('Stop 5: the one case that fits makes the islander a knave, and supposing a knight crashes in both cases', () => {
    for (const seed of SEEDS) {
      const built = whyCrashItem(createRng(seed), { id: 'x', skin: (['island', 'elves', 'wizards', 'letters'] as const)[seed % 4] });
      const [x, y] = [built.who, built.other];
      const fits = (kx: Kind, ky: Kind) => {
        const kinds = { [x]: kx, [y]: ky };
        return [x, y].every((p) => claimTrue(built.claims[p], kinds) === (kinds[p] === 'knight'));
      };
      const cases = (['knight', 'knave'] as const).flatMap((kx) => (['knight', 'knave'] as const).map((ky) => [kx, ky] as const));
      const good = cases.filter(([kx, ky]) => fits(kx, ky));
      expect(good.length, built.item.prompt).toBe(1);
      expect(good[0][0]).toBe('knave');
      expect(fits('knight', 'knight') || fits('knight', 'knave')).toBe(false);
      expect(built.item.answer).toBe('crash');
      expect(built.item.prompt).toContain(' must be a knave. Which reason shows why?');
    }
  });

  it('Stop 7: lesson 4’s “Which reason should decide it?” is always in the check, and last', () => {
    for (const seed of SEEDS) {
      const items = stop7.check!(createRng(seed));
      expect(items).toHaveLength(10);
      expect(items.map((x) => x.lesson)).toEqual(['s7.l1', 's7.l1', 's7.l2', 's7.l2', 's7.l3', 's7.l3', 's7.l4', 's7.l5', 's7.l5', 's7.l4']);
      const why = choose(last(items));
      expect(why.skill).toBe('s7.fair-reason');
      expect(why.prompt).toMatch(/Which reason should decide it\?$/);
      expect(items[6].skill).not.toBe('s7.fair-reason');
      expect([items[6], why].some((x) => x.conflict)).toBe(true);
    }
  });
});

// ---------- the warm-up on the stop page ----------

describe('the warm-up (bridge) items', () => {
  const BRIDGES: [StopDef, number, string, RegExp][] = [
    [stop2, 2, 'True or False?', /^s2\.warm-up$/],
    [stop3, 2, 'NOT, AND, OR', /^s2\./],
    [stop4, 3, 'Line Up', /^s3\.chain/],
    [stop5, 4, 'Grid Detective', /^s4\.(only-one-left)$/],
    [stop7, 6, 'If… then', /^s6\.(move-if|move-not-then|trap-then|trap-not-if)$/],
  ];
  it.each(BRIDGES.map((b) => [b[0].id, ...b] as const))('%s: a warm-up from the earlier idea, the same for the same seed', (_id, stop, n, from, skill) => {
    const seen = new Set<string>();
    for (const seed of SEEDS) {
      const it = stop.bridge!(createRng(seed));
      expect(it.stop).toBe(n);
      // The stop’s own title, with a period only when the title has no end mark of its own (“True or False?”).
      expect(it.prompt.startsWith(`A warm-up from “${from}${/[.?!]$/.test(from) ? '' : '.'}” `), it.prompt).toBe(true);
      expect(it.skill).toMatch(skill);
      expect(stop.bridge!(createRng(seed))).toEqual(it);
      seen.add(it.prompt);
    }
    expect(seen.size).toBeGreaterThan(30);
  });

  it('Stop 2’s warm-up is Stop 1’s card question, its answer worked out again from every way to fill the cards', () => {
    for (const seed of SEEDS) {
      const it = choose(stop2.bridge!(createRng(seed)));
      const row = (it.scene as { things: Thing[] }).things;
      const holds = readRowSentence(/“(.+?)”/.exec(it.prompt.replace(/^A warm-up from “.+?” /, ''))![1]);
      expect(it.answer).toBe(verdictOf(truths(row, hiddenOf(row), holds)));
    }
  });

  it('Stop 4’s warm-up is a chain from Line Up: who is at the asked end is worked out again from every order', () => {
    const permutations = <T,>(xs: T[]): T[][] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    for (const seed of SEEDS) {
      const it = stop4.bridge!(createRng(seed));
      if (it.kind !== 'choose' || it.scene?.kind !== 'clues') throw new Error('a chain question');
      const ids = it.choices.filter((c) => c.id !== 'cant').map((c) => c.id);
      const clues = it.scene.clues;
      // Read “X … than Y” / “X finished before Y” / “X is somewhere in front of Y” back: the first name is ahead.
      const pairs = clues.map((t) => {
        const names = ids.filter((id) => new RegExp(`\\b${id.charAt(0).toUpperCase()}${id.slice(1)}\\b`).test(t));
        const order = names.sort((p, q) => t.indexOf(p.charAt(0).toUpperCase() + p.slice(1)) - t.indexOf(q.charAt(0).toUpperCase() + q.slice(1)));
        return order as [string, string];
      });
      const fit = permutations(ids).filter((p) => pairs.every(([a, b]) => p.indexOf(a) < p.indexOf(b)));
      const last = /last|shortest|back of|right end/i.test(it.prompt) && !/first|tallest|longest|front|left end/i.test(it.prompt.split('. ').pop()!);
      const ends = new Set(fit.map((p) => (last ? p[p.length - 1] : p[0])));
      expect(it.answer, it.prompt).toBe(ends.size === 1 ? [...ends][0] : 'cant');
    }
  });
});

// ---------- the two named ideas, and the glossary ----------

describe('transitive and symmetric, named once in kid words first', () => {
  const cardText = (l: { ideas: { title: string; body: string[] }[] }) => l.ideas.map((c) => [c.title, ...c.body].join(' ')).join(' ');
  it('Stop 3, lesson 1: “A chain rule” comes right after “Follow the chain” and names transitive once', () => {
    const l1 = stop3.lessons[0];
    const i = l1.ideas.findIndex((c) => c.title === 'A chain rule');
    expect(l1.ideas[i - 1].title).toBe('Follow the chain');
    const body = l1.ideas[i].body.join(' ');
    expect(body.indexOf('If Ava is before Ben, and Ben is before Cal, then Ava is before Cal.')).toBeLessThan(body.indexOf('transitive'));
    expect(stop3.lessons.map(cardText).join(' ').match(/transitive/g)).toHaveLength(1);
    expect(l1.ideas.length).toBeLessThanOrEqual(7);
  });

  it('Stop 4, lesson 4: “A pair works both ways” follows “Links work both ways” and names symmetric once', () => {
    const l4 = stop4.lessons[3];
    const i = l4.ideas.findIndex((c) => c.title === 'A pair works both ways');
    expect(l4.ideas[i - 1].title).toBe('Links work both ways');
    const body = l4.ideas[i].body.join(' ');
    expect(body.indexOf('A link works both ways.')).toBeLessThan(body.indexOf('symmetric'));
    expect(stop4.lessons.map(cardText).join(' ').match(/symmetric/g)).toHaveLength(1);
  });
});

describe('glossary terms on the existing lessons', () => {
  const STOPS_OWNED = [stop1, stop2, stop3, stop4, stop5, stop7, stop14, stop15, stop16, stop17];
  const WANT: Record<string, string[]> = {
    's1.l1': ['statement', 'true', 'false'],
    's1.l2': ['can’t tell'],
    's1.l3': ['NOT'],
    's2.l2': ['AND'],
    's2.l3': ['OR'],
    's3.l1': ['chain', 'transitive'],
    's4.l4': ['symmetric'],
    's5.l3': ['suppose', 'crash'],
    's7.l1': ['good guess', 'proof'],
    's7.l2': ['best explanation'],
    's7.l3': ['cause'],
    's14.l1': ['unit', 'position'],
    's15.l2': ['rule', 'test'],
    's16.l1': ['reflection'],
    's16.l3': ['analogy'],
    's17.l1': ['proved'],
    's17.l2': ['counterexample'],
  };
  const lessons = STOPS_OWNED.flatMap((s) => s.lessons);

  it('each word sits on the lesson whose cards name it, and nowhere else in these stops', () => {
    const got = Object.fromEntries(lessons.filter((l) => l.terms?.length).map((l) => [l.id, l.terms!.map((t) => t.term)]));
    expect(got).toEqual(WANT);
    for (const l of lessons) {
      const cards = l.ideas.flatMap((c) => [c.title, ...c.body]).join(' ').toLowerCase();
      for (const t of l.terms ?? []) expect(cards, `${l.id} names ${t.term}`).toContain(t.term.toLowerCase());
    }
  });

  it('each meaning is plain: full sentences, curly quotes only, no symbols, at the reading level', () => {
    const all = lessons.flatMap((l) => l.terms ?? []);
    for (const t of all) {
      expect(t.means).toMatch(/^[A-Z].*[.!?]$/);
      for (const s of [t.term, t.means, t.also ?? '']) expect(s).not.toMatch(/["'<>=&*#@^~|\\✓✗→]/);
    }
    const text = all.map((t) => t.means).join(' ');
    expect(fkGrade(text)).toBeLessThanOrEqual(READING.maxGrade);
    expect(longestSentence(text).words).toBeLessThanOrEqual(READING.maxSentenceWords);
  });

  it('the new why skills have a plain name on their stop and a real-life line', () => {
    const named: [StopDef, string][] = [[stop2, 's2.why-not'], [stop3, 's3.why-chain'], [stop4, 's4.why-only-one'], [stop5, 's5.why-crash']];
    for (const [stop, skill] of named) {
      expect(stop.skillNames?.[skill], skill).toBeTruthy();
      expect(WORLD[stop.id].skills[skill]?.length, skill).toBeGreaterThan(0);
    }
  });
});
