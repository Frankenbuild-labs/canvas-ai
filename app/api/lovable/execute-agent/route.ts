import { NextResponse } from "next/server";

export async function POST() {
	return NextResponse.json(
		{
			error: "Lovable generated agent execution is not configured on this server.",
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
