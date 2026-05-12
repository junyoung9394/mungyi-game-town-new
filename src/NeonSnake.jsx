import React, { useEffect, useRef, useState, useCallback } from 'react';
import { saveLeaderboardScore } from './utils/saveScore';
import { useAutoSave } from './utils/useAutoSave';

const NEON = '#39FF14';
const VW = 360, VH = 640;
const COLS = 18, ROWS = 28, CELL = 20;
const BX = 0, BY = 44; // 보드 오프셋 (44px HUD)

const TICK_BASE = 150; // ms
const TICK_MIN  = 55;
const SPEED_UP  = 5;   // 먹이 N개마다 5ms 감소

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function spawnFood(snake) {
  let food;
  do { food = { x: rnd(0, COLS-1), y: rnd(0, ROWS-1) }; }
  while (snake.some(s => s.x === food.x && s.y === food.y));
  return food;
}

/* ── 드로잉 ─────────────────────────────────────────── */
function drawBg(ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VW, VH);
  ctx.strokeStyle = 'rgba(57,255,20,0.05)';
  ctx.lineWidth = 0.5;
  for (let c=1;c<COLS;c++){ctx.beginPath();ctx.moveTo(BX+c*CELL,BY);ctx.lineTo(BX+c*CELL,BY+ROWS*CELL);ctx.stroke();}
  for (let r=1;r<ROWS;r++){ctx.beginPath();ctx.moveTo(BX,BY+r*CELL);ctx.lineTo(BX+COLS*CELL,BY+r*CELL);ctx.stroke();}
  ctx.strokeStyle='rgba(57,255,20,0.25)'; ctx.lineWidth=1;
  ctx.strokeRect(BX,BY,COLS*CELL,ROWS*CELL);
}
function drawSnake(ctx, snake) {
  snake.forEach((seg, i) => {
    const x=BX+seg.x*CELL, y=BY+seg.y*CELL;
    const isHead=(i===0);
    ctx.globalAlpha=isHead?1:Math.max(0.4,1-i*0.015);
    ctx.fillStyle=isHead?'#fff':NEON;
    ctx.fillRect(x+1,y+1,CELL-2,CELL-2);
    if(isHead){
      ctx.fillStyle=NEON;
      ctx.fillRect(x+2,y+2,CELL-4,CELL-4);
      // 눈
      ctx.fillStyle='#000';
      ctx.fillRect(x+4,y+4,3,3);
      ctx.fillRect(x+CELL-7,y+4,3,3);
    }
    // 꼬리 글로우
    ctx.globalAlpha=0.15;
    ctx.fillStyle=NEON;
    ctx.fillRect(x,y,CELL,CELL);
    ctx.globalAlpha=1;
  });
}
function drawFood(ctx, food, t) {
  const x=BX+food.x*CELL+CELL/2, y=BY+food.y*CELL+CELL/2;
  const pulse=Math.sin(t*0.006)*2;
  ctx.globalAlpha=0.3;
  ctx.fillStyle='#FF2D55';
  ctx.beginPath();ctx.arc(x,y,CELL/2-1+pulse,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle='#FF6B88';
  ctx.beginPath();ctx.arc(x,y,CELL/2-3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.beginPath();ctx.arc(x-2,y-2,2,0,Math.PI*2);ctx.fill();
}
function drawHUD(ctx, score, hi, length) {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,VW,BY);
  ctx.font='8px "Press Start 2P",monospace'; ctx.fillStyle=NEON;
  ctx.textAlign='left';   ctx.fillText('SCORE',4,13); ctx.fillText(String(score).padStart(6,'0'),4,28);
  ctx.textAlign='center'; ctx.fillText('LEN '+String(length).padStart(3,'0'),VW/2,22);
  ctx.textAlign='right';  ctx.fillText('HI:'+String(hi).padStart(5,'0'),VW-4,22);
}
function drawBanner(ctx, title, sub) {
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,VH/2-50,VW,100);
  ctx.strokeStyle=NEON; ctx.lineWidth=2; ctx.strokeRect(2,VH/2-49,VW-4,98);
  ctx.fillStyle=NEON; ctx.textAlign='center';
  ctx.font='14px "Press Start 2P",monospace'; ctx.fillText(title,VW/2,VH/2-5);
  ctx.font='9px "Press Start 2P",monospace';  ctx.fillText(sub,VW/2,VH/2+22);
}

/* ── 훅 ─────────────────────────────────────────────── */
export function useNeonSnake({ canvasRef, onExit }) {
  const [score,setScore]   = useState(0);
  const [hiScore,setHi]    = useState(0);
  const [status,setStatus] = useState('idle');
  const [isNewHi,setNewHi] = useState(false);

  const gameRef   = useRef(null);
  const scoreRef  = useRef(0); const hiRef  = useRef(0);
  const statusRef = useRef('idle');
  const dirBuf    = useRef(null); // 다음 방향 버퍼

  useEffect(()=>{scoreRef.current=score;},[score]);
  useEffect(()=>{hiRef.current=hiScore;},[hiScore]);
  useEffect(()=>{statusRef.current=status;},[status]);
  useEffect(()=>{const v=parseInt(localStorage.getItem('snake_hi')||'0',10);setHi(v);hiRef.current=v;},[]);

  // 중간 점수 자동 저장 (LOBBY 이탈 / 창 닫기)
  useAutoSave('snake', scoreRef, statusRef);

  const start = useCallback(()=>{
    setNewHi(false); setScore(0); scoreRef.current=0;
    const snake=[{x:9,y:14},{x:8,y:14},{x:7,y:14}];
    gameRef.current={
      snake,
      dir:{dx:1,dy:0},
      food:spawnFood(snake),
      tickAccum:0,
      tickInterval:TICK_BASE,
      eaten:0,
      t:0,
    };
    dirBuf.current=null;
    setStatus('playing');
  },[]);

  /* 키보드 */
  useEffect(()=>{
    const MAP={
      ArrowUp:{dx:0,dy:-1},ArrowDown:{dx:0,dy:1},
      ArrowLeft:{dx:-1,dy:0},ArrowRight:{dx:1,dy:0},
      w:{dx:0,dy:-1},s:{dx:0,dy:1},a:{dx:-1,dy:0},d:{dx:1,dy:0},
      W:{dx:0,dy:-1},S:{dx:0,dy:1},A:{dx:-1,dy:0},D:{dx:1,dy:0},
    };
    const kd=(e)=>{
      if(statusRef.current!=='playing') return;
      const nd=MAP[e.key]; if(!nd) return;
      e.preventDefault();
      const g=gameRef.current; if(!g) return;
      const cur=dirBuf.current||g.dir;
      if(nd.dx!==-cur.dx||nd.dy!==-cur.dy) dirBuf.current=nd;
    };
    window.addEventListener('keydown',kd);
    return ()=>window.removeEventListener('keydown',kd);
  },[]);

  /* 터치 스와이프 */
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    let sx=0,sy=0;
    const ts=(e)=>{e.preventDefault();sx=e.touches[0].clientX;sy=e.touches[0].clientY;};
    const te=(e)=>{
      e.preventDefault();
      if(statusRef.current!=='playing') return;
      const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
      const g=gameRef.current; if(!g) return;
      const cur=dirBuf.current||g.dir;
      let nd=null;
      if(Math.abs(dx)>Math.abs(dy)){
        nd=dx>15?{dx:1,dy:0}:{dx:-1,dy:0};
      } else if(Math.abs(dy)>15){
        nd=dy>0?{dx:0,dy:1}:{dx:0,dy:-1};
      }
      if(nd&&(nd.dx!==-cur.dx||nd.dy!==-cur.dy)) dirBuf.current=nd;
    };
    canvas.addEventListener('touchstart',ts,{passive:false});
    canvas.addEventListener('touchend',te,{passive:false});
    return ()=>{canvas.removeEventListener('touchstart',ts);canvas.removeEventListener('touchend',te);};
  },[canvasRef]);

  /* DPR */
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const r=()=>{
      const d=Math.min(window.devicePixelRatio||1,2);
      canvas.width=VW*d;canvas.height=VH*d;
      const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.imageSmoothingEnabled=false;
    };
    r(); window.addEventListener('resize',r);
    return ()=>window.removeEventListener('resize',r);
  },[canvasRef]);

  /* 게임 루프 */
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext('2d');
    let cancelled=false,last=performance.now(),raf=0;

    const loop=(now)=>{
      if(cancelled) return;
      const dt=Math.min(50,now-last);last=now;
      const st=statusRef.current,g=gameRef.current;

      if(st==='playing'&&g){
        g.t+=dt;
        g.tickAccum+=dt;
        if(g.tickAccum>=g.tickInterval){
          g.tickAccum-=g.tickInterval;
          /* 방향 적용 */
          if(dirBuf.current){g.dir=dirBuf.current;dirBuf.current=null;}
          /* 머리 이동 (벽 통과) */
          const head={
            x:(g.snake[0].x+g.dir.dx+COLS)%COLS,
            y:(g.snake[0].y+g.dir.dy+ROWS)%ROWS,
          };
          /* 자기 충돌 */
          if(g.snake.some(s=>s.x===head.x&&s.y===head.y)){
            const final=scoreRef.current;
            setStatus('gameover');
            saveLeaderboardScore('snake',final).then(ok=>{
              if(ok||final>hiRef.current){
                const best=Math.max(final,hiRef.current);
                setHi(best);hiRef.current=best;setNewHi(true);
                localStorage.setItem('snake_hi',String(best));
              }
            });
            try{window.AndroidInterface?.showInterstitialAd?.();}catch(_){}
            setTimeout(()=>{setStatus('idle');onExit?.(final);},2000);
          } else {
            const ateFood=head.x===g.food.x&&head.y===g.food.y;
            g.snake=[head,...g.snake];
            if(!ateFood) g.snake.pop();
            else {
              g.eaten++;
              const pts=10*(1+Math.floor(g.eaten/5));
              const ns=scoreRef.current+pts;
              scoreRef.current=ns; setScore(ns);
              g.food=spawnFood(g.snake);
              g.tickInterval=Math.max(TICK_MIN,TICK_BASE-g.eaten*SPEED_UP);
            }
          }
        }
        /* 렌더 */
        drawBg(ctx);
        drawHUD(ctx,scoreRef.current,hiRef.current,g.snake.length);
        drawFood(ctx,g.food,g.t);
        drawSnake(ctx,g.snake);
      } else {
        ctx.fillStyle='#000';ctx.fillRect(0,0,VW,VH);
        if(g&&st==='gameover'){
          drawBg(ctx);
          drawHUD(ctx,scoreRef.current,hiRef.current,g.snake.length);
          drawFood(ctx,g.food,g.t||0);
          drawSnake(ctx,g.snake);
          drawBanner(ctx,'GAME OVER','SCORE '+scoreRef.current);
        }
      }

      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return ()=>{cancelled=true;cancelAnimationFrame(raf);};
  },[canvasRef,onExit]);

  return {start,status,score,hiScore,isNewHi};
}

/* ── 컴포넌트 ──────────────────────────────────────── */
export default function NeonSnake({ onExit, autoStart }) {
  const canvasRef=useRef(null);
  const {start,status,hiScore,isNewHi}=useNeonSnake({canvasRef,onExit});
  useEffect(()=>{ if(autoStart) start(); },[]); // eslint-disable-line
  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full select-none"
        style={{imageRendering:'pixelated',touchAction:'none'}}/>
      {status==='idle'&&(
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
          <div className="text-neon text-glow text-xl tracking-widest" style={{fontFamily:'"Press Start 2P",monospace'}}>NEON SNAKE</div>
          <div className="text-neon/70 text-[9px] tracking-wider text-center px-8 leading-loose">
            방향키 / WASD 로 이동<br/>터치: 스와이프로 방향 전환<br/>벽을 통과하지만 자신에 닿으면 게임오버
          </div>
          <button onClick={start} className="border-2 border-neon px-6 py-3 text-neon hover:bg-neon hover:text-black transition-colors text-[12px] tracking-widest"
            style={{fontFamily:'"Press Start 2P",monospace',boxShadow:'0 0 12px rgba(57,255,20,0.5)'}}>▶ START</button>
          <div className="text-neon/60 text-[9px] tracking-widest" style={{fontFamily:'"Press Start 2P",monospace'}}>
            HI  {String(hiScore).padStart(5,'0')}
          </div>
        </div>
      )}
      {status==='gameover'&&isNewHi&&(
        <div className="absolute top-1/2 mt-14 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-neon text-glow text-[10px] tracking-widest blink" style={{fontFamily:'"Press Start 2P",monospace'}}>★ NEW HI-SCORE ★</span>
        </div>
      )}
    </div>
  );
}
