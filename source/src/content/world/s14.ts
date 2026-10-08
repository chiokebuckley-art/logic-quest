/** Real life for Stop 14, First Lights (the Pattern Observatory, Ring 1). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S14_WORLD: StopWorld = {
  stop: 'Drum grooves, bead bracelets and floor tiles all repeat a block. Find the shortest block, and you can tell what comes at any spot.',
  lessons: {
    's14.l1': {
      why: 'When a chain is made by repeating a block, the shortest block tells you every spot. A longer block may fit too, but the shortest one is the unit.',
      uses: [
        { who: 'Tile setters', kind: 'work', text: 'A tile setter lays a floor that repeats white, white, blue. Knowing that block, the setter can tell which tile goes in spot 40 without laying the first 39.' },
        { who: 'You, making a bracelet', kind: 'life', text: 'You string beads that repeat red, red, gold. If you stop partway, the block tells you which bead comes next. Count where you are in the block, not just the last bead.' },
        { who: 'Drummers', kind: 'work', text: 'A drummer learns a groove as a short block of beats that repeats. Once the block is clear, the drummer can come back in on the right beat after a pause.' },
      ],
    },
    's14.l2': {
      why: 'When you know a pattern’s rule, check each piece against it, all the way to the end. A wrong piece near the end is easy to miss.',
      uses: [
        { who: 'Weavers', kind: 'work', text: 'A rug is meant to repeat a block of colored stripes. Before it is done, the weaver checks each stripe against the block, to the last row, and fixes the one that is off.' },
        { who: 'You, with a chore chart', kind: 'life', text: 'Your family’s dish chart is meant to repeat you, your sister, your brother. If a week looks wrong, check each day against that order to find the day that breaks it.' },
        { who: 'Cake decorators', kind: 'work', text: 'A cake decorator pipes dots that should go pink, white, pink, white around a cake. Checking the whole ring, not just the start, finds the one dot that broke the pattern.' },
      ],
    },
    's14.l3': {
      why: 'Two patterns can share a structure even when their pieces are different. Match which spots repeat, not what the pieces look like.',
      uses: [
        { who: 'Music teachers', kind: 'work', text: 'A music teacher writes a rhythm as letters, like A, B, B. Students then clap it, tap it or play it on drums. The sounds change, but the pattern of repeats stays the same.' },
        { who: 'You, learning a dance', kind: 'life', text: 'A dance repeats step, step, turn. You can practice it as clap, clap, stomp first. If the claps match the moves spot for spot, you have the right pattern.' },
        { who: 'Poets', kind: 'work', text: 'Poets name rhyme patterns with letters. A verse whose lines end in “day, play, moon” is A, A, B, the same as one that ends in “cat, hat, sun.”' },
      ],
    },
  },
  skills: {
    // s14.l1 Star Chain
    's14.unit-why': ['A wallpaper strip shows star, moon, moon, star, moon, moon. Star, moon is not its unit: it would put a star in the third spot, where a moon is.'],
    's14.extend': ['A night light blinks green, green, purple, over and over. Count where the next blink falls in that block, and you know its color before it shines.'],
    's14.unit': ['A fence goes short post, short post, tall post, again and again. Six posts also repeat, but the unit is the shortest block: three posts.'],
    // s14.l2 Repair Bench
    's14.repair-why': ['Bathroom tiles are meant to go blue, white, blue, white. One white tile where a blue belongs breaks the rule, even if the first row looks perfect.'],
    's14.repair-find': ['A garden row is planted to repeat carrot, onion, onion. Check each plant against that block, all the way down the row, to find the one in the wrong spot.'],
    's14.repair-fix': ['A paper chain should go red, gold, red, gold. When one link breaks the rule, its spot in the block tells you which color the new link must be.'],
    's14.is-repeat': ['A friend says the songs on a playlist repeat. Before you agree, look for a block that fits every song to the very end, not just the first few.'],
    // s14.l3 Echo Bells
    's14.echo-why': ['Red, blue, blue and drum, bell, bell match: in both, the second and third spots match, and the first is different. Same spots, same structure.'],
    's14.translate': ['A coach writes a drill of run, run, jump as A, A, B. A new drill of skip, skip, hop has the same structure, so the team already knows its shape.'],
  },
};
