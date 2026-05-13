import { useCallback, useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  signInAnonymously, updateProfile,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import DustInvaderGame from './DustInvaderGame';
import NeonBrickBreaker from './NeonBrickBreaker';
import ClassicTetris    from './ClassicTetris';
import NeonSnake        from './NeonSnake';
import FlappyMungyi     from './FlappyMungyi';
import GameLobby        from './GameLobby';
import NeonOmok         from './NeonOmok';
import { useBgm }       from './utils/useBgm';

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
const db   = getFirestore(app);

/* ── Kakao 앱 키 ──────────────────────────────────── */
// SDK v1(developers.kakao.com/sdk/js/kakao.js) 사용 — Auth.login() 팝업 방식 지원
const KAKAO_JS_KEY = 'ad5490ca84b163e5628e714505fa9c1a';

/* ── AdSense 수직 광고 ────────────────────────────── */
function VerticalAd() {
  const pushed = useRef(false);
  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* adsbygoogle 미로드 시 무시 */ }
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

  // BGM: 게임 화면일 때 gameplay BGM, 그 외(로비·가이드)는 lobby BGM
  const { bgmOn, toggleBgm } = useBgm(currentGame !== null);

  /* Firebase Auth 상태 */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) { setCurrentGame(null); setPendingGame(null); }
    });
    return () => unsub();
  }, []);

  /* ── Kakao SDK v1 동적 로딩 ──────────────────────────
     v2(t1.kakaocdn.net)는 Auth.login() 삭제됨.
     v1(developers.kakao.com)는 Auth.login() 팝업 방식 지원 → implicit grant 권한 불필요
  ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (window.Kakao?.isInitialized?.()) return;
    const s = document.createElement('script');
    s.src = 'https://developers.kakao.com/sdk/js/kakao.js'; // v1 — Auth.login() 있음
    s.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
        console.log('[Kakao SDK v1] 초기화 완료. Auth.login 유형:', typeof window.Kakao.Auth?.login);
      }
    };
    s.onerror = () => console.error('[Kakao SDK] 스크립트 로드 실패');
    document.head.appendChild(s);
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

  const handleKakao = useCallback(() => {
    const Kakao = window.Kakao;
    // ── 상태 진단 로그 ──────────────────────────────
    console.log('[Kakao] 버튼 클릭');
    console.log('[Kakao] SDK 로드:', !!Kakao);
    console.log('[Kakao] isInitialized:', !!Kakao?.isInitialized?.());
    console.log('[Kakao] Auth.login 타입:', typeof Kakao?.Auth?.login);

    // ── SDK 미준비 → 안내 ────────────────────────────
    if (!Kakao?.isInitialized?.()) {
      alert(
        '카카오 서비스를 불러오는 중입니다.\n' +
        '잠시 후(3~5초) 다시 시도해주세요.\n\n' +
        '계속 이 메시지가 뜨면 페이지를 새로고침(F5)해주세요.'
      );
      return;
    }
    if (typeof Kakao.Auth?.login !== 'function') {
      alert(
        '[오류] Kakao.Auth.login을 찾을 수 없습니다.\n' +
        '콘솔(F12)에서 SDK 버전을 확인해주세요.'
      );
      return;
    }

    setLoading(true);

    // ── 30초 타임아웃 (팝업 차단 등 대비) ───────────
    const timer = setTimeout(() => {
      setLoading(false);
      alert(
        '카카오 로그인 응답 없음 (30초 초과)\n\n' +
        '팝업이 차단됐을 수 있습니다.\n' +
        '브라우저 주소창 옆 팝업 차단 아이콘을 클릭해서 허용해주세요.'
      );
    }, 30000);

    // ── SDK v1 팝업 로그인 ───────────────────────────
    Kakao.Auth.login({
      success: async (authObj) => {
        clearTimeout(timer);
        console.log('[Kakao] ✅ Auth.login 성공');
        console.log('[Kakao] access_token 앞 10자:', String(authObj?.access_token ?? '').slice(0, 10));

        try {
          // ── Kakao REST API 프로필 조회 ────────────
          const res = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: 'Bearer ' + authObj.access_token },
          });
          const profile = await res.json();
          console.log('[Kakao API] /v2/user/me:', JSON.stringify(profile).slice(0, 300));

          const nickname =
            profile.kakao_account?.profile?.nickname ??
            profile.properties?.nickname ??
            'KAKAO USER';
          const photoURL =
            profile.kakao_account?.profile?.profile_image_url ??
            profile.properties?.profile_image ??
            null;
          console.log(`[Kakao] 닉네임="${nickname}", 사진=${photoURL ? '있음' : '없음'}`);

          // ── Firebase 익명 로그인 + 프로필 업데이트 ─
          const cred = await signInAnonymously(auth);
          await updateProfile(cred.user, { displayName: nickname, photoURL });
          await setDoc(doc(db, 'users', cred.user.uid), {
            uid: cred.user.uid, displayName: nickname, photoURL,
            provider: 'kakao', updatedAt: serverTimestamp(),
          }, { merge: true });
          console.log('[Kakao] ✅ Firebase 완료 uid:', cred.user.uid);
        } catch (e) {
          console.error('[Kakao] ❌ 처리 실패:', e.code ?? '', e.message);
          // Firebase Anonymous auth 미활성화 안내
          if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
            alert(
              '⚙️ Firebase 설정이 필요합니다.\n\n' +
              'Firebase Console → Authentication\n' +
              '→ Sign-in method → Anonymous → 사용 설정\n\n' +
              '(관리자에게 문의해주세요)'
            );
          } else {
            alert('카카오 로그인 처리 중 오류:\n' + e.message);
          }
        } finally {
          setLoading(false);
        }
      },
      fail: (err) => {
        clearTimeout(timer);
        console.error('[Kakao] ❌ Auth.login fail:', JSON.stringify(err));
        const msg = err?.error_description ?? err?.msg ?? err?.message ?? JSON.stringify(err);
        if (err?.error !== 'access_denied') {
          alert('카카오 로그인 실패\n\n' + msg);
        } else {
          console.log('[Kakao] 사용자 취소');
        }
        setLoading(false);
      },
    });
  }, []);

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
      <header className="relative z-10 flex items-center justify-between border-b-2 border-neon px-3 py-1.5 md:px-6">
        {/* 로고 + 타이틀 */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="무명이 게임 타운"
            className="h-9 w-9 md:h-11 md:w-11 object-contain"
            style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 4px #39FF14)' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="text-neon title-glow-pulse text-[10px] md:text-base tracking-widest leading-tight"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            무명이<br/>게임 타운
          </h1>
        </div>
        {/* 유저 영역 */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-neon/80">
          {/* BGM 토글 버튼 — 로그인 전후 항상 표시 */}
          <button
            onClick={toggleBgm}
            title={bgmOn ? '음악 끄기' : '음악 켜기'}
            className={`text-[8px] px-2 py-1 border transition-colors tracking-widest ${
              bgmOn
                ? 'border-neon text-neon bg-neon/10 hover:bg-neon hover:text-black'
                : 'border-neon/30 text-neon/30 hover:border-neon hover:text-neon'
            }`}
            style={{ fontFamily: '"Press Start 2P",monospace' }}
          >
            {bgmOn ? '♪ ON' : '♪ OFF'}
          </button>
          {user ? (
            <>
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full border border-neon/50 object-cover" />
              )}
              <span className="hidden md:block text-neon/60 text-[8px] tracking-wider max-w-[80px] truncate"
                style={{ fontFamily: '"Press Start 2P",monospace' }}>
                {user.displayName?.split(' ')[0] || 'PLAYER'}
              </span>
              <button onClick={handleLogout}
                className="border border-neon px-2 py-1 hover:bg-neon hover:text-black transition-colors text-[8px] tracking-wider"
                style={{ fontFamily: '"Press Start 2P",monospace' }}>
                LOGOUT
              </button>
            </>
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
            {!user && <LoginScreen loading={loading} onGoogle={handleGoogle} onKakao={handleKakao} />}

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
            {user && currentGame === 'omok'          && <NeonOmok                    onExit={goLobby} />}

            {/* 게임 중 로비 복귀 버튼 — 하단 중앙 (HUD 겹침 방지) */}
            {user && currentGame !== null && (
              <button onClick={goLobby}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 border border-neon/50 text-neon/60 hover:text-neon hover:border-neon text-[8px] px-3 py-1.5 bg-black/90 transition-colors tracking-widest whitespace-nowrap"
                style={{ fontFamily: '"Press Start 2P",monospace', boxShadow: '0 0 8px rgba(57,255,20,0.15)' }}>
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
  omok: {
    title: 'NEON OMOK',
    color: '#39FF14',
    keys: [
      { key: 'CLICK', desc: '돌 놓기' },
    ],
    touch: [
      { icon: '👆', desc: '탭으로 돌 놓기' },
    ],
    tip: '5개를 연속으로 놓으면 승리! AI 또는 2인 대전.',
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
          <div className="text-[15px] tracking-widest mb-1 title-glow-pulse"
            style={{ fontFamily: '"Press Start 2P",monospace', color: cfg.color }}>
            {cfg.title}
          </div>
          <div className="h-px w-24 mx-auto mt-2"
            style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
        </div>

        {/* 조작법 카드 */}
        <div className="w-full max-w-[300px] border border-neon/30 bg-black/60"
          style={{ boxShadow: '0 0 12px rgba(57,255,20,0.1)' }}>

          {/* 키보드 섹션 */}
          <div className="border-b border-neon/20 px-4 py-2.5 flex items-center gap-2">
            <span className="text-[10px] text-neon/50 tracking-widest font-bold"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>⌨ KEYBOARD</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {cfg.keys.map((k, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="border border-neon/50 text-neon text-[9px] px-2 py-1.5 min-w-[64px] text-center shrink-0 font-bold"
                  style={{ fontFamily: '"Press Start 2P",monospace', boxShadow: '0 0 4px rgba(57,255,20,0.2)', background: 'rgba(57,255,20,0.05)' }}>
                  {k.key}
                </span>
                <span className="text-neon/80 text-[10px]"
                  style={{ fontFamily: '"Press Start 2P",monospace' }}>
                  {k.desc}
                </span>
              </div>
            ))}
          </div>

          {/* 터치 섹션 */}
          <div className="border-t border-neon/20 border-b border-neon/20 px-4 py-2.5 flex items-center gap-2">
            <span className="text-[10px] text-neon/50 tracking-widest font-bold"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>📱 TOUCH</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            {cfg.touch.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl w-9 text-center shrink-0">{t.icon}</span>
                <span className="text-neon/80 text-[10px]"
                  style={{ fontFamily: '"Press Start 2P",monospace' }}>
                  {t.desc}
                </span>
              </div>
            ))}
          </div>

          {/* 팁 */}
          <div className="border-t border-neon/20 px-4 py-3">
            <p className="text-neon/50 text-[9px] leading-relaxed text-center"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              💡 {cfg.tip}
            </p>
          </div>
        </div>

        {/* START 버튼 */}
        <button
          onClick={onStart}
          className="border-2 border-neon px-10 py-4 text-neon text-[13px] tracking-widest hover:bg-neon hover:text-black active:scale-95 transition-all font-bold"
          style={{ fontFamily: '"Press Start 2P",monospace', boxShadow: '0 0 20px rgba(57,255,20,0.6)', color: cfg.color === '#39FF14' ? undefined : cfg.color, borderColor: cfg.color === '#39FF14' ? undefined : cfg.color }}>
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
function LoginScreen({ loading, onGoogle, onKakao }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between px-6 py-8 bg-black">
      {/* 타이틀 + 로고 영역 */}
      <div className="flex flex-col items-center gap-3 mt-4">
        {/* 로고 이미지 (없으면 픽셀 마스코트로 대체) */}
        <img
          src="/logo.png"
          alt="무명이 게임 타운 로고"
          className="w-[140px] h-[140px] object-contain"
          style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 10px #39FF14)' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="text-neon title-glow-pulse text-xl tracking-widest text-center leading-loose"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          무명이<br/>게임 타운
        </div>
        <div className="h-px w-24 bg-neon" style={{ boxShadow: '0 0 8px #39FF14' }} />
        <p className="text-neon/50 text-[8px] tracking-wider text-center"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          PIXEL ARCADE · EST.2026
        </p>
      </div>

      {/* 로그인 버튼 영역 */}
      <div className="w-full max-w-[280px] flex flex-col gap-3">
        <p className="text-center text-neon/50 text-[9px] tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          ▼ SELECT PLAYER ▼
        </p>
        <KakaoButton onClick={onKakao} disabled={loading} loading={loading} />
        <GoogleButton onClick={onGoogle} disabled={loading} />

        {/* 로딩 중 안내 */}
        {loading && (
          <div className="flex flex-col items-center gap-2 mt-1">
            <p className="text-center text-[#FEE500]/80 text-[8px] blink"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              ⏳ 로그인 처리 중...
            </p>
            <p className="text-center text-neon/30 text-[7px] leading-relaxed"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              팝업 창을 확인해주세요.<br/>
              차단됐다면 주소창 옆 아이콘을 클릭→허용
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 카카오 로그인 버튼 ────────────────────────────── */
function KakaoButton({ onClick, disabled, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-not-allowed"
      style={{ filter: 'drop-shadow(0 0 6px rgba(254,229,0,0.6))', opacity: disabled ? 0.7 : 1 }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5 bg-[#FEE500] border-2 border-[#FDDC3F]">
        {/* 로딩 중이면 스피너, 아니면 카카오 아이콘 */}
        {loading ? (
          <span className="h-6 w-6 shrink-0 flex items-center justify-center text-lg animate-spin">⏳</span>
        ) : (
          <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="#3C1E1E">
            <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.55 5.07 3.9 6.51L5.1 21l4.18-2.43C10.06 18.84 11.02 19 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z"/>
          </svg>
        )}
        <span className="text-[#3C1E1E] text-[12px] tracking-wider flex-1"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          {loading ? '로그인 중...' : '카카오로 시작하기'}
        </span>
        {!loading && (
          <span className="text-[#3C1E1E]/60 group-hover:text-[#3C1E1E] transition-colors ml-auto">▶</span>
        )}
      </div>
    </button>
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
