import type { Metadata } from 'next'
import Layout from '@/components/email-marketing/Layout'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Email Marketing Dashboard',
  description: 'Manage your email campaigns, contacts, and templates with AI assistance',
}

export default async function EmailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch company name on server-side once
  let companyName = "Email Marketing";
  
  try {
    const { getSettings } = await import('@/lib/email-marketing/database')
    const settings = await getSettings();
    const settingsCompanyName = settings?.metadata?.company_name;
    if (settingsCompanyName?.trim()) {
      companyName = settingsCompanyName;
    }
  } catch (error) {
    console.error("Failed to fetch company name:", error);
    // Keep default "Email Marketing" on error
  }

  return (
    <>
      <Layout companyName={companyName}>
        {children}
      </Layout>
      <Toaster />
    </>
  )
}

