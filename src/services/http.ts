import axios from "axios";
import { BASE_URL } from "../constants";

const api = axios.create({
  baseURL: BASE_URL,
});

// Add this interceptor to inject the token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
