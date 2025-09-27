-- Create database schema for social media management
-- Run this script to set up the required tables

-- Users table for authentication (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social media account connections
CREATE TABLE user_social_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE scheduled_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE post_results (
  id SERIAL PRIMARY KEY,
  scheduled_post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255), -- ID from the social platform
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  error_message TEXT,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Drafts
CREATE TABLE post_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  platforms TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Influencer settings
CREATE TABLE ai_influencer_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE social_feed_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_user_social_accounts_user_platform ON user_social_accounts(user_id, platform);
CREATE INDEX idx_scheduled_posts_user_schedule ON scheduled_posts(user_id, schedule_time);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_post_results_scheduled_post ON post_results(scheduled_post_id);
CREATE INDEX idx_social_feed_cache_user_platform ON social_feed_cache(user_id, platform);
CREATE INDEX idx_social_feed_cache_posted_at ON social_feed_cache(posted_at DESC);
