-- AI-TRPG Platform Production Database Setup Script
-- Run this script after creating your PostgreSQL database on Supabase/Neon.tech

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Verify extensions are installed
SELECT 
    extname as "Extension Name",
    extversion as "Version",
    extowner::regrole as "Owner"
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector');

-- Create custom types for better data integrity
DO $$
BEGIN
    -- Status enum for campaigns
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed', 'archived');
    END IF;
    
    -- Message types for chat
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('user', 'gm', 'system', 'action');
    END IF;
    
    -- User roles
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('player', 'gm', 'admin');
    END IF;
END$$;

-- Create performance indexes after Prisma migration
-- These will be added after the tables are created by Prisma

-- Function to add performance indexes
CREATE OR REPLACE FUNCTION add_production_indexes() RETURNS void AS $$
BEGIN
    -- Add indexes for frequently queried fields
    
    -- Users table indexes
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
    
    -- Campaigns table indexes
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_owner_id ON campaigns(owner_id);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    
    -- Messages table indexes (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_type ON messages(type);
    END IF;
    
    -- Vector embeddings indexes (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_campaign_id ON embeddings(campaign_id);
        -- Vector similarity search index
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_vector_cosine 
            ON embeddings USING ivfflat (vector vector_cosine_ops);
    END IF;
    
    -- Memory entries indexes (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_entries') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_campaign_id ON memory_entries(campaign_id);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_created_at ON memory_entries(created_at);
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_memory_importance ON memory_entries(importance);
    END IF;
    
    RAISE NOTICE 'Production indexes created successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to add database constraints
CREATE OR REPLACE FUNCTION add_production_constraints() RETURNS void AS $$
BEGIN
    -- Add additional constraints for data integrity
    
    -- Users constraints
    ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS 
        chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');
    
    -- Campaigns constraints (if columns exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'campaigns' AND column_name = 'max_players') THEN
        ALTER TABLE campaigns ADD CONSTRAINT IF NOT EXISTS 
            chk_campaigns_max_players CHECK (max_players > 0 AND max_players <= 10);
    END IF;
    
    RAISE NOTICE 'Production constraints added successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to setup database monitoring
CREATE OR REPLACE FUNCTION setup_monitoring() RETURNS void AS $$
BEGIN
    -- Enable query statistics (if not already enabled)
    -- Note: This might require superuser privileges
    
    -- Create a simple monitoring view for performance tracking
    CREATE OR REPLACE VIEW db_performance_stats AS
    SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
    FROM pg_stats 
    WHERE schemaname = 'public'
    ORDER BY tablename, attname;
    
    -- Create a function to get database size information
    CREATE OR REPLACE FUNCTION get_db_size_info() 
    RETURNS TABLE (
        database_size text,
        table_name text,
        table_size text,
        index_size text
    ) AS $size_func$
    BEGIN
        RETURN QUERY
        SELECT 
            pg_size_pretty(pg_database_size(current_database())) as database_size,
            t.table_name,
            pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as table_size,
            pg_size_pretty(pg_indexes_size(quote_ident(t.table_name)::regclass)) as index_size
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY pg_total_relation_size(quote_ident(t.table_name)::regclass) DESC;
    END;
    $size_func$ LANGUAGE plpgsql;
    
    RAISE NOTICE 'Database monitoring setup completed';
END;
$$ LANGUAGE plpgsql;

-- Setup backup recommendations function
CREATE OR REPLACE FUNCTION setup_backup_recommendations() RETURNS void AS $$
BEGIN
    -- Create a view with backup recommendations
    CREATE OR REPLACE VIEW backup_recommendations AS
    SELECT 
        'Daily automated backups' as recommendation,
        'Critical for production environment' as importance,
        'Use pg_dump or cloud provider backups' as method
    UNION ALL
    SELECT 
        'Weekly full database backup',
        'Recommended for disaster recovery',
        'Store in separate geographic location'
    UNION ALL
    SELECT 
        'Point-in-time recovery setup',
        'Essential for production',
        'Configure WAL archiving'
    UNION ALL
    SELECT 
        'Test backup restoration monthly',
        'Critical validation',
        'Verify backup integrity regularly';
    
    RAISE NOTICE 'Backup recommendations created';
END;
$$ LANGUAGE plpgsql;

-- Execute setup functions
SELECT setup_monitoring();
SELECT setup_backup_recommendations();

-- Display setup information
SELECT 'Database setup completed successfully!' as status;
SELECT 'Extensions installed:' as info;
SELECT extname as installed_extensions FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector');

-- Instructions for next steps
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== NEXT STEPS ===';
    RAISE NOTICE '1. Run Prisma migrations: npx prisma migrate deploy';
    RAISE NOTICE '2. Add performance indexes: SELECT add_production_indexes();';
    RAISE NOTICE '3. Add constraints: SELECT add_production_constraints();';
    RAISE NOTICE '4. Test database connection from your application';
    RAISE NOTICE '5. Setup automated backups';
    RAISE NOTICE '';
    RAISE NOTICE '=== MONITORING ===';
    RAISE NOTICE 'Check database size: SELECT * FROM get_db_size_info();';
    RAISE NOTICE 'View performance stats: SELECT * FROM db_performance_stats;';
    RAISE NOTICE 'Backup recommendations: SELECT * FROM backup_recommendations;';
    RAISE NOTICE '';
END;
$$;