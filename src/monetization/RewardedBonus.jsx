import { useEffect, useRef, useState } from 'react';
import { prepareRewardedAd } from './rewardedAds.js';

export default function RewardedBonus({ unitPath, consent, gameId, amount, claimed, onClaim, onConsent, track }) {
  const [phase,setPhase]=useState('idle');
  const [message,setMessage]=useState('');
  const controller=useRef(null);
  const mounted=useRef(false);
  const offered=useRef(false);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;controller.current?.cancel();};},[]);
  useEffect(()=>{if(!consent)controller.current?.cancel();},[consent]);
  useEffect(()=>{if(!offered.current)offered.current=track('reward_ad_offer',{game_id:gameId});},[track,gameId]);
  const request=()=>{
    if(claimed)return;
    if(!offered.current)offered.current=track('reward_ad_offer',{game_id:gameId});
    if(!consent){onConsent();return;}
    if(phase==='ready') {
      if(controller.current?.show()){setPhase('showing');track('reward_ad_show',{game_id:gameId});}
      return;
    }
    if(phase==='loading'||phase==='showing')return;
    setPhase('loading');setMessage('광고를 준비하고 있어요.');
    track('reward_ad_request',{game_id:gameId});
    const ad=prepareRewardedAd({host:window,unitPath});controller.current=ad;
    void ad.ready.then(ready=>{if(mounted.current&&ready){setPhase('ready');setMessage('준비됐어요. 아래 버튼을 누르면 광고를 시청합니다.');track('reward_ad_ready',{game_id:gameId});}});
    void ad.result.then(status=>{
      if(!mounted.current)return;
      if(status==='rewarded') {
        const granted=onClaim();setPhase('done');setMessage(granted?`별사탕 ${amount}개를 더 받았어요!`:'이번 판의 추가 보상은 이미 받았어요.');
        track('reward_ad_result',{game_id:gameId,ad_status:status,reward_amount:granted?amount:0});
      }else{
        setPhase('idle');setMessage(status==='skipped'?'광고를 끝까지 보지 않아 추가 보상은 지급되지 않았어요. 기본 보상은 그대로예요.':status==='cancelled'?'광고 준비를 취소했어요. 기본 보상은 그대로예요.':'지금 볼 수 있는 광고가 없어요. 기본 보상은 이미 받았으니 계속 놀아도 좋아요.');
        track('reward_ad_result',{game_id:gameId,ad_status:status,reward_amount:0});
      }
    });
  };
  return <div className="pg-ad-bonus">
    <button className="pg-secondary" disabled={claimed||phase==='loading'||phase==='showing'||phase==='done'} onClick={request}>{claimed||phase==='done'?'✓ 추가 별사탕 받음':phase==='loading'?'광고 준비 중…':phase==='ready'?`광고 시청하고 +${amount} 받기`:phase==='showing'?'광고 시청 중…':'▷ 광고 보고 별사탕 2배'}</button>
    <p role="status">{message||`선택 사항 · 완료하면 +${amount}개 · 이번 판에 한 번`}</p>
    {(phase==='loading'||phase==='ready')&&<button className="pg-text-button" onClick={()=>controller.current?.cancel()}>광고 안 보고 계속하기</button>}
  </div>;
}
