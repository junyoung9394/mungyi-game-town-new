import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound, reduceRound, cloudPosition } from '../src/playground/engine.js';
import { GAMES, readProfile, updateProfile, rewardFor } from '../src/playground/model.js';
const tick=(s,seconds)=>{for(let i=0;i<Math.ceil(seconds/.05);i++)s=reduceRound(s,{type:'tick',dt:.05});return s;};

test('all six rounds stop at 45 seconds and ignore subsequent inputs',()=>{
 for(const game of GAMES){const s=tick(createRound(game.id,42),46);assert.equal(s.status,'finished');assert.ok(s.elapsed<=45);assert.equal(reduceRound(s,{type:'tick',dt:1}),s);}
});
test('pausing freezes the timer and game; resume continues without elapsed catchup',()=>{
 let s=tick(createRound('snack',12),3);s=reduceRound(s,{type:'pause'});const paused=s;
 s=tick(s,10);assert.equal(s,paused);assert.equal(reduceRound(s,{type:'move',x:0}),s);
 s=reduceRound(s,{type:'resume'});s=tick(s,1);assert.ok(s.elapsed<4.1);
});
test('snack catches sweets once and rocks cost a life; outside basket misses',()=>{
 let s=createRound('snack',4);s.items=[{id:0,x:.5,y:.84,rock:false},{id:1,x:.5,y:.84,rock:true},{id:2,x:.9,y:.84,rock:false}];
 s=reduceRound(s,{type:'tick',dt:.01});assert.equal(s.score,10);assert.equal(s.lives,2);assert.equal(s.items.filter(x=>x.id===0).length,0);
 s=reduceRound(s,{type:'tick',dt:.01});assert.equal(s.score,10);
 s=reduceRound(s,{type:'move',x:-100});assert.equal(s.player,.08);
});
test('cloud jump succeeds only in the alignment window; third miss ends round',()=>{
 let s=createRound('cloud');assert.equal(cloudPosition(s),.5);s=reduceRound(s,{type:'jump'});assert.equal(s.score,20);assert.equal(s.level,1);
 for(let i=0;i<3;i++){s={...s,elapsed:(Math.PI/2-s.level*.75+Math.PI*2*(i+1))/2.5,lastAction:-1};s=reduceRound(s,{type:'jump'});}
 assert.equal(s.lives,0);assert.equal(s.status,'finished');
});
test('parcel dispatch rewards the right destination, applies combo, rejects bad inputs',()=>{
 let s=createRound('parcel',42);
 for(let i=0;i<3;i++){s=reduceRound(s,{type:'sort',bin:s.parcel});s=tick(s,.2);}
 assert.equal(s.score,50);assert.equal(s.combo,3);
 s=reduceRound(s,{type:'sort',bin:(s.parcel+1)%3});assert.equal(s.score,45);assert.equal(s.combo,0);
 const score=s.score;s=reduceRound(s,{type:'sort',bin:99});assert.equal(s.score,score);
});
test('memory ignores repeated card, waits on mismatches and can complete all six pairs',()=>{
 let s=createRound('memory',123);const first=0,other=s.cards.findIndex(x=>x!==s.cards[first]);
 s=reduceRound(s,{type:'flip',index:first});assert.equal(reduceRound(s,{type:'flip',index:first}),s);
 s=reduceRound(s,{type:'flip',index:other});assert.equal(s.open.length,2);
 const before=s;assert.equal(reduceRound(s,{type:'flip',index:4}),before);
 s=tick(s,.8);assert.equal(s.open.length,0);
 for(let value=0;value<6;value++)for(const [index,v] of s.cards.entries())if(value===v)s=reduceRound(s,{type:'flip',index});
 assert.equal(s.score,300);assert.equal(s.reason,'complete');assert.equal(s.status,'finished');
});
test('fishing requires a hold and correctly evaluates the moving power gauge',()=>{
 let s=createRound('fishing');s=reduceRound(s,{type:'release'});assert.equal(s.score,0);
 s=reduceRound(s,{type:'hold'});s={...s,power:s.target+.12};s=reduceRound(s,{type:'release'});assert.equal(s.score,30);assert.equal(s.catches,1);
 s=reduceRound(s,{type:'release'});assert.equal(s.score,30);
 s=reduceRound(s,{type:'hold'});s=reduceRound(s,{type:'cancel'});assert.equal(s.holding,false);
 s=reduceRound(s,{type:'hold'});s=reduceRound(s,{type:'pause'});assert.equal(s.holding,false);
});
test('mole can only be hit once; flowers deduct points without going negative',()=>{
 let s={...createRound('mole'),hole:4,flower:false};s=reduceRound(s,{type:'hit',index:4});assert.equal(s.score,15);assert.equal(s.hole,-1);
 s=reduceRound(s,{type:'hit',index:4});assert.equal(s.score,15);
 s={...s,hole:4,flower:true};s=reduceRound(s,{type:'hit',index:4});assert.equal(s.score,5);
 s={...s,hole:2,flower:true};s=reduceRound(s,{type:'hit',index:2});assert.equal(s.score,0);
});
test('seeded rounds are reproducible and memory contains exactly six pairs',()=>{
 assert.deepEqual(createRound('memory',55),createRound('memory',55));
 assert.deepEqual([...createRound('memory',55).cards].sort(),[0,0,1,1,2,2,3,3,4,4,5,5]);
});
test('profile recovers from corrupt or invalid data without inventing coins or skins',()=>{
 assert.equal(readProfile('{oops').coins,0);assert.equal(readProfile('null').skin,'cream');
 const s=readProfile(JSON.stringify({coins:-5,skin:'fake',owned:['fake'],best:{snack:'no'}}));
 assert.equal(s.coins,0);assert.deepEqual(s.owned,['cream']);assert.equal(s.best.snack,0);
});
test('finish reward is paid once, with best score and game count persisted',()=>{
 let s=readProfile(null);const action={type:'finish',id:'round-1',gameId:'snack',score:100,date:'2026-10-04'};
 s=updateProfile(s,action);assert.equal(s.coins,10);assert.equal(s.played,1);assert.equal(s.best.snack,100);
 assert.equal(updateProfile(s,action),s);assert.deepEqual(readProfile(JSON.stringify(s)),s);
 s=updateProfile(s,{...action,id:'round-2',score:20});assert.equal(s.best.snack,100);assert.equal(s.played,2);
 assert.equal(rewardFor(100000),30);
});
test('daily gift is awarded once per local day',()=>{
 let s=updateProfile(readProfile(null),{type:'gift',date:'2026-10-04'});assert.equal(s.coins,20);
 assert.equal(updateProfile(s,{type:'gift',date:'2026-10-04'}),s);
 s=updateProfile(s,{type:'gift',date:'2026-10-05'});assert.equal(s.coins,40);
});
test('cosmetics require enough coins and owned skins can be equipped for free',()=>{
 let s=readProfile(null);assert.equal(updateProfile(s,{type:'skin',id:'mint'}),s);
 s={...s,coins:80};s=updateProfile(s,{type:'skin',id:'mint'});assert.equal(s.coins,30);assert.equal(s.skin,'mint');
 s=updateProfile(s,{type:'skin',id:'cream'});s=updateProfile(s,{type:'skin',id:'mint'});assert.equal(s.coins,30);
 assert.equal(updateProfile(s,{type:'skin',id:'not-real'}),s);
});
