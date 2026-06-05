import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
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
}));

export default useAuthStore;
