import React, { useState, useMemo } from 'react';
import { PartidaItem } from '../types/costTypes';
import { buildLulowinDatabase } from '../utils/lulowinNormalizer';
import { exportLulowinToExcel } from '../utils/lulowinExcelExport';
import { formatNumber, formatCurrency } from '../utils/apuCalculations';
import { NumberStepper } from './NumberStepper';
import {
  Database,
  Download,
  Printer,
  Search,
  Plus,
  Table,
  CheckCircle2,
  Edit2,
  RefreshCw,
  Layers,
  Wrench,
  Users,
  Boxes,
  Zap
} from 'lucide-react';

interface LulowinViewerProps {
  items: PartidaItem[];
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  onOpenAddPartida: () => void;
  onOpenPrint: (title: string, content: React.ReactNode) => void;
  onPropagateMaterial?: (
    targetKey: string,
    changes: { costoUnitario?: number; desperdicioPorc?: number }
  ) => void;
  onPropagateEquipment?: (
    targetKey: string,
    changes: { costo?: number; depreciacionOAlquiler?: number; costoDiario?: number }
  ) => void;
  onPropagateLabor?: (
    targetKey: string,
    changes: { salarioDiario?: number }
  ) => void;
  onOpenMaestroInsumos?: () => void;
}

type LulowinTableTab =
  | 'ObraApun'
  | 'ObraApinMate'
  | 'ObraApinEqui'
  | 'ObraApinMano'
  | 'ObraPart'
  | 'ObraMate'
  | 'ObraMano'
  | 'ObraEqui'
  | 'ObraPainMate'
  | 'ObraPainEqui'
  | 'ObraPainMano';

export const LulowinViewer: React.FC<LulowinViewerProps> = ({
  items,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  onOpenAddPartida,
  onOpenPrint,
  onPropagateMaterial,
  onPropagateEquipment,
  onPropagateLabor,
  onOpenMaestroInsumos,
}) => {
  const [activeTable, setActiveTable] = useState<LulowinTableTab>('ObraMate');
  const [obraCode, setObraCode] = useState<string>('ZXV');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Build the relational database tables live
  const db = useMemo(() => {
    return buildLulowinDatabase(items, obraCode, fcasPorc, adminPorc, utilidadPorc);
  }, [items, obraCode, fcasPorc, adminPorc, utilidadPorc]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportLulowinToExcel(items, obraCode, fcasPorc, adminPorc, utilidadPorc);
      setSuccessMsg(`Tablas LuloWin (${obraCode}) exportadas exitosamente en 11 hojas`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintTable = () => {
    onOpenPrint(
      `Tabla LuloWin: ${activeTable} (Obra: ${obraCode})`,
      <div className="space-y-4">
        <div className="border-b-2 border-slate-900 pb-2">
          <h2 className="text-base font-bold text-slate-900">LISTADO DE BASE DE DATOS LULOWIN / MAPREX</h2>
          <p className="text-xs text-slate-600">
            Tabla: <strong>{activeTable}</strong> · Código Obra: <strong>{obraCode}</strong> · Partidas Totales: {items.length}
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Nota: Los códigos poseen un máximo estricto de 6 caracteres y las descripciones de insumos un máximo de 54 caracteres.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Database className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Tablas Relacionales LuloWin / MAPREX (Access / Excel)
              </h2>
              {successMsg && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {successMsg}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Estructura estricta: Códigos ≤ 6 caracteres, descripciones de insumos ≤ 54 caracteres, deduplicación idéntica por insumo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Obra Code configuration */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
              <span className="font-semibold text-slate-600">CodObr:</span>
              <input
                type="text"
                maxLength={6}
                value={obraCode}
                onChange={(e) => setObraCode(e.target.value.toUpperCase())}
                className="w-14 font-mono font-bold uppercase text-slate-900 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                title="Código identificador de la obra en LuloWin (default: ZXV)"
              />
            </div>

            {/* Add Partida Button */}
            <button
              onClick={onOpenAddPartida}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anexar Nueva Partida</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className={`w-3.5 h-3.5 text-emerald-700 ${isExporting ? 'animate-spin' : ''}`} />
              <span>{isExporting ? 'Generando...' : 'Exportar Tablas LuloWin (.xlsx)'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrintTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Database Overview Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Partidas en Obra (ObraApun)</span>
            <span className="text-base font-mono font-bold text-slate-900">{db.obraApun.length}</span>
            <span className="text-[10px] text-slate-400 block">Correlativo 1 a {db.obraApun.length}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Materiales Únicos (ObraMate)</span>
            <span className="text-base font-mono font-bold text-emerald-700">{db.obraMate.length}</span>
            <span className="text-[10px] text-slate-400 block">Códigos únicos ≤ 6 car</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Equipos Únicos (ObraEqui)</span>
            <span className="text-base font-mono font-bold text-blue-700">{db.obraEqui.length}</span>
            <span className="text-[10px] text-slate-400 block">Maquinarias y herramientas</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Mano de Obra Única (ObraMano)</span>
            <span className="text-base font-mono font-bold text-amber-700">{db.obraMano.length}</span>
            <span className="text-[10px] text-slate-400 block">Tabulador CCP / LOTTT</span>
          </div>
        </div>
      </div>

      {/* Table Navigation Bottom/Top Tabs (Replicating exact Excel Sheet tabs from screenshots) */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="font-bold text-slate-700 px-2 py-1">Hojas de Obra:</span>
            {(
              [
                { id: 'ObraApun', label: 'ObraApun', count: db.obraApun.length, group: 'obra' },
                { id: 'ObraApinMate', label: 'ObraApinMate', count: db.obraApinMate.length, group: 'obra' },
                { id: 'ObraApinEqui', label: 'ObraApinEqui', count: db.obraApinEqui.length, group: 'obra' },
                { id: 'ObraApinMano', label: 'ObraApinMano', count: db.obraApinMano.length, group: 'obra' },
                { id: 'ObraPart', label: 'ObraPart', count: db.obraPart.length, group: 'master' },
                { id: 'ObraMate', label: 'ObraMate', count: db.obraMate.length, group: 'master' },
                { id: 'ObraMano', label: 'ObraMano', count: db.obraMano.length, group: 'master' },
                { id: 'ObraEqui', label: 'ObraEqui', count: db.obraEqui.length, group: 'master' },
                { id: 'ObraPainMate', label: 'ObraPainMate', count: db.obraPainMate.length, group: 'apu' },
                { id: 'ObraPainEqui', label: 'ObraPainEqui', count: db.obraPainEqui.length, group: 'apu' },
                { id: 'ObraPainMano', label: 'ObraPainMano', count: db.obraPainMano.length, group: 'apu' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTable(tab.id);
                  setSearchTerm('');
                }}
                className={`font-mono text-xs px-2.5 py-1 rounded transition-colors ${
                  activeTable === tab.id
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
                <span className="ml-1 text-[10px] opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar código o texto..."
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>
        </div>

        {/* Table Content Rendering */}
        <div className="mt-3 overflow-x-auto border border-slate-200 rounded-lg max-h-[600px] overflow-y-auto">
          {activeTable === 'ObraApun' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodObr</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">NumPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">RenPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CanPar</th>
                  <th className="px-3 py-2 text-right">PreUni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraApun
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(r.NumPar).includes(searchTerm)
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center font-bold text-slate-600">{row.CodObr}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right font-bold text-slate-900">{row.NumPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-blue-700">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.RenPar, 2)}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CanPar, 2)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-emerald-700">{formatNumber(row.PreUni, 2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraApinMate' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodObr</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">NumPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CanIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CosIns</th>
                  <th className="px-3 py-2 text-right">Desper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraApinMate
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.CodIns.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.CodObr}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right text-slate-600">{row.NumPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-emerald-700">{row.CodIns}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CanIns, 4)}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CosIns, 2)}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(row.Desper, 2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraApinEqui' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodObr</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">NumPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CanIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CosIns</th>
                  <th className="px-3 py-2 text-right">Deprec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraApinEqui
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.CodIns.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.CodObr}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right text-slate-600">{row.NumPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-blue-700">{row.CodIns}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CanIns, 2)}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CosIns, 2)}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(row.Deprec, 6)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraApinMano' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodObr</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">NumPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CanIns</th>
                  <th className="px-3 py-2 text-right">CosIns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraApinMano
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.CodIns.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.CodObr}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right text-slate-600">{row.NumPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-amber-700">{row.CodIns}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CanIns, 2)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-slate-800">{formatNumber(row.CosIns, 2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraPart' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 font-sans">Descri</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">UniPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">RenPar</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">PreUni</th>
                  <th className="px-3 py-2 text-right">CanPar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraPart
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.Descri.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-blue-700">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-sans text-slate-800">{row.Descri}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.UniPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.RenPar, 2)}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right font-bold text-emerald-700">{formatNumber(row.PreUni, 2)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-600">{row.CanPar}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraMate' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodMat</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodFam</th>
                  <th className="px-3 py-2 border-r border-slate-300 font-sans">
                    Descri <span className="text-[10px] text-slate-500 font-normal">(≤ 54 car)</span>
                  </th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">UniMat</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center bg-emerald-50">
                    CosMat ($ Editable Global)
                  </th>
                  <th className="px-3 py-2 text-center bg-emerald-50">Desper (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraMate
                  .filter((r) =>
                    !searchTerm ||
                    r.CodMat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.Descri.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-emerald-50/40">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-emerald-700">{row.CodMat}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.CodFam}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-sans text-slate-900 font-medium">
                        {row.Descri}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.UniMat}</td>
                      <td className="px-3 py-1 border-r border-slate-200 text-center">
                        {onPropagateMaterial ? (
                          <div className="flex justify-center">
                            <NumberStepper
                              value={row.CosMat}
                              step={0.5}
                              min={0}
                              decimals={2}
                              onChange={(val) => onPropagateMaterial(row.Descri, { costoUnitario: val })}
                            />
                          </div>
                        ) : (
                          formatNumber(row.CosMat, 2)
                        )}
                      </td>
                      <td className="px-3 py-1 text-center">
                        {onPropagateMaterial ? (
                          <div className="flex justify-center">
                            <NumberStepper
                              value={row.Desper}
                              step={1}
                              min={0}
                              max={100}
                              decimals={1}
                              onChange={(val) => onPropagateMaterial(row.Descri, { desperdicioPorc: val })}
                            />
                          </div>
                        ) : (
                          formatNumber(row.Desper, 2)
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraMano' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodMan</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodFam</th>
                  <th className="px-3 py-2 border-r border-slate-300 font-sans">
                    Descri <span className="text-[10px] text-slate-500 font-normal">(≤ 54 car)</span>
                  </th>
                  <th className="px-3 py-2 text-center bg-amber-50">Salari ($/Día Editable Global)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraMano
                  .filter((r) =>
                    !searchTerm ||
                    r.CodMan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.Descri.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-amber-50/40">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-amber-700">{row.CodMan}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.CodFam}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-sans text-slate-900 font-medium">
                        {row.Descri}
                      </td>
                      <td className="px-3 py-1 text-center">
                        {onPropagateLabor ? (
                          <div className="flex justify-center">
                            <NumberStepper
                              value={row.Salari}
                              step={0.5}
                              min={0}
                              decimals={2}
                              onChange={(val) => onPropagateLabor(row.Descri, { salarioDiario: val })}
                            />
                          </div>
                        ) : (
                          formatNumber(row.Salari, 2)
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraEqui' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodeEqu</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center">CodFam</th>
                  <th className="px-3 py-2 border-r border-slate-300 font-sans">
                    Descri <span className="text-[10px] text-slate-500 font-normal">(≤ 54 car)</span>
                  </th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center bg-blue-50">
                    CosEqu ($ Editable Global)
                  </th>
                  <th className="px-3 py-2 border-r border-slate-300 text-center bg-blue-50">
                    CosDia ($/Día)
                  </th>
                  <th className="px-3 py-2 text-center bg-blue-50">Deprec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraEqui
                  .filter((r) =>
                    !searchTerm ||
                    r.CodeEqu.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.Descri.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/40">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-blue-700">{row.CodeEqu}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-600">{row.CodFam}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-sans text-slate-900 font-medium">
                        {row.Descri}
                      </td>
                      <td className="px-3 py-1 border-r border-slate-200 text-center">
                        {onPropagateEquipment ? (
                          <div className="flex justify-center">
                            <NumberStepper
                              value={row.CosEqu}
                              step={10}
                              min={0}
                              decimals={2}
                              onChange={(val) => onPropagateEquipment(row.Descri, { costo: val })}
                            />
                          </div>
                        ) : (
                          formatNumber(row.CosEqu, 2)
                        )}
                      </td>
                      <td className="px-3 py-1 border-r border-slate-200 text-center">
                        {onPropagateEquipment ? (
                          <div className="flex justify-center">
                            <NumberStepper
                              value={row.CosDia}
                              step={1}
                              min={0}
                              decimals={2}
                              onChange={(val) => onPropagateEquipment(row.Descri, { costoDiario: val })}
                            />
                          </div>
                        ) : (
                          formatNumber(row.CosDia, 2)
                        )}
                      </td>
                      <td className="px-3 py-1 text-center">
                        {onPropagateEquipment ? (
                          <div className="flex justify-center">
                            <NumberStepper
                              value={row.Deprec}
                              step={0.005}
                              min={0.0001}
                              max={10}
                              decimals={4}
                              onChange={(val) => onPropagateEquipment(row.Descri, { depreciacionOAlquiler: val })}
                            />
                          </div>
                        ) : (
                          formatNumber(row.Deprec, 6)
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraPainMate' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CanIns</th>
                  <th className="px-3 py-2 text-right">Desper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraPainMate
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.CodIns.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-emerald-700">{row.CodIns}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CanIns, 4)}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(row.Desper, 2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraPainEqui' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodIns</th>
                  <th className="px-3 py-2 border-r border-slate-300 text-right">CanIns</th>
                  <th className="px-3 py-2 text-right">Deprec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraPainEqui
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.CodIns.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-blue-700">{row.CodIns}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 text-right">{formatNumber(row.CanIns, 2)}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(row.Deprec, 6)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {activeTable === 'ObraPainMano' && (
            <table className="min-w-full text-xs font-mono text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 sticky top-0 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-300">CodPar</th>
                  <th className="px-3 py-2 border-r border-slate-300">CodIns</th>
                  <th className="px-3 py-2 text-right">CanIns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {db.obraPainMano
                  .filter((r) =>
                    !searchTerm ||
                    r.CodPar.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.CodIns.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-slate-900">{row.CodPar}</td>
                      <td className="px-3 py-1.5 border-r border-slate-200 font-bold text-amber-700">{row.CodIns}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(row.CanIns, 2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
