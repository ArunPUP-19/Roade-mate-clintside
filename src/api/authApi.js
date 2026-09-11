import { API_BASE_URL } from './config';

// ─── Auth API ────────────────────────────────────────────────────────

/**
 * Log in with email and password.
 * @returns {{ user: object, token: string }}
 */
export const loginUser = async (email, password) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Login failed');
  }

  return res.json();
};

/**
 * Register a new user.
 * @returns {{ user: object, token: string }}
 */
export const registerUser = async (name, email, password) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Registration failed');
  }

  return res.json();
};
