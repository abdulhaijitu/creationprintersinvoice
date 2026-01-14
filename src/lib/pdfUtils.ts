/**
 * Utility functions for PDF generation and download
 */

/**
 * Sanitizes a filename by removing or replacing invalid characters
 * @param filename - The raw filename to sanitize
 * @returns A sanitized filename safe for use in file systems
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid characters with dash
    .replace(/\s+/g, '-') // Replace spaces with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .trim();
}

/**
 * Generates a standardized PDF filename based on document type and number
 * @param type - The document type (invoice, quotation, challan)
 * @param documentNumber - The document number (e.g., INV-2025-001)
 * @returns A sanitized filename with .pdf extension
 */
export function generatePDFFilename(type: 'invoice' | 'quotation' | 'challan', documentNumber: string): string {
  const prefix = {
    invoice: 'Invoice',
    quotation: 'Quotation',
    challan: 'Challan',
  }[type];
  
  const sanitizedNumber = sanitizeFilename(documentNumber);
  return `${prefix}-${sanitizedNumber}.pdf`;
}

/**
 * Sets the document title temporarily for PDF download and triggers print
 * Restores the original title after print dialog is shown
 * @param type - The document type
 * @param documentNumber - The document number
 * @param onPrintTriggered - Optional callback after print is triggered
 */
export function downloadAsPDF(
  type: 'invoice' | 'quotation' | 'challan',
  documentNumber: string,
  onPrintTriggered?: () => void
): void {
  const originalTitle = document.title;
  const pdfFilename = generatePDFFilename(type, documentNumber);
  
  // Set document title to desired PDF filename (without .pdf extension for cleaner display)
  document.title = pdfFilename.replace('.pdf', '');
  
  // Trigger print dialog
  window.print();
  
  // Restore original title after a short delay
  // The delay ensures the print dialog has captured the title
  setTimeout(() => {
    document.title = originalTitle;
    onPrintTriggered?.();
  }, 100);
}

/**
 * Opens a print page in a new tab with proper document title for PDF filename
 * @param url - The URL to open for printing
 * @param type - The document type
 * @param documentNumber - The document number
 */
export function openPrintPage(
  url: string,
  type: 'invoice' | 'quotation' | 'challan',
  documentNumber: string
): void {
  const pdfFilename = generatePDFFilename(type, documentNumber);
  // Store the filename in sessionStorage for the print page to pick up
  sessionStorage.setItem('pdf_filename', pdfFilename);
  window.open(url, '_blank');
}
