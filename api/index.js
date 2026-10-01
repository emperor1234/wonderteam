// api-src/index.ts
import express from "express";

// server/routes.ts
import { Router } from "express";
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
    savedBooks: []
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
  db.attendance = db.attendance.filter(
    (a) => !demoIds.includes(a.userId) && !a.id.startsWith("att_")
  );
  const beforeTasks = db.tasks.length;
  db.tasks = db.tasks.filter(
    (t) => !demoIds.includes(t.assigneeId) && !t.id.startsWith("task_")
  );
  const beforeSpend = db.spending.length;
  db.spending = db.spending.filter(
    (s) => !demoIds.includes(s.userId) && !s.id.startsWith("sp_")
  );
  const beforeBudgets = db.budgets.length;
  db.budgets = db.budgets.filter((b) => !demoIds.includes(b.userId));
  return hadDemoUsers || db.attendance.length !== beforeAtt || db.tasks.length !== beforeTasks || db.spending.length !== beforeSpend || db.budgets.length !== beforeBudgets;
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

// server/routes.ts
var router = Router();
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
function formatTime12(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? "0" + hours : "" + hours;
  const strMinutes = minutes < 10 ? "0" + minutes : "" + minutes;
  return `${strHours}:${strMinutes} ${ampm}`;
}
function getGMT1Info(d = /* @__PURE__ */ new Date(), simulatedTime) {
  if (simulatedTime && typeof simulatedTime.hour === "number") {
    const h2 = simulatedTime.hour;
    const m2 = simulatedTime.minute ?? 0;
    const totalMin2 = h2 * 60 + m2;
    let h122 = h2 % 12;
    h122 = h122 ? h122 : 12;
    const ampm2 = h2 >= 12 ? "PM" : "AM";
    const strH2 = String(h122).padStart(2, "0");
    const strM2 = String(m2).padStart(2, "0");
    const timeStr2 = `${strH2}:${strM2} ${ampm2}`;
    const isBefore9302 = totalMin2 < 570;
    const isPast10002 = totalMin2 > 600;
    const isBetween930and10002 = totalMin2 >= 570 && totalMin2 <= 600;
    const isBeforeTodoWindow2 = totalMin2 < 570;
    const isWithinTodoWindow2 = totalMin2 >= 570 && totalMin2 <= 660;
    const isPast11002 = totalMin2 > 660;
    return {
      h: h2,
      m: m2,
      totalMin: totalMin2,
      timeStr: timeStr2,
      isBefore930: isBefore9302,
      isPast1000: isPast10002,
      isBetween930and1000: isBetween930and10002,
      isBeforeTodoWindow: isBeforeTodoWindow2,
      isWithinTodoWindow: isWithinTodoWindow2,
      isPast1100: isPast11002
    };
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  const totalMin = h * 60 + m;
  let h12 = h % 12;
  h12 = h12 ? h12 : 12;
  const ampm = h >= 12 ? "PM" : "AM";
  const strH = String(h12).padStart(2, "0");
  const strM = String(m).padStart(2, "0");
  const timeStr = `${strH}:${strM} ${ampm}`;
  const isBefore930 = totalMin < 570;
  const isPast1000 = totalMin > 600;
  const isBetween930and1000 = totalMin >= 570 && totalMin <= 600;
  const isBeforeTodoWindow = totalMin < 570;
  const isWithinTodoWindow = totalMin >= 570 && totalMin <= 660;
  const isPast1100 = totalMin > 660;
  return {
    h,
    m,
    totalMin,
    timeStr,
    isBefore930,
    isPast1000,
    isBetween930and1000,
    isBeforeTodoWindow,
    isWithinTodoWindow,
    isPast1100
  };
}
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
router.post("/auth/register", async (req, res) => {
  const {
    name,
    email,
    password,
    role = "member",
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
    id: `usr_${Date.now()}`,
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
  return res.status(201).json({ user: userWithoutPassword });
});
router.post("/auth/login", async (req, res) => {
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
  return res.json({ user: userWithoutPassword });
});
router.get("/auth/users", async (_req, res) => {
  const db = await getDb();
  const sanitized = db.users.map(({ password: _, ...rest }) => rest);
  return res.json(sanitized);
});
router.post("/auth/update-profile", async (req, res) => {
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
router.post("/auth/change-password", async (req, res) => {
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
router.get("/attendance/status", async (req, res) => {
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
router.post("/attendance/clock-in", async (req, res) => {
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
router.post("/attendance/clock-out", async (req, res) => {
  const { userId } = req.body;
  const db = await getDb();
  const today = getTodayDateStr();
  const record = db.attendance.find((a) => a.userId === userId && a.date === today);
  if (!record || !record.clockInTimestamp || record.clockOut) {
    return res.status(400).json({ error: "No active clock-in session found for today" });
  }
  const now = /* @__PURE__ */ new Date();
  const clockOutTimeStr = formatTime12(now);
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
router.get("/attendance/history", async (req, res) => {
  const userId = req.query.userId;
  const db = await getDb();
  let list = db.attendance;
  if (userId) {
    list = list.filter((a) => a.userId === userId);
  }
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return res.json(sorted);
});
router.get("/attendance/team", async (_req, res) => {
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
router.get("/tasks", async (req, res) => {
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
router.post("/tasks/toggle", async (req, res) => {
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
router.post("/tasks/create", async (req, res) => {
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
router.post("/tasks/delete", async (req, res) => {
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
router.delete("/tasks/:id", async (req, res) => {
  const taskId = req.params.id;
  const db = await getDb();
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  await saveDb(db);
  return res.json({ success: true });
});
router.post("/tasks/update", async (req, res) => {
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
router.get("/spending", async (req, res) => {
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
router.post("/spending/add", async (req, res) => {
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
router.get("/team", async (_req, res) => {
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
router.get("/library/categories", async (_req, res) => {
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
router.get("/library/books", async (req, res) => {
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
router.get("/library/saved", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const db = await getDb();
  const saved = (db.savedBooks || []).filter((b) => b.userId === userId);
  return res.json(saved);
});
router.post("/library/save", async (req, res) => {
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
router.post("/library/progress", async (req, res) => {
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
router.get("/dictionary/:word", async (req, res) => {
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
router.get("/library/google-books", async (req, res) => {
  const query = req.query.q?.trim() || req.query.category?.trim() || "leadership";
  const cacheKey = query.toLowerCase();
  const cached = googleBooksCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 36e5 * 2) {
    return res.json(cached.data);
  }
  const matchingCurated = searchCuratedBooks(query);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4e3);
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books`;
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
        category: query,
        source: "googlebooks"
      };
    });
    const existingTitles = new Set(matchingCurated.map((b) => b.title.toLowerCase()));
    const uniqueGoogle = items.filter((b) => !existingTitles.has(b.title.toLowerCase()));
    const combined = [...matchingCurated, ...uniqueGoogle];
    const result = {
      total: combined.length,
      books: combined,
      query
    };
    googleBooksCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.json(result);
  } catch (err) {
    console.warn("Google Books search failed/timed out, returning curated books:", err.message);
    const result = {
      total: matchingCurated.length,
      books: matchingCurated,
      query,
      isFallback: true
    };
    return res.json(result);
  }
});
router.get("/library/google-volume/:id", async (req, res) => {
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
function getWATPeriodDetails(hour) {
  if (hour >= 0 && hour < 5) {
    return {
      period: "1am_midnight",
      timeTitle: "1:00 AM Midnight Visionary Hustle"
    };
  }
  if (hour >= 5 && hour < 12) {
    return {
      period: "morning",
      timeTitle: "Morning Ignition & Prospecting Power"
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      period: "afternoon",
      timeTitle: "Afternoon Momentum & Presentation Drive"
    };
  }
  return {
    period: "night",
    timeTitle: "Night Reflection & Daily Volume Review"
  };
}
router.get("/ai/motivational-quote", async (req, res) => {
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
router.post("/ai/prioritize-tasks", async (req, res) => {
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
router.get("/admin/leaderboard", async (_req, res) => {
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
router.get("/system/db-status", async (_req, res) => {
  try {
    const status = await getDatabaseStatus();
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Failed to inspect database status" });
  }
});
router.get("/admin/backup", async (req, res) => {
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
router.post("/admin/backup/restore", async (req, res) => {
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
router.post("/admin/users/role", async (req, res) => {
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
router.post("/admin/users/delete", async (req, res) => {
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
router.delete("/admin/users/:userId", async (req, res) => {
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
router.post("/admin/purge-demo", async (req, res) => {
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
var routes_default = router;

// api-src/index.ts
var app = express();
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
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
