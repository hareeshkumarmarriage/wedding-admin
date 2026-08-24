const STORAGE_KEY = "wedding-event-unlocked-v2";
type UnlockMap = Record<string, number>;
const TTL = 30 * 60 * 1000;

function readUnlocks(): UnlockMap {
  try { const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function writeUnlocks(value: UnlockMap) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {} }
export function isEventUnlocked(event: string) { const stamp = readUnlocks()[event]; return Boolean(stamp && Date.now() - stamp < TTL); }
export function unlockEvent(event: string) { if (!event) return; const value = readUnlocks(); value[event] = Date.now(); writeUnlocks(value); }
export function lockEvent(event: string) { const value = readUnlocks(); delete value[event]; writeUnlocks(value); }
