import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Utility: extractTextFromFileBuffer
 * Extracts plain text from an uploaded document buffer (PDF, TXT, HTML, Markdown).
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File mime type
 * @param {string} fileName - File name
 * @returns {Promise<string>} Extracted raw text
 */
export const extractTextFromFileBuffer = async (buffer, mimeType = 'application/pdf', fileName = '') => {
  if (!buffer || buffer.length === 0) return '';

  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  // 1. PDF File extraction via pdf-parse
  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    try {
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();
      if (text.length > 20) {
        return text;
      }
    } catch (err) {
      console.warn('[PDF Extractor Warning]: Failed to parse PDF with pdf-parse:', err.message);
    }
  }

  // 2. Plaintext / Markdown / HTML / JSON buffers
  if (
    lowerMime.includes('text') ||
    lowerMime.includes('json') ||
    lowerMime.includes('html') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.html') ||
    lowerName.endsWith('.json')
  ) {
    try {
      return buffer.toString('utf-8');
    } catch (e) {
      console.warn('[Buffer ToString Warning]:', e.message);
    }
  }

  // Fallback string conversion
  try {
    const raw = buffer.toString('utf-8');
    // Remove unprintable control characters
    const clean = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length > 50) return clean;
  } catch {
    // ignore
  }

  return '';
};

export default extractTextFromFileBuffer;
