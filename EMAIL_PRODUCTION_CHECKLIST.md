# Email Feature - Production Checklist

## Overview
This document outlines all tasks required to bring the email marketing feature to production-ready status. The feature includes: Dashboard/Compose, Campaigns, Templates (with AI), Media Library, Settings, Inbox/Outbox, and Domain Management.

---

## Current Status Assessment

### ✅ Already Implemented
- **Contacts Management**: Unified with CRM leads system using `crm_leads` table
- **Lists Management**: Using `crm_lead_lists` and `crm_lead_list_members` tables
- **Domain Management UI**: Pages exist at `/email/domains` with domain verification
- **Email Sending**: `/api/email/send` endpoint functional
- **Inbox/Outbox**: Basic UI and API routes exist
- **Templates Gallery**: Free templates from Designmodo/Colorlib integrated
- **AI Integration**: Template generation endpoints exist (`/api/email-marketing/templates/generate-ai`)

### ⚠️ Partially Complete (Needs Database Migration)
- **Campaigns**: UI exists but uses non-existent database tables
- **Templates**: UI exists but queries undefined `email_templates` table
- **Media Library**: UI exists but needs Supabase Storage integration
- **Settings**: UI exists but tries to use Cosmic CMS

### ❌ Needs Implementation
- Domain verification in Settings
- Campaign scheduling and execution
- Media database persistence
- Settings database persistence

---

## Database Setup Tasks

### 1. ✅ **Verify Existing Email Tables** (ALREADY EXISTS)
**Status**: Migration files exist in `/migrations/002_email_tables.sql`
```sql
- email_messages (inbox/outbox tracking)
- email_domains (domain verification)
- template_previews
- media_assets
```

### 2. **Create Email Templates Table**
**File**: Create or run `/scripts/004_create_email_marketing_tables.sql`
**Action Required**: Verify this table exists in Supabase
```sql
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  template_type VARCHAR(50) DEFAULT 'html',
  preview_html TEXT,
  preview_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_user ON email_templates(user_id);
GRANT ALL PRIVILEGES ON email_templates TO postgres, anon, authenticated, service_role;
```

### 3. **Create Email Campaigns Table**
**Action Required**: Run this SQL in Supabase
```sql
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  html_content TEXT,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, failed
  target_list_ids TEXT[], -- Array of CRM list IDs
  target_contact_ids TEXT[], -- Array of specific contact IDs
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_user ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_for);
GRANT ALL PRIVILEGES ON email_campaigns TO postgres, anon, authenticated, service_role;
```

### 4. **Create Campaign Sends Tracking Table**
**Action Required**: Run this SQL in Supabase
```sql
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL, -- CRM lead ID
  contact_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT, -- Resend or other provider's message ID
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_email)
);

CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX idx_campaign_sends_contact ON campaign_sends(contact_id);
GRANT ALL PRIVILEGES ON campaign_sends TO postgres, anon, authenticated, service_role;
```

### 5. **Create Email Media Table**
**Action Required**: Check if `/migrations/004_create_email_media.sql` was run
```sql
CREATE TABLE IF NOT EXISTS email_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  storage_bucket TEXT DEFAULT 'email-media',
  url TEXT NOT NULL, -- Public URL from Supabase Storage
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  folder TEXT DEFAULT '/',
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_media_user ON email_media(user_id);
CREATE INDEX idx_email_media_folder ON email_media(folder);
GRANT ALL PRIVILEGES ON email_media TO postgres, anon, authenticated, service_role;
```

### 6. **Create Email Settings Table**
**Action Required**: Run this SQL in Supabase
```sql
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to_email VARCHAR(255),
  company_name VARCHAR(255),
  company_address TEXT,
  website_url VARCHAR(500),
  support_email VARCHAR(255),
  brand_guidelines TEXT,
  primary_brand_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_brand_color VARCHAR(7) DEFAULT '#1e40af',
  ai_tone VARCHAR(50) DEFAULT 'Professional', -- Professional, Friendly, Casual, Formal
  privacy_policy_url VARCHAR(500),
  terms_of_service_url VARCHAR(500),
  google_analytics_id VARCHAR(100),
  email_signature TEXT,
  test_emails TEXT, -- Comma-separated emails for test sends
  smtp_config JSONB DEFAULT '{}'::JSONB,
  api_keys JSONB DEFAULT '{}'::JSONB, -- Store Resend, SendGrid, etc keys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_settings_user ON email_settings(user_id);
GRANT ALL PRIVILEGES ON email_settings TO postgres, anon, authenticated, service_role;
```

### 7. **Create Supabase Storage Bucket for Media**
**Action Required**: Run in Supabase Storage dashboard or SQL
```sql
-- Create public storage bucket for email media
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-media', 'email-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload email media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-media');

-- Allow public read access
CREATE POLICY "Anyone can view email media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own email media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'email-media');
```

---

## Code Migration Tasks

### 8. **Migrate Campaigns to Supabase**
**Files to Update**:
- `lib/email-marketing/database.ts` - functions `getMarketingCampaigns()`, `createMarketingCampaign()`, `updateMarketingCampaign()`, `deleteMarketingCampaign()`
- `app/api/email-marketing/campaigns/route.ts` - GET/POST handlers
- `app/api/email-marketing/campaigns/[id]/route.ts` - GET/PATCH/DELETE handlers

**Implementation Steps**:
1. Create `lib/email-marketing/campaigns-supabase.ts` similar to `crm-supabase.ts`
2. Add functions: `listCampaigns()`, `createCampaign()`, `updateCampaign()`, `deleteCampaign()`, `scheduleCampaign()`, `sendCampaign()`
3. Update API routes to use new Supabase client functions
4. Add campaign execution logic (iterate contacts, send emails, track results)

**Key Requirements**:
- Support draft/scheduled/sent statuses
- Integrate with CRM contacts via `crm_leads` table
- Track individual sends in `campaign_sends` table
- Support immediate send and scheduled send

### 9. **Migrate Templates to Supabase**
**Files to Update**:
- `lib/email-marketing/database.ts` - functions `getEmailTemplates()`, `createEmailTemplate()`, `updateEmailTemplate()`, `deleteEmailTemplate()`
- `app/api/email-marketing/templates/route.ts` - GET/POST handlers
- `app/api/email-marketing/templates/[id]/route.ts` - GET/PATCH/DELETE handlers

**Implementation Steps**:
1. Create `lib/email-marketing/templates-supabase.ts`
2. Add functions using Supabase client with proper error handling
3. Update all API routes to use Supabase functions
4. Ensure preview generation works

**Key Requirements**:
- Store HTML content with preview text
- Support template types (Welcome, Newsletter, Promotional, Transactional)
- Generate preview HTML for gallery display
- Integrate with AI generation endpoint

### 10. **Migrate Media Library to Supabase Storage**
**Files to Update**:
- `components/email-marketing/MediaLibrary.tsx` - upload/delete handlers
- `app/api/email-marketing/media/route.ts` - GET/POST handlers
- `app/api/email-marketing/media/[id]/route.ts` - GET/DELETE handlers

**Implementation Steps**:
1. Create `lib/email-marketing/media-supabase.ts`
2. Add upload to Supabase Storage bucket: `email-media`
3. Save metadata to `email_media` table
4. Implement folder organization
5. Add image resizing/optimization (optional)

**Key Requirements**:
- Upload files to Supabase Storage
- Store metadata (filename, size, dimensions, folder)
- Support folders for organization
- Generate public URLs for use in emails
- Handle image cropping (already has ImageCropperModal component)

### 11. **Migrate Settings to Supabase**
**Files to Update**:
- `lib/email-marketing/database.ts` - functions `getSettings()`, `updateSettings()`
- `app/api/email-marketing/settings/route.ts` - GET/POST handlers
- `components/email-marketing/SettingsForm.tsx` - form submission

**Implementation Steps**:
1. Create `lib/email-marketing/settings-supabase.ts`
2. Add CRUD functions for settings table
3. Update API routes to use Supabase
4. Add domain management tab in Settings UI

**Key Requirements**:
- One settings row per user (upsert pattern)
- Store all form fields from SettingsForm
- Add domain management UI tab
- Link to `/email/domains` page

### 12. **Verify Inbox/Outbox Database Persistence**
**Files to Check**:
- `app/api/email/inbox/route.ts` - verify uses `email_messages` table
- `app/api/email/outbox/route.ts` - verify uses `email_messages` table
- `lib/emaildb.ts` or similar - check database client

**Implementation Steps**:
1. Verify `email_messages` table exists (from migration 002)
2. Update EmailDB class or create Supabase client for messages
3. Ensure all sent emails are logged to `email_messages` with direction='outbound'
4. Ensure received emails (if webhook configured) log as direction='inbound'

**Key Requirements**:
- Persist all emails to database
- Track status (sent, delivered, opened, clicked, bounced)
- Store attachments as JSONB
- Link to provider message IDs

### 13. **Add Domain Management to Settings**
**Files to Update**:
- `components/email-marketing/SettingsForm.tsx` - add new tab
- Create new component: `components/email-marketing/DomainManagementTab.tsx`

**Implementation Steps**:
1. Add "Domains" tab to SettingsForm Tabs component
2. Create DomainManagementTab component that:
   - Lists all domains from `email_domains` table
   - Shows verification status and DNS records
   - Has "Add Domain" button → opens modal
   - Has "Verify Domain" button → triggers DNS check
   - Displays instructions for DNS setup
3. Integrate with `/api/email/domains` endpoints

**Key Requirements**:
- List all domains with verification status
- Add domain with verification instructions
- Check DNS records via API
- Mark domains as default sending domain
- Show clear instructions for SPF, DKIM, DMARC records

---

## API Integration Tasks

### 14. **Verify AI Template Generation**
**Files to Check**:
- `app/api/email-marketing/templates/generate-ai/route.ts`
- `app/api/email-marketing/templates/generate-subject/route.ts`
- `app/api/email-marketing/templates/edit-ai/route.ts`

**Implementation Steps**:
1. Verify `OPENAI_API_KEY` environment variable is set
2. Test generate-ai endpoint with sample prompts
3. Ensure streaming responses work correctly
4. Test subject line generation
5. Test AI editing/refinement

**Key Requirements**:
- OpenAI API key configured
- Streaming responses work in UI
- Generated content is valid HTML
- Subject line generation works
- Error handling for API failures

### 15. **Campaign Contact Access Verification**
**Files to Check**:
- `components/email-marketing/RecipientSelector.tsx`
- `components/email-marketing/CampaignsView.tsx`

**Implementation Steps**:
1. Verify RecipientSelector can fetch CRM lists via `/api/crm/lists`
2. Verify RecipientSelector can fetch contacts via `/api/email/recipients` (which uses CRM data)
3. Test selecting entire lists vs individual contacts
4. Ensure recipient email resolution works correctly

**Key Requirements**:
- Can select CRM lists as recipients
- Can select individual CRM contacts
- Can mix lists and individual contacts
- Email resolution works (extracts emails from selected contacts)
- Deduplication of emails when sending

### 16. **Email Sending Infrastructure**
**Files to Check**:
- `app/api/email/send/route.ts`
- Environment variables: `RESEND_API_KEY`, `SMTP_*` settings

**Implementation Steps**:
1. Verify Resend API key is configured (recommended provider)
2. Test sending single email
3. Test sending to multiple recipients
4. Test attachments
5. Add domain verification check (ensure from_email domain is verified)
6. Implement rate limiting for bulk sends

**Key Requirements**:
- Resend or SMTP configured
- Domain verification enforced
- Attachments work
- Rate limiting for bulk sends
- Error handling and logging
- Queue support for large campaigns (optional but recommended)

---

## Testing Tasks

### 17. **Test Email Compose**
**Page**: `/email/compose`
**Test Cases**:
1. Send email to single recipient
2. Send email to multiple recipients (comma-separated)
3. Send email to CRM list
4. Attach files
5. Use template
6. Verify inbox/outbox tracking
7. Check from_email dropdown (verified domains only)

### 18. **Test Campaign Creation**
**Page**: `/email/campaigns`
**Test Cases**:
1. Create new campaign
2. Select template
3. Select recipient lists from CRM
4. Schedule for future send
5. Save as draft
6. Send immediately
7. View campaign statistics (sent/opened/clicked)
8. Edit draft campaign
9. Delete campaign

### 19. **Test Template Creation**
**Page**: `/email/templates`
**Test Cases**:
1. Create template manually
2. Generate template with AI (provide prompt)
3. Edit template HTML
4. Generate subject line with AI
5. Use template in compose
6. Use template in campaign
7. Duplicate template
8. Delete template
9. View template preview

### 20. **Test Media Upload**
**Page**: `/email/media`
**Test Cases**:
1. Upload single image
2. Upload multiple images (drag & drop)
3. Create folder
4. Move media to folder
5. Crop image
6. Delete media
7. Use media in template
8. Use media in compose email
9. View media details (size, dimensions)

### 21. **Test Domain Integration**
**Page**: `/email/domains` and `/email/settings`
**Test Cases**:
1. Add new domain
2. View DNS verification instructions
3. Verify domain (after DNS setup)
4. Set domain as default
5. Send email from verified domain
6. View domain status in compose page
7. Error when trying to send from unverified domain

### 22. **Test Settings**
**Page**: `/email/settings`
**Test Cases**:
1. Update company information
2. Update branding colors
3. Set AI tone preference
4. Add test emails
5. Update email signature
6. Test send to test emails
7. View settings in compose (signature, branding)

---

## Environment Variables Required

Add these to `.env` or `.env.local`:

```bash
# Email Provider (Required)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# OR SMTP (Alternative)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AI Features (Required for templates)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# Database (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Optional: Campaign scheduling (for background jobs)
CRON_SECRET=your-secret-for-cron-endpoints

# Optional: Email tracking
EMAIL_TRACKING_DOMAIN=track.yourdomain.com
```

---

## SQL Setup Script

**Create**: `setup-email-tables.sql`

```sql
-- Run this in Supabase SQL Editor to set up all email tables

-- Required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  template_type VARCHAR(50) DEFAULT 'html',
  preview_html TEXT,
  preview_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_templates_user ON email_templates(user_id);

-- 2. Email Campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  content TEXT,
  html_content TEXT,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft',
  target_list_ids TEXT[],
  target_contact_ids TEXT[],
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_campaigns_user ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_for);

-- 3. Campaign Sends
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, contact_email)
);
CREATE INDEX idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX idx_campaign_sends_contact ON campaign_sends(contact_id);

-- 4. Email Media
CREATE TABLE IF NOT EXISTS email_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'email-media',
  url TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  folder TEXT DEFAULT '/',
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_media_user ON email_media(user_id);
CREATE INDEX idx_email_media_folder ON email_media(folder);

-- 5. Email Settings
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to_email VARCHAR(255),
  company_name VARCHAR(255),
  company_address TEXT,
  website_url VARCHAR(500),
  support_email VARCHAR(255),
  brand_guidelines TEXT,
  primary_brand_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_brand_color VARCHAR(7) DEFAULT '#1e40af',
  ai_tone VARCHAR(50) DEFAULT 'Professional',
  privacy_policy_url VARCHAR(500),
  terms_of_service_url VARCHAR(500),
  google_analytics_id VARCHAR(100),
  email_signature TEXT,
  test_emails TEXT,
  smtp_config JSONB DEFAULT '{}'::JSONB,
  api_keys JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_settings_user ON email_settings(user_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON email_templates TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_campaigns TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON campaign_sends TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_media TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON email_settings TO postgres, anon, authenticated, service_role;

-- Verify tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'email_%' 
OR tablename LIKE 'campaign_%'
ORDER BY tablename;
```

---

## Migration Order

Execute tasks in this order for smooth migration:

### Phase 1: Database Setup (Tasks 1-7)
1. Run `setup-email-tables.sql` in Supabase SQL Editor
2. Create Supabase Storage bucket `email-media`
3. Verify all tables and permissions

### Phase 2: Core Migrations (Tasks 8-12)
4. Migrate Templates to Supabase (Task 9)
5. Migrate Campaigns to Supabase (Task 8)
6. Migrate Media Library to Supabase (Task 10)
7. Migrate Settings to Supabase (Task 11)
8. Verify Inbox/Outbox (Task 12)

### Phase 3: UI Enhancements (Task 13)
9. Add Domain Management tab to Settings

### Phase 4: Integration (Tasks 14-16)
10. Verify AI Integration (Task 14)
11. Verify Campaign Contact Access (Task 15)
12. Test Email Sending Infrastructure (Task 16)

### Phase 5: Testing (Tasks 17-22)
13. Test all features systematically
14. Fix bugs found during testing
15. Performance testing for bulk sends

### Phase 6: Production Deployment
16. Set all environment variables
17. Run database migrations on production
18. Deploy code
19. Monitor for errors
20. Document for users

---

## Success Criteria

### Feature Complete When:
- ✅ All database tables exist and have data
- ✅ All API endpoints return valid data from Supabase
- ✅ Users can create/edit/delete templates
- ✅ Users can create/schedule/send campaigns
- ✅ Users can upload/organize media files
- ✅ Users can configure settings and domains
- ✅ Inbox/outbox track all emails
- ✅ AI template generation works
- ✅ Domain verification works
- ✅ Emails send successfully from verified domains
- ✅ Campaign tracking works (sent/opened/clicked)
- ✅ All tests pass

### Performance Criteria:
- Template list loads < 1s
- Campaign list loads < 1s
- Media upload < 5s for 5MB image
- Bulk email send handles 1000+ recipients
- No email sending failures due to rate limits

---

## Notes

### Key Files to Create:
1. `setup-email-tables.sql` - Database setup script
2. `lib/email-marketing/campaigns-supabase.ts` - Campaign database functions
3. `lib/email-marketing/templates-supabase.ts` - Template database functions
4. `lib/email-marketing/media-supabase.ts` - Media Storage functions
5. `lib/email-marketing/settings-supabase.ts` - Settings database functions
6. `components/email-marketing/DomainManagementTab.tsx` - Domain UI in settings

### Dependencies Already In Place:
- Supabase client configured
- CRM contacts/lists system working
- Domain management API exists
- AI endpoints exist
- Email sending API exists
- UI components all exist

### Estimated Timeline:
- Database Setup: 1 hour
- Code Migrations: 8-12 hours
- UI Enhancements: 2-4 hours
- Integration Testing: 4-6 hours
- Bug Fixes: 4-6 hours
- **Total: 2-3 days of focused development**

---

## Quick Start Commands

```bash
# 1. Run database setup
# Copy setup-email-tables.sql to Supabase SQL Editor and execute

# 2. Verify tables exist
node scripts/check-email-tables.js

# 3. Test template creation
curl -X POST http://localhost:3002/api/email-marketing/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","subject":"Test","content":"<h1>Test</h1>"}'

# 4. Test campaign creation
curl -X POST http://localhost:3002/api/email-marketing/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign","subject":"Test","content":"Hello"}'

# 5. Test media upload (from UI)
# Navigate to http://localhost:3002/email/media and test upload

# 6. Test settings save (from UI)
# Navigate to http://localhost:3002/email/settings and save settings
```

---

## Contact & Support

For issues during implementation:
1. Check Supabase logs for database errors
2. Check browser console for frontend errors
3. Check Next.js terminal for API errors
4. Verify environment variables are set
5. Check that user_id exists in all queries (test user: '11111111-1111-1111-1111-111111111111')

---

**Last Updated**: December 2, 2025
**Status**: Ready for Implementation
