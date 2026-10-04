import { GAMES } from './model.js';

function random(s) { s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0; return s.seed/4294967296; }
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function message(s,text,good=true) { s.message=text;s.good=good;s.messageId++;s.messageUntil=s.elapsed+1; }
function finish(s,reason) { s.status='finished';s.reason=reason;return s; }
export function createRound(gameId,seed=1) {
  if (!GAMES.some(g=>g.id===gameId)) throw new Error('Unknown game');
  const s={gameId,seed:seed>>>0,status:'playing',elapsed:0,duration:45,score:0,lives:3,message:'준비됐죠? 시작!',good:true,messageId:0,messageUntil:1.5,
    player:.5,items:[],spawnIn:.2,nextId:0,level:0,lastAction:-1,combo:0,parcel:0,
    cards:[],open:[],matched:[],hideAt:0,holding:false,power:0,target:.45,catches:0,
    hole:-1,flower:false,holeUntil:0};
  s.parcel=Math.floor(random(s)*3);
  s.cards=Array.from({length:12},(_,i)=>i%6);
  for(let i=s.cards.length-1;i>0;i--) {const j=Math.floor(random(s)*(i+1));[s.cards[i],s.cards[j]]=[s.cards[j],s.cards[i]];}
  return s;
}
export function cloudPosition(s) { return .5+.32*Math.sin(s.elapsed*2.5+s.level*.75); }
export function reduceRound(state,action) {
  if (action.type==='pause' && state.status==='playing') return {...state,status:'paused',holding:false};
  if (action.type==='resume' && state.status==='paused') return {...state,status:'playing'};
  if (state.status!=='playing') return state;
  const s={...state};
  if (action.type==='tick') {
    const dt=clamp(action.dt,0,.1);
    s.elapsed=Math.min(s.duration,s.elapsed+dt);
    if(s.gameId==='snack') {
      s.spawnIn-=dt;
      let items=s.items.map(item=>({...item,y:item.y+dt*(.2+s.elapsed*.002)}));
      if(s.spawnIn<=0) {
        items.push({id:s.nextId++,x:.08+random(s)*.84,y:-.08,rock:random(s)<.23});
        s.spawnIn=.7;
      }
      items=items.filter(item=>{
        if(item.y>=.83 && item.y<.95 && Math.abs(item.x-s.player)<.115) {
          if(item.rock){s.lives--;message(s,'앗, 돌멩이!',false);}else{s.score+=10;message(s,'냠냠! +10');}
          return false;
        }
        return item.y<1.1;
      });
      s.items=items;
    }
    if(s.gameId==='memory' && s.hideAt && s.elapsed>=s.hideAt) {s.open=[];s.hideAt=0;}
    if(s.gameId==='fishing' && s.holding) s.power=(s.power+dt*.65)%2;
    if(s.gameId==='mole') {
      if(s.hole>=0 && s.elapsed>=s.holeUntil) s.hole=-1;
      s.spawnIn-=dt;
      if(s.spawnIn<=0) {
        s.hole=Math.floor(random(s)*9);s.flower=random(s)<.25;
        s.holeUntil=s.elapsed+Math.max(.5,1-s.elapsed*.01);s.spawnIn=1.12;
      }
    }
    if(s.lives<=0) return finish(s,'lives');
    if(s.elapsed>=s.duration) return finish(s,'time');
    return s;
  }
  if(action.type==='move' && s.gameId==='snack') {s.player=clamp(action.x,.08,.92);return s;}
  if(action.type==='jump' && s.gameId==='cloud' && s.elapsed-s.lastAction>=.4) {
    s.lastAction=s.elapsed;
    if(Math.abs(cloudPosition(s)-.5)<=.125) {s.score+=20;s.level++;message(s,'퐁! 한 층 더 +20');}
    else {s.lives--;message(s,'앗, 구름을 놓쳤어요!',false);}
  }
  if(action.type==='sort' && s.gameId==='parcel' && [0,1,2].includes(action.bin) && s.elapsed-s.lastAction>=.14) {
    s.lastAction=s.elapsed;
    if(action.bin===s.parcel) {s.combo++;const points=15+Math.min(15,Math.floor(s.combo/3)*5);s.score+=points;message(s,`${s.combo}연속 배달! +${points}`);}
    else {s.combo=0;s.score=Math.max(0,s.score-5);message(s,'주소를 다시 확인해요 −5',false);}
    s.parcel=Math.floor(random(s)*3);
  }
  if(action.type==='flip' && s.gameId==='memory') {
    const i=action.index;
    if(!Number.isInteger(i)||i<0||i>=12||s.open.length===2||s.open.includes(i)||s.matched.includes(i)) return state;
    s.open=[...s.open,i];
    if(s.open.length===2) {
      if(s.cards[s.open[0]]===s.cards[s.open[1]]) {
        s.matched=[...s.matched,...s.open];s.open=[];s.score+=50;message(s,'꼭 닮은 짝꿍! +50');
        if(s.matched.length===12) return finish(s,'complete');
      }else {s.hideAt=s.elapsed+.75;message(s,'어디 있었더라?',false);}
    }
  }
  if(action.type==='hold' && s.gameId==='fishing' && !s.holding) {s.holding=true;s.power=0;}
  if(action.type==='cancel' && s.gameId==='fishing') s.holding=false;
  if(action.type==='release' && s.gameId==='fishing' && s.holding) {
    s.holding=false;
    const power=s.power<=1?s.power:2-s.power;
    if(power>=s.target && power<=s.target+.24) {
      const perfect=Math.abs(power-(s.target+.12))<.055;
      const points=perfect?30:20;s.score+=points;s.catches++;message(s,perfect?'월척이다! +30':'낚았다! +20');
    }else message(s,'살짝 놓쳤어요. 다시 도전!',false);
    s.target=.18+random(s)*.48;
  }
  if(action.type==='hit' && s.gameId==='mole' && action.index===s.hole && s.hole>=0) {
    if(s.flower){s.score=Math.max(0,s.score-10);message(s,'꽃은 아껴주세요 −10',false);}
    else {s.score+=15;message(s,'꼬물! 잡았다 +15');}
    s.hole=-1;
  }
  return s.lives<=0?finish(s,'lives'):s;
}
