/** Real life for Stop 5, Knights & Knaves. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S5_WORLD: StopWorld = {
  stop: 'Math experts, map makers and computer programs test a guess by supposing it is true. If following it step by step breaks a rule, the guess must be wrong.',
  lessons: {
    's5.l1': {
      why: 'If a source always tells the truth, its words give you the facts. If it is always wrong, flip its words, and watch out for “not.”',
      uses: [
        { who: 'You, checking a quiz', kind: 'life', text: 'Your friend got every answer wrong on a true-or-false quiz. Flip each answer, and you have them all right. If he marked “A bat is not a mammal” as true, then a bat is a mammal.' },
        { who: 'Engineers', kind: 'work', text: 'Many gadgets have buttons that send “off” while pressed and “on” when let go. Engineers know this signal always says the opposite. So their code flips it to tell when a button is pressed.' },
        { who: 'Librarians', kind: 'work', text: 'A student finds a claim on an unknown website. If the site is truthful, the claim is true, but if not, it could be false. She can’t tell, so a librarian helps her check it in a trusted book.' },
      ],
    },
    's5.l2': {
      why: 'Before you trust some words, ask who could say them. If an honest source and a liar could both say them, the words alone prove nothing.',
      uses: [
        { who: 'You, playing the quiet game', kind: 'life', text: 'In the quiet game, a friend calls out, “I’m not talking!” Said out loud, those words are false every time. So someone who always tells the truth could never say them.' },
        { who: 'You, online', kind: 'life', text: 'A pop-up says, “This is safe to click.” A safe pop-up could say that, and so could a tricky one. So the words prove nothing: ask a grown-up first.' },
        { who: 'Scientists', kind: 'work', text: 'Some scientists study hand washing. When asked if they wash their hands, people who do say yes, but many who don’t say yes too. That answer can’t tell them apart, so the scientists watch instead.' },
      ],
    },
    's5.l3': {
      why: 'Some answers you can only find by thinking. Suppose a guess is true and follow it: if it leads to something impossible, it crashes, so the other choice is right.',
      uses: [
        { who: 'You, looking at the moon', kind: 'life', text: 'Does the moon make its own light, or use the sun’s? Suppose it glowed like a lamp: you would always see a full circle. But the shape changes night to night, so that guess crashes: the sun lights it.' },
        { who: 'Mathematicians', kind: 'work', text: 'To show there is no biggest number, mathematicians suppose there is one. Then they add 1 to it and get a bigger number. That crashes the guess, so there can’t be a biggest number.' },
        { who: 'Map makers', kind: 'work', text: 'A map maker isn’t sure which way a stream flows, so she supposes it flows north. But the north end is higher, and water can’t run uphill. That guess crashes, so the stream flows south.' },
      ],
    },
    's5.l4': {
      why: 'A bigger problem doesn’t need a new plan: suppose, follow and check. Start with the clue that tells the most, and remember that “us” counts the speaker.',
      uses: [
        { who: 'You, in a group chat', kind: 'life', text: 'Your friend texts the group, “Exactly one of us is bringing a ball.” Her “us” counts her too. So if she is bringing one, nobody else is.' },
        { who: 'You, in science class', kind: 'life', text: 'Three cups hold salt, sugar and baking soda, with no labels. Start with the strongest clue: only baking soda fizzes in vinegar. Find that cup first, and just two choices are left for the others.' },
        { who: 'Chip engineers', kind: 'work', text: 'A computer chip has a huge number of tiny switches. To find mistakes, engineers use a program that supposes one switch is on and works out what that means. If a rule breaks, it tries that switch off.' },
      ],
    },
    's5.l5': {
      why: 'A false “and” means at least one part is false, maybe just one, so check each part. A false “or” means both parts are false, so rule out both.',
      uses: [
        { who: 'You, at home', kind: 'life', text: 'Your brother’s note says, “I fed the fish and watered the plants.” If the note is wrong, at least one job was missed, maybe just one. So check each one before redoing anything: too much food is bad for fish.' },
        { who: 'Nurses', kind: 'work', text: 'Before a check-up, a nurse asks, “Has your child had a fever or a cough this week?” The parent says no. That rules out both: no fever and no cough.' },
        { who: 'Weather forecasters', kind: 'work', text: 'The forecast “Sunny and warm” turned out to be false. So at least one part was false, maybe just one: it could have been sunny but cold. Forecasters check each part to see which one they got wrong.' },
      ],
    },
  },
  skills: {
    // s5.l1 Truth-tellers and liars
    's5.words': [
      'On Opposite Day, everything people say means the opposite. If your sister says, “I do not want a turn,” she really does want one. The truth is her words without the “not.”',
      'A science museum sign says, “Myth: The North Star is the brightest star at night.” A myth is a false belief, so flip it: the North Star is not the brightest. Many stars look brighter.',
    ],
    // s5.l2 What nobody can say
    's5.cant-say': [
      'A note on the fridge says, “Mom wrote this.” Mom could write that, and so could your brother as a joke. So the note alone can’t tell you who wrote it.',
      'After counting for hide-and-seek, your friend says, “I didn’t peek.” A friend who didn’t peek could say that, and so could one who did. So the words alone can’t tell you.',
    ],
    // s5.l3 Suppose it, then crash-test it
    's5.suppose': [
      'Why can’t you divide 6 by 0? Suppose the answer is some number: then that number times 0 would be 6. But any number times 0 is 0, so the guess crashes.',
      'In your soccer league, a win earns 3 points, and your team is 7 points behind with 2 games left. Suppose you can catch up. Two wins add only 6, so the guess crashes.',
    ],
    's5.two': [
      'Your water bottle matches a teammate’s. Suppose the left one is yours, so the right is hers. You drank half of yours, so if the left one is full, that crashes: the right is yours.',
      'Suppose the top switch runs the porch light, so the bottom one runs the hall light. Flip the bottom one. If the porch light comes on, the guess crashes: top runs the hall light.',
    ],
    // s5.l4 Three islanders
    's5.three': [
      'A team captain says, “At least one of us has never played on this field.” Her “us” counts her too. If she has played here before, then at least one teammate has not.',
      'Your cousin set one of three clocks wrong: two say 3:00, one says 3:20. Suppose a 3:00 clock is wrong: the other two are right, but don’t match. That crashes: the 3:20 one is wrong.',
    ],
    // s5.l5 A knave’s “and” and “or”
    's5.and-or': [
      'Your friend says, “Whales are mammals and breathe with gills.” That is false, but only one part is: whales are mammals, and they breathe air. One false part makes an “and” false.',
      'Your sister says, “The cat is under the bed or in the closet.” She is wrong, so the cat is in neither spot. Look somewhere else!',
    ],
  },
};
