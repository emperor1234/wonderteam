import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.startsWith('scrypt:')) {
    return password === storedHash;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, originalHash] = parts;
  try {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const origBuf = Buffer.from(originalHash, 'hex');
    if (hashBuf.length !== origBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, origBuf);
  } catch {
    return false;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface OfficeLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'member' | 'admin';
  sponsorName: string;
  uplineDirector: string;
  uplineWorldTeamLeader: string;
  profileImage: string;
  officeLocation?: OfficeLocation;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // "09:45 AM"
  clockInTimestamp: number;
  clockOut: string | null;
  clockOutTimestamp: number | null;
  durationMinutes: number;
  durationFormatted: string;
  status: 'present' | 'late' | 'absent' | 'clocked_out' | 'not_checked_in';
  workEthicStatus?: 'serious' | 'unserious' | 'pending_check';
  unseriousReason?: string;
  lastActivity: string;
  checkInLocation?: {
    lat: number;
    lng: number;
    address?: string;
    isOfficeMatch: boolean;
    distanceMeters: number;
  };
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  type: 'assigned' | 'personal';
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  dueTime: string;
  createdAt: string;
  updatedAt: string;
  isIPA?: boolean;
  ipaCategory?: string;
  aiPriorityReason?: string;
  aiOrder?: number;
}

export interface SpendingRecord {
  id: string;
  userId: string;
  merchant: string;
  amount: number; // In Nigerian Naira (₦)
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  receipt?: string;
  createdAt: string;
}

export interface BudgetConfig {
  userId: string;
  month: string; // YYYY-MM
  monthlyBudget: number;
}

export interface SavedBookRecord {
  id: string;
  userId: string;
  bookKey: string;
  title: string;
  author: string;
  coverId?: number;
  coverUrl?: string;
  iaId?: string;
  category: string;
  progressPercent: number;
  status: 'reading' | 'completed' | 'want_to_read';
  notes?: string;
  lastReadDate: string;
}

export interface DatabaseState {
  users: User[];
  attendance: AttendanceRecord[];
  tasks: TaskItem[];
  spending: SpendingRecord[];
  budgets: BudgetConfig[];
  savedBooks?: SavedBookRecord[];
}

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">AO</text></svg>';

const DEFAULT_OFFICE: OfficeLocation = {
  lat: 6.4281,
  lng: 3.4219,
  address: 'WonderTeam Hub, Victoria Island, Lagos, Nigeria',
};

// Dynamic date helper so there are NEVER stale demo dates
export function getDateOffset(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildProductionInitialData(): DatabaseState {
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);
  const day2 = getDateOffset(-2);
  const day3 = getDateOffset(-3);
  const day4 = getDateOffset(-4);
  const currentMonth = today.substring(0, 7);

  return {
    users: [
      {
        id: 'usr_admin',
        name: 'Daniel Mensah',
        email: 'admin@wonderteam.com',
        password: hashPassword('password123'),
        role: 'admin',
        sponsorName: 'Global Leadership Council',
        uplineDirector: 'Executive Board',
        uplineWorldTeamLeader: 'Founding Circle',
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23146C4E"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="middle">DM</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_amara',
        name: 'Amara Okafor',
        email: 'amara@wonderteam.com',
        password: hashPassword('password123'),
        role: 'member',
        sponsorName: 'Daniel Mensah',
        uplineDirector: 'Executive Board',
        uplineWorldTeamLeader: 'Founding Circle',
        profileImage: DEFAULT_AVATAR,
        officeLocation: DEFAULT_OFFICE,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_chinedu',
        name: 'Chinedu Obi',
        email: 'chinedu@wonderteam.com',
        password: hashPassword('password123'),
        role: 'member',
        sponsorName: 'Daniel Mensah',
        uplineDirector: 'Executive Board',
        uplineWorldTeamLeader: 'Founding Circle',
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F3FAF7"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%232F8F68" text-anchor="middle" dominant-baseline="middle">CO</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_mariam',
        name: 'Mariam Yusuf',
        email: 'mariam@wonderteam.com',
        password: hashPassword('password123'),
        role: 'member',
        sponsorName: 'Daniel Mensah',
        uplineDirector: 'Executive Board',
        uplineWorldTeamLeader: 'Founding Circle',
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">MY</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_tobi',
        name: 'Tobi Adeyemi',
        email: 'tobi@wonderteam.com',
        password: hashPassword('password123'),
        role: 'member',
        sponsorName: 'Amara Okafor',
        uplineDirector: 'Executive Board',
        uplineWorldTeamLeader: 'Founding Circle',
        profileImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F7F9F8"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%2317211D" text-anchor="middle" dominant-baseline="middle">TA</text></svg>',
        officeLocation: DEFAULT_OFFICE,
        createdAt: new Date().toISOString(),
      },
    ],
    attendance: [
      {
        id: 'att_01',
        userId: 'usr_amara',
        userName: 'Amara Okafor',
        userAvatar: DEFAULT_AVATAR,
        date: today,
        clockIn: '09:42 AM',
        clockInTimestamp: Date.now() - 7200000,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 120,
        durationFormatted: '2h 00m',
        status: 'present',
        workEthicStatus: 'serious',
        lastActivity: 'Morning Business Standup & Daily Goals Checked',
      },
      {
        id: 'att_02',
        userId: 'usr_chinedu',
        userName: 'Chinedu Obi',
        userAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F3FAF7"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%232F8F68" text-anchor="middle" dominant-baseline="middle">CO</text></svg>',
        date: today,
        clockIn: '09:38 AM',
        clockInTimestamp: Date.now() - 7620000,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 127,
        durationFormatted: '2h 07m',
        status: 'present',
        workEthicStatus: 'serious',
        lastActivity: 'Client Deliverable Pipeline Sync',
      },
      {
        id: 'att_03',
        userId: 'usr_mariam',
        userName: 'Mariam Yusuf',
        userAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23E7F4EE"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%230F513B" text-anchor="middle" dominant-baseline="middle">MY</text></svg>',
        date: today,
        clockIn: '09:48 AM',
        clockInTimestamp: Date.now() - 6000000,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 100,
        durationFormatted: '1h 40m',
        status: 'present',
        workEthicStatus: 'serious',
        lastActivity: 'Freelance Design Milestone Review',
      },
      {
        id: 'att_04',
        userId: 'usr_tobi',
        userName: 'Tobi Adeyemi',
        userAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23F7F9F8"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%2317211D" text-anchor="middle" dominant-baseline="middle">TA</text></svg>',
        date: today,
        clockIn: '09:55 AM',
        clockInTimestamp: Date.now() - 5820000,
        clockOut: null,
        clockOutTimestamp: null,
        durationMinutes: 97,
        durationFormatted: '1h 37m',
        status: 'present',
        workEthicStatus: 'serious',
        lastActivity: 'Prospecting Outreach Check-In',
      },
      // Consecutive streak records for Amara
      {
        id: 'att_amara_hist_1',
        userId: 'usr_amara',
        userName: 'Amara Okafor',
        userAvatar: DEFAULT_AVATAR,
        date: yesterday,
        clockIn: '09:40 AM',
        clockInTimestamp: Date.now() - 86400000,
        clockOut: '05:30 PM',
        clockOutTimestamp: Date.now() - 57600000,
        durationMinutes: 470,
        durationFormatted: '7h 50m',
        status: 'clocked_out',
        lastActivity: 'Daily operations completed',
      },
      {
        id: 'att_amara_hist_2',
        userId: 'usr_amara',
        userName: 'Amara Okafor',
        userAvatar: DEFAULT_AVATAR,
        date: day2,
        clockIn: '09:35 AM',
        clockInTimestamp: Date.now() - 172800000,
        clockOut: '05:00 PM',
        clockOutTimestamp: Date.now() - 144000000,
        durationMinutes: 445,
        durationFormatted: '7h 25m',
        status: 'clocked_out',
        lastActivity: 'Daily operations completed',
      },
      {
        id: 'att_amara_hist_3',
        userId: 'usr_amara',
        userName: 'Amara Okafor',
        userAvatar: DEFAULT_AVATAR,
        date: day3,
        clockIn: '09:44 AM',
        clockInTimestamp: Date.now() - 259200000,
        clockOut: '05:15 PM',
        clockOutTimestamp: Date.now() - 230400000,
        durationMinutes: 451,
        durationFormatted: '7h 31m',
        status: 'clocked_out',
        lastActivity: 'Daily operations completed',
      },
      {
        id: 'att_amara_hist_4',
        userId: 'usr_amara',
        userName: 'Amara Okafor',
        userAvatar: DEFAULT_AVATAR,
        date: day4,
        clockIn: '09:39 AM',
        clockInTimestamp: Date.now() - 345600000,
        clockOut: '05:00 PM',
        clockOutTimestamp: Date.now() - 316800000,
        durationMinutes: 441,
        durationFormatted: '7h 21m',
        status: 'clocked_out',
        lastActivity: 'Daily operations completed',
      },
    ],
    tasks: [
      {
        id: 'task_01',
        title: 'Deliver interactive design system prototype to fintech client',
        description: 'Hand off component states and design tokens in Figma for front-end implementation.',
        assigneeId: 'usr_amara',
        assigneeName: 'Amara Okafor',
        type: 'personal',
        status: 'completed',
        priority: 'high',
        dueDate: today,
        dueTime: '02:00 PM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: true,
        ipaCategory: 'presentation',
      },
      {
        id: 'task_02',
        title: 'Call 5 prospective freelance clients from warm outreach list',
        description: 'Follow up on discovery calls and pitch upcoming sprint availability.',
        assigneeId: 'usr_amara',
        assigneeName: 'Amara Okafor',
        type: 'personal',
        status: 'completed',
        priority: 'high',
        dueDate: today,
        dueTime: '11:30 AM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: true,
        ipaCategory: 'prospecting',
      },
      {
        id: 'task_03',
        title: 'Send project proposal and scope agreement for web platform',
        description: 'Finalize deliverable milestones and payment terms.',
        assigneeId: 'usr_amara',
        assigneeName: 'Amara Okafor',
        type: 'personal',
        status: 'completed',
        priority: 'high',
        dueDate: today,
        dueTime: '03:30 PM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: true,
        ipaCategory: 'closing',
      },
      {
        id: 'task_04',
        title: 'Invoice client for completed milestone sprint',
        description: 'Generate milestone invoice with bank transfer details and sign-off.',
        assigneeId: 'usr_amara',
        assigneeName: 'Amara Okafor',
        type: 'personal',
        status: 'todo',
        priority: 'medium',
        dueDate: today,
        dueTime: '05:00 PM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: true,
        ipaCategory: 'retailing',
      },
      {
        id: 'task_05',
        title: 'Read 20 minutes of leadership and negotiation book in growth library',
        description: 'Focus on communication principles for client discussions.',
        assigneeId: 'usr_amara',
        assigneeName: 'Amara Okafor',
        type: 'personal',
        status: 'todo',
        priority: 'low',
        dueDate: today,
        dueTime: '07:00 PM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: false,
        ipaCategory: 'mindset_reading',
      },
      {
        id: 'task_chinedu_01',
        title: 'Deploy backend API proxy services for client staging review',
        description: 'Push updates to staging environment and verify SSL credentials.',
        assigneeId: 'usr_chinedu',
        assigneeName: 'Chinedu Obi',
        type: 'personal',
        status: 'completed',
        priority: 'high',
        dueDate: today,
        dueTime: '01:00 PM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: true,
        ipaCategory: 'presentation',
      },
      {
        id: 'task_chinedu_02',
        title: 'Pitch 3 software engineering contracts to remote agencies',
        description: 'Send custom loom videos and code portfolio links.',
        assigneeId: 'usr_chinedu',
        assigneeName: 'Chinedu Obi',
        type: 'personal',
        status: 'todo',
        priority: 'high',
        dueDate: today,
        dueTime: '04:00 PM',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isIPA: true,
        ipaCategory: 'prospecting',
      },
    ],
    spending: [
      {
        id: 'sp_01',
        userId: 'usr_amara',
        merchant: 'Figma Professional Team Plan',
        amount: 18000,
        category: 'Supplies & Equipment',
        description: 'Monthly cloud design collaboration and client prototype hosting',
        date: yesterday,
        receipt: 'REC-FIG-991',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_02',
        userId: 'usr_amara',
        merchant: 'Victoria Island Co-Working Hub',
        amount: 25000,
        category: 'Transport',
        description: 'High-speed dedicated desk pass for client video presentations',
        date: day2,
        receipt: 'REC-HUB-104',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sp_03',
        userId: 'usr_amara',
        merchant: 'Cloud VPS Server Infrastructure',
        amount: 14500,
        category: 'Supplies & Equipment',
        description: 'Staging web server deployment for client review environment',
        date: day3,
        receipt: 'REC-VPS-402',
        createdAt: new Date().toISOString(),
      },
    ],
    budgets: [
      {
        userId: 'usr_amara',
        month: currentMonth,
        monthlyBudget: 150000,
      },
    ],
  };
}

let inMemoryDb: DatabaseState | null = null;
let neonTableInitialized = false;

// Neon PostgreSQL connection helper
function getDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL
  );
}

function getNeonSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  try {
    return neon(url);
  } catch (err) {
    console.error('Failed to initialize Neon client:', err);
    return null;
  }
}

async function ensureNeonTable(sql: any): Promise<void> {
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
    console.error('Failed to ensure Neon table:', err);
  }
}

function getDbFilePath(): string {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return DB_FILE;
  } catch {
    return '/tmp/wonderteam_db.json';
  }
}

function ensureDbFile(): DatabaseState {
  const filePath = getDbFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      const initial = buildProductionInitialData();
      try {
        fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf-8');
      } catch (wErr) {
        console.warn('Filesystem is read-only, using memory cache:', wErr);
      }
      inMemoryDb = initial;
      return initial;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    inMemoryDb = parsed;
    return parsed;
  } catch (err) {
    console.warn('Fallback to in-memory initial data:', err);
    const initial = buildProductionInitialData();
    inMemoryDb = initial;
    return initial;
  }
}

export function syncTeamLeader(db: DatabaseState): boolean {
  const leaderEmail = process.env.TEAM_LEADER_EMAIL?.trim().toLowerCase();
  if (!leaderEmail) return false;
  const leaderPassword = process.env.TEAM_LEADER_PASSWORD || 'password123';
  const leaderName = process.env.TEAM_LEADER_NAME || 'Team Leader';

  const existing = db.users.find((u) => u.email.toLowerCase() === leaderEmail);
  if (existing) {
    let changed = false;
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      changed = true;
    }
    if (existing.password && !existing.password.startsWith('scrypt:')) {
      existing.password = hashPassword(existing.password);
      changed = true;
    }
    return changed;
  }

  const initials = leaderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'TL';

  const newLeader: User = {
    id: `usr_leader_${Date.now()}`,
    name: leaderName,
    email: leaderEmail,
    password: hashPassword(leaderPassword),
    role: 'admin',
    sponsorName: 'Global Leadership Council',
    uplineDirector: 'Executive Board',
    uplineWorldTeamLeader: 'Founding Circle',
    profileImage: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23146C4E"/><text x="50%" y="54%" font-family="sans-serif" font-size="22" font-weight="600" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`,
    officeLocation: {
      lat: 6.4281,
      lng: 3.4219,
      address: 'WonderTeam Hub, Victoria Island, Lagos, Nigeria',
    },
    createdAt: new Date().toISOString(),
  };

  db.users.unshift(newLeader);
  return true;
}

export async function getDb(): Promise<DatabaseState> {
  const sql = getNeonSql();
  if (sql) {
    try {
      await ensureNeonTable(sql);
      const rows = await sql`
        SELECT data FROM wonderteam_state WHERE key = 'main' LIMIT 1;
      `;
      if (rows && rows.length > 0 && rows[0].data) {
        const rawData = rows[0].data;
        const state = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) as DatabaseState;
        let shouldSave = syncTeamLeader(state);
        for (const user of state.users) {
          if (user.password && !user.password.startsWith('scrypt:')) {
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
      // If table exists but has no data, initialize with production data
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
      console.error('Error querying Neon PostgreSQL, falling back to local storage:', err);
    }
  }

  // Fallback to in-memory or local JSON file
  const local = inMemoryDb || ensureDbFile();
  let shouldSaveLocal = syncTeamLeader(local);
  for (const user of local.users) {
    if (user.password && !user.password.startsWith('scrypt:')) {
      user.password = hashPassword(user.password);
      shouldSaveLocal = true;
    }
  }
  if (shouldSaveLocal) {
    await saveDb(local);
  }
  return local;
}

export async function saveDb(data: DatabaseState): Promise<void> {
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
      console.error('Error saving to Neon PostgreSQL, writing to local fallback:', err);
    }
  }

  // Fallback to local filesystem (handles read-only environments gracefully)
  try {
    const filePath = getDbFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local filesystem write skipped (read-only environment):', err);
  }
}

export interface DatabaseStatus {
  connected: boolean;
  storageType: 'neon_postgresql' | 'local_filesystem';
  databaseUrlConfigured: boolean;
  usersCount: number;
  attendanceCount: number;
  tasksCount: number;
  spendingCount: number;
  savedBooksCount: number;
  lastUpdated: string;
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const dbUrl = getDatabaseUrl();
  const sql = getNeonSql();
  let connected = false;
  let storageType: 'neon_postgresql' | 'local_filesystem' = 'local_filesystem';
  let lastUpdated = new Date().toISOString();

  if (sql) {
    try {
      await ensureNeonTable(sql);
      const rows = await sql`
        SELECT updated_at FROM wonderteam_state WHERE key = 'main' LIMIT 1;
      `;
      connected = true;
      storageType = 'neon_postgresql';
      if (rows && rows.length > 0 && rows[0].updated_at) {
        lastUpdated = new Date(rows[0].updated_at).toISOString();
      }
    } catch {
      connected = false;
    }
  }

  const db = await getDb();
  return {
    connected: storageType === 'neon_postgresql' ? connected : true,
    storageType,
    databaseUrlConfigured: Boolean(dbUrl),
    usersCount: db.users.length,
    attendanceCount: db.attendance.length,
    tasksCount: db.tasks.length,
    spendingCount: db.spending.length,
    savedBooksCount: db.savedBooks ? db.savedBooks.length : 0,
    lastUpdated,
  };
}

export async function resetToProductionData(): Promise<void> {
  const fresh = buildProductionInitialData();
  await saveDb(fresh);
}
