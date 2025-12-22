// Fetch official ONLYOFFICE sample templates into public/templates by
// downloading the latest release asset (Node.js.Example.zip) and extracting
// sample files.
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import unzipper from 'unzipper'

const OWNER = 'ONLYOFFICE'
const REPO = 'document-server-integration'
const LATEST_RELEASE_API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`
const USER_AGENT = 'canvasai-fetch-onlyoffice-templates/1.0'

// Files we want to extract from the Node.js example archive. We'll match by suffix.
const desired = [
  { suffix: '/sample/sample.docx', out: 'docx/sample.docx' },
  { suffix: '/sample/sample.xlsx', out: 'xlsx/sample.xlsx' },
  { suffix: '/sample/sample.pdf', out: 'pdf/sample.pdf' },
  { suffix: '/sample/sample.pptx', out: 'pptx/sample.pptx' }, // not used in UI yet
  { suffix: '/sample/csv.csv', out: 'data/csv.csv' },
]

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT, ...headers } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(httpGet(res.headers.location, headers))
      }
      if (res.statusCode !== 200) {
        const chunks = []
        res.on('data', (d) => chunks.push(d))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          reject(new Error(`HTTP ${res.statusCode} for ${url}: ${body.slice(0, 500)}`))
        })
        return
      }
      const chunks = []
      res.on('data', (d) => chunks.push(d))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', reject)
  })
}

async function fetchLatestNodeZipUrl() {
  // Try latest release API first
  try {
    const buf = await httpGet(LATEST_RELEASE_API, { Accept: 'application/vnd.github+json' })
    const json = JSON.parse(buf.toString('utf8'))
    const asset = (json.assets || []).find((a) => typeof a?.name === 'string' && a.name.toLowerCase().includes('node.js.example.zip'))
    if (asset && asset.browser_download_url) return asset.browser_download_url
    // Fallback: attempt to find any asset containing 'Node.js.Example.zip'
    const alt = (json.assets || []).find((a) => /node\.js\.example\.zip/i.test(a?.name || ''))
    if (alt?.browser_download_url) return alt.browser_download_url
  } catch (e) {
    console.warn('Warning: Failed to query latest release API:', e?.message || e)
  }
  // Final fallback to a known recent tag (may change over time)
  const fallbackTag = 'v1.11.0'
  return `https://github.com/${OWNER}/${REPO}/releases/download/${fallbackTag}/Node.js.Example.zip`
}

async function cleanTemplates(base) {
  const subdirs = ['docx', 'xlsx', 'pdf', 'pptx', 'data']
  await ensureDir(base)
  for (const d of subdirs) {
    const dir = path.join(base, d)
    await ensureDir(dir)
    try {
      const entries = await fs.readdir(dir)
      for (const name of entries) {
        await fs.rm(path.join(dir, name), { recursive: true, force: true })
      }
    } catch {
      // ignore
    }
  }
}

async function extractDesired(zipBuffer, destBase) {
  const directory = await unzipper.Open.buffer(zipBuffer)
  const lowerEntries = directory.files.map((f) => ({
    entry: f,
    lowerPath: f.path.replace(/\\/g, '/').toLowerCase(),
  }))

  for (const { suffix, out } of desired) {
    const target = lowerEntries.find(({ lowerPath }) => lowerPath.endsWith(suffix))
    if (!target) {
      console.warn('Not found in archive:', suffix)
      continue
    }
    const writeTo = path.join(destBase, out)
    await ensureDir(path.dirname(writeTo))
    const content = await target.entry.buffer()
    await fs.writeFile(writeTo, content)
    console.log('Extracted', out)
  }
}

async function main() {
  const base = path.join(process.cwd(), 'public', 'templates')
  await cleanTemplates(base)

  const url = await fetchLatestNodeZipUrl()
  console.log('Downloading official ONLYOFFICE archive:', url)
  const zipBuffer = await httpGet(url)

  console.log('Extracting desired sample files...')
  await extractDesired(zipBuffer, base)

  console.log('Official ONLYOFFICE templates fetched into /public/templates')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
