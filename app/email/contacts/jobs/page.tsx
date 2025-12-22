import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Activity } from 'lucide-react'
import UploadJobList from '@/components/email-marketing/UploadJobList'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function UploadJobsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link 
                href="/email/contacts" 
                className="text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center space-x-2 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Contacts</span>
              </Link>
              <div className="flex items-center space-x-3 mt-2">
                <div className="p-2 bg-accent rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Upload Jobs</h1>
                  <p className="text-muted-foreground mt-1">Monitor and track your CSV upload processing</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/email/contacts/upload">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New CSV
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Background Processing Info */}
          <div className="p-6 bg-accent border border-border rounded-lg">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-accent rounded-full">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground mb-2">🚀 Background Processing Dashboard</h2>
                <p className="text-muted-foreground mb-4">
                  All your CSV uploads are processed in the background, allowing you to navigate freely while we handle everything. 
                  Monitor progress, view detailed statistics, and track completion status for all your upload jobs.
                </p>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-card rounded border border-border">
                    <div className="font-medium text-foreground">✨ Real-time Progress</div>
                    <div className="text-muted-foreground text-xs mt-1">Live updates on processing status</div>
                  </div>
                  <div className="p-3 bg-card rounded border border-border">
                    <div className="font-medium text-foreground">🎯 Smart Processing</div>
                    <div className="text-muted-foreground text-xs mt-1">Automatic error handling & recovery</div>
                  </div>
                  <div className="p-3 bg-card rounded border border-border">
                    <div className="font-medium text-foreground">📊 Detailed Analytics</div>
                    <div className="text-muted-foreground text-xs mt-1">Success rates & duplicate detection</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Jobs List - Enhanced for dedicated page */}
          <div className="bg-card rounded-lg shadow-sm border border-border">
            <UploadJobList showAllJobs={true} />
          </div>
        </div>
      </main>
    </div>
  )
}
