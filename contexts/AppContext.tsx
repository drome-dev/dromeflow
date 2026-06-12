import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { Unit, Module, PageView } from '../types';
import { useAuth } from './AuthContext';
import { createLogger } from '../services/utils/log';

const log = createLogger('AppContext');

interface AppContextType {
  selectedUnit: Unit | null | { id: 'ALL'; unit_name: string; unit_code: 'ALL' };
  setSelectedUnit: (unit: Unit | null | { id: 'ALL'; unit_name: string; unit_code: 'ALL' }) => void;
  activeView: PageView;
  activeModule: Module | null;
  setView: (view: PageView, module?: Module | null) => void;
}

import { parseUnitAndModule, buildUnitModuleUrl, updateBrowserPath } from '../services/utils/urlUtils';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userModules, userUnits, loading, getModulesForUnit } = useAuth();
  const [selectedUnit, setSelectedUnitState] = useState<Unit | null | { id: 'ALL'; unit_name: string; unit_code: 'ALL' }>(null);
  // Inicializa como 'welcome' temporariamente até carregar módulos
  const [activeView, setActiveView] = useState<PageView>('welcome');
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const previousUnitId = useRef<string | null>(null);
  
  // Resolve qual view deve ser exibida para um determinado módulo
  const resolveTargetView = (module: Module): { view: PageView, mod: Module | null } => {
    const viewIdNorm = (module.view_id || '').toLowerCase().replace(/-/g, '_');
    const url = (module.webhook_url || '').toLowerCase();
    const internalView = url.startsWith('internal://') ? url.slice('internal://'.length).replace(/-/g, '_') : '';
    const target = viewIdNorm || internalView;

    if (target) {
      return { view: target as PageView, mod: null };
    }
    return { view: 'module', mod: module };
  };

  // Encontra o melhor módulo para ser a página inicial
  const findBestInitialModule = (modules: Module[]): Module | undefined => {
    if (modules.length === 0) return undefined;
    // 1. Dashboards
    const dashboard = modules.find(m =>
      (m.code || '').toLowerCase().includes('dashboard') ||
      m.name.toLowerCase().includes('dashboard') ||
      m.name.toLowerCase().includes('indicadores')
    );
    if (dashboard) return dashboard;
    // 2. Não configurações
    const nonConfig = modules.find(m =>
      !m.code?.toLowerCase().includes('settings') &&
      !m.code?.toLowerCase().includes('config') &&
      !m.name.toLowerCase().includes('configura')
    );
    if (nonConfig) return nonConfig;
    // 3. Primeiro da lista
    return modules[0];
  };


  // Persiste seleção de unidade
  const setSelectedUnit = (unit: Unit | null | { id: 'ALL'; unit_name: string; unit_code: 'ALL' }) => {
    const prevUnit = selectedUnit;
    setSelectedUnitState(unit as any);

    try {
      if (!unit) {
        localStorage.removeItem('df_selected_unit_id');
      } else if ((unit as any).id === 'ALL') {
        localStorage.setItem('df_selected_unit_id', 'ALL');
      } else {
        localStorage.setItem('df_selected_unit_id', (unit as Unit).id);

        // Se a unidade mudou e tem slug, verifica se precisa mudar o subdomínio
        const unitObj = unit as Unit;
        if (unitObj.slug && (!prevUnit || (prevUnit as Unit).slug !== unitObj.slug)) {
          const newUrl = buildUnitModuleUrl(unitObj.slug);
          if (new URL(newUrl).hostname !== window.location.hostname) {
            window.location.href = newUrl; // Redireciona para o novo subdomínio
          }
        }
      }
    } catch { }
  };

  // Persiste view/módulo
  const setView = (view: PageView, module: Module | null = null) => {
    setActiveView(view);
    setActiveModule(module);
    try {
      localStorage.setItem('df_active_view', view);
      if (view === 'module' && module?.id) {
        localStorage.setItem('df_active_module_id', module.id);
        updateBrowserPath(module.code || view);
      } else {
        localStorage.removeItem('df_active_module_id');
        if (view !== 'welcome') {
          updateBrowserPath(view);
        } else {
          updateBrowserPath(null);
        }
      }
    } catch { }
  };

  // Restaura seleção a partir do localStorage após Auth carregar
  useEffect(() => {
    if (loading) return;
    // Restaurar Unidade
    try {
      const { unitSlug } = parseUnitAndModule();
      const storedUnitId = localStorage.getItem('df_selected_unit_id');

      if (!selectedUnit) {
        // 1. Tenta pelo Subdomínio/URL (Prioridade máxima)
        if (unitSlug) {
          const foundUnit = userUnits.find(u => u.slug === unitSlug);
          if (foundUnit) {
            setSelectedUnit(foundUnit);
            return;
          }
        }

        // 2. Fallback para localStorage
        if (storedUnitId) {
          if (storedUnitId === 'ALL') {
            setSelectedUnit({ id: 'ALL', unit_name: 'Todas as Unidades', unit_code: 'ALL' } as any);
          } else {
            const foundUnit = userUnits.find(u => u.id === storedUnitId);
            if (foundUnit) setSelectedUnit(foundUnit);
          }
        }
        // 3. Sem cache ou não encontrado: se houver unidades disponíveis, seleciona a primeira
        if (!selectedUnit && !unitSlug && !storedUnitId && userUnits.length > 0) {
          setSelectedUnit(userUnits[0]);
        }
      }
    } catch { }
  }, [loading, userUnits, selectedUnit]);

  // Listener para evento de mudança de unidade (disparado pelo toggleAdminView)
  useEffect(() => {
    const handleUnitChange = (event: CustomEvent) => {
      const unit = event.detail;
      if (unit && unit.id) {
        log.info('[AppContext] Evento de mudança de unidade recebido', { unit });
        setSelectedUnit(unit);
      }
    };

    window.addEventListener('df_unit_changed', handleUnitChange as EventListener);
    return () => {
      window.removeEventListener('df_unit_changed', handleUnitChange as EventListener);
    };
  }, []);

  // Carrega módulos quando a unidade muda (inicial ou manual)
  useEffect(() => {
    const loadFirstModuleForUnit = async () => {
      if (loading || !selectedUnit) return;

      const currentUnitId = (selectedUnit as any).id === 'ALL' ? 'ALL' : (selectedUnit as Unit)?.id;
      if (!currentUnitId) return;

      // Só prossegue se a unidade realmente mudou
      if (previousUnitId.current === currentUnitId) return;
      previousUnitId.current = currentUnitId;

      log.info('[AppContext] Unidade mudou para: ' + currentUnitId);

      try {
        // Busca módulos para a unidade selecionada
        const modulesForUnit = await getModulesForUnit(selectedUnit.id);
        const activeModulesForUnit = modulesForUnit.filter(m => m.is_active);

        if (activeModulesForUnit.length > 0) {
          // Tenta restaurar view da URL ou localStorage
          const { moduleCode: urlModuleCode } = parseUnitAndModule();
          const storedView = (localStorage.getItem('df_active_view') as PageView | null) || null;
          const storedModuleId = localStorage.getItem('df_active_module_id');

          // 1. Tenta restaurar módulo pela URL (path)
          if (urlModuleCode) {
            const foundModule = activeModulesForUnit.find(m => m.code === urlModuleCode);
            if (foundModule) {
              const { view, mod } = resolveTargetView(foundModule);
              setActiveView(view);
              setActiveModule(mod);
              return;
            } else {
              // Pode ser uma view interna direto na URL (ex: /dashboard)
              const internalView = urlModuleCode.replace(/-/g, '_');
              const foundByViewId = activeModulesForUnit.find(m => (m.view_id || '').toLowerCase().replace(/-/g, '_') === internalView);

              if (foundByViewId) {
                setActiveView(internalView as PageView);
                setActiveModule(foundByViewId);
                return;
              }
            }
          }

          // 2. Se há módulo no localStorage e ele existe na unidade atual, restaura
          if (storedView === 'module' && storedModuleId) {
            const foundModule = activeModulesForUnit.find(m => m.id === storedModuleId);
            if (foundModule) {
              const { view, mod } = resolveTargetView(foundModule);
              setActiveView(view);
              setActiveModule(mod);
              return;
            }
          }

          // 3. Se há view no localStorage e não é módulo, restaura (ex: dashboard, data)
          if (storedView && storedView !== 'module') {
            setView(storedView);
            return;
          }

          // Caso contrário, carrega o MELHOR módulo inicial ativo da unidade
          const bestModule = findBestInitialModule(activeModulesForUnit);
          if (bestModule) {
            log.info('[AppContext] Selecionando melhor módulo inicial: ' + bestModule.name, { unit: selectedUnit });
            const { view, mod } = resolveTargetView(bestModule);
            setActiveView(view);
            setActiveModule(mod);
          } else {
            setView('welcome');
          }
        } else {
          // Se não há módulos ativos na unidade, vai para welcome
          log.info('[AppContext] Nenhum módulo ativo para unidade', { unit: selectedUnit });
          setView('welcome');
        }
      } catch (err) {
        log.error('[AppContext] Erro ao carregar módulos da unidade', { error: err });
        setView('welcome');
      }
    };

    loadFirstModuleForUnit();
  }, [loading, selectedUnit?.id, getModulesForUnit]);

  return (
    <AppContext.Provider value={{ selectedUnit, setSelectedUnit, activeView, activeModule, setView }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
