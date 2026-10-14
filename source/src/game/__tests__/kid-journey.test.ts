/**
 * The Kid Journey's core (docs/KID-JOURNEY.md §1 and §2, first half): the grade map, the kid save and its round trips,
 * the derived rewards, the star rule, the placement stop rule, the world check's questions and pass rule, and the new
 * routes' screens, rendered to HTML on the server with a store (like curriculum-core.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import * as saves from '../../engine/save/save';
import { packPlayer, readRemote } from '../../engine/save/sync';
import { looks } from '../../engine/fresh';
import type { GradeId, Picto } from '../../engine/types';
import { STOPS } from '../../content/stops';
import {
  GRADES, GRADE_IDS, allRounds, bandOf, gradeById, isYoung, nextRound, roundOpen, roundsOf, worldById, worldOf,
} from '../../content/grades';
import {
  PLACEMENT_MAX, STICKERS, badges, buildings, daysThisWeek, glowInto, hasBadge, placementBand, placementGrade, placementItem,
  placementStep, setGradeInto, skippedBands, starInto, starsIn, startPlacement, stickersIn, worldCheckInto, worldCheckItems,
  worldCheckOutcome, worldCheckState, worldCheckOpen, redoInto, roundsToRedo, type PlacementState,
} from '../kid';
import { Building } from '../components/KidJourney';
import { PICTO_WORDS, Pictogram } from '../components/Pictogram';
import { lessonById } from '../observatory';
import { runSummary } from '../components/LessonRunner';
import { StoreProvider, answerInto, parentRoute, tabFor, type LastWorldCheck, type Route } from '../store';
import { hidesNav, playing } from '../../App';
import { COLOR_NAMES, PlayersScreen, NEW_PLAYER_COPY } from '../screens/PlayersScreen';
import { GradeScreen } from '../screens/GradeScreen';
import { JourneyScreen } from '../screens/JourneyScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MeScreen } from '../screens/MeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LessonScreen } from '../screens/LessonScreen';
import { CheckScreen } from '../screens/CheckScreen';
import { StopScreen } from '../screens/StopScreen';
import { WORLD_CHECK_KID_NOTE, WORLD_CHECK_NOTE, WorldCheckResult, WorldCheckScreen } from '../screens/WorldCheckScreen';
import { PlacementScreen } from '../screens/PlacementScreen';
import { BadgeScreen, badgeLine } from '../screens/BadgeScreen';
import type { AnswerRecord } from '../components/contracts';

const decode = (s: string) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (html: string) => decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const text = (el: ReturnType<typeof h>) => strip(renderToString(el));
const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const DAY = '2026-10-13';

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
const emptyDevice = (): saves.KV => {
  const mem = new Map<string, string>();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); }, removeItem: (k) => { mem.delete(k); } };
};
const inStore = (kv: saves.KV, child: ReturnType<typeof h>) => h(StoreProvider, { kv, children: child });
const star = (d: saves.SaveData, kind: saves.StarKind, ...ids: string[]) => { for (const id of ids) d.kid.stars[id] = kind; };
const record = (it: { id: string; lesson: string; skill: string; stop: number }, correct: boolean): AnswerRecord => ({ itemId: it.id, stop: it.stop, lesson: it.lesson, skill: it.skill, correct, firstTry: correct, ms: 1000 });

// ---------- the grade map ----------

describe('the grade map (§1)', () => {
  it('has the nine bands, worlds and rounds exactly as the spec lists them', () => {
    const map = GRADES.map((g) => `${g.id} ${g.title}: ${g.worlds.map((w) => `${w.title} (${w.rounds.join(', ')})`).join(' · ')}`);
    expect(map).toEqual([
      'g1 Starlight Meadow: Sky Path (s1.l1, s1.l2, s1.l3, s14.l1) · Meadow Gate (s2.l2, s4.l1, s14.l2)',
      'g2 River of Rules: River Bend (s2.l1, s2.l3, s14.l3, s7.l1) · Stepping Stones (s3.l1, s3.l2, s4.l2, s8.l1)',
      'g3 Treasure Hills: Treasure Cave (s1.l4, s2.l4, s8.l2, s15.l1) · Hill Trail (s3.l3, s3.l4, s4.l3, s4.l4)',
      'g4 Clue Canyon: Sign Ledge (s1.l5, s1.l6, s1.l7) · Canyon Floor (s2.l5, s3.l5, s4.l5, s15.l2) · Echo Wall (s15.l3, s18.l1, s7.l2)',
      'g5 Truth Island: Knight Shore (s5.l1, s5.l2, s5.l3, s18.l2) · Rule Reef (s6.l1, s6.l2, s8.l3, s8.l4) · Mirror Cove (s16.l1, s7.l3, s13.l1)',
      'g6 If-Then Bridge: Islander Bay (s5.l4, s5.l5, s18.l3, s18.l4) · Four Moves (s6.l3, s6.l4, s6.l5) · Table Tower (s9.l1, s9.l2, s16.l2, s16.l3) · Fair Harbor (s7.l4, s7.l5, s13.l2, s13.l3)',
      'g7 Circuit City: Only-If Lane (s6.l6, s6.l7, s8.l5, s8.l6) · Table Street (s9.l3, s9.l4, s9.l5, s9.l6) · Wire Works (s10.l1, s10.l2, s10.l3, s10.l4, s10.l5) · Lantern Square (s13.l4, s17.l1, s17.l2)',
      'g8 Proof Peak: Proof Trail (s11.l1, s11.l2, s11.l3, s11.l4) · Summit Steps (s11.l5, s11.l6, s11.l7, s17.l3) · Trick Market (s12.l1, s12.l2, s12.l3) · Market Square (s12.l4, s12.l5, s12.l6, s13.l5)',
      'hs Symbol Summit: Symbols (s9.l7)',
    ]);
    expect(GRADES.map((g) => g.id)).toEqual([...GRADE_IDS]);
    expect(GRADES.map((g) => g.label)).toEqual(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'High school']);
    for (const g of GRADES) g.worlds.forEach((w, i) => expect(w.id).toBe(`${g.id}.w${i + 1}`));
  });

  it('every lesson id in STOPS appears in exactly one world, and every round is a real lesson (91 of them)', () => {
    const ids = STOPS.flatMap((s) => s.lessons.map((l) => l.id));
    const rounds = allRounds();
    expect(rounds).toHaveLength(91);
    expect(ids).toHaveLength(91);
    expect(new Set(rounds).size).toBe(rounds.length);
    expect([...rounds].sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const homes = GRADES.flatMap((g) => g.worlds.filter((w) => w.rounds.includes(id)));
      expect(homes, id).toHaveLength(1);
      expect(worldOf(id)).toBe(homes[0]);
      expect(bandOf(id)).not.toBeNull();
    }
    // The audit additions are on disk and on the map.
    for (const id of ['s8.l5', 's8.l6', 's9.l6', 's9.l7', 's10.l5', 's11.l6', 's11.l7', 's12.l5', 's12.l6', 's13.l5']) {
      expect(lessonById(id), id).toBeDefined();
      expect(rounds).toContain(id);
    }
    expect(roundsOf('g1')).toEqual(['s1.l1', 's1.l2', 's1.l3', 's14.l1', 's2.l2', 's4.l1', 's14.l2']);
    expect(bandOf('s9.l7')).toBe('hs');
    expect(worldOf('s4.l1')?.title).toBe('Meadow Gate');
    expect(worldById('g3.w2')?.title).toBe('Hill Trail');
  });

  it('the lesson-level requires of the Observatory places are met by earlier rounds', () => {
    const order = allRounds();
    const checked: string[] = [];
    for (const stop of STOPS) {
      for (const lesson of stop.lessons) {
        for (const need of (lesson.requires ?? []).filter((r) => r.includes('.l'))) {
          expect(order.indexOf(need), `${lesson.id} needs ${need}`).toBeGreaterThanOrEqual(0);
          expect(order.indexOf(need), `${lesson.id} needs ${need}`).toBeLessThan(order.indexOf(lesson.id));
          checked.push(`${lesson.id}<${need}`);
        }
      }
    }
    for (const pair of ['s15.l2<s2.l5', 's15.l2<s15.l1', 's15.l3<s14.l1', 's16.l2<s2.l1', 's17.l1<s15.l2', 's17.l2<s17.l1', 's17.l3<s17.l2']) expect(checked).toContain(pair);
  });

  it('budgets per band; no timer and no strip for Grades 1 to 3; world checks of 5 for g1–g2, 8 to 10 after', () => {
    const b = (id: GradeId) => gradeById(id).budget;
    // The final budgets: every visible word counts, the play header's "Round k of n" (4 words) included.
    expect(b('g1')).toEqual({ words: 12, sentence: 8, sentences: 2, autoRead: true, timer: false, strip: false });
    expect(b('g2')).toEqual({ words: 20, sentence: 10, sentences: 2, autoRead: true, timer: false, strip: false });
    expect(b('g3')).toEqual({ words: 30, sentence: 12, sentences: 3, autoRead: false, timer: false, strip: false });
    expect(b('g4')).toEqual({ words: 40, sentence: 14, sentences: 4, autoRead: false, timer: true, strip: true });
    expect(b('g5')).toMatchObject({ words: 50, sentence: 16, sentences: 4 });
    expect(b('g6')).toMatchObject({ words: 60, sentence: 18, sentences: 5 });
    expect(b('g7')).toMatchObject({ words: 75, sentence: 22, sentences: 6 });
    expect(b('g8')).toMatchObject({ words: 75, sentence: 22, sentences: 6 });
    expect(b('hs')).toEqual({ words: 90, sentence: 25, autoRead: false, timer: true, strip: true });
    expect(GRADE_IDS.filter((g) => isYoung(g))).toEqual(['g1', 'g2', 'g3']);
    expect(gradeById('g1').check.items).toBe(5);
    expect(gradeById('g2').check.items).toBe(5);
    for (const g of GRADES.slice(2)) {
      expect(g.check.items).toBeGreaterThanOrEqual(8);
      expect(g.check.items).toBeLessThanOrEqual(10);
    }
  });
});

// ---------- the kid save ----------

describe('the kid save: defaults, parser, export, import and sync', () => {
  const busy = () => {
    const d = saves.newSave(5);
    d.stops.s1 = { lessonsDone: ['s1.l1'], attempts: 0 };
    d.kid = {
      grade: 'g2',
      placed: { grade: 'g2', day: '2026-10-10', by: 'check' },
      stars: { 's1.l1': 'clean', 's2.l1': 'mended' },
      worlds: { 'g1.w1': { passDay: '2026-10-11', tries: 1 }, 'g2.w1': { tries: 2, notYet: { day: '2026-10-12', missed: ['s2.l3', 's14.l3'], redone: ['s14.l3'] } } },
      glow: { 's1.l1': 2 },
    };
    return d;
  };

  it('a new save and an older save (no kid key) get the defaults, with the same progress', () => {
    expect(saves.newSave().kid).toEqual({ grade: null, stars: {}, worlds: {}, glow: {} });
    const old = JSON.parse(JSON.stringify(saves.newSave(9))) as Record<string, unknown>;
    delete old.kid;
    (old.stops as Record<string, unknown>).s1 = { lessonsDone: ['s1.l1', 's1.l2'], attempts: 1, passDay: '2026-10-01' };
    const got = saves.parseSave(old)!;
    expect(got.kid).toEqual(saves.newKid());
    expect(got.stops.s1.lessonsDone).toEqual(['s1.l1', 's1.l2']);
  });

  it('keeps what is valid and drops the rest', () => {
    const k = saves.parseKid({
      grade: 'g9',
      placed: { grade: 'g3', day: '2026-10-01', by: 'robot' },
      stars: { 's1.l1': 'clean', 's1.l2': 'gold', 'x.y': 'clean', 's2.l1': 'mended' },
      worlds: { 'g1.w1': { passDay: 'soon', tries: -3 }, 'g10.w1': { tries: 1 }, 'g2.w2': { tries: 2.7, notYet: { day: '2026-10-02', missed: ['s3.l1', 'nope', 's3.l1'], redone: ['s3.l1', 's3.l2'] } }, 'g2.w1': { tries: 1, notYet: { day: '2026-10-02', missed: ['s2.l1'] } } },
      glow: { 's1.l1': 3, 's1.l2': 1 },
    });
    expect(k).toEqual({
      grade: null,
      stars: { 's1.l1': 'clean', 's2.l1': 'mended' },
      // `redone` keeps only missed rounds; an older save without it gets [] (nothing played again yet).
      worlds: { 'g1.w1': { tries: 0 }, 'g2.w2': { tries: 2, notYet: { day: '2026-10-02', missed: ['s3.l1'], redone: ['s3.l1'] } }, 'g2.w1': { tries: 1, notYet: { day: '2026-10-02', missed: ['s2.l1'], redone: [] } } },
      glow: { 's1.l2': 1 },
    });
    expect(saves.parseKid('junk')).toEqual(saves.newKid());
    expect(saves.parseKid({ grade: 'hs', placed: { grade: 'g1', day: '2026-10-01', by: 'grownup' } })).toMatchObject({ grade: 'hs', placed: { grade: 'g1', by: 'grownup' } });
  });

  it('travels in the export file and comes back the same; the PIN never travels', () => {
    const d = busy();
    const file = saves.exportSave({ name: 'Ada', color: '#2dd4bf' }, d);
    expect(file).not.toContain('fnv:');
    const got = saves.importSave(file);
    if ('error' in got) throw new Error(got.error);
    expect(got.data.kid).toEqual(d.kid);
  });

  it('travels through cloud sync and comes back the same', async () => {
    const d = busy();
    const packed = await packPlayer({ name: 'Ada', color: '#2dd4bf' }, d);
    const got = await readRemote(packed);
    if ('error' in got) throw new Error(got.error);
    expect(got.data.kid).toEqual(d.kid);
  });
});

// ---------- derived rewards and unlocks ----------

describe('derived: stars, stickers, buildings, badges, skipped bands, next round, days this week', () => {
  it('stars per band count clean and mended; one sticker per three stars, from the band list', () => {
    const d = saves.newSave();
    star(d, 'clean', 's1.l1', 's1.l2');
    expect(starsIn(d, 'g1')).toEqual({ clean: 2, mended: 0, got: 2, of: 7 });
    expect(stickersIn(d, 'g1')).toEqual([]);
    star(d, 'mended', 's1.l3');
    expect(starsIn(d, 'g1')).toEqual({ clean: 2, mended: 1, got: 3, of: 7 });
    expect(stickersIn(d, 'g1').map((s) => s.name)).toEqual([STICKERS.g1[0].name]);
    star(d, 'clean', 's14.l1', 's2.l2', 's4.l1', 's14.l2');
    expect(stickersIn(d, 'g1')).toHaveLength(2);
    expect(stickersIn(d, 'g2')).toEqual([]);
    // Every band has enough stickers for its rounds.
    for (const g of GRADES) expect(STICKERS[g.id].length, g.id).toBeGreaterThanOrEqual(Math.floor(roundsOf(g.id).length / 3));
  });

  it('a world check pass builds the building; the last one of a band earns the badge once', () => {
    let d = saves.newSave();
    const a = worldCheckInto(d, 'g1.w1', true, [], '2026-10-10');
    expect(a.badge).toBeNull();
    d = a.save;
    expect(buildings(d).map((w) => w.id)).toEqual(['g1.w1']);
    expect(hasBadge(d, 'g1')).toBe(false);
    const miss = worldCheckInto(d, 'g1.w2', false, ['s4.l1'], '2026-10-11');
    expect(miss.badge).toBeNull();
    expect(miss.save.kid.worlds['g1.w2']).toEqual({ tries: 1, notYet: { day: '2026-10-11', missed: ['s4.l1'], redone: [] } });
    const b = worldCheckInto(miss.save, 'g1.w2', true, [], '2026-10-12');
    expect(b.badge).toBe('g1');
    expect(b.save.kid.worlds['g1.w2']).toEqual({ tries: 2, passDay: '2026-10-12' });
    expect(badges(b.save)).toEqual(['g1']);
    // Passing again keeps the first day and never shows the ceremony again.
    const again = worldCheckInto(b.save, 'g1.w1', true, [], '2026-10-20');
    expect(again.badge).toBeNull();
    expect(again.save.kid.worlds['g1.w1'].passDay).toBe('2026-10-10');
    expect(buildings(again.save, 'g1')).toHaveLength(2);
  });

  it('skipped bands are below the grade with no stars; the next round and the unlock rules follow the order of play', () => {
    const d = saves.newSave();
    expect(nextRound(d)).toBeNull();
    d.kid.grade = 'g3';
    star(d, 'clean', 's1.l1');
    expect(skippedBands(d)).toEqual(['g2']);
    d.kid.grade = 'g1';
    expect(nextRound(d)).toMatchObject({ lessonId: 's1.l2', band: 'g1', k: 2 });
    expect(roundOpen(d, 's1.l2')).toBe(true);
    expect(roundOpen(d, 's1.l3')).toBe(false);
    expect(roundOpen(d, 's2.l2')).toBe(false);
    // The first world of every band is open: moving between grades is free.
    expect(roundOpen(d, 's2.l1')).toBe(true);
    expect(roundOpen(d, 's11.l1')).toBe(true);
    star(d, 'mended', 's1.l2', 's1.l3', 's14.l1');
    expect(roundOpen(d, 's2.l2')).toBe(true);
    expect(nextRound(d)?.lessonId).toBe('s2.l2');
    // A lesson done on the stop Journey (an older save) counts as played: it opens the next round.
    d.stops.s2 = { lessonsDone: ['s2.l2'], attempts: 0 };
    expect(roundOpen(d, 's4.l1')).toBe(true);
    star(d, 'clean', 's2.l2', 's4.l1', 's14.l2');
    expect(nextRound(d)).toMatchObject({ lessonId: 's2.l1', band: 'g2', k: 1 });
    expect(worldCheckState(d, gradeById('g1').worlds[0])).toBe('open');
    expect(worldCheckState(saves.newSave(), gradeById('g1').worlds[0])).toBe('locked');
  });

  it('days played this week: seven dots from Monday, a day counts after a minute, later days are ahead', () => {
    const w = daysThisWeek({ '2026-10-12': 600, '2026-10-13': 30, '2026-10-11': 900 }, DAY);
    expect(w.days.map((x) => x.day)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
    expect(w.days.map((x) => x.letter).join('')).toBe('MTWTFSS');
    expect(w.days.map((x) => x.played)).toEqual([true, false, false, false, false, false, false]);
    expect(w.days.map((x) => x.ahead)).toEqual([false, false, true, true, true, true, true]);
    expect(w.count).toBe(1);
    // Sunday is the last day of the same week; the next Monday starts with empty dots.
    expect(daysThisWeek({ '2026-10-12': 60, '2026-10-18': 60 }, '2026-10-18').count).toBe(2);
    expect(daysThisWeek({ '2026-10-12': 60, '2026-10-18': 60 }, '2026-10-19').count).toBe(0);
  });

  it('a grade in Grades 1 to 3 turns read-aloud on and the timer off; a placement is recorded only with who placed it', () => {
    const d = saves.newSave();
    const young = setGradeInto(d, 'g2', undefined, DAY);
    expect(young.kid.grade).toBe('g2');
    expect(young.kid.placed).toBeUndefined();
    expect(young.settings).toMatchObject({ readAloud: true, timer: false });
    const older = setGradeInto({ ...d, settings: { ...d.settings, readAloud: false } }, 'g6', 'grownup', DAY);
    expect(older.settings).toMatchObject({ readAloud: false, timer: true });
    expect(older.kid.placed).toEqual({ grade: 'g6', day: DAY, by: 'grownup' });
    expect(setGradeInto(older, null, undefined, DAY).kid.grade).toBeNull();
  });

  it('a stop’s lock-in and week checks make its stars glow', () => {
    const s1 = STOPS.find((s) => s.id === 's1')!;
    const d = saves.newSave();
    expect(glowInto(d, s1, 'pass')).toBe(d);
    const one = glowInto(d, s1, 'lockin');
    expect(one.kid.glow['s1.l1']).toBe(1);
    expect(glowInto(one, s1, 'week').kid.glow['s1.l7']).toBe(2);
    expect(glowInto(glowInto(one, s1, 'week'), s1, 'lockin').kid.glow['s1.l1']).toBe(2);
  });
});

// ---------- the star rule ----------

describe('the star rule: only the pass rule writes a star, never a Next tap', () => {
  const lesson = lessonById('s1.l1')!;
  const mended = { clean: false, tags: [] };
  /** Clean answers that meet a lesson's own pass rule (its count and its include groups). */
  const meets = (l: typeof lesson) => {
    const rule = l.pass ?? { firstTry: 3 };
    const tags = (rule.include ?? []).map((g) => g.tag);
    return Array.from({ length: rule.firstTry }, () => ({ clean: true, tags }));
  };

  it('a run with no answers (Next taps through the cards and boards) reports nothing', () => {
    expect(runSummary(lesson, true, [])).toBeNull();
    expect(runSummary(lesson, true, meets(lesson).slice(1))).toBeNull();
  });

  it('a lesson with guided boards reports nothing until they are marked', () => {
    const boarded = STOPS.flatMap((s) => s.lessons).find((l) => l.drill?.length)!;
    expect(runSummary(boarded, false, meets(boarded))).toBeNull();
    expect(runSummary(boarded, true, meets(boarded))).toEqual({ clean: true });
  });

  it('every try clean gives clean; a miss or a hint on the way gives mended', () => {
    expect(runSummary(lesson, true, meets(lesson))).toEqual({ clean: true });
    expect(runSummary(lesson, true, [mended, ...meets(lesson)])).toEqual({ clean: false });
  });

  it('starInto writes only for a lesson whose boards are marked, and never turns clean into mended', () => {
    const boarded = STOPS.flatMap((s) => s.lessons).find((l) => l.drill?.length)!;
    const d = saves.newSave();
    expect(starInto(d, boarded.id, 'clean')).toBe(d);
    const drilled = saves.markDrilled(d, boarded.id);
    const one = starInto(drilled, boarded.id, 'mended');
    expect(one.kid.stars[boarded.id]).toBe('mended');
    const two = starInto(one, boarded.id, 'clean');
    expect(two.kid.stars[boarded.id]).toBe('clean');
    expect(starInto(two, boarded.id, 'mended')).toBe(two);
    expect(starInto(d, 's99.l1', 'clean')).toBe(d);
  });

  it('placement answers count nowhere: no stats, no help, no Notebook card', () => {
    const d = saves.newSave();
    expect(answerInto(d, { skill: 's1.statement', firstTry: false, correct: false, stop: 1, lesson: 's1.l1' }, DAY, { fromPlacement: true })).toBe(d);
    expect(answerInto(d, { skill: 's1.statement', firstTry: false, correct: false, stop: 1, lesson: 's1.l1' }, DAY)).not.toBe(d);
  });
});

// ---------- the placement check ----------

describe('the placement check: two per band from Grade 1, stop at two misses in a row, 16 at most', () => {
  const run = (answers: boolean[]): PlacementState => answers.reduce((st, a) => placementStep(st, a), startPlacement());

  it('asks two questions per band, Grade 1 up', () => {
    const bands: (GradeId | null)[] = [];
    let st = startPlacement();
    for (let i = 0; i < 16; i++) { bands.push(placementBand(st)); st = placementStep(st, i % 2 === 0); }
    expect(bands).toEqual(['g1', 'g1', 'g2', 'g2', 'g3', 'g3', 'g4', 'g4', 'g5', 'g5', 'g6', 'g6', 'g7', 'g7', 'g8', 'g8']);
    expect(st.done).toBe(true);
    expect(placementBand(st)).toBeNull();
    expect(PLACEMENT_MAX).toBe(16);
    expect(placementGrade(st)).toBe('g8');
  });

  it('two misses in a row end it; it places in the highest band with a right answer, else Grade 1', () => {
    const none = run([false, false]);
    expect(none.done).toBe(true);
    expect(none.answers).toHaveLength(2);
    expect(placementGrade(none)).toBe('g1');
    const some = run([true, true, true, false, false]);
    expect(some.done).toBe(true);
    expect(placementGrade(some)).toBe('g2');
    expect(placementStep(some, true)).toBe(some);
    const late = run([true, true, false, true, false, false]);
    expect(late.done).toBe(true);
    expect(late.answers.map((a) => a.band)).toEqual(['g1', 'g1', 'g2', 'g2', 'g3', 'g3']);
    expect(placementGrade(late)).toBe('g2');
  });

  it('every band has its two questions: plain items, no guided board first, never a fixed board', () => {
    for (const band of ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'] as GradeId[]) {
      for (const k of [0, 1]) {
        const it = placementItem(band, k, 42 + k);
        expect(it, `${band} ${k}`).not.toBeNull();
        expect(it!.workFirst).toBeUndefined();
        expect(it!.fixed).toBeFalsy();
        expect(lessonById(it!.lesson), it!.lesson).toBeDefined();
        expect(it!.id).toBe(`place-${band}-${k}`);
      }
    }
  });
});

// ---------- the world check ----------

describe('the world check: questions from the rounds, all right passes', () => {
  it('draws the band’s count from the world’s rounds: every round asked, no scaffolds, no two alike, new ids', () => {
    for (const g of GRADES) {
      for (const w of g.worlds) {
        for (const seed of [1, 99]) {
          const items = worldCheckItems(w, g.check.items, seed);
          expect(items, `${w.id} ${seed}`).toHaveLength(g.check.items);
          expect(new Set(items.map((it) => it.id)).size).toBe(items.length);
          expect(new Set(items.map(looks)).size, `${w.id} looks`).toBe(items.length);
          for (const it of items) {
            expect(w.rounds).toContain(it.lesson);
            expect(it.workFirst).toBeUndefined();
            expect(it.fixed).toBeFalsy();
            expect(it.id.startsWith(`${w.id}-`)).toBe(true);
          }
          if (g.check.items >= w.rounds.length) for (const r of w.rounds) expect(items.some((it) => it.lesson === r), `${w.id} asks ${r}`).toBe(true);
        }
      }
    }
  });

  it('passes only when every answer is right; a miss names its rounds in the world’s order', () => {
    const w = gradeById('g1').worlds[0];
    const items = worldCheckItems(w, 5, 7);
    expect(worldCheckOutcome(w, items, items.map((it) => record(it, true)))).toEqual({ passed: true, missed: [] });
    const wrong = items.map((it, i) => record(it, i !== 3 && i !== 0));
    const out = worldCheckOutcome(w, items, wrong);
    expect(out.passed).toBe(false);
    expect(out.missed).toEqual(w.rounds.filter((r) => r === items[0].lesson || r === items[3].lesson));
    expect(worldCheckOutcome(w, [], []).passed).toBe(false);
  });
});

describe('the world check locks after a miss until every missed round is played again', () => {
  const w = gradeById('g1').worlds[0];
  const ready = () => { const d = saves.newSave(); star(d, 'clean', ...w.rounds); return d; };

  it('a miss records notYet with the missed rounds and redone []; the retry opens once each one is played again', () => {
    const miss = worldCheckInto(ready(), w.id, false, ['s1.l2', 's14.l1'], DAY).save;
    expect(miss.kid.worlds[w.id].notYet).toEqual({ day: DAY, missed: ['s1.l2', 's14.l1'], redone: [] });
    expect(worldCheckState(miss, w)).toBe('redo');
    expect(worldCheckOpen(miss, w)).toBe(false);
    expect(roundsToRedo(miss, w)).toEqual(['s1.l2', 's14.l1']);
    // A round the check did not miss changes nothing.
    expect(redoInto(miss, 's1.l1')).toBe(miss);
    const one = redoInto(miss, 's14.l1');
    expect(one.kid.worlds[w.id].notYet!.redone).toEqual(['s14.l1']);
    expect(worldCheckState(one, w)).toBe('redo');
    // Played again twice counts once.
    expect(redoInto(one, 's14.l1')).toBe(one);
    const both = redoInto(one, 's1.l2');
    expect(roundsToRedo(both, w)).toEqual([]);
    expect(worldCheckState(both, w)).toBe('notyet');
    expect(worldCheckOpen(both, w)).toBe(true);
    // A pass clears the not yet.
    const pass = worldCheckInto(both, w.id, true, [], DAY).save;
    expect(pass.kid.worlds[w.id].notYet).toBeUndefined();
    expect(worldCheckState(pass, w)).toBe('passed');
  });

  it('a world passed before and missed when taken again also waits; its building stays built', () => {
    const passed = worldCheckInto(ready(), w.id, true, [], '2026-10-01').save;
    const again = worldCheckInto(passed, w.id, false, ['s1.l3'], DAY).save;
    expect(worldCheckState(again, w)).toBe('redo');
    expect(buildings(again).map((x) => x.id)).toEqual([w.id]);
    expect(worldCheckState(redoInto(again, 's1.l3'), w)).toBe('passed');
  });

  it('the check row says “Play the missed rounds first” and stays locked; the missed rounds are marked', () => {
    const kv = store((d) => { d.kid.grade = 'g1'; star(d, 'clean', ...w.rounds); d.kid.worlds[w.id] = { tries: 1, notYet: { day: DAY, missed: ['s1.l2'], redone: [] } }; });
    const html = renderToString(inStore(kv, h(JourneyScreen, { route: { name: 'journey', track: 'grades' } })));
    const row = html.slice(html.lastIndexOf('<button', html.indexOf('Play the missed rounds first')), html.indexOf('</button>', html.indexOf('Play the missed rounds first')));
    expect(row).toContain('disabled');
    expect(row).toContain('Locked');
    const orange = html.indexOf('class="sl-row kid-round r-orange"');
    expect(orange).toBeGreaterThan(0);
    expect(html.slice(orange, html.indexOf('</button>', orange))).toContain(lessonById('s1.l2')!.title);
    // The world check screen does not open either.
    expect(text(inStore(kv, h(WorldCheckScreen, { route: { name: 'worldcheck', worldId: w.id } })))).toContain('Play the missed rounds first.');
    // Once the round is played again, the retry opens.
    const after = store((d) => { d.kid.grade = 'g1'; star(d, 'clean', ...w.rounds); d.kid.worlds[w.id] = { tries: 1, notYet: { day: DAY, missed: ['s1.l2'], redone: ['s1.l2'] } }; });
    const t = text(inStore(after, h(JourneyScreen, { route: { name: 'journey', track: 'grades' } })));
    expect(t).not.toContain('Play the missed rounds first');
    expect(t).toContain('Not yet. Try again!');
    expect(text(inStore(after, h(WorldCheckScreen, { route: { name: 'worldcheck', worldId: w.id } })))).toContain('Ready?');
  });
});

describe('buildings: every building name has its own drawing', () => {
  it('each world draws its own pictogram, and every building other than the house differs from the house', () => {
    const names = [...new Set(GRADES.flatMap((g) => g.worlds.map((x) => x.building)))];
    expect(names).toEqual(expect.arrayContaining(['lighthouse', 'bridge', 'tower', 'mill', 'tent', 'castle']));
    const inner = (name: Picto) => renderToString(h(Pictogram, { name, decorative: true })).replace(/^<svg[^>]*>|<\/svg>$/g, '');
    const house = inner('house');
    const drawings = new Map<string, string>();
    for (const name of names) {
      const d = inner(name);
      expect(d.length, name).toBeGreaterThan(20);
      if (name !== 'house') expect(d, name).not.toBe(house);
      drawings.set(d, name);
    }
    // No two building names share a drawing.
    expect(drawings.size).toBe(names.length);
    for (const g of GRADES) {
      for (const x of g.worlds) {
        const out = renderToString(h(Building, { world: x, built: false }));
        expect(out, x.id).toContain(`data-picto="${x.building}"`);
        expect(out).toContain(`aria-label="${x.title} ${PICTO_WORDS[x.building]}, not built yet"`);
        expect(out).toContain('is-dim');
      }
    }
    expect(renderToString(h(Building, { world: worldById('g5.w2')!, built: true }))).toContain('aria-label="Rule Reef lighthouse, built"');
  });
});

// ---------- routes and screens ----------

describe('routes: tabs, parents, the play screens', () => {
  it('tabFor, parentRoute, playing and hidesNav know the new routes', () => {
    const r = (x: Route) => x;
    expect(tabFor(r({ name: 'grade' }))).toBe('me');
    expect(tabFor(r({ name: 'worldcheck', worldId: 'g1.w1' }))).toBe('journey');
    expect(tabFor(r({ name: 'placement' }))).toBe('journey');
    expect(tabFor(r({ name: 'badge', grade: 'g1' }))).toBe('journey');
    expect(parentRoute(r({ name: 'worldcheck', worldId: 'g1.w1' }))).toEqual({ name: 'journey', track: 'grades' });
    expect(parentRoute(r({ name: 'badge', grade: 'g1' }))).toEqual({ name: 'journey', track: 'grades' });
    expect(parentRoute(r({ name: 'placement' }))).toEqual({ name: 'grade' });
    expect(parentRoute(r({ name: 'grade' }))).toEqual({ name: 'home' });
    expect(playing(r({ name: 'worldcheck', worldId: 'g1.w1' }))).toBe(true);
    expect(playing(r({ name: 'placement' }))).toBe(true);
    expect(hidesNav(r({ name: 'grade' }))).toBe(true);
    expect(hidesNav(r({ name: 'badge', grade: 'g2' }))).toBe(true);
    expect(hidesNav(r({ name: 'journey', track: 'grades' }))).toBe(false);
  });
});

describe('screens: the new player, the grade picker, the Journey grade tab, Home, Me, Settings', () => {
  it('the new-player screen asks only a name and a color: six words or fewer besides the name field, no PIN', () => {
    const html = renderToString(inStore(emptyDevice(), h(PlayersScreen, { route: { name: 'players', mode: 'new' } })));
    const form = html.slice(html.indexOf('<form'), html.indexOf('</form>') + 7);
    const shown = strip(form);
    expect(shown).toContain('Hi! What is your name?');
    expect(shown).toContain('Go');
    // The color dots have names for screen readers and no visible label.
    expect(shown).not.toContain('Pick a color');
    expect(form).toContain('aria-label="Pick a color"');
    for (const c of saves.COLORS) expect(form).toContain(`aria-label="${COLOR_NAMES[c]}"`);
    // Six words besides the name field ("Hi! What is your name?" and "Go"), and one small "Grown-ups" link.
    expect(words(shown)).toBe(6);
    expect(words(strip(html))).toBe(7);
    expect(strip(html).replace(shown, '').trim()).toBe(NEW_PLAYER_COPY.grownups);
    expect(strip(html)).not.toMatch(/PIN/);
    // Import and link wait behind the Grown-ups link: not on the screen until it opens.
    expect(html).not.toContain('Import a save');
    expect(html).toMatch(/aria-expanded="false"[^>]*>Grown-ups</);
  });

  it('“Which grade are you in?”: nine big buttons, the short check and “I’m a grown-up”', () => {
    const html = renderToString(inStore(store(), h(GradeScreen)));
    const t = strip(html);
    expect(t).toContain('Which grade are you in?');
    expect(html.split('kid-grade-btn').length - 1).toBe(9);
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) expect(html).toContain(`aria-label="Grade ${n}"`);
    expect(t).toContain('High school');
    expect(t).toContain('Not sure? Try a short check');
    expect(t).toContain('I’m a grown-up');
    expect(t).not.toContain('Back');
    // Changing a grade already set (from Me) can go back and keep it.
    expect(text(inStore(store((d) => { d.kid.grade = 'g2'; }), h(GradeScreen)))).toContain('Back');
  });

  it('the Journey’s grade tab: “My grade” first, the star sky, worlds as rows of rounds, check rows, Pip, other grades', () => {
    const kv = store((d) => { d.kid.grade = 'g1'; star(d, 'clean', 's1.l1'); });
    const html = renderToString(inStore(kv, h(JourneyScreen, { route: { name: 'journey' } })));
    const t = strip(html);
    expect(t.indexOf('My grade')).toBeGreaterThanOrEqual(0);
    expect(t.indexOf('My grade')).toBeLessThan(t.indexOf('Main track'));
    expect(t).toContain('Grade 1 · Starlight Meadow');
    expect(t).toContain('1 of 7 stars');
    expect(html).toContain('Star sky, Grade 1: 1 of 7 stars');
    expect(html).toContain('Round 1, What is a statement?: a bright star');
    expect(html).toMatch(/Round 2, [^"]+: open to play/);
    expect(html).toMatch(/Round 3, [^"]+: locked/);
    expect(t).toContain('Sky Path');
    expect(t).toContain('Meadow Gate');
    expect(t).toContain('Play ▸');
    expect(t).toContain('World check');
    expect(t).toContain('Get a star on every round first.');
    expect(t).toContain('Other grades');
    expect(t).toContain('Grade 8 · Proof Peak');
    expect(html).toContain('Pip, with empty sticker spots');
    expect(t).not.toContain('1. True or False?');
    // No grade: the classic Journey, no "My grade" chip.
    const classic = text(inStore(store(), h(JourneyScreen, { route: { name: 'journey' } })));
    expect(classic).not.toContain('My grade');
    expect(classic).toContain('1. True or False?');
  });

  it('the map names the grades below with no star as skipped, still open to play', () => {
    const kv = store((d) => { d.kid.grade = 'g3'; star(d, 'clean', 's1.l1'); });
    const html = renderToString(inStore(kv, h(JourneyScreen, { route: { name: 'journey', track: 'grades' } })));
    const t = strip(html);
    const grade2 = t.slice(t.indexOf('Grade 2 · River of Rules'));
    expect(grade2.startsWith('Grade 2 · River of Rules Skipped. Open to play.')).toBe(true);
    const grade1 = t.slice(t.indexOf('Grade 1 · Starlight Meadow'));
    expect(grade1.startsWith('Grade 1 · Starlight Meadow 1 of 7 stars')).toBe(true);
    expect(t.slice(t.indexOf('Grade 4 · Clue Canyon'))).toMatch(/^Grade 4 · Clue Canyon 0 of 10 stars/);
  });

  it('a badge shows on the map once every world check of the band is passed', () => {
    const kv = store((d) => { d.kid.grade = 'g1'; d.kid.worlds = { 'g1.w1': { passDay: DAY, tries: 1 }, 'g1.w2': { passDay: DAY, tries: 1 } }; });
    expect(renderToString(inStore(kv, h(JourneyScreen, { route: { name: 'journey', track: 'grades' } })))).toContain('Grade 1 badge');
  });

  it('Home in kid mode: Pip, Play the next round, the star sky and the days this week, nothing else', () => {
    const kv = store((d) => { d.kid.grade = 'g1'; });
    const html = renderToString(inStore(kv, h(HomeScreen)));
    const t = strip(html);
    expect(t).toContain('Play ▸ What is a statement?');
    expect(t).toContain('Days this week');
    expect(html).toContain('Star sky, Grade 1');
    expect(html).toContain('Pip');
    expect(t).not.toContain('Next up');
    expect(t).not.toContain('Today’s plan');
    expect(t).not.toMatch(/in a row|streak/i);
  });

  it('the classic Home: days this week instead of the flame, and the star sky under Next up once a grade is set', () => {
    const plain = renderToString(inStore(store(), h(HomeScreen)));
    expect(strip(plain)).toContain('Days this week');
    expect(strip(plain)).toContain('Next up');
    expect(plain).not.toMatch(/in a row/);
    expect(plain).not.toContain('Star sky');
    const g5 = renderToString(inStore(store((d) => { d.kid.grade = 'g5'; }), h(HomeScreen)));
    expect(strip(g5)).toContain('Next up');
    expect(g5).toContain('Star sky, Grade 5');
    expect(g5.indexOf('Star sky')).toBeGreaterThan(g5.indexOf('Next up'));
  });

  it('Me: the grade with a change chip, stars, stickers and badges, days this week, no streak', () => {
    const kv = store((d) => { d.kid.grade = 'g2'; star(d, 'clean', 's2.l1', 's2.l3', 's14.l3'); });
    const t = text(inStore(kv, h(MeScreen)));
    expect(t).toContain('Grade 2');
    expect(t).toContain('Change');
    expect(t).toContain('3 stars');
    expect(t).toContain('1 sticker');
    expect(t).toContain('0 badges');
    expect(t).toContain('Stickers: Frog');
    expect(t).toContain('Days this week');
    expect(t).not.toMatch(/streak/);
    expect(text(inStore(store(), h(MeScreen)))).toContain('Pick a grade');
  });

  it('Settings has a grade row to set or clear the grade', () => {
    const t = text(inStore(store((d) => { d.kid.grade = 'g3'; }), h(SettingsScreen)));
    expect(t).toContain('GRADE');
    expect(t).toContain('No grade (the classic Journey)');
    expect(t).toContain('Grade 3 · Treasure Hills');
    expect(t).toContain('Clear');
    expect(t).toContain('Grades 1 to 3 never show a timer');
  });
});

describe('screens: rounds from the map, world checks, placement, the badge ceremony', () => {
  const lessonAt = (lessonId: string, from: 'grades' | 'journey' | 'worldcheck') => ({ name: 'lesson' as const, stopId: lessonId.split('.')[0], lessonId, from });

  it('a round from the map skips both gates; its header reads “Round k of n · World”, or “Round k of n” alone in kid mode', () => {
    const kv = store((d) => { d.kid.grade = 'g4'; });
    const gated = text(inStore(kv, h(LessonScreen, { route: lessonAt('s2.l2', 'journey') })));
    expect(gated).toContain('opens when you have done Lesson 1');
    const t = text(inStore(kv, h(LessonScreen, { route: lessonAt('s2.l2', 'grades') })));
    expect(t).not.toContain('opens when you have done');
    expect(t).toContain('Round 1 of 3 · Meadow Gate');
    // An Observatory place that waits on a skill opens from the map too.
    const place = text(inStore(kv, h(LessonScreen, { route: lessonAt('s14.l2', 'grades') })));
    expect(place).not.toContain('needs');
    expect(place).toContain('Round 3 of 3 · Meadow Gate');
    expect(text(inStore(kv, h(LessonScreen, { route: lessonAt('s1.l2', 'worldcheck') })))).toContain('Round 2 of 4 · Sky Path');
    // Kid mode (Grades 1 to 3): only the back button and “Round k of n”, no lesson title and no world.
    const kidKv = store((d) => { d.kid.grade = 'g1'; });
    const kidHtml = renderToString(inStore(kidKv, h(LessonScreen, { route: lessonAt('s2.l2', 'grades') })));
    const head = kidHtml.slice(kidHtml.indexOf('<header class="play-head"'), kidHtml.indexOf('</header>') + 9);
    expect(strip(head)).toBe('Round 1 of 3');
    expect(head).not.toContain('play-head-over');
    expect(head).toContain('aria-label="Leave the lesson"');
    expect(strip(kidHtml)).not.toContain('Meadow Gate');
    const l1 = text(inStore(kidKv, h(LessonScreen, { route: lessonAt('s1.l1', 'grades') })));
    expect(l1.startsWith('Round 1 of 4 ')).toBe(true);
    expect(l1).not.toContain(lessonById('s1.l1')!.title);
  });

  it('kid mode hides the routine line, the routine strip and “Why it matters”; classic play keeps them', () => {
    const classic = text(inStore(store(), h(LessonScreen, { route: lessonAt('s1.l1', 'journey') })));
    expect(classic).toContain('the same routine as Pattern Lab');
    expect(classic).toContain('Why it matters');
    const kid = text(inStore(store((d) => { d.kid.grade = 'g1'; }), h(LessonScreen, { route: lessonAt('s1.l1', 'grades') })));
    expect(kid).not.toContain('the same routine as Pattern Lab');
    expect(kid).not.toContain('Why it matters');
    const placeClassic = renderToString(inStore(store(), h(LessonScreen, { route: lessonAt('s14.l1', 'grades') })));
    expect(placeClassic).toContain('play-routine-strip');
    const placeKid = renderToString(inStore(store((d) => { d.kid.grade = 'g1'; }), h(LessonScreen, { route: lessonAt('s14.l1', 'grades') })));
    expect(placeKid).not.toContain('play-routine-strip');
  });

  it('a stop check has no timer for Grades 1 to 3, and the grown-up timer otherwise', () => {
    const all = STOPS.find((s) => s.id === 's1')!.lessons.map((l) => l.id);
    const due = (grade: GradeId | null) => store((d) => { d.stops.s1 = { lessonsDone: all, attempts: 0 }; d.drilled = all; d.kid.grade = grade; });
    const route = { name: 'check' as const, stopId: 's1', kind: 'pass' as const };
    // Kid mode opens the stop check on its "Ready? Go" screen, like a world check; nothing on it is timed.
    const young = renderToString(inStore(due('g2'), h(CheckScreen, { route })));
    expect(young).toContain('kid-ready');
    expect(young).not.toMatch(/seconds for this question/);
    expect(text(inStore(due(null), h(CheckScreen, { route })))).toMatch(/seconds for this question/);
    // The stop page promises a calm timer only when the check will show one.
    const timed = (grade: GradeId | null) => store((d) => { d.stops.s1 = { lessonsDone: all, attempts: 0 }; d.drilled = all; d.kid.grade = grade; d.settings.timer = true; });
    expect(text(inStore(timed('g2'), h(StopScreen, { route: { name: 'stop', stopId: 's1' } })))).not.toContain('calm timer');
    expect(text(inStore(timed(null), h(StopScreen, { route: { name: 'stop', stopId: 's1' } })))).toContain('calm timer');
  });

  it('a world check opens once every round has a star: the world header, the band’s note, no timer', () => {
    const w = gradeById('g1').worlds[0];
    const locked = text(inStore(store((d) => { d.kid.grade = 'g1'; }), h(WorldCheckScreen, { route: { name: 'worldcheck', worldId: w.id } })));
    expect(locked).toContain('This check opens when every round has a star.');
    // A classic player (no grade) plays it with the world header and the note over the first question.
    const classic = text(inStore(store((d) => { star(d, 'clean', ...w.rounds); }), h(WorldCheckScreen, { route: { name: 'worldcheck', worldId: w.id } })));
    expect(classic).toContain('Grade 1 · Sky Path');
    expect(classic).toContain('World check');
    expect(classic).toContain(WORLD_CHECK_NOTE);
    expect(classic).toContain('Question 1 of 5');
    // Grades 4 to 8 keep the grown-up timer.
    expect(text(inStore(store((d) => { d.kid.grade = 'g4'; d.settings.timer = true; star(d, 'clean', ...w.rounds); }), h(WorldCheckScreen, { route: { name: 'worldcheck', worldId: w.id } })))).toMatch(/seconds for this question/);
  });

  it('a world check in kid mode opens on a one-tap “Ready? Go” screen, in the band’s word budget, before the first question', () => {
    const w = gradeById('g1').worlds[0];
    const kv = store((d) => { d.kid.grade = 'g1'; star(d, 'clean', ...w.rounds); });
    const out = renderToString(inStore(kv, h(WorldCheckScreen, { route: { name: 'worldcheck', worldId: w.id } })));
    const t = strip(out);
    expect(t).toBe(`World check Ready? ${WORLD_CHECK_KID_NOTE} Go`);
    expect(words(t)).toBeLessThanOrEqual(gradeById('g1').budget.words);
    expect(t).not.toContain('Question 1 of 5');
    expect(t).not.toContain('seconds for this question');
    expect(out).toContain('kid-ready');
  });

  it('the world check result: a pass builds the building; a miss offers “Learn it again” per round', () => {
    const w = gradeById('g1').worlds[0];
    const items = worldCheckItems(w, 5, 3);
    const passed: LastWorldCheck = { worldId: w.id, items, records: items.map((it) => record(it, true)), passed: true, missed: [] };
    const ok = text(h(WorldCheckResult, { world: w, result: passed, readAloud: false, onLearnAgain: () => {}, onDone: () => {} }));
    expect(ok).toContain('Passed');
    expect(ok).toContain('You built the Sky Path house!');
    const records = items.map((it, i) => record(it, i !== 0));
    const missed = worldCheckOutcome(w, items, records).missed;
    const no = text(h(WorldCheckResult, { world: w, result: { worldId: w.id, items, records, passed: false, missed }, readAloud: false, onLearnAgain: () => {}, onDone: () => {} }));
    expect(no).toContain('Not yet · 4 of 5');
    expect(no).toContain('Learn it again');
    expect(no).toContain(`Round ${w.rounds.indexOf(missed[0]) + 1} · ${lessonById(missed[0])!.title}`);
  });

  it('the placement check starts untimed with its first Grade 1 question', () => {
    const t = text(inStore(store(), h(PlacementScreen)));
    expect(t).toContain('Short check');
    expect(t).toContain('No timer');
    expect(t).toContain('Just try. A miss is fine.');
    expect(t).toContain('Question 1');
  });

  it('the grade badge ceremony: Pip cheers, the badge, “Grade N done!”, a print button', () => {
    const html = renderToString(inStore(store((d) => { d.kid.grade = 'g1'; }), h(BadgeScreen, { grade: 'g1' })));
    const t = strip(html);
    expect(t).toContain('Grade 1 done!');
    expect(t).toContain('Print a certificate');
    expect(html).toContain('Grade 1 badge');
    expect(html).toContain('kid-pip is-cheer');
    expect(badgeLine('hs')).toBe('High school done!');
    const still = renderToString(inStore(store((d) => { d.settings.reduceMotion = true; }), h(BadgeScreen, { grade: 'g2' })));
    expect(still).toContain('kid-ceremony is-still');
  });
});
