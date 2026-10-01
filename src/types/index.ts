export type UserRole = 'member' | 'admin';

export interface OfficeLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sponsorName: string;
  uplineDirector: string;
  uplineWorldTeamLeader: string;
  profileImage: string;
  officeLocation?: OfficeLocation;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'clocked_out' | 'not_checked_in';
export type WorkEthicStatus = 'serious' | 'unserious' | 'pending_check';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  date: string;
  clockIn: string;
  clockInTimestamp: number;
  clockOut: string | null;
  clockOutTimestamp: number | null;
  durationMinutes: number;
  durationFormatted: string;
  status: AttendanceStatus;
  workEthicStatus?: WorkEthicStatus;
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

export interface TeamMemberLiveStatus {
  memberId: string;
  name: string;
  avatar: string;
  status: AttendanceStatus;
  workEthicStatus?: WorkEthicStatus;
  hasWrittenTodoToday?: boolean;
  clockIn: string;
  duration: string;
  lastActivity: string;
  distanceFromOffice?: number;
}

export interface TeamAttendanceSummary {
  total: number;
  presentCount: number;
  purePresent: number;
  lateCount: number;
  clockedOutCount: number;
  notCheckedInCount: number;
  absentCount: number;
  unseriousCount?: number;
  seriousCount?: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskType = 'assigned' | 'personal';
export type IPACategory =
  | 'prospecting'
  | 'inviting'
  | 'presentation'
  | 'followup'
  | 'closing'
  | 'retailing'
  | 'team_training'
  | 'mindset_reading'
  | 'general';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  createdAt: string;
  updatedAt: string;
  isIPA?: boolean;
  ipaCategory?: IPACategory;
  aiPriorityReason?: string;
  aiOrder?: number;
}

export interface MotivationalQuoteData {
  quote: string;
  author: string;
  timePeriod: 'morning' | 'afternoon' | 'night' | '1am_midnight';
  timeTitle: string;
  personalizedNote: string;
  activityHighlight?: string;
}

export interface IPAPrioritizeResponse {
  analysis: string;
  prioritizedTasks: TaskItem[];
  ipaScore: number; // 0-100% of tasks that are direct IPAs
  summaryTip: string;
}

export interface SpendingRecord {
  id: string;
  userId: string;
  merchant: string;
  amount: number; // In Nigerian Naira (₦)
  category: string;
  description: string;
  date: string;
  receipt?: string;
  createdAt: string;
}

export interface MemberSpendingData {
  currentMonth: string;
  totalSpentThisMonth: number;
  monthlyBudget: number;
  transactions: SpendingRecord[];
}

export interface TeamMemberDirectoryItem extends User {
  taskCount: number;
  pendingTasks: number;
  completedTasks: number;
}

// -------------------------------------------------------------
// TEAM GROWTH LIBRARY & DICTIONARY TYPES
// -------------------------------------------------------------

export interface BookItem {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  coverUrl?: string;
  first_publish_year?: number;
  ebook_access?: string;
  ia?: string[];
  isbn?: string[];
  category?: string;
  googleBookId?: string;
  embeddable?: boolean;
  previewLink?: string;
  description?: string;
  source?: 'openlibrary' | 'googlebooks' | 'both';
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
  origin?: string;
  meanings: DictionaryMeaning[];
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
