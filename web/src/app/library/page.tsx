'use client';

import { useMemo, useState, useRef } from 'react';
import { Search, Play, Users, Trash2, X, AlertTriangle, ArrowUpDown, Cloud, CloudOff, Loader2, CheckSquare, Square, Upload, Download, FileJson } from 'lucide-react';
import { useAppStore, NoteTag, Note } from '@/store/app-store';
import { useRouter } from 'next/navigation';
import { exportToJSON } from '@/services/db';

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
  const { notes, activeTagFilter, setActiveTagFilter, searchQuery, setSearchQuery, deleteNote, addNote } = useAppStore();
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleBatchDelete = () => {
    for (const id of selectedIds) {
      deleteNote(id);
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    setShowBatchDeleteConfirm(false);
  };

  const handleBatchExport = () => {
    const selected = notes.filter(n => selectedIds.has(n.id));
    const jsonStr = JSON.stringify(selected.map(n => ({
      id: n.id, title: n.title, content: n.content, summary: n.summary,
      keyPoints: n.keyPoints, actionItems: n.actionItems, tags: n.tags,
      mode: n.mode, duration: n.duration, segments: n.segments,
      speakerCount: n.speakerCount, language: n.language,
      createdAt: n.createdAt, updatedAt: n.updatedAt,
    })), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicemind-export-${selected.length}notes.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const notesToImport = Array.isArray(data) ? data : [data];
      let count = 0;
      for (const raw of notesToImport) {
        if (!raw.id || !raw.title) continue;
        const existing = notes.find(n => n.id === raw.id);
        if (existing) continue; // skip duplicates
        const note: Note = {
          id: raw.id,
          title: raw.title,
          content: raw.content || '',
          summary: raw.summary || '',
          keyPoints: raw.keyPoints || [],
          actionItems: raw.actionItems || [],
          tags: raw.tags || [],
          mode: raw.mode || 'thoughts',
          duration: raw.duration || 0,
          segments: raw.segments || [],
          speakerCount: raw.speakerCount || 0,
          language: raw.language || 'zh',
          createdAt: new Date(raw.createdAt),
          updatedAt: new Date(raw.updatedAt || raw.createdAt),
          isProcessing: false,
        };
        addNote(note);
        count++;
      }
      setImportStatus(`✅ 成功导入 ${count} 条笔记${notesToImport.length - count > 0 ? `（跳过 ${notesToImport.length - count} 条重复）` : ''}`);
      setTimeout(() => setImportStatus(null), 4000);
    } catch {
      setImportStatus('❌ 导入失败：文件格式不正确');
      setTimeout(() => setImportStatus(null), 3000);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
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
          {/* Import */}
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-[var(--color-bg-card)] border border-white/8 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer"
            title="导入 JSON 笔记"
          >
            <Upload className="w-4 h-4" />
          </button>
          {/* Batch Mode Toggle */}
          {notes.length > 0 && (
            <button
              onClick={batchMode ? exitBatchMode : () => setBatchMode(true)}
              className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                batchMode
                  ? 'bg-[var(--color-primary)] text-black'
                  : 'bg-[var(--color-bg-card)] border border-white/8 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {batchMode ? '退出选择' : '批量操作'}
            </button>
          )}
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

      {/* Import Status Toast */}
      {importStatus && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-white/10 text-sm text-[var(--color-text-primary)] animate-fadeIn">
          {importStatus}
        </div>
      )}

      {/* Batch Action Bar */}
      {batchMode && (
        <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-[var(--color-primary)] cursor-pointer hover:brightness-125">
              {selectedIds.size === filteredNotes.length && filteredNotes.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size === filteredNotes.length ? '取消全选' : '全选'}
            </button>
            <span className="text-xs text-[var(--color-text-tertiary)]">已选 {selectedIds.size} 项</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchExport}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-tag-blue)]/20 text-[var(--color-tag-blue)] hover:bg-[var(--color-tag-blue)]/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" /> 导出 JSON
            </button>
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-error)]/15 text-[var(--color-error)] hover:bg-[var(--color-error)]/25 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" /> 删除
            </button>
          </div>
        </div>
      )}

      {/* Tag Filters */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {tagFilters.map((tag) => {
          const isActive = activeTagFilter === tag.id;
          const config = tag.id !== 'all' ? tagConfig[tag.id] : null;
          return (
            <button
              key={tag.id}
              onClick={() => setActiveTagFilter(tag.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-black shadow-sm'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-white/8'
              }`}
              style={isActive ? {
                backgroundColor: config ? config.color : 'var(--color-primary)',
              } : undefined}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-tertiary)]">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-[var(--color-primary)] opacity-40" />
          </div>
          <p className="text-lg font-medium text-[var(--color-text-primary)]">
            {searchQuery ? '没有找到匹配的笔记' : '思想库为空'}
          </p>
          <p className="text-sm mt-2 max-w-sm text-center">
            {searchQuery ? `没有匹配「${searchQuery}」的笔记，试试其他关键词` : '录音或上传音频文件，AI 将自动转录并提炼要点'}
          </p>
          {!searchQuery && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-black font-semibold rounded-xl hover:opacity-90 transition-colors cursor-pointer text-sm"
              >
                🎙️ 去录音
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-[var(--color-bg-card)] border border-white/10 text-[var(--color-text-secondary)] font-medium rounded-xl hover:bg-white/8 transition-colors cursor-pointer text-sm flex items-center gap-2"
              >
                <FileJson className="w-4 h-4" /> 导入 JSON
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const tag = note.tags[0];
            const config = tag ? tagConfig[tag] : null;
            const isSelected = selectedIds.has(note.id);
            return (
              <div key={note.id} className={`card p-5 text-left cursor-pointer group relative transition-all ${isSelected ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/5' : ''}`}>
                {/* Batch Select Checkbox */}
                {batchMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(note.id); }}
                    className="absolute top-3 left-3 z-10 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-[var(--color-primary)]" />
                    ) : (
                      <Square className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                    )}
                  </button>
                )}
                {/* Delete Button (non-batch) */}
                {!batchMode && (
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
                )}

                {/* Clickable card body */}
                <div onClick={() => batchMode ? toggleSelect(note.id) : router.push(`/library/${note.id}`)}>
                  {/* Tag Badge */}
                  {config && (
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium mb-3 ${batchMode ? 'ml-7' : ''}`}
                      style={{ color: config.color, backgroundColor: config.bgColor }}
                    >
                      {config.label}
                    </span>
                  )}

                  <h3 className={`text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1 mb-2 ${batchMode && !config ? 'ml-7' : ''}`}>
                    {note.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                    {note.summary}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
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
                    <div className="flex items-center gap-2">
                      <span>{formatDate(note.createdAt)}</span>
                      {/* Sync Status */}
                      {note.syncStatus === 'synced' && <span title="已同步"><Cloud className="w-3 h-3 text-[var(--color-success)]" /></span>}
                      {note.syncStatus === 'syncing' && <span title="同步中"><Loader2 className="w-3 h-3 text-[var(--color-primary)] animate-spin" /></span>}
                      {note.syncStatus === 'failed' && <span title="同步失败"><CloudOff className="w-3 h-3 text-[var(--color-error)]" /></span>}
                      {note.syncStatus === 'local' && <span title="仅本地"><CloudOff className="w-3 h-3 opacity-30" /></span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
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
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:bg-white/10 transition-colors cursor-pointer">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--color-error)] hover:brightness-110 transition-all cursor-pointer">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Modal */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBatchDeleteConfirm(false)} />
          <div className="relative card p-6 w-full max-w-sm border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)]">批量删除</h3>
                <p className="text-xs text-[var(--color-text-tertiary)]">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              确定要删除选中的 <span className="text-[var(--color-error)] font-bold">{selectedIds.size}</span> 条笔记吗？相关录音文件和 AI 摘要都将被永久删除。
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowBatchDeleteConfirm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] hover:bg-white/10 transition-colors cursor-pointer">取消</button>
              <button onClick={handleBatchDelete} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[var(--color-error)] hover:brightness-110 transition-all cursor-pointer">删除 {selectedIds.size} 条</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
