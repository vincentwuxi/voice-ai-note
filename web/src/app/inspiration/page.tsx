'use client';

import { useAppStore } from '@/store/app-store';
import { Sparkles, ArrowRight, Lightbulb, TrendingUp, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InspirationPage() {
  const { notes } = useAppStore();
  const router = useRouter();

  // Simple recommendation: find related notes
  const recentNotes = notes.slice(0, 3);
  const olderNotes = notes.slice(3);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-[var(--color-primary)]" />
        灵感库
      </h1>

      {/* AI Daily Recommendations */}
      <div className="card p-6 mb-6 border-l-4" style={{ borderLeftColor: 'var(--color-primary)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-lg font-semibold">AI 每日推荐</h2>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">
          根据你最近的笔记，以下旧灵感可能与之相关：
        </p>
        <div className="space-y-3">
          {olderNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => router.push(`/library/${note.id}`)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg-surface)] hover:bg-white/8 transition-colors cursor-pointer group"
            >
              <div className="text-left">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                  {note.title}
                </h3>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  {new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(note.createdAt)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Connections */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-[var(--color-tag-indigo)]" />
          <h2 className="text-lg font-semibold">思维碰撞</h2>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">
          发现笔记之间的隐藏关联
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
              <span className="text-xs font-medium text-[var(--color-success)]">高关联度</span>
            </div>
            <p className="text-sm text-[var(--color-text-primary)]">
              「营销策略」与「原子习惯」
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              习惯循环理论可应用于用户行为分析
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-white/6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-tag-amber)]" />
              <span className="text-xs font-medium text-[var(--color-tag-amber)]">可能相关</span>
            </div>
            <p className="text-sm text-[var(--color-text-primary)]">
              「语音转知识图谱」与「导航重设计」
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              知识图谱可视化与导航设计有共通理念
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
