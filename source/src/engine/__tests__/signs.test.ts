/**
 * Stop 1 treasure signs. The puzzles are re-solved here from the words the player sees (the sign texts
 * and the rule), so the engine's answer, explanation and feedback are checked against the page itself.
 */
import { describe, expect, it } from 'vitest';
import { L4_DRILL, L4_EXAMPLE, L4_FIRST_QUIZ, L4_FIRST_QUIZ_WORK, L5_EXAMPLE, L6_EXAMPLE, L7_EXAMPLE, stop1 } from '../../content/stop1';
import { checkDrill, marksToTap } from '../drill';
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
  signTwins,
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

  it('T-read: plurals are spelled out (“the other boxes,” never “boxs”) in every hint and explanation, in every skin and rule', () => {
    const PLURAL: Record<SignSkin, string> = { chest: 'chests', door: 'doors', cave: 'caves', box: 'boxes' };
    for (const skin of SIGN_SKINS) {
      expect(signWords(skin).nouns).toBe(PLURAL[skin]);
      for (let seed = 1; seed <= 40; seed++) {
        const it = signItem(createRng(seed), { skin, rule: SIGN_RULES[seed % 4] }).item as unknown as Item;
        expect(it.hint).toBe(`Here is one ${skin}, checked for you. Check the other ${PLURAL[skin]} the same way.`);
        const text = [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it)].join('\n');
        expect(text).not.toMatch(/\bboxs\b|\b(chest|door|cave|boxe)ss\b/);
      }
    }
    // The lesson's own quiz, check and arcade items too (a box board is in every practice set).
    for (let seed = 1; seed <= 40; seed++) {
      const items = [...stop1.lessons[3].practice(createRng(seed)), ...stop1.check!(createRng(seed)).filter((x) => x.lesson === 's1.l4')];
      for (const it of items) expect([it.hint ?? '', ...teachStrings(it)].join('\n'), it.id).not.toMatch(/\bboxs\b/);
      expect(items.some((it) => it.hint === 'Here is one box, checked for you. Check the other boxes the same way.'), `seed ${seed}`).toBe(true);
    }
  });

  it('lesson 4 teaches one rule: the chest example stays, “Other rules” is gone, and every quiz, check and arcade item says “Exactly one sign is true.”', () => {
    const l4 = stop1.lessons[3];
    expect(l4.ideas.map((c) => c.title)).toEqual(['Three chests', 'The rule', 'Try each chest', 'An example']);
    const ruleOf = (it: Item) => (it.scene?.kind === 'boxes' ? it.scene.rule : '');
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of l4.practice(createRng(seed))) expect(ruleOf(it), it.id).toBe('Exactly one sign is true.');
      for (const it of stop1.check!(createRng(seed)).filter((x) => x.lesson === 's1.l4')) expect(ruleOf(it)).toBe('Exactly one sign is true.');
      const a = stop1.practice!(createRng(seed));
      if (a.lesson === 's1.l4') expect(ruleOf(a)).toBe('Exactly one sign is true.');
    }
  });

  it('Do: the same chest board as the example. Silver is shown (False, False, True, 1, Keep); the learner marks Gold (True, True, False, 2, Reject)', () => {
    const l4 = stop1.lessons[3];
    const step = l4.drill![0];
    expect(l4.drill!.length).toBe(1);
    expect(step).toBe(L4_DRILL);
    expect(step.scene).toEqual(l4.ideas[3].scene);
    const [silver, gold] = step.rows;
    expect(silver.label).toBe('Pretend the treasure is in the Silver chest.');
    expect(silver.marks.every((m) => m.given)).toBe(true);
    expect(silver.marks.map((m) => m.answer)).toEqual(['false', 'false', 'true', '1', 'keep']);
    expect(gold.label).toBe('Pretend the treasure is in the Gold chest.');
    expect(gold.marks.some((m) => m.given)).toBe(false);
    expect(gold.marks.map((m) => m.answer)).toEqual(['true', 'true', 'false', '2', 'reject']);
    // Re-solved from the words on the board.
    const boxes = step.scene!.kind === 'boxes' ? step.scene!.boxes : [];
    const read = boxes.map((b, i) => readSign('chest', i, b.sign));
    expect(gold.marks.slice(0, 3).map((m) => m.answer)).toEqual(read.map((f) => String(f(0))));
    expect(silver.marks.slice(0, 3).map((m) => m.answer)).toEqual(read.map((f) => String(f(1))));
    // No answer buttons on this board: nothing asks which chest.
    expect(JSON.stringify(step)).not.toMatch(/Which chest/);
    // Right taps pass; a wrong Silver-sign tap names the first mismatch in plain words.
    const right = Object.fromEntries(marksToTap(step).map((m) => [m.id, m.answer]));
    expect(checkDrill(step, right).done).toBe(true);
    const wrong = checkDrill(step, { ...right, 'case0-sign1': 'false' });
    expect(wrong.done).toBe(false);
    expect(wrong.message).toBe('If the treasure is in the Gold chest, the Silver chest sign is true. It says, “The treasure is not in this chest.” The treasure is not in the Silver chest.');
    // Every wrong option of every mark has its own words, at the reading level.
    for (const m of marksToTap(step)) {
      for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id], `${m.id}:${o.id}`).toBeTruthy();
      for (const t of Object.values(m.why)) {
        expect(longestSentence(t).words, t).toBeLessThanOrEqual(READING.maxSentenceWords);
      }
    }
    const text = [step.title, ...step.body, step.done, ...step.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => Object.values(m.why))])].join(' ');
    expect(fkGrade(text), text).toBeLessThanOrEqual(READING.maxGrade);
  });

  it('Quiz try 1 is the frozen cave board every time, and its answer buttons wait until every case is marked', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const first = stop1.lessons[3].practice(createRng(seed))[0];
      if (first.kind !== 'choose' || first.scene?.kind !== 'boxes') throw new Error('not a sign item');
      expect(first.prompt).toBe('Read the signs and the rule. Which cave has the dragon egg?');
      expect(first.scene.boxes.map((b) => b.sign)).toEqual(['The dragon egg is not in the Moss cave.', 'The dragon egg is in the Moss cave.', 'The dragon egg is not in the Ice cave.']);
      expect(first.scene.rule).toBe('Exactly one sign is true.');
      expect(first.choices.find((c) => c.id === first.answer)!.label).toBe('Ice cave');
      const work = first.workFirst!;
      expect(work).toBe(L4_FIRST_QUIZ_WORK);
      expect(work.rows.every((r) => r.marks.every((m) => !m.given))).toBe(true);
      // Ice: True, False, False, 1, Keep. Fire: True, False, True, 2, Reject. Moss: False, True, True, 2, Reject.
      expect(work.rows.map((r) => r.marks.map((m) => m.answer))).toEqual([
        ['true', 'false', 'false', '1', 'keep'],
        ['true', 'false', 'true', '2', 'reject'],
        ['false', 'true', 'true', '2', 'reject'],
      ]);
      const read = first.scene.boxes.map((b, i) => readSign('cave', i, b.sign));
      work.rows.forEach((r, t) => expect(r.marks.slice(0, 3).map((m) => m.answer)).toEqual(read.map((f) => String(f(t)))));
    }
    expect(L4_FIRST_QUIZ.answer).toBe(0);
    expect(solutions(L4_FIRST_QUIZ.signs, 'one')).toEqual([0]);
  });

  it('Quiz tries 2-4: a door board, a box board and a chest twin with one sign changed, in any order', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const items = stop1.lessons[3].practice(createRng(seed));
      expect(items.length).toBe(4);
      const skinOf = (it: Item) => (it.kind === 'choose' ? SIGN_SKINS.find((k) => signWords(k).name(0) === it.choices[0].label)! : null);
      const rest = items.slice(1).map(skinOf);
      expect([...rest].sort()).toEqual(['box', 'chest', 'door']);
      orders.add(rest.join());
      const twin = items.find((it) => skinOf(it) === 'chest')!;
      if (twin.scene?.kind !== 'boxes') throw new Error('no boxes');
      const example = signBoxes(L4_EXAMPLE, 'chest').map((b) => b.sign);
      const changed = twin.scene.boxes.filter((b, i) => b.sign !== example[i]);
      expect(changed.length, JSON.stringify(twin.scene.boxes)).toBe(1);
      // Its answer is never Silver, the example's answer.
      expect(twin.kind === 'choose' && twin.choices.find((c) => c.id === twin.answer)!.label).not.toBe('Silver chest');
      for (const it of items.slice(1)) expect(it.workFirst).toBeUndefined();
    }
    expect(orders.size).toBeGreaterThan(1);
    expect(signTwins(L4_EXAMPLE).every((t) => solutions(t.signs, 'one').length === 1)).toBe(true);
  });

  it('the Hint shows one case already marked, and never the answer case', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of stop1.lessons[3].practice(createRng(seed))) {
        if (it.kind !== 'choose') continue;
        expect(it.hint).not.toMatch(/Count the true signs\. Then try the next/);
        const c = it.hintCase!;
        expect(c.truths!.length).toBe(4);
        expect(c.truths![3]).toEqual({ who: 'Fits the rule', value: false });
        const answerName = it.choices.find((x) => x.id === it.answer)!.label;
        expect(c.label).not.toContain(answerName);
        expect(c.note).toMatch(/Reject /);
      }
    }
  });
});

describe('the other sign rules: one lesson each, See -> Do -> Quiz (skill-drill handoff)', () => {
  const SPECS: { id: string; rule: SignRule; text: string; example: typeof L5_EXAMPLE }[] = [
    { id: 's1.l5', rule: 'none', text: 'Every sign is false.', example: L5_EXAMPLE },
    { id: 's1.l6', rule: 'two', text: 'Exactly two signs are true.', example: L6_EXAMPLE },
    { id: 's1.l7', rule: 'owner', text: 'The sign on the chest with the treasure is true. The other signs are false.', example: L7_EXAMPLE },
  ];
  const lessonOf = (id: string) => stop1.lessons.find((l) => l.id === id)!;
  /** The rule on a board, with the owner rule's box and prize words made the same in every skin. */
  const ruleOf = (it: Item) =>
    (it.scene?.kind === 'boxes' ? it.scene.rule : '').replace(/the (door|cave|box) with the (prize|dragon egg) is true/, 'the chest with the treasure is true');
  /** Whether the rule fits with the treasure in box t, from the signs as the page words them. */
  const fitsFromWords = (boxes: readonly SignBox[], skin: SignSkin, rule: SignRule, t: number) => {
    const truth = boxes.map((b, i) => readSign(skin, i, b.sign)(t));
    const n = truth.filter(Boolean).length;
    return rule === 'none' ? n === 0 : rule === 'two' ? n === 2 : rule === 'one' ? n === 1 : truth[t] && n === 1;
  };

  it('Stop 1 now has seven lessons; the sign rules come one per lesson, after Treasure signs', () => {
    expect(stop1.lessons.map((l) => l.id)).toEqual(['s1.l1', 's1.l2', 's1.l3', 's1.l4', 's1.l5', 's1.l6', 's1.l7']);
    expect(stop1.lessons.slice(4).map((l) => l.title)).toEqual(['Every sign is false', 'Exactly two signs are true', 'The owner’s sign']);
  });

  it.each(SPECS)('$id See: the worked example is computed from its words and concludes the one chest that fits', ({ id, rule, text, example }) => {
    const l = lessonOf(id);
    const card = l.ideas.find((c) => c.title === 'An example')!;
    expect(l.ideas[l.ideas.length - 1]).toBe(card);
    if (card.scene?.kind !== 'boxes') throw new Error('no boxes');
    expect(card.scene.rule).toBe(text);
    const fits = [0, 1, 2].filter((t) => fitsFromWords(card.scene!.kind === 'boxes' ? card.scene!.boxes : [], 'chest', rule, t));
    expect(fits).toEqual([example.answer]);
    expect(solutions(example.signs, rule)).toEqual([example.answer]);
    expect(card.body[card.body.length - 1]).toBe(signConclusion(example, 'chest'));
    expect(card.body.length).toBe(4);
    for (const line of card.body) expect(longestSentence(line).words, line).toBeLessThanOrEqual(READING.maxSentenceWords);
  });

  it.each(SPECS)('$id Do: the same board; the kept chest is shown, the learner marks a rejected one, every mark from the words', ({ id, example }) => {
    const l = lessonOf(id);
    const step = l.drill![0];
    expect(l.drill!.length).toBe(1);
    expect(step.scene).toEqual(l.ideas[l.ideas.length - 1].scene);
    const [shown, mine] = step.rows;
    expect(shown.marks.every((m) => m.given)).toBe(true);
    expect(mine.marks.some((m) => m.given)).toBe(false);
    const w = signWords('chest');
    expect(shown.label).toBe(`Pretend the treasure is in ${w.the(example.answer)}.`);
    const reject = [0, 1, 2].find((b) => b !== example.answer)!;
    expect(mine.label).toBe(`Pretend the treasure is in ${w.the(reject)}.`);
    const boxes = step.scene!.kind === 'boxes' ? step.scene!.boxes : [];
    for (const [row, t] of [[shown, example.answer], [mine, reject]] as const) {
      const truth = boxes.map((b, i) => readSign('chest', i, b.sign)(t));
      expect(row.marks.slice(0, 3).map((m) => m.answer)).toEqual(truth.map(String));
      expect(row.marks[3].answer).toBe(String(truth.filter(Boolean).length));
      expect(row.marks[4].answer).toBe(t === example.answer ? 'keep' : 'reject');
    }
    expect(checkDrill(step, Object.fromEntries(marksToTap(step).map((m) => [m.id, m.answer]))).done).toBe(true);
    expect(JSON.stringify(step)).not.toMatch(/Which chest/);
  });

  it.each(SPECS)('$id Quiz: a twin of the example first (a new answer), then a door, a cave and a box, all with this rule', ({ id, rule, text, example }) => {
    const l = lessonOf(id);
    const shownSets = [L4_EXAMPLE, L4_FIRST_QUIZ, L5_EXAMPLE, L6_EXAMPLE, L7_EXAMPLE].map((p) => JSON.stringify(signBoxes(p, 'chest').map((b) => b.sign)));
    for (let seed = 1; seed <= 30; seed++) {
      const items = l.practice(createRng(seed));
      expect(items.length).toBe(4);
      for (const it of items) {
        expect(ruleOf(it), it.id).toBe(text);
        if (it.kind !== 'choose' || it.scene?.kind !== 'boxes') throw new Error('not a sign item');
        const skin = SIGN_SKINS.find((k) => signWords(k).name(0) === it.choices[0].label)!;
        const fits = [0, 1, 2].filter((t) => fitsFromWords((it.scene as { boxes: SignBox[] }).boxes, skin, rule, t));
        expect(fits.map((t) => (it.scene as { boxes: SignBox[] }).boxes[t].id), it.id).toEqual([it.answer]);
        expect(it.hintCase, it.id).toBeDefined();
      }
      const [twin, ...rest] = items;
      expect(twin.fixed).toBe(true);
      if (twin.kind !== 'choose' || twin.scene?.kind !== 'boxes') throw new Error('no twin');
      const ex = signBoxes(example, 'chest').map((b) => b.sign);
      expect(twin.scene.boxes.filter((b, i) => b.sign !== ex[i]).length).toBe(1);
      expect(twin.answer).not.toBe(signBoxes(example, 'chest')[example.answer].id);
      const skins = rest.map((it) => (it.kind === 'choose' ? SIGN_SKINS.find((k) => signWords(k).name(0) === it.choices[0].label) : null));
      expect([...skins].sort()).toEqual(['box', 'cave', 'door']);
      // A random board is never a worked example (or the frozen cave) in new words.
      for (const it of rest) {
        if (it.scene?.kind !== 'boxes' || it.kind !== 'choose') continue;
        const skin = SIGN_SKINS.find((k) => signWords(k).name(0) === it.choices[0].label)!;
        const asChest = JSON.stringify(signsOnBoard(it.scene.boxes, skin));
        expect(shownSets.map((x) => JSON.stringify(signsFromTexts(JSON.parse(x)))).includes(asChest)).toBe(false);
      }
    }
  });

  it('the stop check has one sign puzzle per sign lesson, each with its own rule; the Arcade and new examples keep the lesson’s rule', () => {
    const want: Record<string, string> = { 's1.l4': 'Exactly one sign is true.', 's1.l5': 'Every sign is false.', 's1.l6': 'Exactly two signs are true.', 's1.l7': 'The sign on the chest with the treasure is true. The other signs are false.' };
    const ruleText = ruleOf;
    for (let seed = 1; seed <= 60; seed++) {
      const check = stop1.check!(createRng(seed));
      expect(check.length).toBe(10);
      for (const id of Object.keys(want)) {
        const signs = check.filter((x) => x.lesson === id);
        expect(signs.length, `${seed} ${id}`).toBe(1);
        expect(ruleText(signs[0])).toBe(want[id]);
      }
      const a = stop1.practice!(createRng(seed));
      if (want[a.lesson]) expect(ruleText(a)).toBe(want[a.lesson]);
    }
    for (const spec of SPECS) {
      const missed = lessonOf(spec.id).practice(createRng(3))[1];
      const set = freshCheckSet(stop1, missed, 7, [], 1);
      expect(set.length).toBe(1);
      expect(set[0].lesson).toBe(spec.id);
      expect(ruleOf(set[0])).toBe(ruleOf(missed));
    }
  });
});

/** The signs of a board, read back from its words (any skin), as chest-independent sign objects. */
function signsOnBoard(boxes: readonly SignBox[], skin: SignSkin): Sign[] {
  const w = signWords(skin);
  return boxes.map((b, i) => {
    const forms: Sign[] = [{ t: 'here' }, { t: 'notHere' }, ...[0, 1, 2].filter((x) => x !== i).flatMap((x): Sign[] => [{ t: 'in', x }, { t: 'notIn', x }])];
    return forms.find((f) => w.signText(f) === b.sign)!;
  });
}
const signsFromTexts = (texts: string[]): Sign[] => signsOnBoard(texts.map((sign, i) => ({ id: `b${i + 1}`, name: '', sign })), 'chest');
