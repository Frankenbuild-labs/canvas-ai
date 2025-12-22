// Simplified adapter - Email Marketing now uses CRM leads directly
// This file maps CRM data format to Email Contact format

import { listLeads, listListsWithMembers, createLead, updateLead, deleteLead, createList, addLeadToList, removeLeadFromList } from "@/lib/crm-supabase";
import type { EmailContact, EmailList, CreateContactData } from "./types";

export async function getEmailContacts(userId: string, options: {
  limit?: number;
  skip?: number;
  search?: string;
  status?: string;
  list_id?: string;
}) {
  const { limit = 100, skip = 0, search = "", status = "all", list_id } = options;

  try {
    const { leads, total } = await listLeads(userId, {
      limit,
      skip,
      search: search || undefined,
      listId: list_id && list_id !== "all" ? list_id : undefined
    });

    const allLists = await listListsWithMembers(userId);

    const contacts: EmailContact[] = leads
      .filter(lead => !status || status === "all" || lead.status === status)
      .map(lead => {
        const leadLists = allLists
          .filter(list => list.leadIds.includes(lead.id))
          .map(list => ({ id: list.id, name: list.name, created_at: list.created_at }));

        const firstName = lead.name.split(' ')[0] || lead.name;
        const lastName = lead.name.split(' ').slice(1).join(' ') || '';

        return {
          id: lead.id,
          slug: lead.id,
          title: lead.name,
          type: 'email-contacts',
          created_at: lead.created_at,
          modified_at: lead.updated_at,
          metadata: {
            first_name: firstName,
            last_name: lastName,
            email: lead.email,
            status: {
              key: lead.status?.toLowerCase() || 'active',
              value: lead.status || 'Active'
            },
            lists: leadLists,
            tags: lead.source ? [lead.source] : [],
            subscribe_date: lead.created_at,
            notes: lead.notes || null,
            unsubscribed_date: undefined,
            unsubscribe_campaign: undefined,
            // Additional CRM-specific data
            company: lead.company,
            phone: lead.phone || undefined,
            position: lead.position || undefined,
            value: lead.value,
            last_contact: lead.last_contact || undefined
          }
        } as any as EmailContact;
      });

    return { contacts, total };
  } catch (err: any) {
    console.error("Error in getEmailContacts:", err);
    return { contacts: [], total: 0 };
  }
}

export async function getEmailLists(userId: string): Promise<EmailList[]> {
  try {
    const lists = await listListsWithMembers(userId);
    return lists.map(list => ({
      id: list.id,
      name: list.name,
      created_at: list.created_at,
      subscriber_count: list.leadIds.length
    })) as EmailList[];
  } catch (err) {
    console.error("Error getting email lists:", err);
    return [];
  }
}

export async function createEmailContact(userId: string, data: CreateContactData): Promise<EmailContact> {
  const newLead = await createLead(userId, {
    name: `${data.first_name} ${data.last_name}`.trim(),
    email: data.email,
    phone: (data.metadata as any)?.phone,
    company: (data.metadata as any)?.company || '',
    position: (data.metadata as any)?.position,
    status: data.status || 'Active',
    value: (data.metadata as any)?.value || 0,
    source: data.tags?.[0] || 'Email Marketing',
    notes: (data.metadata as any)?.notes,
    last_contact: data.subscribe_date ? new Date(data.subscribe_date).toISOString() : undefined
  });

  if (data.list_ids && data.list_ids.length > 0) {
    for (const listId of data.list_ids) {
      try {
        await addLeadToList(listId, newLead.id);
      } catch (e) {}
    }
  }

  return {
    id: newLead.id,
    slug: newLead.id,
    title: newLead.name,
    type: 'email-contacts',
    created_at: newLead.created_at,
    modified_at: newLead.created_at,
    metadata: {
      first_name: newLead.name.split(' ')[0] || newLead.name,
      last_name: newLead.name.split(' ').slice(1).join(' ') || '',
      email: newLead.email,
      status: {
        key: newLead.status.toLowerCase(),
        value: newLead.status
      },
      lists: [],
      tags: newLead.source ? [newLead.source] : [],
      subscribe_date: newLead.created_at,
      notes: newLead.notes || null,
      unsubscribed_date: undefined,
      unsubscribe_campaign: undefined
    }
  } as any as EmailContact;
}

export async function createEmailList(userId: string, data: { name: string }) {
  const list = await createList(userId, data.name, []);
  return {
    id: list.id,
    name: list.name,
    created_at: list.created_at,
    subscriber_count: 0
  } as EmailList;
}

// Re-export isDatabaseConfigured for compatibility
export const isDatabaseConfigured = true;
