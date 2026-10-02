import {
  openChatDb,
  requestPersistentStorage,
  run,
  runBatch,
  selectAll,
  selectOne,
  type ChatDurability,
} from './chat-db.ts';

const OUTBOX_KEY = 'wonderteam_chat_outbox';
const MAX_MESSAGES_PER_THREAD = 500;

export type TickStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface LocalMessage {
  id: string;
  seq: number | null;
  threadId: string;
  senderId: string;
  recipientId: string;
  body: string;
  clientCreatedAt: string;
  serverCreatedAt: string | null;
  localOnly: number;
  lastError: string | null;
}

export interface OutboxEntry {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
}

/** Same rule the server uses, so both sides derive identical thread keys. */
export function threadIdFor(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function readOutbox(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: OutboxEntry[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked; the in-SQLite copy still holds the message.
  }
}

/**
 * Newest last, with unsent messages kept at the end so an optimistic bubble
 * never jumps above messages that have already been delivered.
 */
const ORDER_BY = `ORDER BY CASE WHEN seq IS NULL THEN 1 ELSE 0 END, seq, client_created_at`;

export async function initChatStore(): Promise<ChatDurability> {
  const durability = await openChatDb();
  void requestPersistentStorage();
  await reconcileOutbox();
  return durability;
}

/**
 * Re-inserts outbox entries missing from SQLite. The `opfs-sahpool` VFS discards
 * its files if it fails to initialise, and this build has no opt-out, so the
 * outbox is mirrored in localStorage to make that recoverable.
 */
async function reconcileOutbox(): Promise<void> {
  const entries = readOutbox();
  if (entries.length === 0) return;

  const missing: OutboxEntry[] = [];
  for (const entry of entries) {
    const existing = await selectOne<{ id: string }>(
      'SELECT id FROM messages WHERE id = ?',
      [entry.id]
    );
    if (!existing) missing.push(entry);
  }
  if (missing.length === 0) return;

  await runBatch(
    missing.map((entry) => [
      `INSERT OR IGNORE INTO messages
         (id, seq, thread_id, sender_id, recipient_id, body,
          client_created_at, server_created_at, local_only, send_attempts)
       VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, 1, 0)`,
      [
        entry.id,
        entry.threadId,
        entry.senderId,
        entry.recipientId,
        entry.body,
        entry.createdAt,
      ],
    ])
  );
}

export async function listMessages(threadId: string): Promise<LocalMessage[]> {
  return selectAll<LocalMessage>(
    `SELECT id, seq, thread_id AS threadId, sender_id AS senderId,
            recipient_id AS recipientId, body, client_created_at AS clientCreatedAt,
            server_created_at AS serverCreatedAt, local_only AS localOnly,
            last_error AS lastError
     FROM messages
     WHERE thread_id = ? ${ORDER_BY}`,
    [threadId]
  );
}

export interface ThreadCursor {
  threadId: string;
  lastSeq: number;
  lastReadSeq: number;
  peerLastSeen: number;
  peerLastRead: number;
}

export async function getThreadCursor(threadId: string): Promise<ThreadCursor> {
  const row = await selectOne<any>(
    `SELECT thread_id AS threadId, last_seq AS lastSeq, last_read_seq AS lastReadSeq,
            peer_last_seen AS peerLastSeen, peer_last_read AS peerLastRead
     FROM threads WHERE thread_id = ?`,
    [threadId]
  );
  return (
    row ?? {
      threadId,
      lastSeq: 0,
      lastReadSeq: 0,
      peerLastSeen: 0,
      peerLastRead: 0,
    }
  );
}

/**
 * Counts what is still queued for retry. The outbox is the source of truth here
 * rather than a `local_only` row count: a message the server permanently
 * rejected stays on the device so its failure can be shown, but it is no longer
 * queued, and counting it as pending would leave a stuck total on screen forever.
 */
export function pendingCount(): Promise<number> {
  return Promise.resolve(readOutbox().length);
}

export function pendingForThread(threadId: string): Promise<number> {
  return Promise.resolve(readOutbox().filter((e) => e.threadId === threadId).length);
}

/** Writes the message locally first, then queues it for the network. */
export async function queueMessage(params: {
  senderId: string;
  recipientId: string;
  body: string;
}): Promise<LocalMessage> {
  const entry: OutboxEntry = {
    id: crypto.randomUUID(),
    threadId: threadIdFor(params.senderId, params.recipientId),
    senderId: params.senderId,
    recipientId: params.recipientId,
    body: params.body,
    createdAt: new Date().toISOString(),
  };

  await run(
    `INSERT INTO messages
       (id, seq, thread_id, sender_id, recipient_id, body,
        client_created_at, server_created_at, local_only, send_attempts)
     VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, 1, 0)`,
    [entry.id, entry.threadId, entry.senderId, entry.recipientId, entry.body, entry.createdAt]
  );

  writeOutbox([...readOutbox(), entry]);

  return {
    id: entry.id,
    seq: null,
    threadId: entry.threadId,
    senderId: entry.senderId,
    recipientId: entry.recipientId,
    body: entry.body,
    clientCreatedAt: entry.createdAt,
    serverCreatedAt: null,
    localOnly: 1,
    lastError: null,
  };
}

let flushInFlight = false;

/**
 * Pushes every queued message to the server. The client-generated id makes this
 * idempotent, so a message that was delivered but whose response was lost is
 * reconciled rather than duplicated.
 */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushInFlight) return { sent: 0, failed: 0 };
  const entries = readOutbox();
  if (entries.length === 0) return { sent: 0, failed: 0 };

  flushInFlight = true;
  let sent = 0;
  let failed = 0;
  const remaining: OutboxEntry[] = [];

  try {
    for (const entry of entries) {
      try {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: entry.id,
            recipientId: entry.recipientId,
            body: entry.body,
            createdAt: entry.createdAt,
          }),
        });

        if (!res.ok) {
          // An expired session, a proxy hiccup, and rate limiting all clear on
          // their own, so those statuses stay queued and retry after the next
          // sign-in or flush. A 4xx that is genuinely about this message
          // (malformed, forbidden, missing recipient) is dropped instead of
          // retrying forever. 5xx and network errors are also retried.
          const permanent =
            res.status >= 400 &&
            res.status < 500 &&
            res.status !== 401 &&
            res.status !== 408 &&
            res.status !== 429;
          // last_error means "this will never send", so it is only written for a
          // permanent rejection. A queued message that merely failed to upload is
          // still pending, and showing it as failed would be a lie.
          await run(
            `UPDATE messages
             SET send_attempts = send_attempts + 1,
                 last_error = ${permanent ? '?' : 'NULL'}
             WHERE id = ?`,
            permanent ? [`HTTP ${res.status}`, entry.id] : [entry.id]
          );
          if (permanent) {
            failed += 1;
            continue;
          }
          remaining.push(entry);
          continue;
        }

        const result = (await res.json()) as { id: string; seq: number; createdAt: string };
        await run(
          `UPDATE messages
           SET seq = ?, server_created_at = ?, local_only = 0,
               send_attempts = send_attempts + 1, last_error = NULL
           WHERE id = ?`,
          [result.seq, result.createdAt, entry.id]
        );
        await bumpThreadSeq(entry.threadId, result.seq);
        sent += 1;
      } catch {
        // Offline: leave it queued for the next flush.
        await run(
          'UPDATE messages SET send_attempts = send_attempts + 1 WHERE id = ?',
          [entry.id]
        ).catch(() => undefined);
        remaining.push(entry);
      }
    }
  } finally {
    writeOutbox(remaining);
    flushInFlight = false;
  }

  return { sent, failed };
}

async function bumpThreadSeq(threadId: string, seq: number): Promise<void> {
  await run(
    `INSERT INTO threads (thread_id, last_seq, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT (thread_id) DO UPDATE
       SET last_seq = MAX(last_seq, excluded.last_seq), updated_at = excluded.updated_at`,
    [threadId, seq, new Date().toISOString()]
  );
}

/**
 * Caps local history at the newest MAX_MESSAGES_PER_THREAD rows. The selection
 * runs newest-first so the most recent messages are the ones kept; queued
 * messages have no seq yet and are the newest of all, so they lead the order and
 * can never be the rows dropped.
 */
async function pruneThread(threadId: string): Promise<void> {
  await run(
    `DELETE FROM messages
     WHERE thread_id = ?
       AND id NOT IN (
         SELECT id FROM messages
         WHERE thread_id = ?
         ORDER BY (seq IS NULL) DESC, seq DESC, client_created_at DESC
         LIMIT ?
       )`,
    [threadId, threadId, MAX_MESSAGES_PER_THREAD]
  );
}

export interface SyncOptions {
  /** Marks incoming messages as read by this device. */
  markRead?: boolean;
  /** Tells the server this device has pulled the messages, enabling its blue ticks. */
  reportSeen?: boolean;
}

export interface SyncOutcome {
  messages: LocalMessage[];
  received: number;
  peerLastSeenSeq: number;
  peerLastReadSeq: number;
}

/**
 * Pulls everything new for a thread, merges it into local SQLite, and advances
 * the read/seen cursors. One request per poll.
 */
export async function syncThread(
  threadId: string,
  options: SyncOptions = {}
): Promise<SyncOutcome> {
  const cursor = await getThreadCursor(threadId);

  const params = new URLSearchParams({ since_seq: String(cursor.lastSeq) });
  if (options.reportSeen) params.set('report_seen', '1');
  if (options.markRead) params.set('mark_read', '1');

  const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/sync?${params}`);
  if (!res.ok) throw new Error(`Sync failed (${res.status})`);

  const data = await res.json();
  const incoming = (data.messages ?? []) as Array<{
    id: string;
    seq: number;
    threadId: string;
    senderId: string;
    recipientId: string;
    body: string;
    createdAt: string;
  }>;

  if (incoming.length > 0) {
    await runBatch(
      incoming.map((m) => [
        `INSERT INTO messages
           (id, seq, thread_id, sender_id, recipient_id, body,
            client_created_at, server_created_at, local_only, send_attempts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
         ON CONFLICT (id) DO UPDATE SET
           seq = excluded.seq,
           server_created_at = excluded.server_created_at,
           local_only = 0,
           last_error = NULL`,
        [
          m.id,
          m.seq,
          m.threadId,
          m.senderId,
          m.recipientId,
          m.body,
          m.createdAt,
          m.createdAt,
        ],
      ])
    );
  }

  const highestSeq = incoming.reduce((max, m) => Math.max(max, m.seq), cursor.lastSeq);

  await run(
    `INSERT INTO threads
       (thread_id, last_seq, last_read_seq, peer_last_seen, peer_last_read, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (thread_id) DO UPDATE SET
       last_seq        = MAX(last_seq, excluded.last_seq),
       last_read_seq   = MAX(last_read_seq, excluded.last_read_seq),
       peer_last_seen  = MAX(peer_last_seen, excluded.peer_last_seen),
       peer_last_read  = MAX(peer_last_read, excluded.peer_last_read),
       updated_at      = excluded.updated_at`,
    [
      threadId,
      highestSeq,
      Number(data.myLastReadSeq ?? cursor.lastReadSeq),
      Number(data.peerLastSeenSeq ?? 0),
      Number(data.peerLastReadSeq ?? 0),
      new Date().toISOString(),
    ]
  );

  await pruneThread(threadId);

  return {
    messages: await listMessages(threadId),
    received: incoming.length,
    peerLastSeenSeq: Number(data.peerLastSeenSeq ?? 0),
    peerLastReadSeq: Number(data.peerLastReadSeq ?? 0),
  };
}

/**
 * A tick is derived from watermarks rather than stored per message: the server
 * assigns each message a sequence, and the peer's cursors say how far it got.
 */
export function tickFor(message: LocalMessage, cursor: ThreadCursor): TickStatus {
  // A message the server permanently rejected is never queued again, so it must
  // not keep rendering the "still sending" clock forever.
  if (message.seq === null && message.lastError) return 'failed';
  if (message.localOnly === 1 || message.seq === null) return 'pending';
  if (cursor.peerLastRead >= message.seq) return 'read';
  if (cursor.peerLastSeen >= message.seq) return 'delivered';
  return 'sent';
}

export function unreadInThread(threadId: string, readerId: string): Promise<number> {
  // Without the IFNULL a thread with no cursor row yet compares seq > NULL, which
  // is NULL rather than true, and every incoming message would read as "seen".
  return selectOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM messages
     WHERE thread_id = ? AND sender_id <> ? AND seq IS NOT NULL AND seq > (
       SELECT IFNULL((SELECT last_read_seq FROM threads WHERE thread_id = ?), 0)
     )`,
    [threadId, readerId, threadId]
  ).then((row) => Number(row?.n ?? 0));
}

/**
 * Reports the highest locally cached sequence as read. The thread is normally
 * marked read by the sync poll, but that poll is skipped whenever the device is
 * offline or the thread is left open in the background, which would otherwise
 * leave a stale unread badge.
 */
export async function markThreadRead(threadId: string, readerId: string): Promise<number> {
  const row = await selectOne<{ maxSeq: number }>(
    `SELECT IFNULL(MAX(seq), 0) AS maxSeq FROM messages
     WHERE thread_id = ? AND sender_id <> ?`,
    [threadId, readerId]
  );
  const readSeq = Number(row?.maxSeq ?? 0);
  if (readSeq <= 0) return 0;

  await run(
    `INSERT INTO threads (thread_id, last_seq, last_read_seq, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (thread_id) DO UPDATE
       SET last_read_seq = MAX(last_read_seq, excluded.last_read_seq),
           updated_at = excluded.updated_at`,
    [threadId, readSeq, readSeq, new Date().toISOString()]
  );

  try {
    await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readSeq }),
    });
  } catch {
    // Offline: the next sync poll will report the same cursor.
  }

  return readSeq;
}
