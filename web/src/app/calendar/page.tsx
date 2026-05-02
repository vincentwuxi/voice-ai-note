'use client';

import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Play, Users } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useRouter } from 'next/navigation';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  // Total notes this month
  const monthNoteCount = Object.values(notesByDay).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-[var(--color-primary)]" />
        日历
      </h1>

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
                {monthNoteCount > 0 ? `${monthNoteCount} 条笔记` : '暂无笔记'}
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

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {padding.map((_, i) => (
              <div key={`pad-${i}`} className="h-14" />
            ))}
            {days.map((day) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayNotes = notesByDay[day];
              const hasNotes = dayNotes && dayNotes.length > 0;
              const isSelected = selectedDay === day;
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
                >
                  <span className="text-sm">{day}</span>
                  {hasNotes && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {dayNotes.slice(0, 3).map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black/40' : 'bg-[var(--color-primary)]'}`} />
                      ))}
                      {dayNotes.length > 3 && (
                        <span className={`text-[8px] ml-0.5 ${isSelected ? 'text-black/60' : 'text-[var(--color-primary)]'}`}>+</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
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
              <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">当天没有录音笔记</p>
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
        </div>
      </div>
    </div>
  );
}
