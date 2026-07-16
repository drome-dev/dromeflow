import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabaseClient';
import {
   getProfissionaisLivres,
   getDisponibilidades
} from '../../../services/agenda/agenda.service';
import { getAgendaErrorMessage } from '../../../services/agenda/agenda.errors';
import { fetchAppointmentsRange } from '../../../services/data/dataTable.service';
import { getUnitServices } from '../../../services/units/unitServices.service';
import { formatLocalISO } from '../helpers';
import { toAgendaAtendimentos } from '../adapters';
import type { AgendaAtendimento, AgendaDisponibilidade, AgendaProfissional, AgendaSettings, UnitService } from '../../../types';

type AgendaSelectedUnit = {
   id: string;
   unit_name?: string;
   unit_code: string;
};

type ActiveAgendaDataTab = 'gestao' | 'configuracoes';

type AgendaDataResult = {
   configSettings: AgendaSettings | null;
   unitServicesList: UnitService[];
   todasProfissionais: AgendaProfissional[];
   todasDisponibilidades: AgendaDisponibilidade[];
   profissionaisLivres: AgendaDisponibilidade[];
   atendimentosSemana: AgendaAtendimento[];
   atendimentosDia: AgendaAtendimento[];
   dispSemanaCount: number;
};

const DEFAULT_DATA: AgendaDataResult = {
   configSettings: null,
   unitServicesList: [],
   todasProfissionais: [],
   todasDisponibilidades: [],
   profissionaisLivres: [],
   atendimentosSemana: [],
   atendimentosDia: [],
   dispSemanaCount: 0,
};

const agendaDataQueryKey = (unitId?: string, tab?: ActiveAgendaDataTab, dateISO?: string) => [
   'agenda',
   'data',
   unitId ?? 'no-unit',
   tab ?? 'no-tab',
   dateISO ?? 'no-date',
] as const;

const getWeekRange = (selectedDate: Date) => {
   const startOfWeekDate = new Date(selectedDate);
   startOfWeekDate.setDate(selectedDate.getDate() - selectedDate.getDay());
   const endOfWeekDate = new Date(selectedDate);
   endOfWeekDate.setDate(selectedDate.getDate() - selectedDate.getDay() + 6);
   return {
      startISO: formatLocalISO(startOfWeekDate),
      endISO: formatLocalISO(endOfWeekDate),
   };
};

const fetchSettings = async (unitId: string): Promise<AgendaSettings> => {
   const { data, error } = await supabase
      .from('agenda_settings')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

   if (error) throw error;
   return data || { id: null, unit_id: unitId, dias_liberados: [], periodos_cadastrados: [], is_link_active: false };
};

const fetchProfissionaisConfig = async (unitId: string) => {
   const [profsResult, dispResult] = await Promise.all([
      supabase
         .from('profissionais')
         .select('id, nome, whatsapp, habilidade, status, unit_id')
         .eq('unit_id', unitId)
         .or('status.ilike.ativo,status.ilike.ativa,status.is.null')
         .order('nome'),
       supabase
          .from('agenda_disponibilidade')
          .select('*, profissional:profissionais(id, nome, whatsapp, habilidade, status, unit_id)')
          .eq('unit_id', unitId)
          .order('data', { ascending: false })
          .limit(10000),
   ]);

   if (profsResult.error) throw profsResult.error;
   if (dispResult.error) throw dispResult.error;

   return {
      todasProfissionais: (profsResult.data ?? []) as AgendaProfissional[],
      todasDisponibilidades: (dispResult.data ?? []) as AgendaDisponibilidade[],
   };
};

export const useAgendaData = (
   selectedUnit: AgendaSelectedUnit | null | undefined,
   selectedDate: Date,
   activeTab: ActiveAgendaDataTab
) => {
   const queryClient = useQueryClient();
   const dataFormatada = useMemo(() => formatLocalISO(selectedDate), [selectedDate]);
   const enabled = Boolean(selectedUnit?.id && selectedUnit.id !== 'ALL');

   const agendaQuery = useQuery<AgendaDataResult>({
      queryKey: agendaDataQueryKey(selectedUnit?.id, activeTab, dataFormatada),
      enabled,
      queryFn: async () => {
         if (!selectedUnit?.id || selectedUnit.id === 'ALL') return DEFAULT_DATA;

         const metadataPromise = fetchProfissionaisConfig(selectedUnit.id);

         if (activeTab === 'configuracoes') {
            const [settings, services, metadata] = await Promise.all([
               fetchSettings(selectedUnit.id),
               getUnitServices(selectedUnit.id),
               metadataPromise,
            ]);

            return {
               ...DEFAULT_DATA,
               configSettings: settings,
               unitServicesList: services,
               todasProfissionais: metadata.todasProfissionais,
               todasDisponibilidades: metadata.todasDisponibilidades,
            };
         }

         const { startISO, endISO } = getWeekRange(selectedDate);
         const [metadata, livres, weekAptsRaw, weekDisps] = await Promise.all([
            metadataPromise,
            getProfissionaisLivres(selectedUnit.id, dataFormatada),
            fetchAppointmentsRange(selectedUnit.unit_code, startISO, endISO),
            getDisponibilidades(selectedUnit.id, startISO, endISO)
         ]);

         const weekApts = toAgendaAtendimentos(weekAptsRaw || []);
         const atendimentosDia = weekApts.filter(a => {
            const aDate = typeof a.DATA === 'string' && a.DATA.includes('T') ? a.DATA.split('T')[0] : a.DATA;
            return aDate === dataFormatada;
         });

         const dispSemanaCount = (weekDisps || []).filter(d =>
            d.status_manha === 'LIVRE' || d.status_tarde === 'LIVRE'
         ).length;

         return {
            ...DEFAULT_DATA,
            configSettings: null,
            todasProfissionais: metadata.todasProfissionais,
            todasDisponibilidades: weekDisps || [],
            profissionaisLivres: livres || [],
            atendimentosSemana: weekApts,
            atendimentosDia,
            dispSemanaCount,
         };
      },
   });

   const invalidateAgendaData = useCallback(async () => {
      await queryClient.invalidateQueries({ queryKey: ['agenda', 'data', selectedUnit?.id] });
   }, [queryClient, selectedUnit?.id]);

   useEffect(() => {
      if (!enabled || !selectedUnit?.id) return;
      const channel = supabase
         .channel('schema-db-changes')
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agenda_disponibilidade', filter: `unit_id=eq.${selectedUnit.id}` },
            () => invalidateAgendaData()
         )
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agenda_settings', filter: `unit_id=eq.${selectedUnit.id}` },
            () => invalidateAgendaData()
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [enabled, selectedUnit?.id, invalidateAgendaData]);

   const refetchAgendaData = useCallback(async () => {
      await agendaQuery.refetch();
   }, [agendaQuery]);

   return {
      loading: agendaQuery.isFetching,
      error: agendaQuery.error ? getAgendaErrorMessage(agendaQuery.error) : null,
      configSettings: agendaQuery.data?.configSettings ?? null,
      setConfigSettings: () => undefined,
      unitServicesList: agendaQuery.data?.unitServicesList ?? [],
      todasProfissionais: agendaQuery.data?.todasProfissionais ?? [],
      todasDisponibilidades: agendaQuery.data?.todasDisponibilidades ?? [],
      profissionaisLivres: agendaQuery.data?.profissionaisLivres ?? [],
      atendimentosSemana: agendaQuery.data?.atendimentosSemana ?? [],
      atendimentosDia: agendaQuery.data?.atendimentosDia ?? [],
      dispSemanaCount: agendaQuery.data?.dispSemanaCount ?? 0,
      reloadGestaoData: refetchAgendaData,
      reloadProfissionaisConfig: refetchAgendaData
   };
};
