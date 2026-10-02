/**
 * SQLite runs here, inside a dedicated Worker, because OPFS is only reachable
 * from a Worker context. The main thread talks to this module over postMessage.
 *
 * The `opfs-sahpool` VFS is used rather than the default `opfs` VFS because it
 * does not require COOP/COEP response headers, which would have forced
 * cross-origin isolation on the whole app and blocked the Google Fonts request
 * in index.html. Its trade-off is that only one instance per origin may hold the
 * pool, which is acceptable for an installed PWA.
 */
import initSqlite, { type Sqlite3Static } from '@sqlite.org/sqlite-wasm';

const DB_NAME = '/wonderteam_chat.db';
const SCHEMA_VERSION = 1;

let sqlite3: Sqlite3Static | null = null;
let db: any = null;
let durable = false;

type Request = { id: number; op: string; args: any[] };

function createSchema(target: any): void {
  target.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id                TEXT PRIMARY KEY,
      seq               INTEGER,
      thread_id         TEXT NOT NULL,
      sender_id         TEXT NOT NULL,
      recipient_id      TEXT NOT NULL,
      body              TEXT NOT NULL,
      client_created_at TEXT NOT NULL,
      server_created_at TEXT,
      local_only        INTEGER NOT NULL DEFAULT 1,
      send_attempts     INTEGER NOT NULL DEFAULT 0,
      last_error        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_messages_thread
      ON messages (thread_id, seq, client_created_at);
    CREATE TABLE IF NOT EXISTS threads (
      thread_id       TEXT PRIMARY KEY,
      last_seq        INTEGER NOT NULL DEFAULT 0,
      last_read_seq   INTEGER NOT NULL DEFAULT 0,
      peer_last_seen  INTEGER NOT NULL DEFAULT 0,
      peer_last_read  INTEGER NOT NULL DEFAULT 0,
      updated_at      TEXT
    );
  `);

  const version = target.selectValue('PRAGMA user_version');
  if (Number(version) < SCHEMA_VERSION) {
    target.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

function openDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    (sqlite3 as any).installOpfsSAHPoolVfs({
      // Room for the database, its journal, WAL, shm and temp files.
      initialCapacity: 12,
      directory: 'wonderteam-chat',
    })
      .then((pool: any) => {
        // Paths must be absolute for this VFS.
        db = new pool.OpfsSAHPoolDb(DB_NAME);
        createSchema(db);
        durable = true;
        resolve();
      })
      .catch((err: unknown) => {
        // No OPFS: private browsing, an older Safari, or a second tab already
        // holding the pool. Fall back to memory so chat still works, and report
        // the degradation so the UI can warn that history is not persisted.
        try {
          db = new (sqlite3 as any).oo1.DB(':memory:');
          createSchema(db);
          durable = false;
          resolve();
        } catch (fallbackErr) {
          reject(fallbackErr instanceof Error ? fallbackErr : new Error(String(err)));
        }
      });
  });
}

async function handle(request: Request): Promise<any> {
  switch (request.op) {
    case 'open':
      return { durable };

    case 'all': {
      const [sql, params] = request.args as [string, any[]];
      return db.selectObjects(sql, params ?? []);
    }

    case 'get': {
      const [sql, params] = request.args as [string, any[]];
      return db.selectObject(sql, params ?? []) ?? null;
    }

    case 'run': {
      const [sql, params] = request.args as [string, any[]];
      db.run(sql, params ?? []);
      return true;
    }

    // One round trip for many writes, wrapped in a transaction so a partially
    // applied sync can never be observed.
    case 'batch': {
      const [statements] = request.args as [Array<[string, any[]]>];
      db.exec('BEGIN');
      try {
        for (const [sql, params] of statements) {
          db.prepare(sql).bind(params ?? []).stepFinalize();
        }
        db.exec('COMMIT');
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // The transaction may already have been rolled back by SQLite.
        }
        throw err;
      }
      return true;
    }

    case 'exec': {
      const [sql] = request.args as [string];
      db.exec(sql);
      return true;
    }

    default:
      throw new Error(`Unknown chat database op: ${request.op}`);
  }
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const { id, op, args } = event.data;
  try {
    if (op !== 'open' && !db) {
      throw new Error('Chat database is not open');
    }
    if (op === 'open' && !db) {
      sqlite3 = await initSqlite();
      await openDatabase();
    }
    const result = await handle({ id, op, args });
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
