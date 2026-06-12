export interface ComercialColumn {
  id: string;
  unit_id: string | null;
  code: string;
  name: string;
  color?: string | null;
  image_url?: string | null;
  position: number;
  is_active: boolean;
}

export interface ComercialCard {
  id: string;
  unit_id: string;
  nome: string;
  tipo: string | null;
  endereco: string | null;
  contato: string | null;
  contato_id: string | null;
  origem: string | null;
  tag: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  position: number;
}

// Comercial Admin (Kanban para Super Admin)
export interface ComercialAdminColumn {
  id: string;
  unit_id: string | null;
  code: string;
  name: string;
  color?: string | null;
  image_url?: string | null;
  position: number;
  is_active: boolean;
}

export interface ComercialAdminCard {
  id: string;
  unit_id: string | null;
  linked_unit_id: string | null;
  nome: string;
  email: string | null;
  cnpj: string | null;
  quantidade_unidades: number | null;
  nome_unidade: string | null;
  contato: string | null;
  origem: string | null;
  status: string;
  observacao: string | null;
  plano_id: string | null;
  check_cadastro_unidade: boolean;
  check_status_pagamento: boolean;
  check_recrutadora: boolean;
  check_umbler: boolean;
  producao_status: string;
  position: number;
  created_at: string;
  updated_at: string;

  // Campos populados via JOIN (não persistidos)
  plano?: {
    id: string;
    name: string;
    value: number;
    cycle: 'monthly' | 'annual';
  };
  linked_unit?: {
    id: string;
    unit_name: string;
  };
}