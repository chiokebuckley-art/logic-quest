/** Real life for Stop 2. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S2_WORLD: StopWorld = {
  stop: 'Search boxes, shop filters and rules at school all use NOT, AND and OR. Reading them the logic way helps you find exactly what fits.',
  lessons: {
    's2.l1': {
      why: 'NOT red means every color but red, not just one other color. Read NOT this way, and nothing that fits gets left out.',
      uses: [
        { who: 'You, sorting the laundry', kind: 'life', text: 'White clothes go in one load. Everything NOT white goes in the other: red, blue, black and green, not just the dark ones. Then a red sock can’t turn your whites pink.' },
        { who: 'Gardeners', kind: 'work', text: 'A gardener weeding the carrot row pulls every plant that is NOT a carrot. Grass, clover and dandelions all go, not just one kind of weed. Then the carrots have room to grow.' },
        { who: 'Coaches', kind: 'work', text: 'A coach says, “Everyone NOT in a blue vest, line up here.” Kids in red or yellow vests come over, and so do kids with no vest at all. Every kid ends up on one side or the other.' },
      ],
    },
    's2.l2': {
      why: 'AND needs both parts to be true. Use it to cut a long list down to just what you need, and check both parts so nothing wrong slips in.',
      uses: [
        { who: 'You, signing in online', kind: 'life', text: 'A website lets you in only when your username AND your password are both right. The right name with the wrong password keeps you out. That keeps strangers out of your account.' },
        { who: 'Pilots', kind: 'work', text: 'At a busy airport, a pilot takes off only when the plane’s checks are done AND the control tower says the runway is clear. The tower is the team that guides planes. One yes is not enough.' },
        { who: 'Shop owners', kind: 'work', text: 'A bike shop owner needs a helper who can work Saturdays AND fix bikes. A great fixer who is away on Saturdays does not fit. Checking both parts means someone is there to fix bikes on Saturdays.' },
      ],
    },
    's2.l3': {
      why: 'In logic, OR means one part or both parts. Know which OR someone means, so you never leave out the things that fit both.',
      uses: [
        { who: 'Librarians', kind: 'work', text: 'A kid who likes dogs and cats asks for a good book. The librarian searches for dogs OR cats, so books about dogs, cats, or both show up. No book about either pet gets missed.' },
        { who: 'You, at recess', kind: 'life', text: 'Your school might keep recess inside if it is raining OR very cold. On a day that is cold and rainy, recess is inside too. Both parts true still counts.' },
        { who: 'Bakers', kind: 'work', text: 'A baker’s rule: bread goes on the half-price shelf if it is from yesterday OR it got squashed. A squashed loaf from yesterday goes there too.' },
      ],
    },
    's2.l4': {
      why: 'Brackets tell you which part to work out first. The same words with the brackets in a new place can mean something very different.',
      uses: [
        { who: 'You, at a party', kind: 'life', text: 'A grown-up says, “Not both cake and ice cream.” That is NOT (cake AND ice cream), so either one alone is fine. Reading it as NOT cake AND NOT ice cream means skipping a treat for nothing.' },
        { who: 'School lunch cooks', kind: 'work', text: 'A child can’t eat nuts or eggs. So the cook needs food that is NOT (nuts OR eggs): no nuts AND no eggs. A snack with eggs but no nuts is still out.' },
        { who: 'Programmers', kind: 'work', text: 'A shop’s search for shirts that are NOT (red OR blue) should show every other color. Typed without brackets, NOT red OR blue lets blue shirts in too. So programmers place brackets with care.' },
      ],
    },
    's2.l5': {
      why: 'One example that does not match rules a guess out for sure. A guess that matches every example is still possible, but it is not proved.',
      uses: [
        { who: 'You, in class', kind: 'life', text: 'Your teacher sorts words into two groups and asks for the rule. Before you say “words with an e,” check every word in both groups. One word that does not match means a new guess.' },
        { who: 'Scientists', kind: 'work', text: 'A scientist guesses that a kind of bird eats only seeds. She watches many of those birds. If even one eats a bug, the guess is ruled out.' },
        { who: 'Software testers', kind: 'work', text: 'Software testers check that computer programs work. They try a program on many examples where they already know the right answer. Even one wrong answer shows there is a mistake to fix.' },
      ],
    },
  },
  skills: {
    // s2.l1 NOT
    's2.not': [
      'Your class went to the zoo last year, so this trip can be anywhere NOT the zoo. The farm, the museum and the park are all still choices.',
      'Some vets have a waiting area just for cats, and one for every pet that is NOT a cat. Dogs, rabbits and birds all wait there, not just dogs.',
    ],
    's2.not-count': [
      'If 2 of 12 eggs are cracked, then 10 are NOT cracked. Count the few cracked ones, then take them away from the whole box.',
      'A ticket seller counts the seats already taken, then takes that number away from all the seats. That gives the seats NOT taken, which are still for sale.',
    ],
    's2.not-means': [
      '“Nonfiction” means NOT fiction. Science books, history books and cookbooks all fit. It is not just one kind of book.',
      '“Every day that is NOT a school day” means weekends, holidays and summer break. It is not just Saturday.',
    ],
    // s2.l2 AND
    's2.and': [
      'You want shoes in your size AND in blue. A blue pair that is too small is out. So is a red pair in your size.',
      'A recipe says to bake until the top is brown AND a toothpick comes out clean. A brown top with a wet middle means wait.',
    ],
    's2.and-pick': [
      'At a pet shelter, your family wants a dog that is small AND calm. A calm big dog is out, and so is a small, jumpy one. You pick the dog that is both.',
    ],
    's2.and-count': [
      'You filter a movie list to show only ones that are funny AND about animals. You will never see more than for funny movies alone. Each AND part can only cut the list down.',
      'Planning a sleepover, count the friends who are free on Friday AND allowed to stay over. Only kids who fit both parts can come.',
    ],
    // s2.l3 OR
    's2.or-both': [
      'When a waiter offers soup or salad, it usually means you pick one. In logic, OR also counts both. So when a rule says “or,” ask if both is allowed.',
      'A summer camp is for kids who like art OR music. A kid who likes both can come too. Both parts true still fits.',
    ],
    's2.or-yesno': [
      'On a road trip, your family stops if someone needs the bathroom OR the gas tank is low. Right now both are true, so yes, you stop.',
      'A museum is free only for kids OR members. A grown-up who is not a member fits neither part, so he pays.',
    ],
    's2.or-pick': [
      'Your beach bag gets only things for the sun OR for the water. Sunscreen fits, and so do goggles. A winter scarf fits neither part, so it is the one left home.',
    ],
    's2.or-count': [
      'Your school makes one badge for each kid in the chess club OR the garden club. A kid in both clubs gets just one badge, so she counts once.',
    ],
    // s2.l4 Brackets
    's2.not-both': [
      'A coupon that “can’t be used with other deals” means NOT (coupon AND sale price). You may use the coupon, or get the sale price. Just not both on one thing.',
    ],
    's2.not-either': [
      'A computer lab sign says “No food or drinks.” That is NOT (food OR drinks): no food AND no drinks. A drink by itself is still not allowed.',
    ],
    's2.bracket-yesno': [
      'Your book club picks a book that is NOT (too long OR read before). This one is short, but you read it before. So the inside is true, and NOT flips it to no.',
    ],
    's2.same-meaning': [
      'A toy box says “ages 5 to 12.” That is NOT (under 5 OR over 12). It means the same as NOT under 5 AND NOT over 12.',
      '“You can’t have the window open and the heater on” means NOT (window open AND heater on). That is the same as: window shut OR heater off.',
    ],
    // s2.l5 Guess the rule
    's2.guess-rule': [
      'Your cat naps on some chairs but not others. You guess “only soft ones.” Then she naps on a hard kitchen chair, so that guess is ruled out.',
      'A snack machine takes some coins and spits others back. You guess, “It takes only shiny coins.” Then it takes a dull one, so that guess is ruled out.',
    ],
  },
};
