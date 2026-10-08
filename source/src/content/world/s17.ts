/** Real life for Stop 17, Proof Lantern (the Pattern Observatory, Ring 4). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S17_WORLD: StopWorld = {
  stop: 'Scientists and engineers call a pattern a good guess until a reason covers every case. One case that breaks a claim is enough to show it is false.',
  lessons: {
    's17.l1': {
      why: 'Examples that fit make a good guess, not a proof. A claim is proved only when a reason covers every case.',
      uses: [
        { who: 'Scientists testing medicines', kind: 'work', text: 'A new medicine that helped a few people is a good guess, not a proof. Scientists test it on many more people, in the same way, before anyone calls it safe and helpful.' },
        { who: 'You, timing your run', kind: 'life', text: 'Your run to the park got faster three days in a row. That is a good start, not a proof. Keep timing the same route before you say you are faster for good.' },
        { who: 'Bridge engineers', kind: 'work', text: 'A bridge that stood through a few storms is not proof that it is safe. Engineers use math that covers every load the bridge was built to carry.' },
      ],
    },
    's17.l2': {
      why: 'One case that breaks a claim shows it is false, however many cases fit. A good test is one where two ideas predict different results.',
      uses: [
        { who: 'You, at a game night', kind: 'life', text: 'A friend says the first player always wins this game. One game where the second player wins shows the claim is false, however many games the first player won.' },
        { who: 'Car mechanics', kind: 'work', text: 'A car makes a noise: maybe a worn belt, maybe a loose cover. A mechanic changes just the belt and listens again. If the noise stops, the belt was the reason.' },
        { who: 'Scientists who study birds', kind: 'work', text: 'People once believed every swan is white. Then explorers found black swans. One black swan was enough to show the claim was false.' },
      ],
    },
    's17.l3': {
      why: 'A list of examples shows what happened so far. A stated rule, with a reason for each step, tells you what must happen next.',
      uses: [
        { who: 'Computer programmers', kind: 'work', text: 'A loop in a program repeats the same step. Programmers check what one step does, and that it happens every time. Then they know the loop works for every pass, not just the ones they tried.' },
        { who: 'You, with a light switch', kind: 'life', text: 'Each flip of a switch turns the light from off to on, or back. After an odd number of flips from off, it must be on. You don’t need to flip it to know.' },
        { who: 'Ferry crews', kind: 'work', text: 'A ferry crosses the river on each trip, so it switches sides every time. After an even number of trips, it is back where it started. The crew can plan without counting each trip.' },
      ],
    },
  },
  skills: {
    // s17.l1 Proved or a guess?
    's17.why-guess': ['A video got more views each day this week. Guessing it will keep growing is fine, but no rule makes it grow forever. The views could stop any day.'],
    's17.proof-status': ['A coach notices the team scored more in three rainy games. That is a good guess at best. A rule that always works needs a reason, not just a few games.'],
    's17.circle-max': ['Math students meet this puzzle: 1, 2, 4, 8 and 16 regions, then 31. It shows why people check a pattern with a drawing or a reason before they trust it.'],
    's17.independence': ['A quiz game picks a topic at random each time. A topic that has not come up for a while is not due. Each pick is new.'],
    's17.more-evidence': ['A shop tries a new sign and sells more for three days. Before keeping it, the owner checks more weeks, the same days of the week, and other reasons, like a sale nearby.'],
    // s17.l2 Break it or test it
    's17.why-counter': ['Gardeners know that one yellow tomato breaks the claim that every tomato is red. No number of red tomatoes can save that claim.'],
    's17.counterexample': ['To test “every bird can fly,” look for a bird that can’t. A penguin is a bird that can’t fly, so the claim is false.'],
    's17.separate': ['Two friends disagree on why a phone won’t charge: the cable or the plug. A new cable in the same plug tells them apart. Changing both at once does not.'],
    's17.rule-out': ['A shop says every shirt on one rack is on sale. One shirt on that rack at full price rules the claim out. A full price shirt on another rack does not.'],
    // s17.l3 Why it must continue
    's17.why-continue': ['The same weekday comes back every 7 days, because each week adds 7 days. That reason, not a list of past weeks, tells you the weekday 70 days from now.'],
    's17.parity-step': ['In many theaters, seat numbers are odd on one side and even on the other. Each seat number on a side goes up by 2, so odd stays odd all along the row.'],
    's17.reason-chain': ['A math teacher checks a proof step by step: where it starts, the step that repeats, and why it comes every time. A missing step means it is not a proof yet.'],
    's17.must-continue': ['On many streets, houses on one side have odd numbers and the other side has even ones. Each number on a side goes up by 2, so a side never switches.'],
    's17.jumps': ['A fence with 10 posts has 9 gaps between them. Builders count the gaps, not the posts, to know how many boards to cut.'],
  },
};
