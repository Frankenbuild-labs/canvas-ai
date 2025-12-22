# Voice Dialer Feature - Production Readiness Checklist

## Executive Summary
**Feature Status**: 75% Production Ready  
**Unified Contact System**: ✅ Already sharing `crm_leads` table with CRM and Email features  
**Database Tables**: Partially Complete - Missing dedicated dialer-specific tracking  
**Current Functionality**: Working voice/dialer with SignalWire integration, but missing production optimizations

---

## Current Architecture Analysis

### ✅ What's Working Well
1. **Unified Contact System** - Already using `crm_leads` table (same as CRM & Email)
2. **SignalWire Integration** - Call Widget fully functional with WebRTC
3. **Call Logging** - Basic `call_logs` table exists
4. **CRM List Integration** - Dialer pulls from `crm_lead_lists` and `crm_lead_list_members`
5. **Phone Number Management** - Purchase/search SignalWire numbers working
6. **AI Voice Agents** - `signalwire_agents` table and API endpoints operational

### ⚠️ What Needs Work
1. **Call Logs Not Integrated** - Dialer doesn't write to `call_logs` table
2. **No Call History UI** - Recent calls shown but not linked to CRM leads
3. **Missing Call Disposition** - No way to mark call outcomes (answered, voicemail, busy, etc.)
4. **No Click-to-Dial from CRM** - Can't directly call from CRM lead pages
5. **Missing Call Recording Management** - Recordings not organized/searchable
6. **No Call Notes/Tasks** - Can't add follow-up tasks after calls
7. **No Dialer Analytics** - No reporting on call volume, duration, success rates

---

## Database Schema Status

### ✅ Existing Tables (Ready)
```sql
-- SHARED CONTACT SYSTEM (Used by CRM, Email, Dialer)
crm_leads (id, user_id, name, email, phone, company, position, status, value, source, notes, created_at, updated_at, last_contact)
crm_lead_lists (id, user_id, name, description, created_at, updated_at)
crm_lead_list_members (list_id, lead_id, added_at)

-- CALL LOGGING (Exists but not connected)
call_logs (id, user_id, contact_number, from_number, provider_call_sid, direction, status, started_at, ended_at, duration_seconds, recording_url, raw, created_at)

-- VOICE/AGENTS (Working)
signalwire_agents (id, agent_name, assigned_number, prompt, settings, status, created_at, updated_at)
voice_clones (id, user_id, name, sample_audio_url, playht_voice_id, status, created_at, updated_at)
```

### 🔴 Missing Tables (Need to Create)
```sql
-- CALL DISPOSITIONS (Track call outcomes)
call_dispositions (id, call_log_id, disposition_type, notes, next_action, follow_up_date, created_at)
-- disposition_type: answered, voicemail, busy, no_answer, wrong_number, etc.

-- CALL RECORDINGS METADATA (Better organization)
call_recordings (id, call_log_id, recording_url, duration_seconds, transcription_text, transcription_url, created_at)

-- DIALER CAMPAIGNS (Power dialer functionality)
dialer_campaigns (id, user_id, name, list_id, status, dial_mode, created_at, started_at, completed_at)
-- dial_mode: preview, progressive, predictive

-- DIALER CAMPAIGN PROGRESS (Track which leads called)
dialer_campaign_calls (id, campaign_id, lead_id, call_log_id, attempt_number, status, next_retry_at)

-- SMS MESSAGES (Currently untracked)
sms_messages (id, user_id, contact_number, from_number, direction, message_body, provider_message_sid, status, sent_at, created_at)
```

---

## Production Checklist

### Phase 1: Database & Integration (Critical)
**Priority: HIGH** | **Estimate: 4-6 hours**

- [ ] **1.1 Create Call Disposition System**
  - Create `call_dispositions` table with SQL migration
  - Add disposition dropdown to dialer UI after call ends
  - Connect dispositions to CRM lead `status` updates
  - **Acceptance**: Can mark "Interested", "Not Interested", "Callback", "Voicemail" after each call

- [ ] **1.2 Connect Call Logs to CRM Leads**
  - Add `lead_id` column to `call_logs` table (nullable)
  - Update `lib/voice/calls-db.ts` to accept `leadId` parameter
  - Modify dialer to pass lead ID when calling from contact list
  - **Acceptance**: Call logs show which CRM lead was called

- [ ] **1.3 Create Call Recordings Table**
  - Create `call_recordings` table migration
  - Update SignalWire webhook to save recording metadata
  - Add recordings tab to dialer showing all recordings
  - **Acceptance**: Can view/play all call recordings organized by contact

- [ ] **1.4 Update `last_contact` on CRM Leads**
  - Modify call logging to update `crm_leads.last_contact` after call
  - Show "Last Called" timestamp in contact list
  - **Acceptance**: CRM shows accurate last contact date after dialer calls

---

### Phase 2: Click-to-Dial Integration (High Priority)
**Priority: HIGH** | **Estimate: 3-4 hours**

- [ ] **2.1 Add Click-to-Dial to CRM Lead Pages**
  - Create phone number component with dial icon
  - Add `<PhoneDialButton>` component accepting phone + leadId
  - Integrate in CRM lead detail view and table rows
  - **Acceptance**: Can click phone number in CRM to open dialer with contact pre-selected

- [ ] **2.2 Add Click-to-Dial to Email Contacts**
  - Add dial button to email contacts list
  - Connect to dialer with contact context
  - **Acceptance**: Can call email contacts directly from email marketing views

- [ ] **2.3 Deep Link Support**
  - Enhance `/voice/dial?to=PHONE&leadId=ID&open=true` deep linking
  - Auto-select contact and open dialer when deep link used
  - **Acceptance**: Click-to-dial works from any page in app

---

### Phase 3: Call History & Notes (Medium Priority)
**Priority: MEDIUM** | **Estimate: 4-5 hours**

- [ ] **3.1 Build Call History Tab**
  - Create "History" tab in dialer showing recent calls
  - Display: contact name, number, date/time, duration, disposition
  - Add filters: date range, disposition, lead status
  - **Acceptance**: Can see all past calls with full context

- [ ] **3.2 Add Call Notes System**
  - Add notes field to call disposition modal
  - Save notes to `call_dispositions.notes`
  - Display notes in call history
  - **Acceptance**: Can add notes after call and view later

- [ ] **3.3 Create Follow-Up Tasks**
  - Add "Create Task" option in disposition modal
  - Save to `call_dispositions.next_action` and `follow_up_date`
  - Show pending follow-ups in dashboard
  - **Acceptance**: Can schedule follow-up calls and see reminders

---

### Phase 4: SMS Integration (Medium Priority)
**Priority: MEDIUM** | **Estimate: 3-4 hours**

- [ ] **4.1 Create SMS Messages Table**
  - Create `sms_messages` table migration
  - Add SMS tab to dialer interface
  - **Acceptance**: SMS conversation history stored in database

- [ ] **4.2 Add SMS Send Functionality**
  - Create SMS compose UI in dialer
  - Connect to existing `/api/voice/sw/sms` route
  - Log outbound messages to `sms_messages`
  - **Acceptance**: Can send SMS from dialer and see in history

- [ ] **4.3 SMS Webhook Integration**
  - Update `/api/voice/sw/sms/webhook` to save to `sms_messages`
  - Show inbound SMS in dialer SMS tab
  - Add notification for new inbound messages
  - **Acceptance**: Inbound SMS appear in dialer automatically

---

### Phase 5: Power Dialer (Optional - Advanced)
**Priority: LOW** | **Estimate: 8-10 hours**

- [ ] **5.1 Create Dialer Campaigns Table**
  - Create `dialer_campaigns` and `dialer_campaign_calls` tables
  - Add "Start Campaign" button in dialer
  - Select list and dial mode (preview/progressive)
  - **Acceptance**: Can create campaign from CRM list

- [ ] **5.2 Build Progressive Dialer**
  - Auto-advance to next lead after call disposition
  - Skip leads with "Do Not Call" status
  - Track attempts per lead (max 3)
  - **Acceptance**: Dialer auto-moves through list

- [ ] **5.3 Add Campaign Analytics**
  - Show calls made, connected, dispositions
  - Average call duration, conversion rate
  - Export campaign results to CSV
  - **Acceptance**: Can see campaign performance metrics

---

### Phase 6: Analytics & Reporting (Optional)
**Priority: LOW** | **Estimate: 5-6 hours**

- [ ] **6.1 Call Volume Dashboard**
  - Chart: calls per day/week/month
  - Filter by user, disposition, lead status
  - **Acceptance**: Visual dashboard of call activity

- [ ] **6.2 Contact Rate Report**
  - Calculate: answered%, voicemail%, busy%, no answer%
  - Show by time of day / day of week
  - **Acceptance**: Know best times to call

- [ ] **6.3 Lead Conversion Tracking**
  - Track: calls → meetings → deals
  - Show conversion funnel
  - **Acceptance**: See sales pipeline from dialer

---

## Technical Implementation Guide

### 1. Create Missing Database Tables

```sql
-- FILE: scripts/016_create_dialer_tables.sql

-- Call Dispositions
CREATE TABLE IF NOT EXISTS call_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  disposition_type TEXT NOT NULL,
  -- answered, voicemail, busy, no_answer, wrong_number, callback_requested, not_interested, interested
  notes TEXT,
  next_action TEXT, -- call_back, send_email, send_sms, schedule_meeting, mark_dead
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- user_id
);
CREATE INDEX idx_call_dispositions_call_log ON call_dispositions(call_log_id);
CREATE INDEX idx_call_dispositions_follow_up ON call_dispositions(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Call Recordings Metadata
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription_text TEXT,
  transcription_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_call_recordings_call_log ON call_recordings(call_log_id);

-- SMS Messages
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  contact_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('inbound','outbound')) NOT NULL,
  message_body TEXT NOT NULL,
  provider_message_sid TEXT,
  status TEXT, -- queued, sent, delivered, failed
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sms_messages_user ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_lead ON sms_messages(lead_id);
CREATE INDEX idx_sms_messages_contact ON sms_messages(contact_number);
CREATE INDEX idx_sms_messages_created ON sms_messages(created_at DESC);

-- Dialer Campaigns (for power dialer)
CREATE TABLE IF NOT EXISTS dialer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  list_id UUID NOT NULL REFERENCES crm_lead_lists(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  dial_mode TEXT DEFAULT 'preview', -- preview, progressive, predictive
  from_number TEXT,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_dialer_campaigns_user ON dialer_campaigns(user_id);
CREATE INDEX idx_dialer_campaigns_status ON dialer_campaigns(status);

-- Campaign Call Progress
CREATE TABLE IF NOT EXISTS dialer_campaign_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dialer_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, called, skipped
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaign_calls_campaign ON dialer_campaign_calls(campaign_id);
CREATE INDEX idx_campaign_calls_lead ON dialer_campaign_calls(lead_id);
CREATE INDEX idx_campaign_calls_status ON dialer_campaign_calls(status);
CREATE INDEX idx_campaign_calls_retry ON dialer_campaign_calls(next_retry_at) WHERE status = 'pending';
```

### 2. Update Call Logs Integration

```typescript
// FILE: lib/voice/calls-db.ts

export async function createCallLog(params: {
  userId: string
  leadId?: string // ADD THIS
  contactNumber: string
  fromNumber: string
  providerCallSid?: string
  direction?: 'outbound' | 'inbound'
  status?: string
  raw?: any
}) {
  const rows = await sql`
    INSERT INTO call_logs (
      user_id, lead_id, contact_number, from_number, 
      provider_call_sid, direction, status, raw
    )
    VALUES (
      ${params.userId}, 
      ${params.leadId || null}, 
      ${params.contactNumber}, 
      ${params.fromNumber}, 
      ${params.providerCallSid || null}, 
      ${params.direction || 'outbound'}, 
      ${params.status || null}, 
      ${params.raw ? JSON.stringify(params.raw) : null}
    )
    RETURNING *
  `
  
  // UPDATE last_contact on crm_leads if leadId provided
  if (params.leadId) {
    await sql`
      UPDATE crm_leads 
      SET last_contact = NOW() 
      WHERE id = ${params.leadId}
    `
  }
  
  return rows?.[0]
}

export async function addCallDisposition(callLogId: string, params: {
  dispositionType: string
  notes?: string
  nextAction?: string
  followUpDate?: string
  createdBy: string
}) {
  const rows = await sql`
    INSERT INTO call_dispositions (
      call_log_id, disposition_type, notes, 
      next_action, follow_up_date, created_by
    )
    VALUES (
      ${callLogId}, 
      ${params.dispositionType}, 
      ${params.notes || null}, 
      ${params.nextAction || null}, 
      ${params.followUpDate || null}, 
      ${params.createdBy}
    )
    RETURNING *
  `
  return rows?.[0]
}

export async function listCallHistoryWithDispositions(userId: string, limit = 50) {
  const rows = await sql`
    SELECT 
      cl.*,
      cd.disposition_type,
      cd.notes as disposition_notes,
      cd.next_action,
      cd.follow_up_date,
      l.name as lead_name,
      l.company as lead_company
    FROM call_logs cl
    LEFT JOIN call_dispositions cd ON cd.call_log_id = cl.id
    LEFT JOIN crm_leads l ON l.id = cl.lead_id
    WHERE cl.user_id = ${userId}
    ORDER BY cl.started_at DESC
    LIMIT ${limit}
  `
  return rows
}
```

### 3. Add Click-to-Dial Component

```typescript
// FILE: components/voice/phone-dial-button.tsx

'use client'
import { Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PhoneDialButtonProps {
  phone: string
  leadId?: string
  leadName?: string
  variant?: "default" | "ghost" | "link"
  size?: "sm" | "default" | "lg"
}

export function PhoneDialButton({ 
  phone, 
  leadId, 
  leadName, 
  variant = "ghost", 
  size = "sm" 
}: PhoneDialButtonProps) {
  const handleDial = () => {
    if (!phone) return
    
    // Build deep link URL with lead context
    const params = new URLSearchParams({
      to: phone,
      open: 'true'
    })
    if (leadId) params.set('leadId', leadId)
    if (leadName) params.set('name', leadName)
    
    // Open dialer in same tab or new tab
    window.location.href = `/voice/dial?${params.toString()}`
  }

  if (!phone) return null

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDial}
      className="gap-1"
    >
      <Phone className="h-4 w-4" />
      <span className="hidden sm:inline">{phone}</span>
    </Button>
  )
}
```

### 4. Usage in CRM

```typescript
// In components/crm/lead-card.tsx or lead-table.tsx
import { PhoneDialButton } from "@/components/voice/phone-dial-button"

// Inside render:
<PhoneDialButton 
  phone={lead.phone} 
  leadId={lead.id}
  leadName={lead.name}
/>
```

---

## Environment Variables (Already Configured)

```bash
# SignalWire (Required for Dialer)
SIGNALWIRE_SPACE_URL=yourspace.signalwire.com
SIGNALWIRE_PROJECT_ID=your-project-id
SIGNALWIRE_API_TOKEN=PT_xxxxx # Project Token
SIGNALWIRE_EMBED_TOKEN=EMBED_xxxxx # For Call Widget
NEXT_PUBLIC_BASE_URL=http://localhost:3002 # For webhooks

# Database (Already Working)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

---

## Testing Plan

### Unit Tests
```bash
# Test call logging
npm test -- lib/voice/calls-db.test.ts

# Test disposition creation
npm test -- lib/voice/dispositions.test.ts
```

### Integration Tests
1. Create test lead in CRM
2. Click phone number to dial
3. Complete call and add disposition
4. Verify `call_logs`, `call_dispositions`, and `crm_leads.last_contact` updated

### End-to-End Tests
1. Search and purchase SignalWire number
2. Call 10 contacts from different lists
3. Add various dispositions
4. Check call history shows all calls
5. Verify CRM leads show updated "Last Called"
6. Send SMS to 5 contacts
7. Check SMS history

---

## Migration Path to Production

### Step 1: Database Setup (30 min)
```bash
# Run migration script
psql $DATABASE_URL -f scripts/016_create_dialer_tables.sql

# Add lead_id column to existing call_logs
psql $DATABASE_URL -c "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL;"
```

### Step 2: Code Updates (4-6 hours)
- Update `lib/voice/calls-db.ts` with new functions
- Create disposition modal component
- Add PhoneDialButton component to CRM
- Update dialer page to pass leadId on calls

### Step 3: Testing (2 hours)
- Test call logging with lead context
- Test dispositions save correctly
- Test click-to-dial from CRM
- Test call history displays

### Step 4: Deploy (1 hour)
- Deploy database migrations
- Deploy code changes
- Update environment variables if needed
- Smoke test in production

---

## Priority Recommendations

### 🔴 Must Have for Production (Do First)
1. Connect call logs to CRM leads (Phase 1.2)
2. Add call dispositions (Phase 1.1)
3. Click-to-dial from CRM (Phase 2.1)
4. Update last_contact timestamp (Phase 1.4)

### 🟡 Should Have (Do Next)
5. Call history tab with filters (Phase 3.1)
6. Call notes and follow-ups (Phase 3.2-3.3)
7. SMS integration (Phase 4.1-4.3)
8. Call recordings organization (Phase 1.3)

### 🟢 Nice to Have (Future Enhancement)
9. Power dialer campaigns (Phase 5)
10. Analytics dashboard (Phase 6)

---

## Success Metrics

### Immediate (After Phase 1-2)
- ✅ All calls linked to CRM leads
- ✅ Can add disposition after each call
- ✅ Click phone number in CRM to dial
- ✅ "Last Called" shows in CRM

### Short-term (After Phase 3-4)
- ✅ Can review call history with context
- ✅ Can add notes and schedule follow-ups
- ✅ SMS conversations tracked with calls

### Long-term (After Phase 5-6)
- ✅ Power dialer increases call volume by 3x
- ✅ Dashboard shows team call metrics
- ✅ Lead conversion tracked from first call to deal

---

## Current File Locations

```
app/
  voice/dial/page.tsx          # Main dialer UI (working)
  api/voice/sw/
    call/route.ts              # Initiate calls
    call/recent/route.ts       # Get recent calls
    numbers/route.ts           # List purchased numbers
    token/route.ts             # Get SignalWire token
lib/
  voice/
    calls-db.ts                # Call logging functions (needs updates)
    signalwire.ts              # SignalWire API helpers
scripts/
  013_create_call_logs.sql     # Call logs table (exists)
  016_create_dialer_tables.sql # NEW - Need to create
```

---

## Questions to Answer Before Starting

1. **Call Disposition Values**: What dispositions do you want?
   - Suggested: Answered, Voicemail, Busy, No Answer, Wrong Number, Do Not Call, Interested, Not Interested, Callback Requested

2. **SMS Priority**: How important is SMS vs just calling?
   - Can defer to Phase 4 if calls are priority

3. **Power Dialer**: Do sales team need auto-dialer or just manual calling?
   - Phase 5 can be skipped if not needed

4. **Recording Storage**: Keep in SignalWire or download to S3/Supabase?
   - Current setup stores URLs only, not files

---

## Estimated Total Timeline

- **Phase 1 (Critical)**: 4-6 hours
- **Phase 2 (High Priority)**: 3-4 hours  
- **Phase 3 (Medium)**: 4-5 hours
- **Phase 4 (Medium)**: 3-4 hours
- **Testing & Deployment**: 3 hours

**Minimum Viable Production**: ~10-13 hours (Phases 1-2 only)  
**Full Featured Production**: ~22-25 hours (All phases)

---

## Next Steps

Ready to proceed! Here's the recommended order:

1. **Review this checklist** - Confirm priorities and scope
2. **Create database migration** - Run script 016_create_dialer_tables.sql
3. **Update calls-db.ts** - Add leadId support and disposition functions
4. **Build disposition modal** - UI for marking call outcomes
5. **Add PhoneDialButton** - Click-to-dial from CRM
6. **Test thoroughly** - Verify all integrations work
7. **Deploy to production** - Follow migration path

Let me know which phase you want to start with!
