function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function formatReportExportCell(key, row, { formatStatusLabel } = {}) {
  if (key === 'imageUrl') {
    if (row.isSecure) return 'Secure hold (photo hidden)';
    if (row.imageUrl) return row.imageUrl;
    return 'No photo';
  }

  const raw = row[key];
  if (key === 'status' || key === 'role') {
    return formatStatusLabel ? formatStatusLabel(raw) : String(raw ?? '');
  }

  return raw ?? '';
}

function formatReportHtmlCell(key, row, { formatStatusLabel } = {}) {
  if (key === 'imageUrl') {
    if (row.isSecure) {
      return '<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;background:#fef3c7;color:#b45309;font-weight:800;">!</span>';
    }
    if (row.imageUrl) {
      return `<img src="${escapeHtml(row.imageUrl)}" alt="" width="40" height="40" loading="eager" decoding="async" style="object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" />`;
    }
    return '—';
  }

  const raw = row[key];
  if (key === 'status' || key === 'role') {
    const label = formatStatusLabel ? formatStatusLabel(raw) : String(raw ?? '—');
    return escapeHtml(label);
  }

  return escapeHtml(raw ?? '—');
}

function buildMetaHtml(metaLines = []) {
  if (!metaLines.length) return '';
  return `<div class="meta">${metaLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}</div>`;
}

function buildTableHtml(columns, rows, formatters) {
  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td>${formatReportHtmlCell(column.key, row, formatters)}</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function buildDocumentHtml({ title, subtitle, generatedAt, metaLines = [], bodyHtml }) {
  const generated = generatedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(generatedAt))
    : new Date().toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 14mm; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 24px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .subtitle { margin: 0 0 12px; color: #64748b; font-size: 13px; }
    .meta { margin: 0 0 16px; font-size: 12px; color: #475569; line-height: 1.6; }
    .generated { margin-bottom: 18px; font-size: 11px; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: middle; }
    th { background: #f8fafc; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; }
    tr:nth-child(even) td { background: #fcfdff; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
  ${buildMetaHtml(metaLines)}
  <p class="generated">Generated ${escapeHtml(generated)} · Jazeera University LOFO</p>
  ${bodyHtml}
</body>
</html>`;
}

function preloadReportImageUrls(rows = [], maxMs = 1800) {
  const urls = [
    ...new Set(
      rows
        .filter((row) => row.imageUrl && !row.isSecure)
        .map((row) => String(row.imageUrl))
    ),
  ];
  if (!urls.length) return Promise.resolve();

  return Promise.race([
    Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            const done = () => resolve();
            img.onload = done;
            img.onerror = done;
            img.src = url;
          })
      )
    ),
    new Promise((resolve) => window.setTimeout(resolve, maxMs)),
  ]);
}

function waitForFrameImages(doc, maxMs = 2200) {
  return new Promise((resolve) => {
    const images = Array.from(doc?.images || []);
    if (!images.length) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    window.setTimeout(finish, maxMs);

    let pending = 0;
    images.forEach((img) => {
      if (img.complete) return;
      pending += 1;
      const done = () => {
        pending -= 1;
        if (pending <= 0) finish();
      };
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });

    if (pending <= 0) finish();
  });
}

function printHtmlDocument(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'JU LOFO report print');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = frameWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error('Could not open the print dialog on this browser.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 100);
  };

  const bindPrintCleanup = () => {
    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('afterprint', cleanup, { once: true });
    }
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 10 * 60 * 1000);
  };

  const triggerPrint = () => {
    bindPrintCleanup();
    frameWindow.focus();
    frameWindow.print();
  };

  const imageCount = doc.images?.length || 0;
  const waitBudget = Math.min(2200, 300 + imageCount * 80);
  waitForFrameImages(doc, waitBudget).then(triggerPrint);
}

function buildReportHtml(options) {
  const bodyHtml = buildTableHtml(options.columns, options.rows, options.formatters || {});
  return buildDocumentHtml({
    title: options.title,
    subtitle: options.subtitle,
    generatedAt: options.generatedAt,
    metaLines: options.metaLines,
    bodyHtml,
  });
}

export function exportReportHtml(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.html') ? filename : `${filename}.html`);
}

export function openReportPrintView(options) {
  const html = buildReportHtml({
    ...options,
    title: options.title || 'JU LOFO Report',
  });
  printHtmlDocument(html);
}

export function exportReportCsv(filename, columns, rows, formatters = {}) {
  const header = columns.map((column) => column.label);
  const body = rows.map((row) =>
    columns.map((column) => formatReportExportCell(column.key, row, formatters))
  );
  const csv = [header, ...body].map((line) => line.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportReportExcel(filename, columns, rows, formatters = {}) {
  const exportRows = rows.map((row) =>
    columns.map((column) => formatReportExportCell(column.key, row, formatters))
  );
  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = exportRows
    .map((line) => `<tr>${line.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8" /></head>
<body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

export async function printReport(options) {
  await preloadReportImageUrls(options.rows);
  openReportPrintView(options);
}

export async function exportReportPdf(options) {
  await preloadReportImageUrls(options.rows);
  openReportPrintView(options);
}

export function buildSummarySections(view, formatGeneratedAt) {
  const sections = [
    {
      heading: 'Summary Metrics',
      rows: [
        ['Total Users', view.summary.totalUsers],
        ['Students', view.summary.students],
        ['Admins', view.summary.admins],
        ['Total Items', view.summary.totalItems],
        ['Lost Items', view.summary.lostItems],
        ['Lost Holds', view.summary.foundItems],
        ['Returned Items', view.summary.returnedItems],
        ['Pending Reports', view.summary.pendingReports],
        ['Ownership Claims', view.summary.totalClaims],
        ['Recovery Rate %', view.summary.recoveryRate],
        ['Contact Messages', view.summary.contactMessages ?? 0],
        ['Most Active User', view.summary.maxUserActivityName ?? '—'],
        ['Max User Activity (posts)', view.summary.maxUserActivityCount ?? 0],
      ],
    },
    {
      heading: 'Top Contributors',
      rows:
        Array.isArray(view.topContributors) && view.topContributors.length
          ? view.topContributors.map((row) => [
              row.name,
              row.studentId || '—',
              row.faculty || 'Unassigned',
              row.count,
              `${row.lost} lost · ${row.found} found`,
            ])
          : [['No contributor data', '—', '', 0, '']],
    },
    {
      heading: 'Faculty Breakdown',
      rows:
        Array.isArray(view.faculties) && view.faculties.length
          ? view.faculties.map((row) => [row.name, row.count])
          : [['Unassigned', view.summary.students ?? 0]],
    },
  ];

  return {
    title: 'JU LOFO — System Reports Summary',
    subtitle: 'University-wide registry metrics',
    generatedAt: view.generatedAt,
    metaLines: [`Generated ${formatGeneratedAt(view.generatedAt)}`],
    sections,
  };
}

export function exportSummaryCsv(view, formatGeneratedAt) {
  const { sections } = buildSummarySections(view, formatGeneratedAt);
  const lines = [['JU LOFO — System Reports Summary'], []];
  sections.forEach((section) => {
    lines.push([section.heading]);
    section.rows.forEach((row) => lines.push(row));
    lines.push([]);
  });
  const csv = lines.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `ju-lofo-system-summary-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportSummaryExcel(view, formatGeneratedAt) {
  const { sections } = buildSummarySections(view, formatGeneratedAt);
  const body = sections
    .map(
      (section) =>
        `<tr><th colspan="2" style="background:#eff6ff;text-align:left;">${escapeHtml(section.heading)}</th></tr>` +
        section.rows
          .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
          .join('')
    )
    .join('');
  const html = `<html><head><meta charset="UTF-8" /></head><body><table>${body}</table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `ju-lofo-system-summary-${new Date().toISOString().slice(0, 10)}.xls`);
}

export function printSummaryReport(view, formatGeneratedAt) {
  const { title, subtitle, generatedAt, metaLines, sections } = buildSummarySections(view, formatGeneratedAt);
  const bodyHtml = sections
    .map(
      (section) =>
        `<h2 style="font-size:14px;margin:18px 0 8px;">${escapeHtml(section.heading)}</h2>` +
        `<table><tbody>${section.rows
          .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
          .join('')}</tbody></table>`
    )
    .join('');
  const html = buildDocumentHtml({ title, subtitle, generatedAt, metaLines, bodyHtml });
  printHtmlDocument(html);
}
