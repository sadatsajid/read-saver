import { openai, CHAT_MODEL } from '@/lib/platform/ai/openai';
import { z } from 'zod';

export const ArticleSummarySchema = z.object({
  tldr: z.array(z.string()).min(3).max(5),
  takeaways: z.array(z.string()).min(5).max(10),
  outline: z.array(
    z.object({
      title: z.string(),
      subsections: z.array(z.string()).optional(),
    })
  ),
});

export type ArticleSummary = z.infer<typeof ArticleSummarySchema>;

/**
 * Generate comprehensive summary of an article
 * Includes TL;DR, key takeaways, and content outline
 */
export async function generateSummary(
  title: string,
  content: string
): Promise<ArticleSummary> {
  // Limit content length (gpt-4o-mini has 128k context but we'll be conservative)
  const maxContentChars = 24000; // ~6k tokens
  const truncatedContent =
    content.length > maxContentChars
      ? content.slice(0, maxContentChars) + '\n\n[Content truncated...]'
      : content;

  const systemPrompt = `You are an expert at analyzing and summarizing articles with precision and clarity.

Your task is to provide a comprehensive summary including:
1. **TL;DR**: 3-5 concise bullet points capturing the core message
2. **Key Takeaways**: 5-10 actionable insights or important facts
3. **Outline**: The article's structure (main sections and subsections)

Guidelines:
- Be accurate and factual - don't add information not in the article
- Use clear, professional language
- Make takeaways specific and actionable where possible
- Organize the outline hierarchically

Respond with valid JSON matching this structure:
{
  "tldr": ["point 1", "point 2", "point 3"],
  "takeaways": ["takeaway 1", "takeaway 2", ...],
  "outline": [
    {"title": "Section 1", "subsections": ["1.1", "1.2"]},
    {"title": "Section 2"}
  ]
}`;

  const userPrompt = `Title: ${title}

Content:
${truncatedContent}

Please provide a comprehensive summary following the JSON structure specified.`;

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    // gpt-5 is a reasoning model: needs tokens for reasoning + output
    // Typical ratio: 2000 reasoning + 2000 output = 4000 total
    max_completion_tokens: 8000,
  });

  console.log('OpenAI response:', JSON.stringify(response, null, 2));

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) {
    console.error('Empty response from OpenAI. Full response:', response);
    throw new Error(`No response from OpenAI. Finish reason: ${response.choices[0]?.finish_reason || 'unknown'}`);
  }

  // Parse and validate response
  try {
    const parsed = JSON.parse(responseContent);
    return ArticleSummarySchema.parse(parsed);
  } catch {
    console.error('Failed to parse summary:', responseContent);
    throw new Error('Failed to generate valid summary format');
  }
}

/**
 * Generate a quick TL;DR only (faster and cheaper)
 */
export async function generateQuickSummary(
  title: string,
  content: string
): Promise<string[]> {
  const truncatedContent = content.slice(0, 12000);

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You summarize articles into 3-5 concise bullet points. Be accurate and factual.',
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nContent: ${truncatedContent}\n\nProvide 3-5 bullet point summary:`,
      },
    ],
    temperature: 1,
    // Reasoning models need extra tokens (reasoning + output)
    max_completion_tokens: 2000,
  });

  const text = response.choices[0].message.content || '';

  // Parse bullet points
  const bullets = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.match(/^[-•*\d.]/))
    .map((line) => line.replace(/^[-•*\d.]\s*/, ''))
    .filter((line) => line.length > 0);

  return bullets.slice(0, 5);
}
