import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, Radius, Spacing } from '../constants/theme';
import { useLogStore } from '../store/logStore';
import { useGoalStore } from '../store/goalStore';
import { getMonthDays, getMonthName, todayString } from '../utils/dateUtils';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { getLogsForMonth } = useLogStore();
  const goals = useGoalStore(s => s.goals);

  const monthLogs = useMemo(() => getLogsForMonth(year, month), [year, month, getLogsForMonth]);

  const goalMap = useMemo(() => {
    const m: Record<string, { color: string; name: string }> = {};
    goals.forEach(g => { m[g.id] = { color: g.color, name: g.name }; });
    return m;
  }, [goals]);

  const dayActivities = useMemo(() => {
    const acts: Record<string, string[]> = {};
    monthLogs.forEach(log => {
      if (!acts[log.logDate]) acts[log.logDate] = [];
      if (!acts[log.logDate].includes(log.goalId)) acts[log.logDate].push(log.goalId);
    });
    return acts;
  }, [monthLogs]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  // Padding to align first day to correct weekday (Mon=0)
  const firstDow = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return (d.getDay() + 6) % 7; // Monday = 0
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const selectedLogs = selectedDay ? (dayActivities[selectedDay] ?? []) : [];
  const todayStr = todayString();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{getMonthName(month)} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.dowRow}>
        {DOW.map(d => <Text key={d} style={styles.dowLabel}>{d}</Text>)}
      </View>

      {/* Calendar grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {/* Empty cells for padding */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <View key={`pad-${i}`} style={styles.cell} />
        ))}
        {days.map(dateStr => {
          const goalIds = dayActivities[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.cell, isToday && styles.cellToday]}
              onPress={() => goalIds.length > 0 ? setSelectedDay(dateStr) : null}
              disabled={isFuture}
            >
              <Text style={[styles.dayNum, isToday && styles.dayNumToday, isFuture && styles.dayNumFuture]}>
                {parseInt(dateStr.split('-')[2])}
              </Text>
              <View style={styles.dots}>
                {goalIds.slice(0, 5).map(gid => (
                  <View key={gid} style={[styles.dot, { backgroundColor: goalMap[gid]?.color ?? Colors.accent }]} />
                ))}
                {goalIds.length > 5 && <Text style={styles.moreDots}>+{goalIds.length - 5}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day detail modal */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedDay(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalDate}>{selectedDay}</Text>
            {selectedLogs.map(gid => (
              <View key={gid} style={styles.modalRow}>
                <View style={[styles.modalDot, { backgroundColor: goalMap[gid]?.color ?? Colors.accent }]} />
                <Text style={styles.modalGoalName}>{goalMap[gid]?.name ?? 'Unknown'}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  arrow: { padding: Spacing.sm },
  monthTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  dowRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs },
  dowLabel: { flex: 1, textAlign: 'center', color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xxl },
  cell: { width: `${100 / 7}%`, aspectRatio: 0.85, padding: 3 },
  cellToday: {},
  dayNum: { color: Colors.textPrimary, fontSize: FontSize.sm, textAlign: 'center', marginBottom: 2 },
  dayNumToday: { color: Colors.accentBright, fontWeight: '700' },
  dayNumFuture: { color: Colors.textDisabled },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  moreDots: { color: Colors.textDisabled, fontSize: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { backgroundColor: Colors.bg1, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md },
  modalDate: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalDot: { width: 12, height: 12, borderRadius: 6 },
  modalGoalName: { color: Colors.textPrimary, fontSize: FontSize.md },
});
