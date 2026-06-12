export interface AgendaProfissional {
  id: string;
  nome: string;
  whatsapp: string | null;
  unit_id?: string | null;
  habilidade?: string | null;
  status?: string | null;
}