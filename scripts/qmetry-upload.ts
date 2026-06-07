/**
 * QMetry Test Cycle Automation Script
 * 
 * Runs all 183 automated tests, creates a Test Cycle in QMetry linked to a Jira card,
 * and uploads results to the Regression folder.
 * 
 * Usage:
 *   npm run test:qmetry -- --card SDC-8
 *   npm run test:qmetry -- --card SDC-8 --executor "Luana Cristina"
 *   npm run test:qmetry -- --card SDC-16 --executor "João Silva"
 * 
 * Naming convention for Test Cycle:
 *   Regression - 2026-06-07 14:30 - SDC-8
 * 
 * Parameters:
 *   --card <JIRA_KEY>       Jira card key (required). Ex: SDC-8
 *   --executor <NAME>       Who is running the tests (optional, defaults to system user)
 * 
 * Environment variables (.env):
 *   QMETRY_API_KEY          QMetry Open API key
 *   QMETRY_BASE_URL         https://qtmcloud.qmetry.com
 *   QMETRY_FOLDER_ID        Regression folder ID (2531077)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';
import dotenv from 'dotenv';

dotenv.config();

// ─── Config ─────────────────────────────────────────────────────────────────

const QMETRY_API_KEY = process.env.QMETRY_API_KEY || '';
const QMETRY_BASE_URL = process.env.QMETRY_BASE_URL || 'https://qtmcloud.qmetry.com';
const QMETRY_FOLDER_ID = process.env.QMETRY_FOLDER_ID || '2531077';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(PROJECT_ROOT, 'test-results', 'junit-results.xml');

// ─── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(): { card: string; executor: string } {
  const args = process.argv.slice(2);
  let card = '';
  let executor = os.userInfo().username;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--card' || args[i] === 'card') && args[i + 1]) {
      card = args[i + 1];
      i++;
    }
    if (args[i] === '--executor' && args[i + 1]) {
      executor = args[i + 1];
      i++;
    }
  }

  return { card, executor };
}

// ─── JUnit Parser ───────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  suite: string;
  className: string;
  status: 'Pass' | 'Fail' | 'Not Run';
  time: string;
  error?: string;
}

function parseResults(xmlPath: string): TestResult[] {
  const xml = fs.readFileSync(xmlPath, 'utf-8');
  const results: TestResult[] = [];

  const suiteRe = /<testsuite\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/testsuite>/g;
  let sm: RegExpExecArray | null;

  while ((sm = suiteRe.exec(xml)) !== null) {
    const suite = sm[1].replace('tests/', '').replace('.test.ts', '').replace('.property.test.ts', ' [property]');
    const content = sm[2];

    const caseRe = /<testcase\s+classname="([^"]*)"[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let cm: RegExpExecArray | null;

    while ((cm = caseRe.exec(content)) !== null) {
      const className = cm[1];
      const name = cm[2];
      const time = cm[3];
      const inner = cm[4] || '';

      let status: 'Pass' | 'Fail' | 'Not Run' = 'Pass';
      let error: string | undefined;

      if (inner.includes('<failure')) {
        status = 'Fail';
        const m = /<failure[^>]*>([\s\S]*?)<\/failure>/.exec(inner);
        error = m ? m[1].split('\n')[0].substring(0, 200) : 'Failed';
      } else if (inner.includes('<skipped')) {
        status = 'Not Run';
      }

      results.push({ name, suite, className, status, time, error });
    }
  }

  return results;
}

// ─── QMetry Upload ──────────────────────────────────────────────────────────

async function uploadToQMetry(cycleName: string): Promise<{ trackingId: string } | null> {
  const url = `${QMETRY_BASE_URL}/rest/api/automation/importresult`;

  // Step 1: Request upload URL
  const res1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apiKey': QMETRY_API_KEY },
    body: JSON.stringify({
      format: 'JUNIT',
      testCaseFolder: '/Regression',
      testCycleFolder: '/Regression',
      isMatchingRequired: true,
    }),
  });

  if (!res1.ok) {
    const err = await res1.text();
    console.error(`   ❌ QMetry API error (${res1.status}): ${err}`);
    return null;
  }

  const { url: uploadUrl, trackingId } = await res1.json();

  if (!uploadUrl) {
    console.error('   ❌ No upload URL returned from QMetry');
    return null;
  }

  // Step 2: Upload XML via curl (QMetry requires Content-Type: multipart/form-data for S3)
  const code = execSync(
    `curl -s -o /dev/null -w "%{http_code}" -X PUT "${uploadUrl}" -H "Content-Type: multipart/form-data" -T "${RESULTS_FILE}"`,
    { encoding: 'utf-8' }
  ).trim();

  if (code !== '200') {
    console.error(`   ❌ S3 upload failed (HTTP ${code})`);
    return null;
  }

  return { trackingId };
}

// ─── Report Generator ───────────────────────────────────────────────────────

function generateReport(results: TestResult[], card: string, executor: string, cycleName: string, trackingId: string | null): void {
  const passed = results.filter(r => r.status === 'Pass');
  const failed = results.filter(r => r.status === 'Fail');
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  let md = `# 📊 Test Cycle Report\n\n`;
  md += `| Field | Value |\n|-------|-------|\n`;
  md += `| Test Cycle | ${cycleName} |\n`;
  md += `| Jira Card | ${card} |\n`;
  md += `| Executor | ${executor} |\n`;
  md += `| Date/Time | ${now} |\n`;
  md += `| Total | ${results.length} |\n`;
  md += `| ✅ Pass | ${passed.length} |\n`;
  md += `| ❌ Fail | ${failed.length} |\n`;
  md += `| Pass Rate | ${((passed.length / results.length) * 100).toFixed(1)}% |\n`;
  if (trackingId) md += `| QMetry Tracking | ${trackingId} |\n`;
  md += `| Folder | Regression (ID: ${QMETRY_FOLDER_ID}) |\n\n`;

  if (failed.length > 0) {
    md += `## ❌ Failed Tests\n\n| # | Test | Suite | Error |\n|---|------|-------|-------|\n`;
    failed.forEach((t, i) => {
      md += `| ${i + 1} | ${t.name.substring(0, 80)} | ${t.suite} | ${(t.error || '').substring(0, 60)} |\n`;
    });
    md += '\n';
  }

  md += `## ✅ Passed Tests (${passed.length})\n\n`;
  const suites = new Map<string, TestResult[]>();
  passed.forEach(t => {
    if (!suites.has(t.suite)) suites.set(t.suite, []);
    suites.get(t.suite)!.push(t);
  });
  for (const [suite, tests] of suites) {
    md += `### ${suite} (${tests.length})\n`;
    tests.forEach(t => { md += `- ✅ ${t.name}\n`; });
    md += '\n';
  }

  const reportPath = path.join(PROJECT_ROOT, 'test-results', 'execution-report.md');
  fs.writeFileSync(reportPath, md);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { card, executor } = parseArgs();

  if (!card) {
    console.error('❌ Card obrigatório. Use: npm run test:qmetry -- --card SDC-8');
    process.exit(1);
  }

  if (!QMETRY_API_KEY) {
    console.error('❌ QMETRY_API_KEY não configurada no .env');
    process.exit(1);
  }

  // Build cycle name: Regression - 2026-06-07 14:30 - SDC-8
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const cycleName = `Regression - ${dateStr} ${timeStr} - ${card}`;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        🧪 QMetry Test Cycle Automation                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  📋 Test Cycle:   ${cycleName}`);
  console.log(`  🎫 Card:         ${card}`);
  console.log(`  👤 Executor:     ${executor}`);
  console.log(`  📅 Date:         ${dateStr} ${timeStr}`);
  console.log(`  🗂️  Folder:       Regression (ID: ${QMETRY_FOLDER_ID})`);
  console.log('');
  console.log('─'.repeat(62));

  // Step 1: Run tests
  console.log('');
  console.log('  🧪 [1/4] Running all tests...');
  try {
    execSync('npx jest --run-in-band --testPathPattern="(unit|property)" 2>&1', {
      cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: 'pipe',
    });
    console.log('  ✅ All tests executed');
  } catch {
    console.log('  ⚠️  Tests completed (some failures detected)');
  }

  // Step 2: Parse results
  console.log('  📋 [2/4] Parsing results...');
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error('  ❌ No JUnit XML found. Check jest-junit reporter config.');
    process.exit(1);
  }
  const results = parseResults(RESULTS_FILE);
  const passed = results.filter(r => r.status === 'Pass');
  const failed = results.filter(r => r.status === 'Fail');
  console.log(`       ${results.length} total | ${passed.length} pass | ${failed.length} fail`);

  // Step 3: Upload to QMetry
  console.log('  📤 [3/4] Uploading to QMetry...');
  const upload = await uploadToQMetry(cycleName);
  if (upload) {
    console.log(`  ✅ Uploaded! Tracking: ${upload.trackingId}`);
  } else {
    console.log('  ⚠️  Upload failed (report saved locally)');
  }

  // Step 4: Generate report
  console.log('  📄 [4/4] Generating report...');
  generateReport(results, card, executor, cycleName, upload?.trackingId || null);
  console.log('  ✅ Report saved to test-results/execution-report.md');

  // Summary
  console.log('');
  console.log('─'.repeat(62));
  console.log('');
  console.log('  ╭─────────────────────────────────────────────────────╮');
  console.log(`  │  📊 RESULT: ${passed.length}/${results.length} passed (${((passed.length / results.length) * 100).toFixed(1)}%)${' '.repeat(20)}│`);
  console.log('  ╰─────────────────────────────────────────────────────╯');
  console.log('');
  console.log(`  Test Cycle:  ${cycleName}`);
  if (upload) {
    console.log(`  Tracking:    ${upload.trackingId}`);
    console.log(`  QMetry:      Check results in 1-2 min at QMetry app in Jira`);
  }
  console.log(`  Report:      test-results/execution-report.md`);

  if (failed.length > 0) {
    console.log('');
    console.log('  ❌ Failed tests:');
    for (const t of failed.slice(0, 5)) {
      console.log(`     • ${t.name.substring(0, 70)}`);
    }
    if (failed.length > 5) console.log(`     ... and ${failed.length - 5} more`);
  }

  console.log('');

  if (failed.length > 0) process.exit(1);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
