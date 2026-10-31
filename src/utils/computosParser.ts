import * as XLSX from 'xlsx';
import { PartidaItem, ApuDetail, TechnicalSpecification, MaterialItem, EquipmentItem, LaborItem } from '../types/costTypes';
import { ALL_ITEMS, CATEGORIES } from '../data/itemsData';
import { TABULADOR_PETROLERO } from '../data/laborRates';
import { abbreviateInsumoDesc, sanitizeCode } from './lulowinNormalizer';

export interface ParsedComputoRow {
  index: number;
  codigo?: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  rendimiento?: number;
  capitulo?: string;
}

const COMMON_UNITS = [
  'M2', 'M3', 'ML', 'M', 'KG', 'KGS', 'TON', 'PZA', 'PZAS', 'UND', 'UNID',
  'GLB', 'SG', 'PTO', 'PTOS', 'DIA', 'DIAS', 'MES', 'HR', 'HRS', 'VIAJE',
  'VIAJES', 'SACO', 'SACOS', 'LTS', 'LT', 'GAL', 'ROLLO', 'ROLLOS', 'JGO', 'JGOS'
];

/**
 * Normalizes number strings from either Venezuelan/European format (1.234,56)
 * or standard US format (1,234.56).
 */
export function parseLocalizedNumber(raw: string | number | undefined): number {
  if (typeof raw === 'number') {
    return isNaN(raw) ? 0 : raw;
  }
  if (!raw) return 0;
  const str = String(raw).trim();
  if (!str) return 0;

  // If contains comma and dot, check positions
  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastComma > lastDot) {
    // European/Venezuelan format e.g. 1.250,50 -> 1250.50
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  } else if (lastDot > lastComma) {
    // US format e.g. 1,250.50 -> 1250.50
    const cleaned = str.replace(/,/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only comma, e.g. "25,50" -> 25.50
    const n = parseFloat(str.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  } else {
    // Only dot or plain integer, e.g. "25.50" or "25"
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }
}

/**
 * Normalizes a unit string to standard Venezuelan PDVSA uppercase
 */
export function normalizeUnit(raw: string): string {
  const u = raw.trim().toUpperCase().replace(/\./g, '');
  if (u === 'MTS2' || u === 'MT2' || u === 'METROS CUADRADOS' || u === 'METRO CUADRADO') return 'M2';
  if (u === 'MTS3' || u === 'MT3' || u === 'METROS CUBICOS' || u === 'METRO CUBICO') return 'M3';
  if (u === 'MTS' || u === 'METROS' || u === 'METRO LINEAL' || u === 'METROS LINEALES') return 'ML';
  if (u === 'KILOGRAMOS' || u === 'KILOGRAMO' || u === 'KGS') return 'KG';
  if (u === 'TONELADAS' || u === 'TONELADA' || u === 'TN') return 'TON';
  if (u === 'PIEZAS' || u === 'PIEZA' || u === 'PZAS' || u === 'PZA') return 'PZA';
  if (u === 'UNIDADES' || u === 'UNIDAD' || u === 'UNID') return 'UND';
  if (u === 'SUMA GLOBAL' || u === 'S.G.' || u === 'S.G') return 'SG';
  if (u === 'GLOBAL' || u === 'GLO') return 'GLB';
  if (u === 'PUNTOS' || u === 'PUNTO') return 'PTO';
  if (u === 'DIAS' || u === 'DIA') return 'DIA';
  if (u === 'MESES') return 'MES';
  if (u === 'HORAS' || u === 'HORA') return 'HR';
  if (u === 'VIAJES') return 'VIAJE';
  if (u === 'JUEGO' || u === 'JUEGOS') return 'JGO';
  return u || 'UND';
}

/**
 * Parses raw tabular text (from copy-pasting Excel, Word, or PDF cómputos)
 */
export function parseComputosText(rawText: string): ParsedComputoRow[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: ParsedComputoRow[] = [];
  let currentCapitulo = CATEGORIES[1] || 'Obras Civiles y Preliminares';
  let counter = 1;

  for (const line of lines) {
    // Check if line is a chapter/section title (e.g. "CAPITULO I: DEMOLICIONES", "1. OBRAS PRELIMINARES")
    const chapterMatch = line.match(/^(?:CAP[IÍ]TULO|CAP\.|SECCI[OÓ]N|\b[IVXLCDM]+\b)\s*[:.-]?\s*(.+)$/i);
    if (chapterMatch && !line.includes('\t') && !line.includes(';') && line.split(/\s{2,}/).length < 3) {
      currentCapitulo = chapterMatch[1].trim();
      continue;
    }

    // Split line by tab, semicolon, or multi-space
    let tokens: string[] = [];
    if (line.includes('\t')) {
      tokens = line.split('\t').map(t => t.trim());
    } else if (line.includes(';')) {
      tokens = line.split(';').map(t => t.trim());
    } else if (line.includes('|')) {
      tokens = line.split('|').map(t => t.trim()).filter(Boolean);
    } else {
      // Split by 2 or more spaces
      tokens = line.split(/\s{2,}/).map(t => t.trim());
    }

    if (tokens.length === 1) {
      // Try regex pattern matching for "1 001 DESCRIPCION M2 150.00"
      const linePattern = line.match(/^(\d+)?\s*([A-Za-z0-9.-]+)?\s+(.+?)\s+([A-Za-z0-9]{1,6})\s+([\d.,]+)(?:\s+([\d.,]+))?$/);
      if (linePattern) {
        tokens = [
          linePattern[1] || '',
          linePattern[2] || '',
          linePattern[3] || '',
          linePattern[4] || '',
          linePattern[5] || '',
          linePattern[6] || ''
        ].filter(Boolean);
      }
    }

    if (tokens.length < 2) continue;

    // Detect header row and skip it
    const firstTwo = (tokens[0] + ' ' + tokens[1]).toLowerCase();
    if (firstTwo.includes('partida') || firstTwo.includes('descripci') || firstTwo.includes('código') || firstTwo.includes('codigo')) {
      continue;
    }

    // Extract columns heuristically
    let codigo = '';
    let descripcion = '';
    let unidad = 'UND';
    let cantidad = 1;
    let rendimiento: number | undefined = undefined;

    // Search for unit in tokens
    let unitIdx = -1;
    for (let i = 0; i < tokens.length; i++) {
      const u = tokens[i].toUpperCase().replace(/\./g, '');
      if (COMMON_UNITS.includes(u)) {
        unitIdx = i;
        unidad = normalizeUnit(u);
        break;
      }
    }

    if (unitIdx !== -1) {
      // Tokens before unitIdx are likely Index / Code / Description
      const preUnit = tokens.slice(0, unitIdx);
      const postUnit = tokens.slice(unitIdx + 1);

      // Analyze preUnit
      if (preUnit.length === 1) {
        descripcion = preUnit[0];
      } else if (preUnit.length === 2) {
        if (/^\d+$/.test(preUnit[0]) || /^[A-Z0-9.-]{2,12}$/i.test(preUnit[0])) {
          codigo = preUnit[0];
          descripcion = preUnit[1];
        } else {
          descripcion = preUnit.join(' ');
        }
      } else if (preUnit.length >= 3) {
        codigo = preUnit[1];
        descripcion = preUnit.slice(2).join(' ');
      }

      // Analyze postUnit for quantity & yield
      if (postUnit.length >= 1) {
        cantidad = parseLocalizedNumber(postUnit[0]) || 1;
      }
      if (postUnit.length >= 2) {
        rendimiento = parseLocalizedNumber(postUnit[1]) || undefined;
      }
    } else {
      // No standard unit detected; assume last token is quantity, 2nd-to-last is unit
      if (tokens.length >= 3) {
        const last = tokens[tokens.length - 1];
        const secondLast = tokens[tokens.length - 2];
        const parsedQty = parseLocalizedNumber(last);
        if (parsedQty > 0) {
          cantidad = parsedQty;
          unidad = normalizeUnit(secondLast);
          descripcion = tokens.slice(0, tokens.length - 2).join(' ');
        } else {
          descripcion = tokens.join(' ');
        }
      } else {
        descripcion = tokens.join(' ');
      }
    }

    // Clean description of leading row number (e.g. "1. DEMOLICION..." -> "DEMOLICION...")
    descripcion = descripcion.replace(/^\d+[\s.-]+/, '').trim();
    if (!descripcion) continue;

    results.push({
      index: counter++,
      codigo: codigo || String(counter - 1).padStart(3, '0'),
      descripcion: descripcion.toUpperCase(),
      unidad: unidad || 'UND',
      cantidad: cantidad > 0 ? cantidad : 1,
      rendimiento,
      capitulo: currentCapitulo
    });
  }

  return results;
}

/**
 * Parses an Excel or CSV file buffer into structured Cómputos rows
 */
export async function parseComputosExcel(fileData: ArrayBuffer): Promise<ParsedComputoRow[]> {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rows.length === 0) return [];

  // Search for header row
  let headerRowIdx = -1;
  let colDesc = -1;
  let colCode = -1;
  let colUnit = -1;
  let colQty = -1;
  let colRend = -1;
  let colCap = -1;

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').toLowerCase().trim();
      if (val.includes('descrip')) colDesc = c;
      if (val.includes('partida') || val.includes('código') || val.includes('codigo') || val.includes('item')) colCode = c;
      if (val === 'unidad' || val === 'und' || val === 'unid' || val === 'u') colUnit = c;
      if (val.includes('cant') || val.includes('metrado') || val.includes('computo')) colQty = c;
      if (val.includes('rend') || val.includes('producc')) colRend = c;
      if (val.includes('capit') || val.includes('categoria') || val.includes('fase')) colCap = c;
    }
    if (colDesc !== -1 && (colQty !== -1 || colUnit !== -1)) {
      headerRowIdx = r;
      break;
    }
  }

  const results: ParsedComputoRow[] = [];
  let currentCapitulo = CATEGORIES[1] || 'Obras Civiles y Preliminares';
  let counter = 1;

  const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r] || [];
    if (row.length === 0 || row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }

    // Check if row is a chapter title (only 1 non-empty cell spanning across)
    const nonEmptyCells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmptyCells.length === 1 && typeof nonEmptyCells[0] === 'string') {
      const txt = String(nonEmptyCells[0]).trim();
      if (txt.length > 3 && !txt.match(/^\d+$/)) {
        currentCapitulo = txt;
        continue;
      }
    }

    let descripcion = colDesc !== -1 ? String(row[colDesc] || '').trim() : '';
    let codigo = colCode !== -1 ? String(row[colCode] || '').trim() : '';
    let unidad = colUnit !== -1 ? String(row[colUnit] || '').trim() : '';
    let cantidad = colQty !== -1 ? parseLocalizedNumber(row[colQty]) : 1;
    let rendimiento = colRend !== -1 ? parseLocalizedNumber(row[colRend]) : undefined;
    let capitulo = colCap !== -1 && row[colCap] ? String(row[colCap]).trim() : currentCapitulo;

    // Fallback if headers were not detected
    if (colDesc === -1) {
      // Heuristic: longest string is description
      let maxStr = '';
      for (const cell of row) {
        if (typeof cell === 'string' && cell.length > maxStr.length) {
          maxStr = cell;
        }
      }
      descripcion = maxStr;

      // Find unit and quantity
      for (const cell of row) {
        if (typeof cell === 'string' && COMMON_UNITS.includes(cell.toUpperCase().trim())) {
          unidad = cell;
        }
        if (typeof cell === 'number' && cell > 0 && cell !== cantidad) {
          cantidad = cell;
        }
      }
    }

    if (!descripcion || descripcion.toLowerCase().includes('total') || descripcion.toLowerCase().includes('subtotal')) {
      continue;
    }

    results.push({
      index: counter++,
      codigo: codigo || String(counter - 1).padStart(3, '0'),
      descripcion: descripcion.toUpperCase(),
      unidad: normalizeUnit(unidad || 'UND'),
      cantidad: cantidad > 0 ? cantidad : 1,
      rendimiento: rendimiento && rendimiento > 0 ? rendimiento : undefined,
      capitulo: capitulo || currentCapitulo
    });
  }

  return results;
}

/**
 * Intelligent APU matcher: finds best matching item in ALL_ITEMS by keyword similarity
 */
function findBestMatchingApu(desc: string, unit: string, catalog: PartidaItem[]): PartidaItem | null {
  const normDesc = desc.toLowerCase();
  let bestItem: PartidaItem | null = null;
  let maxScore = 0;

  for (const item of catalog) {
    const itemDesc = item.descripcion.toLowerCase();
    let score = 0;

    // Exact word matches
    const words = normDesc.split(/\s+/).filter(w => w.length > 3);
    for (const w of words) {
      if (itemDesc.includes(w)) {
        score += w.length > 5 ? 3 : 2;
      }
    }

    // Unit match bonus
    if (item.unidad.toUpperCase() === unit.toUpperCase()) {
      score += 4;
    }

    if (score > maxScore) {
      maxScore = score;
      bestItem = item;
    }
  }

  // Require a minimum relevance score
  return maxScore >= 6 ? bestItem : null;
}

/**
 * Generates complete PartidaItems with balanced APU (3-5 equipment, realistic labor under CCP)
 * and 15-numeral Technical Specifications for every imported cómputo row.
 */
export function generatePartidasFromComputos(
  rows: ParsedComputoRow[],
  baseCatalog: PartidaItem[] = ALL_ITEMS
): PartidaItem[] {
  return rows.map((row, idx) => {
    const id = idx + 1;
    const code = row.codigo ? sanitizeCode(row.codigo, 'P', id) : String(id).padStart(3, '0');
    const matched = findBestMatchingApu(row.descripcion, row.unidad, baseCatalog);

    let apu: ApuDetail;
    let especificacion: TechnicalSpecification;

    if (matched) {
      // Clone matched APU with cloned objects to prevent mutations
      apu = {
        rendimiento: row.rendimiento || matched.apu.rendimiento,
        unidadRendimiento: matched.apu.unidadRendimiento || `${row.unidad}/día`,
        materiales: matched.apu.materiales.map(m => ({ ...m })),
        equipos: matched.apu.equipos.slice(0, 5).map(e => ({ ...e })),
        manoDeObra: matched.apu.manoDeObra.map(mo => ({ ...mo })),
      };

      especificacion = {
        ...matched.especificacion,
        extensionTrabajo: `Comprende todas las labores requeridas para la correcta ejecución de: ${row.descripcion}. Incluye suministro de insumos certificados, transporte hasta el sitio de obra, maniobras de izado/colocación, mano de obra calificada bajo LOTTT y pruebas de aceptación final.`,
      };
    } else {
      // Build standard realistic APU
      const defaultRend = row.rendimiento || (row.unidad === 'M2' ? 25 : row.unidad === 'M3' ? 8 : row.unidad === 'ML' ? 30 : row.unidad === 'PZA' ? 10 : 5);

      // Standard materials
      const materiales: MaterialItem[] = [
        {
          codigo: 'MAT-GEN-01',
          descripcion: abbreviateInsumoDesc(`MATERIALES ESPECIFICADOS PARA ${row.descripcion}`),
          unidad: row.unidad,
          cantidad: 1.05,
          desperdicioPorc: 5,
          costoUnitario: 15.50,
          total: 16.275,
        },
        {
          codigo: 'MAT-CONS-02',
          descripcion: abbreviateInsumoDesc('CONSUMIBLES MENORES Y ELEMENTOS DE FIJACIÓN'),
          unidad: 'GLB',
          cantidad: 1.0,
          desperdicioPorc: 0,
          costoUnitario: 4.50,
          total: 4.50,
        },
      ];

      // Standard realistic equipment (max 3 items including minor tools)
      const equipos: EquipmentItem[] = [
        {
          codigo: 'EQ-HERR-01',
          descripcion: abbreviateInsumoDesc('HERRAMIENTAS MENORES (PICOS, PALAS, CARRETILLAS)'),
          cantidad: 1,
          costo: 10.50,
          depreciacionOAlquiler: 1.0,
          total: 10.50,
        },
        {
          codigo: 'EQ-SEG-02',
          descripcion: abbreviateInsumoDesc('EQUIPOS DE SEGURIDAD INDUSTRIAL Y SEÑALIZACIÓN VIAL'),
          cantidad: 1,
          costo: 7.50,
          depreciacionOAlquiler: 1.0,
          total: 7.50,
        },
      ];

      // Standard labor crew under Petrolero CCP
      const caporalRate = TABULADOR_PETROLERO.CAPORAL.salarioDiario || 6.00;
      const obreroRate = TABULADOR_PETROLERO.OBRERO.salarioDiario || 3.50;
      const oficialRate = TABULADOR_PETROLERO.ALBANIL_A.salarioDiario || 4.70;

      const manoDeObra: LaborItem[] = [
        {
          codigo: '11-1-3',
          descripcion: abbreviateInsumoDesc('CAPORAL'),
          cantidad: 0.20,
          salarioDiario: caporalRate,
          total: 0.20 * caporalRate,
        },
        {
          codigo: '4-1-1',
          descripcion: abbreviateInsumoDesc('OFICIAL DE PRIMERA / ESPECIALISTA'),
          cantidad: 1.00,
          salarioDiario: oficialRate,
          total: oficialRate,
        },
        {
          codigo: '1-1-1',
          descripcion: abbreviateInsumoDesc('OBRERO / AYUDANTE CALIFICADO'),
          cantidad: 2.00,
          salarioDiario: obreroRate,
          total: 2.00 * obreroRate,
        },
      ];

      apu = {
        rendimiento: defaultRend,
        unidadRendimiento: `${row.unidad}/día`,
        materiales,
        equipos,
        manoDeObra,
      };

      especificacion = {
        extensionTrabajo: `Comprende todas las labores requeridas para la correcta ejecución de: ${row.descripcion}. Incluye suministro de insumos certificados, transporte hasta el sitio de obra, mano de obra calificada bajo LOTTT y pruebas de aceptación final.`,
        procedimientoEjecucion: `1. Inspección previa del área de trabajo y replanteo topográfico o dimensional.\n2. Ejecución de las labores de ${row.descripcion.toLowerCase()} conforme a especificaciones técnicas y normas PDVSA.\n3. Limpieza final y desalojo de escombros o sobrantes a bote autorizado.`,
        toleranciasAceptacion: 'Se exigirá alineación milimétrica en elementos visibles (+/- 2 mm), verticalidad y estanqueidad certificada sin desperfectos aparentes.',
        ensayosARealizar: 'NO APLICA',
        desperdicioMaximo: 'MÁXIMO 5%',
        planos: 'SEGÚN PROYECTO / PLANOS DE DETALLE',
        condicionesEspeciales: 'Cumplimiento estricto de las normas SIHO de PDVSA, uso obligatorio de EPP y permiso de trabajo en caliente/frío según aplique.',
        medidaYFormaPago: `Se medirá y pagará por ${row.unidad} debidamente ejecutada e inspeccionada a satisfacción de PDVSA.`,
        noConformidad: 'En caso de no cumplir con las tolerancias o normas técnicas, el contratista deberá rehacer los trabajos a su costo sin prórroga de plazo.',
      };
    }

    return {
      id,
      capitulo: row.capitulo || CATEGORIES[1] || 'Obras Civiles',
      codigoCovenin: code,
      descripcion: row.descripcion,
      unidad: row.unidad,
      cantidad: row.cantidad,
      apu,
      especificacion,
    };
  });
}
