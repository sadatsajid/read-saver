# ReadSaver – Summarized LinkedIn Post

---

I've always been fascinated by how AI can help us consume information more efficiently. So I dove into **Retrieval-Augmented Generation (RAG)** and built **ReadSaver** – a product that solves a real problem: **saving hours of reading time**.

**The idea:** Paste any article URL and get instant AI summaries, key takeaways, and a Q&A that answers your questions using the actual article content. **ReadSaver** – because your time is valuable.

I wanted to learn RAG from the ground up: vector embeddings, chunking and storage, retrieval, and the full pipeline from URL to intelligent Q&A. Here’s the condensed version of how it works:

**Tech stack:** Next.js 15, TypeScript, Tailwind + shadcn/ui, Supabase (PostgreSQL + pgvector), OpenAI for summarization and embeddings, Jina AI Reader + Mozilla Readability for extraction. Deployed on Vercel.

**Under the hood:**  
URL → content extraction (Jina/Readability) → AI summarization (TL;DR, takeaways, outline) → smart chunking (1000 chars, 200 overlap) → embeddings (text-embedding-3-small) → stored in pgvector. When you ask a question, your query is embedded, we run similarity search, retrieve the most relevant chunks, and the LLM answers with citations – all in under 30 seconds from paste to insight.

What used to take 15–30 minutes to read is now digestible in under a minute, with the option to go deeper via Q&A. Building this end-to-end taught me vector search, chunking strategies, and what it takes to ship a production RAG system.

If you’re into AI, RAG, or just want to read less and learn more – I’d love to hear your take.

#AI #RAG #LLM #MachineLearning #SoftwareDevelopment #BuildingInPublic #NextJS #Supabase

---
