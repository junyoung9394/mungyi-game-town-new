import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, safeEvent } from '../src/monetization/analytics.js';
import { prepareRewardedAd } from '../src/monetization/rewardedAds.js';
import { readConsent, consentRecord } from '../src/monetization/consent.js';
import { capabilities } from '../src/monetization/config.js';
import { readProfile, updateProfile } from '../src/playground/model.js';

test('unconfigured and unconfirmed-audience integrations cannot load',()=>{
 assert.deepEqual(capabilities({audience:'unconfirmed',measurementId:'G-ABCDE12345',rewardedUnit:'/123/game'}),{analytics:false,rewarded:false});
 assert.deepEqual(capabilities({audience:'children',measurementId:'G-ABCDE12345',rewardedUnit:'/123/game'}),{analytics:false,rewarded:false});
 assert.deepEqual(capabilities({audience:'general',measurementId:'wrong',rewardedUnit:'ca-pub-1234'}),{analytics:false,rewarded:false});
 assert.deepEqual(capabilities({audience:'general',measurementId:'G-ABCDE12345',rewardedUnit:'/123/game'}),{analytics:true,rewarded:true});
});
test('consent defaults denied and preserves independent choices',()=>{
 for(const raw of [null,'broken','{}','{"version":1,"analytics":"true"}'])assert.equal(readConsent(raw).analytics,false);
 assert.deepEqual(readConsent(consentRecord({analytics:true,ads:false})),{analytics:true,ads:false,decided:true});
});
test('analytics makes no request or queue before consent, stops after withdrawal',()=>{
 const host={document:{cookie:''},location:{hostname:'example.com'}};let loads=0;
 const a=createAnalytics({host,measurementId:'G-ABCDE12345',enabled:true,loader:async()=>{loads++;}});
 assert.equal(a.track('game_start',{game_id:'snack'}),false);assert.equal(loads,0);assert.equal(host.dataLayer,undefined);
 a.setConsent(true);assert.equal(loads,1);a.setConsent(true);assert.equal(loads,1);
 a.track('game_end',{game_id:'snack',score:30});
 assert.equal(host.dataLayer.filter(e=>e[1]==='playground_visit').length,1);
 const before=host.dataLayer.length;a.setConsent(false);assert.equal(host['ga-disable-G-ABCDE12345'],true);
 const after=host.dataLayer.length;assert.ok(after>before);
 assert.equal(a.track('game_start',{game_id:'snack'}),false);assert.equal(host.dataLayer.length,after);
});
test('analytics allowlist removes unknown events, personal text and nonfinite numbers',()=>{
 assert.equal(safeEvent('purchase',{value:100}),null);
 assert.deepEqual(safeEvent('game_end',{game_id:'snack',score:Infinity,email:'a@b.com',player_name:'Alice',end_reason:'time',duration_seconds:45}),{name:'game_end',params:{game_id:'snack',end_reason:'time',duration_seconds:45}});
});
function fakeGPT({supported=true}={}) {
 const listeners=new Map();let destroyed=0,visible=0;
 const slot={addService(){return slot;}};
 const pubads={setPrivacySettings(){},addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
 const host={googletag:{apiReady:true,cmd:{push(fn){fn();}},pubads:()=>pubads,enums:{OutOfPageFormat:{REWARDED:1}},defineOutOfPageSlot:()=>supported?slot:null,enableServices(){},display(){},destroySlots(){destroyed++;}}};
 const emit=(name,extra={},own=true)=>listeners.get(name)?.({slot:own?slot:{},makeRewardedVisible(){visible++;return true;},...extra});
 return {host,emit,counts:()=>({destroyed,visible,listeners:listeners.size})};
}
test('only grant plus close for the shown, matching slot yields a reward',async()=>{
 const f=fakeGPT();const ad=prepareRewardedAd({host:f.host,unitPath:'/123/reward'});
 f.emit('rewardedSlotReady');assert.equal(await ad.ready,true);assert.equal(ad.show(),true);assert.equal(ad.show(),false);
 f.emit('rewardedSlotGranted');f.emit('rewardedSlotGranted');f.emit('rewardedSlotClosed');
 assert.equal(await ad.result,'rewarded');assert.deepEqual(f.counts(),{destroyed:1,visible:1,listeners:0});
});
test('close without reward and foreign-slot grants never earn coins',async()=>{
 const f=fakeGPT();const ad=prepareRewardedAd({host:f.host,unitPath:'/123/reward'});
 f.emit('rewardedSlotReady');await ad.ready;ad.show();f.emit('rewardedSlotGranted',{},false);f.emit('rewardedSlotClosed');assert.equal(await ad.result,'skipped');
});
test('empty, unsupported, and blocked SDK paths finish without reward',async()=>{
 const f=fakeGPT();const empty=prepareRewardedAd({host:f.host,unitPath:'/123/reward'});f.emit('slotRenderEnded',{isEmpty:true});assert.equal(await empty.result,'empty');
 const unsupported=prepareRewardedAd({host:fakeGPT({supported:false}).host,unitPath:'/123/reward'});assert.equal(await unsupported.ready,false);assert.equal(await unsupported.result,'unavailable');
 const blocked=prepareRewardedAd({host:{},unitPath:'/123/reward',loader:async()=>{throw new Error('blocked');}});assert.equal(await blocked.result,'unavailable');
});
test('cancellation and late provider events cannot issue a reward',async()=>{
 const f=fakeGPT(),abort=new AbortController();const ad=prepareRewardedAd({host:f.host,unitPath:'/123/reward',signal:abort.signal});
 f.emit('rewardedSlotReady');await ad.ready;ad.show();abort.abort();f.emit('rewardedSlotGranted');f.emit('rewardedSlotClosed');assert.equal(await ad.result,'cancelled');assert.equal(f.counts().destroyed,1);
});
test('load timeout never fabricates a completion',async()=>{
 const f=fakeGPT();const ad=prepareRewardedAd({host:f.host,unitPath:'/123/reward',timeoutMs:5});assert.equal(await ad.result,'timeout');
});
test('reward amount comes from saved round, is paid once and survives reload',()=>{
 let p=readProfile(null);assert.equal(updateProfile(p,{type:'ad_bonus',id:'missing'}),p);
 p=updateProfile(p,{type:'finish',id:'r1',gameId:'snack',score:100,date:'2026-10-04'});assert.equal(p.coins,10);
 p=updateProfile(p,{type:'ad_bonus',id:'r1',amount:999999});assert.equal(p.coins,20);
 assert.equal(updateProfile(p,{type:'ad_bonus',id:'r1'}),p);
 p=readProfile(JSON.stringify(p));assert.equal(updateProfile(p,{type:'ad_bonus',id:'r1'}),p);assert.equal(p.coins,20);
});
