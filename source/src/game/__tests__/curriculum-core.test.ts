/**
 * The curriculum plan's shared changes (docs/CURRICULUM-PLAN.md §1 and §2): shown stop numbers on the screens, the
 * side track and the locked rings on the Journey, the glossary (the Library's Words tab and the search group) and
 * the stop page's warm-up card (a bridge item). Screens are rendered to HTML on the server, like play.test.ts.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import * as saves from '../../engine/save/save';
import { createRng } from '../../engine/rng';
import type { Item, StopDef } from '../../engine/types';
import { STOPS, stopById, stopLabel, stopLabelOf, stopNumber, stopNumberOf } from '../../content/stops';
import { allTerms, collectedCount, glossaryEntries } from '../glossary';
import { JourneyScreen } from '../screens/JourneyScreen';
import { LibraryScreen, libraryKinds } from '../screens/LibraryScreen';
import { searchIndex } from '../screens/SearchScreen';
import { StopScreen, warmUpFrom } from '../screens/StopScreen';
import { StoreProvider, answerInto } from '../store';
import { viewAll } from '../../engine/journey/mastery';

const decode = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const text = (el: ReturnType<typeof h>) => decode(renderToString(el).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const today = '2026-10-11';

/** A device with one player, Sam, whose save has the given changes. */
function store(change: (d: saves.SaveData) => void = () => {}) {
  const mem = new Map<string, string>();
  const kv: saves.KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); }, removeItem: (k) => { mem.delete(k); } };
  const { reg, player } = saves.addPlayer({ players: [] }, 'Sam', saves.COLORS[0], 1, 0.5);
  const data = saves.newSave();
  change(data);
  saves.saveRegistry(kv, reg);
  saves.writeSave(kv, player.id, data);
  return kv;
}
const passed = (d: saves.SaveData, ...ids: string[]) => {
  for (const id of ids) d.stops[id] = { ...(d.stops[id] ?? { lessonsDone: [], attempts: 0 }), attempts: 1, passDay: '2026-10-01' };
};
const done = (d: saves.SaveData, ...lessonIds: string[]) => {
  for (const id of lessonIds) {
    const s = id.split('.')[0];
    d.stops[s] = { ...(d.stops[s] ?? { lessonsDone: [], attempts: 0 }), lessonsDone: [...(d.stops[s]?.lessonsDone ?? []), id] };
  }
};

describe('shown stop numbers: the place on the Journey, never the id', () => {
  it('Arguments (s18) is Stop 2, NOT, AND, OR (s2) is Stop 3, the side track is 13 and 14, rings read Ring k', () => {
    expect(stopNumber(stopById('s18')!)).toBe(2);
    expect(['s1', 's18', 's2', 's11', 's12', 's13'].map((id) => stopNumber(stopById(id)!))).toEqual([1, 2, 3, 12, 13, 14]);
    expect(STOPS.slice(0, 3).map((s) => s.id)).toEqual(['s1', 's18', 's2']);
    expect(stopNumberOf(2)).toBe(3);
    expect(stopNumberOf(18)).toBe(2);
    expect(stopLabel(stopById('s2')!)).toBe('Stop 3');
    expect(stopLabel(stopById('s7')!)).toBe('Stop 8');
    expect(STOPS.filter((s) => s.sideTrack).map(stopNumber)).toEqual([13, 14]);
    expect(stopLabel(stopById('s15')!)).toBe('Ring 2');
    expect(stopLabelOf(2)).toBe('Stop 3');
    expect(stopLabelOf(14)).toBe('Ring 1');
    expect(stopLabelOf(42)).toBe('Stop 42');
  });

  it('the Journey rows and rail use shown numbers; the side-track chip lists them', () => {
    const main = text(h(StoreProvider, { kv: store(), children: h(JourneyScreen, { route: { name: 'journey' } }) }));
    expect(main).toContain('1. True or False?');
    expect(main).toContain('2. Arguments');
    expect(main).toContain('3. NOT, AND, OR');
    expect(main).toContain('12. Proof');
    expect(main).toContain('Side track · 13, 14');
    expect(main).not.toContain('Spot the Trick');
    const side = text(h(StoreProvider, { kv: store(), children: h(JourneyScreen, { route: { name: 'journey', track: 'side' } }) }));
    expect(side).toContain('13. Spot the Trick');
    expect(side).toContain('14. Clues & Chances');
    expect(side).not.toContain('True or False?');
  });

  it('the Observatory shows a locked ring dimmed with its “Opens after” line; Find your level stays open', () => {
    const fresh = renderToString(h(StoreProvider, { kv: store(), children: h(JourneyScreen, { route: { name: 'journey', track: 'observatory' } }) }));
    const t = text(h(StoreProvider, { kv: store(), children: h(JourneyScreen, { route: { name: 'journey', track: 'observatory' } }) }));
    expect(t).toContain('Find your level');
    expect(t).toContain('Ring 1 · First Lights: Opens after Stop 1.');
    expect(t).toContain('Ring 2 · Rule Rise: Opens after Ring 1.');
    expect(fresh).toContain('is-ring-locked');
    // After Stop 1 is passed, Ring 1 is open on the map; Ring 2 still waits.
    const after = text(h(StoreProvider, { kv: store((d) => passed(d, 's1')), children: h(JourneyScreen, { route: { name: 'journey', track: 'observatory' } }) }));
    expect(after).not.toContain('Ring 1 · First Lights: Opens after');
    expect(after).toContain('Ring 2 · Rule Rise: Opens after Ring 1.');
    expect(after).toContain('Find your level');
  });
});

describe('glossary: the Words tab and the search group', () => {
  it('a word is collected once its lesson is done, grouped by stop in Journey order', () => {
    const terms = allTerms();
    expect(terms.some((t) => t.term === 'statement' && t.lessonId === 's1.l1')).toBe(true);
    const none = saves.newSave();
    expect(glossaryEntries(none)).toEqual([]);
    expect(collectedCount(none)).toBe(0);
    const some = saves.newSave();
    done(some, 's1.l1');
    const got = glossaryEntries(some);
    expect(got.map((g) => g.stop.id)).toEqual(['s1']);
    expect(got[0].terms.map((t) => [t.term, t.means, t.lessonNumber, t.lessonTitle])[0]).toEqual(['statement', 'A sentence that is either true or false.', 1, 'What is a statement?']);
    expect(got[0].terms.map((t) => t.term)).toEqual(['statement', 'true', 'false']);
    done(some, 's1.l2');
    expect(glossaryEntries(some)[0].terms.map((t) => t.term)).toEqual(['statement', 'true', 'false', 'can’t tell']);
  });

  it('every glossary word reads plainly: a meaning in full sentences, curly quotes only, no symbols', () => {
    for (const t of allTerms()) {
      expect(t.term.trim().length, t.lessonId).toBeGreaterThan(0);
      expect(t.means, t.term).toMatch(/^[A-Z].*[.!?]$/);
      for (const s of [t.term, t.means, t.also ?? '']) expect(s, t.term).not.toMatch(/["'<>=&*#@^~|\\]/);
    }
  });

  it('the Library has a Words tab: the line before any word is collected, then each word with its meaning and lesson', () => {
    const empty = text(h(StoreProvider, { kv: store(), children: h(LibraryScreen, { route: { name: 'library', kind: 'words' } }) }));
    expect(empty).toContain('Words');
    expect(empty).toContain('Finish a lesson to collect its words.');
    const kv = store((d) => done(d, 's1.l1'));
    const full = text(h(StoreProvider, { kv, children: h(LibraryScreen, { route: { name: 'library', kind: 'words' } }) }));
    expect(full).toContain('Stop 1 · True or False?');
    expect(full).toContain('statement');
    expect(full).toContain('A sentence that is either true or false.');
    expect(full).toContain('from Lesson 1 · What is a statement?');
    expect(full).not.toContain('Finish a lesson to collect its words.');
    const html = renderToString(h(StoreProvider, { kv, children: h(LibraryScreen, { route: { name: 'library', kind: 'words' } }) }));
    expect(html).toContain('<strong>statement</strong>');
    // The All view links to Words with the count collected.
    const all = text(h(StoreProvider, { kv, children: h(LibraryScreen, { route: { name: 'library' } }) }));
    expect(all).toContain('Words you know');
    // Lesson 1 names three words: statement, true and false.
    expect(all).toContain('3 words collected');
  });

  it('the Library shows Soon only while some stop is still coming (every stop is built, so six tabs)', () => {
    expect(libraryKinds().map((k) => k.label)).toEqual(['All', 'Ideas', 'Real life', 'Words', 'Practice', 'Pattern Lab']);
    expect(libraryKinds(STOPS.map((s, i) => (i === 3 ? { ...s, ready: false } : s))).map((k) => k.label)).toEqual(['All', 'Ideas', 'Real life', 'Words', 'Practice', 'Pattern Lab', 'Soon']);
  });

  it('search finds a collected word by its name or its meaning and opens the Words tab; an uncollected word is not found', () => {
    const before = searchIndex(saves.newSave(), today).filter((e) => e.group === 'words');
    expect(before).toEqual([]);
    const d = saves.newSave();
    done(d, 's1.l1');
    const words = searchIndex(d, today).filter((e) => e.group === 'words');
    expect(words.map((e) => [e.title, e.sub, e.meta, e.route])[0]).toEqual(['statement', 'A sentence that is either true or false.', 'S1 · L1', { name: 'library', kind: 'words' }]);
    expect(words.map((e) => e.title)).toEqual(['statement', 'true', 'false']);
    expect(words[0].body).toContain('true or false');
  });
});

describe('the warm-up card (a bridge item on the stop page)', () => {
  // A fake copy of NOT, AND, OR (s2) with a known bridge stands in for it while these tests run.
  const at = STOPS.findIndex((s) => s.id === 's2');
  const real = STOPS[at];
  const bridgeItem = (seed: number): Item => ({ ...stopById('s1')!.lessons[0].practice(createRng(seed))[0], id: `warm-${seed}`, prompt: 'Warm-up question: is this a statement?' });
  const withBridge = (): StopDef => ({ ...real, bridge: (rng) => bridgeItem(rng.int(1, 9)) });
  const swap = (stop: StopDef) => { (STOPS as StopDef[])[at] = stop; };
  afterEach(() => swap(real));
  const page = (change: (d: saves.SaveData) => void) => text(h(StoreProvider, { kv: store(change), children: h(StopScreen, { route: { name: 'stop', stopId: 's2' } }) }));

  it('an open stop shows “Warm up · from Stop 1” above its lessons (NOT, AND, OR bridges from True or False?), with the item in learn mode and no timer', () => {
    swap(withBridge());
    const t = page((d) => passed(d, 's1', 's18'));
    expect(t).toContain('Warm up · from Stop 1');
    expect(t).toContain('Warm-up question: is this a statement?');
    // Above the lesson rows (the last mention of Lesson 1: the real-life section above also names it).
    expect(t.indexOf('Warm up · from Stop 1')).toBeLessThan(t.lastIndexOf(`Lesson 1 · ${real.lessons[0].title}`));
    expect(t).not.toMatch(/seconds left|Time is up/i);
    // The eyebrow names the stop by its shown number.
    expect(t).toContain('Stop 3');
  });

  it('once warm, the card is one line; a locked stop or a stop with no bridge shows no card', () => {
    swap(withBridge());
    const warm = page((d) => { passed(d, 's1', 's18'); d.stops.s2 = { lessonsDone: [], attempts: 0, warm: true }; });
    expect(warm).toContain('Warmed up');
    expect(warm).not.toContain('Warm-up question');
    const locked = page((d) => passed(d, 's1'));
    expect(locked).toContain('Opens after Stop 2');
    expect(locked).not.toContain('Warm up');
    swap({ ...real, bridge: undefined });
    expect(page((d) => passed(d, 's1', 's18'))).not.toContain('Warm up');
  });

  it('the warm-up comes from the stop before it, from the stop a side-track stop requires, or from the stop bridgeFrom names', () => {
    expect(warmUpFrom(stopById('s18')!)?.id).toBe('s1');
    expect(warmUpFrom(stopById('s3')!)?.id).toBe('s2');
    // bridgeFrom: NOT, AND, OR warms up from True or False?; Proof from Proof Lantern; Spot the Trick from Arguments; Clues & Chances from Ways to Think.
    expect(warmUpFrom(stopById('s2')!)?.id).toBe('s1');
    expect(warmUpFrom(stopById('s11')!)?.id).toBe('s17');
    expect(warmUpFrom(stopById('s12')!)?.id).toBe('s18');
    expect(warmUpFrom(stopById('s13')!)?.id).toBe('s7');
    expect(warmUpFrom({ ...stopById('s12')!, bridgeFrom: undefined })?.id).toBe('s8');
    expect(warmUpFrom(stopById('s1')!)).toBeUndefined();
  });

  it('a warm-up answer counts nowhere and never adds a Notebook card; a right one marks the stop warm', () => {
    const d = saves.newSave();
    const miss = { skill: 's1.statement', firstTry: false, correct: false, stop: 1, lesson: 's1.l1' };
    expect(answerInto(d, miss, today, { fromWarmUp: true })).toBe(d);
    // The same miss from a lesson counts and goes to the Notebook.
    const lesson = answerInto(d, miss, today);
    expect(Object.keys(lesson.notebook)).toEqual(['s1.statement']);
    expect(lesson.stats[today]).toBeDefined();
    const warm = saves.markWarm(d, 's2');
    expect(warm.stops.s2).toEqual({ lessonsDone: [], attempts: 0, warm: true });
    expect(saves.markWarm(warm, 's2')).toBe(warm);
  });

  it('a v0.10.0 save with progress on s2-s7 keeps it, and every stop it had open stays open', () => {
    // The stored shape v0.10.0 wrote (no Arguments, no warm): s2-s6 passed, s7 partway, Ring 1 started.
    const old = {
      game: 'logic-quest', v: 1, savedAt: 1, stats: {}, active: {}, notebook: {}, fixedCount: 0, help: {}, gaps: [], lessonRun: null, drilled: [],
      stops: {
        s1: { lessonsDone: ['s1.l1'], attempts: 1, passDay: '2026-09-01', lockDay: '2026-09-03' },
        s2: { lessonsDone: ['s2.l1', 's2.l2'], attempts: 1, passDay: '2026-09-05' },
        s3: { lessonsDone: [], attempts: 2, passDay: '2026-09-08' },
        s4: { lessonsDone: [], attempts: 1, passDay: '2026-09-10' },
        s5: { lessonsDone: [], attempts: 1, passDay: '2026-09-12' },
        s6: { lessonsDone: [], attempts: 1, passDay: '2026-09-14' },
        s7: { lessonsDone: ['s7.l1', 's7.l2'], attempts: 0 },
        s14: { lessonsDone: ['s14.l1'], attempts: 0 },
      },
    };
    const d = saves.parseSave(JSON.parse(JSON.stringify(old)));
    if (!d) throw new Error('the old save did not load');
    for (const [id, p] of Object.entries(old.stops)) expect(d.stops[id], id).toMatchObject(p);
    const status = Object.fromEntries(viewAll(STOPS, d.stops, today).map((v) => [v.stop.id, v.view.status]));
    for (const id of ['s2', 's3', 's4', 's5', 's6']) expect(['passed', 'lockedIn', 'mastered', 'resting'], id).toContain(status[id]);
    expect(status.s7).toBe('learning');
    expect(status.s14).toBe('learning');
    // Arguments is new to this save: it opens, because Stop 1 is passed. A stop that is not ready (s99) stays coming.
    expect(status.s18).toBe('learning');
    const later: StopDef = { n: 99, id: 's99', title: 'Later', idea: '', ready: false, lessons: [] };
    expect(Object.fromEntries(viewAll([...STOPS, later], d.stops, today).map((v) => [v.stop.id, v.view.status])).s99).toBe('soon');
  });

  it('warm and s2-s7 progress survive the export file and a reload', () => {
    const d = saves.newSave();
    passed(d, 's1', 's2', 's3', 's4', 's5', 's6', 's7');
    done(d, 's2.l1', 's7.l3');
    d.stops.s2 = { ...d.stops.s2, warm: true };
    const text = saves.exportSave({ name: 'Sam', color: saves.COLORS[0] }, d);
    const back = saves.importSave(text);
    if ('error' in back) throw new Error(back.error);
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's7']) expect(back.data.stops[id], id).toEqual(d.stops[id]);
    expect(back.data.stops.s2.warm).toBe(true);
    expect(saves.parseSave({ ...JSON.parse(JSON.stringify(d)), game: 'logic-quest', stops: { s2: { lessonsDone: [], attempts: 0, warm: 'yes' } } })!.stops.s2.warm).toBeUndefined();
  });
});
