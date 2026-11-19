'use client';
import {useEffect,useState} from 'react';
import styles from './display.module.css';
type Props={kind:'car'|'interior'|'arrival'|'pending'|'detail';image:string;cover?:string;name:string;price:string;specs:string;theme:'light'|'dark';status:string};
export default function ShowroomScene({kind,image,cover,name,price,specs,theme,status}:Props){
 const [ready,setReady]=useState(false);const [revealed,setRevealed]=useState(false);
 useEffect(()=>{setReady(false);setRevealed(false);const img=new Image();let active=true;let timer:number|undefined;img.onload=()=>{if(!active)return;setReady(true);timer=window.setTimeout(()=>setRevealed(true),1600);};img.onerror=()=>{if(active){setReady(true);setRevealed(true);}};img.src=image;return()=>{active=false;window.clearTimeout(timer);};},[image,cover,kind]);
 const full=kind==='interior'||kind==='detail';const pending=kind==='pending';const arrival=kind==='arrival';
 return <section className={styles.editorialScene} data-theme={theme} data-kind={kind}>
  <img className={styles.editorialLogo} src={(theme==='light'||pending)&&!full?'/brand/asu-wordmark-black.png':'/brand/asu-wordmark-white.png'} alt="Auto Sale Umar"/>
  <div className={styles.editorialImageStage}>
   <img className={styles.editorialCar} src={image} alt={name} onError={e=>{if(!e.currentTarget.src.endsWith('/intro-poster.jpg'))e.currentTarget.src='/intro-poster.jpg';}} />
   {arrival&&cover&&<img className={styles.revealCover} data-revealed={ready&&revealed} src={cover} alt="Автомобиль под тканью" onError={e=>{e.currentTarget.style.display='none';}}/>}
  </div>
  <div className={styles.editorialShade}/>
  {pending?<div className={styles.pendingTitle}><span>{name}</span><strong>SALE PENDING</strong><small>АВТОМОБИЛЬ ЗАРЕЗЕРВИРОВАН</small></div>:<div className={styles.editorialCopy}>
    <span>{arrival?'NEW ARRIVAL':full?(kind==='interior'?'INTERIOR':'DETAILS'):'AUTO SALE UMAR / COLLECTION'}</span>
    <h1>{name}</h1>{arrival&&<h2>HAS ARRIVED</h2>}<p>{specs}</p><strong>{price}</strong><small>{status}</small>
  </div>}
 </section>;
}
