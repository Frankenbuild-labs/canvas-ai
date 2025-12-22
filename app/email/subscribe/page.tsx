import SubscriptionForm from '@/components/email-marketing/SubscriptionForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SubscribePage() {
  let settings: any = null
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
    <div className="min-h-screen bg-background">
      {/* Simple header without main nav */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xl font-bold text-foreground">Cosmic Email Marketing</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Stay Updated
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Join our email list to receive the latest updates, tips, and exclusive content.
            </p>
            <p className="text-muted-foreground">
              {settings?.metadata?.company_name && (
                <>Subscribe to {settings.metadata.company_name}'s newsletter</>
              )}
            </p>
          </div>

          {/* Subscription Form Card */}
          <div className="bg-card rounded-lg shadow-lg p-8 mb-8 border border-border">
            <SubscriptionForm />
          </div>

          {/* Benefits Section */}
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-6">
              What you'll get:
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Regular Updates</h3>
                  <p className="text-muted-foreground text-sm">Stay informed with our latest news and insights</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Exclusive Content</h3>
                  <p className="text-muted-foreground text-sm">Access subscriber-only tips and resources</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">No Spam</h3>
                  <p className="text-muted-foreground text-sm">We respect your inbox and only send valuable content</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Easy Unsubscribe</h3>
                  <p className="text-muted-foreground text-sm">Unsubscribe anytime with one click</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              By subscribing, you agree to receive email communications from us. 
              {settings?.metadata?.privacy_policy_url && (
                <>
                  {' '}Read our{' '}
                  <a 
                    href={settings.metadata.privacy_policy_url} 
                    className="text-foreground underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
                </>
              )}
              . You can unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
