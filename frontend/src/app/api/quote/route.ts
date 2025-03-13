import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const apiKey = process.env.NEXT_PUBLIC_ZEROX_KEY;

	const params = new URLSearchParams();
	for (const [key, value] of searchParams.entries()) {
		params.append(key, value);
	}

	try {
		const response = await fetch(`https://api.0x.org/swap/permit2/quote?${params.toString()}`, {
			headers: {
				"0x-api-key": apiKey || "",
				"0x-version": "v2",
			},
		});

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching quote:", error);
		return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
	}
}
