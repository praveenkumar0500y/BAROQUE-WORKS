export interface BikeSpec {
  model: string;
  tank_litres: number;
  mileage_kmpl: number;
  tank_range_km: number;
}

export interface Rider {
  id: string;
  name: string;
  status: 'confirmed' | 'undecided' | 'declined';
  is_captain: boolean;
  phone?: string;
  upi_id?: string;
  bike_model?: string;
  tank_litres?: number;
  mileage_kmpl?: number;
  tank_range_km?: number;
}

export interface RideStop {
  id: string;
  stop_type: 'fuel' | 'food' | 'restroom' | 'repair' | 'checkpoint';
  name: string;
  lat: number;
  lng: number;
  distance_from_start_km: number;
  eta: string;
  duration_minutes: number;
  notes: string;
  order_index: number;
}

export interface PendingAction {
  id: string;
  action_type: 'SAVE_PLAN' | 'CALENDAR_EXPORT' | 'GROUP_SUMMARY' | 'SETTLEMENT_LINKS';
  description: string;
  tool_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  payload: Record<string, any>;
  result: Record<string, any>;
  created_at: string;
  resolved_at?: string;
}

export interface ActionLog {
  id: string;
  ride_id: string;
  tool_name: string;
  input_summary: string;
  output_summary: string;
  timestamp: string;
  approved_by: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED_FOR_APPROVAL' | 'EXECUTED_ON_APPROVAL' | 'REJECTED';
}

export interface Expense {
  id: string;
  payer_id: string;
  payer_name: string;
  amount: number;
  category: string;
  description: string;
  split_type: string;
  split_among: string[];
  created_at: string;
}

export interface SettlementItem {
  from_rider_id: string;
  from_rider_name: string;
  to_rider_id: string;
  to_rider_name: string;
  amount: number;
  upi_id: string;
  upi_link: string;
}

export interface SettlementPlan {
  total_expenses: number;
  per_rider_balance: Record<string, number>;
  settlements: SettlementItem[];
}

export interface RideDetails {
  id: string;
  title: string;
  start_location: string;
  start_lat: number;
  start_lng: number;
  destination: string;
  dest_lat: number;
  dest_lng: number;
  ride_date: string;
  start_time: string;
  budget_per_head: number;
  pace: string;
  food_preference: string;
  total_distance_km: number;
  duration_minutes: number;
  status: string;
  polyline: [number, number][];
  weather_verdict: 'GO' | 'CAUTION' | 'NO-GO';
  weather_summary: string;
  riders: Rider[];
  stops: RideStop[];
  pending_actions: PendingAction[];
}
