'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Server, Key, Bot, Check, Loader2, Users, Crown, Ban, UserCheck, RefreshCw } from 'lucide-react';
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

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [config, setConfig] = useState({
    apiEndpoint: '',
    apiKey: '',
    selectedModel: 'gemini-2.5-pro',
    whisperxEndpoint: '/api/transcribe',
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'users'>('config');

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
                  placeholder="https://api.openai.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Key className="w-4 h-4" /> API 密钥
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  <Bot className="w-4 h-4" /> 模型
                </label>
                <input
                  type="text"
                  value={config.selectedModel}
                  onChange={e => setConfig(c => ({ ...c, selectedModel: e.target.value }))}
                  placeholder="gemini-2.5-pro"
                  className={inputClass}
                />
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
    </div>
  );
}
