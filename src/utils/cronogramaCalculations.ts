import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { calculateItemApu } from './apuCalculations';

export const TOTAL_MONTHS = 8;
export const MONTH_LABELS = [
  'Mes 1',
  'Mes 2',
  'Mes 3',
  'Mes 4',
  'Mes 5',
  'Mes 6',
  'Mes 7',
  'Mes 8',
];

export const MONTH_SUBTITLES = [
  'Días 1 - 30',
  'Días 31 - 60',
  'Días 61 - 90',
  'Días 91 - 120',
  'Días 121 - 150',
  'Días 151 - 180',
  'Días 181 - 210',
  'Días 211 - 240',
];

/**
 * Distribución porcentual por defecto (suma 100%) en 8 meses para cada capítulo de obra,
 * siguiendo la secuencia constructiva lógica de ingeniería PDVSA (Curva S gaussiana).
 */
export const DEFAULT_CHAPTER_DISTRIBUTIONS: Record<string, number[]> = {
  'Obras Preliminares y Módulos de Campo': [25, 15, 12, 10, 10, 10, 10, 8],
  'Ingeniería y Levantamiento Topográfico': [60, 40, 0, 0, 0, 0, 0, 0],
  'Movimiento de Tierra y Deforestación': [40, 45, 15, 0, 0, 0, 0, 0],
  'Demoliciones y Remociones': [45, 40, 15, 0, 0, 0, 0, 0],
  'Tanquillas e Hidráulica de Sitio': [0, 30, 40, 30, 0, 0, 0, 0],
  'Control de Aguas de Lluvia (Canales Terrestres)': [0, 25, 45, 30, 0, 0, 0, 0],
  'Obras Civiles, Estructuras y Pozo Profundo': [10, 25, 30, 20, 15, 0, 0, 0],
  'Instalaciones Hidrosanitarias y Redes': [0, 15, 25, 30, 20, 10, 0, 0],
  'Mantenimiento Planta de Tratamiento (PTAS)': [0, 0, 25, 40, 35, 0, 0, 0],
  'Acondicionamiento Menor de Tuberías': [0, 0, 30, 40, 30, 0, 0, 0],
  'Obras Eléctricas, Media Tensión y Banco de Transformadores': [0, 10, 20, 25, 25, 15, 5, 0],
  'Instalaciones Eléctricas, Voz, Data e Incendio': [0, 0, 15, 25, 25, 20, 15, 0],
  'Techos, Impermeabilización y Tabiquería Drywall': [0, 0, 10, 25, 35, 20, 10, 0],
  'Pisos, Revestimientos y Acabados': [0, 0, 0, 20, 30, 30, 20, 0],
  'Puertas, Ventanas y Cerrajería': [0, 0, 0, 10, 25, 35, 30, 0],
  'Tanques de Acopio de Crudo (4 UND)': [0, 0, 15, 25, 30, 20, 10, 0],
  'Tanques de Acopio de Gasoil': [0, 0, 10, 25, 30, 25, 10, 0],
  'Tanques de Crudo y Gasoil (Común)': [0, 0, 0, 20, 30, 30, 20, 0],
  'Construcción de Caminerías en Concreto': [0, 0, 0, 15, 35, 35, 15, 0],
  'Suministro de Mobiliario y Equipos': [0, 0, 0, 0, 20, 40, 30, 10],
  'Instalación y Armado de Mobiliario y Equipos': [0, 0, 0, 0, 0, 25, 45, 30],
  'Pintura Especial y Restauración': [0, 0, 0, 0, 0, 25, 45, 30],
  'Control de Plagas y Fauna Nociva': [15, 0, 0, 20, 0, 25, 0, 40],
  'Paisajismo, Áreas Verdes y Bote': [0, 0, 0, 0, 0, 0, 45, 55],
  'Demarcación y Pintura de Tráfico': [0, 0, 0, 0, 0, 0, 35, 65],
};

export interface ChapterScheduleRow {
  capitulo: string;
  itemsCount: number;
  totalSinIva: number;
  totalMateriales: number;
  totalEquipos: number;
  totalManoObra: number;
  incidenciaPorc: number; // % of total budget
  monthlyPorc: number[]; // length 8, sums to 100%
  monthlyAmounts: number[]; // length 8, sums to totalSinIva
  monthlyWeightedPorc: number[]; // length 8, sums to incidenciaPorc
  startMonth: number; // 1..8
  endMonth: number; // 1..8
}

export interface PartidaScheduleRow {
  item: PartidaItem;
  precioUnitario: number;
  totalSinIva: number;
  incidenciaPorc: number;
  monthlyPorc: number[]; // length 8, sums to 100%
  monthlyAmounts: number[]; // length 8, sums to totalSinIva
  startMonth: number;
  endMonth: number;
}

export interface MonthlyDisbursementPoint {
  monthIndex: number; // 0..7
  monthNumber: number; // 1..8
  label: string; // 'Mes 1'
  subtitle: string; // 'Días 1 - 30'
  // Avance físico-financiero (%)
  avanceMensualPorc: number;
  avanceAcumuladoPorc: number;
  // Desglose Costo Directo mensual ($)
  materialesMensual: number;
  equiposMensual: number;
  manoObraMensual: number;
  costoDirectoMensual: number;
  // Inversión Sin IVA ($)
  inversionMensualSinIva: number;
  inversionAcumuladaSinIva: number;
  // IVA ($)
  ivaMensual: number;
  ivaAcumulado: number;
  // Desembolso Total Con IVA ($)
  desembolsoMensualConIva: number;
  desembolsoAcumuladoConIva: number;
  // Flujo de Caja con Anticipo y Retenciones
  amortizacionAnticipo: number;
  retencionFielCumplimiento: number;
  retencionLaboral: number;
  pagoNetoValuacionSinIva: number;
  pagoNetoValuacionConIva: number;
}

export interface CronogramaSummaryData {
  chapters: ChapterScheduleRow[];
  partidas: PartidaScheduleRow[];
  months: MonthlyDisbursementPoint[];
  totalSinIva: number;
  totalIva: number;
  totalConIva: number;
  peakMonth: MonthlyDisbursementPoint;
  averageMonthlySinIva: number;
  averageMonthlyConIva: number;
  anticipoMontoSinIva: number;
  anticipoMontoConIva: number;
  totalRetencionesSinIva: number;
}

/**
 * Returns a normalized 8-month percentage array (sums to 100) for a given chapter
 */
export function getChapterDistribution(
  capitulo: string,
  customMap?: Record<string, number[]>
): number[] {
  const raw =
    customMap?.[capitulo] ||
    DEFAULT_CHAPTER_DISTRIBUTIONS[capitulo] || [10, 12, 15, 16, 16, 13, 10, 8];

  const clean = Array.from({ length: TOTAL_MONTHS }, (_, i) => Math.max(0, Number(raw[i]) || 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return [12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5];
  }
  // Normalize so sum is exactly 100
  const normalized = clean.map((v) => Number(((v / sum) * 100).toFixed(2)));
  const diff = Number((100 - normalized.reduce((a, b) => a + b, 0)).toFixed(2));
  // Add rounding difference to the largest non-zero month
  let maxIdx = 0;
  for (let i = 1; i < TOTAL_MONTHS; i++) {
    if (normalized[i] > normalized[maxIdx]) maxIdx = i;
  }
  normalized[maxIdx] = Number((normalized[maxIdx] + diff).toFixed(2));
  return normalized;
}

/**
 * Generates preset distributions across all chapters
 */
export function buildPresetDistributions(
  chapters: string[],
  preset: 'pdvsa_scurve' | 'lineal' | 'temprana' | 'media'
): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  chapters.forEach((cap, idx) => {
    if (preset === 'pdvsa_scurve') {
      result[cap] = [...(DEFAULT_CHAPTER_DISTRIBUTIONS[cap] || [8, 12, 16, 20, 18, 13, 8, 5])];
    } else if (preset === 'lineal') {
      result[cap] = [12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5];
    } else if (preset === 'temprana') {
      // Front-loaded schedule
      const base = DEFAULT_CHAPTER_DISTRIBUTIONS[cap];
      if (base) {
        const shifted = [
          base[0] * 1.35,
          base[1] * 1.3,
          base[2] * 1.2,
          base[3] * 1.1,
          base[4] * 0.9,
          base[5] * 0.8,
          base[6] * 0.7,
          base[7] * 0.6,
        ];
        result[cap] = getChapterDistribution(cap, { [cap]: shifted });
      } else {
        result[cap] = [18, 18, 16, 14, 12, 10, 7, 5];
      }
    } else if (preset === 'media') {
      // Bell-curve concentrated in months 3-6
      const phase = idx % 3;
      if (phase === 0) result[cap] = [15, 25, 30, 20, 10, 0, 0, 0];
      else if (phase === 1) result[cap] = [0, 10, 20, 30, 25, 15, 0, 0];
      else result[cap] = [0, 0, 0, 15, 25, 30, 20, 10];
    }
  });
  return result;
}

/**
 * Calculates full 8-month schedule, disbursement plan and S-curve
 */
export function calculateCronogramaData(
  items: PartidaItem[],
  summary: FinancialSummary,
  fcasPorc: number,
  adminPorc: number,
  utilidadPorc: number,
  ivaPorc: number,
  customChapterDistributions?: Record<string, number[]>,
  anticipoPorc = 20.0,
  retencionFielCumplimientoPorc = 10.0,
  retencionLaboralPorc = 5.0
): CronogramaSummaryData {
  const totalSinIva = summary.subTotalGeneral;
  const totalIva = summary.totalIva;
  const totalConIva = summary.granTotalGeneral;

  // Group items by chapter preserving appearance order
  const chapterMap = new Map<
    string,
    {
      itemsCount: number;
      totalSinIva: number;
      totalMateriales: number;
      totalEquipos: number;
      totalManoObra: number;
    }
  >();

  const partidasRows: PartidaScheduleRow[] = [];

  // Indirect factor to convert direct cost components to subtotal contribution
  items.forEach((item) => {
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const cap = item.capitulo || 'General';
    const current = chapterMap.get(cap) || {
      itemsCount: 0,
      totalSinIva: 0,
      totalMateriales: 0,
      totalEquipos: 0,
      totalManoObra: 0,
    };

    current.itemsCount += 1;
    current.totalSinIva += calc.totalPartida;
    current.totalMateriales += calc.unitarioMateriales * item.cantidad;
    current.totalEquipos += calc.unitarioEquipos * item.cantidad;
    current.totalManoObra += calc.unitarioManoObra * item.cantidad;
    chapterMap.set(cap, current);

    const dist = getChapterDistribution(cap, customChapterDistributions);
    const monthlyAmounts = dist.map((p) => (calc.totalPartida * p) / 100);
    const activeMonths = dist
      .map((p, idx) => (p > 0 ? idx + 1 : -1))
      .filter((m) => m !== -1);

    partidasRows.push({
      item,
      precioUnitario: calc.precioUnitario,
      totalSinIva: calc.totalPartida,
      incidenciaPorc: totalSinIva > 0 ? (calc.totalPartida / totalSinIva) * 100 : 0,
      monthlyPorc: dist,
      monthlyAmounts,
      startMonth: activeMonths.length > 0 ? Math.min(...activeMonths) : 1,
      endMonth: activeMonths.length > 0 ? Math.max(...activeMonths) : 8,
    });
  });

  const chaptersRows: ChapterScheduleRow[] = [];

  // Monthly accumulators
  const monthSinIva = Array(TOTAL_MONTHS).fill(0);
  const monthMat = Array(TOTAL_MONTHS).fill(0);
  const monthEq = Array(TOTAL_MONTHS).fill(0);
  const monthMo = Array(TOTAL_MONTHS).fill(0);

  chapterMap.forEach((data, capitulo) => {
    const dist = getChapterDistribution(capitulo, customChapterDistributions);
    const incidenciaPorc = totalSinIva > 0 ? (data.totalSinIva / totalSinIva) * 100 : 0;
    const monthlyAmounts = dist.map((p) => (data.totalSinIva * p) / 100);
    const monthlyWeightedPorc = dist.map((p) => (incidenciaPorc * p) / 100);

    const activeMonths = dist
      .map((p, idx) => (p > 0 ? idx + 1 : -1))
      .filter((m) => m !== -1);

    chaptersRows.push({
      capitulo,
      itemsCount: data.itemsCount,
      totalSinIva: data.totalSinIva,
      totalMateriales: data.totalMateriales,
      totalEquipos: data.totalEquipos,
      totalManoObra: data.totalManoObra,
      incidenciaPorc,
      monthlyPorc: dist,
      monthlyAmounts,
      monthlyWeightedPorc,
      startMonth: activeMonths.length > 0 ? Math.min(...activeMonths) : 1,
      endMonth: activeMonths.length > 0 ? Math.max(...activeMonths) : 8,
    });

    for (let m = 0; m < TOTAL_MONTHS; m++) {
      const ratio = dist[m] / 100;
      monthSinIva[m] += data.totalSinIva * ratio;
      monthMat[m] += data.totalMateriales * ratio;
      monthEq[m] += data.totalEquipos * ratio;
      monthMo[m] += data.totalManoObra * ratio;
    }
  });

  // Build 8 monthly disbursement points with exact cumulative reconciliation
  const months: MonthlyDisbursementPoint[] = [];
  let acumSinIva = 0;
  let acumIva = 0;
  let acumConIva = 0;
  let acumPorc = 0;

  for (let m = 0; m < TOTAL_MONTHS; m++) {
    const isLast = m === TOTAL_MONTHS - 1;
    const invSinIva = isLast
      ? Math.max(0, totalSinIva - acumSinIva)
      : monthSinIva[m];
    acumSinIva += invSinIva;

    const avanceMensualPorc =
      totalSinIva > 0
        ? isLast
          ? Math.max(0, 100 - acumPorc)
          : (invSinIva / totalSinIva) * 100
        : 100 / TOTAL_MONTHS;
    acumPorc += avanceMensualPorc;

    const ivaMensual = isLast
      ? Math.max(0, totalIva - acumIva)
      : invSinIva * (ivaPorc / 100);
    acumIva += ivaMensual;

    const desembolsoMensualConIva = isLast
      ? Math.max(0, totalConIva - acumConIva)
      : invSinIva + ivaMensual;
    acumConIva += desembolsoMensualConIva;

    const amortizacionAnticipo = invSinIva * (anticipoPorc / 100);
    const retencionFielCumplimiento = invSinIva * (retencionFielCumplimientoPorc / 100);
    const retencionLaboral = invSinIva * (retencionLaboralPorc / 100);

    const pagoNetoValuacionSinIva = Math.max(
      0,
      invSinIva - amortizacionAnticipo - retencionFielCumplimiento - retencionLaboral
    );
    const pagoNetoValuacionConIva = pagoNetoValuacionSinIva + ivaMensual;

    months.push({
      monthIndex: m,
      monthNumber: m + 1,
      label: MONTH_LABELS[m],
      subtitle: MONTH_SUBTITLES[m],
      avanceMensualPorc,
      avanceAcumuladoPorc: Math.min(100, acumPorc),
      materialesMensual: monthMat[m],
      equiposMensual: monthEq[m],
      manoObraMensual: monthMo[m],
      costoDirectoMensual: monthMat[m] + monthEq[m] + monthMo[m],
      inversionMensualSinIva: invSinIva,
      inversionAcumuladaSinIva: acumSinIva,
      ivaMensual,
      ivaAcumulado: acumIva,
      desembolsoMensualConIva,
      desembolsoAcumuladoConIva: acumConIva,
      amortizacionAnticipo,
      retencionFielCumplimiento,
      retencionLaboral,
      pagoNetoValuacionSinIva,
      pagoNetoValuacionConIva,
    });
  }

  const peakMonth = months.reduce(
    (max, cur) => (cur.inversionMensualSinIva > max.inversionMensualSinIva ? cur : max),
    months[0]
  );

  const anticipoMontoSinIva = totalSinIva * (anticipoPorc / 100);
  const anticipoMontoConIva = totalConIva * (anticipoPorc / 100);
  const totalRetencionesSinIva =
    totalSinIva * ((retencionFielCumplimientoPorc + retencionLaboralPorc) / 100);

  return {
    chapters: chaptersRows,
    partidas: partidasRows,
    months,
    totalSinIva,
    totalIva,
    totalConIva,
    peakMonth,
    averageMonthlySinIva: totalSinIva / TOTAL_MONTHS,
    averageMonthlyConIva: totalConIva / TOTAL_MONTHS,
    anticipoMontoSinIva,
    anticipoMontoConIva,
    totalRetencionesSinIva,
  };
}
