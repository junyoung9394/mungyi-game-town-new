import { useState } from 'react';

export default function PrivacySettings({ consent, available, onSave, onClose }) {
  const [analytics,setAnalytics]=useState(consent.analytics);
  const [ads,setAds]=useState(consent.ads);
  return <div className="pg-privacy-backdrop"><section className="pg-privacy-dialog" role="dialog" aria-modal="true" aria-label="개인정보와 선택 설정">
    <button className="pg-privacy-close" onClick={onClose} aria-label="개인정보 설정 닫기">×</button>
    <span className="pg-eyebrow">YOUR CHOICE, ALWAYS</span><h2>편안하게 놀 수 있도록</h2>
    <p>놀이 기록·별사탕·꾸미기는 이 브라우저에 저장합니다. 계정과 기기 사이에 공유하지 않으며, 브라우저 데이터를 지우면 없어집니다.</p>
    {available.analytics&&<label className="pg-privacy-option"><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)}/><span><strong>놀이터 개선을 위한 이용 분석 <small>선택</small></strong><span>동의하면 Google Analytics로 게임 선택, 시작·종료, 점수와 플레이 시간, 광고 이용 결과를 전송합니다. 기기·접속 정보와 분석용 쿠키도 사용됩니다. 이벤트에 이름이나 이메일은 넣지 않습니다.</span></span></label>}
    {available.rewarded&&<label className="pg-privacy-option"><input type="checkbox" checked={ads} onChange={e=>setAds(e.target.checked)}/><span><strong>선택형 보상 광고 <small>선택</small></strong><span>동의 후 광고 시청을 직접 선택할 때만 Google 광고 서비스를 불러옵니다. 광고 제공을 위해 기기·접속 정보와 쿠키가 사용될 수 있습니다. 개인 맞춤 광고는 요청하지 않습니다. 보상은 시청 완료가 확인된 경우에만 지급합니다.</span></span></label>}
    {!available.analytics&&!available.rewarded&&<p className="pg-privacy-note">현재 외부 이용 분석과 보상 광고는 사용하지 않습니다.</p>}
    <p>선택 항목에 동의하지 않아도 모든 놀이와 기본 보상을 이용할 수 있습니다. 아래 설정을 바꾸어 언제든 철회할 수 있으며, 이미 얻은 별사탕은 유지됩니다.</p>
    {(available.analytics||available.rewarded)&&<p><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google 개인정보처리방침 ↗</a></p>}
    <div className="pg-privacy-actions"><button className="pg-secondary" onClick={()=>onSave({analytics:false,ads:false})}>필수만 사용</button><button autoFocus className="pg-primary" onClick={()=>onSave({analytics:available.analytics&&analytics,ads:available.rewarded&&ads})}>선택 저장</button></div>
  </section></div>;
}
