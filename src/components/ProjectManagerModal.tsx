import React, { useRef } from 'react';
import { ProjectRecord } from '../types/costTypes';
import { OFFICIAL_PROJECT_ID, exportProjectsBackupJson, importProjectsBackupJson, loadAllProjects } from '../utils/projectManager';
import { calculateProjectFinancialSummary, formatCurrency } from '../utils/apuCalculations';
import {
  FolderKanban,
  CheckCircle2,
  FolderOpen,
  Copy,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Plus,
  ShieldCheck,
  X,
  Calendar,
  Building2,
  Layers,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectRecord[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onResetOfficial: () => void;
  onOpenNewProject: () => void;
  onProjectsImported: (updatedProjects: ProjectRecord[]) => void;
  onOpenSyncCenter?: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onDuplicateProject,
  onDeleteProject,
  onResetOfficial,
  onOpenNewProject,
  onProjectsImported,
  onOpenSyncCenter,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = importProjectsBackupJson(text);
      if (res.success) {
        const loaded = loadAllProjects();
        onProjectsImported(loaded);
      }
    } catch (err: unknown) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Gestor de Proyectos de Costos & APU PDVSA
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Almacena, alterna y gestiona múltiples proyectos de forma independiente y segura
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: New Project, Backup, Restore */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewProject();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Proyecto (Cómputos)</span>
            </button>

            <button
              type="button"
              onClick={onResetOfficial}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Restaura el proyecto oficial Toreño a sus 364 partidas originales"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Restablecer Toreño 364</span>
            </button>

            {onOpenSyncCenter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSyncCenter();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-800 hover:to-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Carga presupuestos Excel, tablas Lulowin, especificaciones y presupuestos PDF para actualizar cantidades y precios"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                <span>Cargar / Sincronizar Archivos (Excel/PDF)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportProjectsBackupJson(projects)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Descarga una copia de seguridad en JSON de todos tus proyectos guardados"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Copia de Respaldo (.json)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Restaura proyectos desde un archivo JSON previamente respaldado"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Restaurar (.json)</span>
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Proyectos Almacenados ({projects.length})</span>
            <span className="text-[11px] font-normal text-slate-500 lowercase">
              el cambio de proyecto actualiza automáticamente todos los APU, fichas y reportes
            </span>
          </div>

          <div className="space-y-3">
            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isOfficial = proj.id === OFFICIAL_PROJECT_ID || proj.isOfficialDefault;

              // Calculate summary on the fly
              const sum = calculateProjectFinancialSummary(
                proj.items,
                proj.fcasPorc,
                proj.adminPorc,
                proj.utilidadPorc,
                proj.ivaPorc
              );

              return (
                <div
                  key={proj.id}
                  className={`border rounded-2xl p-4 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50/30 shadow-xs ring-1 ring-blue-400'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Activo Actualmente
                          </span>
                        )}
                        {isOfficial && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 border border-red-200">
                            <ShieldCheck className="w-3 h-3 text-red-600" />
                            Proyecto Oficial Base
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          SOLPED: {proj.solped || 'N/A'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">
                        {proj.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
                        <span className="flex items-center gap-1 font-mono font-bold text-slate-800">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {proj.items.length} Partidas
                        </span>
                        <span className="font-mono font-bold text-blue-700">
                          Total: {formatCurrency(sum.granTotalGeneral)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          FCAS {proj.fcasPorc}% · Admin {proj.adminPorc}% · Util {proj.utilidadPorc}% · IVA {proj.ivaPorc}%
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(proj.id);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Abrir Proyecto</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                          En pantalla
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onDuplicateProject(proj.id)}
                        className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Duplicar este proyecto"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!isOfficial && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar el proyecto "${proj.name}"?`)) {
                              onDeleteProject(proj.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar este proyecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Todos los cambios se guardan localmente de forma inmediata y segura.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Gestor
          </button>
        </div>
      </div>
    </div>
  );
};
