/**
 * LuloWin / Maprex Database Structure Types
 * Conforming strictly to the 10/11 tables displayed in Microsoft Access and Excel exports:
 * 1. ObraApun
 * 2. ObraApinMate
 * 3. ObraApinEqui
 * 4. ObraApinMano
 * 5. ObraPart
 * 6. ObraMate
 * 7. ObraMano
 * 8. ObraEqui
 * 9. ObraPainMate
 * 10. ObraPainEqui
 * 11. ObraPainMano
 *
 * Strict Rules:
 * - Codes (CodPar, CodIns, CodMat, CodMan, CodeEqu): Maximum 6 characters.
 * - Insumo descriptions (Descri): Maximum 54 characters.
 * - When an insumo repeats, assign the exact same canonical code.
 */

// 1. ObraApun: Partidas presupuestadas en la obra
export interface ObraApunRow {
  CodObr: string;  // e.g. "ZXV"
  NumPar: number;  // Correlativo 1, 2, 3...
  CodPar: string;  // <= 6 chars, e.g. "ARB012"
  RenPar: number;  // Rendimiento diario
  CanPar: number;  // Cantidad de la partida
  PreUni: number;  // Precio unitario
}

// 2. ObraApinMate: Materiales por partida en la obra
export interface ObraApinMateRow {
  CodObr: string;  // e.g. "ZXV"
  CodPar: string;  // <= 6 chars
  NumPar: number;  // Correlativo
  CodIns: string;  // <= 6 chars
  CanIns: number;  // Cantidad unitaria
  CosIns: number;  // Costo unitario
  Desper: number;  // Desperdicio %
}

// 3. ObraApinEqui: Equipos por partida en la obra
export interface ObraApinEquiRow {
  CodObr: string;  // e.g. "ZXV"
  CodPar: string;  // <= 6 chars
  NumPar: number;  // Correlativo
  CodIns: string;  // <= 6 chars
  CanIns: number;  // Cantidad
  CosIns: number;  // Costo
  Deprec: number;  // Depreciación / Factor
}

// 4. ObraApinMano: Mano de obra por partida en la obra
export interface ObraApinManoRow {
  CodObr: string;  // e.g. "ZXV"
  CodPar: string;  // <= 6 chars
  NumPar: number;  // Correlativo
  CodIns: string;  // <= 6 chars
  CanIns: number;  // Cantidad de personal
  CosIns: number;  // Salario diario
}

// 5. ObraPart: Catálogo general maestro de partidas
export interface ObraPartRow {
  CodPar: string;  // <= 6 chars
  Descri: string;  // Descripción completa
  UniPar: string;  // Unidad de medida
  RenPar: number;  // Rendimiento
  PreUni: number;  // Precio unitario
  CanPar: number;  // Cantidad de referencia (1)
}

// 6. ObraMate: Catálogo general maestro de materiales
export interface ObraMateRow {
  CodMat: string;  // <= 6 chars
  CodFam: string;  // "00"
  Descri: string;  // <= 54 chars
  UniMat: string;  // Unidad
  CosMat: number;  // Costo unitario
  Desper: number;  // Desperdicio %
}

// 7. ObraMano: Catálogo general maestro de mano de obra
export interface ObraManoRow {
  CodMan: string;  // <= 6 chars, e.g. "1-1-1", "11-1-3"
  CodFam: string;  // "01" o "00"
  Descri: string;  // <= 54 chars
  Salari: number;  // Salario diario base
}

// 8. ObraEqui: Catálogo general maestro de equipos
export interface ObraEquiRow {
  CodeEqu: string; // <= 6 chars (Nota: encabezado exacto es CodeEqu)
  CodFam: string;  // "00"
  Descri: string;  // <= 54 chars
  CosEqu: number;  // Costo de adquisición/reposición
  CosDia: number;  // Costo diario
  Deprec: number;  // Factor de depreciación
}

// 9. ObraPainMate: Desglose matriz de materiales por partida
export interface ObraPainMateRow {
  CodPar: string;  // <= 6 chars
  CodIns: string;  // <= 6 chars
  CanIns: number;  // Cantidad
  Desper: number;  // Desperdicio %
}

// 10. ObraPainEqui: Desglose matriz de equipos por partida
export interface ObraPainEquiRow {
  CodPar: string;  // <= 6 chars
  CodIns: string;  // <= 6 chars
  CanIns: number;  // Cantidad
  Deprec: number;  // Depreciación
}

// 11. ObraPainMano: Desglose matriz de mano de obra por partida
export interface ObraPainManoRow {
  CodPar: string;  // <= 6 chars
  CodIns: string;  // <= 6 chars
  CanIns: number;  // Cantidad
}

export interface LulowinDatabase {
  obraCode: string;
  obraApun: ObraApunRow[];
  obraApinMate: ObraApinMateRow[];
  obraApinEqui: ObraApinEquiRow[];
  obraApinMano: ObraApinManoRow[];
  obraPart: ObraPartRow[];
  obraMate: ObraMateRow[];
  obraMano: ObraManoRow[];
  obraEqui: ObraEquiRow[];
  obraPainMate: ObraPainMateRow[];
  obraPainEqui: ObraPainEquiRow[];
  obraPainMano: ObraPainManoRow[];
}
