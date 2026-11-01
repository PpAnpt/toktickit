/**
 * Builds the Lab 4 submission PDF ("Answer Part 1" to "Answer Part 9") from docs/lab-04/submission-report.md.
 *
 *   npm run report:lab4   ->  docs/lab-04/lab-04-report.pdf   (generated; attach it to the submission, it is not committed)
 *
 * In the Markdown source, a line `{{include docs/lab-04/tests.md}}` is replaced by that file rendered in place,
 * and an image `![caption](artifacts/...png)` is embedded from the repository so the PDF is self-contained.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { marked } from 'marked';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'docs/lab-04/submission-report.md';
const OUT_PDF = path.join(ROOT, 'docs/lab-04/lab-04-report.pdf');
const REPO = 'https://github.com/PpAnpt/toktickit';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

function renderer({ shift }) {
  const r = new marked.Renderer();
  r.heading = function ({ tokens, depth }) {
    const level = Math.min(depth + shift, 6);
    return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`;
  };
  r.link = function ({ href, tokens }) {
    const url = /^(https?:|#|mailto:)/.test(href) ? href : `${REPO}/blob/main/${href.replace(/^\.?\//, '')}`;
    return `<a href="${url}">${this.parser.parseInline(tokens)}</a>`;
  };
  r.image = ({ href, text }) => {
    // image paths in the Markdown are relative to docs/lab-04 (so they also work in the GitHub preview)
    const abs = path.resolve(ROOT, "docs/lab-04", href);
    if (!fs.existsSync(abs)) throw new Error(`Missing image: ${href}`);
    href = path.relative(ROOT, abs).split(path.sep).join('/');
    return `<figure><div class="frame"><img src="${pathToFileURL(abs).href}"/></div><figcaption>${text}<br><span class="path">${href} (top part shown when the page is long; the full image is in the repository)</span></figcaption></figure>`;
  };
  return r;
}

const html = (md, shift) => marked.parse(md, { renderer: renderer({ shift }), gfm: true });

function expandIncludes(md) {
  return md.replace(/^\{\{include (.+?)\}\}$/gm, (_, rel) => {
    const body = html(read(rel), 2);
    return `\n<div class="included"><div class="src">Rendered from <a href="${REPO}/blob/main/${rel}">${rel}</a></div>${body}</div>\n`;
  });
}

const css = `
  @page { size: A4; margin: 14mm 12mm; }
  body { font-family: "Segoe UI", "Leelawadee UI", "Tahoma", Arial, sans-serif; font-size: 10pt; line-height: 1.45; color: #1f2937; }
  h1 { color: #006B3C; border-bottom: 2px solid #006B3C; padding-bottom: 4px; page-break-before: always; font-size: 17pt; }
  h1:first-of-type { page-break-before: avoid; }
  h2 { color: #006B3C; font-size: 13pt; margin-top: 16px; } h3 { font-size: 11pt; } h4, h5 { font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 8.4pt; page-break-inside: auto; }
  th, td { border: 1px solid #cbd5d0; padding: 3px 5px; vertical-align: top; word-break: break-word; }
  th { background: #e6f0eb; text-align: left; } tr { page-break-inside: avoid; }
  code { background: #f1f5f3; padding: 0 3px; border-radius: 3px; font-size: 90%; } pre { background: #f1f5f3; padding: 6px; font-size: 8pt; white-space: pre-wrap; border-radius: 4px; }
  pre code { background: none; padding: 0; }
  a { color: #0B5ED7; }
  figure { margin: 8px 0; page-break-inside: avoid; text-align: center; } .frame { overflow: hidden; max-height: 175mm; border: 1px solid #cbd5d0; } figure img { display: block; width: 100%; }
  figcaption { font-size: 8pt; color: #4b5563; } .path { color: #6b7280; font-family: monospace; font-size: 7pt; }
  .included { border-left: 3px solid #0B7A46; padding-left: 8px; margin: 10px 0; } .src { font-size: 8pt; color: #6b7280; margin-bottom: 4px; }
  .included h3, .included h4 { color: #006B3C; }
  .pair { display: flex; gap: 6px; } .pair figure { flex: 1; min-width: 0; } .pair .frame { max-height: 150mm; }
`;

// two images between ':::pair' and ':::' are laid out side by side
const md = expandIncludes(read(SOURCE))
  .replace(/^:::pair$/gm, '\n<div class="pair">\n')
  .replace(/^:::$/gm, '\n</div>\n')
  .replace(/^(!\[.*\]\(.*\))$/gm, '$1\n');
const body = marked.parse(md, { renderer: renderer({ shift: 0 }), gfm: true });

const page = `<!doctype html><html lang="th"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const tmp = path.join(ROOT, 'test-results', 'lab-04-report.html');
fs.mkdirSync(path.dirname(tmp), { recursive: true });
fs.writeFileSync(tmp, page);

const browser = await chromium.launch();
const tab = await browser.newPage();
await tab.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
await tab.pdf({
  path: OUT_PDF, format: 'A4', printBackground: true, displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#6b7280">TokTickIT Lab 4 - 67070501049 - <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
  margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
});
await browser.close();
console.log(`Wrote ${path.relative(ROOT, OUT_PDF)}`);
