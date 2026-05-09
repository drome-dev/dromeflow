import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabaseClient';
import { formatLocalISO, getWeekDates } from '../helpers';
import {
   getProfissionaisLivres,
   getDisponibilidades,
} from '../../../services/agenda/agenda.service';
import { getAgendaErrorMessage } from '../../../services/agenda/agenda.errors';
import { fetchAppointmentsRange } from '../../../services/data/dataTable.service';
import { AGENDA_TURNO_DIVISOR_HOUR } from '../../../constants/agenda';
import type { AgendaAtendimento, AgendaDisponibilidade } from '../../../types';
import { toAgendaAtendimentos } from '../adapters';

type AgendaSelectedUnit = {
   id: string;
   unit_name?: string;
   unit_code: string;
};

type AgendaPrincipalQueryData = {
   profissionaisLivres: AgendaDisponibilidade[];
   atendimentosDia: AgendaAtendimento[];
   atendimentosSemana: AgendaAtendimento[];
   todasDisponibilidades: AgendaDisponibilidade[];
};

const getAgendaPrincipalQueryKey = (unitId?: string, dateISO?: string) => [
   'agenda',
   'principal',
   unitId ?? 'no-unit',
   dateISO ?? 'no-date',
] as const;

const isFreeMorningStatus = (status: unknown) =>
   status === 'LIVRE' || status === '4 horas manhã' || status === '6 horas' || status === '8 horas';

const isFreeAfternoonStatus = (status: unknown) =>
   status === 'LIVRE' || status === '4 horas tarde' || status === '6 horas' || status === '8 horas';

export const useAgendaPrincipal = (selectedUnit: AgendaSelectedUnit | null | undefined) => {
   const queryClient = useQueryClient();
   const [selectedDate, setSelectedDate] = useState(new Date());
   const [profissionaisLivres, setProfissionaisLivres] = useState<AgendaDisponibilidade[]>([]);
   const [atendimentosDia, setAtendimentosDia] = useState<AgendaAtendimento[]>([]);
   const [atendimentosSemana, setAtendimentosSemana] = useState<AgendaAtendimento[]>([]);
   const [todasDisponibilidades, setTodasDisponibilidades] = useState<AgendaDisponibilidade[]>([]);
   const [statusMenu, setStatusMenu] = useState<{ profId: string, period: 'M' | 'T', dateStr: string } | null>(null);
   const [selectedProfDetails, setSelectedProfDetails] = useState<AgendaDisponibilidade | null>(null);
   const [filterSemProfissional, setFilterSemProfissional] = useState(false);
   const [activeMetricPeriod, setActiveMetricPeriod] = useState<'d7' | 'd30' | 'geral'>('d7');
   const [profMetricas, setProfMetricas] = useState<Record<string, any>>({});

   const weekDatesMap = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
   const dateISO = useMemo(() => formatLocalISO(selectedDate), [selectedDate]);
   const agendaEnabled = Boolean(selectedUnit?.id && selectedUnit.id !== 'ALL' && selectedUnit.unit_code);

   const agendaQuery = useQuery<AgendaPrincipalQueryData>({
      queryKey: getAgendaPrincipalQueryKey(selectedUnit?.id, dateISO),
      enabled: agendaEnabled,
      queryFn: async () => {
         if (!selectedUnit?.id || !selectedUnit.unit_code) {
            return {
               profissionaisLivres: [],
               atendimentosDia: [],
               atendimentosSemana: [],
               todasDisponibilidades: [],
            };
         }

         const startISO = weekDatesMap[0].iso;
         const endISO = weekDatesMap[6].iso;

         const [livresRaw, weekApts, weekDisps] = await Promise.all([
            getProfissionaisLivres(selectedUnit.id, dateISO),
            fetchAppointmentsRange(selectedUnit.unit_code, startISO, endISO),
            getDisponibilidades(selectedUnit.id, startISO, endISO)
         ]);

         const apts = toAgendaAtendimentos(weekApts || []);

         // Segurança operacional: a lista lateral precisa refletir agendamentos reais e bloqueios manuais.
         const livresProfsFix = (livresRaw || []).filter((lp) => {
            const hasAtendimento = apts.some((a) => {
               const aDate = typeof a.DATA === 'string' && a.DATA.includes('T') ? a.DATA.split('T')[0] : a.DATA;
               const lpNome = (lp.profissional?.nome || '').trim().toLowerCase();
               const atProf = (a.PROFISSIONAL || '').trim().toLowerCase();
               return aDate === dateISO && Boolean(a.PROFISSIONAL) && atProf === lpNome;
            });

            const isBlocked = lp.status_manha === 'RESERVA' || lp.status_tarde === 'RESERVA' ||
                             lp.status_manha === 'CANCELOU' || lp.status_tarde === 'CANCELOU' ||
                             lp.status_manha === 'FALTOU' || lp.status_tarde === 'FALTOU';

            if (hasAtendimento || isBlocked) return false;

            const isToday = dateISO === formatLocalISO(new Date());
            if (isToday) {
               const now = new Date();
               const currentHour = now.getHours() + (now.getMinutes() / 60);
               const isManhaSolo = isFreeMorningStatus(lp.status_manha) && !isFreeAfternoonStatus(lp.status_tarde);
               if (isManhaSolo && currentHour >= AGENDA_TURNO_DIVISOR_HOUR) return false;
            }

            return true;
         });

         const uniqueLivres = Array.from(
            livresProfsFix.reduce((map: Map<string, AgendaDisponibilidade>, item) => {
               if (!map.has(item.profissional_id)) map.set(item.profissional_id, item);
               return map;
            }, new Map()).values()
         );

         const getWeight = (disp: AgendaDisponibilidade) => {
            const p = disp.periodos || [];
            if (p.includes('4 horas manhã')) return 1;
            if (p.includes('4 horas tarde')) return 2;
            if (p.includes('6 horas')) return 3;
            if (p.includes('8 horas')) return 4;
            return 99;
         };

         uniqueLivres.sort((a, b) => {
            const wA = getWeight(a);
            const wB = getWeight(b);
            if (wA !== wB) return wA - wB;
            return (a.profissional?.nome || '').localeCompare(b.profissional?.nome || '');
         });

         const dayAppointments = apts
            .filter((a) => {
               const aDate = typeof a.DATA === 'string' && a.DATA.includes('T') ? a.DATA.split('T')[0] : a.DATA;
               return aDate === dateISO;
            })
            .sort((a, b) => {
               const hasA = Boolean(a.PROFISSIONAL && a.PROFISSIONAL.trim());
               const hasB = Boolean(b.PROFISSIONAL && b.PROFISSIONAL.trim());
               if (hasA !== hasB) return hasA ? 1 : -1;
               return (a.HORARIO || '').localeCompare(b.HORARIO || '');
            });

         return {
            profissionaisLivres: uniqueLivres,
            atendimentosDia: dayAppointments,
            atendimentosSemana: apts,
            todasDisponibilidades: weekDisps || [],
         };
      },
   });

   useEffect(() => {
      if (!agendaQuery.data) return;
      setProfissionaisLivres(agendaQuery.data.profissionaisLivres);
      setAtendimentosDia(agendaQuery.data.atendimentosDia);
      setAtendimentosSemana(agendaQuery.data.atendimentosSemana);
      setTodasDisponibilidades(agendaQuery.data.todasDisponibilidades);
   }, [agendaQuery.data]);

   useEffect(() => {
      if (!agendaEnabled || !selectedUnit?.id) return;

      const channel = supabase
         .channel('agenda_principal_changes')
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agenda_disponibilidade', filter: `unit_id=eq.${selectedUnit.id}` },
            () => queryClient.invalidateQueries({ queryKey: ['agenda', 'principal', selectedUnit.id] })
         )
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'atendimentos', filter: `unidade=eq.${selectedUnit.id}` },
            () => queryClient.invalidateQueries({ queryKey: ['agenda', 'principal', selectedUnit.id] })
         )
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'processed_data', filter: `unit_id=eq.${selectedUnit.id}` },
            () => queryClient.invalidateQueries({ queryKey: ['agenda', 'principal', selectedUnit.id] })
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [agendaEnabled, selectedUnit?.id, queryClient]);

   const loadProfissionalMetrics = async (profId: string, profNome: string) => {
      try {
         const response = await fetch(`${window.location.origin}/api/metrics/professional?id=${profId}&nome=${encodeURIComponent(profNome)}&unit_id=${selectedUnit?.id}`);
         if (!response.ok) throw new Error('Falha ao carregar métricas');
         const data = await response.json();
         setProfMetricas(prev => ({ ...prev, [profId]: data }));
      } catch (err) {
         // Métricas são informação auxiliar; mantemos a agenda funcional se falhar.
         console.error('Erro ao carregar métricas do profissional:', err);
      }
   };

   const refreshData = useCallback(async () => {
      await agendaQuery.refetch();
   }, [agendaQuery]);

   return {
      loading: agendaQuery.isFetching,
      error: agendaQuery.error ? getAgendaErrorMessage(agendaQuery.error) : null,
      selectedDate, setSelectedDate,
      weekDatesMap,
      profissionaisLivres,
      atendimentosDia, setAtendimentosDia,
      atendimentosSemana,
      todasDisponibilidades,
      statusMenu, setStatusMenu,
      selectedProfDetails, setSelectedProfDetails,
      filterSemProfissional, setFilterSemProfissional,
      activeMetricPeriod, setActiveMetricPeriod,
      profMetricas, loadProfissionalMetrics,
      refreshData
   };
};
