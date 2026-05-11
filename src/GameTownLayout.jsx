import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import DustInvaderGame from './DustInvaderGame';
import NeonBrickBreaker from './NeonBrickBreaker';
import GameLobby from './GameLobby';

/* ============================================================
 * Firebase 초기화
 *   - .env 또는 별도 config 파일로 분리 권장
 *   - VITE_xxx / NEXT_PUBLIC_xxx 등 프레임워크에 맞게 변경
 * ============================================================ */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ============================================================
 * 메인 레이아웃 컴포넌트
 * ============================================================ */
export default function GameTownLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentGame, setCurrentGame] = useState(null); // null=로비 | 'dustInvader' | 'brickBreaker'

  /* Firebase 로그인 상태 구독 */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setCurrentGame(null); // 로그아웃 시 로비로
    });
    return () => unsub();
  }, []);

  /* ============================================================
   * 로그인 핸들러
   * ============================================================ */

  /* Google: Firebase 네이티브 지원 */
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('[Google] 로그인 성공:', result.user);
    } catch (e) {
      console.error('[Google] 로그인 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  /* Kakao: Firebase 미지원 → Kakao SDK + Custom Token 방식
   *   1) Kakao JS SDK로 로그인 → access_token 획득
   *   2) 백엔드(Cloud Functions)에 access_token 전송
   *   3) 서버에서 카카오 API로 사용자 검증 후 Firebase Custom Token 발급
   *   4) 클라에서 signInWithCustomToken으로 Firebase 로그인
   */
  const handleKakao = async () => {
    setLoading(true);
    try {
      const kakaoAuth = await new Promise((resolve, reject) => {
        if (!window.Kakao || !window.Kakao.Auth) {
          return reject(new Error('Kakao SDK not loaded'));
        }
        window.Kakao.Auth.login({
          success: resolve,
          fail: reject,
        });
      });

      const res = await fetch('/api/auth/kakao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: kakaoAuth.access_token }),
      });
      const { firebaseToken } = await res.json();

      const result = await signInWithCustomToken(auth, firebaseToken);
      console.log('[Kakao] 로그인 성공:', result.user);
    } catch (e) {
      console.error('[Kakao] 로그인 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  /* Naver: Firebase 미지원 → Naver SDK + Custom Token 방식 */
  const handleNaver = async () => {
    setLoading(true);
    try {
      const naverAccessToken = await getNaverAccessTokenViaSDK();

      const res = await fetch('/api/auth/naver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: naverAccessToken }),
      });
      const { firebaseToken } = await res.json();

      const result = await signInWithCustomToken(auth, firebaseToken);
      console.log('[Naver] 로그인 성공:', result.user);
    } catch (e) {
      console.error('[Naver] 로그인 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  /* ============================================================
   * 렌더
   * ============================================================ */
  return (
    <div className="relative min-h-screen w-full bg-black font-pixel text-neon overflow-hidden">
      {/* 폰트 & 전역 스타일 주입 */}
      <GlobalStyles />

      {/* CRT 스캔라인 오버레이 */}
      <div className="pointer-events-none fixed inset-0 z-50 crt-scanlines" />
      <div className="pointer-events-none fixed inset-0 z-50 crt-flicker" />

      {/* 상단 헤더 */}
      <header className="relative z-10 flex items-center justify-between border-b-2 border-neon px-4 py-3 md:px-6">
        <h1 className="text-neon text-glow text-lg md:text-2xl tracking-widest">
          ▮ 무료게임타운 ▮
        </h1>
        <div className="text-xs md:text-sm text-neon/80">
          {user ? (
            <button
              onClick={handleLogout}
              className="border border-neon px-3 py-1 hover:bg-neon hover:text-black transition-colors"
            >
              LOGOUT [{user.displayName ?? 'PLAYER'}]
            </button>
          ) : (
            <span className="blink">PRESS START</span>
          )}
        </div>
      </header>

      {/* 본문 3단 레이아웃 */}
      <main className="relative z-10 flex w-full" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* 좌측 광고 (PC only) */}
        <AdSidebar side="left" />

        {/* 중앙 게임 영역 (9:16 비율 유지) */}
        <section className="flex flex-1 items-center justify-center p-2 md:p-4 pb-[60px] md:pb-4">
          <div
            className="
              relative w-full
              md:w-auto md:h-[calc(100vh-100px)]
              md:aspect-[9/16]
              aspect-[9/16]
              max-h-[calc(100vh-80px)]
              border-2 border-neon
              shadow-neon
              bg-black
            "
          >
            {/* 모서리 픽셀 장식 */}
            <CornerDots />

            {/* 로그인 전 */}
            {!user && (
              <LobbyScreen
                loading={loading}
                onKakao={handleKakao}
                onGoogle={handleGoogle}
                onNaver={handleNaver}
              />
            )}

            {/* 로그인 후 – 게임 선택 로비 */}
            {user && currentGame === null && (
              <GameLobby user={user} onSelect={setCurrentGame} />
            )}

            {/* 로그인 후 – 인베이더 게임 */}
            {user && currentGame === 'dustInvader' && (
              <DustInvaderGame onExit={() => setCurrentGame(null)} />
            )}

            {/* 로그인 후 – 벽돌깨기 게임 */}
            {user && currentGame === 'brickBreaker' && (
              <NeonBrickBreaker onExit={() => setCurrentGame(null)} />
            )}

            {/* 게임 중 – 로비로 돌아가기 버튼 */}
            {user && currentGame !== null && (
              <button
                onClick={() => setCurrentGame(null)}
                className="absolute top-2 left-2 z-20 border border-neon/60 text-neon/70 hover:text-neon hover:border-neon text-[7px] px-2 py-1 bg-black/80 transition-colors tracking-widest"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                ◀ LOBBY
              </button>
            )}
          </div>
        </section>

        {/* 우측 광고 (PC only) */}
        <AdSidebar side="right" />
      </main>

      {/* 모바일 하단 배너 광고 (50px 고정) */}
      <div
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-40
          h-[50px] border-t-2 border-neon
          bg-black flex items-center justify-center
          text-neon text-[10px] tracking-wider
        "
      >
        [ AD · 320×50 · 모바일 배너 영역 ]
      </div>
    </div>
  );
}

/* ============================================================
 * 로비 화면 (로그인 전)
 * ============================================================ */
function LobbyScreen({ loading, onKakao, onGoogle, onNaver }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-6 py-10">
      {/* 타이틀 */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="text-neon text-glow text-2xl md:text-3xl tracking-widest">
          GAME
        </div>
        <div className="text-neon text-glow text-2xl md:text-3xl tracking-widest">
          TOWN
        </div>
        <div className="mt-2 h-[2px] w-24 bg-neon shadow-neon" />
        <p className="mt-3 text-neon/70 text-xs tracking-wider text-center">
          PIXEL ARCADE · EST.2026
        </p>
      </div>

      {/* 가운데 픽셀 캐릭터 */}
      <PixelMascot />

      {/* 로그인 버튼들 */}
      <div className="w-full max-w-[280px] flex flex-col gap-3">
        <p className="text-center text-neon/70 text-[10px] tracking-widest mb-1">
          ▼ SELECT PLAYER ▼
        </p>

        <SocialButton
          label="카카오로 시작"
          onClick={onKakao}
          disabled={loading}
          bg="#FEE500"
          fg="#191600"
          accent="#39FF14"
          icon="K"
        />
        <SocialButton
          label="구글로 시작"
          onClick={onGoogle}
          disabled={loading}
          bg="#FFFFFF"
          fg="#111111"
          accent="#39FF14"
          icon="G"
        />
        <SocialButton
          label="네이버로 시작"
          onClick={onNaver}
          disabled={loading}
          bg="#03C75A"
          fg="#FFFFFF"
          accent="#39FF14"
          icon="N"
        />
      </div>
    </div>
  );
}

/* ============================================================
 * 소셜 로그인 버튼
 * ============================================================ */
function SocialButton({ label, onClick, disabled, bg, fg, accent, icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        group relative w-full
        transition-transform duration-100
        hover:-translate-y-0.5 active:translate-y-0.5
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      style={{ filter: `drop-shadow(0 0 6px ${accent}88)` }}
    >
      {/* 외곽 네온 보더 (도트 느낌의 더블 라인) */}
      <span
        className="absolute inset-0 border-2"
        style={{ borderColor: accent }}
      />
      <span
        className="absolute inset-[3px] border"
        style={{ borderColor: accent, opacity: 0.5 }}
      />

      {/* 본체 */}
      <div
        className="relative flex items-center gap-3 px-4 py-3 m-[6px]"
        style={{ backgroundColor: bg, color: fg }}
      >
        <span
          className="flex h-7 w-7 items-center justify-center text-sm font-bold"
          style={{
            border: `2px solid ${fg}`,
            fontFamily: '"Press Start 2P", monospace',
          }}
        >
          {icon}
        </span>
        <span
          className="text-[12px] tracking-wider"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {label}
        </span>
        <span className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity">
          ▶
        </span>
      </div>
    </button>
  );
}

/* ============================================================
 * 사이드 광고
 * ============================================================ */
function AdSidebar({ side }) {
  return (
    <aside
      className={`hidden md:flex w-[160px] shrink-0 flex-col items-center gap-4 p-3 ${
        side === 'left' ? 'border-r border-neon/30' : 'border-l border-neon/30'
      }`}
    >
      <AdSlot label="160 × 600" />
      <AdSlot label="160 × 300" small />
    </aside>
  );
}

function AdSlot({ label, small = false }) {
  return (
    <div
      className={`w-full ${
        small ? 'h-[300px]' : 'h-[600px]'
      } border-2 border-dashed border-neon/60 flex items-center justify-center text-neon/60 text-[10px] tracking-widest`}
    >
      AD · {label}
    </div>
  );
}

/* ============================================================
 * 코너 픽셀 장식
 * ============================================================ */
function CornerDots() {
  const cls = 'absolute h-2 w-2 bg-neon shadow-neon';
  return (
    <>
      <span className={`${cls} top-0 left-0`} />
      <span className={`${cls} top-0 right-0`} />
      <span className={`${cls} bottom-0 left-0`} />
      <span className={`${cls} bottom-0 right-0`} />
    </>
  );
}

/* ============================================================
 * 픽셀 마스코트 (간단한 도트 SVG)
 * ============================================================ */
function PixelMascot() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="w-24 h-24"
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      {[
        [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
        [2, 2], [9, 2],
        [2, 3], [4, 3], [7, 3], [9, 3],
        [2, 4], [9, 4],
        [2, 5], [4, 5], [5, 5], [6, 5], [7, 5], [9, 5],
        [2, 6], [9, 6],
        [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
        [4, 8], [7, 8],
        [4, 9], [5, 9], [6, 9], [7, 9],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill="#39FF14" />
      ))}
    </svg>
  );
}

/* ============================================================
 * Naver SDK access_token 받아오기 (구현 자리표시자)
 * ============================================================ */
async function getNaverAccessTokenViaSDK() {
  throw new Error('Naver SDK 연결 필요');
}

/* ============================================================
 * 전역 스타일: 폰트 + 네온 효과 + 스캔라인
 * ============================================================ */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

      .font-pixel { font-family: 'VT323', 'Press Start 2P', monospace; }
      .text-neon  { color: #39FF14; }
      .bg-neon    { background-color: #39FF14; }
      .border-neon { border-color: #39FF14; }

      .text-glow {
        text-shadow:
          0 0 4px #39FF14,
          0 0 10px rgba(57,255,20,0.7),
          0 0 22px rgba(57,255,20,0.4);
      }

      .shadow-neon {
        box-shadow:
          0 0 8px rgba(57,255,20,0.6),
          0 0 24px rgba(57,255,20,0.25),
          inset 0 0 6px rgba(57,255,20,0.2);
      }

      .crt-scanlines {
        background: repeating-linear-gradient(
          to bottom,
          rgba(0,0,0,0) 0px,
          rgba(0,0,0,0) 2px,
          rgba(0,0,0,0.25) 3px,
          rgba(0,0,0,0) 4px
        );
        mix-blend-mode: multiply;
      }

      .crt-flicker {
        background: rgba(57,255,20,0.02);
        animation: flicker 3s infinite;
      }
      @keyframes flicker {
        0%, 100% { opacity: 0.6; }
        45%      { opacity: 0.3; }
        50%      { opacity: 0.8; }
        55%      { opacity: 0.4; }
      }

      .blink { animation: blink 1.1s steps(2, start) infinite; }
      @keyframes blink {
        to { visibility: hidden; }
      }
    `}</style>
  );
}
