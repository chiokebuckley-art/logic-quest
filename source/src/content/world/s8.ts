/** Real life for Stop 9, All, Some, None (id s8). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S8_WORLD: StopWorld = {
  stop: 'Cooks, librarians and testers sort things into groups. Words like “all,” “some” and “none” say how the groups meet, and one case can break an “all.”',
  lessons: {
    's8.l1': {
      why: 'A thing can belong to two groups at once. Check each feature on its own, and a thing with both goes in both groups.',
      uses: [
        { who: 'You, planning a party', kind: 'life', text: 'You list friends from soccer and friends from art class. One friend is on both lists. Count that friend once, or you will buy one snack too many.' },
        { who: 'Librarians', kind: 'work', text: 'A book can be about animals and also about space. Librarians tag it with both topics. Then it shows up when someone looks for either one.' },
        { who: 'Cooks', kind: 'work', text: 'A menu marks the dishes with no meat and the dishes with no nuts. For a guest who needs both, a cook picks only from dishes in both groups.' },
      ],
    },
    's8.l2': {
      why: '“All” has no exceptions, “some” means at least one, and “none” means not even one. In logic, “some” stays true even when all of them fit.',
      uses: [
        { who: 'You, reading game rules', kind: 'life', text: 'A game rule says, “Some cards let you skip a turn.” That means at least one card does, and maybe every card does.' },
        { who: 'Food inspectors', kind: 'work', text: 'A label that says “No nuts” must be true for every bite. If an inspector finds even one nut, the label is false and must change.' },
        { who: 'Teachers', kind: 'work', text: 'A teacher checks if all the homework is in. If one paper is missing, “All the homework is in” is false. The teacher checks every name, not just most.' },
      ],
    },
    's8.l3': {
      why: 'To show an “all” sentence is false, you need just one case that does not fit. That is not the same as showing that none fit.',
      uses: [
        { who: 'You, at a fair', kind: 'life', text: 'A sign says, “Not all rides are open today.” That does not mean every ride is closed. At least one is closed, and the rest may be running.' },
        { who: 'Delivery drivers', kind: 'work', text: 'A driver is told that every box in the van goes to one street. Then the driver finds a box for a different street. That one box shows the claim is false.' },
        { who: 'Software testers', kind: 'work', text: 'A team says every button in their app works. A tester tries them all. If one button does nothing, that one case shows the claim is false.' },
      ],
    },
    's8.l4': {
      why: 'An “all” sentence about nothing has nothing to break it, so it is true. A “some” sentence about nothing is false, because nothing makes it true.',
      uses: [
        { who: 'You, cleaning your room', kind: 'life', text: 'A grown-up says, “Put away all the toys on the floor.” If no toys are on the floor, the job is already done. Nothing breaks the rule.' },
        { who: 'Computer programmers', kind: 'work', text: 'A program checks if all the things in a shopping cart are on sale. If the cart is empty, it says yes. Programmers plan for that case on purpose.' },
        { who: 'Store clerks', kind: 'work', text: 'A clerk is asked, “Are some of the blue shirts in size small?” If no blue shirts are left at all, the answer is no. No shirt is there to make it true.' },
      ],
    },
    's8.l5': {
      why: 'A claim follows only when it is true in every picture the givens allow. True in one picture is not enough.',
      uses: [
        { who: 'You, playing a card game', kind: 'life', text: 'Every dragon card is a fire card. Every fire card can be played on your first turn. So every dragon card can be played then, and you do not need to check each one.' },
        { who: 'Zookeepers', kind: 'work', text: 'All the lizards live in the warm house. Every animal in the warm house gets a heat lamp. So a keeper knows every lizard gets a heat lamp.' },
        { who: 'Science fair judges', kind: 'work', text: 'Every winning project had a chart. Every project in Room 2 had a chart too. A judge knows that does not show every Room 2 project won.' },
      ],
    },
    's8.l6': {
      why: 'The order of “every” and “one” changes the meaning. Every door can have its own key, or one key can open every door.',
      uses: [
        { who: 'You, on a class trip', kind: 'life', text: 'The rule says every kid has a buddy. Each kid can have a different buddy. It does not mean the whole class shares one buddy.' },
        { who: 'Building managers', kind: 'work', text: 'Every room in a building has a key that opens it. A manager also keeps one master key that opens every room. That is one key for all of them.' },
        { who: 'Website builders', kind: 'work', text: 'Every account on a website needs a password. Each person picks their own. It does not mean one password opens every account.' },
      ],
    },
  },
  skills: {
    // s8.l1 In the ring or not
    's8.member': [
      'A red apple is red, and it is a fruit. In a sorting game with a Red ring and a Fruit ring, it goes where the rings overlap.',
      'A kid on the soccer team and in the band goes on both lists. Leave that kid off one list, and that list is missing someone.',
    ],
    // s8.l2 All, some, none
    's8.quantify': [
      'If every cookie in the jar is chocolate chip, “Some cookies are chocolate chip” is still true. Some means at least one.',
      'A pool sign says, “No dogs in the water.” The rule is broken if even one dog jumps in.',
    ],
    // s8.l3 Not all means some are not
    's8.negate': [
      'To show “All the lights are off” is false, find one light that is on. One is enough.',
      'The opposite of “Some seats are free” is “No seats are free.” It is not “Some seats are taken.”',
    ],
    // s8.l4 When the ring is empty
    's8.empty': [
      'If you have no homework at all, “All my homework is done” is true. Nothing is left to break it.',
      'A shelf with no books makes “Some books on the shelf are red” false. No book is there to make it true.',
    ],
    's8.why': [
      'When you tell why a sentence is true, pick a reason that is true and that explains it. “Most” is never a reason for “all.”',
    ],
    // s8.l5 Two givens, one picture
    's8.syllogism': [
      'All the red pencils are in the box, and all the pencils in the box are sharp. So all the red pencils are sharp.',
      '“All cats have fur” does not turn around. A dog has fur too, so “All furry pets are cats” does not follow.',
    ],
    // s8.l6 Every and some: who comes first
    's8.order': [
      '“Every seat has a ticket” lets each seat have its own ticket. It does not mean one ticket is good for every seat.',
      'A coach says every player has a partner for drills. The partners can be different. One partner for the whole team would be a different rule.',
    ],
  },
};
