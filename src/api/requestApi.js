import { API_BASE_URL } from './config';

// ─── Ride Request API ────────────────────────────────────────────────

/**
 * Fetch all ride requests.
 */
export const fetchAllRequests = async () => {
  const res = await fetch(`${API_BASE_URL}/api/requests`);
  return res.json();
};

/**
 * Create a new ride request.
 */
export const createRequest = async (requestData, authHeaders = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(requestData),
  });

  return { res, data: await res.json().catch(() => ({})) };
};
