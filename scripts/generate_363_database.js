// Node.js script to create the comprehensive 363-partida database
import fs from 'fs';
import path from 'path';

// Load labor rates mapping
const TABULADOR = {
  DIRECTOR_OBRA: { codigo: "DIR001", descripcion: "DIRECTOR DE OBRA / ING RESIDENTE", salarioDiario: 12.50 },
  INGENIERO_RESIDENTE: { codigo: "ING001", descripcion: "INGENIERO RESIDENTE DE OBRA", salarioDiario: 10.50 },
  INGENIERO_SEGURIDAD: { codigo: "ING002", descripcion: "INGENIERO / INSPECTOR SIHO-PDVSA", salarioDiario: 9.80 },
  MAESTRO_OBRA: { codigo: "MAE001", descripcion: "MAESTRO DE OBRA GENERAL", salarioDiario: 7.20 },
  TOPOGRAFO: { codigo: "TOP001", descripcion: "TOPÓGRAFO DE 1RA CON INSTRUMENTO", salarioDiario: 6.80 },
  NIVELADOR: { codigo: "NIV001", descripcion: "NIVELADOR DE TOPOGRAFÍA", salarioDiario: 4.90 },
  CAPORAL: { codigo: "CAP001", descripcion: "CAPORAL DE CUADRILLA", salarioDiario: 5.60 },
  OPERADOR_MAQ_PESADA: { codigo: "OPM001", descripcion: "OPERADOR DE MAQUINARIA PESADA", salarioDiario: 6.50 },
  OPERADOR_MAQ_LIVIANA: { codigo: "OPM002", descripcion: "OPERADOR DE MAQUINARIA LIVIANA", salarioDiario: 5.20 },
  CHOFER_VOLTEO: { codigo: "CHO001", descripcion: "CHOFER DE CAMIÓN VOLTEO / VACUUM", salarioDiario: 5.40 },
  ELECTRICISTA_1RA: { codigo: "ELE001", descripcion: "ELECTRICISTA DE 1RA / LINIERO", salarioDiario: 6.00 },
  ELECTRICISTA_2DA: { codigo: "ELE002", descripcion: "ELECTRICISTA DE 2DA", salarioDiario: 4.80 },
  SOLDADOR_1RA: { codigo: "SOL001", descripcion: "SOLDADOR DE 1RA 6G / TUBERO", salarioDiario: 6.80 },
  PLOMERO_1RA: { codigo: "PLO001", descripcion: "PLOMERO / TUBERO SANITARIO DE 1RA", salarioDiario: 5.80 },
  ALBANIL_1RA: { codigo: "ALB001", descripcion: "ALBAÑIL DE 1RA", salarioDiario: 5.40 },
  CARPINTERO_1RA: { codigo: "CAR001", descripcion: "CARPINTERO DE 1RA / ENCOFRADOR", salarioDiario: 5.40 },
  PINTOR_ESPECIALISTA: { codigo: "PIN001", descripcion: "PINTOR INDUSTRIAL / ARENADOR", salarioDiario: 5.60 },
  MECANICO_MONTAJISTA: { codigo: "MEC001", descripcion: "MECÁNICO MONTAJISTA / BOMBAS", salarioDiario: 6.20 },
  TECNICO_FUMIGADOR: { codigo: "FUM001", descripcion: "TÉCNICO APLICADOR FITOSANITARIO", salarioDiario: 5.00 },
  AYUDANTE: { codigo: "AYU001", descripcion: "AYUDANTE CALIFICADO", salarioDiario: 3.80 },
  OBRERO: { codigo: "OBR001", descripcion: "OBRERO DE 1RA", salarioDiario: 3.20 },
};

console.log("Labor rates loaded successfully.");
