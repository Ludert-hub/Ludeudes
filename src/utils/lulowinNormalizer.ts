import { PartidaItem } from '../types/costTypes';
import { calculateItemApu } from './apuCalculations';
import {
  LulowinDatabase,
  ObraApunRow,
  ObraApinMateRow,
  ObraApinEquiRow,
  ObraApinManoRow,
  ObraPartRow,
  ObraMateRow,
  ObraManoRow,
  ObraEquiRow,
  ObraPainMateRow,
  ObraPainEquiRow,
  ObraPainManoRow
} from './lulowinTypes';

/**
 * Strictly abbreviates any insumo description to 54 characters or fewer,
 * applying standard construction and engineering abbreviations.
 */
export function abbreviateInsumoDesc(desc: string): string {
  if (!desc) return '';
  let text = desc.trim().replace(/\s+/g, ' ');
  if (text.length <= 54) return text;

  // Dictionary of engineering replacements to preserve readability
  const replacements: [RegExp, string][] = [
    [/\bSUMINISTRO E INSTALACION\b/gi, 'SUM. E INST.'],
    [/\bSUMINISTRO Y COLOCACION\b/gi, 'SUM. Y COLOC.'],
    [/\bSUMINISTRO\b/gi, 'SUM.'],
    [/\bINSTALACION\b/gi, 'INST.'],
    [/\bTRANSPORTE\b/gi, 'TRANSP.'],
    [/\bCONSTRUCCION\b/gi, 'CONST.'],
    [/\bHERRAMIENTAS MENORES\b/gi, 'HERRAM. MENORES'],
    [/\bHERRAMIENTAS\b/gi, 'HERRAM.'],
    [/\bMANTENIMIENTO\b/gi, 'MTTO.'],
    [/\bREHABILITACION\b/gi, 'REHAB.'],
    [/\bPROFESIONAL\b/gi, 'PROF.'],
    [/\bCONCRETO\b/gi, 'CONCR.'],
    [/\bIMPERMEABILIZACION\b/gi, 'IMPERM.'],
    [/\bACONDICIONADO\b/gi, 'ACOND.'],
    [/\bESTRUCTURA\b/gi, 'ESTR.'],
    [/\bELECTRICO\b/gi, 'ELEC.'],
    [/\bELECTRICA\b/gi, 'ELEC.'],
    [/\bSANITARIO\b/gi, 'SANIT.'],
    [/\bSANITARIA\b/gi, 'SANIT.'],
    [/\bACCESORIOS\b/gi, 'ACCES.'],
    [/\bOPERADOR DE\b/gi, 'OPER.'],
    [/\bOPERADOR\b/gi, 'OPER.'],
    [/\bMECANICO\b/gi, 'MEC.'],
    [/\bSOLDADOR\b/gi, 'SOLD.'],
    [/\bCARPINTERO\b/gi, 'CARP.'],
    [/\bELECTRICISTA\b/gi, 'ELEC.'],
    [/\bALBAÑIL\b/gi, 'ALB.'],
    [/\bPLOMERO\b/gi, 'PLOM.'],
    [/\bPAVIMENTADORA\b/gi, 'PAVIM.'],
    [/\bCOMPUTADORA\b/gi, 'COMPUT.'],
    [/\bPINTURA\b/gi, 'PINT.'],
    [/\bTUBERIA\b/gi, 'TUB.'],
    [/\bMATERIALES\b/gi, 'MAT.'],
  ];

  for (const [pattern, rep] of replacements) {
    if (text.length <= 54) break;
    text = text.replace(pattern, rep);
  }

  // Hard clamp if still exceeds 54 chars
  if (text.length > 54) {
    text = text.substring(0, 54).trim();
  }

  return text;
}

/**
 * Strictly ensures a code is at most 6 characters (including spaces and symbols).
 */
export function sanitizeCode(code: string, fallbackPrefix: string = 'COD', idNum: number = 1): string {
  if (!code) {
    return `${fallbackPrefix}${String(idNum).padStart(3, '0')}`.substring(0, 6).toUpperCase();
  }

  const clean = code.trim().toUpperCase();
  if (clean.length <= 6) return clean;

  // Try removing dashes or dots
  const stripped = clean.replace(/[-_.\s/]/g, '');
  if (stripped.length <= 6) return stripped;

  // If still too long, take the first 6 alphanumeric chars
  return stripped.substring(0, 6);
}

/**
 * Strictly formats a partida code to a 3-digit zero-padded string ('001', '002', ..., '363').
 * Matches both LuloWin 6-character limit and the user's mandatory 3-digit codification.
 */
export function formatPartidaCode(item: PartidaItem): string {
  if (item.codigoCovenin && /^\d{3,}$/.test(item.codigoCovenin.trim())) {
    return item.codigoCovenin.trim().padStart(3, '0').substring(0, 6);
  }
  return String(item.id).padStart(3, '0');
}


/**
 * Builds the complete LuloWin database structures with exact relational consistency:
 * - When an insumo repeats across partidas, it has the EXACT same code.
 * - All codes are <= 6 characters.
 * - All insumo descriptions are <= 54 characters.
 */
export function buildLulowinDatabase(
  items: PartidaItem[],
  obraCode: string = 'ZXV',
  fcasPorc: number = 1200,
  adminPorc: number = 12.5,
  utilidadPorc: number = 35.0
): LulowinDatabase {
  const obraApun: ObraApunRow[] = [];
  const obraApinMate: ObraApinMateRow[] = [];
  const obraApinEqui: ObraApinEquiRow[] = [];
  const obraApinMano: ObraApinManoRow[] = [];

  const obraPart: ObraPartRow[] = [];
  const obraPainMate: ObraPainMateRow[] = [];
  const obraPainEqui: ObraPainEquiRow[] = [];
  const obraPainMano: ObraPainManoRow[] = [];

  // Canonical dictionaries to enforce duplicate insumos sharing the EXACT SAME code
  // Key: Normalized (desc + unit)
  const canonicalMaterials = new Map<string, { code: string; desc: string; unit: string; cost: number; waste: number }>();
  const canonicalEquipments = new Map<string, { code: string; desc: string; cost: number; dailyCost: number; deprec: number }>();
  const canonicalLabor = new Map<string, { code: string; desc: string; wage: number }>();

  // Helper counters for generating unique 6-char codes when needed
  let matCounter = 1;
  let eqCounter = 1;
  let manCounter = 1;

  // 1. First pass: Collect and canonicalize all unique insumos across all partidas
  for (const item of items) {
    // Materials
    for (const mat of item.apu.materiales) {
      const normKey = `${mat.descripcion.trim().toLowerCase()}_${mat.unidad.trim().toLowerCase()}`;
      if (!canonicalMaterials.has(normKey)) {
        let code = sanitizeCode(mat.codigo, 'M', matCounter);
        // Ensure uniqueness of code if another material had the same raw code
        const codeExists = Array.from(canonicalMaterials.values()).some((m) => m.code === code);
        if (codeExists) {
          code = `M${String(matCounter).padStart(5, '0')}`.substring(0, 6);
        }
        matCounter++;
        canonicalMaterials.set(normKey, {
          code,
          desc: abbreviateInsumoDesc(mat.descripcion),
          unit: mat.unidad.trim().toUpperCase() || 'UND',
          cost: Number(mat.costoUnitario) || 0,
          waste: Number(mat.desperdicioPorc) || 0,
        });
      }
    }

    // Equipment
    for (const eq of item.apu.equipos) {
      const normKey = eq.descripcion.trim().toLowerCase();
      if (!canonicalEquipments.has(normKey)) {
        let code = sanitizeCode(eq.codigo, 'E', eqCounter);
        const codeExists = Array.from(canonicalEquipments.values()).some((e) => e.code === code);
        if (codeExists) {
          code = `E${String(eqCounter).padStart(5, '0')}`.substring(0, 6);
        }
        eqCounter++;
        canonicalEquipments.set(normKey, {
          code,
          desc: abbreviateInsumoDesc(eq.descripcion),
          cost: Number(eq.costo) || 0,
          dailyCost: +((Number(eq.costo) || 0) * (Number(eq.depreciacionOAlquiler) || 1)).toFixed(2),
          deprec: Number(eq.depreciacionOAlquiler) || 1,
        });
      }
    }

    // Labor
    for (const mo of item.apu.manoDeObra) {
      const normKey = mo.descripcion.trim().toLowerCase();
      if (!canonicalLabor.has(normKey)) {
        let code = sanitizeCode(mo.codigo, 'MO', manCounter);
        const codeExists = Array.from(canonicalLabor.values()).some((l) => l.code === code);
        if (codeExists) {
          code = `MO${String(manCounter).padStart(4, '0')}`.substring(0, 6);
        }
        manCounter++;
        canonicalLabor.set(normKey, {
          code,
          desc: abbreviateInsumoDesc(mo.descripcion),
          wage: Number(mo.salarioDiario) || 0,
        });
      }
    }
  }

  // 2. Build Master Catalogs: ObraMate, ObraEqui, ObraMano
  const obraMate: ObraMateRow[] = Array.from(canonicalMaterials.values()).map((m) => ({
    CodMat: m.code,
    CodFam: '00',
    Descri: m.desc,
    UniMat: m.unit,
    CosMat: m.cost,
    Desper: m.waste,
  }));

  const obraEqui: ObraEquiRow[] = Array.from(canonicalEquipments.values()).map((e) => ({
    CodeEqu: e.code,
    CodFam: '00',
    Descri: e.desc,
    CosEqu: e.cost,
    CosDia: e.dailyCost,
    Deprec: e.deprec,
  }));

  const obraMano: ObraManoRow[] = Array.from(canonicalLabor.values()).map((l) => ({
    CodMan: l.code,
    CodFam: l.code.startsWith('11') || l.code.startsWith('19') ? '01' : '00',
    Descri: l.desc,
    Salari: l.wage,
  }));

  // 3. Second pass: Build Partida catalogs and relational obra tables
  items.forEach((item, index) => {
    const numPar = index + 1; // Sequential correlative: 1, 2, 3...
    const codPar = formatPartidaCode(item);
    const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);
    const renPar = Number(item.apu.rendimiento) || 1;
    const canPar = Number(item.cantidad) || 1;
    const preUni = Number(calc.precioUnitario) || 0;

    // Master Partida: ObraPart
    obraPart.push({
      CodPar: codPar,
      Descri: item.descripcion,
      UniPar: item.unidad.trim() || 'UND',
      RenPar: renPar,
      PreUni: preUni,
      CanPar: 1, // Standard master catalog quantity is 1
    });

    // Obra Partida: ObraApun
    obraApun.push({
      CodObr: obraCode,
      NumPar: numPar,
      CodPar: codPar,
      RenPar: renPar,
      CanPar: canPar,
      PreUni: preUni,
    });

    // Materials detail: ObraApinMate & ObraPainMate
    for (const mat of item.apu.materiales) {
      const normKey = `${mat.descripcion.trim().toLowerCase()}_${mat.unidad.trim().toLowerCase()}`;
      const canonical = canonicalMaterials.get(normKey);
      const codIns = canonical ? canonical.code : sanitizeCode(mat.codigo, 'M', 1);

      obraApinMate.push({
        CodObr: obraCode,
        CodPar: codPar,
        NumPar: numPar,
        CodIns: codIns,
        CanIns: Number(mat.cantidad) || 0,
        CosIns: Number(mat.costoUnitario) || 0,
        Desper: Number(mat.desperdicioPorc) || 0,
      });

      obraPainMate.push({
        CodPar: codPar,
        CodIns: codIns,
        CanIns: Number(mat.cantidad) || 0,
        Desper: Number(mat.desperdicioPorc) || 0,
      });
    }

    // Equipment detail: ObraApinEqui & ObraPainEqui
    for (const eq of item.apu.equipos) {
      const normKey = eq.descripcion.trim().toLowerCase();
      const canonical = canonicalEquipments.get(normKey);
      const codIns = canonical ? canonical.code : sanitizeCode(eq.codigo, 'E', 1);

      obraApinEqui.push({
        CodObr: obraCode,
        CodPar: codPar,
        NumPar: numPar,
        CodIns: codIns,
        CanIns: Number(eq.cantidad) || 0,
        CosIns: Number(eq.costo) || 0,
        Deprec: Number(eq.depreciacionOAlquiler) || 1,
      });

      obraPainEqui.push({
        CodPar: codPar,
        CodIns: codIns,
        CanIns: Number(eq.cantidad) || 0,
        Deprec: Number(eq.depreciacionOAlquiler) || 1,
      });
    }

    // Labor detail: ObraApinMano & ObraPainMano
    for (const mo of item.apu.manoDeObra) {
      const normKey = mo.descripcion.trim().toLowerCase();
      const canonical = canonicalLabor.get(normKey);
      const codIns = canonical ? canonical.code : sanitizeCode(mo.codigo, 'MO', 1);

      obraApinMano.push({
        CodObr: obraCode,
        CodPar: codPar,
        NumPar: numPar,
        CodIns: codIns,
        CanIns: Number(mo.cantidad) || 0,
        CosIns: Number(mo.salarioDiario) || 0,
      });

      obraPainMano.push({
        CodPar: codPar,
        CodIns: codIns,
        CanIns: Number(mo.cantidad) || 0,
      });
    }
  });

  return {
    obraCode,
    obraApun,
    obraApinMate,
    obraApinEqui,
    obraApinMano,
    obraPart,
    obraMate,
    obraMano,
    obraEqui,
    obraPainMate,
    obraPainEqui,
    obraPainMano,
  };
}
