import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * 리더보드에 점수 저장 (개인 최고 점수만 갱신)
 * Firestore 경로: leaderboard/{gameId}/scores/{uid}
 * @returns {boolean} 신기록 여부
 */
export async function saveLeaderboardScore(gameId, score, extra = {}) {
  try {
    const user = getAuth().currentUser;
    if (!user) return false;
    const db = getFirestore();
    const ref = doc(db, 'leaderboard', gameId, 'scores', user.uid);
    const snap = await getDoc(ref);
    const best = snap.exists() ? (snap.data().score ?? 0) : 0;
    if (score > best) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName ?? 'PLAYER',
        photoURL: user.photoURL ?? null,
        score,
        updatedAt: serverTimestamp(),
        ...extra,
      });
      return true;
    }
    return false;
  } catch (e) {
    console.warn(`[${gameId}] leaderboard 저장 실패:`, e);
    return false;
  }
}
