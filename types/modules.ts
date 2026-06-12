export interface Module {
  id: string;
  code?: string; // Código único do módulo
  name: string;
  icon?: string; // Legacy field (pode ser removido após migração completa)
  icon_name?: string; // Nome do ícone Lucide
  description?: string | null; // Descrição do módulo
  webhook_url: string | null; // Permitir nulo
  view_id: string | null; // Adicionar view_id
  is_active: boolean;
  allowed_profiles: string[];
  position: number;
  parent_id?: string | null; // Hierarquia: módulo pai (nulo = topo)
  // Campo somente de UI (não persistido): filhos já resolvido
  children?: Module[];
}

export interface BatchPositionUpdate {
  id: string;
  position: number;
}

export interface BatchUpdateResult {
  success: boolean;
  updated_count: number;
  failed_count: number;
  total: number;
  error?: string;
}