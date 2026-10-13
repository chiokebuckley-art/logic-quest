/** Real life for Stop 13, Clues & Chances. See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S13_WORLD: StopWorld = {
  stop: 'Before trusting a test, doctors ask how often it would say “sick” for someone who is well. If that happens often, the test alone proves little.',
  lessons: {
    's13.l1': {
      why: 'A word like Likely comes from the counts, not from one result. Likely things can fail to happen, and unlikely things sometimes happen.',
      uses: [
        { who: 'You, planting seeds', kind: 'life', text: 'The seed packet says most of its seeds will sprout. If one seed in your pot stays bare, the packet was not wrong. Most is not all.' },
        { who: 'Basketball coaches', kind: 'work', text: 'A player makes most of her free throws. When she misses one, a good coach does not call it a slump. The coach judges her by many shots, not by one miss.' },
        { who: 'Bakers', kind: 'work', text: 'Most loaves from a good recipe rise well, but now and then one comes out flat. A baker does not throw out the recipe after one flat loaf. She looks at many loaves first.' },
      ],
    },
    's13.l2': {
      why: 'When each try starts fresh, a streak does not make anything due. Only a real change, like a card kept out, changes the chances.',
      uses: [
        { who: 'You, playing Go Fish', kind: 'life', text: 'Cards in players’ hands are kept out of the pile. Once three 7s have gone into players’ hands, a 7 from the pile is less likely. Kept out, the pile changed.' },
        { who: 'Factory inspectors', kind: 'work', text: 'A machine makes a bad part now and then. After a long run of good parts, a bad one is not due. Inspectors keep checking the same way, streak or no streak.' },
        { who: 'Math teachers', kind: 'work', text: 'Math teachers have a class flip coins and write down every flip. The class sees that after a run of heads, the next flip is still heads about as often as tails.' },
      ],
    },
    's13.l3': {
      why: 'Before you guess what something is, ask how common each kind is. A common kind can win, even when the clue fits a rare kind better.',
      uses: [
        { who: 'You, watching birds', kind: 'life', text: 'You spot a small brown bird that looks a bit like a rare one in your book. But plain brown sparrows are far more common. So a sparrow is the better guess.' },
        { who: 'Doctors', kind: 'work', text: 'A cough fits a cold and many rare illnesses. Doctors think of the common cause first, because colds happen so much more often. They look further when other signs point there.' },
        { who: 'Car mechanics', kind: 'work', text: 'A strange noise could mean a big problem or a loose part. Mechanics check the common, simple causes first, because those happen far more often.' },
      ],
    },
    's13.l4': {
      why: 'A clue proves a lot only when you would rarely see it if you were wrong. If it shows up often either way, it proves little.',
      uses: [
        { who: 'School nurses', kind: 'work', text: 'A quick eye check at school flags some kids who see fine. So a flag means “see an eye doctor,” not “you need glasses.” The eye doctor’s full test decides.' },
        { who: 'You, at the front door', kind: 'life', text: 'A porch light that turns on when something moves also turns on for cats and blowing leaves. So most times it turns on, no one is there. The light alone proves little.' },
        { who: 'Spam filter builders', kind: 'work', text: 'Spam is junk email. People who build spam filters ask how often a word shows up in good email too. A word common in both tells the filter little.' },
      ],
    },
    's13.l5': {
      why: 'Both means two things at once, so it is never more than one count alone. For either, add the two counts, then take away the overlap once.',
      uses: [
        { who: 'You, guessing on a quiz', kind: 'life', text: 'A quiz has two yes or no questions you do not know. Each guess is right 1 time in every 2, and one does not affect the other. So both are right only 1 time in every 4.' },
        { who: 'Board game designers', kind: 'work', text: 'Two fair cubes do not affect each other. Each shows a 6 only 1 time in every 6, so both show a 6 just 1 time in every 36. So designers make two 6s a rare prize.' },
        { who: 'Librarians', kind: 'work', text: 'A librarian counts the kids who borrowed a book or a movie this month. Kids who borrowed both are on both lists. So she adds the lists, then takes those kids away once.' },
      ],
    },
  },
  skills: {
    // s13.l1 Likely, not certain
    's13.likely': [
      'A sign says the pool is likely to be busy on Saturday. You go and find it almost empty. The sign was not wrong, because likely is not certain.',
      'Your class jar has mostly red pencils and a few blue ones. Grabbing a blue one does not make the jar mostly blue. One grab does not change the count.',
    ],
    // s13.l2 Each draw is new
    's13.due': [
      'Take a bead from a mixed bag and keep it, and the bag has changed. Put it back, and the next pick is just like the first one.',
      'A fair coin cannot count its flips. After four tails, heads is still just as likely as tails.',
    ],
    // s13.l3 Out of 100
    's13.hundred': [
      'A library has many more story books than dictionaries. So a thick book left on a table is often a story book, even though most dictionaries are thick.',
      'A count out of 100 makes a chance easy to see. “10 of 100 kids” and “90 of 100 kids” show at once which group is rare.',
    ],
    // s13.l4 Would I see this clue if I were wrong?
    's13.clue': [
      'A dog that barks at everything is a weak clue that someone is at the door. The doorbell is a stronger clue, because it rarely rings when no one is there.',
      'A metal detector beeps over bottle caps as well as coins. On a beach full of caps, most beeps are caps, so do not expect a coin under every beep.',
    ],
    // s13.l5 And, or, with chances
    's13.both': [
      'Two fair coins do not affect each other. Of the times the first lands heads, the second lands heads 1 time in every 2. So both land heads 1 time in every 4.',
      'Both can never be more than one count alone. If 8 kids in your class play chess, at most 8 of them play chess and piano.',
    ],
    's13.either': [
      'Say 12 kids in a class play soccer, 10 play piano, and 4 do both. Then 18 kids do at least one of them, not 22.',
    ],
    's13.why': [
      'Asking why helps you find the real reason. “The coin has no memory” explains a streak better than “tails is due.”',
      'When a test says yes, the reason to doubt it is often how rare the thing is, not how bad the test is.',
    ],
  },
};
