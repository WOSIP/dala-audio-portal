# Implementation Plan - Lazy Loading for Comic Audio

To improve portal loading speed, we will defer the fetching of comic audio URLs from the initial database load to an on-demand basis when a specific comic is selected.

## 1. Type Definitions
- Modify `src/types.ts` to make `audioUrl` optional in the `Comic` interface.

## 2. Main Application Logic (`src/App.tsx`)
- **Initial Fetch**: Update the `fetchData` function to select all comic fields EXCEPT `audio_url`. This reduces the initial payload size and avoids any potential browser pre-fetching of many audio resources.
- **On-Demand Fetching**: 
    - Implement `fetchComicAudio` function to retrieve the `audio_url` for a specific comic from Supabase.
    - Update `handleComicSelect` to be asynchronous. If the selected comic's `audioUrl` is missing, fetch it and update the local `comics` state.
- **State Management**: The `currentComic` useMemo will automatically reflect the updated `audioUrl` once it's fetched and stored in the `comics` state.

## 3. UI Components
- **AudioPlayer (`src/components/AudioPlayer.tsx`)**:
    - Add a loading state to handle the transition while the audio URL is being fetched.
    - Display a loading indicator (e.g., a spinner or "Loading audio...") when `currentComic.audioUrl` is not yet available.
    - Ensure the `<audio>` element handles the new source correctly once it arrives.
- **AdminPanel (`src/components/AdminPanel.tsx`)**:
    - Ensure that when a comic is opened for editing, its `audioUrl` is fetched if missing, so the admin can see/modify the existing audio source.

## 4. Optimization
- Add `preload="none"` to the `<audio>` tags in `AudioPlayer.tsx` to further prevent unnecessary network activity until the user interacts with the player.
