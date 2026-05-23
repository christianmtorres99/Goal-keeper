import { create } from 'zustand';
import { getDb } from '../db/client';
import type { JournalEntry, DrawingPath } from '../types';
import { todayString, addDays } from '../utils/dateUtils';

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function rowToEntry(r: any): JournalEntry {
  let drawingData: DrawingPath[] = [];
  try {
    drawingData = JSON.parse(r.drawing_data ?? '[]');
  } catch {}
  return {
    id: r.id,
    entryDate: r.entry_date,
    mood: r.mood ?? 3,
    energy: r.energy ?? 3,
    textContent: r.text_content ?? '',
    drawingData,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface JournalStore {
  entries: JournalEntry[];
  todayEntry: JournalEntry | null;
  loadEntries: () => Promise<void>;
  saveEntry: (
    date: string,
    mood: number,
    energy: number,
    text: string,
    drawingData: DrawingPath[]
  ) => Promise<void>;
  getTodayEntry: () => JournalEntry | null;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: [],
  todayEntry: null,

  loadEntries: async () => {
    try {
      const db = await getDb();
      const today = todayString();
      const ninetyDaysAgo = addDays(today, -90);

      const rows = await db.getAllAsync<any>(
        'SELECT * FROM journals WHERE entry_date >= ? ORDER BY entry_date DESC',
        [ninetyDaysAgo]
      );

      const entries = rows.map(rowToEntry);
      const todayEntry = entries.find(e => e.entryDate === today) ?? null;

      set({ entries, todayEntry });
    } catch (e) {
      console.error('loadEntries failed:', e);
    }
  },

  saveEntry: async (date, mood, energy, text, drawingData) => {
    try {
      const db = await getDb();
      const now = new Date().toISOString();
      const existing = get().entries.find(e => e.entryDate === date);

      if (existing) {
        await db.runAsync(
          `UPDATE journals SET mood=?, energy=?, text_content=?, drawing_data=?, updated_at=? WHERE entry_date=?`,
          [mood, energy, text, JSON.stringify(drawingData), now, date]
        );
        const updated: JournalEntry = { ...existing, mood, energy, textContent: text, drawingData, updatedAt: now };
        const today = todayString();
        set(s => ({
          entries: s.entries.map(e => e.entryDate === date ? updated : e),
          todayEntry: date === today ? updated : s.todayEntry,
        }));
      } else {
        const entry: JournalEntry = {
          id: uuid(),
          entryDate: date,
          mood,
          energy,
          textContent: text,
          drawingData,
          createdAt: now,
          updatedAt: now,
        };
        await db.runAsync(
          `INSERT INTO journals (id, entry_date, mood, energy, text_content, drawing_data, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?)`,
          [entry.id, entry.entryDate, mood, energy, text, JSON.stringify(drawingData), now, now]
        );
        const today = todayString();
        set(s => ({
          entries: [entry, ...s.entries],
          todayEntry: date === today ? entry : s.todayEntry,
        }));
      }
    } catch (e) {
      console.error('saveEntry failed:', e);
    }
  },

  getTodayEntry: () => {
    const today = todayString();
    return get().entries.find(e => e.entryDate === today) ?? null;
  },
}));
