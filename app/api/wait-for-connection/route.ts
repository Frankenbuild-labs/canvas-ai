import { NextResponse } from "next/server";

// Temporary stub: Lovable wait-for-connection backend is not configured on this server.
export async function POST() {
	return NextResponse.json(
		{
			error: "Lovable wait-for-connection backend is not configured on this server.",
		},
		{ status: 501 }
	);
}
