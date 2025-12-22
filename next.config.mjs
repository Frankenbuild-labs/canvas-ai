import path from 'path'
/** @type {import('next').NextConfig} */
const isWin = process.platform === 'win32'
const nextConfig = {
  // Use a fresh distDir on Windows to avoid EPERM locks by AV on trace files
  distDir: isWin ? ".next-win" : ".next",
  // Ensure serverful output to avoid static export of API routes
  output: 'standalone',
  // Enable output file tracing for standalone output
  outputFileTracing: true,
  // Ensure untranspiled ESM from cesdk is bundled correctly
  transpilePackages: ['@cesdk/cesdk-js'],
  experimental: {
    // Allow server-only packages to be used in app router route handlers
    serverComponentsExternalPackages: ["pptxgenjs"],
    swcTraceProfiling: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/video-editor',
        destination: '/creative-studio/video-studio',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    // Proxy OpenVSCode Server (running locally on 127.0.0.1:3100) to same-origin
    // Proxy OnlyOffice Document Server (127.0.0.1:8082) to avoid CORS
    return [
      {
        source: '/vscode/:path*',
        destination: 'http://127.0.0.1:3100/:path*',
      },
      {
        source: '/onlyoffice-proxy/:path*',
        destination: 'http://127.0.0.1:8082/:path*',
      },
      // OnlyOffice requests with version prefix like /8.1.1-26/sdkjs/..., /8.1.1-26/web-apps/...
      {
        source: '/:version(\\d+\\.\\d+\\.\\d+-\\d+)/:path*',
        destination: 'http://127.0.0.1:8082/:version/:path*',
      },
      // OnlyOffice downloadfile endpoint
      {
        source: '/downloadfile/:path*',
        destination: 'http://127.0.0.1:8082/downloadfile/:path*',
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
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : []
      // Keep certain heavy / Node-only libs out of the serverless/client bundles
      config.externals = [...externals, 'pptxgenjs', 'bullmq', 'ioredis']
    }
    // Workaround: Avoid WebAssembly-based hashing on Windows which can crash during prod builds
    // Force Node.js crypto-based hashing and skip realContentHash
    config.output = config.output || {}
    config.output.hashFunction = 'sha256'
    config.optimization = config.optimization || {}
    config.optimization.realContentHash = false
    // Rewrite internal imports in the video-starter-kit from "@/" to our "@vk/" alias
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: [path.resolve(process.cwd(), 'videokit/video-starter-kit/src')],
      use: [
        {
          loader: 'string-replace-loader',
          options: {
            search: "from \"@/",
            replace: "from \"@vk/",
            flags: 'g',
          },
        },
      ],
    })
    // Provide a runtime alias for @vk to the videokit source without forcing TS to typecheck it
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@vk': path.resolve(process.cwd(), 'videokit/video-starter-kit/src'),
    }
    // Inject embedded lead-gen worker bootstrap on server side for unified startup when ENABLE_LEADGEN_WORKER=1
    if (isServer) {
      const originalEntry = config.entry
      config.entry = async () => {
        const entries = await originalEntry()
        // Attach a tiny server-only bootstrap that starts the embedded worker.
        // Because bullmq/ioredis are marked as externals and required lazily
        // from embedded-worker, they will only be loaded in the Node runtime.
        entries['leadgen-worker-bootstrap'] = { import: ['./lib/leadgen/worker-bootstrap.ts'] }
        return entries
      }
    }
    return config
  },
}

export default nextConfig
