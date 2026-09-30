import { describe, expect, it } from 'vitest';
import { EVENT_IDS, ROUTINE, makeRound, completeBridge, freshBridge, parseBridge } from './bridges';
import { newSave, parseSave, exportSave, importSave } from '../../engine/save/save';

describe('Pattern bridges and independent mastery', () => {
  it('preserves the six shared words in their required order', () => {
    expect(ROUTINE).toEqual(['Notice','Compare','Describe','Predict','Test','Revise']);
  });
  it('gives separating machine tests for both hidden rules across seeds', () => {
    const survivors = new Set<string>();
    for(let seed=0;seed<100;seed++) {
      for(const id of [...EVENT_IDS,'workshop-notice','workshop-sort','workshop-repeat','workshop-uncertain']) {
        const r=makeRound(id,seed);
        for(const q of [r.describe,r.predict,r.test,r.revise]) {
          expect(q.options.filter(o=>o===q.answer)).toHaveLength(1);
          expect(new Set(q.options).size).toBe(q.options.length);
        }
        if(id==='FM-02') {
          expect(r.test.answer).not.toBe('2 (input pieces)');
          const values=r.predict.answer.match(/\d+/g)!.map(Number);
          expect(values[0]).not.toBe(values[1]);
          survivors.add(r.revise.answer);
        }
      }
    }
    expect(survivors.size).toBe(2);
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
