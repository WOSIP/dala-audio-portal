# Optimization Plan: On-Demand Episode and Audio Loading

This plan outlines the steps to optimize the application by fetching episodes (comics) only when an album is selected and fetching audio URLs only when an episode is selected.

## Scope
- Modify `src/data.ts` to support filtered fetching.
- Update `src/App.tsx` to handle on-demand fetching logic.
- Optimize network usage by preventing bulk loading of episodes and audio.

## Proposed Changes

### 1. Data Layer Optimization (`src/data.ts`)
- Update `fetchComics`:
    - Add an optional `albumId` parameter.
    - If `albumId` is provided, filter the query by `album_id`.
    - Ensure it returns metadata without the full `audio_url` if the intention is to load audio separately (as specified by "Rule 2").
- Ensure `fetchComicAudio` exists and correctly retrieves the `audio_url` for a specific `comic_id`.

### 2. Application Logic Updates (`src/App.tsx`)
- **Initial Load**:
    - Remove the global `fetchComics()` call from the initial `fetchData` function.
    - The app should only load albums initially.
- **Album Selection (`handleAlbumSelect`)**:
    - Trigger `fetchComics(albumId)` when a user selects an album.
    - Update the `comics` state with the newly fetched episodes for that specific album.
    - Manage `isComicsLoading` state during this fetch.
- **Episode Selection (`handleComicSelect`)**:
    - Check if the selected episode already has an `audioUrl`.
    - If not, trigger `loadComicAudio(comicId)` to fetch the audio link.
    - Update the specific comic in the `comics` state with the retrieved URL.

### 3. UI Component Adjustments
- `src/components/ComicSidebar.tsx`:
    - Ensure it correctly reflects the loading state while episodes for the selected album are being fetched.
- `src/components/AudioPlayer.tsx`:
    - Ensure it handles the `isFetching` state (already passed from `App.tsx`) to show a loader or placeholder while the audio URL is being retrieved.

## Affected Areas
- `src/data.ts`: Fetching logic.
- `src/App.tsx`: Central state and orchestration logic.
- `src/components/ComicSidebar.tsx`: Episode list display.
- `src/components/AudioPlayer.tsx`: Audio playback.

## Plan Phases

### Phase 1: Data Fetching Layer (frontend_engineer)
- Refactor `fetchComics` and verify `fetchComicAudio` in `src/data.ts`.
- **Deliverable**: Functional on-demand data retrieval functions.

### Phase 2: App Orchestration (frontend_engineer)
- Implement conditional fetching in `src/App.tsx`.
- Connect `handleAlbumSelect` to the new `fetchComics` logic.
- Ensure `handleComicSelect` triggers `loadComicAudio`.
- **Deliverable**: App only loads what is necessary when it is necessary.

### Phase 3: UI/UX Refinement (frontend_engineer)
- Verify loading indicators and error handling for the new on-demand requests.
- **Deliverable**: Polished user experience during data transitions.

## Risks & Assumptions
- **Risk**: Rapidly clicking between albums might cause race conditions in the `comics` state. Solution: Ensure state updates are keyed or use a cleanup/cancellation mechanism if necessary.
- **Assumption**: The Supabase table `comics` has an `album_id` column for filtering.
