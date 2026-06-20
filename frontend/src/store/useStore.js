/**
 * AegisTrace v4.3 — Zustand store split into focused slices.
 *
 * Import slices directly for best performance (component re-renders only
 * when its own slice changes):
 *
 *   import useAuthStore    from './store/useAuthStore'
 *   import useCaseStore    from './store/useCaseStore'
 *   import useUIStore      from './store/useUIStore'
 *   import useIdentityStore from './store/useIdentityStore'
 *   import useConnectorStore from './store/useConnectorStore'
 *
 * This file re-exports a merged store for backward compatibility
 * with existing components that import from useStore.
 */
import { create } from 'zustand';

// ── Unified store (backward-compatible) ──────────────────────────────────────
const useStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────────────────────────
  token: sessionStorage.getItem('at_token') || null,
  user: JSON.parse(sessionStorage.getItem('at_user') || 'null'),
  setAuth: (token, user) => {
    sessionStorage.setItem('at_token', token);
    sessionStorage.setItem('at_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    sessionStorage.removeItem('at_token');
    sessionStorage.removeItem('at_user');
    set({ token: null, user: null });
  },
  isAuthenticated: () => !!get().token,

  // ── Toasts ──────────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'info', opts = {}) => {
    // Deduplicate — if the same message+type already visible, skip
    const existing = get().toasts;
    if (existing.some(t => t.message === message && t.type === type)) return;
    // Cap at 5 visible toasts
    const trimmed = existing.length >= 5 ? existing.slice(1) : existing;
    const id = Date.now() + Math.random();
    set({
      toasts: [...trimmed, {
        id,
        message,
        type,
        title: opts.title,
        duration: opts.duration !== undefined ? opts.duration : undefined,
      }],
    });
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Cases ───────────────────────────────────────────────────────────────────
  cases: [],
  setCases: (cases) => set({ cases }),
  currentCase: null,
  setCurrentCase: (c) => set({ currentCase: c }),

  // ── Search ──────────────────────────────────────────────────────────────────
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // ── Autosave ────────────────────────────────────────────────────────────────
  autosaveStatus: 'idle',
  setAutosaveStatus: (s) => set({ autosaveStatus: s }),
}));

export default useStore;
