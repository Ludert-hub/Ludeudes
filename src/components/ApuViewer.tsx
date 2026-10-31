import React, { useState } from 'react';
import { PartidaItem, ApuDetail, MaterialItem, EquipmentItem, LaborItem } from '../types/costTypes';
import { calculateItemApu, formatCurrency, formatNumber } from '../utils/apuCalculations';
import { PROJECT_INFO } from '../data/projectInfo';
import { printHtmlElement, triggerDirectPrint } from '../utils/printManager';
import { exportSingleApuToPdf, exportApuBookToPdf } from '../utils/pdfExport';
import { NumberStepper } from './NumberStepper';
import {
  Printer,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Save,
  Zap,
} from 'lucide-react';

interface ApuViewerProps {
  items: PartidaItem[];
  selectedItem: PartidaItem;
  onSelectItem: (item: PartidaItem) => void;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  onUpdateItemApu?: (itemId: number, newApu: ApuDetail) => void;
  onUpdateQuantity?: (itemId: number, newQty: number) => void;
  onUpdateUnidad?: (itemId: number, newUnidad: string) => void;
  onResetApu?: (itemId: number) => void;
  onPropagateMaterial?: (
    targetKey: string,
    changes: { costoUnitario?: number; desperdicioPorc?: number }
  ) => void;
  onPropagateEquipment?: (
    targetKey: string,
    changes: { costo?: number; depreciacionOAlquiler?: number }
  ) => void;
  onPropagateLabor?: (
    targetKey: string,
    changes: { salarioDiario?: number }
  ) => void;
  onSaveChanges?: () => void;
}

export const ApuViewer: React.FC<ApuViewerProps> = ({
  items,
  selectedItem,
  onSelectItem,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  onUpdateItemApu,
  onUpdateQuantity,
  onUpdateUnidad,
  onResetApu,
  onPropagateMaterial,
  onPropagateEquipment,
  onPropagateLabor,
  onSaveChanges,
}) => {
  const currentIndex = items.findIndex((i) => i.id === selectedItem.id);
  const calc = calculateItemApu(selectedItem, fcasPorc, adminPorc, utilidadPorc);
  const [operationNotice, setOperationNotice] = useState<string | null>(null);
  const [globalSyncEnabled, setGlobalSyncEnabled] = useState<boolean>(true);

  const showOperationFeedback = (msg: string) => {
    setOperationNotice(msg);
    setTimeout(() => setOperationNotice(null), 3500);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectItem(items[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      onSelectItem(items[currentIndex + 1]);
    }
  };

  const handlePrint = () => {
    const success = printHtmlElement(
      'official-apu-sheet',
      `APU Partida Nº ${selectedItem.id} - ${selectedItem.codigoCovenin}`
    );
    if (!success) {
      triggerDirectPrint();
    }
  };

  // ==========================================
  // Materiales Handlers
  // ==========================================
  const handleUpdateMaterial = (
    index: number,
    field: keyof MaterialItem,
    value: number
  ) => {
    const newMaterials = [...selectedItem.apu.materiales];
    const current = newMaterials[index];
    if (!current) return;

    // If changing unit price or waste % and global data binding is active, propagate across all partidas
    if (
      globalSyncEnabled &&
      onPropagateMaterial &&
      (field === 'costoUnitario' || field === 'desperdicioPorc')
    ) {
      onPropagateMaterial(current.descripcion, { [field]: value });
      showOperationFeedback(
        `⚡ Sincronización Global: "${current.descripcion}" actualizado en todas las partidas vinculadas`
      );
      return;
    }

    if (!onUpdateItemApu) return;
    const updated = { ...current, [field]: value };
    const waste = 1 + (updated.desperdicioPorc || 0) / 100;
    updated.total = updated.cantidad * updated.costoUnitario * waste;
    newMaterials[index] = updated;

    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      materiales: newMaterials,
    });
    showOperationFeedback(`Material "${updated.descripcion}": Total recalculado = ${formatCurrency(updated.total)}`);
  };

  const handleAddMaterial = () => {
    if (!onUpdateItemApu) return;
    const nextIdx = selectedItem.apu.materiales.length + 1;
    const newMat: MaterialItem = {
      codigo: `M${String(nextIdx).padStart(3, '0')}`,
      descripcion: 'NUEVO MATERIAL',
      unidad: selectedItem.unidad,
      cantidad: 1,
      desperdicioPorc: 5,
      costoUnitario: 10,
      total: 10 * 1.05,
    };
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      materiales: [...selectedItem.apu.materiales, newMat],
    });
    showOperationFeedback('Nuevo material agregado a la partida');
  };

  const handleRemoveMaterial = (index: number) => {
    if (!onUpdateItemApu) return;
    const newMaterials = selectedItem.apu.materiales.filter((_, i) => i !== index);
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      materiales: newMaterials,
    });
    showOperationFeedback('Material removido');
  };

  // ==========================================
  // Equipos Handlers
  // ==========================================
  const handleUpdateEquipo = (
    index: number,
    field: keyof EquipmentItem,
    value: number
  ) => {
    const newEquipos = [...selectedItem.apu.equipos];
    const current = newEquipos[index];
    if (!current) return;

    // If changing equipment cost or depreciation factor and global data binding is active, propagate across all partidas
    if (
      globalSyncEnabled &&
      onPropagateEquipment &&
      (field === 'costo' || field === 'depreciacionOAlquiler')
    ) {
      onPropagateEquipment(current.descripcion, { [field]: value });
      showOperationFeedback(
        `⚡ Sincronización Global: Equipo "${current.descripcion}" actualizado en todas las partidas vinculadas`
      );
      return;
    }

    if (!onUpdateItemApu) return;
    const updated = { ...current, [field]: value };
    updated.total = updated.cantidad * updated.costo * (updated.depreciacionOAlquiler || 1);
    newEquipos[index] = updated;

    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      equipos: newEquipos,
    });
    showOperationFeedback(`Equipo "${updated.descripcion}": Total diario recalculado = ${formatCurrency(updated.total)}`);
  };

  const handleAddEquipo = () => {
    if (!onUpdateItemApu) return;
    const newEq: EquipmentItem = {
      codigo: `EQ-HMN`,
      descripcion: 'HERRAMIENTAS MENORES (PICOS, PALAS, CARRETILLAS)',
      cantidad: 1,
      costo: 200.0,
      depreciacionOAlquiler: 0.02,
      total: 4.0,
    };
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      equipos: [...selectedItem.apu.equipos, newEq],
    });
    showOperationFeedback('Nuevo equipo agregado a la partida');
  };

  const handleRemoveEquipo = (index: number) => {
    if (!onUpdateItemApu) return;
    const newEquipos = selectedItem.apu.equipos.filter((_, i) => i !== index);
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      equipos: newEquipos,
    });
    showOperationFeedback('Equipo removido');
  };

  // ==========================================
  // Mano de Obra Handlers
  // ==========================================
  const handleUpdateManoDeObra = (
    index: number,
    field: keyof LaborItem,
    value: number
  ) => {
    const newMo = [...selectedItem.apu.manoDeObra];
    const current = newMo[index];
    if (!current) return;

    // If changing worker daily wage and global data binding is active, propagate across all partidas
    if (globalSyncEnabled && onPropagateLabor && field === 'salarioDiario') {
      onPropagateLabor(current.descripcion, { salarioDiario: value });
      showOperationFeedback(
        `⚡ Sincronización Global LOTTT: Salario de "${current.descripcion}" propagado a todas las partidas`
      );
      return;
    }

    if (!onUpdateItemApu) return;
    const updated = { ...current, [field]: value };
    updated.total = updated.cantidad * updated.salarioDiario;
    newMo[index] = updated;

    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      manoDeObra: newMo,
    });
    showOperationFeedback(`M.O. "${updated.descripcion}": Total recalculado = ${formatCurrency(updated.total)}`);
  };

  const handleAddManoDeObra = () => {
    if (!onUpdateItemApu) return;
    const newWorker: LaborItem = {
      codigo: '1-1-1',
      descripcion: 'OBRERO DE 1RA',
      cantidad: 1,
      salarioDiario: 3.5,
      total: 3.5,
    };
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      manoDeObra: [...selectedItem.apu.manoDeObra, newWorker],
    });
    showOperationFeedback('Mano de obra agregada a la cuadrilla');
  };

  const handleRemoveManoDeObra = (index: number) => {
    if (!onUpdateItemApu) return;
    const newMo = selectedItem.apu.manoDeObra.filter((_, i) => i !== index);
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      manoDeObra: newMo,
    });
    showOperationFeedback('Oficio de mano de obra removido');
  };

  // ==========================================
  // Rendimiento Handler
  // ==========================================
  const handleUpdateRendimiento = (newRend: number) => {
    if (!onUpdateItemApu) return;
    onUpdateItemApu(selectedItem.id, {
      ...selectedItem.apu,
      rendimiento: Math.max(0.01, newRend),
    });
    showOperationFeedback(`Rendimiento ajustado a ${formatNumber(newRend, 2)} ${selectedItem.apu.unidadRendimiento}`);
  };

  return (
    <div className="space-y-4">
      {/* Top Selector & Navigation Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Partida anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-slate-700">Partida</span>
          <select
            value={selectedItem.id}
            onChange={(e) => {
              const found = items.find((i) => i.id === Number(e.target.value));
              if (found) onSelectItem(found);
            }}
            className="text-xs font-mono font-bold bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 max-w-md truncate"
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                Partida {i.id}: Código {String(i.id).padStart(3, '0')} - {i.descripcion.substring(0, 48)}...
              </option>
            ))}
          </select>

          <button
            onClick={handleNext}
            disabled={currentIndex === items.length - 1}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Siguiente partida"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-mono">
            Partida {currentIndex + 1} de {items.length}
          </span>

          {onSaveChanges && (
            <button
              type="button"
              onClick={onSaveChanges}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Guardar todos los cambios realizados en disco y navegador"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Cambios</span>
            </button>
          )}

          {onResetApu && (
            <button
              onClick={() => {
                onResetApu(selectedItem.id);
                showOperationFeedback('APU restablecido a los valores originales de PDVSA');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-300"
              title="Restablecer este APU a sus valores originales oficiales"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restablecer APU</span>
            </button>
          )}

          <button
            onClick={() => {
              exportSingleApuToPdf(selectedItem, fcasPorc, adminPorc, utilidadPorc);
              showOperationFeedback(`APU Partida Nº ${selectedItem.id} descargado en PDF oficial`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Descargar este APU en formato PDF Oficial (APU EJEMPLO.pdf)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Descargar APU (.pdf)</span>
          </button>

          <button
            onClick={() => {
              exportApuBookToPdf(items, fcasPorc, adminPorc, utilidadPorc);
              showOperationFeedback(`Libro Completo de ${items.length} APUs descargado en PDF oficial`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
            title="Descargar Libro Completo de 363 APUs en PDF Oficial"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-700" />
            <span>Libro Completo ({items.length} PDF)</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-300"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Imprimir Hoja APU</span>
          </button>
        </div>
      </div>

      {/* Interactive simulation & global data-binding banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Data Binding Global de Precios:</strong> Al modificar el <strong>Costo Unitario</strong> de un material, equipo o <strong>Salario Diario</strong> en este APU, el precio se actualiza y recalcula automáticamente en todas las partidas del presupuesto donde dicho insumo incida.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setGlobalSyncEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] border transition-colors cursor-pointer ${
              globalSyncEnabled
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
            title="Activar/Desactivar propagación global de precios unitarios a todas las partidas"
          >
            <Zap className="w-3 h-3" />
            <span>{globalSyncEnabled ? 'Propagación Global: ACTIVA' : 'Solo esta partida'}</span>
          </button>
          {operationNotice && (
            <span className="shrink-0 bg-slate-900 text-emerald-300 font-mono text-[11px] font-semibold px-2.5 py-1 rounded-md animate-fadeIn shadow-xs">
              {operationNotice}
            </span>
          )}
        </div>
      </div>

      {/* Official APU Sheet (Matching Inversiones JR 1068C.A. / PDVSA) */}
      <div id="official-apu-sheet" className="bg-white border-2 border-slate-800 rounded-xl shadow-md p-6 max-w-5xl mx-auto printable-sheet">
        {/* Header Table */}
        <div className="border-b-2 border-slate-800 pb-4 mb-4">
          <div className="flex justify-between items-start text-xs text-slate-800 mb-2">
            <div>
              <div className="font-bold text-base text-slate-900 tracking-tight">ANALISIS DE PRECIOS UNITARIOS</div>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">ESTRUCTURA METODOLÓGICA CONVENCIÓN COLECTIVA PETROLERA & LOTTT</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs">Fecha: <strong>{PROJECT_INFO.fecha}</strong></div>
              <div className="font-mono text-xs">SOLPED: <strong>{PROJECT_INFO.solped}</strong></div>
            </div>
          </div>

          <div className="bg-slate-100/90 border border-slate-300 rounded p-2.5 text-xs text-slate-800 space-y-1">
            <div>
              <span className="font-semibold text-slate-700">Descripción de la Obra:</span>{' '}
              <span className="font-medium">{PROJECT_INFO.descripcionLarga}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div>
                <span className="font-semibold text-slate-700">Propietario:</span>{' '}
                <span className="font-bold text-red-700">PDVSA DEP LOS LLANOS</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Código de la Obra:</span>{' '}
                <span className="font-mono font-bold">OBRA-001 (BARINAS)</span>
              </div>
            </div>
          </div>

          {/* Partida Metadata Banner */}
          <div className="mt-3 bg-slate-800 text-white p-3 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                <span>Partida Nº {selectedItem.id}</span>
                <span className="text-amber-400 font-mono font-bold">· Código {String(selectedItem.id).padStart(3, '0')}</span>
              </div>
              <div className="text-sm font-bold mt-0.5 leading-snug">
                {selectedItem.descripcion}
              </div>
            </div>
            <div className="bg-slate-900/80 px-3.5 py-1.5 rounded border border-slate-700 text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Precio Unitario Calculado</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {formatCurrency(calc.precioUnitario)}
              </span>
            </div>
          </div>

          {/* Code, Unit, Quantity, Rendimiento Grid with Interactive Steppers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs border border-slate-300 rounded mt-3 divide-x divide-slate-200 bg-slate-50">
            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-slate-500 font-medium">Código</div>
              <div className="font-mono font-bold text-slate-900 mt-1 text-sm">{String(selectedItem.id).padStart(3, '0')}</div>
            </div>

            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-slate-500 font-medium mb-1">Unidad</div>
              {onUpdateUnidad ? (
                <input
                  type="text"
                  value={selectedItem.unidad}
                  onChange={(e) => onUpdateUnidad(selectedItem.id, e.target.value.toUpperCase())}
                  onClick={(e) => e.currentTarget.select()}
                  list="unidades-datalist"
                  className="w-20 px-2 py-0.5 text-center font-mono font-bold text-slate-900 text-sm bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase transition-all shadow-2xs"
                  title="Haz clic para modificar la unidad de esta partida"
                />
              ) : (
                <div className="font-mono font-bold text-slate-900 mt-1 text-sm">{selectedItem.unidad}</div>
              )}
            </div>

            <div className="p-2 flex flex-col items-center justify-center">
              <div className="text-slate-500 font-medium mb-1">Cómputo Total ({selectedItem.unidad})</div>
              {onUpdateQuantity ? (
                <NumberStepper
                  value={selectedItem.cantidad}
                  onChange={(q) => onUpdateQuantity(selectedItem.id, q)}
                  step={selectedItem.cantidad >= 10 ? 5 : 1}
                  min={0.01}
                  inputWidth="w-20"
                  title="Modificar cantidad de cómputo métrico oficial con botones [+] y [-]"
                />
              ) : (
                <div className="font-mono font-bold text-slate-900">{formatNumber(selectedItem.cantidad, 2)}</div>
              )}
            </div>

            <div className="p-2 flex flex-col items-center justify-center bg-blue-50/50">
              <div className="text-blue-900 font-medium mb-1">Rendimiento ({selectedItem.apu.unidadRendimiento})</div>
              {onUpdateItemApu ? (
                <NumberStepper
                  value={selectedItem.apu.rendimiento}
                  onChange={handleUpdateRendimiento}
                  step={selectedItem.apu.rendimiento >= 10 ? 5 : 1}
                  min={0.01}
                  inputWidth="w-24"
                  title="Haz clic para seleccionar todo y escribir el rendimiento diario, o usa los botones [+] y [-]"
                />
              ) : (
                <div className="font-mono font-bold text-blue-900">{formatNumber(selectedItem.apu.rendimiento, 2)}</div>
              )}
            </div>
          </div>
        </div>

        {/* 1.- MATERIALES */}
        <div className="mb-5">
          <div className="bg-slate-200/90 px-3 py-1.5 text-xs font-bold text-slate-900 tracking-wider flex justify-between items-center rounded-t border-t border-x border-slate-300">
            <div className="flex items-center gap-2">
              <span>1.- MATERIALES</span>
              <span className="text-[11px] font-normal text-slate-600">(Operación: Cantidad × Costo × [1 + Desp%])</span>
            </div>
            {onUpdateItemApu && (
              <button
                type="button"
                onClick={handleAddMaterial}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-blue-900 bg-white hover:bg-blue-100 rounded border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                title="Agregar nuevo material a este APU"
              >
                <Plus className="w-3 h-3 text-blue-700" />
                <span>Agregar Material</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold text-[11px]">
                  <th className="py-2 px-2 text-left w-20">Código</th>
                  <th className="py-2 px-2 text-left min-w-[200px]">Descripción</th>
                  <th className="py-2 px-2 text-center w-14">Unidad</th>
                  <th className="py-2 px-2 text-center w-36">Cantidad</th>
                  <th className="py-2 px-2 text-center w-32">% Desp.</th>
                  <th className="py-2 px-2 text-center w-40">Costo ($)</th>
                  <th className="py-2 px-2 text-right w-28 font-bold">Total ($)</th>
                  {onUpdateItemApu && <th className="py-2 px-2 text-center w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedItem.apu.materiales.length === 0 ? (
                  <tr>
                    <td colSpan={onUpdateItemApu ? 8 : 7} className="py-3 px-3 text-center text-slate-400 italic bg-slate-50/50">
                      Esta partida no requiere insumos o materiales directos.
                    </td>
                  </tr>
                ) : (
                  selectedItem.apu.materiales.map((mat, idx) => {
                    const waste = 1 + (mat.desperdicioPorc || 0) / 100;
                    const lineTotal = mat.cantidad * mat.costoUnitario * waste;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-2 font-mono text-slate-600 font-semibold">{mat.codigo}</td>
                        <td className="py-1.5 px-2 text-slate-900 font-medium">
                          {mat.descripcion}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-600">{mat.unidad}</td>

                        {/* Cantidad Stepper */}
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={mat.cantidad}
                              onChange={(val) => handleUpdateMaterial(idx, 'cantidad', val)}
                              step={mat.cantidad < 1 ? 0.05 : mat.cantidad < 10 ? 0.5 : 1}
                              min={0}
                              inputWidth="w-16"
                              title={`Cambiar cantidad de ${mat.descripcion}`}
                            />
                          ) : (
                            <span className="font-mono">{formatNumber(mat.cantidad, 4)}</span>
                          )}
                        </td>

                        {/* % Desperdicio Stepper */}
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={mat.desperdicioPorc || 0}
                              onChange={(val) => handleUpdateMaterial(idx, 'desperdicioPorc', val)}
                              step={1}
                              min={0}
                              max={100}
                              suffix="%"
                              inputWidth="w-12"
                              title={`Cambiar % desperdicio de ${mat.descripcion}`}
                            />
                          ) : (
                            <span className="font-mono">{mat.desperdicioPorc > 0 ? `${mat.desperdicioPorc}%` : '-'}</span>
                          )}
                        </td>

                        {/* Costo Unitario Stepper */}
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={mat.costoUnitario}
                              onChange={(val) => handleUpdateMaterial(idx, 'costoUnitario', val)}
                              step={mat.costoUnitario < 5 ? 0.25 : 1}
                              min={0}
                              prefix="$"
                              inputWidth="w-20"
                              title={`Cambiar costo unitario de ${mat.descripcion}`}
                            />
                          ) : (
                            <span className="font-mono">{formatCurrency(mat.costoUnitario)}</span>
                          )}
                        </td>

                        {/* Line Total with calculation feedback */}
                        <td className="py-1.5 px-2 text-right">
                          <span
                            className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block text-right shadow-2xs"
                            title={`Operación calculada: ${mat.cantidad} × $${mat.costoUnitario} × (1 + ${(mat.desperdicioPorc || 0)}%) = $${lineTotal.toFixed(2)}`}
                          >
                            {formatCurrency(lineTotal)}
                          </span>
                        </td>

                        {/* Action buttons */}
                        {onUpdateItemApu && (
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(idx)}
                              className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Eliminar este material del APU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/70 border-t border-slate-300 font-semibold text-slate-800">
                  <td colSpan={6} className="py-1.5 px-3 text-right">Total Materiales ($):</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(calc.totalMateriales)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={6} className="py-1.5 px-3 text-right">Unitario de Materiales ($):</td>
                  <td className="py-1.5 px-2 text-right font-mono text-blue-900">{formatCurrency(calc.unitarioMateriales)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 2.- EQUIPOS */}
        <div className="mb-5">
          <div className="bg-slate-200/90 px-3 py-1.5 text-xs font-bold text-slate-900 tracking-wider flex justify-between items-center rounded-t border-t border-x border-slate-300">
            <div className="flex items-center gap-2">
              <span>2.- EQUIPOS Y MAQUINARIAS</span>
              <span className="text-[11px] font-normal text-slate-600">(Operación: Cantidad × Tarifa × Dep/Alq ÷ Rendimiento [{selectedItem.apu.rendimiento} {selectedItem.apu.unidadRendimiento}])</span>
            </div>
            {onUpdateItemApu && (
              <button
                type="button"
                onClick={handleAddEquipo}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-blue-900 bg-white hover:bg-blue-100 rounded border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                title="Agregar nuevo equipo al APU"
              >
                <Plus className="w-3 h-3 text-blue-700" />
                <span>Agregar Equipo</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold text-[11px]">
                  <th className="py-2 px-2 text-left w-20">Código</th>
                  <th className="py-2 px-2 text-left min-w-[200px]">Descripción</th>
                  <th className="py-2 px-2 text-center w-36">Cantidad</th>
                  <th className="py-2 px-2 text-center w-40">Costo Equipo ($)</th>
                  <th className="py-2 px-2 text-center w-36">Dep. o Alq.</th>
                  <th className="py-2 px-2 text-right w-28 font-bold">Total Diario ($)</th>
                  {onUpdateItemApu && <th className="py-2 px-2 text-center w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedItem.apu.equipos.length === 0 ? (
                  <tr>
                    <td colSpan={onUpdateItemApu ? 7 : 6} className="py-3 px-3 text-center text-slate-400 italic bg-slate-50/50">
                      Herramientas menores incluidas en costos indirectos.
                    </td>
                  </tr>
                ) : (
                  selectedItem.apu.equipos.map((eq, idx) => {
                    const lineTotal = eq.cantidad * eq.costo * (eq.depreciacionOAlquiler || 1);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-1.5 px-2 font-mono text-slate-600 font-semibold">{eq.codigo}</td>
                        <td className="py-1.5 px-2 text-slate-900 font-medium">{eq.descripcion}</td>

                        {/* Cantidad Stepper */}
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={eq.cantidad}
                              onChange={(val) => handleUpdateEquipo(idx, 'cantidad', val)}
                              step={1}
                              min={0}
                              inputWidth="w-14"
                              title={`Cambiar cantidad de ${eq.descripcion}`}
                            />
                          ) : (
                            <span className="font-mono">{formatNumber(eq.cantidad, 2)}</span>
                          )}
                        </td>

                        {/* Costo Diario Stepper */}
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={eq.costo}
                              onChange={(val) => handleUpdateEquipo(idx, 'costo', val)}
                              step={eq.costo < 10 ? 1 : 5}
                              min={0}
                              prefix="$"
                              inputWidth="w-20"
                              title={`Cambiar costo de ${eq.descripcion}`}
                            />
                          ) : (
                            <span className="font-mono">{formatCurrency(eq.costo)}</span>
                          )}
                        </td>

                        {/* Depreciación o Alquiler Stepper */}
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={eq.depreciacionOAlquiler || 1}
                              onChange={(val) => handleUpdateEquipo(idx, 'depreciacionOAlquiler', val)}
                              step={0.01}
                              min={0}
                              max={1}
                              inputWidth="w-16"
                              title={`Cambiar factor de depreciación/alquiler`}
                            />
                          ) : (
                            <span className="font-mono">{formatNumber(eq.depreciacionOAlquiler, 4)}</span>
                          )}
                        </td>

                        {/* Total Diario */}
                        <td className="py-1.5 px-2 text-right">
                          <span
                            className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block text-right shadow-2xs"
                            title={`Operación calculada: ${eq.cantidad} × $${eq.costo} × ${eq.depreciacionOAlquiler || 1} = $${lineTotal.toFixed(2)}`}
                          >
                            {formatCurrency(lineTotal)}
                          </span>
                        </td>

                        {/* Action buttons */}
                        {onUpdateItemApu && (
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveEquipo(idx)}
                              className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Eliminar este equipo del APU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/70 border-t border-slate-300 font-semibold text-slate-800">
                  <td colSpan={5} className="py-1.5 px-3 text-right">Total Equipos por Día ($):</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(calc.totalEquipos)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={5} className="py-1.5 px-3 text-right">
                    Unitario de Equipos (÷ Rend. {selectedItem.apu.rendimiento}) ($):
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-blue-900">{formatCurrency(calc.unitarioEquipos)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 3.- MANO DE OBRA DIRECTA (LOTTT & FCAS 1200%) */}
        <div className="mb-5">
          <div className="bg-slate-200/90 px-3 py-1.5 text-xs font-bold text-slate-900 tracking-wider flex justify-between items-center rounded-t border-t border-x border-slate-300">
            <div className="flex items-center gap-2">
              <span>3.- MANO DE OBRA DIRECTA (RÉGIMEN LOTTT & TABULADOR PETROLERO)</span>
              <span className="text-[11px] font-semibold text-red-800">FCAS Legal: {fcasPorc}%</span>
            </div>
            {onUpdateItemApu && (
              <button
                type="button"
                onClick={handleAddManoDeObra}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-blue-900 bg-white hover:bg-blue-100 rounded border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                title="Agregar nuevo oficio de mano de obra"
              >
                <Plus className="w-3 h-3 text-blue-700" />
                <span>Agregar Mano de Obra</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-semibold text-[11px]">
                  <th className="py-2 px-2 text-left w-20">Código</th>
                  <th className="py-2 px-2 text-left min-w-[200px]">Descripción del Oficio</th>
                  <th className="py-2 px-2 text-center w-36">Personal (Cant.)</th>
                  <th className="py-2 px-2 text-center w-40">Salario Diario ($)</th>
                  <th className="py-2 px-2 text-right w-28 font-bold">Total Salario ($)</th>
                  {onUpdateItemApu && <th className="py-2 px-2 text-center w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedItem.apu.manoDeObra.length === 0 ? (
                  <tr>
                    <td colSpan={onUpdateItemApu ? 6 : 5} className="py-3 px-3 text-center text-slate-400 italic bg-slate-50/50">
                      Esta partida de alquiler no requiere cuadrilla de mano de obra directa en el APU.
                    </td>
                  </tr>
                ) : (
                  selectedItem.apu.manoDeObra.map((mo, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-1.5 px-2 font-mono text-slate-600 font-semibold">{mo.codigo}</td>
                    <td className="py-1.5 px-2 text-slate-900 font-medium">{mo.descripcion}</td>

                    {/* Cantidad Stepper */}
                    <td className="py-1.5 px-2 text-center">
                      {onUpdateItemApu ? (
                        <NumberStepper
                          value={mo.cantidad}
                          onChange={(val) => handleUpdateManoDeObra(idx, 'cantidad', val)}
                          step={mo.cantidad < 1 ? 0.2 : 1}
                          min={0}
                          inputWidth="w-14"
                          title={`Cambiar cuadrilla de ${mo.descripcion}`}
                        />
                      ) : (
                        <span className="font-mono">{formatNumber(mo.cantidad, 2)}</span>
                      )}
                    </td>

                    {/* Salario Diario Stepper */}
                    <td className="py-1.5 px-2 text-center">
                      {onUpdateItemApu ? (
                        <NumberStepper
                          value={mo.salarioDiario}
                          onChange={(val) => handleUpdateManoDeObra(idx, 'salarioDiario', val)}
                          step={0.25}
                          min={0}
                          prefix="$"
                          inputWidth="w-20"
                          title={`Cambiar salario de ${mo.descripcion}`}
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(mo.salarioDiario)}</span>
                      )}
                    </td>

                    {/* Total Salario Line */}
                    <td className="py-1.5 px-2 text-right">
                      <span
                        className="font-mono font-bold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block text-right shadow-2xs"
                        title={`Operación calculada: ${mo.cantidad} obreros × $${mo.salarioDiario} = $${mo.total.toFixed(2)}`}
                      >
                        {formatCurrency(mo.total)}
                      </span>
                    </td>

                    {/* Action buttons */}
                    {onUpdateItemApu && (
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveManoDeObra(idx)}
                          className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Eliminar este oficio del APU"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                )))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/70 border-t border-slate-300 font-medium text-slate-800">
                  <td colSpan={4} className="py-1.5 px-3 text-right">Total Mano de Obra Directa Diaria ($):</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(calc.manoObraDirectaTotal)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
                <tr className="bg-amber-50/70 text-amber-900 font-semibold border-t border-amber-200">
                  <td colSpan={4} className="py-1.5 px-3 text-right">
                    Prestaciones Sociales Directas (FCAS {fcasPorc}% s/ Mano de Obra Directa):
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-950">{formatCurrency(calc.fcasMonto)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td colSpan={4} className="py-1.5 px-3 text-right">Total Mano de Obra Plena por Día ($):</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-900">{formatCurrency(calc.totalManoObra)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
                <tr className="bg-slate-200 font-bold text-slate-900">
                  <td colSpan={4} className="py-1.5 px-3 text-right">
                    Unitario Mano de Obra (÷ Rend. {selectedItem.apu.rendimiento}) ($):
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-blue-900">{formatCurrency(calc.unitarioManoObra)}</td>
                  {onUpdateItemApu && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Resumen Final de Costos del APU */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs shadow-2xs">
          <div className="max-w-md ml-auto space-y-1.5">
            <div className="flex justify-between items-center py-1 border-b border-slate-200 text-slate-700">
              <span className="font-semibold">Costo Directo por Unidad (Mat + Eq + MO):</span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(calc.costoDirectoUnitario)}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-slate-600">
              <span>{adminPorc}% Administración y Gastos Generales:</span>
              <span className="font-mono font-medium text-slate-800">{formatCurrency(calc.adminMonto)}</span>
            </div>
            <div className="flex justify-between items-center py-1 font-semibold text-slate-800 border-t border-slate-200">
              <span>Sub-Total Unitario:</span>
              <span className="font-mono text-slate-900">{formatCurrency(calc.subTotalUnitario)}</span>
            </div>
            <div className="flex justify-between items-center py-1 text-slate-600">
              <span>{utilidadPorc}% Utilidad e Imprevistos:</span>
              <span className="font-mono font-medium text-slate-800">{formatCurrency(calc.utilidadMonto)}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-3.5 bg-slate-900 text-white rounded-lg font-bold text-sm tracking-tight mt-2 shadow-xs">
              <span className="uppercase text-slate-200">PRECIO UNITARIO ($):</span>
              <span className="font-mono text-emerald-400 text-base">{formatCurrency(calc.precioUnitario)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 px-2 bg-emerald-50 text-emerald-950 rounded border border-emerald-200 text-xs font-semibold mt-1">
              <span>Monto Total Partida ({formatNumber(selectedItem.cantidad, 2)} {selectedItem.unidad}):</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(calc.totalPartida)}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
          <span>USO EXCLUSIVO DE ESTIMACIÓN DE COSTOS · PDVSA FLOTA PESADA EL TOREÑO · DIVISIÓN BARINAS</span>
          <span>Calculado bajo la LOTT y Tabulador CCP · Fórmulas Activas en Tiempo Real</span>
        </div>
      </div>
    </div>
  );
};
