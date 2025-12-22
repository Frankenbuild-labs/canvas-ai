import { NextResponse } from "next/server";

// Temporary stub for generated agent execution while the external Lovable
// backend is not configured in this environment.
export async function POST() {
	return NextResponse.json(
		{
			error: "Generated agent execution is not configured on this server.",
		},
		{ status: 501 }
	);
}

export function OPTIONS() {
	return NextResponse.json(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
