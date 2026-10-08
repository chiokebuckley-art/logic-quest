/**
 * Stop 7, Lesson 3 · Cause or just together? Every answer is solved again here from the table the player sees (the
 * grid scene's ✓ and ✗), not from the engine function that set it: a cause is followed in every row and changes
 * alone in some pair of rows; together-records never show a cause; a blocked day rules a cause out.
 */
import { describe, expect, it } from 'vitest';
import { RECORDS_GROUP, arcadeItem, checkItems, freshItems, lesson } from '../../content/stop7/causes';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import {
  FRAMES,
  LAMP_TABLE,
  PAIR_SKINS,
  RECORDS_CLOSING,
  SUN_ONE,
  SUN_TABLE,
  CAUSE_RULE,
  CAUSE_TERM,
  SUN_TABLE_4,
  TESTS_VS_RECORDS,
  TEST_SKINS,
  THIRD_SKINS,
  WORKS_CLOSING,
  WORKS_VS_ONLY_CAUSE,
  breakKind,
  candCase,
  causeItem,
  causeVerdict,
  check1,
  check2,
  followsAll,
  kindAt,
  makePairTable,
  makeTestTable,
  makeThirdTable,
  noteCanSave,
  nothingPair,
  nothingWhy,
  recordsConfused,
  tableAnswer,
  thirdCausesBoth,
  thirdItem,
  thirdVsA,
  verdict,
  verdictNote,
  worksConfused,
  worksEvery,
  type CauseKind,
  type CauseMade,
  type Frame,
  type Table,
} from '../puzzles/causes';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, ConfusedQuestion, DrillStep, Item, Scene } from '../types';

type Grid = Extract<Scene, { kind: 'grid' }>;
const SEEDS = Array.from({ length: 220 }, (_, i) => i + 1);

/** The table as the player sees it: candidate columns (every column but the last) and the effect column. */
function readGrid(s: Scene | undefined) {
  if (s?.kind !== 'grid') throw new Error('expected a grid scene');
  const g = s as Grid;
  const val = (r: string, c: string) => {
    const m = g.marks[r]?.[c];
    if (m !== 'yes' && m !== 'no') throw new Error(`blank box ${r}/${c}`);
    return m === 'yes';
  };
  const candCols = g.cols.slice(0, -1);
  const effCol = g.cols[g.cols.length - 1];
  const rows = g.rows.map((r) => ({ label: r.label, v: candCols.map((c) => val(r.id, c.id)), e: val(r.id, effCol.id) }));
  return { g, candCols, effCol, rows };
}

/** Solve one candidate from the rows alone. */
function solve(rows: { v: boolean[]; e: boolean }[], c: number) {
  const follows = rows.every((r) => r.v[c] === r.e);
  let alone = false;
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    if (rows[i].v[c] !== rows[j].v[c] && rows[i].v.every((x, k) => k === c || x === rows[j].v[k])) alone = true;
  }
  const breaks = rows.flatMap((r, i) => (r.v[c] !== r.e ? [i + 1] : []));
  return { follows, alone, breaks, verdict: !follows ? 'not' : alone ? 'cause' : 'cant' };
}

const allItems = (seed: number) => lesson.practice(createRng(seed)) as ChooseItem[];

/** The frame of an item, read from its column labels. */
function frameOf(it: Item): Frame {
  const labels = readGrid(it.scene).g.cols.map((c) => c.label);
  for (const s of TEST_SKINS) if (s.cands.some((c) => labels.includes(c.label))) return s.frame;
  for (const s of PAIR_SKINS) if (labels.includes(s.x('Ava').label)) return s.frame;
  for (const s of THIRD_SKINS) if (labels.includes(s.t.label)) return s.frame;
  throw new Error(`no skin for ${labels.join(', ')}`);
}

/** Check one item against the table on the page. Returns the kind it solved as. */
function checkItem(it: ChooseItem): CauseKind {
  const { rows, candCols, effCol } = readGrid(it.scene);
  const wrong = it.choices.filter((c) => c.id !== it.answer);
  for (const c of wrong) {
    const fb = it.feedback?.[c.id];
    expect(fb, `${it.id} ${c.id}`).toBeDefined();
    expect(fb!.headline.startsWith('Your answer'), fb!.headline).toBe(true);
    expect(fb!.detail.length).toBeGreaterThan(0);
    expect(it.whyWrong?.[c.id]).toBe([fb!.headline, ...fb!.detail].join(' '));
  }
  expect(it.teach?.rule.trim()).toBeTruthy();
  expect(it.teach?.cases?.length).toBeGreaterThan(0);
  expect(it.hintCase).toBeDefined();
  expect(it.explain.trim()).toBeTruthy();
  // The caption first says who made the rows (tests or records), then what a row is; the prompt does not say it again.
  const records = it.skill === 's7.cause-together' || it.skill === 's7.cause-third';
  expect(readGrid(it.scene).g.caption).toMatch(records ? /^Records: someone wrote down what happened\. Each row is one / : /^Tests: someone changed things on purpose\. Each row is one test\. /);
  expect(it.prompt, it.prompt).not.toContain('Each row is one');
  // One meaning of “a cause” across every kind: one thing makes the effect, so a cause passes two checks.
  const causeTerms = (it.teach?.terms ?? []).filter((t) => t.word === 'A cause');
  expect(causeTerms).toEqual([CAUSE_TERM]);
  expect(teachStrings(it).join(' ')).not.toContain('Something can block it');
  // The old one-check reason (“a cause works every time”, said of a row the thing never happened in) is gone.
  expect([it.explain, ...teachStrings(it), ...Object.values(it.whyWrong ?? {})].join(' ')).not.toContain('A cause works every time');

  if (it.skill === 's7.cause-together') {
    expect(candCols.length).toBe(1);
    const mismatch = rows.findIndex((r) => r.v[0] !== r.e);
    const right = mismatch >= 0 ? 'no' : 'notyet';
    expect(it.answer).toBe(right);
    expect(it.conflict).toBe(true);
    // A records question, for the pass rule’s tests-vs-records group.
    expect(it.tags).toEqual(['records']);
    // The “No” choice names a day that breaks it: true only when one does. “Yes” is never right from records.
    if (right === 'no') {
      expect(it.feedback!.yes.headline).toContain(`${rows[mismatch].label.split(':')[0].toLowerCase()}`);
      expect(it.feedback!.notyet.headline).toContain('“Not yet,” but');
      expect(it.feedback!.notyet.headline).toContain('already shows');
      // The check that breaks is named where the rule is used. Check 1 (it happened, the effect did not): nothing named
      // stopped it on that day. Check 2 (the effect came without it): something else made the effect, which no note excuses.
      const br = rows[mismatch];
      const said = [it.explain, it.whyWrong!.yes, it.whyWrong!.notyet];
      for (const x of said) {
        const at = `${/^(game|week)/i.test(br.label) ? 'in' : 'on'} ${br.label.toLowerCase()}`;
        if (br.v[0] && !br.e) {
          expect(x).toContain('Check 1 breaks');
          expect(x).toContain(`the table names nothing that stopped it ${at}.`);
        } else {
          expect(x).toContain('Check 2 breaks: something else made');
          expect(x).not.toContain('names nothing that stopped it');
        }
      }
    } else {
      // Records are not a fair test: the “Yes” feedback names that gap first.
      expect(it.feedback!.yes.headline).toContain('as a fair test, but nobody changed only');
      expect(it.feedback!.no.headline).toContain('went together every');
    }
    // The hint shows a day that goes together, never the day that breaks it.
    expect(it.hintCase!.truths![0].value).toBe(it.hintCase!.truths![1].value);
    return 'together';
  }

  if (it.skill === 's7.cause-third') {
    // Columns: the third thing, the asked cause (a), the other thing (b). One day is blocked (its label has a note).
    expect(candCols.length).toBe(2);
    const blocked = rows.filter((r) => r.label.includes(':'));
    expect(blocked.length).toBe(1);
    const [bl] = blocked;
    expect(bl.v[0] && !bl.v[1] && bl.e).toBe(true);
    const third = solve(rows, 0), asked = solve(rows, 1);
    expect(third.verdict).toBe('cause');
    expect(asked.verdict).toBe('not');
    // a follows the third thing on every day that was not blocked; the blocked day has b without a (so “No”), and the
    // third thing goes with b every day (so “may cause both”, not “nothing else goes with it”).
    expect(rows.every((r) => r.label.includes(':') || r.v[1] === r.v[0])).toBe(true);
    expect(rows.some((r) => r.e && !r.v[1])).toBe(true);
    expect(rows.every((r) => r.v[0] === r.e)).toBe(true);
    // The fair-test pairs: from a day with all three to the blocked day only a changes; from a day with none to the
    // blocked day only the third thing changes (a stays ✗).
    expect(rows.some((r) => r.v[0] && r.v[1] && r.e)).toBe(true);
    expect(rows.some((r) => !r.v[0] && !r.v[1] && !r.e)).toBe(true);
    expect(it.answer).toBe('third');
    expect(it.tags).toEqual(['can-fail']);
    expect(it.conflict).toBe(true);
    expect(it.choices.map((c) => c.id).sort()).toEqual(['cant', 'none', 'third', 'yes']);
    const day = bl.label.split(':')[0].toLowerCase();
    for (const id of ['yes', 'cant']) expect(it.feedback![id].headline, id).toContain(day);
    expect(it.feedback!.none.headline).toContain('every');
    expect(it.choices.find((c) => c.id === 'third')!.label).toMatch(/^No\. .+ may cause both\.$/);
    // The rule “a cause works every time” is never used against a blocked day.
    expect([it.explain, ...Object.values(it.whyWrong ?? {})].join(' ')).not.toContain('works every time');
    // The prompt reports only the pair: the third thing is for the learner to find in the first column.
    const skin = THIRD_SKINS.find((s) => s.t.label === readGrid(it.scene).g.cols[0].label)!;
    expect(it.prompt.toLowerCase()).not.toContain(skin.t.short.toLowerCase());
    expect(it.prompt.toLowerCase()).not.toContain(skin.t.label.toLowerCase());
    expect(it.hintCase!.truths!.every((t) => t.value)).toBe(true);
    // The item names its own blocker (never the card’s closed shop), on the blocked day.
    const thing = skin.things.find((x) => x.block === bl.label.split(': ')[1])!;
    const stop = it.teach!.terms!.find((t) => t.word === 'Something that stops it')!;
    expect(stop.meaning).toContain(`here, ${thing.blockSay} ${/^(test|game|week)/i.test(bl.label) ? 'in' : 'on'} ${day}.`);
    expect(stop.meaning).toContain(`That stopped ${skin.t.short} from making ${thing.make}.`);
    expect(teachStrings(it).join(' ')).not.toContain('shop');
    return 'third';
  }

  // A test table: which one is the cause, or a claim about one thing.
  const solved = candCols.map((_, c) => solve(rows, c));
  const causes = solved.flatMap((s, c) => (s.verdict === 'cause' ? [c] : []));
  expect(rows.map((r) => r.e)).toContain(true);
  expect(rows.map((r) => r.e)).toContain(false);
  if (it.choices.some((c) => c.id === 'c1')) {
    const right = causes.length === 1 ? `c${causes[0] + 1}` : 'cant';
    if (right === 'cant') expect(solved.some((s) => s.verdict === 'cant')).toBe(true);
    expect(it.answer).toBe(right);
    expect(it.choices.map((c) => c.id)).toEqual([...candCols.map((_, k) => `c${k + 1}`), 'cant']);
    for (const c of wrong) {
      const h = it.feedback![c.id].headline;
      if (c.id === 'cant') {
        expect(h).toContain('a fair test changes only');
        continue;
      }
      const s = solved[Number(c.id.slice(1)) - 1];
      if (s.verdict === 'not') {
        expect(h).toMatch(new RegExp(`(in|on) (test|day) ${s.breaks[0]}\\.$`));
        // The check that breaks is named: check 1 with its exception (nothing named stopped it), or check 2.
        const br = rows[s.breaks[0] - 1];
        const why = it.whyWrong![c.id];
        if (br.v[Number(c.id.slice(1)) - 1] && !br.e) {
          expect(why).toContain('Check 1 breaks');
          expect(why).toContain(`the table names nothing that stopped it in test ${s.breaks[0]}.`);
        } else {
          expect(why).toContain('Check 2 breaks: something else made');
          expect(why).not.toContain('names nothing that stopped it');
        }
      } else expect(h).toContain('changed with it');
    }
    // The hint checks a thing that is ruled out: never the answer.
    expect(it.hintCase!.truths!.find((t) => t.who === 'It is the cause')!.value).toBe(false);
    return right === 'cant' ? 'cant' : 'which';
  }
  // A claim: “X makes Y.” The claimed thing is named in the prompt.
  const said = it.prompt.match(/says, “(.+) makes /)![1].toLowerCase();
  const scene = readGrid(it.scene).g;
  const c = TEST_SKINS.flatMap((s) => s.cands).filter((f) => f.noun.toLowerCase() === said).map((f) => scene.cols.findIndex((x) => x.label === f.label)).find((k) => k >= 0)!;
  expect(c).toBeGreaterThanOrEqual(0);
  const v = solved[c].verdict;
  expect(it.answer).toBe({ cause: 'right', not: 'wrong', cant: 'cant' }[v]);
  expect(effCol.id).toBe('e');
  return v === 'cant' ? 'cant' : 'which';
}

describe('s7.l3 the model', () => {
  it('works out the worked example: the switch is the cause, the clock is not', () => {
    expect([0, 1].map((c) => verdict(LAMP_TABLE, c))).toEqual(['cause', 'not']);
    expect(tableAnswer(LAMP_TABLE)).toBe(0);
    expect([0, 1].map((c) => verdict(SUN_TABLE, c))).toEqual(['cant', 'cant']);
    expect([0, 1].map((c) => verdict(SUN_TABLE_4, c))).toEqual(['cause', 'not']);
  });

  it('makes test tables with exactly the asked answer', () => {
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const skin = rng.pick(TEST_SKINS);
      const which = makeTestTable(rng, skin, 'which');
      const rows = which.rows;
      const s = which.cands.map((_, c) => solve(rows, c).verdict);
      expect(s.filter((v) => v === 'cause').length).toBe(1);
      expect(s.filter((v) => v === 'not').length).toBe(s.length - 1);
      const cant = makeTestTable(rng, skin, 'cant');
      const s2 = cant.cands.map((_, c) => solve(cant.rows, c).verdict);
      expect(s2.filter((v) => v === 'cant').length).toBe(2);
      expect(s2.filter((v) => v === 'not').length).toBe(1);
    }
  });
});

describe('s7.l3 one rule for a cause', () => {
  it('card 1 states the one-cause rule and both checks, with the Stop 6 bridge; the third-thing card no longer concludes a cause from records', () => {
    expect(CAUSE_RULE).toContain('In these puzzles, one thing makes the effect happen. So a cause passes two checks.');
    expect(CAUSE_RULE).toContain('When it happens, the effect happens, unless the table names something that stopped it.');
    expect(CAUSE_RULE).toContain('When it does not happen, the effect does not happen.');
    expect(CAUSE_TERM.meaning).toContain(CAUSE_RULE);
    const card1 = lesson.ideas[0].body.join(' ');
    expect(card1.startsWith('A cause makes something happen.')).toBe(true);
    expect(card1).not.toContain('helps make');
    expect(card1).toContain('In these puzzles, one thing makes the effect happen. So a cause passes two checks.');
    expect(card1).toContain('Check 1: when it happens, the effect happens. It works every time, unless the table names something that stopped it.');
    expect(card1).toContain('Check 2: when it does not happen, the effect does not happen. Nothing else makes the effect.');
    expect(card1).toContain('In Stop 6, THEN without IF did not break an if-then rule. “Follows” is stronger: it needs both checks.');
    const third = lesson.ideas.find((c) => c.title === 'Look for a third thing')!.body.join(' ');
    expect(third).toContain('The heat may cause both. A fair test could check it.');
    expect(third).not.toContain('Heat still causes');
    expect(third).toContain('shop closed');
    expect(third).toContain('The sunburns came without ice cream, so check 2 breaks.');
    // The card’s table agrees: the heat goes with the sunburns, and with ice cream sales except on the named day.
    expect(thirdCausesBoth(SUN_TABLE_4)).toBe(true);
    expect(breakKind(SUN_TABLE_4, 1)).toBe('without');
  });

  it('computes “may cause both”: the third thing causes a too, once the named block is excused', () => {
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const skin = rng.pick(THIRD_SKINS);
      const ai = skin.things[0].block ? 0 : 1;
      const t = makeThirdTable(rng, skin, skin.things[ai], skin.things[1 - ai]);
      expect(thirdCausesBoth(t)).toBe(true);
      expect(verdict(thirdVsA(t), 0)).toBe('cause');
      // Without the note, the same row would rule the third thing out: the note is what excuses it.
      const bare = thirdVsA({ ...t, rows: t.rows.map(({ note: _n, ...r }) => r) });
      expect(verdict(bare, 0)).toBe('not');
      expect(thirdCausesBoth({ ...t, rows: t.rows.map(({ note: _n, ...r }) => r) })).toBe(false);
    }
  });

  it('the third item’s blocked row says what stopped it', () => {
    for (const seed of SEEDS.slice(0, 60)) for (const f of FRAMES) {
      const m = thirdItem(createRng(seed), { frame: f });
      const k = m.table.rows.findIndex((r) => !!r.note);
      expect(m.item.teach!.cases![k].note).toContain('The note tells you why.');
    }
  });
});

describe('s7.l3 practice', () => {
  it('re-solves every item from its table; one can-fail item and a conflict item in every pack', () => {
    for (const seed of SEEDS) {
      const items = allItems(seed);
      expect(items.length).toBe(4);
      const kinds = items.map(checkItem);
      expect(kinds[0], `seed ${seed}: a gentle first item`).toBe('which');
      expect(items[0].choices.some((c) => c.id === 'c1')).toBe(true);
      expect([...kinds].sort()).toEqual(['cant', 'third', 'together', 'which'].sort());
      expect(items.filter((it) => it.tags?.includes('can-fail')).length).toBe(1);
      expect(items.some((it) => it.conflict)).toBe(true);
      expect(new Set(items.map(looks)).size).toBe(4);
      expect(new Set(items.map(frameOf)).size, `seed ${seed} frames`).toBeGreaterThanOrEqual(2);
    }
  });

  it('is the same for the same seed', () => {
    for (const seed of SEEDS.slice(0, 50)) expect(lesson.practice(createRng(seed))).toEqual(lesson.practice(createRng(seed)));
  });

  it('uses every frame and many looks for each skill', () => {
    const frames = new Set<string>();
    const bySkill = new Map<string, Set<string>>();
    for (const seed of SEEDS) for (const it of allItems(seed)) {
      frames.add(frameOf(it));
      if (!bySkill.has(it.skill)) bySkill.set(it.skill, new Set());
      bySkill.get(it.skill)!.add(looks(it));
    }
    expect([...frames].sort()).toEqual([...FRAMES].sort());
    expect([...bySkill.keys()].sort()).toEqual(['s7.cause-cant-tell', 's7.cause-third', 's7.cause-together', 's7.cause-which']);
    for (const [skill, set] of bySkill) expect(set.size, skill).toBeGreaterThanOrEqual(40);
  });

  it('never repeats a worked example or a board', () => {
    const worked = [...lesson.ideas.flatMap((c) => (c.scene ? [c.scene] : [])), ...lesson.drill!.flatMap((d) => (d.scene ? [d.scene] : []))];
    const key = (s: Scene) => (s.kind === 'grid' ? JSON.stringify([s.rows.map((r) => r.label), s.cols.map((c) => c.label), s.marks]) : JSON.stringify(s));
    const bad = new Set(worked.map(key));
    for (const seed of SEEDS) {
      for (const it of [...allItems(seed), ...checkItems(createRng(seed)).map((m) => m.item), arcadeItem(createRng(seed)).item]) expect(bad.has(key(it.scene!))).toBe(false);
    }
    // No quiz story is a card’s story: its column labels never appear in an item.
    const cardLabels = new Set(worked.flatMap((s) => (s.kind === 'grid' ? s.cols.map((c) => c.label) : [])));
    for (const seed of SEEDS) {
      for (const it of [...allItems(seed), ...checkItems(createRng(seed)).map((m) => m.item), arcadeItem(createRng(seed)).item]) {
        for (const l of readGrid(it.scene).g.cols.map((c) => c.label)) expect(cardLabels.has(l), l).toBe(false);
      }
    }
  });

  it('reads at a 6th-grade level, with no long sentence', () => {
    const text: string[] = [];
    for (const seed of SEEDS.slice(0, 60)) {
      for (const it of allItems(seed)) {
        text.push(it.prompt, it.explain, ...teachStrings(it), ...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
      }
    }
    const all = text.join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/['"]/);
  });
});

describe('s7.l3 check, arcade and new examples', () => {
  it('gives two different items, at least one a conflict, with many looks per slot', () => {
    const slots = [new Set<string>(), new Set<string>()];
    for (let seed = 1; seed <= 300; seed++) {
      const made = checkItems(createRng(seed)) as CauseMade[];
      expect(made.length).toBe(2);
      const items = made.map((m, i) => ({ id: `c${i}`, stop: 7, lesson: 's7.l3', skill: `s7.${m.tag}`, ...m.item }) as ChooseItem);
      expect(looks(items[0])).not.toBe(looks(items[1]));
      expect(items.some((it) => it.conflict)).toBe(true);
      items.forEach((it, i) => {
        checkItem(it);
        slots[i].add(looks(it));
      });
      expect(checkItems(createRng(seed))).toEqual(made);
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(10);
  });

  it('arcade items are solved right; fresh uses the default', () => {
    for (const seed of SEEDS) {
      const m = arcadeItem(createRng(seed));
      checkItem({ id: 'a', stop: 7, lesson: 's7.l3', skill: `s7.${m.tag}`, ...m.item } as ChooseItem);
    }
    const missed = allItems(1)[0];
    expect(freshItems(missed, createRng(1))).toEqual([]);
  });

  it('every kind in every frame is solved right', () => {
    for (const seed of SEEDS.slice(0, 60)) for (const kind of ['which', 'cant', 'together', 'third'] as CauseKind[]) for (const f of FRAMES) {
      const m = causeItem(createRng(seed), kind, f);
      expect(m.frame).toBe(f);
      expect(checkItem({ id: 'k', stop: 7, lesson: 's7.l3', skill: `s7.${m.tag}`, ...m.item } as ChooseItem)).toBe(kind);
    }
  });
});

describe('s7.l3 See and Do', () => {
  it('has a worked example card whose grid names the cause', () => {
    const card = lesson.ideas.find((c) => c.title.startsWith('Example'))!;
    const { rows, g } = readGrid(card.scene);
    const s = g.cols.slice(0, -1).map((_, c) => solve(rows, c).verdict);
    expect(s).toEqual(['cause', 'not']);
    expect(g.caption).toContain('The switch is the cause');
  });

  it('board marks match the table on the board (tests get a fair test; records ask who changed it on purpose)', () => {
    expect(lesson.drill!.map((d) => d.id)).toEqual(['s7.l3-do-two-checks', 's7.l3-do-lamp', 's7.l3-do-records', 's7.l3-do-sun']);
    const grids = lesson.drill!.filter((d) => d.scene?.kind === 'grid');
    expect(grids.map((d) => d.id)).toEqual(['s7.l3-do-lamp', 's7.l3-do-sun']);
    for (const d of grids) {
      const { rows, g } = readGrid(d.scene);
      const records = g.caption!.startsWith('Records: someone wrote down what happened.');
      expect(records || g.caption!.startsWith('Tests: someone changed things on purpose.')).toBe(true);
      const word = records ? 'day' : 'test';
      const list = (idx: number[]) => `${records ? 'On' : 'In'} ${idx.length === 1 ? word : `${word}s`} ${idx.length === 1 ? idx[0] : `${idx.slice(0, -1).join(', ')} and ${idx[idx.length - 1]}`}.`;
      for (const r of d.rows) {
        if (r.id === 'one') {
          // The covered-heat row: only the ice cream column is left. By the tests’ rule it now changes alone, but these
          // are records, so the board says “can’t tell yet”.
          const ice = g.cols.findIndex((c) => c.label === SUN_TABLE.cands[1].label);
          const one = rows.map((x) => ({ v: [x.v[ice]], e: x.e }));
          const s = solve(one, 0);
          expect(records).toBe(true);
          expect(s.verdict).toBe('cause');
          expect(r.marks.map((m) => m.answer)).toEqual([s.follows ? 'yes' : 'no', s.follows ? 'cant' : 'not']);
          continue;
        }
        // The row is a candidate, named like “The switch”: find its column by the table’s words.
        const col = g.cols.findIndex((c) => {
          const f = [...[LAMP_TABLE, SUN_TABLE].flatMap((t) => t.cands)].find((x) => x.label === c.label);
          return !!f && f.noun.toLowerCase() === r.label.toLowerCase();
        });
        expect(col, r.label).toBeGreaterThanOrEqual(0);
        const s = solve(rows, col);
        const [fol, second, v] = r.marks;
        expect(fol.answer).toBe(s.follows ? 'yes' : 'no');
        // The compare facts under the follows mark: the rows where it happened, and the rows with the effect.
        const at = (p: (x: { v: boolean[]; e: boolean }) => boolean) => rows.flatMap((x, i) => (p(x) ? [i + 1] : []));
        expect(fol.compare).toEqual({ says: list(at((x) => x.v[col])), world: list(at((x) => x.e)) });
        if (records) {
          expect(second.id).toMatch(/-purpose$/);
          expect(second.answer).toBe('no');
          expect(v.answer).toBe(s.follows ? 'cant' : 'not');
        } else {
          expect(second.id).toMatch(/-alone$/);
          expect(second.answer).toBe(s.alone ? 'yes' : 'no');
          expect(v.answer).toBe(s.verdict);
        }
        expect(r.needs?.trim()).toBeTruthy();
      }
    }
    for (const d of lesson.drill!) {
      for (const m of d.rows.flatMap((r) => r.marks)) {
        if (m.given) continue;
        for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim(), `${m.id} ${o.id}`).toBeTruthy();
      }
      expect(d.rows.flatMap((r) => r.marks).filter((m) => !m.given).length).toBeLessThanOrEqual(12);
      expect(checkDrill(d, Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]))).done).toBe(true);
    }
    // The lamp board shows the switch checked and asks for the clock, with the two checks lit; the sunburn board is the
    // can’t-tell case, and never asks for a fair test on records.
    const lamp = lesson.drill![1], sun = lesson.drill![3];
    expect(lamp.rows[0].marks.every((m) => m.given)).toBe(true);
    expect(lamp.scaffold).toBe('full');
    expect(lamp.steps).toEqual(['Two checks: does the lamp follow it both ways?', 'Fair test: from one test to another, does only it change?', 'Decide: the cause, not the cause, or can’t tell yet']);
    expect(lamp.steps!.length).toBe(lamp.rows[1].marks.length);
    expect(lamp.words).toMatchObject({ says: 'It happened', world: 'The effect', so: 'So' });
    expect(sun.rows.slice(0, 2).map((r) => r.marks[2].answer)).toEqual(['cant', 'cant']);
    expect(sun.rows.flatMap((r) => r.marks).some((m) => m.label === 'Does a fair test change only it?')).toBe(false);
    expect(sun.rows.flatMap((r) => r.marks).filter((m) => m.label === 'Did someone change only it, on purpose?').length).toBe(2);
  });

  it('the clock gets the reason that holds even without the one-cause rule: its own fair test', () => {
    expect(nothingPair(LAMP_TABLE, 1)).toEqual([0, 2]);
    const [i, j] = nothingPair(LAMP_TABLE, 1)!;
    // Worked out here: from test 1 to test 3 only the clock changes, and the lamp is the same both times.
    expect(LAMP_TABLE.rows[i].v[0]).toBe(LAMP_TABLE.rows[j].v[0]);
    expect(LAMP_TABLE.rows[i].v[1]).not.toBe(LAMP_TABLE.rows[j].v[1]);
    expect(LAMP_TABLE.rows[i].e).toBe(LAMP_TABLE.rows[j].e);
    const why = 'From test 1 to test 3, only the clock changes, and the lamp is on both times. So changing the clock did nothing.';
    expect(nothingWhy(LAMP_TABLE, 1)).toBe(why);
    const lamp = lesson.drill![1];
    expect(lamp.rows[1].note).toContain(why);
    expect(lamp.done).toContain(why);
    expect(lamp.done).toContain('The lamp came on without the clock, so check 2 breaks.');
  });

});

// ---------- the two distinctions (docs/CONTENT_GUIDE.md, “Distinctions”) ----------

/** Every table the quiz can show, plus the cards’ tables. */
function someTables(): Table[] {
  const out: Table[] = [LAMP_TABLE, SUN_TABLE, SUN_TABLE_4, SUN_ONE];
  for (const seed of SEEDS.slice(0, 80)) {
    const rng = createRng(seed);
    out.push(makeTestTable(rng, rng.pick(TEST_SKINS), rng.pick(['which', 'cant'] as const)));
    const ps = rng.pick(PAIR_SKINS);
    out.push(makePairTable(rng, ps, 'Ava', rng.pick(['no', 'notyet'] as const)));
    const ts = rng.pick(THIRD_SKINS);
    const ai = ts.things[0].block ? 0 : 1;
    out.push(makeThirdTable(rng, ts, ts.things[ai], ts.things[1 - ai]));
  }
  return out;
}

const board = (id: string) => lesson.drill!.find((d) => d.id === id)!;
const rightMarks = (d: DrillStep) => Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]));
type Contrast = Extract<Scene, { kind: 'contrast' }>;

describe('s7.l3 two checks: “it works every time” is not “nothing else makes the effect”', () => {
  it('follows is exactly check 1 and check 2, and a note can excuse only a check 1 break', () => {
    for (const t of someTables()) {
      t.cands.forEach((_, c) => {
        expect(followsAll(t, c)).toBe(check1(t, c) && check2(t, c));
        for (const r of t.rows) {
          // Worked out here: check 1 is broken by “it happened, the effect did not”; check 2 by “the effect came without it”.
          expect(kindAt(r, c)).toBe(r.v[c] === r.e ? null : r.v[c] ? 'no-effect' : 'without');
          expect(noteCanSave(r, c)).toBe(r.v[c] && !r.e);
        }
      });
    }
  });

  it('the reason on a row that breaks a thing names the check: check 1 with its stopper exception, check 2 with “something else”', () => {
    for (const t of someTables()) {
      t.cands.forEach((_, c) => {
        if (followsAll(t, c)) return;
        const why = worksEvery(t, c);
        if (breakKind(t, c) === 'no-effect') {
          expect(why).toContain('Check 1 breaks');
          expect(why).toContain('names nothing that stopped it');
        } else {
          expect(why).toContain('Check 2 breaks: something else made');
          expect(why).toContain('only one thing does that');
        }
        expect(verdictNote(t, c)).toContain(why);
      });
    }
  });

  it('a case card’s follows row carries its comparison, and its verdict line names every check that breaks', () => {
    for (const t of someTables().filter((x) => x.word === 'test')) {
      t.cands.forEach((_, c) => {
        const cc = candCase(t, c);
        const fol = cc.truths![0];
        expect(fol.value).toBe(followsAll(t, c));
        expect(fol.because?.match).toBe(followsAll(t, c));
        // Worked out here from the rows: which checks break.
        const one = t.rows.some((r) => r.v[c] && !r.e && !r.note);
        const two = t.rows.some((r) => !r.v[c] && r.e);
        const unfit = cc.words!.unfit!;
        if (one && two) expect(unfit).toContain('both checks break');
        else if (one) expect(unfit).toContain('check 1 breaks');
        else if (two) expect(unfit).toContain('check 2 breaks');
        expect(cc.words).toMatchObject({ says: 'It happened', world: 'The effect', truth: 'yes', untruth: 'no' });
      });
    }
  });

  it('records never show a cause; tests do when a fair test changes only the thing', () => {
    // The covered sunburn column: by the tests’ rule the ice cream changes alone, but these are records.
    expect(verdict(SUN_ONE, 0)).toBe('cause');
    expect(causeVerdict(SUN_ONE, 0)).toBe('cant');
    for (const t of someTables()) {
      const records = t.word !== 'test';
      t.cands.forEach((_, c) => {
        if (records) expect(causeVerdict(t, c)).not.toBe('cause');
        else expect(causeVerdict(t, c)).toBe(verdict(t, c));
        if (!followsAll(t, c)) expect(causeVerdict(t, c)).toBe('not');
      });
    }
  });

  it('a thing ruled out in tests gets its own fair test when one exists, and the effect really stays the same there', () => {
    let seen = 0;
    for (const t of someTables()) {
      t.cands.forEach((_, c) => {
        const p = nothingPair(t, c);
        if (!p) return;
        expect(t.word).toBe('test');
        const [i, j] = p;
        expect(t.rows[i].v[c]).not.toBe(t.rows[j].v[c]);
        expect(t.rows[i].v.every((x, k) => k === c || x === t.rows[j].v[k])).toBe(true);
        expect(t.rows[i].e).toBe(t.rows[j].e);
        if (causeVerdict(t, c) === 'not') {
          expect(verdictNote(t, c)).toContain(nothingWhy(t, c));
          seen++;
        }
      });
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('s7.l3 distinctions taught apart', () => {
  it('declares both distinctions; each is taught by a contrast card with its board right after it, in 7 cards or fewer', () => {
    expect(lesson.distinctions!.map((d) => d.id)).toEqual([WORKS_VS_ONLY_CAUSE.id, TESTS_VS_RECORDS.id]);
    expect(lesson.ideas.length).toBeLessThanOrEqual(7);
    for (const d of lesson.distinctions!) {
      expect(d.taughtIn).toBeUndefined();
      const k = lesson.ideas.findIndex((c) => c.distinction === d.id);
      expect(k, d.id).toBeGreaterThanOrEqual(0);
      expect(lesson.ideas[k].scene?.kind).toBe('contrast');
      const b = lesson.drill!.find((x) => x.distinction === d.id && x.afterCard === k);
      expect(b, d.id).toBeDefined();
      expect(b!.scene).toEqual(lesson.ideas[k].scene);
    }
    // The two kinds of break come before any table; tests or records comes before the records.
    const at = (title: string) => lesson.ideas.findIndex((c) => c.title === title);
    expect(at('Two kinds of break')).toBeLessThan(at('Example: find the cause'));
    expect(at('Tests or records?')).toBeLessThan(at('Together is not enough'));
  });

  it('the two-checks contrast: the clock on with the lamp off, and the clock off with the lamp on; each truth worked out here', () => {
    const card = lesson.ideas.find((c) => c.distinction === WORKS_VS_ONLY_CAUSE.id)!;
    const s = card.scene as Contrast;
    expect(s.words).toEqual({ worldTag: 'Check', saysWord: 'row:', truth: 'Passes', untruth: 'Fails' });
    const [a, b] = s.pairs;
    expect(a.says).toBe('The clock shows 7:00, but the lamp is off.');
    expect(b.says).toBe('The clock does not show 7:00, but the lamp is on.');
    // In one test the clock passes both checks only when the lamp matches it.
    const passes = (clock: boolean, lamp: boolean) => clock === lamp;
    expect(a.truth).toBe(passes(true, false));
    expect(b.truth).toBe(passes(false, true));
    expect(a.because).toContain('It happened, but the effect did not. Check 1 breaks');
    expect(b.because).toContain('The effect came without it. Check 2 breaks');
    expect(a.then).toContain('unless the table names something that stopped it');
    expect(b.then).toContain('no note can change that');
    expect(s.ask?.q).toBe('Are these the same kind of break?');
    expect(s.ask?.a.startsWith('No.')).toBe(true);
    // Its board: the learner names each break, and says whether a note could save the clock.
    const w = board('s7.l3-do-two-checks');
    expect(w.rows.map((r) => r.marks.map((m) => m.answer))).toEqual([
      ['one', passes(true, false) ? 'no' : 'yes'],
      ['two', 'no'],
    ]);
  });

  it('the tests-vs-records contrast: the same cap marks, labelled tests and labelled records; the answers worked out here', () => {
    const card = lesson.ideas.find((c) => c.distinction === TESTS_VS_RECORDS.id)!;
    const s = card.scene as Contrast;
    const [tests, records] = s.pairs;
    expect(tests.says).toBe(records.says);
    expect(tests.world.startsWith('Tests.')).toBe(true);
    expect(records.world.startsWith('Records.')).toBe(true);
    // The marks, read back: cap on and won, cap off and lost, cap on and won.
    const rows = tests.says.split('. ').map((x) => ({ v: [x.includes('Cap on')], e: x.includes('won') }));
    const sv = solve(rows, 0);
    expect(sv.verdict).toBe('cause');
    expect(tests.truth).toBe(sv.verdict === 'cause');
    // Records can’t show a cause: following both ways gives “can’t tell yet”.
    expect(records.truth).toBe(false);
    expect(sv.follows).toBe(true);
    expect(s.words).toMatchObject({ truth: 'The cause', untruth: 'Can’t tell yet' });
    const b = board('s7.l3-do-records');
    expect(b.rows.map((r) => r.marks.map((m) => m.answer))).toEqual([
      ['yes', 'cause'],
      ['no', 'cant'],
    ]);
  });
});

describe('s7.l3 mix-ups the boards name', () => {
  it('one-way-follow: the clock marked as following, or kept, though the lamp came on without it; not on right marks or other slips', () => {
    const d = board('s7.l3-do-lamp');
    const r = rightMarks(d);
    const wrongs: Record<string, string>[] = [{ 'c2-follow': 'yes' }, { 'c2-verdict': 'cant' }, { 'c2-verdict': 'cause' }];
    for (const wrong of wrongs) {
      const out = checkDrill(d, { ...r, ...wrong });
      expect(out.diagnosis, JSON.stringify(wrong)).toBe('one-way-follow');
      expect(out.message.startsWith('You may be treating “it works every time” and “nothing else makes the lamp turn on” as the same thing.')).toBe(true);
    }
    expect(checkDrill(d, r)).toMatchObject({ done: true });
    expect(checkDrill(d, r).diagnosis).toBeUndefined();
    expect(checkDrill(d, { ...r, 'c2-alone': 'no' }).diagnosis).toBeUndefined();
    const w = board('s7.l3-do-two-checks');
    const wr = rightMarks(w);
    expect(checkDrill(w, { ...wr, 'testB-check': 'one' }).diagnosis).toBe('one-way-follow');
    expect(checkDrill(w, { ...wr, 'testB-note': 'yes' }).diagnosis).toBe('note-saves-all');
    expect(checkDrill(w, { ...wr, 'testA-check': 'two' }).diagnosis).toBeUndefined();
    expect(checkDrill(w, wr).diagnosis).toBeUndefined();
  });

  it('records-as-test: a records row called the cause or changed on purpose; tests-as-records is its mirror', () => {
    const s = board('s7.l3-do-sun');
    const sr = rightMarks(s);
    const wrongs: Record<string, string>[] = [{ 'one-verdict': 'cause' }, { 'c1-verdict': 'cause' }, { 'c2-purpose': 'yes' }];
    for (const wrong of wrongs) {
      expect(checkDrill(s, { ...sr, ...wrong }).diagnosis, JSON.stringify(wrong)).toBe('records-as-test');
    }
    expect(checkDrill(s, { ...sr, 'c1-verdict': 'not' }).diagnosis).toBeUndefined();
    expect(checkDrill(s, sr).diagnosis).toBeUndefined();
    const b = board('s7.l3-do-records');
    const br = rightMarks(b);
    expect(checkDrill(b, { ...br, 'records-verdict': 'cause' }).diagnosis).toBe('records-as-test');
    expect(checkDrill(b, { ...br, 'records-purpose': 'yes' }).diagnosis).toBe('records-as-test');
    expect(checkDrill(b, { ...br, 'tests-verdict': 'cant' }).diagnosis).toBe('tests-as-records');
    expect(checkDrill(b, { ...br, 'tests-verdict': 'not' }).diagnosis).toBeUndefined();
    expect(checkDrill(b, br).diagnosis).toBeUndefined();
  });

  it('every mix-up names the two things apart, then says how to check, in at most five short sentences', () => {
    for (const d of lesson.drill!) {
      expect(d.misconceptions?.length ?? 0, d.id).toBeGreaterThan(0);
      for (const m of d.misconceptions!) {
        expect(m.when).toBe('picks');
        expect(m.text.startsWith('You may be treating'), m.text).toBe(true);
        expect(m.text).toMatch(/They are two different (things|checks)\./);
        expect(m.text.split(/(?<=\.)\s/).length, m.text).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('s7.l3 I’m confused', () => {
  const items = SEEDS.slice(0, 60).flatMap((s) => allItems(s));
  const recordItems = items.filter((it) => it.skill === 's7.cause-together' || it.skill === 's7.cause-third');

  const wellFormed = (qs: readonly ConfusedQuestion[] | undefined, where: string) => {
    expect(qs?.length ?? 0, where).toBeGreaterThanOrEqual(1);
    expect(qs!.length, where).toBeLessThanOrEqual(3);
    for (const q of qs!) {
      expect(q.options.filter((o) => o.right).length, `${where}: ${q.q}`).toBe(1);
      expect(q.options.some((o) => o.label === 'Not sure'), `${where}: ${q.q}`).toBe(true);
      expect(q.teach.trim().length).toBeGreaterThan(0);
    }
  };

  it('every board, and every together and third item, has its questions: the two-checks pair and the tests-or-records pair', () => {
    for (const d of lesson.drill!) wellFormed(d.confused, d.id);
    expect(board('s7.l3-do-two-checks').confused).toEqual(worksConfused());
    expect(board('s7.l3-do-lamp').confused).toEqual(worksConfused());
    expect(board('s7.l3-do-sun').confused).toEqual(recordsConfused('day'));
    expect(board('s7.l3-do-lamp').words?.closing).toBe(WORKS_CLOSING);
    expect(board('s7.l3-do-sun').words?.closing).toBe(RECORDS_CLOSING);
    expect(recordItems.length).toBeGreaterThan(60);
    for (const it of recordItems) {
      wellFormed(it.confused, it.id);
      const qs = it.confused!.map((q) => q.q);
      expect(qs).toContain(worksConfused()[0].q);
      expect(qs).toContain('Who made these rows?');
      // The panel’s last line comes from the item’s thinking board, so it never speaks of signs.
      expect(it.scratch?.words?.closing).toBe(RECORDS_CLOSING);
    }
  });

  it('they never give the answer: no question names the item’s answer or its things', () => {
    for (const it of recordItems) {
      const { g } = readGrid(it.scene);
      const said = it.confused!.flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]).join(' ').toLowerCase();
      expect(said).not.toContain(it.choices.find((c) => c.id === it.answer)!.label.toLowerCase());
      for (const c of g.cols) expect(said, c.label).not.toContain(c.label.toLowerCase());
    }
    for (const d of [board('s7.l3-do-lamp'), board('s7.l3-do-two-checks')]) {
      const said = d.confused!.flatMap((q) => [q.q, q.teach]).join(' ').toLowerCase();
      expect(said).not.toContain('clock');
    }
  });
});

describe('s7.l3 records thinking board and the pass rule', () => {
  it('together and third items carry a records board: who made the rows, then each row in words, marked from the table', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      for (const it of allItems(seed)) {
        if (it.skill !== 's7.cause-together' && it.skill !== 's7.cause-third') {
          expect(it.scratch).toBeUndefined();
          continue;
        }
        expect(it.scratchLabel).toBe('the records board');
        const s = it.scratch!;
        const { rows, g } = readGrid(it.scene);
        expect(s.rows[0].marks[0].answer).toBe('records');
        // The pair: the thing asked about (the first column, or the second when a third thing comes first) and the effect.
        const x = it.skill === 's7.cause-together' ? 0 : 1;
        expect(s.rows.length).toBe(rows.length + 1);
        rows.forEach((r, i) => {
          const row = s.rows[i + 1];
          expect(row.label.startsWith(r.label), row.label).toBe(true);
          expect(row.marks[0].answer).toBe(r.v[x] === r.e ? 'yes' : 'no');
        });
        expect(g.caption!.startsWith('Records:')).toBe(true);
      }
    }
  });

  it('the pass rule asks for a can-fail question and a records question; every pack holds both', () => {
    expect(lesson.pass?.include?.map((g) => g.tag)).toEqual(['can-fail', RECORDS_GROUP.tag]);
    for (const seed of SEEDS) {
      const items = allItems(seed);
      expect(items.filter((it) => it.tags?.includes('records')).length).toBe(1);
      expect(items.filter((it) => it.tags?.includes('can-fail')).length).toBe(1);
    }
  });

  it('the cards, boards, mix-ups, questions and thinking boards read at grade 7 or lower, with curly quotes only', () => {
    const text: string[] = [];
    for (const c of lesson.ideas) {
      text.push(...c.body);
      if (c.scene?.kind === 'contrast') text.push(...c.scene.pairs.flatMap((p) => [p.world, p.says, p.because, p.then ?? '']), c.scene.ask!.q, c.scene.ask!.a);
      if (c.scene?.kind === 'grid' && c.scene.caption) text.push(c.scene.caption);
    }
    const boardText = (d: DrillStep) => [
      d.title,
      ...d.body,
      d.done,
      ...(d.steps ?? []),
      ...d.rows.flatMap((r) => [r.label, r.note ?? '', r.needs ?? '', ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
      ...(d.misconceptions ?? []).map((m) => m.text),
      ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
      ...Object.values(d.words ?? {}),
    ];
    for (const d of lesson.drill!) text.push(...boardText(d));
    for (const seed of SEEDS.slice(0, 20)) for (const it of allItems(seed)) {
      if (it.scratch) text.push(...boardText(it.scratch));
      text.push(...(it.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]));
    }
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/['"]/);
    expect(all).not.toMatch(/[=≠→&]/);
  });
});
