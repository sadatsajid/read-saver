'use client';

import { useRouter } from 'next/navigation';
import { ArticleInput } from '@/components/article-input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="animate-slide-up mx-auto max-w-6xl px-6 pb-20 text-center sm:pt-32 sm:pb-28 md:pb-32">
          <p className="text-primary mb-6 text-sm font-medium tracking-wide sm:mb-8 sm:text-base">
            Introducing ReadSaver
          </p>
          <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-7xl md:text-8xl">
            The world&rsquo;s news.
            <br />
            <span className="text-muted-foreground">In the time it takes</span>
            <br />
            <span className="text-muted-foreground">to sip coffee.</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg leading-relaxed sm:mt-10 sm:text-xl md:text-2xl">
            Every story. Every signal. Distilled into the takeaways that
            actually matter — so you stay informed without falling behind.
          </p>

          <div className="mx-auto mt-12 max-w-2xl sm:mt-16">
            <ArticleInput onSuccess={handleSuccess} />
          </div>
        </div>
      </section>

      {/* Benefit 1 — Dark */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 md:py-40">
          <p className="text-background/60 mb-6 text-sm font-medium tracking-[0.2em] uppercase">
            Stay ahead
          </p>
          <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Stay ahead.
            <br />
            <span className="text-background/60">Without staying up.</span>
          </h2>
          <p className="text-background/70 mx-auto mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl">
            The news doesn&rsquo;t sleep. You should. Drop in any article and
            walk away with the insights — not the inbox dread.
          </p>
        </div>
      </section>

      {/* Benefit 2 — Light */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 md:py-40">
          <p className="text-primary mb-6 text-sm font-medium tracking-[0.2em] uppercase">
            Less noise
          </p>
          <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Less reading.
            <br />
            <span className="text-muted-foreground">More knowing.</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl">
            Skim less. Skip nothing. ReadSaver pulls the signal from the noise,
            so a 20-minute read becomes a 20-second brief.
          </p>
        </div>
      </section>

      {/* Benefit 3 — Subtle accent */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 md:py-40">
          <p className="text-primary mb-6 text-sm font-medium tracking-[0.2em] uppercase">
            Finally caught up
          </p>
          <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Your curiosity,
            <br />
            <span className="text-muted-foreground">finally caught up.</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl">
            That tab you&rsquo;ve kept open for three weeks? Read it now. The
            one your friend sent last Tuesday? Done. Every article you meant to
            get to — finally got to.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mb-16 text-center sm:mb-24">
            <h2 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Built for the way
              <br />
              <span className="text-muted-foreground">you actually read.</span>
            </h2>
          </div>

          <div className="bg-border grid gap-px overflow-hidden rounded-3xl md:grid-cols-3">
            <FeaturePanel
              eyebrow="01"
              title="Instant Summary."
              description="Paste a link. Get a TL;DR, the key takeaways, and a clean outline. Before your next notification buzzes."
            />
            <FeaturePanel
              eyebrow="02"
              title="Ask Anything."
              description="Have a question about what you just read? Ask it. ReadSaver answers — with citations pulled straight from the source."
            />
            <FeaturePanel
              eyebrow="03"
              title="A Library That Remembers."
              description="Every article you save stays with you. Searchable. Organized. Yours — across every device."
            />
          </div>
        </div>
      </section>

      {/* Emotional Section — Dark */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-6 py-32 text-center sm:py-40 md:py-48">
          <h2 className="text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl md:text-8xl">
            You were never
            <br />
            behind.
          </h2>
          <p className="text-background/50 mt-6 text-3xl leading-[1.05] font-semibold tracking-tight sm:mt-8 sm:text-5xl md:text-6xl">
            You were just busy.
          </p>
          <div className="text-background/70 mx-auto mt-12 max-w-2xl space-y-6 text-lg leading-relaxed sm:mt-16 sm:text-xl">
            <p>
              There&rsquo;s a quiet weight to the unread tabs, the
              saved-for-later that became saved-forever, the headlines you
              nodded through without really reading.
            </p>
            <p className="text-background">
              ReadSaver lifts that weight. Not by making you read more — but by
              making what you read finally count.
            </p>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 md:py-40">
          <div className="mb-16 text-center sm:mb-20">
            <p className="text-primary mb-6 text-sm font-medium tracking-[0.2em] uppercase">
              The technology
            </p>
            <h2 className="mx-auto max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Built on the most advanced
              <br />
              <span className="text-muted-foreground">AI on the planet.</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg leading-relaxed sm:text-xl">
              Powered by GPT-4o and a custom retrieval engine, ReadSaver
              doesn&rsquo;t just shorten articles — it understands them. Vector
              search reads between the lines. Citations keep it honest.
              Streaming brings the answer the moment you ask.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12">
            <Stat value="99%" label="less reading time" />
            <Stat value="100%" label="of the substance" />
            <Stat value="0" label="ads, trackers, or filler" />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-secondary">
        <div className="mx-auto max-w-4xl px-6 py-32 text-center sm:py-40 md:py-48">
          <h2 className="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-7xl md:text-8xl">
            The news,
            <br />
            <span className="text-muted-foreground">on your time.</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-8 max-w-xl text-lg leading-relaxed sm:mt-10 sm:text-xl">
            Paste your first article. See what a minute of reading really feels
            like.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 rounded-full px-8 text-base">
                Try ReadSaver — Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            No card. No clutter. Just clarity.
          </p>
        </div>
      </section>
    </div>
  );
}

function FeaturePanel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background flex min-h-[320px] flex-col gap-6 p-8 sm:p-10 md:p-12">
      <span className="text-primary text-sm font-medium tracking-wide">
        {eyebrow}
      </span>
      <h3 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
        {title}
      </h3>
      <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-primary text-6xl leading-none font-semibold tracking-tight sm:text-7xl md:text-8xl">
        {value}
      </div>
      <div className="text-muted-foreground mt-3 text-sm tracking-wide sm:mt-4 sm:text-base">
        {label}
      </div>
    </div>
  );
}
