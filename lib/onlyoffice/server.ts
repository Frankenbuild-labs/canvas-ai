import jwt from "jsonwebtoken"

export type OOEditorType = "word" | "cell" | "slide"

export interface BuildConfigParams {
  documentType: OOEditorType
  fileType: string
  title: string
  url: string
  mode: "edit" | "view"
  callbackUrl?: string
  user?: { id: string; name?: string }
}

export function buildEditorConfig(params: BuildConfigParams) {
  const { documentType, fileType, title, url, mode, callbackUrl, user } = params
  
  // Frontend should use same-origin proxy
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002"
  const proxyUrl = `${baseUrl}/onlyoffice-proxy`
  
  const config: any = {
    documentType,
    document: {
      fileType,
      title,
      url,
      key: `${Buffer.from(url).toString("base64").slice(0, 64)}`,
    },
    editorConfig: {
      mode,
      lang: "en",
      ...(callbackUrl ? { callbackUrl } : {}),
      ...(user ? { user } : {}),
    },
    width: "100%",
    height: "100%",
  }

  const secret = process.env.ONLYOFFICE_JWT_SECRET
  let token: string | undefined
  if (secret) {
    token = jwt.sign(config, secret, { algorithm: "HS256" })
  }

  return { 
    config, 
    token,
    documentServerUrl: proxyUrl
  }
}
