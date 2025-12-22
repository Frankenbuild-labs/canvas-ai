import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const type = searchParams.get("type") || "default"

	let html = ""

	if (type === "default") {
		// Teal theme preview with robot icon and updated copy
		html = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Agent Preview</title>
		<style>
			:root {
				--teal-800: #115e59; /* teal-800 */
				--teal-900: #0f3f3a; /* custom deep teal */
				--slate-900: #0f172a; /* slate-900 */
				--slate-800: #1e293b; /* slate-800 */
			}
			html, body { height: 100%; }
			body {
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
				/* Dark teal to grey gradient */
				background: radial-gradient(1200px 700px at 20% 20%, rgba(17,94,89,0.35), rgba(17,94,89,0) 60%),
										radial-gradient(900px 600px at 80% 30%, rgba(15,63,58,0.45), rgba(15,63,58,0) 55%),
										linear-gradient(135deg, var(--slate-900) 0%, var(--teal-900) 35%, var(--teal-800) 55%, var(--slate-800) 100%);
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				color: white;
			}
		.container {
			text-align: center;
			max-width: 560px;
			padding: 40px;
		}
			.icon {
			width: 88px;
			height: 88px;
				background: rgba(255,255,255,0.12);
				border: 1px solid rgba(255,255,255,0.15);
			border-radius: 20px;
			margin: 0 auto 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			box-sizing: border-box;
				box-shadow: 0 10px 30px rgba(17,94,89,0.35);
			backdrop-filter: blur(4px);
		}
		h2 {
			font-size: 28px;
			font-weight: 700;
			margin: 0 0 12px 0;
			letter-spacing: -0.4px;
		}
		p {
			font-size: 16px;
			opacity: 0.95;
			line-height: 1.6;
			margin: 0;
		}
	</style>
	</head>
	<body>
		<div class="container">
			<div class="icon" aria-hidden="true">
				<!-- Robot icon -->
				<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<rect x="5" y="8" width="14" height="10" rx="2" ry="2"/>
					<circle cx="9" cy="13" r="1.5" fill="currentColor"/>
					<circle cx="15" cy="13" r="1.5" fill="currentColor"/>
					<path d="M12 4v2"/>
					<path d="M7 18v2"/>
					<path d="M17 18v2"/>
				</svg>
			</div>
			<h2>Agent Preview</h2>
			<p>Your created agent will appear here for testing.</p>
		</div>
	</body>
	</html>`
	}

	return new NextResponse(html, {
		headers: {
			"Content-Type": "text/html",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			Pragma: "no-cache",
			Expires: "0",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	})
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	})
}
