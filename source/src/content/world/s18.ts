/** Real life for Stop 2, Arguments (id s18). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S18_WORLD: StopWorld = {
  stop: 'Editors and science teams ask two things about any claim: do its reasons force it, and are those reasons really true?',
  lessons: {
    's18.l1': {
      why: 'Before you agree with an argument, find its claim and its reasons. The claim can come first, so look for words like “so” and “because.”',
      uses: [
        { who: 'You, in a class debate', kind: 'life', text: 'In a debate, you say your claim and then your reasons, like “We need a longer recess, because we focus better after we play.” The judges listen for both parts.' },
        { who: 'Newspaper editors', kind: 'work', text: 'An editor reads a story and marks its main claim. Then she checks that each reason for it is in the story too. A claim with no reasons gets sent back.' },
        { who: 'Science fair judges', kind: 'work', text: 'Science fair judges look for the claim on each poster, like “Plants grow faster with music.” Then they look for the givens: what the student measured. A claim with no givens scores low.' },
      ],
    },
    's18.l2': {
      why: 'A claim follows only when its reasons force it. Picture every way things could be, and look for one that keeps the reasons but breaks the claim.',
      uses: [
        { who: 'You, playing a guessing game', kind: 'life', text: 'Your friend says, “My animal has four legs.” You can’t say it must be a dog. A cat or a horse fits the clue too, so you can’t tell yet.' },
        { who: 'Math teachers', kind: 'work', text: 'A student says a shape with four sides must be a square. The teacher draws a long rectangle. It has four sides but is not a square, so the claim does not follow.' },
        { who: 'Car mechanics', kind: 'work', text: 'A car won’t start. A dead battery fits, but so does an empty gas tank, so “The battery is dead” does not follow. The mechanic checks both.' },
      ],
    },
    's18.l3': {
      why: 'Whether a claim follows depends on the shape of the argument, not on its words. A shape that works with made-up words works with real ones too.',
      uses: [
        { who: 'You, doing word puzzles', kind: 'life', text: 'Some puzzle books use made-up words, like “All bloops are razzies.” You can still solve them. The shape of the clues tells you what must be true.' },
        { who: 'Computer programmers', kind: 'work', text: 'Programmers write their steps with stand-in names, like X and Y, instead of real data. If the steps work for any X and Y, they work for real names and prices too.' },
        { who: 'Mathematicians', kind: 'work', text: 'Mathematicians prove things with letters in place of numbers. The letters are like made-up words. Once the steps work for the letters, they work for every number.' },
      ],
    },
    's18.l4': {
      why: 'An argument can follow and still be wrong, if a reason is false. A solid argument needs a shape that works and reasons that are really true.',
      uses: [
        { who: 'You, at a sleepover', kind: 'life', text: 'Your friend says, “Everyone in my class has seen this movie, and you are in my class, so you have seen it.” The shape works. But you have not seen it, so her first reason was false.' },
        { who: 'Lab scientists', kind: 'work', text: 'A science team’s steps can be perfect. But if they used the wrong amount of salt, their result is still wrong. So they check their starting numbers as well as each step.' },
        { who: 'Map makers', kind: 'work', text: 'A map maker reasons that a ten-mile trail takes five hours at two miles an hour. The math works. But if the trail is really twelve miles, the claim is wrong.' },
      ],
    },
  },
  skills: {
    // s18.l1 Givens and the claim
    's18.given': [
      'When a friend gives reasons for a plan, list them. “It is sunny” and “The park is open” are the givens for “We should go to the park.”',
      'A coach says, “Since we have more players this year, we need two teams.” Having more players is the given.',
    ],
    's18.claim': [
      'A poster says, “Our town needs a new library. The old one is too small.” The claim comes first: the town needs a new library.',
      'Your sister says, “Dad must be home. His car is in the driveway.” The word “must” shows the claim, and the car is the given.',
    ],
    // s18.l2 Does it follow?
    's18.follows': [
      'Every kid on the bus got a field trip form, and Sam rode the bus. So Sam must have gotten a form. Whether Sam signed it, you can’t tell.',
      'A sign says every ride needs a ticket. A kid on a ride must have a ticket. But a kid with a ticket might not ride at all.',
    ],
    // s18.l3 Follows, even when silly
    's18.form': [
      'A riddle says, “All snorks are green. Zuzu is a snork.” Even with a made-up word, you know Zuzu is green.',
      'A rule like “Every player with a pass can enter” works the same for any player. The shape does the work, whoever has the pass.',
    ],
    // s18.l4 Solid arguments
    's18.sound': [
      'A label says a jar holds 100 marbles, so you plan ten bags of ten. Your math is fine, but if the label is wrong, your plan is too.',
      'A friend says every store on Main Street is open on Sunday, and the toy store is on Main Street. So it must be open. Check that first reason before you go.',
    ],
    's18.why': [
      'When someone says, “It is true, so my reasons must be good,” ask if the reasons force the claim. A true claim can still have weak reasons.',
      'Teachers ask you to show your work, not just the answer. A right answer with broken steps does not show why it is right.',
    ],
  },
};
