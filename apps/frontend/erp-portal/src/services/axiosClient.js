import axios from "axios";

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://ldgcompany.local/api",
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("erp_token");
  
  const isIdentityRequest = config.url && config.url.includes("/identity/graphql");

  if (token && !isIdentityRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});