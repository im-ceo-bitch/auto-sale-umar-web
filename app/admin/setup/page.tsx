"use client";
import { useState, type FormEvent } from "react";
export default function AdminSetupPage() {
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage("");const f=new FormData(e.currentTarget);try{
  const res=await fetch("/api/setup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fullName:f.get("name"),email:f.get("email"),password:f.get("password"),setupKey:f.get("key")})});
  const data=await res.json();setMessage(data.message||data.error||"Ошибка");if(res.ok)window.location.assign("/admin/login/");
 }catch{setMessage("Сервер недоступен.");}finally{setBusy(false);}}
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f7f7f7",color:"#111"}}><form onSubmit={submit} style={{width:"100%",maxWidth:420,background:"white",padding:32,borderRadius:24,display:"grid",gap:16}}>
 <img src="/brand/asu-wordmark-black.png" alt="Auto Sale Umar" style={{width:180,height:"auto"}}/><h1>Первичная настройка</h1><p>Создание первого супер-администратора. После создания аккаунта регистрация закрывается.</p>
 {[["name","Имя","text"],["email","Email","email"],["password","Новый пароль","password"],["key","SETUP_KEY","password"]].map(([name,label,type])=><label key={name} style={{display:"grid",gap:6}}>{label}<input name={name} type={type} required autoComplete={name==="password"?"new-password":"off"} style={{padding:12,border:"1px solid #ccc",borderRadius:12}}/></label>)}
 <button disabled={busy} style={{background:"#111",color:"white",padding:14,borderRadius:24,border:0}}>{busy?"Создание…":"Создать администратора"}</button><p role="status">{message}</p><a href="/admin/login/">Вход в систему</a></form></main>;
}
