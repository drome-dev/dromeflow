export interface DataRecord {
  id?: number;
  created_at?: string;
  data?: string | null;
  horario?: string;
  valor?: number;
  servico?: string;
  tipo?: string;
  momento?: string;
  periodo?: string | null;
  cliente?: string;
  profissional?: string | null;
  endereco?: string;
  dia?: string;
  repasse?: number;
  whatscliente: string;
  cupom?: string;
  origem?: string;
  atendimento_id?: string;
  is_divisao?: string;
  cadastro?: string | null;
  acao?: string | null;
  confirmacao: boolean | null;
  status: string | null;
  unidade: string | null;
  observacao: string | null;
  pos_vendas: string | null;
  comentario: string | null;
  reagendou?: boolean | null;
  unidade_code: string;
  is_verified?: boolean;
  payment_status?: string | null;
  pagto?: string | null;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalServices: number;
  uniqueClients: number;
  averageTicket: number;
  totalRepasse: number;
}

export interface UploadMetrics {
  total: number;
  inserted: number;
  updated: number;
  ignored: number;
  deleted: number;
}

export interface ServiceAnalysisRecord {
  cadastro: string | null;
  data: string | null;
  dia: string;
  atendimento_id: string;
  is_divisao?: string;
}

export interface ClientAnalysisData {
  currentMonthClients: Set<string>;
  allPreviousClients: Set<string>;
  clientDetails: { cliente: string, periodo: string, tipo: string }[];
}

export interface RepasseAnalysisRecord {
  profissional: string | null;
  repasse: number;
}

export interface Action {
  id: string;
  action_code: string;
  action_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  created_at: string;
  unit_code: string | null;
  unit_id?: string | null;
  workflow: string | null;
  action_code: string | null;
  atend_id: string | null;
  user_identifier: string | null;
  status: 'success' | 'error' | 'pending' | 'cancelled';
  horario: string | null;
  metadata: Record<string, unknown> | null;
  actions?: { action_name: string; description: string | null } | null;
}

export interface ErrorLog {
  id: number;
  created_at: string;
  workflow: string | null;
  url_workflow: string | null;
  error_message: string | null;
  error_type: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  stack_trace: string | null;
  user_id: string | null;
  unit_code: string | null;
  context: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export interface ActivityStats {
  action_code: string;
  action_name: string;
  total_executions: number;
  success_count: number;
  error_count: number;
  success_rate: number;
}

// Legacy Types (Data Drome - Deprecated após consolidação)
export interface N8NMonitoringLog {
  id: number;
  created_at: string;
  unit: string | null;
  status: string | null;
  horario: string | null;
  user: string | null;
  atend_id: string | null;
  action: string | null;
  action_description?: string;
  workflow: string | null;
}

export interface N8NErrorLog {
  id: number;
  created_at: string;
  workflow: string | null;
  url_workflow: string | null;
  erro_message: string | null;
}

export interface SystemManual {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  image_position: 'top' | 'bottom' | 'left' | 'right';
  image_size: 'small' | 'medium' | 'large' | 'full';
  position: number;
  created_at: string;
  updated_at: string;
  // Join fields
  module_name?: string;
  module_code?: string;
}