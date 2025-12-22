import { GoogleGenAI, Type, Schema } from "@google/genai"

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY / API_KEY for Gemini")
  return new GoogleGenAI({ apiKey })
}

const leadSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    title: { type: Type.STRING },
    company: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    location: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["name","title","company","location","confidenceScore","tags"]
}

const leadListSchema: Schema = { type: Type.ARRAY, items: leadSchema }

export async function generateLeads(params: any) {
  const ai = getClient()
  const modelName = params.depth === 'Comprehensive' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash'
  const prompt = `You are an elite B2B lead generation engine. Generate a list of ${params.depth === 'Deep Dive' ? '8' : '5'} realistic, high-quality leads.\nTarget Role: ${params.targetRole}\nIndustry: ${params.industry}\nKeywords: ${params.keywords}\nLocation: ${params.location}\nPlatform Source Context: ${params.platform}\n${params.includeEmail ? 'Generate plausible business email addresses.' : ''}\n${params.includePhone ? 'Generate plausible business phone numbers.' : ''}\nEnsure realistic varied data. Confidence score = match quality.`
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: leadListSchema, temperature: 0.7 }
  })
  const rawLeads = JSON.parse(response.text || "[]")
  return rawLeads.map((lead: any) => ({
    ...lead,
    id: crypto.randomUUID(),
    source: params.platform,
    status: 'New',
    notes: '',
    email: lead.email || (params.includeEmail ? 'n/a' : null),
    phone: lead.phone || (params.includePhone ? 'n/a' : null)
  }))
}
