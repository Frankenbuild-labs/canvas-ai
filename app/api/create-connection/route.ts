import { NextResponse } from "next/server";

// Temporary stub: the Lovable agents backend is not available on this server.
// This keeps the build passing while clearly signalling that the endpoint is disabled.
export async function POST() {
	return NextResponse.json(
		{
			error: "The agent connection backend is not configured on this server.",
		},
		{ status: 501 }
	);
}
