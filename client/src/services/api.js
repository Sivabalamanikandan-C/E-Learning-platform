import axios from "axios";

const LOCAL_API_ORIGIN = "http://localhost:5000";
const BASE_URL = (import.meta.env.VITE_API_URL || LOCAL_API_ORIGIN).replace(/\/+$/, "");

function normalizeApiUrl(url) {
  if (typeof url !== "string" || !url) {
    return url;
  }

  if (url.startsWith(LOCAL_API_ORIGIN)) {
    return `${BASE_URL}${url.slice(LOCAL_API_ORIGIN.length)}`;
  }

  return url;
}

function attachApiInterceptor(client) {
  client.interceptors.request.use((config) => {
    const nextConfig = config;

    nextConfig.baseURL = nextConfig.baseURL || BASE_URL;
    nextConfig.url = normalizeApiUrl(nextConfig.url);
    nextConfig.headers = nextConfig.headers ?? {};

    const token = localStorage.getItem("token");
    if (token && !nextConfig.headers.Authorization) {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    }

    return nextConfig;
  });
}

axios.defaults.baseURL = BASE_URL;
axios.defaults.withCredentials = false;
attachApiInterceptor(axios);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

attachApiInterceptor(api);

export { BASE_URL, normalizeApiUrl };
export const request = (path, options) => api(path, options);
export default api;
