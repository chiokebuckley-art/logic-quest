/** Real life for Stop 12, Proof (id s11). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S11_WORLD: StopWorld = {
  stop: 'Mathematicians and computer scientists use proofs to be sure, not just fairly sure. Every step must follow, so no case is left that could break the claim.',
  lessons: {
    's11.l1': {
      why: 'There are a few trusted ways to prove a claim. Knowing their shapes helps you spot a real proof, and a list of examples that only looks like one.',
      uses: [
        { who: 'You, in math class', kind: 'life', text: 'In math class, you prove facts about shapes and numbers. You join steps in a chain, or you check every case. Then the fact is sure for every shape of that kind.' },
        { who: 'Computer scientists', kind: 'work', text: 'Some computer programs help run trains and planes. Computer scientists write proofs that such a program does the right thing in every case. Testing a few runs would only give examples.' },
        { who: 'Mathematicians', kind: 'work', text: 'Mathematicians sometimes check a claim for a huge number of cases, and it always fits. They still call it a guess until someone finds a proof.' },
      ],
    },
    's11.l2': {
      why: 'A proof is only as strong as its weakest step. Each step must name what it uses, so anyone can check that it follows.',
      uses: [
        { who: 'You, showing your work', kind: 'life', text: 'Your teacher asks you to show your work. Each line should come from the problem or from a line before it. Then anyone can check every step, not just the answer.' },
        { who: 'Bridge engineers', kind: 'work', text: 'Engineers who plan a bridge write down which rule or measurement each step uses. Then another engineer can check every step before anyone builds.' },
        { who: 'Game rule writers', kind: 'work', text: 'People who write rules for board games say what each word means, like what counts as a turn. Then players can settle an argument by pointing to the rules.' },
      ],
    },
    's11.l3': {
      why: 'A proof by cases needs every case the givens leave. One case left out can break the claim, even if every case you checked works.',
      uses: [
        { who: 'You, packing for a trip', kind: 'life', text: 'The forecast says it will be sunny or rainy. You pack a hat for the sun and a coat for the rain. You are ready in both cases, so you are ready for sure.' },
        { who: 'Game testers', kind: 'work', text: 'At a tricky spot in a game, testers try each choice a player can make. A choice no one tried could hide a bug that breaks the game.' },
        { who: 'Electricians', kind: 'work', text: 'A hallway light can have a switch at each end. An electrician tests the light from both switches. A light that works from one switch could still fail from the other.' },
      ],
    },
    's11.l4': {
      why: 'To prove something, you can suppose the opposite and follow it. If that leads to something impossible, the opposite is false, so your claim is true.',
      uses: [
        { who: 'You, looking for a key', kind: 'life', text: 'On Saturday, you can’t find your key. Suppose it is in your backpack, which you left at school on Friday. But you used the key at home this morning, so it can’t be there.' },
        { who: 'Mathematicians', kind: 'work', text: 'Mathematicians show there is no biggest whole number this way. Suppose one number were the biggest. Adding 1 makes a bigger one, which can’t be, so no number is the biggest.' },
        { who: 'Puzzle makers', kind: 'work', text: 'People who make logic puzzles check that each puzzle has one answer. They suppose each wrong answer and follow it until it crashes. If one does not crash, the puzzle needs a fix.' },
      ],
    },
    's11.l5': {
      why: 'One case that breaks an every claim is enough to show it is false. Examples that fit, however many, never prove it.',
      uses: [
        { who: 'You, with a friend', kind: 'life', text: 'A friend says every dog barks at the mail carrier. Your neighbor’s dog just watches quietly. That one dog shows the claim is false.' },
        { who: 'Nature scientists', kind: 'work', text: 'People once said every swan is white, because every swan they had seen was white. Then black swans were found far away. One black swan showed the claim was false.' },
        { who: 'Software testers', kind: 'work', text: 'A tester runs a program many times, and it works each time. That does not prove it always works. One run that fails shows there is a bug to fix.' },
      ],
    },
    's11.l6': {
      why: 'Named rules are moves that always work. Knowing their shapes, you can check a step fast, and spot a step that only sounds like one.',
      uses: [
        { who: 'You, finding your scarf', kind: 'life', text: 'Your scarf is in your backpack or in your coat pocket. You check the backpack, and it is not there. One or the other: it must be in your pocket.' },
        { who: 'Car mechanics', kind: 'work', text: 'If a car battery is dead, the lights will not turn on. A mechanic sees the lights turn on, so the battery is not dead. The THEN part did not happen, so the IF part did not either.' },
        { who: 'Game programmers', kind: 'work', text: 'A game says: if you collect 3 keys, the gate opens. If the gate opens, a new level starts. A programmer joins the two rules with the chain rule: 3 keys start a new level.' },
      ],
    },
    's11.l7': {
      why: 'To prove a claim about every case, show the first case and the step to the next. Checking many cases, one by one, never covers them all.',
      uses: [
        { who: 'You, climbing a ladder', kind: 'life', text: 'You can reach any rung of a ladder if you can reach the first rung, and from each rung you can reach the next one. Those two facts cover every rung.' },
        { who: 'Computer scientists', kind: 'work', text: 'A program can repeat the same steps thousands of times. Computer scientists show the count is right at the start, and each pass keeps it right. Then it is right after every pass.' },
        { who: 'You, counting', kind: 'life', text: 'You can count as high as you like. You know where to start, at 1, and you know how to get from any number to the next. Those two facts reach every number.' },
      ],
    },
  },
  skills: {
    's11.method': [
      'A friend says a trick always works. Ask how they know: a few tries are only examples. A reason that covers every case is a proof.',
    ],
    's11.cite': [
      'A recipe step that says “pour in the sauce” needs the step where you made the sauce. A step with nothing before it leaves the cook stuck.',
      'Building instructions say which parts each step uses, like the two long bars from step 3. Then you can check each step before you go on.',
    ],
    's11.cases': [
      'A coin toss can land heads or tails. If your team has a plan for both, the team is ready for sure. A plan for heads only leaves a gap.',
    ],
    's11.crash': [
      'You think your sister took the last apple. Suppose she did: then she was home at lunch. But she was at practice all day, so that guess crashes.',
    ],
    's11.counter': [
      'Someone says every month has at least 30 days. February has fewer. That one month is enough to show the claim is false.',
      'A store sign says every shirt is on sale. One shirt with a full price tag shows the sign is wrong.',
    ],
    's11.rules': [
      'A pool sign says: if the gate is locked, the pool is closed. The gate is open today. That does not show the pool is open: that is the NOT trick.',
      'A coach says: if you miss practice, you sit out the next game. A player did not sit out, so that player did not miss practice.',
    ],
    's11.induction': [
      'A knitting pattern says each row has as many stitches as the row before. Row 1 has 20 stitches. So every row has 20, however long the scarf gets.',
    ],
    's11.why': [
      'When a friend explains why something must be true, ask what each part rests on. “It just is” is not a reason. A reason names what it uses.',
    ],
  },
};
