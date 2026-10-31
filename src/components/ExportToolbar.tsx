import React, { useState } from 'react';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { exportPresupuestoToExcel, exportEspecificacionesToExcel, exportApuBookToExcel } from '../utils/excelExport';
import { exportLulowinToExcel } from '../utils/lulowinExcelExport';
import { exportPresupuestoToPdf, exportApuBookToPdf } from '../utils/pdfExport';
import { printHtmlElement, triggerDirectPrint } from '../utils/printManager';
import {
  FileSpreadsheet,
  FileDown,
  Download,
  BookOpen,
  Printer,
  CheckCircle2,
  Database,
  Plus,
  Mail,
  RefreshCw,
} from 'lucide-react';

interface ExportToolbarProps {
  items: PartidaItem[];
  summary: FinancialSummary;
  fcasPorc: number;
  adminPorc: number;
  utilidadPorc: number;
  ivaPorc: number;
  onOpenAddPartida?: () => void;
  onOpenShare?: () => void;
  onOpenSyncCenter?: () => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  items,
  summary,
  fcasPorc,
  adminPorc,
  utilidadPorc,
  ivaPorc,
  onOpenAddPartida,
  onOpenShare,
  onOpenSyncCenter,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isExportingSpecs, setIsExportingSpecs] = useState(false);
  const [isExportingLulowin, setIsExportingLulowin] = useState(false);
  const [isExportingApuPdf, setIsExportingApuPdf] = useState(false);

  const notifySuccess = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleExportPresupuesto = () => {
    exportPresupuestoToExcel(items, summary, fcasPorc, adminPorc, utilidadPorc, ivaPorc);
    notifySuccess("Presupuesto General (.xlsx) con fórmulas dinámicas y pestaña 'DATOS' exportado exitosamente");
  };

  const handleExportPresupuestoPdf = () => {
    exportPresupuestoToPdf(items, summary, fcasPorc, adminPorc, utilidadPorc, ivaPorc);
    notifySuccess('Presupuesto General (.pdf) en formato oficial PDVSA descargado con éxito');
  };

  const handleExportApu = () => {
    exportApuBookToExcel(items, fcasPorc, adminPorc, utilidadPorc);
    notifySuccess('Libro de APU Completo (.xlsx) con herramientas desglosadas exportado exitosamente');
  };

  const handleExportApuPdf = () => {
    setIsExportingApuPdf(true);
    setTimeout(() => {
      try {
        exportApuBookToPdf(items, fcasPorc, adminPorc, utilidadPorc);
        notifySuccess('Libro de APU Completo (.pdf) en formato oficial PDVSA descargado con éxito');
      } finally {
        setIsExportingApuPdf(false);
      }
    }, 50);
  };

  const handleExportEspecificaciones = async () => {
    try {
      setIsExportingSpecs(true);
      await exportEspecificacionesToExcel(items);
      notifySuccess("Archivo 'ESPECIFICACIONES TECNICAS FINALES IA.xlsx' oficial ANEXO 3RA descargado con éxito");
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingSpecs(false);
    }
  };

  const handleExportLulowin = async () => {
    try {
      setIsExportingLulowin(true);
      await exportLulowinToExcel(items, 'ZXV', fcasPorc, adminPorc, utilidadPorc);
      notifySuccess('Tablas LuloWin / MAPREX (.xlsx) con las 11 hojas oficiales exportadas exitosamente');
    } catch (err) {
      console.error(err);
    } finally {
      setIsExportingLulowin(false);
    }
  };

  const handlePrint = () => {
    const success = printHtmlElement('main-app-content', 'Presupuesto PDVSA Flota Pesada El Toreño');
    if (!success) {
      triggerDirectPrint();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 my-4 shadow-xs">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3.5">
        {/* Title and description */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Centro de Exportación de Documentos Oficiales (Excel & PDF)</h2>
            {downloadSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {downloadSuccess}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Descargas directas en <strong>PDF Oficial</strong> (Presupuesto General y Libro APU), <strong>Excel (.xlsx)</strong> vinculado a <strong>DATOS</strong>, <strong>ANEXO 3RA (78 filas)</strong> y <strong>Tablas LuloWin</strong>.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenAddPartida && (
            <button
              onClick={onOpenAddPartida}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 hover:border-emerald-600 rounded-lg transition-colors cursor-pointer"
              title="Anexar nuevas partidas al partidario oficial"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anexar Partida</span>
            </button>
          )}

          {onOpenShare && (
            <button
              type="button"
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-700 border border-red-300 hover:border-red-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Compartir enlace de la aplicación con jesusludert@gmail.com"
            >
              <Mail className="w-3.5 h-3.5 text-red-600 group-hover:text-white" />
              <span>Compartir (Gmail)</span>
            </button>
          )}

          {onOpenSyncCenter && (
            <button
              type="button"
              onClick={onOpenSyncCenter}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-800 hover:to-amber-800 border border-red-800 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Cargar y sincronizar archivos: Presupuesto Excel PDVSA, Tablas Lulowin, Especificaciones o Presupuesto PDF"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Sincronizar Archivos</span>
            </button>
          )}

          {/* Presupuesto Excel */}
          <button
            onClick={handleExportPresupuesto}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Descargar Presupuesto General en Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Presupuesto (.xlsx)</span>
          </button>

          {/* Presupuesto PDF Oficial */}
          <button
            onClick={handleExportPresupuestoPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-colors cursor-pointer"
            title="Descargar Presupuesto General en formato PDF Oficial (PRESUPUESTO EJEMPLO.pdf)"
          >
            <FileDown className="w-4 h-4" />
            <span>Presupuesto (.pdf)</span>
          </button>

          {/* Libro de APU Excel */}
          <button
            onClick={handleExportApu}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Descargar Libro de APU en Excel (.xlsx)"
          >
            <BookOpen className="w-4 h-4 text-blue-700" />
            <span>Libro APU (.xlsx)</span>
          </button>

          {/* Libro de APU PDF Oficial */}
          <button
            onClick={handleExportApuPdf}
            disabled={isExportingApuPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-300 hover:border-blue-600 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            title="Descargar Libro Completo de APU en formato PDF Oficial (APU EJEMPLO.pdf)"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExportingApuPdf ? 'Generando PDF...' : 'Libro APU (.pdf)'}</span>
          </button>

          {/* Tablas LuloWin */}
          <button
            onClick={handleExportLulowin}
            disabled={isExportingLulowin}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            title="Descargar las 11 tablas relacionales LuloWin / MAPREX (.xlsx)"
          >
            <Database className="w-4 h-4 text-purple-700" />
            <span>{isExportingLulowin ? 'Generando...' : 'Tablas LuloWin (.xlsx)'}</span>
          </button>

          {/* DEDICATED EXCLUSIVE BUTTON FOR ESPECIFICACIONES TÉCNICAS */}
          <button
            onClick={handleExportEspecificaciones}
            disabled={isExportingSpecs}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg shadow-sm border border-red-800 transition-all cursor-pointer focus:ring-2 focus:ring-red-500/20"
            title="Botón exclusivo: Descargar ESPECIFICACIONES TECNICAS FINALES IA.xlsx en formato estricto ANEXO 3RA con 78 filas paginadas por partida"
          >
            <Download className="w-4 h-4 text-red-100" />
            <span>{isExportingSpecs ? 'Descargando Cuadernillo...' : 'Exportar Especificaciones (.xlsx)'}</span>
          </button>

          {/* Print preview */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Imprimir documento oficial en papel o guardar en PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
