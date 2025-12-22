import { NextRequest, NextResponse } from "next/server";
import { pathfixProxyCall, HttpMethod } from "@/lib/pathfix";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerRef, userId, url, method, payload, headers } = body as {
      providerRef: string;
      userId: string;
      url: string;
      method: HttpMethod;
      payload?: any;
      headers?: Record<string, string>;
    };

    if (!providerRef || !userId || !url || !method) {
      return NextResponse.json(
        { success: false, error: "providerRef, userId, url, and method are required" },
        { status: 400 }
      );
    }

    const res = await pathfixProxyCall({ providerRef, userId, url, method, payload, headers });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.error }, { status: res.status || 500 });
    }

    return NextResponse.json({ success: true, data: res.data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}
