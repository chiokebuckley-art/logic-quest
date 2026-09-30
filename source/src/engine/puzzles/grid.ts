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
 */
import { gridClueHolds } from '../grade';
import type { AssignItem, Choice, ChooseItem, GridClue, MultiItem, Rng, Scene } from '../types';

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

/** A full logic grid to fill in (AssignItem, layout 'grid'). */
export function gridPuzzle(rng: Rng, o: GridOpts): Built<AssignItem> & { clues: GridClue[] } {
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
    explain: `${lead} Keep going the same way until every row has one ✓. ${answerText(cast, sol)}`,
    hint: o.ncat === 1
      ? 'Put in the marks the clues give you. Then look for a row or column with just one empty box.'
      : 'Put in the marks the clues give you. A linking clue lets you carry a ✓ or ✗ from one part of the grid to the other.',
    seconds: o.ncat === 1 ? 150 : 180,
  };
  return { item, cast, sol, clues };
}

// ---------- lesson 1: one clue, one box ----------

export type MarkClue = 'is' | 'isnt' | 'either';

export interface MarkOpts {
  id: string;
  skin: SkinId;
  t?: MarkClue;
}

/** "A clue says: Leo does not have the dog. Which box gets a ✗?" with an empty grid to look at. */
export function markPuzzle(rng: Rng, o: MarkOpts): Built<ChooseItem> & { clue: GridClue; ask: Mark; target: { p: string; v: string } } {
  const skin = SKINS[o.skin];
  const t = o.t ?? rng.pick(['is', 'isnt', 'either'] as const);
  for (let tries = 0; tries < 200; tries++) {
    const cast = makeCast(rng, skin, 3, [rng.int(0, 1)]);
    const sol = randomSol(rng, cast);
    const c = cast.cats[0].cat.id;
    const vals = cast.spec.cats[0].values;
    const ppl = cast.spec.people;
    const w = wordsFor(cast);
    const p = rng.pick(ppl);
    const mine = sol[p][c];
    const others = rng.shuffle(ppl.filter((q) => q !== p));
    let clue: GridClue;
    let ask: Mark;
    let target: { p: string; v: string };
    let wrong: { p: string; v: string; why: string; status: Mark | 'open' }[];
    if (t === 'is') {
      clue = { t: 'is', p, c, v: mine };
      ask = 'yes';
      target = { p, v: mine };
      const rowV = rng.pick(vals.filter((x) => x !== mine));
      const q = others[0], q2 = others[1];
      const otherV = rng.pick(vals.filter((x) => x !== mine));
      wrong = [
        { p, v: rowV, status: 'no', why: `${w.one(p, c)}, so ${w.cell(p, rowV, c)} gets a ✗, not a ✓.` },
        { p: q, v: mine, status: 'no', why: `${w.onlyOne(c, mine)}, so ${w.cell(q, mine, c)} gets a ✗, not a ✓.` },
        { p: q2, v: otherV, status: 'open', why: `The clue is about ${cast.nm(p)} and ${w.obj(c, mine)}. It does not decide ${w.cell(q2, otherV, c)} yet.` },
      ];
    } else if (t === 'isnt') {
      const bad = rng.pick(vals.filter((x) => x !== mine));
      clue = { t: 'isnt', p, c, v: bad };
      ask = 'no';
      target = { p, v: bad };
      const rowV = rng.pick(vals.filter((x) => x !== bad));
      const q = others[0], q2 = others[1];
      const otherV = rng.pick(vals.filter((x) => x !== bad));
      wrong = [
        { p, v: rowV, status: 'open', why: `The clue is about ${w.obj(c, bad)}, not ${w.obj(c, rowV)}. ${cast.nm(p)} could still ${w.base(c, rowV)}.` },
        { p: q, v: bad, status: 'open', why: `The clue is about ${cast.nm(p)}, not ${cast.nm(q)}. ${cast.nm(q)} could still ${w.base(c, bad)}.` },
        { p: q2, v: otherV, status: 'open', why: `The clue is about ${cast.nm(p)} and ${w.obj(c, bad)}. It does not decide ${w.cell(q2, otherV, c)} yet.` },
      ];
    } else {
      const v2 = rng.pick(vals.filter((x) => x !== mine));
      const [a, b] = vals.filter((x) => x === mine || x === v2);
      const left = vals.find((x) => x !== a && x !== b)!;
      clue = { t: 'either', p, c, v1: a, v2: b };
      ask = 'no';
      target = { p, v: left };
      const q = others[0];
      const said = `The clue says ${cast.nm(p)} ${w.cat(c).is} ${w.obj(c, a)} or ${w.obj(c, b)}.`;
      wrong = [
        { p, v: a, status: 'open', why: `${said} So ${cast.nm(p)} could ${w.base(c, a)}.` },
        { p, v: b, status: 'open', why: `${said} So ${cast.nm(p)} could ${w.base(c, b)}.` },
        { p: q, v: left, status: 'open', why: `The clue is about ${cast.nm(p)}, not ${cast.nm(q)}. ${cast.nm(q)} could still ${w.base(c, left)}.` },
      ];
    }
    // Check every choice against the clue alone.
    const sols = fitting(cast.spec, [clue]);
    // The target gets the asked mark; each other choice is what its message says (✗, or still open).
    if (cellStatus(sols, target.p, c, target.v) !== ask) continue;
    if (wrong.some((x) => x.status === ask || cellStatus(sols, x.p, c, x.v) !== x.status)) continue;
    const cells = gridOrder(cast, 0, [target, ...wrong]);
    const whyWrong = Object.fromEntries(wrong.map((x) => [cellId(x.p, x.v), x.why]));
    const text = clueText(cast, clue);
    const cell = w.cell(target.p, target.v, c);
    const explain = t === 'is'
      ? `The clue says ${w.is(p, c, mine)}. So ${cell} gets a ✓.`
      : t === 'isnt'
        ? `The clue says ${w.not(p, c, target.v)}. So ${cell} gets a ✗.`
        : `${cast.nm(p)} ${w.cat(c).is} one of the two named in the clue. So ${w.not(p, c, target.v)}, and ${cell} gets a ✗.`;
    const hint = t === 'either'
      ? `The clue names two ${w.cat(c).plural}. What about the third one?`
      : t === 'is'
        ? 'A ✓ goes where the right row meets the right column.'
        : 'A clue with “not” gives a ✗. Find the box where that row and column meet.';
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l1',
      skill: 's4.grid-marks',
      prompt: `${settingText(cast)} A clue says: “${text}” Which box gets a ${ask === 'yes' ? '✓' : '✗'}?`,
      scene: gridScene(cast, 0, {}),
      choices: cells.map((x) => ({ id: cellId(x.p, x.v), label: w.cell(x.p, x.v, c) })),
      answer: cellId(target.p, target.v),
      whyWrong,
      explain,
      hint,
    };
    return { item, cast, sol, clue, ask, target };
  }
  throw new Error('markPuzzle: no puzzle found');
}

// ---------- lesson 2: only one left ----------

export type OnlyMode = 'col' | 'row' | 'cant';

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
export function onlyOnePuzzle(rng: Rng, o: OnlyOpts): Built<ChooseItem> & { marks: Marks; ask: 'col' | 'row'; p: string; val: string } {
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
    const who = ask === 'col' ? holders(sols, c, val, ppl) : [];
    const opts = ask === 'row' ? options(sols, p, c, vals) : [];
    const whyWrong: Record<string, string> = {};
    let answer: string;
    let explain: string;
    let choices: Choice[];
    if (ask === 'col') {
      choices = [...cast.people, CANT_YET];
      const col = `the ${w.val(c, val).label} column`;
      for (const q of ppl) if (marks[q][val] === 'no') whyWrong[q] = `${nm(q)} has a ✗ in ${col}, so ${nm(q)} can’t ${w.base(c, val)}.`;
      if (o.mode === 'cant') {
        if (who.length !== 2 || !pair.every((q) => who.includes(q))) continue;
        answer = CANT;
        const [a, b] = [...pair].sort();
        whyWrong[a] = `${nm(a)} could ${w.base(c, val)}, but so could ${nm(b)}. The grid does not decide between them yet.`;
        whyWrong[b] = `${nm(b)} could ${w.base(c, val)}, but so could ${nm(a)}. The grid does not decide between them yet.`;
        explain = `Only ${nm(a)} and ${nm(b)} have an empty box in ${col}. Either one could still ${w.base(c, val)}. So you can’t tell yet.`;
      } else {
        if (who.length !== 1 || who[0] !== holder) continue;
        answer = holder;
        const rest = ppl.filter((q) => q !== holder).map(nm);
        explain = `${joinNames(rest)} ${rest.length === 2 ? 'both have' : 'all have'} a ✗ in ${col}. Only ${nm(holder)}’s box is left. So ${nm(holder)} must ${w.base(c, val)}.`;
        whyWrong[CANT] = `Every other box in ${col} has a ✗. Only ${nm(holder)} is left, so ${nm(holder)} must ${w.base(c, val)}.`;
      }
    } else {
      choices = [...cast.cats[0].vals.map((x) => ({ id: x.id, label: cap(x.label) })), CANT_YET];
      for (const x of vals) if (marks[p][x] === 'no') whyWrong[x] = `${nm(p)}’s box for ${w.obj(c, x)} has a ✗, so ${nm(p)} can’t ${w.base(c, x)}.`;
      if (o.mode === 'cant') {
        if (opts.length !== 2 || !pair.every((x) => opts.includes(x))) continue;
        answer = CANT;
        const [a, b] = vals.filter((x) => pair.includes(x));
        whyWrong[a] = `${nm(p)} could ${w.base(c, a)}, but ${nm(p)} could ${w.base(c, b)} too. The grid does not decide it yet.`;
        whyWrong[b] = `${nm(p)} could ${w.base(c, b)}, but ${nm(p)} could ${w.base(c, a)} too. The grid does not decide it yet.`;
        explain = `${nm(p)}’s row still has two empty boxes: ${w.obj(c, a)} and ${w.obj(c, b)}. Either one could still be right. So you can’t tell yet.`;
      } else {
        if (opts.length !== 1 || opts[0] !== mine) continue;
        answer = mine;
        const crossed = vals.filter((x) => x !== mine).map((x) => w.obj(c, x));
        explain = `In ${nm(p)}’s row, the boxes for ${joinNames(crossed)} have a ✗. Only the box for ${w.obj(c, mine)} is left. So ${nm(p)} must ${w.base(c, mine)}.`;
        whyWrong[CANT] = `Every other box in ${nm(p)}’s row has a ✗. Only the box for ${w.obj(c, mine)} is left, so ${nm(p)} must ${w.base(c, mine)}.`;
      }
    }
    const question = ask === 'col' ? `${cast.skin.who} must ${w.base(c, val)}?` : fill(w.cat(c).ask, { p: nm(p) });
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l2',
      skill: o.mode === 'cant' ? 's4.not-decided' : 's4.only-one-left',
      prompt: `${settingText(cast)} Look at the grid. ${question}`,
      scene: gridScene(cast, 0, marks),
      choices,
      answer,
      whyWrong,
      explain,
      hint: ask === 'col' ? `Count the empty boxes in the ${w.val(c, val).label} column.` : `Count the empty boxes in ${nm(p)}’s row.`,
      ...(o.mode === 'cant' ? { conflict: true } : {}),
    };
    return { item, cast, sol, marks, ask, p: ask === 'row' ? p : holder, val };
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

/** "Mia has the cat. Which of these boxes must now get a ✗?" (MultiItem). */
export function spreadPuzzle(rng: Rng, o: SpreadOpts): Built<MultiItem> & { marks: Marks; p: string; val: string } {
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
    const cards = gridOrder(cast, 0, picked);
    const inRow = (x: { p: string }) => x.p === p;
    const missTips: Record<string, string> = {};
    const pickTips: Record<string, string> = {};
    for (const x of must) {
      missTips[cellId(x.p, x.v)] = inRow(x)
        ? `${w.cell(x.p, x.v, c)} needs a ✗ too. ${w.one(p, c)}.`
        : `${w.cell(x.p, x.v, c)} needs a ✗ too. ${w.onlyOne(c, val)}.`;
    }
    for (const x of open) {
      pickTips[cellId(x.p, x.v)] = `${w.cell(x.p, x.v, c)} is not in ${nm(p)}’s row or the ${w.val(c, val).label} column. ${nm(x.p)} could still ${w.base(c, x.v)}.`;
    }
    const mustLabels = gridOrder(cast, 0, must).map((x) => w.cell(x.p, x.v, c));
    const item: MultiItem = {
      kind: 'multi',
      id: o.id,
      stop: STOP,
      lesson: 's4.l3',
      skill: o.column ? 's4.spread-column' : 's4.spread-tick',
      prompt: `${settingText(cast)} ${w.is(p, c, val)}, so that box gets a ✓. Which of these boxes must now get a ✗?`,
      scene: gridScene(cast, 0, marks),
      choices: cards.map((x) => ({ id: cellId(x.p, x.v), label: w.cell(x.p, x.v, c) })),
      answer: must.map((x) => cellId(x.p, x.v)),
      missTips,
      pickTips,
      explain: `${w.is(p, c, val)}. So every other box in ${nm(p)}’s row gets a ✗. So does every other box in the ${w.val(c, val).label} column. Here that means ${joinNames(mustLabels)}.`,
      hint: 'A ✓ tells you about its whole row and its whole column.',
      ...(o.column ? { conflict: true } : {}),
    };
    return { item, cast, sol, marks, p, val };
  }
  throw new Error('spreadPuzzle: no puzzle found');
}

// ---------- lesson 4: linking clues ----------

export type LinkMode = 'link' | 'notLink2' | 'notLink';

export interface LinkOpts {
  id: string;
  skin: SkinId;
  /** link: one linking clue decides it. notLink2: two "not" clues leave one person. notLink: one "not" link, so can't tell yet. */
  mode: LinkMode;
}

/** The first category is filled in; linking clues tell you who has a value in the second. */
export function linkPuzzle(rng: Rng, o: LinkOpts): Built<ChooseItem> & { clues: GridClue[]; c1: string; c2: string; val: string } {
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
    const has1 = (q: string) => w.is(q, c1, sol[q][c1]);
    const whyWrong: Record<string, string> = {};
    let explain: string;
    if (o.mode === 'link') {
      explain = `The grid shows that ${has1(T)}. The clue says ${w.holder(c1, sol[T][c1])} ${w.cat(c2).is} ${w.obj(c2, val)}. So ${w.is(T, c2, val)}.`;
      for (const q of [L, M]) whyWrong[q] = `${has1(q)}, not ${w.obj(c1, sol[T][c1])}. So ${w.not(q, c2, val)}.`;
      whyWrong[CANT] = `You can tell. ${has1(T)}, so ${w.is(T, c2, val)}.`;
    } else if (o.mode === 'notLink2') {
      const second = clues[1];
      const mWhy = second.t === 'isnt'
        ? `Clue 2 says ${w.not(M, c2, val)}.`
        : `${has1(M)}, and ${w.holder(c1, sol[M][c1])} ${w.cat(c2).not} ${w.obj(c2, val)}.`;
      explain = `Clue 1 crosses out ${nm(L)}, who ${w.cat(c1).is} ${w.obj(c1, sol[L][c1])}. Clue 2 crosses out ${nm(M)}. Only ${nm(T)} is left, so ${w.is(T, c2, val)}.`;
      whyWrong[L] = `${has1(L)}, and ${w.holder(c1, sol[L][c1])} ${w.cat(c2).not} ${w.obj(c2, val)}.`;
      whyWrong[M] = mWhy;
      whyWrong[CANT] = `You can tell. The clues cross out ${nm(L)} and ${nm(M)}. Only ${nm(T)} is left.`;
    } else {
      const [a, b] = [...who].sort();
      explain = `${has1(L)}, so the clue crosses out ${nm(L)}. ${nm(a)} and ${nm(b)} could each still ${w.base(c2, val)}. So you can’t tell yet.`;
      whyWrong[L] = `${has1(L)}, and ${w.holder(c1, sol[L][c1])} ${w.cat(c2).not} ${w.obj(c2, val)}. So ${nm(L)} can’t ${w.base(c2, val)}.`;
      whyWrong[a] = `${nm(a)} could ${w.base(c2, val)}, but so could ${nm(b)}. The clue only crosses out ${nm(L)}.`;
      whyWrong[b] = `${nm(b)} could ${w.base(c2, val)}, but so could ${nm(a)}. The clue only crosses out ${nm(L)}.`;
    }
    const clueLine = texts.length === 1 ? `Clue: “${texts[0]}”` : texts.map((t, i) => `Clue ${i + 1}: “${t}”`).join(' ');
    const marks: Marks = Object.fromEntries(ppl.map((q) => [q, Object.fromEntries(cast.spec.cats[0].values.map((x) => [x, sol[q][c1] === x ? 'yes' : 'no'] as const))]));
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l4',
      skill: o.mode === 'link' ? 's4.link' : 's4.not-link',
      prompt: `${settingText(cast, [false, true])} The grid shows the ${w.cat(c1).plural}. ${clueLine} ${w.whoIs(c2, val)}`,
      scene: gridScene(cast, 0, marks),
      choices: [...cast.people, CANT_YET],
      answer,
      whyWrong,
      explain,
      hint: o.mode === 'link'
        ? `Find ${w.holder(c1, sol[T][c1])} in the grid first.`
        : `Cross out everyone who can’t ${w.base(c2, val)}. Who is left?`,
      ...(o.mode === 'notLink' ? { conflict: true } : {}),
    };
    return { item, cast, sol, clues, c1, c2, val };
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

/** "Which clue, all by itself, proves that Leo does not have the dog?" Exactly one clue does. */
export function proofPuzzle(rng: Rng, o: ProofOpts): Built<ChooseItem> & { clues: GridClue[]; target: Cell } {
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
    const w = wordsFor(cast);
    const nm = cast.nm;
    const { p, c, v: x } = cell;
    const pc = clues[prover];
    let explain: string;
    if (pc.t === 'is' && pc.p === p) explain = `Clue ${prover + 1} says ${w.is(p, c, pc.v)}. ${w.one(p, c)}, so ${w.not(p, c, x)}.`;
    else if (pc.t === 'is') explain = `Clue ${prover + 1} says ${w.is(pc.p, c, x)}. ${w.onlyOne(c, x)}, so ${w.not(p, c, x)}.`;
    else if (pc.t === 'either') explain = `Clue ${prover + 1} says ${nm(p)} ${w.cat(c).is} ${w.obj(c, pc.v1)} or ${w.obj(c, pc.v2)}. Either way, ${w.not(p, c, x)}.`;
    else continue;
    const whyWrong: Record<string, string> = {};
    clues.forEach((cl, j) => {
      if (j === prover) return;
      if (cellStatus(alone[j], p, c, x) !== 'open') throw new Error('proofPuzzle: a clue that does not prove it must leave it open');
      whyWrong[`k${j + 1}`] = cl.t === 'either' && cl.p === p && cl.c === c && (cl.v1 === x || cl.v2 === x)
        ? `Clue ${j + 1} says ${nm(p)} ${w.cat(c).is} ${w.obj(c, cl.v1)} or ${w.obj(c, cl.v2)}. So ${nm(p)} could ${w.base(c, x)}.`
        : `Clue ${j + 1} alone still lets ${nm(p)} ${w.base(c, x)}.`;
    });
    const tempting = clues.some((cl, j) => j !== prover && mentions(cl, null, c, x));
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
      whyWrong,
      explain,
      hint: `Test one clue at a time. If it were the only clue, could ${nm(p)} still ${w.base(c, x)}?`,
      ...(tempting ? { conflict: true } : {}),
      ...(ncat === 2 ? { seconds: 120 } : {}),
    };
    return { item, cast, sol, clues, target: cell };
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
export function enoughPuzzle(rng: Rng, o: EnoughOpts): Built<ChooseItem> & { clues: GridClue[]; c: string; val: string } {
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
    const w = wordsFor(cast);
    const nm = cast.nm;
    const names = joinNames(who.map(nm));
    const whyWrong: Record<string, string> = {};
    let explain: string;
    if (o.tell) {
      const why = tickText(cast, two, step!);
      explain = `Yes. ${why}`;
      whyWrong[CANT] = `You can tell. ${why}`;
    } else {
      explain = `With only clues 1 and 2, ${names} could each still ${w.base(c, val)}. So you can’t tell yet.`;
      whyWrong.yes = `Clues 1 and 2 are not enough. ${names} could each still ${w.base(c, val)}.`;
    }
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's4.l5',
      skill: 's4.enough-clues',
      prompt: `${settingText(cast)} Use only clues 1 and 2. Can you tell ${cast.skin.who.charAt(0).toLowerCase()}${cast.skin.who.slice(1)} ${w.cat(c).is} ${w.obj(c, val)} yet?`,
      scene: { kind: 'clues', clues: clues.map((cl) => clueText(cast, cl)) },
      choices: [{ id: 'yes', label: 'Yes' }, CANT_YET],
      answer: o.tell ? 'yes' : CANT,
      whyWrong,
      explain,
      hint: `Use only clues 1 and 2. Could more than one ${cast.skin.noun} still ${w.base(c, val)}?`,
      ...(o.tell ? {} : { conflict: true }),
      ...(ncat === 2 ? { seconds: 120 } : {}),
    };
    return { item, cast, sol, clues, c, val };
  }
  throw new Error('enoughPuzzle: no puzzle found');
}

