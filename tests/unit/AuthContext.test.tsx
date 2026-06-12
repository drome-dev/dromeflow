import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const { mockRpc, mockFrom, __setMockTableData } = vi.hoisted(() => {
  const tableData: Record<string, { data: any; error: any }> = {};

  function getTableResult(table: string) {
    return tableData[table] || tableData['*'] || { data: null, error: null };
  }

  function buildChain(table: string) {
    const result = getTableResult(table);
    const promise = Promise.resolve(result);

    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.ilike = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.range = vi.fn(() => result);
    chain.in = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => promise);
    chain.single = vi.fn(() => promise);
    chain.update = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.or = vi.fn(() => chain);
    chain.contains = vi.fn(() => chain);
    chain.then = promise.then.bind(promise);
    chain.catch = promise.catch.bind(promise);
    chain.finally = promise.finally.bind(promise);

    return chain;
  }

  const mockFrom = vi.fn((table: string) => buildChain(table));
  const mockRpc = vi.fn();

  return {
    mockRpc,
    mockFrom,
    __setMockTableData: (table: string, overrides: any) => {
      tableData[table] = {
        data: 'data' in overrides ? overrides.data : null,
        error: 'error' in overrides ? overrides.error : null,
      };
    },
  };
});

vi.mock('../../services/supabaseClient', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

vi.mock('../../services/utils/activityLogger.service', () => ({
  activityLogger: {
    logLogin: vi.fn(),
    logLogout: vi.fn(),
  },
}));

const mockUnit = {
  id: 'unit-1',
  unit_name: 'Unidade SP',
  unit_code: 'SP',
  slug: 'unidade-sp',
  is_active: true,
  created_at: '2026-01-01',
};

const mockModules: any[] = [
  { id: 'mod-1', name: 'Dashboard', code: 'dashboard', is_active: true, allowed_profiles: ['super_admin'], position: 1, webhook_url: null, view_id: null },
];

function TestComponent() {
  const auth = useAuth();
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    try {
      setLoginError('');
      await auth.login('admin@test.com', 'Senha123!');
    } catch (e: any) {
      setLoginError(e.message);
    }
  };

  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'true' : 'false'}</span>
      <span data-testid="user-email">{auth.user?.email || 'no-user'}</span>
      <span data-testid="profile-role">{auth.profile?.role || 'no-profile'}</span>
      <span data-testid="modules-count">{auth.userModules.length}</span>
      <span data-testid="units-count">{auth.userUnits.length}</span>
      <span data-testid="login-error">{loginError}</span>
      <button data-testid="btn-login" onClick={handleLogin}>Login</button>
      <button data-testid="btn-logout" onClick={auth.logout}>Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __setMockTableData('*', { data: null, error: null });
    mockRpc.mockReset();
  });

  describe('session restore', () => {
    it('restaura sessão do localStorage na montagem', async () => {
      const storedProfile = {
        id: 'u-1',
        email: 'stored@test.com',
        role: 'super_admin',
        full_name: 'Stored User',
      };
      localStorage.setItem('userProfile', JSON.stringify(storedProfile));
      __setMockTableData('modules', { data: mockModules, error: null });
      __setMockTableData('units', { data: [mockUnit], error: null });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('user-email').textContent).toBe('stored@test.com');
      });

      expect(screen.getByTestId('profile-role').textContent).toBe('super_admin');
    });
  });

  describe('login', () => {
    it('login com sucesso', async () => {
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          profile: { id: 'u-1', email: 'admin@test.com', role: 'super_admin', full_name: 'Admin' },
        },
        error: null,
      });
      __setMockTableData('modules', { data: mockModules, error: null });
      __setMockTableData('units', { data: [mockUnit], error: null });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        screen.getByTestId('btn-login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user-email').textContent).toBe('admin@test.com');
      });

      const stored = localStorage.getItem('userProfile');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!).email).toBe('admin@test.com');
    });

    it('login com falha mostra erro', async () => {
      mockRpc.mockResolvedValue({
        data: { success: false, error: 'Credenciais inválidas' },
        error: null,
      });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        screen.getByTestId('btn-login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('login-error').textContent).toBe('Credenciais inválidas');
      });

      expect(screen.getByTestId('user-email').textContent).toBe('no-user');
    });
  });

  describe('logout', () => {
    it('limpa estado e localStorage', async () => {
      const storedProfile = {
        id: 'u-1',
        email: 'stored@test.com',
        role: 'super_admin',
        full_name: 'Stored User',
      };
      localStorage.setItem('userProfile', JSON.stringify(storedProfile));
      __setMockTableData('modules', { data: mockModules, error: null });
      __setMockTableData('units', { data: [mockUnit], error: null });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('user-email').textContent).toBe('stored@test.com');
      });

      await act(async () => {
        screen.getByTestId('btn-logout').click();
      });

      expect(screen.getByTestId('user-email').textContent).toBe('no-user');
      expect(localStorage.getItem('userProfile')).toBeNull();
    });
  });
});
