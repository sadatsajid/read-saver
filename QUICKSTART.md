# ⚡ Quick Start (5 Minutes)

Get ArticleIQ running in 5 minutes.

## 1. Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

## 2. Set Up Environment

Copy environment template:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` and fill in:
- Supabase URL + Keys ([Get from supabase.com](https://supabase.com))
- Database URL (from Supabase Settings > Database)
- OpenAI API Key ([Get from platform.openai.com](https://platform.openai.com))

## 3. Set Up Database

**In Supabase SQL Editor**, run:

\`\`\`sql
create extension if not exists vector;
\`\`\`

**In terminal**, run:

\`\`\`bash
pnpm db:push
\`\`\`

**Back in Supabase SQL Editor**, run:

\`\`\`sql
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

create index if not exists chunks_embedding_idx 
  on "Chunk" 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
\`\`\`

## 4. Run It!

\`\`\`bash
pnpm dev
\`\`\`

Open **http://localhost:3000** 🚀

## 5. Test

1. Paste any article URL
2. Click "Analyze"
3. Wait ~15 seconds
4. See summary + ask questions!

---

**Need detailed instructions?** See [SETUP.md](./SETUP.md)

**Having issues?** Check [README.md](./README.md) troubleshooting section

