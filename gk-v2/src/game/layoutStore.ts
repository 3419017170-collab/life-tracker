import {db} from '../data/db';import {decodeLayout,initialLayout,type Layout} from './layout';
const id='room-layout-v1';
export async function loadLayout():Promise<Layout>{const saved=await db.saves.get(id);return decodeLayout(saved?.value)??structuredClone(initialLayout)}
export async function saveLayout(layout:Layout){await db.saves.put({id,value:layout})}
