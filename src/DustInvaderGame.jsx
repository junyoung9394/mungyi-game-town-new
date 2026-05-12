import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { saveLeaderboardScore } from './utils/saveScore';
import { useAutoSave } from './utils/useAutoSave';

/* ============================================================
 * 상수 (가상 해상도 + 게임 밸런스)
 *   - 캔버스는 어떤 크기로 렌더되든 내부 좌표계는 VW×VH 고정
 *   - 9:16 비율이라 360×640
 * ============================================================ */
const NEON = '#39FF14';
const NEON_SOFT = '#90FFA0';

const VW = 360;
const VH = 640;

const PLAYER_W = 28;
const PLAYER_H = 18;
const PLAYER_Y = VH - 56;
const PLAYER_SPEED = 3.2; // px / frame (60fps 기준)

const BULLET_W = 3;
const BULLET_H = 10;
const BULLET_SPEED = 7;
const FIRE_INTERVAL = 380; // ms

const ENEMY_W = 24;
const ENEMY_H = 18;
const ENEMY_COLS = 7;
const ENEMY_ROWS = 4;
const ENEMY_GAP_X = 8;
const ENEMY_GAP_Y = 10;
const ENEMY_START_Y = 64;

const ENEMY_STEP_X = 6;
const ENEMY_DESCENT_BASE = 14;
const ENEMY_STEP_INTERVAL_BASE = 650; // ms - 스테이지마다 짧아짐
const ENEMY_STEP_INTERVAL_MIN = 110;
const ENEMY_ANIM_INTERVAL = 380;

const GAMEOVER_DELAY_MS = 1800;
const CLEARED_DELAY_MS = 1500;

/* ============================================================
 * 스프라이트 드로잉 (도트 감성)
 * ============================================================ */
function drawTank(ctx, x, y) {
  // 포신
  ctx.fillStyle = NEON;
  ctx.fillRect(x + 13, y - 6, 2, 8);
  // 포탑
  ctx.fillRect(x + 6, y - 2, 16, 4);
  // 본체
  ctx.fillRect(x + 2, y + 2, 24, 10);
  // 캐터필러
  ctx.fillStyle = NEON_SOFT;
  ctx.fillRect(x, y + 12, 28, 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 4, y + 13, 2, 2);
  ctx.fillRect(x + 12, y + 13, 2, 2);
  ctx.fillRect(x + 22, y + 13, 2, 2);
  // 해치 디테일
  ctx.fillRect(x + 12, y + 4, 4, 3);
}

function drawDust(ctx, x, y, frame, type) {
  ctx.fillStyle = NEON;
  if (type === 0) {
    // 둥근 먼지 몬스터
    ctx.fillRect(x + 6, y, 12, 2);
    ctx.fillRect(x + 4, y + 2, 16, 2);
    ctx.fillRect(x + 2, y + 4, 20, 6);
    ctx.fillRect(x + 4, y + 10, 16, 2);
    if (frame === 0) {
      ctx.fillRect(x + 2, y + 12, 4, 4);
      ctx.fillRect(x + 10, y + 12, 4, 4);
      ctx.fillRect(x + 18, y + 12, 4, 4);
    } else {
      ctx.fillRect(x, y + 12, 4, 4);
      ctx.fillRect(x + 8, y + 12, 4, 4);
      ctx.fillRect(x + 16, y + 12, 4, 4);
    }
  } else {
    // 뾰족한 먼지 몬스터
    ctx.fillRect(x + 4, y, 4, 2);
    ctx.fillRect(x + 12, y, 4, 2);
    ctx.fillRect(x + 4, y + 2, 16, 2);
    ctx.fillRect(x + 2, y + 4, 20, 4);
    ctx.fillRect(x + 4, y + 8, 16, 4);
    if (frame === 0) {
      ctx.fillRect(x, y + 12, 4, 4);
      ctx.fillRect(x + 8, y + 12, 4, 4);
      ctx.fillRect(x + 16, y + 12, 4, 4);
    } else {
      ctx.fillRect(x + 2, y + 12, 4, 4);
      ctx.fillRect(x + 10, y + 12, 4, 4);
      ctx.fillRect(x + 18, y + 12, 4, 4);
    }
  }
  // 눈 (검은 픽셀로 음각)
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 7, y + 5, 3, 3);
  ctx.fillRect(x + 14, y + 5, 3, 3);
}

function drawBullet(ctx, x, y) {
  ctx.fillStyle = NEON_SOFT;
  ctx.fillRect(x, y, BULLET_W, BULLET_H);
  ctx.fillStyle = NEON;
  ctx.fillRect(x, y + 2, BULLET_W, BULLET_H - 4);
}

function drawParticles(ctx, particles) {
  ctx.fillStyle = NEON;
  for (const p of particles) {
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillRect(p.x | 0, p.y | 0, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawBackground(ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VW, VH);
  // 미세한 격자
  ctx.strokeStyle = 'rgba(57,255,20,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < VW; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, VH);
    ctx.stroke();
  }
  for (let y = 0; y < VH; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(VW, y + 0.5);
    ctx.stroke();
  }
  // 탱크가 다니는 바닥선
  ctx.fillStyle = NEON;
  ctx.fillRect(0, PLAYER_Y + PLAYER_H + 6, VW, 2);
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
  for (let i = 0; i < lives; i++) {
    ctx.fillRect(48 + i * 12, 24, 8, 8);
  }
}

function drawCenterBanner(ctx, title, subtitle) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, VH / 2 - 50, VW, 100);
  ctx.strokeStyle = NEON;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, VH / 2 - 49, VW - 2, 98);
  ctx.fillStyle = NEON;
  ctx.textAlign = 'center';
  ctx.font = '16px "Press Start 2P", monospace';
  ctx.fillText(title, VW / 2, VH / 2 - 5);
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillText(subtitle, VW / 2, VH / 2 + 22);
}

/* ============================================================
 * 게임 훅
 *   - 캔버스 ref + 콜백을 받아 게임 라이프사이클 전체 관리
 *   - 외부에는 상태(state)와 컨트롤(start)만 노출
 * ============================================================ */
export function useDustInvaderGame({ canvasRef, onExit }) {
  // === React 상태 (UI 표시용) ===
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState('idle'); // idle | playing | cleared | gameover
  const [isNewHi, setIsNewHi] = useState(false);

  // === 게임 루프 내부에서 참조용 ref들 (re-render 없이 최신값 사용) ===
  const gameRef = useRef(null);
  const stageRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const hiScoreRef = useRef(0);
  const statusRef = useRef('idle');
  const inputRef = useRef({ left: false, right: false, touchDir: 0 });

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { hiScoreRef.current = hiScore; }, [hiScore]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // 중간 점수 자동 저장 (LOBBY 이탈 / 창 닫기)
  useAutoSave('dustInvader', scoreRef, statusRef);

  /* === Firestore: Hi-Score 로드 === */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) return;
        const db = getFirestore();
        const snap = await getDoc(doc(db, 'scores', uid));
        if (!cancelled && snap.exists()) {
          setHiScore(snap.data().hiScore ?? 0);
        }
      } catch (e) {
        console.warn('[Game] Hi-score load 실패:', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* === Firestore: Hi-Score 저장 === */
  const saveHiScore = useCallback(async (newScore) => {
    try {
      const uid = getAuth().currentUser?.uid;
      if (!uid) return;
      const db = getFirestore();
      await setDoc(
        doc(db, 'scores', uid),
        {
          hiScore: newScore,
          stageReached: stageRef.current,
          updatedAt: serverTimestamp(),
          displayName: getAuth().currentUser?.displayName ?? null,
        },
        { merge: true }
      );
      console.log('[Game] Hi-score 저장됨:', newScore);
    } catch (e) {
      console.warn('[Game] Hi-score 저장 실패:', e);
    }
  }, []);

  /* === 스테이지 초기화 === */
  const initStage = useCallback((stageNum) => {
    const enemies = [];
    const totalW = ENEMY_COLS * ENEMY_W + (ENEMY_COLS - 1) * ENEMY_GAP_X;
    const startX = (VW - totalW) / 2;
    for (let r = 0; r < ENEMY_ROWS; r++) {
      for (let c = 0; c < ENEMY_COLS; c++) {
        enemies.push({
          x: startX + c * (ENEMY_W + ENEMY_GAP_X),
          y: ENEMY_START_Y + r * (ENEMY_H + ENEMY_GAP_Y),
          alive: true,
          type: r % 2,
        });
      }
    }

    const stepInterval = Math.max(
      ENEMY_STEP_INTERVAL_MIN,
      ENEMY_STEP_INTERVAL_BASE - (stageNum - 1) * 80
    );
    const descent = ENEMY_DESCENT_BASE + (stageNum - 1) * 2;

    gameRef.current = {
      player: { x: VW / 2 - PLAYER_W / 2, y: PLAYER_Y },
      bullets: [],
      enemies,
      particles: [],
      enemyDir: 1,
      enemyStepTimer: 0,
      enemyStepInterval: stepInterval,
      enemyStepIntervalBase: stepInterval,
      enemyDescent: descent,
      fireTimer: FIRE_INTERVAL, // 시작과 거의 동시에 첫 발 발사
      animTimer: 0,
      animFrame: 0,
      clearedTimer: 0,
      gameoverTimer: 0,
    };
  }, []);

  /* === 게임 시작 === */
  const start = useCallback(() => {
    setIsNewHi(false);
    setStage(1);
    setScore(0);
    setLives(3);
    initStage(1);
    setStatus('playing');
  }, [initStage]);

  /* === 게임 오버 처리 === */
  const triggerGameOver = useCallback(() => {
    const finalScore = scoreRef.current;
    setStatus('gameover');

    // 1) 리더보드 저장 (전체) + Hi-Score 갱신
    saveLeaderboardScore('dustInvader', finalScore).then(isNew => {
      if (isNew || finalScore > hiScoreRef.current) {
        setHiScore(finalScore); setIsNewHi(true);
      }
    });
    if (finalScore > hiScoreRef.current) {
      saveHiScore(finalScore); // 로컬 컬렉션도 유지
    }

    // 2) 안드로이드 웹뷰로 전면 광고 신호 전송
    try {
      if (typeof window !== 'undefined' && window.AndroidInterface?.showInterstitialAd) {
        window.AndroidInterface.showInterstitialAd();
        console.log('[Game] Interstitial ad 신호 전송');
      }
    } catch (e) {
      console.warn('[Game] Ad 신호 실패:', e);
    }

    // 3) 잠시 후 로비(idle)로 복귀 + 외부 onExit 콜백
    setTimeout(() => {
      setStatus('idle');
      onExit?.(finalScore);
    }, GAMEOVER_DELAY_MS);
  }, [saveHiScore, onExit]);

  /* === 입력: 키보드 === */
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === 'ArrowLeft') inputRef.current.left = true;
      if (e.key === 'ArrowRight') inputRef.current.right = true;
    };
    const onUp = (e) => {
      if (e.key === 'ArrowLeft') inputRef.current.left = false;
      if (e.key === 'ArrowRight') inputRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  /* === 입력: 터치 (왼쪽/오른쪽 절반) === */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getDir = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const relX = clientX - rect.left;
      return relX < rect.width / 2 ? -1 : 1;
    };
    const onStart = (e) => {
      e.preventDefault();
      if (e.touches?.[0]) inputRef.current.touchDir = getDir(e.touches[0].clientX);
    };
    const onMove = (e) => {
      e.preventDefault();
      if (e.touches?.[0]) inputRef.current.touchDir = getDir(e.touches[0].clientX);
    };
    const onEnd = (e) => {
      e.preventDefault();
      inputRef.current.touchDir = 0;
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
    };
  }, [canvasRef]);

  /* === 캔버스 해상도 세팅 (DPR + 360×640 좌표계) === */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = VW * dpr;
      canvas.height = VH * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  /* === 메인 게임 루프 (마운트 시 1회만 시작, 내부에서 status ref로 분기) === */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let cancelled = false;
    let lastTime = performance.now();
    let rafId = 0;

    const loop = (now) => {
      if (cancelled) return;
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      const st = statusRef.current;
      const game = gameRef.current;

      // === 1) 상태별 업데이트 ===
      if (st === 'playing' && game) {
        updatePlaying(game, dt);
      } else if (st === 'cleared' && game) {
        game.clearedTimer += dt;
        if (game.clearedTimer >= CLEARED_DELAY_MS) {
          const next = stageRef.current + 1;
          setStage(next);
          initStage(next);
          setStatus('playing');
        }
      }

      // === 2) 렌더 ===
      drawBackground(ctx);

      if (game && (st === 'playing' || st === 'cleared' || st === 'gameover')) {
        drawHUD(ctx, scoreRef.current, hiScoreRef.current, stageRef.current, livesRef.current);
        for (const e of game.enemies) {
          if (e.alive) drawDust(ctx, e.x, e.y, game.animFrame, e.type);
        }
        drawParticles(ctx, game.particles);
        for (const b of game.bullets) drawBullet(ctx, b.x, b.y);
        drawTank(ctx, game.player.x, game.player.y);
      }

      if (st === 'cleared') {
        drawCenterBanner(
          ctx,
          'STAGE CLEARED!',
          'NEXT STAGE ' + (stageRef.current + 1)
        );
      } else if (st === 'gameover') {
        drawCenterBanner(ctx, 'GAME OVER', 'SCORE ' + scoreRef.current);
      }

      rafId = requestAnimationFrame(loop);
    };

    /* --- playing 상태 업데이트 (내부 함수) --- */
    function updatePlaying(game, dt) {
      // (a) 입력 → 플레이어 이동
      const inp = inputRef.current;
      let dx = 0;
      if (inp.left) dx -= 1;
      if (inp.right) dx += 1;
      if (inp.touchDir !== 0) dx = inp.touchDir; // 터치가 우선
      game.player.x += dx * PLAYER_SPEED;
      if (game.player.x < 0) game.player.x = 0;
      if (game.player.x > VW - PLAYER_W) game.player.x = VW - PLAYER_W;

      // (b) 자동 발사
      game.fireTimer += dt;
      if (game.fireTimer >= FIRE_INTERVAL) {
        game.fireTimer = 0;
        game.bullets.push({
          x: game.player.x + PLAYER_W / 2 - BULLET_W / 2,
          y: game.player.y - BULLET_H,
        });
      }

      // (c) 총알 업데이트
      for (const b of game.bullets) b.y -= BULLET_SPEED;
      game.bullets = game.bullets.filter((b) => b.y + BULLET_H > 0);

      // (d) 적 이동 (스텝 단위)
      game.enemyStepTimer += dt;
      if (game.enemyStepTimer >= game.enemyStepInterval) {
        game.enemyStepTimer = 0;
        let minX = Infinity, maxX = -Infinity;
        for (const e of game.enemies) {
          if (!e.alive) continue;
          if (e.x < minX) minX = e.x;
          if (e.x + ENEMY_W > maxX) maxX = e.x + ENEMY_W;
        }
        const next = game.enemyDir * ENEMY_STEP_X;
        if (maxX + next > VW || minX + next < 0) {
          // 벽 만나면 방향 전환 + 하강
          game.enemyDir *= -1;
          for (const e of game.enemies) e.y += game.enemyDescent;
        } else {
          for (const e of game.enemies) e.x += next;
        }
        // 남은 적이 적을수록 빨라짐 (긴장감)
        const aliveCount = game.enemies.filter((e) => e.alive).length;
        const total = ENEMY_ROWS * ENEMY_COLS;
        const ratio = aliveCount / total;
        game.enemyStepInterval = Math.max(
          ENEMY_STEP_INTERVAL_MIN,
          game.enemyStepIntervalBase * (0.35 + 0.65 * ratio)
        );
      }

      // (e) 적 애니메이션 프레임 토글
      game.animTimer += dt;
      if (game.animTimer >= ENEMY_ANIM_INTERVAL) {
        game.animTimer = 0;
        game.animFrame = game.animFrame === 0 ? 1 : 0;
      }

      // (f) 총알 ↔ 적 충돌
      for (const b of game.bullets) {
        if (b.dead) continue;
        for (const e of game.enemies) {
          if (!e.alive) continue;
          if (
            b.x < e.x + ENEMY_W &&
            b.x + BULLET_W > e.x &&
            b.y < e.y + ENEMY_H &&
            b.y + BULLET_H > e.y
          ) {
            e.alive = false;
            b.dead = true;
            const pts = 10 * stageRef.current;
            setScore((s) => s + pts);
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: e.x + ENEMY_W / 2,
                y: e.y + ENEMY_H / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 400,
                maxLife: 400,
              });
            }
            break;
          }
        }
      }
      game.bullets = game.bullets.filter((b) => !b.dead);

      // (g) 파티클 업데이트
      for (const p of game.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
      }
      game.particles = game.particles.filter((p) => p.life > 0);

      // (h) 적이 바닥 도달 → 게임 오버
      for (const e of game.enemies) {
        if (!e.alive) continue;
        if (e.y + ENEMY_H >= game.player.y) {
          triggerGameOver();
          return;
        }
      }

      // (i) 전멸 → 스테이지 클리어
      const aliveCount = game.enemies.filter((e) => e.alive).length;
      if (aliveCount === 0) {
        game.clearedTimer = 0;
        setStatus('cleared');
      }
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [canvasRef, initStage, triggerGameOver]);

  return {
    start,
    status,
    stage,
    score,
    hiScore,
    lives,
    isNewHi,
  };
}

/* ============================================================
 * 컴포넌트: DustInvaderGame
 *   - 기존 GameTownLayout의 <canvas> 대신 이 컴포넌트를 넣으면 됨
 *   - 자체적으로 idle/play/gameover UI를 가짐
 * ============================================================ */
export default function DustInvaderGame({ onExit, autoStart }) {
  const canvasRef = useRef(null);
  const { start, status, score, hiScore, stage, lives, isNewHi } =
    useDustInvaderGame({ canvasRef, onExit });
  useEffect(() => { if (autoStart) start(); }, []); // eslint-disable-line

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="block w-full h-full select-none"
        style={{ imageRendering: 'pixelated', touchAction: 'none' }}
      />

      {/* === IDLE 오버레이 === */}
      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70">
          <div
            className="text-neon text-glow text-xl tracking-widest"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            DUST INVADER
          </div>
          <div className="text-neon/70 text-[10px] tracking-wider text-center px-6 leading-relaxed">
            ← → 또는 좌/우 화면 터치<br />
            총알은 자동으로 발사됩니다
          </div>
          <button
            onClick={start}
            className="border-2 border-neon px-6 py-3 text-neon hover:bg-neon hover:text-black transition-colors tracking-widest text-[12px]"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              boxShadow: '0 0 12px rgba(57,255,20,0.5)',
            }}
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

      {/* === GAME OVER 오버레이 (캔버스 위 작은 보조 UI) === */}
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
