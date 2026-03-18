import { chromium } from 'playwright';
import { resolve } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';

const HTML_DIR = resolve(import.meta.dirname);
const PDF_DIR = resolve(HTML_DIR, '..', 'PDF');

const FILES = [
  'index.html',
  'am-s1.html',
  'am-s2.html',
  'am-s3.html',
  'am-s4.html',
  'pm-s1.html',
  'pm-s2.html',
  'pm-s3.html',
  'pm-s4.html',
];

// PDF資料用のスタイル上書き（HTMLは一切変更しない）
const PDF_OVERRIDE_CSS = `
/* ===== PDF配布資料用オーバーライド ===== */

/* ナビゲーション・ヘッダーを非表示 */
.site-header { display: none !important; }

/* ページ全体の文字サイズを縮小 */
html { font-size: 13px !important; }
body {
  font-size: 13px !important;
  line-height: 1.55 !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* コンテナ幅をPDF余白に合わせて広げる */
.wrapper {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* ヒーローセクションをコンパクトに */
.hero {
  padding: 18px 24px !important;
  margin-bottom: 12px !important;
}
.hero h1 {
  font-size: 18px !important;
  margin-bottom: 4px !important;
}
.hero .lead {
  font-size: 11px !important;
  margin: 0 !important;
}

/* セクション見出し */
section { margin-bottom: 16px !important; }
h2 {
  font-size: 15px !important;
  padding: 6px 12px !important;
  margin-bottom: 10px !important;
  page-break-after: avoid !important;
}
h3 {
  font-size: 13.5px !important;
  margin: 10px 0 6px !important;
  page-break-after: avoid !important;
}

/* 本文テキスト */
p {
  font-size: 12px !important;
  line-height: 1.5 !important;
  margin: 4px 0 !important;
}
li {
  font-size: 12px !important;
  line-height: 1.45 !important;
}
ul, ol {
  margin: 4px 0 !important;
  padding-left: 20px !important;
}

/* カード */
.card-grid {
  gap: 10px !important;
  margin: 8px 0 !important;
}
.card {
  padding: 10px 12px !important;
  page-break-inside: avoid !important;
}
.card h3 {
  font-size: 12.5px !important;
  margin-bottom: 4px !important;
}
.card p, .card li {
  font-size: 11px !important;
}

/* コールアウト */
.callout {
  padding: 10px 14px !important;
  margin: 8px 0 !important;
  font-size: 11.5px !important;
  page-break-inside: avoid !important;
}
.callout strong {
  font-size: 12px !important;
}

/* コードブロック */
.code-block {
  padding: 10px 12px !important;
  margin: 6px 0 !important;
  font-size: 10.5px !important;
  line-height: 1.4 !important;
  page-break-inside: avoid !important;
}
pre, code {
  font-size: 10.5px !important;
  line-height: 1.4 !important;
}

/* ディスク（演習ブロック） */
.disc {
  padding: 10px 14px !important;
  margin: 8px 0 !important;
  page-break-inside: avoid !important;
}
.disc-badge {
  font-size: 10px !important;
  padding: 2px 8px !important;
  margin-bottom: 6px !important;
}
.disc h3 {
  font-size: 13px !important;
  margin-bottom: 4px !important;
}
.disc p, .disc li {
  font-size: 11.5px !important;
}

/* フロー（ステップ） */
.flow {
  margin: 8px 0 !important;
  gap: 0 !important;
}
.flow .step {
  padding: 8px 12px !important;
  margin-bottom: 4px !important;
  font-size: 11.5px !important;
  page-break-inside: avoid !important;
}
.flow .step strong {
  font-size: 12px !important;
}

/* 水平フロー */
.h-flow {
  margin: 8px 0 !important;
  gap: 6px !important;
  page-break-inside: avoid !important;
}
.h-flow .box {
  padding: 8px 10px !important;
  font-size: 11px !important;
}
.h-flow .arr {
  font-size: 14px !important;
}

/* テーブル */
table {
  font-size: 11px !important;
  margin: 6px 0 !important;
  page-break-inside: avoid !important;
}
th, td {
  padding: 5px 8px !important;
}
th {
  font-size: 11px !important;
}

/* reveal-wrapは全て展開 */
.reveal-wrap { border: none !important; }
.reveal-btn { display: none !important; }
.reveal-content {
  display: block !important;
  padding: 8px 12px !important;
  border-top: none !important;
}

/* 参考リンクセクション */
.ref-section {
  padding: 10px 14px !important;
  margin: 8px 0 !important;
}
.ref-section h3 {
  font-size: 12px !important;
  margin-bottom: 6px !important;
}
.ref-link {
  font-size: 11px !important;
  padding: 4px 0 !important;
}

/* フッター */
.site-footer {
  margin-top: 16px !important;
  padding: 12px 0 !important;
  font-size: 10px !important;
}
.site-footer nav {
  display: none !important;
}

/* ページ区切り制御 */
section { page-break-before: auto; }
h2, h3 { page-break-after: avoid !important; }
.disc, .callout, .card, .code-block, .flow .step, .h-flow, table {
  page-break-inside: avoid !important;
}

/* index.html のタイムテーブル調整 */
.timetable {
  font-size: 11px !important;
  page-break-inside: avoid !important;
}
.timetable th, .timetable td {
  padding: 4px 8px !important;
}

/* 印刷時の背景色を強制保持 */
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
`;

// セッション区切りページ（セクション間に挿入）
const SECTION_LABELS = {
  'index.html': null, // 表紙扱い、区切り不要
  'am-s1.html': '午前の部  Session 01',
  'am-s2.html': '午前の部  Session 02',
  'am-s3.html': '午前の部  Session 03',
  'am-s4.html': '午前の部  Session 04',
  'pm-s1.html': '午後の部  Session 01',
  'pm-s2.html': '午後の部  Session 02',
  'pm-s3.html': '午後の部  Session 03',
  'pm-s4.html': '午後の部  Session 04',
};

async function generateSinglePdf(context, htmlPath, pdfPath) {
  const page = await context.newPage();

  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  // PDF用CSSを注入（HTMLファイルは変更しない）
  await page.addStyleTag({ content: PDF_OVERRIDE_CSS });

  // reveal-content展開 + sticky header解除
  await page.evaluate(() => {
    document.querySelectorAll('.reveal-content').forEach(el => {
      el.style.display = 'block';
    });
    document.querySelectorAll('.reveal-btn').forEach(el => {
      el.style.display = 'none';
    });
    const header = document.querySelector('.site-header');
    if (header) header.style.display = 'none';
  });

  // 少し待って再レイアウトを安定させる
  await page.waitForTimeout(300);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '14mm',
      bottom: '14mm',
      left: '14mm',
      right: '14mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%;text-align:right;font-size:7px;color:#aaa;font-family:sans-serif;padding:0 14mm">
        CTCテクノロジー AI活用技術研修
      </div>
    `,
    footerTemplate: `
      <div style="width:100%;text-align:center;font-size:7.5px;color:#999;font-family:sans-serif;padding:0 14mm">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
  });

  await page.close();
}

// セッション区切りページのPDFを生成
async function generateDividerPdf(context, label, pdfPath) {
  const page = await context.newPage();

  const dividerHtml = `
    <!DOCTYPE html>
    <html lang="ja">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
      <div style="text-align:center;">
        <div style="font-size:13px;color:#2563EB;font-weight:600;letter-spacing:3px;margin-bottom:12px;">
          ${label.split('  ')[0]}
        </div>
        <div style="font-size:28px;font-weight:700;color:#1e293b;letter-spacing:1px;">
          ${label.split('  ')[1]}
        </div>
        <div style="width:48px;height:3px;background:#2563EB;margin:16px auto 0;border-radius:2px;"></div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(dividerHtml, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: false,
  });

  await page.close();
}

async function main() {
  await mkdir(PDF_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'light' });

  const partPdfs = [];

  for (const file of FILES) {
    const htmlPath = resolve(HTML_DIR, file);
    const label = SECTION_LABELS[file];

    // セッション区切りページを生成
    if (label) {
      const dividerPath = resolve(PDF_DIR, `_divider_${file.replace('.html', '.pdf')}`);
      await generateDividerPdf(context, label, dividerPath);
      partPdfs.push(dividerPath);
      console.log(`  divider: ${label}`);
    }

    // 本体PDFを生成
    const pdfPath = resolve(PDF_DIR, file.replace('.html', '.pdf'));
    await generateSinglePdf(context, htmlPath, pdfPath);
    partPdfs.push(pdfPath);
    console.log(`  ${file.replace('.html', '.pdf')} OK`);
  }

  await browser.close();

  // pdfuniteで結合
  const outputPath = resolve(PDF_DIR, 'CTCT_AI活用技術研修_全資料.pdf');
  const inputs = partPdfs.map(p => `"${p}"`).join(' ');
  execSync(`pdfunite ${inputs} "${outputPath}"`);

  // 区切りページの一時ファイルを削除
  for (const p of partPdfs) {
    if (p.includes('_divider_')) {
      execSync(`rm "${p}"`);
    }
  }

  console.log(`\n結合PDF生成完了: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
