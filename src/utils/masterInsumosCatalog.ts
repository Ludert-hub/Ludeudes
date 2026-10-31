import { PartidaItem } from '../types/costTypes';
import { abbreviateInsumoDesc, sanitizeCode } from './lulowinNormalizer';

export interface MasterMaterialEntry {
  key: string;
  codigo: string;
  descripcion: string;
  descripcionCorta: string;
  unidad: string;
  costoUnitario: number;
  minCostoUnitario: number;
  maxCostoUnitario: number;
  hasPriceVariance: boolean;
  desperdicioPorc: number;
  partidasCount: number;
  partidaIds: number[];
  cantidadTotalObra: number;
  montoTotalObra: number;
}

export interface MasterEquipmentEntry {
  key: string;
  codigo: string;
  descripcion: string;
  descripcionCorta: string;
  costo: number;
  minCosto: number;
  maxCosto: number;
  hasPriceVariance: boolean;
  depreciacionOAlquiler: number;
  costoDiario: number;
  partidasCount: number;
  partidaIds: number[];
  montoTotalObra: number;
}

export interface MasterLaborEntry {
  key: string;
  codigo: string;
  descripcion: string;
  descripcionCorta: string;
  salarioDiario: number;
  minSalarioDiario: number;
  maxSalarioDiario: number;
  hasPriceVariance: boolean;
  partidasCount: number;
  partidaIds: number[];
  jornalesTotalesObra: number;
  montoTotalDirectoObra: number;
  montoTotalConFcasObra: number;
}

export interface MasterInsumosCatalog {
  materiales: MasterMaterialEntry[];
  equipos: MasterEquipmentEntry[];
  manoDeObra: MasterLaborEntry[];
  totalMaterialesUnicos: number;
  totalEquiposUnicos: number;
  totalManoObraUnica: number;
}

/**
 * Normalizes an insumo description so identical items across all 363 partidas
 * bind to the exact same canonical master key.
 */
export function normalizeInsumoKey(descripcion: string): string {
  return (descripcion || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Builds the centralized Master Catalog of Insumos (Materiales, Equipos, Mano de Obra)
 * from the active project's partidas, calculating incidence and total monetary impact.
 */
export function buildMasterInsumosCatalog(
  items: PartidaItem[],
  fcasPorc: number = 500
): MasterInsumosCatalog {
  const matMap = new Map<
    string,
    {
      codigo: string;
      descripcion: string;
      unidad: string;
      costoUnitario: number;
      minCosto: number;
      maxCosto: number;
      desperdicioPorc: number;
      partidaIdsSet: Set<number>;
      cantidadTotalObra: number;
      montoTotalObra: number;
    }
  >();

  const eqMap = new Map<
    string,
    {
      codigo: string;
      descripcion: string;
      costo: number;
      minCosto: number;
      maxCosto: number;
      depreciacionOAlquiler: number;
      partidaIdsSet: Set<number>;
      montoTotalObra: number;
    }
  >();

  const moMap = new Map<
    string,
    {
      codigo: string;
      descripcion: string;
      salarioDiario: number;
      minSalario: number;
      maxSalario: number;
      partidaIdsSet: Set<number>;
      jornalesTotalesObra: number;
      montoTotalDirectoObra: number;
    }
  >();

  let matCounter = 1;
  let eqCounter = 1;
  let moCounter = 1;

  const usedMatCodes = new Set<string>();
  const usedEqCodes = new Set<string>();
  const usedMoCodes = new Set<string>();

  for (const item of items) {
    const itemCant = Number(item.cantidad) || 0;
    const rend = Number(item.apu?.rendimiento) > 0 ? Number(item.apu.rendimiento) : 1;

    // 1. Materiales
    for (const mat of item.apu?.materiales || []) {
      const key = normalizeInsumoKey(mat.descripcion);
      if (!key) continue;

      const unitCost = Number(mat.costoUnitario) || 0;
      const waste = Number(mat.desperdicioPorc) || 0;
      const matCant = Number(mat.cantidad) || 0;
      const wasteFactor = 1 + waste / 100;
      const cantEnObra = matCant * wasteFactor * itemCant;
      const montoEnObra = matCant * unitCost * wasteFactor * itemCant;

      const existing = matMap.get(key);
      if (!existing) {
        let code = sanitizeCode(mat.codigo, 'M', matCounter);
        if (usedMatCodes.has(code)) {
          code = `M${String(matCounter).padStart(5, '0')}`.substring(0, 6);
        }
        usedMatCodes.add(code);
        matCounter++;

        matMap.set(key, {
          codigo: code,
          descripcion: mat.descripcion.trim().replace(/\s+/g, ' '),
          unidad: (mat.unidad || 'UND').trim().toUpperCase(),
          costoUnitario: unitCost,
          minCosto: unitCost,
          maxCosto: unitCost,
          desperdicioPorc: waste,
          partidaIdsSet: new Set([item.id]),
          cantidadTotalObra: cantEnObra,
          montoTotalObra: montoEnObra,
        });
      } else {
        existing.partidaIdsSet.add(item.id);
        existing.cantidadTotalObra += cantEnObra;
        existing.montoTotalObra += montoEnObra;
        existing.minCosto = Math.min(existing.minCosto, unitCost);
        existing.maxCosto = Math.max(existing.maxCosto, unitCost);
      }
    }

    // 2. Equipos
    for (const eq of item.apu?.equipos || []) {
      const key = normalizeInsumoKey(eq.descripcion);
      if (!key) continue;

      const eqCost = Number(eq.costo) || 0;
      const deprec = Number(eq.depreciacionOAlquiler) || 1;
      const eqCant = Number(eq.cantidad) || 0;
      const montoEnObra = ((eqCant * eqCost * deprec) / rend) * itemCant;

      const existing = eqMap.get(key);
      if (!existing) {
        let code = sanitizeCode(eq.codigo, 'E', eqCounter);
        if (usedEqCodes.has(code)) {
          code = `E${String(eqCounter).padStart(5, '0')}`.substring(0, 6);
        }
        usedEqCodes.add(code);
        eqCounter++;

        eqMap.set(key, {
          codigo: code,
          descripcion: eq.descripcion.trim().replace(/\s+/g, ' '),
          costo: eqCost,
          minCosto: eqCost,
          maxCosto: eqCost,
          depreciacionOAlquiler: deprec,
          partidaIdsSet: new Set([item.id]),
          montoTotalObra: montoEnObra,
        });
      } else {
        existing.partidaIdsSet.add(item.id);
        existing.montoTotalObra += montoEnObra;
        existing.minCosto = Math.min(existing.minCosto, eqCost);
        existing.maxCosto = Math.max(existing.maxCosto, eqCost);
      }
    }

    // 3. Mano de Obra
    for (const mo of item.apu?.manoDeObra || []) {
      const key = normalizeInsumoKey(mo.descripcion);
      if (!key) continue;

      const wage = Number(mo.salarioDiario) || 0;
      const moCant = Number(mo.cantidad) || 0;
      const jornalesObra = (moCant / rend) * itemCant;
      const montoDirectoObra = ((moCant * wage) / rend) * itemCant;

      const existing = moMap.get(key);
      if (!existing) {
        let code = sanitizeCode(mo.codigo, 'MO', moCounter);
        if (usedMoCodes.has(code)) {
          code = `MO${String(moCounter).padStart(4, '0')}`.substring(0, 6);
        }
        usedMoCodes.add(code);
        moCounter++;

        moMap.set(key, {
          codigo: code,
          descripcion: mo.descripcion.trim().replace(/\s+/g, ' '),
          salarioDiario: wage,
          minSalario: wage,
          maxSalario: wage,
          partidaIdsSet: new Set([item.id]),
          jornalesTotalesObra: jornalesObra,
          montoTotalDirectoObra: montoDirectoObra,
        });
      } else {
        existing.partidaIdsSet.add(item.id);
        existing.jornalesTotalesObra += jornalesObra;
        existing.montoTotalDirectoObra += montoDirectoObra;
        existing.minSalario = Math.min(existing.minSalario, wage);
        existing.maxSalario = Math.max(existing.maxSalario, wage);
      }
    }
  }

  const fcasMultiplier = 1 + fcasPorc / 100;

  const materiales: MasterMaterialEntry[] = Array.from(matMap.entries()).map(([key, m]) => {
    const partidaIds = Array.from(m.partidaIdsSet).sort((a, b) => a - b);
    return {
      key,
      codigo: m.codigo,
      descripcion: m.descripcion,
      descripcionCorta: abbreviateInsumoDesc(m.descripcion),
      unidad: m.unidad,
      costoUnitario: m.costoUnitario,
      minCostoUnitario: m.minCosto,
      maxCostoUnitario: m.maxCosto,
      hasPriceVariance: Math.abs(m.maxCosto - m.minCosto) > 0.001,
      desperdicioPorc: m.desperdicioPorc,
      partidasCount: partidaIds.length,
      partidaIds,
      cantidadTotalObra: m.cantidadTotalObra,
      montoTotalObra: m.montoTotalObra,
    };
  });

  const equipos: MasterEquipmentEntry[] = Array.from(eqMap.entries()).map(([key, e]) => {
    const partidaIds = Array.from(e.partidaIdsSet).sort((a, b) => a - b);
    return {
      key,
      codigo: e.codigo,
      descripcion: e.descripcion,
      descripcionCorta: abbreviateInsumoDesc(e.descripcion),
      costo: e.costo,
      minCosto: e.minCosto,
      maxCosto: e.maxCosto,
      hasPriceVariance: Math.abs(e.maxCosto - e.minCosto) > 0.001,
      depreciacionOAlquiler: e.depreciacionOAlquiler,
      costoDiario: +(e.costo * e.depreciacionOAlquiler).toFixed(4),
      partidasCount: partidaIds.length,
      partidaIds,
      montoTotalObra: e.montoTotalObra,
    };
  });

  const manoDeObra: MasterLaborEntry[] = Array.from(moMap.entries()).map(([key, l]) => {
    const partidaIds = Array.from(l.partidaIdsSet).sort((a, b) => a - b);
    return {
      key,
      codigo: l.codigo,
      descripcion: l.descripcion,
      descripcionCorta: abbreviateInsumoDesc(l.descripcion),
      salarioDiario: l.salarioDiario,
      minSalarioDiario: l.minSalario,
      maxSalarioDiario: l.maxSalario,
      hasPriceVariance: Math.abs(l.maxSalario - l.minSalario) > 0.001,
      partidasCount: partidaIds.length,
      partidaIds,
      jornalesTotalesObra: l.jornalesTotalesObra,
      montoTotalDirectoObra: l.montoTotalDirectoObra,
      montoTotalConFcasObra: l.montoTotalDirectoObra * fcasMultiplier,
    };
  });

  return {
    materiales,
    equipos,
    manoDeObra,
    totalMaterialesUnicos: materiales.length,
    totalEquiposUnicos: equipos.length,
    totalManoObraUnica: manoDeObra.length,
  };
}

/**
 * Propagates a Material price, waste %, unit, or description change across ALL partidas
 * where that material appears.
 */
export function propagateMaterialChangeGlobal(
  items: PartidaItem[],
  targetDescOrKey: string,
  changes: {
    costoUnitario?: number;
    desperdicioPorc?: number;
    unidad?: string;
    descripcion?: string;
  }
): { updatedItems: PartidaItem[]; affectedPartidaIds: number[] } {
  const targetKey = normalizeInsumoKey(targetDescOrKey);
  const affectedPartidaIds: number[] = [];

  const updatedItems = items.map((item) => {
    let itemModified = false;
    const newMateriales = item.apu.materiales.map((mat) => {
      const fullKey = normalizeInsumoKey(mat.descripcion);
      const shortKey = normalizeInsumoKey(abbreviateInsumoDesc(mat.descripcion));
      if (fullKey === targetKey || shortKey === targetKey) {
        itemModified = true;
        const nextCosto =
          changes.costoUnitario !== undefined
            ? Math.max(0, Number(changes.costoUnitario))
            : mat.costoUnitario;
        const nextDesp =
          changes.desperdicioPorc !== undefined
            ? Math.max(0, Number(changes.desperdicioPorc))
            : mat.desperdicioPorc;
        const nextUnidad =
          changes.unidad !== undefined ? changes.unidad.trim().toUpperCase() : mat.unidad;
        const nextDesc =
          changes.descripcion !== undefined ? changes.descripcion.trim() : mat.descripcion;

        const wasteFactor = 1 + (nextDesp || 0) / 100;
        const nextTotal = +(mat.cantidad * nextCosto * wasteFactor).toFixed(4);

        return {
          ...mat,
          descripcion: nextDesc,
          unidad: nextUnidad,
          costoUnitario: nextCosto,
          desperdicioPorc: nextDesp,
          total: nextTotal,
        };
      }
      return mat;
    });

    if (itemModified) {
      affectedPartidaIds.push(item.id);
      return {
        ...item,
        apu: {
          ...item.apu,
          materiales: newMateriales,
        },
      };
    }
    return item;
  });

  return { updatedItems, affectedPartidaIds };
}

/**
 * Propagates an Equipment cost, depreciation/rental factor, or daily cost change across ALL partidas
 * where that equipment appears.
 */
export function propagateEquipmentChangeGlobal(
  items: PartidaItem[],
  targetDescOrKey: string,
  changes: {
    costo?: number;
    depreciacionOAlquiler?: number;
    costoDiario?: number;
    descripcion?: string;
  }
): { updatedItems: PartidaItem[]; affectedPartidaIds: number[] } {
  const targetKey = normalizeInsumoKey(targetDescOrKey);
  const affectedPartidaIds: number[] = [];

  const updatedItems = items.map((item) => {
    let itemModified = false;
    const newEquipos = item.apu.equipos.map((eq) => {
      const fullKey = normalizeInsumoKey(eq.descripcion);
      const shortKey = normalizeInsumoKey(abbreviateInsumoDesc(eq.descripcion));
      if (fullKey === targetKey || shortKey === targetKey) {
        itemModified = true;
        let nextCosto =
          changes.costo !== undefined ? Math.max(0, Number(changes.costo)) : eq.costo;
        let nextDeprec =
          changes.depreciacionOAlquiler !== undefined
            ? Math.max(0.000001, Number(changes.depreciacionOAlquiler))
            : eq.depreciacionOAlquiler || 1;

        if (changes.costoDiario !== undefined) {
          const targetDaily = Math.max(0, Number(changes.costoDiario));
          nextCosto = nextDeprec > 0 ? +(targetDaily / nextDeprec).toFixed(4) : targetDaily;
        }

        const nextDesc =
          changes.descripcion !== undefined ? changes.descripcion.trim() : eq.descripcion;
        const nextTotal = +(eq.cantidad * nextCosto * nextDeprec).toFixed(4);

        return {
          ...eq,
          descripcion: nextDesc,
          costo: nextCosto,
          depreciacionOAlquiler: nextDeprec,
          total: nextTotal,
        };
      }
      return eq;
    });

    if (itemModified) {
      affectedPartidaIds.push(item.id);
      return {
        ...item,
        apu: {
          ...item.apu,
          equipos: newEquipos,
        },
      };
    }
    return item;
  });

  return { updatedItems, affectedPartidaIds };
}

/**
 * Propagates a Mano de Obra daily wage (salarioDiario) or description change across ALL partidas
 * where that labor category appears.
 */
export function propagateLaborChangeGlobal(
  items: PartidaItem[],
  targetDescOrKey: string,
  changes: {
    salarioDiario?: number;
    descripcion?: string;
  }
): { updatedItems: PartidaItem[]; affectedPartidaIds: number[] } {
  const targetKey = normalizeInsumoKey(targetDescOrKey);
  const affectedPartidaIds: number[] = [];

  const updatedItems = items.map((item) => {
    let itemModified = false;
    const newManoDeObra = item.apu.manoDeObra.map((mo) => {
      const fullKey = normalizeInsumoKey(mo.descripcion);
      const shortKey = normalizeInsumoKey(abbreviateInsumoDesc(mo.descripcion));
      if (fullKey === targetKey || shortKey === targetKey) {
        itemModified = true;
        const nextSalario =
          changes.salarioDiario !== undefined
            ? Math.max(0, Number(changes.salarioDiario))
            : mo.salarioDiario;
        const nextDesc =
          changes.descripcion !== undefined ? changes.descripcion.trim() : mo.descripcion;
        const nextTotal = +(mo.cantidad * nextSalario).toFixed(4);

        return {
          ...mo,
          descripcion: nextDesc,
          salarioDiario: nextSalario,
          total: nextTotal,
        };
      }
      return mo;
    });

    if (itemModified) {
      affectedPartidaIds.push(item.id);
      return {
        ...item,
        apu: {
          ...item.apu,
          manoDeObra: newManoDeObra,
        },
      };
    }
    return item;
  });

  return { updatedItems, affectedPartidaIds };
}

/**
 * Unifies all insumos across all partidas so that any insumo with the same description
 * has the exact same canonical unit price / wage across the entire budget.
 */
export function unifyAllCatalogPrices(items: PartidaItem[]): {
  updatedItems: PartidaItem[];
  unifiedCount: number;
} {
  const catalog = buildMasterInsumosCatalog(items);
  const matPriceMap = new Map(catalog.materiales.map((m) => [m.key, m.costoUnitario]));
  const eqPriceMap = new Map(
    catalog.equipos.map((e) => [e.key, { costo: e.costo, deprec: e.depreciacionOAlquiler }])
  );
  const moWageMap = new Map(catalog.manoDeObra.map((l) => [l.key, l.salarioDiario]));

  let unifiedCount = 0;

  const updatedItems = items.map((item) => {
    const newMateriales = item.apu.materiales.map((mat) => {
      const key = normalizeInsumoKey(mat.descripcion);
      const canonicalCost = matPriceMap.get(key);
      if (canonicalCost !== undefined && Math.abs(mat.costoUnitario - canonicalCost) > 0.0001) {
        unifiedCount++;
        const wasteFactor = 1 + (mat.desperdicioPorc || 0) / 100;
        return {
          ...mat,
          costoUnitario: canonicalCost,
          total: +(mat.cantidad * canonicalCost * wasteFactor).toFixed(4),
        };
      }
      return mat;
    });

    const newEquipos = item.apu.equipos.map((eq) => {
      const key = normalizeInsumoKey(eq.descripcion);
      const canonicalEq = eqPriceMap.get(key);
      if (
        canonicalEq !== undefined &&
        (Math.abs(eq.costo - canonicalEq.costo) > 0.0001 ||
          Math.abs(eq.depreciacionOAlquiler - canonicalEq.deprec) > 0.00001)
      ) {
        unifiedCount++;
        return {
          ...eq,
          costo: canonicalEq.costo,
          depreciacionOAlquiler: canonicalEq.deprec,
          total: +(eq.cantidad * canonicalEq.costo * canonicalEq.deprec).toFixed(4),
        };
      }
      return eq;
    });

    const newManoDeObra = item.apu.manoDeObra.map((mo) => {
      const key = normalizeInsumoKey(mo.descripcion);
      const canonicalWage = moWageMap.get(key);
      if (canonicalWage !== undefined && Math.abs(mo.salarioDiario - canonicalWage) > 0.0001) {
        unifiedCount++;
        return {
          ...mo,
          salarioDiario: canonicalWage,
          total: +(mo.cantidad * canonicalWage).toFixed(4),
        };
      }
      return mo;
    });

    return {
      ...item,
      apu: {
        ...item.apu,
        materiales: newMateriales,
        equipos: newEquipos,
        manoDeObra: newManoDeObra,
      },
    };
  });

  return { updatedItems, unifiedCount };
}
