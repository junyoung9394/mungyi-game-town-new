export const CONSENT_KEY='mongle_privacy_v1';
export function readConsent(raw) {
  try {
    const value=JSON.parse(raw);
    if(value?.version!==1)return {analytics:false,ads:false,decided:false};
    return {analytics:value.analytics===true,ads:value.ads===true,decided:value.decided===true};
  }catch{return {analytics:false,ads:false,decided:false};}
}
export function consentRecord(value) {
  return JSON.stringify({version:1,analytics:value.analytics===true,ads:value.ads===true,decided:true});
}
