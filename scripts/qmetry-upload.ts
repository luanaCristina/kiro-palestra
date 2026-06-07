/**
 * QMetry Test Results Upload Script
 * 
 * Runs tests, creates test cases in QMetry (Regression folder),
 * creates a test cycle with Jira card reference, and reports results.
 * 
 * Usage:
 *   npx ts-node scripts/qmetry-upload.ts --card SDC-8
 *   npx ts-node scripts/qmetry-upload.ts --card SDC-16
 *   npx ts-node scripts/qmetry-upload.ts (without card, uses "Manual Execution")
 * 
 * Environment variables (in .env):
 *   QMETRY_API_KEY       - QMetry Open API key
 *   QMETRY_PROJECT_KEY   - QMetry project key (default: SDC)
 *   QMETRY_BASE_URL      - QMetry base URL (default: https://testmanagement.qmetry.com)
 *   QMETRY_FOLDER_ID     - QMetry test case folder ID (default: 2531077 = Regression)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

// ─── Configuration ──────────────────────────────────────────────────────────

const QMETRY_API_KEY = process.env.QMETRY_API_KEY || '';
const QMETRY_PROJECT_KEY = process.env.QMETRY_PROJECT_KEY || 'SDC';
const QMETRY_BASE_URL = process.env.QMETRY_BASE_URL || 'https://qtmcloud.qmetry.com';
const QMETRY_FOLDER_ID = process.env.QMETRY_FOLDER_ID || '2531077'; // Regression folder

const RESULTS_FILE = path.resolve(__dirname, '../test-results/junit-results.xml');

// ─── CLI Args ───────────────────────────────────────────────────────────────

function parseArgs(): { card: string } {
  const args = process.argv.slice(2);
  let card = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--card' && args[i + 1]) {
      card = args[i + 1];
      i++;
    }
  }

  return { card };
}

// ─── JUnit XML Parser ───────────────────────────────────────────────────────

interface TestResult {
  suiteName: string;
  testName: string;
  className: string;
  time: number;
  status: 'passed' | 'failed' | 'skipped';
  failureMessage?: string;
}

function parseJUnitXML(xmlContent: string): TestResult[] {
  const results: TestResult[] = [];

  // Parse test suites
  const suiteRegex = /<testsuite\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/testsuite>/g;
  let suiteMatch: RegExpExecArray | null;

  while ((suiteMatch = suiteRegex.exec(xmlContent)) !== null) {
    const suiteName = suiteMatch[1];
    const suiteContent = suiteMatch[2];

    // Parse test cases within suite
    const caseRegex = /<testcase\s+classname="([^"]*)"[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let caseMatch: RegExpExecArray | null;

    while ((caseMatch = caseRegex.exec(suiteContent)) !== null) {
      const className = caseMatch[1];
      const testName = caseMatch[2];
      const time = parseFloat(caseMatch[3]);
      const innerContent = caseMatch[4] || '';

      let status: 'passed' | 'failed' | 'skipped' = 'passed';
      let failureMessage: string | undefined;

      if (innerContent.includes('<failure')) {
        status = 'failed';
        const failureMatch = /<failure[^>]*>([\s\S]*?)<\/failure>/.exec(innerContent);
        failureMessage = failureMatch ? failureMatch[1].trim().substring(0, 500) : 'Test failed';
      } else if (innerContent.includes('<skipped')) {
        status = 'skipped';
      }

      results.push({ suiteName, testName, className, time, status, failureMessage });
    }
  }

  return results;
}

// ─── QMetry API Client ──────────────────────────────────────────────────────

async function qmetryRequest(endpoint: string, method: string, body?: any): Promise<any> {
  const url = `${QMETRY_BASE_URL}/rest/api/latest${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apiKey': QMETRY_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`QMetry API error (${response.status}): ${errorText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// ─── Import via Automation API ──────────────────────────────────────────────

async function importViaAutomationAPI(
  base64Content: string,
  testSuiteName: string
): Promise<{ trackingId?: string; id?: string }> {
  const url = `${QMETRY_BASE_URL}/rest/api/automation/importresult`;

  // Step 1: Get upload URL from QMetry (QMetry for Jira Cloud uses 2-step process)
  const payload: any = {
    format: 'JUNIT',
    testCycleToReuse: '',
    environment: '',
    build: '',
    isMatchingRequired: true,
  };

  const step1Response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': QMETRY_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!step1Response.ok) {
    const errorText = await step1Response.text();
    throw new Error(`QMetry Step 1 failed (${step1Response.status}): ${errorText}`);
  }

  const step1Result = await step1Response.json();

  if (!step1Result.url) {
    throw new Error(`QMetry did not return upload URL: ${JSON.stringify(step1Result)}`);
  }

  console.log(`   Tracking ID: ${step1Result.trackingId}`);
  console.log('   Uploading XML to S3...');

  // Step 2: Upload the actual XML file to the S3 pre-signed URL
  // Use curl for precise header control (Node fetch may add extra headers that break S3 signature)
  const xmlFilePath = RESULTS_FILE;

  try {
    const curlCmd = `curl -s -o /dev/null -w "%{http_code}" -X PUT "${step1Result.url}" -H "Content-Type: multipart/form-data" -T "${xmlFilePath}"`;
    const httpCode = execSync(curlCmd, { encoding: 'utf-8' }).trim();

    if (httpCode !== '200') {
      throw new Error(`S3 upload returned HTTP ${httpCode}`);
    }
  } catch (curlError: any) {
    throw new Error(`S3 upload failed: ${curlError.message}`);
  }

  console.log('   ✅ File uploaded to QMetry!');

  return { trackingId: step1Result.trackingId };
}

// ─── Check Import Status ────────────────────────────────────────────────────

async function checkImportStatus(trackingId: string, maxRetries = 30): Promise<any> {
  const url = `${QMETRY_BASE_URL}/rest/api/automation/importresult/${trackingId}`;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const response = await fetch(url, {
      headers: { 'apiKey': QMETRY_API_KEY },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'Success' || result.status === 'Completed') {
        return result;
      }
      if (result.status === 'Failed') {
        throw new Error(`Import failed: ${result.message || 'Unknown error'}`);
      }
      // Still in progress
      process.stdout.write('.');
    }
  }

  throw new Error('Import timed out after 60 seconds');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { card } = parseArgs();
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const dateShort = now.toISOString().substring(0, 10);
  const timeShort = now.toTimeString().substring(0, 5);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      📊 QMetry Test Execution & Tracking                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Validate API key
  if (!QMETRY_API_KEY) {
    console.error('❌ QMETRY_API_KEY not set. Add it to .env');
    process.exit(1);
  }

  const cardLabel = card || 'Manual Execution';
  const testSuiteName = card
    ? `[${card}] Automated Tests - ${dateShort} ${timeShort}`
    : `Automated Tests - ${dateShort} ${timeShort}`;

  console.log(`🎫 Jira Card:     ${cardLabel}`);
  console.log(`📅 Execution:     ${dateStr}`);
  console.log(`🗂️  Folder:        Regression (ID: ${QMETRY_FOLDER_ID})`);
  console.log(`🏗️  Project:       ${QMETRY_PROJECT_KEY}`);
  console.log(`📦 Test Suite:    ${testSuiteName}`);
  console.log('');

  // ─── Step 1: Run tests ──────────────────────────────────────────────────

  console.log('🧪 Step 1: Running tests...');
  console.log('─'.repeat(60));

  try {
    execSync('npx jest --run-in-band --testPathPattern="(unit|property)" 2>&1', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log('✅ All tests passed!');
  } catch (error: any) {
    // Jest exits with code 1 if tests fail, but still generates results
    console.log('⚠️  Some tests failed (results will still be uploaded)');
  }
  console.log('');

  // ─── Step 2: Parse results ──────────────────────────────────────────────

  console.log('📋 Step 2: Parsing test results...');

  if (!fs.existsSync(RESULTS_FILE)) {
    console.error(`❌ JUnit results not found at: ${RESULTS_FILE}`);
    console.error('   Ensure jest-junit reporter is configured.');
    process.exit(1);
  }

  const xmlContent = fs.readFileSync(RESULTS_FILE, 'utf-8');
  const testResults = parseJUnitXML(xmlContent);

  const passed = testResults.filter(t => t.status === 'passed');
  const failed = testResults.filter(t => t.status === 'failed');
  const skipped = testResults.filter(t => t.status === 'skipped');

  console.log(`   Total:   ${testResults.length}`);
  console.log(`   ✅ Pass:  ${passed.length}`);
  console.log(`   ❌ Fail:  ${failed.length}`);
  console.log(`   ⏭️  Skip:  ${skipped.length}`);
  console.log('');

  // ─── Step 3: Upload to QMetry ───────────────────────────────────────────

  console.log('📤 Step 3: Uploading to QMetry...');

  const base64Content = fs.readFileSync(RESULTS_FILE).toString('base64');

  try {
    const importResult = await importViaAutomationAPI(base64Content, testSuiteName);

    if (importResult.trackingId) {
      console.log(`   Tracking ID: ${importResult.trackingId}`);
      console.log('');
      console.log(`   ✅ Results submitted to QMetry for processing!`);
      console.log(`   📋 Check results in QMetry Test Management (may take 1-2 min to process)`);
      console.log(`   🔗 ${QMETRY_BASE_URL}`);
    } else if (importResult.id) {
      console.log(`   ✅ Upload successful! ID: ${importResult.id}`);
    } else {
      console.log('   ✅ Upload submitted successfully!');
    }
  } catch (error: any) {
    console.error(`   ❌ Upload failed: ${error.message}`);
    console.log('');
    console.log('   Falling back to local report...');
  }

  // ─── Step 4: Summary ────────────────────────────────────────────────────

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`  🎫 Card:         ${cardLabel}`);
  console.log(`  📅 Date:         ${dateStr}`);
  console.log(`  📦 Suite:        ${testSuiteName}`);
  console.log(`  🗂️  Folder:       Regression`);
  console.log(`  📈 Results:      ${passed.length}/${testResults.length} passed`);
  console.log(`  🔗 QMetry URL:   ${QMETRY_BASE_URL}`);
  console.log('');

  if (failed.length > 0) {
    console.log('  ❌ FAILED TESTS:');
    for (const test of failed) {
      console.log(`     • ${test.className} › ${test.testName}`);
      if (test.failureMessage) {
        const shortMsg = test.failureMessage.split('\n')[0].substring(0, 100);
        console.log(`       ${shortMsg}`);
      }
    }
    console.log('');
  }

  // ─── Generate local report ────────────────────────────────────────────

  const reportPath = path.resolve(__dirname, '../test-results/execution-report.md');
  const report = generateMarkdownReport(testResults, cardLabel, dateStr, testSuiteName);
  fs.writeFileSync(reportPath, report);
  console.log(`  📄 Report:       ${reportPath}`);
  console.log('');
  console.log('═'.repeat(60));

  // Exit with error code if tests failed
  if (failed.length > 0) {
    process.exit(1);
  }
}

// ─── Markdown Report ────────────────────────────────────────────────────────

function generateMarkdownReport(
  results: TestResult[],
  card: string,
  date: string,
  suiteName: string
): string {
  const passed = results.filter(t => t.status === 'passed');
  const failed = results.filter(t => t.status === 'failed');

  let md = `# 📊 Test Execution Report\n\n`;
  md += `| Field | Value |\n|-------|-------|\n`;
  md += `| Jira Card | ${card} |\n`;
  md += `| Date/Time | ${date} |\n`;
  md += `| Test Suite | ${suiteName} |\n`;
  md += `| QMetry Folder | Regression (ID: ${QMETRY_FOLDER_ID}) |\n`;
  md += `| Total Tests | ${results.length} |\n`;
  md += `| ✅ Passed | ${passed.length} |\n`;
  md += `| ❌ Failed | ${failed.length} |\n`;
  md += `| Pass Rate | ${((passed.length / results.length) * 100).toFixed(1)}% |\n\n`;

  if (failed.length > 0) {
    md += `## ❌ Failed Tests\n\n`;
    md += `| Test | Error |\n|------|-------|\n`;
    for (const test of failed) {
      const shortMsg = (test.failureMessage || 'Unknown').split('\n')[0].substring(0, 80);
      md += `| ${test.testName} | ${shortMsg} |\n`;
    }
    md += '\n';
  }

  md += `## ✅ Passed Tests (${passed.length})\n\n`;

  // Group by suite
  const suites = new Map<string, TestResult[]>();
  for (const test of passed) {
    const suite = test.suiteName || 'Other';
    if (!suites.has(suite)) suites.set(suite, []);
    suites.get(suite)!.push(test);
  }

  for (const [suite, tests] of suites) {
    const shortSuite = suite.replace('tests/', '').replace('.test.ts', '').replace('.property.test.ts', ' (property)');
    md += `### ${shortSuite} (${tests.length})\n\n`;
    for (const test of tests) {
      md += `- ✅ ${test.testName} (${test.time}s)\n`;
    }
    md += '\n';
  }

  return md;
}

// ─── Entry Point ────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
