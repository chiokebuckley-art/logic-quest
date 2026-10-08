/** Real life for Stop 3, Line Up. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S3_WORLD: StopWorld = {
  stop: 'Schedules, seat plans and timelines of the past all put things in order. Clues that link in a chain show what is sure and what you can’t tell yet.',
  lessons: {
    's3.l1': {
      why: 'Clues that link into a chain prove things no single clue says. When no clue, and no chain of clues, links two things, the honest answer is “can’t tell.”',
      uses: [
        { who: 'You, in science class', kind: 'life', text: 'A balance shows the red block is heavier than the blue one, and blue is heavier than green. So red must be heavier than green. You don’t need to put those two on the balance.' },
        { who: 'Programmers', kind: 'work', text: 'A program finding the top score keeps the best one so far, and checks each new score only against it. The chain of “higher than” proves the one it ends with is the top, without comparing every pair.' },
        { who: 'Historians', kind: 'work', text: 'Historians, who study the past, may know two old letters were written before a third one. No clue, and no chain of clues, links those two. So they can’t tell which came first.' },
      ],
    },
    's3.l2': {
      why: '“Before” means anywhere earlier, with room for others in between. “Right before” means nothing is in between, so mixing them up puts things in the wrong spot.',
      uses: [
        { who: 'You, on a train', kind: 'life', text: 'Grandma says to get off the train before the last stop. That could be any earlier stop, so ask which one. “Right before the last stop” means just one: the next-to-last stop.' },
        { who: 'Builders', kind: 'work', text: 'Builders usually paint the walls before the new carpet goes in, so no paint drips on it. Other jobs can come in between. But tile glue is spread right before the tiles go down, while it is still wet.' },
        { who: 'Bakers', kind: 'work', text: 'A baker’s recipe says to add the eggs before the milk. So the milk can’t go in first. The eggs might go in right before the milk, or the sugar might go in between.' },
      ],
    },
    's3.l3': {
      why: 'One clue often leaves more than one spot open. “Next to” and “between” don’t say who is ahead, so try each spot before you say you’re sure.',
      uses: [
        { who: 'You, at the movies', kind: 'life', text: 'Your friend wants to sit next to you at the movies. That means no seat between you. It doesn’t say who sits on the left, so you can take either seat.' },
        { who: 'You, on a plane', kind: 'life', text: 'On the plane, your row has three seats on each side. If your seat is not by the window and not by the aisle, it must be the middle seat. No other spot is left.' },
        { who: 'Teachers', kind: 'work', text: 'A teacher plans the school show with the magic act somewhere between the choir and the dancers. So magic can’t open or close the show. The choir might come before magic, or the dancers might.' },
      ],
    },
    's3.l4': {
      why: 'Start with what is sure, then let the other clues fill the gaps. At the end, check every clue, because one false clue means something must move.',
      uses: [
        { who: 'You, doing chores', kind: 'life', text: 'Your chores: the trash goes out last, and you dust before you vacuum, so the dust gets picked up. Start with the sure spot. That leaves one order: dust, vacuum, trash.' },
        { who: 'Relay coaches', kind: 'work', text: 'A relay coach plans the order of four runners. She starts with the sure spot: her fastest runner goes last. Then rules like “Tess runs before Omar” fill the gaps, and she checks that each rule is true.' },
        { who: 'Parade planners', kind: 'work', text: 'A parade planner puts the flag carriers at the front, the sure spot. Then she fills the gaps, keeping the loud drums away from the horses so they stay calm. At the end, she checks every rule.' },
      ],
    },
    's3.l5': {
      why: 'Ask what each fact adds. A fact the other facts already prove tells you nothing new, and spotting it shows how the facts fit together.',
      uses: [
        { who: 'You, following your team', kind: 'life', text: 'Your team finished ahead of the red team, and the red team finished ahead of the blue team. Saying your team finished ahead of the blue team adds nothing new. The first two facts prove it.' },
        { who: 'Book editors', kind: 'work', text: 'Editors fix writing before a book comes out. A page says the castle is older than the bridge, and the bridge is older than the tower. They can cut “The castle is older than the tower,” since it adds nothing.' },
        { who: 'Programmers', kind: 'work', text: 'If a program already knows a number is bigger than 10, then checking that it is bigger than 5 tells it nothing new. Programmers can cut a check like that to keep the code clear.' },
      ],
    },
  },
  skills: {
    // s3.l1 Chains
    's3.chain': [
      'Your aunt is older than your mom, and your mom is older than your uncle. So your aunt is older than your uncle. No one had to say it.',
      'Scientists who study rocks use chains. In layers that were never mixed up or flipped, each layer is older than the one on top of it. So the bottom layer is the oldest.',
    ],
    's3.chain-cant-tell': [
      'Your friend is taller than you, and so is your cousin. Who is taller, your friend or your cousin? You can’t tell until they stand back to back.',
      'A swim coach knows two swimmers are both faster than a third. That does not show which of the two is fastest. She has them race each other to find out.',
    ],
    // s3.l2 Before vs right before
    's3.right-before': [
      'On a playlist, your song plays before your sister’s. Does it play right before hers? It might, but not if another song plays in between.',
      'Actors learn the line that comes right before each of their own. It is called a cue. When they hear it, they speak next, with no one in between.',
    ],
    's3.before': [
      'Your birthday comes before your friend’s in the year. That is true if your friend’s is the very next day or many months later. “Before” means anywhere earlier.',
      'At the dentist, you are called right before your brother. So you must be called before him too. “Right before” is one kind of “before.”',
    ],
    // s3.l3 Not first, not last, next to, between
    's3.not-first-last': [
      'Three friends share a new scooter, one turn each. Your turn is not first and not last. So it must be the middle turn.',
      'A pet groomer will wash four dogs today, and your dog is not first or last. That leaves two spots. You can’t tell yet which one is his.',
    ],
    's3.next-to': [
      'Two families want their tents next to each other at a campsite. So no tent goes between them. Either tent could be the one closer to the lake.',
      'A shop worker puts the pasta next to the pasta sauce, so shoppers find both. No other food sits between them. Either one could be on the left.',
    ],
    's3.between': [
      'When you set the table, the plate goes between the fork and the spoon. So the plate is not at either end. “Between” alone doesn’t say which side the fork goes on.',
      'On a trail, the waterfall is somewhere between the parking lot and the lake. Hike from the lot to the lake, or from the lake to the lot, and you pass it on the way.',
    ],
    // s3.l4 Build the whole line
    's3.build': [
      'Hanging three photos in a row? Start with the sure spot: the big one goes in the middle. The beach photo goes left of the zoo photo, so that fills the ends.',
      'People who plan school bus routes start with the sure spot: in the morning, the school is the last stop. Then they fit the other stops in before it.',
    ],
    // s3.l5 Which clue wasn’t needed?
    's3.not-needed': [
      'Your height mark on the door frame is above your brother’s, and his is above the baby’s. Saying yours is above the baby’s adds nothing new. Those two facts prove it.',
      'Directions say the pool is past the school, and the park is past the pool. A third line, “The park is past the school,” adds nothing new, because the first two prove it.',
    ],
  },
};
