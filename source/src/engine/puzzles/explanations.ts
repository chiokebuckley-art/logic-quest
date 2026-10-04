/**
 * Stop 7, Lesson 2 · The best explanation (abduction).
 *
 * The model: a story with clues and three ideas (explanations). Each clue says, for each idea, whether the idea fits
 * it (the clue makes sense if the idea is true). Each idea lists its extra things: what else must be true for it to
 * work, that no clue shows. The best explanation fits every clue; among those, it needs the fewest extra things
 * (bestOf). A new clue can rule the best guess out, and then the best is worked out again.
 *
 * Every story has one clue that fits all three ideas, and one clue that rules out each idea (it fits the other two).
 * It also has a neutral clue (every idea fits it, whatever it shows): its check is the wrong "same" choice in a
 * "which check" question. It is never shown as a clue, so it never changes a best guess.
 * Every idea in a story needs a different number of extra things (0, 1 and 2), so any set of clues that leaves an
 * idea standing has exactly one best. The abstract skin (ideas X, Y, Z and clues A to D, drawn as a grid) is made at
 * random and kept only when it gives the same kind of question.
 *
 * Question kinds (skill tags): explain-best, explain-test (which check could rule one of two ideas out),
 * explain-new-clue (conflict: the old best guess is tempting) and explain-revise (can-fail: was the first best guess
 * a proof?). Every answer, explanation, wrong-choice feedback, hint case and board mark is worked out here.
 */
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, DrillMark, DrillRow, DrillStep, Rng, Scene, Teach, TeachCase, Truth } from '../types';
import type { ItemCore, Made } from './statements';

// ---------- the model ----------

export type ExplainSkin = 'everyday' | 'fantasy' | 'abstract';
export const EXPLAIN_SKINS: readonly ExplainSkin[] = ['everyday', 'fantasy', 'abstract'];
export type ExplainKind = 'best' | 'test' | 'new-clue' | 'revise';

export interface Idea {
  id: string;
  /** "Rex came in from the rain" (no period). Abstract: "Idea X". */
  text: string;
  /** "the rain idea". Abstract: "idea X". */
  name: string;
  /** "Rain": a grid row or a board option. */
  short: string;
  /** What else must be true for the idea to work, that no clue shows: "Rex got out of the yard". */
  extras: string[];
}

export interface Clue {
  id: string;
  /** "Rex is soaking wet." */
  text: string;
  /** A short grid column label: "Street wet". */
  short?: string;
  /** How you would check for it: "Go and see if Rex is wet." */
  check: string;
  /** Idea id -> does the idea fit this clue? */
  fits: Record<string, boolean>;
  /** Idea id -> why it fits or does not fit, in plain words. Every idea that does not fit has one. */
  why: Record<string, string>;
}

export interface Story {
  id: string;
  skin: ExplainSkin;
  /** Who looks at the clues: "Omar". Empty for the abstract skin. */
  who: string;
  /** The story's first line: "Omar comes home and finds a mess in the hall." */
  setting: string;
  ideas: Idea[];
  clues: Clue[];
  /** Abstract: ideas X, Y, Z and clues A to D, drawn as a grid. */
  letters?: boolean;
  /** A story's neutral clue: every idea fits it, so its check can't tell two ideas apart. Never in `clues`. */
  neutral?: Clue;
}

/** One question's case: the ideas in the order shown, the clues shown, and a new clue (new-clue and revise). */
export interface ExplainCase {
  story: Story;
  ideas: Idea[];
  shown: Clue[];
  added?: Clue;
}

export const extraCount = (i: Idea) => i.extras.length;
export const fitsAll = (i: Idea, clues: readonly Clue[]) => clues.every((c) => c.fits[i.id]);
/** The clues an idea does not fit. */
export const misses = (i: Idea, clues: readonly Clue[]) => clues.filter((c) => !c.fits[i.id]);

/** The best explanation: it fits every clue, and of those that do, it needs the fewest extra things. null when none or a tie. */
export function bestOf(ideas: readonly Idea[], clues: readonly Clue[]): Idea | null {
  const fit = ideas.filter((i) => fitsAll(i, clues));
  if (!fit.length) return null;
  const min = Math.min(...fit.map(extraCount));
  const top = fit.filter((i) => extraCount(i) === min);
  return top.length === 1 ? top[0] : null;
}

/** Every clue of a case, the new one last. */
export const allClues = (c: ExplainCase): Clue[] => [...c.shown, ...(c.added ? [c.added] : [])];

// ---------- the stories ----------

/** A story clue that rules out one idea and fits the other two. `others`: why the other ideas still fit, when it helps. */
function ruleOut(id: string, text: string, check: string, out: string, why: string, ideas: readonly string[], others: Record<string, string> = {}): Clue {
  return { id, text, check, fits: Object.fromEntries(ideas.map((i) => [i, i !== out])), why: { ...others, [out]: why } };
}

/** The story's main clue: every idea fits it. */
function main(id: string, text: string, check: string, ideas: readonly string[]): Clue {
  return { id, text, check, fits: Object.fromEntries(ideas.map((i) => [i, true])), why: {} };
}

interface StorySpec {
  id: string;
  skin: ExplainSkin;
  who: string;
  setting: string;
  main: [text: string, check: string];
  /** The neutral clue: every idea fits it, and what it shows does not touch any idea. [text, check]. */
  neutral: [text: string, check: string];
  /**
   * Each idea with its extra things and the clue that rules it out: [text, check, why it does not fit, and, when it
   * helps, why the other ideas still fit it (idea id -> why)].
   */
  ideas: { id: string; text: string; name: string; short: string; extras: string[]; out: [text: string, check: string, why: string, others?: Record<string, string>] }[];
}

function story(s: StorySpec): Story {
  const ids = s.ideas.map((i) => i.id);
  return {
    id: s.id,
    skin: s.skin,
    who: s.who,
    setting: s.setting,
    ideas: s.ideas.map(({ id, text, name, short, extras }) => ({ id, text, name, short, extras })),
    clues: [main(`${s.id}-main`, s.main[0], s.main[1], ids), ...s.ideas.map((i) => ruleOut(`${s.id}-not-${i.id}`, i.out[0], i.out[1], i.id, i.out[2], ids, i.out[3]))],
    neutral: main(`${s.id}-same`, s.neutral[0], s.neutral[1], ids),
  };
}

export const STORIES: readonly Story[] = [
  story({
    id: 'mud', skin: 'everyday', who: 'Omar',
    setting: 'Omar comes home and finds a mess in the hall.',
    main: ['Muddy paw prints lead in from the door.', 'Look for prints by the door.'],
    neutral: ['Rex is asleep in his bed.', 'Look in Rex’s bed.'],
    ideas: [
      { id: 'rain', text: 'Rex the dog came in from the rain', name: 'the rain idea', short: 'Rain', extras: [],
        out: ['It did not rain today.', 'Find out if it rained today.', 'Rex can’t come in from the rain on a day with no rain.'] },
      { id: 'pond', text: 'Rex jumped in the pond at the park', name: 'the pond idea', short: 'Pond', extras: ['Rex got out of the yard', 'Rex found his way home'],
        // The pond clue says nothing about the weather, so it can't be read as "no rain" (a dry pond would be).
        out: ['The pond at the park was emptied for cleaning yesterday.', 'Ask if the pond was emptied.', 'Rex can’t jump into a pond with no water in it.',
          { rain: 'An emptied pond tells you nothing about the rain.', paint: 'Sam’s joke does not need the pond at all.' }] },
      { id: 'paint', text: 'Sam painted the prints as a joke', name: 'the paint idea', short: 'Paint', extras: ['Sam had brown paint'],
        out: ['Rex is soaking wet.', 'Go and see if Rex is wet.', 'Painted prints on the floor would not make Rex wet.'] },
    ],
  }),
  story({
    id: 'lamp', skin: 'everyday', who: 'Hana',
    setting: 'Hana wants to read in bed, but her room stays dark.',
    main: ['Her lamp will not turn on.', 'Try the lamp switch.'],
    neutral: ['It is dark outside.', 'Look out the window.'],
    ideas: [
      { id: 'power', text: 'The power is out in the whole house', name: 'the power idea', short: 'Power out', extras: ['Hana did not notice the other lights were off'],
        out: ['The fridge is still humming.', 'Listen for the fridge.', 'A fridge can’t hum when the power is out.'] },
      { id: 'bulb', text: 'The lamp’s bulb burned out', name: 'the bulb idea', short: 'Bulb', extras: [],
        out: ['A new bulb does not light up either.', 'Try a new bulb in the lamp.', 'If the old bulb were the problem, a new bulb would light up.'] },
      { id: 'plug', text: 'Someone unplugged the lamp', name: 'the plug idea', short: 'Plug', extras: ['someone came into Hana’s room', 'they did not tell her'],
        out: ['The lamp is still plugged in.', 'Look at the plug behind the lamp.', 'A lamp that is still plugged in was not unplugged.'] },
    ],
  }),
  story({
    id: 'snow', skin: 'everyday', who: 'Kai',
    setting: 'Kai built a snowman yesterday. This morning he runs out to see it.',
    main: ['The snowman is now a lumpy pile of snow.', 'Look at the snowman.'],
    neutral: ['The carrot nose is lying in the snow.', 'Look for the carrot nose.'],
    ideas: [
      { id: 'sun', text: 'The warm sun melted it', name: 'the sun idea', short: 'Sun', extras: [],
        out: ['It was cloudy all day yesterday.', 'Find out if the sun came out yesterday.', 'The sun can’t melt snow on a day it never came out.'] },
      { id: 'kids', text: 'Some big kids knocked it over', name: 'the big kids idea', short: 'Big kids', extras: ['the kids came into the yard', 'nobody saw them'],
        out: ['There are no footprints by the snowman except Kai’s.', 'Look for footprints by the snowman.', 'Kids can’t walk up to the snowman without leaving footprints.'] },
      { id: 'rain', text: 'Rain fell on it in the night', name: 'the rain idea', short: 'Rain', extras: ['the rain was warm enough to melt snow'],
        out: ['It did not rain last night.', 'Find out if it rained last night.', 'Rain can’t fall on the snowman on a night with no rain.'] },
    ],
  }),
  story({
    id: 'plant', skin: 'everyday', who: 'Fay',
    setting: 'On Monday, Fay checks on the class plant.',
    main: ['The plant’s leaves are droopy.', 'Look at the leaves.'],
    neutral: ['A few leaves have dropped on the desk.', 'Look on the desk under the plant.'],
    ideas: [
      { id: 'dry', text: 'Nobody watered it', name: 'the water idea', short: 'No water', extras: [],
        out: ['The soil in the pot is still wet.', 'Feel the soil in the pot.', 'Wet soil means the plant has had water.'] },
      { id: 'dark', text: 'It did not get enough light', name: 'the light idea', short: 'No light', extras: ['someone moved it away from the window'],
        out: ['The plant sits in the sunny window.', 'See where the plant sits.', 'A plant in the sunny window gets lots of light.'] },
      { id: 'cold', text: 'The room got too cold over the weekend', name: 'the cold idea', short: 'Cold', extras: ['the heat went off', 'nobody noticed'],
        out: ['The room stayed warm all weekend.', 'Ask if the room stayed warm.', 'A room that stayed warm did not get too cold.'] },
    ],
  }),
  story({
    id: 'cookies', skin: 'everyday', who: 'Pia',
    setting: 'Pia baked cookies this morning. After school, she goes to get one.',
    main: ['The cookie plate on the table is empty.', 'Look at the plate.'],
    neutral: ['Pia’s mom is still at work.', 'Ask if Mom is home yet.'],
    ideas: [
      { id: 'dog', text: 'Biscuit the dog ate them', name: 'the dog idea', short: 'Dog', extras: ['Biscuit got up on the table'],
        out: ['Biscuit was at the vet all day.', 'Ask where Biscuit was today.', 'Biscuit can’t eat cookies at home while she is at the vet.'] },
      { id: 'dad', text: 'Dad put them away in the tin', name: 'the tin idea', short: 'Tin', extras: [],
        out: ['The cookie tin is empty.', 'Look inside the cookie tin.', 'If Dad put the cookies in the tin, the tin would not be empty.'] },
      { id: 'friends', text: 'Pia’s brother and his friends ate them', name: 'the friends idea', short: 'Friends', extras: ['the friends came over', 'they ate every cookie'],
        out: ['Nobody came over today.', 'Ask if anyone came over.', 'Friends can’t eat the cookies if nobody came over.'] },
    ],
  }),
  story({
    id: 'cakes', skin: 'fantasy', who: 'The cook',
    setting: 'The castle is getting ready for a party. The cook goes to fetch the cakes.',
    main: ['The cakes are gone from the kitchen table.', 'Look at the table.'],
    neutral: ['The party starts at six.', 'Ask when the party starts.'],
    ideas: [
      { id: 'dragon', text: 'Pip the dragon ate them', name: 'the dragon idea', short: 'Dragon', extras: ['Pip flew into the kitchen'],
        out: ['Pip slept in his cave all day.', 'Ask if Pip left his cave today.', 'Pip can’t eat cakes in the kitchen while he sleeps in his cave.'] },
      { id: 'mice', text: 'The castle mice ate them', name: 'the mice idea', short: 'Mice', extras: ['mice got into the kitchen', 'the mice climbed up the table'],
        out: ['No mice live in the castle.', 'Look for mice in the castle.', 'Mice can’t eat the cakes if there are no mice.'] },
      { id: 'cook', text: 'A helper moved them to the cold room', name: 'the cold room idea', short: 'Cold room', extras: [],
        out: ['Crumbs are all over the table.', 'Look for crumbs on the table.', 'Moving whole cakes would not leave crumbs all over.'] },
    ],
  }),
  story({
    id: 'wand', skin: 'fantasy', who: 'Zed',
    setting: 'Zed the wizard wakes up and reaches for his wand.',
    main: ['The wand is not on its shelf.', 'Look at the shelf.'],
    neutral: ['Zed’s hat is still on its hook.', 'Look at the hat hook.'],
    ideas: [
      { id: 'owl', text: 'Hoot the owl carried it off', name: 'the owl idea', short: 'Owl', extras: ['Hoot flew in the window'],
        out: ['The tower window was shut all night.', 'See if the window was shut.', 'Hoot can’t fly in through a shut window.'] },
      { id: 'fell', text: 'It rolled off the shelf', name: 'the fall idea', short: 'Fall', extras: [],
        out: ['The wand is not on the floor anywhere.', 'Look on the floor.', 'A wand that rolled off the shelf would be on the floor.'] },
      { id: 'tia', text: 'Tia, his helper, borrowed it', name: 'the helper idea', short: 'Helper', extras: ['Tia came up to the tower', 'Tia forgot to ask'],
        out: ['Tia has been away at her aunt’s all week.', 'Ask where Tia was this week.', 'Tia can’t borrow the wand while she is far away.'] },
    ],
  }),
  story({
    id: 'egg', skin: 'fantasy', who: 'Lia',
    setting: 'Lia the dragon keeper checks the nest.',
    main: ['The dragon egg feels warm.', 'Feel the egg.'],
    neutral: ['The egg has no cracks.', 'Look for cracks in the egg.'],
    ideas: [
      { id: 'mom', text: 'The mother dragon sat on it', name: 'the mother idea', short: 'Mother', extras: [],
        out: ['The mother dragon is away over the sea this week.', 'Find out where the mother dragon is.', 'She can’t sit on the egg while she is far away.'] },
      { id: 'sun', text: 'The sun warmed it', name: 'the sun idea', short: 'Sun', extras: ['the sun shone right on the nest'],
        out: ['It has been dark and rainy all day.', 'Find out if the sun was out.', 'The sun can’t warm the egg on a dark, rainy day.'] },
      { id: 'spell', text: 'A wizard put a warm spell on it', name: 'the spell idea', short: 'Spell', extras: ['a wizard came by', 'the wizard knew a warm spell'],
        out: ['A spell always leaves a blue glow, and the egg has none.', 'Look for a blue glow on the egg.', 'A spell would leave a blue glow, and there is no glow.'] },
    ],
  }),
  story({
    id: 'robot', skin: 'fantasy', who: 'Nia',
    setting: 'Nia’s robot, Bo, was helping in the garden.',
    main: ['Bo has stopped on the path and will not move.', 'Look at Bo.'],
    neutral: ['Bo has pulled up half the weeds.', 'Look at the weeds.'],
    ideas: [
      { id: 'battery', text: 'Bo’s battery ran out', name: 'the battery idea', short: 'Battery', extras: [],
        out: ['Bo’s battery light shows it is full.', 'Look at Bo’s battery light.', 'A battery that ran out would not show full.'] },
      { id: 'stick', text: 'A stick is caught in Bo’s wheel', name: 'the stick idea', short: 'Stick', extras: ['a stick fell on the path'],
        out: ['Nothing is caught in Bo’s wheels.', 'Look in Bo’s wheels.', 'A stick can’t be caught in the wheels if nothing is there.'] },
      { id: 'spell', text: 'A sleep spell hit Bo by mistake', name: 'the spell idea', short: 'Spell', extras: ['a wizard was in the garden', 'the spell went the wrong way'],
        out: ['No wizard has been in the garden today.', 'Ask if a wizard came by.', 'A sleep spell needs a wizard, and none came by.'] },
    ],
  }),
];

// ---------- the worked example: the wet grass (cards and boards only, never a quiz) ----------

/** Every clue of the worked example has a reason for every idea, so each board mark can say why. */
export const WORKED: Story = {
  id: 'grass',
  skin: 'everyday',
  who: 'Ava',
  setting: 'Ava wakes up. The grass outside is wet.',
  ideas: [
    { id: 'rain', text: 'It rained in the night', name: 'the rain idea', short: 'Rain', extras: [] },
    { id: 'sprinkler', text: 'The sprinkler ran in the night', name: 'the sprinkler idea', short: 'Sprinkler', extras: ['someone set the sprinkler to run at night'] },
    {
      id: 'truck',
      text: 'A truck sprayed the street, and the sprinkler ran',
      name: 'the truck idea',
      short: 'Truck',
      extras: ['two different things happened on the same night', 'someone set the sprinkler to run at night'],
    },
  ],
  clues: [
    {
      id: 'grass', text: 'The grass is wet.', short: 'Grass wet', check: 'Look at the grass.',
      fits: { rain: true, sprinkler: true, truck: true },
      why: { rain: 'Rain wets the grass.', sprinkler: 'A sprinkler wets the grass.', truck: 'In this idea, the sprinkler wets the grass.' },
    },
    {
      id: 'street', text: 'The street is wet too.', short: 'Street wet', check: 'Look at the street.',
      fits: { rain: true, sprinkler: false, truck: true },
      why: { rain: 'Rain falls on the street as well as the grass.', sprinkler: 'A sprinkler waters only the grass. It does not reach the street.', truck: 'The truck sprays the street, so the street gets wet.' },
    },
    {
      id: 'noRain', text: 'The weather report says no rain fell.', short: 'No rain fell', check: 'Read the weather report.',
      fits: { rain: false, sprinkler: true, truck: true },
      why: { rain: 'If no rain fell, it did not rain in the night.', sprinkler: 'A sprinkler works with no rain.', truck: 'A truck and a sprinkler work with no rain.' },
    },
    {
      id: 'roof', text: 'The roof of the house is dry.', short: 'Roof dry', check: 'Look at the roof.',
      fits: { rain: false, sprinkler: true, truck: true },
      why: { rain: 'Rain in the night would wet the roof too.', sprinkler: 'A sprinkler does not reach the roof, so the roof stays dry.', truck: 'A truck and a sprinkler do not reach the roof, so the roof stays dry.' },
    },
  ],
};

const wclue = (id: string) => WORKED.clues.find((c) => c.id === id)!;
/**
 * The worked example's clues: the two on the example card, the new one on the last card, and the board's new one.
 * The board's clue (the dry roof) has marks unlike either shown column, so it can't be marked by copying, and with it
 * the simplest idea is out: fitting every clue comes before counting extra things.
 */
export const WORKED_SHOWN: readonly Clue[] = [wclue('grass'), wclue('street')];
export const WORKED_NEW: Clue = wclue('noRain');
export const WORKED_BOARD: Clue = wclue('roof');

// ---------- words ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LETTERS = 'ABCD';
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const joinAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`);

/** An idea in a sentence: “Rex came in from the rain” in a story, idea X (Idea X at the start) in a grid. */
const q = (s: Story, i: Idea, start = false) => (s.letters ? (start ? i.text : i.name) : `“${i.text}”`);
/** The same at the end of a sentence, with the period inside the quotes: “Rex came in from the rain.” */
const qEnd = (s: Story, i: Idea, start = false) => (s.letters ? `${start ? i.text : i.name}.` : `“${i.text}.”`);
/** "the rain idea", or "idea X". */
const nm = (i: Idea, start = false) => (start ? cap(i.name) : i.name);
/** "clue 2", or "clue B". */
const clueName = (s: Story, k: number) => `clue ${s.letters ? LETTERS[k] : k + 1}`;
/** "clues 1 and 2", "clues A, B and C". */
const clueNames = (s: Story, n: number) => {
  const xs = Array.from({ length: n }, (_, k) => (s.letters ? LETTERS[k] : String(k + 1)));
  return `clues ${xs.length === 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`}`;
};
/** "both clues" / "all three clues". */
const everyClue = (n: number) => (n === 2 ? 'both clues' : n === 3 ? 'all three clues' : 'every clue');

/** "nothing extra", "1 extra thing: Sam had brown paint", "2 extra things". */
function extrasPhrase(s: Story, i: Idea, list = true): string {
  const n = extraCount(i);
  if (n === 0) return 'nothing extra';
  return `${plural(n, 'extra thing')}${list && !s.letters ? `: ${joinAnd(i.extras)}` : ''}`;
}

/** What a clue says about an idea: its reason in a story, or the grid box in the abstract skin. */
function clueWhy(s: Story, c: Clue, k: number, i: Idea): string {
  if (s.letters) return `${nm(i, true)} has a ${c.fits[i.id] ? '✓' : '✗'} under ${clueName(s, k)}.`;
  return c.why[i.id] ?? `${nm(i, true)} fits it.`;
}

/** A clue by name with its words, ending a sentence: clue 2: “Rex is soaking wet.” In a grid, just clue B. */
const withText = (s: Story, k: number, c: Clue) => (s.letters ? `${clueName(s, k)}.` : `${clueName(s, k)}: “${c.text}”`);

/** “It did not rain today,” (a clue in the middle of a sentence, with its period turned into a comma). */
const quoteMid = (text: string) => `“${text.replace(/\.$/, '')},”`;

/** The line for one idea in a story scene: “Rex came in from the rain” needs nothing extra. */
const needsLine = (s: Story, i: Idea) => `${q(s, i)} needs ${extraCount(i) === 0 ? 'no extra things' : extrasPhrase(s, i)}.`;

/** A grid row label: "Rain (0 extras)". */
const rowLabel = (i: Idea) => `${i.short} (${plural(extraCount(i), 'extra')})`;

/** A grid of ideas by clues: ✓ fits, ✗ does not fit. */
export function gridScene(ideas: readonly Idea[], cols: { id: string; label: string; clue: Clue }[], caption: string): Extract<Scene, { kind: 'grid' }> {
  return {
    kind: 'grid',
    rows: ideas.map((i) => ({ id: i.id, label: rowLabel(i) })),
    cols: cols.map(({ id, label }) => ({ id, label })),
    marks: Object.fromEntries(ideas.map((i) => [i.id, Object.fromEntries(cols.map(({ id, clue }) => [id, clue.fits[i.id] ? 'yes' : 'no'] as const))])),
    caption,
  };
}

/** The scene of a question: the clues and each idea's extra things (a story), or the grid (abstract). */
function sceneOf(c: ExplainCase, o: { unseen?: Clue[]; firstBest?: Idea; nowBest?: Idea } = {}): Scene {
  const s = c.story;
  if (s.letters) {
    const cols = c.shown.map((cl, k) => ({ id: cl.id, label: `Clue ${LETTERS[k]}`, clue: cl }));
    let caption = '✓ means the idea fits the clue. ✗ means it does not.';
    if (c.added) {
      const k = c.shown.length;
      cols.push({ id: c.added.id, label: `New clue ${LETTERS[k]}`, clue: c.added });
      caption = `Clue ${LETTERS[k]} is new. ${caption}`;
    }
    if (o.unseen) {
      o.unseen.forEach((cl, j) => cols.push({ id: cl.id, label: `Clue ${LETTERS[c.shown.length + j]}?`, clue: cl }));
      caption = `Clues A and B were found. Clues C and D are not checked yet. ✓ means the idea fits the clue.`;
    }
    return gridScene(c.ideas, cols, caption);
  }
  // Every idea is always shown with its extra things, so each idea the hint or teaching names has been seen.
  const lines = c.shown.map((cl, k) => `Clue ${k + 1}: ${cl.text}`);
  const needs = c.ideas.map((i) => needsLine(s, i));
  if (o.firstBest) {
    // Was it a proof: the first clues, every idea, the first best guess, then the new clue and the best guess now.
    lines.push(...needs, `Best guess: ${qEnd(s, o.firstBest)}`);
    if (c.added) lines.push(`New clue ${c.shown.length + 1}: ${c.added.text}`);
    if (o.nowBest) lines.push(`Best guess now: ${qEnd(s, o.nowBest)}`);
  } else {
    if (c.added) lines.push(`New clue ${c.shown.length + 1}: ${c.added.text}`);
    lines.push(...needs);
  }
  return { kind: 'text', lines };
}

/** The opening of a prompt: the story's first line, or the grid. */
const opening = (s: Story) => (s.letters ? 'The grid shows three ideas and the clues found.' : s.setting);

// ---------- teaching ----------

const TERMS = [
  { word: 'An explanation', meaning: 'an idea that makes the clues make sense. We call each one an idea.' },
  { word: 'Fits a clue', meaning: 'the clue makes sense if the idea is true.' },
  { word: 'An extra thing', meaning: 'something more that must be true for the idea to work. No clue shows it.' },
  { word: 'A best guess', meaning: 'the idea that fits best so far. It is not a proof, so you still check it.' },
];

/** One idea checked on every clue: a truth per clue, and what that means. */
export function ideaCase(c: ExplainCase, i: Idea, clues: readonly Clue[] = allClues(c), hint = false): TeachCase {
  const s = c.story;
  const truths: Truth[] = clues.map((cl, k) => ({ who: `Fits ${clueName(s, k)}`, value: !!cl.fits[i.id] }));
  const best = bestOf(c.ideas, clues);
  const missK = clues.findIndex((cl) => !cl.fits[i.id]);
  let note: string;
  if (missK >= 0) note = `It does not fit ${clueName(s, missK)}. ${clueWhy(s, clues[missK], missK, i)} So it is out.`;
  else if (best && best.id === i.id && fitters(c.ideas, clues).length === 1) note = `It is the only idea that fits ${everyClue(clues.length)}. It is the best guess.`;
  else if (best && best.id === i.id) note = `It fits ${everyClue(clues.length)}, and no other idea that fits needs as few extra things. It is the best guess.`;
  // A hint never names the best: it says what to look at next.
  else if (hint) note = `It fits ${everyClue(clues.length)}. It needs ${extrasPhrase(s, i, false)}. Does another idea fit with fewer?`;
  else note = `It fits ${everyClue(clues.length)}, but ${best ? q(s, best) : 'another idea'} fits too and needs fewer extra things.`;
  return { label: `${qEnd(s, i, true)} It needs ${extrasPhrase(s, i)}.`, truths, note };
}

const BEST_REMEMBER = ['First cross out any idea that misses a clue. Then pick the one with the fewest extra things.', 'Ask: “Does this idea fit every clue? What else must be true?”'];

function bestSimpler(c: ExplainCase, clues: readonly Clue[]): string[] {
  const s = c.story;
  const i = c.ideas.find((x) => !fitsAll(x, clues)) ?? c.ideas[0];
  const k = clues.findIndex((cl) => !cl.fits[i.id]);
  const k0 = k >= 0 ? k : 0;
  return [
    `Take one idea: ${qEnd(s, i)}`,
    `Read ${clueName(s, k0)}. Would it make sense if the idea were true? ${clueWhy(s, clues[k0], k0, i)}`,
    'Do this for every idea and every clue. One clue that an idea does not fit, and that idea is out.',
    'Of the ideas left, count the extra things each one needs. The fewest wins.',
  ];
}

function bestTeach(c: ExplainCase, clues: readonly Clue[], rule: string, meaning: string): Teach {
  return {
    rule,
    terms: TERMS,
    meaning,
    casesTitle: 'How does each idea do on every clue?',
    cases: c.ideas.map((i) => ideaCase(c, i, clues)),
    remember: BEST_REMEMBER,
    simpler: bestSimpler(c, clues),
  };
}

/** Why one idea is not the best for these clues: a clue it misses, or more extra things than the best. */
function notBestFeedback(c: ExplainCase, i: Idea, best: Idea, clues: readonly Clue[]): ChoiceFeedback {
  const s = c.story;
  const k = clues.findIndex((cl) => !cl.fits[i.id]);
  const example = ideaCase(c, i, clues);
  if (k >= 0) {
    return {
      headline: `Your answer does not fit ${withText(s, k, clues[k])}`,
      detail: [
        `Your answer is ${qEnd(s, i)} ${clueWhy(s, clues[k], k, i)}`,
        `The best explanation must fit every clue, so this idea is out. ${q(s, best, true)} fits ${everyClue(clues.length)}.`,
      ],
      example,
    };
  }
  // Why the better idea still fits a clue that might look like it rules it out ("An emptied pond tells you nothing about the rain.").
  const bestFits = s.letters ? [] : clues.flatMap((cl) => (cl.why[best.id] ? [cl.why[best.id]] : []));
  return {
    headline: `Your answer fits every clue, but another idea fits too and needs fewer extra things.`,
    detail: [
      `${q(s, i, true)} needs ${extrasPhrase(s, i)}.`,
      `${q(s, best, true)} also fits ${everyClue(clues.length)}, and it needs ${extrasPhrase(s, best)}.${bestFits.map((w) => ` ${w}`).join('')}`,
      'When two ideas fit every clue, the one with fewer extra things is the better guess.',
    ],
    example,
  };
}

/** "“X” fits both clues and needs nothing extra. “Y” fits too, but needs 2 extra things. “Z” does not fit clue 2." */
function explainBest(c: ExplainCase, best: Idea, clues: readonly Clue[]): string {
  const s = c.story;
  const others = c.ideas.filter((i) => i.id !== best.id);
  const fitters = others.filter((i) => fitsAll(i, clues));
  const missers = others.filter((i) => !fitsAll(i, clues));
  const parts = [fitters.length ? `${q(s, best, true)} fits ${everyClue(clues.length)} and needs ${extrasPhrase(s, best, false)}.` : `${q(s, best, true)} is the only idea that fits ${everyClue(clues.length)}.`];
  for (const f of fitters) parts.push(`${q(s, f, true)} fits too, but it needs ${extrasPhrase(s, f, false)}.`);
  if (missers.length === 1) {
    const k = clues.findIndex((cl) => !cl.fits[missers[0].id]);
    parts.push(`${q(s, missers[0], true)} does not fit ${clueName(s, k)}.`);
  } else if (missers.length === 2) parts.push('The other two ideas each miss a clue.');
  return parts.join(' ');
}

// ---------- picking a case ----------

function subsets<T>(xs: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (xs.length < k) return [];
  const [h, ...t] = xs;
  return [...subsets(t, k - 1).map((r) => [h, ...r]), ...subsets(t, k)];
}

/** Ideas that fit every shown clue, for a "which check" question: exactly two. */
const fitters = (ideas: readonly Idea[], clues: readonly Clue[]) => ideas.filter((i) => fitsAll(i, clues));
/** A clue that one of two ideas fits and the other does not: finding it rules one out. */
const splits = (pair: readonly Idea[], c: Clue) => pair.filter((i) => c.fits[i.id]).length === 1;

interface TestCase extends ExplainCase {
  pair: [Idea, Idea];
  /** The check that could rule one of the pair out. */
  split: Clue;
  /** A clue both of the pair fit, that is not found yet: its check is a wrong choice (a story's neutral clue). */
  same?: Clue;
}

/**
 * The clue sets a story can show for a kind of question. The story's main clue (what happened) always comes first,
 * so the question is clear; the other clues each rule out one idea.
 */
function storyCases(s: Story, kind: ExplainKind, size?: number): { shown: Clue[]; added?: Clue }[] {
  const [first, ...rest] = s.clues;
  const sets = (k: number) => subsets(rest, k - 1).map((r) => [first, ...r]);
  if (kind === 'best') {
    const sizes = size ? [size] : [2, 3];
    return sizes.flatMap(sets).filter((sh) => bestOf(s.ideas, sh)).map((shown) => ({ shown }));
  }
  if (kind === 'test') return sets(2).filter((sh) => fitters(s.ideas, sh).length === 2).map((shown) => ({ shown }));
  return sets(2).flatMap((shown) => {
    const b = bestOf(s.ideas, shown);
    if (!b) return [];
    return s.clues
      .filter((c) => !shown.includes(c) && !c.fits[b.id] && bestOf(s.ideas, [...shown, c]))
      .map((added) => ({ shown, added }));
  });
}

/** A random abstract grid: ideas X, Y, Z needing 0, 1 and 2 extra things in some order, and clues A to D. */
function abstractStory(rng: Rng): Story {
  const ex = rng.shuffle([0, 1, 2]);
  const ideas: Idea[] = ['X', 'Y', 'Z'].map((L, k) => ({
    id: L.toLowerCase(),
    text: `Idea ${L}`,
    name: `idea ${L}`,
    short: `Idea ${L}`,
    extras: Array.from({ length: ex[k] }, (_, j) => `extra thing ${j + 1}`),
  }));
  const clues: Clue[] = [...LETTERS].map((L) => ({
    id: L.toLowerCase(),
    text: `Clue ${L}.`,
    check: `Look for clue ${L}.`,
    fits: Object.fromEntries(ideas.map((i) => [i.id, rng.chance(0.6)])),
    why: {},
  }));
  return { id: 'abstract', skin: 'abstract', who: '', setting: '', ideas, clues, letters: true };
}

function abstractCase(rng: Rng, kind: ExplainKind, size?: number): ExplainCase | TestCase {
  for (let n = 0; n < 2000; n++) {
    const s = abstractStory(rng);
    const [A, B, C, D] = s.clues;
    if (kind === 'best') {
      const shown = s.clues.slice(0, size ?? rng.int(2, 3));
      const best = bestOf(s.ideas, shown);
      // At least one idea misses a clue, so fitting comes before counting extra things.
      if (best && s.ideas.some((i) => !fitsAll(i, shown))) return { story: s, ideas: s.ideas, shown };
      continue;
    }
    if (kind === 'test') {
      const shown = [A, B];
      const pair = fitters(s.ideas, shown);
      if (pair.length !== 2) continue;
      const split = [C, D].filter((c) => splits(pair, c));
      const same = [C, D].filter((c) => pair.every((i) => c.fits[i.id]));
      if (split.length !== 1 || same.length !== 1) continue;
      return { story: s, ideas: s.ideas, shown, pair: [pair[0], pair[1]], split: split[0], same: same[0] };
    }
    const shown = [A, B];
    const b = bestOf(s.ideas, shown);
    if (b && !C.fits[b.id] && bestOf(s.ideas, [A, B, C])) return { story: s, ideas: s.ideas, shown, added: C };
  }
  throw new Error(`abstractCase: no ${kind} case found`);
}

/** A story of this skin, not one already used in the set. */
function pickStory(rng: Rng, skin: ExplainSkin, avoid?: Set<string>): Story {
  const pool = STORIES.filter((s) => s.skin === skin);
  const fresh = pool.filter((s) => !avoid?.has(s.id));
  const s = rng.pick(fresh.length ? fresh : pool);
  avoid?.add(s.id);
  return s;
}

function makeCase(rng: Rng, kind: ExplainKind, skin: ExplainSkin, avoid?: Set<string>, size?: number): ExplainCase {
  if (skin === 'abstract') return abstractCase(rng, kind, size);
  const s = pickStory(rng, skin, avoid);
  const pick = rng.pick(storyCases(s, kind, size));
  return { story: s, ideas: rng.shuffle(s.ideas), shown: pick.shown, added: pick.added };
}

// ---------- the items ----------

/** A made item, plus its case (for tests). */
export interface ExplainMade extends Made {
  kind: ExplainKind;
  case: ExplainCase;
}

export interface ExplainOptions {
  skin: ExplainSkin;
  /** Story ids already used in this set: a new story is picked when one is left. */
  avoid?: Set<string>;
  /** explain-best: how many clues (2 or 3). */
  clues?: 2 | 3;
}

const ideaChoices = (c: ExplainCase): Choice[] => c.ideas.map((i) => ({ id: i.id, label: i.text }));

/**
 * Check time for every explanation item: with three ideas, their extra things and two or three clues, these read
 * long (about 100-140 words), so they get 120 seconds instead of the default 90. The "Was it a proof?" story also
 * shows its first and new best guess (up to about 190 words), so it gets 150 seconds.
 */
export const EXPLAIN_SECONDS = 120;
export const REVISE_SECONDS = 150;

function done(tag: string, kind: ExplainKind, c: ExplainCase, item: ItemCore): ExplainMade {
  item.seconds = kind === 'revise' ? REVISE_SECONDS : EXPLAIN_SECONDS;
  syncWhyWrong(item);
  return { tag, item, kind, case: c };
}

/** Which explanation is best? */
export function bestItem(rng: Rng, o: ExplainOptions): ExplainMade {
  const c = makeCase(rng, 'best', o.skin, o.avoid, o.clues);
  const s = c.story;
  const best = bestOf(c.ideas, c.shown)!;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const i of c.ideas) if (i.id !== best.id) feedback[i.id] = notBestFeedback(c, i, best, c.shown);
  // The hint shows an idea that misses a clue (every case has one), so it never points at the answer.
  const hintIdea = c.ideas.find((i) => i.id !== best.id && !fitsAll(i, c.shown)) ?? c.ideas.find((i) => i.id !== best.id)!;
  return done('explain-best', 'best', c, {
    kind: 'choose',
    prompt: `${opening(s)} Which explanation is best?`,
    scene: sceneOf(c),
    choices: ideaChoices(c),
    answer: best.id,
    explain: explainBest(c, best, c.shown),
    feedback,
    hint: 'Here is one idea, checked on every clue. Check the other ideas the same way. Then count extra things.',
    hintCase: ideaCase(c, hintIdea, c.shown, true),
    teach: bestTeach(c, c.shown, 'The best explanation fits every clue. If two ideas fit every clue, pick the one with the fewest extra things.', `There are ${c.shown.length} clues and 3 ideas. Test each idea on each clue. Then look at the extra things.`),
  });
}

/** Which check could rule one of the two ideas out? */
export function testItem(rng: Rng, o: ExplainOptions): ExplainMade {
  const base = makeCase(rng, 'test', o.skin, o.avoid);
  const s = base.story;
  let c: TestCase;
  if ('split' in base) c = base as TestCase;
  else {
    const pair = fitters(base.ideas, base.shown) as [Idea, Idea];
    const split = rng.pick(s.clues.filter((cl) => !base.shown.includes(cl) && splits(pair, cl)));
    c = { ...base, pair, split, same: s.neutral };
  }
  const [A, B] = c.pair;
  const out = c.ideas.find((i) => !c.pair.includes(i))!;
  const kept = c.split.fits[A.id] ? A : B;
  const ruled = kept === A ? B : A;
  const k = rng.int(0, c.shown.length - 1);
  const again = c.shown[k];
  const simpler = extraCount(A) < extraCount(B) ? A : B;
  const againLabel = `Look again at ${withText(s, k, again)}`;
  // The checks in any order, so the answer is not always in the same place; "no check" stays last.
  const choices: Choice[] = [
    ...rng.shuffle<Choice>([
      { id: 'split', label: c.split.check },
      { id: 'again', label: `Look at ${clueName(s, k)} again.` },
      ...(c.same ? [{ id: 'same', label: c.same.check }] : []),
    ]),
    { id: 'none', label: 'No check is needed. Go with the simpler idea.' },
  ];
  const splitLetter = s.letters ? LETTERS[s.clues.indexOf(c.split)] : '';
  const ifShows = s.letters ? `If clue ${splitLetter} turns up,` : `If the check shows ${quoteMid(c.split.text)}`;
  const both = `${nm(A)} and ${nm(B)}`;
  const bothStart = `${nm(A, true)} and ${nm(B)}`;
  const feedback: Record<string, ChoiceFeedback> = {
    again: {
      headline: `Both ideas already fit ${clueName(s, k)}, so looking at it again can’t rule either one out.`,
      detail: [
        `Your answer looks again at ${withText(s, k, again)}`,
        `${bothStart} both fit it. Whatever you see, both ideas stay in.`,
        'A good check is a clue that one idea fits and the other does not.',
      ],
      example: checkCase(c, again, againLabel),
    },
    none: {
      headline: 'Your answer skips the check, but a best guess is not a proof.',
      detail: [
        `${nm(simpler, true)} needs fewer extra things, so it is the better guess for now.`,
        `But ${both} both fit every clue so far. A new clue could still rule out either one.`,
        'So look for a clue that one idea fits and the other does not. Then check it.',
      ],
    },
  };
  const sameLabel = c.same && (s.letters ? c.same.check : `${c.same.check} It could show: “${c.same.text}”`);
  if (c.same && s.letters) {
    const L = LETTERS[s.clues.indexOf(c.same)];
    feedback.same = {
      headline: `Both ideas fit clue ${L}, so finding it can’t rule either one out.`,
      detail: [`Your answer looks for clue ${L}. ${bothStart} both have a ✓ under clue ${L}.`, `Found or not, clue ${L} leaves both ideas in. It can’t tell them apart.`],
      example: checkCase(c, c.same, sameLabel!),
    };
  } else if (c.same) {
    feedback.same = {
      headline: 'Both ideas fit what this check could find, so it can’t rule either one out.',
      detail: [
        `Your answer is the check “${c.same.check}” It could show: “${c.same.text}”`,
        `${bothStart} both fit that. Whatever it shows, both ideas stay in.`,
        'A good check is a clue that one idea fits and the other does not.',
      ],
      example: checkCase(c, c.same, sameLabel!),
    };
  }
  const explain = s.letters
    ? `${nm(kept, true)} fits clue ${splitLetter}, but ${nm(ruled)} does not. ${ifShows} ${nm(ruled)} is out. So this check could rule one idea out.`
    : `Both ideas fit the clues so far. ${ifShows} ${nm(ruled)} is out. So this check could rule one idea out.`;
  const cases = [checkCase(c, c.split, s.letters ? c.split.check : `${c.split.check} It could show: “${c.split.text}”`), checkCase(c, again, againLabel)];
  if (c.same) cases.push(checkCase(c, c.same, sameLabel!));
  cases.push({ label: 'No check.', note: 'Nothing new is found, so both ideas stay in.' });
  return done('explain-test', 'test', c, {
    kind: 'choose',
    prompt: `${opening(s)} Two explanations fit ${everyClue(c.shown.length)}: ${q(s, A)} and ${qEnd(s, B)} Which check could rule one of them out?`,
    scene: sceneOf(c, s.letters ? { unseen: s.clues.slice(2) } : {}),
    choices,
    answer: 'split',
    explain,
    feedback,
    hint: 'Here is one check, worked out. Look for a check that one idea fits and the other does not.',
    hintCase: checkCase(c, again, againLabel),
    teach: {
      rule: 'To test two ideas, look for a clue that one idea fits and the other does not. Finding it rules one idea out.',
      terms: TERMS,
      meaning: `${bothStart} both fit every clue so far. ${nm(out, true)} is already out, because it misses a clue.`,
      casesTitle: 'What could each check tell you?',
      cases,
      remember: ['A good check is one the two ideas disagree on.', 'Ask: “Which clue fits one idea but not the other?”'],
      simpler: [
        s.letters ? `Take the check for clue ${splitLetter}.` : `Take the check “${c.split.check}”`,
        s.letters
          ? `${nm(kept, true)} has a ✓ under clue ${splitLetter}. ${nm(ruled, true)} has a ✗.`
          : `It could show “${c.split.text}” ${nm(kept, true)} fits that. ${nm(ruled, true)} does not. ${clueWhy(s, c.split, s.clues.indexOf(c.split), ruled)}`,
        `So if the check shows it, ${nm(ruled)} is out. The two ideas disagree, so the check is useful.`,
      ],
    },
  });
}

/** One check in a "which check" question: does each of the two ideas fit what it could find? */
function checkCase(c: TestCase, cl: Clue, label: string): TeachCase {
  const truths = c.pair.map((i) => ({ who: `${nm(i, true)} fits`, value: !!cl.fits[i.id] }));
  const one = splits(c.pair, cl);
  return {
    label,
    truths,
    note: one ? 'One idea fits it and one does not. This check could rule one idea out.' : 'Both ideas fit it. This check can’t rule either one out.',
  };
}

/** A new clue: which explanation is best now? */
export function newClueItem(rng: Rng, o: ExplainOptions): ExplainMade {
  const c = makeCase(rng, 'new-clue', o.skin, o.avoid);
  const s = c.story;
  const clues = allClues(c);
  const before = bestOf(c.ideas, c.shown)!;
  const now = bestOf(c.ideas, clues)!;
  const kNew = c.shown.length;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const i of c.ideas) {
    if (i.id === now.id) continue;
    if (i.id === before.id) {
      feedback[i.id] = {
        headline: 'Your answer was the best guess before, but it does not fit the new clue.',
        detail: [
          `The new clue is ${withText(s, kNew, c.added!)} ${clueWhy(s, c.added!, kNew, i)}`,
          `An idea that misses a clue is out, even if it was the best guess before. ${q(s, now, true)} fits ${everyClue(clues.length)} now.`,
        ],
        example: ideaCase(c, i, clues),
      };
    } else feedback[i.id] = notBestFeedback(c, i, now, clues);
  }
  const third = c.ideas.find((i) => i.id !== before.id && i.id !== now.id)!;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${opening(s)} At first, ${q(s, before)} was the best guess. Then a new clue turned up. Which explanation is best now?`,
    scene: sceneOf(c),
    choices: ideaChoices(c),
    answer: now.id,
    explain: `${clueWhy(s, c.added!, kNew, before)} So ${q(s, before)} is out. ${q(s, now, true)} fits ${everyClue(clues.length)}${fitters(c.ideas, clues).length > 1 ? ' and needs the fewest extra things' : ''}, so it is the best guess now.`,
    feedback,
    hint: 'Here is one idea, checked on every clue, the new one too. Check the other ideas the same way.',
    hintCase: ideaCase(c, third, clues, true),
    teach: bestTeach(
      c,
      clues,
      'When a new clue comes, test every idea again. An idea that misses the new clue is out, so the best guess can change.',
      `Before, ${q(s, before)} was the best guess. The new clue is ${withText(s, kNew, c.added!)}`,
    ),
    conflict: true,
  };
  return done('explain-new-clue', 'new-clue', c, item);
}

/** The two ways to ask "was the first best guess a proof?", each with its own four answers. */
const REVISE_ASKS = [
  {
    ask: (who: string, first: string, clues: string) => `${who} picked ${first} as the best guess for ${clues}. Then a new clue ruled it out. Was that first best guess a proof?`,
    guess: 'No. It was a best guess to test.',
    fit: 'Yes. It fit every clue, so it had to be true.',
    simple: 'Yes. The simplest idea is always right.',
    bad: 'No. It was a bad guess from the start.',
  },
  {
    ask: (who: string, first: string, clues: string) => `${who} picked ${first} as the best guess for ${clues}. Then a new clue came. Did the first clues prove that guess?`,
    guess: 'No. They made it the best guess, not a sure thing.',
    fit: 'Yes. It fit the first clues, so it was sure.',
    simple: 'Yes. It needed the fewest extra things, so it was sure.',
    bad: 'No. It never fit the first clues at all.',
  },
] as const;

/** Can this way of thinking fail? The first best guess was ruled out by a new clue: it was a best guess, not a proof. */
export function reviseItem(rng: Rng, o: ExplainOptions): ExplainMade {
  const c = makeCase(rng, 'revise', o.skin, o.avoid);
  const s = c.story;
  const clues = allClues(c);
  const first = bestOf(c.ideas, c.shown)!;
  const now = bestOf(c.ideas, clues)!;
  const kNew = c.shown.length;
  const v = rng.pick(REVISE_ASKS);
  const who = s.letters ? 'Max' : s.who;
  /** The same name in the middle of a sentence: "the cook". */
  const whoMid = who.replace(/^The /, 'the ');
  const firstClues = clueNames(s, c.shown.length);
  const ruled = clueWhy(s, c.added!, kNew, first);
  const choices: Choice[] = [
    { id: 'guess', label: v.guess },
    { id: 'fit', label: v.fit },
    { id: 'simple', label: v.simple },
    { id: 'bad', label: v.bad },
  ];
  const before: TeachCase = {
    label: `Before the new clue: ${firstClues}.`,
    truths: c.ideas.map((i) => ({ who: `${nm(i, true)} fits`, value: fitsAll(i, c.shown) })),
    note: `${q(s, first, true)} fit ${everyClue(c.shown.length)} with the fewest extra things. It was the best guess then.`,
  };
  const after: TeachCase = {
    label: `After the new clue: ${clueNames(s, clues.length)}.`,
    truths: c.ideas.map((i) => ({ who: `${nm(i, true)} fits`, value: fitsAll(i, clues) })),
    note: `${q(s, first, true)} does not fit ${clueName(s, kNew)}, so it is out. The best guess now is ${qEnd(s, now)}`,
  };
  const feedback: Record<string, ChoiceFeedback> = {
    fit: {
      headline: 'Your answer says fitting the clues proves an idea, but a new clue ruled this one out.',
      detail: [
        `${q(s, first, true)} did fit ${firstClues}.`,
        `Then came ${withText(s, kNew, c.added!)} ${ruled}`,
        'A proof can’t be ruled out by a true clue. So the first guess was a best guess, not a proof.',
      ],
      example: after,
    },
    simple: {
      headline: 'Your answer says the simplest idea must be right, but here the simplest idea that fit was ruled out.',
      detail: [
        `${q(s, first, true)} needed ${extrasPhrase(s, first, false)}. It was the simplest idea that fit ${firstClues}.`,
        `Then ${clueName(s, kNew)} ruled it out. ${ruled}`,
        'Simple makes a good guess. It does not make a proof.',
      ],
      example: after,
    },
    bad: {
      headline: v.bad.includes('never')
        ? `Your answer says the first guess never fit, but it fit ${everyClue(c.shown.length)} at first.`
        : `Your answer calls the first guess bad, but it was the best guess for the clues ${whoMid} had then.`,
      detail: [
        `Before the new clue, ${q(s, first)} fit ${firstClues}. It also needed the fewest extra things, so picking it was good thinking.`,
        'It was not a proof, though. A new clue can rule out even a good guess.',
      ],
      example: before,
    },
  };
  return done('explain-revise', 'revise', c, {
    kind: 'choose',
    prompt: `${opening(s)} ${v.ask(who, q(s, first), firstClues)}`,
    scene: sceneOf(c, s.letters ? {} : { firstBest: first, nowBest: now }),
    choices: rng.shuffle(choices),
    answer: 'guess',
    explain: `${q(s, first, true)} fit ${firstClues} and needed the fewest extra things. That made it the best guess, not a proof. Then ${clueName(s, kNew)} ruled it out.`,
    feedback,
    hint: 'Here is the case before the new clue, marked. Then think about what the new clue did.',
    hintCase: before,
    teach: {
      rule: 'A best guess is not a proof. A new clue can rule it out, so check it before you are sure.',
      terms: TERMS,
      meaning: `${q(s, first, true)} was the best guess for ${firstClues}. Then came ${withText(s, kNew, c.added!)}`,
      casesTitle: 'Before and after the new clue',
      cases: [before, after],
      remember: ['The best guess is the best so far. It can still change.', 'Ask: “Could a new clue rule this idea out?” If yes, it is a guess to check.'],
      simpler: [
        `With ${firstClues}, ${q(s, first)} fit and needed the fewest extra things. So it was the best guess.`,
        `Then ${clueName(s, kNew)} came, and ${q(s, first)} did not fit it.`,
        'If the first guess had been proved, no new clue could have ruled it out. So it was only a best guess.',
      ],
    },
    conflict: true,
    tags: ['can-fail'],
  });
}

export const MAKERS: Record<ExplainKind, (rng: Rng, o: ExplainOptions) => ExplainMade> = {
  best: bestItem,
  test: testItem,
  'new-clue': newClueItem,
  revise: reviseItem,
};

// ---------- See and Do: the worked example's boards ----------

const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const yn = (v: boolean) => (v ? 'yes' : 'no');
const gridCols = (clues: readonly Clue[]) => clues.map((c) => ({ id: c.id, label: c.short ?? c.text, clue: c }));

/** The worked example (card 4): the wet grass, two clues, every box marked, the best named in the caption. */
export function workedScene(): Extract<Scene, { kind: 'grid' }> {
  const best = bestOf(WORKED.ideas, WORKED_SHOWN)!;
  return gridScene(WORKED.ideas, gridCols(WORKED_SHOWN), `✓ means the idea fits the clue. ✗ means it does not. Best guess: ${best.short}. It fits both clues and needs nothing extra.`);
}

/** The two ideas that fit the worked example's first two clues (rain and truck): the pair a check must tell apart. */
export const WORKED_PAIR = fitters(WORKED.ideas, WORKED_SHOWN) as [Idea, Idea];
/** A shown clue both of the pair fit (the wet grass): looking at it again can't tell them apart. */
export const WORKED_SAME: Clue = WORKED_SHOWN.find((c) => !splits(WORKED_PAIR, c))!;
/** Of the pair, the idea a check rules out (it does not fit the clue), and the one it keeps. */
export const ruledBy = (c: Clue) => ({ out: WORKED_PAIR.find((i) => !c.fits[i.id])!, kept: WORKED_PAIR.find((i) => c.fits[i.id])! });

/**
 * The last card: a worked check. The weather report is a column not checked yet ("No rain fell?"), the same "?" form
 * the "which check" question uses. The two ideas disagree on it, so it can tell them apart; then it turns up.
 */
export function newClueScene(): Extract<Scene, { kind: 'grid' }> {
  const clues = [...WORKED_SHOWN, WORKED_NEW];
  const best = bestOf(WORKED.ideas, clues)!;
  const { out, kept } = ruledBy(WORKED_NEW);
  const cols = [...gridCols(WORKED_SHOWN), { id: WORKED_NEW.id, label: `${WORKED_NEW.short}?`, clue: WORKED_NEW }];
  return gridScene(
    WORKED.ideas,
    cols,
    `“${WORKED_NEW.short}?” is a check. ${out.short} has a ✗ there and ${kept.short} has a ✓, so it tells them apart. The report says no rain fell. Best guess now: ${best.short}.`,
  );
}

/** Why an idea fits a clue of the worked example, or does not. */
const fitWhy = (i: Idea, c: Clue) => `${c.why[i.id]} So ${i.name} ${c.fits[i.id] ? 'fits' : 'does not fit'} “${c.short}.”`;

/** The worked grid with no best guess named, so the boards' "best guess" marks can't be copied from a caption. */
const plainScene = (clues: readonly Clue[]) => gridScene(WORKED.ideas, gridCols(clues), '✓ means the idea fits the clue. ✗ means it does not.');

/**
 * Board 1: the worked grid with one more clue (the dry roof). The first two columns are shown; the learner marks the
 * new one. Its scene is the worked grid without the caption that names the best.
 */
export function fitBoard(): DrillStep {
  const clues = [...WORKED_SHOWN, WORKED_BOARD];
  const rows: DrillRow[] = WORKED.ideas.map((i) => ({
    id: i.id,
    label: rowLabel(i),
    marks: clues.map((c): DrillMark => {
      const v = !!c.fits[i.id];
      const given = c !== WORKED_BOARD;
      return { id: `${i.id}-${c.id}`, label: c.short!, options: YES_NO, answer: yn(v), ...(given ? { given: true } : {}), why: { [yn(!v)]: fitWhy(i, c) } };
    }),
  }));
  const fit = WORKED.ideas.filter((i) => WORKED_BOARD.fits[i.id]).map((i) => i.name);
  const miss = WORKED.ideas.filter((i) => !WORKED_BOARD.fits[i.id]).map((i) => i.name);
  const split = splits(WORKED_PAIR, WORKED_BOARD);
  const { out, kept } = ruledBy(WORKED_BOARD);
  return {
    id: 's7.l2-do1',
    title: 'Mark a new clue',
    body: [
      `This is the wet grass board from the example. Here is one more clue: “${WORKED_BOARD.text}”`,
      `Mark the “${WORKED_BOARD.short}” column. Tap ✓ if the idea fits the clue, and ✗ if it does not.`,
    ],
    scene: plainScene(WORKED_SHOWN),
    twin: 'The same grid as the example, but no best guess is named.',
    afterCard: 3,
    rows,
    columns: clues.map((c) => c.short!),
    caption: '✓ fits the clue. ✗ does not fit.',
    done: !miss.length
      ? 'Right. Every idea fits this clue. So this clue can’t tell the ideas apart.'
      : split
        ? `Right: ${joinAnd(fit)} fit${fit.length === 1 ? 's' : ''}, but ${joinAnd(miss)} ${miss.length === 1 ? 'does' : 'do'} not. So the roof is a good check, because it tells ${out.short.toLowerCase()} and ${kept.short.toLowerCase()} apart.`
        : `Right. ${cap(joinAnd(fit))} fit${fit.length === 1 ? 's' : ''} this clue. ${cap(joinAnd(miss))} ${miss.length === 1 ? 'does' : 'do'} not.`,
  };
}

/**
 * Board 2, in the pack's order (prefer the simple fit, then check, then revise). With the first two clues, pick the
 * best guess: two ideas fit, so it comes down to extra things. Then pick a check that could rule one of them out.
 * Then, with the roof clue added, mark which ideas fit all three clues and pick the best guess now. Its scene is a
 * twin of the worked grid: the board's new clue is added as a column, and no best is named.
 */
export function bestBoard(): DrillStep {
  const clues = [...WORKED_SHOWN, WORKED_BOARD];
  const first = bestOf(WORKED.ideas, WORKED_SHOWN)!;
  const best = bestOf(WORKED.ideas, clues)!;
  const only = fitters(WORKED.ideas, clues).length === 1;
  const [A, B] = WORKED_PAIR;
  const pairWords = `${A.short.toLowerCase()} and ${B.short.toLowerCase()}`;

  // 1. Best guess from the first two clues: an idea misses a clue, and two fit with different extra things.
  const firstWhy: Record<string, string> = {};
  for (const i of WORKED.ideas) {
    if (i.id === first.id) continue;
    const miss = misses(i, WORKED_SHOWN);
    firstWhy[i.id] = miss.length
      ? `${nm(i, true)} does not fit “${miss[0].short}.” ${miss[0].why[i.id]}`
      : `${nm(i, true)} fits both clues too, but it needs ${plural(extraCount(i), 'extra thing')}. ${nm(first, true)} needs ${extrasPhrase(WORKED, first, false)}.`;
  }
  const firstRow: DrillRow = {
    id: 'first',
    label: 'Only the first two clues',
    marks: [{ id: 'first-best', label: 'Best guess?', options: WORKED.ideas.map((i) => ({ id: i.id, label: i.short })), answer: first.id, why: firstWhy }],
  };

  // 2. Which check could rule one of the pair out: a clue they disagree on, not one they both fit.
  const checks = [WORKED_SAME, WORKED_BOARD];
  const right = checks.find((c) => splits(WORKED_PAIR, c))!;
  const checkWhy: Record<string, string> = {};
  for (const c of checks) {
    if (c === right) continue;
    checkWhy[c.id] = `${cap(pairWords)} both fit “${c.short}.” Whatever you see, both ideas stay in.`;
  }
  checkWhy.none = `${nm(first, true)} is the better guess, but a best guess is not a proof. ${cap(pairWords)} both fit so far, so look for a clue they disagree on.`;
  const checkRow: DrillRow = {
    id: 'check',
    label: `A check for ${pairWords}`,
    marks: [{
      id: 'check',
      label: 'Which check could rule one out?',
      options: [
        ...checks.map((c) => ({ id: c.id, label: WORKED_SHOWN.includes(c) ? `${c.check.replace(/\.$/, '')} again.` : c.check })),
        { id: 'none', label: 'No check is needed.' },
      ],
      answer: right.id,
      why: checkWhy,
    }],
  };

  // 3. With the roof clue: does each idea fit every clue? Then the best guess now.
  const fitRows: DrillRow[] = WORKED.ideas.map((i) => {
    const v = fitsAll(i, clues);
    const miss = misses(i, clues);
    return {
      id: i.id,
      label: rowLabel(i),
      marks: [{
        id: `${i.id}-all`,
        label: 'Fits all three clues?',
        options: YES_NO,
        answer: yn(v),
        why: { [yn(!v)]: v ? `${nm(i, true)} fits every clue. ${WORKED_BOARD.why[i.id]}` : `${nm(i, true)} does not fit “${miss[0].short}.” ${miss[0].why[i.id]}` },
      }],
    };
  });
  const why: Record<string, string> = {};
  for (const i of WORKED.ideas) {
    if (i.id === best.id) continue;
    const miss = misses(i, clues);
    why[i.id] = miss.length
      ? `${nm(i, true)} does not fit every clue. ${miss[0].why[i.id]}`
      : `${nm(i, true)} fits every clue too, but it needs ${plural(extraCount(i), 'extra thing')}. ${nm(best, true)} needs ${extrasPhrase(WORKED, best, false)}.`;
  }
  const bestRow: DrillRow = {
    id: 'best',
    label: 'Best guess now',
    marks: [{ id: 'best', label: 'Which idea?', options: WORKED.ideas.map((i) => ({ id: i.id, label: i.short })), answer: best.id, why }],
  };
  return {
    id: 's7.l2-do2',
    title: 'Pick the best guess',
    body: [
      `First use only the first two clues. Pick the best guess. Then pick a check that could rule one idea out.`,
      `Now add the third clue: “${WORKED_BOARD.text}” Mark if each idea fits all three clues. Then pick the best guess now.`,
    ],
    scene: plainScene(clues),
    twin: `One clue is added: ${WORKED_BOARD.text.charAt(0).toLowerCase()}${WORKED_BOARD.text.slice(1)}`,
    afterCard: 3,
    rows: [firstRow, checkRow, ...fitRows, bestRow],
    done: only
      ? `Right. ${nm(best, true)} is the only idea that fits every clue now, so it is the best guess. It needs ${extrasPhrase(WORKED, best, false)}, but an idea that misses a clue is out first.`
      : `Right. ${nm(best, true)} fits every clue and needs the fewest extra things. It is the best guess so far, but it is still a guess to check.`,
  };
}
