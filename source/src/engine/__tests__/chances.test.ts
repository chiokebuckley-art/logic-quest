/**
 * Stop 13 · Clues & Chances. Every answer is worked out again here by a second method, never by calling the code that
 * set it: a chance as a share (n divided by the total) for the four words, every way the flips can go listed here,
 * the bag after kept-out draws taken out one thing at a time, every count picture spread out into 100 single things
 * and counted by filters, and each clue’s strength as a share when you are right over a share when you are wrong.
 */
import { describe, expect, it } from 'vitest';
import { stop13 } from '../../content/stop13';
import { STOPS, stopById } from '../../content/stops';
import { SOON_WORLD, WORLD } from '../../content/world';
import {
  BACK_VS_KEPT,
  COUNTS_VS_DRAW,
  EYES_SCENE,
  FARM_PICK_SCENE,
  FARM_SCENE,
  JAR,
  JAR_CASES,
  KEPT_CASES,
  L1_SCENE,
  L2_BAG,
  RIGHT_VS_FLAG,
  ROW_VS_COLUMN,
  flagSentences,
  rowColumnSentences,
} from '../puzzles/chanceBoards';
import { DRAW_FORMS, DRAW_SPEC, NAMES, SKINS, bagDueItem, coinItem, drawItem, keptItem, pickItem, wordItem, type ChanceMade, type DrawForm, type SkinId } from '../puzzles/chances';
import {
  CLUE_TOPICS,
  COUNT_SKINS,
  EYES_PIC,
  EYES_TWIN,
  FARM_PIC,
  FARM_TWIN,
  GROUP_TOPICS,
  RAIN,
  RAIN_COUNTS,
  TEST_TOPICS,
  WHY_KINDS,
  alarmItem,
  answerItem,
  fitsItem,
  moreItem,
  ofItem,
  readItem,
  strongItem,
  whyItem,
  type Cells,
  type CountMade,
  type CountSkin,
} from '../puzzles/counts';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, Scene, Thing } from '../types';
import { countsSpeech } from '../../game/speech';

const SEEDS = 200;
const BAG_SKINS = Object.keys(SKINS) as SkinId[];
const [L1, L2, L3, L4] = stop13.lessons;
const ch = (m: ChanceMade | CountMade) => m.item as ChooseItem;

// ---------- the second methods ----------

/** The word for a share: certain, more than half, less than half, or none. Never exactly half. */
function wordOfShare(n: number, total: number): 'must' | 'likely' | 'unlikely' | 'cant' {
  const p = n / total;
  expect(p, `${n} of ${total} is exactly half`).not.toBe(0.5);
  return p === 1 ? 'must' : p === 0 ? 'cant' : p > 0.5 ? 'likely' : 'unlikely';
}

/** Every way n tries of two sides can go, listed one by one. */
function ways(n: number, a: string, b: string): string[][] {
  let out: string[][] = [[]];
  for (let i = 0; i < n; i++) out = out.flatMap((w) => [[...w, a], [...w, b]]);
  return out;
}

/** A bag spread out into single things, then the draws kept out taken away one at a time. */
function bagAfterDraws(before: readonly number[], kind: number, k: number): number[] {
  const things = before.flatMap((n, i) => Array.from({ length: n }, () => i));
  for (let j = 0; j < k; j++) things.splice(things.indexOf(kind), 1);
  return [0, 1, 2].map((i) => things.filter((x) => x === i).length);
}

/** A count picture spread out into 100 single things, each with its row (0 or 1) and whether it has the clue. */
function spread(c: Cells): { row: number; yes: boolean }[] {
  return c.flatMap((r, i) => r.flatMap((n, j) => Array.from({ length: n }, () => ({ row: i, yes: j === 0 }))));
}
const count = (c: Cells, f: (t: { row: number; yes: boolean }) => boolean) => spread(c).filter(f).length;

/** Every string a learner can read on a choose item. */
function itemText(it: Item): string[] {
  const out = [it.prompt, it.explain, ...teachStrings(it)];
  if (it.kind === 'choose') out.push(...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
  if (it.scene?.kind === 'text') out.push(...it.scene.lines);
  if (it.scene?.kind === 'counts') out.push(it.scene.title, ...it.scene.rows, ...it.scene.cols, it.scene.pickLabel ?? '', it.scene.caption ?? '');
  return out.filter(Boolean);
}

const boardText = (d: DrillStep): string[] =>
  [
    d.title,
    ...d.body,
    d.done,
    d.twin ?? '',
    ...d.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
    ...(d.misconceptions ?? []).map((m) => m.text),
    ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
  ].filter(Boolean);

function wellFormed(it: ChooseItem, where: string) {
  expect(it.choices.length, where).toBeGreaterThanOrEqual(2);
  expect(it.choices.length, where).toBeLessThanOrEqual(5);
  expect(new Set(it.choices.map((c) => c.label)).size, `${where}: labels`).toBe(it.choices.length);
  expect(it.choices.some((c) => c.id === it.answer), where).toBe(true);
  for (const c of it.choices) {
    if (c.id === it.answer) expect(it.feedback?.[c.id], where).toBeUndefined();
    else {
      expect(it.feedback?.[c.id]?.headline.trim(), `${where} ${c.id}`).toBeTruthy();
      expect(it.whyWrong?.[c.id], `${where} ${c.id}`).toContain(it.feedback![c.id].headline);
    }
  }
  expect(it.teach?.rule.trim(), where).toBeTruthy();
  expect(it.hintCase, where).toBeDefined();
  expect(it.explain.trim().length, where).toBeGreaterThan(0);
}

// ======================= Lesson 1 =======================

describe('Lesson 1 · likely, not certain', () => {
  it('which word fits: the answer is the word for the share of the asked kind', () => {
    for (const skin of BAG_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = wordItem(createRng(seed), skin);
      if (m.model.t !== 'word') throw new Error('model');
      const { counts, ask, form } = m.model;
      const it = ch(m);
      const total = counts.reduce((a, b) => a + b, 0);
      const w = wordOfShare(counts[ask], total);
      expect(it.answer).toBe(form === 'word' ? w : `${SKINS[skin].kinds[ask].id}-${w}`);
      expect(m.tag).toBe('likely');
      wellFormed(it, `${skin} ${seed}`);
    }
  });

  it('which bag: exactly one of the four bags gives the asked word, and it is the answer', () => {
    for (const skin of BAG_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = pickItem(createRng(seed), skin);
      if (m.model.t !== 'pick') throw new Error('model');
      const { bags, ki, target } = m.model;
      const it = ch(m);
      const fit = it.choices.filter((c) => {
        const b = bags[c.id as keyof typeof bags];
        return wordOfShare(b[ki], b[0] + b[1] + b[2]) === target;
      });
      expect(fit.map((c) => c.id), `${skin} ${seed}`).toEqual([it.answer]);
      // Each bag on screen is the bag counted.
      for (const c of it.choices) expect(c.label.length).toBeGreaterThan(3);
      wellFormed(it, `${skin} ${seed}`);
    }
  });

  it('one draw (the trap): the word is judged by the counts; the draw always points the other way', () => {
    for (const form of DRAW_FORMS) for (const skin of BAG_SKINS) for (let seed = 1; seed <= 40; seed++) {
      const m = drawItem(createRng(seed), skin, { form });
      if (m.model.t !== 'draw') throw new Error('model');
      const { counts, ki, said, draw } = m.model;
      const it = ch(m);
      const total = counts[0] + counts[1] + counts[2];
      const right = wordOfShare(counts[ki], total) === said;
      // The draw’s own verdict: Must and Likely point to the kind, Unlikely and Can’t point away from it.
      const pointsTo = said === 'must' || said === 'likely';
      const drawSaysRight = pointsTo ? draw === ki : draw !== ki;
      expect(drawSaysRight, `${form} ${skin} ${seed}`).toBe(!right);
      expect(counts[draw]).toBeGreaterThan(0);
      const answer = it.choices.find((c) => c.id === it.answer)!;
      const outcome = it.choices.find((c) => c.id === 'outcome')!;
      expect(answer.label.startsWith(right ? 'Yes.' : 'No.'), answer.label).toBe(true);
      expect(outcome.label.startsWith(drawSaysRight ? 'Yes.' : 'No.')).toBe(true);
      // The answer is never the only Yes or the only No: a wrong reason shares its Yes or No, so only the counts decide.
      const yesNo = (l: string) => l.split('.')[0];
      expect(it.choices.filter((c) => c.id !== it.answer && yesNo(c.label) === yesNo(answer.label)).length, `${form} ${skin} ${seed}`).toBeGreaterThan(0);
      // A wrong new word (“No. Red was unlikely …”) names a word the counts do not give.
      const reason = it.choices.find((c) => c.id === 'reason')!;
      if (!right) {
        const named = (['Must', 'Likely', 'Unlikely', 'Can’t'] as const).find((w) => reason.label.endsWith(`said ${w}.`));
        expect(named, reason.label).toBeDefined();
        expect({ Must: 'must', Likely: 'likely', Unlikely: 'unlikely', 'Can’t': 'cant' }[named!]).not.toBe(wordOfShare(counts[ki], total));
      }
      expect(it.tags).toEqual(['one-draw']);
      expect(it.conflict).toBe(true);
      expect(it.feedback!.outcome.headline).toContain('one draw');
      wellFormed(it, `${form} ${skin} ${seed}`);
    }
    // Each form is the case its name says.
    expect(DRAW_SPEC.surprise).toEqual({ said: 'likely', truth: 'likely', isK: false });
    expect(DRAW_SPEC.lucky).toEqual({ said: 'must', truth: 'likely', isK: true });
  });

  it('the hint shows a jar case of the other type, never the item’s own answer', () => {
    for (const form of DRAW_FORMS) for (let seed = 1; seed <= 20; seed++) {
      const it = ch(drawItem(createRng(seed), 'marbles', { form }));
      const hc = it.hintCase!;
      expect(hc.label).toContain('jar');
      const right = form === 'surprise' || form === 'rare';
      // A “right word” item gets a lucky case (the word was wrong), and the other way around.
      expect(hc.truths![0].value).toBe(!right);
    }
  });
});

// ======================= Lesson 2 =======================

describe('Lesson 2 · each draw is new', () => {
  it('a fair coin, spinner or cube: after any streak, every way the next try can go splits evenly', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = coinItem(createRng(seed));
      if (m.model.t !== 'coin') throw new Error('model');
      const { k, side, other } = m.model;
      const all = ways(k + 1, side, other).filter((w) => w.slice(0, k).every((x) => x === side));
      const same = all.filter((w) => w[k] === side).length;
      const diff = all.filter((w) => w[k] === other).length;
      const it = ch(m);
      expect(same).toBe(diff);
      expect(it.answer).toBe('same');
      expect(it.tags).toEqual(['due']);
      expect(it.conflict).toBe(true);
      expect(it.explain).toContain(`${same} way ends ${side} and ${diff} way ends ${other}`);
      wellFormed(it, `coin ${seed}`);
    }
  });

  it('Ways to Think’s streak trap keeps its answer and carries the due tag', () => {
    for (const skin of BAG_SKINS) for (let seed = 1; seed <= 30; seed++) {
      const m = bagDueItem(createRng(seed), skin);
      const it = ch(m);
      expect(['still', 'same']).toContain(it.answer);
      expect(it.tags).toEqual(['due']);
      expect(it.conflict).toBe(true);
      wellFormed(it, `${skin} ${seed}`);
    }
  });

  it('kept out: the bag after the draws, taken out one at a time, gives the word; put back changes nothing', () => {
    for (const skin of BAG_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = keptItem(createRng(seed), skin, { form: 'word' });
      if (m.model.t !== 'kept') throw new Error('model');
      const { before, after, ki, k, ask } = m.model;
      const now = bagAfterDraws(before, ki, k);
      expect(now).toEqual([...after]);
      const it = ch(m);
      expect(it.answer).toBe(wordOfShare(now[ask], now[0] + now[1] + now[2]));
      wellFormed(it, `${skin} ${seed}`);
    }
    for (const skin of BAG_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = keptItem(createRng(seed), skin, { form: 'which' });
      if (m.model.t !== 'kept') throw new Error('model');
      const { before, ask, more, who, drew, names } = m.model;
      // Each kid’s bag: the draws kept out are taken away one at a time; draws put back leave the bag as it was.
      const bags = (['first', 'second'] as const).map((id, i) => (who === id ? bagAfterDraws(before, drew![i], 2) : [...before]));
      const share = (b: number[]) => b[ask] / (b[0] + b[1] + b[2]);
      const [s0, s1] = bags.map(share);
      const want = s0 === s1 ? 'same' : (s0 > s1) === more ? 'first' : 'second';
      const it = ch(m);
      expect(it.answer, `${skin} ${seed}`).toBe(want);
      // The story says who kept the draws out; when nobody did, the two kids drew different kinds and both bags are the same.
      if (who === 'none') {
        expect(it.answer).toBe('same');
        expect(drew![0]).not.toBe(drew![1]);
        for (const n of names) expect(it.prompt).toContain(`${n} takes out 2`);
        expect(it.prompt).not.toContain('keeps');
      } else {
        expect(it.answer).not.toBe('same');
        expect(drew![0]).toBe(drew![1]);
        expect(it.prompt).toContain(`${names[who === 'first' ? 0 : 1]} takes out 2`);
      }
      expect(it.choices.map((c) => c.label).sort()).toEqual([`For ${names[0]}.`, `For ${names[1]}.`, 'It is the same for both of them.'].sort());
      wellFormed(it, `${skin} ${seed}`);
    }
  });

  it('the word changes in many kept-out items, so the old word is often wrong', () => {
    let changed = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = keptItem(createRng(seed), 'marbles', { form: 'word' });
      if (m.model.t !== 'kept') throw new Error('model');
      const { before, after, ask } = m.model;
      if (wordOfShare(before[ask], before[0] + before[1] + before[2]) !== wordOfShare(after[ask], after[0] + after[1] + after[2])) changed++;
    }
    expect(changed).toBeGreaterThan(SEEDS / 3);
  });
});

// ======================= Lesson 3 =======================

describe('Lesson 3 · out of 100', () => {
  const pics = (m: CountMade) => {
    const md = m.model;
    if (md.t === 'read' || md.t === 'fits' || md.t === 'more' || md.t === 'of') return md.pic;
    throw new Error('not a group item');
  };

  it('every group picture: 100 things, the rare group mostly has the clue, the common group mostly does not', () => {
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const p = pics(readItem(createRng(seed), { skin }));
      expect(spread(p.cells).length).toBe(100);
      // Every box, row and column has its own count.
      const parts = [...p.cells.flat(), count(p.cells, (t) => t.row === 0), count(p.cells, (t) => t.row === 1), count(p.cells, (t) => t.yes), count(p.cells, (t) => !t.yes)];
      expect(new Set(parts).size).toBe(8);
      const a = count(p.cells, (t) => t.row === 0), b = count(p.cells, (t) => t.row === 1);
      expect(a).toBeLessThan(b);
      expect(count(p.cells, (t) => t.row === 0 && t.yes) / a).toBeGreaterThan(0.5);
      expect(count(p.cells, (t) => t.row === 1 && t.yes) / b).toBeLessThan(0.5);
      expect(p.topic.id).not.toBe('farm');
    }
  });

  it('reading a part: the answer is the count of the 100 things the question names; every wrong number counts something else', () => {
    const asks = {
      aTotal: (t: { row: number; yes: boolean }) => t.row === 0,
      bTotal: (t: { row: number; yes: boolean }) => t.row === 1,
      yesTotal: (t: { row: number; yes: boolean }) => t.yes,
      aYes: (t: { row: number; yes: boolean }) => t.row === 0 && t.yes,
      bYes: (t: { row: number; yes: boolean }) => t.row === 1 && t.yes,
    } as const;
    for (const ask of Object.keys(asks) as (keyof typeof asks)[]) for (const skin of COUNT_SKINS) for (let seed = 1; seed <= 40; seed++) {
      const m = readItem(createRng(seed), { skin, ask });
      const it = ch(m);
      const n = count(pics(m).cells, asks[ask]);
      expect(it.choices.find((c) => c.id === it.answer)!.label).toBe(String(n));
      for (const c of it.choices) if (c.id !== it.answer) expect(c.label).not.toBe(String(n));
      expect(it.choices.length).toBeGreaterThanOrEqual(3);
      wellFormed(it, `${ask} ${skin} ${seed}`);
      // The hint reads another part, and its numbers never hold the answer.
      expect(`${it.hintCase!.label} ${it.hintCase!.note}`).not.toMatch(new RegExp(`\\b${n}\\b`));
    }
  });

  it('which group the clue is more common in: the bigger share, counted out of each row', () => {
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = fitsItem(createRng(seed), { skin });
      const c = pics(m).cells;
      const shareA = count(c, (t) => t.row === 0 && t.yes) / count(c, (t) => t.row === 0);
      const shareB = count(c, (t) => t.row === 1 && t.yes) / count(c, (t) => t.row === 1);
      expect(ch(m).answer).toBe(shareA > shareB ? 'a' : shareA < shareB ? 'b' : 'same');
      // Every picture keeps its own count in each box, row and column; the two groups are never the same size.
      const parts = [...c.flat(), count(c, (t) => t.row === 0), count(c, (t) => t.row === 1), count(c, (t) => t.yes), count(c, (t) => !t.yes)];
      expect(new Set(parts).size).toBe(8);
      expect(spread(c).length).toBe(100);
      // The hint’s small case comes out the other way: the bigger group (blue caps) wins it, unless this item’s answer
      // is the bigger group, and then the smaller group (red caps) wins it.
      const hint = ch(m).hintCase!.truths!;
      expect(hint.find((x) => x.who === 'Soccer is more common among blue caps')!.value).toBe(ch(m).answer !== 'b');
      wellFormed(ch(m), `${skin} ${seed}`);
    }
  });

  it('the trap: the clue fits the rare group better, yet more things with the clue are in the common group', () => {
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = moreItem(createRng(seed), { skin, want: 'common' });
      const it = ch(m);
      const c = pics(m).cells;
      const yesA = count(c, (t) => t.row === 0 && t.yes), yesB = count(c, (t) => t.row === 1 && t.yes);
      const shareA = yesA / count(c, (t) => t.row === 0), shareB = yesB / count(c, (t) => t.row === 1);
      expect(shareA).toBeGreaterThan(shareB);
      expect(yesB).toBeGreaterThan(yesA);
      expect(it.answer).toBe('b');
      expect(it.tags).toEqual(['base-rate']);
      expect(it.conflict).toBe(true);
      expect(it.feedback!.a.headline).toBe('Your answer leaves out how common each group is.');
      // The hint’s small case comes out the other way: the rare group (red caps) wins there.
      expect(it.hintCase!.truths!.find((x) => x.who === 'More likely a red cap')!.value).toBe(true);
      wellFormed(it, `${skin} ${seed}`);
    }
    // Its twin, where the rare group is big enough to win: no trap tag, the answer is the rare group.
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = moreItem(createRng(seed), { skin, want: 'rare' });
      const c = pics(m).cells;
      expect(ch(m).answer).toBe(count(c, (t) => t.row === 0 && t.yes) > count(c, (t) => t.row === 1 && t.yes) ? 'a' : 'b');
      expect(ch(m).answer).toBe('a');
      expect(ch(m).tags).toBeUndefined();
    }
  });

  it('out of the column: the answer counts the group’s things with the clue out of every thing with the clue', () => {
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = ofItem(createRng(seed), { skin });
      if (m.model.t !== 'of') throw new Error('model');
      const c = m.model.pic.cells, g = m.model.group;
      const x = count(c, (t) => t.row === g && t.yes), all = count(c, (t) => t.yes);
      const it = ch(m);
      expect(it.choices.find((ch) => ch.id === it.answer)!.label).toBe(`${x} of ${all}`);
      expect(it.prompt).toContain(`Of the ${all} `);
      wellFormed(it, `${skin} ${seed}`);
    }
  });
});

// ======================= Lesson 4 =======================

describe('Lesson 4 · would I see this clue if I were wrong?', () => {
  it('the trap: a test right for at least 75 of 100 still gives more false alarms than right yes answers when the thing is rare', () => {
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = alarmItem(createRng(seed), { skin, want: 'rare' });
      if (m.model.t !== 'alarm') throw new Error('model');
      const c = m.model.pic.cells;
      const right = count(c, (t) => (t.row === 0) === t.yes);
      const hits = count(c, (t) => t.row === 0 && t.yes), alarms = count(c, (t) => t.row === 1 && t.yes);
      const has = count(c, (t) => t.row === 0);
      expect(right).toBeGreaterThanOrEqual(75);
      expect(hits).toBeGreaterThanOrEqual(has - 1);
      expect(alarms).toBeGreaterThan(hits);
      const it = ch(m);
      expect(it.answer).toBe('not');
      expect(it.tags).toEqual(['false-alarm']);
      expect(it.conflict).toBe(true);
      expect(m.model.pic.topic.id).not.toBe('eyes');
      // The hint’s small case comes out the other way: there, a yes is more likely right.
      expect(it.hintCase!.truths![0]).toEqual({ who: 'A yes is more likely right', value: true });
      wellFormed(it, `${skin} ${seed}`);
    }
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = alarmItem(createRng(seed), { skin, want: 'common' });
      if (m.model.t !== 'alarm') throw new Error('model');
      const c = m.model.pic.cells;
      expect(ch(m).answer).toBe(count(c, (t) => t.row === 0 && t.yes) > count(c, (t) => t.row === 1 && t.yes) ? 'has' : 'not');
      expect(ch(m).answer).toBe('has');
      expect(ch(m).tags).toBeUndefined();
    }
  });

  it('how often a yes is right: the yes answers that are right out of every yes answer', () => {
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = answerItem(createRng(seed), { skin });
      if (m.model.t !== 'answer') throw new Error('model');
      const c = m.model.pic.cells;
      const it = ch(m);
      const label = `${count(c, (t) => t.row === 0 && t.yes)} of ${count(c, (t) => t.yes)}`;
      expect(it.choices.find((x) => x.id === it.answer)!.label).toBe(label);
      for (const x of it.choices) if (x.id !== it.answer) expect(x.label).not.toBe(label);
      wellFormed(it, `${skin} ${seed}`);
    }
  });

  it('which clue tells more: the bigger share when right over share when wrong; the weak clue is seen often either way', () => {
    let conflicts = 0;
    let ties = 0;
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = strongItem(createRng(seed), { skin });
      if (m.model.t !== 'strong') throw new Error('model');
      const p = m.model.pic;
      const ratio = (x: readonly number[]) => x[0] / 10 / (x[1] / 10);
      const [r0, r1] = p.counts.map(ratio);
      const it = ch(m);
      expect(it.answer).toBe(r0 === r1 ? 'same' : p.topic.clues[r0 > r1 ? 0 : 1].id);
      if (r0 === r1) {
        // A tie: the same counts for both clues, each seen rarely when you are wrong.
        expect(p.counts[0]).toEqual(p.counts[1]);
        expect(p.counts[0][1]).toBeLessThanOrEqual(2);
        ties++;
      } else {
        const [strong, weak] = r0 > r1 ? [p.counts[0], p.counts[1]] : [p.counts[1], p.counts[0]];
        expect(weak[1]).toBeGreaterThanOrEqual(5);
        expect(strong[1]).toBeLessThanOrEqual(2);
        if (weak[0] > strong[0]) conflicts++;
      }
      expect(p.topic.id).not.toBe(RAIN.id);
      // The hint is a separate small case, never one of this item’s two clues.
      const said = `${it.hintCase!.label} ${it.hintCase!.note}`;
      for (const d of p.topic.clues) expect(said).not.toContain(d.seen);
      wellFormed(it, `${skin} ${seed}`);
    }
    // Many items have the weak clue seen more often when you are right, so the clue seen most is the wrong pick.
    expect(conflicts).toBeGreaterThan(SEEDS);
    expect(ties).toBeGreaterThan(SEEDS / 5);
  });
});

// ======================= answer balance =======================

/**
 * Over 300 seeds, each family’s right answer moves across its choices: no choice is right more than 60 percent of the
 * time, and every choice that can be right is right at least once. The story moves it (who keeps the draws out, which
 * clue is the strong one, which group the clue fits, the word the bag gives), and the model works out the answer; the
 * labels never change meaning. Left out by design: the coin (a fair coin’s next flip is always just as likely), the
 * one-draw item (the right reason is always the counts, and its Yes or No moves), the why items (the right reason is
 * the stop’s idea), the column counts (always out of the group the question names, while the numbers move), and the
 * traps (moreItem 'common', alarmItem 'rare'), whose new examples bring the other answer.
 */
describe('answer balance: the story moves the right answer across the choices', () => {
  const N = 300;
  const seeds = Array.from({ length: N }, (_, i) => i + 1);
  const bagSkin = (seed: number) => BAG_SKINS[seed % BAG_SKINS.length];
  const countSkin = (seed: number) => COUNT_SKINS[seed % COUNT_SKINS.length];

  /** Each answer that came up is right at most 60 percent of the time, and the answers that came up are exactly `canBeRight`. */
  function expectSpread(name: string, answers: string[], canBeRight: string[]) {
    const counts = new Map<string, number>();
    for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1);
    expect([...counts.keys()].sort(), `${name}: the answers that come up`).toEqual([...canBeRight].sort());
    for (const [a, k] of counts) expect(k / answers.length, `${name}: ${a} is right ${k} of ${answers.length} times`).toBeLessThanOrEqual(0.6);
  }

  it('kept out, which kid: either kid or neither, by who keeps the draws out and what the question asks', () => {
    const byName: string[] = [], byRole: string[] = [];
    for (const seed of seeds) {
      const m = keptItem(createRng(seed), bagSkin(seed), { form: 'which' });
      if (m.model.t !== 'kept') throw new Error('model');
      const it = ch(m);
      byName.push(it.answer);
      byRole.push(it.answer === 'same' ? 'same' : it.answer === m.model.who ? 'kept out' : 'put back');
      // A choice names a kid only: whether that kid kept the draws out is in the story, never in the label.
      for (const c of it.choices) expect(c.label).not.toMatch(/kept|back/);
    }
    expectSpread('which kid (by name)', byName, ['first', 'second', 'same']);
    expectSpread('which kid (by what the kid did)', byRole, ['kept out', 'put back', 'same']);
  });

  it('kept out, which word: every word, from the bag after the draws', () => {
    const answers = seeds.map((seed) => ch(keptItem(createRng(seed), bagSkin(seed), { form: 'word' })).answer);
    expectSpread('kept out, which word', answers, ['must', 'likely', 'unlikely', 'cant']);
  });

  it('which clue tells more: either of the topic’s clues, or just as much, by the counts in the story', () => {
    const byClue: string[] = [], byPlace: string[] = [];
    const perTopic = new Map<string, Set<string>>();
    for (const seed of seeds) {
      const m = strongItem(createRng(seed), { skin: countSkin(seed) });
      if (m.model.t !== 'strong') throw new Error('model');
      const it = ch(m);
      const t = m.model.pic.topic;
      byClue.push(it.answer === 'same' ? 'same' : it.answer === t.clues[0].id ? 'clue 1' : 'clue 2');
      byPlace.push(it.answer === 'same' ? 'same' : it.choices[0].id === it.answer ? 'shown first' : 'shown second');
      perTopic.set(t.id, (perTopic.get(t.id) ?? new Set()).add(it.answer));
    }
    // “Neither one tells you anything” is never right: a picture always has a clue seen less often when you are wrong.
    expectSpread('which clue (by the topic’s clue)', byClue, ['clue 1', 'clue 2', 'same']);
    expectSpread('which clue (by where it is shown)', byPlace, ['shown first', 'shown second', 'same']);
    // No topic fixes its strong clue: each topic’s two clues are each the answer at least once.
    expect([...perTopic.keys()].sort()).toEqual(CLUE_TOPICS.map((t) => t.id).sort());
    for (const t of CLUE_TOPICS) for (const d of t.clues) expect(perTopic.get(t.id)!.has(d.id), `${t.id}: ${d.id} is right at least once`).toBe(true);
  });

  it('which group the clue is more common in: the rare group, the common group, or both, by the picture', () => {
    const answers = seeds.map((seed) => ch(fitsItem(createRng(seed), { skin: countSkin(seed) })).answer);
    expectSpread('which group the clue fits', answers, ['a', 'b', 'same']);
  });

  it('the families that already moved still do', () => {
    expectSpread('which word', seeds.map((seed) => ch(wordItem(createRng(seed), bagSkin(seed), { form: 'word' })).answer), ['must', 'likely', 'unlikely', 'cant']);
    expectSpread('which bag', seeds.map((seed) => ch(pickItem(createRng(seed), bagSkin(seed))).answer), ['must', 'likely', 'unlikely', 'cant']);
    expectSpread('the streak trap', seeds.map((seed) => ch(bagDueItem(createRng(seed), bagSkin(seed))).answer), ['still', 'same']);
    expectSpread('read a part', seeds.map((seed) => ch(readItem(createRng(seed), { skin: countSkin(seed) })).answer), ['aTotal', 'bTotal', 'yesTotal', 'aYes', 'bYes']);
    expectSpread('which group (either way)', seeds.map((seed) => ch(moreItem(createRng(seed), { skin: countSkin(seed), want: 'any' })).answer), ['a', 'b']);
    expectSpread(
      'a yes from a test (either way)',
      seeds.map((seed) => {
        const rng = createRng(seed);
        return ch(alarmItem(rng, { skin: countSkin(seed), want: rng.pick(['rare', 'common'] as const) })).answer;
      }),
      ['has', 'not'],
    );
  });
});

// ======================= the why items =======================

describe('the closing why item: the right reason is true of the picture, every wrong reason is false', () => {
  it('every kind, many seeds', () => {
    for (const kind of WHY_KINDS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = whyItem(createRng(seed), { kind });
      const it = ch(m);
      if (m.model.t !== 'why') throw new Error('model');
      expect(it.tags).toEqual(['why']);
      for (const c of it.choices) expect(c.label.length, c.label).toBeGreaterThan(12);
      wellFormed(it, `${kind} ${seed}`);
      const right = it.choices.find((c) => c.id === it.answer)!.label;
      const md = m.model;
      if (kind === 'due') {
        const { k, side, other } = md.coin!;
        const all = ways(k + 1, side, other).filter((w) => w.slice(0, k).every((x) => x === side));
        expect(all.filter((w) => w[k] === side).length).toBe(all.filter((w) => w[k] === other).length);
        expect(it.answer).toBe('new');
      }
      if (kind === 'common') {
        const c = md.group!.cells;
        const yesA = count(c, (t) => t.row === 0 && t.yes), yesB = count(c, (t) => t.row === 1 && t.yes);
        expect(yesB).toBeGreaterThan(yesA);
        expect(right).toContain(String(yesB));
        // “More common among the common group” is false out of each row; “most with the clue are the rare group” is false.
        expect(yesA / count(c, (t) => t.row === 0)).toBeGreaterThan(yesB / count(c, (t) => t.row === 1));
        expect(2 * yesA).toBeLessThan(yesA + yesB);
        expect(yesA).toBeGreaterThan(0);
      }
      if (kind === 'alarm') {
        const c = md.test!.cells;
        const hits = count(c, (t) => t.row === 0 && t.yes), alarms = count(c, (t) => t.row === 1 && t.yes);
        expect(right).toBe(`Of the ${hits + alarms} ${md.test!.topic.test.flags}, ${alarms} are false alarms and only ${hits} are right.`);
        // “Wrong for most” and “misses most” are false here.
        expect(count(c, (t) => (t.row === 0) === t.yes)).toBeGreaterThan(50);
        expect(2 * hits).toBeGreaterThanOrEqual(count(c, (t) => t.row === 0));
      }
      if (kind === 'weak') {
        const p = md.clue!;
        const ratio = (x: readonly number[]) => x[0] / x[1];
        const wi = ratio(p.counts[0]) < ratio(p.counts[1]) ? 0 : 1;
        expect(ratio(p.counts[0])).not.toBe(ratio(p.counts[1]));
        expect(right).toContain(p.topic.clues[wi].say(p.counts[wi][1], false));
        expect(p.counts[wi][0]).toBeGreaterThanOrEqual(6); // “you hardly ever see it when right” is false
        expect(p.counts[1 - wi][1]).toBeLessThanOrEqual(2); // “the strong clue is weak too” is false
      }
    }
  });
});

// ======================= the lessons =======================

describe('the lessons: packs, traps, pass rules, terms', () => {
  const TRAP: Record<string, string> = { 's13.l1': 'one-draw', 's13.l2': 'due', 's13.l3': 'base-rate', 's13.l4': 'false-alarm' };

  it('every pack: 4 items of its rule family, its trap, at least two skins, the same for the same seed', () => {
    const frameOf = (it: Item): string => {
      const s = it.prompt + JSON.stringify(it.scene ?? '');
      for (const t of [...GROUP_TOPICS, ...TEST_TOPICS]) if (it.prompt.startsWith(t.setting)) return t.skin;
      for (const t of CLUE_TOPICS) if (it.prompt.startsWith(t.question)) return t.skin;
      if (/fair coin|fair spinner|fair cube/.test(s)) return 'coin';
      for (const id of BAG_SKINS) {
        const sk = SKINS[id];
        if (s.includes(sk.the) || s.includes(` ${sk.nouns}`)) return sk.frame;
      }
      return 'unknown';
    };
    for (const l of stop13.lessons) for (let seed = 1; seed <= 120; seed++) {
      const items = l.practice(createRng(seed));
      expect(items.length).toBe(4);
      expect(items.filter((i) => i.tags?.includes(TRAP[l.id])).length, `${l.id} ${seed}`).toBeGreaterThanOrEqual(1);
      for (const i of items) expect(i.skill.startsWith('s13.')).toBe(true);
      expect(new Set(items.map(looks)).size).toBe(4);
      expect(new Set(items.map(frameOf)).size, `${l.id} ${seed}: skins`).toBeGreaterThanOrEqual(2);
      expect(l.practice(createRng(seed))).toEqual(items);
      expect(l.pass).toEqual({ firstTry: 3, include: [{ tag: TRAP[l.id], label: expect.any(String) }] });
    }
    // The skills each lesson asks about.
    const skills = (l: (typeof stop13.lessons)[number]) => new Set(Array.from({ length: 30 }, (_, s) => l.practice(createRng(s + 1)).map((i) => i.skill)).flat());
    expect([...skills(L1)]).toEqual(['s13.likely']);
    expect([...skills(L2)]).toEqual(['s13.due']);
    expect([...skills(L3)]).toEqual(['s13.hundred']);
    expect([...skills(L4)].sort()).toEqual(['s13.clue', 's13.why']);
  });

  it('terms: each word is on the lesson whose card names it', () => {
    const want: Record<string, string[]> = { 's13.l1': ['likely', 'certain'], 's13.l2': ['independent'], 's13.l3': ['base rate'], 's13.l4': ['false alarm', 'strong clue'] };
    for (const l of stop13.lessons) {
      expect((l.terms ?? []).map((t) => t.term)).toEqual(want[l.id]);
      const cards = l.ideas.flatMap((c) => c.body).join(' ').toLowerCase();
      for (const t of l.terms ?? []) expect(cards, `${l.id} names ${t.term}`).toContain(t.term);
    }
    expect(L2.terms![0].also).toBe('each draw is new');
    expect(L3.terms![0].also).toBe('how common it is');
  });

  it('distinctions: each lesson declares one, with its contrast card and a board right after it', () => {
    const declared = [COUNTS_VS_DRAW, BACK_VS_KEPT, ROW_VS_COLUMN, RIGHT_VS_FLAG];
    stop13.lessons.forEach((l, i) => {
      expect(l.distinctions).toEqual([declared[i]]);
      const k = l.ideas.findIndex((c) => c.distinction === declared[i].id);
      expect(l.ideas[k].scene?.kind).toBe('contrast');
      const board = l.drill!.find((d) => d.distinction === declared[i].id)!;
      expect(board.afterCard).toBe(k);
      expect(board.misconceptions?.length).toBeGreaterThan(0);
      expect(board.confused?.length).toBeGreaterThan(0);
    });
    // The brief’s distinction: how often the test is right is not how often a yes is right.
    expect(RIGHT_VS_FLAG.a).toContain('How often the test is right');
    expect(RIGHT_VS_FLAG.b).toContain('How often a flag is right');
  });

  it('card order: the contrast card and its board come first, then the worked example and its board', () => {
    for (const l of stop13.lessons) {
      const c = l.ideas.findIndex((x) => x.distinction);
      const e = l.ideas.findIndex((x) => x.title.startsWith('Example'));
      expect(c, `${l.id}: a contrast card`).toBeGreaterThanOrEqual(0);
      expect(e, `${l.id}: the worked example comes right after the contrast card`).toBe(c + 1);
      const boards = l.drill!;
      const cb = boards.findIndex((d) => d.distinction);
      const eb = boards.findIndex((d) => d.afterCard === e);
      expect(boards[cb].afterCard, `${l.id}: the contrast board follows its card`).toBe(c);
      expect(eb, `${l.id}: the worked example has its board`).toBeGreaterThan(cb);
      // The example’s board shows the example, or a twin that says what changed.
      if (boards[eb].twin) expect(boards[eb].twin!.trim().length, `${l.id}: the twin says what changed`).toBeGreaterThan(0);
      else expect(JSON.stringify(boards[eb].scene), `${l.id}: the example’s board shows the example`).toBe(JSON.stringify(l.ideas[e].scene));
      // The runner opens each board after its card, in order, so the boards’ cards never go back.
      const after = boards.map((d) => d.afterCard!);
      expect(after, l.id).toEqual([...after].sort((a, b) => a - b));
    }
  });
});

// ======================= the boards =======================

describe('the boards: every mark worked out again, the right marks pass, the mix-ups are caught', () => {
  const right = (d: DrillStep) => Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]));

  it('every board: words for every wrong option, the right marks pass, at most 12 taps', () => {
    for (const l of stop13.lessons) for (const d of l.drill!) {
      for (const m of marksToTap(d)) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim(), `${d.id} ${m.id} ${o.id}`).toBeTruthy();
      expect(checkDrill(d, right(d)).done, d.id).toBe(true);
      expect(marksToTap(d).length, d.id).toBeLessThanOrEqual(12);
    }
  });

  it('Lesson 1, the worked bag’s board: each sentence’s word from counting the cards on the board', () => {
    const d = L1.drill!.find((x) => x.id === 's13.l1-do1')!;
    const things = (L1_SCENE as Extract<Scene, { kind: 'things' }>).things;
    const fits: Record<string, (t: Thing) => boolean> = {
      red: (t) => t.color === 'red', blue: (t) => t.color === 'blue', yellow: (t) => t.color === 'yellow', 'red-or-blue': (t) => t.color !== 'yellow', after: (t) => t.color === 'red',
    };
    for (const r of d.rows) {
      if (!fits[r.id]) continue;
      expect(r.marks[0].answer, r.id).toBe(wordOfShare(things.filter(fits[r.id]).length, things.length));
    }
    expect(things.length).toBe(10);
  });

  it('Lesson 1, board 1 (the jar): the word is judged by the counts, and judging by the draw is caught', () => {
    const d = L1.drill![0];
    const total = JAR.lemon + JAR.cherry;
    for (const c of JAR_CASES) {
      const ok = wordOfShare(JAR[c.flavor], total) === c.said;
      expect(d.rows.find((r) => r.id === c.id)!.marks[0].answer).toBe(ok ? 'yes' : 'no');
    }
    // Two right words against the draw, two wrong words with it.
    expect(d.rows.map((r) => r.marks[0].answer)).toEqual(['yes', 'no', 'yes', 'no']);
    for (const c of JAR_CASES) {
      const r = d.rows.find((x) => x.id === c.id)!;
      const wrong = r.marks[0].answer === 'yes' ? 'no' : 'yes';
      expect(checkDrill(d, { ...right(d), [`${c.id}-right`]: wrong }).diagnosis).toBe('outcome-as-word');
    }
  });

  it('Lesson 2, board 2: three flips listed here; after heads, heads, the ways split evenly', () => {
    const d = L2.drill![1];
    const all = ways(3, 'heads', 'tails');
    const hh = all.filter((w) => w[0] === 'heads' && w[1] === 'heads');
    const marks = Object.fromEntries(d.rows[0].marks.map((m) => [m.id, m.answer]));
    expect(marks.start).toBe(String(hh.length));
    expect(marks['end-h']).toBe(String(hh.filter((w) => w[2] === 'heads').length));
    expect(marks['end-t']).toBe(String(hh.filter((w) => w[2] === 'tails').length));
    expect(marks.next).toBe('same');
    expect((d.scene as Extract<Scene, { kind: 'text' }>).lines.slice(1)).toEqual(all.map((w) => w.join(', ')));
    expect(checkDrill(d, { ...right(d), next: 'more' }).diagnosis).toBe('due');
  });

  it('Lesson 2, board 1: each case’s bag, taken out one at a time, and its word', () => {
    const d = L2.drill![0];
    for (const c of KEPT_CASES) {
      const things = L2_BAG.flatMap((n, i) => Array.from({ length: n }, () => i));
      for (const x of c.draws) if (!x.back) things.splice(things.indexOf(x.kind), 1);
      const red = things.filter((x) => x === 0).length;
      const r = d.rows.find((x) => x.id === c.id)!;
      expect(r.marks[0].answer, c.id).toBe(things.length === 5 && red === 3 ? 'yes' : 'no');
      expect(r.marks[1].answer, c.id).toBe(wordOfShare(red, things.length));
    }
    expect(checkDrill(d, { ...right(d), 'k3-same': 'yes' }).diagnosis).toBe('kept-as-back');
    expect(checkDrill(d, { ...right(d), 'k4-same': 'no' }).diagnosis).toBe('streak-changes');
  });

  it('Lesson 3: the farm boards, counted from 100 animals; the twin has the goats win', () => {
    const [b2, b1, b3] = L3.drill!;
    const F = FARM_PIC.cells;
    expect(b1.scene).toEqual(FARM_SCENE);
    expect(b1.rows.map((r) => r.marks[0].answer)).toEqual([count(F, (t) => t.row === 1), count(F, (t) => !t.yes), count(F, (t) => t.row === 1 && t.yes)].map(String));
    for (const s of rowColumnSentences()) {
      const r = b2.rows.find((x) => x.id === s.id)!;
      expect(r.marks[0].answer).toBe(/brown animals/.test(s.says) ? 'col' : 'row');
    }
    // “Most brown animals are goats” is false; “Most goats are brown” is true.
    expect(b2.rows.find((r) => r.label === 'Most brown animals are goats.')!.marks[1].answer).toBe(count(F, (t) => t.row === 0 && t.yes) * 2 > count(F, (t) => t.yes) ? 'true' : 'false');
    expect(b2.rows.find((r) => r.label === 'Most goats are brown.')!.marks[1].answer).toBe('true');
    expect(checkDrill(b2, { ...right(b2), 's2-truth': 'true' }).diagnosis).toBe('row-as-column');
    const T = FARM_TWIN.cells;
    expect(b3.twin?.trim()).toBeTruthy();
    expect(b3.rows.map((r) => r.marks[0].answer)).toEqual([String(count(T, (t) => t.row === 0 && t.yes)), String(count(T, (t) => t.row === 1 && t.yes)), count(T, (t) => t.row === 0 && t.yes) > count(T, (t) => t.row === 1 && t.yes) ? 'a' : 'b']);
    expect(b3.rows[2].marks[0].answer).toBe('a');
    // On the card’s farm the sheep win; on the twin the goats do: how common each group is changes the answer.
    expect(count(F, (t) => t.row === 1 && t.yes)).toBeGreaterThan(count(F, (t) => t.row === 0 && t.yes));
    expect(spread(T).length).toBe(100);
  });

  it('Lesson 4: the rain board by share over share; the eye check twin and the sentences counted from 100 kids', () => {
    const [b0, b2, b1] = L4.drill!;
    const ratio = (x: readonly number[]) => x[0] / x[1];
    expect(b0.rows.find((r) => r.id === 'best')!.marks[0].answer).toBe(RAIN.clues[ratio(RAIN_COUNTS[1]) > ratio(RAIN_COUNTS[0]) ? 1 : 0].id);
    const T = EYES_TWIN.cells;
    expect(b1.twin?.trim()).toBeTruthy();
    expect(b1.rows.slice(0, 3).map((r) => r.marks[0].answer)).toEqual([count(T, (t) => t.yes), count(T, (t) => t.row === 1 && t.yes), count(T, (t) => (t.row === 0) === t.yes)].map(String));
    expect(b1.rows[3].marks[0].answer).toBe('not');
    const E = EYES_PIC.cells;
    expect(b2.scene).toEqual(EYES_SCENE);
    const truth: Record<string, boolean> = {
      t1: count(E, (t) => t.row === 0 && t.yes) === count(E, (t) => t.row === 0),
      t2: count(E, (t) => (t.row === 0) === t.yes) > 50,
      t3: 2 * count(E, (t) => t.row === 0 && t.yes) > count(E, (t) => t.yes),
      t4: 2 * count(E, (t) => t.row === 1 && t.yes) > count(E, (t) => t.yes),
    };
    for (const s of flagSentences()) expect(b2.rows.find((r) => r.id === s.id)!.marks[1].answer, s.id).toBe(truth[s.id] ? 'true' : 'false');
    expect(truth).toEqual({ t1: true, t2: true, t3: false, t4: true });
    expect(checkDrill(b2, { ...right(b2), 't3-truth': 'true' }).diagnosis).toBe('right-as-flag');
  });
});

// ======================= the stop =======================

describe('the stop: check, Arcade, new examples, warm-up, skill names', () => {
  it('9 items: two per lesson in order (a trap first in each pair), then the why item last; many looks per slot', () => {
    const slots = Array.from({ length: 9 }, () => new Set<string>());
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop13.check!(createRng(seed));
      expect(items.map((i) => i.lesson).slice(0, 8)).toEqual(['s13.l1', 's13.l1', 's13.l2', 's13.l2', 's13.l3', 's13.l3', 's13.l4', 's13.l4']);
      for (const k of [0, 2, 4, 6]) expect(items[k].conflict, `seed ${seed} slot ${k}`).toBe(true);
      const last = items[8] as ChooseItem;
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s13.why');
      expect(last.kind).toBe('choose');
      for (const c of last.choices) expect(c.label.length).toBeGreaterThan(12);
      expect(new Set(items.map(looks)).size).toBe(9);
      items.forEach((it, k) => slots[k].add(looks(it)));
      expect(stop13.check!(createRng(seed))).toEqual(items);
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(100);
  });

  it('Arcade: valid items from every lesson', () => {
    const lessons = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const it = stop13.practice!(createRng(seed)) as ChooseItem;
      expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
      lessons.add(it.lesson);
    }
    expect([...lessons].sort()).toEqual(['s13.l1', 's13.l2', 's13.l3', 's13.l4']);
  });

  it('new examples: a missed trap gets a pair whose answers differ; others get the same kind about another topic', () => {
    for (let seed = 1; seed <= 80; seed++) for (const l of stop13.lessons) for (const missed of l.practice(createRng(seed))) {
      const out = stop13.fresh!(missed, createRng(seed + 500)) as ChooseItem[];
      expect(out.length, missed.id).toBeGreaterThanOrEqual(1);
      for (const f of out) {
        expect(f.skill.startsWith('s13.')).toBe(true);
        expect(looks(f)).not.toBe(looks(missed));
      }
      if (missed.tags?.some((t) => ['one-draw', 'base-rate', 'false-alarm'].includes(t))) {
        expect(out.length).toBe(2);
        const said = out.map((f) => (f.choices.find((c) => c.id === f.answer)!.label.startsWith('Yes') ? 'yes' : f.answer));
        expect(new Set(said).size, `${missed.id} ${seed}: the pair's answers differ`).toBe(2);
      }
      if (missed.tags?.includes('due') && missed.kind === 'choose' && missed.choices.some((c) => c.id === 'streak')) expect(new Set(out.map((f) => f.answer)).size).toBe(2);
      if (missed.skill === 's13.why') expect(out.map((f) => f.tags)).toEqual([['why'], ['why']]);
    }
  });

  it('a new example after a missed count item is about another topic, even where two topics share an opening line', () => {
    // “A deck has 100 cards.” opens a group picture (gold edges) and a test picture (a light that blinks).
    const head = (it: Item) => JSON.stringify([it.prompt.split('.')[0], it.scene?.kind === 'counts' ? it.scene.cols : null]);
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= 40; seed++) {
      for (const m of [alarmItem(createRng(seed), { skin, want: 'rare' }), answerItem(createRng(seed), { skin }), readItem(createRng(seed), { skin }), moreItem(createRng(seed), { skin, want: 'common' })]) {
        const missed = { id: 'x', stop: 13, lesson: m.tag === 'clue' ? 's13.l4' : 's13.l3', skill: `s13.${m.tag}`, ...m.item } as Item;
        const [first] = stop13.fresh!(missed, createRng(seed + 900));
        expect(head(first), `${skin} ${seed} ${missed.prompt}`).not.toBe(head(missed));
      }
    }
  });

  it('the warm-up: a Ways to Think “good guess is not a proof” item, finished as a Stop 13 item', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const it = stop13.bridge!(createRng(seed)) as ChooseItem;
      expect([it.stop, it.lesson, it.skill]).toEqual([13, 's13.l1', 's13.guess']);
      // No symbols in anything the warm-up shows (Stop 7’s abstract grid legend uses check marks and crosses).
      expect(itemText(it).join(' ')).not.toMatch(/[✓✗=+→%/<>]/);
      expect(['guess', 'saw']).toContain(it.answer);
      const ans = it.choices.find((c) => c.id === it.answer)!.label;
      // The right answer never calls a guess a proof.
      expect(ans).not.toMatch(/^Yes\./);
      expect(/proof|best guess|for sure/.test(`${it.prompt} ${it.explain}`)).toBe(true);
      expect(stop13.bridge!(createRng(seed))).toEqual(it);
      seen.add(looks(it));
    }
    expect(seen.size).toBeGreaterThan(60);
  });

  it('the stop is ready on the side track after Spot the Trick, with a plain name for every skill and its real-life pack', () => {
    expect(stopById('s13')).toBe(stop13);
    expect([stop13.ready, stop13.sideTrack, stop13.requires]).toEqual([true, true, ['s12']]);
    expect(STOPS.filter((s) => s.sideTrack).map((s) => s.id)).toEqual(['s12', 's13']);
    const skills = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of stop13.lessons) for (const it of l.practice(createRng(seed))) skills.add(it.skill);
      for (const it of stop13.check!(createRng(seed))) skills.add(it.skill);
      skills.add(stop13.practice!(createRng(seed)).skill);
      skills.add(stop13.bridge!(createRng(seed)).skill);
    }
    expect([...skills].sort()).toEqual(['s13.clue', 's13.due', 's13.guess', 's13.hundred', 's13.likely', 's13.why']);
    for (const s of skills) expect(stop13.skillNames?.[s], s).toBeTruthy();
    expect(WORLD.s13).toBeDefined();
    expect(SOON_WORLD.s13).toBeUndefined();
  });

  it('no quiz, check or Arcade item shows a card’s picture (the jar, the worked bag, the farm, the eye check, the rain)', () => {
    const cards = new Set(stop13.lessons.flatMap((l) => l.ideas.flatMap((c) => (c.scene ? [JSON.stringify(c.scene)] : []))));
    expect(cards.has(JSON.stringify(FARM_PICK_SCENE))).toBe(true);
    for (let seed = 1; seed <= 80; seed++) {
      const items = [...stop13.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop13.check!(createRng(seed)), stop13.practice!(createRng(seed))];
      for (const it of items) {
        expect(cards.has(JSON.stringify(it.scene ?? null)), it.id).toBe(false);
        expect(it.prompt).not.toMatch(/sheep|eye check|Did it rain|lemon/);
      }
    }
  });
});

// ======================= words =======================

describe('words: the reading level, curly quotes, no symbols', () => {
  const all: string[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    for (const l of stop13.lessons) for (const it of l.practice(createRng(seed))) all.push(...itemText(it));
    for (const it of stop13.check!(createRng(seed))) all.push(...itemText(it));
    all.push(...itemText(stop13.practice!(createRng(seed))));
  }
  for (const l of stop13.lessons) {
    for (const c of l.ideas) {
      all.push(c.title, ...c.body);
      if (c.scene?.kind === 'contrast') all.push(...c.scene.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), c.scene.ask?.q ?? '', c.scene.ask?.a ?? '');
      if (c.scene?.kind === 'text') all.push(...c.scene.lines);
      if (c.scene?.kind === 'counts') all.push(c.scene.title, ...c.scene.rows, ...c.scene.cols, c.scene.pickLabel ?? '');
    }
    for (const d of l.drill ?? []) all.push(...boardText(d));
    for (const t of l.terms ?? []) all.push(t.means);
  }
  all.push(...Object.values(stop13.skillNames ?? {}));
  const text = all.filter(Boolean).join('\n');

  it(`reads at grade ${READING.maxGrade} or lower, with no sentence over ${READING.maxSentenceWords} words`, () => {
    expect(fkGrade(text)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(text);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
  });

  it('curly quotes and apostrophes only; no symbols, percentages or fractions with a slash; never “Wrong”', () => {
    expect(text).not.toMatch(/['"]/);
    expect(text).not.toMatch(/[=+→✓✗%/<>]/);
    expect(text).not.toMatch(/\d\s*x\s*\d/);
    expect(text).not.toMatch(/\bWrong\b/);
    expect(text).not.toMatch(/percent/i);
  });

  it('a count picture reads aloud every box, row and column, and adds up to 100', () => {
    for (const s of [FARM_SCENE, EYES_SCENE]) {
      const lines = countsSpeech(s).join(' ');
      for (const r of s.cells.flat()) expect(lines).toContain(String(r));
      for (const label of [...s.rows, ...s.cols]) expect(lines).toContain(label);
      expect(s.cells.flat().reduce((a, b) => a! + b!, 0)).toBe(s.total);
    }
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= 20; seed++) {
      for (const m of [readItem(createRng(seed), { skin }), alarmItem(createRng(seed), { skin })]) {
        const s = ch(m).scene as Extract<Scene, { kind: 'counts' }>;
        expect(s.kind).toBe('counts');
        expect(s.cells.flat().reduce((a, b) => a! + b!, 0)).toBe(100);
        for (const n of s.cells.flat()) expect(n!).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('articles and counts agree with their words: “a unicorn”, “1 is a false alarm”, “1 time out of 10”', () => {
    const texts: string[] = [];
    for (const skin of COUNT_SKINS) for (let seed = 1; seed <= 60; seed++) {
      const r = () => createRng(seed);
      for (const m of [moreItem(r(), { skin, want: 'common' }), moreItem(r(), { skin, want: 'rare' }), alarmItem(r(), { skin, want: 'common' }), answerItem(r(), { skin }), strongItem(r(), { skin }), ...WHY_KINDS.map((kind) => whyItem(r(), { skin, kind }))]) texts.push(...itemText(m.item as Item));
    }
    const text = texts.join('\n');
    expect(text).not.toMatch(/\ban (uni|use|one)/i);
    expect(text).not.toMatch(/(?<![\d.,])\b1 (are|times|ways)\b|\bThose 1\b|\b1 false alarms\b/);
    // The cases the rules are for do come up.
    expect(text).toMatch(/\ba unicorn\b/);
    expect(text).toMatch(/\b1 is a false alarm\b/);
    expect(text).toMatch(/\b1 time out of 10\b/);
  });

  it('a name in a story is from the quiz names, never a card’s name', () => {
    for (const n of ['Rosa', 'Ned', 'Wes', 'Kim', 'Lee', 'Otto', 'Bea']) expect((NAMES as readonly string[]).includes(n), n).toBe(false);
  });
});

// Keep the form list in sync with the spec.
it('every draw form is in the spec', () => {
  expect(Object.keys(DRAW_SPEC).sort()).toEqual([...DRAW_FORMS].sort() as DrawForm[]);
  expect(COUNT_SKINS as readonly CountSkin[]).toEqual(['everyday', 'fantasy', 'abstract']);
});
