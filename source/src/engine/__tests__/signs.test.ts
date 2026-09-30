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
import { sentences, words } from '../readability';
import type { SignBox } from '../types';

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
        expect(!!it.conflict).toBe(signDeniesAnswer(m.puzzle));

        // Each wrong-box message names exactly the signs that would be true there.
        for (const [id, msg] of Object.entries(it.whyWrong ?? {})) {
          const b = boxes.findIndex((x) => x.id === id);
          const truths = trueSigns(m.puzzle.signs, b);
          expect(msg.startsWith(`If the ${w.item} were ${w.prep} ${w.the(b)},`), msg).toBe(true);
          const named = [[0], [1], [2], [0, 1], [0, 2], [1, 2]].filter((set) => msg.includes(w.signList(set)));
          if (m.puzzle.rule === 'owner') {
            if (!truths.includes(b)) expect(msg).toContain(`${w.signOf(b)} would be false`);
            else expect(named, msg).toEqual([truths.filter((i) => i !== b)]);
          } else if (truths.length === 0) expect(msg).toContain('no sign would be true');
          else if (truths.length === 3) expect(msg).toContain('all three signs would be true');
          else expect(named, msg).toEqual([truths]);
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

