/**
 * Stop 5 · Knights & Knaves (Smullyan). Knights always tell the truth; knaves always lie.
 *
 * Every answer here comes from listing cases. A puzzle with n islanders has 2^n ways to make each one a
 * knight or a knave; a way fits when every speaker's words are true for a knight and false for a knave
 * (speakerFits from ../grade). Puzzles are made from a hidden answer: each speaker gets words that fit
 * their own kind, and a puzzle is kept only when exactly one way fits.
 *
 * Explanations come from the same case lists. explainSolve() writes the "suppose it, then crash-test it"
 * steps the stop teaches: follow what the known islanders' words force, and when that stalls, suppose the
 * wrong kind for someone and follow it until someone's words break the rule. A puzzle is only used when
 * those steps reach the answer with at most one supposition, so the method on the cards always works.
 *
 * Item makers:
 *  - wordsItem()     lesson 1: what a knight's or a knave's words tell you (Yes / No / Can't tell)
 *  - whoCanSayItem() lesson 2: who could say this (Only a knight / Only a knave / Both / Neither)
 *  - supposeItem()   lesson 3: "Suppose Ava is a knight. What must Ben be?"
 *  - puzzleItem()    lessons 3-5: mark each islander (AssignItem, layout 'toggles')
 *  - andOrItem()     lesson 5: what a knave's (or knight's) "and" / "or" tells you
 *
 * Only the rng passed in is used, so the same seed always gives the same items. No he/she: names repeat.
 */
import { claimTrue, speakerFits } from '../grade';
import type { AssignItem, Choice, ChooseItem, Claim, Rng, Speaker } from '../types';

const STOP = 5;

export type Kind = 'knight' | 'knave';
export const KINDS: readonly Kind[] = ['knight', 'knave'];
export type KindMap = Record<string, Kind>;
export type Claims = Record<string, Claim>;

export const RULE = 'Knights always tell the truth. Knaves always lie.';
export const KIND_CATEGORY: AssignItem['categories'][number] = {
  id: 'kind',
  label: 'Knight or knave',
  values: [{ id: 'knight', label: 'Knight' }, { id: 'knave', label: 'Knave' }],
  oneEach: false,
};

export const flip = (k: Kind): Kind => (k === 'knight' ? 'knave' : 'knight');
/** 'a knight' / 'a knave' */
export const a = (k: Kind) => `a ${k}`;
const tf = (v: boolean) => (v ? 'true' : 'false');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unstop = (s: string) => s.replace(/[.!?]$/, '');
/** 'Ava', 'Ava and Ben', 'Ava, Ben and Cal' */
export const joinAnd = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five'];

// ---------- cases ----------

/** Every way to fill in the people not in `fixed` (2^k ways), first person changing slowest. */
export function allKinds(ids: readonly string[], fixed: Readonly<Partial<KindMap>> = {}): KindMap[] {
  let out: KindMap[] = [{}];
  for (const id of ids) {
    const f = fixed[id];
    out = out.flatMap((pre) => (f ? [{ ...pre, [id]: f }] : KINDS.map((k) => ({ ...pre, [id]: k }))));
  }
  return out;
}

/** Does every speaker fit the rule in this case? People with no words always fit. */
export function fitsAll(ids: readonly string[], claims: Readonly<Claims>, kinds: KindMap): boolean {
  return ids.every((id) => !claims[id] || speakerFits(id, claims[id], kinds));
}

/** Speakers whose words break the rule in this case, in order. */
export function breakers(ids: readonly string[], claims: Readonly<Claims>, kinds: KindMap): string[] {
  return ids.filter((id) => claims[id] && !speakerFits(id, claims[id], kinds));
}

/** Every way that fits (optionally with some people fixed). A good puzzle has exactly one. */
export function solutions(ids: readonly string[], claims: Readonly<Claims>, fixed: Readonly<Partial<KindMap>> = {}): KindMap[] {
  return allKinds(ids, fixed).filter((k) => fitsAll(ids, claims, k));
}

/** Could this speaker say these words in at least one case? ("I am a knave." never can.) */
export function sayable(ids: readonly string[], speaker: string, claim: Claim): boolean {
  return allKinds(ids).some((k) => speakerFits(speaker, claim, k));
}

/** Everyone a claim talks about. "Us" claims talk about everyone. */
export function claimRefs(c: Claim, ids: readonly string[]): string[] {
  const set = new Set<string>();
  const walk = (x: Claim) => {
    switch (x.t) {
      case 'is': set.add(x.who); break;
      case 'same': case 'diff': set.add(x.a); set.add(x.b); break;
      case 'count': ids.forEach((id) => set.add(id)); break;
      case 'not': walk(x.c); break;
      case 'and': case 'or': x.cs.forEach(walk); break;
      case 'if': walk(x.a); walk(x.b); break;
    }
  };
  walk(c);
  return ids.filter((id) => set.has(id));
}

// ---------- words ----------

export type Namer = (id: string) => string;

/** "Ava and I" / "Ava and Ben": the pair, with "I" last when the speaker is one of them. */
function pair(x: string, y: string, speaker: string, nm: Namer): string {
  if (x === speaker) return `${nm(y)} and I`;
  if (y === speaker) return `${nm(x)} and I`;
  return `${nm(x)} and ${nm(y)}`;
}

/** A claim in the speaker's own words, without the final period. `n` is the number of islanders ("us"). */
function clause(c: Claim, speaker: string, nm: Namer, n: number): string {
  switch (c.t) {
    case 'is': return c.who === speaker ? `I am ${a(c.kind)}` : `${nm(c.who)} is ${a(c.kind)}`;
    case 'same': return `${pair(c.a, c.b, speaker, nm)} are the same kind`;
    case 'diff': return `${pair(c.a, c.b, speaker, nm)} are different kinds`;
    case 'count': {
      if (c.op === 'exactly' && c.k === n) return n === 2 ? `We are both ${c.kind}s` : `We are all ${c.kind}s`;
      if (c.op === 'exactly' && c.k === 0) return `None of us is ${a(c.kind)}`;
      const lead = c.op === 'atLeast' ? 'At least' : c.op === 'atMost' ? 'At most' : 'Exactly';
      return c.k === 1 ? `${lead} one of us is ${a(c.kind)}` : `${lead} ${NUM[c.k]} of us are ${c.kind}s`;
    }
    case 'not': {
      const x = c.c;
      if (x.t === 'is') return x.who === speaker ? `I am not ${a(x.kind)}` : `${nm(x.who)} is not ${a(x.kind)}`;
      if (x.t === 'same') return `${pair(x.a, x.b, speaker, nm)} are not the same kind`;
      const inner = clause(x, speaker, nm, n);
      return `It is not true that ${/^(I|[A-Z][a-z]*) /.test(inner) && !/^(At|Exactly|None|We|If|It) /.test(inner) ? inner : inner.charAt(0).toLowerCase() + inner.slice(1)}`;
    }
    case 'and': {
      const parts = c.cs;
      const allIs = parts.every((p): p is Extract<Claim, { t: 'is' }> => p.t === 'is');
      if (allIs && parts.length >= 2) {
        const kinds = new Set(parts.map((p) => p.kind));
        const whos = parts.map((p) => p.who);
        if (kinds.size === 1 && new Set(whos).size === whos.length) {
          const kind = parts[0].kind;
          const names = whos.filter((w) => w !== speaker).map(nm);
          const all = whos.includes(speaker) ? [...names, 'I'] : names;
          return `${joinAnd(all)} are ${parts.length === 2 ? 'both' : 'all'} ${kind}s`;
        }
      }
      return parts.map((p) => clause(p, speaker, nm, n)).join(' and ');
    }
    case 'or': return c.cs.map((p) => clause(p, speaker, nm, n)).join(' or ');
    case 'if': return `If ${lowerLead(clause(c.a, speaker, nm, n))}, then ${lowerLead(clause(c.b, speaker, nm, n))}`;
  }
}

/** Lower-case a clause's first word unless it is a name or "I". */
function lowerLead(s: string): string {
  return /^(At|Exactly|None|We|It) /.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** A claim as the speaker says it: "Ava and I are the same kind." */
export function claimText(c: Claim, speaker: string, nm: Namer, n: number): string {
  return `${cap(clause(c, speaker, nm, n))}.`;
}

/** "Ava is a knight and Ben is a knave" (no period). */
export function kindsText(ids: readonly string[], kinds: KindMap, nm: Namer): string {
  return joinAnd(ids.map((id) => `${nm(id)} is ${a(kinds[id])}`));
}

/** "Ava a knave and Ben a knight" (no period). */
const withText = (ids: readonly string[], kinds: Partial<KindMap>, nm: Namer) =>
  joinAnd(ids.filter((id) => kinds[id]).map((id) => `${nm(id)} ${a(kinds[id]!)}`));

/** "Ben would be a knight saying something false" (no period): why a case breaks the rule. */
export const breakText = (who: string, kinds: KindMap, nm: Namer) =>
  `${nm(who)} would be ${a(kinds[who])} saying something ${tf(kinds[who] === 'knave')}`;

// ---------- explaining a solve ----------

type Step = { add: KindMap; line: string } | { crash: string };

/**
 * One step of reasoning from what is known, or null when no single speaker settles anything new.
 * Known speakers first (the one just supposed goes first): their words must be true (knight) or false
 * (knave), which can pin down others or crash. Then unknown speakers whose words could only fit one kind.
 */
function step(ids: readonly string[], claims: Readonly<Claims>, known: Readonly<Partial<KindMap>>, nm: Namer, supposed?: string): Step | null {
  const cases = allKinds(ids, known);
  const order = supposed ? [supposed, ...ids.filter((x) => x !== supposed)] : [...ids];
  for (const s of order) {
    const c = claims[s];
    const ks = known[s];
    if (!c || !ks) continue;
    const need = ks === 'knight';
    const good = cases.filter((k) => claimTrue(c, k) === need);
    const lead = s === supposed ? `Then ${nm(s)}’s words are ${tf(need)}.` : `${nm(s)} is ${a(ks)}, so ${nm(s)}’s words are ${tf(need)}.`;
    if (!good.length) {
      const lead2 = s === supposed ? `Then ${nm(s)}’s words must be ${tf(need)}.` : `${nm(s)} is ${a(ks)}, so ${nm(s)}’s words must be ${tf(need)}.`;
      return { crash: `${lead2} But with ${withText(claimRefs(c, ids), known, nm)}, they are ${tf(!need)}.` };
    }
    const derived = ids.filter((q) => !known[q] && good.every((k) => k[q] === good[0][q]));
    if (derived.length) {
      const add: KindMap = {};
      for (const q of derived) add[q] = good[0][q];
      return { add, line: `${lead} So ${kindsText(derived, add, nm)}.` };
    }
  }
  for (const s of ids) {
    const c = claims[s];
    if (!c || known[s]) continue;
    const valsFor = (v: Kind) => new Set(cases.filter((k) => k[s] === v).map((k) => claimTrue(c, k)));
    const breaksAs = (v: Kind) => {
      const vals = valsFor(v);
      return vals.size === 1 && vals.has(v === 'knave');
    };
    const bk = breaksAs('knight'), bv = breaksAs('knave');
    if (bk && bv) {
      return { crash: `If ${nm(s)} were a knight, ${nm(s)} would be a knight saying something false. If ${nm(s)} were a knave, ${nm(s)} would be a knave saying something true.` };
    }
    if (bk || bv) {
      const v: Kind = bk ? 'knight' : 'knave';
      return {
        add: { [s]: flip(v) },
        line: `If ${nm(s)} were ${a(v)}, ${nm(s)} would be ${a(v)} saying something ${tf(v === 'knave')}. So ${nm(s)} is ${a(flip(v))}.`,
      };
    }
  }
  return null;
}

/** Follow steps until nothing new follows or a case crashes. */
function follow(ids: readonly string[], claims: Readonly<Claims>, start: Readonly<Partial<KindMap>>, nm: Namer, supposed?: string) {
  let known: Partial<KindMap> = { ...start };
  const lines: string[] = [];
  let sup = supposed;
  for (let i = 0; i <= ids.length + 1; i++) {
    const r = step(ids, claims, known, nm, sup);
    sup = undefined;
    if (!r) break;
    if ('crash' in r) return { known, lines: [...lines, r.crash], crash: true };
    lines.push(r.line);
    known = { ...known, ...r.add };
  }
  return { known, lines, crash: false };
}

export interface Solve {
  /** The explanation, one sentence per entry. */
  lines: string[];
  /** How many "Suppose …" steps it needed. */
  supposes: number;
  /** Who was supposed, in order. */
  supposed: string[];
}

/**
 * Explain the one answer with the stop's method, or null when single-clue steps and suppositions of
 * one person at a time do not reach it.
 */
export function explainSolve(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): Solve | null {
  const lines: string[] = [];
  const supposed: string[] = [];
  let r = follow(ids, claims, {}, nm);
  if (r.crash) return null;
  lines.push(...r.lines);
  let known = r.known;
  while (ids.some((id) => !known[id])) {
    let best: { p: string; lines: string[] } | null = null;
    for (const p of ids) {
      if (known[p]) continue;
      const t = follow(ids, claims, { ...known, [p]: flip(answer[p]) }, nm, p);
      if (t.crash && (!best || t.lines.length < best.lines.length)) best = { p, lines: t.lines };
    }
    if (!best) return null;
    supposed.push(best.p);
    lines.push(`Suppose ${nm(best.p)} is ${a(flip(answer[best.p]))}.`, ...best.lines, `That guess crashes, so ${nm(best.p)} is ${a(answer[best.p])}.`);
    r = follow(ids, claims, { ...known, [best.p]: answer[best.p] }, nm);
    if (r.crash) return null;
    lines.push(...r.lines);
    known = r.known;
  }
  if (ids.some((id) => known[id] !== answer[id])) return null;
  return { lines, supposes: supposed.length, supposed };
}

// ---------- skins ----------

export type SkinId = 'island' | 'elves' | 'wizards' | 'letters';
export type SkinKind = 'everyday' | 'fantasy' | 'abstract';

/** A fact an islander can state. '{n}' is the speaker's name. yes/no are plain sentences without a period. */
export interface Fact {
  say: string;
  sayNot: string;
  ask: string;
  yes: string;
  no: string;
}

export interface Skin {
  id: SkinId;
  kind: SkinKind;
  /** Name pool. No two names share a first letter. */
  pool: readonly string[];
  /** Puzzle openings; '{list}' becomes the names. */
  settings: readonly string[];
  /** First mention of a name in a lesson 1, 2 or 5 question: 'Mira the elf', 'Islander A'. */
  intro(name: string): string;
  /** Lesson 1 facts. */
  facts: readonly Fact[];
  /** Lesson 2 speaker: 'Someone'. */
  someone: string;
}

const PEOPLE = ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana', 'Jin', 'Kofi', 'Lena', 'Mo', 'Nia', 'Omar', 'Pia', 'Raj', 'Sol', 'Tia', 'Uma', 'Vic', 'Wes', 'Zoe'];

const f = (say: string, sayNot: string, ask: string, yes: string, no: string): Fact => ({ say, sayNot, ask, yes, no });

export const SKINS: Record<SkinId, Skin> = {
  island: {
    id: 'island', kind: 'everyday', pool: PEOPLE,
    settings: ['{list} live on Riddle Island.', '{list} sell fruit at the Riddle Island market.', '{list} meet you at the Riddle Island dock.'],
    intro: (x) => x,
    someone: 'Someone',
    facts: [
      f('I have a cat.', 'I do not have a cat.', 'Does {n} have a cat?', '{n} has a cat', '{n} does not have a cat'),
      f('I can swim.', 'I cannot swim.', 'Can {n} swim?', '{n} can swim', '{n} cannot swim'),
      f('I have a red bike.', 'I do not have a red bike.', 'Does {n} have a red bike?', '{n} has a red bike', '{n} does not have a red bike'),
      f('I ate soup for lunch.', 'I did not eat soup for lunch.', 'Did {n} eat soup for lunch?', '{n} ate soup for lunch', '{n} did not eat soup for lunch'),
      f('I have a sister.', 'I do not have a sister.', 'Does {n} have a sister?', '{n} has a sister', '{n} does not have a sister'),
      f('The shop is open today.', 'The shop is not open today.', 'Is the shop open today?', 'the shop is open today', 'the shop is not open today'),
    ],
  },
  elves: {
    id: 'elves', kind: 'fantasy', pool: ['Brin', 'Elm', 'Fenn', 'Ivo', 'Lark', 'Mira', 'Nell', 'Orla', 'Rook', 'Sage', 'Tam', 'Wren'],
    settings: ['The elves {list} live in Mistwood.', 'The elves {list} guard the Moon Gate.'],
    intro: (x) => `${x} the elf`,
    someone: 'An elf',
    facts: [
      f('I can fly.', 'I cannot fly.', 'Can {n} fly?', '{n} can fly', '{n} cannot fly'),
      f('I have a magic ring.', 'I do not have a magic ring.', 'Does {n} have a magic ring?', '{n} has a magic ring', '{n} does not have a magic ring'),
      f('The gold is in the cave.', 'The gold is not in the cave.', 'Is the gold in the cave?', 'the gold is in the cave', 'the gold is not in the cave'),
      f('The dragon is asleep.', 'The dragon is not asleep.', 'Is the dragon asleep?', 'the dragon is asleep', 'the dragon is not asleep'),
    ],
  },
  wizards: {
    id: 'wizards', kind: 'fantasy', pool: ['Bram', 'Cato', 'Dara', 'Gwen', 'Juno', 'Kip', 'Nox', 'Pell', 'Rune', 'Vesta', 'Zed'],
    settings: ['The wizards {list} live in the Tall Tower.', 'The wizards {list} meet at the Star Bridge.'],
    intro: (x) => `${x} the wizard`,
    someone: 'A wizard',
    facts: [
      f('I found a dragon egg.', 'I did not find a dragon egg.', 'Did {n} find a dragon egg?', '{n} found a dragon egg', '{n} did not find a dragon egg'),
      f('I can talk to owls.', 'I cannot talk to owls.', 'Can {n} talk to owls?', '{n} can talk to owls', '{n} cannot talk to owls'),
      f('The potion is blue.', 'The potion is not blue.', 'Is the potion blue?', 'the potion is blue', 'the potion is not blue'),
      f('The tower door is locked.', 'The tower door is not locked.', 'Is the tower door locked?', 'the tower door is locked', 'the tower door is not locked'),
    ],
  },
  letters: {
    id: 'letters', kind: 'abstract', pool: ['A', 'B', 'C', 'D', 'E'],
    settings: ['{list} are islanders.'],
    intro: (x) => `Islander ${x}`,
    someone: 'An islander',
    facts: [
      f('The box is red.', 'The box is not red.', 'Is the box red?', 'the box is red', 'the box is not red'),
      f('The number is even.', 'The number is not even.', 'Is the number even?', 'the number is even', 'the number is not even'),
      f('The key is in box 1.', 'The key is not in box 1.', 'Is the key in box 1?', 'the key is in box 1', 'the key is not in box 1'),
      f('The light is on.', 'The light is not on.', 'Is the light on?', 'the light is on', 'the light is not on'),
    ],
  },
};

export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const FANTASY: readonly SkinId[] = ['elves', 'wizards'];

export interface Cast {
  ids: string[];
  nm: Namer;
  /** 'Ava, Ben and Cal live on Riddle Island.' */
  setting: string;
}

/** n islanders with different first letters. Letters stay in A, B, C order. */
export function makeCast(rng: Rng, skin: SkinId, n: number): Cast {
  const s = SKINS[skin];
  const names = skin === 'letters' ? s.pool.slice(0, n) : rng.shuffle(s.pool).slice(0, n);
  const ids = names.map((x) => x.toLowerCase());
  const byId = new Map(ids.map((id, i) => [id, names[i]]));
  const nm: Namer = (id) => byId.get(id) ?? id;
  return { ids, nm, setting: rng.pick(s.settings).replace('{list}', joinAnd(names)) };
}

/** A speakers scene in the same order as the people. No words: an empty `says` (the screen shows "says nothing"). */
export function speakersScene(ids: readonly string[], claims: Readonly<Claims>, nm: Namer): { kind: 'speakers'; speakers: Speaker[]; rule: string } {
  return {
    kind: 'speakers',
    speakers: ids.map((id) => ({ id, name: nm(id), says: claims[id] ? claimText(claims[id], id, nm, ids.length) : '' })),
    rule: RULE,
  };
}

// ---------- claim menus ----------

const is = (who: string, kind: Kind): Claim => ({ t: 'is', who, kind });

export type ClaimPool = 'basic' | 'andor';

/** Everything speaker s might say in an n-islander puzzle, with weights. */
export function candidates(s: string, ids: readonly string[], pool: ClaimPool): { c: Claim; w: number }[] {
  const others = ids.filter((x) => x !== s);
  const out: { c: Claim; w: number }[] = [];
  for (const o of others) for (const k of KINDS) out.push({ c: is(o, k), w: 3 });
  out.push({ c: is(s, 'knight'), w: 0.4 });
  for (const o of others) out.push({ c: { t: 'same', a: s, b: o }, w: 2 }, { c: { t: 'diff', a: s, b: o }, w: 2 });
  if (others.length === 2) {
    const [x, y] = others;
    out.push({ c: { t: 'same', a: x, b: y }, w: 1 }, { c: { t: 'diff', a: x, b: y }, w: 1 });
  }
  const n = ids.length;
  out.push(
    { c: { t: 'count', op: 'atLeast', k: 1, kind: 'knave' }, w: 2 },
    { c: { t: 'count', op: 'atLeast', k: 1, kind: 'knight' }, w: 1 },
    { c: { t: 'count', op: 'exactly', k: 1, kind: 'knight' }, w: 2 },
    { c: { t: 'count', op: 'exactly', k: n, kind: 'knave' }, w: 1.5 },
  );
  if (n === 3) {
    out.push(
      { c: { t: 'count', op: 'exactly', k: 1, kind: 'knave' }, w: 1 },
      { c: { t: 'count', op: 'exactly', k: 2, kind: 'knight' }, w: 0.5 },
    );
  }
  if (pool === 'andor') out.push(...andOrCandidates(s, ids).map((c) => ({ c, w: 3 })));
  return out;
}

function andOrCandidates(s: string, ids: readonly string[]): Claim[] {
  const others = ids.filter((x) => x !== s);
  const out: Claim[] = [];
  for (const o of others) {
    for (const k1 of KINDS) for (const k2 of KINDS) {
      out.push({ t: 'and', cs: [is(s, k1), is(o, k2)] });
      if (!(k1 === 'knight' && k2 === 'knight')) out.push({ t: 'or', cs: [is(s, k1), is(o, k2)] });
    }
  }
  if (others.length === 2) {
    const [x, y] = others;
    for (const k of KINDS) out.push({ t: 'and', cs: [is(x, k), is(y, k)] }, { t: 'or', cs: [is(x, k), is(y, k)] });
  }
  return out;
}

const isAndOr = (c: Claim) => c.t === 'and' || c.t === 'or';

function weighted<T>(rng: Rng, xs: readonly { c: T; w: number }[]): T {
  const total = xs.reduce((n, x) => n + x.w, 0);
  let r = rng.next() * total;
  for (const x of xs) {
    r -= x.w;
    if (r < 0) return x.c;
  }
  return xs[xs.length - 1].c;
}

// ---------- puzzles (AssignItem) ----------

/** Sentences in explanation lines (each line holds one or two). */
export const sentenceCount = (lines: readonly string[]) => lines.join(' ').split(/(?<=[.!?])\s+/).filter(Boolean).length;

export interface KnightPuzzle {
  ids: string[];
  claims: Claims;
  answer: KindMap;
  solve: Solve;
}

export interface PuzzleOpts {
  n: 2 | 3;
  pool: ClaimPool;
  /** Most sentences the explanation may use (before the closing "That leaves one answer" line). */
  maxSentences?: number;
  /** Let one islander say nothing now and then (only when the answer is still the only one). */
  silent?: boolean;
}

/** A puzzle with exactly one answer that the stop's method can explain. */
export function makePuzzle(rng: Rng, ids: readonly string[], nm: Namer, o: PuzzleOpts): KnightPuzzle {
  const maxSentences = o.maxSentences ?? (o.n === 2 ? 9 : 12);
  for (let attempt = 0; attempt < 4000; attempt++) {
    const answer: KindMap = {};
    for (const id of ids) answer[id] = rng.pick(KINDS);
    const claims: Claims = {};
    for (const s of ids) {
      const fit = candidates(s, ids, o.pool).filter((x) => speakerFits(s, x.c, answer));
      claims[s] = weighted(rng, fit);
    }
    if (o.pool === 'andor' && !ids.some((id) => isAndOr(claims[id]))) continue;
    if (o.silent && rng.chance(0.25)) {
      const quiet = rng.pick(ids);
      if (o.pool !== 'andor' || isAndOr(claims[quiet]) === false) {
        const rest = { ...claims };
        delete rest[quiet];
        if (solutions(ids, rest).length === 1) delete claims[quiet];
      }
    }
    const sols = solutions(ids, claims);
    if (sols.length !== 1) continue;
    // No two islanders may say the very same words.
    const texts = ids.filter((id) => claims[id]).map((id) => claimText(claims[id], id, nm, ids.length));
    if (new Set(texts).size !== texts.length) continue;
    const solve = explainSolve(ids, claims, answer, nm);
    if (!solve || solve.supposes > 1 || sentenceCount(solve.lines) > maxSentences) continue;
    return { ids: [...ids], claims, answer, solve };
  }
  throw new Error('makePuzzle: no puzzle found');
}

export interface Built<I> {
  item: I;
  cast: Cast;
}

export interface PuzzleItemOpts {
  id: string;
  skin: SkinId;
  n: 2 | 3;
  pool?: ClaimPool;
  lesson: string;
  skill: string;
}

export const PUZZLE_HINT = 'Pick one islander. Suppose that one is a knave, and follow what that means. Does anyone break the rule?';

/** Mark each islander as a knight or a knave. */
export function puzzleItem(rng: Rng, o: PuzzleItemOpts): Built<AssignItem> & { puzzle: KnightPuzzle } {
  const cast = makeCast(rng, o.skin, o.n);
  const { ids, nm } = cast;
  const p = makePuzzle(rng, ids, nm, { n: o.n, pool: o.pool ?? 'basic', silent: true });
  const quiet = ids.filter((id) => !p.claims[id]);
  const item: AssignItem = {
    kind: 'assign',
    id: o.id,
    stop: STOP,
    lesson: o.lesson,
    skill: o.skill,
    layout: 'toggles',
    prompt: `${cast.setting} Each one is a knight or a knave.${quiet.length ? ` ${joinAnd(quiet.map(nm))} ${quiet.length === 1 ? 'says' : 'say'} nothing.` : ''} Mark each one.`,
    scene: speakersScene(ids, p.claims, nm),
    people: ids.map((id) => ({ id, label: nm(id) })),
    categories: [KIND_CATEGORY],
    answer: Object.fromEntries(ids.map((id) => [id, { kind: p.answer[id] }])),
    claims: p.claims,
    explain: [...p.solve.lines, `That leaves one answer: ${kindsText(ids, p.answer, nm)}.`].join(' '),
    hint: PUZZLE_HINT,
  };
  if (o.n === 3) item.seconds = 150;
  return { item, cast, puzzle: p };
}

// ---------- lesson 3: suppose it ----------

export type SupposeAnswer = 'knight' | 'knave' | 'cant' | 'crash';
export const SUPPOSE_CHOICES: Choice[] = [
  { id: 'knight', label: 'Knight' },
  { id: 'knave', label: 'Knave' },
  { id: 'cant', label: 'Can’t tell' },
  { id: 'crash', label: 'That guess crashes' },
];

export interface SupposeOpts {
  id: string;
  skin: SkinId;
  target?: SupposeAnswer;
  conflict?: boolean;
}

/** "Suppose Ava is a knight. What must Ben be?" Two islanders; both speak; at least one way fits overall. */
export function supposeItem(rng: Rng, o: SupposeOpts): Built<ChooseItem> & { ids: string[]; claims: Claims; who: string; other: string; kind: Kind; fits: Kind[] } {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const cast = makeCast(rng, o.skin, 2);
    const { ids, nm } = cast;
    const claims: Claims = {};
    for (const s of ids) claims[s] = weighted(rng, candidates(s, ids, 'basic'));
    if (!solutions(ids, claims).length) continue;
    const [t0, t1] = ids.map((id) => claimText(claims[id], id, nm, 2));
    if (t0 === t1) continue;
    const who = rng.pick(ids);
    const other = ids.find((x) => x !== who)!;
    const kind = rng.pick(KINDS);
    const fits = KINDS.filter((v) => fitsAll(ids, claims, { [who]: kind, [other]: v }));
    const ans: SupposeAnswer = fits.length === 2 ? 'cant' : fits.length === 0 ? 'crash' : fits[0];
    if (o.target && ans !== o.target) continue;

    const X = nm(who), Y = nm(other);
    const caseLine = (v: Kind) => {
      const kinds: KindMap = { [who]: kind, [other]: v };
      const b = breakers(ids, claims, kinds);
      return b.length ? `If ${Y} is ${a(v)}, ${breakText(b[0], kinds, nm)}.` : `If ${Y} is ${a(v)}, everyone fits the rule.`;
    };
    const end = ans === 'cant'
      ? `Both cases fit, so you can’t tell what ${Y} is.`
      : ans === 'crash'
        ? `Both cases break the rule, so the guess crashes. ${X} can’t be ${a(kind)}.`
        : `So ${Y} must be ${a(ans)}.`;
    const explain = `Suppose ${X} is ${a(kind)}. ${caseLine('knight')} ${caseLine('knave')} ${end}`;
    const whyWrong: Record<string, string> = {};
    for (const c of SUPPOSE_CHOICES) {
      if (c.id === ans) continue;
      if (c.id === 'cant') {
        whyWrong.cant = ans === 'crash'
          ? `Can’t tell would mean both cases fit. Here both cases break the rule, so the guess crashes. ${X} can’t be ${a(kind)}.`
          : `You can tell. Only one case works. ${caseLine(ans === 'knight' ? 'knave' : 'knight')}`;
      }
      else if (c.id === 'crash') whyWrong.crash = `The guess does not crash. ${caseLine(fits[0])}`;
      else if (ans === 'cant') whyWrong[c.id] = `${Y} could be ${a(c.id as Kind)}, but ${Y} could also be ${a(flip(c.id as Kind))}. Both cases fit.`;
      else whyWrong[c.id] = caseLine(c.id as Kind);
    }
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's5.l3',
      skill: 's5.suppose',
      prompt: `${cast.setting} Suppose ${X} is ${a(kind)}. What must ${Y} be?`,
      scene: speakersScene(ids, claims, nm),
      choices: SUPPOSE_CHOICES,
      answer: ans,
      explain,
      whyWrong,
      hint: `Keep ${X} as ${a(kind)}. Try ${Y} as a knight, then as a knave. Does anyone break the rule?`,
    };
    if (o.conflict) item.conflict = true;
    return { item, cast, ids, claims, who, other, kind, fits };
  }
  throw new Error('supposeItem: no item found');
}

// ---------- lesson 1: what the words tell you ----------

export type WordsType = 'fact' | 'kindFromFact' | 'other' | 'speakerFromOther';

export interface WordsOpts {
  id: string;
  skin: SkinId;
  type: WordsType;
  /** The speaker's kind, or 'unknown'. fact / other only. */
  speaker?: Kind | 'unknown';
  /** fact / kindFromFact: the speaker says the "not" version. */
  negative?: boolean;
  /** kindFromFact: the fact is stated (true or false), or not known. */
  truth?: boolean | 'unknown';
}

const YES_NO: Choice[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'cant', label: 'Can’t tell' }];
const KIND_CHOICES: Choice[] = [{ id: 'knight', label: 'Knight' }, { id: 'knave', label: 'Knave' }, { id: 'cant', label: 'Can’t tell' }];

/** Lesson 1. Cases are listed for the unknowns (the fact, or the other islander, and the speaker). */
export function wordsItem(rng: Rng, o: WordsOpts): Built<ChooseItem> & { answerSet: string[] } {
  const skin = SKINS[o.skin];
  const cast = makeCast(rng, o.skin, 2);
  const [sp, ot] = cast.ids;
  const nm = cast.nm;
  const S = nm(sp), O = nm(ot);
  const who = rng.pick(['knight', 'knave'] as const);
  const spk = o.speaker ?? rng.pick(KINDS);
  const base = { kind: 'choose' as const, id: o.id, stop: STOP, lesson: 's5.l1', skill: 's5.words' };
  let item: ChooseItem;
  let answerSet: string[];

  if (o.type === 'fact' || o.type === 'kindFromFact') {
    const fact = rng.pick(skin.facts);
    const fill = (t: string) => t.replace('{n}', S);
    const neg = !!o.negative;
    const said = neg ? fact.sayNot : fact.say;
    const scene = { kind: 'speakers' as const, speakers: [{ id: sp, name: S, says: said }], rule: RULE };
    // Cases: p = is the fact true; k = the speaker's kind. The words are true when p !== neg.
    const cases = [true, false].flatMap((p) => KINDS.map((k) => ({ p, k }))).filter(({ p, k }) => (k === 'knight') === (p !== neg));
    const factText = (p: boolean) => fill(p ? fact.yes : fact.no);
    if (o.type === 'fact') {
      const known = spk === 'unknown' ? cases : cases.filter((c) => c.k === spk);
      const ps = [...new Set(known.map((c) => c.p))];
      const ans = ps.length === 2 ? 'cant' : ps[0] ? 'yes' : 'no';
      answerSet = ps.map((p) => (p ? 'yes' : 'no'));
      const opening = spk === 'unknown' ? `No one knows if ${skin.intro(S)} is a knight or a knave.` : `${skin.intro(S)} is ${a(spk)}.`;
      const prompt = `${opening} ${S} says, “${unstop(said)}.” ${fill(fact.ask)}`;
      const pOf = (k: Kind) => cases.find((c) => c.k === k)!.p;
      let explain: string;
      const whyWrong: Record<string, string> = {};
      if (spk === 'unknown') {
        explain = `If ${S} is a knight, ${factText(pOf('knight'))}. If ${S} is a knave, ${factText(pOf('knave'))}. You don’t know which one ${S} is, so you can’t tell.`;
        for (const id of ['yes', 'no']) {
          const other = cases.find((c) => (c.p ? 'yes' : 'no') !== id)!;
          whyWrong[id] = `You don’t know if ${S} is a knight or a knave. If ${S} is ${a(other.k)}, ${factText(other.p)}.`;
        }
      } else {
        const p = ps[0];
        const wordsTrue = spk === 'knight';
        explain = `${S} is ${a(spk)}, so “${unstop(said)}” is ${tf(wordsTrue)}. So ${factText(p)}.`;
        const wrong = p ? 'no' : 'yes';
        whyWrong[wrong] = wordsTrue
          ? `${S} is a knight, and a knight’s words are true. So ${factText(p)}.`
          : `That is what ${S}’s words say. But ${S} is a knave, so the words are false.`;
        whyWrong.cant = `You can tell. ${S} is ${a(spk)}, so you know ${S}’s words are ${tf(wordsTrue)}.`;
      }
      item = { ...base, prompt: cap(prompt), scene, choices: YES_NO, answer: ans, explain: cap(explain), whyWrong: capAll(whyWrong), hint: spk === 'unknown' ? `Do you know if ${S} tells the truth?` : `Does ${a(spk)} tell the truth or lie?` };
      if (spk === 'knave' && neg) item.conflict = true;
    } else {
      const truth = o.truth ?? rng.pick([true, false] as const);
      const known = truth === 'unknown' ? cases : cases.filter((c) => c.p === truth);
      const ks = [...new Set(known.map((c) => c.k))];
      const ans = ks.length === 2 ? 'cant' : ks[0];
      answerSet = ks;
      // The first mention of the speaker gets the skin's intro ('Kip the wizard did not find a dragon egg.').
      const aboutSpeaker = fact.yes.includes('{n}');
      const opening = truth === 'unknown' ? '' : `${cap((truth ? fact.yes : fact.no).replace('{n}', skin.intro(S)))}. `;
      const prompt = `${opening}${opening && aboutSpeaker ? S : skin.intro(S)} says, “${unstop(said)}.” Is ${S} a knight or a knave?`;
      let explain: string;
      const whyWrong: Record<string, string> = {};
      if (truth === 'unknown') {
        const kOf = (p: boolean) => cases.find((c) => c.p === p)!.k;
        explain = `If ${factText(true)}, ${S} is ${a(kOf(true))}. If ${factText(false)}, ${S} is ${a(kOf(false))}. You don’t know which, so you can’t tell.`;
        for (const k of KINDS) {
          const other = cases.find((c) => c.k !== k)!;
          whyWrong[k] = `You don’t know if ${factText(true)}. If ${factText(other.p)}, ${S} is ${a(other.k)}.`;
        }
      } else {
        const wordsTrue = truth !== neg;
        explain = `${cap(factText(truth))}, so “${unstop(said)}” is ${tf(wordsTrue)}. ${wordsTrue ? 'Only a knight says true things' : 'Only a knave says false things'}, so ${S} is ${a(ans as Kind)}.`;
        whyWrong[flip(ans as Kind)] = `${cap(factText(truth))}. So ${S}’s words are ${tf(wordsTrue)}, and ${wordsTrue ? 'knights tell the truth' : 'knaves lie'}.`;
        whyWrong.cant = `You can tell. You know ${factText(truth)}, so you know if ${S}’s words are true.`;
      }
      item = { ...base, prompt: cap(prompt), scene, choices: KIND_CHOICES, answer: ans, explain: cap(explain), whyWrong: capAll(whyWrong), hint: `Are ${S}’s words true or false?` };
    }
    return { item, cast, answerSet };
  }

  // other / speakerFromOther: the speaker says what kind the other islander is.
  const claim = is(ot, who);
  const said = claimText(claim, sp, nm, 2);
  const scene = speakersScene([sp], { [sp]: claim }, nm);
  const cases = allKinds([sp, ot]).filter((k) => speakerFits(sp, claim, k));
  if (o.type === 'other') {
    const known = spk === 'unknown' ? cases : cases.filter((k) => k[sp] === spk);
    const ks = [...new Set(known.map((k) => k[ot]))];
    const ans = ks.length === 2 ? 'cant' : ks[0];
    answerSet = ks;
    const opening = spk === 'unknown' ? `No one knows if ${skin.intro(S)} is a knight or a knave.` : `${skin.intro(S)} is ${a(spk)}.`;
    const prompt = `${opening} ${S} says, “${unstop(said)}.” Is ${O} a knight or a knave?`;
    let explain: string;
    const whyWrong: Record<string, string> = {};
    if (spk === 'unknown') {
      const oOf = (k: Kind) => cases.find((c) => c[sp] === k)![ot];
      explain = `If ${S} is a knight, ${O} is ${a(oOf('knight'))}. If ${S} is a knave, ${O} is ${a(oOf('knave'))}. You don’t know which one ${S} is, so you can’t tell.`;
      for (const k of KINDS) {
        const other = cases.find((c) => c[ot] !== k)!;
        whyWrong[k] = `You don’t know if ${S} is a knight or a knave. If ${S} is ${a(other[sp])}, ${O} is ${a(other[ot])}.`;
      }
    } else {
      const wordsTrue = spk === 'knight';
      explain = `${S} is ${a(spk)}, so “${unstop(said)}” is ${tf(wordsTrue)}. So ${O} is ${a(ans as Kind)}.`;
      whyWrong[flip(ans as Kind)] = wordsTrue
        ? `${S} is a knight, and a knight’s words are true. So ${O} is ${a(ans as Kind)}.`
        : `That is what ${S}’s words say. But ${S} is a knave, so the words are false.`;
      whyWrong.cant = `You can tell. ${S} is ${a(spk)}, so you know ${S}’s words are ${tf(wordsTrue)}.`;
    }
    item = { ...base, prompt, scene, choices: KIND_CHOICES, answer: ans, explain, whyWrong, hint: spk === 'unknown' ? `Do you know if ${S} tells the truth?` : `Does ${a(spk)} tell the truth or lie?` };
    if (spk === 'knave') item.conflict = true;
    return { item, cast, answerSet };
  }
  // speakerFromOther: the other islander's kind is known; what is the speaker?
  const otk = rng.pick(KINDS);
  const known = cases.filter((k) => k[ot] === otk);
  const ks = [...new Set(known.map((k) => k[sp]))];
  const ans = ks[0];
  answerSet = ks;
  const wordsTrue = claimTrue(claim, { [sp]: 'knight', [ot]: otk });
  const prompt = `${skin.intro(O)} is ${a(otk)}. ${skin.intro(S)} says, “${unstop(said)}.” Is ${S} a knight or a knave?`;
  const explain = `${O} is ${a(otk)}, so “${unstop(said)}” is ${tf(wordsTrue)}. ${wordsTrue ? 'Only a knight says true things' : 'Only a knave says false things'}, so ${S} is ${a(ans)}.`;
  const whyWrong: Record<string, string> = {
    [flip(ans)]: `${O} is ${a(otk)}. So ${S}’s words are ${tf(wordsTrue)}, and ${wordsTrue ? 'knights tell the truth' : 'knaves lie'}.`,
    cant: `You can tell. You know ${O} is ${a(otk)}, so you know if ${S}’s words are true.`,
  };
  item = { ...base, prompt, scene, choices: KIND_CHOICES, answer: ans, explain, whyWrong, hint: `Are ${S}’s words true or false?` };
  return { item, cast, answerSet };
}

const capAll = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, cap(v)]));

// ---------- lesson 2: who could say it? ----------

export type SayAnswer = 'knight' | 'knave' | 'both' | 'neither';
export const SAY_CHOICES: Choice[] = [
  { id: 'knight', label: 'Only a knight' },
  { id: 'knave', label: 'Only a knave' },
  { id: 'both', label: 'Both' },
  { id: 'neither', label: 'Neither' },
];

/** A known true or false sentence (like Stop 1's sentence bank). */
export const KNOWN_FACTS: readonly { text: string; truth: boolean }[] = [
  { text: 'A week has seven days.', truth: true },
  { text: 'Two plus two is four.', truth: true },
  { text: 'A triangle has three sides.', truth: true },
  { text: 'Ice is cold.', truth: true },
  { text: 'A week has ten days.', truth: false },
  { text: 'Two plus two is five.', truth: false },
  { text: 'A triangle has four sides.', truth: false },
  { text: 'Snow is hot.', truth: false },
];

export type SayType = 'self' | 'fact' | 'partner';

export interface SayOpts {
  id: string;
  skin: SkinId;
  type: SayType;
  /** self: "I am a knight." or "I am a knave." */
  selfKind?: Kind;
  target?: SayAnswer;
}

/** The speaker's id in lesson 2 items. */
export const ME = 'me';

const sayAnswer = (knight: boolean, knave: boolean): SayAnswer => (knight && knave ? 'both' : knight ? 'knight' : knave ? 'knave' : 'neither');

/**
 * Lesson 2: could a knight say it? Could a knave? The words are worked out as if a knight said them,
 * then as if a knave did. A partner's kind, when the words name one, is given in the question.
 */
export function whoCanSayItem(rng: Rng, o: SayOpts): Built<ChooseItem> & { claim?: Claim; partner?: string; partnerKind?: Kind; truthAs: Record<Kind, boolean> } {
  const skin = SKINS[o.skin];
  for (let attempt = 0; attempt < 500; attempt++) {
    const cast = makeCast(rng, o.skin, 1);
    const partner = cast.ids[0];
    const P = cast.nm(partner);
    const nm: Namer = (id) => (id === ME ? skin.someone : cast.nm(id));
    let words: string;
    let truthAs: Record<Kind, boolean>;
    let opening = '';
    let claim: Claim | undefined;
    let partnerKind: Kind | undefined;
    if (o.type === 'fact') {
      const fact = rng.pick(KNOWN_FACTS);
      words = fact.text;
      truthAs = { knight: fact.truth, knave: fact.truth };
    } else if (o.type === 'self') {
      claim = is(ME, o.selfKind ?? rng.pick(KINDS));
      words = claimText(claim, ME, nm, 1);
      truthAs = { knight: claimTrue(claim, { [ME]: 'knight' }), knave: claimTrue(claim, { [ME]: 'knave' }) };
    } else {
      partnerKind = rng.pick(KINDS);
      // No "us" words here: the question never says who "us" would be.
      const menu: Claim[] = [
        { t: 'same', a: ME, b: partner },
        { t: 'diff', a: ME, b: partner },
        is(partner, 'knight'),
        is(partner, 'knave'),
        { t: 'and', cs: [is(ME, 'knight'), is(partner, 'knight')] },
        { t: 'and', cs: [is(ME, 'knave'), is(partner, 'knave')] },
      ];
      claim = rng.pick(menu);
      words = claimText(claim, ME, nm, 2);
      const as = (k: Kind) => claimTrue(claim!, { [ME]: k, [partner]: partnerKind! });
      truthAs = { knight: as('knight'), knave: as('knave') };
      opening = `${skin.intro(P)} is ${a(partnerKind)}. `;
    }
    const canKnight = truthAs.knight;
    const canKnave = !truthAs.knave;
    const ans = sayAnswer(canKnight, canKnave);
    if (o.target && ans !== o.target) continue;
    const lineFor = (k: Kind) => {
      const v = truthAs[k];
      const ok = k === 'knight' ? v : !v;
      const works = k === 'knave' && canKnight ? 'That works too.' : 'That works.';
      return `If ${a(k)} said it, the words would be ${tf(v)}. ${ok ? works : `${k === 'knight' ? 'Knights never lie' : 'Knaves never tell the truth'}, so ${a(k)} can’t.`}`;
    };
    const endFor: Record<SayAnswer, string> = {
      knight: 'So only a knight could say it.',
      knave: 'So only a knave could say it.',
      both: 'So both could say it.',
      neither: 'So no one on the island could say it.',
    };
    const explain = `${lineFor('knight')} ${lineFor('knave')} ${endFor[ans]}`;
    const whyWrong: Record<string, string> = {};
    for (const c of SAY_CHOICES) {
      if (c.id === ans) continue;
      const pick = c.id as SayAnswer;
      const pk = pick === 'knight' || pick === 'both';
      const pv = pick === 'knave' || pick === 'both';
      const parts: string[] = [];
      if (pk !== canKnight) parts.push(canKnight ? `A knight could say it: the words would be true.` : `A knight can’t say it: the words would be false.`);
      if (pv !== canKnave) parts.push(canKnave ? `A knave could say it: the words would be false.` : `A knave can’t say it: the words would be true.`);
      whyWrong[pick] = parts.join(' ');
    }
    const conflict = o.type === 'self' || (o.type === 'partner' && (ans === 'both' || ans === 'neither'));
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's5.l2',
      skill: 's5.cant-say',
      prompt: `${opening}Who could say, “${unstop(words)}”?`,
      scene: { kind: 'speakers', speakers: [{ id: ME, name: skin.someone, says: words }], rule: RULE },
      choices: SAY_CHOICES,
      answer: ans,
      explain,
      whyWrong,
      hint: 'Pretend a knight says it. Would the words be true? Then pretend a knave says it. Would they be false?',
    };
    if (conflict) item.conflict = true;
    return { item, cast, claim, partner: o.type === 'partner' ? partner : undefined, partnerKind, truthAs };
  }
  throw new Error('whoCanSayItem: no item found');
}

// ---------- lesson 5: a knave's "and" and "or" ----------

export type AndOrAnswer = 'bothKnight' | 'bothKnave' | 'oneKnave' | 'oneKnight';
/** Which (x, y) cases each answer allows: [both knights, x knight only, y knight only, both knaves]. */
const ANDOR_SETS: Record<AndOrAnswer, [boolean, boolean, boolean, boolean]> = {
  bothKnight: [true, false, false, false],
  oneKnight: [true, true, true, false],
  oneKnave: [false, true, true, true],
  bothKnave: [false, false, false, true],
};
export const ANDOR_ORDER: readonly AndOrAnswer[] = ['bothKnave', 'oneKnave', 'bothKnight', 'oneKnight'];

export interface AndOrOpts {
  id: string;
  skin: SkinId;
  speaker?: Kind;
  op?: 'and' | 'or';
  /** The kind the sentence names: "both knights" / "both knaves". */
  part?: Kind;
}

/**
 * "Cal is a knave. Cal says, “Ava and Ben are both knights.” What do you know about Ava and Ben?"
 * The four cases for Ava and Ben are listed; the ones where Cal's words fit Cal's kind are kept, and
 * the one choice that allows exactly those cases is right.
 */
export function andOrItem(rng: Rng, o: AndOrOpts): Built<ChooseItem> & { claim: Claim; speaker: Kind; left: KindMap[] } {
  const skin = SKINS[o.skin];
  const cast = makeCast(rng, o.skin, 3);
  const nm = cast.nm;
  // The speaker is the last name, so the two named in the sentence read in order (A and B).
  const [x, y, s] = cast.ids;
  const X = nm(x), Y = nm(y), S = nm(s);
  const speaker = o.speaker ?? rng.pick(KINDS);
  const op = o.op ?? rng.pick(['and', 'or'] as const);
  const part = o.part ?? rng.pick(KINDS);
  const claim: Claim = { t: op, cs: [is(x, part), is(y, part)] };
  const words = claimText(claim, s, nm, 3);
  const need = speaker === 'knight';
  const all = allKinds([x, y]);
  const keep = all.map((k) => claimTrue(claim, k) === need);
  const left = all.filter((_, i) => keep[i]);
  // allKinds order: (knight, knight), (knight, knave), (knave, knight), (knave, knave): the ANDOR_SETS order.
  const ans = ANDOR_ORDER.find((k) => ANDOR_SETS[k].every((v, i) => v === keep[i]));
  if (!ans) throw new Error('andOrItem: no choice matches');
  const labels: Record<AndOrAnswer, string> = {
    bothKnight: `${X} and ${Y} are both knights.`,
    bothKnave: `${X} and ${Y} are both knaves.`,
    oneKnave: 'At least one of them is a knave, but maybe not both.',
    oneKnight: 'At least one of them is a knight, but maybe not both.',
  };
  const meaning: Record<AndOrAnswer, string> = {
    bothKnight: `So ${X} and ${Y} are both knights.`,
    bothKnave: `So ${X} and ${Y} are both knaves.`,
    oneKnave: `So at least one of them is a knave. It could be ${X}, ${Y} or both.`,
    oneKnight: `So at least one of them is a knight. It could be ${X}, ${Y} or both.`,
  };
  const ruleLine = op === 'and'
    ? need ? 'An “and” sentence is true only when both parts are true.' : 'An “and” sentence is false when at least one part is false.'
    : need ? 'An “or” sentence is true when one part is true, or both are.' : 'An “or” sentence is false only when both parts are false.';
  const explain = `${S} is ${a(speaker)}, so ${S}’s words are ${tf(need)}. ${ruleLine} ${meaning[ans]}`;
  const caseText = (k: KindMap) => (k[x] === k[y] ? `${X} and ${Y} are both ${k[x]}s` : `${X} is ${a(k[x])} and ${Y} is ${a(k[y])}`);
  const whyWrong: Record<string, string> = {};
  for (const c of ANDOR_ORDER) {
    if (c === ans) continue;
    const extra = all.find((_, i) => ANDOR_SETS[c][i] && !keep[i]);
    if (extra) {
      whyWrong[c] = `Suppose ${caseText(extra)}. Then ${S}’s words would be ${tf(!need)}. But ${S} is ${a(speaker)}, so they must be ${tf(need)}.`;
    } else {
      const missed = all.find((_, i) => !ANDOR_SETS[c][i] && keep[i])!;
      whyWrong[c] = `It could also be that ${caseText(missed)}. ${S}’s words are still ${tf(need)} then.`;
    }
  }
  const item: ChooseItem = {
    kind: 'choose',
    id: o.id,
    stop: STOP,
    lesson: 's5.l5',
    skill: 's5.and-or',
    prompt: `${skin.intro(S)} is ${a(speaker)}. ${S} says, “${unstop(words)}.” What do you know about ${X} and ${Y}?`,
    scene: speakersScene([s], { [s]: claim }, nm),
    choices: ANDOR_ORDER.map((id) => ({ id, label: labels[id] })),
    answer: ans,
    explain,
    whyWrong,
    hint: `List the four cases for ${X} and ${Y}. Keep only the ones where ${S}’s words are ${tf(need)}.`,
  };
  if (speaker === 'knave') item.conflict = true;
  return { item, cast, claim, speaker, left };
}

