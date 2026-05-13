import { useEffect, useRef } from 'react';
import RankingBoard from './components/RankingBoard';

/* ── AdSense 컴포넌트 ─────────────────────────────── */
function AdUnit({ slot, format = 'auto', style = {}, className = '' }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!pushed.current) {
      pushed.current = true;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* adsbygoogle 미로드 시 무시 */ }
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
  { id: 'dustInvader',  title: 'DUST INVADER',  desc: '외계 먼지를 격파하라', available: true,  preview: <DustPreview /> },
  { id: 'brickBreaker', title: 'NEON BRICKS',    desc: '벽돌을 모두 부숴라',  available: true,  preview: <BrickPreview /> },
  { id: 'tetris',       title: 'TETRIS',          desc: '줄을 없애라',         available: true,  preview: <TetrisPreview /> },
  { id: 'snake',        title: 'NEON SNAKE',      desc: '먹이를 먹어라',       available: true,  preview: <SnakePreview /> },
  { id: 'flappy',       title: 'FLAPPY 무명이',  desc: '하늘을 날아라',       available: true,  preview: <FlappyPreview /> },
  { id: 'omok',         title: 'NEON OMOK',      desc: '5목으로 승부하라',    available: true,  preview: <OmokPreview /> },
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
          className="text-neon title-glow-pulse text-xl tracking-widest leading-loose"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          무명이<br/>게임 타운
        </div>
        <div
          className="text-neon/50 text-[9px] tracking-widest mt-2"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {user?.displayName
            ? `PLAYER: ${user.displayName.slice(0, 12).toUpperCase()}`
            : 'PIXEL ARCADE · EST.2026'}
        </div>
      </div>

      {/* 구분선 */}
      <div className="mx-4 h-px bg-neon/30 mb-4" />

      {/* 게임 카드 그리드 (2×2) + 와이드 카드 목록 */}
      <div className="px-3 grid grid-cols-2 gap-3 mb-3">
        {GAMES.slice(0, 4).map(g => <GameCard key={g.id} game={g} onSelect={onSelect} />)}
      </div>
      {GAMES.slice(4).map(g => (
        <div key={g.id} className="px-3 mb-3">
          <GameCard game={g} onSelect={onSelect} wide />
        </div>
      ))}

      {/* 구분선 */}
      <div className="mx-4 h-px bg-neon/30 mb-4" />

      {/* 랭킹 보드 */}
      <div className="px-3 mb-4">
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

  /* 와이드 카드 (Flappy - 마지막 1개) */
  if (wide) {
    return (
      <button
        onClick={() => available && onSelect(game.id)}
        className="relative flex border-2 border-neon bg-black overflow-hidden w-full hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
        style={{ boxShadow: '0 0 10px rgba(57,255,20,0.3)' }}
      >
        <div className="w-36 shrink-0 relative" style={{ height: 90 }}>
          {game.preview}
        </div>
        <div className="flex flex-col justify-center px-4 py-3 border-l border-neon/30 text-left flex-1">
          <div className="text-neon text-[12px] tracking-wider mb-1.5"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            {game.title}
          </div>
          <div className="text-neon/60 text-[9px] tracking-wide"
            style={{ fontFamily: '"Press Start 2P",monospace' }}>
            {game.desc}
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-neon text-black text-[8px] px-2 py-1 tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>PLAY</div>
      </button>
    );
  }

  /* 일반 카드 (2×2 그리드) */
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
      {/* 프리뷰 썸네일 */}
      <div className="relative w-full" style={{ paddingBottom: '68%' }}>
        <div className="absolute inset-0">{game.preview}</div>
      </div>

      {/* 텍스트 영역 */}
      <div className="px-3 py-2 border-t border-neon/30 text-left">
        <div className={`text-[11px] tracking-wider truncate leading-tight ${available ? 'text-neon' : 'text-neon/30'}`}
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          {game.title}
        </div>
        <div className="text-neon/50 text-[9px] tracking-wide mt-1 truncate"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          {game.desc}
        </div>
      </div>

      {/* PLAY 배지 */}
      {available && (
        <div className="absolute top-1.5 right-1.5 bg-neon text-black text-[7px] px-1.5 py-0.5 tracking-widest"
          style={{ fontFamily: '"Press Start 2P",monospace' }}>
          PLAY
        </div>
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
      <rect x={35} y={0} width={10} height={14} fill="#1a1a1a" stroke="#39FF14" strokeWidth={.5}/>
      <rect x={32} y={12} width={16} height={3} fill="#39FF14"/>
      <rect x={35} y={24} width={10} height={20} fill="#1a1a1a" stroke="#39FF14" strokeWidth={.5}/>
      <rect x={32} y={24} width={16} height={3} fill="#39FF14"/>
      <rect x={10} y={18} width={14} height={11} fill="#FFD700"/>
      <rect x={8} y={15} width={5} height={5} fill="#C8A000"/>
      <rect x={17} y={15} width={5} height={5} fill="#C8A000"/>
      <rect x={13} y={21} width={2} height={2} fill="#111"/>
      <rect x={17} y={21} width={2} height={2} fill="#111"/>
      <rect x={14} y={26} width={4} height={2} fill="#FF6B6B"/>
      <rect x={0} y={40} width={60} height={1} fill="#39FF14"/>
    </svg>
  );
}

function OmokPreview() {
  const cols=7, rows=5, px=5, py=4;
  const cw=(60-px*2)/(cols-1), ch=(44-py*2)/(rows-1);
  const stones=[{r:1,c:2,cl:'#39FF14'},{r:2,c:3,cl:'#39FF14'},{r:3,c:4,cl:'#39FF14'},
                {r:2,c:2,cl:'#FF2D55'},{r:3,c:3,cl:'#FF2D55'},{r:1,c:4,cl:'#FF2D55'}];
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full bg-black">
      {Array.from({length:cols},(_,i)=>(
        <line key={`v${i}`} x1={px+i*cw} y1={py} x2={px+i*cw} y2={44-py}
          stroke="rgba(57,255,20,0.38)" strokeWidth={0.6}/>
      ))}
      {Array.from({length:rows},(_,i)=>(
        <line key={`h${i}`} x1={px} y1={py+i*ch} x2={60-px} y2={py+i*ch}
          stroke="rgba(57,255,20,0.38)" strokeWidth={0.6}/>
      ))}
      {stones.map((s,i)=>(
        <circle key={i} cx={px+s.c*cw} cy={py+s.r*ch} r={3.4} fill={s.cl}/>
      ))}
    </svg>
  );
}
