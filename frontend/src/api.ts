import type { RideDetails, ActionLog, SettlementPlan, Expense, BikeSpec } from './types';

const API_BASE = '/api';

export async function fetchSampleChat(): Promise<string> {
  const res = await fetch(`${API_BASE}/sample-chat`);
  if (!res.ok) throw new Error('Failed to load sample chat');
  const data = await res.json();
  return data.chat_text;
}

export async function parseChatAndPlan(
  chatText: string,
  options?: {
    customDestination?: string;
    customStart?: string;
    customDate?: string;
    customTime?: string;
    demoMode?: boolean;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_text: chatText,
      custom_destination: options?.customDestination,
      custom_start: options?.customStart,
      custom_date: options?.customDate,
      custom_time: options?.customTime,
      demo_mode: options?.demoMode ?? false,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to parse chat and plan ride');
  }
  return res.json();
}

export async function fetchGeocodeCandidates(query: string): Promise<Array<{ name: string; display_name: string; lat: number; lon: number }>> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/locations/candidates?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Could not find '${query.trim()}'. Try a more specific name.`);
  }
  return res.json();
}

export async function fetchLocationSuggestions(query: string): Promise<Array<{ name: string; description: string }>> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE}/locations/suggest?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    return [];
  }
}

export async function previewRoute(payload: {
  start_location: string;
  destination: string;
  smallest_tank_range_km?: number;
  start_time?: string;
  target_date?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/route/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to calculate route preview');
  }
  return res.json();
}

export async function updateRideRoute(rideId: string, payload: {
  start_location: string;
  destination: string;
  ride_date?: string;
  start_time?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/update-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to update ride route');
  }
  return res.json();
}

export async function fetchRideDetails(rideId: string): Promise<RideDetails> {
  const res = await fetch(`${API_BASE}/rides/${rideId}`);
  if (!res.ok) throw new Error('Failed to fetch ride details');
  return res.json();
}

export async function listRides(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/rides`);
  if (!res.ok) throw new Error('Failed to list rides');
  return res.json();
}

export async function updateRider(riderId: string, updates: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}/riders/${riderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update rider');
  return res.json();
}

export async function fetchBikes(): Promise<BikeSpec[]> {
  const res = await fetch(`${API_BASE}/bikes`);
  if (!res.ok) throw new Error('Failed to load bikes specifications');
  return res.json();
}

export async function approvePendingAction(actionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/pending-actions/${actionId}/approve`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to approve action');
  return res.json();
}

export async function rejectPendingAction(actionId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/pending-actions/${actionId}/reject`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reject action');
  return res.json();
}

export async function fetchActionLogs(rideId: string): Promise<ActionLog[]> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/action-logs`);
  if (!res.ok) throw new Error('Failed to fetch action logs');
  return res.json();
}

export async function addExpense(rideId: string, expense: any): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) throw new Error('Failed to record expense');
  return res.json();
}

export async function fetchExpenses(rideId: string): Promise<Expense[]> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/expenses`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

export async function fetchSettlement(rideId: string): Promise<SettlementPlan> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/settlement`);
  if (!res.ok) throw new Error('Failed to compute settlement');
  return res.json();
}

export async function sendVoiceQuery(rideId: string, query: string): Promise<{ query: string; answer: string }> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/voice-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Voice query failed');
  return res.json();
}

export async function fetchBriefingText(rideId: string, lang: string = 'en'): Promise<{ language: string; text: string }> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/briefing-text?lang=${lang}`);
  if (!res.ok) throw new Error('Failed to fetch briefing text');
  return res.json();
}

export async function deleteRide(rideId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete ride');
  return res.json();
}

// API Credentials Management
export async function fetchApiSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/keys`);
  if (!res.ok) throw new Error('Failed to fetch API settings');
  return res.json();
}

export async function updateApiSettings(keys: Record<string, string>): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(keys),
  });
  if (!res.ok) throw new Error('Failed to update API settings');
  return res.json();
}

export async function testApiKey(service: string, apiKey: string): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/test-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, api_key: apiKey }),
  });
  if (!res.ok) throw new Error('Failed to test key');
  return res.json();
}
