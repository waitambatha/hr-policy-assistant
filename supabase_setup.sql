-- Run this in Supabase SQL Editor

-- Create hr_rag schema
CREATE SCHEMA IF NOT EXISTS hr_rag;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions
GRANT ALL ON SCHEMA hr_rag TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA hr_rag TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_rag GRANT ALL ON TABLES TO postgres;
