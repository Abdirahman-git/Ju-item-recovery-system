import { JU_LOGO_BASE64 } from './logoBase64';

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

function getAbsoluteLogoUrl() {
  return JU_LOGO_BASE64;
}

function buildDocumentHtml({
  title,
  subtitle,
  generatedAt,
  generatedBy,
  reportedBy,
  authorizedBy,
  authorizedTitle,
  metaLines = [],
  bodyHtml,
}) {
  const now = generatedAt ? new Date(generatedAt) : new Date();
  const generated = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
  const dateLong = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);

  const byName = String(generatedBy || reportedBy || 'LOFO Administrator').trim();
  const reportBy = String(reportedBy || byName).trim();
  const authName = String(authorizedBy || 'Lost & Found Office').trim();
  const authTitle = String(authorizedTitle || 'Authorized Officer').trim();
  const reportTitle = String(title || 'Property Registry Report').trim();
  const logoUrl = getAbsoluteLogoUrl();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <base href="${origin}/" />
  <title>${escapeHtml(reportTitle)} — Jazeera University LOFO</title>
  <style>
    @page { size: A4; margin: 0; }
    body {
      font-family: Arial, Helvetica, "Segoe UI", sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 16px 18px 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-header {
      text-align: center;
      margin: 0 0 18px;
      padding: 0 0 4px;
    }
    .doc-logo {
      width: 88px;
      height: 88px;
      margin: 0 auto 10px;
      display: block;
      object-fit: contain;
    }
    .doc-org {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.01em;
      line-height: 1.25;
    }
    .doc-title {
      margin: 6px 0 0;
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
    }
    .doc-subtitle {
      margin: 4px 0 0;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
    }
    .gen-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      margin: 16px 0 10px;
      font-size: 12px;
      color: #111827;
    }
    .gen-row span { white-space: nowrap; }
    .meta { font-size: 11px; color: #475569; line-height: 1.5; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: #1A56DB;
      color: #ffffff;
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 800;
    }
    tr:nth-child(even) td { background: #fafafa; }
    .sign-block {
      margin-top: 52px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 40px;
    }
    .sign-col {
      width: 42%;
      max-width: 260px;
    }
    .sign-col.right {
      text-align: left;
      margin-left: auto;
    }
    .sign-line {
      border-top: 1px solid #334155;
      width: 100%;
      margin-bottom: 8px;
    }
    .sign-label {
      margin: 0;
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .sign-sub {
      margin: 4px 0 0;
      font-size: 11px;
      color: #4b5563;
    }
    .doc-footer-brand {
      margin-top: 28px;
      text-align: center;
    }
    .doc-footer-brand .org {
      margin: 0;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-footer-brand .contact {
      margin: 4px 0 0;
      font-size: 11px;
      color: #6b7280;
    }
    @media print {
      body { margin: 12mm 12mm 14mm; }
      .sign-block,
      .doc-footer-brand { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header class="doc-header">
    <img class="doc-logo" src="${logoUrl}" alt="Jazeera University Logo" />
    <h1 class="doc-org">Jazeera University</h1>
    <h2 class="doc-title">${escapeHtml(reportTitle)}</h2>
    ${subtitle ? `<p class="doc-subtitle">${escapeHtml(subtitle)}</p>` : ''}
  </header>

  <div class="gen-row">
    <span>Generated at: ${escapeHtml(generated)}</span>
    <span>Generated by: ${escapeHtml(byName)}</span>
  </div>

  ${buildMetaHtml(metaLines)}
  ${bodyHtml}

  <div class="sign-block">
    <div class="sign-col">
      <div class="sign-line"></div>
      <p class="sign-label">Reported By: ${escapeHtml(reportBy)}</p>
      <p class="sign-sub">Date: ${escapeHtml(dateLong)}</p>
    </div>
    <div class="sign-col right">
      <div class="sign-line"></div>
      <p class="sign-label">Authorized Signature &amp; Stamp</p>
      <p class="sign-sub">${escapeHtml(authName)}${authTitle ? ` (${escapeHtml(authTitle)})` : ''}</p>
    </div>
  </div>

  <div class="doc-footer-brand">
    <p class="org">Jazeera University — LOFO</p>
    <p class="contact">Lost &amp; Found Office · Mogadishu, Somalia · jazeerauniversity.edu.so</p>
  </div>
</body>
</html>`;
}

function preloadReportImageUrls(rows = [], maxMs = 2500) {
  const logoUrl = getAbsoluteLogoUrl();
  const urls = [
    logoUrl,
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
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
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
  try {
    doc.title = 'JU LOFO Report';
  } catch {
    /* ignore */
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 250);
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
    generatedBy: options.generatedBy,
    reportedBy: options.reportedBy,
    authorizedBy: options.authorizedBy,
    authorizedTitle: options.authorizedTitle,
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
        ['Users', view.summary.students],
        ['Admins', view.summary.admins],
        ['Total Items', view.summary.totalItems],
        ['Lost (still missing)', view.summary.lostItems],
        ['Found (returned)', view.summary.foundItems],
        ['Returned Items', view.summary.returnedItems],
        ['Pending Reports', view.summary.pendingReports],
        ['Ownership Claims', view.summary.totalClaims],
        ['Physical (office verify)', view.summary.physicalClaims ?? 0],
        ['Approved Claims', view.summary.approvedClaims ?? 0],
        ['Rejected Claims', view.summary.rejectedClaims ?? 0],
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
              `${row.count} report${row.count === 1 ? '' : 's'}`,
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

export function printSummaryReport(view, formatGeneratedAt, session = {}) {
  const { title, subtitle, generatedAt, metaLines, sections } = buildSummarySections(view, formatGeneratedAt);
  const adminName = session?.userName || session?.name || 'LOFO Administrator';
  const bodyHtml = sections
    .map(
      (section) =>
        `<h2 style="font-size:14px;margin:18px 0 8px;">${escapeHtml(section.heading)}</h2>` +
        `<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${section.rows
          .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
          .join('')}</tbody></table>`
    )
    .join('');
  const html = buildDocumentHtml({
    title,
    subtitle,
    generatedAt,
    generatedBy: adminName,
    reportedBy: adminName,
    authorizedBy: 'Lost & Found Office',
    authorizedTitle: 'Authorized Officer',
    metaLines,
    bodyHtml,
  });
  printHtmlDocument(html);
}

export function exportOfficialExecutivePdf(view, formatGeneratedAt, session = {}) {
  const summary = view.summary || {};
  const categories = view.categories || [];
  const topContributors = view.topContributors || [];
  const faculties = view.faculties || [];
  const generatedTimeStr = formatGeneratedAt(view.generatedAt || new Date());
  const refNo = `JU-LOFO-EXEC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 899)}`;
  const adminName = session?.userName || 'JU LOFO System Administrator';

  const categoryRowsHtml = categories.length
    ? categories
        .map((cat) => {
          const retRate = cat.count > 0 ? Math.round(((cat.returned || 0) / cat.count) * 100) : 0;
          return `
          <tr>
            <td style="font-weight:700;">${escapeHtml(cat.name)}</td>
            <td style="text-align:center;">${cat.count}</td>
            <td style="text-align:center;color:#047857;font-weight:700;">${cat.returned || 0}</td>
            <td style="text-align:center;">
              <div style="display:inline-block;padding:2px 8px;border-radius:12px;background:#f0fdf4;color:#15803d;font-weight:800;font-size:11px;">
                ${retRate}%
              </div>
            </td>
          </tr>`;
        })
        .join('')
    : `<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No category data available</td></tr>`;

  const contributorRowsHtml = topContributors.length
    ? topContributors
        .slice(0, 10)
        .map((user, idx) => `
          <tr>
            <td style="text-align:center;font-weight:800;color:#64748b;">#${idx + 1}</td>
            <td style="font-weight:700;">${escapeHtml(user.name || 'Unknown')}</td>
            <td style="font-size:11px;color:#475569;">${escapeHtml(user.studentId || '—')}</td>
            <td style="font-size:11px;color:#475569;">${escapeHtml(user.faculty || 'Unassigned')}</td>
            <td style="text-align:center;font-weight:800;color:#1e40af;">${user.count}</td>
          </tr>`)
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No contributor records found</td></tr>`;

  const facultyRowsHtml = faculties.length
    ? faculties
        .map((fac) => `
          <tr>
            <td style="font-weight:700;">${escapeHtml(fac.name)}</td>
            <td style="text-align:center;font-weight:800;color:#0f172a;">${fac.count}</td>
          </tr>`)
        .join('')
    : `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">Unassigned (${summary.students || 0})</td></tr>`;

  const logoUrl = getAbsoluteLogoUrl();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <base href="${origin}/" />
  <title>Official Executive Report — Jazeera University LOFO</title>
  <style>
    @page { size: A4; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 12mm 14mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-banner {
      background: #ffffff;
      color: #0f172a;
      padding: 14px 0 18px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .header-branding {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-box {
      width: 64px;
      height: 64px;
      background: #ffffff;
      border-radius: 14px;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
    }
    .logo-box img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header-title-text h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #0f172a;
    }
    .header-title-text p {
      margin: 3px 0 0;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .badge-exec {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    
    .meta-audit-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .meta-item label {
      display: block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
      margin-bottom: 3px;
    }
    .meta-item .val {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    .kpi-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }
    .kpi-box.emerald { border-top: 4px solid #10b981; }
    .kpi-box.blue { border-top: 4px solid #1A56DB; }
    .kpi-box.purple { border-top: 4px solid #8b5cf6; }
    .kpi-box.amber { border-top: 4px solid #f59e0b; }
    .kpi-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .kpi-num {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-sub {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #1e293b;
      margin: 24px 0 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 20px;
    }
    th {
      background: #ffffff;
      color: #334155;
      font-weight: 800;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 9px 12px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }

    .signatures-block {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px dashed #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr 160px;
      gap: 20px;
      align-items: flex-end;
    }
    .sign-box p.title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 36px;
    }
    .sign-box p.line {
      border-bottom: 1.5px solid #64748b;
      margin: 0 0 6px;
    }
    .sign-box p.role {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      margin: 0;
    }

    .seal-badge {
      border: 2.5px double #046A38;
      border-radius: 50%;
      width: 100px;
      height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 6px;
      color: #046A38;
      margin: 0 auto;
    }
    .seal-badge .s-top { font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
    .seal-badge .s-mid { font-size: 11px; font-weight: 900; margin: 2px 0; }
    .seal-badge .s-bot { font-size: 7px; font-weight: 800; text-transform: uppercase; }

    .doc-footer {
      margin-top: 25px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div class="header-branding">
      <div class="logo-box">
        <img src="${logoUrl}" alt="JU Logo" />
      </div>
      <div class="header-title-text">
        <h1>Jazeera University — LOFO</h1>
        <p>Office of Campus Services & Property Registry</p>
      </div>
    </div>
    <div class="badge-exec">Official Audit Report</div>
  </div>

  <div class="meta-audit-card">
    <div class="meta-item">
      <label>Report Reference</label>
      <span class="val">${escapeHtml(refNo)}</span>
    </div>
    <div class="meta-item">
      <label>Date Issued</label>
      <span class="val">${escapeHtml(generatedTimeStr)}</span>
    </div>
    <div class="meta-item">
      <label>Issued By Admin</label>
      <span class="val">${escapeHtml(adminName)}</span>
    </div>
    <div class="meta-item">
      <label>Security Status</label>
      <span class="val" style="color:#047857;">CONFIDENTIAL / VERIFIED</span>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box blue">
      <div class="kpi-label">Total Inventory</div>
      <div class="kpi-num">${summary.totalItems || 0}</div>
      <div class="kpi-sub">${summary.lostItems || 0} still missing · ${summary.foundItems || 0} found (returned)</div>
    </div>
    <div class="kpi-box emerald">
      <div class="kpi-label">Returned to Owners</div>
      <div class="kpi-num">${summary.returnedItems || 0}</div>
      <div class="kpi-sub">Successfully Restored</div>
    </div>
    <div class="kpi-box purple">
      <div class="kpi-label">System Recovery Rate</div>
      <div class="kpi-num">${summary.recoveryRate || 0}%</div>
      <div class="kpi-sub">Overall Return Efficiency</div>
    </div>
    <div class="kpi-box amber">
      <div class="kpi-label">Campus User Directory</div>
      <div class="kpi-num">${summary.totalUsers || 0}</div>
      <div class="kpi-sub">${summary.students || 0} Users registered</div>
    </div>
  </div>

  <div class="section-title">
    <span>1. Category Performance & Inventory Distribution</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Category Name</th>
        <th style="text-align:center;">Total Items Registered</th>
        <th style="text-align:center;">Returned to Owners</th>
        <th style="text-align:center;">Recovery Success Rate %</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRowsHtml}
    </tbody>
  </table>

  <div class="section-title">
    <span>2. Top Reporter Contributions</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:center;">Rank</th>
        <th>Reporter name</th>
        <th>ID</th>
        <th>Faculty / Department</th>
        <th style="text-align:center;">Total Reports</th>
      </tr>
    </thead>
    <tbody>
      ${contributorRowsHtml}
    </tbody>
  </table>

  <div class="section-title">
    <span>3. Faculty Distribution Summary</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Faculty / Department Name</th>
        <th style="text-align:center;">Registered users</th>
      </tr>
    </thead>
    <tbody>
      ${facultyRowsHtml}
    </tbody>
  </table>

  <div class="signatures-block">
    <div class="sign-box">
      <p class="title">Prepared & Verified By:</p>
      <p class="line"></p>
      <p class="role">${escapeHtml(adminName)}<br/>Lost & Found Office Administrator</p>
    </div>
    <div class="sign-box">
      <p class="title">Approved For Management:</p>
      <p class="line"></p>
      <p class="role">Campus Affairs / Security Director<br/>Jazeera University Administration</p>
    </div>
    <div>
      <div class="seal-badge">
        <div class="s-top">Jazeera University</div>
        <div class="s-mid">LOFO</div>
        <div class="s-bot">Official Seal</div>
      </div>
    </div>
  </div>

  <div class="doc-footer">
    Jazeera University Item Recovery System (LOFO) · Generated on ${escapeHtml(generatedTimeStr)} · Document Ref: ${escapeHtml(refNo)}
  </div>
</body>
</html>`;

  printHtmlDocument(documentHtml);
}
