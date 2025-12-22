import { NextResponse } from "next/server";

// Temporary stub: the Lovable agent generator backend is not wired up
// on this server yet. This prevents build failures while clearly marking
// the endpoint as unavailable.
export async function POST() {
	return NextResponse.json(
		{
			error: "Agent generation is not configured on this server.",
		},
		{ status: 501 }
	);
}
