'use client';

import { useRouter } from 'next/navigation';
import { ArticleInput } from '@/components/article-input';
import { Sparkles, MessageSquare, BookOpen, Zap, TrendingUp, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();

  const handleSuccess = (data: {
    articleId: string;
    title: string;
    cached?: boolean;
  }) => {
    router.push(`/article/${data.articleId}`);
  };

  return (
    <div className="min-h-screen gradient-mesh">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center space-y-6 sm:space-y-8 py-12 md:py-20 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2 animate-scale-in">
            <Zap className="h-4 w-4 shrink-0" />
            <span>Powered by Advanced AI</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-tight px-2">
            Transform Articles into
            <br />
            <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Actionable Insights
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
            Get instant summaries, key takeaways, and ask questions about any
            article on the web. Save hours of reading time with AI-powered intelligence.
          </p>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-12 pt-6 sm:pt-8">
            <StatItem icon={<TrendingUp className="h-5 w-5" />} value="10x" label="Faster Reading" />
            <StatItem icon={<Clock className="h-5 w-5" />} value="<30s" label="Summary Time" />
            <StatItem icon={<Users className="h-5 w-5" />} value="1000+" label="Articles Analyzed" />
          </div>
        </section>

        {/* Input Section */}
        <section className="flex justify-center mb-16 sm:mb-20 md:mb-24 animate-scale-in">
          <div className="w-full max-w-3xl px-2 sm:px-4">
            <ArticleInput onSuccess={handleSuccess} />
          </div>
        </section>

        {/* Features Grid */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto mb-16 sm:mb-20 md:mb-24">
          <FeatureCard
            icon={<Sparkles className="h-6 w-6 text-primary" />}
            title="Instant Summaries"
            description="Get TL;DR, key takeaways, and structured outlines in seconds. No more skimming through long articles."
            delay="0"
          />
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6 text-primary" />}
            title="Ask Questions"
            description="Chat with the article and get answers backed by citations. Dive deeper into specific topics instantly."
            delay="100"
          />
          <FeatureCard
            icon={<BookOpen className="h-6 w-6 text-primary" />}
            title="Save & Organize"
            description="Keep your reading history and insights in one place. Build your knowledge base effortlessly."
            delay="200"
          />
        </section>

        {/* How It Works */}
        <section className="max-w-4xl mx-auto mb-16 sm:mb-20 md:mb-24">
          <div className="text-center space-y-4 mb-8 sm:mb-12 px-4">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold">How it works</h3>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform any article into actionable insights
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-2">
            <StepCard
              number="01"
              title="Paste URL"
              description="Simply paste any article URL from the web"
            />
            <StepCard
              number="02"
              title="AI Analysis"
              description="Our AI extracts, analyzes, and summarizes the content"
            />
            <StepCard
              number="03"
              title="Get Insights"
              description="Ask questions and dive deeper into specific topics"
            />
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-card/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mb-16 sm:mb-20 md:mb-24 border border-border/50 mx-2">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
              Why Choose ReadSaver?
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <BenefitItem text="Save hours of reading time every week" />
              <BenefitItem text="Never miss key insights from articles" />
              <BenefitItem text="Build a searchable knowledge base" />
              <BenefitItem text="Get answers with source citations" />
              <BenefitItem text="Works with any article on the web" />
              <BenefitItem text="Privacy-focused and secure" />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-4 sm:space-y-6 py-12 sm:py-16 mb-12 sm:mb-16 px-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Ready to transform your reading?
          </h3>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Start analyzing articles in seconds. No signup required to get started.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
                View Dashboard
                <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: string;
}) {
  return (
    <div 
      className="flex flex-col items-start text-left space-y-3 sm:space-y-4 p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-bold text-lg sm:text-xl">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 min-w-[100px]">
      <div className="text-primary">{icon}</div>
      <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{label}</div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center space-y-3 sm:space-y-4 p-5 sm:p-6 rounded-xl bg-card/50 border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 text-primary text-xl sm:text-2xl font-bold">
        {number}
      </div>
      <h4 className="font-semibold text-base sm:text-lg">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
      <span className="text-sm sm:text-base text-muted-foreground">{text}</span>
    </div>
  );
}
