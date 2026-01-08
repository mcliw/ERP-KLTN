// src/auth/auth.store.js

import { create } from "zustand";
import { loginApi, resetPasswordApi } from "./auth.service";

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("erp_user") || "null"),
  token: localStorage.getItem("erp_token"),
  loading: false,
  error: null,

  login: async (payload) => {
    set({ loading: true, error: null });
    try {
      const { user, token } = await loginApi(payload);

      localStorage.setItem("erp_user", JSON.stringify(user));
      localStorage.setItem("erp_token", token);

      set({ user, token, loading: false });
      return user;
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem("erp_user");
    localStorage.removeItem("erp_token");
    set({ user: null, token: null });
  },

  resetPassword: async ({ username, password }) => {
    set({ loading: true, error: null });
    try {
      await resetPasswordApi({ username, password });
      set({ loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },
}));
