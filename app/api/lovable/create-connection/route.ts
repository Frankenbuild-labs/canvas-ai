import { NextResponse } from "next/server";

export async function POST() {
	return NextResponse.json(
		{
			error: "Lovable agent connection backend is not configured on this server.",
		},
		{ status: 501 }
	);
}
