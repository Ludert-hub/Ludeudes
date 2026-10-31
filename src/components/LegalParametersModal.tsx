import React from 'react';
import { PROJECT_INFO } from '../data/projectInfo';
import { X, RotateCcw, ShieldCheck, Scale, CheckCircle2, Info } from 'lucide-react';

interface LegalParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  fcasPorc: number;
  setFcasPorc: (val: number) => void;
  adminPorc: number;
  setAdminPorc: (val: number) => void;
  utilidadPorc: number;
  setUtilidadPorc: (val: number) => void;
  ivaPorc: number;
  setIvaPorc: (val: number) => void;
  onReset: () => void;
}

export const LegalParametersModal: React.FC<LegalParametersModalProps> = ({
  isOpen,
  onClose,
  fcasPorc,
  setFcasPorc,
  adminPorc,
  setAdminPorc,
  utilidadPorc,
  setUtilidadPorc,
  ivaPorc,
  setIvaPorc,
  onReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center text-white">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Parámetros Financieros & Marco Legal LOTT
              </h3>
              <p className="text-xs text-slate-300">
                Ajuste de factores de Mano de Obra, Administración y Utilidad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-700">
          {/* Official Framework Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-blue-900 space-y-1">
              <div className="font-semibold text-xs">Parámetros Oficiales del Proyecto (SOLPED {PROJECT_INFO.solped})</div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                Estos valores reflejan los criterios contractuales vinculantes para la obra "{PROJECT_INFO.descripcionLarga}", según el tabulador petrolero vigente y la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT).
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* 1. FCAS */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Factor de Costos Asociados al Salario (FCAS)
                </label>
                <span className="font-mono font-bold text-sm text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {fcasPorc}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aplica sobre la mano de obra directa (Salario Básico CCP). Cubre prestaciones sociales, descansos semanales, vacaciones, utilidades, dotaciones y seguro de accidentes.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0"
                  max="2000"
                  step="25"
                  value={fcasPorc}
                  onChange={(e) => setFcasPorc(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="10"
                  value={fcasPorc}
                  onChange={(e) => setFcasPorc(Number(e.target.value))}
                  className="w-20 text-center font-mono font-bold border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
            </div>

            {/* 2. Administración */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900">
                  Gastos Administrativos y Generales de Obra
                </label>
                <span className="font-mono font-bold text-sm text-amber-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {adminPorc.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aplica como porcentaje sobre el Costo Directo Total (Materiales + Equipos + Mano de Obra con FCAS).
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="0.5"
                  value={adminPorc}
                  onChange={(e) => setAdminPorc(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={adminPorc}
                  onChange={(e) => setAdminPorc(Number(e.target.value))}
                  className="w-20 text-center font-mono font-bold border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
            </div>

            {/* 3. Utilidad */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900">
                  Utilidad e Imprevistos del Contratista
                </label>
                <span className="font-mono font-bold text-sm text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {utilidadPorc.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aplica sobre la suma del Costo Directo + Gastos Administrativos (Subtotal de Costos).
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="0.5"
                  value={utilidadPorc}
                  onChange={(e) => setUtilidadPorc(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={utilidadPorc}
                  onChange={(e) => setUtilidadPorc(Number(e.target.value))}
                  className="w-20 text-center font-mono font-bold border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
            </div>

            {/* 4. IVA */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900">
                  Impuesto al Valor Agregado (IVA)
                </label>
                <span className="font-mono font-bold text-sm text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {ivaPorc.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Aplica sobre el Sub-Total del Presupuesto (Costo Directo + Administración + Utilidad).
              </p>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={ivaPorc}
                  onChange={(e) => setIvaPorc(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={ivaPorc}
                  onChange={(e) => setIvaPorc(Number(e.target.value))}
                  className="w-20 text-center font-mono font-bold border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="font-bold text-slate-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer a Valores Fijos (FCAS 500%, Admin 12.5%, Util 17%)
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
