import { useEffect, useRef, useState } from 'react';
import RankingBoard from './components/RankingBoard';
import { ACHIEVEMENT_DEFS } from './utils/useAchievements';

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
  { id: 'runner',       title: 'RUNNER',         desc: '장애물을 피해 달려라!', available: true, preview: <RunnerPreview />, hot: true },
  { id: 'flappy',       title: 'FLAPPY 무명이', desc: '하늘을 날아라',        available: true, preview: <FlappyPreview /> },
  { id: 'tetris',       title: 'TETRIS',          desc: '줄을 없애라',          available: true, preview: <TetrisPreview /> },
  { id: 'snake',        title: 'NEON SNAKE',      desc: '먹이를 먹어라',        available: true, preview: <SnakePreview /> },
  { id: 'brickBreaker', title: 'NEON BRICKS',     desc: '벽돌을 모두 부숴라',   available: true, preview: <BrickPreview /> },
  { id: 'omok',         title: 'NEON OMOK',       desc: '5목으로 승부하라',     available: true, preview: <OmokPreview /> },
];

/* ── 스트릭 배너 ───────────────────────────────────── */
function StreakBanner({ streak, attendedToday, onClaim }) {
  const [claimed, setClaimed] = useState(false);
  const flames = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : streak >= 1 ? '🔥' : '❄️';

  const handleClaim = () => {
    const n = onClaim();
    if (n > 0) setClaimed(true);
  };

  return (
    <div className="mx-3 mb-2 flex items-center justify-between px-3 py-2.5"
      style={{ border: '1px solid rgba(251,146,60,0.35)', background: 'rgba(251,146,60,0.07)' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-lg leading-none">{flames}</span>
        <div>
          <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#fb923c', lineHeight: 1.6 }}>
            {streak > 0 ? `${streak}일 연속 접속` : '오늘 첫 접속!'}
          </div>
          {streak > 0 && (
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 7, color: 'rgba(251,146,60,0.5)' }}>
              {streak >= 7 ? '🏆 7일 달성! 대단해요' : streak >= 3 ? '👏 3일 달성!' : `계속하면 +보너스`}
            </div>
          )}
        </div>
      </div>
      {attendedToday || claimed ? (
        <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: 'rgba(251,146,60,0.5)' }}>
          ✓ 완료
        </span>
      ) : (
        <button
          onClick={handleClaim}
          style={{
            fontFamily: '"Press Start 2P",monospace', fontSize: 8,
            background: '#fb923c', color: '#000', border: 'none',
            padding: '6px 10px', cursor: 'pointer', letterSpacing: 1,
          }}>
          출석 +30
        </button>
      )}
    </div>
  );
}

/* ── 데일리 미션 카드 ──────────────────────────────── */
function DailyMissionCard({ mission, completed, onGo }) {
  if (!mission) return null;
  return (
    <div className="mx-3 mb-3 px-3 py-2.5"
      style={{ border: '1px solid rgba(168,85,247,0.35)', background: 'rgba(168,85,247,0.07)' }}>
      <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 7, color: 'rgba(196,181,255,0.55)', marginBottom: 6 }}>
        ⚡ 오늘의 미션
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{mission.emoji}</span>
          <div>
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#c4b5fd', lineHeight: 1.6 }}>
              {mission.label}
            </div>
            <div style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: 'rgba(196,181,255,0.7)' }}>
              {mission.goal}{mission.unit} 달성 → +{mission.reward}🪙
            </div>
          </div>
        </div>
        {completed ? (
          <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: '#a855f7' }}>✓ 달성!</span>
        ) : (
          <button
            onClick={() => onGo(mission.gameId)}
            style={{
              fontFamily: '"Press Start 2P",monospace', fontSize: 8,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff',
              border: 'none', padding: '6px 10px', cursor: 'pointer', letterSpacing: 1,
            }}>
            ▶ GO
          </button>
        )}
      </div>
    </div>
  );
}

/* ── 업적 섹션 ─────────────────────────────────────── */
function AchievementsSection({ unlocked }) {
  const [open, setOpen] = useState(false);
  const count = Object.keys(unlocked).length;
  const total = Object.keys(ACHIEVEMENT_DEFS).length;

  return (
    <div className="mx-3 mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ border: '1px solid rgba(57,255,20,0.2)', background: 'rgba(57,255,20,0.04)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 9, color: '#39FF14' }}>
            업적 {count}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {Object.entries(ACHIEVEMENT_DEFS).slice(0, 6).map(([id]) => (
              <span key={id} className="text-[10px]" style={{ opacity: unlocked[id] ? 1 : 0.2 }}>
                {ACHIEVEMENT_DEFS[id].icon}
              </span>
            ))}
          </div>
          <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 8, color: 'rgba(57,255,20,0.5)' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {open && (
        <div className="border border-t-0 border-neon/20 bg-black/60 px-3 py-3 grid grid-cols-3 gap-2">
          {Object.entries(ACHIEVEMENT_DEFS).map(([id, def]) => (
            <div key={id}
              className="flex flex-col items-center gap-1 py-2 px-1 text-center"
              style={{
                background: unlocked[id] ? 'rgba(57,255,20,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${unlocked[id] ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.05)'}`,
                opacity: unlocked[id] ? 1 : 0.4,
              }}>
              <span className="text-xl">{def.icon}</span>
              <span style={{ fontFamily: '"Press Start 2P",monospace', fontSize: 6, color: unlocked[id] ? '#39FF14' : '#666', lineHeight: 1.5 }}>
                {def.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 메인 로비 ────────────────────────────────────── */
export default function GameLobby({
  onSelect, user,
  streak = 0, attendedToday = false, onClaimStreak,
  mission, missionCompleted,
  achievements = {},
}) {
  return (
    <div className="absolute inset-0 bg-black overflow-y-auto">

      {/* 수평 광고 – 최상단 */}
      <div className="w-full bg-black/50 border-b border-neon/10">
        <AdUnit slot="8080905265" style={{ minHeight: 50 }} />
      </div>

      {/* 타이틀 */}
      <div className="px-4 pt-4 pb-2 text-center">
        <div
          className="text-neon title-glow-pulse text-xl tracking-widest leading-loose"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          무명이<br/>게임 타운
        </div>
        <div
          className="text-neon/50 text-[9px] tracking-widest mt-1"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {user?.displayName
            ? `PLAYER: ${user.displayName.slice(0, 12).toUpperCase()}`
            : 'PIXEL ARCADE · EST.2026'}
        </div>
      </div>

      {/* 구분선 */}
      <div className="mx-4 h-px bg-neon/20 mb-3" />

      {/* 스트릭 배너 */}
      <StreakBanner streak={streak} attendedToday={attendedToday} onClaim={onClaimStreak} />

      {/* 데일리 미션 */}
      <DailyMissionCard mission={mission} completed={missionCompleted} onGo={onSelect} />

      {/* 구분선 */}
      <div className="mx-4 h-px bg-neon/20 mb-3" />

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
      <div className="mx-4 h-px bg-neon/20 mb-3" />

      {/* 업적 */}
      <AchievementsSection unlocked={achievements} />

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

      {/* PLAY 배지 or HOT 배지 */}
      {available && (
        <div
          className="absolute top-1.5 right-1.5 text-[7px] px-1.5 py-0.5 tracking-widest"
          style={{
            fontFamily: '"Press Start 2P",monospace',
            background: game.hot ? 'linear-gradient(135deg,#a855f7,#e879f9)' : '#39FF14',
            color: '#000',
            boxShadow: game.hot ? '0 0 8px rgba(168,85,247,0.8)' : undefined,
          }}>
          {game.hot ? '🔥NEW' : 'PLAY'}
        </div>
      )}
    </button>
  );
}

/* ── 프리뷰 SVG ───────────────────────────────────── */
function RunnerPreview() {
  return (
    <svg viewBox="0 0 60 44" className="w-full h-full" style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}>
      {/* 배경 그라데이션 */}
      <defs>
        <linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0015"/>
          <stop offset="100%" stopColor="#1a0035"/>
        </linearGradient>
      </defs>
      <rect width="60" height="44" fill="url(#rsky)"/>
      {/* 별 */}
      {[{x:5,y:4},{x:18,y:7},{x:30,y:3},{x:45,y:8},{x:52,y:5},{x:10,y:14},{x:38,y:12},{x:55,y:16}].map((s,i)=>
        <rect key={i} x={s.x} y={s.y} width={1} height={1} fill="rgba(255,255,255,0.7)"/>)}
      {/* 달 */}
      <circle cx={53} cy={6} r={4} fill="#e8d5ff"/>
      <circle cx={55} cy={4} r={3} fill="#1a0035"/>
      {/* 산 */}
      <polygon points="0,32 8,18 16,32" fill="#2a1a4a"/>
      <polygon points="10,32 20,14 30,32" fill="#2a1a4a"/>
      <polygon points="22,32 34,16 46,32" fill="#3d2a60"/>
      <polygon points="35,32 48,20 60,32" fill="#3d2a60"/>
      {/* 지면 */}
      <rect x="0" y="32" width="60" height="12" fill="#4c1d95"/>
      <rect x="0" y="32" width="60" height="2" fill="#8b5cf6"/>
      {/* 격자선 */}
      <line x1="0" y1="32" x2="-5" y2="44" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5"/>
      <line x1="15" y1="32" x2="10" y2="44" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5"/>
      <line x1="30" y1="32" x2="25" y2="44" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5"/>
      <line x1="45" y1="32" x2="40" y2="44" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5"/>
      <line x1="60" y1="32" x2="55" y2="44" stroke="rgba(139,92,246,0.3)" strokeWidth="0.5"/>
      {/* 캐릭터 */}
      <rect x="10" y="17" width="8" height="6" fill="#f0abfc"/>
      <rect x="10" y="16" width="9" height="2" fill="#c026d3"/>
      <rect x="8" y="23" width="12" height="9" fill="#e879f9"/>
      <rect x="5" y="24" width="4" height="6" fill="#f0abfc"/>
      <rect x="20" y="24" width="4" height="6" fill="#f0abfc"/>
      <rect x="10" y="32" width="4" height="5" fill="#c026d3"/>
      <rect x="14" y="32" width="4" height="5" fill="#c026d3"/>
      <rect x="8" y="36" width="7" height="2" fill="#fde68a"/>
      <rect x="14" y="37" width="7" height="2" fill="#fde68a"/>
      {/* 장애물 스파이크 */}
      <polygon points="38,32 42,22 46,32" fill="#dc2626"/>
      <polygon points="44,32 48,24 52,32" fill="#dc2626"/>
      {/* 코인 */}
      <circle cx="32" cy="26" r="3" fill="#fbbf24"/>
      <circle cx="32" cy="26" r="2" fill="#f59e0b"/>
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
