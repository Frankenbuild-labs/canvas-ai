import { NextResponse } from "next/server";

// Simple proxy route to fal.ai for text/content generation.
// Accepts JSON: { prompt: string, model?: string }
// Uses server-side FAL_KEY so the key is never exposed to the browser.
// Default model chosen for general instruction following / content drafting.
// Adjust `model` to an image or other endpoint if needed (e.g. "fal-ai/flux/dev").

type FalContentRequest = {
  prompt?: string;
  model?: string; // e.g. "fal-ai/llama-3.1-8b-instruct" or other supported endpoint
};

export async function POST(req: Request) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ success: false, error: "FAL_KEY not configured" }, { status: 500 });
  }

  let body: FalContentRequest;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
  }

  const model = body.model?.trim() || "fal-ai/llama-3.1-8b-instruct";

  try {
    const falRes = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${falKey}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!falRes.ok) {
      const text = await falRes.text();
      return NextResponse.json({ success: false, error: `fal API error (${falRes.status}): ${text}` }, { status: 500 });
    }

    const falJson = await falRes.json();
    // Attempt to normalize a few common shapes; prefer "response" if present.
    const draft = falJson.response || falJson.output || falJson.text || JSON.stringify(falJson);
    return NextResponse.json({ success: true, model, draft, raw: falJson });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Unknown error" }, { status: 500 });
  }
}
