import { useState, useEffect } from 'react';

const KEY = 'arcade_streak_v2';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function useStreak() {
  const [streak, setStreak]           = useState(0);
  const [attendedToday, setAttendedToday] = useState(false);
  const [bestStreak, setBestStreak]   = useState(0);

  useEffect(() => {
    const data = load();
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    setBestStreak(data.best || 0);

    if (data.lastDate === today) {
      setStreak(data.streak || 1);
      setAttendedToday(true);
    } else if (data.lastDate === yesterday) {
      setStreak(data.streak || 0);
      setAttendedToday(false);
    } else {
      // 스트릭 끊김 — 카운터는 유지하되 오늘 미출석
      setStreak(0);
      setAttendedToday(false);
    }
  }, []);

  /** 출석 체크. 새 스트릭 값 반환, 이미 한 경우 0 반환 */
  const claim = () => {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const data      = load();
    if (data.lastDate === today) return 0;

    const newStreak = data.lastDate === yesterday ? (data.streak || 0) + 1 : 1;
    const newBest   = Math.max(newStreak, data.best || 0);
    localStorage.setItem(KEY, JSON.stringify({ streak: newStreak, lastDate: today, best: newBest }));
    setStreak(newStreak);
    setBestStreak(newBest);
    setAttendedToday(true);
    return newStreak;
  };

  return { streak, attendedToday, claim, bestStreak };
}
