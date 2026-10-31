import * as XLSX from 'xlsx';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { PROJECT_INFO } from '../data/projectInfo';
import { calculateItemApu } from './apuCalculations';
import { exportEspecificacionesAnexo3raToExcel } from './excelAnexo3ra';

/**
 * 1. EXPORTAR PRESUPUESTO GENERAL A EXCEL (.xlsx)
 * Con pestaña 'DATOS' editable y fórmulas dinámicas vinculadas.
 */
export function exportPresupuestoToExcel(
  items: PartidaItem[],
  summary: FinancialSummary,
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje,
  ivaPorc = PROJECT_INFO.ivaPorcentaje
) {
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: DATOS (Parámetros editables)
  // ==========================================
  const datosRows: any[] = [
    ["PARÁMETROS FINANCIEROS Y LABORALES DEL PROYECTO (PDVSA)"],
    ["INSTRUCCIÓN: Modifique los valores numéricos en la columna B para simular el presupuesto dinámicamente en tiempo real."],
    [],
    ["PARÁMETRO", "VALOR NUMÉRICO", "UNIDAD", "BASE LEGAL / DESCRIPCIÓN"],
    ["Factor de Costos Asociados al Salario (FCAS)", fcasPorc, "%", "LOTTT Art. 104-142 y Convención Colectiva Petrolera (CCP)"],
    ["Porcentaje de Gastos Administrativos", adminPorc, "%", "Gastos de oficina técnica, supervisión y logística en campo"],
    ["Porcentaje de Utilidad e Imprevistos", utilidadPorc, "%", "Margen del contratista y contingencias de obra"],
    ["Porcentaje de Impuesto al Valor Agregado (IVA)", ivaPorc, "%", "Alícuota tributaria nacional vigente SENIAT"],
    [],
    ["SOLPED / N° CONTROL:", PROJECT_INFO.solped, "FECHA:", PROJECT_INFO.fecha],
    ["OBRA:", PROJECT_INFO.descripcionLarga],
  ];

  const wsDatos = XLSX.utils.aoa_to_sheet(datosRows);
  wsDatos['!cols'] = [
    { wch: 45 },
    { wch: 18 },
    { wch: 12 },
    { wch: 65 },
  ];

  // ==========================================
  // SHEET 2: Presupuesto General (con Fórmulas)
  // ==========================================
  const rows: any[] = [];

  // Header metadata (Rows 1 to 5)
  rows.push(["PETRÓLEOS DE VENEZUELA, S.A. (PDVSA) - DIVISIÓN BARINAS"]);
  rows.push([PROJECT_INFO.descripcionLarga]);
  rows.push(["SOLPED / N° DE CONTROL:", PROJECT_INFO.solped, "FECHA:", PROJECT_INFO.fecha, "LAPSO:", `${PROJECT_INFO.lapsoDias} DÍAS`]);
  rows.push(["MARCO LABORAL Y FINANCIERO:", `LOTTT & CCP | FCAS: ${fcasPorc}% | GASTOS ADMIN: ${adminPorc}% | UTILIDAD: ${utilidadPorc}% | IVA: ${ivaPorc}%`]);
  rows.push(["NOTA DE SIMULACIÓN:", "Este libro contiene fórmulas activas vinculadas a la pestaña 'DATOS'. Al cambiar valores en 'DATOS' o en 'CANTIDAD', el presupuesto se recalcula en tiempo real."]);
  rows.push([]); // blank (row 6)

  // Table header (Row 7)
  rows.push([
    "PARTIDA N°",
    "CÓDIGO",
    "CAPÍTULO / ÁREA",
    "DESCRIPCIÓN DE LA PARTIDA",
    "UND",
    "CANTIDAD",
    "RENDIMIENTO",
    "UNIT. MATERIALES ($)",
    "UNIT. EQUIPOS ($)",
    "UNIT. MANO OBRA DIRECTA ($)",
    "FCAS ($)",
    "UNIT. M.O. PLENA ($)",
    "COSTO DIRECTO UNIT. ($)",
    "ADMIN. ($)",
    "SUB-TOTAL ($)",
    "UTILIDAD ($)",
    "PRECIO UNITARIO ($)",
    "TOTAL PARTIDA ($)",
  ]);

  const headerRowIndex = 7; // 1-indexed: 7, 0-indexed: 6
  const firstItemRow = 8;   // 1-indexed: 8
  const lastItemRow = firstItemRow + items.length - 1;

  // Add initial data rows
  items.forEach((item) => {
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const rend = item.apu.rendimiento || 1;
    const moDirectUnit = calc.manoObraDirectaTotal / rend;
    const fcasUnit = calc.fcasMonto / rend;

    rows.push([
      item.id,
      item.codigoCovenin,
      item.capitulo,
      item.descripcion,
      item.unidad,
      Number(item.cantidad.toFixed(2)),
      item.apu.rendimiento,
      Number(calc.unitarioMateriales.toFixed(2)),
      Number(calc.unitarioEquipos.toFixed(2)),
      Number(moDirectUnit.toFixed(2)),
      Number(fcasUnit.toFixed(2)),
      Number(calc.unitarioManoObra.toFixed(2)),
      Number(calc.costoDirectoUnitario.toFixed(2)),
      Number(calc.adminMonto.toFixed(2)),
      Number(calc.subTotalUnitario.toFixed(2)),
      Number(calc.utilidadMonto.toFixed(2)),
      Number(calc.precioUnitario.toFixed(2)),
      Number(calc.totalPartida.toFixed(2)),
    ]);
  });

  // Footer Totals rows
  const subtotalRow = lastItemRow + 2;
  const ivaRow = lastItemRow + 3;
  const grandTotalRow = lastItemRow + 4;

  rows.push([]); // blank row (lastItemRow + 1)
  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "SUB-TOTAL GENERAL ($):", "", "", "", "", Number(summary.subTotalGeneral.toFixed(2))]);
  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", `I.V.A. (${ivaPorc}%):`, "", "", "", "", Number(summary.totalIva.toFixed(2))]);
  rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "GRAN TOTAL PRESUPUESTO ($):", "", "", "", "", Number(summary.granTotalGeneral.toFixed(2))]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Inject live Excel formulas for each item row
  // K{r}: FCAS = J{r}*(DATOS!$B$5/100)
  // L{r}: M.O. Plena = J{r}+K{r}
  // M{r}: Costo Directo Unit = H{r}+I{r}+L{r}
  // N{r}: Admin = M{r}*(DATOS!$B$6/100)
  // O{r}: Sub-Total = M{r}+N{r}
  // P{r}: Utilidad = O{r}*(DATOS!$B$7/100)
  // Q{r}: Precio Unitario = O{r}+P{r}
  // R{r}: Total Partida = F{r}*Q{r}
  for (let idx = 0; idx < items.length; idx++) {
    const r = firstItemRow + idx;
    const item = items[idx];
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const rend = item.apu.rendimiento || 1;
    const fcasVal = calc.fcasMonto / rend;
    const codeStr = String(item.id).padStart(3, '0');

    // Ensure code preserves leading zeros as text
    ws[`B${r}`] = { t: 's', v: codeStr, z: '@' };
    ws[`K${r}`] = { t: 'n', v: Number(fcasVal.toFixed(2)), f: `J${r}*(DATOS!$B$5/100)` };
    ws[`L${r}`] = { t: 'n', v: Number(calc.unitarioManoObra.toFixed(2)), f: `J${r}+K${r}` };
    ws[`M${r}`] = { t: 'n', v: Number(calc.costoDirectoUnitario.toFixed(2)), f: `H${r}+I${r}+L${r}` };
    ws[`N${r}`] = { t: 'n', v: Number(calc.adminMonto.toFixed(2)), f: `M${r}*(DATOS!$B$6/100)` };
    ws[`O${r}`] = { t: 'n', v: Number(calc.subTotalUnitario.toFixed(2)), f: `M${r}+N${r}` };
    ws[`P${r}`] = { t: 'n', v: Number(calc.utilidadMonto.toFixed(2)), f: `O${r}*(DATOS!$B$7/100)` };
    ws[`Q${r}`] = { t: 'n', v: Number(calc.precioUnitario.toFixed(2)), f: `O${r}+P${r}` };
    ws[`R${r}`] = { t: 'n', v: Number(calc.totalPartida.toFixed(2)), f: `F${r}*Q${r}` };
  }


  // Footer formulas
  ws[`R${subtotalRow}`] = {
    t: 'n',
    v: Number(summary.subTotalGeneral.toFixed(2)),
    f: `SUM(R${firstItemRow}:R${lastItemRow})`,
  };
  ws[`R${ivaRow}`] = {
    t: 'n',
    v: Number(summary.totalIva.toFixed(2)),
    f: `R${subtotalRow}*(DATOS!$B$8/100)`,
  };
  ws[`R${grandTotalRow}`] = {
    t: 'n',
    v: Number(summary.granTotalGeneral.toFixed(2)),
    f: `R${subtotalRow}+R${ivaRow}`,
  };

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // Partida
    { wch: 15 }, // Código
    { wch: 32 }, // Capitulo
    { wch: 60 }, // Descripcion
    { wch: 8 },  // Und
    { wch: 14 }, // Cantidad
    { wch: 12 }, // Rend
    { wch: 16 }, // Mat
    { wch: 16 }, // Eq
    { wch: 18 }, // MO Dir
    { wch: 16 }, // FCAS
    { wch: 18 }, // MO Plena
    { wch: 18 }, // CD
    { wch: 16 }, // Admin
    { wch: 16 }, // Subtotal
    { wch: 16 }, // Util
    { wch: 18 }, // PU
    { wch: 20 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, wsDatos, "DATOS");
  XLSX.utils.book_append_sheet(wb, ws, "Presupuesto General");
  XLSX.writeFile(wb, `Presupuesto_General_PDVSA_${PROJECT_INFO.solped}.xlsx`);
}

/**
 * 2. EXPORTAR ESPECIFICACIONES TÉCNICAS A EXCEL (.xlsx)
 * DEDICATED, EXCLUSIVE BUTTON FUNCTION
 * Adopta estrictamente la maqueta visual oficial ANEXO 3RA:
 * - 78 filas por partida paginada
 * - Encabezado PDVSA DEP Los Llanos
 * - Cajuela de control con fondo dorado/naranja vinculada a COMPUTOS
 * - 15 numerales estructurados y delimitados
 * - Bloque de firmas oficiales (Realizado por, Juana Sánchez, Ing. Elismar Terán)
 * - Bordes exteriores azules y fórmulas dinámicas hacia la pestaña COMPUTOS
 */
export async function exportEspecificacionesToExcel(items: PartidaItem[]) {
  await exportEspecificacionesAnexo3raToExcel(items, 'ESPECIFICACIONES TECNICAS FINALES IA.xlsx');
}

/**
 * 3. EXPORTAR LIBRO DE APU DETALLADO A EXCEL (.xlsx)
 * Con pestaña 'DATOS' para recálculo de indirectos y FCAS.
 */
export function exportApuBookToExcel(
  items: PartidaItem[],
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: DATOS
  const datosRows: any[] = [
    ["PARÁMETROS FINANCIEROS Y LABORALES DEL PROYECTO (PDVSA)"],
    ["INSTRUCCIÓN: Modifique los valores para simular costos de APU en tiempo real."],
    [],
    ["PARÁMETRO", "VALOR NUMÉRICO", "UNIDAD", "BASE LEGAL / DESCRIPCIÓN"],
    ["Factor de Costos Asociados al Salario (FCAS)", fcasPorc, "%", "LOTTT & Tabulador Petrolero CCP"],
    ["Porcentaje de Gastos Administrativos", adminPorc, "%", "Oficina técnica y supervisión"],
    ["Porcentaje de Utilidad e Imprevistos", utilidadPorc, "%", "Margen del contratista e imprevistos"],
  ];
  const wsDatos = XLSX.utils.aoa_to_sheet(datosRows);
  wsDatos['!cols'] = [{ wch: 45 }, { wch: 18 }, { wch: 12 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsDatos, "DATOS");

  // Sheet 2: Resumen de Precios Unitarios
  const sumRows: any[] = [];
  sumRows.push(["LIBRO DE ANÁLISIS DE PRECIOS UNITARIOS (APU) - PDVSA DIVISIÓN BARINAS"]);
  sumRows.push([`PROYECTO: ${PROJECT_INFO.descripcionLarga}`]);
  sumRows.push([`ESTRUCTURA LEGAL: LOTT & CCP | FCAS: ${fcasPorc}% | ADMIN: ${adminPorc}% | UTILIDAD: ${utilidadPorc}%`]);
  sumRows.push([]);
  sumRows.push([
    "PARTIDA N°",
    "CÓDIGO",
    "DESCRIPCIÓN",
    "UND",
    "RENDIMIENTO",
    "UNIT. MATERIAL ($)",
    "UNIT. EQUIPO ($)",
    "UNIT. M.O. PLENA (LOTTT+FCAS) ($)",
    "COSTO DIRECTO UNIT. ($)",
    "PRECIO UNITARIO ($)",
  ]);

  items.forEach((item) => {
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const codeStr = String(item.id).padStart(3, '0');
    sumRows.push([
      item.id,
      codeStr,
      item.descripcion,
      item.unidad,
      item.apu.rendimiento,
      Number(calc.unitarioMateriales.toFixed(2)),
      Number(calc.unitarioEquipos.toFixed(2)),
      Number(calc.unitarioManoObra.toFixed(2)),
      Number(calc.costoDirectoUnitario.toFixed(2)),
      Number(calc.precioUnitario.toFixed(2)),
    ]);
  });

  const wsSum = XLSX.utils.aoa_to_sheet(sumRows);
  wsSum['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 60 }, { wch: 8 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSum, "Resumen APU");

  // Sheet 3: Desglose por Partidas Detallado
  const detRows: any[] = [];
  detRows.push(["DETALLE INTEGRAL DE COMPONENTES DE APU (PDVSA)"]);
  detRows.push([]);

  items.forEach((item) => {
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const codeStr = String(item.id).padStart(3, '0');
    detRows.push([`>>> Partida ${item.id}: Código ${codeStr} - ${item.descripcion}`]);
    detRows.push([`CÓDIGO: ${codeStr}`, `UNIDAD: ${item.unidad}`, `CANTIDAD: ${item.cantidad}`, `RENDIMIENTO: ${item.apu.rendimiento} ${item.apu.unidadRendimiento}`]);


    // Materiales
    detRows.push(["1.- MATERIALES"]);
    detRows.push(["Código", "Descripción", "Unidad", "Cantidad", "% Desp.", "Costo ($)", "Total ($)"]);
    if (item.apu.materiales.length === 0) {
      detRows.push(["-", "No requiere materiales directos", "-", "0", "0", "0", "0"]);
    } else {
      item.apu.materiales.forEach(m => {
        detRows.push([m.codigo, m.descripcion, m.unidad, m.cantidad, m.desperdicioPorc, m.costoUnitario, m.total]);
      });
    }
    detRows.push(["", "", "", "", "", "Total Materiales ($):", Number(calc.totalMateriales.toFixed(2))]);
    detRows.push(["", "", "", "", "", "Unitario de Materiales ($):", Number(calc.unitarioMateriales.toFixed(2))]);

    // Equipos
    detRows.push(["2.- EQUIPOS"]);
    detRows.push(["Código", "Descripción", "Cantidad", "Costo ($)", "Dep. o Alq.", "Total ($)"]);
    if (item.apu.equipos.length === 0) {
      detRows.push(["-", "Herramientas menores", "1", "0", "0", "0"]);
    } else {
      item.apu.equipos.forEach(e => {
        detRows.push([e.codigo, e.descripcion, e.cantidad, e.costo, e.depreciacionOAlquiler, e.total]);
      });
    }
    detRows.push(["", "", "", "", "Total Equipos ($):", Number(calc.totalEquipos.toFixed(2))]);
    detRows.push(["", "", "", "", "Unitario de Equipos ($):", Number(calc.unitarioEquipos.toFixed(2))]);

    // Mano de Obra
    detRows.push(["3.- MANO DE OBRA DIRECTA (LOTTT)"]);
    detRows.push(["Código", "Descripción", "Cantidad", "Salario Diario ($)", "Total Diario ($)"]);
    item.apu.manoDeObra.forEach(mo => {
      detRows.push([mo.codigo, mo.descripcion, mo.cantidad, mo.salarioDiario, mo.total]);
    });
    detRows.push(["", "", "", "Total Mano de Obra Directa ($):", Number(calc.manoObraDirectaTotal.toFixed(2))]);
    detRows.push(["", "", "", `Prestaciones Sociales Directas (FCAS ${fcasPorc}%):`, Number(calc.fcasMonto.toFixed(2))]);
    detRows.push(["", "", "", "Total Mano de Obra Plena ($):", Number(calc.totalManoObra.toFixed(2))]);
    detRows.push(["", "", "", "Unitario de Mano de Obra ($):", Number(calc.unitarioManoObra.toFixed(2))]);

    // Totales APU
    detRows.push(["", "", "", "COSTO DIRECTO POR UNIDAD ($):", Number(calc.costoDirectoUnitario.toFixed(2))]);
    detRows.push(["", "", "", `Administración y Gastos Generales (${adminPorc}%):`, Number(calc.adminMonto.toFixed(2))]);
    detRows.push(["", "", "", "Sub-Total ($):", Number(calc.subTotalUnitario.toFixed(2))]);
    detRows.push(["", "", "", `Utilidad e Imprevistos (${utilidadPorc}%):`, Number(calc.utilidadMonto.toFixed(2))]);
    detRows.push(["", "", "", "PRECIO UNITARIO ($):", Number(calc.precioUnitario.toFixed(2))]);
    detRows.push([]);
  });

  const wsDet = XLSX.utils.aoa_to_sheet(detRows);
  wsDet['!cols'] = [
    { wch: 16 }, { wch: 45 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDet, "Libro de APU Completo");

  XLSX.writeFile(wb, `Libro_APU_Detallado_PDVSA_${PROJECT_INFO.solped}.xlsx`);
}
