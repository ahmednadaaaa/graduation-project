#!/bin/bash
# ==============================================================================
# deploy.sh
# Automates codebase updates, builds, migrations, and service restarts on AWS.
# Run on EC2: chmod +x deploy.sh && ./deploy.sh
# ==============================================================================

set -e # Exit immediately on error

echo "=============================================="
echo "🚀 Starting UniTrack Code Deployment"
echo "=============================================="

PROJECT_DIR="/home/ubuntu/unitrack"
VENV_DIR="$PROJECT_DIR/venv"

cd $PROJECT_DIR

# 1. Pull latest code from GitHub
echo "📥 Fetching latest code from GitHub..."
git pull origin main

# 2. Setup/Activate Virtual Environment
if [ ! -d "$VENV_DIR" ]; then
    echo "🐍 Creating virtual environment..."
    python3 -m venv venv
fi
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# 3. Install Python Dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
# Ensure production server dependencies are installed
pip install gunicorn daphne channels-redis psycopg2-binary django-dotenv

# 4. Build Frontend (Vite)
echo "💻 Building React/Vite frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi
echo "🏗️ Compiling production assets..."
npm run build
cd ..

# 5. Load DB credentials and run migrations
echo "🗄️ Loading PostgreSQL credentials and applying migrations..."
if [ -f "/home/ubuntu/.credentials/db.env" ]; then
    export $(cat /home/ubuntu/.credentials/db.env | xargs)
fi

# Load other production environments if they exist
if [ -f ".env.production" ]; then
    export $(cat .env.production | xargs)
fi

export DJANGO_SETTINGS_MODULE=unitrack.settings.production

python manage.py migrate --noinput

# 6. Collect Static Files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# 7. Restart Services
echo "🔄 Restarting Daphne and Celery background services..."
sudo systemctl restart daphne || echo "daphne service not started yet"
sudo systemctl restart celery || echo "celery service not started yet"
sudo systemctl restart nginx || echo "nginx service not started yet"

echo "=============================================="
echo "🎉 Deployment Completed Successfully!"
echo "Your site is live and services are updated."
echo "=============================================="
