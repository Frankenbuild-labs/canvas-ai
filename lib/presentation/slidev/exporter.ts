import path from 'path'
import os from 'os'
import { spawn } from 'child_process'
import { promises as fs, existsSync } from 'fs'
import { SlideDeckSpec } from '@/types/presentation'
import { generateSlideMarkdown } from '@/lib/presentation/slidev/generateSlides'

export type SlidevFormat = 'pdf' | 'png'

interface SlidevBaseOptions {
  markdown?: string
  deckSpec?: SlideDeckSpec
  format?: SlidevFormat
}

const DEFAULT_PUBLIC_DIR = path.join(process.cwd(), 'public', 'exports')
const DEFAULT_PUBLIC_PATH = '/exports'
const MAX_MARKDOWN_CHARS = 180_000
const PRIMARY_SLIDEV_TMP_DIR = path.join(process.cwd(), '.next', 'cache', 'slidev')
const FALLBACK_SLIDEV_TMP_DIR = path.join(os.tmpdir(), 'canvasai-slidev')
const SLIDEV_TMP_OVERRIDE = process.env.SLIDEV_TMP_ROOT?.trim()
const KEEP_SLIDEV_TMP = process.env.SLIDEV_KEEP_TMP === '1'
const SLIDEV_DEBUG = process.env.SLIDEV_DEBUG === '1'
let resolvedSlidevTmpDir: string | null = null

const slidevExecutable = (() => {
  const binName = process.platform === 'win32' ? 'slidev.cmd' : 'slidev'
  const candidate = path.join(process.cwd(), 'node_modules', '.bin', binName)
  return existsSync(candidate) ? candidate : binName
})()

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function ensureSlidevTmpDir(): Promise<string> {
  if (resolvedSlidevTmpDir) return resolvedSlidevTmpDir
  const candidates = [SLIDEV_TMP_OVERRIDE ? path.resolve(SLIDEV_TMP_OVERRIDE) : null, PRIMARY_SLIDEV_TMP_DIR, FALLBACK_SLIDEV_TMP_DIR].filter(Boolean) as string[]
  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true })
      resolvedSlidevTmpDir = dir
      if (SLIDEV_DEBUG) {
        console.log(`[slidev] using tmp dir ${dir}`)
      }
      return dir
    } catch (error) {
      console.warn(`[slidev] Failed to initialize tmp dir ${dir}`, error)
    }
  }
  throw new Error('Unable to initialize Slidev tmp directory')
}

async function readFileWithRetry(filePath: string, attempts = 12, delayMs = 500) {
  let lastError: NodeJS.ErrnoException | null = null
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fs.readFile(filePath)
    } catch (error: any) {
      lastError = error
      if (error?.code === 'ENOENT' && attempt < attempts - 1) {
        await delay(delayMs)
        continue
      }
      break
    }
  }
  const enhanced = new Error(`Slidev export finished but output file was missing: ${filePath}`)
  if (lastError) {
    ;(enhanced as any).cause = lastError
  }
  throw enhanced
}

const toPosixPath = (p: string) => p.replace(/\\/g, '/')

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'deck'
}

function buildMarkdown(options: SlidevBaseOptions): string {
  if (options.markdown) {
    if (options.markdown.length > MAX_MARKDOWN_CHARS) {
      throw new Error('Markdown too large (max 180k characters)')
    }
    return options.markdown
  }
  if (options.deckSpec) {
    const markdown = generateSlideMarkdown(options.deckSpec)
    if (markdown.length > MAX_MARKDOWN_CHARS) {
      throw new Error('Generated markdown too large (max 180k characters)')
    }
    return markdown
  }
  throw new Error('Provide either markdown or deckSpec')
}

interface SlidevRunOptions {
  mdFile: string
  outFile: string
  format: SlidevFormat
  cwd?: string
}

function runSlidevExport({ mdFile, outFile, format, cwd }: SlidevRunOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ['export', mdFile, '--format', format, '--output', outFile]
    const child = spawn(slidevExecutable, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      shell: process.platform === 'win32',
      cwd,
    })

    let stderr = ''
    let stdout = ''
    const debug = Boolean(process.env.SLIDEV_DEBUG)

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.once('error', (err) => {
      const details = stderr.trim() || stdout.trim()
      const message = details ? `${err.message}\n${details}` : err.message
      reject(new Error(`Failed to start Slidev export (${slidevExecutable}): ${message}`))
    })

    child.once('exit', (code) => {
      if (code === 0) {
        if (debug) {
          if (stdout.trim()) console.log(`[slidev stdout]\n${stdout}`)
          if (stderr.trim()) console.log(`[slidev stderr]\n${stderr}`)
        }
        resolve()
      } else {
        const details = stderr.trim() || stdout.trim()
        const hint = details ? ` Details: ${details}` : ''
        reject(new Error(`Slidev export exited with code ${code}.${hint}`))
      }
    })
  })
}

async function renderSlidevBuffer(markdown: string, format: SlidevFormat) {
  const tmpRoot = await ensureSlidevTmpDir()
  const workDir = await fs.mkdtemp(path.join(tmpRoot, 'run-'))
  const stamp = Date.now()
  const mdFilename = `deck-${stamp}.md`
  const outFilename = `deck-${stamp}.${format}`
  const mdFile = path.join(workDir, mdFilename)
  const outFile = path.join(workDir, outFilename)

  try {
    await fs.writeFile(mdFile, markdown, 'utf8')
    if (SLIDEV_DEBUG) {
      console.log(`[slidev] workspace ${workDir}`)
    }
    await runSlidevExport({
      mdFile: toPosixPath(mdFile),
      outFile: toPosixPath(outFile),
      format,
      cwd: process.cwd(),
    })
    if (SLIDEV_DEBUG) {
      const entries = await fs.readdir(workDir).catch(() => [])
      console.log(`[slidev] run contents`, entries)
    }
    const buffer = await readFileWithRetry(outFile)
    return buffer
  } finally {
    if (!KEEP_SLIDEV_TMP) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

export async function renderSlidevAsset(options: SlidevBaseOptions): Promise<{ buffer: Buffer; markdown: string; format: SlidevFormat }> {
  const format = options.format || 'pdf'
  const markdown = buildMarkdown(options)
  const buffer = await renderSlidevBuffer(markdown, format)
  return { buffer, markdown, format }
}

interface PersistOptions extends SlidevBaseOptions {
  slug?: string
  publicDir?: string
  publicPathPrefix?: string
}

export async function renderAndPersistSlidev(options: PersistOptions) {
  const { buffer, markdown, format } = await renderSlidevAsset(options)
  const publicDir = options.publicDir || DEFAULT_PUBLIC_DIR
  const publicPathPrefix = options.publicPathPrefix || DEFAULT_PUBLIC_PATH
  await fs.mkdir(publicDir, { recursive: true })
  const slugSource = options.slug || options.deckSpec?.title || 'deck'
  const filename = `${sanitizeSlug(slugSource)}-${Date.now()}.${format}`
  const filePath = path.join(publicDir, filename)
  await fs.writeFile(filePath, buffer)
  const url = `${publicPathPrefix}/${encodeURIComponent(filename)}`
  return { url, path: filePath, format, markdown, buffer }
}
