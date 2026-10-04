import { useCallback, useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, linkWithPopup, signOut, onAuthStateChanged,
  signInAnonymously, updateProfile,
} from 'firebase/auth';
import { useStreak }                                        from './utils/useStreak';
import { useDailyMission }                                  from './utils/useDailyMission';
import { useAchievements, checkGameAchievements, checkStreakAchievements } from './utils/useAchievements';
import { addCoins }                                         from './utils/coins';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import NeonBrickBreaker from './NeonBrickBreaker';
import ClassicTetris    from './ClassicTetris';
import NeonSnake        from './NeonSnake';
import FlappyMungyi     from './FlappyMungyi';
import RunnerGame       from './RunnerGame';
import GameLobby        from './GameLobby';
import LoginScreen from './components/LoginScreen';
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
  const [pendingGame, setPendingGame] = useState(null);
  const currentGameRef                = useRef(null);
  const [pwaPrompt, setPwaPrompt]     = useState(null);

  // BGM: 게임 화면일 때 gameplay BGM, 그 외(로비·가이드)는 lobby BGM
  const { bgmOn, toggleBgm } = useBgm(currentGame !== null);

  // 스트릭 / 미션 / 업적
  const { streak, attendedToday, claim: claimStreak } = useStreak();
  const { mission, completed: missionCompleted, checkComplete } = useDailyMission();
  const { unlocked: achievements, unlock, toast: achToast } = useAchievements();

  /* PWA install prompt 캡처 */
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = useCallback(() => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    pwaPrompt.userChoice.then(() => setPwaPrompt(null));
  }, [pwaPrompt]);

  const handlePwaDismiss = useCallback(() => setPwaPrompt(null), []);

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
      const provider = new GoogleAuthProvider();
      // 게스트(익명) 유저라면 링크로 연결해서 기존 데이터 보존
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      // credential-already-in-use: 이미 다른 계정이 있음 → 일반 로그인으로 폴백
      if (e.code === 'auth/credential-already-in-use') {
        try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch { /* ignore */ }
      } else {
        console.error('[Google] 로그인 실패:', e);
      }
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

          // ── Firebase: 기존 익명 유저라면 프로필만 업데이트, 없으면 새 익명 계정 ─
          let targetUser = auth.currentUser;
          if (!targetUser) {
            const cred = await signInAnonymously(auth);
            targetUser = cred.user;
          }
          await updateProfile(targetUser, { displayName: nickname, photoURL });
          await setDoc(doc(db, 'users', targetUser.uid), {
            uid: targetUser.uid, displayName: nickname, photoURL,
            provider: 'kakao', updatedAt: serverTimestamp(),
          }, { merge: true });
          console.log('[Kakao] ✅ Firebase 완료 uid:', targetUser.uid);
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

  const handleGuest = async () => {
    setLoading(true);
    try { await signInAnonymously(auth); } catch (e) { console.error('[Guest]', e); }
    finally { setLoading(false); }
  };

  const handleLogout = () => signOut(auth);

  // 게임 종료 후 로비 복귀 — score가 있으면 업적/미션 체크
  const goLobby = useCallback((score) => {
    const gameId = currentGameRef.current;
    if (gameId && typeof score === 'number' && score > 0) {
      checkGameAchievements(gameId, score, unlock);
      const missionCleared = checkComplete(gameId, score);
      if (missionCleared) {
        unlock('mission_done');
        addCoins(mission?.reward ?? 50);
      }
    }
    currentGameRef.current = null;
    setCurrentGame(null);
    setPendingGame(null);
  }, [unlock, checkComplete, mission]);

  /* 로비 카드 클릭 → 조작법 안내 먼저 */
  const handleSelectGame = (gameId) => {
    setPendingGame(gameId);
    setCurrentGame(null);
  };

  /* 조작법 안내에서 START → 게임 실행 */
  const handleGuideStart = () => {
    currentGameRef.current = pendingGame;
    setCurrentGame(pendingGame);
    setPendingGame(null);
  };

  /* 스트릭 출석 체크 + 업적 + 코인 + 알림 권한 요청 */
  const handleClaimStreak = useCallback(async () => {
    const n = claimStreak();
    if (n > 0) {
      checkStreakAchievements(n, unlock);
      addCoins(30);
      // 첫 출석 체크 시 알림 권한 요청
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            // 내일 이 시간에 스트릭 알림 (로컬 시뮬레이션: 24시간 후)
            // 실제 Web Push는 서버 VAPID 키 필요 — 여기서는 권한 획득만
            reg.showNotification('무명이 게임 타운 🔥', {
              body: `${n}일 연속! 내일도 출석 체크를 잊지 마세요!`,
              icon: '/icons/icon-192.png',
              tag: 'streak-claim',
            });
          }
        } catch { /* 알림 미지원 환경 무시 */ }
      }
    }
    return n;
  }, [claimStreak, unlock]);

  return (
    <div className={`town-shell relative min-h-screen w-full font-pixel text-neon overflow-hidden ${!user ? 'town-welcome' : ''}`}>
      <GlobalStyles />
      <div className="pointer-events-none fixed inset-0 z-50 crt-scanlines" />
      <div className="pointer-events-none fixed inset-0 z-50 crt-flicker" />

      {/* 헤더 */}
      <header className="town-header relative z-10 flex items-center justify-between px-3 py-1.5 md:px-6">
        {/* 로고 + 타이틀 */}
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
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
        <aside className="town-ad hidden md:flex w-[160px] shrink-0 flex-col items-center gap-3 p-3 border-r border-neon/20">
          <VerticalAd side="left" />
        </aside>

        {/* 중앙 게임 영역 9:16 */}
        <section className="flex flex-1 items-center justify-center p-2 md:p-4 pb-[52px] md:pb-4">
          <div className="town-stage relative w-full md:w-auto md:h-[calc(100vh-100px)] md:aspect-[9/16]
            aspect-[9/16] max-h-[calc(100vh-76px)] border-2 border-neon bg-black"
            style={{ boxShadow: '0 0 8px rgba(57,255,20,0.6),0 0 24px rgba(57,255,20,0.25),inset 0 0 6px rgba(57,255,20,0.2)' }}>
            <CornerDots />

            {/* 업적 토스트 */}
            {achToast && (
              <div className="absolute top-14 left-3 right-3 z-50 flex items-center gap-3 px-3 py-2.5 pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.95)', border: '1px solid rgba(255,215,0,0.6)', boxShadow: '0 0 16px rgba(255,215,0,0.3)', animation: 'achSlide 0.4s ease-out' }}>
                <span className="text-2xl shrink-0">{achToast.icon}</span>
                <div>
                  <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 7, color: 'rgba(255,215,0,0.6)', marginBottom: 2 }}>🏆 업적 달성!</div>
                  <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#ffd700' }}>{achToast.name}</div>
                  <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 7, color: 'rgba(255,215,0,0.5)' }}>{achToast.desc}</div>
                </div>
              </div>
            )}

            {/* 로그인 전 */}
            {!user && <LoginScreen loading={loading} onGoogle={handleGoogle} onKakao={handleKakao} onGuest={handleGuest} />}

            {/* 로그인 후 – 로비 */}
            {user && currentGame === null && pendingGame === null &&
              <GameLobby
                user={user}
                onSelect={handleSelectGame}
                streak={streak}
                attendedToday={attendedToday}
                onClaimStreak={handleClaimStreak}
                mission={mission}
                missionCompleted={missionCompleted}
                achievements={achievements}
                pwaPrompt={pwaPrompt}
                onPwaInstall={handlePwaInstall}
                onPwaDismiss={handlePwaDismiss}
              />}

            {/* 조작법 안내 오버레이 */}
            {user && pendingGame !== null &&
              <ControlGuide gameId={pendingGame} onStart={handleGuideStart} onBack={goLobby} />}

            {/* 게임 화면 */}
            {user && currentGame === 'brickBreaker' && <NeonBrickBreaker  autoStart onExit={goLobby} />}
            {user && currentGame === 'tetris'        && <ClassicTetris     autoStart onExit={goLobby} />}
            {user && currentGame === 'snake'         && <NeonSnake         autoStart onExit={goLobby} />}
            {user && currentGame === 'flappy'        && <FlappyMungyi      autoStart onExit={goLobby} />}
            {user && currentGame === 'runner'        && <RunnerGame        autoStart onExit={goLobby} />}
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
        <aside className="town-ad hidden md:flex w-[160px] shrink-0 flex-col items-center gap-3 p-3 border-l border-neon/20">
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
  runner: {
    title: 'ENDLESS RUNNER',
    color: '#e879f9',
    keys: [
      { key: 'SPACE', desc: '점프' },
      { key: '↑ / W', desc: '점프' },
      { key: 'CLICK', desc: '점프' },
    ],
    touch: [
      { icon: '👆', desc: '한 번 탭: 점프' },
      { icon: '👆👆', desc: '연속 탭: 이중 점프' },
    ],
    tip: '장애물을 피하고 🪙 코인을 모아라! 속도가 점점 빨라진다.',
  },
};

function ControlGuide({ gameId, onStart, onBack }) {
  const cfg = GUIDE_DATA[gameId];
  if (!cfg) return null;

  return (
    <div className="mini-guide">
      <button className="mini-guide-back" onClick={onBack}>← 게임 고르기</button>
      <div className="mini-guide-icon" style={{color:cfg.color}} aria-hidden="true">{gameId === 'omok' ? '●' : gameId === 'tetris' ? '▦' : gameId === 'snake' ? '⌁' : '✦'}</div>
      <span className="mini-result-kicker">HOW TO PLAY</span>
      <h2>{cfg.title}</h2>
      <p className="mini-guide-goal">{cfg.tip}</p>
      <div className="mini-guide-inputs">
        <div><strong>터치</strong><span>{cfg.touch.map(item => item.desc).join(' · ')}</span></div>
        <div><strong>키보드</strong><span>{cfg.keys.map(item => `${item.key} ${item.desc}`).join(' · ')}</span></div>
      </div>
      <button className="mini-primary" onClick={onStart}>▶ {gameId === 'omok' ? '대전 방식 고르기' : '바로 시작하기'}</button>
      <p className="mini-guide-note">끝나면 한 판 더! 원할 때 게임을 바꿀 수 있어요.</p>
    </div>
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
      @keyframes achSlide {
        0%   { opacity:0; transform: translateY(-12px); }
        100% { opacity:1; transform: translateY(0); }
      }
    `}</style>
  );
}
