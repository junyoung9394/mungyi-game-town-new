export const GAMES = [
  { id:'snack', name:'냠냠 간식 바구니', tag:'순발력', color:'peach', icon:'🍪', duration:45, goal:100, short:'떨어지는 간식을 쏙쏙!', how:'바구니를 좌우로 움직여 간식을 받아요. 돌멩이는 피해주세요!', control:'드래그 · ← → 방향키', tip:'돌멩이를 3번 받으면 한 판이 끝나요.' },
  { id:'cloud', name:'퐁퐁 구름 점프', tag:'타이밍', color:'sky', icon:'☁', duration:45, goal:160, short:'구름 따라 폴짝폴짝', how:'움직이는 구름이 몽글이 바로 위에 왔을 때 점프해요.', control:'화면 버튼 탭 · Space', tip:'가운데 점선에 맞춰요. 구름을 3번 놓치면 끝!' },
  { id:'parcel', name:'콩닥 택배 가게', tag:'순발력', color:'mint', icon:'📦', duration:45, goal:300, short:'누구에게 온 선물일까?', how:'상자의 그림을 보고 같은 그림의 바구니로 보내주세요.', control:'좌·우·위 스와이프 · 방향키 · 바구니 탭', tip:'연속으로 맞히면 보너스! 틀리면 5점이 줄어요.' },
  { id:'memory', name:'도란도란 짝꿍 찾기', tag:'기억력', color:'lavender', icon:'🍓', duration:45, goal:300, short:'꼭 닮은 친구를 찾아봐', how:'카드 두 장을 뒤집어 같은 그림을 찾아요. 여섯 쌍을 모두 찾으면 성공!', control:'카드 탭 · Tab으로 선택 후 Enter', tip:'서로 다른 카드는 잠깐 보여주고 다시 뒤집혀요.' },
  { id:'fishing', name:'느긋느긋 낚시터', tag:'타이밍', color:'aqua', icon:'🐟', duration:45, goal:180, short:'살짝 기다렸다가, 낚았다!', how:'낚시 버튼을 꾹 누르다가 찌가 초록 구간에 들어오면 놓아요.', control:'버튼 길게 누른 뒤 놓기 · Space 길게 누르기', tip:'초록 구간의 한가운데를 맞히면 더 큰 점수!' },
  { id:'mole', name:'꼬물꼬물 두더지', tag:'순발력', color:'rose', icon:'🌱', duration:45, goal:180, short:'꼬물! 얼굴이 보이면 톡', how:'고개를 내민 두더지를 톡톡 눌러주세요. 꽃은 건드리지 말아요!', control:'두더지 탭 · 숫자키 1~9', tip:'두더지는 +15점, 꽃은 −10점이에요.' },
];
export const SKINS = [
  { id:'cream', name:'바닐라 몽글', color:'#fff6d9', price:0 },
  { id:'berry', name:'딸기 몽글', color:'#ffc9d3', price:30 },
  { id:'mint', name:'민트 몽글', color:'#bce8d1', price:50 },
  { id:'lavender', name:'라벤더 몽글', color:'#d7c9f5', price:80 },
];
export const PROFILE_KEY='mongle_playground_v1';
const integer=(value)=>Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
export function readProfile(raw) {
  let value;
  try { value=JSON.parse(raw || '{}'); } catch { value={}; }
  if (!value || typeof value!=='object') value={};
  const owned=[...new Set(['cream',...(Array.isArray(value.owned)?value.owned:[]).filter(id=>SKINS.some(s=>s.id===id))])];
  return { coins:integer(value.coins), played:integer(value.played), owned,
    skin:owned.includes(value.skin)?value.skin:'cream',
    best:Object.fromEntries(GAMES.map(g=>[g.id,integer(value.best?.[g.id])])),
    rounds:Array.isArray(value.rounds)?value.rounds.filter(r=>r && typeof r.id==='string' && GAMES.some(g=>g.id===r.gameId) && Number.isFinite(r.score)).slice(0,50).map(r=>({id:r.id,gameId:r.gameId,score:integer(r.score),date:r.date,...(r.adBonusClaimed===true?{adBonusClaimed:true}:{})})):[],
    gift:typeof value.gift==='string'?value.gift:'', sound:value.sound===true,
  };
}
export function rewardFor(score) { return 5+Math.min(25,Math.floor(integer(score)/20)); }
export function updateProfile(profile, action) {
  if (action.type==='finish') {
    if (profile.rounds.some(r=>r.id===action.id) || !GAMES.some(g=>g.id===action.gameId)) return profile;
    const score=integer(action.score);
    return {...profile,coins:profile.coins+rewardFor(score),played:profile.played+1,
      best:{...profile.best,[action.gameId]:Math.max(profile.best[action.gameId]||0,score)},
      rounds:[{id:action.id,gameId:action.gameId,score,date:action.date},...profile.rounds].slice(0,50)};
  }
  if (action.type==='ad_bonus') {
    const round=profile.rounds.find(r=>r.id===action.id);
    if (!round || round.adBonusClaimed) return profile;
    return {...profile,coins:profile.coins+rewardFor(round.score),
      rounds:profile.rounds.map(r=>r.id===action.id?{...r,adBonusClaimed:true}:r)};
  }
  if (action.type==='skin') {
    const skin=SKINS.find(s=>s.id===action.id);
    if (!skin || (!profile.owned.includes(skin.id) && profile.coins<skin.price)) return profile;
    const owned=profile.owned.includes(skin.id);
    return {...profile,skin:skin.id,coins:profile.coins-(owned?0:skin.price),owned:owned?profile.owned:[...profile.owned,skin.id]};
  }
  if (action.type==='gift' && action.date && profile.gift!==action.date) return {...profile,coins:profile.coins+20,gift:action.date};
  if (action.type==='sound') return {...profile,sound:!profile.sound};
  return profile;
}
export function localDate(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
