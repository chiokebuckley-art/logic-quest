/** Real life for Stop 16, Deep Sky (Pattern Observatory, Ring 3). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S16_WORLD: StopWorld = {
  stop: 'Sewing patterns, theater seats and good comparisons all keep a link: a point and its partner, a seat and its row and number.',
  lessons: {
    's16.l1': {
      why: 'A reflection keeps each point the same distance from the mirror line, on the other side. A turn moves points to the far end, so check every point.',
      uses: [
        { who: 'Tailors', kind: 'work', text: 'Tailors fold the cloth and cut two layers at once. The two pieces come out as reflections: one sleeve for the left arm and one for the right.' },
        { who: 'You, making a paper heart', kind: 'life', text: 'Fold a sheet of paper, cut half a heart along the fold, and open it. Each point of the cut has a partner the same distance across the fold.' },
        { who: 'Ambulance crews', kind: 'work', text: 'The word on the front of an ambulance is printed as a reflection. A driver ahead sees it in a mirror, where it flips back and reads the right way.' },
      ],
    },
    's16.l2': {
      why: 'A box in a grid must fit its row and its column. Checking only one direction lets a wrong answer slip through.',
      uses: [
        { who: 'You, with a times table', kind: 'life', text: 'In a times table, each box follows its row and its column. The box in row 3 and column 4 must be 3 times 4, which is 12.' },
        { who: 'Theater ushers', kind: 'work', text: 'A theater seat is named by a row letter and a seat number. An usher checks both, because the right row with the wrong number is still the wrong seat.' },
        { who: 'Warehouse workers', kind: 'work', text: 'Shelves in a warehouse are labeled by aisle and by level. A box for aisle 4, level 2 goes only where both labels match.' },
      ],
    },
    's16.l3': {
      why: 'An analogy keeps the link between two things, not their looks. Name the link first, then test it on the new pair.',
      uses: [
        { who: 'Doctors', kind: 'work', text: 'A doctor may say the heart works like a pump. The link is what it does: it pushes liquid through tubes. It does not look like a pump at all.' },
        { who: 'Inventors', kind: 'work', text: 'An inventor saw burs stick to a dog’s fur with tiny hooks. Hook and loop tape copies that link, hooks catching loops, not the look of a bur.' },
        { who: 'You, explaining a game', kind: 'life', text: 'To explain a new board game, you might say its spinner works like dice. They do the same job: they pick a number by chance.' },
      ],
    },
  },
  skills: {
    's16.fold-why': ['A balanced house front places each window the same distance from the middle line, at the same height. Then the two sides are true reflections.'],
    's16.fold-or-turn': ['In tangram puzzles, one piece fits some shapes only when it is flipped over, not just turned. Players check which move the gap needs.'],
    's16.fold-match': ['When you fold paper to cut a snowflake, each cut on one side of a fold shows up as its reflection on the other side.'],
    's16.fold-finish': ['Artists can draw half a butterfly, then finish the other half by placing each point the same distance across the middle line.'],
    's16.fold-transfer': ['The letters b and d are reflections of each other. Young readers check which side the round part is on before they read the word.'],
    's16.grid-why': ['A ticket checker can say just what is wrong with a seat: the wrong row, the wrong number, or both.'],
    's16.grid-one': ['Some parking garages paint each level its own color. If your level is green, you can find it without reading every sign.'],
    's16.grid-two': ['Chess players name each square by a letter for its column and a number for its row. Only one square fits both.'],
    's16.grid-transfer': ['A school timetable lists days down the side and subjects across the top. To find a class, read along the day and down the subject until they meet.'],
    's16.link-why': ['On a word puzzle test, careful readers say the link as a short sentence first. Then they try each choice in that sentence.'],
    's16.link-same': ['On many maps, a bigger dot means a bigger town. Once you see that link, a small dot tells you the town is small.'],
    's16.link-across': ['Musicians call a high note “bright” and a low note “dark.” The link of opposites jumps from light to sound.'],
    's16.link-words': ['A dictionary may explain a new word with a link you know: a cub is to a bear what a puppy is to a dog.'],
    's16.link-transfer': ['Farmers use the same link for many animals: a calf grows into a cow, and a foal grows into a horse.'],
  },
};
