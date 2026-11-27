import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {project,snap,footprint,key,depth,type Furniture} from './iso';
import {Actor,type Destination} from './actor';
class BootScene extends Phaser.Scene {
 private actor!:Actor;private marker!:Phaser.GameObjects.Arc;private status!:Phaser.GameObjects.Text;
 private projection={origin:{x:320,y:45},tileWidth:64,tileHeight:32};
 private grid={width:8,height:8};
 private furniture:Furniture[]=[{id:'bed',anchor:{x:0,y:1},width:2,height:3,rotation:0},{id:'desk',anchor:{x:4,y:0},width:2,height:1,rotation:0},{id:'shelf',anchor:{x:0,y:5},width:1,height:2,rotation:0}];
 private destinations:Destination[]=[{cell:{x:2,y:2},activity:'resting'},{cell:{x:4,y:1},activity:'computer'},{cell:{x:1,y:5},activity:'reading'},{cell:{x:5,y:5},activity:'guitar'}];
 constructor(){super('boot')}
 create(){
 this.cameras.main.setBackgroundColor('#101d30');
 const blocked=new Set(this.furniture.flatMap(footprint).map(key));
 this.actor=new Actor({x:3,y:3},this.grid,blocked);
 const graphics=this.add.graphics();
 for(let x=0;x<this.grid.width;x++)for(let y=0;y<this.grid.height;y++){const p=project({x,y},this.projection);graphics.fillStyle(blocked.has(key({x,y}))?0x8a6748:0x263c50);graphics.lineStyle(1,0x7894ad,0.7);graphics.beginPath();graphics.moveTo(p.x,p.y-16);graphics.lineTo(p.x+32,p.y);graphics.lineTo(p.x,p.y+16);graphics.lineTo(p.x-32,p.y);graphics.closePath();graphics.fillPath();graphics.strokePath();}
 this.marker=this.add.circle(0,0,8,0x70d7b1).setStrokeStyle(2,0xffffff);
 this.status=this.add.text(12,12,'DEV / ROOM SIMULATION',{fontSize:'13px',color:'#d4e3f5'}).setDepth(100);
 this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const cell=snap({x:pointer.worldX,y:pointer.worldY},this.projection);const destination=this.destinations.find(d=>key(d.cell)===key(cell))??{cell,activity:'idle' as const};this.actor.moveTo(destination)});
 }
 update(_time:number,delta:number){if(!this.actor)return;this.actor.update(Math.min(delta,100)/1000);this.actor.autonomous(this.destinations);const p=project(this.actor.visualPosition,this.projection);this.marker.setPosition(p.x,p.y-8).setDepth(depth(this.actor.visualPosition)+1);this.status.setText('DEV / GK: '+this.actor.activity);}
}
export function GameHost(){const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!host.current)return;const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:640,height:360,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:BootScene});return()=>game.destroy(true)},[]);
 return <div ref={host} className="game-host" aria-label="小屋移动机制测试区"/>;}
