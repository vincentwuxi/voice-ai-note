'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Server, Key, Bot, Check, Loader2, Users, Crown, Ban, UserCheck, RefreshCw, HardDrive, Upload, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  status: string;
  created_at: string;
  last_login: string;
}

interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  r2FreeTierBytes: number;
  perUser: { user_email: string; file_count: number; total_bytes: number }[];
  recentUploads: { id: string; user_email: string; filename: string; size_bytes: number; content_type: string; created_at: string }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [config, setConfig] = useState({
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: '',
    selectedModel: 'gemini-2.5-flash',
    whisperxEndpoint: '/api/transcribe',
    asrEngine: 'whisperx',
    qwenAsrEndpoint: '/api/transcribe-qwen',
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'users' | 'storage'>('config');
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageStats | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Redirect non-admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, router]);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch { /* ignore */ }
    setConfigLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch { /* ignore */ }
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
    loadUsers();
  }, [loadConfig, loadUsers]);

  const saveConfig = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaveResult(res.ok ? 'success' : 'error');
    } catch {
      setSaveResult('error');
    }
    setSaving(false);
  };

  const updateUser = async (userId: string, updates: { role?: string; status?: string }) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        loadUsers();
      }
    } catch { /* ignore */ }
  };

  const fetchModels = useCallback(async (endpoint?: string, key?: string) => {
    const ep = endpoint || config.apiEndpoint;
    const ak = key || config.apiKey;
    if (!ep || !ak) {
      setModelsError('请先填写 API 端点和密钥');
      return;
    }
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetch(`${ep}/models`, {
        headers: { Authorization: `Bearer ${ak}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      // OpenAI-compatible format: { data: [{ id: 'model-name' }, ...] }
      const ids: string[] = (data.data || [])
        .map((m: { id: string }) => m.id)
        .filter((id: string) => !id.includes('embedding') && !id.includes('imagen') && !id.includes('tts'))
        .sort();
      setModels(ids);
      if (ids.length === 0) setModelsError('未找到可用模型');
    } catch (err) {
      setModelsError(`获取模型列表失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
    setModelsLoading(false);
  }, [config.apiEndpoint, config.apiKey]);

  const loadStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      const res = await fetch('/api/admin/storage');
      if (res.ok) setStorage(await res.json());
    } catch { /* ignore */ }
    setStorageLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'storage' && !storage) loadStorage();
  }, [activeTab, storage, loadStorage]);

  if (!user || user.role !== 'admin') return null;

  const inputClass = "w-full px-4 py-3 bg-[var(--color-bg-surface)] border border-white/8 rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/40 transition-colors";

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-3xl lg:text-4xl font-bold mb-8 flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-[var(--color-primary)]" />
        管理后台
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-white/6 hover:border-white/15'
          }`}
        >
          <span className="flex items-center gap-2"><Bot className="w-4 h-4" /> AI 配置</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-white/6 hover:border-white/15'
          }`}
        >
          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> 用户管理 ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
              : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-white/6 hover:border-white/15'
          }`}
        >
          <span className="flex items-center gap-2"><HardDrive className="w-4 h-4" /> 存储</span>
        </button>
      </div>

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <Bot className="w-5 h-5 text-[var(--color-tag-indigo)]" /> 共享 LLM 配置
            </h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              管理员配置后，所有用户共享此 LLM 设置
            </p>
          </div>

          {configLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Server className="w-4 h-4" /> API 端点
                </label>
                <input
                  type="url"
                  value={config.apiEndpoint}
                  onChange={e => setConfig(c => ({ ...c, apiEndpoint: e.target.value }))}
                  placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
                  className={inputClass}
                />
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                  Google Gemini: https://generativelanguage.googleapis.com/v1beta/openai
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Key className="w-4 h-4" /> API 密钥
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                  placeholder="AIzaSy..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Bot className="w-4 h-4" /> 模型
                </label>
                <div className="flex gap-2">
                  {models.length > 0 ? (
                    <select
                      value={config.selectedModel}
                      onChange={e => setConfig(c => ({ ...c, selectedModel: e.target.value }))}
                      className={`${inputClass} cursor-pointer appearance-none`}
                    >
                      {!models.includes(config.selectedModel) && config.selectedModel && (
                        <option value={config.selectedModel}>{config.selectedModel}</option>
                      )}
                      {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={config.selectedModel}
                      onChange={e => setConfig(c => ({ ...c, selectedModel: e.target.value }))}
                      placeholder="gemini-2.5-flash"
                      className={inputClass}
                    />
                  )}
                  <button
                    onClick={() => fetchModels()}
                    disabled={modelsLoading}
                    className="flex-shrink-0 px-3 py-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-white/8 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all cursor-pointer disabled:opacity-50"
                    title="刷新模型列表"
                  >
                    <RefreshCw className={`w-4 h-4 ${modelsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {modelsError && (
                  <p className="text-xs text-[var(--color-error)] mt-1">{modelsError}</p>
                )}
                {models.length > 0 && (
                  <p className="text-[10px] text-[var(--color-success)] mt-1">已加载 {models.length} 个可用模型</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Server className="w-4 h-4" /> ASR 语音识别引擎
                </label>
                <select
                  value={config.asrEngine}
                  onChange={e => setConfig(c => ({ ...c, asrEngine: e.target.value }))}
                  className={inputClass}
                >
                  <option value="whisperx">WhisperX — 说话人分离 + 词级时间戳</option>
                  <option value="qwen3">Qwen3-ASR-1.7B — 52 语言 + 高精度</option>
                </select>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1.5">
                  {config.asrEngine === 'qwen3'
                    ? '⚡ Qwen3-ASR: 52 语言/方言、歌声识别、超低 WER (~4.9%)、语言自动检测'
                    : '🎯 WhisperX: 多人会议说话人分离、精确时间戳对齐、成熟稳定'
                  }
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Server className="w-4 h-4" /> WhisperX 端点
                </label>
                <input
                  type="text"
                  value={config.whisperxEndpoint}
                  onChange={e => setConfig(c => ({ ...c, whisperxEndpoint: e.target.value }))}
                  placeholder="/api/transcribe"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Server className="w-4 h-4" /> Qwen3-ASR 端点
                </label>
                <input
                  type="text"
                  value={config.qwenAsrEndpoint}
                  onChange={e => setConfig(c => ({ ...c, qwenAsrEndpoint: e.target.value }))}
                  placeholder="/api/transcribe-qwen"
                  className={inputClass}
                />
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">
                  代理模式: /api/transcribe-qwen · 直连: http://100.67.209.116:9946
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="px-6 py-3 bg-[var(--color-primary)] text-black font-semibold rounded-xl hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />保存中...</span>
                  ) : '保存配置'}
                </button>
                {saveResult === 'success' && (
                  <span className="flex items-center gap-1.5 text-sm text-[var(--color-success)]"><Check className="w-4 h-4" />已保存</span>
                )}
                {saveResult === 'error' && (
                  <span className="text-sm text-[var(--color-error)]">保存失败</span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--color-tag-blue)]" /> 用户列表
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                管理用户角色与状态，新用户通过 Google 登录自动注册
              </p>
            </div>
            <button
              onClick={loadUsers}
              className="p-2 rounded-lg bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className={`flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-surface)] border border-white/6 ${u.status === 'disabled' ? 'opacity-50' : ''}`}>
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center text-sm font-semibold text-[var(--color-text-secondary)]">
                      {u.name?.[0] || '?'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{u.name}</p>
                      {u.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
                          <Crown className="w-2.5 h-2.5" /> Admin
                        </span>
                      )}
                      {u.status === 'disabled' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-error)]/15 text-[var(--color-error)]">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{u.email}</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                      注册: {u.created_at ? new Date(u.created_at + 'Z').toLocaleDateString('zh-CN') : '-'}
                      {u.last_login && ` · 最近登录: ${new Date(u.last_login + 'Z').toLocaleDateString('zh-CN')}`}
                    </p>
                  </div>

                  {/* Actions — don't allow editing self */}
                  {u.id !== user?.id && (
                    <div className="flex items-center gap-2">
                      {u.role === 'user' ? (
                        <button
                          onClick={() => updateUser(u.id, { role: 'admin' })}
                          className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:bg-white/5 transition-colors cursor-pointer"
                          title="设为管理员"
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUser(u.id, { role: 'user' })}
                          className="p-2 rounded-lg text-[var(--color-primary)] hover:text-[var(--color-text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
                          title="降为普通用户"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}

                      {u.status === 'active' ? (
                        <button
                          onClick={() => updateUser(u.id, { status: 'disabled' })}
                          className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-white/5 transition-colors cursor-pointer"
                          title="禁用用户"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUser(u.id, { status: 'active' })}
                          className="p-2 rounded-lg text-[var(--color-error)] hover:text-[var(--color-success)] hover:bg-white/5 transition-colors cursor-pointer"
                          title="启用用户"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === 'storage' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <HardDrive className="w-5 h-5 text-[var(--color-tag-emerald)]" /> R2 云存储
              </h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Cloudflare R2 对象存储 · 10 GB 免费额度
              </p>
            </div>
            <button
              onClick={loadStorage}
              disabled={storageLoading}
              className="p-2 rounded-lg bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${storageLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {storageLoading && !storage ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-tertiary)]" />
            </div>
          ) : storage ? (
            <>
              {/* Usage Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--color-bg-surface)] rounded-xl p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)] mb-1">总文件数</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{storage.totalFiles}</p>
                </div>
                <div className="bg-[var(--color-bg-surface)] rounded-xl p-4">
                  <p className="text-xs text-[var(--color-text-tertiary)] mb-1">已用空间</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatBytes(storage.totalBytes)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-[var(--color-text-tertiary)] mb-2">
                  <span>R2 免费额度使用率</span>
                  <span>{formatBytes(storage.totalBytes)} / {formatBytes(storage.r2FreeTierBytes)}</span>
                </div>
                <div className="h-2.5 bg-[var(--color-bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((storage.totalBytes / storage.r2FreeTierBytes) * 100, 100)}%`,
                      backgroundColor: (storage.totalBytes / storage.r2FreeTierBytes) > 0.8 ? 'var(--color-error)' : 'var(--color-success)',
                    }}
                  />
                </div>
              </div>

              {/* Per-User Breakdown */}
              {storage.perUser.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">👤 用户用量分布</h3>
                  <div className="space-y-2">
                    {storage.perUser.map((u) => (
                      <div key={u.user_email} className="flex items-center justify-between p-3 bg-[var(--color-bg-surface)] rounded-xl">
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)]">{u.user_email}</p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">{u.file_count} 个文件</p>
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{formatBytes(u.total_bytes)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Uploads */}
              {storage.recentUploads.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">📁 最近上传</h3>
                  <div className="space-y-2">
                    {storage.recentUploads.map((f) => (
                      <div key={f.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-surface)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <Upload className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                          <div>
                            <p className="text-sm text-[var(--color-text-primary)]">{f.filename}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{f.user_email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-secondary)]">{formatBytes(f.size_bytes)}</p>
                          <p className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {new Date(f.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {storage.totalFiles === 0 && (
                <div className="text-center py-8 text-[var(--color-text-tertiary)]">
                  <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">暂无云存储文件</p>
                  <p className="text-xs mt-1">录音或上传音频后将自动同步到 R2</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
