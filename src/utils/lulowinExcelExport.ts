import ExcelJS from 'exceljs';
import { PartidaItem } from '../types/costTypes';
import { buildLulowinDatabase } from './lulowinNormalizer';

/**
 * Exports all 11 LuloWin / Maprex tables into a single formatted Excel (.xlsx) file,
 * strictly matching the schema and layout shown in the Microsoft Access / Excel screenshots:
 *
 * 1. ObraApun: [CodObr, NumPar, CodPar, RenPar, CanPar, PreUni]
 * 2. ObraApinMate: [CodObr, CodPar, NumPar, CodIns, CanIns, CosIns, Desper]
 * 3. ObraApinEqui: [CodObr, CodPar, NumPar, CodIns, CanIns, CosIns, Deprec]
 * 4. ObraApinMano: [CodObr, CodPar, NumPar, CodIns, CanIns, CosIns]
 * 5. ObraPart: [CodPar, Descri, UniPar, RenPar, PreUni, CanPar]
 * 6. ObraMate: [CodMat, CodFam, Descri, UniMat, CosMat, Desper]
 * 7. ObraMano: [CodMan, CodFam, Descri, Salari]
 * 8. ObraEqui: [CodeEqu, CodFam, Descri, CosEqu, CosDia, Deprec]
 * 9. ObraPainMate: [CodPar, CodIns, CanIns, Desper]
 * 10. ObraPainEqui: [CodPar, CodIns, CanIns, Deprec]
 * 11. ObraPainMano: [CodPar, CodIns, CanIns]
 */
export async function exportLulowinToExcel(
  items: PartidaItem[],
  obraCode: string = 'ZXV',
  fcasPorc: number = 1200,
  adminPorc: number = 12.5,
  utilidadPorc: number = 35.0
): Promise<void> {
  const db = buildLulowinDatabase(items, obraCode, fcasPorc, adminPorc, utilidadPorc);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PDVSA - Sistema de Gestión de Obras LuloWin';
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' }, // Slate gray header as in MS Access / Excel screenshot
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF475569' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } },
  };

  const dataBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // Helper to format table sheet
  const createTableSheet = (
    sheetName: string,
    columns: { header: string; key: string; width: number; align?: 'left' | 'center' | 'right'; numFmt?: string }[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[]
  ) => {
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    });

    ws.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    // Header row styling
    const headerRow = ws.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = headerFill;
      cell.border = headerBorder;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: columns[colNumber - 1]?.align || 'center',
      };
    });

    // Populate rows
    data.forEach((rowObj) => {
      const row = ws.addRow(rowObj);
      row.height = 19;
      row.eachCell((cell, colNumber) => {
        cell.border = dataBorder;
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
        const colDef = columns[colNumber - 1];
        if (colDef) {
          cell.alignment = {
            vertical: 'middle',
            horizontal: colDef.align || (typeof cell.value === 'number' ? 'right' : 'left'),
          };
          if (colDef.numFmt && typeof cell.value === 'number') {
            cell.numFmt = colDef.numFmt;
          } else if (typeof cell.value === 'string') {
            cell.numFmt = '@';
          }
        }
      });
    });
  };


  // 1. ObraApun
  createTableSheet(
    'ObraApun',
    [
      { header: 'CodObr', key: 'CodObr', width: 14, align: 'left' },
      { header: 'NumPar', key: 'NumPar', width: 12, align: 'right', numFmt: '#,##0' },
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'RenPar', key: 'RenPar', width: 14, align: 'right', numFmt: '#,##0.00' },
      { header: 'CanPar', key: 'CanPar', width: 14, align: 'right', numFmt: '#,##0.00' },
      { header: 'PreUni', key: 'PreUni', width: 16, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraApun
  );

  // 2. ObraApinMate
  createTableSheet(
    'ObraApinMate',
    [
      { header: 'CodObr', key: 'CodObr', width: 14, align: 'left' },
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'NumPar', key: 'NumPar', width: 12, align: 'right', numFmt: '#,##0' },
      { header: 'CodIns', key: 'CodIns', width: 14, align: 'left' },
      { header: 'CanIns', key: 'CanIns', width: 14, align: 'right', numFmt: '#,##0.0000' },
      { header: 'CosIns', key: 'CosIns', width: 16, align: 'right', numFmt: '#,##0.00' },
      { header: 'Desper', key: 'Desper', width: 12, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraApinMate
  );

  // 3. ObraApinEqui
  createTableSheet(
    'ObraApinEqui',
    [
      { header: 'CodObr', key: 'CodObr', width: 14, align: 'left' },
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'NumPar', key: 'NumPar', width: 12, align: 'right', numFmt: '#,##0' },
      { header: 'CodIns', key: 'CodIns', width: 14, align: 'left' },
      { header: 'CanIns', key: 'CanIns', width: 14, align: 'right', numFmt: '#,##0.00' },
      { header: 'CosIns', key: 'CosIns', width: 16, align: 'right', numFmt: '#,##0.00' },
      { header: 'Deprec', key: 'Deprec', width: 14, align: 'right', numFmt: '#,##0.000000' },
    ],
    db.obraApinEqui
  );

  // 4. ObraApinMano
  createTableSheet(
    'ObraApinMano',
    [
      { header: 'CodObr', key: 'CodObr', width: 14, align: 'left' },
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'NumPar', key: 'NumPar', width: 12, align: 'right', numFmt: '#,##0' },
      { header: 'CodIns', key: 'CodIns', width: 14, align: 'left' },
      { header: 'CanIns', key: 'CanIns', width: 14, align: 'right', numFmt: '#,##0.00' },
      { header: 'CosIns', key: 'CosIns', width: 16, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraApinMano
  );

  // 5. ObraPart
  createTableSheet(
    'ObraPart',
    [
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'Descri', key: 'Descri', width: 60, align: 'left' },
      { header: 'UniPar', key: 'UniPar', width: 12, align: 'center' },
      { header: 'RenPar', key: 'RenPar', width: 14, align: 'right', numFmt: '#,##0.00' },
      { header: 'PreUni', key: 'PreUni', width: 16, align: 'right', numFmt: '#,##0.00' },
      { header: 'CanPar', key: 'CanPar', width: 12, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraPart
  );

  // 6. ObraMate
  createTableSheet(
    'ObraMate',
    [
      { header: 'CodMat', key: 'CodMat', width: 14, align: 'left' },
      { header: 'CodFam', key: 'CodFam', width: 12, align: 'center' },
      { header: 'Descri', key: 'Descri', width: 55, align: 'left' },
      { header: 'UniMat', key: 'UniMat', width: 12, align: 'center' },
      { header: 'CosMat', key: 'CosMat', width: 16, align: 'right', numFmt: '#,##0.00' },
      { header: 'Desper', key: 'Desper', width: 12, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraMate
  );

  // 7. ObraMano
  createTableSheet(
    'ObraMano',
    [
      { header: 'CodMan', key: 'CodMan', width: 14, align: 'left' },
      { header: 'CodFam', key: 'CodFam', width: 12, align: 'center' },
      { header: 'Descri', key: 'Descri', width: 55, align: 'left' },
      { header: 'Salari', key: 'Salari', width: 16, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraMano
  );

  // 8. ObraEqui
  createTableSheet(
    'ObraEqui',
    [
      { header: 'CodeEqu', key: 'CodeEqu', width: 14, align: 'left' },
      { header: 'CodFam', key: 'CodFam', width: 12, align: 'center' },
      { header: 'Descri', key: 'Descri', width: 55, align: 'left' },
      { header: 'CosEqu', key: 'CosEqu', width: 16, align: 'right', numFmt: '#,##0.00' },
      { header: 'CosDia', key: 'CosDia', width: 16, align: 'right', numFmt: '#,##0.00' },
      { header: 'Deprec', key: 'Deprec', width: 14, align: 'right', numFmt: '#,##0.000000' },
    ],
    db.obraEqui
  );

  // 9. ObraPainMate
  createTableSheet(
    'ObraPainMate',
    [
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'CodIns', key: 'CodIns', width: 14, align: 'left' },
      { header: 'CanIns', key: 'CanIns', width: 14, align: 'right', numFmt: '#,##0.0000' },
      { header: 'Desper', key: 'Desper', width: 12, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraPainMate
  );

  // 10. ObraPainEqui
  createTableSheet(
    'ObraPainEqui',
    [
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'CodIns', key: 'CodIns', width: 14, align: 'left' },
      { header: 'CanIns', key: 'CanIns', width: 14, align: 'right', numFmt: '#,##0.00' },
      { header: 'Deprec', key: 'Deprec', width: 14, align: 'right', numFmt: '#,##0.000000' },
    ],
    db.obraPainEqui
  );

  // 11. ObraPainMano
  createTableSheet(
    'ObraPainMano',
    [
      { header: 'CodPar', key: 'CodPar', width: 14, align: 'left' },
      { header: 'CodIns', key: 'CodIns', width: 14, align: 'left' },
      { header: 'CanIns', key: 'CanIns', width: 14, align: 'right', numFmt: '#,##0.00' },
    ],
    db.obraPainMano
  );

  // Write and trigger download in browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TABLAS_DE_OBRA_LULOWIN_${obraCode}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the 3 sheets of "Insumos por Partida (3 Hojas)":
 * 1. Materiales_Por_Partida (ObraApinMate)
 * 2. Equipos_Por_Partida (ObraApinEqui)
 * 3. ManoObra_Por_Partida (ObraApinMano)
 */
export async function exportInsumosPorPartidaToExcel(
  items: PartidaItem[],
  obraCode: string = 'ZXV',
  fcasPorc: number = 1200,
  adminPorc: number = 12.5,
  utilidadPorc: number = 35.0
): Promise<void> {
  const db = buildLulowinDatabase(items, obraCode, fcasPorc, adminPorc, utilidadPorc);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PDVSA - Sistema APU (Insumos por Partida)';
  wb.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const addSheet = (
    name: string,
    cols: { header: string; key: string; width: number; numFmt?: string }[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[]
  ) => {
    const ws = wb.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
    });
    ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    const hdr = ws.getRow(1);
    hdr.height = 24;
    hdr.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    rows.forEach((r) => {
      const row = ws.addRow(r);
      row.height = 19;
      row.eachCell((cell, colNum) => {
        const colDef = cols[colNum - 1];
        cell.font = { name: 'Calibri', size: 10 };
        if (colDef?.numFmt && typeof cell.value === 'number') {
          cell.numFmt = colDef.numFmt;
        }
      });
    });
  };

  addSheet(
    '1_Materiales_Partida',
    [
      { header: 'CodObr', key: 'CodObr', width: 12 },
      { header: 'NumPar', key: 'NumPar', width: 12, numFmt: '#,##0' },
      { header: 'CodPar', key: 'CodPar', width: 12 },
      { header: 'CodIns', key: 'CodIns', width: 14 },
      { header: 'CanIns', key: 'CanIns', width: 14, numFmt: '#,##0.0000' },
      { header: 'CosIns ($)', key: 'CosIns', width: 16, numFmt: '#,##0.00' },
      { header: 'Desper (%)', key: 'Desper', width: 12, numFmt: '#,##0.00' },
    ],
    db.obraApinMate
  );

  addSheet(
    '2_Equipos_Partida',
    [
      { header: 'CodObr', key: 'CodObr', width: 12 },
      { header: 'NumPar', key: 'NumPar', width: 12, numFmt: '#,##0' },
      { header: 'CodPar', key: 'CodPar', width: 12 },
      { header: 'CodIns', key: 'CodIns', width: 14 },
      { header: 'CanIns', key: 'CanIns', width: 14, numFmt: '#,##0.00' },
      { header: 'CosIns ($)', key: 'CosIns', width: 16, numFmt: '#,##0.00' },
      { header: 'Deprec', key: 'Deprec', width: 14, numFmt: '#,##0.000000' },
    ],
    db.obraApinEqui
  );

  addSheet(
    '3_ManoObra_Partida',
    [
      { header: 'CodObr', key: 'CodObr', width: 12 },
      { header: 'NumPar', key: 'NumPar', width: 12, numFmt: '#,##0' },
      { header: 'CodPar', key: 'CodPar', width: 12 },
      { header: 'CodIns', key: 'CodIns', width: 14 },
      { header: 'CanIns', key: 'CanIns', width: 14, numFmt: '#,##0.00' },
      { header: 'Jornal Base ($)', key: 'CosIns', width: 16, numFmt: '#,##0.00' },
    ],
    db.obraApinMano
  );

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `INSUMOS_POR_PARTIDA_3_HOJAS_${obraCode}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

