import {type Cell,type Grid,pathfind,key} from './iso';
export type Activity='idle'|'walking'|'reading'|'resting'|'computer'|'guitar';
export type Destination={cell:Cell;activity:Exclude<Activity,'walking'>};
export class Actor {
 position:Cell; activity:Activity='idle'; private route:Cell[]=[];private next:Destination|null=null;private elapsed=0;private wait=0;
 constructor(start:Cell,private grid:Grid,private blocked:Set<string>,private speed=2){this.position={...start};}
 get moving(){return this.route.length>0}
 moveTo(target:Destination):boolean{
 if(this.moving)return false;
 const route=pathfind(this.position,target.cell,this.grid,this.blocked);
 if(!route)return false;
 this.route=route.slice(1);this.next=target;this.elapsed=0;this.wait=0;
 if(this.route.length)this.activity='walking';else this.arrive();return true;
 }
 private arrive(){this.activity=this.next?.activity??'idle';this.next=null;this.wait=0;}
 update(seconds:number){if(!Number.isFinite(seconds)||seconds<=0)return;
 if(!this.moving){this.wait+=seconds;return}
 this.elapsed+=seconds*this.speed;
 while(this.elapsed>=1&&this.route.length){this.position=this.route.shift()!;this.elapsed-=1;}
 if(!this.route.length){this.elapsed=0;this.arrive();}
 }
 get visualPosition():Cell{const n=this.route[0];return n?{x:this.position.x+(n.x-this.position.x)*this.elapsed,y:this.position.y+(n.y-this.position.y)*this.elapsed}:{...this.position}}
 autonomous(options:Destination[],random:()=>number=Math.random){if(this.moving||this.wait<8)return false;
 const valid=options.filter(o=>key(o.cell)!==key(this.position)&&pathfind(this.position,o.cell,this.grid,this.blocked));
 if(!valid.length){this.wait=0;return false}return this.moveTo(valid[Math.min(valid.length-1,Math.max(0,Math.floor(random()*valid.length)))]);
 }
}
