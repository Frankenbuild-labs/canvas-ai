import Link from 'next/link'
import CreateContactForm from '@/components/email-marketing/CreateContactForm'

export default function NewContactPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Add New Contact</h1>
              <p className="text-muted-foreground mt-1">Add a new subscriber to your email list</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <CreateContactForm />
        </div>
      </main>
    </div>
  )
}
