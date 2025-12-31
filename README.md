# ArticleIQ - AI-Powered Article Summarizer + Q&A

Transform any article into actionable insights with AI-powered summarization and interactive Q&A.

### 🚀 Features

- **Instant Summaries**: Get TL;DR, key takeaways, and structured outlines in seconds
- **Smart Q&A**: Ask questions about articles and get answers with citations
- **Vector Search**: Powered by pgvector for semantic similarity search
- **User Authentication**: Secure magic link authentication via Supabase
- **Article History**: Save and organize all analyzed articles
- **Real-time Streaming**: See AI responses as they're generated
- **Modern UI**: Beautiful, responsive interface built with Next.js 15 and Tailwind CSS

### 🛠️ Tech Stack

#### Frontend
- **Next.js 15** (App Router)
- **TypeScript** 5+
- **Tailwind CSS** 4
- **shadcn/ui** - Component library
- **Vercel AI SDK** - Streaming chat interface
- **React Markdown** - Render formatted responses

#### Backend
- **Next.js API Routes** - Serverless functions
- **OpenAI API** - GPT-4o-mini + text-embedding-3-small
- **Supabase** - Postgres + Auth + pgvector
- **Prisma** - Type-safe database ORM

#### AI/RAG
- **Custom RAG Pipeline** - Retrieval-Augmented Generation
- **Vector Embeddings** - Semantic search with pgvector
- **Content Extraction** - Jina Reader API + Mozilla Readability

### 📋 Prerequisites

- Node.js 20+ and pnpm
- Supabase account (free tier works)
- OpenAI API key
- (Optional) Jina AI API key for better extraction

### 🏗️ Setup Instructions

#### 1. Clone and Install

\`\`\`bash
git clone <your-repo>
cd article-iq
pnpm install
\`\`\`

#### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - Project URL
   - Anon/Public Key
   - Service Role Key
3. Go to **SQL Editor** and run:

\`\`\`sql
-- Enable pgvector extension
create extension if not exists vector;

-- Create vector search function (will be used after schema is pushed)
-- This will be created automatically by Prisma migrations
\`\`\`

#### 3. Configure Environment Variables

Create \`.env.local\`:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database (from Supabase: Settings > Database > Connection String)
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres

# OpenAI
OPENAI_API_KEY=sk-...

# Jina Reader (optional - has free tier)
JINA_API_KEY=your_jina_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

#### 4. Set up Database

\`\`\`bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
\`\`\`

#### 5. Create pgvector search function

Go back to Supabase SQL Editor and run:

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

#### 6. Run Development Server

\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) 🎉

### 📖 Usage

1. **Paste Article URL**: Enter any article URL on the homepage
2. **Wait for Processing**: The app will extract, chunk, embed, and summarize the content
3. **View Summary**: See TL;DR, key takeaways, and outline
4. **Ask Questions**: Chat with the article to dive deeper
5. **Save & Organize**: Signed-in users can access their article history

### 🗂️ Project Structure

\`\`\`
article-iq/
├── app/
│   ├── api/
│   │   ├── ingest/          # Article processing endpoint
│   │   └── ask/             # Q&A endpoint with streaming
│   ├── article/[id]/        # Article view page
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # User dashboard
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── article-input.tsx    # URL input form
│   ├── summary-display.tsx  # Summary display
│   └── chat-interface.tsx   # Q&A chat UI
├── lib/
│   ├── supabase/           # Supabase clients
│   ├── chunking.ts         # Text chunking utility
│   ├── extraction.ts       # Article extraction
│   ├── embedding.ts        # Vector embeddings
│   ├── summarization.ts    # AI summarization
│   ├── rag.ts              # RAG retrieval logic
│   ├── db.ts               # Prisma client
│   └── openai.ts           # OpenAI client
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
\`\`\`

### 🧪 Testing

Try these test articles:

- **Tech Blog**: https://blog.example.com/some-article
- **News Article**: https://news.example.com/article
- **Research Paper**: https://arxiv.org/abs/xxxx.xxxxx

### 🚢 Deployment

#### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

\`\`\`bash
# Or use Vercel CLI
pnpm install -g vercel
vercel
\`\`\`

#### Environment Variables for Production

Make sure to set all variables from \`.env.local\` in your Vercel project settings.

### 💰 Cost Estimates

#### With 1000 articles/month + 5000 questions:

- **Vercel**: $0-20/month (Hobby tier is free, Pro is $20)
- **Supabase**: $0-25/month (Free tier → Pro if needed)
- **OpenAI**: $100-150/month
  - Embeddings: ~$0.02/1M tokens
  - GPT-4o-mini: ~$0.15/1M input tokens
- **Total**: ~$100-195/month

### 🔒 Security Notes

- API keys stored in environment variables
- Magic link authentication (no passwords stored)
- Supabase handles auth security
- Rate limiting recommended for production

### 🐛 Troubleshooting

#### Prisma errors
\`\`\`bash
pnpm db:generate
pnpm db:push
\`\`\`

#### pgvector not found
Run the pgvector setup SQL in Supabase SQL Editor

#### OpenAI rate limits
Add delays between requests or upgrade to higher tier

### 📝 License

MIT

### 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [OpenAI](https://openai.com/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)

### 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

**Made with ❤️ by [Your Name]**
