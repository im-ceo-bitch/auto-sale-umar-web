export type Scene = 'auto'|'pause'|'car'|'interior'|'arrival'|'pending'|'detail';
export type Command = {action:Scene;theme:'light'|'dark';carId?:number|null;photoId?:number|null};
export type Music = {playing:boolean;volume:number;trackId:string|null};
export type Track = {id:string;title:string;url:string};
export type Assets = {covers:{carId:number;url:string}[];tracks:Track[]};
export type Screen = {command:Partial<Command>;revision:string;music:Music;online:boolean;currentCar:number|null;currentPhoto:number|null;currentScene:string|null};
export const emptyMusic:Music={playing:false,volume:.25,trackId:null};
export const emptyAssets:Assets={covers:[],tracks:[]};
export async function showroomGet<T>(query:string):Promise<T>{const r=await fetch('/api/showroom?'+query,{cache:'no-store'});const b=await r.json();if(!r.ok||!b.success)throw Error(b.error||'Showroom недоступен');return b as T;}
export async function showroomPost(body:object){const r=await fetch('/api/showroom',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const b=await r.json();if(!r.ok||!b.success)throw Error(b.error||'Команда не отправлена');return b;}
export function screenCode(){let code=localStorage.getItem('asu:screen-code-v2');if(!code||!/^[A-F0-9]{12}$/.test(code)){code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();localStorage.setItem('asu:screen-code-v2',code);}return code;}
