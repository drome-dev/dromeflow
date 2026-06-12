export interface Unit {
  id: string;
  unit_name: string;
  unit_code: string;
  slug: string; // Slug único para subdomínio (kebab-case)

  address?: string | null;
  is_active: boolean;
  created_at: string;

  // Company information fields
  razao_social?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  responsavel?: string | null;
  contato?: string | null;
  email?: string | null;
  uniform_value?: string | number | null;
  teste?: boolean;
}

export interface UnitService {
  id: string;
  unit_id: string;
  name: string;
  repasse_value: string;
  active: boolean;
  created_at: string;
}

export interface UnitKey {
  id: string | number;
  created_at: string;
  updated_at?: string;
  unit_id: string;
  is_active: boolean;
  // Campos de configuração por unidade
  codigo: string | null;
  istancia: string | null;
  recrutadora: string | null;
  botID: string | null;
  triggerName: string | null;
  organizationID: string | null;
  contato_profissionais: string | null;
  umbler: string | null;
  contato_atend: string | null;
  pos_vendas: string | null;
  conexao: string | null;
  id_recruta: string | null;
  key_umbler: string | null;
  google: string | null;
  triggerPos: string | null;
  main_email?: string | null;
}

export interface UnitModule {
  id: string;
  unit_id: string;
  module_id: string;
  created_at: string;
  updated_at: string;
}

export interface UnitModuleSummary {
  unit_id: string;
  unit_name: string;
  unit_code: string;
  total_modules: number;
  module_names: string[];
}

export interface UnitClient {
  id: string;
  unit_id: string;
  nome: string;
  tipo: string | null;
  endereco: string | null;
  contato: string | null;
  responsavel?: string | null;
  is_verified?: boolean;
  asaas_id?: string | null;
  created_at?: string;
  updated_at?: string;
}