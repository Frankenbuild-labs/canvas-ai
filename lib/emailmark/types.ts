export interface EmailContact {
  id: string
  metadata: {
    first_name?: string
    last_name?: string
    email?: string
    status?: { value: string }
  }
}

export interface EmailTemplate {
  id: string
  metadata: {
    name?: string
    template_type?: { value: string }
    active?: boolean
  }
}

export interface MarketingCampaign {
  id: string
  metadata: {
    name?: string
    status?: { value: 'Draft' | 'Sent' | 'Scheduled' }
    template?: any
  }
}
