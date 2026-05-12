import { useEffect, useRef, useCallback } from 'react';

const LOBBY_SRC  = '/audio/bgm_lobby_main.mp3';
const GAME_SRC   = '/audio/bgm_gameplay_fast.mp3';
const MAX_VOL    = 0.4;
const FADE_MS    = 1200; // fade-out 총 시간 (ms)
const FADE_STEPS = 30;

/**
 * BGM 관리 훅
 * @param {boolean} isGameActive - 게임 화면 활성 여부 (true: 게임 BGM, false: 로비 BGM)
 */
export function useBgm(isGameActive) {
  const lobbyRef    = useRef(null);
  const gameRef     = useRef(null);
  const timerRef    = useRef(null);
  const unlockedRef = useRef(false); // 브라우저 autoplay 잠금 해제 여부
  const activeRef   = useRef(isGameActive);

  // isGameActive 최신값을 ref에도 동기화 (unlock 클로저에서 사용)
  useEffect(() => { activeRef.current = isGameActive; }, [isGameActive]);

  /* ── 오디오 초기화 + autoplay 잠금 해제 리스너 ──────── */
  useEffect(() => {
    const lobby = new Audio(LOBBY_SRC);
    lobby.loop   = true;
    lobby.volume = MAX_VOL;
    lobbyRef.current = lobby;

    const game = new Audio(GAME_SRC);
    game.loop   = true;
    game.volume = MAX_VOL;
    gameRef.current = game;

    // 브라우저 정책 상 사용자 제스처 이후에만 재생 가능
    // 첫 번째 클릭/터치 시 로비 BGM 시작
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      if (!activeRef.current) {
        lobby.play().catch((e) => console.warn('[BGM] 로비 시작 실패:', e.message));
      }
    };
    document.addEventListener('click',      unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });

    return () => {
      document.removeEventListener('click',      unlock);
      document.removeEventListener('touchstart', unlock);
      clearInterval(timerRef.current);
      lobby.pause();
      game.pause();
    };
  }, []); // 마운트 1회만

  /* ── Crossfade 유틸 ────────────────────────────────── */
  // resetTo: to 트랙을 처음부터 재생할지 여부 (게임 BGM은 항상 처음부터)
  const crossfade = useCallback((from, to, resetTo = false) => {
    clearInterval(timerRef.current);
    const startVol = from ? from.volume : 0;

    if (to && to.paused) {
      to.volume = 0;
      if (resetTo) to.currentTime = 0;
      to.play().catch((e) => console.warn('[BGM] 재생 실패:', e.message));
    }

    let step = 0;
    timerRef.current = setInterval(() => {
      step++;
      const ratio = step / FADE_STEPS;
      if (from) from.volume = Math.max(0, startVol * (1 - ratio));
      if (to)   to.volume   = Math.min(MAX_VOL, MAX_VOL * ratio);

      if (step >= FADE_STEPS) {
        clearInterval(timerRef.current);
        if (from) { from.pause(); from.volume = MAX_VOL; }
        if (to)   to.volume = MAX_VOL;
      }
    }, FADE_MS / FADE_STEPS);
  }, []);

  /* ── 게임 활성 상태 변화 감지 → BGM 전환 ────────────── */
  useEffect(() => {
    if (!unlockedRef.current) return; // 사용자 제스처 전에는 무시
    const lobby = lobbyRef.current;
    const game  = gameRef.current;
    if (!lobby || !game) return;

    if (isGameActive) {
      // 로비 → 게임: lobby fade-out + game fade-in (game은 처음부터)
      crossfade(lobby, game, true);
    } else {
      // 게임 → 로비: game fade-out + lobby fade-in (lobby는 이어서)
      if (game.paused) {
        // 게임 BGM이 이미 멈춘 상태라면 바로 로비 시작
        if (lobby.paused) {
          lobby.play().catch(() => {});
        }
      } else {
        crossfade(game, lobby, false);
      }
    }
  }, [isGameActive, crossfade]);
}
