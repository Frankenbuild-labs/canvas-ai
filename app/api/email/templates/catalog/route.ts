import { NextRequest, NextResponse } from 'next/server'

type RepoKey = 'designmodo' | 'colorlib'

const REPOS: Record<RepoKey, { owner: string; repo: string; path: string }> = {
  designmodo: { owner: 'designmodo', repo: 'html-email-templates', path: '' },
  colorlib: { owner: 'ColorlibHQ', repo: 'email-templates', path: '' },
}

const GH_API = 'https://api.github.com'

async function listHtmlFiles(owner: string, repo: string, path = '', depth = 0, maxDepth = 2, token?: string) {
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`.replace(/%25/g, '%')
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'canvasai-email-templates-catalog'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}`)
  }
  const data: Array<any> = await res.json()

  const files: Array<{ name: string; path: string; download_url: string }> = []
  for (const item of data) {
    if (item.type === 'file' && typeof item.name === 'string' && item.name.toLowerCase().endsWith('.html')) {
      files.push({ name: item.name, path: item.path, download_url: item.download_url })
    } else if (item.type === 'dir' && depth < maxDepth) {
      try {
        const nested = await listHtmlFiles(owner, repo, item.path, depth + 1, maxDepth, token)
        files.push(...nested)
      } catch {
        // skip directory on error
      }
    }
  }
  return files
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const repoKey = (searchParams.get('repo') as RepoKey) || undefined
    const token = process.env.GITHUB_TOKEN

    const reposToLoad: RepoKey[] = repoKey ? [repoKey] : ['designmodo', 'colorlib']
    const results: any[] = []
    for (const key of reposToLoad) {
      const cfg = REPOS[key]
      if (!cfg) continue
      try {
        const files = await listHtmlFiles(cfg.owner, cfg.repo, cfg.path, 0, 2, token)
        results.push({
          source: key,
          items: files.slice(0, 24).map(f => ({
            id: `${key}:${f.path}`,
            name: f.name.replace(/\.html$/i, '').replace(/[-_]/g, ' '),
            path: f.path,
            rawUrl: f.download_url,
          }))
        })
      } catch (e) {
        results.push({ source: key, items: [], error: String(e) })
      }
    }

    return NextResponse.json({ success: true, catalog: results })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
