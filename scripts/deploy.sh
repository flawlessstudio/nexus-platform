#!/bin/bash
# Nexus Platform Deployment Script

echo "🚀 Starting Nexus Platform Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root"
    exit 1
fi

# Check if required tools are installed
echo "📋 Checking prerequisites..."

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "✅ Prerequisites checked"

# Step 1: Build the project
echo "🔨 Building project..."
pnpm install
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed"

# Step 2: Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -ne 0 ]; then
    echo "❌ Vercel deployment failed"
    exit 1
fi

echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be live at the URL provided by Vercel"
