-- Create database schema for social media management
-- Run this script to set up the required tables

-- Required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- NOTE: Users table is now created in 000_create_users_table.sql
-- This script assumes users table already exists with UUID primary keys

-- Social media account connections
CREATE TABLE IF NOT EXISTS user_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_user_id VARCHAR(255),
  username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Scheduled posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20), -- 'image', 'video', null
  platforms TEXT[] NOT NULL, -- Array of platform names
  schedule_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'posting', 'posted', 'failed'
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Post results (track individual platform posts)
CREATE TABLE IF NOT EXISTS post_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255), -- ID from the social platform
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Drafts
CREATE TABLE IF NOT EXISTS post_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  platforms TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Influencer settings
CREATE TABLE IF NOT EXISTS ai_influencer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  personality TEXT NOT NULL,
  tone VARCHAR(50) NOT NULL,
  creativity_level INTEGER DEFAULT 70,
  post_frequency VARCHAR(20) DEFAULT 'daily',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Social media feed cache (for displaying user's posts)
CREATE TABLE IF NOT EXISTS social_feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  content TEXT,
  media_url TEXT,
  posted_at TIMESTAMP,
  engagement_data JSONB, -- likes, comments, shares, etc.
  cached_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_social_accounts_user_platform ON user_social_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_schedule ON scheduled_posts(user_id, schedule_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_post_results_scheduled_post ON post_results(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_social_feed_cache_user_platform ON social_feed_cache(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_feed_cache_posted_at ON social_feed_cache(posted_at DESC);
