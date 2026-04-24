# Enhanced Album Management Plan

## Goal
Improve album management by allowing detailed editing of album metadata, visibility, and granular access control for invited users.

## 1. Type & Data Schema Updates
- **`src/types.ts`**: 
    - Update `Album` interface:
        - Replace `invitedEmails: string[]` with `invitedAccess: { email: string; enabled: boolean }[]`.
- **`src/data.ts`**:
    - Update `initialAlbums` to match the new `invitedAccess` structure.

## 2. Component Enhancements

### Admin Panel (`src/components/AdminPanel.tsx`)
- **Album Management State**:
    - Add `editingAlbum: Album | null` state to track which album is being edited.
- **Album Editor UI**:
    - Create a detailed edit view for albums.
    - **Metadata**: Fields for Title, Description, and Cover Image upload.
    - **Visibility**: Toggles for `isEnabled` and `privacy` (Public/Private).
    - **Stories List**: Display a read-only list of stories (episodes) currently assigned to the album.
    - **Access Control**:
        - List of invited users.
        - Toggles for each user to enable/disable their specific access.
        - Option to remove an invited user.
        - Form to add new invited users.
- **Actions**:
    - Add `onUpdateAlbum` to props and implementation.

### Comic Sidebar (`src/components/ComicSidebar.tsx`)
- Update rendering to handle the new `invitedAccess` object structure when checking for private access.

### App Component (`src/App.tsx`)
- **State Updates**:
    - Implement `handleUpdateAlbum` to modify existing albums in the state.
    - Update `accessibleAlbums` useMemo logic to check `invitedAccess.find(u => u.email === userEmail && u.enabled)`.
- **Prop Passing**:
    - Pass `onUpdateAlbum` to `AdminPanel`.

## 3. Supabase Integration (Future/Implicit)
- Ensure functions in `supabase.ts` (if any are added) support the updated schema.
- (Note: The current implementation seems to be largely local-state driven for the demo, but I will ensure the logic is ready for persistence).

## 4. UI/UX Refinement (using ui-ux-pro-max)
- Maintain the "Dark Mode" aesthetic with Amber accents.
- Use `sonner` for feedback on all management actions.
- Ensure the Admin Panel remains responsive and organized using Tabs/ScrollAreas for long lists.
