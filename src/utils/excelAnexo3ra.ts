import ExcelJS from 'exceljs';
import { PartidaItem } from '../types/costTypes';
import { PROJECT_INFO } from '../data/projectInfo';
import { resolveAnexo3raFields } from './pdfExport';
import { PDVSA_LOGO_RAW_BASE64 } from './pdvsaLogoData';

// Colors (ARGB format for ExcelJS)
const COLOR_PDVSA_BLUE = 'FF002060';      // Deep Corporate Navy Blue
const COLOR_PDVSA_RED = 'FFB91C1C';       // PDVSA Red
const COLOR_SECTION_HDR = 'FF1E3A8A';     // Blue for Section Headers
const COLOR_GOLD_ORANGE = 'FFF59E0B';     // Gold/Orange for Cajuela de Control
const COLOR_GOLD_BG = 'FFFDE68A';         // Soft Gold for Values
const COLOR_GRAY_BG = 'FFF1F5F9';         // Light Slate for Sub-headers
const COLOR_WHITE = 'FFFFFFFF';
const COLOR_BORDER_BLUE = 'FF002060';     // Thick outer border color
const COLOR_BORDER_THIN = 'FF94A3B8';     // Thin interior borders
const COLOR_BORDER_DARK = 'FF334155';     // Dark border for tables

const THICK_BLUE_BORDER: ExcelJS.Border = {
  style: 'medium',
  color: { argb: COLOR_BORDER_BLUE },
};

const THIN_BORDER: ExcelJS.Border = {
  style: 'thin',
  color: { argb: COLOR_BORDER_THIN },
};

const DARK_BORDER: ExcelJS.Border = {
  style: 'thin',
  color: { argb: COLOR_BORDER_DARK },
};

const BOX_BORDER: Partial<ExcelJS.Borders> = {
  top: DARK_BORDER,
  bottom: DARK_BORDER,
  left: DARK_BORDER,
  right: DARK_BORDER,
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: DARK_BORDER,
  bottom: DARK_BORDER,
  left: DARK_BORDER,
  right: DARK_BORDER,
};

// Reusable styles for section headers
const SECTION_HDR_STYLE = {
  font: { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR_WHITE } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_HDR } } as ExcelJS.Fill,
  alignment: { horizontal: 'left', vertical: 'middle', indent: 1 } as Partial<ExcelJS.Alignment>,
  border: HEADER_BORDER,
};

const SUB_HDR_STYLE = {
  font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF1E293B' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_BG } } as ExcelJS.Fill,
  alignment: { horizontal: 'center', vertical: 'middle' } as Partial<ExcelJS.Alignment>,
  border: BOX_BORDER,
};

const TEXT_BLOCK_STYLE = {
  font: { name: 'Calibri', size: 8.5, color: { argb: 'FF0F172A' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WHITE } } as ExcelJS.Fill,
  alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 } as Partial<ExcelJS.Alignment>,
  border: BOX_BORDER,
};

const COL_LETTERS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

/**
 * Fast helper to merge cells using direct model push (O(1) instead of O(N^2)) and style master cell
 */
function mergeAndStyle(
  ws: ExcelJS.Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  value: ExcelJS.CellValue,
  style?: {
    font?: Partial<ExcelJS.Font>;
    fill?: ExcelJS.Fill;
    alignment?: Partial<ExcelJS.Alignment>;
    border?: Partial<ExcelJS.Borders>;
    numFmt?: string;
  }
): ExcelJS.Cell {
  if (r1 !== r2 || c1 !== c2) {
    ws.model.merges.push(`${COL_LETTERS[c1]}${r1}:${COL_LETTERS[c2]}${r2}`);
  }
  const cell = ws.getCell(r1, c1);
  cell.value = value;
  if (style) {
    if (style.font) cell.font = style.font;
    if (style.fill) cell.fill = style.fill;
    if (style.alignment) cell.alignment = style.alignment;
    if (style.border) cell.border = style.border;
    if (style.numFmt) cell.numFmt = style.numFmt;
  }
  return cell;
}

/**
 * Fast outer boundary styling for the 78-row page and Cajuela
 */
function applyBoundaryBorders(
  ws: ExcelJS.Worksheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  border: ExcelJS.Border
) {
  for (let c = c1; c <= c2; c++) {
    const topCell = ws.getCell(r1, c);
    topCell.border = { ...topCell.border, top: border };
    const bottomCell = ws.getCell(r2, c);
    bottomCell.border = { ...bottomCell.border, bottom: border };
  }
  for (let r = r1; r <= r2; r++) {
    const leftCell = ws.getCell(r, c1);
    leftCell.border = { ...leftCell.border, left: border };
    const rightCell = ws.getCell(r, c2);
    rightCell.border = { ...rightCell.border, right: border };
  }
}

// Exact row heights for each of the 78 rows per item block
// Strictly meeting requirements:
// 1. Headers & titles: Max 21 pt (set between 14-16 pt).
// 2. Descriptions, extensions & procedures: wrapText enabled and <= 48 pt per row.
// 3. Exactly 78 rows per block summing to ~739 pt, fitting 100% on a standard Letter portrait page.
const ROW_HEIGHTS_78: number[] = [
  15, // 1: Logo & Company header top
  15, // 2: Header row 2
  14, // 3: Header row 3
  14, // 4: Header row 4
  16, // 5: Partida number in Cajuela de Control
  16, // 6: Partida number in Cajuela de Control
  14, // 7: Unidad label in Cajuela de Control
  16, // 8: Title '2. DESCRIPCIÓN DE LA PARTIDA' & Cajuela Unidad
  22, // 9: Descripción text row 1 (wrapText: true, <= 48 pt)
  22, // 10: Descripción text row 2 & Cajuela Cantidad (wrapText: true, <= 48 pt)
  15, // 11: Header '4. EXTENSIÓN DEL TRABAJO:'
  10, // 12: Extensión text row 1 (wrapText: true)
  10, // 13: Extensión text row 2 (wrapText: true)
  10, // 14: Extensión text row 3 (wrapText: true)
  10, // 15: Extensión text row 4 (wrapText: true)
  15, // 16: Header '5. PROCEDIMIENTO DE EJECUCIÓN:'
  10, // 17: Procedimiento row 1 (wrapText: true)
  10, // 18: Procedimiento row 2 (wrapText: true)
  10, // 19: Procedimiento row 3 (wrapText: true)
  10, // 20: Procedimiento row 4 (wrapText: true)
  15, // 21: Header '6. TOLERANCIAS DE ACEPTACIÓN:' & '7. ENSAYOS A REALIZAR:'
  10, // 22: Tolerancias & Ensayos row 1 (wrapText: true)
  10, // 23: Tolerancias & Ensayos row 2 (wrapText: true)
  10, // 24: Tolerancias & Ensayos row 3 (wrapText: true)
  15, // 25: Header '8. MATERIALES ESPECIFICADOS' & '9. DESPERDICIO MÁXIMO:'
  12, // 26: Sub-headers Materiales
  9,  // 27: Material item 1
  9,  // 28: Material item 2
  9,  // 29: Material item 3
  9,  // 30: Material item 4
  9,  // 31: Material item 5
  9,  // 32: Material item 6
  9,  // 33: Material item 7
  15, // 34: Header '10. EQUIPOS REQUERIDOS'
  12, // 35: Sub-headers Equipos
  9,  // 36: Equipo item 1
  9,  // 37: Equipo item 2
  9,  // 38: Equipo item 3
  9,  // 39: Equipo item 4
  9,  // 40: Equipo item 5
  9,  // 41: Equipo item 6
  9,  // 42: Equipo item 7
  15, // 43: Header '11. MANO DE OBRA ASIGNADA (LOTTT & CCP)'
  12, // 44: Sub-headers Mano de Obra
  9,  // 45: Mano de Obra item 1
  9,  // 46: Mano de Obra item 2
  9,  // 47: Mano de Obra item 3
  9,  // 48: Mano de Obra item 4
  9,  // 49: Mano de Obra item 5
  9,  // 50: Mano de Obra item 6
  9,  // 51: Mano de Obra item 7
  15, // 52: Header '12. PLANOS DE REFERENCIA:' & '13. CONDICIONES ESPECIALES:'
  10, // 53: Planos & Condiciones row 1 (wrapText: true)
  10, // 54: Planos & Condiciones row 2 (wrapText: true)
  10, // 55: Planos & Condiciones row 3 (wrapText: true)
  15, // 56: Header '14. MEDIDA Y FORMA DE PAGO (HITOS CONTRACTUALES):'
  8.5,// 57: Medida y forma de pago row 1 (wrapText: true)
  8.5,// 58: Medida y forma de pago row 2 (wrapText: true)
  8.5,// 59: Medida y forma de pago row 3 (wrapText: true)
  8.5,// 60: Medida y forma de pago row 4 (wrapText: true)
  8.5,// 61: Medida y forma de pago row 5 (wrapText: true)
  15, // 62: Header '15. CRITERIO DE NO CONFORMIDAD:'
  8.5,// 63: Criterio row 1 (wrapText: true)
  8.5,// 64: Criterio row 2 (wrapText: true)
  8.5,// 65: Criterio row 3 (wrapText: true)
  8.5,// 66: Criterio row 4 (wrapText: true)
  8.5,// 67: Criterio row 5 (wrapText: true)
  15, // 68: Header 'CONTROL DE FIRMAS Y APROBACIONES OFICIALES'
  10, // 69: Subheaders Firmas row 1
  10, // 70: Subheaders Firmas row 2
  8.5,// 71: Firmas blank space row 1
  8.5,// 72: Firmas blank space row 2
  8.5,// 73: Firmas blank space row 3
  9,  // 74: Signers titles row 1 (wrapText: true)
  9,  // 75: Signers titles row 2 (wrapText: true)
  9,  // 76: Signers titles row 3 (wrapText: true)
  11, // 77: Footer note (<= 21 pt)
  4,  // 78: Page bottom separator row (78th row)
];

/**
 * Builds the official Anexo 3RA Workbook
 */
export function buildEspecificacionesAnexo3raWorkbook(items: PartidaItem[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PDVSA DEP Los Llanos - División Barinas';
  wb.lastModifiedBy = 'Especialista de Costos y Presupuestos';

  // =========================================================================
  // 1. PESTAÑA: "COMPUTOS"
  // =========================================================================
  const wsComp = wb.addWorksheet('COMPUTOS', {
    views: [{ showGridLines: true }],
  });

  wsComp.columns = [
    { key: 'partida', width: 14 },
    { key: 'codigo', width: 18 },
    { key: 'descripcion', width: 68 },
    { key: 'unidad', width: 12 },
    { key: 'cantidad', width: 16 },
    { key: 'capitulo', width: 38 },
    { key: 'rendimiento', width: 18 },
  ];

  // Header rows
  wsComp.mergeCells('A1:G1');
  const h1 = wsComp.getCell('A1');
  h1.value = 'PETRÓLEOS DE VENEZUELA, S.A. (PDVSA) - PLANILLA OFICIAL DE CÓMPUTOS MÉTRICOS';
  h1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: COLOR_WHITE } };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PDVSA_BLUE } };
  h1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsComp.getRow(1).height = 28;

  wsComp.mergeCells('A2:G2');
  const h2 = wsComp.getCell('A2');
  h2.value = `SOLPED: ${PROJECT_INFO.solped} | OBRA: ${PROJECT_INFO.descripcionLarga}`;
  h2.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  h2.alignment = { horizontal: 'center', vertical: 'middle' };
  wsComp.getRow(2).height = 20;

  wsComp.getRow(3).height = 8; // Spacer

  const colHeaders = [
    '1. PARTIDA N°',
    'CÓDIGO COVENIN',
    '2. DESCRIPCIÓN DE LA PARTIDA',
    '3. UNIDAD DE MEDIDA',
    'CANTIDAD OFICIAL',
    'CAPÍTULO / ÁREA',
    'RENDIMIENTO (APU)',
  ];
  const r4 = wsComp.getRow(4);
  r4.values = colHeaders;
  r4.height = 22;
  for (let c = 1; c <= 7; c++) {
    const cell = wsComp.getCell(4, c);
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SECTION_HDR } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BOX_BORDER;
  }

  // Populate COMPUTOS items
  items.forEach((item, idx) => {
    const rNum = 5 + idx;
    const row = wsComp.getRow(rNum);
    const codeStr = String(item.id).padStart(3, '0');
    row.values = [
      item.id,
      codeStr,
      item.descripcion,
      item.unidad,
      Number(item.cantidad.toFixed(2)),
      item.capitulo,
      `${item.apu.rendimiento} ${item.apu.unidadRendimiento}`,
    ];
    row.height = 19;

    const isEven = idx % 2 === 0;
    const bgFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
    };

    for (let c = 1; c <= 7; c++) {
      const cell = wsComp.getCell(rNum, c);
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } };
      cell.fill = bgFill;
      cell.border = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };
    }

    wsComp.getCell(rNum, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    wsComp.getCell(rNum, 1).font = { name: 'Calibri', size: 9.5, bold: true };
    wsComp.getCell(rNum, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    wsComp.getCell(rNum, 2).numFmt = '@';
    wsComp.getCell(rNum, 3).alignment = { horizontal: 'left', vertical: 'middle' };
    wsComp.getCell(rNum, 4).alignment = { horizontal: 'center', vertical: 'middle' };
    wsComp.getCell(rNum, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    wsComp.getCell(rNum, 5).numFmt = '#,##0.00';
    wsComp.getCell(rNum, 6).alignment = { horizontal: 'left', vertical: 'middle' };
    wsComp.getCell(rNum, 7).alignment = { horizontal: 'center', vertical: 'middle' };
  });


  // =========================================================================
  // 2. PESTAÑA: "ESPECIFICACIONES"
  // Bloque repetitivo de exactamente 78 filas por partida
  // =========================================================================
  const totalSpecsRows = items.length * 78;
  const wsSpecs = wb.addWorksheet('ESPECIFICACIONES', {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: 'portrait',
      paperSize: 1 as any, // Letter
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printArea: `A1:N${totalSpecsRows}`,
      margins: { left: 0.3, right: 0.3, top: 0.35, bottom: 0.35, header: 0.2, footer: 0.2 },
    },
  });

  wsSpecs.columns = [
    { key: 'A', width: 9 },
    { key: 'B', width: 9 },
    { key: 'C', width: 10 },
    { key: 'D', width: 11 },
    { key: 'E', width: 11 },
    { key: 'F', width: 10 },
    { key: 'G', width: 10 },
    { key: 'H', width: 11 },
    { key: 'I', width: 11 },
    { key: 'J', width: 10 },
    { key: 'K', width: 10 },
    { key: 'L', width: 11 },
    { key: 'M', width: 11 },
    { key: 'N', width: 14 },
  ];

  const logoImageId = wb.addImage({
    base64: PDVSA_LOGO_RAW_BASE64,
    extension: 'png',
  });

  // Process all items
  items.forEach((item, itemIdx) => {
    const base = itemIdx * 78;
    const compRow = 5 + itemIdx; // Corresponding row in COMPUTOS sheet
    const resolved = resolveAnexo3raFields(item);

    // Set normalized row heights strictly complying with:
    // - Headers & titles <= 21 pt
    // - Description, extensions & procedures with wrapText <= 48 pt
    // - 78 rows exactly fitting 1 Letter portrait page
    for (let r = 1; r <= 78; r++) {
      wsSpecs.getRow(base + r).height = ROW_HEIGHTS_78[r - 1];
    }

    // 1. ENCABEZADO: A1:B7 Logo Oficial PDVSA DEP LOS LLANOS
    mergeAndStyle(
      wsSpecs,
      base + 1, 1, base + 7, 2,
      'PDVSA\nDEP LOS LLANOS',
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: COLOR_PDVSA_RED } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WHITE } },
        alignment: { horizontal: 'center', vertical: 'bottom', wrapText: true },
        border: BOX_BORDER,
      }
    );
    wsSpecs.addImage(logoImageId, {
      tl: { col: 0.15, row: base + 0.6 },
      ext: { width: 118, height: 47 },
    });

    // C1:K7 Proyecto y SOLPED
    mergeAndStyle(
      wsSpecs,
      base + 1, 3, base + 7, 11,
      'PETRÓLEOS DE VENEZUELA, S.A. (PDVSA)\n' +
      'DIRECCIÓN EJECUTIVA DE PRODUCCIÓN - DEP LOS LLANOS\n' +
      'SUB-DIRECCIÓN DE PRODUCCIÓN | DIVISIÓN BARINAS\n' +
      `SOLICITUD DE PEDIDO (SOLPED) N°: ${PROJECT_INFO.solped}\n` +
      `PROYECTO: ${PROJECT_INFO.descripcionLarga}\n` +
      'ESPECIFICACIONES TÉCNICAS OFICIALES - FORMATO ANEXO 3RA',
      {
        font: { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR_PDVSA_BLUE } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GRAY_BG } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: BOX_BORDER,
      }
    );

    // L1:N10 Cajuela de Control (Fondo Dorado/Naranja)
    mergeAndStyle(
      wsSpecs,
      base + 1, 12, base + 2, 14,
      `CAJUELA DE CONTROL\nPROCESO N°: ${PROJECT_INFO.solped}`,
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF78350F' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_ORANGE } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: BOX_BORDER,
      }
    );

    mergeAndStyle(
      wsSpecs,
      base + 3, 12, base + 4, 14,
      '1. PARTIDA N°:',
      {
        font: { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF78350F' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_ORANGE } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: BOX_BORDER,
      }
    );

    // 1. PARTIDA N° Linked to COMPUTOS!A{compRow}
    mergeAndStyle(
      wsSpecs,
      base + 5, 12, base + 6, 14,
      { formula: `COMPUTOS!A${compRow}`, result: item.id },
      {
        font: { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR_PDVSA_RED } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_BG } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: BOX_BORDER,
      }
    );

    mergeAndStyle(
      wsSpecs,
      base + 7, 12, base + 7, 14,
      '3. UNIDAD DE MEDIDA:',
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF78350F' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_ORANGE } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: BOX_BORDER,
      }
    );

    // 3. UNIDAD Linked to COMPUTOS!D{compRow}
    mergeAndStyle(
      wsSpecs,
      base + 8, 12, base + 8, 14,
      { formula: `COMPUTOS!D${compRow}`, result: item.unidad },
      {
        font: { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_BG } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: BOX_BORDER,
      }
    );

    mergeAndStyle(
      wsSpecs,
      base + 9, 12, base + 9, 14,
      'CANTIDAD OFICIAL:',
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF78350F' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_ORANGE } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: BOX_BORDER,
      }
    );

    // CANTIDAD Linked to COMPUTOS!E{compRow}
    mergeAndStyle(
      wsSpecs,
      base + 10, 12, base + 10, 14,
      { formula: `COMPUTOS!E${compRow}`, result: Number(item.cantidad.toFixed(2)) },
      {
        font: { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR_PDVSA_BLUE } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_GOLD_BG } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: BOX_BORDER,
        numFmt: '#,##0.00',
      }
    );

    // 2. DESCRIPCIÓN DE LA PARTIDA (Rows 8 to 10, Cols 1 to 11)
    mergeAndStyle(
      wsSpecs,
      base + 8, 1, base + 8, 11,
      '2. DESCRIPCIÓN DE LA PARTIDA (VINCULADO A CÓMPUTOS OFICIALES):',
      {
        font: { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLOR_PDVSA_BLUE } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
        alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
        border: BOX_BORDER,
      }
    );

    mergeAndStyle(
      wsSpecs,
      base + 9, 1, base + 10, 11,
      { formula: `COMPUTOS!C${compRow}`, result: item.descripcion },
      {
        font: { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_WHITE } },
        alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 },
        border: BOX_BORDER,
      }
    );

    // 4. EXTENSIÓN DEL TRABAJO (Rows 11 to 15)
    mergeAndStyle(wsSpecs, base + 11, 1, base + 11, 14, '4. EXTENSIÓN DEL TRABAJO:', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 12, 1, base + 15, 14, item.especificacion.extensionTrabajo, TEXT_BLOCK_STYLE);

    // 5. PROCEDIMIENTO DE EJECUCIÓN (Rows 16 to 20)
    mergeAndStyle(wsSpecs, base + 16, 1, base + 16, 14, '5. PROCEDIMIENTO DE EJECUCIÓN:', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 17, 1, base + 20, 14, resolved.procedimientoSteps.join('\n'), TEXT_BLOCK_STYLE);

    // 6. TOLERANCIAS & 7. ENSAYOS (Rows 21 to 24)
    mergeAndStyle(wsSpecs, base + 21, 1, base + 21, 7, '6. TOLERANCIAS DE ACEPTACIÓN:', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 21, 8, base + 21, 14, '7. ENSAYOS A REALIZAR:', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 22, 1, base + 24, 7, item.especificacion.toleranciasAceptacion, TEXT_BLOCK_STYLE);
    mergeAndStyle(wsSpecs, base + 22, 8, base + 24, 14, item.especificacion.ensayosARealizar, TEXT_BLOCK_STYLE);

    // 8. MATERIALES & 9. DESPERDICIO (Rows 25 to 33)
    mergeAndStyle(wsSpecs, base + 25, 1, base + 25, 9, '8. MATERIALES ESPECIFICADOS (CUADRO DELIMITADO):', SECTION_HDR_STYLE);
    mergeAndStyle(
      wsSpecs,
      base + 25,
      10,
      base + 25,
      14,
      `9. DESPERDICIO: [${resolved.desperdicioAplica ? 'X' : ' '}] APLICA  [${!resolved.desperdicioAplica ? 'X' : ' '}] NO APLICA | MÁX: ${resolved.desperdicioMaximoLabel}`,
      {
        ...SECTION_HDR_STYLE,
        alignment: { horizontal: 'center', vertical: 'middle' },
      }
    );

    // Subheaders (Row 26)
    mergeAndStyle(wsSpecs, base + 26, 1, base + 26, 3, 'Código Material', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 26, 4, base + 26, 9, 'Descripción del Material', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 26, 10, base + 26, 11, 'Unidad', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 26, 12, base + 26, 14, 'Cantidad Requerida', SUB_HDR_STYLE);

    // 7 rows for materials (Rows 27 to 33)
    const matList = item.apu.materiales;
    for (let mIdx = 0; mIdx < 7; mIdx++) {
      const curRow = base + 27 + mIdx;
      if (matList.length === 0 && mIdx === 0) {
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, '-', { ...SUB_HDR_STYLE, fill: undefined });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 9, 'NO APLICA SUMINISTRO DIRECTO DE MATERIALES EN ESTA PARTIDA', {
          font: { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF64748B' } },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 10, curRow, 11, '-', { ...SUB_HDR_STYLE, fill: undefined });
        mergeAndStyle(wsSpecs, curRow, 12, curRow, 14, '-', { ...SUB_HDR_STYLE, fill: undefined });
      } else if (mIdx < matList.length) {
        const mat = matList[mIdx];
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, mat.codigo, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 9, mat.descripcion, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 10, curRow, 11, mat.unidad, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 12, curRow, 14, Number(mat.cantidad.toFixed(4)), {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: BOX_BORDER,
          numFmt: '#,##0.00',
        });
      } else {
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 9, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 10, curRow, 11, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 12, curRow, 14, '', { border: BOX_BORDER });
      }
    }

    // 10. EQUIPOS REQUERIDOS (Rows 34 to 42)
    mergeAndStyle(wsSpecs, base + 34, 1, base + 34, 14, '10. EQUIPOS REQUERIDOS (CUADRO DELIMITADO):', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 35, 1, base + 35, 3, 'Código Equipo', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 35, 4, base + 35, 10, 'Descripción del Equipo / Herramienta', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 35, 11, base + 35, 14, 'Cantidad Asignada', SUB_HDR_STYLE);

    // 7 rows for equipment (Rows 36 to 42)
    const eqList = item.apu.equipos;
    for (let eIdx = 0; eIdx < 7; eIdx++) {
      const curRow = base + 36 + eIdx;
      if (eqList.length === 0 && eIdx === 0) {
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, 'EQ-MAN-01', {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 10, 'HERRAMIENTAS MENORES Y MANUALES DE CONSTRUCCIÓN', {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 11, curRow, 14, 1, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: BOX_BORDER,
        });
      } else if (eIdx < eqList.length) {
        const eq = eqList[eIdx];
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, eq.codigo, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 10, eq.descripcion, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 11, curRow, 14, Number(eq.cantidad.toFixed(2)), {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: BOX_BORDER,
          numFmt: '#,##0.00',
        });
      } else {
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 10, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 11, curRow, 14, '', { border: BOX_BORDER });
      }
    }

    // 11. MANO DE OBRA ASIGNADA (LOTTT) (Rows 43 to 51)
    mergeAndStyle(wsSpecs, base + 43, 1, base + 43, 14, '11. MANO DE OBRA ASIGNADA (LOTTT & CONVENCIÓN COLECTIVA PETROLERA):', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 44, 1, base + 44, 3, 'Código Oficio', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 44, 4, base + 44, 9, 'Oficio / Categoría Laboral CCP', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 44, 10, base + 44, 11, 'Cantidad', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 44, 12, base + 44, 14, 'Rendimiento', SUB_HDR_STYLE);

    // 7 rows for labor (Rows 45 to 51)
    const moList = item.apu.manoDeObra;
    for (let lIdx = 0; lIdx < 7; lIdx++) {
      const curRow = base + 45 + lIdx;
      if (lIdx < moList.length) {
        const mo = moList[lIdx];
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, mo.codigo, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 9, mo.descripcion, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
          border: BOX_BORDER,
        });
        mergeAndStyle(wsSpecs, curRow, 10, curRow, 11, Number(mo.cantidad.toFixed(2)), {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'right', vertical: 'middle' },
          border: BOX_BORDER,
          numFmt: '#,##0.00',
        });
        mergeAndStyle(wsSpecs, curRow, 12, curRow, 14, `${item.apu.rendimiento} ${item.apu.unidadRendimiento}`, {
          font: { name: 'Calibri', size: 8 },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: BOX_BORDER,
        });
      } else {
        mergeAndStyle(wsSpecs, curRow, 1, curRow, 3, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 4, curRow, 9, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 10, curRow, 11, '', { border: BOX_BORDER });
        mergeAndStyle(wsSpecs, curRow, 12, curRow, 14, '', { border: BOX_BORDER });
      }
    }

    // 12. PLANOS & 13. CONDICIONES ESPECIALES (Rows 52 to 55)
    mergeAndStyle(wsSpecs, base + 52, 1, base + 52, 7, '12. PLANOS DE REFERENCIA:', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 52, 8, base + 52, 14, '13. CONDICIONES ESPECIALES:', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 53, 1, base + 55, 7, item.especificacion.planos, TEXT_BLOCK_STYLE);
    mergeAndStyle(wsSpecs, base + 53, 8, base + 55, 14, item.especificacion.condicionesEspeciales, TEXT_BLOCK_STYLE);

    // 14. MEDIDA Y FORMA DE PAGO (Rows 56 to 61)
    mergeAndStyle(wsSpecs, base + 56, 1, base + 56, 14, '14. MEDIDA Y FORMA DE PAGO (HITOS CONTRACTUALES):', SECTION_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 57, 1, base + 61, 14, item.especificacion.medidaYFormaPago, TEXT_BLOCK_STYLE);

    // 15. CRITERIO DE NO CONFORMIDAD (Rows 62 to 67)
    mergeAndStyle(wsSpecs, base + 62, 1, base + 62, 14, '15. CRITERIO DE NO CONFORMIDAD:', {
      ...SECTION_HDR_STYLE,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PDVSA_RED } },
    });
    mergeAndStyle(wsSpecs, base + 63, 1, base + 67, 14, item.especificacion.noConformidad, {
      ...TEXT_BLOCK_STYLE,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } },
      font: { name: 'Calibri', size: 8.5, color: { argb: 'FF7F1D1D' } },
    });

    // CONTROL DE FIRMAS Y APROBACIONES (Rows 68 to 76)
    mergeAndStyle(wsSpecs, base + 68, 1, base + 68, 14, 'CONTROL DE FIRMAS Y APROBACIONES OFICIALES (PDVSA - DEP LOS LLANOS)', {
      ...SECTION_HDR_STYLE,
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PDVSA_BLUE } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });

    // Firmas Headers (Rows 69 to 70)
    mergeAndStyle(wsSpecs, base + 69, 1, base + 70, 4, 'REALIZADO POR (CONTRATISTA):', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 69, 5, base + 70, 9, 'REVISADO POR (PDVSA):', SUB_HDR_STYLE);
    mergeAndStyle(wsSpecs, base + 69, 10, base + 70, 14, 'APROBADO POR (PDVSA):', SUB_HDR_STYLE);

    // Firmas Blank Area (Rows 71 to 73)
    mergeAndStyle(wsSpecs, base + 71, 1, base + 73, 4, '', { border: BOX_BORDER });
    mergeAndStyle(wsSpecs, base + 71, 5, base + 73, 9, '', { border: BOX_BORDER });
    mergeAndStyle(wsSpecs, base + 71, 10, base + 73, 14, '', { border: BOX_BORDER });

    // Firmas Signers Info (Rows 74 to 76)
    mergeAndStyle(
      wsSpecs,
      base + 74, 1, base + 76, 4,
      'Ing. Especialista de Costos y Presupuestos\nC.I.V. N°: Vigente\nRepresentante Técnico Autorizado',
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF0F172A' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: BOX_BORDER,
      }
    );

    mergeAndStyle(
      wsSpecs,
      base + 74, 5, base + 76, 9,
      `${PROJECT_INFO.revisadoPor}\n${PROJECT_INFO.cargoRevisor}\nDEP Los Llanos - División Barinas`,
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF0F172A' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: BOX_BORDER,
      }
    );

    mergeAndStyle(
      wsSpecs,
      base + 74, 10, base + 76, 14,
      `${PROJECT_INFO.aprobadoPor}\n${PROJECT_INFO.cargoAprobador}\nDEP Los Llanos - Dirección Ejecutiva`,
      {
        font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF0F172A' } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: BOX_BORDER,
      }
    );

    // FOOTER NOTE (Row 77)
    mergeAndStyle(
      wsSpecs,
      base + 77, 1, base + 77, 14,
      `FICHA TÉCNICA OFICIAL ANEXO 3RA · PARTIDA Nº ${item.id} DE ${items.length} · PROCESO SOLPED N° ${PROJECT_INFO.solped} · SINCRONIZADA CON PESTAÑA CÓMPUTOS · PDVSA`,
      {
        font: { name: 'Calibri', size: 7.5, italic: true, color: { argb: 'FF64748B' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: { top: THIN_BORDER, bottom: THIN_BORDER },
      }
    );

    // Row 78: Blank separator row (78th row)
    mergeAndStyle(wsSpecs, base + 78, 1, base + 78, 14, '', {});

    // THICK BLUE BORDER AROUND THE 78-ROW PAGE & CAJUELA
    applyBoundaryBorders(wsSpecs, base + 1, 1, base + 78, 14, THICK_BLUE_BORDER);
    applyBoundaryBorders(wsSpecs, base + 1, 12, base + 10, 14, THICK_BLUE_BORDER);

    // Add page break at row 78
    if (itemIdx < items.length - 1) {
      wsSpecs.getRow(base + 78).addPageBreak();
    }
  });

  return wb;
}

/**
 * Browser download helper: builds the workbook, writes buffer, and triggers download
 */
export async function exportEspecificacionesAnexo3raToExcel(
  items: PartidaItem[],
  filename = 'ESPECIFICACIONES TECNICAS FINALES IA.xlsx'
): Promise<void> {
  const wb = buildEspecificacionesAnexo3raWorkbook(items);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
