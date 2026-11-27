export const attributes=['力量','智慧','活力','心灵','善意','探索'] as const;
export const lights=['建设身体','获得新知','有所突破','勇敢行动','传递善意','出去转转','享受兴趣','与人联结','善待自己','发现美好'] as const;
export type Light=typeof lights[number];
export const dailyXP=20; // provisional balance
export function localDay(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
export function awardId(day:string,light:Light){return day+':'+light}
