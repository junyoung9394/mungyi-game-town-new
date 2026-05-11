import React, { useEffect, useRef } from 'react';
import RankingBoard from './components/RankingBoard';

/* ── AdSense 컴포넌트 ─────────────────────────────── */
function AdUnit({ slot, format = 'auto', style = {}, className = '' }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
    }
  }, []);
  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client="ca-pub-8518556382646891"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

/* ── 게임 목록 ────────────────────────────────────── */
const GAMES = [
  { id: 'dustInvader',  title: 'DUST INVADER',   desc: '외계 먼지를 격파하라',  available: true,  preview: <DustPreview /> },
  { id: 'brickBreaker', title: 'NEON BRICKS',     desc: '벽돌을 모두 부숴라',   available: true,  preview: <BrickPreview /> },
  { id: 'tetris',       title: 'TETRIS',           desc: '줄을 없애라',          available: true,  preview: <TetrisPreview /> },
  { id: 'snake',        title: 'NEON SNAKE',       desc: '먹이를 먹어라',        available: true,  preview: <SnakePreview /> },
  { id: 'flappy',       title: 'FLAPPY 무명이',   desc: '하늘을 날아라',        available: true,  preview: <FlappyPreview /> },
];

/* ── 메인 로비 ────────────────────────────────────── */
export default function GameLobby({ onSelect, user }) {
  return (
    <div className="absolute inset-0 bg-black overflow-y-auto">

      {/* 수평 광고 – 최상단 */}
      <div className="w-full bg-black/50 border-b border-neon/10">
        <AdUnit slot="8080905265" style={{ minHeight: 50 }} />
      </div>

      {/* 타이틀 */}
      <div className="px-4 pt-4 pb-3 text-center">
        <div
          className="text-neon title-glow-pulse text-base tracking-widest leading-loose"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          무명이<br/>게임 타운
        </div>
        <div
          className="text-neon/40 text-[7px] tracking-widest mt-1"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {user?.displayName ? `PLAYER: ${user.displayName.slice(0,12).toUpperCase()}` : 'PIXEL ARCADE · EST.2026'}
        </div>
      </div>

      {/* 구분선 */}
      <div className="mx-4 h-px bg-neon/30 mb-3" />

      {/* 게임 카드 그리드 (2+2+1) */}
      <div className="px-3 grid grid-cols-2 gap-2.5 mb-2">
        {GAMES.slice(0, 4).map(g => <GameCard key={g.id} game={g} onSelect={onSelect} />)}
      </div>
      <div className="px-3 mb-4">
        <GameCard game={GAMES[4]} onSelect={onSelect} wide />
      </div>

      {/* 구분선 */}
      <div className="mx-4 h-px bg-neon/30 mb-3" />

      {/* 랭킹 보드 */}
      <div className="px-3 mb-3">
        <RankingBoard />
      </div>

      {/* 멀티플렉스 광고 – 최하단 */}
      <div className="px-3 mb-4">
        <AdUnit slot="9202415241" format="autorelaxed" style={{ minHeight: 100 }} />
      </div>
    </div>
  );
}

/* ── 게임 카드 ────────────────────────────────────── */
function GameCard({ game, onSelect, wide = false }) {
  const { available } = game;
  if (wide) {
    return (
      <button
        onClick={() => available && onSelect(game.id)}
        className="relative flex border-2 border-neon bg-black overflow-hidden w-full hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
        style={{ boxShadow: '0 0 10px rgba(57,255,20,0.3)' }}
      >
        <div className="w-32 shrink-0 relative" style={{ height: 80 }}>
          {game.preview}
        </div>
        <div className="flex flex-col justify-center px-3 py-2 border-l border-neon/30 text-left flex-1">
          <div className="text-neon text-[9px] tracking-wider mb-1" style={{ fontFamily: '"Press Start 2P",monospace' }}>
            {game.title}
          </div>
          <div className="text-neon/50 text-[7px] tracking-wide" style={{ fontFamily: '"Press Start 2P",monospace' }}>
            {game.desc}
          </div>
        </div>
        <div className="absolute top-1.5 right-1.5 bg-neon text-black text-[6px] px-1.5 py-0.5 tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>PLAY</div>
      </button>
    );
  }
  return (
    <button
      onClick={() => available && onSelect(game.id)}
      disabled={!available}
      className={`relative flex flex-col border-2 bg-black overflow-hidden transition-transform duration-100
        ${available
          ? 'border-neon hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
          : 'border-neon/20 cursor-not-allowed opacity-40'}`}
      style={available ? { boxShadow: '0 0 10px rgba(57,255,20,0.3)' } : {}}
    >
      <div className="relative w-full" style={{ paddingBottom: '72%' }}>
        <div className="absolute inset-0">{game.preview}</div>
      </div>
      <div className="px-2 py-1.5 border-t border-neon/30 text-left">
        <div className={`text-[8px] tracking-wider truncate ${available?'text-neon':'text-neon/30'}`}
          style={{ fontFamily: '"Press Start 2P",monospace' }}>{game.title}</div>
        <div className="text-neon/40 text-[6px] tracking-wide mt-0.5 truncate"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>{game.desc}</div>
      </div>
      {available && (
        <div className="absolute top-1 right-1 bg-neon text-black text-[5px] px-1 py-0.5 tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>PLAY</div>
      )}
    </button>
  );
}

/* ── 프리뷰 SVG ───────────────────────────────────── */
function DustPreview() {
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full bg-black"
      style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
      {[0,12,24,36,48].map(x=><line key={x} x1={x} y1={0} x2={x} y2={44} stroke="rgba(57,255,20,0.07)" strokeWidth={.5}/>)}
      {[0,9,18,27,36,44].map(y=><line key={y} x1={0} y1={y} x2={60} y2={y} stroke="rgba(57,255,20,0.07)" strokeWidth={.5}/>)}
      {[0,1,2].map(r=>[0,1,2,3,4].map(c=><rect key={`${r}${c}`} x={5+c*10} y={4+r*8} width={6} height={5} fill="#39FF14"/>))}
      <rect x={27} y={26} width={2} height={5} fill="#90FFA0"/>
      <rect x={22} y={36} width={14} height={5} fill="#39FF14"/>
      <rect x={28} y={32} width={2} height={5} fill="#39FF14"/>
      <rect x={0} y={41} width={60} height={1} fill="#39FF14"/>
    </svg>
  );
}

function BrickPreview() {
  const C=['#FF2D55','#FF9F0A','#FFD60A','#34FFD8'];
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full bg-black"
      style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
      {C.map((c,r)=>[0,1,2,3,4,5].map(col=>
        <rect key={`${r}${col}`} x={2+col*9+1} y={3+r*7+1} width={7} height={5} fill={c}/>))}
      <circle cx={30} cy={32} r={3} fill="#39FF14"/>
      <rect x={17} y={39} width={26} height={3} fill="#39FF14"/>
    </svg>
  );
}

function TetrisPreview() {
  const cells = [
    [2,1,'#0FF0FC'],[3,1,'#0FF0FC'],[4,1,'#0FF0FC'],[5,1,'#0FF0FC'],
    [4,3,'#BF5AF2'],[3,4,'#BF5AF2'],[4,4,'#BF5AF2'],[5,4,'#BF5AF2'],
    [0,6,'#FF9F0A'],[0,7,'#FF9F0A'],[1,7,'#FF9F0A'],[2,7,'#FF9F0A'],
    [3,6,'#FF453A'],[3,7,'#FF453A'],[4,7,'#FF453A'],[4,8,'#FF453A'],
    [0,9,'#FFD60A'],[1,9,'#FFD60A'],[0,10,'#FFD60A'],[1,10,'#FFD60A'],
    [2,9,'#34C759'],[2,10,'#34C759'],[3,10,'#34C759'],[4,10,'#34C759'],
  ];
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full bg-black"
      style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
      <rect x={10} y={0} width={40} height={44} fill="rgba(57,255,20,0.03)"/>
      <rect x={10} y={0} width={40} height={44} fill="none" stroke="rgba(57,255,20,0.2)" strokeWidth={.5}/>
      {cells.map(([c,r,color],i)=>{
        const x=10+c*4, y=r*4;
        return <rect key={i} x={x+.5} y={y+.5} width={3} height={3} fill={color}/>;
      })}
    </svg>
  );
}

function SnakePreview() {
  const body=[[6,4],[5,4],[4,4],[3,4],[2,4],[2,3],[2,2],[3,2],[4,2],[5,2]];
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full bg-black"
      style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
      {body.map(([cx,cy],i)=>(
        <rect key={i} x={cx*8+1} y={cy*8+1} width={6} height={6}
          fill={i===0?'#39FF14':'rgba(57,255,20,0.6)'}/>))}
      <rect x={57} y={17} width={4} height={4} fill="#FF2D55"/>
    </svg>
  );
}

function FlappyPreview() {
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full bg-black"
      style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
      {/* pipes */}
      <rect x={35} y={0} width={10} height={14} fill="#1a1a1a" stroke="#39FF14" strokeWidth={.5}/>
      <rect x={32} y={12} width={16} height={3} fill="#39FF14"/>
      <rect x={35} y={24} width={10} height={20} fill="#1a1a1a" stroke="#39FF14" strokeWidth={.5}/>
      <rect x={32} y={24} width={16} height={3} fill="#39FF14"/>
      {/* mungyi */}
      <rect x={10} y={18} width={14} height={11} fill="#FFD700"/>
      <rect x={8} y={15} width={5} height={5} fill="#C8A000"/>
      <rect x={17} y={15} width={5} height={5} fill="#C8A000"/>
      <rect x={13} y={21} width={2} height={2} fill="#111"/>
      <rect x={17} y={21} width={2} height={2} fill="#111"/>
      <rect x={14} y={26} width={4} height={2} fill="#FF6B6B"/>
      {/* ground */}
      <rect x={0} y={40} width={60} height={1} fill="#39FF14"/>
    </svg>
  );
}
