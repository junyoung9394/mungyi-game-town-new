import { useState, useCallback } from 'react';

export const ACHIEVEMENT_DEFS = {
  runner_first:  { icon: '🏃', name: '첫 달리기',       desc: '러너 첫 플레이' },
  runner_300:    { icon: '⚡', name: '속도광',           desc: '러너 300점 달성' },
  runner_1000:   { icon: '🏅', name: '장거리 선수',     desc: '러너 1000점 달성' },
  runner_3000:   { icon: '🚀', name: '무한질주',         desc: '러너 3000점 달성' },
  flappy_first:  { icon: '🐦', name: '첫 비행',         desc: '플래피 첫 플레이' },
  flappy_10:     { icon: '🦅', name: '하늘의 지배자',   desc: '플래피 10점 달성' },
  flappy_20:     { icon: '👑', name: '날개의 왕',       desc: '플래피 20점 달성' },
  tetris_first:  { icon: '🧩', name: '첫 블록',         desc: '테트리스 첫 플레이' },
  tetris_1000:   { icon: '✨', name: '라인 클리어!',    desc: '테트리스 1000점 달성' },
  tetris_5000:   { icon: '💎', name: '테트리스 마스터', desc: '테트리스 5000점 달성' },
  snake_first:   { icon: '🐍', name: '첫 먹이',         desc: '스네이크 첫 플레이' },
  snake_10:      { icon: '🦎', name: '포식자',           desc: '스네이크 10개 먹기' },
  snake_20:      { icon: '🐉', name: '용이 되다',       desc: '스네이크 20개 먹기' },
  brick_first:   { icon: '🧱', name: '첫 격파',         desc: '벽돌깨기 첫 플레이' },
  brick_500:     { icon: '💥', name: '파괴왕',           desc: '벽돌깨기 500점 달성' },
  omok_first:    { icon: '⚫', name: '첫 대국',         desc: '오목 첫 플레이' },
  streak_3:      { icon: '🔥', name: '3일 연속',         desc: '3일 연속 접속' },
  streak_7:      { icon: '💫', name: '7일 개근',         desc: '7일 연속 접속' },
  streak_30:     { icon: '👑', name: '이달의 플레이어', desc: '30일 연속 접속' },
  mission_done:  { icon: '🎯', name: '미션 클리어!',    desc: '데일리 미션 달성' },
};

const KEY = 'arcade_achievements_v2';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function useAchievements() {
  const [unlocked, setUnlocked] = useState(load);
  const [toast, setToast]       = useState(null);

  const unlock = useCallback((id) => {
    if (!ACHIEVEMENT_DEFS[id]) return;
    setUnlocked(prev => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(next));
      // 토스트는 직접 set (클로저 문제 없음)
      setToast({ ...ACHIEVEMENT_DEFS[id], id });
      setTimeout(() => setToast(null), 3200);
      return next;
    });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { unlocked, unlock, toast, dismissToast };
}

/** gameId + score 기반으로 해당 업적들을 체크 */
export function checkGameAchievements(gameId, score, unlock) {
  const map = {
    runner:       [['runner_first', 1], ['runner_300', 300], ['runner_1000', 1000], ['runner_3000', 3000]],
    flappy:       [['flappy_first', 1], ['flappy_10', 10], ['flappy_20', 20]],
    tetris:       [['tetris_first', 1], ['tetris_1000', 1000], ['tetris_5000', 5000]],
    snake:        [['snake_first', 1], ['snake_10', 10], ['snake_20', 20]],
    brickBreaker: [['brick_first', 1], ['brick_500', 500]],
    omok:         [['omok_first', 1]],
  };
  for (const [id, threshold] of (map[gameId] || [])) {
    if (score >= threshold) unlock(id);
  }
}

/** 스트릭 기반 업적 체크 */
export function checkStreakAchievements(streak, unlock) {
  if (streak >= 3)  unlock('streak_3');
  if (streak >= 7)  unlock('streak_7');
  if (streak >= 30) unlock('streak_30');
}
