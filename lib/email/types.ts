export type EmailContact = {
  id: string
  metadata: {
    first_name?: string
    last_name?: string
    email: string
    status?: { value: string }
  }
}

export type EmailTemplate = {
  id: string
  metadata: {
    name?: string
    active?: boolean
    template_type?: { value: string }
  }
}

export type MarketingCampaign = {
  id: string
  metadata: {
    name?: string
    status?: { value: 'Draft' | 'Scheduled' | 'Sent' }
    template?: any
  }
}
