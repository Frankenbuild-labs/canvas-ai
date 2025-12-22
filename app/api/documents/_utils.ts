import path from "path"

export function resolveGeneratedPathFromIdOrUrl(idOrUrl: string) {
  if (!idOrUrl) throw new Error("documentId or url required")
  let filename = idOrUrl
  try {
    const u = new URL(idOrUrl)
    const p = u.pathname
    const m = p.match(/\/generated\/(.+)$/)
    if (m) filename = decodeURIComponent(m[1])
  } catch {
    // not a URL; use as-is
    const mm = idOrUrl.split("/generated/")
    if (mm.length > 1) filename = mm.pop() as string
  }
  // strip cachebuster
  filename = filename.replace(/\?.*$/, "")
  const filePath = path.join(process.cwd(), "public", "generated", filename)
  return { filePath, filename }
}

export function publicUrlForGenerated(filename: string) {
  const baseUrl = (process.env.ONLYOFFICE_FILE_BASE_URL || "http://host.docker.internal:3002").replace(/\/$/, "")
  const absoluteUrl = `${baseUrl}/generated/${encodeURIComponent(filename)}`
  return `${absoluteUrl}?v=${Date.now()}`
}
