import { PartidaItem, CalculatedApu, FinancialSummary } from '../types/costTypes';
import { PROJECT_INFO } from '../data/projectInfo';

/**
 * Calculates the Unit Price Analysis (APU) for a given item using:
 * - Material unit cost: Sum(cant * costo * (1 + desp/100))
 * - Equipment unit cost: Sum(cant * costo * depAlq) / Rendimiento
 * - Direct Labor: Sum(cant * salario)
 * - Social Benefits / FCAS (LOTTT): Direct Labor * (fcasPorc / 100)  [Default: 1200%]
 * - Total Labor: Direct Labor + FCAS
 * - Labor Unit Cost: Total Labor / Rendimiento
 * - Direct Cost: Unit Material + Unit Equipment + Unit Labor
 * - Administration: Direct Cost * (adminPorc / 100) [Default: 12.5%]
 * - SubTotal: Direct Cost + Administration
 * - Profit / Utility: SubTotal * (utilidadPorc / 100) [Default: 17.0%]
 * - Unit Price: SubTotal + Profit
 */
export function calculateItemApu(
  item: PartidaItem,
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje
): CalculatedApu {
  const rend = item.apu.rendimiento > 0 ? item.apu.rendimiento : 1;

  // 1. Materiales
  let totalMateriales = 0;
  for (const mat of item.apu.materiales) {
    const wasteFactor = 1 + (mat.desperdicioPorc || 0) / 100;
    const lineTotal = mat.cantidad * mat.costoUnitario * wasteFactor;
    totalMateriales += lineTotal;
  }
  const unitarioMateriales = totalMateriales; // Materiales are already per unit of the item

  // 2. Equipos
  let totalEquipos = 0;
  for (const eq of item.apu.equipos) {
    const lineTotal = eq.cantidad * eq.costo * eq.depreciacionOAlquiler;
    totalEquipos += lineTotal;
  }
  const unitarioEquipos = totalEquipos / rend;

  // 3. Mano de Obra Directa
  let manoObraDirectaTotal = 0;
  for (const mo of item.apu.manoDeObra) {
    const lineTotal = mo.cantidad * mo.salarioDiario;
    manoObraDirectaTotal += lineTotal;
  }
  const fcasMonto = manoObraDirectaTotal * (fcasPorc / 100);
  const totalManoObra = manoObraDirectaTotal + fcasMonto;
  const unitarioManoObra = totalManoObra / rend;

  // Costo Directo
  const costoDirectoUnitario = unitarioMateriales + unitarioEquipos + unitarioManoObra;

  // Administración y Gastos Generales (12.50%)
  const adminMonto = costoDirectoUnitario * (adminPorc / 100);
  const subTotalUnitario = costoDirectoUnitario + adminMonto;

  // Utilidad e Imprevistos (17.00%)
  const utilidadMonto = subTotalUnitario * (utilidadPorc / 100);

  // Precio Unitario Final
  const precioUnitario = subTotalUnitario + utilidadMonto;
  const totalPartida = precioUnitario * item.cantidad;

  return {
    totalMateriales,
    unitarioMateriales,
    totalEquipos,
    unitarioEquipos,
    manoObraDirectaTotal,
    fcasMonto,
    fcasPorc,
    totalManoObra,
    unitarioManoObra,
    costoDirectoUnitario,
    adminMonto,
    adminPorc,
    subTotalUnitario,
    utilidadMonto,
    utilidadPorc,
    precioUnitario,
    totalPartida,
  };
}

/**
 * Computes global financial summary across all items in the budget
 */
export function calculateProjectFinancialSummary(
  items: PartidaItem[],
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje,
  ivaPorc = PROJECT_INFO.ivaPorcentaje
): FinancialSummary {
  let totalMateriales = 0;
  let totalEquipos = 0;
  let totalManoObraDirecta = 0;
  let totalFcas = 0;
  let totalManoObraPlena = 0;
  let totalCostoDirecto = 0;
  let totalGastosAdmin = 0;
  let totalUtilidad = 0;
  let subTotalGeneral = 0;

  for (const item of items) {
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const cant = item.cantidad;

    const itemMat = calc.unitarioMateriales * cant;
    const itemEq = calc.unitarioEquipos * cant;
    const itemMoDirect = (calc.manoObraDirectaTotal / (item.apu.rendimiento || 1)) * cant;
    const itemFcas = (calc.fcasMonto / (item.apu.rendimiento || 1)) * cant;
    const itemMoFull = calc.unitarioManoObra * cant;
    const itemCD = calc.costoDirectoUnitario * cant;
    const itemAdmin = calc.adminMonto * cant;
    const itemUtil = calc.utilidadMonto * cant;
    const itemSub = calc.totalPartida;

    totalMateriales += itemMat;
    totalEquipos += itemEq;
    totalManoObraDirecta += itemMoDirect;
    totalFcas += itemFcas;
    totalManoObraPlena += itemMoFull;
    totalCostoDirecto += itemCD;
    totalGastosAdmin += itemAdmin;
    totalUtilidad += itemUtil;
    subTotalGeneral += itemSub;
  }

  const totalIva = subTotalGeneral * (ivaPorc / 100);
  const granTotalGeneral = subTotalGeneral + totalIva;

  return {
    totalCostoDirecto,
    totalMateriales,
    totalEquipos,
    totalManoObraDirecta,
    totalFcas,
    totalManoObraPlena,
    totalGastosAdmin,
    totalAdministracion: totalGastosAdmin,
    totalUtilidad,
    subTotalGeneral,
    totalIva,
    granTotalGeneral,
  };
}

// Alias for convenience
export const calculateFinancialSummary = calculateProjectFinancialSummary;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
