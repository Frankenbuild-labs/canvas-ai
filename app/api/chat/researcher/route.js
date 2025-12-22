export const dynamic = "force-dynamic";

// Build a strong research prompt that demands structured markdown with real-source visuals
function buildResearchPrompt(userQuery) {
  return `You are a meticulous research analyst.

Goal: Produce a concise, publication-quality brief with clean Markdown and real sourced visuals.

Rules:
- Absolutely no chain-of-thought, plans, or meta-process language. Provide the answer only.
- Prefer facts, numbers, dated statements, and quotes attributed to sources.
- Derive visuals from the sources: reference charts, hero images, figures, or illustrations found on the cited pages. Do not generate synthetic visuals.
- When tables are provided or inferred, include them as Markdown tables.
- Provide at most 6 images and ensure each is a direct image URL (png/jpg/svg/webp) that is publicly accessible.
- Include alt text that describes what the image shows and add the image's source URL on the next line.

Output shape (strict):
## Answer
<clear narrative, skimmable paragraphs, bullets for key points>

### Visual Examples
<up to 6 images using Markdown: ![alt](image-url) then a line: Source: <source-url>>

### References
<bullet list of clickable links to sources used>

User request: ${userQuery}`;
}

// Stream Jina DeepSearch results as SSE deltas when key exists
async function streamJina(query, onDelta) {
  if (!process.env.JINA_API_KEY) throw new Error("JINA_API_KEY not set");
  const resp = await fetch('https://deepsearch.jina.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.JINA_API_KEY}` },
    body: JSON.stringify({ model: 'jina-deepsearch-v1', messages: [{ role: 'user', content: query }], stream: true, recording_effort: 'medium' })
  });
  if (!resp.ok) throw new Error(`Jina HTTP ${resp.status}`);

  const reader = resp.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  if (!reader) return '';
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (delta) {
          accumulated += delta;
          onDelta(delta);
        }
      } catch {}
    }
  }
  return accumulated;
}

// Remove internal reasoning/chain-of-thought style content from model text
function sanitizeAnswer(text) {
  if (!text || typeof text !== 'string') return ''
  let t = text

  // 1) Strip XML-like thinking tags
  t = t.replace(/<\/?(thinking|thought|reasoning|analysis|reflection)[^>]*>/gi, '')

  // 2) Remove footnotes and editorial artifacts like [^1]:, [^2], [source], Sources (n)
  t = t
    // footnote references inline
    .replace(/\[\^\d+\]/g, '')
    // footnote definition lines
    .replace(/^\[\^\d+\]:.*$/gim, '')
    // generic "Sources" blobs often duplicated by models
    .replace(/^\s*Sources(?: \(\d+\))?\s*$/gim, '')
    .replace(/^\s*Source(?:s)?\s*\(.*\)\s*$/gim, '')

  // 3) Remove lines that are explicit reasoning/process/meta markers
  const lines = t.split(/\r?\n/)
  const filtered = []
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i]
    const Ltrim = L.trim()
    if (!Ltrim) { filtered.push(L); continue }

    // Common prefixes to hide
    const isReasoning = /^(reasoning:|thought:|let'?s think|chain of thought:|c\.o\.t:|analysis:|internal:)/i.test(Ltrim)

    // High-signal meta statements frequently leaked by research agents
    const isLeakMeta = /(my (previous )?attempt|my approach|approach was|methodology|coding action|step \d+|pass(ed)?|fail(ed)?|criterion|threshold|freshness|maximum acceptable age|current system time|knowledge cutoff|time sensitivity|provided knowledge|gathered information|what I will do next|I (will|need to|should)\b)/i.test(Ltrim)

    // Early generic meta like plan/steps/note
    const isEarlyMeta = /^(note:|meta:|plan:|steps?:)/i.test(Ltrim) && i < 8

    if (isReasoning || isLeakMeta || isEarlyMeta) continue
    filtered.push(L)
  }
  t = filtered.join('\n')

  // 4) Remove bracketed [Thinking ...] segments inline
  t = t.replace(/\[(thinking|thought|reasoning|analysis|reflection)[^\]]*\]/gi, '')

  // 5) Remove common chain-of-thought phrases
  t = t.replace(/let'?s think( about this)? step by step[.:]?/gi, '')
  t = t.replace(/on the surface, it'?s about facts,? but/i, '')

  // 6) Remove noisy rubric/self-eval fragments (e.g., "passes", "fails", "requirement")
  t = t.replace(/\b(passes?|fails?|requirement[s]?( met)?|acceptance criteria)\b[^\n]*$/gim, '')

  // 7) Collapse excessive whitespace
  t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
  return t
}

function extractSourcesFromText(text, max = 4) {
  const urlRegex = /(https?:\/\/[\w.-]+(?:\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]*)?)/g;
  const set = new Set();
  const list = (text.match(urlRegex) || []);
  for (const u of list) set.add(u);
  const urls = Array.from(set).slice(0, max);
  return urls.map((u, i) => {
    let host = 'source';
    try { host = new URL(u).hostname } catch {}
    return { id: i + 1, title: host, url: u, snippet: '', favicon: '/favicon.ico', dateTime: new Date().toISOString(), relevanceScore: 0.5, domain: host };
  });
}

// Heuristic filter: drop meta/process/chain-of-thought sentences; keep content
function filterContentSentences(sentences) {
  const dropPatterns = [
    /\b(i|we|me|my|our)\b\s+(will|shall|need|have|am|are|was|were|can|should|must)/i,
    /\blet me\b/i,
    /\b(i|we)\b[^.]*\b(search|searched|searching|look up|look for|browse|visit|visited|click|clicked|open|opened|query)\b/i,
    /\b(i|we)\b[^.]*\b(analyze|analysed|analyzed|analyzing|evaluate|evaluating|reflect|thinking|thought|reason|plan|plans?)\b/i,
    /\b(i|we)\b[^.]*\b(gathered|synthesi[sz]e|consolidate|summari[sz]e|format|structure)\b/i,
    /\b(user|question|prompt)\b/i,
    /\bcurrent system time|guidelines|max(imum)? allowed age|freshness\b/i,
    /\b(previous attempt|approach|methodology|coding action|criterion|threshold|time sensitivity|knowledge cutoff)\b/i,
    /\bi do not need to\b/i,
    /\bbut wait\b/i,
  ]

  const keepIfContenty = (s) => {
    // Keep if looks like facts/figures/market content
    if (/\d/.test(s)) return true
    if (/(inventory|median|price|sales|units|yoy|mom|market|listings|starts|benchmark|average|percent|\$|million|billion)/i.test(s)) return true
    return false
  }

  return sentences.filter((s) => {
    const t = s.trim()
    if (!t) return false
    for (const re of dropPatterns) {
      if (re.test(t)) return false
    }
    return true
  }).filter((s, idx, arr) => {
    // If after filtering we are too strict, allow content-like sentences back
    if (arr.length >= 3) return true
    return keepIfContenty(s)
  })
}

async function formatStructured(answer, sources, scrapedImages) {
  const text = sanitizeAnswer((answer || '').trim());
  const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const content = filterContentSentences(sentences)
  const body = content.length ? content.join(' ') : text
  const sections = []

  // Fancy header with a short lead-in blockquote if present
  sections.push('## Answer')
  sections.push(body)

  // Visual examples from scraped sources first; fallback to auto-chart only if nothing scraped
  const uniqueImages = Array.isArray(scrapedImages) ? scrapedImages.slice(0, 6) : []
  if (uniqueImages.length) {
    sections.push('\n### Visual Examples')
    sections.push('<div class="image-grid">')
    for (const img of uniqueImages) {
      const alt = (img.alt || img.title || 'Visual').replace(/"/g, '&quot;')
      const src = img.url
      const cap = img.source ? `Source: <a href="${img.source}" target="_blank" rel="noopener">${img.source}</a>` : ''
      sections.push(`<figure><img src="${src}" alt="${alt}" /><figcaption>${cap}</figcaption></figure>`)
    }
    sections.push('</div>')
  } else {
    const charts = buildAutoChartsFromText(text)
    if (charts.length) {
      sections.push('\n### Visual Snapshot')
      for (const ch of charts) {
        sections.push(`**${ch.title}**`)
        sections.push(`![${ch.title}](${ch.url})`)
      }
    }
  }

  // Always show references if we found any URLs
  if (sources.length) {
    sections.push('\n### References')
    // De-duplicate by hostname + path and apply nicer labels when possible
    const seen = new Set()
    const pretty = (u) => {
      try {
        const url = new URL(u)
        const host = url.hostname.replace(/^www\./, '')
        return host + url.pathname.replace(/\/$/, '')
      } catch { return u }
    }
    for (const s of sources) {
      const key = s.url.split('#')[0]
      if (seen.has(key)) continue
      seen.add(key)
      const title = s.title && s.title !== 'source' ? s.title : pretty(s.url)
      sections.push(`- <a href="${s.url}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong></a>`) // allow HTML for better styling
    }
  }
  return sections.join('\n')
}

// Parse markdown text for simple tables containing a percentage column and build chart URLs
function buildAutoChartsFromText(text) {
  try {
    const lines = (text || '').split(/\r?\n/)
    const tables = []
    let current = []
    for (const L of lines) {
      if (/^\s*\|.*\|\s*$/.test(L)) {
        current.push(L.trim())
      } else {
        if (current.length >= 2) tables.push(current)
        current = []
      }
    }
    if (current.length >= 2) tables.push(current)

    const charts = []
    for (const tbl of tables) {
      // Expect header row and separator row, then data rows
      const header = tbl[0].split('|').map(s => s.trim()).filter(Boolean)
      if (header.length < 2) continue
      const dataRows = tbl.slice(2)
      const rows = []
      for (const r of dataRows) {
        const cols = r.split('|').map(s => s.trim()).filter(Boolean)
        if (cols.length !== header.length) continue
        rows.push(cols)
      }
      // Find a column that looks like percentages
      let pctIdx = -1
      for (let i = 0; i < header.length; i++) {
        if (/gain|return|change|%/i.test(header[i])) { pctIdx = i; break }
      }
      if (pctIdx === -1) {
        // try to detect by value
        for (let i = 0; i < header.length; i++) {
          const values = rows.map(r => r[i])
          const pctish = values.filter(v => /-?\d+(?:\.\d+)?\s*%/.test(v || '')).length
          if (pctish >= Math.max(2, Math.floor(values.length / 2))) { pctIdx = i; break }
        }
      }
      if (pctIdx === -1) continue
      // Choose a label column (prefer first col that is not the percentage column)
      let labelIdx = 0
      if (labelIdx === pctIdx && header.length > 1) labelIdx = 1
      const labels = []
      const values = []
      for (const r of rows) {
        const label = r[labelIdx].replace(/\s*\(.*?\)\s*/g, '').slice(0, 30)
        const m = (r[pctIdx].match(/-?\d+(?:\.\d+)?/) || [])[0]
        if (!m) continue
        const val = Number(m)
        if (!Number.isFinite(val)) continue
        labels.push(label)
        values.push(val)
      }
      if (labels.length >= 2) {
        const title = `Top ${Math.min(labels.length, 10)} by ${header[pctIdx]}`
        charts.push({ title, url: quickChartBarURL(labels.slice(0, 10), values.slice(0, 10), title) })
      }
    }
    return charts
  } catch { return [] }
}

function quickChartBarURL(labels, values, title) {
  const palette = [
    '#60a5fa','#34d399','#fbbf24','#f472b6','#a78bfa','#f87171','#22d3ee','#f59e0b','#10b981','#c084fc'
  ]
  const cfg = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: title || 'Value',
        data: values,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderRadius: 4,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, color: '#e5e7eb', font: { size: 16, weight: '600' } },
        tooltip: { enabled: true }
      },
      scales: {
        x: { ticks: { color: '#cbd5e1' } },
        y: { ticks: { color: '#cbd5e1', callback: (v) => v + '%' } }
      }
    }
  }
  const url = 'https://quickchart.io/chart?w=900&h=440&backgroundColor=transparent&c=' + encodeURIComponent(JSON.stringify(cfg))
  return url
}

export async function POST(request) {
  // Parse body safely
  let message = '';
  let wantsStream = false;
  try {
    const raw = await request.text();
    const parsed = JSON.parse(raw || '{}');
    message = parsed.message || '';
    wantsStream = parsed.stream === true;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  if (wantsStream) {
    if (!process.env.JINA_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'JINA_API_KEY is not set. Add it to your .env.local and restart the server.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // With JINA_API_KEY present, stream real results
    const encoder = new TextEncoder();
    const origin = (() => { try { const u = new URL(request.url); return `${u.protocol}//${u.host}` } catch { return '' } })();
    async function remember(body) {
      try {
        await fetch(origin + '/api/memory/remember', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      } catch {}
    }
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          send({ type: 'progress', phase: 'initializing', message: 'Starting researcher…', timestamp: Date.now() });
          await new Promise(r => setTimeout(r, 800));
          send({ type: 'progress', phase: 'searching', message: 'Searching the web for relevant information…', timestamp: Date.now() });

          let accumulated = '';
          const enhanced = buildResearchPrompt(message)
          accumulated = await streamJina(enhanced, (delta) => {
            send({ type: 'delta', content: delta, timestamp: Date.now() });
          });

          const clean = sanitizeAnswer(accumulated)
          const sources = extractSourcesFromText(clean);
          const scraped = await collectImagesFromSources(sources, 6)
          const searchResults = {
            query: message,
            // Keep searchResults.response minimal; the UI will display the formatted message
            response: clean,
            timestamp: Date.now(),
            hasWebResults: sources.length > 0,
            metadata: { visitedUrls: sources.length, totalUrls: sources.length, processingTime: 'Real-time', researchDepth: 'Deep Research' },
            sources,
            images: scraped.length ? scraped.map(i => ({ url: i.url, title: i.title || i.alt || 'Visual' })) : [],
          };
          const formatted = await formatStructured(clean, sources, scraped);

          // Persist research memory (query, excerpt, sources, images)
          const excerpt = (clean || '').slice(0, 600)
          const memImages = (scraped || []).map(x => ({ url: x.url, sourcePage: x.source, caption: x.title || x.alt }))
          await remember({
            kind: 'research',
            query: message,
            answerExcerpt: excerpt,
            sources: sources.map(s => ({ url: s.url, title: s.title })),
            images: memImages,
          })

          send({ type: 'progress', phase: 'complete', message: 'Research complete', timestamp: Date.now() });
          send({ type: 'complete', message: formatted, searchResults, showInSecondaryPanel: false });
        } catch (e) {
          send({ type: 'progress', phase: 'error', message: 'Research failed, try again.', timestamp: Date.now() });
          const errorResults = { query: message, response: 'Deep Research failed. Please retry later.', timestamp: Date.now(), sources: [] };
          send({ type: 'complete', message: 'Deep Research failed. Please retry later.', searchResults: errorResults, showInSecondaryPanel: true });
        } finally {
          try { controller.close() } catch {}
        }
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
  }

  // Non-streaming fallback (JSON)
  try {
    const text = `Research mode is not fully configured. Prompt: ${message}`;
    const sources = extractSourcesFromText(text);
    const formatted = formatStructured(text, sources);
    const searchResults = { query: message, response: text, timestamp: Date.now(), hasWebResults: sources.length > 0, sources };
    return new Response(JSON.stringify({ message: formatted, searchResults }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to get response from researcher agent' }), { status: 500 });
  }
}

// ============== Image scraping utilities ==============

function toAbsoluteUrl(base, src) {
  try {
    return new URL(src, base).toString()
  } catch { return null }
}

function scoreImageCandidate(u) {
  const url = (u || '').toLowerCase()
  let score = 0
  if (/(chart|figure|graph|visual|hero|content|article|post)/.test(url)) score += 3
  if (/(logo|icon|sprite|avatar|banner-small|thumb)/.test(url)) score -= 4
  if (/(\.png|\.jpg|\.jpeg|\.webp|\.svg)(\?|$)/.test(url)) score += 2
  return score
}

async function fetchPageImages(url, limit = 4) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 CanvasAI/1.0' }, cache: 'no-store' })
    if (!res.ok) return []
    const html = await res.text()
    const imgs = new Set()

    // Meta tags
    const metaRe = /<meta\s+[^>]*(property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/gi
    let m
    while ((m = metaRe.exec(html))) {
      const abs = toAbsoluteUrl(url, m[2])
      if (abs) imgs.add(abs)
    }
    // IMG tags
    const imgRe = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi
    while ((m = imgRe.exec(html))) {
      const abs = toAbsoluteUrl(url, m[1])
      if (abs) imgs.add(abs)
      if (imgs.size >= limit * 3) break
    }
    const arr = Array.from(imgs)
      .filter(u => /^https?:\/\//i.test(u))
      .sort((a,b) => scoreImageCandidate(b) - scoreImageCandidate(a))
      .slice(0, limit)
    return arr.map(u => ({ url: u, source: url }))
  } catch { return [] }
}

async function collectImagesFromSources(sources, max = 6) {
  const out = []
  for (const s of (sources || [])) {
    if (out.length >= max) break
    const imgs = await fetchPageImages(s.url, Math.min(3, max - out.length))
    for (const im of imgs) {
      if (out.length >= max) break
      // dedupe by URL without query
      const key = (im.url || '').split('?')[0]
      if (!out.some(x => (x.url || '').split('?')[0] === key)) out.push({ ...im, title: s.title })
    }
  }
  return out
}
