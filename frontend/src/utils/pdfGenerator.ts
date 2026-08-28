import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Utility: exportElementToPdf
 * Converts the full DOM element (from top letterhead to bottom signature) into a single,
 * publication-quality A4 PDF with guaranteed zero clipping.
 *
 * @param elementId - ID of the container element to capture
 * @param fileName - Desired output filename (e.g. 'Payment_Reconciliation_Report.pdf')
 */
export const exportElementToPdf = async (elementId: string, fileName: string): Promise<void> => {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    console.error(`Element with ID '${elementId}' not found for PDF export.`);
    return;
  }

  // 1. Create an offscreen clone with unconstrained height & visible overflow
  // This guarantees that elements below the scroll fold (Green Balance Card & Signatures) are never cut off
  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.id = 'pdf-export-clone';
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = '800px';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.background = '#ffffff';
  clone.style.zIndex = '-1000';
  clone.style.boxShadow = 'none';

  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2, // Crisp 300+ DPI equivalent resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 Width in mm
    const pageHeight = 297; // A4 Height in mm
    const margin = 8; // 8mm border margins
    const printableWidth = pageWidth - margin * 2; // 194mm
    const printableHeight = pageHeight - margin * 2; // 281mm

    const calculatedHeight = (canvas.height * printableWidth) / canvas.width;

    // Proportionally scale to fit everything on 1 single official invoice page
    let finalWidth = printableWidth;
    let finalHeight = calculatedHeight;

    if (finalHeight > printableHeight) {
      const scaleRatio = printableHeight / finalHeight;
      finalHeight = printableHeight;
      finalWidth = printableWidth * scaleRatio;
    }

    const xOffset = margin + (printableWidth - finalWidth) / 2;
    const yOffset = margin;

    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(safeFileName);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  } finally {
    // Clean up cloned element from DOM
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
  }
};
