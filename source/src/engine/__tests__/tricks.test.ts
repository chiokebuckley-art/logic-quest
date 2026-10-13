/**
 * Stop 12 · Spot the Trick. Every answer is worked out again here by a second method, never by calling the code that
 * set it: Stop 6’s move table for the flip tricks, group pictures (every way the groups could overlap) for the middle
 * trick, every way three kids could pick from three games for the swap trick, truth tables for the circle, the story’s
 * own doors for the two-doors trick (the doors it leaves open, the pair the either-or offers, the one the NOT closes),
 * thing-by-thing counts for too few, and crowd counts for everybody says (every crowd size, every count that is
 * “most”, and the claim true or false). Lessons 5 and 6 are worked out from each story’s own sentences: a truth table
 * over the claim (and the good twin’s fact and its if–then rule) for the tricks about people, a walk along the chain of
 * steps (a step follows only where a rule for it is given) for the slippery slope, and the list of possible causes (an
 * only-rule rules out every other one) for after-therefore-because. Adding what a trick’s reason leaves out turns it
 * into a proof.
 */
import { describe, expect, it } from 'vitest';
import { stop12 } from '../../content/stop12';
import { STOPS, stopById } from '../../content/stops';
import { S12_WORLD } from '../../content/world/s12';
import { SOON_WORLD, WORLD } from '../../content/world';
import { CASES as ARG_CASES, SHAPES as ARG_SHAPES, SHAPE_IDS, STORY_TOPICS, claimText, givenTexts, holds as argHolds, isNoShape, type Arg as S18Arg } from '../puzzles/arguments';
import { MOVE_FACT, MOVE_TAGS, ROWS, litHolds, ruleHolds, type Lit, type Move } from '../puzzles/conditionals';
import {
  AFTER_TOPICS,
  ALL_ARGS,
  AUTHORITY_TOPICS,
  CHAIN_TOPICS,
  CIRCLE_TOPICS,
  DOOR_TOPICS,
  FAMILIES,
  FLIP_TOPICS,
  HASTY_TOPICS,
  LEAVES_OUT,
  LESSON_TRICKS,
  LOWER_STARTS,
  MIDDLE_ONE,
  MIDDLE_TWO,
  MOVE_CLAIM,
  ONLY_TOPICS,
  PEOPLE_TOPICS,
  PERSON_TOPICS,
  POPULAR_TOPICS,
  POST_TOPICS,
  SLOPE_TOPICS,
  STEP_TOPICS,
  SWAP_TOPICS,
  TRICK_KINDS,
  TRUE_DOOR_TOPICS,
  TRUE_TRICK,
  TWIST_TOPICS,
  VOTE_TOPICS,
  W_APPLES,
  W_BEE,
  W_BEE_ANT,
  W_BELL,
  W_CAR,
  W_CEREAL,
  W_COIN,
  W_FASTEST,
  W_FISH,
  W_LAKE,
  W_POOL,
  W_RAIN,
  W_SNOW,
  W_SPORTS,
  W_SUN,
  W_SWAP,
  W_VOTE,
  againItem,
  mid,
  afterArg,
  allCases,
  circleArg,
  doorArg,
  flipArg as flipOf,
  hastyArg,
  oneArg,
  peopleArg,
  popularArg,
  stepArg,
  swapArg,
  twoArg,
  voteArg,
  caseItem,
  claimIn,
  doorItem,
  enoughItem,
  nameItem,
  proveItem,
  saysAgain,
  reasonsOf,
  trueItem,
  verdictOf,
  whyItem,
  type AfterTopic,
  type Arg,
  type Case,
  type DoorTopic,
  type Family,
  type PeopleTopic,
  type StepTopic,
  type TrickMade,
  type Verdict,
} from '../puzzles/tricks';
import {
  AFTER_ROWS,
  AFTER_VS_CAUSE,
  DOOR_ROWS,
  ENOUGH_ROWS,
  EACH_VS_ONE,
  LEAVES_ROWS,
  LIBRARY_ROWS,
  SAY_ROWS,
  SAY_VS_TRUE,
  TP_ROWS,
  TRUE_VS_PROVES,
  TWO_VS_ALL,
  WHO_VS_WHAT,
  W_FAN,
  W_LIGHTNING,
  W_OCTOPUS,
  W_PUPPIES,
  W_SHIRTS,
  W_SUNSCREEN,
} from '../puzzles/trickBoards';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, Scene } from '../types';

const SEEDS = 200;
const choose = (m: TrickMade) => m.item as ChooseItem;

// ---------- the second methods ----------

/** Stop 6’s table: a move proves its claim when the claim is true in every row that keeps the rule and fits the fact. */
function flipVerdict(move: Move): Verdict {
  const fact = MOVE_FACT[move];
  const claim: Lit = MOVE_CLAIM[move];
  const rows = ROWS.filter((r) => ruleHolds(r) && litHolds(fact, r));
  if (rows.every((r) => litHolds(claim, r))) return 'proves';
  return MOVE_TAGS[move] === 'trap-then' ? 'flip' : MOVE_TAGS[move] === 'trap-not-if' ? 'not' : 'proves';
}

/** Every way the groups could overlap: which kinds of thing (in A? in M? in B?) exist. */
type Kind3 = [boolean, boolean, boolean];
const KINDS3: Kind3[] = Array.from({ length: 8 }, (_, b) => [!!(b & 1), !!(b & 2), !!(b & 4)]);
const worlds3 = (): Kind3[][] => Array.from({ length: 256 }, (_, s) => KINDS3.filter((_, i) => (s >> i) & 1));
/** “All A are M. All B are M. So all A are B.”: follows when no picture with both givens true has an A that is not a B. */
const twoGroupsFollow = () => worlds3().filter((w) => w.every(([a, m]) => !a || m) && w.every(([, m, b]) => !b || m)).every((w) => w.every(([a, , b]) => !a || b));
/** “All A are M. x is M. So x is A.” (good: “x is A. So x is M.”), with x one kind of thing in the picture. */
function oneFollows(good: boolean): boolean {
  for (const w of worlds3()) {
    if (!w.every(([a, m]) => !a || m)) continue;
    for (const x of w) {
      const [a, m] = x;
      if (good ? a && !m : m && !a) return false;
    }
  }
  return true;
}

/** Every way three kids could each pick one of three games: does “each has one” force “one game for all”? */
function swapFollows(good: boolean): boolean {
  for (let f = 0; f < 27; f++) {
    const picks = [f % 3, Math.floor(f / 3) % 3, Math.floor(f / 9)];
    if (good) {
      // “Game 0 is every kid’s favorite. So kid 0’s favorite is game 0.”
      if (picks.every((p) => p === 0) && picks[0] !== 0) return false;
    } else if (!picks.every((p) => p === picks[0])) return false;
  }
  return true;
}

/** Thing by thing: n things, the first k checked and all had the feature. Does that force all n? */
function allForced(n: number, k: number): boolean {
  for (let b = 0; b < 2 ** n; b++) {
    const w = Array.from({ length: n }, (_, i) => ((b >> i) & 1) === 1);
    if (w.slice(0, k).every(Boolean) && !w.every(Boolean)) return false;
  }
  return true;
}

/** A sentence’s words, lower case, each with an end -s taken off (so “skates” meets “skate”, “brings” meets “bring”). */
const stems = (s: string) =>
  s
    .toLowerCase()
    .replace(/’s\b/g, '')
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/s$/, '') : w));

/**
 * The two-doors trick, worked out from the story alone (never from the argument the generator built). The story lists
 * every door that is really there: those are the doors it leaves open. A door’s own words are the ones no other door
 * has (“draw” in “Ana draws.”). The either-or offers the doors whose own words it names; a door the story leaves open
 * that the either-or does not offer is shut out, though it can really happen. The NOT given closes the door whose own
 * words it names. The doors still open are the ones the either-or offers and the NOT does not close.
 */
function doorWork(t: DoorTopic) {
  const own = (d: string) => stems(d).filter((w) => t.doors.every((o) => o === d || !stems(o).includes(w)));
  const names = (text: string, d: string) => own(d).some((w) => stems(text).includes(w));
  const open = [...t.doors];
  const offered = open.filter((d) => names(t.either, d));
  const closed = open.filter((d) => names(t.notA, d));
  return { open, offered, shut: open.filter((d) => !offered.includes(d)), closed, left: offered.filter((d) => !closed.includes(d)), named: (d: string) => names(t.setting, d) };
}
/** Proves, or the two-doors trick: an either-or that shuts out an open door is false; else the one door left must be the claim. */
function doorsVerdict(t: DoorTopic, claim: string): Verdict {
  const w = doorWork(t);
  if (w.offered.length !== 2 || w.closed.length !== 1) throw new Error(`${t.id}: an either-or offers two doors, and the NOT closes one`);
  if (w.shut.length) return 'dilemma';
  if (w.left.length !== 1 || w.left[0] !== claim) throw new Error(`${t.id}: the claim is not the one door left`);
  return 'proves';
}
/** Every door story, the quiz ones and the worked ones (cards and boards). */
const doorTopic = (id: string) => [...DOOR_TOPICS, ...TRUE_DOOR_TOPICS, W_SPORTS, W_COIN, ...DOOR_ROWS.map((r) => r.topic)].find((x) => x.id === id)!;

/**
 * Everybody says, worked out with counts. A world is a crowd of n people, the k of them who say the claim (or vote for
 * it), and whether the claim is really true. The given “most say it” keeps the worlds where k is more than half of n.
 * A plain crowd has no rule that ties the count to the claim. A vote does: its rule says the most votes (or picks)
 * decide, so the claim is true in every world where most voted for it.
 */
interface CrowdWorld {
  n: number;
  k: number;
  truth: boolean;
}
const CROWD_WORLDS: CrowdWorld[] = Array.from({ length: 9 }, (_, i) => i + 1).flatMap((n) => Array.from({ length: n + 1 }, (_, k) => [true, false].map((truth) => ({ n, k, truth }))).flat());
const most = (w: CrowdWorld) => 2 * w.k > w.n;
/** The topic’s own words tie the count to the claim: a rule that the most votes or picks decide. */
const tiedByRule = (rule: string | undefined) => rule !== undefined && /\bthe most (votes|picks)\b/.test(rule);
/** The worlds that fit “most say it” and the rule, when there is one. */
const crowdLeft = (tied: boolean) => CROWD_WORLDS.filter((w) => most(w) && (!tied || w.truth));
const crowdVerdict = (tied: boolean): Verdict => (crowdLeft(tied).every((w) => w.truth) ? 'proves' : 'popular');
/** A topic of the everybody-says family, from the raw story data: a plain crowd or a vote with its rule. */
function crowdTopic(id: string) {
  const crowd = [...POPULAR_TOPICS, W_SUN, W_LIGHTNING].find((x) => x.id === id);
  const vote = [...VOTE_TOPICS, W_VOTE, W_SHIRTS].find((x) => x.id === id);
  if (!crowd === !vote) throw new Error(`crowdTopic: ${id}`);
  return { crowd, vote, tied: tiedByRule(vote?.rule) };
}

/**
 * Lesson 5, from the story’s own sentences: a truth table. The trick’s reason is a fact about something else (the one who
 * made the claim, a claim nobody made, a famous name), so it is true in every row of the claim. The good twin’s rule
 * “If <fact>, <claim>.” is false only in the row where the fact is true and the claim false, and its fact is true. The
 * reason proves the claim when the claim is true in every row left.
 */
function peopleVerdict(t: PeopleTopic, good: boolean): Verdict {
  const rows = [true, false].flatMap((fact) => [true, false].map((claim) => ({ fact, claim })));
  const left = good ? rows.filter((r) => r.fact && (!r.fact || r.claim)) : rows;
  return left.every((r) => r.claim) ? 'proves' : t.family;
}
/** Every Lesson 5 story, the quiz ones and the worked ones (cards and boards). */
const peopleTopic = (id: string) => [...PEOPLE_TOPICS, W_POOL, W_LAKE, W_CEREAL, W_OCTOPUS].find((x) => x.id === id)!;

/**
 * The slippery slope, as a walk along the chain of steps: the first step happens; a step follows from the one before
 * only where the story gives a rule for that link. Every way the next step and the end could go is kept unless a given
 * link rules it out. The end is forced when it happens in every way kept.
 */
function stepVerdict(t: StepTopic): Verdict {
  const links = t.chain ? 2 : 0;
  const ways = [true, false].flatMap((next) => [true, false].map((end) => ({ next, end })));
  const kept = ways.filter((w) => (links < 1 || w.next) && (links < 2 || !w.next || w.end));
  return kept.every((w) => w.end) ? 'proves' : 'slope';
}
const stepTopic = (id: string) => [...STEP_TOPICS, W_FISH, W_SNOW].find((x) => x.id === id)!;

/**
 * After-therefore-because, as a list of what could have caused the second thing: the first thing, or something else.
 * The order rules out neither. An only-rule rules out everything else. The first thing is proved to be the cause when
 * it is the only cause left.
 */
function afterVerdict(t: AfterTopic): Verdict {
  const causes = ['the first thing', 'something else'].filter((c) => !t.only || c === 'the first thing');
  return causes.length === 1 && causes[0] === 'the first thing' ? 'proves' : 'after';
}
const afterTopic = (id: string) => [...AFTER_TOPICS, W_CAR, W_BELL, W_FAN, W_SUNSCREEN].find((x) => x.id === id)!;

/** The verdict of any argument, worked out by its family’s second method. */
function secondVerdict(a: Arg): Verdict {
  switch (a.family) {
    case 'flip':
      return flipVerdict(a.move!);
    case 'middle':
      return (a.shape === 'two' ? twoGroupsFollow() : oneFollows(a.shape === 'one-good')) ? 'proves' : 'middle';
    case 'swap':
      return swapFollows(a.shape === 'swap-good') ? 'proves' : 'swap';
    case 'circle': {
      // A circle: one given has the same truth as the claim in every case (a truth table), and it is one of the topic’s
      // rewordings of the claim. A good reason is a rule and a fact.
      const t = CIRCLE_TOPICS.find((x) => x.id === a.topic)!;
      const same = a.givens.some((g) => allCases(a).every((c) => g.holds(c) === a.claim.holds(c)) && t.again.includes(g.text));
      return same ? 'circle' : 'proves';
    }
    case 'doors':
      // The story’s doors, the pair the either-or offers and the door the NOT closes.
      return doorsVerdict(doorTopic(a.topic), a.claim.text);
    case 'hasty': {
      const t = HASTY_TOPICS.find((x) => x.id === a.topic)!;
      return allForced(Math.min(t.n, 12), a.shape === 'all-checked' ? Math.min(t.n, 12) : t.k) ? 'proves' : 'hasty';
    }
    case 'popular':
      // Crowd counts: with no rule that ties the count to the claim, “most say it” leaves the claim free.
      return crowdVerdict(crowdTopic(a.topic).tied);
    case 'person':
    case 'twist':
    case 'authority':
      return peopleVerdict(peopleTopic(a.topic), a.shape.endsWith('-good'));
    case 'slope':
      return stepVerdict(stepTopic(a.topic));
    case 'after':
      return afterVerdict(afterTopic(a.topic));
  }
}

// ---------- the model ----------

describe('the model: every verdict, worked out again', () => {
  it('every argument’s verdict matches its family’s second method, and no claim is one the givens make false', () => {
    for (const a of ALL_ARGS) expect(verdictOf(a), a.id).toBe(secondVerdict(a));
  });

  it('every family has tricks and good reasons, and a trap (a trick whose claim can turn out true)', () => {
    for (const f of FAMILIES) {
      const args = ALL_ARGS.filter((a) => a.family === f);
      expect(args.some((a) => verdictOf(a) === 'proves'), f).toBe(true);
      expect(args.some((a) => verdictOf(a) !== 'proves'), f).toBe(true);
      expect(args.some((a) => verdictOf(a) !== 'proves' && a.truth !== false && allCases(a).some((c) => claimIn(a, c))), f).toBe(true);
    }
  });

  it('the flip tricks are Stop 6’s trap moves: the THEN part as the fact (trap-then) and NOT the IF part (trap-not-if)', () => {
    expect(MOVE_TAGS.ac).toBe('trap-then');
    expect(MOVE_TAGS.da).toBe('trap-not-if');
    for (const t of FLIP_TOPICS) {
      const at = (m: Move) => verdictOf(ALL_ARGS.find((a) => a.id === `${t.id}:${m}`)!);
      expect([at('mp'), at('mt'), at('ac'), at('da')], t.id).toEqual(['proves', 'proves', 'flip', 'not']);
    }
  });

  it('every story names its doors: each third door is in the first line, and a true either-or names just two', () => {
    for (const t of DOOR_TOPICS) {
      expect(t.doors.length, t.id).toBe(3);
      const own = new Set(t.either.toLowerCase().split(/[^a-z]+/));
      const words = t.doors[2].toLowerCase().replace(/[.’]/g, ' ').split(/[^a-z]+/).filter((w) => w.length > 2 && !own.has(w));
      expect(words.some((w) => t.setting.toLowerCase().includes(w.replace(/s$/, ''))), `${t.id}: “${t.doors[2]}” is in “${t.setting}”`).toBe(true);
    }
    for (const t of TRUE_DOOR_TOPICS) expect(t.doors.length, t.id).toBe(2);
  });

  it('no quiz argument shares a given or a claim with a worked example', () => {
    const worked: Arg[] = [
      ...(['mp', 'mt', 'ac', 'da'] as Move[]).map((m) => flipOf(W_RAIN, m)),
      oneArg(W_BEE),
      oneArg(W_BEE, true),
      twoArg(W_BEE_ANT),
      twoArg(W_PUPPIES),
      swapArg(W_SWAP),
      swapArg(W_SWAP, true),
      circleArg(W_FASTEST),
      circleArg(W_FASTEST, { again: 1 }),
      circleArg(W_FASTEST, { good: true }),
      doorArg(W_SPORTS),
      doorArg(W_COIN),
      ...DOOR_ROWS.map((r) => doorArg(r.topic)),
      hastyArg(W_APPLES),
      hastyArg(W_APPLES, true),
      popularArg(W_SUN),
      popularArg(W_LIGHTNING),
      voteArg(W_VOTE),
      voteArg(W_SHIRTS),
      ...[W_POOL, W_LAKE, W_CEREAL, W_OCTOPUS].map((t) => peopleArg(t)),
      peopleArg(W_POOL, true),
      stepArg(W_FISH),
      stepArg(W_SNOW),
      ...[W_CAR, W_BELL, W_FAN, W_SUNSCREEN].map(afterArg),
    ];
    const lines = new Set(worked.flatMap((a) => [a.claim.text, ...a.givens.map((g) => g.text)]));
    for (const a of ALL_ARGS) for (const t of [a.claim.text, ...a.givens.map((g) => g.text)]) expect(lines.has(t), `${a.id}: “${t}”`).toBe(false);
  });

  it('every topic has its own sentences: no given, claim, case or setting belongs to two topics', () => {
    const owner = new Map<string, string>();
    for (const a of ALL_ARGS) {
      for (const t of [a.setting, a.claim.text, ...a.givens.map((g) => g.text), ...a.vars.flatMap((v) => v.values.map((x) => x.text))]) {
        const was = owner.get(t);
        expect(was === undefined || was === a.topic, `“${t}” is in ${was} and ${a.topic}`).toBe(true);
        owner.set(t, a.topic);
      }
    }
  });

  it('every family has topics in at least two skins, so a pack can change skins', () => {
    const pools: Record<string, readonly { skin: string }[]> = {
      flip: FLIP_TOPICS,
      middle: [...MIDDLE_ONE, ...MIDDLE_TWO],
      swap: SWAP_TOPICS,
      circle: CIRCLE_TOPICS,
      doors: [...DOOR_TOPICS, ...TRUE_DOOR_TOPICS],
      hasty: HASTY_TOPICS,
      popular: [...POPULAR_TOPICS, ...VOTE_TOPICS],
      person: PERSON_TOPICS,
      twist: TWIST_TOPICS,
      authority: AUTHORITY_TOPICS,
      slope: STEP_TOPICS,
      after: AFTER_TOPICS,
    };
    expect(Object.keys(pools).sort()).toEqual([...FAMILIES].sort());
    for (const [f, ts] of Object.entries(pools)) expect(new Set(ts.map((t) => t.skin)).size, f).toBeGreaterThanOrEqual(2);
  });

  it('a circle topic’s rewordings mean the claim; its new reasons are other things to check', () => {
    for (const t of CIRCLE_TOPICS) {
      const rs = reasonsOf(t);
      expect(rs.filter(saysAgain).map((r) => r.text)).toEqual([...t.again]);
      for (const n of t.news) expect(n, t.id).not.toBe(t.claim[0]);
    }
  });

  it('topics: unique settings (none the start of another), and every sentence starts with a name or a small word', () => {
    const settings = ALL_ARGS.map((a) => `${a.topic}|${a.setting}`);
    const bySetting = new Map<string, string>();
    for (const s of settings) {
      const [topic, setting] = s.split('|');
      if (bySetting.has(setting)) expect(bySetting.get(setting), setting).toBe(topic);
      bySetting.set(setting, topic);
    }
    const all = [...bySetting.keys()];
    for (const a of all) for (const b of all) if (a !== b) expect(b.startsWith(a), `${a} / ${b}`).toBe(false);
    const NAMES = /^(Kai|Kim|Omar|Omar’s|Tess’s|Rex|Leo|Leo’s|Blaze|Blaze’s|Zed|Zed’s|Nia|Mia|Jay|Zog|Lumo|Mo|Bix|Tom|Shape|Ava’s|Ben’s|Ana|Ana’s|Gus|Gus’s|Puff|Box|Card|Button|Kai’s|Max|Tia|Sam|Rosa’s|Merla|Buzz|Pip|Lightning)$/;
    for (const a of ALL_ARGS) for (const t of [...a.vars.flatMap((v) => v.values.map((x) => x.text)), a.claim.text]) {
      const w = t.split(' ')[0];
      expect(LOWER_STARTS.has(w) || NAMES.test(w), `${a.id}: “${t}”`).toBe(true);
    }
  });
});

// ---------- the items ----------

const families = FAMILIES as readonly Family[];

describe('every item: the answer is the one the second method gives', () => {
  it('does the reason prove the claim? proves for a good reason, a trick (might be true or false) for a trick, never “must be false”', () => {
    for (const f of families) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = proveItem(createRng(seed), f);
      const it = choose(m);
      const v = secondVerdict(m.arg);
      expect(it.answer, `${f} ${seed}`).toBe(v === 'proves' ? 'proves' : 'trick');
      expect(it.choices.map((c) => c.id)).toEqual(['proves', 'trick', 'false']);
      expect(Object.keys(it.feedback!).sort()).toEqual(['proves', 'trick', 'false'].filter((x) => x !== it.answer).sort());
      expect(m.tag).toBe(f === 'doors' ? 'dilemma' : f);
    }
  });

  it('name it: a good reason or one of the lesson’s two tricks, by the second method', () => {
    const lessons: [string, Verdict[]][] = [['s12.l1', ['flip', 'not']], ['s12.l2', ['middle', 'swap']], ['s12.l3', ['circle', 'dilemma']], ['s12.l4', ['hasty', 'popular']], ['s12.l5', ['person', 'twist', 'authority']], ['s12.l6', ['slope', 'after']]];
    for (const [lesson, tricks] of lessons) {
      const answers = new Set<string>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const m = nameItem(createRng(seed), lesson);
        const it = choose(m);
        expect(it.choices.map((c) => c.id), lesson).toEqual(['proves', ...tricks]);
        expect(it.answer, `${lesson} ${seed}`).toBe(secondVerdict(m.arg));
        answers.add(it.answer);
      }
      expect([...answers].sort(), lesson).toEqual(['proves', ...tricks].sort());
    }
  });

  it('which case shows it: the one choice that fits every given and breaks the claim', () => {
    for (const f of ['flip', 'middle', 'swap', 'hasty', 'popular', 'slope'] as Family[]) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = caseItem(createRng(seed), f);
      const it = choose(m);
      expect(secondVerdict(m.arg), `${f} ${seed}`).not.toBe('proves');
      const cases = allCases(m.arg);
      const right = it.choices.filter((ch) => {
        const c = cases[Number(ch.id.replace('case', '')) - 1];
        expect(ch.label).toBe(m.arg.vars.map((v) => v.values.find((x) => x.id === c[v.id])!.text).join(' '));
        return m.arg.givens.every((g) => g.holds(c)) && !m.arg.claim.holds(c);
      });
      expect(right.map((c) => c.id), `${f} ${seed}`).toEqual([it.answer]);
    }
  });

  it('the trap: a trick whose claim turns out true. The answer is “a trick”, the picture tags the claim true, and it is a conflict item', () => {
    for (const f of families) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = trueItem(createRng(seed), f);
      const it = choose(m);
      expect(secondVerdict(m.arg), `${f} ${seed}`).not.toBe('proves');
      expect(m.arg.truth, `${f} ${seed}: a claim that is really false is never a trap`).not.toBe(false);
      expect(it.answer).toBe('trick');
      expect(it.tags).toEqual([TRUE_TRICK.tag]);
      expect(it.conflict).toBe(true);
      const s = it.scene as Extract<Scene, { kind: 'argument' }>;
      expect(s.realClaim).toBe(true);
      // Every given is really true, but a doors trick’s either-or, which leaves out a real door.
      expect(s.real).toEqual(m.arg.givens.map((g) => !g.door));
      expect(it.prompt).toMatch(/[Tt]he claim is (really )?true/);
      expect(it.feedback!.true.headline).toContain('true is not the same as proved');
      // Its twin (for new examples): a good reason whose claim is true. Not tagged, since it is not a trick.
      const g = trueItem(createRng(seed), f, { good: true });
      expect(secondVerdict(g.arg)).toBe('proves');
      expect(choose(g).answer).toBe('forces');
      expect(choose(g).tags).toBeUndefined();
    }
  });

  it('which reason says the claim again: the one that means the claim, by its truth table', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = againItem(createRng(seed));
      const it = choose(m);
      const t = CIRCLE_TOPICS.find((x) => x.id === m.arg.topic)!;
      const right = it.choices.filter((c) => t.again.includes(c.label));
      expect(right.map((c) => c.id), `${seed}`).toEqual([it.answer]);
      expect(it.choices.filter((c) => t.news.includes(c.label)).length).toBe(2);
    }
  });

  it('which door does given 1 shut out: the door the story leaves open that the either-or does not offer', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = doorItem(createRng(seed));
      const it = choose(m);
      const w = doorWork(doorTopic(m.arg.topic));
      expect(w.shut.length, m.arg.topic).toBe(1);
      expect(it.choices.find((c) => c.id === it.answer)!.label).toBe(w.shut[0]);
      expect(it.choices.map((c) => c.label).sort()).toEqual([...w.open].sort());
    }
  });

  it('which reason proves all, or at least one: worked out thing by thing', () => {
    const claims = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = enoughItem(createRng(seed));
      const it = choose(m);
      const t = HASTY_TOPICS.find((x) => x.id === m.arg.topic)!;
      const all = it.prompt.includes(`that all ${t.n}`);
      claims.add(all ? 'all' : 'some');
      const right = it.choices.find((c) => c.id === it.answer)!.label;
      if (all) expect(right, `${seed}`).toContain(`all ${t.n}`);
      else expect(right, `${seed}`).toMatch(new RegExp(`1 ${t.thing[0]}, and it was ${t.is[0]}\\.$`));
      // Thing by thing: with all checked, every way that fits is all; with one found, at least one is.
      if (all) expect(allForced(Math.min(t.n, 12), Math.min(t.n, 12))).toBe(true);
    }
    expect([...claims].sort()).toEqual(['all', 'some']);
  });

  it('the why item: a trick whose claim is true; its reason is the right choice, and “its claim is false” is always wrong', () => {
    const kinds = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = whyItem(createRng(seed));
      const it = choose(m);
      const v = secondVerdict(m.arg);
      expect(v, `${seed}`).not.toBe('proves');
      expect(it.answer).toBe(v);
      kinds.add(it.answer);
      expect(it.choices.map((c) => c.id)).toContain('false');
      expect(it.tags).toEqual(['why']);
      expect(it.conflict).toBe(true);
      expect(m.tag).toBe('why');
      for (const c of it.choices) expect(c.label.length, c.label).toBeGreaterThan(12);
      // The wrong tricks come from other lessons, so they never sound like the right one.
      const lessonOf = (k: string) => ({ flip: 1, not: 1, middle: 2, swap: 2, circle: 3, dilemma: 3, hasty: 4, popular: 4, person: 5, twist: 5, authority: 5, slope: 6, after: 6 })[k];
      for (const c of it.choices) if (c.id !== 'false' && c.id !== it.answer) expect(lessonOf(c.id)).not.toBe(lessonOf(it.answer));
    }
    expect([...kinds].sort()).toEqual([...TRICK_KINDS].sort());
  });

  it('every item: feedback for every wrong choice and none for the right one, whyWrong in step, a hint case that is not the answer, teaching', () => {
    const makers: (() => TrickMade)[] = [];
    for (let seed = 1; seed <= 60; seed++) {
      for (const f of families) makers.push(() => proveItem(createRng(seed), f), () => trueItem(createRng(seed), f), () => trueItem(createRng(seed), f, { good: true }));
      for (const f of ['flip', 'middle', 'swap', 'hasty', 'popular', 'slope'] as Family[]) makers.push(() => caseItem(createRng(seed), f));
      for (const l of ['s12.l1', 's12.l2', 's12.l3', 's12.l4', 's12.l5', 's12.l6']) makers.push(() => nameItem(createRng(seed), l));
      makers.push(() => againItem(createRng(seed)), () => doorItem(createRng(seed)), () => enoughItem(createRng(seed)), () => whyItem(createRng(seed)));
    }
    for (const make of makers) {
      const m = make();
      const it = choose(m);
      expect(new Set(it.choices.map((c) => c.label)).size).toBe(it.choices.length);
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback![c.id]).toBeUndefined();
        else {
          expect(it.feedback![c.id]?.headline.trim(), `${m.kind} ${c.id}`).toBeTruthy();
          expect(it.whyWrong![c.id]).toContain(it.feedback![c.id].headline);
        }
      }
      expect(it.hintCase, m.kind).toBeDefined();
      const hint = [it.hintCase!.label, it.hintCase!.note ?? ''].join(' ');
      expect(hint).not.toContain(it.choices.find((c) => c.id === it.answer)!.label);
      expect(hint).not.toMatch(/always match|It is the claim again|goes in a circle/);
      expect(it.teach?.rule.trim()).toBeTruthy();
      expect(it.teach?.cases?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(make().item).toEqual(m.item);
    }
  });

  it('wrong-answer words stand on their own: the why item names its trick, the enough hint is a marked reason', () => {
    const names: Record<string, string> = {
      flip: 'the flip trick',
      not: 'the NOT trick',
      middle: 'the middle trick',
      swap: 'the swap trick',
      circle: 'the circle trick',
      dilemma: 'the two-doors trick',
      hasty: 'the too-few trick',
      popular: 'the everybody-says trick',
      person: 'attacking the person',
      twist: 'the twisted-claim trick',
      authority: 'the famous-name trick',
      slope: 'the slippery slope',
      after: 'the after-therefore-because trick',
    };
    for (const k of TRICK_KINDS) for (let seed = 1; seed <= 20; seed++) {
      const it = choose(whyItem(createRng(seed), { kind: k }));
      // “Its claim is false” is wrong: its words end by naming the trick the reason plays, never a line cut from the middle.
      expect(it.feedback!.false.detail.at(-1), `${k} ${seed}`).toMatch(new RegExp(`^This is ${names[k]}\\. `));
    }
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = enoughItem(createRng(seed));
      const it = choose(m);
      // The hint shows a wrong reason (never the answer) with its verdict worked out thing by thing.
      expect(it.hintCase!.note, `${seed}`).toMatch(/So this does not prove the claim\.$/);
    }
  });

  it('the answer is not always in the same place', () => {
    for (const make of [(s: number) => caseItem(createRng(s), 'flip'), (s: number) => trueItem(createRng(s), 'middle'), (s: number) => againItem(createRng(s)), (s: number) => doorItem(createRng(s)), (s: number) => whyItem(createRng(s))]) {
      const at = new Set<number>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const it = choose(make(seed));
        at.add(it.choices.findIndex((c) => c.id === it.answer));
      }
      expect(at.size).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------- two doors and everybody says, worked out from the story alone ----------

const lower = (s: string) => s.toLowerCase();
const truthsOf = (c: { truths?: { who: string; value: boolean }[] }) => Object.fromEntries((c.truths ?? []).map((x) => [x.who, x.value]));

describe('the two-doors trick: the story’s own doors, worked out again', () => {
  it('each story: the doors it leaves open, the pair the either-or offers, and the door left out', () => {
    for (const t of DOOR_TOPICS) {
      const w = doorWork(t);
      // The first line names every door that is really there, so each one is open.
      for (const d of w.open) expect(w.named(d), `${t.id}: “${d}” is in “${t.setting}”`).toBe(true);
      expect(w.offered.length, t.id).toBe(2);
      expect(w.shut.length, `${t.id}: the pair leaves one open door out`).toBe(1);
      expect(w.offered).not.toContain(w.shut[0]);
      // The NOT closes one offered door, so without the shut-out door the claim would be the one door left.
      expect(w.closed.length, t.id).toBe(1);
      expect(w.offered).toContain(w.closed[0]);
      expect(w.left.length, t.id).toBe(1);
      expect(doorsVerdict(t, w.left[0])).toBe('dilemma');
    }
    for (const t of TRUE_DOOR_TOPICS) {
      const w = doorWork(t);
      expect(w.offered, `${t.id}: the pair is every door`).toEqual(w.open);
      expect(w.shut, t.id).toEqual([]);
      expect(w.left.length, t.id).toBe(1);
      expect(doorsVerdict(t, w.left[0])).toBe('proves');
    }
  });

  it('does it prove it, and name it: the answer and every headline match the doors the story leaves open', () => {
    const verdicts = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = proveItem(createRng(seed), 'doors');
      const it = choose(m);
      const t = doorTopic(m.arg.topic);
      const w = doorWork(t);
      const s = it.scene as Extract<Scene, { kind: 'argument' }>;
      expect(s.givens, m.arg.id).toEqual([t.either, t.notA]);
      expect(s.claim, m.arg.id).toBe(w.left[0]);
      const v = doorsVerdict(t, s.claim);
      verdicts.add(v);
      expect(it.answer, m.arg.id).toBe(v === 'proves' ? 'proves' : 'trick');
      const fb = it.feedback!;
      if (v === 'dilemma') {
        // “Proves” is not yet right: given 1 shuts out the open door, and the example is that door.
        expect(fb.proves.headline).toBe('Your answer says the reason proves the claim, but given 1 shuts out a door that is really there.');
        expect(lower(fb.proves.detail.join(' '))).toContain(lower(mid(w.shut[0])));
        expect(fb.proves.example!.label).toContain(w.shut[0]);
        expect(truthsOf(fb.proves.example!)['Given 1'], m.arg.id).toBe(false);
        // “Must be false” is not yet right: the claim’s door is still open, and the givens the story tells fit it.
        expect(fb.false.headline).toBe('Your answer says the claim must be false, but a trick does not make a claim false.');
        expect(fb.false.example!.label).toContain(w.left[0]);
        expect(truthsOf(fb.false.example!)['The claim']).toBe(true);
      } else {
        expect(fb.trick.headline).toBe('Your answer calls it a trick, but the givens force the claim.');
        expect(fb.false.headline).toBe('Your answer says the claim must be false, but the givens force it to be true.');
      }
      const n = nameItem(createRng(seed), 's12.l3', { family: 'doors' });
      const ni = choose(n);
      const nw = doorWork(doorTopic(n.arg.topic));
      const nv = doorsVerdict(doorTopic(n.arg.topic), (ni.scene as Extract<Scene, { kind: 'argument' }>).claim);
      expect(ni.answer, n.arg.id).toBe(nv);
      if (nv === 'dilemma') {
        expect(ni.feedback!.circle.headline).toBe('Your answer names the circle trick, but this is the two-doors trick.');
        expect(ni.feedback!.proves.example!.label).toContain(nw.shut[0]);
      } else {
        expect(ni.feedback!.dilemma.headline).toBe('Your answer calls it the two-doors trick, but the givens force the claim.');
      }
    }
    expect([...verdicts].sort()).toEqual(['dilemma', 'proves']);
  });

  it('the trap: the claim’s door really happens, the either-or is still false, so it is still a trick', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = trueItem(createRng(seed), 'doors');
      const it = choose(m);
      const t = doorTopic(m.arg.topic);
      const w = doorWork(t);
      const s = it.scene as Extract<Scene, { kind: 'argument' }>;
      expect(w.shut.length, `${t.id}: a trap always shuts out a door`).toBe(1);
      expect(doorsVerdict(t, s.claim)).toBe('dilemma');
      // The story ends on the claim’s door: offered and not closed, so given 2 is really true. Given 1 shuts out a door.
      expect(w.left).toEqual([s.claim]);
      expect(s.real).toEqual([w.shut.length === 0, !w.closed.includes(s.claim)]);
      expect(it.answer).toBe('trick');
      expect(it.feedback!.forces.headline).toBe('Your answer says the reason proves the claim, but given 1 shuts out a door that is really there.');
      expect(it.feedback!.true.headline).toContain('true is not the same as proved');
      expect(lower(it.feedback!.true.detail.join(' '))).toContain(lower(mid(w.shut[0])));
      expect(it.feedback!.true.example!.label).toContain(w.shut[0]);
      const g = trueItem(createRng(seed), 'doors', { good: true });
      const gw = doorWork(doorTopic(g.arg.topic));
      expect(gw.shut, g.arg.id).toEqual([]);
      expect(choose(g).answer).toBe('forces');
    }
  });
});

describe('everybody says: crowd counts, worked out again', () => {
  it('a count of “most” never settles a claim about the world; a vote with its rule settles a pick', () => {
    // Every crowd size and every count that is “most”: the claim can be true, and it can be false.
    for (const w of CROWD_WORLDS.filter(most)) {
      const same = crowdLeft(false).filter((x) => x.n === w.n && x.k === w.k);
      expect(same.map((x) => x.truth).sort(), `${w.k} of ${w.n}`).toEqual([false, true]);
    }
    expect(crowdVerdict(false)).toBe('popular');
    // A vote: its rule makes the pick true in every world where most voted for it.
    expect(crowdLeft(true).length).toBeGreaterThan(0);
    expect(crowdVerdict(true)).toBe('proves');
    for (const t of POPULAR_TOPICS) {
      expect(t.crowd, t.id).toMatch(/^Most /);
      // A plain crowd has no rule that ties its count to the claim.
      expect('rule' in t, t.id).toBe(false);
      // What would settle it is a fact to check, never the crowd.
      expect(t.check, t.id).not.toContain(t.crowd);
      expect(t.check, t.id).not.toMatch(/\bmost\b/i);
    }
    for (const t of VOTE_TOPICS) {
      expect(t.voted[0], t.id).toMatch(/^Most /);
      expect(tiedByRule(t.rule), t.id).toBe(true);
    }
  });

  it('the stories agree: the same kind of count goes with a false claim in one story and a true claim in another', () => {
    const falseOnes = POPULAR_TOPICS.filter((t) => t.truth === false);
    const trueOnes = POPULAR_TOPICS.filter((t) => t.truth === true);
    expect(falseOnes.length).toBeGreaterThan(0);
    expect(trueOnes.length).toBeGreaterThan(0);
    // Most kids say both, so the count can’t be what makes one true and the other false.
    for (const t of [...falseOnes, ...trueOnes]) expect(crowdVerdict(crowdTopic(t.id).tied), t.id).toBe('popular');
  });

  it('does it prove it, and name it: the answer and every headline match the counts', () => {
    const verdicts = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = proveItem(createRng(seed), 'popular');
      const it = choose(m);
      const { crowd, tied } = crowdTopic(m.arg.topic);
      const v = crowdVerdict(tied);
      verdicts.add(v);
      expect(it.answer, m.arg.id).toBe(v === 'proves' ? 'proves' : 'trick');
      const fb = it.feedback!;
      if (v === 'popular') {
        const t = crowd!;
        // The two examples have the same count (most say it) and opposite truths.
        expect(fb.proves.headline).toBe('Your answer says the reason proves the claim, but one case fits the givens and breaks the claim.');
        expect(fb.proves.example!.label).toContain(t.x[1]);
        expect(truthsOf(fb.proves.example!)).toEqual({ 'Given 1': true, 'The claim': false });
        expect(fb.false.headline).toBe('Your answer says the claim must be false, but a trick does not make a claim false.');
        expect(fb.false.example!.label).toContain(t.x[0]);
        expect(truthsOf(fb.false.example!)).toEqual({ 'Given 1': true, 'The claim': true });
        for (const e of [fb.proves.example!, fb.false.example!]) expect(e.label).toContain(t.crowd);
        // The teaching ends on what would really settle it.
        expect(it.teach!.simpler!.at(-1)).toBe(t.check);
      } else {
        expect(fb.trick.headline).toBe('Your answer calls it a trick, but the givens force the claim.');
        expect(fb.false.headline).toBe('Your answer says the claim must be false, but the givens force it to be true.');
      }
      const n = nameItem(createRng(seed), 's12.l4', { family: 'popular' });
      const ni = choose(n);
      const nv = crowdVerdict(crowdTopic(n.arg.topic).tied);
      expect(ni.answer, n.arg.id).toBe(nv);
      if (nv === 'popular') expect(ni.feedback!.hasty.headline).toBe('Your answer names the too-few trick, but this is the everybody-says trick.');
      else expect(ni.feedback!.popular.headline).toBe('Your answer calls it the everybody-says trick, but the givens force the claim.');
    }
    expect([...verdicts].sort()).toEqual(['popular', 'proves']);
  });

  it('the trap: most say it and it turns out true, yet the same count fits a false claim, so it is still a trick', () => {
    const truths = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = trueItem(createRng(seed), 'popular');
      const it = choose(m);
      const { crowd, tied } = crowdTopic(m.arg.topic);
      expect(crowd, `${m.arg.id}: a trap is a crowd, not a vote`).toBeDefined();
      expect(crowdVerdict(tied)).toBe('popular');
      expect(crowd!.truth, `${m.arg.id}: a claim that is really false is never a trap`).not.toBe(false);
      truths.add(String(crowd!.truth));
      expect(it.prompt).toContain(crowd!.truth === true ? 'The claim is really true' : 'Later, you find out the claim is true');
      // The crowd really does say it, and the claim is really true.
      const s = it.scene as Extract<Scene, { kind: 'argument' }>;
      expect(s.real).toEqual([true]);
      expect(s.realClaim).toBe(true);
      expect(it.answer).toBe('trick');
      expect(it.feedback!.forces.headline).toBe('Your answer says the reason proves the claim, but one case fits the givens and breaks the claim.');
      expect(it.feedback!.true.headline).toContain('true is not the same as proved');
      // Its example: the same count, with the claim false.
      expect(truthsOf(it.feedback!.true.example!)).toEqual({ 'Given 1': true, 'The claim': false });
      expect(it.feedback!.true.example!.label).toContain(crowd!.x[1]);
      expect(it.teach!.simpler!.at(-1)).toBe(crowd!.check);
      const g = trueItem(createRng(seed), 'popular', { good: true });
      expect(crowdTopic(g.arg.topic).tied, g.arg.id).toBe(true);
      expect(choose(g).answer).toBe('forces');
    }
    expect([...truths].sort()).toEqual(['true', 'undefined']);
  });
});

// ---------- the stop ----------

const [l1, l2, l3, l4, l5, l6] = stop12.lessons;
const boards = (l: typeof l1) => l.drill!;

describe('the lessons', () => {
  it('six lessons, each pass rule asks for the trap, and every planned pack holds exactly one trap', () => {
    expect(stop12.lessons.map((l) => l.id)).toEqual(['s12.l1', 's12.l2', 's12.l3', 's12.l4', 's12.l5', 's12.l6']);
    for (const l of stop12.lessons) {
      expect(l.pass).toEqual({ firstTry: 3, include: [TRUE_TRICK] });
      for (let seed = 1; seed <= SEEDS; seed++) {
        const items = l.practice(createRng(seed)) as ChooseItem[];
        const traps = items.filter((i) => i.tags?.includes(TRUE_TRICK.tag));
        expect(traps.length, `${l.id} ${seed}`).toBe(1);
        expect(traps[0].answer).toBe('trick');
        expect((traps[0].scene as Extract<Scene, { kind: 'argument' }>).realClaim).toBe(true);
        // Lesson 5’s trap is a trick about people; Lesson 6’s is an after-therefore claim that happens to be right.
        if (l === l5) expect(['s12.person', 's12.twist', 's12.authority']).toContain(traps[0].skill);
        if (l === l6) expect(traps[0].skill).toBe('s12.after');
        expect(l.practice(createRng(seed))).toEqual(items);
      }
    }
  });

  it('pack makeup: the planned kinds in order, in at least two skins, a topic used once per pack', () => {
    const skills: Record<string, RegExp[]> = {
      's12.l1': [/^s12\.flip$/, /^s12\.flip$/, /^s12\.flip$/, /^s12\.flip$/],
      's12.l2': [/^s12\.middle$/, /^s12\.swap$/, /^s12\.(middle|swap)$/, /^s12\.(middle|swap)$/],
      's12.l3': [/^s12\.circle$/, /^s12\.dilemma$/, /^s12\.(circle|dilemma)$/, /^s12\.dilemma$/],
      's12.l4': [/^s12\.hasty$/, /^s12\.popular$/, /^s12\.(hasty|popular)$/, /^s12\.why$/],
      's12.l5': [/^s12\.person$/, /^s12\.twist$/, /^s12\.authority$/, /^s12\.(person|twist|authority)$/, /^s12\.(person|twist|authority)$/],
      's12.l6': [/^s12\.slope$/, /^s12\.slope$/, /^s12\.after$/, /^s12\.after$/, /^s12\.(slope|after)$/],
    };
    const skinOf = (it: Item) => ALL_ARGS.find((a) => it.prompt.startsWith(a.setting))!.skin;
    for (const l of stop12.lessons) for (let seed = 1; seed <= SEEDS; seed++) {
      const items = l.practice(createRng(seed));
      expect(items.length).toBe(skills[l.id].length);
      items.forEach((it, k) => expect(it.skill, `${l.id} ${seed} ${k}`).toMatch(skills[l.id][k]));
      expect(new Set(items.map(skinOf)).size, `${l.id} ${seed}: skins vary`).toBeGreaterThanOrEqual(2);
      expect(new Set(items.map(looks)).size).toBe(items.length);
      expect(new Set(items.map((it) => ALL_ARGS.find((a) => it.prompt.startsWith(a.setting))!.topic)).size, `${l.id} ${seed}: a topic once per pack`).toBe(items.length);
    }
  });

  it('each skill has many different-looking items, so a new example after a miss looks new', () => {
    const seen: Record<string, Set<string>> = {};
    for (let seed = 1; seed <= SEEDS; seed++) for (const l of stop12.lessons) for (const it of l.practice(createRng(seed))) (seen[it.skill] ??= new Set()).add(looks(it));
    for (const [skill, s] of Object.entries(seen)) expect(s.size, skill).toBeGreaterThanOrEqual(20);
  });

  it('terms: each word is on the lesson whose card names it', () => {
    const want: Record<string, string[]> = {
      's12.l1': ['fallacy', 'affirming the consequent', 'denying the antecedent'],
      's12.l2': ['middle trick', 'swap trick'],
      's12.l3': ['circular reasoning', 'false dilemma'],
      's12.l4': ['hasty generalization', 'appeal to popularity'],
      's12.l5': ['attacking the person', 'straw man', 'appeal to authority'],
      's12.l6': ['slippery slope', 'after-therefore-because'],
    };
    for (const l of stop12.lessons) {
      expect((l.terms ?? []).map((t) => t.term)).toEqual(want[l.id]);
      const cards = l.ideas.flatMap((c) => c.body).join(' ').toLowerCase();
      for (const t of l.terms ?? []) {
        expect(cards, `${l.id}: ${t.term} is named on a card`).toContain(t.term.toLowerCase());
        expect(t.means).toMatch(/^[A-Z].*[.!?]$/);
      }
    }
    // The grown-up words of Lessons 5 and 6 are named once, on the card of their lesson.
    const also: Record<string, string[]> = { 's12.l5': ['ad hominem', 'straw man', 'appeal to authority'], 's12.l6': ['post hoc'] };
    for (const [id, words] of Object.entries(also)) {
      for (const w of words) {
        const at = stop12.lessons.filter((l) => l.ideas.some((c) => c.body.join(' ').includes(w))).map((l) => l.id);
        expect(at, w).toEqual([id]);
      }
    }
    expect(l6.terms!.find((t) => t.term === 'after-therefore-because')!.also).toBe('post hoc');
  });
});

/** The lesson that teaches each skill (the why item belongs to Lesson 4, which asks it). */
const SKILL_LESSON: Record<string, string> = {
  flip: 's12.l1',
  middle: 's12.l2',
  swap: 's12.l2',
  circle: 's12.l3',
  dilemma: 's12.l3',
  hasty: 's12.l4',
  popular: 's12.l4',
  why: 's12.l4',
  person: 's12.l5',
  twist: 's12.l5',
  authority: 's12.l5',
  slope: 's12.l6',
  after: 's12.l6',
};

describe('the check, the Arcade, new examples and the warm-up', () => {
  it('9 items: one from each of Lessons 1 to 4, two from each of Lessons 5 and 6, the why item last; many looks per slot', () => {
    const slots = Array.from({ length: 9 }, () => new Set<string>());
    const traps = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop12.check!(createRng(seed));
      expect(items.map((i) => i.lesson)).toEqual(['s12.l1', 's12.l2', 's12.l3', 's12.l4', 's12.l5', 's12.l5', 's12.l6', 's12.l6', 's12.l4']);
      for (const it of items) expect(it.lesson, `${seed} ${it.skill}`).toBe(SKILL_LESSON[it.skill.replace('s12.', '')]);
      // Two of the three tricks about people; the slippery slope, then after-therefore-because.
      expect(items[4].skill, `${seed}`).not.toBe(items[5].skill);
      expect([items[6].skill, items[7].skill]).toEqual(['s12.slope', 's12.after']);
      if (items[7].tags?.includes(TRUE_TRICK.tag)) traps.add(String(seed));
      const last = items[8] as ChooseItem;
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s12.why');
      expect(last.conflict).toBe(true);
      expect(items.every((i) => !i.hint || i.hintCase)).toBe(true);
      items.forEach((it, k) => slots[k].add(looks(it)));
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(15);
    // The after slot is Lesson 6’s trap (an after-therefore claim that happens to be right) on many seeds.
    expect(traps.size).toBeGreaterThan(50);
  });

  it('one check never shows the same given or claim in two items', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const at = new Map<string, number>();
      stop12.check!(createRng(seed)).forEach((it, k) => {
        const s = it.scene;
        const lines = s?.kind === 'argument' ? [...s.givens, s.claim] : s?.kind === 'text' ? s.lines : [];
        for (const t of new Set(lines)) {
          expect(at.get(t) ?? k, `seed ${seed}: “${t}” in items ${at.get(t)! + 1} and ${k + 1}`).toBe(k);
          at.set(t, k);
        }
      });
    }
  });

  it('the Arcade gives Stop 12 items from every lesson', () => {
    const lessons = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const it = stop12.practice!(createRng(seed)) as ChooseItem;
      expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
      lessons.add(it.lesson);
      // An item belongs to the lesson that teaches its skill (the why item to Lesson 4, which asks it).
      expect(it.lesson, it.skill).toBe(SKILL_LESSON[it.skill.replace('s12.', '')]);
    }
    expect(lessons.size).toBe(6);
  });

  it('a new example after a miss: the same skill, another topic; a pair with both answers where one answer could be repeated', () => {
    for (let seed = 1; seed <= 60; seed++) for (const l of stop12.lessons) for (const missed of l.practice(createRng(seed)) as ChooseItem[]) {
      const out = stop12.fresh!(missed, createRng(seed + 1000)) as ChooseItem[];
      expect(out.length, `${missed.id}`).toBeGreaterThanOrEqual(1);
      const was = ALL_ARGS.find((a) => missed.prompt.startsWith(a.setting));
      for (const it of out) {
        expect(it.skill === missed.skill || missed.skill === 's12.why', `${missed.skill} -> ${it.skill}`).toBe(true);
        if (was && it.skill !== 's12.why') expect(it.prompt.startsWith(was.setting), `${missed.id}: another topic`).toBe(false);
      }
      if (out.length === 2 && missed.skill !== 's12.why' && !missed.prompt.includes('Which reason proves')) expect(out[0].answer, missed.id).not.toBe(out[1].answer);
    }
  });

  it('the warm-up is an Arguments “does it follow?” item: must, might or can’t, worked out from its cases', () => {
    const answers = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const it = stop12.bridge!(createRng(seed)) as ChooseItem;
      expect([it.stop, it.lesson, it.skill]).toEqual([12, 's12.l1', 's12.follows']);
      const s = it.scene as Extract<Scene, { kind: 'argument' }>;
      // Find the Arguments topic and shape whose givens and claim the picture shows, and work its status out again.
      let arg: S18Arg | undefined;
      for (const topic of STORY_TOPICS) for (const shape of SHAPE_IDS) {
        if (isNoShape(shape) && !topic.n) continue;
        const a = { topic, shape };
        if (JSON.stringify(givenTexts(a)) === JSON.stringify(s.givens) && claimText(a) === s.claim) arg = a;
      }
      expect(arg, `seed ${seed}`).toBeDefined();
      const left = ARG_CASES.filter((c) => givenFormsHold(arg!, c));
      const t = left.filter((c) => claimFormHolds(arg!, c)).length;
      answers.add(it.answer);
      expect(it.answer, `seed ${seed}`).toBe(t === left.length ? 'must' : t === 0 ? 'cant' : 'might');
    }
    expect([...answers].sort()).toEqual(['cant', 'might', 'must']);
  });

  it('every skill has a plain name; the stop keeps its side-track place after All, Some, None', () => {
    const skills = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of stop12.lessons) for (const it of l.practice(createRng(seed))) skills.add(it.skill);
      for (const it of stop12.check!(createRng(seed))) skills.add(it.skill);
      skills.add(stop12.bridge!(createRng(seed)).skill);
    }
    for (const s of skills) expect(stop12.skillNames?.[s], s).toBeTruthy();
    expect(stop12.sideTrack).toBe(true);
    expect(stop12.requires).toEqual(['s8']);
    expect(stopById('s12')).toBe(stop12);
    expect(STOPS.find((s) => s.id === 's12')?.ready).toBe(true);
    expect(WORLD.s12).toBe(S12_WORLD);
    expect(SOON_WORLD.s12).toBeUndefined();
  });

  it('no quiz, check or Arcade item uses a worked example', () => {
    const worked = [W_RAIN, W_BEE, W_BEE_ANT, W_SWAP, W_FASTEST, W_SPORTS, W_COIN, W_APPLES, W_SUN, W_VOTE, W_PUPPIES, W_LIGHTNING, W_SHIRTS, W_POOL, W_LAKE, W_CEREAL, W_OCTOPUS, W_FISH, W_SNOW, W_CAR, W_BELL, W_FAN, W_SUNSCREEN].map((t) => t.setting);
    for (let seed = 1; seed <= 100; seed++) {
      const items = [...stop12.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop12.check!(createRng(seed)), stop12.practice!(createRng(seed))];
      for (const it of items) for (const s of worked) expect(it.prompt.startsWith(s), it.prompt).toBe(false);
    }
  });
});

/** Arguments’ forms, worked out on its four cases (a second look at the warm-up). */
const givenFormsHold = (a: S18Arg, c: (typeof ARG_CASES)[number]) => ARG_SHAPES[a.shape].givens.every((g) => argHolds(g, c));
const claimFormHolds = (a: S18Arg, c: (typeof ARG_CASES)[number]) => argHolds(ARG_SHAPES[a.shape].claim, c);

// ---------- See and Do ----------

const rightPicks = (b: DrillStep) => Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]));
const diag = (b: DrillStep, wrong: Record<string, string>) => checkDrill(b, { ...rightPicks(b), ...wrong }).diagnosis;
/** A case board’s marks, worked out again: crossed out when a given breaks, else whether the claim is true. */
function caseBoardAnswers(b: DrillStep, a: Arg) {
  const cases = allCases(a);
  for (const r of b.rows) {
    if (r.id === 'verdict') {
      expect(r.marks[0].answer).toBe(secondVerdict(a) === 'proves' ? 'proves' : 'trick');
      continue;
    }
    const c = cases[Number(r.id.replace('case', '')) - 1];
    const out = a.givens.some((g) => !g.holds(c));
    expect(r.marks[0].answer, `${b.id} ${r.id}`).toBe(out ? 'out' : a.claim.holds(c) ? 'yes' : 'no');
  }
  expect(checkDrill(b, rightPicks(b)).done).toBe(true);
}

describe('the boards: every mark worked out again', () => {
  it('Lesson 1: the flip-and-NOT twin of the worked flip trick proves its claim; the true-or-proved board keeps the two apart', () => {
    const [flip, tp] = boards(l1);
    expect(flip.twin?.trim()).toBeTruthy();
    expect(flip.afterCard).toBe(2);
    // The twin: flip and NOT on the rain rule. Stop 6’s table says it proves its claim.
    expect(flipVerdict('mt')).toBe('proves');
    expect(flip.rows.at(-1)!.marks[0].answer).toBe('proves');
    // True or proved: each claim’s truth from its story, each proof from Stop 6’s table.
    expect(tp.distinction).toBe(TRUE_VS_PROVES.id);
    tp.rows.forEach((r, k) => {
      const { arg: a, real } = TP_ROWS[k];
      expect(r.marks[0].answer).toBe(a.claim.holds(real) ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(flipVerdict(a.move!) === 'proves' ? 'yes' : 'no');
    });
    expect(tp.rows.map((r) => r.marks.map((m) => m.answer).join('/'))).toEqual(['yes/yes', 'yes/no', 'no/no']);
    expect(diag(tp, { 'r2-proves': 'yes' })).toBe('true-as-proved');
    expect(diag(tp, { 'r3-true': 'yes' })).toBeUndefined();
    expect(checkDrill(tp, rightPicks(tp)).done).toBe(true);
  });

  it('Lesson 2: the middle trick’s twin proves its claim; the swap board’s cases and verdict', () => {
    const [mid, swap] = boards(l2);
    expect(mid.twin?.trim()).toBeTruthy();
    expect(oneFollows(true)).toBe(true);
    expect(mid.rows.at(-1)!.marks[0].answer).toBe('proves');
    expect(swap.distinction).toBe(EACH_VS_ONE.id);
    expect(swapFollows(false)).toBe(false);
    expect(swap.rows.at(-1)!.marks[0].answer).toBe('trick');
    // Each case: one game for all when both kids picked the same.
    swap.rows.slice(0, 4).forEach((r) => {
      const [a, b] = r.label.match(/is (\w+)\./g)!;
      expect(r.marks[0].answer, r.label).toBe(a === b ? 'yes' : 'no');
    });
    expect(diag(swap, { case2: 'yes' })).toBe('each-as-one');
    expect(diag(swap, { verdict: 'proves' })).toBe('some-as-every');
  });

  it('Lesson 3: the circle board sorts reasons by meaning; the doors board finds the third door from what is there', () => {
    const [circle, doors] = boards(l3);
    for (const r of circle.rows) {
      const text = r.label.replace(/^Reason: /, '');
      expect(r.marks[0].answer, text).toBe(W_FASTEST.again.includes(text) ? 'again' : 'new');
    }
    expect(circle.rows.filter((r) => r.marks[0].answer === 'again').length).toBe(2);
    expect(doors.distinction).toBe(TWO_VS_ALL.id);
    doors.rows.forEach((r, k) => {
      // A third door: one the story leaves open that the either-or does not offer.
      const third = doorWork(DOOR_ROWS[k].topic).shut.length > 0;
      expect(r.marks[0].answer, r.id).toBe(third ? 'yes' : 'no');
      expect(r.marks[1].answer, r.id).toBe(third ? 'no' : 'yes');
    });
    expect(diag(doors, { 'sports-true': 'yes' })).toBe('named-as-all');
    expect(checkDrill(doors, rightPicks(doors)).done).toBe(true);
    expect(checkDrill(circle, rightPicks(circle)).done).toBe(true);
  });

  it('Lesson 4: how many is enough, thing by thing; a vote proves a pick, a crowd never proves a fact', () => {
    const [few, say] = boards(l4);
    few.rows.forEach((r, k) => {
      const { m, claim } = ENOUGH_ROWS[k];
      const n = W_APPLES.n;
      const proves = claim === 'all' ? allForced(n, m) : m >= 1;
      expect(r.marks[0].answer, r.label).toBe(proves ? 'yes' : 'no');
    });
    expect(diag(few, { r2: 'yes' })).toBe('few-as-all');
    expect(say.distinction).toBe(SAY_VS_TRUE.id);
    say.rows.forEach((r, k) => {
      const { arg, aboutPick } = SAY_ROWS[k];
      expect(r.marks[0].answer).toBe(aboutPick ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(secondVerdict(arg) === 'proves' ? 'yes' : 'no');
      // Only a vote with its rule proves its claim.
      expect(r.marks[1].answer).toBe(aboutPick ? 'yes' : 'no');
    });
    expect(diag(say, { 'sun-proves': 'yes' })).toBe('say-as-true');
  });

  it('a question’s thinking board (the case board) marks every case from the cases', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const f of families) for (const m of [proveItem(createRng(seed), f), trueItem(createRng(seed), f)]) {
        const b = choose(m).scratch!;
        expect(choose(m).scratchLabel).toBe('the case board');
        expect(b.rows.length).toBe(allCases(m.arg).length);
        caseBoardAnswers(b, m.arg);
      }
    }
  });

  it('every case board’s marks come from the cases; boards stay phone-sized', () => {
    caseBoardAnswers(boards(l1)[0], boardArg(boards(l1)[0]));
    caseBoardAnswers(boards(l2)[0], boardArg(boards(l2)[0]));
    caseBoardAnswers(boards(l2)[1], boardArg(boards(l2)[1]));
    caseBoardAnswers(boards(l5)[0], boardArg(boards(l5)[0]));
    caseBoardAnswers(boards(l6)[0], boardArg(boards(l6)[0]));
    for (const l of stop12.lessons) for (const b of l.drill!) expect(marksToTap(b).length, b.id).toBeLessThanOrEqual(12);
  });

  it('distinctions: each taught once with a contrast card and a board; Lessons 2 to 4 remind true vs proved with a card', () => {
    expect(l1.distinctions).toEqual([TRUE_VS_PROVES]);
    for (const [l, d] of [[l2, EACH_VS_ONE], [l3, TWO_VS_ALL], [l4, SAY_VS_TRUE], [l5, WHO_VS_WHAT], [l6, AFTER_VS_CAUSE]] as const) {
      expect(l.distinctions).toEqual([d, { ...TRUE_VS_PROVES, taughtIn: 's12.l1' }]);
      expect(l.ideas.some((c) => c.distinction === TRUE_VS_PROVES.id)).toBe(true);
      const card = l.ideas.find((c) => c.distinction === d.id)!;
      expect(card.scene?.kind).toBe('contrast');
      expect(l.drill!.some((b) => b.distinction === d.id)).toBe(true);
    }
  });

  it('the contrast pictures’ truths come from the model', () => {
    const c1 = l1.ideas.find((c) => c.distinction === TRUE_VS_PROVES.id)!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c1.pairs.map((p) => p.truth)).toEqual([flipVerdict('mp') === 'proves', flipVerdict('ac') === 'proves']);
    const c2 = l2.ideas.find((c) => c.distinction === EACH_VS_ONE.id)!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c2.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(c2.pairs[0].world).toBe(c2.pairs[1].world);
    const c3 = l3.ideas.find((c) => c.distinction === TWO_VS_ALL.id)!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c3.pairs.map((p) => p.truth)).toEqual([doorWork(W_COIN).shut.length === 0, doorWork(W_SPORTS).shut.length === 0]);
    const c4 = l4.ideas.find((c) => c.distinction === SAY_VS_TRUE.id)!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c4.pairs.map((p) => p.truth)).toEqual([true, false]);
    // The reminders: tricks whose claims are really true, drawn with True tags.
    for (const l of [l2, l3, l4, l5, l6]) {
      const s = l.ideas.find((c) => c.distinction === TRUE_VS_PROVES.id)!.scene as Extract<Scene, { kind: 'argument' }>;
      expect(s.realClaim).toBe(true);
    }
    expect([W_OCTOPUS.truth, W_SUNSCREEN.truth]).toEqual([true, true]);
    // Same words, same facts, two different kids: the truth comes out the same.
    const c5 = l5.ideas.find((c) => c.distinction === WHO_VS_WHAT.id)!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c5.pairs[0].says).toBe(c5.pairs[1].says);
    expect(c5.pairs[0].world).toBe(c5.pairs[1].world);
    expect(c5.pairs[0].who).not.toBe(c5.pairs[1].who);
    expect(c5.pairs.map((p) => p.truth)).toEqual([libraryClaim(c5.pairs[0].says, c5.pairs[0].world), libraryClaim(c5.pairs[1].says, c5.pairs[1].world)]);
    const c6 = l6.ideas.find((c) => c.distinction === AFTER_VS_CAUSE.id)!.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c6.pairs.map((p) => p.truth)).toEqual([afterVerdict(W_BELL) === 'proves', afterVerdict(W_CAR) === 'proves']);
    expect(c6.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(W_PUPPIES.truth).toBe(true);
    expect(twoGroupsFollow()).toBe(false);
  });
});

/** A library claim, worked out from the fact’s words alone: true when the fact says the claim’s last three words. */
function libraryClaim(says: string, fact: string): boolean {
  const tail = says.replace(/[.!?]$/, '').toLowerCase().split(' ').slice(-3).join(' ');
  return fact.toLowerCase().includes(tail);
}
/** The subject of a story’s first line: the words before “says” (“Ava”, “Puff the dragon”, “The elf”). */
const subjectOf = (setting: string) => setting.split(' says ')[0];
/** An argument with more givens: what a trick’s reason leaves out, added. */
const withGivens = (a: Arg, more: { text: string; holds: (c: Case) => boolean }[]): Arg => ({ ...a, givens: [...a.givens, ...more] });

describe('Lessons 5 and 6: each trick is a shape with what its reason leaves out', () => {
  it('tricks about people: the reason is true in every case and about something else, so the claim stays free', () => {
    for (const t of PEOPLE_TOPICS) {
      const a = peopleArg(t);
      // The reason crosses out no case: it says nothing about the claim.
      expect(allCases(a).every((c) => a.givens.every((g) => g.holds(c))), t.id).toBe(true);
      expect(allCases(a).map((c) => claimIn(a, c)).sort(), t.id).toEqual([false, true]);
      expect(verdictOf(a), t.id).toBe(peopleVerdict(t, false));
      expect(a.leaves, t.id).toBe(t.leaves);
      // What the reason is about, from the story’s own words.
      const who = subjectOf(t.setting);
      if (t.family === 'person') expect(t.reason.split(' ')[0], `${t.id}: the reason is about ${who}`).toBe(who.split(' ')[0]);
      if (t.family === 'twist') {
        expect(t.retell?.toLowerCase(), `${t.id}: the speaker retells what ${who} said`).toContain(`${who.toLowerCase()} thinks`);
        expect(a.retell).toBe(t.retell);
      } else expect(t.retell, t.id).toBeUndefined();
      if (t.family === 'authority') {
        const famous = t.reason.match(/^The famous (\w+) says /)?.[1];
        expect(famous, `${t.id}: a famous person’s word`).toBeTruthy();
        expect(t.setting, t.id).toContain(`famous ${famous}`);
        expect(t.other, `${t.id}: what the ${famous} knows, and what not`).toMatch(/knows about .+, not about /);
      }
    }
    for (const f of ['person', 'twist', 'authority'] as const) expect(PEOPLE_TOPICS.filter((t) => t.family === f && t.fact).length, f).toBeGreaterThanOrEqual(3);
  });

  it('tricks about people: the good twin adds a fact about the claim and its rule “If <fact>, <claim>.”, and then it proves', () => {
    for (const t of PEOPLE_TOPICS.filter((x) => x.fact)) {
      const g = peopleArg(t, true);
      expect(g.givens.map((x) => x.text), t.id).toEqual([`If ${mid(t.fact![0])}, ${mid(t.claim[0])}.`, t.fact![0]]);
      expect(verdictOf(g), t.id).toBe(peopleVerdict(t, true));
      expect(verdictOf(g)).toBe('proves');
      expect(g.leaves, t.id).toBeUndefined();
      // A twin only for a claim that is not really false.
      expect(t.truth, t.id).not.toBe(false);
    }
  });

  it('the slippery slope: no rule for any step, so the end can fail; adding the rule for each step makes a chain that proves', () => {
    for (const t of STEP_TOPICS) {
      const a = stepArg(t);
      expect(verdictOf(a), t.id).toBe(stepVerdict(t));
      expect(a.givens[0].text, t.id).toBe(t.first);
      const links = [`If ${mid(t.first)}, ${mid(t.next[0])}.`, `If ${mid(t.next[0])}, ${mid(t.end[0])}.`];
      if (t.chain) {
        expect(a.givens.slice(1).map((g) => g.text), t.id).toEqual(links);
        expect(verdictOf(a)).toBe('proves');
      } else {
        expect(a.givens.length, t.id).toBe(1);
        expect(a.leaves).toBe(LEAVES_OUT.slope);
        // The case that shows it: the next step happened, and the end did not.
        const leak = allCases(a).find((c) => !claimIn(a, c))!;
        expect(leak.n, t.id).toBe('yes');
        // What it leaves out, added: a rule for each step. Then the end is forced.
        const fixed = withGivens(a, [{ text: links[0], holds: (c) => c.n === 'yes' }, { text: links[1], holds: (c) => c.n !== 'yes' || c.e === 'yes' }]);
        expect(verdictOf(fixed), t.id).toBe('proves');
        // One rule is not enough: the other step can still fail.
        expect(verdictOf(withGivens(a, [{ text: links[0], holds: (c) => c.n === 'yes' }])), t.id).toBe('slope');
      }
    }
    expect(SLOPE_TOPICS.length).toBeGreaterThanOrEqual(4);
    expect(CHAIN_TOPICS.length).toBeGreaterThanOrEqual(4);
  });

  it('after-therefore-because: the order is true in every case, so it rules out no cause; an only-rule rules out the rest', () => {
    for (const t of AFTER_TOPICS) {
      const a = afterArg(t);
      expect(verdictOf(a), t.id).toBe(afterVerdict(t));
      expect(allCases(a).every((c) => a.givens[0].holds(c)), `${t.id}: the order rules out no cause`).toBe(true);
      expect(a.vars[0].values.map((v) => v.text)).toEqual([t.cause, t.other]);
      if (t.only) expect(a.givens[1].text).toBe(t.only);
      else {
        expect(a.leaves).toBe(LEAVES_OUT.after);
        // What it leaves out, added: a rule that nothing else could cause it. Then the cause is proved.
        expect(verdictOf(withGivens(a, [{ text: 'Nothing else can cause it.', holds: (c) => c.k === 'yes' }])), t.id).toBe('proves');
      }
    }
    expect(POST_TOPICS.filter((t) => t.truth !== false).length, 'traps: after-therefore claims that can turn out right').toBeGreaterThanOrEqual(4);
    expect(ONLY_TOPICS.length).toBeGreaterThanOrEqual(3);
  });

  it('every Lesson 5 and 6 label (the why item’s and the name item’s) names what the reason leaves out, and each lesson names its own tricks', () => {
    expect(LESSON_TRICKS['s12.l5']).toEqual(['person', 'twist', 'authority']);
    expect(LESSON_TRICKS['s12.l6']).toEqual(['slope', 'after']);
    for (let seed = 1; seed <= 60; seed++) {
      for (const k of ['person', 'twist', 'authority', 'slope', 'after'] as const) {
        const it = choose(whyItem(createRng(seed), { kind: k }));
        expect(it.choices.find((c) => c.id === k)!.label, k).toContain('It leaves out');
        // The right answer’s words name what this story’s reason leaves out.
        expect(it.explain, `${k} ${seed}`).toContain(`It leaves out ${whyItem(createRng(seed), { kind: k }).arg.leaves}.`);
      }
      // Name it: the right choice for a Lesson 5 or 6 trick names what its reason leaves out.
      for (const lesson of ['s12.l5', 's12.l6']) {
        const it = choose(nameItem(createRng(seed), lesson, { want: 'trick' }));
        const k = it.answer as keyof typeof LEAVES_OUT;
        expect(LESSON_TRICKS[lesson], `${lesson} ${seed}`).toContain(k);
        expect(it.choices.find((c) => c.id === k)!.label, `${lesson} ${seed}`).toContain(`It leaves out ${LEAVES_OUT[k]}.`);
      }
    }
  });
});

describe('the boards of Lessons 5 and 6: every mark worked out again', () => {
  it('Lesson 5: the twin with a reason about the pool proves; claims about the library by the facts, not the kid; what each trick leaves out', () => {
    const [person, who, leaves] = boards(l5);
    expect(person.twin?.trim()).toBeTruthy();
    expect(person.afterCard).toBe(0);
    expect(peopleVerdict(W_POOL, true)).toBe('proves');
    expect(person.rows.at(-1)!.marks[0].answer).toBe('proves');
    expect(who.distinction).toBe(WHO_VS_WHAT.id);
    who.rows.forEach((r, k) => {
      const row = LIBRARY_ROWS[k];
      expect(r.marks[0].answer, r.label).toBe(libraryClaim(row.says, row.fact) ? 'yes' : 'no');
    });
    // Mia (late for everything) is right both times; Kim (never late) is wrong both times.
    expect(LIBRARY_ROWS.map((r) => `${r.who}:${libraryClaim(r.says, r.fact)}`)).toEqual(['Mia:true', 'Kim:false', 'Mia:true', 'Kim:false']);
    expect(diag(who, { 'r1-true': 'no' })).toBe('who-as-what');
    expect(diag(who, { 'r2-true': 'yes' })).toBe('who-as-what');
    expect(checkDrill(who, rightPicks(who)).done).toBe(true);
    leaves.rows.forEach((r, k) => {
      const a = LEAVES_ROWS[k];
      expect(r.marks[0].answer, r.label).toBe(peopleVerdict(peopleTopic(a.topic), false));
      expect(r.marks[0].options.find((o) => o.id === r.marks[0].answer)!.label.toLowerCase()).toBe(`${LEAVES_OUT[r.marks[0].answer as 'person']}.`);
    });
    expect(leaves.rows.map((r) => r.marks[0].answer).sort()).toEqual(['authority', 'person', 'twist']);
    expect(checkDrill(leaves, rightPicks(leaves)).done).toBe(true);
  });

  it('Lesson 6: the chain with a rule for each step proves; after or a cause, from the order and the only-rules', () => {
    const [chain, after] = boards(l6);
    expect(chain.twin?.trim()).toBeTruthy();
    expect(chain.afterCard).toBe(0);
    expect(stepVerdict(W_SNOW)).toBe('proves');
    expect(chain.rows.at(-1)!.marks[0].answer).toBe('proves');
    expect(after.distinction).toBe(AFTER_VS_CAUSE.id);
    after.rows.forEach((r, k) => {
      const t = afterTopic(AFTER_ROWS[k].arg.topic);
      expect(r.label.startsWith(t.after), r.label).toBe(true);
      expect(r.marks[0].answer, `${r.id}: it came right after`).toBe('yes');
      expect(r.marks[1].answer, r.id).toBe(afterVerdict(t) === 'proves' ? 'yes' : 'no');
    });
    expect(after.rows.map((r) => r.marks[1].answer)).toEqual(['yes', 'no', 'yes', 'no']);
    expect(diag(after, { 'car-proves': 'yes' })).toBe('after-as-cause');
    expect(diag(after, { 'sun-proves': 'yes' })).toBe('after-as-cause');
    // The words for that mix-up end with the story’s own order and the case where something else caused it.
    for (const t of [W_CAR, W_SUNSCREEN]) {
      const m = after.misconceptions!.find((x) => x.text.includes(t.after))!;
      expect(m, t.id).toBeDefined();
      expect(m.text, t.id).toContain(mid(t.other));
    }
    expect(checkDrill(after, rightPicks(after)).done).toBe(true);
  });

  it('the worked tricks of Lessons 5 and 6 are tricks by the second methods, and the reminders’ claims are really true', () => {
    for (const t of [W_POOL, W_LAKE, W_CEREAL, W_OCTOPUS]) expect(peopleVerdict(t, false), t.id).toBe(t.family);
    expect(stepVerdict(W_FISH)).toBe('slope');
    expect([W_CAR, W_SUNSCREEN].map(afterVerdict)).toEqual(['after', 'after']);
    expect([W_BELL, W_FAN].map(afterVerdict)).toEqual(['proves', 'proves']);
  });
});

/** The argument a case board is about: the worked argument whose givens and claim its picture shows. */
function boardArg(b: DrillStep): Arg {
  const s = b.scene as Extract<Scene, { kind: 'argument' }>;
  const worked: Arg[] = [];
  for (const t of [W_RAIN]) for (const m of ['mp', 'mt', 'ac', 'da'] as Move[]) worked.push(flipOf(t, m));
  worked.push(oneOf(true), swapOf(), peopleArg(W_POOL, true), stepArg(W_SNOW));
  const a = worked.find((x) => JSON.stringify(x.givens.map((g) => g.text)) === JSON.stringify(s.givens) && x.claim.text === s.claim);
  if (!a) throw new Error(`boardArg: ${b.id}`);
  return a;
}
const oneOf = (good: boolean) => oneArg(W_BEE, good);
const swapOf = () => swapArg(W_SWAP);

// ---------- reading level, quotes and symbols ----------

describe('every word a kid reads', () => {
  const strings: string[] = [];
  const item = (it: Item) => {
    strings.push(it.prompt, it.explain, ...teachStrings(it));
    if (it.kind === 'choose') strings.push(...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
    if (it.scene?.kind === 'argument') strings.push(...it.scene.givens, it.scene.claim, ...(it.scene.cases ?? []).flatMap((c) => [c.name, ...c.facts]), it.scene.caption ?? '');
    if (it.scene?.kind === 'text') strings.push(...it.scene.lines);
    for (const q of it.confused ?? []) strings.push(q.q, q.teach, ...q.options.map((o) => o.label));
    const b = it.scratch;
    if (b) strings.push(b.title, ...b.body, ...b.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why)])]));
  };
  for (let seed = 1; seed <= 30; seed++) {
    for (const l of stop12.lessons) l.practice(createRng(seed)).forEach(item);
    stop12.check!(createRng(seed)).forEach(item);
    item(stop12.practice!(createRng(seed)));
  }
  for (const l of stop12.lessons) {
    for (const c of l.ideas) {
      strings.push(c.title, ...c.body);
      const s = c.scene;
      if (s?.kind === 'contrast') strings.push(...s.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), s.ask?.q ?? '', s.ask?.a ?? '');
      if (s?.kind === 'argument') strings.push(...s.givens, s.claim, ...(s.cases ?? []).flatMap((x) => x.facts), s.caption ?? '');
      if (s?.kind === 'text') strings.push(...s.lines);
    }
    for (const b of l.drill!) {
      strings.push(b.title, ...b.body, b.done, b.twin ?? '', ...b.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]));
      strings.push(...(b.misconceptions ?? []).map((m) => m.text), ...(b.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]), ...Object.values(b.words ?? {}));
    }
    for (const t of l.terms ?? []) strings.push(t.means);
  }
  strings.push(...Object.values(stop12.skillNames ?? {}));
  const all = strings.filter(Boolean).join('\n');

  it(`reads at grade ${READING.maxGrade} or lower, with no sentence over ${READING.maxSentenceWords} words`, () => {
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
  });

  it('curly quotes and apostrophes only, no symbols, “Not yet” never “Wrong”, US spelling', () => {
    expect(all).not.toMatch(/["']/);
    expect(all).not.toMatch(/[=+→←✓✗≠<>&*#]/);
    expect(all).not.toMatch(/\s[xX]\s/);
    expect(all).not.toMatch(/\bWrong\b/);
    expect(all).not.toMatch(/\b(colour|favourite|centre|neighbour|grey|practise)\b/i);
  });
});
