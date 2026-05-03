'use client';

import { useMemo, useState, useCallback } from 'react';
import { useAppStore, NoteTag } from '@/store/app-store';
import { Sparkles, ArrowRight, Lightbulb, TrendingUp, Link2, BarChart3, Brain, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

const tagConfig: Record<NoteTag, { label: string; color: string }> = {
  inspiration: { label: '灵感', color: 'var(--color-tag-amber)' },
  project: { label: '项目', color: 'var(--color-tag-blue)' },
  personal: { label: '个人', color: 'var(--color-tag-emerald)' },
  reading: { label: '阅读', color: 'var(--color-tag-indigo)' },
  design: { label: '设计', color: 'var(--color-tag-purple)' },
};

// Stop words to filter out meaningless matches
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她', '它', '们', '我们', '你们', '他们', '什么', '怎么', '这个', '那个', '可以', '没有', '一些', '比较', '如果', '因为', '所以', '但是', '然后', '已经', '可能', '需要', '应该', '关于', '通过', '进行', '使用', '以及', '或者', '其中', '主要', '目前', '方面', '情况',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'and', 'but', 'or', 'not', 'this', 'that', 'it', 'its',
]);

// Extract meaningful phrases from keyPoints and title (much better than character splitting)
function extractPhrases(texts: string[]): Set<string> {
  const phrases = new Set<string>();
  for (const text of texts) {
    // Split by punctuation and connectives
    const parts = text.replace(/[，。、！？：；""''（）【】\[\](){}·\-—]/g, '|').split('|');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length >= 2 && trimmed.length <= 12 && !STOP_WORDS.has(trimmed)) {
        phrases.add(trimmed.toLowerCase());
      }
    }
  }
  return phrases;
}

interface AIInsight {
  connections: { noteA: string; noteB: string; reason: string }[];
  suggestions: string[];
}

export default function InspirationPage() {
  const { notes } = useAppStore();
  const router = useRouter();
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Recent notes (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentNotes = useMemo(() =>
    notes.filter(n => new Date(n.createdAt).getTime() > sevenDaysAgo).slice(0, 5),
    [notes, sevenDaysAgo]
  );

  // Phrase-based connections (much better than single character matching)
  const connections = useMemo(() => {
    if (notes.length < 2) return [];
    const pairs: { a: typeof notes[0]; b: typeof notes[0]; score: number; sharedPhrases: string[] }[] = [];

    // No limit on notes scanned
    const limit = Math.min(notes.length, 50);
    for (let i = 0; i < limit; i++) {
      for (let j = i + 1; j < limit; j++) {
        const a = notes[i];
        const b = notes[j];
        const phrasesA = extractPhrases([...a.keyPoints, a.title]);
        const phrasesB = extractPhrases([...b.keyPoints, b.title]);
        const shared: string[] = [];
        for (const p of phrasesA) {
          if (phrasesB.has(p)) shared.push(p);
        }

        if (shared.length >= 1) {
          pairs.push({ a, b, score: shared.length, sharedPhrases: shared.slice(0, 5) });
        }
      }
    }

    return pairs.sort((x, y) => y.score - x.score).slice(0, 6);
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

  // AI Deep Analysis
  const runAIAnalysis = useCallback(async () => {
    if (notes.length < 2) return;
    setAiLoading(true);
    try {
      const configRes = await fetch('/api/llm-config');
      if (!configRes.ok) throw new Error('Config unavailable');
      const { config } = await configRes.json();
      if (!config.apiKey || !config.apiEndpoint) throw new Error('LLM not configured');

      const noteSummaries = notes.slice(0, 20).map((n, i) =>
        `[${i + 1}] "${n.title}" — ${n.summary || n.keyPoints.join('；')}`
      ).join('\n');

      const res = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.selectedModel || 'gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `你是一位创意思维教练。以下是用户的 ${notes.length} 条语音笔记摘要：

${noteSummaries}

请分析这些笔记之间的深层联系，找出跨领域的灵感碰撞。返回 JSON：
{
  "connections": [
    {"noteA": "笔记标题A", "noteB": "笔记标题B", "reason": "关联原因（1-2句话）"}
  ],
  "suggestions": ["基于这些笔记的创意建议或行动方向（2-3条）"]
}
只返回 JSON，不要其他内容。`,
          }],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setAiInsight(JSON.parse(jsonMatch[0]));
      }
    } catch (err) {
      console.warn('[AI Insight]', err);
    }
    setAiLoading(false);
  }, [notes]);

  // Older notes for "revisit" section
  const recentIds = new Set(recentNotes.map(n => n.id));
  const olderNotes = notes.filter(n => !recentIds.has(n.id)).slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-[var(--color-primary)]" />
          灵感库
        </h1>
        {notes.length >= 2 && (
          <button
            onClick={runAIAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-tag-amber)] text-black font-semibold rounded-xl hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 text-sm"
          >
            {aiLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> AI 分析中...</>
            ) : (
              <><Brain className="w-4 h-4" /> AI 深度分析</>
            )}
          </button>
        )}
      </div>

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

      {/* AI Insights (if available) */}
      {aiInsight && (
        <div className="card p-6 mb-6 border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold">AI 洞察</h2>
            </div>
            <button
              onClick={runAIAnalysis}
              disabled={aiLoading}
              className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* AI Connections */}
          {aiInsight.connections?.length > 0 && (
            <div className="space-y-3 mb-4">
              {aiInsight.connections.slice(0, 4).map((conn, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--color-bg-surface)]">
                  <p className="text-sm text-[var(--color-text-primary)] font-medium">
                    「{conn.noteA}」↔「{conn.noteB}」
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{conn.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestions */}
          {aiInsight.suggestions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] mb-2">💡 创意建议</h3>
              <ul className="space-y-1.5">
                {aiInsight.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-[var(--color-text-secondary)] pl-4 relative before:absolute before:left-0 before:content-['•'] before:text-[var(--color-primary)]">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

      {/* Revisit Older Notes */}
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

      {/* Phrase-Based Connections */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-[var(--color-tag-indigo)]" />
          <h2 className="text-lg font-semibold">思维碰撞</h2>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">
          基于笔记要点短语匹配发现的关联（点击「AI 深度分析」获取更精准的 LLM 洞察）
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
                    {conn.score >= 3 ? '高关联度' : conn.score >= 2 ? '中关联度' : '可能相关'}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-primary)]">
                  「{conn.a.title.slice(0, 15)}」↔「{conn.b.title.slice(0, 15)}」
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  共享要点：{conn.sharedPhrases.join('、')}
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

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-[var(--color-primary)] opacity-30" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">开始积累灵感</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-md mx-auto">
            录音或上传音频，AI 会自动提炼要点。积累 2 条以上笔记后，这里会自动发现笔记间的隐藏关联和灵感碰撞。
          </p>
        </div>
      )}
    </div>
  );
}
