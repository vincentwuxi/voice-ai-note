'use client';

import { useState } from 'react';
import { Check, Edit3 } from 'lucide-react';
import { TranscriptSegment, useAppStore } from '@/store/app-store';

const speakerColors = [
  { text: '#F5A623', bg: 'rgba(245, 166, 35, 0.1)', border: 'rgba(245, 166, 35, 0.2)' },
  { text: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
  { text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' },
  { text: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)' },
  { text: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' },
];

function getSpeakerIndex(speaker: string): number {
  return parseInt(speaker.replace('SPEAKER_', '')) || 0;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface SpeakerSegmentViewProps {
  segments: TranscriptSegment[];
  noteId: string;
  speakerNames: Record<string, string>;
  onSeek: (time: number) => void;
  currentTime: number;
}

export default function SpeakerSegmentView({
  segments, noteId, speakerNames, onSeek, currentTime,
}: SpeakerSegmentViewProps) {
  const { setSpeakerName } = useAppStore();
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const groups: { speaker: string; segments: TranscriptSegment[] }[] = [];
  let currentGroup: { speaker: string; segments: TranscriptSegment[] } | null = null;
  for (const seg of segments) {
    const speaker = seg.speaker || 'SPEAKER_00';
    if (!currentGroup || currentGroup.speaker !== speaker) {
      currentGroup = { speaker, segments: [seg] };
      groups.push(currentGroup);
    } else {
      currentGroup.segments.push(seg);
    }
  }

  const startEdit = (speakerKey: string, currentName: string) => {
    setEditingSpeaker(speakerKey);
    setEditValue(currentName);
  };

  const confirmEdit = (speakerKey: string) => {
    if (editValue.trim()) {
      setSpeakerName(noteId, speakerKey, editValue.trim());
    }
    setEditingSpeaker(null);
  };

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const idx = getSpeakerIndex(group.speaker);
        const color = speakerColors[idx % speakerColors.length];
        const customName = speakerNames[group.speaker];
        const defaultName = `说话人 ${idx + 1}`;
        const label = customName || defaultName;
        const startTime = group.segments[0].start;
        const endTime = group.segments[group.segments.length - 1].end;
        const text = group.segments.map(s => s.text).join('');
        const isActiveGroup = currentTime > 0 && currentTime >= startTime && currentTime < endTime;

        return (
          <div
            key={gi}
            id={`seg-group-${gi}`}
            className={`rounded-xl p-4 transition-all duration-300 cursor-pointer ${
              isActiveGroup ? 'ring-1 ring-[var(--color-primary)]/50 brightness-125' : 'hover:brightness-110'
            }`}
            style={{ backgroundColor: color.bg, borderLeft: `3px solid ${isActiveGroup ? 'var(--color-primary)' : color.border}` }}
            onClick={() => onSeek(startTime)}
          >
            <div className="flex items-center gap-2 mb-2">
              {editingSpeaker === group.speaker ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit(group.speaker)}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/20 border border-white/10 w-24 focus:outline-none"
                    style={{ color: color.text }}
                    autoFocus
                  />
                  <button
                    onClick={() => confirmEdit(group.speaker)}
                    className="p-0.5 rounded-full hover:bg-white/10"
                  >
                    <Check className="w-3 h-3" style={{ color: color.text }} />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:brightness-125 transition-all"
                  style={{ color: color.text, backgroundColor: color.border }}
                  onClick={(e) => { e.stopPropagation(); startEdit(group.speaker, label); }}
                >
                  {label}
                  <Edit3 className="w-2.5 h-2.5 opacity-60" />
                </button>
              )}
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {formatTimestamp(startTime)}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{text}</p>
          </div>
        );
      })}
    </div>
  );
}

export { speakerColors, getSpeakerIndex, formatTimestamp };
