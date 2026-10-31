import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CronogramaSummaryData, MONTH_LABELS } from './cronogramaCalculations';
import { PROJECT_INFO } from '../data/projectInfo';
import { PDVSA_LOGO_BASE64 } from './pdvsaLogoData';

function fmtVe(num: number, decimals = 2): string {
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Exports the 8-Month Execution Schedule, Disbursement Plan & S-Curve to Excel (.xlsx)
 */
export function exportCronogramaToExcel(
  data: CronogramaSummaryData,
  ivaPorc: number,
  anticipoPorc: number,
  retencionFielPorc: number,
  retencionLaboralPorc: number,
  projectName = PROJECT_INFO.descripcionLarga,
  solped = PROJECT_INFO.solped
) {
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // SHEET 1: PLAN DE DESEMBOLSOS Y CURVA DE INVERSIÓN (8 MESES)
  // =========================================================================
  const rows1: (string | number)[][] = [
    ['PETRÓLEOS DE VENEZUELA, S.A. (PDVSA) - DIRECCIÓN EJECUTIVA DE PRODUCCIÓN LOS LLANOS'],
    ['CRONOGRAMA FINANCIERO, PLAN DE DESEMBOLSOS MENSUALES Y CURVA DE INVERSIÓN (8 MESES / 240 DÍAS)'],
    [`OBRA: ${projectName}`],
    [`SOLPED / PROCESO: ${solped} | PLAZO DE EJECUCIÓN: 8 MESES (240 DÍAS CONTINUOS)`],
    [],
    [
      'CONCEPTO / INDICADOR FINANCIERO',
      'UNIDAD',
      ...MONTH_LABELS.map((m, idx) => `${m.toUpperCase()} (Días ${idx * 30 + 1}-${(idx + 1) * 30})`),
      'TOTAL PROYECTO',
    ],
    [
      '1. Avance Físico-Financiero Mensual Programado',
      '%',
      ...data.months.map((m) => Number(m.avanceMensualPorc.toFixed(2))),
      100.0,
    ],
    [
      '2. Avance Físico-Financiero Acumulado (Curva S)',
      '%',
      ...data.months.map((m) => Number(m.avanceAcumuladoPorc.toFixed(2))),
      100.0,
    ],
    [],
    [
      '3. Desembolso en Materiales e Insumos (Costo Directo)',
      'USD ($)',
      ...data.months.map((m) => Number(m.materialesMensual.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.materialesMensual, 0).toFixed(2)),
    ],
    [
      '4. Desembolso en Equipos y Maquinarias (Costo Directo)',
      'USD ($)',
      ...data.months.map((m) => Number(m.equiposMensual.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.equiposMensual, 0).toFixed(2)),
    ],
    [
      '5. Desembolso en Mano de Obra Plena LOTTT+FCAS (Costo Directo)',
      'USD ($)',
      ...data.months.map((m) => Number(m.manoObraMensual.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.manoObraMensual, 0).toFixed(2)),
    ],
    [
      '6. Total Costo Directo Mensual',
      'USD ($)',
      ...data.months.map((m) => Number(m.costoDirectoMensual.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.costoDirectoMensual, 0).toFixed(2)),
    ],
    [],
    [
      '7. INVERSIÓN MENSUAL PROGRAMADA (SUBTOTAL SIN IVA)',
      'USD ($)',
      ...data.months.map((m) => Number(m.inversionMensualSinIva.toFixed(2))),
      Number(data.totalSinIva.toFixed(2)),
    ],
    [
      '8. INVERSIÓN ACUMULADA SIN IVA (CURVA S EN USD)',
      'USD ($)',
      ...data.months.map((m) => Number(m.inversionAcumuladaSinIva.toFixed(2))),
      Number(data.totalSinIva.toFixed(2)),
    ],
    [
      `9. Impuesto al Valor Agregado Mensual (IVA ${ivaPorc}%)`,
      'USD ($)',
      ...data.months.map((m) => Number(m.ivaMensual.toFixed(2))),
      Number(data.totalIva.toFixed(2)),
    ],
    [
      '10. DESEMBOLSO TOTAL MENSUAL (CON IVA)',
      'USD ($)',
      ...data.months.map((m) => Number(m.desembolsoMensualConIva.toFixed(2))),
      Number(data.totalConIva.toFixed(2)),
    ],
    [
      '11. DESEMBOLSO TOTAL ACUMULADO (CON IVA)',
      'USD ($)',
      ...data.months.map((m) => Number(m.desembolsoAcumuladoConIva.toFixed(2))),
      Number(data.totalConIva.toFixed(2)),
    ],
    [],
    ['FLUJO DE CAJA CONTRACTUAL (VALUACIONES, ANTICIPO Y RETENCIONES DE LEY)'],
    [
      `12. Amortización de Anticipo Contractual (${anticipoPorc}%)`,
      'USD ($)',
      ...data.months.map((m) => Number(m.amortizacionAnticipo.toFixed(2))),
      Number(data.anticipoMontoSinIva.toFixed(2)),
    ],
    [
      `13. Retención de Fiel Cumplimiento (${retencionFielPorc}%)`,
      'USD ($)',
      ...data.months.map((m) => Number(m.retencionFielCumplimiento.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.retencionFielCumplimiento, 0).toFixed(2)),
    ],
    [
      `14. Retención Laboral / Garantía (${retencionLaboralPorc}%)`,
      'USD ($)',
      ...data.months.map((m) => Number(m.retencionLaboral.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.retencionLaboral, 0).toFixed(2)),
    ],
    [
      '15. PAGO NETO POR VALUACIÓN MENSUAL (SIN IVA)',
      'USD ($)',
      ...data.months.map((m) => Number(m.pagoNetoValuacionSinIva.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.pagoNetoValuacionSinIva, 0).toFixed(2)),
    ],
    [
      '16. PAGO NETO POR VALUACIÓN MENSUAL (CON IVA)',
      'USD ($)',
      ...data.months.map((m) => Number(m.pagoNetoValuacionConIva.toFixed(2))),
      Number(data.months.reduce((a, b) => a + b.pagoNetoValuacionConIva, 0).toFixed(2)),
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(rows1);
  ws1['!cols'] = [
    { wch: 52 },
    { wch: 12 },
    ...Array(8).fill({ wch: 18 }),
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Desembolsos y Curva S');

  // =========================================================================
  // SHEET 2: CRONOGRAMA POR CAPÍTULOS (8 MESES)
  // =========================================================================
  const rows2: (string | number)[][] = [
    ['CRONOGRAMA DE EJECUCIÓN FÍSICO-FINANCIERO POR CAPÍTULOS DE OBRA (8 MESES)'],
    [`PROYECTO: ${projectName}`],
    [],
    [
      'N° CAP.',
      'CAPÍTULO DE OBRA',
      'PARTIDAS',
      'MONTO SIN IVA ($)',
      'INCIDENCIA (%)',
      'INICIO',
      'FIN',
      ...MONTH_LABELS.map((m) => `${m} ($)`),
      ...MONTH_LABELS.map((m) => `${m} (%)`),
    ],
  ];

  data.chapters.forEach((ch, idx) => {
    rows2.push([
      idx + 1,
      ch.capitulo,
      ch.itemsCount,
      Number(ch.totalSinIva.toFixed(2)),
      Number(ch.incidenciaPorc.toFixed(2)),
      `Mes ${ch.startMonth}`,
      `Mes ${ch.endMonth}`,
      ...ch.monthlyAmounts.map((a) => Number(a.toFixed(2))),
      ...ch.monthlyPorc.map((p) => Number(p.toFixed(2))),
    ]);
  });

  rows2.push([
    '',
    'TOTAL GENERAL PRESUPUESTO SIN IVA',
    data.partidas.length,
    Number(data.totalSinIva.toFixed(2)),
    100.0,
    'Mes 1',
    'Mes 8',
    ...data.months.map((m) => Number(m.inversionMensualSinIva.toFixed(2))),
    ...data.months.map((m) => Number(m.avanceMensualPorc.toFixed(2))),
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [
    { wch: 8 },
    { wch: 48 },
    { wch: 10 },
    { wch: 18 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    ...Array(16).fill({ wch: 15 }),
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Cronograma Capítulos');

  // =========================================================================
  // SHEET 3: CRONOGRAMA DETALLADO POR PARTIDAS (364 PARTIDAS)
  // =========================================================================
  const rows3: (string | number)[][] = [
    ['CRONOGRAMA DETALLADO DE EJECUCIÓN Y DESEMBOLSO POR PARTIDA (8 MESES)'],
    [`PROYECTO: ${projectName}`],
    [],
    [
      'PARTIDA',
      'CÓDIGO',
      'CAPÍTULO',
      'DESCRIPCIÓN DE LA PARTIDA',
      'UND',
      'CANTIDAD',
      'P.U. ($)',
      'TOTAL SIN IVA ($)',
      'PESO (%)',
      ...MONTH_LABELS.map((m) => `${m} ($)`),
    ],
  ];

  data.partidas.forEach((p) => {
    rows3.push([
      p.item.id,
      String(p.item.id).padStart(3, '0'),
      p.item.capitulo,
      p.item.descripcion,
      p.item.unidad,
      p.item.cantidad,
      Number(p.precioUnitario.toFixed(2)),
      Number(p.totalSinIva.toFixed(2)),
      Number(p.incidenciaPorc.toFixed(4)),
      ...p.monthlyAmounts.map((a) => Number(a.toFixed(2))),
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(rows3);
  ws3['!cols'] = [
    { wch: 9 },
    { wch: 10 },
    { wch: 34 },
    { wch: 55 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    ...Array(8).fill({ wch: 15 }),
  ];
  XLSX.utils.book_append_sheet(wb, ws3, 'Cronograma Partidas');

  XLSX.writeFile(wb, `Cronograma_Desembolso_Curva_S_8Meses_PDVSA_${solped}.xlsx`);
}

/**
 * Exports Official PDVSA PDF Report (Landscape) containing:
 * - Page 1: Cronograma de Ejecución Físico-Financiero (Gantt 8 Meses por Capítulos)
 * - Page 2: Plan de Desembolsos Mensuales + Gráfico de Curva de Inversión ("Curva S") y Histograma
 */
export function exportCronogramaToPdf(
  data: CronogramaSummaryData,
  ivaPorc: number,
  projectName = PROJECT_INFO.descripcionLarga,
  solped = PROJECT_INFO.solped
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter', // 279.4 x 215.9 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;

  const drawHeader = (title: string, pageNum: number) => {
    // Border box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(marginX, 8, contentWidth, 22);

    // Logo box
    doc.line(marginX + 52, 8, marginX + 52, 30);
    try {
      doc.addImage(PDVSA_LOGO_BASE64, 'PNG', marginX + 3, 10, 46, 17);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(200, 0, 0);
      doc.text('PDVSA DEP LOS LLANOS', marginX + 5, 19);
    }

    // Right metadata box
    doc.line(pageWidth - marginX - 56, 8, pageWidth - marginX - 56, 30);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`SOLPED: ${solped}`, pageWidth - marginX - 53, 13.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Plazo: 8 Meses (240 Días)`, pageWidth - marginX - 53, 18.5);
    doc.text(`Fecha: ${PROJECT_INFO.fecha}`, pageWidth - marginX - 53, 23.5);
    doc.text(`Página: ${pageNum}`, pageWidth - marginX - 53, 28);

    // Center title & project
    const centerW = contentWidth - 52 - 56;
    const centerX = marginX + 52 + centerW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, centerX, 14, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const projLines = doc.splitTextToSize(projectName, centerW - 6).slice(0, 3);
    doc.text(projLines, centerX, 19, { align: 'center', lineHeightFactor: 1.15 });
  };

  // =========================================================================
  // PAGE 1: CRONOGRAMA DE EJECUCIÓN FÍSICO-FINANCIERO POR CAPÍTULOS (8 MESES)
  // =========================================================================
  drawHeader('CRONOGRAMA DE EJECUCIÓN DE OBRA Y DESEMBOLSO FÍSICO-FINANCIERO (8 MESES)', 1);

  const chapterRows = data.chapters.map((ch, idx) => [
    String(idx + 1),
    ch.capitulo,
    fmtVe(ch.totalSinIva, 2),
    `${fmtVe(ch.incidenciaPorc, 2)}%`,
    ...ch.monthlyAmounts.map((amt, mIdx) =>
      amt > 0 ? `${fmtVe(amt, 0)}\n(${fmtVe(ch.monthlyPorc[mIdx], 0)}%)` : '-'
    ),
  ]);

  // Footer totals row
  chapterRows.push([
    '',
    'INVERSIÓN MENSUAL PROGRAMADA SIN IVA ($)',
    fmtVe(data.totalSinIva, 2),
    '100,00%',
    ...data.months.map((m) => fmtVe(m.inversionMensualSinIva, 2)),
  ]);

  chapterRows.push([
    '',
    'AVANCE FÍSICO-FINANCIERO MENSUAL (%)',
    '-',
    '100,00%',
    ...data.months.map((m) => `${fmtVe(m.avanceMensualPorc, 2)}%`),
  ]);

  chapterRows.push([
    '',
    'AVANCE ACUMULADO PROGRAMADO - CURVA S (%)',
    fmtVe(data.totalSinIva, 2),
    '100,00%',
    ...data.months.map((m) => `${fmtVe(m.avanceAcumuladoPorc, 2)}%`),
  ]);

  autoTable(doc, {
    startY: 32,
    margin: { left: marginX, right: marginX, bottom: 12 },
    head: [
      [
        'N°',
        'CAPÍTULO / ACTIVIDAD DE OBRA',
        'SUBTOTAL ($)',
        'PESO %',
        'MES 1\n(Días 1-30)',
        'MES 2\n(Días 31-60)',
        'MES 3\n(Días 61-90)',
        'MES 4\n(Días 91-120)',
        'MES 5\n(Días 121-150)',
        'MES 6\n(Días 151-180)',
        'MES 7\n(Días 181-210)',
        'MES 8\n(Días 211-240)',
      ],
    ],
    body: chapterRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 5.8,
      cellPadding: 0.9,
      textColor: [15, 23, 42],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [245, 215, 185],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.2,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 64, halign: 'left' },
      2: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 19, halign: 'right' },
      5: { cellWidth: 19, halign: 'right' },
      6: { cellWidth: 19, halign: 'right' },
      7: { cellWidth: 19, halign: 'right' },
      8: { cellWidth: 19, halign: 'right' },
      9: { cellWidth: 19, halign: 'right' },
      10: { cellWidth: 19, halign: 'right' },
      11: { cellWidth: 19.4, halign: 'right' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowIndex = hookData.row.index;
        const totalRowsCount = chapterRows.length;
        // Highlight active Gantt cells in light blue/amber
        if (rowIndex < totalRowsCount - 3 && hookData.column.index >= 4) {
          const mIdx = hookData.column.index - 4;
          const ch = data.chapters[rowIndex];
          if (ch && ch.monthlyPorc[mIdx] > 0) {
            hookData.cell.styles.fillColor = [224, 242, 254];
            hookData.cell.styles.fontStyle = 'bold';
          }
        }
        // Summary rows at bottom
        if (rowIndex >= totalRowsCount - 3) {
          hookData.cell.styles.fillColor = [241, 245, 249];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // =========================================================================
  // PAGE 2: PLAN DE DESEMBOLSOS Y GRÁFICO DE CURVA DE INVERSIÓN ("CURVA S")
  // =========================================================================
  doc.addPage();
  drawHeader('PLAN DE DESEMBOLSOS MENSUALES Y CURVA DE INVERSIÓN ACUMULADA ("CURVA S")', 2);

  const disbRows = [
    [
      'Avance Físico-Financiero Mensual (%)',
      ...data.months.map((m) => `${fmtVe(m.avanceMensualPorc, 2)}%`),
      '100,00%',
    ],
    [
      'Avance Físico-Financiero Acumulado - Curva S (%)',
      ...data.months.map((m) => `${fmtVe(m.avanceAcumuladoPorc, 2)}%`),
      '100,00%',
    ],
    [
      'Inversión Mensual Sin IVA ($)',
      ...data.months.map((m) => fmtVe(m.inversionMensualSinIva, 2)),
      fmtVe(data.totalSinIva, 2),
    ],
    [
      'Inversión Acumulada Sin IVA ($)',
      ...data.months.map((m) => fmtVe(m.inversionAcumuladaSinIva, 2)),
      fmtVe(data.totalSinIva, 2),
    ],
    [
      `IVA Mensual (${ivaPorc}%) ($)`,
      ...data.months.map((m) => fmtVe(m.ivaMensual, 2)),
      fmtVe(data.totalIva, 2),
    ],
    [
      'Desembolso Total Mensual Con IVA ($)',
      ...data.months.map((m) => fmtVe(m.desembolsoMensualConIva, 2)),
      fmtVe(data.totalConIva, 2),
    ],
    [
      'Desembolso Total Acumulado Con IVA ($)',
      ...data.months.map((m) => fmtVe(m.desembolsoAcumuladoConIva, 2)),
      fmtVe(data.totalConIva, 2),
    ],
  ];

  autoTable(doc, {
    startY: 33,
    margin: { left: marginX, right: marginX },
    head: [
      [
        'CONCEPTO FINANCIERO',
        ...MONTH_LABELS.map((m) => m.toUpperCase()),
        'TOTAL OBRA',
      ],
    ],
    body: disbRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: [245, 215, 185],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 63.4, fontStyle: 'bold' },
      1: { cellWidth: 21, halign: 'right' },
      2: { cellWidth: 21, halign: 'right' },
      3: { cellWidth: 21, halign: 'right' },
      4: { cellWidth: 21, halign: 'right' },
      5: { cellWidth: 21, halign: 'right' },
      6: { cellWidth: 21, halign: 'right' },
      7: { cellWidth: 21, halign: 'right' },
      8: { cellWidth: 21, halign: 'right' },
      9: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Draw Vector S-Curve Chart in PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartBoxY = ((doc as any).lastAutoTable?.finalY || 85) + 4;
  const chartBoxH = pageHeight - chartBoxY - 12;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(marginX, chartBoxY, contentWidth, chartBoxH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    'CURVA DE INVERSIÓN ACUMULADA ("CURVA S") E HISTOGRAMA DE DESEMBOLSOS MENSUALES (8 MESES)',
    marginX + contentWidth / 2,
    chartBoxY + 5.5,
    { align: 'center' }
  );

  // Plot area
  const plotLeft = marginX + 28;
  const plotRight = pageWidth - marginX - 24;
  const plotTop = chartBoxY + 12;
  const plotBottom = chartBoxY + chartBoxH - 12;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  // Grid lines (0%, 25%, 50%, 75%, 100%)
  doc.setLineWidth(0.15);
  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i <= 4; i++) {
    const ratio = i / 4;
    const gy = plotBottom - ratio * plotH;
    doc.line(plotLeft, gy, plotRight, gy);

    // Left axis: USD Sin IVA
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(60, 60, 60);
    doc.text(`$${fmtVe((data.totalSinIva * ratio) / 1000, 0)}k`, plotLeft - 2, gy + 1.5, {
      align: 'right',
    });

    // Right axis: % Cumulative
    doc.text(`${Math.round(ratio * 100)}%`, plotRight + 2, gy + 1.5, {
      align: 'left',
    });
  }

  // Draw Axes
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(plotLeft, plotTop, plotLeft, plotBottom);
  doc.line(plotLeft, plotBottom, plotRight, plotBottom);
  doc.line(plotRight, plotTop, plotRight, plotBottom);

  const colStep = plotW / 8;
  const barWidth = colStep * 0.42;

  // Draw monthly histogram bars + S-curve coordinates
  const points: { x: number; y: number; m: typeof data.months[0] }[] = [];

  data.months.forEach((m, idx) => {
    const cx = plotLeft + colStep * (idx + 0.5);
    const barH = data.totalSinIva > 0 ? (m.inversionMensualSinIva / data.totalSinIva) * plotH : 0;
    const by = plotBottom - barH;

    // Monthly bar
    doc.setFillColor(186, 230, 253);
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.25);
    doc.rect(cx - barWidth / 2, by, barWidth, barH, 'FD');

    // X label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.text(m.label, cx, plotBottom + 4.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(`$${fmtVe(m.inversionMensualSinIva, 0)}`, cx, plotBottom + 8, { align: 'center' });

    const sy = plotBottom - (m.avanceAcumuladoPorc / 100) * plotH;
    points.push({ x: cx, y: sy, m });
  });

  // Draw S-Curve line from origin (plotLeft, plotBottom) through all 8 points
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.75);
  let prevX = plotLeft;
  let prevY = plotBottom;
  points.forEach((pt) => {
    doc.line(prevX, prevY, pt.x, pt.y);
    prevX = pt.x;
    prevY = pt.y;
  });

  // Draw points & labels on S-curve
  points.forEach((pt) => {
    doc.setFillColor(220, 38, 38);
    doc.circle(pt.x, pt.y, 1.3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(185, 28, 28);
    doc.text(`${fmtVe(pt.m.avanceAcumuladoPorc, 1)}%`, pt.x, pt.y - 2.3, { align: 'center' });
  });

  doc.save(`Cronograma_Desembolso_Curva_S_8Meses_PDVSA_${solped}.pdf`);
}
