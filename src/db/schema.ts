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
    unit TEXT
  )
`;

export const CREATE_LOGS = `
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL REFERENCES goals(id),
    log_date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    xp_awarded REAL NOT NULL DEFAULT 0
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
