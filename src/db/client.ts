import * as SQLite from 'expo-sqlite';
import {
  CREATE_EARNED_BADGES,
  CREATE_GOALS,
  CREATE_GRACE_DAYS,
  CREATE_LOGS,
  CREATE_LOGS_UNIQUE_INDEX,
  CREATE_TODOS,
  CREATE_TODO_SUB_ITEMS,
  CREATE_JOURNALS,
  CREATE_SCHEDULED_TASKS,
  MIGRATIONS_V2,
  MIGRATIONS_V3,
  MIGRATIONS_V4,
  MIGRATIONS_V5,
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
  await db.execAsync(CREATE_TODOS);
  await db.execAsync(CREATE_TODO_SUB_ITEMS);
  await db.execAsync(CREATE_JOURNALS);
  await db.execAsync(CREATE_SCHEDULED_TASKS);

  for (const sql of MIGRATIONS_V2) {
    try { await db.execAsync(sql); } catch {}
  }
  for (const sql of MIGRATIONS_V3) {
    try { await db.execAsync(sql); } catch {}
  }
  for (const sql of MIGRATIONS_V4) {
    try { await db.execAsync(sql); } catch {}
  }
  for (const sql of MIGRATIONS_V5) {
    try { await db.execAsync(sql); } catch {}
  }
}
