'use client';

import { use, useState, useEffect } from 'react';
import { Mic, Clock, Users, CheckSquare, Square, ArrowLeft, AlertTriangle, Sparkles } from 'lucide-react';

interface SharedNote {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: string[];
  mode: string;
  duration: number;
  segments: { start: number; end: number; text: string; speaker?: string }[];
  speakerCount: number;
  language: string;
  createdAt: string;
}

const modeLabels: Record<string, string> = {
  thoughts: '随想',
  meeting: '会议',
  lecture: '讲座',
  interview: '访谈',
  journal: '日记',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [note, setNote] = useState<SharedNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${id}`)
      .then(res => {
        if (res.status === 404) throw new Error('分享链接不存在');
        if (res.status === 410) throw new Error('分享链接已过期');
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(data => {
        setNote(data.note);
        setExpiresAt(data.expiresAt);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0E] flex items-center justify-center">
        <div className="animate-pulse text-[#F5A623] text-lg">加载中...</div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-[#0D0D0E] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400 opacity-60" />
          <h1 className="text-xl font-bold text-white mb-2">{error || '未找到笔记'}</h1>
          <p className="text-sm text-gray-400">请确认分享链接是否正确，或联系分享者重新生成</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0E] text-white">
      {/* Header */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center">
            <Mic className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm text-gray-400">VoiceMind 分享笔记</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-bold mt-4 mb-3">{note.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-6">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(note.duration)}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#F5A623]/15 text-[#F5A623] font-medium">
            {modeLabels[note.mode] || note.mode}
          </span>
          {note.speakerCount > 1 && (
            <span className="flex items-center gap-1 text-blue-400">
              <Users className="w-3.5 h-3.5" /> {note.speakerCount} 人
            </span>
          )}
          <span>
            {new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(note.createdAt))}
          </span>
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-white/5 border border-white/8 p-5 mb-6">
          <h2 className="text-sm font-semibold mb-2 text-[#F5A623]">📝 摘要</h2>
          <p className="text-sm text-gray-300 leading-relaxed">{note.summary}</p>
        </div>

        {/* Key Points */}
        {note.keyPoints.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/8 p-5 mb-6">
            <h2 className="text-sm font-semibold mb-3 text-[#F5A623]">💡 关键要点</h2>
            <ul className="space-y-2.5">
              {note.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <Sparkles className="w-4 h-4 text-[#F5A623] mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {note.actionItems.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/8 p-5 mb-6">
            <h2 className="text-sm font-semibold mb-3 text-[#F5A623]">☑️ 待办事项</h2>
            <ul className="space-y-2.5">
              {note.actionItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Square className="w-4 h-4 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transcript */}
        {note.segments.length > 0 && (
          <div className="rounded-xl bg-white/5 border border-white/8 p-5 mb-6">
            <h2 className="text-sm font-semibold mb-3 text-[#F5A623]">🗣️ 转录内容</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {note.segments.map((seg, i) => (
                <div key={i} className="text-sm">
                  {seg.speaker && (
                    <span className="text-xs text-blue-400 font-medium mr-2">{seg.speaker}</span>
                  )}
                  <span className="text-gray-300">{seg.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 border-t border-white/5 mt-8">
          <p className="text-xs text-gray-500">
            由 <span className="text-[#F5A623]">VoiceMind</span> 生成
            {expiresAt && ` · 有效期至 ${new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(expiresAt))}`}
          </p>
        </div>
      </div>
    </div>
  );
}
