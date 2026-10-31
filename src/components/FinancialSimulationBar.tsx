import React from 'react';
import { Sliders, RotateCcw, Sparkles, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

interface FinancialSimulationBarProps {
  fcasPorc: number;
  setFcasPorc: (val: number) => void;
  adminPorc: number;
  setAdminPorc: (val: number) => void;
  utilidadPorc: number;
  setUtilidadPorc: (val: number) => void;
  ivaPorc: number;
  setIvaPorc: (val: number) => void;
  onResetParams: () => void;
  modifiedCount: number;
  onResetQuantities: () => void;
}

export const FinancialSimulationBar: React.FC<FinancialSimulationBarProps> = ({
  fcasPorc,
  setFcasPorc,
  adminPorc,
  setAdminPorc,
  utilidadPorc,
  setUtilidadPorc,
  ivaPorc,
  setIvaPorc,
  onResetParams,
  modifiedCount,
  onResetQuantities,
}) => {
  const isParamsModified = fcasPorc !== 500 || adminPorc !== 12.5 || utilidadPorc !== 17 || ivaPorc !== 16;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 my-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Simulación Financiera & Parámetros en Tiempo Real (LOTTT & PDVSA)
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Recálculo Instantáneo Activo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Modifique los factores y las cantidades de las partidas para observar el impacto financiero inmediato en APU, Mano de Obra y Presupuesto Total.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {modifiedCount > 0 && (
            <button
              onClick={onResetQuantities}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              title="Restablecer todas las cantidades a los cómputos oficiales"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              Restablecer Cantidades ({modifiedCount})
            </button>
          )}

          {isParamsModified && (
            <button
              onClick={onResetParams}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Restablecer a valores fijos (FCAS 500%, Admin 12.5%, Utilidad 17%, IVA 16%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Valores Fijos (500% / 12.5% / 17%)
            </button>
          )}
        </div>
      </div>

      {/* 4 Interactive Parameter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* 1. FCAS LOTTT */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">1. FCAS LOTTT & CCP</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="5000"
                step="25"
                value={fcasPorc}
                onChange={(e) => setFcasPorc(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-center font-mono font-bold text-xs text-blue-900 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              />
              <span className="font-bold text-slate-500">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="25"
            value={fcasPorc}
            onChange={(e) => setFcasPorc(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>0%</span>
            <span className="font-medium text-slate-700">Fijo: 500%</span>
            <span>Máx: 2000%</span>
          </div>
        </div>

        {/* 2. Administración */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">2. Gastos Administrativos</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={adminPorc}
                onChange={(e) => setAdminPorc(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-center font-mono font-bold text-xs text-amber-900 bg-white border border-slate-300 rounded focus:border-amber-500 focus:outline-none"
              />
              <span className="font-bold text-slate-500">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="0.5"
            value={adminPorc}
            onChange={(e) => setAdminPorc(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>0%</span>
            <span className="font-medium text-slate-700">Fijo: 12.5%</span>
            <span>30%</span>
          </div>
        </div>

        {/* 3. Utilidad */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">3. Utilidad e Imprevistos</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={utilidadPorc}
                onChange={(e) => setUtilidadPorc(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-center font-mono font-bold text-xs text-purple-900 bg-white border border-slate-300 rounded focus:border-purple-500 focus:outline-none"
              />
              <span className="font-bold text-slate-500">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={utilidadPorc}
            onChange={(e) => setUtilidadPorc(Number(e.target.value))}
            className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>0%</span>
            <span className="font-medium text-slate-700">Fijo: 17.0%</span>
            <span>50%</span>
          </div>
        </div>

        {/* 4. IVA */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">4. IVA (Impuesto de Ley)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="30"
                step="1"
                value={ivaPorc}
                onChange={(e) => setIvaPorc(Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-center font-mono font-bold text-xs text-emerald-900 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:outline-none"
              />
              <span className="font-bold text-slate-500">%</span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            step="1"
            value={ivaPorc}
            onChange={(e) => setIvaPorc(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>0% (Exento)</span>
            <span className="font-medium text-slate-700">Oficial: 16.0%</span>
            <span>25%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
