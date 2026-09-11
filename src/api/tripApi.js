import { API_BASE_URL } from './config';

// ─── Trip API ────────────────────────────────────────────────────────

/**
 * Search / list trips with optional filters.
 * @param {{ from?: string, to?: string, date?: string }} filters
 */
export const searchTrips = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.from) queryParams.append('from', filters.from);
  if (filters.to) queryParams.append('to', filters.to);
  if (filters.date) queryParams.append('date', filters.date);

  const res = await fetch(`${API_BASE_URL}/api/trips?${queryParams.toString()}`);
  return res.json();
};

/**
 * Get a single trip by ID.
 */
export const getTripById = async (tripId) => {
  const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}`);
  if (!res.ok) throw new Error('Trip not found');
  return res.json();
};

/**
 * Create a new trip (offer a ride).
 */
export const createTrip = async (tripData, authHeaders = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(tripData),
  });

  return { res, data: await res.json().catch(() => ({})) };
};

// ─── Trip Action helpers ─────────────────────────────────────────────

/**
 * Generic trip action (join, leave, lock, start, complete, cancel, confirm, reject).
 * Returns { res, data } so the caller can inspect status codes.
 */
export const tripAction = async (url, method = 'POST', authHeaders = {}) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders },
  });

  const data = await res.json().catch(() => ({}));
  return { res, data };
};

export const joinTrip = (tripId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/join`, 'POST', authHeaders);

export const leaveTrip = (tripId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/leave`, 'DELETE', authHeaders);

export const confirmParticipant = (tripId, participantId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/participants/${participantId}/confirm`, 'PUT', authHeaders);

export const rejectParticipant = (tripId, participantId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/participants/${participantId}/reject`, 'PUT', authHeaders);

export const lockTrip = (tripId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/lock`, 'PUT', authHeaders);

export const startTrip = (tripId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/start`, 'PUT', authHeaders);

export const completeTrip = (tripId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/complete`, 'PUT', authHeaders);

export const cancelTrip = (tripId, authHeaders) =>
  tripAction(`${API_BASE_URL}/api/trips/${tripId}/cancel`, 'PUT', authHeaders);
