import { RideDetails, ActionLog, SettlementPlan, Expense, BikeSpec } from './types';

const API_BASE = '/api';

export async function fetchSampleChat(): Promise<string> {
  const res = await fetch(`${API_BASE}/sample-chat`);
  if (!res.ok) throw new Error('Failed to load sample chat');
  const data = await res.json();
  return data.chat_text;
}

export async function parseChatAndPlan(chatText: string, demoMode: boolean = true): Promise<any> {
  const res = await fetch(`${API_BASE}/chat/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_text: chatText, demo_mode: demoMode }),
  });
  if (!res.ok) throw new Error('Failed to parse chat and plan ride');
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
