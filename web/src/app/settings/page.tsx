'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Key, Bot, Check, Loader2, AudioLines, Shield, Lock } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

export default function SettingsPage() {
  const { whisperxEndpoint, setWhisperxEndpoint, asrEngine, qwenAsrEndpoint, setQwenAsrEndpoint } = useAppStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [sharedConfig, setSharedConfig] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(true);
  const [isTestingWx, setIsTestingWx] = useState(false);
  const [wxTestResult, setWxTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.config) setSharedConfig(data.config);
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  const isProxyMode = whisperxEndpoint.startsWith('/');

  const testWhisperX = async () => {
    if (!whisperxEndpoint) { setWxTestResult('error'); return; }
    setIsTestingWx(true);
    setWxTestResult(null);
    try {
      const res = await fetch(whisperxEndpoint, { method: 'GET' });
      const data = isProxyMode ? await res.json().catch(() => null) : null;
      const ok = isProxyMode ? (data?.status === 'ok') : (res.ok || res.status === 404 || res.status === 405);
      setWxTestResult(ok ? 'success' : 'error');
    } catch { setWxTestResult('error'); }
    finally { setIsTestingWx(false); }
  };

  const inputClass = "w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-white/8 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/40 transition-colors";
  const readOnlyClass = "w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-white/6 rounded-xl text-sm text-[var(--color-text-secondary)] cursor-not-allowed";

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-[var(--color-primary)]" />
        设置
      </h1>

      {/* ASR Configuration */}
      <div className="card p-6 space-y-6 mb-6">
        <div className="flex items-center gap-2">
          <AudioLines className="w-5 h-5 text-[var(--color-tag-emerald)]" />
          <h2 className="text-lg font-semibold">语音识别引擎</h2>
        </div>

        {/* Active Engine Badge */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            asrEngine === 'qwen3'
              ? 'bg-[var(--color-tag-indigo)]/15 text-[var(--color-tag-indigo)]'
              : 'bg-[var(--color-tag-emerald)]/15 text-[var(--color-tag-emerald)]'
          }`}>
            {asrEngine === 'qwen3' ? '⚡ Qwen3-ASR-1.7B' : '🎯 WhisperX'}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {asrEngine === 'qwen3'
              ? '52 语言 · 高精度 · 歌声识别'
              : '说话人分离 · 词级时间戳 · 稳定可靠'}
          </span>
        </div>

        {isProxyMode && asrEngine === 'whisperx' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-tag-emerald)]/10 text-xs text-[var(--color-tag-emerald)]">
            <Shield className="w-3.5 h-3.5" />
            <span>安全代理模式：音频通过 Cloudflare Tunnel 加密传输</span>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            <Server className="w-4 h-4" />
            {asrEngine === 'qwen3' ? 'Qwen3-ASR 端点' : 'WhisperX 端点'}
          </label>
          <input
            type="url"
            value={asrEngine === 'qwen3' ? qwenAsrEndpoint : whisperxEndpoint}
            onChange={(e) => asrEngine === 'qwen3' ? setQwenAsrEndpoint(e.target.value) : setWhisperxEndpoint(e.target.value)}
            placeholder={asrEngine === 'qwen3' ? '/api/transcribe-qwen' : '/api/transcribe'}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={testWhisperX}
            disabled={isTestingWx}
            className="px-6 py-3 bg-[var(--color-tag-emerald)] text-black font-semibold rounded-xl hover:opacity-90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingWx ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />测试中...</span>
            ) : '测试连接'}
          </button>
          {wxTestResult === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-success)]"><Check className="w-4 h-4" />服务可用</span>
          )}
          {wxTestResult === 'error' && (
            <span className="text-sm text-[var(--color-error)]">无法连接 ASR 服务</span>
          )}
        </div>

        <p className="text-xs text-[var(--color-text-tertiary)]">
          💡 切换引擎请前往「管理后台 → 配置」
        </p>
      </div>

      {/* Shared LLM Config (read-only for non-admin) */}
      <div className="card p-6 space-y-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--color-tag-indigo)]" />
            <h2 className="text-lg font-semibold">LLM 智能摘要</h2>
          </div>
          {!isAdmin && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
              <Lock className="w-3 h-3" /> 由管理员配置
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)] -mt-3">
          {isAdmin ? '前往管理后台修改配置' : '以下配置由管理员统一管理，所有用户共享'}
        </p>

        {configLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : (
          <>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                <Server className="w-4 h-4" /> API 端点
              </label>
              <input
                type="text"
                value={sharedConfig.apiEndpoint || '未配置'}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                <Key className="w-4 h-4" /> API 密钥
              </label>
              <div className={`${readOnlyClass} flex items-center gap-2`}>
                {sharedConfig.apiKey ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
                    <span>{sharedConfig.apiKey.slice(0, 4)}{'•'.repeat(16)}{sharedConfig.apiKey.slice(-4)}</span>
                  </>
                ) : (
                  <span className="text-[var(--color-error)]">未配置</span>
                )}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                <Bot className="w-4 h-4" /> 模型
              </label>
              <input
                type="text"
                value={sharedConfig.selectedModel || '未配置'}
                readOnly
                className={readOnlyClass}
              />
            </div>
          </>
        )}
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3">关于</h2>
        <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p><strong className="text-[var(--color-text-primary)]">灵思 VoiceMind</strong> Web v2.0.0</p>
          <p>用声音捕捉灵感，用 AI 构建知识库</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">WhisperX 转录 + 说话人分离 · LLM 智能摘要 · 多用户</p>
          <p className="text-[var(--color-text-tertiary)]">© 2026 VoiceMind. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
