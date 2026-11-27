import {useState} from 'react';import {createRoot} from 'react-dom/client';import {GameHost} from './game/GameHost';import './style.css';
const pages=['小屋','探索','记录','档案','角色'] as const;
function App(){const [page,setPage]=useState<typeof pages[number]>('小屋');return <main><header>GK · 光之力量 <small>工程测试版</small></header><section><h1>{page}</h1>{page==='小屋'?<GameHost/>:<p>模块尚未实现</p>}<p>当前仅验证工程入口，不代表最终美术或功能。</p></section><nav aria-label="主导航">{pages.map(p=><button key={p} aria-current={p===page?'page':undefined} onClick={()=>setPage(p)}>{p}</button>)}</nav></main>}
createRoot(document.getElementById('root')!).render(<App/>);
