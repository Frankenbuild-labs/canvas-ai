-- First, let's check if tables exist and create them if they don't
DO $$
BEGIN
    -- Create social_accounts table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'social_accounts') THEN
        CREATE TABLE social_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
            platform VARCHAR(50) NOT NULL,
            platform_user_id VARCHAR(255) NOT NULL,
            username VARCHAR(255),
            access_token TEXT,
            refresh_token TEXT,
            token_expires_at TIMESTAMP,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, platform, platform_user_id)
        );
        
        CREATE INDEX idx_social_accounts_user_platform ON social_accounts(user_id, platform);
    END IF;

    -- Create scheduled_posts table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scheduled_posts') THEN
        CREATE TABLE scheduled_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            media_urls TEXT[],
            platforms TEXT[] NOT NULL,
            scheduled_for TIMESTAMP NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_scheduled_posts_user_scheduled ON scheduled_posts(user_id, scheduled_for);
        CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
    END IF;

    -- Create post_results table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_results') THEN
        CREATE TABLE post_results (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
            platform VARCHAR(50) NOT NULL,
            platform_post_id VARCHAR(255),
            status VARCHAR(20) NOT NULL,
            error_message TEXT,
            posted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_post_results_scheduled_post ON post_results(scheduled_post_id);
    END IF;

    -- Create social_feeds table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'social_feeds') THEN
        CREATE TABLE social_feeds (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
            platform VARCHAR(50) NOT NULL,
            platform_post_id VARCHAR(255) NOT NULL,
            content TEXT,
            media_urls TEXT[],
            author_username VARCHAR(255),
            author_display_name VARCHAR(255),
            posted_at TIMESTAMP,
            engagement_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(platform, platform_post_id)
        );
        
        CREATE INDEX idx_social_feeds_user_platform ON social_feeds(user_id, platform);
    END IF;
END $$;
