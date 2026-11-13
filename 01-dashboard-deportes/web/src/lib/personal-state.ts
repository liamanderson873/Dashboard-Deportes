export const PERSONAL_KEY='marcador.personal.v1';
export const SLOTS=['G','D','D','D','D','M','M','M','F','F','F'] as const;
export type PersonalState={version:1;players:number[];teams:number[];eleven:(number|null)[]};
export const EMPTY_PERSONAL:PersonalState={version:1,players:[],teams:[],eleven:Array(11).fill(null)};
const validId=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function parsePersonal(raw:string|null):PersonalState{
 try{const v=JSON.parse(raw??'null');if(!v||v.version!==1)return EMPTY_PERSONAL;
 const ids=(a:unknown)=>Array.isArray(a)?[...new Set(a.filter(validId))].slice(0,1000):[];
 const seen=new Set<number>();const eleven=SLOTS.map((_,i)=>{const id=v.eleven?.[i];if(!validId(id)||seen.has(id))return null;seen.add(id);return id;});
 return {version:1,players:ids(v.players),teams:ids(v.teams),eleven};
 }catch{return EMPTY_PERSONAL;}
}
export function assignSlot(state:PersonalState,index:number,id:number|null,position:string|null):PersonalState{
 if(index<0||index>=SLOTS.length||!Number.isInteger(index))return state;
 if(id!==null&&(!validId(id)||position!==SLOTS[index]||state.eleven.some((v,i)=>v===id&&i!==index)))return state;
 return {...state,eleven:state.eleven.map((v,i)=>i===index?id:v)};
}
export function togglePersonal(state:PersonalState,kind:'players'|'teams',id:number):PersonalState{
 if(!validId(id))return state;return {...state,[kind]:state[kind].includes(id)?state[kind].filter(v=>v!==id):[...state[kind],id]};
}
