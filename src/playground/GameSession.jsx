import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createRound, reduceRound, cloudPosition } from './engine';
import { rewardFor } from './model';
import RewardedBonus from '../monetization/RewardedBonus';
import { Mongle, Cloud } from './Art';

const FRUITS=['🍓','🍋','🍒','🥕','🍇','🍪'];
const PARCELS=[{icon:'🌱',name:'초록 정원',key:'←'},{icon:'🍪',name:'간식 가게',key:'↑'},{icon:'🧸',name:'장난감 집',key:'→'}];

export default function GameSession({ game, session, skin, best, onFinish, onRetry, onHome, playSound, onProgress, monetization }) {
  const [state, dispatch]=useReducer(reduceRound,null,()=>createRound(game.id,session.seed));
  const stateRef=useRef(state);
  const reported=useRef(false);
  const previousMessage=useRef(0);
  const swipe=useRef(null);
  useEffect(()=>{stateRef.current=state;onProgress?.({elapsed:state.elapsed,finished:state.status==='finished'});},[state,onProgress]);
  useEffect(()=>{
    if(state.status!=='playing') return;
    let last=performance.now(),raf;
    const frame=now=>{dispatch({type:'tick',dt:(now-last)/1000});last=now;raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);
    return ()=>cancelAnimationFrame(raf);
  },[state.status]);
  useEffect(()=>{
    const pause=()=>dispatch({type:'pause'});
    const visibility=()=>{if(document.hidden)pause();};
    window.addEventListener('blur',pause);document.addEventListener('visibilitychange',visibility);
    return ()=>{window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(state.status==='finished'&&!reported.current) {reported.current=true;onFinish(state.score,{duration_seconds:Math.round(state.elapsed),end_reason:state.reason});}
  },[state.status,state.score,state.elapsed,state.reason,onFinish]);
  useEffect(()=>{
    if(state.messageId>previousMessage.current){previousMessage.current=state.messageId;playSound(state.good?'good':'miss');}
  },[state.messageId,state.good,playSound]);
  useEffect(()=>{
    const down=e=>{
      if(e.target.closest?.('input,textarea,select'))return;
      if(e.key==='Escape'){e.preventDefault();dispatch({type:stateRef.current.status==='paused'?'resume':'pause'});return;}
      if(stateRef.current.status!=='playing')return;
      if(game.id==='snack' && ['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();dispatch({type:'move',x:stateRef.current.player+(e.key==='ArrowLeft'?-.06:.06)});}
      if(game.id==='cloud' && e.code==='Space'){e.preventDefault();if(!e.repeat)dispatch({type:'jump'});}
      if(game.id==='parcel' && ['ArrowLeft','ArrowUp','ArrowRight'].includes(e.key)){e.preventDefault();if(!e.repeat)dispatch({type:'sort',bin:['ArrowLeft','ArrowUp','ArrowRight'].indexOf(e.key)});}
      if(game.id==='fishing' && e.code==='Space'){e.preventDefault();if(!e.repeat)dispatch({type:'hold'});}
      if(game.id==='mole' && /^[1-9]$/.test(e.key)){e.preventDefault();if(!e.repeat)dispatch({type:'hit',index:Number(e.key)-1});}
    };
    const up=e=>{if(game.id==='fishing'&&e.code==='Space'){e.preventDefault();dispatch({type:'release'});}};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[game.id]);
  const moveBasket=useCallback(e=>{
    const box=e.currentTarget.getBoundingClientRect();dispatch({type:'move',x:(e.clientX-box.left)/box.width});
  },[]);
  const remaining=Math.max(0,Math.ceil(game.duration-state.elapsed));
  const active=state.status==='playing';
  const stars=Math.min(3,Math.floor(state.score/game.goal*3));
  const needle=state.power<=1?state.power:2-state.power;
  return <section className={`pg-session ${game.color}`} aria-label={`${game.name} 게임`}>
    <div className="pg-session-title"><button className="pg-icon-button" onClick={()=>dispatch({type:'pause'})} aria-label="게임 일시정지">Ⅱ</button><div><span>{game.tag} 놀이터</span><h1>{game.name}</h1></div><span className="pg-game-symbol" aria-hidden="true">{game.icon}</span></div>
    <div className="pg-game-hud"><div><span>이번 기록</span><strong data-testid="score">{state.score}<small>점</small></strong></div><div className={remaining<=10?'pg-time hurry':'pg-time'}><span>남은 시간</span><strong>{remaining}<small>초</small></strong></div><div><span>{['snack','cloud'].includes(game.id)?'남은 기회':'목표 기록'}</span><strong className="pg-lives">{['snack','cloud'].includes(game.id)?'♥'.repeat(Math.max(0,state.lives)):<>{game.goal}<small>점</small></>}</strong></div></div>
    <div className="pg-round-progress" role="progressbar" aria-label="남은 라운드 시간" aria-valuemin={0} aria-valuemax={45} aria-valuenow={remaining}><i style={{width:`${remaining/45*100}%`}} /></div>
    <div className={`pg-playfield pg-${game.id}`}>
      {game.id==='snack'&&<div className="pg-snack-field" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);moveBasket(e);}} onPointerMove={moveBasket}>
        <Cloud className="pg-scene-cloud one"/><Cloud className="pg-scene-cloud two"/>
        {state.items.map(item=><span className={`pg-falling ${item.rock?'rock':''}`} key={item.id} style={{left:`${item.x*100}%`,top:`${item.y*100}%`}} aria-label={item.rock?'돌멩이':'간식'}>{item.rock?'🪨':['🍪','🍓','🍋'][item.id%3]}</span>)}
        <div className="pg-basket-player" style={{left:`${state.player*100}%`}}><Mongle color={skin.color}/><div className="pg-basket">▥</div></div><div className="pg-ground"/>
      </div>}
      {game.id==='cloud'&&<div className="pg-cloud-field">
        <Cloud className="pg-scene-cloud one"/><span className="pg-climb-count">☁ {state.level}층 올라왔어요</span><div className="pg-jump-guide"/>
        <div className={`pg-moving-cloud ${Math.abs(cloudPosition(state)-.5)<=.125?'aligned':''}`} style={{left:`${cloudPosition(state)*100}%`}}><Cloud/><span>{Math.abs(cloudPosition(state)-.5)<=.125?'지금 점프!':'다가오는 구름'}</span></div>
        <div key={state.level} className="pg-jumper"><Mongle color={skin.color} happy={state.level>0}/><Cloud/></div>
        <button className="pg-action-button" onClick={()=>dispatch({type:'jump'})} disabled={!active}>퐁! 점프하기 ↑</button>
      </div>}
      {game.id==='parcel'&&<div className="pg-parcel-field">
        <span className="pg-combo">{state.combo>=3?`🔥 ${state.combo}연속! 보너스 배달`:'같은 그림의 집으로 배달해요'}</span>
        <div className="pg-parcel-stage" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);swipe.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{if(!swipe.current)return;const dx=e.clientX-swipe.current.x,dy=e.clientY-swipe.current.y;swipe.current=null;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;if(Math.abs(dx)>Math.abs(dy))dispatch({type:'sort',bin:dx<0?0:2});else if(dy<0)dispatch({type:'sort',bin:1});}} onPointerCancel={()=>{swipe.current=null;}}>
          <Mongle color={skin.color}/><div className="pg-package" key={state.lastAction}><span aria-label={`${PARCELS[state.parcel].name} 소포`}>{PARCELS[state.parcel].icon}</span><small>TO. {PARCELS[state.parcel].name}</small></div>
        </div>
        <div className="pg-parcel-bins">{PARCELS.map((bin,i)=><button key={bin.name} onClick={()=>dispatch({type:'sort',bin:i})} disabled={!active}><span>{bin.icon}</span><strong>{bin.name}</strong><small>{bin.key}</small></button>)}</div>
      </div>}
      {game.id==='memory'&&<div className="pg-memory-field"><p>찾은 짝꿍 <strong>{state.matched.length/2} / 6</strong></p><div className="pg-memory-grid">{state.cards.map((card,i)=>{
        const shown=state.open.includes(i)||state.matched.includes(i),matched=state.matched.includes(i);
        return <button className={`${shown?'revealed':''} ${matched?'matched':''}`} key={i} aria-label={`${i+1}번 카드${shown?` ${FRUITS[card]}`:' 뒤집기'}${matched?' 짝 찾음':''}`} disabled={!active||shown||state.open.length===2} onClick={()=>dispatch({type:'flip',index:i})}><span>{shown?FRUITS[card]:'✿'}</span>{matched&&<small>✓</small>}</button>;
      })}</div></div>}
      {game.id==='fishing'&&<div className="pg-fishing-field"><span className="pg-climb-count">🐟 {state.catches}마리와 만났어요</span><div className="pg-lake-scene"><Mongle color={skin.color}/><div className="pg-fishing-rod"/><div className="pg-water"><span className="pg-float">●</span><span className="pg-fish">🐟</span><i/><i/></div></div><div className="pg-fishing-meter" aria-label="초록 구간에서 놓으세요"><span style={{left:`${state.target*100}%`,width:'24%'}}/><i style={{left:`${needle*100}%`}}/></div><p>찌가 초록 구간에 오면 손을 놓아요!</p><button className={`pg-action-button ${state.holding?'holding':''}`} disabled={!active} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);dispatch({type:'hold'});}} onPointerUp={()=>dispatch({type:'release'})} onPointerCancel={()=>dispatch({type:'cancel'})} onLostPointerCapture={()=>dispatch({type:'cancel'})}>{state.holding?'지금 놓아볼까요?':'꾹 눌러 낚시하기'}</button></div>}
      {game.id==='mole'&&<div className="pg-mole-field"><p>두더지는 톡! <span>🌼 꽃은 그대로</span></p><div className="pg-mole-grid">{Array.from({length:9},(_,i)=><button key={i} aria-label={`${i+1}번 ${state.hole===i?(state.flower?'꽃':'두더지'):'빈 굴'}`} disabled={!active} onClick={()=>dispatch({type:'hit',index:i})}><span className="pg-hole"/>{state.hole===i&&(state.flower?<span className="pg-hole-flower">🌼</span>:<span className="pg-mole-body"><i/><b>• ᴥ •</b></span>)}<small>{i+1}</small></button>)}</div></div>}
      <div className={`pg-feedback ${state.good?'':'miss'}`} aria-live="polite">{state.elapsed<state.messageUntil?state.message:'\u00a0'}</div>
    </div>
    <p className="pg-control-hint">{game.control} <span>· Esc 일시정지</span></p>
    {state.status==='paused'&&<div className="pg-game-overlay"><div className="pg-soft-dialog" role="dialog" aria-modal="true" aria-label="일시정지"><Mongle color={skin.color}/><span className="pg-eyebrow">TAKE A LITTLE BREAK</span><h2>잠깐 쉬어가요</h2><p>시간도 몽글이도 잠시 멈췄어요.</p><button autoFocus className="pg-primary" onClick={()=>dispatch({type:'resume'})}>이어서 놀기 ▷</button><button className="pg-text-button" onClick={onHome}>이번 판 그만하고 놀이터로</button><small>진행 중인 판은 기록·보상이 저장되지 않아요.</small></div></div>}
    {state.status==='finished'&&<div className="pg-game-overlay"><div className="pg-soft-dialog pg-result" role="region" aria-label="게임 결과"><div className="pg-result-stars" aria-label={`별 ${stars}개`}>{[1,2,3].map(i=><span key={i} className={i<=stars?'earned':''}>★</span>)}</div><Mongle color={skin.color} happy/><span className="pg-eyebrow">{state.reason==='complete'?'ALL FRIENDS FOUND!':'A LITTLE MOMENT OF JOY'}</span><h2>{state.reason==='complete'?'짝꿍을 모두 찾았어요!':state.score>=game.goal?'몽글이도 깜짝 놀랐어요!':'함께 놀아서 즐거웠어요!'}</h2><div className="pg-result-numbers"><div><small>이번 기록</small><strong>{state.score}<em>점</em></strong></div><div><small>나의 최고</small><strong>{Math.max(best,state.score)}<em>점</em></strong></div></div><div className="pg-round-reward">✦ 별사탕 <strong>+{rewardFor(state.score)}</strong> 모았어요!</div>{monetization?.enabled&&<RewardedBonus unitPath={monetization.unitPath} consent={monetization.consent} gameId={game.id} amount={rewardFor(state.score)} claimed={monetization.claimed} onClaim={monetization.claim} onConsent={monetization.openConsent} track={monetization.track}/> }<button autoFocus className="pg-primary" onClick={onRetry}>한 판 더 놀기 ↻</button><button className="pg-text-button" onClick={onHome}>다른 놀이 고르기 →</button></div></div>}
  </section>;
}
