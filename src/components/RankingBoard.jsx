import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
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

/* ── 작은 픽셀 아바타 (프로필 사진 없을 때) ─────────── */
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
  const [spin, setSpin]       = useState(false);  // 새로고침 아이콘 회전
  const myRowRef = useRef(null);

  /* ── 데이터 로드 ─────────────────────────────────── */
  const load = useCallback(async (gameId, force = false) => {
    setLoading(true);
    try {
      const q = query(
        collection(getFirestore(), 'leaderboard', gameId, 'scores'),
        orderBy('score', 'desc'),
        limit(50)                             // ← 전체 TOP 50
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
      console.log(`[RankingBoard:${gameId}] ${rows.length}명 로드`);
      setScores(rows);
    } catch (e) {
      console.error('[RankingBoard] ❌', e.code, e.message);
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* 탭 전환 시 로드 */
  useEffect(() => { load(active); }, [active]); // eslint-disable-line

  /* 내 행으로 스크롤 */
  useEffect(() => {
    if (!loading && myRowRef.current) {
      myRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [loading, active]);

  /* ── 새로고침 ─────────────────────────────────────── */
  const handleRefresh = () => {
    setSpin(true);
    setTimeout(() => setSpin(false), 600);
    load(active, true);
  };

  /* ── 탭 클릭 ─────────────────────────────────────── */
  const handleTab = (id) => {
    if (id !== active) { setScores([]); setActive(id); }
    else handleRefresh();           // 같은 탭 클릭 → 새로고침
  };

  /* ── 내 순위가 리스트에 있는지 ────────────────────── */
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
        <button
          onClick={handleRefresh}
          className="text-neon/40 hover:text-neon text-[9px] tracking-wider transition-colors px-1"
          style={{ fontFamily: '"Press Start 2P",monospace' }}
          title="새로고침"
        >
          <span style={{ display: 'inline-block', transition: 'transform 0.5s', transform: spin ? 'rotate(360deg)' : 'none' }}>
            ↻
          </span>
        </button>
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
          const isMe = currentUid && s.uid === currentUid;
          const isTop3 = i < 3;

          return (
            <div
              key={s.uid ?? i}
              ref={isMe ? myRowRef : null}
              className={`flex items-center gap-2 px-3 border-b border-neon/10 last:border-0 transition-colors ${
                isMe
                  ? 'bg-neon/[0.12] border-l-2 border-l-neon'
                  : isTop3
                    ? 'bg-neon/[0.03]'
                    : ''
              }`}
              style={{ paddingTop: 8, paddingBottom: 8 }}
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
                style={{ fontFamily: '"Press Start 2P",monospace', textShadow: isMe ? `0 0 6px ${NEON}` : 'none' }}
              >
                {(s.displayName || 'PLAYER').slice(0, 12).toUpperCase()}
                {isMe && (
                  <span className="text-[8px] text-neon/50 ml-1.5 align-middle">◀ ME</span>
                )}
              </span>

              {/* 점수 */}
              <span
                className={`text-[12px] font-bold tabular-nums shrink-0 ${
                  isMe ? 'text-neon' : isTop3 ? 'text-neon/95' : 'text-neon/75'
                }`}
                style={{
                  fontFamily: '"Press Start 2P",monospace',
                  textShadow: isMe ? `0 0 10px ${NEON}` : isTop3 ? `0 0 4px rgba(57,255,20,0.4)` : 'none',
                }}
              >
                {s.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── 내 순위 고정 푸터 (내가 목록 안에 있을 때) ── */}
      {!loading && myEntry && myRank >= 0 && (
        <div className="border-t border-neon/30 px-3 py-2 flex items-center gap-2"
          style={{ background: 'rgba(57,255,20,0.06)' }}>
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
