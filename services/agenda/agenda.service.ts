import { supabase } from '../supabaseClient';
import type { AgendaAuthResult, AgendaSettings, AgendaDisponibilidade, AgendaAtendimento } from '../../types';
import { AGENDA_BLOCKING_STATUSES, AGENDA_PERIODS, DEFAULT_AGENDA_PERIODS, PUBLIC_AGENDA_DEFAULT_PERIODS } from '../../constants/agenda';
import { createLogger } from '../utils/log';
import { AgendaServiceError, toAgendaServiceError } from './agenda.errors';
import {
  assertValidAgendaPeriods,
  assertValidDateRange,
  assertValidISODate,
  assertValidPhone,
  assertValidUnitSlug,
  assertValidUuid,
  normalizeBrazilianPhone,
} from './agenda.validation';

const logger = createLogger('agenda.service');
const FREE_AGENDA_STATUSES = ['LIVRE', ...DEFAULT_AGENDA_PERIODS] as const;

const isFreeAgendaStatus = (status: unknown): boolean =>
  FREE_AGENDA_STATUSES.includes(status as never);

// ============================================================================
// Configurações da Unidade (Gestão)
// ============================================================================

/**
 * Busca as configurações da agenda para uma unidade.
 * Se não existir, retorna a configuração "default" não salva.
 */
export const getAgendaSettings = async (unitId: string): Promise<AgendaSettings | null> => {
  assertValidUuid(unitId, 'Unidade');

  const { data, error } = await supabase
    .from('agenda_settings')
    .select('*')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Erro ao buscar configurações da agenda', { unitId, error });
    throw new AgendaServiceError('SUPABASE_ERROR', 'Não foi possível carregar as configurações da agenda.', error);
  }

  return data || null;
};

/**
 * Salva (cria ou atualiza) as configurações da agenda para uma unidade.
 */
export const saveAgendaSettings = async (
  unitId: string,
  settingsData: Partial<AgendaSettings>
): Promise<AgendaSettings> => {
  assertValidUuid(unitId, 'Unidade');
  if (settingsData.periodos_cadastrados) {
    assertValidAgendaPeriods(settingsData.periodos_cadastrados);
  }

  // Dados limpos para salvar, pegando apenas o que interessa
  const payload = {
    unit_id: unitId,
    dias_liberados: settingsData.dias_liberados || [],
    periodos_cadastrados: settingsData.periodos_cadastrados || [...DEFAULT_AGENDA_PERIODS],
    is_link_active: settingsData.is_link_active ?? true,
    updated_at: new Date().toISOString()
  };

  // Desativa versões anteriores da mesma unidade (não-sistema) antes de criar a nova
  const { error: deactivateError } = await supabase
    .from('agenda_settings')
    .update({ is_link_active: false })
    .eq('unit_id', unitId)
    .eq('is_system', false);

  if (deactivateError) {
    logger.error('Erro ao desativar versões anteriores da agenda', { unitId, error: deactivateError });
    throw new AgendaServiceError('SAVE_FAILED', 'Não foi possível atualizar a configuração anterior da agenda.', deactivateError);
  }

  const { data, error } = await supabase
    .from('agenda_settings')
    .insert([{ ...payload, is_link_active: true }])
    .select()
    .single();

  if (error) {
    logger.error('Erro ao salvar agenda_settings', { unitId, error });
    throw new AgendaServiceError('SAVE_FAILED', 'Não foi possível salvar as configurações da agenda.', error);
  }

  return data;
};


// ============================================================================
// Operações do Public/Link (Profissionais)
// ============================================================================

/**
 * Valida o telefone da profissional verificando se pertence à unidade acessada.
 */
export const authenticateProfissional = async (
  telefone: string,
  unitSlug: string
): Promise<AgendaAuthResult | null> => {
  const whatsLimpo = assertValidPhone(telefone);
  assertValidUnitSlug(unitSlug);

  // 2. Acha a unidade pelo slug (agora unit_code)
  const { data: unitData, error: unitError } = await supabase
    .from('units')
    .select('id, unit_name')
    .eq('unit_code', unitSlug)
    .single();

  if (unitError || !unitData) {
    throw new AgendaServiceError('UNIT_NOT_FOUND', 'Unidade não encontrada. Verifique o link.', unitError);
  }

  // 3. Busca profissionais da unidade e filtra localmente pelo telefone para ignorar máscaras (ex: () - ) no banco de dados.
  const { data: profsData, error: profsError } = await supabase
    .from('profissionais')
    .select('id, nome, whatsapp, unit_id')
    .eq('unit_id', unitData.id);

  if (profsError || !profsData) {
    throw new AgendaServiceError('SUPABASE_ERROR', 'Erro ao comunicar com o banco de dados.', profsError);
  }

  // Filtragem local a prova de falhas: limpa todos os espaços e símbolos tanto do input quanto do banco
  // Filtragem local a prova de falhas: compara apenas os dígitos finais para ignorar máscaras e DDI
  const profData = profsData.find(p => {
    if (!p.whatsapp) return false;
    const dbPhoneNoDDI = normalizeBrazilianPhone(p.whatsapp);

    // Comparações:
    // 1. Exato (sem DDI em ambos)
    // 2. Banco termina com o input (ex: banco tem 9º digito, input não; ou vice-versa)
    return dbPhoneNoDDI === whatsLimpo ||
      dbPhoneNoDDI.endsWith(whatsLimpo) ||
      whatsLimpo.endsWith(dbPhoneNoDDI);
  });

  if (!profData) {
    throw new AgendaServiceError('PROFESSIONAL_NOT_FOUND', 'O seu número de WhatsApp não foi encontrado ou não pertence a esta unidade.');
  }

  // 4. Acha a configuração ativa mais recente para esta unidade
  const { data: settingsData, error: settingsError } = await supabase
    .from('agenda_settings')
    .select('*')
    .eq('unit_id', unitData.id)
    .eq('is_link_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    throw new AgendaServiceError('SUPABASE_ERROR', 'Erro ao carregar a configuração ativa da agenda.', settingsError);
  }

  // Em vez de retornar erro, permitimos o acesso mas com nenhum dia liberado.
  // Isso permite mostrar uma tela digna de "Nenhuma agenda aberta no momento"
  const safeSettingsData = settingsData || {
    id: null,
    unit_id: unitData.id,
    dias_liberados: [],
    periodos_cadastrados: [],
    is_link_active: false
  };

  // 5. Verifica se a profissional já enviou a disponibilidade para os dias ativos
  //    Busca completa para mostrar o resumo do que foi enviado no app
  const { data: respostas, error: respError } = await supabase
    .from('agenda_disponibilidade')
    .select('data, periodos, status_manha, status_tarde')
    .eq('unit_id', unitData.id)
    .eq('profissional_id', profData.id)
    .in('data', safeSettingsData.dias_liberados || [])
    .order('data');

  if (respError) {
    throw new AgendaServiceError('SUPABASE_ERROR', 'Erro ao carregar disponibilidades já enviadas.', respError);
  }

  const disponibilidadeEnviada = (respostas ?? []) as AgendaAuthResult['disponibilidadeEnviada'];

  // Identifica quais dias dos 'liberados' ainda não foram respondidos
  const respondidosSet = new Set(disponibilidadeEnviada.map(r => r.data));
  const diasPendentes = (safeSettingsData.dias_liberados || []).filter((d: string) => !respondidosSet.has(d));

  // Só consideramos "já enviou" (bloqueado) se não houverem dias pendentes
  // Mas, se os dias pendentes estiverem zerados porque NENHUM dia foi liberado na agenda pelo admin,
  // nós consideramos que a própria agenda está vazia (bloqueia o envio de formulário mantendo na tela de resumo vazia)
  const jaEnviou = diasPendentes.length === 0;

  return {
    profissional: profData,
    configuracoes: safeSettingsData,
    unidade: unitData,
    jaEnviou,
    diasPendentes,
    disponibilidadeEnviada
  };
};

/**
 * Envia as disponibilidades da profissional.
 * Valida colisões com processos já agendados.
 */
export const saveDisponibilidades = async (
  unitId: string,
  profissionalId: string,
  profissionalNome: string,
  settingsId: string,
  disponibilidades: { data: string; periodos: string[] }[]
): Promise<void> => {
  assertValidUuid(unitId, 'Unidade');
  assertValidUuid(profissionalId, 'Profissional');
  assertValidUuid(settingsId, 'Configuração da agenda');
  if (!profissionalNome.trim()) {
    throw new AgendaServiceError('VALIDATION_ERROR', 'Nome da profissional inválido.');
  }
  disponibilidades.forEach(disp => {
    assertValidISODate(disp.data);
    assertValidAgendaPeriods(disp.periodos);
  });

  // Para cada item, inserimos e marcamos 'conflito' baseado numa query em processed_data

  const datas = disponibilidades.map(d => d.data);

  // Busca agendamentos nessa unidade/profissional nas datas selecionadas
  // Aqui assumimos que processed_data usa o NOME da profissional na coluna PROFISSIONAL
  const { data: rawAtendimentosData } = await supabase
    .from('processed_data')
    .select('data, servico, horario, periodo, status')
    .eq('unit_id', unitId)
    .eq('profissional', profissionalNome)
    .in('data', datas);

  const atendimentosMap = new Map<string, AgendaAtendimento[]>();
  if (rawAtendimentosData) {
    const atendimentosData = rawAtendimentosData.map(r => ({
      DATA: r.data,
      'SERVIÇO': r.servico,
      HORARIO: r.horario,
      'PERÍODO': r.periodo,
      STATUS: r.status
    }));
    atendimentosData.forEach((atendimento: AgendaAtendimento) => {
      // Ajuste para formato YYYY-MM-DD caso não esteja
      // Se 'DATA' já for YYYY-MM-DD apenas coloca no MAP
      const dataIso = typeof atendimento.DATA === 'string' && atendimento.DATA.includes('T')
        ? atendimento.DATA.split('T')[0]
        : atendimento.DATA;

      const arr = atendimentosMap.get(dataIso) || [];
      arr.push(atendimento);
      atendimentosMap.set(dataIso, arr);
    });
  }

  // Prepara o array de UPSERT
  const upsertRows = disponibilidades.map(disp => {

    // Analisa se os atendimentos ocupam a manhã ou tarde
    const ats = atendimentosMap.get(disp.data) || [];
    let ocupaManha = false;
    let ocupaTarde = false;

    ats.forEach(at => {
      if (at.STATUS === 'CANCELADO' || at.STATUS === 'REAGENDADO') return; // Ignora cancelados
      if (at.HORARIO) {
        const [h, m] = at.HORARIO.split(':').map(Number);
        const duracao = parseFloat(at['PERÍODO']?.toString().replace(',', '.') || '1');
        const start = h + ((m || 0) / 60);
        const end = start + duracao;

        if (start < 13) ocupaManha = true;
        if (end > 13) ocupaTarde = true;
      }
    });

    const isNao = disp.periodos.some(p => AGENDA_PERIODS.NAO.includes(p as never));
    const hasManha = disp.periodos.some(p => AGENDA_PERIODS.MANHA.includes(p as never));
    const hasTarde = disp.periodos.some(p => AGENDA_PERIODS.TARDE.includes(p as never));

    let statusManha: string | null = null;
    let statusTarde: string | null = null;

    if (isNao) {
      statusManha = 'NÃO';
      statusTarde = 'NÃO';
    } else {
      // Prioridade total para atendimento (ocupaManha/ocupaTarde)
      if (ocupaManha) {
        statusManha = 'CLIENTE';
      } else if (hasManha) {
        statusManha = 'LIVRE';
      } else if (disp.periodos.includes('4 horas tarde')) {
        statusManha = 'NÃO';
      }

      if (ocupaTarde) {
        statusTarde = 'CLIENTE';
      } else if (hasTarde) {
        statusTarde = 'LIVRE';
      } else if (disp.periodos.includes('4 horas manhã')) {
        statusTarde = 'NÃO';
      }
    }

    return {
      unit_id: unitId,
      profissional_id: profissionalId,
      settings_id: settingsId, // Vínculo com a versão da agenda
      data: disp.data,
      periodos: disp.periodos,
      selecao_real: disp.periodos.length > 0 ? disp.periodos[0] : null,
      status_manha: statusManha,
      status_tarde: statusTarde,
      conflito: ats.length > 0, // Marca true caso exista registro em processed_data independente do status selecionado
      is_manual: false, // Ao receber novo formulário, reseta a flag de manual
      updated_at: new Date().toISOString()
    };
  });

  if (upsertRows.length > 0) {
    logger.debug('Salvando disponibilidades', {
      settingsId,
      profissionalId,
      total: upsertRows.length,
      firstDate: upsertRows[0]?.data,
    });

    // Voltamos para a string de colunas para garantir total compatibilidade com a versão do supabase-js
    const { error } = await supabase
      .from('agenda_disponibilidade')
      .upsert(upsertRows, {
        onConflict: 'settings_id,profissional_id,data'
      });

    if (error) {
      logger.error('Erro ao salvar disponibilidades', { unitId, profissionalId, error });
      throw new AgendaServiceError('SAVE_FAILED', 'Falha ao registrar disponibilidades.', error);
    }
  }
};

// ============================================================================
// Buscas e Painel (Dashboard Interno)
// ============================================================================

/**
 * Busca toda a disponibilidade de uma unidade num range de datas
 */
export const getDisponibilidades = async (
  unitId: string,
  startDate: string,
  endDate: string,
  settingsId?: string
): Promise<AgendaDisponibilidade[]> => {
  assertValidUuid(unitId, 'Unidade');
  assertValidDateRange(startDate, endDate);
  if (settingsId) assertValidUuid(settingsId, 'Configuração da agenda');

  let query = supabase
    .from('agenda_disponibilidade')
    .select(`
      *,
      profissional:profissionais(id, nome, whatsapp)
    `)
    .eq('unit_id', unitId)
    .gte('data', startDate)
    .lte('data', endDate);

  if (settingsId) {
    query = query.eq('settings_id', settingsId);
  }

  const { data, error } = await query.order('data', { ascending: true });

  if (error) {
    logger.error('Erro ao buscar disponibilidades', { unitId, startDate, endDate, error });
    throw new AgendaServiceError('SUPABASE_ERROR', 'Erro ao buscar disponibilidades.', error);
  }

  return (data ?? []) as AgendaDisponibilidade[];
};

/**
 * Busca profissionais livres numa data específica
 * (Aqueles que marcaram algum período e NÃO têm conflito)
 */
export const getProfissionaisLivres = async (
  unitId: string,
  dataStr: string,
  settingsId?: string
): Promise<AgendaDisponibilidade[]> => {
  assertValidUuid(unitId, 'Unidade');
  assertValidISODate(dataStr);
  if (settingsId) assertValidUuid(settingsId, 'Configuração da agenda');

  let query = supabase
    .from('agenda_disponibilidade')
    .select(`
      *,
      profissional:profissionais(id, nome, whatsapp)
    `)
    .eq('unit_id', unitId)
    .eq('data', dataStr)
    .eq('conflito', false) // Exclui conflitos detectados
    .or(FREE_AGENDA_STATUSES.flatMap(status => [
      `status_manha.eq.${status}`,
      `status_tarde.eq.${status}`,
    ]).join(',')); // Precisa ter pelo menos um período livre

  if (settingsId) {
    query = query.eq('settings_id', settingsId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Erro ao buscar profissionais livres', { unitId, dataStr, error });
    throw new AgendaServiceError('SUPABASE_ERROR', 'Erro ao buscar profissionais livres.', error);
  }

  // Filtro adicional no JS para garantir exclusividade e limpeza da lista
  return ((data ?? []) as AgendaDisponibilidade[]).filter(disp => {
    // Exclui se tiver qualquer impedimento no outro turno (CLIENTE, NÃO, RESERVA, etc)
    if (
      AGENDA_BLOCKING_STATUSES.includes(disp.status_manha as never) ||
      AGENDA_BLOCKING_STATUSES.includes(disp.status_tarde as never)
    ) {
      return false;
    }

    const isLivreManha = isFreeAgendaStatus(disp.status_manha);
    const isLivreTarde = isFreeAgendaStatus(disp.status_tarde);

    return isLivreManha || isLivreTarde;
  });
};

/**
 * Sincroniza a disponibilidade e o campo conflito de uma profissional baseando-se no que está em processed_data.
 */
export const syncProfissionalAvailability = async (
  unitId: string,
  profissionalId: string,
  profissionalNome: string,
  dataStr: string
): Promise<void> => {
  try {
    assertValidUuid(unitId, 'Unidade');
    assertValidUuid(profissionalId, 'Profissional');
    assertValidISODate(dataStr);
    if (!profissionalNome.trim()) {
      throw new AgendaServiceError('VALIDATION_ERROR', 'Nome da profissional inválido.');
    }

    // 1. Busca disponibilidades atuais para pegar os 'periodos' (sentimentos originais)
    const { data: currentDisp, error: fetchDispError } = await supabase
      .from('agenda_disponibilidade')
      .select('*')
      .eq('unit_id', unitId)
      .eq('profissional_id', profissionalId)
      .eq('data', dataStr)
      .maybeSingle();

    if (fetchDispError) throw fetchDispError;
    if (!currentDisp) return; // Se não tem registro de disponibilidade, não há o que sincronizar

    // Se o status foi definido manualmente pelo administrador, não sobrescrevemos
    if (currentDisp.is_manual) return;

    // 2. Busca atendimentos vigentes em processed_data
    const { data: atsRaw, error: atsError } = await supabase
      .from('processed_data')
      .select('horario, periodo, status')
      .eq('unit_id', unitId)
      .eq('profissional', profissionalNome)
      .eq('data', dataStr);

    if (atsError) throw atsError;

    let ocupaManha = false;
    let ocupaTarde = false;
    const ats = (atsRaw || []).map(r => ({
      HORARIO: r.horario,
      'PERÍODO': r.periodo,
      STATUS: r.status
    }));
    const atendimentosAtivos = ats.filter(at => at.STATUS !== 'CANCELADO' && at.STATUS !== 'REAGENDADO');

    atendimentosAtivos.forEach(at => {
      if (at.HORARIO) {
        const [h, m] = at.HORARIO.split(':').map(Number);
        const duracao = parseFloat(at['PERÍODO']?.toString().replace(',', '.') || '1');
        const start = h + ((m || 0) / 60);
        const end = start + duracao;

        if (start < 13) ocupaManha = true;
        if (end >= 13) ocupaTarde = true;
      }
    });

    // 3. Recalcula status baseados nos periodos originais e status atual
    const periodos: string[] = currentDisp.periodos || [];
    const isNaoOriginal = periodos.some((p: string) => AGENDA_PERIODS.NAO.includes(p as never));
    const hasManhaOriginal = periodos.some((p: string) => AGENDA_PERIODS.MANHA.includes(p as never));
    const hasTardeOriginal = periodos.some((p: string) => AGENDA_PERIODS.TARDE.includes(p as never));

    let statusManha: string | null = currentDisp.status_manha;
    let statusTarde: string | null = currentDisp.status_tarde;

    // Prioridade total para atendimento (ocupaManha/ocupaTarde)
    if (ocupaManha) {
      statusManha = 'CLIENTE';
    } else if (!statusManha || statusManha === 'LIVRE' || statusManha === 'CLIENTE') {
      // Se não tem nada ou era livre/cliente sem atendimento agora, reseta para original
      if (isNaoOriginal) statusManha = 'NÃO';
      else if (periodos.includes('4 horas tarde')) statusManha = 'NÃO';
      else if (hasManhaOriginal) statusManha = 'LIVRE';
    }

    if (ocupaTarde) {
      statusTarde = 'CLIENTE';
    } else if (!statusTarde || statusTarde === 'LIVRE' || statusTarde === 'CLIENTE') {
      if (isNaoOriginal) statusTarde = 'NÃO';
      else if (periodos.includes('4 horas manhã')) statusTarde = 'NÃO';
      else if (hasTardeOriginal) statusTarde = 'LIVRE';
    }

    // 4. Update
    const { error: updateError } = await supabase
      .from('agenda_disponibilidade')
      .update({
        status_manha: statusManha,
        status_tarde: statusTarde,
        conflito: atendimentosAtivos.length > 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentDisp.id);

    if (updateError) throw updateError;

  } catch (err) {
    const serviceError = toAgendaServiceError(err, 'SUPABASE_ERROR', 'Erro ao sincronizar disponibilidade da profissional.');
    logger.error(serviceError.userMessage, { unitId, profissionalId, dataStr, error: err });
    throw serviceError;
  }
};
/**
 * Inicializa as configurações de agenda para uma unidade caso não existam.
 * Marcado como is_system: true para identificação universal.
 */
export const initializeUnitAgenda = async (unitId: string): Promise<void> => {
  try {
    assertValidUuid(unitId, 'Unidade');
    // 1. Verifica se já existe
    const { data: existing } = await supabase
      .from('agenda_settings')
      .select('id')
      .eq('unit_id', unitId)
      .maybeSingle();

    if (existing) return;

    // 2. Cria configuração padrão (Manual)
    // Não liberamos dias automaticamente para garantir controle total do administrador
    const { error: insErr } = await supabase
      .from('agenda_settings')
      .insert({
        unit_id: unitId,
        dias_liberados: [],
        periodos_cadastrados: [...PUBLIC_AGENDA_DEFAULT_PERIODS],
        is_link_active: true,
        is_system: false,
        system_identifier: 'MANUAL_INITIALIZATION'
      });

    if (insErr) throw insErr;
    logger.info('Agenda inicializada para unidade', { unitId });

  } catch (err) {
    logger.error('Erro ao inicializar agenda da unidade', { unitId, error: err });
  }
};
