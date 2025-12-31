import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ExternalLink, Calendar, FileText, ArrowLeft, Sparkles, Lightbulb, BarChart3, Plus, Info, ArrowUp } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const articles = await prisma.article.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      url: true,
      takeaways: true,
      createdAt: true,
    },
  });

  const totalInsights = articles.reduce(
    (sum: number, a) => sum + a.takeaways.length,
    0
  );
  const avgInsights = articles.length > 0
    ? Math.round(totalInsights / articles.length)
    : 0;

  const stats = [
    {
      id: 'articles',
      title: 'Articles Analyzed',
      value: articles.length,
      icon: FileText,
      badge: articles.length > 0 ? { label: 'Active', showArrow: true } : null,
    },
    {
      id: 'insights',
      title: 'Total Insights',
      value: totalInsights,
      icon: Lightbulb,
      badge: totalInsights > 0 ? { 
        label: `${articles.length > 0 ? Math.round((totalInsights / articles.length) * 10) : 0}%`, 
        showArrow: true 
      } : null,
    },
    {
      id: 'avg',
      title: 'Avg. Insights per Article',
      value: avgInsights,
      icon: BarChart3,
      badge: avgInsights > 0 ? { label: 'Avg', showArrow: false } : null,
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
                className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all hover:border-primary/20"
              >
                <CardContent className="p-3 px-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.badge && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        stat.id === 'avg' 
                          ? 'bg-muted text-muted-foreground' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {stat.badge.showArrow && <ArrowUp className="h-3 w-3" />}
                        <span>{stat.badge.label}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
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
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Card
                key={article.id}
                className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="pb-1.5 px-3 pt-2.5">
                  <CardTitle className="text-base line-clamp-2 mb-1 leading-snug">
                    {article.title}
                  </CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(article.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-2.5">
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Lightbulb className="h-3 w-3" />
                    {article.takeaways.length} {article.takeaways.length === 1 ? 'insight' : 'insights'}
                  </Badge>
                  <div className="flex gap-2">
                    <Link href={`/article/${article.id}`} className="flex-1">
                      <Button variant="default" className="w-full" size="sm">
                        View Summary
                      </Button>
                    </Link>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button variant="outline" size="sm" className="hover:bg-primary/5">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

