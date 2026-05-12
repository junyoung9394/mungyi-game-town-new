import { useEffect } from 'react';

/* ── 모듈 레벨 싱글톤 ─────────────────────────────────
   React StrictMode의 effect 이중 실행에도 Audio 객체가
   재생성/pause되지 않도록 컴포넌트 외부에 선언한다.
─────────────────────────────────────────────────────── */
let _lobby    = null;
let _game     = null;
let _unlocked = false;
let _fadeTimer = null;

const MAX_VOL    = 0.4;
const FADE_MS    = 1200;
const FADE_STEPS = 30;

function ensureAudio() {
  if (_lobby) return;
  _lobby = new Audio('/audio/bgm_lobby_main.mp3');
  _lobby.loop    = true;
  _lobby.volume  = MAX_VOL;
  _lobby.preload = 'auto';

  _game = new Audio('/audio/bgm_gameplay_fast.mp3');
  _game.loop    = true;
  _game.volume  = MAX_VOL;
  _game.preload = 'auto';
}

function unlock() {
  if (_unlocked) return;
  _unlocked = true;
  ensureAudio();
  _lobby.play().catch((e) => console.warn('[BGM] 로비 시작 실패:', e.message));
}

function crossfade(from, to, resetTo = false) {
  clearInterval(_fadeTimer);
  const startVol = from ? from.volume : 0;

  if (to?.paused) {
    to.volume = 0;
    if (resetTo) to.currentTime = 0;
    to.play().catch((e) => console.warn('[BGM] 재생 실패:', e.message));
  }

  let step = 0;
  _fadeTimer = setInterval(() => {
    step++;
    const ratio = step / FADE_STEPS;
    if (from) from.volume = Math.max(0, startVol * (1 - ratio));
    if (to)   to.volume   = Math.min(MAX_VOL, MAX_VOL * ratio);

    if (step >= FADE_STEPS) {
      clearInterval(_fadeTimer);
      if (from) { from.pause(); from.volume = MAX_VOL; }
      if (to)   to.volume = MAX_VOL;
    }
  }, FADE_MS / FADE_STEPS);
}

/**
 * BGM 관리 훅
 * @param {boolean} isGameActive - true: 게임 BGM / false: 로비 BGM
 */
export function useBgm(isGameActive) {
  /* 최초 마운트 시 Audio 준비 + autoplay 잠금 해제 리스너 등록 */
  useEffect(() => {
    ensureAudio();
    // 모듈 레벨 함수라 StrictMode 이중 실행 시에도 같은 참조가 재사용됨
    document.addEventListener('click',      unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });

    return () => {
      // cleanup 시 리스너만 제거 (Audio 객체는 싱글톤이라 유지)
      document.removeEventListener('click',      unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  /* isGameActive 변화 → BGM 전환 */
  useEffect(() => {
    if (!_unlocked) return;

    if (isGameActive) {
      // 로비 → 게임: lobby fade-out + game fade-in (처음부터)
      crossfade(_lobby, _game, true);
    } else {
      // 게임 → 로비
      if (_game?.paused) {
        // 게임 BGM이 이미 멈췄으면 바로 로비 시작
        if (_lobby?.paused) _lobby.play().catch(() => {});
      } else {
        // game fade-out + lobby fade-in (이어서)
        crossfade(_game, _lobby, false);
      }
    }
  }, [isGameActive]);
}
