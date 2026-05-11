import React, { useEffect, useRef, useState, useCallback } from 'react';
import { saveLeaderboardScore } from './utils/saveScore';

const NEON = '#39FF14';
const VW = 360, VH = 640;
const COLS = 10, ROWS = 20, CELL = 28;
const BX = (VW - COLS * CELL) / 2; // 40
const BY = 44;

const COLORS = { I:'#0FF0FC',O:'#FFD60A',T:'#BF5AF2',S:'#34C759',Z:'#FF3B30',J:'#0A84FF',L:'#FF9F0A' };
const SHAPES = {
  I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O:[[1,1],[1,1]],
  T:[[0,1,0],[1,1,1],[0,0,0]],
  S:[[0,1,1],[1,1,0],[0,0,0]],
  Z:[[1,1,0],[0,1,1],[0,0,0]],
  J:[[1,0,0],[1,1,1],[0,0,0]],
  L:[[0,0,1],[1,1,1],[0,0,0]],
};
const SCORE_TABLE = [0,40,100,300,1200];
const TYPES = Object.keys(SHAPES);

const rotateCW = (g) =>
  Array.from({length:g[0].length},(_,c)=>Array.from({length:g.length},(_,r)=>g[g.length-1-r][c]));
const randomType = () => TYPES[Math.floor(Math.random()*TYPES.length)];
const makePiece  = (t) => ({ type:t, grid:SHAPES[t].map(r=>[...r]), color:COLORS[t] });

function isValid(board, grid, px, py) {
  for (let r=0;r<grid.length;r++) for (let c=0;c<grid[r].length;c++) {
    if (!grid[r][c]) continue;
    const nx=px+c, ny=py+r;
    if (nx<0||nx>=COLS||ny>=ROWS) return false;
    if (ny>=0 && board[ny][nx]) return false;
  }
  return true;
}
function placePiece(board, grid, px, py, color) {
  const b=board.map(r=>[...r]);
  for (let r=0;r<grid.length;r++) for (let c=0;c<grid[r].length;c++)
    if (grid[r][c] && py+r>=0) b[py+r][px+c]=color;
  return b;
}
function clearLines(board) {
  const kept=board.filter(row=>row.some(c=>!c));
  const n=ROWS-kept.length;
  return { board:[...Array.from({length:n},()=>Array(COLS).fill(null)),...kept], cleared:n };
}

/* ── 드로잉 ────────────────────────────────────────── */
function drawCell(ctx, x, y, color, s=CELL) {
  ctx.globalAlpha=0.18; ctx.fillStyle=color; ctx.fillRect(x,y,s,s);
  ctx.globalAlpha=1;    ctx.fillStyle=color; ctx.fillRect(x+1,y+1,s-2,s-2);
  ctx.fillStyle='rgba(255,255,255,0.2)';
  ctx.fillRect(x+2,y+2,s-4,3); ctx.fillRect(x+2,y+2,3,s-4);
}
function drawBoard(ctx, board) {
  ctx.strokeStyle=NEON; ctx.lineWidth=2;
  ctx.strokeRect(BX-1,BY-1,COLS*CELL+2,ROWS*CELL+2);
  ctx.strokeStyle='rgba(57,255,20,0.06)'; ctx.lineWidth=0.5;
  for(let c=1;c<COLS;c++){ctx.beginPath();ctx.moveTo(BX+c*CELL,BY);ctx.lineTo(BX+c*CELL,BY+ROWS*CELL);ctx.stroke();}
  for(let r=1;r<ROWS;r++){ctx.beginPath();ctx.moveTo(BX,BY+r*CELL);ctx.lineTo(BX+COLS*CELL,BY+r*CELL);ctx.stroke();}
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(board[r][c]) drawCell(ctx,BX+c*CELL,BY+r*CELL,board[r][c]);
}
function drawPiece(ctx, piece, ox, oy, s=CELL) {
  piece.grid.forEach((row,r)=>row.forEach((v,c)=>{ if(v) drawCell(ctx,ox+c*s,oy+r*s,piece.color,s); }));
}
function drawGhost(ctx, board, p) {
  let gy=p.y; while(isValid(board,p.grid,p.x,gy+1)) gy++;
  if(gy===p.y) return;
  ctx.globalAlpha=0.15; drawPiece(ctx,p,BX+p.x*CELL,BY+gy*CELL); ctx.globalAlpha=1;
}
function drawHUD(ctx, score, level, lines, next, hi) {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,VW,BY);
  ctx.font='8px "Press Start 2P",monospace'; ctx.fillStyle=NEON;
  ctx.textAlign='left';   ctx.fillText('SCORE',4,13); ctx.fillText(String(score).padStart(7,'0'),4,28);
  ctx.textAlign='center'; ctx.fillText('LV'+level,VW/2,13); ctx.fillText('L:'+String(lines).padStart(3,'0'),VW/2,28);
  ctx.textAlign='right';  ctx.fillText('HI:'+String(hi).padStart(5,'0'),VW-4,13); ctx.fillText('NEXT',VW-4,28);
  if(next) drawPiece(ctx,next,VW-4-4*9,30,9);
}
function drawBanner(ctx, title, sub) {
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,VH/2-50,VW,100);
  ctx.strokeStyle=NEON; ctx.lineWidth=2; ctx.strokeRect(2,VH/2-49,VW-4,98);
  ctx.fillStyle=NEON; ctx.textAlign='center';
  ctx.font='14px "Press Start 2P",monospace'; ctx.fillText(title,VW/2,VH/2-5);
  ctx.font='9px "Press Start 2P",monospace';  ctx.fillText(sub,VW/2,VH/2+22);
}

/* ── 훅 ────────────────────────────────────────────── */
export function useClassicTetris({ canvasRef, onExit }) {
  const [score,setScore]   = useState(0);
  const [level,setLevel]   = useState(1);
  const [lines,setLines]   = useState(0);
  const [hiScore,setHi]    = useState(0);
  const [status,setStatus] = useState('idle');
  const [isNewHi,setNewHi] = useState(false);

  const gameRef=useRef(null); const scoreRef=useRef(0); const levelRef=useRef(1);
  const linesRef=useRef(0);  const hiRef=useRef(0);    const statusRef=useRef('idle');
  const inp=useRef({left:false,right:false,down:false,la:80,ra:80});

  useEffect(()=>{scoreRef.current=score;},[score]);
  useEffect(()=>{levelRef.current=level;},[level]);
  useEffect(()=>{linesRef.current=lines;},[lines]);
  useEffect(()=>{hiRef.current=hiScore;},[hiScore]);
  useEffect(()=>{statusRef.current=status;},[status]);
  useEffect(()=>{const v=parseInt(localStorage.getItem('tetris_hi')||'0',10);setHi(v);hiRef.current=v;},[]);

  const trySpawn = useCallback((board, piece) => {
    const nx=Math.floor((COLS-piece.grid[0].length)/2);
    return isValid(board,piece.grid,nx,0)?{...piece,x:nx,y:-1}:null;
  },[]);

  const start = useCallback(()=>{
    setNewHi(false); setScore(0); setLevel(1); setLines(0);
    scoreRef.current=0; levelRef.current=1; linesRef.current=0;
    const board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
    const cur={...makePiece(randomType()),x:3,y:-1};
    gameRef.current={board,current:cur,next:makePiece(randomType()),dropAccum:0};
    setStatus('playing');
  },[]);

  /* 키보드 */
  useEffect(()=>{
    const kd=(e)=>{
      const g=gameRef.current; if(!g||statusRef.current!=='playing') return;
      if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','Enter','x'].includes(e.key)) e.preventDefault();
      if(e.key==='ArrowLeft')  inp.current.left=true;
      if(e.key==='ArrowRight') inp.current.right=true;
      if(e.key==='ArrowDown')  inp.current.down=true;
      if(e.key==='ArrowUp'||e.key==='x'){
        const rot=rotateCW(g.current.grid);
        for(const k of [0,-1,1,-2,2])
          if(isValid(g.board,rot,g.current.x+k,g.current.y)){g.current={...g.current,grid:rot,x:g.current.x+k};break;}
      }
      if(e.key===' '||e.key==='Enter'){
        while(isValid(g.board,g.current.grid,g.current.x,g.current.y+1)) g.current.y++;
        g.dropAccum=9999;
      }
    };
    const ku=(e)=>{
      if(e.key==='ArrowLeft')  inp.current.left=false;
      if(e.key==='ArrowRight') inp.current.right=false;
      if(e.key==='ArrowDown')  inp.current.down=false;
    };
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    return ()=>{window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);};
  },[]);

  /* 터치 */
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    let sx=0,sy=0;
    const ts=(e)=>{e.preventDefault();sx=e.touches[0].clientX;sy=e.touches[0].clientY;};
    const te=(e)=>{
      e.preventDefault();
      const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;
      const g=gameRef.current; if(!g||statusRef.current!=='playing') return;
      if(Math.abs(dx)<18&&Math.abs(dy)<18){
        const rot=rotateCW(g.current.grid);
        for(const k of [0,-1,1,-2,2])
          if(isValid(g.board,rot,g.current.x+k,g.current.y)){g.current={...g.current,grid:rot,x:g.current.x+k};break;}
      } else if(Math.abs(dx)>Math.abs(dy)){
        if(dx>20&&isValid(g.board,g.current.grid,g.current.x+1,g.current.y)) g.current.x++;
        if(dx<-20&&isValid(g.board,g.current.grid,g.current.x-1,g.current.y)) g.current.x--;
      } else if(dy>30){
        while(isValid(g.board,g.current.grid,g.current.x,g.current.y+1)) g.current.y++;
        g.dropAccum=9999;
      }
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
        const i=inp.current;
        if(i.left){i.la-=dt;if(i.la<=0){i.la=80;if(isValid(g.board,g.current.grid,g.current.x-1,g.current.y))g.current.x--;}}
        else i.la=80;
        if(i.right){i.ra-=dt;if(i.ra<=0){i.ra=80;if(isValid(g.board,g.current.grid,g.current.x+1,g.current.y))g.current.x++;}}
        else i.ra=80;

        const di=i.down?50:Math.max(50,800-(levelRef.current-1)*70);
        g.dropAccum+=dt;
        if(g.dropAccum>=di){
          g.dropAccum-=di;
          if(isValid(g.board,g.current.grid,g.current.x,g.current.y+1)){
            g.current.y++;
          } else {
            const newBoard=placePiece(g.board,g.current.grid,g.current.x,g.current.y,g.current.color);
            const {board:cleared,cleared:n}=clearLines(newBoard);
            const ns=scoreRef.current+SCORE_TABLE[n]*levelRef.current;
            const nl=linesRef.current+n;
            const nv=Math.floor(nl/10)+1;
            scoreRef.current=ns;setScore(ns);
            linesRef.current=nl;setLines(nl);
            levelRef.current=nv;setLevel(nv);
            const np=trySpawn(cleared,g.next);
            if(!np){
              setStatus('gameover');
              saveLeaderboardScore('tetris',ns).then(ok=>{
                if(ok||ns>hiRef.current){
                  const best=Math.max(ns,hiRef.current);
                  setHi(best);hiRef.current=best;setNewHi(true);
                  localStorage.setItem('tetris_hi',String(best));
                }
              });
              try{window.AndroidInterface?.showInterstitialAd?.();}catch(_){}
              setTimeout(()=>{setStatus('idle');onExit?.(ns);},2200);
            } else {
              g.board=cleared;g.current=np;g.next=makePiece(randomType());g.dropAccum=0;
            }
          }
        }
      }

      ctx.fillStyle='#000';ctx.fillRect(0,0,VW,VH);
      if(g){
        drawHUD(ctx,scoreRef.current,levelRef.current,linesRef.current,g.next,hiRef.current);
        drawBoard(ctx,g.board);
        if(st==='playing'){drawGhost(ctx,g.board,g.current);drawPiece(ctx,g.current,BX+g.current.x*CELL,BY+g.current.y*CELL);}
      }
      if(st==='gameover') drawBanner(ctx,'GAME OVER','SCORE '+scoreRef.current);

      raf=requestAnimationFrame(loop);
    };
    raf=requestAnimationFrame(loop);
    return ()=>{cancelled=true;cancelAnimationFrame(raf);};
  },[canvasRef,trySpawn,onExit]);

  return {start,status,score,level,lines,hiScore,isNewHi};
}

/* ── 컴포넌트 ──────────────────────────────────────── */
export default function ClassicTetris({ onExit, autoStart }) {
  const canvasRef=useRef(null);
  const {start,status,hiScore,isNewHi}=useClassicTetris({canvasRef,onExit});
  useEffect(()=>{ if(autoStart) start(); },[]); // eslint-disable-line
  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block w-full h-full select-none"
        style={{imageRendering:'pixelated',touchAction:'none'}}/>
      {status==='idle'&&(
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
          <div className="text-neon text-glow text-lg tracking-widest" style={{fontFamily:'"Press Start 2P",monospace'}}>CLASSIC TETRIS</div>
          <div className="text-neon/70 text-[8px] tracking-wider text-center px-8 leading-loose">
            ← → 이동 · ↑/X 회전<br/>↓ 빠른낙하 · SPACE 즉시낙하<br/>터치: 탭=회전 · 스와이프=이동
          </div>
          <button onClick={start} className="border-2 border-neon px-6 py-3 text-neon hover:bg-neon hover:text-black transition-colors text-[11px] tracking-widest"
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
