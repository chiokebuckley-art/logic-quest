/**
 * Stop 1 treasure signs. The puzzles are re-solved here from the words the player sees (the sign texts
 * and the rule), so the engine's answer, explanation and feedback are checked against the page itself.
 */
import { describe, expect, it } from 'vitest';
import { L4_EXAMPLE, stop1 } from '../../content/stop1';
import { createRng } from '../rng';
import {
  SIGN_RULES,
  SIGN_SKINS,
  explainSigns,
  fitsRule,
  makeSignPuzzle,
  signBoxes,
  signConclusion,
  signDeniesAnswer,
  signHolds,
  signItem,
  signWords,
  solutions,
  trueSigns,
  type Sign,
  type SignRule,
  type SignSkin,
} from '../puzzles/signs';
import { freshCheckSet } from '../fresh';
import { READING, fkGrade, longestSentence, sentences, words } from '../readability';
import { feedbackText, teachStrings } from '../teach';
import type { Item, SignBox } from '../types';

/** Reads a sign ("The treasure is not in the Gold chest.") and says whether it is true for a treasure spot. */
function readSign(skin: SignSkin, box: number, text: string): (t: number) => boolean {
  const w = signWords(skin);
  const m = text.match(/^The (.+) is (not )?(in|behind) (.+)\.$/);
  if (!m) throw new Error(`cannot read sign: ${text}`);
  expect(m[1]).toBe(w.item);
  expect(m[3]).toBe(w.prep);
  const where = m[4] === `this ${w.noun}` ? box : [0, 1, 2].find((i) => w.the(i) === m[4]);
  if (where === undefined) throw new Error(`unknown place in sign: ${text}`);
  return (t) => (t === where) !== !!m[2];
}

/** Reads the rule and says whether a list of sign truths fits it, with the treasure in box t. */
function readRule(skin: SignSkin, text: string): (truths: boolean[], t: number) => boolean {
  const w = signWords(skin);
  const count = (tr: boolean[]) => tr.filter(Boolean).length;
  if (text === 'Exactly one sign is true.') return (tr) => count(tr) === 1;
  if (text === 'Exactly two signs are true.') return (tr) => count(tr) === 2;
  if (text === 'Every sign is false.') return (tr) => count(tr) === 0;
  if (text === `The sign on the ${w.noun} with the ${w.item} is true. The other signs are false.`) {
    return (tr, t) => tr.every((v, i) => v === (i === t));
  }
  throw new Error(`cannot read rule: ${text}`);
}

/** Every box that fits, worked out from the words alone. */
function solveFromText(skin: SignSkin, boxes: SignBox[], rule: string): number[] {
  const signs = boxes.map((b, i) => readSign(skin, i, b.sign));
  const fits = readRule(skin, rule);
  return [0, 1, 2].filter((t) => fits(signs.map((s) => s(t)), t));
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const NUM_WORD = ['no', 'one', 'two', 'three'];

/** Each sign's truth with the treasure in box t, read from the sign words. */
const truthsFromText = (skin: SignSkin, boxes: SignBox[], t: number) => boxes.map((b, i) => readSign(skin, i, b.sign)(t));

/** A case card's truths, from the words alone: each sign, then whether the rule fits. */
function expectedTruths(skin: SignSkin, boxes: SignBox[], rule: string, t: number) {
  const w = signWords(skin);
  const tr = truthsFromText(skin, boxes, t);
  return [...tr.map((value, i) => ({ who: cap(w.signOf(i)), value })), { who: 'Fits the rule', value: readRule(skin, rule)(tr, t) }];
}

/** The headline a wrong box must get, worked out from the words: the count it makes, or the owner rule it breaks. */
function expectedHeadline(skin: SignSkin, rule: string, tr: boolean[], b: number): string {
  const w = signWords(skin);
  const on = tr.flatMap((v, i) => (v ? [i] : []));
  if (rule.startsWith('The sign on')) {
    if (!tr[b]) return `Your answer makes ${w.signOf(b)} false, but the rule needs it to be true.`;
    const others = on.filter((i) => i !== b);
    return `Your answer makes ${w.signList(others)} true too, but the rule needs ${others.length === 1 ? 'it' : 'them'} to be false.`;
  }
  if (rule === 'Every sign is false.') return `Your answer makes ${w.signList(on)} true, but the rule says every sign is false.`;
  const need = rule.startsWith('Exactly one') ? 'one' : 'two';
  const n = on.length;
  const many = n === 0 ? 'no sign' : n === 3 ? 'all three signs' : `${NUM_WORD[n]} sign${n === 1 ? '' : 's'}`;
  return `Your answer makes ${many} true, but the rule needs exactly ${need}.`;
}

/** The kind of mistake a wrong box makes, from the words: the rule, and the count or the owner sign. */
function mistakeKind(rule: string, tr: boolean[], b: number): string {
  if (rule.startsWith('The sign on')) return tr[b] ? 'owner|others-true' : 'owner|own-false';
  // "Every sign is false": any true sign breaks it, and the headline names which.
  if (rule === 'Every sign is false.') return 'none|a sign is true';
  return `${rule}|${tr.filter(Boolean).length}`;
}

const ALL_SIGNS = (owner: number): Sign[] => {
  const others = [0, 1, 2].filter((i) => i !== owner);
  return [{ t: 'here' }, { t: 'notHere' }, ...others.map((x) => ({ t: 'in' as const, x })), ...others.map((x) => ({ t: 'notIn' as const, x }))];
};

/** All 6 x 6 x 6 sign sets. */
const ALL_SETS: Sign[][] = [];
for (const a of ALL_SIGNS(0)) for (const b of ALL_SIGNS(1)) for (const c of ALL_SIGNS(2)) ALL_SETS.push([a, b, c]);

describe('treasure signs', () => {
  it('signHolds() matches the sign words', () => {
    expect(signHolds({ t: 'here' }, 1, 1)).toBe(true);
    expect(signHolds({ t: 'here' }, 1, 2)).toBe(false);
    expect(signHolds({ t: 'notHere' }, 0, 2)).toBe(true);
    expect(signHolds({ t: 'in', x: 2 }, 0, 2)).toBe(true);
    expect(signHolds({ t: 'notIn', x: 2 }, 0, 2)).toBe(false);
  });

  it('solves every one of the 216 sign sets under every rule exactly as the words say', () => {
    for (const skin of SIGN_SKINS) {
      for (const signs of ALL_SETS) {
        for (const rule of SIGN_RULES) {
          const p = { signs, rule, answer: -1 };
          const boxes = signBoxes(p, skin);
          const byText = solveFromText(skin, boxes, signWords(skin).ruleText(rule));
          expect(solutions(signs, rule), `${skin} ${rule} ${JSON.stringify(signs)}`).toEqual(byText);
          for (const t of [0, 1, 2]) expect(fitsRule(signs, rule, t)).toBe(byText.includes(t));
        }
      }
    }
  });

  it('every rule has many different one-answer puzzles', () => {
    for (const rule of SIGN_RULES) {
      const unique = ALL_SETS.filter((signs) => solutions(signs, rule).length === 1);
      expect(unique.length, rule).toBeGreaterThanOrEqual(20);
      // ... and the answer is not always the same box.
      expect(new Set(unique.map((signs) => solutions(signs, rule)[0])).size, rule).toBe(3);
    }
  });

  it('makeSignPuzzle(): exactly one box works, on 1,000 seeds for each rule', () => {
    for (const rule of SIGN_RULES) {
      const answers = [0, 0, 0];
      for (let seed = 1; seed <= 1000; seed++) {
        const p = makeSignPuzzle(createRng(seed), rule);
        expect(p.rule).toBe(rule);
        const works = [0, 1, 2].filter((t) => {
          const tr = p.signs.map((s, i) => signHolds(s, i, t));
          const n = tr.filter(Boolean).length;
          if (rule === 'one') return n === 1;
          if (rule === 'two') return n === 2;
          if (rule === 'none') return n === 0;
          return tr.every((v, i) => v === (i === t));
        });
        expect(works).toEqual([p.answer]);
        p.signs.forEach((s, i) => {
          if (s.t === 'in' || s.t === 'notIn') expect(s.x).not.toBe(i);
        });
        answers[p.answer]++;
      }
      expect(Math.min(...answers), rule).toBeGreaterThan(100);
    }
  });

  it('items: the answer, every wrong-box message and the explanation match the words on the page', () => {
    for (let seed = 1; seed <= 400; seed++) {
      for (const skin of SIGN_SKINS) {
        const m = signItem(createRng(seed), { skin, rule: SIGN_RULES[seed % 4] });
        const it = m.item;
        const w = signWords(skin);
        if (it.scene?.kind !== 'boxes') throw new Error('no boxes');
        const { boxes, rule } = it.scene;
        const sol = solveFromText(skin, boxes, rule);
        expect(sol).toEqual([m.puzzle.answer]);
        expect(it.answer).toBe(boxes[sol[0]].id);
        expect(it.choices.map((c) => c.label)).toEqual(boxes.map((b) => b.name));
        expect(Object.keys(it.whyWrong ?? {}).sort()).toEqual(boxes.filter((_, i) => i !== sol[0]).map((b) => b.id).sort());
        expect(Object.keys(it.feedback ?? {}).sort()).toEqual(boxes.filter((_, i) => i !== sol[0]).map((b) => b.id).sort());
        expect(!!it.conflict).toBe(signDeniesAnswer(m.puzzle));

        // Each wrong box's explanation: every sign's truth there, read from the words on the page.
        for (const [id, fb] of Object.entries(it.feedback ?? {})) {
          const b = boxes.findIndex((x) => x.id === id);
          expect(it.whyWrong![id]).toBe(feedbackText(fb));
          const truths = truthsFromText(skin, boxes, b);
          expect(fb.detail[0]).toBe(`Your answer means the ${w.item} is ${w.prep} ${w.the(b)}.`);
          expect(fb.detail[1]).toBe(`Then ${truths.map((v, i) => `${w.signOf(i)} is ${v ? 'true' : 'false'}`).join(', ').replace(/, ([^,]+)$/, ', and $1')}.`);
          expect(fb.detail[2].endsWith(`So the ${w.item} can’t be ${w.prep} ${w.the(b)}.`)).toBe(true);
          // T-truth: the example card is this box, with the truths the words give.
          expect(fb.example!.label).toBe(`Pretend the ${w.item} is ${w.prep} ${w.the(b)}.`);
          expect(fb.example!.truths).toEqual(expectedTruths(skin, boxes, rule, b));
          expect(fb.example!.truths!.at(-1)).toEqual({ who: 'Fits the rule', value: false });
          // T-kind: the headline names the gap the words show.
          expect(fb.headline, fb.headline).toBe(expectedHeadline(skin, rule, truths, b));
          // A sign that points to this box makes it look right; the detail says signs can be false.
          const pointer = boxes.findIndex((x, i) => x.sign === `The ${w.item} is ${w.prep} ${i === b ? `this ${w.noun}` : w.the(b)}.`);
          const trust = `${cap(w.signOf(pointer))} says the ${w.item} is ${w.prep} ${w.the(b)}. But signs can be false. Only the rule tells you which signs to trust.`;
          if (pointer >= 0) expect(fb.detail).toContain(trust);
          else expect(fb.detail.join(' ')).not.toContain('But signs can be false.');
        }

        // The explanation: at most 3 short sentences, ending on the right box, with the right counts.
        const ex = it.explain;
        expect(sentences(ex).length).toBeLessThanOrEqual(3);
        for (const s of sentences(ex)) expect(words(s).length).toBeLessThanOrEqual(25);
        expect(ex).toContain(`Only ${w.the(sol[0])} ${m.puzzle.rule === 'owner' ? 'fits the rule' : 'makes'}`);
        expect(ex.endsWith(`, so the ${w.item} is ${w.prep} it.`), ex).toBe(true);
        expect(ex, 'the first case names the prize, not a bare “it”').toMatch(new RegExp(`^(If|With) the ${w.item} `));
        expect(ex).not.toContain('its own sign');
        const place = (text: string) => [0, 1, 2].find((i) => w.the(i) === text);
        let cases = 0;
        if (m.puzzle.rule !== 'owner') {
          const NUM: Record<string, number> = { no: 0, one: 1, two: 2, 'all three': 3 };
          for (const [, where, n] of ex.matchAll(/With (?:the .+?|it) (?:in|behind) (.+?), (no|one|two|all three) signs? would be true\./g)) {
            const b = place(where)!;
            expect(b, ex).not.toBe(undefined);
            expect(b, ex).not.toBe(sol[0]);
            expect(trueSigns(m.puzzle.signs, b).length, ex).toBe(NUM[n]);
            cases++;
          }
        } else {
          for (const [, where, named, what] of ex.matchAll(/If (?:the .+?|it) were (?:in|behind) (.+?), (.+?) would be (false|true too)\./g)) {
            const b = place(where)!;
            expect(b, ex).not.toBe(undefined);
            expect(b, ex).not.toBe(sol[0]);
            const own = signHolds(m.puzzle.signs[b], b, b);
            if (what === 'false') {
              expect(own, ex).toBe(false);
              expect(named, ex).toBe(w.signOf(b));
            } else {
              expect(own, ex).toBe(true);
              expect(named, ex).toBe(w.signList(trueSigns(m.puzzle.signs, b).filter((i) => i !== b)));
            }
            cases++;
          }
        }
        expect(cases, ex).toBe(2);
      }
    }
  });

  it('the worked example on the key-idea card has one answer: the Silver chest', () => {
    expect(solutions(L4_EXAMPLE.signs, L4_EXAMPLE.rule)).toEqual([1]);
    expect(L4_EXAMPLE.answer).toBe(1);
    expect(explainSigns(L4_EXAMPLE, 'chest')).toContain('Only the Silver chest makes exactly one sign true, so the treasure is in it.');
    const card = stop1.lessons[3].ideas.find((c) => c.scene?.kind === 'boxes')!;
    if (card.scene?.kind !== 'boxes') throw new Error('no example scene');
    expect(solveFromText('chest', card.scene.boxes, card.scene.rule)).toEqual([1]);
    // One paragraph per chest, each with the right true signs and count, then the conclusion.
    const w = signWords('chest');
    const COUNT = ['zero', 'one', 'two', 'three'];
    expect(card.body.length).toBe(4);
    [0, 1, 2].forEach((b) => {
      const ts = trueSigns(L4_EXAMPLE.signs, b);
      expect(card.body[b].startsWith(`If the treasure is in ${w.the(b)}, `), card.body[b]).toBe(true);
      expect(card.body[b]).toContain(w.signList(ts));
      expect(card.body[b].endsWith(`That makes ${COUNT[ts.length]} true sign${ts.length === 1 ? '' : 's'}.`), card.body[b]).toBe(true);
    });
    expect(card.body[3]).toBe('Only the Silver chest makes exactly one sign true. So the treasure is in the Silver chest.');
    expect(signConclusion(L4_EXAMPLE, 'chest')).toBe(card.body[3]);
  });

  it('T-teach, T-truth and T-cover: every item teaches with all three places the treasure could be, read from the words', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const skin of SIGN_SKINS) {
        const m = signItem(createRng(seed), { skin, rule: SIGN_RULES[seed % 4] });
        const it = m.item;
        const w = signWords(skin);
        if (it.scene?.kind !== 'boxes') throw new Error('no boxes');
        const { boxes, rule } = it.scene;
        const t = it.teach!;
        expect(t.rule).toBe(`Pretend the ${w.item} is ${w.prep} each ${w.noun}, one at a time. Check which signs are true. Keep the ${w.noun} that fits the rule.`);
        // Words: a true sign, the rule's own words, and "this chest" when a sign says it.
        const words = t.terms!.map((x) => x.word);
        expect(words[0]).toBe('A true sign');
        expect(words[1]).toBe({ one: '“Exactly one”', two: '“Exactly two”', none: '“Every sign is false”', owner: '“The other signs”' }[m.puzzle.rule]);
        expect(words.includes(`“This ${w.noun}”`)).toBe(boxes.some((b) => b.sign.includes(`this ${w.noun}`)));
        expect(t.casesTitle).toBe(`If the ${w.item} were ${w.prep} each ${w.noun}, which signs would be true?`);
        // One case per box, in order, with every truth from the words; only the answer's box fits the rule.
        expect(t.cases!.length).toBe(3);
        t.cases!.forEach((c, b) => {
          expect(c.label).toBe(`Pretend the ${w.item} is ${w.prep} ${w.the(b)}.`);
          expect(c.truths).toEqual(expectedTruths(skin, boxes, rule, b));
          const n = truthsFromText(skin, boxes, b).filter(Boolean).length;
          if (m.puzzle.rule !== 'owner') expect(c.note!.startsWith(`That makes ${n} true sign${n === 1 ? '' : 's'}.`), c.note).toBe(true);
          expect(c.note!.endsWith('This fits the rule.')).toBe(b === m.puzzle.answer);
        });
        expect(t.cases!.map((c) => c.truths!.at(-1)!.value)).toEqual([0, 1, 2].map((b) => b === m.puzzle.answer));
        expect(t.remember![1]).toBe(`Ask: “If the ${w.item} were here, which signs would be true?”`);
        // The simpler example: one sign, checked for two places, from the words.
        const [look, ...ifs] = t.simpler!;
        const i = boxes.findIndex((b) => look === `Look at one sign. ${cap(w.signOf(boxes.indexOf(b)))} says, “${b.sign}”`);
        expect(i, look).toBeGreaterThanOrEqual(0);
        if (boxes.some((b) => b.sign.includes(`this ${w.noun}`))) expect(boxes[i].sign).toContain(`this ${w.noun}`);
        let checked = 0;
        for (const line of ifs) {
          const mm = line.match(/^If the .+? is (?:in|behind) (.+), this sign is (true|false)\.$/);
          if (!mm) continue;
          const place = [0, 1, 2].find((k) => w.the(k) === mm[1])!;
          expect(readSign(skin, i, boxes[i].sign)(place), line).toBe(mm[2] === 'true');
          checked++;
        }
        expect(checked).toBe(2);
      }
    }
  });

  it('T-kind: one headline for each kind of mistake, and no headline for two kinds', () => {
    const heads = new Map<string, Set<string>>();
    const names = /the (Gold|Silver|Bronze|Red|Blue|Green|Ice|Fire|Moss)( and (Gold|Silver|Bronze|Red|Blue|Green|Ice|Fire|Moss))? (chest|door|cave) signs?|the signs? on Box [ABC]( and Box [ABC])?|all three signs/g;
    for (let seed = 1; seed <= 300; seed++) {
      for (const skin of SIGN_SKINS) {
        const it = signItem(createRng(seed), { skin, rule: SIGN_RULES[seed % 4] }).item;
        if (it.scene?.kind !== 'boxes') throw new Error('no boxes');
        for (const [id, fb] of Object.entries(it.feedback!)) {
          const b = it.scene.boxes.findIndex((x) => x.id === id);
          const key = mistakeKind(it.scene.rule.replace(/(chest|door|cave|box) with the (treasure|prize|dragon egg)/, 'X'), truthsFromText(skin, it.scene.boxes, b), b);
          if (!heads.has(key)) heads.set(key, new Set());
          heads.get(key)!.add(fb.headline.replace(names, 'SIGNS').replace(/needs (it|them) to/, 'needs IT to'));
        }
      }
    }
    // one: 0, 2 or 3 true; two: 0, 1 or 3; none: some sign is true; owner: its own sign false, or another sign true.
    expect(heads.size).toBe(9);
    for (const [key, hs] of heads) expect(hs.size, `${key}: ${[...hs].join(' / ')}`).toBe(1);
    const all = [...heads.values()].map((h) => [...h][0]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('T-fresh: a miss gets a new puzzle with the same rule on other boxes', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of stop1.lessons[3].practice(createRng(seed))) {
        const set = freshCheckSet(stop1, it, seed * 11, [], 1);
        expect(set.length).toBe(1);
        const [x] = set;
        if (it.scene?.kind !== 'boxes' || x.scene?.kind !== 'boxes') throw new Error('no boxes');
        expect(x.skill).toBe(it.skill);
        expect(x.lesson).toBe('s1.l4');
        const kind = (r: string) => (r.startsWith('Exactly one') ? 'one' : r.startsWith('Exactly two') ? 'two' : r.startsWith('Every') ? 'none' : 'owner');
        expect(kind(x.scene.rule)).toBe(kind(it.scene.rule));
        expect(x.scene.boxes[0].name).not.toBe(it.scene.boxes[0].name);
      }
    }
  });

  it('T-fresh: the new puzzle is not the missed one with new names (its signs, read from the words, differ)', () => {
    /** Each sign as a shape: "self", "!self", "in 2", "!in 0", read from the words alone. */
    const shape = (boxes: SignBox[]) => {
      const skin = SIGN_SKINS.find((k) => signWords(k).name(0) === boxes[0].name)!;
      return JSON.stringify(boxes.map((b, i) => [0, 1, 2].map((t) => readSign(skin, i, b.sign)(t))));
    };
    let n = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const it of stop1.lessons[3].practice(createRng(seed))) {
        // The app asks with seed + round * 15485863; reskinning the same signs once happened in about 1 of 70.
        for (const s of [seed + 15485863, seed + 2 * 15485863]) {
          const [x] = freshCheckSet(stop1, it, s, [], 1);
          if (it.scene?.kind !== 'boxes' || x.scene?.kind !== 'boxes') throw new Error('no boxes');
          expect(shape(x.scene.boxes), `${JSON.stringify(it.scene.boxes)} -> ${JSON.stringify(x.scene.boxes)}`).not.toBe(shape(it.scene.boxes));
          n++;
        }
      }
    }
    expect(n).toBe(2400);
  });

  it('T-read: each item reads at grade 7 or lower, with curly quotes', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const skin of SIGN_SKINS) {
        const it = signItem(createRng(seed), { skin, rule: SIGN_RULES[seed % 4] }).item as unknown as Item;
        const text = [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it)].join('\n');
        expect(fkGrade(text), text).toBeLessThanOrEqual(READING.maxGrade);
        const long = longestSentence(text);
        expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
        expect(text).not.toMatch(/"|”\.|that row|the opposite|its own sign/);
      }
    }
  });

  it('lesson 4 practice starts with the rule the cards teach and uses every rule', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const items = stop1.lessons[3].practice(createRng(seed));
      const rules = items.map((it) => (it.scene?.kind === 'boxes' ? it.scene.rule : ''));
      expect(rules[0]).toBe('Exactly one sign is true.');
      expect(new Set(items.map((it) => it.skill)).size).toBe(2);
      const kinds: SignRule[] = [];
      for (const it of items) {
        if (it.scene?.kind !== 'boxes') continue;
        const r = it.scene.rule;
        kinds.push(r.startsWith('Exactly one') ? 'one' : r.startsWith('Exactly two') ? 'two' : r.startsWith('Every') ? 'none' : 'owner');
      }
      expect(new Set(kinds).size).toBe(4);
    }
  });
});
