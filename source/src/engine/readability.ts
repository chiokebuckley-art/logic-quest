/**
 * Reading-level checks for game text. The target reader is at a 6th-grade reading level, so
 * lesson text is held to a Flesch-Kincaid grade of 7.0 or lower and no sentence longer than 25 words.
 */

/** Rough syllable count for one English word (vowel groups, minus a silent final e). Always at least 1. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1; // numbers and symbols read as one beat
  if (w.length <= 3) return 1;
  const stem = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = stem.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Split into sentences on . ! ? and line breaks. Quotes and brackets are ignored. */
export function sentences(text: string): string[] {
  return text
    .replace(/[“”"()]/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z0-9]/.test(s));
}

export function words(text: string): string[] {
  return text.split(/\s+/).map((w) => w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')).filter(Boolean);
}

/** Flesch-Kincaid grade level of a block of text. */
export function fkGrade(text: string): number {
  const ss = sentences(text);
  const ws = ss.flatMap(words);
  if (!ws.length || !ss.length) return 0;
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (ws.length / ss.length) + 11.8 * (syl / ws.length) - 15.59;
}

export function longestSentence(text: string): { words: number; sentence: string } {
  let best = { words: 0, sentence: '' };
  for (const s of sentences(text)) {
    const n = words(s).length;
    if (n > best.words) best = { words: n, sentence: s };
  }
  return best;
}

export const READING = { maxGrade: 7.0, maxSentenceWords: 25 } as const;

