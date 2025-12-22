import SettingsForm from '@/components/email-marketing/SettingsForm'

// Force dynamic rendering - prevents static generation and caching
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let settings = null
  const hasCosmic = Boolean(
    process.env.COSMIC_BUCKET_SLUG &&
    process.env.COSMIC_READ_KEY &&
    process.env.COSMIC_WRITE_KEY
  )

  if (hasCosmic) {
    try {
      const { getSettings } = await import('@/lib/email-marketing/cosmic')
      settings = await getSettings()
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Page Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your email marketing configuration</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SettingsForm initialSettings={settings} />
      </main>
    </div>
  )
}
