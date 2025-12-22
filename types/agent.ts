import { z } from "zod";

export const AgentProviderEnum = z.enum(["beyond", "livekit"]);

export const AgentSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  provider: AgentProviderEnum.default("beyond"),
  displayName: z.string().min(1).max(64).default("Agent"),
  joinOnStart: z.boolean().default(true),
  // Beyond Presence specific
  avatarId: z.string().optional().nullable(),
  // Voice/LLM config (used by your worker)
  voice: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  llmProvider: z.string().optional().nullable(),
  llmModel: z.string().optional().nullable(),
  prompt: z.string().optional().nullable(),
});

export type AgentSettings = z.infer<typeof AgentSettingsSchema>;

export type RoomAgentMetadata = {
  agents?: AgentSettings[];
  // Allow extension without breaking existing workers
  [k: string]: any;
};

export function sanitizeAgentSettings(input: unknown): AgentSettings {
  const parsed = AgentSettingsSchema.parse(input);
  // Normalize empties to undefined for cleaner metadata
  const norm = { ...parsed } as AgentSettings;
  ("avatarId" in norm && !norm.avatarId) && (norm.avatarId = undefined);
  ("voice" in norm && !norm.voice) && (norm.voice = undefined);
  ("language" in norm && !norm.language) && (norm.language = undefined);
  ("llmProvider" in norm && !norm.llmProvider) && (norm.llmProvider = undefined);
  ("llmModel" in norm && !norm.llmModel) && (norm.llmModel = undefined);
  ("prompt" in norm && !norm.prompt) && (norm.prompt = undefined);
  return norm;
}
