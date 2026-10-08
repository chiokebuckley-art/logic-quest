import { describe, expect, it } from 'vitest';
import { EVENT_IDS, ROUTINE, makeRound, completeBridge, freshBridge, parseBridge } from './bridges';
import { newSave, parseSave, exportSave, importSave } from '../../engine/save/save';
import { OBSERVATORY_ROUTINE } from '../components/RoutineStrip';

describe('Pattern bridges and independent mastery', () => {
  it('uses the six shared words in the Observatory’s order (re-ordered with the owner’s OK in v0.10.0), and the Observatory strip is the same list', () => {
    expect(ROUTINE).toEqual(['Notice','Describe','Compare','Test','Predict','Explain']);
    expect(OBSERVATORY_ROUTINE).toBe(ROUTINE);
  });
  it('gives separating machine tests for both hidden rules across seeds', () => {
    const survivors = new Set<string>();
    for(let seed=0;seed<100;seed++) {
      for(const id of [...EVENT_IDS,'workshop-notice','workshop-sort','workshop-repeat','workshop-uncertain']) {
        const r=makeRound(id,seed);
        for(const q of [r.describe,r.predict,r.test,r.explain]) {
          expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
          expect(new Set(q.options).size).toBe(q.options.length);
        }
        if(id==='FM-02') {
          expect(r.test.answer).not.toBe('2 (input pieces)');
          const values=r.predict.answer.match(/\d+/g)!.map(Number);
          expect(values[0]).not.toBe(values[1]);
          survivors.add(r.explain.answer);
        }
      }
    }
    expect(survivors.size).toBe(2);
  });
  it('LC-01 and the Workshop repeat round vary the block (AB, ABB, ABC), with every answer computed from the tokens', () => {
    const structure = (xs: string[]) => { const m = new Map<string, string>(); return xs.map((x) => { if (!m.has(x)) m.set(x, 'ABC'[m.size]); return m.get(x)!; }).join(''); };
    const shortest = (xs: string[]) => { for (let p = 1; p <= xs.length; p++) if (xs.every((x, i) => i < p || x === xs[i - p])) return p; return xs.length; };
    for (const id of ['LC-01', 'workshop-repeat']) {
      const units = new Set<string>();
      for (let seed = 0; seed < 100; seed++) {
        const r = makeRound(id, seed);
        const labels = r.tokens!.map((t) => t.label!);
        const k = shortest(labels);
        expect(labels.length, `${id} ${seed}`).toBeGreaterThanOrEqual(2 * k);
        units.add(structure(labels.slice(0, k)));
        // The smallest unit names k objects; the next object is the unit's piece at position n + 1.
        expect(r.describe.answer).toBe(k === 2 ? 'First two objects' : 'First three objects');
        expect(r.predict.answer).toBe(labels[labels.length % k]);
        // The action that keeps the relation has the same structure as the conveyor.
        expect(structure(r.explain.answer.toLowerCase().split(', ')).slice(0, k)).toBe(structure(labels.slice(0, k)));
        for (const o of r.explain.options) if (o !== r.explain.answer && o.includes(',')) expect(structure(o.toLowerCase().split(', '))).not.toBe(structure(r.explain.answer.toLowerCase().split(', ')));
      }
      expect([...units].sort(), id).toEqual(['AB', 'ABB', 'ABC']);
    }
  });
  it('TI-01 has its own content: one relation in two settings, not the BR-01 default', () => {
    const relations = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const r = makeRound('TI-01', seed);
      const br = makeRound('BR-01', seed);
      expect(r.title).not.toBe(br.title);
      expect(r.evidence).not.toBe(br.evidence);
      const m = /^First island: the (\w+) (\w+) the (\w+)\. Second island: the (\w+) (\w+) the (\w+)\./.exec(r.evidence)!;
      expect(m, r.evidence).toBeTruthy();
      expect(m[2]).toBe(m[5]);
      expect(m[1]).not.toBe(m[4]);
      relations.add(m[2]);
      expect(r.describe.answer).toBe(`The first thing ${m[2]} the second`);
      expect(r.predict.answer).toBe(m[4]);
      expect(r.explain.answer.startsWith('The ')).toBe(true);
    }
    expect(relations.size).toBeGreaterThan(1);
  });
  it('saves bridge preparation without changing any native stop progress', () => {
    const save=newSave(1);
    save.stops.s1={lessonsDone:['s1.l1'],attempts:0};
    const before=JSON.stringify(save.stops);
    save.patternBridge=completeBridge(save.patternBridge,['SC-01','FM-02','TM-02','CD-02'],true);
    expect(JSON.stringify(save.stops)).toBe(before);
    expect(save.stops.s10).toBeUndefined();
    const exported=importSave(exportSave({name:'Sam',color:'#2dd4bf'},save));
    expect('error' in exported).toBe(false);
    if('error' in exported) throw Error(exported.error);
    expect(exported.data.patternBridge.workshop).toBe(true);
    expect(exported.data.patternBridge.evidenceScout).toBe(true);
  });
  it('does not trust forged badge claims, or treat EQ progress as LQ mastery', () => {
    expect(parseBridge({evidenceScout:true,completed:['PS-01','PS-02','U11']})).toEqual(freshBridge());
    expect(parseSave({game:'engineering-quest',patternBridge:{completed:['U11']}})).toBeNull();
    const old=parseSave({game:'logic-quest',stops:{}})!;
    expect(old.patternBridge).toEqual(freshBridge());
  });
});
