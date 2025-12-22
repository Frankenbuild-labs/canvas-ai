import { NextResponse } from "next/server";

// Temporary stub: Lovable toolkit-info backend is not configured on this server.
export async function POST() {
	return NextResponse.json(
		{
			error: "Lovable toolkit-info backend is not configured on this server.",
		},
		{ status: 501 }
	);
}
