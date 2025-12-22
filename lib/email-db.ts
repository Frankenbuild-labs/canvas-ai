import sql from '@/lib/database'

export interface EmailMessage {
  id: string
  direction: 'outbound' | 'inbound'
  user_id?: string | null
  from: string
  to: string
  subject?: string | null
  text?: string | null
  html?: string | null
  attachments?: Array<{ filename: string; mime?: string; size_bytes?: number }> | null
  provider?: string | null
  provider_id?: string | null
  status?: string | null
  error?: string | null
  created_at: string
  updated_at?: string
}

export class EmailDB {
  static async insertOutbound(msg: Omit<EmailMessage, 'id' | 'direction' | 'created_at' | 'updated_at'>): Promise<EmailMessage> {
    const rows = await sql(
      `INSERT INTO email_messages (direction, user_id, "from", "to", subject, text, html, attachments, provider, provider_id, status, error)
       VALUES ('outbound', $1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10,'sent'), $11)
       RETURNING id, direction, user_id, "from", "to", subject, text, html, attachments, provider, provider_id, status, error, created_at, updated_at`,
      [
        msg.user_id || null,
        msg.from,
        msg.to,
        msg.subject || null,
        msg.text || null,
        msg.html || null,
        JSON.stringify(msg.attachments || []),
        msg.provider || null,
        msg.provider_id || null,
        msg.status || null,
        msg.error || null,
      ]
    )
    return rows[0] as EmailMessage
  }

  static async getById(id: string): Promise<EmailMessage | null> {
    const rows = await sql('SELECT * FROM email_messages WHERE id = $1', [id])
    return rows[0] || null
  }

  static async listOutbox(opts: { limit?: number; offset?: number; search?: string }): Promise<EmailMessage[]> {
    const limit = Math.min(Math.max(opts.limit || 25, 1), 100)
    const offset = Math.max(opts.offset || 0, 0)
    const search = opts.search?.trim()
    if (search) {
      const pattern = `%${search}%`
      return await sql(
        `SELECT * FROM email_messages
         WHERE direction = 'outbound' AND (subject ILIKE $1 OR "to" ILIKE $1 OR "from" ILIKE $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [pattern, limit, offset]
      ) as EmailMessage[]
    }
    return await sql(
      `SELECT * FROM email_messages
       WHERE direction = 'outbound'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ) as EmailMessage[]
  }

  static async listInbox(opts: { limit?: number; offset?: number; search?: string }): Promise<EmailMessage[]> {
    const limit = Math.min(Math.max(opts.limit || 25, 1), 100)
    const offset = Math.max(opts.offset || 0, 0)
    const search = opts.search?.trim()
    if (search) {
      const pattern = `%${search}%`
      return await sql(
        `SELECT * FROM email_messages
         WHERE direction = 'inbound' AND (subject ILIKE $1 OR "to" ILIKE $1 OR "from" ILIKE $1)
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [pattern, limit, offset]
      ) as EmailMessage[]
    }
    return await sql(
      `SELECT * FROM email_messages
       WHERE direction = 'inbound'
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ) as EmailMessage[]
  }

  static async updateStatusByProviderId(provider_id: string, status: string, error?: string | null): Promise<void> {
    await sql(
      `UPDATE email_messages SET status = $1, error = $2, updated_at = NOW() WHERE provider_id = $3`,
      [status, error || null, provider_id]
    )
  }
}
