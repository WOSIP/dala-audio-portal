import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker using Vite's asset bundling
// This is more reliable than using a CDN as it ensures the worker version matches the library version
// and avoids potential network/CORS issues.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts all pages from a PDF file and returns them as an array of data URLs.
 * @param file The PDF file to parse
 * @returns A promise that resolves to an array of base64 image strings
 */
export const extractPagesFromPDF = async (file: File): Promise<string[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageUrls: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // High quality scale
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('Could not create canvas context');
        continue;
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Use any to bypass version-specific type differences in pdfjs-dist
      // In some versions of pdfjs-dist, the render context properties might vary slightly
      const renderContext: any = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      const dataUrl = canvas.toDataURL('image/webp', 0.8);
      pageUrls.push(dataUrl);
      
      // Clean up
      canvas.remove();
    }

    return pageUrls;
  } catch (error) {
    console.error('Error extracting pages from PDF:', error);
    throw new Error('Failed to process PDF file. Please ensure it is a valid PDF.');
  }
};