'use client';

import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfWeek }, (_, i) => null);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // Demo: days with notes
  const noteDays = [11, 12, 13, 14, 15];

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-[var(--color-primary)]" />
        日历
      </h1>

      <div className="card p-6">
        {/* Month Header */}
        <h2 className="text-xl font-semibold text-center mb-6">
          {new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(today)}
        </h2>

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
            <div key={`pad-${i}`} className="h-12" />
          ))}
          {days.map((day) => {
            const isToday = day === today.getDate();
            const hasNotes = noteDays.includes(day);
            return (
              <button
                key={day}
                className={`h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                  isToday
                    ? 'bg-[var(--color-primary)] text-black font-bold'
                    : 'hover:bg-white/5 text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-sm">{day}</span>
                {hasNotes && !isToday && (
                  <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
