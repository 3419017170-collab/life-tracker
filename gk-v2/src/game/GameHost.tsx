import {useEffect,useRef} from 'react';
import Phaser from 'phaser';
class BootScene extends Phaser.Scene {
 constructor(){super('boot')}
 create(){this.cameras.main.setBackgroundColor('#101d30');this.add.text(20,20,'GK ENGINE / DEV',{fontSize:'18px',color:'#d4e3f5'});}
}
export function GameHost(){const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!host.current)return;const game=new Phaser.Game({type:Phaser.AUTO,parent:host.current,width:640,height:360,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:BootScene});return()=>game.destroy(true)},[]);
 return <div ref={host} className="game-host" aria-label="开发引擎测试区"/>;}
