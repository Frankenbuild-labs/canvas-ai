# Production Deployment Guide
## Social Media Automation Platform

This comprehensive guide will walk you through deploying your social media automation platform to production using Vercel and setting up all required integrations.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Third-Party Integrations](#third-party-integrations)
5. [Vercel Deployment](#vercel-deployment)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Security Checklist](#security-checklist)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:
- [ ] Vercel account with team/pro plan (recommended for production)
- [ ] GitHub repository with your code
- [ ] Domain name (optional but recommended)
- [ ] Production database (PostgreSQL recommended)
- [ ] All third-party service accounts set up

## Environment Configuration

### Required Environment Variables

Create these environment variables in your Vercel project settings:

#### Database
\`\`\`bash
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@host:port/database"
POSTGRES_URL="postgresql://username:password@host:port/database"
POSTGRES_PRISMA_URL="postgresql://username:password@host:port/database?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgresql://username:password@host:port/database"
\`\`\`

#### AI Services
\`\`\`bash
# Google AI
GOOGLE_API_KEY="your_google_ai_api_key"

# FAL AI
FAL_KEY="your_fal_api_key"

# E2B Code Interpreter
E2B_API_KEY="your_e2b_api_key"
\`\`\`

#### Social Media Integrations
\`\`\`bash
# Composio (Social Media Management)
COMPOSIO_API_KEY="your_composio_api_key"

# Platform-specific tokens (set these through Composio dashboard)
TWITTER_ACCESS_TOKEN="your_twitter_token"
INSTAGRAM_ACCESS_TOKEN="your_instagram_token"
LINKEDIN_ACCESS_TOKEN="your_linkedin_token"
FACEBOOK_ACCESS_TOKEN="your_facebook_token"
\`\`\`

#### Application Settings
\`\`\`bash
# Next.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your_nextauth_secret_key"

# App Configuration
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
\`\`\`

### Setting Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable with appropriate environment scope (Production, Preview, Development)

## Database Setup

### Option 1: Vercel Postgres (Recommended)
1. In Vercel dashboard, go to Storage tab
2. Create new Postgres database
3. Copy connection strings to environment variables
4. Database will auto-scale and integrate seamlessly

### Option 2: External PostgreSQL
Popular options:
- **Supabase**: Full-featured with auth and real-time features
- **Neon**: Serverless PostgreSQL with branching
- **PlanetScale**: MySQL-compatible with branching
- **Railway**: Simple PostgreSQL hosting

### Database Migration
Run your database migrations after setup:

\`\`\`sql
-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create social_accounts table
CREATE TABLE social_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, platform, account_id)
);

-- Create scheduled_posts table
CREATE TABLE scheduled_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics table
CREATE TABLE post_analytics (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_post_analytics_post_id ON post_analytics(post_id);
\`\`\`

## Third-Party Integrations

### 1. Composio Setup (Social Media Management)
1. Sign up at [composio.dev](https://composio.dev)
2. Create new project
3. Add required social media integrations:
   - Twitter/X API
   - Instagram Basic Display API
   - LinkedIn API
   - Facebook Graph API
4. Configure webhooks for real-time updates
5. Copy API key to environment variables

### 2. Google AI Setup
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create new project
3. Enable Generative AI API
4. Generate API key
5. Set usage quotas and billing

### 3. FAL AI Setup
1. Sign up at [fal.ai](https://fal.ai)
2. Create API key
3. Configure model access permissions
4. Set up billing for production usage

### 4. E2B Code Interpreter
1. Register at [e2b.dev](https://e2b.dev)
2. Create sandbox environment
3. Generate API key
4. Configure execution limits

## Vercel Deployment

### 1. Connect Repository
1. In Vercel dashboard, click "New Project"
2. Import your GitHub repository
3. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 2. Configure Build Settings
\`\`\`json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "outputDirectory": ".next"
}
\`\`\`

### 3. Domain Configuration
1. Add custom domain in project settings
2. Configure DNS records:
   - A record: `@` → Vercel IP
   - CNAME record: `www` → `cname.vercel-dns.com`
3. Enable SSL (automatic with Vercel)

### 4. Deploy
1. Push code to main branch
2. Vercel will automatically deploy
3. Monitor build logs for any issues

## Post-Deployment Configuration

### 1. Database Connection Test
Create a health check endpoint:

\`\`\`typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET() {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    
    return NextResponse.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: result.rows[0].now 
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    }, { status: 500 })
  }
}
\`\`\`

### 2. Social Media Integration Test
Test each platform connection:

\`\`\`typescript
// app/api/test-integrations/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const results = {
    composio: false,
    google_ai: false,
    fal_ai: false,
    e2b: false
  }

  // Test Composio
  try {
    const composioResponse = await fetch('https://api.composio.dev/v1/apps', {
      headers: { 'X-API-Key': process.env.COMPOSIO_API_KEY! }
    })
    results.composio = composioResponse.ok
  } catch (error) {
    console.error('Composio test failed:', error)
  }

  // Test Google AI
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })
    await model.generateContent("test")
    results.google_ai = true
  } catch (error) {
    console.error('Google AI test failed:', error)
  }

  // Test FAL AI
  try {
    const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: "test" })
    })
    results.fal_ai = response.ok
  } catch (error) {
    console.error('FAL AI test failed:', error)
  }

  return NextResponse.json(results)
}
\`\`\`

### 3. Cron Jobs Setup
Configure Vercel Cron for scheduled posts:

\`\`\`json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-scheduled-posts",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/sync-analytics",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/cleanup-old-data",
      "schedule": "0 2 * * *"
    }
  ]
}
\`\`\`

## Security Checklist

### 1. Environment Variables
- [ ] All sensitive data in environment variables
- [ ] No hardcoded secrets in code
- [ ] Different keys for production vs development
- [ ] Regular key rotation schedule

### 2. Database Security
- [ ] Connection pooling enabled
- [ ] SSL connections enforced
- [ ] Regular backups configured
- [ ] Access logs monitored

### 3. API Security
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] Authentication required for sensitive operations

### 4. Social Media Security
- [ ] OAuth tokens encrypted at rest
- [ ] Token refresh mechanism implemented
- [ ] Scope limitations applied
- [ ] Regular permission audits

## Monitoring & Maintenance

### 1. Vercel Analytics
Enable in project settings:
- Web Analytics
- Speed Insights
- Real User Monitoring

### 2. Error Tracking
Add error monitoring service:

\`\`\`typescript
// lib/error-tracking.ts
export function logError(error: Error, context?: any) {
  console.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  })
  
  // Send to external service (Sentry, LogRocket, etc.)
  // await sendToErrorService(error, context)
}
\`\`\`

### 3. Performance Monitoring
Monitor key metrics:
- API response times
- Database query performance
- Social media API rate limits
- User engagement metrics

### 4. Backup Strategy
- Database: Daily automated backups
- User data: Weekly exports
- Configuration: Version controlled
- Media files: Cloud storage with versioning

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
\`\`\`bash
# Check connection string format
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Test connection
npx pg-connection-string-test $DATABASE_URL
\`\`\`

#### 2. Social Media API Errors
- Check rate limits and quotas
- Verify token expiration dates
- Confirm webhook endpoints are accessible
- Review platform-specific requirements

#### 3. Build Failures
\`\`\`bash
# Clear build cache
vercel --prod --force

# Check build logs
vercel logs [deployment-url]
\`\`\`

#### 4. Performance Issues
- Enable Edge Runtime where possible
- Implement proper caching strategies
- Optimize database queries
- Use CDN for static assets

### Support Resources
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Next.js Documentation: [nextjs.org/docs](https://nextjs.org/docs)
- Platform-specific API docs
- Community forums and Discord channels

## Maintenance Schedule

### Daily
- [ ] Monitor error rates
- [ ] Check scheduled post execution
- [ ] Review API usage quotas

### Weekly
- [ ] Database performance review
- [ ] Security log analysis
- [ ] User feedback review
- [ ] Backup verification

### Monthly
- [ ] Dependency updates
- [ ] Security audit
- [ ] Performance optimization
- [ ] Cost analysis and optimization

---

## Quick Deployment Checklist

- [ ] Environment variables configured
- [ ] Database set up and migrated
- [ ] Third-party integrations tested
- [ ] Domain configured with SSL
- [ ] Cron jobs scheduled
- [ ] Monitoring enabled
- [ ] Backup strategy implemented
- [ ] Security measures in place
- [ ] Performance optimized
- [ ] Documentation updated

Your social media automation platform is now ready for production! 🚀
