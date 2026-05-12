import { useEffect } from 'react';
import { saveLeaderboardScore } from './saveScore';

/**
 * 게임 도중 자동 저장 훅
 *
 * 발동 시점:
 *  1. LOBBY 버튼 → 컴포넌트 언마운트 시 (useEffect cleanup)
 *  2. 창 닫기 / 새로고침 → beforeunload 이벤트
 *
 * 조건: statusRef.current === 'playing' && scoreRef.current > 0
 * Firestore는 '기존 최고점 초과 시'에만 갱신 (saveLeaderboardScore 내부 로직)
 * localStorage에 임시 백업 → 다음 게임 시작 시 미전송분 재시도
 *
 * @param {string}  gameId     - 'dustInvader' | 'brickBreaker' | 'tetris' | 'snake' | 'flappy'
 * @param {React.MutableRefObject} scoreRef  - 현재 점수 ref
 * @param {React.MutableRefObject} statusRef - 게임 상태 ref
 */
export function useAutoSave(gameId, scoreRef, statusRef) {
  useEffect(() => {
    // ── 미전송 점수 재시도 ─────────────────────────────
    const pendingKey = `${gameId}_pending`;
    const pending = parseInt(localStorage.getItem(pendingKey) || '0', 10);
    if (pending > 0) {
      console.log(`[AutoSave:${gameId}] 미전송 점수(${pending}) 재전송 시도`);
      saveLeaderboardScore(gameId, pending).then(saved => {
        if (saved) {
          localStorage.removeItem(pendingKey);
          console.log(`[AutoSave:${gameId}] 미전송 점수 Firestore 반영 완료`);
        }
      });
    }

    // ── 현재 점수 저장 함수 ────────────────────────────
    const saveNow = () => {
      if (statusRef.current !== 'playing') return;
      const s = scoreRef.current;
      if (s <= 0) return;

      console.log(`[AutoSave:${gameId}] 중간 저장 → score: ${s}`);

      // localStorage 동기 백업 (창 닫힘에도 보존)
      localStorage.setItem(pendingKey, String(s));

      // Firestore 비동기 저장 (최고점 초과 시에만 갱신)
      saveLeaderboardScore(gameId, s).then(saved => {
        if (saved) {
          localStorage.removeItem(pendingKey);
          console.log(`[AutoSave:${gameId}] ✅ Firestore 갱신 완료 (신기록)`);
        } else {
          console.log(`[AutoSave:${gameId}] 기존 최고점 이하 - Firestore 스킵 (로컬 백업은 유지)`);
          localStorage.removeItem(pendingKey); // 기존 최고점 이하면 지워도 됨
        }
      });
    };

    // ── beforeunload (창 닫기 / 새로고침) ─────────────
    window.addEventListener('beforeunload', saveNow);

    // ── cleanup: LOBBY 버튼으로 언마운트 시 ──────────
    return () => {
      window.removeEventListener('beforeunload', saveNow);
      saveNow(); // 언마운트 직전 점수 저장
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
