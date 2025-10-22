# Development Setup Guide

## 🚀 **Quick Start (Recommended)**

### 1. **Supabase Local Development** (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase stack
supabase start

# This will give you:
# - Local PostgreSQL database
# - Local Auth service
# - Local Storage
# - Local Edge Functions
```

### 2. **Environment Configuration**
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp web/.env.example web/.env

# Fill in your actual API keys in the .env files
```

### 3. **Install Dependencies**
```bash
pnpm install
```

### 4. **Start Development**
```bash
# Start the backend server
pnpm dev
```

## 🗄️ **Database Options**

### **Option A: Supabase (Recommended)**
- **Local**: `supabase start` (creates local PostgreSQL + services)
- **Cloud**: Use Supabase hosted database
- **Connection**: Via Supabase client (no direct DATABASE_URL needed)

### **Option B: Direct PostgreSQL** (Advanced)
- **Local**: Install PostgreSQL locally
- **Connection**: Use DATABASE_URL for direct access
- **Note**: You'll need to handle auth, RLS, and other services separately

## 🔧 **Environment Variables Explained**

### **Required for Development**
```bash
# Core
NODE_ENV=development
PORT=3030

# Supabase (Primary)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

### **Optional Integrations**
```bash
# Stripe (for payments)
STRIPE_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...

# Sentry (for error tracking)
SENTRY_DSN=https://...

# Turnstile (for CAPTCHA)
TURNSTILE_SECRET=...
```

## 🚨 **Common Issues**

### **Database Connection Issues**
- **Problem**: `DATABASE_URL` pointing to wrong database
- **Solution**: Use Supabase CLI (`supabase start`) instead

### **Missing Environment Variables**
- **Problem**: App crashes on startup
- **Solution**: Copy `.env.example` to `.env` and fill in values

### **Supabase Connection Issues**
- **Problem**: Can't connect to Supabase
- **Solution**: Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct

## 📚 **Next Steps**

1. **Set up Supabase project** (cloud or local)
2. **Configure environment variables**
3. **Run database migrations** (`supabase db push`)
4. **Start development server** (`pnpm dev`)
