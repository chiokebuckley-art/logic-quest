/**
 * The Pattern Observatory's shared core: unlock rules (every stop's requires, rings included), the evidence profile and its
 * save key, the number item, the diagnostic's adaptive rule, and the circle-regions safeguard (acceptance checks
 * 3, 4, 7, 8 and 9 of the handoff).
 */
import { describe, expect, it } from 'vitest';
import { STOPS } from '../../content/stops';
import { placeWaitsFor } from '../drill';
import { EVIDENCE, entryLevel, logAnswer, markComplete, newEvidence, parseEvidence, profileOf, recordIndependent, recordReview, startTrack, stepTrack, type EvidenceEntry } from '../evidence';
import { grade } from '../grade';
import { requiredStops, stopOpening, viewAll } from '../journey/mastery';
import { lanternPoints, maxRegions, mayLabel31, regionsOf, threeChordsMeet } from '../puzzles/observatory/lantern';
import { newSave, parseSave } from '../save/save';
import type { LessonDef, NumberItem, StopDef } from '../types';

const today = '2026-10-07';

describe('unlocks: the Journey order and every stop’s requires (docs/CURRICULUM-PLAN.md §1, acceptance check 2)', () => {
  // Arguments (s18) is built. The regression keeps its one-lesson stand-in, so these unlock checks do not depend on its lessons.
  const built = STOPS.map((s) => (s.id === 's18' ? { ...s, ready: true, lessons: [{ id: 's18.l1', title: 'Givens and claims', ideas: [], practice: () => [] }] } : s));
  /** A stop that is not ready (an unknown id, s99): the example of a stop still coming. */
  const later: StopDef = { n: 99, id: 's99', title: 'Later', idea: '', ready: false, lessons: [] };
  const passed = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { lessonsDone: [], attempts: 1, passDay: '2026-10-01' }]));
  const statusOf = (stops: readonly StopDef[], progress: Record<string, { lessonsDone: string[]; attempts: number; passDay?: string }>) =>
    Object.fromEntries(viewAll(stops, progress, today).map((v) => [v.stop.id, v.view]));

  it('with no progress: Stop 1 is open, Arguments opens after Stop 1, NOT, AND, OR after Stop 2, and every ring is locked', () => {
    const v = statusOf(built, {});
    expect(v.s1.status).toBe('learning');
    expect(v.s18).toMatchObject({ status: 'locked', label: 'Opens after Stop 1' });
    expect(v.s2).toMatchObject({ status: 'locked', label: 'Opens after Stop 2' });
    for (let n = 3; n <= 7; n++) expect(v[`s${n}`].status, `s${n}`).toBe('locked');
    // Stops shown as 9-14 (ids s8-s13): a built one waits for the stop it opens after; one still coming shows as coming.
    for (let n = 8; n <= 13; n++) expect(v[`s${n}`].status, `s${n}`).toBe(built.find((s) => s.id === `s${n}`)!.ready ? 'locked' : 'soon');
    expect(v.s8).toMatchObject({ status: 'locked', label: 'Opens after Stop 8' });
    // No ring is open from the start any more: Ring 1 needs Stop 1.
    for (const s of built.filter((x) => x.observatory)) expect(v[s.id].status, s.id).toBe('locked');
    expect(v.s14.label).toBe('Opens after Stop 1');
    expect(v.s15.label).toBe('Opens after Ring 1');
    expect(v.s16.label).toBe('Opens after Ring 1');
    expect(v.s17.label).toBe('Opens after Stop 6 (Knights & Knaves), Stop 8 (Ways to Think) and Ring 2 (Rule Rise)');
    // The real list today: Arguments is built and opens after Stop 1; a stop that is not ready shows as coming; and
    // NOT, AND, OR names Arguments by its shown number.
    const real = statusOf([...STOPS, later], {});
    expect(real.s18).toMatchObject({ status: 'locked', label: 'Opens after Stop 1' });
    expect(real.s99.status).toBe('soon');
    expect(real.s2).toMatchObject({ status: 'locked', label: 'Opens after Stop 2' });
  });

  it('passing Stop 1 opens Arguments and Ring 1; passing Arguments too opens NOT, AND, OR', () => {
    const one = statusOf(built, passed('s1'));
    expect(one.s18.status).toBe('learning');
    expect(one.s14.status).toBe('learning');
    expect(one.s2.status).toBe('locked');
    expect(one.s15.status).toBe('locked');
    const two = statusOf(built, passed('s1', 's18'));
    expect(two.s2.status).toBe('learning');
    expect(two.s3.status).toBe('locked');
    // Ring 2 and Ring 3 need Ring 1; Ring 4 needs Stops 6 and 8 (ids s5, s7) and Ring 2.
    expect(statusOf(built, passed('s1', 's14')).s15.status).toBe('learning');
    expect(statusOf(built, passed('s1', 's14')).s16.status).toBe('learning');
    expect(statusOf(built, passed('s1', 's14', 's15', 's5')).s17.status).toBe('locked');
    expect(statusOf(built, passed('s1', 's14', 's15', 's5', 's7')).s17.status).toBe('learning');
  });

  it('a save from before Arguments keeps every stop it had open: started or passed stops never lock again', () => {
    // Stops 1-7 passed under the old order (no Arguments): all still passed, none locked.
    const old = statusOf(STOPS, passed('s1', 's2', 's3', 's4', 's5', 's6', 's7'));
    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's7']) expect(old[id].status, id).toBe('passed');
    // Arguments is new to this save: it is open, because Stop 1 is passed. A stop that is not ready stays coming.
    expect(old.s18.status).toBe('learning');
    expect(statusOf([...STOPS, later], passed('s1', 's2', 's3', 's4', 's5', 's6', 's7')).s99.status).toBe('soon');
    // Partway through NOT, AND, OR: it stays open; the next stop still waits for it.
    const partway = statusOf(STOPS, { ...passed('s1'), s2: { lessonsDone: ['s2.l1'], attempts: 0 } });
    expect(partway.s2.status).toBe('learning');
    expect(partway.s3.status).toBe('locked');
  });

  it('every stop requires stops in the list, as the plan sets them; labels name a stop by its shown number', () => {
    const req = (id: string) => requiredStops(STOPS, STOPS.find((s) => s.id === id)!).map((s) => s.id);
    expect(req('s1')).toEqual([]);
    expect(req('s18')).toEqual(['s1']);
    expect(req('s2')).toEqual(['s18']);
    expect(req('s14')).toEqual(['s1']);
    expect(req('s15')).toEqual(['s14']);
    expect(req('s16')).toEqual(['s14']);
    expect(req('s17')).toEqual(['s5', 's7', 's15']);
    expect(req('s11')).toEqual(['s10', 's17']);
    expect(req('s12')).toEqual(['s8']);
    expect(req('s13')).toEqual(['s12']);
    for (const s of STOPS) for (const id of s.requires ?? []) expect(STOPS.some((x) => x.id === id), `${s.id} needs ${id}`).toBe(true);
    // Two required stops, or one that is not right before: each named with its title.
    expect(stopOpening(STOPS, {}, STOPS.find((s) => s.id === 's11')!).after).toBe('Stop 11 (Circuit Lab) and Ring 4 (Proof Lantern)');
    expect(stopOpening(STOPS, {}, STOPS.find((s) => s.id === 's12')!).after).toBe('Stop 9 (All, Some, None)');
    expect(stopOpening(STOPS, {}, STOPS.find((s) => s.id === 's13')!).after).toBe('Stop 13');
    const fake: StopDef = { n: 99, id: 's99', title: 'X', idea: '', ready: true, lessons: [], requires: ['s1', 's14'] };
    expect(stopOpening([...STOPS, fake], {}, fake).after).toBe('Stop 1 (True or False?) and Ring 1 (First Lights)');
  });
  it('a place opens on skills: required lessons done anywhere, the diagnostic’s credit, or its primer', () => {
    const place: LessonDef = { id: 's15.l2', title: 'Rule Machine', ideas: [], practice: () => [], requires: ['s15.l1', 's2.l5'] };
    expect(placeWaitsFor(place, { done: [], shown: [], primers: [] })).toEqual(['s15.l1', 's2.l5']);
    expect(placeWaitsFor(place, { done: ['s15.l1'], shown: [], primers: [] })).toEqual(['s2.l5']);
    expect(placeWaitsFor(place, { done: ['s15.l1'], shown: ['s2.l5'], primers: [] })).toEqual([]);
    expect(placeWaitsFor(place, { done: [], shown: [], primers: ['s15.l2'] })).toEqual([]);
    expect(placeWaitsFor({ ...place, requires: [] }, { done: [], shown: [], primers: [] })).toEqual([]);
  });
});

describe('evidence: supported never becomes independent; the profile is a ladder; the save carries it (checks 3, 4, 7)', () => {
  const entry = (over: Partial<EvidenceEntry>): EvidenceEntry => ({ item: 'x', lesson: 's14.l1', skill: 's14.unit', phase: 'do', day: today, right: true, first: true, hints: 0, supported: false, version: '0.10.0', ...over });
  it('a hinted or repaired answer is logged as supported and counts as practice only', () => {
    let e = logAnswer(newEvidence(), entry({ hints: 1, supported: true, first: false }));
    let p = profileOf(e, 's14.l1', today);
    expect(p.practiced).toBe(true);
    expect(p.complete).toBe(false);
    expect(p.independent).toBe(false);
    // A transfer item right on the first try with no help counts toward Transferred; a supported one does not.
    e = logAnswer(e, entry({ phase: 'transfer', supported: true, first: false }));
    e = logAnswer(e, entry({ phase: 'transfer' }));
    e = logAnswer(e, entry({ phase: 'transfer' }));
    p = profileOf(e, 's14.l1', today);
    expect(e.lessons['s14.l1'].transferred).toBe(2);
    expect(p.transferred).toBe(true);
  });
  it('lesson complete opens the first review in about two days; 5 of 6 makes independent; 3 of 4 climbs the retained stages', () => {
    let e = markComplete(newEvidence(), 's14.l1', '2026-10-01');
    expect(e.lessons['s14.l1'].reviewDue).toBe('2026-10-03');
    expect(profileOf(e, 's14.l1', '2026-10-02').reviewDue).toBe(false);
    expect(profileOf(e, 's14.l1', '2026-10-03').reviewDue).toBe(true);
    expect(profileOf(e, 's14.l1', '2026-10-03').independentDue).toBe(true);
    e = recordIndependent(e, 's14.l1', 4, 6, '2026-10-03');
    expect(profileOf(e, 's14.l1', '2026-10-03').independent).toBe(false);
    e = recordIndependent(e, 's14.l1', 5, 6, '2026-10-04');
    expect(profileOf(e, 's14.l1', '2026-10-04').independent).toBe(true);
    // A worse later run never lowers the record.
    e = recordIndependent(e, 's14.l1', 2, 6, '2026-10-05');
    expect(e.lessons['s14.l1'].independent?.right).toBe(5);
    e = recordReview(e, 's14.l1', 3, '2026-10-03');
    expect(e.lessons['s14.l1'].retained.stage).toBe(1);
    expect(e.lessons['s14.l1'].reviewDue).toBe('2026-10-08');
    e = recordReview(e, 's14.l1', 2, '2026-10-08');
    expect(e.lessons['s14.l1'].retained.stage).toBe(1);
    expect(e.lessons['s14.l1'].reviewDue).toBe('2026-10-09');
    e = recordReview(e, 's14.l1', 4, '2026-10-09');
    expect(e.lessons['s14.l1'].retained.stage).toBe(2);
    expect(e.lessons['s14.l1'].reviewDue).toBe('2026-10-22');
    e = recordReview(e, 's14.l1', 3, '2026-10-22');
    expect(e.lessons['s14.l1'].retained.stage).toBe(3);
    expect(profileOf(e, 's14.l1', '2026-11-01').retained).toBe(3);
    expect(profileOf(e, 's14.l1', '2026-11-01').reviewDue).toBe(false);
  });
  it('the save keeps the evidence through a round trip, a legacy save starts empty, and the log is capped', () => {
    const s = newSave(0);
    let e = markComplete(s.evidence, 's14.l1', today);
    for (let i = 0; i < EVIDENCE.maxLog + 20; i++) e = logAnswer(e, entry({ item: `i${i}` }));
    e = { ...e, plain: true, primers: ['s15.l3'], diagnostic: { day: today, levels: { 1: 2, 2: 1, 3: 1, 4: 2 }, shown: ['s14.l1'] } };
    const back = parseSave(JSON.parse(JSON.stringify({ ...s, evidence: e })))!;
    expect(back.evidence.log.length).toBe(EVIDENCE.maxLog);
    expect(back.evidence.log[0].item).toBe('i20');
    expect(back.evidence.lessons['s14.l1'].complete).toBe(today);
    expect(back.evidence.plain).toBe(true);
    expect(back.evidence.primers).toEqual(['s15.l3']);
    expect(back.evidence.diagnostic?.levels['1']).toBe(2);
    const legacy = parseSave({ ...newSave(0), evidence: undefined })!;
    expect(legacy.evidence).toEqual(newEvidence());
    // Junk is dropped field by field, never thrown.
    expect(parseEvidence({ lessons: { bad: 1, 's14.l1': { complete: 'nope', transferred: 'x' } }, log: [{ item: 1 }, 'x'], plain: 'yes' }).lessons['s14.l1']).toEqual({ transferred: 0, retained: { stage: 0 } });
  });
});

describe('the number item and the diagnostic rule', () => {
  const item: NumberItem = { kind: 'number', id: 'n1', stop: 15, lesson: 's15.l1', skill: 's15.grow', prompt: 'How many tiles at step 10?', explain: 'One centre and ten pairs: 21.', answer: 21, unit: 'tiles', feedback: { '20': { headline: 'Twenty is ten pairs with no centre.', detail: ['Count the centre tile too.'] } }, whyWrong: { '20': 'Twenty is ten pairs with no centre. Count the centre tile too.' } };
  it('grades by equality and names a listed wrong number’s gap', () => {
    expect(grade(item, { kind: 'number', value: 21 }).correct).toBe(true);
    expect(grade(item, { kind: 'number', value: 20 })).toEqual({ correct: false, feedback: 'Twenty is ten pairs with no centre. Count the centre tile too.' });
    expect(grade(item, { kind: 'number', value: 19 }).feedback).toBe('Your answer was 19. The rule gives 21 tiles.');
    expect(grade(item, null).correct).toBe(false);
  });
  it('each track starts at L1, climbs after two right in a row, and ends at the first miss', () => {
    let t = startTrack();
    t = stepTrack(t, true);
    expect(t.level).toBe(1);
    t = stepTrack(t, true);
    expect(t.level).toBe(2);
    expect(t.shown).toBe(1);
    t = stepTrack(t, true);
    expect(t.shown).toBe(2);
    t = stepTrack(t, false);
    expect(t.ended).toBe(true);
    expect(entryLevel(t)).toBe(2);
    expect(entryLevel(stepTrack(startTrack(), false))).toBe(1);
    // The top level ends the track after two right.
    const top = stepTrack(stepTrack({ ...startTrack(), level: 4 }, true), true);
    expect(top.ended).toBe(true);
    expect(entryLevel(top)).toBe(4);
  });
});

describe('circle regions (acceptance check 9): the maximum needs no three chords through one point', () => {
  it('points in general position give 1, 2, 4, 8, 16, 31; the regular hexagon gives 30 and may never be labelled 31', () => {
    for (let n = 1; n <= 6; n++) {
      const pts = lanternPoints(n, false);
      expect(threeChordsMeet(pts), `n=${n}`).toBe(false);
      expect(regionsOf(pts), `n=${n}`).toBe(maxRegions(n));
    }
    expect([1, 2, 3, 4, 5, 6].map(maxRegions)).toEqual([1, 2, 4, 8, 16, 31]);
    const hex = lanternPoints(6, true);
    expect(threeChordsMeet(hex)).toBe(true);
    expect(regionsOf(hex)).toBe(30);
    expect(mayLabel31(hex)).toBe(false);
    expect(mayLabel31(lanternPoints(6, false))).toBe(true);
  });
});
