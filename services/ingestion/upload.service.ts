/**
 * upload.service.ts — Ingestão de XLSX e limpeza/sincronização
 * Mantém a mesma lógica e assinaturas que existiam no mockApi.
 */
import { supabase } from '../supabaseClient';
import { syncUnitClientsFromProcessed } from '../data/clientsDirectory.service';
import { toSnakeCasePayload, toFrontendRecord } from '../data/processedDataMapper';
import { DataRecord, UploadMetrics } from '../../types';
import { createLogger } from '../utils/log';

const log = createLogger('upload.service');

export type RawDataRecordForUpload = Omit<DataRecord, 'repasse' | 'orcamento' | 'NÚMERO'> & { repasse: string | number };

// Função auxiliar: Processa valores de repasse corretamente
const processRepasseValues = (repasseOriginal: any, profissionaisCount: number): number[] => {
	let repasseValues: number[] = [];
	if (typeof repasseOriginal === 'string' && repasseOriginal.includes(' ')) {
		repasseValues = repasseOriginal
			.split(' ')
			.map((val) => val.trim())
			.filter((val) => val.length > 0)
			.map((val) => parseFloat(val.replace(',', '.')) || 0);
	} else {
		const valorNumerico =
			typeof repasseOriginal === 'number'
				? repasseOriginal
				: parseFloat(String(repasseOriginal).replace(',', '.') || '0');
		const repasseDividido = profissionaisCount > 1 ? valorNumerico / profissionaisCount : valorNumerico;
		repasseValues = Array(profissionaisCount).fill(repasseDividido);
	}
	if (repasseValues.length !== profissionaisCount) {
		if (repasseValues.length === 1) {
			const valorUnico = repasseValues[0];
			repasseValues = Array(profissionaisCount).fill(valorUnico);
		} else if (repasseValues.length > profissionaisCount) {
			repasseValues = repasseValues.slice(0, profissionaisCount);
		} else {
			while (repasseValues.length < profissionaisCount) repasseValues.push(0);
		}
	}
	return repasseValues;
};

const processMultipleProfessionalsRecords = (records: RawDataRecordForUpload[]): DataRecord[] => {
	const finalRecords: DataRecord[] = [];
	records.forEach((record) => {
		const originalAtendimentoId = String(record.atendimento_id || '').trim();
		// Preserva null quando profissional é null (não converte para string vazia)
		const professionalValue = record.profissional;
		const professionalString = professionalValue === null ? '' : String(professionalValue).trim();
		if (professionalString.includes(';')) {
			const professionals = professionalString
				.split(';')
				.map((p) => p.trim())
				.filter(Boolean);
			const repasses = processRepasseValues(record.repasse, professionals.length);
			if (professionals.length > 0) {
				professionals.forEach((professional, index) => {
					const isFirst = index === 0;
					finalRecords.push({
						...record,
						profissional: professional,
						repasse: repasses[index] || 0,
						valor: isFirst ? record.valor : 0,
						// atendimento_id com sufixo para derivados (ex: 12345_1, 12345_2)
						atendimento_id: isFirst ? originalAtendimentoId : `${originalAtendimentoId}_${index}`,
						is_divisao: isFirst ? 'NAO' : 'SIM',
					});
				});
			} else {
				finalRecords.push({
					...record,
					profissional: professionalString || null, // Mantém null se vazio
					repasse: parseFloat(String(record.repasse).replace(',', '.')) || 0,
					atendimento_id: originalAtendimentoId,
					is_divisao: 'NAO',
				});
			}
		} else {
			finalRecords.push({
				...record,
				profissional: professionalString || null, // Mantém null se vazio
				repasse: parseFloat(String(record.repasse).replace(',', '.')) || 0,
				atendimento_id: originalAtendimentoId,
				is_divisao: 'NAO',
			});
		}
	});
	return finalRecords;
};

// Aplica lógica de STATUS baseada em ordem cronológica (HORARIO)
// Quando a mesma profissional tem 2+ atendimentos no mesmo dia:
// - Primeiro atendimento (por HORARIO) → STATUS = "PENDENTE"
// - Demais atendimentos → STATUS = "ESPERAR"
const applyWaitStatusByOrder = (records: DataRecord[]): DataRecord[] => {
	log.info('[applyWaitStatusByOrder] Processing ' + records.length + ' records');

	// Agrupar registros por (PROFISSIONAL + DATA)
	const groupedByProfessionalDate = new Map<string, DataRecord[]>();

	records.forEach((record) => {
		if (!record.profissional || !record.data) return;

		const key = `${record.profissional}|${record.data}`;
		if (!groupedByProfessionalDate.has(key)) {
			groupedByProfessionalDate.set(key, []);
		}
		groupedByProfessionalDate.get(key)!.push(record);
	});

	log.info('[applyWaitStatusByOrder] Grouped into ' + groupedByProfessionalDate.size + ' professional-date combinations');

	// Aplicar regra: Se profissional tem 2+ atendimentos no dia,
	// ordenar por HORARIO e marcar primeiro como PENDENTE, demais como ESPERAR
	let statusChangedCount = 0;
	groupedByProfessionalDate.forEach((recordsGroup, key) => {
		if (recordsGroup.length > 1) {
			// Profissional tem múltiplos atendimentos no mesmo dia
			// Ordenar por horario (crescente) - normaliza para comparação
			recordsGroup.sort((a, b) => {
				const horarioA = String(a.horario || '00:00').trim();
				const horarioB = String(b.horario || '00:00').trim();
				return horarioA.localeCompare(horarioB);
			});

			log.info(`[applyWaitStatusByOrder] Processing ${recordsGroup.length} appointments for ${key}`);

			// Aplicar status baseado na posição
			recordsGroup.forEach((record, index) => {
				if (index === 0) {
					// Primeiro atendimento do dia
					record.status = 'PENDENTE';
					log.info(`  → [${record.horario}] ${record.atendimento_id}: PENDENTE (1º)`);
				} else {
					// Demais atendimentos
					record.status = 'ESPERAR';
					statusChangedCount++;
					log.info(`  → [${record.horario}] ${record.atendimento_id}: ESPERAR (${index + 1}º)`);
				}
			});
		}
	});

	log.info('[applyWaitStatusByOrder] Changed STATUS to "ESPERAR" for ' + statusChangedCount + ' records');
	return records;
};

// Extrai o ID base do ATENDIMENTO_ID (remove sufixos _1, _2, _3...)
const baseFromAtendimento = (atendId: any): string => {
	const str = String(atendId || '').trim();
	const match = str.match(/^(.+)_(\d+)$/);
	return match ? match[1] : str;
};

// Remove registros obsoletos usando base ID + cliente como chave lógica
// Agora usa Map<base_id, Set<cliente>> para comparar cliente a cliente,
// permitindo que diferentes clientes compartilhem o mesmo atendimento_id base
const removeObsoleteRecords = async (
	unitCode: string,
	startDate: string,
	endDate: string,
	clientesPorBaseNoFile: Map<string, Set<string>>
): Promise<number> => {
	log.info('[removeObsoleteRecords] Checking for obsolete records in range: ' + startDate + ' to ' + endDate);
	log.info('[removeObsoleteRecords] Unique base IDs in file: ' + clientesPorBaseNoFile.size);

	const { data: existingRecords, error: fetchError } = await supabase
		.from('processed_data')
		.select('atendimento_id, cliente, is_divisao')
		.eq('unidade_code', unitCode)
		.gte('data', startDate)
		.lte('data', endDate);

	if (fetchError) {
		log.error('[removeObsoleteRecords] Error fetching existing records', { error: fetchError });
		return 0;
	}
	if (!existingRecords || existingRecords.length === 0) {
		log.info('[removeObsoleteRecords] No existing records found in date range');
		return 0;
	}

	log.info('[removeObsoleteRecords] Found ' + existingRecords.length + ' existing records in database');

	// Build map of base IDs to all their DB records (atendimento_id + cliente)
	const baseToDbRecordsMap = new Map<string, { atendimento_id: string; cliente: string }[]>();

	existingRecords.forEach((r: any) => {
		const atendimentoId = String(r.atendimento_id || '').trim();
		if (!atendimentoId) return;

		const base = baseFromAtendimento(atendimentoId);

		if (!baseToDbRecordsMap.has(base)) {
			baseToDbRecordsMap.set(base, []);
		}
		baseToDbRecordsMap.get(base)!.push({
			atendimento_id: atendimentoId,
			cliente: String(r.cliente || '').trim(),
		});
	});

	log.info('[removeObsoleteRecords] Unique base IDs in database: ' + baseToDbRecordsMap.size);

	// Find records that exist in DB but NOT in the uploaded file
	// For each base ID: if base not in file at all → delete all records
	//                   if base in file → delete only records whose cliente is not in file
	const atendimentosToRemove: string[] = [];
	baseToDbRecordsMap.forEach((dbRecords, base) => {
		const clientesNoFile = clientesPorBaseNoFile.get(base);
		if (!clientesNoFile) {
			// Base inteira removida do arquivo — deleta todos os registros
			dbRecords.forEach((rec) => atendimentosToRemove.push(rec.atendimento_id));
		} else {
			// Base existe — deleta só os clientes que não estão mais no arquivo
			dbRecords.forEach((rec) => {
				if (!clientesNoFile.has(rec.cliente)) {
					atendimentosToRemove.push(rec.atendimento_id);
				}
			});
		}
	});

	if (atendimentosToRemove.length === 0) {
		log.info('[removeObsoleteRecords] No obsolete records to remove');
		return 0;
	}

	log.info('[removeObsoleteRecords] Total records to delete: ' + atendimentosToRemove.length);

	const { error: deleteError, count } = await supabase
		.from('processed_data')
		.delete({ count: 'exact' })
		.eq('unidade_code', unitCode)
		.in('atendimento_id', atendimentosToRemove);

	if (deleteError) {
		log.error('[removeObsoleteRecords] Error deleting records', { error: deleteError });
		return 0;
	}

	const deletedCount = count || 0;
	log.info('[removeObsoleteRecords] Successfully deleted ' + deletedCount + ' records');
	return deletedCount;
};

// API pública: Upload de XLSX com sincronização
export const uploadXlsxData = async (
	unitCode: string,
	records: RawDataRecordForUpload[]
): Promise<UploadMetrics> => {
	if (records.length === 0) {
		return { total: 0, inserted: 0, updated: 0, ignored: 0, deleted: 0 };
	}

	log.info('[uploadXlsxData] Starting upload for unit: ' + unitCode + ' with ' + records.length + ' raw records');

	// Processar multi-profissionais e aplicar sufixos
	let processedRecords = processMultipleProfessionalsRecords(records);
	log.info('[uploadXlsxData] After multi-professional expansion: ' + processedRecords.length + ' records');

	// Aplicar lógica de STATUS baseada em ordem cronológica (HORARIO)
	// Primeiro atendimento do dia → PENDENTE, demais → ESPERAR
	processedRecords = applyWaitStatusByOrder(processedRecords);

	let deletedCount = 0;
	let minDate: Date | null = null;
	let maxDate: Date | null = null;
	processedRecords.forEach((record) => {
		if (record.data) {
			const [year, month, day] = record.data.split('-').map(Number);
			const currentDate = new Date(year, month - 1, day);
			if (!isNaN(currentDate.getTime())) {
				if (!minDate || currentDate < minDate) minDate = currentDate;
				if (!maxDate || currentDate > maxDate) maxDate = currentDate;
			}
		}
	});

	if (minDate && maxDate) {
		const clientesPorBaseNoFile = new Map<string, Set<string>>();
		processedRecords
			.filter((r) => r.is_divisao === 'NAO')
			.forEach((r) => {
				if (!r.atendimento_id) return;
				const base = baseFromAtendimento(String(r.atendimento_id));
				if (!clientesPorBaseNoFile.has(base)) clientesPorBaseNoFile.set(base, new Set());
				if (r.cliente) clientesPorBaseNoFile.get(base)!.add(r.cliente);
			});
		const startDate = minDate.toISOString().split('T')[0];
		const endDate = maxDate.toISOString().split('T')[0];
		deletedCount = await removeObsoleteRecords(unitCode, startDate, endDate, clientesPorBaseNoFile);
	}

	const sanitizeRecord = (r: any) => {
		const { status, profissional, ...rest } = r;
		return rest;
	};

	const tryRpcUpload = async (): Promise<UploadMetrics> => {
		const aggregatedMetrics = { total: 0, inserted: 0, updated: 0, ignored: 0 };
		const uploadBatchSize = 500;
		for (let i = 0; i < processedRecords.length; i += uploadBatchSize) {
			const batch = processedRecords.slice(i, i + uploadBatchSize);
			const batchForRpc = batch.map((r) => {
				return {
					...toSnakeCasePayload(r),
					status: r.status || 'PENDENTE',
				};
			});

			const { data, error } = await supabase.rpc('process_xlsx_upload', {
				unit_code_arg: unitCode,
				records_arg: batchForRpc,
			});

			if (error) {
				throw new Error(`Erro durante upload do lote: ${error.message}`);
			}
			const batchMetrics = data as Omit<UploadMetrics, 'deleted'>;
			aggregatedMetrics.total += batchMetrics.total;
			aggregatedMetrics.inserted += batchMetrics.inserted;
			aggregatedMetrics.updated += batchMetrics.updated;
			aggregatedMetrics.ignored += batchMetrics.ignored;
		}
		return { ...aggregatedMetrics, deleted: deletedCount };
	};

	const manualFallbackUpload = async (): Promise<UploadMetrics> => {
		const existingMap = new Map<string, { id: string }>();
		if (minDate && maxDate) {
			const startDate = minDate.toISOString().split('T')[0];
			const endDate = maxDate.toISOString().split('T')[0];
			const { data: existing } = await supabase
				.from('processed_data')
				.select('id, atendimento_id, cliente')
				.eq('unidade_code', unitCode)
				.gte('data', startDate)
				.lte('data', endDate);
			(existing || []).forEach((r: any) => {
				if (r.atendimento_id) existingMap.set(`${r.atendimento_id}|${r.cliente || ''}`, { id: r.id });
			});
		}
		const toInsert: any[] = [];
		const toUpdate: any[] = [];
		processedRecords.forEach((r) => {
			const key = `${r.atendimento_id}|${r.cliente || ''}`;
			if (r.atendimento_id && existingMap.has(key)) toUpdate.push(r);
			else toInsert.push(r);
		});
		let inserted = 0,
			updated = 0,
			ignored = 0;
		const insertBatchSize = 500;
		for (let i = 0; i < toInsert.length; i += insertBatchSize) {
			const slice = toInsert
				.slice(i, i + insertBatchSize)
				.map((r) => ({ ...toSnakeCasePayload(r), unidade_code: unitCode }));
			const { error: insErr } = await supabase.from('processed_data').insert(slice);
			if (insErr) throw new Error(`Falha na inserção fallback: ${insErr.message}`);
			inserted += slice.length;
		}
		for (const r of toUpdate) {
			const updPayload = toSnakeCasePayload({
				data: r.data,
				cliente: r.cliente,
				valor: r.valor,
				repasse: r.repasse,
				is_divisao: r.is_divisao,
				profissional: r.profissional,
			});
			const { error: upErr } = await supabase
				.from('processed_data')
				.update(updPayload)
				.eq('unidade_code', unitCode)
				.eq('atendimento_id', r.atendimento_id);
			if (upErr) throw new Error(`Falha no update fallback: ${upErr.message}`);
			updated += 1;
		}
		const total = processedRecords.length;
		return { total, inserted, updated, ignored, deleted: deletedCount };
	};

	try {
		const result = await tryRpcUpload();
		// Sincroniza base de clientes a partir do processed_data para a unidade
		try { await syncUnitClientsFromProcessed(unitCode); } catch (e) { log.warn('[upload] syncUnitClients warning', { error: e }); }
		return result;
	} catch (e: any) {
		const msg = String(e?.message || '').toLowerCase();
		if (msg.includes('column "profissional" does not exist')) {
			const res = await manualFallbackUpload();
			try { await syncUnitClientsFromProcessed(unitCode); } catch (e) { log.warn('[upload] syncUnitClients warning', { error: e }); }
			return res;
		}
		throw e;
	}
};

export { processMultipleProfessionalsRecords, processRepasseValues, removeObsoleteRecords };
