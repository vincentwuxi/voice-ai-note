'use client';

import { useMemo } from 'react';
import { useAppStore, NoteTag } from '@/store/app-store';
import { Sparkles, ArrowRight, Lightbulb, TrendingUp, Link2, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const tagConfig: Record<NoteTag, { label: string; color: string }> = {
  inspiration: { label: '灵感', color: 'var(--color-tag-amber)' },
  project: { label: '项目', color: 'var(--color-tag-blue)' },
  personal: { label: '个人', color: 'var(--color-tag-emerald)' },
  reading: { label: '阅读', color: 'var(--color-tag-indigo)' },
  design: { label: '设计', color: 'var(--color-tag-purple)' },
};

// Simple keyword overlap for semantic-like matching
function getKeywordOverlap(a: string[], b: string[]): number {
  const setA = new Set(a.flatMap(s => s.replace(/[，。、！？：；""''（）【】]/g, ' ').split(/\s+/).filter(w => w.length > 1)));
  const setB = new Set(b.flatMap(s => s.replace(/[，。、！？：；""''（）【】]/g, ' ').split(/\s+/).filter(w => w.length > 1)));
  let overlap = 0;
  for (const w of setA) {
    if (setB.has(w)) overlap++;
  }
  return overlap;
}

export default function InspirationPage() {
  const { notes } = useAppStore();
  const router = useRouter();

  // Recent notes (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentNotes = useMemo(() =>
    notes.filter(n => new Date(n.createdAt).getTime() > sevenDaysAgo).slice(0, 5),
    [notes, sevenDaysAgo]
  );

  // Find connections between notes based on keyword overlap
  const connections = useMemo(() => {
    if (notes.length < 2) return [];
    const pairs: { a: typeof notes[0]; b: typeof notes[0]; score: number; sharedWords: string[] }[] = [];

    for (let i = 0; i < notes.length && i < 20; i++) {
      for (let j = i + 1; j < notes.length && j < 20; j++) {
        const a = notes[i];
        const b = notes[j];
        const aWords = [...a.keyPoints, a.title, a.summary];
        const bWords = [...b.keyPoints, b.title, b.summary];

        const setA = new Set(aWords.flatMap(s => s.replace(/[，。、！？：；""''（）【】]/g, ' ').split(/\s+/).filter(w => w.length > 1)));
        const setB = new Set(bWords.flatMap(s => s.replace(/[，。、！？：；""''（）【】]/g, ' ').split(/\s+/).filter(w => w.length > 1)));
        const shared: string[] = [];
        for (const w of setA) {
          if (setB.has(w)) shared.push(w);
        }

        if (shared.length >= 2) {
          pairs.push({ a, b, score: shared.length, sharedWords: shared.slice(0, 4) });
        }
      }
    }

    return pairs.sort((x, y) => y.score - x.score).slice(0, 4);
  }, [notes]);

  // Tag statistics
  const tagStats = useMemo(() => {
    const counts: Partial<Record<NoteTag, number>> = {};
    for (const note of notes) {
      for (const tag of note.tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => (b as number) - (a as number)) as [NoteTag, number][];
  }, [notes]);

  // Older notes not in recent
  const recentIds = new Set(recentNotes.map(n => n.id));
  const olderNotes = notes.filter(n => !recentIds.has(n.id)).slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-[var(--color-primary)]" />
        灵感库
      </h1>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-primary)]">{notes.length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">总笔记</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-tag-blue)]">{recentNotes.length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">近 7 天</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-tag-emerald)]">{connections.length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">关联对</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-[var(--color-tag-purple)]">{tagStats.length}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">标签类型</p>
        </div>
      </div>

      {/* Tag Distribution */}
      {tagStats.length > 0 && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold">标签分布</h2>
          </div>
          <div className="space-y-3">
            {tagStats.map(([tag, count]) => {
              const config = tagConfig[tag];
              const pct = Math.round((count / notes.length) * 100);
              return (
                <div key={tag} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-12" style={{ color: config.color }}>{config.label}</span>
                  <div className="flex-1 h-2 bg-[var(--color-bg-surface)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: config.color }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)] w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Recommendations: revisit older notes */}
      {olderNotes.length > 0 && (
        <div className="card p-6 mb-6 border-l-4" style={{ borderLeftColor: 'var(--color-primary)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold">值得回顾</h2>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-5">
            这些笔记距今已有一段时间，或许能带来新的灵感：
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
                    {new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(note.createdAt))}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-primary)] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connections */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-[var(--color-tag-indigo)]" />
          <h2 className="text-lg font-semibold">思维碰撞</h2>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">
          基于关键词分析发现的笔记关联
        </p>

        {connections.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)] py-8 text-center">
            笔记积累更多后，这里会自动发现笔记间的隐藏关联
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--color-bg-surface)] border border-white/6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                  <span className="text-xs font-medium text-[var(--color-success)]">
                    {conn.score >= 4 ? '高关联度' : conn.score >= 3 ? '中关联度' : '可能相关'}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-primary)]">
                  「{conn.a.title.slice(0, 15)}」↔「{conn.b.title.slice(0, 15)}」
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  共享关键词：{conn.sharedWords.join('、')}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => router.push(`/library/${conn.a.id}`)}
                    className="text-[10px] text-[var(--color-primary)] hover:brightness-125 cursor-pointer"
                  >
                    查看前者 →
                  </button>
                  <button
                    onClick={() => router.push(`/library/${conn.b.id}`)}
                    className="text-[10px] text-[var(--color-primary)] hover:brightness-125 cursor-pointer"
                  >
                    查看后者 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
