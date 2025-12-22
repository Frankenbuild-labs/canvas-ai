"use client";
// Image/Video Generator Studio main route: mounts starter kit App.
// Removed previous redirect; this becomes the canonical generator page.
import React from 'react';
import { App } from '@video-kit/components/main';

export default function CreativeStudioPage() {
  // For now use placeholder project id; can be replaced with user-specific logic.
  const projectId = 'generator-default-project';
  return <App projectId={projectId} />;
}
