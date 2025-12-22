"use client";
import React from "react";

// Temporary placeholder while @video-kit/components is not available on the server build.
// This keeps the app compiling; the full studio integration can be re-enabled later.
export default function CreativeStudioPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <h1 className="text-2xl font-semibold mb-4">Creative Studio</h1>
      <p className="max-w-xl text-muted-foreground">
        The integrated video/image studio is not yet configured on this server.
        You can still use the rest of the app while we finish wiring up the
        video toolkit.
      </p>
    </div>
  );
}
