export type Cell={x:number;y:number};
export type Grid={width:number;height:number};
export type Projection={origin:Cell;tileWidth:number;tileHeight:number};
export function project(c:Cell,p:Projection):Cell{return {x:p.origin.x+(c.x-c.y)*p.tileWidth/2,y:p.origin.y+(c.x+c.y)*p.tileHeight/2}}
export function unproject(c:Cell,p:Projection):Cell{const a=(c.x-p.origin.x)/(p.tileWidth/2),b=(c.y-p.origin.y)/(p.tileHeight/2);return {x:(a+b)/2,y:(b-a)/2}}
export function snap(c:Cell,p:Projection):Cell{const q=unproject(c,p);return {x:Math.round(q.x),y:Math.round(q.y)}}
export const key=(c:Cell)=>c.x+','+c.y;
export function inside(c:Cell,g:Grid){return Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.y>=0&&c.x<g.width&&c.y<g.height}
export function depth(c:Cell){return c.x+c.y}
export type Furniture={id:string;anchor:Cell;width:number;height:number;rotation:0|1|2|3};
export function footprint(f:Furniture):Cell[]{const w=f.rotation%2?f.height:f.width,h=f.rotation%2?f.width:f.height;return Array.from({length:w*h},(_,i)=>({x:f.anchor.x+i%w,y:f.anchor.y+Math.floor(i/w)}))}
export function canPlace(f:Furniture,g:Grid,others:Furniture[],reserved:Cell[]=[]){if(!Number.isInteger(f.width)||!Number.isInteger(f.height)||f.width<=0||f.height<=0)return false;const blocked=new Set([...others.filter(o=>o.id!==f.id).flatMap(footprint),...reserved].map(key));return footprint(f).every(c=>inside(c,g)&&!blocked.has(key(c)))}
export function pathfind(start:Cell,end:Cell,g:Grid,blocked:Set<string>):Cell[]|null{
 if(!inside(start,g)||!inside(end,g)||blocked.has(key(end))||blocked.has(key(start)))return null;
 const queue=[start],prev=new Map<string,Cell|null>([[key(start),null]]);
 for(let i=0;i<queue.length;i++){const c=queue[i];if(key(c)===key(end)){const path:Cell[]=[];let at:Cell|null=c;while(at){path.push(at);at=prev.get(key(at))??null}return path.reverse()}
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:c.x+dx,y:c.y+dy},k=key(n);if(inside(n,g)&&!blocked.has(k)&&!prev.has(k)){prev.set(k,c);queue.push(n)}}}return null
}
