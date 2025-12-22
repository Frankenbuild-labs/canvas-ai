<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/191CgXR8VI6RJtATkiNr37djkRd_3npjp

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Buzz Roll Feature (Production Readiness)

The Buzz Roll module is an interactive clip sequencing and lightweight rendering tool. Recent enhancements:
- Error boundaries wrapped around preview and timeline to prevent full-app crashes.
- Cancellable export overlay with clearer status feedback.
- Accessibility upgrades (ARIA labels for navigation, color/font controls, keyboard timeline navigation with arrow/delete keys).
- Dynamic caption styling (font family, position, size, color) with improved type safety.
- Memory management: object URLs revoked on clip deletion and unmount to reduce leaks.
- Centralized non-blocking error messaging replacing blocking alerts.

Planned next steps:
- Persist projects (localStorage or backend) and add autosave.
- Add undo/redo stack and per-clip versioning.
- Integrate real media generation for AI-generated placeholder clips.
- Add unit tests for text wrapping / export sequencing.
- Introduce global state store (e.g. Zustand) for multi-panel synchronization.

Keyboard shortcuts:
- Left/Right arrows: move selection in timeline
- Delete: remove selected clip
- Space: play/pause (to be added)

If you integrate server endpoints, ensure `/api/b-roll/*` routes perform input validation and streaming where appropriate.
