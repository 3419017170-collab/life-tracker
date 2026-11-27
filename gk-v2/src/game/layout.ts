import {canPlace,footprint,key,pathfind,inside,type Cell,type Grid,type Furniture} from './iso';
export type Layout={placed:Furniture[];stored:Furniture[]};
export const roomGrid={width:8,height:8};
export const spawn={x:3,y:3};
export const initialLayout:Layout={placed:[{id:'bed',anchor:{x:0,y:1},width:2,height:3,rotation:0},{id:'desk',anchor:{x:4,y:0},width:2,height:1,rotation:0},{id:'shelf',anchor:{x:0,y:5},width:1,height:2,rotation:0}],stored:[]};
export function blockedCells(layout:Layout){return new Set(layout.placed.flatMap(footprint).map(key))}
export function validLayout(layout:Layout,grid:Grid,actor:Cell,exit:Cell):boolean{
 const all=[...layout.placed,...layout.stored];if(new Set(all.map(f=>f.id)).size!==all.length)return false;
 if(!all.every(f=>Number.isInteger(f.width)&&Number.isInteger(f.height)&&f.width>0&&f.height>0&&f.width<=grid.width&&f.height<=grid.height&&[0,1,2,3].includes(f.rotation)))return false;
 if(!inside(actor,grid)||!inside(exit,grid))return false;
 return layout.placed.every(f=>canPlace(f,grid,layout.placed,[actor,exit]))&&pathfind(actor,exit,grid,blockedCells(layout))!==null;
}
export function place(layout:Layout,id:string,anchor:Cell,rotation:Furniture['rotation'],grid:Grid,actor:Cell,exit:Cell):Layout|null{
 const item=[...layout.placed,...layout.stored].find(f=>f.id===id);if(!item)return null;
 const next={placed:[...layout.placed.filter(f=>f.id!==id),{...item,anchor:{...anchor},rotation}],stored:layout.stored.filter(f=>f.id!==id)};
 return validLayout(next,grid,actor,exit)?next:null;
}
export function store(layout:Layout,id:string):Layout{const item=layout.placed.find(f=>f.id===id);return item?{placed:layout.placed.filter(f=>f.id!==id),stored:[...layout.stored,item]}:layout}
export function decodeLayout(value:unknown):Layout|null{try{const l=value as Layout;if(!Array.isArray(l.placed)||!Array.isArray(l.stored))return null;const catalog=new Map(initialLayout.placed.map(f=>[f.id,f]));const all=[...l.placed,...l.stored];if(all.length!==catalog.size||!all.every(f=>{const c=catalog.get(f.id);return c&&c.width===f.width&&c.height===f.height&&Number.isInteger(f.anchor.x)&&Number.isInteger(f.anchor.y)}))return null;return validLayout(l,roomGrid,spawn,{x:7,y:7})?l:null}catch{return null}}
