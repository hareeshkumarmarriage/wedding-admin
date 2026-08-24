export interface GuestbookMessage {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

const FAVORITES_KEY = "wedding-gallery-favorites-v1";
const GUESTBOOK_KEY = "wedding-guestbook-v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private/restricted browsers.
  }
}

export function getFavoriteIds(event: string): string[] {
  const all = readJson<Record<string, string[]>>(FAVORITES_KEY, {});
  return all[event] ?? [];
}

export function toggleFavorite(event: string, photoId: string): boolean {
  const all = readJson<Record<string, string[]>>(FAVORITES_KEY, {});
  const current = new Set(all[event] ?? []);

  if (current.has(photoId)) {
    current.delete(photoId);
  } else {
    current.add(photoId);
  }

  all[event] = Array.from(current);
  writeJson(FAVORITES_KEY, all);
  return current.has(photoId);
}

export function getGuestbookMessages(): GuestbookMessage[] {
  return readJson<GuestbookMessage[]>(GUESTBOOK_KEY, []);
}

export function addGuestbookMessage(
  name: string,
  message: string
): GuestbookMessage {
  const item: GuestbookMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
  };

  const messages = getGuestbookMessages();
  messages.unshift(item);
  writeJson(GUESTBOOK_KEY, messages.slice(0, 100));
  return item;
}
