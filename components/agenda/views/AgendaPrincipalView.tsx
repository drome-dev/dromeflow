import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { AgendaCalendar } from '../ui/AgendaCalendar';
import { AgendaProfissionaisLivres } from '../ui/AgendaProfissionaisLivres';
import { AgendaAtendimentosList } from '../ui/AgendaAtendimentosList';
import { AgendaWeekSummary } from '../ui/AgendaWeekSummary';

interface AgendaPrincipalViewProps {
   agenda: any;
   dnd: any;
   selectedUnit: any;
   activeMetricPeriod: 'd7' | 'd30' | 'geral';
   setActiveMetricPeriod: (p: 'd7' | 'd30' | 'geral') => void;
   setProfModalData: (data: any) => void;
   setConflictModal: (data: any) => void;
   setSelectedSidebarAtendimento: (data: any) => void;
}

export const AgendaPrincipalView: React.FC<AgendaPrincipalViewProps> = ({
    agenda,
    dnd,
    selectedUnit,
    activeMetricPeriod,
    setActiveMetricPeriod,
    setProfModalData,
    setConflictModal,
    setSelectedSidebarAtendimento
}) => {
    const {
       loading, profissionaisLivres, atendimentosDia, atendimentosSemana,
       todasDisponibilidades, profMetricas, loadProfissionalMetrics, selectedProfDetails, setSelectedProfDetails,
       selectedDate, setSelectedDate, filterSemProfissional, setFilterSemProfissional
    } = agenda;

    const [expandedSummary, setExpandedSummary] = useState(false);

   const {
      handleDragStartProfissional, handleDragOver, handleDropToProfissionais,
      handleDropOnAtendimento, handleDragStartRemoveProfissional
   } = dnd;

   return (
      <div className="flex flex-col h-full w-full p-4 sm:p-6 bg-bg-primary min-h-0">
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">

            {/* LADO ESQUERDO/CENTRO: Calendario, Métricas e Profissionais Livres */}
            <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">

               {/* Linha 1 (Topo): Calendário e Profissionais Livres */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                   <div className="lg:col-span-2 min-h-0 flex flex-col">
                      <AgendaCalendar
                        mode="gestao"
                        selectedDate={selectedDate}
                        onDateSelect={(_, dateObj) => setSelectedDate(dateObj)}
                     />
                  </div>
                  <div className="min-h-0 overflow-y-auto custom-scrollbar">
                     <AgendaProfissionaisLivres
                        loading={loading}
                        selectedDate={selectedDate}
                        profissionaisLivres={profissionaisLivres}
                        selectedProfDetails={selectedProfDetails}
                        setSelectedProfDetails={setSelectedProfDetails}
                        profMetricas={profMetricas}
                        loadProfissionalMetrics={loadProfissionalMetrics}
                        activeMetricPeriod={activeMetricPeriod}
                        setActiveMetricPeriod={setActiveMetricPeriod}
                        atendimentosDia={atendimentosDia}
                        handleDragStartProfissional={handleDragStartProfissional}
                        handleDragOver={handleDragOver}
                        handleDropToProfissionais={handleDropToProfissionais}
                     />
                  </div>
               </div>

               {/* Linha 2 (Base): Quadro Semanal de Métricas */}
               <div className="flex-1 min-h-0 relative group">
                  <button
                     onClick={() => setExpandedSummary(true)}
                     className="absolute top-2 right-2 z-10 p-2 bg-bg-secondary/80 hover:bg-bg-secondary rounded-xl border border-border-secondary text-text-tertiary hover:text-text-primary transition-all opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
                     title="Expandir tabela de métricas"
                  >
                     <Icon name="Maximize2" className="w-4 h-4" />
                  </button>
                  <AgendaWeekSummary
                     selectedDate={selectedDate}
                     setSelectedDate={setSelectedDate}
                     todasDisponibilidades={todasDisponibilidades}
                     atendimentosSemana={atendimentosSemana}
                     loading={loading}
                  />
               </div>

               {/* Modal expandido da tabela de métricas */}
               {expandedSummary && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-8">
                     <div className="relative bg-bg-secondary rounded-2xl border border-border-secondary shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border-secondary shrink-0">
                           <h2 className="text-lg font-black text-text-primary uppercase tracking-wider">Quadro Semanal de Métricas</h2>
                           <button
                              onClick={() => setExpandedSummary(false)}
                              className="p-2 hover:bg-bg-tertiary rounded-xl text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                           >
                              <Icon name="X" className="w-5 h-5" />
                           </button>
                        </div>
                        <div className="flex-1 min-h-0 p-4 overflow-auto">
                           <AgendaWeekSummary
                              selectedDate={selectedDate}
                              setSelectedDate={setSelectedDate}
                              todasDisponibilidades={todasDisponibilidades}
                              atendimentosSemana={atendimentosSemana}
                              loading={loading}
                           />
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* DIREITA: Lista Lateral de Atendimentos */}
             <div className="lg:col-span-1 min-h-0 overflow-y-auto custom-scrollbar">
                <AgendaAtendimentosList
                  loading={loading}
                  selectedDate={selectedDate}
                  atendimentosDia={atendimentosDia}
                  filterSemProfissional={filterSemProfissional}
                  setFilterSemProfissional={setFilterSemProfissional}
                  handleDragOver={handleDragOver}
                  handleDropOnAtendimento={handleDropOnAtendimento}
                  handleDragStartRemoveProfissional={handleDragStartRemoveProfissional}
               />
            </div>

         </div>
      </div>
   );
};

export default AgendaPrincipalView;
