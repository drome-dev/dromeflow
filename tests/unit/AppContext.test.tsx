import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AppContextProvider, useAppContext } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockModules = [
  { id: 'mod-1', name: 'Dashboard', code: 'dashboard', is_active: true, allowed_profiles: ['super_admin'], position: 1, webhook_url: null, view_id: null },
  { id: 'mod-2', name: 'Configurações', code: 'settings', is_active: true, allowed_profiles: ['super_admin'], position: 2, webhook_url: null, view_id: null },
];

function TestComponent() {
  const { activeView, activeModule, setView, selectedUnit, setSelectedUnit } = useAppContext();
  return (
    <div>
      <span data-testid="active-view">{activeView}</span>
      <span data-testid="active-module-id">{activeModule?.id || 'none'}</span>
      <span data-testid="selected-unit-id">{(selectedUnit as any)?.id || 'none'}</span>
      <button data-testid="btn-set-view" onClick={() => setView('dashboard')}>Set Dashboard View</button>
      <button data-testid="btn-set-view-module" onClick={() => setView('module', mockModules[0])}>Set Module View</button>
      <button data-testid="btn-set-unit" onClick={() => setSelectedUnit({ id: 'unit-1', unit_name: 'SP', unit_code: 'SP', slug: 'sp', is_active: true, created_at: '' } as any)}>Set Unit</button>
    </div>
  );
}

function renderWithApp() {
  return render(
    <AppContextProvider>
      <TestComponent />
    </AppContextProvider>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useAuth as any).mockReturnValue({
      userModules: mockModules,
      userUnits: [],
      loading: false,
      getModulesForUnit: vi.fn().mockResolvedValue(mockModules),
    });
  });

  describe('setView', () => {
    it('altera activeView e persiste no localStorage', async () => {
      renderWithApp();

      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).not.toBe('');
      });

      await act(async () => {
        screen.getByTestId('btn-set-view').click();
      });

      expect(screen.getByTestId('active-view').textContent).toBe('dashboard');
      expect(localStorage.getItem('df_active_view')).toBe('dashboard');
    });

    it('altera para module com módulo específico', async () => {
      renderWithApp();

      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).not.toBe('');
      });

      await act(async () => {
        screen.getByTestId('btn-set-view-module').click();
      });

      expect(screen.getByTestId('active-view').textContent).toBe('module');
      expect(screen.getByTestId('active-module-id').textContent).toBe('mod-1');
      expect(localStorage.getItem('df_active_view')).toBe('module');
      expect(localStorage.getItem('df_active_module_id')).toBe('mod-1');
    });
  });

  describe('setSelectedUnit', () => {
    it('persiste unit_id no localStorage', async () => {
      renderWithApp();

      await waitFor(() => {
        expect(screen.getByTestId('active-view').textContent).not.toBe('');
      });

      await act(async () => {
        screen.getByTestId('btn-set-unit').click();
      });

      expect(localStorage.getItem('df_selected_unit_id')).toBe('unit-1');
    });
  });
});
