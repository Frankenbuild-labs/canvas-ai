import Link from 'next/link'
import TemplatesList from '@/components/email-marketing/TemplatesList'
import FreeTemplatesGallery from '@/components/email-marketing/FreeTemplatesGallery'
import { EmailTemplate } from '@/lib/email-marketing/types'
import { listTemplates } from '@/lib/email-marketing/templates-supabase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export default async function TemplatesPage() {
  let templates: EmailTemplate[] = []
  try {
    templates = await listTemplates(TEST_USER_ID) as unknown as EmailTemplate[]
  } catch (e) {
    console.error('Failed to load templates:', e)
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Page Header - compact */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Email Templates</h1>
            <Link href="/email/templates/new" className="btn-primary text-sm px-4 py-2">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Template
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Free templates (Designmodo/Colorlib) */}
  <FreeTemplatesGallery />

        {/* Your templates */}
        <div className="flex items-center justify-between mb-6 mt-10">
          <h2 className="text-2xl font-bold text-foreground">Your Templates</h2>
        </div>
        <TemplatesList templates={templates} />
      </main>
    </div>
  )
}
