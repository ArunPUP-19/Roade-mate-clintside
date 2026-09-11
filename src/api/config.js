// ─── API Configuration ───────────────────────────────────────────────
// Change this single value to point the entire frontend at a different backend.
// 
// Priority:
//   1. VITE_API_BASE_URL environment variable  (set in .env or at build time)
//   2. Fallback to localhost for local development
//
// Examples:
//   VITE_API_BASE_URL=https://api.routemate.com
//   VITE_API_BASE_URL=http://192.168.1.50:5000
// ─────────────────────────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
