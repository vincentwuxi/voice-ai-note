'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * AuthGuard: wraps the app, redirects to /login if not authenticated.
 * /login page is excluded from the guard.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isChecked, fetchUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isChecked) {
      fetchUser();
    }
  }, [isChecked, fetchUser]);

  // Don't guard the login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading || !isChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          <p className="text-sm text-[var(--color-text-tertiary)]">验证身份中...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) {
    router.replace('/login');
    return null;
  }

  return <>{children}</>;
}
