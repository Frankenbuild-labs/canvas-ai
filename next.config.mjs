/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Proxy OpenVSCode Server (running locally on 127.0.0.1:3100) to same-origin
    return [
      {
        source: '/vscode/:path*',
        destination: 'http://127.0.0.1:3100/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/vscode/:path*',
        headers: [
          // Allow this path to be embedded by our Next app origin
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000;",
          },
        ],
      },
    ]
  },
}

export default nextConfig
