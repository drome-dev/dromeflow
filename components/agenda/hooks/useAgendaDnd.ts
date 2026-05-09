import type React from 'react';
import { useCallback } from 'react';
import { updateDataRecord } from '../../../services/data/dataTable.service';
import { syncProfissionalAvailability } from '../../../services/agenda/agenda.service';
import { checkPeriodCompatibility, formatLocalISO } from '../helpers';
import { supabase } from '../../../services/supabaseClient';
import type { AgendaAtendimento, AgendaDisponibilidade } from '../../../types';

type AgendaSelectedUnit = {
   id: string;
   unit_name?: string;
   unit_code?: string;
};

type AgendaDndState = {
   selectedDate: Date;
   atendimentosDia: AgendaAtendimento[];
   setAtendimentosDia: React.Dispatch<React.SetStateAction<AgendaAtendimento[]>>;
   refreshData: () => Promise<unknown>;
};

type DragProfissionalPayload = {
   type: 'profissional';
   nome: string;
   periodos: string[];
};

type DragRemovePayload = {
   type: 'remove_profissional';
   atendimentoId: string | number;
};

type DragPayload = DragProfissionalPayload | DragRemovePayload;

const parseDragPayload = (raw: string): DragPayload | null => {
   try {
      const parsed = JSON.parse(raw) as Partial<DragPayload>;
      if (parsed.type === 'profissional' && typeof parsed.nome === 'string') {
         return { type: 'profissional', nome: parsed.nome, periodos: parsed.periodos ?? [] };
      }
      if (parsed.type === 'remove_profissional' && parsed.atendimentoId) {
         return { type: 'remove_profissional', atendimentoId: parsed.atendimentoId };
      }
      return null;
   } catch {
      return null;
   }
};

const getAtendimentoId = (atendimento: AgendaAtendimento): string | number | undefined => {
   return atendimento.id ?? atendimento.ATENDIMENTO_ID;
};

const sameAtendimento = (a: AgendaAtendimento, b: AgendaAtendimento | string | number): boolean => {
   const left = getAtendimentoId(a)?.toString();
   const right = typeof b === 'object' ? getAtendimentoId(b)?.toString() : b.toString();
   return Boolean(left && right && left === right);
};

export const useAgendaDnd = (selectedUnit: AgendaSelectedUnit | null | undefined, agenda: AgendaDndState) => {
   const { selectedDate, atendimentosDia, setAtendimentosDia, refreshData } = agenda;

   const handleDragStartProfissional = (e: React.DragEvent, profissional: AgendaDisponibilidade) => {
      e.dataTransfer.setData('application/json', JSON.stringify({
         type: 'profissional',
         nome: profissional.profissional?.nome,
         periodos: profissional.periodos ?? []
      } satisfies DragProfissionalPayload));
   };

   const handleDragStartRemoveProfissional = (e: React.DragEvent, atendimento: AgendaAtendimento) => {
      const atendimentoId = getAtendimentoId(atendimento);
      if (!atendimentoId) return;
      e.dataTransfer.setData('application/json', JSON.stringify({
         type: 'remove_profissional',
         atendimentoId
      } satisfies DragRemovePayload));
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
   };

   const handleDropOnAtendimento = useCallback(async (e: React.DragEvent, atendimento: AgendaAtendimento) => {
      e.preventDefault();
      if (!selectedUnit?.id || selectedUnit.id === 'ALL') return;

      try {
         const payload = parseDragPayload(e.dataTransfer.getData('application/json'));
         if (!payload || payload.type !== 'profissional' || !payload.nome) return;

         const recordId = getAtendimentoId(atendimento);
         if (!recordId) return;

         const periodoAtendimento = parseFloat(atendimento['PERÍODO']?.toString().replace(',', '.') || '0');
         const periodosProf = payload.periodos ?? [];

         if (periodosProf.length > 0 && periodoAtendimento > 0) {
            const { compativel, motivo } = checkPeriodCompatibility(periodoAtendimento, periodosProf);
            if (!compativel) {
               alert(`⚠️ Período incompatível\n\n${motivo}`);
               return;
            }
         }

         await updateDataRecord(recordId.toString(), { profissional: payload.nome });

         setAtendimentosDia(prev => prev.map(a =>
            sameAtendimento(a, atendimento)
               ? { ...a, PROFISSIONAL: payload.nome, profissional: payload.nome }
               : a
         ));

         const { data: profData } = await supabase
            .from('profissionais')
            .select('id, nome')
            .eq('unit_id', selectedUnit.id)
            .ilike('nome', payload.nome)
            .maybeSingle();

         if (profData) {
            await syncProfissionalAvailability(
               selectedUnit.id,
               profData.id,
               payload.nome,
               formatLocalISO(selectedDate)
            );
            await refreshData();
         }
      } catch (err) {
         console.error('Erro no Drop:', err);
      }
   }, [selectedUnit, selectedDate, setAtendimentosDia, refreshData]);

   const handleDropToProfissionais = useCallback(async (e: React.DragEvent) => {
      e.preventDefault();
      if (!selectedUnit?.id || selectedUnit.id === 'ALL') return;

      try {
         const payload = parseDragPayload(e.dataTransfer.getData('application/json'));
         if (!payload || payload.type !== 'remove_profissional') return;

         await updateDataRecord(payload.atendimentoId.toString(), { profissional: null });

         setAtendimentosDia(prev => prev.map(a =>
            sameAtendimento(a, payload.atendimentoId)
               ? { ...a, PROFISSIONAL: null, profissional: null }
               : a
         ));

         const atendimentoOriginal = atendimentosDia.find(a => sameAtendimento(a, payload.atendimentoId));
         const profissionalNome = atendimentoOriginal?.PROFISSIONAL ?? atendimentoOriginal?.profissional;

         if (profissionalNome) {
            const { data: profData } = await supabase
               .from('profissionais')
               .select('id, nome')
               .eq('unit_id', selectedUnit.id)
               .ilike('nome', profissionalNome)
               .maybeSingle();

            if (profData) {
               await syncProfissionalAvailability(
                  selectedUnit.id,
                  profData.id,
                  profissionalNome,
                  formatLocalISO(selectedDate)
               );
               await refreshData();
            }
         }
      } catch (err) {
         console.error('Erro no Drop para remover:', err);
      }
   }, [selectedUnit, selectedDate, atendimentosDia, setAtendimentosDia, refreshData]);

   return {
      handleDragStartProfissional,
      handleDragStartRemoveProfissional,
      handleDragOver,
      handleDropOnAtendimento,
      handleDropToProfissionais
   };
};
