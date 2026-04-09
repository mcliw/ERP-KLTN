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
      // --- SỬA ĐỔI TẠI ĐÂY ---
      // loginApi trả về accessToken, không phải token
      const response = await loginApi(payload);
      
      const user = response.user;
      const token = response.accessToken; // Lấy đúng trường accessToken
      // -----------------------

      localStorage.setItem("erp_user", JSON.stringify(user));
      
      // Lưu ý: auth.service.js có thể đã lưu rồi, nhưng store lưu lại để đồng bộ state cũng không sao,
      // miễn là giá trị token không bị undefined.
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
