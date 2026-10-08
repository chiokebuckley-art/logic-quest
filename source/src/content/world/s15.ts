/** Real life for Stop 15, Rule Rise (Pattern Observatory, Ring 2). See types.ts and docs/CONTENT_GUIDE.md, "Real life". */
import type { StopWorld } from './types';

export const S15_WORLD: StopWorld = {
  stop: 'Builders, coders and bus planners use stated rules to find far steps, tests that split two rules, and cycles counted from the right start.',
  lessons: {
    's15.l1': {
      why: 'A stated rule gives any step from its number, without building every step before it. “It adds 2 each time” only gives the next step.',
      uses: [
        { who: 'Stage builders', kind: 'work', text: 'A stage crew builds steps with one middle block and a new pair of blocks on each level. For level 12 they count 12 pairs plus the middle block, without building levels 1 to 11.' },
        { who: 'You, setting up a party', kind: 'life', text: 'Square tables pushed into one long row share their ends. The first table seats 4, and each one you add brings 2 more seats. So 10 tables seat 4 plus 18, which is 22.' },
        { who: 'Running coaches', kind: 'work', text: 'A coach plans a long run that grows by the same distance each week. Week 8 is the first week’s run plus 7 jumps, not 8, because week 1 has no jump yet.' },
      ],
    },
    's15.l2': {
      why: 'Two rules can agree on every case you have seen. Only an input where they disagree can show which one is right.',
      uses: [
        { who: 'Software testers', kind: 'work', text: 'Two price rules give the same total for one item in a cart. A tester tries a cart where the rules would give different totals. That result shows which rule the shop’s code really uses.' },
        { who: 'Electricians', kind: 'work', text: 'A lamp is dark: the bulb or the outlet could be the problem. An electrician plugs a working lamp into the outlet. If it lights, the outlet is fine, so the bulb is to blame.' },
        { who: 'You, at a science fair', kind: 'life', text: 'Your two ideas about a paper boat both predict the same trip at the fan’s low setting. So you test a higher setting, where the ideas predict different trips, to see which idea holds up.' },
      ],
    },
    's15.l3': {
      why: 'Check where a count starts. Positions start at 1, but time that passes starts at 0, so whole weeks land back on the same day.',
      uses: [
        { who: 'Zookeepers', kind: 'work', text: 'Zookeepers feed the snakes every 7 days. They count the days that pass from feeding day, which is day 0. So 28 days later is a feeding day, on the same weekday.' },
        { who: 'You, with a class job', kind: 'life', text: 'Four kids take turns at one class job, always in the same order. If you are first, your turns are slots 1, 5, 9 and so on. So slot 21 is yours too.' },
        { who: 'Bus planners', kind: 'work', text: 'Buses on a loop leave in a set order: red, blue, green, then red again. Planners count departures as positions from 1, so departure 30 ends the tenth loop with a green bus.' },
      ],
    },
  },
  skills: {
    // s15.l1 Growing Staircase
    's15.stair-why': ['Explaining a count by its parts helps others check it. “One fixed fee, plus the same charge for each hour” shows why 10 hours costs what it does.'],
    's15.stair-far': ['A garden path starts with one stone and adds a pair of stones each row. So row 20 comes from its number: 1 plus 40 stones.'],
    's15.constant-jump': ['If you put the same amount in a jar every week, week 10 holds the first week’s amount plus 9 more, not 10.'],
    's15.stair-shrink': ['A paper chain loses 2 links each day after the first. On day 10, count 9 days of taking away, because day 1 is the start.'],
    's15.grow-transfer': ['Jewelry makers who add 2 beads per link to one clasp can count the pieces for any length before they start.'],
    // s15.l2 Rule Machine
    's15.machine-why': ['Pressing the same button twice tells a game tester nothing new when both possible settings would show the same screen.'],
    's15.separate': ['To tell a dead battery from a broken switch, try a fresh battery. The two ideas predict different results, so the test picks one.'],
    's15.machine-which': ['Office workers check a spreadsheet rule against every row, not just the first one, before they trust it.'],
    's15.machine-fill': ['A baker’s rule is “2 cups of flour per batch, then 1 more cup for dusting.” It gives the flour for any number of batches.'],
    's15.machine-back': ['A ride costs a starting fee plus the same charge per mile. To find the miles from the total, take off the fee first, then see how many charges make the rest.'],
    's15.test-setting': ['Gardeners testing two ideas about plant food pick an amount where the ideas predict different heights. A test where they agree can’t pick one.'],
    // s15.l3 Clock Tower
    's15.cycle-why': ['Calendars count time that passes from day 0, while seats in a row are numbered from 1. Mixing the two puts things one off.'],
    's15.cycle-position': ['Fans at a game hold up cards that repeat four colors. A planner finds card 30’s color by its position, without counting every card.'],
    's15.cycle-elapsed': ['If swim class is every 7 days and today is class day, 28 days from today is class day too: 4 whole weeks.'],
    's15.cycle-count': ['Someone planting rose, tulip, daisy over and over can count the roses in the first 20 spots before buying any.'],
    's15.cycle-transfer': ['When a number is multiplied by itself again and again, the last digits repeat in a short block. Someone checking that work can spot a slip when a last digit breaks the block.'],
  },
};
