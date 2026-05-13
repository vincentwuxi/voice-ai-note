'use client';

import { useState, useEffect } from 'react';
import { Pencil, Plus, Trash2, Square, CheckSquare, RefreshCw, Loader2 } from 'lucide-react';
import { useAppStore, AI_TEMPLATES, AITemplate } from '@/store/app-store';
import type { Note } from '@/store/types';

interface NoteEditorProps {
  note: Note;
  noteId: string;
  isEditing: boolean;
}

/**
 * NoteEditor — Handles AI summary display/edit, key points, action items,
 * and re-summarization via LLM template selector.
 */
export default function NoteEditor({ note, noteId, isEditing }: NoteEditorProps) {
  const { updateNote } = useAppStore();

  // Edit state
  const [editSummary, setEditSummary] = useState('');
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>([]);
  const [editActionItems, setEditActionItems] = useState<string[]>([]);

  // Resummarize state
  const [isResummarizing, setIsResummarizing] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Todo state
  const [completedTodos, setCompletedTodos] = useState<Set<number>>(new Set());
  const [todosInitialized, setTodosInitialized] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Initialize editing values when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditSummary(note.summary);
      setEditKeyPoints([...note.keyPoints]);
      setEditActionItems([...note.actionItems]);
    }
  }, [isEditing, note.summary, note.keyPoints, note.actionItems]);

  // Initialize todos from persisted data
  useEffect(() => {
    if (note && !todosInitialized) {
      setCompletedTodos(new Set(note.completedTodos || []));
      setTodosInitialized(true);
    }
  }, [note, todosInitialized]);

  // Save edits (called by parent)
  useEffect(() => {
    // Expose current edit values for parent save button
    const el = document.getElementById(`note-editor-${noteId}`);
    if (el) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any).__getEdits = () => ({
        summary: editSummary,
        keyPoints: editKeyPoints.filter(p => p.trim()),
        actionItems: editActionItems.filter(a => a.trim()),
      });
    }
  }, [editSummary, editKeyPoints, editActionItems, noteId]);

  const resummarize = async (template: AITemplate) => {
    setShowTemplateSelector(false);
    if (!note || !note.content) return;
    setIsResummarizing(true);
    try {
      const { summarizeWithLLM } = await import('@/services/ai-service');
      const { getSharedLLMConfig } = await import('@/services/shared-config');
      const llmConfig = await getSharedLLMConfig();
      if (!llmConfig.apiEndpoint || !llmConfig.apiKey) {
        setFeedback({ text: '⚙️ 请先在管理后台配置 LLM API 密钥', type: 'error' });
        setTimeout(() => setFeedback(null), 4000);
        setIsResummarizing(false);
        return;
      }
      const result = await summarizeWithLLM(
        note.content, template, llmConfig.apiEndpoint, llmConfig.apiKey, llmConfig.selectedModel
      );
      updateNote(noteId, {
        title: result.title,
        summary: result.summary,
        keyPoints: result.keyPoints,
        actionItems: result.actionItems,
        updatedAt: new Date(),
      });
    } catch (err) {
      setFeedback({ text: `❌ 重新摘要失败: ${err instanceof Error ? err.message : '未知错误'}`, type: 'error' });
      setTimeout(() => setFeedback(null), 5000);
    }
    setIsResummarizing(false);
  };

  const toggleTodo = (i: number) => {
    const next = new Set(completedTodos);
    if (completedTodos.has(i)) next.delete(i); else next.add(i);
    setCompletedTodos(next);
    updateNote(noteId, { completedTodos: Array.from(next) });
  };

  return (
    <>
      <div id={`note-editor-${noteId}`} className="hidden" />

      {/* Inline feedback */}
      {feedback && (
        <div className={`mb-3 px-4 py-2 rounded-xl text-xs font-medium ${
          feedback.type === 'error'
            ? 'bg-[var(--color-error)]/15 text-[var(--color-error)]'
            : 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
        }`}>
          {feedback.text}
        </div>
      )}

      {/* Summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
            <Pencil className="w-4 h-4" /> AI 摘要
          </h2>
          {!isEditing && (
            <div className="relative">
              <button
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                disabled={isResummarizing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-surface)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer disabled:opacity-50"
                title="重新生成 AI 摘要"
              >
                {isResummarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                {isResummarizing ? '生成中...' : '重新摘要'}
              </button>
              {showTemplateSelector && (
                <div className="absolute right-0 top-full mt-1 w-40 card p-1.5 z-50 shadow-xl border border-white/10">
                  {(Object.entries(AI_TEMPLATES) as [AITemplate, { label: string; icon: string }][]).map(([key, tmpl]) => (
                    <button
                      key={key}
                      onClick={() => resummarize(key)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] cursor-pointer transition-colors"
                    >
                      <span>{tmpl.icon}</span> {tmpl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {isEditing ? (
          <textarea
            value={editSummary}
            onChange={e => setEditSummary(e.target.value)}
            rows={3}
            className="w-full text-sm text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-surface)] rounded-lg p-3 border border-white/10 focus:border-[var(--color-primary)]/50 outline-none resize-none"
          />
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{note.summary}</p>
        )}
      </div>

      {/* Key Points */}
      {note.keyPoints.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">📌 关键要点</h2>
          {isEditing ? (
            <div className="space-y-2">
              {editKeyPoints.map((point, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={point}
                    onChange={e => {
                      const next = [...editKeyPoints];
                      next[i] = e.target.value;
                      setEditKeyPoints(next);
                    }}
                    className="flex-1 text-sm bg-[var(--color-bg-surface)] rounded-lg px-3 py-2 border border-white/10 focus:border-[var(--color-primary)]/50 outline-none text-[var(--color-text-secondary)]"
                  />
                  <button onClick={() => setEditKeyPoints(editKeyPoints.filter((_, j) => j !== i))} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditKeyPoints([...editKeyPoints, ''])}
                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:brightness-125 cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> 添加要点
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {note.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Items */}
      {note.actionItems.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">☑️ 待办事项</h2>
          {isEditing ? (
            <div className="space-y-2">
              {editActionItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={e => {
                      const next = [...editActionItems];
                      next[i] = e.target.value;
                      setEditActionItems(next);
                    }}
                    className="flex-1 text-sm bg-[var(--color-bg-surface)] rounded-lg px-3 py-2 border border-white/10 focus:border-[var(--color-primary)]/50 outline-none text-[var(--color-text-secondary)]"
                  />
                  <button onClick={() => setEditActionItems(editActionItems.filter((_, j) => j !== i))} className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditActionItems([...editActionItems, ''])}
                className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:brightness-125 cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> 添加待办
              </button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {note.actionItems.map((item, i) => {
                const done = completedTodos.has(i);
                return (
                  <li
                    key={i}
                    onClick={() => toggleTodo(i)}
                    className={`flex items-center gap-2.5 text-sm cursor-pointer transition-all ${done ? 'text-[var(--color-text-tertiary)] line-through opacity-60' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                  >
                    {done ? (
                      <CheckSquare className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                    )}
                    {item}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Helper: Get current edit values from NoteEditor.
 * Usage: const edits = getNoteEditorEdits('noteId');
 */
export function getNoteEditorEdits(noteId: string): { summary: string; keyPoints: string[]; actionItems: string[] } | null {
  const el = document.getElementById(`note-editor-${noteId}`) as HTMLElement | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (el && (el as any).__getEdits) { return (el as any).__getEdits(); }
  return null;
}
