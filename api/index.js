// api-src/index.ts
import express from "express";

// server/routes.ts
import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

// server/db.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.resolve(__dirname, "../data");
var DB_FILE = path.join(DATA_DIR, "db.json");
var DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">AO</text></svg>';
var DEFAULT_OFFICE = {
  lat: 6.4281,
  lng: 3.4219,
  address: "WonderTeam Hub, Victoria Island, Lagos, Nigeria"
};
function getDateOffset(offsetDays = 0) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function buildProductionInitialData() {
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);
  const day2 = getDateOffset(-2);
  const day3 = getDateOffset(-3);
  const day4 = getDateOffset(-4);
  const currentMonth = today.substring(0, 7);
  return {
    users: [
      {
        id: "usr_admin",
        name: "Daniel Mensah",
        email: "admin@wonderteam.com",
        password: "password123",
        role: "admin",
        sponsorName: "Global Leadership Council",
        uplineDirector: "Executive Board",
        uplineWorldTeamLeader: "Founding Circle",
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23146C4E"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="middle">DM</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "usr_amara",
        name: "Amara Okafor",
        email: "amara@wonderteam.com",
        password: "password123",
        role: "member",
        sponsorName: "Daniel Mensah",
        uplineDirector: "Executive Board",
        uplineWorldTeamLeader: "Founding Circle",
        profileImage: DEFAULT_AVATAR,
        officeLocation: DEFAULT_OFFICE,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "usr_chinedu",
        name: "Chinedu Obi",
        email: "chinedu@wonderteam.com",
        password: "password123",
        role: "member",
        sponsorName: "Daniel Mensah",
        uplineDirector: "Executive Board",
        uplineWorldTeamLeader: "Founding Circle",
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F3FAF7"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%232F8F68" text-anchor="middle" dominant-baseline="middle">CO</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "usr_mariam",
        name: "Mariam Yusuf",
        email: "mariam@wonderteam.com",
        password: "password123",
        role: "member",
        sponsorName: "Daniel Mensah",
        uplineDirector: "Executive Board",
        uplineWorldTeamLeader: "Founding Circle",
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">MY</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "usr_tobi",
        name: "Tobi Adeyemi",
        email: "tobi@wonderteam.com",
        password: "password123",
        role: "member",
        sponsorName: "Amara Okafor",
        uplineDirector: "Executive Board",
        uplineWorldTeamLeader: "Founding Circle",
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F7F9F8"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%2317211D" text-anchor="middle" dominant-baseline="middle">TA</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    attendance: [
      {
        id: "att_01",
        userId: "usr_amara",
        userName: "Amara Okafor",
        userAvatar: DEFAULT_AVATAR,
        date: today,
        clockIn: "09:42 AM",
        clockInTimestamp: Date.now() - 72e5,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 120,
        durationFormatted: "2h 00m",
        status: "present",
        workEthicStatus: "serious",
        lastActivity: "Morning Business Standup & Daily Goals Checked"
      },
      {
        id: "att_02",
        userId: "usr_chinedu",
        userName: "Chinedu Obi",
        userAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F3FAF7"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%232F8F68" text-anchor="middle" dominant-baseline="middle">CO</text></svg>',
        date: today,
        clockIn: "09:38 AM",
        clockInTimestamp: Date.now() - 762e4,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 127,
        durationFormatted: "2h 07m",
        status: "present",
        workEthicStatus: "serious",
        lastActivity: "Client Deliverable Pipeline Sync"
      },
      {
        id: "att_03",
        userId: "usr_mariam",
        userName: "Mariam Yusuf",
        userAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">MY</text></svg>',
        date: today,
        clockIn: "09:48 AM",
        clockInTimestamp: Date.now() - 6e6,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 100,
        durationFormatted: "1h 40m",
        status: "present",
        workEthicStatus: "serious",
        lastActivity: "Freelance Design Milestone Review"
      },
      {
        id: "att_04",
        userId: "usr_tobi",
        userName: "Tobi Adeyemi",
        userAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F7F9F8"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%2317211D" text-anchor="middle" dominant-baseline="middle">TA</text></svg>',
        date: today,
        clockIn: "09:55 AM",
        clockInTimestamp: Date.now() - 582e4,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 97,
        durationFormatted: "1h 37m",
        status: "present",
        workEthicStatus: "serious",
        lastActivity: "Prospecting Outreach Check-In"
      },
      // Consecutive streak records for Amara
      {
        id: "att_amara_hist_1",
        userId: "usr_amara",
        userName: "Amara Okafor",
        userAvatar: DEFAULT_AVATAR,
        date: yesterday,
        clockIn: "09:40 AM",
        clockInTimestamp: Date.now() - 864e5,
        clockOut: "05:30 PM",
        clockOutTimestamp: Date.now() - 576e5,
        durationMinutes: 470,
        durationFormatted: "7h 50m",
        status: "clocked_out",
        lastActivity: "Daily operations completed"
      },
      {
        id: "att_amara_hist_2",
        userId: "usr_amara",
        userName: "Amara Okafor",
        userAvatar: DEFAULT_AVATAR,
        date: day2,
        clockIn: "09:35 AM",
        clockInTimestamp: Date.now() - 1728e5,
        clockOut: "05:00 PM",
        clockOutTimestamp: Date.now() - 144e6,
        durationMinutes: 445,
        durationFormatted: "7h 25m",
        status: "clocked_out",
        lastActivity: "Daily operations completed"
      },
      {
        id: "att_amara_hist_3",
        userId: "usr_amara",
        userName: "Amara Okafor",
        userAvatar: DEFAULT_AVATAR,
        date: day3,
        clockIn: "09:44 AM",
        clockInTimestamp: Date.now() - 2592e5,
        clockOut: "05:15 PM",
        clockOutTimestamp: Date.now() - 2304e5,
        durationMinutes: 451,
        durationFormatted: "7h 31m",
        status: "clocked_out",
        lastActivity: "Daily operations completed"
      },
      {
        id: "att_amara_hist_4",
        userId: "usr_amara",
        userName: "Amara Okafor",
        userAvatar: DEFAULT_AVATAR,
        date: day4,
        clockIn: "09:39 AM",
        clockInTimestamp: Date.now() - 3456e5,
        clockOut: "05:00 PM",
        clockOutTimestamp: Date.now() - 3168e5,
        durationMinutes: 441,
        durationFormatted: "7h 21m",
        status: "clocked_out",
        lastActivity: "Daily operations completed"
      }
    ],
    tasks: [
      {
        id: "task_01",
        title: "Deliver interactive design system prototype to fintech client",
        description: "Hand off component states and design tokens in Figma for front-end implementation.",
        assigneeId: "usr_amara",
        assigneeName: "Amara Okafor",
        type: "personal",
        status: "completed",
        priority: "high",
        dueDate: today,
        dueTime: "02:00 PM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: true,
        ipaCategory: "presentation"
      },
      {
        id: "task_02",
        title: "Call 5 prospective freelance clients from warm outreach list",
        description: "Follow up on discovery calls and pitch upcoming sprint availability.",
        assigneeId: "usr_amara",
        assigneeName: "Amara Okafor",
        type: "personal",
        status: "completed",
        priority: "high",
        dueDate: today,
        dueTime: "11:30 AM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: true,
        ipaCategory: "prospecting"
      },
      {
        id: "task_03",
        title: "Send project proposal and scope agreement for web platform",
        description: "Finalize deliverable milestones and payment terms.",
        assigneeId: "usr_amara",
        assigneeName: "Amara Okafor",
        type: "personal",
        status: "completed",
        priority: "high",
        dueDate: today,
        dueTime: "03:30 PM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: true,
        ipaCategory: "closing"
      },
      {
        id: "task_04",
        title: "Invoice client for completed milestone sprint",
        description: "Generate milestone invoice with bank transfer details and sign-off.",
        assigneeId: "usr_amara",
        assigneeName: "Amara Okafor",
        type: "personal",
        status: "todo",
        priority: "medium",
        dueDate: today,
        dueTime: "05:00 PM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: true,
        ipaCategory: "retailing"
      },
      {
        id: "task_05",
        title: "Read 20 minutes of leadership and negotiation book in growth library",
        description: "Focus on communication principles for client discussions.",
        assigneeId: "usr_amara",
        assigneeName: "Amara Okafor",
        type: "personal",
        status: "todo",
        priority: "low",
        dueDate: today,
        dueTime: "07:00 PM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: false,
        ipaCategory: "mindset_reading"
      },
      {
        id: "task_chinedu_01",
        title: "Deploy backend API proxy services for client staging review",
        description: "Push updates to staging environment and verify SSL credentials.",
        assigneeId: "usr_chinedu",
        assigneeName: "Chinedu Obi",
        type: "personal",
        status: "completed",
        priority: "high",
        dueDate: today,
        dueTime: "01:00 PM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: true,
        ipaCategory: "presentation"
      },
      {
        id: "task_chinedu_02",
        title: "Pitch 3 software engineering contracts to remote agencies",
        description: "Send custom loom videos and code portfolio links.",
        assigneeId: "usr_chinedu",
        assigneeName: "Chinedu Obi",
        type: "personal",
        status: "todo",
        priority: "high",
        dueDate: today,
        dueTime: "04:00 PM",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        isIPA: true,
        ipaCategory: "prospecting"
      }
    ],
    spending: [
      {
        id: "sp_01",
        userId: "usr_amara",
        merchant: "Figma Professional Team Plan",
        amount: 18e3,
        category: "Supplies & Equipment",
        description: "Monthly cloud design collaboration and client prototype hosting",
        date: yesterday,
        receipt: "REC-FIG-991",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "sp_02",
        userId: "usr_amara",
        merchant: "Victoria Island Co-Working Hub",
        amount: 25e3,
        category: "Transport",
        description: "High-speed dedicated desk pass for client video presentations",
        date: day2,
        receipt: "REC-HUB-104",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "sp_03",
        userId: "usr_amara",
        merchant: "Cloud VPS Server Infrastructure",
        amount: 14500,
        category: "Supplies & Equipment",
        description: "Staging web server deployment for client review environment",
        date: day3,
        receipt: "REC-VPS-402",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    budgets: [
      {
        userId: "usr_amara",
        month: currentMonth,
        monthlyBudget: 15e4
      }
    ]
  };
}
var inMemoryDb = null;
var neonTableInitialized = false;
function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
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
  const leaderEmail = process.env.TEAM_LEADER_EMAIL?.trim().toLowerCase();
  if (!leaderEmail) return false;
  const leaderPassword = process.env.TEAM_LEADER_PASSWORD || "password123";
  const leaderName = process.env.TEAM_LEADER_NAME || "Team Leader";
  const existing = db.users.find((u) => u.email.toLowerCase() === leaderEmail);
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      return true;
    }
    return false;
  }
  const initials = leaderName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "TL";
  const newLeader = {
    id: `usr_leader_${Date.now()}`,
    name: leaderName,
    email: leaderEmail,
    password: leaderPassword,
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
        if (syncTeamLeader(state)) {
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
  if (syncTeamLeader(local)) {
    saveDb(local);
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
    password,
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
  const db = await getDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email?.toLowerCase() && u.password === password
  );
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
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
  if (user.password && currentPassword && user.password !== currentPassword) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }
  user.password = newPassword;
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
  if (role === "member" && userId) {
    tasks = tasks.filter((t) => t.assigneeId === userId);
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
  const { title, description, assigneeId, type = "assigned", priority = "medium", dueDate, dueTime } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Task title is required" });
  }
  const db = await getDb();
  const assignee = db.users.find((u) => u.id === assigneeId) || db.users[0];
  const newTask = {
    id: `task_${Date.now()}`,
    title,
    description: description || "",
    assigneeId: assignee.id,
    assigneeName: assignee.name,
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
var BOOK_CATEGORIES = {
  "Personal Growth": '(subject:"self-help" OR subject:"personal development" OR subject:"self improvement")',
  "Self Discipline": '(subject:"self-discipline" OR subject:"self control" OR subject:"discipline")',
  "Leadership": '(subject:"leadership" OR subject:"leadership development")',
  "Communication": '(subject:"communication" OR subject:"communication skills" OR subject:"interpersonal communication")',
  "Emotional Intelligence": '(subject:"emotional intelligence" OR subject:"emotions")',
  "Productivity": '(subject:"productivity" OR subject:"personal productivity")',
  "Time Management": '(subject:"time management" OR title:"time management")',
  "Goal Setting": '(subject:"goal setting" OR subject:"goals" OR title:"goal setting")',
  "Career Development": '(subject:"career development" OR subject:"career planning" OR subject:"careers")',
  "Entrepreneurship": '(subject:"entrepreneurship" OR subject:"entrepreneurs" OR subject:"business")',
  "Financial Literacy": '(subject:"financial literacy" OR subject:"personal finance" OR subject:"money management")',
  "Critical Thinking": '(subject:"critical thinking" OR subject:"reasoning" OR subject:"logic")',
  "Decision Making": '(subject:"decision making" OR subject:"decision-making")',
  "Confidence": '(subject:"self-confidence" OR subject:"confidence" OR subject:"self-esteem")',
  "Study Skills": '(subject:"study skills" OR subject:"learning" OR subject:"study")',
  "Habit Building": '(subject:"habits" OR subject:"habit" OR title:"habits")',
  "Psychology": '(subject:"psychology" OR subject:"applied psychology")',
  "Philosophy": '(subject:"philosophy" OR subject:"practical philosophy")',
  "Mindfulness": '(subject:"mindfulness" OR subject:"meditation")',
  "Relationships": '(subject:"relationships" OR subject:"interpersonal relations" OR subject:"human relations")',
  "Network Marketing": '(subject:"network marketing" OR subject:"multi-level marketing" OR subject:"direct selling" OR title:"network marketing")'
};
var booksCache = /* @__PURE__ */ new Map();
var dictionaryCache = /* @__PURE__ */ new Map();
function getCuratedFallbackBooks(category) {
  const defaults = {
    "Personal Growth": [
      {
        key: "/works/OL27479W",
        title: "As a Man Thinketh",
        author_name: ["James Allen"],
        first_publish_year: 1903,
        ebook_access: "public",
        cover_i: 8231856,
        ia: ["asamanthinketh00alle"]
      },
      {
        key: "/works/OL15366471W",
        title: "The Art of War",
        author_name: ["Sunzi"],
        first_publish_year: 1910,
        ebook_access: "public",
        cover_i: 12547191,
        ia: ["artofwar00sunz"]
      },
      {
        key: "/works/OL257943W",
        title: "Self-Reliance and Other Essays",
        author_name: ["Ralph Waldo Emerson"],
        first_publish_year: 1841,
        ebook_access: "public",
        cover_i: 6479532,
        ia: ["selfreliance00emer"]
      }
    ],
    "Leadership": [
      {
        key: "/works/OL262758W",
        title: "The Prince",
        author_name: ["Niccol\xF2 Machiavelli"],
        first_publish_year: 1532,
        ebook_access: "public",
        cover_i: 9255566,
        ia: ["prince00machrich"]
      },
      {
        key: "/works/OL1168007W",
        title: "Character and Leadership",
        author_name: ["Samuel Smiles"],
        first_publish_year: 1871,
        ebook_access: "public",
        cover_i: 7214532,
        ia: ["charactersmiles00smil"]
      }
    ],
    "Financial Literacy": [
      {
        key: "/works/OL1583002W",
        title: "The Richest Man in Babylon",
        author_name: ["George S. Clason"],
        first_publish_year: 1926,
        ebook_access: "public",
        cover_i: 10452912,
        ia: ["richestmaninbaby00clas"]
      },
      {
        key: "/works/OL181591W",
        title: "The Way to Wealth",
        author_name: ["Benjamin Franklin"],
        first_publish_year: 1758,
        ebook_access: "public",
        cover_i: 8329104,
        ia: ["waytowealth00fran"]
      }
    ]
  };
  return defaults[category] || defaults["Personal Growth"];
}
router.get("/library/categories", async (_req, res) => {
  return res.json(Object.keys(BOOK_CATEGORIES));
});
router.get("/library/books", async (req, res) => {
  const selectedCategory = req.query.category || "Personal Growth";
  const search = req.query.search?.trim() || "";
  const categoryQuery = BOOK_CATEGORIES[selectedCategory] || BOOK_CATEGORIES["Personal Growth"];
  const query = search ? `(${search}) AND ${categoryQuery} AND ebook_access:public` : `${categoryQuery} AND ebook_access:public`;
  const cacheKey = `${selectedCategory}_${search}`.toLowerCase();
  const cached = booksCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 36e5) {
    return res.json(cached.data);
  }
  const params = new URLSearchParams({
    q: query,
    fields: [
      "key",
      "title",
      "author_name",
      "cover_i",
      "first_publish_year",
      "ebook_access",
      "ia",
      "isbn"
    ].join(","),
    limit: "24"
  });
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6e3);
    const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`, {
      headers: {
        "User-Agent": "WonderTeamStudentApp/1.0 (timilehinoladoja2002@gmail.com)"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`OpenLibrary returned ${response.status}`);
    }
    const json = await response.json();
    const docs = (json.docs || []).map((doc) => ({
      ...doc,
      category: selectedCategory
    }));
    if (docs.length === 0) {
      const fallback = getCuratedFallbackBooks(selectedCategory);
      return res.json({
        category: selectedCategory,
        total: fallback.length,
        books: fallback
      });
    }
    const result = {
      category: selectedCategory,
      total: json.numFound || docs.length,
      books: docs
    };
    booksCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.json(result);
  } catch (err) {
    console.warn("OpenLibrary fetch failed/timed out, using curated books:", err.message);
    const fallback = getCuratedFallbackBooks(selectedCategory);
    return res.json({
      category: selectedCategory,
      total: fallback.length,
      books: fallback,
      isFallback: true
    });
  }
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
  const { userId, bookKey, title, author, coverId, iaId, category } = req.body;
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
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6e3);
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=24&printType=books`;
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
      return {
        key: `/google/${item.id}`,
        googleBookId: item.id,
        title: vol.title || "Untitled Book",
        author_name: vol.authors || ["Authorized Author"],
        description: vol.description || "",
        cover_i: void 0,
        coverUrl: vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail || "",
        first_publish_year: vol.publishedDate ? parseInt(vol.publishedDate.substring(0, 4), 10) : void 0,
        ebook_access: access.viewability || "preview",
        embeddable: access.embeddable !== false,
        previewLink: vol.previewLink,
        infoLink: vol.infoLink,
        isbn,
        category: query,
        source: "googlebooks"
      };
    });
    const result = {
      total: data.totalItems || items.length,
      books: items,
      query
    };
    googleBooksCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.json(result);
  } catch (err) {
    console.warn("Google Books search failed:", err.message);
    return res.json({ total: 0, books: [], error: err.message });
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
var routes_default = router;

// api-src/index.ts
var app = express();
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
