import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSyncedRef } from './utils/useSyncedRef';
import { VW, VH } from './constants';
import { saveLeaderboardScore } from './utils/saveScore';
import { useAutoSave } from './utils/useAutoSave';
import KakaoShareButton from './components/KakaoShareButton';

/* ── 상수 ─────────────────────────────────────────── */
const GROUND_Y    = VH - 90;
const CHAR_X      = 72;
const CHAR_W      = 36;
const CHAR_H      = 48;
const GRAVITY     = 0.55;
const JUMP_VY     = -13.5;
const JUMP2_VY    = -11.0;
const SPEED_BASE  = 3.2;
const SPEED_INC   = 0.00018;   // 프레임당 속도 증가
const SPEED_MAX   = 9.5;
const OBSTACLE_MIN_GAP = 220;  // 장애물 최소 간격 (px)

/* 팔레트 */
const C = {
  sky1:   '#0a0015',
  sky2:   '#1a0035',
  moon:   '#e8d5ff',
  star:   'rgba(255,255,255,0.8)',
  mtn1:   '#2a1a4a',
  mtn2:   '#3d2a60',
  city:   '#1e1035',
  glow:   '#a855f7',
  ground: '#4c1d95',
  gnd2:   '#6d28d9',
  gnd3:   '#7c3aed',
  track:  '#8b5cf6',
  char:   '#f0abfc',
  charD:  '#c026d3',
  charS:  '#fde68a',
  shadow: 'rgba(168,85,247,0.25)',
  obs1:   '#dc2626',
  obs2:   '#ef4444',
  coin:   '#fbbf24',
  coinG:  '#f59e0b',
  hud:    '#e879f9',
  hudDim: 'rgba(232,121,249,0.45)',
  white:  '#ffffff',
  particle:'#c084fc',
};

/* ── 별 위치 (고정) ────────────────────────────────── */
const STARS = Array.from({ length: 55 }, (_, i) => ({
  x: (i * 137.5 + 17) % VW,
  y: ((i * 93.7 + 5) % (GROUND_Y - 80)),
  r: i % 4 === 0 ? 1.5 : 1,
  a: 0.4 + (i % 3) * 0.2,
}));

/* ── 원근 산 레이어 ─────────────────────────────────── */
const MTN_PEAKS_FAR  = [40,90,60,120,30,80,100,50,75,110,25,95,65,85,45,70,55,115,35,105];
const MTN_PEAKS_MID  = [50,110,70,130,40,90,115,60,85,125,35,100,75,95,55,80,65,120,45,115];

/* ── 배경 드로잉 ───────────────────────────────────── */
function drawBackground(ctx, bgOffset) {
  // 하늘 그라데이션
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, C.sky1);
  sky.addColorStop(1, C.sky2);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VW, VH);

  // 달
  ctx.save();
  ctx.shadowColor = C.moon;
  ctx.shadowBlur = 20;
  ctx.fillStyle = C.moon;
  ctx.beginPath();
  ctx.arc(VW - 55, 52, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.sky1;
  ctx.beginPath();
  ctx.arc(VW - 47, 46, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 별
  for (const s of STARS) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = C.star;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // 먼 산 (느린 시차)
  const fo = (bgOffset * 0.12) % VW;
  drawMountains(ctx, MTN_PEAKS_FAR, fo, GROUND_Y - 60, 70, C.mtn1, 0.6);
  drawMountains(ctx, MTN_PEAKS_FAR, fo - VW, GROUND_Y - 60, 70, C.mtn1, 0.6);

  // 가까운 산 (빠른 시차)
  const mo = (bgOffset * 0.28) % VW;
  drawMountains(ctx, MTN_PEAKS_MID, mo, GROUND_Y - 30, 90, C.mtn2, 0.85);
  drawMountains(ctx, MTN_PEAKS_MID, mo - VW, GROUND_Y - 30, 90, C.mtn2, 0.85);
}

function drawMountains(ctx, peaks, offsetX, baseY, maxH, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const segW = VW / (peaks.length / 2);
  ctx.moveTo(offsetX, baseY);
  for (let i = 0; i < peaks.length; i++) {
    const px = offsetX + i * segW;
    ctx.lineTo(px, baseY - peaks[i]);
    ctx.lineTo(px + segW / 2, baseY - (peaks[i] + (peaks[(i + 1) % peaks.length])) / 2);
  }
  ctx.lineTo(offsetX + peaks.length * segW, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawGround(ctx, offset) {
  // 지면 상단 글로우
  const glow = ctx.createLinearGradient(0, GROUND_Y - 4, 0, GROUND_Y + 8);
  glow.addColorStop(0, 'rgba(139,92,246,0.9)');
  glow.addColorStop(1, 'rgba(109,40,217,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, GROUND_Y - 4, VW, 12);

  // 지면 본체
  const gnd = ctx.createLinearGradient(0, GROUND_Y, 0, VH);
  gnd.addColorStop(0, C.gnd2);
  gnd.addColorStop(0.3, C.ground);
  gnd.addColorStop(1, '#1e0a33');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, GROUND_Y, VW, VH - GROUND_Y);

  // 격자 레인 마킹
  ctx.strokeStyle = 'rgba(139,92,246,0.3)';
  ctx.lineWidth = 1;
  const laneW = 40;
  const off = ((offset * 1.0) % laneW);
  for (let x = -laneW + off; x < VW + laneW; x += laneW) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 18, VH);
    ctx.stroke();
  }

  // 지면 상단 네온 라인
  ctx.save();
  ctx.shadowColor = C.glow;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = C.track;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(VW, GROUND_Y);
  ctx.stroke();
  ctx.restore();
}

/* ── 캐릭터 드로잉 ──────────────────────────────────── */
function drawCharacter(ctx, y, frame, onGround) {
  const x = CHAR_X;
  const cy = y;

  // 그림자
  if (onGround) {
    const sh = ctx.createRadialGradient(x + CHAR_W / 2, GROUND_Y + 4, 2, x + CHAR_W / 2, GROUND_Y + 4, 22);
    sh.addColorStop(0, 'rgba(168,85,247,0.4)');
    sh.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(x + CHAR_W / 2, GROUND_Y + 4, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x + CHAR_W / 2, cy + CHAR_H / 2);

  // 달리기 애니메이션: 다리
  const legPhase = frame * 0.18;
  const L1 = Math.sin(legPhase) * 10;
  const L2 = Math.sin(legPhase + Math.PI) * 10;

  // 다리
  ctx.fillStyle = C.charD;
  ctx.fillRect(-10, 12, 8, 14 + (onGround ? Math.max(0, L1) : 0));
  ctx.fillRect(2, 12, 8, 14 + (onGround ? Math.max(0, L2) : 0));

  // 신발
  ctx.fillStyle = C.charS;
  ctx.fillRect(-13, 22 + (onGround ? Math.max(0, L1) : 0), 11, 5);
  ctx.fillRect(-1, 22 + (onGround ? Math.max(0, L2) : 0), 11, 5);

  // 팔 흔들기
  const armPhase = frame * 0.18;
  const A1 = Math.sin(armPhase) * 9;
  const A2 = Math.sin(armPhase + Math.PI) * 9;
  ctx.fillStyle = C.char;
  ctx.fillRect(-16, -8 + A1, 7, 14);
  ctx.fillRect(9, -8 + A2, 7, 14);

  // 몸통
  const bodyG = ctx.createLinearGradient(-12, -12, 12, 12);
  bodyG.addColorStop(0, '#e879f9');
  bodyG.addColorStop(1, C.charD);
  ctx.fillStyle = bodyG;
  ctx.fillRect(-12, -14, 24, 26);

  // 빛 반사
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-10, -12, 8, 10);

  // 머리
  ctx.fillStyle = C.char;
  ctx.fillRect(-10, -28, 20, 18);

  // 헬멧/모자
  ctx.fillStyle = C.charD;
  ctx.fillRect(-11, -30, 22, 6);
  ctx.fillRect(-7, -34, 14, 6);

  // 눈
  ctx.fillStyle = '#fff';
  ctx.fillRect(-7, -24, 5, 5);
  ctx.fillRect(2, -24, 5, 5);
  ctx.fillStyle = '#1a0035';
  ctx.fillRect(-6, -23, 3, 3);
  ctx.fillRect(3, -23, 3, 3);
  // 눈동자 하이라이트
  ctx.fillStyle = '#fff';
  ctx.fillRect(-5, -23, 1, 1);
  ctx.fillRect(4, -23, 1, 1);

  // 네온 아우라 (점프 중)
  if (!onGround) {
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = C.glow;
    ctx.lineWidth = 3;
    ctx.shadowColor = C.glow;
    ctx.shadowBlur = 12;
    ctx.strokeRect(-14, -30, 28, 60);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/* ── 장애물 드로잉 ──────────────────────────────────── */
function drawObstacle(ctx, obs) {
  const { x, type } = obs;
  ctx.save();

  if (type === 0) {
    // 삼각형 스파이크 군집
    const n = obs.count || 2;
    for (let i = 0; i < n; i++) {
      const bx = x + i * 22;
      const bh = obs.h || 38;
      ctx.shadowColor = C.obs2;
      ctx.shadowBlur = 8;
      const g = ctx.createLinearGradient(bx + 11, GROUND_Y - bh, bx + 11, GROUND_Y);
      g.addColorStop(0, C.obs1);
      g.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx, GROUND_Y);
      ctx.lineTo(bx + 11, GROUND_Y - bh);
      ctx.lineTo(bx + 22, GROUND_Y);
      ctx.closePath();
      ctx.fill();
      // 하이라이트
      ctx.fillStyle = 'rgba(255,150,150,0.3)';
      ctx.beginPath();
      ctx.moveTo(bx + 5, GROUND_Y - 5);
      ctx.lineTo(bx + 11, GROUND_Y - bh);
      ctx.lineTo(bx + 14, GROUND_Y - bh / 2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (type === 1) {
    // 허들 (가로 바)
    const bh = obs.h || 30;
    const bw = obs.w || 16;
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#c2410c';
    ctx.fillRect(x, GROUND_Y - bh, bw, bh);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(x, GROUND_Y - bh, bw, 5);
    ctx.fillRect(x, GROUND_Y - bh / 2 - 2, bw, 5);
    ctx.fillStyle = 'rgba(255,200,100,0.2)';
    ctx.fillRect(x + 2, GROUND_Y - bh, 4, bh);
  } else {
    // 블록 장애물
    const bh = obs.h || 42;
    const bw = obs.w || 30;
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 10;
    const g2 = ctx.createLinearGradient(x, GROUND_Y - bh, x, GROUND_Y);
    g2.addColorStop(0, '#5b21b6');
    g2.addColorStop(1, '#2e1065');
    ctx.fillStyle = g2;
    ctx.fillRect(x, GROUND_Y - bh, bw, bh);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, GROUND_Y - bh, bw, bh);
    ctx.fillStyle = 'rgba(167,139,250,0.15)';
    ctx.fillRect(x + 3, GROUND_Y - bh + 3, 8, 8);
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

/* ── 코인 드로잉 ──────────────────────────────────────  */
function drawCoin(ctx, coin, tick) {
  const bobY = Math.sin(tick * 0.06 + coin.phase) * 5;
  ctx.save();
  ctx.shadowColor = C.coin;
  ctx.shadowBlur = 12;
  ctx.fillStyle = C.coin;
  ctx.beginPath();
  ctx.arc(coin.x + 10, coin.y + bobY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.coinG;
  ctx.beginPath();
  ctx.arc(coin.x + 10, coin.y + bobY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('$', coin.x + 10, coin.y + bobY + 3);
  ctx.restore();
}

/* ── HUD ──────────────────────────────────────────── */
function drawHUD(ctx, score, coins, speed, hiScore) {
  // 점수
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = '18px "Press Start 2P",monospace';
  ctx.fillStyle = C.hudDim;
  ctx.fillText(score, VW - 12 + 2, 38 + 2);
  ctx.fillStyle = C.hud;
  ctx.shadowColor = C.hud;
  ctx.shadowBlur = 8;
  ctx.fillText(score, VW - 12, 38);
  ctx.shadowBlur = 0;

  // 최고 기록
  ctx.font = '8px "Press Start 2P",monospace';
  ctx.fillStyle = 'rgba(232,121,249,0.45)';
  ctx.fillText('BEST ' + hiScore, VW - 12, 54);

  // 코인 카운터
  ctx.textAlign = 'left';
  ctx.font = '11px "Press Start 2P",monospace';
  ctx.fillStyle = C.coin;
  ctx.shadowColor = C.coin;
  ctx.shadowBlur = 6;
  ctx.fillText('🪙 ' + coins, 12, 38);
  ctx.shadowBlur = 0;

  // 속도 바
  const spd = Math.min((speed - SPEED_BASE) / (SPEED_MAX - SPEED_BASE), 1);
  ctx.fillStyle = 'rgba(168,85,247,0.15)';
  ctx.fillRect(12, 48, 80, 6);
  const spdG = ctx.createLinearGradient(12, 0, 92, 0);
  spdG.addColorStop(0, '#a855f7');
  spdG.addColorStop(1, '#f0abfc');
  ctx.fillStyle = spdG;
  ctx.fillRect(12, 48, 80 * spd, 6);
  ctx.strokeStyle = 'rgba(168,85,247,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 48, 80, 6);
  ctx.font = '6px "Press Start 2P",monospace';
  ctx.fillStyle = 'rgba(232,121,249,0.6)';
  ctx.fillText('SPD', 12, 64);

  ctx.restore();
}

/* ── 파티클 ────────────────────────────────────────── */
function spawnParticles(particles, x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 2,
      life: 1,
      decay: 0.04 + Math.random() * 0.03,
      color: [C.glow, C.coin, '#f0abfc', '#818cf8'][i % 4],
    });
  }
}

function updateDrawParticles(ctx, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x | 0, p.y | 0, 3, 3);
  }
  ctx.globalAlpha = 1;
}

/* ── 충돌 검사 ─────────────────────────────────────── */
function collidesObstacle(charY, obs) {
  const cx1 = CHAR_X + 6,  cx2 = CHAR_X + CHAR_W - 6;
  const cy1 = charY + 4,   cy2 = charY + CHAR_H;
  let ox1, ox2, oy1 = GROUND_Y - (obs.h || 38), oy2 = GROUND_Y;

  if (obs.type === 0) {
    const totalW = (obs.count || 2) * 22;
    ox1 = obs.x + 3; ox2 = obs.x + totalW - 3;
    return cx2 > ox1 && cx1 < ox2 && cy2 > oy1 + 6 && cy1 < oy2;
  } else {
    ox1 = obs.x + 2; ox2 = obs.x + (obs.w || 16) - 2;
    return cx2 > ox1 && cx1 < ox2 && cy2 > oy1 && cy1 < oy2;
  }
}

function collectsCoin(charY, coin) {
  const cx = CHAR_X + CHAR_W / 2, cy = charY + CHAR_H / 2;
  const dx = cx - (coin.x + 10), dy = cy - (coin.y - 20);
  return Math.sqrt(dx * dx + dy * dy) < 22;
}

/* ── 랜덤 장애물 생성 ─────────────────────────────── */
let obsId = 0;
function makeObstacle(x) {
  const r = Math.random();
  if (r < 0.42) {
    return { id: obsId++, x, type: 0, count: Math.random() < 0.5 ? 2 : 3, h: 32 + Math.random() * 16 };
  } else if (r < 0.72) {
    return { id: obsId++, x, type: 1, w: 14 + Math.random() * 4, h: 28 + Math.random() * 18 };
  } else {
    return { id: obsId++, x, type: 2, w: 28 + Math.random() * 16, h: 36 + Math.random() * 20 };
  }
}

function makeCoin(x) {
  return { id: obsId++, x, y: GROUND_Y - 80 - Math.random() * 40, phase: Math.random() * Math.PI * 2 };
}

/* ── 게임 훅 ──────────────────────────────────────── */
export function useRunnerGame({ canvasRef, onExit }) {
  const [score, setScore]     = useState(0);
  const [hiScore, setHiScore] = useState(0);
  const [status, setStatus]   = useState('idle');
  const [isNewHi, setIsNewHi] = useState(false);
  const [coinCount, setCoinCount] = useState(0);

  const gRef      = useRef(null);
  const scoreRef  = useSyncedRef(score);
  const hiRef     = useSyncedRef(hiScore);
  const statusRef = useSyncedRef(status);
  const timerRef  = useRef(null);

  useAutoSave('runner', scoreRef, statusRef);

  useEffect(() => {
    const v = parseInt(localStorage.getItem('runner_hi') || '0', 10);
    setHiScore(v);
  }, []);

  const doJump = useCallback(() => {
    const g = gRef.current; if (!g) return;
    if (statusRef.current !== 'playing') return;
    if (g.onGround) {
      g.vy = JUMP_VY;
      g.onGround = false;
      g.canDouble = true;
      spawnParticles(g.particles, CHAR_X + CHAR_W / 2, GROUND_Y, 5);
    } else if (g.canDouble) {
      g.vy = JUMP2_VY;
      g.canDouble = false;
      spawnParticles(g.particles, CHAR_X + CHAR_W / 2, g.charY, 10);
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    gRef.current = {
      charY: GROUND_Y - CHAR_H,
      vy: 0,
      onGround: true,
      canDouble: false,
      speed: SPEED_BASE,
      bgOffset: 0,
      obstacles: [],
      coins: [],
      particles: [],
      frame: 0,
      distAcc: 0,
      nextObsX: VW + 80,
      nextCoinX: VW + 200,
      coinCount: 0,
    };
    setScore(0); setCoinCount(0); setIsNewHi(false);
    setStatus('playing');
  }, []);

  const triggerGameOver = useCallback(async () => {
    const final = scoreRef.current;
    setStatus('gameover');
    const isNew = await saveLeaderboardScore('runner', final);
    if (isNew || final > hiRef.current) {
      const best = Math.max(final, hiRef.current);
      setHiScore(best); setIsNewHi(true);
      localStorage.setItem('runner_hi', String(best));
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStatus('idle');
      onExit?.(final);
    }, 2200);
  }, [onExit]);

  // 키보드
  useEffect(() => {
    const kd = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault(); doJump();
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [doJump]);

  // 터치/클릭
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const onClick = () => doJump();
    const onTouch = (e) => { e.preventDefault(); doJump(); };
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouch);
    };
  }, [canvasRef, doJump]);

  // DPR 설정
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = VW * dpr; canvas.height = VH * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let cancelled = false, last = performance.now(), raf = 0;

    const loop = (now) => {
      if (cancelled) return;
      const dt = Math.min(50, now - last); last = now;
      const st = statusRef.current;
      const g = gRef.current;

      if (st === 'playing' && g) {
        g.frame++;
        g.speed = Math.min(SPEED_MAX, SPEED_BASE + g.frame * SPEED_INC * (dt / 16));

        // 물리
        g.vy += GRAVITY * (dt / 16);
        g.charY += g.vy * (dt / 16);
        if (g.charY >= GROUND_Y - CHAR_H) {
          g.charY = GROUND_Y - CHAR_H;
          if (!g.onGround) spawnParticles(g.particles, CHAR_X + CHAR_W / 2, GROUND_Y, 4);
          g.onGround = true; g.vy = 0;
        } else {
          g.onGround = false;
        }

        // 배경 스크롤
        g.bgOffset += g.speed * (dt / 16);

        // 장애물 생성
        if (g.nextObsX <= VW + 20) {
          g.obstacles.push(makeObstacle(VW + 30));
          const gapScale = Math.max(0.6, 1 - (g.speed - SPEED_BASE) / (SPEED_MAX - SPEED_BASE) * 0.35);
          g.nextObsX = OBSTACLE_MIN_GAP * gapScale + Math.random() * 140;
        }
        g.nextObsX -= g.speed * (dt / 16);

        // 코인 생성
        if (g.nextCoinX <= VW + 20) {
          g.coins.push(makeCoin(VW + 30));
          g.nextCoinX = 180 + Math.random() * 160;
        }
        g.nextCoinX -= g.speed * (dt / 16);

        // 장애물/코인 이동
        for (const o of g.obstacles) o.x -= g.speed * (dt / 16);
        for (const c of g.coins) c.x -= g.speed * (dt / 16);
        g.obstacles = g.obstacles.filter(o => o.x + 80 > 0);
        g.coins = g.coins.filter(c => c.x + 20 > 0);

        // 충돌 - 장애물
        for (const o of g.obstacles) {
          if (collidesObstacle(g.charY, o)) { triggerGameOver(); break; }
        }

        // 코인 수집
        for (let i = g.coins.length - 1; i >= 0; i--) {
          if (collectsCoin(g.charY, g.coins[i])) {
            spawnParticles(g.particles, g.coins[i].x + 10, g.coins[i].y, 6);
            g.coins.splice(i, 1);
            g.coinCount = (g.coinCount || 0) + 1;
            setCoinCount(g.coinCount);
          }
        }

        // 점수 (속도 기반 거리)
        g.distAcc += g.speed * (dt / 16) * 0.04;
        if (g.distAcc >= 1) {
          const inc = Math.floor(g.distAcc);
          g.distAcc -= inc;
          setScore(s => s + inc);
        }
      }

      // 드로잉
      drawBackground(ctx, g ? g.bgOffset : 0);
      drawGround(ctx, g ? g.bgOffset : 0);

      if (g) {
        for (const o of g.obstacles) drawObstacle(ctx, o);
        for (const c of g.coins) drawCoin(ctx, c, g.frame);
        drawCharacter(ctx, g.charY, g.frame, g.onGround);
        updateDrawParticles(ctx, g.particles);
        drawHUD(ctx, scoreRef.current, g.coinCount || 0, g.speed, hiRef.current);
      }

      if (st === 'gameover' && g) {
        // 반투명 오버레이
        ctx.fillStyle = 'rgba(10,0,21,0.7)';
        ctx.fillRect(0, 0, VW, VH);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '18px "Press Start 2P",monospace';
        ctx.fillStyle = '#f0abfc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 16;
        ctx.fillText('GAME OVER', VW / 2, VH / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.font = '10px "Press Start 2P",monospace';
        ctx.fillStyle = 'rgba(232,121,249,0.7)';
        ctx.fillText('SCORE  ' + scoreRef.current, VW / 2, VH / 2 + 10);
        ctx.restore();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
  }, [canvasRef, triggerGameOver, coinCount]);

  return { start, doJump, status, score, hiScore, isNewHi, coinCount };
}

/* ── 컴포넌트 ─────────────────────────────────────── */
export default function RunnerGame({ onExit, autoStart }) {
  const canvasRef = useRef(null);
  const { start, doJump, status, score, hiScore, isNewHi, coinCount } =
    useRunnerGame({ canvasRef, onExit });

  useEffect(() => { if (autoStart) start(); }, []); // eslint-disable-line

  return (
    <div className="absolute inset-0" style={{ background: '#0a0015' }}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full select-none"
        style={{ imageRendering: 'pixelated', touchAction: 'none', cursor: 'pointer' }}
      />

      {/* idle 화면 */}
      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6"
          style={{ background: 'rgba(10,0,21,0.88)' }}>
          {/* 픽셀 러너 미리보기 */}
          <svg width="80" height="80" viewBox="0 0 40 50" style={{ imageRendering: 'pixelated' }}>
            <rect x="12" y="2" width="16" height="14" fill="#f0abfc"/>
            <rect x="11" y="0" width="18" height="5" fill="#c026d3"/>
            <rect x="14" y="-3" width="12" height="5" fill="#c026d3"/>
            <rect x="8" y="16" width="24" height="18" fill="#e879f9"/>
            <rect x="3" y="16" width="7" height="12" fill="#f0abfc"/>
            <rect x="30" y="16" width="7" height="12" fill="#f0abfc"/>
            <rect x="13" y="34" width="7" height="12" fill="#c026d3"/>
            <rect x="20" y="34" width="7" height="12" fill="#c026d3"/>
            <rect x="9" y="44" width="12" height="5" fill="#fde68a"/>
            <rect x="21" y="44" width="12" height="5" fill="#fde68a"/>
          </svg>

          <div style={{ fontFamily: '"Press Start 2P",monospace', color: '#e879f9', fontSize: 16, textAlign: 'center',
            textShadow: '0 0 12px #a855f7, 0 0 24px rgba(168,85,247,0.5)', letterSpacing: 2 }}>
            ENDLESS<br/>
            <span style={{ color: '#f0abfc', fontSize: 14 }}>RUNNER</span>
          </div>

          <div style={{ fontFamily: '"Press Start 2P",monospace', color: 'rgba(232,121,249,0.6)',
            fontSize: 8, textAlign: 'center', lineHeight: 2.2 }}>
            TAP / SPACE: 점프<br/>
            두 번 탭: 이중 점프<br/>
            🪙 코인을 모아라!
          </div>

          <div style={{ fontFamily: '"Press Start 2P",monospace', color: 'rgba(232,121,249,0.4)',
            fontSize: 7, textAlign: 'center' }}>
            속도가 점점 빨라집니다
          </div>

          <button
            onClick={start}
            style={{
              fontFamily: '"Press Start 2P",monospace',
              fontSize: 13,
              color: '#0a0015',
              background: 'linear-gradient(135deg, #a855f7, #e879f9)',
              border: 'none',
              padding: '14px 36px',
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(168,85,247,0.8), 0 4px 0 #6d28d9',
              letterSpacing: 2,
              transform: 'skewX(-4deg)',
            }}>
            ▶ START
          </button>

          <div style={{ fontFamily: '"Press Start 2P",monospace', color: 'rgba(232,121,249,0.4)', fontSize: 8 }}>
            BEST&nbsp;&nbsp;{String(hiScore).padStart(5, '0')}
          </div>
        </div>
      )}

      {/* 게임오버 오버레이 */}
      {status === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-3">
            {isNewHi && (
              <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#fbbf24',
                textShadow: '0 0 10px #f59e0b', animation: 'blink 1s steps(2,start) infinite' }}>
                ★ NEW RECORD ★
              </div>
            )}
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: 'rgba(232,121,249,0.6)' }}>
              🪙 {coinCount} COINS
            </div>
            <div className="flex gap-2">
              <button
                onClick={start}
                style={{
                  fontFamily: '"Press Start 2P",monospace',
                  fontSize: 11,
                  color: '#0a0015',
                  background: 'linear-gradient(135deg, #a855f7, #e879f9)',
                  border: 'none',
                  padding: '12px 22px',
                  cursor: 'pointer',
                  boxShadow: '0 0 18px rgba(168,85,247,0.7)',
                  letterSpacing: 1,
                }}>
                🔄 RETRY
              </button>
              <KakaoShareButton gameId="runner" score={score} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
