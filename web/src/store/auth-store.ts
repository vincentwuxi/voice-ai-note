import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isChecked: boolean;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isChecked: false,

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isLoading: false, isChecked: true });
      } else {
        set({ user: null, isLoading: false, isChecked: true });
      }
    } catch {
      set({ user: null, isLoading: false, isChecked: true });
    }
  },

  logout: async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    set({ user: null });
    window.location.href = '/login';
  },
}));
