import { createRng } from '../../engine/rng';

/**
 * The one thinking routine, shared by the Pattern Lab bridges, the Workshop and the Pattern Observatory (the order of
 * the Observatory handoff, adopted for the bridges with the owner's OK in v0.10.0). A bridge round walks it in order:
 * Notice the evidence; Describe (a question); Compare (a line); Test (how to check); Predict (commit before the
 * result shows); Explain (what the evidence supports).
 */
export const ROUTINE = ['Notice', 'Describe', 'Compare', 'Test', 'Predict', 'Explain'] as const;
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
  { name: 'Trickster Market', art: 'trickster-market', stop: 's12', events: ['TM-01','TM-02'], purpose: 'Look for a counterexample. Test rival claims.', paths: ['Logician'] },
  { name: 'Chance Dock', art: 'chance-dock', stop: 's13', events: ['CD-01','CD-02'], purpose: 'Separate an observation from a guaranteed result.', paths: ['Logician'] },
] as const;

export interface Token { shape: 'circle' | 'square' | 'triangle'; color: 'teal' | 'gold'; striped?: boolean; label?: string }
export interface Question { prompt: string; options: string[]; answer: string; why: string }
export interface BridgeRound { id: string; title: string; evidence: string; tokens?: Token[]; compare: string; describe: Question; predict: Question; test: Question; reveal: string; explain: Question }
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
    explain: q('Which statement fits the evidence?', ['Same shape; color may differ','All objects are the same color','Nothing can be compared'],'Same shape; color may differ','Keep the feature that the evidence supports. Do not add a color rule.'),
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
      explain: q('What should your explanation include?',and?['Both required features','Only one feature','Every object belongs']:['Only the required shape','A new color restriction','Every object belongs'],and?'Both required features':'Only the required shape','Explain membership using the rule that was actually stated.'),
    };
  }
  if (id === 'workshop-repeat' || id === 'LC-01') return repeatRound(base, rng, shape, other, color, opposite);
  if (id === 'LC-02') return { ...base, title: 'Use order evidence', tokens: undefined,
    evidence: 'Ava is before Ben. Ben is before Cal. “Before” means earlier in the line, not necessarily next to.', compare: 'Trace the direction of each clue. Do not assume two people are next to each other.',
    describe:q('What must follow?',['Ava is before Cal','Cal is before Ava','Ava is next to Cal'],'Ava is before Cal','The two before-clues form a chain.'),
    predict:q('Can someone else stand between Ava and Ben?',['Yes','No','Only if Cal leaves'],'Yes','Before does not say immediately before.'),
    test:q('Which line obeys both clues?',['Ava, Dee, Ben, Cal','Ben, Ava, Cal, Dee','Cal, Ben, Ava, Dee'],'Ava, Dee, Ben, Cal','Ava still comes before Ben, and Ben before Cal.'),
    reveal:'Dee can fit between Ava and Ben without breaking either clue.',
    explain:q('Which word would force adjacency?',['Immediately before','Before','Somewhere before'],'Immediately before','Immediately before leaves no person in between.'),
  };
  if (id === 'FM-01' || id === 'workshop-uncertain') return { ...base, title: 'Another case can help', tokens: undefined,
    evidence:'Two cards have been seen: a striped circle and a striped square. Both were accepted. Plain cards have not been tested.',
    compare:'Both “accept every card” and “accept striped cards only” fit the two observations. Keep both possible.',
    describe:q('What do the two accepted cards establish?',['Striped cards can be accepted','Every plain card is accepted','Plain cards are rejected'],'Striped cards can be accepted','The two observations do not show what happens to a plain card.'),
    predict:q('Will a plain triangle be accepted?',['Must be accepted','Must be rejected','Need more information'],'Need more information','The competing rules make different predictions about plain cards.'),
    test:q('Which test helps distinguish these rules?',['Try a plain triangle','Try another striped circle','Repeat the striped square'],'Try a plain triangle','A new striped card fits both rules. A plain card separates their predictions.'),
    reveal:'The plain triangle is rejected. Of the two stated rules, only “striped cards only” still fits.',
    explain:q('What should you say now?',['The striped-only rule fits these tests','This proves every future card forever','The first two observations were useless'],'The striped-only rule fits these tests','Revise your rule using the new case, while keeping the claim limited to tested evidence.'),
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
      explain:q('Which of the two stated candidates survives this test?',['A: add 2','B: double','Both candidates'],hidden==='add'?'A: add 2':'B: double','Keep the candidate matching the new result. This does not prove it is the only possible rule in the world.'),
    };
  }
  if (id === 'TM-01') return { ...base, title:'Find a counterexample', tokens:undefined,
    evidence:'A seller claims: “Every gold object is a circle.” The display includes a gold circle and a gold square.', compare:'“Every” means there can be no exceptions. One gold object with another shape can defeat this claim.',
    describe:q('What kind of claim is this?',['A claim about every gold object','A claim about one circle','A claim about no squares'],'A claim about every gold object','The word every includes all objects meeting the color condition.'),
    predict:q('If the claim were true, could a gold square exist?',['No','Yes','Only on Tuesdays'],'No','A gold square would be an exception.'),
    test:q('Which object tests the claim most directly?',['The gold square','Another gold circle','A teal circle'],'The gold square','It meets the gold condition but fails the circle claim.'),
    reveal:'The gold square is a counterexample: it is gold and is not a circle.',
    explain:q('What is justified now?',['The every-claim is false','No gold circles exist','All sellers are wrong'],'The every-claim is false','Reject the claim contradicted by evidence, without inventing broader conclusions.'),
  };
  if (id === 'CD-01' || id === 'CD-02') return { ...base, title:id==='CD-01'?'Observation is not certainty':'Check a chance claim', tokens:undefined,
    evidence:'A bag holds four circle tokens and one square token. After each draw, the token is put back and the bag is mixed. The last three draws were circles.',
    compare:'Compare what is in the bag with what was drawn. Putting the token back keeps both shapes available.',
    describe:q('What is established about the last three draws?',['All three were circles','The bag has no squares','A square must come next'],'All three were circles','A record describes what happened; it does not remove possibilities from the bag.'),
    predict:q('What can the next draw be?',['A circle or a square','Only a circle','A square must come next'],'A circle or a square','Both shapes are still present after replacement.'),
    test:q('How can you check “a square is impossible”?',['Inspect the bag contents','Count only past circles','Wait for luck'],'Inspect the bag contents','A square token in the bag shows that a square draw is possible.'),
    reveal:'Inspection confirms the square token is still in the bag. A circle is more likely on one draw, but neither shape is guaranteed.',
    explain:q('Which claim fits?',['A circle is more likely, not certain','A circle is guaranteed','A square is now due'],'A circle is more likely, not certain','More circle tokens makes a circle more likely. The past streak does not make a square due.'),
  };
  if (id === 'TI-01') return twinIslesRound(base, rng);
  return { ...base, title:'Match the relationship', tokens:undefined,
    evidence:'A key opens a lock. Compare this relationship with a switch turning on a lamp. Match what one thing does to the other.',
    compare:'An analogy compares a relationship, not just the appearance of two objects.',
    describe:q('Which relation is being compared?',['One object operates another','Both are the same shape','Both are always gold'],'One object operates another','Focus on the function connecting the two objects.'),
    predict:q('Which pair has a similar relation?',['Remote and television','Shoe and spoon','Cup and shoe'],'Remote and television','A remote can operate a television.'),
    test:q('How should you check the analogy?',['Explain each pair with the same relation','Match their colors','Count letters in their names'],'Explain each pair with the same relation','A useful comparison preserves the relationship in both settings.'),
    reveal:'A key can operate a lock; a remote can operate a television. The analogy is about function.',
    explain:q('Does the analogy prove that every remote works with every television?',['No; compatibility needs evidence','Yes; all objects operate everything','Yes; the shapes match'],'No; compatibility needs evidence','A shared relation is not a proof of every possible case.'),
  };
}

const WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const SOUNDS = ['Clap','tap','stomp'];
/** A block in claps, from its structure: "ABB" twice is "Clap, tap, tap, clap, tap, tap". */
const inClaps = (st: string, times: number) => Array.from({ length: times }, () => [...st]).flat().map((c, i) => (i === 0 ? SOUNDS[c.charCodeAt(0) - 65] : SOUNDS[c.charCodeAt(0) - 65].toLowerCase())).join(', ');

/**
 * Ladder Cliffs LC-01 and the Workshop's repeat round: a conveyor made by repeating a block of two or three objects
 * (AB, ABB or ABC). The unit, the next object and the matching clap pattern are computed from the block.
 */
function repeatRound(base: BridgeRound, rng: ReturnType<typeof createRng>, shape: Token['shape'], other: Token['shape'], color: Token['color'], opposite: Token['color']): BridgeRound {
  const third = (['circle','square','triangle'] as const).find(x => x !== shape && x !== other)!;
  const pieces: Token[] = [{shape,color,label:`${color} ${shape}`},{shape:other,color:opposite,label:`${opposite} ${other}`},{shape:third,color,label:`${color} ${third}`}];
  const st = rng.pick(['AB','ABB','ABC'] as const);
  const unit = [...st].map(c => c.charCodeAt(0) - 65);
  const k = unit.length;
  const n = rng.pick(k === 2 ? [6,7] : [6,7,8]);
  const tokens = Array.from({ length: n }, (_, i) => pieces[unit[i % k]]);
  const next = pieces[unit[n % k]];
  const unitText = unit.map(u => pieces[u].label).join(', ');
  const used = [...new Set(unit)].map(u => pieces[u].label!);
  const sizes = k === 2 ? { right: 'First two objects', long: 'First four objects', short: 'One object', shortWhy: 'one object does not rebuild the alternation' } : { right: 'First three objects', long: 'First six objects', short: 'First two objects', shortWhy: 'the first two objects do not rebuild the order' };
  const others = (k === 2 ? ['AABB'] : ['AB', st === 'ABB' ? 'AAB' : 'ABB']);
  const claps = (x: string) => inClaps(x, x.length === 2 ? 2 : x.length === 4 ? 1 : 2);
  return { ...base, title: 'Find the smallest repeat', evidence: 'This conveyor repeats a block in the same order. Read from left to right.', tokens,
    compare: 'Compare each block with the next block. A repeat unit is the shortest block that can build the whole shown sequence.',
    describe: q('What is the smallest repeat unit?',[sizes.right,sizes.long,sizes.short],sizes.right,`The first ${WORDS[k]} objects (${unitText}) repeat. The ${sizes.long.toLowerCase()} also work but are not the smallest block; ${sizes.shortWhy}.`),
    predict: q('Which object comes next if this repeat rule continues?',[...used,'Need more information'],next.label!,`Position ${n + 1} is object ${(n % k) + 1} of the block ${unitText}.`),
    test: q('How do you test a proposed repeat unit?',['Copy it and compare every position','Look at only the first object','Choose the longest block'],'Copy it and compare every position','The copied block must reproduce every shown position.'),
    reveal: `Copying the first ${WORDS[k]} objects again and again reproduces all ${WORDS[n]} positions.`,
    explain: q('How could the same rule work with actions?',[claps(st),...(k === 2 ? [claps('AABB'),'Only clap'] : others.map(claps))],claps(st),'Different objects or actions can share the same repeating relationship.'),
  };
}

/** Twin Isles TI-01: one relation shown in two settings ("a key opens a lock", "a password opens an account"). */
const RELATIONS: readonly { rel: string; pairs: readonly (readonly [string, string])[] }[] = [
  { rel: 'opens', pairs: [['key','lock'],['password','account'],['ticket','gate']] },
  { rel: 'measures', pairs: [['ruler','length'],['clock','time'],['scale','weight']] },
  { rel: 'protects', pairs: [['helmet','head'],['shell','turtle'],['case','phone']] },
];
const the = (w: string) => `the ${w}`;
function twinIslesRound(base: BridgeRound, rng: ReturnType<typeof createRng>): BridgeRound {
  const { rel, pairs } = rng.pick(RELATIONS);
  const [[a1,b1],[a2,b2],[a3,b3]] = rng.shuffle(pairs);
  return { ...base, title: 'Same relation, two settings', tokens: undefined,
    evidence: `First island: ${the(a1)} ${rel} ${the(b1)}. Second island: ${the(a2)} ${rel} ${the(b2)}. Look at what each first thing does to the second.`,
    compare: `Compare the relation, not the objects. A ${a1} and a ${a2} look nothing alike, but each one ${rel} something.`,
    describe: q('What relation do both islands share?',[`The first thing ${rel} the second`,'Both pairs look alike','Both pairs are the same size'],`The first thing ${rel} the second`,`In both settings, one thing ${rel} the other. The objects differ; the relation stays.`),
    predict: q(`On the second island, what plays the part of ${the(a1)}?`,[a2,b2,'Nothing does'],a2,`The ${a2} ${rel} the ${b2}, just as the ${a1} ${rel} the ${b1}.`),
    test: q('How can you check that the two relations match?',['Say both pairs with the same verb','Compare their colors','Count the letters in each name'],'Say both pairs with the same verb',`If “${rel}” fits both sentences in the same order, the relation carries across.`),
    reveal: `Both sentences use “${rel}”: ${the(a1)} ${rel} ${the(b1)}, and ${the(a2)} ${rel} ${the(b2)}.`,
    explain: q(`A third island has ${the(a3)} and ${the(b3)}. Which sentence keeps the same relation?`,[`The ${a3} ${rel} the ${b3}`,`The ${b3} ${rel} the ${a3}`,`The ${a3} looks like the ${b3}`],`The ${a3} ${rel} the ${b3}`,'Keep the order: the first thing acts on the second. Reversing the pair breaks the relation.'),
  };
}

/** Shuffle response positions without changing the teaching evidence or geometry. */
export function makeRound(id: string, seed: number): BridgeRound {
  const round=buildRound(id,seed); const rng=createRng(seed ^ 0x51a7c);
  const shuffle=(q: Question): Question => ({...q,options:rng.shuffle(q.options)});
  return {...round,describe:shuffle(round.describe),predict:shuffle(round.predict),test:shuffle(round.test),explain:shuffle(round.explain)};
}
