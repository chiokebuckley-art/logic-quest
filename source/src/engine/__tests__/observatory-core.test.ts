/**
 * The Pattern Observatory's shared core: unlock rules that never touch the main path, the evidence profile and its
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

describe('unlocks: the Observatory opens from the start and never blocks the main path (acceptance check 8)', () => {
  it('stops 1-13 unlock exactly as before; the rings are open with no progress', () => {
    const views = viewAll(STOPS, {}, today);
    const byId = Object.fromEntries(views.map((v) => [v.stop.id, v.view.status]));
    expect(byId.s1).toBe('learning');
    for (let n = 2; n <= 7; n++) expect(byId[`s${n}`], `s${n}`).toBe('locked');
    for (let n = 8; n <= 13; n++) expect(byId[`s${n}`], `s${n}`).toBe('soon');
    for (let n = 14; n <= 17; n++) expect(byId[`s${n}`], `s${n}`).toBe(STOPS.find((s) => s.n === n)!.ready ? 'learning' : 'soon');
    // The lock label still names the stop before, as before.
    expect(views.find((v) => v.stop.id === 's2')!.view.label).toBe('Opens after Stop 1');
  });
  it('a ring requires nothing; a main stop requires the one before it; passing s1 opens s2 and nothing else changes', () => {
    for (const s of STOPS.filter((x) => x.observatory)) expect(requiredStops(STOPS, s)).toEqual([]);
    expect(requiredStops(STOPS, STOPS[1]).map((s) => s.id)).toEqual(['s1']);
    const after = viewAll(STOPS, { s1: { lessonsDone: [], attempts: 1, passDay: '2026-10-01' } }, today);
    expect(after.find((v) => v.stop.id === 's2')!.view.status).toBe('learning');
    expect(after.find((v) => v.stop.id === 's3')!.view.status).toBe('locked');
    // An unreachable stop cannot exist: every stop's requirements are stops in the list.
    for (const s of STOPS) expect(stopOpening(STOPS, {}, s).after.length >= 0).toBe(true);
    const fake: StopDef = { n: 99, id: 's99', title: 'X', idea: '', ready: true, lessons: [], requires: ['s1', 's14'] };
    expect(stopOpening([...STOPS, fake], {}, fake).after).toBe('Stop 1 (True or False?) and Stop 14 (First Lights)');
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
