import React, { useState, useMemo } from 'react';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import {
  buildMasterInsumosCatalog,
  MasterMaterialEntry,
  MasterEquipmentEntry,
  MasterLaborEntry,
} from '../utils/masterInsumosCatalog';
import { calculateItemApu, formatCurrency, formatNumber } from '../utils/apuCalculations';
import { exportLulowinToExcel, exportInsumosPorPartidaToExcel } from '../utils/lulowinExcelExport';
import { NumberStepper } from './NumberStepper';
import {
  Boxes,
  Wrench,
  Users,
  Search,
  Sparkles,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Save,
  RotateCcw,
  Download,
  Layers,
  Zap,
} from 'lucide-react';

interface MaestroInsumosViewerProps {
  items: PartidaItem[];
  summary: FinancialSummary;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc: number;
  onPropagateMaterial: (
    targetKey: string,
    changes: { costoUnitario?: number; desperdicioPorc?: number; unidad?: string }
  ) => void;
  onPropagateEquipment: (
    targetKey: string,
    changes: { costo?: number; depreciacionOAlquiler?: number; costoDiario?: number }
  ) => void;
  onPropagateLabor: (
    targetKey: string,
    changes: { salarioDiario?: number }
  ) => void;
  onUnifyAllPrices?: () => void;
  onSaveChanges?: () => void;
  onResetAllToBaseline?: () => void;
  onSelectPartidaApu?: (item: PartidaItem) => void;
}

type CategoryTab = 'materiales' | 'equipos' | 'manoDeObra';
type SortMode = 'monto_desc' | 'partidas_desc' | 'precio_desc' | 'nombre_asc' | 'codigo_asc';

export const MaestroInsumosViewer: React.FC<MaestroInsumosViewerProps> = ({
  items,
  summary,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  ivaPorc,
  onPropagateMaterial,
  onPropagateEquipment,
  onPropagateLabor,
  onUnifyAllPrices,
  onSaveChanges,
  onResetAllToBaseline,
  onSelectPartidaApu,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('materiales');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('codigo_asc');
  const [expandedInsumoKey, setExpandedInsumoKey] = useState<string | null>(null);
  const [lastPropagationBanner, setLastPropagationBanner] = useState<string | null>(null);

  // Build reactive master catalog from live items
  const catalog = useMemo(() => {
    return buildMasterInsumosCatalog(items, fcasPorc);
  }, [items, fcasPorc]);

  const itemsById = useMemo(() => {
    return new Map(items.map((it) => [it.id, it]));
  }, [items]);

  const varianceCount = useMemo(() => {
    const matVar = catalog.materiales.filter((m) => m.hasPriceVariance).length;
    const eqVar = catalog.equipos.filter((e) => e.hasPriceVariance).length;
    const moVar = catalog.manoDeObra.filter((l) => l.hasPriceVariance).length;
    return matVar + eqVar + moVar;
  }, [catalog]);

  const triggerBanner = (msg: string) => {
    setLastPropagationBanner(msg);
  };

  // Filtered & sorted Materiales
  const filteredMaterials = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = catalog.materiales.filter(
      (m) =>
        !q ||
        m.descripcion.toLowerCase().includes(q) ||
        m.codigo.toLowerCase().includes(q) ||
        m.unidad.toLowerCase().includes(q)
    );

    return [...list].sort((a, b) => {
      if (sortMode === 'monto_desc') return b.montoTotalObra - a.montoTotalObra;
      if (sortMode === 'partidas_desc') return b.partidasCount - a.partidasCount;
      if (sortMode === 'precio_desc') return b.costoUnitario - a.costoUnitario;
      if (sortMode === 'codigo_asc') return a.codigo.localeCompare(b.codigo);
      return a.descripcion.localeCompare(b.descripcion);
    });
  }, [catalog.materiales, searchTerm, sortMode]);

  // Filtered & sorted Equipos
  const filteredEquipments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = catalog.equipos.filter(
      (e) =>
        !q ||
        e.descripcion.toLowerCase().includes(q) ||
        e.codigo.toLowerCase().includes(q)
    );

    return [...list].sort((a, b) => {
      if (sortMode === 'monto_desc') return b.montoTotalObra - a.montoTotalObra;
      if (sortMode === 'partidas_desc') return b.partidasCount - a.partidasCount;
      if (sortMode === 'precio_desc') return b.costoDiario - a.costoDiario;
      if (sortMode === 'codigo_asc') return a.codigo.localeCompare(b.codigo);
      return a.descripcion.localeCompare(b.descripcion);
    });
  }, [catalog.equipos, searchTerm, sortMode]);

  // Filtered & sorted Mano de Obra
  const filteredLabor = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = catalog.manoDeObra.filter(
      (l) =>
        !q ||
        l.descripcion.toLowerCase().includes(q) ||
        l.codigo.toLowerCase().includes(q)
    );

    return [...list].sort((a, b) => {
      if (sortMode === 'monto_desc') return b.montoTotalConFcasObra - a.montoTotalConFcasObra;
      if (sortMode === 'partidas_desc') return b.partidasCount - a.partidasCount;
      if (sortMode === 'precio_desc') return b.salarioDiario - a.salarioDiario;
      if (sortMode === 'codigo_asc') return a.codigo.localeCompare(b.codigo);
      return a.descripcion.localeCompare(b.descripcion);
    });
  }, [catalog.manoDeObra, searchTerm, sortMode]);

  const handleMaterialPriceChange = (entry: MasterMaterialEntry, newPrice: number) => {
    onPropagateMaterial(entry.key, { costoUnitario: newPrice });
    triggerBanner(
      `Sincronización Global: "${entry.descripcion}" actualizado a ${formatCurrency(
        newPrice
      )}/${entry.unidad} en ${entry.partidasCount} ${
        entry.partidasCount === 1 ? 'partida' : 'partidas'
      }.`
    );
  };

  const handleMaterialWasteChange = (entry: MasterMaterialEntry, newWaste: number) => {
    onPropagateMaterial(entry.key, { desperdicioPorc: newWaste });
    triggerBanner(
      `Sincronización Global: Desperdicio de "${entry.descripcion}" ajustado a ${formatNumber(
        newWaste,
        2
      )}% en ${entry.partidasCount} ${entry.partidasCount === 1 ? 'partida' : 'partidas'}.`
    );
  };

  const handleEquipmentCostChange = (entry: MasterEquipmentEntry, newCosto: number) => {
    onPropagateEquipment(entry.key, { costo: newCosto });
    triggerBanner(
      `Sincronización Global: Costo de equipo "${entry.descripcion}" actualizado a ${formatCurrency(
        newCosto
      )} en ${entry.partidasCount} ${entry.partidasCount === 1 ? 'partida' : 'partidas'}.`
    );
  };

  const handleEquipmentDeprecChange = (entry: MasterEquipmentEntry, newDeprec: number) => {
    onPropagateEquipment(entry.key, { depreciacionOAlquiler: newDeprec });
    triggerBanner(
      `Sincronización Global: Factor de depreciación/alquiler de "${
        entry.descripcion
      }" actualizado a ${formatNumber(newDeprec, 4)} en ${entry.partidasCount} ${
        entry.partidasCount === 1 ? 'partida' : 'partidas'
      }.`
    );
  };

  const handleEquipmentDailyCostChange = (entry: MasterEquipmentEntry, newDaily: number) => {
    onPropagateEquipment(entry.key, { costoDiario: newDaily });
    triggerBanner(
      `Sincronización Global: Tarifa diaria de "${entry.descripcion}" actualizada a ${formatCurrency(
        newDaily
      )}/día en ${entry.partidasCount} ${entry.partidasCount === 1 ? 'partida' : 'partidas'}.`
    );
  };

  const handleLaborWageChange = (entry: MasterLaborEntry, newWage: number) => {
    onPropagateLabor(entry.key, { salarioDiario: newWage });
    triggerBanner(
      `Sincronización Global LOTTT: Salario de "${
        entry.descripcion
      }" actualizado a ${formatCurrency(newWage)}/día (+ FCAS ${fcasPorc}%) en ${
        entry.partidasCount
      } ${entry.partidasCount === 1 ? 'partida' : 'partidas'}.`
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Executive Header & Real-Time Consolidated Impact Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-2 rounded-xl bg-slate-900 text-emerald-400 shadow-2xs">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Catálogo Maestro Centralizado de Insumos (Data Binding Global)
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Propagación Automática en {items.length} Partidas
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-4xl">
              Al modificar el precio unitario de cualquier <strong>Material</strong>,{' '}
              <strong>Equipo</strong> o <strong>Salario de Mano de Obra</strong> en este catálogo (o
              dentro de cualquier APU individual), el cambio se propaga automáticamente a todas las
              partidas donde incide, recalculando al instante P.U., Costo Directo, Administración (
              {adminPorc}%), Utilidad ({utilidadPorc}%), IVA ({ivaPorc}%) y reportes Excel/PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {varianceCount > 0 && onUnifyAllPrices && (
              <button
                type="button"
                onClick={() => {
                  onUnifyAllPrices();
                  triggerBanner(
                    `¡Precios unificados exitosamente en las ${items.length} partidas del presupuesto!`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors cursor-pointer"
                title="Unificar insumos que tengan variaciones históricas de precio al valor maestro único"
              >
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                <span>Unificar Variaciones ({varianceCount})</span>
              </button>
            )}

            {onSaveChanges && (
              <button
                type="button"
                onClick={onSaveChanges}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Guardar todos los cambios de precios e insumos permanentemente"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => exportInsumosPorPartidaToExcel(items, 'ZXV', fcasPorc, adminPorc, utilidadPorc)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
              title="Exportar Maestro de Insumos e Incidencia por Partida a Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Exportar Insumos (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => exportLulowinToExcel(items, 'ZXV', fcasPorc, adminPorc, utilidadPorc)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              title="Exportar las 11 Tablas Relacionales LuloWin (ObraMate, ObraEqui, ObraMano)"
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar LuloWin</span>
            </button>

            {onResetAllToBaseline && (
              <button
                type="button"
                onClick={onResetAllToBaseline}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Restablecer precios de insumos a los valores oficiales de referencia"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Base</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Propagation Notification Banner */}
        {lastPropagationBanner && (
          <div className="bg-emerald-950 text-white px-4 py-2.5 rounded-xl border border-emerald-500/40 flex items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lastPropagationBanner}</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-300 shrink-0">
              Nuevo Total c/IVA: {formatCurrency(summary.granTotalGeneral)}
            </span>
          </div>
        )}

        {/* Real-Time Financial Mirror Strip (Consistencia en Tiempo Real) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Materiales ({catalog.totalMaterialesUnicos})
            </span>
            <span className="text-sm font-mono font-extrabold text-emerald-900 mt-0.5 block">
              {formatCurrency(summary.totalMateriales)}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
              Total Equipos ({catalog.totalEquiposUnicos})
            </span>
            <span className="text-sm font-mono font-extrabold text-blue-900 mt-0.5 block">
              {formatCurrency(summary.totalEquipos)}
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              M.O. Plena c/FCAS {fcasPorc}% ({catalog.totalManoObraUnica})
            </span>
            <span className="text-sm font-mono font-extrabold text-amber-900 mt-0.5 block">
              {formatCurrency(summary.totalManoObraPlena)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Costo Directo Consolidado
            </span>
            <span className="text-sm font-mono font-extrabold text-slate-900 mt-0.5 block">
              {formatCurrency(summary.totalCostoDirecto)}
            </span>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
              Admin ({adminPorc}%) + Util ({utilidadPorc}%)
            </span>
            <span className="text-sm font-mono font-extrabold text-purple-900 mt-0.5 block">
              {formatCurrency(summary.totalGastosAdmin + summary.totalUtilidad)}
            </span>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Total Presupuesto (c/IVA {ivaPorc}%)
            </span>
            <span className="text-sm font-mono font-extrabold text-white mt-0.5 block">
              {formatCurrency(summary.granTotalGeneral)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Selector & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/60">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('materiales');
                setExpandedInsumoKey(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'materiales'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>1. Materiales</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                  activeCategory === 'materiales'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {catalog.totalMaterialesUnicos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('equipos');
                setExpandedInsumoKey(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'equipos'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>2. Equipos y Maquinarias</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                  activeCategory === 'equipos'
                    ? 'bg-blue-800 text-blue-100'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {catalog.totalEquiposUnicos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('manoDeObra');
                setExpandedInsumoKey(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === 'manoDeObra'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>3. Mano de Obra (Tabulador LOTTT)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                  activeCategory === 'manoDeObra'
                    ? 'bg-amber-800 text-amber-100'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {catalog.totalManoObraUnica}
              </span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar insumo por nombre o código..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 font-medium">Ordenar:</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="monto_desc">Mayor Incidencia Total ($)</option>
                <option value="partidas_desc">Mayor N° de Partidas</option>
                <option value="precio_desc">Mayor Precio Unitario ($)</option>
                <option value="nombre_asc">Descripción (A-Z)</option>
                <option value="codigo_asc">Código Maestro</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================
            TAB 1: CATÁLOGO MAESTRO DE MATERIALES
        ========================================================= */}
        {activeCategory === 'materiales' && (
          <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 z-10 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 font-bold w-24">Código</th>
                  <th className="py-3 px-3 font-bold">Descripción del Material</th>
                  <th className="py-3 px-2 font-bold text-center w-20">Unidad</th>
                  <th className="py-3 px-3 font-bold text-center w-36">Partidas Vinculadas</th>
                  <th className="py-3 px-3 font-bold text-right w-32">Cant. Total Obra</th>
                  <th className="py-3 px-3 font-bold text-center w-36 bg-emerald-950 text-emerald-200">
                    % Desperdicio
                  </th>
                  <th className="py-3 px-3 font-bold text-center w-44 bg-emerald-900 text-white">
                    Precio Unitario ($)
                  </th>
                  <th className="py-3 px-3 font-bold text-right w-36">Incidencia Obra ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredMaterials.map((mat) => {
                  const isExpanded = expandedInsumoKey === `mat_${mat.key}`;
                  return (
                    <React.Fragment key={mat.key}>
                      <tr className="hover:bg-emerald-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {mat.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{mat.descripcion}</div>
                          {mat.hasPriceVariance && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Rango previo: {formatCurrency(mat.minCostoUnitario)} –{' '}
                              {formatCurrency(mat.maxCostoUnitario)} (Al editar se unifica en las{' '}
                              {mat.partidasCount} partidas)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600">
                          {mat.unidad}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedInsumoKey(isExpanded ? null : `mat_${mat.key}`)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                            title="Ver todas las partidas donde incide este material"
                          >
                            <span>
                              {mat.partidasCount}{' '}
                              {mat.partidasCount === 1 ? 'partida' : 'partidas'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatNumber(mat.cantidadTotalObra, 2)}
                        </td>
                        <td className="py-2.5 px-3 bg-emerald-50/30">
                          <div className="flex justify-center">
                            <NumberStepper
                              value={mat.desperdicioPorc}
                              step={1}
                              min={0}
                              max={100}
                              decimals={1}
                              onChange={(val) => handleMaterialWasteChange(mat, val)}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 bg-emerald-50/60">
                          <div className="flex justify-center">
                            <NumberStepper
                              value={mat.costoUnitario}
                              step={0.5}
                              min={0}
                              decimals={2}
                              onChange={(val) => handleMaterialPriceChange(mat, val)}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(mat.montoTotalObra)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <td colSpan={8} className="p-3.5">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                                <span>
                                  Partidas vinculadas a "{mat.descripcion}" ({mat.partidasCount}{' '}
                                  partidas afectadas en tiempo real):
                                </span>
                                <span className="font-mono text-emerald-700">
                                  Precio Maestro Activo: {formatCurrency(mat.costoUnitario)} /{' '}
                                  {mat.unidad}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pt-1">
                                {mat.partidaIds.map((pid) => {
                                  const pItem = itemsById.get(pid);
                                  if (!pItem) return null;
                                  const pCalc = calculateItemApu(
                                    pItem,
                                    fcasPorc,
                                    adminPorc,
                                    utilidadPorc
                                  );
                                  return (
                                    <div
                                      key={pid}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px]"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-mono font-bold text-slate-900">
                                          Partida {String(pid).padStart(3, '0')} · P.U.:{' '}
                                          <span className="text-emerald-700">
                                            {formatCurrency(pCalc.precioUnitario)}
                                          </span>
                                        </div>
                                        <div className="text-slate-600 truncate">
                                          {pItem.descripcion}
                                        </div>
                                      </div>
                                      {onSelectPartidaApu && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectPartidaApu(pItem)}
                                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                                          title="Abrir APU de esta partida"
                                        >
                                          <span>APU</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================
            TAB 2: CATÁLOGO MAESTRO DE EQUIPOS Y MAQUINARIAS
        ========================================================= */}
        {activeCategory === 'equipos' && (
          <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 z-10 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 font-bold w-24">Código</th>
                  <th className="py-3 px-3 font-bold">Descripción del Equipo / Maquinaria</th>
                  <th className="py-3 px-3 font-bold text-center w-36">Partidas Vinculadas</th>
                  <th className="py-3 px-3 font-bold text-center w-44 bg-blue-950 text-blue-200">
                    Costo Reposición ($)
                  </th>
                  <th className="py-3 px-3 font-bold text-center w-40 bg-blue-950 text-blue-200">
                    Factor Deprec./Alq.
                  </th>
                  <th className="py-3 px-3 font-bold text-center w-44 bg-blue-900 text-white">
                    Costo Diario ($/Día)
                  </th>
                  <th className="py-3 px-3 font-bold text-right w-36">Incidencia Obra ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredEquipments.map((eq) => {
                  const isExpanded = expandedInsumoKey === `eq_${eq.key}`;
                  return (
                    <React.Fragment key={eq.key}>
                      <tr className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {eq.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{eq.descripcion}</div>
                          {eq.hasPriceVariance && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Rango previo: {formatCurrency(eq.minCosto)} –{' '}
                              {formatCurrency(eq.maxCosto)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedInsumoKey(isExpanded ? null : `eq_${eq.key}`)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors cursor-pointer"
                          >
                            <span>
                              {eq.partidasCount} {eq.partidasCount === 1 ? 'partida' : 'partidas'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 bg-blue-50/30">
                          <div className="flex justify-center">
                            <NumberStepper
                              value={eq.costo}
                              step={10}
                              min={0}
                              decimals={2}
                              onChange={(val) => handleEquipmentCostChange(eq, val)}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 bg-blue-50/30">
                          <div className="flex justify-center">
                            <NumberStepper
                              value={eq.depreciacionOAlquiler}
                              step={0.005}
                              min={0.0001}
                              max={10}
                              decimals={4}
                              onChange={(val) => handleEquipmentDeprecChange(eq, val)}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 bg-blue-50/60">
                          <div className="flex justify-center">
                            <NumberStepper
                              value={eq.costoDiario}
                              step={1}
                              min={0}
                              decimals={2}
                              onChange={(val) => handleEquipmentDailyCostChange(eq, val)}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(eq.montoTotalObra)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <td colSpan={7} className="p-3.5">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                                <span>
                                  Partidas vinculadas a "{eq.descripcion}" ({eq.partidasCount}{' '}
                                  partidas afectadas en tiempo real):
                                </span>
                                <span className="font-mono text-blue-700">
                                  Costo Diario Maestro: {formatCurrency(eq.costoDiario)}/día
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pt-1">
                                {eq.partidaIds.map((pid) => {
                                  const pItem = itemsById.get(pid);
                                  if (!pItem) return null;
                                  const pCalc = calculateItemApu(
                                    pItem,
                                    fcasPorc,
                                    adminPorc,
                                    utilidadPorc
                                  );
                                  return (
                                    <div
                                      key={pid}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px]"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-mono font-bold text-slate-900">
                                          Partida {String(pid).padStart(3, '0')} · P.U.:{' '}
                                          <span className="text-blue-700">
                                            {formatCurrency(pCalc.precioUnitario)}
                                          </span>
                                        </div>
                                        <div className="text-slate-600 truncate">
                                          {pItem.descripcion}
                                        </div>
                                      </div>
                                      {onSelectPartidaApu && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectPartidaApu(pItem)}
                                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                                        >
                                          <span>APU</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================
            TAB 3: TABULADOR MAESTRO DE MANO DE OBRA (LOTTT & CCP)
        ========================================================= */}
        {activeCategory === 'manoDeObra' && (
          <div className="overflow-x-auto max-h-[680px] overflow-y-auto">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 z-10 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 font-bold w-24">Código</th>
                  <th className="py-3 px-3 font-bold">Cargo / Oficio (Tabulador Petrolero LOTTT)</th>
                  <th className="py-3 px-3 font-bold text-center w-36">Partidas Vinculadas</th>
                  <th className="py-3 px-3 font-bold text-right w-32">Jornales Obra (H-D)</th>
                  <th className="py-3 px-3 font-bold text-center w-44 bg-amber-900 text-white">
                    Salario Diario Base ($)
                  </th>
                  <th className="py-3 px-3 font-bold text-right w-36 bg-amber-950 text-amber-200">
                    Salario Pleno c/FCAS ({fcasPorc}%)
                  </th>
                  <th className="py-3 px-3 font-bold text-right w-36">Total M.O. Directa ($)</th>
                  <th className="py-3 px-3 font-bold text-right w-40">
                    Incidencia Plena c/FCAS ($)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLabor.map((mo) => {
                  const isExpanded = expandedInsumoKey === `mo_${mo.key}`;
                  const salarioPlenoDia = mo.salarioDiario * (1 + fcasPorc / 100);
                  return (
                    <React.Fragment key={mo.key}>
                      <tr className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                          {mo.codigo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div>{mo.descripcion}</div>
                          {mo.hasPriceVariance && (
                            <span className="inline-block mt-0.5 text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              Rango previo: {formatCurrency(mo.minSalarioDiario)} –{' '}
                              {formatCurrency(mo.maxSalarioDiario)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedInsumoKey(isExpanded ? null : `mo_${mo.key}`)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                          >
                            <span>
                              {mo.partidasCount} {mo.partidasCount === 1 ? 'partida' : 'partidas'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatNumber(mo.jornalesTotalesObra, 2)}
                        </td>
                        <td className="py-2.5 px-3 bg-amber-50/60">
                          <div className="flex justify-center">
                            <NumberStepper
                              value={mo.salarioDiario}
                              step={0.5}
                              min={0}
                              decimals={2}
                              onChange={(val) => handleLaborWageChange(mo, val)}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-900 bg-amber-50/30">
                          {formatCurrency(salarioPlenoDia)}/día
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(mo.montoTotalDirectoObra)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(mo.montoTotalConFcasObra)}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <td colSpan={8} className="p-3.5">
                            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                                <span>
                                  Partidas vinculadas a "{mo.descripcion}" ({mo.partidasCount}{' '}
                                  partidas afectadas en tiempo real):
                                </span>
                                <span className="font-mono text-amber-800">
                                  Salario Base: {formatCurrency(mo.salarioDiario)}/día · Pleno c/FCAS:{' '}
                                  {formatCurrency(salarioPlenoDia)}/día
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pt-1">
                                {mo.partidaIds.map((pid) => {
                                  const pItem = itemsById.get(pid);
                                  if (!pItem) return null;
                                  const pCalc = calculateItemApu(
                                    pItem,
                                    fcasPorc,
                                    adminPorc,
                                    utilidadPorc
                                  );
                                  return (
                                    <div
                                      key={pid}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px]"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-mono font-bold text-slate-900">
                                          Partida {String(pid).padStart(3, '0')} · P.U.:{' '}
                                          <span className="text-amber-800">
                                            {formatCurrency(pCalc.precioUnitario)}
                                          </span>
                                        </div>
                                        <div className="text-slate-600 truncate">
                                          {pItem.descripcion}
                                        </div>
                                      </div>
                                      {onSelectPartidaApu && (
                                        <button
                                          type="button"
                                          onClick={() => onSelectPartidaApu(pItem)}
                                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                                        >
                                          <span>APU</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
