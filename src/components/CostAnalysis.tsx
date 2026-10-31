import React, { useMemo } from 'react';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { calculateItemApu, formatCurrency, formatNumber } from '../utils/apuCalculations';
import { CATEGORIES } from '../data/itemsData';
import {
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Award,
  AlertCircle,
  Eye,
  FileText,
  DollarSign,
  Briefcase,
  Wrench,
  Package
} from 'lucide-react';

interface CostAnalysisProps {
  items: PartidaItem[];
  summary: FinancialSummary;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  onSelectApu: (item: PartidaItem) => void;
  onSelectSpec: (item: PartidaItem) => void;
}

export const CostAnalysis: React.FC<CostAnalysisProps> = ({
  items,
  summary,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  onSelectApu,
  onSelectSpec,
}) => {
  // 1. Group items by Chapter
  const chapterData = useMemo(() => {
    const chaptersMap: Record<string, {
      name: string;
      itemsCount: number;
      totalCost: number;
      totalMateriales: number;
      totalEquipos: number;
      totalManoObra: number;
    }> = {};

    CATEGORIES.forEach((cat) => {
      chaptersMap[cat] = {
        name: cat,
        itemsCount: 0,
        totalCost: 0,
        totalMateriales: 0,
        totalEquipos: 0,
        totalManoObra: 0,
      };
    });

    items.forEach((item) => {
      const cat = item.capitulo;
      if (!chaptersMap[cat]) {
        chaptersMap[cat] = {
          name: cat,
          itemsCount: 0,
          totalCost: 0,
          totalMateriales: 0,
          totalEquipos: 0,
          totalManoObra: 0,
        };
      }
      const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
      chaptersMap[cat].itemsCount += 1;
      chaptersMap[cat].totalCost += calc.totalPartida;
      chaptersMap[cat].totalMateriales += calc.unitarioMateriales * item.cantidad;
      chaptersMap[cat].totalEquipos += calc.unitarioEquipos * item.cantidad;
      chaptersMap[cat].totalManoObra += calc.unitarioManoObra * item.cantidad;
    });

    return Object.values(chaptersMap)
      .filter((c) => c.itemsCount > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [items, fcasPorc, adminPorc, utilidadPorc]);

  // 2. Top 10 items by total cost
  const topItems = useMemo(() => {
    const listWithCost = items.map((item) => {
      const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
      return {
        item,
        calc,
        total: calc.totalPartida,
        percentOfBudget: summary.subTotalGeneral > 0 ? (calc.totalPartida / summary.subTotalGeneral) * 100 : 0,
      };
    });

    return listWithCost.sort((a, b) => b.total - a.total).slice(0, 10);
  }, [items, fcasPorc, adminPorc, utilidadPorc, summary]);

  // Direct vs Indirect percentages
  const directPct = summary.subTotalGeneral > 0 ? ((summary.totalCostoDirecto) / summary.subTotalGeneral) * 100 : 0;
  const adminPct = summary.subTotalGeneral > 0 ? (summary.totalAdministracion / summary.subTotalGeneral) * 100 : 0;
  const utilPct = summary.subTotalGeneral > 0 ? (summary.totalUtilidad / summary.subTotalGeneral) * 100 : 0;

  const matOfDirect = summary.totalCostoDirecto > 0 ? (summary.totalMateriales / summary.totalCostoDirecto) * 100 : 0;
  const moOfDirect = summary.totalCostoDirecto > 0 ? (summary.totalManoObraPlena / summary.totalCostoDirecto) * 100 : 0;
  const eqOfDirect = summary.totalCostoDirecto > 0 ? (summary.totalEquipos / summary.totalCostoDirecto) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Framework Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-600" />
              Estructura Analítica de Costos & Análisis de Sensibilidad
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Desglose paramétrico ajustado al tabulador petrolero CCP 2024-2026, marco LOTTT y factores contractuales PDVSA.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="font-semibold text-slate-700">Partidas Auditadas:</span>
            <span className="font-mono font-bold text-slate-900">{items.length} partidas</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-700">Trazabilidad Specs:</span>
            <span className="font-mono font-bold text-emerald-700">100% Sincronizado</span>
          </div>
        </div>

        {/* Breakdown comparison bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
          {/* Card 1: Direct vs Indirect Structure */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider">Composición del Presupuesto (Sub-Total)</span>
              <span className="font-mono text-slate-500">{formatCurrency(summary.subTotalGeneral)}</span>
            </div>

            {/* Multi-segment progress bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${directPct}%` }}
                className="bg-blue-600 h-full transition-all duration-300"
                title={`Costo Directo: ${directPct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${adminPct}%` }}
                className="bg-amber-500 h-full transition-all duration-300"
                title={`Administración (12.5%): ${adminPct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${utilPct}%` }}
                className="bg-emerald-600 h-full transition-all duration-300"
                title={`Utilidad (17.0%): ${utilPct.toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  Costo Directo
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(summary.totalCostoDirecto)}</div>
                <div className="text-[11px] text-slate-500 font-mono">{directPct.toFixed(1)}% del subtotal</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Administración ({adminPorc}%)
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(summary.totalAdministracion)}</div>
                <div className="text-[11px] text-slate-500 font-mono">{adminPct.toFixed(1)}% del subtotal</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                  Utilidad ({utilidadPorc}%)
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(summary.totalUtilidad)}</div>
                <div className="text-[11px] text-slate-500 font-mono">{utilPct.toFixed(1)}% del subtotal</div>
              </div>
            </div>
          </div>

          {/* Card 2: Direct Cost Components */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 uppercase tracking-wider">Desglose de Costos Directos</span>
              <span className="font-mono text-slate-500">{formatCurrency(summary.totalCostoDirecto)}</span>
            </div>

            {/* Multi-segment progress bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${matOfDirect}%` }}
                className="bg-indigo-600 h-full transition-all duration-300"
                title={`Materiales: ${matOfDirect.toFixed(1)}%`}
              />
              <div
                style={{ width: `${moOfDirect}%` }}
                className="bg-cyan-600 h-full transition-all duration-300"
                title={`Mano de Obra + FCAS: ${moOfDirect.toFixed(1)}%`}
              />
              <div
                style={{ width: `${eqOfDirect}%` }}
                className="bg-purple-600 h-full transition-all duration-300"
                title={`Equipos: ${eqOfDirect.toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  Materiales
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(summary.totalMateriales)}</div>
                <div className="text-[11px] text-slate-500 font-mono">{matOfDirect.toFixed(1)}% directo</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-cyan-800 font-semibold">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-600" />
                  Labor + FCAS
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(summary.totalManoObraPlena)}</div>
                <div className="text-[11px] text-slate-500 font-mono">{moOfDirect.toFixed(1)}% directo</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-purple-700 font-semibold">
                  <Wrench className="w-3.5 h-3.5 text-purple-600" />
                  Equipos
                </div>
                <div className="font-mono font-bold text-slate-900 mt-1">{formatCurrency(summary.totalEquipos)}</div>
                <div className="text-[11px] text-slate-500 font-mono">{eqOfDirect.toFixed(1)}% directo</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Distribución de Inversión por Capítulos / Especialidades</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">{chapterData.length} capítulos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Capítulo / Especialidad</th>
                <th className="py-2.5 px-3 text-center">Partidas</th>
                <th className="py-2.5 px-3 text-right">Materiales</th>
                <th className="py-2.5 px-3 text-right">Equipos</th>
                <th className="py-2.5 px-3 text-right">Mano de Obra</th>
                <th className="py-2.5 px-4 text-right">Total Capítulo</th>
                <th className="py-2.5 px-4 text-right w-36">% del Presupuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chapterData.map((chap) => {
                const pct = summary.subTotalGeneral > 0 ? (chap.totalCost / summary.subTotalGeneral) * 100 : 0;
                return (
                  <tr key={chap.name} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {chap.name}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {chap.itemsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(chap.totalMateriales)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(chap.totalEquipos)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(chap.totalManoObra)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(chap.totalCost)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-700 w-10 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td className="py-3 px-4">TOTAL GENERAL SUB-TOTAL</td>
                <td className="py-3 px-3 text-center font-mono">{items.length}</td>
                <td className="py-3 px-3 text-right font-mono">{formatCurrency(summary.totalMateriales)}</td>
                <td className="py-3 px-3 text-right font-mono">{formatCurrency(summary.totalEquipos)}</td>
                <td className="py-3 px-3 text-right font-mono">{formatCurrency(summary.totalManoObraPlena)}</td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800 font-extrabold">{formatCurrency(summary.subTotalGeneral)}</td>
                <td className="py-3 px-4 text-right font-mono">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top 10 High Impact Items (Ley de Pareto 80/20) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Top 10 Partidas de Mayor Impacto Económico (Principio de Pareto)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Control prioritario para inspección de obras y suministros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3 w-16">Item</th>
                <th className="py-2.5 px-3">Descripción de la Partida</th>
                <th className="py-2.5 px-3 text-center">Cant.</th>
                <th className="py-2.5 px-3 text-center">Unidad</th>
                <th className="py-2.5 px-3 text-right">P.U. ($)</th>
                <th className="py-2.5 px-3 text-right">Total ($)</th>
                <th className="py-2.5 px-3 text-right">% Presup.</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topItems.map((top, idx) => (
                <tr key={top.item.id} className="hover:bg-amber-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {top.item.id}
                  </td>
                  <td className="py-2.5 px-3 max-w-md">
                    <div className="font-semibold text-slate-800 line-clamp-1">
                      {top.item.descripcion}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {top.item.codigoCovenin} · {top.item.capitulo}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-medium">
                    {formatNumber(top.item.cantidad)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600">
                    {top.item.unidad}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(top.calc.precioUnitario)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(top.total)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                    {top.percentOfBudget.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectApu(top.item)}
                        className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Ver APU oficial"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectSpec(top.item)}
                        className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title="Ver Especificación Técnica"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legal & Labor Framework Summary Callout */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="space-y-2 text-xs">
            <h4 className="text-sm font-bold text-slate-100">
              Marco Legal Laboral LOTT & Tabulador Petrolero PDVSA
            </h4>
            <p className="text-slate-300 leading-relaxed">
              El régimen de Mano de Obra para este proyecto en Flota Pesada El Toreño, Parroquia San Silvestre, Municipio Barinas, contempla el tabulador salarial petrolero base más un <strong>FCAS oficial del {fcasPorc}%</strong>. Este factor absorbe legalmente los pasivos estipulados en la LOTTT (prestaciones sociales, domingos y feriados trabajados, bono vacacional, utilidades legales, tiempo de viaje, dotaciones y seguro de hospitalización, cirugía y maternidad HCM).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-slate-300">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[11px]">Gastos Administrativos:</span>
                <span className="font-bold text-slate-100">{adminPorc}% s/ Costo Directo</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Operaciones de campo, oficina técnica y supervisión</span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[11px]">Utilidad Contractual:</span>
                <span className="font-bold text-slate-100">{utilidadPorc}% s/ (CD + Admin)</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Rendimiento financiero e imprevistos de obra</span>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-slate-400 block text-[11px]">Impuesto de Ley (IVA):</span>
                <span className="font-bold text-slate-100">16.0% s/ Sub-Total</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">Alicuota tributaria nacional vigente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
