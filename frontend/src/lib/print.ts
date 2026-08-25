interface PrintPreviewOptions {
  title: string;
  bodyHtml: string;
  styles?: string;
  previewTitle?: string;
  downloadButtonLabel?: string;
}

export function openPrintPreviewWindow({
  title,
  bodyHtml,
  styles = "",
  previewTitle = "Vista previa de impresion",
  downloadButtonLabel,
}: PrintPreviewOptions) {
  const w = window.open("", "_blank");
  if (!w) return null;

  w.document.open();
  w.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #e2e8f0;
        color: #0f172a;
      }
      .preview-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 18px;
        color: #000000;
      }
      .preview-toolbar__title {
        font-size: 14px;
        font-weight: 700;
      }
      .preview-toolbar__hint {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.75);
      }
      .preview-toolbar__button {
        border: none;
        border-radius: 999px;
        background: #0778ac;
        color: #fff;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .preview-toolbar__button:hover {
        background: #055f82;
      }
      .preview-sheet {
        max-width: 1100px;
        margin: 24px auto;
        background: #fff;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
      }
      @media print {
        body {
          background: #fff;
        }
        .preview-toolbar {
          display: none;
        }
        .preview-sheet {
          max-width: none;
          margin: 0;
          box-shadow: none;
        }
      }
      ${styles}
    </style>
  </head>
  <body>
    <div class="preview-toolbar">
      <div>
        <div class="preview-toolbar__title">${previewTitle}</div>
        <div class="preview-toolbar__hint">Revise el documento antes de imprimirlo.</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        ${downloadButtonLabel ? `<button type="button" id="preview-download-button" class="preview-toolbar__button">${downloadButtonLabel}</button>` : ""}
        <button type="button" class="preview-toolbar__button" onclick="window.print()">Imprimir</button>
      </div>
    </div>
    <div class="preview-sheet">${bodyHtml}</div>
  </body>
</html>`);
  w.document.close();
  w.focus();
  return w;
}

export function openPrintWindow(html: string) {
  return openPrintPreviewWindow({
    title: "Documento",
    bodyHtml: html,
  });
}
