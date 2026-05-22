export const CREATE_GOALS = `
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK(type IN ('habit','milestone')),
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
    cycle_count INTEGER DEFAULT 0
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
    bonus_xp REAL NOT NULL DEFAULT 0
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
