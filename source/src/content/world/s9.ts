/** Real life for Stop 9, Truth Tables (shown as Stop 10). See types.ts and docs/CONTENT_GUIDE.md, “Real life”. */
import type { StopWorld } from './types';

export const S9_WORLD: StopWorld = {
  stop: 'A truth table lists every case. Programmers use one to check that a short rule in their code means the same as a long one.',
  lessons: {
    's9.l1': {
      why: 'A truth table lists every case, each one once. A plan that skips a case can fail in exactly that case.',
      uses: [
        { who: 'You, packing for a trip', kind: 'life', text: 'Rain or no rain, cold or warm: that makes four cases. Picture each one before you pack. Then no weather can catch you without the right clothes.' },
        { who: 'Game testers', kind: 'work', text: 'A game can have its sound on or off, on a small screen or a big one. Testers list all four cases and try each one once, so none is missed.' },
        { who: 'Chefs', kind: 'work', text: 'A guest may or may not eat nuts, and may or may not eat milk. That makes four cases. A chef plans a safe dish for each one.' },
      ],
    },
    's9.l2': {
      why: 'Fill a table one row at a time. AND needs both parts, OR needs at least one, and NOT flips each answer.',
      uses: [
        { who: 'You, searching the library', kind: 'life', text: 'In many library searches, “dogs AND cats” finds books about both. “Dogs OR cats” finds more books: any book with either word, or both.' },
        { who: 'Ride workers', kind: 'work', text: 'A ride sign says riders must be tall enough AND wear the belt. Workers check both parts. If either part is false, the rider waits.' },
        { who: 'Online shop builders', kind: 'work', text: 'A shop page can show only shirts that are small OR medium. The builders check each case, so a shirt in both sizes still shows up.' },
      ],
    },
    's9.l3': {
      why: 'An IF rule is broken only when the IF part happens and the THEN part does not. When the IF part does not happen, nothing breaks it.',
      uses: [
        { who: 'You, with a house rule', kind: 'life', text: '“IF you go outside, THEN wear your boots.” On a day you stay in, you break nothing, boots or not. Only going out without boots breaks it.' },
        { who: 'Night light makers', kind: 'work', text: 'The rule is: IF the room is dark, THEN the night light is on. In daylight the rule asks for nothing, light on or off. Only a dark room with the light off means it failed.' },
        { who: 'Swim coaches', kind: 'work', text: '“IF a swimmer is in the deep end, THEN they wear a band.” A swimmer in the shallow end without a band is fine. Only a swimmer in the deep end with no band breaks it.' },
      ],
    },
    's9.l4': {
      why: 'Two rules mean the same only when they agree in every case. Agreeing in some cases is not enough.',
      uses: [
        { who: 'Programmers', kind: 'work', text: 'A programmer wants to swap a long rule for a short one. She makes a truth table for both. If the columns match in every row, the swap is safe.' },
        { who: 'You, reading club rules', kind: 'life', text: 'A rule says “not both juice and a snack.” That is not the same as “no juice and no snack.” Under the first rule, you can still have just a snack.' },
        { who: 'Chip designers', kind: 'work', text: 'Chip designers check that a smaller circuit gives the same answer as a bigger one in every case. If even one case differs, they can’t swap it in.' },
      ],
    },
    's9.l5': {
      why: 'A sentence true in every row can’t be wrong, but it tells you nothing new. One that is never true can never happen.',
      uses: [
        { who: 'You, hearing a guess', kind: 'life', text: '“Tomorrow it will snow, or it will not snow” is always true. It can’t be wrong, but it tells you nothing about tomorrow.' },
        { who: 'Puzzle makers', kind: 'work', text: 'A puzzle maker checks that the clues can all be true together. If every case breaks some clue, the clues are never true at once, and no answer fits.' },
        { who: 'Software testers', kind: 'work', text: 'A check in a program that is always true can never catch a mistake. Testers look for checks like that and fix them, so each check can really fail.' },
      ],
    },
  },
  skills: {
    's9.rows': [
      'A hall light can have two switches, each up or down. That makes four cases, and an electrician tests the light in all four.',
      'A coach plans for sun or rain, at home or away. That is four cases, so she makes four plans, one for each.',
    ],
    's9.fill': [
      'A door opens with a key card OR a code. Someone with both still gets in, because OR includes both.',
      'A recipe step says to add salt AND pepper. If either one is missing, the step is not done.',
    ],
    's9.if-table': [
      'A library rule says: IF you borrow a book, THEN return it in two weeks. Someone who borrowed nothing breaks no rule.',
      'A sign says: IF the light is red, THEN wait. When the light is green, the sign asks for nothing.',
    ],
    's9.same': [
      '“Not both” and “neither” sound close, but they differ. A case where only one thing happens tells them apart.',
      'Two ways of writing a game rule mean the same only if every move gives the same result under both.',
    ],
    's9.always': [
      '“The team will win, or it will not win” is always true. A real forecast could turn out wrong, and that is what makes it useful.',
      'A plan that needs a light to be on and off at once can never work. Spotting that early saves time.',
    ],
  },
};
