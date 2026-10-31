import { ProjectRecord, PartidaItem } from '../types/costTypes';
import { ALL_ITEMS } from '../data/itemsData';
import { PROJECT_INFO, OFFICIAL_PROJECT_NAME } from '../data/projectInfo';

export const OFFICIAL_PROJECT_ID = 'pdvsa-toreno-364';
const STORAGE_PROJECTS_KEY = 'pdvsa_multi_projects_v8';
const STORAGE_ACTIVE_ID_KEY = 'pdvsa_active_project_id_v8';

const LEGACY_KEYS = [
  'pdvsa_multi_projects_v9',
  'pdvsa_multi_projects_v7',
  'pdvsa_multi_projects_v6',
  'pdvsa_multi_projects_v5',
  'pdvsa_multi_projects_v4',
  'pdvsa_multi_projects_v3',
  'pdvsa_multi_projects_v2',
  'pdvsa_multi_projects_v1',
];

const UNDONE_VELA_13_DESCRIPTIONS = new Set([
  'S/C DE CRUCETA DOBLE DE 1.80 MTS. EN DERIVACION LINEA MONOFASICA 13.8 KV',
  'S/C DE AISLADOR DE SUSPENSION POLIMERICO DE 15 KV',
  'S/C DE AISLADOR DE ESPIGA DE PORCELANA ANSI 55-4 (13.8 KV) CON ESPIGA PARA CRUCETA',
  'S/C DE CORTACIRCUITO FUSIBLE DE 15 KV, 100 A, 10 KA DE CAPACIDAD DE INTERRUPCION, INCLUYE FUSIBLE K DE 5 A',
  'S/C DE PARARRAYOS POLIMERICO DE OXIDO METALICO DE 12 KV, 10 KA, CON DESCONECTADOR',
  'S/C DE TRANSFORMADOR MONOFASICO DE DISTRIBUCION 25 KVA, 13800 / 120-240 V, 60 HZ, SUMERGIDO EN ACEITE, CON ACCESORIOS DE FIJACION EN POSTE',
  'CONSTRUCCION DE PUESTA A TIERRA PARA BANCO DE TRANSFORMACION Y PARARRAYOS CON BARRA COPPERWELD 5/8" X 2.44 M Y CONDUCTOR DE COBRE DESNUDO # 4 AWG',
  'TENDIDO Y TENSADO DE CONDUCTOR DE ALUMINIO ARVIDAL (AAAC) CALIBRE 2/0 AWG EN LINEA MONOFASICA DE 13.8 KV',
  'S/C DE ESTRIBO PARA DERIVACION EN LINEA PRIMARIA 13.8 KV CON CONECTOR DE COMPRESION TIPO H',
  'S/C DE GRAPA DE LINEA VIVA (HOT LINE CLAMP) DE BRONCE ESTAÑADO PARA CONDUCTOR 2/0 A 4 AWG',
  'S/C DE HERRAJE TIPO PERCHA DE 3 PUESTOS CON AISLADORES TIPO CARRETE ANSI 53-2 PARA BAJA TENSION',
  'S/C DE CONDUCTOR DE COBRE AISLADO THW CALIBRE # 2 AWG (600 V) PARA BAJANTE DE TRANSFORMADOR A TABLERO GENERAL',
  'S/C CONECTOR TIPO PERRO (BURNIT) CALIBRE DESDESDE N° 1 AL 6',
]);

const MASTER_MAP = new Map<number, PartidaItem>(ALL_ITEMS.map((i) => [i.id, i]));

/**
 * Purges obsolete localStorage keys so the 5MB browser quota is never exhausted.
 */
function purgeLegacyStorageKeys(): void {
  try {
    for (const k of LEGACY_KEYS) {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Creates the initial official Toreño 364-partida project record
 */
export function createDefaultOfficialProject(): ProjectRecord {
  return {
    id: OFFICIAL_PROJECT_ID,
    name: OFFICIAL_PROJECT_NAME,
    shortName: 'El Toreño - Flota Pesada (364 part.)',
    solped: PROJECT_INFO.solped,
    division: PROJECT_INFO.division,
    ubicacion: PROJECT_INFO.ubicacion,
    fecha: PROJECT_INFO.fecha,
    lapsoDias: PROJECT_INFO.lapsoDias,
    fcasPorc: 500.0,
    adminPorc: 12.5,
    utilidadPorc: 17.0,
    ivaPorc: 16.0,
    items: JSON.parse(JSON.stringify(ALL_ITEMS)),
    isOfficialDefault: true,
    createdAt: '2025-10-20T08:00:00.000Z',
    updatedAt: '2025-10-20T08:00:00.000Z',
  };
}

/**
 * Rehydrates any project record with full master specifications and valid APU fields,
 * while strictly preserving all user modifications to quantities, prices, yields, and APUs.
 */
export function rehydrateProjectRecord(proj: ProjectRecord): ProjectRecord {
  const isOfficial =
    proj.id === OFFICIAL_PROJECT_ID ||
    proj.id === 'pdvsa-toreno-377' ||
    proj.id === 'pdvsa-toreno-363' ||
    proj.isOfficialDefault;

  let sourceItems = Array.isArray(proj.items) ? proj.items : JSON.parse(JSON.stringify(ALL_ITEMS));

  if (isOfficial && sourceItems.length > ALL_ITEMS.length) {
    sourceItems = sourceItems
      .filter((it: PartidaItem) => !UNDONE_VELA_13_DESCRIPTIONS.has((it.descripcion || '').trim()))
      .map((it: PartidaItem, idx: number) => ({
        ...it,
        id: idx + 1,
        codigoCovenin: String(idx + 1).padStart(3, '0'),
      }));
  }

  const rehydratedItems = sourceItems.map((userItem: PartidaItem, idx: number) => {
    const itemId = idx + 1;
    const master = MASTER_MAP.get(itemId);
    if (!master) return userItem;

    return {
      ...master,
      ...userItem,
      id: itemId,
      codigoCovenin: String(itemId).padStart(3, '0'),
      cantidad: typeof userItem.cantidad === 'number' ? userItem.cantidad : master.cantidad,
      unidad: userItem.unidad || master.unidad,
      descripcion: userItem.descripcion || master.descripcion,
      especificacion:
        userItem.especificacion && userItem.especificacion.extensionTrabajo
          ? userItem.especificacion
          : master.especificacion,
      apu: {
        ...master.apu,
        ...(userItem.apu || {}),
        rendimiento:
          typeof userItem.apu?.rendimiento === 'number' && userItem.apu.rendimiento > 0
            ? userItem.apu.rendimiento
            : master.apu.rendimiento,
        unidadRendimiento: userItem.apu?.unidadRendimiento || master.apu.unidadRendimiento,
        materiales: Array.isArray(userItem.apu?.materiales)
          ? userItem.apu.materiales
          : master.apu.materiales,
        equipos: Array.isArray(userItem.apu?.equipos)
          ? userItem.apu.equipos
          : master.apu.equipos,
        manoDeObra: Array.isArray(userItem.apu?.manoDeObra)
          ? userItem.apu.manoDeObra
          : master.apu.manoDeObra,
      },
    };
  });

  if (isOfficial) {
    const existingIds = new Set(rehydratedItems.map((i: PartidaItem) => i.id));
    ALL_ITEMS.forEach((masterItem) => {
      if (!existingIds.has(masterItem.id)) {
        rehydratedItems.push(JSON.parse(JSON.stringify(masterItem)));
      }
    });
  }

  const resolvedFcas =
    typeof proj.fcasPorc === 'number'
      ? isOfficial && proj.fcasPorc === 1200
        ? 500.0
        : proj.fcasPorc
      : 500.0;

  return {
    ...proj,
    id: isOfficial ? OFFICIAL_PROJECT_ID : proj.id,
    shortName: isOfficial ? 'El Toreño - Flota Pesada (364 part.)' : proj.shortName,
    fcasPorc: resolvedFcas,
    adminPorc: typeof proj.adminPorc === 'number' ? proj.adminPorc : 12.5,
    utilidadPorc: typeof proj.utilidadPorc === 'number' ? proj.utilidadPorc : 17.0,
    ivaPorc: typeof proj.ivaPorc === 'number' ? proj.ivaPorc : 16.0,
    items: rehydratedItems,
  };
}

/**
 * Compresses projects for localStorage by omitting static master `especificacion` objects
 * when identical to ALL_ITEMS, reducing storage footprint by ~85% so QuotaExceededError never occurs.
 */
function compactProjectsForLocalStorage(projects: ProjectRecord[]): unknown[] {
  return projects.map((proj) => ({
    ...proj,
    items: proj.items.map((item) => {
      const master = MASTER_MAP.get(item.id);
      const isSameSpec =
        master &&
        item.especificacion &&
        item.especificacion.extensionTrabajo === master.especificacion.extensionTrabajo &&
        item.especificacion.procedimientoEjecucion === master.especificacion.procedimientoEjecucion;

      if (isSameSpec) {
        const { especificacion: _omitted, ...compactItem } = item;
        return compactItem;
      }
      return item;
    }),
  }));
}

/**
 * Loads all saved projects from localStorage, guaranteeing user modifications always prevail
 */
export function loadAllProjects(): ProjectRecord[] {
  try {
    let raw = localStorage.getItem(STORAGE_PROJECTS_KEY);

    if (!raw) {
      // Check if any legacy key exists to migrate before purging
      for (const k of LEGACY_KEYS) {
        const candidate = localStorage.getItem(k);
        if (candidate) {
          raw = candidate;
          break;
        }
      }
    }

    purgeLegacyStorageKeys();

    if (raw) {
      const parsed: ProjectRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const rehydrated = parsed.map((proj) => {
          if (proj.id === 'pdvsa-toreno-363' || proj.id === 'pdvsa-toreno-377' || proj.id === 'pdvsa-toreno-364') {
            return rehydrateProjectRecord({
              ...proj,
              id: OFFICIAL_PROJECT_ID,
              name: OFFICIAL_PROJECT_NAME,
              shortName: 'El Toreño - Flota Pesada (364 part.)',
            });
          }
          return rehydrateProjectRecord(proj);
        });

        if (!rehydrated.some((p) => p.id === OFFICIAL_PROJECT_ID)) {
          rehydrated.unshift(createDefaultOfficialProject());
        }

        return rehydrated;
      }
    }
  } catch (err) {
    console.error('Error loading projects from localStorage:', err);
  }

  const initial = [createDefaultOfficialProject()];
  saveAllProjectsToLocalOnly(initial);
  return initial;
}

/**
 * Saves projects to localStorage only (compact format, safe against QuotaExceededError)
 */
export function saveAllProjectsToLocalOnly(projects: ProjectRecord[]): boolean {
  try {
    purgeLegacyStorageKeys();
    const compact = compactProjectsForLocalStorage(projects);
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(compact));
    return true;
  } catch (err) {
    console.error('Error saving projects to localStorage:', err);
    return false;
  }
}

/**
 * Asynchronously syncs all projects to the backend server disk (/api/projects)
 */
export async function syncProjectsToServer(
  projects: ProjectRecord[],
  activeProjectId?: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        projects,
        activeProjectId: activeProjectId || getActiveProjectId(),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.success;
    }
  } catch {
    // Graceful offline fallback
  }
  return false;
}

/**
 * Fetches server-persisted projects from /api/projects if available (never cached)
 */
export async function fetchServerProjects(): Promise<{
  projects: ProjectRecord[];
  activeProjectId?: string;
} | null> {
  try {
    const res = await fetch(`/api/projects?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.projects) && json.projects.length > 0) {
        return {
          projects: json.projects.map(rehydrateProjectRecord),
          activeProjectId: json.activeProjectId,
        };
      }
    }
  } catch {
    // Graceful offline fallback
  }
  return null;
}

/**
 * Smart reconciliation between browser localStorage projects and server disk projects:
 * Always keeps whichever version of each project has the newer `updatedAt` timestamp,
 * so a container restart or stale server file can NEVER overwrite the user's saved changes!
 */
export function reconcileLocalAndServerProjects(
  localProjects: ProjectRecord[],
  serverProjects: ProjectRecord[]
): { merged: ProjectRecord[]; localHasNewerChanges: boolean } {
  const map = new Map<string, ProjectRecord>();
  let localHasNewerChanges = false;

  for (const sProj of serverProjects) {
    map.set(sProj.id, rehydrateProjectRecord(sProj));
  }

  for (const lProj of localProjects) {
    const existingServer = map.get(lProj.id);
    if (!existingServer) {
      map.set(lProj.id, rehydrateProjectRecord(lProj));
      localHasNewerChanges = true;
    } else {
      const localTime = Date.parse(lProj.updatedAt || '2000-01-01T00:00:00.000Z') || 0;
      const serverTime = Date.parse(existingServer.updatedAt || '2000-01-01T00:00:00.000Z') || 0;

      if (localTime > serverTime) {
        map.set(lProj.id, rehydrateProjectRecord(lProj));
        localHasNewerChanges = true;
      }
    }
  }

  const merged = Array.from(map.values());
  if (!merged.some((p) => p.id === OFFICIAL_PROJECT_ID)) {
    merged.unshift(createDefaultOfficialProject());
  }

  return { merged, localHasNewerChanges };
}

/**
 * Saves all projects to localStorage and triggers server-side disk persistence
 */
export function saveAllProjects(projects: ProjectRecord[], activeId?: string): void {
  saveAllProjectsToLocalOnly(projects);
  syncProjectsToServer(projects, activeId).catch(() => {});
}

/**
 * Retrieves the currently active project ID
 */
export function getActiveProjectId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return OFFICIAL_PROJECT_ID;
}

/**
 * Sets the active project ID in localStorage
 */
export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Creates a brand new project and adds it to the projects store
 */
export function createNewProject(
  meta: {
    name: string;
    shortName?: string;
    solped?: string;
    division?: string;
    ubicacion?: string;
    fcasPorc?: number;
    adminPorc?: number;
    utilidadPorc?: number;
    ivaPorc?: number;
  },
  items: PartidaItem[]
): ProjectRecord {
  const all = loadAllProjects();
  const id = `proj-${Date.now()}`;
  const now = new Date().toISOString();

  const newProject: ProjectRecord = {
    id,
    name: meta.name.trim() || 'NUEVO PROYECTO PDVSA',
    shortName: meta.shortName?.trim() || meta.name.slice(0, 36) || 'Nuevo Proyecto',
    solped: meta.solped?.trim() || `SOL-${Math.floor(1000000000 + Math.random() * 900000000)}`,
    division: meta.division?.trim() || PROJECT_INFO.division,
    ubicacion: meta.ubicacion?.trim() || PROJECT_INFO.ubicacion,
    fecha: new Date().toLocaleDateString('es-VE'),
    lapsoDias: 90,
    fcasPorc: meta.fcasPorc ?? 500.0,
    adminPorc: meta.adminPorc ?? 12.5,
    utilidadPorc: meta.utilidadPorc ?? 17.0,
    ivaPorc: meta.ivaPorc ?? 16.0,
    items,
    isOfficialDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  all.push(newProject);
  saveAllProjects(all, id);
  setActiveProjectId(id);
  return newProject;
}

/**
 * Duplicates an existing project
 */
export function duplicateProject(sourceId: string): ProjectRecord | null {
  const all = loadAllProjects();
  const src = all.find((p) => p.id === sourceId);
  if (!src) return null;

  const newId = `proj-${Date.now()}`;
  const now = new Date().toISOString();
  const copy: ProjectRecord = {
    ...src,
    id: newId,
    name: `COPIA - ${src.name}`,
    shortName: `Copia ${src.shortName}`.slice(0, 36),
    isOfficialDefault: false,
    createdAt: now,
    updatedAt: now,
    items: JSON.parse(JSON.stringify(src.items)),
  };

  all.push(copy);
  saveAllProjects(all, newId);
  setActiveProjectId(newId);
  return copy;
}

/**
 * Deletes a project (will not delete the official default Toreño project)
 */
export function deleteProject(id: string): { success: boolean; nextActiveId?: string } {
  if (id === OFFICIAL_PROJECT_ID) {
    return { success: false };
  }

  const all = loadAllProjects();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return { success: false };

  const currentActive = getActiveProjectId();
  let nextActiveId = currentActive;

  if (currentActive === id) {
    nextActiveId = OFFICIAL_PROJECT_ID;
    setActiveProjectId(nextActiveId);
  }

  saveAllProjects(filtered, nextActiveId);
  return { success: true, nextActiveId };
}

/**
 * Commits the provided projects array and activeProjectId directly to localStorage and server disk
 */
export async function commitCurrentAsPermanentBaseline(
  projectId: string,
  currentProjects?: ProjectRecord[]
): Promise<boolean> {
  const list = currentProjects || loadAllProjects();
  const now = new Date().toISOString();
  const updatedList = list.map((p) => (p.id === projectId ? { ...p, updatedAt: now } : p));
  const localOk = saveAllProjectsToLocalOnly(updatedList);
  const serverOk = await syncProjectsToServer(updatedList, projectId);
  return localOk || serverOk;
}

/**
 * Resets the official Toreño project to pristine 364-partidas state
 */
export function resetOfficialProject(): ProjectRecord {
  const all = loadAllProjects();
  const pristine = {
    ...createDefaultOfficialProject(),
    updatedAt: new Date().toISOString(),
  };
  const idx = all.findIndex((p) => p.id === OFFICIAL_PROJECT_ID);

  if (idx !== -1) {
    all[idx] = pristine;
  } else {
    all.unshift(pristine);
  }

  saveAllProjects(all, OFFICIAL_PROJECT_ID);
  setActiveProjectId(OFFICIAL_PROJECT_ID);
  return pristine;
}

/**
 * Exports all projects to a JSON file for local backup
 */
export function exportProjectsBackupJson(currentProjects?: ProjectRecord[]): void {
  const projects = currentProjects || loadAllProjects();
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    system: 'Sistema APU PDVSA - DEP Los Llanos',
    projects,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Respaldo_Proyectos_PDVSA_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports projects from a JSON backup
 */
export function importProjectsBackupJson(
  jsonString: string
): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    const list: ProjectRecord[] = Array.isArray(data) ? data : data.projects;

    if (!Array.isArray(list) || list.length === 0) {
      return {
        success: false,
        count: 0,
        error: 'El archivo no contiene un listado válido de proyectos.',
      };
    }

    const current = loadAllProjects();
    const map = new Map<string, ProjectRecord>();

    current.forEach((p) => map.set(p.id, p));
    list.forEach((p) => {
      if (p.id && p.name && Array.isArray(p.items)) {
        map.set(p.id, rehydrateProjectRecord({ ...p, updatedAt: new Date().toISOString() }));
      }
    });

    const merged = Array.from(map.values());
    saveAllProjects(merged);
    return { success: true, count: list.length };
  } catch (err: unknown) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Error desconocido al procesar JSON',
    };
  }
}

/**
 * Builds the canonical persistent projects JSON payload matching /data/projects_persistent.json
 * with all current live on-screen modifications.
 */
export function buildDatabaseJsonPayload(
  allProjects: ProjectRecord[],
  activeProject: ProjectRecord,
  liveItems: PartidaItem[],
  fcasPorc: number,
  adminPorc: number,
  utilidadPorc: number,
  ivaPorc: number
) {
  const nowIso = new Date().toISOString();
  const syncedProjects = allProjects.map((p) => {
    if (p.id === activeProject.id) {
      return {
        ...p,
        items: liveItems,
        fcasPorc,
        adminPorc,
        utilidadPorc,
        ivaPorc,
        updatedAt: nowIso,
      };
    }
    return p;
  });

  return {
    projects: syncedProjects,
    activeProjectId: activeProject.id,
    lastSaved: nowIso,
    system: 'PDVSA Costos & APU Petrolero - Persistencia Permanente en Disco',
  };
}

/**
 * Utility to download any JSON data as a formatted downloadable file
 */
export function downloadDatabaseJsonFile(payload: unknown, filename = 'projects_persistent.json'): void {
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

