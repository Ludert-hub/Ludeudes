import React, { useState, useRef, useEffect } from 'react';
import { PROJECT_INFO } from '../data/projectInfo';
import { ProjectRecord } from '../types/costTypes';
import {
  SlidersHorizontal,
  Settings,
  FileText,
  FileSpreadsheet,
  FileDown,
  Layers,
  Share2,
  MapPin,
  ShieldCheck,
  Calendar,
  FolderKanban,
  FolderPlus,
  ChevronDown,
  Check,
  Plus,
  Save,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  totalPartidas?: number;
  onOpenInsumos?: () => void;
  onOpenParams: () => void;
  onOpenSpecs?: () => void;
  onExportPresupuesto?: () => void;
  onExportPresupuestoPdf?: () => void;
  onExportApuPdf?: () => void;
  onExportInsumosPorPartida?: () => void;
  onOpenSyncCenter?: () => void;
  onOpenShare?: () => void;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  // Multi-project props
  projectName?: string;
  projectSolped?: string;
  projectDivision?: string;
  projectUbicacion?: string;
  projects?: ProjectRecord[];
  activeProjectId?: string;
  onSelectProject?: (id: string) => void;
  onOpenProjectManager?: () => void;
  onOpenNewProjectComputos?: () => void;
  // Permanent persistence props
  isSaving?: boolean;
  lastSavedTime?: string;
  onCommitPermanent?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalPartidas = 364,
  onOpenInsumos,
  onOpenParams,
  onOpenSpecs,
  onExportPresupuesto,
  onExportPresupuestoPdf,
  onExportApuPdf,
  onExportInsumosPorPartida,
  onOpenSyncCenter,
  onOpenShare,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  projectName = PROJECT_INFO.descripcionLarga,
  projectSolped = PROJECT_INFO.solped,
  projectDivision = PROJECT_INFO.division,
  projectUbicacion = PROJECT_INFO.ubicacion,
  projects = [],
  activeProjectId,
  onSelectProject,
  onOpenProjectManager,
  onOpenNewProjectComputos,
  isSaving = false,
  lastSavedTime,
  onCommitPermanent,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-2xs print:hidden">
      {/* Main System Header (Style Sistema APU PDVSA) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Brand Badge & Active Project Title */}
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-black flex flex-col items-center justify-center font-black text-sm tracking-wider text-white shadow-md shrink-0 border border-slate-800 relative overflow-hidden">
              <div className="w-full h-1.5 bg-red-600 absolute top-0 left-0" />
              <span className="mt-0.5">PDVSA</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Sistema de Análisis de Precios Unitarios (APU)
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 rounded-md border border-red-200 truncate max-w-xs">
                  {projectDivision}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1 leading-snug line-clamp-2 max-w-4xl">
                {projectName}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-2">
                <span>
                  {totalPartidas} Partidas Codificadas (001 a {String(totalPartidas).padStart(3, '0')}) en USD ($)
                </span>
                <span>·</span>
                <span className="font-semibold text-slate-700">
                  FCAS: {fcasPorc}% | Admin: {adminPorc}% | Util: {utilidadPorc}%
                </span>
              </p>
            </div>
          </div>

          {/* Right: Multi-project Selector, Persistence Badge & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            {/* Realtime Permanent Storage Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all select-none ${
                isSaving
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-800'
              }`}
              title="Cualquier cambio realizado en cantidades, rendimientos o APU se guarda automáticamente en disco permanente y navegador."
            >
              {isSaving ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                  <span className="font-bold">Guardando...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold">Guardado Permanente</span>
                  {lastSavedTime && (
                    <span className="text-[10px] text-emerald-600 font-normal">
                      · {lastSavedTime}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Commit Permanent Baseline Button */}
            {onCommitPermanent && (
              <button
                type="button"
                onClick={onCommitPermanent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-lg shadow-xs transition-all cursor-pointer"
                title="Fijar permanentemente las cantidades y rendimientos actuales como la nueva línea base oficial del proyecto"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fijar Base Permanente</span>
              </button>
            )}

            {/* New Project from Cómputos Button */}
            {onOpenNewProjectComputos && (
              <button
                type="button"
                onClick={onOpenNewProjectComputos}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-all cursor-pointer"
                title="Cargar nuevos cómputos métricos en un nuevo proyecto sin modificar el actual"
              >
                <FolderPlus className="w-4 h-4 text-white" />
                <span>+ Nuevo Proyecto (Cómputos)</span>
              </button>
            )}

            {/* Project Switcher Dropdown */}
            {projects.length > 0 && onSelectProject && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  title="Cambiar entre proyectos almacenados"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                  <span className="max-w-[150px] truncate font-bold">
                    {activeProject?.shortName || 'Proyectos'}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                    {projects.length}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 animate-fadeIn">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Proyectos Guardados</span>
                      {onOpenProjectManager && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onOpenProjectManager();
                          }}
                          className="text-blue-600 hover:text-blue-800 normal-case font-semibold cursor-pointer"
                        >
                          Administrar todos
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                      {projects.map((p) => {
                        const isCur = p.id === activeProjectId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              onSelectProject(p.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 text-xs hover:bg-slate-50 transition-colors cursor-pointer ${
                              isCur ? 'bg-blue-50/70 text-blue-900 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-semibold">{p.shortName || p.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                <span>{p.items.length} partidas</span>
                                <span>·</span>
                                <span>SOLPED: {p.solped}</span>
                              </div>
                            </div>
                            {isCur && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>

                    {onOpenNewProjectComputos && (
                      <div className="border-t border-slate-100 p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onOpenNewProjectComputos();
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear Nuevo Proyecto</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Share Modal Button */}
            {onOpenShare && (
              <button
                type="button"
                onClick={onOpenShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-all cursor-pointer"
                title="Compartir enlace de la aplicación"
              >
                <Share2 className="w-3.5 h-3.5 text-red-400" />
                <span>Compartir</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick-Access Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onOpenInsumos}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Abrir Catálogo Maestro Centralizado de Insumos con sincronización global de precios"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
            <span>Maestro de Insumos</span>
          </button>

          {onOpenSyncCenter && (
            <button
              type="button"
              onClick={onOpenSyncCenter}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-800 hover:to-amber-800 border border-red-800 rounded-lg shadow-xs transition-all cursor-pointer"
              title="Cargar y sincronizar archivos: Presupuesto Excel PDVSA, Tablas Lulowin, Especificaciones o Presupuesto PDF"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Cargar / Sincronizar Archivos</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenParams}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Ajustes</span>
          </button>

          <button
            type="button"
            onClick={onOpenSpecs}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50/60 hover:bg-red-100/80 border border-red-200 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-red-600" />
            <span>Especificaciones Técnicas</span>
          </button>

          <button
            type="button"
            onClick={onExportPresupuesto}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Presupuesto</span>
          </button>

          {onExportPresupuestoPdf && (
            <button
              type="button"
              onClick={onExportPresupuestoPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50/70 hover:bg-red-100 border border-red-200 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Descargar Presupuesto General en formato oficial PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-red-600" />
              <span>PDF Presupuesto</span>
            </button>
          )}

          {onExportApuPdf && (
            <button
              type="button"
              onClick={onExportApuPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Descargar Libro Completo de APU en formato oficial PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>PDF Libro APU</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportInsumosPorPartida}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50/60 hover:bg-purple-100/80 border border-purple-200 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Insumos por Partida</span>
          </button>

          {onOpenProjectManager && (
            <button
              type="button"
              onClick={onOpenProjectManager}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer ml-auto"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
              <span>Mis Proyectos ({projects.length})</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
