export interface PaymentRecord {
  id: string;
  cliente_asaas_id: string;
  atendimento_id?: string | null;
  id_pagamento_asaas: string;
  status_pagamento: string;
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  tipo_pagamento?: string | null;
  data_pagamento?: string | null; // ISO timestamp
  link?: string | null;
  grupo?: string | null;
  nome?: string | null; // Nome do cliente desnormalizado
  unit_id?: string | null; // ID da unidade (opcional se quiser filtrar direto sem join)
  created_at: string;
  updated_at: string;
  // Joins
  unit_clients?: {
    nome: string;
    // outros campos se necessário
  };
}

export interface UnitPayment {
  id: string;
  unit_plan_id: string;
  reference_date: string; // YYYY-MM-DD
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  created_at: string;
  updated_at: string;
}