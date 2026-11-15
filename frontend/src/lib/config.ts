/**
 * Base URL of the Django API (no trailing slash).
 * - unset: http://localhost:8000
 * - ""   : same origin, i.e. requests go through the Vite dev proxy (Docker / phone testing)
 * - URL  : a deployed backend, e.g. https://apnaghar-2emb.onrender.com
 */
const configured = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = (configured ?? "http://localhost:8000").replace(/\/+$/, "");
