/**
 * New examples after a miss ("fresh checks"). After the explanation and a right retry with its help, the player
 * answers a new item on the same skill, on their own. It must look different from the missed item and from the
 * new examples already shown: other objects, other counts, other words.
 */
import { createRng } from './rng';
import type { Item, StopDef } from './types';

/** What a player sees of an item. Two items that look the same are the same question. */
export function looks(it: Item): string {
  return JSON.stringify([
    it.prompt,
    it.scene?.kind === 'speakers' ? it.scene.speakers.map((sp) => sp.says) : it.scene ?? null,
    it.kind === 'tapall' ? it.things : null,
    it.kind === 'choose' || it.kind === 'multi' ? it.choices.map((c) => c.label) : null,
  ]);
}

/**
 * The next set of new examples for a missed item. A stop may give its own set (StopDef.fresh), such as two
 * NOT-flip comparisons, one with a tie and one without. Otherwise: one item with the same skill from the same
 * lesson's practice, else any new item from that lesson. Ids are made unique: `<missed id>-new<round>-<k>`.
 */
export function freshCheckSet(stop: StopDef, item: Item, seed: number, avoid: readonly Item[] = [], round = 1): Item[] {
  const seen = new Set([item, ...avoid].map(looks));
  const tag = (xs: Item[]) => xs.map((x, k) => ({ ...x, id: `${item.id}-new${round}-${k + 1}` }));
  if (stop.fresh) {
    for (let i = 0; i < 40; i++) {
      const set = stop.fresh(item, createRng(seed + i * 7919));
      if (!set.length) break;
      const keys = set.map(looks);
      if (keys.every((k) => !seen.has(k)) && new Set(keys).size === keys.length) return tag(set);
    }
  }
  const lesson = stop.lessons.find((l) => l.id === item.lesson);
  let fallback: Item | null = null;
  if (lesson) {
    for (let i = 0; i < 80; i++) {
      for (const x of lesson.practice(createRng(seed + i * 104729))) {
        if (seen.has(looks(x))) continue;
        if (x.skill === item.skill) return tag([x]);
        fallback ??= x;
      }
    }
  }
  return fallback ? tag([fallback]) : [];
}
