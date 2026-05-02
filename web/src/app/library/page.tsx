'use client';

import { useMemo, useState } from 'react';
import { Search, Play, Users, Trash2, X, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { useAppStore, NoteTag } from '@/store/app-store';
import { useRouter } from 'next/navigation';

type SortMode = 'newest' | 'oldest' | 'longest' | 'shortest';

const tagConfig: Record<NoteTag, { label: string; color: string; bgColor: string }> = {
  inspiration: { label: '灵感', color: 'var(--color-tag-amber)', bgColor: 'rgba(245, 158, 11, 0.15)' },
  project: { label: '项目', color: 'var(--color-tag-blue)', bgColor: 'rgba(59, 130, 246, 0.15)' },
  personal: { label: '个人', color: 'var(--color-tag-emerald)', bgColor: 'rgba(16, 185, 129, 0.15)' },
  reading: { label: '阅读', color: 'var(--color-tag-indigo)', bgColor: 'rgba(99, 102, 241, 0.15)' },
  design: { label: '设计', color: 'var(--color-tag-purple)', bgColor: 'rgba(139, 92, 246, 0.15)' },
};

const tagFilters: { id: NoteTag | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'inspiration', label: '灵感' },
  { id: 'project', label: '项目' },
  { id: 'personal', label: '个人' },
  { id: 'reading', label: '阅读' },
  { id: 'design', label: '设计' },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date);
}

export default function LibraryPage() {
  const { notes, activeTagFilter, setActiveTagFilter, searchQuery, setSearchQuery, deleteNote } = useAppStore();
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget.id);
    setDeleteTarget(null);
  };

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = notes.filter((note) => {
      if (activeTagFilter !== 'all' && !note.tags.includes(activeTagFilter)) return false;
      if (q) {
        const searchFields = [
          note.title, note.content, note.summary,
          ...note.keyPoints, ...note.actionItems,
        ].join(' ').toLowerCase();
        if (!searchFields.includes(q)) return false;
      }
      return true;
    });
    // Sort
    return filtered.sort((a, b) => {
      switch (sortMode) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'longest': return b.duration - a.duration;
        case 'shortest': return a.duration - b.duration;
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [notes, activeTagFilter, searchQuery, sortMode]);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl lg:text-4xl font-bold">思想库</h1>
          <span className="text-sm text-[var(--color-text-tertiary)] mt-2">{filteredNotes.length} 条</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-3 py-2.5 bg-[var(--color-bg-card)] border border-white/8 rounded-xl text-xs text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-primary)]/40 cursor-pointer appearance-none"
          >
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
            <option value="longest">最长优先</option>
            <option value="shortest">最短优先</option>
          </select>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-[var(--color-bg-card)] border border-white/8 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/40 w-48 lg:w-64 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {tagFilters.map((tag) => {
          const isActive = activeTagFilter === tag.id;
          const config = tag.id !== 'all' ? tagConfig[tag.id] : null;
          return (
            <button
              key={tag.id}
              onClick={() => setActiveTagFilter(tag.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-primary)] text-black'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-white/6'
              }`}
            >
              {config && !isActive && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
              )}
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-tertiary)]">
          <p className="text-lg">暂无笔记</p>
          <p className="text-sm mt-2">开始录音，创建你的第一条语音笔记</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const tag = note.tags[0];
            const config = tag ? tagConfig[tag] : null;
            return (
              <div key={note.id} className="card p-5 text-left cursor-pointer group relative">
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: note.id, title: note.title });
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all cursor-pointer z-10"
                  title="删除笔记"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Clickable card body */}
                <div onClick={() => router.push(`/library/${note.id}`)}>
                  {/* Tag Badge */}
                  {config && (
                    <span
                      className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium mb-3"
                      style={{ color: config.color, backgroundColor: config.bgColor }}
                    >
                      {config.label}
                    </span>
                  )}

                  {/* Title */}
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors pr-6">
                    {note.isProcessing ? '🔄 AI 处理中...' : note.title}
                  </h3>

                  {/* Preview */}
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 mb-4">
                    {note.isProcessing ? '正在转录和分析...' : note.summary}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Play className="w-3 h-3" />
                        <span>{formatDuration(note.duration)}</span>
                      </div>
                      {note.speakerCount > 1 && (
                        <div className="flex items-center gap-1 text-[var(--color-tag-blue)]">
                          <Users className="w-3 h-3" />
                          <span>{note.speakerCount}</span>
                        </div>
                      )}
                    </div>
                    <span>{formatDate(note.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          {/* Dialog */}
          <div className="relative card p-6 w-full max-w-sm border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">确认删除</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">此操作不可撤销</p>
              </div>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              确定要删除「<span className="text-[var(--color-text-primary)] font-medium">{deleteTarget.title.slice(0, 30)}</span>」吗？录音文件和 AI 摘要都将被永久删除。
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:bg-white/10 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--color-error)] hover:brightness-110 transition-all cursor-pointer"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
