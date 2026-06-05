import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  // Toast queue
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  // Global search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Active tab per page
  activeTabs: {},
  setActiveTab: (page, tab) => set(s => ({ activeTabs: { ...s.activeTabs, [page]: tab } })),

  // Loading state
  loading: {},
  setLoading: (key, value) => set(s => ({ loading: { ...s.loading, [key]: value } })),
}));

export default useUIStore;
