'use client';

import { useChat } from '@ai-sdk/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { SendHorizontal, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRef, useEffect } from 'react';
import { linkifyNode } from '@/lib/shared/utils/linkify';

interface ChatInterfaceProps {
  articleId: string;
}

export function ChatInterface({ articleId }: ChatInterfaceProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload } =
    useChat({
      api: '/api/ask',
      body: { articleId },
      onError: (error) => {
        console.error('Chat error:', error);
      },
      onResponse: (response) => {
        if (!response.ok) {
          console.error('API response error:', response.status, response.statusText);
        }
      },
    });

  // Auto-scroll to bottom of the messages container only (never the page)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="w-full flex flex-col border-border/50 bg-card/80 backdrop-blur-sm shadow-lg max-h-[calc(100vh-160px)] h-[600px]">
      <div className="flex items-center gap-2 p-4 border-b border-border/50 bg-primary/5">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-base font-semibold">Ask Questions</h3>
      </div>

      {/* Messages Container */}
      <div ref={messagesContainerRef} className="flex-1 space-y-3 p-4 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center h-full">
            <div className="p-4 rounded-full bg-primary/10 mb-4">
              <MessageSquare className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-1">
              Ask any question about this article
            </p>
            <p className="text-muted-foreground/70 text-xs">
              Try: &ldquo;What is the main point?&rdquo; or &ldquo;Summarize the key findings&rdquo;
            </p>
          </div>
        ) : (
          <>
            {messages.map((m: { id: string; role: string; content: string }) => {
              // Check if this is the last user message and there's an error
              const userMessages = messages.filter((msg: { role: string }) => msg.role === 'user');
              const lastUserMessage = userMessages[userMessages.length - 1];
              const isLastUserMessage = 
                m.role === 'user' && 
                lastUserMessage?.id === m.id &&
                error;
              
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 animate-slide-up ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && !isLastUserMessage && (
                    <div className="p-1.5 rounded-full bg-primary/10 shrink-0 mt-1">
                      <MessageSquare className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-3 py-2.5 max-w-[85%] transition-all hover:scale-[1.02] ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/80 border border-border/50'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="text-sm leading-relaxed">{linkifyNode(m.content)}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-p:text-sm prose-p:leading-relaxed prose-strong:text-foreground prose-ul:text-muted-foreground prose-li:text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => {
                              const linkHref = href || '#';
                              const isExternal = /^https?:\/\//i.test(linkHref);

                              return (
                                <Link
                                  href={linkHref}
                                  target={isExternal ? '_blank' : undefined}
                                  rel={isExternal ? 'noopener noreferrer' : undefined}
                                  className="underline underline-offset-2 break-all"
                                >
                                  {children}
                                </Link>
                              );
                            },
                            p: ({ children }) => <p>{linkifyNode(children)}</p>,
                            li: ({ children }) => <li>{linkifyNode(children)}</li>,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {isLastUserMessage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 hover:bg-destructive/10"
                      onClick={() => reload()}
                      disabled={isLoading}
                      title="Retry"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary/10">
                  <MessageSquare className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-muted/80 border border-border/50 rounded-xl px-3 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div />
          </>
        )}
      </div>

      {/* Error Display */}
      {error && messages.length === 0 && (
        <div className="mx-4 mb-2 p-2.5 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
          Failed to send message. Please try again.
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 border-t border-border/50 bg-card/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="min-h-[52px] max-h-[120px] resize-none text-sm border-border/50 focus:border-primary/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            size="icon"
            className="h-[52px] w-[52px] shrink-0 hover:scale-105 transition-transform"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Shift+Enter</kbd> for new line
        </p>
      </div>
    </Card>
  );
}
