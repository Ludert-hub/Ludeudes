import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { calculateItemApu, formatCurrency, formatNumber } from '../utils/apuCalculations';
import { CATEGORIES } from '../data/itemsData';
import {
  Search,
  Filter,
  Eye,
  FileText,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Layers,
  DollarSign,
  Calculator,
  Download,
  Database,
  ChevronDown,
  Columns,
  TrendingUp,
  Save
} from 'lucide-react';

interface InlineTableNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  className?: string;
  title?: string;
}

const InlineTableNumberInput: React.FC<InlineTableNumberInputProps> = ({
  value,
  onChange,
  min = 0.01,
  className = '',
  title,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState<string>(
    Number.isFinite(value) ? String(value) : '0'
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(Number.isFinite(value) ? String(value) : '0');
    }
  }, [value, isFocused]);

  const selectAll = (input: HTMLInputElement) => {
    input.select();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setTextValue(Number.isFinite(value) ? String(value) : '');
    setTimeout(() => {
      if (inputRef.current) {
        selectAll(inputRef.current);
      }
    }, 20);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    selectAll(e.currentTarget);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const normalized = raw.replace(',', '.');
    if (!/^-?\d*\.?\d*$/.test(normalized)) {
      return;
    }
    setTextValue(raw);

    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && isFinite(parsed) && parsed >= min) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = textValue.replace(',', '.').trim();
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || !isFinite(parsed) || parsed < min) {
      const fallback = Math.max(min, isNaN(parsed) ? (min > 0 ? min : 0) : parsed);
      setTextValue(String(fallback));
      onChange(fallback);
    } else {
      setTextValue(String(parsed));
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={textValue}
      onFocus={handleFocus}
      onClick={handleClick}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      title={title}
    />
  );
};

interface InlineTableTextInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  title?: string;
  list?: string;
}

const InlineTableTextInput: React.FC<InlineTableTextInputProps> = ({
  value,
  onChange,
  className = '',
  title,
  list,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState<string>(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(value || '');
    }
  }, [value, isFocused]);

  const selectAll = (input: HTMLInputElement) => {
    input.select();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTextValue(value || '');
    setTimeout(() => {
      if (inputRef.current) {
        selectAll(inputRef.current);
      }
    }, 20);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    selectAll(e.currentTarget);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);
    const upper = raw.trim().toUpperCase();
    if (upper.length > 0) {
      onChange(upper);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const upper = textValue.trim().toUpperCase();
    if (upper.length > 0) {
      setTextValue(upper);
      onChange(upper);
    } else {
      setTextValue(value || 'UND');
      onChange(value || 'UND');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      value={textValue}
      onFocus={handleFocus}
      onClick={handleClick}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      title={title}
      list={list}
    />
  );
};

interface PresupuestoTableProps {
  items: PartidaItem[];
  summary?: FinancialSummary;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc?: number;
  onSelectApu: (item: PartidaItem) => void;
  onSelectSpec: (item: PartidaItem) => void;
  onUpdateQuantity?: (itemId: number, newQuantity: number) => void;
  onUpdateRendimiento?: (itemId: number, newRendimiento: number) => void;
  onUpdateUnidad?: (itemId: number, newUnidad: string) => void;
  onOpenInsumos?: () => void;
  onOpenParams?: () => void;
  onOpenSpecsTab?: () => void;
  onOpenCronogramaTab?: () => void;
  onExportPresupuesto?: () => void;
  onExportPresupuestoPdf?: () => void;
  onExportInsumosPorPartida?: () => void;
  onExportLulowin?: () => void;
  onExportApu?: () => void;
  onExportApuPdf?: () => void;
  onSaveChanges?: () => void;
}

export const PresupuestoTable: React.FC<PresupuestoTableProps> = ({
  items,
  summary,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  onSelectApu,
  onSelectSpec,
  onUpdateQuantity,
  onUpdateRendimiento,
  onUpdateUnidad,
  onOpenInsumos,
  onOpenParams,
  onOpenSpecsTab,
  onOpenCronogramaTab,
  onExportPresupuesto,
  onExportPresupuestoPdf,
  onExportInsumosPorPartida,
  onExportLulowin,
  onExportApu,
  onExportApuPdf,
  onSaveChanges,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [showExtendedCols, setShowExtendedCols] = useState(false);
  const pageSize = 25;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigoCovenin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toString().includes(searchTerm);

      const matchCategory =
        selectedCategory === 'Todos' || item.capitulo === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Compute subtotal for all items and current filtered selection
  const { allSubTotal, filteredTotals } = useMemo(() => {
    let allSum = 0;
    items.forEach((item) => {
      const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
      allSum += calc.totalPartida;
    });

    let filtSum = 0;
    filteredItems.forEach((item) => {
      const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
      filtSum += calc.totalPartida;
    });

    return { allSubTotal: allSum, filteredTotals: filtSum };
  }, [items, filteredItems, fcasPorc, adminPorc, utilidadPorc]);

  const displayTotalBudget = summary ? summary.subTotalGeneral : allSubTotal;
  const displayGranTotalConIva = summary ? summary.granTotalGeneral : allSubTotal * 1.16;

  return (
    <div className="space-y-4">
      {/* Top 3 KPI Summary Cards (Matching Sistema APU PDVSA Reference Image) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total de Partidas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Total de Partidas</div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {items.length} partidas
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Codificación 001 a {String(items.length).padStart(3, '0')}
            </div>
          </div>
        </div>

        {/* Card 2: Monto Total Presupuesto ($) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">Monto Total Presupuesto ($)</div>
            <div className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-0.5 truncate">
              {formatCurrency(displayTotalBudget)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono truncate">
              Con IVA (16%): <strong className="text-slate-700">{formatCurrency(displayGranTotalConIva)}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Filtro Actual */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">
              Filtro Actual ({filteredItems.length} items)
            </div>
            <div className="text-2xl font-extrabold text-purple-600 tracking-tight mt-0.5 truncate">
              {formatCurrency(filteredTotals)}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {selectedCategory === 'Todos' ? 'Todos los capítulos activos' : selectedCategory}
            </div>
          </div>
        </div>
      </div>

      {/* Main White Card Container (Search, Quick Pills & Partidas Table) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Search & Quick Action Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3.5">
          {/* Search Input & Chapter Filter Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por descripción, número de partida o código..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium bg-slate-50 hover:bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'Todos' ? 'Todos los Capítulos' : cat}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowExtendedCols((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  showExtendedCols
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Mostrar u ocultar columnas de desglose unitario (Materiales, Equipos, Mano de Obra Plena)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desglose Unitario</span>
              </button>
            </div>
          </div>

          {/* Action Pills Row (Exact match to image_2aedf522.png) */}
          <div className="flex flex-wrap items-center gap-2">
            {onSaveChanges && (
              <button
                type="button"
                onClick={onSaveChanges}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
                title="Guardar permanentemente todos los cambios realizados"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenInsumos}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              title="Abrir Catálogo Maestro de Insumos con sincronización automática de precios"
            >
              <span>Maestro de Insumos</span>
            </button>

            <button
              type="button"
              onClick={onOpenParams}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <span>Configuración Obra</span>
            </button>

            <button
              type="button"
              onClick={onOpenSpecsTab}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50/50 hover:bg-red-100/70 border border-red-200 rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-red-600" />
              <span>Especificaciones Técnicas (PDVSA)</span>
            </button>

            {onOpenCronogramaTab && (
              <button
                type="button"
                onClick={onOpenCronogramaTab}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                title="Abrir Cronograma de Ejecución de Obra, Plan de Desembolsos y Curva S (8 Meses)"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Cronograma & Curva S (8 Meses)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExportPresupuesto}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Presupuesto Excel (.xlsx)</span>
            </button>

            {onExportPresupuestoPdf && (
              <button
                type="button"
                onClick={onExportPresupuestoPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50/70 hover:bg-red-100 border border-red-300 rounded-xl transition-colors cursor-pointer"
                title="Descargar Presupuesto General en formato PDF Oficial (PRESUPUESTO EJEMPLO.pdf)"
              >
                <Download className="w-3.5 h-3.5 text-red-600" />
                <span>Presupuesto PDF (.pdf)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExportInsumosPorPartida}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50/50 hover:bg-purple-100/70 border border-purple-200 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Insumos por Partida (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={onExportLulowin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-300 rounded-xl transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-700" />
              <span>Bases Lulowin (.xlsx)</span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
            </button>

            <button
              type="button"
              onClick={onExportApu}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Proyecto Completo ({items.length} APU .xlsx)</span>
            </button>

            {onExportApuPdf && (
              <button
                type="button"
                onClick={onExportApuPdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Descargar Libro Completo de 363 APU en formato PDF Oficial (APU EJEMPLO.pdf)"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Libro APU ({items.length} PDF)</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3.5 px-4 w-20 text-center">PARTIDA</th>
                <th className="py-3.5 px-4 min-w-[300px]">DESCRIPCIÓN DE LA PARTIDA</th>
                <th className="py-3.5 px-3 text-center w-20">UNIDAD</th>
                <th className="py-3.5 px-3 text-right w-28">CANTIDAD</th>
                <th className="py-3.5 px-3 text-right w-28">RENDIMIENTO</th>
                {showExtendedCols && (
                  <>
                    <th className="py-3.5 px-3 text-right w-24">UNIT. MAT ($)</th>
                    <th className="py-3.5 px-3 text-right w-24">UNIT. EQ ($)</th>
                    <th className="py-3.5 px-3 text-right w-28 text-blue-900 bg-blue-50/50">M.O. PLENA ($)</th>
                    <th className="py-3.5 px-3 text-right w-28">C. DIRECTO ($)</th>
                  </>
                )}
                <th className="py-3.5 px-4 text-right w-32">P.U. ($)</th>
                <th className="py-3.5 px-4 text-right w-36">TOTAL ($)</th>
                <th className="py-3.5 px-4 text-center w-28">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={showExtendedCols ? 12 : 8} className="py-10 text-center text-slate-500">
                    No se encontraron partidas con el criterio de búsqueda "{searchTerm}".
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/90 transition-colors group"
                    >
                      {/* PARTIDA N° */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-extrabold text-slate-900 text-xs">{item.id}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Cód. {String(item.id).padStart(3, '0')}
                        </div>
                        {item.id > 363 && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            NUEVA
                          </span>
                        )}
                      </td>

                      {/* DESCRIPCIÓN DE LA PARTIDA */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 uppercase leading-snug">
                          {item.descripcion}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {item.capitulo}
                        </div>
                      </td>

                      {/* UNIDAD (Live Editable) */}
                      <td className="py-3.5 px-2 text-center">
                        <div className="flex justify-center">
                          <InlineTableTextInput
                            value={item.unidad}
                            onChange={(val) => onUpdateUnidad?.(item.id, val)}
                            list="unidades-datalist"
                            className="w-20 px-1 py-1 text-center font-mono font-bold text-xs text-slate-800 uppercase bg-transparent hover:bg-white focus:bg-white border border-slate-200/60 hover:border-slate-400 focus:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-text shadow-2xs"
                            title="Haga clic para editar la unidad de medida (selecciona todo automáticamente). Puede escribir o seleccionar una unidad estándar."
                          />
                        </div>
                      </td>

                      {/* CANTIDAD (Live Editable) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <InlineTableNumberInput
                            value={item.cantidad}
                            onChange={(val) => onUpdateQuantity?.(item.id, val)}
                            min={0}
                            className="w-24 px-2 py-1 text-right font-mono font-semibold text-xs text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-slate-200/60 hover:border-slate-400 focus:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-text shadow-2xs"
                            title="Haga clic para editar la cantidad (selecciona todo automáticamente)"
                          />
                        </div>
                      </td>

                      {/* RENDIMIENTO (Live Editable) */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <InlineTableNumberInput
                            value={item.apu.rendimiento}
                            onChange={(val) => onUpdateRendimiento?.(item.id, val)}
                            min={0.01}
                            className="w-24 px-2 py-1 text-right font-mono font-bold text-xs text-blue-900 bg-blue-50/50 hover:bg-white focus:bg-white border border-blue-200 hover:border-blue-400 focus:border-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all cursor-text shadow-2xs"
                            title="Haga clic para editar el rendimiento de esta partida (selecciona todo automáticamente)"
                          />
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {item.apu.unidadRendimiento || `${item.unidad}/día`}
                          </span>
                        </div>
                      </td>

                      {/* Optional Extended Columns */}
                      {showExtendedCols && (
                        <>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                            {formatCurrency(calc.unitarioMateriales)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                            {formatCurrency(calc.unitarioEquipos)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-medium text-blue-900 bg-blue-50/30">
                            {formatCurrency(calc.unitarioManoObra)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(calc.costoDirectoUnitario)}
                          </td>
                        </>
                      )}

                      {/* P.U. ($) */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 text-xs sm:text-sm">
                        {formatCurrency(calc.precioUnitario)}
                      </td>

                      {/* TOTAL ($) */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 text-xs sm:text-sm">
                        {formatCurrency(calc.totalPartida)}
                      </td>

                      {/* ACCIONES (3 Icons as in Reference Screenshot) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectApu(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Análisis de Precio Unitario (APU)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectSpec(item)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Ficha de Especificación Técnica Oficial (Anexo 3RA)"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectApu(item)}
                            className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Cantidades, Rendimiento e Insumos del APU"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Mostrando <span className="font-bold text-slate-900">{paginatedItems.length}</span> de{' '}
            <span className="font-bold text-slate-900">{filteredItems.length}</span> partidas · Página{' '}
            <span className="font-bold text-slate-900">{currentPage}</span> de{' '}
            <span className="font-bold text-slate-900">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              « Primera
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="px-2.5 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Última »
            </button>
          </div>
        </div>
      </div>

      {/* Datalist for fast unit suggestions */}
      <datalist id="unidades-datalist">
        <option value="UND" />
        <option value="M2" />
        <option value="M3" />
        <option value="ML" />
        <option value="PZA" />
        <option value="KG" />
        <option value="TON" />
        <option value="GLB" />
        <option value="JGO" />
        <option value="PTO" />
        <option value="VIAJE" />
        <option value="HA" />
        <option value="KM" />
        <option value="LTS" />
        <option value="SACO" />
        <option value="MES" />
        <option value="DIA" />
        <option value="HORA" />
      </datalist>
    </div>
  );
};
