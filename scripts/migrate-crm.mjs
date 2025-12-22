import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL)

async function migrate() {
  try {
    console.log("Adding missing columns to crm_leads table...")
    
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS document_id TEXT`
    console.log("✓ Added document_id column")
    
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS document_answers JSONB`
    console.log("✓ Added document_answers column")
    
    await sql`ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP`
    console.log("✓ Added last_contact column")
    
    console.log("\n✅ CRM migration completed successfully!")
  } catch (error) {
    console.error("❌ Migration failed:", error.message)
    process.exit(1)
  }
}

migrate()
