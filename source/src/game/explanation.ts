/**
 * What the explanation after a wrong answer says, as plain data: the screen (ExplanationPanel), the read-aloud
 * and the check result all draw from this one model, so the words always match. Pure and DOM-free.
 *
 * The title names the selected answer's gap (ChooseItem.feedback, or what grade() found for other kinds).
 * When a choice has no feedback at all, the title is a neutral "Let’s work through this." and the item-level
 * teaching carries the explanation: the panel never invents a reason for a pick.
 */
import { claimTrue, clueHolds, grade } from '../engine/grade';
import { caseText } from '../engine/teach';
import type { Answer, Item, TeachCase, Thing } from '../engine/types';
import { describeAnswer, describeRight } from './describe';

export const NEUTRAL_TITLE = 'Let’s work through this.';

export interface ExplanationModel {
  /** Names the answer's gap, or NEUTRAL_TITLE. */
  title: string;
  /** False when the title is NEUTRAL_TITLE. */
  specific: boolean;
  /** A choose item whose picked choice has no feedback: a content gap to repair ("skill:choiceId"). */
  gap?: string;
  /** "You chose" (one choice) or "Your answer" (anything else). */
  saidLabel: string;
  /** The player's answer in words. */
  said: string;
  /** Answers are sentences (choose items), so the screen puts them in quotes. */
  quoted: boolean;
  /** What the answer means and exactly where it fails. */
  detail: string[];
  example?: TeachCase;
  rule?: string;
  terms: { word: string; meaning: string }[];
  meaning?: string;
  casesTitle?: string;
  cases: TeachCase[];
  /** The right answer in words, and why it works. */
  right: string;
  why: string;
  remember: string[];
  /** "Explain more simply". Empty when the item has no simpler example. */
  simpler: string[];
}

/** Split text into its first sentence and the rest. No lookbehind: older Safari cannot parse it. */
export function firstSentence(text: string): [string, string[]] {
  const m = /^([\s\S]+?[.!?][”"]?)\s+(?=[A-Z“"])([\s\S]*)$/.exec(text.trim());
  return m ? [m[1], [m[2]]] : [text.trim(), []];
}

export function explanationFor(item: Item, given: Answer | null): ExplanationModel {
  const t = item.teach;
  const base = {
    saidLabel: item.kind === 'choose' ? 'You chose' : 'Your answer',
    quoted: item.kind === 'choose',
    said: describeAnswer(item, given),
    rule: t?.rule,
    terms: t?.terms ?? [],
    meaning: t?.meaning,
    casesTitle: t?.casesTitle,
    cases: t?.cases ?? [],
    right: describeRight(item),
    why: item.explain,
    remember: t?.remember ?? [],
  };
  if (item.kind === 'choose') {
    const pick = given?.kind === 'choose' ? given.id : null;
    const fb = pick ? item.feedback?.[pick] : undefined;
    if (fb) return { ...base, title: fb.headline, specific: true, detail: fb.detail, example: fb.example, simpler: fb.simpler ?? t?.simpler ?? [] };
    const why = pick ? item.whyWrong?.[pick] : undefined;
    if (why) {
      const [title, rest] = firstSentence(why);
      return { ...base, title, specific: true, detail: rest, simpler: t?.simpler ?? [] };
    }
    return { ...base, title: NEUTRAL_TITLE, specific: false, gap: `${item.skill}:${pick ?? 'none'}`, detail: [], simpler: t?.simpler ?? [] };
  }
  // Other kinds: grade() names what is wrong (cards left out, a broken clue, two people with one value, …).
  // Its first line is the headline; each further line is one place the answer fails.
  const g = given ? grade(item, given) : null;
  if (g && !g.correct && g.feedback && g.feedback !== item.explain) {
    const [head, ...lines] = g.feedback.split('\n');
    const [title, rest] = firstSentence(head);
    return { ...base, title, specific: true, detail: [...rest, ...lines], example: exampleFor(item, given), simpler: t?.simpler ?? [] };
  }
  return { ...base, title: NEUTRAL_TITLE, specific: false, detail: [], simpler: t?.simpler ?? [] };
}

const list = (xs: readonly string[]) => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cardName = (t: Thing) => (t.hidden ? 'a face-down card' : `the ${t.size} ${t.color} ${t.shape}`);

/**
 * The player's own answer drawn as a case card, with the truth of each clue or speaker, so the failure can be
 * seen and not only read. Only for kinds where a picture adds to grade()'s words.
 */
export function exampleFor(item: Item, given: Answer | null): TeachCase | undefined {
  if (!given) return undefined;
  if (item.kind === 'order' && given.kind === 'order' && given.ids.length === item.answer.length) {
    const nameOf = (id: string) => item.names.find((x) => x.id === id)?.label ?? id;
    const truths = item.clues.map((c, i) => ({ who: `Clue ${i + 1}`, value: clueHolds(c, given.ids) }));
    const broken = truths.filter((x) => !x.value).map((x) => x.who.replace('Clue ', ''));
    if (!broken.length) return undefined;
    return {
      label: `Your line, ${item.firstLabel.toLowerCase()} to ${item.lastLabel.toLowerCase()}: ${list(given.ids.map(nameOf))}.`,
      truths,
      note: broken.length === 1 ? `Clue ${broken[0]} is false for this line. A right line makes every clue true.` : `Clues ${list(broken)} are false for this line. A right line makes every clue true.`,
    };
  }
  if (item.kind === 'assign' && given.kind === 'assign' && item.claims) {
    if (!item.people.every((p) => given.values[p.id]?.kind)) return undefined;
    const kinds: Record<string, 'knight' | 'knave'> = {};
    for (const p of item.people) kinds[p.id] = given.values[p.id].kind === 'knight' ? 'knight' : 'knave';
    const talkers = item.people.filter((p) => item.claims?.[p.id]);
    const truths = talkers.map((p) => ({ who: `${p.label}’s words`, value: claimTrue(item.claims![p.id], kinds) }));
    const bad = talkers.filter((p, i) => (kinds[p.id] === 'knight') !== truths[i].value);
    if (!bad.length) return undefined;
    return {
      label: `Your answer: ${item.people.map((p) => `${p.label} is a ${kinds[p.id]}.`).join(' ')}`,
      truths,
      note: bad.map((p) => `${p.label} is a ${kinds[p.id]} with ${kinds[p.id] === 'knight' ? 'false' : 'true'} words.`).join(' '),
    };
  }
  if (item.kind === 'tapall' && given.kind === 'tapall') {
    const missed = item.things.filter((x) => item.answer.includes(x.id) && !given.ids.includes(x.id));
    const extra = item.things.filter((x) => !item.answer.includes(x.id) && given.ids.includes(x.id));
    if (!missed.length && !extra.length) return undefined;
    // The picture shows just these cards, badged fits / does not fit; the words say the same if it cannot load.
    const parts = [
      ...(missed.length ? [`Left out: ${list(missed.map(cardName))}.`] : []),
      ...(extra.length ? [`Does not fit: ${list(extra.map(cardName))}.`] : []),
    ];
    return { label: parts.join(' '), things: [...missed.map((x) => ({ ...x, mark: 'yes' as const })), ...extra.map((x) => ({ ...x, mark: 'no' as const }))] };
  }
  return undefined;
}

/** Long answers (a whole grid) are read one sentence at a time. */
function chunks(text: string): string[] {
  return text.replace(/([.!?])\s+(?=[A-Z“])/g, '$1\n').split('\n').filter(Boolean);
}

/** The explanation as lines to read aloud, in the order the screen shows them. */
export function explanationSpeech(m: ExplanationModel, withSimpler: boolean): string[] {
  const lines: string[] = [m.title];
  if (m.rule) lines.push(m.rule);
  for (const term of m.terms) lines.push(`${term.word} means ${term.meaning}`);
  if (m.meaning) lines.push(m.meaning);
  if (m.cases.length) {
    if (m.casesTitle) lines.push(m.casesTitle);
    for (const c of m.cases) lines.push(...caseText(c));
  }
  const [first = '', ...more] = chunks(m.said);
  lines.push(`${m.saidLabel}: ${first}`, ...more, ...m.detail);
  if (m.example) lines.push(...caseText(m.example));
  lines.push(`The right answer: ${m.right}`, m.why);
  if (m.remember.length) lines.push('Remember.', ...m.remember);
  if (withSimpler && m.simpler.length) lines.push('A simpler way to see it.', ...m.simpler);
  return lines;
}
