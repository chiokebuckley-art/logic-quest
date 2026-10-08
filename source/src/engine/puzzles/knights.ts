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
 *  - whoCanSayItem() lesson 2: who could say this (Only a knight / Only a knave / Either kind / No one)
 *  - supposeItem()   lesson 3: "Suppose Ava is a knight. What must Ben be? Or does that guess crash?"
 *  - puzzleItem()    lessons 3-5: mark each islander (AssignItem, layout 'toggles')
 *  - andOrItem()     lesson 5: what a knave's (or knight's) "and" / "or" tells you
 *
 * Every item also carries the teaching shown after a wrong answer (Item.teach), and every wrong choice of a choose
 * item its own ChoiceFeedback, all built from the same case lists: see "teaching after a wrong answer" below and
 * docs/audit/stop5.md. Choice ids say what the choice means ('knave', 'cant', 'oneKnave'), never where it sits.
 * Every hint shows one case already checked (Item.hintCase), never the answer's case.
 *
 * Guided boards (the Do beat of See -> Do -> Quiz, docs/audit/drill-stop5.md) are built from the same cases:
 *  - factRow()  lesson 1: a tested kind and a fact ("Test: Ben is a knave. Fact: the well is full."): words true or
 *               false, then Holds or Crashes
 *  - sayRow()   lesson 2: pretend a knight (or a knave) says it: what the words would be, then could that kind say it
 *  - caseRow()  lessons 1, 3-5: one case for every islander: each speaker's words, then Holds or Crashes (or, when the
 *               speaker's kind is known, Keep or Cross out for the others)
 *
 * Distinctions (docs/CONTENT_GUIDE.md, "Distinctions"; docs/audit/hidden-distinctions.md, Stop 5): the kind we test
 * says what the words must be, and whether they are true comes from the case (KIND_VS_TRUTH); what is found inside a
 * guess is pretend, and only what comes after the crash is known (GUESS_VS_KNOWN). Every words mark carries the two
 * facts to compare (names, never "I"), every row its need on its own line, every case card its reason (Truth.because),
 * and every board the mix-ups its wrong marks can show (kindMisconceptions) and "I’m confused". Explanations say "must
 * be" for every need, what false words mean, and mark what is found inside a guess.
 *
 * Only the rng passed in is used, so the same seed always gives the same items. No he/she: names repeat.
 */
import { claimTrue, speakerFits } from '../grade';
import { syncWhyWrong } from '../teach';
import type { AssignItem, Because, BoardWords, Choice, ChoiceFeedback, ChooseItem, Claim, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillOption, DrillRow, DrillStep, Misconception, Rng, Scene, Speaker, Teach, TeachCase, Truth } from '../types';

const STOP = 5;

export type Kind = 'knight' | 'knave';
export const KINDS: readonly Kind[] = ['knight', 'knave'];
export type KindMap = Record<string, Kind>;
export type Claims = Record<string, Claim>;

export const RULE = 'Knights always tell the truth. Knaves always lie.';
/**
 * The rule as a need, for boards, worked cards and the teaching: what each kind's words must be. It never reads like a
 * fact about a case, so a tested kind is never taken to make the words true or false.
 */
export const PUZZLE_RULE = 'A knight’s words must be true. A knave’s words must be false.';

// ---------- the distinctions this stop teaches apart (docs/CONTENT_GUIDE.md, "Distinctions") ----------

/**
 * The distinction every knights board rests on: the kind we test for a speaker says what the words must be; whether
 * the words are true in a case comes only from what they say, checked against that case. "Ben is a knave" is not
 * "Ben's words are false." Taught in s5.l1 (a contrast card: Ben a knave, the same words, the well full and not full),
 * reminded in every later lesson. It is the knights' twin of Stop 1's treasure-vs-sign.
 */
export const KIND_VS_TRUTH: Distinction = {
  id: 'kind-vs-truth',
  a: 'The kind we test for a speaker (it says what the words must be).',
  b: 'Whether the words are true in this case (check what they say against the case).',
};

/**
 * The distinction a crash-test rests on: what you find inside a guess is pretend, and it is thrown away when the guess
 * crashes; what you know comes after the crash (the other kind), or from words that settle a kind. Taught in s5.l3,
 * reminded in s5.l4, where every kind can flip after the crash.
 */
export const GUESS_VS_KNOWN: Distinction = {
  id: 'guess-vs-known',
  a: 'What you find inside a guess (pretend: thrown away when the guess crashes).',
  b: 'What you know (after the crash, or from words that settle a kind).',
};

/**
 * The labels a knights board uses (DrillStep.words), so its compare and because rows speak of the case, never of
 * signs and tests: "Says / In this case / So". The need sits on its own line (DrillRow.needs, no lead words).
 */
export const CASE_WORDS: BoardWords = {
  says: 'Says',
  world: 'In this case',
  so: 'So',
  ask: 'Are the words true in this case?',
  fit: 'The words are true here.',
  unfit: 'The words are false here.',
  needs: '',
  closing: 'Those ideas are apart now. Back to the board: check what the words say against the case. Then compare them with the kind.',
};

/** Lesson 2's labels: the speaker is pretend, so the words "would be" true or false. */
export const SAY_WORDS: BoardWords = {
  says: 'Says',
  world: 'Pretend',
  so: 'So',
  ask: 'Would the words be true?',
  fit: 'The words would be true.',
  unfit: 'The words would be false.',
  needs: '',
  closing: 'Those two ideas are apart now. Back to the board: work out what the words would be. Then compare them with what that kind needs.',
};

/** The guess boards' labels: the closing line of "I’m confused" speaks of guesses. */
export const GUESS_WORDS: BoardWords = {
  ...CASE_WORDS,
  closing: 'Those ideas are apart now. Keep what you find inside a guess apart from what you know. When a guess crashes, throw it away.',
};

/** Case cards (hints, Teach cases): the because rows under each speaker's words. */
export const CARD_WORDS: BoardWords = { world: 'In this case', fit: 'The words are true here.', unfit: 'The words are false here.' };
/** Lesson 2's case cards: a pretend speaker. */
export const SAY_CARD_WORDS: BoardWords = { world: 'Pretend', fit: 'The words would be true.', unfit: 'The words would be false.' };
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

// ---------- teaching after a wrong answer ----------
//
// The words the lesson cards use: a "case" is one full way things could be ("Ava is a knight and Ben is a
// knave"), and a "guess" is what you suppose about one islander. Every case card is computed: each speaker's
// words are true or false by claimTrue, and the note says who fits the rule (speakerFits). A wrong choice's
// feedback names that choice's gap, says where it fails, and shows the case that proves it.

/** A word or phrase an explanation uses, defined in place. */
export type Term = { word: string; meaning: string };

/** Words the explanations use, defined in place (Teach.terms). Shown as "<word> means <meaning>". */
export const TERMS = {
  fits: { word: 'Fits the rule', meaning: 'a knight says something true, or a knave says something false.' },
  cant: { word: '“Can’t tell”', meaning: 'more than one case works, and they give different answers.' },
  we: { word: '“We”', meaning: 'all the islanders in the puzzle. The speaker counts too.' },
  same: { word: '“The same kind”', meaning: 'two knights, or two knaves.' },
  diff: { word: '“Different kinds”', meaning: 'one knight and one knave.' },
  and: { word: '“And”', meaning: 'every part must be true. One false part makes the whole sentence false.' },
  or: { word: '“Or”', meaning: 'at least one part is true. It can be one part or every part.' },
  atLeastOne: { word: '“At least one”', meaning: 'one or more.' },
  couldSay: { word: '“Could say it”', meaning: 'that kind of islander can say it and still fit the rule.' },
  either: { word: '“Either kind”', meaning: 'a knight could say it, and a knave could say it too.' },
  noOne: { word: '“No one”', meaning: 'a knight could not say it, and a knave could not say it either.' },
} as const;

/** "A case means one full way things could be, like “Ava is a knight and Ben is a knave.”" */
export const caseTerm = (example: string): Term => ({ word: 'A case', meaning: `one full way things could be, like “${unstop(example)}.”` });

/**
 * "A guess means what you suppose about one islander, just to test it. Here it is “Ava is a knight.” If every case
 * with the guess breaks the rule, the guess crashes." It comes after the case term, since it uses "case".
 */
export const guessTerm = (name: string, kind: Kind): Term => ({
  word: 'A guess',
  meaning: `what you suppose about one islander, just to test it. Here it is “${name} is ${a(kind)}.” If every case with the guess breaks the rule, the guess crashes.`,
});

/**
 * A counting claim's own words as a term, so the amount and "us" are defined together: “At least one of us”,
 * “Exactly one of us”, “We”. `n` is the number of islanders in the puzzle.
 */
export function countTerm(c: Extract<Claim, { t: 'count' }>, n: number): Term {
  if (c.op === 'exactly' && c.k === n) return TERMS.we;
  if (c.op === 'exactly' && c.k === 0) return { word: '“None of us”', meaning: 'not one islander in the puzzle. The speaker counts too.' };
  const k = NUM[c.k];
  if (c.op === 'atLeast') return { word: `“At least ${k} of us”`, meaning: `${k} or more of the islanders in the puzzle. The speaker counts too.` };
  if (c.op === 'atMost') return { word: `“At most ${k} of us”`, meaning: `${k} or fewer of the islanders in the puzzle. The speaker counts too.` };
  return { word: `“Exactly ${k} of us”`, meaning: `${k} of the islanders in the puzzle, no more and no fewer. The speaker counts too.` };
}

/** One speaker whose words have this truth: fits the rule or not, as a case note. */
export function fitNote(k: Kind, wordsTrue: boolean): string {
  return (k === 'knight') === wordsTrue
    ? `${cap(a(k))} with ${tf(wordsTrue)} words fits the rule. This case works.`
    : `${cap(a(k))} never says ${tf(wordsTrue)} words. This case does not work.`;
}

/** "Ben is a knave with true words" (no period), for a speaker who breaks the rule in this case. */
export const withWords = (who: string, claims: Readonly<Claims>, kinds: KindMap, nm: Namer) =>
  `${nm(who)} is ${a(kinds[who])} with ${tf(claimTrue(claims[who], kinds))} words`;

/**
 * One case as a card: "Ava is a knight and Ben is a knave." Each speaker's words are true or false (claimTrue),
 * and the note says who breaks the rule (speakerFits), or that everyone fits.
 */
export function kindsCase(ids: readonly string[], claims: Readonly<Claims>, kinds: KindMap, nm: Namer, extra: readonly Truth[] = []): TeachCase {
  // Each truth carries its comparison: what the words say (names, never "I") and who is what in this case.
  const truths: Truth[] = ids.filter((id) => claims[id]).map((id) => ({ who: `${nm(id)}’s words`, value: claimTrue(claims[id], kinds), because: claimBecause(claims[id], kinds, nm, ids) }));
  const b = breakers(ids, claims, kinds);
  const note = b.length
    ? `${b.map((id) => `${withWords(id, claims, kinds, nm)}.`).join(' ')} That breaks the rule, so this case does not work.`
    : 'Everyone fits the rule. This case works.';
  return { label: `${cap(kindsText(ids, kinds, nm))}.`, truths: [...truths, ...extra], note, words: CARD_WORDS };
}

/** When a claim is true, with names only (never "I"), no final period: "Ava and Ben are the same kind". */
export function whenTrue(c: Claim, nm: Namer, ids: readonly string[]): string {
  const list = joinAnd(ids.map(nm));
  switch (c.t) {
    case 'is': return `${nm(c.who)} is ${a(c.kind)}`;
    case 'same': return `${nm(c.a)} and ${nm(c.b)} are the same kind`;
    case 'diff': return `${nm(c.a)} and ${nm(c.b)} are different kinds`;
    case 'count': {
      if (c.op === 'exactly' && c.k === ids.length) return `${list} are ${ids.length === 2 ? 'both' : 'all'} ${c.kind}s`;
      if (c.op === 'exactly' && c.k === 0) return `none of ${list} is ${a(c.kind)}`;
      const lead = c.op === 'atLeast' ? 'at least' : c.op === 'atMost' ? 'at most' : 'exactly';
      return c.k === 1 ? `${lead} one of ${list} is ${a(c.kind)}` : `${lead} ${NUM[c.k]} of ${list} are ${c.kind}s`;
    }
    case 'not': return `it is not true that ${whenTrue(c.c, nm, ids)}`;
    case 'and': return c.cs.map((x) => whenTrue(x, nm, ids)).join(', and ');
    case 'or': return c.cs.map((x) => whenTrue(x, nm, ids)).join(', or ');
    case 'if': return `${whenTrue(c.b, nm, ids)}, or it is not true that ${whenTrue(c.a, nm, ids)}`;
  }
}

/** "zero, two or three" */
const orWords = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' or ') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/**
 * When a claim is false, with names only (never "I"), no final period: what is so when the words are false, said
 * plainly ("Ava and Ben are the same kind" for false "different kinds" words). The follow lines use it: "False means
 * …". Every form matches claimTrue: a count claim lists exactly the counts that make it false.
 */
export function whenFalse(c: Claim, nm: Namer, ids: readonly string[]): string {
  const list = joinAnd(ids.map(nm));
  const all = (k: Kind) => `${list} are ${ids.length === 2 ? 'both' : 'all'} ${k}s`;
  switch (c.t) {
    case 'is': return `${nm(c.who)} is ${a(flip(c.kind))}`;
    case 'same': return `${nm(c.a)} and ${nm(c.b)} are different kinds`;
    case 'diff': return `${nm(c.a)} and ${nm(c.b)} are the same kind`;
    case 'count': {
      const n = ids.length;
      const holds = (m: number) => (c.op === 'atLeast' ? m >= c.k : c.op === 'atMost' ? m <= c.k : m === c.k);
      const off = Array.from({ length: n + 1 }, (_, m) => m).filter((m) => !holds(m));
      if (off.length === 1 && off[0] === 0) return all(flip(c.kind));
      if (off.length === 1 && off[0] === n) return all(c.kind);
      if (off.length === n && !off.includes(0)) return `at least one of ${list} is ${a(c.kind)}`;
      if (off.length === n && !off.includes(n)) return `at least one of ${list} is ${a(flip(c.kind))}`;
      return `the number of ${c.kind}s among ${list} is ${orWords(off.map((m) => NUM[m]))}`;
    }
    case 'not': return whenTrue(c.c, nm, ids);
    case 'and': return c.cs.map((x) => whenFalse(x, nm, ids)).join(', or ');
    case 'or': return c.cs.map((x) => whenFalse(x, nm, ids)).join(', and ');
    case 'if': return `${whenTrue(c.a, nm, ids)}, and ${whenFalse(c.b, nm, ids)}`;
  }
}

/** What a claim says, with names only (never "I"), as a sentence: "Ava and Ben are the same kind." */
export const claimSays = (c: Claim, nm: Namer, ids: readonly string[]) => `${cap(whenTrue(c, nm, ids))}.`;

/** Who is what in a case, for the people a claim is about: "Ava is a knave and Ben is a knight." */
export const caseWorld = (c: Claim, kinds: KindMap, nm: Namer, ids: readonly string[]) => `${cap(kindsSay(claimRefs(c, ids), kinds, nm))}.`;

/**
 * The comparison behind a speaker's words in a case (Truth.because, a because row): what the words say, who is what
 * in this case, and whether they match. Never the speaker's kind: the kind only says what the words must be.
 */
export function claimBecause(c: Claim, kinds: KindMap, nm: Namer, ids: readonly string[]): Because {
  return { says: claimSays(c, nm, ids), world: caseWorld(c, kinds, nm, ids), match: claimTrue(c, kinds) };
}

/** "Ava’s words are true only when Ava and Ben are the same kind." One sentence per speaker. */
export function wordsMeaning(c: Claim, speaker: string, nm: Namer, ids: readonly string[]): string {
  const whose = `${nm(speaker)}’s words are true`;
  // Two short sentences, so two speakers' "and" / "or" words still read at the stop's level side by side.
  if (c.t === 'or') return `${whose} when at least one part is true. Here, that means ${whenTrue(c, nm, ids)}.`;
  if (c.t === 'and') return `${whose} only when every part is true. Here, that means ${whenTrue(c, nm, ids)}.`;
  return `${whose} only when ${whenTrue(c, nm, ids)}.`;
}

/** Does a claim use this kind of words anywhere inside it? */
function uses(c: Claim, t: Claim['t']): boolean {
  if (c.t === t) return true;
  if (c.t === 'not') return uses(c.c, t);
  if (c.t === 'and' || c.t === 'or') return c.cs.some((x) => uses(x, t));
  if (c.t === 'if') return uses(c.a, t) || uses(c.b, t);
  return false;
}

/** Every counting claim inside a claim: "At least one of us is a knave", "We are both knaves". */
function counts(c: Claim): Extract<Claim, { t: 'count' }>[] {
  switch (c.t) {
    case 'count': return [c];
    case 'not': return counts(c.c);
    case 'and': case 'or': return c.cs.flatMap(counts);
    case 'if': return [...counts(c.a), ...counts(c.b)];
    default: return [];
  }
}

/**
 * Every special word the islanders' words use, each defined once, in order of need: each counting phrase
 * (“At least one of us”, “Exactly one of us”, “We”), "and", "or", "the same kind", "different kinds". None is
 * left out: a puzzle has at most three speakers, and each one's words need at most one of these.
 */
export function claimTerms(claims: readonly Claim[], n: number): Term[] {
  const out: Term[] = [];
  const add = (t: Term) => { if (!out.some((x) => x.word === t.word)) out.push(t); };
  for (const c of claims) for (const x of counts(c)) add(countTerm(x, n));
  if (claims.some((c) => uses(c, 'and'))) add(TERMS.and);
  if (claims.some((c) => uses(c, 'or'))) add(TERMS.or);
  if (claims.some((c) => uses(c, 'same'))) add(TERMS.same);
  if (claims.some((c) => uses(c, 'diff'))) add(TERMS.diff);
  return out;
}

// ---------- explaining a solve ----------
//
// Every need says "must be": a knight's words must be true, a knave's must be false. A step that follows a need says
// what the words say (with names, never "I") and, for false words, what that means about the world ("False means Ava
// and Ben are the same kind"), so the NOT step is never hidden. What follows inside a guess is marked "inside the
// guess": it is pretend, and it is thrown away when the guess crashes.

type Step = { add: KindMap; line: string; meanings: number } | { crash: string; who: string };

/**
 * One step of reasoning from what is known, or null when no single speaker settles anything new.
 * Known speakers first (the one just supposed goes first): their words must be true (knight) or false
 * (knave), which can pin down others or crash. Then unknown speakers whose words could only fit one kind.
 * `guess`: the step is inside a guess, so what it finds is marked as pretend.
 */
function step(ids: readonly string[], claims: Readonly<Claims>, known: Readonly<Partial<KindMap>>, nm: Namer, supposed: string | undefined, guess: boolean): Step | null {
  const cases = allKinds(ids, known);
  const order = supposed ? [supposed, ...ids.filter((x) => x !== supposed)] : [...ids];
  const so = guess ? 'So, inside the guess,' : 'So';
  for (const s of order) {
    const c = claims[s];
    const ks = known[s];
    if (!c || !ks) continue;
    const need = ks === 'knight';
    const good = cases.filter((k) => claimTrue(c, k) === need);
    const lead = s === supposed ? `Then ${nm(s)}’s words must be ${tf(need)}.` : `${nm(s)} is ${a(ks)}, so ${nm(s)}’s words must be ${tf(need)}.`;
    if (!good.length) {
      return { crash: `${lead} But with ${withText(claimRefs(c, ids), known, nm)}, they are ${tf(!need)}.`, who: s };
    }
    const derived = ids.filter((q) => !known[q] && good.every((k) => k[q] === good[0][q]));
    if (derived.length) {
      const add: KindMap = {};
      for (const q of derived) add[q] = good[0][q];
      // Need, Says, then (for false words) what false means, then So.
      const says = `They say ${whenTrue(c, nm, ids)}.`;
      const means = need ? '' : ` False means ${whenFalse(c, nm, ids)}.`;
      return { add, line: `${lead} ${says}${means} ${so} ${kindsText(derived, add, nm)}.`, meanings: need ? 1 : 2 };
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
      return { crash: `If ${nm(s)} were a knight, ${nm(s)} would be a knight saying something false. If ${nm(s)} were a knave, ${nm(s)} would be a knave saying something true.`, who: s };
    }
    if (bk || bv) {
      const v: Kind = bk ? 'knight' : 'knave';
      return {
        add: { [s]: flip(v) },
        line: `If ${nm(s)} were ${a(v)}, ${nm(s)} would be ${a(v)} saying something ${tf(v === 'knave')}. ${so} ${nm(s)} is ${a(flip(v))}.`,
        meanings: 0,
      };
    }
  }
  return null;
}

/** Follow steps until nothing new follows or a case crashes. `guess`: inside a guess (what it finds is pretend). */
function follow(ids: readonly string[], claims: Readonly<Claims>, start: Readonly<Partial<KindMap>>, nm: Namer, supposed?: string, guess = false) {
  let known: Partial<KindMap> = { ...start };
  const lines: string[] = [];
  let meanings = 0;
  let sup = supposed;
  for (let i = 0; i <= ids.length + 1; i++) {
    const r = step(ids, claims, known, nm, sup, guess);
    sup = undefined;
    if (!r) break;
    if ('crash' in r) return { known, lines: [...lines, r.crash], crash: true, meanings, breaker: r.who };
    lines.push(r.line);
    meanings += r.meanings;
    known = { ...known, ...r.add };
  }
  return { known, lines, crash: false, meanings, breaker: undefined };
}

/** One guess of an explanation: who was supposed, as what kind, who was found inside it, and whose words crashed it. */
export interface Guess {
  who: string;
  kind: Kind;
  /** The guess itself and every kind found inside it before it crashed. All of it is thrown away. */
  inside: Partial<KindMap>;
  /** Every kind in the guess's world when it crashed: what was known before it, and what was found inside it. */
  world: Partial<KindMap>;
  /** The speaker whose words broke the rule inside the guess. */
  breaker: string;
}

export interface Solve {
  /** The explanation, one sentence per entry. */
  lines: string[];
  /** How many "Suppose …" steps it needed. */
  supposes: number;
  /** Who was supposed, in order. */
  supposed: string[];
  /**
   * Sentences that only say what the words say or mean ("They say …", "False means …"). The length limit on an
   * explanation does not count them, so the puzzles chosen do not change when the reasons are shown.
   */
  meanings: number;
  /** Each guess, in order. */
  guesses: Guess[];
}

/**
 * Explain the one answer with the stop's method, or null when single-clue steps and suppositions of
 * one person at a time do not reach it.
 */
export function explainSolve(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): Solve | null {
  const lines: string[] = [];
  const supposed: string[] = [];
  const guesses: Guess[] = [];
  let r = follow(ids, claims, {}, nm);
  if (r.crash) return null;
  lines.push(...r.lines);
  let meanings = r.meanings;
  let known = r.known;
  while (ids.some((id) => !known[id])) {
    let best: { p: string; lines: string[]; meanings: number; world: Partial<KindMap>; breaker: string } | null = null;
    for (const p of ids) {
      if (known[p]) continue;
      const t = follow(ids, claims, { ...known, [p]: flip(answer[p]) }, nm, p, true);
      if (t.crash && (!best || t.lines.length < best.lines.length)) best = { p, lines: t.lines, meanings: t.meanings, world: t.known, breaker: t.breaker! };
    }
    if (!best) return null;
    supposed.push(best.p);
    const before = known;
    const inside = Object.fromEntries(Object.entries(best.world).filter(([id]) => !before[id])) as Partial<KindMap>;
    guesses.push({ who: best.p, kind: flip(answer[best.p]), inside, world: best.world, breaker: best.breaker });
    lines.push(`Suppose ${nm(best.p)} is ${a(flip(answer[best.p]))}.`, ...best.lines, `That guess crashes, so ${nm(best.p)} is ${a(answer[best.p])}.`);
    meanings += best.meanings;
    r = follow(ids, claims, { ...known, [best.p]: answer[best.p] }, nm);
    if (r.crash) return null;
    lines.push(...r.lines);
    meanings += r.meanings;
    known = r.known;
  }
  if (ids.some((id) => known[id] !== answer[id])) return null;
  return { lines, supposes: supposed.length, supposed, meanings, guesses };
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

/** A speakers scene's banners: the rule (RULE by default), what is true (a fact), and what is being tested. */
export interface SceneBanners {
  rule?: string;
  fact?: string;
  test?: string;
}

/**
 * A speakers scene in the same order as the people. No words: an empty `says` (the screen shows "says nothing").
 * Boards and worked cards pass PUZZLE_RULE, the rule as a need; a stated fact and the test being tried get banners of
 * their own, so a guess is never shown as a fact.
 */
export function speakersScene(ids: readonly string[], claims: Readonly<Claims>, nm: Namer, b: SceneBanners = {}): { kind: 'speakers'; speakers: Speaker[]; rule: string; fact?: string; test?: string } {
  return {
    kind: 'speakers',
    speakers: ids.map((id) => ({ id, name: nm(id), says: claims[id] ? claimText(claims[id], id, nm, ids.length) : '' })),
    rule: b.rule ?? RULE,
    ...(b.fact ? { fact: b.fact } : {}),
    ...(b.test ? { test: b.test } : {}),
  };
}

// ---------- claim menus ----------

const is = (who: string, kind: Kind): Claim => ({ t: 'is', who, kind });

/**
 * Which words islanders may say. 'plain': "Ben is a knave.", "I am a knight.", "the same kind", "different kinds"
 * (lesson 3 teaches only these). 'basic': plain, plus counting words about "us" (lesson 4 teaches them). 'andor':
 * plain, plus "and" / "or" sentences (lesson 5 teaches them; it does not teach the counting words).
 */
export type ClaimPool = 'plain' | 'basic' | 'andor';

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
  if (pool === 'andor') out.push(...andOrCandidates(s, ids).map((c) => ({ c, w: 3 })));
  if (pool !== 'basic') return out;
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
export const sentenceCount = (lines: readonly string[]) => lines.join(' ').split(/[.!?]\s+/).filter(Boolean).length;

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
    // The reasons ("They say …", "False means …") are not counted, so the puzzles chosen are the same as before.
    if (!solve || solve.supposes > 1 || sentenceCount(solve.lines) - solve.meanings > maxSentences) continue;
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

/** The hint shows one case already checked (puzzleHintCase), so it models the method instead of only naming it. */
export const PUZZLE_HINT = 'Here is one case, checked for you. Check other cases the same way. The answer is the case where everyone fits the rule.';

/**
 * The hint's marked case: the first case in the list (knights first) that is not the answer, with each speaker's
 * words marked true or false. The answer is the only case that works, so this one always breaks the rule.
 */
export function puzzleHintCase(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): TeachCase {
  const kinds = allKinds(ids).find((x) => ids.some((id) => x[id] !== answer[id]))!;
  return rowCase(caseRow({ ids, claims, kinds, nm }));
}


/**
 * Teaching for a puzzle. Two islanders: all four cases. Three islanders: the answer, then each case with one
 * islander changed (each of those breaks the rule, since only one case works). The smaller example checks the
 * answer one islander at a time.
 */
export function puzzleTeach(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): Teach {
  const changed = ids.map((id) => ({ ...answer, [id]: flip(answer[id]) }));
  const shown = ids.length === 2 ? allKinds(ids) : [answer, ...changed];
  const speaking = ids.filter((id) => claims[id]);
  const quiet = ids.filter((id) => !claims[id]);
  // Every special word in the bubbles is defined: at most three, one per speaker.
  const terms = [caseTerm(kindsText(ids, changed[0], nm)), ...claimTerms(speaking.map((id) => claims[id]), ids.length)];
  if (terms.length === 1) terms.push(TERMS.fits);
  const meaning = [
    ...speaking.map((id) => wordsMeaning(claims[id], id, nm, ids)),
    ...quiet.map((id) => `${nm(id)} says nothing, so ${nm(id)} fits the rule as a knight or as a knave.`),
  ].join(' ');
  return {
    rule: `${PUZZLE_RULE} The answer is the one case where every islander fits this rule.`,
    terms,
    meaning,
    casesTitle: ids.length === 2 ? 'Every case, checked against the rule' : 'The answer, and each case with one islander changed',
    cases: shown.map((k) => kindsCase(ids, claims, k, nm)),
    remember: ['Check each islander. A knight’s words must be true. A knave’s words must be false.', 'Ask: “In my answer, does each islander fit the rule?”'],
    simpler: [
      'Check the answer one islander at a time.',
      ...ids.map((id) => {
        if (!claims[id]) return `${nm(id)} is ${a(answer[id])} and says nothing. That fits.`;
        const v = claimTrue(claims[id], answer);
        return `${nm(id)} is ${a(answer[id])}, and ${nm(id)}’s words are ${tf(v)}. ${speakerFits(id, claims[id], answer) ? 'That fits.' : 'That breaks the rule.'}`;
      }),
      fitsAll(ids, claims, answer) ? 'Every islander fits the rule, so this case is the answer.' : 'Someone breaks the rule, so this case is not the answer.',
    ],
  };
}

/** The mastery tag of a puzzle whose worked guess flips two kinds or more after the crash. */
export const GUESS_FLIPS = 'guess-flips';
/** The mastery tag of a stated knave's "not" about a fact (reason from a stated kind, through the NOT). */
export const KNAVE_NOT = 'stated-knave-not';

/** How many islanders the worked guess of a puzzle gets wrong: each one's kind flips after the crash. */
export function guessFlips(p: KnightPuzzle): number {
  const g = p.solve.guesses[0];
  return g ? p.ids.filter((id) => g.inside[id] !== undefined && g.inside[id] !== p.answer[id]).length : 0;
}

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
    hintCase: puzzleHintCase(ids, p.claims, p.answer, nm),
    teach: puzzleTeach(ids, p.claims, p.answer, nm),
    // A thinking board that keeps a guess apart from what is known, and "I’m confused" on the same ideas.
    scratch: guessScratch(ids, nm, p.answer, p.solve),
    scratchLabel: 'the guess board',
    confused: guessConfused(),
  };
  if (o.n === 3) item.seconds = 150;
  // Mastery (guess vs known): the explanation's guess flips two kinds or more after the crash, so what was found inside
  // it must be thrown away, not kept.
  if (guessFlips(p) >= 2) item.tags = [GUESS_FLIPS];
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
  /** Which words the islanders may say. Default 'plain': the words lesson 3 teaches (no "us", no "and" / "or"). */
  pool?: ClaimPool;
}

/**
 * The smallest example with the same outcome: only X speaks, and the words are as short as they can be. One case
 * works ("Ben is a knave."), two work ("I am a knight."), or none ("I am a knave."). Every truth is computed.
 */
export function supposeSimpler(x: string, y: string, kind: Kind, ans: SupposeAnswer, nm: Namer): string[] {
  const ids = [x, y];
  const c: Claim = ans === 'crash' ? is(x, 'knave') : ans === 'cant' ? is(x, 'knight') : is(y, kind === 'knight' ? ans : flip(ans));
  const claims: Claims = { [x]: c };
  const X = nm(x), Y = nm(y);
  const lines = [`Here is a smaller one. Only ${X} speaks: “${unstop(claimText(c, x, nm, 2))}.” Suppose ${X} is ${a(kind)}.`];
  const works: Kind[] = [];
  for (const v of KINDS) {
    const k: KindMap = { [x]: kind, [y]: v };
    const ok = fitsAll(ids, claims, k);
    if (ok) works.push(v);
    lines.push(`Try ${Y} as ${a(v)}. ${X}’s words are ${tf(claimTrue(c, k))}. ${ok ? 'That case works.' : `${X} breaks the rule.`}`);
  }
  lines.push(works.length === 1 ? `Only one case works, so ${Y} must be ${a(works[0])}.` : works.length === 2 ? `The two cases both work, so you can’t tell what ${Y} is.` : 'No case works, so the guess crashes.');
  return lines;
}

/** "Suppose Ava is a knight. What must Ben be?" Two islanders; both speak; at least one way fits overall. */
export function supposeItem(rng: Rng, o: SupposeOpts): Built<ChooseItem> & { ids: string[]; claims: Claims; who: string; other: string; kind: Kind; fits: Kind[] } {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const cast = makeCast(rng, o.skin, 2);
    const { ids, nm } = cast;
    const claims: Claims = {};
    for (const s of ids) claims[s] = weighted(rng, candidates(s, ids, o.pool ?? 'plain'));
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
    const caseOf = (v: Kind): KindMap => ({ [who]: kind, [other]: v });
    const breaker = (v: Kind) => breakers(ids, claims, caseOf(v))[0];
    const caseLine = (v: Kind) => {
      const b = breaker(v);
      return b ? `If ${Y} is ${a(v)}, ${breakText(b, caseOf(v), nm)}.` : `If ${Y} is ${a(v)}, everyone fits the rule.`;
    };
    /** "Wes is a knight with false words" in the case where Y is v. */
    const broken = (v: Kind) => withWords(breaker(v), claims, caseOf(v), nm);
    const card = (v: Kind) => kindsCase(ids, claims, caseOf(v), nm);
    const hintV: Kind = KINDS.find((v) => !fits.includes(v)) ?? 'knight';
    const end = ans === 'cant'
      ? `The two cases both work, so you can’t tell what ${Y} is.`
      : ans === 'crash'
        ? `The two cases both break the rule, so the guess crashes. ${X} can’t be ${a(kind)}.`
        : `So ${Y} must be ${a(ans)}.`;
    const explain = `Suppose ${X} is ${a(kind)}. ${caseLine('knight')} ${caseLine('knave')} ${end}`;

    // One explanation per wrong choice, by what that choice gets wrong.
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const c of SUPPOSE_CHOICES) {
      if (c.id === ans) continue;
      if (c.id === 'cant') {
        feedback.cant = ans === 'crash'
          ? {
            headline: 'Your answer needs two cases that work, but no case works.',
            detail: [`With ${Y} as a knight, ${broken('knight')}. With ${Y} as a knave, ${broken('knave')}.`, `So the guess crashes: ${X} can’t be ${a(kind)}.`],
            example: card('knight'),
          }
          : {
            headline: 'You can tell, because only one case works.',
            detail: [`“Can’t tell” would mean ${Y} could be a knight or a knave.`, `But with ${Y} as ${a(flip(ans as Kind))}, ${broken(flip(ans as Kind))}. So ${Y} must be ${a(ans as Kind)}.`],
            example: card(flip(ans as Kind)),
          };
      } else if (c.id === 'crash') {
        feedback.crash = {
          headline: fits.length === 1 ? 'The guess does not crash, because one case works.' : 'The guess does not crash, because two cases work.',
          detail: ['A guess crashes only when no case works.', fits.length === 1 ? `With ${Y} as ${a(fits[0])}, everyone fits the rule.` : `With ${X} as ${a(kind)}, ${Y} could be a knight or a knave. Everyone fits the rule each time.`],
          example: card(fits[0]),
        };
      } else {
        const v = c.id as Kind;
        if (fits.includes(v)) {
          // Two cases work: the pick is one of them.
          feedback[v] = {
            headline: `Your answer leaves out a case: ${Y} could also be ${a(flip(v))}.`,
            detail: [`With ${X} as ${a(kind)}, ${Y} as ${a(v)} works.`, `But ${Y} as ${a(flip(v))} works too. Two cases work, so you can’t tell what ${Y} is.`],
            example: card(flip(v)),
          };
        } else {
          feedback[v] = {
            headline: `With ${Y} as ${a(v)}, ${nm(breaker(v))} breaks the rule.`,
            detail: [
              `“${cap(v)}” means this case: ${kindsText(ids, caseOf(v), nm)}.`,
              `There, ${broken(v)}. ${ans === 'crash' ? `${Y} as ${a(flip(v))} breaks the rule too, so the guess crashes.` : `Only ${Y} as ${a(ans as Kind)} works.`}`,
            ],
            example: card(v),
          };
        }
      }
    }
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's5.l3',
      skill: 's5.suppose',
      prompt: `${cast.setting} Suppose ${X} is ${a(kind)}. What must ${Y} be? Or does that guess crash?`,
      // The guess is a test, drawn as the test-world banner: never a fact.
      scene: speakersScene(ids, claims, nm, { rule: PUZZLE_RULE, test: `${X} is ${a(kind)}. This is a guess.` }),
      choices: SUPPOSE_CHOICES,
      answer: ans,
      explain,
      feedback,
      // The hint shows one case already checked: one that breaks the rule when there is one (else the knight case).
      hint: `Here is one case, checked for you. Keep ${X} as ${a(kind)}, and check ${Y} as ${a(flip(hintV))} the same way.`,
      hintCase: rowCase(caseRow({ ids, claims, kinds: caseOf(hintV), nm })),
      teach: {
        // The knight / knave rule first: "fits the rule" and "breaks the rule" below lean on it.
        rule: `${PUZZLE_RULE} A case works only when everyone fits this rule. Keep the guess, and try the other islander as a knight, then as a knave.`,
        // The case term comes first: the guess term uses "case". Then every special word in the bubbles.
        terms: [caseTerm(kindsText(ids, caseOf('knave'), nm)), guessTerm(X, kind), ...claimTerms(ids.map((id) => claims[id]), 2)],
        meaning: `${ids.map((id) => wordsMeaning(claims[id], id, nm, ids)).join(' ')} In the guess, ${X} is ${a(kind)}, so ${X}’s words must be ${tf(kind === 'knight')}.`,
        casesTitle: `Keep ${X} as ${a(kind)}. Try each case for ${Y}.`,
        cases: [card('knight'), card('knave')],
        remember: ['One case works: that is the answer. Two cases work: you can’t tell. No case works: the guess crashes.', `Ask: “Did I try ${Y} as a knight and as a knave?”`],
        simpler: supposeSimpler(who, other, kind, ans, nm),
      },
    };
    syncWhyWrong(item);
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

/** One way things could be in a lesson 1 question (the speaker's kind, and the fact or the other islander's kind). */
export interface WordsCase {
  /** The speaker's kind. */
  k: Kind;
  /** Fact questions: is the fact true? */
  p: boolean;
  /** Questions about the other islander: that islander's kind. */
  o: Kind;
  /** "Uma is a knight, and Uma can swim." */
  label: string;
  /** Are the speaker's words true in this case? */
  wordsTrue: boolean;
  /** Does the speaker fit the rule in this case? */
  fits: boolean;
  /** The question's answer in this case: 'yes' / 'no', or a kind. */
  q: string;
}

/**
 * A lesson 1 case as a card: the speaker's words true or false, with the comparison behind it (what the words say, and
 * what is so in this case), and whether the speaker fits the rule.
 */
const wordsCard = (c: WordsCase, S: string, because: (c: WordsCase) => Because, extra: readonly Truth[] = []): TeachCase => ({
  label: c.label,
  truths: [{ who: `${S}’s words`, value: c.wordsTrue, because: because(c) }, ...extra],
  note: fitNote(c.k, c.wordsTrue),
  words: CARD_WORDS,
});

/** A fact in a case's words: "Cal can swim", "the well is not full". '{n}' becomes the speaker's name. */
export const factText = (fact: Fact, name: string, p: boolean) => (p ? fact.yes : fact.no).replace('{n}', name);

/** Are the speaker's words true? The plain sentence is true when the fact holds, the "not" sentence when it does not. */
export const factWordsTrue = (p: boolean, negative: boolean) => p !== negative;

/**
 * One case of a sentence about a fact: the speaker's kind (k) and whether the fact holds (p). The words' truth and
 * whether the speaker fits the rule are computed here, for the questions and the guided boards alike. q is the
 * question's answer in this case.
 */
export function factCase(name: string, fact: Fact, negative: boolean, k: Kind, p: boolean, q: string): WordsCase {
  const wordsTrue = factWordsTrue(p, negative);
  return { k, p, o: 'knight', label: `${name} is ${a(k)}, and ${factText(fact, name, p)}.`, wordsTrue, fits: (k === 'knight') === wordsTrue, q };
}

/**
 * Lesson 1. Every case is listed (the speaker's kind, and the fact or the other islander's kind), each is checked
 * against the rule, and the answer is what the cases that work agree on ("Can’t tell" when they disagree). The
 * teaching and each wrong choice's explanation come from the same cases.
 */
export function wordsItem(rng: Rng, o: WordsOpts): Built<ChooseItem> & { answerSet: string[]; cases: WordsCase[] } {
  const skin = SKINS[o.skin];
  const cast = makeCast(rng, o.skin, 2);
  const [sp, ot] = cast.ids;
  const nm = cast.nm;
  const S = nm(sp), O = nm(ot);
  const who = rng.pick(['knight', 'knave'] as const);
  const spk = o.speaker ?? rng.pick(KINDS);
  const base = { kind: 'choose' as const, id: o.id, stop: STOP, lesson: 's5.l1', skill: 's5.words' };

  let said: string;
  let scene: Scene;
  let prompt: string;
  let cases: WordsCase[];
  /** What the question asks about: the fact, the other islander, or the speaker. */
  let ask: 'fact' | 'other' | 'speaker';
  /** What the question tells you before the words. */
  let known: 'speaker' | 'fact' | 'other' | 'none';
  /** When the words are true: "Uma can swim". */
  let truthText: string;
  /** What you know, after "you know": "Uma is a knight". Empty when nothing is known. */
  let knowText = '';
  /** What you don't know: "no one knows if Uma is a knight or a knave". */
  let doubt = '';
  /** A case's answer in words: "Uma can swim", "Jin is a knight". */
  let qText: (c: WordsCase) => string;
  /** The part of a case that is not known, after "if": "Uma is a knave", "the dragon is asleep". */
  let ifPart: (c: WordsCase) => string;
  /** A case as a board row, already checked: the Hint's marked case. */
  let caseAsRow: (c: WordsCase) => DrillRow;
  /** The comparison behind the words' truth in a case: what they say, and what is so there. */
  let becauseOf: (c: WordsCase) => Because;
  let conflict = false;

  if (o.type === 'fact' || o.type === 'kindFromFact') {
    const fact = rng.pick(skin.facts);
    const fill = (t: string) => t.replace('{n}', S);
    const neg = !!o.negative;
    said = neg ? fact.sayNot : fact.say;
    scene = { kind: 'speakers', speakers: [{ id: sp, name: S, says: said }], rule: RULE };
    const factLine = (p: boolean) => factText(fact, S, p);
    truthText = factLine(!neg);
    const askFact = o.type === 'fact';
    const mk = (k: Kind, p: boolean): WordsCase => factCase(S, fact, neg, k, p, askFact ? (p ? 'yes' : 'no') : k);
    caseAsRow = (c) => factRow({ name: S, fact, negative: neg, k: c.k, p: c.p });
    becauseOf = (c) => ({ says: `${cap(factLine(!neg))}.`, world: `${cap(factLine(c.p))}.`, match: c.wordsTrue });
    if (askFact) {
      ask = 'fact';
      known = spk === 'unknown' ? 'none' : 'speaker';
      cases = (spk === 'unknown' ? KINDS : [spk]).flatMap((k) => [true, false].map((p) => mk(k, p)));
      qText = (c) => factLine(c.p);
      ifPart = spk === 'unknown' ? (c) => `${S} is ${a(c.k)}` : (c) => factLine(c.p);
      const opening = spk === 'unknown' ? `No one knows if ${skin.intro(S)} is a knight or a knave.` : `${skin.intro(S)} is ${a(spk)}.`;
      prompt = cap(`${opening} ${S} says, “${unstop(said)}.” ${fill(fact.ask)}`);
      if (spk === 'knave' && neg) conflict = true;
    } else {
      const truth = o.truth ?? rng.pick([true, false] as const);
      ask = 'speaker';
      known = truth === 'unknown' ? 'none' : 'fact';
      cases = KINDS.flatMap((k) => (truth === 'unknown' ? [true, false] : [truth]).map((p) => mk(k, p)));
      qText = (c) => `${S} is ${a(c.k)}`;
      ifPart = truth === 'unknown' ? (c) => factLine(c.p) : (c) => `${S} is ${a(c.k)}`;
      if (truth !== 'unknown') knowText = factLine(truth);
      else doubt = `you don’t know if ${factLine(true)}`;
      // The first mention of the speaker gets the skin's intro ('Kip the wizard did not find a dragon egg.').
      const aboutSpeaker = fact.yes.includes('{n}');
      const opening = truth === 'unknown' ? '' : `${cap((truth ? fact.yes : fact.no).replace('{n}', skin.intro(S)))}. `;
      prompt = cap(`${opening}${opening && aboutSpeaker ? S : skin.intro(S)} says, “${unstop(said)}.” Is ${S} a knight or a knave?`);
    }
  } else {
    // other / speakerFromOther: the speaker says what kind the other islander is.
    const claim = is(ot, who);
    said = claimText(claim, sp, nm, 2);
    scene = speakersScene([sp], { [sp]: claim }, nm);
    truthText = `${O} is ${a(who)}`;
    const askOther = o.type === 'other';
    const mk = (k: Kind, ok: Kind): WordsCase => {
      const wordsTrue = claimTrue(claim, { [sp]: k, [ot]: ok });
      return { k, p: true, o: ok, label: `${S} is ${a(k)}, and ${O} is ${a(ok)}.`, wordsTrue, fits: (k === 'knight') === wordsTrue, q: askOther ? ok : k };
    };
    caseAsRow = (c) => caseRow({ ids: [sp, ot], claims: { [sp]: claim }, kinds: { [sp]: c.k, [ot]: c.o }, nm, onBoard: [sp], label: c.label });
    becauseOf = (c) => ({ says: `${O} is ${a(who)}.`, world: `${O} is ${a(c.o)}.`, match: c.wordsTrue });
    if (askOther) {
      ask = 'other';
      known = spk === 'unknown' ? 'none' : 'speaker';
      cases = (spk === 'unknown' ? KINDS : [spk]).flatMap((k) => KINDS.map((ok) => mk(k, ok)));
      qText = (c) => `${O} is ${a(c.o)}`;
      ifPart = spk === 'unknown' ? (c) => `${S} is ${a(c.k)}` : (c) => `${O} is ${a(c.o)}`;
      const opening = spk === 'unknown' ? `No one knows if ${skin.intro(S)} is a knight or a knave.` : `${skin.intro(S)} is ${a(spk)}.`;
      prompt = `${opening} ${S} says, “${unstop(said)}.” Is ${O} a knight or a knave?`;
      if (spk === 'knave') conflict = true;
    } else {
      // speakerFromOther: the other islander's kind is known; what is the speaker?
      const otk = rng.pick(KINDS);
      ask = 'speaker';
      known = 'other';
      cases = KINDS.map((k) => mk(k, otk));
      qText = (c) => `${S} is ${a(c.k)}`;
      ifPart = (c) => `${S} is ${a(c.k)}`;
      knowText = `${O} is ${a(otk)}`;
      prompt = `${skin.intro(O)} is ${a(otk)}. ${skin.intro(S)} says, “${unstop(said)}.” Is ${S} a knight or a knave?`;
    }
  }
  if (known === 'speaker') knowText = `${S} is ${a(spk as Kind)}`;
  if (known === 'none' && !doubt) doubt = `no one knows if ${S} is a knight or a knave`;
  // What the question states is a fact, drawn as its banner ("What is true"); everything else is only tried in a case.
  if (knowText && scene.kind === 'speakers') scene = { ...scene, fact: `${cap(knowText)}.` };

  const fitting = cases.filter((c) => c.fits);
  const answerSet = [...new Set(fitting.map((c) => c.q))];
  const ans = answerSet.length === 2 ? 'cant' : answerSet[0];
  const choices = ask === 'fact' ? YES_NO : KIND_CHOICES;
  const quoted = `“${unstop(said)}”`;
  const subject = ask === 'other' ? O : S;
  /** "“Yes” means Uma can swim." / "“Knight” means Jin is a knight." */
  const choiceMeaning = (id: string) =>
    ask === 'fact' ? `“${cap(id)}” means ${qText(cases.find((c) => c.q === id)!)}.` : `“${cap(id)}” means ${subject} is ${a(id as Kind)}.`;

  // The right answer, from the cases that work.
  let explain: string;
  if (ans === 'cant') {
    const [c1, c2] = fitting;
    // Say what is not known ("You don’t know if the dragon is asleep"), never a bare "which".
    explain = `If ${ifPart(c1)}, ${qText(c1)}. If ${ifPart(c2)}, ${qText(c2)}. ${cap(doubt)}, so you can’t tell.`;
  } else if (known === 'speaker') {
    explain = `${S} is ${a(spk as Kind)}, so ${quoted} must be ${tf(fitting[0].wordsTrue)}. So ${qText(fitting[0])}.`;
  } else {
    const wt = fitting[0].wordsTrue;
    explain = `${knowText}, so ${quoted} is ${tf(wt)}. ${wt ? 'Only a knight says true things' : 'Only a knave says false things'}, so ${S} is ${a(ans as Kind)}.`;
  }

  // When "if" tries the speaker's kind, that kind only says what the words must be (a follow step); when it tries the
  // fact, the words' truth is worked out from it.
  const ifVerb = ask === 'speaker' ? 'are' : 'must be';

  // One explanation per wrong choice, by what that choice gets wrong.
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) {
    if (ch.id === ans) continue;
    if (ch.id === 'cant') {
      // You can tell: only one case works.
      const good = fitting[0];
      const bad = cases.find((c) => !c.fits)!;
      feedback.cant = {
        headline: `You can tell, because you know ${knowText}.`,
        detail: [
          '“Can’t tell” would mean more than one case works. Here just one case works.',
          `${known === 'speaker' ? `If ${ifPart(bad)}, ${S}’s words are ${tf(bad.wordsTrue)}.` : `${S}’s words are ${tf(bad.wordsTrue)}.`} ${cap(a(bad.k))} never says ${tf(bad.wordsTrue)} words.`,
          `So ${qText(good)}.`,
        ],
        example: wordsCard(bad, S, becauseOf),
      };
    } else if (ans === 'cant') {
      // Two cases work and disagree: the pick keeps only one of them.
      const mine = fitting.find((c) => c.q === ch.id)!;
      const other = fitting.find((c) => c.q !== ch.id)!;
      feedback[ch.id] = {
        // The whole case, as the card shows it: "Vic is a knight" alone would cover a case that does not work too.
        headline: `Your answer leaves out a case that works: ${other.label}`,
        detail: [
          `${choiceMeaning(ch.id)} That is right if ${ifPart(mine)}.`,
          `But ${doubt}. If ${ifPart(other)}, ${S}’s words ${ifVerb} ${tf(other.wordsTrue)}, so ${qText(other)}.`,
          'That case works too. The two cases give different answers, so you can’t tell.',
        ],
        example: wordsCard(other, S, becauseOf, [{ who: 'Your answer', value: other.q === ch.id }]),
      };
    } else {
      // The pick needs a case where the speaker breaks the rule.
      const bad = cases.find((c) => c.q === ch.id)!;
      const wt = bad.wordsTrue;
      let headline: string;
      let detail: string[];
      if (ask === 'speaker') {
        headline = bad.k === 'knight' ? 'Your answer gives a knight false words.' : 'Your answer gives a knave true words.';
        detail = [`You know ${knowText}. So ${S}’s words, ${quoted.replace(/”$/, ',”')} are ${tf(wt)}.`, `${cap(a(bad.k))} never says ${tf(wt)} words. ${wt ? 'True words come from a knight.' : 'False words come from a knave.'}`];
      } else if (bad.k === 'knave') {
        headline = 'Your answer takes a knave’s words as true.';
        detail = [`${choiceMeaning(ch.id)} That is just what ${S}’s words say, so it would make them ${tf(wt)}.`, `But ${S} is a knave. A knave never says ${tf(wt)} words.`];
      } else {
        headline = 'Your answer makes a knight’s words false.';
        detail = [`${choiceMeaning(ch.id)} That would make ${S}’s words, ${quoted.replace(/”$/, ',”')} ${tf(wt)}.`, `But ${S} is a knight. A knight never says ${tf(wt)} words.`];
      }
      const fb: ChoiceFeedback = { headline, detail, example: wordsCard(bad, S, becauseOf, [{ who: 'Your answer', value: bad.q === ch.id }]) };
      if (conflict && ask === 'fact') {
        // A knave's "not": the trap of this item.
        fb.simpler = [`${S} says, ${quoted.replace(/”$/, '.”')}`, `${S} is a knave, so that sentence must be false.`, `It has “not” in it. It is false that ${qText(bad)}. So ${qText(fitting[0])}.`];
      }
      feedback[ch.id] = fb;
    }
  }

  // The teaching: what the words mean, every case, and the smallest worked example.
  const wt0 = cases[0].wordsTrue;
  const knowLine = known === 'speaker'
    ? `${S} is ${a(spk as Kind)}, so the words must be ${tf(spk === 'knight')}.`
    : known === 'none' ? `${cap(doubt)}, so the words could be true or false.` : `You know ${knowText}, so the words are ${tf(wt0)}.`;
  let simpler: string[];
  let remember: string[];
  if (ans === 'cant') {
    simpler = [...fitting.map((c) => `If ${ifPart(c)}, ${S}’s words ${ifVerb} ${tf(c.wordsTrue)}. So ${qText(c)}.`), 'The two cases give different answers. So you can’t tell.'];
    remember = ask === 'speaker'
      ? ['If you don’t know if the words are true, try each case.', 'Ask: “Does more than one case work?”']
      : ['If you don’t know the speaker’s kind, try a knight and then a knave.', 'Ask: “Does more than one case work?”'];
  } else if (known === 'speaker') {
    const good = fitting[0];
    const bad = cases.find((c) => !c.fits)!;
    simpler = [
      `${S} is ${a(spk as Kind)}. ${spk === 'knight' ? 'A knight’s words must be true.' : 'A knave’s words must be false.'}`,
      `${S} says, ${quoted.replace(/”$/, '.”')} So those words must be ${tf(good.wordsTrue)}.`,
      ...(good.wordsTrue ? [] : [`It is false that ${qText(bad)}.`]),
      `So ${qText(good)}.`,
    ];
    remember = ['A knight’s words must be true. A knave’s words must be false.', 'Ask: “What kind is the speaker? So what must the words be?”'];
  } else {
    simpler = [`You know ${knowText}.`, `So ${quoted} is ${tf(wt0)}.`, `${wt0 ? 'True words come from a knight' : 'False words come from a knave'}. So ${S} is ${a(ans as Kind)}.`];
    remember = ['True words come from a knight. False words come from a knave.', 'Ask: “Are the words true or false?”'];
  }

  // The hint shows one case already checked: a case where the speaker breaks the rule (there is always one).
  const others = cases.length - 1;
  const item: ChooseItem = {
    ...base,
    prompt,
    scene,
    choices,
    answer: ans,
    explain: cap(explain),
    feedback,
    hint: `Here is one case, checked for you. Check the other ${others === 1 ? 'case' : `${NUM[others]} cases`} the same way.`,
    hintCase: rowCase(caseAsRow(cases.find((c) => !c.fits)!)),
    teach: {
      rule: PUZZLE_RULE,
      terms: [caseTerm(cases[0].label), TERMS.fits, TERMS.cant],
      meaning: `${S}’s words, ${quoted.replace(/”$/, ',”')} are true only when ${truthText}. ${knowLine}`,
      casesTitle: 'Which cases fit the rule?',
      cases: cases.map((c) => wordsCard(c, S, becauseOf)),
      remember,
      simpler: simpler.map(cap),
    },
  };
  syncWhyWrong(item);
  if (conflict) item.conflict = true;
  // Mastery (a fact vs a test): a stated knave who says "not" about a fact. The kind is a fact here: reason from it.
  if (o.type === 'fact' && spk === 'knave' && o.negative) item.tags = [KNAVE_NOT];
  return { item, cast, answerSet, cases };
}

// ---------- lesson 2: who could say it? ----------

/** Ids stay fixed: 'both' is "Either kind" (a knight or a knave could say it), 'neither' is "No one". */
export type SayAnswer = 'knight' | 'knave' | 'both' | 'neither';
export const SAY_CHOICES: Choice[] = [
  { id: 'knight', label: 'Only a knight' },
  { id: 'knave', label: 'Only a knave' },
  { id: 'both', label: 'Either kind' },
  { id: 'neither', label: 'No one' },
];
/** Who each choice says could say it: [a knight, a knave]. */
export const SAY_SETS: Record<SayAnswer, [boolean, boolean]> = { knight: [true, false], knave: [false, true], both: [true, true], neither: [false, false] };
const SAY_MEANS: Record<SayAnswer, string> = {
  knight: '“Only a knight” means a knight could say it, and a knave could not.',
  knave: '“Only a knave” means a knave could say it, and a knight could not.',
  both: '“Either kind” means a knight could say it, and so could a knave.',
  neither: '“No one” means a knight could not say it, and a knave could not either.',
};

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

/** What a lesson 2 speaker may say about a partner: the same kind, different kinds, or the partner's kind. */
export const SAY_PARTNER_MENU = (partner: string): Claim[] => [
  { t: 'same', a: ME, b: partner },
  { t: 'diff', a: ME, b: partner },
  is(partner, 'knight'),
  is(partner, 'knave'),
];

/** Would the words be true if a speaker of kind k said them? A partner's kind, when the words name one, is given. */
export function sayTruth(claim: Claim, k: Kind, partner?: string, partnerKind?: Kind): boolean {
  return claimTrue(claim, partner && partnerKind ? { [ME]: k, [partner]: partnerKind } : { [ME]: k });
}

/** Could a speaker of kind k say words with this truth and still fit the rule? */
export const sayFits = (k: Kind, wordsTrue: boolean) => (k === 'knight') === wordsTrue;

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
      truthAs = { knight: sayTruth(claim, 'knight'), knave: sayTruth(claim, 'knave') };
    } else {
      partnerKind = rng.pick(KINDS);
      // No "us" words here: the question never says who "us" would be. No "and" either: "and" sentences are
      // lesson 5's idea, so lesson 2 never quizzes them.
      claim = rng.pick(SAY_PARTNER_MENU(partner));
      words = claimText(claim, ME, nm, 2);
      truthAs = { knight: sayTruth(claim, 'knight', partner, partnerKind), knave: sayTruth(claim, 'knave', partner, partnerKind) };
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
      both: 'So either kind could say it.',
      neither: 'So no one on the island could say it.',
    };
    const explain = `${lineFor('knight')} ${lineFor('knave')} ${endFor[ans]}`;
    const can: Record<Kind, boolean> = { knight: canKnight, knave: canKnave };

    // Each kind of speaker is a case. The words' truth is computed, with what they say ("I" read as the pretend
    // speaker) and who is what; the note says if that kind fits the rule.
    const nmSay: Namer = (id) => (id === ME ? 'the speaker' : cast.nm(id));
    const sayIds = o.type === 'partner' ? [ME, partner] : [ME];
    const sayCase = (k: Kind): TeachCase => {
      const v = truthAs[k];
      const label = o.type === 'partner' ? `The speaker is ${a(k)}, and ${P} is ${a(partnerKind!)}.` : `The speaker is ${a(k)}.`;
      const because: Because = claim
        ? { says: claimSays(claim, nmSay, sayIds), world: label, match: v }
        : { says: words, world: `These words are ${tf(v)}, whoever says them.`, match: v };
      return { label, truths: [{ who: 'The words', value: v, because }], note: sayNote(k, v), words: SAY_CARD_WORDS };
    };
    const kindLine = (k: Kind) => can[k]
      ? `If ${a(k)} said it, the words would be ${tf(truthAs[k])}. That fits ${a(k)}.`
      : `If ${a(k)} said it, the words would be ${tf(truthAs[k])}. ${cap(a(k))} never says ${tf(truthAs[k])} words.`;

    // One explanation per wrong choice: which kind it lets in that can't say it, or leaves out that could.
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const c of SAY_CHOICES) {
      if (c.id === ans) continue;
      const pick = c.id as SayAnswer;
      const [pk, pv] = SAY_SETS[pick];
      const offK = pk !== canKnight, offV = pv !== canKnave;
      let headline: string;
      if (offK && offV) {
        headline = pk && pv
          ? 'Your answer lets a knight say something false and a knave say something true.'
          : !pk && !pv ? 'Your answer leaves out knights and knaves, but each kind could say it.' : 'Your answer swaps knights and knaves.';
      } else if (offK) {
        headline = pk ? 'Your answer lets a knight say something false.' : 'Your answer leaves out knights, but a knight could say it.';
      } else {
        headline = pv ? 'Your answer lets a knave say something true.' : 'Your answer leaves out knaves, but a knave could say it.';
      }
      feedback[pick] = {
        headline,
        detail: [SAY_MEANS[pick], ...(offK ? [kindLine('knight')] : []), ...(offV ? [kindLine('knave')] : [])],
        example: sayCase(offK ? 'knight' : 'knave'),
      };
    }

    // What the words say, and when they are true.
    const quoted = `“${unstop(words)}”`;
    const meaning = o.type === 'fact'
      ? `${quoted} is ${tf(truthAs.knight)}, no matter who says it.`
      : `${o.type === 'partner' ? `${P} is ${a(partnerKind!)}. ` : ''}${quoted} is true only when ${whenTrue(claim!, nmSay, o.type === 'partner' ? [ME, partner] : [ME])}.`;
    const third = claim?.t === 'same' ? TERMS.same : claim?.t === 'diff' ? TERMS.diff : TERMS.noOne;
    const step = (k: Kind, n: number) => [
      `Step ${n}: pretend ${a(k)} says it. The words would be ${tf(truthAs[k])}.`,
      can[k] ? `That fits ${a(k)}, so ${a(k)} could say it.` : `${cap(a(k))} never says ${tf(truthAs[k])} words, so ${a(k)} can’t say it.`,
    ];

    const conflict = o.type === 'self' || (o.type === 'partner' && (ans === 'both' || ans === 'neither'));
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's5.l2',
      skill: 's5.cant-say',
      prompt: `${opening}Who could say, “${unstop(words)}”?`,
      // A given partner's kind is a fact; the speaker's kind is only pretend, once as a knight and once as a knave.
      scene: {
        kind: 'speakers',
        speakers: [{ id: ME, name: skin.someone, says: words }],
        rule: PUZZLE_RULE,
        ...(partnerKind ? { fact: `${P} is ${a(partnerKind)}.` } : {}),
        test: 'Pretend a knight says it. Then pretend a knave says it.',
      },
      choices: SAY_CHOICES,
      answer: ans,
      explain,
      feedback,
      // The hint shows one kind already checked: a kind that can’t say it when there is one (else the knight).
      hint: 'Here is one kind of speaker, checked for you. Check the other kind the same way.',
      hintCase: sayCase(KINDS.find((k) => !can[k]) ?? 'knight'),
      teach: {
        rule: 'A knight can say only true words. A knave can say only false words.',
        terms: [TERMS.couldSay, TERMS.either, third],
        meaning,
        casesTitle: 'Try each kind of speaker',
        cases: [sayCase('knight'), sayCase('knave')],
        remember: ['Test the words twice: once from a knight, and once from a knave.', 'Ask: “Would a knight’s words be true? Would a knave’s words be false?”'],
        simpler: [...step('knight', 1), ...step('knave', 2), endFor[ans]],
      },
    };
    syncWhyWrong(item);
    if (conflict) item.conflict = true;
    return { item, cast, claim, partner: o.type === 'partner' ? partner : undefined, partnerKind, truthAs };
  }
  throw new Error('whoCanSayItem: no item found');
}

// ---------- lesson 5: a knave's "and" and "or" ----------

export type AndOrAnswer = 'bothKnight' | 'bothKnave' | 'oneKnave' | 'oneKnight';
/** Which (x, y) cases each answer allows: [both knights, x knight only, y knight only, both knaves]. */
export const ANDOR_SETS: Record<AndOrAnswer, [boolean, boolean, boolean, boolean]> = {
  bothKnight: [true, false, false, false],
  oneKnight: [true, true, true, false],
  oneKnave: [false, true, true, true],
  bothKnave: [false, false, false, true],
};
export const ANDOR_ORDER: readonly AndOrAnswer[] = ['bothKnave', 'oneKnave', 'bothKnight', 'oneKnight'];

/**
 * What a wrong and/or choice gets wrong, from the cases it allows:
 *  - reverse: it allows just the cases where the words have the wrong truth (a knave's words taken as true,
 *    or a knight's taken as false)
 *  - swap: it is about the other kind, so it allows a case that can't happen and leaves out one that can
 *  - extra: it allows a case that can't happen
 *  - missing: it leaves out a case that can happen
 */
export type AndOrMistake = 'reverse' | 'swap' | 'extra' | 'missing';

export function andOrMistake(pick: AndOrAnswer, keep: readonly boolean[]): AndOrMistake {
  const set = ANDOR_SETS[pick];
  if (set.every((v, i) => v === !keep[i])) return 'reverse';
  const extra = set.some((v, i) => v && !keep[i]);
  const missing = set.some((v, i) => !v && keep[i]);
  return extra && missing ? 'swap' : extra ? 'extra' : 'missing';
}

export interface AndOrOpts {
  id: string;
  skin: SkinId;
  speaker?: Kind;
  op?: 'and' | 'or';
  /** The kind the sentence names: "both knights" / "both knaves". */
  part?: Kind;
}

/**
 * "Cal is a knave. Cal says, “Ava and Ben are both knights.” Which choice says exactly what you know about Ava and
 * Ben?" The four cases for Ava and Ben are listed; the ones where Cal's words fit Cal's kind are kept, and the one
 * choice that allows exactly those cases is right. Each wrong choice is explained by a case it gets wrong.
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
  const quoted = `“${unstop(words)}”`;
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
    oneKnave: `At least one of ${X} and ${Y} is a knave. It could be just one.`,
    oneKnight: `At least one of ${X} and ${Y} is a knight. It could be just one.`,
  };
  const meaning: Record<AndOrAnswer, string> = {
    bothKnight: `So ${X} and ${Y} are both knights.`,
    bothKnave: `So ${X} and ${Y} are both knaves.`,
    oneKnave: `So at least one of ${X} and ${Y} is a knave. It could be ${X}, ${Y}, or both of them.`,
    oneKnight: `So at least one of ${X} and ${Y} is a knight. It could be ${X}, ${Y}, or both of them.`,
  };
  const ruleLine = op === 'and'
    ? need ? 'An “and” sentence is true only when both parts are true.' : 'An “and” sentence is false when at least one part is false.'
    : need ? 'An “or” sentence is true when one part is true, or both parts are.' : 'An “or” sentence is false only when both parts are false.';
  const explain = `${S} is ${a(speaker)}, so ${S}’s words must be ${tf(need)}. ${ruleLine} ${meaning[ans]}`;
  const caseText = (k: KindMap) => (k[x] === k[y] ? `${X} and ${Y} are both ${k[x]}s` : `${X} is ${a(k[x])} and ${Y} is ${a(k[y])}`);
  /**
   * One case for X and Y as a card: the speaker's words (computed). For a wrong pick's example, also whether the pick
   * and the right answer are true in that case, like the NOT flip's example rows.
   */
  const card = (k: KindMap, pick?: AndOrAnswer): TeachCase => {
    const wt = claimTrue(claim, k);
    const truths: Truth[] = [{ who: `${S}’s words`, value: wt, because: claimBecause(claim, k, nm, [x, y]) }];
    if (pick) truths.push({ who: 'Your answer', value: ANDOR_SETS[pick][all.indexOf(k)] }, { who: 'The right answer', value: ANDOR_SETS[ans][all.indexOf(k)] });
    return {
      label: `${cap(caseText(k))}.`,
      truths,
      note: wt === need ? `${S} is ${a(speaker)} with ${tf(wt)} words. This case works.` : `${cap(a(speaker))} never says ${tf(wt)} words. This case does not work.`,
      words: CARD_WORDS,
    };
  };
  /** The parts of the sentence in one case, worked through: the smaller example after a miss. */
  const parts = claim.t === 'and' || claim.t === 'or' ? claim.cs : [];
  const walk = (k: KindMap): string[] => {
    const wt = claimTrue(claim, k);
    const [p1, p2] = parts.map((p) => `“${cap(whenTrue(p, nm, [x, y]))}” is ${tf(claimTrue(p, k))}`);
    return [
      `Take the case where ${caseText(k)}.`,
      `The parts of ${S}’s words: ${p1}, and ${p2}. So ${S}’s words are ${tf(wt)}.`,
      wt === need ? `${S} is ${a(speaker)}, and ${a(speaker)} can say ${tf(wt)} words. So this case can happen.` : `${S} is ${a(speaker)}, and ${a(speaker)} never says ${tf(wt)} words. So this case can’t happen.`,
    ];
  };

  // One explanation per wrong choice, by what that choice gets wrong.
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of ANDOR_ORDER) {
    if (c === ans) continue;
    const kind = andOrMistake(c, keep);
    const extra = all.find((_, i) => ANDOR_SETS[c][i] && !keep[i]);
    const missed = all.find((_, i) => !ANDOR_SETS[c][i] && keep[i]);
    const extraLine = extra ? `Your answer allows the case where ${caseText(extra)}. There, ${S}’s words are ${tf(!need)}, but ${S} is ${a(speaker)}.` : '';
    const missLine = missed ? `Your answer leaves out the case where ${caseText(missed)}. There, ${S}’s words are ${tf(need)}, so that case works.` : '';
    const headline = kind === 'reverse'
      ? speaker === 'knave' ? 'Your answer takes a knave’s words as true.' : 'Your answer takes a knight’s words as false.'
      : kind === 'swap' ? 'Your answer mixes up knights and knaves.'
        : kind === 'extra' ? 'Your answer allows a case that can’t happen.' : 'Your answer leaves out a case that can still happen.';
    const detail = kind === 'reverse'
      ? [`Your answer is what you would know if ${S}’s words were ${tf(!need)}.`, extraLine, ruleLine]
      : kind === 'swap' ? [extraLine, missLine]
        : kind === 'extra' ? [extraLine, ruleLine] : [missLine, ruleLine];
    const shown = kind === 'missing' ? missed! : extra!;
    feedback[c] = { headline, detail, example: card(shown, c), simpler: walk(shown) };
  }

  const item: ChooseItem = {
    kind: 'choose',
    id: o.id,
    stop: STOP,
    lesson: 's5.l5',
    skill: 's5.and-or',
    prompt: `${skin.intro(S)} is ${a(speaker)}. ${S} says, ${quoted.replace(/”$/, '.”')} Which choice says exactly what you know about ${X} and ${Y}?`,
    // The speaker's kind is stated, so it is a fact; the cases for the other two are what you try.
    scene: speakersScene([s], { [s]: claim }, nm, { fact: `${S} is ${a(speaker)}.`, test: `Try the four cases for ${X} and ${Y}.` }),
    choices: ANDOR_ORDER.map((id) => ({ id, label: labels[id] })),
    answer: ans,
    explain,
    feedback,
    // The hint shows one case already checked: the first case that is crossed out (there is always one).
    hint: `Here is one of the four cases for ${X} and ${Y}, checked for you. Check the other three the same way. Keep each case where ${S}’s words are ${tf(need)}.`,
    hintCase: rowCase(caseRow({ ids: [x, y, s], claims: { [s]: claim }, kinds: { ...all.find((_, i) => !keep[i])!, [s]: speaker }, nm, decide: 'keep', about: [x, y] })),
    teach: {
      rule: op === 'and'
        ? 'An “and” sentence is true only when every part is true. One false part makes it false.'
        : 'An “or” sentence is true when at least one part is true. It is false only when every part is false.',
      terms: [op === 'and' ? TERMS.and : TERMS.or, TERMS.atLeastOne, caseTerm(caseText(all[1]))],
      meaning: `${S} is ${a(speaker)}, so ${S}’s words must be ${tf(need)}. ${wordsMeaning(claim, s, nm, [x, y])}`,
      casesTitle: `The four cases for ${X} and ${Y}`,
      cases: all.map((k) => card(k)),
      // The rule for the words this speaker must say: false ones from a knave, true ones from a knight.
      remember: [
        need ? 'A true “and” needs every part to be true. A true “or” needs just one true part.' : 'A false “and” needs just one false part. A false “or” needs every part to be false.',
        'Ask: “Which of the four cases still work?”',
      ],
      simpler: [
        `List the four cases for ${X} and ${Y}. Keep the ones where ${S}’s words are ${tf(need)}.`,
        ...all.map((k) => `${cap(caseText(k))}: the words are ${tf(claimTrue(claim, k))}. ${claimTrue(claim, k) === need ? 'Keep it.' : 'Cross it out.'}`),
        `${left.length === 1 ? 'One case is' : `${cap(NUM[left.length])} cases are`} left. ${meaning[ans]}`,
      ],
    },
  };
  syncWhyWrong(item);
  if (speaker === 'knave') item.conflict = true;
  return { item, cast, claim, speaker, left };
}

// ---------- the Do step: check a given case ----------
//
// A guided board shows one case already checked, and the learner checks new cases by taps. A case gives each
// islander a kind (and, for words about a fact, says whether the fact holds). Checking it means: mark each
// speaker's words true or false, then say if the case holds (everyone fits the rule) or crashes (someone breaks
// it). Every right mark comes from claimTrue / speakerFits (or factCase, sayTruth), and every message for a wrong
// mark says what the words claim and what is true in that case. Nothing on a board is typed in by hand.

export const TRUE_FALSE: DrillOption[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
export const HOLDS_CRASHES: DrillOption[] = [{ id: 'holds', label: 'Holds' }, { id: 'crashes', label: 'Crashes' }];
export const KEEP_CROSS: DrillOption[] = [{ id: 'keep', label: 'Keep' }, { id: 'reject', label: 'Cross out' }];
export const COULD_SAY: DrillOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];

const tfId = (v: boolean) => (v ? 'true' : 'false');
const shown = (given: boolean | undefined) => (given ? { given: true } : {});

/** "Ava and Ben are both knights", "Ava, Ben and Cal are all knaves", "Ava is a knight and Ben is a knave" (no period). */
export function kindsSay(ids: readonly string[], kinds: KindMap, nm: Namer): string {
  if (ids.length >= 2 && ids.every((id) => kinds[id] === kinds[ids[0]])) return `${joinAnd(ids.map(nm))} are ${ids.length === 2 ? 'both' : 'all'} ${kinds[ids[0]]}s`;
  return kindsText(ids, kinds, nm);
}

/**
 * Why a speaker's words are true or false in a case, from the kinds of the people the words talk about: "In this
 * case, Ben is a knight. So “Ben is a knave” is false." For "and" / "or", the part that decides it is named.
 */
export function claimWhy(c: Claim, speaker: string, kinds: KindMap, nm: Namer, ids: readonly string[]): string {
  const v = claimTrue(c, kinds);
  const quote = (x: Claim) => `“${unstop(claimText(x, speaker, nm, ids.length))}”`;
  const whole = quote(c);
  const inCase = (who: readonly string[]) => `In this case, ${kindsSay(who, kinds, nm)}.`;
  const here = inCase(claimRefs(c, ids));
  switch (c.t) {
    case 'same':
    case 'diff':
      return `${here} They are ${kinds[c.a] === kinds[c.b] ? 'the same kind' : 'different kinds'}, so ${whole} is ${tf(v)}.`;
    case 'count': {
      const n = ids.filter((id) => kinds[id] === c.kind).length;
      return `${here} ${nm(speaker)} counts too, so that makes ${n === 0 ? 'no' : NUM[n]} ${c.kind}${n === 1 ? '' : 's'}. So ${whole} is ${tf(v)}.`;
    }
    case 'and': {
      if (v) return `${here} Every part is true, so ${whole} is true.`;
      const part = c.cs.find((x) => !claimTrue(x, kinds))!;
      return `${inCase(claimRefs(part, ids))} So ${quote(part)} is false, and one false part makes ${whole} false.`;
    }
    case 'or': {
      if (!v) return `${here} Every part is false, so ${whole} is false.`;
      const part = c.cs.find((x) => claimTrue(x, kinds))!;
      return `${inCase(claimRefs(part, ids))} So ${quote(part)} is true, and one true part makes ${whole} true.`;
    }
    default:
      return `${here} So ${whole} is ${tf(v)}.`;
  }
}

export interface CaseRowOpts {
  /** Everyone in the case, in the board's order. */
  ids: readonly string[];
  claims: Readonly<Claims>;
  kinds: KindMap;
  nm: Namer;
  /** Shown already checked (the worked case). */
  given?: boolean;
  /**
   * 'case' (default): does the whole case hold or crash? 'keep': the speaker's kind is known, so the case for the
   * others is kept (the words fit that kind) or crossed out.
   */
  decide?: 'case' | 'keep';
  /** Whose kinds the row's label names. Default: everyone. A 'keep' row names only the people the words are about. */
  about?: readonly string[];
  /** Who the board draws (default: everyone). Only they are named as saying nothing. */
  onBoard?: readonly string[];
  /** The row's label, when the question already words the case its own way ("Vic is a knight, and Jin is a knave."). */
  label?: string;
  /** A board's row: the label starts "Test:", since a row's kinds are only being tried, never a fact. */
  test?: boolean;
}

/**
 * What a board row built here needs for its misconceptions (kindMisconceptions): each words mark's need (the option the
 * speaker's kind demands), and whether the row breaks the rule; for a lesson 2 row, its words and Could marks too.
 * Rows are plain data, so this is kept beside them, keyed by the row itself.
 */
interface RowNeeds {
  words: Record<string, string>;
  breaks: boolean;
  say?: { words: string; could: string; truth: string; need: string; knave: boolean; can: boolean };
}
const ROW_NEEDS = new WeakMap<DrillRow, RowNeeds>();

/** The need on its own line over a row's marks: "Ben is a knave: Ben’s words must be false." */
const needLine = (name: string, k: Kind) => `${name} is ${a(k)}: ${name}’s words must be ${tf(k === 'knight')}.`;

/**
 * One case as a row: each speaker's words true or false (claimTrue), then Holds or Crashes (speakerFits), or Keep
 * or Cross out. Each words mark carries the two facts to compare (what the words say, with names, and who is what in
 * this case), and the row carries each speaker's need on its own line. Each wrong option names the mismatch.
 */
export function caseRow(o: CaseRowOpts): DrillRow {
  const { ids, claims, kinds, nm } = o;
  const id = `c-${ids.map((x) => (kinds[x] === 'knight' ? 'k' : 'v')).join('')}`;
  const speaking = ids.filter((x) => claims[x]);
  const marks: DrillMark[] = speaking.map((sp) => {
    const v = claimTrue(claims[sp], kinds);
    return {
      id: `${id}-${sp}`,
      label: `${nm(sp)}’s words`,
      options: TRUE_FALSE,
      answer: tfId(v),
      ...shown(o.given),
      why: { [tfId(!v)]: claimWhy(claims[sp], sp, kinds, nm, ids) },
      compare: { says: claimSays(claims[sp], nm, ids), world: caseWorld(claims[sp], kinds, nm, ids) },
    };
  });
  let note: string;
  let breaks: boolean;
  if (o.decide === 'keep') {
    const sp = speaking[0];
    const S = nm(sp), k = kinds[sp];
    const wt = claimTrue(claims[sp], kinds);
    const fit = speakerFits(sp, claims[sp], kinds);
    const lead = `${S} is ${a(k)}, and ${S}’s words are ${tf(wt)} in this case.`;
    marks.push({
      id: `${id}-keep`,
      label: 'Keep or cross out?',
      options: KEEP_CROSS,
      answer: fit ? 'keep' : 'reject',
      ...shown(o.given),
      why: fit ? { reject: `${lead} That fits ${a(k)}, so keep this case.` } : { keep: `${lead} ${cap(a(k))} never says ${tf(wt)} words, so cross this case out.` },
    });
    note = fit ? `${S}’s words are ${tf(wt)}. That fits ${a(k)}, so keep this case.` : `${S}’s words are ${tf(wt)}. ${cap(a(k))} never says ${tf(wt)} words, so cross this case out.`;
    breaks = !fit;
  } else {
    const b = breakers(ids, claims, kinds);
    const quiet = ids.filter((x) => !claims[x] && (o.onBoard ?? ids).includes(x));
    const lines = (who: readonly string[]) => who.map((x) => `${withWords(x, claims, kinds, nm)}.`).join(' ');
    let why: Record<string, string>;
    if (!b.length) {
      const quietLine = quiet.length ? ` ${joinAnd(quiet.map(nm))} ${quiet.length === 1 ? `says nothing, so ${nm(quiet[0])} fits` : 'say nothing, so they fit'} too.` : '';
      why = { crashes: `${lines(speaking)} ${speaking.length === 1 ? 'That fits' : 'Each one fits'} the rule.${quietLine} So this case holds.` };
      note = 'Everyone fits the rule. This case holds.';
    } else {
      const broke = `${lines(b)} ${b.length === 1 ? 'That breaks' : 'Each one breaks'} the rule, so this case crashes.`;
      why = { holds: broke };
      note = broke;
    }
    marks.push({
      id: `${id}-case`,
      label: 'This case',
      options: HOLDS_CRASHES,
      answer: b.length ? 'crashes' : 'holds',
      ...shown(o.given),
      why,
    });
    breaks = b.length > 0;
  }
  const row: DrillRow = {
    id,
    label: o.label ?? `${o.test ? 'Test: ' : ''}${cap(kindsSay(o.about ?? ids, kinds, nm))}.`,
    marks,
    note,
    needs: speaking.map((sp) => needLine(nm(sp), kinds[sp])).join(' '),
  };
  ROW_NEEDS.set(row, { words: Object.fromEntries(speaking.map((sp) => [`${id}-${sp}`, tfId(kinds[sp] === 'knight')])), breaks });
  return row;
}

/**
 * A speakers scene for words about a fact: each islander says the fact, or its "not" sentence. The banner is the rule
 * as a need (PUZZLE_RULE). shown: what is true on the board (a fact), drawn as a banner so the picture that decides the
 * words stays visible. test: what each row tries, drawn as a test-world banner beside it, so a test never reads as a
 * fact.
 */
export function factScene(fact: Fact, speakers: readonly { name: string; negative: boolean }[], shown?: string, test?: string): Scene {
  return {
    kind: 'speakers',
    speakers: speakers.map((x) => ({ id: x.name.toLowerCase(), name: x.name, says: x.negative ? fact.sayNot : fact.say })),
    rule: PUZZLE_RULE,
    ...(shown ? { fact: shown } : {}),
    ...(test ? { test } : {}),
  };
}

export interface FactRowOpts {
  /** The speaker's name. */
  name: string;
  fact: Fact;
  /** The speaker says the "not" sentence. */
  negative: boolean;
  /** The speaker's kind in this case. */
  k: Kind;
  /** Does the fact hold in this case? */
  p: boolean;
  given?: boolean;
  /** A board's row: the label starts "Test:". */
  test?: boolean;
  /** The fact is known on this board (its banner): the label names it apart from the test ("Fact: the well is full"). */
  known?: boolean;
}

/**
 * One case of words about a fact as a row (lesson 1): "Test: Ben is a knave. Fact: the well is full." The speaker's
 * words true or false, then Holds or Crashes, both from factCase. The words mark carries the two facts to compare (what
 * the words say, with the speaker's name, and what is so in this case), and the row the speaker's need.
 */
export function factRow(o: FactRowOpts): DrillRow {
  const S = o.name;
  const c = factCase(S, o.fact, o.negative, o.k, o.p, o.p ? 'yes' : 'no');
  const v = c.wordsTrue;
  const said = o.negative ? o.fact.sayNot : o.fact.say;
  const id = `${S.toLowerCase()}-${o.k}-${o.p ? 'yes' : 'no'}`;
  const label = !o.test ? c.label : o.known ? `Test: ${S} is ${a(o.k)}. Fact: ${factText(o.fact, S, o.p)}.` : `Test: ${c.label}`;
  const row: DrillRow = {
    id,
    label,
    marks: [
      {
        id: `${id}-words`,
        label: `${S}’s words`,
        options: TRUE_FALSE,
        answer: tfId(v),
        ...shown(o.given),
        why: { [tfId(!v)]: `In this case, ${factText(o.fact, S, o.p)}. ${S} says, “${unstop(said)}.” So ${S}’s words are ${tf(v)}.` },
        compare: { says: `${cap(factText(o.fact, S, !o.negative))}.`, world: `${cap(factText(o.fact, S, o.p))}.` },
      },
      {
        id: `${id}-case`,
        label: 'This case',
        options: HOLDS_CRASHES,
        answer: c.fits ? 'holds' : 'crashes',
        ...shown(o.given),
        why: c.fits
          ? { crashes: `${S} is ${a(o.k)} with ${tf(v)} words. That fits the rule, so this case holds.` }
          : { holds: `${S} is ${a(o.k)}, and ${S}’s words came out ${tf(v)}. ${cap(a(o.k))} never says ${tf(v)} words, so this case crashes.` },
      },
    ],
    note: `${cap(a(o.k))} said something ${tf(v)}. That ${c.fits ? 'fits the rule, so this case holds' : 'breaks the rule, so this case crashes'}.`,
    needs: needLine(S, o.k),
  };
  ROW_NEEDS.set(row, { words: { [`${id}-words`]: tfId(o.k === 'knight') }, breaks: !c.fits });
  return row;
}

export interface SayRowOpts {
  /** The words, with ME as the speaker. */
  claim: Claim;
  /** The partner the words name, their name and their (given) kind. */
  partner: string;
  partnerName: string;
  partnerKind: Kind;
  /** The kind of speaker to try. */
  k: Kind;
  given?: boolean;
}

/** "A knight never says false words. So a knight can’t say it." as a case note (lesson 2). */
export const sayNote = (k: Kind, wordsTrue: boolean) =>
  sayFits(k, wordsTrue) ? `${cap(a(k))} with ${tf(wordsTrue)} words fits the rule. So ${a(k)} could say it.` : `${cap(a(k))} never says ${tf(wordsTrue)} words. So ${a(k)} can’t say it.`;

/**
 * One kind of speaker as a row (lesson 2): pretend a knight (or a knave) says the words. First what the words would
 * be (sayTruth, with "I" read as that pretend speaker), then could that kind say it (sayFits). The words mark carries
 * the two facts to compare, and the row what that kind's words must be, on its own line: two steps, never one.
 */
export function sayRow(o: SayRowOpts): DrillRow {
  const P = o.partnerName;
  const v = sayTruth(o.claim, o.k, o.partner, o.partnerKind);
  const can = sayFits(o.k, v);
  const words = unstop(claimText(o.claim, ME, (x) => (x === o.partner ? P : 'Someone'), 2));
  const c = o.claim;
  const reason = c.t === 'same' || c.t === 'diff'
    ? `${P} is ${a(o.partnerKind)}. ${cap(a(o.k))} ${o.k === o.partnerKind ? 'is' : 'is not'} the same kind as ${P}.`
    : c.t === 'is' && c.who === ME ? `The speaker would be ${a(o.k)}.` : `${P} is ${a(o.partnerKind)}, no matter who says it.`;
  const id = `say-${o.k}`;
  const nmSay: Namer = (x) => (x === o.partner ? P : 'the speaker');
  const row: DrillRow = {
    id,
    label: `The speaker is ${a(o.k)}, and ${P} is ${a(o.partnerKind)}.`,
    marks: [
      {
        id: `${id}-words`,
        label: 'The words would be',
        options: TRUE_FALSE,
        answer: tfId(v),
        ...shown(o.given),
        why: { [tfId(!v)]: `${reason} So “${words}” would be ${tf(v)}.` },
        compare: { says: claimSays(o.claim, nmSay, [ME, o.partner]), world: `The speaker is ${a(o.k)}, and ${P} is ${a(o.partnerKind)}.` },
      },
      {
        id: `${id}-could`,
        label: `Could ${a(o.k)} say it?`,
        options: COULD_SAY,
        answer: can ? 'yes' : 'no',
        ...shown(o.given),
        why: can
          ? { no: `The words would be ${tf(v)}. That fits ${a(o.k)}, so ${a(o.k)} could say it.` }
          : { yes: `The words would be ${tf(v)}. ${cap(a(o.k))} never says ${tf(v)} words, so ${a(o.k)} can’t say it.` },
      },
    ],
    note: sayNote(o.k, v),
    needs: `${cap(a(o.k))}’s words must be ${tf(o.k === 'knight')}.`,
  };
  const need = tfId(o.k === 'knight');
  ROW_NEEDS.set(row, { words: { [`${id}-words`]: need }, breaks: !can, say: { words: `${id}-words`, could: `${id}-could`, truth: tfId(v), need, knave: o.k === 'knave', can } });
  return row;
}

/**
 * A board row, already checked, as a case card: the Hint's marked case. It shows the same marks the boards use (each
 * speaker's words true or false, each with its comparison: what the words say and who is what in this case) and the
 * row's note (Holds or Crashes, Keep or Cross out), so a hint models exactly the check the learner did on the boards.
 */
export function rowCase(row: DrillRow, words: BoardWords = CARD_WORDS): TeachCase {
  return {
    label: row.label,
    truths: row.marks
      .filter((m) => m.options === TRUE_FALSE)
      .map((m) => {
        const value = m.answer === 'true';
        return m.compare ? { who: m.label, value, because: { ...m.compare, match: value } } : { who: m.label, value };
      }),
    note: row.note,
    words,
  };
}

// ---------- mix-ups and "I’m confused" (docs/CONTENT_GUIDE.md, "Distinctions") ----------

const WORDS_FROM_KIND =
  'You may be treating the speaker’s kind and the truth of the words as the same thing. They are two different things. The kind only says what the words must be. To find if they are true, check what they say against this case.';
const VERDICT_CASE =
  'Your marks for the words are right. Now compare each one with what its kind needs: a knight’s words must be true, and a knave’s must be false. If one does not fit, the rule is broken.';
const NEED_AS_TRUTH =
  'You may be treating what the words would be and what this kind needs as the same thing. They are two different things. First work out the words: “I” means the pretend speaker. Then compare them with what this kind needs.';
const COULD_IS_TRUE =
  'You may be treating “the words would be true” and “a knave could say it” as the same thing. They are two different things. A knave’s words must be false. So a knave could say it only when the words would be false.';
const VERDICT_SAY =
  'The words are right. Now compare them with what this kind needs: a knight’s words must be true, and a knave’s must be false. If they match, this kind could say it.';

/**
 * The mix-ups a knights board can catch (Misconception), most specific first, worked out from the rows it is built of
 * (caseRow, factRow, sayRow), so every pattern is computed:
 *  - words-from-kind: on a row that breaks the rule, every words mark set to what the speakers' kinds demand (the kind
 *    taken to make the words true or false);
 *  - need-as-truth: on a lesson 2 row that kind can't say, the words marked as that kind's need;
 *  - could-is-true: on a lesson 2 knave row, the words right and Could set from the words alone (Yes for true words);
 *    for a knight that pattern is right, so only knave rows have it;
 *  - verdict-only: every words mark right, and the verdict (Holds or Crashes, Keep or Cross out, Could) wrong.
 */
export function kindMisconceptions(rows: readonly DrillRow[]): Misconception[] {
  const tap = rows.filter((r) => r.marks.every((m) => !m.given));
  const needs = tap.map((r) => ROW_NEEDS.get(r)).filter((n): n is RowNeeds => !!n);
  const out: Misconception[] = [];
  for (const n of needs) if (!n.say && n.breaks) out.push({ id: 'words-from-kind', when: 'picks', picks: n.words, text: WORDS_FROM_KIND });
  for (const n of needs) if (n.say && !n.say.can) out.push({ id: 'need-as-truth', when: 'picks', picks: { [n.say.words]: n.say.need }, text: NEED_AS_TRUTH });
  for (const n of needs) {
    if (n.say?.knave) out.push({ id: 'could-is-true', when: 'picks', picks: { [n.say.words]: n.say.truth, [n.say.could]: n.say.truth === 'true' ? 'yes' : 'no' }, text: COULD_IS_TRUE });
  }
  out.push({ id: 'verdict-only', when: 'verdict-only', text: needs.some((n) => n.say) ? VERDICT_SAY : VERDICT_CASE });
  return out;
}

/** Kind vs truth: a tested kind does not decide the words. Names that are on no board and in no quiz (Max, Lou). */
const KIND_Q: ConfusedQuestion = {
  q: 'We test Max as a knave. Does that decide if Max’s words are true or false?',
  options: [{ label: 'Yes: they are false' }, { label: 'No: what they say, checked against the case, decides', right: true }, { label: 'Not sure' }],
  teach: 'No. Max’s kind does not make the words true or false. What they say, checked against the case, decides. The kind only says what the words must be. If a knave’s words come out true, that case crashes.',
};
/** Kind vs truth, the other way: true words from a knave stay true, and the case crashes. */
const CRASH_Q: ConfusedQuestion = {
  q: 'In a case we test, a knave’s words come out true. What does that tell you?',
  options: [{ label: 'The words must be false after all' }, { label: 'This case crashes: a knave never says true words', right: true }, { label: 'Not sure' }],
  teach: 'The words stay true: what they say fits the case. The kind only says what the words must be. True words from a knave break the rule, so that case crashes.',
};
/** A fact vs a test: a crash shows the test is wrong, never the fact. */
const FACT_Q: ConfusedQuestion = {
  q: 'The gate is open. That is a fact. We test Max as a knave, and that case crashes. What does the crash tell you?',
  options: [{ label: 'The gate is not open after all' }, { label: 'Max can’t be a knave', right: true }, { label: 'Not sure' }],
  teach: 'A crash shows the test is wrong, never the fact. The gate stays open. Max’s kind was only a test, and it crashed. So Max is not a knave: Max is a knight.',
};
/** Would be vs must be (lesson 2): work out the words with "I" as the pretend speaker first. */
const WOULD_Q: ConfusedQuestion = {
  q: 'Pretend a knave says, “I am a knave.” Would the words be true or false?',
  options: [{ label: 'False, because a knave says them' }, { label: 'True: “I” means a knave, and the speaker is one', right: true }, { label: 'Not sure' }],
  teach: 'Work out the words first. “I” means the pretend speaker, a knave. The words say the speaker is a knave, and that is so. So they would be true. A knave’s words must be false, so a knave can’t say them.',
};
/** Would be vs must be: then compare with the need. */
const NEED_Q: ConfusedQuestion = {
  q: 'A knave’s words must be false. Pretend a knave says some words, and they would be true. Could a knave say them?',
  options: [{ label: 'Yes, because the words would be true' }, { label: 'No: true words do not fit a knave', right: true }, { label: 'Not sure' }],
  teach: 'No. “Would be true” is what the words are. “Must be false” is what a knave needs. They do not match, so a knave can’t say them.',
};
/** Inside a guess vs known. */
const INSIDE_Q: ConfusedQuestion = {
  q: 'Inside the guess “Max is a knave,” we found that Lou is a knight. Then the guess crashed. What do we know about Lou now?',
  options: [{ label: 'Lou is a knight' }, { label: 'Nothing yet: that was inside the guess', right: true }, { label: 'Not sure' }],
  teach: 'Nothing yet. “Lou is a knight” came from pretending Max is a knave. The guess crashed, so throw it away, and everything in it. You know only this: Max is a knight. Start again from that.',
};
/** The follow step: false words mean what they say is not so. */
const FOLLOW_Q: ConfusedQuestion = {
  q: 'In a guess, Max is a knave. Max says, “Lou and I are different kinds.” So Max’s words must be false. What does that tell you?',
  options: [{ label: 'Lou and Max are different kinds' }, { label: 'Lou and Max are the same kind, so Lou is a knave', right: true }, { label: 'Not sure' }],
  teach: 'False words mean what they say is not so. They say different kinds, so Lou and Max are the same kind. Max is a knave in this guess, so Lou is a knave too, inside the guess.',
};

/** "I’m confused" on lesson 1's boards: the kind vs the truth of the words, both ways, then a fact vs a test. */
export const kindConfused = (): ConfusedQuestion[] => [KIND_Q, CRASH_Q, FACT_Q];
/** "I’m confused" on a later case board (lessons 4 and 5): the kind vs the truth of the words, both ways. */
export const truthConfused = (): ConfusedQuestion[] => [KIND_Q, CRASH_Q];
/** "I’m confused" on lesson 2's boards: what the words would be, then what the kind needs. */
export const sayConfused = (): ConfusedQuestion[] => [WOULD_Q, NEED_Q];
/** "I’m confused" on a guess board or puzzle: inside the guess vs known, the follow step, and the kind vs the truth. */
export const guessConfused = (): ConfusedQuestion[] => [INSIDE_Q, FOLLOW_Q, KIND_Q];

/**
 * The method's steps on a full-scaffold row board, one per mark to tap in board order, so the strip lights the mark the
 * learner is on: each words mark first (checked against the case), then the verdict (compared with the kind). Numbered
 * by case, so no two steps read the same.
 */
export function boardSteps(rows: readonly DrillRow[]): string[] {
  const step = (m: DrillMark, r: DrillRow) =>
    m.options === TRUE_FALSE
      ? m.label === 'The words would be' ? 'work out what the words would be' : `check ${m.label} against the case`
      : m.options === COULD_SAY
        ? 'compare with what this kind needs'
        : m.options === KEEP_CROSS
          ? 'compare with the kind, then keep or cross out'
          : `compare with ${r.marks.filter((x) => x.options === TRUE_FALSE).length === 1 ? 'the kind' : 'each kind'}, then Holds or Crashes`;
  return rows.flatMap((r, i) => r.marks.filter((m) => !m.given).map((m) => `Case ${i + 1}: ${step(m, r)}`));
}

// ---------- lesson 1's contrast: the kind we test vs the truth of the words ----------

/**
 * The kind vs the truth of the words, as two cases side by side: the same speaker, tested as the same kind, saying the
 * same words, in two cases that differ only in the fact. The words are true in one and false in the other, so one case
 * crashes and the other holds. Every truth and verdict comes from factCase.
 */
export function kindContrastScene(name: string, fact: Fact, negative: boolean, k: Kind): Extract<Scene, { kind: 'contrast' }> {
  const said = negative ? fact.sayNot : fact.say;
  const claim = factText(fact, name, !negative);
  const panel = (p: boolean): ContrastPanel => {
    const c = factCase(name, fact, negative, k, p, '');
    return {
      world: `Test: ${c.label}`,
      who: name,
      says: said,
      truth: c.wordsTrue,
      because: `It says ${claim}. In this case, ${factText(fact, name, p)}. ${c.wordsTrue ? 'They match, so the words are true.' : 'They do not match, so the words are false.'}`,
      then: `${cap(a(k))} with ${tf(c.wordsTrue)} words ${c.fits ? 'fits the rule. This case holds.' : 'breaks the rule. This case crashes.'}`,
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(true), panel(false)],
    ask: {
      q: `Did ${name} change?`,
      a: `No. ${name} is tested as ${a(k)} both times, with the same words. Only the case changed, and the truth of the words changed with it. ${name}’s kind says what the words must be, not what they are.`,
    },
  };
}

// ---------- lesson 3's contrast: inside a guess vs known ----------

/** The one guess of a worked puzzle (explainSolve), with every kind in its world settled when it crashed. */
function workedGuess(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): Guess & { world: KindMap } {
  const g = explainSolve(ids, claims, answer, nm)?.guesses[0];
  if (!g || ids.some((id) => !g.world[id])) throw new Error('a worked guess settles every kind before it crashes');
  return g as Guess & { world: KindMap };
}

/**
 * Inside a guess vs known, as two cases side by side: the speaker whose words crash the worked guess, with the kinds
 * inside the guess, then with the kinds known after the crash (the answer). Every truth comes from claimTrue and every
 * verdict from speakerFits; the guess is the one explainSolve makes.
 */
export function guessContrastScene(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): Extract<Scene, { kind: 'contrast' }> {
  const g = workedGuess(ids, claims, answer, nm);
  const who = g.breaker;
  const c = claims[who];
  const panel = (kinds: KindMap, known: boolean): ContrastPanel => {
    const v = claimTrue(c, kinds);
    const fits = speakerFits(who, c, kinds);
    const verdict = known
      ? `${cap(a(kinds[who]))} with ${tf(v)} words ${fits ? 'fits the rule. This is known.' : 'breaks the rule.'}`
      : `${cap(a(kinds[who]))} with ${tf(v)} words ${fits ? 'fits the rule.' : 'breaks the rule. The guess crashes: throw it away.'}`;
    return {
      world: `${known ? 'Known' : 'Inside the guess'}: ${kindsText(ids, kinds, nm)}.`,
      who: nm(who),
      says: claimText(c, who, nm, ids.length),
      truth: v,
      because: `It says ${whenTrue(c, nm, ids)}. Here, ${kindsSay(claimRefs(c, ids), kinds, nm)}. So the words are ${tf(v)}.`,
      then: verdict,
    };
  };
  const flipped = ids.find((id) => id !== g.who && g.world[id] !== answer[id]) ?? g.who;
  return {
    kind: 'contrast',
    pairs: [panel(g.world, false), panel(answer, true)],
    ask: {
      q: `${nm(flipped)} was ${a(g.world[flipped])} inside the guess, and then ${a(answer[flipped])}. Is that a problem?`,
      a: 'No. The first was only inside the guess, and the guess crashed. Only what comes after the crash is known.',
    },
    words: { worldTag: 'Who is what' },
  };
}

/** One line of a worked guess, to sort: inside the guess, or known. */
export interface GuessLine {
  text: string;
  where: 'guess' | 'known';
}

/**
 * The lines of a worked guess, to sort (computed from explainSolve): each kind found inside the guess and what the
 * guessed islander's words must be there, then each kind known after the crash and what those words must be now. Only
 * islanders whose kind flips are used, so no line is in both. Mixed, so the order gives nothing away.
 */
export function guessLines(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer): GuessLine[] {
  const g = workedGuess(ids, claims, answer, nm);
  const flipped = ids.filter((id) => g.world[id] !== answer[id]);
  const line = (id: string, k: Kind) => `${nm(id)} is ${a(k)}.`;
  const inside: GuessLine[] = [...flipped.map((id) => ({ text: line(id, g.world[id]), where: 'guess' as const })), { text: `${nm(g.who)}’s words must be ${tf(g.kind === 'knight')}.`, where: 'guess' }];
  const known: GuessLine[] = [...flipped.map((id) => ({ text: line(id, answer[id]), where: 'known' as const })), { text: `${nm(g.who)}’s words must be ${tf(answer[g.who] === 'knight')}.`, where: 'known' }];
  const turned = [...inside.slice(1), inside[0]];
  return turned.flatMap((x, i) => [x, ...(known[i] ? [known[i]] : [])]);
}

const SORT_OPTIONS: DrillOption[] = [{ id: 'guess', label: 'Inside the guess' }, { id: 'known', label: 'Known' }];
const GUESS_AS_KNOWN =
  'You may be treating what you found inside a guess and what you know as the same thing. They are two different things. Everything after “Suppose” is pretend. When the guess crashes, all of it is thrown away.';
const KNOWN_AS_GUESS =
  'You may be treating what comes after the crash as part of the guess. They are two different things. The crash shows the guess is wrong, so the other kind is known. What follows from it is known too.';

/**
 * The guess-vs-known board: sort the lines of the worked guess into "inside the guess" and "known". Every answer comes
 * from guessLines (explainSolve). A line from inside the guess marked Known, or the other way round, names the belief.
 */
export function guessSortDrill(ids: readonly string[], claims: Readonly<Claims>, answer: KindMap, nm: Namer, o: { id: string; afterCard?: number; scene: Scene }): DrillStep {
  const g = workedGuess(ids, claims, answer, nm);
  const guess = `${nm(g.who)} is ${a(g.kind)}`;
  const lines = guessLines(ids, claims, answer, nm);
  const rows: DrillRow[] = lines.map((l, i) => {
    const said = unstop(l.text);
    const why: Record<string, string> = l.where === 'guess'
      ? { known: said === guess ? `“${said}” is the guess itself. It crashed, so it was thrown away.` : `“${said}” came from pretending ${guess}. That guess crashed, so this line was thrown away with it.` }
      : { guess: `“${said}” comes after the crash. The crash showed ${nm(g.who)} can’t be ${a(g.kind)}, so this is known.` };
    return {
      id: `line${i + 1}`,
      label: `Line ${i + 1}: ${l.text}`,
      marks: [{ id: `line${i + 1}-where`, label: 'Inside the guess, or known?', options: SORT_OPTIONS, answer: l.where, why }],
    };
  });
  const flipped = ids.filter((id) => g.world[id] !== answer[id]);
  return {
    id: o.id,
    title: 'Inside the guess, or known?',
    body: [
      `Here are lines from the worked example. Some came inside the guess “${guess}.” Some came after it crashed.`,
      'Mark each line: inside the guess, or known?',
    ],
    scene: o.scene,
    rows,
    ...(o.afterCard !== undefined ? { afterCard: o.afterCard } : {}),
    distinction: GUESS_VS_KNOWN.id,
    misconceptions: lines.map((l, i) =>
      l.where === 'guess'
        ? { id: 'guess-as-known', when: 'picks' as const, picks: { [`line${i + 1}-where`]: 'known' }, text: GUESS_AS_KNOWN }
        : { id: 'known-as-guess', when: 'picks' as const, picks: { [`line${i + 1}-where`]: 'guess' }, text: KNOWN_AS_GUESS },
    ),
    confused: guessConfused(),
    words: GUESS_WORDS,
    done: `Right. Everything inside the guess was thrown away when it crashed. What comes after the crash is known: ${kindsText(flipped, answer, nm)}.`,
  };
}

const GUESS_OPTIONS: DrillOption[] = [{ id: 'knight', label: 'Knight' }, { id: 'knave', label: 'Knave' }, { id: 'open', label: 'Not sure' }];

/**
 * A thinking board for a puzzle (Item.scratch, "the guess board"): a Guess row for a pretend kind and what follows from
 * it, and a Known row for what is known for sure, so a guess is never written down as a fact. It is never checked. Its
 * marks' answers are the explanation's own guess (explainSolve) and the answer, or "Not sure" where the guess left a
 * kind open.
 */
export function guessScratch(ids: readonly string[], nm: Namer, answer: KindMap, solve: Solve): DrillStep {
  const inside = solve.guesses[0]?.inside ?? {};
  const row = (id: string, label: string, kinds: Partial<KindMap>): DrillRow => ({
    id,
    label,
    marks: ids.map((p) => ({ id: `${id}-${p}`, label: nm(p), options: GUESS_OPTIONS, answer: kinds[p] ?? 'open', why: {} })),
  });
  return {
    id: 'scratch',
    title: 'Your guess board',
    body: [
      'Mark it if it helps. Nothing on it is checked.',
      'Guess row: pick one islander and a kind. Then mark what follows, inside the guess. If the guess crashes, throw that row away.',
      'Known row: mark only what you know for sure.',
    ],
    rows: [row('guess', 'Guess (pretend)', inside), row('known', 'Known (for sure)', answer)],
    done: '',
    words: GUESS_WORDS,
  };
}

// ---------- reading an item's plan back (for new examples after a miss) ----------
//
// Items are plain data, so a new example that matches a missed item is planned from what the item shows: its
// choices, its answer, the words in the bubble and the first sentence of the question.

const firstKind = (prompt: string): Kind | null => {
  const m = /^[^“]*? is a (knight|knave)\. /.exec(prompt);
  return m ? (m[1] as Kind) : null;
};
const isNegative = (said: string) => SKIN_IDS.some((s) => SKINS[s].facts.some((x) => x.sayNot === said));
const bubble = (item: ChooseItem) => (item.scene?.kind === 'speakers' ? item.scene.speakers[0] : null);

/** A lesson 1 item's plan (type, speaker, "not", what is known), or null when it is not a lesson 1 item. */
export function wordsPlanOf(item: ChooseItem): Omit<WordsOpts, 'id' | 'skin'> | null {
  const sp = bubble(item);
  if (item.lesson !== 's5.l1' || !sp) return null;
  const negative = isNegative(sp.says);
  const unknown = item.prompt.startsWith('No one knows');
  if (item.choices[0].id === 'yes') return { type: 'fact', speaker: unknown ? 'unknown' : firstKind(item.prompt) ?? 'unknown', negative };
  if (/^\S+ is a (knight|knave)\.$/.test(sp.says)) {
    if (item.prompt.endsWith(`Is ${sp.name} a knight or a knave?`)) return { type: 'speakerFromOther' };
    return { type: 'other', speaker: unknown ? 'unknown' : firstKind(item.prompt) ?? 'unknown' };
  }
  const before = item.prompt.slice(0, item.prompt.indexOf(' says, “'));
  // A known fact makes the words true or false, and the answer says which: knight for true words.
  const truth = /\. /.test(before) ? (item.answer === 'knight') !== negative : 'unknown';
  return { type: 'kindFromFact', negative, truth };
}

/** A lesson 2 item's plan: what kind of words, and the answer. */
export function sayPlanOf(item: ChooseItem): { type: SayType; selfKind?: Kind; target: SayAnswer } | null {
  const sp = bubble(item);
  if (item.lesson !== 's5.l2' || !sp) return null;
  const target = item.answer as SayAnswer;
  const self = /^I am a (knight|knave)\.$/.exec(sp.says);
  if (self) return { type: 'self', selfKind: self[1] as Kind, target };
  if (KNOWN_FACTS.some((x) => x.text === sp.says)) return { type: 'fact', target };
  return { type: 'partner', target };
}

/** Which answers each lesson 2 type can have. */
export const SAY_TARGETS: Record<SayType, readonly SayAnswer[]> = { self: ['both', 'neither'], fact: ['knight', 'knave'], partner: ['knight', 'knave', 'both', 'neither'] };

/** A lesson 5 item's plan: the speaker's kind, "and" or "or", and the kind the sentence names. */
export function andOrPlanOf(item: ChooseItem): { speaker: Kind; op: 'and' | 'or'; part: Kind } | null {
  const sp = bubble(item);
  const speaker = firstKind(item.prompt);
  if (item.lesson !== 's5.l5' || !sp || !speaker) return null;
  return { speaker, op: / or /.test(sp.says) ? 'or' : 'and', part: /knave/.test(sp.says) ? 'knave' : 'knight' };
}
