'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Server, Key, Bot, Check, Loader2, AudioLines, Shield } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

export default function SettingsPage() {
  const {
    apiEndpoint, apiKey, selectedModel, whisperxEndpoint,
    setApiEndpoint, setApiKey, setSelectedModel, setWhisperxEndpoint,
  } = useAppStore();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [isTestingWx, setIsTestingWx] = useState(false);
  const [wxTestResult, setWxTestResult] = useState<'success' | 'error' | null>(null);

  const testLLMConnection = async () => {
    if (!apiEndpoint || !apiKey) { setTestResult('error'); return; }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${apiEndpoint}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      setTestResult(res.ok ? 'success' : 'error');
    } catch { setTestResult('error'); }
    finally { setIsTesting(false); }
  };

  const isProxyMode = whisperxEndpoint.startsWith('/');

  const testWhisperX = async () => {
    if (!whisperxEndpoint) { setWxTestResult('error'); return; }
    setIsTestingWx(true);
    setWxTestResult(null);
    try {
      const testUrl = isProxyMode ? whisperxEndpoint : whisperxEndpoint;
      const res = await fetch(testUrl, { method: 'GET' });
      const data = isProxyMode ? await res.json().catch(() => null) : null;
      const ok = isProxyMode
        ? (data?.status === 'ok')
        : (res.ok || res.status === 404 || res.status === 405);
      setWxTestResult(ok ? 'success' : 'error');
    } catch { setWxTestResult('error'); }
    finally { setIsTestingWx(false); }
  };

  const inputClass = "w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-white/8 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/40 transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-[var(--color-primary)]" />
        设置
      </h1>

      {/* WhisperX Configuration */}
      <div className="card p-6 space-y-6 mb-6">
        <div className="flex items-center gap-2">
          <AudioLines className="w-5 h-5 text-[var(--color-tag-emerald)]" />
          <h2 className="text-lg font-semibold">WhisperX 语音识别</h2>
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)] -mt-3">
          语音转写 + 说话人分离（支持多人会议）
        </p>
        {isProxyMode && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-tag-emerald)]/10 text-xs text-[var(--color-tag-emerald)]">
            <Shield className="w-3.5 h-3.5" />
            <span>安全代理模式：音频通过 Cloudflare Tunnel 加密传输，WhisperX 未暴露公网</span>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            <Server className="w-4 h-4" />
            WhisperX 端点
          </label>
          <input
            type="url"
            value={whisperxEndpoint}
            onChange={(e) => setWhisperxEndpoint(e.target.value)}
            placeholder="http://100.67.209.116:9100"
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
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-success)]"><Check className="w-4 h-4" />WhisperX 可用</span>
          )}
          {wxTestResult === 'error' && (
            <span className="text-sm text-[var(--color-error)]">无法连接 WhisperX 服务</span>
          )}
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="card p-6 space-y-6 mb-6">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[var(--color-tag-indigo)]" />
          <h2 className="text-lg font-semibold">LLM 智能摘要</h2>
        </div>
        <p className="text-sm text-[var(--color-text-tertiary)] -mt-3">
          支持 Gemini / OpenAI 兼容接口，用于智能摘要和要点提取
        </p>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            <Server className="w-4 h-4" />
            API 端点
          </label>
          <input type="url" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)}
            placeholder="https://api.openai.com" className={inputClass} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            <Key className="w-4 h-4" />
            API 密钥
          </label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..." className={inputClass} />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            <Bot className="w-4 h-4" />
            模型
          </label>
          <input type="text" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="gemini-2.5-pro" className={inputClass} />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={testLLMConnection}
            disabled={isTesting}
            className="px-6 py-3 bg-[var(--color-primary)] text-black font-semibold rounded-xl hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />测试中...</span>
            ) : '测试连接'}
          </button>
          {testResult === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-success)]"><Check className="w-4 h-4" />连接成功</span>
          )}
          {testResult === 'error' && (
            <span className="text-sm text-[var(--color-error)]">连接失败，请检查配置</span>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-3">关于</h2>
        <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p><strong className="text-[var(--color-text-primary)]">灵思 VoiceMind</strong> Web v1.3.0</p>
          <p>用声音捕捉灵感，用 AI 构建知识库</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">WhisperX 转录 + 说话人分离 · LLM 智能摘要</p>
          <p className="text-[var(--color-text-tertiary)]">© 2026 VoiceMind. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
