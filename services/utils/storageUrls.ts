/**
 * URLs de Storage do Supabase — centralizadas
 *
 * Todas as URLs de arquivos do bucket "mb-docs" são montadas dinamicamente
 * a partir da VITE_SUPABASE_URL do ambiente atual (dev ou produção).
 *
 * Uso:
 *   import { STORAGE } from '../services/utils/storageUrls';
 *   <img src={STORAGE.header} />
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/mb-docs`;

export const STORAGE = {
  // Header dos documentos PDF (contrato, aditamento, termo, etc.)
  header: `${STORAGE_BASE}/cabe-mb-doc.png`,

  // Imagens do pipeline de recrutamento
  qualificadas: `${STORAGE_BASE}/QUALIFICADAS.png`,
  contato: `${STORAGE_BASE}/CONTATO.png`,
  envioDoc: `${STORAGE_BASE}/ENVDOCS.png`,
  truora: `${STORAGE_BASE}/TRUORA.png`,
  treinamento: `${STORAGE_BASE}/TREINAMENTOS.png`,
  finalizado: `${STORAGE_BASE}/FINALIZADOS.png`,
  naoAprovadas: `${STORAGE_BASE}/NAOAPROV.png`,
  desistentes: `${STORAGE_BASE}/DESISTENTES.png`,
};
