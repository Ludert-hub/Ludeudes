export interface MaterialItem {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  desperdicioPorc: number;
  costoUnitario: number;
  total: number;
}

export interface EquipmentItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  costo: number;
  depreciacionOAlquiler: number;
  total: number;
}

export interface LaborItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
  salarioDiario: number;
  total: number;
}

export interface ApuDetail {
  rendimiento: number; // unidades por día
  unidadRendimiento: string; // e.g. "M2/día", "UND/día", etc.
  materiales: MaterialItem[];
  equipos: EquipmentItem[];
  manoDeObra: LaborItem[];
}

export interface TechnicalSpecification {
  extensionTrabajo: string;
  procedimientoEjecucion: string;
  toleranciasAceptacion: string;
  ensayosARealizar: string;
  desperdicioMaximo: string;
  planos: string;
  condicionesEspeciales: string;
  medidaYFormaPago: string;
  noConformidad: string;
  materialesObservaciones?: string;
  equiposObservaciones?: string;
  manoDeObraObservaciones?: string;
}

export interface PartidaItem {
  id: number;
  capitulo: string;
  codigoCovenin: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  apu: ApuDetail;
  especificacion: TechnicalSpecification;
}

export interface CalculatedApu {
  totalMateriales: number;
  unitarioMateriales: number;
  totalEquipos: number;
  unitarioEquipos: number;
  manoObraDirectaTotal: number;
  fcasMonto: number;
  fcasPorc: number;
  totalManoObra: number;
  unitarioManoObra: number;
  costoDirectoUnitario: number;
  adminMonto: number;
  adminPorc: number;
  subTotalUnitario: number;
  utilidadMonto: number;
  utilidadPorc: number;
  precioUnitario: number;
  totalPartida: number;
}

export interface FinancialSummary {
  totalCostoDirecto: number;
  totalMateriales: number;
  totalEquipos: number;
  totalManoObraDirecta: number;
  totalFcas: number;
  totalManoObraPlena: number;
  totalGastosAdmin: number;
  totalAdministracion: number;
  totalUtilidad: number;
  subTotalGeneral: number;
  totalIva: number;
  granTotalGeneral: number;
}

export interface ProjectRecord {
  id: string;
  name: string;
  shortName: string;
  solped: string;
  division: string;
  ubicacion: string;
  fecha: string;
  lapsoDias: number;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc: number;
  items: PartidaItem[];
  isOfficialDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

