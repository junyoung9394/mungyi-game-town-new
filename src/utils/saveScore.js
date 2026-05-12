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
    if (!user) {
      console.warn(`[Leaderboard:${gameId}] 로그인 유저 없음 - 저장 스킵`);
      return false;
    }
    if (!score || score <= 0) {
      console.warn(`[Leaderboard:${gameId}] 유효하지 않은 점수(${score}) - 저장 스킵`);
      return false;
    }

    const db = getFirestore();
    const ref = doc(db, 'leaderboard', gameId, 'scores', user.uid);
    console.log(`[Leaderboard:${gameId}] 저장 시도 → uid: ${user.uid}, score: ${score}`);

    const snap = await getDoc(ref);
    const best = snap.exists() ? (snap.data().score ?? 0) : 0;
    console.log(`[Leaderboard:${gameId}] 현재 최고점: ${best} / 새 점수: ${score}`);

    if (score > best) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName ?? 'PLAYER',
        photoURL: user.photoURL ?? null,
        score,
        updatedAt: serverTimestamp(),
        ...extra,
      });
      console.log(`[Leaderboard:${gameId}] ✅ 신기록 저장! ${best} → ${score}`);
      return true;
    }

    console.log(`[Leaderboard:${gameId}] 기존 최고점(${best}) 이상 → 저장 스킵`);
    return false;
  } catch (e) {
    console.error(`[Leaderboard:${gameId}] ❌ 저장 실패!`, {
      errorCode: e.code,
      errorMessage: e.message,
      gameId,
      score,
    });
    // Firestore 보안 규칙 오류 안내
    if (e.code === 'permission-denied') {
      console.error(
        `[Leaderboard] 🔒 권한 거부! Firebase Console → Firestore → Rules에서\n` +
        `  match /leaderboard/{gameId}/scores/{userId} {\n` +
        `    allow read: if true;\n` +
        `    allow write: if request.auth != null && request.auth.uid == userId;\n` +
        `  }\n` +
        `  위 규칙이 설정되어 있는지 확인하세요.`
      );
    }
    return false;
  }
}
