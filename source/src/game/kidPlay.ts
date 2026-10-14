/**
 * The Kid Journey's play helpers, with no DOM (docs/KID-JOURNEY.md §2): which answers draw as yes/no tiles, the
 * words read aloud for a kid card, board row, item and star screen, and auto read-aloud. Auto read-aloud is started
 * only from the tap that opened the new card or item (browsers allow speech only after a tap), and the next tap stops
 * it (LessonRunner and CheckRunner stop it on any pointer down).
 */
import type { Item, KidBoard, KidCard, KidLesson, KidScene, LessonDef, Thing } from '../engine/types';
import type { SaveData } from '../engine/save/save';
import { kidModeOf, type KidMode } from './kidMode';
import { lessonById } from './observatory';
import { PICTO_WORDS } from './components/Pictogram';
import { asSentence, sceneSpeech, speak, thingName } from './speech';

/** The answer pairs (by id) a young reader taps as a check tile and a cross tile. */
const PAIRS: readonly (readonly [string, string])[] = [
  ['true', 'false'],
  ['yes', 'no'],
  ['fit', 'not'],
  ['keep', 'reject'],
  ['matches', 'breaks'],
  ['right', 'not-right'],
  ['same', 'different'],
];

/** The same pairs by their words (any ids): Matches or Breaks, Fits or Does not fit, Right or Not right, Same or Different. */
const LABEL_PAIRS: readonly (readonly [string, string])[] = [
  ['matches', 'breaks'],
  ['fits', 'does not fit'],
  ['right', 'not right'],
  ['same', 'different'],
];

/** What read-aloud says for each side of a pair. */
const SAY: Record<string, string> = {
  true: 'true', false: 'false', yes: 'yes', no: 'no', fit: 'fits', not: 'does not fit', keep: 'keep', reject: 'reject',
  matches: 'matches', breaks: 'breaks', right: 'right', 'not-right': 'not right', same: 'same', different: 'different',
};

/** An option's words, lower case, with plain spaces and a straight apostrophe, for matching a pair by its words. */
const wordsOf = (label: string | undefined): string => (label ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/’/g, "'");

/**
 * Two options that are true/false, yes/no, fit/not, keep/reject, matches/breaks, right/not right or same/different (by
 * id, or by their words: Matches or Breaks, Fits or Does not fit, Right or Not right, Same or Different): the id of the
 * yes side and of the no side, in that order. Null for anything else (they keep their word buttons).
 */
export function yesNoOf(options: readonly { id: string; label?: string }[]): { yes: string; no: string } | null {
  if (options.length !== 2) return null;
  const ids = options.map((o) => o.id);
  const pair = PAIRS.find(([y, n]) => ids.includes(y) && ids.includes(n));
  if (pair) return { yes: pair[0], no: pair[1] };
  const words = options.map((o) => wordsOf(o.label));
  const byWords = LABEL_PAIRS.find(([y, n]) => words.includes(y) && words.includes(n));
  return byWords ? { yes: options[words.indexOf(byWords[0])].id, no: options[words.indexOf(byWords[1])].id } : null;
}

/**
 * "Yes or no?", "True or false?": the tiles of a pair, as read aloud. A pair found by its words (ids this file does not
 * know) is read by those words, so pass the options.
 */
export function yesNoSpeech(pair: { yes: string; no: string }, options: readonly { id: string; label?: string }[] = []): string {
  const say = (id: string) => SAY[id] ?? (wordsOf(options.find((o) => o.id === id)?.label) || id);
  const a = say(pair.yes);
  return `${a[0].toUpperCase()}${a.slice(1)}, or ${say(pair.no)}?`;
}

/** Every choice of a choose item has a picture: they draw as big picture tiles. */
export const pictureChoices = (item: Item): boolean => item.kind === 'choose' && item.choices.length > 0 && item.choices.every((c) => !!c.art);

/** A kid card as read aloud: its one line. */
export const kidCardSpeech = (card: KidCard): string[] => [asSentence(card.line)];

/** A kid board page as read aloud: the board's line, then the row to mark. */
export const kidBoardSpeech = (board: KidBoard, rowLabel?: string): string[] => [asSentence(board.line), ...(rowLabel ? [asSentence(rowLabel)] : [])];

/** Kid-only alternate items already built, so the same item always gives the same object (no re-render churn). */
const ALTS = new WeakMap<Item, Item>();

/**
 * The item kid mode draws (docs/KID-JOURNEY.md, round 2, A5): its kid-only alternate (`kid.alt`) with the outer item's
 * id and tags, in kid mode; the item itself otherwise (classic play, or no alternate), the same object. Apply it where
 * a kid-mode pack is built: the lesson's quiz items, new examples after a miss, check items, young placement items.
 */
export function kidItemOf(item: Item, kid: KidMode | null | undefined): Item {
  return kid ? altOf(item) : item;
}

/** The kid-only alternate of an item with the outer id and tags (built once per item), or the item itself. */
function altOf(item: Item): Item {
  const alt = item.kid?.alt;
  if (!alt) return item;
  let out = ALTS.get(item);
  if (!out) {
    out = { ...alt, id: item.id } as Item;
    if (item.tags) out.tags = item.tags;
    else delete out.tags;
    ALTS.set(item, out);
  }
  return out;
}

/** kidItemOf over a list: the same list back when nothing changes. */
export function kidItemsOf(items: readonly Item[], kid: KidMode | null | undefined): Item[] {
  const out = items.map((it) => kidItemOf(it, kid));
  return out.every((it, i) => it === items[i]) ? (items as Item[]) : out;
}

/** The cards a kid scene of kind 'things' draws: the cards of the item's own scene of cards, or none. */
export const kidThingsOf = (item: Item): Thing[] => (item.scene?.kind === 'things' ? item.scene.things : []);

/** A kid scene as read aloud: each row of pictures by its words (or the pictures' names), or the plain cards. */
export function kidSceneSpeech(scene: KidScene, item: Item): string[] {
  if (scene.kind === 'pictos') return scene.rows.filter((r) => r.length).map((r) => asSentence(r.map((p) => p.word || PICTO_WORDS[p.art]).join(', ')));
  if (scene.kind === 'things') {
    const text = kidThingsOf(item).map(thingName).join(', ');
    return text ? [asSentence(text[0].toUpperCase() + text.slice(1))] : [];
  }
  return [];
}

/**
 * An item in kid words, as read aloud: the kid prompt, what the picture says (the kid scene, else the item's scene),
 * then the answers (yes or no, or each answer's label: a picture tile is read by its label, never by the picture's
 * name). An item with a kid-only alternate is read as that alternate (this is only called in kid mode). Empty for an item without a kid layer.
 */
export function kidItemSpeech(given: Item): string[] {
  const item = altOf(given);
  if (!item.kid) return [];
  const lines = [asSentence(item.kid.prompt)];
  const scene = item.kid.scene;
  if (scene) lines.push(...kidSceneSpeech(scene, item));
  if (item.scene && (!scene || (scene.kind === 'pictos' && scene.keep))) lines.push(...sceneSpeech(item.scene));
  if (item.kind === 'choose') {
    const pair = yesNoOf(item.choices);
    if (pair) lines.push(yesNoSpeech(pair, item.choices));
    else if (pictureChoices(item)) lines.push(asSentence(item.choices.map((c) => c.label).join(', ')));
    else lines.push(...item.choices.map((c) => asSentence(c.label)));
  } else if (item.kind === 'multi') {
    lines.push(...item.choices.map((c) => asSentence(c.label)));
  }
  return lines;
}

/** The star screen as read aloud. */
export const kidStarSpeech = (kid: KidLesson): string[] => ['You did it!', ...(kid.star ? [asSentence(kid.star)] : [])];

/** The first screen of a round with a kid layer, as read aloud (its first kid card). */
export function roundStartSpeech(lesson: LessonDef | null | undefined): string[] {
  const first = lesson?.kid?.cards[0];
  return first && lesson!.ideas.length ? kidCardSpeech(first) : [];
}

/**
 * Read a new screen aloud by itself, when the kid mode says so. Call it only inside the tap handler that opened the
 * screen. Returns whether it started.
 */
export function autoSay(kid: KidMode | null | undefined, lines: readonly string[]): boolean {
  if (!kid?.autoRead || !lines.length) return false;
  return speak(lines);
}

/**
 * The Play tap that opens a round (the grade map, its star sky, the kid Home, a world check's "Learn it again"): start
 * reading its first kid card. A round picked up partway opens on a question instead, so it starts silent; `fresh`
 * says the round always starts from its first card (a world check's "Learn it again" never resumes a saved run).
 */
export function sayRoundStart(save: SaveData | null | undefined, lessonId: string, fresh = false): void {
  if (!save || (!fresh && save.lessonRun?.lessonId === lessonId)) return;
  autoSay(kidModeOf(save), roundStartSpeech(lessonById(lessonId)));
}
