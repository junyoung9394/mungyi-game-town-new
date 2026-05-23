const SAVE_KEY = 'mungyi_town_save';

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') || { coins: 0 }; } catch { return { coins: 0 }; }
}

export function addCoins(amount) {
  if (!amount || amount <= 0) return;
  try {
    const s = loadSave();
    s.coins = (s.coins || 0) + amount;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}
