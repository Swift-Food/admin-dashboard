// ...existing code...
import axios from "axios";
import { BASE_URL } from "../constants";

const api = axios.create({
  baseURL: BASE_URL,
});

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_TOKEN as string | undefined;

console.log("[http] VITE_DEV_BYPASS_TOKEN present:", !!DEV_BYPASS);

if (DEV_BYPASS) {
  api.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    (config.headers as any)["X-DEV-BYPASS"] = DEV_BYPASS;
    return config;
  });
}

export default api;
// ...existing code...
