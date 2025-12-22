import { getEmailTemplates, getEmailLists } from "@/lib/email-marketing/database";
import CreateCampaignForm from "@/components/email-marketing/CreateCampaignForm";
import Link from "next/link";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: "Create New Campaign | Email Marketing",
  description: "Create a new email marketing campaign",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NewCampaignPage({ searchParams }: PageProps) {
  try {
    // Await searchParams in Next.js 15+
    const params = await searchParams;
    
    // Only fetch templates and lists - contacts are handled via search in the form
    const [templates, lists] = await Promise.all([
      getEmailTemplates(),
      getEmailLists(),
    ]);

    // Extract URL parameters for pre-population
    const templateId = typeof params.template_id === 'string' ? params.template_id : undefined;
    const sendDate = typeof params.send_date === 'string' ? params.send_date : undefined;

    return (
      <div className="min-h-screen bg-background pb-16">
        {/* Page Header */}
        <div className="bg-card shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                  <Link href="/email/campaigns" className="hover:text-foreground">
                    Campaigns
                  </Link>
                  <span>/</span>
                  <span className="text-foreground">New Campaign</span>
                </nav>
                <h1 className="text-3xl font-bold text-foreground">
                  Create New Campaign
                </h1>
                <p className="text-muted-foreground mt-2">
                  Create and customize your email marketing campaign
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CreateCampaignForm
            templates={templates}
            lists={lists}
            initialTemplateId={templateId}
            initialSendDate={sendDate}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading campaign creation page:", error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Error Loading Page
          </h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading the campaign creation page.
          </p>
          <Link
            href="/campaigns"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }
}
