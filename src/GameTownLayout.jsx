import React, { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'firebase/auth';
import DustInvaderGame from './DustInvaderGame';
import NeonBrickBreaker from './NeonBrickBreaker';
import ClassicTetris    from './ClassicTetris';
import NeonSnake        from './NeonSnake';
import FlappyMungyi     from './FlappyMungyi';
import GameLobby        from './GameLobby';

/* ── Firebase ─────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ── AdSense 수직 광고 ────────────────────────────── */
function VerticalAd({ side }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', height: '100%' }}
      data-ad-client="ca-pub-8518556382646891"
      data-ad-slot="3083729457"
      data-ad-format="auto"
    />
  );
}

/* ── 메인 레이아웃 ────────────────────────────────── */
export default function GameTownLayout() {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [pendingGame, setPendingGame] = useState(null); // 조작법 안내 중인 게임

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) { setCurrentGame(null); setPendingGame(null); }
    });
    return () => unsub();
  }, []);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      console.error('[Google] 로그인 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const goLobby = () => { setCurrentGame(null); setPendingGame(null); };

  /* 로비 카드 클릭 → 조작법 안내 먼저 */
  const handleSelectGame = (gameId) => {
    setPendingGame(gameId);
    setCurrentGame(null);
  };

  /* 조작법 안내에서 START → 게임 실행 */
  const handleGuideStart = () => {
    setCurrentGame(pendingGame);
    setPendingGame(null);
  };

  return (
    <div className="relative min-h-screen w-full bg-black font-pixel text-neon overflow-hidden">
      <GlobalStyles />
      <div className="pointer-events-none fixed inset-0 z-50 crt-scanlines" />
      <div className="pointer-events-none fixed inset-0 z-50 crt-flicker" />

      {/* 헤더 */}
      <header className="relative z-10 flex items-center justify-between border-b-2 border-neon px-3 py-2 md:px-6">
        <h1 className="text-neon title-glow-pulse text-sm md:text-xl tracking-widest leading-tight"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          무명이<br className="md:hidden"/>게임 타운
        </h1>
        <div className="text-xs md:text-sm text-neon/80">
          {user ? (
            <button onClick={handleLogout}
              className="border border-neon px-2 py-1 hover:bg-neon hover:text-black transition-colors text-[9px] md:text-xs tracking-wider"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              LOGOUT
            </button>
          ) : (
            <span className="blink text-[9px]" style={{ fontFamily: '"Press Start 2P",monospace' }}>
              PRESS START
            </span>
          )}
        </div>
      </header>

      {/* 3단 레이아웃 */}
      <main className="relative z-10 flex w-full" style={{ minHeight: 'calc(100vh - 56px)' }}>

        {/* 좌측 수직 광고 (PC only) */}
        <aside className="hidden md:flex w-[160px] shrink-0 flex-col items-center gap-3 p-3 border-r border-neon/20">
          <VerticalAd side="left" />
        </aside>

        {/* 중앙 게임 영역 9:16 */}
        <section className="flex flex-1 items-center justify-center p-2 md:p-4 pb-[52px] md:pb-4">
          <div className="relative w-full md:w-auto md:h-[calc(100vh-100px)] md:aspect-[9/16]
            aspect-[9/16] max-h-[calc(100vh-76px)] border-2 border-neon bg-black"
            style={{ boxShadow: '0 0 8px rgba(57,255,20,0.6),0 0 24px rgba(57,255,20,0.25),inset 0 0 6px rgba(57,255,20,0.2)' }}>
            <CornerDots />

            {/* 로그인 전 */}
            {!user && <LoginScreen loading={loading} onGoogle={handleGoogle} />}

            {/* 로그인 후 – 로비 */}
            {user && currentGame === null && pendingGame === null &&
              <GameLobby user={user} onSelect={handleSelectGame} />}

            {/* 조작법 안내 오버레이 */}
            {user && pendingGame !== null &&
              <ControlGuide gameId={pendingGame} onStart={handleGuideStart} onBack={goLobby} />}

            {/* 게임 화면 */}
            {user && currentGame === 'dustInvader'  && <DustInvaderGame   autoStart onExit={goLobby} />}
            {user && currentGame === 'brickBreaker' && <NeonBrickBreaker  autoStart onExit={goLobby} />}
            {user && currentGame === 'tetris'        && <ClassicTetris     autoStart onExit={goLobby} />}
            {user && currentGame === 'snake'         && <NeonSnake         autoStart onExit={goLobby} />}
            {user && currentGame === 'flappy'        && <FlappyMungyi      autoStart onExit={goLobby} />}

            {/* 게임 중 로비 복귀 버튼 */}
            {user && currentGame !== null && (
              <button onClick={goLobby}
                className="absolute top-2 left-2 z-20 border border-neon/60 text-neon/70 hover:text-neon hover:border-neon text-[7px] px-2 py-1 bg-black/80 transition-colors tracking-widest"
                style={{ fontFamily: '"Press Start 2P",monospace' }}>
                ◀ LOBBY
              </button>
            )}
          </div>
        </section>

        {/* 우측 수직 광고 (PC only) */}
        <aside className="hidden md:flex w-[160px] shrink-0 flex-col items-center gap-3 p-3 border-l border-neon/20">
          <VerticalAd side="right" />
        </aside>
      </main>

      {/* 모바일 하단 배너 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[50px] border-t-2 border-neon bg-black flex items-center justify-center text-neon text-[9px] tracking-wider"
        style={{ fontFamily: '"Press Start 2P",monospace' }}>
        무명이 게임 타운 · PIXEL ARCADE
      </div>
    </div>
  );
}

/* ── 조작법 안내 오버레이 ──────────────────────────── */
const GUIDE_DATA = {
  dustInvader: {
    title: 'DUST INVADER',
    color: '#39FF14',
    keys: [
      { key: '← →',   desc: '플레이어 이동' },
      { key: 'AUTO',  desc: '자동 발사' },
    ],
    touch: [
      { icon: '👆', desc: '좌/우 드래그로 이동' },
      { icon: '🔫', desc: '총알은 자동으로 발사' },
    ],
    tip: '적이 내려오기 전에 모두 격파하라!',
  },
  brickBreaker: {
    title: 'NEON BRICKS',
    color: '#FF2D55',
    keys: [
      { key: '← →',     desc: '패들 이동' },
      { key: '마우스',  desc: '패들 이동' },
    ],
    touch: [
      { icon: '👆', desc: '드래그로 패들 이동' },
    ],
    tip: '공을 놓치지 말고 모든 벽돌을 부숴라!',
  },
  tetris: {
    title: 'CLASSIC TETRIS',
    color: '#BF5AF2',
    keys: [
      { key: '← →',    desc: '좌/우 이동' },
      { key: '↑ / X',  desc: '블록 회전' },
      { key: '↓',      desc: '빠른 낙하' },
      { key: 'SPACE',  desc: '즉시 낙하' },
    ],
    touch: [
      { icon: '👆', desc: '탭: 회전' },
      { icon: '👉', desc: '좌우 스와이프: 이동' },
      { icon: '👇', desc: '아래 스와이프: 즉시 낙하' },
    ],
    tip: '줄을 가득 채워 한 번에 없애자!',
  },
  snake: {
    title: 'NEON SNAKE',
    color: '#39FF14',
    keys: [
      { key: '← → ↑ ↓', desc: '방향 전환' },
      { key: 'W A S D',  desc: '대체 조작키' },
    ],
    touch: [
      { icon: '👆', desc: '스와이프로 방향 전환' },
    ],
    tip: '자기 몸에 닿으면 게임오버! 벽은 통과 가능.',
  },
  flappy: {
    title: 'FLAPPY 무명이',
    color: '#FFD700',
    keys: [
      { key: 'SPACE', desc: '위로 점프' },
      { key: '↑',    desc: '위로 점프' },
      { key: 'CLICK', desc: '위로 점프' },
    ],
    touch: [
      { icon: '👆', desc: '화면 탭으로 점프' },
    ],
    tip: '파이프 사이를 통과하며 최고 기록에 도전!',
  },
};

function ControlGuide({ gameId, onStart, onBack }) {
  const cfg = GUIDE_DATA[gameId];
  if (!cfg) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black/95 overflow-y-auto">
      {/* 상단 뒤로가기 */}
      <button onClick={onBack}
        className="absolute top-2 left-2 z-20 border border-neon/50 text-neon/60 hover:text-neon hover:border-neon text-[7px] px-2 py-1 bg-black/80 transition-colors tracking-widest"
        style={{ fontFamily: '"Press Start 2P",monospace' }}>
        ◀ LOBBY
      </button>

      {/* 중앙 컨텐츠 */}
      <div className="flex flex-col items-center justify-center flex-1 px-5 py-8 gap-5">

        {/* 게임 타이틀 */}
        <div className="text-center">
          <div className="text-[13px] tracking-widest mb-1 title-glow-pulse"
            style={{ fontFamily: '"Press Start 2P",monospace', color: cfg.color }}>
            {cfg.title}
          </div>
          <div className="h-px w-20 mx-auto mt-2"
            style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
        </div>

        {/* 조작법 카드 */}
        <div className="w-full max-w-[300px] border border-neon/30 bg-black/60"
          style={{ boxShadow: '0 0 12px rgba(57,255,20,0.1)' }}>

          {/* 키보드 섹션 */}
          <div className="border-b border-neon/20 px-4 py-2 flex items-center gap-2">
            <span className="text-[8px] text-neon/50 tracking-widest"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>⌨ KEYBOARD</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2.5">
            {cfg.keys.map((k, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="border border-neon/50 text-neon text-[7px] px-2 py-1 min-w-[58px] text-center shrink-0"
                  style={{ fontFamily: '"Press Start 2P",monospace', boxShadow: '0 0 4px rgba(57,255,20,0.2)', background: 'rgba(57,255,20,0.05)' }}>
                  {k.key}
                </span>
                <span className="text-neon/70 text-[8px]"
                  style={{ fontFamily: '"Press Start 2P",monospace' }}>
                  {k.desc}
                </span>
              </div>
            ))}
          </div>

          {/* 터치 섹션 */}
          <div className="border-t border-neon/20 border-b border-neon/20 px-4 py-2 flex items-center gap-2">
            <span className="text-[8px] text-neon/50 tracking-widest"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>📱 TOUCH</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2.5">
            {cfg.touch.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base w-8 text-center shrink-0">{t.icon}</span>
                <span className="text-neon/70 text-[8px]"
                  style={{ fontFamily: '"Press Start 2P",monospace' }}>
                  {t.desc}
                </span>
              </div>
            ))}
          </div>

          {/* 팁 */}
          <div className="border-t border-neon/20 px-4 py-3">
            <p className="text-neon/40 text-[7px] leading-relaxed text-center"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              💡 {cfg.tip}
            </p>
          </div>
        </div>

        {/* START 버튼 */}
        <button
          onClick={onStart}
          className="border-2 border-neon px-8 py-3 text-neon text-[11px] tracking-widest hover:bg-neon hover:text-black active:scale-95 transition-all"
          style={{ fontFamily: '"Press Start 2P",monospace', boxShadow: '0 0 16px rgba(57,255,20,0.5)', color: cfg.color === '#39FF14' ? undefined : cfg.color, borderColor: cfg.color === '#39FF14' ? undefined : cfg.color }}>
          ▶ START GAME
        </button>

        {/* 픽셀 장식 */}
        <div className="flex gap-2 opacity-30">
          {[...Array(7)].map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 bg-neon inline-block"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>

      </div>
    </div>
  );
}

/* ── 로그인 화면 ──────────────────────────────────── */
function LoginScreen({ loading, onGoogle }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-6 py-10 bg-black">
      {/* 타이틀 영역 */}
      <div className="flex flex-col items-center gap-3 mt-6">
        <div className="text-neon title-glow-pulse text-2xl md:text-3xl tracking-widest text-center leading-loose"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          무명이<br/>게임 타운
        </div>
        <div className="mt-1 h-px w-24 bg-neon" style={{ boxShadow: '0 0 8px #39FF14' }} />
        <p className="mt-2 text-neon/50 text-[9px] tracking-wider text-center"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          PIXEL ARCADE · EST.2026
        </p>
      </div>

      {/* 픽셀 마스코트 */}
      <PixelMascot />

      {/* Google 로그인 버튼 */}
      <div className="w-full max-w-[280px]">
        <p className="text-center text-neon/50 text-[9px] tracking-widest mb-4"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          ▼ SELECT PLAYER ▼
        </p>
        <GoogleButton onClick={onGoogle} disabled={loading} />
        {loading && (
          <p className="text-center text-neon/40 text-[8px] mt-3 blink"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            LOADING...
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ filter: 'drop-shadow(0 0 8px rgba(57,255,20,0.5))' }}
    >
      <span className="absolute inset-0 border-2 border-neon" />
      <span className="absolute inset-[3px] border border-neon opacity-50" />
      <div className="relative flex items-center gap-3 px-4 py-4 m-[6px] bg-white">
        <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span className="text-gray-800 text-[12px] tracking-wider flex-1"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          구글로 시작하기
        </span>
        <span className="text-gray-400 group-hover:text-gray-800 transition-colors ml-auto">▶</span>
      </div>
    </button>
  );
}

/* ── 보조 컴포넌트 ────────────────────────────────── */
function CornerDots() {
  const cls = 'absolute h-2 w-2 bg-neon';
  const s = { boxShadow: '0 0 6px #39FF14' };
  return (
    <>
      <span className={`${cls} top-0 left-0`} style={s}/>
      <span className={`${cls} top-0 right-0`} style={s}/>
      <span className={`${cls} bottom-0 left-0`} style={s}/>
      <span className={`${cls} bottom-0 right-0`} style={s}/>
    </>
  );
}

function PixelMascot() {
  return (
    <svg viewBox="0 0 12 12" className="w-24 h-24"
      style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
      {[
        [3,1],[4,1],[5,1],[6,1],[7,1],[8,1],
        [2,2],[9,2],[2,3],[4,3],[7,3],[9,3],
        [2,4],[9,4],[2,5],[4,5],[5,5],[6,5],[7,5],[9,5],
        [2,6],[9,6],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],
        [4,8],[7,8],[4,9],[5,9],[6,9],[7,9],
      ].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill="#39FF14"/>
      ))}
    </svg>
  );
}

/* ── 전역 스타일 ──────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

      .font-pixel { font-family: 'VT323','Press Start 2P',monospace; }
      .text-neon   { color: #39FF14; }
      .bg-neon     { background-color: #39FF14; }
      .border-neon { border-color: #39FF14; }

      .text-glow {
        text-shadow: 0 0 4px #39FF14, 0 0 10px rgba(57,255,20,0.7), 0 0 22px rgba(57,255,20,0.4);
      }

      .title-glow-pulse {
        text-shadow: 0 0 4px #39FF14, 0 0 10px rgba(57,255,20,0.7);
        animation: titlePulse 2.4s ease-in-out infinite;
      }
      @keyframes titlePulse {
        0%,100% { text-shadow: 0 0 4px #39FF14, 0 0 10px rgba(57,255,20,0.6); }
        50%     { text-shadow: 0 0 8px #39FF14, 0 0 20px #39FF14, 0 0 40px rgba(57,255,20,0.5), 0 0 60px rgba(57,255,20,0.2); }
      }

      .shadow-neon {
        box-shadow: 0 0 8px rgba(57,255,20,0.6), 0 0 24px rgba(57,255,20,0.25), inset 0 0 6px rgba(57,255,20,0.2);
      }
      .crt-scanlines {
        background: repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,0.25) 3px,rgba(0,0,0,0) 4px);
        mix-blend-mode: multiply;
      }
      .crt-flicker { background: rgba(57,255,20,0.02); animation: flicker 3s infinite; }
      @keyframes flicker {
        0%,100%{opacity:.6} 45%{opacity:.3} 50%{opacity:.8} 55%{opacity:.4}
      }
      .blink { animation: blink 1.1s steps(2,start) infinite; }
      @keyframes blink { to { visibility: hidden; } }
    `}</style>
  );
}
