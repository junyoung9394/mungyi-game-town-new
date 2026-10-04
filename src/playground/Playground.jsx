import { useCallback, useEffect, useRef, useState } from 'react';
import { GAMES, SKINS, PROFILE_KEY, readProfile, updateProfile, localDate } from './model';
import { Mongle, HeroArt, GameArt } from './Art';
import GameSession from './GameSession';
import { monetizationConfig, capabilities } from '../monetization/config';
import { createAnalytics } from '../monetization/analytics';
import { CONSENT_KEY, readConsent, consentRecord } from '../monetization/consent';
import PrivacySettings from '../monetization/PrivacySettings';
import './playground.css';

function initialProfile() { try{return readProfile(localStorage.getItem(PROFILE_KEY));}catch{return readProfile(null);} }

export default function Playground() {
  const [profile,setProfile]=useState(initialProfile);
  const available=capabilities(monetizationConfig);
  const [consent,setConsent]=useState(()=>{try{return readConsent(localStorage.getItem(CONSENT_KEY));}catch{return readConsent(null);}});
  const [privacyOpen,setPrivacyOpen]=useState(false);
  const [analytics]=useState(()=>createAnalytics({host:window,measurementId:monetizationConfig.measurementId,enabled:available.analytics}));
  const statsRef=useRef({elapsed:0,finished:false});
  const abandoned=useRef(new Set());
  useEffect(()=>{analytics.setConsent(consent.analytics);},[analytics,consent.analytics]);
  const saveConsent=value=>{const next={...value,decided:true};setConsent(next);analytics.setConsent(next.analytics);try{localStorage.setItem(CONSENT_KEY,consentRecord(next));}catch{ /* This visit still respects the choice. */ }setPrivacyOpen(false);};
  const profileRef=useRef(profile);
  const [saved,setSaved]=useState(true);
  const [tab,setTab]=useState('play');
  const [category,setCategory]=useState('전체');
  const [selected,setSelected]=useState(null);
  const [session,setSession]=useState(null);
  const [toast,setToast]=useState('');
  const audioRef=useRef(null);
  const apply=useCallback(action=>{
    const next=updateProfile(profileRef.current,action);
    if(next===profileRef.current)return false;
    profileRef.current=next;setProfile(next);
    try{localStorage.setItem(PROFILE_KEY,JSON.stringify(next));setSaved(true);}catch{setSaved(false);}
    return true;
  },[]);
  const playSound=useCallback(kind=>{
    if(!profileRef.current.sound)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      const ctx=audioRef.current||(audioRef.current=new Audio());
      void ctx.resume();const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type='sine';oscillator.frequency.setValueAtTime(kind==='miss'?240:650,ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(kind==='miss'?180:980,ctx.currentTime+.12);
      gain.gain.setValueAtTime(.055,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.2);
      oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.2);
    }catch{ /* Sound is optional on browsers that block audio. */ }
  },[]);
  useEffect(()=>()=>{if(audioRef.current)void audioRef.current.close();},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2800);return ()=>clearTimeout(timer);},[toast]);
  const skin=SKINS.find(s=>s.id===profile.skin)||SKINS[0];
  const game=GAMES.find(g=>g.id===selected);
  const abandon=useCallback(()=>{
    if(!session||statsRef.current.finished||abandoned.current.has(session.id))return;
    abandoned.current.add(session.id);
    analytics.track('game_abandon',{game_id:selected,duration_seconds:Math.round(statsRef.current.elapsed),end_reason:'user_exit'});
  },[analytics,session,selected]);
  useEffect(()=>{const leaving=event=>{if(!event.persisted)abandon();};window.addEventListener('pagehide',leaving);return ()=>window.removeEventListener('pagehide',leaving);},[abandon]);
  const start=()=>{if(session&&statsRef.current.finished)analytics.track('game_retry',{game_id:selected});abandon();playSound('good');statsRef.current={elapsed:0,finished:false};analytics.track('game_start',{game_id:selected});setSession({id:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0]});window.scrollTo({top:0});};
  const home=()=>{abandon();setSession(null);setSelected(null);setTab('play');};
  const finish=useCallback((score,details)=>{
    if(!session||!selected)return;
    statsRef.current.finished=true;
    if(apply({type:'finish',id:session.id,gameId:selected,score,date:new Date().toISOString()}))analytics.track('game_end',{game_id:selected,score,...details});
  },[session,selected,apply,analytics]);
  const onProgress=useCallback(stats=>{statsRef.current=stats;},[]);
  const select=id=>{abandon();analytics.track('game_select',{game_id:id});setSelected(id);setSession(null);window.scrollTo({top:0});};
  const changeTab=value=>{abandon();setTab(value);setSelected(null);setSession(null);};
  const claimGift=()=>{if(apply({type:'gift',date:localDate()})){analytics.track('daily_gift_claim',{reward_amount:20});setToast('오늘의 별사탕 20개를 받았어요 ✦');playSound('good');}};
  const equipSkin=id=>{const owned=profileRef.current.owned.includes(id),cost=SKINS.find(s=>s.id===id)?.price||0;if(apply({type:'skin',id})){analytics.track(owned?'skin_equip':'skin_unlock',{skin_id:id,coin_cost:owned?0:cost});setToast('새로운 색으로 갈아입었어요!');playSound('good');}};
  const giftAvailable=profile.gift!==localDate();
  return <div className="playground">
    <header className="pg-header"><button className="pg-brand" onClick={home} aria-label="몽글이 게임 타운 홈"><Mongle color={skin.color}/><span>몽글이<small>GAME TOWN</small></span></button>
      {!session&&<nav className="pg-nav" aria-label="주 메뉴">{[['play','놀이터'],['records','나의 기록'],['closet','몽글이 꾸미기']].map(([id,label])=><button key={id} className={tab===id&&!selected?'active':''} onClick={()=>changeTab(id)}>{label}</button>)}</nav>}
      <div className="pg-header-tools"><button className="pg-sound" aria-label={profile.sound?'효과음 끄기':'효과음 켜기'} aria-pressed={profile.sound} onClick={()=>{apply({type:'sound'});playSound('good');}}>{profile.sound?'♫':'♪'}<span>{profile.sound?'ON':'OFF'}</span></button><div className="pg-wallet" aria-label={`별사탕 ${profile.coins}개`}><span>✦</span> {profile.coins.toLocaleString()}</div></div>
    </header>
    <main className={`pg-main ${selected?'pg-main-game':''}`}>
      {!selected&&tab==='play'&&<>
        <section className="pg-hero"><div className="pg-hero-copy"><span className="pg-eyebrow"><i/> A SOFT LITTLE PLAYGROUND</span><h1>오늘도, 몽글몽글<br/><em>즐거운 한 판!</em></h1><p>바쁜 하루에 작은 쉼표 하나.<br/>몽글이와 가볍게 놀고, 기분 좋은 기록을 남겨요.</p><button className="pg-primary" onClick={()=>select('snack')}>몽글이랑 놀러 가기 <span>↗</span></button><div className="pg-hero-details"><span>◷ 한 판 45초</span><span>♡ 한 손으로 가볍게</span></div></div><HeroArt color={skin.color}/><span className="pg-hero-sticker">오늘의 기분<br/><strong>말랑 ☺</strong></span></section>
        <section className="pg-daily-row" aria-label="오늘의 선물"><div className="pg-daily-icon">🎁</div><div><strong>오늘도 와줘서 반가워요!</strong><p>{giftAvailable?'작은 선물, 별사탕 20개를 준비했어요.':'오늘의 선물을 받았어요. 내일 또 만나요!'}</p></div><button disabled={!giftAvailable} onClick={claimGift}>{giftAvailable?'선물 받기 +20':'✓ 받았어요'}</button></section>
        <section className="pg-library"><div className="pg-section-heading"><div><span className="pg-eyebrow">PICK YOUR LITTLE JOY</span><h2>어떤 놀이부터 해볼까요?<span>6</span></h2></div><p>작은 도전, 커다란 즐거움</p></div>
          <div className="pg-filters" role="group" aria-label="놀이 분류">{['전체','순발력','타이밍','기억력'].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c==='전체'?'✳ 전체 놀이':c}</button>)}</div>
          <div className="pg-game-grid">{GAMES.filter(g=>category==='전체'||g.tag===category).map((g,index)=><button key={g.id} className={`pg-game-card ${g.color}`} onClick={()=>select(g.id)} aria-label={`${g.name} 놀이 선택`}><div className="pg-card-art"><span className="pg-card-duration">◷ 45초</span>{index===0&&category==='전체'&&<span className="pg-recommend">처음이라면 추천!</span>}<GameArt id={g.id} color={skin.color}/></div><div className="pg-card-copy"><span className="pg-card-tag">{g.tag}</span><h3>{g.name}</h3><p>{g.short}</p><div className="pg-card-footer"><span>{profile.best[g.id]>0?`나의 최고 ${profile.best[g.id]}점`:'새로운 기록을 기다려요'}</span><span className="pg-card-arrow">↗</span></div></div></button>)}</div>
        </section>
        <section className="pg-closet-banner"><Mongle color={skin.color}/><div><span className="pg-eyebrow">MAKE IT YOURS</span><h2>나만의 몽글이와 함께</h2><p>한 판씩 모은 별사탕으로 새로운 색을 만나보세요.</p></div><button className="pg-secondary" onClick={()=>setTab('closet')}>꾸미러 가기 →</button></section>
      </>}
      {!selected&&tab==='records'&&<section className="pg-personal"><span className="pg-eyebrow">YOUR LITTLE ACHIEVEMENTS</span><h1>차곡차곡, 나의 기록</h1><p>어제보다 한 걸음 더. 작은 도전들을 모았어요.</p><div className="pg-summary"><div><span>함께한 놀이</span><strong>{profile.played}<small>판</small></strong></div><div><span>모은 별사탕</span><strong>{profile.coins}<small>개</small></strong></div><div><span>나만의 몽글이</span><strong>{profile.owned.length}<small>가지</small></strong></div></div><div className="pg-record-grid">{GAMES.map(g=><button key={g.id} onClick={()=>select(g.id)} className={g.color}><GameArt id={g.id} color={skin.color}/><div><span>{g.name}</span><strong>{profile.best[g.id]}<small>점</small></strong><p>기록에 다시 도전하기 ↗</p></div></button>)}</div>{profile.played===0&&<p className="pg-empty-note">아직 첫 기록을 기다리고 있어요. 마음에 드는 놀이를 골라보세요!</p>}</section>}
      {!selected&&tab==='closet'&&<section className="pg-personal"><span className="pg-eyebrow">A COLOR FOR EVERY MOOD</span><h1>오늘의 몽글이는 무슨 색?</h1><p>놀이가 끝나면 별사탕 5~30개를 받아요. 마음에 드는 색으로 꾸며보세요.</p><div className="pg-skin-grid">{SKINS.map(s=>{const owned=profile.owned.includes(s.id),equipped=profile.skin===s.id,affordable=profile.coins>=s.price;return <article key={s.id} className={equipped?'selected':''}><div style={{background:s.color+'66'}}><Mongle color={s.color} happy={equipped}/></div><h2>{s.name}</h2><p>{owned?'함께하는 친구':`✦ 별사탕 ${s.price}개`}</p><button className={equipped?'pg-secondary':'pg-primary'} disabled={equipped||(!owned&&!affordable)} onClick={()=>equipSkin(s.id)}>{equipped?'✓ 지금 함께하는 중':owned?'이 색으로 갈아입기':affordable?`✦ ${s.price}개로 데려오기`:`${s.price-profile.coins}개 더 모으면 만나요`}</button></article>;})}</div></section>}
      {game&&!session&&<section className={`pg-game-intro ${game.color}`}><button className="pg-text-button pg-back" onClick={home}>← 놀이터로 돌아가기</button><div className="pg-intro-art"><GameArt id={game.id} color={skin.color}/></div><span className="pg-eyebrow">{game.tag} · 45초 놀이</span><h1>{game.name}</h1><p>{game.how}</p><div className="pg-how"><div><span>이렇게 놀아요</span><strong>{game.control}</strong></div><div><span>작은 힌트</span><strong>{game.tip}</strong></div></div><button className="pg-primary" onClick={start}>준비됐어요, 시작! ▷</button><small>완주하면 별사탕 보상 · 최고 기록은 이 브라우저에 저장돼요</small></section>}
      {game&&session&&<GameSession key={session.id} game={game} session={session} skin={skin} best={profile.best[game.id]} onFinish={finish} onRetry={start} onHome={home} playSound={playSound} onProgress={onProgress} monetization={{enabled:available.rewarded,unitPath:monetizationConfig.rewardedUnit,consent:consent.ads,claimed:profile.rounds.some(r=>r.id===session.id&&r.adBonusClaimed),claim:()=>apply({type:'ad_bonus',id:session.id}),openConsent:()=>setPrivacyOpen(true),track:analytics.track}}/>}
    </main>
    <footer className="pg-footer"><div><span>✿</span> 몽글이 게임 타운 <small>작은 놀이가 만드는 포근한 하루</small></div><p>{saved?'기록과 별사탕은 이 브라우저에 저장돼요.':'브라우저 저장 공간을 사용할 수 없어, 이번 방문 동안만 기록이 유지돼요.'}</p><button className="pg-privacy-link" onClick={()=>setPrivacyOpen(true)}>개인정보·선택 설정</button></footer>
    {(available.analytics||available.rewarded)&&!consent.decided&&!privacyOpen&&<aside className="pg-consent-banner" aria-label="선택 설정 안내"><div><strong>원하는 만큼만 함께해요</strong><p>선택형 광고·이용 분석은 동의 후에만 사용해요. 동의하지 않아도 모든 게임을 즐길 수 있어요.</p></div><button className="pg-secondary" onClick={()=>saveConsent({analytics:false,ads:false})}>필수만 사용</button><button className="pg-primary" onClick={()=>setPrivacyOpen(true)}>설정하기</button></aside>}
    {privacyOpen&&<PrivacySettings consent={consent} available={available} onSave={saveConsent} onClose={()=>setPrivacyOpen(false)}/>}
    {toast&&<div className="pg-toast" role="status">{toast}</div>}
  </div>;
}
