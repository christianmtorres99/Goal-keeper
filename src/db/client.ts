import * as SQLite from 'expo-sqlite';
import {
  CREATE_EARNED_BADGES,
  CREATE_GOALS,
  CREATE_GRACE_DAYS,
  CREATE_LOGS,
  CREATE_TODOS,
  CREATE_TODO_SUB_ITEMS,
  CREATE_JOURNALS,
  CREATE_SCHEDULED_TASKS,
  MIGRATIONS_V2,
  MIGRATIONS_V3,
  MIGRATIONS_V4,
  MIGRATIONS_V5,
  MIGRATIONS_V6,
  MIGRATIONS_V7,
  MIGRATIONS_V8,
} from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('goalkeeper.db');
    await _db.execAsync('PRAGMA journal_mode = WAL;');
  }
  return _db;
}

export async function runMigrations(): Promise<void> {
  const db = await getDb();

  const vRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const v = vRow?.user_version ?? 0;

  // Base tables always run with IF NOT EXISTS — safe no-op on existing DBs
  await db.execAsync(CREATE_GOALS);
  await db.execAsync(CREATE_LOGS);
  await db.execAsync(CREATE_EARNED_BADGES);
  await db.execAsync(CREATE_GRACE_DAYS);
  await db.execAsync(CREATE_TODOS);
  await db.execAsync(CREATE_TODO_SUB_ITEMS);
  await db.execAsync(CREATE_JOURNALS);
  await db.execAsync(CREATE_SCHEDULED_TASKS);

  if (v < 2) {
    for (const sql of MIGRATIONS_V2) {
      try { await db.execAsync(sql); } catch {}
    }
  }
  if (v < 3) {
    for (const sql of MIGRATIONS_V3) {
      try { await db.execAsync(sql); } catch {}
    }
  }
  if (v < 4) {
    for (const sql of MIGRATIONS_V4) {
      try { await db.execAsync(sql); } catch {}
    }
  }
  if (v < 5) {
    for (const sql of MIGRATIONS_V5) {
      try { await db.execAsync(sql); } catch {}
    }
  }
  if (v < 6) {
    for (const sql of MIGRATIONS_V6) {
      try { await db.execAsync(sql); } catch {}
    }
  }
  if (v < 7) {
    for (const sql of MIGRATIONS_V7) {
      try { await db.execAsync(sql); } catch {}
    }
  }
  if (v < 8) {
    for (const sql of MIGRATIONS_V8) {
      try { await db.execAsync(sql); } catch {}
    }
  }

  await db.execAsync('PRAGMA user_version = 8');
}
