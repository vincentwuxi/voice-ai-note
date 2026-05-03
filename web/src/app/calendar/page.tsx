'use client';

import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Play, Users, Mic, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useRouter } from 'next/navigation';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}

export default function CalendarPage() {
  const { notes } = useAppStore();
  const router = useRouter();
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfWeek }, () => null);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // Build map: day number → notes for that day
  const notesByDay = useMemo(() => {
    const map: Record<number, typeof notes> = {};
    for (const note of notes) {
      const d = new Date(note.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(note);
      }
    }
    return map;
  }, [notes, year, month]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedNotes = selectedDay ? notesByDay[selectedDay] || [] : [];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => { setViewDate(new Date()); setSelectedDay(today.getDate()); };

  // Monthly stats
  const monthStats = useMemo(() => {
    const allMonthNotes = Object.values(notesByDay).flat();
    const noteCount = allMonthNotes.length;
    const totalDuration = allMonthNotes.reduce((sum, n) => sum + n.duration, 0);
    const activeDays = Object.keys(notesByDay).length;
    const maxNotesInDay = Math.max(0, ...Object.values(notesByDay).map(arr => arr.length));
    return { noteCount, totalDuration, activeDays, maxNotesInDay };
  }, [notesByDay]);

  // Heatmap intensity: 0-4 based on note count
  function getHeatIntensity(count: number): number {
    if (count === 0) return 0;
    if (monthStats.maxNotesInDay <= 1) return count > 0 ? 2 : 0;
    const ratio = count / monthStats.maxNotesInDay;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  }

  const heatColors: Record<number, string> = {
    0: 'transparent',
    1: 'rgba(245, 166, 35, 0.15)',
    2: 'rgba(245, 166, 35, 0.3)',
    3: 'rgba(245, 166, 35, 0.5)',
    4: 'rgba(245, 166, 35, 0.75)',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-[var(--color-primary)]" />
          日历
        </h1>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] text-black font-semibold rounded-xl hover:opacity-90 transition-colors cursor-pointer text-sm"
        >
          <Mic className="w-4 h-4" /> 新录音
        </button>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-primary)]">{monthStats.noteCount}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">本月笔记</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-tag-blue)]">{monthStats.activeDays}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">活跃天数</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-tag-emerald)]">{formatMinutes(monthStats.totalDuration)}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">总录音时长</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 card p-6">
          {/* Month Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-text-secondary)] cursor-pointer transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(viewDate)}
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                {monthStats.noteCount > 0 ? `${monthStats.noteCount} 条笔记 · ${monthStats.activeDays} 天活跃` : '暂无笔记'}
              </p>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 text-[var(--color-text-secondary)] cursor-pointer transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Today button */}
          <div className="flex justify-center mb-4">
            <button onClick={goToday} className="text-xs text-[var(--color-primary)] hover:brightness-125 cursor-pointer">今天</button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-[var(--color-text-tertiary)] py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid with Heatmap */}
          <div className="grid grid-cols-7 gap-1">
            {padding.map((_, i) => (
              <div key={`pad-${i}`} className="h-14" />
            ))}
            {days.map((day) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayNotes = notesByDay[day];
              const hasNotes = dayNotes && dayNotes.length > 0;
              const isSelected = selectedDay === day;
              const heat = hasNotes ? getHeatIntensity(dayNotes.length) : 0;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-black font-bold ring-2 ring-[var(--color-primary)]/30'
                      : isToday
                        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold'
                        : 'hover:bg-white/5 text-[var(--color-text-secondary)]'
                  }`}
                  style={!isSelected && !isToday && heat > 0 ? { backgroundColor: heatColors[heat] } : undefined}
                >
                  <span className="text-sm">{day}</span>
                  {hasNotes && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {dayNotes.length <= 3 ? (
                        dayNotes.map((_, i) => (
                          <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black/40' : 'bg-[var(--color-primary)]'}`} />
                        ))
                      ) : (
                        <>
                          <span className={`text-[9px] font-bold ${isSelected ? 'text-black/60' : 'text-[var(--color-primary)]'}`}>
                            {dayNotes.length}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/5">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">少</span>
            {[1, 2, 3, 4].map(level => (
              <div key={level} className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColors[level] }} />
            ))}
            <span className="text-[10px] text-[var(--color-text-tertiary)]">多</span>
          </div>
        </div>

        {/* Day Detail */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
              {selectedDay
                ? `${month + 1}月${selectedDay}日 · ${selectedNotes.length} 条笔记`
                : '选择日期查看笔记'
              }
            </h3>

            {selectedDay && selectedNotes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--color-text-tertiary)] mb-3">当天没有录音笔记</p>
                <button
                  onClick={() => router.push('/')}
                  className="text-xs text-[var(--color-primary)] hover:brightness-125 cursor-pointer"
                >
                  去录一条？
                </button>
              </div>
            )}

            {!selectedDay && (
              <div className="text-center py-8">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[var(--color-text-tertiary)] opacity-30" />
                <p className="text-sm text-[var(--color-text-tertiary)]">点击日期查看笔记详情</p>
              </div>
            )}

            <div className="space-y-3">
              {selectedNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => router.push(`/library/${note.id}`)}
                  className="w-full text-left p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-white/8 transition-colors cursor-pointer group"
                >
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                    {note.title}
                  </h4>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">{note.summary}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--color-text-tertiary)]">
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" />{formatDuration(note.duration)}</span>
                    {note.speakerCount > 1 && (
                      <span className="flex items-center gap-1 text-[var(--color-tag-blue)]"><Users className="w-3 h-3" />{note.speakerCount}</span>
                    )}
                    <span>{new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(note.createdAt))}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Streak */}
          {monthStats.noteCount > 0 && (
            <div className="card p-5 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[var(--color-tag-amber)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">本月概览</h3>
              </div>
              <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                <div className="flex justify-between">
                  <span>日均笔记</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {(monthStats.noteCount / Math.max(1, monthStats.activeDays)).toFixed(1)} 条/天
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>日均时长</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {formatMinutes(Math.round(monthStats.totalDuration / Math.max(1, monthStats.activeDays)))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>活跃率</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {Math.round((monthStats.activeDays / daysInMonth) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
