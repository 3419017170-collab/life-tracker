import {useEffect,useRef,useState} from 'react';
import Phaser from 'phaser';
import {project,snap,key,depth,type Cell,type Furniture} from './iso';
import {Actor,type Destination} from './actor';
import {initialLayout,roomGrid,spawn,blockedCells,place,store,type Layout} from './layout';
import {loadLayout,saveLayout} from './layoutStore';
type Editor={editing:boolean;selected:string;rotation:Furniture['rotation']};
class BootScene extends Phaser.Scene {
 private actor!:Actor;private marker!:Phaser.GameObjects.Arc;private status!:Phaser.GameObjects.Text;private graphics!:Phaser.GameObjects.Graphics;
 private projection={origin:{x:320,y:45},tileWidth:64,tileHeight:32};
 private destinations:Destination[]=[{cell:{x:2,y:2},activity:'resting'},{cell:{x:4,y:1},activity:'computer'},{cell:{x:1,y:5},activity:'reading'},{cell:{x:5,y:5},activity:'guitar'}];
 constructor(private layout:Layout,private editor:()=>Editor,private change:(l:Layout)=>void,private notify:(s:string)=>void){super('boot')}
 create(){this.cameras.main.setBackgroundColor('#101d30');this.actor=new Actor(spawn,roomGrid,blockedCells(this.layout));this.graphics=this.add.graphics();this.draw();this.marker=this.add.circle(0,0,8,0x70d7b1).setStrokeStyle(2,0xffffff);this.status=this.add.text(12,12,'DEV / ROOM SIMULATION',{fontSize:'13px',color:'#d4e3f5'}).setDepth(100);
 this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const cell=snap({x:pointer.worldX,y:pointer.worldY},this.projection);const e=this.editor();if(e.editing){if(this.actor.moving){this.notify('等待人物停稳');return}const next=place(this.layout,e.selected,cell,e.rotation,roomGrid,this.actor.position,{x:7,y:7});if(next)this.change(next);else this.notify('此处不可摆放');return}const target=this.destinations.find(d=>key(d.cell)===key(cell))??{cell,activity:'idle' as const};this.actor.moveTo(target)});
 }
 private draw(){const blocked=blockedCells(this.layout);this.graphics.clear();for(let x=0;x<roomGrid.width;x++)for(let y=0;y<roomGrid.height;y++){const p=project({x,y},this.projection);this.graphics.fillStyle(blocked.has(key({x,y}))?0x8a6748:0x263c50);this.graphics.lineStyle(1,0x7894ad,.7);this.graphics.beginPath();this.graphics.moveTo(p.x,p.y-16);this.graphics.lineTo(p.x+32,p.y);this.graphics.lineTo(p.x,p.y+16);this.graphics.lineTo(p.x-32,p.y);this.graphics.closePath();this.graphics.fillPath();this.graphics.strokePath()}}
 update(_time:number,delta:number){if(!this.actor)return;this.actor.update(Math.min(delta,100)/1000);if(!this.editor().editing)this.actor.autonomous(this.destinations);const p=project(this.actor.visualPosition,this.projection);this.marker.setPosition(p.x,p.y-8).setDepth(depth(this.actor.visualPosition)+1);this.status.setText('DEV / GK: '+this.actor.activity)}
}
export function GameHost(){const host=useRef<HTMLDivElement>(null);const [layout,setLayout]=useState<Layout|null>(null);const [message,setMessage]=useState('读取布局…');const [editing,setEditing]=useState(false);const [selected,setSelected]=useState('bed');const [rotation,setRotation]=useState<Furniture['rotation']>(0);const editor=useRef<Editor>({editing,selected,rotation});editor.current={editing,selected,rotation};
 useEffect(()=>{let live=true;loadLayout().then(l=>{if(live){setLayout(l);setMessage('布局已读取')}}).catch(()=>{if(live)setMessage('读取失败，请重新打开页面')});return()=>{live=false}},[]);
 const saving=useRef(false);const [busy,setBusy]=useState(false);
 async function change(l:Layout){if(saving.current)return; // validate against spawn too, since scene resets on edit
 const {validLayout}=await import('./layout');if(!validLayout(l,roomGrid,spawn,{x:7,y:7})){setMessage('请保留出生点及出口');return}
 if(saving.current)return;saving.current=true;setBusy(true);try{await saveLayout(l);setLayout(l);setMessage('布局已保存')}catch{setMessage('保存失败，原布局保留')}finally{saving.current=false;setBusy(false)}}
 const changeRef=useRef(change);changeRef.current=change;
 useEffect(()=>{if(!host.current||!layout)return;const scene=new BootScene(layout,()=>editor.current,l=>{void changeRef.current(l)},setMessage);const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:640,height:360,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene});return()=>{game.destroy(true)}},[layout]);
 return <><div ref={host} className="game-host" aria-label="小屋机制测试区"/><button onClick={()=>setEditing(!editing)} disabled={!layout||busy}>{editing?'结束编辑':'编辑家具'}</button>{editing&&layout&&<div><select value={selected} onChange={e=>setSelected(e.target.value)}>{[...layout.placed,...layout.stored].map(f=><option key={f.id} value={f.id}>{f.id}{layout.stored.some(s=>s.id===f.id)?'（收纳）':''}</option>)}</select><button onClick={()=>setRotation(((rotation+1)%4) as Furniture['rotation'])}>旋转 {rotation*90}°</button><button disabled={busy} onClick={()=>void change(store(layout,selected))}>收纳</button><p>选择家具后点击网格摆放（测试版）</p></div>}<p role="status">{message}</p></>}
