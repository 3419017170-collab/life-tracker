import Dexie,{type Table} from 'dexie';
import {awardId,dailyXP,type Light} from '../domain/light';
export interface Award {id:string;day:string;light:Light;xp:number}
export interface Daily {day:string;notes:Partial<Record<Light,string>>}
export interface Save {id:string;value:unknown}
class GKDatabase extends Dexie {
 awards!:Table<Award,string>; days!:Table<Daily,string>; saves!:Table<Save,string>;
 constructor(){super('gk-light-next');this.version(1).stores({awards:'id,day',days:'day',saves:'id'});}
}
export const db=new GKDatabase();
export async function recordLight(day:string,light:Light,note?:string){
 return db.transaction('rw',db.awards,db.days,async()=>{
 const id=awardId(day,light);const existing=await db.awards.get(id);
 if(!existing)await db.awards.add({id,day,light,xp:dailyXP});
 const record=await db.days.get(day)??{day,notes:{}};
 if(note!==undefined)record.notes[light]=note;
 await db.days.put(record);return !existing;
 });
}
