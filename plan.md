# Sequential Data Loading Optimization Plan

To improve initial loading speed, we will implement a sequential fetching strategy that prioritizes albums, then comics, and lazy-loads audio on demand.

## 1. State Management Changes (src/App.tsx)
- Add `isComicsLoading` state to track the status of comic metadata fetching separately.
- Modify the `fetchData` effect to execute sequentially:
    - **Step 1: Albums First** - Fetch albums and invitations.
    - **Step 2: Profiles** - Fetch owner profiles for the albums.
    - **Step 3: Render Catalog** - Set albums state and set `isLoading` to false (this hides the splash screen immediately after albums are ready).
    - **Step 4: Comics Metadata** - Fetch comic titles and covers (excluding audio URLs) in the background.
    - **Step 5: Finalize Load** - Set comics state and set `isComicsLoading` to false.

## 2. Component Enhancements
### src/components/ComicSidebar.tsx
- Update the component to accept an `isLoading` prop.
- Implement a loading skeleton or indicator that appears when comics are still being fetched, ensuring the UI doesn't look broken if the user navigates to the player view quickly.

### src/components/AudioPlayer.tsx
- Ensure the "Preparing Audio..." state is properly displayed when a comic is selected but its `audioUrl` is still being fetched.
- Verify that the `audio` tag correctly handles `preload="none"` to prevent premature data consumption.

## 3. Sequential Logic Flow
- **On App Mount**: Splash screen active.
- **Albums Loaded**: Splash screen disappears, user sees the Album Catalog.
- **Comics Fetching**: In the background, comic metadata is loaded.
- **On Comic Select**: Specific `audio_url` is fetched and played.

## 4. Verification
- Verify that the splash screen disappears faster (since it only waits for albums).
- Verify that the comic list in the sidebar shows a loading state if the player view is opened before they are ready.
- Verify that audio only starts downloading when a play action or selection occurs.
