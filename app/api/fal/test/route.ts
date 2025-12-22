import { NextResponse } from "next/server";

export async function GET() {
  const falKey = process.env.FAL_KEY;
  return NextResponse.json({ 
    hasKey: !!falKey,
    keyPreview: falKey ? `${falKey.substring(0, 10)}...` : 'NOT SET'
  });
}
