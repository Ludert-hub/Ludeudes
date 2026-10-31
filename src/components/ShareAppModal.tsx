import React, { useState } from 'react';
import { PROJECT_INFO } from '../data/projectInfo';
import { PartidaItem, FinancialSummary } from '../types/costTypes';
import { exportPresupuestoToExcel, exportEspecificacionesToExcel } from '../utils/excelExport';
import {
  Mail,
  X,
  Copy,
  CheckCircle2,
  ExternalLink,
  Share2,
  Send,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Info,
  UserCheck,
  ShieldAlert,
  HelpCircle,
  Laptop
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: PartidaItem[];
  summary?: FinancialSummary;
  fcasPorc: number;
  adminPorc?: number;
  utilidadPorc?: number;
  ivaPorc?: number;
  totalPartidas: number;
  granTotal?: number;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  items = [],
  summary,
  fcasPorc,
  adminPorc = 12.5,
  utilidadPorc = 17,
  ivaPorc = 16,
  totalPartidas,
  granTotal,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetEmail = 'jesusludert@gmail.com';
  
  // Current URL in browser
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const emailSubject = `Sistema de Presupuesto, APU y Cuadernillo Técnico PDVSA - Flota Pesada El Toreño (SOLPED ${PROJECT_INFO.solped})`;

  const emailBody = `Estimado Jesús Ludert,

Te comparto los datos y el acceso al Sistema Oficial de Presupuesto, Análisis de Precios Unitarios (APU) y Especificaciones Técnicas (Anexo 3RA) de PDVSA:

PROYECTO:
• Obra: ${PROJECT_INFO.descripcionLarga}
• SOLPED / Proceso N°: ${PROJECT_INFO.solped}
• Dependencia: PDVSA DEP Los Llanos - División Barinas
• Partidas: ${totalPartidas} partidas codificadas en formato estricto de 3 dígitos (001 a ${String(totalPartidas).padStart(3, '0')})
• Parámetros Contractuales: LOTTT & CCP (FCAS: ${fcasPorc}%, Adm: ${adminPorc}%, Utilidad: ${utilidadPorc}%)
• Monto Total Estimado: ${granTotal ? granTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD' : 'Conforme a cómputos'}

ARCHIVOS ADJUNTOS / EXPORTABLES:
1. Libro de Presupuesto General y APU Oficial (.xlsx) con fórmulas dinámicas
2. Cuadernillo Técnico ANEXO 3RA con los 15 numerales de especificaciones técnicas

ENLACE DE ACCESO AL ENTORNO WEB:
${currentUrl}

(Nota de Acceso: Al ser un entorno protegido de Google AI Studio, tu cuenta ${targetEmail} ha sido designada como destinatario autorizado).

Saludos cordiales.`;

  // Gmail Web direct compose URL
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    targetEmail
  )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  // Native mailto URL
  const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(emailBody);
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenGmail = () => {
    window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPresupuesto = () => {
    if (items.length > 0 && summary) {
      setIsExporting('presupuesto');
      exportPresupuestoToExcel(items, summary, fcasPorc, adminPorc, utilidadPorc, ivaPorc);
      setTimeout(() => setIsExporting(null), 1500);
    }
  };

  const handleDownloadAnexo3RA = async () => {
    if (items.length > 0) {
      setIsExporting('anexo3ra');
      await exportEspecificacionesToExcel(items);
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Compartir Aplicación con Jesús Ludert</span>
              </h3>
              <p className="text-xs text-slate-300">
                Destinatario configurado: <strong className="text-amber-400 font-mono font-semibold">{targetEmail}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-800">

          {/* DIAGNOSIS BANNER: ERROR 403 EXPLANATION & SOLUTION */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-2.5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                    <span>Solución al Error 403 (Prohibido) de Google</span>
                  </h4>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                    Seguridad Google Cloud
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                  El mensaje <strong>"403. Se trata de un error. No tienes acceso a esta página"</strong> se debe a que Google AI Studio bloquea por seguridad el acceso directo a los enlaces privados de desarrollo (<code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded font-mono text-[11px]">ais-dev-...</code>) si el correo no ha sido invitado en el proyecto.
                </p>
              </div>
            </div>

            {/* 2 Recommended Solutions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-amber-200 text-xs">
              <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                  Invitar correo en Google AI Studio:
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Arriba a la derecha en la barra de Google AI Studio, presiona el botón <strong>"Share" (Compartir)</strong>, escribe <strong>jesusludert@gmail.com</strong> y concédele acceso. Así Google desbloqueará su entrada web directa.
                </p>
              </div>

              <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  Enviar Archivo Excel Adjunto:
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Descarga los libros oficiales aquí abajo y adjúntalos directamente en el correo. <strong>Jesús podrá abrirlos en su Excel de inmediato sin ninguna restricción de Google.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Direct Download Excel Buttons */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Descargar Libros para Adjuntar en el Correo</span>
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Funcional sin 403
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPresupuesto}
                disabled={items.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting === 'presupuesto' ? 'Generando Excel...' : `Descargar Presupuesto ${totalPartidas} (.xlsx)`}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadAnexo3RA}
                disabled={items.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting === 'anexo3ra' ? 'Generando Fichas...' : 'Descargar ANEXO 3RA (.xlsx)'}</span>
              </button>
            </div>
          </div>

          {/* Quick Action: Open in Gmail */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Envío por Correo Electrónico
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleOpenGmail}
                className="flex items-center justify-center gap-2.5 px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer group"
              >
                <Mail className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Redactar en Gmail para Jesús</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>

              <a
                href={mailtoUrl}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 text-slate-300" />
                <span>Abrir con Outlook / App Correo</span>
              </a>
            </div>
          </div>

          {/* Enlace Web del Entorno */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Enlace de la Aplicación en la Nube
              </label>
              <span className="text-[11px] text-slate-500">
                (Requiere invitación previa en AI Studio para no dar 403)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview of Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Texto del Correo Preparado
              </label>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                {copiedBody ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Texto copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar texto</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              readOnly
              rows={5}
              value={emailBody}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-700 focus:outline-none leading-relaxed select-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Destinatario oficial: <strong>{targetEmail}</strong></span>
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
