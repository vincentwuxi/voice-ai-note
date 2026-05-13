/**
 * Shared constants used across VoiceMind components.
 * Single source of truth — avoids duplication across pages.
 */

import type { NoteTag, RecordingMode } from '@/store/app-store';

// ── Language Names (used in translation features) ──

export const LANGUAGE_NAMES: Record<string, string> = {
  'zh': '中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'it': 'Italiano',
  'pt': 'Português',
  'ru': 'Русский',
  'ar': 'العربية',
};

// ── Speech Recognition Languages ──

export const SPEECH_LANGUAGES = [
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', label: '한국어', flag: '🇰🇷' },
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr-FR', label: 'Français', flag: '🇫🇷' },
] as const;

// ── Tag Configuration ──

export interface TagConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const TAG_CONFIG: Record<NoteTag, TagConfig> = {
  inspiration: { label: '灵感', color: 'var(--color-tag-amber)', bgColor: 'rgba(245, 158, 11, 0.15)' },
  project: { label: '项目', color: 'var(--color-tag-blue)', bgColor: 'rgba(59, 130, 246, 0.15)' },
  personal: { label: '个人', color: 'var(--color-tag-emerald)', bgColor: 'rgba(16, 185, 129, 0.15)' },
  reading: { label: '阅读', color: 'var(--color-tag-indigo)', bgColor: 'rgba(99, 102, 241, 0.15)' },
  design: { label: '设计', color: 'var(--color-tag-purple)', bgColor: 'rgba(139, 92, 246, 0.15)' },
};

// ── Tag Filters ──

export const TAG_FILTERS: { id: NoteTag | 'all'; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'inspiration', label: '灵感' },
  { id: 'project', label: '项目' },
  { id: 'personal', label: '个人' },
  { id: 'reading', label: '阅读' },
  { id: 'design', label: '设计' },
];

// ── Recording Modes ──

export const RECORDING_MODES: { id: RecordingMode; label: string; sublabel: string }[] = [
  { id: 'thoughts', label: '所思所想', sublabel: 'Thoughts' },
  { id: 'meeting', label: '会议模式', sublabel: 'Meeting' },
  { id: 'lecture', label: '讲座/阅读', sublabel: 'Lecture' },
  { id: 'interview', label: '访谈', sublabel: 'Interview' },
  { id: 'journal', label: '日记', sublabel: 'Journal' },
];

// ── Mode Filters (for library page) ──

export type ModeFilter = 'all' | RecordingMode;

export const MODE_FILTERS: { id: ModeFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'meeting', label: '💼 会议' },
  { id: 'interview', label: '🎤 访谈' },
  { id: 'thoughts', label: '💡 灵感' },
  { id: 'lecture', label: '📚 讲座' },
  { id: 'journal', label: '📓 日记' },
];

// ── Formatting Utilities ──

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(date);
}

export function formatRecordingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
