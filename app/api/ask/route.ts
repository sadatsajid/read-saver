import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, CHAT_MODEL } from '@/lib/openai';
import {
  retrieveRelevantChunks,
  formatContextForLLM,
  isQuestionAnswerable,
} from '@/lib/rag';
import { prisma } from '@/lib/db';

// Support both useChat format (messages array) and legacy format (question field)
const AskRequestSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required'),
  // useChat sends messages array, legacy format sends question directly
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
  question: z.string().min(1).optional(), // Legacy format support
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const parsed = AskRequestSchema.parse(body);
    const { articleId } = parsed;

    // Extract question from useChat format (messages array) or legacy format
    let question: string;
    if (parsed.messages && parsed.messages.length > 0) {
      // useChat format: get the last user message
      const lastUserMessage = parsed.messages
        .filter((m) => m.role === 'user')
        .pop();
      if (!lastUserMessage || !lastUserMessage.content.trim()) {
        return new Response(
          JSON.stringify({
            error: 'Invalid request',
            details: [{ message: 'No user message found in messages array' }],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      question = lastUserMessage.content.trim();
    } else if (parsed.question) {
      // Legacy format
      question = parsed.question.trim();
    } else {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: [
            {
              message:
                'Either "messages" array or "question" field is required',
            },
          ],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Verify article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true },
    });

    if (!article) {
      return new Response(
        JSON.stringify({
          error: 'Article not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Retrieve relevant chunks using vector similarity
    console.log('Retrieving relevant chunks for question:', question);
    const chunks = await retrieveRelevantChunks(articleId, question, 5, 0.6);

    console.log(`Found ${chunks.length} relevant chunks`);

    // 4. Check if we have enough context to answer
    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No relevant information found in the article.',
          suggestion: 'Try rephrasing your question or asking about a different topic.',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Filter out chunks that are too short (likely just metadata)
    const meaningfulChunks = chunks.filter(chunk => chunk.content.trim().length > 50);
    if (meaningfulChunks.length === 0) {
      console.warn('All retrieved chunks are too short, using all chunks anyway');
    }
    const chunksToUse = meaningfulChunks.length > 0 ? meaningfulChunks : chunks;

    // 5. Format context for LLM
    const context = formatContextForLLM(chunksToUse);
    const answerable = isQuestionAnswerable(chunksToUse, 0.7);

    // Log for debugging
    console.log(`Using ${chunksToUse.length} chunks (${chunks.length} total retrieved), context length: ${context.length} chars`);

    // 6. Prepare system prompt
    const systemPrompt = `You are an AI assistant specialized in analyzing and answering questions about specific articles with high accuracy and transparency.

**Your Task:** Answer the user's question based exclusively on the provided article context, following strict sourcing and accuracy guidelines.

**Critical Requirements:**

1. **Source Restriction:** Base your answer ONLY on the provided context chunks. Do not incorporate any external knowledge, assumptions, or information not explicitly stated in the context.

2. **Citation Protocol:** 
   - Cite every factual claim using the provided citation markers [1], [2], [3], etc.
   - Place citations immediately after the relevant information
   - Use multiple citations when information spans multiple sources

3. **Transparency Standards:**
   - If the context lacks sufficient information to answer the question, respond with: "I don't have enough information in the provided article context to answer that question."
   - When information is partial or ambiguous, explicitly state: "Based on the available context, [your answer], though the information is [incomplete/unclear/limited]."
   - If you're uncertain about any aspect, acknowledge it clearly

4. **Response Format:**
   - Use markdown formatting for enhanced readability
   - Structure your answer with clear paragraphs or bullet points when appropriate
   - Lead with the most direct answer to the user's question
   - Keep responses concise while being thorough

5. **Quality Checks:**
   - Verify that every factual statement has proper citation
   - Ensure you haven't added interpretations beyond what's explicitly stated
   - Confirm your answer directly addresses the user's specific question

**Article Context from "${article.title}":**
${context}

${answerable ? '' : '⚠️ **Context Limitation Notice:** The retrieved context may not fully address this question. Exercise extra caution and clearly indicate any limitations in your response.'}

**User Question:** [The user's question will appear here]`;

    const userPrompt = `Question: ${question}

Please provide a clear, cited answer based on the article context above.`;

    // 7. Create streaming response from OpenAI
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 1, // gpt-5 only supports temperature: 1
      max_completion_tokens: 4000,
    });

    // 8. Convert OpenAI stream to AI SDK data stream format for useChat
    // Format: 0:"escaped text"\n for text chunks, d:"[DONE]"\n for completion
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              // AI SDK data stream format: 0:"JSON-escaped text"\n
              // Use JSON.stringify to properly escape the text
              const escaped = JSON.stringify(text);
              const data = `0:${escaped}\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // Signal completion
          controller.enqueue(encoder.encode('d:"[DONE]"\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Q&A error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to answer question',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Standard timeout for Q&A (usually completes in <10s)
export const maxDuration = 30;

