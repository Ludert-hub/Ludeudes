import React, { useState, useMemo, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ALL_ITEMS } from './data/itemsData';
import { PROJECT_INFO } from './data/projectInfo';
import { PartidaItem, ApuDetail, ProjectRecord } from './types/costTypes';

import {
  loadAllProjects,
  saveAllProjects,
  saveAllProjectsToLocalOnly,
  reconcileLocalAndServerProjects,
  getActiveProjectId,
  setActiveProjectId,
  createNewProject,
  duplicateProject,
  deleteProject,
  resetOfficialProject,
  fetchServerProjects,
  syncProjectsToServer,
  OFFICIAL_PROJECT_ID,
} from './utils/projectManager';

import { calculateFinancialSummary } from './utils/apuCalculations';
import { exportPresupuestoToExcel, exportApuBookToExcel } from './utils/excelExport';
import { exportPresupuestoToPdf, exportApuBookToPdf } from './utils/pdfExport';
import { exportLulowinToExcel, exportInsumosPorPartidaToExcel } from './utils/lulowinExcelExport';
import { Header } from './components/Header';
import { FinancialSimulationBar } from './components/FinancialSimulationBar';
import { FinancialSummaryCards } from './components/FinancialSummaryCards';
import { ExportToolbar } from './components/ExportToolbar';
import { PresupuestoTable } from './components/PresupuestoTable';
import { ApuViewer } from './components/ApuViewer';
import { EspecificacionesViewer } from './components/EspecificacionesViewer';
import { CostAnalysis } from './components/CostAnalysis';
import { LegalParametersModal } from './components/LegalParametersModal';
import { ApuModal } from './components/ApuModal';
import { LulowinViewer } from './components/LulowinViewer';
import { MaestroInsumosViewer } from './components/MaestroInsumosViewer';
import { AddPartidaModal } from './components/AddPartidaModal';
import { PrintModal } from './components/PrintModal';
import { ShareAppModal } from './components/ShareAppModal';
import { NewProjectComputosModal } from './components/NewProjectComputosModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { DataSyncCenterModal } from './components/DataSyncCenterModal';
import { CronogramaViewer } from './components/CronogramaViewer';
import {
  propagateMaterialChangeGlobal,
  propagateEquipmentChangeGlobal,
  propagateLaborChangeGlobal,
  unifyAllCatalogPrices,
} from './utils/masterInsumosCatalog';

import {
  FileSpreadsheet,
  Calculator,
  BookOpen,
  BarChart3,
  Database,
  Plus,
  FolderPlus,
  FolderKanban,
  Calendar,
  TrendingUp,
  Boxes,
  Save
} from 'lucide-react';

type TabType = 'presupuesto' | 'apu' | 'insumos' | 'especificaciones' | 'cronograma' | 'analisis' | 'lulowin';

export default function App() {
  // Multi-project state: loaded from localStorage, official 364 always preserved
  const [projects, setProjects] = useState<ProjectRecord[]>(() => loadAllProjects());
  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => getActiveProjectId());

  // Persistence status tracking
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Guardado');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Smart reconciliation on mount: never overwrite newer localStorage edits with older server disk data
  useEffect(() => {
    fetchServerProjects().then((serverData) => {
      if (serverData && Array.isArray(serverData.projects) && serverData.projects.length > 0) {
        const currentLocal = loadAllProjects();
        const { merged, localHasNewerChanges } = reconcileLocalAndServerProjects(
          currentLocal,
          serverData.projects
        );
        setProjects(merged);
        saveAllProjectsToLocalOnly(merged);
        if (localHasNewerChanges) {
          syncProjectsToServer(merged, activeProjectId).catch(() => {});
        }
      }
    });
  }, []);

  // Active project resolution
  const activeProject = useMemo<ProjectRecord>(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Financial & Legal parameters
  const [fcasPorc, setFcasPorc] = useState<number>(() => activeProject.fcasPorc ?? 500.0);
  const [adminPorc, setAdminPorc] = useState<number>(() => activeProject.adminPorc ?? 12.5);
  const [utilidadPorc, setUtilidadPorc] = useState<number>(() => activeProject.utilidadPorc ?? 17.0);
  const [ivaPorc, setIvaPorc] = useState<number>(() => activeProject.ivaPorc ?? 16.0);

  // Sync parameters whenever the active project changes
  useEffect(() => {
    if (activeProject) {
      setFcasPorc(activeProject.fcasPorc ?? 500.0);
      setAdminPorc(activeProject.adminPorc ?? 12.5);
      setUtilidadPorc(activeProject.utilidadPorc ?? 17.0);
      setIvaPorc(activeProject.ivaPorc ?? 16.0);
    }
  }, [activeProject.id]);

  // Persist financial parameter changes immediately
  const persistParamsChange = (nextParams: {
    fcas?: number;
    admin?: number;
    utilidad?: number;
    iva?: number;
  }) => {
    const nextFcas = nextParams.fcas !== undefined ? nextParams.fcas : fcasPorc;
    const nextAdmin = nextParams.admin !== undefined ? nextParams.admin : adminPorc;
    const nextUtil = nextParams.utilidad !== undefined ? nextParams.utilidad : utilidadPorc;
    const nextIva = nextParams.iva !== undefined ? nextParams.iva : ivaPorc;

    if (nextParams.fcas !== undefined) setFcasPorc(nextFcas);
    if (nextParams.admin !== undefined) setAdminPorc(nextAdmin);
    if (nextParams.utilidad !== undefined) setUtilidadPorc(nextUtil);
    if (nextParams.iva !== undefined) setIvaPorc(nextIva);

    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            fcasPorc: nextFcas,
            adminPorc: nextAdmin,
            utilidadPorc: nextUtil,
            ivaPorc: nextIva,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    setProjects(updated);
    saveAllProjects(updated, activeProject.id);
    const time = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(time);
  };

  const handleSetFcasPorc = (val: number) => persistParamsChange({ fcas: val });
  const handleSetAdminPorc = (val: number) => persistParamsChange({ admin: val });
  const handleSetUtilidadPorc = (val: number) => persistParamsChange({ utilidad: val });
  const handleSetIvaPorc = (val: number) => persistParamsChange({ iva: val });

  // Active items from currently selected project
  const allItems = useMemo<PartidaItem[]>(() => {
    return activeProject.items.map((item, idx) => {
      const correlativo = item.id || (idx + 1);
      return {
        ...item,
        id: correlativo,
        codigoCovenin: item.codigoCovenin || String(correlativo).padStart(3, '0'),
      };
    });
  }, [activeProject.items]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('presupuesto');

  // Currently focused item for detailed APU and Specification views
  const [selectedItem, setSelectedItem] = useState<PartidaItem>(() => allItems[0] || ALL_ITEMS[0]);

  // Modals state
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [modalApuItem, setModalApuItem] = useState<PartidaItem | null>(null);
  const [isAddPartidaOpen, setIsAddPartidaOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState<boolean>(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Print modal state
  const [printModalData, setPrintModalData] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    content: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    content: null,
  });

  const handleOpenPrint = (title: string, content: React.ReactNode, subtitle?: string) => {
    setPrintModalData({
      isOpen: true,
      title,
      subtitle,
      content,
    });
  };

  // Recalculate summary live whenever parameters or item quantities change
  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(allItems, fcasPorc, adminPorc, utilidadPorc, ivaPorc);
  }, [allItems, fcasPorc, adminPorc, utilidadPorc, ivaPorc]);

  // Keep selected item updated if its data changes
  const activeSelectedItem = useMemo(() => {
    return allItems.find((i) => i.id === selectedItem?.id) || allItems[0] || ALL_ITEMS[0];
  }, [allItems, selectedItem]);

  // Keep modal APU item updated if its data changes
  const activeModalApuItem = useMemo(() => {
    return modalApuItem ? allItems.find((i) => i.id === modalApuItem.id) || null : null;
  }, [allItems, modalApuItem]);

  // Count modified quantities in current project compared to baseline
  const modifiedCount = useMemo(() => {
    if (activeProject.id === OFFICIAL_PROJECT_ID) {
      return allItems.filter((it, idx) => it.cantidad !== ALL_ITEMS[idx]?.cantidad).length;
    }
    return 0;
  }, [allItems, activeProject.id]);

  // Helper to persist updated items and parameters for the active project
  const updateActiveProjectItems = (newItems: PartidaItem[], toastMsg?: string) => {
    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            items: newItems,
            fcasPorc,
            adminPorc,
            utilidadPorc,
            ivaPorc,
            updatedAt: nowIso,
          }
        : p
    );
    setProjects(updated);
    saveAllProjectsToLocalOnly(updated);

    const time = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(time);

    if (toastMsg) {
      showToast(toastMsg);
    }

    // Sync to disk permanently in background
    syncProjectsToServer(updated, activeProject.id)
      .then(() => {
        setIsSaving(false);
      })
      .catch(() => {
        setIsSaving(false);
      });
  };

  // Explicit Save All Changes handler (button + Ctrl+S)
  const handleCommitPermanentBaseline = async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            items: allItems,
            fcasPorc,
            adminPorc,
            utilidadPorc,
            ivaPorc,
            updatedAt: nowIso,
          }
        : p
    );
    setProjects(updated);
    const localOk = saveAllProjectsToLocalOnly(updated);
    const serverOk = await syncProjectsToServer(updated, activeProject.id);
    const time = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(time);
    setIsSaving(false);

    if (localOk || serverOk) {
      showToast(`✓ Cambios guardados permanentemente (${time}) en navegador y servidor.`);
    } else {
      showToast(`✓ Cambios aplicados en la sesión actual (${time}).`);
    }
  };

  // Support Ctrl+S / Cmd+S keyboard shortcut to save changes anytime
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleCommitPermanentBaseline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allItems, fcasPorc, adminPorc, utilidadPorc, ivaPorc, activeProject.id, projects]);

  // =========================================================
  // Global Insumo Price Propagation Handlers (Data Binding)
  // =========================================================
  const handlePropagateMaterial = (
    targetKey: string,
    changes: { costoUnitario?: number; desperdicioPorc?: number; unidad?: string }
  ) => {
    const { updatedItems, affectedPartidaIds } = propagateMaterialChangeGlobal(
      allItems,
      targetKey,
      changes
    );
    updateActiveProjectItems(
      updatedItems,
      `⚡ Precio de material sincronizado automáticamente en ${affectedPartidaIds.length} ${
        affectedPartidaIds.length === 1 ? 'partida' : 'partidas'
      }`
    );
  };

  const handlePropagateEquipment = (
    targetKey: string,
    changes: { costo?: number; depreciacionOAlquiler?: number; costoDiario?: number }
  ) => {
    const { updatedItems, affectedPartidaIds } = propagateEquipmentChangeGlobal(
      allItems,
      targetKey,
      changes
    );
    updateActiveProjectItems(
      updatedItems,
      `⚡ Costo de equipo sincronizado automáticamente en ${affectedPartidaIds.length} ${
        affectedPartidaIds.length === 1 ? 'partida' : 'partidas'
      }`
    );
  };

  const handlePropagateLabor = (
    targetKey: string,
    changes: { salarioDiario?: number }
  ) => {
    const { updatedItems, affectedPartidaIds } = propagateLaborChangeGlobal(
      allItems,
      targetKey,
      changes
    );
    updateActiveProjectItems(
      updatedItems,
      `⚡ Salario LOTTT sincronizado automáticamente en ${affectedPartidaIds.length} ${
        affectedPartidaIds.length === 1 ? 'partida' : 'partidas'
      }`
    );
  };

  const handleUnifyAllPrices = () => {
    const { updatedItems, unifiedCount } = unifyAllCatalogPrices(allItems);
    updateActiveProjectItems(
      updatedItems,
      `✓ Catálogo Maestro unificado (${unifiedCount} registros sincronizados al mismo precio unitario)`
    );
  };

  // Live item quantity update handler
  const handleUpdateQuantity = (itemId: number, newQty: number) => {
    const updatedItems = allItems.map((it) =>
      it.id === itemId ? { ...it, cantidad: Math.max(0, newQty) } : it
    );
    updateActiveProjectItems(updatedItems);
  };

  // Live item yield (rendimiento) update handler
  const handleUpdateRendimiento = (itemId: number, newRend: number) => {
    const safeRend = Math.max(0.01, newRend);
    const updatedItems = allItems.map((it) =>
      it.id === itemId
        ? {
            ...it,
            apu: {
              ...it.apu,
              rendimiento: safeRend,
            },
          }
        : it
    );
    updateActiveProjectItems(updatedItems);
  };

  // Live item unit (unidad) update handler
  const handleUpdateUnidad = (itemId: number, newUnidad: string) => {
    const cleanUnit = (newUnidad || '').trim().toUpperCase();
    if (!cleanUnit) return;
    const updatedItems = allItems.map((it) => {
      if (it.id === itemId) {
        let newUnidadRend = it.apu.unidadRendimiento;
        if (!newUnidadRend || newUnidadRend.includes('/')) {
          const suffix = newUnidadRend && newUnidadRend.includes('/') ? newUnidadRend.split('/')[1] : 'día';
          newUnidadRend = `${cleanUnit}/${suffix}`;
        }
        return {
          ...it,
          unidad: cleanUnit,
          apu: {
            ...it.apu,
            unidadRendimiento: newUnidadRend,
          },
        };
      }
      return it;
    });
    updateActiveProjectItems(updatedItems);
  };

  // Live APU update handler (materials, equipment, labor, yield)
  const handleUpdateItemApu = (itemId: number, newApu: ApuDetail) => {
    const updatedItems = allItems.map((it) =>
      it.id === itemId ? { ...it, apu: newApu } : it
    );
    updateActiveProjectItems(updatedItems);
  };

  // Reset a single partida APU back to baseline
  const handleResetItemApu = (itemId: number) => {
    const baseline = ALL_ITEMS.find((it) => it.id === itemId);
    if (baseline) {
      handleUpdateItemApu(itemId, JSON.parse(JSON.stringify(baseline.apu)));
    }
  };

  // Reset item quantities back to original official records (for Toreño project)
  const handleResetQuantities = () => {
    if (activeProject.id === OFFICIAL_PROJECT_ID) {
      updateActiveProjectItems(ALL_ITEMS, '✓ Proyecto restablecido a los cómputos y precios oficiales.');
    }
  };

  // Reset parameters to fixed values (FCAS 500%, Admin 12.5%, Utilidad 17%, IVA 16%)
  const handleResetParams = () => {
    setFcasPorc(500.0);
    setAdminPorc(12.5);
    setUtilidadPorc(17.0);
    setIvaPorc(16.0);

    const updated = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            fcasPorc: 500.0,
            adminPorc: 12.5,
            utilidadPorc: 17.0,
            ivaPorc: 16.0,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    setProjects(updated);
    saveAllProjects(updated);
  };

  // Handler to annex new partida to active project
  const handleAddPartida = (newPartida: PartidaItem) => {
    const updatedItems = [...allItems, newPartida];
    updateActiveProjectItems(updatedItems);
    setSelectedItem(newPartida);
  };

  // Project Management Handlers
  const handleSelectProject = (projectId: string) => {
    setActiveProjectIdState(projectId);
    setActiveProjectId(projectId);
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setFcasPorc(target.fcasPorc ?? 500.0);
      setAdminPorc(target.adminPorc ?? 12.5);
      setUtilidadPorc(target.utilidadPorc ?? 17.0);
      setIvaPorc(target.ivaPorc ?? 16.0);
      if (target.items.length > 0) {
        setSelectedItem(target.items[0]);
      }
    }
  };

  const handleProjectCreated = (newProjectData: {
    name: string;
    shortName: string;
    solped: string;
    division: string;
    ubicacion: string;
    fcasPorc: number;
    adminPorc: number;
    utilidadPorc: number;
    ivaPorc: number;
    items: PartidaItem[];
  }) => {
    const created = createNewProject(newProjectData, newProjectData.items);
    const updatedList = loadAllProjects();
    setProjects(updatedList);
    setActiveProjectIdState(created.id);
    setActiveProjectId(created.id);
    setFcasPorc(created.fcasPorc);
    setAdminPorc(created.adminPorc);
    setUtilidadPorc(created.utilidadPorc);
    setIvaPorc(created.ivaPorc);
    if (created.items.length > 0) {
      setSelectedItem(created.items[0]);
    }
  };

  const handleDuplicateProject = (projectId: string) => {
    const copy = duplicateProject(projectId);
    if (copy) {
      const updatedList = loadAllProjects();
      setProjects(updatedList);
      setActiveProjectIdState(copy.id);
      setActiveProjectId(copy.id);
      setFcasPorc(copy.fcasPorc);
      setAdminPorc(copy.adminPorc);
      setUtilidadPorc(copy.utilidadPorc);
      setIvaPorc(copy.ivaPorc);
      if (copy.items.length > 0) {
        setSelectedItem(copy.items[0]);
      }
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const res = deleteProject(projectId);
    if (res.success) {
      const updatedList = loadAllProjects();
      setProjects(updatedList);
      if (res.nextActiveId) {
        handleSelectProject(res.nextActiveId);
      }
    }
  };

  const handleResetOfficial = () => {
    const pristine = resetOfficialProject();
    const updatedList = loadAllProjects();
    setProjects(updatedList);
    setActiveProjectIdState(OFFICIAL_PROJECT_ID);
    setFcasPorc(500.0);
    setAdminPorc(12.5);
    setUtilidadPorc(17.0);
    setIvaPorc(16.0);
    setSelectedItem(pristine.items[0]);
    showToast('✓ Proyecto oficial El Toreño restablecido a sus 364 partidas y parámetros originales.');
  };

  // Quick navigation handlers from table actions
  const handleNavigateToApu = (item: PartidaItem) => {
    setSelectedItem(item);
    setActiveTab('apu');
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const handleNavigateToSpec = (item: PartidaItem) => {
    setSelectedItem(item);
    setActiveTab('especificaciones');
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const handleOpenApuModal = (item: PartidaItem) => {
    setModalApuItem(item);
  };

  // Sync handler: applies extracted data from files and optionally commits permanently to disk
  const handleApplySyncedItems = async (updatedItems: PartidaItem[], isPermanent: boolean) => {
    setIsSaving(true);
    const nowIso = new Date().toISOString();
    const updatedProjects = projects.map((p) => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          items: updatedItems,
          updatedAt: nowIso,
        };
      }
      return p;
    });

    setProjects(updatedProjects);

    if (isPermanent) {
      saveAllProjects(updatedProjects, activeProject.id);
      await syncProjectsToServer(updatedProjects, activeProject.id);
      const time = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(time);
      showToast('✓ Datos de archivos actualizados y guardados permanentemente en disco como línea base.');
    } else {
      saveAllProjectsToLocalOnly(updatedProjects);
      showToast('✓ Datos actualizados en la sesión local.');
    }
    setIsSaving(false);
  };

  // Active project metadata for PDF exports
  const activeProjectMeta = useMemo(() => {
    return {
      name: activeProject.name,
      solped: activeProject.solped,
      division: activeProject.division,
      fecha: activeProject.fecha,
    };
  }, [activeProject]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans antialiased selection:bg-red-900 selection:text-white">
      {/* 1. Executive PDVSA Header with Project Switcher & New Project button */}
      <Header
        totalPartidas={allItems.length}
        onOpenInsumos={() => setActiveTab('insumos')}
        onOpenParams={() => setIsLegalModalOpen(true)}
        onOpenSpecs={() => setActiveTab('especificaciones')}
        onOpenSyncCenter={() => setIsSyncModalOpen(true)}
        onExportPresupuesto={() =>
          exportPresupuestoToExcel(allItems, financialSummary, fcasPorc, adminPorc, utilidadPorc, ivaPorc)
        }
        onExportPresupuestoPdf={() =>
          exportPresupuestoToPdf(allItems, financialSummary, fcasPorc, adminPorc, utilidadPorc, ivaPorc, activeProjectMeta)
        }
        onExportApuPdf={() =>
          exportApuBookToPdf(allItems, fcasPorc, adminPorc, utilidadPorc, activeProjectMeta)
        }
        onExportInsumosPorPartida={() =>
          exportInsumosPorPartidaToExcel(allItems, 'ZXV', fcasPorc, adminPorc, utilidadPorc)
        }
        onOpenShare={() => setIsShareModalOpen(true)}
        fcasPorc={fcasPorc}
        adminPorc={adminPorc}
        utilidadPorc={utilidadPorc}
        projectName={activeProject.name}
        projectSolped={activeProject.solped}
        projectDivision={activeProject.division}
        projectUbicacion={activeProject.ubicacion}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenNewProjectComputos={() => setIsNewProjectOpen(true)}
        isSaving={isSaving}
        lastSavedTime={lastSavedTime}
        onCommitPermanent={handleCommitPermanentBaseline}
      />

      {/* Persistent Save Notification Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce duration-300">
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main id="main-app-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full space-y-4">
        {/* Interactive Live Financial Simulation Bar (Fixed: FCAS 500%, Admin 12.5%, Utilidad 17%) */}
        <FinancialSimulationBar
          fcasPorc={fcasPorc}
          setFcasPorc={handleSetFcasPorc}
          adminPorc={adminPorc}
          setAdminPorc={handleSetAdminPorc}
          utilidadPorc={utilidadPorc}
          setUtilidadPorc={handleSetUtilidadPorc}
          ivaPorc={ivaPorc}
          setIvaPorc={handleSetIvaPorc}
          onResetParams={handleResetParams}
          modifiedCount={modifiedCount}
          onResetQuantities={handleResetQuantities}
        />

        {/* 2. Financial KPI Summary Cards */}
        <FinancialSummaryCards
          summary={financialSummary}
          fcasPorc={fcasPorc}
          adminPorc={adminPorc}
          utilidadPorc={utilidadPorc}
          ivaPorc={ivaPorc}
        />

        {/* 3. Export Center Toolbar */}
        <ExportToolbar
          items={allItems}
          summary={financialSummary}
          fcasPorc={fcasPorc}
          adminPorc={adminPorc}
          utilidadPorc={utilidadPorc}
          ivaPorc={ivaPorc}
          onOpenAddPartida={() => setIsAddPartidaOpen(true)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onOpenSyncCenter={() => setIsSyncModalOpen(true)}
        />

        {/* 4. Tab Navigation Strip */}
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('presupuesto')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'presupuesto'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Presupuesto General</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'presupuesto'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('insumos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'insumos'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Catálogo Maestro Centralizado de Insumos con Data Binding Global de Precios"
            >
              <Boxes className={`w-4 h-4 ${activeTab === 'insumos' ? 'text-emerald-200' : 'text-emerald-600'}`} />
              <span>Maestro de Insumos</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'insumos'
                    ? 'bg-emerald-900 text-emerald-100'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Global
              </span>
            </button>

            <button
              onClick={() => setActiveTab('apu')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'apu'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-4 h-4 text-blue-500" />
              <span>Libro de APU Detallado</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'apu'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allItems.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('especificaciones')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'especificaciones'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>Especificaciones Técnicas</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'especificaciones'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                15 Secciones
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cronograma')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cronograma'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span>Cronograma & Curva S</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'cronograma'
                    ? 'bg-red-900 text-red-100'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                8 Meses
              </span>
            </button>

            <button
              onClick={() => setActiveTab('lulowin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'lulowin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="w-4 h-4 text-purple-500" />
              <span>Tablas LuloWin / Obra</span>
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'lulowin'
                    ? 'bg-purple-900 text-purple-100'
                    : 'bg-purple-50 text-purple-700'
                }`}
              >
                11 Hojas
              </span>
            </button>

            <button
              onClick={() => setActiveTab('analisis')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'analisis'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span>Estructura & Pareto</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleCommitPermanentBaseline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Guardar todos los cambios realizados en disco y navegador (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>

            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Cargar cómputos métricos en un nuevo proyecto"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Nuevo Proyecto</span>
            </button>

            <button
              onClick={() => setIsAddPartidaOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anexar Partida</span>
            </button>
          </div>
        </div>

        {/* 5. Tab Panels */}
        <div className="transition-opacity duration-200">
          {activeTab === 'presupuesto' && (
            <PresupuestoTable
              items={allItems}
              summary={financialSummary}
              fcasPorc={fcasPorc}
              adminPorc={adminPorc}
              utilidadPorc={utilidadPorc}
              ivaPorc={ivaPorc}
              onSelectApu={handleOpenApuModal}
              onSelectSpec={handleNavigateToSpec}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateRendimiento={handleUpdateRendimiento}
              onUpdateUnidad={handleUpdateUnidad}
              onOpenInsumos={() => setActiveTab('insumos')}
              onOpenParams={() => setIsLegalModalOpen(true)}
              onOpenSpecsTab={() => setActiveTab('especificaciones')}
              onOpenCronogramaTab={() => setActiveTab('cronograma')}
              onSaveChanges={handleCommitPermanentBaseline}
              onExportPresupuesto={() =>
                exportPresupuestoToExcel(allItems, financialSummary, fcasPorc, adminPorc, utilidadPorc, ivaPorc)
              }
              onExportPresupuestoPdf={() =>
                exportPresupuestoToPdf(allItems, financialSummary, fcasPorc, adminPorc, utilidadPorc, ivaPorc, activeProjectMeta)
              }
              onExportInsumosPorPartida={() =>
                exportInsumosPorPartidaToExcel(allItems, 'ZXV', fcasPorc, adminPorc, utilidadPorc)
              }
              onExportLulowin={() =>
                exportLulowinToExcel(allItems, 'ZXV', fcasPorc, adminPorc, utilidadPorc)
              }
              onExportApu={() =>
                exportApuBookToExcel(allItems, fcasPorc, adminPorc, utilidadPorc)
              }
              onExportApuPdf={() =>
                exportApuBookToPdf(allItems, fcasPorc, adminPorc, utilidadPorc, activeProjectMeta)
              }
            />
          )}

          {activeTab === 'insumos' && (
            <MaestroInsumosViewer
              items={allItems}
              summary={financialSummary}
              fcasPorc={fcasPorc}
              adminPorc={adminPorc}
              utilidadPorc={utilidadPorc}
              ivaPorc={ivaPorc}
              onPropagateMaterial={handlePropagateMaterial}
              onPropagateEquipment={handlePropagateEquipment}
              onPropagateLabor={handlePropagateLabor}
              onUnifyAllPrices={handleUnifyAllPrices}
              onSaveChanges={handleCommitPermanentBaseline}
              onResetAllToBaseline={handleResetQuantities}
              onSelectPartidaApu={handleNavigateToApu}
            />
          )}

          {activeTab === 'apu' && (
            <ApuViewer
              items={allItems}
              selectedItem={activeSelectedItem}
              onSelectItem={setSelectedItem}
              fcasPorc={fcasPorc}
              adminPorc={adminPorc}
              utilidadPorc={utilidadPorc}
              onUpdateItemApu={handleUpdateItemApu}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateUnidad={handleUpdateUnidad}
              onResetApu={handleResetItemApu}
              onPropagateMaterial={handlePropagateMaterial}
              onPropagateEquipment={handlePropagateEquipment}
              onPropagateLabor={handlePropagateLabor}
              onSaveChanges={handleCommitPermanentBaseline}
            />
          )}

          {activeTab === 'especificaciones' && (
            <EspecificacionesViewer
              items={allItems}
              selectedItem={activeSelectedItem}
              onSelectItem={setSelectedItem}
              onClose={() => setActiveTab('presupuesto')}
            />
          )}

          {activeTab === 'cronograma' && (
            <CronogramaViewer
              projectId={activeProject.id}
              projectName={activeProject.name}
              projectSolped={activeProject.solped}
              items={allItems}
              summary={financialSummary}
              fcasPorc={fcasPorc}
              adminPorc={adminPorc}
              utilidadPorc={utilidadPorc}
              ivaPorc={ivaPorc}
            />
          )}

          {activeTab === 'lulowin' && (
            <LulowinViewer
              items={allItems}
              fcasPorc={fcasPorc}
              adminPorc={adminPorc}
              utilidadPorc={utilidadPorc}
              onOpenAddPartida={() => setIsAddPartidaOpen(true)}
              onOpenPrint={handleOpenPrint}
              onPropagateMaterial={handlePropagateMaterial}
              onPropagateEquipment={handlePropagateEquipment}
              onPropagateLabor={handlePropagateLabor}
              onOpenMaestroInsumos={() => setActiveTab('insumos')}
            />
          )}

          {activeTab === 'analisis' && (
            <CostAnalysis
              items={allItems}
              summary={financialSummary}
              fcasPorc={fcasPorc}
              adminPorc={adminPorc}
              utilidadPorc={utilidadPorc}
              onSelectApu={handleNavigateToApu}
              onSelectSpec={handleNavigateToSpec}
            />
          )}
        </div>
      </main>

      {/* 6. Modals */}
      <NewProjectComputosModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onProjectCreated={handleProjectCreated}
        baseCatalog={ALL_ITEMS}
      />

      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onResetOfficial={handleResetOfficial}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        onOpenSyncCenter={() => setIsSyncModalOpen(true)}
        onProjectsImported={(imported) => {
          setProjects(imported);
          if (imported.length > 0) {
            handleSelectProject(imported[0].id);
          }
        }}
      />

      <LegalParametersModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        fcasPorc={fcasPorc}
        setFcasPorc={handleSetFcasPorc}
        adminPorc={adminPorc}
        setAdminPorc={handleSetAdminPorc}
        utilidadPorc={utilidadPorc}
        setUtilidadPorc={handleSetUtilidadPorc}
        ivaPorc={ivaPorc}
        setIvaPorc={handleSetIvaPorc}
        onReset={handleResetParams}
      />

      <ApuModal
        item={activeModalApuItem}
        onClose={() => setModalApuItem(null)}
        onOpenFullApu={handleNavigateToApu}
        onOpenSpec={handleNavigateToSpec}
        fcasPorc={fcasPorc}
        adminPorc={adminPorc}
        utilidadPorc={utilidadPorc}
        onUpdateItemApu={handleUpdateItemApu}
        onUpdateQuantity={handleUpdateQuantity}
        onUpdateUnidad={handleUpdateUnidad}
        onResetApu={handleResetItemApu}
        onPropagateMaterial={handlePropagateMaterial}
        onPropagateEquipment={handlePropagateEquipment}
        onPropagateLabor={handlePropagateLabor}
        onSaveChanges={handleCommitPermanentBaseline}
      />

      <AddPartidaModal
        isOpen={isAddPartidaOpen}
        onClose={() => setIsAddPartidaOpen(false)}
        existingItems={allItems}
        onAddPartida={handleAddPartida}
      />

      <PrintModal
        isOpen={printModalData.isOpen}
        onClose={() => setPrintModalData((prev) => ({ ...prev, isOpen: false }))}
        title={printModalData.title}
        subtitle={printModalData.subtitle}
      >
        {printModalData.content}
      </PrintModal>

      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        items={allItems}
        summary={financialSummary}
        fcasPorc={fcasPorc}
        adminPorc={adminPorc}
        utilidadPorc={utilidadPorc}
        ivaPorc={ivaPorc}
        totalPartidas={allItems.length}
        granTotal={financialSummary.granTotalGeneral}
      />

      <DataSyncCenterModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        activeProject={activeProject}
        currentItems={allItems}
        fcasPorc={fcasPorc}
        adminPorc={adminPorc}
        utilidadPorc={utilidadPorc}
        onApplyChanges={handleApplySyncedItems}
      />

      {/* 7. Corporate Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mt-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-200 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              PDVSA · Petróleos de Venezuela, S.A.
            </div>
            <p className="text-slate-500 text-[11px]">
              {activeProject.name} · SOLPED: {activeProject.solped}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500">División:</span>{' '}
              <strong className="text-slate-300">{activeProject.division}</strong>
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <div>
              <span className="text-slate-500">Parámetros Fijos:</span>{' '}
              <strong className="text-slate-300">FCAS {fcasPorc}% · Adm {adminPorc}% · Util {utilidadPorc}%</strong>
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <div className="font-mono text-emerald-400">
              LOTTT & CCP
            </div>
          </div>
        </div>
      </footer>
      <SpeedInsights />
    </div>
  );
}
