/**
 * Shared domain types for VoiceMind store.
 * Single source of truth for Note, RecordingMode, NoteTag, and sync types.
 */

export type RecordingMode = 'thoughts' | 'meeting' | 'lecture' | 'interview' | 'journal';
export type NoteTag = 'inspiration' | 'project' | 'personal' | 'reading' | 'design';
export type AITemplate = 'meeting' | 'reading' | 'brainstorm' | 'interview' | 'journal' | 'auto';
export type SyncStatus = 'synced' | 'syncing' | 'failed' | 'local';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  translatedContent?: string;
  translatedSegments?: TranscriptSegment[];
  targetLanguage?: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: NoteTag[];
  mode: RecordingMode;
  duration: number;
  audioUrl?: string;
  segments: TranscriptSegment[];
  speakerCount: number;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
  isProcessing: boolean;
  syncStatus?: SyncStatus;
  completedTodos?: number[];
}
