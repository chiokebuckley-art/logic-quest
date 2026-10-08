import type { Answer, AssignItem, Claim, Graded, GridClue, Item, LineClue } from './types';

/** Does one line-up clue hold for a complete or partial order (ids first -> last)? Unplaced people make position clues fail. */
export function clueHolds(clue: LineClue, order: readonly string[]): boolean {
  const pos = (id: string) => order.indexOf(id);
  const n = order.length;
  switch (clue.t) {
    case 'before': return pos(clue.a) >= 0 && pos(clue.b) >= 0 && pos(clue.a) < pos(clue.b);
    case 'rightBefore': return pos(clue.a) >= 0 && pos(clue.b) === pos(clue.a) + 1;
    case 'nextTo': return pos(clue.a) >= 0 && pos(clue.b) >= 0 && Math.abs(pos(clue.a) - pos(clue.b)) === 1;
    case 'notNextTo': return pos(clue.a) >= 0 && pos(clue.b) >= 0 && Math.abs(pos(clue.a) - pos(clue.b)) !== 1;
    case 'between': {
      const a = pos(clue.a), b = pos(clue.b), c = pos(clue.c);
      return a >= 0 && b >= 0 && c >= 0 && ((b < a && a < c) || (c < a && a < b));
    }
    case 'first': return pos(clue.a) === 0;
    case 'last': return n > 0 && pos(clue.a) === n - 1;
    case 'notFirst': return pos(clue.a) > 0;
    case 'notLast': return pos(clue.a) >= 0 && pos(clue.a) < n - 1;
    case 'place': return pos(clue.a) === clue.k - 1;
  }
}

export type Kinds = Readonly<Record<string, 'knight' | 'knave'>>;

/** Is an islander's claim true when the islanders are these kinds? */
export function claimTrue(c: Claim, kinds: Kinds): boolean {
  switch (c.t) {
    case 'is': return kinds[c.who] === c.kind;
    case 'same': return kinds[c.a] === kinds[c.b];
    case 'diff': return kinds[c.a] !== kinds[c.b];
    case 'count': {
      const n = Object.values(kinds).filter((k) => k === c.kind).length;
      return c.op === 'atLeast' ? n >= c.k : c.op === 'atMost' ? n <= c.k : n === c.k;
    }
    case 'not': return !claimTrue(c.c, kinds);
    case 'and': return c.cs.every((x) => claimTrue(x, kinds));
    case 'or': return c.cs.some((x) => claimTrue(x, kinds));
    case 'if': return !claimTrue(c.a, kinds) || claimTrue(c.b, kinds);
  }
}

/** A knight's claim is true and a knave's claim is false. Does this speaker fit? */
export function speakerFits(speaker: string, claim: Claim, kinds: Kinds): boolean {
  return (kinds[speaker] === 'knight') === claimTrue(claim, kinds);
}

export type Assignment = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Does a grid clue hold for a full assignment (person -> category -> value)? */
export function gridClueHolds(clue: GridClue, values: Assignment): boolean {
  const holder = (c: string, v: string) => Object.keys(values).find((p) => values[p]?.[c] === v);
  switch (clue.t) {
    case 'is': return values[clue.p]?.[clue.c] === clue.v;
    case 'isnt': return values[clue.p]?.[clue.c] !== undefined && values[clue.p][clue.c] !== clue.v;
    case 'either': return values[clue.p]?.[clue.c] === clue.v1 || values[clue.p]?.[clue.c] === clue.v2;
    case 'link': { const p = holder(clue.c1, clue.v1); return !!p && values[p][clue.c2] === clue.v2; }
    case 'notLink': { const p = holder(clue.c1, clue.v1); return !!p && values[p][clue.c2] !== undefined && values[p][clue.c2] !== clue.v2; }
  }
}

/** Every person has a value in every category, and oneEach categories use each value once. */
export function assignmentComplete(item: AssignItem, values: Assignment): boolean {
  return item.people.every((p) => item.categories.every((c) => c.values.some((v) => v.id === values[p.id]?.[c.id])));
}

/** "clue 2", "clues 1 and 3", "clues 1, 3 and 4" (clue indexes are 0-based). */
function clueList(broken: number[]): string {
  const ns = broken.map((i) => String(i + 1));
  if (ns.length === 1) return `clue ${ns[0]}`;
  return `clues ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}

/** "Ava", "Ava and Ben", "Ava, Ben and Cal". */
function names(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** A sentence quoted with its final period inside the closing quote: “Ava finished first.” */
const quoted = (text: string) => `“${text.trim().replace(/[.!?]$/, '')}.”`;

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

/** Where a line breaks one clue, in words: "In your line, Ben comes before Ava." */
export function lineClueFailure(c: LineClue, line: readonly string[], nameOf: (id: string) => string): string {
  const at = (id: string) => line.indexOf(id);
  const N = nameOf;
  switch (c.t) {
    case 'before': return `In your line, ${N(c.b)} comes before ${N(c.a)}.`;
    case 'rightBefore': {
      if (at(c.b) < at(c.a)) return `In your line, ${N(c.b)} comes before ${N(c.a)}.`;
      const gap = at(c.b) - at(c.a) - 1;
      return `In your line, ${gap} ${gap === 1 ? 'person stands' : 'people stand'} between ${N(c.a)} and ${N(c.b)}.`;
    }
    case 'nextTo': return `In your line, ${N(c.a)} and ${N(c.b)} are not side by side.`;
    case 'notNextTo': return `In your line, ${N(c.a)} and ${N(c.b)} stand side by side.`;
    case 'between': return `In your line, ${N(c.a)} is not between ${N(c.b)} and ${N(c.c)}.`;
    case 'first': return `In your line, ${N(c.a)} is ${ORDINAL[at(c.a)] ?? `number ${at(c.a) + 1}`}, not first.`;
    case 'last': return `In your line, ${N(c.a)} is ${ORDINAL[at(c.a)] ?? `number ${at(c.a) + 1}`}, not last.`;
    case 'notFirst': return `In your line, ${N(c.a)} is first.`;
    case 'notLast': return `In your line, ${N(c.a)} is last.`;
    case 'place': return `In your line, ${N(c.a)} is ${ORDINAL[at(c.a)] ?? `number ${at(c.a) + 1}`}, not ${ORDINAL[c.k - 1] ?? `number ${c.k}`}.`;
  }
}

/** Where a grid answer breaks one clue, in words, naming the boxes. */
export function gridClueFailure(item: AssignItem, clue: GridClue, values: Assignment): string {
  const person = (p: string) => item.people.find((x) => x.id === p)?.label ?? p;
  const value = (c: string, v: string | undefined) => item.categories.find((x) => x.id === c)?.values.find((x) => x.id === v)?.label ?? v ?? '';
  const holder = (c: string, v: string) => item.people.find((p) => values[p.id]?.[c] === v);
  switch (clue.t) {
    case 'is':
      return `Your grid has the ✓ for ${person(clue.p)} under “${value(clue.c, values[clue.p]?.[clue.c])},” not under ${quoted(value(clue.c, clue.v))}`;
    case 'isnt':
      return `Your grid has the ✓ for ${person(clue.p)} under ${quoted(value(clue.c, clue.v))}`;
    case 'either':
      return `Your grid has the ✓ for ${person(clue.p)} under “${value(clue.c, values[clue.p]?.[clue.c])},” which is not “${value(clue.c, clue.v1)}” or ${quoted(value(clue.c, clue.v2))}`;
    case 'link': {
      const x = holder(clue.c1, clue.v1);
      if (!x) return 'Your grid does not match this clue.';
      return `In your grid, ${x.label} has the ✓ for “${value(clue.c1, clue.v1)},” but not the ✓ for ${quoted(value(clue.c2, clue.v2))}`;
    }
    case 'notLink': {
      const x = holder(clue.c1, clue.v1);
      if (!x) return 'Your grid does not match this clue.';
      return `In your grid, ${x.label} has the ✓ for “${value(clue.c1, clue.v1)}” and also the ✓ for ${quoted(value(clue.c2, clue.v2))}`;
    }
  }
}

/** The clue's words from a 'clues' scene, when the item has one. */
const clueText = (item: Item, i: number) => (item.scene?.kind === 'clues' ? item.scene.clues[i] : undefined);
const speakerWords = (item: Item, id: string) => (item.scene?.kind === 'speakers' ? item.scene.speakers.find((sp) => sp.id === id)?.says : undefined);

function assignFeedback(item: AssignItem, values: Assignment): { feedback: string; broken: number[] } {
  if (!assignmentComplete(item, values)) {
    return { feedback: item.layout === 'toggles' ? 'Choose a kind for everyone first.' : 'Give every row one check mark in each part of the grid first.', broken: [] };
  }
  for (const c of item.categories) {
    if (!c.oneEach) continue;
    for (const v of c.values) {
      const who = item.people.filter((p) => values[p.id][c.id] === v.id);
      if (who.length > 1) return { feedback: `${who[0].label} and ${who[1].label} both have a ✓ for “${v.label}.” Each column gets just one yes.`, broken: [] };
    }
  }
  if (item.gridClues) {
    const broken = item.gridClues.map((cl, i) => (gridClueHolds(cl, values) ? -1 : i)).filter((i) => i >= 0);
    if (broken.length) {
      // One line per broken clue: its words, then the boxes that break it.
      const lines = broken.map((i) => {
        const words = clueText(item, i);
        return `${words ? `Clue ${i + 1} says ${quoted(words)} ` : `Clue ${i + 1}: `}${gridClueFailure(item, item.gridClues![i], values)}`;
      });
      return { feedback: [`This answer breaks ${clueList(broken)}.`, ...lines].join('\n'), broken };
    }
  }
  if (item.claims) {
    const kinds: Record<string, 'knight' | 'knave'> = {};
    for (const p of item.people) kinds[p.id] = values[p.id].kind === 'knight' ? 'knight' : 'knave';
    const broken: number[] = [];
    item.people.forEach((p, i) => { const cl = item.claims?.[p.id]; if (cl && !speakerFits(p.id, cl, kinds)) broken.push(i); });
    if (broken.length) {
      const who = broken.map((i) => item.people[i]);
      const lines = who.map((p) => {
        const said = speakerWords(item, p.id);
        const words = said ? `${p.label}’s words, “${said.trim().replace(/[.!?]$/, '')},”` : `what ${p.label} says`;
        return kinds[p.id] === 'knight'
          ? `If ${p.label} is a knight, ${words} must be true. With your answer, they are false.`
          : `If ${p.label} is a knave, ${words} must be false. With your answer, they are true.`;
      });
      const head = who.length === 1 ? `With your answer, ${who[0].label} breaks the rule.` : `With your answer, ${names(who.map((p) => p.label))} break the rule.`;
      return { feedback: [head, ...lines].join('\n'), broken };
    }
  }
  return { feedback: item.explain, broken: [] };
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

/** Mark one answer. Pure: the same item and answer always give the same result. */
export function grade(item: Item, answer: Answer | null): Graded {
  if (!answer) return { correct: false, feedback: 'No answer was given in time.' };
  switch (item.kind) {
    case 'choose': {
      if (answer.kind !== 'choose') return { correct: false, feedback: item.explain };
      const correct = answer.id === item.answer;
      return { correct, feedback: correct ? '' : (item.whyWrong?.[answer.id] ?? item.explain) };
    }
    case 'tapall': {
      if (answer.kind !== 'tapall') return { correct: false, feedback: item.explain };
      const correct = sameSet(answer.ids, item.answer);
      if (correct) return { correct, feedback: '' };
      const known = item.diagnose?.find((d) => sameSet(d.ids, answer.ids));
      if (known) return { correct, feedback: known.message };
      const extraIds = answer.ids.filter((id) => !item.answer.includes(id));
      const missedIds = item.answer.filter((id) => !answer.ids.includes(id));
      const card = (id: string) => {
        const t = item.things.find((x) => x.id === id);
        return t ? (t.hidden ? 'a face-down card' : `the ${t.size} ${t.color} ${t.shape}`) : id;
      };
      const m = missedIds.length, x = extraIds.length;
      const head = m && x
        ? `Your answer leaves out ${m} card${m === 1 ? '' : 's'} that ${m === 1 ? 'fits' : 'fit'}, and it has ${x} card${x === 1 ? '' : 's'} that ${x === 1 ? 'does' : 'do'} not fit.`
        : m
          ? `Your answer leaves out ${m} card${m === 1 ? '' : 's'} that ${m === 1 ? 'fits' : 'fit'}.`
          : `Your answer has ${x} card${x === 1 ? '' : 's'} that ${x === 1 ? 'does' : 'do'} not fit.`;
      const lines = [head];
      if (m) lines.push(`${m === 1 ? 'This card fits' : 'These cards fit'} but ${m === 1 ? 'is' : 'are'} not in your answer: ${names(missedIds.map(card))}.`);
      if (x) lines.push(`${x === 1 ? 'This card is' : 'These cards are'} in your answer but ${x === 1 ? 'does' : 'do'} not fit: ${names(extraIds.map(card))}.`);
      return { correct, feedback: lines.join('\n') };
    }
    case 'assign': {
      if (answer.kind !== 'assign') return { correct: false, feedback: item.explain };
      const correct = item.people.every((p) => item.categories.every((c) => answer.values[p.id]?.[c.id] === item.answer[p.id][c.id]));
      if (correct) return { correct, feedback: '', broken: [] };
      return { correct, ...assignFeedback(item, answer.values) };
    }
    case 'number': {
      if (answer.kind !== 'number') return { correct: false, feedback: item.explain };
      const correct = answer.value === item.answer;
      if (correct) return { correct, feedback: '' };
      const why = item.whyWrong?.[String(answer.value)];
      return { correct, feedback: why ?? `Your answer was ${answer.value}. The rule gives ${item.answer}${item.unit ? ` ${item.unit}` : ''}.` };
    }
    case 'multi': {
      if (answer.kind !== 'multi') return { correct: false, feedback: item.explain };
      const correct = sameSet(answer.ids, item.answer);
      if (correct) return { correct, feedback: '' };
      const missed = item.answer.filter((id) => !answer.ids.includes(id));
      const extra = answer.ids.filter((id) => !item.answer.includes(id));
      // One paragraph per card's tip (each tip names its card), and a reason already given is not repeated.
      const seen = new Set<string>();
      const tips = [
        ...missed.map((id) => item.missTips?.[id]),
        ...extra.map((id) => item.pickTips?.[id]),
      ].flatMap((t) => {
        if (!t) return [];
        const fresh = t.replace(/([.!?”])\s+(?=[A-Z“])/g, '$1\n').split('\n').filter((sentence) => !seen.has(sentence));
        fresh.forEach((sentence) => seen.add(sentence));
        return fresh.length ? [fresh.join(' ')] : [];
      });
      if (tips.length) return { correct, feedback: tips.join('\n') };
      const label = (id: string) => `“${item.choices.find((c) => c.id === id)?.label ?? id}”`;
      const lines: string[] = [];
      if (missed.length) lines.push(`Your answer leaves out ${missed.length === 1 ? 'a card that is' : `${missed.length} cards that are`} needed: ${names(missed.map(label))}.`);
      if (extra.length) lines.push(`Your answer has ${extra.length === 1 ? 'a card that is' : `${extra.length} cards that are`} not needed: ${names(extra.map(label))}.`);
      return { correct, feedback: lines.join('\n') };
    }
    case 'order': {
      if (answer.kind !== 'order') return { correct: false, feedback: item.explain };
      const broken = item.clues.map((c, i) => (clueHolds(c, answer.ids) ? -1 : i)).filter((i) => i >= 0);
      const correct = answer.ids.length === item.answer.length && answer.ids.every((id, i) => id === item.answer[i]);
      if (correct) return { correct, feedback: '', broken: [] };
      const nameOf = (id: string) => item.names.find((x) => x.id === id)?.label ?? id;
      const feedback = broken.length
        ? [
            `This line breaks ${clueList(broken)}.`,
            ...broken.map((i) => {
              const words = clueText(item, i);
              return `${words ? `Clue ${i + 1} says ${quoted(words)} ` : `Clue ${i + 1}: `}${lineClueFailure(item.clues[i], answer.ids, nameOf)}`;
            }),
          ].join('\n')
        : 'Every clue holds, but the line is not complete yet.';
      return { correct, feedback, broken };
    }
  }
}
