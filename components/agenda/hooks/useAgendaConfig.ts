import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabaseClient';
import { saveAgendaSettings } from '../../../services/agenda/agenda.service';
import { getAgendaErrorMessage } from '../../../services/agenda/agenda.errors';
import { AGENDA_PERIODS } from '../../../constants/agenda';
import { MOBILE_STATUS_OPTIONS } from '../constants';
import type { AgendaDisponibilidade, AgendaProfissional, AgendaSettings, AgendaStatusTurno } from '../../../types';

type AgendaSelectedUnit = {
   id: string;
   unit_name?: string;
   unit_code?: string;
};

type AgendaConfigData = {
   configSettings: AgendaSettings;
   todasProfissionais: AgendaProfissional[];
   todasDisponibilidades: AgendaDisponibilidade[];
};

type AgendaStatusUpdate = {
   unit_id: string;
   profissional_id: string;
   data: string;
   settings_id: string | null;
   periodos: string[];
   status_manha?: AgendaStatusTurno;
   status_tarde?: AgendaStatusTurno;
   conflito: boolean;
   is_manual: boolean;
};

const DEFAULT_CONFIG_SETTINGS: AgendaSettings = {
   id: null,
   unit_id: '',
   dias_liberados: [],
   periodos_cadastrados: [],
   is_link_active: false,
};

const agendaConfigQueryKey = (unitId?: string) => ['agenda', 'config', unitId ?? 'no-unit'] as const;

const getVisibleSettings = (settingsList: AgendaSettings[] | null): AgendaSettings | null => {
   if (!settingsList || settingsList.length === 0) return null;
   const mostRecent = settingsList[0];
   const lastWithDays = settingsList.find(s => Array.isArray(s.dias_liberados) && s.dias_liberados.length > 0);
   return lastWithDays || mostRecent;
};

export const useAgendaConfig = (selectedUnit: AgendaSelectedUnit | null | undefined) => {
   const queryClient = useQueryClient();
   const [configSettingsDraft, setConfigSettingsDraft] = useState<AgendaSettings>(DEFAULT_CONFIG_SETTINGS);

   // Métricas e Estados Visuais de Configuração
   const [profMetricas, setProfMetricas] = useState<Record<string, any>>({});
   const [profWithMetrics, setProfWithMetrics] = useState<string | null>(null);
   const [activeFilter, setActiveFilter] = useState('TODOS');
   const [profSearchTerm, setProfSearchTerm] = useState('');
   const [calendarViewDate, setCalendarViewDate] = useState(new Date());

   const enabled = Boolean(selectedUnit?.id && selectedUnit.id !== 'ALL');

   const configQuery = useQuery<AgendaConfigData>({
      queryKey: agendaConfigQueryKey(selectedUnit?.id),
      enabled,
      queryFn: async () => {
         if (!selectedUnit?.id || selectedUnit.id === 'ALL') {
            return {
               configSettings: DEFAULT_CONFIG_SETTINGS,
               todasProfissionais: [],
               todasDisponibilidades: [],
            };
         }

         const [settingsResult, profissionaisResult, disponibilidadesResult] = await Promise.all([
            supabase
               .from('agenda_settings')
               .select('*')
               .eq('unit_id', selectedUnit.id)
               .order('created_at', { ascending: false })
               .limit(10),
            supabase
               .from('profissionais')
               .select('id, nome, whatsapp, habilidade, status, unit_id')
               .eq('unit_id', selectedUnit.id)
               .or('status.ilike.ativo,status.ilike.ativa,status.is.null')
               .order('nome'),
            supabase
               .from('agenda_disponibilidade')
               .select('*, profissional:profissionais(id, nome, whatsapp, habilidade, status, unit_id)')
               .eq('unit_id', selectedUnit.id),
         ]);

         if (settingsResult.error) throw settingsResult.error;
         if (profissionaisResult.error) throw profissionaisResult.error;
         if (disponibilidadesResult.error) throw disponibilidadesResult.error;

         const visibleSettings = getVisibleSettings((settingsResult.data ?? []) as AgendaSettings[]);

         return {
            configSettings: visibleSettings || { ...DEFAULT_CONFIG_SETTINGS, unit_id: selectedUnit.id },
            todasProfissionais: (profissionaisResult.data ?? []) as AgendaProfissional[],
            todasDisponibilidades: (disponibilidadesResult.data ?? []) as AgendaDisponibilidade[],
         };
      },
   });

   useEffect(() => {
      if (configQuery.data?.configSettings) {
         setConfigSettingsDraft(configQuery.data.configSettings);
      }
   }, [configQuery.data?.configSettings]);

   const invalidateConfig = useCallback(async () => {
      await queryClient.invalidateQueries({ queryKey: agendaConfigQueryKey(selectedUnit?.id) });
   }, [queryClient, selectedUnit?.id]);

   const statusMutation = useMutation({
      mutationFn: async (updateData: AgendaStatusUpdate) => {
         const { error } = await supabase
            .from('agenda_disponibilidade')
            .upsert(updateData, { onConflict: 'settings_id,profissional_id,data' });

         if (error) throw error;
      },
      onSuccess: invalidateConfig,
   });

   const settingsMutation = useMutation({
      mutationFn: async (newSettings: AgendaSettings) => {
         if (!selectedUnit?.id || selectedUnit.id === 'ALL') return null;
         return saveAgendaSettings(selectedUnit.id, newSettings);
      },
      onSuccess: async (_saved, newSettings) => {
         setConfigSettingsDraft(newSettings);
         await invalidateConfig();
      },
   });

   useEffect(() => {
      if (!enabled || !selectedUnit?.id) return;
      const channel = supabase
         .channel('agenda_config_changes')
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agenda_disponibilidade', filter: `unit_id=eq.${selectedUnit.id}` },
            () => invalidateConfig()
         )
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agenda_settings', filter: `unit_id=eq.${selectedUnit.id}` },
            () => invalidateConfig()
         )
         .subscribe();
      return () => { supabase.removeChannel(channel); };
   }, [enabled, selectedUnit?.id, invalidateConfig]);

   const handleStatusUpdate = async (profId: string, status: string, periodo: 'M' | 'T', dateStr: string) => {
      if (!selectedUnit?.id || selectedUnit.id === 'ALL') return;

      const currentDisp = (configQuery.data?.todasDisponibilidades ?? [])
         .find(d => d.profissional_id === profId && d.data.includes(dateStr));
      const prevPeriodos = currentDisp?.periodos || [];
      const isFullDay = prevPeriodos?.some((p: string) => p === '8 horas' || p === '6 horas');

      const updateData: AgendaStatusUpdate = {
         unit_id: selectedUnit.id,
         profissional_id: profId,
         data: dateStr,
         settings_id: configSettingsDraft?.id ?? null,
         periodos: prevPeriodos,
         conflito: false,
         is_manual: true,
      };

      if (status === 'LIMPAR') {
         updateData.status_manha = null;
         updateData.status_tarde = null;
         updateData.periodos = [];
         updateData.is_manual = false;
      } else if ((MOBILE_STATUS_OPTIONS as readonly string[]).includes(status)) {
         // Admin selected a period option (same as profissionais can choose via AgendaExternaPage)
         // Derive status_manha/status_tarde consistently with saveDisponibilidades()
         const periodos = [status];
         const isNao = periodos.some(p => AGENDA_PERIODS.NAO.includes(p as never));
         const hasManha = periodos.some(p => AGENDA_PERIODS.MANHA.includes(p as never));
         const hasTarde = periodos.some(p => AGENDA_PERIODS.TARDE.includes(p as never));

         if (isNao) {
            updateData.status_manha = 'NÃO';
            updateData.status_tarde = 'NÃO';
         } else {
            if (hasManha) {
               updateData.status_manha = 'LIVRE';
            } else if (status === '4 horas tarde') {
               updateData.status_manha = 'NÃO';
            }

            if (hasTarde) {
               updateData.status_tarde = 'LIVRE';
            } else if (status === '4 horas manhã') {
               updateData.status_tarde = 'NÃO';
            }
         }
         updateData.periodos = periodos;
      } else if (isFullDay && ['RESERVA', 'CANCELOU', 'FALTOU', 'LIVRE', 'NÃO'].includes(status)) {
         // Manual status applied to a full-day entry — apply to both periods
         updateData.status_manha = status as AgendaStatusTurno;
         updateData.status_tarde = status as AgendaStatusTurno;
      } else if (periodo === 'M') {
         updateData.status_manha = status as AgendaStatusTurno;
      } else {
         updateData.status_tarde = status as AgendaStatusTurno;
      }

      await statusMutation.mutateAsync(updateData);
   };

   const loadProfissionalMetrics = async (profId: string, profNome: string) => {
      if (!selectedUnit?.id || selectedUnit.id === 'ALL') return;
      try {
         const response = await fetch(`${window.location.origin}/api/metrics/professional?id=${profId}&nome=${encodeURIComponent(profNome)}&unit_id=${selectedUnit.id}`);
         if (!response.ok) throw new Error('Falha ao carregar métricas');
         const data = await response.json();
         setProfMetricas(prev => ({ ...prev, [profId]: data }));
      } catch (err) {
         console.error('Erro ao carregar métricas do profissional:', err);
      }
   };

   const handleSaveSettings = async (newSettings: AgendaSettings) => {
      try {
         await settingsMutation.mutateAsync(newSettings);
      } catch (err) {
         console.error('Erro ao salvar as configurações da agenda', err);
         alert(getAgendaErrorMessage(err, 'Erro ao salvar as configurações.'));
      }
   };

   const queryData = configQuery.data;

   return {
      configSettings: configSettingsDraft,
      setConfigSettings: setConfigSettingsDraft,
      todasProfissionais: queryData?.todasProfissionais ?? [],
      todasDisponibilidades: queryData?.todasDisponibilidades ?? [],
      isSavingConfig: settingsMutation.isPending,
      hasSynced: Boolean(queryData),
      loading: configQuery.isFetching,
      error: configQuery.error ? getAgendaErrorMessage(configQuery.error) : null,
      profMetricas,
      profWithMetrics, setProfWithMetrics,
      activeFilter, setActiveFilter,
      profSearchTerm, setProfSearchTerm,
      calendarViewDate, setCalendarViewDate,
      handleStatusUpdate,
      handleSaveSettings,
      refreshConfig: invalidateConfig
   };
};
