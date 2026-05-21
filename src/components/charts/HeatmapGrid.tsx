import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { todayString, addDays, formatDate } from '../../utils/dateUtils';
import type { Log } from '../../types';

interface Props {
  logs: Log[];
  goalColor?: string;
  days?: number;
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function HeatmapGrid({ logs, goalColor, days = 91 }: Props) {
  const color = goalColor ?? Colors.accent;

  const { cells, months } = useMemo(() => {
    const today = todayString();
    const logCounts: Record<string, number> = {};
    logs.forEach(l => { logCounts[l.logDate] = (logCounts[l.logDate] ?? 0) + 1; });

    // Start from `days` days ago, aligned to Monday
    const startDate = addDays(today, -(days - 1));
    const cells: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(startDate, i);
      cells.push({ date: d, count: logCounts[d] ?? 0 });
    }

    // Collect month label positions (week column index where month first appears)
    const monthLabels: { label: string; col: number }[] = [];
    const startDow = new Date(startDate).getDay();
    const padStart = (startDow + 6) % 7;
    let lastMonth = -1;
    cells.forEach((cell, i) => {
      const m = parseInt(cell.date.split('-')[1]) - 1;
      const col = Math.floor((i + padStart) / 7);
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col });
        lastMonth = m;
      }
    });

    return { cells, months: monthLabels };
  }, [logs, days]);

  const getOpacity = (count: number) => {
    if (count === 0) return 0.08;
    if (count === 1) return 0.35;
    if (count === 2) return 0.6;
    return 0.9;
  };

  const totalCols = Math.ceil((cells.length) / 7) + 1;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Month labels */}
        <View style={styles.monthRow}>
          <View style={styles.dowPad} />
          {months.map((m, i) => (
            <View key={i} style={[styles.monthLabel, { left: m.col * 14 + 24 }]}>
              <Text style={styles.monthText}>{m.label}</Text>
            </View>
          ))}
          <View style={{ width: totalCols * 14 }} />
        </View>

        <View style={styles.gridRow}>
          {/* Day of week labels */}
          <View style={styles.dowCol}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.dowText}>{i % 2 === 0 ? d : ''}</Text>
            ))}
          </View>

          {/* Grid columns */}
          {Array.from({ length: totalCols }).map((_, col) => (
            <View key={col} style={styles.col}>
              {Array.from({ length: 7 }).map((_, row) => {
                const cellIdx = col * 7 + row;
                const cell = cells[cellIdx];
                if (!cell) return <View key={row} style={styles.cell} />;
                return (
                  <View
                    key={row}
                    style={[styles.cell, { backgroundColor: color, opacity: getOpacity(cell.count) }]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', position: 'relative', height: 16, marginBottom: 2 },
  dowPad: { width: 20 },
  monthLabel: { position: 'absolute' },
  monthText: { color: Colors.textSecondary, fontSize: 9 },
  gridRow: { flexDirection: 'row' },
  dowCol: { width: 20, gap: 2 },
  dowText: { height: 12, fontSize: 8, color: Colors.textSecondary, lineHeight: 12 },
  col: { gap: 2, marginRight: 2 },
  cell: { width: 12, height: 12, borderRadius: 2, backgroundColor: Colors.bg3 },
});
