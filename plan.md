1. **Data Model Update**:
   - Update `src/types.ts` to use `illustrationUrls` instead of `illustrations`.
   - Update `src/data.ts` to match the new type.

2. **App.tsx State Refactor**:
   - Move `currentIllustrationIndex` from `AudioPlayer` to `App.tsx`.
   - Ensure it resets to 0 when `currentComic` changes.
   - Create handlers `handleNextPage` and `handlePrevPage`.

3. **Admin Panel Enhancement**:
   - Add a "Single Link" input field.
   - Add a "Process & Extract" button.
   - Implement `processLink` logic:
     - If it's a specific recognized format (mocking this), populate `audioUrl` and `illustrationUrls`.
     - Otherwise, show a toast.
   - Keep manual overrides for flexibility.

4. **AudioPlayer Refactor**:
   - Update to use `illustrationUrls`.
   - Repurpose the primary Next/Previous buttons (SkipBack/SkipForward) to handle page navigation within the current comic, as requested by the user's UX description.
   - Add a "Next/Prev Comic" indicator or small buttons if needed, or rely on the sidebar for comic switching as per the user's primary "How it works" description.

5. **Validation**:
   - Verify that clicking a comic in the sidebar resets the page to 1.
   - Verify that page flipping doesn't stop the audio.
   - Verify that the single link processing works.