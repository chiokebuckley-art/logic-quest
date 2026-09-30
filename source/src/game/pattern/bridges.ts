import { createRng } from '../../engine/rng';

export const ROUTINE = ['Notice', 'Compare', 'Describe', 'Predict', 'Test', 'Revise'] as const;
export type AgePath = 'Explorer' | 'Trailblazer' | 'Logician';
export const EVENT_IDS = ['SC-01','SC-02','SW-01','FM-01','FM-02','LC-01','LC-02','TM-01','TM-02','CD-01','CD-02','BR-01','TI-01'] as const;
export type EventId = typeof EVENT_IDS[number];
export interface BridgeProgress { path: AgePath; completed: string[]; workshop: boolean; evidenceScout: boolean }
export const freshBridge = (): BridgeProgress => ({ path: 'Explorer', completed: [], workshop: false, evidenceScout: false });
export function parseBridge(raw: unknown): BridgeProgress {
  const p = freshBridge();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p;
  const r = raw as Record<string, unknown>;
  if (r.path === 'Explorer' || r.path === 'Trailblazer' || r.path === 'Logician') p.path = r.path;
  if (Array.isArray(r.completed)) p.completed = [...new Set(r.completed.filter((s): s is string => typeof s === 'string' && (EVENT_IDS as readonly string[]).includes(s)))];
  p.workshop = r.workshop === true;
  p.evidenceScout = ['FM-02','TM-02','CD-02'].every(id => p.completed.includes(id));
  return p;
}
export function completeBridge(p: BridgeProgress, ids: string[], workshop = false): BridgeProgress {
  return parseBridge({ ...p, completed: [...p.completed, ...ids], workshop: p.workshop || workshop });
}

export const DESTINATIONS = [
  { name: 'Signal Camp', art: 'signal-camp', stop: 's1', events: ['SC-01','SC-02'], purpose: 'Notice features. Make a statement you can check.', paths: ['Explorer','Trailblazer','Logician'] },
  { name: 'Switch Caverns', art: 'switch-caverns', stop: 's2', events: ['SW-01'], purpose: 'Check that both parts of an AND rule fit.', paths: ['Explorer','Trailblazer','Logician'] },
  { name: 'Fog Marsh', art: 'fog-marsh', stop: 's1', events: ['FM-01','FM-02'], purpose: 'Choose another case when clues cannot decide.', paths: ['Explorer','Trailblazer','Logician'] },
  { name: 'Ladder Cliffs', art: 'ladder-cliffs', stop: 's3', events: ['LC-01','LC-02'], purpose: 'Use position and order clues.', paths: ['Explorer','Trailblazer','Logician'] },
  { name: 'Bridge of Rules', art: 'of-rules', stop: 's6', events: ['BR-01'], purpose: 'Match a relationship; check which way it works.', paths: ['Trailblazer','Logician'] },
  { name: 'Twin Isles', art: 'twin-isles', stop: 's6', events: ['TI-01'], purpose: 'Compare relations across two settings.', paths: ['Trailblazer','Logician'] },
  { name: 'Trickster Market', art: 'trickster-market', stop: 's11', events: ['TM-01','TM-02'], purpose: 'Look for a counterexample. Test rival claims.', paths: ['Logician'] },
  { name: 'Chance Dock', art: 'chance-dock', stop: 's12', events: ['CD-01','CD-02'], purpose: 'Separate an observation from a guaranteed result.', paths: ['Logician'] },
] as const;

export interface Token { shape: 'circle' | 'square' | 'triangle'; color: 'teal' | 'gold'; striped?: boolean; label?: string }
export interface Question { prompt: string; options: string[]; answer: string; why: string }
export interface BridgeRound { id: string; title: string; evidence: string; tokens?: Token[]; compare: string; describe: Question; predict: Question; test: Question; reveal: string; revise: Question }
const q = (prompt: string, options: string[], answer: string, why: string): Question => ({ prompt, options, answer, why });

function buildRound(id: string, seed: number): BridgeRound {
  const rng = createRng(seed);
  const shape = rng.pick(['circle','square','triangle'] as const);
  const other = shape === 'circle' ? 'square' : 'circle';
  const color = rng.pick(['teal','gold'] as const);
  const opposite = color === 'teal' ? 'gold' : 'teal';
  const base: BridgeRound = {
    id, title: 'Notice a feature', evidence: 'Look at the two objects. The written names repeat their colors.',
    tokens: [{shape,color,label:`${color} ${shape}`},{shape,color:opposite,label:`${opposite} ${shape}`}],
    compare: 'Compare shape and color separately. A feature is one thing you can notice about an object.',
    describe: q('What feature do these objects share?', [shape,'Color','Neither feature'],shape,`Both objects are a ${shape}; their colors differ.`),
    predict: q(`A new ${opposite} ${shape} arrives. Will it share their shape?`,['Yes','No','Need more information'],'Yes','Color does not change shape.'),
    test: q('How can you check the shape claim?', ['Compare outlines','Count colors','Guess from size'],'Compare outlines','An outline lets you check the shape directly.'),
    reveal: `The new object has the same ${shape} outline. Its color is different.`,
    revise: q('Which statement fits the evidence?', ['Same shape; color may differ','All objects are the same color','Nothing can be compared'],'Same shape; color may differ','Keep the feature that the evidence supports. Do not add a color rule.'),
  };
  if (id === 'SC-01' || id === 'workshop-notice') return base;
  if (id === 'SC-02' || id === 'SW-01' || id === 'workshop-sort') {
    const and = id === 'SW-01';
    return { ...base, title: and ? 'Both features must fit' : 'Sort by a stated rule',
      evidence: and ? `The container takes ${color} AND ${shape} objects. AND means both parts must be true.` : `The container takes every ${shape}. Color is not part of the rule.`,
      tokens: [{shape,color,label:`${color} ${shape}`},{shape:other,color,label:`${color} ${other}`},{shape,color:opposite,label:`${opposite} ${shape}`}],
      describe: q('Which object fits the stated rule?',[`${color} ${shape}`,`${color} ${other}`,'No objects'],`${color} ${shape}`,'Check the stated rule, rather than guessing a rule from the decoration.'),
      predict: q(`Does a ${opposite} ${shape} fit?`,['Yes','No','Need more information'],and?'No':'Yes',and?`It has the right shape but is not ${color}. Both features are required.`:'It has the required shape; its color is irrelevant.'),
      test: q('How should you check a boundary case?',['Check each required feature','Check only the color','Check the background'],'Check each required feature','A boundary case helps separate members from nonmembers.'),
      reveal: and ? `The ${opposite} ${shape} stays outside: it fails the color part.` : `The ${opposite} ${shape} goes inside: the rule only asks about shape.`,
      revise: q('What should your explanation include?',and?['Both required features','Only one feature','Every object belongs']:['Only the required shape','A new color restriction','Every object belongs'],and?'Both required features':'Only the required shape','Explain membership using the rule that was actually stated.'),
    };
  }
  if (id === 'workshop-repeat' || id === 'LC-01') {
    const a: Token = {shape,color,label:`${color} ${shape}`}; const b: Token = {shape:other,color:opposite,label:`${opposite} ${other}`};
    return { ...base, title: 'Find the smallest repeat', evidence: 'This conveyor repeats a block in the same order. Read from left to right.', tokens: [a,b,a,b,a,b],
      compare: 'Compare each pair with the next pair. A repeat unit is the shortest block that can build the whole shown sequence.',
      describe: q('What is the smallest repeat unit?',['First two objects','First four objects','One object'],'First two objects','The first pair repeats. Four objects work but are not the smallest block; one object does not reproduce the alternation.'),
      predict: q('Which object comes next if this repeat rule continues?',[a.label!,b.label!,'Need more information'],a.label!,'After the second object in the pair, start the pair again.'),
      test: q('How do you test a proposed repeat unit?',['Copy it and compare every position','Look at only the first object','Choose the longest block'],'Copy it and compare every position','The copied block must reproduce every shown position.'),
      reveal: 'Copying the first pair three times reproduces all six positions.',
      revise: q('How could the same rule work with actions?',['Clap, tap, clap, tap','Clap, clap, tap, tap','Only clap'],'Clap, tap, clap, tap','Different objects or actions can share the same repeating relationship.'),
    };
  }
  if (id === 'LC-02') return { ...base, title: 'Use order evidence', tokens: undefined,
    evidence: 'Ava is before Ben. Ben is before Cal. “Before” means earlier in the line, not necessarily next to.', compare: 'Trace the direction of each clue. Do not assume two people are next to each other.',
    describe:q('What must follow?',['Ava is before Cal','Cal is before Ava','Ava is next to Cal'],'Ava is before Cal','The two before-clues form a chain.'),
    predict:q('Can someone else stand between Ava and Ben?',['Yes','No','Only if Cal leaves'],'Yes','Before does not say immediately before.'),
    test:q('Which line obeys both clues?',['Ava, Dee, Ben, Cal','Ben, Ava, Cal, Dee','Cal, Ben, Ava, Dee'],'Ava, Dee, Ben, Cal','Ava still comes before Ben, and Ben before Cal.'),
    reveal:'Dee can fit between Ava and Ben without breaking either clue.',
    revise:q('Which word would force adjacency?',['Immediately before','Before','Somewhere before'],'Immediately before','Immediately before leaves no person in between.'),
  };
  if (id === 'FM-01' || id === 'workshop-uncertain') return { ...base, title: 'Another case can help', tokens: undefined,
    evidence:'Two cards have been seen: a striped circle and a striped square. Both were accepted. Plain cards have not been tested.',
    compare:'Both “accept every card” and “accept striped cards only” fit the two observations. Keep both possible.',
    describe:q('What do the two accepted cards establish?',['Striped cards can be accepted','Every plain card is accepted','Plain cards are rejected'],'Striped cards can be accepted','The two observations do not show what happens to a plain card.'),
    predict:q('Will a plain triangle be accepted?',['Must be accepted','Must be rejected','Need more information'],'Need more information','The competing rules make different predictions about plain cards.'),
    test:q('Which test helps distinguish these rules?',['Try a plain triangle','Try another striped circle','Repeat the striped square'],'Try a plain triangle','A new striped card fits both rules. A plain card separates their predictions.'),
    reveal:'The plain triangle is rejected. Of the two stated rules, only “striped cards only” still fits.',
    revise:q('What should you say now?',['The striped-only rule fits these tests','This proves every future card forever','The first two observations were useless'],'The striped-only rule fits these tests','Revise your rule using the new case, while keeping the claim limited to tested evidence.'),
  };
  if (id === 'FM-02' || id === 'TM-02') {
    const hidden = rng.pick(['add','double']); const input = rng.pick([1,3,4]); const output = hidden === 'add' ? input + 2 : input * 2;
    return { ...base, title:'Choose a separating test', tokens:undefined,
      evidence:'A mystery machine takes 2 (input pieces) and gives 4 (output pieces). Candidate A adds 2. Candidate B doubles. These are hypotheses, not known rules.',
      compare:'Both candidates predict 4 for an input of 2. One matching result cannot separate them.',
      describe:q('Which candidates fit the observed result?',['Both A and B','Only A','Only B'],'Both A and B','2 + 2 = 4 and 2 × 2 = 4.'),
      predict:q(`For ${input} (input pieces), what do A and B predict?`,[`A: ${input+2} (output pieces); B: ${input*2} (output pieces)`,`A: ${input*2} (output pieces); B: ${input+2} (output pieces)`,'Both predict 4 (output pieces)'],`A: ${input+2} (output pieces); B: ${input*2} (output pieces)`,'Apply each candidate separately; label which prediction belongs to which rule.'),
      test:q('Which input distinguishes these two rules?',[`${input} (input pieces)`,'2 (input pieces)','Repeat the first result'],`${input} (input pieces)`,'Use an input where the two rules predict different outputs.'),
      reveal:`The test gives ${output} (output pieces) from ${input} (input pieces). A predicts ${input+2} (output pieces); B predicts ${input*2} (output pieces).`,
      revise:q('Which of the two stated candidates survives this test?',['A: add 2','B: double','Both candidates'],hidden==='add'?'A: add 2':'B: double','Keep the candidate matching the new result. This does not prove it is the only possible rule in the world.'),
    };
  }
  if (id === 'TM-01') return { ...base, title:'Find a counterexample', tokens:undefined,
    evidence:'A seller claims: “Every gold object is a circle.” The display includes a gold circle and a gold square.', compare:'“Every” means there can be no exceptions. One gold object with another shape can defeat this claim.',
    describe:q('What kind of claim is this?',['A claim about every gold object','A claim about one circle','A claim about no squares'],'A claim about every gold object','The word every includes all objects meeting the color condition.'),
    predict:q('If the claim were true, could a gold square exist?',['No','Yes','Only on Tuesdays'],'No','A gold square would be an exception.'),
    test:q('Which object tests the claim most directly?',['The gold square','Another gold circle','A teal circle'],'The gold square','It meets the gold condition but fails the circle claim.'),
    reveal:'The gold square is a counterexample: it is gold and is not a circle.',
    revise:q('What is justified now?',['The every-claim is false','No gold circles exist','All sellers are wrong'],'The every-claim is false','Reject the claim contradicted by evidence, without inventing broader conclusions.'),
  };
  if (id === 'CD-01' || id === 'CD-02') return { ...base, title:id==='CD-01'?'Observation is not certainty':'Check a chance claim', tokens:undefined,
    evidence:'A bag holds four circle tokens and one square token. After each draw, the token is put back and the bag is mixed. The last three draws were circles.',
    compare:'Compare what is in the bag with what was drawn. Putting the token back keeps both shapes available.',
    describe:q('What is established about the last three draws?',['All three were circles','The bag has no squares','A square must come next'],'All three were circles','A record describes what happened; it does not remove possibilities from the bag.'),
    predict:q('What can the next draw be?',['A circle or a square','Only a circle','A square must come next'],'A circle or a square','Both shapes are still present after replacement.'),
    test:q('How can you check “a square is impossible”?',['Inspect the bag contents','Count only past circles','Wait for luck'],'Inspect the bag contents','A square token in the bag shows that a square draw is possible.'),
    reveal:'Inspection confirms the square token is still in the bag. A circle is more likely on one draw, but neither shape is guaranteed.',
    revise:q('Which claim fits?',['A circle is more likely, not certain','A circle is guaranteed','A square is now due'],'A circle is more likely, not certain','More circle tokens makes a circle more likely. The past streak does not make a square due.'),
  };
  return { ...base, title:'Match the relationship', tokens:undefined,
    evidence:'A key opens a lock. Compare this relationship with a switch turning on a lamp. Match what one thing does to the other.',
    compare:'An analogy compares a relationship, not just the appearance of two objects.',
    describe:q('Which relation is being compared?',['One object operates another','Both are the same shape','Both are always gold'],'One object operates another','Focus on the function connecting the two objects.'),
    predict:q('Which pair has a similar relation?',['Remote and television','Shoe and spoon','Cup and shoe'],'Remote and television','A remote can operate a television.'),
    test:q('How should you check the analogy?',['Explain each pair with the same relation','Match their colors','Count letters in their names'],'Explain each pair with the same relation','A useful comparison preserves the relationship in both settings.'),
    reveal:'A key can operate a lock; a remote can operate a television. The analogy is about function.',
    revise:q('Does the analogy prove that every remote works with every television?',['No; compatibility needs evidence','Yes; all objects operate everything','Yes; the shapes match'],'No; compatibility needs evidence','A shared relation is not a proof of every possible case.'),
  };
}

/** Shuffle response positions without changing the teaching evidence or geometry. */
export function makeRound(id: string, seed: number): BridgeRound {
  const round=buildRound(id,seed); const rng=createRng(seed ^ 0x51a7c);
  const shuffle=(q: Question): Question => ({...q,options:rng.shuffle(q.options)});
  return {...round,describe:shuffle(round.describe),predict:shuffle(round.predict),test:shuffle(round.test),revise:shuffle(round.revise)};
}
