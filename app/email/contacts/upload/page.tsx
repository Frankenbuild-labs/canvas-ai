import Link from 'next/link'
import CSVUploadForm from '@/components/email-marketing/CSVUploadForm'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function UploadContactsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link href="/email/contacts" className="text-primary-600 hover:text-primary-700 mb-2 inline-block">
                ← Back to Contacts
              </Link>
              <h1 className="text-3xl font-bold text-foreground">Upload Contacts</h1>
              <p className="text-muted-foreground mt-1">Import your contact list from CSV</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CSVUploadForm />
      </main>
    </div>
  )
}
