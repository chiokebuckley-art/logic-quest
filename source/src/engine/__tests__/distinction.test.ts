/**
 * Teaching a distinction apart (two ideas a learner can merge into one), on the treasure signs: the contrast card
 * and its two-sign board, the compare facts and the rule's need on the case board, the misconceptions a pattern of
 * wrong marks reveals, and the "I'm confused" questions. See docs/CONTENT_GUIDE.md, "Distinctions".
 */
import { describe, expect, it } from 'vitest';
import {
  L4_CONTRAST,
  L4_DISTINCTION_DRILL,
  L4_DRILL,
  L4_EXAMPLE,
  L4_RULE_CONTRAST,
  L4_RULE_DRILL,
  L4_RULE_TEST,
  L4_TWIN_WORK,
  L5_EXAMPLE,
  L6_EXAMPLE,
  L7_EXAMPLE,
  L7_OWNER_CONTRAST,
  L7_OWNER_DRILL,
  L7_TWIN,
  signsOnPage,
  stop1,
} from '../../content/stop1';
import { checkDrill, diagnose, marksToTap } from '../drill';
import {
  RULE_VS_STAMP,
  SIGN_RULES,
  SIGN_SKINS,
  fitsRule,
  signBecause,
  signConfused,
  signHeadline,
  signHolds,
  signItem,
  signMisconceptions,
  signNeeds,
  signOwnerContrastCard,
  signOwnerDrill,
  signRuleContrastCard,
  signRuleStampDrill,
  signWords,
  trueSigns,
  TREASURE_VS_SIGN,
  type Sign,
} from '../puzzles/signs';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import type { DrillStep, IdeaCard, Scene } from '../types';

const TF = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const right = (step: typeof L4_DRILL) => Object.fromEntries(marksToTap(step).map((m) => [m.id, m.answer]));

describe('the contrast card: where the treasure is vs whether a sign is true', () => {
  it('is card 2 of Treasure signs, names the distinction, and shows the same test with two signs on the same chest', () => {
    const l4 = stop1.lessons[3];
    expect(l4.ideas[1]).toBe(L4_CONTRAST);
    expect(L4_CONTRAST.distinction).toBe('treasure-vs-sign');
    expect(l4.distinctions).toEqual([TREASURE_VS_SIGN, RULE_VS_STAMP]);
    const scene = L4_CONTRAST.scene as Extract<Scene, { kind: 'contrast' }>;
    expect(scene.kind).toBe('contrast');
    // The treasure is in Silver (the example's answer) in both panels; only the words differ, and so does the truth.
    expect(scene.pairs.map((p) => p.world)).toEqual(['Test: the treasure is in the Silver chest.', 'Test: the treasure is in the Silver chest.']);
    expect(scene.pairs.map((p) => p.who)).toEqual(['The Silver chest sign', 'The Silver chest sign']);
    expect(scene.pairs.map((p) => p.says)).toEqual(['The treasure is in this chest.', 'The treasure is not in this chest.']);
    expect(scene.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(scene.pairs[1].because).toBe('It says not the Silver chest. The test says the Silver chest. The words do not fit the test, so False.');
    expect(scene.ask?.q).toBe('Did the treasure move?');
    expect(scene.ask?.a).toContain('two different things');
    // The example really does keep the treasure under a false sign: Silver's sign is "not in this chest".
    expect(L4_EXAMPLE.signs[L4_EXAMPLE.answer]).toEqual({ t: 'notHere' });
  });

  it('its board comes right after the card, stamps the two signs, and says the sign is false even though the treasure is here', () => {
    const l4 = stop1.lessons[3];
    expect(l4.drill![0]).toBe(L4_DISTINCTION_DRILL);
    expect(L4_DISTINCTION_DRILL.afterCard).toBe(1);
    expect(L4_DISTINCTION_DRILL.distinction).toBe('treasure-vs-sign');
    expect(L4_DISTINCTION_DRILL.scene).toEqual(L4_CONTRAST.scene);
    const marks = marksToTap(L4_DISTINCTION_DRILL);
    expect(marks.map((m) => m.answer)).toEqual(['true', 'false']);
    expect(marks[1].why.true).toContain('this sign is false, even though the treasure is here');
    expect(checkDrill(L4_DISTINCTION_DRILL, right(L4_DISTINCTION_DRILL)).done).toBe(true);
    expect(checkDrill(L4_DISTINCTION_DRILL, { 'pair0-stamp': 'true', 'pair1-stamp': 'true' }).message).toBe(marks[1].why.true);
  });

  it('every other sign lesson reminds the learner of the distinction and says where it was taught', () => {
    for (const l of stop1.lessons.slice(4)) {
      expect(l.distinctions?.[0]).toEqual({ ...TREASURE_VS_SIGN, taughtIn: 's1.l4' });
      const card = l.ideas.find((c) => c.distinction === 'treasure-vs-sign');
      expect(card?.title, l.id).toBe('Remember: two different things');
      // No reminder says a test makes every sign false: under “Every sign is false” a sign can still come out True.
      expect(l.ideas.flatMap((c) => c.body).join(' '), l.id).not.toContain('has a false sign too');
    }
  });
});

describe('the case board keeps the test world and the comparison in view', () => {
  it('every stamp has the two facts to compare, with no verdict; every case says what the rule needs', () => {
    for (const row of L4_DRILL.rows) {
      expect(row.needs).toBe('exactly 1 true sign');
      for (const m of row.marks.filter((x) => x.on !== undefined)) {
        expect(m.compare, m.id).toBeDefined();
        expect(m.compare!.world).toBe(`The treasure is in ${row.case!.name}.`);
        expect(m.compare!.says).not.toMatch(/true|false/i);
      }
    }
    const gold = L4_DRILL.rows.find((r) => r.case?.box === 0)!;
    expect(gold.marks.map((m) => m.compare?.says)).toEqual(['The treasure is in the Gold chest.', 'The treasure is not in the Silver chest.', 'The treasure is not in the Gold chest.', undefined]);
    expect(signNeeds({ ...L4_EXAMPLE, rule: 'none' }, 'chest', 0)).toBe('no true sign');
    expect(signNeeds({ ...L4_EXAMPLE, rule: 'two' }, 'chest', 0)).toBe('exactly 2 true signs');
    expect(signNeeds({ ...L4_EXAMPLE, rule: 'owner' }, 'chest', 1)).toBe('only the Silver chest sign true');
  });

  it('the worked example carries the comparison behind each stamp, in words that agree with the stamp', () => {
    const l4 = stop1.lessons[3];
    const gold = l4.ideas[3].scene as Extract<Scene, { kind: 'cases' }>;
    const steps = gold.steps!;
    expect(steps.slice(0, 3).map((s) => s.because?.match)).toEqual(gold.stamps);
    expect(steps[1].because).toEqual({ says: 'The treasure is not in the Silver chest.', world: 'The treasure is in the Gold chest.', match: true });
    expect(steps[3].because).toBeUndefined();
    expect(signBecause(L4_EXAMPLE, 'cave', 1, 1)).toEqual({ says: 'The dragon egg is not in the Fire cave.', world: 'The dragon egg is in the Fire cave.', match: false });
  });

  it('the Do board and the first quiz keep the full scaffold; the frozen cave and later boards are light', () => {
    expect(L4_DRILL.scaffold).toBe('full');
    expect(L4_TWIN_WORK.scaffold).toBe('full');
    const l4 = stop1.lessons[3];
    const items = l4.practice(createRng(5));
    expect(items[1].workFirst?.scaffold).toBeUndefined();
    expect(items[2].scratch?.scaffold).toBeUndefined();
    // The case board (each sign lesson's last board) and the distinction boards before it.
    for (const l of stop1.lessons.slice(4)) expect(l.drill![l.drill!.length - 1].scaffold, l.id).toBe('full');
  });
});

describe('misconceptions: a pattern of wrong marks names the belief, then the case', () => {
  // The twin board: Gold makes every sign true, Silver none, Bronze exactly one (the kept chest, under a false sign).
  const silver = L4_TWIN_WORK.rows.find((r) => r.case?.box === 1)!;
  const bronze = L4_TWIN_WORK.rows.find((r) => r.case?.box === 2)!;

  it('the board carries the six patterns (rule-bent stamps first, then the own sign both ways) and three confused questions, in every skin and rule', () => {
    for (const skin of SIGN_SKINS) {
      for (const rule of SIGN_RULES) {
        expect(signMisconceptions(skin, rule).map((m) => m.when)).toEqual(['fit-rule', 'own-true', 'own-false', 'verdict-only', 'copied', 'all-one']);
        expect(signConfused(skin, rule)).toHaveLength(3);
        expect(signConfused(skin, rule).every((q) => q.options.filter((o) => o.right).length === 1)).toBe(true);
      }
      // The rule's texts follow the rule: the owner's rule asks which sign, not how many.
      expect(signMisconceptions(skin, 'owner').find((m) => m.id === 'verdict-only')!.text).toContain('which sign is True, not only how many');
      expect(signMisconceptions(skin, 'none').find((m) => m.id === 'verdict-only')!.text).toContain('no True stamp at all');
      expect(signConfused(skin, 'none')[1].q).toContain('every sign is false');
      expect(signConfused(skin, 'owner')[1].q).toContain('own sign');
    }
    expect(L4_TWIN_WORK.misconceptions?.length).toBe(6);
    expect(L4_TWIN_WORK.confused?.length).toBe(3);
    expect(L4_TWIN_WORK.distinction).toBe('treasure-vs-sign');
    // The rule's need by the count, the test-world note and the method's steps travel with the board.
    for (const r of L4_TWIN_WORK.rows) expect(r.needTrue).toBe(1);
    expect(L4_TWIN_WORK.words?.worldNote).toContain('For this test only');
    expect(L4_TWIN_WORK.steps).toHaveLength(5);
  });

  it('stamps bent to fit the rule (a wrong stamp, the count the rule needs, and Keep) → fit-rule, before the own sign', () => {
    // Gold's own sign is true with the treasure in Gold (“in this chest”), and Silver's is too: Gold makes 3 true.
    // Stamping Gold False and Silver False leaves exactly one True and a Keep: the rule was used to set the stamps.
    const gold = L4_TWIN_WORK.rows.find((r) => r.case?.box === 0)!;
    const bent = { 'case0-sign0': 'false', 'case0-sign1': 'false', 'case0-sign2': 'true', 'case0-decide': 'keep' };
    expect(diagnose(L4_TWIN_WORK, gold, bent)?.id).toBe('fit-rule');
    expect(checkDrill(L4_TWIN_WORK, bent).message).toMatch(/^You may be using the rule to set the stamps\./);
    // The same stamps with Reject (or no verdict yet) are not that pattern: the own sign stamped False when true → own-false.
    expect(diagnose(L4_TWIN_WORK, gold, { ...bent, 'case0-decide': 'reject' })?.id).toBe('own-false');
    expect(diagnose(L4_TWIN_WORK, gold, { 'case0-sign0': 'false', 'case0-sign1': 'false', 'case0-sign2': 'true' })?.id).toBe('own-false');
  });

  it('the screenshot case: Silver picked, its own sign stamped True because the treasure is “here” → own-true', () => {
    // Silver's sign says "not in this chest": false with the treasure in Silver. Stamped as in the Gold test (True, True, False).
    const picks = { 'case1-sign0': 'true', 'case1-sign1': 'true', 'case1-sign2': 'false', 'case1-decide': 'keep' };
    expect(diagnose(L4_TWIN_WORK, silver, picks)?.id).toBe('own-true');
    const r = checkDrill(L4_TWIN_WORK, picks);
    expect(r.diagnosis).toBe('own-true');
    expect(r.row).toBe('case1');
    expect(r.message).toMatch(/^You may be treating “the treasure is in this chest” and “this chest’s sign is true” as the same thing\. They are two different things\./);
    // Then the concrete case: the first wrong mark's own words.
    expect(r.message).toContain('If the treasure is in the Silver chest, the Gold chest sign is false.');
    // Gold's and Silver's stamps are wrong, and so is Keep (no sign is true, the rule needs one).
    expect(r.wrong).toEqual(['case1-sign0', 'case1-sign1', 'case1-decide']);
  });

  it('stamps copied from another test → copied; every stamp the same → all-one; right stamps, wrong verdict → verdict-only', () => {
    // Bronze's right stamps are False, True, False. Silver stamped the same way copies Bronze's test (its own sign is right by luck).
    const copied = { 'case1-sign0': 'false', 'case1-sign1': 'true', 'case1-sign2': 'false' };
    expect(diagnose(L4_TWIN_WORK, silver, copied)?.id).toBe('own-true');
    // Gold's right stamps are all True; Bronze stamped all True copies Gold (Bronze's own sign True is wrong → own-true first).
    expect(diagnose(L4_TWIN_WORK, bronze, { 'case2-sign0': 'true', 'case2-sign1': 'true', 'case2-sign2': 'true' })?.id).toBe('own-true');
    // One slip on Bronze (Gold's sign True) that copies no other test and is not the own sign: no misconception.
    expect(diagnose(L4_TWIN_WORK, bronze, { 'case2-sign0': 'true', 'case2-sign1': 'true', 'case2-sign2': 'false' })).toBeUndefined();
    // Bronze stamped False, False, False: its own sign is right, and the stamps are Silver's test, copied → copied.
    expect(diagnose(L4_TWIN_WORK, bronze, { 'case2-sign0': 'false', 'case2-sign1': 'false', 'case2-sign2': 'false' })?.id).toBe('copied');
    // A board where all-one is not also copied: the Do board's Gold case (True, True, False) stamped all False → the own sign
    // (true) stamped False → own-false; stamped all True → own sign right, Silver's and Bronze's shown stamps differ → all-one.
    const gold = L4_DRILL.rows.find((r) => r.case?.box === 0)!;
    expect(diagnose(L4_DRILL, gold, { 'case0-sign0': 'false', 'case0-sign1': 'false', 'case0-sign2': 'false' })?.id).toBe('own-false');
    // Stamped all True: one slip (Bronze) that happens to level the three stamps is not the all-one pattern.
    expect(diagnose(L4_DRILL, gold, { 'case0-sign0': 'true', 'case0-sign1': 'true', 'case0-sign2': 'true' })).toBeUndefined();
    // all-one needs at least two wrong marks on a row of three: a row whose answers are True, False, True stamped all False.
    const levelled: DrillStep = {
      id: 'level', title: 'Level', body: [], done: '', misconceptions: [{ id: 'all-one', when: 'all-one', text: 'Each mark is about one statement.' }],
      rows: [{ id: 'r', label: 'Row', marks: [
        { id: 'a', label: 'A', options: TF, answer: 'true', why: { false: 'a' } },
        { id: 'b', label: 'B', options: TF, answer: 'false', why: { true: 'b' } },
        { id: 'c', label: 'C', options: TF, answer: 'true', why: { false: 'c' } },
        { id: 'v', label: 'Keep?', options: [{ id: 'keep', label: 'Keep' }, { id: 'reject', label: 'Reject' }], answer: 'keep', why: { reject: 'v' } },
      ] }],
    };
    expect(diagnose(levelled, levelled.rows[0], { a: 'false', b: 'false', c: 'false' })?.id).toBe('all-one');
    expect(diagnose(levelled, levelled.rows[0], { a: 'true', b: 'true', c: 'true' })).toBeUndefined();
    expect(diagnose(L4_DRILL, gold, { ...right(L4_DRILL), 'case0-decide': 'keep' })?.id).toBe('verdict-only');
    // A single slip that is not the own sign and copies nothing (Silver's sign stamped False): no misconception, the mark's own words.
    const slip = checkDrill(L4_DRILL, { ...right(L4_DRILL), 'case0-sign1': 'false' });
    expect(slip.diagnosis).toBeUndefined();
    expect(slip.message).toBe('If the treasure is in the Gold chest, the Silver chest sign is true. It says, “The treasure is not in this chest.” The treasure is not in the Silver chest.');
    // Nothing wrong: no diagnosis.
    expect(diagnose(L4_DRILL, gold, right(L4_DRILL))).toBeUndefined();
  });

  it('the words read at the game’s level', () => {
    const text = [
      ...signMisconceptions('chest').map((m) => m.text),
      ...signConfused('chest').flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
      ...L4_CONTRAST.body,
      ...(L4_CONTRAST.scene as Extract<Scene, { kind: 'contrast' }>).pairs.flatMap((p) => [p.world, p.because]),
      ...L4_DISTINCTION_DRILL.body,
      L4_DISTINCTION_DRILL.done,
      ...L4_DISTINCTION_DRILL.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => Object.values(m.why))]),
      ...NEW_TEXT(),
    ].join('\n');
    expect(fkGrade(text)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(text);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
  });
});

/** Every player-facing string of a contrast card and of a guided board, the panels' last lines included. */
const cardStrings = (c: IdeaCard) => [
  c.title,
  ...c.body,
  ...(c.scene?.kind === 'contrast' ? [...c.scene.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), c.scene.ask?.q ?? '', c.scene.ask?.a ?? ''] : []),
];
const boardStrings = (b: DrillStep) => [
  b.title,
  ...b.body,
  b.done,
  ...(b.steps ?? []),
  ...b.rows.flatMap((r) => [r.label, r.needs ?? '', ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
  ...(b.misconceptions ?? []).map((m) => m.text),
];
/** The words this round added: the two new contrast cards and boards, the reminders, and the owner's texts. */
const NEW_TEXT = () => [
  ...cardStrings(L4_RULE_CONTRAST),
  ...boardStrings(L4_RULE_DRILL),
  ...cardStrings(L7_OWNER_CONTRAST),
  ...boardStrings(L7_OWNER_DRILL),
  ...stop1.lessons.slice(3).flatMap((l) => l.ideas.slice(0, 3).flatMap((c) => [c.title, ...c.body])),
  ...SIGN_RULES.flatMap((r) => [...signMisconceptions('chest', r).map((m) => m.text), ...signConfused('chest', r).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)])]),
];
const rowOf = (step: DrillStep, id: string) => step.rows.find((r) => r.id === id)!;

describe('the rule vs the stamps: Treasure signs card 3 and its board', () => {
  const w = signWords('chest');
  const scene = L4_RULE_CONTRAST.scene as Extract<Scene, { kind: 'contrast' }>;

  it('is card 3, before the worked example: the Gold test, where the words make two signs true under “Exactly one sign is true”', () => {
    const l4 = stop1.lessons[3];
    expect(l4.ideas[2]).toBe(L4_RULE_CONTRAST);
    expect(l4.ideas[3].title).toBe('Example: the Gold chest');
    expect(L4_RULE_CONTRAST.distinction).toBe('rule-vs-stamp');
    expect(L4_RULE_CONTRAST.title).toBe('Before you start: stamps first, rule last');
    expect(RULE_VS_STAMP).toEqual({ id: 'rule-vs-stamp', a: 'What the rule says about the real treasure place.', b: 'What a sign’s words give in this test.' });
    expect(scene.kind).toBe('contrast');
    // The engine: with the treasure in Gold, Gold's and Silver's signs are true, Bronze's is false, and the rule fails.
    const ts = trueSigns(L4_EXAMPLE.signs, L4_RULE_TEST);
    expect(L4_RULE_TEST).toBe(0);
    expect(ts).toEqual([0, 1]);
    expect(fitsRule(L4_EXAMPLE.signs, 'one', L4_RULE_TEST)).toBe(false);
    // The same test in both panels; each panel is one of the two true signs, with its truth from the engine.
    expect(scene.pairs.map((p) => p.world)).toEqual(['Test: the treasure is in the Gold chest.', 'Test: the treasure is in the Gold chest.']);
    expect(scene.pairs.map((p) => p.who)).toEqual(['The Gold chest sign', 'The Silver chest sign']);
    expect(scene.pairs.map((p) => p.says)).toEqual(ts.map((i) => w.signText(L4_EXAMPLE.signs[i])));
    expect(scene.pairs.map((p) => p.truth)).toEqual(ts.map((i) => signHolds(L4_EXAMPLE.signs[i], i, L4_RULE_TEST)));
    expect(scene.pairs.map((p) => p.truth)).toEqual([true, true]);
    expect(scene.pairs[1].because).toBe('It says not the Silver chest. The test says the Gold chest. The words fit the test, so True.');
    // Each panel's last line says what follows: stamp True, even with the rule; the count is the engine's.
    expect(scene.pairs[0].then).toBe('Stamp it True. The rule waits until every sign is stamped.');
    expect(scene.pairs[1].then).toBe(`Stamp it True too, even with the rule. That makes ${ts.length} True stamps.`);
    expect(scene.ask).toEqual({ q: 'Did the rule change a stamp?', a: 'No. The words decide each stamp. Then the rule is checked: 2 True stamps, but it needs exactly 1 True stamp. So reject the Gold chest.' });
    // The body: the rule is checked last, never used to change a stamp; the third sign's truth is the engine's.
    const body = L4_RULE_CONTRAST.body.join(' ');
    expect(body).toContain('The rule says, “Exactly one sign is true.” It is checked last. First stamp each sign from its words.');
    expect(body).toContain('Never change a stamp to make it fit.');
    expect(signHolds(L4_EXAMPLE.signs[2], 2, L4_RULE_TEST)).toBe(false);
    expect(body).toContain('The Bronze chest sign does not fit, so it is False.');
  });

  it('needs a test the rule rejects with exactly two true signs, in a count rule', () => {
    // Silver: one true sign, so it fits “Exactly one”; nothing to contrast.
    expect(() => signRuleContrastCard(L4_EXAMPLE, 'chest', 1)).toThrow();
    expect(() => signRuleStampDrill(L7_EXAMPLE, 'chest', 'x', 2, 0)).toThrow();
    // Every skin builds the same test, computed from its own words.
    for (const skin of SIGN_SKINS) {
      const b = signRuleStampDrill(L4_EXAMPLE, skin, 'x', 2, 0);
      expect(b.rows.map((r) => r.marks[0].answer)).toEqual(['true', 'true', 'reject']);
      expect(checkDrill(b, right(b)).done).toBe(true);
    }
  });

  it('its board opens right after it: stamp both signs True from their words, then the rule rejects Gold', () => {
    const l4 = stop1.lessons[3];
    expect(l4.drill![1]).toBe(L4_RULE_DRILL);
    expect(L4_RULE_DRILL.afterCard).toBe(2);
    expect(L4_RULE_DRILL.distinction).toBe('rule-vs-stamp');
    expect(L4_RULE_DRILL.scene).toEqual(L4_RULE_CONTRAST.scene);
    expect(L4_RULE_DRILL.scaffold).toBe('full');
    const marks = marksToTap(L4_RULE_DRILL);
    expect(marks.map((m) => m.id)).toEqual(['pair0-stamp', 'pair1-stamp', 'rule-decide']);
    // Every answer from the engine: the panels' truths, then the rule's verdict on the whole test.
    expect(marks.map((m) => m.answer)).toEqual([...scene.pairs.map((p) => String(p.truth)), fitsRule(L4_EXAMPLE.signs, 'one', 0) ? 'keep' : 'reject']);
    expect(L4_RULE_DRILL.steps).toHaveLength(marks.length);
    // The compare facts under each stamp, and the rule's need over the verdict, never over a stamp.
    expect(marks[1].compare).toEqual({ says: 'The treasure is not in the Silver chest.', world: 'The treasure is in the Gold chest.' });
    expect(rowOf(L4_RULE_DRILL, 'pair0').needs).toBeUndefined();
    expect(rowOf(L4_RULE_DRILL, 'rule').needs).toBe(signNeeds(L4_EXAMPLE, 'chest', 0));
    expect(rowOf(L4_RULE_DRILL, 'rule').label).toBe('Last, check the rule: “Exactly one sign is true.” The Bronze chest sign is False in this test.');
    expect(marks[2].why.keep).toBe('The rule needs exactly 1 true sign. This test has 2 true signs: the Gold and Silver chest signs. So reject the Gold chest.');
    expect(checkDrill(L4_RULE_DRILL, right(L4_RULE_DRILL)).done).toBe(true);
  });

  it('names the belief: a stamp bent so the count fits, with Keep, and right stamps with Keep; a one-mark slip names none', () => {
    const d = L4_RULE_DRILL;
    const ok = right(d);
    // Silver's stamp changed to False so the count is 1, and Gold kept: the rule used to set the stamps.
    const bent = checkDrill(d, { ...ok, 'pair1-stamp': 'false', 'rule-decide': 'keep' });
    expect(bent.diagnosis).toBe('fit-rule');
    expect(bent.message).toMatch(/^You may be treating the rule and the stamps as the same thing\. They are two different things: a stamp comes from a sign’s words, and the rule is checked after\./);
    // Then the concrete case: the first wrong mark's own words.
    expect(bent.message).toContain('The Silver chest sign says, “The treasure is not in this chest.” The test says the treasure is in the Gold chest. The words fit the test, so this sign is True.');
    expect(checkDrill(d, { ...ok, 'pair0-stamp': 'false', 'rule-decide': 'keep' }).diagnosis).toBe('fit-rule-first');
    expect(bent.message).toContain('Never change a stamp to make it fit.');
    // One wrong stamp with Reject, or with no verdict yet, is not stamps bent to fit (the count would then fit, so a
    // learner who bent it would keep): no belief is named, only the mark's own words, which say the rule never changes it.
    const slips: Record<string, string>[] = [{ ...ok, 'pair1-stamp': 'false' }, { ...ok, 'pair0-stamp': 'false' }, { 'pair0-stamp': 'true', 'pair1-stamp': 'false' }];
    for (const slip of slips) {
      const r = checkDrill(d, slip);
      expect(r.diagnosis, JSON.stringify(slip)).toBeUndefined();
      expect(r.message).toContain('The words fit the test, so this sign is True. The rule does not change a stamp.');
    }
    expect(d.misconceptions!.map((m) => m.id)).toEqual(['fit-rule', 'fit-rule-first', 'verdict-only']);
    // Under “Every sign is false” the same test needs both stamps bent to fit (count 0): only that is fit-rule.
    const none = signRuleStampDrill({ ...L4_EXAMPLE, rule: 'none' }, 'chest', 'x', 2, 0);
    expect(none.misconceptions!.map((m) => m.id)).toEqual(['fit-rule-both', 'verdict-only']);
    expect(checkDrill(none, { 'pair0-stamp': 'false', 'pair1-stamp': 'false', 'rule-decide': 'keep' }).diagnosis).toBe('fit-rule-both');
    expect(checkDrill(none, { 'pair0-stamp': 'true', 'pair1-stamp': 'false', 'rule-decide': 'keep' }).diagnosis).toBeUndefined();
    // Right stamps and Keep: the count was not compared with the rule.
    const kept = checkDrill(d, { ...ok, 'rule-decide': 'keep' });
    expect(kept.diagnosis).toBe('verdict-only');
    expect(kept.message).toContain('right stamps can still break the rule');
    expect(kept.message).toContain('So reject the Gold chest.');
    // Both stamps False (a count of 0, not the rule's 1) is not stamps bent to fit: the mark's own words only.
    const both = checkDrill(d, { 'pair0-stamp': 'false', 'pair1-stamp': 'false', 'rule-decide': 'keep' });
    expect(both.diagnosis).toBeUndefined();
    expect(both.message).toBe(marksToTap(d)[0].why.false);
    // Right marks: no diagnosis.
    expect(diagnose(d, rowOf(d, 'rule'), ok)).toBeUndefined();
  });
});

describe('the owner’s rule vs the stamp: The owner’s sign card 3 and its board', () => {
  const w = signWords('chest');
  const l7 = stop1.lessons[6];
  const scene = L7_OWNER_CONTRAST.scene as Extract<Scene, { kind: 'contrast' }>;
  const doBoard = l7.drill![l7.drill!.length - 1];
  const test = doBoard.rows[doBoard.rows.length - 1].case!.box;

  it('declares both distinctions as taught in Treasure signs, and shows the Do board’s test twice with two signs on its chest', () => {
    expect(l7.distinctions).toEqual([{ ...TREASURE_VS_SIGN, taughtIn: 's1.l4' }, { ...RULE_VS_STAMP, taughtIn: 's1.l4' }]);
    expect(l7.ideas[2]).toBe(L7_OWNER_CONTRAST);
    expect(L7_OWNER_CONTRAST.distinction).toBe('rule-vs-stamp');
    expect(test).toBe(0);
    expect(scene.pairs.map((p) => p.world)).toEqual(['Test: the treasure is in the Gold chest.', 'Test: the treasure is in the Gold chest.']);
    expect(scene.pairs.map((p) => p.who)).toEqual(['The Gold chest sign', 'The Gold chest sign']);
    // One sign that fits the test, and the example's own Gold sign, which does not: truths from the engine.
    expect(scene.pairs.map((p) => p.says)).toEqual(['The treasure is in this chest.', w.signText(L7_EXAMPLE.signs[0])]);
    expect(scene.pairs[1].says).toBe('The treasure is in the Bronze chest.');
    expect(scene.pairs.map((p) => p.truth)).toEqual([signHolds({ t: 'here' }, 0, 0), signHolds(L7_EXAMPLE.signs[0], 0, 0)]);
    expect(scene.pairs.map((p) => p.truth)).toEqual([true, false]);
    // Each panel's last line: part 1 passes for the True stamp, fails (reject) for the False one.
    expect(scene.pairs.map((p) => p.then)).toEqual(['Part 1 passes: the Gold chest sign is True. Next, check part 2.', 'Part 1 fails: the Gold chest sign is False. Reject the Gold chest.']);
    expect(scene.ask).toEqual({ q: 'Did the rule change the stamp?', a: 'No. The words decide the stamp. The rule decides keep or reject, after the stamps.' });
    // The Do board's Gold case agrees: its own sign is False there, so the chest is rejected.
    const gold = doBoard.rows.find((r) => r.case?.box === 0)!;
    expect(gold.marks[0].answer).toBe('false');
    expect(gold.marks[3].answer).toBe('reject');
    expect(() => signOwnerContrastCard(L4_EXAMPLE, 'chest', 0)).toThrow();
  });

  it('its board opens right after it: stamp the sign from its words, then say whether part 1 passes', () => {
    expect(l7.drill![0]).toBe(L7_OWNER_DRILL);
    expect(L7_OWNER_DRILL.afterCard).toBe(2);
    expect(L7_OWNER_DRILL.distinction).toBe('rule-vs-stamp');
    expect(L7_OWNER_DRILL.scene).toEqual(L7_OWNER_CONTRAST.scene);
    expect(L7_OWNER_DRILL.scaffold).toBe('full');
    const marks = marksToTap(L7_OWNER_DRILL);
    expect(marks.map((m) => m.answer)).toEqual(scene.pairs.flatMap((p) => [String(p.truth), p.truth ? 'holds' : 'crashes']));
    expect(marks.map((m) => m.answer)).toEqual(['true', 'holds', 'false', 'crashes']);
    expect(L7_OWNER_DRILL.steps).toHaveLength(marks.length);
    expect(new Set(L7_OWNER_DRILL.steps).size).toBe(marks.length);
    expect(marks[2].compare).toEqual({ says: 'The treasure is in the Bronze chest.', world: 'The treasure is in the Gold chest.' });
    expect(checkDrill(L7_OWNER_DRILL, right(L7_OWNER_DRILL)).done).toBe(true);
    // Built from any owner puzzle and skin, the answers stay the engine's.
    for (const skin of SIGN_SKINS) {
      const b = signOwnerDrill(L7_TWIN, skin, 'x', 2, 0);
      const sc = b.scene as Extract<Scene, { kind: 'contrast' }>;
      // The fitting sign, then the twin's own sign on box 0 (or one naming another box when that one fits too).
      const real = L7_TWIN.signs[0];
      const second: Sign = signHolds(real, 0, 0) ? { t: 'in', x: 1 } : real;
      expect(sc.pairs.map((p) => p.says)).toEqual([signWords(skin).signText({ t: 'here' }), signWords(skin).signText(second)]);
      expect(sc.pairs.map((p) => p.truth)).toEqual([signHolds({ t: 'here' }, 0, 0), signHolds(second, 0, 0)]);
      expect(marksToTap(b).map((m) => m.answer)).toEqual(sc.pairs.flatMap((p) => [String(p.truth), p.truth ? 'holds' : 'crashes']));
    }
  });

  it('names the belief: the rule used as a stamp, the treasure taken to make a sign false, and the rule taken as already passed', () => {
    const d = L7_OWNER_DRILL;
    const ok = right(d);
    // The sign that does not fit stamped True: “the rule says the treasure chest's sign is true.”
    const byRule = checkDrill(d, { ...ok, 'own1-stamp': 'true', 'own1-part1': 'holds' });
    expect(byRule.diagnosis).toBe('rule-stamp');
    expect(byRule.message).toMatch(/^You may be treating the rule and the stamp as the same thing\. They are two different things: the rule is about the real treasure chest, and it is checked after the stamps\./);
    expect(byRule.message).toContain('The words do not fit the test, so this sign is False, even with the rule.');
    // The sign that fits stamped False: the treasure taken to make its sign false.
    const here = checkDrill(d, { ...ok, 'own0-stamp': 'false' });
    expect(here.diagnosis).toBe('here-false');
    expect(here.message).toContain('A chest’s own sign can be True in a test, and then part 1 passes.');
    // Right stamp, part 1 passed anyway: the rule taken as already true in the test.
    const passed = checkDrill(d, { ...ok, 'own1-part1': 'holds' });
    expect(passed.diagnosis).toBe('verdict-only');
    expect(passed.message).toContain('in a test, the rule is a check, and it can fail');
    expect(passed.message).toContain('Part 1 needs it to be True, so part 1 fails. Reject the Gold chest.');
    // On the passing panel, Fails after a right True stamp is not that belief: no diagnosis, only the mark's words.
    const slip = checkDrill(d, { ...ok, 'own0-part1': 'crashes' });
    expect(slip.diagnosis).toBeUndefined();
    expect(slip.message).toBe('The Gold chest sign is True in this test. Part 1 needs that sign to be True, so part 1 passes.');
    expect(diagnose(d, rowOf(d, 'own1'), ok)).toBeUndefined();
  });
});

describe('reminders, misconceptions and questions in each rule’s words (s1-rev-1, s1-l4-l7-rule-vs-stamp, s1-l7-rule-vs-own-sign)', () => {
  const [l4, l5, l6, l7] = stop1.lessons.slice(3);

  it('Every sign is false: one reminder per distinction; the rule card says a True stamp just means reject', () => {
    expect(l5.distinctions).toEqual([{ ...TREASURE_VS_SIGN, taughtIn: 's1.l4' }, { ...RULE_VS_STAMP, taughtIn: 's1.l4' }]);
    expect(l5.ideas.length).toBe(7);
    // The two intro cards are one now, so both reminders fit.
    expect(l5.ideas[0].body.join(' ')).toContain('Here is a new rule: “Every sign is false.”');
    expect(l5.ideas[0].body.join(' ')).toContain('Keep the chest where no sign is true. Reject the others.');
    const sign = l5.ideas.find((c) => c.distinction === 'treasure-vs-sign')!;
    expect(sign.body[1]).toContain('Where the treasure is does not make a sign true, and it does not make it false.');
    const rule = l5.ideas.find((c) => c.distinction === 'rule-vs-stamp')!;
    expect(rule.title).toBe('Remember: stamps first, rule last');
    expect(rule.body[0]).toBe('The rule is about the real place. In a test, a sign can come out True. Stamp from the words. A True stamp just means: reject this chest.');
  });

  it('The owner’s sign: its reminder never says the treasure chest can have a false sign, and no L7 card or board says it', () => {
    const sign = l7.ideas.find((c) => c.distinction === 'treasure-vs-sign')!;
    expect(sign.body).toEqual([
      'Where we pretend the treasure is and whether a sign is true are two different things. The pretend place does not make a sign true, and it does not make it false.',
      'The rule is about the real treasure chest. In a test, it does not make a sign true. First stamp each sign from its words. Then check the rule: is the pretend chest’s own stamp True?',
    ]);
    // The line that seems to contradict the owner's rule is in no L7 card, board, mix-up or question.
    const boards = [...l7.drill!, ...l7.practice(createRng(3)).flatMap((it) => (it.workFirst ? [it.workFirst] : []))];
    const all = [
      ...l7.ideas.flatMap((c) => cardStrings(c)),
      ...boards.flatMap((b) => [...boardStrings(b), ...(b.confused ?? []).flatMap((q) => [q.q, q.teach])]),
    ].join(' ');
    expect(all).not.toMatch(/can have a false sign|while its sign is false|Where the treasure is does not say/);
    // The merged intro: part 1 and part 2, each checked on stamps made from the words.
    expect(l7.ideas[0].body.join(' ')).toContain('Stamp each sign from its words. Part 1: is that chest’s own sign True? Part 2: are the other two signs False?');
    expect(l4.distinctions).toEqual([TREASURE_VS_SIGN, RULE_VS_STAMP]);
  });

  it('Exactly two signs are true: both reminders (both ways, and stamps first), and stamps bent to two True with Keep → fit-rule', () => {
    expect(l6.distinctions).toEqual([{ ...TREASURE_VS_SIGN, taughtIn: 's1.l4' }, { ...RULE_VS_STAMP, taughtIn: 's1.l4' }]);
    expect(l6.ideas.length).toBe(7);
    // The two intro cards are one, with all their words.
    expect(l6.ideas[0].body.join(' ')).toContain('“Exactly two” means 2, no more and no fewer. Three true signs do not fit.');
    expect(l6.ideas[0].body.join(' ')).toContain('Keep the chest that makes exactly two signs true. Reject the others.');
    const sign = l6.ideas.find((c) => c.distinction === 'treasure-vs-sign')!;
    expect(sign.body[1]).toBe('Where the treasure is does not make a sign true, and it does not make it false. Only the words on the sign decide, checked against the test.');
    const rule = l6.ideas.find((c) => c.distinction === 'rule-vs-stamp')!;
    expect(rule.title).toBe('Remember: stamps first, rule last');
    expect(rule.body).toEqual(['The rule is about the real place. In a test, you may get 0, 1 or 3 True stamps. Stamp from the words anyway. A count that is not 2 just means: reject this chest.', 'Never change a stamp to make it fit the rule.']);
    // The Do board's Silver case: the words give one True stamp (Silver's own “in this chest”), so Silver is rejected.
    const d = l6.drill![l6.drill!.length - 1];
    const silver = d.rows.find((r) => !r.marks[0].given)!;
    expect(silver.case?.box).toBe(1);
    expect(trueSigns(L6_EXAMPLE.signs, 1)).toEqual([1]);
    expect(fitsRule(L6_EXAMPLE.signs, 'two', 1)).toBe(false);
    // Gold's sign bent to True so the count is 2, and Silver kept: the rule used to set the stamps.
    const bent = checkDrill(d, { 'case1-sign0': 'true', 'case1-sign1': 'true', 'case1-sign2': 'false', 'case1-decide': 'keep' });
    expect(bent.diagnosis).toBe('fit-rule');
    expect(bent.message).toContain('there, exactly two signs are true');
    // The same slip with Reject: no belief named, only the mark's words.
    expect(checkDrill(d, { 'case1-sign0': 'true', 'case1-sign1': 'true', 'case1-sign2': 'false', 'case1-decide': 'reject' }).diagnosis).toBeUndefined();
    expect(checkDrill(d, right(d)).done).toBe(true);
  });

  it('own-false names the merge it shows: “the treasure is here” taken to mean “this sign is false”', () => {
    for (const skin of SIGN_SKINS) {
      const w = signWords(skin);
      for (const rule of SIGN_RULES) {
        const text = signMisconceptions(skin, rule).find((m) => m.id === 'own-false')!.text;
        expect(text).toMatch(new RegExp(`^You may be treating “the ${w.item} is ${w.prep} this ${w.noun}” and “this ${w.noun}’s sign is false” as the same thing\\. They are two different things\\.`));
        expect(text).toContain(`Where the ${w.item} is does not make a sign false.`);
      }
    }
    // On the Treasure signs Do board's Gold case (Gold: “in this chest”, truly True), Gold stamped False → own-false.
    const r = checkDrill(L4_DRILL, { ...right(L4_DRILL), 'case0-sign0': 'false' });
    expect(r.diagnosis).toBe('own-false');
    expect(r.message).toContain('If the treasure is in the Gold chest, the Gold chest sign is true.');
  });

  it('the owner’s rule question names the rule as the wrong reason to stamp True', () => {
    for (const skin of SIGN_SKINS) {
      const q = signConfused(skin, 'owner')[1];
      expect(q.options.map((o) => o.label)[0]).toBe('True, because the rule says so');
      expect(q.options.filter((o) => o.right)).toHaveLength(1);
      expect(q.options.map((o) => o.label)).toContain('Not sure');
    }
  });

  it('Every sign is false, the Do board’s Gold case (all three signs True): all-False stamps with Keep → fit-rule; without a verdict → own-false, never own-true', () => {
    const d = l5.drill![l5.drill!.length - 1];
    const gold = d.rows.find((r) => r.case?.box === 0)!;
    expect(trueSigns(L5_EXAMPLE.signs, 0)).toEqual([0, 1, 2]);
    const allFalse = { 'case0-sign0': 'false', 'case0-sign1': 'false', 'case0-sign2': 'false' };
    const r = checkDrill(d, { ...allFalse, 'case0-decide': 'keep' });
    expect(r.diagnosis).toBe('fit-rule');
    expect(r.message).toMatch(/^You may be using the rule to set the stamps\./);
    expect(r.message).toContain('there, every sign is false');
    expect(diagnose(d, gold, allFalse)?.id).toBe('own-false');
    // Right stamps, but Keep: a True stamp under this rule means reject.
    const kept = checkDrill(d, { 'case0-sign0': 'true', 'case0-sign1': 'true', 'case0-sign2': 'true', 'case0-decide': 'keep' });
    expect(kept.diagnosis).toBe('verdict-only');
    expect(kept.message).toContain('The rule needs no True stamp at all.');
    // The right first check: no diagnosis, done.
    expect(checkDrill(d, right(d)).done).toBe(true);
  });

  it('The owner’s sign, the Do board’s Gold case: the own sign stamped True by the rule → own-true in the owner’s words; stamps bent to one True with Keep → fit-rule', () => {
    const d = l7.drill![l7.drill!.length - 1];
    const gold = d.rows.find((r) => r.case?.box === 0)!;
    // The engine: Gold's own sign is false with the treasure in Gold, Silver's is false, Bronze's is true.
    expect(gold.marks.map((m) => m.answer)).toEqual(['false', 'false', 'true', 'reject']);
    const byRule = checkDrill(d, { 'case0-sign0': 'true', 'case0-sign1': 'false', 'case0-sign2': 'true' });
    expect(byRule.diagnosis).toBe('own-true');
    expect(byRule.message).toMatch(/^You may be treating the rule and this chest’s stamp as the same thing\. They are two different things: the rule is about the real treasure chest, and it is checked after the stamps\./);
    expect(byRule.message).not.toContain('can have the treasure while its sign is false');
    expect(byRule.message).toContain('If the treasure is in the Gold chest, the Gold chest sign is false. It says, “The treasure is in the Bronze chest.”');
    const bent = checkDrill(d, { 'case0-sign0': 'true', 'case0-sign1': 'false', 'case0-sign2': 'false', 'case0-decide': 'keep' });
    expect(bent.diagnosis).toBe('fit-rule');
    // Right stamps, Keep: the owner's rule asks which sign, not how many.
    const kept = checkDrill(d, { ...right(d), 'case0-decide': 'keep' });
    expect(kept.diagnosis).toBe('verdict-only');
    expect(kept.message).toContain('Look at which sign is True, not only how many.');
    // The other rules keep the treasure-vs-sign words for own-true.
    for (const rule of ['one', 'two', 'none'] as const) expect(signMisconceptions('chest', rule)[1].text).toContain('A chest can have the treasure while its sign is false.');
  });

  it('“I’m confused” question 1 asks both ways: where the treasure is makes a sign neither true nor false', () => {
    for (const skin of SIGN_SKINS) {
      for (const rule of SIGN_RULES) {
        const [q1] = signConfused(skin, rule);
        expect(q1.options.map((o) => o.label)).toEqual(['Yes: the sign must be true', 'Yes: the sign must be false', 'No: only its words decide, checked against the test', 'Not sure']);
        expect(q1.options.filter((o) => o.right).map((o) => o.label)).toEqual(['No: only its words decide, checked against the test']);
        expect(q1.teach).toContain('does not make a sign true, and it does not make it false');
        if (rule === 'owner') {
          expect(q1.teach).toContain('part 1 of the rule fails');
          expect(q1.teach).not.toContain('it can still be here');
        } else expect(q1.teach).toContain('it can still be here');
      }
    }
  });

  it('mastery: every owner quiz pack has a chest whose own sign is True but fails part 2 (another sign is True too)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const items = l7.practice(createRng(seed));
      const part2 = items.some((it) => {
        if (it.scene?.kind !== 'boxes' || it.kind !== 'choose') return false;
        const signs = signsOnPage(it.scene.boxes)!;
        const answer = it.scene.boxes.findIndex((b) => b.id === it.answer);
        return [0, 1, 2].some((b) => b !== answer && signHolds(signs[b], b, b) && trueSigns(signs, b).length > 1);
      });
      expect(part2, `seed ${seed}`).toBe(true);
    }
  });

  it('owner quiz headlines say the truth comes from the sign’s words', () => {
    // With the treasure in Gold, Gold's own sign (“in the Bronze chest”) is false; in Bronze, Gold's sign is true too.
    expect(signHeadline(L7_EXAMPLE, 'chest', 0)).toBe('Your answer makes the Gold chest sign false, from its words, but the rule needs it to be true.');
    expect(trueSigns(L7_EXAMPLE.signs, 2)).toEqual([0, 2]);
    expect(signHeadline(L7_EXAMPLE, 'chest', 2)).toBe('Your answer makes the Gold chest sign true too, from its words, but the rule needs it to be false.');
    for (let seed = 1; seed <= 40; seed++) {
      const it = signItem(createRng(seed), { skin: SIGN_SKINS[seed % 4], rule: 'owner' }).item;
      for (const fb of Object.values(it.feedback!)) expect(fb.headline, fb.headline).toMatch(/, from (its|their) words, /);
    }
  });

  it('the new words read at the game’s level, with curly quotes and no symbols', () => {
    const text = NEW_TEXT().filter(Boolean).join('\n');
    expect(fkGrade(text)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(text);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(text).not.toMatch(/["']|[=≠✓→&]|Wrong/);
  });
});
