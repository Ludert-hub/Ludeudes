/**
 * Tabulador salarial directo de mano de obra (en USD/día)
 * Basado en la Convención Colectiva Petrolera (CCP) y calibrado fielmente
 * según los valores reales del documento 'APU EJEMPLO' (Inversiones JR / PDVSA).
 * 
 * Regla legal: A estos salarios directos se les aplica estrictamente
 * el FCAS (Factor de Costos Asociados al Salario) del 1,200% según LOTTT.
 */
export const TABULADOR_PETROLERO = {
  CAPORAL: { codigo: "11-1-3", descripcion: "CAPORAL", salarioDiario: 6.00 },
  ALBANIL_A: { codigo: "19-2-2", descripcion: "ALBAÑIL A", salarioDiario: 4.70 },
  OBRERO: { codigo: "1-1-1", descripcion: "OBRERO", salarioDiario: 3.50 },
  AYUDANTE: { codigo: "1-1-2", descripcion: "AYUDANTE", salarioDiario: 3.60 },
  PINTOR_A: { codigo: "19-221", descripcion: "PINTOR A", salarioDiario: 4.66 },
  PINTOR_B: { codigo: "11-220", descripcion: "PINTOR B", salarioDiario: 3.94 },
  CARPINTERO_A: { codigo: "14-2-1", descripcion: "CARPINTERO A", salarioDiario: 4.70 },
  ELECTRICISTA_A: { codigo: "17-2-1", descripcion: "ELECTRICISTA A", salarioDiario: 4.80 },
  INSTALADOR_ELECTROMECANICO_A: { codigo: "17-3-2", descripcion: "INSTALADOR ELECTROMECANICO A", salarioDiario: 4.80 },
  PLOMERO_A: { codigo: "18-2-1", descripcion: "PLOMERO A", salarioDiario: 4.70 },
  MAESTRO_ELECTROMECANICO: { codigo: "11-3-1", descripcion: "MAESTRO DE OBRAS ELECTROMECANICAS", salarioDiario: 6.50 },
  OPERADOR_A: { codigo: "15-2-1", descripcion: "OPERADOR A", salarioDiario: 5.20 },
  CHOFER_A: { codigo: "16-2-1", descripcion: "CHOFER A", salarioDiario: 4.50 },
  MAQUINISTA_CONCRETO_A: { codigo: "15-3-2", descripcion: "MAQUINISTA DE CONCRETO A", salarioDiario: 4.80 },
  MONTADOR_A: { codigo: "14-3-1", descripcion: "MONTADOR A", salarioDiario: 4.70 },
  JARDINERO: { codigo: "12-2-1", descripcion: "JARDINERO", salarioDiario: 3.80 },
  COMPUTISTA: { codigo: "21-1-1", descripcion: "COMPUTISTA", salarioDiario: 5.50 },
  DIBUJANTE: { codigo: "21-1-2", descripcion: "DIBUJANTE", salarioDiario: 5.50 },
  ARQUITECTO: { codigo: "22-1-1", descripcion: "ARQUITECTO / ING. RESIDENTE", salarioDiario: 8.50 },
  SOLDADOR_A: { codigo: "13-2-1", descripcion: "SOLDADOR A", salarioDiario: 5.20 },
  OPERADOR_GRUA: { codigo: "15-1-1", descripcion: "OPERADOR DE GRUA 60T", salarioDiario: 7.00 },
  TOPOGRAFO: { codigo: "20-1-1", descripcion: "TOPOGRAFO", salarioDiario: 6.50 },
};
