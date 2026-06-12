export interface Webhook {
  id: string;
  unit_id: string;
  module_id: string | null;
  url: string;
  event_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookConfig {
  id: string;
  unit_id: string;
  webhook_url: string | null;
  secret_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
  // Response data
  response_status?: number;
  response_body?: string | null;
}