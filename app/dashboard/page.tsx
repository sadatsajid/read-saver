'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeleteArticleButton } from '@/components/delete-article-button';
import Link from 'next/link';
import { ExternalLink, Calendar, FileText, ArrowLeft, Sparkles, Lightbulb, BarChart3, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user
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

        // Fetch dashboard data
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh">
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user || !data) {
    return (
      <div className="min-h-screen gradient-mesh">
        <div className="container mx-auto p-4 max-w-7xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="border-destructive">
              <CardContent className="p-6 text-center">
                <p className="text-destructive mb-4">
                  {error || 'Failed to load dashboard'}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      id: 'articles',
      title: 'Articles Analyzed',
      value: data.stats.articlesAnalyzed.toString(),
      icon: FileText,
      changePercentage: data.stats.articlesAnalyzed > 0 ? '+100%' : '0%',
    },
    {
      id: 'insights',
      title: 'Total Insights',
      value: data.stats.totalInsights.toString(),
      icon: Lightbulb,
      changePercentage: data.stats.totalInsights > 0 ? '+100%' : '0%',
    },
    {
      id: 'avg',
      title: 'Avg. Insights per Article',
      value: data.stats.avgInsightsPerArticle.toString(),
      icon: BarChart3,
      changePercentage: data.stats.avgInsightsPerArticle > 0 ? 'Active' : '0%',
    },
  ];

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="hover:bg-primary/5">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-4xl font-bold tracking-tight">My Articles</h1>
            </div>
            <div className="flex items-center gap-2 ml-11">
              <div className="p-1.5 rounded-full bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Link href="/">
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Analyze New Article
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.id}
                className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all hover:border-primary/20 gap-4"
              >
                <CardHeader className="flex items-center">
                  <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-2xl font-bold">{stat.value}</span>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <span className="font-semibold">{stat.title}</span>
                  <p className="space-x-2">
                    <span className="text-sm">{stat.changePercentage}</span>
                    <span className="text-muted-foreground text-sm">than last week</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Articles List */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle>My Articles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.articles.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No articles yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start by analyzing your first article to see summaries, key takeaways, and insights!
                </p>
                <Link href="/">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Get Started
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Paginated Articles List */}
                <div className="divide-y divide-border/50">
                  {data.articles
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((article) => (
                      <div
                        key={article.id}
                        className="p-4 sm:p-6 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          {/* Left Column: Title and Metadata */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold mb-2 line-clamp-2 break-words">
                              {article.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                <span className="whitespace-nowrap">
                                  {new Date(article.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              <Badge variant="secondary" className="gap-1.5 text-xs">
                                <Lightbulb className="h-3 w-3 shrink-0" />
                                {article.insightsCount} {article.insightsCount === 1 ? 'insight' : 'insights'}
                              </Badge>
                            </div>
                          </div>
                          {/* Right Column: Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                            <Link href={`/article/${article.id}`} className="flex-1 sm:flex-initial">
                              <Button variant="default" size="sm" className="w-full sm:w-auto">
                                View Summary
                              </Button>
                            </Link>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm" className="hover:bg-primary/5">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                            <DeleteArticleButton
                              articleId={article.id}
                              articleTitle={article.title}
                              variant="ghost"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {data.articles.length > itemsPerPage && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-border/50">
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, data.articles.length)} of{' '}
                      {data.articles.length} articles
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          { length: Math.ceil(data.articles.length / itemsPerPage) },
                          (_, i) => i + 1
                        )
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === Math.ceil(data.articles.length / itemsPerPage) ||
                              Math.abs(page - currentPage) <= 1
                          )
                          .map((page, idx, arr) => (
                            <div key={page} className="flex items-center gap-1">
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <span className="px-1 sm:px-2 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="min-w-8 sm:min-w-10"
                              >
                                {page}
                              </Button>
                            </div>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(Math.ceil(data.articles.length / itemsPerPage), prev + 1)
                          )
                        }
                        disabled={currentPage >= Math.ceil(data.articles.length / itemsPerPage)}
                        className="gap-1"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

