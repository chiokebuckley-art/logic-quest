/**
 * Stop 7, Lesson 3 · Cause or just together? Every answer is solved again here from the table the player sees (the
 * grid scene's ✓ and ✗), not from the engine function that set it: a cause is followed in every row and changes
 * alone in some pair of rows; together-records never show a cause; a blocked day rules a cause out.
 */
import { describe, expect, it } from 'vitest';
import { arcadeItem, checkItems, freshItems, lesson } from '../../content/stop7/causes';
import { looks } from '../fresh';
import {
  FRAMES,
  LAMP_TABLE,
  PAIR_SKINS,
  SUN_TABLE,
  CAUSE_RULE,
  CAUSE_TERM,
  SUN_TABLE_4,
  TEST_SKINS,
  THIRD_SKINS,
  causeItem,
  makeTestTable,
  makeThirdTable,
  tableAnswer,
  thirdCausesBoth,
  thirdItem,
  thirdVsA,
  verdict,
  type CauseKind,
  type CauseMade,
  type Frame,
} from '../puzzles/causes';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, Item, Scene } from '../types';

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
  // The caption says what a row is; the prompt does not say it again.
  expect(readGrid(it.scene).g.caption).toMatch(/^Each row is one /);
  expect(it.prompt, it.prompt).not.toContain('Each row is one');
  // One meaning of “a cause” across every kind: works every time, unless the table names something that stops it.
  const causeTerms = (it.teach?.terms ?? []).filter((t) => t.word === 'A cause');
  expect(causeTerms).toEqual([CAUSE_TERM]);
  expect(teachStrings(it).join(' ')).not.toContain('Something can block it');

  if (it.skill === 's7.cause-together') {
    expect(candCols.length).toBe(1);
    const mismatch = rows.findIndex((r) => r.v[0] !== r.e);
    const right = mismatch >= 0 ? 'no' : 'notyet';
    expect(it.answer).toBe(right);
    expect(it.conflict).toBe(true);
    // The “No” choice names a day that breaks it: true only when one does. “Yes” is never right from records.
    if (right === 'no') {
      expect(it.feedback!.yes.headline).toContain(`${rows[mismatch].label.split(':')[0].toLowerCase()}`);
      expect(it.feedback!.notyet.headline).toContain('“Not yet,” but');
      expect(it.feedback!.notyet.headline).toContain('already shows');
      // The rule’s exception is checked where the rule is used: on the breaking day, nothing named stopped it.
      const br = rows[mismatch];
      const said = [it.explain, it.whyWrong!.yes, it.whyWrong!.notyet];
      for (const x of said) {
        const at = `${/^(game|week)/i.test(br.label) ? 'in' : 'on'} ${br.label.toLowerCase()}`;
        if (br.v[0] && !br.e) expect(x).toContain(`The table names nothing that stopped it ${at}.`);
        else expect(x).not.toContain('names nothing that stopped it');
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
        // The rule is said with its exception: nothing named stopped it on the row that breaks it.
        const br = rows[s.breaks[0] - 1];
        const why = it.whyWrong![c.id];
        if (br.v[Number(c.id.slice(1)) - 1] && !br.e) expect(why).toContain(`The table names nothing that stopped it in test ${s.breaks[0]}.`);
        else expect(why).not.toContain('names nothing that stopped it');
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
  it('card 1 states the rule with its exception, and card 5 names the closed shop as what stopped it', () => {
    expect(CAUSE_RULE).toBe('In these puzzles, a cause works every time, unless the table names something that stops it.');
    expect(lesson.ideas[0].body).toContain(`${CAUSE_RULE} When the switch is flipped, the lamp is on. When it is not, the lamp is off.`);
    const card5 = lesson.ideas.find((c) => c.title === 'Look for a third thing')!;
    expect(card5.body.join(' ')).toContain('On day 4, the closed shop stopped the heat from causing ice cream sales.');
    expect(card5.body.join(' ')).toContain('Heat still causes ice cream sales when the shop is open.');
    // The card’s table agrees: the heat causes sunburns, and ice cream sales except on the day the shop was closed.
    expect(thirdCausesBoth(SUN_TABLE_4)).toBe(true);
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

  it('board marks match the table on the board', () => {
    expect(lesson.drill!.length).toBe(2);
    for (const d of lesson.drill!) {
      const { rows, g } = readGrid(d.scene);
      for (const r of d.rows) {
        // The row is a candidate, named like “The switch”: find its column by the table’s words.
        const col = g.cols.findIndex((c) => {
          const f = [...[LAMP_TABLE, SUN_TABLE].flatMap((t) => t.cands)].find((x) => x.label === c.label);
          return !!f && f.noun.toLowerCase() === r.label.toLowerCase();
        });
        expect(col, r.label).toBeGreaterThanOrEqual(0);
        const s = solve(rows, col);
        const [fol, alone, v] = r.marks;
        expect(fol.answer).toBe(s.follows ? 'yes' : 'no');
        expect(alone.answer).toBe(s.alone ? 'yes' : 'no');
        expect(v.answer).toBe(s.verdict);
        for (const m of r.marks) {
          if (m.given) continue;
          for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim(), `${m.id} ${o.id}`).toBeTruthy();
        }
      }
      expect(d.rows.flatMap((r) => r.marks).filter((m) => !m.given).length).toBeLessThanOrEqual(12);
    }
    // Board 1 shows the switch checked and asks for the clock; board 2 is the can’t-tell case.
    expect(lesson.drill![0].rows[0].marks.every((m) => m.given)).toBe(true);
    expect(lesson.drill![1].rows.map((r) => r.marks[2].answer)).toEqual(['cant', 'cant']);
  });
});
