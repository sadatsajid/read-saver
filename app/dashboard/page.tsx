'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteArticleButton } from '@/components/delete-article-button';
import { createClient } from '@/lib/platform/auth/supabase/client';

interface DashboardData {
  stats: {
    articlesAnalyzed: number;
    totalInsights: number;
    avgInsightsPerArticle: number;
    totalCount: number;
  };
  articles: Array<{
    id: string;
    title: string;
    url: string;
    insightsCount: number;
    createdAt: string;
  }>;
}

const itemsPerPage = 6;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(
    null
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push('/auth/login');
          return;
        }

        setUser({
          id: authUser.id,
          email: authUser.email ?? null,
        });

        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load dashboard'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Preparing your reading library...
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (error || !user || !data) {
    return (
      <DashboardShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="max-w-md rounded-md border-destructive/30">
            <CardContent className="p-6 text-center">
              <p className="mb-5 text-sm text-destructive">
                {error || 'Failed to load dashboard'}
              </p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  const totalPages = Math.ceil(data.articles.length / itemsPerPage);
  const visibleArticles = data.articles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = [
    {
      id: 'articles',
      label: 'Articles briefed',
      value: data.stats.articlesAnalyzed.toString(),
      icon: FileText,
    },
    {
      id: 'insights',
      label: 'Insights saved',
      value: data.stats.totalInsights.toString(),
      icon: Lightbulb,
    },
    {
      id: 'avg',
      label: 'Avg. insight depth',
      value: data.stats.avgInsightsPerArticle.toString(),
      icon: BarChart3,
    },
  ];

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {user.email}
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
              Everything you meant to read.
              <br />
              <span className="text-muted-foreground">Now organized.</span>
            </h1>
          </div>

          <Link href="/" className="shrink-0">
            <Button size="lg" className="h-11 rounded-full px-6">
              <Plus className="h-4 w-4" />
              Analyze article
            </Button>
          </Link>
        </header>

        <section className="mt-12 grid overflow-hidden rounded-md border bg-border sm:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.id} className="bg-background p-6 sm:p-8">
                <div className="mb-8 flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-5xl font-semibold tracking-tight sm:text-6xl">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Reading library
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Briefs, takeaways, and source links kept in one place.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              {data.stats.totalCount} saved{' '}
              {data.stats.totalCount === 1 ? 'article' : 'articles'}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border bg-card">
            {data.articles.length === 0 ? (
              <EmptyLibrary />
            ) : (
              <>
                <div className="divide-y">
                  {visibleArticles.map((article) => (
                    <ArticleRow key={article.id} article={article} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={data.articles.length}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="-m-6 min-h-[calc(100vh-3rem)] bg-background text-foreground">
      {children}
    </div>
  );
}

function ArticleRow({
  article,
}: {
  article: DashboardData['articles'][number];
}) {
  return (
    <article className="grid gap-5 p-5 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:p-6">
      <div className="min-w-0">
        <Link
          href={`/article/${article.id}`}
          className="group inline-flex max-w-full items-start gap-2"
        >
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight group-hover:text-primary">
            {article.title}
          </h3>
          <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(article.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <Badge variant="secondary" className="rounded-full">
            {article.insightsCount}{' '}
            {article.insightsCount === 1 ? 'insight' : 'insights'}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <Link href={`/article/${article.id}`}>
          <Button variant="outline" size="sm" className="rounded-full">
            Summary
          </Button>
        </Link>
        <a href={article.url} target="_blank" rel="noopener noreferrer">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label="Open source article"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
        <DeleteArticleButton
          articleId={article.id}
          articleTitle={article.title}
          variant="ghost"
          size="sm"
        />
      </div>
    </article>
  );
}

function EmptyLibrary() {
  return (
    <div className="px-6 py-20 text-center">
      <FileText className="mx-auto h-9 w-9 text-primary" />
      <h3 className="mt-6 text-3xl font-semibold tracking-tight">
        Start with one article.
      </h3>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
        Paste the link you keep meaning to read. ReadSaver will turn it into a
        brief you can revisit anytime.
      </p>
      <Link href="/" className="mt-8 inline-flex">
        <Button size="lg" className="rounded-full px-6">
          <Plus className="h-4 w-4" />
          Analyze first article
        </Button>
      </Link>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const firstItem = (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col gap-4 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {firstItem} to {lastItem} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-full"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-20 text-center text-sm text-muted-foreground">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="rounded-full"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
