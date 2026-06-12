export type RoleKey = 'super_admin' | 'admin' | 'user';

export interface RoleDefinition {
  key: RoleKey;
  label: string;
  canManageUsers: boolean;
  canViewAllUnits: boolean;
  canModifySystemSettings: boolean;
  canManageFinancial: boolean;
  canAccessChat: boolean;
}

export const ROLES: Record<RoleKey, RoleDefinition> = {
  super_admin: {
    key: 'super_admin',
    label: 'Super Admin',
    canManageUsers: true,
    canViewAllUnits: true,
    canModifySystemSettings: true,
    canManageFinancial: true,
    canAccessChat: true,
  },
  admin: {
    key: 'admin',
    label: 'Admin',
    canManageUsers: true,
    canViewAllUnits: true,
    canModifySystemSettings: false,
    canManageFinancial: true,
    canAccessChat: true,
  },
  user: {
    key: 'user',
    label: 'Usuário',
    canManageUsers: false,
    canViewAllUnits: false,
    canModifySystemSettings: false,
    canManageFinancial: false,
    canAccessChat: true,
  },
};

export const isRole = (value: string): value is RoleKey =>
  value === 'super_admin' || value === 'admin' || value === 'user';

export const getRole = (key: string): RoleDefinition | null => {
  if (!isRole(key)) return null;
  return ROLES[key];
};

export const normalizeRole = (value?: string | null): RoleKey =>
  isRole(value || '') ? (value as RoleKey) : 'user';
