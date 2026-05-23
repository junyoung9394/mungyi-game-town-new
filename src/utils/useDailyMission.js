import { useState, useEffect } from 'react';

const MISSIONS = [
  { gameId: 'runner',       label: 'RUNNER',      emoji: '🏃', goal: 250,  unit: '점', reward: 30 },
  { gameId: 'runner',       label: 'RUNNER',      emoji: '🏃', goal: 500,  unit: '점', reward: 50 },
  { gameId: 'runner',       label: 'RUNNER',      emoji: '🏃', goal: 800,  unit: '점', reward: 70 },
  { gameId: 'flappy',       label: 'FLAPPY',      emoji: '🐦', goal: 3,    unit: '점', reward: 30 },
  { gameId: 'flappy',       label: 'FLAPPY',      emoji: '🐦', goal: 8,    unit: '점', reward: 50 },
  { gameId: 'flappy',       label: 'FLAPPY',      emoji: '🐦', goal: 15,   unit: '점', reward: 80 },
  { gameId: 'tetris',       label: 'TETRIS',      emoji: '🧩', goal: 500,  unit: '점', reward: 30 },
  { gameId: 'tetris',       label: 'TETRIS',      emoji: '🧩', goal: 1500, unit: '점', reward: 60 },
  { gameId: 'snake',        label: 'SNAKE',       emoji: '🐍', goal: 5,    unit: '개', reward: 30 },
  { gameId: 'snake',        label: 'SNAKE',       emoji: '🐍', goal: 12,   unit: '개', reward: 60 },
  { gameId: 'brickBreaker', label: 'NEON BRICKS', emoji: '🧱', goal: 150,  unit: '점', reward: 35 },
  { gameId: 'brickBreaker', label: 'NEON BRICKS', emoji: '🧱', goal: 400,  unit: '점', reward: 60 },
  { gameId: 'omok',         label: 'NEON OMOK',   emoji: '⚫', goal: 1,    unit: '승', reward: 50 },
];

function getTodayMission() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return MISSIONS[seed % MISSIONS.length];
}

const KEY = 'arcade_mission_v2';

export function useDailyMission() {
  const [mission]   = useState(getTodayMission);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
      setCompleted(stored.date === new Date().toDateString() && !!stored.done);
    } catch { /* */ }
  }, []);

  /** 점수로 미션 달성 체크. 달성 시 true 반환 */
  const checkComplete = (gameId, score) => {
    if (completed) return false;
    if (gameId !== mission.gameId) return false;
    if (score < mission.goal) return false;
    localStorage.setItem(KEY, JSON.stringify({ date: new Date().toDateString(), done: true }));
    setCompleted(true);
    return true;
  };

  return { mission, completed, checkComplete };
}
