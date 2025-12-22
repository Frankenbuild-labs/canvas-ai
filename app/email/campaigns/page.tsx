import CampaignsView from '@/components/email-marketing/CampaignsView'
import Link from 'next/link'
import { listCampaigns } from '@/lib/email-marketing/campaigns-supabase'

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TEST_USER_ID = '11111111-1111-1111-1111-111111111111'

export default async function CampaignsPage() {
  let campaigns: any[] = []
  try {
    campaigns = await listCampaigns(TEST_USER_ID)
  } catch (e) {
    console.error('Failed to load campaigns:', e)
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Page Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Email Campaigns</h1>
              <p className="text-muted-foreground mt-1">Create and manage your email campaigns</p>
            </div>
            <Link href="/email/campaigns/new" className="btn-primary">
              Create Campaign
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CampaignsView campaigns={campaigns} />
      </main>
    </div>
  )
}
