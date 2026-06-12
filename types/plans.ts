export interface Plan {
  id: string;
  name: string;
  description: string | null;
  value: number;
  cycle: 'monthly' | 'annual';
  status: boolean;
  payment_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitPlan {
  id: string;
  unit_id: string;
  plan_id: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'inactive' | 'cancelled';
  due_day?: number;
  payment_type?: 'pix' | 'credit_card';
  created_at: string;
  updated_at: string;
  parent_unit_id: string | null;
  // Joins
  plan?: Plan;
}