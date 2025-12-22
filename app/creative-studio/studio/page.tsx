"use client";
// Integrated Studio page combining generator panels and CESDK editor via starter kit App component.
import React from 'react';
import { App } from '@video-kit/components/main';

export default function IntegratedStudioPage() {
  // For now use a placeholder project id; later derive from user/workspace context.
  const projectId = 'local-default-project';
  return <App projectId={projectId} />;
}