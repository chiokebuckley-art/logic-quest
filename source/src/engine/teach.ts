/**
 * Helpers for the teaching shown after a wrong answer (Item.teach and ChooseItem.feedback). Engines build
 * the content; these keep the older one-string fields in step and collect every teaching string so the
 * reading-level test and the read-aloud see exactly what the screen shows.
 */
import type { ChoiceFeedback, ChooseItem, Item, TeachCase, Truth } from './types';

/** One wrong choice's explanation as one string: the headline, then its detail. */
export function feedbackText(fb: ChoiceFeedback): string {
  return [fb.headline, ...fb.detail].join(' ');
}

/** Fill whyWrong from feedback, so grade() and the check result use the same words as the explanation. */
export function syncWhyWrong<T extends Pick<ChooseItem, 'feedback' | 'whyWrong'>>(item: T): T {
  if (!item.feedback) return item;
  const whyWrong: Record<string, string> = { ...(item.whyWrong ?? {}) };
  for (const [id, fb] of Object.entries(item.feedback)) whyWrong[id] = feedbackText(fb);
  item.whyWrong = whyWrong;
  return item;
}

/** "true" / "false" as a player reads it. */
export const truthWord = (v: boolean) => (v ? 'true' : 'false');

/** "The dragon’s statement: false. Your answer: false." */
export function truthLine(truths: readonly Truth[]): string {
  return truths.map((t) => `${t.who}: ${truthWord(t.value)}.`).join(' ');
}

/** A case in words: its label, its truths and its note. Enough on its own when the picture cannot load. */
export function caseText(c: TeachCase): string[] {
  return [c.label, ...(c.truths?.length ? [truthLine(c.truths)] : []), ...(c.note ? [c.note] : [])];
}

/** Every player-facing teaching string of an item, in reading order. */
export function teachStrings(item: Item): string[] {
  const out: string[] = [];
  const t = item.teach;
  if (t) {
    out.push(t.rule);
    for (const term of t.terms ?? []) out.push(`${term.word} means ${term.meaning}`);
    if (t.meaning) out.push(t.meaning);
    if (t.casesTitle) out.push(t.casesTitle);
    for (const c of t.cases ?? []) out.push(...caseText(c));
    out.push(...(t.remember ?? []), ...(t.simpler ?? []));
  }
  if (item.kind === 'choose') {
    for (const fb of Object.values(item.feedback ?? {})) {
      out.push(fb.headline, ...fb.detail);
      if (fb.example) out.push(...caseText(fb.example));
      out.push(...(fb.simpler ?? []));
    }
  }
  return out;
}
