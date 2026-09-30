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
    if (broken.length) return { feedback: `This answer breaks ${clueList(broken)}.`, broken };
  }
  if (item.claims) {
    const kinds: Record<string, 'knight' | 'knave'> = {};
    for (const p of item.people) kinds[p.id] = values[p.id].kind === 'knight' ? 'knight' : 'knave';
    const broken: number[] = [];
    item.people.forEach((p, i) => { const cl = item.claims?.[p.id]; if (cl && !speakerFits(p.id, cl, kinds)) broken.push(i); });
    if (broken.length) {
      const p = item.people[broken[0]];
      const feedback = kinds[p.id] === 'knight'
        ? `If ${p.label} is a knight, what ${p.label} says must be true. With your answer, it is false.`
        : `If ${p.label} is a knave, what ${p.label} says must be false. With your answer, it is true.`;
      return { feedback, broken };
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
      const extra = answer.ids.filter((id) => !item.answer.includes(id)).length;
      const missed = item.answer.filter((id) => !answer.ids.includes(id)).length;
      const parts: string[] = [];
      if (missed) parts.push(`You left out ${missed} card${missed === 1 ? '' : 's'} that ${missed === 1 ? 'fits' : 'fit'}.`);
      if (extra) parts.push(`You tapped ${extra} card${extra === 1 ? '' : 's'} that ${extra === 1 ? 'does' : 'do'} not fit.`);
      return { correct, feedback: parts.join(' ') };
    }
    case 'assign': {
      if (answer.kind !== 'assign') return { correct: false, feedback: item.explain };
      const correct = item.people.every((p) => item.categories.every((c) => answer.values[p.id]?.[c.id] === item.answer[p.id][c.id]));
      if (correct) return { correct, feedback: '', broken: [] };
      return { correct, ...assignFeedback(item, answer.values) };
    }
    case 'multi': {
      if (answer.kind !== 'multi') return { correct: false, feedback: item.explain };
      const correct = sameSet(answer.ids, item.answer);
      if (correct) return { correct, feedback: '' };
      const missed = item.answer.filter((id) => !answer.ids.includes(id));
      const extra = answer.ids.filter((id) => !item.answer.includes(id));
      const tips = [
        ...missed.map((id) => item.missTips?.[id]).filter((t): t is string => !!t),
        ...extra.map((id) => item.pickTips?.[id]).filter((t): t is string => !!t),
      ];
      if (tips.length) return { correct, feedback: tips.join(' ') };
      const parts: string[] = [];
      if (missed.length) parts.push(`You left out ${missed.length} card${missed.length === 1 ? '' : 's'} that ${missed.length === 1 ? 'is' : 'are'} needed.`);
      if (extra.length) parts.push(`You picked ${extra.length} card${extra.length === 1 ? '' : 's'} that ${extra.length === 1 ? 'is' : 'are'} not needed.`);
      return { correct, feedback: parts.join(' ') };
    }
    case 'order': {
      if (answer.kind !== 'order') return { correct: false, feedback: item.explain };
      const broken = item.clues.map((c, i) => (clueHolds(c, answer.ids) ? -1 : i)).filter((i) => i >= 0);
      const correct = answer.ids.length === item.answer.length && answer.ids.every((id, i) => id === item.answer[i]);
      if (correct) return { correct, feedback: '', broken: [] };
      const feedback = broken.length
        ? `This line breaks ${clueList(broken)}.`
        : 'Every clue holds, but the line is not complete yet.';
      return { correct, feedback, broken };
    }
  }
}

