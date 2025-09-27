# Social Station Production Setup Guide

## Overview
This guide covers the complete setup process for deploying the Social Station social media management platform to production.

## Prerequisites

### Required Services
- **PostgreSQL Database** (Supabase, Neon, or self-hosted)
- **Redis Instance** (for job queue - Upstash, AWS ElastiCache, or self-hosted)
- **File Storage** (Vercel Blob, AWS S3, or similar)

### OAuth Applications Setup
You need to create OAuth applications for each social media platform:

#### 1. Instagram (Facebook Developer Console)
- Go to [Facebook Developers](https://developers.facebook.com/)
- Create a new app → Business → Instagram Basic Display
- Add Instagram Basic Display product
- Configure OAuth redirect URI: `https://yourdomain.com/api/auth/social/instagram`
- Get Client ID and Client Secret

#### 2. X (Twitter Developer Portal)
- Go to [Twitter Developer Portal](https://developer.twitter.com/)
- Create a new project and app
- Enable OAuth 2.0 with PKCE
- Configure callback URL: `https://yourdomain.com/api/auth/social/twitter`
- Get Client ID and Client Secret

#### 3. TikTok (TikTok Developers)
- Go to [TikTok Developers](https://developers.tiktok.com/)
- Create a new app
- Add Login Kit and Content Posting API
- Configure redirect URI: `https://yourdomain.com/api/auth/social/tiktok`
- Get Client Key and Client Secret

#### 4. Facebook (Facebook Developer Console)
- Same console as Instagram
- Add Facebook Login product
- Configure OAuth redirect URI: `https://yourdomain.com/api/auth/social/facebook`
- Get App ID and App Secret

#### 5. LinkedIn (LinkedIn Developers)
- Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
- Create a new app
- Add Sign In with LinkedIn and Share on LinkedIn products
- Configure OAuth 2.0 redirect URL: `https://yourdomain.com/api/auth/social/linkedin`
- Get Client ID and Client Secret

#### 6. YouTube (Google Cloud Console)
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Enable YouTube Data API v3
- Create OAuth 2.0 credentials
- Configure authorized redirect URI: `https://yourdomain.com/api/auth/social/youtube`
- Get Client ID and Client Secret

## Environment Variables

Create a `.env.production` file with the following variables:

\`\`\`env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Redis (for job queue)
REDIS_URL=redis://username:password@host:port

# Application
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key

# Social Media OAuth Credentials
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# File Storage (if using Vercel Blob)
BLOB_READ_WRITE_TOKEN=your_blob_token
\`\`\`

## Database Setup

### 1. Run Database Migrations
Execute the SQL scripts in order:

\`\`\`bash
# Connect to your database and run:
psql $DATABASE_URL -f scripts/001_create_social_tables.sql
\`\`\`

### 2. Verify Tables
Ensure all tables are created:
- `users`
- `user_social_accounts`
- `scheduled_posts`
- `post_results`
- `post_drafts`
- `ai_influencer_settings`
- `social_feed_cache`

## Deployment Steps

### 1. Vercel Deployment
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add REDIS_URL
# ... add all other environment variables
\`\`\`

### 2. Initialize Job Queue
After deployment, initialize the job queue system:

\`\`\`bash
curl -X POST https://yourdomain.com/api/social/initialize
\`\`\`

### 3. Test OAuth Flows
Test each social media platform connection:
1. Go to your deployed app
2. Try connecting each platform
3. Verify tokens are stored securely
4. Test posting functionality

## Production Monitoring

### Health Checks
Monitor these endpoints:
- `/api/health` - Application health
- `/api/social/schedule` - Scheduled posts status
- Database connection status
- Redis connection status

### Key Metrics to Monitor
- OAuth connection success rate
- Post success/failure rates
- Job queue processing times
- Database query performance
- API rate limits for each platform

### Logging
Monitor logs for:
- OAuth failures
- Token expiration warnings
- Job queue errors
- API rate limit hits
- Database connection issues

## Security Considerations

### Token Security
- All OAuth tokens are encrypted using AES-256-GCM
- Tokens are stored securely in the database
- Implement token refresh logic for expired tokens

### API Rate Limits
Each platform has different rate limits:
- **Instagram**: 200 requests/hour
- **Twitter**: 300 requests/15min window
- **Facebook**: 200 requests/hour
- **LinkedIn**: 500 requests/day
- **TikTok**: 1000 requests/day
- **YouTube**: 10,000 units/day

### Data Privacy
- Implement user data deletion
- Comply with GDPR/CCPA requirements
- Secure user consent for data processing

## Troubleshooting

### Common Issues

#### OAuth Redirect Mismatch
- Ensure redirect URIs match exactly in OAuth app settings
- Check for trailing slashes and protocol (https vs http)

#### Token Expiration
- Implement automatic token refresh
- Monitor token expiration dates
- Notify users when reconnection is needed

#### Job Queue Not Processing
- Check Redis connection
- Verify job queue initialization
- Monitor background worker processes

#### Database Connection Issues
- Check connection string format
- Verify SSL settings for production databases
- Monitor connection pool usage

### Debug Mode
Enable debug logging by setting:
\`\`\`env
NODE_ENV=development
DEBUG=social-station:*
\`\`\`

## Performance Optimization

### Database Optimization
- Add indexes on frequently queried columns
- Implement connection pooling
- Use read replicas for heavy read operations

### Caching Strategy
- Cache social media posts for 15 minutes
- Cache user account connections
- Implement Redis caching for API responses

### Background Jobs
- Process scheduled posts in background
- Implement retry logic with exponential backoff
- Monitor job queue health

## Backup and Recovery

### Database Backups
- Automated daily backups
- Point-in-time recovery capability
- Test restore procedures regularly

### Configuration Backups
- Store environment variables securely
- Document OAuth app configurations
- Maintain deployment scripts

## Scaling Considerations

### Horizontal Scaling
- Use multiple worker processes for job queue
- Implement load balancing for API endpoints
- Scale database connections appropriately

### Vertical Scaling
- Monitor CPU and memory usage
- Scale based on user growth
- Optimize database queries

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor OAuth app status
- Update API versions when platforms change
- Review and rotate encryption keys
- Update dependencies regularly

### User Support
- Provide clear error messages
- Implement user-friendly reconnection flows
- Monitor user feedback and issues

## Compliance and Legal

### Platform Terms of Service
- Review each platform's developer terms
- Ensure compliance with posting policies
- Monitor for policy changes

### Data Handling
- Implement proper data retention policies
- Provide user data export functionality
- Maintain audit logs for compliance
