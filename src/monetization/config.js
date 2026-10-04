// Public deployment settings only. Vite embeds these values in the browser bundle.
const settings=import.meta.env||{};
export const monetizationConfig = {
  audience: settings.VITE_MONETIZATION_AUDIENCE || 'unconfirmed',
  measurementId: settings.VITE_GA_MEASUREMENT_ID || '',
  rewardedUnit: settings.VITE_REWARDED_AD_UNIT_PATH || '',
};
export function capabilities(config) {
  const general=config.audience==='general';
  return {
    analytics:general && /^G-[A-Z0-9]{5,}$/.test(config.measurementId),
    rewarded:general && /^\/\d+\/[A-Za-z0-9_./-]+$/.test(config.rewardedUnit),
  };
}
