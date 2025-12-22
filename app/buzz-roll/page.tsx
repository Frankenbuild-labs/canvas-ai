"use client";
import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load the Buzz Roll App since it's heavier and uses client-only APIs
const BuzzRollApp = dynamic(() => import('../../buzz-roll/App'), { ssr: false });

export default function BuzzRollPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <BuzzRollApp />
    </div>
  );
}
