export interface LoyaltyPlan {
  id: string;
  unit_id: string;
  name: string;
  description: string | null;
  type: 'cashback' | 'points';

  // Regras de acúmulo
  reward_percentage: number | null;
  points_per_real: number | null;
  min_purchase_value: number | null;
  vip_multiplier: number | null;

  // Regras de resgate
  min_redemption_points: number;
  points_to_real_ratio: number | null;

  // Validade
  validity_days: number | null; // Período em dias a partir do primeiro acúmulo

  // Status
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;

  created_at: string;
  updated_at: string;
}

export interface LoyaltyPlanClient {
  id: string;
  plan_id: string;
  client_id: string;

  current_balance: number;
  total_earned: number;
  total_redeemed: number;

  is_active: boolean;
  is_vip: boolean;
  joined_at: string;
  last_transaction_at: string | null;

  // Validade individual
  validity_start_date: string | null;
  validity_end_date: string | null;

  created_at: string;
  updated_at: string;

  // Joins
  // Relação com cliente
  client?: {
    id: string;
    nome: string;
    codigo?: string;
  };
  plan?: LoyaltyPlan;
}

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'manual_adjustment';
export type LoyaltyTransactionSource = 'appointment' | 'manual' | 'redemption';

export interface LoyaltyTransaction {
  id: string;
  plan_client_id: string;
  type: LoyaltyTransactionType;
  points: number;
  atendimento_id: string | null;
  purchase_value: number | null;
  description: string | null;
  metadata: any;

  // Novos campos para rastreamento
  source_id: string | null;
  source_type: LoyaltyTransactionSource | null;
  adjusted_by_user_id: string | null;
  adjustment_reason: string | null;
  expires_at: string | null;

  created_at: string;

  // Relações
  adjusted_by?: {
    id: string;
    full_name: string;
  };

  // Relação com cliente
  client?: {
    id: string;
    nome: string;
    codigo?: string; // Código do cliente
  };
}