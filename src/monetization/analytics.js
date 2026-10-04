import { loadScript } from './loadScript.js';

const EVENTS=new Set(['playground_visit','game_select','game_start','game_retry','game_end','game_abandon','daily_gift_claim','skin_unlock','skin_equip','reward_ad_offer','reward_ad_request','reward_ad_ready','reward_ad_show','reward_ad_result']);
const FIELDS=new Set(['game_id','score','duration_seconds','end_reason','skin_id','coin_cost','reward_amount','ad_status']);
export function safeEvent(name,params={}) {
  if(!EVENTS.has(name))return null;
  const clean={};
  for(const [key,value] of Object.entries(params)) {
    if(!FIELDS.has(key))continue;
    if(typeof value==='number'&&Number.isFinite(value))clean[key]=Math.max(0,Math.min(1000000,value));
    if(typeof value==='string'&&/^[a-z0-9_]{1,40}$/.test(value))clean[key]=value;
  }
  return {name,params:clean};
}
export function createAnalytics({ host, measurementId, enabled, loader=loadScript }) {
  let consent=false,started=false,visitSent=false;
  function command() { host.dataLayer=host.dataLayer||[];host.dataLayer.push(arguments); }
  const valid=enabled&&/^G-[A-Z0-9]{5,}$/.test(measurementId);
  const track=(name,params)=>{
    const event=safeEvent(name,params);
    if(!valid||!consent||!event)return false;
    command('event',event.name,event.params);return true;
  };
  const setConsent=allowed=>{
    consent=allowed===true;
    if(!valid)return;
    host[`ga-disable-${measurementId}`]=!consent;
    if(!consent) {
      if(started)command('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      // Remove first-party GA cookies when withdrawing analytics consent.
      const names=(host.document.cookie||'').split(';').map(c=>c.trim().split('=')[0]).filter(n=>/^_ga(?:_|$)/.test(n));
      for(const name of names){
        host.document.cookie=`${name}=; Max-Age=0; path=/`;
        const labels=host.location.hostname.split('.');
        for(let i=0;i<labels.length-1;i++)host.document.cookie=`${name}=; Max-Age=0; path=/; domain=${labels.slice(i).join('.')}`;
      }
      return;
    }
    if(!started) {
      started=true;
      command('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      command('js',new Date());
      command('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      command('config',measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
      // No Google request is made until explicit analytics consent.
      void loader(host,'mongle-ga',`https://www.googletagmanager.com/gtag/js?id=${measurementId}`).catch(()=>{started=false;});
    }else command('consent','update',{analytics_storage:'granted'});
    if(!visitSent){visitSent=true;track('playground_visit');}
  };
  return {track,setConsent};
}
