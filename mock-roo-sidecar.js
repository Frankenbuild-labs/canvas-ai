#!/usr/bin/env node
/**
 * Mock Roo Sidecar for Testing Integration
 * 
 * This creates a simple HTTP server that mimics the Agent Maestro API endpoints
 * so we can test the Next.js integration without needing the real sidecar.
 * 
 * Usage: node mock-roo-sidecar.js
 */

const http = require('http')
const crypto = require('crypto')

const PORT = 23333
let tasks = new Map()

function generateTaskId() {
  return 'task_' + crypto.randomBytes(8).toString('hex')
}

function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  console.log(`[mock-sidecar] ${req.method} ${url.pathname}`)

  // Base health endpoint
  if (url.pathname === '/api/v1' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'mock-roo-sidecar' }))
    return
  }

  // Task creation endpoint
  if (url.pathname === '/api/v1/roo/task' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk.toString())
    req.on('end', async () => {
      try {
        const { text, extensionId, model, temperature } = JSON.parse(body)
        const taskId = generateTaskId()
        tasks.set(taskId, { text, model, temperature, status: 'active' })

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        })

        // Send task created event
        sendSSE(res, 'taskCreated', { taskId })
        await delay(500)

        // Send initial message
        sendSSE(res, 'message', {
          text: `Mock Roo processing: "${text}"`,
          partial: true,
          taskId
        })
        await delay(1000)

        // Send completion
        sendSSE(res, 'message', {
          text: `Mock Roo processing: "${text}" - Analysis complete. This is a simulated response using model=${model}, temp=${temperature}. Would you like me to proceed?`,
          partial: false,
          ask: 'followup',
          suggestions: ['Yes, proceed', 'No, revise approach', 'Explain more'],
          taskId
        })
        await delay(500)

        // Keep connection open for potential follow-ups
        const keepAlive = setInterval(() => {
          sendSSE(res, 'ping', { timestamp: Date.now() })
        }, 10000)

        res.on('close', () => {
          clearInterval(keepAlive)
          console.log(`[mock-sidecar] Task ${taskId} connection closed`)
        })

      } catch (e) {
        console.error('[mock-sidecar] Error processing task:', e)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request body' }))
      }
    })
    return
  }

  // Task message endpoint (follow-ups)
  if (url.pathname.match(/^\/api\/v1\/roo\/task\/([^\/]+)\/message$/) && req.method === 'POST') {
    const taskId = url.pathname.match(/^\/api\/v1\/roo\/task\/([^\/]+)\/message$/)[1]
    
    if (!tasks.has(taskId)) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Task not found' }))
      return
    }

    let body = ''
    req.on('data', chunk => body += chunk.toString())
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body)
        
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        })

        sendSSE(res, 'message', {
          text: `Mock follow-up response to: "${text}"`,
          partial: true,
          taskId
        })
        await delay(800)

        sendSSE(res, 'message', {
          text: `Mock follow-up response to: "${text}" - Understood. Task completed successfully.`,
          partial: false,
          taskId
        })

        sendSSE(res, 'taskCompleted', { taskId })
        res.end()

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request body' }))
      }
    })
    return
  }

  // Task action endpoint (approve/reject)
  if (url.pathname.match(/^\/api\/v1\/roo\/task\/([^\/]+)\/action$/) && req.method === 'POST') {
    const taskId = url.pathname.match(/^\/api\/v1\/roo\/task\/([^\/]+)\/action$/)[1]
    
    let body = ''
    req.on('data', chunk => body += chunk.toString())
    req.on('end', () => {
      try {
        const { action } = JSON.parse(body)
        console.log(`[mock-sidecar] Task ${taskId} action: ${action}`)
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, taskId, action }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid request body' }))
      }
    })
    return
  }

  // 404 for other paths
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[mock-sidecar] Mock Roo sidecar running on http://localhost:${PORT}`)
  console.log('[mock-sidecar] Endpoints:')
  console.log('  GET  /api/v1                    - Health check')  
  console.log('  POST /api/v1/roo/task           - Create task (SSE)')
  console.log('  POST /api/v1/roo/task/{id}/message - Follow-up message')
  console.log('  POST /api/v1/roo/task/{id}/action  - Task action')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[mock-sidecar] Shutting down...')
  server.close(() => {
    console.log('[mock-sidecar] Server closed')
    process.exit(0)
  })
})