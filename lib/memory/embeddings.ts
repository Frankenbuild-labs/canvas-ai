export interface EmbeddingsProvider {
  embed(texts: string[]): Promise<number[][]>
}

export function getEmbeddingsProvider(): EmbeddingsProvider {
  const provider = (process.env.EMBEDDING_PROVIDER || "none").toLowerCase()
  if (provider === "openai") {
    return createOpenAIProvider()
  }
  // Placeholder: return a provider that throws until configured
  return {
    async embed() {
      throw new Error(
        "Embeddings provider not configured. Set EMBEDDING_PROVIDER=openai and OPENAI_API_KEY, or provide a custom provider.",
      )
    },
  }
}

function createOpenAIProvider(): EmbeddingsProvider {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      async embed() {
        throw new Error("OPENAI_API_KEY is required for EMBEDDING_PROVIDER=openai")
      },
    }
  }
  // Lazy import to avoid bundling in edge runtimes if unused
  const client = new (require("openai").OpenAI)({ apiKey })
  const model = process.env.OPENAI_EMBEDDINGS_MODEL || "text-embedding-3-large"
  return {
    async embed(texts: string[]) {
      const res = await client.embeddings.create({ model, input: texts })
      // @ts-ignore - typings differ by SDK versions
      return res.data.map((d: any) => d.embedding as number[])
    },
  }
}
