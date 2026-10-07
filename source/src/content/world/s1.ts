/** Real life for Stop 1, True or False? See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S1_WORLD: StopWorld = {
  stop: 'Doctors and scientists sort what they hear into true, false and “can’t tell yet.” When clues are not enough, “can’t tell yet” is the honest answer, not a guess.',
  lessons: {
    's1.l1': {
      why: 'Before you believe a sentence, ask if it can be checked. Only a statement can be true or false.',
      uses: [
        { who: 'You, reading ads', kind: 'life', text: '“The best pizza in town” is an opinion. “Open until 9 pm” is a statement: you can check it, and it is true or false.' },
        { who: 'Scientists', kind: 'work', text: 'A scientist turns an idea into a statement a test can check, like “This plant grows taller in sunlight.” A question or a wish cannot be tested.' },
        { who: 'Fact-checkers', kind: 'work', text: 'Fact-checkers pick out the statements in a speech, like “Our town has three parks.” Then they check each one. Opinions are not checked.' },
      ],
    },
    's1.l2': {
      why: '“Can’t tell yet” is not the same as false. Before you decide, ask if the parts you can’t see could change the answer.',
      uses: [
        { who: 'You, at the store', kind: 'life', text: 'You pick up a bag of apples. One rotten apple makes “Every apple is good to eat” false, no matter what. If the ones you see look fine, you can’t tell yet: some are hidden.' },
        { who: 'Park rangers', kind: 'work', text: 'Park rangers search a pond for a rare frog. Seeing one makes “There is one here” true. Seeing none does not make it false, because frogs hide, so they can’t tell yet.' },
        { who: 'Doctors', kind: 'work', text: 'A doctor gets two of three test results back, and both are normal. “All three are normal” could still go either way, so she can’t tell yet. She waits for the last one.' },
      ],
    },
    's1.l3': {
      why: 'A careful NOT keeps you from believing too much. The NOT of “All the cookies are gone” is “At least one is left,” not “They are all here.”',
      uses: [
        { who: 'You, at a soccer game', kind: 'life', text: 'A team wins when it scores more goals. The NOT of “We scored more” is “They scored at least as many.” So a tie is not a win, but it is not a loss either.' },
        { who: 'Building inspectors', kind: 'work', text: 'An inspector checks a new school before it opens. The NOT of “Every fire alarm works” is “At least one does not.” One broken alarm makes the NOT true, so it gets fixed before the doors open.' },
        { who: 'Programmers', kind: 'work', text: 'A website asks for a code with exactly four digits. To catch mistakes, the programmer writes the NOT: “The number of digits is not four.” That catches three digits and five digits alike.' },
      ],
    },
    's1.l4': {
      why: 'When you can’t see the answer, try each choice. Pretend it is the answer, check what you know, and cross it out if the facts don’t fit.',
      uses: [
        { who: 'You, on a nature walk', kind: 'life', text: 'You spot a bird with a red head. Pretend it is a crow. Crows have no red feathers, so cross it out and try the next bird in your guide.' },
        { who: 'Vets', kind: 'work', text: 'A dog keeps scratching. The vet pretends the cause is dry skin: then the skin would look flaky. It looks healthy, so she crosses out dry skin and tries the next idea, like fleas.' },
        { who: 'Engineers', kind: 'work', text: 'An engineer is choosing boards for a playground bridge. She pretends a thin board is the right one: then it must hold many kids at once. Her math shows it would bend too much, so she crosses it out.' },
      ],
    },
    's1.l5': {
      why: 'Often the best choice is the one where every problem on your list is false. Try each choice, and keep the one where none comes true.',
      uses: [
        { who: 'You, picking a game', kind: 'life', text: 'For game night, try each game on the shelf. “It needs more players than we have” and “It takes too long” must both be false. Keep a game where neither is true.' },
        { who: 'Truck drivers', kind: 'work', text: 'A truck driver tries each road on the map. “The road is closed” and “A bridge is too low for the truck” must both be false. A road where either is true gets crossed out.' },
        { who: 'Gardeners', kind: 'work', text: 'A new plant needs sun and dry soil. The gardener checks each spot in the yard for problems, like shade or puddles. She plants it only where none of those problems is true.' },
      ],
    },
    's1.l6': {
      why: 'It is easy to stop counting once you find two. Keep counting to the end: when the rule says “exactly two,” three is just as wrong as one.',
      uses: [
        { who: 'You, playing with friends', kind: 'life', text: 'In Two Truths and a Lie, a friend says three things, and exactly two are true. If you know two are true, the third must be the lie.' },
        { who: 'Referees', kind: 'work', text: 'In beach volleyball, each team has exactly two players. Before a game, the referee counts both sides. Three on a side breaks the rule, and so does one.' },
        { who: 'You, taking a test', kind: 'life', text: 'A question says, “Pick the two right answers.” Exactly two are right, no more and no fewer. If you mark three, that breaks the rule, just like marking one.' },
      ],
    },
    's1.l7': {
      why: 'Sometimes counting is not enough: it matters which one is true. Check every part of the rule, and reject a choice if any part fails.',
      uses: [
        { who: 'You, playing tic-tac-toe', kind: 'life', text: 'Three X’s on the board do not always win. They must be in one line. You check which ones, not just how many.' },
        { who: 'Fact-checkers', kind: 'work', text: 'A real quote is sometimes given to the wrong person. Fact-checkers check two things: the words were said, and the named person said them. If either part fails, the claim is false.' },
        { who: 'Mechanics', kind: 'work', text: 'A car’s horn won’t beep, and the mechanic thinks a wire is loose. Then the wire test should fail, and every other part should test fine. If either check goes wrong, she looks again.' },
      ],
    },
  },
  skills: {
    's1.statement': ['“The library closes at 5 pm” is a statement. You can call the library and check it.'],
    's1.false-is-statement': ['True-or-false tests are full of false statements, like “A spider has six legs.” It is false, but it is still a statement.'],
    's1.not-statement': ['“Please close the door” asks for something. It is not true or false, so nobody can check it. Questions and orders work this way too.'],
    's1.opinion': ['Online reviews mix both. “This game is fun” is an opinion. “This game has 20 levels” is a statement you can check.'],
    's1.which-statement': ['“This box holds 12 pens” is a statement. You can open the box, count, and see if it is true.'],
    's1.which-not-statement': ['A coach’s “Run faster!” is an order, not a statement. Telling the two apart helps you listen for facts you can check.'],
    's1.cant-tell': [
      'Your sock is not in the first drawer, and two drawers are still shut. “The sock is in a drawer” is not false yet. You can’t tell until you look.',
      'A gift for you is still wrapped. “It is a book” is not false just because you can’t see a book. You can’t tell until you open it.',
    ],
    's1.check-cards': [
      'A mechanic finds one flat tire. “Every tire is fine” is false, no matter how the other tires look.',
      'You see one carton of milk in the fridge. “There is milk” is true, whatever is hiding at the back.',
    ],
    's1.not-every': ['On a field trip, the NOT of “Every kid is on the bus” is “At least one kid is not.” Just one is enough, so the grown-ups count everyone before the bus leaves.'],
    's1.not-some': ['The NOT of “There is a spelling mistake in your story” is “No word in your story is spelled wrong.” To say that, you must check every word.'],
    's1.not-more': ['A shop owner says, “We sold more this week than last week.” Its NOT is “Last week we sold at least as many.” If the two weeks tie, the first sentence is false.'],
    's1.not-at-least': ['A ride needs riders at least 120 cm tall. The NOT of “at least 120 cm” is “shorter than 120 cm.” “At most” is wrong: it includes a kid exactly 120 cm, who can ride.'],
    's1.not-exactly': ['Many card games need exactly 52 cards. The NOT of “This deck has exactly 52 cards” is “It does not have 52.” Too many cards is a problem, just like too few.'],
    's1.signs-count': [
      'In code-breaking games, a clue tells how many colors are in the right spot. Pretend a code is the answer and count how many would match. If the count is off, cross it out.',
      'Some grid puzzles have numbers that tell how many shaded squares touch them. Pretend a square is shaded and count around each number. If any count is too big, that square can’t be shaded.',
    ],
    's1.signs-owner': ['A lock code with the right numbers in the wrong order stays shut. Having the right numbers is not enough. Each one must be in its own place.'],
  },
};
