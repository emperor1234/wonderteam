// api-src/index.ts
import express from "express";
import cookieParser from "cookie-parser";

// server/routes.ts
import { Router as Router2 } from "express";
import { GoogleGenAI } from "@google/genai";

// server/db.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!storedHash.startsWith("scrypt:")) {
    return password === storedHash;
  }
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;
  const [, salt, originalHash] = parts;
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    const hashBuf = Buffer.from(hash, "hex");
    const origBuf = Buffer.from(originalHash, "hex");
    if (hashBuf.length !== origBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, origBuf);
  } catch {
    return false;
  }
}
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.resolve(__dirname, "../data");
var DB_FILE = path.join(DATA_DIR, "db.json");
function buildProductionInitialData() {
  return {
    users: [],
    attendance: [],
    tasks: [],
    spending: [],
    budgets: [],
    savedBooks: [],
    pushSubscriptions: [],
    notifications: [],
    notificationPreferences: []
  };
}
function getDefaultNotificationPreferences(userId) {
  return {
    userId,
    enabled: true,
    messages: true,
    motivation: true,
    todos: true,
    budget: true,
    attendance: true,
    reading: true,
    quietHoursStart: 22,
    quietHoursEnd: 6
  };
}
function purgeDemoData(db) {
  const demoIds = ["usr_admin", "usr_amara", "usr_chinedu", "usr_mariam", "usr_tobi"];
  const demoEmails = [
    "admin@wonderteam.com",
    "amara@wonderteam.com",
    "chinedu@wonderteam.com",
    "mariam@wonderteam.com",
    "tobi@wonderteam.com"
  ];
  const beforeLen = db.users.length;
  db.users = db.users.filter(
    (u) => !demoIds.includes(u.id) && !demoEmails.includes(u.email.toLowerCase()) && !u.email.toLowerCase().endsWith("@wonderteam.com")
  );
  const hadDemoUsers = db.users.length !== beforeLen;
  const beforeAtt = db.attendance.length;
  db.attendance = db.attendance.filter((a) => !demoIds.includes(a.userId));
  const beforeTasks = db.tasks.length;
  db.tasks = db.tasks.filter((t) => !demoIds.includes(t.assigneeId));
  const beforeSpend = db.spending.length;
  db.spending = db.spending.filter((s) => !demoIds.includes(s.userId));
  const beforeBudgets = db.budgets.length;
  db.budgets = db.budgets.filter((b) => !demoIds.includes(b.userId));
  const beforeSubs = (db.pushSubscriptions || []).length;
  db.pushSubscriptions = (db.pushSubscriptions || []).filter((s) => !demoIds.includes(s.userId));
  const beforeNotifications = (db.notifications || []).length;
  db.notifications = (db.notifications || []).filter(
    (n) => !demoIds.includes(n.userId) && !n.readBy?.some((r) => demoIds.includes(r))
  );
  return hadDemoUsers || db.attendance.length !== beforeAtt || db.tasks.length !== beforeTasks || db.spending.length !== beforeSpend || db.budgets.length !== beforeBudgets || db.pushSubscriptions.length !== beforeSubs || db.notifications.length !== beforeNotifications;
}
var inMemoryDb = null;
var neonTableInitialized = false;
function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL;
}
function getNeonSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  try {
    return neon(url);
  } catch (err) {
    console.error("Failed to initialize Neon client:", err);
    return null;
  }
}
async function ensureNeonTable(sql) {
  if (neonTableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS wonderteam_state (
        key VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    neonTableInitialized = true;
  } catch (err) {
    console.error("Failed to ensure Neon table:", err);
  }
}
function getDbFilePath() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return DB_FILE;
  } catch {
    return "/tmp/wonderteam_db.json";
  }
}
function ensureDbFile() {
  const filePath = getDbFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      const initial = buildProductionInitialData();
      try {
        fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
      } catch (wErr) {
        console.warn("Filesystem is read-only, using memory cache:", wErr);
      }
      inMemoryDb = initial;
      return initial;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    inMemoryDb = parsed;
    return parsed;
  } catch (err) {
    console.warn("Fallback to in-memory initial data:", err);
    const initial = buildProductionInitialData();
    inMemoryDb = initial;
    return initial;
  }
}
function syncTeamLeader(db) {
  const leaderEmail = process.env.TEAM_LEADER_EMAIL?.trim().toLowerCase() || "emperorxpert@gmail.com";
  const leaderPassword = process.env.TEAM_LEADER_PASSWORD || "password123";
  const leaderName = process.env.TEAM_LEADER_NAME || "Emperor";
  const existing = db.users.find((u) => u.email.toLowerCase() === leaderEmail);
  if (existing) {
    let changed = false;
    if (existing.role !== "admin") {
      existing.role = "admin";
      changed = true;
    }
    if (existing.password && !existing.password.startsWith("scrypt:")) {
      existing.password = hashPassword(existing.password);
      changed = true;
    }
    return changed;
  }
  const initials = leaderName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "TL";
  const newLeader = {
    id: `usr_leader_${Date.now()}`,
    name: leaderName,
    email: leaderEmail,
    password: hashPassword(leaderPassword),
    role: "admin",
    sponsorName: "Global Leadership Council",
    uplineDirector: "Executive Board",
    uplineWorldTeamLeader: "Founding Circle",
    profileImage: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23146C4E"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`,
    officeLocation: {
      lat: 6.4281,
      lng: 3.4219,
      address: "WonderTeam Hub, Victoria Island, Lagos, Nigeria"
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.users.unshift(newLeader);
  return true;
}
async function getDb() {
  const sql = getNeonSql();
  if (sql) {
    try {
      await ensureNeonTable(sql);
      const rows = await sql`
        SELECT data FROM wonderteam_state WHERE key = 'main' LIMIT 1;
      `;
      if (rows && rows.length > 0 && rows[0].data) {
        const rawData = rows[0].data;
        const state = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        let shouldSave = syncTeamLeader(state);
        if (purgeDemoData(state)) {
          shouldSave = true;
        }
        for (const user of state.users) {
          if (user.password && !user.password.startsWith("scrypt:")) {
            user.password = hashPassword(user.password);
            shouldSave = true;
          }
        }
        if (shouldSave) {
          await saveDb(state);
        }
        inMemoryDb = state;
        return state;
      }
      const initial = buildProductionInitialData();
      syncTeamLeader(initial);
      const jsonStr = JSON.stringify(initial);
      await sql`
        INSERT INTO wonderteam_state (key, data, updated_at)
        VALUES ('main', ${jsonStr}::jsonb, NOW())
        ON CONFLICT (key) DO NOTHING;
      `;
      inMemoryDb = initial;
      return initial;
    } catch (err) {
      console.error("Error querying Neon PostgreSQL, falling back to local storage:", err);
    }
  }
  const local = inMemoryDb || ensureDbFile();
  let shouldSaveLocal = syncTeamLeader(local);
  if (purgeDemoData(local)) {
    shouldSaveLocal = true;
  }
  for (const user of local.users) {
    if (user.password && !user.password.startsWith("scrypt:")) {
      user.password = hashPassword(user.password);
      shouldSaveLocal = true;
    }
  }
  if (shouldSaveLocal) {
    await saveDb(local);
  }
  return local;
}
async function saveDb(data) {
  inMemoryDb = data;
  const sql = getNeonSql();
  if (sql) {
    try {
      await ensureNeonTable(sql);
      const jsonStr = JSON.stringify(data);
      await sql`
        INSERT INTO wonderteam_state (key, data, updated_at)
        VALUES ('main', ${jsonStr}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE SET data = ${jsonStr}::jsonb, updated_at = NOW();
      `;
      return;
    } catch (err) {
      console.error("Error saving to Neon PostgreSQL, writing to local fallback:", err);
    }
  }
  try {
    const filePath = getDbFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Local filesystem write skipped (read-only environment):", err);
  }
}
async function getDatabaseStatus() {
  const dbUrl = getDatabaseUrl();
  const sql = getNeonSql();
  let connected = false;
  let storageType = "local_filesystem";
  let lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  if (sql) {
    try {
      await ensureNeonTable(sql);
      const rows = await sql`
        SELECT updated_at FROM wonderteam_state WHERE key = 'main' LIMIT 1;
      `;
      connected = true;
      storageType = "neon_postgresql";
      if (rows && rows.length > 0 && rows[0].updated_at) {
        lastUpdated = new Date(rows[0].updated_at).toISOString();
      }
    } catch {
      connected = false;
    }
  }
  const db = await getDb();
  return {
    connected: storageType === "neon_postgresql" ? connected : true,
    storageType,
    databaseUrlConfigured: Boolean(dbUrl),
    usersCount: db.users.length,
    attendanceCount: db.attendance.length,
    tasksCount: db.tasks.length,
    spendingCount: db.spending.length,
    savedBooksCount: db.savedBooks ? db.savedBooks.length : 0,
    lastUpdated
  };
}

// server/session.ts
import crypto2 from "crypto";
var SESSION_COOKIE = "wt_session";
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (min 16 chars) in production");
  }
  return "wonderteam-insecure-dev-secret";
}
function base64url(input) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function hmac(payload) {
  return crypto2.createHmac("sha256", getSecret()).update(payload).digest();
}
function signSession(userId) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${base64url(Buffer.from(userId))}.${expiresAt}`;
  return `${payload}.${base64url(hmac(payload))}`;
}
function verifySession(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdB64, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const expected = hmac(`${userIdB64}.${expiresAtRaw}`);
  const provided = Buffer.from(signature, "base64");
  if (provided.length !== expected.length) return null;
  if (!crypto2.timingSafeEqual(provided, expected)) return null;
  let userId;
  try {
    userId = Buffer.from(userIdB64, "base64").toString("utf8");
  } catch {
    return null;
  }
  if (!userId) return null;
  return { id: userId };
}
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    // Disabled outside production so the PWA can be tested over a LAN IP
    // (http://192.168.x.x), where Secure cookies are rejected by browsers.
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/"
  };
}
function identityMismatch(req, session) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const query = req.query && typeof req.query === "object" ? req.query : {};
  const identityClaims = [];
  if (typeof body.userId === "string") identityClaims.push(body.userId);
  if (typeof query.userId === "string") identityClaims.push(query.userId);
  if (identityClaims.some((id) => id !== session.id)) {
    return "Request identity does not match the active session";
  }
  const adminClaims = [];
  if (typeof body.adminId === "string") adminClaims.push(body.adminId);
  if (typeof query.adminId === "string") adminClaims.push(query.adminId);
  if (adminClaims.length > 0) {
    if (session.role !== "admin") {
      return "Administrator privileges cannot be claimed by this session";
    }
    if (adminClaims.some((id) => id !== session.id)) {
      return "Administrator identity does not match the active session";
    }
  }
  const requestedRole = query.role ?? body.role;
  if (typeof requestedRole === "string" && requestedRole !== session.role) {
    return "Requested role does not match the active session";
  }
  return null;
}

// server/chat-db.ts
import { connect } from "@tursodatabase/serverless";
var client = null;
var schemaReady = null;
function chatDbEnabled() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}
function getChatDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error("TURSO_DATABASE_URL is not configured");
    }
    client = connect({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return client;
}
async function initSchema() {
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
       )`
    ],
    "write"
  );
}
function ensureChatSchema() {
  if (!chatDbEnabled()) {
    return Promise.reject(new Error("TURSO_DATABASE_URL is not configured"));
  }
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
function threadIdFor(a, b) {
  return [a, b].sort().join(":");
}
function peerOfThreadId(threadId, readerId) {
  const separator = threadId.indexOf(":");
  if (separator < 0) return "";
  const left = threadId.slice(0, separator);
  const right = threadId.slice(separator + 1);
  return left === readerId ? right : left;
}
function canMessage(sender, recipient) {
  if (sender.id === recipient.id) return false;
  return sender.role === "admin" || recipient.role === "admin";
}
function resolveThreadPeer(threadId, me, users) {
  const parts = String(threadId || "").split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [left, right] = parts;
  if (left !== me.id && right !== me.id) return null;
  const peerId = left === me.id ? right : left;
  if (peerId === me.id) return null;
  return users.find((u) => u.id === peerId) || null;
}
function toMessage(row) {
  return {
    id: row.id,
    seq: Number(row.seq),
    threadId: row.thread_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at
  };
}
async function saveMessage(params) {
  await ensureChatSchema();
  const db = getChatDb();
  const threadId = threadIdFor(params.senderId, params.recipientId);
  const existing = await db.get(
    "SELECT id, seq, created_at FROM messages WHERE id = ?",
    params.id
  );
  if (existing) {
    return {
      id: String(existing.id),
      seq: Number(existing.seq),
      createdAt: String(existing.created_at),
      duplicate: true
    };
  }
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
  const stored = await db.get(
    "SELECT id, seq, created_at FROM messages WHERE id = ?",
    params.id
  );
  if (!stored) {
    throw new Error("Message insert did not persist");
  }
  return {
    id: String(stored.id),
    seq: Number(stored.seq),
    createdAt: String(stored.created_at),
    duplicate: Number(stored.seq) !== seq
  };
}
async function listMessages(threadId, sinceSeq, limit = 200) {
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
  return rows.map(toMessage);
}
async function getReadState(threadId, readerId) {
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
    lastReadSeq: Number(row.last_read_seq)
  };
}
async function markSeen(threadId, readerId, seenSeq) {
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
async function markRead(threadId, readerId, readSeq) {
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
async function listThreadSummaries(readerId) {
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
  const unreadByThread = /* @__PURE__ */ new Map();
  for (const row of unreadRows) {
    unreadByThread.set(row.thread_id, Number(row.unread));
  }
  return latestRows.map((row) => ({
    threadId: row.thread_id,
    peerId: peerOfThreadId(row.thread_id, readerId),
    lastMessage: row.body,
    lastMessageAt: row.created_at,
    unreadCount: unreadByThread.get(row.thread_id) ?? 0
  }));
}

// server/wat.ts
function getGMT1Info(d = /* @__PURE__ */ new Date(), simulatedTime) {
  const totalMin = (() => {
    if (simulatedTime && typeof simulatedTime.hour === "number") {
      return simulatedTime.hour * 60 + (simulatedTime.minute ?? 0);
    }
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const h2 = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const m2 = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    return h2 * 60 + m2;
  })();
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  let h12 = h % 12;
  h12 = h12 ? h12 : 12;
  const ampm = h >= 12 ? "PM" : "AM";
  const strH = String(h12).padStart(2, "0");
  const strM = String(m).padStart(2, "0");
  const timeStr = `${strH}:${strM} ${ampm}`;
  return {
    h,
    m,
    totalMin,
    timeStr,
    isBefore930: totalMin < 570,
    isPast1000: totalMin > 600,
    isBetween930and1000: totalMin >= 570 && totalMin <= 600,
    isBeforeTodoWindow: totalMin < 570,
    isWithinTodoWindow: totalMin >= 570 && totalMin <= 660,
    isPast1100: totalMin > 660
  };
}
function getWATPeriodDetails(hour) {
  if (hour >= 0 && hour < 5) {
    return { period: "1am_midnight", timeTitle: "1:00 AM Midnight Visionary Hustle" };
  }
  if (hour >= 5 && hour < 12) {
    return { period: "morning", timeTitle: "Morning Ignition & Prospecting Power" };
  }
  if (hour >= 12 && hour < 18) {
    return { period: "afternoon", timeTitle: "Afternoon Momentum & Presentation Drive" };
  }
  return { period: "night", timeTitle: "Night Reflection & Daily Volume Review" };
}
var CURATED_MOTIVATIONAL_QUOTES = {
  morning: [
    {
      quote: "Either you run the day or the day runs you. Start your morning with Income Producing Activities before anything else.",
      author: "Jim Rohn"
    },
    {
      quote: "Discipline is the bridge between your goals and your team milestones. Win the morning, win the business.",
      author: "Jim Rohn"
    },
    {
      quote: "Success in networking and freelancing is simply a few simple disciplines, practiced every single morning without fail.",
      author: "Eric Worre"
    },
    {
      quote: "Your attitude this morning sets the altitude of your entire day. Reach out to three prospective partners or clients before noon.",
      author: "Zig Ziglar"
    }
  ],
  afternoon: [
    {
      quote: "The fortune is in the follow-up. Keep your afternoon pipeline active and connect with every interested prospect.",
      author: "Eric Worre"
    },
    {
      quote: "Action cures fear. Inaction breeds doubt. Reach out to that prospect and deliver that client presentation now.",
      author: "Norman Vincent Peale"
    },
    {
      quote: "You don't have to be great to start, but you must start to be great. Finish today's pitches with passion.",
      author: "Les Brown"
    },
    {
      quote: "Energy flows where focus goes. Stay locked on your daily income-producing calls and project deliverables.",
      author: "Tony Robbins"
    }
  ],
  night: [
    {
      quote: "Review your day with honesty: Did you touch your dream today with real conversations? Consistent seeds multiply into generational legacy.",
      author: "John C. Maxwell"
    },
    {
      quote: "Preparation tonight creates victory tomorrow. Lock in your top Income Producing Activities before going to rest.",
      author: "Brian Tracy"
    },
    {
      quote: "Rest if you must, but never quit. Every follow-up and presentation you delivered today is building compounding freedom.",
      author: "Les Brown"
    },
    {
      quote: "Never go to sleep without a request to your mind for tomorrow's prospecting and leadership breakthrough.",
      author: "Thomas Edison"
    }
  ],
  "1am_midnight": [
    {
      quote: "While the world is sleeping, the true visionaries are building. The late night hours you invest in your mind and your vision will pay lifelong dividends.",
      author: "Napoleon Hill"
    },
    {
      quote: "1:00 AM is where champions are forged. When the average have checked out, your burning desire and relentless drive keep your dream alive.",
      author: "Eric Thomas"
    },
    {
      quote: "The midnight oil you burn today creates the freedom and financial independence that most people will only ever dream of tomorrow.",
      author: "Jim Rohn"
    },
    {
      quote: "Greatness is built in the quiet, unseen hours. Stand firm in your belief, feed your entrepreneur spirit, and know your harvest is coming.",
      author: "Les Brown"
    }
  ]
};
function pickCuratedQuote(period, seed) {
  const list = CURATED_MOTIVATIONAL_QUOTES[period];
  return list[Math.abs(seed) % list.length];
}

// server/notificationRoutes.ts
import { Router } from "express";

// server/push.ts
import webpush from "web-push";
function vapidSubject() {
  const explicit = process.env.VAPID_SUBJECT?.trim();
  if (explicit) return explicit.startsWith("mailto:") || explicit.startsWith("https:") ? explicit : `mailto:${explicit}`;
  const leaderEmail = process.env.TEAM_LEADER_EMAIL?.trim() || "admin@wonderteam.com";
  return `mailto:${leaderEmail}`;
}
var cachedKeys = null;
function applyKeys(keys) {
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  cachedKeys = keys;
}
function keysFromEnv() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: vapidSubject() };
}
async function getVapidKeys() {
  if (cachedKeys) return cachedKeys;
  const fromEnv = keysFromEnv();
  if (fromEnv) {
    applyKeys(fromEnv);
    return fromEnv;
  }
  const db = await getDb();
  const stored = db.vapidKeys;
  if (stored?.publicKey && stored?.privateKey) {
    const keys2 = {
      publicKey: stored.publicKey,
      privateKey: stored.privateKey,
      subject: stored.subject || vapidSubject()
    };
    applyKeys(keys2);
    return keys2;
  }
  const generated = webpush.generateVAPIDKeys();
  const keys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: vapidSubject()
  };
  db.vapidKeys = keys;
  await saveDb(db);
  applyKeys(keys);
  return keys;
}
function toWebPushSubscription(record) {
  return {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.keys.p256dh,
      auth: record.keys.auth
    }
  };
}
function isExpiredEndpoint(err) {
  const status = err?.statusCode;
  return status === 404 || status === 410;
}
async function sendPushToEndpoint(record, payload) {
  try {
    await webpush.sendNotification(toWebPushSubscription(record), JSON.stringify(payload), {
      TTL: 60 * 60 * 12,
      urgency: payload.urgency || "normal"
    });
    return { ok: true, prune: false };
  } catch (err) {
    if (isExpiredEndpoint(err)) return { ok: false, prune: true, error: err?.message || "Subscription expired" };
    return { ok: false, prune: false, error: err?.message || "Push delivery failed" };
  }
}
async function sendPushToUser(db, userId, payload, filter) {
  const targets = (db.pushSubscriptions || []).filter(
    (s) => s.userId === userId && (!filter || filter(s))
  );
  if (targets.length === 0) return { delivered: 0, failed: 0, pruned: 0 };
  const expired = [];
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
async function sendPushToAllSubscribers(db, payload, userFilter) {
  const userIds = Array.from(new Set((db.pushSubscriptions || []).map((s) => s.userId))).filter(
    (id) => userFilter ? userFilter(id) : true
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
async function countSubscriptions(db) {
  const state = db || await getDb();
  return (state.pushSubscriptions || []).length;
}

// server/reminders.ts
function getPreferences(db, userId) {
  const stored = (db.notificationPreferences || []).find((p) => p.userId === userId);
  return { ...getDefaultNotificationPreferences(userId), ...stored || {} };
}
function isWithinQuietHours(prefs, gmt1Hour) {
  const { quietHoursStart: start, quietHoursEnd: end } = prefs;
  if (start === null || end === null) return false;
  if (start === end) return true;
  if (start < end) return gmt1Hour >= start && gmt1Hour < end;
  return gmt1Hour >= start || gmt1Hour < end;
}
function isTypeEnabled(prefs, type) {
  if (!prefs.enabled) return false;
  switch (type) {
    case "message":
      return prefs.messages;
    case "motivation":
      return prefs.motivation;
    case "todo":
      return prefs.todos;
    case "budget":
      return prefs.budget;
    case "attendance":
      return prefs.attendance;
    case "reading":
      return prefs.reading;
    default:
      return true;
  }
}
function getWATDateStr(d = /* @__PURE__ */ new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${day}`;
}
function getWATMonthStr(d = /* @__PURE__ */ new Date()) {
  return getWATDateStr(d).slice(0, 7);
}
function daySeed(dateStr) {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i += 1) seed = (seed * 31 + dateStr.charCodeAt(i)) % 1e5;
  return seed;
}
function isOverdue(task, dateStr) {
  if (!task.dueDate) return false;
  return task.dueDate < dateStr && task.status !== "completed";
}
function isDueToday(task, dateStr) {
  return task.dueDate === dateStr && task.status !== "completed";
}
function buildReminderDrafts(db, userId) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return [];
  const prefs = getPreferences(db, userId);
  if (!prefs.enabled) return [];
  const gmt1 = getGMT1Info();
  const today = getWATDateStr();
  const month = getWATMonthStr();
  const seed = daySeed(today);
  const firstName = (user.name || "Member").split(" ")[0];
  const drafts = [];
  const attendanceToday = (db.attendance || []).find((a) => a.userId === userId && a.date === today);
  const hasClockedIn = Boolean(attendanceToday?.clockIn);
  const isClockedOut = Boolean(attendanceToday?.clockOut);
  const tasks = (db.tasks || []).filter((t) => t.assigneeId === userId);
  const overdueTasks = tasks.filter((t) => isOverdue(t, today));
  const dueTodayTasks = tasks.filter((t) => isDueToday(t, today));
  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const monthSpending = (db.spending || []).filter((s) => s.userId === userId && (s.date || "").startsWith(month));
  const spent = monthSpending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const budget = (db.budgets || []).find((b) => b.userId === userId && b.month === month);
  const monthlyBudget = Number(budget?.monthlyBudget) || 0;
  const budgetPercent = monthlyBudget > 0 ? Math.round(spent / monthlyBudget * 100) : 0;
  const readingBooks = (db.savedBooks || []).filter((b) => b.userId === userId && b.status === "reading");
  if (isTypeEnabled(prefs, "attendance") && !hasClockedIn) {
    if (gmt1.isBetween930and1000) {
      drafts.push({
        key: `attendance-checkin-${today}`,
        type: "attendance",
        title: "Clock in now",
        body: `Good morning ${firstName}. The office register closes at 10:00 AM WAT - clock in to protect your streak.`,
        link: "home"
      });
    } else if (gmt1.totalMin > 600 && gmt1.totalMin < 780) {
      drafts.push({
        key: `attendance-missed-${today}`,
        type: "attendance",
        title: "You have not clocked in",
        body: `It is ${gmt1.timeStr} WAT and your attendance is still unmarked. Your team leader can see this status.`,
        link: "home"
      });
    }
  }
  if (isTypeEnabled(prefs, "attendance") && hasClockedIn && !isClockedOut) {
    const hoursWorked = attendanceRecordHours(attendanceToday?.clockInTimestamp);
    if (hoursWorked >= 9) {
      drafts.push({
        key: `attendance-clockout-${today}`,
        type: "attendance",
        title: "Ready to clock out?",
        body: `You are ${Math.floor(hoursWorked)}h into today's shift. Close your register entry so the duration is recorded.`,
        link: "home"
      });
    }
  }
  if (isTypeEnabled(prefs, "todo")) {
    const hasTodoToday = tasks.some((t) => (t.createdAt || "").startsWith(today));
    if (gmt1.isWithinTodoWindow && !hasTodoToday) {
      drafts.push({
        key: `todo-window-${today}`,
        type: "todo",
        title: "Write your to-do list",
        body: `${firstName}, the to-do window closes at 11:00 AM WAT. An empty list is logged as unserious by the team leader.`,
        link: "tasks"
      });
    }
    if (overdueTasks.length > 0) {
      drafts.push({
        key: `todo-overdue-${today}`,
        type: "todo",
        title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`,
        body: `Still open: ${overdueTasks.slice(0, 3).map((t) => t.title).join(", ")}${overdueTasks.length > 3 ? " and more" : ""}.`,
        link: "tasks"
      });
    }
    if (gmt1.h >= 17 && dueTodayTasks.length > 0) {
      drafts.push({
        key: `todo-eod-${today}`,
        type: "todo",
        title: "Close out your tasks",
        body: `${dueTodayTasks.length} task${dueTodayTasks.length === 1 ? "" : "s"} were due today. Complete or reschedule them before the night review.`,
        link: "tasks"
      });
    }
    if (gmt1.h >= 19 && pendingTasks.length > 0 && overdueTasks.length === 0 && dueTodayTasks.length === 0) {
      drafts.push({
        key: `todo-plan-tomorrow-${today}`,
        type: "todo",
        title: "Plan tomorrow",
        body: `${pendingTasks.length} open task${pendingTasks.length === 1 ? "" : "s"} carry over. Set tomorrow's Income Producing Activities now.`,
        link: "tasks"
      });
    }
  }
  if (isTypeEnabled(prefs, "budget") && monthlyBudget > 0 && spent > 0) {
    if (budgetPercent >= 100) {
      drafts.push({
        key: `budget-over-${month}`,
        type: "budget",
        title: "Monthly budget exceeded",
        body: `You have spent \u20A6${spent.toLocaleString("en-NG")} of your \u20A6${monthlyBudget.toLocaleString("en-NG")} budget for ${month}. Pause new spending and review your ledger.`,
        link: "spending"
      });
    } else if (budgetPercent >= 80) {
      drafts.push({
        key: `budget-near-${month}`,
        type: "budget",
        title: `${budgetPercent}% of your budget used`,
        body: `\u20A6${spent.toLocaleString("en-NG")} of \u20A6${monthlyBudget.toLocaleString("en-NG")} spent for ${month}. \u20A6${(monthlyBudget - spent).toLocaleString("en-NG")} left.`,
        link: "spending"
      });
    }
  }
  if (isTypeEnabled(prefs, "motivation")) {
    const { period, timeTitle } = getWATPeriodDetails(gmt1.h);
    const periodIndex = period === "morning" ? 0 : period === "afternoon" ? 1 : period === "night" ? 2 : 3;
    const streak = (db.attendance || []).filter(
      (a) => a.userId === userId && (a.status === "present" || a.status === "clocked_out")
    ).length;
    const quote = pickCuratedQuote(period, seed + periodIndex);
    drafts.push({
      key: `quote-${today}-${period}`,
      type: "motivation",
      title: timeTitle,
      body: `"${quote.quote}" - ${quote.author}${streak > 0 ? ` \xB7 ${streak}-day attendance streak active.` : ""}`,
      link: "home"
    });
  }
  if (isTypeEnabled(prefs, "reading") && readingBooks.length > 0 && gmt1.h >= 20) {
    drafts.push({
      key: `reading-${today}`,
      type: "reading",
      title: "Growth library time",
      body: `You have ${readingBooks.length} book${readingBooks.length === 1 ? "" : "s"} in progress: ${readingBooks.slice(0, 2).map((b) => b.title).join(", ")}. A few pages tonight keeps the momentum.`,
      link: "library"
    });
  }
  return drafts;
}
function attendanceRecordHours(clockInTimestamp) {
  if (!clockInTimestamp) return 0;
  return (Date.now() - clockInTimestamp) / 36e5;
}
function hasAlreadyNotified(db, userId, key) {
  return (db.notifications || []).some(
    (n) => n.userId === userId && typeof n.meta?.reminderKey === "string" && n.meta.reminderKey === key
  );
}
function createReminderNotification(userId, draft) {
  return {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    link: draft.link,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    readBy: [],
    meta: { reminderKey: draft.key, delivery: "push" }
  };
}
var MAX_NOTIFICATIONS = 400;
function trimNotifications(notifications) {
  if (notifications.length <= MAX_NOTIFICATIONS) return notifications;
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted.slice(0, MAX_NOTIFICATIONS);
}

// server/notificationRoutes.ts
var router = Router();
var cronRouter = Router();
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret && process.env.NODE_ENV !== "production") return next();
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (secret && token === secret) return next();
  return res.status(401).json({
    error: "Invalid or missing cron secret",
    detail: secret ? "Set CRON_SECRET to the same value in the project environment so Vercel Cron can authenticate." : "CRON_SECRET is not set, so scheduled reminders cannot be delivered. Members with the app open still get reminders."
  });
}
var NOTIFICATION_TYPES = [
  "message",
  "motivation",
  "todo",
  "budget",
  "attendance",
  "reading",
  "system"
];
var BROADCAST_TARGET_ALL = "all";
function buildPushPayload(notification) {
  return {
    title: notification.title,
    body: notification.body,
    icon: notification.icon || "/icon-192.png",
    badge: "/icon-192.png",
    tag: `wonderteam-${notification.id}`,
    renotify: true,
    requireInteraction: notification.type === "message",
    urgency: notification.type === "message" ? "high" : "normal",
    timestamp: Date.now(),
    data: {
      notificationId: notification.id,
      type: notification.type,
      link: notification.link,
      createdAt: notification.createdAt
    }
  };
}
function normalizeSubscription(input) {
  const endpoint = input?.endpoint || input?.subscription?.endpoint;
  const keys = input?.keys || input?.subscription?.keys;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return null;
  if (!keys?.p256dh || !keys?.auth) return null;
  return { endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) } };
}
function findVisibleNotifications(db, userId) {
  return (db.notifications || []).filter((n) => n.userId === userId || n.userId === BROADCAST_TARGET_ALL).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
function isVisibleTo(notification, userId) {
  return notification.userId === userId || notification.userId === BROADCAST_TARGET_ALL;
}
function sessionUserId(req) {
  return req.user?.id;
}
function sessionIsAdmin(req) {
  return req.isAdmin === true;
}
async function deliverDirectNotification(input) {
  const db = await getDb();
  if (!db.users.some((u) => u.id === input.userId)) return null;
  const prefs = getPreferences(db, input.userId);
  const notification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    readBy: [],
    meta: input.meta
  };
  db.notifications = trimNotifications([...db.notifications || [], notification]);
  if (isTypeEnabled(prefs, input.type) && !isWithinQuietHours(prefs, getGMT1Info().h)) {
    await sendPushToUser(db, input.userId, buildPushPayload(notification));
  }
  await saveDb(db);
  return notification;
}
router.get("/push/vapid-key", async (_req, res) => {
  try {
    const keys = await getVapidKeys();
    return res.json({ publicKey: keys.publicKey });
  } catch (err) {
    console.error("Failed to resolve VAPID key:", err?.message);
    return res.status(500).json({ error: "Push notifications are not configured" });
  }
});
router.post("/push/subscribe", async (req, res) => {
  const userId = sessionUserId(req);
  const userAgent = req.get("user-agent") || void 0;
  const normalized = normalizeSubscription(req.body?.subscription);
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  if (!normalized) return res.status(400).json({ error: "A valid push subscription is required" });
  const db = await getDb();
  if (!db.users.some((u) => u.id === userId)) {
    return res.status(404).json({ error: "User not found" });
  }
  db.pushSubscriptions = db.pushSubscriptions || [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = db.pushSubscriptions.find((s) => s.endpoint === normalized.endpoint);
  if (existing) {
    existing.userId = userId;
    existing.keys = normalized.keys;
    existing.lastUsedAt = now;
    if (userAgent) existing.userAgent = userAgent;
  } else {
    db.pushSubscriptions.push({
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      endpoint: normalized.endpoint,
      keys: normalized.keys,
      userAgent,
      createdAt: now,
      lastUsedAt: now
    });
  }
  await saveDb(db);
  return res.json({ success: true, subscribed: true });
});
router.post("/push/unsubscribe", async (req, res) => {
  const userId = sessionUserId(req);
  const { endpoint } = req.body || {};
  if (!userId || typeof endpoint !== "string" || !endpoint) {
    return res.status(400).json({ error: "endpoint is required" });
  }
  const db = await getDb();
  const before = (db.pushSubscriptions || []).length;
  db.pushSubscriptions = (db.pushSubscriptions || []).filter(
    (s) => !(s.userId === userId && s.endpoint === endpoint)
  );
  const removed = before !== db.pushSubscriptions.length;
  if (removed) await saveDb(db);
  return res.json({ success: true, removed });
});
router.get("/push/status", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  const db = await getDb();
  const devices = (db.pushSubscriptions || []).filter((s) => s.userId === userId);
  return res.json({
    subscribed: devices.length > 0,
    deviceCount: devices.length,
    teamDeviceCount: await countSubscriptions(db),
    preferences: getPreferences(db, userId)
  });
});
router.get("/push/preferences", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  const db = await getDb();
  return res.json({ preferences: getPreferences(db, userId) });
});
router.post("/push/preferences", async (req, res) => {
  const userId = sessionUserId(req);
  const preferences = req.body?.preferences;
  if (!userId || !preferences) {
    return res.status(400).json({ error: "preferences are required" });
  }
  const db = await getDb();
  const current = getPreferences(db, userId);
  const clampHour = (value, fallback) => {
    if (value === null) return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 23) return fallback;
    return Math.round(num);
  };
  const next = {
    ...current,
    enabled: preferences.enabled === void 0 ? current.enabled : Boolean(preferences.enabled),
    messages: preferences.messages === void 0 ? current.messages : Boolean(preferences.messages),
    motivation: preferences.motivation === void 0 ? current.motivation : Boolean(preferences.motivation),
    todos: preferences.todos === void 0 ? current.todos : Boolean(preferences.todos),
    budget: preferences.budget === void 0 ? current.budget : Boolean(preferences.budget),
    attendance: preferences.attendance === void 0 ? current.attendance : Boolean(preferences.attendance),
    reading: preferences.reading === void 0 ? current.reading : Boolean(preferences.reading),
    quietHoursStart: clampHour(preferences.quietHoursStart, current.quietHoursStart),
    quietHoursEnd: clampHour(preferences.quietHoursEnd, current.quietHoursEnd)
  };
  db.notificationPreferences = db.notificationPreferences || [];
  const index = db.notificationPreferences.findIndex((p) => p.userId === userId);
  if (index >= 0) db.notificationPreferences[index] = next;
  else db.notificationPreferences.push(next);
  if (!next.enabled) {
    db.pushSubscriptions = (db.pushSubscriptions || []).filter((s) => s.userId !== userId);
  }
  await saveDb(db);
  return res.json({ success: true, preferences: next });
});
router.get("/notifications", async (req, res) => {
  const userId = sessionUserId(req);
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  const db = await getDb();
  const all = findVisibleNotifications(db, userId);
  const notifications = all.slice(0, limit).map((n) => ({
    ...n,
    read: (n.readBy || []).includes(userId)
  }));
  return res.json({
    notifications,
    unreadCount: all.filter((n) => !(n.readBy || []).includes(userId)).length,
    totalCount: all.length,
    preferences: getPreferences(db, userId),
    subscribed: (db.pushSubscriptions || []).some((s) => s.userId === userId)
  });
});
router.post("/notifications/read", async (req, res) => {
  const userId = sessionUserId(req);
  const { ids, all } = req.body || {};
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  const db = await getDb();
  const targets = (db.notifications || []).filter(
    (n) => isVisibleTo(n, userId) && (all === true || Array.isArray(ids) && ids.includes(n.id))
  );
  for (const notification of targets) {
    notification.readBy = notification.readBy || [];
    if (!notification.readBy.includes(userId)) notification.readBy.push(userId);
  }
  if (targets.length > 0) await saveDb(db);
  return res.json({ success: true, updated: targets.length });
});
router.post("/notifications/delete", async (req, res) => {
  const userId = sessionUserId(req);
  const { id } = req.body || {};
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  if (typeof id !== "string" || !id) return res.status(400).json({ error: "id is required" });
  const db = await getDb();
  const before = (db.notifications || []).length;
  db.notifications = (db.notifications || []).filter((n) => n.id !== id || !isVisibleTo(n, userId));
  if (db.notifications.length !== before) await saveDb(db);
  return res.json({ success: true });
});
router.post("/notifications/send", async (req, res) => {
  const { title, body, type, link, targetUserId } = req.body || {};
  if (!sessionIsAdmin(req)) {
    return res.status(403).json({ error: "Unauthorized: Admin privileges required to send team messages" });
  }
  if (!title || !body) return res.status(400).json({ error: "title and body are required" });
  const notificationType = NOTIFICATION_TYPES.includes(type) ? type : "message";
  const db = await getDb();
  const admin = req.user;
  const target = typeof targetUserId === "string" && targetUserId ? targetUserId : BROADCAST_TARGET_ALL;
  if (target !== BROADCAST_TARGET_ALL && !db.users.some((u) => u.id === target)) {
    return res.status(404).json({ error: "Target user not found" });
  }
  const notification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: target,
    type: notificationType,
    title: String(title).slice(0, 120),
    body: String(body).slice(0, 500),
    link: typeof link === "string" && link ? link.slice(0, 40) : void 0,
    createdBy: admin.id,
    createdByName: admin.name,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    readBy: []
  };
  db.notifications = trimNotifications([...db.notifications || [], notification]);
  const recipientIds = target === BROADCAST_TARGET_ALL ? db.users.map((u) => u.id).filter((id) => id !== admin.id) : [target];
  let delivered = 0;
  let failed = 0;
  for (const userId of recipientIds) {
    const prefs = getPreferences(db, userId);
    if (!isTypeEnabled(prefs, notificationType)) continue;
    if (isWithinQuietHours(prefs, getGMT1Info().h)) continue;
    const result = await sendPushToUser(db, userId, buildPushPayload(notification));
    delivered += result.delivered;
    failed += result.failed;
  }
  await saveDb(db);
  return res.json({
    success: true,
    notification,
    recipients: recipientIds.length,
    push: { delivered, failed }
  });
});
router.get("/notifications/team-feed", async (_req, res) => {
  const db = await getDb();
  const feed = (db.notifications || []).filter((n) => n.userId === BROADCAST_TARGET_ALL).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
  return res.json({ feed });
});
async function commitDrafts(db, userId, drafts) {
  const created = [];
  for (const draft of drafts) {
    if (hasAlreadyNotified(db, userId, draft.key)) continue;
    const notification = createReminderNotification(userId, draft);
    created.push(notification);
    db.notifications = [...db.notifications || [], notification];
  }
  if (created.length > 0) db.notifications = trimNotifications(db.notifications);
  return created;
}
router.get("/push/reminders", async (req, res) => {
  const userId = sessionUserId(req);
  const persist = req.query.persist !== "false";
  if (!userId) return res.status(401).json({ error: "Sign in to continue" });
  const db = await getDb();
  const prefs = getPreferences(db, userId);
  const quiet = isWithinQuietHours(prefs, getGMT1Info().h);
  const pending = buildReminderDrafts(db, userId).filter(
    (d) => !hasAlreadyNotified(db, userId, d.key)
  );
  if (!persist || pending.length === 0) {
    return res.json({
      quiet,
      reminders: persist ? [] : pending.map((d) => ({ id: `preview_${d.key}`, title: d.title, body: d.body, type: d.type, link: d.link }))
    });
  }
  const created = await commitDrafts(db, userId, pending);
  await saveDb(db);
  return res.json({
    quiet,
    reminders: created.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      link: n.link,
      createdAt: n.createdAt
    }))
  });
});
cronRouter.get("/push/cron/reminders", requireCronSecret, async (_req, res) => {
  const db = await getDb();
  const gmt1 = getGMT1Info();
  const subscriberIds = Array.from(new Set((db.pushSubscriptions || []).map((s) => s.userId)));
  const summary = [];
  let totalCreated = 0;
  let totalDelivered = 0;
  for (const userId of subscriberIds) {
    const prefs = getPreferences(db, userId);
    const quiet = isWithinQuietHours(prefs, gmt1.h);
    const drafts = buildReminderDrafts(db, userId).filter((d) => !hasAlreadyNotified(db, userId, d.key));
    if (drafts.length === 0) continue;
    const created = await commitDrafts(db, userId, drafts);
    if (created.length === 0) continue;
    let delivered = 0;
    if (!quiet) {
      for (const notification of created) {
        const result = await sendPushToUser(db, userId, buildPushPayload(notification));
        delivered += result.delivered;
      }
    }
    totalCreated += created.length;
    totalDelivered += delivered;
    summary.push({ userId, created: created.length, delivered });
  }
  db.notifications = trimNotifications(db.notifications || []);
  await saveDb(db);
  return res.json({
    success: true,
    ranAt: (/* @__PURE__ */ new Date()).toISOString(),
    watTime: gmt1.timeStr,
    subscribers: subscriberIds.length,
    created: totalCreated,
    delivered: totalDelivered,
    summary
  });
});
router.post("/push/broadcast-existing", async (req, res) => {
  const { notificationId } = req.body || {};
  if (!sessionIsAdmin(req)) {
    return res.status(403).json({ error: "Administrator privileges required" });
  }
  if (!notificationId) return res.status(400).json({ error: "notificationId is required" });
  const db = await getDb();
  const notification = (db.notifications || []).find((n) => n.id === notificationId);
  if (!notification) return res.status(404).json({ error: "Notification not found" });
  const result = await sendPushToAllSubscribers(db, buildPushPayload(notification));
  await saveDb(db);
  return res.json({ success: true, push: result });
});
var notificationRoutes_default = router;

// server/routes.ts
var router2 = Router2();
var requireSession = async (req, res, next) => {
  const session = verifySession(req.cookies?.[SESSION_COOKIE]);
  if (!session) {
    return res.status(401).json({ error: "Sign in to continue" });
  }
  let db;
  try {
    db = await getDb();
  } catch (err) {
    return res.status(503).json({ error: "Account store unavailable", detail: err?.message });
  }
  const user = db.users.find((u) => u.id === session.id);
  if (!user) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return res.status(401).json({ error: "This account is no longer active" });
  }
  const mismatch = identityMismatch(req, { id: user.id, role: user.role });
  if (mismatch) {
    return res.status(403).json({ error: mismatch });
  }
  req.user = user;
  req.isAdmin = user.role === "admin";
  next();
};
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const rad = (d) => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
function getTodayDateStr() {
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function evaluateUserWorkEthic(userId, db, simulatedTime) {
  const today = getTodayDateStr();
  const userTasksToday = db.tasks.filter(
    (t) => t.assigneeId === userId && t.createdAt.startsWith(today)
  );
  const gmt1 = getGMT1Info(/* @__PURE__ */ new Date(), simulatedTime);
  if (userTasksToday.length > 0) {
    return {
      workEthicStatus: "serious",
      unseriousReason: void 0,
      hasWrittenTodoToday: true,
      taskCountToday: userTasksToday.length
    };
  }
  if (gmt1.isPast1100) {
    return {
      workEthicStatus: "unserious",
      unseriousReason: "To-do list was not written between 9:30 AM \u2013 11:00 AM GMT+1 (Marked Unserious)",
      hasWrittenTodoToday: false,
      taskCountToday: 0
    };
  }
  return {
    workEthicStatus: "pending_check",
    unseriousReason: "Pending to-do list (Must be written between 9:30 AM \u2013 11:00 AM GMT+1)",
    hasWrittenTodoToday: false,
    taskCountToday: 0
  };
}
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}
router2.post("/auth/register", async (req, res) => {
  const {
    name,
    email,
    password,
    sponsorName,
    uplineDirector,
    uplineWorldTeamLeader,
    profileImage,
    officeLocation
  } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  const reservedLeaderEmail = process.env.TEAM_LEADER_EMAIL?.trim().toLowerCase();
  if (reservedLeaderEmail && email.trim().toLowerCase() === reservedLeaderEmail) {
    return res.status(400).json({
      error: "This email is reserved for the Team Leader account. Please sign in directly using your credentials."
    });
  }
  if (!sponsorName || !uplineDirector || !uplineWorldTeamLeader) {
    return res.status(400).json({
      error: "Upline hierarchy details (Sponsor, Upline Director, and Upline World Team Leader) are required."
    });
  }
  if (!officeLocation || typeof officeLocation.lat !== "number" || typeof officeLocation.lng !== "number") {
    return res.status(400).json({
      error: "Mobile device location of your office is required before creating an account.",
      isLocationRequired: true
    });
  }
  if (profileImage && typeof profileImage === "string") {
    const base64Length = profileImage.length;
    const byteSize = base64Length * 3 / 4;
    if (byteSize > 12288) {
      return res.status(400).json({
        error: `Profile image size is ${(byteSize / 1024).toFixed(1)}KB, exceeding the strict 10KB limit. Please choose a smaller photo or compress it.`
      });
    }
  }
  const db = await getDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }
  const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  const defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name,
    email,
    password: hashPassword(password),
    role: "member",
    sponsorName,
    uplineDirector,
    uplineWorldTeamLeader,
    profileImage: profileImage || defaultAvatar,
    officeLocation: {
      lat: officeLocation.lat,
      lng: officeLocation.lng,
      address: officeLocation.address || "Registered Office Location"
    },
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.users.push(newUser);
  if (newUser.role === "member") {
    db.budgets.push({
      userId: newUser.id,
      month: getTodayDateStr().substring(0, 7),
      monthlyBudget: 5e4
    });
  }
  await saveDb(db);
  const { password: _, ...userWithoutPassword } = newUser;
  res.cookie(SESSION_COOKIE, signSession(newUser.id), cookieOptions());
  return res.status(201).json({ user: userWithoutPassword });
});
router2.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const db = await getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (user.password && !user.password.startsWith("scrypt:")) {
    user.password = hashPassword(password);
    await saveDb(db);
  }
  const { password: _, ...userWithoutPassword } = user;
  res.cookie(SESSION_COOKIE, signSession(user.id), cookieOptions());
  return res.json({ user: userWithoutPassword });
});
router2.post("/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.json({ success: true });
});
router2.use(cronRouter);
router2.use(requireSession);
router2.use(notificationRoutes_default);
router2.get("/auth/session", (req, res) => {
  const user = req.user;
  const { password: _, ...safe } = user;
  return res.json({ user: safe });
});
router2.get("/auth/users", async (req, res) => {
  if (!req.isAdmin) {
    return res.status(403).json({ error: "Administrator privileges required to list team members" });
  }
  const db = await getDb();
  const sanitized = db.users.map(({ password, ...rest }) => rest);
  return res.json(sanitized);
});
router2.post("/auth/update-profile", async (req, res) => {
  const { userId, sponsorName, uplineDirector, uplineWorldTeamLeader, profileImage } = req.body;
  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (profileImage && typeof profileImage === "string") {
    const byteSize = profileImage.length * 3 / 4;
    if (byteSize > 12288) {
      return res.status(400).json({ error: "Profile image exceeds 10KB limit" });
    }
    user.profileImage = profileImage;
  }
  if (sponsorName) user.sponsorName = sponsorName;
  if (uplineDirector) user.uplineDirector = uplineDirector;
  if (uplineWorldTeamLeader) user.uplineWorldTeamLeader = uplineWorldTeamLeader;
  await saveDb(db);
  const { password: _, ...sanitized } = user;
  return res.json({ user: sanitized });
});
router2.post("/auth/change-password", async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ error: "User ID and new password are required" });
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long" });
  }
  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  if (user.password && currentPassword && !verifyPassword(currentPassword, user.password)) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  user.password = hashPassword(newPassword);
  await saveDb(db);
  return res.json({ success: true, message: "Password updated successfully" });
});
router2.get("/attendance/status", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  const today = getTodayDateStr();
  const todayRecord = db.attendance.find((a) => a.userId === userId && a.date === today);
  const simHour = req.query.simHour ? parseInt(req.query.simHour, 10) : void 0;
  const simMin = req.query.simMin ? parseInt(req.query.simMin, 10) : void 0;
  const simulatedTime = simHour !== void 0 ? { hour: simHour, minute: simMin ?? 0 } : void 0;
  const ethic = evaluateUserWorkEthic(userId, db, simulatedTime);
  const gmt1 = getGMT1Info(/* @__PURE__ */ new Date(), simulatedTime);
  if (!todayRecord) {
    return res.json({
      isClockedIn: false,
      record: null,
      workEthicStatus: ethic.workEthicStatus,
      unseriousReason: ethic.unseriousReason,
      hasWrittenTodoToday: ethic.hasWrittenTodoToday,
      officeLocation: user?.officeLocation,
      gmt1,
      message: "Not clocked in today"
    });
  }
  const isClockedIn = todayRecord.clockIn && !todayRecord.clockOut;
  let elapsedMinutes = todayRecord.durationMinutes;
  if (isClockedIn && todayRecord.clockInTimestamp) {
    elapsedMinutes = Math.floor((Date.now() - todayRecord.clockInTimestamp) / 6e4);
    todayRecord.durationMinutes = elapsedMinutes;
    todayRecord.durationFormatted = formatDuration(elapsedMinutes);
  }
  todayRecord.workEthicStatus = ethic.workEthicStatus;
  todayRecord.unseriousReason = ethic.unseriousReason;
  return res.json({
    isClockedIn: Boolean(isClockedIn),
    record: todayRecord,
    workEthicStatus: ethic.workEthicStatus,
    unseriousReason: ethic.unseriousReason,
    hasWrittenTodoToday: ethic.hasWrittenTodoToday,
    officeLocation: user?.officeLocation,
    gmt1
  });
});
router2.post("/attendance/clock-in", async (req, res) => {
  const {
    userId,
    clientLocation,
    remark,
    period = "Morning Roll Call",
    bypassLocationTest = false,
    simulatedTime
  } = req.body;
  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found in records" });
  }
  let distanceMeters = 0;
  let isOfficeMatch = true;
  if (user.officeLocation && !bypassLocationTest) {
    if (!clientLocation || typeof clientLocation.lat !== "number" || typeof clientLocation.lng !== "number") {
      return res.status(400).json({
        error: "Please allow GPS location access to verify you are at the office before marking attendance.",
        isLocationRequired: true
      });
    }
    distanceMeters = calculateDistanceMeters(
      clientLocation.lat,
      clientLocation.lng,
      user.officeLocation.lat,
      user.officeLocation.lng
    );
    if (distanceMeters > 200) {
      return res.status(400).json({
        error: "Go to office you lazy bone",
        isLocationMismatch: true,
        distanceMeters,
        officeAddress: user.officeLocation.address,
        userLocation: clientLocation
      });
    }
  }
  const gmt1 = getGMT1Info(/* @__PURE__ */ new Date(), simulatedTime);
  let finalStatus = "present";
  let timingDetail = "";
  if (gmt1.isBefore930) {
    finalStatus = "late";
    timingDetail = `Marked Late: Arrived at ${gmt1.timeStr} before designated 9:30 AM GMT+1 window`;
  } else if (gmt1.isPast1000) {
    finalStatus = "late";
    timingDetail = `Marked Late: Arrived at ${gmt1.timeStr} past 10:00 AM GMT+1 deadline`;
  } else {
    finalStatus = "present";
    timingDetail = `Marked Present: On time at ${gmt1.timeStr} within 9:30 AM \u2013 10:00 AM GMT+1 window`;
  }
  const today = getTodayDateStr();
  let record = db.attendance.find((a) => a.userId === userId && a.date === today);
  const now = /* @__PURE__ */ new Date();
  const clockInTimeStr = gmt1.timeStr;
  const ethic = evaluateUserWorkEthic(user.id, db);
  const activityNote = remark ? `${period} \xB7 ${remark} (${timingDetail})` : timingDetail;
  if (record) {
    if (record.clockIn && !record.clockOut) {
      return res.status(400).json({ error: "You have already marked your presence for today" });
    }
    record.clockIn = clockInTimeStr;
    record.clockInTimestamp = now.getTime();
    record.clockOut = null;
    record.clockOutTimestamp = null;
    record.status = finalStatus;
    record.workEthicStatus = ethic.workEthicStatus;
    record.unseriousReason = ethic.unseriousReason;
    record.lastActivity = activityNote;
    record.checkInLocation = {
      lat: clientLocation?.lat || user.officeLocation?.lat || 0,
      lng: clientLocation?.lng || user.officeLocation?.lng || 0,
      address: user.officeLocation?.address,
      isOfficeMatch: true,
      distanceMeters
    };
  } else {
    record = {
      id: `att_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userAvatar: user.profileImage,
      date: today,
      clockIn: clockInTimeStr,
      clockInTimestamp: now.getTime(),
      clockOut: null,
      clockOutTimestamp: null,
      durationMinutes: 0,
      durationFormatted: "0m",
      status: finalStatus,
      workEthicStatus: ethic.workEthicStatus,
      unseriousReason: ethic.unseriousReason,
      lastActivity: activityNote,
      checkInLocation: {
        lat: clientLocation?.lat || user.officeLocation?.lat || 0,
        lng: clientLocation?.lng || user.officeLocation?.lng || 0,
        address: user.officeLocation?.address,
        isOfficeMatch: true,
        distanceMeters
      }
    };
    db.attendance.push(record);
  }
  await saveDb(db);
  return res.json({ success: true, record, timingDetail, gmt1 });
});
router2.post("/attendance/clock-out", async (req, res) => {
  const { userId } = req.body;
  const db = await getDb();
  const today = getTodayDateStr();
  const record = db.attendance.find((a) => a.userId === userId && a.date === today);
  if (!record || !record.clockInTimestamp || record.clockOut) {
    return res.status(400).json({ error: "No active clock-in session found for today" });
  }
  const now = /* @__PURE__ */ new Date();
  const clockOutTimeStr = getGMT1Info(now).timeStr;
  const totalMinutes = Math.max(1, Math.floor((now.getTime() - record.clockInTimestamp) / 6e4));
  record.clockOut = clockOutTimeStr;
  record.clockOutTimestamp = now.getTime();
  record.durationMinutes = totalMinutes;
  record.durationFormatted = formatDuration(totalMinutes);
  record.status = "clocked_out";
  record.lastActivity = `Shift completed (${record.durationFormatted})`;
  await saveDb(db);
  return res.json({ success: true, record });
});
router2.get("/attendance/history", async (req, res) => {
  const userId = req.query.userId;
  const db = await getDb();
  let list = db.attendance;
  if (userId) {
    list = list.filter((a) => a.userId === userId);
  }
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return res.json(sorted);
});
router2.get("/attendance/team", async (_req, res) => {
  const db = await getDb();
  const today = getTodayDateStr();
  const members = db.users.filter((u) => u.role === "member");
  const liveTeam = members.map((member) => {
    const todayRec = db.attendance.find((a) => a.userId === member.id && a.date === today);
    const ethic = evaluateUserWorkEthic(member.id, db);
    if (!todayRec) {
      return {
        memberId: member.id,
        name: member.name,
        avatar: member.profileImage,
        status: "not_checked_in",
        workEthicStatus: ethic.workEthicStatus,
        unseriousReason: ethic.unseriousReason,
        hasWrittenTodoToday: ethic.hasWrittenTodoToday,
        clockIn: "\u2014",
        duration: "\u2014",
        lastActivity: "No check-in recorded yet"
      };
    }
    let duration = todayRec.durationFormatted;
    if (todayRec.clockIn && !todayRec.clockOut && todayRec.clockInTimestamp) {
      const liveMin = Math.floor((Date.now() - todayRec.clockInTimestamp) / 6e4);
      duration = formatDuration(liveMin);
    }
    return {
      memberId: member.id,
      name: member.name,
      avatar: member.profileImage,
      status: todayRec.status,
      workEthicStatus: ethic.workEthicStatus,
      unseriousReason: ethic.unseriousReason,
      hasWrittenTodoToday: ethic.hasWrittenTodoToday,
      clockIn: todayRec.clockIn || "\u2014",
      duration,
      lastActivity: todayRec.lastActivity
    };
  });
  const presentCount = liveTeam.filter((m) => m.status === "present").length;
  const lateCount = liveTeam.filter((m) => m.status === "late").length;
  const clockedOutCount = liveTeam.filter((m) => m.status === "clocked_out").length;
  const notCheckedInCount = liveTeam.filter((m) => m.status === "not_checked_in").length;
  const unseriousCount = liveTeam.filter((m) => m.workEthicStatus === "unserious").length;
  const seriousCount = liveTeam.filter((m) => m.workEthicStatus === "serious").length;
  const total = liveTeam.length;
  return res.json({
    summary: {
      total,
      presentCount: presentCount + lateCount,
      // actively present or late
      purePresent: presentCount,
      lateCount,
      clockedOutCount,
      notCheckedInCount,
      absentCount: notCheckedInCount,
      unseriousCount,
      seriousCount
    },
    members: liveTeam
  });
});
router2.get("/tasks", async (req, res) => {
  const { userId, role, status, priority, type } = req.query;
  const db = await getDb();
  let tasks = [...db.tasks];
  if (userId) {
    tasks = tasks.filter((t) => t.assigneeId === userId);
  } else if (role === "member") {
    tasks = [];
  }
  if (type) {
    tasks = tasks.filter((t) => t.type === type);
  }
  if (status && status !== "all") {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (priority && priority !== "all") {
    tasks = tasks.filter((t) => t.priority === priority);
  }
  return res.json(tasks);
});
router2.post("/tasks/toggle", async (req, res) => {
  const { taskId } = req.body;
  const db = await getDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  task.status = task.status === "completed" ? "todo" : "completed";
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveDb(db);
  return res.json({ success: true, task });
});
router2.post("/tasks/create", async (req, res) => {
  const { title, description, assigneeId, type = "personal", priority = "medium", dueDate, dueTime } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }
  const db = await getDb();
  const targetUserId = assigneeId || req.headers["x-user-id"] || db.users[0]?.id || "usr_personal";
  const assignee = db.users.find((u) => u.id === targetUserId);
  const newTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title.trim(),
    description: (description || "").trim(),
    assigneeId: targetUserId,
    assigneeName: assignee?.name || req.body.assigneeName || "Member",
    type: type === "personal" ? "personal" : "assigned",
    status: "todo",
    priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
    dueDate: dueDate || getTodayDateStr(),
    dueTime: dueTime || "05:00 PM",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.tasks.unshift(newTask);
  await saveDb(db);
  return res.status(201).json({ success: true, task: newTask });
});
router2.post("/tasks/delete", async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: "taskId is required" });
  }
  const db = await getDb();
  const beforeLen = db.tasks.length;
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  await saveDb(db);
  return res.json({ success: true, count: db.tasks.length, deleted: beforeLen !== db.tasks.length });
});
router2.delete("/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  const db = await getDb();
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  await saveDb(db);
  return res.json({ success: true });
});
router2.post("/tasks/update", async (req, res) => {
  const { taskId, status, priority, dueDate, dueTime, description, title } = req.body;
  const db = await getDb();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  if (status) task.status = status;
  if (priority) task.priority = priority;
  if (dueDate) task.dueDate = dueDate;
  if (dueTime) task.dueTime = dueTime;
  if (description !== void 0) task.description = description;
  if (title) task.title = title;
  task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveDb(db);
  return res.json({ success: true, task });
});
router2.get("/spending", async (req, res) => {
  const { userId, role } = req.query;
  if (role === "admin") {
    return res.status(403).json({
      error: "Access Forbidden: Finance and spending data are strictly confidential and restricted from administrator access."
    });
  }
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const db = await getDb();
  const userSpend = db.spending.filter((s) => s.userId === userId);
  const currentMonthStr = getTodayDateStr().substring(0, 7);
  const monthTransactions = userSpend.filter((s) => s.date.startsWith(currentMonthStr));
  const totalSpentThisMonth = monthTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  const userBudget = db.budgets.find((b) => b.userId === userId && b.month === currentMonthStr) || {
    monthlyBudget: 25e4
  };
  return res.json({
    currentMonth: currentMonthStr,
    totalSpentThisMonth,
    monthlyBudget: userBudget.monthlyBudget,
    transactions: [...userSpend].sort((a, b) => b.date.localeCompare(a.date))
  });
});
router2.post("/spending/add", async (req, res) => {
  const { userId, role, merchant, amount, category, description, date, receipt } = req.body;
  if (role === "admin") {
    return res.status(403).json({
      error: "Access Forbidden: Administrators cannot record or view member spending."
    });
  }
  if (!userId || !merchant || !amount || !category) {
    return res.status(400).json({ error: "Merchant, amount, and category are required" });
  }
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "Amount must be a positive number" });
  }
  const db = await getDb();
  const newRecord = {
    id: `sp_${Date.now()}`,
    userId,
    merchant,
    amount: numericAmount,
    category,
    description: description || "",
    date: date || getTodayDateStr(),
    receipt: receipt || void 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.spending.unshift(newRecord);
  await saveDb(db);
  return res.status(201).json({ success: true, record: newRecord });
});
router2.get("/team", async (_req, res) => {
  const db = await getDb();
  const members = db.users.map(({ password: _, ...user }) => {
    const assignedTasks = db.tasks.filter((t) => t.assigneeId === user.id);
    const completedTasks = assignedTasks.filter((t) => t.status === "completed").length;
    const pendingTasks = assignedTasks.length - completedTasks;
    return {
      ...user,
      taskCount: assignedTasks.length,
      pendingTasks,
      completedTasks
    };
  });
  return res.json(members);
});
var booksCache = /* @__PURE__ */ new Map();
var dictionaryCache = /* @__PURE__ */ new Map();
var CURATED_LIBRARY_BOOKS = [
  {
    key: "/curated/think-and-grow-rich",
    title: "Think and Grow Rich",
    author_name: ["Napoleon Hill"],
    category: "Personal Growth",
    first_publish_year: 1937,
    coverUrl: "https://covers.openlibrary.org/b/id/10452912-M.jpg",
    cover_i: 10452912,
    ia: ["thinkgrowrich0000hill"],
    googleBookId: "j6fSDwAAQBAJ",
    description: "The definitive classic on personal achievement and building wealth through burning desire, autosuggestion, persistence, and mastermind alignment.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/atomic-habits",
    title: "Atomic Habits",
    author_name: ["James Clear"],
    category: "Habit Building",
    first_publish_year: 2018,
    coverUrl: "https://covers.openlibrary.org/b/id/12886416-M.jpg",
    cover_i: 12886416,
    googleBookId: "fFCjDwAAQBAJ",
    description: "A proven framework for improving 1% every single day. Shows how small compounding habits transform health, productivity, and wealth.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/psychology-of-money",
    title: "The Psychology of Money",
    author_name: ["Morgan Housel"],
    category: "Financial Literacy",
    first_publish_year: 2020,
    coverUrl: "https://covers.openlibrary.org/b/id/11181817-M.jpg",
    cover_i: 11181817,
    googleBookId: "wvTXDwAAQBAJ",
    description: "19 short stories exploring the strange ways people think about money and teaching you how to make better sense of financial decisions.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/richest-man-in-babylon",
    title: "The Richest Man in Babylon",
    author_name: ["George S. Clason"],
    category: "Financial Literacy",
    first_publish_year: 1926,
    coverUrl: "https://covers.openlibrary.org/b/id/10452912-M.jpg",
    cover_i: 10452912,
    ia: ["richestmaninbaby00clas"],
    googleBookId: "7Tf8CwAAQBAJ",
    description: "Timeless Babylonian parables detailing the fundamental laws of financial independence: pay yourself first, live below your means, and make your gold work for you.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/how-to-win-friends",
    title: "How to Win Friends and Influence People",
    author_name: ["Dale Carnegie"],
    category: "Relationships",
    first_publish_year: 1936,
    coverUrl: "https://covers.openlibrary.org/b/id/8235109-M.jpg",
    cover_i: 8235109,
    ia: ["howtowinfriendsp0000carn"],
    googleBookId: "1dYkDwAAQBAJ",
    description: "Master interpersonal communication, earn trust quickly, become a persuasive communicator, and lead without friction.",
    ebook_access: "preview",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/7-habits",
    title: "The 7 Habits of Highly Effective People",
    author_name: ["Stephen R. Covey"],
    category: "Personal Growth",
    first_publish_year: 1989,
    coverUrl: "https://covers.openlibrary.org/b/id/8315182-M.jpg",
    cover_i: 8315182,
    ia: ["7habitsofhighlye00cove"],
    googleBookId: "3mE4CwAAQBAJ",
    description: "A holistic, integrated approach for solving personal and professional problems based on timeless character principles and proactive choices.",
    ebook_access: "preview",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/rich-dad-poor-dad",
    title: "Rich Dad Poor Dad",
    author_name: ["Robert T. Kiyosaki"],
    category: "Financial Literacy",
    first_publish_year: 1997,
    coverUrl: "https://covers.openlibrary.org/b/id/12547191-M.jpg",
    cover_i: 12547191,
    googleBookId: "86n1DwAAQBAJ",
    description: "What the wealthy teach their children about money and assets. Explodes the myth that high income equals financial freedom.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/art-of-war",
    title: "The Art of War",
    author_name: ["Sun Tzu"],
    category: "Leadership",
    first_publish_year: 1910,
    coverUrl: "https://covers.openlibrary.org/b/id/12547191-M.jpg",
    cover_i: 12547191,
    ia: ["artofwar00sunz"],
    googleBookId: "g4o_AQAAIAAJ",
    description: "Ancient tactical wisdom on positioning, timing, psychological discipline, and turning chaos into opportunity.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/as-a-man-thinketh",
    title: "As a Man Thinketh",
    author_name: ["James Allen"],
    category: "Personal Growth",
    first_publish_year: 1903,
    coverUrl: "https://covers.openlibrary.org/b/id/8231856-M.jpg",
    cover_i: 8231856,
    ia: ["asamanthinketh00alle"],
    googleBookId: "3zB4AAAAMAAJ",
    description: "A masterwork on how mental thoughts and focus create our character, environment, and physical health.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/compound-effect",
    title: "The Compound Effect",
    author_name: ["Darren Hardy"],
    category: "Personal Growth",
    first_publish_year: 2010,
    coverUrl: "https://covers.openlibrary.org/b/id/10542387-M.jpg",
    cover_i: 10542387,
    googleBookId: "y_6cDwAAQBAJ",
    description: "No gimmicks. Learn the exact operating system to multiply your success through small, unsexy daily disciplines executed consistently over time.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/deep-work",
    title: "Deep Work: Rules for Focused Success",
    author_name: ["Cal Newport"],
    category: "Productivity",
    first_publish_year: 2016,
    coverUrl: "https://covers.openlibrary.org/b/id/8575023-M.jpg",
    cover_i: 8575023,
    googleBookId: "u_t0CgAAQBAJ",
    description: "Master deep concentration in a distracted world to produce elite, rare value faster and outpace the competition.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/10x-rule",
    title: "The 10X Rule",
    author_name: ["Grant Cardone"],
    category: "Sales & Networking",
    first_publish_year: 2011,
    coverUrl: "https://covers.openlibrary.org/b/id/8682132-M.jpg",
    cover_i: 8682132,
    googleBookId: "6bT0DwAAQBAJ",
    description: "Scale your goals by 10X and multiply your daily actions by 10X to dominate your industry and eliminate fear through massive execution.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/go-pro",
    title: "Go Pro: 7 Steps to Becoming a Network Marketing Professional",
    author_name: ["Eric Worre"],
    category: "Network Marketing",
    first_publish_year: 2013,
    coverUrl: "https://covers.openlibrary.org/b/id/8271923-M.jpg",
    cover_i: 8271923,
    googleBookId: "13PXDwAAQBAJ",
    description: "The ultimate blueprint for direct selling: how to find prospects, invite with confidence, present powerfully, and coach new partners.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/extreme-ownership",
    title: "Extreme Ownership: How Navy SEALs Lead and Win",
    author_name: ["Jocko Willink", "Leif Babin"],
    category: "Leadership",
    first_publish_year: 2015,
    coverUrl: "https://covers.openlibrary.org/b/id/9262104-M.jpg",
    cover_i: 9262104,
    googleBookId: "c7_hCgAAQBAJ",
    description: "Leaders must own everything in their world. No excuses, no blaming circumstances \u2014 true ownership turns underperforming teams into championship units.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/start-with-why",
    title: "Start with Why",
    author_name: ["Simon Sinek"],
    category: "Leadership",
    first_publish_year: 2009,
    coverUrl: "https://covers.openlibrary.org/b/id/8254101-M.jpg",
    cover_i: 8254101,
    googleBookId: "4f2gCgAAQBAJ",
    description: "How leaders build cult-like loyalty and inspire movements by clearly communicating their core purpose before explaining what they sell.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/good-to-great",
    title: "Good to Great",
    author_name: ["Jim Collins"],
    category: "Leadership",
    first_publish_year: 2001,
    coverUrl: "https://covers.openlibrary.org/b/id/8226019-M.jpg",
    cover_i: 8226019,
    googleBookId: "3R3wDwAAQBAJ",
    description: "Examines why certain businesses break away from mediocrity to achieve lasting greatness through disciplined people, disciplined thought, and disciplined action.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/eat-that-frog",
    title: "Eat That Frog! 21 Great Ways to Stop Procrastinating",
    author_name: ["Brian Tracy"],
    category: "Productivity",
    first_publish_year: 2001,
    coverUrl: "https://covers.openlibrary.org/b/id/8228392-M.jpg",
    cover_i: 8228392,
    ia: ["eatthatfrog21gre0000trac"],
    googleBookId: "g6f_DwAAQBAJ",
    description: "Stop delaying the hard decisions. Knock out your highest-leverage task at the start of each morning to build unstoppable daily momentum.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/self-reliance",
    title: "Self-Reliance and Other Essays",
    author_name: ["Ralph Waldo Emerson"],
    category: "Personal Growth",
    first_publish_year: 1841,
    coverUrl: "https://covers.openlibrary.org/b/id/6479532-M.jpg",
    cover_i: 6479532,
    ia: ["selfreliance00emer"],
    googleBookId: "1-W8QgAACAAJ",
    description: "A ringing anthem for individual conviction, trust in one\u2019s own instincts, and standing tall against conformist societal expectations.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/the-prince",
    title: "The Prince",
    author_name: ["Niccol\xF2 Machiavelli"],
    category: "Leadership",
    first_publish_year: 1532,
    coverUrl: "https://covers.openlibrary.org/b/id/9255566-M.jpg",
    cover_i: 9255566,
    ia: ["prince00machrich"],
    googleBookId: "3mE4CwAAQBAJ",
    description: "The historic manual on political power, statecraft, strategy, and navigating human nature in high-stakes environments.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/millionaire-fastlane",
    title: "The Millionaire Fastlane",
    author_name: ["MJ DeMarco"],
    category: "Entrepreneurship",
    first_publish_year: 2011,
    coverUrl: "https://covers.openlibrary.org/b/id/10542388-M.jpg",
    cover_i: 10542388,
    googleBookId: "yF4oDwAAQBAJ",
    description: "Cut through conventional slow-lane financial dogma. Build scalable business systems that generate exponential wealth and buy back your time.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/zero-to-one",
    title: "Zero to One: Notes on Startups",
    author_name: ["Peter Thiel", "Blake Masters"],
    category: "Entrepreneurship",
    first_publish_year: 2014,
    coverUrl: "https://covers.openlibrary.org/b/id/8239012-M.jpg",
    cover_i: 8239012,
    googleBookId: "0bKjAwAAQBAJ",
    description: "How to build unique value propositions that create brand-new categories instead of competing in saturated red oceans.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/lean-startup",
    title: "The Lean Startup",
    author_name: ["Eric Ries"],
    category: "Entrepreneurship",
    first_publish_year: 2011,
    coverUrl: "https://covers.openlibrary.org/b/id/8234850-M.jpg",
    cover_i: 8234850,
    googleBookId: "r1k_DwAAQBAJ",
    description: "Validate ideas rapidly with Minimum Viable Products, measure client traction rigorously, and pivot before running out of runway.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/mindset",
    title: "Mindset: The New Psychology of Success",
    author_name: ["Carol S. Dweck"],
    category: "Personal Growth",
    first_publish_year: 2006,
    coverUrl: "https://covers.openlibrary.org/b/id/8267123-M.jpg",
    cover_i: 8267123,
    ia: ["mindsetnewpsycho0000dwec"],
    googleBookId: "fdjqz0sPL2wC",
    description: "Discover how cultivating a growth mindset unlocks resilience, enables genuine learning from setbacks, and drives long-term mastery.",
    ebook_access: "public",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/power-of-discipline",
    title: "The Power of Discipline",
    author_name: ["Daniel Walter"],
    category: "Habit Building",
    first_publish_year: 2020,
    coverUrl: "https://covers.openlibrary.org/b/id/11181818-M.jpg",
    cover_i: 11181818,
    googleBookId: "96ZkEAAAQBAJ",
    description: "How to build self-control, mental toughness, and focus to defeat daily friction and execute on long-term targets.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  },
  {
    key: "/curated/4-hour-workweek",
    title: "The 4-Hour Workweek",
    author_name: ["Timothy Ferriss"],
    category: "Entrepreneurship",
    first_publish_year: 2007,
    coverUrl: "https://covers.openlibrary.org/b/id/8238124-M.jpg",
    cover_i: 8238124,
    ia: ["4hourworkweekesc0000ferr"],
    googleBookId: "2v4uDwAAQBAJ",
    description: "Lifestyle design for networkers and freelancers. Outsource low-value work, automate income pipelines, and reclaim your personal freedom.",
    ebook_access: "preview",
    embeddable: true,
    source: "both"
  },
  {
    key: "/curated/first-year-network-marketing",
    title: "Your First Year in Network Marketing",
    author_name: ["Mark Yarnell", "Rene Reid Yarnell"],
    category: "Network Marketing",
    first_publish_year: 1998,
    coverUrl: "https://covers.openlibrary.org/b/id/6548912-M.jpg",
    cover_i: 6548912,
    googleBookId: "z8SXDwAAQBAJ",
    description: "Overcome fear of rejection, support new recruits effectively, and build solid habits that carry you through the critical foundation phase.",
    ebook_access: "preview",
    embeddable: true,
    source: "googlebooks"
  }
];
function searchCuratedBooks(query, category) {
  let list = [...CURATED_LIBRARY_BOOKS];
  if (category && category !== "All" && category !== "all") {
    const catLower = category.toLowerCase().trim();
    const catFiltered = list.filter((b) => b.category.toLowerCase().includes(catLower) || catLower.includes(b.category.toLowerCase()));
    if (catFiltered.length > 0) {
      list = catFiltered;
    }
  }
  if (!query || !query.trim()) {
    return list;
  }
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const matched = list.filter((b) => {
    const text = `${b.title} ${b.author_name.join(" ")} ${b.category} ${b.description}`.toLowerCase();
    return text.includes(q) || words.some((w) => text.includes(w));
  });
  return matched.length > 0 ? matched : list;
}
router2.get("/library/categories", async (_req, res) => {
  return res.json([
    "All",
    "Personal Growth",
    "Habit Building",
    "Financial Literacy",
    "Leadership",
    "Network Marketing",
    "Sales & Networking",
    "Entrepreneurship",
    "Productivity",
    "Relationships"
  ]);
});
router2.get("/library/books", async (req, res) => {
  const selectedCategory = req.query.category || "";
  const search = req.query.search?.trim() || "";
  const cacheKey = `${selectedCategory}_${search}`.toLowerCase();
  const cached = booksCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 36e5) {
    return res.json(cached.data);
  }
  const curated = searchCuratedBooks(search, selectedCategory);
  if (search && search.length > 3) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e3);
      const params = new URLSearchParams({
        q: search,
        fields: "key,title,author_name,cover_i,first_publish_year,ebook_access,ia,isbn",
        limit: "15"
      });
      const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
        headers: { "User-Agent": "WonderTeamApp/1.0" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const json = await response.json();
        const docs = (json.docs || []).map((doc) => ({
          ...doc,
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : void 0,
          category: selectedCategory || "Personal Growth",
          source: "openlibrary"
        }));
        const existingKeys = new Set(curated.map((b) => b.title.toLowerCase()));
        const uniqueExternal = docs.filter((d) => !existingKeys.has(d.title.toLowerCase()));
        const combined = [...curated, ...uniqueExternal];
        const result2 = {
          category: selectedCategory || "All",
          total: combined.length,
          books: combined
        };
        booksCache.set(cacheKey, { data: result2, timestamp: Date.now() });
        return res.json(result2);
      }
    } catch {
    }
  }
  const result = {
    category: selectedCategory || "All",
    total: curated.length,
    books: curated
  };
  booksCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return res.json(result);
});
router2.get("/library/saved", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const db = await getDb();
  const saved = (db.savedBooks || []).filter((b) => b.userId === userId);
  return res.json(saved);
});
router2.post("/library/save", async (req, res) => {
  const { userId, bookKey, title, author, coverId, coverUrl, iaId, category } = req.body;
  if (!userId || !bookKey || !title) {
    return res.status(400).json({ error: "userId, bookKey, and title are required" });
  }
  const db = await getDb();
  if (!db.savedBooks) {
    db.savedBooks = [];
  }
  const existing = db.savedBooks.find((b) => b.userId === userId && b.bookKey === bookKey);
  if (existing) {
    return res.json({ success: true, savedBook: existing, message: "Already on bookshelf" });
  }
  const newSaved = {
    id: `sb_${Date.now()}`,
    userId,
    bookKey,
    title,
    author: author || "Unknown Author",
    coverId,
    coverUrl: coverUrl || (coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : void 0),
    iaId,
    category: category || "General",
    progressPercent: 0,
    status: "reading",
    lastReadDate: getTodayDateStr()
  };
  db.savedBooks.unshift(newSaved);
  await saveDb(db);
  return res.status(201).json({ success: true, savedBook: newSaved });
});
router2.post("/library/progress", async (req, res) => {
  const { id, progressPercent, status, notes } = req.body;
  const db = await getDb();
  if (!db.savedBooks) {
    return res.status(404).json({ error: "Book record not found" });
  }
  const book = db.savedBooks.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: "Book record not found" });
  }
  if (typeof progressPercent === "number") {
    book.progressPercent = Math.min(100, Math.max(0, progressPercent));
  }
  if (status) {
    book.status = status;
  }
  if (notes !== void 0) {
    book.notes = notes;
  }
  book.lastReadDate = getTodayDateStr();
  await saveDb(db);
  return res.json({ success: true, book });
});
var BUILTIN_DICTIONARY = {
  hello: [
    {
      word: "hello",
      phonetic: "h\u0259\u02C8l\u0259\u028A",
      phonetics: [
        {
          text: "h\u0259\u02C8l\u0259\u028A",
          audio: "https://ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3"
        }
      ],
      origin: "early 19th century: variant of earlier hollo ; related to holla.",
      meanings: [
        {
          partOfSpeech: "exclamation",
          definitions: [
            {
              definition: "used as a greeting or to begin a phone conversation.",
              example: "hello there, welcome to WonderTeam!",
              synonyms: ["greeting", "salutation", "hi"],
              antonyms: ["goodbye", "farewell"]
            }
          ]
        },
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "an utterance of \u2018hello\u2019; a greeting.",
              example: "she was getting polite nods and hellos from people",
              synonyms: ["greeting"],
              antonyms: []
            }
          ]
        }
      ]
    }
  ],
  discipline: [
    {
      word: "discipline",
      phonetic: "/\u02C8d\u026As.\u0259.pl\u026An/",
      phonetics: [{ text: "/\u02C8d\u026As.\u0259.pl\u026An/" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "the practice of training people to obey rules or a code of behavior, using punishment to correct disobedience.",
              example: "A student with self-discipline excels in morning attendance and study habits.",
              synonyms: ["control", "order", "self-control", "strictness"],
              antonyms: ["chaos", "disorder", "indiscipline"]
            },
            {
              definition: "the ability to control one's feelings and overcome one's weaknesses; the ability to pursue what one thinks is right despite temptations to abandon it.",
              example: "She showed great discipline in writing her morning to-do list before 11:00 AM.",
              synonyms: ["willpower", "determination", "resolve"],
              antonyms: ["weakness"]
            }
          ]
        },
        {
          partOfSpeech: "verb",
          definitions: [
            {
              definition: "train oneself or others to do something in a controlled and habitual way.",
              example: "every member must discipline themselves to arrive at the office on time.",
              synonyms: ["train", "drill", "condition"],
              antonyms: []
            }
          ]
        }
      ]
    }
  ],
  leadership: [
    {
      word: "leadership",
      phonetic: "/\u02C8li\u02D0.d\u0259r.\u0283\u026Ap/",
      phonetics: [{ text: "/\u02C8li\u02D0.d\u0259r.\u0283\u026Ap/" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "the action of leading a group of people or an organization, or the ability to do so with vision and integrity.",
              example: "The class prefect demonstrated outstanding leadership during morning assembly.",
              synonyms: ["guidance", "direction", "mentorship", "management"],
              antonyms: ["followership", "subordination"]
            }
          ]
        }
      ]
    }
  ],
  punctuality: [
    {
      word: "punctuality",
      phonetic: "/\u02CCp\u028C\u014Bk.t\u0283u\u02C8\xE6l.\u0259.ti/",
      phonetics: [{ text: "/\u02CCp\u028C\u014Bk.t\u0283u\u02C8\xE6l.\u0259.ti/" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "the characteristic of being able to complete a required task or fulfill an obligation before or at a previously designated time; being on time.",
              example: "Marking roll call between 9:30 AM and 10:00 AM demonstrates student punctuality.",
              synonyms: ["promptness", "timeliness", "readiness"],
              antonyms: ["tardiness", "lateness", "delay"]
            }
          ]
        }
      ]
    }
  ],
  integrity: [
    {
      word: "integrity",
      phonetic: "/\u026An\u02C8te\u0261.r\u0259.ti/",
      phonetics: [{ text: "/\u026An\u02C8te\u0261.r\u0259.ti/" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "the quality of being honest and having strong moral principles; moral uprightness.",
              example: "The student signed the attendance affirmation with complete integrity.",
              synonyms: ["honesty", "uprightness", "honor", "sincerity"],
              antonyms: ["dishonesty", "deceit"]
            }
          ]
        }
      ]
    }
  ],
  productivity: [
    {
      word: "productivity",
      phonetic: "/\u02CCpr\u0252d.\u028Ck\u02C8t\u026Av.\u0259.ti/",
      phonetics: [{ text: "/\u02CCpr\u0252d.\u028Ck\u02C8t\u026Av.\u0259.ti/" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "the effectiveness of productive effort, especially in industry or personal study, as measured in terms of the rate of output per unit of input.",
              example: "Writing your daily to-do list in the morning increases study productivity.",
              synonyms: ["efficiency", "output", "performance"],
              antonyms: ["wastefulness", "inactivity"]
            }
          ]
        }
      ]
    }
  ],
  mindfulness: [
    {
      word: "mindfulness",
      phonetic: "/\u02C8ma\u026And.f\u0259l.n\u0259s/",
      phonetics: [{ text: "/\u02C8ma\u026And.f\u0259l.n\u0259s/" }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: "a mental state achieved by focusing one's awareness on the present moment, while calmly acknowledging and accepting one's feelings, thoughts, and bodily sensations.",
              example: "Practicing mindfulness helps students maintain calmness during examinations.",
              synonyms: ["awareness", "focus", "attentiveness"],
              antonyms: ["distraction", "heedlessness"]
            }
          ]
        }
      ]
    }
  ]
};
router2.get("/dictionary/:word", async (req, res) => {
  const rawWord = req.params.word?.trim().toLowerCase();
  if (!rawWord) {
    return res.status(400).json({ error: "Word parameter is required" });
  }
  const cached = dictionaryCache.get(rawWord);
  if (cached && Date.now() - cached.timestamp < 36e5 * 24) {
    return res.json(cached.data);
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const apiRes = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(rawWord)}`,
      {
        headers: {
          "User-Agent": "WonderTeamStudentApp/1.0 (timilehinoladoja2002@gmail.com)"
        },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    if (apiRes.ok) {
      const data = await apiRes.json();
      dictionaryCache.set(rawWord, { data, timestamp: Date.now() });
      return res.json(data);
    }
    if (apiRes.status === 404) {
      if (BUILTIN_DICTIONARY[rawWord]) {
        return res.json(BUILTIN_DICTIONARY[rawWord]);
      }
      return res.status(404).json({
        error: `No definition found for "${rawWord}". Check spelling or try a root word.`,
        word: rawWord
      });
    }
    if (BUILTIN_DICTIONARY[rawWord]) {
      return res.json(BUILTIN_DICTIONARY[rawWord]);
    }
  } catch (err) {
    console.warn("Dictionary API external fetch failed/timeout, checking fallback:", err.message);
  }
  if (BUILTIN_DICTIONARY[rawWord]) {
    return res.json(BUILTIN_DICTIONARY[rawWord]);
  }
  const capitalized = rawWord.charAt(0).toUpperCase() + rawWord.slice(1);
  const syntheticEntry = [
    {
      word: rawWord,
      phonetic: `/${rawWord}/`,
      phonetics: [{ text: `/${rawWord}/` }],
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            {
              definition: `A term or concept representing "${capitalized}" in student learning, personal development, and intellectual study.`,
              example: `The teacher emphasized the importance of ${rawWord} in academic achievement.`,
              synonyms: ["concept", "principle", "term"],
              antonyms: []
            }
          ]
        }
      ]
    }
  ];
  dictionaryCache.set(rawWord, { data: syntheticEntry, timestamp: Date.now() });
  return res.json(syntheticEntry);
});
var googleBooksCache = /* @__PURE__ */ new Map();
router2.get("/library/google-books", async (req, res) => {
  const q = req.query.q?.trim() || "";
  const category = req.query.category?.trim() || "All";
  const matchingCurated = searchCuratedBooks(q || void 0, category);
  const cacheKey = `${category}::${q}`.toLowerCase();
  const cached = googleBooksCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 36e5 * 2) {
    return res.json(cached.data);
  }
  if (q && q.length > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4e3);
      const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&printType=books`;
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "WonderTeamApp/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Google Books API returned ${response.status}`);
      }
      const data = await response.json();
      const items = (data.items || []).map((item) => {
        const vol = item.volumeInfo || {};
        const access = item.accessInfo || {};
        const isbnObj = (vol.industryIdentifiers || []).find((id) => id.type === "ISBN_13" || id.type === "ISBN_10");
        const isbn = isbnObj ? [isbnObj.identifier] : [];
        const rawCover = vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail || "";
        const secureCover = rawCover ? rawCover.replace(/^http:\/\//i, "https://") : "";
        return {
          key: `/google/${item.id}`,
          googleBookId: item.id,
          title: vol.title || "Untitled Book",
          author_name: vol.authors || ["Authorized Author"],
          description: vol.description || "",
          cover_i: void 0,
          coverUrl: secureCover,
          first_publish_year: vol.publishedDate ? parseInt(vol.publishedDate.substring(0, 4), 10) : void 0,
          ebook_access: access.viewability || "preview",
          embeddable: access.embeddable !== false,
          previewLink: vol.previewLink ? vol.previewLink.replace(/^http:\/\//i, "https://") : void 0,
          infoLink: vol.infoLink ? vol.infoLink.replace(/^http:\/\//i, "https://") : void 0,
          isbn,
          category: category !== "All" ? category : "General",
          source: "googlebooks"
        };
      });
      const existingTitles = new Set(matchingCurated.map((b) => b.title.toLowerCase()));
      const uniqueGoogle = items.filter((b) => !existingTitles.has(b.title.toLowerCase()));
      const combined = [...matchingCurated, ...uniqueGoogle];
      const result2 = {
        total: combined.length,
        books: combined,
        query: q,
        category
      };
      googleBooksCache.set(cacheKey, { data: result2, timestamp: Date.now() });
      return res.json(result2);
    } catch (err) {
      console.warn("Google Books search failed/timed out, returning curated books:", err.message);
    }
  }
  const result = {
    total: matchingCurated.length,
    books: matchingCurated,
    query: q,
    category,
    isFallback: true
  };
  googleBooksCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return res.json(result);
});
router2.get("/library/google-volume/:id", async (req, res) => {
  const volumeId = req.params.id;
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Volume not found" });
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router2.get("/ai/motivational-quote", async (req, res) => {
  const userId = req.query.userId;
  const db = await getDb();
  const user = db.users.find((u) => u.id === userId);
  const gmt1 = getGMT1Info();
  const { period, timeTitle } = getWATPeriodDetails(gmt1.h);
  const todayStr = getTodayDateStr();
  const attendanceRecord = (db.attendance || []).find(
    (r) => r.userId === userId && r.date === todayStr
  );
  const userTasks = (db.tasks || []).filter((t) => t.assigneeId === userId);
  const completedTasks = userTasks.filter((t) => t.status === "completed");
  const pendingTasks = userTasks.filter((t) => t.status !== "completed");
  const userBooks = (db.savedBooks || []).filter((b) => b.userId === userId);
  const memberName = user?.name || "Team Member";
  const isClockedIn = !!attendanceRecord?.clockIn;
  const clockInTime = attendanceRecord?.clockIn || "Not yet recorded";
  const streakDays = (db.attendance || []).filter((r) => r.userId === userId && (r.status === "present" || r.status === "clocked_out")).length;
  const activitySummary = `
Member Name: ${memberName}
Role: Networker & Freelance Entrepreneur
Attendance: ${isClockedIn ? `Clocked in on time at ${clockInTime} (Streak: ${streakDays} days)` : "Has not clocked in yet today"}
Tasks: ${completedTasks.length} completed today, ${pendingTasks.length} pending
Reading: ${userBooks.length} growth books on bookshelf
Current Time in WAT: ${gmt1.timeStr} (Period: ${period})
`;
  const quotesList = CURATED_MOTIVATIONAL_QUOTES[period];
  const fallbackQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
  let personalizedNote = "";
  if (period === "1am_midnight") {
    personalizedNote = `You're awake at ${gmt1.timeStr} building your empire while the crowd rests. ${completedTasks.length > 0 ? `With ${completedTasks.length} tasks completed today, keep that relentless momentum alive.` : "Let this late-night focus fuel your breakthrough tomorrow."}`;
  } else if (period === "morning") {
    personalizedNote = isClockedIn ? `Phenomenal discipline checking in on time at ${clockInTime}. Attack your primary Income Producing Activities right now!` : `Rise and take charge, ${memberName.split(" ")[0]}. Lock in your morning attendance and plan your prospecting calls before 11:00 AM.`;
  } else if (period === "afternoon") {
    personalizedNote = pendingTasks.length > 0 ? `You have ${pendingTasks.length} goals pending for today. Push through the afternoon lull and follow up with your prospects!` : `Outstanding execution today! Keep connecting and building your client pipeline.`;
  } else {
    personalizedNote = `Reviewing today's journey: ${completedTasks.length} goals crushed. Tomorrow belongs to those who prepare their minds tonight.`;
  }
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are a world-class mentor and executive business coach for networkers and freelancers collaborating together.
Generate an inspiring motivational quote and a personalized coaching note for ${memberName}.
Current Time Slot: ${timeTitle} (${period}, WAT time: ${gmt1.timeStr}).
Member's Real App Activity:
${activitySummary}

Special requirement for 1am_midnight: Emphasize the extraordinary drive of midnight hustlers, dreamers, and entrepreneurs who work late into the night (1:00 AM) to break financial limits while others sleep.

Respond with strict JSON adhering to this schema:
{
  "quote": "Inspiring quote text (from famous leaders like Jim Rohn, Eric Worre, Napoleon Hill, Les Brown, Brian Tracy, or original top-tier entrepreneur wisdom)",
  "author": "Author name",
  "timePeriod": "${period}",
  "timeTitle": "${timeTitle}",
  "personalizedNote": "A warm, 1-2 sentence direct coaching message referencing their actual attendance, streak (${streakDays} days), or tasks (${completedTasks.length} completed, ${pendingTasks.length} pending).",
  "activityHighlight": "Brief badge text, e.g. '5-Day Streak Active' or 'Late Night Hustler' or 'Morning Momentum'"
}`;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      });
      const responseText = aiResponse.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return res.json({
          quote: parsed.quote || fallbackQuote.quote,
          author: parsed.author || fallbackQuote.author,
          timePeriod: period,
          timeTitle,
          personalizedNote: parsed.personalizedNote || personalizedNote,
          activityHighlight: parsed.activityHighlight || `${streakDays} Day Streak`
        });
      }
    } catch (err) {
      console.warn("Gemini motivational quote generation fallback:", err.message);
    }
  }
  return res.json({
    quote: fallbackQuote.quote,
    author: fallbackQuote.author,
    timePeriod: period,
    timeTitle,
    personalizedNote,
    activityHighlight: streakDays > 0 ? `${streakDays} Days Consistent` : "Growth Operator"
  });
});
router2.post("/ai/prioritize-tasks", async (req, res) => {
  const { userId, tasks, saveToDb } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({ error: "At least one task is required to prioritize" });
  }
  const evaluateTaskIPA = (title, desc = "") => {
    const text = `${title} ${desc}`.toLowerCase();
    if (/prospect|reach out|contact|talk to|cold list|warm list|leads|names list|phone call/i.test(text)) {
      return { isIPA: true, category: "prospecting", weight: 10 };
    }
    if (/invite|invitation|zoom invite|preview invite|meeting invite/i.test(text)) {
      return { isIPA: true, category: "inviting", weight: 9 };
    }
    if (/present|presentation|pitch|client demo|proposal|showcase|contract pitch/i.test(text)) {
      return { isIPA: true, category: "presentation", weight: 9 };
    }
    if (/follow.?up|call back|check back|prospect reply/i.test(text)) {
      return { isIPA: true, category: "followup", weight: 8 };
    }
    if (/close|closing|enroll|sign client|contract|retainer|deal/i.test(text)) {
      return { isIPA: true, category: "closing", weight: 10 };
    }
    if (/deliverable|milestone|invoice|payment|service client|deliver/i.test(text)) {
      return { isIPA: true, category: "retailing", weight: 8 };
    }
    if (/3-way|team call|downline|coaching|mentor|upline|director/i.test(text)) {
      return { isIPA: true, category: "team_training", weight: 6 };
    }
    if (/read|book|chapter|audio|study|listen/i.test(text)) {
      return { isIPA: false, category: "mindset_reading", weight: 4 };
    }
    return { isIPA: false, category: "general", weight: 2 };
  };
  const heuristicPrioritize = () => {
    const scored = tasks.map((t) => {
      const evalResult = evaluateTaskIPA(t.title, t.description);
      const isHigh = evalResult.weight >= 8;
      const isMed = evalResult.weight >= 5 && evalResult.weight < 8;
      const priority = isHigh ? "high" : isMed ? "medium" : "low";
      let reason = "";
      if (evalResult.category === "prospecting" || evalResult.category === "inviting") {
        reason = "Direct Income Producing Activity: New client outreach and project invitations are the lifeblood of your pipeline.";
      } else if (evalResult.category === "presentation" || evalResult.category === "closing") {
        reason = "High-Value Conversion: Direct client pitches, proposals, and contract closings create immediate revenue and milestone delivery.";
      } else if (evalResult.category === "retailing") {
        reason = "Revenue Driver: Delivering project milestones and servicing clients drives immediate cash flow.";
      } else if (evalResult.category === "followup") {
        reason = "The fortune is in the follow-up: 80% of contracts and deals close between the 5th and 12th touchpoint.";
      } else if (evalResult.category === "team_training") {
        reason = "Team Multiplication: Collaborating and coaching team members scales long-term collective capacity.";
      } else {
        reason = "Operational/Secondary: Schedule after morning income-producing outreach and proposal follow-ups.";
      }
      return {
        ...t,
        priority,
        isIPA: evalResult.isIPA,
        ipaCategory: evalResult.category,
        aiPriorityReason: reason,
        weight: evalResult.weight
      };
    });
    scored.sort((a, b) => b.weight - a.weight);
    const sorted = scored.map((item, idx) => {
      const { weight, ...rest } = item;
      return { ...rest, aiOrder: idx + 1 };
    });
    const ipaCount = sorted.filter((t) => t.isIPA).length;
    const ipaScore = Math.round(ipaCount / sorted.length * 100);
    return {
      analysis: `As an entrepreneur and network builder, your income is directly tied to Income Producing Activities (IPAs): Prospecting, Pitching, Presenting, Following Up, and Closing. Non-IPAs (like file organizing or general reading) are valuable but should never take the prime morning hours away from revenue generation.`,
      prioritizedTasks: sorted,
      ipaScore,
      summaryTip: ipaScore >= 60 ? `\u{1F525} Excellent business focus! ${ipaScore}% of your agenda directly produces revenue and expands your client network.` : `\u26A1 Shift your focus: Only ${ipaScore}% of your tasks are direct IPAs. Move prospecting and client proposals to the top of your morning schedule!`
    };
  };
  let result = heuristicPrioritize();
  if (process.env.GEMINI_API_KEY) {
    try {
      const taskBrief = tasks.map((t, index) => ({
        id: t.id || `task_${index}`,
        title: t.title,
        description: t.description || "",
        currentPriority: t.priority || "medium"
      }));
      const prompt = `You are an elite Business & Time Management Coach specializing in networking and freelancing operations.

Your mission is to rearrange and prioritize the user's daily to-do list using the strict "Income Producing Activities (IPA)" principle of entrepreneurship:

Tier 1 (High Priority IPAs):
- Prospecting / Reaching out to new contacts / Building client lists
- Inviting prospects to discovery calls, product showcases, or contract pitches
- Delivering presentations / Client proposals / Demos
- Following up with prospective clients and active accounts
- Closing deals / Invoicing & securing retainers / Signing new partners

Tier 2 (Medium Priority):
- Client project execution and milestone delivery
- Team onboarding / Collaborating with team members
- Client check-ins and review calls

Tier 3 (Low Priority - Operational / Administrative):
- Mindset reading & book study (vital for growth, but do not sacrifice prime morning revenue hours)
- Organizing materials, emails, general admin, scrolling social media

Member's Task List:
${JSON.stringify(taskBrief, null, 2)}

Provide strict JSON output adhering to this structure:
{
  "analysis": "2-3 sentences of sharp entrepreneur coaching explaining why this order will produce maximum revenue and team growth today.",
  "prioritizedTasks": [
    {
      "id": "matching task id",
      "priority": "high" | "medium" | "low",
      "isIPA": true | false,
      "ipaCategory": "prospecting" | "inviting" | "presentation" | "followup" | "closing" | "retailing" | "team_training" | "mindset_reading" | "general",
      "aiPriorityReason": "Specific 1-sentence reason why this task sits at this position based on revenue value",
      "aiOrder": 1
    }
  ],
  "ipaScore": 75,
  "summaryTip": "One punchy action takeaway sentence for the entrepreneur today"
}`;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3
        }
      });
      const responseText = aiResponse.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (Array.isArray(parsed.prioritizedTasks) && parsed.prioritizedTasks.length > 0) {
          const taskMap = new Map(tasks.map((t) => [t.id, t]));
          const merged = parsed.prioritizedTasks.map((pt, idx) => {
            const original = taskMap.get(pt.id) || {};
            return {
              ...original,
              priority: pt.priority || original.priority || "medium",
              isIPA: pt.isIPA ?? evaluateTaskIPA(original.title || "").isIPA,
              ipaCategory: pt.ipaCategory || evaluateTaskIPA(original.title || "").category,
              aiPriorityReason: pt.aiPriorityReason || "Prioritized by Gemini Income Producing Activity engine.",
              aiOrder: pt.aiOrder || idx + 1
            };
          });
          result = {
            analysis: parsed.analysis || result.analysis,
            prioritizedTasks: merged,
            ipaScore: parsed.ipaScore ?? result.ipaScore,
            summaryTip: parsed.summaryTip || result.summaryTip
          };
        }
      }
    } catch (err) {
      console.warn("Gemini task prioritization fallback to heuristic:", err.message);
    }
  }
  if (saveToDb && userId) {
    const db = await getDb();
    if (db.tasks) {
      for (const pTask of result.prioritizedTasks) {
        const existing = db.tasks.find((t) => t.id === pTask.id);
        if (existing) {
          existing.priority = pTask.priority;
          existing.isIPA = pTask.isIPA;
          existing.ipaCategory = pTask.ipaCategory;
          existing.aiPriorityReason = pTask.aiPriorityReason;
          existing.aiOrder = pTask.aiOrder;
          existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
      await saveDb(db);
    }
  }
  return res.json(result);
});
router2.get("/admin/leaderboard", async (_req, res) => {
  const db = await getDb();
  const members = db.users.filter((u) => u.role === "member");
  const todayStr = getTodayDateStr();
  const computeStreak = (userId) => {
    const records = db.attendance.filter((a) => a.userId === userId && (a.status === "present" || a.status === "clocked_out")).map((a) => a.date).sort((a, b) => b.localeCompare(a));
    if (records.length === 0) return 0;
    let streak = 0;
    let checkDate = new Date(todayStr);
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().substring(0, 10);
      if (records.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };
  const computeLevel = (points) => {
    if (points >= 500) return "Diamond";
    if (points >= 300) return "Elite";
    if (points >= 150) return "Pro";
    if (points >= 50) return "Rising";
    return "Rookie";
  };
  const computeBadges = (streak, completedTasks, completedIPAs, completionRate, userId) => {
    const badges = [];
    if (streak >= 3) badges.push("Consistent");
    if (completedIPAs >= 3) badges.push("IPA Champion");
    if (completedTasks >= 5) badges.push("Task Master");
    if (completionRate >= 80) badges.push("Top Performer");
    const earlyRecord = db.attendance.find((a) => {
      if (a.userId !== userId) return false;
      const clockInStr = a.clockIn || "";
      const match = clockInStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return false;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      const totalMin = h * 60 + m;
      return totalMin <= 585;
    });
    if (earlyRecord) badges.push("Early Bird");
    return badges;
  };
  const leaderboard = members.map((member) => {
    const memberTasks = db.tasks.filter((t) => t.assigneeId === member.id);
    const completedTasks = memberTasks.filter((t) => t.status === "completed").length;
    const totalTasks = memberTasks.length;
    const completionRate = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;
    const ipaTasksAll = memberTasks.filter((t) => t.isIPA === true);
    const completedIPAs = ipaTasksAll.filter((t) => t.status === "completed").length;
    const totalIPAs = ipaTasksAll.length;
    const ipaCompletionRate = totalIPAs > 0 ? Math.round(completedIPAs / totalIPAs * 100) : 0;
    const streak = computeStreak(member.id);
    const points = streak * 10 + completedTasks * 5 + completedIPAs * 15;
    const level = computeLevel(points);
    const badges = computeBadges(streak, completedTasks, completedIPAs, completionRate, member.id);
    const { password: _, ...safeUser } = member;
    return {
      ...safeUser,
      avatar: member.profileImage,
      streak,
      totalTasks,
      completedTasks,
      completionRate,
      completedIPAs,
      totalIPAs,
      ipaCompletionRate,
      points,
      level,
      badges,
      rank: 0
      // will be set after sorting
    };
  });
  leaderboard.sort((a, b) => b.points - a.points || b.streak - a.streak);
  leaderboard.forEach((m, i) => {
    m.rank = i + 1;
  });
  const topPerformer = leaderboard[0] || null;
  const highestStreak = leaderboard.length > 0 ? Math.max(...leaderboard.map((m) => m.streak)) : 0;
  const avgCompletionRate = leaderboard.length > 0 ? Math.round(leaderboard.reduce((acc, m) => acc + m.completionRate, 0) / leaderboard.length) : 0;
  const activeMembers = leaderboard.filter((m) => m.streak > 0 || m.completedTasks > 0).length;
  return res.json({
    leaderboard,
    summary: {
      topPerformer,
      highestStreak,
      avgCompletionRate,
      activeMembers
    }
  });
});
router2.get("/system/db-status", async (_req, res) => {
  try {
    const status = await getDatabaseStatus();
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to inspect database status" });
  }
});
router2.get("/admin/backup", async (req, res) => {
  const adminId = req.query.adminId;
  const db = await getDb();
  if (adminId) {
    const requester = db.users.find((u) => u.id === adminId);
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Only administrators can export database backups" });
    }
  }
  const safeDb = {
    ...db,
    users: db.users.map(({ password: _, ...u }) => u)
  };
  return res.json({
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    version: "1.0.0",
    data: safeDb
  });
});
router2.post("/admin/backup/restore", async (req, res) => {
  const { adminId, backupData } = req.body;
  const db = await getDb();
  const requester = db.users.find((u) => u.id === adminId);
  if (!requester || requester.role !== "admin") {
    return res.status(403).json({ error: "Only administrators can restore backups" });
  }
  if (!backupData || !Array.isArray(backupData.users) || !Array.isArray(backupData.attendance)) {
    return res.status(400).json({ error: "Invalid backup format" });
  }
  await saveDb(backupData);
  return res.json({ success: true, message: "Database state restored successfully" });
});
router2.post("/admin/users/role", async (req, res) => {
  const { adminId, targetUserId, newRole } = req.body;
  if (!adminId || !targetUserId || !newRole) {
    return res.status(400).json({ error: "adminId, targetUserId, and newRole are required" });
  }
  if (newRole !== "admin" && newRole !== "member") {
    return res.status(400).json({ error: "Invalid role. Role must be 'admin' or 'member'" });
  }
  const db = await getDb();
  const requester = db.users.find((u) => u.id === adminId && u.role === "admin");
  if (!requester) {
    return res.status(403).json({ error: "Unauthorized: Admin privileges required to manage roles" });
  }
  const target = db.users.find((u) => u.id === targetUserId);
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  const leaderEmail = (process.env.TEAM_LEADER_EMAIL || "emperorxpert@gmail.com").trim().toLowerCase();
  if (target.email.toLowerCase() === leaderEmail && newRole !== "admin") {
    return res.status(403).json({ error: "The primary team leader cannot be demoted from admin" });
  }
  if (adminId === targetUserId && newRole !== "admin") {
    return res.status(400).json({ error: "You cannot remove your own admin privileges" });
  }
  target.role = newRole;
  await saveDb(db);
  const { password: _, ...safeUser } = target;
  return res.json({
    success: true,
    message: `User ${target.name} role updated to ${newRole === "admin" ? "Leader (Admin)" : "Member"}.`,
    user: safeUser
  });
});
router2.post("/admin/users/delete", async (req, res) => {
  const { adminId, targetUserId } = req.body;
  if (!adminId || !targetUserId) {
    return res.status(400).json({ error: "adminId and targetUserId are required" });
  }
  const db = await getDb();
  const requester = db.users.find((u) => u.id === adminId && u.role === "admin");
  if (!requester) {
    return res.status(403).json({ error: "Unauthorized: Admin privileges required to delete accounts" });
  }
  const target = db.users.find((u) => u.id === targetUserId);
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  if (adminId === targetUserId) {
    return res.status(400).json({ error: "You cannot delete your own admin account" });
  }
  const leaderEmail = (process.env.TEAM_LEADER_EMAIL || "emperorxpert@gmail.com").trim().toLowerCase();
  if (target.email.toLowerCase() === leaderEmail) {
    return res.status(403).json({ error: "The primary team leader account cannot be deleted" });
  }
  const userName = target.name;
  db.users = db.users.filter((u) => u.id !== targetUserId);
  db.attendance = db.attendance.filter((a) => a.userId !== targetUserId);
  db.tasks = db.tasks.filter((t) => t.assigneeId !== targetUserId);
  db.spending = db.spending.filter((s) => s.userId !== targetUserId);
  db.budgets = db.budgets.filter((b) => b.userId !== targetUserId);
  if (db.savedBooks) {
    db.savedBooks = db.savedBooks.filter((b) => b.userId !== targetUserId);
  }
  await saveDb(db);
  return res.json({
    success: true,
    message: `Account for ${userName} and all associated records have been permanently deleted.`
  });
});
router2.delete("/admin/users/:userId", async (req, res) => {
  const targetUserId = req.params.userId;
  const adminId = req.query.adminId || req.headers["x-admin-id"];
  if (!adminId) {
    return res.status(403).json({ error: "adminId is required to delete an account" });
  }
  const db = await getDb();
  const requester = db.users.find((u) => u.id === adminId && u.role === "admin");
  if (!requester) {
    return res.status(403).json({ error: "Unauthorized: Admin privileges required" });
  }
  const target = db.users.find((u) => u.id === targetUserId);
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }
  if (adminId === targetUserId) {
    return res.status(400).json({ error: "You cannot delete your own admin account" });
  }
  const leaderEmail = (process.env.TEAM_LEADER_EMAIL || "emperorxpert@gmail.com").trim().toLowerCase();
  if (target.email.toLowerCase() === leaderEmail) {
    return res.status(403).json({ error: "The primary team leader account cannot be deleted" });
  }
  const userName = target.name;
  db.users = db.users.filter((u) => u.id !== targetUserId);
  db.attendance = db.attendance.filter((a) => a.userId !== targetUserId);
  db.tasks = db.tasks.filter((t) => t.assigneeId !== targetUserId);
  db.spending = db.spending.filter((s) => s.userId !== targetUserId);
  db.budgets = db.budgets.filter((b) => b.userId !== targetUserId);
  if (db.savedBooks) {
    db.savedBooks = db.savedBooks.filter((b) => b.userId !== targetUserId);
  }
  await saveDb(db);
  return res.json({
    success: true,
    message: `Account for ${userName} has been permanently deleted.`
  });
});
router2.post("/admin/purge-demo", async (req, res) => {
  const adminId = req.body?.adminId || req.query?.adminId;
  const db = await getDb();
  if (adminId) {
    const requester = db.users.find((u) => u.id === adminId);
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Only administrators can purge demo data" });
    }
  }
  const purged = purgeDemoData(db);
  if (purged) {
    await saveDb(db);
  }
  return res.json({
    success: true,
    message: purged ? "All demo data has been purged." : "Database already contains zero demo records.",
    userCount: db.users.length,
    attendanceCount: db.attendance.length,
    taskCount: db.tasks.length
  });
});
var MAX_MESSAGE_LENGTH = 4e3;
function chatUnavailable(res) {
  return res.status(503).json({
    error: "Chat is not configured on this deployment",
    detail: "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to enable messaging"
  });
}
router2.post("/chat/send", async (req, res) => {
  if (!chatDbEnabled()) return chatUnavailable(res);
  const me = req.user;
  const { recipientId, body, id } = req.body ?? {};
  if (typeof recipientId !== "string" || !recipientId) {
    return res.status(400).json({ error: "recipientId is required" });
  }
  if (typeof body !== "string" || !body.trim()) {
    return res.status(400).json({ error: "Message body cannot be empty" });
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
  }
  if (recipientId === me.id) {
    return res.status(400).json({ error: "You cannot message yourself" });
  }
  if (typeof id !== "string" || id.length < 8 || id.length > 64) {
    return res.status(400).json({ error: "A client-generated message id is required" });
  }
  const db = await getDb();
  const recipient = db.users.find((u) => u.id === recipientId);
  if (!recipient) {
    return res.status(404).json({ error: "Recipient not found" });
  }
  if (!canMessage(me, recipient)) {
    return res.status(403).json({
      error: recipient.role === "admin" ? "Members can only message the team lead" : "You cannot message this member"
    });
  }
  try {
    const result = await saveMessage({
      id,
      senderId: me.id,
      recipientId: recipient.id,
      body: body.trim(),
      // The server clock is authoritative. A device with a wrong clock would
      // otherwise write its own timestamps into the shared history, and day
      // dividers and read receipts are derived from this column. The client
      // keeps its own stamp for optimistic ordering before the first sync.
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    try {
      await deliverDirectNotification({
        userId: recipient.id,
        type: "message",
        title: `New message from ${me.name}`,
        body: body.trim().length > 140 ? `${body.trim().slice(0, 137)}...` : body.trim(),
        link: "messages",
        createdBy: me.id,
        createdByName: me.name,
        meta: { threadId: threadIdFor(me.id, recipient.id), messageId: id }
      });
    } catch (notifyErr) {
      console.warn("chat message notification failed:", notifyErr?.message);
    }
    return res.json(result);
  } catch (err) {
    console.error("chat/send failed:", err);
    return res.status(503).json({ error: "Could not deliver message", detail: err?.message });
  }
});
router2.get("/chat/threads", async (req, res) => {
  if (!chatDbEnabled()) return chatUnavailable(res);
  const me = req.user;
  const db = await getDb();
  const isAdmin = req.isAdmin === true;
  const counterparties = isAdmin ? db.users.filter((u) => u.id !== me.id) : db.users.filter((u) => u.role === "admin");
  try {
    const summaries = await listThreadSummaries(me.id);
    const byThread = new Map(summaries.map((s) => [s.threadId, s]));
    const threads = counterparties.map((peer) => {
      const threadId = threadIdFor(me.id, peer.id);
      const summary = byThread.get(threadId);
      return {
        threadId,
        peer: {
          id: peer.id,
          name: peer.name,
          role: peer.role,
          profileImage: peer.profileImage
        },
        lastMessage: summary?.lastMessage ?? null,
        lastMessageAt: summary?.lastMessageAt ?? null,
        unreadCount: summary?.unreadCount ?? 0
      };
    });
    threads.sort(
      (a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "") || a.peer.name.localeCompare(b.peer.name)
    );
    return res.json({ threads });
  } catch (err) {
    console.error("chat/threads failed:", err);
    return res.status(503).json({ error: "Could not load conversations", detail: err?.message });
  }
});
router2.get("/chat/threads/:threadId/sync", async (req, res) => {
  if (!chatDbEnabled()) return chatUnavailable(res);
  const me = req.user;
  const threadId = req.params.threadId;
  const db = await getDb();
  const peer = resolveThreadPeer(threadId, me, db.users);
  if (!peer) {
    return res.status(403).json({ error: "This conversation does not belong to you" });
  }
  const sinceSeq = Number(req.query.since_seq ?? 0) || 0;
  const reportSeen = req.query.report_seen === "1";
  const markAsRead = req.query.mark_read === "1";
  try {
    const messages = await listMessages(threadId, sinceSeq);
    const peerState = await getReadState(threadId, peer.id);
    const myState = await getReadState(threadId, me.id);
    const highestSeq = messages.length > 0 ? messages[messages.length - 1].seq : myState.lastSeenSeq;
    if (reportSeen && highestSeq > myState.lastSeenSeq) {
      await markSeen(threadId, me.id, highestSeq);
    }
    if (markAsRead && highestSeq > myState.lastReadSeq) {
      await markRead(threadId, me.id, highestSeq);
    }
    return res.json({
      messages,
      peerLastSeenSeq: peerState.lastSeenSeq,
      peerLastReadSeq: peerState.lastReadSeq,
      myLastReadSeq: markAsRead ? Math.max(myState.lastReadSeq, highestSeq) : myState.lastReadSeq
    });
  } catch (err) {
    console.error("chat sync failed:", err);
    return res.status(503).json({ error: "Could not sync conversation", detail: err?.message });
  }
});
router2.post("/chat/threads/:threadId/read", async (req, res) => {
  if (!chatDbEnabled()) return chatUnavailable(res);
  const me = req.user;
  const threadId = req.params.threadId;
  const db = await getDb();
  if (!resolveThreadPeer(threadId, me, db.users)) {
    return res.status(403).json({ error: "This conversation does not belong to you" });
  }
  const readSeq = Number(req.body?.readSeq ?? 0) || 0;
  if (readSeq <= 0) {
    return res.status(400).json({ error: "readSeq must be a positive sequence number" });
  }
  try {
    await markRead(threadId, me.id, readSeq);
    return res.json({ success: true, readSeq });
  } catch (err) {
    console.error("chat/read failed:", err);
    return res.status(503).json({ error: "Could not update read state", detail: err?.message });
  }
});
var routes_default = router2;

// api-src/index.ts
var app = express();
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.get(["/", "/api", "/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    time: (/* @__PURE__ */ new Date()).toISOString(),
    url: req.url,
    originalUrl: req.originalUrl
  });
});
app.use((req, _res, next) => {
  const matchedPath = req.headers["x-matched-path"];
  if (typeof matchedPath === "string" && matchedPath.startsWith("/api")) {
    req.url = matchedPath.replace(/^\/api/, "") || "/";
  }
  next();
});
app.use("/api", routes_default);
app.use(routes_default);
app.use((req, res) => {
  res.status(404).json({
    error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}`
  });
});
app.use((err, _req, res, _next) => {
  console.error("API Error:", err);
  res.status(500).json({
    error: err?.message || "Internal server error occurred"
  });
});
function handler(req, res) {
  return app(req, res);
}
export {
  app,
  handler as default
};
