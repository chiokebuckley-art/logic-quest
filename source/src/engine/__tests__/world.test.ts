/**
 * The real-life contract (docs/CONTENT_GUIDE.md, "Real life"): every ready lesson has a why and three uses (at least
 * one from everyday life and one from a job), every skill a ready stop can ask about has an "In real life" line,
 * every stop has its one line, and all of it reads at the game's level with kid-safe words and curly quotes.
 */
import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { SOON_WORLD, WORLD, lessonWorld, skillWorld, stopWorld, useOfTheDay } from '../../content/world';
import { createRng } from '../rng';
import { READING, fkGrade, longestSentence, sentences, words } from '../readability';

/** Words that do not belong in a kids' game, even in a true example. */
const BANNED = /\b(beer|wine|alcohol|drunk|guns?|kill\w*|blood\w*|drugs?|cigarettes?|smok\w*|vap\w*|gambl\w*|casino|lottery|betting|bets?|murder\w*|crim(e|es|inal)|police|weapons?|bombs?|war|suicide|sex\w*|dat(e|ing)\s+app)\b/i;

/** Every skill a stop's lessons, check and practice can ask about, with the lesson that teaches it. */
function stopSkills(stop: (typeof STOPS)[number]): Map<string, string> {
  const out = new Map<string, string>();
  for (let seed = 1; seed <= 40; seed++) {
    const items = [...stop.lessons.flatMap((l) => l.practice(createRng(seed))), ...(stop.check?.(createRng(seed)) ?? []), ...(stop.practice ? [stop.practice(createRng(seed))] : [])];
    for (const it of items) if (!out.has(it.skill)) out.set(it.skill, it.lesson);
  }
  return out;
}

const count = (text: string) => ({ sentences: sentences(text).length, words: words(text).length });

function styleProblems(text: string): string[] {
  const out: string[] = [];
  if (/['"]/.test(text)) out.push('straight quote or apostrophe (use ’ “ ”)');
  if (BANNED.test(text)) out.push(`word not for kids: ${text.match(BANNED)?.[0]}`);
  if (!/[.!?”]$/.test(text.trim())) out.push('does not end like a sentence');
  if (/\bTODO\b/.test(text)) out.push('TODO');
  if (/^\s*in real life\b/i.test(text)) out.push('starts with “In real life” (the screen adds it)');
  return out;
}

const seen = new Map<string, string>();

for (const stop of STOPS.filter((s) => s.ready)) {
  describe(`real life · stop ${stop.n}`, () => {
    const w = WORLD[stop.id];
    const skills = stopSkills(stop);

    it('has its pack and its one line', () => {
      expect(w, `${stop.id} pack`).toBeTruthy();
      const c = count(w.stop);
      expect(styleProblems(w.stop), w.stop).toEqual([]);
      expect(c.sentences, w.stop).toBeLessThanOrEqual(2);
      expect(c.words, w.stop).toBeLessThanOrEqual(30);
    });

    it('covers every lesson, and only its lessons', () => {
      expect(Object.keys(w.lessons).sort()).toEqual(stop.lessons.map((l) => l.id).sort());
    });

    for (const lesson of stop.lessons) {
      it(`${lesson.id}: a why and three uses, everyday and work`, () => {
        const lw = w.lessons[lesson.id];
        expect(lw, lesson.id).toBeTruthy();
        expect(styleProblems(lw.why), lw.why).toEqual([]);
        expect(count(lw.why).sentences, lw.why).toBeLessThanOrEqual(2);
        expect(count(lw.why).words, lw.why).toBeLessThanOrEqual(30);
        expect(lw.uses).toHaveLength(3);
        expect(new Set(lw.uses.map((u) => u.who.toLowerCase())).size, `${lesson.id} who`).toBe(3);
        expect(lw.uses.some((u) => u.kind === 'life'), `${lesson.id} needs an everyday use`).toBe(true);
        expect(lw.uses.some((u) => u.kind === 'work'), `${lesson.id} needs a use from a job`).toBe(true);
        for (const u of lw.uses) {
          expect(words(u.who).length, u.who).toBeLessThanOrEqual(5);
          expect(u.who, u.who).toMatch(/^[A-Z]/);
          expect(/['"]/.test(u.who), u.who).toBe(false);
          expect(styleProblems(u.text), u.text).toEqual([]);
          expect(count(u.text).sentences, u.text).toBeLessThanOrEqual(3);
          expect(count(u.text).words, u.text).toBeLessThanOrEqual(40);
        }
      });
    }

    it('has an “In real life” line for every skill it can ask about, and only those', () => {
      const missing = [...skills.keys()].filter((k) => !w.skills[k]?.length).sort();
      expect(missing, 'skills without a line').toEqual([]);
      const extra = Object.keys(w.skills).filter((k) => !skills.has(k)).sort();
      expect(extra, 'lines for skills this stop never asks about').toEqual([]);
      for (const [k, lines] of Object.entries(w.skills)) {
        expect(lines.length, k).toBeGreaterThanOrEqual(1);
        expect(lines.length, k).toBeLessThanOrEqual(2);
        for (const line of lines) {
          expect(styleProblems(line), `${k}: ${line}`).toEqual([]);
          expect(count(line).sentences, line).toBeLessThanOrEqual(3);
          expect(count(line).words, line).toBeLessThanOrEqual(35);
        }
      }
    });

    it(`reads at a 6th-grade level (Flesch-Kincaid <= ${READING.maxGrade}, sentences <= ${READING.maxSentenceWords} words)`, () => {
      for (const lesson of stop.lessons) {
        const lw = w.lessons[lesson.id];
        if (!lw) continue;
        const lines = [...skills].filter(([, l]) => l === lesson.id).flatMap(([k]) => w.skills[k] ?? []);
        const text = [lw.why, ...lw.uses.map((u) => u.text), ...lines].join(' ');
        expect(fkGrade(text), `${lesson.id} real-life grade`).toBeLessThanOrEqual(READING.maxGrade);
        const long = longestSentence(text);
        expect(long.words, `${lesson.id}: “${long.sentence}”`).toBeLessThanOrEqual(READING.maxSentenceWords);
      }
      const long = longestSentence(w.stop);
      expect(long.words, w.stop).toBeLessThanOrEqual(READING.maxSentenceWords);
    });

    it('never repeats an example from elsewhere in the game', () => {
      const texts = [w.stop, ...Object.values(w.lessons).flatMap((lw) => [lw.why, ...lw.uses.map((u) => u.text)]), ...Object.values(w.skills).flat()];
      for (const t of texts) {
        const key = t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const where = seen.get(key);
        expect(where, `“${t}” is also in ${where}`).toBeUndefined();
        seen.set(key, stop.id);
      }
    });
  });
}

describe('real life · every stop and the lookups', () => {
  it('every stop has its one line, ready or coming', () => {
    for (const stop of STOPS) expect(stopWorld(stop.id), stop.id).toBeTruthy();
    for (const [id, line] of Object.entries(SOON_WORLD)) {
      expect(styleProblems(line), line).toEqual([]);
      expect(longestSentence(line).words, line).toBeLessThanOrEqual(READING.maxSentenceWords);
      expect(STOPS.find((s) => s.id === id)?.ready, `${id} is ready: its line belongs in its pack`).toBe(false);
    }
    expect(fkGrade(Object.values(SOON_WORLD).join(' ')), 'coming stops grade').toBeLessThanOrEqual(READING.maxGrade);
  });

  it('picks the same line for the same item, and a reminder that changes by day', () => {
    const [skill, lines] = Object.entries(WORLD.s1.skills)[0];
    expect(lines).toContain(skillWorld(skill, 'item-1'));
    expect(skillWorld(skill, 'item-1')).toBe(skillWorld(skill, 'item-1'));
    expect(skillWorld('s99.nothing', 'x')).toBeUndefined();
    expect(lessonWorld('s1.l1')?.uses).toHaveLength(3);
    expect(useOfTheDay([], '2026-10-07')).toBeUndefined();
    const a = useOfTheDay(['s1.l1'], '2026-10-07');
    expect(a?.lessonId).toBe('s1.l1');
    expect(useOfTheDay(['s1.l1'], '2026-10-07')).toEqual(a);
  });
});
