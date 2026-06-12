export type RoleKey = 'super_admin' | 'admin' | 'user';

export const ROLES: Record<RoleKey, { label: string; level: number }> = {
  super_admin: { label: 'Super Admin', level: 3 },
  admin: { label: 'Admin', level: 2 },
  user: { label: 'Usuário', level: 1 },
};

export const isRole = (value: string | null | undefined): value is RoleKey =>
  value === 'super_admin' || value === 'admin' || value === 'user';

export const normalizeRole = (role: string | null | undefined): RoleKey => {
  if (isRole(role)) return role;
  return 'user';
};

export const canManageUsers = (role: string | null | undefined): boolean => {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'super_admin';
};

export const canEditRoles = (actor: string | null | undefined, target: string | null | undefined): boolean => {
  const a = normalizeRole(actor);
  const t = normalizeRole(target);
  if (a === 'super_admin') return true;
  if (a === 'admin' && t !== 'super_admin') return true;
  return false;
};
