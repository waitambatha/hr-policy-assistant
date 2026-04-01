#!/bin/bash

echo "🔍 Testing Supabase Connection..."

cd /home/sly/PycharmProjects/RAG_POC
source .venv/bin/activate

python << 'EOF'
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_policy_rag.settings')
import django
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        # Test connection
        cursor.execute('SELECT version();')
        version = cursor.fetchone()[0]
        print(f'✅ Connected to PostgreSQL')
        print(f'   Version: {version[:60]}...')
        
        # Check schema
        cursor.execute(f"SELECT schema_name FROM information_schema.schemata WHERE schema_name='hr_rag';")
        if cursor.fetchone():
            print('✅ Schema "hr_rag" exists')
        else:
            print('❌ Schema "hr_rag" not found - run supabase_setup.sql')
        
        # Check pgvector
        cursor.execute("SELECT * FROM pg_extension WHERE extname='vector';")
        if cursor.fetchone():
            print('✅ pgvector extension installed')
        else:
            print('❌ pgvector not installed - run supabase_setup.sql')
        
        print('\n🎉 Supabase is ready!')
        
except Exception as e:
    print(f'❌ Connection failed: {e}')
    print('\nTroubleshooting:')
    print('1. Check your internet connection')
    print('2. Verify Supabase credentials in .env')
    print('3. Run SQL from supabase_setup.sql in Supabase SQL Editor')
EOF
