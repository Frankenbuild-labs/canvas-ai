// app/api/voice/sw/agents/service-status/route.ts
// Check if the Python agents service is running

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const serviceUrl = process.env.AGENTS_SERVICE_URL || 'http://127.0.0.1:8100';
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${serviceUrl}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return NextResponse.json({
        running: false,
        error: `Service returned status ${response.status}`,
      });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      running: true,
      url: serviceUrl,
      agents: data.agents || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      running: false,
      error: error.name === 'AbortError' 
        ? 'Service timeout - not responding' 
        : error.message || 'Service unreachable',
    });
  }
}
