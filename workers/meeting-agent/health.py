"""
Health check endpoint for agent worker monitoring
"""
import asyncio
from aiohttp import web


async def health_check(request):
    """Simple health check endpoint"""
    return web.Response(text="OK", status=200)


async def start_health_server(port: int = 8080):
    """Start health check HTTP server"""
    app = web.Application()
    app.router.add_get('/health', health_check)
    app.router.add_get('/healthz', health_check)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    
    return runner
