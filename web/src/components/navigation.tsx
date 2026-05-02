'use client';

import { Mic, BookOpen, Sparkles, Calendar, Settings, ShieldCheck, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { id: 'record', label: '录音', icon: Mic, href: '/' },
  { id: 'library', label: '思想库', icon: BookOpen, href: '/library' },
  { id: 'inspiration', label: '灵感库', icon: Sparkles, href: '/inspiration' },
  { id: 'calendar', label: '日历', icon: Calendar, href: '/calendar' },
  { id: 'settings', label: '设置', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Don't render sidebar on login page
  if (pathname === '/login') return null;

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[var(--color-bg-card)] border-r border-white/6">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
          <Mic className="w-4 h-4 text-black" />
        </div>
        <span className="text-lg font-bold text-[var(--color-text-primary)]">VoiceMind</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Admin Entry */}
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-200 cursor-pointer ${
              pathname === '/admin'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'text-[var(--color-tag-amber)] hover:text-[var(--color-primary)] hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-medium">管理后台</span>
          </button>
        )}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/6">
        <div className="flex items-center gap-3 px-2">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)]">
              {user?.name?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-primary)] font-medium truncate">{user?.name || '用户'}</p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-white/5 transition-colors cursor-pointer"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();

  // Don't render on login page
  if (pathname === '/login') return null;

  const isAdmin = user?.role === 'admin';

  const mobileItems = isAdmin
    ? [...navItems, { id: 'admin', label: '管理', icon: ShieldCheck, href: '/admin' }]
    : navItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/8">
      <div className="flex justify-around items-center h-16 px-2">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
