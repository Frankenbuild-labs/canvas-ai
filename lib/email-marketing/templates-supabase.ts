// Email Templates Supabase Client
// Database operations for email templates using Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check if we should ignore user scope (for testing)
function ignoreUserScope(): boolean {
  return process.env.CRM_IGNORE_USER_SCOPE === 'true';
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  content: string | null;
  template_type: string;
  preview_html: string | null;
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateData {
  title: string;
  subject?: string;
  content?: string;
  template_type?: string;
  preview_html?: string;
  preview_image_url?: string;
}

export interface UpdateTemplateData {
  title?: string;
  subject?: string;
  content?: string;
  template_type?: string;
  preview_html?: string;
  preview_image_url?: string;
}

/**
 * List all email templates for a user
 */
export async function listTemplates(userId: string): Promise<{ templates: EmailTemplate[]; total: number }> {
  try {
    let query = supabase
      .from('email_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing templates:', error);
      throw error;
    }

    return {
      templates: data || [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error in listTemplates:', error);
    throw error;
  }
}

/**
 * Get a single template by ID
 */
export async function getTemplate(userId: string, templateId: string): Promise<EmailTemplate | null> {
  try {
    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error getting template:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getTemplate:', error);
    throw error;
  }
}

/**
 * Create a new email template
 */
export async function createTemplate(userId: string, data: CreateTemplateData): Promise<EmailTemplate> {
  try {
    // Generate preview HTML if content exists but no preview
    let previewHtml = data.preview_html;
    if (!previewHtml && data.content) {
      previewHtml = generatePreviewHtml(data.content);
    }

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: userId,
        title: data.title,
        subject: data.subject || null,
        content: data.content || null,
        template_type: data.template_type || 'html',
        preview_html: previewHtml || null,
        preview_image_url: data.preview_image_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return template;
  } catch (error) {
    console.error('Error in createTemplate:', error);
    throw error;
  }
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  userId: string,
  templateId: string,
  data: UpdateTemplateData
): Promise<EmailTemplate> {
  try {
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (data.title !== undefined) updates.title = data.title;
    if (data.subject !== undefined) updates.subject = data.subject;
    if (data.content !== undefined) {
      updates.content = data.content;
      // Regenerate preview if content changed and no explicit preview provided
      if (data.preview_html === undefined) {
        updates.preview_html = generatePreviewHtml(data.content);
      }
    }
    if (data.template_type !== undefined) updates.template_type = data.template_type;
    if (data.preview_html !== undefined) updates.preview_html = data.preview_html;
    if (data.preview_image_url !== undefined) updates.preview_image_url = data.preview_image_url;

    let query = supabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { data: template, error } = await query;

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return template;
  } catch (error) {
    console.error('Error in updateTemplate:', error);
    throw error;
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(userId: string, templateId: string): Promise<void> {
  try {
    let query = supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (!ignoreUserScope()) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteTemplate:', error);
    throw error;
  }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(userId: string, templateId: string): Promise<EmailTemplate> {
  try {
    // Get the original template
    const original = await getTemplate(userId, templateId);
    if (!original) {
      throw new Error('Template not found');
    }

    // Create a copy with modified title
    const copy = await createTemplate(userId, {
      title: `${original.title} (Copy)`,
      subject: original.subject || undefined,
      content: original.content || undefined,
      template_type: original.template_type,
      preview_html: original.preview_html || undefined,
      preview_image_url: original.preview_image_url || undefined
    });

    return copy;
  } catch (error) {
    console.error('Error in duplicateTemplate:', error);
    throw error;
  }
}

/**
 * Helper function to generate preview HTML from full content
 */
function generatePreviewHtml(content: string): string {
  if (!content) return '';

  // Remove scripts and styles
  let preview = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Strip HTML tags for text preview
  const textOnly = preview
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate to 160 characters
  const previewText = textOnly.slice(0, 160) + (textOnly.length > 160 ? '…' : '');

  // Escape HTML for preview
  const escaped = previewText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `<p>${escaped}</p>`;
}
