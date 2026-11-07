const pdfParse = require('pdf-parse');

/**
 * Extracts plain text from a PDF buffer.
 * Detects scanned/empty documents where OCR is needed.
 */
async function extractTextFromPDF(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF file buffer is empty');
  }

  try {
    const data = await pdfParse(buffer);
    const text = data.text ? data.text.trim() : '';

    // Check if the extracted text is empty or negligible (scanned image PDF)
    if (!text || text.length < 20) {
      return {
        success: false,
        requiresOCR: true,
        text: '',
        pageCount: data.numpages || 1,
        message: 'This document appears to be a scanned image or empty. Optical Character Recognition (OCR) is required to read scanned image PDFs.'
      };
    }

    // Clean up excessive whitespace and control characters
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      success: true,
      requiresOCR: false,
      text: cleanedText,
      pageCount: data.numpages || 1,
      charCount: cleanedText.length,
      message: 'PDF text extracted successfully'
    };
  } catch (err) {
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  }
}

module.exports = {
  extractTextFromPDF
};

