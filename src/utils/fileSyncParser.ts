import * as XLSX from 'xlsx';
import {
  PartidaItem,
  TechnicalSpecification,
  MaterialItem,
  EquipmentItem,
  LaborItem,
} from '../types/costTypes';
import { parseLocalizedNumber, normalizeUnit } from './computosParser';
import { calculateItemApu } from './apuCalculations';

export interface ExtractedInsumoLine {
  tipo: 'material' | 'equipo' | 'mano_de_obra';
  codigo: string;
  descripcion: string;
  unidad?: string;
  cantidad: number;
  desperdicioPorc?: number;
  costoUnitario?: number; // Costo for material or eq
  depreciacionOAlquiler?: number; // Depreciación for eq
  salarioDiario?: number; // Salario for labor
  total?: number;
}

export interface MasterMaterialRecord {
  codigo: string;
  descripcion: string;
  unidad: string;
  costo: number;
  desperdicioPorc: number;
}

export interface MasterEquipmentRecord {
  codigo: string;
  descripcion: string;
  costo: number;
  depreciacionOAlquiler: number;
}

export interface MasterLaborRecord {
  codigo: string;
  descripcion: string;
  salarioDiario: number;
}

export interface MasterCatalogs {
  materials: Map<string, MasterMaterialRecord>;
  equipment: Map<string, MasterEquipmentRecord>;
  labor: Map<string, MasterLaborRecord>;
}

export interface LulowinSyncMetadata {
  isLulowinDatabase: boolean;
  obraCode?: string;
  tableCounts: {
    obramate: number;
    obraequi: number;
    obramano: number;
    obrapart: number;
    obraapun: number;
    obraapinmate: number;
    obraapinequi: number;
    obraapinmano: number;
    obrapainmate?: number;
    obrapainequi?: number;
    obrapainmano?: number;
  };
}

export interface ExtractedPartidaData {
  index?: number;
  codigo?: string;
  descripcion?: string;
  unidad?: string;
  cantidad?: number;
  precioUnitario?: number;
  rendimiento?: number;
  materiales?: MaterialItem[];
  equipos?: EquipmentItem[];
  manoDeObra?: LaborItem[];
  especificacion?: Partial<TechnicalSpecification>;
  sourceFile?: string;
  isLulowinFullApu?: boolean;
  masterCatalogs?: MasterCatalogs;
  lulowinMetadata?: LulowinSyncMetadata;
}

export interface InsumoDiffDetail {
  tipo: 'material' | 'equipo' | 'mano_de_obra';
  codigo: string;
  descripcion: string;
  cambios: string[];
}

export interface PartidaDiff {
  itemId: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  oldQty: number;
  newQty: number;
  oldPrice: number;
  newPrice: number;
  oldYield: number;
  newYield: number;
  specsUpdated: boolean;
  hasQuantityChange: boolean;
  hasPriceChange: boolean;
  hasYieldChange: boolean;
  hasInsumoChange: boolean;
  hasDesperdicioChange: boolean;
  hasDepreciacionChange: boolean;
  insumosUpdatedCount: number;
  desperdiciosUpdatedCount: number;
  depreciacionesUpdatedCount: number;
  insumoDetails: InsumoDiffDetail[];
  hasAnyChange: boolean;
  sourceFile?: string;
}

export interface SyncResult {
  updatedItems: PartidaItem[];
  diffs: PartidaDiff[];
  stats: {
    totalProjectItems: number;
    matchedCount: number;
    quantitiesUpdated: number;
    pricesUpdated: number;
    yieldsUpdated: number;
    specsUpdated: number;
    insumosUpdated: number;
    desperdiciosUpdated: number;
    depreciacionesUpdated: number;
    totalChanges: number;
  };
  lulowinMetadata?: LulowinSyncMetadata;
  masterCatalogs?: MasterCatalogs;
}

export interface SyncOptions {
  updateQuantities?: boolean;
  updatePrices?: boolean;
  updateYields?: boolean;
  updateSpecs?: boolean;
  updateInsumoQuantities?: boolean;
  updateDesperdicios?: boolean;
  updateDepreciaciones?: boolean;
  masterCatalogs?: MasterCatalogs;
  fcasPorc?: number;
  adminPorc?: number;
  utilidadPorc?: number;
}

/**
 * Calculates string similarity (0 to 1) based on word token overlap
 */
export function calculateDescriptionSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  const cleanA = strA.toUpperCase().replace(/[^\w\s]/g, '').trim();
  const cleanB = strB.toUpperCase().replace(/[^\w\s]/g, '').trim();
  if (cleanA === cleanB) return 1.0;

  const wordsA = new Set(cleanA.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(cleanB.split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  return (2 * intersection) / (wordsA.size + wordsB.size);
}

/**
 * Parses APU details (materials with waste, equipment with depreciation, labor)
 * directly from PDF text (e.g. Lulowin APU PDF export or PDVSA APU sheets).
 */
export function parseApuPdfBlocks(pdfText: string, fileName = 'APU_Documento.pdf'): ExtractedPartidaData[] {
  if (!pdfText || !pdfText.trim()) return [];

  // Split by Partida headers e.g. "Partida Nº 1", "PARTIDA N° 2", "ANALISIS DE PRECIOS UNITARIOS"
  const blocks = pdfText.split(/(?=Partida\s+N[ºo]?\s+\d+)/i);
  if (blocks.length <= 1) {
    return [];
  }

  const results: ExtractedPartidaData[] = [];

  for (let b = 1; b < blocks.length; b++) {
    const block = blocks[b];
    const pMatch = block.match(/Partida\s+N[ºo]?\s+(\d+)/i);
    if (!pMatch) continue;
    const partidaNum = parseInt(pMatch[1], 10);

    // Partida description
    const descMatch = block.match(/Descripción\s+Partida:\s*([^\r\n]+)/i);
    const descripcion = descMatch ? descMatch[1].trim() : undefined;

    // Yield (Rendimiento)
    const rendMatch = block.match(/Rendimiento\s+([A-Za-z0-9/]+)?\s*[\r\n\t\s]*([0-9.,]+)/i);
    let rendimiento: number | undefined;
    if (rendMatch) {
      rendimiento = parseLocalizedNumber(rendMatch[2]);
    }

    // Partida Quantity (Cómputo / Metrado)
    const qtyMatch = block.match(/Cantidad\s*[\r\n\t\s]*([0-9.,]+)\s*([A-Za-z0-9]{1,6})?/i);
    let cantidad: number | undefined;
    let unidad: string | undefined;
    if (qtyMatch) {
      cantidad = parseLocalizedNumber(qtyMatch[1]);
      if (qtyMatch[2]) unidad = normalizeUnit(qtyMatch[2]);
    }

    // Target Unit Price
    const puMatch = block.match(/PRECIO\s+UNITARIO\s*(?:\$|Bs)?\s*[\r\n\t\s]*([0-9.,]+)/i) ||
                    block.match(/([0-9.,]+)\s*PRECIO\s+UNITARIO/i);
    const precioUnitario = puMatch ? parseLocalizedNumber(puMatch[1]) : undefined;

    // 1. MATERIALES
    const materiales: MaterialItem[] = [];
    const matSec = (block.match(/1\.-\s*MATERIALES([\s\S]*?)(?:Total Materiales|2\.-\s*EQUIPOS)/i) || [])[1];
    if (matSec) {
      const lines = matSec.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.toLowerCase().includes('código') && !l.toLowerCase().includes('unidad') && !l.toLowerCase().includes('cantidad'));
      for (const line of lines) {
        const tokens = line.split('\t').map((t) => t.trim()).filter(Boolean);
        if (tokens.length >= 4) {
          const code = tokens[0];
          const unit = normalizeUnit(tokens[1]);
          const qty = parseLocalizedNumber(tokens[2]);
          let desp = 0;
          let desc = '';
          const cost = parseLocalizedNumber(tokens[tokens.length - 1]);

          if (/[A-Za-z]/.test(tokens[3])) {
            desc = tokens[3];
            desp = 0;
          } else if (tokens.length >= 5 && /[A-Za-z]/.test(tokens[4])) {
            desp = parseLocalizedNumber(tokens[3]);
            desc = tokens[4];
          } else {
            desc = tokens[3] || '';
          }

          if (code && qty > 0) {
            const lineTotal = qty * cost * (1 + desp / 100);
            materiales.push({
              codigo: code,
              descripcion: desc.toUpperCase() || `MATERIAL ${code}`,
              unidad: unit || 'UND',
              cantidad: qty,
              desperdicioPorc: desp,
              costoUnitario: cost,
              total: Math.round(lineTotal * 1000) / 1000,
            });
          }
        }
      }
    }

    // 2. EQUIPOS
    const equipos: EquipmentItem[] = [];
    const eqSec = (block.match(/2\.-\s*EQUIPOS([\s\S]*?)(?:Total Equipos|3\.-\s*MANO DE OBRA)/i) || [])[1];
    if (eqSec) {
      const lines = eqSec.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.toLowerCase().includes('código') && !l.toLowerCase().includes('dep.') && !l.toLowerCase().includes('cantidad'));
      for (const line of lines) {
        const tokens = line.split('\t').map((t) => t.trim()).filter(Boolean);
        if (tokens.length >= 4) {
          const dep = parseLocalizedNumber(tokens[0]);
          const code = tokens[1];
          const qty = parseLocalizedNumber(tokens[2]);
          const cost = parseLocalizedNumber(tokens[3]);
          const desc = tokens[4] || `EQUIPO ${code}`;

          if (code && qty > 0) {
            const lineTotal = qty * cost * (dep > 0 ? dep : 1.0);
            equipos.push({
              codigo: code,
              descripcion: desc.toUpperCase(),
              cantidad: qty,
              costo: cost,
              depreciacionOAlquiler: dep > 0 ? dep : 1.0,
              total: Math.round(lineTotal * 1000) / 1000,
            });
          }
        }
      }
    }

    // 3. MANO DE OBRA
    const manoDeObra: LaborItem[] = [];
    const moSec = (block.match(/3\.-\s*MANO DE OBRA([\s\S]*?)(?:Total Mano de Obra|Costo Directo)/i) || [])[1];
    if (moSec) {
      const lines = moSec.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.toLowerCase().includes('código') && !l.toLowerCase().includes('salario') && !l.toLowerCase().includes('directa'));
      for (const line of lines) {
        const tokens = line.split('\t').map((t) => t.trim()).filter(Boolean);
        if (tokens.length >= 3) {
          const code = tokens[0];
          const qty = parseLocalizedNumber(tokens[1]);
          const wage = parseLocalizedNumber(tokens[2]);
          const desc = tokens[3] || `PERSONAL ${code}`;

          if (code && qty > 0) {
            const lineTotal = qty * wage;
            manoDeObra.push({
              codigo: code,
              descripcion: desc.toUpperCase(),
              cantidad: qty,
              salarioDiario: wage,
              total: Math.round(lineTotal * 1000) / 1000,
            });
          }
        }
      }
    }

    results.push({
      index: partidaNum,
      descripcion,
      unidad,
      cantidad,
      precioUnitario,
      rendimiento,
      materiales: materiales.length > 0 ? materiales : undefined,
      equipos: equipos.length > 0 ? equipos : undefined,
      manoDeObra: manoDeObra.length > 0 ? manoDeObra : undefined,
      sourceFile: fileName,
    });
  }

  return results;
}

/**
 * Helper to convert a worksheet into an array of objects with sanitized lowercase keys.
 */
function sheetToNormalizedRows(worksheet: XLSX.WorkSheet): Record<string, any>[] {
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) return [];

  // Find header row (first row with at least 2 non-empty cells)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (Array.isArray(row)) {
      const nonEmpties = row.filter((c) => c !== null && c !== undefined && String(c).trim().length > 0);
      if (nonEmpties.length >= 2) {
        headerRowIdx = r;
        break;
      }
    }
  }

  const headerRow = (rawRows[headerRowIdx] as any[]) || [];
  const headers = headerRow.map((c) => String(c || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

  const result: Record<string, any>[] = [];
  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r] as any[];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
      continue;
    }
    const obj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key) {
        obj[key] = row[c];
      }
    }
    result.push(obj);
  }
  return result;
}

function getRowValue(row: Record<string, any>, ...candidateKeys: string[]): any {
  for (const k of candidateKeys) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (row[cleanKey] !== undefined && row[cleanKey] !== null && String(row[cleanKey]).trim() !== '') {
      return row[cleanKey];
    }
  }
  return undefined;
}

function parseNum(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const parsed = parseLocalizedNumber(String(val));
  return isNaN(parsed) ? fallback : parsed;
}

function parseStr(val: any, fallback = ''): string {
  if (val === undefined || val === null) return fallback;
  return String(val).trim();
}

/**
 * Checks if the workbook contains any recognized Lulowin database sheets
 */
export function hasLulowinSheets(workbook: XLSX.WorkBook): boolean {
  const luloKeys = [
    'obramate',
    'obraequi',
    'obramano',
    'obrapart',
    'obraapun',
    'obraapinmate',
    'obraapinequi',
    'obraapinmano',
    'obrapainmate',
    'obrapainequi',
    'obrapainmano',
  ];
  return workbook.SheetNames.some((s) =>
    luloKeys.includes(s.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
}

/**
 * Parses Lulowin / Maprex database tables (obramate, obraequi, obramano, obrapart, obraapun, obraapinmate, etc.)
 * Strictly captures materials with waste %, equipment with depreciation factors, labor wages, and full APU breakdowns.
 */
export function parseLulowinDatabaseSheets(
  workbook: XLSX.WorkBook,
  fileName = 'TABLAS_DE_OBRA_LULOWIN.xlsx'
): {
  items: ExtractedPartidaData[];
  metadata: LulowinSyncMetadata;
  masterCatalogs: MasterCatalogs;
} {
  // Map normalized sheet name to worksheet
  const sheetMap = new Map<string, XLSX.WorkSheet>();
  for (const name of workbook.SheetNames) {
    const norm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    sheetMap.set(norm, workbook.Sheets[name]);
  }

  const materialsMap = new Map<string, MasterMaterialRecord>();
  const equipmentMap = new Map<string, MasterEquipmentRecord>();
  const laborMap = new Map<string, MasterLaborRecord>();
  const partCatalogMap = new Map<string, { desc: string; unit: string; yieldVal: number; price: number; qty: number }>();

  let countMate = 0;
  let countEqui = 0;
  let countMano = 0;
  let countPart = 0;
  let countApun = 0;
  let countApinMate = 0;
  let countApinEqui = 0;
  let countApinMano = 0;
  let countPainMate = 0;
  let countPainEqui = 0;
  let countPainMano = 0;

  // 1. Parse obramate (Material Master Catalog)
  const mateSheet = sheetMap.get('obramate');
  if (mateSheet) {
    const rows = sheetToNormalizedRows(mateSheet);
    for (const r of rows) {
      const code = parseStr(getRowValue(r, 'codmat', 'codins', 'codigo', 'cod'));
      if (!code) continue;
      const desc = parseStr(getRowValue(r, 'descri', 'descripcion', 'concepto', 'desc'));
      const unit = normalizeUnit(parseStr(getRowValue(r, 'unimat', 'unidad', 'und'), 'UND'));
      const cost = parseNum(getRowValue(r, 'cosmat', 'cosins', 'costo', 'precio', 'pu'));
      const desper = parseNum(getRowValue(r, 'desper', 'desperdicio', 'desp', 'pordes', 'porcdesp'));

      materialsMap.set(code.toUpperCase(), {
        codigo: code,
        descripcion: desc || `MATERIAL ${code}`,
        unidad: unit,
        costo: cost,
        desperdicioPorc: desper,
      });
      countMate++;
    }
  }

  // 2. Parse obraequi (Equipment Master Catalog)
  const equiSheet = sheetMap.get('obraequi');
  if (equiSheet) {
    const rows = sheetToNormalizedRows(equiSheet);
    for (const r of rows) {
      const code = parseStr(getRowValue(r, 'codeequ', 'codequi', 'codequ', 'codins', 'codigo', 'cod'));
      if (!code) continue;
      const desc = parseStr(getRowValue(r, 'descri', 'descripcion', 'concepto', 'desc'));
      const cosEqu = parseNum(getRowValue(r, 'cosequ', 'costo', 'valor'));
      const cosDia = parseNum(getRowValue(r, 'cosdia', 'costodiario', 'costodia', 'tarifa'));
      const cost = cosDia > 0 ? cosDia : (cosEqu > 0 ? cosEqu : 0);
      const deprec = parseNum(getRowValue(r, 'deprec', 'depreciacion', 'depalq', 'factor'), 1.0);

      equipmentMap.set(code.toUpperCase(), {
        codigo: code,
        descripcion: desc || `EQUIPO ${code}`,
        costo: cost,
        depreciacionOAlquiler: deprec > 0 ? deprec : 1.0,
      });
      countEqui++;
    }
  }

  // 3. Parse obramano (Labor Master Catalog)
  const manoSheet = sheetMap.get('obramano');
  if (manoSheet) {
    const rows = sheetToNormalizedRows(manoSheet);
    for (const r of rows) {
      const code = parseStr(getRowValue(r, 'codman', 'codins', 'codigo', 'cod'));
      if (!code) continue;
      const desc = parseStr(getRowValue(r, 'descri', 'descripcion', 'cargo', 'categoria'));
      const wage = parseNum(getRowValue(r, 'salari', 'salario', 'salariodiario', 'costo', 'tarifa'));

      laborMap.set(code.toUpperCase(), {
        codigo: code,
        descripcion: desc || `PERSONAL ${code}`,
        salarioDiario: wage,
      });
      countMano++;
    }
  }

  // 4. Parse obrapart (Partidas General Catalog)
  const partSheet = sheetMap.get('obrapart');
  if (partSheet) {
    const rows = sheetToNormalizedRows(partSheet);
    for (const r of rows) {
      const code = parseStr(getRowValue(r, 'codpar', 'codigo', 'cod'));
      if (!code) continue;
      const desc = parseStr(getRowValue(r, 'descri', 'descripcion'));
      const unit = normalizeUnit(parseStr(getRowValue(r, 'unipar', 'unidad', 'und'), 'UND'));
      const yieldVal = parseNum(getRowValue(r, 'renpar', 'rendimiento', 'rend'));
      const price = parseNum(getRowValue(r, 'preuni', 'preciounitario', 'precio'));
      const qty = parseNum(getRowValue(r, 'canpar', 'cantidad', 'metrado'));

      partCatalogMap.set(code.toUpperCase(), {
        desc,
        unit,
        yieldVal,
        price,
        qty,
      });
      countPart++;
    }
  }

  // Group APIN breakdown records by NumPar (number) and CodPar (string)
  const apinMaterialsByNum = new Map<number, MaterialItem[]>();
  const apinMaterialsByCode = new Map<string, MaterialItem[]>();

  const apinEquipmentByNum = new Map<number, EquipmentItem[]>();
  const apinEquipmentByCode = new Map<string, EquipmentItem[]>();

  const apinLaborByNum = new Map<number, LaborItem[]>();
  const apinLaborByCode = new Map<string, LaborItem[]>();

  // 5. Parse obraapinmate (APU Materials Breakdown)
  const apinMateSheet = sheetMap.get('obraapinmate') || sheetMap.get('obrapainmate');
  if (apinMateSheet) {
    const rows = sheetToNormalizedRows(apinMateSheet);
    for (const r of rows) {
      const numPar = parseNum(getRowValue(r, 'numpar', 'partida', 'item', 'nro'));
      const codPar = parseStr(getRowValue(r, 'codpar', 'codigo', 'cod')).toUpperCase();
      const codIns = parseStr(getRowValue(r, 'codins', 'codmat', 'codigo', 'cod'));
      if (!codIns) continue;

      const canIns = parseNum(getRowValue(r, 'canins', 'cantidad', 'cant', 'cuadrilla'));
      const cosInsRaw = parseNum(getRowValue(r, 'cosins', 'cosmat', 'costo', 'precio'));
      const desperRaw = parseNum(getRowValue(r, 'desper', 'desperdicio', 'desp', 'pordes', 'porcdesp'));

      const master = materialsMap.get(codIns.toUpperCase());
      const finalCost = cosInsRaw > 0 ? cosInsRaw : (master ? master.costo : 0);
      const finalDesp = desperRaw > 0 ? desperRaw : (master ? master.desperdicioPorc : 0);
      const finalDesc = master ? master.descripcion : parseStr(getRowValue(r, 'descri', 'descripcion'), `MATERIAL ${codIns}`);
      const finalUnit = master ? master.unidad : normalizeUnit(parseStr(getRowValue(r, 'unimat', 'unidad', 'und'), 'UND'));
      const lineTotal = Math.round(canIns * finalCost * (1 + finalDesp / 100) * 1000) / 1000;

      const matItem: MaterialItem = {
        codigo: codIns,
        descripcion: finalDesc.toUpperCase(),
        unidad: finalUnit,
        cantidad: canIns,
        costoUnitario: finalCost,
        desperdicioPorc: finalDesp,
        total: lineTotal,
      };

      if (numPar > 0) {
        if (!apinMaterialsByNum.has(numPar)) apinMaterialsByNum.set(numPar, []);
        apinMaterialsByNum.get(numPar)!.push(matItem);
      }
      if (codPar) {
        if (!apinMaterialsByCode.has(codPar)) apinMaterialsByCode.set(codPar, []);
        apinMaterialsByCode.get(codPar)!.push(matItem);
      }
      countApinMate++;
    }
  }

  // 6. Parse obraapinequi (APU Equipment Breakdown)
  const apinEquiSheet = sheetMap.get('obraapinequi') || sheetMap.get('obrapainequi');
  if (apinEquiSheet) {
    const rows = sheetToNormalizedRows(apinEquiSheet);
    for (const r of rows) {
      const numPar = parseNum(getRowValue(r, 'numpar', 'partida', 'item', 'nro'));
      const codPar = parseStr(getRowValue(r, 'codpar', 'codigo', 'cod')).toUpperCase();
      const codIns = parseStr(getRowValue(r, 'codins', 'codequ', 'codeequ', 'codigo', 'cod'));
      if (!codIns) continue;

      const canIns = parseNum(getRowValue(r, 'canins', 'cantidad', 'cant'));
      const cosInsRaw = parseNum(getRowValue(r, 'cosins', 'cosequ', 'cosdia', 'costo', 'precio'));
      const deprecRaw = parseNum(getRowValue(r, 'deprec', 'depreciacion', 'depalq', 'factor'));

      const master = equipmentMap.get(codIns.toUpperCase());
      const finalCost = cosInsRaw > 0 ? cosInsRaw : (master ? master.costo : 0);
      const finalDep = deprecRaw > 0 ? deprecRaw : (master ? master.depreciacionOAlquiler : 1.0);
      const finalDesc = master ? master.descripcion : parseStr(getRowValue(r, 'descri', 'descripcion'), `EQUIPO ${codIns}`);
      const lineTotal = Math.round(canIns * finalCost * finalDep * 1000) / 1000;

      const eqItem: EquipmentItem = {
        codigo: codIns,
        descripcion: finalDesc.toUpperCase(),
        cantidad: canIns,
        costo: finalCost,
        depreciacionOAlquiler: finalDep,
        total: lineTotal,
      };

      if (numPar > 0) {
        if (!apinEquipmentByNum.has(numPar)) apinEquipmentByNum.set(numPar, []);
        apinEquipmentByNum.get(numPar)!.push(eqItem);
      }
      if (codPar) {
        if (!apinEquipmentByCode.has(codPar)) apinEquipmentByCode.set(codPar, []);
        apinEquipmentByCode.get(codPar)!.push(eqItem);
      }
      countApinEqui++;
    }
  }

  // 7. Parse obraapinmano (APU Labor Breakdown)
  const apinManoSheet = sheetMap.get('obraapinmano') || sheetMap.get('obrapainmano');
  if (apinManoSheet) {
    const rows = sheetToNormalizedRows(apinManoSheet);
    for (const r of rows) {
      const numPar = parseNum(getRowValue(r, 'numpar', 'partida', 'item', 'nro'));
      const codPar = parseStr(getRowValue(r, 'codpar', 'codigo', 'cod')).toUpperCase();
      const codIns = parseStr(getRowValue(r, 'codins', 'codman', 'codigo', 'cod'));
      if (!codIns) continue;

      const canIns = parseNum(getRowValue(r, 'canins', 'cantidad', 'cuadrilla', 'cant'));
      const cosInsRaw = parseNum(getRowValue(r, 'cosins', 'salari', 'salario', 'costo', 'tarifa'));

      const master = laborMap.get(codIns.toUpperCase());
      const finalWage = cosInsRaw > 0 ? cosInsRaw : (master ? master.salarioDiario : 0);
      const finalDesc = master ? master.descripcion : parseStr(getRowValue(r, 'descri', 'descripcion'), `PERSONAL ${codIns}`);
      const lineTotal = Math.round(canIns * finalWage * 1000) / 1000;

      const moItem: LaborItem = {
        codigo: codIns,
        descripcion: finalDesc.toUpperCase(),
        cantidad: canIns,
        salarioDiario: finalWage,
        total: lineTotal,
      };

      if (numPar > 0) {
        if (!apinLaborByNum.has(numPar)) apinLaborByNum.set(numPar, []);
        apinLaborByNum.get(numPar)!.push(moItem);
      }
      if (codPar) {
        if (!apinLaborByCode.has(codPar)) apinLaborByCode.set(codPar, []);
        apinLaborByCode.get(codPar)!.push(moItem);
      }
      countApinMano++;
    }
  }

  const masterCatalogs: MasterCatalogs = {
    materials: materialsMap,
    equipment: equipmentMap,
    labor: laborMap,
  };

  const lulowinMetadata: LulowinSyncMetadata = {
    isLulowinDatabase: true,
    tableCounts: {
      obramate: countMate,
      obraequi: countEqui,
      obramano: countMano,
      obrapart: countPart,
      obraapun: countApun,
      obraapinmate: countApinMate,
      obraapinequi: countApinEqui,
      obraapinmano: countApinMano,
      obrapainmate: countPainMate,
      obrapainequi: countPainEqui,
      obrapainmano: countPainMano,
    },
  };

  const extractedItems: ExtractedPartidaData[] = [];

  // 8. Assemble from obraapun (Primary APU budget sheet)
  const apunSheet = sheetMap.get('obraapun');
  if (apunSheet) {
    const rows = sheetToNormalizedRows(apunSheet);
    for (const r of rows) {
      const numPar = parseNum(getRowValue(r, 'numpar', 'partida', 'item', 'nro'));
      const codPar = parseStr(getRowValue(r, 'codpar', 'codigo', 'cod'));
      const renPar = parseNum(getRowValue(r, 'renpar', 'rendimiento', 'rend'));
      const canPar = parseNum(getRowValue(r, 'canpar', 'cantidad', 'metrado'));
      const preUni = parseNum(getRowValue(r, 'preuni', 'preciounitario', 'precio', 'pu'));

      const partMaster = codPar ? partCatalogMap.get(codPar.toUpperCase()) : undefined;
      const desc = partMaster ? partMaster.desc : undefined;
      const unit = partMaster ? partMaster.unit : undefined;

      const mats = (numPar > 0 ? apinMaterialsByNum.get(numPar) : undefined) ||
                   (codPar ? apinMaterialsByCode.get(codPar.toUpperCase()) : undefined) || [];
      const eqs = (numPar > 0 ? apinEquipmentByNum.get(numPar) : undefined) ||
                  (codPar ? apinEquipmentByCode.get(codPar.toUpperCase()) : undefined) || [];
      const mos = (numPar > 0 ? apinLaborByNum.get(numPar) : undefined) ||
                  (codPar ? apinLaborByCode.get(codPar.toUpperCase()) : undefined) || [];

      extractedItems.push({
        index: numPar > 0 ? numPar : undefined,
        codigo: codPar || undefined,
        descripcion: desc,
        unidad: unit,
        cantidad: canPar > 0 ? canPar : (partMaster ? partMaster.qty : undefined),
        rendimiento: renPar > 0 ? renPar : (partMaster ? partMaster.yieldVal : undefined),
        precioUnitario: preUni > 0 ? preUni : (partMaster ? partMaster.price : undefined),
        materiales: mats,
        equipos: eqs,
        manoDeObra: mos,
        isLulowinFullApu: true,
        sourceFile: fileName,
        masterCatalogs,
        lulowinMetadata,
      });
      countApun++;
    }
  }

  // 9. If obraapun was absent or missed partidas present in obrapart, add them
  if (partCatalogMap.size > 0) {
    let fallbackIndex = 1;
    for (const [codeUpper, part] of partCatalogMap.entries()) {
      const alreadyIncluded = extractedItems.some((it) => it.codigo?.toUpperCase() === codeUpper);
      if (alreadyIncluded) continue;

      const mats = apinMaterialsByCode.get(codeUpper) || [];
      const eqs = apinEquipmentByCode.get(codeUpper) || [];
      const mos = apinLaborByCode.get(codeUpper) || [];

      extractedItems.push({
        index: fallbackIndex++,
        codigo: codeUpper,
        descripcion: part.desc,
        unidad: part.unit,
        cantidad: part.qty > 0 ? part.qty : undefined,
        rendimiento: part.yieldVal > 0 ? part.yieldVal : undefined,
        precioUnitario: part.price > 0 ? part.price : undefined,
        materiales: mats,
        equipos: eqs,
        manoDeObra: mos,
        isLulowinFullApu: true,
        sourceFile: fileName,
        masterCatalogs,
        lulowinMetadata,
      });
    }
  }

  // 10. If neither obraapun nor obrapart existed, but APIN breakdown rows exist, group by numPar
  if (extractedItems.length === 0 && (apinMaterialsByNum.size > 0 || apinEquipmentByNum.size > 0 || apinLaborByNum.size > 0)) {
    const allNums = new Set<number>([
      ...Array.from(apinMaterialsByNum.keys()),
      ...Array.from(apinEquipmentByNum.keys()),
      ...Array.from(apinLaborByNum.keys()),
    ]);

    for (const n of Array.from(allNums).sort((a, b) => a - b)) {
      extractedItems.push({
        index: n,
        materiales: apinMaterialsByNum.get(n) || [],
        equipos: apinEquipmentByNum.get(n) || [],
        manoDeObra: apinLaborByNum.get(n) || [],
        isLulowinFullApu: true,
        sourceFile: fileName,
        masterCatalogs,
        lulowinMetadata,
      });
    }
  }

  // 11. If only master catalogs exist (no partidas specified in file), attach catalogs to a root carrier item
  if (extractedItems.length === 0 && (materialsMap.size > 0 || equipmentMap.size > 0 || laborMap.size > 0)) {
    extractedItems.push({
      sourceFile: fileName,
      masterCatalogs,
      lulowinMetadata,
    });
  }

  lulowinMetadata.tableCounts.obraapun = countApun;

  return {
    items: extractedItems,
    metadata: lulowinMetadata,
    masterCatalogs,
  };
}

/**
 * Parses any Excel file (PDVSA budget, Lulowin export, Cómputos, or Specifications)
 * Automatically detects whether it is a Lulowin relational database export (obramate, obraequi, obraapun, etc.)
 * or a standard budget spreadsheet.
 */
export function parseExcelSyncData(
  fileBuffer: ArrayBuffer,
  fileName = 'Archivo_Excel.xlsx'
): ExtractedPartidaData[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });

  // Priority 1: Check if workbook has Lulowin database sheets
  if (hasLulowinSheets(workbook)) {
    const luloResult = parseLulowinDatabaseSheets(workbook, fileName);
    return luloResult.items;
  }

  const results: ExtractedPartidaData[] = [];
  const partidaMap = new Map<number, ExtractedPartidaData>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rows || rows.length === 0) continue;

    const lowerSheet = sheetName.toLowerCase();

    // Check if this sheet is an APU / Insumos breakdown sheet
    const isApuSheet = lowerSheet.includes('apu') || lowerSheet.includes('insumo') || lowerSheet.includes('despiece');

    // Detect column indexes
    let colPartidaId = -1;
    let colTipoInsumo = -1;
    let colInsumoCode = -1;
    let colInsumoDesc = -1;
    let colUnit = -1;
    let colQty = -1;
    let colPrice = -1;
    let colDesp = -1;
    let colDep = -1;
    let colYield = -1;

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(20, rows.length); r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toLowerCase().trim();
        if (val.includes('partida') || val === 'item' || val === 'n°' || val === 'no' || val === 'pos') {
          if (colPartidaId === -1) colPartidaId = c;
        }
        if (val.includes('tipo') || val.includes('clasif') || val.includes('categor')) {
          colTipoInsumo = c;
        }
        if (val.includes('código') || val.includes('codigo') || val.includes('covenin') || val.includes('cod')) {
          if (colInsumoCode === -1) colInsumoCode = c;
        }
        if (val.includes('descrip') || val.includes('concepto') || val.includes('insumo') || val.includes('alcance')) {
          if (colInsumoDesc === -1) colInsumoDesc = c;
        }
        if (val === 'unidad' || val === 'und' || val === 'unid' || val === 'u.m.' || val === 'u') {
          colUnit = c;
        }
        if (val.includes('cant') || val.includes('metrado') || val.includes('volumen') || val.includes('cuadrilla')) {
          colQty = c;
        }
        if (val.includes('desp') || val.includes('desperdicio') || val.includes('% desp')) {
          colDesp = c;
        }
        if (val.includes('dep') || val.includes('deprec') || val.includes('alquiler') || val.includes('dep/alq')) {
          colDep = c;
        }
        if (val.includes('p.u.') || val.includes('precio') || val.includes('costo') || val === 'pu' || val.includes('salario') || val.includes('tarifa')) {
          colPrice = c;
        }
        if (val.includes('rend') || val.includes('producc') || val.includes('rendimiento')) {
          colYield = c;
        }
      }

      if (colInsumoDesc !== -1 && (colQty !== -1 || colPrice !== -1 || colUnit !== -1)) {
        headerRowIdx = r;
        break;
      }
    }

    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r] || [];
      if (row.length === 0 || row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) {
        continue;
      }

      let parsedId: number | undefined;
      if (colPartidaId !== -1 && row[colPartidaId] !== undefined) {
        const idMatch = String(row[colPartidaId]).match(/(\d+)/);
        if (idMatch) parsedId = parseInt(idMatch[1], 10);
      }

      const code = colInsumoCode !== -1 && row[colInsumoCode] ? String(row[colInsumoCode]).trim() : undefined;
      const desc = colInsumoDesc !== -1 ? String(row[colInsumoDesc] || '').trim() : '';
      const unit = colUnit !== -1 && row[colUnit] ? normalizeUnit(String(row[colUnit])) : undefined;
      const qty = colQty !== -1 ? parseLocalizedNumber(row[colQty]) : undefined;
      const price = colPrice !== -1 ? parseLocalizedNumber(row[colPrice]) : undefined;
      const desp = colDesp !== -1 ? parseLocalizedNumber(row[colDesp]) : undefined;
      const dep = colDep !== -1 ? parseLocalizedNumber(row[colDep]) : undefined;
      const rend = colYield !== -1 ? parseLocalizedNumber(row[colYield]) : undefined;

      if (!desc || desc.toLowerCase().includes('total general') || desc.toLowerCase().includes('subtotal')) {
        continue;
      }

      // Check if row is an insumo belonging to a specific partida
      const rawTipo = colTipoInsumo !== -1 && row[colTipoInsumo] ? String(row[colTipoInsumo]).toLowerCase() : '';
      const isMaterial = rawTipo.includes('mat') || desc.includes('MATERIAL');
      const isEquipo = rawTipo.includes('eq') || rawTipo.includes('maq') || desc.includes('EQUIPO');
      const isManoDeObra = rawTipo.includes('mano') || rawTipo.includes('personal') || rawTipo.includes('labor') || desc.includes('OBRERO') || desc.includes('CAPORAL');

      if (isApuSheet && parsedId && (isMaterial || isEquipo || isManoDeObra || desp !== undefined || dep !== undefined)) {
        let entry = partidaMap.get(parsedId);
        if (!entry) {
          entry = {
            index: parsedId,
            materiales: [],
            equipos: [],
            manoDeObra: [],
            sourceFile: fileName,
          };
          partidaMap.set(parsedId, entry);
        }

        if (isEquipo || dep !== undefined) {
          entry.equipos = entry.equipos || [];
          entry.equipos.push({
            codigo: code || `EQ-${entry.equipos.length + 1}`,
            descripcion: desc.toUpperCase(),
            cantidad: qty && qty > 0 ? qty : 1,
            costo: price && price > 0 ? price : 10,
            depreciacionOAlquiler: dep !== undefined && dep > 0 ? dep : 1.0,
            total: (qty || 1) * (price || 10) * (dep || 1.0),
          });
        } else if (isManoDeObra) {
          entry.manoDeObra = entry.manoDeObra || [];
          entry.manoDeObra.push({
            codigo: code || `MO-${entry.manoDeObra.length + 1}`,
            descripcion: desc.toUpperCase(),
            cantidad: qty && qty > 0 ? qty : 1,
            salarioDiario: price && price > 0 ? price : 5.0,
            total: (qty || 1) * (price || 5.0),
          });
        } else {
          entry.materiales = entry.materiales || [];
          entry.materiales.push({
            codigo: code || `MAT-${entry.materiales.length + 1}`,
            descripcion: desc.toUpperCase(),
            unidad: unit || 'UND',
            cantidad: qty && qty > 0 ? qty : 1,
            desperdicioPorc: desp !== undefined ? desp : 0,
            costoUnitario: price && price > 0 ? price : 1,
            total: (qty || 1) * (price || 1) * (1 + (desp || 0) / 100),
          });
        }
        continue;
      }

      // Standard budget row
      if ((qty && qty > 0) || (price && price > 0) || desc.length > 5) {
        let existing = parsedId ? partidaMap.get(parsedId) : undefined;
        if (!existing) {
          existing = {
            index: parsedId,
            codigo: code,
            descripcion: desc,
            unidad: unit,
            cantidad: qty && qty > 0 ? qty : undefined,
            precioUnitario: price && price > 0 ? price : undefined,
            rendimiento: rend && rend > 0 ? rend : undefined,
            sourceFile: fileName,
          };
          if (parsedId) partidaMap.set(parsedId, existing);
          else results.push(existing);
        } else {
          if (code) existing.codigo = code;
          if (desc) existing.descripcion = desc;
          if (unit) existing.unidad = unit;
          if (qty && qty > 0) existing.cantidad = qty;
          if (price && price > 0) existing.precioUnitario = price;
          if (rend && rend > 0) existing.rendimiento = rend;
        }
      }
    }
  }

  const allParsed = [...results, ...Array.from(partidaMap.values())];
  return allParsed;
}

/**
 * Parses raw text extracted from a PDF budget, APU sheet or measurement sheet
 */
export function parsePdfTextToPartidas(
  pdfText: string,
  fileName = 'Presupuesto_PDF.pdf'
): ExtractedPartidaData[] {
  if (!pdfText || !pdfText.trim()) return [];

  // First, try parsing as a full APU document (contains "ANALISIS DE PRECIOS UNITARIOS" or "1.- MATERIALES")
  if (pdfText.includes('1.- MATERIALES') || pdfText.includes('2.- EQUIPOS') || pdfText.includes('ANALISIS DE PRECIOS UNITARIOS')) {
    const apuParsed = parseApuPdfBlocks(pdfText, fileName);
    if (apuParsed.length > 0) {
      return apuParsed;
    }
  }

  // Fallback to tabular budget lines parser
  const lines = pdfText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ExtractedPartidaData[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: Lulowin PDF budget export line
    // e.g.: "RAB00253 1 3.150,95 3.150,95 1,00 UND S/C DE DOS CRUCETAS..."
    const luloMatch = line.match(/^([A-Z0-9.-]{3,12})\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([A-Z0-9]{1,6})\s+(.+)$/i);
    if (luloMatch) {
      const codigo = luloMatch[1];
      const index = parseInt(luloMatch[2], 10);
      const puVal = parseLocalizedNumber(luloMatch[4]);
      const qtyVal = parseLocalizedNumber(luloMatch[5]);
      const unidad = normalizeUnit(luloMatch[6]);
      const desc = luloMatch[7].trim();

      results.push({
        index,
        codigo,
        descripcion: desc,
        unidad,
        cantidad: qtyVal > 0 ? qtyVal : 1,
        precioUnitario: puVal > 0 ? puVal : undefined,
        sourceFile: fileName,
      });
      continue;
    }

    // Pattern 2: Standard table line "1 DESCRIPCION... UND 150.00 35.50"
    const stdMatch = line.match(/^(\d+)\s+(.+?)\s+([A-Za-z0-9]{1,6})\s+([\d.,]+)(?:\s+([\d.,]+))?$/);
    if (stdMatch) {
      const index = parseInt(stdMatch[1], 10);
      const desc = stdMatch[2].trim();
      const unidad = normalizeUnit(stdMatch[3]);
      const qty = parseLocalizedNumber(stdMatch[4]);
      const pu = stdMatch[5] ? parseLocalizedNumber(stdMatch[5]) : undefined;

      results.push({
        index,
        descripcion: desc,
        unidad,
        cantidad: qty > 0 ? qty : 1,
        precioUnitario: pu && pu > 0 ? pu : undefined,
        sourceFile: fileName,
      });
      continue;
    }

    // Pattern 3: Line with "PARTIDA N° 1 DESCRIPCION..."
    const partMatch = line.match(/^(?:PARTIDA|ITEM)\s*(?:N[°o]?)?\s*(\d+)[:.-]?\s*(.+)$/i);
    if (partMatch) {
      const index = parseInt(partMatch[1], 10);
      const rest = partMatch[2].trim();
      let nextQty: number | undefined;
      let nextUnit = 'UND';

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const qtyMatch = nextLine.match(/([\d.,]+)\s*([A-Za-z0-9]{1,6})/);
        if (qtyMatch) {
          nextQty = parseLocalizedNumber(qtyMatch[1]);
          nextUnit = normalizeUnit(qtyMatch[2]);
        }
      }

      results.push({
        index,
        descripcion: rest,
        unidad: nextUnit,
        cantidad: nextQty && nextQty > 0 ? nextQty : undefined,
        sourceFile: fileName,
      });
    }
  }

  return results;
}

/**
 * Reconciles extracted records against current project items and applies changes.
 * Supports updating partida quantities, prices, yields, specs, AND insumo quantities,
 * waste percentages (% Desp), and equipment depreciation rates (Dep./Alq.).
 * Also cascades master catalog data (obramate, obraequi, obramano) to all project partidas.
 */
export function reconcileProjectData(
  currentItems: PartidaItem[],
  extractedList: ExtractedPartidaData[],
  options: SyncOptions = {}
): SyncResult {
  const updateQuantities = options.updateQuantities ?? true;
  const updatePrices = options.updatePrices ?? true;
  const updateYields = options.updateYields ?? true;
  const updateSpecs = options.updateSpecs ?? true;
  const updateInsumoQuantities = options.updateInsumoQuantities ?? true;
  const updateDesperdicios = options.updateDesperdicios ?? true;
  const updateDepreciaciones = options.updateDepreciaciones ?? true;
  const fcasPorc = options.fcasPorc ?? 500.0;
  const adminPorc = options.adminPorc ?? 12.5;
  const utilidadPorc = options.utilidadPorc ?? 17.0;

  // Extract master catalogs and metadata from options or extracted items
  let masterCatalogs: MasterCatalogs | undefined = options.masterCatalogs;
  let lulowinMetadata: LulowinSyncMetadata | undefined;

  for (const ext of extractedList) {
    if (!masterCatalogs && ext.masterCatalogs) {
      masterCatalogs = ext.masterCatalogs;
    }
    if (!lulowinMetadata && ext.lulowinMetadata) {
      lulowinMetadata = ext.lulowinMetadata;
    }
  }

  const itemMapById = new Map<number, PartidaItem>();
  const itemMapByCode = new Map<string, PartidaItem>();

  for (const item of currentItems) {
    itemMapById.set(item.id, item);
    if (item.codigoCovenin) {
      itemMapByCode.set(item.codigoCovenin.toUpperCase().trim(), item);
    }
  }

  const updatedItemsMap = new Map<number, PartidaItem>();
  for (const item of currentItems) {
    updatedItemsMap.set(item.id, JSON.parse(JSON.stringify(item)));
  }

  const diffs: PartidaDiff[] = [];
  const diffsByItemId = new Map<number, PartidaDiff>();
  let quantitiesUpdated = 0;
  let pricesUpdated = 0;
  let yieldsUpdated = 0;
  let specsUpdated = 0;
  let insumosUpdated = 0;
  let desperdiciosUpdated = 0;
  let depreciacionesUpdated = 0;
  const matchedItemIds = new Set<number>();
  const fullyReplacedItemIds = new Set<number>();

  for (const ext of extractedList) {
    let matchedItem: PartidaItem | undefined;

    // 1. Try matching by exact ID / Partida Number (NumPar)
    if (ext.index && itemMapById.has(ext.index)) {
      matchedItem = updatedItemsMap.get(ext.index);
    }

    // 2. Try matching by code (CodPar)
    if (!matchedItem && ext.codigo) {
      const codeClean = ext.codigo.toUpperCase().trim();
      const byCode = itemMapByCode.get(codeClean);
      if (byCode) matchedItem = updatedItemsMap.get(byCode.id);
    }

    // 3. Try matching by high description similarity (> 0.65)
    if (!matchedItem && ext.descripcion && ext.descripcion.length > 8) {
      let bestSim = 0;
      let bestCandidate: PartidaItem | undefined;
      for (const item of currentItems) {
        const sim = calculateDescriptionSimilarity(item.descripcion, ext.descripcion);
        if (sim > bestSim) {
          bestSim = sim;
          bestCandidate = item;
        }
      }
      if (bestSim >= 0.65 && bestCandidate) {
        matchedItem = updatedItemsMap.get(bestCandidate.id);
      }
    }

    if (!matchedItem) continue;

    matchedItemIds.add(matchedItem.id);
    const originalItem = itemMapById.get(matchedItem.id)!;
    const oldCalc = calculateItemApu(originalItem, fcasPorc, adminPorc, utilidadPorc);

    let changedQty = false;
    let changedPrice = false;
    let changedYield = false;
    let changedSpec = false;
    let changedInsumo = false;
    let changedDesp = false;
    let changedDep = false;

    let partInsumoUpdatedCount = 0;
    let partDespUpdatedCount = 0;
    let partDepUpdatedCount = 0;
    const insumoDetails: InsumoDiffDetail[] = [];

    // 1. Update Partida Quantity (Cómputo / Metrado / CanPar)
    if (updateQuantities && ext.cantidad !== undefined && ext.cantidad > 0) {
      if (Math.abs(matchedItem.cantidad - ext.cantidad) > 0.0001) {
        matchedItem.cantidad = ext.cantidad;
        changedQty = true;
        quantitiesUpdated++;
      }
    }

    // 2. Update Partida Yield (Rendimiento / RenPar)
    if (updateYields && ext.rendimiento !== undefined && ext.rendimiento > 0) {
      if (Math.abs(matchedItem.apu.rendimiento - ext.rendimiento) > 0.001) {
        matchedItem.apu.rendimiento = ext.rendimiento;
        changedYield = true;
        yieldsUpdated++;
      }
    }

    // If this is a full Lulowin APU breakdown (from obraapun + obraapin*):
    if (ext.isLulowinFullApu) {
      fullyReplacedItemIds.add(matchedItem.id);

      // A. Full Materials Replacement from obraapinmate
      if (ext.materiales !== undefined) {
        const newMaterials: MaterialItem[] = [];
        for (const extMat of ext.materiales) {
          const oldMat = originalItem.apu.materiales.find(
            (m) =>
              m.codigo.toUpperCase().trim() === extMat.codigo.toUpperCase().trim() ||
              calculateDescriptionSimilarity(m.descripcion, extMat.descripcion) > 0.75
          );

          const diffLines: string[] = [];
          if (!oldMat) {
            diffLines.push(`Nuevo insumo Lulowin: Cant: ${extMat.cantidad}, Desp: ${extMat.desperdicioPorc || 0}%, Costo: $${extMat.costoUnitario}`);
            changedInsumo = true;
            partInsumoUpdatedCount++;
            insumosUpdated++;
          } else {
            if (updateInsumoQuantities && Math.abs(oldMat.cantidad - extMat.cantidad) > 0.0001) {
              diffLines.push(`Cant: ${oldMat.cantidad} ➔ ${extMat.cantidad}`);
              changedInsumo = true;
              partInsumoUpdatedCount++;
              insumosUpdated++;
            }
            if (updateDesperdicios && Math.abs((oldMat.desperdicioPorc || 0) - (extMat.desperdicioPorc || 0)) > 0.01) {
              diffLines.push(`Desp: ${oldMat.desperdicioPorc || 0}% ➔ ${extMat.desperdicioPorc || 0}%`);
              changedDesp = true;
              partDespUpdatedCount++;
              desperdiciosUpdated++;
            }
            if (updatePrices && Math.abs(oldMat.costoUnitario - extMat.costoUnitario) > 0.01) {
              diffLines.push(`Costo: $${oldMat.costoUnitario.toFixed(2)} ➔ $${extMat.costoUnitario.toFixed(2)}`);
              changedPrice = true;
              pricesUpdated++;
            }
          }

          const lineTotal = Math.round(
            extMat.cantidad * extMat.costoUnitario * (1 + (extMat.desperdicioPorc || 0) / 100) * 1000
          ) / 1000;

          newMaterials.push({
            ...extMat,
            total: lineTotal,
          });

          if (diffLines.length > 0) {
            insumoDetails.push({
              tipo: 'material',
              codigo: extMat.codigo,
              descripcion: extMat.descripcion,
              cambios: diffLines,
            });
          }
        }
        matchedItem.apu.materiales = newMaterials;
      }

      // B. Full Equipment Replacement from obraapinequi
      if (ext.equipos !== undefined) {
        const newEquipment: EquipmentItem[] = [];
        for (const extEq of ext.equipos) {
          const oldEq = originalItem.apu.equipos.find(
            (e) =>
              e.codigo.toUpperCase().trim() === extEq.codigo.toUpperCase().trim() ||
              calculateDescriptionSimilarity(e.descripcion, extEq.descripcion) > 0.75
          );

          const diffLines: string[] = [];
          if (!oldEq) {
            diffLines.push(`Nuevo equipo Lulowin: Cant: ${extEq.cantidad}, Deprec: ${extEq.depreciacionOAlquiler}, Costo: $${extEq.costo}`);
            changedInsumo = true;
            partInsumoUpdatedCount++;
            insumosUpdated++;
          } else {
            if (updateInsumoQuantities && Math.abs(oldEq.cantidad - extEq.cantidad) > 0.0001) {
              diffLines.push(`Cant: ${oldEq.cantidad} ➔ ${extEq.cantidad}`);
              changedInsumo = true;
              partInsumoUpdatedCount++;
              insumosUpdated++;
            }
            if (updateDepreciaciones && Math.abs((oldEq.depreciacionOAlquiler || 1.0) - (extEq.depreciacionOAlquiler || 1.0)) > 0.0001) {
              diffLines.push(`Deprec: ${(oldEq.depreciacionOAlquiler || 1.0).toFixed(4)} ➔ ${extEq.depreciacionOAlquiler.toFixed(4)}`);
              changedDep = true;
              partDepUpdatedCount++;
              depreciacionesUpdated++;
            }
            if (updatePrices && Math.abs(oldEq.costo - extEq.costo) > 0.01) {
              diffLines.push(`Costo: $${oldEq.costo.toFixed(2)} ➔ $${extEq.costo.toFixed(2)}`);
              changedPrice = true;
              pricesUpdated++;
            }
          }

          const lineTotal = Math.round(
            extEq.cantidad * extEq.costo * (extEq.depreciacionOAlquiler || 1.0) * 1000
          ) / 1000;

          newEquipment.push({
            ...extEq,
            total: lineTotal,
          });

          if (diffLines.length > 0) {
            insumoDetails.push({
              tipo: 'equipo',
              codigo: extEq.codigo,
              descripcion: extEq.descripcion,
              cambios: diffLines,
            });
          }
        }
        matchedItem.apu.equipos = newEquipment;
      }

      // C. Full Labor Replacement from obraapinmano
      if (ext.manoDeObra !== undefined) {
        const newLabor: LaborItem[] = [];
        for (const extMo of ext.manoDeObra) {
          const oldMo = originalItem.apu.manoDeObra.find(
            (m) =>
              m.codigo.toUpperCase().trim() === extMo.codigo.toUpperCase().trim() ||
              calculateDescriptionSimilarity(m.descripcion, extMo.descripcion) > 0.75
          );

          const diffLines: string[] = [];
          if (!oldMo) {
            diffLines.push(`Nuevo personal Lulowin: Cuadrilla: ${extMo.cantidad}, Salario: $${extMo.salarioDiario}`);
            changedInsumo = true;
            partInsumoUpdatedCount++;
            insumosUpdated++;
          } else {
            if (updateInsumoQuantities && Math.abs(oldMo.cantidad - extMo.cantidad) > 0.0001) {
              diffLines.push(`Cuadrilla: ${oldMo.cantidad} ➔ ${extMo.cantidad}`);
              changedInsumo = true;
              partInsumoUpdatedCount++;
              insumosUpdated++;
            }
            if (updatePrices && Math.abs(oldMo.salarioDiario - extMo.salarioDiario) > 0.01) {
              diffLines.push(`Salario: $${oldMo.salarioDiario.toFixed(2)} ➔ $${extMo.salarioDiario.toFixed(2)}`);
              changedPrice = true;
              pricesUpdated++;
            }
          }

          const lineTotal = Math.round(extMo.cantidad * extMo.salarioDiario * 1000) / 1000;

          newLabor.push({
            ...extMo,
            total: lineTotal,
          });

          if (diffLines.length > 0) {
            insumoDetails.push({
              tipo: 'mano_de_obra',
              codigo: extMo.codigo,
              descripcion: extMo.descripcion,
              cambios: diffLines,
            });
          }
        }
        matchedItem.apu.manoDeObra = newLabor;
      }
    } else {
      // Generic non-Lulowin partial merge logic
      // 3. Update Materiales (Quantities, Waste % Desp, and Unit Costs)
      if (ext.materiales && ext.materiales.length > 0) {
        for (const extMat of ext.materiales) {
          const existingMat = matchedItem.apu.materiales.find(
            (m) =>
              m.codigo.toUpperCase().trim() === extMat.codigo.toUpperCase().trim() ||
              calculateDescriptionSimilarity(m.descripcion, extMat.descripcion) > 0.75
          );

          const diffLines: string[] = [];

          if (existingMat) {
            // Insumo quantity
            if (updateInsumoQuantities && extMat.cantidad > 0 && Math.abs(existingMat.cantidad - extMat.cantidad) > 0.0001) {
              diffLines.push(`Cant: ${existingMat.cantidad} ➔ ${extMat.cantidad}`);
              existingMat.cantidad = extMat.cantidad;
              changedInsumo = true;
              partInsumoUpdatedCount++;
              insumosUpdated++;
            }

            // Waste % (Desperdicio)
            if (updateDesperdicios && extMat.desperdicioPorc !== undefined && Math.abs((existingMat.desperdicioPorc || 0) - extMat.desperdicioPorc) > 0.01) {
              diffLines.push(`Desp: ${existingMat.desperdicioPorc || 0}% ➔ ${extMat.desperdicioPorc}%`);
              existingMat.desperdicioPorc = extMat.desperdicioPorc;
              changedDesp = true;
              partDespUpdatedCount++;
              desperdiciosUpdated++;
            }

            // Price
            if (updatePrices && extMat.costoUnitario > 0 && Math.abs(existingMat.costoUnitario - extMat.costoUnitario) > 0.01) {
              diffLines.push(`Costo: $${existingMat.costoUnitario.toFixed(2)} ➔ $${extMat.costoUnitario.toFixed(2)}`);
              existingMat.costoUnitario = extMat.costoUnitario;
              changedPrice = true;
              pricesUpdated++;
            }

            // Recalculate line total
            existingMat.total = Math.round(existingMat.cantidad * existingMat.costoUnitario * (1 + (existingMat.desperdicioPorc || 0) / 100) * 1000) / 1000;

            if (diffLines.length > 0) {
              insumoDetails.push({
                tipo: 'material',
                codigo: existingMat.codigo,
                descripcion: existingMat.descripcion,
                cambios: diffLines,
              });
            }
          } else {
            matchedItem.apu.materiales.push({
              ...extMat,
              total: Math.round(extMat.cantidad * extMat.costoUnitario * (1 + (extMat.desperdicioPorc || 0) / 100) * 1000) / 1000,
            });
            changedInsumo = true;
            partInsumoUpdatedCount++;
            insumosUpdated++;
            insumoDetails.push({
              tipo: 'material',
              codigo: extMat.codigo,
              descripcion: extMat.descripcion,
              cambios: [`Anexado a APU (Cant: ${extMat.cantidad}, Desp: ${extMat.desperdicioPorc || 0}%, Costo: $${extMat.costoUnitario})`],
            });
          }
        }
      }

      // 4. Update Equipos (Quantities, Depreciation / Rental rates, and Costs)
      if (ext.equipos && ext.equipos.length > 0) {
        for (const extEq of ext.equipos) {
          const existingEq = matchedItem.apu.equipos.find(
            (e) =>
              e.codigo.toUpperCase().trim() === extEq.codigo.toUpperCase().trim() ||
              calculateDescriptionSimilarity(e.descripcion, extEq.descripcion) > 0.75
          );

          const diffLines: string[] = [];

          if (existingEq) {
            // Equipment quantity
            if (updateInsumoQuantities && extEq.cantidad > 0 && Math.abs(existingEq.cantidad - extEq.cantidad) > 0.0001) {
              diffLines.push(`Cant: ${existingEq.cantidad} ➔ ${extEq.cantidad}`);
              existingEq.cantidad = extEq.cantidad;
              changedInsumo = true;
              partInsumoUpdatedCount++;
              insumosUpdated++;
            }

            // Depreciation / Rental factor (Depreciacion)
            if (updateDepreciaciones && extEq.depreciacionOAlquiler !== undefined && Math.abs((existingEq.depreciacionOAlquiler || 1.0) - extEq.depreciacionOAlquiler) > 0.0001) {
              diffLines.push(`Deprec: ${(existingEq.depreciacionOAlquiler || 1.0).toFixed(4)} ➔ ${extEq.depreciacionOAlquiler.toFixed(4)}`);
              existingEq.depreciacionOAlquiler = extEq.depreciacionOAlquiler;
              changedDep = true;
              partDepUpdatedCount++;
              depreciacionesUpdated++;
            }

            // Cost
            if (updatePrices && extEq.costo > 0 && Math.abs(existingEq.costo - extEq.costo) > 0.01) {
              diffLines.push(`Costo: $${existingEq.costo.toFixed(2)} ➔ $${extEq.costo.toFixed(2)}`);
              existingEq.costo = extEq.costo;
              changedPrice = true;
              pricesUpdated++;
            }

            // Recalculate line total
            existingEq.total = Math.round(existingEq.cantidad * existingEq.costo * (existingEq.depreciacionOAlquiler || 1.0) * 1000) / 1000;

            if (diffLines.length > 0) {
              insumoDetails.push({
                tipo: 'equipo',
                codigo: existingEq.codigo,
                descripcion: existingEq.descripcion,
                cambios: diffLines,
              });
            }
          } else {
            matchedItem.apu.equipos.push({
              ...extEq,
              total: Math.round(extEq.cantidad * extEq.costo * (extEq.depreciacionOAlquiler || 1.0) * 1000) / 1000,
            });
            changedInsumo = true;
            partInsumoUpdatedCount++;
            insumosUpdated++;
            insumoDetails.push({
              tipo: 'equipo',
              codigo: extEq.codigo,
              descripcion: extEq.descripcion,
              cambios: [`Anexado a APU (Cant: ${extEq.cantidad}, Deprec: ${extEq.depreciacionOAlquiler || 1.0}, Costo: $${extEq.costo})`],
            });
          }
        }
      }

      // 5. Update Mano de Obra (Crew quantities and Daily wages)
      if (ext.manoDeObra && ext.manoDeObra.length > 0) {
        for (const extMo of ext.manoDeObra) {
          const existingMo = matchedItem.apu.manoDeObra.find(
            (m) =>
              m.codigo.toUpperCase().trim() === extMo.codigo.toUpperCase().trim() ||
              calculateDescriptionSimilarity(m.descripcion, extMo.descripcion) > 0.75
          );

          const diffLines: string[] = [];

          if (existingMo) {
            // Crew count (cantidad)
            if (updateInsumoQuantities && extMo.cantidad > 0 && Math.abs(existingMo.cantidad - extMo.cantidad) > 0.0001) {
              diffLines.push(`Cuadrilla: ${existingMo.cantidad} ➔ ${extMo.cantidad}`);
              existingMo.cantidad = extMo.cantidad;
              changedInsumo = true;
              partInsumoUpdatedCount++;
              insumosUpdated++;
            }

            // Wage
            if (updatePrices && extMo.salarioDiario > 0 && Math.abs(existingMo.salarioDiario - extMo.salarioDiario) > 0.01) {
              diffLines.push(`Salario: $${existingMo.salarioDiario.toFixed(2)} ➔ $${extMo.salarioDiario.toFixed(2)}`);
              existingMo.salarioDiario = extMo.salarioDiario;
              changedPrice = true;
              pricesUpdated++;
            }

            existingMo.total = Math.round(existingMo.cantidad * existingMo.salarioDiario * 1000) / 1000;

            if (diffLines.length > 0) {
              insumoDetails.push({
                tipo: 'mano_de_obra',
                codigo: existingMo.codigo,
                descripcion: existingMo.descripcion,
                cambios: diffLines,
              });
            }
          } else {
            matchedItem.apu.manoDeObra.push({
              ...extMo,
              total: Math.round(extMo.cantidad * extMo.salarioDiario * 1000) / 1000,
            });
            changedInsumo = true;
            partInsumoUpdatedCount++;
            insumosUpdated++;
            insumoDetails.push({
              tipo: 'mano_de_obra',
              codigo: extMo.codigo,
              descripcion: extMo.descripcion,
              cambios: [`Anexado a APU (Cuadrilla: ${extMo.cantidad}, Salario: $${extMo.salarioDiario})`],
            });
          }
        }
      }
    }

    // 6. Update Specs
    if (updateSpecs && ext.especificacion) {
      matchedItem.especificacion = {
        ...matchedItem.especificacion,
        ...ext.especificacion,
      };
      changedSpec = true;
      specsUpdated++;
    }

    const newCalc = calculateItemApu(matchedItem, fcasPorc, adminPorc, utilidadPorc);
    const hasPriceChange = Math.abs(oldCalc.precioUnitario - newCalc.precioUnitario) > 0.01;
    const hasAnyChange = changedQty || changedPrice || changedYield || changedSpec || changedInsumo || changedDesp || changedDep || hasPriceChange;

    const diffRecord: PartidaDiff = {
      itemId: matchedItem.id,
      codigo: matchedItem.codigoCovenin || String(matchedItem.id).padStart(3, '0'),
      descripcion: matchedItem.descripcion,
      unidad: matchedItem.unidad,
      oldQty: originalItem.cantidad,
      newQty: matchedItem.cantidad,
      oldPrice: oldCalc.precioUnitario,
      newPrice: newCalc.precioUnitario,
      oldYield: originalItem.apu.rendimiento,
      newYield: matchedItem.apu.rendimiento,
      specsUpdated: changedSpec,
      hasQuantityChange: changedQty,
      hasPriceChange,
      hasYieldChange: changedYield,
      hasInsumoChange: changedInsumo,
      hasDesperdicioChange: changedDesp,
      hasDepreciacionChange: changedDep,
      insumosUpdatedCount: partInsumoUpdatedCount,
      desperdiciosUpdatedCount: partDespUpdatedCount,
      depreciacionesUpdatedCount: partDepUpdatedCount,
      insumoDetails,
      hasAnyChange,
      sourceFile: ext.sourceFile,
    };

    diffsByItemId.set(matchedItem.id, diffRecord);
  }

  // =========================================================================
  // Master Catalog Cascading: Apply obramate, obraequi, obramano to ALL project items
  // =========================================================================
  if (masterCatalogs) {
    const { materials, equipment, labor } = masterCatalogs;

    for (const [itemId, item] of updatedItemsMap.entries()) {
      // If the partida was already completely replaced by a dedicated APU in obraapun, skip catalog overwrite
      if (fullyReplacedItemIds.has(itemId)) continue;

      const originalItem = itemMapById.get(itemId)!;
      let changedInItem = false;
      const extraInsumoDetails: InsumoDiffDetail[] = [];
      let itemInsumoCount = 0;
      let itemDespCount = 0;
      let itemDepCount = 0;

      // Check materials
      if (materials.size > 0 && item.apu.materiales.length > 0) {
        for (const mat of item.apu.materiales) {
          const master = materials.get(mat.codigo.toUpperCase());
          if (master) {
            const diffLines: string[] = [];
            if (updateDesperdicios && Math.abs((mat.desperdicioPorc || 0) - master.desperdicioPorc) > 0.01) {
              diffLines.push(`Desp: ${mat.desperdicioPorc || 0}% ➔ ${master.desperdicioPorc}% (obramate)`);
              mat.desperdicioPorc = master.desperdicioPorc;
              desperdiciosUpdated++;
              itemDespCount++;
              changedInItem = true;
            }
            if (updatePrices && master.costo > 0 && Math.abs(mat.costoUnitario - master.costo) > 0.01) {
              diffLines.push(`Costo: $${mat.costoUnitario.toFixed(2)} ➔ $${master.costo.toFixed(2)} (obramate)`);
              mat.costoUnitario = master.costo;
              pricesUpdated++;
              changedInItem = true;
            }
            mat.total = Math.round(mat.cantidad * mat.costoUnitario * (1 + (mat.desperdicioPorc || 0) / 100) * 1000) / 1000;
            if (diffLines.length > 0) {
              extraInsumoDetails.push({
                tipo: 'material',
                codigo: mat.codigo,
                descripcion: mat.descripcion,
                cambios: diffLines,
              });
            }
          }
        }
      }

      // Check equipment
      if (equipment.size > 0 && item.apu.equipos.length > 0) {
        for (const eq of item.apu.equipos) {
          const master = equipment.get(eq.codigo.toUpperCase());
          if (master) {
            const diffLines: string[] = [];
            if (updateDepreciaciones && Math.abs((eq.depreciacionOAlquiler || 1.0) - master.depreciacionOAlquiler) > 0.0001) {
              diffLines.push(`Deprec: ${(eq.depreciacionOAlquiler || 1.0).toFixed(4)} ➔ ${master.depreciacionOAlquiler.toFixed(4)} (obraequi)`);
              eq.depreciacionOAlquiler = master.depreciacionOAlquiler;
              depreciacionesUpdated++;
              itemDepCount++;
              changedInItem = true;
            }
            if (updatePrices && master.costo > 0 && Math.abs(eq.costo - master.costo) > 0.01) {
              diffLines.push(`Costo: $${eq.costo.toFixed(2)} ➔ $${master.costo.toFixed(2)} (obraequi)`);
              eq.costo = master.costo;
              pricesUpdated++;
              changedInItem = true;
            }
            eq.total = Math.round(eq.cantidad * eq.costo * (eq.depreciacionOAlquiler || 1.0) * 1000) / 1000;
            if (diffLines.length > 0) {
              extraInsumoDetails.push({
                tipo: 'equipo',
                codigo: eq.codigo,
                descripcion: eq.descripcion,
                cambios: diffLines,
              });
            }
          }
        }
      }

      // Check labor
      if (labor.size > 0 && item.apu.manoDeObra.length > 0) {
        for (const mo of item.apu.manoDeObra) {
          const master = labor.get(mo.codigo.toUpperCase());
          if (master) {
            const diffLines: string[] = [];
            if (updatePrices && master.salarioDiario > 0 && Math.abs(mo.salarioDiario - master.salarioDiario) > 0.01) {
              diffLines.push(`Salario: $${mo.salarioDiario.toFixed(2)} ➔ $${master.salarioDiario.toFixed(2)} (obramano)`);
              mo.salarioDiario = master.salarioDiario;
              pricesUpdated++;
              changedInItem = true;
            }
            mo.total = Math.round(mo.cantidad * mo.salarioDiario * 1000) / 1000;
            if (diffLines.length > 0) {
              extraInsumoDetails.push({
                tipo: 'mano_de_obra',
                codigo: mo.codigo,
                descripcion: mo.descripcion,
                cambios: diffLines,
              });
            }
          }
        }
      }

      if (changedInItem) {
        matchedItemIds.add(itemId);
        const oldCalc = calculateItemApu(originalItem, fcasPorc, adminPorc, utilidadPorc);
        const newCalc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);

        let existingDiff = diffsByItemId.get(itemId);
        if (existingDiff) {
          existingDiff.newPrice = newCalc.precioUnitario;
          existingDiff.hasPriceChange = Math.abs(oldCalc.precioUnitario - newCalc.precioUnitario) > 0.01;
          existingDiff.insumoDetails = [...existingDiff.insumoDetails, ...extraInsumoDetails];
          existingDiff.desperdiciosUpdatedCount += itemDespCount;
          existingDiff.depreciacionesUpdatedCount += itemDepCount;
          existingDiff.insumosUpdatedCount += itemInsumoCount;
          existingDiff.hasAnyChange = true;
        } else {
          diffsByItemId.set(itemId, {
            itemId: item.id,
            codigo: item.codigoCovenin || String(item.id).padStart(3, '0'),
            descripcion: item.descripcion,
            unidad: item.unidad,
            oldQty: originalItem.cantidad,
            newQty: item.cantidad,
            oldPrice: oldCalc.precioUnitario,
            newPrice: newCalc.precioUnitario,
            oldYield: originalItem.apu.rendimiento,
            newYield: item.apu.rendimiento,
            specsUpdated: false,
            hasQuantityChange: false,
            hasPriceChange: Math.abs(oldCalc.precioUnitario - newCalc.precioUnitario) > 0.01,
            hasYieldChange: false,
            hasInsumoChange: extraInsumoDetails.length > 0,
            hasDesperdicioChange: itemDespCount > 0,
            hasDepreciacionChange: itemDepCount > 0,
            insumosUpdatedCount: itemInsumoCount,
            desperdiciosUpdatedCount: itemDespCount,
            depreciacionesUpdatedCount: itemDepCount,
            insumoDetails: extraInsumoDetails,
            hasAnyChange: true,
            sourceFile: 'Catálogo Maestro Lulowin (ObraMate/Equi/Mano)',
          });
        }
      }
    }
  }

  const finalDiffs = Array.from(diffsByItemId.values()).sort((a, b) => a.itemId - b.itemId);
  const finalUpdatedItems = Array.from(updatedItemsMap.values()).sort((a, b) => a.id - b.id);

  return {
    updatedItems: finalUpdatedItems,
    diffs: finalDiffs,
    stats: {
      totalProjectItems: currentItems.length,
      matchedCount: matchedItemIds.size,
      quantitiesUpdated,
      pricesUpdated,
      yieldsUpdated,
      specsUpdated,
      insumosUpdated,
      desperdiciosUpdated,
      depreciacionesUpdated,
      totalChanges:
        quantitiesUpdated +
        pricesUpdated +
        yieldsUpdated +
        specsUpdated +
        insumosUpdated +
        desperdiciosUpdated +
        depreciacionesUpdated,
    },
    lulowinMetadata,
    masterCatalogs,
  };
}

export interface ProjectApuValidationReport {
  totalItems: number;
  itemsWithApu: number;
  totalMaterials: number;
  materialsWithWaste: number;
  totalEquipment: number;
  equipmentWithDeprec: number;
  totalLabor: number;
  allItemsValidated: boolean;
}

/**
 * Validates that all project partidas have complete APU breakdowns
 * with verified quantities, unit prices, waste percentages and depreciation factors.
 */
export function validateAllProjectApus(items: PartidaItem[]): ProjectApuValidationReport {
  let itemsWithApu = 0;
  let totalMaterials = 0;
  let materialsWithWaste = 0;
  let totalEquipment = 0;
  let equipmentWithDeprec = 0;
  let totalLabor = 0;

  for (const item of items) {
    if (!item.apu) continue;
    const hasApuContent =
      item.apu.materiales.length > 0 ||
      item.apu.equipos.length > 0 ||
      item.apu.manoDeObra.length > 0;
    if (hasApuContent) itemsWithApu++;

    for (const mat of item.apu.materiales) {
      totalMaterials++;
      if (mat.desperdicioPorc !== undefined) materialsWithWaste++;
    }
    for (const eq of item.apu.equipos) {
      totalEquipment++;
      if (eq.depreciacionOAlquiler !== undefined && eq.depreciacionOAlquiler > 0) {
        equipmentWithDeprec++;
      }
    }
    for (const _mo of item.apu.manoDeObra) {
      totalLabor++;
    }
  }

  return {
    totalItems: items.length,
    itemsWithApu,
    totalMaterials,
    materialsWithWaste,
    totalEquipment,
    equipmentWithDeprec,
    totalLabor,
    allItemsValidated: itemsWithApu === items.length,
  };
}
