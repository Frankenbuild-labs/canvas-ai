import http from 'http'
import pkg from 'http-proxy'
const { createProxyServer } = pkg

const TARGET = process.env.VSCODE_TARGET || 'http://127.0.0.1:3100'
const PROXY_PORT = Number(process.env.VSCODE_PROXY_PORT || 3101)

const proxy = createProxyServer({
  target: TARGET,
  changeOrigin: true,
  ws: true,
  ignorePath: false,
  selfHandleResponse: false,
})

// Remove frame-blocking headers so the app can embed it
proxy.on('proxyRes', (proxyRes) => {
  if (proxyRes.headers['x-frame-options']) delete proxyRes.headers['x-frame-options']
  if (proxyRes.headers['content-security-policy']) {
    try {
      const csp = proxyRes.headers['content-security-policy']
      // Loosen frame-ancestors directive
      const updated = String(csp).replace(/frame-ancestors [^;]+;/, "frame-ancestors *;")
      proxyRes.headers['content-security-policy'] = updated
    } catch {}
  }
})

const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: TARGET })
})

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: TARGET })
})

server.listen(PROXY_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`VS Code Web proxy listening on http://localhost:${PROXY_PORT} -> ${TARGET}`)
})
