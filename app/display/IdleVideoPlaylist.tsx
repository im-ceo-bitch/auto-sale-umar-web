"use client";

import {AnimatePresence, motion} from "framer-motion";
import {useCallback, useEffect, useRef, useState} from "react";
import type {IdleVideo} from "./showroom";
import styles from "./idle-video.module.css";

/** A silent-autoplay TV playlist; sound can be enabled by a real user gesture. */
export default function IdleVideoPlaylist({videos,paused}:{videos:IdleVideo[];paused:boolean}) {
  const [index,setIndex] = useState(0);
  const [muted,setMuted] = useState(true);
  const [blocked,setBlocked] = useState(false);
  const [failed,setFailed] = useState<string[]>([]);
  const player = useRef<HTMLVideoElement|null>(null);
  const current = videos.length ? videos[index % videos.length] : undefined;
  const unplayable = videos.length > 0 && failed.length >= videos.length;
  useEffect(()=>{if(!unplayable) return;const timer=window.setTimeout(()=>{setFailed([]);setIndex(0);},45000);return()=>window.clearTimeout(timer);},[unplayable]);
  const signature = videos.map(v=>`${v.id}|${v.url}`).join(';');

  useEffect(()=>{setIndex(0);setFailed([]);setBlocked(false);},[signature]);
  useEffect(()=>{
    const v=player.current;
    if(!v) return;
    setBlocked(false);
    if(paused){v.pause();return;}
    const request=v.play();
    if(request) void request.catch(()=>{
      if(!v.muted){v.muted=true;setMuted(true);void v.play().catch(()=>setBlocked(true));}
      else setBlocked(true);
    });
  },[current?.url,paused]);
  const advance=useCallback(()=>{
    if(videos.length===1&&player.current){player.current.currentTime=0;if(!paused)void player.current.play().catch(()=>{});return;}
    setIndex(v=>(v+1)%Math.max(videos.length,1));
  },[videos.length,paused]);
  const onVideoError=useCallback(()=>{
    if(!current)return;
    setFailed(f=>f.includes(current.id)?f:[...f,current.id]);
    if(failed.length+1 < videos.length) advance();
  },[current,failed.length,videos.length,advance]);
  return (
    <div className={styles.stage} aria-label="Видеопрезентация Auto Sale Umar">
      <div className={styles.brandMark} aria-label="Auto Sale Umar">
        <img src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar" />
      </div>
      {current && !unplayable ? (
        <AnimatePresence mode="sync" initial={false}>
          <motion.video key={current.id} ref={player} className={styles.film}
            src={current.url} autoPlay muted={muted} playsInline preload="auto"
            controls={false} onEnded={advance} onError={onVideoError} onPlaying={()=>setBlocked(false)}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            transition={{duration:.65,ease:"easeInOut"}}/>
        </AnimatePresence>
      ) : (
        <div className={styles.waiting}><img src="/brand/asu-wordmark-white.png" alt="Auto Sale Umar"/><span>СКОРО В НАШЕМ ШОУРУМЕ</span></div>
      )}
      {blocked&&current&&!unplayable&&!paused&&<button className={styles.start} type="button" onClick={()=>{const v=player.current;if(!v)return;v.muted=true;setMuted(true);void v.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));}}>▶ НАЧАТЬ ПОКАЗ</button>}
      {current&&!unplayable&&<button className={styles.sound} type="button" onClick={()=>{const next=!muted;setMuted(next);if(player.current){player.current.muted=next;void player.current.play().catch(()=>{});}}} aria-label={muted?'Включить звук видео':'Выключить звук видео'}>{muted?'ЗВУК ВЫКЛ.':'ЗВУК ВКЛ.'}</button>}
      {unplayable&&<button type="button" className={styles.retry} onClick={()=>{setFailed([]);setIndex(0);}}>ПОВТОРИТЬ</button>}
    </div>
  );
}
