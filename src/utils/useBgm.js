import { useState, useEffect, useCallback } from 'react';

/* ── 모듈 레벨 싱글톤 ─────────────────────────────────── */
let _lobby     = null;
let _game      = null;
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

function fadeOutAll() {
  clearInterval(_fadeTimer);
  const active = [_lobby, _game].filter(a => a && !a.paused);
  if (!active.length) return;
  const vols = active.map(a => a.volume);
  let step = 0;
  _fadeTimer = setInterval(() => {
    step++;
    const t = step / FADE_STEPS;
    active.forEach((a, i) => { a.volume = Math.max(0, vols[i] * (1 - t)); });
    if (step >= FADE_STEPS) {
      clearInterval(_fadeTimer);
      active.forEach(a => { a.pause(); a.volume = MAX_VOL; });
    }
  }, FADE_MS / FADE_STEPS);
}

function crossfade(from, to, resetTo = false) {
  clearInterval(_fadeTimer);
  const startVol = (from && !from.paused) ? from.volume : 0;

  if (to?.paused) {
    to.volume = 0;
    if (resetTo) to.currentTime = 0;
    to.play().catch(e => console.warn('[BGM]', e.message));
  }

  let step = 0;
  _fadeTimer = setInterval(() => {
    step++;
    const t = step / FADE_STEPS;
    if (from && !from.paused) from.volume = Math.max(0, startVol * (1 - t));
    if (to) to.volume = Math.min(MAX_VOL, MAX_VOL * t);

    if (step >= FADE_STEPS) {
      clearInterval(_fadeTimer);
      if (from && !from.paused) { from.pause(); from.volume = MAX_VOL; }
      if (to) to.volume = MAX_VOL;
    }
  }, FADE_MS / FADE_STEPS);
}

/**
 * BGM 관리 훅
 * @param {boolean} isGameActive - 게임 화면 활성 여부
 * @returns {{ bgmOn: boolean, toggleBgm: () => void }}
 */
export function useBgm(isGameActive) {
  const [bgmOn, setBgmOn] = useState(
    () => localStorage.getItem('bgmOn') !== 'false'
  );

  /* 로비 ↔ 게임 BGM 전환 (BGM 켜져 있을 때만) */
  useEffect(() => {
    if (!bgmOn || !_lobby) return;
    if (isGameActive) {
      crossfade(_lobby, _game, true);
    } else {
      if (!_game?.paused) crossfade(_game, _lobby, false);
    }
  }, [isGameActive]); // eslint-disable-line react-hooks/exhaustive-deps

  /* BGM ON/OFF 토글
     버튼 클릭이 user gesture이므로 audio.play() 즉시 허용됨 */
  const toggleBgm = useCallback(() => {
    const next = !bgmOn;
    setBgmOn(next);
    localStorage.setItem('bgmOn', String(next));
    ensureAudio();

    if (next) {
      if (isGameActive) {
        _game.currentTime = 0;
        _game.play().catch(e => console.warn('[BGM] 게임 BGM 시작 실패:', e.message));
      } else {
        _lobby.play().catch(e => console.warn('[BGM] 로비 BGM 시작 실패:', e.message));
      }
    } else {
      fadeOutAll();
    }
  }, [bgmOn, isGameActive]);

  return { bgmOn, toggleBgm };
}
