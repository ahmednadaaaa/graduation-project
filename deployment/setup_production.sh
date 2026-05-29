#!/bin/bash
# ==============================================================================
# setup_production.sh
# Automates the initial system configuration on the AWS Ubuntu EC2 Server.
# Run on EC2: chmod +x setup_production.sh && sudo ./setup_production.sh
# ==============================================================================

set -e # Exit immediately on error

echo "=============================================="
echo "🚀 Starting System Setup for UniTrack Production"
echo "=============================================="

# 1. Update and Upgrade System Packages
echo "🔄 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Required Dependencies
echo "📦 Installing Python, Nginx, PostgreSQL, Redis, and utilities..."
sudo apt-get install -y \
    python3-pip \
    python3-venv \
    python3-dev \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    curl \
    git \
    supervisor \
    ufw

# 3. Start & Enable System Services
echo "⚙️ Enabling Nginx, PostgreSQL, and Redis..."
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 4. Configure Firewall (UFW)
echo "🔒 Configuring firewall rules..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

# 5. Create PostgreSQL Database and User
echo "🗄️ Configuring PostgreSQL database..."
# Generate a random password for db if not customized
DB_PASSWORD=$(openssl rand -base64 12)
DB_NAME="unitrack"
DB_USER="unitrack"

sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Save credentials to a safe file for the deployment
echo "=============================================="
echo "🔑 PostgreSQL Credentials Created:"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo "Keep these credentials safe!"
echo "=============================================="

# Save credentials locally on the server for the deploy script to read
mkdir -p /home/ubuntu/.credentials
echo "DB_NAME=$DB_NAME" > /home/ubuntu/.credentials/db.env
echo "DB_USER=$DB_USER" >> /home/ubuntu/.credentials/db.env
echo "DB_PASSWORD=$DB_PASSWORD" >> /home/ubuntu/.credentials/db.env

echo "✅ System dependencies installed and configured successfully!"
echo "Next step: Run the deploy.sh script to deploy your codebase."
