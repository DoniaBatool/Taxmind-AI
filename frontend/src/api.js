// TaxMind AI — API Service

import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE, timeout: 90000 }); // 90s — allows for Render cold start

// ── Token interceptor — attach Bearer token to every request ──────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taxmind_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-logout on 401 (only when not already on auth pages) ─────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const onAuthPage = ["/login", "/signup"].includes(window.location.pathname);
    if (err.response?.status === 401 && !onAuthPage) {
      localStorage.removeItem("taxmind_token");
      localStorage.removeItem("taxmind_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register = (data) => api.post("/auth/register", data);
export const login    = (data) => api.post("/auth/login", data);
export const getMe    = ()     => api.get("/auth/me");

// ── Clients ──────────────────────────────────────────────────────────────────
export const getClients   = ()         => api.get("/api/clients");
export const createClient = (data)     => api.post("/api/clients", data);
export const getClient    = (id)       => api.get(`/api/clients/${id}`);
export const updateClient = (id, data) => api.patch(`/api/clients/${id}`, data);
export const deleteClient = (id)       => api.delete(`/api/clients/${id}`);

// ── Documents ─────────────────────────────────────────────────────────────────
export const uploadTaxReturn = (clientId, year, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/api/clients/${clientId}/tax-return?tax_year=${year}`, form);
};

export const uploadFinancials = (clientId, year, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/api/clients/${clientId}/financials?fiscal_year=${year}`, form);
};

export const listDocuments    = (clientId)        => api.get(`/api/clients/${clientId}/documents`);
export const deleteTaxReturn  = (clientId, docId) => api.delete(`/api/clients/${clientId}/tax-return/${docId}`);
export const deleteFinancials = (clientId, docId) => api.delete(`/api/clients/${clientId}/financials/${docId}`);

// ── Analysis ──────────────────────────────────────────────────────────────────
export const triggerAnalysis = (clientId, year) =>
  api.post(`/api/clients/${clientId}/analyze?analysis_year=${year}`);

export const getAnalysis    = (clientId)      => api.get(`/api/clients/${clientId}/analysis`);
export const listAnalyses   = (clientId)      => api.get(`/api/clients/${clientId}/analyses`);
export const deleteAnalysis = (clientId, aId) => api.delete(`/api/clients/${clientId}/analyses/${aId}`);
export const getRedFlags    = (clientId)      => api.get(`/api/clients/${clientId}/red-flags`);
export const getTaxPlan     = (clientId)      => api.get(`/api/clients/${clientId}/tax-plan`);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminGetFirms       = ()                   => api.get("/api/admin/firms");
export const adminGetStats       = ()                   => api.get("/api/admin/stats");
export const adminGetFirmClients = (userId)             => api.get(`/api/admin/firms/${userId}/clients`);
export const adminSetRole        = (userId, is_admin)   => api.patch(`/api/admin/firms/${userId}/admin`, { is_admin });
export const adminDeleteFirm     = (userId)             => api.delete(`/api/admin/firms/${userId}`);

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatWithClient = (clientId, message, history) =>
  api.post(`/api/clients/${clientId}/chat`, { message, history });

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardBriefing = () => api.get("/api/dashboard/briefing");
