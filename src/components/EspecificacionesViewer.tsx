import React, { useState, useMemo } from 'react';
import { PartidaItem } from '../types/costTypes';
import { CATEGORIES } from '../data/itemsData';
import { OFFICIAL_PROJECT_NAME } from '../data/projectInfo';
import { exportEspecificacionesToExcel } from '../utils/excelExport';
import {
  exportEspecificacionAnexo3raToPdf,
  Anexo3raMembretePdf,
  resolveAnexo3raFields,
} from '../utils/pdfExport';
import { PDVSA_LOGO_BASE64 } from '../utils/pdvsaLogoData';
import { printHtmlElement, triggerDirectPrint } from '../utils/printManager';
import { formatNumber } from '../utils/apuCalculations';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  FileText,
  SlidersHorizontal,
  BookOpen,
  Search,
  X,
  Check
} from 'lucide-react';

interface EspecificacionesViewerProps {
  items: PartidaItem[];
  selectedItem: PartidaItem;
  onSelectItem: (item: PartidaItem) => void;
  onClose?: () => void;
}

const DEFAULT_MEMBRETE: Anexo3raMembretePdf = {
  solped: '1300409453',
  proceso: '1300409453',
  proyecto: OFFICIAL_PROJECT_NAME,
  divisionSubtitulo: 'DEP LOS LLANOS',
  realizadoPorLinea1: 'HABILITACIÓN Y MANEJO DE ESPACIOS',
  realizadoPorLinea2: 'DIVISIÓN BARINAS',
  revisadoPorNombre: 'JUANA SÁNCHEZ',
  revisadoPorCargo: 'Superintendente de Serv. Logísticos División Barinas',
  aprobadoPorNombre: 'KEVIN CONTRERAS',
  aprobadoPorCargo: 'Gerente (E) Servicios Logísticos DEP Los Llanos',
};

// Official PDVSA DEP LOS LLANOS Logo Component (from official image_88.png)
const PdvsaLogoMesh: React.FC<{ subtitle?: string; compact?: boolean }> = ({
  compact = false,
}) => (
  <div className="inline-flex items-center justify-center select-none">
    <img
      src={PDVSA_LOGO_BASE64}
      alt="PDVSA DEP LOS LLANOS"
      className={`${
        compact ? 'h-8 max-w-[110px]' : 'h-14 sm:h-16 max-w-[185px]'
      } w-auto object-contain mx-auto`}
    />
  </div>
);

export const EspecificacionesViewer: React.FC<EspecificacionesViewerProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>('Todos');
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [continuousPageLimit, setContinuousPageLimit] = useState(15);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isMembreteModalOpen, setIsMembreteModalOpen] = useState(false);
  const [membrete, setMembrete] = useState<Anexo3raMembretePdf>(DEFAULT_MEMBRETE);

  // Filtered items for navigation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toString() === searchTerm.trim() ||
        String(item.id).padStart(3, '0').includes(searchTerm.trim());

      const matchChapter =
        selectedChapter === 'Todos' || item.capitulo === selectedChapter;

      return matchSearch && matchChapter;
    });
  }, [items, searchTerm, selectedChapter]);

  const activeList = filteredItems.length > 0 ? filteredItems : items;
  const currentIndex = Math.max(
    0,
    activeList.findIndex((i) => i.id === selectedItem.id)
  );
  const currentItem = activeList[currentIndex] || selectedItem;

  const handleFirst = () => {
    if (activeList.length > 0) onSelectItem(activeList[0]);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectItem(activeList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < activeList.length - 1) {
      onSelectItem(activeList[currentIndex + 1]);
    }
  };

  const handleLast = () => {
    if (activeList.length > 0) {
      onSelectItem(activeList[activeList.length - 1]);
    }
  };

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    setTimeout(() => {
      try {
        const listToExport = isContinuousMode
          ? activeList.slice(0, continuousPageLimit)
          : [currentItem];
        exportEspecificacionAnexo3raToPdf(listToExport, membrete);
      } finally {
        setIsExportingPdf(false);
      }
    }, 50);
  };

  const handlePrint = () => {
    const success = printHtmlElement(
      'official-spec-sheet-container',
      `Ficha_Tecnica_PDVSA - Partida Nº ${currentItem.id} (${String(currentItem.id).padStart(3, '0')})`
    );
    if (!success) {
      triggerDirectPrint();
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportEspecificacionesToExcel(items);
    } catch (err) {
      console.error('Error exporting specifications Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Single Specification Sheet Renderer (Strictly calibrated to official PDVSA Anexo 3RA)
  const renderSpecSheet = (item: PartidaItem) => {
    const spec = item.especificacion;
    const resolved = resolveAnexo3raFields(item);

    // Fixed minimum rows matching official PDVSA sheet
    const matRows = [...item.apu.materiales];
    const minMatRows = Math.max(7, matRows.length);
    const eqRows = [...item.apu.equipos];
    const minEqRows = Math.max(6, eqRows.length);
    const moRows = [...item.apu.manoDeObra];
    const minMoRows = Math.max(5, moRows.length);

    return (
      <div
        key={item.id}
        className="bg-white max-w-[920px] mx-auto p-4 sm:p-8 shadow-2xl border border-slate-400 mb-8 printable-sheet text-black"
      >
        {/* Outer Official Frame with crisp black borders */}
        <div className="border-[1.5px] border-black text-[11px] sm:text-xs leading-relaxed">
          {/* HEADER ROW 1: Official Logo | SOLPED & Project Description | Proceso & Partida N° */}
          <div className="grid grid-cols-12 border-b border-black">
            {/* Left Box: Official PDVSA DEP LOS LLANOS Logo */}
            <div className="col-span-12 sm:col-span-3 border-b sm:border-b-0 sm:border-r border-black p-3 flex items-center justify-center bg-white">
              <PdvsaLogoMesh subtitle={membrete.divisionSubtitulo} />
            </div>

            {/* Center Box: SOLPED & Institutional Project Text */}
            <div className="col-span-12 sm:col-span-6 border-b sm:border-b-0 sm:border-r border-black p-3.5 flex items-center justify-center text-center bg-white">
              <div className="font-bold text-[11px] sm:text-[11.5px] text-black uppercase leading-relaxed">
                SOLPED: {membrete.solped}. {membrete.proyecto}
              </div>
            </div>

            {/* Right Box: Proceso N° & 1. Partida N° (Peach/Orange Control Box) */}
            <div className="col-span-12 sm:col-span-3 flex flex-col">
              <div className="border-b border-black py-1.5 px-2 text-center bg-white">
                <div className="text-[10px] font-bold text-black uppercase">PROCESO Nº:</div>
                <div className="text-xs font-extrabold text-black font-mono">
                  {membrete.proceso}
                </div>
              </div>
              <div className="bg-[#f5cfa8] py-2.5 px-2 text-center flex-1 flex flex-col justify-center">
                <div className="text-[11px] font-bold text-black uppercase">
                  1. PARTIDA Nº:
                </div>
                <div className="text-xl font-extrabold text-black mt-0.5 font-mono">{item.id}</div>
              </div>
            </div>
          </div>

          {/* HEADER ROW 2: 2.- DESCRIPCION | 3.- UNIDAD DE MEDIDA & Cantidad */}
          <div className="grid grid-cols-12 border-b border-black bg-[#f5cfa8]">
            {/* 2. Descripción */}
            <div className="col-span-12 sm:col-span-9 border-b sm:border-b-0 sm:border-r border-black p-3 min-h-[76px] flex flex-col justify-start">
              <div className="text-[11px] font-bold text-black uppercase">2. -DESCRIPCION :</div>
              <div className="text-xs font-bold text-black uppercase mt-1 leading-relaxed break-words">
                {item.descripcion}
              </div>
            </div>

            {/* 3. Unidad de Medida y Cantidad */}
            <div className="col-span-12 sm:col-span-3 p-2.5 text-center flex flex-col justify-center">
              <div className="text-[10px] font-bold text-black uppercase">
                3.- UNIDAD DE MEDIDA
              </div>
              <div className="text-xs font-extrabold text-black uppercase my-0.5">
                {item.unidad}
              </div>
              <div className="text-[10px] font-medium text-black mt-0.5">Cantidad:</div>
              <div className="text-xs font-extrabold text-black font-mono">
                {formatNumber(item.cantidad, 2)}
              </div>
            </div>
          </div>

          {/* 4.- EXTENSIÓN DEL TRABAJO */}
          <div className="border-b border-black p-3 bg-white">
            <div className="font-bold text-black uppercase mb-1">
              4.- EXTENSIÓN DEL TRABAJO:
            </div>
            <div className="text-black leading-relaxed break-words">
              {spec.extensionTrabajo}
            </div>
          </div>

          {/* 5.- PROCEDIMIENTO DE EJECUCION */}
          <div className="border-b border-black p-3 bg-white space-y-1">
            <div className="font-bold text-black uppercase mb-1">
              5.- PROCEDIMIENTO DE EJECUCION:
            </div>
            {resolved.procedimientoSteps.map((step, idx) => (
              <div key={idx} className="text-black leading-relaxed break-words">
                {step}
              </div>
            ))}
          </div>

          {/* 6.- TOLERANCIAS DE ACEPTACION */}
          <div className="border-b border-black p-3 bg-white">
            <div className="font-bold text-black uppercase mb-1">
              6.- TOLERANCIAS DE ACEPTACION:
            </div>
            <div className="text-black leading-relaxed break-words">
              {spec.toleranciasAceptacion}
            </div>
          </div>

          {/* 7.- ENSAYOS A REALIZAR */}
          <div className="border-b border-black px-3 py-2 bg-white grid grid-cols-12 items-center gap-2">
            <div className="col-span-12 sm:col-span-4 font-bold text-black uppercase">
              7.- ENSAYOS A REALIZAR:
            </div>
            <div className="col-span-12 sm:col-span-8 sm:text-right font-bold text-black leading-relaxed break-words">
              {spec.ensayosARealizar || 'NO APLICA'}
            </div>
          </div>

          {/* 8.- MATERIALES */}
          <div className="border-b border-black">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#f5cfa8] border-b border-black font-bold text-black">
                  <th className="py-1.5 px-3 text-left border-r border-black w-[56%]">
                    8.- MATERIALES:
                  </th>
                  <th className="py-1.5 px-2 text-center border-r border-black w-[11%]">
                    Unidad
                  </th>
                  <th className="py-1.5 px-2 text-center border-r border-black w-[13%]">
                    Cantidad
                  </th>
                  <th className="py-1.5 px-2 text-center w-[20%]">OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: minMatRows }).map((_, idx) => {
                  const m = matRows[idx];
                  return (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 border-black h-[23px] bg-white"
                    >
                      <td className="py-1 px-3 border-r border-black font-medium text-black uppercase leading-snug break-words">
                        {m ? m.descripcion : ''}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-black font-mono text-[10.5px] uppercase">
                        {m ? m.unidad : ''}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-black font-mono font-bold text-[10.5px]">
                        {m ? m.cantidad.toFixed(2) : ''}
                      </td>
                      <td className="py-1 px-2 text-center text-[10px] text-black">
                        {''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 9.- DESPERDICIO */}
          <div className="border-b border-black px-3 py-2 bg-[#f5cfa8] grid grid-cols-12 items-center font-bold text-black text-[11px] gap-2">
            <div className="col-span-4 sm:col-span-3">9.- DESPERDICIO:</div>
            <div className="col-span-8 sm:col-span-5 flex items-center justify-center gap-6">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 border border-black bg-white inline-flex items-center justify-center text-[10px] font-black leading-none text-black">
                  {resolved.desperdicioAplica ? 'X' : ''}
                </span>
                <span>APLICA</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 border border-black bg-white inline-flex items-center justify-center text-[10px] font-black leading-none text-black">
                  {!resolved.desperdicioAplica ? 'X' : ''}
                </span>
                <span>NO APLICA</span>
              </span>
            </div>
            <div className="col-span-12 sm:col-span-4 text-right">
              MÁXIMO PERMITIDO: {resolved.desperdicioMaximoLabel}
            </div>
          </div>

          {/* 10.- EQUIPOS */}
          <div className="border-b border-black">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#f5cfa8] border-b border-black font-bold text-black">
                  <th className="py-1.5 px-3 text-left border-r border-black w-[67%]">
                    10.- EQUIPOS:
                  </th>
                  <th className="py-1.5 px-2 text-center border-r border-black w-[13%]">
                    Cantidad
                  </th>
                  <th className="py-1.5 px-2 text-center w-[20%]">OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: minEqRows }).map((_, idx) => {
                  const e = eqRows[idx];
                  return (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 border-black h-[23px] bg-white"
                    >
                      <td className="py-1 px-3 border-r border-black font-medium text-black uppercase leading-snug break-words">
                        {e ? e.descripcion : ''}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-black font-mono font-bold text-[10.5px]">
                        {e ? e.cantidad.toFixed(2) : ''}
                      </td>
                      <td className="py-1 px-2 text-center text-[10px] text-black font-mono">
                        {''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 11.- MANO DE OBRA */}
          <div className="border-b border-black">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#f5cfa8] border-b border-black font-bold text-black">
                  <th className="py-1.5 px-3 text-left border-r border-black w-[67%]">
                    11.- MANO DE OBRA:
                  </th>
                  <th className="py-1.5 px-2 text-center border-r border-black w-[13%]">
                    Cantidad
                  </th>
                  <th className="py-1.5 px-2 text-center w-[20%]">OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: minMoRows }).map((_, idx) => {
                  const mo = moRows[idx];
                  return (
                    <tr
                      key={idx}
                      className="border-b last:border-b-0 border-black h-[23px] bg-white"
                    >
                      <td className="py-1 px-3 border-r border-black font-medium text-black uppercase leading-snug break-words">
                        {mo ? mo.descripcion : ''}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-black font-mono font-bold text-[10.5px]">
                        {mo ? mo.cantidad.toFixed(2) : ''}
                      </td>
                      <td className="py-1 px-2 text-center text-[10px] text-black">
                        {''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 12.- PLANOS */}
          <div className="border-b border-black px-3 py-2 bg-[#f5cfa8] grid grid-cols-12 items-center font-bold text-black text-[11px] gap-2">
            <div className="col-span-4 sm:col-span-3">12.- PLANOS:</div>
            <div className="col-span-8 sm:col-span-5 flex items-center justify-center gap-6">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 border border-black bg-white inline-flex items-center justify-center text-[10px] font-black leading-none text-black">
                  {resolved.planosAplica ? 'X' : ''}
                </span>
                <span>APLICA</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 border border-black bg-white inline-flex items-center justify-center text-[10px] font-black leading-none text-black">
                  {!resolved.planosAplica ? 'X' : ''}
                </span>
                <span>NO APLICA</span>
              </span>
            </div>
            <div className="col-span-12 sm:col-span-4 text-right truncate">
              Nº DE PLANO: {resolved.planosLabel}
            </div>
          </div>

          {/* 13.- CONDICIONES ESPECIALES */}
          <div className="border-b border-black p-3 bg-white">
            <div className="font-bold text-black uppercase mb-0.5">
              13.- CONDICIONES ESPECIALES:
            </div>
            <div className="text-black leading-relaxed break-words">
              {spec.condicionesEspeciales || 'NO APLICA'}
            </div>
          </div>

          {/* 14.- MEDIDA Y FORMA DE PAGO */}
          <div className="border-b border-black p-3 bg-white">
            <div className="font-bold text-black uppercase mb-0.5">
              14.- MEDIDA Y FORMA DE PAGO:
            </div>
            <div className="text-black leading-relaxed break-words">
              {spec.medidaYFormaPago}
            </div>
          </div>

          {/* 15.- NO CONFORMIDAD */}
          <div className="border-b border-black p-3 bg-white">
            <div className="font-bold text-black uppercase mb-0.5">
              15.- NO CONFORMIDAD:
            </div>
            <div className="text-black leading-relaxed break-words">
              {spec.noConformidad}
            </div>
          </div>

          {/* OFFICIAL 3-COLUMN SIGNATURES FOOTER */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-black bg-white">
            {/* Realizado por */}
            <div className="p-2.5 min-h-[96px] flex flex-col justify-between">
              <div className="text-[11px] font-bold text-black">Realizado por:</div>
              <div className="text-center pt-5">
                <div className="font-extrabold text-black text-[11px] uppercase">
                  {membrete.realizadoPorLinea1}
                </div>
                <div className="font-bold text-black text-[10px] uppercase mt-0.5">
                  {membrete.realizadoPorLinea2}
                </div>
              </div>
            </div>

            {/* Revisado por */}
            <div className="p-2.5 min-h-[96px] flex flex-col justify-between">
              <div className="text-[11px] font-bold text-black">Revisado por:</div>
              <div className="text-center pt-5">
                <div className="font-extrabold text-black text-[11px] uppercase">
                  {membrete.revisadoPorNombre}
                </div>
                <div className="text-black text-[10px] mt-0.5">
                  {membrete.revisadoPorCargo}
                </div>
              </div>
            </div>

            {/* Aprobado por */}
            <div className="p-2.5 min-h-[96px] flex flex-col justify-between">
              <div className="text-[11px] font-bold text-black">Aprobado por:</div>
              <div className="text-center pt-5">
                <div className="font-extrabold text-black text-[11px] uppercase">
                  {membrete.aprobadoPorNombre}
                </div>
                <div className="text-black text-[10px] mt-0.5">
                  {membrete.aprobadoPorCargo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-[#cbd5e1]">
      {/* 1. TOP DARK HEADER & TOOLBAR */}
      <div className="bg-[#0f172a] text-white px-4 sm:px-6 py-4 space-y-3.5 print:hidden">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          {/* Left Title & PDVSA Badge */}
          <div className="flex items-center gap-3.5">
            <div className="bg-white px-2.5 py-1.5 rounded-lg shadow-sm shrink-0">
              <PdvsaLogoMesh subtitle={membrete.divisionSubtitulo} compact />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Especificaciones Técnicas de Partidas (Formato Oficial PDVSA)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formato reglamentario Anexo 3RA de 15 secciones con logotipos, bordes y firmas
              </p>
            </div>
          </div>

          {/* Right Action Buttons: Descargar PDF, Imprimir, Exportar a Excel, Configurar Membrete, Ver Cuaderno Continuo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Button 1: Descargar PDF (.pdf) */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generando PDF...' : 'Descargar PDF (.pdf)'}</span>
            </button>

            {/* Button 2: Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {/* Button 3: Exportar a Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/70 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>
                {isExportingExcel ? 'Exportando Excel...' : 'Exportar a Excel (.xlsx)'}
              </span>
            </button>

            {/* Button 4: Configurar Membrete */}
            <button
              type="button"
              onClick={() => setIsMembreteModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span>Configurar Membrete</span>
            </button>

            {/* Button 5: Ver Cuaderno Continuo */}
            <button
              type="button"
              onClick={() => setIsContinuousMode((v) => !v)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                isContinuousMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>
                {isContinuousMode ? 'Ver Ficha Individual' : 'Ver Cuaderno Continuo'}
              </span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
                title="Volver al Presupuesto General"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUBHEADER PAGINATION & FILTER BAR */}
      <div className="bg-[#111827] border-t border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-200 print:hidden">
        {/* Pagination Buttons: Primera, Anterior, Partida X de 363, Siguiente, Última */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleFirst}
            disabled={currentIndex === 0}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-medium text-slate-300 transition-colors cursor-pointer"
          >
            « Primera
          </button>

          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md font-semibold text-slate-200">
            Partida <span className="text-amber-400 font-extrabold">{currentItem.id}</span> de{' '}
            <span className="font-bold">{items.length}</span>
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= activeList.length - 1}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleLast}
            disabled={currentIndex >= activeList.length - 1}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md font-medium text-slate-300 transition-colors cursor-pointer"
          >
            Última »
          </button>
        </div>

        {/* Search, Chapter Filter & Direct Jump Selector */}
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          {/* Search Input */}
          <div className="relative w-40 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar partida..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Chapter Filter */}
          <select
            value={selectedChapter}
            onChange={(e) => {
              setSelectedChapter(e.target.value);
              const firstInChap = items.find(
                (it) => e.target.value === 'Todos' || it.capitulo === e.target.value
              );
              if (firstInChap) onSelectItem(firstInChap);
            }}
            className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 max-w-[200px] truncate cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Todos' ? `Todos los Capítulos (${CATEGORIES.length - 1})` : cat}
              </option>
            ))}
          </select>

          {/* Direct Jump Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Ir a:</span>
            <select
              value={currentItem.id}
              onChange={(e) => {
                const found = items.find((i) => i.id === Number(e.target.value));
                if (found) onSelectItem(found);
              }}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-400 max-w-[220px] truncate cursor-pointer"
            >
              {activeList.map((i) => (
                <option key={i.id} value={i.id} className="text-white">
                  Partida #{i.id} - {String(i.id).padStart(3, '0')} -{' '}
                  {i.descripcion.substring(0, 42)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. SPECIFICATION SHEET CANVAS */}
      <div
        id="official-spec-sheet-container"
        className="p-4 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0"
      >
        {!isContinuousMode ? (
          renderSpecSheet(currentItem)
        ) : (
          <div className="space-y-8">
            <div className="max-w-[920px] mx-auto bg-slate-900 text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="text-xs">
                <strong className="text-amber-400">Modo Cuaderno Continuo Activo:</strong>{' '}
                Mostrando {Math.min(continuousPageLimit, activeList.length)} de{' '}
                {activeList.length} fichas técnicas seguidas para revisión o descarga PDF masiva.
              </div>
              <div className="flex items-center gap-2">
                {continuousPageLimit < activeList.length && (
                  <button
                    type="button"
                    onClick={() => setContinuousPageLimit((n) => n + 25)}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Cargar +25 Fichas
                  </button>
                )}
                {continuousPageLimit < activeList.length && (
                  <button
                    type="button"
                    onClick={() => setContinuousPageLimit(activeList.length)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Mostrar las {activeList.length} Fichas
                  </button>
                )}
              </div>
            </div>
            {activeList.slice(0, continuousPageLimit).map((item) => renderSpecSheet(item))}
          </div>
        )}
      </div>

      {/* 4. MODAL: CONFIGURAR MEMBRETE Y FIRMAS */}
      {isMembreteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Configurar Membrete y Firmas Institucionales (Anexo 3RA)
                </h3>
                <p className="text-xs text-slate-500">
                  Personalice los datos de SOLPED, Proceso y Firmantes de la ficha oficial PDVSA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMembreteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Plantillas Rápidas:</span>
              <button
                type="button"
                onClick={() => setMembrete(DEFAULT_MEMBRETE)}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-md cursor-pointer"
              >
                SOLPED 1300409453 (Kevin Contreras)
              </button>
              <button
                type="button"
                onClick={() =>
                  setMembrete({
                    ...DEFAULT_MEMBRETE,
                    solped: '1300406787',
                    proceso: '1300406787',
                    aprobadoPorNombre: 'ING. ELISMAR TERÁN',
                    aprobadoPorCargo: 'Gerente (E) Servicios Logísticos DEP Los Llanos',
                  })
                }
                className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold rounded-md cursor-pointer"
              >
                SOLPED 1300406787 (Ing. Elismar Terán)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">SOLPED Nº</label>
                <input
                  type="text"
                  value={membrete.solped}
                  onChange={(e) => setMembrete({ ...membrete, solped: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">PROCESO Nº</label>
                <input
                  type="text"
                  value={membrete.proceso}
                  onChange={(e) => setMembrete({ ...membrete, proceso: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción del Proyecto en Membrete
                </label>
                <textarea
                  rows={2}
                  value={membrete.proyecto}
                  onChange={(e) => setMembrete({ ...membrete, proyecto: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Realizado por (Unidad)
                </label>
                <input
                  type="text"
                  value={membrete.realizadoPorLinea1}
                  onChange={(e) =>
                    setMembrete({ ...membrete, realizadoPorLinea1: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Realizado por (División)
                </label>
                <input
                  type="text"
                  value={membrete.realizadoPorLinea2}
                  onChange={(e) =>
                    setMembrete({ ...membrete, realizadoPorLinea2: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Revisado por (Nombre)
                </label>
                <input
                  type="text"
                  value={membrete.revisadoPorNombre}
                  onChange={(e) =>
                    setMembrete({ ...membrete, revisadoPorNombre: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Revisado por (Cargo)
                </label>
                <input
                  type="text"
                  value={membrete.revisadoPorCargo}
                  onChange={(e) =>
                    setMembrete({ ...membrete, revisadoPorCargo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Aprobado por (Nombre)
                </label>
                <input
                  type="text"
                  value={membrete.aprobadoPorNombre}
                  onChange={(e) =>
                    setMembrete({ ...membrete, aprobadoPorNombre: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Aprobado por (Cargo)
                </label>
                <input
                  type="text"
                  value={membrete.aprobadoPorCargo}
                  onChange={(e) =>
                    setMembrete({ ...membrete, aprobadoPorCargo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsMembreteModalOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Guardar y Aplicar Membrete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
