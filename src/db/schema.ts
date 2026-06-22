export const CREATE_GOALS = `
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    target_count INTEGER,
    unit TEXT,
    sort_order INTEGER DEFAULT 0,
    category TEXT DEFAULT 'other',
    notification_time TEXT,
    notification_id TEXT,
    completed_at TEXT,
    cycle_count INTEGER DEFAULT 0,
    allow_multiple_per_day INTEGER DEFAULT 0,
    difficulty TEXT DEFAULT 'medium',
    custom_category_label TEXT
  )
`;

export const CREATE_LOGS = `
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id),
    log_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    xp_awarded REAL NOT NULL DEFAULT 0,
    bonus_xp REAL NOT NULL DEFAULT 0,
    count INTEGER DEFAULT 1,
    is_relapse INTEGER DEFAULT 0
  )
`;

export const CREATE_LOGS_UNIQUE_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_goal_date ON logs(goal_id, log_date)
`;

export const CREATE_EARNED_BADGES = `
  CREATE TABLE IF NOT EXISTS earned_badges (
    id TEXT PRIMARY KEY,
    badge_id TEXT NOT NULL,
    goal_id TEXT,
    earned_at TEXT NOT NULL
  )
`;

export const CREATE_GRACE_DAYS = `
  CREATE TABLE IF NOT EXISTS grace_days (
    goal_id TEXT PRIMARY KEY,
    grace_used INTEGER NOT NULL DEFAULT 0,
    refill_date TEXT
  )
`;

export const MIGRATIONS_V3 = [
  `ALTER TABLE goals ADD COLUMN allow_multiple_per_day INTEGER DEFAULT 0`,
  `DROP INDEX IF EXISTS idx_logs_goal_date`,
];

export const MIGRATIONS_V4 = [
  `ALTER TABLE goals ADD COLUMN difficulty TEXT DEFAULT 'medium'`,
];

export const MIGRATIONS_V5 = [
  `ALTER TABLE goals ADD COLUMN custom_category_label TEXT`,
];

export const MIGRATIONS_V6 = [
  `ALTER TABLE logs ADD COLUMN count INTEGER DEFAULT 1`,
];

export const MIGRATIONS_V8 = [
  `DELETE FROM earned_badges WHERE badge_id IN ('prestige_1','prestige_2','prestige_3')`,
];

export const MIGRATIONS_V7 = [
  // Add is_relapse column (idempotent — fails silently if already exists)
  `ALTER TABLE logs ADD COLUMN is_relapse INTEGER DEFAULT 0`,
  // Recreate goals table to allow 'quit' type (no CHECK constraint = TypeScript enforces)
  `CREATE TABLE IF NOT EXISTS _goals_v7 (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL, color TEXT NOT NULL, icon TEXT NOT NULL,
    created_at TEXT NOT NULL, is_archived INTEGER NOT NULL DEFAULT 0,
    target_count INTEGER, unit TEXT, sort_order INTEGER DEFAULT 0,
    category TEXT DEFAULT 'other', notification_time TEXT, notification_id TEXT,
    completed_at TEXT, cycle_count INTEGER DEFAULT 0,
    allow_multiple_per_day INTEGER DEFAULT 0, difficulty TEXT DEFAULT 'medium',
    custom_category_label TEXT
  )`,
  `INSERT OR IGNORE INTO _goals_v7 SELECT * FROM goals`,
  `DROP TABLE goals`,
  `ALTER TABLE _goals_v7 RENAME TO goals`,
];

// Run these as ALTER TABLE in a try/catch — safe to call on existing DBs
export const MIGRATIONS_V2 = [
  `ALTER TABLE goals ADD COLUMN sort_order INTEGER DEFAULT 0`,
  `ALTER TABLE goals ADD COLUMN category TEXT DEFAULT 'other'`,
  `ALTER TABLE goals ADD COLUMN notification_time TEXT`,
  `ALTER TABLE goals ADD COLUMN notification_id TEXT`,
  `ALTER TABLE goals ADD COLUMN completed_at TEXT`,
  `ALTER TABLE goals ADD COLUMN cycle_count INTEGER DEFAULT 0`,
  `ALTER TABLE logs ADD COLUMN bonus_xp REAL NOT NULL DEFAULT 0`,
];

// ── Todos ────────────────────────────────────────────────────────────────────
export const CREATE_TODOS = `
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    due_date TEXT,
    due_time TEXT,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    xp_reward INTEGER DEFAULT 15,
    created_at TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )
`;

export const CREATE_TODO_SUB_ITEMS = `
  CREATE TABLE IF NOT EXISTS todo_sub_items (
    id TEXT PRIMARY KEY,
    todo_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  )
`;

// ── Scheduled Tasks ──────────────────────────────────────────────────────────
export const CREATE_SCHEDULED_TASKS = `
  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    days_of_week TEXT NOT NULL,
    icon TEXT DEFAULT 'calendar',
    color TEXT DEFAULT '#8B5CF6',
    created_at TEXT NOT NULL
  )
`;

// ── Journal ───────────────────────────────────────────────────────────────────
export const CREATE_JOURNALS = `
  CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    mood INTEGER NOT NULL DEFAULT 3,
    energy INTEGER NOT NULL DEFAULT 3,
    text_content TEXT DEFAULT '',
    drawing_data TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;
