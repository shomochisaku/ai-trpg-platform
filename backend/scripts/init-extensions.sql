-- Initialize PostgreSQL extensions for AI-TRPG Platform
-- This script runs automatically when the database container starts

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable uuid extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for full-text search improvements
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable btree_gin for additional indexing options
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Enable postgis if spatial data is needed (optional)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extensions are installed
SELECT 
    extname as "Extension",
    extversion as "Version"
FROM pg_extension 
WHERE extname IN ('vector', 'uuid-ossp', 'pg_trgm', 'btree_gin')
ORDER BY extname;