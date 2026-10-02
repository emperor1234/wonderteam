import { connect, type Connection } from '@tursodatabase/serverless';

let client: Connection | null = null;
let schemaReady: Promise<void> | null = null;

export function chatDbEnabled(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getChatDb(): Connection {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error('TURSO_DATABASE_URL is not configured');
    }
    client = connect({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function initSchema(): Promise<void> {
  const db = getChatDb();
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS messages (
         id           TEXT PRIMARY KEY,
         seq          INTEGER NOT NULL,
         thread_id    TEXT NOT NULL,
         sender_id    TEXT NOT NULL,
         recipient_id TEXT NOT NULL,
         body         TEXT NOT NULL,
         created_at   TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages (thread_id, seq)`,
      `CREATE TABLE IF NOT EXISTS thread_seq (
         thread_id TEXT PRIMARY KEY,
         next_seq  INTEGER NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS reads (
         thread_id     TEXT NOT NULL,
         reader_id     TEXT NOT NULL,
         last_seen_seq INTEGER NOT NULL DEFAULT 0,
         last_read_seq INTEGER NOT NULL DEFAULT 0,
         PRIMARY KEY (thread_id, reader_id)
       )`,
    ],
    'write'
  );
}

export function ensureChatSchema(): Promise<void> {
  if (!chatDbEnabled()) {
    return Promise.reject(new Error('TURSO_DATABASE_URL is not configured'));
  }
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** Stable thread key: the same pair of users always produces the same thread. */
export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join(':');
}

export function peerOfThreadId(threadId: string, readerId: string): string {
  const separator = threadId.indexOf(':');
  if (separator < 0) return '';
  const left = threadId.slice(0, separator);
  const right = threadId.slice(separator + 1);
  return left === readerId ? right : left;
}

/** The minimum a user record needs for the chat policy checks. */
export interface ChatParticipant {
  id: string;
  role: 'member' | 'admin';
}

/**
 * Who may open a thread with whom. A team lead can reach every member; a member
 * can only reach the team lead. The thread list applies this rule, but a list is
 * only a UI affordance, so every write path has to enforce it too.
 */
export function canMessage(sender: ChatParticipant, recipient: ChatParticipant): boolean {
  if (sender.id === recipient.id) return false;
  return sender.role === 'admin' || recipient.role === 'admin';
}

/**
 * Confirms the caller really is a participant of the requested thread.
 *
 * `peerOfThreadId` returns an empty string for a thread id that has no second
 * participant, so rebuilding the key and comparing strings alone would accept ids
 * such as ":usr_123". Both participants must be present and real instead.
 */
export function resolveThreadPeer(
  threadId: string,
  me: ChatParticipant,
  users: Array<{ id: string }>
): { id: string } | null {
  const parts = String(threadId || '').split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [left, right] = parts;
  if (left !== me.id && right !== me.id) return null;

  const peerId = left === me.id ? right : left;
  if (peerId === me.id) return null;

  return users.find((u) => u.id === peerId) || null;
}

export interface ChatMessage {
  id: string;
  seq: number;
  threadId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}

interface MessageRow {
  id: string;
  seq: number;
  thread_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    seq: Number(row.seq),
    threadId: row.thread_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export interface SendResult {
  id: string;
  seq: number;
  createdAt: string;
  duplicate: boolean;
}

/**
 * Idempotent send. The client generates the primary key, so a retry after a
 * dropped connection resolves to the already-stored row instead of duplicating.
 */
export async function saveMessage(params: {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}): Promise<SendResult> {
  await ensureChatSchema();
  const db = getChatDb();
  const threadId = threadIdFor(params.senderId, params.recipientId);

  const existing = await db.get(
    'SELECT id, seq, created_at FROM messages WHERE id = ?',
    params.id
  );
  if (existing) {
    return {
      id: String(existing.id),
      seq: Number(existing.seq),
      createdAt: String(existing.created_at),
      duplicate: true,
    };
  }

  // A single statement: the upsert and the RETURNING are atomic, so concurrent
  // sends can never be handed the same seq.
  const reserved = await db.get(
    `INSERT INTO thread_seq (thread_id, next_seq) VALUES (?, 1)
     ON CONFLICT (thread_id) DO UPDATE SET next_seq = next_seq + 1
     RETURNING next_seq`,
    threadId
  );
  const seq = Number(reserved.next_seq);

  await db.run(
    `INSERT OR IGNORE INTO messages
       (id, seq, thread_id, sender_id, recipient_id, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params.id,
    seq,
    threadId,
    params.senderId,
    params.recipientId,
    params.body,
    params.createdAt
  );

  // A concurrent request for the same id can win this INSERT OR IGNORE, leaving
  // the seq we just reserved unused. Re-read so the caller is always told about
  // the row that actually persisted.
  const stored = await db.get(
    'SELECT id, seq, created_at FROM messages WHERE id = ?',
    params.id
  );
  if (!stored) {
    throw new Error('Message insert did not persist');
  }

  return {
    id: String(stored.id),
    seq: Number(stored.seq),
    createdAt: String(stored.created_at),
    duplicate: Number(stored.seq) !== seq,
  };
}

export async function listMessages(
  threadId: string,
  sinceSeq: number,
  limit = 200
): Promise<ChatMessage[]> {
  await ensureChatSchema();
  const rows = await getChatDb().all(
    `SELECT id, seq, thread_id, sender_id, recipient_id, body, created_at
     FROM messages
     WHERE thread_id = ? AND seq > ?
     ORDER BY seq ASC
     LIMIT ?`,
    threadId,
    sinceSeq,
    limit
  );
  return (rows as unknown as MessageRow[]).map(toMessage);
}

export interface ReadState {
  lastSeenSeq: number;
  lastReadSeq: number;
}

export async function getReadState(threadId: string, readerId: string): Promise<ReadState> {
  await ensureChatSchema();
  const row = await getChatDb().get(
    `SELECT last_seen_seq, last_read_seq FROM reads
     WHERE thread_id = ? AND reader_id = ?`,
    threadId,
    readerId
  );
  if (!row) return { lastSeenSeq: 0, lastReadSeq: 0 };
  return {
    lastSeenSeq: Number(row.last_seen_seq),
    lastReadSeq: Number(row.last_read_seq),
  };
}

/** Records that a device pulled messages up to seenSeq into its local SQLite. */
export async function markSeen(
  threadId: string,
  readerId: string,
  seenSeq: number
): Promise<void> {
  await ensureChatSchema();
  await getChatDb().run(
    `INSERT INTO reads (thread_id, reader_id, last_seen_seq, last_read_seq)
     VALUES (?, ?, ?, 0)
     ON CONFLICT (thread_id, reader_id) DO UPDATE
       SET last_seen_seq = MAX(last_seen_seq, excluded.last_seen_seq)`,
    threadId,
    readerId,
    seenSeq
  );
}

/** Advances the read cursor. Monotonic: a lower value can never move it back. */
export async function markRead(
  threadId: string,
  readerId: string,
  readSeq: number
): Promise<void> {
  await ensureChatSchema();
  await getChatDb().run(
    `INSERT INTO reads (thread_id, reader_id, last_seen_seq, last_read_seq)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (thread_id, reader_id) DO UPDATE SET
       last_seen_seq = MAX(last_seen_seq, excluded.last_seen_seq),
       last_read_seq = MAX(last_read_seq, excluded.last_read_seq)`,
    threadId,
    readerId,
    readSeq,
    readSeq
  );
}

export interface ThreadSummary {
  threadId: string;
  peerId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

/**
 * Last-message preview plus unread count for every thread the reader participates
 * in. The newest message per thread is the highest seq actually stored, which is
 * not always the last seq allocated: a concurrent duplicate can burn a seq.
 */
export async function listThreadSummaries(readerId: string): Promise<ThreadSummary[]> {
  await ensureChatSchema();
  const db = getChatDb();

  const latestRows = await db.all(
    `SELECT m.thread_id AS thread_id, m.body AS body, m.created_at AS created_at
     FROM messages m
     WHERE m.seq = (
             SELECT MAX(m2.seq) FROM messages m2 WHERE m2.thread_id = m.thread_id
           )
       AND (m.sender_id = ? OR m.recipient_id = ?)`,
    readerId,
    readerId
  );

  const unreadRows = await db.all(
    `SELECT m.thread_id AS thread_id, COUNT(*) AS unread
     FROM messages m
     LEFT JOIN reads r
            ON r.thread_id = m.thread_id
           AND r.reader_id = ?
     WHERE m.sender_id <> ?
       AND m.seq > IFNULL(r.last_read_seq, 0)
     GROUP BY m.thread_id`,
    readerId,
    readerId
  );

  const unreadByThread = new Map<string, number>();
  for (const row of unreadRows as unknown as Array<{ thread_id: string; unread: number }>) {
    unreadByThread.set(row.thread_id, Number(row.unread));
  }

  return (latestRows as unknown as Array<{
    thread_id: string;
    body: string;
    created_at: string;
  }>).map((row) => ({
    threadId: row.thread_id,
    peerId: peerOfThreadId(row.thread_id, readerId),
    lastMessage: row.body,
    lastMessageAt: row.created_at,
    unreadCount: unreadByThread.get(row.thread_id) ?? 0,
  }));
}
