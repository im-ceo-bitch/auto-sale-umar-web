import { getAuthenticatedUser, json, type Env } from '../_lib/auth';
type Context = {request: Request; env: Env & {MEDIA: any}};
const reply = (data: object, status = 200) => json(data, status, {'cache-control':'no-store'});
const validCode = (s: unknown): s is string => typeof s === 'string' && /^[A-F0-9]{12}$/.test(s);
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
const mediaURL = (key: string) => `/api/showroom?media=${encodeURIComponent(key)}`;
async function assets(env: Context['env']) {
  const [covers, tracks] = await Promise.all([
    (env.DB.prepare(`SELECT r.car_id AS carId,r.object_key AS key FROM showroom_reveals r JOIN cars c ON c.id=r.car_id WHERE c.is_published=1 AND c.status<>'hidden'`) as any).all(),
    (env.DB.prepare('SELECT id,title,object_key AS key FROM showroom_tracks ORDER BY title,id') as any).all()
  ]);
  return {covers: (covers.results || []).map((r:any)=>({carId:r.carId,url:mediaURL(r.key)})), tracks:(tracks.results || []).map((r:any)=>({id:r.id,title:r.title,url:mediaURL(r.key)}))};
}
export async function onRequestGet({request,env}: Context) {
 const u = new URL(request.url); const key=u.searchParams.get('media');
 if(key) {
  if(!/^showroom\/(reveal|audio)\/[a-f0-9-]+\.(png|jpg|webp|mp3|m4a|ogg)$/.test(key)) return new Response(null,{status:404});
  if(key.startsWith('showroom/audio/')) {
   const code=u.searchParams.get('code');
   if(!validCode(code)||!await env.DB.prepare('SELECT code FROM showroom_screens WHERE code=?1').bind(code).first()) return new Response(null,{status:403});
  }
  const range=request.headers.get('range');
  const object=await env.MEDIA.get(key,range?{range:request.headers}:undefined); if(!object) return new Response(null,{status:404});
  const h=new Headers({'cache-control':'public, max-age=86400','x-content-type-options':'nosniff'}); object.writeHttpMetadata(h); h.set('accept-ranges','bytes');if(key.startsWith('showroom/audio/'))h.set('cache-control','private, no-store');if(range&&object.range&&typeof object.range.offset==='number'&&typeof object.range.length==='number'){const {offset,length}=object.range;h.set('content-range',`bytes ${offset}-${offset+length-1}/${object.size}`);h.set('content-length',String(length));return new Response(object.body,{status:206,headers:h});}h.set('content-length',String(object.size));return new Response(object.body,{headers:h});
 }
 if(u.searchParams.has('assets')) return reply({success:true,...await assets(env)});
 const code=u.searchParams.get('code'); if(!validCode(code)) return reply({success:false,error:'Неверный код экрана'},400);
 const row=await env.DB.prepare('SELECT * FROM showroom_screens WHERE code=?1').bind(code).first<any>();
 return reply({success:true,screen:row?{command:JSON.parse(row.command),revision:row.revision,music:JSON.parse(row.music),online:Date.now()-row.seen_at<90000,currentCar:row.current_car,currentPhoto:row.current_photo,currentScene:row.current_scene}:null});
}
export async function onRequestPost({request,env}:Context) {
 const type=request.headers.get('content-type')||'';
 if(type.includes('multipart/form-data')) {
  const user=await getAuthenticatedUser(request,env); if(!user) return reply({success:false,error:'Войдите в систему'},401);
  const f=await request.formData(); const file=f.get('file'); const kind=f.get('kind');
  if(!(file instanceof File)||file.size<1||file.size>20*1024*1024) return reply({success:false,error:'Файл до 20 МБ'},400);
  const types: Record<string,string>=kind==='reveal'?{'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}:kind==='audio'?{'audio/mpeg':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/ogg':'ogg'}:{};
  const ext=types[file.type]; if(!ext) return reply({success:false,error:'Недопустимый формат'},400);
  const id=crypto.randomUUID(); const key=`showroom/${kind}/${id}.${ext}`;
  const carId=Number(f.get('carId')); const title=String(f.get('title')||file.name).trim().slice(0,120);
  if(kind==='reveal'&&(!positive(carId)||!await env.DB.prepare('SELECT id FROM cars WHERE id=?1').bind(carId).first())) return reply({success:false,error:'Автомобиль не найден'},404);
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
  try {
   if(kind==='reveal') {const old=await env.DB.prepare('SELECT object_key FROM showroom_reveals WHERE car_id=?1').bind(carId).first<{object_key:string}>(); await env.DB.prepare('INSERT INTO showroom_reveals(car_id,object_key) VALUES(?1,?2) ON CONFLICT(car_id) DO UPDATE SET object_key=excluded.object_key').bind(carId,key).run(); if(old) await env.MEDIA.delete(old.object_key).catch(()=>{});}
   else await env.DB.prepare('INSERT INTO showroom_tracks(id,title,object_key,mime,bytes) VALUES(?1,?2,?3,?4,?5)').bind(id,title||'Track',key,file.type,file.size).run();
  } catch(e) {await env.MEDIA.delete(key).catch(()=>{});throw e;}
  return reply({success:true,...await assets(env)});
 }
 let b:any;try{b=await request.json();}catch{return reply({success:false,error:'JSON required'},400);}
 if(!b||!validCode(b.code)) return reply({success:false,error:'Введите 12 символов с ТВ'},400);
 if(b.action==='heartbeat') {
  const scene=typeof b.scene==='string'?b.scene.slice(0,30):null;
  await env.DB.prepare('UPDATE showroom_screens SET seen_at=?1,current_car=?2,current_photo=?3,current_scene=?4 WHERE code=?5 AND seen_at<?6').bind(Date.now(),positive(b.carId)?b.carId:null,positive(b.photoId)?b.photoId:null,scene,b.code,Date.now()-10000).run(); return reply({success:true});
 }
 const user=await getAuthenticatedUser(request,env); if(!user) return reply({success:false,error:'Войдите в систему'},401);
 if(b.action==='connect') {await env.DB.prepare('INSERT OR IGNORE INTO showroom_screens(code) VALUES(?1)').bind(b.code).run();return reply({success:true});}
 const row=await env.DB.prepare('SELECT code FROM showroom_screens WHERE code=?1').bind(b.code).first(); if(!row)return reply({success:false,error:'Сначала подключите экран'},404);
 if(b.action==='music') {
  if(typeof b.playing!=='boolean'||typeof b.volume!=='number'||!Number.isFinite(b.volume)||b.volume<0||b.volume>1||!(b.trackId===null||typeof b.trackId==='string'))return reply({success:false,error:'Некорректные настройки музыки'},400);
  if(b.trackId!==null&&!await env.DB.prepare('SELECT id FROM showroom_tracks WHERE id=?1').bind(b.trackId).first())return reply({success:false,error:'Трек не найден'},404);
  await env.DB.prepare('UPDATE showroom_screens SET music=?1 WHERE code=?2').bind(JSON.stringify({playing:b.playing,volume:b.volume,trackId:b.trackId}),b.code).run();return reply({success:true});
 }
 if(!['auto','pause','car','interior','arrival','pending','detail'].includes(b.action)||!['light','dark'].includes(b.theme))return reply({success:false,error:'Неизвестная команда'},400);
 if(!['auto','pause'].includes(b.action)){
  if(!positive(b.carId)||!await env.DB.prepare("SELECT id FROM cars WHERE id=?1 AND is_published=1 AND status<>'hidden' AND status<>'sold'").bind(b.carId).first())return reply({success:false,error:'Автомобиль недоступен'},404);
  if(b.action==='arrival'&&!await env.DB.prepare("SELECT id FROM cars WHERE id=?1 AND status IN ('in_stock','in_showroom')").bind(b.carId).first())return reply({success:false,error:'Автомобиль ещё не поступил'},400);
  if(b.action==='pending'&&!await env.DB.prepare("SELECT id FROM cars WHERE id=?1 AND status='reserved'").bind(b.carId).first())return reply({success:false,error:'Автомобиль не в резерве'},400);
  if(b.photoId!=null&&(!positive(b.photoId)||!await env.DB.prepare('SELECT id FROM car_variant_media WHERE id=?1 AND car_id=?2').bind(b.photoId,b.carId).first()))return reply({success:false,error:'Фотография недоступна'},404);
 }
 const command={action:b.action,theme:b.theme,carId:positive(b.carId)?b.carId:null,photoId:positive(b.photoId)?b.photoId:null};
 await env.DB.prepare('UPDATE showroom_screens SET command=?1,revision=?2 WHERE code=?3').bind(JSON.stringify(command),crypto.randomUUID(),b.code).run();return reply({success:true});
}
export async function onRequestDelete({request,env}:Context){
 const user=await getAuthenticatedUser(request,env);if(!user)return reply({success:false,error:'Войдите в систему'},401);
 const u=new URL(request.url),id=u.searchParams.get('trackId'),carId=Number(u.searchParams.get('carId'));
 if(id){const row=await env.DB.prepare('SELECT object_key FROM showroom_tracks WHERE id=?1').bind(id).first<{object_key:string}>();if(row){await env.DB.prepare('DELETE FROM showroom_tracks WHERE id=?1').bind(id).run();await env.MEDIA.delete(row.object_key);} }
 else if(positive(carId)){const row=await env.DB.prepare('SELECT object_key FROM showroom_reveals WHERE car_id=?1').bind(carId).first<{object_key:string}>();if(row){await env.DB.prepare('DELETE FROM showroom_reveals WHERE car_id=?1').bind(carId).run();await env.MEDIA.delete(row.object_key);}}
 else return reply({success:false},400);return reply({success:true,...await assets(env)});
}
