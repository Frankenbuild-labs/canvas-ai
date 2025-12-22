import CreateTemplateForm from '@/components/email-marketing/CreateTemplateForm'

export default function NewTemplatePage() {
  return (
  <div className="min-h-screen bg-background pb-16">
      {/* Page Header */}
      <div className="bg-card shadow-sm border-b border-border">
  <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create New Template</h1>
              <p className="text-muted-foreground mt-1">Use AI to generate content or create your template manually</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateTemplateForm />
      </main>
    </div>
  )
}
