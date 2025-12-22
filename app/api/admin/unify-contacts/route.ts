import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/database"

export async function POST(req: NextRequest) {
  try {
    console.log("🔄 Starting unified contact system migration...")
    
    // Step 1: Create unified contacts table (merges crm_leads + email_contacts)
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT,
        
        -- Core contact fields
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        name TEXT,
        phone TEXT,
        company TEXT,
        position TEXT,
        
        -- Status and categorization
        status TEXT DEFAULT 'active',
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        source TEXT,
        
        -- CRM-specific fields
        value NUMERIC DEFAULT 0,
        notes TEXT,
        last_contact TIMESTAMP,
        document_id TEXT,
        document_answers JSONB,
        
        -- Email-specific fields
        subscribe_date TIMESTAMP,
        unsubscribe_date TIMESTAMP,
        
        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log("✓ Created unified contacts table")
    
    // Step 2: Migrate existing crm_leads to contacts
    await sql`
      INSERT INTO contacts (
        id, user_id, name, email, phone, company, position, status, 
        value, source, notes, last_contact, document_id, document_answers,
        created_at, updated_at
      )
      SELECT 
        id, user_id, name, email, phone, company, position, status,
        value, source, notes, last_contact, document_id, document_answers,
        created_at, updated_at
      FROM crm_leads
      ON CONFLICT (id) DO NOTHING
    `
    console.log("✓ Migrated crm_leads to contacts")
    
    // Step 3: Migrate existing email_contacts if table exists
    try {
      await sql`
        INSERT INTO contacts (
          id, email, first_name, last_name, 
          status, tags, subscribe_date, created_at, updated_at
        )
        SELECT 
          id, email, first_name, last_name,
          status, tags, subscribe_date, created_at, updated_at
        FROM email_contacts
        ON CONFLICT (id) DO NOTHING
      `
      console.log("✓ Migrated email_contacts to contacts")
    } catch (e) {
      console.log("ℹ No email_contacts table to migrate (skipped)")
    }
    
    // Step 4: Create unified contact_lists table
    await sql`
      CREATE TABLE IF NOT EXISTS contact_lists (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log("✓ Created unified contact_lists table")
    
    // Step 5: Migrate crm_lists
    await sql`
      INSERT INTO contact_lists (id, user_id, name, description, created_at, updated_at)
      SELECT id, user_id, name, description, created_at, updated_at
      FROM crm_lists
      ON CONFLICT (id) DO NOTHING
    `
    console.log("✓ Migrated crm_lists to contact_lists")
    
    // Step 6: Migrate email_lists if exists
    try {
      await sql`
        INSERT INTO contact_lists (id, name, description, type, created_at, updated_at)
        SELECT id, name, description, 'email' as type, created_at, updated_at
        FROM email_lists
        ON CONFLICT (id) DO NOTHING
      `
      console.log("✓ Migrated email_lists to contact_lists")
    } catch (e) {
      console.log("ℹ No email_lists table to migrate (skipped)")
    }
    
    // Step 7: Create unified junction table
    await sql`
      CREATE TABLE IF NOT EXISTS contact_list_members (
        list_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (list_id, contact_id)
      )
    `
    console.log("✓ Created unified contact_list_members table")
    
    // Step 8: Migrate crm_list_members
    await sql`
      INSERT INTO contact_list_members (list_id, contact_id, added_at)
      SELECT list_id, lead_id, added_at
      FROM crm_list_members
      ON CONFLICT DO NOTHING
    `
    console.log("✓ Migrated crm_list_members")
    
    // Step 9: Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contact_lists_user_id ON contact_lists(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contact_list_members_list ON contact_list_members(list_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_contact_list_members_contact ON contact_list_members(contact_id)`
    console.log("✓ Created all indexes")
    
    return NextResponse.json({
      success: true,
      message: "✅ Unified contact system created successfully",
      tables: ["contacts", "contact_lists", "contact_list_members"]
    })

  } catch (error) {
    console.error("❌ Migration error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: String(error)
      },
      { status: 500 }
    )
  }
}
