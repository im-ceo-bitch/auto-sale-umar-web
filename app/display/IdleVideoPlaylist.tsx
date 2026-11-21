"use client";

import {AnimatePresence, motion} from "framer-motion";
import {useCallback, useEffect, useRef, useState} from "react";
import type {IdleVideo} from "./showroom";
import styles from "./idle-video.module.css";

/** A silent-autoplay TV playlist; sound and fullscreen require a real user gesture. */
export default function IdleVideoPlaylist({
  videos,
  paused,
  isFullscreen,
  onToggleFullscreen,
}:{
  videos: IdleVideo[];
  paused: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
}) {
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
      {current && !unplayable && (
        <div className={styles.videoControls} aria-label="Управление видеопоказом">
          <button
            className={styles.control}
            type="button"
            onClick={()=>{
              const next = !muted;
              setMuted(next);
              const video = player.current;
              if (video) { video.muted = next; void video.play().catch(()=>{}); }
            }}
            aria-label={muted ? "Включить звук видео" : "Выключить звук видео"}
            aria-pressed={!muted}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H3v6h3l5 4V5Z" />
              {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15 9a5 5 0 0 1 0 6" /><path d="M18 6a9 9 0 0 1 0 12" /></>}
            </svg>
            <span>{muted ? "ЗВУК ВЫКЛ." : "ЗВУК ВКЛ."}</span>
          </button>
          <button
            className={styles.control}
            type="button"
            onClick={()=>void onToggleFullscreen()}
            aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Открыть видео на весь экран"}
            aria-pressed={isFullscreen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {isFullscreen ? (
                <path d="M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5" />
              ) : (
                <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v-5h-5" />
              )}
            </svg>
            <span>{isFullscreen ? "СВЕРНУТЬ" : "ПОЛНЫЙ ЭКРАН"}</span>
          </button>
        </div>
      )}
      {unplayable&&<button type="button" className={styles.retry} onClick={()=>{setFailed([]);setIndex(0);}}>ПОВТОРИТЬ</button>}
    </div>
  );
}
