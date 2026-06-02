import { create } from 'zustand';

const useStore = create((set, get) => ({
  // Auth
  token: localStorage.getItem('at_token') || null,
  user: JSON.parse(localStorage.getItem('at_user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('at_token', token);
    localStorage.setItem('at_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('at_token');
    localStorage.removeItem('at_user');
    set({ token: null, user: null });
  },
  isAuthenticated: () => !!get().token,

  // Toasts
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500);
  },

  // Cases
  cases: [],
  setCases: (cases) => set({ cases }),
  currentCase: null,
  setCurrentCase: (c) => set({ currentCase: c }),

  // Global search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Autosave state
  autosaveStatus: 'idle', // idle / saving / saved
  setAutosaveStatus: (s) => set({ autosaveStatus: s }),
}));

export default useStore;
