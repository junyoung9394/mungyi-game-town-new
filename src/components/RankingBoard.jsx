import React, { useEffect, useState, useCallback } from 'react';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const GAMES = [
  { id: 'dustInvader', label: 'INVADER', short: 'INV' },
  { id: 'brickBreaker', label: 'BRICKS',  short: 'BRK' },
  { id: 'tetris',      label: 'TETRIS',  short: 'TET' },
  { id: 'snake',       label: 'SNAKE',   short: 'SNK' },
  { id: 'flappy',      label: 'FLAPPY',  short: 'FLP' },
];

export default function RankingBoard() {
  const [active, setActive]   = useState('dustInvader');
  const [cache, setCache]     = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (gameId) => {
    if (cache[gameId]) return;
    setLoading(true);
    try {
      const q = query(
        collection(getFirestore(), 'leaderboard', gameId, 'scores'),
        orderBy('score', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
      console.log(`[RankingBoard:${gameId}] ${rows.length}개 기록 로드`);
      setCache(prev => ({ ...prev, [gameId]: rows }));
    } catch (e) {
      console.error('[RankingBoard] ❌ 랭킹 로드 실패!', {
        errorCode: e.code,
        errorMessage: e.message,
        gameId,
      });
      if (e.code === 'permission-denied') {
        console.error('[RankingBoard] 🔒 Firestore 읽기 권한 없음. 보안 규칙을 확인하세요.');
      }
      setCache(prev => ({ ...prev, [gameId]: [] }));
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => { load(active); }, [active]); // eslint-disable-line

  const scores = cache[active] || [];
  const MEDALS = ['🥇', '🥈', '🥉', '④', '⑤'];

  return (
    <div className="border border-neon/30 bg-black/60 overflow-hidden">
      {/* 타이틀 */}
      <div className="border-b border-neon/30 px-3 py-2.5 flex items-center gap-2">
        <span className="text-neon text-[11px] tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          🏆 명예의 전당
        </span>
      </div>

      {/* 게임 탭 */}
      <div className="flex border-b border-neon/20">
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => setActive(g.id)}
            className={`flex-1 py-2 text-[9px] tracking-wider transition-colors ${
              active === g.id
                ? 'bg-neon text-black'
                : 'text-neon/50 hover:text-neon'
            }`}
            style={{ fontFamily: '"Press Start 2P",monospace' }}
          >
            {g.short}
          </button>
        ))}
      </div>

      {/* 랭킹 목록 */}
      <div className="px-3 py-2 min-h-[140px]">
        {loading && (
          <div className="flex items-center justify-center h-24 text-neon/40 text-[10px]"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            LOADING...
          </div>
        )}
        {!loading && scores.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-neon/30 text-center gap-2"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            <span className="text-[11px]">NO RECORDS YET</span>
            <span className="text-[9px] text-neon/20">첫 번째 기록을 세워보세요!</span>
          </div>
        )}
        {!loading && scores.map((s, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-neon/10 last:border-0">
            <span className="text-[13px] w-6 shrink-0">{MEDALS[i]}</span>
            <span className="flex-1 text-neon/80 text-[10px] truncate"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              {(s.displayName || 'PLAYER').slice(0, 10).toUpperCase()}
            </span>
            <span className="text-neon text-[11px] font-bold shrink-0"
              style={{ fontFamily: '"Press Start 2P",monospace' }}>
              {String(s.score).padStart(5, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
