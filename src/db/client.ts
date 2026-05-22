import * as SQLite from 'expo-sqlite';
import {
  CREATE_EARNED_BADGES,
  CREATE_GOALS,
  CREATE_GRACE_DAYS,
  CREATE_LOGS,
  CREATE_LOGS_UNIQUE_INDEX,
  MIGRATIONS_V2,
  MIGRATIONS_V3,
  MIGRATIONS_V4,
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
  await db.execAsync(CREATE_GOALS);
  await db.execAsync(CREATE_LOGS);
  await db.execAsync(CREATE_LOGS_UNIQUE_INDEX);
  await db.execAsync(CREATE_EARNED_BADGES);
  await db.execAsync(CREATE_GRACE_DAYS);

  // V2 column additions — each wrapped in try/catch so existing installs skip silently
  for (const sql of MIGRATIONS_V2) {
    try {
      await db.execAsync(sql);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // V3 migrations — allow multiple logs per day
  for (const sql of MIGRATIONS_V3) {
    try {
      await db.execAsync(sql);
    } catch {
      // Safe to ignore — column already exists or index already dropped
    }
  }

  // V4 migrations — difficulty column
  for (const sql of MIGRATIONS_V4) {
    try {
      await db.execAsync(sql);
    } catch {
      // Safe to ignore — column already exists
    }
  }
}
