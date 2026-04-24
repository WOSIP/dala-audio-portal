# Plan to fix PDF Worker Runtime Error

The application fails to load the PDF worker from Cloudflare CDN, causing a runtime error when processing PDF files. We will switch to using a local worker bundled by Vite, which is the recommended and more reliable approach for modern React/Vite applications.

## Steps:

1. **Update `src/utils/pdf-handler.ts`**:
   - Import the worker source directly from `pdfjs-dist` using Vite's `?url` suffix.
   - Set `pdfjsLib.GlobalWorkerOptions.workerSrc` to this imported URL.
   - This ensures the worker is bundled and served from the same origin as the application, avoiding CORS and network issues.

2. **Verification**:
   - Run `validate_build` to ensure the project still builds correctly with the new import.
   - The runtime error should be resolved when the application is previewed.