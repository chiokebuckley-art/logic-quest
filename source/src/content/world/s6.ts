/** Real life for Stop 6, If… then. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S6_WORLD: StopWorld = {
  stop: 'Game rules, safety checks and computer code are full of if–then rules. Each one breaks only one way: the IF part happens and the THEN part does not.',
  lessons: {
    's6.l1': {
      why: 'An if–then rule breaks only one way: the IF part happens and the THEN part does not. Know this, and you never blame someone who kept the rule.',
      uses: [
        { who: 'You, playing freeze tag', kind: 'life', text: 'In freeze tag, the rule is “If you are tagged, then you freeze.” A kid who gets tagged and keeps running breaks it. A kid who stops to rest without a tag does not.' },
        { who: 'Lifeguards', kind: 'work', text: 'A pool rule: “If you swim in the deep end, then you passed the swim test.” The lifeguard looks for one thing: a deep-end swimmer who did not pass. Kids in the shallow end can’t break it.' },
        { who: 'Bus drivers', kind: 'work', text: 'A bus driver’s rule: “If someone presses the stop button, then the bus stops at the next stop.” Stopping for people waiting at a stop is fine too. Only driving past after a press breaks the rule.' },
      ],
    },
    's6.l2': {
      why: 'A rule works forward, not backward. When you see only the THEN part, ask if it could have happened another way, so you don’t jump to the wrong answer.',
      uses: [
        { who: 'You, in math class', kind: 'life', text: '“If a shape is a square, then it has four sides” is true. Turned around, it is false: “If it has four sides, then it is a square.” A long, thin rectangle has four sides too.' },
        { who: 'Computer helpers', kind: 'work', text: '“If the internet is down, then this website won’t load” is true. Turned around, it can be false: the website itself may be down. So a computer helper tries a second website.' },
        { who: 'Sports reporters', kind: 'work', text: 'In soccer, “If a player gets a red card, then she leaves the game” is true. But a player who leaves may just be swapped out for a rest. So a reporter checks before writing “red card.”' },
      ],
    },
    's6.l3': {
      why: 'With a rule, only two kinds of facts prove something new: the IF part happened, or the THEN part did not. The other two give guesses, not proof.',
      uses: [
        { who: 'Librarians', kind: 'work', text: '“If a book is checked out, then it is not on the shelf.” The computer shows it is checked out, so the librarian doesn’t walk to the shelf. A missing book proves nothing: someone may be reading it nearby.' },
        { who: 'Cashiers', kind: 'work', text: 'A cashier knows, “If the scanner reads an item, then it beeps.” No beep means it did not read the item, so she scans it again. That way nothing gets missed.' },
        { who: 'You, playing a guessing game', kind: 'life', text: '“If it is a fish, then it lives in water.” Your friend’s animal does not live in water, so it is not a fish. If it lived in water, nothing would follow: it could be a fish or a whale.' },
      ],
    },
    's6.l4': {
      why: 'Flip a rule and put NOT in both parts, and it still means the same. Flip it alone, or add NOT alone, and you change the rule without noticing.',
      uses: [
        { who: 'You, in the backyard', kind: 'life', text: '“If it is a bird, then it has feathers.” Flip it and put NOT in both: “If it has no feathers, then it is not a bird.” So a butterfly, with no feathers, is not a bird, though it flies.' },
        { who: 'Math experts', kind: 'work', text: 'Math experts sometimes prove a rule by proving its flip and NOT. Take “If a number times itself is even, then the number is even.” They prove the easier “If a number is odd, then it times itself is odd.”' },
        { who: 'Game designers', kind: 'work', text: 'A video game rule: “If the door opens, then the player has the key.” The game checks for the key first. So designers often write its flip and NOT: “If the player has no key, then the door stays shut.”' },
      ],
    },
    's6.l5': {
      why: 'To check a rule, look only where the IF part happened or the THEN part did not. Every break hides there, so you save time and miss nothing.',
      uses: [
        { who: 'Teachers', kind: 'work', text: 'Before a class trip, the rule is “If you go, then a grown-up signed your form.” The teacher checks the form of every kid who is going. She also makes sure no kid with an unsigned form goes.' },
        { who: 'Postal workers', kind: 'work', text: 'A post office rule: “If a letter is extra heavy, then it has extra stamps.” A postal worker checks the stamps on each heavy letter, and weighs each letter with one stamp. A letter with extra stamps needs no check.' },
        { who: 'You, at a bake sale', kind: 'life', text: 'A bake sale rule: “If a treat has nuts, then it has a blue sticker.” Check the recipe of each treat with no blue sticker: could it have nuts? A treat with a blue sticker can’t break the rule.' },
      ],
    },
  },
  skills: {
    // s6.l1 When is a rule broken?
    's6.who-broke': ['A team rule: “If you play on Saturday, then you came to practice this week.” A kid who played but skipped practice broke it. A kid who came to practice but sat out did not.'],
    's6.did-break': ['“If a dog is off its leash, then it is in the dog area.” A dog on a leash in the dog area keeps this park rule. It only talks about dogs off the leash.'],
    // s6.l2 Turning it around
    's6.backward': ['Whenever Grandma is home, her car is in the driveway. The car is there now, but is she home? You can’t tell: she may have walked to the park.'],
    's6.forward': ['“If you mix blue and yellow paint, then you get green” is a true rule. You mix blue and yellow, so you will get green for sure.'],
    // s6.l3 The four moves
    's6.move-if': ['“If a number ends in 0, then it is even” is always true. The number 130 ends in 0, so it is even for sure. No need to divide it by 2 to check.'],
    's6.move-not-then': ['“If water is boiling, then it has big bubbles.” Your pot has no big bubbles yet, so it is not boiling. Wait before you add the pasta.'],
    's6.trap-then': [
      'In a deck of cards, “If a card is a heart, then it is red” is true. Your friend’s card is red, but it might be a diamond, so nothing follows for sure.',
      'A gardener sees a wilted plant. “If a plant gets no water, then it wilts,” but too much water can make it wilt too. So she feels the soil before watering.',
    ],
    's6.trap-not-if': ['A store sign says, “If a toy is broken, then we take it back.” Will they take back a toy that works fine? Nothing follows for sure: many stores take back unused toys too.'],
    // s6.l4 Flip and NOT
    's6.same-pick': ['“If you go outside, then you wear a coat” means the same as “If you have no coat on, then you stay inside.” Only a kid outside with no coat breaks either one.'],
    's6.same-yesno': [
      '“If it is a puppy, then it is young.” NOT in both parts gives “If it is not a puppy, then it is not young.” A kitten breaks that one but keeps the rule.',
      'Flipped, “If it is a lemon, then it tastes sour” becomes “If it tastes sour, then it is a lemon.” A lime breaks the flip but keeps the rule, so they don’t mean the same.',
    ],
    // s6.l5 Rule checker
    's6.checker': ['Your home rule: “If it goes in the recycling bin, then it is rinsed.” Check what is in the bin, and where each dirty jar went. A rinsed jar can’t break the rule.'],
    's6.checker-card': ['A mover’s rule: “If a box holds dishes, then it says Kitchen.” A box that says Kitchen can’t break the rule, so she skips it. She peeks inside each box that doesn’t.'],
  },
};
