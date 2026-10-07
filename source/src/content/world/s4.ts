/** Real life for Stop 4, Grid Detective. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S4_WORLD: StopWorld = {
  stop: 'Head chefs, hotel clerks and airport planners hand out jobs, rooms and gates, one each. When every choice but one is crossed out, the one left must be right.',
  lessons: {
    's4.l1': {
      why: 'A grid keeps every clue in one place, with ✓ for yes and ✗ for no. Leave a box empty until a clue tells you, so you never guess.',
      uses: [
        { who: 'You, planning a family dinner', kind: 'life', text: 'In a grid of people and seats for a family dinner, “Grandpa needs the seat by the door” is a ✓. “Mia doesn’t want the end seat” is a ✗. Empty boxes show what is left to decide.' },
        { who: 'Farmers', kind: 'work', text: 'Many farmers plant each crop in a new field each year, to keep the soil healthy. Three crops go in three fields, one each. Corn grew in the north field last year, so north field – corn gets a ✗.' },
        { who: 'Coaches', kind: 'work', text: 'A baseball coach puts each of nine players at a different position. “Jo will pitch or catch” gives no ✓ yet. But it puts a ✗ in all the other boxes in Jo’s row, like first base.' },
      ],
    },
    's4.l2': {
      why: 'Crossing out wrong choices can show you an answer that no clue says out loud. But count first: if two are still open, you can’t tell yet.',
      uses: [
        { who: 'You, with new keys', kind: 'life', text: 'Three new keys open the front door, the back door and the shed, one each. The silver key opens neither door. The shed is the only lock left, so it must be the shed key.' },
        { who: 'Teachers', kind: 'work', text: 'Every student hands in one paper, and one paper has no name. The teacher checks the class list: every student but Kai has a paper with a name. So the paper with no name must be Kai’s.' },
        { who: 'Zookeepers', kind: 'work', text: 'Three penguins at the zoo wear red, blue and green wing bands. The red one is inside, so the far-off one on the rock is blue or green. The keeper can’t tell yet, so she waits for a closer look.' },
      ],
    },
    's4.l3': {
      why: 'Each ✓ crosses out the rest of its row and the rest of its column. One fact turns into many, but only if you remember both.',
      uses: [
        { who: 'You, cracking a secret code', kind: 'life', text: 'In a secret-code puzzle, each code letter stands for one real letter, and each real letter has one code letter. Once you find that Q means E, Q can’t mean anything else. And no other code letter can mean E.' },
        { who: 'Airport planners', kind: 'work', text: 'Airport planners give each plane landing at noon one gate. When a plane gets gate 4, its other gates are crossed out. Gate 4 is crossed out for every other plane too, so two planes never head to one gate.' },
        { who: 'Head chefs', kind: 'work', text: 'A head chef gives three cooks one job each: grill, baking or salads. Sam is on the grill, so Sam gets no other job and no one else grills. Then Ana, who can’t bake, must make salads.' },
      ],
    },
    's4.l4': {
      why: 'A linking clue joins two things without naming anyone. Save it for later: once you learn who has one, you know who has the other too.',
      uses: [
        { who: 'Restaurant servers', kind: 'work', text: 'Servers often write orders by seat number, like “Seat 2: soup.” That links a seat and a dish without a name. Whoever sits in seat 2 gets the soup, and no one has to ask.' },
        { who: 'You, at a school play', kind: 'life', text: 'At a school play, you know the king wears the gold crown. The list of actors says Leo plays the king. So the kid in the gold crown must be Leo.' },
        { who: 'You, reading a mystery', kind: 'life', text: 'In a mystery story, the clue “The guest in the green coat took the last cookie” names no one. It joins a coat and the cookie. Find out who wore green, and you know who took it.' },
      ],
    },
    's4.l5': {
      why: 'Every mark needs a reason you can name. If nothing proves it yet, leave it empty: one wrong guess can lead to many wrong answers.',
      uses: [
        { who: 'Scorekeepers', kind: 'work', text: 'A scorekeeper writes down a point only when she is sure it counts. She never guesses, because one wrong point would make every total after it wrong too.' },
        { who: 'Pharmacists', kind: 'work', text: 'A pharmacist gets medicine ready from a doctor’s order. If part of the order is unclear, she does not guess. She calls the doctor, since a guess could mean the wrong medicine.' },
        { who: 'You, on a reading test', kind: 'life', text: 'A reading test asks, “Using only the story, why was Max late?” Use the story’s clues, not your own ideas or another book. Then you can point to the words that prove your answer.' },
      ],
    },
  },
  skills: {
    // s4.l1 Check marks and crosses
    's4.grid-marks': [
      'Your class gives each kid one job for the week. “Jay feeds the fish” puts a ✓ where Jay’s row meets the fish column.',
      'Your aunt says she will visit on Tuesday or Wednesday. That does not tell you the day yet. But it crosses out Monday, Thursday and Friday.',
    ],
    // s4.l2 Only one left
    's4.only-one-left': [
      'On field day, three teams each get a different color: red, blue or green. The Hawks took red and the Owls took blue. So green is the only color left for the Foxes.',
      'Three cousins share three rooms at Grandma’s, one each. Ali has the attic and Ben has the den. The back room is the only one left, so it is Cam’s.',
    ],
    's4.not-decided': [
      'Three friends each order a different smoothie: berry, mango or banana. If all you know is that Zoe did not order mango, she could have berry or banana. You can’t tell yet.',
      'Three new kids get lockers 1, 2 and 3, one each. If all you know is that Eva’s locker is not 2, it could be 1 or 3. You can’t tell yet.',
    ],
    // s4.l3 Spread the check mark
    's4.spread-tick': [
      'At the start of a board game, each player takes one color. Once you take blue, you can’t take another color, and no one else can take blue.',
      'A hotel clerk gives each family one room. Once a family gets room 8, it gets no other room, and no other family gets room 8.',
    ],
    's4.spread-column': [
      'Three kids each name one of three new kittens. Once Rosa names the gray one, it is off the list for her two brothers. Otherwise one kitten could end up with two names.',
      'In a class gift swap, each kid draws one name from a hat. A drawn name stays out of the hat, so no one else can get it.',
    ],
    's4.grid-one': [
      'Three friends start a band, one part each: drums, guitar or singing. Mo plays the drums, and Liv can’t play guitar. So Liv sings, and Ty plays guitar.',
      'A gym teacher sends three groups to three stations: ropes, mats and hoops. Group A starts at ropes, and B can’t start at mats again. So B starts at hoops, and C at mats.',
    ],
    // s4.l4 Linking clues
    's4.link': [
      'A tournament chart says, “The winner of game 1 plays the Bears next.” It names no team yet. Once the Lions win game 1, you know the Lions play the Bears.',
      'When you leave your coat in a theater’s coat room, your coat and your ticket get the same number. The number links them, not a name. Whoever holds the ticket gets the coat.',
    ],
    's4.not-link': [
      'At camp, a counselor learns that the camper in bunk 2 did not leave the flashlight on. That crosses out whoever sleeps in bunk 2. It does not yet say who did.',
      'Three kids each bring one treat on a tray of a different color. The kids with the red and blue trays did not bring the muffins. So the kid with the green tray did.',
    ],
    's4.grid-two': [
      'At a science fair, each student gets one table and one topic. “The volcano is at table 3” links the two parts. If Ana has table 3, the volcano is hers.',
    ],
    // s4.l5 No guessing
    's4.proof-clue': [
      'Each kid in your family has their own toothbrush. Dad says the green one is Ben’s. That one clue, all by itself, proves it is not Ana’s or Cy’s.',
      'Your friend’s family will get one pet: a cat or a bird. That clue, all by itself, proves the new pet will not be a dog.',
    ],
    's4.enough-clues': [
      'One of three friends left a card on your desk. Two clues show it was not Sam or Jo, so you can tell: it was Kim. With four friends, you couldn’t tell yet.',
    ],
  },
};
