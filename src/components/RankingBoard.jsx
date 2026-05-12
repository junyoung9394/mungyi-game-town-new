import { useEffect, useState, useRef } from 'react';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const GAMES = [
  { id: 'dustInvader', label: 'INVADER', short: 'INV' },
  { id: 'brickBreaker', label: 'BRICKS',  short: 'BRK' },
  { id: 'tetris',       label: 'TETRIS',  short: 'TET' },
  { id: 'snake',        label: 'SNAKE',   short: 'SNK' },
  { id: 'flappy',       label: 'FLAPPY',  short: 'FLP' },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const NEON = '#39FF14';

function Avatar({ name, photoURL, size = 24 }) {
  const [err, setErr] = useState(false);
  const letter = (name || 'P')[0].toUpperCase();

  if (photoURL && !err) {
    return (
      <img
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover border border-neon/30 shrink-0"
        style={{ width: size, height: size }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-neon/20 flex items-center justify-center shrink-0 text-neon font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42, fontFamily: '"Press Start 2P",monospace' }}
    >
      {letter}
    </div>
  );
}

export default function RankingBoard() {
  const currentUid = getAuth().currentUser?.uid ?? null;
  const [active, setActive]   = useState('dustInvader');
  const [scores, setScores]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [spin, setSpin]       = useState(false);
  const myRowRef  = useRef(null);
  const unsubRef  = useRef(null);

  /* ── 실시간 리스너 (탭 전환 시 재구독) ──────────────── */
  useEffect(() => {
    // 이전 탭의 리스너 해제
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    // UID 필터 없음 — 전체 유저 TOP 50, 점수 내림차순
    const q = query(
      collection(getFirestore(), 'leaderboard', active, 'scores'),
      orderBy('score', 'desc'),
      limit(50)
    );

    unsubRef.current = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
        console.log(`[RankingBoard:${active}] 실시간 업데이트: ${rows.length}명`);
        setScores(rows);
        setLoading(false);
      },
      (e) => {
        console.error('[RankingBoard] ❌', e.code, e.message);
        setScores([]);
        setLoading(false);
      }
    );

    // 컴포넌트 언마운트 또는 탭 변경 시 리스너 해제
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [active]);

  /* 내 행으로 스크롤 */
  useEffect(() => {
    if (!loading && myRowRef.current) {
      myRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [loading, active]);

  /* ── 탭 클릭 ─────────────────────────────────────── */
  const handleTab = (id) => {
    if (id !== active) {
      // 탭 전환: 즉시 초기화 후 새 리스너 구독
      setScores([]);
      setLoading(true);
      setActive(id);
    } else {
      // 같은 탭 클릭 → 새로고침 애니메이션만 (onSnapshot이 실시간 유지 중)
      setSpin(true);
      setTimeout(() => setSpin(false), 600);
    }
  };

  /* ── 내 순위 ─────────────────────────────────────── */
  const myRank  = scores.findIndex(s => s.uid === currentUid);
  const myEntry = myRank >= 0 ? scores[myRank] : null;

  return (
    <div className="border border-neon/30 bg-black overflow-hidden"
      style={{ boxShadow: '0 0 12px rgba(57,255,20,0.08)' }}>

      {/* ── 헤더 ──────────────────────────────────────── */}
      <div className="border-b border-neon/30 px-3 py-2.5 flex items-center justify-between">
        <span className="text-neon text-[12px] tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace', textShadow: `0 0 6px ${NEON}` }}>
          🏆 명예의 전당
        </span>
        <div className="flex items-center gap-2">
          {/* 실시간 표시 */}
          <span className="text-[8px] text-neon/50 tracking-wider"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            ● LIVE
          </span>
          <button
            onClick={() => handleTab(active)}
            className="text-neon/40 hover:text-neon text-[9px] tracking-wider transition-colors px-1"
            style={{ fontFamily: '"Press Start 2P",monospace' }}
            title="새로고침"
          >
            <span style={{ display: 'inline-block', transition: 'transform 0.5s', transform: spin ? 'rotate(360deg)' : 'none' }}>
              ↻
            </span>
          </button>
        </div>
      </div>

      {/* ── 게임 탭 ───────────────────────────────────── */}
      <div className="flex border-b border-neon/20">
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => handleTab(g.id)}
            className={`flex-1 py-2 text-[10px] tracking-wider transition-colors ${
              active === g.id
                ? 'bg-neon text-black font-bold'
                : 'text-neon/50 hover:text-neon'
            }`}
            style={{ fontFamily: '"Press Start 2P",monospace' }}
          >
            {g.short}
          </button>
        ))}
      </div>

      {/* ── 컬럼 헤더 ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-neon/10"
        style={{ background: 'rgba(57,255,20,0.04)' }}>
        <span className="w-6 text-center text-[9px] text-neon/30 shrink-0"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>#</span>
        <span className="w-6 shrink-0" />
        <span className="flex-1 text-[9px] text-neon/30 tracking-wider"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>PLAYER</span>
        <span className="text-[9px] text-neon/30 shrink-0"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>SCORE</span>
      </div>

      {/* ── 랭킹 목록 (스크롤) ────────────────────────── */}
      <div className="overflow-y-auto" style={{ maxHeight: 340 }}>

        {loading && (
          <div className="flex items-center justify-center h-28 text-neon/40 text-[10px] blink"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            LOADING...
          </div>
        )}

        {!loading && scores.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 gap-2">
            <span className="text-neon/30 text-[11px]" style={{ fontFamily: '"Press Start 2P",monospace' }}>
              NO RECORDS YET
            </span>
            <span className="text-neon/20 text-[9px]" style={{ fontFamily: '"Press Start 2P",monospace' }}>
              첫 번째 기록을 세워보세요!
            </span>
          </div>
        )}

        {!loading && scores.map((s, i) => {
          const isMe   = currentUid && s.uid === currentUid;
          const isTop3 = i < 3;

          return (
            <div
              key={s.uid ?? i}
              ref={isMe ? myRowRef : null}
              className={`flex items-center gap-2 px-3 border-b last:border-0 transition-colors ${
                isMe
                  ? 'border-neon/40'
                  : 'border-neon/10'
              }`}
              style={{
                paddingTop: 8,
                paddingBottom: 8,
                // 본인 행 강조: 밝은 녹색 배경 + 좌우 네온 테두리
                background: isMe
                  ? 'rgba(57,255,20,0.18)'
                  : isTop3
                    ? 'rgba(57,255,20,0.03)'
                    : 'transparent',
                borderLeft: isMe ? `3px solid ${NEON}` : '3px solid transparent',
                boxShadow: isMe ? `inset 0 0 12px rgba(57,255,20,0.12)` : 'none',
              }}
            >
              {/* 등수 */}
              <div className="w-6 flex items-center justify-center shrink-0">
                {isTop3 ? (
                  <span className="text-[16px] leading-none">{MEDALS[i]}</span>
                ) : (
                  <span className="text-[11px] text-neon/40"
                    style={{ fontFamily: '"Press Start 2P",monospace' }}>{i + 1}</span>
                )}
              </div>

              {/* 프로필 사진 */}
              <Avatar name={s.displayName} photoURL={s.photoURL} size={22} />

              {/* 이름 */}
              <span
                className={`flex-1 text-[11px] truncate ${
                  isMe ? 'text-neon font-bold' : isTop3 ? 'text-neon/90' : 'text-neon/70'
                }`}
                style={{
                  fontFamily: '"Press Start 2P",monospace',
                  textShadow: isMe ? `0 0 8px ${NEON}` : 'none',
                }}
              >
                {(s.displayName || 'PLAYER').slice(0, 12).toUpperCase()}
                {isMe && (
                  <span className="text-[8px] text-neon/70 ml-1.5 align-middle">◀ ME</span>
                )}
              </span>

              {/* 점수 */}
              <span
                className={`text-[12px] font-bold tabular-nums shrink-0 ${
                  isMe ? 'text-neon' : isTop3 ? 'text-neon/95' : 'text-neon/75'
                }`}
                style={{
                  fontFamily: '"Press Start 2P",monospace',
                  textShadow: isMe
                    ? `0 0 12px ${NEON}`
                    : isTop3
                      ? `0 0 4px rgba(57,255,20,0.4)`
                      : 'none',
                }}
              >
                {s.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── 내 순위 고정 푸터 ─────────────────────────── */}
      {!loading && myEntry && myRank >= 0 && (
        <div className="border-t border-neon/40 px-3 py-2 flex items-center gap-2"
          style={{ background: 'rgba(57,255,20,0.10)', boxShadow: `0 -2px 8px rgba(57,255,20,0.10)` }}>
          <span className="text-neon/50 text-[9px] shrink-0"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>내 순위</span>
          <span className="text-neon text-[11px] font-bold"
            style={{ fontFamily: '"Press Start 2P",monospace', textShadow: `0 0 6px ${NEON}` }}>
            {myRank + 1}위
          </span>
          <span className="flex-1 text-neon/70 text-[10px] truncate"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            {(myEntry.displayName || 'PLAYER').slice(0, 10).toUpperCase()}
          </span>
          <span className="text-neon text-[11px] font-bold tabular-nums"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            {myEntry.score.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
