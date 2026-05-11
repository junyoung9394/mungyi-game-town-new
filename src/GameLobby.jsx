import React from 'react';

const GAMES = [
  {
    id: 'dustInvader',
    title: 'DUST INVADER',
    desc: '외계 먼지를 격파하라',
    available: true,
    preview: <DustPreview />,
  },
  {
    id: 'brickBreaker',
    title: 'NEON BRICKS',
    desc: '벽돌을 모두 부숴라',
    available: true,
    preview: <BrickPreview />,
  },
  {
    id: 'snake',
    title: 'SNAKE++',
    desc: '준비중...',
    available: false,
    preview: <ComingSoonPreview />,
  },
  {
    id: 'tetris',
    title: 'TETRIS-X',
    desc: '준비중...',
    available: false,
    preview: <ComingSoonPreview />,
  },
];

export default function GameLobby({ onSelect, user }) {
  return (
    <div className="absolute inset-0 bg-black overflow-y-auto">
      {/* 헤더 */}
      <div className="px-4 pt-5 pb-3 text-center border-b border-neon/30">
        <div
          className="text-neon text-glow text-[11px] tracking-widest"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          SELECT GAME
        </div>
        <div
          className="text-neon/50 text-[8px] tracking-wider mt-2"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {user?.displayName ? `PLAYER: ${user.displayName.toUpperCase()}` : 'PLAYER 1'}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} onSelect={onSelect} />
        ))}
      </div>

      {/* 하단 힌트 */}
      <div
        className="text-center text-neon/30 text-[7px] tracking-widest pb-4"
        style={{ fontFamily: '"Press Start 2P", monospace' }}
      >
        GAMETOWN · EST.2026
      </div>
    </div>
  );
}

function GameCard({ game, onSelect }) {
  const available = game.available;

  return (
    <button
      onClick={() => available && onSelect(game.id)}
      disabled={!available}
      className={`
        relative flex flex-col border-2 bg-black overflow-hidden
        transition-transform duration-100
        ${available
          ? 'border-neon hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
          : 'border-neon/20 cursor-not-allowed opacity-50'
        }
      `}
      style={available ? { boxShadow: '0 0 10px rgba(57,255,20,0.3)' } : {}}
    >
      {/* 프리뷰 영역 (4:3 비율) */}
      <div className="relative w-full" style={{ paddingBottom: '75%' }}>
        <div className="absolute inset-0">
          {game.preview}
        </div>
      </div>

      {/* 카드 정보 */}
      <div className="px-2 py-2 border-t border-neon/30 text-left">
        <div
          className={`text-[8px] tracking-wider truncate ${available ? 'text-neon' : 'text-neon/40'}`}
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {game.title}
        </div>
        <div
          className="text-neon/50 text-[7px] tracking-wide mt-1 truncate"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {game.desc}
        </div>
      </div>

      {/* PLAY / COMING SOON 뱃지 */}
      {available ? (
        <div
          className="absolute top-1.5 right-1.5 bg-neon text-black text-[6px] px-1.5 py-0.5 tracking-widest"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          PLAY
        </div>
      ) : (
        <div
          className="absolute top-1.5 right-1.5 border border-neon/30 text-neon/30 text-[6px] px-1.5 py-0.5 tracking-widest"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          SOON
        </div>
      )}
    </button>
  );
}

/* ── 픽셀아트 프리뷰 SVG ─────────────────────────────── */

function DustPreview() {
  return (
    <svg
      viewBox="0 0 60 45"
      className="w-full h-full bg-black"
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      {/* 격자 배경 */}
      {[0,12,24,36,48,60].map(x => (
        <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={45} stroke="rgba(57,255,20,0.07)" strokeWidth={0.5}/>
      ))}
      {[0,9,18,27,36,45].map(y => (
        <line key={`hy${y}`} x1={0} y1={y} x2={60} y2={y} stroke="rgba(57,255,20,0.07)" strokeWidth={0.5}/>
      ))}

      {/* 적 3행 × 5열 */}
      {[0,1,2].map(row =>
        [0,1,2,3,4].map(col => (
          <rect
            key={`e${row}-${col}`}
            x={5 + col * 10}
            y={5 + row * 8}
            width={6}
            height={5}
            fill="#39FF14"
          />
        ))
      )}

      {/* 총알 */}
      <rect x={28} y={25} width={2} height={5} fill="#90FFA0"/>

      {/* 플레이어 탱크 */}
      <rect x={23} y={36} width={14} height={5} fill="#39FF14"/>
      <rect x={29} y={32} width={2} height={5} fill="#39FF14"/>

      {/* 바닥선 */}
      <rect x={0} y={41} width={60} height={1} fill="#39FF14"/>
    </svg>
  );
}

function BrickPreview() {
  const COLORS = ['#FF2D55', '#FF9F0A', '#FFD60A', '#34FFD8', '#7B2FFF', '#39FF14'];
  return (
    <svg
      viewBox="0 0 60 45"
      className="w-full h-full bg-black"
      style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
    >
      {/* 격자 배경 */}
      {[0,12,24,36,48,60].map(x => (
        <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={45} stroke="rgba(57,255,20,0.07)" strokeWidth={0.5}/>
      ))}
      {[0,9,18,27,36,45].map(y => (
        <line key={`hy${y}`} x1={0} y1={y} x2={60} y2={y} stroke="rgba(57,255,20,0.07)" strokeWidth={0.5}/>
      ))}

      {/* 벽돌 4행 × 6열 */}
      {COLORS.slice(0, 4).map((color, row) =>
        [0,1,2,3,4,5].map(col => (
          <rect
            key={`b${row}-${col}`}
            x={2 + col * 9 + 1}
            y={3 + row * 7 + 1}
            width={7}
            height={5}
            fill={color}
          />
        ))
      )}

      {/* 공 */}
      <circle cx={28} cy={32} r={3} fill="#39FF14"/>

      {/* 패들 */}
      <rect x={16} y={39} width={28} height={3} fill="#39FF14"/>
    </svg>
  );
}

function ComingSoonPreview() {
  return (
    <svg
      viewBox="0 0 60 45"
      className="w-full h-full bg-black"
      style={{ imageRendering: 'pixelated' }}
    >
      {/* 격자 배경 */}
      {[0,12,24,36,48,60].map(x => (
        <line key={`vx${x}`} x1={x} y1={0} x2={x} y2={45} stroke="rgba(57,255,20,0.05)" strokeWidth={0.5}/>
      ))}
      {[0,9,18,27,36,45].map(y => (
        <line key={`hy${y}`} x1={0} y1={y} x2={60} y2={y} stroke="rgba(57,255,20,0.05)" strokeWidth={0.5}/>
      ))}

      {/* ? 픽셀아트 */}
      {[
        [2,0],[3,0],[4,0],
        [5,1],
        [4,2],[3,2],
        [3,4],
        [3,6],
      ].map(([cx, cy], i) => (
        <rect key={i} x={24 + cx * 2} y={8 + cy * 4} width={2} height={3} fill="rgba(57,255,20,0.25)"/>
      ))}
    </svg>
  );
}
