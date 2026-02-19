# 🚀 ReadSaver Setup Guide

Step-by-step guide to get ReadSaver running locally.

## Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** (`npm install -g pnpm`)
- **Supabase Account** (free tier) - [Sign up](https://supabase.com)
- **OpenAI API Key** - [Get one](https://platform.openai.com/api-keys)
- **(Optional) Jina AI API Key** - [Get one](https://jina.ai/)

---

## Step 1: Clone & Install

\`\`\`bash
cd readsaver
pnpm install
\`\`\`

---

## Step 2: Set Up Supabase

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: readsaver
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
4. Wait ~2 minutes for project to initialize

### 2.2 Get API Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** (under "Project URL")
   - **anon/public** key (under "Project API keys")
   - **service_role** key (under "Project API keys")

### 2.3 Get Database URL

1. Go to **Project Settings** → **Database**
2. Scroll to **Connection String** → **URI**
3. Copy the connection string
4. Replace \`[YOUR-PASSWORD]\` with your database password from Step 2.1

---

## Step 3: Configure Environment Variables

Create \`.env.local\` file in project root:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database (from Supabase: Settings > Database > Connection String)
DATABASE_URL=postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# OpenAI
OPENAI_API_KEY=sk-...

# Jina Reader (optional - has free tier)
JINA_API_KEY=jina_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

**Important:** Replace all placeholder values with your actual keys!

---

## Step 4: Set Up Database

### 4.1 Enable pgvector Extension

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Paste this SQL:

\`\`\`sql
-- Enable pgvector extension
create extension if not exists vector;
\`\`\`

4. Click **"Run"** or press ⌘+Enter

### 4.2 Push Database Schema

\`\`\`bash
# Generate Prisma Client
pnpm db:generate

# Push schema to Supabase
pnpm db:push
\`\`\`

You should see: ✔ Database schema pushed successfully

### 4.3 Create pgvector Search Function

1. Go back to **SQL Editor** in Supabase
2. Create a **new query**
3. Paste this SQL:

\`\`\`sql
-- Create similarity search function
create or replace function match_chunks(
  query_embedding vector(1536),
  article_id text,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id text,
  content text,
  "chunkIndex" int,
  similarity float
)
language sql stable
as $$
  select
    "Chunk".id,
    "Chunk".content,
    "Chunk"."chunkIndex",
    1 - ("Chunk".embedding <=> query_embedding) as similarity
  from "Chunk"
  where "Chunk"."articleId" = article_id
    and 1 - ("Chunk".embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- Create index for better performance
create index if not exists chunks_embedding_idx 
  on "Chunk" 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
\`\`\`

4. Click **"Run"**

You should see: ✔ Success. No rows returned

---

## Step 5: Run Development Server

\`\`\`bash
pnpm dev
\`\`\`

You should see:

\`\`\`
  ▲ Next.js 15.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
\`\`\`

Open **http://localhost:3000** in your browser! 🎉

---

## Step 6: Test the App

### Test Article Ingestion

1. Paste an article URL (try a blog post or news article)
2. Click "Analyze"
3. Wait 10-20 seconds for processing
4. You should see:
   - TL;DR summary
   - Key takeaways
   - Article outline

### Test Q&A

1. Scroll to "Ask Questions" section
2. Type a question like: "What is the main point?"
3. Press Enter
4. You should get a streamed response with citations

### Test Authentication

1. Click "My Articles" in top right
2. Enter your email
3. Click "Send Magic Link"
4. Check your email for the link
5. Click the link to sign in
6. You should be redirected to dashboard

---

## Troubleshooting

### "Prisma Client is not generated"

\`\`\`bash
pnpm db:generate
\`\`\`

### "pgvector extension not found"

Run Step 4.1 again in Supabase SQL Editor

### "Failed to extract article"

- Try a different article URL
- Check if URL is publicly accessible
- Some sites block scraping

### "OpenAI rate limit exceeded"

- Check your OpenAI account limits
- Upgrade to paid tier if needed

### "Database connection failed"

- Verify DATABASE_URL in \`.env.local\`
- Check database password is correct
- Ensure Supabase project is active

### Port 3000 already in use

\`\`\`bash
# Use different port
pnpm dev --port 3001
\`\`\`

---

## Next Steps

### Deploy to Production

See **README.md** for Vercel deployment instructions.

### Enable Email Authentication

Supabase Auth is already configured for magic links. No additional setup needed!

### Add Rate Limiting

For production, add rate limiting to API routes:
- Install \`@upstash/ratelimit\`
- Follow instructions in **lib/rate-limit.ts** (create this file)

### Monitor Costs

- OpenAI: Check usage at [platform.openai.com/usage](https://platform.openai.com/usage)
- Supabase: Check usage at **Settings > Usage**

---

## Useful Commands

\`\`\`bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Run production build

# Database
pnpm db:generate      # Generate Prisma Client
pnpm db:push          # Push schema changes
pnpm db:studio        # Open Prisma Studio GUI

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
pnpm type-check       # Check TypeScript types
\`\`\`

---

## Need Help?

- Check **README.md** for more information
- Open an issue on GitHub
- Review error logs in terminal and browser console

---

**Happy building! 🚀**

