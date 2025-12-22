import { NextResponse } from "next/server";

export async function POST() {
	return NextResponse.json(
		{
			error: "Lovable agent toolkit info backend is not configured on this server.",
		},
		{ status: 501 }
	);
}
