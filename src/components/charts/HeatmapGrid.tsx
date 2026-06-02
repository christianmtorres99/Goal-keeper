import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { todayString, addDays } from '../../utils/dateUtils';
import type { Log } from '../../types';

interface Props {
  logs: Log[];
  goalColor?: string;
  days?: number;
  containerWidth?: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS = ['M','','W','','F','','S'];
const DOW_W = 18;
const GAP = 2;

export default function HeatmapGrid({ logs, goalColor, days = 91, containerWidth }: Props) {
  const { colors: Colors } = useColors();
  const color = goalColor ?? Colors.accent;
  const numCols = Math.ceil(days / 7);

  const cellSize = useMemo(() => {
    if (!containerWidth) return 12;
    const available = containerWidth - DOW_W - numCols * GAP;
    return Math.max(8, Math.floor(available / numCols));
  }, [containerWidth, numCols]);

  const colStep = cellSize + GAP;

  const { cells, monthLabels } = useMemo(() => {
    const today = todayString();
    const logCounts: Record<string, number> = {};
    logs.forEach(l => { logCounts[l.logDate] = (logCounts[l.logDate] ?? 0) + 1; });

    const startDate = addDays(today, -(days - 1));
    const cells: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(startDate, i);
      cells.push({ date: d, count: logCounts[d] ?? 0 });
    }

    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    cells.forEach((cell, i) => {
      const m = parseInt(cell.date.split('-')[1]) - 1;
      const col = Math.floor(i / 7);
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col });
        lastMonth = m;
      }
    });

    return { cells, monthLabels };
  }, [logs, days]);

  const getOpacity = (count: number) => {
    if (count === 0) return 1;
    if (count === 1) return 0.4;
    if (count === 2) return 0.65;
    return 0.9;
  };

  const totalGridW = DOW_W + numCols * colStep;

  const inner = (
    <View style={{ width: containerWidth ?? totalGridW }}>
      {/* Month labels */}
      <View style={{ height: 14, marginBottom: 3, marginLeft: DOW_W, position: 'relative' }}>
        {monthLabels.map((m, i) => (
          <Text key={i} style={[s.month, { position: 'absolute', left: m.col * colStep, color: Colors.textSecondary }]}>
            {m.label}
          </Text>
        ))}
        <View style={{ width: numCols * colStep }} />
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row' }}>
        {/* DOW labels */}
        <View style={{ width: DOW_W, gap: GAP }}>
          {DOW_LABELS.map((d, i) => (
            <View key={i} style={{ height: cellSize, justifyContent: 'center' }}>
              <Text style={[s.dow, { color: Colors.textSecondary }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Columns */}
        {Array.from({ length: numCols }).map((_, col) => (
          <View key={col} style={{ gap: GAP, marginRight: GAP }}>
            {Array.from({ length: 7 }).map((_, row) => {
              const idx = col * 7 + row;
              const cell = cells[idx];
              const bg = !cell || cell.count === 0 ? Colors.bg3 : color;
              const op = !cell || cell.count === 0 ? 1 : getOpacity(cell.count);
              return (
                <View
                  key={row}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: Math.max(2, Math.floor(cellSize * 0.18)),
                    backgroundColor: bg,
                    opacity: op,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );

  if (containerWidth) return inner;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}>{inner}</ScrollView>;
}

const s = StyleSheet.create({
  month: { fontSize: 9 },
  dow: { fontSize: 8 },
});
