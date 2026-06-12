export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  id: string;
  email: string;
}

export interface Profile {
  id: string; // id do usuário (profiles.id)
  email?: string | null;
  full_name: string;
  role: UserRole;
  units?: any[]; // Adicionado para suportar permissões de unidade
}

export type AccessCredentialType = 'LINK' | 'API_KEY' | 'TOKEN';

export interface AccessCredential {
  id: string;
  created_at: string;
  name: string;
  type: AccessCredentialType;
  value: string;
  description: string | null;
}