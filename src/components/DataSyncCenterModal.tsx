import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PartidaItem, ProjectRecord } from '../types/costTypes';
import {
  parseExcelSyncData,
  parsePdfTextToPartidas,
  reconcileProjectData,
  validateAllProjectApus,
  ExtractedPartidaData,
  PartidaDiff,
  SyncResult,
} from '../utils/fileSyncParser';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Database,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  X,
  FileUp,
  Download,
  ChevronDown,
  ChevronUp,
  Boxes,
  Percent,
  Wrench,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';

interface AvailableServerFile {
  name: string;
  path: string;
  size: number;
  type: 'excel' | 'pdf';
  category: 'presupuesto' | 'lulowin' | 'especificaciones' | 'computos' | 'otro';
}

interface DataSyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: ProjectRecord;
  currentItems: PartidaItem[];
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  onApplyChanges: (updatedItems: PartidaItem[], isPermanent: boolean) => Promise<void>;
}

export function DataSyncCenterModal({
  isOpen,
  onClose,
  activeProject,
  currentItems,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  onApplyChanges,
}: DataSyncCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'server'>('upload');
  const [serverFiles, setServerFiles] = useState<AvailableServerFile[]>([]);
  const [isLoadingServerFiles, setIsLoadingServerFiles] = useState<boolean>(false);

  // File loading state
  const [loadedFilesInfo, setLoadedFilesInfo] = useState<Array<{ name: string; type: string; recordsCount: number }>>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Synchronization settings
  const [updateQuantities, setUpdateQuantities] = useState<boolean>(true);
  const [updatePrices, setUpdatePrices] = useState<boolean>(true);
  const [updateYields, setUpdateYields] = useState<boolean>(true);
  const [updateSpecs, setUpdateSpecs] = useState<boolean>(true);
  const [updateInsumoQuantities, setUpdateInsumoQuantities] = useState<boolean>(true);
  const [updateDesperdicios, setUpdateDesperdicios] = useState<boolean>(true);
  const [updateDepreciaciones, setUpdateDepreciaciones] = useState<boolean>(true);
  const [expandedDiffId, setExpandedDiffId] = useState<number | null>(null);

  // Raw extracted data accumulators
  const [extractedItems, setExtractedItems] = useState<ExtractedPartidaData[]>([]);

  // Reconciliation preview result
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [onlyChangedFilter, setOnlyChangedFilter] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Success / saving state
  const [isSavingPermanent, setIsSavingPermanent] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available server files on modal open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingServerFiles(true);
      fetch('/api/available-files')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.files)) {
            setServerFiles(data.files);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingServerFiles(false));
    }
  }, [isOpen]);

  // Re-run reconciliation when extractedItems or sync options change
  useEffect(() => {
    if (extractedItems.length > 0) {
      const res = reconcileProjectData(currentItems, extractedItems, {
        updateQuantities,
        updatePrices,
        updateYields,
        updateSpecs,
        updateInsumoQuantities,
        updateDesperdicios,
        updateDepreciaciones,
        fcasPorc,
        adminPorc,
        utilidadPorc,
      });
      setSyncResult(res);
    } else {
      setSyncResult(null);
    }
  }, [
    extractedItems,
    updateQuantities,
    updatePrices,
    updateYields,
    updateSpecs,
    updateInsumoQuantities,
    updateDesperdicios,
    updateDepreciaciones,
    fcasPorc,
    adminPorc,
    utilidadPorc,
    currentItems,
  ]);

  // Global APU Integrity Validation Report for all items
  const validationReport = useMemo(() => {
    if (!syncResult) return null;
    return validateAllProjectApus(syncResult.updatedItems);
  }, [syncResult]);


  if (!isOpen) return null;

  // Process a local file (Excel or PDF)
  const processUploadedFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isExcel = ext === 'xlsx' || ext === 'xls';
    const isPdf = ext === 'pdf';

    if (!isExcel && !isPdf) {
      alert(`El formato .${ext} no es compatible. Por favor sube archivos .xlsx, .xls o .pdf`);
      return;
    }

    setIsProcessing(true);
    setProcessingStatus(`Procesando ${file.name}...`);

    try {
      let parsedRows: ExtractedPartidaData[] = [];

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        parsedRows = parseExcelSyncData(buffer, file.name);
      } else if (isPdf) {
        // Send to server PDF parser
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: base64Data }),
        });

        const json = await res.json();
        if (json.success && json.text) {
          parsedRows = parsePdfTextToPartidas(json.text, file.name);
        } else {
          throw new Error(json.error || 'No se pudo extraer texto del PDF');
        }
      }

      setExtractedItems((prev) => [...prev, ...parsedRows]);
      setLoadedFilesInfo((prev) => [
        ...prev,
        {
          name: file.name,
          type: isExcel ? 'Excel (XLS/XLSX)' : 'PDF',
          recordsCount: parsedRows.length,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al procesar archivo';
      alert(`Error al procesar ${file.name}: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Handle multi-file selection from input
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await processUploadedFile(files[i]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Process a server-stored file
  const processServerFile = async (file: AvailableServerFile) => {
    setIsProcessing(true);
    setProcessingStatus(`Leyendo ${file.name} desde el servidor...`);

    try {
      let parsedRows: ExtractedPartidaData[] = [];

      if (file.type === 'excel') {
        const res = await fetch('/api/read-server-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relativePath: file.path }),
        });
        const json = await res.json();
        if (json.success && json.base64) {
          const binaryString = atob(json.base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          parsedRows = parseExcelSyncData(bytes.buffer, file.name);
        } else {
          throw new Error(json.error || 'Error al leer archivo Excel del servidor');
        }
      } else {
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relativePath: file.path }),
        });
        const json = await res.json();
        if (json.success && json.text) {
          parsedRows = parsePdfTextToPartidas(json.text, file.name);
        } else {
          throw new Error(json.error || 'Error al procesar PDF en el servidor');
        }
      }

      setExtractedItems((prev) => [...prev, ...parsedRows]);
      setLoadedFilesInfo((prev) => [
        ...prev,
        {
          name: file.name,
          type: file.type === 'excel' ? 'Excel Servidor' : 'PDF Servidor',
          recordsCount: parsedRows.length,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error al procesar ${file.name}: ${msg}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Process ALL available server files in one click
  const processAllServerFiles = async () => {
    for (const f of serverFiles) {
      await processServerFile(f);
    }
  };

  // Reset / Clear loaded files
  const handleClear = () => {
    setExtractedItems([]);
    setLoadedFilesInfo([]);
    setSyncResult(null);
  };

  // Apply changes to project and commit as permanent
  const handleApplyPermanent = async () => {
    if (!syncResult) return;
    setIsSavingPermanent(true);
    try {
      await onApplyChanges(syncResult.updatedItems, true);
      setSaveSuccessMessage('¡Datos actualizados y guardados permanentemente en disco con éxito!');
      setTimeout(() => {
        setSaveSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      alert(`Error al guardar permanentemente: ${msg}`);
    } finally {
      setIsSavingPermanent(false);
    }
  };

  // Filtered diffs for table display
  const displayedDiffs = (syncResult?.diffs || []).filter((diff) => {
    if (onlyChangedFilter && !diff.hasAnyChange) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        diff.codigo.toLowerCase().includes(term) ||
        diff.descripcion.toLowerCase().includes(term) ||
        String(diff.itemId).includes(term)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/30 border border-red-500/40 rounded-xl text-red-400">
              <RefreshCw className="w-6 h-6 animate-spin-reverse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Centro de Carga y Sincronización Masiva de Archivos
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Persistencia Permanente
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Carga presupuestos Excel PDVSA, tablas Lulowin, especificaciones y presupuestos PDF para recuperar tus cantidades y precios modificados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          
          {/* Top Selector: Upload local vs Server files */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileUp className="w-4 h-4" />
                <span>Subir Archivos desde tu Computador (.xlsx, .xls, .pdf)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('server')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'server'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Archivos Guardados en Servidor ({serverFiles.length})</span>
              </button>
            </div>

            {loadedFilesInfo.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-200 transition-colors"
              >
                Limpiar datos cargados
              </button>
            )}
          </div>

          {/* Tab Content: Upload Local Files */}
          {activeTab === 'upload' && (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-red-500/60 transition-colors p-8 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Arrastra o selecciona tus archivos de obra
                </h3>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Puedes seleccionar múltiples archivos simultáneamente: Presupuesto General PDVSA (.xlsx/.xls), Tablas Lulowin (.xlsx/.xls), Cuadernillo Anexo 3RA (.xlsx/.pdf) o Presupuestos en PDF.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Explorar Archivos en mi PC</span>
                </button>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-semibold text-red-700 mt-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Procesando archivo...'}</span>
                </div>
              )}
            </div>
          )}

          {/* Tab Content: Server Files */}
          {activeTab === 'server' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Archivos de Obra Disponibles en el Proyecto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Archivos oficiales PDVSA y cómputos ya presentes en la carpeta pública del proyecto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={processAllServerFiles}
                  disabled={isProcessing || serverFiles.length === 0}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sincronizar Todos a la Vez</span>
                </button>
              </div>

              {isLoadingServerFiles ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                  <span>Cargando lista de archivos en servidor...</span>
                </div>
              ) : serverFiles.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No se detectaron archivos Excel o PDF en la carpeta pública.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  {serverFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {file.type === 'excel' ? (
                          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(file.size / 1024).toFixed(0)} KB • Categoría: <span className="uppercase font-semibold">{file.category}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => processServerFile(file)}
                        disabled={isProcessing}
                        className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        Cargar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loaded Files Badges */}
          {loadedFilesInfo.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mr-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Archivos Leídos ({loadedFilesInfo.length}):</span>
              </span>
              {loadedFilesInfo.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 text-xs font-medium rounded-lg shadow-2xs"
                >
                  <FileText className="w-3 h-3 text-emerald-600" />
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                    {f.recordsCount} partidas
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Sync Rules Controls & Statistics */}
          {syncResult && (
            <div className="space-y-4">
              
              {/* Toggles bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    Campos a actualizar:
                  </span>
                  
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateQuantities}
                      onChange={(e) => setUpdateQuantities(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span>Cantidades (Cómputos)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updatePrices}
                      onChange={(e) => setUpdatePrices(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span>Precios Unitarios (APU)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateInsumoQuantities}
                      onChange={(e) => setUpdateInsumoQuantities(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span className="text-cyan-700 font-bold">Cantidades de Insumos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateDesperdicios}
                      onChange={(e) => setUpdateDesperdicios(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span className="text-orange-700 font-bold">Desperdicios (% Desp)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateDepreciaciones}
                      onChange={(e) => setUpdateDepreciaciones(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span className="text-indigo-700 font-bold">Depreciación Equipos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateYields}
                      onChange={(e) => setUpdateYields(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span>Rendimientos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateSpecs}
                      onChange={(e) => setUpdateSpecs(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span>Especificaciones</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar partida..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 w-44"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyChangedFilter(!onlyChangedFilter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
                      onlyChangedFilter
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Solo Modificadas ({syncResult.stats.totalChanges})</span>
                  </button>
                </div>
              </div>

              {/* Lulowin Database Detection & Integrity Verification Banner */}
              {syncResult.lulowinMetadata?.isLulowinDatabase && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-md border border-indigo-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-800/60 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/20 border border-indigo-400/40 rounded-lg text-indigo-300">
                        <Database className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                            Tablas de Obra Lulowin Reconocidas e Integradas
                          </h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-500/30 text-indigo-200 rounded border border-indigo-400/30">
                            LuloWin / Maprex DB
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Hojas de insumos, cuadrillas, equipos, análisis y catálogo maestro vinculadas directamente al proyecto.
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>100% de Análisis Actualizados</span>
                    </span>
                  </div>

                  {/* Badges of the 7 Lulowin Sheets */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {syncResult.lulowinMetadata.tableCounts.obramate > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obramate:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obramate} mat.</span>
                      </span>
                    )}
                    {syncResult.lulowinMetadata.tableCounts.obraequi > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-700/60 text-indigo-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obraequi:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obraequi} eq.</span>
                      </span>
                    )}
                    {syncResult.lulowinMetadata.tableCounts.obramano > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obramano:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obramano} cargos</span>
                      </span>
                    )}
                    {syncResult.lulowinMetadata.tableCounts.obraapun > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-700/60 text-blue-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obraapun:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obraapun} part.</span>
                      </span>
                    )}
                    {syncResult.lulowinMetadata.tableCounts.obraapinmate > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-950/60 border border-teal-700/60 text-teal-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obraapinmate:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obraapinmate} APU mat.</span>
                      </span>
                    )}
                    {syncResult.lulowinMetadata.tableCounts.obraapinequi > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/60 border border-violet-700/60 text-violet-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obraapinequi:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obraapinequi} APU eq.</span>
                      </span>
                    )}
                    {syncResult.lulowinMetadata.tableCounts.obraapinmano > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-700/60 text-orange-200 font-mono text-[11px]">
                        <span className="font-bold text-white">obraapinmano:</span>
                        <span>{syncResult.lulowinMetadata.tableCounts.obraapinmano} APU cuadrillas</span>
                      </span>
                    )}
                  </div>

                  {/* Integrity Confirmation Notice */}
                  <div className="bg-white/10 rounded-lg p-2.5 flex items-start gap-2.5 text-[11px] text-slate-200 border border-white/15">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <span>Garantía de Integridad: Cada partida, análisis, insumo, rendimiento, desperdicio y depreciación confirmado</span>
                      </p>
                      <p className="text-slate-300 mt-0.5">
                        Todos los valores modificados de las hojas <span className="font-semibold text-white">obramate</span>, <span className="font-semibold text-white">obraequi</span>, <span className="font-semibold text-white">obramano</span>, <span className="font-semibold text-white">obraapun</span>, <span className="font-semibold text-white">obraapinmate</span>, <span className="font-semibold text-white">obraapinequi</span> y <span className="font-semibold text-white">obraapinmano</span> se aplicaron de forma exacta en las partidas y se guardarán permanentemente en el proyecto.
                      </p>
                      {validationReport && (
                        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-white/10 text-[10px] text-indigo-200">
                          <span>• Partidas con APU: <strong className="text-white">{validationReport.itemsWithApu}/{validationReport.totalItems}</strong></span>
                          <span>• Materiales con desperdicio: <strong className="text-white">{validationReport.materialsWithWaste}</strong></span>
                          <span>• Equipos con depreciación: <strong className="text-white">{validationReport.equipmentWithDeprec}</strong></span>
                          <span>• Cuadrillas registradas: <strong className="text-white">{validationReport.totalLabor}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Coincidentes
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-slate-800">
                      {syncResult.stats.matchedCount}
                    </span>
                    <span className="text-[10px] text-slate-400">/ {syncResult.stats.totalProjectItems}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Cant. Partidas
                  </span>
                  <span className="text-lg font-black text-blue-700 mt-1 block">
                    {syncResult.stats.quantitiesUpdated}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Precios P.U.
                  </span>
                  <span className="text-lg font-black text-emerald-700 mt-1 block">
                    {syncResult.stats.pricesUpdated}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-cyan-200 shadow-2xs bg-cyan-50/30">
                  <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider block flex items-center gap-1">
                    <Boxes className="w-3 h-3 text-cyan-600" />
                    <span>Insumos APU</span>
                  </span>
                  <span className="text-lg font-black text-cyan-800 mt-1 block">
                    {syncResult.stats.insumosUpdated}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs bg-orange-50/30">
                  <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block flex items-center gap-1">
                    <Percent className="w-3 h-3 text-orange-600" />
                    <span>% Desperdicios</span>
                  </span>
                  <span className="text-lg font-black text-orange-800 mt-1 block">
                    {syncResult.stats.desperdiciosUpdated}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs bg-indigo-50/30">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-indigo-600" />
                    <span>Deprec. Equipos</span>
                  </span>
                  <span className="text-lg font-black text-indigo-800 mt-1 block">
                    {syncResult.stats.depreciacionesUpdated}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Rendimientos
                  </span>
                  <span className="text-lg font-black text-amber-700 mt-1 block">
                    {syncResult.stats.yieldsUpdated}
                  </span>
                </div>
              </div>

              {/* Diff Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>Auditoría de Cambios a Aplicar ({displayedDiffs.length} partidas)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Los cambios resaltados sustituirán los valores originales al guardar.
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                        <th className="py-2 px-3 w-16">Item</th>
                        <th className="py-2 px-3 w-24">Código</th>
                        <th className="py-2 px-4">Descripción de la Partida</th>
                        <th className="py-2 px-3 w-16">UND</th>
                        <th className="py-2 px-3 w-36 text-right">Cantidad</th>
                        <th className="py-2 px-3 w-40 text-right">Precio Unitario ($)</th>
                        <th className="py-2 px-3 w-28 text-center">Rendimiento</th>
                        <th className="py-2 px-3 w-28 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedDiffs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No se encontraron diferencias con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        displayedDiffs.map((diff) => (
                          <React.Fragment key={diff.itemId}>
                            <tr
                              className={`hover:bg-slate-50/80 transition-colors ${
                                diff.hasAnyChange ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                                #{diff.itemId}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {diff.codigo}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="font-medium text-slate-800 truncate max-w-md" title={diff.descripcion}>
                                  {diff.descripcion}
                                </div>
                                {(diff.insumosUpdatedCount > 0 || diff.desperdiciosUpdatedCount > 0 || diff.depreciacionesUpdatedCount > 0) && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {diff.insumosUpdatedCount > 0 && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-100 text-cyan-800">
                                        <Boxes className="w-2.5 h-2.5" />
                                        <span>{diff.insumosUpdatedCount} insumos</span>
                                      </span>
                                    )}
                                    {diff.desperdiciosUpdatedCount > 0 && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
                                        <Percent className="w-2.5 h-2.5" />
                                        <span>{diff.desperdiciosUpdatedCount} desperdicios</span>
                                      </span>
                                    )}
                                    {diff.depreciacionesUpdatedCount > 0 && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                                        <Wrench className="w-2.5 h-2.5" />
                                        <span>{diff.depreciacionesUpdatedCount} deprec.</span>
                                      </span>
                                    )}
                                    {diff.insumoDetails && diff.insumoDetails.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedDiffId(expandedDiffId === diff.itemId ? null : diff.itemId)}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-800 ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                                      >
                                        {expandedDiffId === diff.itemId ? (
                                          <>
                                            <span>Ocultar</span>
                                            <ChevronUp className="w-3 h-3" />
                                          </>
                                        ) : (
                                          <>
                                            <span>Ver detalles</span>
                                            <ChevronDown className="w-3 h-3" />
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-bold">
                                {diff.unidad}
                              </td>
                              
                              {/* Quantity column */}
                              <td className="py-2.5 px-3 text-right">
                                {diff.hasQuantityChange ? (
                                  <div className="inline-flex items-center gap-1 font-mono">
                                    <span className="line-through text-slate-400 text-[10px]">
                                      {diff.oldQty.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                    </span>
                                    <ArrowRight className="w-2.5 h-2.5 text-blue-500" />
                                    <span className="font-bold text-blue-700 bg-blue-100 px-1 rounded">
                                      {diff.newQty.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-slate-600">
                                    {diff.newQty.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                  </span>
                                )}
                              </td>

                              {/* Price column */}
                              <td className="py-2.5 px-3 text-right">
                                {diff.hasPriceChange ? (
                                  <div className="inline-flex items-center gap-1 font-mono">
                                    <span className="line-through text-slate-400 text-[10px]">
                                      ${diff.oldPrice.toFixed(2)}
                                    </span>
                                    <ArrowRight className="w-2.5 h-2.5 text-emerald-500" />
                                    <span className="font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                      ${diff.newPrice.toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-slate-600">
                                    ${diff.newPrice.toFixed(2)}
                                  </span>
                                )}
                              </td>

                              {/* Yield column */}
                              <td className="py-2.5 px-3 text-center">
                                {diff.hasYieldChange ? (
                                  <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {diff.newYield}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">
                                    {diff.newYield}
                                  </span>
                                )}
                              </td>

                              {/* Status tag */}
                              <td className="py-2.5 px-3 text-center">
                                {diff.hasAnyChange ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Modificada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                    Sin cambios
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Expanded Insumo Details Drawer */}
                            {expandedDiffId === diff.itemId && diff.insumoDetails && diff.insumoDetails.length > 0 && (
                              <tr className="bg-slate-50/95 border-b border-slate-200">
                                <td colSpan={8} className="p-3 pl-10">
                                  <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-2xs">
                                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <Boxes className="w-3.5 h-3.5 text-cyan-600" />
                                        <span>Despiece de Insumos, Desperdicios y Depreciaciones ({diff.insumoDetails.length} items modificados)</span>
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-400 normal-case">
                                        Partida #{diff.itemId} - {diff.codigo}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {diff.insumoDetails.map((ins, iIdx) => (
                                        <div
                                          key={iIdx}
                                          className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-slate-800">{ins.codigo}</span>
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                              ins.tipo === 'material' ? 'bg-emerald-100 text-emerald-800' :
                                              ins.tipo === 'equipo' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                              {ins.tipo === 'mano_de_obra' ? 'Mano de Obra' : ins.tipo}
                                            </span>
                                          </div>
                                          <div className="text-slate-600 text-[10px] truncate" title={ins.descripcion}>
                                            {ins.descripcion}
                                          </div>
                                          <div className="space-y-0.5 pt-1 border-t border-slate-200/60">
                                            {ins.cambios.map((c, cIdx) => (
                                              <div key={cIdx} className="font-mono text-[10px] text-slate-800 font-semibold flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />
                                                <span>{c}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {saveSuccessMessage && (
            <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-bold text-sm">{saveSuccessMessage}</p>
                <p className="text-xs text-emerald-100">
                  La base de datos en disco ha sido actualizada permanentemente como nueva línea base oficial.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {syncResult ? (
              <span>
                Se actualizarán <strong className="text-slate-800">{syncResult.stats.totalChanges}</strong> valores en{' '}
                <strong className="text-slate-800">{syncResult.stats.matchedCount}</strong> partidas.
              </span>
            ) : (
              <span>Selecciona o sube archivos para previsualizar los cambios antes de aplicar.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSavingPermanent}
              className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApplyPermanent}
              disabled={!syncResult || syncResult.stats.totalChanges === 0 || isSavingPermanent}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingPermanent ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando permanentemente...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-amber-300" />
                  <span>Actualizar Datos y Guardar como Permanente</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
