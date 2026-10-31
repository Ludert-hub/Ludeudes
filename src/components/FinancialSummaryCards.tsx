import React from 'react';
import { FinancialSummary } from '../types/costTypes';
import { formatCurrency } from '../utils/apuCalculations';
import { DollarSign, Users, Package, Truck, Layers, PieChart } from 'lucide-react';

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc: number;
}

export const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({
  summary,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  ivaPorc,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 my-5">
      {/* 1. Gran Total Presupuesto */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:col-span-2 lg:col-span-2 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Presupuesto Total (con IVA {ivaPorc}%)</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatCurrency(summary.granTotalGeneral)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Sub-Total: <strong className="font-mono text-slate-200">{formatCurrency(summary.subTotalGeneral)}</strong></span>
            <span>·</span>
            <span>IVA {ivaPorc}%: <strong className="font-mono text-slate-200">{formatCurrency(summary.totalIva)}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Mano de Obra LOTTT + FCAS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mano de Obra (LOTT)</span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(summary.totalManoObraPlena)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            FCAS {fcasPorc}%: <span className="font-mono">{formatCurrency(summary.totalFcas)}</span>
          </div>
        </div>
      </div>

      {/* 3. Materiales Directos */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Materiales</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(summary.totalMateriales)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Costo directo de insumos
          </div>
        </div>
      </div>

      {/* 4. Equipos y Maquinarias */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Equipos</span>
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(summary.totalEquipos)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Depreciación & Alquiler
          </div>
        </div>
      </div>

      {/* 5. Indirectos: Admin + Utilidad */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admin & Utilidad</span>
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <PieChart className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatCurrency(summary.totalGastosAdmin + summary.totalUtilidad)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Adm {adminPorc}% + Util {utilidadPorc}%
          </div>
        </div>
      </div>
    </div>
  );
};
