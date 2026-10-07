/**
 * Real life on the screens (content/world): "Why it matters" on a lesson's first card, "Where this is used" on a
 * passed lesson's last screen, the stop page's section, the Library's Real life view, Home's "Remember why" and
 * search. Rendered to HTML on the server, like play.test.ts.
 */
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as saves from '../../engine/save/save';
import { STOPS, stopById } from '../../content/stops';
import { lessonWorld, stopWorld } from '../../content/world';
import { IdeaCards } from '../components/IdeaCards';
import { LessonRecap } from '../components/LessonRunner';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { StopScreen } from '../screens/StopScreen';
import { searchIndex } from '../screens/SearchScreen';
import { StoreProvider, todayNow } from '../store';

const decode = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (el: ReturnType<typeof h>) => decode(renderToString(el).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const noop = () => {};

/** A device with one player, Sam, who has done the given lessons. */
function store(done: string[] = []) {
  const mem = new Map<string, string>();
  const kv: saves.KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); }, removeItem: (k) => { mem.delete(k); } };
  const { reg, player } = saves.addPlayer({ players: [] }, 'Sam', saves.COLORS[0], 1, 0.5);
  const data = saves.newSave();
  for (const id of done) {
    const stop = id.split('.')[0];
    data.stops[stop] = { ...(data.stops[stop] ?? { lessonsDone: [], attempts: 0 }), lessonsDone: [...(data.stops[stop]?.lessonsDone ?? []), id] };
  }
  saves.saveRegistry(kv, reg);
  saves.writeSave(kv, player.id, data);
  return kv;
}

const s1 = stopById('s1')!;
const l1 = s1.lessons[0];
const w1 = lessonWorld(l1.id)!;

describe('real life in a lesson', () => {
  it('shows “Why it matters” on the lesson’s first card only', () => {
    const first = text(h(IdeaCards, { cards: l1.ideas, readAloud: false, onDone: noop, why: w1.why }));
    expect(first).toContain('Why it matters');
    expect(first).toContain(w1.why);
    const later = text(h(IdeaCards, { cards: l1.ideas.slice(2), readAloud: false, onDone: noop, why: w1.why, numberFrom: 3, numberOf: l1.ideas.length }));
    expect(later).not.toContain('Why it matters');
  });

  it('ends a passed lesson with where the idea is used and why it matters', () => {
    const done = text(h(LessonRecap, { stop: s1, lesson: l1, tries: 3, firstTry: 3, passed: true, onDone: noop }));
    expect(done).toContain('Where this is used');
    for (const u of w1.uses) {
      expect(done).toContain(u.who);
      expect(done).toContain(u.text);
    }
    expect(done).toContain('Keep in mind');
    expect(done).toContain(w1.why);
    const notYet = text(h(LessonRecap, { stop: s1, lesson: l1, tries: 3, firstTry: 1, passed: false, onDone: noop }));
    expect(notYet).not.toContain('Where this is used');
  });
});

describe('real life on the pages', () => {
  it('the stop page has the stop’s line and each lesson’s why', () => {
    const page = text(h(StoreProvider, { kv: store(), children: h(StopScreen, { route: { name: 'stop', stopId: 's1' } }) }));
    expect(page).toContain('In real life');
    expect(page).toContain(stopWorld('s1')!);
    expect(page).toContain('Why each lesson matters');
    expect(page).toContain(w1.why);
    // A coming stop shows its line too.
    const soon = STOPS.find((s) => !s.ready)!;
    expect(text(h(StoreProvider, { kv: store(), children: h(StopScreen, { route: { name: 'stop', stopId: soon.id } }) }))).toContain(stopWorld(soon.id)!);
  });

  it('the Library’s Real life view lists every stop, and All points to it', () => {
    const real = text(h(StoreProvider, { kv: store(), children: h(LibraryScreen, { route: { name: 'library', kind: 'real' } }) }));
    for (const stop of STOPS) expect(real, stop.id).toContain(stopWorld(stop.id)!);
    for (const u of w1.uses) expect(real).toContain(u.text);
    const all = text(h(StoreProvider, { kv: store(), children: h(LibraryScreen, { route: { name: 'library' } }) }));
    expect(all).toContain('Where each idea is used');
    expect(all).toContain('Real life');
  });

  it('Home shows one use a day from a lesson the player has done, and nothing before any lesson', () => {
    const before = text(h(StoreProvider, { kv: store(), children: h(HomeScreen) }));
    expect(before).not.toContain('Remember why');
    const after = text(h(StoreProvider, { kv: store([l1.id]), children: h(HomeScreen) }));
    expect(after).toContain('Remember why');
    expect(w1.uses.some((u) => after.includes(u.text))).toBe(true);
    expect(after).toContain(`From ${l1.title}`);
  });

  it('search finds a lesson by where it is used', () => {
    const entries = searchIndex(saves.newSave(), todayNow());
    const hit = entries.find((e) => e.title === `${l1.title}: in real life`);
    expect(hit?.route).toEqual({ name: 'library', kind: 'real', stop: 's1' });
    expect(hit?.body).toContain(w1.uses[1].text);
  });
});
