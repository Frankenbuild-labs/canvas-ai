import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ApiKeyInput from "@/components/management-center/api-key-input"
import ModelApiKeyInput from "@/components/management-center/model-api-key-input"
import { KeyRound, Palette, Share2, Building2, TrendingUp, Bot } from "lucide-react"

const socialModels = [
  { value: "gpt-4-social", label: "OpenAI GPT-4 Social" },
  { value: "claude-3-opus", label: "Anthropic Claude 3 Opus" },
  { value: "models/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
]

const businessModels = [
  { value: "gpt-4-business", label: "OpenAI GPT-4 Business" },
  { value: "claude-3-sonnet", label: "Anthropic Claude 3 Sonnet" },
  { value: "models/gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
]

const marketingModels = [
  { value: "gpt-4-marketing", label: "OpenAI GPT-4 Marketing" },
  { value: "claude-3-haiku", label: "Anthropic Claude 3 Haiku" },
  { value: "models/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
]

const metatronModels = [
  { value: "gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
  { value: "claude-3-opus", label: "Anthropic Claude 3 Opus" },
  { value: "models/gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
]

export default function ApiKeysTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <KeyRound className="w-6 h-6 mr-3 text-accent-primary" />
        <h2 className="text-xl font-semibold text-foreground">API Key Management</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base text-card-foreground">
            <Palette className="w-4 h-4 mr-2 text-muted-foreground" />
            Creative Studio
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ApiKeyInput
            id="fal-api-key"
            label="Fal.ai API Key"
            onSave={(value) => console.log("Saved Fal Key:", value)}
          />
          <ApiKeyInput
            id="midjourney-api-key"
            label="Midjourney API Key"
            onSave={(value) => console.log("Saved Midjourney Key:", value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base text-card-foreground">
            <Share2 className="w-4 h-4 mr-2 text-muted-foreground" />
            Social Station
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ModelApiKeyInput id="influencer-api-key" label="Influencer API Key" models={socialModels} />
          <ModelApiKeyInput id="social-agent-api-key" label="Social Agent API Key" models={socialModels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base text-card-foreground">
            <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
            Business
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ModelApiKeyInput id="business-analytics-api-key" label="Analytics API Key" models={businessModels} />
          <ModelApiKeyInput id="business-automation-api-key" label="Automation API Key" models={businessModels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base text-card-foreground">
            <TrendingUp className="w-4 h-4 mr-2 text-muted-foreground" />
            Marketing
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ModelApiKeyInput id="marketing-content-api-key" label="Content API Key" models={marketingModels} />
          <ModelApiKeyInput id="marketing-campaigns-api-key" label="Campaigns API Key" models={marketingModels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base text-card-foreground">
            <Bot className="w-4 h-4 mr-2 text-muted-foreground" />
            Metatron
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ModelApiKeyInput id="metatron-core-api-key" label="Core API Key" models={metatronModels} />
          <ModelApiKeyInput id="metatron-advanced-api-key" label="Advanced API Key" models={metatronModels} />
        </CardContent>
      </Card>
    </div>
  )
}
