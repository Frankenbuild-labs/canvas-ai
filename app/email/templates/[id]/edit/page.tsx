// app/templates/[id]/edit/page.tsx
import EditTemplateForm from '@/components/email-marketing/EditTemplateForm'
import { notFound } from 'next/navigation'
import { EmailTemplate } from '@/lib/email-marketing/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EditTemplatePageProps {
  params: { id: string }
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = params

  let template: EmailTemplate | null = null
  try {
    // Use the DB-backed adapter (compat shim) regardless of Cosmic env
    const { getEmailTemplate } = await import('@/lib/cosmic')
    template = (await getEmailTemplate(id)) as EmailTemplate | null
  } catch (e) {
    console.error('Failed to load template:', e)
  }

  if (!template) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Page Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Template</h1>
              <p className="text-muted-foreground mt-1">Update your email template with AI assistance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {template && <EditTemplateForm template={template} />}
      </main>
    </div>
  )
}