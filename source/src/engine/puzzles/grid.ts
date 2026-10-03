/**
 * Stop 4 · Grid Detective. Logic grids: people are rows, choices (pets, snacks, gems, …) are columns, and
 * in every category each person gets one value and each value goes to one person.
 *
 * Every answer here comes from listing all assignments (at most 4! = 24 for one category, 3!·3! = 36 for
 * two) and keeping the ones where every clue or mark holds (gridClueHolds from ../grade). A small
 * human-style solver (humanSolve) checks that each full puzzle can be solved by crossing out and "only one
 * left", with no trial and error, and gives the first step for explanations. Nothing is hand-asserted.
 *
 * Skins give the same structure different words: kids with pets and snacks, dragons with gems and caves,
 * robots with colors and jobs, and letters with numbers and colors.
 *
 * Every item also carries the teaching shown after a wrong answer (Item.teach, and ChoiceFeedback for each wrong
 * choice). Its cases are boxes, lines of the grid, or whole ways to fill it, and every true / false they show is
 * computed from the case by the same brute force (see "teaching after a wrong answer" below).
 */
import { YES_NO } from '../drill';
import { gridClueHolds } from '../grade';
import { syncWhyWrong } from '../teach';
import type {
  AssignItem, Choice, ChoiceFeedback, ChooseItem, DrillMark, DrillOption, DrillRow, DrillStep, GridClue, MultiItem, Rng, Scene, Teach, TeachCase, Truth,
} from '../types';

const STOP = 4;
export const CANT = 'cant';
const CANT_YET: Choice = { id: CANT, label: 'Can’t tell yet' };

export type SkinId = 'kids' | 'dragons' | 'robots' | 'letters';
export type SkinKind = 'everyday' | 'fantasy' | 'abstract';
export type GridClueType = GridClue['t'];
export type Mark = 'yes' | 'no';

// ---------- small text helpers ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unstop = (s: string) => s.replace(/[.!?]$/, '');
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** 'Ava, Ben and Cal' */
export const joinNames = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
/** 'a cat, a dog or a fish' */
export const joinOr = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
const fill = (tpl: string, map: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => map[k] ?? '');
/** 'Clue 2' / 'Clues 1 and 3' + the verb in the right form. */
const citeCross = (deps: readonly number[]) =>
  deps.length === 1 ? `Clue ${deps[0] + 1} crosses out` : `Clues ${joinNames(deps.map((d) => String(d + 1)))} cross out`;

// ---------- skins ----------

export interface Val {
  id: string;
  /** Column label and short name: 'cat', 'sea cave', 'red', '2'. */
  label: string;
  /** In a list of choices: 'a cat', 'popcorn', 'the ruby', 'red'. */
  a: string;
  /** In a sentence: 'the cat', 'popcorn', 'red', 'the cook'. */
  obj: string;
}

export interface Cat {
  id: string;
  /** Heading for this part of the grid: 'Pet'. */
  label: string;
  /** 'pet' ("every pet but one"). */
  noun: string;
  /** 'pets' ("The grid shows the pets."). */
  plural: string;
  values: readonly Val[];
  /** Verb forms that go before a value: 'has' / 'does not have' / 'have'. */
  is: string;
  not: string;
  base: string;
  /** '{who} each have a different pet' */
  each: string;
  /** '{p} has just one pet' */
  one: string;
  /** 'Which pet must {p} have?' */
  ask: string;
  /** 'the kid with {v}' — the one who has this value. */
  holder: string;
  /** Keep values in this order and use the first n (numbers 1, 2, 3). */
  ordered?: boolean;
  /** A shorter way to list the values ('the sea, ice or hill cave'). Default: joinOr of each value's `a`. */
  list?(vals: readonly Val[]): string;
}

export interface Skin {
  id: SkinId;
  kind: SkinKind;
  /** Name pool. No two names share a first letter. */
  pool: readonly string[];
  /** 'Who' / 'Which dragon' */
  who: string;
  /** 'kid' / 'dragon' */
  noun: string;
  /** How to name the group: '{list}' / 'The dragons {list}'. */
  group: string;
  cats: readonly [Cat, Cat];
}

const v = (id: string, label: string, a: string, obj: string): Val => ({ id, label, a, obj });
const theVals = (xs: readonly [string, string, string][]) => xs.map(([id, label, a]) => v(id, label, a, `the ${label}`));

const PET: Cat = {
  id: 'pet', label: 'Pet', noun: 'pet', plural: 'pets',
  values: theVals([['cat', 'cat', 'a cat'], ['dog', 'dog', 'a dog'], ['fish', 'fish', 'a fish'], ['bird', 'bird', 'a bird']]),
  is: 'has', not: 'does not have', base: 'have',
  each: '{who} each have a different pet', one: '{p} has just one pet', ask: 'Which pet must {p} have?', holder: 'the kid with {v}',
};
const SNACK: Cat = {
  id: 'snack', label: 'Snack', noun: 'snack', plural: 'snacks',
  values: ['apples', 'popcorn', 'grapes', 'pretzels'].map((s) => v(s, s, s, s)),
  is: 'eats', not: 'does not eat', base: 'eat',
  each: '{who} each eat a different snack', one: '{p} eats just one snack', ask: 'Which snack must {p} eat?', holder: 'the kid who eats {v}',
};
const GEM: Cat = {
  id: 'gem', label: 'Gem', noun: 'gem', plural: 'gems',
  values: theVals([['ruby', 'ruby', 'a ruby'], ['pearl', 'pearl', 'a pearl'], ['opal', 'opal', 'an opal'], ['diamond', 'diamond', 'a diamond']]),
  is: 'guards', not: 'does not guard', base: 'guard',
  each: '{who} each guard a different gem', one: '{p} guards just one gem', ask: 'Which gem must {p} guard?', holder: 'the dragon that guards {v}',
};
const CAVE: Cat = {
  id: 'cave', label: 'Cave', noun: 'cave', plural: 'caves',
  values: [['sea', 'sea cave'], ['ice', 'ice cave'], ['hill', 'hill cave'], ['sand', 'sand cave']].map(([id, label]) => v(id, label, `the ${label}`, `the ${label}`)),
  is: 'lives in', not: 'does not live in', base: 'live in',
  each: '{who} each live in a different cave', one: '{p} lives in just one cave', ask: 'Which cave must {p} live in?', holder: 'the dragon in {v}',
  list: (vals) => `the ${joinOr(vals.map((x) => x.id))} cave`,
};
const COLOR: Cat = {
  id: 'color', label: 'Color', noun: 'color', plural: 'colors',
  values: ['red', 'blue', 'green', 'silver'].map((s) => v(s, s, s, s)),
  is: 'is', not: 'is not', base: 'be',
  each: '{who} are each a different color', one: '{p} is just one color', ask: 'Which color must {p} be?', holder: 'the {v} robot',
};
const JOB: Cat = {
  id: 'job', label: 'Job', noun: 'job', plural: 'jobs',
  values: ['cook', 'guard', 'painter', 'driver'].map((s) => v(s, s, s, `the ${s}`)),
  is: 'is', not: 'is not', base: 'be',
  each: '{who} each have a different job', one: '{p} has just one job', ask: 'Which job must {p} have?', holder: '{v}',
};
const NUMBER: Cat = {
  id: 'num', label: 'Number', noun: 'number', plural: 'numbers',
  values: ['1', '2', '3', '4'].map((s) => v(`n${s}`, s, s, s)),
  is: 'has', not: 'does not have', base: 'have', ordered: true,
  each: '{who} each have a different number', one: '{p} has just one number', ask: 'Which number must {p} have?', holder: 'the letter with {v}',
};
const LCOLOR: Cat = {
  id: 'color', label: 'Color', noun: 'color', plural: 'colors',
  values: ['red', 'blue', 'green', 'yellow'].map((s) => v(s, s, s, s)),
  is: 'is', not: 'is not', base: 'be',
  each: '{who} are each a different color', one: '{p} is just one color', ask: 'Which color must {p} be?', holder: 'the {v} letter',
};

export const SKINS: Record<SkinId, Skin> = {
  kids: {
    id: 'kids', kind: 'everyday', who: 'Who', noun: 'kid', group: '{list}',
    pool: ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Jin', 'Kai', 'Leo', 'Mia', 'Nia', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Zoe'],
    cats: [PET, SNACK],
  },
  dragons: {
    id: 'dragons', kind: 'fantasy', who: 'Which dragon', noun: 'dragon', group: 'The dragons {list}',
    pool: ['Ash', 'Blaze', 'Cinder', 'Dusk', 'Ember', 'Frost', 'Moss', 'Onyx', 'Storm'],
    cats: [GEM, CAVE],
  },
  robots: {
    id: 'robots', kind: 'fantasy', who: 'Which robot', noun: 'robot', group: 'The robots {list}',
    pool: ['Bolt', 'Chip', 'Dot', 'Gizmo', 'Kit', 'Nano', 'Rivet', 'Tik', 'Volt', 'Zap'],
    cats: [COLOR, JOB],
  },
  letters: {
    id: 'letters', kind: 'abstract', who: 'Which letter', noun: 'letter', group: 'The letters {list}',
    pool: ['A', 'B', 'C', 'D'],
    cats: [NUMBER, LCOLOR],
  },
};
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const EVERYDAY: readonly SkinId[] = ['kids'];
export const FANTASY: readonly SkinId[] = ['dragons', 'robots'];

// ---------- the cast of one puzzle ----------

/** personId -> categoryId -> valueId */
export type Sol = Record<string, Record<string, string>>;

/** What brute force needs: the people and each category's values. */
export interface Spec {
  people: string[];
  cats: { id: string; values: string[] }[];
}

export interface Cast {
  skin: Skin;
  /** Rows, sorted by name so the order gives nothing away. */
  people: Choice[];
  /** The categories in this puzzle, each with exactly one value per person. */
  cats: { cat: Cat; vals: Val[] }[];
  spec: Spec;
  nm(id: string): string;
}

export function makeCast(rng: Rng, skin: Skin, n: number, catIdx: readonly number[]): Cast {
  const picked = skin.id === 'letters' ? skin.pool.slice(0, n) : rng.shuffle(skin.pool).slice(0, n);
  const labels = [...picked].sort();
  const people = labels.map((l) => ({ id: l.toLowerCase(), label: l }));
  const cats = catIdx.map((k) => {
    const cat = skin.cats[k];
    const chosen = cat.ordered ? cat.values.slice(0, n) : rng.shuffle(cat.values).slice(0, n);
    const vals = cat.values.filter((x) => chosen.includes(x));
    return { cat, vals };
  });
  const names: Record<string, string> = Object.fromEntries(people.map((p) => [p.id, p.label]));
  const spec: Spec = { people: people.map((p) => p.id), cats: cats.map((c) => ({ id: c.cat.id, values: c.vals.map((x) => x.id) })) };
  return { skin, people, cats, spec, nm: (id) => names[id] };
}

/** A random hidden answer: every category is a shuffle of its values. */
export function randomSol(rng: Rng, cast: Cast): Sol {
  const sol: Sol = Object.fromEntries(cast.spec.people.map((p) => [p, {}]));
  for (const c of cast.spec.cats) {
    const order = rng.shuffle(c.values);
    cast.spec.people.forEach((p, i) => { sol[p][c.id] = order[i]; });
  }
  return sol;
}

/** Word helpers for one cast. */
export function wordsFor(cast: Cast) {
  const catOf = (c: string) => cast.cats.find((x) => x.cat.id === c)!;
  const cat = (c: string) => catOf(c).cat;
  const val = (c: string, id: string) => catOf(c).vals.find((x) => x.id === id)!;
  const obj = (c: string, id: string) => val(c, id).obj;
  const nm = cast.nm;
  return {
    cat,
    val,
    obj,
    /** 'Mia has the cat' */
    is: (p: string, c: string, id: string) => `${nm(p)} ${cat(c).is} ${obj(c, id)}`,
    /** 'Mia does not have the cat' */
    not: (p: string, c: string, id: string) => `${nm(p)} ${cat(c).not} ${obj(c, id)}`,
    /** 'have the cat' */
    base: (c: string, id: string) => `${cat(c).base} ${obj(c, id)}`,
    /** 'the kid with the cat' */
    holder: (c: string, id: string) => fill(cat(c).holder, { v: obj(c, id) }),
    /** 'Mia – cat' */
    cell: (p: string, id: string, c: string) => `${nm(p)} – ${val(c, id).label}`,
    /** 'Mia has just one pet' */
    one: (p: string, c: string) => fill(cat(c).one, { p: nm(p) }),
    /** 'Only one kid can have the cat' */
    onlyOne: (c: string, id: string) => `Only one ${cast.skin.noun} can ${cat(c).base} ${obj(c, id)}`,
    /** 'Who has the cat?' */
    whoIs: (c: string, id: string) => `${cast.skin.who} ${cat(c).is} ${obj(c, id)}?`,
  };
}

/** The opening sentences: who is in the puzzle and what they each get. list=false leaves out the list of values. */
export function settingText(cast: Cast, list: readonly boolean[] = cast.cats.map(() => true)): string {
  const names = fill(cast.skin.group, { list: joinNames(cast.people.map((p) => p.label)) });
  return cast.cats
    .map(({ cat, vals }, i) => {
      const s = fill(cat.each, { who: i === 0 ? names : 'They' });
      if (!list[i]) return `${s}.`;
      const one = `${s}: ${cat.list ? cat.list(vals) : joinOr(vals.map((x) => x.a))}.`;
      // Keep sentences short: a long one becomes two.
      return one.split(/\s+/).length <= 20 ? one : `${s}. The ${cat.plural} are ${joinNames(vals.map((x) => x.a))}.`;
    })
    .join(' ');
}

/** One clue in the skin's words, with a full stop. */
export function clueText(cast: Cast, clue: GridClue): string {
  const w = wordsFor(cast);
  switch (clue.t) {
    case 'is': return `${w.is(clue.p, clue.c, clue.v)}.`;
    case 'isnt': return `${w.not(clue.p, clue.c, clue.v)}.`;
    case 'either': return `${cast.nm(clue.p)} ${w.cat(clue.c).is} ${w.obj(clue.c, clue.v1)} or ${w.obj(clue.c, clue.v2)}.`;
    case 'link': return `${cap(w.holder(clue.c1, clue.v1))} ${w.cat(clue.c2).is} ${w.obj(clue.c2, clue.v2)}.`;
    case 'notLink': return `${cap(w.holder(clue.c1, clue.v1))} ${w.cat(clue.c2).not} ${w.obj(clue.c2, clue.v2)}.`;
  }
}

// ---------- brute force ----------

export function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

const solCache = new Map<string, Sol[]>();
/** Every full assignment (each category a one-to-one match of people and values), in a fixed order. */
export function allSols(spec: Spec): Sol[] {
  const key = JSON.stringify(spec);
  let out = solCache.get(key);
  if (out) return out;
  let combos: string[][][] = [[]];
  for (const c of spec.cats) {
    const ps = permutations(c.values);
    combos = combos.flatMap((pre) => ps.map((pm) => [...pre, pm]));
  }
  out = combos.map((combo) => {
    const s: Sol = {};
    spec.people.forEach((p, i) => { s[p] = {}; spec.cats.forEach((c, k) => { s[p][c.id] = combo[k][i]; }); });
    return s;
  });
  solCache.set(key, out);
  return out;
}

/** Every assignment where all the clues hold. */
export const fitting = (spec: Spec, clues: readonly GridClue[]) => allSols(spec).filter((s) => clues.every((c) => gridClueHolds(c, s)));

/** ✓ / ✗ marks on one category's part of the grid: person -> value -> mark. */
export type Marks = Record<string, Record<string, Mark>>;

/** Every assignment that agrees with the marks in category c. */
export const fittingMarks = (spec: Spec, c: string, marks: Marks) =>
  allSols(spec).filter((s) => Object.entries(marks).every(([p, m]) => Object.entries(m).every(([val, mk]) => (s[p][c] === val) === (mk === 'yes'))));

/** Who can hold value v of category c across these assignments. */
export const holders = (sols: readonly Sol[], c: string, val: string, people: readonly string[]) =>
  people.filter((p) => sols.some((s) => s[p][c] === val));
/** Which values person p can have in category c across these assignments. */
export const options = (sols: readonly Sol[], p: string, c: string, vals: readonly string[]) => vals.filter((x) => sols.some((s) => s[p][c] === x));
/** 'yes' when every assignment gives p the value, 'no' when none does, else 'open'. */
export function cellStatus(sols: readonly Sol[], p: string, c: string, val: string): Mark | 'open' {
  const n = sols.filter((s) => s[p][c] === val).length;
  return n === sols.length ? 'yes' : n === 0 ? 'no' : 'open';
}

// ---------- clues ----------

/** Every clue of the given types that is true for this answer. */
export function trueGridClues(spec: Spec, sol: Sol, types: readonly GridClueType[]): GridClue[] {
  const has = (t: GridClueType) => types.includes(t);
  const out: GridClue[] = [];
  for (const p of spec.people) {
    for (const c of spec.cats) {
      const mine = sol[p][c.id];
      if (has('is')) out.push({ t: 'is', p, c: c.id, v: mine });
      for (const w of c.values) {
        if (w === mine) continue;
        if (has('isnt')) out.push({ t: 'isnt', p, c: c.id, v: w });
        if (has('either')) out.push({ t: 'either', p, c: c.id, v1: mine, v2: w });
      }
    }
  }
  if (spec.cats.length === 2) {
    for (const [a, b] of [[0, 1], [1, 0]] as const) {
      const c1 = spec.cats[a].id, c2 = spec.cats[b].id;
      for (const p of spec.people) {
        if (has('link')) out.push({ t: 'link', c1, v1: sol[p][c1], c2, v2: sol[p][c2] });
        if (has('notLink')) for (const q of spec.people) if (q !== p) out.push({ t: 'notLink', c1, v1: sol[p][c1], c2, v2: sol[q][c2] });
      }
    }
  }
  return out;
}

/** Same meaning -> same key (links read both ways; "or" does not care about order). */
export function gridClueKey(c: GridClue): string {
  switch (c.t) {
    case 'is':
    case 'isnt': return `${c.t}:${c.p}:${c.c}:${c.v}`;
    case 'either': return `either:${c.p}:${c.c}:${[c.v1, c.v2].sort().join(',')}`;
    case 'link':
    case 'notLink': return `${c.t}:${[`${c.c1}=${c.v1}`, `${c.c2}=${c.v2}`].sort().join('&')}`;
  }
}

/** Does a clue name this person or this value? */
export function mentions(c: GridClue, who: string | null, cat: string, val: string | null): boolean {
  switch (c.t) {
    case 'is':
    case 'isnt': return (who !== null && c.p === who && c.c === cat) || (val !== null && c.c === cat && c.v === val);
    case 'either': return (who !== null && c.p === who && c.c === cat) || (val !== null && c.c === cat && (c.v1 === val || c.v2 === val));
    case 'link':
    case 'notLink': return val !== null && ((c.c1 === cat && c.v1 === val) || (c.c2 === cat && c.v2 === val));
  }
}

function weightedShuffle<T>(rng: Rng, xs: readonly T[], w: (x: T) => number): T[] {
  const rest = [...xs];
  const out: T[] = [];
  while (rest.length) {
    const total = rest.reduce((s, x) => s + w(x), 0);
    let r = rng.next() * total;
    let i = 0;
    for (; i < rest.length - 1; i++) {
      r -= w(rest[i]);
      if (r < 0) break;
    }
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

export type Weights = Partial<Record<GridClueType, number>>;

/**
 * Draw true clues for a hidden answer until exactly one assignment fits, then drop every clue that is not
 * needed. Returns null when these clue types cannot pin it down (the caller tries again).
 * maxIs caps the number of "has" clues, so puzzles do not simply hand out the answer.
 */
export function forceGridClues(rng: Rng, spec: Spec, sol: Sol, weights: Weights, maxIs = 1): GridClue[] | null {
  const types = (Object.keys(weights) as GridClueType[]).filter((t) => (weights[t] ?? 0) > 0);
  const cands = weightedShuffle(rng, trueGridClues(spec, sol, types), (c) => weights[c.t] ?? 0);
  let clues: GridClue[] = [];
  let count = fitting(spec, clues).length;
  for (const c of cands) {
    if (count === 1) break;
    if (c.t === 'is' && clues.filter((x) => x.t === 'is').length >= maxIs) continue;
    const next = fitting(spec, [...clues, c]).length;
    if (next < count) {
      clues = [...clues, c];
      count = next;
    }
  }
  if (count !== 1) return null;
  for (const c of rng.shuffle(clues)) {
    const rest = clues.filter((x) => x !== c);
    if (fitting(spec, rest).length === 1) clues = rest;
  }
  return rng.shuffle(clues).map((c) => inListOrder(spec, c));
}

/** An "or" clue names its two values in the order the grid lists them ("1 or 3", never "3 or 1"). */
function inListOrder(spec: Spec, c: GridClue): GridClue {
  if (c.t !== 'either') return c;
  const vals = spec.cats.find((x) => x.id === c.c)!.values;
  return vals.indexOf(c.v1) <= vals.indexOf(c.v2) ? c : { ...c, v1: c.v2, v2: c.v1 };
}

/** True when every clue matters: dropping any one of them lets more assignments fit. */
export function nonRedundant(spec: Spec, clues: readonly GridClue[]): boolean {
  const base = fitting(spec, clues).length;
  return clues.every((_, i) => fitting(spec, clues.filter((_, j) => j !== i)).length > base);
}

// ---------- the human-style solver ----------

export interface Cell { p: string; c: string; v: string }
/**
 * Why a mark was made: a clue on its own; a ✓ spread along its row or down its column; the only box left in
 * a row or column; or a linking clue carrying a mark from the other part of the grid.
 */
export type Why =
  | { k: 'clue'; i: number }
  | { k: 'spread'; from: Cell; along: 'row' | 'col' }
  | { k: 'left'; along: 'row' | 'col' }
  | { k: 'link'; i: number; from: Cell };
export interface Step extends Cell {
  mark: Mark;
  why: Why;
  /** Indexes of every clue this mark depends on. */
  deps: number[];
}
export interface Solved {
  solved: boolean;
  steps: Step[];
  at(p: string, c: string, v: string): Step | undefined;
}

/**
 * Solve like a person with a pencil: put in the marks the clues give, spread every ✓ along its row and down its
 * column, fill the only box left in any row or column, and carry marks across linking clues. No guessing.
 * Every mark it makes is sound (it holds in every assignment that fits the clues).
 */
export function humanSolve(spec: Spec, clues: readonly GridClue[]): Solved {
  const at = new Map<string, Step>();
  const steps: Step[] = [];
  const key = (p: string, c: string, val: string) => `${p}|${c}|${val}`;
  const get = (p: string, c: string, val: string) => at.get(key(p, c, val))?.mark;
  const vals = (c: string) => spec.cats.find((x) => x.id === c)!.values;
  let changed = false;
  const set = (p: string, c: string, val: string, mark: Mark, why: Why, deps: readonly number[]) => {
    const old = at.get(key(p, c, val));
    if (old) {
      if (old.mark !== mark) throw new Error('humanSolve: the clues contradict each other');
      return;
    }
    const s: Step = { p, c, v: val, mark, why, deps: [...new Set(deps)].sort((a, b) => a - b) };
    at.set(key(p, c, val), s);
    steps.push(s);
    changed = true;
  };
  clues.forEach((cl, i) => {
    if (cl.t === 'is') set(cl.p, cl.c, cl.v, 'yes', { k: 'clue', i }, [i]);
    if (cl.t === 'isnt') set(cl.p, cl.c, cl.v, 'no', { k: 'clue', i }, [i]);
    if (cl.t === 'either') for (const w of vals(cl.c)) if (w !== cl.v1 && w !== cl.v2) set(cl.p, cl.c, w, 'no', { k: 'clue', i }, [i]);
  });
  do {
    changed = false;
    for (const s of [...steps]) {
      if (s.mark !== 'yes') continue;
      const from: Cell = { p: s.p, c: s.c, v: s.v };
      for (const w of vals(s.c)) if (w !== s.v) set(s.p, s.c, w, 'no', { k: 'spread', from, along: 'row' }, s.deps);
      for (const q of spec.people) if (q !== s.p) set(q, s.c, s.v, 'no', { k: 'spread', from, along: 'col' }, s.deps);
    }
    if (changed) continue;
    for (const c of spec.cats) {
      for (const p of spec.people) {
        const open = c.values.filter((w) => get(p, c.id, w) !== 'no');
        if (open.length === 0) throw new Error('humanSolve: a row has no box left');
        if (open.length === 1 && get(p, c.id, open[0]) !== 'yes') {
          set(p, c.id, open[0], 'yes', { k: 'left', along: 'row' }, c.values.filter((w) => w !== open[0]).flatMap((w) => at.get(key(p, c.id, w))!.deps));
        }
      }
      for (const val of c.values) {
        const open = spec.people.filter((q) => get(q, c.id, val) !== 'no');
        if (open.length === 0) throw new Error('humanSolve: a column has no box left');
        if (open.length === 1 && get(open[0], c.id, val) !== 'yes') {
          set(open[0], c.id, val, 'yes', { k: 'left', along: 'col' }, spec.people.filter((q) => q !== open[0]).flatMap((q) => at.get(key(q, c.id, val))!.deps));
        }
      }
    }
    if (changed) continue;
    clues.forEach((cl, i) => {
      if (cl.t !== 'link' && cl.t !== 'notLink') return;
      for (const p of spec.people) {
        const a = at.get(key(p, cl.c1, cl.v1)), b = at.get(key(p, cl.c2, cl.v2));
        const carry = (src: Step, c: string, val: string, mark: Mark) =>
          set(p, c, val, mark, { k: 'link', i, from: { p: src.p, c: src.c, v: src.v } }, [i, ...src.deps]);
        if (cl.t === 'link') {
          if (a) carry(a, cl.c2, cl.v2, a.mark);
          if (b) carry(b, cl.c1, cl.v1, b.mark);
        } else {
          if (a?.mark === 'yes') carry(a, cl.c2, cl.v2, 'no');
          if (b?.mark === 'yes') carry(b, cl.c1, cl.v1, 'no');
        }
      }
    });
  } while (changed);
  const solved = spec.cats.every((c) => spec.people.every((p) => c.values.every((w) => get(p, c.id, w) !== undefined)));
  return { solved, steps, at: (p, c, val) => at.get(key(p, c, val)) };
}

/** One sentence (or two) for a ✓ the solver found from a clue or from "only one left". */
export function tickText(cast: Cast, clues: readonly GridClue[], s: Step): string {
  const w = wordsFor(cast);
  const must = `So ${cast.nm(s.p)} must ${w.base(s.c, s.v)}.`;
  if (s.why.k === 'clue') return `Clue ${s.why.i + 1} says ${w.is(s.p, s.c, s.v)}.`;
  if (s.why.k === 'left' && s.why.along === 'row') return `${citeCross(s.deps)} every ${w.cat(s.c).noun} but one for ${cast.nm(s.p)}. ${must}`;
  if (s.why.k === 'left') return `${citeCross(s.deps)} every ${cast.skin.noun} but one for ${w.obj(s.c, s.v)}. ${must}`;
  if (s.why.k === 'link') {
    const f = s.why.from;
    return `Clue ${s.why.i + 1} says “${unstop(clueText(cast, clues[s.why.i]))},” and ${w.is(f.p, f.c, f.v)}. So ${w.is(s.p, s.c, s.v)}.`;
  }
  throw new Error('tickText: a spread never gives a ✓');
}

/** 'Mia has the cat, Leo has the fish and Ava has the dog.' or one sentence per person for two categories. */
export function answerText(cast: Cast, sol: Sol): string {
  const w = wordsFor(cast);
  if (cast.cats.length === 1) {
    const c = cast.cats[0].cat.id;
    return `${joinNames(cast.people.map((p) => w.is(p.id, c, sol[p.id][c])))}.`;
  }
  const [c1, c2] = cast.cats.map((x) => x.cat.id);
  return cast.people.map((p) => `${w.is(p.id, c1, sol[p.id][c1])} and ${w.cat(c2).is} ${w.obj(c2, sol[p.id][c2])}.`).join(' ');
}

// ---------- teaching after a wrong answer ----------
//
// The explanation after a miss follows docs/CONTENT_GUIDE.md ("Wrong answers: teach first"). Its cases are of
// three kinds, and every true / false on them is computed here, never written by hand:
//   - a box ("Ava – cat."): could / must the person have the thing, over every assignment the case allows;
//   - a line (one row or column) in words, with the same could / must truths;
//   - one way to fill the grid, with whether each clue (or the grid's marks) holds there.
// Each case keeps its Basis (the clues, marks or single way it is about), so the tests can recompute every truth.

/** What a case's truths are about: every assignment that fits these clues and these marks, or one assignment. */
export interface Basis {
  clues?: GridClue[];
  marks?: { c: string; marks: Marks };
  way?: Sol;
}

/** The bases of an item's teaching cases (same order as teach.cases) and of each wrong choice's example. */
export interface Bases {
  cases: Basis[];
  examples: Record<string, Basis>;
  /** The Hint's marked case (Item.hintCase). */
  hint?: Basis;
}

/** Every assignment a basis allows. */
export function basisSols(spec: Spec, b: Basis): Sol[] {
  if (b.way) return [b.way];
  const sols = fitting(spec, b.clues ?? []);
  if (!b.marks) return sols;
  const ok = new Set(fittingMarks(spec, b.marks.c, b.marks.marks));
  return sols.filter((s) => ok.has(s));
}

/** Does one assignment agree with the marks in category c? */
export const marksHold = (c: string, marks: Marks, s: Sol) =>
  Object.entries(marks).every(([p, m]) => Object.entries(m).every(([val, mk]) => (s[p][c] === val) === (mk === 'yes')));

/** 'kids', 'dragons', … */
const plural = (cast: Cast) => `${cast.skin.noun}s`;
/** 'Two', 'Three' for counts in notes. */
const COUNT = ['No', 'One', 'Two', 'Three', 'Four'];

/** Words for the teaching of one cast: truths, box cases and ways. */
function teachWords(cast: Cast) {
  const w = wordsFor(cast);
  const nm = cast.nm;
  const could = (sols: readonly Sol[], p: string, c: string, v: string): Truth => ({ who: `${nm(p)} could ${w.base(c, v)}`, value: sols.some((s) => s[p][c] === v) });
  const must = (sols: readonly Sol[], p: string, c: string, v: string): Truth => ({ who: `${nm(p)} must ${w.base(c, v)}`, value: sols.length > 0 && sols.every((s) => s[p][c] === v) });
  /** The truth of "Mia has the cat" in one assignment. */
  const fact = (way: Sol, p: string, c: string, v: string): Truth => ({ who: w.is(p, c, v), value: way[p][c] === v });
  /** What a box's status means, as a note. */
  const markNote = (sols: readonly Sol[], p: string, c: string, v: string) => {
    const st = cellStatus(sols, p, c, v);
    const cell = w.cell(p, v, c);
    return st === 'yes' ? `So ${cell} gets a ✓.` : st === 'no' ? `So ${cell} gets a ✗.` : `So ${cell} stays empty for now.`;
  };
  /** One box as a case: could and must, computed over `sols`. */
  const box = (sols: readonly Sol[], p: string, c: string, v: string, label = `${w.cell(p, v, c)}.`, note = markNote(sols, p, c, v)): TeachCase => ({
    label,
    truths: [could(sols, p, c, v), must(sols, p, c, v)],
    note,
  });
  /** One assignment in words, one short sentence per person, for some categories (default: all of them). */
  const way = (s: Sol, cats: readonly string[] = cast.cats.map((x) => x.cat.id)): string => {
    if (cats.length === 1) return cast.people.map((p) => `${w.is(p.id, cats[0], s[p.id][cats[0]])}.`).join(' ');
    return answerText(cast, s);
  };
  return { w, nm, could, must, fact, box, way, markNote };
}

/** The assignment in `sols` that keeps the most of `prefer` true (the first one in list order on a tie). */
function bestWay(sols: readonly Sol[], prefer: readonly GridClue[]): Sol | undefined {
  let best: Sol | undefined;
  let score = -1;
  for (const s of sols) {
    const k = prefer.filter((c) => gridClueHolds(c, s)).length;
    if (k > score) { best = s; score = k; }
  }
  return best;
}

/** Terms the explanations use, defined in place. */
const TERMS = {
  yes: (cast: Cast, c: string) => ({ word: 'A ✓ in a box', meaning: `yes. The ${cast.skin.noun} in its row goes with the ${wordsFor(cast).cat(c).noun} in its column.` }),
  no: (cast: Cast, c: string) => ({ word: 'A ✗ in a box', meaning: `no. The ${cast.skin.noun} in its row does not go with the ${wordsFor(cast).cat(c).noun} in its column.` }),
  empty: { word: 'An empty box', meaning: 'you can’t tell yet.' },
  onlyOne: { word: '“Only one left”', meaning: 'every other box in a row or column has a ✗. The last empty box gets the ✓.' },
  cant: { word: '“Can’t tell yet”', meaning: 'more than one answer still fits, so you can’t be sure.' },
  spread: { word: 'Spreading a ✓', meaning: 'putting a ✗ in every other box of its row and its column.' },
  link: (cast: Cast, c1: string, c2: string) => {
    const w = wordsFor(cast);
    return { word: 'A linking clue', meaning: `a clue that joins a ${w.cat(c1).noun} and a ${w.cat(c2).noun}. It does not say which ${cast.skin.noun} has them.` };
  },
  alone: { word: '“All by itself”', meaning: 'with only that one clue. Each row and each column still gets just one ✓.' },
  proves: { word: 'A clue “proves” a mark', meaning: 'the clue shows the mark must be right, with no guessing.' },
} as const;

/** The smallest grid: two people and two values in one category, in the cast's own words. */
function tinyGrid(cast: Cast, c: string, ps: readonly [string, string], vs: readonly [string, string]): string[] {
  const w = wordsFor(cast);
  const nm = cast.nm;
  const [a, b] = ps;
  const [x, y] = vs;
  return [
    `Imagine just two ${plural(cast)}, ${nm(a)} and ${nm(b)}, and just two ${w.cat(c).plural}, ${w.obj(c, x)} and ${w.obj(c, y)}.`,
    `Say a clue tells you ${w.not(a, c, x)}. Put a ✗ in ${w.cell(a, x, c)}.`,
    `Now ${nm(a)}’s row has one empty box left: ${w.obj(c, y)}. So ${w.is(a, c, y)}.`,
    `Put a ✓ in ${w.cell(a, y, c)}. Spread it down its column: ${w.cell(b, y, c)} gets a ✗.`,
    `Now ${nm(b)}’s row has one empty box left: ${w.obj(c, x)}. So ${w.is(b, c, x)}.`,
  ];
}

// ---------- shared item parts ----------

/** Puzzle data kept next to the item so tests can re-check it by brute force. */
export interface Built<I> {
  item: I;
  cast: Cast;
  sol: Sol;
}

const gridScene = (cast: Cast, k: number, marks: Marks): Scene => ({
  kind: 'grid',
  rows: cast.people,
  cols: cast.cats[k].vals.map((x) => ({ id: x.id, label: x.label })),
  marks,
});

const cellId = (p: string, val: string) => `${p}-${val}`;

/** Cells in grid order: row by row, then column by column. */
function gridOrder(cast: Cast, k: number, cells: readonly { p: string; v: string }[]) {
  const pi = (p: string) => cast.people.findIndex((x) => x.id === p);
  const vi = (val: string) => cast.cats[k].vals.findIndex((x) => x.id === val);
  return [...cells].sort((a, b) => pi(a.p) - pi(b.p) || vi(a.v) - vi(b.v));
}

const WEIGHTS_ONE: Weights = { is: 1.5, isnt: 3, either: 2 };
const WEIGHTS_TWO: Weights = { is: 1, isnt: 3, either: 2, link: 3, notLink: 2 };
/** Weaker clues, so a puzzle needs three or more of them (lesson 5 asks about "only clues 1 and 2"). */
const WEIGHTS_SLOW: Weights = { is: 0.5, isnt: 3, either: 3 };
const WEIGHTS_SLOW_TWO: Weights = { is: 0.5, isnt: 3, either: 2, link: 2, notLink: 3 };

interface Puzzle { cast: Cast; sol: Sol; clues: GridClue[] }

/** A full puzzle that a person can solve without guessing, with clue count in [min, max]. */
function fullPuzzle(rng: Rng, skin: Skin, o: { n: number; ncat: 1 | 2; weights: Weights; min: number; max: number; needLink?: boolean }): Puzzle {
  for (let tries = 0; tries < 400; tries++) {
    const cast = makeCast(rng, skin, o.n, o.ncat === 2 ? [0, 1] : [rng.int(0, 1)]);
    const sol = randomSol(rng, cast);
    const clues = forceGridClues(rng, cast.spec, sol, o.weights);
    if (!clues || clues.length < o.min || clues.length > o.max) continue;
    if (o.needLink && !clues.some((c) => c.t === 'link' || c.t === 'notLink')) continue;
    if (!humanSolve(cast.spec, clues).solved) continue;
    return { cast, sol, clues };
  }
  throw new Error('fullPuzzle: no puzzle found');
}

// ---------- lessons 3 and 4: a whole grid ----------

export interface GridOpts {
  id: string;
  skin: SkinId;
  /** 1: one category, 2-3 easy clues. 2: two categories with a linking clue. */
  ncat: 1 | 2;
  n?: number;
}

/**
 * Teaching for a whole grid. grade() names the clue an answer breaks; this shows how the clues fill the grid, one ✓
 * at a time (the human solver's steps, each with its reason), then checks every clue against the answer.
 */
function gridTeach(cast: Cast, sol: Sol, clues: readonly GridClue[], ticks: readonly Step[]): { teach: Teach; bases: Basis[] } {
  const t = teachWords(cast);
  const [c1, c2] = cast.cats.map((x) => x.cat.id);
  const shown = ticks.slice(0, 3);
  const steps: TeachCase[] = shown.map((s, k) => ({ label: `Step ${k + 1}: ${t.w.is(s.p, s.c, s.v)}.`, note: tickText(cast, clues, s) }));
  const check: TeachCase = {
    label: `Check the answer. ${t.way(sol)}`,
    truths: clues.map((cl, i) => ({ who: `Clue ${i + 1}`, value: gridClueHolds(cl, sol) })),
    note: 'Every clue is true, so this is the answer.',
  };
  // The tiny example agrees with the answer: a keeps its own value y, and b is the one who has x.
  const a = cast.people[0].id;
  const y = sol[a][c1];
  const x = cast.cats[0].vals.map((v) => v.id).find((v) => v !== y)!;
  const b = cast.people.map((p) => p.id).find((q) => sol[q][c1] === x)!;
  return {
    teach: {
      rule: c2 ? 'Every clue must be true. In each part of the grid, each row and each column gets exactly one ✓.' : 'Every clue must be true. Each row and each column gets exactly one ✓.',
      // Every word the steps and the Remember lines use: “Spread every ✓” needs spreading in both kinds of grid.
      terms: c2 ? [TERMS.onlyOne, TERMS.spread, TERMS.link(cast, c1, c2)] : [TERMS.yes(cast, c1), TERMS.onlyOne, TERMS.spread],
      meaning: 'Just one way to fill the grid makes every clue true. Find it one mark at a time, with a reason for each mark.',
      casesTitle: shown.length < ticks.length ? `The first ${COUNT[shown.length].toLowerCase()} ✓ marks, step by step` : 'How the clues fill the grid, step by step',
      cases: [...steps, check],
      remember: ['Put in the clue marks. Spread every ✓. Then look for only one left.', 'Ask: “Does my grid make every clue true?”'],
      simpler: tinyGrid(cast, c1, [a, b], [x, y]),
    },
    bases: [...steps.map(() => ({})), { way: sol }],
  };
}

/** A full logic grid to fill in (AssignItem, layout 'grid'). */
export function gridPuzzle(rng: Rng, o: GridOpts): Built<AssignItem> & { clues: GridClue[]; bases: Bases; steps: Step[] } {
  const skin = SKINS[o.skin];
  const n = o.n ?? 3;
  const pz = o.ncat === 1
    ? fullPuzzle(rng, skin, { n, ncat: 1, weights: WEIGHTS_ONE, min: 2, max: n === 3 ? 3 : 5 })
    : fullPuzzle(rng, skin, { n, ncat: 2, weights: WEIGHTS_TWO, min: 3, max: 6, needLink: true });
  const { cast, sol, clues } = pz;
  const solve = humanSolve(cast.spec, clues);
  // The first ✓. When a clue simply hands it out, also show the first ✓ that takes a real step.
  const ticks = solve.steps.filter((s) => s.mark === 'yes');
  const first = ticks[0];
  const next = first.why.k === 'clue' ? ticks.find((s) => s.why.k !== 'clue') : undefined;
  const lead = next ? `${tickText(cast, clues, first)} Then ${lowerFirst(tickText(cast, clues, next))}` : tickText(cast, clues, first);
  const { teach, bases } = gridTeach(cast, sol, clues, ticks);
  // The Hint shows the first mark a clue gives by itself, checked against that clue alone.
  const s0 = solve.steps.find((s) => s.why.k === 'clue')!;
  const k0 = s0.why.k === 'clue' ? s0.why.i : 0;
  const hintCase = teachWords(cast).box(fitting(cast.spec, [clues[k0]]), s0.p, s0.c, s0.v, `Clue ${k0 + 1}: ${clueText(cast, clues[k0])}`);
  const item: AssignItem = {
    kind: 'assign',
    layout: 'grid',
    id: o.id,
    stop: STOP,
    lesson: o.ncat === 1 ? 's4.l3' : 's4.l4',
    skill: o.ncat === 1 ? 's4.grid-one' : 's4.grid-two',
    prompt: `${settingText(cast)} Use the clues to fill in the grid.`,
    scene: { kind: 'clues', clues: clues.map((c) => clueText(cast, c)) },
    people: cast.people,
    categories: cast.cats.map(({ cat, vals }) => ({ id: cat.id, label: cat.label, values: vals.map((x) => ({ id: x.id, label: x.label })), oneEach: true })),
    answer: Object.fromEntries(cast.people.map((p) => [p.id, { ...sol[p.id] }])),
    gridClues: clues,
    explain: `${lead} Keep going the same way until every row has one ✓${o.ncat === 2 ? ' in each part of the grid' : ''}. ${answerText(cast, sol)}`,
    hint: o.ncat === 1
      ? 'Here is the first mark a clue gives you. Put in the other clue marks. Then look for a row or column with just one empty box.'
      : 'Here is the first mark a clue gives you. Put in the other clue marks. A linking clue lets you carry a ✓ or ✗ from one part of the grid to the other.',
    hintCase,
    seconds: o.ncat === 1 ? 150 : 180,
    teach,
  };
  return { item, cast, sol, clues, bases: { cases: bases, examples: {}, hint: { clues: [clues[k0]] } }, steps: ticks.slice(0, 3) };
}

// ---------- lesson 1: one clue, one box ----------

export type MarkClue = 'is' | 'isnt' | 'either';
/**
 * How a wrong box misses the clue's box: in the right row but the wrong column, the right column but the wrong
 * row, neither, or (for an "or" clue) one of the two things the clue names.
 */
export type MarkMiss = 'row' | 'col' | 'neither' | 'named';

export interface MarkOpts {
  id: string;
  skin: SkinId;
  t?: MarkClue;
}

/** "A clue says: Leo does not have the dog. Which box gets a ✗ from this clue?" with an empty grid to look at. */
export function markPuzzle(rng: Rng, o: MarkOpts): Built<ChooseItem> & { clue: GridClue; ask: Mark; target: { p: string; v: string }; bases: Bases; kinds: Record<string, MarkMiss> } {
  const skin = SKINS[o.skin];
  const t = o.t ?? rng.pick(['is', 'isnt', 'either'] as const);
  for (let tries = 0; tries < 200; tries++) {
    const cast = makeCast(rng, skin, 3, [rng.int(0, 1)]);
    const sol = randomSol(rng, cast);
    const c = cast.cats[0].cat.id;
    const vals = cast.spec.cats[0].values;
    const ppl = cast.spec.people;
    const tw = teachWords(cast);
    const { w, nm } = tw;
    const p = rng.pick(ppl);
    const mine = sol[p][c];
    const others = rng.shuffle(ppl.filter((q) => q !== p));
    let clue: GridClue;
    let ask: Mark;
    let target: { p: string; v: string };
    let wrong: { p: string; v: string; kind: MarkMiss }[];
    if (t === 'is') {
      clue = { t: 'is', p, c, v: mine };
      ask = 'yes';
      target = { p, v: mine };
      const rowV = rng.pick(vals.filter((x) => x !== mine));
      const otherV = rng.pick(vals.filter((x) => x !== mine));
      wrong = [{ p, v: rowV, kind: 'row' }, { p: others[0], v: mine, kind: 'col' }, { p: others[1], v: otherV, kind: 'neither' }];
    } else if (t === 'isnt') {
      const bad = rng.pick(vals.filter((x) => x !== mine));
      clue = { t: 'isnt', p, c, v: bad };
      ask = 'no';
      target = { p, v: bad };
      const rowV = rng.pick(vals.filter((x) => x !== bad));
      const otherV = rng.pick(vals.filter((x) => x !== bad));
      wrong = [{ p, v: rowV, kind: 'row' }, { p: others[0], v: bad, kind: 'col' }, { p: others[1], v: otherV, kind: 'neither' }];
    } else {
      const v2 = rng.pick(vals.filter((x) => x !== mine));
      const [a, b] = vals.filter((x) => x === mine || x === v2);
      const left = vals.find((x) => x !== a && x !== b)!;
      clue = { t: 'either', p, c, v1: a, v2: b };
      ask = 'no';
      target = { p, v: left };
      wrong = [{ p, v: a, kind: 'named' }, { p, v: b, kind: 'named' }, { p: others[0], v: left, kind: 'col' }];
    }
    // Check every box against the clue alone. The target gets the asked mark. A "has" clue also gives a ✗ to the
    // rest of its row and column; every other box stays open. Nothing else is decided, so the texts below hold.
    const sols = fitting(cast.spec, [clue]);
    const status = (q: string, x: string) => cellStatus(sols, q, c, x);
    if (status(target.p, target.v) !== ask) continue;
    const expected = (q: string, x: string): Mark | 'open' => (q === target.p && x === target.v ? ask : t === 'is' && (q === p || x === mine) ? 'no' : 'open');
    if (!ppl.every((q) => vals.every((x) => status(q, x) === expected(q, x)))) continue;

    const text = clueText(cast, clue);
    const T = w.cell(target.p, target.v, c);
    const col = `the ${w.val(c, target.v).label} column`;
    const P = nm(p);
    const catNoun = w.cat(c).noun;
    const says = clue.t === 'either' ? `The clue says ${P} ${w.cat(c).is} ${w.obj(c, clue.v1)} or ${w.obj(c, clue.v2)}.` : `The clue says ${clue.t === 'is' ? w.is(p, c, mine) : w.not(p, c, target.v)}.`;
    const puts = `It puts a ${ask === 'yes' ? '✓' : '✗'} in ${T}.`;
    const heads: Record<MarkMiss, string> = {
      row: `Your box is in ${P}’s row, but not in ${col}.`,
      col: `Your box is in ${col}, but not in ${P}’s row.`,
      neither: `Your box is not in ${P}’s row or ${col}.`,
      named: `Your box is one of the two ${w.cat(c).plural} the clue names.`,
    };
    const detail = (x: { p: string; v: string; kind: MarkMiss }): string[] => {
      const cell = w.cell(x.p, x.v, c);
      const Q = nm(x.p);
      if (x.kind === 'named') return [says, `So ${P} could ${w.base(c, x.v)}. A ✗ in ${cell} would say ${P} can’t.`, `The ✗ goes on the ${catNoun} the clue leaves out: ${T}.`];
      if (clue.t === 'is') {
        if (x.kind === 'row') return [`${says} ${puts}`, `${w.one(p, c)}. So ${cell} gets a ✗, not a ✓.`];
        if (x.kind === 'col') return [`${says} ${puts}`, `${w.onlyOne(c, mine)}. So ${cell} gets a ✗, not a ✓.`];
        const [v1, v2] = options(sols, x.p, c, vals);
        const alt = v1 === x.v ? v2 : v1;
        return [`${says} ${puts}`, `${cell} is in a different row and a different column. ${Q} could ${w.base(c, x.v)}, but ${Q} could also ${w.base(c, alt)}. So ${cell} stays empty for now.`];
      }
      if (clue.t === 'either') return [says, `It is about ${P}’s row only. ${Q} could still ${w.base(c, x.v)}, so ${cell} stays empty.`];
      if (x.kind === 'row') return [`${says} ${puts}`, `The clue says nothing about ${w.obj(c, x.v)}. ${P} could still ${w.base(c, x.v)}, so ${cell} stays empty.`];
      if (x.kind === 'col') return [`${says} ${puts}`, `The clue is about ${P}, not ${Q}. ${Q} could still ${w.base(c, x.v)}, so ${cell} stays empty.`];
      return [`${says} ${puts}`, `${cell} is in a different row and a different column. ${Q} could still ${w.base(c, x.v)}, so ${cell} stays empty.`];
    };
    const feedback: Record<string, ChoiceFeedback> = {};
    const examples: Record<string, Basis> = {};
    const kinds: Record<string, MarkMiss> = {};
    for (const x of wrong) {
      const id = cellId(x.p, x.v);
      feedback[id] = { headline: heads[x.kind], detail: detail(x), example: tw.box(sols, x.p, c, x.v) };
      examples[id] = { clues: [clue] };
      kinds[id] = x.kind;
    }
    // Cases: the clue's box, then one box of each other kind (a ✗ when the clue gives one, an empty box).
    const caseBoxes = t === 'is' ? [target, wrong[0], wrong[2]] : t === 'isnt' ? [target, wrong[0], wrong[1]] : [target, wrong[0], wrong[2]];
    const [n1, n2] = clue.t === 'either' ? [clue.v1, clue.v2] : [mine, mine];
    const teach: Teach = {
      rule: t === 'either'
        ? `An “or” clue names two ${w.cat(c).plural}. The ${catNoun} it leaves out gets a ✗ in the named ${skin.noun}’s row.`
        : `A clue gives its mark to one box: where the named ${skin.noun}’s row meets the named ${catNoun}’s column.`,
      terms: [TERMS.yes(cast, c), TERMS.no(cast, c), TERMS.empty],
      meaning: t === 'is'
        ? `“${text}” This puts a ✓ in one box: ${T}. Then the rest of ${P}’s row and the rest of ${col} get a ✗.`
        : t === 'isnt'
          ? `“${text}” This puts a ✗ in one box: ${T}. It does not decide any other box.`
          : `“${text}” This means ${P} ${w.cat(c).is} one of two: ${w.obj(c, n1)} or ${w.obj(c, n2)}. So ${T} gets a ✗. It does not decide any other box.`,
      casesTitle: 'What does the clue say about each box?',
      cases: caseBoxes.map((x) => tw.box(sols, x.p, c, x.v)),
      remember: t === 'either'
        ? [`An “or” clue gives a ✗ to the ${catNoun} it leaves out.`, `Ask: “Which ${catNoun} does the clue leave out?”`]
        : ['A clue’s mark goes where its row and its column meet.', 'Ask: “Which row and which column does this clue name?”'],
      simpler: t === 'either'
        ? [`There are three ${w.cat(c).plural}: ${joinNames(vals.map((x) => w.obj(c, x)))}.`, `The clue names two of them for ${P}: ${w.obj(c, n1)} and ${w.obj(c, n2)}.`, `The one it leaves out is ${w.obj(c, target.v)}. So ${T} gets a ✗.`]
        : [`Put one finger on ${P}’s row. Put another finger on ${col}.`, `Slide them until they meet. They meet at ${T}.`, `The clue says ${ask === 'yes' ? 'yes' : 'no'}, so ${T} gets a ${ask === 'yes' ? '✓' : '✗'}.`],
    };
    const cell = T;
    const explain = t === 'is'
      ? `The clue says ${w.is(p, c, mine)}. So ${cell} gets a ✓.`
      : t === 'isnt'
        ? `The clue says ${w.not(p, c, target.v)}. So ${cell} gets a ✗.`
        : `${P} ${w.cat(c).is} one of the two named in the clue. So ${w.not(p, c, target.v)}, and ${cell} gets a ✗.`;
    // The Hint shows one box already checked against the clue (never the clue's own box), then the method.
    const hint = t === 'either'
      ? `Here is one box, checked against the clue. The clue names two ${w.cat(c).plural}. What about the third one?`
      : t === 'is'
        ? 'Here is one box, checked against the clue. A ✓ goes where the right row meets the right column.'
        : 'Here is one box, checked against the clue. A clue with “not” gives a ✗ where the right row and column meet.';
    const hintBox = wrong[0];
    const hintCase = tw.box(sols, hintBox.p, c, hintBox.v, `One box, checked against the clue: ${w.cell(hintBox.p, hintBox.v, c)}.`);
    const cells = gridOrder(cast, 0, [target, ...wrong]);
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l1',
      skill: 's4.grid-marks',
      prompt: `${settingText(cast)} A clue says: “${text}” Which box gets a ${ask === 'yes' ? '✓' : '✗'} from this clue?`,
      scene: gridScene(cast, 0, {}),
      choices: cells.map((x) => ({ id: cellId(x.p, x.v), label: w.cell(x.p, x.v, c) })),
      answer: cellId(target.p, target.v),
      feedback,
      explain,
      hint,
      hintCase,
      teach,
    };
    syncWhyWrong(item);
    return { item, cast, sol, clue, ask, target, bases: { cases: caseBoxes.map(() => ({ clues: [clue] })), examples, hint: { clues: [clue] } }, kinds };
  }
  throw new Error('markPuzzle: no puzzle found');
}

// ---------- lesson 2: only one left ----------

export type OnlyMode = 'col' | 'row' | 'cant';
/** How a wrong pick misses: its box has a ✗; “Can’t tell yet” when one box is left; one of two empty boxes. */
export type OnlyMiss = 'crossed' | 'cant' | 'open';

export interface OnlyOpts {
  id: string;
  skin: SkinId;
  /** col / row: the answer is forced by the only empty box in a column / row. cant: it is not decided yet. */
  mode: OnlyMode;
  /** For cant: ask about a column ("Who must have the fish?") or a row ("Which pet must Leo have?"). */
  ask?: 'col' | 'row';
  n?: number;
}

/** A partly marked grid and "Who must have the fish?" or "Which pet must Leo have?", with Can't tell yet. */
export function onlyOnePuzzle(rng: Rng, o: OnlyOpts): Built<ChooseItem> & { marks: Marks; ask: 'col' | 'row'; p: string; val: string; bases: Bases; kinds: Record<string, OnlyMiss>; boundary: Marks } {
  const skin = SKINS[o.skin];
  const ask: 'col' | 'row' = o.mode === 'cant' ? (o.ask ?? (rng.chance(0.6) ? 'col' : 'row')) : o.mode;
  for (let tries = 0; tries < 500; tries++) {
    const n = o.n ?? rng.pick([3, 3, 4]);
    const cast = makeCast(rng, skin, n, [rng.int(0, 1)]);
    const sol = randomSol(rng, cast);
    const c = cast.cats[0].cat.id;
    const vals = cast.spec.cats[0].values;
    const ppl = cast.spec.people;
    const w = wordsFor(cast);
    const nm = cast.nm;
    const marks: Marks = Object.fromEntries(ppl.map((p) => [p, {}]));
    const cross = (p: string, val: string) => { marks[p][val] = 'no'; };
    const p = rng.pick(ppl);
    const mine = sol[p][c];
    // The question is about value `val` (column) or person `p` (row).
    const val = ask === 'col' ? (o.mode === 'cant' ? rng.pick(vals) : mine) : mine;
    const holder = ppl.find((q) => sol[q][c] === val)!;
    let pair: string[] = [];
    if (ask === 'col') {
      if (o.mode === 'cant') {
        const other = rng.pick(ppl.filter((q) => q !== holder));
        pair = [holder, other];
        for (const q of ppl) if (!pair.includes(q)) cross(q, val);
      } else {
        for (const q of ppl) if (q !== holder) cross(q, val);
      }
    } else if (o.mode === 'cant') {
      const alt = rng.pick(vals.filter((x) => x !== mine));
      pair = [mine, alt];
      for (const x of vals) if (!pair.includes(x)) cross(p, x);
    } else {
      for (const x of vals) if (x !== mine) cross(p, x);
    }
    // A few more true ✗s elsewhere, off the line the question is about.
    const spare = ppl.flatMap((q) => vals.map((x) => ({ q, x })))
      .filter(({ q, x }) => sol[q][c] !== x && marks[q][x] === undefined && (ask === 'col' ? x !== val : q !== p));
    const extra = rng.shuffle(spare).slice(0, rng.int(o.mode === 'cant' ? 1 : 0, 2));
    for (const { q, x } of extra) cross(q, x);
    if (o.mode === 'cant' && ask === 'col' && !extra.some(({ q }) => pair.includes(q))) continue;

    const sols = fittingMarks(cast.spec, c, marks);
    const cant = o.mode === 'cant';
    if (ask === 'col') {
      const who = holders(sols, c, val, ppl);
      if (cant ? who.length !== 2 || !pair.every((q) => who.includes(q)) : who.length !== 1 || who[0] !== holder) continue;
    } else {
      const opts = options(sols, p, c, vals);
      if (cant ? opts.length !== 2 || !pair.every((x) => opts.includes(x)) : opts.length !== 1 || opts[0] !== mine) continue;
    }

    // The line the question is about: the people in the column, or the values in the row.
    const tw = teachWords(cast);
    const P = nm(p);
    const catNoun = w.cat(c).noun;
    const colName = `the ${w.val(c, val).label} column`;
    const slots = ask === 'col' ? ppl : vals;
    const boxOf = (s: string): [string, string] => (ask === 'col' ? [s, val] : [p, s]);
    const crossedIn = (m: Marks) => slots.filter((s) => { const [q, x] = boxOf(s); return m[q][x] === 'no'; });
    const crossedS = crossedIn(marks);
    const openS = slots.filter((s) => !crossedS.includes(s));
    const say = (s: string) => (ask === 'col' ? nm(s) : w.obj(c, s));
    const lineText = (lead: string, cr: readonly string[], op: readonly string[]) => {
      const has = cr.length === 1 ? 'has' : 'have';
      const empty = op.length === 1
        ? ask === 'col' ? `${nm(op[0])}’s box is empty.` : `The box for ${w.obj(c, op[0])} is empty.`
        : `The boxes for ${joinNames(op.map(say))} are empty.`;
      return ask === 'col'
        ? `${lead}, ${joinNames(cr.map(nm))} ${has} a ✗ in ${colName}. ${empty}`
        : `${lead}, ${P}’s ${cr.length === 1 ? 'box' : 'boxes'} for ${joinNames(cr.map(say))} ${has} a ✗. ${empty}`;
    };
    // One empty box: it must get the ✓. Two: each could still get it (computed over every mark in the grid, not
    // only this line's), and only then is it “Can’t tell yet”.
    const lineTruths = (ss: readonly Sol[], op: readonly string[]) =>
      op.map((s) => { const [q, x] = boxOf(s); return op.length === 1 ? tw.must(ss, q, c, x) : tw.could(ss, q, c, x); });
    const lineCase = (lead: string, ss: readonly Sol[], cr: readonly string[], op: readonly string[]): TeachCase => {
      const truths = lineTruths(ss, op);
      if (!truths.every((t) => t.value)) throw new Error('onlyOnePuzzle: a line case must be decided by its empty boxes');
      const note = op.length === 1 ? 'One empty box is left, so it gets the ✓.' : `${COUNT[op.length]} boxes are empty, and each could still get the ✓. So you can’t tell yet.`;
      return { label: lineText(lead, cr, op), truths, note };
    };
    const nowCase = lineCase('In this grid', sols, crossedS, openS);
    // The boundary: the same line with one more empty box (when one is left) or one fewer (when two are left), in a
    // grid with no other marks. (With this grid's other marks kept, the other rows and columns could still decide it.)
    const lineMarks = (cr: readonly string[]): Marks => {
      const m: Marks = Object.fromEntries(ppl.map((q) => [q, {}]));
      for (const s of cr) { const [q, x] = boxOf(s); m[q][x] = 'no'; }
      return m;
    };
    const crB = cant ? slots.filter((s) => crossedS.includes(s) || s === openS[openS.length - 1]) : crossedS.slice(1);
    const boundary = lineMarks(crB);
    const solsB = fittingMarks(cast.spec, c, boundary);
    const opB = slots.filter((s) => !crB.includes(s));
    const thenCase = lineCase('In a grid with no other marks', solsB, crB, opB);

    const H = ask === 'col' ? holder : mine;
    const answer = cant ? CANT : H;
    const wrongIds = [...slots, CANT].filter((id) => id !== answer);
    const feedback: Record<string, ChoiceFeedback> = {};
    const examples: Record<string, Basis> = {};
    const kinds: Record<string, OnlyMiss> = {};
    const gridBasis: Basis = { marks: { c, marks } };
    for (const id of wrongIds) {
      if (id === CANT) {
        kinds[id] = 'cant';
        feedback[id] = ask === 'col'
          ? {
            headline: `Only one box in ${colName} is empty, so you can tell.`,
            detail: [`${joinNames(crossedS.map(nm))} ${crossedS.length === 1 ? 'has' : 'have'} a ✗ in ${colName}.`, `${nm(H)}’s box is the only one left. Each ${catNoun} goes to one ${skin.noun}, so ${nm(H)} must ${w.base(c, val)}.`],
            example: nowCase,
          }
          : {
            headline: `Only one box in ${P}’s row is empty, so you can tell.`,
            detail: [`${P}’s boxes for ${joinNames(crossedS.map(say))} have a ✗.`, `${w.one(p, c)}, so ${P} must ${w.base(c, mine)}.`],
            example: nowCase,
          };
        examples[id] = gridBasis;
      } else if (crossedS.includes(id)) {
        kinds[id] = 'crossed';
        const [q, x] = boxOf(id);
        const right = cant
          ? ask === 'col'
            ? `Only ${joinNames(openS.map(nm))} still have an empty box in ${colName}. So you can’t tell yet.`
            : `The boxes for ${joinNames(openS.map(say))} are still empty. So you can’t tell yet.`
          : ask === 'col'
            ? `Only ${nm(H)}’s box in ${colName} is empty. So ${nm(H)} must ${w.base(c, val)}.`
            : `Only the box for ${w.obj(c, mine)} is left in ${P}’s row. So ${P} must ${w.base(c, mine)}.`;
        feedback[id] = {
          headline: ask === 'col' ? `${nm(q)}’s box in ${colName} has a ✗.` : `${P}’s box for ${w.obj(c, x)} has a ✗.`,
          detail: [`A ✗ means no. So ${nm(q)} can’t ${w.base(c, x)}.`, right],
          // The pick could not, and the line's empty boxes: the one that must, or the two that each could.
          example: { label: nowCase.label, truths: [tw.could(sols, q, c, x), ...nowCase.truths!], note: nowCase.note },
        };
        examples[id] = gridBasis;
      } else {
        // One of two empty boxes: show a way that fits every mark where the other one gets the ✓.
        kinds[id] = 'open';
        const other = openS.find((s) => s !== id)!;
        const [oq, ox] = boxOf(other);
        const way = sols.find((s) => s[oq][c] === ox)!;
        const [q, x] = boxOf(id);
        const tempt = ask === 'col'
          ? [id, other].flatMap((r) => {
            const off = vals.find((y) => y !== val && marks[r][y] === 'no');
            return off ? [`${nm(r)}’s ✗ for ${w.obj(c, off)} is in a different column, so it does not decide ${w.obj(c, val)}.`] : [];
          })
          : [];
        feedback[id] = {
          headline: ask === 'col' ? `${nm(id)} could ${w.base(c, val)}, but so could ${nm(other)}.` : `${P} could ${w.base(c, id)}, but ${P} could ${w.base(c, other)} too.`,
          detail: [
            ask === 'col' ? `Two boxes in ${colName} are still empty: ${joinNames(openS.map((s) => `${nm(s)}’s`))}.` : `Two boxes in ${P}’s row are still empty: ${joinNames(openS.map(say))}.`,
            ...tempt,
            'So you can’t tell yet.',
          ],
          example: {
            label: `One way that fits every mark: ${tw.way(way)}`,
            truths: [{ who: 'Fits every mark in the grid', value: marksHold(c, marks, way) }, tw.fact(way, q, c, x)],
            note: `So ${nm(q)} does not have to ${w.base(c, x)}.`,
          },
        };
        examples[id] = { way };
      }
    }

    let explain: string;
    let choices: Choice[];
    if (ask === 'col') {
      choices = [...cast.people, CANT_YET];
      if (cant) {
        const [a, b] = [...pair].sort();
        explain = `Only ${nm(a)} and ${nm(b)} have an empty box in ${colName}. Either one could still ${w.base(c, val)}. So you can’t tell yet.`;
      } else {
        const rest = ppl.filter((q) => q !== holder).map(nm);
        explain = `${joinNames(rest)} ${rest.length === 2 ? 'both have' : 'all have'} a ✗ in ${colName}. Only ${nm(holder)}’s box is left. So ${nm(holder)} must ${w.base(c, val)}.`;
      }
    } else {
      choices = [...cast.cats[0].vals.map((x) => ({ id: x.id, label: cap(x.label) })), CANT_YET];
      if (cant) {
        const [a, b] = vals.filter((x) => pair.includes(x));
        explain = `${P}’s row still has two empty boxes: ${w.obj(c, a)} and ${w.obj(c, b)}. Either one could still be right. So you can’t tell yet.`;
      } else {
        const crossed = vals.filter((x) => x !== mine).map((x) => w.obj(c, x));
        explain = `In ${P}’s row, the boxes for ${joinNames(crossed)} have a ✗. Only the box for ${w.obj(c, mine)} is left. So ${P} must ${w.base(c, mine)}.`;
      }
    }
    const teach: Teach = {
      rule: 'When every other box in a row or column has a ✗, the last empty box gets the ✓.',
      terms: [TERMS.no(cast, c), TERMS.onlyOne, TERMS.cant],
      meaning: ask === 'col'
        ? `The question is about ${colName}. Each ${catNoun} goes to one ${skin.noun}, so count the empty boxes in ${colName}.`
        : `The question is about ${P}’s row. ${w.one(p, c)}, so count the empty boxes in ${P}’s row.`,
      casesTitle: 'One empty box, or more than one?',
      cases: [nowCase, thenCase],
      // Two empty boxes in one line do not by themselves mean “Can’t tell yet”: another row or column can still rule
      // one out (lesson 2’s “Count the empty boxes” card says so too).
      remember: ['One empty box left: it gets the ✓. Two or more: check the other marks before you say “Can’t tell yet.”', 'Ask: “How many empty boxes are left in this row or column?”'],
      simpler: ask === 'col'
        ? [`Start with ${colName}. Each ✗ there says one ${skin.noun} can’t ${w.base(c, val)}.`, `If one box is left, the ${skin.noun} in its row must ${w.base(c, val)}.`, 'If two boxes are left, look at the other marks too.', 'If they do not rule out one of the two, you can’t tell yet.']
        : [`Start with ${P}’s row. Each ✗ there rules out one ${catNoun} for ${P}.`, `If one box is left, the ${catNoun} in its column is the answer.`, 'If two boxes are left, look at the other marks too.', 'If they do not rule out one of the two, you can’t tell yet.'],
    };
    const question = ask === 'col' ? `${cast.skin.who} must ${w.base(c, val)}?` : fill(w.cat(c).ask, { p: P });
    // The Hint marks one box of the asked line on this grid: a box with a ✗, checked (could: false). It is never the
    // answer, and every truth it shows holds on the grid the learner is looking at.
    if (!crossedS.length) throw new Error('onlyOnePuzzle: the asked line has a ✗');
    const [hq, hx] = boxOf(crossedS[0]);
    const hintCase: TeachCase = {
      label: ask === 'col' ? `In this grid, ${nm(hq)}’s box in ${colName} has a ✗.` : `In this grid, ${P}’s box for ${w.obj(c, hx)} has a ✗.`,
      truths: [tw.could(sols, hq, c, hx)],
      note: `A ✗ means no. So ${ask === 'col' ? nm(hq) : w.obj(c, hx)} is out.`,
    };
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l2',
      skill: cant ? 's4.not-decided' : 's4.only-one-left',
      prompt: `${settingText(cast)} Look at the grid. ${question}`,
      scene: gridScene(cast, 0, marks),
      choices,
      answer,
      feedback,
      explain,
      hint: ask === 'col'
        ? `Here is one box in ${colName}, checked for you. Now count the empty boxes in ${colName}.`
        : `Here is one box in ${P}’s row, checked for you. Now count the empty boxes in ${P}’s row.`,
      hintCase,
      ...(cant ? { conflict: true } : {}),
      teach,
    };
    syncWhyWrong(item);
    return { item, cast, sol, marks, ask, p: ask === 'row' ? p : holder, val, bases: { cases: [gridBasis, { marks: { c, marks: boundary } }], examples, hint: gridBasis }, kinds, boundary };
  }
  throw new Error('onlyOnePuzzle: no puzzle found');
}

// ---------- lesson 3: spread the tick ----------

export interface SpreadOpts {
  id: string;
  skin: SkinId;
  /** true: the ✓'s row is already crossed out, so only the column is left to do (a conflict item). */
  column?: boolean;
  n?: number;
}

/** "Mia has the cat, so Mia – cat gets a ✓. Choose every box that must now get a ✗." (MultiItem). */
export function spreadPuzzle(rng: Rng, o: SpreadOpts): Built<MultiItem> & { marks: Marks; p: string; val: string; bases: Bases } {
  const skin = SKINS[o.skin];
  for (let tries = 0; tries < 200; tries++) {
    const n = o.n ?? rng.pick([3, 3, 4]);
    const cast = makeCast(rng, skin, n, [rng.int(0, 1)]);
    const sol = randomSol(rng, cast);
    const c = cast.cats[0].cat.id;
    const vals = cast.spec.cats[0].values;
    const ppl = cast.spec.people;
    const w = wordsFor(cast);
    const nm = cast.nm;
    const p = rng.pick(ppl);
    const val = sol[p][c];
    const marks: Marks = Object.fromEntries(ppl.map((q) => [q, {}]));
    marks[p][val] = 'yes';
    if (o.column) for (const x of vals) if (x !== val) marks[p][x] = 'no';
    const row = vals.filter((x) => x !== val).map((x) => ({ p, v: x }));
    const col = ppl.filter((q) => q !== p).map((q) => ({ p: q, v: val }));
    const rest = ppl.filter((q) => q !== p).flatMap((q) => vals.filter((x) => x !== val).map((x) => ({ p: q, v: x })));
    const take = <T>(xs: readonly T[], k: number) => rng.shuffle(xs).slice(0, k);
    const picked = o.column
      ? [...col, ...take(rest, 6 - col.length)]
      : n === 3
        ? [...row, ...col, ...take(rest, rng.int(1, 2))]
        : [...take(row, 2), ...take(col, 2), ...take(rest, 2)];
    const sols = fittingMarks(cast.spec, c, marks);
    const must = picked.filter((x) => cellStatus(sols, x.p, c, x.v) === 'no');
    const open = picked.filter((x) => cellStatus(sols, x.p, c, x.v) === 'open');
    if (must.length + open.length !== picked.length) continue;
    const tw = teachWords(cast);
    const cards = gridOrder(cast, 0, picked);
    const inRow = (x: { p: string }) => x.p === p;
    const P = nm(p);
    const colName = `the ${w.val(c, val).label} column`;
    const T = w.cell(p, val, c);
    // grade() shows the tips of every box left out, then of every box picked by mistake. The first sentence of the
    // first tip becomes the headline, so each tip opens by naming its box and where it sits.
    const missTips: Record<string, string> = {};
    const pickTips: Record<string, string> = {};
    for (const x of must) {
      const cell = w.cell(x.p, x.v, c);
      missTips[cellId(x.p, x.v)] = inRow(x)
        ? `You left out ${cell}, which is in ${P}’s row. ${w.one(p, c)}, so the rest of ${P}’s row gets a ✗.`
        : `You left out ${cell}, which is in ${colName}. ${w.onlyOne(c, val)}, so the rest of ${colName} gets a ✗.`;
    }
    for (const x of open) {
      const cell = w.cell(x.p, x.v, c);
      pickTips[cellId(x.p, x.v)] = `${cell} is not in ${P}’s row or ${colName}. The ✓ in ${T} does not decide it, so ${nm(x.p)} could still ${w.base(c, x.v)}.`;
    }
    const mustLabels = gridOrder(cast, 0, must).map((x) => w.cell(x.p, x.v, c));
    // Cases: a box in the ✓'s row, one in its column, and one outside both (one the item offers, when it can).
    const rowBox = gridOrder(cast, 0, row)[0];
    const colBox = gridOrder(cast, 0, col)[0];
    const outBox = gridOrder(cast, 0, open)[0] ?? gridOrder(cast, 0, rest)[0];
    const [q2] = ppl.filter((q) => q !== p);
    const [y] = vals.filter((x) => x !== val);
    const teach: Teach = {
      rule: 'A ✓ gives a ✗ to every other box in its row and every other box in its column.',
      terms: [TERMS.yes(cast, c), TERMS.spread],
      meaning: `${w.is(p, c, val)}. ${w.one(p, c)}, and ${lowerFirst(w.onlyOne(c, val))}.`,
      casesTitle: `What does the ✓ in ${T} decide?`,
      cases: [
        tw.box(sols, rowBox.p, c, rowBox.v, `${w.cell(rowBox.p, rowBox.v, c)}, in ${P}’s row.`),
        tw.box(sols, colBox.p, c, colBox.v, `${w.cell(colBox.p, colBox.v, c)}, in ${colName}.`),
        tw.box(sols, outBox.p, c, outBox.v, `${w.cell(outBox.p, outBox.v, c)}, outside ${P}’s row and ${colName}.`),
      ],
      remember: ['Spread every ✓: cross out the rest of its row, then the rest of its column.', 'Ask: “Did I cross out the column too?”'],
      simpler: [
        `Imagine just two ${plural(cast)}, ${P} and ${nm(q2)}, and just two ${w.cat(c).plural}, ${w.obj(c, val)} and ${w.obj(c, y)}.`,
        `${w.is(p, c, val)}, so ${T} gets a ✓.`,
        `${w.one(p, c)}, so ${w.cell(p, y, c)} gets a ✗. It is in ${P}’s row.`,
        `${w.onlyOne(c, val)}, so ${w.cell(q2, val, c)} gets a ✗. It is in ${colName}.`,
      ],
    };
    const item: MultiItem = {
      kind: 'multi',
      id: o.id,
      stop: STOP,
      lesson: 's4.l3',
      skill: o.column ? 's4.spread-column' : 's4.spread-tick',
      prompt: `${settingText(cast)} ${w.is(p, c, val)}, so ${T} gets a ✓. Choose every box that must now get a ✗.`,
      scene: gridScene(cast, 0, marks),
      choices: cards.map((x) => ({ id: cellId(x.p, x.v), label: w.cell(x.p, x.v, c) })),
      answer: must.map((x) => cellId(x.p, x.v)),
      missTips,
      pickTips,
      explain: `${w.is(p, c, val)}. So every other box in ${P}’s row gets a ✗. So does every other box in ${colName}. Here that means ${joinNames(mustLabels)}.`,
      // The Hint shows one box outside the ✓'s row and column, checked (it stays empty), then the method.
      hint: 'Here is one box, checked for you. A ✓ tells you about its whole row and its whole column.',
      hintCase: teach.cases![2],
      ...(o.column ? { conflict: true } : {}),
      teach,
    };
    const basis: Basis = { marks: { c, marks } };
    return { item, cast, sol, marks, p, val, bases: { cases: [basis, basis, basis], examples: {}, hint: basis } };
  }
  throw new Error('spreadPuzzle: no puzzle found');
}

// ---------- lesson 4: linking clues ----------

export type LinkMode = 'link' | 'notLink2' | 'notLink';
/** How a wrong pick misses: not the one the link points to; crossed out by a clue; “Can’t tell yet” when one is left; one of two left. */
export type LinkMiss = 'not-holder' | 'crossed' | 'cant' | 'open';

export interface LinkOpts {
  id: string;
  skin: SkinId;
  /** link: one linking clue decides it. notLink2: two "not" clues leave one person. notLink: one "not" link, so can't tell yet. */
  mode: LinkMode;
}

/** The first category is filled in; linking clues tell you who has a value in the second. */
export function linkPuzzle(rng: Rng, o: LinkOpts): Built<ChooseItem> & { clues: GridClue[]; c1: string; c2: string; val: string; bases: Bases; kinds: Record<string, LinkMiss> } {
  const skin = SKINS[o.skin];
  for (let tries = 0; tries < 200; tries++) {
    const first = rng.int(0, 1);
    const cast = makeCast(rng, skin, 3, [first, 1 - first]);
    const sol = randomSol(rng, cast);
    const [c1, c2] = cast.cats.map((x) => x.cat.id);
    const ppl = cast.spec.people;
    const w = wordsFor(cast);
    const nm = cast.nm;
    const T = rng.pick(ppl);
    const val = sol[T][c2];
    const [L, M] = rng.shuffle(ppl.filter((q) => q !== T));
    let clues: GridClue[];
    if (o.mode === 'link') clues = [{ t: 'link', c1, v1: sol[T][c1], c2, v2: val }];
    else if (o.mode === 'notLink') clues = [{ t: 'notLink', c1, v1: sol[L][c1], c2, v2: val }];
    else {
      const second: GridClue = rng.chance(0.5) ? { t: 'isnt', p: M, c: c2, v: val } : { t: 'notLink', c1, v1: sol[M][c1], c2, v2: val };
      clues = [{ t: 'notLink', c1, v1: sol[L][c1], c2, v2: val }, second];
    }
    // The first category is known: fix it, then list every way to give out the second.
    const known: GridClue[] = ppl.map((q) => ({ t: 'is', p: q, c: c1, v: sol[q][c1] }));
    const sols = fitting(cast.spec, [...known, ...clues]);
    const who = holders(sols, c2, val, ppl);
    const answer = who.length === 1 ? who[0] : CANT;
    if ((answer === CANT) !== (o.mode === 'notLink')) continue;
    if (answer !== CANT && answer !== T) continue;
    const texts = clues.map((c) => clueText(cast, c));
    const tw = teachWords(cast);
    const has1 = (q: string) => w.is(q, c1, sol[q][c1]);
    const base2 = w.base(c2, val);
    const obj2 = w.obj(c2, val);
    const one = clues.length === 1;
    const clueName = (i: number) => (one ? 'the clue' : `clue ${i + 1}`);
    const linkBasis: Basis = { clues: [...known, ...clues] };
    // Who each clue crosses out by itself, with the first part of the grid filled in.
    const crossers = (q: string) => clues.map((cl, i) => (cellStatus(fitting(cast.spec, [...known, cl]), q, c2, val) === 'no' ? i : -1)).filter((i) => i >= 0);
    const holderSays = (q: string, not: boolean) => `${w.holder(c1, sol[q][c1])} ${not ? w.cat(c2).not : w.cat(c2).is} ${obj2}`;
    const personNote = (q: string) => {
      const st = cellStatus(sols, q, c2, val);
      if (st === 'yes') return o.mode === 'link' ? `${cap(holderSays(q, false))}, so ${nm(q)} must ${base2}.` : `Only ${nm(q)} is left, so ${nm(q)} must ${base2}.`;
      if (st === 'open') return `No clue crosses out ${nm(q)}.`;
      const by = crossers(q);
      return by.length ? `${cap(clueName(by[0]))} crosses out ${nm(q)}.` : `The clues together cross out ${nm(q)}.`;
    };
    const personCase = (q: string, extra: Truth[] = []): TeachCase => {
      const truths = [tw.could(sols, q, c2, val)];
      if (cellStatus(sols, q, c2, val) === 'yes') truths.push(tw.must(sols, q, c2, val));
      return { label: `${has1(q)}.`, truths: [...truths, ...extra], note: personNote(q) };
    };
    const feedback: Record<string, ChoiceFeedback> = {};
    const examples: Record<string, Basis> = {};
    const kinds: Record<string, LinkMiss> = {};
    const cantRight = `“Can’t tell yet” fits only when two or more ${plural(cast)} could still ${base2}.`;
    const add = (id: string, kind: LinkMiss, fb: ChoiceFeedback, basis: Basis = linkBasis) => { feedback[id] = fb; kinds[id] = kind; examples[id] = basis; };
    let explain: string;
    if (o.mode === 'link') {
      explain = `The grid shows that ${has1(T)}. The clue says ${w.holder(c1, sol[T][c1])} ${w.cat(c2).is} ${obj2}. So ${w.is(T, c2, val)}.`;
      for (const q of [L, M]) {
        add(q, 'not-holder', {
          headline: `${nm(q)} is not ${w.holder(c1, sol[T][c1])}.`,
          detail: [`The clue says ${holderSays(T, false)}. The grid shows ${has1(T)}, and ${has1(q)}.`, `So ${w.is(T, c2, val)}. ${w.onlyOne(c2, val)}, so ${nm(q)} can’t.`],
          example: personCase(q, [tw.must(sols, T, c2, val)]),
        });
      }
      add(CANT, 'cant', {
        headline: `You can tell, because the grid shows ${w.holder(c1, sol[T][c1])}.`,
        detail: [`${cap(has1(T))}. The clue says ${holderSays(T, false)}.`, `So ${w.is(T, c2, val)}. ${cantRight}`],
        example: personCase(T),
      });
    } else if (o.mode === 'notLink2') {
      const second = clues[1];
      explain = `Clue 1 crosses out ${nm(L)}, who ${w.cat(c1).is} ${w.obj(c1, sol[L][c1])}. Clue 2 crosses out ${nm(M)}. Only ${nm(T)} is left, so ${w.is(T, c2, val)}.`;
      add(L, 'crossed', {
        headline: `Clue 1 crosses out ${nm(L)}.`,
        detail: [`${cap(has1(L))}. Clue 1 says ${holderSays(L, true)}. So ${nm(L)} can’t ${base2}.`, `Clue 2 crosses out ${nm(M)}, so only ${nm(T)} is left.`],
        example: personCase(L, [tw.must(sols, T, c2, val)]),
      });
      add(M, 'crossed', {
        headline: `Clue 2 crosses out ${nm(M)}.`,
        detail: [
          second.t === 'isnt' ? `Clue 2 says ${w.not(M, c2, val)}.` : `${cap(has1(M))}. Clue 2 says ${holderSays(M, true)}. So ${nm(M)} can’t ${base2}.`,
          `Clue 1 crosses out ${nm(L)}, so only ${nm(T)} is left.`,
        ],
        example: personCase(M, [tw.must(sols, T, c2, val)]),
      });
      add(CANT, 'cant', {
        headline: `You can tell, because the two clues leave only ${nm(T)}.`,
        detail: [`Clue 1 crosses out ${nm(L)}. Clue 2 crosses out ${nm(M)}.`, `So ${w.is(T, c2, val)}. ${cantRight}`],
        example: personCase(T),
      });
    } else {
      const [a, b] = [...who].sort();
      explain = `${cap(has1(L))}, so the clue crosses out ${nm(L)}. ${nm(a)} and ${nm(b)} could each still ${base2}. So you can’t tell yet.`;
      add(L, 'crossed', {
        headline: `The clue crosses out ${nm(L)}.`,
        detail: [`${cap(has1(L))}, and the clue says ${holderSays(L, true)}. So ${nm(L)} can’t ${base2}.`, `${nm(a)} and ${nm(b)} could each still ${base2}, so you can’t tell yet.`],
        example: personCase(L),
      });
      for (const [x, y] of [[a, b], [b, a]]) {
        const way = sols.find((s) => s[y][c2] === val)!;
        add(x, 'open', {
          headline: `${nm(x)} could ${base2}, but so could ${nm(y)}.`,
          detail: [`The clue crosses out only ${nm(L)}.`, `${nm(x)} and ${nm(y)} could each still ${base2}, so you can’t tell yet.`],
          example: {
            label: `One way that fits the grid and the clue: ${tw.way(way, [c2])}`,
            truths: [
              { who: 'Fits the grid', value: ppl.every((q) => way[q][c1] === sol[q][c1]) },
              { who: 'The clue', value: gridClueHolds(clues[0], way) },
              tw.fact(way, x, c2, val),
            ],
            note: `So ${nm(x)} does not have to ${base2}.`,
          },
        }, { way });
      }
    }
    const meaningOf = (cl: GridClue, i: number) => {
      const said = `“${texts[i]}”`;
      if (cl.t === 'link') return `${said} This means ${w.obj(c1, cl.v1)} and ${w.obj(c2, cl.v2)} go to the same ${skin.noun}.`;
      if (cl.t === 'notLink') return `${said} This means ${w.obj(c1, cl.v1)} and ${w.obj(c2, cl.v2)} go to different ${plural(cast)}.`;
      return `${said} This crosses out ${nm(M)}.`;
    };
    const teach: Teach = {
      rule: o.mode === 'link' ? `A linking clue says two things go to the same ${skin.noun}.` : `A “not” linking clue says two things go to different ${plural(cast)}.`,
      terms: o.mode === 'link' ? [TERMS.link(cast, c1, c2)] : [TERMS.link(cast, c1, c2), TERMS.cant],
      meaning: clues.map(meaningOf).join(' '),
      casesTitle: `Who could ${base2}?`,
      cases: ppl.map((q) => personCase(q)),
      remember: o.mode === 'link'
        ? [`Find who ${w.cat(c1).is} ${w.obj(c1, sol[T][c1])} in the grid. The same ${skin.noun} ${w.cat(c2).is} ${obj2}.`, 'Ask: “Who has the thing the clue names?”']
        : [`A “not” link crosses out one ${skin.noun}. Then count who is left.`, `Ask: “Is only one ${skin.noun} left, or more than one?”`],
      simpler: o.mode === 'link'
        ? [`Step 1: find ${w.obj(c1, sol[T][c1])} in the grid. ${cap(has1(T))}.`, `Step 2: the clue says ${holderSays(T, false)}.`, `So ${w.is(T, c2, val)}.`]
        : o.mode === 'notLink2'
          ? [`Step 1: clue 1 crosses out ${nm(L)}.`, `Step 2: clue 2 crosses out ${nm(M)}.`, `Step 3: only ${nm(T)} is left, so ${w.is(T, c2, val)}.`]
          : [`Step 1: find ${w.obj(c1, sol[L][c1])} in the grid. ${cap(has1(L))}.`, `Step 2: the clue says ${holderSays(L, true)}. So cross out ${nm(L)}.`, `Step 3: ${joinNames([...who].sort().map(nm))} are left. Two are left, so you can’t tell yet.`],
    };
    const clueLine = texts.length === 1 ? `Clue: “${texts[0]}”` : texts.map((t, i) => `Clue ${i + 1}: “${t}”`).join(' ');
    const marks: Marks = Object.fromEntries(ppl.map((q) => [q, Object.fromEntries(cast.spec.cats[0].values.map((x) => [x, sol[q][c1] === x ? 'yes' : 'no'] as const))]));
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l4',
      skill: o.mode === 'link' ? 's4.link' : 's4.not-link',
      prompt: `${settingText(cast, [false, true])} The grid shows the ${w.cat(c1).plural}. ${clueLine} ${cast.skin.who} must ${base2}?`,
      scene: gridScene(cast, 0, marks),
      choices: [...cast.people, CANT_YET],
      answer,
      feedback,
      explain,
      // The Hint shows one person the clues cross out (never the answer), then the method.
      hint: o.mode === 'link'
        ? `Here is one ${skin.noun}, checked for you. Find ${w.holder(c1, sol[T][c1])} in the grid first.`
        : `Here is one ${skin.noun}, checked for you. Cross out everyone who can’t ${base2}. Who is left?`,
      hintCase: personCase(L),
      ...(o.mode === 'notLink' ? { conflict: true } : {}),
      teach,
    };
    syncWhyWrong(item);
    return { item, cast, sol, clues, c1, c2, val, bases: { cases: ppl.map(() => linkBasis), examples, hint: linkBasis }, kinds };
  }
  throw new Error('linkPuzzle: no puzzle found');
}

// ---------- lesson 5: no guessing ----------

export interface ProofOpts {
  id: string;
  skin: SkinId;
  ncat?: 1 | 2;
  n?: number;
}

/**
 * Why a clue that is not the answer fails to prove the ✗: an "or" clue that names the thing for the person; a "not"
 * clue about the person but another thing; a clue about the other part of the grid (it says nothing about this part);
 * a clue that names the thing but another person; a clue about another person that, by itself, crosses out other
 * boxes in the person's row or the thing's column (an "or" clue that leaves the thing out, a "has" clue); a linking
 * clue (it names no one); or a clue that, by itself, decides no box in the person's row or the thing's column.
 * The last two kinds that are not "link" are computed from what the clue alone decides, never from its words.
 */
export type ProofMiss = 'or-names-it' | 'same-person' | 'other-part' | 'same-thing' | 'other-box' | 'link' | 'neither';

/** "Which clue, all by itself, proves that Leo does not have the dog?" Exactly one clue does. */
export function proofPuzzle(rng: Rng, o: ProofOpts): Built<ChooseItem> & { clues: GridClue[]; target: Cell; bases: Bases; kinds: Record<string, ProofMiss> } {
  const skin = SKINS[o.skin];
  const ncat = o.ncat ?? 1;
  for (let tries = 0; tries < 200; tries++) {
    const { cast, sol, clues } = fullPuzzle(rng, skin, { n: o.n ?? 3, ncat, weights: ncat === 1 ? WEIGHTS_SLOW : WEIGHTS_SLOW_TWO, min: 3, max: ncat === 1 ? 4 : 5 });
    const alone = clues.map((c) => fitting(cast.spec, [c]));
    const targets: { cell: Cell; prover: number }[] = [];
    for (const p of cast.spec.people) {
      for (const c of cast.spec.cats) {
        for (const x of c.values) {
          if (sol[p][c.id] === x) continue;
          const provers = alone.map((s, i) => (cellStatus(s, p, c.id, x) === 'no' ? i : -1)).filter((i) => i >= 0);
          if (provers.length !== 1) continue;
          const pc = clues[provers[0]];
          if (pc.t === 'isnt' && pc.p === p && pc.c === c.id && pc.v === x) continue;
          targets.push({ cell: { p, c: c.id, v: x }, prover: provers[0] });
        }
      }
    }
    if (!targets.length) continue;
    const { cell, prover } = rng.pick(targets);
    const tw = teachWords(cast);
    const { w, nm } = tw;
    const { p, c, v: x } = cell;
    const pc = clues[prover];
    let explain: string;
    if (pc.t === 'is' && pc.p === p) explain = `Clue ${prover + 1} says ${w.is(p, c, pc.v)}. ${w.one(p, c)}, so ${w.not(p, c, x)}.`;
    else if (pc.t === 'is') explain = `Clue ${prover + 1} says ${w.is(pc.p, c, x)}. ${w.onlyOne(c, x)}, so ${w.not(p, c, x)}.`;
    else if (pc.t === 'either') explain = `Clue ${prover + 1} says ${nm(p)} ${w.cat(c).is} ${w.obj(c, pc.v1)} or ${w.obj(c, pc.v2)}. Either way, ${w.not(p, c, x)}.`;
    else continue;

    const P = nm(p);
    const X = w.obj(c, x);
    const T = w.cell(p, x, c);
    const catNoun = w.cat(c).noun;
    const ci = cast.cats.findIndex((k) => k.cat.id === c);
    const xCol = `the ${w.val(c, x).label} column`;
    /** The boxes in P's row or X's column (P – X aside) that clue j, all by itself, crosses out. Computed. */
    const crossedBy = (j: number) => gridOrder(cast, ci, [
      ...cast.spec.people.filter((q) => q !== p && cellStatus(alone[j], q, c, x) === 'no').map((q) => ({ p: q, v: x })),
      ...cast.spec.cats[ci].values.filter((y) => y !== x && cellStatus(alone[j], p, c, y) === 'no').map((y) => ({ p, v: y })),
    ]).map((b) => w.cell(b.p, b.v, c));
    const kindOf = (cl: GridClue, j: number): ProofMiss => {
      if (cl.t === 'link' || cl.t === 'notLink') return 'link';
      // A clue about the other part of the grid says nothing, by itself, about this part.
      if (cl.c !== c) return 'other-part';
      if (cl.p === p) {
        if (cl.t === 'either' && (cl.v1 === x || cl.v2 === x)) return 'or-names-it';
        if (cl.t === 'isnt') return 'same-person';
        throw new Error('proofPuzzle: any other clue about the person in this part proves the ✗');
      }
      if (mentions(cl, null, c, x)) return 'same-thing';
      // About another person and not naming the thing: what it decides by itself, not its words, says which kind.
      return crossedBy(j).length ? 'other-box' : 'neither';
    };
    /** A clue's words after "Clue 2 says": names stay as they are, "The dragon in …" starts small. */
    const said = (i: number) => {
      const t = unstop(clueText(cast, clues[i]));
      return clues[i].t === 'link' || clues[i].t === 'notLink' ? lowerFirst(t) : t;
    };
    const feedback: Record<string, ChoiceFeedback> = {};
    const examples: Record<string, Basis> = {};
    const kinds: Record<string, ProofMiss> = {};
    for (let j = 0; j < clues.length; j++) {
      if (j === prover) continue;
      const cl = clues[j];
      if (cellStatus(alone[j], p, c, x) !== 'open') throw new Error('proofPuzzle: a clue that does not prove it must leave it open');
      const kind = kindOf(cl, j);
      const k = j + 1;
      const crossed = crossedBy(j);
      const still = `With only this clue, ${P} could still ${w.base(c, x)}.`;
      // The words of each kind. Only the kinds a clue can have are ever built (cl narrows inside each one).
      const head = (): string => {
        if (cl.t === 'link' || cl.t === 'notLink') return `Clue ${k} is a linking clue, and it does not name ${P}.`;
        switch (kind) {
          case 'or-names-it': return `Clue ${k} names ${X} as one of two choices for ${P}.`;
          case 'same-person': return `Clue ${k} is about ${P}, but not about ${X}.`;
          case 'other-part': return `Clue ${k} is about ${nm(cl.p)}’s ${w.cat(cl.c).noun}, not ${P}’s ${catNoun}.`;
          case 'same-thing': return `Clue ${k} is about ${X}, but not about ${P}.`;
          case 'other-box': return `Clue ${k} crosses out ${joinNames(crossed)}, not ${T}.`;
          default: return `Clue ${k} is not about ${P} or ${X}.`;
        }
      };
      const why = (): string => {
        if (cl.t === 'link' || cl.t === 'notLink') {
          return `It joins ${w.obj(cl.c1, cl.v1)} and ${w.obj(cl.c2, cl.v2)}, but it does not say which ${skin.noun} has them. So by itself, it does not rule out ${X} for ${P}.`;
        }
        switch (kind) {
          case 'or-names-it': return `So ${P} could ${w.base(c, x)}.`;
          case 'same-person': return `That rules out ${cl.t === 'isnt' ? w.obj(c, cl.v) : 'another one'} for ${P}, not ${X}.`;
          case 'other-part': return `It is about the ${w.cat(cl.c).plural}, so it says nothing about the ${w.cat(c).plural}. ${still}`;
          case 'same-thing': return `It is about ${nm(cl.p)}, not ${P}. ${still}`;
          case 'other-box': {
            const how = cl.t === 'is'
              ? `So ${w.cell(cl.p, cl.v, c)} gets a ✓, and ${joinNames(crossed)} ${crossed.length === 1 ? 'gets' : 'get'} a ✗.`
              : cl.t === 'either' ? `So ${w.not(cl.p, c, x)}.` : `By itself, it crosses out ${joinNames(crossed)}.`;
            return `${how} ${still}`;
          }
          default: return `By itself, it does not cross out any box in ${P}’s row or ${xCol}. ${still}`;
        }
      };
      // The counterexample: a way where clue k is true and the person has the thing (keeping the most other clues true).
      const way = bestWay(alone[j].filter((s) => s[p][c] === x), clues)!;
      feedback[`k${k}`] = {
        headline: head(),
        detail: [`Clue ${k} says ${said(j)}. ${why()}`, `Here is a way where clue ${k} is true and ${w.is(p, c, x)}.`],
        example: {
          label: `One way where clue ${k} is true: ${tw.way(way)}`,
          truths: [{ who: `Clue ${k}`, value: gridClueHolds(cl, way) }, tw.fact(way, p, c, x)],
          note: `So clue ${k} alone does not prove that ${T} gets a ✗.`,
        },
      };
      examples[`k${k}`] = { way };
      kinds[`k${k}`] = kind;
    }
    // Cases: each clue alone. With more than four clues, leave out the ones about neither the person nor the thing.
    let shown = clues.map((_, i) => i);
    while (shown.length > 4) {
      const drop = [...shown].reverse().find((i) => i !== prover && (kinds[`k${i + 1}`] === 'neither' || kinds[`k${i + 1}`] === 'other-part'))
        ?? [...shown].reverse().find((i) => i !== prover)!;
      shown = shown.filter((i) => i !== drop);
    }
    // The simpler example uses facts that are true in the answer: a has x0, and a does not have y0.
    const [a, b] = cast.spec.people;
    const x0 = sol[a][c];
    const y0 = cast.spec.cats.find((k) => k.id === c)!.values.find((y) => y !== x0)!;
    const tiny = (cl: GridClue) => cellStatus(fitting(cast.spec, [cl]), b, c, x0);
    if (tiny({ t: 'is', p: a, c, v: x0 }) !== 'no' || tiny({ t: 'isnt', p: a, c, v: y0 }) !== 'open') throw new Error('proofPuzzle: the simpler example must hold');
    const teach: Teach = {
      rule: 'A clue proves a ✗ when, with that clue alone, the box could never get a ✓.',
      // A wrong pick can be a linking clue (two-part grids); then that word needs defining more than ✗ does.
      terms: [...(ncat === 2 && clues.some((cl) => cl.t === 'link' || cl.t === 'notLink')
        ? [TERMS.link(cast, cast.cats[0].cat.id, cast.cats[1].cat.id)]
        : [TERMS.no(cast, c)]), TERMS.alone, TERMS.proves],
      meaning: `The question is about one box: ${T}. Test each clue alone. With only that clue, could ${P} still ${w.base(c, x)}?`,
      casesTitle: `Test each clue alone. Could ${P} ${w.base(c, x)}?`,
      cases: shown.map((i) => ({
        label: `Clue ${i + 1}: ${clueText(cast, clues[i])}`,
        truths: [tw.could(alone[i], p, c, x)],
        note: i === prover ? `So clue ${i + 1} proves the ✗.` : `So clue ${i + 1} alone does not prove the ✗.`,
      })),
      remember: ['Test one clue at a time, as if it were the only clue.', 'Ask: “With only this clue, could the box still get a ✓?”'],
      simpler: [
        `Say the only clue is “${w.is(a, c, x0)}.” Could ${nm(b)} ${w.base(c, x0)}?`,
        `No. ${w.onlyOne(c, x0)}. So this clue proves that ${w.cell(b, x0, c)} gets a ✗.`,
        `Now say the only clue is “${w.not(a, c, y0)}.” Could ${nm(b)} ${w.base(c, x0)}?`,
        `Yes. This clue is not about ${nm(b)} or ${w.obj(c, x0)}. So it does not prove the ✗.`,
      ],
    };
    const tempting = clues.some((cl, j) => j !== prover && mentions(cl, null, c, x));
    const hintAt = shown.find((i) => i !== prover)!;
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l5',
      skill: 's4.proof-clue',
      prompt: `${settingText(cast)} Which clue, all by itself, proves that ${w.not(p, c, x)}?`,
      scene: { kind: 'clues', clues: clues.map((cl) => clueText(cast, cl)) },
      choices: clues.map((_, i) => ({ id: `k${i + 1}`, label: `Clue ${i + 1}` })),
      answer: `k${prover + 1}`,
      feedback,
      explain,
      // The Hint shows one clue that does not prove it, tested by itself, then the method.
      hint: `Here is one clue, tested by itself. Test the others the same way: if it were the only clue, could ${P} still ${w.base(c, x)}?`,
      hintCase: teach.cases![shown.indexOf(hintAt)],
      ...(tempting ? { conflict: true } : {}),
      ...(ncat === 2 ? { seconds: 120 } : {}),
      teach,
    };
    syncWhyWrong(item);
    return { item, cast, sol, clues, target: cell, bases: { cases: shown.map((i) => ({ clues: [clues[i]] })), examples, hint: { clues: [clues[hintAt]] } }, kinds };
  }
  throw new Error('proofPuzzle: no puzzle found');
}

export interface EnoughOpts {
  id: string;
  skin: SkinId;
  /** true: clues 1 and 2 already decide it. false: they do not (Can't tell yet). */
  tell: boolean;
  ncat?: 1 | 2;
  n?: number;
}

/** "Use only clues 1 and 2. Can you tell who has the fish yet?" Yes / Can't tell yet. */
export function enoughPuzzle(rng: Rng, o: EnoughOpts): Built<ChooseItem> & { clues: GridClue[]; c: string; val: string; bases: Bases } {
  const skin = SKINS[o.skin];
  const ncat = o.ncat ?? 1;
  for (let tries = 0; tries < 200; tries++) {
    const { cast, sol, clues } = fullPuzzle(rng, skin, { n: o.n ?? 3, ncat, weights: ncat === 1 ? WEIGHTS_SLOW : WEIGHTS_SLOW_TWO, min: 3, max: ncat === 1 ? 4 : 5 });
    const two = clues.slice(0, 2);
    const sols = fitting(cast.spec, two);
    const solve = humanSolve(cast.spec, two);
    const ppl = cast.spec.people;
    const cands: { c: string; val: string; who: string[]; step?: Step }[] = [];
    for (const c of cast.spec.cats) {
      for (const val of c.values) {
        const who = holders(sols, c.id, val, ppl);
        if (o.tell) {
          if (who.length !== 1) continue;
          const step = solve.at(who[0], c.id, val);
          if (!step || step.mark !== 'yes' || step.why.k !== 'left') continue;
          cands.push({ c: c.id, val, who, step });
        } else {
          if (who.length < 2 || !two.some((cl) => mentions(cl, null, c.id, val))) continue;
          cands.push({ c: c.id, val, who });
        }
      }
    }
    if (!cands.length) continue;
    const { c, val, who, step } = rng.pick(cands);
    const tw = teachWords(cast);
    const { w, nm } = tw;
    const names = joinNames(who.map(nm));
    const base = w.base(c, val);
    const obj = w.obj(c, val);
    const twoBasis: Basis = { clues: two };
    const by = (i: number, q: string) => cellStatus(fitting(cast.spec, [two[i]]), q, c, val) === 'no';
    const personNote = (q: string) => {
      const st = cellStatus(sols, q, c, val);
      if (st === 'yes') return `Only ${nm(q)} is left, so ${nm(q)} must ${base}.`;
      if (st === 'open') return `Clues 1 and 2 do not cross out ${nm(q)}.`;
      return by(0, q) ? `Clue 1 crosses out ${nm(q)}.` : by(1, q) ? `Clue 2 crosses out ${nm(q)}.` : `Clues 1 and 2 together cross out ${nm(q)}.`;
    };
    const personCase = (q: string): TeachCase => {
      const truths = [tw.could(sols, q, c, val)];
      if (cellStatus(sols, q, c, val) === 'yes') truths.push(tw.must(sols, q, c, val));
      return { label: `${w.cell(q, val, c)}.`, truths, note: personNote(q) };
    };
    const feedback: Record<string, ChoiceFeedback> = {};
    const examples: Record<string, Basis> = {};
    let explain: string;
    if (o.tell) {
      const why = tickText(cast, two, step!);
      explain = `Yes. ${why}`;
      feedback[CANT] = {
        headline: `Clues 1 and 2 already leave only ${nm(who[0])}.`,
        detail: [why, `“Can’t tell yet” fits only when two or more ${plural(cast)} could still ${base}.`],
        example: personCase(who[0]),
      };
      examples[CANT] = twoBasis;
    } else {
      explain = `With only clues 1 and 2, ${names} could each still ${base}. So you can’t tell yet.`;
      const out = ppl.filter((q) => !who.includes(q));
      feedback.yes = {
        headline: `With only clues 1 and 2, ${names} could each ${base}.`,
        detail: [
          out.length ? `Clues 1 and 2 cross out ${joinNames(out.map(nm))} for ${obj}, and no one else.` : `Clues 1 and 2 do not cross out anyone for ${obj}.`,
          `“Yes” fits only when just one ${skin.noun} is left. Here ${COUNT[who.length].toLowerCase()} are left, so you can’t tell yet.`,
        ],
        example: {
          label: `Who could ${base}, using only clues 1 and 2.`,
          truths: ppl.map((q) => tw.could(sols, q, c, val)),
          note: `${COUNT[who.length]} ${plural(cast)} could, so you can’t tell yet.`,
        },
      };
      examples.yes = twoBasis;
    }
    // The smallest example: two people and one "not" clue leave one; three people and the same clue leave two.
    const b = ppl.find((q) => sol[q][c] === val)!;
    const a = ppl.find((q) => q !== b)!;
    const small: Spec = { people: [a, b], cats: [{ id: c, values: [val, cast.spec.cats.find((k) => k.id === c)!.values.find((y) => y !== val)!] }] };
    const notA: GridClue = { t: 'isnt', p: a, c, v: val };
    if (holders(fitting(small, [notA]), c, val, small.people).join() !== b) throw new Error('enoughPuzzle: the simpler example must hold');
    const teach: Teach = {
      rule: `You can tell only when one ${skin.noun} is left who could ${base}.`,
      terms: [TERMS.cant, TERMS.onlyOne],
      meaning: `Use only clues 1 and 2. Cross out every ${skin.noun} they rule out for ${obj}. Then count who is left.`,
      casesTitle: `With only clues 1 and 2, who could ${base}?`,
      cases: ppl.map(personCase),
      remember: [`One ${skin.noun} left: you can tell. Two or more: you can’t tell yet.`, `Ask: “How many ${plural(cast)} could still ${base}?”`],
      simpler: [
        `Imagine just two ${plural(cast)}, ${joinNames(ppl.filter((q) => q === a || q === b).map(nm))}.`,
        `Say the only clue is “${w.not(a, c, val)}.” Then only ${nm(b)} could ${base}.`,
        'One is left, so you can tell.',
        `With a third ${skin.noun}, the same clue would leave two who could. Then you can’t tell yet.`,
      ],
    };
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l5',
      skill: 's4.enough-clues',
      prompt: `${settingText(cast)} Use only clues 1 and 2. Can you tell ${cast.skin.who.charAt(0).toLowerCase()}${cast.skin.who.slice(1)} ${w.cat(c).is} ${obj} yet?`,
      scene: { kind: 'clues', clues: clues.map((cl) => clueText(cast, cl)) },
      choices: [{ id: 'yes', label: 'Yes' }, CANT_YET],
      answer: o.tell ? 'yes' : CANT,
      feedback,
      explain,
      // The Hint shows one person checked with only clues 1 and 2 (one they cross out when there is one).
      hint: `Here is one ${cast.skin.noun}, checked with only clues 1 and 2. Could more than one ${cast.skin.noun} still ${base}?`,
      hintCase: personCase(ppl.find((q) => cellStatus(sols, q, c, val) === 'no') ?? ppl[0]),
      ...(o.tell ? {} : { conflict: true }),
      ...(ncat === 2 ? { seconds: 120 } : {}),
      teach,
    };
    syncWhyWrong(item);
    return { item, cast, sol, clues, c, val, bases: { cases: ppl.map(() => twoBasis), examples, hint: twoBasis } };
  }
  throw new Error('enoughPuzzle: no puzzle found');
}

// ---------- the Do beat: guided boards ----------
//
// See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026). An idea card shows one case already marked; a guided board
// keeps that board up, shows the worked case, and the learner marks a new case by taps. Every answer on a board is
// computed here: a box's mark from every assignment that fits what the row says (fitting), and the words for each
// wrong tap from the human-style solver's step for that box (humanSolve), so each reason is one a person with a
// pencil would give: the clue that says it, the ✓ that spreads to it, the last box left, or the link that carries it.

/** Snacks for the smallest grid: two kids, an apple and bread (the handoff's Mia and Leo). */
const LUNCH: Cat = {
  id: 'lunch', label: 'Snack', noun: 'snack', plural: 'snacks',
  values: [v('apple', 'apple', 'an apple', 'the apple'), v('bread', 'bread', 'bread', 'the bread')],
  is: 'has', not: 'does not have', base: 'have',
  each: '{who} each have a different snack', one: '{p} has just one snack', ask: 'Which snack must {p} have?', holder: 'the kid with {v}',
};

const CARD_CATS = { pet: PET, snack: SNACK, lunch: LUNCH } as const;
export type CardCat = keyof typeof CARD_CATS;

/** The cast of an idea card: kids in the order given (a card's rows are not sorted) and fixed values. No rng. */
export function cardCast(names: readonly string[], parts: readonly { cat: CardCat; values: readonly string[] }[]): Cast {
  const people = names.map((l) => ({ id: l.toLowerCase(), label: l }));
  const cats = parts.map(({ cat: k, values }) => {
    const cat = CARD_CATS[k];
    const vals = values.map((id) => {
      const x = cat.values.find((y) => y.id === id);
      if (!x) throw new Error(`cardCast: no ${id} in ${k}`);
      return x;
    });
    if (vals.length !== people.length) throw new Error('cardCast: one value per kid');
    return { cat, vals };
  });
  const names_: Record<string, string> = Object.fromEntries(people.map((p) => [p.id, p.label]));
  const spec: Spec = { people: people.map((p) => p.id), cats: cats.map((c) => ({ id: c.cat.id, values: c.vals.map((x) => x.id) })) };
  return { skin: SKINS.kids, people, cats, spec, nm: (id) => names_[id] };
}

/** A card's grid picture of one part of a cast (same shape as the quiz grids), with an optional caption. */
export function cardGrid(cast: Cast, part: number, marks: Marks, caption?: string): Scene {
  const cols = cast.cats[part].vals.map((x) => ({ id: x.id, label: x.label }));
  return { kind: 'grid', rows: cast.people, cols, marks, ...(caption ? { caption } : {}) };
}

/** The marks a picture shows, as clues: a ✓ says "has", a ✗ says "does not have". */
export function marksAsClues(c: string, marks: Marks): GridClue[] {
  return Object.entries(marks).flatMap(([p, m]) => Object.entries(m).map(([val, mk]): GridClue => (mk === 'yes' ? { t: 'is', p, c, v: val } : { t: 'isnt', p, c, v: val })));
}

/** What one board row knows: the marks a picture already shows (facts, never numbered) and the clues it names. */
export interface BoardBasis {
  /** Marks already drawn, as clues (see marksAsClues). */
  facts?: GridClue[];
  /** The clues the row names: “the clue” when there is one, else “clue 1”, “clue 2”, … in this order. */
  clues?: GridClue[];
}

/**
 * A mark a board row asks for. Its label, its options and its answer are all computed. A board never asks the quiz's
 * own question (“Which pet must Leo have?”, “Who must have the cat?”, “Can you tell yet?”): the learner marks the
 * boxes, counts, and taps the last box, and the row's note says what that decides (the skill-drill handoff: no
 * final-answer buttons on a Do board).
 */
export type BoardAsk =
  /** One box: ✓, ✗ or (on a card row) Can’t tell yet. */
  | { k: 'box'; p: string; c: string; v: string }
  /** How many boxes in p's row (or in v's column) have no mark drawn yet. */
  | { k: 'count'; c: string; p?: string; v?: string }
  /** “Could Leo have the dog?” Yes or No. `later`: clues on the list the row may not use. */
  | { k: 'could'; p: string; c: string; v: string; later?: GridClue[] }
  /** “How many kids could have the cat?” 0 up to the number of people. `later`: clues on the list the row may not use. */
  | { k: 'howMany'; c: string; v: string; later?: GridClue[] };

export interface BoardRowSpec {
  id: string;
  label: string;
  basis: BoardBasis;
  ask: BoardAsk[];
  /** The worked case: shown already marked. */
  given?: boolean;
  note?: string;
}

/** The options of a box on a card row: ✓ (Yes), ✗ (No) or Can’t tell yet (the box stays empty). */
export const BOX_OPTIONS: DrillOption[] = [...YES_NO, { id: CANT, label: 'Can’t tell yet' }];

/**
 * Everything one row's marks need: every assignment that fits its facts and clues, the solver's steps, and the
 * words for why a box gets its mark. `grid`: the row sits on a drawn grid, so a reason may say a box “has a ✗”.
 * `shown`: boxes the board draws already marked (a grid board's given boxes), named as marks in a reason.
 * `rowsDrawClues`: a card row, whose label adds its “has” and “does not have” clues as marks the learner sees.
 */
function boardCtx(cast: Cast, b: BoardBasis, grid: boolean, shown: Marks = {}, rowsDrawClues = false) {
  const w = wordsFor(cast);
  const nm = cast.nm;
  const facts = b.facts ?? [];
  const clues = b.clues ?? [];
  /**
   * A box the learner already sees marked: drawn on the picture (a fact), shown on a grid board, or (on a card row,
   * where the row's label adds it) set by a “has” or “does not have” clue. A box the learner still has to tap is not.
   */
  const seen = (p: string, c: string, v: string) =>
    shown[p]?.[v] !== undefined
    || [...facts, ...(rowsDrawClues ? clues : [])].some((f) => (f.t === 'is' || f.t === 'isnt') && f.p === p && f.c === c && f.v === v);
  if (facts.some((f) => f.t !== 'is' && f.t !== 'isnt')) throw new Error('board: a fact is a drawn mark');
  const all = [...facts, ...clues];
  const sols = fitting(cast.spec, all);
  if (!sols.length) throw new Error('board: no way to fill the grid fits this row');
  const solve = humanSolve(cast.spec, all);
  const ppl = cast.spec.people;
  const vals = (c: string) => cast.spec.cats.find((x) => x.id === c)!.values;
  const name = (i: number) => (clues.length === 1 ? 'the clue' : `clue ${i + 1}`);
  const said = (cl: GridClue) => {
    const t = unstop(clueText(cast, cl));
    return cl.t === 'link' || cl.t === 'notLink' ? lowerFirst(t) : t;
  };
  const status = (p: string, c: string, x: string) => cellStatus(sols, p, c, x);
  /** The solver's step for a decided box. Every box a board asks about is reached without guessing. */
  const step = (p: string, c: string, x: string): Step => {
    const s = solve.at(p, c, x);
    if (!s || s.mark !== status(p, c, x)) throw new Error(`board: no pencil step for ${w.cell(p, x, c)}`);
    return s;
  };
  /** The ✓ a spread starts from. */
  const from = (f: Cell): string => {
    const s = solve.at(f.p, f.c, f.v)!;
    if ((s.why.k === 'clue' && s.why.i < facts.length) || shown[f.p]?.[f.v] === 'yes') return `${w.cell(f.p, f.v, f.c)} has a ✓.`;
    if (s.why.k === 'clue') return `${cap(name(s.why.i - facts.length))} says ${w.is(f.p, f.c, f.v)}.`;
    return `${nm(f.p)} must ${w.base(f.c, f.v)}.`;
  };
  /** Why a decided box gets its mark, in a sentence or two (without the “So …” that ends it). */
  const reason = (s: Step): string => {
    const why = s.why;
    if (why.k === 'clue') {
      if (why.i < facts.length) return `${w.cell(s.p, s.v, s.c)} has a ${s.mark === 'yes' ? '✓' : '✗'}.`;
      const k = why.i - facts.length;
      const cl = clues[k];
      return cl.t === 'either' ? `${cap(name(k))} says ${said(cl)}. It leaves out ${w.obj(s.c, s.v)}.` : `${cap(name(k))} says ${said(cl)}.`;
    }
    if (why.k === 'spread') return `${from(why.from)} ${why.along === 'row' ? w.one(s.p, s.c) : w.onlyOne(s.c, s.v)}.`;
    if (why.k === 'left') {
      const one = why.along === 'row' ? `${w.one(s.p, s.c)}.` : `One ${cast.skin.noun} ${w.cat(s.c).is} ${w.obj(s.c, s.v)}.`;
      // “Leo – apple has a ✗” only when the learner sees that ✗; a box still to tap “gets a ✗”.
      const crossed = (cells: [string, string][]) => {
        const drawn = cells.every(([q, x]) => seen(q, s.c, x));
        const verb = cells.length === 1 ? (drawn ? 'has' : 'gets') : drawn ? 'have' : 'get';
        return `${joinNames(cells.map(([q, x]) => w.cell(q, x, s.c)))} ${verb} a ✗.`;
      };
      if (why.along === 'row') {
        const others = vals(s.c).filter((x) => x !== s.v);
        return grid
          ? `${crossed(others.map((x): [string, string] => [s.p, x]))} ${one}`
          : `${nm(s.p)} can’t ${w.cat(s.c).base} ${joinOr(others.map((x) => w.obj(s.c, x)))}. ${one}`;
      }
      const others = ppl.filter((q) => q !== s.p);
      return grid
        ? `${crossed(others.map((q): [string, string] => [q, s.v]))} ${one}`
        : `${joinNames(others.map(nm))} can’t ${w.base(s.c, s.v)}. ${one}`;
    }
    if (why.i < facts.length) throw new Error('board: a link is never a drawn mark');
    const f = why.from;
    const fm = solve.at(f.p, f.c, f.v)!.mark;
    return `${cap(name(why.i - facts.length))} says ${said(all[why.i])}. ${cap(fm === 'yes' ? w.is(f.p, f.c, f.v) : w.not(f.p, f.c, f.v))}.`;
  };
  /** Words for each wrong mark of one box. `three`: the box also offers Can’t tell yet. */
  const boxWhy = (p: string, c: string, x: string, three: boolean): Record<string, string> => {
    const st = status(p, c, x);
    const cell = w.cell(p, x, c);
    if (st !== 'open') {
      const r = reason(step(p, c, x));
      const mk = st === 'yes' ? 'a ✓' : 'a ✗';
      return {
        [st === 'yes' ? 'no' : 'yes']: `${r} So ${cell} gets ${mk}, not ${st === 'yes' ? 'a ✗' : 'a ✓'}.`,
        ...(three ? { [CANT]: `You can tell. ${r} So ${cell} gets ${mk}.` } : {}),
      };
    }
    if (!three) throw new Error(`board: ${cell} is not decided, so it can’t be a grid box`);
    const alts = options(sols, p, c, vals(c)).filter((y) => y !== x);
    const named = clues.findIndex((cl) => cl.t === 'either' && cl.p === p && cl.c === c && (cl.v1 === x || cl.v2 === x));
    return {
      yes: `${nm(p)} could ${w.base(c, x)}, but ${nm(p)} could also ${w.base(c, alts[0])}. So ${cell} can’t get a ✓ yet.`,
      no: named >= 0
        ? `${cap(name(named))} names ${w.obj(c, x)} as one choice for ${nm(p)}. So ${nm(p)} could ${w.base(c, x)}, and ${cell} stays empty for now.`
        : `Nothing rules out ${w.obj(c, x)} for ${nm(p)}. ${nm(p)} could ${w.cat(c).base} ${joinOr([x, ...alts].map((y) => w.obj(c, y)))}. So ${cell} stays empty for now.`,
    };
  };
  /** The marks drawn so far in category c: the facts, plus every “has” or “does not have” clue the row names. */
  const drawn = (c: string): Marks => {
    const m: Marks = Object.fromEntries(ppl.map((q) => [q, {}]));
    for (const cl of all) if ((cl.t === 'is' || cl.t === 'isnt') && cl.c === c) m[cl.p][cl.v] = cl.t === 'is' ? 'yes' : 'no';
    return m;
  };
  const clueRef = clues.length === 1 ? 'this clue' : `clues ${joinNames(clues.map((_, i) => String(i + 1)))}`;
  return { w, nm, sols, status, step, reason, boxWhy, drawn, vals, ppl, said, clues, clueRef };
}

type BoardCtx = ReturnType<typeof boardCtx>;

/** One asked mark on a card row, with its computed answer and words for every wrong option. */
function boardMark(cast: Cast, x: BoardCtx, rowId: string, a: BoardAsk, given: boolean): DrillMark {
  const { w, nm, status } = x;
  const mark = (id: string, label: string, opts: DrillOption[], answer: string, why: Record<string, string>): DrillMark => {
    if (!opts.some((o) => o.id === answer)) throw new Error(`board ${id}: the answer is not an option`);
    for (const o of opts) if (!given && o.id !== answer && !why[o.id]) throw new Error(`board ${id}: no words for a wrong ${o.label}`);
    const words = given ? {} : Object.fromEntries(opts.filter((o) => o.id !== answer).map((o) => [o.id, why[o.id]]));
    return { id, label, options: opts, answer, ...(given ? { given: true } : {}), why: words };
  };
  switch (a.k) {
    case 'box': {
      const st = status(a.p, a.c, a.v);
      return mark(`${rowId}-${a.p}-${a.v}`, w.cell(a.p, a.v, a.c), BOX_OPTIONS, st === 'open' ? CANT : st, x.boxWhy(a.p, a.c, a.v, true));
    }
    case 'count': {
      const row = a.p !== undefined;
      const line: [string, string][] = row ? x.vals(a.c).map((y): [string, string] => [a.p!, y]) : x.ppl.map((q): [string, string] => [q, a.v!]);
      const d = x.drawn(a.c);
      if (line.some(([q, y]) => d[q][y] === 'yes')) throw new Error('board: a counted line has no ✓ yet');
      const crossed = line.filter(([q, y]) => d[q][y] === 'no').map(([q, y]) => w.cell(q, y, a.c));
      const empty = line.filter(([q, y]) => d[q][y] === undefined).map(([q, y]) => w.cell(q, y, a.c));
      const n = empty.length;
      const lineName = row ? `${nm(a.p!)}’s row` : `the ${w.val(a.c, a.v!).label} column`;
      const emptyText = n === 0 ? 'No box is empty' : n === 1 ? `Only ${empty[0]} is empty` : `${joinNames(empty)} are empty`;
      const crossedText = crossed.length ? `${joinNames(crossed)} ${crossed.length === 1 ? 'has' : 'have'} a ✗. ` : '';
      const opts = [...line.map((_, i) => String(i)), String(line.length)].map((id) => ({ id, label: id }));
      const why = Object.fromEntries(opts.map((o) => [o.id, `Count the empty boxes in ${lineName}. ${crossedText}${emptyText}. That makes ${n}, not ${o.id}.`]));
      return mark(`${rowId}-count`, `Empty boxes in ${lineName}`, opts, String(n), why);
    }
    case 'could': {
      const st = status(a.p, a.c, a.v);
      const P = nm(a.p);
      const base = w.base(a.c, a.v);
      const why: Record<string, string> = {};
      if (st === 'no') why.yes = `${x.reason(x.step(a.p, a.c, a.v))} So ${P} can’t ${base}.`;
      else if (st === 'yes') why.no = `${x.reason(x.step(a.p, a.c, a.v))} So ${P} must ${base}.`;
      else {
        const can = options(x.sols, a.p, a.c, x.vals(a.c));
        const lead = x.clues.length === 1 ? `The clue says ${x.said(x.clues[0])}. ` : '';
        // A later clue on the list may rule it out; the question says not to use it, so name it.
        const later = a.later ?? [];
        const k = later.findIndex((_, i) => cellStatus(fitting(cast.spec, [...x.clues, ...later.slice(0, i + 1)]), a.p, a.c, a.v) === 'no');
        const tail = k >= 0 ? ` Clue ${x.clues.length + k + 1} says ${x.said(later[k])}, but use only ${x.clueRef}.` : '';
        why.no = `${lead}With only ${x.clueRef}, ${P} could ${w.cat(a.c).base} ${joinOr(can.map((y) => w.obj(a.c, y)))}. So ${P} could still ${base}.${tail}`;
      }
      return mark(`${rowId}-could-${a.p}-${a.v}`, `Could ${P} ${base}?`, [...YES_NO], st === 'no' ? 'no' : 'yes', why);
    }
    case 'howMany': {
      const who = holders(x.sols, a.c, a.v, x.ppl);
      const out = x.ppl.filter((q) => !who.includes(q));
      const n = who.length;
      const base = w.base(a.c, a.v);
      const could = n === 1 ? `only ${nm(who[0])} could ${base}` : `${joinNames(who.map(nm))} could each ${base}`;
      const cant = out.length ? ` ${joinNames(out.map(nm))} can’t.` : '';
      // A later clue on the list may change the count; the question says not to use it, so say so on that count.
      const later = a.later ?? [];
      const withLater = later.length ? holders(fitting(cast.spec, [...x.clues, ...later]), a.c, a.v, x.ppl).length : n;
      const opts = Array.from({ length: x.ppl.length + 1 }, (_, i) => ({ id: String(i), label: String(i) }));
      const why = Object.fromEntries(opts.map((o) => {
        const laterRef = later.length === 1 ? `Clue ${x.clues.length + 1}` : `Clues ${joinNames(later.map((_, i) => String(x.clues.length + i + 1)))}`;
        const tail = withLater !== n && Number(o.id) === withLater ? ` ${laterRef} would make it ${o.id}, but use only ${x.clueRef}.` : '';
        return [o.id, `With only ${x.clueRef}, ${could}.${cant} That makes ${n}, not ${o.id}.${tail}`];
      }));
      return mark(`${rowId}-many-${a.v}`, `How many ${plural(cast)} could ${base}?`, opts, String(n), why);
    }
  }
}

export interface CardBoardOptions {
  id: string;
  title: string;
  body: string[];
  /** The worked example's board: the same scene object as its idea card. */
  scene?: Scene;
  twin?: string;
  rows: BoardRowSpec[];
  done: string;
}

/**
 * A guided board of cards: each row is one case (a clue, a line of the grid, a question), with its marks to tap.
 * Given rows are the worked case, shown already marked.
 */
export function cardBoard(cast: Cast, o: CardBoardOptions): DrillStep {
  const rows: DrillRow[] = o.rows.map((r) => {
    const x = boardCtx(cast, r.basis, (r.basis.facts ?? []).length > 0, {}, true);
    return { id: r.id, label: r.label, marks: r.ask.map((a) => boardMark(cast, x, r.id, a, !!r.given)), ...(r.note ? { note: r.note } : {}) };
  });
  return { id: o.id, title: o.title, body: o.body, ...(o.scene ? { scene: o.scene } : {}), ...(o.twin ? { twin: o.twin } : {}), rows, done: o.done };
}

export interface GridBoardOptions {
  id: string;
  title: string;
  body: string[];
  /** The other part of the grid, drawn above (a two-part grid). A one-part grid board is the board itself. */
  scene?: Scene;
  /** Which part of the cast the boxes are (an index into cast.cats). */
  part: number;
  basis: BoardBasis;
  /** The worked case: boxes shown already marked. Each must be what the facts and clues give. */
  given: Marks;
  caption?: string;
  /** A note under a person's row (shown for a given row, and once the board is right). */
  notes?: Record<string, string>;
  done: string;
}

/**
 * A guided logic grid (DrillStep.columns): one row per person, one box per value of one part. Every box is decided
 * by the facts and clues (a grid box is only ✓ or ✗); given boxes are shown, and the learner taps the rest.
 */
export function gridBoard(cast: Cast, o: GridBoardOptions): DrillStep {
  const x = boardCtx(cast, o.basis, true, o.given);
  const c = cast.cats[o.part].cat.id;
  const vs = cast.spec.cats[o.part].values;
  for (const [p, m] of Object.entries(o.given)) {
    for (const y of Object.keys(m)) if (!cast.spec.people.includes(p) || !vs.includes(y)) throw new Error(`gridBoard ${o.id}: ${p} – ${y} is not a box`);
  }
  const rows: DrillRow[] = cast.people.map(({ id: p, label }) => ({
    id: `${o.id}-${p}`,
    label,
    ...(o.notes?.[p] ? { note: o.notes[p] } : {}),
    marks: vs.map((y): DrillMark => {
      const st = x.status(p, c, y);
      if (st === 'open') throw new Error(`gridBoard ${o.id}: ${x.w.cell(p, y, c)} is not decided`);
      const g = o.given[p]?.[y];
      if (g !== undefined && g !== st) throw new Error(`gridBoard ${o.id}: the card shows ${g} in ${x.w.cell(p, y, c)}, but the clues give ${st}`);
      return { id: `${o.id}-${p}-${y}`, label: x.w.val(c, y).label, options: [...YES_NO], answer: st, ...(g ? { given: true } : {}), why: g ? {} : x.boxWhy(p, c, y, false) };
    }),
  }));
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    ...(o.scene ? { scene: o.scene } : {}),
    columns: vs.map((y) => x.w.val(c, y).label),
    ...(o.caption ? { caption: o.caption } : {}),
    rows,
    done: o.done,
  };
}
