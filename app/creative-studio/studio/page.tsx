"use client";
import React from "react";

// Temporary stub for the integrated studio until the video toolkit
// package is available in this environment.
export default function IntegratedStudioPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <h1 className="text-2xl font-semibold mb-4">Integrated Studio</h1>
      <p className="max-w-xl text-muted-foreground">
        The full video editing studio is not yet configured on this server.
        This placeholder keeps the app deployable while we hook up the
        underlying video toolkit.
      </p>
    </div>
  );
}
