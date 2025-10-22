# ⚡ NEXUS Platform - Quick Start Guide

**Get NEXUS running locally in under 10 minutes!**

---
### **Prerequisites**
- **Node.js**: v20 or higher
- **pnpm** (`npm install -g pnpm`)
- **Supabase CLI** (`npm install -g supabase`)
- **Vercel CLI** (`npm install -g vercel`)

### **Setup Instructions**
1.  **Clone the Repository**:
    \`\`\`bash
    git clone https://github.com/oneflawlessstudio/nexus-platform.git
    cd nexus-platform
    \`\`\`

2.  **Install Dependencies**:
    This command installs dependencies for all active workspaces from the root directory.
    \`\`\`bash
    pnpm install
    \`\`\`

3.  **Start Local Supabase Environment**:
    This command starts the local Supabase stack (Postgres, GoTrue Auth, Storage, etc.).
    \`\`\`bash
    supabase start
    \`\`\`
    *Note: Your Supabase keys and DB URL will be printed in the terminal. You will need them for the next step.*

4.  **Configure Environment Files**:
    Copy the local Supabase credentials into the backend's environment file and create one for the frontend.
    \`\`\`bash
    # For the backend
    cp backend/.env.example backend/.env
    # For the frontend
    touch web/.env
    \`\`\`
    - In `backend/.env`, paste the `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` from the `supabase start` output.
    - In `web/.env`, add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the `supabase start` output.

5.  **Run Database Migrations**:
    This command applies the database schema to your local Supabase instance.
    \`\`\`bash
    pnpm --filter nexus-backend db:push
    \`\`\`

6.  **Start All Development Servers**:
    This runs the `dev` script in all workspaces (`web`, `backend`) concurrently.
    \`\`\`bash
    pnpm dev
    \`\`\`

### **Accessing the Apps**
* **Web App**: `http://localhost:5173`
* **Backend API**: `http://localhost:4000`
* **Supabase Studio**: `http://localhost:54323` (or the port shown in the `supabase start` output)
