import { loadScript } from './loadScript.js';

// Google Ad Manager rewarded web API. A normal AdSense slot is not a rewarded slot.
// Reference: googleads/google-publisher-tag-samples, display-rewarded-ad/sample.ts.
export function prepareRewardedAd({ host, unitPath, signal, loader=loadScript, timeoutMs=15000, showTimeoutMs=180000 }) {
  let slot=null,pubads=null,readyEvent=null,earned=false,shown=false,done=false,timer;
  const listeners=[];
  let resolveReady,resolveResult;
  const ready=new Promise(resolve=>{resolveReady=resolve;});
  const result=new Promise(resolve=>{resolveResult=resolve;});
  const finish=status=>{
    if(done)return;
    done=true;clearTimeout(timer);
    signal?.removeEventListener('abort',cancel);
    for(const [name,fn] of listeners)pubads?.removeEventListener(name,fn);
    if(slot)host.googletag?.destroySlots([slot]);
    resolveReady(false);resolveResult(status);
  };
  const cancel=()=>finish('cancelled');
  const show=()=>{
    if(done||shown||!readyEvent)return false;
    try{
      shown=true;
      if(readyEvent.makeRewardedVisible()===false){finish('unavailable');return false;}
      if(!done){clearTimeout(timer);timer=setTimeout(()=>finish('timeout'),showTimeoutMs);}
      return true;
    }catch{finish('error');return false;}
  };
  if(signal?.aborted){cancel();return {ready,result,show,cancel};}
  signal?.addEventListener('abort',cancel,{once:true});
  timer=setTimeout(()=>finish('timeout'),timeoutMs);
  host.googletag=host.googletag||{cmd:[]};
  const initialize=()=>{
    if(done)return;
    try{
      const tag=host.googletag;
      pubads=tag.pubads();
      pubads.setPrivacySettings({nonPersonalizedAds:true});
      slot=tag.defineOutOfPageSlot(unitPath,tag.enums.OutOfPageFormat.REWARDED);
      if(!slot){finish('unavailable');return;}
      slot.addService(pubads);
      const listen=(name,fn)=>{
        const own=e=>{if(!done&&e.slot===slot)fn(e);};
        listeners.push([name,own]);pubads.addEventListener(name,own);
      };
      listen('rewardedSlotReady',e=>{readyEvent=e;clearTimeout(timer);resolveReady(true);});
      listen('rewardedSlotGranted',()=>{if(shown)earned=true;});
      listen('rewardedSlotClosed',()=>finish(earned?'rewarded':'skipped'));
      listen('slotRenderEnded',e=>{if(e.isEmpty)finish('empty');});
      tag.enableServices();tag.display(slot);
    }catch{finish('error');}
  };
  host.googletag.cmd.push(initialize);
  if(!host.googletag.apiReady)void loader(host,'mongle-gpt','https://securepubads.g.doubleclick.net/tag/js/gpt.js').catch(()=>finish('unavailable'));
  return {ready,result,show,cancel};
}
