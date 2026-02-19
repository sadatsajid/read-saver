import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { openai, CHAT_MODEL } from '@/lib/openai';
import {
  retrieveRelevantChunks,
  formatContextForLLM,
  isQuestionAnswerable,
} from '@/lib/rag';
import { prisma } from '@/lib/db';
import { RAG_CONFIG } from '@/lib/rag-config';
import { getQASystemPrompt, getUserPrompt } from '@/lib/prompts';

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
    // 1. Parse and validate request (public route – no auth required)
    const body = await request.json();
    const parsed = AskRequestSchema.parse(body);
    const { articleId } = parsed;

    // 2. Extract and validate question from useChat format (messages array) or legacy format
    let question: string;
    if (parsed.messages && parsed.messages.length > 0) {
      // useChat format: get the last user message (optimized with findLast)
      const lastUserMessage = parsed.messages.findLast((m) => m.role === 'user');
      if (!lastUserMessage?.content?.trim()) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            details: [{ message: 'No user message found in messages array' }],
          },
          { status: 400 }
        );
      }
      question = lastUserMessage.content.trim();
    } else if (parsed.question) {
      // Legacy format
      question = parsed.question.trim();
    } else {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: [
            {
              message:
                'Either "messages" array or "question" field is required',
            },
          ],
        },
        { status: 400 }
      );
    }

    // 3. Validate question length
    if (question.length < RAG_CONFIG.MIN_QUESTION_LENGTH) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: [
            {
              message: `Question must be at least ${RAG_CONFIG.MIN_QUESTION_LENGTH} characters long`,
            },
          ],
        },
        { status: 400 }
      );
    }

    if (question.length > RAG_CONFIG.MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: [
            {
              message: `Question must be no more than ${RAG_CONFIG.MAX_QUESTION_LENGTH} characters long`,
            },
          ],
        },
        { status: 400 }
      );
    }

    // 4. Verify article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, title: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // 5. Retrieve relevant chunks using vector similarity
    console.log('[Q&A] Retrieving relevant chunks for question:', question);
    const chunks = await retrieveRelevantChunks(
      articleId,
      question,
      RAG_CONFIG.TOP_K,
      RAG_CONFIG.MIN_SIMILARITY
    );

    console.log(`[Q&A] Found ${chunks.length} relevant chunks`);

    // 8. Check if we have enough context to answer
    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error: 'No relevant information found in the article.',
          suggestion:
            'Try rephrasing your question or asking about a different topic.',
        },
        { status: 404 }
      );
    }

    // 6. Filter out chunks that are too short (likely just metadata)
    const meaningfulChunks = chunks.filter(
      (chunk) => chunk.content.trim().length >= RAG_CONFIG.MIN_CHUNK_LENGTH
    );
    const chunksToUse =
      meaningfulChunks.length > 0 ? meaningfulChunks : chunks;

    if (meaningfulChunks.length === 0) {
      console.warn(
        '[Q&A] All retrieved chunks are too short, using all chunks anyway'
      );
    }

    // 7. Format context for LLM
    const context = formatContextForLLM(chunksToUse);
    const answerable = isQuestionAnswerable(
      chunksToUse,
      RAG_CONFIG.ANSWERABLE_THRESHOLD
    );

    // Log for debugging
    console.log(
      `[Q&A] Using ${chunksToUse.length} chunks (${chunks.length} total retrieved), context length: ${context.length} chars`
    );

    // 8. Prepare prompts
    const systemPrompt = getQASystemPrompt(article.title, context, answerable);
    const userPrompt = getUserPrompt(question);

    // 9. Create streaming response from OpenAI
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
      temperature: RAG_CONFIG.TEMPERATURE,
      max_completion_tokens: RAG_CONFIG.MAX_COMPLETION_TOKENS,
    });

    // 10. Convert OpenAI stream to AI SDK data stream format for useChat
    // Format: 0:"text"\n for text, e:{...}\n for finish_step, d:{...}\n for finish_message
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              // AI SDK data stream format: 0:"JSON-escaped text"\n
              const escaped = JSON.stringify(text);
              const data = `0:${escaped}\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // Signal step completion then message completion
          const finishStep = `e:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`;
          const finishMessage = `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}\n`;
          controller.enqueue(encoder.encode(finishStep));
          controller.enqueue(encoder.encode(finishMessage));
          controller.close();
        } catch (error) {
          console.error('[Q&A] Streaming error:', error);
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
    console.error('[Q&A] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to answer question',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Standard timeout for Q&A (usually completes in <10s)
export const maxDuration = 30;
