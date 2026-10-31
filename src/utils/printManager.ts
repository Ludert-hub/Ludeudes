/**
 * Print Manager Utility
 * Provides robust printing support for modern web browsers, iframe environments
 * (such as AI Studio sandbox where window.print() can be restricted), and print-to-PDF.
 */

export interface PrintOptions {
  title?: string;
  landscape?: boolean;
}

export function isIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Triggers printing of the current page or a specific container with safety fallbacks.
 */
export function triggerDirectPrint(): boolean {
  try {
    window.print();
    return true;
  } catch (err) {
    console.warn("Direct window.print() failed or was blocked by sandbox:", err);
    return false;
  }
}

/**
 * Prints a specific HTML element cleanly in an isolated popup window or iframe
 */
export function printHtmlElement(elementId: string, title: string = "Impresión Oficial PDVSA"): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID '${elementId}' not found for printing.`);
    return triggerDirectPrint();
  }

  const contentHtml = element.outerHTML;

  // Build clean printable document with styles
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    // Popup was blocked, attempt in-place print
    return triggerDirectPrint();
  }

  const printDocument = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 12mm 10mm 12mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 10px;
      font-size: 11px;
      line-height: 1.35;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    thead {
      display: table-header-group;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
    }
    th {
      background-color: #e2e8f0 !important;
      font-weight: 700;
    }
    .no-print {
      display: none !important;
    }
    .print-only {
      display: block !important;
    }
    /* Official PDVSA Colors */
    .bg-red-700, .bg-red-800 {
      background-color: #b91c1c !important;
      color: white !important;
    }
    .text-red-700, .text-red-800 {
      color: #b91c1c !important;
    }
    .border-slate-800 {
      border-color: #1e293b !important;
    }
    .border-slate-900 {
      border-color: #0f172a !important;
    }
    .bg-slate-900 {
      background-color: #0f172a !important;
      color: white !important;
    }
    .bg-slate-100 {
      background-color: #f1f5f9 !important;
    }
    .bg-slate-50 {
      background-color: #f8fafc !important;
    }
    .bg-amber-500\\/10 {
      background-color: #fef3c7 !important;
    }
  </style>
</head>
<body>
  ${contentHtml}
  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>
  `;

  try {
    printWindow.document.open();
    printWindow.document.write(printDocument);
    printWindow.document.close();
    return true;
  } catch (err) {
    console.error("Failed to write to print window:", err);
    return triggerDirectPrint();
  }
}
