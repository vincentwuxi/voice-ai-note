'use client';

import { useEffect, Suspense } from 'react';
import { Mic } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';

const errorMessages: Record<string, string> = {
  no_code: '授权失败，请重试',
  token_failed: 'Google 认证失败',
  userinfo_failed: '无法获取用户信息',
  disabled: '账号已被管理员禁用，请联系管理员',
  server_error: '服务器错误，请稍后重试',
};

function LoginContent() {
  const { user, isChecked, fetchUser } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!isChecked) fetchUser();
  }, [isChecked, fetchUser]);

  useEffect(() => {
    if (isChecked && user) {
      router.replace('/');
    }
  }, [isChecked, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center mb-4 shadow-lg shadow-[var(--color-primary)]/20">
            <Mic className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">灵思 VoiceMind</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-2">用声音捕捉灵感，用 AI 构建知识库</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-sm text-[var(--color-error)] text-center">
            {errorMessages[error] || '登录失败，请重试'}
          </div>
        )}

        {/* Login Button */}
        <a
          href="/api/auth/google"
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-gray-800 font-semibold text-sm hover:bg-gray-100 transition-all shadow-md cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          使用 Google 账号登录
        </a>

        <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-6">
          首次登录将自动创建账户
        </p>

        {/* Footer */}
        <div className="text-center mt-12 text-xs text-[var(--color-text-tertiary)]">
          <p>© 2026 VoiceMind. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
