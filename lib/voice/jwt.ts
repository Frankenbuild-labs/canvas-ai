import crypto from "crypto"

function base64url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input))
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export function signHS256JWT(payload: Record<string, any>, secret: string, header: Record<string, any> = {}) {
  const h = { alg: "HS256", typ: "JWT", ...header }
  const p = payload
  const encodedHeader = base64url(JSON.stringify(h))
  const encodedPayload = base64url(JSON.stringify(p))
  const data = `${encodedHeader}.${encodedPayload}`
  const sig = crypto.createHmac("sha256", secret).update(data).digest()
  const encodedSig = base64url(sig)
  return `${data}.${encodedSig}`
}
