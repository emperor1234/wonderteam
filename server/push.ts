import webpush from 'web-push';
import { getDb, saveDb } from './db.ts';
import type { DatabaseState, PushSubscriptionRecord, VapidKeyPair } from './db.ts';

export interface PushDeliveryResult {
  delivered: number;
  failed: number;
  pruned: number;
}

function vapidSubject(): string {
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit) return explicit.startsWith('mailto:') || explicit.startsWith('https:') ? explicit : `mailto:${explicit}`;
  const leaderEmail = process.env.TEAM_LEADER_EMAIL?.trim() || 'admin@wonderteam.com';
  return `mailto:${leaderEmail}`;
}

let cachedKeys: VapidKeyPair | null = null;

function applyKeys(keys: VapidKeyPair): void {
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  cachedKeys = keys;
}

function keysFromEnv(): VapidKeyPair | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: vapidSubject() };
}

/**
 * Resolves the VAPID key pair used to sign every push payload.
 * Environment variables win; otherwise a pair is generated once and persisted
 * in the database so subscriptions stay valid across server restarts and
 * serverless cold boots.
 */
export async function getVapidKeys(): Promise<VapidKeyPair> {
  if (cachedKeys) return cachedKeys;

  const fromEnv = keysFromEnv();
  if (fromEnv) {
    applyKeys(fromEnv);
    return fromEnv;
  }

  const db = await getDb();
  const stored = db.vapidKeys;
  if (stored?.publicKey && stored?.privateKey) {
    const keys: VapidKeyPair = {
      publicKey: stored.publicKey,
      privateKey: stored.privateKey,
      subject: stored.subject || vapidSubject(),
    };
    applyKeys(keys);
    return keys;
  }

  const generated = webpush.generateVAPIDKeys();
  const keys: VapidKeyPair = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: vapidSubject(),
  };
  db.vapidKeys = keys;
  await saveDb(db);
  applyKeys(keys);
  return keys;
}

/** True when at least one member has a live push subscription. */
export async function hasAnySubscriptions(db?: DatabaseState): Promise<boolean> {
  const state = db || (await getDb());
  return (state.pushSubscriptions || []).length > 0;
}

function toWebPushSubscription(record: PushSubscriptionRecord) {
  return {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.keys.p256dh,
      auth: record.keys.auth,
    },
  };
}

function isExpiredEndpoint(err: any): boolean {
  const status = err?.statusCode;
  return status === 404 || status === 410;
}

/**
 * Sends one payload to a single endpoint.
 * Returns `prune: true` when the push service reports the subscription as gone,
 * so the caller can delete the stale record.
 */
export async function sendPushToEndpoint(
  record: PushSubscriptionRecord,
  payload: Record<string, any>
): Promise<{ ok: boolean; prune: boolean; error?: string }> {
  try {
    await webpush.sendNotification(toWebPushSubscription(record), JSON.stringify(payload), {
      TTL: 60 * 60 * 12,
      urgency: payload.urgency || 'normal',
    });
    return { ok: true, prune: false };
  } catch (err: any) {
    if (isExpiredEndpoint(err)) return { ok: false, prune: true, error: err?.message || 'Subscription expired' };
    return { ok: false, prune: false, error: err?.message || 'Push delivery failed' };
  }
}

/**
 * Pushes to every active endpoint owned by a user, pruning expired ones from
 * the database so dead devices do not accumulate.
 */
export async function sendPushToUser(
  db: DatabaseState,
  userId: string,
  payload: Record<string, any>,
  filter?: (record: PushSubscriptionRecord) => boolean
): Promise<PushDeliveryResult> {
  const targets = (db.pushSubscriptions || []).filter(
    (s) => s.userId === userId && (!filter || filter(s))
  );
  if (targets.length === 0) return { delivered: 0, failed: 0, pruned: 0 };

  const expired: string[] = [];
  let delivered = 0;
  let failed = 0;

  const results = await Promise.all(
    targets.map(async (record) => {
      const result = await sendPushToEndpoint(record, payload);
      if (result.prune) expired.push(record.id);
      return result;
    })
  );

  for (const result of results) {
    if (result.ok) delivered += 1;
    else failed += 1;
  }

  if (expired.length > 0) {
    db.pushSubscriptions = (db.pushSubscriptions || []).filter((s) => !expired.includes(s.id));
  }

  return { delivered, failed, pruned: expired.length };
}

/** Pushes to every user that currently has a subscription. */
export async function sendPushToAllSubscribers(
  db: DatabaseState,
  payload: Record<string, any>,
  userFilter?: (userId: string) => boolean
): Promise<PushDeliveryResult> {
  const userIds = Array.from(new Set((db.pushSubscriptions || []).map((s) => s.userId))).filter(
    (id) => (userFilter ? userFilter(id) : true)
  );

  let delivered = 0;
  let failed = 0;
  let pruned = 0;

  for (const userId of userIds) {
    const result = await sendPushToUser(db, userId, payload);
    delivered += result.delivered;
    failed += result.failed;
    pruned += result.pruned;
  }

  return { delivered, failed, pruned };
}

/** Total number of stored subscriptions, used by the admin diagnostics panel. */
export async function countSubscriptions(db?: DatabaseState): Promise<number> {
  const state = db || (await getDb());
  return (state.pushSubscriptions || []).length;
}
