import {describe,it,expect} from 'vitest';
import {parsePersonal,assignSlot,togglePersonal,EMPTY_PERSONAL} from './personal-state';
describe('personal state',()=>{
 it('recovers corrupt and unknown versions',()=>{expect(parsePersonal('{')).toEqual(EMPTY_PERSONAL);expect(parsePersonal('{"version":2}')).toEqual(EMPTY_PERSONAL);});
 it('deduplicates and validates stored IDs',()=>{const s=parsePersonal(JSON.stringify({version:1,players:[1,1,-2,'3'],teams:[2],eleven:[1,1]}));expect(s.players).toEqual([1]);expect(s.eleven.slice(0,2)).toEqual([1,null]);});
 it('validates slot position, rejects duplicates and allows removal',()=>{const s=assignSlot(EMPTY_PERSONAL,0,1,'G');expect(s.eleven[0]).toBe(1);expect(assignSlot(s,1,1,'D')).toBe(s);expect(assignSlot(s,1,2,'F')).toBe(s);expect(assignSlot(s,1,2,'D').eleven[1]).toBe(2);expect(assignSlot(s,0,null,null).eleven[0]).toBeNull();});
 it('toggles favourites independently',()=>{const s=togglePersonal(EMPTY_PERSONAL,'players',1);expect(s.players).toEqual([1]);expect(togglePersonal(s,'players',1).players).toEqual([]);expect(s.teams).toEqual([]);});
});
