import { NextResponse } from "next/server";

// Temporary stub: Lovable preview backend is not wired up on this server.
export async function GET() {
	return NextResponse.json(
		{
			error: "Lovable preview backend is not configured on this server.",
		},
		{ status: 501 }
	);
}

export function OPTIONS() {
	return NextResponse.json(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
