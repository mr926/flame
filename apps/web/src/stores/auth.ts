import { create } from 'zustand';

interface AuthState {
  authenticated: boolean;
  setupRequired: boolean;
  setAuth: (auth: { authenticated: boolean; setupRequired: boolean }) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authenticated: false,
  setupRequired: false,
  setAuth: (auth) => set(auth),
}));
