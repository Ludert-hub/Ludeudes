import React, { useRef } from 'react';
import { X, Printer, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { printHtmlElement, triggerDirectPrint } from '../utils/printManager';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Attempt printing the specific content
    const success = printHtmlElement('print-modal-content', title);
    if (!success) {
      triggerDirectPrint();
    }
  };

  const handleDownloadHtml = () => {
    if (!contentRef.current) return;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { size: letter portrait; margin: 12mm 10mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #777; padding: 4px 6px; }
    th { background: #eee; }
    .bg-red-700 { background-color: #b91c1c; color: white; }
    .bg-slate-900 { background-color: #0f172a; color: white; }
  </style>
</head>
<body>
  ${contentRef.current.innerHTML}
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header toolbar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-700 text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Descargar archivo HTML imprimible"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Guardar HTML</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/60 flex justify-center">
          <div
            id="print-modal-content"
            ref={contentRef}
            className="bg-white p-8 rounded-xl shadow-lg border border-slate-300 max-w-4xl w-full text-slate-900"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
