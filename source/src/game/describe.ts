/**
 * Plain words for an answer: what the player said, and what the right answer was. Used by the check result
 * ("You said: …" above "Right answer"). Pure and DOM-free, so it is tested on its own.
 */
import type { Answer, AssignItem, Item } from '../engine/types';
import { thingName } from './speech';

/** "a", "a and b", "a, b and c". */
export function listWords(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? '';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** The right answer to an item, as an Answer. */
export function rightAnswer(item: Item): Answer {
  switch (item.kind) {
    case 'choose': return { kind: 'choose', id: item.answer };
    case 'tapall': return { kind: 'tapall', ids: [...item.answer] };
    case 'order': return { kind: 'order', ids: [...item.answer] };
    case 'assign': return { kind: 'assign', values: item.answer };
    case 'multi': return { kind: 'multi', ids: [...item.answer] };
    case 'number': return { kind: 'number', value: item.answer };
  }
}

/** Knight / Knave read as "knight" / "knave". Grid values (cat, A, 1) stay as written. */
function valueWord(item: AssignItem, label: string): string {
  return item.layout === 'toggles' ? label.toLowerCase() : label;
}

/** One line per person: ["Mia: cat.", "Leo: fish."] or, with two categories, ["Mia: cat and popcorn.", …]. */
export function describeAssignLines(item: AssignItem, values: Readonly<Record<string, Readonly<Record<string, string>>>>): string[] {
  return item.people.map((p) => {
    const got = item.categories.map((c) => {
      const v = c.values.find((x) => x.id === values[p.id]?.[c.id]);
      return v ? valueWord(item, v.label) : null;
    });
    const words = got.filter((w): w is string => w !== null);
    return `${p.label}: ${words.length ? listWords(words) : 'no answer'}.`;
  });
}

/**
 * What an answer says, in plain words. Choices by their label, shape cards by name, a line-up in order,
 * a grid or knights answer person by person, and text cards by their label (in the order they are shown).
 */
export function describeAnswer(item: Item, answer: Answer | null | undefined): string {
  if (!answer || answer.kind !== item.kind) return 'No answer';
  switch (item.kind) {
    case 'choose': {
      if (answer.kind !== 'choose') return 'No answer';
      return item.choices.find((c) => c.id === answer.id)?.label ?? 'No answer';
    }
    case 'tapall': {
      if (answer.kind !== 'tapall') return 'No answer';
      const names = item.things.filter((t) => answer.ids.includes(t.id)).map(thingName);
      return names.length ? upperFirst(listWords(names)) : 'No cards';
    }
    case 'order': {
      if (answer.kind !== 'order') return 'No answer';
      const name = (id: string) => item.names.find((x) => x.id === id)?.label ?? id;
      return `${item.firstLabel} to ${item.lastLabel.toLowerCase()}: ${answer.ids.map(name).join(', ')}`;
    }
    case 'assign': {
      if (answer.kind !== 'assign') return 'No answer';
      return describeAssignLines(item, answer.values).join(' ');
    }
    case 'multi': {
      if (answer.kind !== 'multi') return 'No answer';
      const labels = item.choices.filter((c) => answer.ids.includes(c.id)).map((c) => c.label);
      return labels.length ? listWords(labels) : 'None chosen';
    }
    case 'number': {
      if (answer.kind !== 'number') return 'No answer';
      return `${answer.value}${item.unit ? ` ${item.unit}` : ''}`;
    }
  }
}

/** The right answer, in the same plain words. */
export function describeRight(item: Item): string {
  return describeAnswer(item, rightAnswer(item));
}
