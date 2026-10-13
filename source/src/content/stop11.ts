/**
 * Stop 12 · Proof (id s11, n 11; shown as Stop 12 on the Journey). Opens after Circuit Lab and Proof Lantern.
 * A proof shows a claim must be true: every step follows from the givens or earlier steps. The stop names the ways the
 * game has proved things all along.
 *
 *  l1 Four ways to prove   a chain, cover every case, suppose and crash, one counterexample; trap: only examples
 *  l2 Every step cites     each step names the given, the definition or the earlier step it uses; trap: a true step
 *                          that uses nothing (the conflict: a true claim, a broken chain)
 *  l3 Cover every case     a proof by cases checks every case the givens leave; trap: a case left out
 *  l4 Suppose and crash    a guess that crashes proves its opposite (a proof by contradiction); trap: a guess that
 *                          holds up proves nothing
 *  l5 One is enough        one counterexample breaks an every claim; trap: examples that fit never prove one
 *  l6 Rules with names     the IF part happened, the THEN part did not happen, one or the other, the chain rule, Flip
 *                          and NOT; trap: a step that looks like a rule and is not (the flip trick, the NOT trick)
 *  l7 Dominoes             the first case and the step to the next prove every case (induction); trap: checked cases
 *                          offered as the step
 *
 * Lesson 4 also carries the liar card: “This sentence is false.” crashes both ways, so it is not a statement.
 *
 * Kid words first (chain, cases, suppose and crash, counterexample, dominoes); each grown-up word (proof, direct proof,
 * axiom, definition, proof by cases, contradiction, counterexample, modus ponens, modus tollens, disjunctive syllogism,
 * chain rule, proof by contrapositive, induction, base case, step) is named once, on the card that introduces it, and in
 * that lesson's terms. Every lesson is See -> Do -> Quiz; every answer, explanation, hint case and board mark comes from
 * ../engine/puzzles/proofs.ts, ../engine/puzzles/proofBoards.ts, ../engine/puzzles/proofRules.ts (lesson 6) and
 * ../engine/puzzles/proofInduction.ts (lesson 7). The check ends with the why item. The warm-up (bridge) is Proof
 * Lantern's “proved, a good guess, or false?” item.
 */
import {
  CRASH_VS_HOLDS,
  FITS_VS_BREAKS,
  L1_COUNTER,
  L1_SCENES,
  RULED_VS_LEFT,
  SHORT_CHAIN,
  STEP_TRUE_VS_FOLLOWS,
  WORKED_CASES,
  WORKED_CHAIN,
  WORKED_CLAIM,
  WORKED_COUNTER,
  WORKED_KNIGHTS,
  casesContrast,
  casesLeftBoard,
  casesTwinBoard,
  casesWorkedScene,
  chainWorkedScene,
  citeCheckBoard,
  citeContrast,
  citeTrueBoard,
  citeUsesBoard,
  counterContrast,
  counterRoleBoard,
  counterTwinBoard,
  counterWorkedScene,
  crashContrast,
  crashFollowBoard,
  crashGuessBoard,
  crashWords,
  crashWorkedLines,
  crashWorkedScene,
  methodBoard,
} from '../engine/puzzles/proofBoards';
import {
  LESSONS,
  METHODS,
  ORDER_BY_SKIN,
  PROOF_SKINS,
  STOP,
  TRAPS,
  WAYS,
  WHY_FAMILIES,
  WHY_LESSON,
  bridgeItem,
  brokenStepItem,
  breakerItem,
  cardName,
  cardRole,
  caseWhy,
  casesTrapItem,
  chainTrapItem,
  citeItem,
  claimWords,
  crashProvesItem,
  examplesTrapItem,
  holdsUpItem,
  joinAnd,
  joinOr,
  leftOutItem,
  methodItem,
  mustCoverItem,
  oneBreaksItem,
  stmtText,
  whichBreaksItem,
  whyFollows,
  whyItem,
  type Method,
  type ProofMade,
  type ProofSkin,
  type WhyAny,
} from '../engine/puzzles/proofs';
import {
  CONTRAST_STEPS,
  LOOKALIKES,
  MOVES,
  MOVE_LABEL,
  RULES,
  RULE_EXAMPLES,
  RULE_VS_LOOKALIKE,
  breakWorld,
  moveOf,
  ruleCasesBoard,
  ruleConcludeItem,
  ruleNameBoard,
  ruleNameItem,
  ruleTrapItem,
  ruleWhyItem,
  ruleWorkedScene,
  rulesContrast,
  rulesLookBoard,
  stepLine as ruleStepLine,
  leftWorld,
  worldText,
  WORKED_RULE,
  type MoveId,
} from '../engine/puzzles/proofRules';
import {
  CHECKS_VS_STEP,
  WORKED_STAIR,
  claimText,
  firstLine,
  inductionContrast,
  inductionPartsBoard,
  inductionTwinBoard,
  inductionWhyItem,
  inductionWorkedScene,
  IND_SKINS,
  caseHolds,
  firstHolds,
  missingPartItem,
  stepHolds,
  provesEveryItem,
  stepLine as indStepLine,
  twoPartsItem,
  valueAt,
  type IndClaim,
  type ProvesShape,
} from '../engine/puzzles/proofInduction';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';

/** A made item as a Stop 12 item: its id, lesson and skill (`s11.<tag>`). */
const finish = (m: ProofMade, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set look the same: a repeat is thrown away and made again from the
 * same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => ProofMade) => ProofMade {
  const seen = new Set<string>();
  const key = (m: ProofMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

const practiceOf = (lesson: string, make: (rng: Rng) => ProofMade[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));
const orderSkin = (rng: Rng, skin: ProofSkin) => rng.pick(ORDER_BY_SKIN[skin]);
const aKind = (k: string) => `a ${k}`;
const flipKind = (k: string) => (k === 'knight' ? 'knave' : 'knight');

// ---------- Lesson 1: four ways to prove ----------

const cat = WORKED_CASES.covered;
const brk = WORKED_COUNTER.cards.find((t) => cardRole(WORKED_CLAIM, t) === 'break')!;

const l1: LessonDef = {
  id: LESSONS.method,
  title: 'Four ways to prove',
  ideas: [
    {
      title: 'What is a proof?',
      body: [
        'A proof shows that a claim must be true. Not just that it is true, or likely.',
        'Every step must follow from the givens or from earlier steps. Then no case can break the claim.',
        'You have been proving things all along. Here are four ways you already know.',
      ],
    },
    {
      title: 'A chain of steps',
      scene: L1_SCENES.chain(),
      body: [
        'A chain joins facts one step at a time. Each step names what it uses.',
        `You did this in Line Up. ${stmtText(SHORT_CHAIN, SHORT_CHAIN.givens[0])} ${stmtText(SHORT_CHAIN, SHORT_CHAIN.givens[1])} So ${stmtText(SHORT_CHAIN, SHORT_CHAIN.steps[0].stmt)}`,
        'Proof Lantern’s reasons were chains too: the start, the step, then every time.',
        'Grown-ups call a chain a direct proof.',
      ],
    },
    {
      title: 'Cover every case',
      scene: L1_SCENES.cases(),
      body: [
        'Sometimes the givens leave only a few ways things could be. Then check the claim in every way.',
        'You did this in Grid Detective, one box at a time.',
        `Here, Leo’s pet is ${joinOr(cat.map((o) => o.a))}, since it is not ${WORKED_CASES.ruled[0].a}. ${cat.map((o) => caseWhy(WORKED_CASES, o)).join(' ')} So Leo’s pet has fur.`,
      ],
    },
    {
      title: 'Suppose and crash',
      scene: L1_SCENES.crash(),
      body: ['Suppose the opposite of what you want to show. Follow it. If it breaks a rule, the guess crashes.', 'You did this in Knights and Knaves.', ...crashWords(WORKED_KNIGHTS)],
    },
    {
      title: 'One counterexample',
      scene: L1_SCENES.counter(),
      body: [
        'To show an every claim is false, find one case that breaks it.',
        'You did this in Ways to Think and in Proof Lantern.',
        `Claim: ${claimWords(WORKED_CLAIM, WORKED_COUNTER.skin)} ${L1_COUNTER()} So the claim is false.`,
      ],
    },
    {
      title: 'Examples are not a proof',
      body: [
        'Two red circles do not prove that every red card is a circle.',
        `The next red card could be ${cardName(brk).replace(/^the /, 'a ')}.`,
        'Cover every case checks all the cases the givens leave. A list of examples checks only some.',
        'So a list of examples is not one of the four ways. At best, it makes a good guess.',
      ],
    },
  ],
  drill: [methodBoard()],
  terms: [
    { term: 'proof', means: 'Reasoning that shows a claim must be true. Every step follows, so no case can break the claim.' },
    { term: 'direct proof', also: 'a chain', means: 'A proof that joins facts one step at a time, from the givens to the claim.' },
  ],
  practice: practiceOf(LESSONS.method, (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    const [m1, m2, m3] = rng.shuffle(WAYS);
    // Three ways and the trap (a reasoning that only gives examples), in three skins.
    return [
      one(() => methodItem(rng, { method: m1, skin: a })),
      one(() => methodItem(rng, { method: m2, skin: b })),
      one(() => methodItem(rng, { method: 'examples', skin: c })),
      one(() => methodItem(rng, { method: m3, skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.method] },
};

// ---------- Lesson 2: every step cites ----------

const W = WORKED_CHAIN;

const l2: LessonDef = {
  id: LESSONS.cite,
  title: 'Every step cites',
  ideas: [
    {
      title: 'Every step must follow',
      body: [
        'A proof is a chain of steps. Each step must follow: what it uses must force it.',
        'So each step names what it uses. That can be a given, an earlier step, or a definition.',
        'A step that names nothing has a gap, even if it is true.',
      ],
    },
    {
      title: 'Definitions and axioms',
      body: [
        'A definition says what a word means. Everyone agrees on it before the proof starts.',
        `Here is one: ${W.skin.definition}`,
        'An axiom is a starting given that everyone accepts. The chain rule is one.',
        'It says: if a first comes before a second, and the second before a third, then the first comes before the third.',
        'Any step may use an axiom.',
      ],
    },
    {
      title: 'True is not the same as follows',
      distinction: STEP_TRUE_VS_FOLLOWS.id,
      scene: citeContrast(),
      body: [
        'A step can be true and still not follow.',
        `Both steps here say ${stmtText(W, W.steps[1].stmt)} That really happened.`,
        'The first uses step 1 and given 3, and those force it. The second uses nothing, so it does not follow.',
      ],
    },
    {
      title: `Example: ${stmtText(W, W.claim).replace(/\.$/, '')}`,
      scene: chainWorkedScene(),
      body: [
        'Here is a whole proof. Check each step on its own.',
        `Step 1: ${whyFollows(W, W.steps[0].stmt, W.steps[0].uses)}`,
        'Step 2 uses step 1 and given 3. Step 3 uses step 2 and the definition.',
        'Every step follows from what it uses. So it is a proof.',
      ],
    },
  ],
  drill: [citeTrueBoard(), citeCheckBoard(), citeUsesBoard()],
  distinctions: [STEP_TRUE_VS_FOLLOWS],
  terms: [
    { term: 'axiom', means: 'A starting given everyone accepts, like the chain rule. Any step may use it.' },
    { term: 'definition', means: 'What a word means, agreed before the proof starts.' },
  ],
  practice: practiceOf(LESSONS.cite, (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    // What a step uses, a step that does not follow, the trap (a true step that uses nothing), then why it is a proof.
    return [
      one(() => citeItem(rng, { skin: orderSkin(rng, a) })),
      one(() => brokenStepItem(rng, { skin: orderSkin(rng, b) })),
      one(() => chainTrapItem(rng, { skin: orderSkin(rng, c) })),
      one(() => (rng.chance(0.5) ? citeItem : brokenStepItem)(rng, { skin: orderSkin(rng, rng.pick(PROOF_SKINS)) })),
      one(() => whyItem(rng, { family: 'chain', skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.cite] },
};

// ---------- Lesson 3: cover every case ----------

const C = WORKED_CASES;
const fish = C.ruled[0];

const l3: LessonDef = {
  id: LESSONS.cases,
  title: 'Cover every case',
  ideas: [
    {
      title: 'Split into cases',
      body: [
        'Sometimes the givens leave a few ways things could be. Each way is a case.',
        'Check the claim in every case. If it is true in each one, it must be true.',
        'Grown-ups call this a proof by cases.',
      ],
    },
    {
      title: 'Every case the givens leave',
      body: [
        'Start with every case the givens name. Cross out each case a given rules out.',
        'Then the proof must check every case that is left.',
        'A case left out could break the claim. Then the proof has a gap.',
      ],
    },
    {
      title: 'Ruled out is not left out',
      distinction: RULED_VS_LEFT.id,
      scene: casesContrast(),
      body: [
        `Both proofs check only ${joinAnd(C.covered.map((o) => o.name))}.`,
        `In the first, given 2 rules out ${fish.name}. So every case left is checked.`,
        `In the second, nothing rules out ${fish.name}. The proof leaves it out, so it is not a proof.`,
      ],
    },
    {
      title: 'Example: Leo’s pet',
      scene: casesWorkedScene(),
      body: [
        `Given 1 names three cases: ${joinAnd(C.opts.map((o) => o.name))}.`,
        `Given 2 rules out ${fish.name}. So two cases are left.`,
        `${C.covered.map((o) => caseWhy(C, o)).join(' ')} The claim is true in every case left. So it is proved.`,
      ],
    },
    {
      title: 'A true claim is not enough',
      distinction: STEP_TRUE_VS_FOLLOWS.id,
      body: [
        'Say the claim is true in a case the proof left out. The proof still has a gap.',
        'A proof must show the claim is true in every case. Being true by luck is not enough.',
      ],
    },
  ],
  drill: [casesLeftBoard(), casesTwinBoard()],
  distinctions: [RULED_VS_LEFT, { ...STEP_TRUE_VS_FOLLOWS, taughtIn: LESSONS.cite }],
  terms: [{ term: 'proof by cases', means: 'A proof that checks the claim in every case the givens leave.' }],
  practice: practiceOf(LESSONS.cases, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    // Which cases must be checked, which case is left out, the trap (true in every case checked, but one is missing),
    // another left-out question, then why a proof by cases works.
    return [
      one(() => mustCoverItem(rng, { skin: a, avoid: used })),
      one(() => leftOutItem(rng, { skin: b, avoid: used })),
      one(() => casesTrapItem(rng, { skin: c, avoid: used })),
      one(() => leftOutItem(rng, { skin: rng.pick(PROOF_SKINS), left: 'none' })),
      one(() => whyItem(rng, { family: 'cases', skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.cases] },
};

// ---------- Lesson 4: suppose and crash ----------

const K = WORKED_KNIGHTS;
const KX = K.nm(K.who);

const l4: LessonDef = {
  id: LESSONS.crash,
  title: 'Suppose and crash',
  ideas: [
    {
      title: 'Suppose the opposite',
      body: [
        'Here is another way to prove something. Suppose it is false, just to test it.',
        'Then follow what must happen. If the guess leads to something that can’t happen, it crashes.',
        'You did this in Knights and Knaves.',
      ],
    },
    {
      title: 'A crash proves the opposite',
      body: [
        'A guess that crashes can’t be true. So its opposite must be true.',
        'A contradiction is two things that can’t both be true, like a knight with false words.',
        'Grown-ups call this a proof by contradiction.',
      ],
    },
    {
      title: 'Crashing is not holding up',
      distinction: CRASH_VS_HOLDS.id,
      scene: crashContrast(),
      body: [
        `Here are two guesses about ${KX}.`,
        `The first guess crashes. That proves ${KX} is ${aKind(flipKind(K.kind))}.`,
        'The second guess holds up. That shows only that it could be true. It proves nothing yet.',
      ],
    },
    {
      title: `Example: suppose ${KX} is ${aKind(K.kind)}`,
      scene: crashWorkedScene(),
      body: [...crashWorkedLines(), `That guess crashes. So ${KX} is ${aKind(flipKind(K.kind))}.`],
    },
    {
      // The liar card: one card, no item. Both guesses crash, so the sentence is not a statement (Stop 1's word).
      title: 'A sentence that crashes both ways',
      body: [
        'Here is a strange sentence: “This sentence is false.”',
        'Suppose it is true. Then what it says holds, so it is false. That guess crashes.',
        'Suppose it is false. It says it is false, and that is right, so it is true. That guess crashes too.',
        'Both guesses crash. So it is not a statement. In Stop 1, a statement is a sentence that is true or false.',
      ],
    },
  ],
  drill: [crashGuessBoard(), crashFollowBoard()],
  distinctions: [CRASH_VS_HOLDS],
  terms: [{ term: 'contradiction', also: 'suppose and crash', means: 'Two things that can’t both be true. A proof by contradiction supposes the opposite and finds one.' }],
  practice: practiceOf(LESSONS.crash, (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    // What a crash proves, who breaks the rule, the trap (a guess that holds up), another crash, then why it proves.
    return [
      one(() => crashProvesItem(rng, { skin: a })),
      one(() => breakerItem(rng, { skin: b })),
      one(() => holdsUpItem(rng, { skin: c })),
      one(() => crashProvesItem(rng, { skin: rng.pick(PROOF_SKINS) })),
      one(() => whyItem(rng, { family: 'crash', skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.crash] },
};

// ---------- Lesson 5: one is enough ----------

const roleWord = { fit: 'fits', break: 'breaks the claim', none: 'says nothing' } as const;

const l5: LessonDef = {
  id: LESSONS.counter,
  title: 'One is enough',
  ideas: [
    {
      title: 'Every means no exceptions',
      body: [
        'A claim about every card says something about each one.',
        'So one card that breaks it makes the claim false. That card is a counterexample.',
        'You found counterexamples in Ways to Think and in Proof Lantern.',
      ],
    },
    {
      title: 'Examples never prove it',
      body: [
        'Ten red circles do not prove that every red card is a circle.',
        'The claim is about every red card, even ones you have not seen. The next one could be a square.',
        'Examples can make a good guess. They never prove an every claim.',
      ],
    },
    {
      title: 'Fitting is not breaking',
      distinction: FITS_VS_BREAKS.id,
      scene: counterContrast(),
      body: ['Both cards are red, so the claim is about both.', 'The circle fits. It is one example, and it proves nothing.', 'The square breaks the claim. One card like that makes it false.'],
    },
    {
      title: 'Says nothing',
      body: [
        'A blue triangle can’t break “Every red card is a circle.” It is not red.',
        'The claim is only about red cards. So it says nothing about the blue triangle.',
        'To break the claim, a card must be red and not a circle.',
      ],
    },
    {
      title: 'Example: check each card',
      scene: counterWorkedScene(),
      body: [
        `The claim: “${claimWords(WORKED_CLAIM, WORKED_COUNTER.skin)}”`,
        ...WORKED_COUNTER.cards.map((t, i) => `Card ${i + 1}, ${cardName(t)}, ${roleWord[cardRole(WORKED_CLAIM, t)]}.`),
        `One card breaks it, so the claim is false.`,
      ],
    },
  ],
  drill: [counterRoleBoard(), counterTwinBoard()],
  distinctions: [FITS_VS_BREAKS],
  terms: [{ term: 'counterexample', means: 'One case that breaks an every claim. One is enough to show the claim is false.' }],
  practice: practiceOf(LESSONS.counter, (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    // Which card breaks the claim, the trap (examples that fit), the conflict (most fit, one breaks it), another
    // which-breaks question, then why one card is enough.
    return [
      one(() => whichBreaksItem(rng, { skin: a })),
      one(() => examplesTrapItem(rng, { skin: b })),
      one(() => oneBreaksItem(rng, { skin: c })),
      one(() => whichBreaksItem(rng, { skin: rng.pick(PROOF_SKINS) })),
      one(() => whyItem(rng, { family: 'counter', skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.counter] },
};

// ---------- Lesson 6: rules with names ----------

const RX = RULE_EXAMPLES;
const sayRule = (m: MoveId) => ruleStepLine(RX[m]);
const look = CONTRAST_STEPS.look;

const l6: LessonDef = {
  id: LESSONS.rules,
  title: 'Rules with names',
  ideas: [
    {
      title: 'Rules with names',
      body: [
        'Some proof steps have the same shape again and again.',
        'A shape that always works is a rule. Whenever its givens are true, its claim is true too.',
        'You have used these rules before. Now each one gets a name.',
      ],
    },
    {
      title: 'The IF part, and the THEN part',
      body: [
        `${MOVE_LABEL.mp}: “${sayRule('mp')}” Grown-ups call this modus ponens.`,
        `${MOVE_LABEL.mt}: “${sayRule('mt')}” This one is modus tollens.`,
        'You used both moves with if–then rules.',
      ],
    },
    {
      title: 'One or the other',
      body: [`“${sayRule('ds')}”`, 'One side is ruled out, so the other side must be true.', 'Grown-ups call this disjunctive syllogism.'],
    },
    {
      title: 'The chain rule',
      body: [
        `“${sayRule('chain')}”`,
        'The THEN part of the first rule is the IF part of the second. So the two rules join into one.',
        'It is the same idea as the chain rule for who came first. Grown-ups also call it hypothetical syllogism.',
      ],
    },
    {
      title: 'Proof by Flip and NOT',
      body: [
        'Flip and NOT turns a rule around and puts NOT on each part.',
        `“${ruleStepLine({ ...RX.contra, givens: [RX.contra.claim], claim: RX.contra.givens[0] }).replace(/ So .*$/, '')}” becomes “${ruleStepLine(RX.contra).replace(/ So .*$/, '')}”`,
        'The two always mean the same. So to prove the rule, you may prove its Flip and NOT instead.',
        'Grown-ups call this a proof by contrapositive.',
      ],
    },
    {
      title: 'Rules and look-alikes',
      distinction: RULE_VS_LOOKALIKE.id,
      scene: rulesContrast(),
      body: [
        'Some steps sound like rules, but they are not. They are look-alikes.',
        `Both steps here start from the same rule. The first is “${MOVE_LABEL.mt}.” It follows.`,
        `The second is “${MOVE_LABEL.da}.” A case breaks it: ${worldText(look, breakWorld(look))}`,
        `“${MOVE_LABEL.ac}” is a look-alike too. It goes back from the THEN part to the IF part.`,
      ],
    },
    {
      title: 'Example: is it a rule?',
      scene: ruleWorkedScene(),
      body: [
        `The step: “${ruleStepLine(WORKED_RULE)}”`,
        'List every case. Cross out each case where a given is false.',
        `Only one case is left: ${worldText(WORKED_RULE, leftWorld(WORKED_RULE))} The claim is true there.`,
        `So the step follows. It is “${MOVE_LABEL[moveOf(WORKED_RULE)!]}.”`,
      ],
    },
  ],
  drill: [rulesLookBoard(), ruleCasesBoard(), ruleNameBoard()],
  distinctions: [RULE_VS_LOOKALIKE],
  terms: [
    { term: 'modus ponens', also: 'the IF part happened', means: 'A rule: when an if–then rule holds and its IF part happened, its THEN part happened too.' },
    { term: 'modus tollens', also: 'the THEN part did not happen', means: 'A rule: when an if–then rule holds and its THEN part did not happen, its IF part did not happen either.' },
    { term: 'disjunctive syllogism', also: 'one or the other', means: 'A rule: when one of two things is true and the first one is not, the second one is.' },
    { term: 'chain rule', also: 'hypothetical syllogism', means: 'A rule that joins two if–then rules, when the THEN part of the first is the IF part of the second.' },
    { term: 'proof by contrapositive', also: 'proof by Flip and NOT', means: 'To prove an if–then rule, prove its Flip and NOT instead. The two always mean the same.' },
  ],
  practice: practiceOf(LESSONS.rules, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    // Name a rule, give the claim a rule allows, the trap (the step that is no rule), one more, then why a rule may be used.
    return [
      one(() => ruleNameItem(rng, { skin: a, move: rng.pick(RULES), avoid: used })),
      one(() => ruleConcludeItem(rng, { skin: b, move: rng.pick(RULES), avoid: used })),
      one(() => ruleTrapItem(rng, { skin: c, avoid: used })),
      one(() => (rng.chance(0.5) ? ruleNameItem : ruleConcludeItem)(rng, { skin: rng.pick(PROOF_SKINS), move: rng.pick(MOVES) })),
      one(() => ruleWhyItem(rng, { skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.rules] },
};

// ---------- Lesson 7: dominoes ----------

const ST = WORKED_STAIR;
/** Card 5's two failures, worked out from the model: a number list with no first case, and one with no step. */
const oddList = (a: number, d: number): IndClaim => ({ skin: IND_SKINS.terms, a, d, prop: { kind: 'odd' } });
const NO_FIRST = oddList(4, 2);
const NO_STEP = oddList(3, 3);
if (firstHolds(NO_FIRST) || !stepHolds(NO_FIRST) || !firstHolds(NO_STEP) || stepHolds(NO_STEP) || caseHolds(NO_STEP, 2)) throw new Error('stop11: card 5 needs a list with no first case and one with no step');

const l7: LessonDef = {
  id: LESSONS.induction,
  title: 'Dominoes',
  ideas: [
    {
      title: 'A line of dominoes',
      body: [
        'Picture a long line of dominoes. Push the first one, and it knocks over the next.',
        'If each domino knocks over the next, they all fall. Even one far down the line falls.',
        'Two things make that work: the first one falls, and each one knocks over the next.',
      ],
    },
    {
      title: 'Two parts prove every case',
      body: [
        'A claim about every case can be proved the same way.',
        'The first case: show the claim holds for case 1. That is the first domino. Grown-ups call it the base case.',
        'The step to the next: show that if the claim holds for one case, it holds for the next. Grown-ups call this part the step.',
        'The two parts together make a domino proof. Grown-ups call it induction.',
      ],
    },
    {
      title: 'Checked cases are not the step',
      distinction: CHECKS_VS_STEP.id,
      scene: inductionContrast(),
      body: [
        `Both tries start from the first case: ${firstLine(ST, false)}`,
        'The first try then shows the step to the next. It passes the claim from any step to the next one.',
        'The second try only checks more steps. The checking stops at step 4, so nothing reaches step 5.',
      ],
    },
    {
      title: 'Example: an odd staircase',
      scene: inductionWorkedScene(),
      body: [`Claim: ${claimText(ST)}`, firstLine(ST), indStepLine(ST), 'Both parts hold. So every step is odd, all the way to step 100 and past it.'],
    },
    {
      title: 'Both parts are needed',
      body: [
        `Here are two number lists, each with the claim “${claimText(NO_FIRST)}”`,
        `With no first case, nothing starts. Start at ${NO_FIRST.a} and add ${NO_FIRST.d}. The step to the next holds, but term 1 is ${valueAt(NO_FIRST, 1)}. So no term is odd.`,
        `With no step to the next, the line can stop. Start at ${NO_STEP.a} and add ${NO_STEP.d}. Term 1 is ${valueAt(NO_STEP, 1)}, which is odd, but term 2 is ${valueAt(NO_STEP, 2)}.`,
        'Checked cases are not enough either. They stop where the checking stops.',
      ],
    },
  ],
  drill: [inductionPartsBoard(), inductionTwinBoard()],
  distinctions: [CHECKS_VS_STEP],
  terms: [
    { term: 'induction', also: 'the domino proof', means: 'A proof that a claim holds for every case. Show the first case, then show that each case passes the claim to the next.' },
    { term: 'base case', also: 'the first domino', means: 'The first case of a domino proof. It shows the claim holds at the start.' },
    { term: 'step', also: 'the step to the next', means: 'The part of a domino proof that shows this: if the claim holds for one case, it holds for the next case too.' },
  ],
  practice: practiceOf(LESSONS.induction, (rng) => {
    const one = distinctItems();
    const [a, b, c] = rng.shuffle(PROOF_SKINS);
    // A claim with its two parts, the part that is missing, the trap (checked cases offered as the step), one more
    // argument to judge, then why the two parts prove every case.
    return [
      one(() => twoPartsItem(rng, { skin: a })),
      one(() => missingPartItem(rng, { skin: b })),
      one(() => provesEveryItem(rng, { skin: c, shape: 'checks' })),
      one(() => provesEveryItem(rng, { skin: rng.pick(PROOF_SKINS), shape: rng.pick<ProvesShape>(['both', 'nofirst', 'nostep']) })),
      one(() => inductionWhyItem(rng, { skin: rng.pick(PROOF_SKINS) })),
    ];
  }),
  pass: { firstTry: 3, include: [TRAPS.induction] },
};

const lessons = [l1, l2, l3, l4, l5, l6, l7];

// ---------- check, Arcade, new examples, warm-up ----------

/** The closing why item of any family: the four ways (proofs.ts), named rules (l6) or the domino proof (l7). */
function whyOf(rng: Rng, family: WhyAny, skin?: ProofSkin): ProofMade {
  if (family === 'rules') return ruleWhyItem(rng, { skin });
  if (family === 'induction') return inductionWhyItem(rng, { skin });
  return whyItem(rng, { family, skin });
}

/**
 * 10 items: one from each of Lessons 1 to 5, two from Lesson 6 and two from Lesson 7, in lesson order, then the why
 * item last. Conflict items, always there: the chain with a true claim and a step that uses nothing (l2), the four steps
 * where one only looks like a rule (l6), and the checked cases offered as the step to the next (l7). The why item comes
 * from any of the six families and is filed under the lesson that teaches its reason.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const skin = () => rng.pick(PROOF_SKINS);
  const cases = (): ProofMade => {
    const k = rng.int(0, 2);
    return k === 0 ? mustCoverItem(rng, { skin: skin(), avoid: used }) : k === 1 ? leftOutItem(rng, { skin: skin(), avoid: used }) : casesTrapItem(rng, { skin: skin(), avoid: used });
  };
  const crash = (): ProofMade => rng.pick([crashProvesItem, breakerItem, holdsUpItem])(rng, { skin: skin() });
  const counter = (): ProofMade => rng.pick([oneBreaksItem, whichBreaksItem, examplesTrapItem])(rng, { skin: skin() });
  const plan: [string, ProofMade][] = [
    [LESSONS.method, one(() => methodItem(rng, { method: rng.pick(METHODS), skin: skin() }))],
    [LESSONS.cite, one(() => chainTrapItem(rng, { skin: orderSkin(rng, skin()) }))],
    [LESSONS.cases, one(cases)],
    [LESSONS.crash, one(crash)],
    [LESSONS.counter, one(counter)],
    [LESSONS.rules, one(() => (rng.chance(0.5) ? ruleNameItem : ruleConcludeItem)(rng, { skin: skin(), move: rng.pick(RULES) }))],
    [LESSONS.rules, one(() => ruleTrapItem(rng, { skin: skin() }))],
    [LESSONS.induction, one(() => (rng.chance(0.5) ? twoPartsItem(rng, { skin: skin() }) : missingPartItem(rng, { skin: skin() })))],
    [LESSONS.induction, one(() => provesEveryItem(rng, { skin: skin(), shape: 'checks' }))],
  ];
  const family = rng.pick(WHY_FAMILIES);
  plan.push([WHY_LESSON[family], one(() => whyOf(rng, family, skin()))]);
  return plan.map(([lesson, m], i) => finish(m, `s${STOP}-c${i + 1}`, lesson));
}

/** One item for the Arcade, from any lesson. */
const ARCADE: [string, (rng: Rng) => ProofMade][] = [
  [LESSONS.method, (rng) => methodItem(rng, { method: rng.pick(METHODS), skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.cite, (rng) => citeItem(rng, { skin: orderSkin(rng, rng.pick(PROOF_SKINS)) })],
  [LESSONS.cite, (rng) => brokenStepItem(rng, { skin: orderSkin(rng, rng.pick(PROOF_SKINS)) })],
  [LESSONS.cite, (rng) => chainTrapItem(rng, { skin: orderSkin(rng, rng.pick(PROOF_SKINS)) })],
  [LESSONS.cases, (rng) => mustCoverItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.cases, (rng) => leftOutItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.cases, (rng) => casesTrapItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.crash, (rng) => crashProvesItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.crash, (rng) => breakerItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.crash, (rng) => holdsUpItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.counter, (rng) => whichBreaksItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.counter, (rng) => examplesTrapItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.counter, (rng) => oneBreaksItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.rules, (rng) => ruleNameItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.rules, (rng) => ruleConcludeItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.rules, (rng) => ruleTrapItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.induction, (rng) => twoPartsItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.induction, (rng) => missingPartItem(rng, { skin: rng.pick(PROOF_SKINS) })],
  [LESSONS.induction, (rng) => provesEveryItem(rng, { skin: rng.pick(PROOF_SKINS) })],
];
function arcade(rng: Rng): Item {
  if (rng.chance(0.15)) {
    const family = rng.pick(WHY_FAMILIES);
    return finish(whyOf(rng, family), `s${STOP}-arcade`, WHY_LESSON[family]);
  }
  const [lesson, make] = rng.pick(ARCADE);
  return finish(make(rng), `s${STOP}-arcade`, lesson);
}

const FAMILY_OF: Record<string, WhyAny> = {
  [LESSONS.cite]: 'chain',
  [LESSONS.cases]: 'cases',
  [LESSONS.crash]: 'crash',
  [LESSONS.counter]: 'counter',
  [LESSONS.rules]: 'rules',
  [LESSONS.induction]: 'induction',
};
const has = (it: Item, s: string) => it.prompt.includes(s);
const tagged = (it: Item, tag: string) => !!it.tags?.includes(tag);
const answerOf = (it: Item) => (it.kind === 'choose' ? it.answer : '');

/**
 * New examples after a miss. A missed trap gets another trap and a question with another answer, so repeating one
 * answer never passes the set. A missed way gets the same way in a new skin and another way. A missed rule gets the
 * same rule and another one. A missed why gets the same reason and one from another lesson.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = (m: ProofMade, lesson = missed.lesson) => finish(m, 'new', lesson);
  const skin = () => rng.pick(PROOF_SKINS);
  const os = () => orderSkin(rng, skin());
  switch (missed.skill) {
    case 's11.method': {
      const m = answerOf(missed) as Method;
      const other = rng.pick(METHODS.filter((x) => x !== m));
      return [make(methodItem(rng, { method: m, skin: skin() })), make(methodItem(rng, { method: other, skin: skin() }))];
    }
    case 's11.cite':
      if (tagged(missed, TRAPS.cite.tag)) return [make(chainTrapItem(rng, { skin: os() })), make(brokenStepItem(rng, { skin: os(), how: 'none' }))];
      if (has(missed, 'Which step does not follow')) return [make(brokenStepItem(rng, { skin: os(), how: rng.pick(['wrong', 'def'] as const) })), make(brokenStepItem(rng, { skin: os(), how: 'none' }))];
      return [make(citeItem(rng, { skin: os() })), make(citeItem(rng, { skin: os() }))];
    case 's11.cases':
      if (has(missed, 'Is it a proof?')) return [make(casesTrapItem(rng, { skin: skin() })), make(leftOutItem(rng, { skin: skin(), left: 'none' }))];
      if (has(missed, 'leave out')) return [make(leftOutItem(rng, { skin: skin(), left: rng.pick(['holds', 'fails'] as const) })), make(leftOutItem(rng, { skin: skin(), left: 'none' }))];
      return [make(mustCoverItem(rng, { skin: skin() }))];
    case 's11.crash':
      if (tagged(missed, TRAPS.crash.tag)) return [make(holdsUpItem(rng, { skin: skin() })), make(crashProvesItem(rng, { skin: skin() }))];
      if (has(missed, 'whose words break')) return [make(breakerItem(rng, { skin: skin() }))];
      return [make(crashProvesItem(rng, { skin: skin() })), make(holdsUpItem(rng, { skin: skin() }))];
    case 's11.counter':
      if (tagged(missed, TRAPS.counter.tag)) return [make(examplesTrapItem(rng, { skin: skin() })), make(oneBreaksItem(rng, { skin: skin() }))];
      if (has(missed, 'What do they show')) return [make(oneBreaksItem(rng, { skin: skin() })), make(examplesTrapItem(rng, { skin: skin() }))];
      return [make(whichBreaksItem(rng, { skin: skin() }))];
    case 's11.rules': {
      if (tagged(missed, TRAPS.rules.tag)) return [make(ruleTrapItem(rng, { skin: skin() })), make(ruleNameItem(rng, { skin: skin(), move: rng.pick(RULES) }))];
      if (has(missed, 'Which rule does it use')) {
        const m = answerOf(missed) as MoveId;
        const other = rng.pick(RULES.filter((x) => x !== m));
        return [make(ruleNameItem(rng, { skin: skin(), move: m })), make(ruleNameItem(rng, { skin: skin(), move: other }))];
      }
      return [make(ruleConcludeItem(rng, { skin: skin(), move: rng.pick(RULES) })), make(ruleConcludeItem(rng, { skin: skin(), move: rng.pick(LOOKALIKES) }))];
    }
    case 's11.induction': {
      if (tagged(missed, TRAPS.induction.tag)) return [make(provesEveryItem(rng, { skin: skin(), shape: 'checks' })), make(provesEveryItem(rng, { skin: skin(), shape: 'both' }))];
      if (has(missed, 'Which part is missing')) {
        const shape = answerOf(missed) === 'first' ? 'nofirst' : 'nostep';
        return [make(missingPartItem(rng, { skin: skin(), shape })), make(missingPartItem(rng, { skin: skin(), shape: shape === 'nofirst' ? 'nostep' : 'nofirst' }))];
      }
      if (has(missed, 'Which two prove')) return [make(twoPartsItem(rng, { skin: skin() })), make(missingPartItem(rng, { skin: skin() }))];
      // The same kind of argument as the missed one, and one with another answer (the checked cases answer “no step”).
      const same: ProvesShape = answerOf(missed) === 'yes' ? 'both' : answerOf(missed) === 'nofirst' ? 'nofirst' : 'nostep';
      return [make(provesEveryItem(rng, { skin: skin(), shape: same })), make(provesEveryItem(rng, { skin: skin(), shape: same === 'nostep' ? 'both' : 'checks' }))];
    }
    case 's11.why': {
      const f = FAMILY_OF[missed.lesson] ?? rng.pick(WHY_FAMILIES);
      const other = rng.pick(WHY_FAMILIES.filter((x) => x !== f));
      return [make(whyOf(rng, f, skin()), WHY_LESSON[f]), make(whyOf(rng, other, skin()), WHY_LESSON[other])];
    }
  }
  return [];
}

/** The warm-up: Proof Lantern's “proved, a good guess, or false?” item. It never counts for this stop. */
const bridge = (rng: Rng): Item => bridgeItem(rng);

export const stop11: StopDef = {
  n: STOP,
  id: 's11',
  title: 'Proof',
  idea: 'A proof is a chain where every step must follow.',
  ready: true,
  requires: ['s10', 's17'],
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  bridgeFrom: 's17',
  skillNames: {
    's11.method': 'Proof: name the way a reasoning proves its claim',
    's11.cite': 'Proof: every step names what it uses, and follows from it',
    's11.cases': 'Proof: cover every case the givens leave',
    's11.crash': 'Proof: suppose the opposite; a crash proves the claim',
    's11.counter': 'Proof: one counterexample breaks an every claim; examples never prove one',
    's11.rules': 'Proof: name the rule a step uses, and spot a step that only looks like one',
    's11.induction': 'Proof: prove every case with the first case and the step to the next',
    's11.why': 'Proof: why a proof works',
  },
};

