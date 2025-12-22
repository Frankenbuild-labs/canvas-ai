// Email Marketing Database Adapter - now using CRM tables for unified contact management
import { listLeads, listListsWithMembers } from "@/lib/crm-supabase";
import {
  EmailContact,
  EmailTemplate,
  MarketingCampaign,
  EmailList,
  Settings,
  CreateContactData,
  CreateListData,
  CreateTemplateData,
  CreateCampaignData,
  UpdateSettingsData,
  MediaItem,
  UploadJob,
  CreateUploadJobData,
} from "./types";

// Check if database is configured
export const isDatabaseConfigured = !!process.env.DATABASE_URL;

// ==================== CONTACTS (Using CRM Tables) ====================

export async function getEmailContacts(userId: string, options: {
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  list_id?: string;
}) {
  const { limit = 100, skip = 0, search = "", status = "all", list_id } = options;

  console.log('[getEmailContacts] Called with userId:', userId, 'options:', options);

  try {
    // Use CRM leads system
    const { leads, total } = await listLeads(userId, {
      limit,
      skip,
      search: search || undefined,
      listId: list_id && list_id !== "all" ? list_id : undefined
    });

    // Get all lists for populating metadata
    const allLists = await listListsWithMembers(userId);
    const listsMap = new Map(allLists.map(l => [l.id, l]));

    // Convert CRM leads to EmailContact format
    const contacts: EmailContact[] = leads
      .filter(lead => {
        // Filter by status if specified
        if (status && status !== "all") {
          return lead.status === status;
        }
        return true;
      })
      .map(lead => {
        // Find which lists this lead belongs to
        const leadLists = allLists
          .filter(list => list.leadIds.includes(lead.id))
          .map(list => ({
            id: list.id,
            name: list.name,
            created_at: list.created_at
          }));

        return {
          id: lead.id,
          email: lead.email,
          first_name: lead.name.split(' ')[0] || lead.name,
          last_name: lead.name.split(' ').slice(1).join(' ') || '',
          status: lead.status || 'Active',
          subscribe_date: lead.created_at,
          unsubscribe_date: null,
          tags: lead.source ? [lead.source] : [],
          metadata: {
            company: lead.company,
            phone: lead.phone || undefined,
            position: lead.position || undefined,
            value: lead.value,
            notes: lead.notes || undefined,
            lists: leadLists,
            last_contact: lead.last_contact || undefined
          },
          created_at: lead.created_at,
          updated_at: lead.updated_at
        } as EmailContact;
      });

    console.log('[getEmailContacts] Returning', contacts.length, 'contacts from CRM');
    return { contacts, total };
  } catch (err: any) {
    console.error("Error in getEmailContacts:", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    return { contacts: [], total: 0 };
  }
}

export async function createEmailContact(data: CreateContactData): Promise<EmailContact> {
  const result = await executeQuery(
    `INSERT INTO contacts (email, first_name, last_name, status, tags, subscribe_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.email, data.first_name, data.last_name, data.status || "Active", data.tags || [], data.subscribe_date || new Date()]
  );

  const contact = result[0];

  // Add to lists if specified
  if (data.list_ids && data.list_ids.length > 0) {
    for (const listId of data.list_ids) {
    await executeQuery(
        `INSERT INTO contact_lists (contact_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [contact.id, listId]
      );
    }
  }

  return mapContactFromDb(contact);
}

export async function updateEmailContact(id: string, data: Partial<CreateContactData>) {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.first_name !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    params.push(data.first_name);
  }
  if (data.last_name !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    params.push(data.last_name);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    params.push(data.tags);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  await executeQuery(
    `UPDATE contacts SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
    params
  );

  // Update lists if specified
  if (data.list_ids !== undefined) {
    await executeQuery(`DELETE FROM contact_lists WHERE contact_id = $1`, [id]);
    for (const listId of data.list_ids) {
      await executeQuery(
        `INSERT INTO contact_lists (contact_id, list_id) VALUES ($1, $2)`,
        [id, listId]
      );
    }
  }

  return { success: true };
}

export async function deleteEmailContact(id: string) {
  await executeQuery(`DELETE FROM contacts WHERE id = $1`, [id]);
  return { success: true };
}

// ==================== LISTS ====================

export async function getEmailLists(userId: string): Promise<EmailList[]> {
  if (!isDatabaseConfigured) return [] as EmailList[];
  try {
  const lists = await executeQuery(`SELECT * FROM contact_lists WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return lists.map(mapListFromDb);
  } catch (err) {
    console.error("Error connecting to database (getEmailLists):", err);
    return [] as EmailList[];
  }
}

export async function createEmailList(userId: string, data: CreateListData) {
  const result = await executeQuery(
    `INSERT INTO contact_lists (user_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
    [userId, data.name, data.description || ""]
  );
  return mapListFromDb(result[0]);
}

// ==================== TEMPLATES ====================

export async function getEmailTemplates() {
  if (!isDatabaseConfigured) return [] as any[];
  try {
  const templates = await executeQuery(`SELECT * FROM email_templates ORDER BY created_at DESC`);
    return templates.map(mapTemplateFromDb);
  } catch (err) {
    console.error("Error connecting to database (getEmailTemplates):", err);
    return [] as any[];
  }
}

export async function createEmailTemplate(data: CreateTemplateData) {
  // Generate a lightweight preview (strip tags, truncate) for gallery display
  const rawHtml = data.content || ''
  const textOnly = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ') // remove tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  const previewText = textOnly.slice(0, 160)
  const previewHtml = `<p>${escapeHtml(previewText)}${textOnly.length > 160 ? '…' : ''}</p>`

  // Attempt to insert preview fields; if migration not yet applied, fallback gracefully
  let result: any[]
  try {
    result = await executeQuery(
      `INSERT INTO email_templates (title, subject, content, template_type, preview_html, preview_image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.name, data.subject, data.content, data.template_type, previewHtml, null]
    )
  } catch (e: any) {
    // Fallback to legacy columns without preview fields
    result = await executeQuery(
      `INSERT INTO email_templates (title, subject, content, template_type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.subject, data.content, data.template_type]
    )
  }
  return mapTemplateFromDb(result[0]);
}

export async function getEmailTemplate(id: string) {
  if (!isDatabaseConfigured) return null;
  try {
  const result = await executeQuery(`SELECT * FROM email_templates WHERE id = $1`, [id]);
    return result[0] ? mapTemplateFromDb(result[0]) : null;
  } catch (err) {
    console.error("Error connecting to database (getEmailTemplate):", err);
    return null;
  }
}

export async function updateEmailTemplate(id: string, data: Partial<CreateTemplateData>) {
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (data.name) {
    updates.push(`title = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.subject !== undefined) {
    updates.push(`subject = $${paramIndex++}`);
    params.push(data.subject);
  }
  if (data.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    params.push(data.content);
  }
  if (data.template_type !== undefined) {
    updates.push(`template_type = $${paramIndex++}`);
    params.push(data.template_type);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  await executeQuery(`UPDATE email_templates SET ${updates.join(", ")} WHERE id = $${paramIndex}`, params);
  return { success: true };
}

export async function deleteEmailTemplate(id: string) {
  await executeQuery(`DELETE FROM email_templates WHERE id = $1`, [id]);
  return { success: true };
}

// ==================== CAMPAIGNS ====================

export async function getMarketingCampaigns() {
  if (!isDatabaseConfigured) return [] as any[];
  try {
  const campaigns = await executeQuery(`SELECT * FROM email_campaigns ORDER BY created_at DESC`);
    return campaigns.map(mapCampaignFromDb);
  } catch (err) {
    console.error("Error connecting to database (getMarketingCampaigns):", err);
    return [] as any[];
  }
}

export async function getMarketingCampaign(id: string) {
  if (!isDatabaseConfigured) return null;
  try {
  const result = await executeQuery(`SELECT * FROM email_campaigns WHERE id = $1`, [id]);
    return result[0] ? mapCampaignFromDb(result[0]) : null;
  } catch (err) {
    console.error("Error connecting to database (getMarketingCampaign):", err);
    return null;
  }
}

export async function createMarketingCampaign(data: CreateCampaignData) {
  const result = await executeQuery(
    `INSERT INTO email_campaigns (name, subject, content, template_id, status, target_lists, target_tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.name,
      data.subject || "",
      data.content || "",
      data.template_id || null,
      'Draft',
      data.list_ids || [],
      data.target_tags || [],
    ]
  );
  return mapCampaignFromDb(result[0]);
}

export async function updateCampaignStatus(id: string, status: string) {
  await executeQuery(
    `UPDATE email_campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [status, id]
  );
  return { success: true };
}

export async function updateEmailCampaign(id: string, data: any) {
  const updates: string[] = [];
  const params: any[] = [];
  let i = 1;
  if (data.name !== undefined) { updates.push(`name = $${i++}`); params.push(data.name); }
  if (data.template_id !== undefined) { updates.push(`template_id = $${i++}`); params.push(data.template_id); }
  if (data.list_ids !== undefined) { updates.push(`target_lists = $${i++}`); params.push(data.list_ids); }
  if (data.target_tags !== undefined) { updates.push(`target_tags = $${i++}`); params.push(data.target_tags); }
  if (data.send_date !== undefined) { updates.push(`scheduled_for = $${i++}`); params.push(data.send_date || null); }
  if (data.stats !== undefined) {
    // Optionally update summary stats if provided
    const s = data.stats || {};
    if (s.sent !== undefined) { updates.push(`total_sent = $${i++}`); params.push(s.sent); }
    if (s.opened !== undefined) { updates.push(`total_opened = $${i++}`); params.push(s.opened); }
    if (s.clicked !== undefined) { updates.push(`total_clicked = $${i++}`); params.push(s.clicked); }
    if (s.bounced !== undefined) { updates.push(`total_bounced = $${i++}`); params.push(s.bounced); }
  }
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);
  await executeQuery(`UPDATE email_campaigns SET ${updates.join(", ")} WHERE id = $${i}`, params);
  return { success: true };
}

export async function deleteEmailCampaign(id: string) {
  await executeQuery(`DELETE FROM email_campaigns WHERE id = $1`, [id]);
  return { success: true };
}

// ==================== SETTINGS ====================

export async function getSettings() {
  if (!isDatabaseConfigured) return null;
  try {
  const result = await executeQuery(`SELECT * FROM email_settings LIMIT 1`);
    return result[0] ? mapSettingsFromDb(result[0]) : null;
  } catch (err) {
    console.error("Error connecting to database (getSettings):", err);
    return null;
  }
}

export async function updateSettings(data: UpdateSettingsData) {
  const result = await executeQuery(`SELECT id FROM email_settings LIMIT 1`);

  if (result[0]) {
    await executeQuery(
      `UPDATE email_settings SET company_name = $1, from_name = $2, from_email = $3, 
       reply_to_email = $4, primary_brand_color = $5, website_url = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        data.company_name,
        data.from_name,
        data.from_email,
        data.reply_to_email,
        data.primary_brand_color,
        data.website_url,
        result[0].id,
      ]
    );
  } else {
    await executeQuery(
      `INSERT INTO email_settings (company_name, from_name, from_email, reply_to_email, primary_brand_color, website_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        data.company_name,
        data.from_name,
        data.from_email,
        data.reply_to_email,
        data.primary_brand_color,
        data.website_url,
      ]
    );
  }

  return { success: true };
}

// ==================== HELPER FUNCTIONS ====================

function mapContactFromDb(row: any): EmailContact {
  const statusVal = row.status || "Active";
  
  // Handle both CRM (name) and Email (first_name/last_name) formats
  let firstName = row.first_name || '';
  let lastName = row.last_name || '';
  
  // If no first_name but has name field (CRM format), split it
  if (!firstName && row.name) {
    const parts = row.name.split(' ');
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }
  
  const displayName = `${firstName} ${lastName}`.trim() || row.email || 'Unknown';
  
  return {
    id: row.id,
    slug: row.id,
    title: displayName,
    type: "email-contacts",
    created_at: row.created_at,
    modified_at: row.updated_at,
    metadata: {
      email: row.email,
      first_name: firstName,
      last_name: lastName,
      status: { key: statusVal, value: statusVal },
      tags: row.tags || [],
      subscribe_date: row.subscribe_date,
      lists: [],
    },
  };
}

function mapListFromDb(row: any): EmailList {
  return {
    id: row.id,
    slug: row.id,
    title: row.name,
    type: "email-lists",
    created_at: row.created_at,
    modified_at: row.updated_at,
    metadata: {
      name: row.name,
      description: row.description,
      list_type: { key: "General", value: "General" },
      active: true,
      created_date: row.created_at,
      total_contacts: undefined,
    },
  };
}

function mapTemplateFromDb(row: any): EmailTemplate {
  const tplType = (row.template_type as string) || "Newsletter";
  const normalizedType = ["Welcome Email","Newsletter","Promotional","Transactional"].includes(tplType) ? tplType : "Newsletter";
  return {
    id: row.id,
    slug: row.id,
    title: row.title,
    type: "email-templates",
    created_at: row.created_at,
    modified_at: row.updated_at,
    metadata: {
      name: row.title,
      subject: row.subject,
      content: row.content,
      template_type: { key: normalizedType, value: normalizedType as any },
      active: true,
      preview_html: row.preview_html || null,
      preview_image_url: row.preview_image_url || null,
    },
  };
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function mapCampaignFromDb(row: any): MarketingCampaign {
  const statusVal = row.status || "Draft";
  return {
    id: row.id,
    slug: row.id,
    title: row.name,
    type: "marketing-campaigns",
    created_at: row.created_at,
    modified_at: row.updated_at,
    metadata: {
      name: row.name,
      // Backward-compatible fields
      subject: row.subject,
      content: row.content,
      // Deprecated field mapping for compatibility
      template: row.template_id,
      status: { key: statusVal, value: statusVal },
      target_lists: row.target_lists || [],
      target_tags: row.target_tags || [],
      send_date: row.scheduled_for,
      sent_at: row.sent_at,
      stats: {
        sent: row.total_sent || 0,
        opened: row.total_opened || 0,
        clicked: row.total_clicked || 0,
        bounced: row.total_bounced || 0,
      },
    },
  };
}

function mapSettingsFromDb(row: any): Settings {
  return {
    id: row.id,
    slug: "settings",
    title: "Settings",
    type: "settings",
    created_at: row.created_at,
    modified_at: row.updated_at,
    metadata: {
      company_name: row.company_name,
      from_name: row.from_name,
      from_email: row.from_email,
      reply_to_email: row.reply_to_email,
      primary_brand_color: row.primary_brand_color,
      website_url: row.website_url,
    },
  };
}

