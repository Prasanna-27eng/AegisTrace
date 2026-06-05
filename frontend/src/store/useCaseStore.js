import { create } from 'zustand';

const useCaseStore = create((set, get) => ({
  cases: [],
  setCases: (cases) => set({ cases }),

  currentCase: null,
  setCurrentCase: (c) => set({ currentCase: c }),

  filters: { status: '', severity: '', search: '' },
  setFilters: (filters) => set({ filters }),

  pagination: { limit: 25, offset: 0 },
  setPagination: (p) => set({ pagination: p }),

  autosaveStatus: 'idle', // idle / saving / saved
  setAutosaveStatus: (s) => set({ autosaveStatus: s }),
}));

export default useCaseStore;
