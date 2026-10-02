/**
 * Main-thread handle on the worker-owned SQLite database.
 *
 * The worker is a singleton: the `opfs-sahpool` VFS only permits one instance per
 * origin, so a second worker would fail to initialise the pool.
 */

export type ChatDurability = 'opfs' | 'memory';

let worker: Worker | null = null;
let nextId = 1;
let durable: ChatDurability = 'memory';
let openPromise: Promise<ChatDurability> | null = null;
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./sqlite/chat.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (event: MessageEvent<any>) => {
    const { id, ok, result, error } = event.data ?? {};
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (ok) entry.resolve(result);
    else entry.reject(new Error(error ?? 'Chat database error'));
  };
  worker.onerror = (event) => {
    const message = event.message || 'Chat database worker crashed';
    for (const [, entry] of pending) entry.reject(new Error(message));
    pending.clear();
  };
  return worker;
}

function call<T>(op: string, ...args: any[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, op, args });
  });
}

/** Opens the database. Resolves to 'opfs' for a durable store, 'memory' otherwise. */
export function openChatDb(): Promise<ChatDurability> {
  if (!openPromise) {
    openPromise = call<{ durable: boolean }>('open').then((result) => {
      durable = result.durable ? 'opfs' : 'memory';
      return durable;
    }).catch((err) => {
      openPromise = null;
      throw err;
    });
  }
  return openPromise;
}

export function chatDbIsDurable(): boolean {
  return durable === 'opfs';
}

export function selectAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return call<T[]>('all', sql, params);
}

export function selectOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return call<T | null>('get', sql, params);
}

export function run(sql: string, params: any[] = []): Promise<boolean> {
  return call<boolean>('run', sql, params);
}

/** Runs many writes in a single transaction and a single round trip. */
export function runBatch(statements: Array<[string, any[]]>): Promise<boolean> {
  return call<boolean>('batch', statements);
}

/**
 * Asks the browser to keep the origin's storage. Without this, iOS may evict
 * OPFS under storage pressure, which would silently drop cached history.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted) {
      if (await navigator.storage.persisted()) return true;
    }
    if (navigator.storage?.persist) {
      return await navigator.storage.persist();
    }
  } catch {
    // Storage APIs unavailable (e.g. non-secure context) — nothing to do.
  }
  return false;
}
