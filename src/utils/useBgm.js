import { useState, useCallback, useLayoutEffect, useEffect } from 'react';

/* ── 모듈 레벨 싱글톤 ─────────────────────────────────── */
let _lobby     = null;
let _game      = null;
let _fadeTimer = null;
let _bgmOn     = typeof window !== 'undefined'
  ? localStorage.getItem('bgmOn') !== 'false'
  : true;

const MAX_VOL    = 0.4;
const FADE_MS    = 1200;
const FADE_STEPS = 30;

function ensureAudio() {
  if (_lobby) return;
  _lobby = new Audio('/audio/bgm_lobby_main.mp3');
  _lobby.loop = true; _lobby.volume = MAX_VOL; _lobby.preload = 'auto';
  _game  = new Audio('/audio/bgm_gameplay_fast.mp3');
  _game.loop  = true; _game.volume  = MAX_VOL; _game.preload  = 'auto';
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

// 모듈 레벨 함수 — StrictMode 이중 실행에도 동일 참조 유지
function handleFirstInteraction() {
  if (_bgmOn && _lobby?.paused) {
    _lobby.play().catch(e => console.warn('[BGM] 로비 시작 실패:', e.message));
  }
}

/**
 * @param {boolean} isGameActive
 * @returns {{ bgmOn: boolean, toggleBgm: () => void }}
 */
export function useBgm(isGameActive) {
  const [bgmOn, setBgmOn] = useState(_bgmOn);

  // 첫 클릭/터치 시 로비 BGM 시작 (bgmOn=true 상태일 때)
  useLayoutEffect(() => {
    ensureAudio();
    document.addEventListener('click',      handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener('click',      handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // 로비 ↔ 게임 BGM 전환
  useEffect(() => {
    if (!_bgmOn || !_lobby) return;
    if (isGameActive) {
      crossfade(_lobby, _game, true);
    } else {
      if (!_game?.paused) crossfade(_game, _lobby, false);
    }
  }, [isGameActive]);

  const toggleBgm = useCallback(() => {
    const next = !bgmOn;
    _bgmOn = next;          // 이벤트 버블링 전에 동기 업데이트
    setBgmOn(next);
    localStorage.setItem('bgmOn', String(next));
    ensureAudio();
    if (next) {
      (isGameActive ? _game : _lobby)
        ?.play().catch(e => console.warn('[BGM]', e.message));
      if (isGameActive && _game) _game.currentTime = 0;
    } else {
      fadeOutAll();
    }
  }, [bgmOn, isGameActive]);

  return { bgmOn, toggleBgm };
}
