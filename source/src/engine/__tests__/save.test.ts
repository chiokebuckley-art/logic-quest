import { describe, expect, it } from 'vitest';
import { addPlayer, checkPin, exportSave, hashPin, importSave, loadRegistry, loadSave, newSave, parseSave, recordAnswer, saveRegistry, statsCsv, writeSave, type KV } from '../save/save';

const memory = (): KV & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
};

describe('saves', () => {
  it('round-trips a save and a registry through storage', () => {
    const kv = memory();
    const { reg, player } = addPlayer({ players: [] }, '  Sam  ', '#a78bfa', 1000, 0.5);
    saveRegistry(kv, reg);
    const data = recordAnswer(newSave(1), '2026-09-30', 's1.cant-tell', true);
    writeSave(kv, player.id, data, 2000);
    expect(loadRegistry(kv).players[0]).toMatchObject({ name: 'Sam', color: '#a78bfa' });
    expect(loadSave(kv, player.id).stats['2026-09-30']['s1.cant-tell']).toEqual([1, 1]);
  });
  it('refuses saves from other games and clamps bad fields', () => {
    expect(parseSave({ character: { name: 'x' } })).toBeNull();
    const s = parseSave({ game: 'logic-quest', stops: { s1: { lessonsDone: ['s1.l1', 7], attempts: -3, passDay: 'yesterday' }, evil: {} } });
    expect(s!.stops.s1).toEqual({ lessonsDone: ['s1.l1'], attempts: 0 });
    expect(s!.stops.evil).toBeUndefined();
  });
  it('checks PINs by salted hash', () => {
    const pin = hashPin('4821', 'abc');
    expect(checkPin({ id: 'p', name: 'A', color: '#a78bfa', pin, createdAt: 0, lastPlayed: 0 }, '4821')).toBe(true);
    expect(checkPin({ id: 'p', name: 'A', color: '#a78bfa', pin, createdAt: 0, lastPlayed: 0 }, '1234')).toBe(false);
  });
  it('exports and imports a player, and rejects another game', () => {
    const text = exportSave({ name: 'Sam', color: '#2dd4bf' }, newSave(5));
    expect(importSave(text)).toMatchObject({ name: 'Sam', color: '#2dd4bf' });
    expect(importSave(JSON.stringify({ game: 'engineering-quest', data: {} }))).toEqual({ error: 'That save belongs to a different game, not Logic Quest.' });
  });
  it('writes a CSV of answers by day and skill', () => {
    let d = newSave(0);
    d = recordAnswer(d, '2026-09-30', 's2.or', false);
    d = recordAnswer(d, '2026-09-30', 's2.or', true);
    expect(statsCsv(d)).toBe('date,skill,answered,first_try_right\n2026-09-30,s2.or,2,1\n');
  });
});

describe('review fixes', () => {
  it('drops imported skill keys that are not skill tags, so the CSV stays safe', () => {
    const s = parseSave({ game: 'logic-quest', stats: { '2026-09-30': { 's1.ok': [2, 1], 's1.x,=HYPERLINK("http://e.x")\nfake,row': [1, 1] } } })!;
    expect(Object.keys(s.stats['2026-09-30'])).toEqual(['s1.ok']);
    expect(statsCsv(s)).toBe('date,skill,answered,first_try_right\n2026-09-30,s1.ok,2,1\n');
  });
});

describe('checks in progress', () => {
  it('keeps a well-formed open check and drops a bad one', () => {
    const ok = parseSave({ game: 'logic-quest', stops: { s1: { lessonsDone: [], attempts: 0, openCheck: { kind: 'pass', day: '2026-09-30', answered: [{ lesson: 's1.l1', correct: true }, { bad: 1 }] } } } })!;
    expect(ok.stops.s1.openCheck).toEqual({ kind: 'pass', day: '2026-09-30', answered: [{ lesson: 's1.l1', correct: true }] });
    const bad = parseSave({ game: 'logic-quest', stops: { s1: { lessonsDone: [], attempts: 0, openCheck: { kind: 'quiz', day: 'x', answered: [] } } } })!;
    expect(bad.stops.s1.openCheck).toBeUndefined();
  });
});

describe('notebook in saves', () => {
  it('keeps good notebook cards and drops bad ones', () => {
    const s = parseSave({ game: 'logic-quest', fixedCount: 4, notebook: {
      's2.or-both': { stop: 2, lesson: 's2.l3', missed: '2026-09-30', fixes: 1, due: '2026-10-03' },
      'bad key': { stop: 2, lesson: 's2.l3', missed: '2026-09-30', fixes: 1, due: '2026-10-03' },
      's1.x': { stop: 1, lesson: 'nope', missed: '2026-09-30', fixes: 1, due: '2026-10-03' },
    } })!;
    expect(Object.keys(s.notebook)).toEqual(['s2.or-both']);
    expect(s.notebook['s2.or-both']).toMatchObject({ skill: 's2.or-both', fixes: 1 });
    expect(s.fixedCount).toBe(4);
  });
});

describe('fields from a newer version', () => {
  it('are carried through untouched, so an older tab that saves does not wipe them', () => {
    const raw = { ...newSave(0), streakShields: 2, badges: { s4: 'gold' }, toString: 'x', '__proto__': { evil: 1 }, 'bad key': 1 };
    const s = parseSave(JSON.parse(JSON.stringify(raw)))! as unknown as Record<string, unknown>;
    expect(s.streakShields).toBe(2);
    expect(s.badges).toEqual({ s4: 'gold' });
    expect(Object.prototype.hasOwnProperty.call(s, 'toString')).toBe(false);
    expect(s['bad key']).toBeUndefined();
    expect(({} as Record<string, unknown>).evil).toBeUndefined();
    const again = parseSave(JSON.parse(JSON.stringify(s)))! as unknown as Record<string, unknown>;
    expect(again.badges).toEqual({ s4: 'gold' });
  });
});

