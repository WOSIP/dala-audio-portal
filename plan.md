Plan: Implement modification of comic soundtracks.

**Schema Changes:**
1.  **Database:** Add a new column `soundtrack_url` (type: TEXT, nullable) to the `comics` table.
2.  **Storage:** Create a new Supabase Storage bucket named `comic_soundtracks`.

**Agent Assignments:**

**1. Supabase Engineer:**
    *   Execute Supabase database migration to add the `soundtrack_url` column to the `comics` table.
    *   Configure the `comic_soundtracks` storage bucket with appropriate policies (e.g., authenticated users can upload/update).
    *   Implement backend logic in `src/lib/supabase.ts` for:
        *   Uploading soundtrack files to the `comic_soundtracks` bucket.
        *   Updating the `comics.soundtrack_url` with the uploaded file's URL.
        *   Handling file deletion or replacement.

**2. Frontend Engineer:**
    *   Modify `src/components/AdminPanel.tsx` (or a related component) to include a UI element for:
        *   Selecting and uploading soundtrack files for a specific comic.
        *   Displaying the current soundtrack if available.
        *   Triggering the backend upload/update function.
    *   Ensure the UI integrates seamlessly with the existing admin panel features.

**Notes:**
- Ensure existing comic cover image modification, audio playback, and access policies remain unaffected.
- All changes must be backward compatible.
