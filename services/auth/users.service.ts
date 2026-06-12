/**
 * users.service.ts
 * Serviço para operações de usuários e atribuições.
 */
import { supabase } from '../supabaseClient';
import { createLogger } from '../utils/log';
import { normalizeRole } from './rbac';
import type { User, Profile } from '../../types';
import type { Unit, Module } from '../../types';

type FullUser = User & Profile;
type UserDataPayload = Partial<FullUser> & {
	password?: string;
	unit_ids?: string[];
	module_ids?: string[];
	display_name?: string;
	phone?: string | null;
};

const log = createLogger('users.service');

export const fetchAllUsers = async (): Promise<FullUser[]> => {
	const { data, error } = await supabase.from('profiles').select('*, user_email:email');
	if (error) throw error;
	return (data || []).map(({ user_email, ...rest }: any) => ({ ...rest, email: user_email }));
};

export const fetchUsersForAdminUnits = async (adminUserId: string): Promise<FullUser[]> => {
	const { data: adminUnits, error: adminUnitsError } = await supabase
		.from('user_units')
		.select('unit_id')
		.eq('user_id', adminUserId);
	if (adminUnitsError) throw adminUnitsError;
	const unitIds = (adminUnits || []).map((u: any) => u.unit_id);
	if (unitIds.length === 0) return [];

	const { data: links, error: linksError } = await supabase
		.from('user_units')
		.select('user_id, unit_id')
		.in('unit_id', unitIds);
	if (linksError) throw linksError;
	const userIds = Array.from(new Set((links || []).map((l: any) => l.user_id)));
	if (userIds.length === 0) return [];

	const { data: profilesData, error: profilesError } = await supabase
		.from('profiles')
		.select('*, user_email:email')
		.in('id', userIds as string[]);
	if (profilesError) throw profilesError;

	return (profilesData || []).map(({ user_email, ...rest }: any) => ({ ...rest, email: user_email }));
};

export const fetchUserAssignments = async (userId: string): Promise<{ unit_ids: string[]; module_ids: string[] }> => {
	const [unitsRes, modulesRes] = await Promise.all([
		supabase.from('user_units').select('unit_id').eq('user_id', userId),
		supabase.from('user_modules').select('module_id').eq('user_id', userId),
	]);
	if (unitsRes.error) throw unitsRes.error;
	if (modulesRes.error) throw modulesRes.error;

	return {
		unit_ids: unitsRes.data?.map((u: any) => u.unit_id) || [],
		module_ids: modulesRes.data?.map((m: any) => m.module_id) || [],
	};
};

const updateUserAssignments = async (userId: string, unitIds: string[], moduleIds: string[]) => {
	log.debug('Atualizando atribuições', { userId, unitIds, moduleIds });

	// Deletar atribuições antigas
	const [unitsDeleteResult, modulesDeleteResult] = await Promise.all([
		supabase.from('user_units').delete().eq('user_id', userId),
		supabase.from('user_modules').delete().eq('user_id', userId),
	]);

	if (unitsDeleteResult.error) {
		log.error('Erro ao deletar user_units', { error: unitsDeleteResult.error });
		throw unitsDeleteResult.error;
	}
	if (modulesDeleteResult.error) {
		log.error('Erro ao deletar user_modules', { error: modulesDeleteResult.error });
		throw modulesDeleteResult.error;
	}

	// Inserir novas atribuições de unidades
	if (unitIds.length > 0) {
		const unitAssignments = unitIds.map((unit_id) => ({ user_id: userId, unit_id }));
		const { error } = await supabase.from('user_units').insert(unitAssignments);
		if (error) {
			log.error('Erro ao inserir user_units', { error });
			throw error;
		}
	}

	// Inserir novas atribuições de módulos
	if (moduleIds.length > 0) {
		const moduleAssignments = moduleIds.map((module_id) => ({ user_id: userId, module_id }));
		const { error } = await supabase.from('user_modules').insert(moduleAssignments);
		if (error) {
			log.error('Erro ao inserir user_modules', { error });
			throw error;
		}
	} else {
		log.debug('Nenhum módulo para inserir');
	}
};

export const createUser = async (userData: UserDataPayload & { auto_unit_id?: string }): Promise<void> => {
	if (!userData.email || !userData.password) throw new Error('Email e senha são obrigatórios.');

	const unitIds = userData.unit_ids || [];
	const autoUnitId = (userData as any).auto_unit_id as string | undefined;

	const { data, error } = await supabase.rpc('create_user_v2', {
		p_email: userData.email,
		p_password: userData.password,
		p_full_name: userData.full_name || '',
		p_role: normalizeRole((userData as any).role),
		p_unit_ids: unitIds.length > 0 ? unitIds : [],
		p_module_ids: userData.module_ids || [],
		p_auto_unit_id: autoUnitId || null,
		p_display_name: userData.display_name || null,
		p_phone: userData.phone || null,
	});

	if (error) {
		log.error('Erro ao criar usuário via RPC', { error });
		throw error;
	}
	if (!data?.success) throw new Error(data?.error || 'Erro ao criar usuário.');
};

export const updateUser = async (userId: string, userData: UserDataPayload): Promise<void> => {
	const { data, error } = await supabase.rpc('update_user_v2', {
		p_user_id: userId,
		p_full_name: userData.full_name || null,
		p_email: userData.email || null,
		p_role: userData.role ? normalizeRole(userData.role) : null,
		p_password: userData.password || null,
		p_unit_ids: userData.unit_ids || null,
		p_module_ids: userData.module_ids || null,
		p_display_name: userData.display_name || null,
		p_phone: userData.phone || null,
	});

	if (error) {
		log.error('Erro ao atualizar usuário via RPC', { error, userId });
		throw error;
	}
	if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar usuário.');
};

export const deleteUser = async (userId: string): Promise<void> => {
	const { error } = await supabase.rpc('delete_app_user', { user_id_to_delete: userId });
	if (error) throw error;
};

export const removeUserFromUnit = async (userId: string, unitId: string, callerId: string): Promise<void> => {
	const { error } = await supabase.rpc('remove_user_from_unit', { p_caller_id: callerId, p_user_id: userId, p_unit_id: unitId });
	if (error) throw error;
};

export const fetchUsersForUnit = async (
	unitId: string
): Promise<{ id: string; full_name: string; email: string; role: string }[]> => {
	const { data: links, error: linkError } = await supabase
		.from('user_units')
		.select('user_id')
		.eq('unit_id', unitId);
	if (linkError) throw linkError;

	const userIds = (links || []).map((l: any) => l.user_id).filter(Boolean);
	if (userIds.length === 0) return [];

	const { data: profilesData, error: profilesError } = await supabase
		.from('profiles')
		.select('id, full_name, email, role')
		.in('id', userIds as string[]);
	if (profilesError) throw profilesError;

	return (profilesData || []).map((p: any) => ({
		id: p.id as string,
		full_name: p.full_name || '',
		email: p.email || '',
		role: p.role || 'user',
	}));
};

// Unidades vinculadas a um usuário (RPC com fallback)
export const fetchUserUnits = async (userId: string): Promise<Unit[]> => {
	try {
		const { data, error } = await supabase.rpc('get_user_units', { p_user_id: userId });
		if (error) throw error;
		return (data as Unit[]) || [];
	} catch (rpcErr) {
		log.warn('Falha RPC get_user_units, aplicando fallback manual', { error: rpcErr });
		const { data: linkData, error: linkError } = await supabase
			.from('user_units')
			.select('unit_id')
			.eq('user_id', userId);
		if (linkError) {
			log.error('Erro fallback user_units', { error: linkError });
			return [];
		}
		const unitIds = (linkData || []).map((r: any) => r.unit_id);
		if (unitIds.length === 0) return [];
		const { data: unitsData, error: unitsError } = await supabase
			.from('units')
			.select('*')
			.in('id', unitIds);
		if (unitsError) {
			log.error('Erro buscando units no fallback', { error: unitsError });
			return [];
		}
		return (unitsData as Unit[]) || [];
	}
};

// Módulos vinculados a um usuário via RPC (mantido aqui para simetria, apesar de AuthContext ter lógica própria)
export const fetchUserModules = async (userId: string): Promise<Module[]> => {
	const { data, error } = await supabase.rpc('get_user_modules', { p_user_id: userId });
	if (error) throw error;
	return (data as Module[]) || [];
};
