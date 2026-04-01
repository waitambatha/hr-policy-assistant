#!/bin/bash

echo "🚀 Setting up HR Policy RAG Assistant with Multi-Provider Support"
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Check if Redis is running
echo ""
echo "🔍 Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running. Please install and start Redis:"
    echo "   Ubuntu/Debian: sudo apt-get install redis-server && sudo systemctl start redis"
    echo "   macOS: brew install redis && brew services start redis"
else
    echo "✅ Redis is running"
fi

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser prompt
echo ""
read -p "Do you want to create a superuser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python manage.py createsuperuser
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure Redis is running"
echo "2. Run: python manage.py runserver"
echo "3. Visit: http://localhost:8000"
echo "4. Go to Settings to add your API keys"
echo ""
echo "🔑 Supported LLM Providers:"
echo "   • OpenAI (GPT-4, GPT-3.5)"
echo "   • Anthropic (Claude 3.5)"
echo "   • Google (Gemini)"
echo "   • Cohere"
echo "   • Groq"
echo "   • Together AI"
echo "   • HuggingFace"
echo "   • Ollama (Local - no key needed)"
echo ""
