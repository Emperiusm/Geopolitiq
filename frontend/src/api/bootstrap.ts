import { api } from './client';

const DB_NAME = 'gambit-cache';
const STORE_NAME = 'bootstrap';
const CACHE_KEY = 'gambit-bootstrap';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── In-memory fallback when IndexedDB is unavailable ────────
let memoryCache: { timestamp: number; data: any } | null = null;

// ── IndexedDB helpers ───────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function isIdbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

// ── Cache read / write (IndexedDB → memory fallback) ────────

interface CacheEntry {
  timestamp: number;
  data: any;
}

async function readCache(): Promise<CacheEntry | null> {
  if (isIdbAvailable()) {
    try {
      const entry = await idbGet<CacheEntry>(CACHE_KEY);
      return entry ?? null;
    } catch (e) {
      console.warn('IndexedDB read failed, using memory fallback', e);
    }
  }
  return memoryCache;
}

async function writeCache(data: any): Promise<void> {
  const entry: CacheEntry = { timestamp: Date.now(), data };
  memoryCache = entry;

  if (isIdbAvailable()) {
    try {
      await idbPut(CACHE_KEY, entry);
    } catch (e) {
      console.warn('IndexedDB write failed, cached in memory only', e);
    }
  }
}

// ── Background refresh (non-blocking) ───────────────────────

function backgroundRefresh(): void {
  api.bootstrap(true)
    .then(data => writeCache(data))
    .catch(e => console.warn('Background bootstrap refresh failed', e));
}

// ── Static snapshot fallback ─────────────────────────────────

async function loadStaticSnapshot(): Promise<any | null> {
  try {
    const res = await fetch('/bootstrap-snapshot.json');
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────

export async function fetchBootstrap(force = false, at?: string): Promise<any> {
  // Historical snapshots are never cached
  if (at) {
    return api.bootstrap(true, at);
  }

  // Try serving from cache first
  if (!force) {
    const cached = await readCache();
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL) {
        // Cache is fresh — serve immediately, refresh in background
        backgroundRefresh();
        return cached.data;
      }
      // Cache is stale but exists — serve it and refresh
      backgroundRefresh();
      return cached.data;
    }

    // No cache — try build-time static snapshot for instant first paint
    const snapshot = await loadStaticSnapshot();
    if (snapshot) {
      // Serve snapshot immediately, live fetch replaces in background
      backgroundRefresh();
      return snapshot;
    }
  }

  // No cache or forced refresh — fetch and cache
  const data = await api.bootstrap(true);
  await writeCache(data);
  return data;
}
