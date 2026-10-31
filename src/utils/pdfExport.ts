import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { PROJECT_INFO } from '../data/projectInfo';
import { calculateItemApu } from './apuCalculations';
import { PDVSA_LOGO_BASE64 } from './pdvsaLogoData';

export interface ResolvedAnexo3raFields {
  procedimientoSteps: string[];
  desperdicioAplica: boolean;
  desperdicioMaximoLabel: string;
  planosAplica: boolean;
  planosLabel: string;
}

export function resolveAnexo3raFields(item: PartidaItem): ResolvedAnexo3raFields {
  const spec = item.especificacion;

  // 1. Procedimiento de Ejecución (numbered steps)
  const rawProc = (spec?.procedimientoEjecucion || '').trim();
  const splitSteps = rawProc
    .split(/(?:\r?\n|(?=\b[1-9]\.\s))/)
    .map((s) => s.trim())
    .filter(Boolean);

  const procedimientoSteps =
    splitSteps.length >= 2
      ? splitSteps
      : [
          '1. Se realizará la inspección preliminar y replanteo de las áreas a intervenir en coordinación con el Ingeniero Inspector de PDVSA.',
          `2. ${rawProc || 'Ejecución de los trabajos con personal calificado y equipos calibrados conforme a normas COVENIN y especificaciones PDVSA.'}`,
          '3. Concluida la actividad se realizará la verificación dimensional, pruebas de aceptación y limpieza general del sitio bajo normas SIHO.',
        ];

  // 2. Desperdicio (Section 9)
  const rawDesp = (spec?.desperdicioMaximo || '').trim();
  const hasMaterials = item.apu.materiales.length > 0;
  const maxMatDesp = item.apu.materiales.reduce(
    (max, m) => Math.max(max, Number(m.desperdicioPorc) || 0),
    0
  );
  const explicitNoAplica = /^no\s*aplica|^n\/a$/i.test(rawDesp);
  const desperdicioAplica = hasMaterials && !explicitNoAplica;

  let desperdicioMaximoLabel = 'N/A';
  if (desperdicioAplica) {
    const cleaned = rawDesp.replace(/^m[áa]ximo\s*(permitido\s*:?\s*)?/i, '').trim();
    const pctMatch = cleaned.match(/^(\d+(?:[.,]\d+)?\s*%(?:\s*a\s*\d+(?:[.,]\d+)?\s*%)?)/i);
    if (pctMatch) {
      desperdicioMaximoLabel = maxMatDesp > 0 ? `${maxMatDesp}%` : pctMatch[1].toUpperCase();
    } else if (cleaned.length > 0 && cleaned.length <= 24) {
      desperdicioMaximoLabel = cleaned.toUpperCase();
    } else if (maxMatDesp > 0) {
      desperdicioMaximoLabel = `${maxMatDesp}%`;
    } else {
      desperdicioMaximoLabel = '5%';
    }
  }

  // 3. Planos (Section 12)
  const rawPlanos = (spec?.planos || '').trim();
  const planosNoAplica = !rawPlanos || /^no\s*aplica|^n\/a$|^s\/n$/i.test(rawPlanos);
  const planosAplica = !planosNoAplica;
  let planosLabel = 'NO APLICA';
  if (planosAplica) {
    if (rawPlanos.length <= 36) {
      planosLabel = rawPlanos.toUpperCase();
    } else if (/el[ée]ctric|unifilar|iluminaci|tablero|circuit/i.test(rawPlanos)) {
      planosLabel = 'SEGÚN PLANOS DE INSTALACIONES ELÉCTRICAS';
    } else if (/sanitari|agua|drenaje|isometr/i.test(rawPlanos)) {
      planosLabel = 'SEGÚN PLANOS DE INSTALACIONES SANITARIAS';
    } else if (/estructur|viga|columna|fundaci|losa/i.test(rawPlanos)) {
      planosLabel = 'SEGÚN PROYECTO ESTRUCTURAL';
    } else {
      planosLabel = 'SEGÚN PLANOS APROBADOS PDVSA';
    }
  }

  return {
    procedimientoSteps,
    desperdicioAplica,
    desperdicioMaximoLabel,
    planosAplica,
    planosLabel,
  };
}


function fmtVe(num: number, decimals = 2): string {
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 1. EXPORTAR PRESUPUESTO GENERAL A PDF (.pdf)
 * Replicando exactamente la estructura de "PRESUPUESTO EJEMPLO.pdf":
 * - Encabezado con Fecha, Pág Nº, Título PRESUPUESTO subrayado
 * - Bloque recuadrado con Obra, Contrato Nº y Propietario: PDVSA
 * - Columnas con bordes verticales: PARTIDA | DESCRIPCIÓN | UNIDAD | CANTIDAD | P.U. | TOTAL $
 * - Bloque inferior recuadrado: Total $, (16,00 %) I.V.A., TOTAL GENERAL
 */
export function exportPresupuestoToPdf(
  items: PartidaItem[],
  summary: FinancialSummary,
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje,
  ivaPorc = PROJECT_INFO.ivaPorcentaje,
  projectMeta?: { name?: string; solped?: string; division?: string; fecha?: string }
): void {
  const solped = projectMeta?.solped || PROJECT_INFO.solped;
  const obraDesc = projectMeta?.name || PROJECT_INFO.descripcionLarga;
  const division = projectMeta?.division || PROJECT_INFO.division;
  const fecha = projectMeta?.fecha || PROJECT_INFO.fecha;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;

  const drawPageHeader = (pageNumber: number) => {
    // Top Left: PDVSA / División info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text('PETRÓLEOS DE VENEZUELA, S.A. (PDVSA)', marginX, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(division, marginX, 14.5);
    doc.text(`SOLPED Nº: ${solped}`, marginX, 18);

    // Top Right: Pág Nº and Fecha
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Pág Nº ${pageNumber}`, pageWidth - marginX, 12, { align: 'right' });
    doc.text(`Fecha: ${fecha}`, pageWidth - marginX, 16, { align: 'right' });

    // Centered Title: PRESUPUESTO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PRESUPUESTO', pageWidth / 2, 23, { align: 'center' });
    const titleWidth = doc.getTextWidth('PRESUPUESTO');
    doc.setLineWidth(0.4);
    doc.line((pageWidth - titleWidth) / 2, 24, (pageWidth + titleWidth) / 2, 24);

    // Obra Box
    const boxY = 26.5;
    const boxH = 20;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(marginX, boxY, contentWidth, boxH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Obra:', marginX + 2, boxY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const obraLines = doc.splitTextToSize(obraDesc, contentWidth - 16);
    doc.text(obraLines, marginX + 12, boxY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Contrato Nº:', marginX + 2, boxY + 13.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`S/N (SOLPED ${solped})`, marginX + 20, boxY + 13.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Propietario:', marginX + 2, boxY + 18);
    doc.setFont('helvetica', 'normal');
    doc.text('PDVSA', marginX + 20, boxY + 18);
  };

  const tableRows = items.map((item) => {
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    return [
      String(item.id),
      item.descripcion,
      item.unidad,
      fmtVe(item.cantidad, 2),
      fmtVe(calc.precioUnitario, 2),
      fmtVe(calc.totalPartida, 2),
    ];
  });

  autoTable(doc, {
    startY: 48,
    margin: { top: 48, left: marginX, right: marginX, bottom: 26 },
    head: [['PARTIDA', 'DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD', 'P.U.', 'TOTAL $']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.4,
      textColor: [15, 23, 42],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: 'top',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.35,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: contentWidth - 16 - 16 - 22 - 24 - 28, halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      drawPageHeader(data.pageNumber);
    },
  });

  // Draw Totals Summary Block at the end (matching PRESUPUESTO EJEMPLO.pdf)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 220;
  const pageHeight = doc.internal.pageSize.getHeight();
  let summaryY = finalY + 2;

  if (summaryY + 24 > pageHeight - 12) {
    doc.addPage();
    drawPageHeader(doc.getNumberOfPages());
    summaryY = 50;
  }

  const labelBoxW = 48;
  const valBoxW = 28;
  const startX = pageWidth - marginX - labelBoxW - valBoxW;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // Row 1: Total $
  doc.rect(startX, summaryY, labelBoxW, 6.5);
  doc.rect(startX + labelBoxW, summaryY, valBoxW, 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total $:', startX + labelBoxW - 2, summaryY + 4.5, { align: 'right' });
  doc.text(fmtVe(summary.subTotalGeneral, 2), startX + labelBoxW + valBoxW - 1.5, summaryY + 4.5, {
    align: 'right',
  });

  // Row 2: (16,00 %) I.V.A.
  doc.rect(startX, summaryY + 6.5, labelBoxW, 6.5);
  doc.rect(startX + labelBoxW, summaryY + 6.5, valBoxW, 6.5);
  doc.text(
    `(${fmtVe(ivaPorc, 2)} %) I.V.A.:`,
    startX + labelBoxW - 2,
    summaryY + 11,
    { align: 'right' }
  );
  doc.text(fmtVe(summary.totalIva, 2), startX + labelBoxW + valBoxW - 1.5, summaryY + 11, {
    align: 'right',
  });

  // Row 3: TOTAL GENERAL
  doc.setFillColor(245, 245, 245);
  doc.rect(startX, summaryY + 13, labelBoxW, 7.5, 'FD');
  doc.rect(startX + labelBoxW, summaryY + 13, valBoxW, 7.5, 'FD');
  doc.setFontSize(8.5);
  doc.text('TOTAL GENERAL:', startX + labelBoxW - 2, summaryY + 18, { align: 'right' });
  doc.text(fmtVe(summary.granTotalGeneral, 2), startX + labelBoxW + valBoxW - 1.5, summaryY + 18, {
    align: 'right',
  });

  doc.save(`Presupuesto_General_PDVSA_${solped}.pdf`);
}

/**
 * Renders a single APU page inside a jsPDF document strictly replicating "APU EJEMPLO.pdf"
 */
function renderApuPageInDoc(
  doc: jsPDF,
  item: PartidaItem,
  fcasPorc: number,
  adminPorc: number,
  utilidadPorc: number,
  projectMeta?: { name?: string; solped?: string; division?: string; fecha?: string }
): void {
  const solped = projectMeta?.solped || PROJECT_INFO.solped;
  const obraDesc = projectMeta?.name || PROJECT_INFO.descripcionLarga;
  const division = projectMeta?.division || PROJECT_INFO.division;
  const fecha = projectMeta?.fecha || PROJECT_INFO.fecha;

  const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  const code3 = String(item.id).padStart(3, '0');

  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  // Outer Header & Top Title
  let y = 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`PDVSA - ${division.toUpperCase()}`, marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`SOLPED Nº: ${solped}`, marginX, y + 3.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('ANALISIS DE PRECIOS UNITARIOS', pageWidth / 2, y + 2.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Fecha: ${fecha}`, pageWidth - marginX - 30, y);

  // Partida Nº Box on Top Right
  doc.setLineWidth(0.4);
  doc.rect(pageWidth - marginX - 28, y + 1.2, 28, 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Partida Nº   ${item.id}`, pageWidth - marginX - 14, y + 5.7, { align: 'center' });

  // Box 1: Descripción de la Obra & Propietario
  y = 19;
  const obraBoxH = 15.5;
  doc.setLineWidth(0.35);
  doc.rect(marginX, y, contentWidth, obraBoxH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Descripción de la Obra:', marginX + 1.5, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  const obraLines = doc.splitTextToSize(obraDesc, contentWidth - 33);
  doc.text(obraLines, marginX + 31, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Propietario:', marginX + 1.5, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PDVSA', marginX + 18, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Código de la Obra:', pageWidth - marginX - 48, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text('OBRA-001', pageWidth - marginX - 21, y + 13.5);

  // Box 2: Descripción Partida + 5-column metadata strip
  y += obraBoxH;
  const partDescH = 11.5;
  doc.rect(marginX, y, contentWidth, partDescH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Descripción Partida:', marginX + 1.5, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const partLines = doc.splitTextToSize(item.descripcion, contentWidth - 29);
  doc.text(partLines, marginX + 28, y + 4);

  y += partDescH;
  const metaH = 9;
  doc.rect(marginX, y, contentWidth, metaH);
  // 5 columns: Código | Código Covenin | Unidad | Cantidad | Rendimiento
  const colW = contentWidth / 5;
  const metaHeaders = ['Código', 'Código Covenin', 'Unidad', 'Cantidad', 'Rendimiento'];
  const metaVals = [
    code3,
    code3,
    item.unidad,
    fmtVe(item.cantidad, 2),
    fmtVe(item.apu.rendimiento, 5),
  ];

  doc.setLineWidth(0.25);
  doc.line(marginX, y + 4.3, marginX + contentWidth, y + 4.3);
  for (let i = 0; i < 5; i++) {
    const cx = marginX + i * colW;
    if (i > 0) doc.line(cx, y, cx, y + metaH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(metaHeaders[i], cx + colW / 2, y + 3.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(metaVals[i], cx + colW / 2, y + 7.6, { align: 'center' });
  }

  y += metaH;

  // ==========================================
  // 1.- MATERIALES
  // ==========================================
  doc.setFillColor(242, 242, 242);
  doc.rect(marginX, y, contentWidth, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('1.- MATERIALES', marginX + 2, y + 3.6);
  y += 5;

  const matRows =
    item.apu.materiales.length > 0
      ? item.apu.materiales.map((m) => {
          const waste = 1 + (m.desperdicioPorc || 0) / 100;
          const lineTotal = m.cantidad * m.costoUnitario * waste;
          return [
            m.codigo || 'MAT-01',
            m.descripcion,
            m.unidad,
            fmtVe(m.cantidad, 4),
            fmtVe(m.desperdicioPorc || 0, 2),
            fmtVe(m.costoUnitario, 2),
            fmtVe(lineTotal, 2),
          ];
        })
      : [['-', 'NO REQUIERE MATERIALES DIRECTOS', '-', '0,0000', '0,00', '0,00', '0,00']];

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Código', 'Descripción', 'Unidad', 'Cantidad', '% Desp.', 'Costo', 'Total']],
    body: matRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.7,
      cellPadding: 1.0,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'left' },
      1: { cellWidth: contentWidth - 20 - 14 - 20 - 16 - 22 - 22, halign: 'left' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY;
  doc.rect(marginX, y, contentWidth, 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Total Materiales:', pageWidth - marginX - 24, y + 3.8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.totalMateriales, 2), pageWidth - marginX - 1.5, y + 3.8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Unitario de Materiales:', pageWidth - marginX - 24, y + 8.0, { align: 'right' });
  doc.rect(pageWidth - marginX - 22, y + 4.8, 22, 4.2);
  doc.text(fmtVe(calc.unitarioMateriales, 2), pageWidth - marginX - 1.5, y + 8.0, {
    align: 'right',
  });
  y += 9.5;

  // ==========================================
  // 2.- EQUIPOS (Desglosados individualmente con Dep. o Alq.)
  // ==========================================
  doc.setFillColor(242, 242, 242);
  doc.rect(marginX, y, contentWidth, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('2.- EQUIPOS', marginX + 2, y + 3.6);
  y += 5;

  const eqRows =
    item.apu.equipos.length > 0
      ? item.apu.equipos.map((e) => {
          const dep = e.depreciacionOAlquiler || 1;
          const lineTotal = e.cantidad * e.costo * dep;
          return [
            e.codigo || 'EQ-001',
            e.descripcion,
            fmtVe(e.cantidad, 2),
            fmtVe(e.costo, 2),
            fmtVe(dep, 6),
            fmtVe(lineTotal, 2),
          ];
        })
      : [['-', 'SIN EQUIPOS DIRECTOS', '0,00', '0,00', '0,000000', '0,00']];

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Código', 'Descripción', 'Cantidad', 'Costo', 'Dep. o Alq.', 'Total']],
    body: eqRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.7,
      cellPadding: 1.0,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'left' },
      1: { cellWidth: contentWidth - 20 - 20 - 22 - 24 - 22, halign: 'left' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY;
  doc.rect(marginX, y, contentWidth, 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Total Equipos:', pageWidth - marginX - 24, y + 3.8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.totalEquipos, 2), pageWidth - marginX - 1.5, y + 3.8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Unitario de Equipos:', pageWidth - marginX - 24, y + 8.0, { align: 'right' });
  doc.rect(pageWidth - marginX - 22, y + 4.8, 22, 4.2);
  doc.text(fmtVe(calc.unitarioEquipos, 2), pageWidth - marginX - 1.5, y + 8.0, {
    align: 'right',
  });
  y += 9.5;

  // ==========================================
  // 3.- MANO DE OBRA DIRECTA
  // ==========================================
  doc.setFillColor(242, 242, 242);
  doc.rect(marginX, y, contentWidth, 5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('3.- MANO DE OBRA DIRECTA', marginX + 2, y + 3.6);
  y += 5;

  const moRows =
    item.apu.manoDeObra.length > 0
      ? item.apu.manoDeObra.map((mo) => [
          mo.codigo,
          mo.descripcion,
          fmtVe(mo.cantidad, 2),
          fmtVe(mo.salarioDiario, 2),
          fmtVe(mo.cantidad * mo.salarioDiario, 2),
        ])
      : [['-', 'NO REQUIERE MANO DE OBRA DIRECTA', '0,00', '0,00', '0,00']];

  const numPersonas = item.apu.manoDeObra.reduce((acc, m) => acc + m.cantidad, 0);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Código', 'Descripción', 'Cantidad', 'Salario', 'Total']],
    body: moRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.7,
      cellPadding: 1.0,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'left' },
      1: { cellWidth: contentWidth - 22 - 22 - 24 - 22, halign: 'left' },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 22, halign: 'right' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY;
  doc.rect(marginX, y, contentWidth, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Total Mano de Obra Directa:', pageWidth - marginX - 24, y + 3.8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.manoObraDirectaTotal, 2), pageWidth - marginX - 1.5, y + 3.8, {
    align: 'right',
  });

  doc.setFont('helvetica', 'bold');
  doc.text(
    `${fmtVe(fcasPorc, 2)} % Prestaciones Sociales Directas:`,
    pageWidth - marginX - 24,
    y + 8.0,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.fcasMonto, 2), pageWidth - marginX - 1.5, y + 8.0, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Total Mano de Obra:', pageWidth - marginX - 24, y + 12.2, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.totalManoObra, 2), pageWidth - marginX - 1.5, y + 12.2, { align: 'right' });

  // Número de personas & Unitario Mano de Obra
  doc.setFont('helvetica', 'bold');
  doc.text('Número de personas:', marginX + 60, y + 16.3);
  doc.rect(marginX + 89, y + 13.2, 16, 4.0);
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(numPersonas, 2), marginX + 97, y + 16.3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text('Unitario Mano de Obra:', pageWidth - marginX - 24, y + 16.3, { align: 'right' });
  doc.rect(pageWidth - marginX - 22, y + 13.0, 22, 4.2);
  doc.text(fmtVe(calc.unitarioManoObra, 2), pageWidth - marginX - 1.5, y + 16.3, {
    align: 'right',
  });

  y += 17.5;

  // ==========================================
  // BOTTOM COST SUMMARY & SIGNATURES BLOCK
  // ==========================================
  const bottomH = 26;
  doc.rect(marginX, y, contentWidth, bottomH);

  // Left signature box: Calculado por / Revisado por
  doc.rect(marginX + 2, y + 3, 72, 16);
  doc.line(marginX + 2, y + 11, marginX + 74, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('Calculado por:', marginX + 3.5, y + 6.2);
  doc.setFont('helvetica', 'normal');
  doc.text(PROJECT_INFO.realizadoPor.substring(0, 32), marginX + 3.5, y + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Revisado por:', marginX + 3.5, y + 14.2);
  doc.setFont('helvetica', 'normal');
  doc.text(`${PROJECT_INFO.revisadoPor} / ${PROJECT_INFO.aprobadoPor}`, marginX + 3.5, y + 17.5);

  // Right financial breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Costo Directo por Unidad:', pageWidth - marginX - 24, y + 4.2, { align: 'right' });
  doc.text(fmtVe(calc.costoDirectoUnitario, 2), pageWidth - marginX - 1.5, y + 4.2, {
    align: 'right',
  });

  doc.text(
    `${fmtVe(adminPorc, 2)}% Administración y Gastos Generales:`,
    pageWidth - marginX - 24,
    y + 8.6,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.adminMonto, 2), pageWidth - marginX - 1.5, y + 8.6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Sub-Total:', pageWidth - marginX - 24, y + 13.0, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.subTotalUnitario, 2), pageWidth - marginX - 1.5, y + 13.0, {
    align: 'right',
  });

  doc.setFont('helvetica', 'bold');
  doc.text(`${fmtVe(utilidadPorc, 2)}% Utilidad e Imprevistos:`, pageWidth - marginX - 24, y + 17.4, {
    align: 'right',
  });
  doc.setFont('helvetica', 'normal');
  doc.text(fmtVe(calc.utilidadMonto, 2), pageWidth - marginX - 1.5, y + 17.4, { align: 'right' });

  // PRECIO UNITARIO $ (Thick Box)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PRECIO UNITARIO $:', pageWidth - marginX - 26, y + 23.2, { align: 'right' });
  doc.setLineWidth(0.6);
  doc.rect(pageWidth - marginX - 24, y + 19.2, 24, 5.5);
  doc.text(fmtVe(calc.precioUnitario, 2), pageWidth - marginX - 1.5, y + 23.2, { align: 'right' });

  // Bottom Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Nota: Uso Exclusivo de PDVSA División Barinas - DEP Los Llanos', marginX + 2, y + 24.5);
}

/**
 * 2A. EXPORTAR UN APU INDIVIDUAL A PDF (.pdf)
 */
export function exportSingleApuToPdf(
  item: PartidaItem,
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje,
  projectMeta?: { name?: string; solped?: string; division?: string; fecha?: string }
): void {
  const solped = projectMeta?.solped || PROJECT_INFO.solped;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });
  renderApuPageInDoc(doc, item, fcasPorc, adminPorc, utilidadPorc, projectMeta);
  const code3 = String(item.id).padStart(3, '0');
  doc.save(`APU_Partida_${code3}_PDVSA_${solped}.pdf`);
}

/**
 * 2B. EXPORTAR LIBRO COMPLETO DE APUs A PDF (.pdf)
 */
export function exportApuBookToPdf(
  items: PartidaItem[],
  fcasPorc = PROJECT_INFO.fcasPorcentaje,
  adminPorc = PROJECT_INFO.adminPorcentaje,
  utilidadPorc = PROJECT_INFO.utilidadPorcentaje,
  projectMeta?: { name?: string; solped?: string; division?: string; fecha?: string }
): void {
  const solped = projectMeta?.solped || PROJECT_INFO.solped;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  items.forEach((item, index) => {
    if (index > 0) doc.addPage();
    renderApuPageInDoc(doc, item, fcasPorc, adminPorc, utilidadPorc, projectMeta);
  });

  doc.save(`Libro_APU_Oficial_PDVSA_${solped}.pdf`);
}

export interface Anexo3raMembretePdf {
  solped: string;
  proceso: string;
  proyecto: string;
  divisionSubtitulo: string;
  realizadoPorLinea1: string;
  realizadoPorLinea2: string;
  revisadoPorNombre: string;
  revisadoPorCargo: string;
  aprobadoPorNombre: string;
  aprobadoPorCargo: string;
}

/**
 * 3. EXPORTAR FICHA(S) DE ESPECIFICACIONES TÉCNICAS (ANEXO 3RA) A PDF (.pdf)
 * Replicando estrictamente el estándar oficial de PDVSA con el logo oficial "PDVSA DEP LOS LLANOS",
 * la cajuela naranja a la derecha y los 15 numerales perfectamente encuadrados sin superposiciones.
 */
export function buildEspecificacionAnexo3raPdfDoc(
  itemsToExport: PartidaItem[],
  membrete: Anexo3raMembretePdf
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  const peach: [number, number, number] = [245, 207, 168];

  itemsToExport.forEach((item, pageIdx) => {
    if (pageIdx > 0) doc.addPage();

    const spec = item.especificacion;
    const resolved = resolveAnexo3raFields(item);
    let y = 8;

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.35);

    // =========================================================================
    // ROW 1: Official Logo (46mm) | SOLPED & Proyecto (104.9mm) | Proceso & 1. Partida Nº (45mm)
    // =========================================================================
    const col1W = 46;
    const col3W = 45;
    const col2W = contentWidth - col1W - col3W;
    const row1H = 22;

    // Left Box: Official PDVSA DEP LOS LLANOS Logo (Centered & Scaled)
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, col1W, row1H, 'FD');
    const logoW = 40;
    const logoH = 15.8;
    const logoX = marginX + (col1W - logoW) / 2;
    const logoY = y + (row1H - logoH) / 2;
    doc.addImage(PDVSA_LOGO_BASE64, 'PNG', logoX, logoY, logoW, logoH);

    // Center Box: SOLPED & Proyecto (Vertically & Horizontally Centered)
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + col1W, y, col2W, row1H, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(0, 0, 0);
    const headerTitle = `SOLPED: ${membrete.solped}. ${membrete.proyecto}`;
    const titleLines = doc.splitTextToSize(headerTitle, col2W - 5).slice(0, 5);
    const titleStep = 6.8 * 0.352778 * 1.16;
    const totalTitleH = (titleLines.length - 1) * titleStep + 2.3;
    const titleStartY = y + (row1H - totalTitleH) / 2 + 1.9;
    doc.text(titleLines, marginX + col1W + col2W / 2, titleStartY, {
      align: 'center',
      lineHeightFactor: 1.16,
    });

    // Right Box: PROCESO Nº (top white) + 1. PARTIDA Nº (bottom peach/orange)
    const rBoxX = marginX + col1W + col2W;
    doc.setFillColor(255, 255, 255);
    doc.rect(rBoxX, y, col3W, 8.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(0, 0, 0);
    doc.text('PROCESO Nº:', rBoxX + col3W / 2, y + 3.5, { align: 'center' });
    doc.text(String(membrete.proceso), rBoxX + col3W / 2, y + 7.1, { align: 'center' });

    doc.setFillColor(...peach);
    doc.rect(rBoxX, y + 8.5, col3W, row1H - 8.5, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('1. PARTIDA Nº:', rBoxX + col3W / 2, y + 13.2, { align: 'center' });
    doc.setFontSize(11.5);
    doc.text(String(item.id), rBoxX + col3W / 2, y + 19.2, { align: 'center' });

    y += row1H;

    // =========================================================================
    // ROW 2: 2. -DESCRIPCION : (peach) | 3.- UNIDAD DE MEDIDA & Cantidad (peach)
    // =========================================================================
    const row2H = 16.5;
    const descW = col1W + col2W;
    doc.setFillColor(...peach);
    doc.rect(marginX, y, descW, row2H, 'FD');
    doc.setFillColor(...peach);
    doc.rect(rBoxX, y, col3W, row2H, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.text('2. -DESCRIPCION :', marginX + 2.2, y + 3.8);
    doc.setFontSize(6.6);
    const descLines = doc.splitTextToSize(item.descripcion, descW - 4.4).slice(0, 4);
    doc.text(descLines, marginX + 2.2, y + 7.0, { lineHeightFactor: 1.12 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.text('3.- UNIDAD DE MEDIDA', rBoxX + col3W / 2, y + 3.8, { align: 'center' });
    doc.setFontSize(7.8);
    doc.text(item.unidad, rBoxX + col3W / 2, y + 7.4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.text('Cantidad:', rBoxX + col3W / 2, y + 11.1, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.text(fmtVe(item.cantidad, 2), rBoxX + col3W / 2, y + 14.8, { align: 'center' });

    y += row2H;

    // =========================================================================
    // 4.- EXTENSIÓN DEL TRABAJO (15.0 mm)
    // =========================================================================
    const extH = 15.0;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, extH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('4.- EXTENSIÓN DEL TRABAJO:', marginX + 2.2, y + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    const extLines = doc.splitTextToSize(spec.extensionTrabajo || '', contentWidth - 4.4).slice(0, 3);
    doc.text(extLines, marginX + 2.2, y + 6.7, { lineHeightFactor: 1.14 });
    y += extH;

    // =========================================================================
    // 5.- PROCEDIMIENTO DE EJECUCION (18.5 mm)
    // =========================================================================
    const procH = 18.5;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, procH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('5.- PROCEDIMIENTO DE EJECUCION:', marginX + 2.2, y + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    const procWrapped: string[] = [];
    resolved.procedimientoSteps.forEach((step) => {
      const sp = doc.splitTextToSize(step, contentWidth - 4.4);
      procWrapped.push(...sp);
    });
    doc.text(procWrapped.slice(0, 5), marginX + 2.2, y + 6.5, { lineHeightFactor: 1.12 });
    y += procH;

    // =========================================================================
    // 6.- TOLERANCIAS DE ACEPTACION (11.5 mm)
    // =========================================================================
    const tolH = 11.5;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, tolH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('6.- TOLERANCIAS DE ACEPTACION:', marginX + 2.2, y + 3.6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    const tolLines = doc.splitTextToSize(spec.toleranciasAceptacion || '', contentWidth - 4.4).slice(0, 2);
    doc.text(tolLines, marginX + 2.2, y + 6.7, { lineHeightFactor: 1.14 });
    y += tolH;

    // =========================================================================
    // 7.- ENSAYOS A REALIZAR (9.0 mm)
    // =========================================================================
    const ensH = 9.0;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, ensH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('7.- ENSAYOS A REALIZAR:', marginX + 2.2, y + 5.0);

    const ensRaw = (spec.ensayosARealizar || 'NO APLICA').trim();
    if (ensRaw.toUpperCase() === 'NO APLICA') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('NO APLICA', pageWidth - marginX - 2.2, y + 5.0, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.1);
      const ensLines = doc.splitTextToSize(ensRaw, contentWidth - 42).slice(0, 2);
      const ensY = ensLines.length === 1 ? y + 5.0 : y + 3.8;
      doc.text(ensLines, pageWidth - marginX - 2.2, ensY, {
        align: 'right',
        lineHeightFactor: 1.15,
      });
    }
    y += ensH;

    // =========================================================================
    // 8.- MATERIALES (7 fixed rows grid)
    // =========================================================================
    const matPadded = Array.from({ length: 7 }).map((_, idx) => {
      const m = item.apu.materiales[idx];
      return [
        m ? m.descripcion : '',
        m ? m.unidad : '',
        m ? fmtVe(m.cantidad, 2) : '',
        '',
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['8.- MATERIALES:', 'Unidad', 'Cantidad', 'OBSERVACIONES']],
      body: matPadded,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.1,
        cellPadding: 0.8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        minCellHeight: 3.8,
        valign: 'middle',
      },
      headStyles: {
        fillColor: peach,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6.5,
        lineWidth: 0.3,
        minCellHeight: 4.5,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.56, halign: 'left' },
        1: { cellWidth: contentWidth * 0.11, halign: 'center' },
        2: { cellWidth: contentWidth * 0.13, halign: 'center' },
        3: { cellWidth: contentWidth * 0.2, halign: 'center' },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY;

    // =========================================================================
    // 9.- DESPERDICIO (7.0 mm)
    // =========================================================================
    const despH = 7.0;
    doc.setFillColor(...peach);
    doc.rect(marginX, y, contentWidth, despH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('9.- DESPERDICIO:', marginX + 2.2, y + 4.6);

    // Checkbox 1: APLICA
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.rect(marginX + 36, y + 1.6, 3.8, 3.8, 'FD');
    if (resolved.desperdicioAplica) {
      doc.setTextColor(0, 0, 0);
      doc.text('X', marginX + 37.9, y + 4.5, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);
    doc.text('APLICA', marginX + 41.5, y + 4.6);

    // Checkbox 2: NO APLICA (explicitly reset white fill before drawing rect!)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.rect(marginX + 62, y + 1.6, 3.8, 3.8, 'FD');
    if (!resolved.desperdicioAplica) {
      doc.setTextColor(0, 0, 0);
      doc.text('X', marginX + 63.9, y + 4.5, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);
    doc.text('NO APLICA', marginX + 67.5, y + 4.6);

    // Right: MÁXIMO PERMITIDO
    doc.setTextColor(0, 0, 0);
    doc.text(
      `MÁXIMO PERMITIDO: ${resolved.desperdicioMaximoLabel}`,
      pageWidth - marginX - 2.2,
      y + 4.6,
      { align: 'right' }
    );
    y += despH;

    // =========================================================================
    // 10.- EQUIPOS (6 fixed rows grid)
    // =========================================================================
    const eqPadded = Array.from({ length: 6 }).map((_, idx) => {
      const e = item.apu.equipos[idx];
      return [
        e ? e.descripcion : '',
        e ? fmtVe(e.cantidad, 2) : '',
        '',
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['10.- EQUIPOS:', 'Cantidad', 'OBSERVACIONES']],
      body: eqPadded,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.1,
        cellPadding: 0.8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        minCellHeight: 3.8,
        valign: 'middle',
      },
      headStyles: {
        fillColor: peach,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6.5,
        lineWidth: 0.3,
        minCellHeight: 4.5,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.67, halign: 'left' },
        1: { cellWidth: contentWidth * 0.13, halign: 'center' },
        2: { cellWidth: contentWidth * 0.2, halign: 'center' },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY;

    // =========================================================================
    // 11.- MANO DE OBRA (5 fixed rows grid)
    // =========================================================================
    const moPadded = Array.from({ length: 5 }).map((_, idx) => {
      const m = item.apu.manoDeObra[idx];
      return [
        m ? m.descripcion : '',
        m ? fmtVe(m.cantidad, 2) : '',
        '',
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['11.- MANO DE OBRA:', 'Cantidad', 'OBSERVACIONES']],
      body: moPadded,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.1,
        cellPadding: 0.8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.25,
        minCellHeight: 3.8,
        valign: 'middle',
      },
      headStyles: {
        fillColor: peach,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6.5,
        lineWidth: 0.3,
        minCellHeight: 4.5,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.67, halign: 'left' },
        1: { cellWidth: contentWidth * 0.13, halign: 'center' },
        2: { cellWidth: contentWidth * 0.2, halign: 'center' },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY;

    // =========================================================================
    // 12.- PLANOS (7.0 mm)
    // =========================================================================
    const plaH = 7.0;
    doc.setFillColor(...peach);
    doc.rect(marginX, y, contentWidth, plaH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('12.- PLANOS:', marginX + 2.2, y + 4.6);

    // Checkbox 1: APLICA
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.rect(marginX + 36, y + 1.6, 3.8, 3.8, 'FD');
    if (resolved.planosAplica) {
      doc.setTextColor(0, 0, 0);
      doc.text('X', marginX + 37.9, y + 4.5, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);
    doc.text('APLICA', marginX + 41.5, y + 4.6);

    // Checkbox 2: NO APLICA (explicitly reset white fill before drawing rect!)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.rect(marginX + 62, y + 1.6, 3.8, 3.8, 'FD');
    if (!resolved.planosAplica) {
      doc.setTextColor(0, 0, 0);
      doc.text('X', marginX + 63.9, y + 4.5, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);
    doc.text('NO APLICA', marginX + 67.5, y + 4.6);

    // Right: Nº DE PLANO
    doc.setTextColor(0, 0, 0);
    doc.text(`Nº DE PLANO: ${resolved.planosLabel}`, pageWidth - marginX - 2.2, y + 4.6, {
      align: 'right',
    });
    y += plaH;

    // =========================================================================
    // 13.- CONDICIONES ESPECIALES (10.5 mm)
    // =========================================================================
    const condH = 10.5;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, condH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.text('13.- CONDICIONES ESPECIALES:', marginX + 2.2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    const condLines = doc
      .splitTextToSize(spec.condicionesEspeciales || 'NO APLICA', contentWidth - 4.4)
      .slice(0, 2);
    doc.text(condLines, marginX + 2.2, y + 6.4, { lineHeightFactor: 1.12 });
    y += condH;

    // =========================================================================
    // 14.- MEDIDA Y FORMA DE PAGO (11.0 mm)
    // =========================================================================
    const medH = 11.0;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, medH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.text('14.- MEDIDA Y FORMA DE PAGO:', marginX + 2.2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    const medLines = doc
      .splitTextToSize(spec.medidaYFormaPago || '', contentWidth - 4.4)
      .slice(0, 2);
    doc.text(medLines, marginX + 2.2, y + 6.4, { lineHeightFactor: 1.12 });
    y += medH;

    // =========================================================================
    // 15.- NO CONFORMIDAD (11.5 mm)
    // =========================================================================
    const noConfH = 11.5;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, contentWidth, noConfH, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.text('15.- NO CONFORMIDAD:', marginX + 2.2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    const ncLines = doc
      .splitTextToSize(spec.noConformidad || '', contentWidth - 4.4)
      .slice(0, 2);
    doc.text(ncLines, marginX + 2.2, y + 6.4, { lineHeightFactor: 1.12 });
    y += noConfH;

    // =========================================================================
    // SIGNATURES BLOCK (3 Columns, 24.0 mm)
    // =========================================================================
    const sigH = 24.0;
    const sigColW = contentWidth / 3;
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, sigColW, sigH, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + sigColW, y, sigColW, sigH, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + sigColW * 2, y, sigColW, sigH, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Realizado por:', marginX + sigColW * 0.5, y + 4.2, { align: 'center' });
    doc.text('Revisado por:', marginX + sigColW * 1.5, y + 4.2, { align: 'center' });
    doc.text('Aprobado por:', marginX + sigColW * 2.5, y + 4.2, { align: 'center' });

    // Column 1: Realizado por
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.3);
    const realLines = doc.splitTextToSize(membrete.realizadoPorLinea1, sigColW - 4).slice(0, 2);
    doc.text(realLines, marginX + sigColW * 0.5, y + 14.5, {
      align: 'center',
      lineHeightFactor: 1.12,
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.0);
    doc.text(membrete.realizadoPorLinea2, marginX + sigColW * 0.5, y + 20.5, { align: 'center' });

    // Column 2: Revisado por
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(membrete.revisadoPorNombre, marginX + sigColW * 1.5, y + 15.0, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    const revCargoLines = doc.splitTextToSize(membrete.revisadoPorCargo, sigColW - 4).slice(0, 2);
    doc.text(revCargoLines, marginX + sigColW * 1.5, y + 18.5, {
      align: 'center',
      lineHeightFactor: 1.12,
    });

    // Column 3: Aprobado por
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(membrete.aprobadoPorNombre, marginX + sigColW * 2.5, y + 15.0, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    const aprCargoLines = doc.splitTextToSize(membrete.aprobadoPorCargo, sigColW - 4).slice(0, 2);
    doc.text(aprCargoLines, marginX + sigColW * 2.5, y + 18.5, {
      align: 'center',
      lineHeightFactor: 1.12,
    });
  });

  return doc;
}

export function exportEspecificacionAnexo3raToPdf(
  itemsToExport: PartidaItem[],
  membrete: Anexo3raMembretePdf,
  filename?: string
): void {
  const doc = buildEspecificacionAnexo3raPdfDoc(itemsToExport, membrete);
  const outName =
    filename ||
    (itemsToExport.length === 1
      ? `Especificacion_Anexo3RA_Partida_${String(itemsToExport[0].id).padStart(3, '0')}.pdf`
      : `Cuadernillo_Especificaciones_Anexo3RA_PDVSA_${PROJECT_INFO.solped}.pdf`);
  doc.save(outName);
}


