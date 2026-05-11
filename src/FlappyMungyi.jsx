import React, { useEffect, useRef, useState, useCallback } from 'react';
import { saveLeaderboardScore } from './utils/saveScore';

/* ── 상수 ─────────────────────────────────────────── */
const VW=360, VH=640, NEON='#39FF14';
const BIRD_X=80, BIRD_W=28, BIRD_H=22;
const GRAVITY=0.38, JUMP=-8;
const PIPE_W=54, PIPE_GAP=170, PIPE_SPEED=2.6;
const PIPE_SPAWN_INTERVAL=1700; // ms
const GAMEOVER_DELAY=1800;

/* ── 드로잉 ───────────────────────────────────────── */
function drawBg(ctx) {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,VW,VH);
  // Stars
  ctx.fillStyle='rgba(57,255,20,0.15)';
  for (let i=0;i<60;i++) {
    const sx=(i*137.5)%VW, sy=(i*93.7)%VH;
    ctx.fillRect(sx|0,sy|0,1,1);
  }
  // Ground line
  ctx.fillStyle=NEON; ctx.fillRect(0,VH-30,VW,2);
  ctx.fillStyle='rgba(57,255,20,0.15)'; ctx.fillRect(0,VH-28,VW,28);
}

function drawMungyi(ctx, x, y, vy) {
  const tilt = Math.max(-0.5, Math.min(0.5, vy * 0.04));
  ctx.save();
  ctx.translate(x + BIRD_W/2, y + BIRD_H/2);
  ctx.rotate(tilt);
  // Body - golden dog
  ctx.fillStyle='#FFD700';
  ctx.fillRect(-BIRD_W/2, -BIRD_H/2, BIRD_W, BIRD_H);
  // Ears
  ctx.fillStyle='#C8A000';
  ctx.fillRect(-BIRD_W/2-2, -BIRD_H/2-5, 8, 8);
  ctx.fillRect(BIRD_W/2-6, -BIRD_H/2-5, 8, 8);
  // Eyes
  ctx.fillStyle='#111';
  ctx.fillRect(-6, -4, 4, 4);
  ctx.fillRect(3, -4, 4, 4);
  ctx.fillStyle='#fff';
  ctx.fillRect(-5, -5, 2, 2);
  ctx.fillRect(4, -5, 2, 2);
  // Nose
  ctx.fillStyle='#FF6B6B';
  ctx.fillRect(-3, 3, 6, 4);
  ctx.fillStyle='#000';
  ctx.fillRect(-2, 4, 2, 2); ctx.fillRect(2, 4, 2, 2);
  // Neon outline glow
  ctx.globalAlpha=0.5;
  ctx.strokeStyle=NEON; ctx.lineWidth=1;
  ctx.strokeRect(-BIRD_W/2-1, -BIRD_H/2-1, BIRD_W+2, BIRD_H+2);
  ctx.globalAlpha=1;
  ctx.restore();
}

function drawPipes(ctx, pipes, tick) {
  for (const p of pipes) {
    const topH = p.gapY - PIPE_GAP/2;
    const botY = p.gapY + PIPE_GAP/2;
    const botH = VH - 30 - botY;

    // Top pipe
    ctx.fillStyle='#1a1a1a';
    ctx.fillRect(p.x, 0, PIPE_W, topH);
    ctx.fillStyle=NEON;
    ctx.fillRect(p.x-3, topH-14, PIPE_W+6, 14);
    ctx.globalAlpha=0.25;
    ctx.fillStyle=NEON; ctx.fillRect(p.x+4, 0, 6, topH);
    ctx.globalAlpha=1;
    ctx.strokeStyle=NEON; ctx.lineWidth=1;
    ctx.strokeRect(p.x, 0, PIPE_W, topH);

    // Bottom pipe
    ctx.fillStyle='#1a1a1a';
    ctx.fillRect(p.x, botY, PIPE_W, botH);
    ctx.fillStyle=NEON;
    ctx.fillRect(p.x-3, botY, PIPE_W+6, 14);
    ctx.globalAlpha=0.25;
    ctx.fillStyle=NEON; ctx.fillRect(p.x+4, botY+14, 6, botH-14);
    ctx.globalAlpha=1;
    ctx.strokeStyle=NEON; ctx.lineWidth=1;
    ctx.strokeRect(p.x, botY, PIPE_W, botH);
  }
}

function drawHUD(ctx, score) {
  ctx.textAlign='center';
  ctx.font='20px "Press Start 2P",monospace';
  ctx.fillStyle='rgba(57,255,20,0.15)';
  ctx.fillText(score, VW/2+2, 70+2);
  ctx.fillStyle=NEON;
  ctx.fillText(score, VW/2, 70);
}

function drawBanner(ctx, t1, t2) {
  ctx.fillStyle='#000'; ctx.fillRect(0,VH/2-50,VW,100);
  ctx.strokeStyle=NEON; ctx.lineWidth=2; ctx.strokeRect(1,VH/2-49,VW-2,98);
  ctx.fillStyle=NEON; ctx.textAlign='center';
  ctx.font='14px "Press Start 2P",monospace'; ctx.fillText(t1,VW/2,VH/2-5);
  ctx.font='9px "Press Start 2P",monospace'; ctx.fillText(t2,VW/2,VH/2+22);
}

/* ── 충돌 ─────────────────────────────────────────── */
function hitsPipe(birdX, birdY, pipe) {
  const bx1=birdX+3, bx2=birdX+BIRD_W-3;
  const by1=birdY+3, by2=birdY+BIRD_H-3;
  const px1=pipe.x, px2=pipe.x+PIPE_W;
  if (bx2<px1||bx1>px2) return false;
  const topH=pipe.gapY-PIPE_GAP/2, botY=pipe.gapY+PIPE_GAP/2;
  return by1<topH||by2>botY;
}

/* ── 훅 ───────────────────────────────────────────── */
export function useFlappyMungyi({ canvasRef, onExit }) {
  const [score, setScore]     = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [status, setStatus]   = useState('idle');
  const [isNewHi, setIsNewHi] = useState(false);

  const gRef = useRef(null), scoreRef=useRef(0), hiRef=useRef(0), statusRef=useRef('idle');

  useEffect(()=>{ scoreRef.current=score; },[score]);
  useEffect(()=>{ hiRef.current=hiScore; },[hiScore]);
  useEffect(()=>{ statusRef.current=status; },[status]);

  useEffect(()=>{
    const v=parseInt(localStorage.getItem('flappy_hi')||'0',10);
    setHiScore(v); hiRef.current=v;
  },[]);

  const doJump = useCallback(()=>{
    const g=gRef.current; if(!g) return;
    if(statusRef.current==='idle') return;
    g.vy=JUMP;
  },[]);

  const start = useCallback(()=>{
    gRef.current={
      birdY: VH/2-50, vy:0,
      pipes:[], pipeTimer:0,
      tick:0, scored:new Set(),
    };
    setScore(0); setIsNewHi(false);
    setStatus('playing');
  },[]);

  const triggerGameOver = useCallback(async()=>{
    const final=scoreRef.current;
    setStatus('gameover');
    const isNew=await saveLeaderboardScore('flappy',final);
    if(isNew||final>hiRef.current){
      const best=Math.max(final,hiRef.current);
      setHiScore(best); setIsNewHi(true);
      localStorage.setItem('flappy_hi',String(best));
    }
    setTimeout(()=>{ setStatus('idle'); onExit?.(final); },GAMEOVER_DELAY);
  },[onExit]);

  // Input
  useEffect(()=>{
    const kd=(e)=>{ if(e.key===' '||e.key==='ArrowUp'){ e.preventDefault(); doJump(); } };
    window.addEventListener('keydown',kd);
    return ()=>window.removeEventListener('keydown',kd);
  },[doJump]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const click=()=>doJump();
    const touch=(e)=>{ e.preventDefault(); doJump(); };
    canvas.addEventListener('click',click);
    canvas.addEventListener('touchstart',touch,{passive:false});
    return ()=>{ canvas.removeEventListener('click',click); canvas.removeEventListener('touchstart',touch); };
  },[canvasRef,doJump]);

  // DPR
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const resize=()=>{
      const dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=VW*dpr; canvas.height=VH*dpr;
      const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false;
    };
    resize(); window.addEventListener('resize',resize);
    return ()=>window.removeEventListener('resize',resize);
  },[canvasRef]);

  // Loop
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    let cancelled=false, last=performance.now(), raf=0;

    const loop=(now)=>{
      if(cancelled) return;
      const dt=Math.min(50,now-last); last=now;
      const st=statusRef.current, g=gRef.current;

      if(st==='playing'&&g){
        g.tick+=dt;
        // Physics
        g.vy+=GRAVITY*(dt/16);
        g.birdY+=g.vy*(dt/16);
        // Ground/ceiling
        if(g.birdY<0){ g.birdY=0; g.vy=0; }
        if(g.birdY+BIRD_H>VH-30){ triggerGameOver(); }
        // Pipes
        g.pipeTimer+=dt;
        if(g.pipeTimer>=PIPE_SPAWN_INTERVAL){
          g.pipeTimer=0;
          const minGapY=PIPE_GAP/2+60, maxGapY=VH-30-PIPE_GAP/2-60;
          g.pipes.push({ x:VW, gapY:minGapY+Math.random()*(maxGapY-minGapY), id:g.tick });
        }
        for(const p of g.pipes){ p.x-=PIPE_SPEED*(dt/16); }
        g.pipes=g.pipes.filter(p=>p.x+PIPE_W>-10);
        // Score
        for(const p of g.pipes){
          if(!g.scored.has(p.id)&&p.x+PIPE_W<BIRD_X){
            g.scored.add(p.id); setScore(s=>s+1);
          }
        }
        // Collision
        for(const p of g.pipes) if(hitsPipe(BIRD_X,g.birdY,p)){ triggerGameOver(); break; }
      }

      drawBg(ctx);
      if(g){ drawPipes(ctx,g.pipes,g.tick); drawMungyi(ctx,BIRD_X,g.birdY,g.vy); drawHUD(ctx,scoreRef.current); }
      if(st==='gameover') drawBanner(ctx,'GAME OVER','SCORE '+scoreRef.current);

      raf=requestAnimationFrame(loop);
    };

    raf=requestAnimationFrame(loop);
    return ()=>{ cancelled=true; if(raf) cancelAnimationFrame(raf); };
  },[canvasRef,triggerGameOver]);

  return { start, doJump, status, score, hiScore, isNewHi };
}

/* ── 컴포넌트 ─────────────────────────────────────── */
export default function FlappyMungyi({ onExit }) {
  const canvasRef = useRef(null);
  const { start, doJump, status, hiScore, isNewHi } = useFlappyMungyi({ canvasRef, onExit });

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full select-none"
        style={{imageRendering:'pixelated',touchAction:'none',cursor:'pointer'}} />
      {status==='idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80">
          <div className="text-neon text-glow text-lg tracking-widest" style={{fontFamily:'"Press Start 2P",monospace'}}>FLAPPY<br/><span className="text-[#FFD700]">무명이</span></div>
          <div className="text-neon/70 text-[10px] tracking-wider text-center px-6 leading-loose">
            SPACE / 클릭 / 탭: 점프<br/>파이프 사이를 통과하세요!
          </div>
          <button onClick={start}
            className="border-2 border-neon px-6 py-3 text-neon hover:bg-neon hover:text-black transition-colors tracking-widest text-[12px]"
            style={{fontFamily:'"Press Start 2P",monospace',boxShadow:'0 0 12px rgba(57,255,20,0.5)'}}>
            ▶ START
          </button>
          <div className="text-neon/60 text-[9px]" style={{fontFamily:'"Press Start 2P",monospace'}}>
            BEST {String(hiScore).padStart(3,'0')}
          </div>
        </div>
      )}
      {status==='gameover' && isNewHi && (
        <div className="absolute top-1/2 left-0 right-0 mt-16 flex justify-center pointer-events-none">
          <div className="text-neon text-glow text-[10px] tracking-widest blink" style={{fontFamily:'"Press Start 2P",monospace'}}>★ NEW RECORD ★</div>
        </div>
      )}
    </div>
  );
}
