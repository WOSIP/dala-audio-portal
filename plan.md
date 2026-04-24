# Implementation Plan - Illustration Flipping Format Adjustment

The goal is to enhance the visual presentation and transition of illustrations during the page flipping process in the `AudioPlayer` component.

## Proposed Changes

### 1. Illustration Display Format
- **Current State**: Illustrations use `object-cover` in a fixed aspect-ratio container (`16/9` or `21/9`), which causes significant cropping for portrait-oriented comic pages.
- **Adjustment**: 
    - Change main illustration to `object-contain` to ensure the entire page is visible.
    - Add a background layer with the same illustration using `object-cover` and high `blur` to provide an immersive, color-matched backdrop that fills the container.
    - Maintain the aspect ratio container for consistency in the UI layout.

### 2. Flipping Animation Enhancement
- **Current State**: Simple horizontal slide (`x: 20` to `x: -20`).
- **Adjustment**: 
    - Implement a more sophisticated "page flip" feel using `framer-motion`.
    - Add subtle 3D rotation (`rotateY`) and scaling during the transition.
    - Improve the transition timing for a more "physical" feel.

### 3. Polish & UI
- Ensure the page indicator and navigation arrows remain clear.
- Add a subtle vignette or overlay during the transition to enhance the depth.

## File to Modify
- `src/components/AudioPlayer.tsx`
