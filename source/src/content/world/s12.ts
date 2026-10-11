/** Real life for Stop 12, Spot the Trick (id s12, a side-track stop). See types.ts and docs/CONTENT_GUIDE.md, “Real life”. */
import type { StopWorld } from './types';

export const S12_WORLD: StopWorld = {
  stop: 'Ads and online posts often give reasons that sound good but prove nothing. Spotting the trick keeps you from being fooled.',
  lessons: {
    's12.l1': {
      why: 'An if–then rule only works forward. Wet grass does not prove it rained, because something else could have made it wet.',
      uses: [
        { who: 'You, after a test', kind: 'life', text: 'A friend says Jo must have studied, because studying makes you pass and Jo passed. But Jo may have known the answers already.' },
        { who: 'Plumbers', kind: 'work', text: 'A leak makes a wet floor. But a wet floor might come from a spilled bucket. A plumber looks for the leak before saying there is one.' },
        { who: 'Vets', kind: 'work', text: 'A sick dog may stop eating. But a dog that stops eating might just be hot or tired. A vet checks more before saying the dog is sick.' },
      ],
    },
    's12.l2': {
      why: 'Sharing a group does not make two things match. And “everyone has one” is not the same as “everyone shares one.”',
      uses: [
        { who: 'You, in a group project', kind: 'life', text: 'Every kid in your group has a job. That does not mean one kid does every job. Check who does what before you plan.' },
        { who: 'Bird watchers', kind: 'work', text: 'Robins and cardinals both have red on them. A bird watcher who spots red does not say “robin” yet. She looks at the shape and listens to the song too.' },
        { who: 'Hotel workers', kind: 'work', text: 'Every room in a hotel has a key. That does not mean one key opens every room. Workers keep a special key for that job.' },
      ],
    },
    's12.l3': {
      why: 'A reason that just says the claim again proves nothing. And an either-or is only true if no third choice is there.',
      uses: [
        { who: 'You, naming a team', kind: 'life', text: 'A friend says, “Either we are the Tigers or we have no name.” You can name a third choice, like the Comets. Then nobody is pushed into one name.' },
        { who: 'Book reviewers', kind: 'work', text: 'A reviewer can’t just write that a book is great because it is very good. That says the claim again. She gives new reasons, like a fun plot.' },
        { who: 'City planners', kind: 'work', text: 'People may say a busy road must get wider or stay jammed. Planners look for a third door, like a new bus line or a bike path.' },
      ],
    },
    's12.l4': {
      why: 'A few examples can’t prove a claim about all, and many people agreeing can’t make something true. Check all of them, or check the facts.',
      uses: [
        { who: 'You, at the store', kind: 'life', text: 'An ad says most people love a new cereal. That does not make it tasty for you. Read what is in it, or try a small box first.' },
        { who: 'Toy factory workers', kind: 'work', text: 'A toy factory can’t test two toys and call the whole batch safe. For the safety parts, workers check every single one.' },
        { who: 'Science teachers', kind: 'work', text: 'Long ago, most people thought the sun went around the Earth. Careful checks showed the Earth goes around the sun. Science goes by the facts, not by a vote.' },
      ],
    },
  },
  skills: {
    // s12.l1 Flip tricks
    's12.flip': [
      'Mom says that if it snows, school is closed. School is closed today, but that does not prove it snowed. It might be a holiday.',
      'A rule says a sick plant droops. Your plant droops, but it might just need water. Check before you call it sick.',
    ],
    // s12.l2 The middle trick, and the swap
    's12.middle': ['Dolphins and sharks both swim in the sea. That does not make a dolphin a fish. Sharing one group is not a match.'],
    's12.swap': ['Every kid in your class has a birthday. That does not mean they all share one birthday.'],
    // s12.l3 Going in circles, and only two doors
    's12.circle': ['If someone says a game is the best because nothing beats it, ask for a real reason. What makes it fun?'],
    's12.dilemma': ['When someone says, “We play my way or we don’t play,” look for a third way. You could take turns.'],
    // s12.l4 Too few, and everybody says
    's12.hasty': ['You read two pages of a book, and they are slow. The rest of the book could still be great.'],
    's12.popular': ['Lots of kids think goldfish forget everything in seconds. But tests show goldfish can learn tricks. Check the facts, not the crowd.'],
    's12.why': ['When a claim turns out true, still ask what proved it. A lucky guess and a good reason are not the same.'],
  },
};
