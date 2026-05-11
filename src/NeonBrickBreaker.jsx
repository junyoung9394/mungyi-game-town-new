import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { saveLeaderboardScore } from './utils/saveScore';

/* ── 상수 ──────────────────────────────────────────────── */
const NEON = '#39FF14';
const VW = 360;
const VH = 640;

const BRICK_COLS = 8;
const BRICK_ROWS = 6;
const BRICK_W = 39;
const BRICK_H = 13;
const BRICK_GAP_X = 4;
const BRICK_GAP_Y = 5;
const BRICK_START_X = 10;
const BRICK_START_Y = 52;
const BRICK_COLORS = ['#FF2D55', '#FF9F0A', '#FFD60A', '#34FFD8', '#7B2FFF', '#39FF14'];
const BRICK_PTS    = [60, 50, 40, 30, 20, 10];

const PADDLE_W = 72;
const PADDLE_H = 10;
const PADDLE_Y = VH - 48;
const PADDLE_SPEED = 6;

const BALL_R = 6;
const BALL_SPEED_BASE = 4.5;
const BALL_SPEED_INC  = 0.5;
const BALL_SPEED_MAX  = 9.5;

const MISS_DELAY_MS    = 800;
const CLEARED_DELAY_MS = 1200;
const GAMEOVER_DELAY_MS = 1800;

/* ── 드로잉 유틸 ───────────────────────────────────────── */
function drawBackground(ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VW, VH);
  ctx.strokeStyle = 'rgba(57,255,20,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < VW; x += 20) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, VH); ctx.stroke();
  }
  for (let y = 0; y < VH; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(VW, y + 0.5); ctx.stroke();
  }
}

function drawHUD(ctx, score, hiScore, stage, lives) {
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = NEON;
  ctx.textAlign = 'left';
  ctx.fillText('SCORE ' + String(score).padStart(5, '0'), 8, 16);
  ctx.textAlign = 'right';
  ctx.fillText('HI ' + String(hiScore).padStart(5, '0'), VW - 8, 16);
  ctx.textAlign = 'center';
  ctx.fillText('STAGE ' + stage, VW / 2, 16);
  ctx.textAlign = 'left';
  ctx.fillText('LIFE', 8, 32);
  for (let i = 0; i < lives; i++) ctx.fillRect(48 + i * 12, 24, 8, 8);
}

function drawBrick(ctx, brick) {
  const color = BRICK_COLORS[brick.row];
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  ctx.fillRect(brick.x - 1, brick.y - 1, BRICK_W + 2, BRICK_H + 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillRect(brick.x, brick.y, BRICK_W, BRICK_H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(brick.x + 1, brick.y + 1, BRICK_W - 2, 2);
}

function drawPaddle(ctx, paddle) {
  ctx.fillStyle = NEON;
  ctx.fillRect(paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(paddle.x + 2, PADDLE_Y + 1, PADDLE_W - 4, 2);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = NEON;
  ctx.fillRect(paddle.x - 2, PADDLE_Y - 2, PADDLE_W + 4, PADDLE_H + 4);
  ctx.globalAlpha = 1;
}

function drawBall(ctx, ball) {
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = NEON;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = NEON;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x - 2, ball.y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x | 0, p.y | 0, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawCenterBanner(ctx, title, subtitle) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, VH / 2 - 50, VW, 100);
  ctx.strokeStyle = NEON;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, VH / 2 - 49, VW - 2, 98);
  ctx.fillStyle = NEON;
  ctx.textAlign = 'center';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillText(title, VW / 2, VH / 2 - 5);
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillText(subtitle, VW / 2, VH / 2 + 22);
}

/* ── 게임 훅 ───────────────────────────────────────────── */
export function useNeonBrickBreaker({ canvasRef, onExit }) {
  const [stage, setStage]     = useState(1);
  const [score, setScore]     = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [lives, setLives]     = useState(3);
  const [status, setStatus]   = useState('idle');
  const [isNewHi, setIsNewHi] = useState(false);

  const gameRef     = useRef(null);
  const stageRef    = useRef(1);
  const scoreRef    = useRef(0);
  const livesRef    = useRef(3);
  const hiScoreRef  = useRef(0);
  const statusRef   = useRef('idle');
  const inputRef    = useRef({ left: false, right: false });
  const paddleXRef  = useRef(null); // mouse/touch 직접 위치

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { hiScoreRef.current = hiScore; }, [hiScore]);
  useEffect(() => { statusRef.current = status; }, [status]);

  /* Firestore: 하이스코어 로드 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(getFirestore(), 'scores_brick', uid));
        if (!cancelled && snap.exists()) setHiScore(snap.data().hiScore ?? 0);
      } catch (e) { console.warn('[Brick] hiScore load 실패:', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveHiScore = useCallback(async (newScore) => {
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      await setDoc(
        doc(getFirestore(), 'scores_brick', uid),
        { hiScore: newScore, stageReached: stageRef.current, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) { console.warn('[Brick] hiScore 저장 실패:', e); }
  }, []);

  /* 스테이지 초기화 */
  const initStage = useCallback((stageNum) => {
    const bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_START_X + c * (BRICK_W + BRICK_GAP_X),
          y: BRICK_START_Y + r * (BRICK_H + BRICK_GAP_Y),
          row: r,
          alive: true,
        });
      }
    }
    const speed = Math.min(BALL_SPEED_MAX, BALL_SPEED_BASE + (stageNum - 1) * BALL_SPEED_INC);
    const angle = (-55 - Math.random() * 70) * (Math.PI / 180); // -55°~-125°
    gameRef.current = {
      paddle: { x: VW / 2 - PADDLE_W / 2 },
      ball: {
        x: VW / 2,
        y: PADDLE_Y - BALL_R - 2,
        vx: speed * Math.cos(angle + Math.PI / 2),
        vy: speed * Math.sin(angle + Math.PI / 2),
        speed,
      },
      bricks,
      particles: [],
      missTimer: 0,
      missPending: false,
      clearedTimer: 0,
    };
  }, []);

  /* 게임 시작 */
  const start = useCallback(() => {
    setIsNewHi(false);
    setStage(1); setScore(0); setLives(3);
    initStage(1);
    setStatus('playing');
  }, [initStage]);

  /* 게임 오버 */
  const triggerGameOver = useCallback(() => {
    const final = scoreRef.current;
    setStatus('gameover');
    saveLeaderboardScore('brickBreaker', final).then(isNew => {
      if (isNew || final > hiScoreRef.current) {
        setHiScore(final); setIsNewHi(true);
      }
    });
    if (final > hiScoreRef.current) {
      saveHiScore(final); // 로컬 컬렉션 유지
    }
    try {
      window.AndroidInterface?.showInterstitialAd?.();
    } catch (e) {}
    setTimeout(() => { setStatus('idle'); onExit?.(final); }, GAMEOVER_DELAY_MS);
  }, [saveHiScore, onExit]);

  /* 입력: 키보드 */
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'ArrowLeft')  inputRef.current.left  = true;
      if (e.key === 'ArrowRight') inputRef.current.right = true;
    };
    const up = (e) => {
      if (e.key === 'ArrowLeft')  inputRef.current.left  = false;
      if (e.key === 'ArrowRight') inputRef.current.right = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  /* 입력: 마우스/터치 → 패들 직접 추적 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const toVW = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (VW / rect.width);
    };
    const onMouse = (e) => { paddleXRef.current = toVW(e.clientX); };
    const onTouch = (e) => {
      e.preventDefault();
      if (e.touches[0]) paddleXRef.current = toVW(e.touches[0].clientX);
    };
    const onTouchEnd = (e) => { e.preventDefault(); };
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('touchmove', onTouch, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [canvasRef]);

  /* 캔버스 DPR 설정 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = VW * dpr;
      canvas.height = VH * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  /* 게임 루프 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let cancelled = false, lastTime = performance.now(), rafId = 0;

    const loop = (now) => {
      if (cancelled) return;
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      const st   = statusRef.current;
      const game = gameRef.current;

      if (st === 'playing' && game) updatePlaying(game, dt);
      else if (st === 'cleared' && game) {
        game.clearedTimer += dt;
        if (game.clearedTimer >= CLEARED_DELAY_MS) {
          const next = stageRef.current + 1;
          setStage(next); initStage(next); setStatus('playing');
        }
      }

      drawBackground(ctx);
      if (game && (st === 'playing' || st === 'cleared' || st === 'gameover')) {
        drawHUD(ctx, scoreRef.current, hiScoreRef.current, stageRef.current, livesRef.current);
        game.bricks.forEach(b => { if (b.alive) drawBrick(ctx, b); });
        drawParticles(ctx, game.particles);
        drawPaddle(ctx, game.paddle);
        if (!game.missPending) drawBall(ctx, game.ball);
      }
      if (st === 'cleared')  drawCenterBanner(ctx, 'CLEARED!', 'NEXT STAGE ' + (stageRef.current + 1));
      if (st === 'gameover') drawCenterBanner(ctx, 'GAME OVER', 'SCORE ' + scoreRef.current);

      rafId = requestAnimationFrame(loop);
    };

    function updatePlaying(game, dt) {
      const { paddle, ball } = game;

      /* 패들 이동 */
      if (paddleXRef.current !== null) {
        paddle.x = Math.max(0, Math.min(VW - PADDLE_W, paddleXRef.current - PADDLE_W / 2));
      } else {
        const inp = inputRef.current;
        if (inp.left)  paddle.x = Math.max(0, paddle.x - PADDLE_SPEED);
        if (inp.right) paddle.x = Math.min(VW - PADDLE_W, paddle.x + PADDLE_SPEED);
      }

      /* MISS 대기 중이면 공 패들에 붙여두기 */
      if (game.missPending) {
        ball.x = paddle.x + PADDLE_W / 2;
        ball.y = PADDLE_Y - BALL_R - 2;
        game.missTimer -= dt;
        if (game.missTimer <= 0) {
          game.missPending = false;
          const angle = (-60 - Math.random() * 60) * (Math.PI / 180);
          ball.vx = ball.speed * Math.cos(angle + Math.PI / 2);
          ball.vy = ball.speed * Math.sin(angle + Math.PI / 2);
        }
        return;
      }

      /* 공 이동 */
      ball.x += ball.vx;
      ball.y += ball.vy;

      /* 벽 충돌 */
      if (ball.x - BALL_R < 0)   { ball.x = BALL_R;      ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R > VW)  { ball.x = VW - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R < 0)   { ball.y = BALL_R;      ball.vy = Math.abs(ball.vy); }

      /* 패들 충돌 */
      if (
        ball.vy > 0 &&
        ball.y + BALL_R >= PADDLE_Y &&
        ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
        ball.x >= paddle.x - BALL_R &&
        ball.x <= paddle.x + PADDLE_W + BALL_R
      ) {
        const hitPos = (ball.x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2);
        const angle  = hitPos * (Math.PI / 3); // ±60°
        ball.vx = ball.speed * Math.sin(angle);
        ball.vy = -ball.speed * Math.cos(angle);
        ball.y  = PADDLE_Y - BALL_R - 1;
      }

      /* 하단 이탈 → 미스 */
      if (ball.y - BALL_R > VH) {
        const newLives = livesRef.current - 1;
        setLives(newLives);
        if (newLives <= 0) { triggerGameOver(); return; }
        game.missPending = true;
        game.missTimer   = MISS_DELAY_MS;
        return;
      }

      /* 벽돌 충돌 */
      for (const brick of game.bricks) {
        if (!brick.alive) continue;
        const overlapX = (BRICK_W / 2 + BALL_R) - Math.abs(ball.x - (brick.x + BRICK_W / 2));
        const overlapY = (BRICK_H / 2 + BALL_R) - Math.abs(ball.y - (brick.y + BRICK_H / 2));
        if (overlapX > 0 && overlapY > 0) {
          brick.alive = false;
          const pts = BRICK_PTS[brick.row] * stageRef.current;
          setScore(s => s + pts);
          if (overlapX < overlapY) ball.vx *= -1;
          else                     ball.vy *= -1;
          const color = BRICK_COLORS[brick.row];
          for (let i = 0; i < 8; i++) {
            game.particles.push({
              x: brick.x + BRICK_W / 2, y: brick.y + BRICK_H / 2,
              vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
              life: 350, maxLife: 350, color,
            });
          }
          break; // 프레임당 1개
        }
      }

      /* 파티클 */
      for (const p of game.particles) { p.x += p.vx; p.y += p.vy; p.life -= dt; }
      game.particles = game.particles.filter(p => p.life > 0);

      /* 클리어 판정 */
      if (game.bricks.every(b => !b.alive)) {
        game.clearedTimer = 0;
        setStatus('cleared');
      }
    }

    rafId = requestAnimationFrame(loop);
    return () => { cancelled = true; if (rafId) cancelAnimationFrame(rafId); };
  }, [canvasRef, initStage, triggerGameOver]);

  return { start, status, stage, score, hiScore, lives, isNewHi };
}

/* ── 컴포넌트 ──────────────────────────────────────────── */
export default function NeonBrickBreaker({ onExit }) {
  const canvasRef = useRef(null);
  const { start, status, score, hiScore, stage, lives, isNewHi } =
    useNeonBrickBreaker({ canvasRef, onExit });

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="block w-full h-full select-none"
        style={{ imageRendering: 'pixelated', touchAction: 'none', cursor: 'none' }}
      />

      {/* IDLE 오버레이 */}
      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/75">
          <div
            className="text-neon text-glow text-xl tracking-widest"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            NEON BRICKS
          </div>
          <div className="text-neon/70 text-[10px] tracking-wider text-center px-6 leading-relaxed">
            마우스 / 터치로 패들 이동<br />
            ← → 키도 사용 가능
          </div>
          <button
            onClick={start}
            className="border-2 border-neon px-6 py-3 text-neon hover:bg-neon hover:text-black transition-colors tracking-widest text-[12px]"
            style={{ fontFamily: '"Press Start 2P", monospace', boxShadow: '0 0 12px rgba(57,255,20,0.5)' }}
          >
            ▶ START
          </button>
          <div
            className="text-neon/60 text-[10px] tracking-widest"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            HI-SCORE  {String(hiScore).padStart(5, '0')}
          </div>
        </div>
      )}

      {/* NEW HI-SCORE 배너 */}
      {status === 'gameover' && isNewHi && (
        <div className="absolute top-1/2 left-0 right-0 mt-16 flex justify-center pointer-events-none">
          <div
            className="text-neon text-glow text-[10px] tracking-widest blink"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            ★ NEW HI-SCORE ★
          </div>
        </div>
      )}
    </div>
  );
}
