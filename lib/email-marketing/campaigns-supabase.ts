// Email Campaigns Supabase Client
// Database operations for email campaigns using Supabase

import { createClient } from '@supabase/supabase-js';
import { listLeads } from '@/lib/crm-supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check if we should ignore user scope (for testing)
function ignoreUserScope(): boolean {
  return process.env.CRM_IGNORE_USER_SCOPE === 'true';
}

export interface EmailCampaign {
  id: string;
  user_id: string;
  name: string;
  subject: string | null;
  content: string | null;
  html_content: string | null;
  template_id: string | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
  target_list_ids: string[] | null;
  target_contact_ids: string[] | null;
  scheduled_for: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_failed: number;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignData {
  name: string;
  subject?: string;
  content?: string;
  html_content?: string;
  template_id?: string;
  target_list_ids?: string[];
  target_contact_ids?: string[];
  scheduled_for?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface UpdateCampaignData {
  name?: string;
  subject?: string;
  content?: string;
  html_content?: string;
  template_id?: string;
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
  target_list_ids?: string[];
  target_contact_ids?: string[];
  scheduled_for?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface CampaignSend {
  id: string;
  campaign_id: string;
  contact_id: string;
  contact_email: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  metadata: any;
  created_at: string;
}

/**
 * List all campaigns for a user
 */
export async function listCampaigns(
  userId: string,
  options: {
    status?: string;
    limit?: number;
    skip?: number;
  } = {}
): Promise<{ campaigns: EmailCampaign[]; total: number }> {
  try {
    const { status, limit = 100, skip = 0 } = options;

    let query = supabase
      .from('email_campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing campaigns:', error);
      throw error;
    }

    return {
      campaigns: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error in listCampaigns:', error);
    throw error;
  }
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(userId: string, campaignId: string): Promise<EmailCampaign | null> {
  try {
    let query = supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error getting campaign:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getCampaign:', error);
    throw error;
  }
}

/**
 * Create a new campaign
 */
export async function createCampaign(userId: string, data: CreateCampaignData): Promise<EmailCampaign> {
  try {
    const { data: campaign, error } = await supabase
      .from('email_campaigns')
      .insert({
        user_id: userId,
        name: data.name,
        subject: data.subject || null,
        content: data.content || null,
        html_content: data.html_content || null,
        template_id: data.template_id || null,
        status: data.scheduled_for ? 'scheduled' : 'draft',
        target_list_ids: data.target_list_ids || null,
        target_contact_ids: data.target_contact_ids || null,
        scheduled_for: data.scheduled_for || null,
        from_name: data.from_name || null,
        from_email: data.from_email || null,
        reply_to: data.reply_to || null,
        total_recipients: 0,
        total_sent: 0,
        total_delivered: 0,
        total_opened: 0,
        total_clicked: 0,
        total_bounced: 0,
        total_failed: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }

    return campaign;
  } catch (error) {
    console.error('Error in createCampaign:', error);
    throw error;
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  userId: string,
  campaignId: string,
  data: UpdateCampaignData
): Promise<EmailCampaign> {
  try {
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.subject !== undefined) updates.subject = data.subject;
    if (data.content !== undefined) updates.content = data.content;
    if (data.html_content !== undefined) updates.html_content = data.html_content;
    if (data.template_id !== undefined) updates.template_id = data.template_id;
    if (data.status !== undefined) updates.status = data.status;
    if (data.target_list_ids !== undefined) updates.target_list_ids = data.target_list_ids;
    if (data.target_contact_ids !== undefined) updates.target_contact_ids = data.target_contact_ids;
    if (data.scheduled_for !== undefined) updates.scheduled_for = data.scheduled_for;
    if (data.from_name !== undefined) updates.from_name = data.from_name;
    if (data.from_email !== undefined) updates.from_email = data.from_email;
    if (data.reply_to !== undefined) updates.reply_to = data.reply_to;

    let query = supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', campaignId)
      .select()
      .single();

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { data: campaign, error } = await query;

    if (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }

    return campaign;
  } catch (error) {
    console.error('Error in updateCampaign:', error);
    throw error;
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(userId: string, campaignId: string): Promise<void> {
  try {
    let query = supabase
      .from('email_campaigns')
      .delete()
      .eq('id', campaignId);

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteCampaign:', error);
    throw error;
  }
}

/**
 * Resolve recipient emails from lists and contacts
 */
export async function resolveCampaignRecipients(
  userId: string,
  listIds: string[] = [],
  contactIds: string[] = []
): Promise<Array<{ id: string; email: string; name: string }>> {
  try {
    const recipients: Array<{ id: string; email: string; name: string }> = [];
    const seenEmails = new Set<string>();

    // Get contacts from lists
    if (listIds.length > 0) {
      for (const listId of listIds) {
        const { leads } = await listLeads(userId, { listId, limit: 10000 });
        for (const lead of leads) {
          if (lead.email && !seenEmails.has(lead.email.toLowerCase())) {
            seenEmails.add(lead.email.toLowerCase());
            recipients.push({
              id: lead.id,
              email: lead.email,
              name: lead.name
            });
          }
        }
      }
    }

    // Get specific contacts
    if (contactIds.length > 0) {
      const { leads } = await listLeads(userId, { limit: contactIds.length });
      for (const lead of leads) {
        if (contactIds.includes(lead.id) && lead.email && !seenEmails.has(lead.email.toLowerCase())) {
          seenEmails.add(lead.email.toLowerCase());
          recipients.push({
            id: lead.id,
            email: lead.email,
            name: lead.name
          });
        }
      }
    }

    return recipients;
  } catch (error) {
    console.error('Error resolving campaign recipients:', error);
    throw error;
  }
}

/**
 * Get campaign sends/tracking data
 */
export async function getCampaignSends(
  campaignId: string,
  options: {
    status?: string;
    limit?: number;
    skip?: number;
  } = {}
): Promise<{ sends: CampaignSend[]; total: number }> {
  try {
    const { status, limit = 100, skip = 0 } = options;

    let query = supabase
      .from('campaign_sends')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error getting campaign sends:', error);
      throw error;
    }

    return {
      sends: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error in getCampaignSends:', error);
    throw error;
  }
}

/**
 * Record a campaign send
 */
export async function recordCampaignSend(
  campaignId: string,
  contactId: string,
  contactEmail: string,
  status: 'pending' | 'sent' | 'failed' = 'pending',
  metadata: any = {}
): Promise<CampaignSend> {
  try {
    const { data: send, error } = await supabase
      .from('campaign_sends')
      .insert({
        campaign_id: campaignId,
        contact_id: contactId,
        contact_email: contactEmail,
        status,
        metadata,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        failed_at: status === 'failed' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording campaign send:', error);
      throw error;
    }

    return send;
  } catch (error) {
    console.error('Error in recordCampaignSend:', error);
    throw error;
  }
}

/**
 * Update campaign send status
 */
export async function updateCampaignSend(
  sendId: string,
  updates: {
    status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    provider_message_id?: string;
    error_message?: string;
    metadata?: any;
  }
): Promise<void> {
  try {
    const updateData: any = {};

    if (updates.status) {
      updateData.status = updates.status;
      // Set timestamp based on status
      if (updates.status === 'sent') updateData.sent_at = new Date().toISOString();
      if (updates.status === 'delivered') updateData.delivered_at = new Date().toISOString();
      if (updates.status === 'opened') updateData.opened_at = new Date().toISOString();
      if (updates.status === 'clicked') updateData.clicked_at = new Date().toISOString();
      if (updates.status === 'bounced') updateData.bounced_at = new Date().toISOString();
      if (updates.status === 'failed') updateData.failed_at = new Date().toISOString();
    }

    if (updates.provider_message_id !== undefined) {
      updateData.provider_message_id = updates.provider_message_id;
    }
    if (updates.error_message !== undefined) {
      updateData.error_message = updates.error_message;
    }
    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    const { error } = await supabase
      .from('campaign_sends')
      .update(updateData)
      .eq('id', sendId);

    if (error) {
      console.error('Error updating campaign send:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateCampaignSend:', error);
    throw error;
  }
}

/**
 * Update campaign statistics
 */
export async function updateCampaignStats(campaignId: string): Promise<void> {
  try {
    // Get all sends for this campaign
    const { data: sends, error: sendsError } = await supabase
      .from('campaign_sends')
      .select('status')
      .eq('campaign_id', campaignId);

    if (sendsError) {
      throw sendsError;
    }

    const stats = {
      total_recipients: sends?.length || 0,
      total_sent: sends?.filter(s => s.status !== 'pending' && s.status !== 'failed').length || 0,
      total_delivered: sends?.filter(s => s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked').length || 0,
      total_opened: sends?.filter(s => s.status === 'opened' || s.status === 'clicked').length || 0,
      total_clicked: sends?.filter(s => s.status === 'clicked').length || 0,
      total_bounced: sends?.filter(s => s.status === 'bounced').length || 0,
      total_failed: sends?.filter(s => s.status === 'failed').length || 0
    };

    const { error: updateError } = await supabase
      .from('email_campaigns')
      .update(stats)
      .eq('id', campaignId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error('Error updating campaign stats:', error);
    throw error;
  }
}
