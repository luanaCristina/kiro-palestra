/**
 * QMetry Test Results Upload Script
 * 
 * This script uploads JUnit XML test results to QMetry Test Management.
 * It creates a test suite with test cases linked to the current execution,
 * associated with the configured user and project.
 * 
 * Usage: npx ts-node scripts/qmetry-upload.ts
 * 
 * Environment variables:
 *   QMETRY_API_KEY - QMetry API key (or set in .env)
 *   QMETRY_PROJECT_KEY - QMetry project key (default: SDC)
 *   QMETRY_BASE_URL - QMetry base URL (default: https://testmanagement.qmetry.com)
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const QMETRY_API_KEY = process.env.QMETRY_API_KEY || '';
const QMETRY_PROJECT_KEY = process.env.QMETRY_PROJECT_KEY || 'SDC';
const QMETRY_BASE_URL = process.env.QMETRY_BASE_URL || 'https://testmanagement.qmetry.com';

const RESULTS_FILE = path.resolve(__dirname, '../test-results/junit-results.xml');

interface UploadResponse {
  success: boolean;
  message?: string;
  id?: string;
  trackingId?: string;
  error?: string;
}

async function uploadToQMetry(): Promise<void> {
  console.log('📤 QMetry Test Results Upload');
  console.log('─'.repeat(50));

  // Validate API key
  if (!QMETRY_API_KEY) {
    console.error('❌ QMETRY_API_KEY not set. Add it to .env or set as environment variable.');
    process.exit(1);
  }

  // Check if results file exists
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error(`❌ JUnit results not found at: ${RESULTS_FILE}`);
    console.error('   Run "npm test" first to generate test results.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(RESULTS_FILE);
  const fileSizeKB = (fileContent.length / 1024).toFixed(1);
  
  console.log(`📁 File: ${RESULTS_FILE}`);
  console.log(`📏 Size: ${fileSizeKB} KB`);
  console.log(`🏗️  Project: ${QMETRY_PROJECT_KEY}`);
  console.log(`🌐 URL: ${QMETRY_BASE_URL}`);
  console.log('');

  // Convert file to base64
  const base64Content = fileContent.toString('base64');

  // Build the upload request
  const uploadUrl = `${QMETRY_BASE_URL}/rest/api/automation/importresult`;

  const payload = {
    format: 'junit/xml',
    testCycleToReuse: '',
    environment: '',
    build: '',
    isMatchingRequired: 'true',
    attachFile: base64Content,
    fileName: 'junit-results.xml',
  };

  console.log('⏳ Uploading results to QMetry...');

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': QMETRY_API_KEY,
        'scope': QMETRY_PROJECT_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed with status ${response.status}`);
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }

    const result: UploadResponse = await response.json();

    if (result.success !== false) {
      console.log('✅ Upload successful!');
      if (result.id) console.log(`   Test Cycle ID: ${result.id}`);
      if (result.trackingId) console.log(`   Tracking ID: ${result.trackingId}`);
      console.log('');
      console.log(`🔗 View results at: ${QMETRY_BASE_URL}`);
    } else {
      console.error(`❌ Upload failed: ${result.message || result.error || 'Unknown error'}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Network error: ${error.message}`);
    console.error('   Check your QMETRY_BASE_URL and network connectivity.');
    process.exit(1);
  }
}

uploadToQMetry().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
