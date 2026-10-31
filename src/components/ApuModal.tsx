import React, { useState } from 'react';
import { PartidaItem, ApuDetail, MaterialItem, EquipmentItem, LaborItem } from '../types/costTypes';
import { calculateItemApu, formatCurrency, formatNumber } from '../utils/apuCalculations';
import { exportSingleApuToPdf } from '../utils/pdfExport';
import { NumberStepper } from './NumberStepper';
import { X, ExternalLink, FileText, RotateCcw, Sparkles, FileDown, Save, Zap } from 'lucide-react';

interface ApuModalProps {
  item: PartidaItem | null;
  onClose: () => void;
  onOpenFullApu: (item: PartidaItem) => void;
  onOpenSpec: (item: PartidaItem) => void;
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

export const ApuModal: React.FC<ApuModalProps> = ({
  item,
  onClose,
  onOpenFullApu,
  onOpenSpec,
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
  const [globalSyncEnabled, setGlobalSyncEnabled] = useState<boolean>(true);

  if (!item) return null;

  const calc = calculateItemApu(item, fcasPorc, adminPorc, utilidadPorc);

  // Update handlers
  const handleUpdateMaterial = (index: number, field: keyof MaterialItem, val: number) => {
    const newMaterials = [...item.apu.materiales];
    const current = newMaterials[index];
    if (!current) return;

    if (
      globalSyncEnabled &&
      onPropagateMaterial &&
      (field === 'costoUnitario' || field === 'desperdicioPorc')
    ) {
      onPropagateMaterial(current.descripcion, { [field]: val });
      return;
    }

    if (!onUpdateItemApu) return;
    const updated = { ...current, [field]: val };
    const waste = 1 + (updated.desperdicioPorc || 0) / 100;
    updated.total = updated.cantidad * updated.costoUnitario * waste;
    newMaterials[index] = updated;
    onUpdateItemApu(item.id, {
      ...item.apu,
      materiales: newMaterials,
    });
  };

  const handleUpdateEquipo = (index: number, field: keyof EquipmentItem, val: number) => {
    const newEquipos = [...item.apu.equipos];
    const current = newEquipos[index];
    if (!current) return;

    if (
      globalSyncEnabled &&
      onPropagateEquipment &&
      (field === 'costo' || field === 'depreciacionOAlquiler')
    ) {
      onPropagateEquipment(current.descripcion, { [field]: val });
      return;
    }

    if (!onUpdateItemApu) return;
    const updated = { ...current, [field]: val };
    updated.total = updated.cantidad * updated.costo * (updated.depreciacionOAlquiler || 1);
    newEquipos[index] = updated;
    onUpdateItemApu(item.id, {
      ...item.apu,
      equipos: newEquipos,
    });
  };

  const handleUpdateManoDeObra = (index: number, field: keyof LaborItem, val: number) => {
    const newMo = [...item.apu.manoDeObra];
    const current = newMo[index];
    if (!current) return;

    if (globalSyncEnabled && onPropagateLabor && field === 'salarioDiario') {
      onPropagateLabor(current.descripcion, { salarioDiario: val });
      return;
    }

    if (!onUpdateItemApu) return;
    const updated = { ...current, [field]: val };
    updated.total = updated.cantidad * updated.salarioDiario;
    newMo[index] = updated;
    onUpdateItemApu(item.id, {
      ...item.apu,
      manoDeObra: newMo,
    });
  };

  const handleUpdateRendimiento = (newRend: number) => {
    if (!onUpdateItemApu) return;
    onUpdateItemApu(item.id, {
      ...item.apu,
      rendimiento: Math.max(0.01, newRend),
    });
  };

  const handleDownloadPdf = () => {
    exportSingleApuToPdf(item, fcasPorc, adminPorc, utilidadPorc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono font-bold text-xs bg-red-600 px-2.5 py-1 rounded text-white shrink-0">
              Partida {item.id}
            </span>
            <div className="min-w-0">
              <h3
                className="text-sm font-bold text-white tracking-tight truncate"
                title={`Partida ${item.id}: Código ${String(item.id).padStart(3, '0')} - ${item.descripcion}`}
              >
                Partida {item.id}: Código {String(item.id).padStart(3, '0')} - {item.descripcion}
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">
                Código: <strong className="text-amber-400 font-bold">{String(item.id).padStart(3, '0')}</strong> · {item.capitulo} · Rendimiento: {formatNumber(item.apu.rendimiento, 2)} {item.apu.unidadRendimiento}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSaveChanges && (
              <button
                onClick={onSaveChanges}
                className="text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Guardar todos los cambios realizados"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Guardar Cambios</span>
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              className="text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Descargar este Análisis de Precio Unitario en formato PDF Oficial (APU EJEMPLO.pdf)"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar APU (.pdf)</span>
            </button>
            {onResetApu && (
              <button
                onClick={() => onResetApu(item.id)}
                className="text-slate-300 hover:text-white px-2.5 py-1 rounded hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                title="Restablecer APU a valores oficiales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic simulator & global data-binding banner */}
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Data Binding Global:</strong> Al modificar precios unitarios o salarios en este APU, el cambio se propaga automáticamente a todas las partidas donde el insumo incida.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalSyncEnabled((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] border transition-colors cursor-pointer ${
              globalSyncEnabled
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>{globalSyncEnabled ? 'Propagación Global: ACTIVA' : 'Solo esta partida'}</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs text-slate-800">
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">Unidad</span>
              {onUpdateUnidad ? (
                <input
                  type="text"
                  value={item.unidad}
                  onChange={(e) => onUpdateUnidad(item.id, e.target.value.toUpperCase())}
                  onClick={(e) => e.currentTarget.select()}
                  list="unidades-datalist"
                  className="w-20 px-2 py-1 text-center font-mono font-bold text-slate-900 text-xs bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase transition-all shadow-2xs"
                  title="Haz clic para modificar la unidad de esta partida"
                />
              ) : (
                <span className="text-base font-mono font-bold text-slate-900">{item.unidad}</span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">Cantidad Medida</span>
              {onUpdateQuantity ? (
                <NumberStepper
                  value={item.cantidad}
                  onChange={(q) => onUpdateQuantity(item.id, q)}
                  step={item.cantidad >= 10 ? 5 : 1}
                  min={0.01}
                  inputWidth="w-20"
                />
              ) : (
                <span className="text-base font-mono font-bold text-slate-900">
                  {formatNumber(item.cantidad)} <span className="text-xs font-normal text-slate-500">{item.unidad}</span>
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">Rendimiento Diario</span>
              {onUpdateItemApu ? (
                <NumberStepper
                  value={item.apu.rendimiento}
                  onChange={handleUpdateRendimiento}
                  step={item.apu.rendimiento >= 10 ? 5 : 1}
                  min={0.01}
                  inputWidth="w-24"
                  title="Haz clic para seleccionar todo y escribir el rendimiento diario, o usa los botones [+] y [-]"
                />
              ) : (
                <span className="text-base font-mono font-bold text-slate-900">
                  {formatNumber(item.apu.rendimiento, 2)}
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Precio Unitario ($)</span>
              <span className="text-lg font-mono font-bold text-blue-700">
                {formatCurrency(calc.precioUnitario)}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Total Partida ($)</span>
              <span className="text-lg font-mono font-bold text-emerald-700">
                {formatCurrency(calc.totalPartida)}
              </span>
            </div>
          </div>

          {/* 1. Materiales */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3.5 py-1.5 font-bold text-slate-700 text-xs flex justify-between items-center">
              <span>1. MATERIALES (Cantidad × Costo × [1 + Desp%])</span>
              <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                Unitario: {formatCurrency(calc.unitarioMateriales)} $/und
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2.5 w-20">Código</th>
                    <th className="py-1.5 px-3">Descripción</th>
                    <th className="py-1.5 px-2 text-center w-14">Unidad</th>
                    <th className="py-1.5 px-2 text-center w-36">Cantidad</th>
                    <th className="py-1.5 px-2 text-center w-32">% Desp.</th>
                    <th className="py-1.5 px-2 text-center w-36">Costo ($)</th>
                    <th className="py-1.5 px-3 text-right w-28">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.apu.materiales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-2.5 px-3 text-center text-slate-400 italic">
                        No aplica materiales directos para esta partida.
                      </td>
                    </tr>
                  ) : (
                    item.apu.materiales.map((m, idx) => {
                      const waste = 1 + (m.desperdicioPorc || 0) / 100;
                      const lineTotal = m.cantidad * m.costoUnitario * waste;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono text-slate-500 font-semibold">{m.codigo}</td>
                          <td className="py-1.5 px-3 text-slate-800 font-medium">{m.descripcion}</td>
                          <td className="py-1.5 px-2 text-center font-mono text-slate-500">{m.unidad}</td>
                          <td className="py-1.5 px-2 text-center">
                            {onUpdateItemApu ? (
                              <NumberStepper
                                value={m.cantidad}
                                onChange={(val) => handleUpdateMaterial(idx, 'cantidad', val)}
                                step={m.cantidad < 1 ? 0.05 : 1}
                                min={0}
                                inputWidth="w-16"
                              />
                            ) : (
                              <span className="font-mono">{formatNumber(m.cantidad, 4)}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {onUpdateItemApu ? (
                              <NumberStepper
                                value={m.desperdicioPorc || 0}
                                onChange={(val) => handleUpdateMaterial(idx, 'desperdicioPorc', val)}
                                step={1}
                                min={0}
                                max={100}
                                suffix="%"
                                inputWidth="w-12"
                              />
                            ) : (
                              <span className="font-mono">{m.desperdicioPorc > 0 ? `${m.desperdicioPorc}%` : '-'}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {onUpdateItemApu ? (
                              <NumberStepper
                                value={m.costoUnitario}
                                onChange={(val) => handleUpdateMaterial(idx, 'costoUnitario', val)}
                                step={m.costoUnitario < 5 ? 0.25 : 1}
                                min={0}
                                prefix="$"
                                inputWidth="w-20"
                              />
                            ) : (
                              <span className="font-mono">{formatCurrency(m.costoUnitario)}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <span
                              className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block text-right shadow-2xs"
                              title={`Operación: ${m.cantidad} × $${m.costoUnitario} × (1 + ${(m.desperdicioPorc || 0)}%) = $${lineTotal.toFixed(2)}`}
                            >
                              {formatCurrency(lineTotal)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Equipos y Herramientas */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3.5 py-1.5 font-bold text-slate-700 text-xs flex justify-between items-center">
              <span>2. EQUIPOS Y HERRAMIENTAS (Cant. × Costo × Dep. o Alq.)</span>
              <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                Unitario: {formatCurrency(calc.unitarioEquipos)} $/und
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2.5 w-20">Código</th>
                    <th className="py-1.5 px-3">Descripción de Equipo / Herramientas</th>
                    <th className="py-1.5 px-2 text-center w-28">Cantidad</th>
                    <th className="py-1.5 px-2 text-center w-32">Costo ($)</th>
                    <th className="py-1.5 px-2 text-center w-32">Dep. o Alq.</th>
                    <th className="py-1.5 px-3 text-right w-28">Total Diario ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.apu.equipos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 text-center text-slate-400 italic">
                        Sin equipos asignados directamente.
                      </td>
                    </tr>
                  ) : (
                    item.apu.equipos.map((e, idx) => {
                      const dep = e.depreciacionOAlquiler || 1;
                      const lineTotal = e.cantidad * e.costo * dep;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono text-slate-500 font-semibold">{e.codigo}</td>
                          <td className="py-1.5 px-3 text-slate-800 font-medium">{e.descripcion}</td>
                          <td className="py-1.5 px-2 text-center">
                            {onUpdateItemApu ? (
                              <NumberStepper
                                value={e.cantidad}
                                onChange={(val) => handleUpdateEquipo(idx, 'cantidad', val)}
                                step={1}
                                min={0}
                                inputWidth="w-14"
                              />
                            ) : (
                              <span className="font-mono">{e.cantidad}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {onUpdateItemApu ? (
                              <NumberStepper
                                value={e.costo}
                                onChange={(val) => handleUpdateEquipo(idx, 'costo', val)}
                                step={e.costo < 20 ? 1 : 5}
                                min={0}
                                prefix="$"
                                inputWidth="w-20"
                              />
                            ) : (
                              <span className="font-mono">{formatCurrency(e.costo)}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {onUpdateItemApu ? (
                              <NumberStepper
                                value={dep}
                                onChange={(val) => handleUpdateEquipo(idx, 'depreciacionOAlquiler', val)}
                                step={0.005}
                                min={0.001}
                                max={1}
                                inputWidth="w-16"
                              />
                            ) : (
                              <span className="font-mono">{formatNumber(dep, 4)}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block text-right shadow-2xs">
                              {formatCurrency(lineTotal)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Mano de Obra */}
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-3.5 py-1.5 font-bold text-slate-700 text-xs flex justify-between items-center">
              <span>3. MANO DE OBRA DIRECTA (CCP + FCAS {fcasPorc}%)</span>
              <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                Unitario Pleno: {formatCurrency(calc.unitarioManoObra)} $/und
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2.5 w-20">Código</th>
                    <th className="py-1.5 px-3">Cuadrilla / Cargo</th>
                    <th className="py-1.5 px-2 text-center w-36">Personal (Cant.)</th>
                    <th className="py-1.5 px-2 text-center w-36">Jornal Básico ($)</th>
                    <th className="py-1.5 px-3 text-right w-28">Total Día Básico ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.apu.manoDeObra.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-center text-slate-400 italic">
                        Esta partida de alquiler no requiere mano de obra directa en el APU.
                      </td>
                    </tr>
                  ) : (
                    item.apu.manoDeObra.map((mo, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 font-mono text-slate-500 font-semibold">{mo.codigo}</td>
                        <td className="py-1.5 px-3 text-slate-800 font-medium">{mo.descripcion}</td>
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={mo.cantidad}
                              onChange={(val) => handleUpdateManoDeObra(idx, 'cantidad', val)}
                              step={mo.cantidad < 1 ? 0.2 : 1}
                              min={0}
                              inputWidth="w-14"
                            />
                          ) : (
                            <span className="font-mono">{mo.cantidad}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          {onUpdateItemApu ? (
                            <NumberStepper
                              value={mo.salarioDiario}
                              onChange={(val) => handleUpdateManoDeObra(idx, 'salarioDiario', val)}
                              step={0.25}
                              min={0}
                              prefix="$"
                              inputWidth="w-20"
                            />
                          ) : (
                            <span className="font-mono">{formatCurrency(mo.salarioDiario)}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <span className="font-mono font-bold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block text-right shadow-2xs">
                            {formatCurrency(mo.total)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 text-[11px] flex flex-wrap justify-between gap-2 text-slate-600 font-medium">
              <span>Mano Obra Básica: <strong>{formatCurrency(calc.manoObraDirectaTotal)}/día</strong></span>
              <span>+ FCAS ({fcasPorc}%): <strong>{formatCurrency(calc.fcasMonto)}/día</strong></span>
              <span className="text-slate-900 font-bold">Total Pleno: {formatCurrency(calc.totalManoObra)}/día</span>
            </div>
          </div>

          {/* Summary breakdown */}
          <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-300 text-xs flex flex-wrap items-center justify-between gap-3 font-mono shadow-2xs">
            <div>Costo Directo Unitario: <strong>{formatCurrency(calc.costoDirectoUnitario)}</strong></div>
            <div>+ Admin ({adminPorc}%): <strong>{formatCurrency(calc.adminMonto)}</strong></div>
            <div>+ Utilidad ({utilidadPorc}%): <strong>{formatCurrency(calc.utilidadMonto)}</strong></div>
            <div className="text-blue-900 font-bold text-sm bg-blue-100 px-3 py-1 rounded-md border border-blue-200 shadow-2xs">
              P.U. = {formatCurrency(calc.precioUnitario)} $/und
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenFullApu(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver en Libro de APU Completo
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenSpec(item);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Ver Especificación Técnica
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-red-600" />
              Exportar APU en PDF (.pdf)
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
