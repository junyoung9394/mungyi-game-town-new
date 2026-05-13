import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { saveLeaderboardScore } from './utils/saveScore';

const N = 15;
const COLORS = { B: '#39FF14', W: '#FF2D55' };

/* ── 순수 함수 ───────────────────────────────────────── */
function checkWinner(board, r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let cnt = 1;
    for (let i = 1; i < 5; i++) {
      const nr = r+dr*i, nc = c+dc*i;
      if (nr>=0&&nr<N&&nc>=0&&nc<N&&board[nr][nc]===color) cnt++; else break;
    }
    for (let i = 1; i < 5; i++) {
      const nr = r-dr*i, nc = c-dc*i;
      if (nr>=0&&nr<N&&nc>=0&&nc<N&&board[nr][nc]===color) cnt++; else break;
    }
    if (cnt >= 5) return true;
  }
  return false;
}

function getWinLine(board, r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const line = [[r,c]];
    for (let i = 1; i < 5; i++) {
      const nr = r+dr*i, nc = c+dc*i;
      if (nr>=0&&nr<N&&nc>=0&&nc<N&&board[nr][nc]===color) line.push([nr,nc]); else break;
    }
    for (let i = 1; i < 5; i++) {
      const nr = r-dr*i, nc = c-dc*i;
      if (nr>=0&&nr<N&&nc>=0&&nc<N&&board[nr][nc]===color) line.push([nr,nc]); else break;
    }
    if (line.length >= 5) return line;
  }
  return [];
}

function countDir(board, r, c, dr, dc, color) {
  let cnt = 0, pr = r+dr, pc = c+dc;
  while (pr>=0&&pr<N&&pc>=0&&pc<N&&board[pr][pc]===color) { cnt++; pr+=dr; pc+=dc; }
  return { cnt, open: pr>=0&&pr<N&&pc>=0&&pc<N&&!board[pr][pc] };
}

function evalCell(board, r, c, color) {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let best = 0;
  for (const [dr, dc] of dirs) {
    const f = countDir(board, r, c, dr, dc, color);
    const b = countDir(board, r, c, -dr, -dc, color);
    const tot  = f.cnt + b.cnt + 1;
    const open = (f.open?1:0) + (b.open?1:0);
    const s = tot>=5 ? 100000
      : tot===4 && open>=1 ? 10000
      : tot===4            ? 500
      : tot===3 && open===2 ? 1000
      : tot===3 && open===1 ? 100
      : tot===2 && open===2 ? 10
      : tot===2 && open===1 ? 5
      : 1;
    best = Math.max(best, s);
  }
  return best;
}

function bestAiMove(board) {
  const nearby = new Set();
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (board[r][c])
        for (let dr=-2; dr<=2; dr++)
          for (let dc=-2; dc<=2; dc++) {
            const nr=r+dr, nc=c+dc;
            if (nr>=0&&nr<N&&nc>=0&&nc<N&&!board[nr][nc]) nearby.add(nr*N+nc);
          }
  if (!nearby.size) return { r:7, c:7 };
  let best=-1, picks=[];
  for (const key of nearby) {
    const r=Math.floor(key/N), c=key%N;
    const atk = evalCell(board, r, c, 'W');
    const def = evalCell(board, r, c, 'B');
    const score = atk>=10000 ? atk : Math.max(atk, def>=10000 ? def : def*0.9);
    if (score>best) { best=score; picks=[{r,c}]; }
    else if (score===best) picks.push({r,c});
  }
  return picks[Math.floor(Math.random()*picks.length)];
}

/* ── 컴포넌트 ────────────────────────────────────────── */
export default function NeonOmok({ onExit }) {
  const [mode,     setMode]     = useState(null);
  const [board,    setBoard]    = useState(() => Array.from({length:N}, ()=>Array(N).fill(null)));
  const [turn,     setTurn]     = useState('B');
  const [winner,   setWinner]   = useState(null);
  const [winLine,  setWinLine]  = useState([]);
  const [moves,    setMoves]    = useState(0);

  const canvasRef    = useRef(null);
  const containerRef = useRef(null);

  /* ── 캔버스 크기 설정 ──────────────────────────────── */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont || !mode) return;
    const W  = cont.offsetWidth || 300;
    const PR = window.devicePixelRatio || 1;
    canvas.width  = Math.round(W * PR);
    canvas.height = Math.round(W * PR);
    canvas.style.width  = W + 'px';
    canvas.style.height = W + 'px';
  }, [mode]);

  /* ── 캔버스 드로우 ─────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont || !mode) return;
    const W  = cont.offsetWidth || 300;
    const PR = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(PR, 0, 0, PR, 0, 0);

    const pad  = W * 0.055;
    const cell = (W - pad*2) / (N-1);

    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, W);

    // 격자선
    ctx.strokeStyle = 'rgba(57,255,20,0.30)';
    ctx.lineWidth   = 0.7;
    for (let i=0; i<N; i++) {
      const x = pad + i*cell, y = pad + i*cell;
      ctx.beginPath(); ctx.moveTo(x, pad);   ctx.lineTo(x, W-pad); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad, y);   ctx.lineTo(W-pad, y); ctx.stroke();
    }

    // 화점
    const stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
    ctx.fillStyle = 'rgba(57,255,20,0.65)';
    for (const [sr,sc] of stars) {
      ctx.beginPath();
      ctx.arc(pad+sc*cell, pad+sr*cell, 2.2, 0, Math.PI*2);
      ctx.fill();
    }

    // 승리 좌표 셋
    const winSet = new Set(winLine.map(([r,c])=>r*N+c));

    // 돌 그리기
    for (let r=0; r<N; r++) {
      for (let c=0; c<N; c++) {
        if (!board[r][c]) continue;
        const x   = pad + c*cell;
        const y   = pad + r*cell;
        const rad = cell * 0.42;
        const col = COLORS[board[r][c]];
        const isWin = winSet.has(r*N+c);
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur  = isWin ? 20 : 7;
        ctx.fillStyle   = col;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // 하이라이트
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(x-rad*0.22, y-rad*0.28, rad*0.35, 0, Math.PI*2); ctx.fill();
      }
    }
  }, [board, winLine, mode]);

  /* ── 돌 놓기 ─────────────────────────────────────────  */
  // AI가 생각 중(=AI 모드 + 백 차례 + 게임 진행 중)이면 human 입력 차단
  const aiThinking = mode === 'AI' && turn === 'W' && !winner;

  const handlePlace = useCallback((r, c) => {
    if (winner || aiThinking) return;
    if (mode==='AI' && turn==='W') return;
    if (board[r][c]) return;

    const nb = board.map(row=>[...row]);
    nb[r][c] = turn;
    const nm = moves + 1;

    if (checkWinner(nb, r, c, turn)) {
      setBoard(nb); setWinner(turn); setWinLine(getWinLine(nb,r,c,turn)); setMoves(nm);
      if (mode==='AI' && turn==='B') {
        saveLeaderboardScore('omok', Math.max(100, 1000 - Math.ceil(nm/2)*20));
      }
      return;
    }
    if (nb.every(row=>row.every(cell=>cell!==null))) { setBoard(nb); setWinner('D'); setMoves(nm); return; }
    setBoard(nb); setTurn(turn==='B'?'W':'B'); setMoves(nm);
  }, [board, turn, winner, mode, moves, aiThinking]);

  /* ── AI 턴 ───────────────────────────────────────────  */
  useEffect(() => {
    if (!aiThinking) return;
    const t = setTimeout(() => {
      const mv = bestAiMove(board);
      const nb = board.map(row=>[...row]);
      nb[mv.r][mv.c] = 'W';
      const nm = moves + 1;
      if (checkWinner(nb, mv.r, mv.c, 'W')) {
        setBoard(nb); setWinner('W'); setWinLine(getWinLine(nb,mv.r,mv.c,'W'));
      } else if (nb.every(row=>row.every(c=>c))) {
        setBoard(nb); setWinner('D');
      } else {
        setBoard(nb); setTurn('B');
      }
      setMoves(nm);
    }, 450);
    return () => clearTimeout(t);
  }, [aiThinking, board, moves]);

  /* ── 캔버스 클릭/터치 ──────────────────────────────── */
  const canvasToCell = useCallback((cx, cy) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const W    = rect.width;
    const pad  = W * 0.055;
    const cell = (W - pad*2) / (N-1);
    const c = Math.round((cx - rect.left - pad) / cell);
    const r = Math.round((cy - rect.top  - pad) / cell);
    return (r>=0&&r<N&&c>=0&&c<N) ? {r,c} : null;
  }, []);

  const handleClick = useCallback(e => {
    const p = canvasToCell(e.clientX, e.clientY);
    if (p) handlePlace(p.r, p.c);
  }, [canvasToCell, handlePlace]);

  const handleTouch = useCallback(e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const p = canvasToCell(t.clientX, t.clientY);
    if (p) handlePlace(p.r, p.c);
  }, [canvasToCell, handlePlace]);

  /* ── 리셋 ────────────────────────────────────────────  */
  const reset = () => {
    setBoard(Array.from({length:N},()=>Array(N).fill(null)));
    setTurn('B'); setWinner(null); setWinLine([]); setMoves(0);
  };

  /* ── 모드 선택 화면 ─────────────────────────────────── */
  if (!mode) return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black">
      <p className="text-neon text-[15px] tracking-widest"
        style={{fontFamily:'"Press Start 2P",monospace', textShadow:'0 0 10px #39FF14'}}>OMOK</p>
      <p className="text-neon/50 text-[9px]" style={{fontFamily:'"Press Start 2P",monospace'}}>모드 선택</p>
      <div className="flex flex-col gap-3 w-[180px]">
        <button onClick={()=>setMode('AI')}
          className="border-2 border-neon text-neon py-3 text-[11px] tracking-widest hover:bg-neon hover:text-black active:scale-95 transition-all"
          style={{fontFamily:'"Press Start 2P",monospace', boxShadow:'0 0 12px rgba(57,255,20,0.4)'}}>
          🤖 VS AI
        </button>
        <button onClick={()=>setMode('2P')}
          className="border border-neon/50 text-neon/60 py-3 text-[11px] tracking-widest hover:border-neon hover:text-neon active:scale-95 transition-all"
          style={{fontFamily:'"Press Start 2P",monospace'}}>
          👥 2인 대전
        </button>
      </div>
      <button onClick={onExit} className="text-neon/30 hover:text-neon/60 text-[8px] mt-2 transition-colors"
        style={{fontFamily:'"Press Start 2P",monospace'}}>◀ BACK</button>
    </div>
  );

  /* ── 상태 라벨 ───────────────────────────────────────  */
  const turnColor = COLORS[turn];
  const statusText = winner
    ? (winner==='D' ? '🤝 DRAW'
      : winner==='B' ? (mode==='AI'?'🎉 YOU WIN!':'⬛ BLACK WIN!')
      : (mode==='AI'?'🤖 AI WIN!':'⬜ WHITE WIN!'))
    : aiThinking ? '🤖 생각 중...'
    : mode==='AI' ? (turn==='B'?'▶ YOUR TURN':'AI TURN')
    : `▶ ${turn==='B'?'흑':'백'} 차례`;

  const winColor = winner==='B' ? COLORS.B : winner==='W' ? COLORS.W : '#888';

  return (
    <div className="absolute inset-0 flex flex-col bg-black select-none overflow-hidden">

      {/* 상태 바 */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-neon/20">
        <div className="flex items-center gap-2">
          {!winner && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{background: turnColor, boxShadow:`0 0 6px ${turnColor}`}} />
          )}
          <span className="text-[8px] tracking-wider"
            style={{fontFamily:'"Press Start 2P",monospace', color: winner ? winColor : turnColor}}>
            {statusText}
          </span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={reset}
            className="text-[7px] px-2 py-1 border border-neon/25 text-neon/50 hover:border-neon hover:text-neon transition-colors"
            style={{fontFamily:'"Press Start 2P",monospace'}}>NEW</button>
          <button onClick={()=>{reset();setMode(null);}}
            className="text-[7px] px-2 py-1 border border-neon/25 text-neon/50 hover:border-neon hover:text-neon transition-colors"
            style={{fontFamily:'"Press Start 2P",monospace'}}>MODE</button>
        </div>
      </div>

      {/* 보드 */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div ref={containerRef} className="w-full max-w-[380px] aspect-square">
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            onTouchEnd={handleTouch}
            style={{
              display: 'block',
              cursor: winner || aiThinking ? 'default' : 'crosshair',
              touchAction: 'none',
            }}
          />
        </div>
      </div>

      {/* 승패 오버레이 */}
      {winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/65 z-10">
          <div className="flex flex-col items-center gap-5 border-2 px-8 py-6"
            style={{borderColor: winColor, boxShadow:`0 0 24px ${winColor}50`}}>
            <p className="text-[14px] tracking-widest"
              style={{fontFamily:'"Press Start 2P",monospace', color: winColor,
                textShadow:`0 0 10px ${winColor}`}}>
              {statusText}
            </p>
            {mode==='AI' && winner==='B' && (
              <p className="text-neon/50 text-[8px]" style={{fontFamily:'"Press Start 2P",monospace'}}>
                SCORE: {Math.max(100, 1000-Math.ceil(moves/2)*20)}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={reset}
                className="text-[9px] px-4 py-2 border-2 hover:opacity-80 transition-opacity active:scale-95"
                style={{fontFamily:'"Press Start 2P",monospace', color:winColor, borderColor:winColor}}>
                다시 하기
              </button>
              <button onClick={()=>{reset();setMode(null);}}
                className="text-[9px] px-4 py-2 border border-neon/40 text-neon/50 hover:text-neon hover:border-neon transition-colors active:scale-95"
                style={{fontFamily:'"Press Start 2P",monospace'}}>
                모드 변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
