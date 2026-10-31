import React, { useState, useMemo, useEffect } from 'react';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { formatCurrency, formatNumber } from '../utils/apuCalculations';
import {
  MONTH_LABELS,
  MONTH_SUBTITLES,
  TOTAL_MONTHS,
  calculateCronogramaData,
  buildPresetDistributions,
  getChapterDistribution,
} from '../utils/cronogramaCalculations';
import {
  exportCronogramaToExcel,
  exportCronogramaToPdf,
} from '../utils/cronogramaExport';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileDown,
  Sliders,
  RotateCcw,
  Search,
  Layers,
  CheckCircle2,
  BarChart3,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react';

interface CronogramaViewerProps {
  projectId: string;
  projectName?: string;
  projectSolped?: string;
  items: PartidaItem[];
  summary: FinancialSummary;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc: number;
}

export const CronogramaViewer: React.FC<CronogramaViewerProps> = ({
  projectId,
  projectName,
  projectSolped,
  items,
  summary,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  ivaPorc,
}) => {
  const storageKey = `pdvsa_cronograma_dist_v1_${projectId}`;

  // Custom chapter distributions persisted per project
  const [customDistributions, setCustomDistributions] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setCustomDistributions(saved ? JSON.parse(saved) : {});
    } catch {
      setCustomDistributions({});
    }
  }, [storageKey]);

  const saveCustomDistributions = (next: Record<string, number[]>) => {
    setCustomDistributions(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Contractual cashflow parameters (Anticipo & Retenciones)
  const [anticipoPorc, setAnticipoPorc] = useState<number>(20.0);
  const [retFielPorc, setRetFielPorc] = useState<number>(10.0);
  const [retLaboralPorc, setRetLaboralPorc] = useState<number>(5.0);
  const [showContractualCashflow, setShowContractualCashflow] = useState<boolean>(true);

  // Chart & Gantt display controls
  const [chartWithIva, setChartWithIva] = useState<boolean>(false);
  const [ganttMode, setGanttMode] = useState<'capitulos' | 'partidas'>('capitulos');
  const [ganttCellDisplay, setGanttCellDisplay] = useState<'ambos' | 'monto' | 'porcentaje'>('ambos');
  const [isEditingSchedule, setIsEditingSchedule] = useState<boolean>(false);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // Partidas filter & pagination
  const [searchPartida, setSearchPartida] = useState<string>('');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('Todos');
  const [partidaPage, setPartidaPage] = useState<number>(1);
  const pageSize = 25;

  // Compute full 8-month schedule, disbursements & S-curve
  const cronogramaData = useMemo(() => {
    return calculateCronogramaData(
      items,
      summary,
      fcasPorc,
      adminPorc,
      utilidadPorc,
      ivaPorc,
      customDistributions,
      anticipoPorc,
      retFielPorc,
      retLaboralPorc
    );
  }, [
    items,
    summary,
    fcasPorc,
    adminPorc,
    utilidadPorc,
    ivaPorc,
    customDistributions,
    anticipoPorc,
    retFielPorc,
    retLaboralPorc,
  ]);

  const allChapterNames = useMemo(
    () => cronogramaData.chapters.map((c) => c.capitulo),
    [cronogramaData.chapters]
  );

  // Filtered partidas for detailed Gantt
  const filteredPartidas = useMemo(() => {
    return cronogramaData.partidas.filter((row) => {
      const matchSearch =
        row.item.descripcion.toLowerCase().includes(searchPartida.toLowerCase()) ||
        row.item.codigoCovenin.toLowerCase().includes(searchPartida.toLowerCase()) ||
        String(row.item.id).includes(searchPartida);
      const matchCap =
        selectedChapterFilter === 'Todos' || row.item.capitulo === selectedChapterFilter;
      return matchSearch && matchCap;
    });
  }, [cronogramaData.partidas, searchPartida, selectedChapterFilter]);

  const totalPartidaPages = Math.max(1, Math.ceil(filteredPartidas.length / pageSize));
  const paginatedPartidas = useMemo(() => {
    const start = (partidaPage - 1) * pageSize;
    return filteredPartidas.slice(start, start + pageSize);
  }, [filteredPartidas, partidaPage]);

  // Handlers for editing chapter monthly distribution
  const handleChapterMonthEdit = (capitulo: string, monthIdx: number, newValStr: string) => {
    const val = Math.max(0, parseFloat(newValStr) || 0);
    const current =
      customDistributions[capitulo] ||
      getChapterDistribution(capitulo, customDistributions);
    const updated = [...current];
    updated[monthIdx] = val;
    saveCustomDistributions({
      ...customDistributions,
      [capitulo]: updated,
    });
  };

  const handleApplyPreset = (preset: 'pdvsa_scurve' | 'lineal' | 'temprana' | 'media') => {
    if (preset === 'pdvsa_scurve') {
      saveCustomDistributions({});
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      return;
    }
    const next = buildPresetDistributions(allChapterNames, preset);
    saveCustomDistributions(next);
  };

  // =========================================================================
  // SVG S-CURVE & HISTOGRAM GEOMETRY
  // =========================================================================
  const svgWidth = 960;
  const svgHeight = 370;
  const padLeft = 86;
  const padRight = 68;
  const padTop = 34;
  const padBottom = 56;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const colStep = plotW / TOTAL_MONTHS;

  const totalRefAmount = chartWithIva
    ? cronogramaData.totalConIva
    : cronogramaData.totalSinIva;

  const chartPoints = useMemo(() => {
    return cronogramaData.months.map((m, idx) => {
      const x = padLeft + colStep * (idx + 0.5);
      const monthlyVal = chartWithIva ? m.desembolsoMensualConIva : m.inversionMensualSinIva;
      const accumVal = chartWithIva ? m.desembolsoAcumuladoConIva : m.inversionAcumuladaSinIva;
      const barH = totalRefAmount > 0 ? (monthlyVal / totalRefAmount) * plotH : 0;
      const barY = padTop + plotH - barH;
      const curveY = padTop + plotH - (m.avanceAcumuladoPorc / 100) * plotH;

      return {
        idx,
        x,
        barY,
        barH,
        curveY,
        monthlyVal,
        accumVal,
        m,
      };
    });
  }, [cronogramaData.months, chartWithIva, totalRefAmount, colStep, plotH]);

  // Smooth cubic bezier path from origin (padLeft, padTop + plotH) through all 8 points
  const sCurvePath = useMemo(() => {
    const startX = padLeft;
    const startY = padTop + plotH;
    const allPts = [{ x: startX, y: startY }, ...chartPoints.map((p) => ({ x: p.x, y: p.curveY }))];
    let d = `M ${allPts[0].x} ${allPts[0].y}`;
    for (let i = 0; i < allPts.length - 1; i++) {
      const p0 = allPts[i];
      const p1 = allPts[i + 1];
      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpy1 = p0.y;
      const cpx2 = p0.x + (p1.x - p0.x) * 0.55;
      const cpy2 = p1.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [chartPoints, plotH]);

  const sCurveAreaPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const lastPt = chartPoints[chartPoints.length - 1];
    return `${sCurvePath} L ${lastPt.x} ${padTop + plotH} L ${padLeft} ${padTop + plotH} Z`;
  }, [sCurvePath, chartPoints, plotH]);

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE HEADER & EXPORT BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  Cronograma de Ejecución de Obra, Plan de Desembolsos y Curva de Inversión ("Curva S")
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Plazo Contractual: <strong className="text-slate-800">8 Meses (240 Días Continuos / 32 Semanas)</strong> · Sincronizado en tiempo real con las {items.length} partidas del presupuesto
                </p>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                exportCronogramaToExcel(
                  cronogramaData,
                  ivaPorc,
                  anticipoPorc,
                  retFielPorc,
                  retLaboralPorc,
                  projectName,
                  projectSolped
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              title="Descargar libro Excel con 3 hojas: Plan de Desembolsos y Curva S, Cronograma por Capítulos y Cronograma por Partidas"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Exportar Cronograma & Curva S (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportCronogramaToPdf(cronogramaData, ivaPorc, projectName, projectSolped)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Descargar Reporte PDF Oficial PDVSA con Diagrama de Gantt (8 Meses), Plan de Desembolsos y Gráfico de Curva S"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar Cronograma & Curva S (.pdf)</span>
            </button>
          </div>
        </div>

        {/* 4 Executive Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>PLAZO DE EJECUCIÓN</span>
              <Clock className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
              8 Meses <span className="text-xs font-semibold text-slate-500">(240 Días)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {cronogramaData.chapters.length} Capítulos · {items.length} Partidas programadas
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
              <span>INVERSIÓN TOTAL (SIN IVA)</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-extrabold text-blue-950 mt-1 font-mono">
              {formatCurrency(cronogramaData.totalSinIva)}
            </div>
            <div className="text-[11px] text-blue-700 mt-1">
              Promedio mensual: <strong>{formatCurrency(cronogramaData.averageMonthlySinIva)}/mes</strong>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span>DESEMBOLSO TOTAL (CON IVA {ivaPorc}%)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-950 mt-1 font-mono">
              {formatCurrency(cronogramaData.totalConIva)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1">
              Promedio con IVA: <strong>{formatCurrency(cronogramaData.averageMonthlyConIva)}/mes</strong>
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
              <span>MES PICO DE MAYOR INVERSIÓN</span>
              <BarChart3 className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-950 mt-1 font-mono">
              {cronogramaData.peakMonth?.label}: {formatNumber(cronogramaData.peakMonth?.avanceMensualPorc || 0, 2)}%
            </div>
            <div className="text-[11px] text-amber-800 mt-1">
              Desembolso Sin IVA: <strong>{formatCurrency(cronogramaData.peakMonth?.inversionMensualSinIva || 0)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE S-CURVE & MONTHLY DISBURSEMENT HISTOGRAM */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-600" />
              <span>Curva de Inversión Acumulada ("Curva S") e Histograma de Desembolsos (Mes 1 a Mes 8)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Las barras representan el desembolso programado de cada mes y la curva roja traza la inversión acumulada del 0% al 100%.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Curve Profile Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleApplyPreset('pdvsa_scurve')}
                className="px-2.5 py-1 font-semibold rounded-md bg-white text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                title="Secuencia lógica de ingeniería PDVSA (Curva S estándar)"
              >
                Curva S Estándar
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('temprana')}
                className="px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-colors cursor-pointer"
                title="Mayor peso financiero en los primeros meses"
              >
                Temprana
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('media')}
                className="px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-colors cursor-pointer"
                title="Concentración de obra en meses centrales (Meses 3 al 6)"
              >
                Fase Media
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('lineal')}
                className="px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-colors cursor-pointer"
                title="Distribución uniforme de 12.5% por mes"
              >
                Lineal (12.5%)
              </button>
            </div>

            {/* Toggle Sin IVA / Con IVA */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setChartWithIva(false)}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  !chartWithIva ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sin IVA ($)
              </button>
              <button
                type="button"
                onClick={() => setChartWithIva(true)}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  chartWithIva ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Con IVA ($)
              </button>
            </div>
          </div>
        </div>

        {/* SVG Chart Container */}
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[740px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none bg-slate-50/40 rounded-xl border border-slate-200/80"
            >
              <defs>
                <linearGradient id="scurveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.55" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines (0%, 20%, 40%, 60%, 80%, 100%) */}
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
                const y = padTop + plotH - ratio * plotH;
                const dollarTick = totalRefAmount * ratio;
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke={ratio === 0 || ratio === 1 ? '#94a3b8' : '#e2e8f0'}
                      strokeWidth={ratio === 0 ? 1.5 : 1}
                      strokeDasharray={ratio === 0 || ratio === 1 ? undefined : '4 4'}
                    />
                    {/* Left Y Axis: USD */}
                    <text
                      x={padLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[11px] fill-slate-600 font-mono"
                    >
                      ${formatNumber(dollarTick / 1000, 0)}k
                    </text>
                    {/* Right Y Axis: % Cumulative */}
                    <text
                      x={svgWidth - padRight + 10}
                      y={y + 4}
                      textAnchor="start"
                      className="text-[11px] fill-red-700 font-mono font-bold"
                    >
                      {Math.round(ratio * 100)}%
                    </text>
                  </g>
                );
              })}

              {/* Vertical Month Columns & Bars */}
              {chartPoints.map((pt) => {
                const isHovered = hoveredMonthIdx === pt.idx;
                const barW = colStep * 0.44;
                return (
                  <g
                    key={pt.idx}
                    onMouseEnter={() => setHoveredMonthIdx(pt.idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover highlight column */}
                    <rect
                      x={padLeft + colStep * pt.idx}
                      y={padTop}
                      width={colStep}
                      height={plotH}
                      fill={isHovered ? '#f1f5f9' : 'transparent'}
                    />

                    {/* Monthly Disbursement Bar */}
                    <rect
                      x={pt.x - barW / 2}
                      y={pt.barY}
                      width={barW}
                      height={Math.max(2, pt.barH)}
                      rx={4}
                      fill="url(#barGrad)"
                      stroke="#0369a1"
                      strokeWidth={isHovered ? 1.8 : 1}
                    />

                    {/* Monthly Bar Value Label */}
                    <text
                      x={pt.x}
                      y={Math.max(padTop + 12, pt.barY - 6)}
                      textAnchor="middle"
                      className="text-[10px] fill-sky-900 font-mono font-bold"
                    >
                      ${formatNumber(pt.monthlyVal / 1000, 1)}k ({formatNumber(pt.m.avanceMensualPorc, 1)}%)
                    </text>

                    {/* X Axis Month Label */}
                    <text
                      x={pt.x}
                      y={padTop + plotH + 20}
                      textAnchor="middle"
                      className="text-xs fill-slate-800 font-bold"
                    >
                      {pt.m.label}
                    </text>
                    <text
                      x={pt.x}
                      y={padTop + plotH + 35}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-mono"
                    >
                      {pt.m.subtitle}
                    </text>
                  </g>
                );
              })}

              {/* S-Curve Shaded Area */}
              <path d={sCurveAreaPath} fill="url(#scurveAreaGrad)" />

              {/* S-Curve Smooth Bezier Line */}
              <path
                d={sCurvePath}
                fill="none"
                stroke="#dc2626"
                strokeWidth={3.2}
                strokeLinecap="round"
              />

              {/* Origin Node (0%) */}
              <circle
                cx={padLeft}
                cy={padTop + plotH}
                r={4.5}
                fill="#ffffff"
                stroke="#dc2626"
                strokeWidth={2.5}
              />

              {/* S-Curve Data Nodes & Cumulative Labels */}
              {chartPoints.map((pt) => {
                const isHovered = hoveredMonthIdx === pt.idx;
                return (
                  <g
                    key={`node-${pt.idx}`}
                    onMouseEnter={() => setHoveredMonthIdx(pt.idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.curveY}
                      r={isHovered ? 6.5 : 5}
                      fill="#ffffff"
                      stroke="#dc2626"
                      strokeWidth={3}
                    />
                    <rect
                      x={pt.x - 26}
                      y={pt.curveY - 26}
                      width={52}
                      height={18}
                      rx={4}
                      fill="#991b1b"
                    />
                    <text
                      x={pt.x}
                      y={pt.curveY - 14}
                      textAnchor="middle"
                      className="text-[10px] fill-white font-mono font-bold"
                    >
                      {formatNumber(pt.m.avanceAcumuladoPorc, 1)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Legend & Hover Inspector Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-xs bg-sky-600 inline-block" />
              <span className="font-semibold text-slate-700">
                Histograma de Desembolso Mensual ({chartWithIva ? 'Con IVA' : 'Sin IVA'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-red-600 rounded-full inline-block" />
              <span className="font-semibold text-slate-700">
                Curva "S" de Inversión y Avance Acumulado (0% a 100%)
              </span>
            </div>
          </div>

          {hoveredMonthIdx !== null && cronogramaData.months[hoveredMonthIdx] && (
            <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-lg font-mono text-xs flex flex-wrap items-center gap-3">
              <span className="text-amber-400 font-bold">
                {cronogramaData.months[hoveredMonthIdx].label} ({cronogramaData.months[hoveredMonthIdx].subtitle}):
              </span>
              <span>
                Mensual: <strong>{formatCurrency(chartWithIva ? cronogramaData.months[hoveredMonthIdx].desembolsoMensualConIva : cronogramaData.months[hoveredMonthIdx].inversionMensualSinIva)}</strong> ({formatNumber(cronogramaData.months[hoveredMonthIdx].avanceMensualPorc, 2)}%)
              </span>
              <span>·</span>
              <span>
                Acumulado: <strong className="text-emerald-400">{formatCurrency(chartWithIva ? cronogramaData.months[hoveredMonthIdx].desembolsoAcumuladoConIva : cronogramaData.months[hoveredMonthIdx].inversionAcumuladaSinIva)}</strong> ({formatNumber(cronogramaData.months[hoveredMonthIdx].avanceAcumuladoPorc, 2)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. CUADRO MAESTRO DE DESEMBOLSOS MENSUALES Y FLUJO DE INVERSIÓN */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Plan Maestro de Desembolsos Mensuales y Flujo de Inversión (Mes 1 a Mes 8)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Desglose mensual y acumulado de costos directos, inversión subtotal sin IVA, IVA ({ivaPorc}%), total con IVA y flujo neto de valuaciones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showContractualCashflow}
                onChange={(e) => setShowContractualCashflow(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Mostrar Amortización de Anticipo y Retenciones</span>
            </label>
          </div>
        </div>

        {/* Contractual Parameters Bar (if enabled) */}
        {showContractualCashflow && (
          <div className="bg-amber-50/60 border-b border-amber-200/80 px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-amber-950 font-semibold">
              <Sliders className="w-4 h-4 text-amber-700" />
              <span>Parámetros de Valuación Contractual:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-700 font-medium">Anticipo Contractual (%):</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={5}
                  value={anticipoPorc}
                  onChange={(e) => setAnticipoPorc(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-16 px-2 py-1 text-right font-mono font-bold bg-white border border-amber-300 rounded text-slate-900"
                />
                <span className="text-slate-500 font-mono">
                  ({formatCurrency(cronogramaData.anticipoMontoSinIva)})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-700 font-medium">Ret. Fiel Cumplimiento (%):</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={retFielPorc}
                  onChange={(e) => setRetFielPorc(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-14 px-2 py-1 text-right font-mono font-bold bg-white border border-amber-300 rounded text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-700 font-medium">Ret. Laboral (%):</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={retLaboralPorc}
                  onChange={(e) => setRetLaboralPorc(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                  onClick={(e) => e.currentTarget.select()}
                  className="w-14 px-2 py-1 text-right font-mono font-bold bg-white border border-amber-300 rounded text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 text-left min-w-[250px] sticky left-0 bg-slate-900 z-10">
                  CONCEPTO / FLUJO DE DESEMBOLSO
                </th>
                {cronogramaData.months.map((m) => (
                  <th key={m.monthIndex} className="py-3 px-3 text-right min-w-[115px]">
                    <div>{m.label}</div>
                    <div className="text-[9px] font-normal text-slate-300 font-mono mt-0.5">
                      {m.subtitle}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right min-w-[135px] bg-slate-800 text-amber-300">
                  TOTAL OBRA (8M)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {/* Row 1: % Mensual */}
              <tr className="bg-blue-50/40 hover:bg-blue-50/80 transition-colors">
                <td className="py-2.5 px-4 font-sans font-bold text-slate-800 sticky left-0 bg-blue-50/90">
                  1. Avance Físico-Financiero Mensual (%)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2.5 px-3 text-right font-bold text-blue-900">
                    {formatNumber(m.avanceMensualPorc, 2)}%
                  </td>
                ))}
                <td className="py-2.5 px-4 text-right font-extrabold text-blue-950 bg-blue-100/60">
                  100.00%
                </td>
              </tr>

              {/* Row 2: % Acumulado (Curva S) */}
              <tr className="bg-red-50/40 hover:bg-red-50/80 transition-colors">
                <td className="py-2.5 px-4 font-sans font-bold text-red-900 sticky left-0 bg-red-50/90">
                  2. Avance Acumulado Programado - Curva S (%)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2.5 px-3 text-right font-extrabold text-red-700">
                    {formatNumber(m.avanceAcumuladoPorc, 2)}%
                  </td>
                ))}
                <td className="py-2.5 px-4 text-right font-extrabold text-red-900 bg-red-100/60">
                  100.00%
                </td>
              </tr>

              {/* Direct Cost Components */}
              <tr className="hover:bg-slate-50 text-slate-600">
                <td className="py-2 px-4 font-sans font-medium text-slate-600 sticky left-0 bg-white">
                  · Desembolso en Materiales e Insumos ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2 px-3 text-right">
                    {formatCurrency(m.materialesMensual)}
                  </td>
                ))}
                <td className="py-2 px-4 text-right font-semibold bg-slate-50">
                  {formatCurrency(summary.totalMateriales)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 text-slate-600">
                <td className="py-2 px-4 font-sans font-medium text-slate-600 sticky left-0 bg-white">
                  · Desembolso en Equipos y Maquinarias ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2 px-3 text-right">
                    {formatCurrency(m.equiposMensual)}
                  </td>
                ))}
                <td className="py-2 px-4 text-right font-semibold bg-slate-50">
                  {formatCurrency(summary.totalEquipos)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 text-slate-600">
                <td className="py-2 px-4 font-sans font-medium text-slate-600 sticky left-0 bg-white">
                  · Desembolso en Mano de Obra Plena LOTTT + FCAS ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2 px-3 text-right">
                    {formatCurrency(m.manoObraMensual)}
                  </td>
                ))}
                <td className="py-2 px-4 text-right font-semibold bg-slate-50">
                  {formatCurrency(summary.totalManoObraPlena)}
                </td>
              </tr>

              {/* Row 3: Inversión Mensual Sin IVA */}
              <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-4 font-sans font-extrabold text-slate-900 sticky left-0 bg-slate-100">
                  3. INVERSIÓN MENSUAL PROGRAMADA (SIN IVA) ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-3 px-3 text-right text-slate-900">
                    {formatCurrency(m.inversionMensualSinIva)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-extrabold text-blue-900 bg-blue-100/50">
                  {formatCurrency(cronogramaData.totalSinIva)}
                </td>
              </tr>

              {/* Row 4: Inversión Acumulada Sin IVA */}
              <tr className="bg-white font-bold text-blue-900">
                <td className="py-2.5 px-4 font-sans font-bold text-blue-900 sticky left-0 bg-white">
                  4. INVERSIÓN ACUMULADA SIN IVA - CURVA S ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2.5 px-3 text-right">
                    {formatCurrency(m.inversionAcumuladaSinIva)}
                  </td>
                ))}
                <td className="py-2.5 px-4 text-right font-extrabold bg-slate-50">
                  {formatCurrency(cronogramaData.totalSinIva)}
                </td>
              </tr>

              {/* Row 5: IVA Mensual */}
              <tr className="hover:bg-slate-50 text-slate-600">
                <td className="py-2 px-4 font-sans font-semibold text-slate-600 sticky left-0 bg-white">
                  5. Impuesto al Valor Agregado Mensual (IVA {ivaPorc}%) ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2 px-3 text-right">
                    {formatCurrency(m.ivaMensual)}
                  </td>
                ))}
                <td className="py-2 px-4 text-right font-bold bg-slate-50">
                  {formatCurrency(cronogramaData.totalIva)}
                </td>
              </tr>

              {/* Row 6: Desembolso Mensual Con IVA */}
              <tr className="bg-emerald-50/70 font-bold text-emerald-950 border-t border-emerald-200">
                <td className="py-3 px-4 font-sans font-extrabold text-emerald-950 sticky left-0 bg-emerald-50">
                  6. DESEMBOLSO TOTAL MENSUAL (CON IVA) ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-3 px-3 text-right">
                    {formatCurrency(m.desembolsoMensualConIva)}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-extrabold text-emerald-950 bg-emerald-100/80">
                  {formatCurrency(cronogramaData.totalConIva)}
                </td>
              </tr>

              {/* Row 7: Desembolso Acumulado Con IVA */}
              <tr className="bg-emerald-100/40 font-extrabold text-emerald-900">
                <td className="py-2.5 px-4 font-sans font-extrabold text-emerald-900 sticky left-0 bg-emerald-50/90">
                  7. DESEMBOLSO TOTAL ACUMULADO (CON IVA) ($)
                </td>
                {cronogramaData.months.map((m) => (
                  <td key={m.monthIndex} className="py-2.5 px-3 text-right">
                    {formatCurrency(m.desembolsoAcumuladoConIva)}
                  </td>
                ))}
                <td className="py-2.5 px-4 text-right font-extrabold bg-emerald-200/60">
                  {formatCurrency(cronogramaData.totalConIva)}
                </td>
              </tr>

              {/* Optional Contractual Deductions & Net Valuations */}
              {showContractualCashflow && (
                <>
                  <tr className="bg-amber-50/40 text-amber-900">
                    <td className="py-2 px-4 font-sans font-medium sticky left-0 bg-amber-50/90">
                      (-) Amortización de Anticipo ({anticipoPorc}%) ($)
                    </td>
                    {cronogramaData.months.map((m) => (
                      <td key={m.monthIndex} className="py-2 px-3 text-right">
                        -{formatCurrency(m.amortizacionAnticipo)}
                      </td>
                    ))}
                    <td className="py-2 px-4 text-right font-bold bg-amber-100/50">
                      -{formatCurrency(cronogramaData.anticipoMontoSinIva)}
                    </td>
                  </tr>

                  <tr className="bg-amber-50/40 text-amber-900">
                    <td className="py-2 px-4 font-sans font-medium sticky left-0 bg-amber-50/90">
                      (-) Retención Fiel Cumplimiento ({retFielPorc}%) + Laboral ({retLaboralPorc}%) ($)
                    </td>
                    {cronogramaData.months.map((m) => (
                      <td key={m.monthIndex} className="py-2 px-3 text-right">
                        -{formatCurrency(m.retencionFielCumplimiento + m.retencionLaboral)}
                      </td>
                    ))}
                    <td className="py-2 px-4 text-right font-bold bg-amber-100/50">
                      -{formatCurrency(cronogramaData.totalRetencionesSinIva)}
                    </td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-bold">
                    <td className="py-2.5 px-4 font-sans font-bold text-amber-300 sticky left-0 bg-slate-900">
                      = LÍQUIDO NETO A PAGAR EN VALUACIÓN (CON IVA) ($)
                    </td>
                    {cronogramaData.months.map((m) => (
                      <td key={m.monthIndex} className="py-2.5 px-3 text-right text-emerald-300">
                        {formatCurrency(m.pagoNetoValuacionConIva)}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-extrabold text-amber-300 bg-slate-800">
                      {formatCurrency(
                        cronogramaData.months.reduce((a, b) => a + b.pagoNetoValuacionConIva, 0)
                      )}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CRONOGRAMA DE EJECUCIÓN DE OBRA (DIAGRAMA DE GANTT 8 MESES) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Cronograma de Ejecución Físico-Financiero (Diagrama de Gantt a 8 Meses)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualización del programa de obra por capítulos o por las {items.length} partidas individuales a lo largo de los 8 meses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch Chapters vs Partidas */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setGanttMode('capitulos')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  ganttMode === 'capitulos'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Capítulos ({cronogramaData.chapters.length})
              </button>
              <button
                type="button"
                onClick={() => setGanttMode('partidas')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  ganttMode === 'partidas'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Partidas ({items.length})
              </button>
            </div>

            {/* Cell content selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setGanttCellDisplay('ambos')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  ganttCellDisplay === 'ambos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                $ + %
              </button>
              <button
                type="button"
                onClick={() => setGanttCellDisplay('monto')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  ganttCellDisplay === 'monto' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Solo Monto ($)
              </button>
              <button
                type="button"
                onClick={() => setGanttCellDisplay('porcentaje')}
                className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  ganttCellDisplay === 'porcentaje' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Solo %
              </button>
            </div>

            {/* Edit schedule distribution button (in Chapter mode) */}
            {ganttMode === 'capitulos' && (
              <button
                type="button"
                onClick={() => setIsEditingSchedule((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isEditingSchedule
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingSchedule ? 'Finalizar Edición' : 'Editar % por Mes'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar when in Partidas mode */}
        {ganttMode === 'partidas' && (
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPartida}
                onChange={(e) => {
                  setSearchPartida(e.target.value);
                  setPartidaPage(1);
                }}
                placeholder="Buscar partida por número, código o descripción..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedChapterFilter}
                onChange={(e) => {
                  setSelectedChapterFilter(e.target.value);
                  setPartidaPage(1);
                }}
                className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700"
              >
                <option value="Todos">Todos los Capítulos ({items.length} partidas)</option>
                {allChapterNames.map((cap) => (
                  <option key={cap} value={cap}>
                    {cap}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* GANTT TABLE: CHAPTERS MODE */}
        {ganttMode === 'capitulos' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase text-[11px]">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3 text-left min-w-[240px]">CAPÍTULO DE OBRA</th>
                  <th className="py-3 px-2 text-center w-16">PART.</th>
                  <th className="py-3 px-3 text-right w-32">MONTO SIN IVA ($)</th>
                  <th className="py-3 px-2 text-right w-20">PESO (%)</th>
                  {MONTH_LABELS.map((m, idx) => (
                    <th key={m} className="py-2.5 px-2 text-center min-w-[105px] border-l border-slate-200">
                      <div className="text-slate-900">{m}</div>
                      <div className="text-[9px] font-normal text-slate-500 font-mono">
                        {MONTH_SUBTITLES[idx]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cronogramaData.chapters.map((ch, idx) => (
                  <tr key={ch.capitulo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{ch.capitulo}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        Ejecución: Mes {ch.startMonth} al Mes {ch.endMonth}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                      {ch.itemsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(ch.totalSinIva)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-blue-700">
                      {formatNumber(ch.incidenciaPorc, 2)}%
                    </td>

                    {ch.monthlyPorc.map((porc, mIdx) => {
                      const amt = ch.monthlyAmounts[mIdx];
                      const active = porc > 0;
                      return (
                        <td
                          key={mIdx}
                          className={`py-2 px-2 border-l border-slate-200/70 align-middle ${
                            active ? 'bg-sky-50/60' : ''
                          }`}
                        >
                          {isEditingSchedule ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={porc}
                                  onClick={(e) => e.currentTarget.select()}
                                  onChange={(e) =>
                                    handleChapterMonthEdit(ch.capitulo, mIdx, e.target.value)
                                  }
                                  className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                                <span className="text-[10px] font-mono text-slate-500">%</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-600">
                                {formatCurrency(amt)}
                              </span>
                            </div>
                          ) : active ? (
                            <div className="space-y-1">
                              {/* Visual Gantt Progress Bar */}
                              <div className="w-full h-2 bg-sky-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(12, porc))}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between font-mono text-[10px]">
                                {(ganttCellDisplay === 'ambos' || ganttCellDisplay === 'porcentaje') && (
                                  <span className="font-bold text-sky-900">
                                    {formatNumber(porc, 0)}%
                                  </span>
                                )}
                                {(ganttCellDisplay === 'ambos' || ganttCellDisplay === 'monto') && (
                                  <span className="text-slate-700 font-medium ml-auto">
                                    ${formatNumber(amt, 0)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-slate-300 font-mono">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold font-mono text-xs">
                  <td colSpan={3} className="py-3 px-4 text-right font-sans uppercase">
                    TOTAL MENSUAL PROGRAMADO SIN IVA ($):
                  </td>
                  <td className="py-3 px-3 text-right text-amber-300">
                    {formatCurrency(cronogramaData.totalSinIva)}
                  </td>
                  <td className="py-3 px-2 text-right text-emerald-300">100.00%</td>
                  {cronogramaData.months.map((m) => (
                    <td key={m.monthIndex} className="py-3 px-2 text-right border-l border-slate-700">
                      <div className="text-white">{formatCurrency(m.inversionMensualSinIva)}</div>
                      <div className="text-[10px] text-amber-300 mt-0.5">
                        {formatNumber(m.avanceMensualPorc, 2)}% (Acum: {formatNumber(m.avanceAcumuladoPorc, 1)}%)
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* GANTT TABLE: PARTIDAS MODE (364 PARTIDAS) */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold uppercase text-[11px]">
                    <th className="py-3 px-3 text-center w-14">PART.</th>
                    <th className="py-3 px-3 text-left min-w-[260px]">DESCRIPCIÓN DE LA PARTIDA</th>
                    <th className="py-3 px-2 text-center w-14">UND</th>
                    <th className="py-3 px-2 text-right w-20">CANT.</th>
                    <th className="py-3 px-3 text-right w-28">TOTAL ($)</th>
                    {MONTH_LABELS.map((m, idx) => (
                      <th key={m} className="py-2.5 px-2 text-center min-w-[100px] border-l border-slate-200">
                        <div>{m}</div>
                        <div className="text-[9px] font-normal text-slate-500 font-mono">
                          {MONTH_SUBTITLES[idx]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedPartidas.map((row) => (
                    <tr key={row.item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div className="font-bold text-slate-900">{row.item.id}</div>
                        <div className="text-[10px] text-slate-400">
                          Cód. {String(row.item.id).padStart(3, '0')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-2">
                          {row.item.descripcion}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{row.item.capitulo}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-600">
                        {row.item.unidad}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {formatNumber(row.item.cantidad, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(row.totalSinIva)}
                      </td>
                      {row.monthlyPorc.map((porc, mIdx) => {
                        const amt = row.monthlyAmounts[mIdx];
                        const active = porc > 0;
                        return (
                          <td
                            key={mIdx}
                            className={`py-2 px-2 border-l border-slate-200/70 ${
                              active ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            {active ? (
                              <div className="space-y-1">
                                <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(15, porc))}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between font-mono text-[10px]">
                                  {(ganttCellDisplay === 'ambos' ||
                                    ganttCellDisplay === 'porcentaje') && (
                                    <span className="font-bold text-emerald-900">
                                      {formatNumber(porc, 0)}%
                                    </span>
                                  )}
                                  {(ganttCellDisplay === 'ambos' || ganttCellDisplay === 'monto') && (
                                    <span className="text-slate-700 ml-auto">
                                      {formatCurrency(amt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-slate-300 font-mono">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar for Partidas Gantt */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600">
                Mostrando página <strong>{partidaPage}</strong> de <strong>{totalPartidaPages}</strong> ({filteredPartidas.length} partidas)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={partidaPage === 1}
                  onClick={() => setPartidaPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={partidaPage === totalPartidaPages}
                  onClick={() => setPartidaPage((p) => Math.min(totalPartidaPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium disabled:opacity-40 cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
