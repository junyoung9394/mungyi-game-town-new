import { getAuth } from 'firebase/auth';
import { getFirestore, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

/**
 * 리더보드에 점수 저장 (개인 최고 점수만 갱신)
 * Firestore 경로: leaderboard/{gameId}/scores/{uid}
 * @returns {boolean} 신기록 여부
 */
export async function saveLeaderboardScore(gameId, score, extra = {}) {
  try {
    const user = getAuth().currentUser;
    if (!user) return false;
    if (!score || score <= 0) return false;

    const db = getFirestore();
    const ref = doc(db, 'leaderboard', gameId, 'scores', user.uid);

    const isNewRecord = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const best = snap.exists() ? (snap.data().score ?? 0) : 0;
      if (score <= best) return false;
      tx.set(ref, {
        uid: user.uid,
        displayName: user.displayName ?? 'PLAYER',
        photoURL: user.photoURL ?? null,
        score,
        updatedAt: serverTimestamp(),
        ...extra,
      });
      return true;
    });

    return isNewRecord;
  } catch (e) {
    console.error(`[Leaderboard:${gameId}] 저장 실패`, e.code, e.message);
    return false;
  }
}
