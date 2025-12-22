// Email Settings Supabase Client
// Database operations for email settings using Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface EmailSettings {
  id: string;
  user_id: string;
  from_name: string | null;
  from_email: string | null;
  reply_to_email: string | null;
  company_name: string | null;
  company_address: string | null;
  website_url: string | null;
  support_email: string | null;
  brand_guidelines: string | null;
  primary_brand_color: string;
  secondary_brand_color: string;
  ai_tone: string;
  privacy_policy_url: string | null;
  terms_of_service_url: string | null;
  google_analytics_id: string | null;
  email_signature: string | null;
  test_emails: string | null;
  smtp_config: any;
  api_keys: any;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsData {
  from_name?: string;
  from_email?: string;
  reply_to_email?: string;
  company_name?: string;
  company_address?: string;
  website_url?: string;
  support_email?: string;
  brand_guidelines?: string;
  primary_brand_color?: string;
  secondary_brand_color?: string;
  ai_tone?: string;
  privacy_policy_url?: string;
  terms_of_service_url?: string;
  google_analytics_id?: string;
  email_signature?: string;
  test_emails?: string;
  smtp_config?: any;
  api_keys?: any;
}

/**
 * Get settings for a user (creates default if doesn't exist)
 */
export async function getSettings(userId: string): Promise<EmailSettings> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - create default settings
        return await createDefaultSettings(userId);
      }
      console.error('Error getting settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getSettings:', error);
    throw error;
  }
}

/**
 * Create default settings for a new user
 */
async function createDefaultSettings(userId: string): Promise<EmailSettings> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .insert({
        user_id: userId,
        primary_brand_color: '#3b82f6',
        secondary_brand_color: '#1e40af',
        ai_tone: 'Professional',
        smtp_config: {},
        api_keys: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default settings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createDefaultSettings:', error);
    throw error;
  }
}

/**
 * Update settings (upsert pattern)
 */
export async function updateSettings(userId: string, data: UpdateSettingsData): Promise<EmailSettings> {
  try {
    const updates: any = {
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    if (data.from_name !== undefined) updates.from_name = data.from_name;
    if (data.from_email !== undefined) updates.from_email = data.from_email;
    if (data.reply_to_email !== undefined) updates.reply_to_email = data.reply_to_email;
    if (data.company_name !== undefined) updates.company_name = data.company_name;
    if (data.company_address !== undefined) updates.company_address = data.company_address;
    if (data.website_url !== undefined) updates.website_url = data.website_url;
    if (data.support_email !== undefined) updates.support_email = data.support_email;
    if (data.brand_guidelines !== undefined) updates.brand_guidelines = data.brand_guidelines;
    if (data.primary_brand_color !== undefined) updates.primary_brand_color = data.primary_brand_color;
    if (data.secondary_brand_color !== undefined) updates.secondary_brand_color = data.secondary_brand_color;
    if (data.ai_tone !== undefined) updates.ai_tone = data.ai_tone;
    if (data.privacy_policy_url !== undefined) updates.privacy_policy_url = data.privacy_policy_url;
    if (data.terms_of_service_url !== undefined) updates.terms_of_service_url = data.terms_of_service_url;
    if (data.google_analytics_id !== undefined) updates.google_analytics_id = data.google_analytics_id;
    if (data.email_signature !== undefined) updates.email_signature = data.email_signature;
    if (data.test_emails !== undefined) updates.test_emails = data.test_emails;
    if (data.smtp_config !== undefined) updates.smtp_config = data.smtp_config;
    if (data.api_keys !== undefined) updates.api_keys = data.api_keys;

    // Use upsert to handle both insert and update
    const { data: settings, error } = await supabase
      .from('email_settings')
      .upsert(updates, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }

    return settings;
  } catch (error) {
    console.error('Error in updateSettings:', error);
    throw error;
  }
}

/**
 * Delete settings (rarely used)
 */
export async function deleteSettings(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting settings:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteSettings:', error);
    throw error;
  }
}
