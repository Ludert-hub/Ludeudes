import React, { useState, useRef } from 'react';
import { ParsedComputoRow, parseComputosText, parseComputosExcel, generatePartidasFromComputos } from '../utils/computosParser';
import { PartidaItem, ProjectRecord } from '../types/costTypes';
import {
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  X,
  FileText,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react';

interface NewProjectComputosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (newProject: {
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
  }) => void;
  baseCatalog: PartidaItem[];
}

export const NewProjectComputosModal: React.FC<NewProjectComputosModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  baseCatalog,
}) => {
  // Wizard steps: 1 = Input Cómputos, 2 = Verify Table & Project Metadata
  const [step, setStep] = useState<1 | 2>(1);

  // Tab mode in Step 1: 'paste' | 'upload' | 'manual'
  const [inputMode, setInputMode] = useState<'paste' | 'upload' | 'manual'>('paste');

  // Input states
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedComputoRow[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Project Metadata Form states (Fixed Defaults: FCAS 500%, Admin 12.5%, Utilidad 17%, IVA 16%)
  const [projectName, setProjectName] = useState<string>('');
  const [shortName, setShortName] = useState<string>('');
  const [solped, setSolped] = useState<string>('');
  const [division, setDivision] = useState<string>('DIRECCIÓN EJECUTIVA DE PRODUCCIÓN LOS LLANOS - DIVISIÓN BARINAS');
  const [ubicacion, setUbicacion] = useState<string>('Estado Barinas - Venezuela');
  const [fcasPorc, setFcasPorc] = useState<number>(500.0);
  const [adminPorc, setAdminPorc] = useState<number>(12.5);
  const [utilidadPorc, setUtilidadPorc] = useState<number>(17.0);
  const [ivaPorc, setIvaPorc] = useState<number>(16.0);

  // Manual single row entry
  const [manualDesc, setManualDesc] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [manualUnit, setManualUnit] = useState<string>('M2');
  const [manualQty, setManualQty] = useState<number>(1);
  const [manualCap, setManualCap] = useState<string>('Obras Civiles');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle parsing pasted text
  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      setParseError('Por favor pega texto o filas con datos de cómputos métricos.');
      return;
    }
    setIsParsing(true);
    setParseError(null);
    try {
      const rows = parseComputosText(pastedText);
      if (rows.length === 0) {
        setParseError('No se identificaron partidas válidas. Asegúrate de incluir la descripción, unidad (M2, M3, ML, PZA, etc.) y la cantidad.');
        setIsParsing(false);
        return;
      }
      setParsedRows(rows);
      if (!projectName) {
        setProjectName('NUEVO PROYECTO DE OBRAS Y SERVICIOS PDVSA');
        setShortName('Nuevo Proyecto PDVSA');
      }
      setStep(2);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Error al procesar el texto.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Excel file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const rows = await parseComputosExcel(buffer);
      if (rows.length === 0) {
        setParseError('No se encontraron filas con cómputos métricos en el archivo seleccionado.');
        setIsParsing(false);
        return;
      }
      setParsedRows(rows);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').toUpperCase();
      if (!projectName) {
        setProjectName(`PROYECTO: ${nameWithoutExt}`);
        setShortName(nameWithoutExt.slice(0, 32));
      }
      setStep(2);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Error al procesar el archivo Excel.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle adding manual row
  const handleAddManualRow = () => {
    if (!manualDesc.trim()) return;
    const newRow: ParsedComputoRow = {
      index: parsedRows.length + 1,
      codigo: manualCode.trim() || String(parsedRows.length + 1).padStart(3, '0'),
      descripcion: manualDesc.trim().toUpperCase(),
      unidad: manualUnit.trim().toUpperCase() || 'UND',
      cantidad: manualQty > 0 ? manualQty : 1,
      capitulo: manualCap || 'Obras Civiles',
    };
    setParsedRows([...parsedRows, newRow]);
    setManualDesc('');
    setManualCode('');
    setManualQty(1);
  };

  // Remove a row in verification table
  const handleRemoveRow = (idx: number) => {
    const updated = parsedRows.filter((_, i) => i !== idx).map((r, i) => ({
      ...r,
      index: i + 1,
    }));
    setParsedRows(updated);
  };

  // Update row in verification table
  const handleUpdateRow = (idx: number, field: keyof ParsedComputoRow, val: any) => {
    const updated = [...parsedRows];
    updated[idx] = { ...updated[idx], [field]: val };
    setParsedRows(updated);
  };

  // Create Project
  const handleCreateProject = () => {
    if (parsedRows.length === 0) {
      setParseError('El proyecto debe contener al menos una partida.');
      return;
    }

    // Generate APU and specifications for all items
    const fullItems = generatePartidasFromComputos(parsedRows, baseCatalog);

    onProjectCreated({
      name: projectName.trim() || 'NUEVO PROYECTO PDVSA',
      shortName: shortName.trim() || projectName.slice(0, 32) || 'Nuevo Proyecto',
      solped: solped.trim() || `SOL-${Math.floor(1000000000 + Math.random() * 900000000)}`,
      division: division.trim(),
      ubicacion: ubicacion.trim(),
      fcasPorc,
      adminPorc,
      utilidadPorc,
      ivaPorc,
      items: fullItems,
    });

    onClose();
  };

  // Sample template to load into paste area
  const loadExampleTemplate = () => {
    setPastedText(
`Partida\tCódigo\tDescripción\tUnidad\tCantidad\tRendimiento
1\t001\tDEMOLICIÓN A MANO DE PISO DE CONCRETO E=10 CM\tM2\t185.50\t20.00
2\t002\tREMOCIÓN DE ESCOMBROS CON CARGA MANUAL Y TRANSPORTE\tM3\t24.00\t12.00
3\t003\tCONSTRUCCIÓN DE BASE DE PIEDRA PICADA COMPACTADA\tM3\t36.50\t15.00
4\t004\tSUMINISTRO Y COLOCACIÓN DE CONCRETO R.C. 210 KG/CM2\tM3\t28.00\t8.00
5\t005\tSUMINISTRO Y COLOCACIÓN DE ACERO DE REFUERZO FY=4200 KG/CM2\tKG\t1450.00\t250.00
6\t006\tAPLICACIÓN DE PINTURA EPÓXICA DE ALTO RENDIMIENTO EN PISOS\tM2\t340.00\t45.00
7\t007\tSUMINISTRO E INSTALACIÓN DE LÁMPARA LED INDUSTRIAL 100W\tPZA\t18.00\t8.00
8\t008\tCONSTRUCCIÓN DE CORDON DE CONCRETO TIPO C\tML\t85.00\t16.00`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Crear Nuevo Proyecto desde Cómputos Métricos
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Multiproyecto Seguro
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Carga un nuevo presupuesto sin alterar el proyecto oficial actual (El Toreño 364 partidas)
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

        {/* Wizard Steps Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                step === 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span>
              Ingreso de Cómputos
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors ${
                step === 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span>
              Verificación y Parámetros
            </span>
          </div>

          <div className="text-slate-500 text-[11px] font-mono">
            {parsedRows.length > 0 && `${parsedRows.length} partidas procesadas`}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700">
          {/* STEP 1: INPUT CÓMPUTOS */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Tabs for Input Mode */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer ${
                    inputMode === 'paste'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Pegar Cómputos (Excel / Texto)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer ${
                    inputMode === 'upload'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Subir Archivo Excel (.xlsx / .csv)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`flex items-center gap-2 px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer ${
                    inputMode === 'manual'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Ingreso Manual Rápido
                </button>
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">Atención al procesar cómputos</div>
                    <p className="text-[11px] mt-0.5">{parseError}</p>
                  </div>
                </div>
              )}

              {/* Mode A: Paste */}
              {inputMode === 'paste' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-900 text-xs">
                      Pega aquí las filas de tu hoja de Excel o reporte de cómputos:
                    </label>
                    <button
                      type="button"
                      onClick={loadExampleTemplate}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Cargar plantilla de ejemplo
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Pega directamente las celdas copiadas de Excel (Partida, Código, Descripción, Unidad, Cantidad)&#10;Ejemplo:&#10;1   001   CONSTRUCCIÓN DE BASE DE PIEDRA PICADA   M3   45.00&#10;2   002   DEMOLICIÓN A MANO DE PISO DE CONCRETO   M2   120.00"
                    className="w-full p-3 font-mono text-[11px] border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all leading-relaxed"
                  />

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Detección Inteligente Automática:
                    </div>
                    <p>
                      El analizador reconoce automáticamente columnas de <strong>Descripción</strong>, <strong>Unidad</strong> (M2, M3, ML, KG, PZA, GLB, SG, etc.) y <strong>Cantidad</strong> tanto en formato latino (<code>1.250,50</code>) como anglosajón (<code>1,250.50</code>).
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleParsePasted}
                      disabled={isParsing || !pastedText.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <span>Procesar Cómputos y Continuar</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Mode B: Upload */}
              {inputMode === 'upload' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">
                        Selecciona o arrastra tu archivo Excel con Cómputos
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Formatos soportados: .xlsx, .xls o .csv (con encabezados de Descripción, Unidad, Cantidad)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-slate-700 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      Examinar Archivos
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <strong>Consejo:</strong> La primera hoja del libro de Excel se leerá automáticamente identificando las columnas de partida, descripción, unidad de medida y metrado/cantidad.
                  </div>
                </div>
              )}

              {/* Mode C: Manual */}
              {inputMode === 'manual' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="font-bold text-xs text-slate-800">Agregar Partida Individual:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600">Código</label>
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="001"
                          className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                        />
                      </div>
                      <div className="sm:col-span-6">
                        <label className="text-[11px] font-semibold text-slate-600">Descripción de la Partida</label>
                        <input
                          type="text"
                          value={manualDesc}
                          onChange={(e) => setManualDesc(e.target.value)}
                          placeholder="Ej: DEMOLICIÓN DE PISO DE CONCRETO..."
                          className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs uppercase"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600">Unidad</label>
                        <input
                          type="text"
                          value={manualUnit}
                          onChange={(e) => setManualUnit(e.target.value)}
                          placeholder="M2"
                          className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs text-center uppercase"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-600">Cantidad</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={manualQty}
                          onChange={(e) => setManualQty(Number(e.target.value))}
                          className="w-full mt-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono text-center font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddManualRow}
                        disabled={!manualDesc.trim()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar Partida ({parsedRows.length})
                      </button>
                    </div>
                  </div>

                  {parsedRows.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                      >
                        <span>Continuar con {parsedRows.length} Partidas</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: VERIFICATION & PROJECT METADATA */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Project General Information */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                    Identificación del Nuevo Proyecto PDVSA
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-8">
                    <label className="text-[11px] font-bold text-slate-700">
                      Nombre Oficial de la Obra o Servicio:
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="ADECUACIÓN / CONSTRUCCIÓN / MANTENIMIENTO..."
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs uppercase font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-[11px] font-bold text-slate-700">
                      Nombre Corto (Selector y Pestañas):
                    </label>
                    <input
                      type="text"
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="Ej: Mantenimiento Tanques Fase 2"
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[11px] font-bold text-slate-700">
                      Número de SOLPED / Proceso:
                    </label>
                    <input
                      type="text"
                      value={solped}
                      onChange={(e) => setSolped(e.target.value)}
                      placeholder="1300XXXXXX"
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-8">
                    <label className="text-[11px] font-bold text-slate-700">
                      División / Dirección Ejecutiva:
                    </label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-12">
                    <label className="text-[11px] font-bold text-slate-700">
                      Ubicación Geográfica de la Obra:
                    </label>
                    <input
                      type="text"
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      placeholder="Área Operacional / Planta / Municipio / Estado"
                      className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Parameters Preset (Fixed Defaults) */}
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-700" />
                    <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wide">
                      Parámetros Financieros Fijos (Editables si se amerita)
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Valores preconfigurados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">FCAS LOTTT & CCP</span>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        max="2000"
                        value={fcasPorc}
                        onChange={(e) => setFcasPorc(Number(e.target.value))}
                        className="w-full font-mono font-bold text-xs text-blue-900 border border-slate-200 rounded px-2 py-1 text-center"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Gastos Administración</span>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={adminPorc}
                        onChange={(e) => setAdminPorc(Number(e.target.value))}
                        className="w-full font-mono font-bold text-xs text-amber-900 border border-slate-200 rounded px-2 py-1 text-center"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">Utilidad Contratista</span>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={utilidadPorc}
                        onChange={(e) => setUtilidadPorc(Number(e.target.value))}
                        className="w-full font-mono font-bold text-xs text-purple-900 border border-slate-200 rounded px-2 py-1 text-center"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-500">IVA de Ley</span>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="30"
                        value={ivaPorc}
                        onChange={(e) => setIvaPorc(Number(e.target.value))}
                        className="w-full font-mono font-bold text-xs text-emerald-900 border border-slate-200 rounded px-2 py-1 text-center"
                      />
                      <span className="font-bold text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parsed Rows Table Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Cómputos Procesados ({parsedRows.length} partidas)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Puedes ajustar cualquier celda antes de generar el proyecto
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 w-12 text-center">#</th>
                        <th className="py-2 px-2.5 w-20 text-center">Código</th>
                        <th className="py-2 px-3">Descripción de la Partida</th>
                        <th className="py-2 px-2.5 w-16 text-center">Unidad</th>
                        <th className="py-2 px-2.5 w-24 text-right">Cantidad</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="text"
                              value={r.codigo || ''}
                              onChange={(e) => handleUpdateRow(idx, 'codigo', e.target.value)}
                              className="w-full text-center font-mono text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-2.5">
                            <input
                              type="text"
                              value={r.descripcion}
                              onChange={(e) => handleUpdateRow(idx, 'descripcion', e.target.value)}
                              className="w-full text-xs uppercase border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1.5 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-2 text-center">
                            <input
                              type="text"
                              value={r.unidad}
                              onChange={(e) => handleUpdateRow(idx, 'unidad', e.target.value.toUpperCase())}
                              className="w-full text-center text-xs uppercase font-mono border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={r.cantidad}
                              onChange={(e) => handleUpdateRow(idx, 'cantidad', Number(e.target.value))}
                              className="w-full text-right font-mono font-bold text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded px-1 py-0.5"
                            />
                          </td>
                          <td className="py-1 px-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                              title="Eliminar partida"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Volver a Cómputos
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleCreateProject}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Crear y Abrir Nuevo Proyecto ({parsedRows.length} partidas)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
