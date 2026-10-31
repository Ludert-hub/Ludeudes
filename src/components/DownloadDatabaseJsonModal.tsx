import React, { useState, useMemo } from 'react';
import { PartidaItem, ProjectRecord } from '../types/costTypes';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Database,
  HardDrive,
  FolderTree,
  FileText,
  AlertCircle,
  X,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { buildDatabaseJsonPayload, downloadDatabaseJsonFile } from '../utils/projectManager';

interface DownloadDatabaseJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: ProjectRecord;
  currentItems: PartidaItem[];
  allProjects: ProjectRecord[];
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc: number;
  onSaveToServer?: () => Promise<void>;
}

export const DownloadDatabaseJsonModal: React.FC<DownloadDatabaseJsonModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  currentItems,
  allProjects,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  ivaPorc,
  onSaveToServer,
}) => {
  const [copiedType, setCopiedType] = useState<'full' | 'items' | null>(null);
  const [isSavingDisk, setIsSavingDisk] = useState(false);
  const [saveDiskSuccess, setSaveDiskSuccess] = useState(false);
  const [activeJsonTab, setActiveJsonTab] = useState<'persistent' | 'items'>('persistent');

  // Build the complete database payload reflecting current on-screen modifications
  const persistentPayload = useMemo(() => {
    return buildDatabaseJsonPayload(
      allProjects,
      activeProject,
      currentItems,
      fcasPorc,
      adminPorc,
      utilidadPorc,
      ivaPorc
    );
  }, [allProjects, activeProject, currentItems, fcasPorc, adminPorc, utilidadPorc, ivaPorc]);

  // Items-only payload (array of PartidaItem)
  const itemsPayload = useMemo(() => {
    return currentItems;
  }, [currentItems]);

  if (!isOpen) return null;

  const jsonStringPersistent = JSON.stringify(persistentPayload, null, 2);
  const jsonStringItems = JSON.stringify(itemsPayload, null, 2);

  const handleDownloadPersistent = () => {
    downloadDatabaseJsonFile(persistentPayload, 'projects_persistent.json');
  };

  const handleDownloadItems = () => {
    downloadDatabaseJsonFile(itemsPayload, `partidas_modificadas_${activeProject.shortName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  };

  const handleCopyPersistent = async () => {
    try {
      await navigator.clipboard.writeText(jsonStringPersistent);
      setCopiedType('full');
      setTimeout(() => setCopiedType(null), 3000);
    } catch {
      // Fallback
    }
  };

  const handleCopyItems = async () => {
    try {
      await navigator.clipboard.writeText(jsonStringItems);
      setCopiedType('items');
      setTimeout(() => setCopiedType(null), 3000);
    } catch {
      // Fallback
    }
  };

  const handleDirectSaveDisk = async () => {
    if (!onSaveToServer) return;
    setIsSavingDisk(true);
    try {
      await onSaveToServer();
      setSaveDiskSuccess(true);
      setTimeout(() => setSaveDiskSuccess(false), 4000);
    } finally {
      setIsSavingDisk(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-md">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Descargar Base de Datos JSON Actual
                </h3>
                <span className="text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {currentItems.length} Partidas Modificadas
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Exporta el estado en pantalla con todos los APUs, rendimientos, precios e insumos actualizados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm">
          
          {/* Main Action Banner: Two Download Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: projects_persistent.json (Recomendado) */}
            <div className="p-4 rounded-xl border-2 border-amber-400/80 bg-amber-50/50 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-600 text-white shadow-2xs">
                    <Sparkles className="w-3 h-3" />
                    RECOMENDADO PARA VALORES POR DEFECTO
                  </span>
                  <Database className="w-4 h-4 text-amber-700" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Archivo Completo: <code className="text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded text-xs font-mono">projects_persistent.json</code>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Contiene la estructura completa requerida por el sistema (proyectos, partidas, APUs, especificaciones, porcentajes legales y metadatos).
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/80 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPersistent}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar projects_persistent.json</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPersistent}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                  title="Copiar contenido JSON al portapapeles"
                >
                  {copiedType === 'full' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-800" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Solo array de partidas */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                    <Layers className="w-3 h-3 text-slate-600" />
                    SOLO PARTIDAS Y APUS (ARRAY)
                  </span>
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Array de Partidas: <code className="text-slate-800 bg-slate-200/80 px-1.5 py-0.5 rounded text-xs font-mono">partidas_modificadas.json</code>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Contiene únicamente el arreglo de partidas del proyecto activo actual ({currentItems.length} partidas completas con sus APUs).
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadItems}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Descargar Partidas JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyItems}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Copiar array de partidas al portapapeles"
                >
                  {copiedType === 'items' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-700" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Direct server disk save button */}
          {onSaveToServer && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950">
                    Guardado Automático en Disco del Servidor
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    También puedes escribir directamente estos datos modificados en el archivo <code className="font-mono font-bold">/data/projects_persistent.json</code> en este mismo instante.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDirectSaveDisk}
                disabled={isSavingDisk}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {isSavingDisk ? (
                  <span>Guardando en servidor...</span>
                ) : saveDiskSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>¡Guardado Exitosamente en /data!</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4 text-emerald-200" />
                    <span>Guardar directamente en Disco del Servidor</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Guide Section: ¿En qué archivo de src o data debo pegar este contenido? */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <FolderTree className="w-4 h-4" />
              <span>Instrucciones: ¿En qué archivo de la carpeta src o data debes pegar este contenido?</span>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              {/* Option A */}
              <div className="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0">
                    1
                  </span>
                  <span>Opción Principal y Definitiva (100% Recomendada):</span>
                  <code className="text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded font-mono text-xs">
                    /data/projects_persistent.json
                  </code>
                </div>
                <p className="text-slate-300 pl-7 text-[11px] sm:text-xs">
                  Pega el contenido del archivo descargado <strong className="text-white">projects_persistent.json</strong> directamente en el archivo 
                  <code className="mx-1 text-amber-200 font-mono">/data/projects_persistent.json</code> en la raíz del proyecto.
                </p>
                <div className="pl-7 text-[11px] text-slate-400 flex items-start gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>¿Por qué?:</strong> El servidor backend de Express (<code className="font-mono text-slate-300">server.ts</code>) lee automáticamente este archivo al arrancar (<code className="font-mono text-slate-300">/api/projects</code>). Al reemplazar este archivo, cualquier usuario, sesión o recarga tomará exactamente estos datos como los valores por defecto del sistema.
                  </span>
                </div>
              </div>

              {/* Option B */}
              <div className="bg-slate-800/80 rounded-lg p-3.5 border border-slate-700 space-y-1.5">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    2
                  </span>
                  <span>Si deseas actualizar el código fuente estático TypeScript en <code className="font-mono text-amber-200">/src/data/</code>:</span>
                </div>
                <p className="text-slate-300 pl-7 text-[11px] sm:text-xs">
                  En la carpeta <code className="font-mono text-slate-200">/src/data/</code> los datos de reserva estáticos están organizados en código TypeScript:
                </p>
                <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                    <span className="text-amber-400">src/data/items363_part1.ts</span> (Partidas 001 - 100)
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                    <span className="text-amber-400">src/data/items363_part2.ts</span> (Partidas 101 - 200)
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                    <span className="text-amber-400">src/data/items363_part3.ts</span> (Partidas 201 - 300)
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                    <span className="text-amber-400">src/data/items363_part4.ts</span> (Partidas 301 - 364)
                  </div>
                </div>
                <p className="text-slate-400 pl-7 text-[11px] pt-1">
                  Todos ellos se unifican y exportan en <code className="font-mono text-slate-200">src/data/itemsData.ts</code>. Sin embargo, para evitar tener que partir manualmente el JSON en 4 bloques de código TypeScript, <strong>la vía estándar y completa del sistema es sobrescribir <code className="font-mono text-amber-300">/data/projects_persistent.json</code></strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Preview Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Vista previa del JSON generado:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveJsonTab('persistent')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeJsonTab === 'persistent' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    projects_persistent.json
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveJsonTab('items')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeJsonTab === 'items' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                    }`}
                  >
                    Solo Partidas (Array)
                  </button>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                {activeJsonTab === 'persistent' ? `${jsonStringPersistent.length.toLocaleString()} caracteres` : `${jsonStringItems.length.toLocaleString()} caracteres`}
              </span>
            </div>

            <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl max-h-48 overflow-y-auto overflow-x-auto border border-slate-800 shadow-inner">
              {activeJsonTab === 'persistent'
                ? jsonStringPersistent.slice(0, 3000) + '\n\n... [Contenido completo truncado para vista previa. El botón descargar incluye el 100% de los datos] ...'
                : jsonStringItems.slice(0, 3000) + '\n\n... [Contenido completo truncado para vista previa. El botón descargar incluye el 100% de los datos] ...'}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Archivo destino: <code className="font-mono font-bold text-slate-800 bg-slate-200/80 px-1.5 py-0.5 rounded">/data/projects_persistent.json</code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownloadPersistent}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar JSON</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
