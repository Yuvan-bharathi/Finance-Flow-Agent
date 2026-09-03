import { uploadBufferToCloudinary } from '../src/config/cloudinary.config.js';
import { extractTextFromFileBuffer } from '../src/utils/pdfExtractor.js';
import fs from 'fs';
import path from 'path';

async function testCloudinaryAndOCR() {
  console.log('🧪 Testing Cloudinary Upload & PDF Text Extractor...');

  // 1. Test Text Extractor on sample agreement
  const samplePath = path.resolve('sample_documents/LOAN_AGREEMENT_APEX_LOGISTICS_LN-APX-2026-01.md');
  if (fs.existsSync(samplePath)) {
    const buffer = fs.readFileSync(samplePath);
    const text = await extractTextFromFileBuffer(buffer, 'text/markdown', 'LOAN_AGREEMENT_APEX_LOGISTICS_LN-APX-2026-01.md');
    console.log(`✅ Text Extracted from Sample Agreement: ${text.length} characters.`);
    console.log(`Preview: "${text.slice(0, 150)}..."`);
  }

  // 2. Test Cloudinary Upload
  try {
    const testBuffer = Buffer.from('FinanceFlow AI Master Credit Facility Test Document Content', 'utf-8');
    console.log('Uploading test buffer to Cloudinary (cloud: s6nrfj9n)...');
    const result = await uploadBufferToCloudinary(testBuffer, 'financeflow_test_agreement.txt');
    console.log('✅ Cloudinary Upload Succeeded!');
    console.log('Secure URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    console.log('Resource Type:', result.resource_type);
  } catch (err) {
    console.error('❌ Cloudinary Upload Error:', err.message);
  }
}

testCloudinaryAndOCR().then(() => process.exit(0));
