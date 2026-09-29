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
  return {
    users: [],
    attendance: [],
    tasks: [],
    spending: [],
    budgets: [],
    savedBooks: [],
  };
}

export function purgeDemoData(db: DatabaseState): boolean {
  const demoIds = ['usr_admin', 'usr_amara', 'usr_chinedu', 'usr_mariam', 'usr_tobi'];
  const demoEmails = [
    'admin@wonderteam.com',
    'amara@wonderteam.com',
    'chinedu@wonderteam.com',
    'mariam@wonderteam.com',
    'tobi@wonderteam.com',
  ];

  const beforeLen = db.users.length;
  db.users = db.users.filter(
    (u) =>
      !demoIds.includes(u.id) &&
      !demoEmails.includes(u.email.toLowerCase()) &&
      !u.email.toLowerCase().endsWith('@wonderteam.com')
  );

  const hadDemoUsers = db.users.length !== beforeLen;
  const beforeAtt = db.attendance.length;
  db.attendance = db.attendance.filter(
    (a) => !demoIds.includes(a.userId) && !a.id.startsWith('att_')
  );

  const beforeTasks = db.tasks.length;
  db.tasks = db.tasks.filter(
    (t) => !demoIds.includes(t.assigneeId) && !t.id.startsWith('task_')
  );

  const beforeSpend = db.spending.length;
  db.spending = db.spending.filter(
    (s) => !demoIds.includes(s.userId) && !s.id.startsWith('sp_')
  );

  const beforeBudgets = db.budgets.length;
  db.budgets = db.budgets.filter((b) => !demoIds.includes(b.userId));

  return (
    hadDemoUsers ||
    db.attendance.length !== beforeAtt ||
    db.tasks.length !== beforeTasks ||
    db.spending.length !== beforeSpend ||
    db.budgets.length !== beforeBudgets
  );
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
  const leaderEmail =
    process.env.TEAM_LEADER_EMAIL?.trim().toLowerCase() || 'emperorxpert@gmail.com';
  const leaderPassword = process.env.TEAM_LEADER_PASSWORD || 'password123';
  const leaderName = process.env.TEAM_LEADER_NAME || 'Emperor';

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
        if (purgeDemoData(state)) {
          shouldSave = true;
        }
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
  if (purgeDemoData(local)) {
    shouldSaveLocal = true;
  }
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
