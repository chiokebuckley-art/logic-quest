/** Real life for Stop 7, Ways to Think. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S7_WORLD: StopWorld = {
  stop: 'Weather forecasters, plumbers and race car engineers all make good guesses from patterns and clues. Then they check, because a good guess is not a proof.',
  lessons: {
    's7.l1': {
      why: 'A pattern makes a good guess, not a proof: one new case can break it. If each try leaves things the same as before, a streak never makes anything “due.”',
      uses: [
        { who: 'Weather forecasters', kind: 'work', text: 'Say weather like today’s brought rain on most past days. Then forecasters say rain is likely, not that it must rain. It is a good guess from a pattern, and the clouds can still pass by.' },
        { who: 'You, at a coin toss', kind: 'life', text: 'Your team lost the coin toss at the last three games. Winning it is not “due” now. The coin is the same as before, so heads and tails still have the same chance.' },
        { who: 'Game designers', kind: 'work', text: 'Game designers choose how likely each card is by how many they make. If most cards in the deck say “move ahead,” moving ahead is likely. A few “go back” cards make going back unlikely, but it can still happen.' },
      ],
    },
    's7.l2': {
      why: 'The best explanation fits every clue and needs the fewest extra things. It is still a guess, so test it: a new clue can change it.',
      uses: [
        { who: 'You, at home', kind: 'life', text: 'The oven clock is blank, and the fridge light won’t come on. “The power went out” fits both clues. “The fridge broke” misses the oven clock, so it is out.' },
        { who: 'Doctors', kind: 'work', text: 'A child has a sore throat and a fever. A cold fits both clues, and so does strep, a throat germ that medicine can treat. So the doctor does a quick swab test to tell them apart.' },
        { who: 'Park rangers', kind: 'work', text: 'Park rangers find tree stumps with tooth marks and a pile of sticks blocking a creek. A beaver fits both clues, with nothing extra needed. They still look for the beaver before they are sure.' },
      ],
    },
    's7.l3': {
      why: 'Two things that go together give you a guess to check, not a proof. To find a cause, change just one thing and keep the rest the same.',
      uses: [
        { who: 'You, making paper planes', kind: 'life', text: 'To learn what makes a paper plane fly farther, make two planes that differ only in wing size. Throw them the same way. If one flies farther every time, the wing size is the cause.' },
        { who: 'Shop owners', kind: 'work', text: 'A shop owner sees that umbrellas and rain boots sell well on the same days. Umbrellas don’t make people buy boots: rainy days are a third thing that causes both. So she checks the weather report before she orders more.' },
        { who: 'Race car engineers', kind: 'work', text: 'Race car engineers change one part at a time, like the tires, and keep the rest the same. If they changed the tires and the engine at once, they couldn’t tell which made the car faster.' },
      ],
    },
    's7.l4': {
      why: 'Check each choice three ways: honest, fair, and hurts no one. The fair choice passes all three, and it rests on facts, not on what someone wants.',
      uses: [
        { who: 'You, after a spill', kind: 'life', text: 'You spill juice on your sister’s drawing. Hiding it is not honest, and blaming your brother hurts him. Telling her the truth and saying sorry passes all three checks.' },
        { who: 'Cashiers', kind: 'work', text: 'Two bills stick together when a customer pays, so she gives too much. Keeping the extra is not honest or fair. A good cashier hands it back, so the customer gets what is hers.' },
        { who: 'Referees', kind: 'work', text: 'Fans may shout and wave for a goal. A good referee decides from what happened on the field. How much people want a call does not change the facts.' },
      ],
    },
    's7.l5': {
      why: 'A gut feeling is a fast guess and a good place to start. However strong it feels, check the facts before you are sure.',
      uses: [
        { who: 'You, in the checkout line', kind: 'life', text: 'The line with the fewest people looks fastest. That is a fast guess. Count what is in each cart: one very full cart can take longer than three small baskets.' },
        { who: 'Librarians', kind: 'work', text: 'A librarian feels sure the dragon books are borrowed most, because their shelf always looks messy. That is a fast guess. She checks how many times each book was borrowed before she orders more.' },
        { who: 'Pilots', kind: 'work', text: 'In thick clouds, a pilot can feel sure the plane is flying level when it is slowly turning. So pilots learn to trust the plane’s dials over their feelings.' },
      ],
    },
  },
  skills: {
    // s7.l1 Pattern guesses
    's7.pattern-chance': [
      'Your drawer has 5 white socks and 2 black socks. Grab one in the dark: white is likely, and black is unlikely. A red sock can’t come out.',
      'A game spinner has 3 green parts and 1 red part, all the same size. Green is likely, but not a must. Green or red is a must.',
    ],
    's7.pattern-sure': [
      'You pick up five shells on a beach, and all are white. You know for sure only about those five. So say the next one is probably white, not that it must be.',
      'The first four pages of a new joke book made you laugh. “The next page will be funny too” is a good guess. But you only know about the pages you read.',
    ],
    's7.pattern-due': [
      'In a board game, you haven’t rolled a six in many turns. A six is not “due.” The die is the same as before, so each roll gives a six the same chance.',
      'Your teacher picks a name stick from a cup and puts it back each time. Yours hasn’t come up all week, but it is not due. The cup is the same every time.',
    ],
    's7.pattern-break': [
      'Every spelling test this year had a bonus word, so you expect one again. Then a test comes with none. All those tests made a good guess, not a proof.',
      'Your friend has thrown rock first in every game of rock, paper, scissors. You expect rock again, but this time she throws scissors! Many games made a good guess, not a proof.',
    ],
    // s7.l2 The best explanation
    's7.explain-best': [
      'A runner gets out of breath early in each race, then slows down. “She starts too fast” fits both clues. “Tight shoes” misses the out-of-breath clue, so she tries a slower start.',
      'Your kite won’t stay up, and the flags in the park hang still. “There is no wind” fits both clues. “The kite is broken” misses the still flags, so it is out.',
    ],
    's7.explain-test': [
      'The TV won’t turn on: is it broken, or is the remote’s battery dead? Press the button on the TV itself. If the TV turns on, the broken-TV idea is out.',
      'Water is on a kitchen floor: a leaky pipe or a spill? A plumber dries the floor and waits. If it gets wet again, the spill idea is out.',
    ],
    's7.explain-new-clue': [
      'You guess your brother took your scissors. Then you learn he was at a friend’s house all day. That new clue rules him out, so you need a new best guess.',
      'You blame rabbits for holes in your lettuce. Then you find slimy trails, and the fence keeps rabbits out. Slugs or snails fit every clue now, so they are the new best guess.',
    ],
    's7.explain-revise': [
      'Scientists once pictured all dinosaurs with scaly skin. That was a best guess, not a proof. Then they dug up fossils of dinosaurs with feathers, so they changed their best guess.',
      'A treasure hunt clue says “near water,” and the pond is the only water you know of. So the pond is your best guess, not a proof. Then you find the prize by a birdbath!',
    ],
    // s7.l3 Cause or just together?
    's7.cause-which': [
      'Your bread came out flat. Next time, use new yeast and keep everything else the same. If the bread rises, the old yeast was the cause.',
      'A game runs slowly on one level. Game makers turn off just one thing, like the music, and keep the rest the same. If the game speeds up, that one thing was the cause.',
    ],
    's7.cause-cant-tell': [
      'You start a new soap and a new lotion in the same week, and your dry skin gets better. Which one helped? You can’t tell yet: two things changed at once.',
      'A cook adds more salt and a new spice at the same time, and the soup tastes better. Which one did it? The cook can’t tell yet.',
    ],
    's7.cause-together': [
      'Your team won every game this month, and you wore your lucky socks to each one. Going together is not proof. Lots else changed too, like how much your team practiced.',
      'A rooster crows each morning before the sun comes up. The crowing and the sunrise go together, but the crowing does not make the sun rise.',
    ],
    's7.cause-third': [
      'Among kids, those with bigger feet often read better. Big feet don’t help you read! Age is the third thing: older kids have bigger feet and more years of reading.',
      'When it gets dark, house lights and streetlights both come on. Neither one turns on the other. Getting dark is a third thing that causes both.',
    ],
    // s7.l4 Fair choices
    's7.fair-choice': [
      'You promised to give a friend’s game back on Monday. Giving it back on time passes all three checks. Keeping it longer, even if you haven’t finished, breaks the promise.',
      'A waiter forgets a family’s order. Telling them, saying sorry and bringing it fast passes all three checks. Making up an excuse, or blaming the cook, fails at least one.',
    ],
    's7.fair-reason': [
      'Two kids want the class computer, and the sign-up list shows Ava signed up first. That fact decides it. “Ben really wants it” is a wish, not a reason.',
      'A package on your step has your neighbor’s name on it. That fact decides it: the package goes next door. “Finders keepers” is a saying, not a reason.',
    ],
    's7.fair-pressure': [
      'Your friends want you to skip your little sister’s turn so the game goes faster. Wanting it does not change the facts. It is still her turn.',
      'Someone selling an old bike really wants it to sell. That wish does not change the facts: the brakes need fixing. The fair choice is to say so.',
    ],
    // s7.l5 Gut feelings
    's7.gut-check': [
      'Your gut says you have enough money for two snacks. Add up the prices before you pay. The math is the check, and it shows if your gut was right.',
      'A puzzle piece looks like it fits. Before you press it in, check its edges and the picture. The check tells you if the fast guess was right.',
    ],
    's7.gut-count': [
      'In a vote at recess, a few loud kids shout for tag. Count the hands before you say tag won. Each kid counts once, loud or quiet.',
      'At the pond, a few big geese catch your eye, but there may be more small ducks. Count each bird once, big or small, before you say there are more geese.',
    ],
    's7.gut-agree': [
      'Your gut says the bigger box is the heavier one. You lift both, and it is! Your gut was right, but you only knew after you checked.',
      'A baker’s nose says the bread is done. She taps the bottom of the loaf, and it sounds hollow, so it is. Her nose was right, but the tap showed it.',
    ],
    's7.gut-proof': [
      'You feel very sure you packed your swimsuit for the trip. Check the bag anyway. A strong feeling can still be wrong, and the bag shows what is true.',
      'Carpenters, who build with wood, may feel sure a board is long enough. They measure it anyway. A strong feeling does not change what the tape measure says.',
    ],
  },
};
