import fs from 'fs';
import path from 'path';

// Load raw items
const f1 = JSON.parse(fs.readFileSync('./scripts/raw_items_1_100.json', 'utf8'));
const f2 = JSON.parse(fs.readFileSync('./scripts/raw_items_101_200.json', 'utf8'));
const f3 = JSON.parse(fs.readFileSync('./scripts/raw_items_201_300.json', 'utf8'));
const f4 = JSON.parse(fs.readFileSync('./scripts/raw_items_301_363.json', 'utf8'));
const allRaw = [...f1, ...f2, ...f3, ...f4];

console.log(`Loaded ${allRaw.length} raw items.`);

// Function to truncate description to 54 chars max
function shortDesc(desc) {
  if (!desc) return '';
  const d = desc.trim().replace(/\s+/g, ' ');
  return d.length > 54 ? d.slice(0, 51) + '...' : d;
}

// Function to format code to 6 chars max
function shortCode(code) {
  if (!code) return 'M-01';
  return code.slice(0, 6);
}

// Labor rates
const LAB = {
  CAPORAL: { codigo: "11-1-3", descripcion: "CAPORAL", salarioDiario: 6.00 },
  ALBANIL: { codigo: "19-2-2", descripcion: "ALBAÑIL A", salarioDiario: 4.70 },
  OBRERO: { codigo: "1-1-1", descripcion: "OBRERO", salarioDiario: 3.50 },
  AYUDANTE: { codigo: "1-1-2", descripcion: "AYUDANTE", salarioDiario: 3.60 },
  PINTOR_A: { codigo: "19-221", descripcion: "PINTOR A", salarioDiario: 4.66 },
  PINTOR_B: { codigo: "11-220", descripcion: "PINTOR B", salarioDiario: 3.94 },
  CARPINTERO: { codigo: "14-2-1", descripcion: "CARPINTERO A", salarioDiario: 4.70 },
  ELECTRICISTA: { codigo: "17-2-1", descripcion: "ELECTRICISTA A", salarioDiario: 4.80 },
  ELECTROMEC: { codigo: "17-3-2", descripcion: "INSTALADOR ELECTROMECANICO A", salarioDiario: 4.80 },
  PLOMERO: { codigo: "18-2-1", descripcion: "PLOMERO A", salarioDiario: 4.70 },
  MAESTRO: { codigo: "11-3-1", descripcion: "MAESTRO DE OBRAS ELECTROMECANICAS", salarioDiario: 6.50 },
  OPERADOR: { codigo: "15-2-1", descripcion: "OPERADOR A", salarioDiario: 5.20 },
  CHOFER: { codigo: "16-2-1", descripcion: "CHOFER A", salarioDiario: 4.50 },
  MAQUINISTA: { codigo: "15-3-2", descripcion: "MAQUINISTA DE CONCRETO A", salarioDiario: 4.80 },
  MONTADOR: { codigo: "14-3-1", descripcion: "MONTADOR A", salarioDiario: 4.70 },
  JARDINERO: { codigo: "12-2-1", descripcion: "JARDINERO", salarioDiario: 3.80 },
  COMPUTISTA: { codigo: "21-1-1", descripcion: "COMPUTISTA", salarioDiario: 5.50 },
  DIBUJANTE: { codigo: "21-1-2", descripcion: "DIBUJANTE", salarioDiario: 5.50 },
  ARQUITECTO: { codigo: "22-1-1", descripcion: "ARQUITECTO / ING. RESIDENTE", salarioDiario: 8.50 },
  SOLDADOR: { codigo: "13-2-1", descripcion: "SOLDADOR A", salarioDiario: 5.20 },
  OPERADOR_GRUA: { codigo: "15-1-1", descripcion: "OPERADOR DE GRUA 60T", salarioDiario: 7.00 },
  TOPOGRAFO: { codigo: "20-1-1", descripcion: "TOPOGRAFO", salarioDiario: 6.50 },
};

function generateItem(raw) {
  const id = raw.id;
  const codigoCovenin = String(id).padStart(3, '0');
  const desc = raw.desc;
  const und = raw.und.trim();
  const cant = raw.cant;
  const cap = raw.cap;

  // Derive APU based on nature of partida
  let apu = deriveApu(id, desc, und, cap);
  let especificacion = deriveSpec(id, desc, und, cap);

  return {
    id,
    capitulo: cap,
    codigoCovenin,
    descripcion: desc,
    unidad: und,
    cantidad: cant,
    apu,
    especificacion
  };
}

function deriveApu(id, desc, und, cap) {
  const dUpper = desc.toUpperCase();

  // 1. Demoliciones
  if (dUpper.includes('DEMOLICIÓN') || dUpper.includes('REMOCIÓN')) {
    const rend = und === 'M2' ? 25.0 : und === 'ML' ? 35.0 : und === 'M3' ? 8.0 : 15.0;
    return {
      rendimiento: rend,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-DISC", descripcion: shortDesc("DISCOS DE CORTE Y ACCESORIOS DE DESBASTE"), unidad: "PZA", cantidad: 0.15, desperdicioPorc: 2, costoUnitario: 8.50, total: 1.30 },
        { codigo: "M-CONS", descripcion: shortDesc("MATERIALES MENORES Y CONSUMIBLES DE SEGURIDAD"), unidad: "GLB", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 2.20, total: 2.20 },
      ],
      equipos: [
        { codigo: "EQ-ROT", descripcion: shortDesc("ROTOMARTILLO / DEMOLEDOR ELÉCTRICO 15 KG"), cantidad: 1, costo: 12.00, depreciacionOAlquiler: 1.0, total: 12.00 },
        { codigo: "EQ-HM", descripcion: shortDesc("HERRAMIENTAS MENORES (PICOS, PALAS, CARRETILLAS)"), cantidad: 1, costo: 4.50, depreciacionOAlquiler: 1.0, total: 4.50 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.20, total: +(0.20 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.ALBANIL, cantidad: 1.00, total: +(1.00 * LAB.ALBANIL.salarioDiario).toFixed(2) },
        { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
        { ...LAB.OBRERO, cantidad: 2.00, total: +(2.00 * LAB.OBRERO.salarioDiario).toFixed(2) },
      ]
    };
  }

  // 2. Carga y Transporte / Movimiento de Tierra
  if (dUpper.includes('CARGA') || dUpper.includes('TRANSPORTE') || dUpper.includes('EXCAVACIÓN') || dUpper.includes('COMPACTACIÓN') || dUpper.includes('BOTE')) {
    const rend = und === 'M3' ? 45.0 : und === 'M' ? 30.0 : und === 'VIAJE' ? 8.0 : 25.0;
    return {
      rendimiento: rend,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-LUB", descripcion: shortDesc("GRASA, COMBUSTIBLE Y LUBRICANTES OPERATIVOS"), unidad: "GLB", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 4.50, total: 4.50 },
      ],
      equipos: [
        { codigo: "EQ-CAM", descripcion: shortDesc("CAMIÓN VOLTEO 12 M3 O RETROEXCAVADOR CAT"), cantidad: 1, costo: 95.00, depreciacionOAlquiler: 1.0, total: 95.00 },
        { codigo: "EQ-HM", descripcion: shortDesc("HERRAMIENTAS MENORES DE CUADRILLA"), cantidad: 1, costo: 5.00, depreciacionOAlquiler: 1.0, total: 5.00 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.25, total: +(0.25 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.CHOFER, cantidad: 1.00, total: +(1.00 * LAB.CHOFER.salarioDiario).toFixed(2) },
        { ...LAB.OPERADOR, cantidad: 1.00, total: +(1.00 * LAB.OPERADOR.salarioDiario).toFixed(2) },
        { ...LAB.OBRERO, cantidad: 2.00, total: +(2.00 * LAB.OBRERO.salarioDiario).toFixed(2) },
      ]
    };
  }

  // 3. Electricidad, Cableado, Tableros, Luminarias
  if (cap.includes('Eléctricas') || dUpper.includes('CONDUCTOR') || dUpper.includes('TUBERÍA PVC') || dUpper.includes('BREAKER') || dUpper.includes('TABLERO') || dUpper.includes('LÁMPARA') || dUpper.includes('CABLE')) {
    const isSuministro = dUpper.startsWith('SUMINISTRO') && !dUpper.includes('INSTALACIÓN');
    const rend = und === 'MTS' || und === 'ML' || und === 'M' ? 75.0 : und === 'UND' || und === 'PZA' ? 8.0 : 12.0;
    return {
      rendimiento: rend,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-ELEC", descripcion: shortDesc(`INSUMO ELÉCTRICO CERTIFICADO PARA ${desc.slice(0, 30)}`), unidad: und === 'MTS' || und === 'M' ? 'M' : 'UND', cantidad: 1.05, desperdicioPorc: 3, costoUnitario: und === 'MTS' ? 2.80 : 38.00, total: +(1.08 * (und === 'MTS' ? 2.80 : 38.00)).toFixed(2) },
        { codigo: "M-CONE", descripcion: shortDesc("CONECTORES, TORNILLERÍA Y TAPE VULCANIZANTE"), unidad: "JGO", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 4.20, total: 4.20 },
      ],
      equipos: [
        { codigo: "EQ-ELE", descripcion: shortDesc("EQUIPO DE MEDICIÓN MEGGER Y HERRAMIENTAS ELECTRICAS"), cantidad: 1, costo: 8.50, depreciacionOAlquiler: 1.0, total: 8.50 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.20, total: +(0.20 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.ELECTRICISTA, cantidad: 1.00, total: +(1.00 * LAB.ELECTRICISTA.salarioDiario).toFixed(2) },
        { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
      ]
    };
  }

  // 4. Concreto, Morteros, Encofrados, Bloques, Caminerías
  if (dUpper.includes('CONCRETO') || dUpper.includes('ENCOFRADO') || dUpper.includes('ACERO') || dUpper.includes('CAMINERÍAS') || dUpper.includes('PARED') || dUpper.includes('SOBRE PISO') || dUpper.includes('PORCELANATO')) {
    const rend = und === 'M3' ? 4.5 : und === 'M2' ? 18.0 : und === 'KGF' ? 180.0 : 12.0;
    return {
      rendimiento: rend,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-MAT1", descripcion: shortDesc(`MATERIAL PRINCIPAL CONFORME A NORMA (${desc.slice(0, 25)})`), unidad: und, cantidad: 1.05, desperdicioPorc: 4, costoUnitario: und === 'M3' ? 88.00 : und === 'KGF' ? 1.45 : 14.50, total: +(1.09 * (und === 'M3' ? 88.00 : und === 'KGF' ? 1.45 : 14.50)).toFixed(2) },
        { codigo: "M-AGUA", descripcion: shortDesc("AGUA, CLAVOS, ALAMBRE Y CONSUMIBLES"), unidad: "GLB", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 3.80, total: 3.80 },
      ],
      equipos: [
        { codigo: "EQ-CONC", descripcion: shortDesc("MEZCLADORA DE CONCRETO 1 SACO / VIBRADOR DE AGUJA"), cantidad: 1, costo: 18.00, depreciacionOAlquiler: 1.0, total: 18.00 },
        { codigo: "EQ-HM", descripcion: shortDesc("HERRAMIENTAS MENORES DE ALBAÑILERÍA"), cantidad: 1, costo: 4.00, depreciacionOAlquiler: 1.0, total: 4.00 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.25, total: +(0.25 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.ALBANIL, cantidad: 1.00, total: +(1.00 * LAB.ALBANIL.salarioDiario).toFixed(2) },
        { ...LAB.MAQUINISTA, cantidad: 0.50, total: +(0.50 * LAB.MAQUINISTA.salarioDiario).toFixed(2) },
        { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
        { ...LAB.OBRERO, cantidad: 2.00, total: +(2.00 * LAB.OBRERO.salarioDiario).toFixed(2) },
      ]
    };
  }

  // 5. Pintura, Sandblasting, Recubrimientos Industriales y Tanques (348 a 363)
  if (cap.includes('Tanques') || dUpper.includes('PINTURA') || dUpper.includes('SANDBLASTING') || dUpper.includes('RECUBRIMIENTO') || dUpper.includes('LAVADO INTERNO') || dUpper.includes('DESGASIFICACIÓN') || dUpper.includes('EPOXICO')) {
    const rend = und === 'M2' ? 35.0 : und === 'UND' ? 1.0 : und === 'M3' ? 6.0 : 20.0;
    return {
      rendimiento: rend,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-REC1", descripcion: shortDesc(`PRODUCTO QUÍMICO / PINTURA / ABRASIVO INDUSTRIAL`), unidad: und === 'M2' ? 'GLN' : 'JGO', cantidad: und === 'M2' ? 0.08 : 1.0, desperdicioPorc: 5, costoUnitario: 42.00, total: +(1.05 * (und === 'M2' ? 0.08 * 42.00 : 42.00)).toFixed(2) },
        { codigo: "M-SOLV", descripcion: shortDesc("SOLVENTE, THINNER EPOXICO Y CONSUMIBLES DE APLICACION"), unidad: "GLB", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 5.50, total: 5.50 },
      ],
      equipos: [
        { codigo: "EQ-AIR", descripcion: shortDesc("COMPRESOR 250 CFM, TOLVA DE ARENADO O AIRLESS SPRAY"), cantidad: 1, costo: 65.00, depreciacionOAlquiler: 1.0, total: 65.00 },
        { codigo: "EQ-SEG", descripcion: shortDesc("EQUIPO DE PROTECCIÓN RESPIRATORIA CON LÍNEA DE AIRE"), cantidad: 1, costo: 15.00, depreciacionOAlquiler: 1.0, total: 15.00 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.25, total: +(0.25 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.PINTOR_A, cantidad: 2.00, total: +(2.00 * LAB.PINTOR_A.salarioDiario).toFixed(2) },
        { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
        { ...LAB.OBRERO, cantidad: 1.00, total: +(1.00 * LAB.OBRERO.salarioDiario).toFixed(2) },
      ]
    };
  }

  // 6. Mobiliario Suministro
  if (cap.includes('Suministro de Mobiliario') || (dUpper.includes('SUMINISTRO') && dUpper.includes('MOBILIARIO'))) {
    return {
      rendimiento: 4.0,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-MOB1", descripcion: shortDesc(`SUMINISTRO FABRICADO: ${desc.slice(0, 32)}`), unidad: "UND", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 145.00, total: 145.00 },
        { codigo: "M-EMB", descripcion: shortDesc("EMBALAJE, PROTECTORES Y HERRAJES DE FIJACIÓN"), unidad: "JGO", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 8.50, total: 8.50 },
      ],
      equipos: [
        { codigo: "EQ-TRF", descripcion: shortDesc("VEHÍCULO LIVIANO DE TRANSPORTE Y ACARREO"), cantidad: 1, costo: 25.00, depreciacionOAlquiler: 1.0, total: 25.00 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.15, total: +(0.15 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.CHOFER, cantidad: 0.50, total: +(0.50 * LAB.CHOFER.salarioDiario).toFixed(2) },
        { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
      ]
    };
  }

  // 7. Mobiliario Instalación
  if (cap.includes('Instalación y Armado') || dUpper.includes('INSTALACION DE MOBILIARIO') || dUpper.includes('ARMADO')) {
    return {
      rendimiento: 6.0,
      unidadRendimiento: `${und}/día`,
      materiales: [
        { codigo: "M-FIJ1", descripcion: shortDesc("TORNILLOS, RAMPLUGS, SILICÓN Y ACCESORIOS DE ARMADO"), unidad: "JGO", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 6.80, total: 6.80 },
      ],
      equipos: [
        { codigo: "EQ-HER", descripcion: shortDesc("TALADROS INALÁMBRICOS, NIVELES LÁSER Y HERRAMIENTAS"), cantidad: 1, costo: 8.00, depreciacionOAlquiler: 1.0, total: 8.00 },
      ],
      manoDeObra: [
        { ...LAB.CAPORAL, cantidad: 0.20, total: +(0.20 * LAB.CAPORAL.salarioDiario).toFixed(2) },
        { ...LAB.MONTADOR, cantidad: 1.00, total: +(1.00 * LAB.MONTADOR.salarioDiario).toFixed(2) },
        { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
      ]
    };
  }

  // Default fallback APU for other specialties
  return {
    rendimiento: und === 'UND' ? 2.0 : und === 'M2' ? 20.0 : und === 'ML' ? 30.0 : 5.0,
    unidadRendimiento: `${und}/día`,
    materiales: [
      { codigo: "M-MAT0", descripcion: shortDesc(`MATERIALES ESPECIFICADOS PARA ${desc.slice(0, 30)}`), unidad: und === 'M2' || und === 'ML' ? und : 'JGO', cantidad: 1.03, desperdicioPorc: 3, costoUnitario: 18.00, total: 18.54 },
      { codigo: "M-CON0", descripcion: shortDesc("CONSUMIBLES GENERALES DE INSTALACIÓN"), unidad: "GLB", cantidad: 1.0, desperdicioPorc: 0, costoUnitario: 3.50, total: 3.50 },
    ],
    equipos: [
      { codigo: "EQ-ESP", descripcion: shortDesc("HERRAMIENTAS ESPECIALIZADAS Y EQUIPOS DE APOYO"), cantidad: 1, costo: 10.00, depreciacionOAlquiler: 1.0, total: 10.00 },
    ],
    manoDeObra: [
      { ...LAB.CAPORAL, cantidad: 0.20, total: +(0.20 * LAB.CAPORAL.salarioDiario).toFixed(2) },
      { ...LAB.ALBANIL, cantidad: 1.00, total: +(1.00 * LAB.ALBANIL.salarioDiario).toFixed(2) },
      { ...LAB.AYUDANTE, cantidad: 1.00, total: +(1.00 * LAB.AYUDANTE.salarioDiario).toFixed(2) },
    ]
  };
}

function deriveSpec(id, desc, und, cap) {
  return {
    extensionTrabajo: `Comprende todas las labores requeridas para la correcta ejecución de: ${desc}. Incluye suministro de insumos certificados, transporte hasta el sitio de obra, maniobras de izado/colocación, mano de obra calificada bajo LOTTT y pruebas de aceptación final.`,
    procedimientoEjecucion: `Los trabajos se llevarán a cabo siguiendo estrictamente las especificaciones técnicas de PDVSA y normas COVENIN aplicables. El contratista verificará niveles, alineación, especificaciones de fábrica y condiciones seguras antes de iniciar las actividades.`,
    toleranciasAceptacion: `Se exigirá alineación milimétrica en elementos visibles (+/- 2 mm), verticalidad y estanqueidad certificada sin deformaciones ni desperfectos aparentes.`,
    ensayosARealizar: `Pruebas de funcionamiento en vacío y con carga, inspección visual del 100% de las uniones y verificación de adherencia/torque según corresponda.`,
    desperdicioMaximo: `Máximo 3% a 5% en materiales consumibles y cortes menores debidamente autorizados por la inspección técnica.`,
    planos: `Conforme a planos arquitectónicos, estructurales, mecánicos o diagramas unifilares aprobados para construcción por PDVSA.`,
    condicionesEspeciales: `Cumplimiento riguroso de las directrices de Seguridad Industrial, Ambiente e Higiene Ocupacional (SIHO-PDVSA) y permisos de trabajo en caliente/frío.`,
    medidaYFormaPago: `La partida se medirá y pagará por ${und} efectivamente ejecutada, instalada y recibida a total satisfacción por el Ingeniero Inspector de PDVSA.`,
    noConformidad: `Cualquier elemento que no cumpla con los estándares de calidad, resistencia o acabado de la norma PDVSA será rechazado y reemplazado por cuenta exclusiva del contratista sin costo adicional.`,
    materialesObservaciones: `Materiales de primera calidad con certificados de calidad de origen y lote de fabricación verificable.`,
    equiposObservaciones: `Equipos en óptimo estado electromecánico con mantenimiento preventivo vigente y operadores certificados.`,
    manoDeObraObservaciones: `Personal calificado con inducción SIHO vigente y remunerado bajo la Convención Colectiva Petrolera (CCP) y LOTTT.`
  };
}

// Generate the 363 items
const items363 = allRaw.map(generateItem);

// Split into 4 parts for clean file sizes
const p1 = items363.slice(0, 100);
const p2 = items363.slice(100, 200);
const p3 = items363.slice(200, 300);
const p4 = items363.slice(300);

function writePartFile(filePath, varName, items) {
  const content = `import { PartidaItem } from '../types/costTypes';\n\nexport const ${varName}: PartidaItem[] = ${JSON.stringify(items, null, 2)};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Wrote ${items.length} items to ${filePath}`);
}

writePartFile('./src/data/items363_part1.ts', 'ITEMS_363_PART1', p1);
writePartFile('./src/data/items363_part2.ts', 'ITEMS_363_PART2', p2);
writePartFile('./src/data/items363_part3.ts', 'ITEMS_363_PART3', p3);
writePartFile('./src/data/items363_part4.ts', 'ITEMS_363_PART4', p4);

console.log("Successfully built all 363 items in 4 modular TypeScript files.");
