/**
 * Builds the Lab 3 submission PDF (Answer Part 1–9) from the repository docs and screenshots.
 *
 *   npm run report        →  docs/lab-03/lab-03-report.pdf
 *
 * Evidence that can only be captured outside this script is read from
 * artifacts/lab-03/screenshots/submission/. Drop a PNG there with one of the names in
 * SUBMISSION_IMAGES and run the script again: the image replaces its placeholder box.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { marked } from 'marked';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PDF = path.join(ROOT, 'docs/lab-03/lab-03-report.pdf');
const SHOTS = path.join(ROOT, 'artifacts/lab-03/screenshots');
const REPO = 'https://github.com/PpAnpt/toktickit';
const DOCS_URL = `${REPO}/blob/main/docs/lab-03`;
const ISSUES_REPO = 'https://github.com/PpAnpt/Lab1-TokTickIT';
const BOARD_URL = 'https://github.com/users/PpAnpt/projects/3';

// ---- Report details (edit, then run `npm run report` again) -------------------------
const META = {
  student: 'Anapat Banjerdsilp',
  studentId: '67070501049',
  section: '',              // e.g. '1', '2', 'HS', '31', '32'
  github: '@PpAnpt',
  reviewer: 'ศิวรักษ์ ฉัตรวิชัย (Siwarak Chatvichai) — @BBINGOAL — 67070501086',
  releasePr: '27',          // lab3-staging → main
};

// Optional evidence images, placed in artifacts/lab-03/screenshots/submission/
const SUBMISSION_IMAGES = {
  gitGraphMain: 'git-graph-main.png',
  kanban: 'kanban-board.png',
  testsOnMain: 'tests-on-main.png',
};

// Pull requests of the Lab 3 branch flow (from GitHub)
const PRS = [
  { n: 18, branch: 'feature/1-specs-contract', title: 'docs: add Lab 3 specifications, test plan, UI guidelines…', issue: 11, created: '2026-09-13', merged: '2026-09-13', review: 'ครบถ้วนครับ เรียบร้อยครับ' },
  { n: 19, branch: 'feature/lab3-2-auth-foundation', title: 'Feature/lab3 2 auth foundation', issue: 12, created: '2026-09-18', merged: '2026-09-18', review: 'โอ้โห้ ครบถ้วนทุกส่วนเลยครับ เรียบร้อยมากครับ' },
  { n: 20, branch: 'feature/lab3-3-staff-queue', title: 'Feature/lab3 3 staff queue', issue: 13, created: '2026-09-19', merged: '2026-09-19', review: 'ตรวจสอบโค้ด Staff Queue API, UI และ Unit Tests แล้ว ผ่านครบถ้วนตาม spec ครับ' },
  { n: 21, branch: 'feature/lab3-4-staff-operation', title: 'Feature/lab3 4 staff operation', issue: 14, created: '2026-09-19', merged: '2026-09-19', review: 'Status transition matrix และ RBAC comments/notes ทำงานถูกต้องตาม spec ครับ' },
  { n: 22, branch: 'feature/lab3-5-admin-user-management', title: 'Feature/lab3 5 admin user management', issue: 15, created: '2026-09-19', merged: '2026-09-19', review: 'ถูกต้องครบถ้วน เทสผ่านหมดครับ' },
  { n: 23, branch: 'feature/lab3-6-e2e-regression-release', title: 'Feature/lab3 6 e2e regression release', issue: 16, created: '2026-09-19', merged: '2026-09-19', review: 'ครบถ้วนเรียบร้อยดีครับ' },
  { n: 24, branch: 'feature/lab3-7-security-hardening', title: 'Feature/lab3 7 security hardening', issue: 17, created: '2026-10-04', merged: '2026-10-04', review: 'เรียบร้อยครับ' },
  { n: 25, branch: 'feature/lab3-8-release-docs', title: 'Feature/lab3 8 release docs', issue: 18, created: '2026-10-04', merged: '2026-10-04', review: 'เรียบร้อยดีครับ' },
  { n: 26, branch: 'feature/lab3-9-release-prep', title: 'Feature/lab3 9 release prep', issue: 18, created: '2026-10-04', merged: '2026-10-04', review: '', note: 'Merged โดย @PpAnpt (ไม่มี review)' },
  { n: 27, branch: 'lab3-staging → main (release)', title: 'Release: Lab 3 lab3-staging → main', issue: 18, created: '2026-10-04', merged: '2026-10-04', review: '', note: 'Merged โดย @PpAnpt (ไม่มี review)' },
];

// ---- Helpers ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const fileUrl = (abs) => pathToFileURL(abs).href;
const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();

/** Renders a repository Markdown file; its headings start below the "Answer Part" level. */
function renderDoc(rel, { shift = 2 } = {}) {
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const level = Math.min(depth + shift, 6);
    return `<h${level} class="doc-h">${this.parser.parseInline(tokens)}</h${level}>`;
  };
  renderer.link = function ({ href, tokens }) {
    let url = href;
    if (!/^https?:|^#|^mailto:/.test(href)) {
      url = href.startsWith('./') || !href.includes('/') ? `${DOCS_URL}/${href.replace(/^\.\//, '')}` : `${REPO}/blob/main/${href.replace(/^\//, '')}`;
    }
    return `<a href="${url}">${this.parser.parseInline(tokens)}</a>`;
  };
  // Image placeholders inside the submission draft are not used here
  renderer.image = ({ text }) => `<span class="muted">[${esc(text)}]</span>`;
  const html = marked.parse(read(rel), { renderer, gfm: true });
  return `<div class="rendered">
    <div class="rendered-src">📄 Rendered from <a href="${REPO}/blob/main/${rel}">${rel}</a></div>
    ${html}
  </div>`;
}

/** A screenshot, cropped to `crop` source pixels from the top when the page is long. */
function shot(rel, caption, { crop, width = 100 } = {}) {
  const abs = path.join(SHOTS, rel);
  if (!fs.existsSync(abs)) throw new Error(`Missing screenshot: ${rel}`);
  const buf = fs.readFileSync(abs);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const visible = crop && crop < h ? crop : h;
  const cropped = visible < h;
  return `<figure class="shot" style="width:${width}%">
    <div class="frame" style="aspect-ratio:${w}/${visible}">
      <img src="${fileUrl(abs)}" style="height:${(h / visible) * 100}%"/>
    </div>
    <figcaption>${caption}<br><span class="path">artifacts/lab-03/screenshots/${rel}${cropped ? ' — แสดงส่วนบนของหน้า (ภาพเต็มอยู่ใน repository)' : ''}</span></figcaption>
  </figure>`;
}

const row = (...figs) => `<div class="row">${figs.join('')}</div>`;

/** An optional evidence image from screenshots/submission, or a clearly marked space. */
function slot(key, title, instructions, minHeight = 95) {
  const abs = path.join(SHOTS, 'submission', SUBMISSION_IMAGES[key]);
  if (fs.existsSync(abs)) {
    return `<figure class="shot"><div class="frame free"><img src="${fileUrl(abs)}"/></div><figcaption>${title}</figcaption></figure>`;
  }
  return `<div class="slot" style="min-height:${minHeight}mm">
    <div class="slot-title">📷 พื้นที่สำหรับแทรกภาพ: ${title}</div>
    <div class="slot-body">${instructions}</div>
    <div class="slot-file">วางไฟล์ภาพไว้ที่ <code>artifacts/lab-03/screenshots/submission/${SUBMISSION_IMAGES[key]}</code> แล้วรัน <code>npm run report</code> ภาพจะถูกใส่ในตำแหน่งนี้อัตโนมัติ</div>
  </div>`;
}

const pre = (text, cls = '') => `<pre class="${cls}">${esc(text)}</pre>`;
const blankOr = (v) => (v ? esc(v) : '<span class="fill">&nbsp;</span>');

// ---- Data from the repository ------------------------------------------------------------
const stagingGraph = git('log --graph --oneline -32 --format="%h %s" lab3-staging');
const gitignore = read('.gitignore');
const specCommit = git('log -1 --format="%h %ad" --date=format:"%Y-%m-%d %H:%M" 477a2d5');
const firstImplCommit = git('log -1 --format="%h %ad" --date=format:"%Y-%m-%d %H:%M" d3c4be8');
const repoTree = execSync('git ls-tree -r --name-only HEAD', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((f) => /^(docs\/lab-03|server\/tests\/lab-03|client\/src\/tests\/lab-03|e2e\/lab-03|server\/prisma\/migrations)\//.test(f) && !f.endsWith('.png'));
const shotDirs = fs.readdirSync(SHOTS).filter((d) => d !== 'submission' && fs.statSync(path.join(SHOTS, d)).isDirectory());

function treeText() {
  const groups = {};
  for (const f of repoTree) {
    const dir = f.replace(/\/[^/]+$/, '');
    (groups[dir] ||= []).push(f.slice(dir.length + 1));
  }
  const lines = [];
  for (const [dir, files] of Object.entries(groups)) {
    lines.push(`${dir}/`);
    files.forEach((f, i) => lines.push(`${i === files.length - 1 ? '└──' : '├──'} ${f}`));
  }
  lines.push('artifacts/lab-03/screenshots/');
  shotDirs.forEach((d, i) => {
    const n = fs.readdirSync(path.join(SHOTS, d)).length;
    lines.push(`${i === shotDirs.length - 1 ? '└──' : '├──'} ${d}/  (${n} ภาพ)`);
  });
  return lines.join('\n');
}

const KANBAN = [
  [11, '[Lab 3] Sprint Specification & Test Plan', 18, 'Done'],
  [12, '[Lab 3] Authentication Foundation & Mandatory Password Change', 19, 'Done'],
  [13, '[Lab 3] IT Staff Ticket Queue', 20, 'Done'],
  [14, '[Lab 3] IT Staff Ticket Operations & Discussion Threads', 21, 'Done'],
  [15, '[Lab 3] Administrator User Management & Safety Rules', 22, 'Done'],
  [16, '[Lab 3] E2E Regression, Visual Inspection & Final Release', 23, 'Done'],
  [17, '[Lab 3] Security Hardening, Lab 3 Migration & Requester Public Comments', 24, 'Done'],
  [18, '[Lab 3] Release Documentation & Integration to main', 27, 'Done'],
  [19, '[Lab 3] Final Submission Evidence & Documentation Sync', 29, 'Done'],
];

const API_EVIDENCE = `# Ticket TKT-2026-000001 (id=1) belongs to David Lee (Requester)
GET   /api/tickets (no token)                                -> 401 {"error":"Authentication required"}
GET   /api/tickets (only header X-Requester-Id: 1)           -> 401 {"error":"Authentication required"}
GET   /api/tickets/1 (Jennifer, not the owner)               -> 404 {"error":"Ticket not found."}
GET   /api/tickets/1/comments (Jennifer, not the owner)      -> 404 {"error":"Ticket not found"}
GET   /api/tickets/1/internal-notes (David, Requester)       -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/staff/tickets (David, Requester)                  -> 403 {"error":"Access denied: insufficient permissions"}
PATCH /api/staff/tickets/1/status (David, Requester)         -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/admin/users (Sarah, IT Staff)                     -> 403 {"error":"Access denied: insufficient permissions"}
POST  /api/tickets/1/indicate-resolved (Sarah, IT Staff)     -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/tickets/1/internal-notes (Sarah, IT Staff)        -> 200 [{"id":1,"content":"Known GPU driver bug with Thunderbolt dock…
POST  /api/auth/logout (David)                               -> 200 {"message":"Logged out successfully"}
GET   /api/tickets (David's old token after logout)          -> 401 {"error":"Invalid or expired authentication token"}`;

// ---- Sections ----------------------------------------------------------------------------
const cover = `
<section class="cover">
  <div class="cover-course">CPE 334 Introduction to Software Engineering in the Age of AI Agents<br>Semester 1/2026</div>
  <h1 class="cover-title">Lab 3 Report</h1>
  <div class="cover-sub">TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens</div>
  <table class="meta">
    <tr><th>ผู้จัดทำ</th><td>${esc(META.student)}</td></tr>
    <tr><th>รหัสนักศึกษา</th><td>${blankOr(META.studentId)}</td></tr>
    <tr><th>Section</th><td>${blankOr(META.section)}</td></tr>
    <tr><th>GitHub</th><td>${esc(META.github)}</td></tr>
    <tr><th>Repository</th><td><a href="${REPO}">${REPO}</a></td></tr>
    <tr><th>Issues / Kanban</th><td><a href="${ISSUES_REPO}/issues">${ISSUES_REPO}/issues</a><br><a href="${BOARD_URL}">${BOARD_URL}</a></td></tr>
    <tr><th>Branches</th><td>feature/* → <code>lab3-staging</code> → <code>main</code></td></tr>
    <tr><th>Peer reviewer</th><td>${esc(META.reviewer)}</td></tr>
  </table>
  <h3 class="toc-h">สารบัญ</h3>
  <table class="toc">
    <tr><th>Part</th><th>หัวข้อ</th><th>คะแนน</th></tr>
    <tr><td>1</td><td>Git Use with Engineering Workflow</td><td>10</td></tr>
    <tr><td>2</td><td>Spec DD</td><td>5</td></tr>
    <tr><td>3</td><td>Test DD and Traceability</td><td>10</td></tr>
    <tr><td>4</td><td>AI Use with Reflection</td><td>5</td></tr>
    <tr><td>5</td><td>Working Login and Password Change UI</td><td>5</td></tr>
    <tr><td>6</td><td>Working IT Staff Ticket Queue UI</td><td>5</td></tr>
    <tr><td>7</td><td>Working IT Staff Ticket Detail UI</td><td>10</td></tr>
    <tr><td>8</td><td>Working Administrator User Management UI</td><td>5</td></tr>
    <tr><td>9</td><td>Zen Green UI and Responsive Evidence</td><td>5</td></tr>
  </table>
  <p class="note">Repository และ branch <code>main</code> เป็นแหล่งข้อมูลหลัก (source of truth) ลิงก์ในรายงานชี้ไปที่ GitHub ทั้งหมด</p>
</section>`;

const part1 = `
<section class="part">
<h1>Answer Part 1: Git Use with Engineering Workflow</h1>

<h2>1.1 Branch Flow และ Commit History</h2>
<p>งาน Lab 3 แบ่งเป็น feature branch ตาม Issue แต่ละ branch เปิด Pull Request เข้า <code>lab3-staging</code> ผ่านการ review และ approve โดย @BBINGOAL ก่อน merge จากนั้นจึงรวม <code>lab3-staging</code> เข้า <code>main</code></p>
${pre(`main
 └── lab3-staging
      ├── feature/1-specs-contract               PR #18  (Issue #11)  Merged 2026-09-13
      ├── feature/lab3-2-auth-foundation         PR #19  (Issue #12)  Merged 2026-09-18
      ├── feature/lab3-3-staff-queue             PR #20  (Issue #13)  Merged 2026-09-19
      ├── feature/lab3-4-staff-operation         PR #21  (Issue #14)  Merged 2026-09-19
      ├── feature/lab3-5-admin-user-management   PR #22  (Issue #15)  Merged 2026-09-19
      ├── feature/lab3-6-e2e-regression-release  PR #23  (Issue #16)  Merged 2026-09-19
      ├── feature/lab3-7-security-hardening      PR #24  (Issue #17)  Merged 2026-10-04
      ├── feature/lab3-8-release-docs            PR #25  (Issue #18)  Merged 2026-10-04
      └── feature/lab3-9-release-prep            PR #26  (Issue #18)  Merged 2026-10-04
 lab3-staging → main                             PR #${META.releasePr || '___'}  (Issue #18)  Merged 2026-10-04
      └── feature/lab3-10-submission-evidence    PR #28  (Issue #19)
 lab3-staging → main                             PR #29  (Issue #19)`, 'tree')}

<h3>Git graph ของ <code>lab3-staging</code> (feature branches ที่ merge ผ่าน Pull Request)</h3>
${pre(stagingGraph, 'graph')}

<h3>Git graph หลัง merge <code>lab3-staging</code> เข้า <code>main</code></h3>
${slot('gitGraphMain', 'Git graph หลัง merge lab3-staging เข้า main',
  `หลัง release PR merge แล้ว ให้รัน <code>git checkout main &amp;&amp; git pull</code> และ <code>git log --graph --oneline -25 main</code> แล้วแคปหน้าจอ Terminal หรือแคป Network graph จาก GitHub (Insights → Network) ให้เห็น merge commit ของ <code>lab3-staging</code> เข้า <code>main</code>`, 110)}

<h2>1.2 GitHub Project (Kanban) และ Issues</h2>
<p>Kanban board: <a href="${BOARD_URL}">TokTickIT Individual Sprints</a> — สถานะ Backlog → Specified → Started → PR Review → Fixing → Done<br>
Issue ของ Lab 3 อยู่ใน repository <a href="${ISSUES_REPO}/issues">PpAnpt/Lab1-TokTickIT</a> แต่ละ Issue มีเกณฑ์ <code>AC 1, AC 2, …</code> และเชื่อมกับ Pull Request ใน <code>PpAnpt/toktickit</code></p>
<table>
  <tr><th>Issue</th><th>งาน</th><th>Pull Request</th><th>สถานะบน Kanban</th></tr>
  ${KANBAN.map(([n, t, pr, s]) => `<tr><td><a href="${ISSUES_REPO}/issues/${n}">#${n}</a></td><td>${esc(t)}</td><td><a href="${REPO}/pull/${pr}">#${pr}</a></td><td>${s}</td></tr>`).join('')}
</table>
${slot('kanban', 'GitHub Project (Kanban) board ที่ Issue ของ Lab 3 ทั้งหมดอยู่ในคอลัมน์ Done',
  `เปิด <a href="${BOARD_URL}">${BOARD_URL}</a> แล้วแคปหน้าจอให้เห็นคอลัมน์ Done ที่มี Issue #11–#19`, 90)}

<h2>1.3 Peer Review (reviewer.md)</h2>
<table>
  <tr><th>PR</th><th>Branch → base</th><th>สร้าง</th><th>Merge</th><th>ความเห็น Reviewer (@BBINGOAL)</th></tr>
  ${PRS.map((p) => `<tr><td><a href="${REPO}/pull/${p.n}">#${p.n}</a></td><td><code>${esc(p.branch)}</code></td><td>${p.created}</td><td>${p.merged || 'รอ merge'}</td><td>${p.review ? esc(p.review) + ' <b>(Approved)</b>' : esc(p.note || '—')}</td></tr>`).join('')}
</table>
${renderDoc('docs/lab-03/reviewer.md')}

<h2>1.4 README และ .gitignore</h2>
<p><a href="${REPO}/blob/main/README.md">README.md</a> อธิบายฟีเจอร์ของ Lab 3, โครงสร้างโปรเจกต์, การติดตั้ง (<code>prisma migrate deploy</code> + seed), คำสั่งทดสอบ, บัญชีทดสอบสำหรับ local development และลิงก์เอกสาร Lab 3 ทั้งหมด
ไฟล์ <code>.gitignore</code> ป้องกันไม่ให้ไฟล์ <code>.env</code> (เช่น <code>JWT_SECRET</code>), dependencies, ไฟล์แนบที่อัปโหลด และผลการทดสอบ ถูก commit ขึ้น repository</p>
<div class="two-col">
  <div><h3>.gitignore</h3>${pre(gitignore, 'small')}</div>
  <div><h3>หัวข้อใน README.md</h3>${pre(read('README.md').split('\n').filter((l) => /^#{1,3} /.test(l)).join('\n'), 'small')}</div>
</div>

<h2>1.5 โครงสร้าง Repository (Lab Sheet §12)</h2>
${pre(treeText(), 'small keep')}
</section>`;

const part2 = `
<section class="part">
<h1>Answer Part 2: Spec DD</h1>
<p>ลิงก์: <a href="${DOCS_URL}/specification.md">docs/lab-03/specification.md</a> — ประกอบด้วย Functional Requirements FR-01–FR-14, Business Rules BR-01–BR-29, Role Authorization Matrix, Ticket Status Transition Matrix, Data Changes และ Migration, API Contract, Acceptance Criteria AC-01–AC-30, Definition of Done และ Assumptions &amp; Decisions</p>

<h2>หลักฐานว่า Specification มีอยู่ก่อน Implementation</h2>
<table>
  <tr><th>เหตุการณ์</th><th>หลักฐาน</th><th>วันที่</th></tr>
  <tr><td>Commit specification, tests, ui-spec, api-spec</td><td><code>${esc(specCommit.split(' ')[0])}</code> docs: add Lab 3 specifications, test plan, UI guidelines…</td><td>${esc(specCommit.split(' ').slice(1).join(' '))}</td></tr>
  <tr><td>Specification PR approved และ merged</td><td><a href="${REPO}/pull/18">PR #18</a></td><td>2026-09-13</td></tr>
  <tr><td>Commit implementation แรก (Prisma schema)</td><td><code>${esc(firstImplCommit.split(' ')[0])}</code> feat: add Prisma database schema and server dependencies</td><td>${esc(firstImplCommit.split(' ').slice(1).join(' '))}</td></tr>
  <tr><td>Implementation PR แรกเปิด</td><td><a href="${REPO}/pull/19">PR #19</a></td><td>2026-09-18</td></tr>
  <tr><td>Revision v1.1 หลังตรวจทานเทียบ Lab Sheet</td><td><a href="${REPO}/pull/24">PR #24</a> (มีบันทึกใน §12 Revision History)</td><td>2026-10-04</td></tr>
</table>
${renderDoc('docs/lab-03/specification.md')}
</section>`;

const part3 = `
<section class="part">
<h1>Answer Part 3: Test DD and Traceability</h1>
<p>ลิงก์: <a href="${DOCS_URL}/tests.md">docs/lab-03/tests.md</a> — แผนการทดสอบครอบคลุม API/Integration, Security/Authorization, Migration, UI Component, E2E, Visual/Responsive และ Accessibility พร้อมตาราง Traceability AC-01–AC-30, path ของไฟล์เทสต์ และผลลัพธ์สุดท้าย</p>
<table class="summary">
  <tr><th>ชุดทดสอบ</th><th>เครื่องมือ</th><th>ผล</th></tr>
  <tr><td>Server: API, security/authorization, Lab 1–2 regression</td><td>Vitest + Supertest</td><td><b>121 / 121 passed</b></td></tr>
  <tr><td>Client: UI components</td><td>Vitest + React Testing Library</td><td><b>40 / 40 passed</b></td></tr>
  <tr><td>End-to-end</td><td>Playwright (Chromium)</td><td><b>7 / 7 passed</b></td></tr>
  <tr><td>Migration (Lab 2 → Lab 3) และ seed</td><td>Prisma migrate + SQL</td><td><b>Pass</b> (schema diff ว่าง, ข้อมูล Lab 2 ครบ)</td></tr>
  <tr><td>Type-check และ production build</td><td>tsc, Vite</td><td><b>0 errors</b></td></tr>
</table>
${renderDoc('docs/lab-03/tests.md')}
<h2>ผลการทดสอบบน branch main</h2>
${slot('testsOnMain', 'ผลการรันชุดทดสอบทั้งหมดบน branch main',
  `หลัง merge เข้า <code>main</code> ให้รัน <code>git checkout main</code>, <code>npm --prefix server test</code>, <code>npm --prefix client test</code> และ <code>npx playwright test</code> แล้วแคปหน้าจอ Terminal ให้เห็นชื่อ branch และผล passed ทั้งสามชุด`, 110)}
</section>`;

const part4 = `
<section class="part">
<h1>Answer Part 4: AI Use with Reflection</h1>
<p>ลิงก์: <a href="${DOCS_URL}/ai-use.md">docs/lab-03/ai-use.md</a> — LLM ที่ใช้: Google Gemini (ผ่าน Antigravity IDE) สำหรับ specification และ implementation และ Claude Opus 5.5 (ผ่าน Claude Code) สำหรับการตรวจทานเทียบ Lab Sheet และแก้ไขข้อบกพร่อง</p>
${renderDoc('docs/lab-03/ai-use.md')}
</section>`;

const part5 = `
<section class="part">
<h1>Answer Part 5: Working Login and Password Change UI</h1>
<ul>
  <li><b>ข้อความผิดพลาดที่ปลอดภัย:</b> รหัสผ่านผิดและอีเมลที่ไม่มีในระบบได้ข้อความเดียวกัน ข้อความว่าบัญชีถูกปิดจะแสดงก็ต่อเมื่อรหัสผ่านถูกเท่านั้น (BR-24)</li>
  <li><b>สถานะกำลังทำงาน (busy):</b> ปุ่ม Sign In และ Save New Password เปลี่ยนเป็นข้อความกำลังดำเนินการและถูกปิดระหว่างส่งคำขอ</li>
  <li><b>บังคับเปลี่ยนรหัสผ่านครั้งแรก:</b> หน้าเปลี่ยนรหัสผ่านแทนที่แอปทั้งหมด ไม่โหลดข้อมูลแอปจนกว่าจะบันทึกสำเร็จ และ server ปฏิเสธ API อื่นด้วย 403 (BR-02)</li>
  <li><b>Session จริง:</b> หลังเปลี่ยนรหัสผ่านได้ token ใหม่ และ Logout ยกเลิก token เดิมที่ฝั่ง server (BR-05, BR-23)</li>
</ul>
${row(shot('authentication/01-login-desktop.png', '5.1 หน้าจอ Login', { width: 49 }), shot('authentication/02-login-invalid-credentials.png', '5.2 รหัสผ่านไม่ถูกต้อง: ข้อความที่ปลอดภัย', { width: 49 }))}
${row(shot('authentication/03-login-inactive-account.png', '5.3 บัญชีที่ถูกปิดการใช้งาน (Robert Taylor)', { width: 49 }), shot('authentication/04-mandatory-password-change.png', '5.4 บังคับเปลี่ยนรหัสผ่านครั้งแรก ไม่มีแอปอยู่ด้านหลัง', { width: 49 }))}
${row(shot('authentication/04b-password-validation-error.png', '5.5 ตรวจกฎรหัสผ่านใหม่ (8–72 ตัว มีตัวอักษรและตัวเลข)', { width: 49 }), shot('authentication/05-after-password-change-logged-in.png', '5.6 เข้าสู่แอปได้หลังเปลี่ยนรหัสผ่าน', { width: 49, crop: 800 }))}
${row(shot('authentication/06-voluntary-change-password.png', '5.7 Change Password ด้วยตนเอง (มีปุ่ม Cancel)', { width: 49, crop: 800 }), shot('authentication/07-after-logout.png', '5.8 ออกจากระบบ: "You have been signed out."', { width: 49 }))}
<h3>5.9 ชื่อผู้ใช้ บทบาท และเมนูตามบทบาท</h3>
${shot('authentication/08-navigation-requester.png', 'Requester: Create Ticket / My Tickets', { crop: 300 })}
${shot('authentication/08-navigation-it-staff.png', 'IT Staff: Ticket Queue', { crop: 300 })}
${shot('authentication/08-navigation-administrator.png', 'Administrator: User Management / Ticket Queue', { crop: 300 })}
<h3>5.10 การเข้าถึงโดยตรงถูกบล็อกหลัง Logout</h3>
${pre(`POST  /api/auth/logout (David)                               -> 200 {"message":"Logged out successfully"}
GET   /api/tickets (David's old token after logout)          -> 401 {"error":"Invalid or expired authentication token"}`, 'small')}
<p>ทดสอบอัตโนมัติด้วย API-05 (<code>server/tests/lab-03/auth.api.test.ts</code>) และ E2E-01a (<code>e2e/lab-03/authentication.spec.ts</code>) ซึ่ง reload หน้าแล้วยังอยู่ที่หน้า Login</p>
</section>`;

const part6 = `
<section class="part">
<h1>Answer Part 6: Working IT Staff Ticket Queue UI</h1>
<p>ข้อมูลตัวอย่างจาก seed มี 16 ตั๋ว ครบทุกสถานะและระดับความสำคัญ ทั้งที่มีและไม่มีผู้รับผิดชอบ คิวรองรับค้นหาด้วยเลขตั๋ว หัวข้อ หรือชื่อผู้แจ้ง, กรองตามสถานะ 8 ค่า / ความสำคัญ / ผู้รับผิดชอบ, เรียงลำดับ, แบ่งหน้าละ 10 รายการ, แสดง IT Priority และ Requested Priority และ server ตอบ 400 เมื่อ query parameter ไม่ถูกต้อง (BR-28)</p>
${shot('staff-queue/01-queue-desktop.png', '6.1 คิวงาน: เลขตั๋ว, หัวข้อ/ผู้แจ้ง, สถานะ, IT/Requested Priority, ผู้รับผิดชอบ (Assigned/Unassigned) และปุ่ม View', { crop: 1100 })}
${row(shot('staff-queue/02-queue-search-results.png', '6.2 ค้นหา "VPN"', { width: 49 }), shot('staff-queue/03-queue-filtered-by-status.png', '6.3 กรองสถานะ In Progress', { width: 49, crop: 900 }))}
${row(shot('staff-queue/04-queue-unassigned-owner-filter.png', '6.4 กรองตั๋วที่ยังไม่มีผู้รับผิดชอบ', { width: 49, crop: 900 }), shot('staff-queue/05-queue-sorted-by-priority.png', '6.5 เรียงตามความสำคัญ', { width: 49, crop: 900 }))}
${row(shot('staff-queue/06-queue-page-2.png', '6.6 Pagination: หน้า 2 จาก 2', { width: 49, crop: 900 }), shot('staff-queue/07-queue-no-results.png', '6.7 ไม่พบผลลัพธ์ พร้อมปุ่ม Clear Filters', { width: 49 }))}
<p class="muted">สถานะ loading และข้อความผิดพลาดที่ปลอดภัยเมื่อโหลดคิวไม่สำเร็จทดสอบใน UI-03 (<code>client/src/tests/lab-03/StaffTicketQueue.test.tsx</code>)</p>
${row(shot('staff-queue/08-queue-tablet.png', '6.8 Tablet 768px: ตารางกระชับ ยังเห็นปุ่ม View', { width: 52, crop: 1150 }), shot('staff-queue/09-queue-mobile.png', '6.9 Mobile 375px: แสดงเป็นการ์ด ไม่มีการเลื่อนแนวนอน', { width: 32, crop: 1050 }))}
</section>`;

const part7 = `
<section class="part">
<h1>Answer Part 7: Working IT Staff Ticket Detail UI</h1>
<ul>
  <li><b>Claim / Reassign:</b> Claim ตั้งตัวเองเป็นผู้รับผิดชอบ และตั๋ว New เปลี่ยนเป็น Open อัตโนมัติ ส่วน Reassign เลือกได้เฉพาะ IT Staff/Administrator ที่ active (BR-09)</li>
  <li><b>IT Priority:</b> ปรับได้อิสระ Requested Priority แสดงเป็น "Immutable" (BR-10, BR-11)</li>
  <li><b>สถานะ:</b> ปุ่มแสดงเฉพาะสถานะถัดไปที่อนุญาต และ server ปฏิเสธการเปลี่ยนที่ไม่อนุญาตด้วย 400 (BR-13)</li>
  <li><b>Public Comments / Internal Notes:</b> append-only จำกัด 2,000 ตัวอักษร และแสดงเป็นข้อความธรรมดา (BR-15–BR-17)</li>
  <li><b>ไฟล์แนบต่อเนื่องจาก Lab 2:</b> IT Staff ดาวน์โหลดไฟล์แนบได้ด้วย token ที่ยืนยันตัวตนแล้ว</li>
  <li><b>Requester ระบุว่าปัญหาแก้แล้ว:</b> เจ้าหน้าที่เห็นการแจ้ง แต่สถานะตั๋วไม่เปลี่ยนเอง (BR-14)</li>
</ul>
${shot('staff-ticket-detail/01-ticket-detail-before-claim.png', '7.1 Ticket Detail ก่อน Claim: รายละเอียด, ไฟล์แนบ, การ์ด Status/Ownership/Priority', { crop: 1150 })}
${row(shot('staff-ticket-detail/02-after-claim-status-open.png', '7.2 หลัง Claim: New → Open', { width: 49, crop: 1000 }), shot('staff-ticket-detail/03-it-priority-updated.png', '7.3 IT Priority = HIGH, Requested = MEDIUM', { width: 49, crop: 1000 }))}
${row(shot('staff-ticket-detail/04-public-comments.png', '7.4 Public Comments', { width: 49, crop: 1300 }), shot('staff-ticket-detail/05-internal-notes.png', '7.5 Internal Notes (การ์ดสีเหลือง มีไอคอนแม่กุญแจ)', { width: 49, crop: 1300 }))}
${row(shot('staff-ticket-detail/06-status-transition-in-progress.png', '7.6 ปุ่มเปลี่ยนสถานะเฉพาะที่อนุญาต', { width: 49, crop: 1100 }), shot('staff-ticket-detail/09-requester-resolution-indicated.png', '7.7 มุมมองเจ้าหน้าที่: ผู้แจ้งระบุว่าปัญหาแก้แล้ว', { width: 49, crop: 1100 }))}
${row(shot('requester-ticket-detail/02-detail-with-public-comments.png', '7.8 Requester: Public Comments ในตั๋วของตน (ไม่มี Internal Notes)', { width: 49, crop: 1300 }), shot('requester-ticket-detail/04-problem-appears-resolved.png', '7.9 Requester: "My Problem Appears Resolved" สถานะยังเป็น In Progress', { width: 49, crop: 1300 }))}
${row(shot('requester-ticket-detail/03-comment-posted.png', '7.10 Requester โพสต์ความคิดเห็นสำเร็จ', { width: 49, crop: 1300 }), shot('requester-ticket-detail/06-other-requesters-ticket-unavailable.png', '7.11 Requester อื่นเปิด URL ตั๋ว: "Ticket Unavailable"', { width: 49 }))}

<h2>7.12 หลักฐานการตรวจสิทธิ์ที่ API โดยตรง (Direct API Authorization)</h2>
<p>ผลจริงจากการเรียก API ด้วย curl โดยไม่ผ่าน UI (<code>bash scripts/api-authorization-evidence.sh</code>):</p>
${pre(API_EVIDENCE, 'small')}
<ul>
  <li><b>401:</b> ไม่มี token หรือ token ถูกยกเลิก header <code>X-Requester-Id</code> ไม่ถูกใช้เป็นตัวตน</li>
  <li><b>403:</b> มี token แต่บทบาทไม่มีสิทธิ์ และไม่มีข้อมูลส่งกลับ</li>
  <li><b>404:</b> Requester เปิดตั๋วของผู้อื่นได้ผลเหมือนตั๋วที่ไม่มีอยู่ จึงไม่รู้ว่าตั๋วนั้นมีจริง (BR-25)</li>
  <li>ทดสอบอัตโนมัติแบบตารางสิทธิ์ทุกบทบาทใน <code>server/tests/lab-03/authorization.api.test.ts</code> (API-06b)</li>
</ul>
</section>`;

const part8 = `
<section class="part">
<h1>Answer Part 8: Working Administrator User Management UI</h1>
<table>
  <tr><th>ข้อกำหนด</th><th>หลักฐาน</th></tr>
  <tr><td>รายชื่อผู้ใช้: Name, Email, Role, Status, Edit</td><td>8.1</td></tr>
  <tr><td>ค้นหาด้วยชื่อหรืออีเมล / กรองตามบทบาท</td><td>8.2, 8.3</td></tr>
  <tr><td>สร้างผู้ใช้ 1 บทบาท พร้อมรหัสผ่านเริ่มต้น</td><td>8.4</td></tr>
  <tr><td>อีเมลซ้ำ (409) และข้อมูลไม่ถูกต้อง</td><td>8.5, 8.6</td></tr>
  <tr><td>แก้ไขชื่อ อีเมล บทบาท และสถานะ active</td><td>8.7</td></tr>
  <tr><td>ตั้งรหัสผ่านเริ่มต้นใหม่และบังคับเปลี่ยนตอนล็อกอินครั้งถัดไป</td><td>8.8 และ E2E-03 (ล็อกอินด้วยรหัสใหม่แล้วถูกบังคับเปลี่ยน ดู 5.4)</td></tr>
  <tr><td>ห้ามปิดบัญชีตัวเอง (BR-19) / ห้ามปิดหรือเปลี่ยนบทบาท Admin คนสุดท้าย (BR-20)</td><td>8.9, 8.10</td></tr>
  <tr><td>ผู้ที่ไม่ใช่ Admin เข้าถึงไม่ได้ (ไม่มีเมนู และ API ตอบ 403)</td><td>8.11 และ Part 7.12</td></tr>
  <tr><td>Responsive Zen Green และข้อความผิดพลาดที่ปลอดภัย</td><td>8.12, 8.13</td></tr>
</table>
${shot('user-management/01-user-list-desktop.png', '8.1 รายชื่อผู้ใช้', { crop: 1000 })}
${row(shot('user-management/02-user-search.png', '8.2 ค้นหา "sarah"', { width: 49 }), shot('user-management/03-filter-by-role.png', '8.3 กรองบทบาท IT Staff', { width: 49, crop: 900 }))}
${row(shot('user-management/04-create-user-modal.png', '8.4 สร้างผู้ใช้: 1 บทบาท + รหัสผ่านเริ่มต้น', { width: 49, crop: 850 }), shot('user-management/04b-duplicate-email-validation.png', '8.5 อีเมลซ้ำ (409)', { width: 49, crop: 850 }))}
${row(shot('user-management/04c-invalid-input-validation.png', '8.6 อีเมลผิดรูปแบบ / รหัสผ่านสั้นเกิน', { width: 49, crop: 850 }), shot('user-management/07-edit-user-modal.png', '8.7 แก้ไขผู้ใช้และสวิตช์ Active', { width: 49 }))}
${row(shot('user-management/08-set-new-initial-password-modal.png', '8.8 ตั้งรหัสผ่านเริ่มต้นใหม่', { width: 49 }), shot('user-management/05-self-deactivation-guard.png', '8.9 ห้ามปิดบัญชีตัวเอง (BR-19)', { width: 49 }))}
${row(shot('user-management/06-last-active-admin-guard.png', '8.10 ห้ามเปลี่ยนบทบาท Admin คนสุดท้าย (BR-20)', { width: 49 }), shot('user-management/11-non-admin-has-no-user-management.png', '8.11 IT Staff ไม่มีเมนู User Management', { width: 49, crop: 800 }))}
${row(shot('user-management/09-user-management-tablet.png', '8.12 Tablet 768px', { width: 52, crop: 1150 }), shot('user-management/10-user-management-mobile.png', '8.13 Mobile 375px: แสดงเป็นการ์ด', { width: 32, crop: 1050 }))}
</section>`;

const responsive = [
  ['Login', 'authentication/01-login-desktop.png', 'authentication/09-login-tablet.png', 'authentication/10-login-mobile.png'],
  ['IT Staff Ticket Queue', 'staff-queue/01-queue-desktop.png', 'staff-queue/08-queue-tablet.png', 'staff-queue/09-queue-mobile.png'],
  ['IT Staff Ticket Detail', 'staff-ticket-detail/01-ticket-detail-before-claim.png', 'staff-ticket-detail/07-ticket-detail-tablet.png', 'staff-ticket-detail/08-ticket-detail-mobile.png'],
  ['Requester Ticket Detail', 'requester-ticket-detail/02-detail-with-public-comments.png', null, 'requester-ticket-detail/05-detail-mobile.png'],
  ['User Management', 'user-management/01-user-list-desktop.png', 'user-management/09-user-management-tablet.png', 'user-management/10-user-management-mobile.png'],
];

const part9 = `
<section class="part">
<h1>Answer Part 9: Zen Green UI and Responsive Evidence</h1>
<p>ลิงก์: <a href="${DOCS_URL}/ui-spec.md">docs/lab-03/ui-spec.md</a> — ภาพทั้งหมดสร้างจาก UI ปัจจุบันด้วย <code>npm run screenshots</code> ที่ Desktop 1280px, Tablet 768px และ Mobile 375px (Visual Checklist อยู่ท้ายเอกสาร ui-spec ที่ render ด้านล่าง)</p>
${responsive.map(([name, d, t, m]) => `
  <div class="resp">
    <h3>${name}</h3>
    <div class="row">
      ${shot(d, 'Desktop 1280px', { width: t ? 42 : 60, crop: 1000 })}
      ${t ? shot(t, 'Tablet 768px', { width: 30, crop: 1024 }) : ''}
      ${shot(m, 'Mobile 375px', { width: 24, crop: 812 })}
    </div>
  </div>`).join('')}
${row(shot('authentication/11-navbar-mobile.png', 'แถบนำทางบนมือถือ: ชื่อ + Role Badge + Change Password + Logout', { width: 30, crop: 700 }))}
${renderDoc('docs/lab-03/ui-spec.md')}
</section>`;

// ---- Page -------------------------------------------------------------------------------
const css = `
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: 'TH Sarabun New', 'TH SarabunPSK', sans-serif; font-size: 15pt; line-height: 1.28; color: #1A2F25; margin: 0; }
a { color: #006B3C; text-decoration: none; }
code { font-family: Consolas, 'Courier New', monospace; font-size: 9pt; background: #EEF3F0; padding: 0 3px; border-radius: 3px; }
pre { font-family: Consolas, 'Courier New', monospace; font-size: 7.6pt; line-height: 1.32; background: #F5F7F6; border: 1px solid #DCE5DF; border-radius: 4px; padding: 6px 8px; white-space: pre-wrap; word-break: break-all; margin: 4px 0 8px; }
pre.small { font-size: 7.2pt; }
pre.graph { font-size: 7pt; }
pre.keep, pre.tree { break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
h1 { font-size: 26pt; color: #006B3C; border-bottom: 2.5px solid #006B3C; padding-bottom: 2px; margin: 0 0 8px; }
h2 { font-size: 20pt; color: #0B7A46; margin: 12px 0 4px; break-after: avoid; }
h3 { font-size: 17pt; color: #1A2F25; margin: 10px 0 3px; break-after: avoid; }
h4, h5, h6 { font-size: 15.5pt; margin: 8px 0 2px; break-after: avoid; }
p { margin: 3px 0 6px; }
ul, ol { margin: 2px 0 6px; padding-left: 20px; }
li { margin: 1px 0; }
table { border-collapse: collapse; width: 100%; margin: 4px 0 10px; font-size: 13pt; line-height: 1.15; }
th, td { border: 1px solid #C9D6CE; padding: 3px 6px; vertical-align: top; text-align: left; word-break: normal; overflow-wrap: break-word; }
th { background: #EAF6EF; color: #006B3C; font-weight: bold; vertical-align: middle; line-height: 1.1; }
td code { word-break: break-all; font-size: 8pt; }
td:first-child > strong, td:first-child > a, td:first-child > code { white-space: nowrap; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
.part { break-before: page; }
.cover { text-align: left; }
.cover-course { color: #5C7164; font-size: 15pt; margin-top: 18mm; }
.cover-title { font-size: 44pt; border: none; margin: 10mm 0 0; }
.cover-sub { font-size: 21pt; color: #0B7A46; margin-bottom: 10mm; }
table.meta th { width: 34mm; background: #F5F7F6; color: #1A2F25; }
table.meta, table.toc { font-size: 15pt; }
.toc-h { margin-top: 8mm; }
.fill { display: inline-block; min-width: 55mm; border-bottom: 1px dotted #5C7164; }
.note, .muted { color: #5C7164; font-size: 13.5pt; }
.row { display: flex; gap: 2%; align-items: flex-start; justify-content: flex-start; flex-wrap: nowrap; break-inside: avoid; }
figure.shot { margin: 4px 0 10px; break-inside: avoid; }
.frame { width: 100%; overflow: hidden; border: 1px solid #C9D6CE; border-radius: 3px; background: #fff; }
.frame img { width: 100%; display: block; object-fit: cover; object-position: top; }
.frame.free img { height: auto; }
figcaption { font-size: 13pt; line-height: 1.15; margin-top: 2px; }
figcaption .path { font-family: Consolas, monospace; font-size: 6.6pt; color: #5C7164; }
.slot { border: 2px dashed #0B7A46; border-radius: 6px; background: #F7FBF8; padding: 6mm; margin: 6px 0 12px; display: flex; flex-direction: column; justify-content: center; break-inside: avoid; }
.slot-title { font-size: 18pt; font-weight: bold; color: #006B3C; }
.slot-body { margin: 4px 0; }
.slot-file { font-size: 13pt; color: #5C7164; }
.two-col { display: flex; gap: 4%; }
.two-col > div { width: 48%; }
.rendered { border-top: 1px solid #DCE5DF; margin-top: 8px; padding-top: 4px; }
.rendered-src { font-size: 12.5pt; color: #5C7164; margin-bottom: 4px; }
.rendered h3 { font-size: 19pt; color: #0B7A46; }
.rendered h4 { font-size: 16.5pt; color: #1A2F25; }
.rendered table { font-size: 12pt; }
.rendered input[type=checkbox] { transform: scale(0.9); margin-right: 4px; }
.resp { break-inside: avoid; }
table.summary td:last-child { white-space: nowrap; }
`;

const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Lab 3 Report</title><style>${css}</style></head>
<body>${cover}${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}${part9}</body></html>`;

const tmpHtml = path.join(ROOT, 'docs/lab-03/.lab-03-report.html');
fs.writeFileSync(tmpHtml, html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(fileUrl(tmpHtml), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: OUT_PDF,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="width:100%;font-family:'TH Sarabun New';font-size:10pt;color:#5C7164;padding:0 15mm;display:flex;justify-content:space-between"><span>CPE 334 · Lab 3 · TokTickIT</span><span>${esc(META.student)}</span></div>`,
    footerTemplate: `<div style="width:100%;font-family:'TH Sarabun New';font-size:10pt;color:#5C7164;text-align:center">หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
} finally {
  await browser.close();
  fs.rmSync(tmpHtml, { force: true });
}
console.log(`Wrote ${path.relative(ROOT, OUT_PDF)}`);
for (const [key, file] of Object.entries(SUBMISSION_IMAGES)) {
  const present = fs.existsSync(path.join(SHOTS, 'submission', file));
  console.log(`  ${present ? '✓' : '○'} ${key}: artifacts/lab-03/screenshots/submission/${file}${present ? '' : ' (placeholder)'}`);
}
